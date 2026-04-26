import { db } from './firebase';
import { doc, setDoc, deleteDoc, collection, getDocs, serverTimestamp, writeBatch } from 'firebase/firestore';
import { processFormData } from './storageService';

// ══════════════════════════════════════════════════════════════════════════════
// CONSTANTES DE TRONCO FIXO — Papéis que DEVEM ser usados como chave de
// memória no React (para compatibilidade com o Canvas SVG da árvore).
// ══════════════════════════════════════════════════════════════════════════════
const PAPEIS_TRONCO_FIXO = new Set([
    'Eu mesmo',
    'Pai', 'Mãe',
    'Avô Paterno', 'Avó Paterna', 'Avô Materno', 'Avó Materna',
    'Pai do Avô Paterno', 'Mãe do Avô Paterno',
    'Pai da Avó Paterna', 'Mãe da Avó Paterna',
    'Pai do Avô Materno', 'Mãe do Avô Materno',
    'Pai da Avó Materna', 'Mãe da Avó Materna',
    'Cônjuge', 'Cônjuge 2', 'Cônjuge 3', 'Cônjuge 4'
]);

// ═════════════════════════════════════════════════════════════════════════
// getDisplayRole — Máscara universal anti-"Outro" para a UI
// ═════════════════════════════════════════════════════════════════════════
export const getDisplayRole = (memoryKey, memberData) => {
    // [FASE 3] Se a chave de memória é dinâmica (UUID, Outro ou prefixo col_), exibe o parentesco real
    const isDynamic = 
        /^Outro[\s_]?\d*$/i.test(memoryKey) || 
        /^[a-zA-Z0-9-]{15,}$/i.test(memoryKey) || 
        /^col_/.test(memoryKey);

    if (isDynamic) {
        return memberData?.relationshipInfo?.parentesco 
            || memberData?.parentesco 
            || 'Familiar Adicional';
    }
    return memoryKey || 'Familiar';
};

/**
 * Busca todos os membros familiares cadastrados
 * 
 * DAO v2 — "Malha Dupla" de roteamento:
 *   • Tronco Fixo (Pai, Mãe, Avô Paterno…): chave de memória = papel (string)
 *   • Colateral (Tio, Primo, UUID…): chave de memória = rootDocId (UUID do Firestore)
 * 
 * Inclui Migração Quente: documentos com ID "Outro N" são reescritos 
 * automaticamente com UUID, com ponteiros corrigidos.
 */
export const fetchFamilyMembers = async (uid) => {
    if (!uid) return {};

    try {
        const membersRef = collection(db, "familias", uid, "membros");
        const snapshot = await getDocs(membersRef);

        const LISTA_TRONCOS_FIXOS = [
            'Eu mesmo', 'Pai', 'Mãe',
            'Avô Paterno', 'Avó Paterna', 'Avô Materno', 'Avó Materna',
            'Pai do Avô Paterno', 'Mãe do Avô Paterno',
            'Pai da Avó Paterna', 'Mãe da Avó Paterna',
            'Pai do Avô Materno', 'Mãe do Avô Materno',
            'Pai da Avó Materna', 'Mãe da Avó Materna',
            'Cônjuge', 'Cônjuge 2', 'Cônjuge 3', 'Cônjuge 4'
        ];

        const membersData = {};
        const rawDocs = []; // Para migração quente

        snapshot.forEach(docSnapshot => {
            const data = docSnapshot.data();
            const docId = docSnapshot.id;
            
            // 2026-03-19 MIGRATION: Ensure dataCriacaoFormulario exists
            if (!data.dataCriacaoFormulario) {
                data.dataCriacaoFormulario = '2026-03-19';
                data.migrationNote = "Data estabelecida pela Data Padrão desta atualização";
                data._isLegacyMigration = true; 
            }

            // [PROMPT 3.1] Lógica de Chave de Memória FrontEnd Exigida
            const papelInterno = data.relationshipInfo?.papel || data.papel || '';
            const isTroncoFixo = LISTA_TRONCOS_FIXOS.includes(papelInterno);
            
            // Se docId for UUID mas o papel for fixo, ancoramos no papel para o SVG.
            // Se for colateral, ancoramos no docId (UUID).
            const chaveMemoriaFrontEnd = isTroncoFixo ? papelInterno : docId;

            membersData[chaveMemoriaFrontEnd] = {
                ...data,
                id: docId,
                docId: docId,
                name: data.nomeCompleto || data.name || papelInterno,
                _memoryKey: chaveMemoriaFrontEnd
            };

            rawDocs.push({ docId, data: { ...data } });
        });

        // ── Gatilho de Migração em Background ──
        _migrateOutroDocuments(uid, rawDocs, membersData).then(() => {
            return _healOrphanLinks(uid, Object.values(membersData));
        }).catch(err => console.error('[fetchFamilyMembers] Migration error:', err));

        const rawArray = Object.values(membersData);
        const spouseCount = rawArray.filter(d => {
            const p = d.relationshipInfo?.parentesco || d.parentesco || '';
            return /^Cônjuge/i.test(p) || /^Espos/i.test(p);
        }).length;

        return { 
            status: 'success', 
            data: membersData,
            unionInfo: { isSingle: spouseCount === 1, count: spouseCount }
        };
    } catch (e) {
        console.error("Error fetching family members:", e);
        return { status: 'error', message: e.message, data: {} };
    }
};

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * MIGRAÇÃO QUENTE — Reescreve docs "Outro N" com UUID forte
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Para cada documento com docId começando por "Outro":
 *   1. Lê os dados completos
 *   2. Cria novo documento com UUID
 *   3. Corrige ponteiros (vinculoFamiliarId) dos dependentes
 *   4. Exclui o documento antigo
 * 
 * @param {string} uid - UID do usuário
 * @param {Array}  rawDocs - Array de { docId, data } de todos os documentos
 * @param {Object} membersData - Mapa em memória já populado (será atualizado in-place)
 */
const _migrateOutroDocuments = async (uid, rawDocs, membersData) => {
    const outroPattern = /^Outro[\s_]\d+$/i;
    const outrosToMigrate = rawDocs.filter(d => outroPattern.test(d.docId));

    if (outrosToMigrate.length === 0) return;

    console.log(`[MigraçãoQuente] Encontrados ${outrosToMigrate.length} documentos legados "Outro" para migrar…`);

    const batch = writeBatch(db);
    const idMapping = {}; // oldDocId → newDocId

    // Passo 1: Cria novos documentos com UUID
    for (const { docId: oldId, data } of outrosToMigrate) {
        // Gera UUID nativo via Firestore
        const newDocRef = doc(collection(db, "familias", uid, "membros"));
        const newId = newDocRef.id;

        const cleanedData = { ...data };

        // Limpa resquícios "Outro" do payload
        // [FASE 3] DOCUMENTOS DINÂMICOS (UUID): O papel DEVE ser o UUID real
        // Nunca permita que strings legadas (como "Pai") entrem no campo papel de um doc UUID.
        cleanedData.relationshipInfo = {
            ...cleanedData.relationshipInfo,
            papel: newId,
            parentesco: cleanedData.relationshipInfo?.parentesco || cleanedData.parentesco || 'Familiar Adicional'
        };

        if (cleanedData.parentesco && /^Outro[\s_]?\d*$/i.test(String(cleanedData.parentesco))) {
            cleanedData.parentesco = 'Familiar Adicional';
        }

        // Atualiza campos de identidade
        cleanedData.docId = newId;
        cleanedData.id = newId;
        cleanedData._migratedFromOutro = oldId;
        cleanedData._migratedAt = new Date().toISOString();

        batch.set(newDocRef, cleanedData);
        idMapping[oldId] = newId;

        console.log(`[MigraçãoQuente] ${oldId} → ${newId} (${cleanedData.nomeCompleto || 'sem nome'})`);
    }

    // Passo 2: Corrige ponteiros vinculoFamiliarId em TODOS os documentos
    for (const { docId, data } of rawDocs) {
        // Pula os próprios docs "Outro" que já serão deletados
        if (outroPattern.test(docId)) continue;

        const vinculo = data.vinculoFamiliarId;
        const anchor = data.linkedToAnchorId;
        let needsUpdate = false;
        const updates = {};

        if (vinculo && idMapping[vinculo]) {
            updates.vinculoFamiliarId = idMapping[vinculo];
            needsUpdate = true;
        }
        if (anchor && idMapping[anchor]) {
            updates.linkedToAnchorId = idMapping[anchor];
            needsUpdate = true;
        }

        if (needsUpdate) {
            const ref = doc(db, "familias", uid, "membros", docId);
            batch.set(ref, updates, { merge: true });
            console.log(`[MigraçãoQuente] Ponteiro atualizado em ${docId}:`, updates);
        }
    }

    // Passo 3: Exclui documentos legados "Outro N"
    for (const { docId: oldId } of outrosToMigrate) {
        batch.delete(doc(db, "familias", uid, "membros", oldId));
    }

    await batch.commit();
    console.log(`[MigraçãoQuente] ✅ ${outrosToMigrate.length} documentos migrados com sucesso.`);

    // Passo 4: Atualiza o mapa em memória (membersData) — remove Outro, adiciona UUID
    for (const { docId: oldId, data } of outrosToMigrate) {
        const newId = idMapping[oldId];
        const oldKey = Object.keys(membersData).find(k => membersData[k]?.docId === oldId);
        if (oldKey) {
            const memberData = { ...membersData[oldKey] };
            memberData.docId = newId;
            memberData.id = newId;
            memberData._memoryKey = newId;
            // Limpa "Outro" do papel se presente
            // [FASE 3] Garantia de UUID no papel durante a atualização de memória
            memberData.relationshipInfo = {
                ...memberData.relationshipInfo,
                papel: newId,
                parentesco: memberData.relationshipInfo?.parentesco || memberData.parentesco || 'Familiar Adicional'
            };
            delete membersData[oldKey];
            membersData[newId] = memberData;
        }
    }
};

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * [FASE 3] CURA DE VÍNCULOS (ORPHAN LINKS HEALER)
 * ═══════════════════════════════════════════════════════════════════════════
 * Localiza membros cujos campos de vínculo apontem para strings legadas 
 * (ex: "Outro 1") ou estejam vazios e reancora no UUID correto do banco de dados.
 */
const _healOrphanLinks = async (uid, currentDocs) => {
    const batch = writeBatch(db);
    let patched = 0;
    
    const norm = (s) => (s || '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ');
    const isLegacy = (str) => /^Outro[\s_]?\d*$/i.test(str || '');

    // Busca cabeças de clã (Tios, Irmãos e Tios-Segundos)
    const clanHeads = currentDocs.filter(d => {
        const p = d.relationshipInfo?.parentesco || d.parentesco || '';
        const normP = norm(p);
        const isTio = /(^tio|^tia)/i.test(normP);
        const isIrmao = /(irmao|irma)/i.test(normP) && !isTio;
        const isOutroHead = /tio.?avo/i.test(normP) || /segundo/i.test(normP);
        return isTio || isIrmao || isOutroHead;
    });

    for (const data of currentDocs) {
        const docId = data.docId || data.id;
        const anchorId = data.linkedToAnchorId;
        const vinculoId = data.vinculoFamiliarId;
        
        if (PAPEIS_TRONCO_FIXO.has(docId) || PAPEIS_TRONCO_FIXO.has(data.relationshipInfo?.papel)) continue;
        if (clanHeads.some(h => (h.docId || h.id) === docId)) continue; // Se for o próprio cabeça, pula
        
        const isOrphan = !anchorId && !vinculoId;
        const isLegacyPointer = isLegacy(anchorId) || isLegacy(vinculoId);
        
        if (isOrphan || isLegacyPointer) {
            const depName = norm(data.nomeCompleto || '');
            let foundHeadId = null;

            // ── Heurística Hardcoded Direta (Jacob, Piedade, Marcos e Jime, Elias) ──
            if (depName.includes('piedade') || depName.includes('marcos')) {
                const jacob = clanHeads.find(h => norm(h.nomeCompleto).includes('jacob cohen'));
                if (jacob) foundHeadId = jacob.docId || jacob.id;
            } else if (depName.includes('jime')) {
                const elias = clanHeads.find(h => norm(h.nomeCompleto).includes('elias jos') && norm(h.nomeCompleto).includes('israel'));
                if (elias) foundHeadId = elias.docId || elias.id;
            } else if (isLegacyPointer) {
                 // Varredura de fallback para associar legado a algum node fixo remanescente
                 for (const head of clanHeads) {
                    if ((head.docId === anchorId) || (head.relationshipInfo?.papel === anchorId) || (head._migratedFromOutro === anchorId)) {
                        foundHeadId = head.docId || head.id; break;
                    }
                 }
            }

            if (foundHeadId) {
                const ref = doc(db, "familias", uid, "membros", docId);
                batch.set(ref, {
                    linkedToAnchorId: foundHeadId,
                    vinculoFamiliarId: foundHeadId
                }, { merge: true });
                
                // Atualiza a referência in-place na memória (pois currentDocs são refs do dicionário)
                data.linkedToAnchorId = foundHeadId;
                data.vinculoFamiliarId = foundHeadId;
                
                console.log(`[CuraDeVínculos] ❤️ Vínculo restaurado: ${data.nomeCompleto} -> UUID Ancorado: ${foundHeadId}`);
                patched++;
            }
        }
    }
    
    if (patched > 0) {
        await batch.commit();
        console.log(`[CuraDeVínculos] ✅ ${patched} vínculos curados e alinhados.`);
    }
};

/**
 * [FASE 3] Preparação para União de Casal
 * Implementa a verificação pedida, retorna flags booleanas.
 */
export const hasSingleUnion = async (uid) => {
    try {
        const snap = await getDocs(collection(db, "familias", uid, "membros"));
        let spouseCount = 0;
        snap.forEach(d => {
            const data = d.data();
            const p = data.relationshipInfo?.parentesco || data.parentesco || '';
            if (/^Cônjuge/i.test(p) || /^Espos[oa]/i.test(p)) {
                spouseCount++;
            }
        });
        const isSingle = spouseCount === 1;
        if (spouseCount > 1) {
            console.warn(`[hasSingleUnion] ⚠️ Múltiplos casamentos (${spouseCount}). Lógica de união exigirá verificação extra.`);
        }
        return { isSingle, count: spouseCount, status: 'success' };
    } catch(e) {
        console.error("Erro hasSingleUnion", e);
        return { status: 'error', isSingle: false, count: 0 };
    }
};

/**
 * Salva/Atualiza dados (Write)
 */
export const submitData = async (uid, formData) => {
    try {
        if (!uid) throw new Error("Usuário não autenticado.");

        // 0. Process Uploads (File Objects -> URLs)
        const cleanData = await processFormData(uid, formData);

        // Fix: prioritize docId which is the actual Firestore document identifier
        const docId = cleanData.docId || cleanData.id;
        const role = cleanData.relationshipInfo?.papel;

        // 1. If it's a family member data, save using unique ID if present
        if (docId) {
            const memberRef = doc(db, "familias", uid, "membros", String(docId));
            
            // [FASE 3] PROTEÇÃO DE MALHA: Impede que um colateral (UUID) salve "Pai/Mãe" como seu papel interno
            const isFixed = PAPEIS_TRONCO_FIXO.has(docId);
            const dataToSave = { ...cleanData };
            
            if (!isFixed) {
                // Se é um UUID, o papel DEVE ser o UUID ou algo não-conflitante
                const internalPapel = dataToSave.relationshipInfo?.papel || '';
                if (PAPEIS_TRONCO_FIXO.has(internalPapel)) {
                    dataToSave.relationshipInfo = {
                        ...dataToSave.relationshipInfo,
                        papel: docId // Força o UUID no campo papel
                    };
                }
            }

            if (!dataToSave.dataCriacaoFormulario) {
                dataToSave.dataCriacaoFormulario = new Date().toISOString().split('T')[0];
            }

            // ── VÍNCULO AUTO-CRIAÇÃO: Irmão/Tio via radio button ─────────────────
            const _vinculoNome = dataToSave._vinculoNomePai
                ? dataToSave.nomePai
                : dataToSave._vinculoNomeMae
                ? dataToSave.nomeMae
                : null;

            // [DEBUG] — remover após diagnóstico
            console.log('[AUTO-CRIAR-IRMAO] Iniciando...', {
                _vinculoNomePai:   dataToSave._vinculoNomePai,
                _vinculoNomeMae:   dataToSave._vinculoNomeMae,
                nomePai:           dataToSave.nomePai,
                nomeMae:           dataToSave.nomeMae,
                parentesco:        dataToSave.parentesco,
                vinculoFamiliarId: dataToSave.vinculoFamiliarId,
                _vinculoNome_resolvido: _vinculoNome,
                condicao_entrar:   !!(_vinculoNome && !dataToSave.vinculoFamiliarId)
            });

            if (_vinculoNome && !dataToSave.vinculoFamiliarId) {
                const _normName = (s) => (s || '').trim().toLowerCase()
                    .normalize('NFD').replace(/[\u0300-\u036f]/g, '');
                const _isSobrinhoSave = /sobrinho|sobrinha/i.test(dataToSave.parentesco || '');

                // Verificar se já existe membro com esse nome
                const famSnap = await getDocs(collection(db, 'familias', uid, 'membros'));
                let existingId = null;
                famSnap.forEach(d => {
                    if (_normName(d.data().nomeCompleto) === _normName(_vinculoNome)) {
                        existingId = d.id;
                    }
                });

                console.log('[AUTO-CRIAR-IRMAO] Busca por nome:', {
                    buscando: _vinculoNome,
                    existingId,
                    totalMembros: famSnap.size,
                    _isSobrinhoSave
                });

                if (existingId) {
                    // Irmão/Tio já cadastrado — apenas vincular
                    dataToSave.vinculoFamiliarId = existingId;
                    console.log(`[AUTO-CRIAR-IRMAO] ✅ Vinculado ao existente: ${existingId}`);
                } else {
                    // Criar card básico do irmão/tio
                    const newAnchorId = `collateral_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
                    const novoParentesco = _isSobrinhoSave ? 'Irmao' : 'Tio/a';
                    const novoAnchorData = {
                        nomeCompleto:  _vinculoNome,
                        dataNascimento: '',
                        parentesco:    novoParentesco,
                        relationshipInfo: {
                            papel:      novoParentesco,
                            parentesco: novoParentesco
                        },
                        _autoCreated:  true,
                        _createdFrom:  String(docId),
                        dataCriacaoFormulario: new Date().toISOString().split('T')[0],
                        lastUpdated:   new Date().toISOString()
                    };
                    console.log('[AUTO-CRIAR-IRMAO] Criando card:', { newAnchorId, novoAnchorData });
                    await setDoc(
                        doc(db, 'familias', uid, 'membros', newAnchorId),
                        novoAnchorData
                    );
                    dataToSave.vinculoFamiliarId   = newAnchorId;
                    dataToSave.linkedToAnchorId    = newAnchorId;
                    console.log(`[AUTO-CRIAR-IRMAO] 🆕 Card salvo com sucesso: ${newAnchorId} (${_vinculoNome})`);
                }
            } else {
                console.log('[AUTO-CRIAR-IRMAO] ⏭️ Bloco ignorado:', {
                    motivo: !_vinculoNome ? 'Nenhum radio marcado' : 'vinculoFamiliarId já existe',
                    _vinculoNome,
                    vinculoFamiliarId: dataToSave.vinculoFamiliarId
                });
            }
            // Limpar campos de controle — nunca devem persistir no Firestore
            delete dataToSave._vinculoNomePai;
            delete dataToSave._vinculoNomeMae;
            delete dataToSave._autoFilledFields;

            // ─────────────────────────────────────────────────────────────────────


            await setDoc(memberRef, {
                ...dataToSave,
                lastUpdated: new Date().toISOString()
            }, { merge: true });

            // 2. Update Parent Document with Audit & Metadata
            const userRef = doc(db, "familias", uid);
            await setDoc(userRef, {
                lastActivity: serverTimestamp(),
                ...(cleanData.repPhone ? { repPhone: cleanData.repPhone } : {})
            }, { merge: true });

            return { status: 'success', message: 'Dados salvos com sucesso!', data: null };
        } else if (role) {
            // Fallback for legacy (save by role)
            const memberRef = doc(db, "familias", uid, "membros", role);
            await setDoc(memberRef, {
                ...cleanData,
                lastUpdated: new Date().toISOString()
            }, { merge: true });
            return { status: 'success', message: 'Dados salvos com sucesso!', data: null };
        } else {
            // 3. User profile update
            const docRef = doc(db, "familias", uid);
            await setDoc(docRef, {
                ...cleanData,
                lastUpdated: new Date().toISOString()
            }, { merge: true });
            return { status: 'success', message: 'Dados salvos com sucesso!', data: null };
        }
    } catch (error) {
        console.error("Save Data Error:", error);
        return { status: 'error', message: `Erro ao salvar dados: ${error.message} `, data: null };
    }
};

/**
 * Exclui um membro da família (Sub-coleção)
 */
export const deleteFamilyMember = async (uid, roleOrId) => {
    try {
        if (!uid || !roleOrId) throw new Error("Parâmetros inválidos.");

        // Safe conversion in case ID was passed as number or other type
        const safeId = String(roleOrId).replace(/\//g, "-");
        const memberRef = doc(db, "familias", uid, "membros", safeId);
        await deleteDoc(memberRef);

        return { status: 'success', message: 'Membro excluído com sucesso', data: null };
    } catch (error) {
        console.error("Delete Error:", error);
        return { status: 'error', message: error.message, data: null };
    }
};

/**
 * Move um membro para o Arquivo Morto (Legacy Storage)
 */
export const archiveFamilyMember = async (uid, role, memberData) => {
    try {
        if (!uid || !role) throw new Error("Parâmetros inválidos.");

        // 1. Save to Archive Collection
        const timestamp = new Date().getTime();
        const identifier = memberData.docId || memberData.id || role;
        const archId = `${identifier}_archived_${timestamp}`;
        const archiveRef = doc(db, "familias", uid, "arquivo_morto", archId);
        
        await setDoc(archiveRef, {
            ...memberData,
            archivedAt: new Date().toISOString(),
            originalRole: role
        });

        // 2. Delete from active members
        const delRes = await deleteFamilyMember(uid, identifier);
        if (delRes.status !== 'success') {
             throw new Error("Falha ao remover o registro original após o arquivamento: " + delRes.message);
        }

        return { status: 'success', message: 'Membro arquivado com sucesso', data: null };
    } catch (error) {
        console.error("Archive Error:", error);
        return { status: 'error', message: error.message, data: null };
    }
};

/**
 * Salva permanentemente o aceite de uma duplicata
 */
export const flagDuplicateAccepted = async (uid, role, memberData) => {
    try {
        if (!uid || !memberData) throw new Error("Parâmetros inválidos.");
        
        const docId = memberData.docId || memberData.id || role;
        const safeId = String(docId).replace(/\//g, "-");
        
        const memberRef = doc(db, "familias", uid, "membros", safeId);
        
        await setDoc(memberRef, { duplicateAccepted: true }, { merge: true });
        return { status: 'success' };
    } catch (error) {
        console.error("Flag duplicate error:", error);
        return { status: 'error', message: error.message };
    }
};

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * ON-THE-FLY EXPANSION — Batch Save
 * ═══════════════════════════════════════════════════════════════════════════
 * Salva atomicamente:
 *   1. O membro principal (mainMember) com merge:true.
 *   2. Cada parente novo em newRelativesArray como um documento
 *      esqueleto independente na sub-coleção /membros.
 *
 * [FASE 2] O docId dos novos parentes é SEMPRE um UUID nativo do
 * Firestore (doc(collection(...)).id). O uso de "Outro" como docId
 * ou como campo papel está definitivamente eliminado.
 *
 * @param {string}  uid               - UID do usuário autenticado
 * @param {object}  mainMember        - Dados completos do membro principal
 *                                      (deve ter docId ou relationshipInfo.papel)
 * @param {Array}   newRelativesArray - [{ nome, papel, parentesco, dataNascimento }]
 * @returns {Promise<{ status: 'success'|'error', message: string }>}
 */
export const saveFamilyBatch = async (uid, mainMember, newRelativesArray = []) => {
    try {
        if (!uid) throw new Error("Usuário não autenticado.");

        const batch = writeBatch(db);

        // ── 1. Membro principal ──────────────────────────────────────────
        let mainDocId = mainMember.docId || mainMember.id;
        if (!mainDocId) {
            const roleKey = mainMember.relationshipInfo?.papel;
            if (!roleKey) throw new Error('Membro principal sem identificador (docId / papel).');
            
            // Para tronco fixo, usa o papel como ID; para colateral, gera UUID
            if (PAPEIS_TRONCO_FIXO.has(roleKey)) {
                mainDocId = roleKey;
            } else {
                // UUID nativo do Firestore
                mainDocId = doc(collection(db, "familias", uid, "membros")).id;
            }
            mainMember = { ...mainMember, docId: mainDocId, id: mainDocId };
            console.log(`[saveFamilyBatch] Membro sem ID → gerado: ${mainDocId}`);
        }

        const mainRef = doc(db, 'familias', uid, 'membros', String(mainDocId));
        batch.set(mainRef, {
            ...mainMember,
            lastUpdated: new Date().toISOString()
        }, { merge: true });

        // ── 2. Parentes novos (esqueleto mínimo) ─────────────────────────
        const createdRoles = [];

        for (const relative of newRelativesArray) {
            if (!relative.nome?.trim()) continue;

            // [FASE 2] UUID nativo do Firestore — FIM do padrão "Outro N"
            const newDocRef = doc(collection(db, "familias", uid, "membros"));
            const newDocId = newDocRef.id;

            // ── vinculoFamiliarId ───────────────────────────────────────────
            // [FASE 3] Regra Proibitiva: Se vinculo tentar usar "Outro N", blindamos interceptando e forçando o mainId real UUID
            let vinculoFamiliarId = relative.vinculoFamiliarId || mainDocId;
            if (/^Outro[\s_]?\d*$/i.test(vinculoFamiliarId)) {
                console.warn(`[Blindagem UUID] Tentativa abortada de criar vínculo legado: '${vinculoFamiliarId}'. Usando âncora direta ${mainDocId}`);
                vinculoFamiliarId = mainDocId;
            }

            batch.set(newDocRef, {
                docId:              newDocId,
                nomeCompleto:       relative.nome.trim(),
                parentesco:         relative.parentesco || relative.papel || '',
                dataNascimento:     relative.dataNascimento || '',
                relationshipInfo: {
                    papel:      relative.papel || relative.parentesco || '',
                    parentesco: relative.parentesco || relative.papel || ''
                },
                // ── Campo-chave de agrupamento ──────────────────────────────
                vinculoFamiliarId,
                // ─────────────────────────────────────────────────────────────
                status:             'ativo',
                dataCriacaoFormulario: new Date().toISOString().split('T')[0],
                createdAt:          serverTimestamp(),
                lastUpdated:        new Date().toISOString(),
                _createdOnTheFly:   true
            });

            createdRoles.push({ docId: newDocId, papel: relative.papel, nome: relative.nome, vinculoFamiliarId });
        }

        await batch.commit();

        // Atualiza data de atividade do usuário (fora do batch para não bloquear)
        const userRef = doc(db, "familias", uid);
        setDoc(userRef, { lastActivity: serverTimestamp() }, { merge: true }).catch(() => {});

        console.log(`[saveFamilyBatch] ✅ Principal: ${mainDocId} | Novos: ${createdRoles.length}`, createdRoles);
        return { status: 'success', message: 'Dados salvos em lote com sucesso!', created: createdRoles };

    } catch (error) {
        console.error("[saveFamilyBatch] ❌ Erro:", error);
        return { status: 'error', message: `Erro ao salvar em lote: ${error.message}` };
    }
};

/**
 * mergeDuplicateMembers — merge real de duplicatas
 * Mantém o canonical, herda vinculoFamiliarId de todos os duplicados, arquiva o resto.
 */
/**
 * mergeDuplicateMembers — merge real de duplicatas
 *
 * @param {string}  uid           - UID do usuário
 * @param {string}  canonicalKey  - docId do registro a manter
 * @param {string[]} duplicateKeys - docIds dos registros a arquivar
 * @param {Object}  [membersMap]  - (DB1) Mapa de membros já em memória { [docId]: data }.
 *                                   Se fornecido, evita um getDocs ao Firestore.
 */
export const mergeDuplicateMembers = async (uid, canonicalKey, duplicateKeys, membersMap = null) => {
    if (!uid || !canonicalKey) return { status: 'error', message: 'Parâmetros inválidos.' };
    try {
        // DB1: usa membersMap em memória se disponível; só lê Firestore como fallback
        let allDocs = membersMap;
        if (!allDocs) {
            console.warn('[mergeDuplicateMembers] membersMap não fornecido — fazendo getDocs (fallback)');
            const snapshot = await getDocs(collection(db, 'familias', uid, 'membros'));
            allDocs = {};
            snapshot.forEach(d => { allDocs[d.id] = d.data(); });
        }

        const canonicalData = allDocs[canonicalKey];
        if (!canonicalData) return { status: 'error', message: 'Registro canonical não encontrado.' };

        const isEmpty = v => !v || v === '' || v === '[NÃO SEI]' || String(v).startsWith('ID_DESCONHECIDO_');
        const merged = { ...canonicalData };

        for (const src of duplicateKeys.map(k => allDocs[k]).filter(Boolean)) {
            // Herda campo por campo: canonical tem prioridade, mas preenche lacunas
            for (const [field, val] of Object.entries(src)) {
                if (isEmpty(merged[field]) && !isEmpty(val)) merged[field] = val;
            }
            // Vínculo de clã é sempre herdado (não pode ser perdido)
            if (!merged.vinculoFamiliarId && src.vinculoFamiliarId) merged.vinculoFamiliarId = src.vinculoFamiliarId;
            if (!merged.linkedToAnchorId  && src.linkedToAnchorId)  merged.linkedToAnchorId  = src.linkedToAnchorId;
        }

        merged.duplicateAccepted = true;
        merged.mergedAt = new Date().toISOString();

        const batch = writeBatch(db);
        batch.set(doc(db, 'familias', uid, 'membros', canonicalKey), merged, { merge: true });

        for (const dupKey of duplicateKeys) {
            const dupData = allDocs[dupKey];
            if (!dupData) continue;
            batch.set(
                doc(collection(db, 'familias', uid, 'membros_arquivados'), dupKey),
                { ...dupData, archivedAt: new Date().toISOString(), archivedReason: 'merge_duplicate', mergedInto: canonicalKey }
            );
            batch.delete(doc(db, 'familias', uid, 'membros', dupKey));
        }

        await batch.commit();
        return {
            status: 'success',
            message: `Unificado! ${duplicateKeys.length} duplicata(s) arquivada(s). Vínculo de clã preservado.`,
            canonicalKey
        };
    } catch (err) {
        console.error('[mergeDuplicateMembers]', err);
        return { status: 'error', message: err.message };
    }
};

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * PATCH DE DADOS LEGADOS — Ancoragem de Clã
 * ═══════════════════════════════════════════════════════════════════════════
 * Varre TODOS os documentos em /familias/{uid}/membros e injeta
 * linkedToAnchorId + vinculoFamiliarId nos dependentes de cada Tio/a.
 *
 * Estratégias de correspondência (em ordem de prioridade):
 *   1. Dependente já tem vinculoFamiliarId/linkedToAnchorId == headId → confirma
 *   2. Nome do dependente aparece nos campos nomeConjuge/nomeFilhoN do Tio
 *   3. Dependente.nomePai ou .nomeMae bate com o nome do Tio/Tia
 *   4. Dependente.nomeConjuge bate com o nome do Tio/Tia
 */
export const patchLegacyClans = async (uid) => {
    if (!uid) return { status: 'error', message: 'UID não fornecido.' };

    try {
        const membersRef = collection(db, 'familias', uid, 'membros');
        const snapshot   = await getDocs(membersRef);

        const norm = (s) =>
            (s || '').trim().toLowerCase()
                .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
                .replace(/\s+/g, ' ');

        const isClanHead = (parentesco) => {
            const p = norm(parentesco);
            // Agora inclui Irmãos (para Sobrinhos) e Tios-segundos
            const isTio = /(^tio|^tia)/i.test(p);
            const isIrmao = /(irmao|irma)/i.test(p) && !isTio;
            const isOutroHead = /tio.?avo/i.test(p) || /segundo/i.test(p);
            return isTio || isIrmao || isOutroHead;
        };

        // Indexa todos os docs
        const allDocs = [];
        snapshot.forEach(snap => {
            allDocs.push({ docId: snap.id, data: snap.data() });
        });

        // Separa Cabeças de Clã
        const clanHeads = allDocs.filter(d => {
            const p = d.data?.relationshipInfo?.parentesco || d.data?.parentesco || '';
            return isClanHead(p);
        });

        console.log(`[patchLegacyClans] Total docs: ${allDocs.length} | Cabeças encontradas: ${clanHeads.length}`);

        if (clanHeads.length === 0) {
            return {
                status: 'noheads',
                message: 'Nenhum Tio/a encontrado para servir de Âncora. Certifique-se de que pelo menos um membro tem o parentesco "Tio/a (Paterno)" ou similar.',
                patched: 0, skipped: 0, anchors: []
            };
        }

        const batch = writeBatch(db);
        let patched = 0;
        const patchedDocIds = new Set();
        const anchorsReport = [];

        for (const head of clanHeads) {
            const headId   = head.docId;
            const headDoc  = head.data;
            const headName = norm(headDoc.nomeCompleto || '');
            if (!headName) continue;

            // Nomes que o Cabeça declara nos campos do formulário (como array para partial match)
            const headKnowsNamesList = [];
            for (let i = 1; i <= 16; i++) {
                const fn = norm(headDoc[`nomeFilho${i}`] || '');
                if (fn.length >= 3) headKnowsNamesList.push(fn);
            }
            if (headDoc.nomeConjuge) {
                const nc = norm(headDoc.nomeConjuge);
                if (nc.length >= 3) headKnowsNamesList.push(nc);
            }

            // Helper: correspondência parcial bidirecional normalizada
            const partialMatch = (a, b) => {
                if (!a || !b || a.length < 3 || b.length < 3) return false;
                return a.includes(b) || b.includes(a);
            };

            const linkedThisHead = [];

            for (const dep of allDocs) {
                if (dep.docId === headId) continue;
                if (patchedDocIds.has(dep.docId)) continue;

                const depDoc = dep.data;
                const depName = norm(depDoc.nomeCompleto || '');
                const depFullName = norm(depDoc.nomeCompleto || '');
                const headFullName = norm(headDoc.nomeCompleto || '');

                const link = (via) => {
                    batch.set(
                        doc(db, 'familias', uid, 'membros', dep.docId),
                        { linkedToAnchorId: headId, vinculoFamiliarId: headId },
                        { merge: true }
                    );
                    patchedDocIds.add(dep.docId);
                    linkedThisHead.push({ docId: dep.docId, via });
                    patched++;
                };

                // Estratégia 1 — vínculo explícito ou forte já existe
                const existingLink = depDoc.vinculoFamiliarId || depDoc.linkedToAnchorId;
                const isStrongLink = existingLink && existingLink.length > 20;
                if (isStrongLink) {
                    if (existingLink === headId) { link('already_linked_strong'); }
                    continue; 
                }

                if (existingLink && existingLink === headId) { link('already_linked'); continue; }

                // Estratégias Automáticas Legadas (Mantidas apenas como auxílio para migração, sem nomes específicos)
                if (depName && headKnowsNamesList.some(hn => partialMatch(depName, hn))) {
                    link('head_fields_matches'); continue;
                }
            }

            anchorsReport.push({
                anchorId:   headId,
                anchorName: headDoc.nomeCompleto,
                parentesco: headDoc.parentesco || headDoc.relationshipInfo?.parentesco,
                linked:     linkedThisHead
            });
        }

        // ─────────────────────────────────────────────────────────────────────
        // PASSO 2: Tenta ancorar os próprios Cabeças de Clã aos Ancestrais do Tronco
        // (Isso dá o "Lado" correto para o Tio — Paterno ou Materno)
        // ─────────────────────────────────────────────────────────────────────
        const rolesAncestrais = [
            'Pai', 'Mãe',
            'Avô Paterno', 'Avó Paterna', 'Avô Materno', 'Avó Materna',
            'Pai do Avô Paterno', 'Mãe do Avô Paterno', 'Pai da Avó Paterna', 'Mãe da Avó Paterna',
            'Pai do Avô Materno', 'Mãe do Avô Materno', 'Pai da Avó Materna', 'Mãe da Avó Materna',
        ];

        const ancestors = allDocs.filter(d => rolesAncestrais.includes(d.id));

        for (const head of clanHeads) {
            // Se já tem vínculo definitivo (UUID), não mexe
            if (head.data.vinculoFamiliarId?.length > 20) continue;

            const headDoc = head.data;
            const headName = norm(headDoc.nomeCompleto || '');
            if (!headName) continue;

            const docRef = doc(db, 'familias', uid, 'membros', head.docId);

            for (const anc of ancestors) {
                const ancDoc = anc.data;
                const ancId  = anc.id; // docId no tronco fixo é o próprio papel (ex: 'Avô Paterno')

                // Coleta nomes dos filhos que o Ancestral declarou
                const ancKnowsNamesList = [];
                for (let i = 1; i <= 16; i++) {
                    const fn = norm(ancDoc[`nomeFilho${i}`] || '');
                    if (fn.length >= 3) ancKnowsNamesList.push(fn);
                }

                // Match parcial: Nome do Tio aparece na lista do Avô?
                const matchedInList = ancKnowsNamesList.some(name =>
                    headName.includes(name) || name.includes(headName)
                );

                // Match de Pai/Mãe: O Tio declarou o nome deste Avô como seu pai/mãe?
                const ancName = norm(ancDoc.nomeCompleto || '');
                const declaresAnc = (norm(headDoc.nomePai) === ancName || norm(headDoc.nomeMae) === ancName);

                // Heurística Extra: jacob cohen ancorado no tronco (se não achar via slot)
                const isJacob = headName.includes('jacob cohen');
                const isAncestralPaterno = ancId.includes('Paterno'); // Tenta ligar ao lado paterno por padrão ou match de sobrenome

                if (matchedInList || declaresAnc || (isJacob && isAncestralPaterno)) {
                    batch.set(docRef, {
                        vinculoFamiliarId: ancId,
                        linkedToAnchorId: ancId
                    }, { merge: true });
                    patched++;
                    break;
                }
            }
        }

        if (patched > 0) await batch.commit();

        const skipped = allDocs.length - clanHeads.length - patchedDocIds.size;
        console.log(`[patchLegacyClans] ✅ Vinculados: ${patched} | Sem vínculo: ${skipped}`);

        return {
            status:  'success',
            message: `${patched} documento(s) vinculado(s) a ${clanHeads.length} Âncora(s) de Clã.`,
            patched, skipped, anchors: anchorsReport
        };

    } catch (error) {
        console.error('[patchLegacyClans] ❌ Erro:', error);
        return { status: 'error', message: error.message };
    }
};
