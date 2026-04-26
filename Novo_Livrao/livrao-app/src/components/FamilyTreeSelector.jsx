import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Users, Fingerprint, AlertTriangle, Trash2, Plus, X } from 'lucide-react';
import { getDisplayRole } from '../services/familyService';

const DEPLOY_VERSION = Date.now(); // Versão estável por sessão para limpar o cache das fotos

/* --- HELPERS GLOBAIS --- */
const normStr = (str) => typeof str === 'string' ? str.trim().toLowerCase() : '';
const isPrimo = (role) => {
    const r = normStr(role);
    return r.includes('primo') || r.includes('prima');
};
const isSobrinho = (role) => {
    const r = normStr(role);
    return r.includes('sobrinho') || r.includes('sobrinha');
};

// Função auxiliar movida para fora para otimizar a performance
const calculateProgress = (data) => {
    if (!data) return 0;
    const baseFields = ['nomeCompleto', 'dataNascimento', 'localNascimento_cidade', 'localNascimento_pais', 'religiao', 'nomePai', 'nomeMae', 'situacaoConjugal', 'situacaoVital', 'biography', 'resumoHistorico'];
    let filled = 0;
    let total = baseFields.length + 1;
    baseFields.forEach(f => { if (data[f] && typeof data[f] === 'string' && data[f].trim() !== '') filled++; });
    if (data.fotoIdentificacao?.length > 0 || data.photoMain) filled++;

    if (data.situacaoVital === 'Falecido') {
        const deathFields = ['dataFalecimento', 'localFalecimento_cidade', 'causaMorte'];
        total += deathFields.length;
        deathFields.forEach(f => { if (data[f] && typeof data[f] === 'string' && data[f].trim() !== '') filled++; });
    }
    return Math.round((filled / total) * 100);
};

export const FamilyTreeSelector = ({
    value,
    onChange,
    membersData = {},
    onNext,
    onDeleteMember,
    onArchiveAllOthers,
    onArchiveMember,
    onAcceptDuplicate,
    onMergeDuplicates = null,
    representativeName = '',
    representativePhone = '',
    uid = null,
    onRefreshMembers = null
}) => {
    const containerRef = useRef(null);
    const [expandedRole, setExpandedRole] = useState(null);
    const [systemNotifications, setSystemNotifications] = useState([]);
    const [attentionNeeded, setAttentionNeeded] = useState({ ids: new Set(), names: new Set() });

    // Modal de 2 etapas para criação de colaterais
    const [showOutroModal, setShowOutroModal] = useState(false);
    const [outroModalStep, setOutroModalStep] = useState(1);
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [pendingClanAnchorId, setPendingClanAnchorId] = useState(null);

    // Mini-modal focado para "adicionar ao clã de um Tio" específico
    const [clanModal, setClanModal] = useState(null); // { headKey, headName, side, options }

    // Etapa 3 — Âncora específica para o papel escolhido
    const [anchorModalList, setAnchorModalList] = useState([]);
    const [papelEscolhidoAtual, setPapelEscolhidoAtual] = useState('');

    // Papéis que exigem a Etapa 3 (seleção de âncora)
    const NEEDS_ANCHOR_STEP = {
        'Conjuge do Irmao': { label: 'Cônjuge de qual irmão/ã?',  filterBy: ['Irmao','Irma','Irmão','Irmã'] },
        'Sobrinho':         { label: 'Filho/a de qual irmão/ã?',  filterBy: ['Irmao','Irma','Irmão','Irmã'] },
        'Sobrinha':         { label: 'Filho/a de qual irmão/ã?',  filterBy: ['Irmao','Irma','Irmão','Irmã'] },
        'Genro':            { label: 'Casado/a com qual filho/a?', filterBy: ['Filho/a'] },
        'Nora':             { label: 'Casada/o com qual filho/a?', filterBy: ['Filho/a'] },
        'Neto':             { label: 'Neto/a de qual filho/a?',    filterBy: ['Filho/a'] },
        'Neta':             { label: 'Neto/a de qual filho/a?',    filterBy: ['Filho/a'] },
        'Enteado':          { label: 'Filho/a de qual cônjuge?',   filterBy: ['Cônjuge','Cônjuge 2','Cônjuge 3','Cônjuge 4'] },
        'Enteada':          { label: 'Filho/a de qual cônjuge?',   filterBy: ['Cônjuge','Cônjuge 2','Cônjuge 3','Cônjuge 4'] },
    };

    // Função unificada de confirmação (usada nas Etapas 2 e 3)
    const confirmarEscolha = (papel, anchorId) => {
        console.log('[ETAPA 3] confirmarEscolha chamado:', {
            papel,
            anchorId,
            newUUID: 'será gerado'
        });
        const newUUID = generateCollateralId();
        console.log('[ETAPA 3] payload onChange:', {
            papel,
            parentesco: papel,
            nome: '',
            vinculoFamiliarId: anchorId || pendingClanAnchorId || '',
            _newDocId: newUUID
        });
        onChange({
            papel,
            parentesco: papel,
            nome: '',
            vinculoFamiliarId: anchorId || pendingClanAnchorId || '',
            _newDocId: newUUID
        });
        onNext(newUUID);
        setShowOutroModal(false);
        setOutroModalStep(1);
        setSelectedCategory(null);
        setPendingClanAnchorId(null);
        setAnchorModalList([]);
        setPapelEscolhidoAtual('');
    };

    // Novas Abas Laterais
    const [showDuplicateDrawer, setShowDuplicateDrawer] = useState(false);
    const [showIncompleteDrawer, setShowIncompleteDrawer] = useState(false);
    const [duplicateMembersList, setDuplicateMembersList] = useState([]);
    const [incompleteMembersList, setIncompleteMembersList] = useState([]);
    const [acceptedDuplicates, setAcceptedDuplicates] = useState(new Set());

    const [mergeLoading, setMergeLoading] = useState(false); // homologation
    const [mergeToast,   setMergeToast]   = useState(null);  // { msg, color }

    // NFC normalization — garante que chaves com acentos (ex: 'Pai da Avó Materna') batem com docIds do Firestore
    const normalizedMembersData = useMemo(() => {
        if (!membersData) return {};
        return Object.fromEntries(
            Object.entries(membersData).map(([key, value]) => [
                key.normalize('NFC'),
                value
            ])
        );
    }, [membersData]);


    useEffect(() => {
        if (!membersData) return;

        const alerts = [];
        const memberTagsMap = {};
        let hasLegacyRecords = false;
        
        const membersList = [];
        Object.keys(membersData).forEach(key => {
            const member = normalizedMembersData[key];
            if (!member) return;

            // Identifica se há registros no formato antigo (sem ID único)
            if (!member.id) hasLegacyRecords = true;

            const baseName = (member.nomeCompleto || '').trim().toLowerCase();
            const bDate = (member.dataNascimento || '').trim();
            
            if (baseName) {
                membersList.push({ key, baseName, bDate });
            }
        });

        const duplicates = [];
        membersList.forEach(m => {
            const matches = membersList.filter(o => o.key !== m.key && o.baseName === m.baseName);
            if (matches.length > 0) {
                const hasD = matches.some(o => o.bDate === m.bDate);
                const hasH = matches.some(o => o.bDate !== m.bDate);
                const isAccepted = normalizedMembersData[m.key]?.duplicateAccepted || matches.some(o => normalizedMembersData[o.key]?.duplicateAccepted) || acceptedDuplicates.has(m.baseName);
                
                memberTagsMap[m.key] = { isD: hasD && !isAccepted, isH: hasH && !isAccepted };
                
                if (!isAccepted) {
                    duplicates.push({ key: m.key, member: normalizedMembersData[m.key], isD: hasD, isH: hasH, baseName: m.baseName });
                }
            }
        });

        // Agrupados sem duplicatas no array de estado
        const uniqueDups = Array.from(new Map(duplicates.map(item => [item.key, item])).values());
        setDuplicateMembersList(uniqueDups);

        const hasAnyD = uniqueDups.some(t => t.isD);
        const hasAnyH = uniqueDups.some(t => t.isH);

        // Banner de alerta geral para Duplicatas e Homônimos
        if (hasAnyD || hasAnyH) {
            alerts.push({
                id: 'duplicate_warning',
                type: 'warning',
                text: 'Membros com dados iguais ou parecidos encontrados ',
                action: {
                    label: 'clique aqui para confirmar ou ajustar',
                    handler: () => setShowDuplicateDrawer(true),
                    autoDismiss: false
                }
            });
        } else if (hasLegacyRecords) {
            alerts.push({
                id: 'legacy_warning',
                type: 'info',
                text: 'Para garantir a melhor experiência e evitar duplicados, recomendamos abrir e salvar os perfis que ainda não possuem o novo selo de identidade.'
            });
        }

        const incompleteMembers = [];
        Object.keys(membersData).forEach(key => {
            const m = normalizedMembersData[key];
            if (!m) return;
            if (!m.nomeCompleto || !m.dataNascimento) {
                incompleteMembers.push({ key, member: m });
            }
        });
        setIncompleteMembersList(incompleteMembers);

        if (incompleteMembers.length > 0) {
            alerts.push({
                id: 'incomplete_warning',
                type: 'info',
                text: 'Existem cadastros com informaçoes importante pendentes, ',
                action: {
                    label: 'clique aqui para ajustar',
                    handler: () => setShowIncompleteDrawer(true),
                    autoDismiss: false
                }
            });
        }

        setAttentionNeeded(memberTagsMap || {});
        setSystemNotifications(alerts);
    // P3: removido `onArchiveAllOthers` das deps — ele nunca é lido dentro do efeito.
    // Sua instabilidade de referência causava re-renders desnecessários a cada render do App.jsx.
    }, [membersData, acceptedDuplicates]);

    // [FASE 2] UUID generator para colaterais — substitui getNextOutroIndex
    const generateCollateralId = () => {
        if (typeof crypto !== 'undefined' && crypto.randomUUID) {
            return crypto.randomUUID();
        }
        // Fallback para browsers antigos
        return `col_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    };

    const GRID_COLS = 34;
    const GRID_ROWS = 65;
    const SCALE_FACTOR = 1.3;
    const CARD_H = 3.90;
    const V_STEP = 5.5;
    const START_Y = 24.5;
    const RIGHT_X = 25.0;
    const RIGHT_W = 5.84;
    const LEFT_W = 5.84;
    const COL_X = 1.0;

    const ENABLE_COUPLE_WRAPPER = false;
    const hasSingleUnion = (data) => {
        const rep = data['Eu mesmo'] || {};
        const isMarried = ['Casado', 'Divorciado', 'Viúvo', 'União Estável'].includes(rep.situacaoConjugal);
        if (!isMarried) return false;
        const hasAltUnion = !!rep.remarried_1 || !!rep.remarried_2 || !!rep.remarried_3 || 
                            !!data['Cônjuge 2'] || !!data['Cônjuge 3'] || !!data['Cônjuge 4'];
        return !hasAltUnion;
    };

    const familyButtonsGrid = useMemo(() => [
        // NÍVEL 4: BISAVÓS (MINI)
        { role: 'Pai do Avô Paterno', label: 'BISAVÔ', x: 1.68, y: 1.5, w: 5.84, h: 3.90, level: 4, type: 'bisavo', size: 'mini' },
        { role: 'Mãe do Avô Paterno', label: 'BISAVÓ', x: 1.68, y: 6.7, w: 5.84, h: 3.90, level: 4, type: 'bisavo', size: 'mini' },
        { role: 'Pai da Avó Paterna', label: 'BISAVÔ', x: 9.54, y: 1.5, w: 5.84, h: 3.90, level: 4, type: 'bisavo', size: 'mini' },
        { role: 'Mãe da Avó Paterna', label: 'BISAVÓ', x: 9.54, y: 6.7, w: 5.84, h: 3.90, level: 4, type: 'bisavo', size: 'mini' },
        { role: 'Pai do Avô Materno', label: 'BISAVÔ', x: 17.98, y: 1.5, w: 5.84, h: 3.90, level: 4, type: 'bisavo', size: 'mini' },
        { role: 'Mãe do Avô Materno', label: 'BISAVÓ', x: 17.98, y: 6.7, w: 5.84, h: 3.90, level: 4, type: 'bisavo', size: 'mini' },
        { role: 'Pai da Avó Materna', label: 'BISAVÔ', x: 25.99, y: 1.5, w: 5.84, h: 3.90, level: 4, type: 'bisavo', size: 'mini' },
        { role: 'Mãe da Avó Materna', label: 'BISAVÓ', x: 25.99, y: 6.7, w: 5.84, h: 3.90, level: 4, type: 'bisavo', size: 'mini' },

        // NÍVEL 3: AVÓS (MINI)
        { role: 'Avô Paterno', label: 'AVÔ PATERNO', x: 1.68, y: 12.5, w: 5.84, h: 3.90, level: 3, type: 'avo', size: 'mini' },
        { role: 'Avó Paterna', label: 'AVÓ PATERNA', x: 9.54, y: 12.5, w: 5.84, h: 3.90, level: 3, type: 'avo', size: 'mini' },
        { role: 'Avô Materno', label: 'AVÔ MATERNO', x: 17.98, y: 12.5, w: 5.84, h: 3.90, level: 3, type: 'avo', size: 'mini' },
        { role: 'Avó Materna', label: 'AVÓ MATERNA', x: 25.99, y: 12.5, w: 5.84, h: 3.90, level: 3, type: 'avo', size: 'mini' },

        // NÍVEL 2: PAIS (MÉDIO)
        { role: 'Pai', label: 'PAI', x: 3.53, y: 18.5, w: 10.00, h: 3.90, level: 2, type: 'pai', size: 'medio' },
        { role: 'Mãe', label: 'MÃE', x: 19.90, y: 18.5, w: 10.00, h: 3.90, level: 2, type: 'mae', size: 'medio' },

        // NÍVEL 1: REPRESENTANTE (GRANDE)
        { role: 'Eu mesmo', label: 'REPRESENTANTE FAMILIAR', x: 11.715, y: 24.5, w: 10.00, h: 3.90, level: 1, type: 'representante', size: 'grande' },
    ], []);

    const familyButtons = useMemo(() => {
        const gridWithSpouse = [...familyButtonsGrid];
        const repData = normalizedMembersData['Eu mesmo'] || {};
        const isMarried = ['Casado', 'Divorciado', 'Viúvo', 'União Estável'].includes(repData.situacaoConjugal);

        const MARRIAGE_LEVELS = [
            { suffix: '', role: 'Cônjuge', label: 'ESPOSO(A)', active: isMarried },
            { suffix: '_2', role: 'Cônjuge 2', label: 'ESPOSO(A)', active: !!repData.remarried_1 },
            { suffix: '_3', role: 'Cônjuge 3', label: 'ESPOSO(A)', active: !!repData.remarried_2 },
            { suffix: '_4', role: 'Cônjuge 4', label: 'ESPOSO(A)', active: !!repData.remarried_3 }
        ];

        let rightIdx = 0;
        let globalChildIdx = 0;

        MARRIAGE_LEVELS.forEach((m) => {
            if (m.active) {
                gridWithSpouse.push({
                    role: m.role, label: m.label, x: RIGHT_X, y: START_Y + rightIdx * V_STEP,
                    w: RIGHT_W, h: CARD_H, level: 1, type: 'conjuge', size: 'mini'
                });
                rightIdx++;

                const marriageChildren = [];
                const childrenText = repData[`children${m.suffix}`] || '';
                if (childrenText) marriageChildren.push(...childrenText.split(',').map(c => c.trim()).filter(Boolean));
                for (let i = 1; i <= 16; i++) {
                    const name = repData[`nomeFilho${i}${m.suffix}`];
                    if (name) marriageChildren.push(name.trim());
                }

                [...new Set(marriageChildren)].forEach((childName) => {
                    // Verificação para evitar duplicados no Grid SVG
                    const realMemberKey = Object.keys(membersData).find(k => {
                        const m = normalizedMembersData[k];
                        const p = (m?.relationshipInfo?.parentesco || m?.parentesco || '').toLowerCase();
                        return (p.includes('filho') || p.includes('filha')) &&
                            (m.nomeCompleto?.trim() === childName.trim());
                    });

                    if (!realMemberKey) {
                        gridWithSpouse.push({
                            role: `__filho_${globalChildIdx}`, label: `FILHO(A)`,
                            x: RIGHT_X, y: START_Y + rightIdx * V_STEP, w: RIGHT_W, h: CARD_H,
                            level: 1, type: 'filho_individual', size: 'mini', childName, parentMarriage: m.role
                        });
                        rightIdx++;
                    }
                    globalChildIdx++;
                });
            }
        });

        // ==========================================
        // COLATERAIS E OUTROS FORAM REMOVIDOS DO GRID ABSOLUTO SVG
        // A lógica agora é tratada por categorizeMembers e renderizado em flex-cols
        // ==========================================

        const toPct = (val, total) => (val / total) * 100;

        return gridWithSpouse.map(btn => {
            if (btn.role === 'Eu mesmo') {
                const m = normalizedMembersData['Eu mesmo'] || {};
                return {
                    ...btn,
                    nome: m.nomeCompleto || m.fullName || representativeName || 'Eu mesmo',
                    phone: m.repPhone || representativePhone || '',
                    id_unico: m.id_unico || '',
                    status_vital: m.status_vital || m.vitalStatus || 'Vivo',
                    photoURL: m.photoURL || '',
                    x: toPct(btn.x, GRID_COLS) - (toPct(btn.w, GRID_COLS) * SCALE_FACTOR - toPct(btn.w, GRID_COLS)) / 2,
                    y: toPct(btn.y, GRID_ROWS) - (toPct(btn.h, GRID_ROWS) * SCALE_FACTOR - toPct(btn.h, GRID_ROWS)) / 2,
                    w: toPct(btn.w, GRID_COLS) * SCALE_FACTOR,
                    h: toPct(btn.h, GRID_ROWS) * SCALE_FACTOR
                };
            }

            const isExpanded = expandedRole === btn.role;
            const isHalfHeight = btn.h < 2.0 && btn.h >= 1.0;
            const isQuarterHeight = btn.h < 1.0;

            let finalWidth = toPct(btn.w, GRID_COLS) * SCALE_FACTOR;
            let finalHeight = toPct(btn.h, GRID_ROWS) * SCALE_FACTOR;

            if (isExpanded && btn.size === 'mini') {
                finalWidth *= 1.4;
            }

            const xOffset = (finalWidth - toPct(btn.w, GRID_COLS)) / 2;
            const yOffset = (finalHeight - toPct(btn.h, GRID_ROWS)) / 2;

            return {
                ...btn,
                rawX: btn.x, // SALVA A COORDENADA MATEMÁTICA PARA O SVG
                rawY: btn.y, // SALVA A COORDENADA MATEMÁTICA PARA O SVG
                x: toPct(btn.x, GRID_COLS) - xOffset,
                y: toPct(btn.y, GRID_ROWS) - yOffset,
                w: finalWidth,
                h: finalHeight,
                isHalfHeight,
                isQuarterHeight
            };
        });
    }, [membersData, expandedRole, familyButtonsGrid]);

    const renderConnections = () => {
        const find = (r) => familyButtonsGrid.find(b => b.role === r);

        const drawL = (childR, p1R, p2R) => {
            const c = find(childR), p1 = find(p1R), p2 = find(p2R);
            if (!c || !p1 || !p2) return null;
            const px = (p1.x + p1.w / 2 + p2.x + p2.w / 2) / 2;
            const py = Math.max(p1.y + p1.h, p2.y + p2.h);
            const my = (c.y + py) / 2;
            return <path key={`v-${childR}`} d={`M ${c.x + c.w / 2} ${c.y} L ${c.x + c.w / 2} ${my} L ${px} ${my} L ${px} ${py}`} opacity={expandedRole ? 0.2 : 1} className="transition-opacity duration-500" fill="none" stroke="#cbd5e1" strokeWidth="0.15" strokeLinejoin="round" />;
        };

        const drawBridge = (p1R, p2R) => {
            const p1 = find(p1R), p2 = find(p2R);
            if (!p1 || !p2) return null;
            const y = Math.max(p1.y + p1.h, p2.y + p2.h);
            return <line key={`b-${p1R}-${p2R}`} x1={p1.x + p1.w / 2} y1={y} x2={p2.x + p2.w / 2} y2={y} opacity={expandedRole ? 0.2 : 1} className="transition-opacity duration-500" stroke="#cbd5e1" strokeWidth="0.15" />;
        };

        return [
            drawBridge('Pai', 'Mãe'),
            drawBridge('Avó Paterna', 'Avô Paterno'),
            drawBridge('Avó Materna', 'Avô Materno'),
            drawBridge('Pai da Avó Paterna', 'Mãe da Avó Paterna'),
            drawBridge('Pai do Avô Paterno', 'Mãe do Avô Paterno'),
            drawBridge('Pai da Avó Materna', 'Mãe da Avó Materna'),
            drawBridge('Pai do Avô Materno', 'Mãe do Avô Materno'),
            drawL('Eu mesmo', 'Pai', 'Mãe'),
            drawL('Pai', 'Avó Paterna', 'Avô Paterno'),
            drawL('Mãe', 'Avó Materna', 'Avô Materno'),
            drawL('Avó Paterna', 'Pai da Avó Paterna', 'Mãe da Avó Paterna'),
            drawL('Avô Paterno', 'Pai do Avô Paterno', 'Mãe do Avô Paterno'),
            drawL('Avó Materna', 'Pai da Avó Materna', 'Mãe da Avó Materna'),
            drawL('Avô Materno', 'Pai do Avô Materno', 'Mãe do Avô Materno')
        ];
    };

    const renderChildrenConnections = () => {
        // Conexões filhas desativadas, pois cônjuges e descendentes 
        // agora vivem no Kanban Panel organizado em colunas
        return null;
    };

    // ==========================================
    // CONEXÕES DA COLUNA ESQUERDA (DESATIVADAS)
    // ==========================================
    const renderCollateralConnections = () => {
        // As linhas de conexão para tios e irmãos foram removidas 
        // para manter o design da interface limpo (Clean UI).
        // A lista lateral funciona de forma independente.
        return null;
    };

    const getButtonStyle = (button) => {
        const isSelected = value?.papel === button.role;
        const isExpanded = expandedRole === button.role;
        const shared = "absolute transition-all duration-500 rounded-lg border-[1.5px] md:border-2 !border-cyan-800 font-bold flex flex-col items-center md:shadow-sm shadow-none md:bg-white bg-transparent";
        const overflowClass = isExpanded ? "" : "overflow-hidden";
        const dimClass = expandedRole && !isExpanded ? "opacity-30 scale-90 grayscale-[0.5]" : "opacity-100";

        if (isExpanded) {
            return {
                className: `${shared} ${overflowClass} z-[110] scale-125 shadow-2xl ring-4 ring-slate-400/20 bg-white border-stone-400 text-slate-800`,
                style: {}
            };
        }

        let theme = { from: '#FFFFFF', to: '#F8F9FA', border: '#E2E8F0', text: '#1E293B', ring: 'ring-slate-200' };

        if (button.type === 'conjuge' || button.type === 'filho_individual') {
            const role = button.type === 'conjuge' ? button.role : button.parentMarriage;
            theme = { from: '#FFFFFF', to: '#F9FAFB', border: '#E2E8F0', text: '#475569', ring: 'ring-slate-200' };

            if (role === 'Cônjuge') theme = { from: '#FFFFFF', to: '#F9FAFB', border: '#CBD5E1', text: '#334155', ring: 'ring-slate-400' };
            else if (role === 'Cônjuge 2') theme = { from: '#FFFFFF', to: '#F9FAFB', border: '#E2E8F0', text: '#475569', ring: 'ring-slate-300' };
            else if (role === 'Cônjuge 3') theme = { from: '#FFFFFF', to: '#F9FAFB', border: '#E2E8F0', text: '#475569', ring: 'ring-slate-200' };
            else if (role === 'Cônjuge 4') theme = { from: '#FFFFFF', to: '#F9FAFB', border: '#F1F5F9', text: '#64748B', ring: 'ring-slate-100' };
        } else if (button.type === 'outro_parente') {
            return {
                className: `${shared} ${overflowClass} ${dimClass} border-dashed border-[#00838F] text-[#006064] hover:bg-[#E0F7FA]`,
                style: {}
            };
        } else {
            switch (button.level) {
                case 1: theme = { from: '#FFFFFF', to: '#F8FAFC', border: '#64748B', text: '#0F172A', ring: 'ring-slate-400' }; break;
                case 2: theme = { from: '#FFFFFF', to: '#F9FAFB', border: '#94A3B8', text: '#1E293B', ring: 'ring-slate-300' }; break;
                case 3: theme = { from: '#FFFFFF', to: '#F9FAFB', border: '#CBD5E1', text: '#334155', ring: 'ring-slate-200' }; break;
                default: theme = { from: '#FFFFFF', to: '#F9FAFB', border: '#E2E8F0', text: '#475569', ring: 'ring-slate-100' }; break;
            }
        }

        return {
            className: `${shared} ${overflowClass} ${dimClass} ${isSelected ? theme.ring + ' ring-4' : ''}`,
            style: {
                background: `linear-gradient(to bottom, ${theme.from}, ${theme.to})`,
                borderColor: theme.border,
                color: theme.text
            }
        };
    };

    // Helper de Categorização (Meticuloso)
    const categorizeMembers = () => {
        // Novo grid: colAncestorIrmaos | colFamiliaPaterna | colFamiliaMaterna | colConjugeFilhos
        const data = {
            colAncestorIrmaos: [],   // flat: ancestrais + irmãos combinados
            colFamiliaPaterna: [],   // clan groups: tios/primos do lado paterno
            colFamiliaMaterna: [],   // clan groups: tios/primos do lado materno
            colConjugeFilhos:  []    // union groups (inalterado)
        };
        const repData = normalizedMembersData['Eu mesmo'] || {};
        const seenIds = new Set();
        const seenNames = new Set();
        const clanNameRouteMap = {}; // Mapa para roteamento por nome (Tio -> Sobrinho/Cônjuge)

        const getBaseName = (name) => (name || '').trim().toLowerCase();

        // Tronco Principal (Não entra nas colunas, mas reservamos os nomes)
        const papeisFixosTronco = [
            'Eu mesmo', 'Pai', 'Mãe',
            'Avô Paterno', 'Avó Paterna', 'Avô Materno', 'Avó Materna',
            'Pai do Avô Paterno', 'Mãe do Avô Paterno', 'Pai da Avó Paterna', 'Mãe da Avó Paterna',
            'Pai do Avô Materno', 'Mãe do Avô Materno', 'Pai da Avó Materna', 'Mãe da Avó Materna',
        ];

        papeisFixosTronco.forEach(role => {
            const m = normalizedMembersData[role];
            if (m?.id) seenIds.add(m.id);
            const name = getBaseName(m?.nomeCompleto);
            if (name) seenNames.add(name);
        });

        // Helper: extrai ano de nascimento para ordenação cronológica (mais velho → mais novo)
        const getBirthYear = (member) => {
            const d = member?.dataNascimento || '';
            if (d === '[NÃO SEI]' || d.startsWith('ID_DESCONHECIDO_')) return 9999;
            const match = d.match(/\d{4}/);
            return match ? parseInt(match[0], 10) : 9999;
        };

        // ══════════════════════════════════════════════════════════════════════
        // buildClanGroups v2 — Motor de Agrupamento por vinculoFamiliarId
        //
        // Hierarquia de busca:
        //   1. Membros cujo vinculoFamiliarId === tio.docId ou tio.key
        //   2. (Fallback de nome) membros cujo nome aparece nos campos
        //      nomeConjugeTio / nomeFilhoN do próprio documento do Tio
        //
        // Membros sem vínculo ficam em sub-grupos soltos (Primos/Sobrinhos/Outros)
        // e são devolvidos NO FIM da lista — o Passe 1.5 em categorizeMembers
        // os redireciona para Col 1 com alerta de "Necessita Atualização".
        // ══════════════════════════════════════════════════════════════════════
        const buildClanGroups = (members, clanColor, mode = 'tios') => {
            const norm = (s) => (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

            // Classificadores de papel
            const isTioRole    = (p) => /(^tio|^tia)/.test(norm(p).trim()) && !/(avo|segundo)/.test(norm(p));
            const isTioAvoRole = (p) => /tio.?av/.test(norm(p));  // tio-avô/ó
            
            // NOVO: Cabeça de clã depende do modo (Tios ou Irmãos)
            const isClanHead   = (p) => {
                if (mode === 'siblings') return /(irm[aã]o|irm[aã]$|irmao|irma)/i.test(norm(p)) && !/(primo|tio|tia)/i.test(norm(p));
                return isTioRole(p) || isTioAvoRole(p);
            };

            const isPrimo      = (p) => /primo/.test(norm(p));
            const isSobrinho   = (p) => /sobrinho/.test(norm(p));
            // Cônjuge/esposa do clã (não é o cônjuge do representante — é o(a) parceiro(a) do Tio)
            const isTioSpouse  = (p) => /(esposa|marido|companheiro|conjuge)/.test(norm(p));
            // Filho de Tio = Primo (Tios mode) OU Filho de Irmão = Sobrinho (Siblings mode)
            const isTioChild   = (p) => {
                if (mode === 'siblings') return isSobrinho(p) || /(filho|filha)/.test(norm(p));
                return /(filho|filha)/.test(norm(p)) || isPrimo(p);
            };

            // Separa cabeças de clã dos demais
            const clanHeads  = members.filter(m => {
                const p = String(m.member?.papel || m.papel || m.member?.relationshipInfo?.parentesco || m.member?.parentesco || m.key || '').trim();
                if (!isClanHead(p)) return false;
                const vid = m.member?.vinculoFamiliarId || m.member?.linkedToAnchorId;
                if (vid && members.some(other => (other.member?.id || other.member?.docId || other.key) === vid)) {
                    return false;
                }
                return true;
            });

            const clanMasses = members.filter(m => {
                const p = String(m.member?.papel || m.papel || m.member?.relationshipInfo?.parentesco || m.member?.parentesco || m.key || '').trim();
                if (!isClanHead(p)) return true;
                const vid = m.member?.vinculoFamiliarId || m.member?.linkedToAnchorId;
                return !!(vid && members.some(other => (other.member?.id || other.member?.docId || other.key) === vid));
            });

            // Indexa membros pelo seu docId/key para busca rápida
            const memberById = {};
            members.forEach(m => {
                const id = m.member?.docId || m.member?.id || m.key;
                if (id) memberById[id] = m;
            });

            const absorbedKeys = new Set();
            const groups = [];

            clanHeads.sort((a, b) => getBirthYear(a.member) - getBirthYear(b.member));

            clanHeads.forEach(tio => {
                const tioDoc  = tio.member || {};
                const tioId   = tioDoc.docId || tioDoc.id || tio.key;
                const primeiroNome = (tioDoc.nomeCompleto || '').split(' ')[0] || (mode === 'siblings' ? 'Irmão' : 'Tio');
                absorbedKeys.add(tio.key);

                const viacVinculo = clanMasses.filter(m => {
                    const vid = m.member?.vinculoFamiliarId || m.member?.linkedToAnchorId;
                    return vid && (vid === tioId || vid === tio.key);
                });

                const tioChildNamesList = [];
                for (let i = 1; i <= 16; i++) {
                    const fn = tioDoc[`nomeFilho${i}`];
                    if (fn?.trim()) tioChildNamesList.push(fn.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''));
                }
                if (tioDoc.nomeConjuge?.trim()) {
                    tioChildNamesList.push(tioDoc.nomeConjuge.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''));
                }

                const nameMatches = (candidateFull, tioFieldName) => {
                    if (!candidateFull || !tioFieldName || tioFieldName.length < 3) return false;
                    return candidateFull.includes(tioFieldName) || tioFieldName.includes(candidateFull);
                };

                const viaName = clanMasses.filter(m => {
                    if (viacVinculo.find(v => v.key === m.key)) return false; 
                    const baseName = (m.member?.nomeCompleto || '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
                    if (!baseName) return false;
                    return tioChildNamesList.some(tioName => nameMatches(baseName, tioName));
                });

                const nucleusSeenNames = new Set();
                const nucleusMembers = [...viacVinculo, ...viaName].filter(m => {
                    const n = (m.member?.nomeCompleto || '').trim().toLowerCase()
                        .normalize('NFD').replace(/[\u0300-\u036f]/g, '');
                    if (!n || nucleusSeenNames.has(n)) return false;
                    nucleusSeenNames.add(n);
                    return true;
                });
                nucleusMembers.forEach(m => absorbedKeys.add(m.key));

                // ── [LÓGICA DE EQUIVALÊNCIA DE GRAU (FINAL)] ──
                // Sistema determinístico: Se o cargo é IDÊNTICO ao do líder, são o mesmo nível (Cônjuges/Pares).
                const tioCargo = norm(String(tioDoc.papel || tio.papel || tioDoc.relationshipInfo?.parentesco || tioDoc.parentesco || tio.key || ''));

                const tioSpouse = nucleusMembers.filter(m => {
                    const mDoc = m.member || {};
                    const mCargo = norm(String(mDoc.papel || m.papel || mDoc.relationshipInfo?.parentesco || mDoc.parentesco || m.key || ''));

                    // Dados do Formulário (Se o nome do cônjuge bate)
                    const mConjugeNome = norm(mDoc.nomeConjuge || '');
                    const tioNomeCompleto = norm(tioDoc.nomeCompleto || '');
                    const belongsToMarriage = mConjugeNome && tioNomeCompleto && 
                                           (tioNomeCompleto.includes(mConjugeNome) || mConjugeNome.includes(tioNomeCompleto));

                    // REGRA DE OURO: Cargo idêntico OU vínculo de casamento explícito
                    return (mCargo === tioCargo && mCargo !== '') || belongsToMarriage;
                });

                const tioChildren = nucleusMembers.filter(m => !tioSpouse.includes(m));

                tioSpouse.sort((a, b)   => getBirthYear(a.member) - getBirthYear(b.member));
                tioChildren.sort((a, b) => getBirthYear(a.member) - getBirthYear(b.member));

                const orderedNucleus = [tio, ...tioSpouse, ...tioChildren];

                groups.push({
                    isClanGroup:   true,
                    clanLabel:     `Família de ${primeiroNome}`,
                    clanColor,
                    clanLeaderKey: tio.key,
                    clanLeaderId:  tioId,
                    isNucleus:     orderedNucleus.length > 1, 
                    members:       orderedNucleus
                });
            });

            const isAgregado = (r) => {
                const nr = normStr(r);
                return nr.includes('madrasta') || nr.includes('padrasto');
            };

            // ── Passo D: não absorvidos → sub-grupos soltos ───────────────────
            const unlinked = clanMasses.filter(m => !absorbedKeys.has(m.key));

            const primosSoltos    = unlinked.filter(m => {
                const p = String(m.member?.papel || m.papel || m.member?.relationshipInfo?.parentesco || m.member?.parentesco || m.key || '').trim();
                return isPrimo(p);
            });
            const sobrinhosSoltos = unlinked.filter(m => {
                const p = String(m.member?.papel || m.papel || m.member?.relationshipInfo?.parentesco || m.member?.parentesco || m.key || '').trim();
                return isSobrinho(p);
            });
            const agregadosSoltos = unlinked.filter(m => {
                const p = String(m.member?.papel || m.papel || m.member?.relationshipInfo?.parentesco || m.member?.parentesco || m.key || '').trim();
                return isAgregado(p);
            });
            const outrosSoltos    = unlinked.filter(m => {
                const p = String(m.member?.papel || m.papel || m.member?.relationshipInfo?.parentesco || m.member?.parentesco || m.key || '').trim();
                return !isPrimo(p) && !isSobrinho(p) && !isAgregado(p);
            });

            if (primosSoltos.length > 0) {
                primosSoltos.sort((a, b) => getBirthYear(a.member) - getBirthYear(b.member));
                groups.push({ isClanGroup: true, clanLabel: mode === 'siblings' ? 'Sobrinhos sem vínculo' : 'Primos sem vínculo', clanColor, clanLeaderKey: null, isNucleus: false, members: primosSoltos, needsLink: true });
            }
            if (sobrinhosSoltos.length > 0) {
                sobrinhosSoltos.sort((a, b) => getBirthYear(a.member) - getBirthYear(b.member));
                groups.push({ isClanGroup: true, clanLabel: mode === 'siblings' ? 'Sobrinhos sem vínculo' : 'Sobrinhos', clanColor, clanLeaderKey: null, isNucleus: false, members: sobrinhosSoltos, needsLink: mode === 'siblings' });
            }
            if (agregadosSoltos.length > 0) {
                agregadosSoltos.sort((a, b) => getBirthYear(a.member) - getBirthYear(b.member));
                groups.push({ isClanGroup: true, clanLabel: 'Agregados', clanColor, clanLeaderKey: null, isNucleus: false, members: agregadosSoltos, needsLink: false });
            }
            if (outrosSoltos.length > 0) {
                outrosSoltos.sort((a, b) => getBirthYear(a.member) - getBirthYear(b.member));
                groups.push({ isClanGroup: true, clanLabel: 'Outros (sem vínculo)', clanColor, clanLeaderKey: null, isNucleus: false, members: outrosSoltos, needsLink: true });
            }

            return groups;
        };

        // Roles de cônjuge tratados explicitamente nos grupos de união
        const spouseRoles = new Set(['Cônjuge', 'Cônjuge 2', 'Cônjuge 3', 'Cônjuge 4']);

        // ─────────────────────────────────────────────────────────────────────
        // PRÉ-PASSO: Mapa de Lado dos Cabeças de Clã
        // ─────────────────────────────────────────────────────────────────────
        // Varre TODOS os membros uma vez para saber qual Tio está no lado
        // Paterno e qual está no Materno.  O resultado é um mapa:
        //   { [clanHeadDocId]: 'paterno' | 'materno' }
        // Esse mapa é usado abaixo para rotear cônjuges/filhos vinculados.
        // ─────────────────────────────────────────────────────────────────────
        const clanHeadSideMap = {};   // headId → 'paterno' | 'materno'
        const clanHeadRolesMap = {};   // headId → role string

        Object.keys(membersData).forEach(key => {
            const m = normalizedMembersData[key];
            if (!m?.nomeCompleto?.trim()) return;
            const rawP = m?.relationshipInfo?.parentesco || m?.parentesco || '';
            const normP = normStr(rawP);
            const isClanHead = (/(^tio|^tia)/.test(normP.trim()) || /tio.?avo/.test(normP)) &&
                               !/(segundo)/.test(normP);
            if (!isClanHead) return;

            const headId = m?.docId || m?.id || key;
            const side = /\(paterno\)/i.test(rawP) ? 'paterno'
                       : /\(materno\)/i.test(rawP) ? 'materno'
                       : null;
            
            // Se não tem side no string, mas tem vinculoFamiliarId, tenta herdar o side do pai/mãe
            // (Isso ajuda casos legados)
            clanHeadRolesMap[headId] = rawP;
            if (side) clanHeadSideMap[headId] = side;

            // Indexa todos os nomes de dependentes declarados pelo Tio
            const registerName = (name) => {
                const n = normStr(name);
                if (n.length >= 3) clanNameRouteMap[n] = { side, headId };
            };
            if (m.nomeConjuge) registerName(m.nomeConjuge);
            for (let i = 1; i <= 16; i++) {
                if (m[`nomeFilho${i}`]) registerName(m[`nomeFilho${i}`]);
            }
        });

        // Segundo passe para herdar sides de ClanHeads vinculados (ex: Piedade ligada a Jacob)
        Object.keys(clanHeadRolesMap).forEach(headId => {
            if (clanHeadSideMap[headId]) return;
            const m = normalizedMembersData[headId] || Object.values(membersData).find(x => x.id === headId || x.docId === headId);
            const vinculoId = m?.vinculoFamiliarId || m?.linkedToAnchorId;
            if (vinculoId && clanHeadSideMap[vinculoId]) {
                clanHeadSideMap[headId] = clanHeadSideMap[vinculoId];
            }
        });

        // ─────────────────────────────────────────────────────────────────────
        // PASSE 1: Membros reais Não-União
        // ─────────────────────────────────────────────────────────────────────
        const realOtherKeys = Object.keys(membersData)
            .filter(k => !papeisFixosTronco.includes(k) && normalizedMembersData[k]?.nomeCompleto?.trim());

        const unionRelatedKeySet = new Set();
        const tempPaterno  = [];   // membros do lado paterno → buildClanGroups
        const tempMaterno  = [];   // membros do lado materno → buildClanGroups
        const tempSiblings = [];   // irmãos/sobrinhos sem lado → col 1
        const tempFallback = [];   // legado/genérico → col 1 com alerta

        realOtherKeys.forEach(key => {
            const member = normalizedMembersData[key];
            const raw = member?.relationshipInfo?.parentesco || member?.parentesco || '';
            const parentesco = raw.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

            // ── PRIORIDADE 1: Vínculo explícito por ID ──────────────────────
            const vinculoId = member?.vinculoFamiliarId || member?.linkedToAnchorId;
            if (vinculoId && clanHeadSideMap[vinculoId]) {
                const side = clanHeadSideMap[vinculoId];
                if (side === 'paterno') tempPaterno.push({ key, member });
                else                   tempMaterno.push({ key, member });
                const memberId = member.id || key;
                seenIds.add(memberId);
                const name = getBaseName(member.nomeCompleto);
                if (name) seenNames.add(name);
                return;
            }

            // ── PRIORIDADE 2: Vínculo por nome (elastic match) ─────────────
            // Resgata membros como "Piedade Cohen" cujo vinculoFamiliarId ainda
            // não foi gravado, mas o Tio declarou "Piedade" no campo nomeConjuge.
            // Usa partial match bidirecional para tolerar sobrenomes extras.
            const memberNormName = normStr(member?.nomeCompleto || '');
            if (memberNormName.length >= 3) {
                // Procura no mapa pelo nome exato
                let nameRoute = clanNameRouteMap[memberNormName];
                // Se não achou exato, tenta partial match em todos os nomes indexados
                if (!nameRoute) {
                    const matchedKey = Object.keys(clanNameRouteMap).find(mapName =>
                        mapName.length >= 3 &&
                        (memberNormName.includes(mapName) || mapName.includes(memberNormName))
                    );
                    if (matchedKey) nameRoute = clanNameRouteMap[matchedKey];
                }
                if (nameRoute) {
                    const { side } = nameRoute;
                    if (side === 'paterno') tempPaterno.push({ key, member });
                    else                   tempMaterno.push({ key, member });
                    const memberId = member.id || key;
                    seenIds.add(memberId);
                    const name = getBaseName(member.nomeCompleto);
                    if (name) seenNames.add(name);
                    return; // não cai em isUnionRelated
                }
            }

            // ── Filtro padrão (sem vínculo) ──────────────────────────────────
            // Passe 2 trata cônjuges, filhos, netos, genros, enteados
            const isUnionRelated = spouseRoles.has(key) ||
                /(filho|neto|bisneto|trineto|conjuge|esposa|marido|companheiro|genro|nora|enteado)/i.test(parentesco);

            if (isUnionRelated) {
                unionRelatedKeySet.add(key);
                return;
            }

            const memberId = member.id || key;
            if (seenIds.has(memberId)) return;
            seenIds.add(memberId);
            const name = getBaseName(member.nomeCompleto);
            if (name) seenNames.add(name);

            // ─── Regras de roteamento definitivas ────────────────────────────
            const isPaterno  = /\(paterno\)/i.test(raw);
            const isMadrasta = /^madrasta$/i.test(raw.trim());
            const isMaterno  = /\(materno\)/i.test(raw);
            const isPadrasto = /^padrasto$/i.test(raw.trim());
            const isSibling  = /(irm[aã]o|irm[aã]$|irmao|irma)/i.test(parentesco) && !/(primo|tio|tia)/i.test(parentesco);
            const isSobrinho = /sobrinho/i.test(parentesco) && !isPaterno && !isMaterno;

            // BUGFIX DAVID: Se o membro não tem parentesco definido (legado) MAS está vinculado a um Tio, 
            // ele não deve mais gerar bloco amarelo. Ele herda o lado do Tio.
            if (vinculoId && clanHeadSideMap[vinculoId]) {
                 const side = clanHeadSideMap[vinculoId];
                 if (side === 'paterno') tempPaterno.push({ key, member });
                 else                   tempMaterno.push({ key, member });
                 return;
            }

            if (isSibling || isSobrinho) {
                tempSiblings.push({ key, member });
            } else if (isPaterno || isMadrasta) {
                tempPaterno.push({ key, member });
            } else if (isMaterno || isPadrasto) {
                tempMaterno.push({ key, member });
            } else {
                // ⚠️ Captura Geral: parentesco genérico / legado.  Aparece na Col 1 com alerta.
                // Se chegamos aqui, o membro realmente não tem lado nem vínculo.
                tempFallback.push({ key, member, needsReview: true });
            }
        });

        // Col 1: irmãos/sobrinhos clãs + fallback no final
        const siblingClans = buildClanGroups(tempSiblings, 'gray', 'siblings');
        tempFallback.sort((a, b) => getBirthYear(a.member) - getBirthYear(b.member));
        data.colAncestorIrmaos.push(...siblingClans, ...tempFallback);

        // Cols 2 e 3: clãs por lado
        data.colFamiliaPaterna.push(...buildClanGroups(tempPaterno, 'indigo'));
        data.colFamiliaMaterna.push(...buildClanGroups(tempMaterno, 'teal'));


        // ─────────────────────────────────────────────────────────────────────
        // PASSE 2: Grupos de União — cada casamento = 1 bloco com header,
        // cônjuge e filhos ordenados por data de nascimento.
        // ─────────────────────────────────────────────────────────────────────
        const MARRIAGE_LEVELS = [
            { suffix: '',   role: 'Cônjuge',   nameField: 'nomeConjuge',  dateField: 'dataCasamento'  },
            { suffix: '_2', role: 'Cônjuge 2', nameField: 'spouseName_2', dateField: 'marriageDate_2' },
            { suffix: '_3', role: 'Cônjuge 3', nameField: 'spouseName_3', dateField: 'marriageDate_3' },
            { suffix: '_4', role: 'Cônjuge 4', nameField: 'spouseName_4', dateField: 'marriageDate_4' },
        ];

        let globalChildIdx = 0;

        MARRIAGE_LEVELS.forEach(m => {
            const isActive =
                normalizedMembersData[m.role] ||
                (m.role === 'Cônjuge' && ['Casado', 'Divorciado', 'Viúvo', 'União Estável'].includes(repData.situacaoConjugal)) ||
                repData[`remarried_${m.suffix.replace('_', '')}`];

            if (!isActive) return;

            // Cônjuge: real (Firestore) ou virtual (campo do rep)
            const realSpouse  = normalizedMembersData[m.role];
            const spouseName  = realSpouse?.nomeCompleto || repData[m.nameField] || '';
            const spouseMember = realSpouse
                ? { ...realSpouse, _forceType: 'conjuge', _parentMarriage: m.role }
                : { nomeCompleto: spouseName, dataCasamento: repData[m.dateField] || '', _forceType: 'conjuge', _parentMarriage: m.role };

            if (realSpouse) {
                seenIds.add(realSpouse.id || m.role);
                const sn = getBaseName(realSpouse.nomeCompleto);
                if (sn) seenNames.add(sn);
            } else if (spouseName) {
                seenNames.add(getBaseName(spouseName));
            }

            // Coleta nomes dos filhos desta união declarados nos campos do representante
            const marriageChildNames = [];
            const childrenText = repData[`children${m.suffix}`] || '';
            if (childrenText) marriageChildNames.push(...childrenText.split(',').map(c => c.trim()).filter(Boolean));
            for (let i = 1; i <= 16; i++) {
                const n = repData[`nomeFilho${i}${m.suffix}`];
                if (n) marriageChildNames.push(n.trim());
            }

            const groupChildren = [];
            const childNamesInGroup = new Set();

            [...new Set(marriageChildNames)].forEach(childName => {
                const cBase = getBaseName(childName);
                if (!cBase || childNamesInGroup.has(cBase)) return;

                // Tenta encontrar membro real com esse nome
                const realChildKey = [...unionRelatedKeySet].find(k => {
                    const cm = normalizedMembersData[k];
                    return cm && getBaseName(cm.nomeCompleto) === cBase && !seenIds.has(cm.id || k);
                });

                if (realChildKey) {
                    const cm = normalizedMembersData[realChildKey];
                    seenIds.add(cm.id || realChildKey);
                    seenNames.add(cBase);
                    childNamesInGroup.add(cBase);
                    groupChildren.push({ key: realChildKey, member: cm });
                } else if (!seenNames.has(cBase)) {
                    seenNames.add(cBase);
                    childNamesInGroup.add(cBase);
                    groupChildren.push({
                        key: `__filho_${globalChildIdx}`,
                        member: {
                            nomeCompleto: childName,
                            _forceType: 'filho_individual',
                            _parentMarriage: m.role,
                            _childName: childName,
                            parentesco: spouseName ? `Filho(a) de ${spouseName}` : 'Filho(a)'
                        }
                    });
                }
                globalChildIdx++;
            });

            // Ordena filhos por data de nascimento ascendente (mais velho primeiro)
            groupChildren.sort((a, b) => getBirthYear(a.member) - getBirthYear(b.member));

            data.colConjugeFilhos.push({
                isUnionGroup: true,
                spouseKey: m.role,
                spouseName,
                spouseMember: (spouseName || realSpouse) ? spouseMember : null,
                children: groupChildren
            });
        });

        // ─────────────────────────────────────────────────────────────────────
        // PASSE 3: Filhos órfãos — membros de união que não foram absorvidos
        // por nenhum grupo (ex: filhos cadastrados sem nome nos campos do rep)
        // ─────────────────────────────────────────────────────────────────────
        const orphans = [];
        unionRelatedKeySet.forEach(key => {
            const member = normalizedMembersData[key];
            if (!member) return;
            const memberId = member.id || key;
            if (seenIds.has(memberId)) return;
            seenIds.add(memberId);
            const name = getBaseName(member.nomeCompleto);
            if (name) seenNames.add(name);
            orphans.push({ key, member });
        });

        if (orphans.length > 0) {
            orphans.sort((a, b) => getBirthYear(a.member) - getBirthYear(b.member));
            data.colConjugeFilhos.push({
                isUnionGroup: true,
                spouseKey: null,
                spouseName: null,
                spouseMember: null,
                children: orphans
            });
        }

        return data;
    };

    // Renderizador Meticuloso de Cards Categorizados
    const renderCategorizedMember = (roleKey, member) => {
        // Detectar se é Bisavô para herdar perfeitamente o visual da camada SVG 4
        const pNormalized = (member?.parentesco || (roleKey || '').replace(/_\d+$/, '')).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        const isBisavo = /(bisavo)/i.test(pNormalized);

        // Usa o forceType para pegar a cor correta (ex: cônjuges e filhos em oliva)
        const type = isBisavo ? 'bisavo' : (member._forceType || 'outro_membro');
        const level = isBisavo ? 4 : 1;
        const isExpanded = expandedRole === roleKey;

        // Objeto mock para o getButtonStyle (precisamos passar algumas props que ele espera)
        const mockBtn = { role: roleKey, type, level, size: 'mini', parentMarriage: member._parentMarriage };
        const btnStyles = getButtonStyle(mockBtn);


        // Safely extract names and labels
        const rawName = member?.nomeCompleto || member?._childName || '';
        const fullName = rawName.trim();
        const nameParts = fullName.split(/\s+/);
        const firstName = nameParts[0] || '';
        const lastName = nameParts.slice(1).join(' ') || '';

        // Safe extraction of years
        const birthYear = member?.dataNascimento ? (member.dataNascimento.match(/\d{4}/)?.[0] || '') : '';
        const deathYear = member?.dataFalecimento ? (member.dataFalecimento.match(/\d{4}/)?.[0] || '') : '';
        const marriageDate = member?.dataCasamento ? (member.dataCasamento.match(/\d{4}/)?.[0] || '') : '';

        // Card label: exibe o parentesco armazenado. Nunca exibe 'roleKey' bruto como label.
        const parentescoLabel = (roleKey || '') === 'Eu mesmo'
            ? 'Representante'
            : (member?.relationshipInfo?.parentesco || member?.parentesco || roleKey || '');

        const tags = attentionNeeded[roleKey] || {};
        const isD = tags.isD;
        const isH = tags.isH;
        const needsAttention = isD || isH;

        const progressPct = calculateProgress(member);
        const is3x4 = roleKey === 'Representante' || roleKey === 'Pai' || roleKey === 'Mãe';

        return (
            <button
                key={roleKey}
                onClick={(e) => {
                    e.stopPropagation();
                    if (isExpanded) {
                        onNext?.();
                    } else {
                        setExpandedRole(roleKey);
                        onChange({
                            papel: roleKey,
                            nome: fullName || '',
                            parentesco: parentescoLabel
                        });
                    }
                }}
                className={`${btnStyles.className} w-full aspect-[0.65] md:aspect-[1.3] cursor-pointer relative pointer-events-auto mb-1 transition-transform hover:scale-[1.02] overflow-hidden break-words`}
                style={{ padding: '0', ...btnStyles.style }}
            >
                {needsAttention && (
                    <div className="absolute top-1 right-1 z-[20] flex flex-col items-center justify-center pointer-events-none gap-0.5">
                        {isD && (
                            <div className="relative">
                                <AlertTriangle className="w-4 h-4 md:w-5 md:h-5 text-amber-400 fill-amber-400" />
                                <span className="absolute inset-0 flex items-center justify-center text-[8px] md:text-[10px] font-black text-white mb-0.5">D</span>
                            </div>
                        )}
                        {isH && (
                            <div className="relative">
                                <AlertTriangle className="w-4 h-4 md:w-5 md:h-5 text-blue-500 fill-blue-500" />
                                <span className="absolute inset-0 flex items-center justify-center text-[8px] md:text-[10px] font-black text-white mb-0.5">H</span>
                            </div>
                        )}
                    </div>
                )}
                <div
                    style={{
                        gridTemplateColumns: 'repeat(16, 1fr)',
                        gridTemplateRows: 'repeat(13, 1fr)',
                        lineHeight: '1.2'
                    }}
                    className="w-full h-full grid px-1 text-[8px] md:text-[11px]"
                >
                    <div className="col-start-1 col-span-16 row-start-1 flex items-center justify-center md:justify-start">
                        <span className="uppercase font-black tracking-tighter text-black/25 truncate text-[5px] md:text-[8px]">
                            {parentescoLabel}
                        </span>
                    </div>

                    <div className="row-start-2 row-span-4 col-start-5 col-span-8 md:row-start-2 md:row-span-11 md:col-start-1 md:col-span-6 flex items-center justify-center md:justify-start py-0.5">
                        <div className={`h-full ${is3x4 ? 'aspect-[3/4] w-auto' : 'w-full max-w-[90%]'} bg-slate-50/50 rounded-sm md:border md:border-slate-300 overflow-hidden flex items-center justify-center`}>
                            {(() => {
                                const photoObj = member?.fotoIdentificacao?.[0];
                                const photoUrl = (photoObj?.url || photoObj?.preview || member?.photoMain || '').trim();
                                
                                if (photoUrl) {
                                    return <img 
                                        src={photoUrl} 
                                        className="w-full h-full object-cover" 
                                        alt="" 
                                        loading="lazy"
                                        onError={(e) => {
                                            // Fallback default icon
                                            e.target.style.display = 'none';
                                            e.target.parentElement.innerHTML = '<div class="flex items-center justify-center w-full h-full"><svg class="text-slate-300 w-3 h-3 md:w-5 md:h-5" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M22 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg></div>';
                                        }}
                                    />;
                                }
                                return <Users className="text-slate-300 w-3 h-3 md:w-5 md:h-5" />;
                            })()}
                        </div>
                    </div>

                    {/* FLEX TEXT WRAPPER */}
                    <div className="col-start-1 col-span-16 row-start-6 row-span-8 md:col-start-7 md:col-span-10 md:row-start-2 md:row-span-11 flex flex-col items-center md:items-end justify-start md:justify-center gap-0.5 md:gap-[4px] px-0.5 md:pr-1 pt-[1px] md:pt-0 pb-[1px] overflow-hidden">
                        
                        {/* firstName */}
                        <div className="w-full text-center md:text-right font-black text-slate-900 text-[10px] md:text-[14px] leading-none truncate">
                            {firstName}
                        </div>
                        
                        {/* lastName */}
                        <div className="w-full text-center md:text-right font-bold text-slate-700 text-[8px] md:text-[11px] leading-[1.0] line-clamp-2 min-h-[2em] text-wrap break-words -mt-[1px] md:mt-0">
                            {lastName}
                        </div>

                        {/* dates */}
                        <div className="w-full flex flex-col items-center md:items-end gap-[1px] md:gap-[2px] mt-[1px] md:mt-1">
                            {birthYear && (
                                <div className="flex items-center justify-center md:justify-end gap-1 text-[7px] md:text-[10px] font-bold text-slate-500 whitespace-nowrap">
                                    {birthYear} <img src="/nascimento.png" className="w-[8px] h-[8px] md:w-[16px] md:h-[16px] opacity-70" alt="*" />
                                </div>
                            )}
                            {deathYear && (
                                <div className="flex items-center justify-center md:justify-end gap-1 text-[7px] md:text-[10px] font-bold text-slate-500 whitespace-nowrap">
                                    {deathYear} <img src="/falecimento.png" className="w-[8px] h-[8px] md:w-[16px] md:h-[16px] opacity-70" alt="+" />
                                </div>
                            )}
                        </div>

                        {/* marriage */}
                        {type === 'conjuge' && (
                            <div className="w-full flex items-center justify-center md:justify-end gap-1 leading-none mt-0.5">
                                <span className="text-[6.5px] md:text-[8px] font-black text-rose-700 uppercase tracking-tighter">CASAMENTO</span>
                                <span className="text-[7px] md:text-[11px] font-bold text-rose-700/90 tracking-tighter">{marriageDate || '----'}</span>
                            </div>
                        )}
                    </div>
                </div>

                {!isExpanded && (
                    <div className="absolute bottom-1 left-1 right-1 h-[2.5px] rounded-full bg-black/10 overflow-hidden">
                        <div className="h-full bg-emerald-600 rounded-full transition-all duration-500" style={{ width: `${progressPct}%` }} />
                    </div>
                )}
            </button>
        );
    };

    const categories = categorizeMembers();

    // [FASE 4] Lógica da Moldura do Casal
    const canWrap = ENABLE_COUPLE_WRAPPER && hasSingleUnion(membersData);
    const repBtn = useMemo(() => familyButtons.find(b => b.role === 'Eu mesmo'), [familyButtons]);
    const spouseBtn = useMemo(() => familyButtons.find(b => b.role === 'Cônjuge'), [familyButtons]);

    // Helper de renderização de cards da camada SVG
    const renderTreeCard = (btn, customStyles = {}) => {
        if (!btn) return null;
        const isExpanded = expandedRole === btn.role;
        const btnStyles = getButtonStyle(btn);

        const mData = normalizedMembersData[btn.role] || {};
        const tags = attentionNeeded[btn.role] || {};
        const isD = tags.isD;
        const isH = tags.isH;
        const needsAttention = isD || isH;

        const repData = normalizedMembersData['Eu mesmo'] || {};
        let firstName = '';
        let lastName = '';
        let birthYear = '';
        let deathYear = '';
        let marriageDate = '';

        let fullName = btn.nome || '';

        if (btn.type === 'conjuge') {
            const role = btn.role;
            const spouseData = normalizedMembersData[role] || {};
            let mDate = '';

            if (!fullName) {
                if (role === 'Cônjuge') { fullName = spouseData.nomeCompleto || spouseData.fullName || repData.nomeConjuge || ''; mDate = repData.dataCasamento || ''; }
                else if (role === 'Cônjuge 2') { fullName = spouseData.nomeCompleto || spouseData.fullName || repData.spouseName_2 || ''; mDate = repData.marriageDate_2 || ''; }
                else if (role === 'Cônjuge 3') { fullName = spouseData.nomeCompleto || spouseData.fullName || repData.spouseName_3 || ''; mDate = repData.marriageDate_3 || ''; }
                else if (role === 'Cônjuge 4') { fullName = spouseData.nomeCompleto || spouseData.fullName || repData.spouseName_4 || ''; mDate = repData.marriageDate_4 || ''; }
            }

            const nameParts = fullName.trim().split(/\s+/);
            firstName = nameParts[0] || '';
            lastName = nameParts.slice(1).join(' ') || '';
            const bVal = (spouseData.dataNascimento || '');
            birthYear = (bVal === '[NÃO SEI]' || bVal.startsWith('ID_DESCONHECIDO_')) ? 'Ignorada' : (bVal.match(/\d{4}/)?.[0] || '');

            const dVal = (spouseData.dataFalecimento || spouseData.deathDate || '');
            deathYear = (dVal === '[NÃO SEI]' || dVal.startsWith('ID_DESCONHECIDO_')) ? 'Ignorada' : (dVal.match(/\d{4}/)?.[0] || '');
            marriageDate = mDate || spouseData.dataCasamento || '';
        } else {
            if (!fullName) {
                const m = normalizedMembersData[btn.role] || {};
                fullName = m.nomeCompleto || m.fullName || btn.childName || '';

                if (!fullName) {
                    if (btn.role === 'Pai') fullName = repData.nomePai || repData.fatherName || '';
                    if (btn.role === 'Mãe') fullName = repData.nomeMae || repData.motherName || '';
                }
            }

            const nameParts = fullName.trim().split(/\s+/);
            firstName = nameParts[0] || '';
            lastName = nameParts.slice(1).join(' ') || '';
            const bVal = (normalizedMembersData[btn.role]?.dataNascimento || normalizedMembersData[btn.role]?.birthDate || '');
            birthYear = (bVal === '[NÃO SEI]' || bVal.startsWith('ID_DESCONHECIDO_')) ? 'Ignorada' : (bVal.match(/\d{4}/)?.[0] || '');

            const dVal = (normalizedMembersData[btn.role]?.dataFalecimento || normalizedMembersData[btn.role]?.deathDate || '');
            deathYear = (dVal === '[NÃO SEI]' || dVal.startsWith('ID_DESCONHECIDO_')) ? 'Ignorada' : (dVal.match(/\d{4}/)?.[0] || '');
        }

        const progressPct = calculateProgress(normalizedMembersData[btn.role]);
        const is3x4 = btn.type === 'representante' || btn.role === 'Pai' || btn.role === 'Mãe';

        const positionStyles = customStyles.relative ? {
            width: `${btn.w}%`, height: `${btn.h}%`, position: 'relative'
        } : {
            left: `${btn.x}%`, top: `${btn.y}%`, width: `${btn.w}%`, height: `${btn.h}%`, position: 'absolute'
        };

        return (
            <div
                role="button"
                tabIndex={0}
                key={`grid-${btn.role}`}
                onClick={(e) => {
                    e.stopPropagation();
                    if (btn.type === 'outro_parente') {
                        // Cadastro genérico direto
                        const newUUID = generateCollateralId();
                        onChange({ papel: 'Membro da Família', parentesco: 'Outro', nome: '', _newDocId: newUUID });
                        onNext(newUUID);
                        return;
                    }
                    if (isExpanded) {
                        onNext?.();
                    } else {
                        setExpandedRole(btn.role);
                        let nome = normalizedMembersData[btn.role]?.nomeCompleto || '';
                        let parentesco = normalizedMembersData[btn.role]?.parentesco || '';

                        if (!nome || !parentesco) {
                            if (btn.type === 'filho_individual') {
                                nome = btn.childName;
                                let pName = '';
                                if (btn.parentMarriage === 'Cônjuge') pName = repData.nomeConjuge;
                                else if (btn.parentMarriage === 'Cônjuge 2') pName = repData.spouseName_2;
                                else if (btn.parentMarriage === 'Cônjuge 3') pName = repData.spouseName_3;
                                else if (btn.parentMarriage === 'Cônjuge 4') pName = repData.spouseName_4;
                                pName = pName || btn.parentMarriage || '';
                                parentesco = pName ? `Filho(a) de ${pName}` : 'Filho(a)';
                            } else if (btn.type === 'mae' && btn.role === 'Mãe') {
                                nome = repData.nomeMae || ''; parentesco = 'Mãe';
                            } else if (btn.type === 'conjuge') {
                                if (btn.role === 'Cônjuge') nome = repData.nomeConjuge;
                                else if (btn.role === 'Cônjuge 2') nome = repData.spouseName_2;
                                else if (btn.role === 'Cônjuge 3') nome = repData.spouseName_3;
                                else if (btn.role === 'Cônjuge 4') nome = repData.spouseName_4;
                                parentesco = 'Cônjuge';
                            }
                        }

                        onChange({ papel: btn.role, nome: nome || normalizedMembersData[btn.role]?.nomeCompleto || '', parentesco: parentesco || normalizedMembersData[btn.role]?.parentesco || '' });
                    }
                }}
                className={`${btnStyles.className} overflow-hidden cursor-pointer ${customStyles.className || ''}`}
                style={{
                    ...positionStyles,
                    zIndex: isExpanded ? 100 : 10,
                    padding: '0',
                    ...btnStyles.style
                }}
            >
                {needsAttention && (
                    <div className="absolute top-1 right-1 z-[20] flex flex-col items-center justify-center pointer-events-none gap-0.5">
                        {isD && (
                            <div className="relative">
                                <AlertTriangle className="w-4 h-4 md:w-5 md:h-5 text-amber-400 fill-amber-400" />
                                <span className="absolute inset-0 flex items-center justify-center text-[8px] md:text-[10px] font-black text-white mb-0.5">D</span>
                            </div>
                        )}
                        {isH && (
                            <div className="relative">
                                <AlertTriangle className="w-4 h-4 md:w-5 md:h-5 text-blue-500 fill-blue-500" />
                                <span className="absolute inset-0 flex items-center justify-center text-[8px] md:text-[10px] font-black text-white mb-0.5">H</span>
                            </div>
                        )}
                    </div>
                )}
                <div
                    style={{
                        gridTemplateColumns: 'repeat(16, 1fr)',
                        gridTemplateRows: btn.isQuarterHeight ? 'repeat(4, 1fr)' : (btn.isHalfHeight ? 'repeat(6, 1fr)' : 'repeat(13, 1fr)'),
                        lineHeight: '1.2'
                    }}
                    className="w-full h-full grid px-1 text-[8px] md:text-[11px]"
                >
                    <div className="col-start-1 col-span-16 row-start-1 flex items-center justify-center md:justify-start">
                        <span className="uppercase font-black tracking-tighter text-black/25 truncate text-[5px] md:text-[8px]">
                            {btn.label}
                        </span>
                    </div>

                    {!btn.isHalfHeight && !btn.isQuarterHeight && btn.type !== 'filhos' && btn.type !== 'outro_parente' && (
                        <>
                            <div className="row-start-2 row-span-4 col-start-5 col-span-8 md:row-start-2 md:row-span-11 md:col-start-1 md:col-span-6 flex items-center justify-center md:justify-start py-0.5">
                                <div className={`h-full ${is3x4 ? 'aspect-[3/4] w-auto' : 'w-full max-w-[90%]'} bg-slate-50/50 rounded-sm border border-slate-300 overflow-hidden flex items-center justify-center`}>
                                    {(() => {
                                        const mData = normalizedMembersData[btn.role] || {};
                                        const photoObj = mData.fotoIdentificacao?.[0];
                                        const photoUrl = (photoObj?.url || photoObj?.preview || mData.photoMain || '').trim();
                                        
                                        if (photoUrl) {
                                            return <img 
                                                src={photoUrl} 
                                                className="w-full h-full object-cover" 
                                                alt=""
                                                loading="lazy"
                                                onError={(e) => {
                                                    e.target.style.display = 'none';
                                                    e.target.parentElement.innerHTML = '<div class="flex items-center justify-center w-full h-full"><svg class="text-slate-300 w-3 h-3 md:w-5 md:h-5" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M22 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg></div>';
                                                }}
                                            />;
                                        }
                                        return <Users className="text-slate-300 w-3 h-3 md:w-5 md:h-5" />;
                                    })()}
                                </div>
                            </div>
                            <div className="col-start-1 col-span-16 row-start-6 row-span-8 md:col-start-7 md:col-span-10 md:row-start-2 md:row-span-11 flex flex-col items-center md:items-end justify-start md:justify-center gap-0.5 md:gap-[4px] px-0.5 md:pr-1 pt-[1px] md:pt-0 pb-[1px] overflow-hidden">
                                <div className="w-full text-center md:text-right font-black text-slate-900 text-[10px] md:text-[14px] leading-none truncate">
                                    {firstName}
                                </div>
                                <div className="w-full text-center md:text-right font-bold text-slate-700 text-[8px] md:text-[11px] leading-[1.0] line-clamp-2 min-h-[2em] text-wrap break-words -mt-[1px] md:mt-0">
                                    {lastName}
                                </div>
                                <div className="w-full flex flex-col items-center md:items-end gap-[1px] md:gap-[2px] mt-[1px] md:mt-1">
                                    {birthYear && (
                                        <div className="flex items-center justify-center md:justify-end gap-1 text-[7px] md:text-[10px] font-bold text-slate-500 whitespace-nowrap">
                                            {birthYear} <img src="/nascimento.png" className="w-[8px] h-[8px] md:w-[16px] md:h-[16px] opacity-70" alt="*" />
                                        </div>
                                    )}
                                    {deathYear && btn.type !== 'representante' && (
                                        <div className="flex items-center justify-center md:justify-end gap-1 text-[7px] md:text-[10px] font-bold text-slate-500 whitespace-nowrap">
                                            {deathYear} <img src="/falecimento.png" className="w-[8px] h-[8px] md:w-[16px] md:h-[16px] opacity-70" alt="+" />
                                        </div>
                                    )}
                                </div>
                                {btn.type === 'conjuge' && (
                                    <div className="w-full flex items-center justify-center md:justify-end gap-1 leading-none mt-0.5">
                                        <span className="text-[5px] md:text-[8px] font-black text-rose-600/60 uppercase tracking-tighter">Casamento</span>
                                        <span className="text-[7px] md:text-[11px] font-bold text-rose-700/90 tracking-tighter">{marriageDate || '----'}</span>
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                    {btn.type === 'outro_parente' && (
                        <div className="col-start-1 col-span-16 row-start-2 row-span-9 flex flex-col items-center justify-center gap-1">
                            <div className="w-7 h-7 md:w-10 md:h-10 rounded-full bg-emerald-50 border border-emerald-300 flex items-center justify-center">
                                <span className="text-emerald-500 text-[16px] md:text-[22px] font-black leading-none">+</span>
                            </div>
                            <span className="text-[6px] md:text-[10px] font-black text-emerald-600 uppercase tracking-tight text-center leading-[1.1]">
                                Adicionar<br />Parente
                            </span>
                        </div>
                    )}
                </div>
                {!isExpanded && !btn.isHalfHeight && normalizedMembersData[btn.role] && btn.type !== 'outro_parente' && (
                    <div className="absolute bottom-1 left-1 right-1 h-[2.5px] rounded-full bg-black/10 overflow-hidden">
                        <div className="h-full bg-emerald-600 rounded-full transition-all duration-500" style={{ width: `${progressPct}%` }} />
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="w-full flex flex-col font-primary select-none items-center">
            {/* Banner de Notificações / Caixa de Comunicação */}
            {systemNotifications.length > 0 && (
                <div className="w-full max-w-4xl mx-auto px-2 mt-2 z-50 relative pointer-events-auto">
                    {systemNotifications.map(note => (
                        <div
                            key={note.id}
                            className={`flex items-start justify-between p-3 mb-2 rounded-lg border-l-4 shadow-sm text-xs md:text-sm font-medium ${note.type === 'warning' ? 'bg-amber-50 border-amber-500 text-amber-800' : 'bg-blue-50 border-blue-500 text-blue-800'
                                }`}
                        >
                            <div className="flex items-center gap-2">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                </svg>
                                <span>{note.text}</span>
                                {note.action && (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            note.action.handler();
                                            if (note.action.autoDismiss !== false) {
                                                setSystemNotifications(prev => prev.filter(n => n.id !== note.id));
                                            }
                                        }}
                                        className="ml-3 px-3 py-1 bg-white/20 hover:bg-white/40 rounded border border-current transition-colors font-black uppercase tracking-widest text-[10px]"
                                    >
                                        {note.action.label}
                                    </button>
                                )}
                            </div>
                            <button
                                onClick={() => setSystemNotifications(prev => prev.filter(n => n.id !== note.id))}
                                className="ml-4 opacity-50 hover:opacity-100 transition-opacity"
                            >
                                ✕
                            </button>
                        </div>
                    ))}
                </div>
            )}
            <div
                className="relative w-full overflow-y-auto"
                style={{
                    height: '1000px',
                    backgroundImage: "url('/fundo%20para%20a%20family%20tree.jpg')",
                    backgroundRepeat: 'repeat',
                    backgroundSize: 'auto',
                }}
            >
                <div
                    className="relative left-0 right-0 w-full h-[1700px] transition-transform duration-500"
                    ref={containerRef}
                    onClick={() => setExpandedRole(null)}
                >
                    <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox={`0 0 ${GRID_COLS} ${GRID_ROWS}`} preserveAspectRatio="none">
                        {renderConnections()}
                        {/* Chamada para as conexões restauradas */}
                        {renderChildrenConnections()}
                        {renderCollateralConnections()}
                    </svg>

                    {/* [FASE 4] Moldura do Casal renderizada se houver união única */}
                    {canWrap && repBtn && spouseBtn && (
                        <div 
                            className="absolute z-20 bg-slate-100/50 border-2 border-white/80 rounded-[2.5rem] flex flex-row flex-wrap justify-center items-center gap-4 md:gap-8 shadow-xl shadow-slate-200/50 backdrop-blur-[4px] border-slate-200 transition-all duration-700"
                            style={{
                                left: `${Math.min(repBtn.x, spouseBtn.x) - 2.5}%`,
                                top: `${repBtn.y - 2}%`,
                                width: `${(Math.max(repBtn.x + repBtn.w, spouseBtn.x + spouseBtn.w) - Math.min(repBtn.x, spouseBtn.x)) + 5}%`,
                                height: `${repBtn.h + 4}%`,
                            }}
                        >
                            {renderTreeCard(repBtn, { relative: true, className: '!static shadow-none border-0 !bg-transparent' })}
                            
                            {/* Ícone de União (Coração ou Alianças) */}
                            <div className="flex items-center justify-center p-2 rounded-full bg-white/80 border border-rose-100 shadow-sm animate-pulse-slow">
                                <div className="text-rose-500 text-sm md:text-xl">❤️</div>
                            </div>

                            {renderTreeCard(spouseBtn, { relative: true, className: '!static shadow-none border-0 !bg-transparent' })}
                        </div>
                    )}

                    {familyButtons.map((btn) => {
                        // Skip rendering SVG grid buttons for members that belong to the new columns
                        if (!btn.isHalfHeight && !btn.isQuarterHeight && btn.level !== 2 && btn.level !== 3 && btn.level !== 4 && btn.role !== 'Eu mesmo') {
                            return null;
                        }

                        // [FASE 4] Se for união única, não renderizamos individualmente o representante e o cônjuge 1
                        if (canWrap && (btn.role === 'Eu mesmo' || btn.role === 'Cônjuge')) {
                            return null;
                        }

                        return renderTreeCard(btn);
                    })}


                    {/* Ancoragem automática agora é feita em tempo real pelo motor gráfico */}

                    {/* =============================== */}
                    {/* NOVO PAINEL DE COLUNAS          */}
                    {/* =============================== */}
                    <div className="absolute left-0 right-0 w-full pointer-events-auto flex flex-col items-center pb-20 px-0.5 md:px-2 lg:px-4" style={{ top: '48%' }}>

                        {/* Cabeçalhos das Colunas para Adição Direta */}

                        <div className="grid grid-cols-4 gap-2 md:gap-x-10 lg:gap-x-16 w-full max-w-full md:max-w-[98%] lg:max-w-[1400px] mx-auto">
                            
                            {[
                                { title: "Irmãos & Sobrinhos", list: categories.colAncestorIrmaos },
                                { title: "Família Paterna",    list: categories.colFamiliaPaterna },
                                { title: "Família Materna",    list: categories.colFamiliaMaterna },
                                { title: "Uniões & Filhos",    list: categories.colConjugeFilhos  }
                            ].map((group, idx) => (
                                <div key={idx} className="flex flex-col items-center w-full min-w-0">
                                    {/* Cabeçalho — retângulo único e clicável */}
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            const normalizeT = (s) => (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
                                            const gt = normalizeT(group.title);

                                            // Abre o modal na etapa correta conforme a coluna clicada
                                            if (gt === 'familia paterna') {
                                                setSelectedCategory({
                                                    label: 'Família Paterna',
                                                    options: [
                                                        'Tio/a (Paterno)', 'Tio-Avô (Paterno)',
                                                        'Primo/a (Paterno)', 'Primo (2º grau, Paterno)',
                                                        'Primo (3º grau, Paterno)', 'Sobrinho/a (Paterno)',
                                                        'Cônjuge do Tio (Paterno)', 'Sobrinho-neto(a) (Paterno)'
                                                    ]
                                                });
                                                setOutroModalStep(2);
                                            } else if (gt === 'familia materna') {
                                                setSelectedCategory({
                                                    label: 'Família Materna',
                                                    options: [
                                                        'Tio/a (Materno)', 'Tio-Avô (Materno)',
                                                        'Primo/a (Materno)', 'Primo (2º grau, Materno)',
                                                        'Primo (3º grau, Materno)', 'Sobrinho/a (Materno)',
                                                        'Cônjuge do Tio (Materno)', 'Sobrinho-neto(a) (Materno)'
                                                    ]
                                                });
                                                setOutroModalStep(2);
                                            } else if (gt.includes('irmaos') || gt.includes('irmaos e sobrinhos') || gt.includes('irmaos &')) {
                                                // Irmãos & Sobrinhos → direto na Etapa 2 com opções específicas
                                                setSelectedCategory({
                                                    label: 'Irmãos & Sobrinhos',
                                                    options: [
                                                        { label: 'Irmão',            valor: 'Irmao'           },
                                                        { label: 'Irmã',             valor: 'Irma'            },
                                                        { label: 'Cônjuge do Irmão', valor: 'Conjuge do Irmao'},
                                                        { label: 'Sobrinho/a',       valor: 'Sobrinho'        }
                                                    ]
                                                });
                                                setOutroModalStep(2);
                                            } else if (gt.includes('unio') || gt.includes('filhos')) {
                                                // Uniões & Filhos → direto na Etapa 2 com opções específicas
                                                setSelectedCategory({
                                                    label: 'Uniões & Filhos',
                                                    options: [
                                                        { label: 'Filho/a',   valor: 'Filho/a'  },
                                                        { label: 'Neto/a',    valor: 'Neto/a'   },
                                                        { label: 'Enteado/a', valor: 'Enteado/a'},
                                                        { label: 'Genro',     valor: 'Genro'    },
                                                        { label: 'Nora',      valor: 'Nora'     },
                                                        { label: 'Cônjuge',   valor: 'Conjuge'  }
                                                    ]
                                                });
                                                setOutroModalStep(2);
                                            } else {
                                                // fallback: etapa 1 geral
                                                setSelectedCategory(null);
                                                setOutroModalStep(1);
                                            }
                                            setPendingClanAnchorId(null);
                                            setShowOutroModal(true);
                                        }}
                                        className="w-full flex justify-center items-center gap-1.5 mb-1 md:mb-4 border border-slate-200 rounded-lg py-1.5 px-2 bg-white/70 hover:bg-slate-50 hover:border-history-green/40 hover:shadow-sm transition-all active:scale-[0.98] group pointer-events-auto"
                                    >
                                        <span className="text-[8px] md:text-[11px] font-black uppercase tracking-[0.05em] md:tracking-[0.15em] text-center leading-tight text-history-green/80">
                                            {group.title}
                                        </span>
                                        <Plus size={11} className="text-slate-400 group-hover:text-history-green transition-colors flex-shrink-0" />
                                    </button>
                                    <div className="w-full flex flex-col gap-2 py-2 min-h-[110px] items-center">
                                        {/* PASSO 3: nota de orientação acima dos fallback (apenas Col 1) */}
                                        {idx === 0 && group.list.some(item => item.needsReview) && (
                                            <div className="w-full mb-1 px-1.5 py-1 bg-amber-50 border border-amber-200 rounded text-[7px] md:text-[8px] text-amber-700 leading-snug">
                                                ⚠️ Membros com parentesco genérico aparecem aqui para que você possa atualizar o posicionamento deles.
                                            </div>
                                        )}
                                        {group.list.length > 0 ? (
                                            group.list.map((item, itemIdx) =>
                                                item.isClanGroup ? (() => {
                                                    // ── Bloco de Clã v2 (Família Paterna / Materna) ─────────
                                                    const cc = item.clanColor;
                                                    const colorMap = {
                                                        indigo: {
                                                            pill:    'text-indigo-600/80 bg-indigo-50 border-indigo-200/60',
                                                            line:    'via-indigo-200',
                                                            nucleus: 'border-indigo-200/70 bg-indigo-50/30',
                                                            link:    'bg-indigo-50 border-indigo-200 text-indigo-600 hover:bg-indigo-100'
                                                        },
                                                        teal: {
                                                            pill:    'text-teal-600/80 bg-teal-50 border-teal-200/60',
                                                            line:    'via-teal-200',
                                                            nucleus: 'border-teal-200/70 bg-teal-50/30',
                                                            link:    'bg-teal-50 border-teal-200 text-teal-600 hover:bg-teal-100'
                                                        },
                                                        gray: {
                                                            pill:    'text-slate-500/80 bg-slate-50 border-slate-200/60',
                                                            line:    'via-slate-200',
                                                            nucleus: 'border-slate-200/70 bg-slate-50/30',
                                                            link:    'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'
                                                        },
                                                    };
                                                    const c = colorMap[cc] || colorMap.gray;

                                                    // Alerta de vínculo faltando (primos/outros sem vinculoFamiliarId)
                                                    const showLinkAlert = item.needsLink && item.members.length > 0;

                                                    return (
                                                        <div key={item.clanLabel + itemIdx} className="w-full flex flex-col gap-1.5">
                                                            {/* ── Header do Clã ── */}
                                                            <div className="w-full flex items-center gap-1.5 px-1 pt-2">
                                                                <div className={`flex-1 h-px bg-gradient-to-r from-transparent ${c.line} to-transparent`} />
                                                                <span className={`text-[7px] md:text-[9px] font-black uppercase tracking-[0.12em] whitespace-nowrap px-1.5 py-0.5 border rounded-full leading-none flex items-center gap-1 ${c.pill}`}>
                                                                    {item.clanLabel}
                                                                    {item.members && item.members[0] && (
                                                                        <button
                                                                            type="button"
                                                                            title="Adicionar familiar a este clã"
                                                                            onClick={(e) => {
                                                                             e.stopPropagation();
                                                                                // Mini-modal focado: só mostra opções relevantes ao clã
                                                                                const headKey = item.members[0].key;
                                                                                const headMember = item.members[0].member || {};
                                                                                const headName = (headMember.nomeCompleto || '').split(' ')[0] || 'Tio';
                                                                                const rawP = headMember?.relationshipInfo?.parentesco || headMember?.parentesco || '';
                                                                                const isClanPaterno = /\(paterno\)/i.test(rawP);
                                                                                const ladoSufixo = isClanPaterno ? '(Paterno)' : '(Materno)';
                                                                                const primoLabel = isClanPaterno ? 'Primo/a (Paterno)' : 'Primo/a (Materno)';
                                                                                setClanModal({
                                                                                    headKey,
                                                                                    headName,
                                                                                    options: [
                                                                                        {
                                                                                            label: `Cônjuge de ${headName}`,
                                                                                            papel: 'Cônjuge do Tio',
                                                                                            parentesco: `Cônjuge do Tio ${ladoSufixo}`
                                                                                        },
                                                                                        {
                                                                                            label: `Filho/a de ${headName}`,
                                                                                            papel: primoLabel,
                                                                                            parentesco: primoLabel
                                                                                        }
                                                                                    ]
                                                                                });
                                                                            }}
                                                                            className="ml-1 w-3 h-3 md:w-4 md:h-4 rounded bg-white hover:bg-slate-200 border border-transparent shadow-sm flex items-center justify-center transition-colors pointer-events-auto"
                                                                        >
                                                                            <Plus size={10} className="text-slate-600" />
                                                                        </button>
                                                                    )}
                                                                </span>
                                                                <div className={`flex-1 h-px bg-gradient-to-r from-transparent ${c.line} to-transparent`} />
                                                            </div>

                                                            {/* ── Núcleo familiar (Tio + Cônjuge + Filhos) ── */}
                                                            {item.members.length > 0 ? (
                                                                <div className={`w-full flex flex-col gap-1.5 rounded-xl px-1 py-1.5 ${
                                                                    item.isNucleus
                                                                        ? `border ${c.nucleus}`     // núcleo com membros vinculados
                                                                        : 'border border-transparent' // só o tio sozinho — sem caixa
                                                                }`}>
                                                                    {item.members.map((m, mi) => (
                                                                        <div key={m.key} className="w-full flex flex-col">
                                                                            {/* Divisor sutil entre cônjuge e filhos (posição 2 em diante) */}
                                                                            {mi === 2 && item.isNucleus && (
                                                                                <div className={`w-full h-px mb-1 bg-gradient-to-r from-transparent ${c.line} to-transparent opacity-60`} />
                                                                            )}
                                                                            {renderCategorizedMember(m.key, m.member)}
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            ) : (
                                                                <div className="text-[8px] text-slate-300 italic text-center py-2">vazio</div>
                                                            )}

                                                            {/* ── Alerta: membros sem vínculo formal ── */}
                                                            {showLinkAlert && (
                                                                <div className="w-full px-1.5 py-1 bg-amber-50 border border-amber-200/70 rounded-lg text-[7px] md:text-[8px] text-amber-700 leading-snug">
                                                                    ⚠️ Estes membros não estão vinculados a nenhum Tio. Abra o cadastro de cada um e defina o <strong>Vínculo Familiar</strong>.
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })() :
                                                item.isUnionGroup ? (
                                                    // ── Bloco de União com Header ──────────────────────────
                                                    <div key={item.spouseKey || `orphaned-${itemIdx}`} className="w-full flex flex-col gap-2">
                                                        {/* Header da União */}
                                                        <div className="w-full flex items-center gap-1.5 px-1 pt-1">
                                                            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-rose-200 to-transparent" />
                                                            <span className="text-[7px] md:text-[9px] font-black uppercase tracking-[0.15em] text-rose-500/80 whitespace-nowrap px-1.5 py-0.5 bg-rose-50 border border-rose-200/60 rounded-full leading-none">
                                                                {item.spouseName
                                                                    ? `União c/ ${item.spouseName.split(' ')[0]}`
                                                                    : 'Outros Filhos'}
                                                            </span>
                                                            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-rose-200 to-transparent" />
                                                        </div>
                                                        {/* Card do Cônjuge (se houver) */}
                                                        {item.spouseMember && renderCategorizedMember(item.spouseKey, item.spouseMember)}
                                                        {/* Filhos ordenados por nascimento */}
                                                        {item.children.length > 0
                                                            ? item.children.map(child => renderCategorizedMember(child.key, child.member))
                                                            : !item.spouseMember && (
                                                                <div className="text-[8px] text-slate-300 italic text-center py-2">sem filhos cadastrados</div>
                                                            )
                                                        }
                                                    </div>
                                                ) : item.needsReview ? (
                                                    // ── Card Legado / Genérico (Col 1, com alerta) ─────────
                                                    <div key={item.key + itemIdx} className="w-full flex flex-col gap-0.5">
                                                        <div className="w-full rounded border border-dashed border-amber-300 bg-amber-50/60 overflow-hidden">
                                                            {renderCategorizedMember(item.key, item.member)}
                                                        </div>
                                                        <span className="text-[6px] md:text-[7px] text-amber-600 font-bold leading-none px-0.5 pb-1">⚠️ Necessita Atualização</span>
                                                    </div>
                                                ) : renderCategorizedMember(item.key, item.member)
                                            )
                                        ) : (
                                            <div className="h-16 flex items-center justify-center w-full text-[9px] text-slate-300 font-bold uppercase tracking-widest italic opacity-40">Vazio</div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
            {/* ====== MODAL DE 2 ETAPAS — Criação de Colaterais ====== */}
            {showOutroModal && (
                <div
                    className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[200] p-4"
                    onClick={() => {
                        setShowOutroModal(false);
                        setOutroModalStep(1);
                        setSelectedCategory(null);
                        setPendingClanAnchorId(null);
                    }}
                >
                    <div
                        className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200"
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Header do modal */}
                        <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                            <div>
                                <h3 className="text-lg font-serif font-black text-history-green uppercase tracking-wider">
                                    {pendingClanAnchorId
                                        ? `Família de ${(normalizedMembersData[pendingClanAnchorId]?.nomeCompleto || '').split(' ')[0] || 'Tio'}`
                                        : 'Adicionar Parente'}
                                </h3>
                                {outroModalStep === 2 && selectedCategory && (
                                    <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">
                                        Categoria: {selectedCategory.label}
                                    </span>
                                )}
                            </div>
                            <button
                                onClick={() => {
                                    setShowOutroModal(false);
                                    setOutroModalStep(1);
                                    setSelectedCategory(null);
                                    setPendingClanAnchorId(null);
                                }}
                                className="p-2 hover:bg-slate-200 rounded-full transition-colors"
                            >
                                <X size={20} className="text-slate-400" />
                            </button>
                        </div>

                        <div className="p-6 max-h-[60vh] overflow-y-auto">
                            {outroModalStep === 1 ? (
                                // ── ETAPA 1 — Categorias ──────────────────────────────────
                                <div className="grid grid-cols-1 gap-3">
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Selecione uma categoria:</p>
                                    {[
                                        {
                                            label: 'Ancestrais',
                                            options: [
                                                'Bisavô/ó', 'Trisavô/ó', 'Tataravô/ó',
                                                'Quarto-avô/ó', 'Quinto-avô/ó', 'Sextavô/ó',
                                                'Tio-avô/ó', 'Tio-bisavô/ó', 'Padrasto', 'Madrasta'
                                            ]
                                        },
                                        {
                                            label: 'Irmãos',
                                            // Opções com {label, valor}: label=display, valor=payload sem acento
                                            options: [
                                                { label: 'Irmão',       valor: 'Irmao'       },
                                                { label: 'Irmã',        valor: 'Irma'        },
                                                { label: 'Irmão (Pai)', valor: 'Irmao (Pai)' },
                                                { label: 'Irmã (Pai)',  valor: 'Irma (Pai)'  },
                                                { label: 'Irmão (Mãe)', valor: 'Irmao (Mae)' },
                                                { label: 'Irmã (Mãe)',  valor: 'Irma (Mae)'  }
                                            ]
                                        },
                                        {
                                            label: 'Família Paterna',
                                            options: [
                                                'Tio/a (Paterno)', 'Tio-Avô (Paterno)',
                                                'Primo/a (Paterno)', 'Primo (2º grau, Paterno)',
                                                'Primo (3º grau, Paterno)', 'Sobrinho/a (Paterno)',
                                                'Cônjuge do Tio (Paterno)', 'Sobrinho-neto(a) (Paterno)'
                                            ]
                                        },
                                        {
                                            label: 'Família Materna',
                                            options: [
                                                'Tio/a (Materno)', 'Tio-Avô (Materno)',
                                                'Primo/a (Materno)', 'Primo (2º grau, Materno)',
                                                'Primo (3º grau, Materno)', 'Sobrinho/a (Materno)',
                                                'Cônjuge do Tio (Materno)', 'Sobrinho-neto(a) (Materno)'
                                            ]
                                        },
                                        {
                                            label: 'Uniões & Filhos',
                                            options: [
                                                { label: 'Filho/a',   valor: 'Filho/a'  },
                                                { label: 'Neto/a',    valor: 'Neto/a'   },
                                                { label: 'Enteado/a', valor: 'Enteado/a'},
                                                { label: 'Genro',     valor: 'Genro'    },
                                                { label: 'Nora',      valor: 'Nora'     },
                                                { label: 'Cônjuge',   valor: 'Conjuge'  }
                                            ]
                                        }
                                    ].map((cat) => (
                                        <button
                                            key={cat.label}
                                            onClick={() => {
                                                setSelectedCategory(cat);
                                                setOutroModalStep(2);
                                            }}
                                            className="w-full flex items-center justify-between p-4 rounded-xl border-2 border-slate-100 hover:border-slate-300 hover:bg-slate-50 transition-all group"
                                        >
                                            <span className="font-bold text-slate-700 uppercase tracking-wide text-sm">{cat.label}</span>
                                            <div className="w-8 h-8 rounded-full bg-slate-100 group-hover:bg-slate-200 flex items-center justify-center transition-colors">
                                                <Plus size={16} className="text-slate-400 group-hover:text-slate-600" />
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            ) : (
                                // ── ETAPA 2 — Papéis específicos ──────────────────────────
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        onClick={() => {
                                            setShowOutroModal(false);
                                            setOutroModalStep(1);
                                            setSelectedCategory(null);
                                            setPendingClanAnchorId(null);
                                        }}
                                        className="col-span-2 text-[10px] font-bold text-slate-400 hover:text-slate-600 uppercase tracking-widest mb-2 flex items-center gap-1"
                                    >
                                        ← Fechar
                                    </button>
                                    {selectedCategory?.options.map((opt) => {
                                        // opt pode ser string (outros) ou {label, valor} (Irmãos)
                                        const displayLabel = typeof opt === 'object' ? opt.label : opt;
                                        const payloadValor = typeof opt === 'object' ? opt.valor : opt;
                                        return (
                                            <button
                                                key={payloadValor}
                                                onClick={() => {
                                                    setPapelEscolhidoAtual(payloadValor);
                                                    const needsAnchor = NEEDS_ANCHOR_STEP[payloadValor];
                                                    if (needsAnchor) {
                                                        const available = Object.values(membersData || {})
                                                            .filter(m => {
                                                                const p = m.parentesco || m.relationshipInfo?.papel || '';
                                                                return needsAnchor.filterBy.some(f =>
                                                                    p.toLowerCase().includes(f.toLowerCase())
                                                                );
                                                            })
                                                            .filter(m => m.nomeCompleto || m.name);
                                                        setAnchorModalList(available);
                                                        setOutroModalStep(3);
                                                        return;
                                                    }
                                                    confirmarEscolha(payloadValor, pendingClanAnchorId || '');
                                                }}
                                                className="p-3 text-xs font-bold text-slate-600 bg-slate-50 border border-slate-100 rounded-lg hover:border-slate-400 hover:bg-slate-100 hover:text-slate-800 transition-all text-center uppercase tracking-tight"
                                            >
                                                {displayLabel}
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* ====== ETAPA 3 — Seleção de âncora específica ====== */}
            {showOutroModal && outroModalStep === 3 && (
                <div
                    className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[205] p-4"
                    onClick={() => setShowOutroModal(false)}
                >
                    <div
                        className="bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden border border-slate-200"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="p-5 border-b border-slate-100 bg-slate-50/50">
                            <h3 className="text-lg font-serif font-black text-history-green uppercase tracking-wider">
                                {NEEDS_ANCHOR_STEP[papelEscolhidoAtual]?.label || 'Selecione o familiar'}
                            </h3>
                            <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">
                                {papelEscolhidoAtual}
                            </span>
                        </div>
                        <div className="p-5">
                            {anchorModalList.length > 0 ? (
                                <>
                                    <div className="flex flex-col gap-2 max-h-60 overflow-y-auto mb-4 pr-1">
                                        {anchorModalList.map(m => {
                                            const mId = m.docId || m.id || m.key;
                                            const mName = m.nomeCompleto || m.name || '?';
                                            const mRel = m.parentesco || m.relationshipInfo?.papel || '';
                                            return (
                                                <button
                                                    key={mId}
                                                    onClick={() => confirmarEscolha(papelEscolhidoAtual, mId)}
                                                    className="w-full text-left px-4 py-3 rounded-xl border-2 border-slate-100 hover:border-history-green/40 hover:bg-slate-50 transition-all group"
                                                >
                                                    <span className="font-bold text-slate-800 text-sm block">{mName}</span>
                                                    <span className="text-xs text-slate-400">{mRel}</span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                    <button
                                        onClick={() => confirmarEscolha(papelEscolhidoAtual, '')}
                                        className="w-full py-2 text-sm text-slate-500 hover:text-slate-700 border border-dashed border-slate-200 rounded-lg transition-colors"
                                    >
                                        Continuar sem vincular por agora →
                                    </button>
                                </>
                            ) : (
                                <div className="text-center py-6">
                                    <p className="text-slate-500 text-sm mb-2">
                                        Nenhum familiar disponível para vincular ainda.
                                    </p>
                                    <p className="text-slate-400 text-xs mb-6">
                                        Você pode cadastrar este membro agora e fazer a vinculação depois.
                                    </p>
                                    <button
                                        onClick={() => confirmarEscolha(papelEscolhidoAtual, '')}
                                        className="px-6 py-2 bg-slate-800 text-white rounded-full text-sm font-medium hover:bg-slate-700 transition"
                                    >
                                        Cadastrar sem vínculo por agora
                                    </button>
                                </div>
                            )}
                            <button
                                onClick={() => setShowOutroModal(false)}
                                className="mt-4 w-full py-2 text-xs text-slate-400 hover:text-slate-600 transition-colors flex items-center justify-center gap-1"
                            >
                                ← Fechar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ====== MINI-MODAL DE CLÃ — Adicionar ao núcleo de um Tio ====== */}
            {clanModal && (
                <div
                    className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[210] p-4"
                    onClick={() => setClanModal(null)}
                >
                    <div
                        className="bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden border border-slate-200"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                            <div>
                                <h3 className="text-lg font-serif font-black text-history-green uppercase tracking-wider">
                                    Família de {clanModal.headName}
                                </h3>
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                    Quem você quer adicionar?
                                </span>
                            </div>
                            <button
                                onClick={() => setClanModal(null)}
                                className="p-2 hover:bg-slate-200 rounded-full transition-colors"
                            >
                                <X size={20} className="text-slate-400" />
                            </button>
                        </div>
                        <div className="p-5 flex flex-col gap-3">
                            {clanModal.options.map((opt) => (
                                <button
                                    key={opt.papel}
                                    onClick={() => {
                                        const newUUID = generateCollateralId();
                                        onChange({
                                            papel: opt.papel,
                                            parentesco: opt.parentesco,
                                            nome: '',
                                            vinculoFamiliarId: clanModal.headKey,
                                            _newDocId: newUUID
                                        });
                                        onNext(newUUID);
                                        setClanModal(null);
                                    }}
                                    className="w-full flex items-center justify-between p-4 rounded-xl border-2 border-slate-100 hover:border-history-green/40 hover:bg-slate-50 transition-all group"
                                >
                                    <span className="font-bold text-slate-700 text-sm">{opt.label}</span>
                                    <div className="w-8 h-8 rounded-full bg-slate-100 group-hover:bg-slate-200 flex items-center justify-center transition-colors">
                                        <Plus size={16} className="text-slate-400 group-hover:text-slate-600" />
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* ====== DRAWERS ====== */}
            {showDuplicateDrawer && (
                <div
                    className="fixed inset-y-0 right-0 w-full max-w-sm bg-slate-50 shadow-2xl z-[300] flex flex-col transform transition-transform border-l border-slate-200"
                    onClick={e => e.stopPropagation()}
                >
                    <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-white shadow-sm">
                        <h3 className="font-serif font-black text-amber-600 uppercase tracking-widest text-sm flex items-center gap-2">
                            <AlertTriangle size={18} /> Cadastros Similares
                        </h3>
                        <button onClick={() => setShowDuplicateDrawer(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><X size={20} className="text-slate-500" /></button>
                    </div>

                    {/* Toast de resultado do merge */}
                    {mergeToast && (
                        <div
                            className="mx-4 mt-3 px-3 py-2 rounded-lg text-xs font-bold text-white shadow-md"
                            style={{ backgroundColor: mergeToast.color }}
                        >
                            {mergeToast.msg}
                        </div>
                    )}

                    <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
                        {duplicateMembersList.length === 0 ? (
                            <p className="text-sm text-slate-400 font-medium italic text-center mt-8">Tudo organizado! Nenhuma duplicata pendente.</p>
                        ) : (() => {
                            // Agrupa por nome base para poder identificar duplicatas e escolher canonical
                            const byName = {};
                            duplicateMembersList.forEach(m => {
                                const n = (m.baseName || '').toLowerCase();
                                if (!byName[n]) byName[n] = [];
                                byName[n].push(m);
                            });

                            return Object.entries(byName).map(([groupName, members], gi) => {
                                const isExactDuplicate = members.length > 1 && members.every(m => m.isD);
                                // O canonical é o que tiver vinculoFamiliarId ou linkedToAnchorId, ou o primeiro
                                const canonical = members.find(m =>
                                    m.member?.vinculoFamiliarId || m.member?.linkedToAnchorId
                                ) || members[0];
                                const dupKeys = members.filter(m => m.key !== canonical.key).map(m => m.key);

                                return (
                                    <div key={gi} className="flex flex-col gap-2">
                                        {/* Aviso de nome idêntico */}
                                        {isExactDuplicate && (
                                            <div className="flex items-start gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 font-medium">
                                                <AlertTriangle size={13} className="mt-0.5 shrink-0" />
                                                Estes registros parecem ser a mesma pessoa. Clique em <strong>Homologar</strong> para unificá-los.
                                            </div>
                                        )}

                                        {members.map((m, i) => (
                                            <div key={i} className={`p-4 border rounded-xl bg-white shadow-sm flex flex-col gap-3 ${
                                                m.key === canonical.key ? 'border-emerald-300 ring-1 ring-emerald-200' : 'border-slate-200'
                                            }`}>
                                                <div className="flex justify-between items-start">
                                                    <div className="flex flex-col">
                                                        <span className="font-bold text-slate-800 text-[15px]">{m.member?.nomeCompleto || m.key}</span>
                                                        <span className="text-[10px] text-slate-400 uppercase tracking-widest font-black">{m.key}</span>
                                                        <div className="flex gap-1 mt-1.5">
                                                            {m.isD && <span className="text-[9px] text-amber-700 font-bold bg-amber-100 px-2 py-0.5 rounded uppercase tracking-wider">Duplicata</span>}
                                                            {m.isH && <span className="text-[9px] text-blue-700 font-bold bg-blue-100 px-2 py-0.5 rounded uppercase tracking-wider">Homônimo</span>}
                                                            {m.key === canonical.key && <span className="text-[9px] text-emerald-700 font-bold bg-emerald-100 px-2 py-0.5 rounded uppercase tracking-wider">✓ Principal</span>}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex gap-2 mt-1">
                                                    {/* Homologar (merge real) — só no canonical quando há duplicatas */}
                                                    {m.key === canonical.key && dupKeys.length > 0 && (
                                                        <button
                                                            disabled={mergeLoading}
                                                            title="Fusão real: mantemo registro Principal e arquivamos as cópias. Dados importantes das cópias são herdados."
                                                            onClick={async () => {
                                                                if (!onMergeDuplicates || mergeLoading) return;
                                                                setMergeLoading(true);
                                                                setMergeToast(null);
                                                                try {
                                                                    const res = await onMergeDuplicates(canonical.key, dupKeys);
                                                                    const color = res.status === 'success' ? '#059669' : '#dc2626';
                                                                    setMergeToast({ msg: res.message, color });
                                                                    if (res.status === 'success') {
                                                                        setAcceptedDuplicates(prev => {
                                                                            const next = new Set(prev);
                                                                            dupKeys.forEach(k => next.add(k));
                                                                            return next;
                                                                        });
                                                                        // N2: fecha o drawer automaticamente após merge bem-sucedido
                                                                        setTimeout(() => setShowDuplicateDrawer(false), 1200);
                                                                    } else {
                                                                        setTimeout(() => setMergeToast(null), 5000);
                                                                    }
                                                                } finally {
                                                                    setMergeLoading(false);
                                                                }
                                                            }}
                                                            className="flex-1 py-1.5 text-[10px] font-black tracking-wider text-white bg-indigo-600 rounded border border-indigo-700 hover:bg-indigo-700 transition-colors uppercase disabled:opacity-60 disabled:cursor-wait"
                                                        >
                                                            {mergeLoading ? '⏳...' : '🔗 Homologar'}
                                                        </button>
                                                    )}
                                                    <button
                                                        title="Marca este cadastro como válido sem mesclar. Ideal para homônimos (mesma pessoa com datas diferentes)."
                                                        onClick={() => {
                                                            if (m.baseName) setAcceptedDuplicates(prev => new Set(prev).add(m.baseName));
                                                            onAcceptDuplicate?.(m.key, m.member);
                                                        }}
                                                        className="flex-1 py-1.5 text-[10px] font-black tracking-wider text-emerald-700 bg-emerald-50 rounded border border-emerald-100/50 hover:bg-emerald-100 transition-colors uppercase"
                                                    >
                                                        Aceitar
                                                    </button>
                                                    <button onClick={() => {
                                                        setShowDuplicateDrawer(false);
                                                        onChange({ papel: m.key, nome: m.member?.nomeCompleto || '', parentesco: m.member?.parentesco || m.key });
                                                        onNext?.(m.key);
                                                    }} className="flex-1 py-1.5 text-[10px] font-black tracking-wider text-blue-700 bg-blue-50 rounded border border-blue-100/50 hover:bg-blue-100 transition-colors uppercase">
                                                        Editar
                                                    </button>
                                                    <button onClick={() => {
                                                        const bName = m.baseName;
                                                        if (bName) setAcceptedDuplicates(prev => new Set(prev).add(bName));
                                                        onArchiveMember?.(m.key, m.member);
                                                    }} className="flex-1 py-1.5 text-[10px] font-black tracking-wider text-slate-600 bg-slate-100 rounded border border-slate-200/50 hover:bg-slate-200 transition-colors uppercase">
                                                        Arquivar
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                );
                            });
                        })()}
                    </div>
                </div>
            )}
            
            {showIncompleteDrawer && (
                <div 
                    className="fixed inset-y-0 right-0 w-full max-w-sm bg-slate-50 shadow-2xl z-[300] flex flex-col transform transition-transform border-l border-slate-200"
                    onClick={e => e.stopPropagation()}
                >
                    <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-white shadow-sm">
                        <h3 className="font-serif font-black text-rose-600 uppercase tracking-widest text-sm flex items-center gap-2">
                            <AlertTriangle size={18} /> Informações Pendentes
                        </h3>
                        <button onClick={() => setShowIncompleteDrawer(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><X size={20} className="text-slate-500" /></button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
                        {incompleteMembersList.length === 0 ? (
                            <p className="text-sm text-slate-400 font-medium italic text-center mt-8">Tudo completo! Nenhuma pendência.</p>
                        ) : (
                            incompleteMembersList.map((m, i) => (
                                <button 
                                    key={i} 
                                    onClick={() => {
                                        setShowIncompleteDrawer(false);
                                        onChange({ papel: m.key, nome: m.member?.nomeCompleto || '', parentesco: m.member?.parentesco || m.key });
                                        onNext?.(m.key);
                                    }}
                                    className="p-4 border border-slate-200 rounded-xl bg-white shadow-sm flex flex-col gap-1 text-left hover:border-history-green hover:shadow-md transition-all group active:scale-95"
                                >
                                    <span className="font-bold text-slate-800 text-[15px] group-hover:text-history-green transition-colors">{m.member?.nomeCompleto || m.member?.parentesco || m.key}</span>
                                    <span className="text-[10px] text-slate-400 uppercase tracking-widest font-black mt-1 flex items-center gap-1">
                                        <div className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                                        {m.key} - Completar cadastro
                                    </span>
                                </button>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
