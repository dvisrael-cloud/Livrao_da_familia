
import { db, auth } from './firebase';
import {
    collection,
    doc,
    setDoc,
    getDoc,
    addDoc,
    onSnapshot,
    serverTimestamp,
    query,
    orderBy,
    where,
    getDocs,
    deleteDoc,
    updateDoc,
    writeBatch,
    limit
} from "firebase/firestore";
import {
    signInWithEmailAndPassword,
    signOut
} from "firebase/auth";

// --- AUTHENTICATION ---

export const adminLogin = async (email, password) => {
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // Verificar Role no Firestore (Hierarquia)
        const adminDocRef = doc(db, "admins", user.uid); // Coleção separada ou 'familias' com role?
        // Simplificação: Vamos ler o 'role' do doc da família mesmo, pois um admin também é um usuário do sistema
        // OU vamos criar uma coleção 'invites' onde guardamos admins também.
        // DECISÃO: Ler doc em 'familias' (users) e checar campo 'adminRole'.

        const userDocRef = doc(db, "familias", user.uid);
        const userSnap = await getDoc(userDocRef);

        let adminRole = 'none';

        if (userSnap.exists()) {
            const data = userSnap.data();
            adminRole = data.adminRole || 'none';
        }

        // Bootstrap Super-Admin: Força o papel de Pleno se for o e-mail hardcoded
        // Isso garante acesso total, inclusive a system_logs (isSuperAdmin = pleno)
        if (email.toLowerCase() === 'dvisrael@hotmail.com') {
            adminRole = 'pleno';
            await setDoc(userDocRef, {
                adminRole: 'pleno',
                email: user.email,
                updatedAt: serverTimestamp()
            }, { merge: true });
        }

        if (adminRole === 'none') {
            await signOut(auth);
            return { status: 'error', message: 'Acesso negado. Usuário não é administrador.' };
        }

        return {
            status: 'success',
            user: {
                uid: user.uid,
                email: user.email,
                role: adminRole
            }
        };

    } catch (error) {
        console.error("Admin Login Error:", error);
        return { status: 'error', message: mapAuthError(error.code) };
    }
};

export const adminLogout = async () => {
    await signOut(auth);
};

// --- INVITES ---

/**
 * Cria um convite seguro (Token)
 */
export const createInvite = async (adminUid, inviteData) => {
    try {
        const email = inviteData.email.trim().toLowerCase();

        // 1. Checar se já é membro ativo (Famílias)
        const qFam = query(collection(db, "familias"), where("email", "==", email));
        const snapFam = await getDocs(qFam);
        if (!snapFam.empty) {
            return { status: 'error', message: 'ERRO: Este email já pertence a um usuário ativo (Família).' };
        }

        // 2. Checar se já tem convite pendente
        const qInv = query(collection(db, "invites"), where("email", "==", email), where("status", "==", "pending"));
        const snapInv = await getDocs(qInv);
        if (!snapInv.empty) {
            return { status: 'error', message: 'ERRO: Já existe um convite pendente para este e-mail.' };
        }

        // Gera um Token Único (pode ser UUID ou string aleatória)
        const token = crypto.randomUUID();

        const inviteRef = doc(db, "invites", token);

        const payload = {
            token: token,
            email: inviteData.email.trim().toLowerCase(),
            repName: inviteData.repName.trim(),
            permission: inviteData.permission,
            isTeamMember: inviteData.isTeamMember || false,
            isRepresentative: inviteData.isRepresentative !== false,
            status: 'pending', // 'pending', 'used'
            createdBy: adminUid,
            createdAt: serverTimestamp()
        };

        await setDoc(inviteRef, payload);

        // SEMPRE usa URL de produção, mesmo em localhost (para funcionar em celulares)
        const baseUrl = 'https://album-familia-final.web.app';

        return {
            status: 'success',
            link: `${baseUrl}/register?token=${token}`,
            token: token
        };

    } catch (error) {
        console.error("Create Invite Error:", error);
        return { status: 'error', message: 'Erro ao gerar convite.' };
    }
};

/**
 * Exclui um convite (Revogar)
 */
export const deleteInvite = async (inviteId) => {
    try {
        await deleteDoc(doc(db, "invites", inviteId));
        return { status: 'success', message: 'Convite excluído.' };
    } catch (error) {
        console.error("Delete Invite Error:", error);
        return { status: 'error', message: `Erro ao excluir: ${error.message}` };
    }
};

/**
 * Atualiza um convite (Corrigir e-mail/nome)
 */
export const updateInvite = async (inviteId, data) => {
    try {
        const inviteRef = doc(db, "invites", inviteId);
        await updateDoc(inviteRef, {
            ...data,
            updatedAt: serverTimestamp() // Audit
        });
        return { status: 'success', message: 'Convite atualizado.' };
    } catch (error) {
        console.error("Update Invite Error:", error);
        return { status: 'error', message: 'Erro ao atualizar convite.' };
    }
};

/**
 * Atualiza o nível de acesso (role) de um usuário
 */
export const updateUserRole = async (targetUid, newRole) => {
    try {
        const userRef = doc(db, "familias", targetUid);
        await setDoc(userRef, {
            adminRole: newRole
        }, { merge: true });

        return { status: 'success', message: 'Permissão atualizada com sucesso.' };
    } catch (error) {
        console.error("Update Role Error:", error);
        return { status: 'error', message: 'Erro ao atualizar permissão.' };
    }
};

/**
 * Bloquear / Desbloquear Usuário
 */
export const toggleUserBlock = async (uid, currentStatus) => {
    try {
        const newStatus = currentStatus === 'Bloqueado' ? 'Ativo' : 'Bloqueado';
        const userRef = doc(db, "familias", uid);
        await updateDoc(userRef, {
            status: newStatus,
            updatedAt: serverTimestamp()
        });
        return { status: 'success', message: `Usuário ${newStatus === 'Bloqueado' ? 'bloqueado' : 'desbloqueado'}.` };
    } catch (error) {
        console.error("Block User Error:", error);
        return { status: 'error', message: 'Erro ao alterar status.' };
    }
};

/**
 * Reenvia um convite (Basic) - Gera novo link mantendo o token existente
 */
export const resendInvite = async (inviteId, inviteEmail, inviteName) => {
    try {
        // SEMPRE usa URL de produção, mesmo em localhost (para funcionar em celulares)
        const baseUrl = 'https://album-familia-final.web.app';

        const link = `${baseUrl}/register?token=${inviteId}`;

        return {
            status: 'success',
            link: link,
            email: inviteEmail,
            name: inviteName,
            message: 'Link de convite regenerado com sucesso!'
        };
    } catch (error) {
        console.error("Resend Invite Error:", error);
        return { status: 'error', message: 'Erro ao gerar link de convite.' };
    }
};

/**
 * Renova um convite expirado (Reseta createdAt para AGORA)
 */
export const renewInvite = async (inviteId) => {
    try {
        const inviteRef = doc(db, "invites", inviteId);
        await updateDoc(inviteRef, {
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        });
        return { status: 'success', message: 'Convite renovado por mais 7 dias!' };
    } catch (error) {
        console.error("Renew Invite Error:", error);
        return { status: 'error', message: 'Erro ao renovar convite.' };
    }
};

/**
 * BANIMENTO COMPLETO (Master Only) - Remove TUDO do usuário
 * - Deleta de familias
 * - Deleta de users (se existir)
 * - Deleta subcoleção members
 * - Deleta fotos no Storage
 * - NÃO deleta do Authentication (impossível via client SDK por segurança)
 */
export const completeBan = async (uid, email) => {
    try {
        // 1. Deletar documento da coleção familias
        const familiaRef = doc(db, "familias", uid);
        await deleteDoc(familiaRef);

        // 2. Deletar documento da coleção users (se existir)
        try {
            const userRef = doc(db, "users", uid);
            const userSnap = await getDoc(userRef);
            if (userSnap.exists()) {
                await deleteDoc(userRef);
            }
        } catch (e) {
            console.warn("users doc não existe ou erro ao deletar:", e);
        }

        // 3. Deletar subcoleção members
        try {
            const membersQuery = query(collection(db, `users/${uid}/members`));
            const membersSnap = await getDocs(membersQuery);
            const deletePromises = membersSnap.docs.map(d => deleteDoc(d.ref));
            await Promise.all(deletePromises);
        } catch (e) {
            console.warn("Erro ao deletar members:", e);
        }

        // 4. Nota: Fotos do Storage e Authentication não podem ser deletados via client SDK
        // Precisaria de Firebase Functions ou Admin SDK

        return {
            status: 'success',
            message: `Usuário ${email} banido completamente. AVISO: A conta no Authentication precisa ser removida manualmente no Firebase Console para permitir novo cadastro.`
        };
    } catch (error) {
        console.error("Complete Ban Error:", error);
        return { status: 'error', message: `Erro ao banir: ${error.message}` };
    }
};

// --- DATA FETCHING ---

/**
 * Listener Realtime para a lista de famílias (Dashboard)
 */
export const subscribeToFamilies = (onUpdate) => {
    // CORREÇÃO: Removido orderBy porque documentos criados manualmente no Console não têm createdAt
    const q = query(collection(db, "familias"));

    return onSnapshot(q, (snapshot) => {
        const families = [];
        snapshot.forEach((doc) => {
            families.push({ id: doc.id, ...doc.data() });
        });
        onUpdate(families);
    });
};

/**
 * Listener Realtime para a lista de convites (Dashboard)
 */
export const subscribeToInvites = (onUpdate) => {
    const q = query(collection(db, "invites"), orderBy("createdAt", "desc"));

    return onSnapshot(q, (snapshot) => {
        const invites = [];
        snapshot.forEach((doc) => {
            invites.push({ id: doc.id, ...doc.data() });
        });
        onUpdate(invites);
    });
};

// --- HELPERS ---




/**
 * Busca os membros da subcoleção de uma família específica
 */
/**
 * Busca os membros da subcoleção de uma família específica e calcula progresso
 */
export const fetchFamilyMembers = async (uid) => {
    try {
        const membersRef = collection(db, "familias", uid, "membros");
        const snapshot = await getDocs(membersRef);
        const members = [];

        snapshot.forEach(doc => {
            const data = doc.data();

            // Cálculo de Progresso (Sistema de Pesos Ponderados - Definição do Usuário)
            const calculateMemberCompletion = (d) => {
                const weights = {
                    'resumoHistorico': 21.0,
                    'relatosAdicionais': 14.0,
                    'nomePai': 5.5,
                    'nomeMae': 5.5,
                    'cidadesMorou': 4.0,
                    'nomeCompleto': 3.0,
                    'sobrenomesSolteiro': 3.0,
                    'apelido': 3.0,
                    'dataNascimento': 3.0,
                    'localNascimento_pais': 3.0,
                    'localNascimento_cidade': 3.0,
                    'realizacoesPremios': 3.0,
                    'atuacaoComunitaria': 3.0,
                    'professorHebraico': 3.0,
                    'situacaoConjugal': 2.5,
                    'qtdFilhos': 2.5,
                    'grauInstrucao': 2.5,
                    'escolasUniversidades': 2.5,
                    'hobbies': 2.5,
                    'religiao': 1.5,
                    'situacaoVital': 1.5,
                    'ocupacaoPrincipal': 1.5,
                    'locaisTrabalho': 1.5,
                    'locaisConheceu': 1.5,
                    'amizadesMarcantes': 1.5,
                    'sinagogaFrequentava': 1.5
                };

                let score = 0;
                let maxScore = 100.0; // Soma total dos pesos

                for (const [key, weight] of Object.entries(weights)) {
                    // Verifica se existe e tem conteúdo real (não vazio)
                    if (d[key] && String(d[key]).trim().length > 0) {
                        score += weight;
                    }
                }

                return Math.min(100, Math.round(score));
            };

            const completion = calculateMemberCompletion(data);

            members.push({
                id: doc.id,
                ...data,
                completion: completion > 100 ? 100 : completion // Safety cap
            });
        });

        return members;
    } catch (error) {
        console.error("Fetch Members Error:", error);
        return [];
    }
};

/**
 * Atualiza apenas o nome do representante (FIX rápido para erros de digitação)
 */
export const updateFamilyName = async (uid, newName) => {
    try {
        const userRef = doc(db, "familias", uid);
        await updateDoc(userRef, {
            repName: newName,
            updatedAt: serverTimestamp()
        });
        return { status: 'success' };
    } catch (error) {
        console.error("Rename Error:", error);
        throw error;
    }
};

/**
 * Atualiza campos genéricos da família (Ex: isRepresentative)
 */
export const updateFamilyData = async (uid, data) => {
    try {
        const userRef = doc(db, "familias", uid);
        await updateDoc(userRef, {
            ...data,
            updatedAt: serverTimestamp()
        });
        return { status: 'success' };
    } catch (error) {
        console.error("Update Family Data Error:", error);
        throw error;
    }
};

/**
 * Atualiza o e-mail do representante no documento Firestore (familias/{uid}).
 * NOTA TÉCNICA: Esta função atualiza apenas o campo 'email' no Firestore.
 * A sincronização com o e-mail de login do Firebase Authentication requer
 * uma Cloud Function com permissão de admin (admin.auth().updateUser).
 * Esta implementação cobre o cadastro; o login continua com o e-mail antigo
 * até que a Cloud Function seja acionada / o admin atualize manualmente no console.
 */
export const updateFamilyEmail = async (uid, newEmail) => {
    try {
        const userRef = doc(db, "familias", uid);
        await updateDoc(userRef, {
            email: newEmail.trim().toLowerCase(),
            updatedAt: serverTimestamp()
        });
        return { status: 'success' };
    } catch (error) {
        console.error("Update Email Error:", error);
        throw error;
    }
};

/**
 * Migra dados de um ID de documento para outro (usado para corrigir importações com IDs errados)
 */
export const migrateUserData = async (sourceId, targetId) => {
    if (!sourceId || !targetId) throw new Error("ID de Origem e Destino são obrigatórios.");
    if (sourceId.trim() === targetId.trim()) throw new Error("Origem e Destino não podem ser iguais.");

    const sid = sourceId.trim();
    const tid = targetId.trim();

    const sourceRef = doc(db, "familias", sid);
    const targetRef = doc(db, "familias", tid);
    const sourceMembrosRef = collection(db, "familias", sid, "membros");
    const targetMembrosRef = collection(db, "familias", tid, "membros");

    // ═══════════════════════════════════════════════════
    // FASE 1: LEITURA COMPLETA (nada é escrito ou deletado aqui)
    // ═══════════════════════════════════════════════════
    console.log(`[MIGRAÇÃO] Iniciando leitura de origem: ${sid}`);

    const sourceSnap = await getDoc(sourceRef);
    if (!sourceSnap.exists()) {
        throw new Error(`Documento de origem (${sid}) não encontrado no Firestore. Verifique o ID e tente novamente.`);
    }

    const membrosSnap = await getDocs(sourceMembrosRef);
    const totalMembros = membrosSnap.size;
    console.log(`[MIGRAÇÃO] Lidos: 1 documento raiz + ${totalMembros} membros da subcoleção /membros.`);

    // ═══════════════════════════════════════════════════
    // FASE 2: ESCRITA ATÔMICA NO DESTINO (writeBatch)
    // Só prossegue para exclusão se este commit tiver sucesso.
    // Limite do writeBatch: 500 ops. 14 membros + 1 doc = 15 ops. Seguro.
    // ═══════════════════════════════════════════════════
    console.log(`[MIGRAÇÃO] Gravando ${totalMembros + 1} documentos no destino: ${tid}`);

    const writeBatchWrite = writeBatch(db);

    // a) Documento raiz da família
    writeBatchWrite.set(targetRef, {
        ...sourceSnap.data(),
        migratedAt: serverTimestamp(),
        previousId: sid,
        uid: tid // Garante que o UID no documento bata com a chave
    }, { merge: true });

    // b) Todos os membros da subcoleção
    membrosSnap.docs.forEach(memDoc => {
        const destDocRef = doc(targetMembrosRef, memDoc.id);
        writeBatchWrite.set(destDocRef, memDoc.data());
    });

    // Commit da escrita — se falhar aqui, NADA da origem é tocado
    await writeBatchWrite.commit();
    console.log(`[MIGRAÇÃO] ✅ Fase 2 concluída: todos os dados gravados em ${tid}.`);

    // ═══════════════════════════════════════════════════
    // FASE 3: EXCLUSÃO DA ORIGEM (só executada após commit bem-sucedido)
    // ═══════════════════════════════════════════════════
    console.log(`[MIGRAÇÃO] Iniciando exclusão segura da origem: ${sid}`);

    const writeBatchDelete = writeBatch(db);

    // c) Deleta todos os membros da origem
    membrosSnap.docs.forEach(memDoc => {
        writeBatchDelete.delete(doc(sourceMembrosRef, memDoc.id));
    });

    // d) Deleta o documento raiz da origem
    writeBatchDelete.delete(sourceRef);

    await writeBatchDelete.commit();
    console.log(`[MIGRAÇÃO] ✅ Fase 3 concluída: origem ${sid} removida.`);

    const msg = `Migrado com sucesso! ${totalMembros} membros movidos de ${sid} → ${tid}.`;
    console.log(`[MIGRAÇÃO] ${msg}`);
    return { status: 'success', message: msg };
};

// --- HELPERS ---

const mapAuthError = (code) => {
    switch (code) {
        case 'auth/invalid-email': return 'E-mail inválido.';
        case 'auth/user-not-found': return 'Usuário não encontrado.';
        case 'auth/wrong-password': return 'Senha incorreta.';
        default: return `Erro de autenticação: ${code}`;
    }
};

/**
 * Exclui PERMANENTEMENTE o registro de uma família e seus membros
 */
export const deleteFamilyRecord = async (familyId) => {
    try {
        // 1. Deletar Subcoleção 'membros'
        const membersRef = collection(db, "familias", familyId, "membros");
        const snapshot = await getDocs(membersRef);

        // Executa deleção em paralelo
        const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref));
        await Promise.all(deletePromises);

        // 2. Deletar Documento Raiz da Família
        await deleteDoc(doc(db, "familias", familyId));

        return { status: 'success', message: 'Família excluída permanentemente.' };
    } catch (error) {
        console.error("Delete Family Error:", error);
        return { status: 'error', message: 'Erro ao excluir família: ' + error.message };
    }
};

/**
 * Busca os logs do sistema
 */
export const getSystemLogs = async () => {
    try {
        const q = query(
            collection(db, "system_logs"),
            orderBy("timestamp", "desc"),
            limit(300)
        );
        const snapshot = await getDocs(q);
        const logs = [];
        snapshot.forEach(doc => {
            logs.push({ id: doc.id, ...doc.data() });
        });
        return { status: 'success', data: logs };
    } catch (_) {
        // Sem permissão de leitura (usuário não é super-admin) — silencioso
        return { status: 'restricted', data: [] };
    }
};

/**
 * Registra um evento no sistema (Telemetria)
 */
export const logSystemEvent = async (type, module, message, userEmail = null, metadata = {}) => {
    try {
        await addDoc(collection(db, "system_logs"), {
            timestamp: serverTimestamp(),
            type,
            module,
            message,
            userEmail,
            metadata
        });
    } catch (_) {
        // Silencioso: sem permissão de escrita em system_logs (usuário sem role super-admin)
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// REENVIO EM BLOCO — Funções de registro de atividade
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Registra o timestamp do último reenvio de um CONVITE (Fonte A: /invites/{id})
 */
export const markInviteSent = async (inviteId) => {
    try {
        await updateDoc(doc(db, 'invites', inviteId), {
            dataUltimoConvite: serverTimestamp()
        });
        return { status: 'success' };
    } catch (error) {
        console.error('[markInviteSent] Erro:', error);
        return { status: 'error', message: error.message };
    }
};

/**
 * Registra o timestamp do último aviso de um MEMBRO On-The-Fly
 * (Fonte B: /familias/{familiaId}/membros/{membroId})
 */
export const markMembroSent = async (familiaId, membroId) => {
    try {
        await updateDoc(doc(db, 'familias', familiaId, 'membros', membroId), {
            dataUltimoConvite: serverTimestamp()
        });
        return { status: 'success' };
    } catch (error) {
        console.error('[markMembroSent] Erro:', error);
        return { status: 'error', message: error.message };
    }
};

/**
 * Reenvio em Bloco — Salva o telefone digitado pelo admin no cadastro do membro
 * Usa merge:true para não sobrescrever outros campos
 */
export const updateMemberPhone = async (familiaId, membroId, phone) => {
    try {
        const ref = doc(db, 'familias', familiaId, 'membros', membroId);
        await setDoc(ref, { repPhone: phone.trim() }, { merge: true });
        return { status: 'success' };
    } catch (error) {
        console.error('[updateMemberPhone] Erro:', error);
        return { status: 'error', message: error.message };
    }
};
