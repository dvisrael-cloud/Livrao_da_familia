/**
 * PROJETO: Livrão da Família
 * DESENVOLVIMENTO: HOD (CNPJ: 11.702.142/0001-70)
 * AUTOR: David Vidal Israel (dvisrael@hotmail.com)
 * PARCERIA: Comissão Livrão da Família (Presidida por Marcia Barcessat Rubistein)
 * ASSISTÊNCIA: IA Google Gemini
 * STATUS: Código em fase de ajuste/migração Firebase
 * © 2025 HOD. Todos os direitos reservados.
 */
import React, { useState, useEffect } from 'react';
import { FormSection } from './components/FormSection';
import { InputField, SelectField } from './components/InputFields';
import { Users, Mail, RefreshCw, LogOut, Copy, CheckCircle, ExternalLink, MoreVertical, Trash2, Edit2, X, Save, Ban, Unlock, BookOpen, Eye, Filter, Download, Upload, Network, Send, Menu, ChevronDown, ChevronRight, LayoutDashboard, AlertTriangle, TrendingUp } from 'lucide-react';
import { FamilyTreeReport } from './components/FamilyTreeReport';
import {
    subscribeToFamilies,
    subscribeToInvites,
    createInvite,
    deleteInvite,
    updateInvite,
    updateUserRole,
    toggleUserBlock,
    resendInvite,
    renewInvite,
    completeBan,
    fetchFamilyMembers,
    deleteFamilyRecord,
    updateFamilyName,
    updateFamilyEmail,
    migrateUserData,
    getSystemLogs,
    logSystemEvent,
    markInviteSent,
    markMembroSent
} from './services/api';
import { useRef } from 'react';
import { useReactToPrint } from 'react-to-print';
import { PrintableReport } from './components/PrintableReport';
import { Printer } from 'lucide-react';
import BulkResendPanel from './components/BulkResendPanel';

export const AdminDashboard = ({ user, onLogout }) => {
    // Tabs: 'invites' | 'families' | 'team' (Master only)
    const [activeTab, setActiveTab] = useState('invites');

    // Navigation / Sidebar State
    const [currentView, setCurrentView] = useState('convites-gerar'); 
    const [activeModule, setActiveModule] = useState('convites');
    const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);

    // Data State
    const [families, setFamilies] = useState([]);
    const [invites, setInvites] = useState([]);
    const [loading, setLoading] = useState(false);
    const [copyStatus, setCopyStatus] = useState({ id: null, text: '' });

    // Invite Form State
    const [inviteData, setInviteData] = useState({
        repName: '',
        email: '',
        permission: 'Representante',
        isTeamMember: false,
        isRepresentative: true
    });
    const [generatedLink, setGeneratedLink] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Filter and Search States
    const [inviteStatusFilter, setInviteStatusFilter] = useState('all');
    const [inviteSearchTerm, setInviteSearchTerm] = useState('');

    // Bulk Mode States
    const [isBulkMode, setIsBulkMode] = useState(false);
    const [bulkText, setBulkText] = useState('');
    const [bulkResults, setBulkResults] = useState([]);
    const [generatedMessage, setGeneratedMessage] = useState('');

    // Danger Modal States
    const [dangerModalConfig, setDangerModalConfig] = useState(null); // { fam, type: 'ban' | 'total_ban' }
    const [dangerModalInput, setDangerModalInput] = useState('');

    // Progress Cache State (Missão 2: lazy-load por família)
    // { [uid]: { total, good, progresso, loaded: true/false, loading: true/false } }
    const [progressCache, setProgressCache] = useState({});
    const [isLoadingProgress, setIsLoadingProgress] = useState(false);
    const [toastMessage, setToastMessage] = useState(null);

    // Ferramenta Migrar ID — estados do formulário dedicado
    const [migrateOrigemId, setMigrateOrigemId] = useState('');
    const [migrateDestinoId, setMigrateDestinoId] = useState('');
    const [isMigrating, setIsMigrating] = useState(false);
    const [migrateResult, setMigrateResult] = useState(null); // { status, message }

    // System Logs States
    const [systemLogs, setSystemLogs] = useState([]);
    const [isLoadingLogs, setIsLoadingLogs] = useState(false);
    const [logsRestricted, setLogsRestricted] = useState(false);
    const [logDetailsModal, setLogDetailsModal] = useState(null);

    const showToast = (msg, type = 'success') => {
        setToastMessage({ msg, type });
        setTimeout(() => setToastMessage(null), 3500);
    };

    const handleCopyResult = (text, id) => {
        navigator.clipboard.writeText(text);
        setCopyStatus({ id, text: 'Copiado!' });
        setTimeout(() => setCopyStatus({ id: null, text: '' }), 2000);
    };

    // Initial Data Load (Subscriptions)
    useEffect(() => {
        // Subscribe to Families (All roles except invite-only basic?? Let's allow read for now)
        const unsubFamilies = subscribeToFamilies((data) => setFamilies(data));
        // Subscribe to Invites
        const unsubInvites = subscribeToInvites((data) => setInvites(data));

        return () => {
            unsubFamilies();
            unsubInvites();
        };
    }, []);

    // Load System Logs when view changes to 'sistema-logs'
    useEffect(() => {
        if (currentView === 'sistema-logs') {
            const loadLogs = async () => {
                setIsLoadingLogs(true);
                const isSuperAdmin = user?.role === 'pleno' || user?.role === 'master' || user?.email === 'dvisrael@hotmail.com';
                const res = await getSystemLogs();
                if (res.status === 'success') {
                    setSystemLogs(res.data);
                    setLogsRestricted(false);
                } else if (res.status === 'restricted' && !isSuperAdmin) {
                    // Só bloqueia a UI se NÃO for super-admin — regras do Firestore podem
                    // ainda não ter propagado para o cliente (cache de até 60s)
                    setSystemLogs([]);
                    setLogsRestricted(true);
                }
                setIsLoadingLogs(false);
            };
            loadLogs();
        }
    }, [currentView, user]);

    const handleGenerateInvite = async (e) => {
        if (e) e.preventDefault();
        const { repName, email } = inviteData;
        if (!repName || !email) return alert("Preencha nome e e-mail!");

        setIsSubmitting(true);
        try {
            const result = await createInvite(user.uid, { ...inviteData });
            if (result.status === 'success') {
                const link = result.link;
                setGeneratedLink(link);
                setInviteData({ ...inviteData, repName: '', email: '' });
                
                // Cálculo da data de expiração (7 dias)
                const expDate = new Date();
                expDate.setDate(expDate.getDate() + 7);
                const expDateStr = expDate.toLocaleDateString('pt-BR');

                // Formatar mensagem conforme modelo solicitado
                const formattedMessage = `Prezado(a) ${repName},
\u200BConvidamos você a acessar o seguinte endereço eletrônico:
${link}

Ao acessar o link do seu convite, você será direcionado(a) automaticamente para a tela de Acesso. Seu e-mail (${email}) já estará vinculado de forma segura.

Basta conferir seu nome, informar seu WhatsApp para contato da Comissão e criar uma senha pessoal de no mínimo 6 dígitos. Após concluir, você já estará dentro do Livrão da Família!

⚠️ Este convite é válido até ${expDateStr}. Após essa data, um novo link precisará ser gerado.`;
                
                setGeneratedMessage(formattedMessage);
                
                // Gravar log de telemetria
                logSystemEvent('INFO', 'admin-invites', 'Convite gerado para o e-mail: ' + email, user.email, { targetEmail: email, link });
            }
        } catch (error) {
            console.error("Erro ao gerar convite:", error);
            alert("Erro ao gerar convite: " + error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleBulkSubmit = async () => {
        if (!bulkText.trim()) return alert("Insira ao menos uma linha!");

        setIsSubmitting(true);
        const lines = bulkText.split('\n').filter(line => line.trim());
        const results = [];

        for (const line of lines) {
            const emailRegex = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/;
            const match = line.match(emailRegex);

            if (match) {
                const email = match[0].trim();
                let name = line.replace(email, '').replace(/[<>,]/g, '').trim();
                
                if (!name) name = email.split('@')[0];

                try {
                    const result = await createInvite(user.uid, { 
                        repName: name, 
                        email, 
                        permission: 'Representante',
                        isRepresentative: true,
                        isTeamMember: false
                    });
                    if (result.status === 'success') {
                        const link = result.link;

                        // Expiração
                        const expDate = new Date();
                        expDate.setDate(expDate.getDate() + 7);
                        const expDateStr = expDate.toLocaleDateString('pt-BR');

                        const message = `Prezado(a) ${name},
\u200BConvidamos você a acessar o seguinte endereço eletrônico:
${link}

Ao acessar o link do seu convite, você será direcionado(a) automaticamente para a tela de Acesso. Seu e-mail (${email}) já estará vinculado de forma segura.

Basta conferir seu nome, informar seu WhatsApp para contato da Comissão e criar uma senha pessoal de no mínimo 6 dígitos. Após concluir, você já estará dentro do Livrão da Família!

⚠️ Este convite é válido até ${expDateStr}. Após essa data, um novo link precisará ser gerado.`;

                        results.push({ name, email, message, link, status: 'success' });
                        // Gravar log de telemetria apenas para os sucessos em lote
                        logSystemEvent('INFO', 'admin-invites', 'Convite gerado para o e-mail: ' + email, user.email, { targetEmail: email, link, bulk: true });
                    } else {
                        results.push({ name, email, message: `Erro: ${result.message}`, status: 'error' });
                    }
                } catch (error) {
                    results.push({ name, email, message: `Erro técnico: ${error.message}`, status: 'error' });
                }
            } else {
                results.push({ name: line, email: 'N/A', message: "E-mail não encontrado nesta linha.", status: 'error' });
            }
        }

        setBulkResults(results);
        setIsSubmitting(false);
        setBulkText('');
    };

    const handleResendInvite = (invite) => {
        // Cálculo da data de expiração (7 dias após a criação original)
        const createdAt = invite.createdAt?.toDate ? invite.createdAt.toDate() : new Date();
        const expDate = new Date(createdAt);
        expDate.setDate(expDate.getDate() + 7);
        const expDateStr = expDate.toLocaleDateString('pt-BR');

        const baseUrl = 'https://album-familia-final.web.app';
        const inviteUrl = `${baseUrl}/register?token=${invite.id}`;

        const message = `Prezado(a) ${invite.repName || invite.name},
\u200BConvidamos você a acessar o seguinte endereço eletrônico:
${inviteUrl}

Ao acessar o link do seu convite, você será direcionado(a) automaticamente para a tela de Acesso. Seu e-mail (${invite.email}) já estará vinculado de forma segura.

Basta conferir seu nome, informar seu WhatsApp para contato da Comissão e criar uma senha pessoal de no mínimo 6 dígitos. Após concluir, você já estará dentro do Livrão da Família!

⚠️ Este convite é válido até ${expDateStr}. Após essa data, um novo link precisará ser gerado.`;

        setGeneratedLink(inviteUrl);
        setGeneratedMessage(message);
        
        // Gravar log de telemetria para reenvio
        logSystemEvent('INFO', 'admin-invites', 'Convite reenviado para o e-mail: ' + invite.email, user.email, { targetEmail: invite.email, inviteId: invite.id });
        
        // Scroll para o topo onde aparece o card de resultado
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleRoleUpdate = async (uid, newRole, targetEmail, oldRole) => {
        if (!confirm(`Tem certeza que deseja alterar o nível de acesso para '${newRole}'?`)) return;
        try {
            const result = await updateUserRole(uid, newRole);
            if (result.status === 'success') {
                await logSystemEvent('ACTION', 'admin-management', `Alteração de Privilégio: ${targetEmail || uid} movido para ${newRole}`, user.email, { por: user.email, antigoRole: oldRole, novoRole: newRole });
                alert("Permissão atualizada!");
            } else {
                alert(result.message);
            }
        } catch (e) {
            await logSystemEvent('ERROR', 'admin-system-fail', `Falha na operação administrativa: ${e.message}`, user.email, { error: e.message });
            alert("Erro: " + e.message);
        }
    };

    // --- INVITE ACTIONS ---
    const [openMenuId, setOpenMenuId] = useState(null);
    const [editingInviteId, setEditingInviteId] = useState(null);
    const [editForm, setEditForm] = useState({ repName: '', email: '' });

    // View Family Data States
    const [viewFamily, setViewFamily] = useState(null);
    const [treeFamily, setTreeFamily] = useState(null);

    // --- DYNAMIC PERMISSIONS SYSTEM ---
    const DEFAULT_PERMISSIONS = {
        master: { canViewInvites: true, canViewTeam: true, canEditUsers: true, canDeleteUsers: true, canMigrate: true },
        pleno: { canViewInvites: true, canViewTeam: true, canEditUsers: true, canDeleteUsers: true, canMigrate: false },
        intermediate: { canViewInvites: true, canViewTeam: false, canEditUsers: false, canDeleteUsers: false, canMigrate: false },
        basic: { canViewInvites: false, canViewTeam: false, canEditUsers: false, canDeleteUsers: false, canMigrate: false }
    };

    // Load from LocalStorage or Default
    const [permissions, setPermissions] = useState(() => {
        const saved = localStorage.getItem('appPermissions');
        return saved ? JSON.parse(saved) : DEFAULT_PERMISSIONS;
    });



    // Helper: Rank Logic
    const getRank = (r) => {
        switch (r) {
            case 'pleno': return 4; // User indicated Pleno is Superior
            case 'master': return 3;
            case 'intermediate': return 2;
            case 'basic': return 1;
            default: return 0;
        }
    };

    // Helper: Can Modify Target? (Strict Hierarchy: User > Target, with Exception for Dev)
    const canModify = (targetRole) => {
        if (!user) return false;
        if (user.email === 'dvisrael@hotmail.com') return true; // Super Admin Exception
        return getRank(user.role) > getRank(targetRole || 'none');
    };

    // Helper: Check Permission
    const hasPerm = (action) => {
        if (!user) return false;
        const role = user.role || 'basic'; // Fallback
        const rolePerms = permissions[role] || permissions['basic'];
        return rolePerms[action];
    };



    const [viewMembers, setViewMembers] = useState([]);
    const [selectedMember, setSelectedMember] = useState(null);
    const [isLoadingMembers, setIsLoadingMembers] = useState(false);

    // Fetch Family Members Data when viewing family or family tree
    useEffect(() => {
        const familyToLoad = viewFamily || treeFamily;
        if (familyToLoad && (familyToLoad.uid || familyToLoad.id)) {
            let isMounted = true;
            const loadMembers = async () => {
                setIsLoadingMembers(true);
                try {
                    const idToLoad = familyToLoad.uid || familyToLoad.id;
                    const members = await fetchFamilyMembers(idToLoad);
                    if (isMounted) {
                        setViewMembers(members || []);
                    }
                } catch (error) {
                    console.error("Erro ao carregar membros:", error);
                    if (isMounted) setViewMembers([]);
                } finally {
                    if (isMounted) setIsLoadingMembers(false);
                }
            };
            loadMembers();
            return () => {
                isMounted = false;
            };
        } else {
            // Cleanup state
            setViewMembers([]);
            setSelectedMember(null);
        }
    }, [viewFamily, treeFamily]);

    const toggleMenu = (id) => {
        if (openMenuId === id) setOpenMenuId(null);
        else setOpenMenuId(id);
    };

    const handleDeleteInvite = async (id) => {
        if (confirm("Tem certeza que deseja excluir este convite?")) {
            const res = await deleteInvite(id);
            if (res.status !== 'success') alert(res.message);
            setOpenMenuId(null);
        }
    };

    const startEditing = (invite) => {
        setEditingInviteId(invite.id);
        setEditForm({
            repName: invite.repName,
            email: invite.email,
            isRepresentative: invite.isRepresentative !== false,
            isTeamMember: invite.isTeamMember || false
        });
        setOpenMenuId(null);
    };

    const saveEdit = async (id) => {
        const res = await updateInvite(id, editForm);
        if (res.status === 'success') {
            setEditingInviteId(null);
        } else {
            alert(res.message);
        }
    };

    const cancelEdit = () => {
        setEditingInviteId(null);
    };

    const handleBlockUser = async (uid, currentStatus, famName, famEmail) => {
        const action = currentStatus === 'Bloqueado' ? 'Desbloquear' : 'Bloquear';
        if (confirm(`Tem certeza que deseja ${action} este usuário?`)) {
            try {
                const res = await toggleUserBlock(uid, currentStatus);
                if (res.status === 'success') {
                    const newStatus = currentStatus === 'Bloqueado' ? 'Ativo' : 'Bloqueado';
                    await logSystemEvent('ACTION', 'admin-management', `Gestão de Dados: ${action} - ${famName || famEmail || uid}`, user.email, { operador: user.email, status_final: newStatus });
                    alert(res.message);
                } else {
                    alert(res.message);
                }
            } catch (e) {
                await logSystemEvent('ERROR', 'admin-system-fail', `Falha na operação administrativa: ${e.message}`, user.email, { error: e.message });
                alert("Erro: " + e.message);
            }
            setOpenMenuId(null);
        }
    };

    const handleRenewInvite = async (id) => {
        if (!window.confirm("Deseja renovar este convite por mais 7 dias?")) return;
        setLoading(true);
        const res = await renewInvite(id);
        setLoading(false);
        if (res.status !== 'success') alert(res.message);
    };

    const handleCompleteBan = async (uid, email, name) => {
        // Verificar se é Master
        if (user.role !== 'master' && user.email !== 'dvisrael@hotmail.com') {
            return alert("ACESSO NEGADO: Apenas Master pode banir completamente.");
        }

        const confirmMessage = `⚠️⚠️⚠️ BANIMENTO COMPLETO ⚠️⚠️⚠️\n\nVocê está prestes a APAGAR PERMANENTEMENTE todos os dados de:\n\n"${name}" (${email})\n\nIsso removerá:\n✗ Dados cadastrais\n✗ Árvore genealógica\n✗ Fotos e documentos\n✗ Histórico completo\n\n⚠️ A conta no Firebase Authentication deverá ser removida MANUALMENTE no Console para permitir novo convite.\n\nDigite "BANIR TUDO" para confirmar.`;

        if (prompt(confirmMessage) === "BANIR TUDO") {
            const result = await completeBan(uid, email);
            if (result.status === 'success') {
                alert(result.message);
                setOpenMenuId(null);
            } else {
                alert(result.message);
            }
        }
    };

    // MISSÃO 1: handleDeleteFamily — exclui família do Firestore via deleteFamilyRecord()
    const handleDeleteFamily = async (uid, name) => {
        setLoading(true);
        try {
            const result = await deleteFamilyRecord(uid);
            if (result.status === 'success') {
                await logSystemEvent('ACTION', 'admin-management', `Gestão de Dados: Exclusão - ${name}`, user.email, { operador: user.email, status_final: 'Excluído' });
                showToast(`✅ Família "${name}" excluída com sucesso.`);
            } else {
                showToast(`❌ Erro: ${result.message}`, 'error');
            }
        } catch (e) {
            await logSystemEvent('ERROR', 'admin-system-fail', `Falha na operação administrativa: ${e.message}`, user.email, { error: e.message });
            showToast(`❌ Erro inesperado: ${e.message}`, 'error');
        } finally {
            setLoading(false);
            setDangerModalConfig(null);
            setDangerModalInput('');
        }
    };

    // Calcula progresso real via fetchFamilyMembers — lazy-load por família
    // completion é pré-calculado por api.js (sistema de pesos ponderados 0-100)
    const calculateFamilyProgress = async (fam) => {
        const uid = fam.uid || fam.id;
        if (progressCache[uid]?.loaded) return;

        setProgressCache(prev => ({ ...prev, [uid]: { ...prev[uid], loading: true } }));
        try {
            const members = await fetchFamilyMembers(uid);
            const total = members.length;

            // Coluna "Perfis >50%": contagem de membros com bom preenchimento
            const good = members.filter(m => (m.completion || 0) > 50).length;

            // Barra de Progresso: MÉDIA ARITMÉTICA do completion de todos os membros
            // Isso representa o preenchimento real médio da família inteira
            const somaTotal = members.reduce((acc, m) => acc + (m.completion || 0), 0);
            const progressoMedio = total > 0 ? Math.round(somaTotal / total) : 0;

            console.table({ uid, totalDocumentosBaixados: total, goodProfiles: good, mediaCompletion: `${progressoMedio}%` });

            setProgressCache(prev => ({
                ...prev,
                [uid]: { total, good, progresso: progressoMedio, loaded: true, loading: false }
            }));
        } catch (e) {
            console.error('Erro ao calcular progresso:', e);
            setProgressCache(prev => ({ ...prev, [uid]: { total: '?', good: '?', progresso: 0, loaded: true, loading: false } }));
        }
    };

    // Carrega progresso de TODAS as famílias sob demanda (botão na UI)
    const loadAllProgress = async () => {
        setIsLoadingProgress(true);
        const unloaded = families.filter(f => !progressCache[f.uid || f.id]?.loaded);
        // Processa em lotes de 5 para evitar burst no Firestore
        for (let i = 0; i < unloaded.length; i += 5) {
            const batch = unloaded.slice(i, i + 5);
            await Promise.all(batch.map(f => calculateFamilyProgress(f)));
        }
        setIsLoadingProgress(false);
    };

    // Filter Logic for Invites
    const filteredInvites = invites.filter(invite => {
        // 1. Search term (Name)
        const nameMatch = invite.repName?.toLowerCase().includes(inviteSearchTerm.toLowerCase());

        // 2. Status Match
        let statusMatch = true;
        if (inviteStatusFilter !== 'all') {
            const isUsed = invite.status === 'used';
            const created = invite.createdAt?.toDate ? invite.createdAt.toDate() : null;
            let isExpired = false;
            if (created) {
                const expires = new Date(created);
                expires.setDate(created.getDate() + 7);
                isExpired = new Date() > expires;
            }

            if (inviteStatusFilter === 'used') statusMatch = isUsed;
            if (inviteStatusFilter === 'pending') statusMatch = !isUsed && !isExpired;
            if (inviteStatusFilter === 'expired') statusMatch = !isUsed && isExpired;
        }

        return nameMatch && statusMatch;
    }).sort((a, b) => (a.repName || '').localeCompare(b.repName || ''));

    // PDF Print Logic (Family)
    const componentRef = useRef();
    const handlePrint = useReactToPrint({
        contentRef: componentRef,
        documentTitle: `Relatorio_Livrao_${viewFamily?.repName || 'Familia'}`,
    });

    // PDF Print Logic (Member)
    const memberPrintRef = useRef();
    const handlePrintMember = useReactToPrint({
        contentRef: memberPrintRef,
        documentTitle: `Relatorio_Membro_${selectedMember?.nomeCompleto || 'Membro'}`,
    });

    const handleNavigation = (view, module) => {
        setCurrentView(view);
        if (module) setActiveModule(module);
        setIsMobileDrawerOpen(false);
        
        if (view.startsWith('convites')) {
            setActiveTab('invites');
            if (view === 'convites-todos') setInviteStatusFilter('all');
            if (view === 'convites-cadastrados') setInviteStatusFilter('used');
            if (view === 'convites-pendentes') setInviteStatusFilter('pending');
            if (view === 'convites-expirados') setInviteStatusFilter('expired');
        } else if (view.startsWith('familias')) {
            setActiveTab('families');
        } else if (view.startsWith('equipe')) {
            setActiveTab('team');
        } else if (view.startsWith('ferramentas')) {
            setActiveTab('import');
        } else if (view.startsWith('sistema')) {
            setActiveTab('sistema');
        }
    };

    const modules = [
        {
            id: 'convites',
            label: 'Convites',
            icon: <Mail size={18} />,
            show: hasPerm('canViewInvites'),
            subItems: [
                { id: 'convites-gerar', label: 'Gerar Convite' },
                { id: 'convites-todos', label: 'Visualizar Todos' },
                { id: 'convites-cadastrados', label: 'Cadastrados' },
                { id: 'convites-pendentes', label: 'Pendentes' },
                { id: 'convites-expirados', label: 'Expirados' },
                { id: 'convites-reenvio', label: '📲 Reenvio em Bloco' }
            ]
        },

        {
            id: 'familias',
            label: 'Famílias',
            icon: <Users size={18} />,
            show: true,
            subItems: [
                { id: 'familias-lista', label: 'Lista de Famílias' },
                { id: 'familias-progresso', label: 'Progresso da Família' },
                { id: 'familias-acoes', label: 'Ações Críticas' }
            ]
        },
        {
            id: 'equipe',
            label: 'Equipe',
            icon: <CheckCircle size={18} />,
            show: hasPerm('canViewTeam'),
            subItems: [
                { id: 'equipe-todos', label: 'Visualizar Todos' }
            ]
        },
        {
            id: 'ferramentas',
            label: 'Ferramentas',
            icon: <LayoutDashboard size={18} />,
            show: hasPerm('canMigrate'),
            subItems: [
                { id: 'ferramentas-migrar', label: 'Migrar ID' }
            ]
        },
        {
            id: 'sistema',
            label: 'Sistema',
            icon: <AlertTriangle size={18} />,
            show: user?.role === 'pleno' || user?.role === 'master' || user?.email === 'dvisrael@hotmail.com',
            subItems: [
                { id: 'sistema-logs', label: 'Monitoramento (Logs)' }
            ]
        }
    ];

    const renderSidebar = () => (
        <div className="flex flex-col h-full bg-stone-900 text-stone-300 w-64 shadow-xl shrink-0">
            <div className="p-4 border-b border-stone-800 flex items-center justify-center bg-stone-950">
                <img src="/logo-livrao.png" alt="Logo" className="h-12 w-auto object-contain filter brightness-0 invert opacity-80" />
            </div>
            
            <div className="p-4 py-6 flex-1 overflow-y-auto space-y-2">
                <div className="mb-6 px-2">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-stone-500">Logado como</span>
                    <p className="text-sm font-medium text-white break-all leading-tight mt-1">{user.email}</p>
                    <p className="text-xs text-history-green font-bold mt-0.5">{user.role}</p>
                </div>
                {modules.filter(m => m.show).map(mdl => (
                    <div key={mdl.id} className="space-y-1">
                        <button 
                            onClick={() => setActiveModule(activeModule === mdl.id ? null : mdl.id)}
                            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition-colors font-bold text-sm ${activeModule === mdl.id ? 'bg-history-green text-white' : 'hover:bg-stone-800 hover:text-white'}`}
                        >
                            <div className="flex items-center gap-3">
                                {mdl.icon}
                                <span>{mdl.label}</span>
                            </div>
                            {activeModule === mdl.id ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                        </button>
                        
                        {activeModule === mdl.id && (
                            <div className="pl-9 space-y-1 mt-1 mb-3">
                                {mdl.subItems.map(sub => (
                                    <button 
                                        key={sub.id}
                                        onClick={() => handleNavigation(sub.id, mdl.id)}
                                        className={`w-full text-left px-3 py-1.5 rounded-md text-xs transition-colors ${currentView === sub.id ? 'bg-stone-800 text-white font-bold' : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800/50'}`}
                                    >
                                        {sub.label}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                ))}
            </div>
            <div className="p-4 border-t border-stone-800">
                <button
                    onClick={onLogout}
                    className="flex items-center justify-center gap-2 w-full py-2 px-4 rounded-lg bg-red-900/40 text-red-400 font-bold hover:bg-red-900/60 hover:text-red-300 transition-colors text-sm"
                >
                    <LogOut size={16} /> Sair do Painel
                </button>
            </div>
        </div>
    );

    return (

        <div className="min-h-screen bg-stone-100 flex font-sans">
            {/* Sidebar Desktop */}
            <aside className="hidden md:block sticky top-0 h-screen z-20">
                {renderSidebar()}
            </aside>

            {/* Mobile Header */}
            <div className={`md:hidden fixed top-0 w-full bg-stone-900 z-40 shadow-md ${isMobileDrawerOpen ? 'hidden' : 'block'}`}>
                <div className="flex items-center justify-between p-4">
                    <img src="/logo-livrao.png" alt="Logo" className="h-8 filter brightness-0 invert opacity-80" />
                    <button onClick={() => setIsMobileDrawerOpen(true)} className="text-white p-2">
                        <Menu size={24} />
                    </button>
                </div>
            </div>

            {/* Mobile Drawer Overlay */}
            <div 
                className={`md:hidden fixed inset-0 bg-black/60 z-50 transition-opacity ${isMobileDrawerOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} 
                onClick={() => setIsMobileDrawerOpen(false)}
            ></div>

            {/* Mobile Drawer */}
            <aside className={`md:hidden fixed inset-y-0 left-0 w-64 z-50 transform transition-transform duration-300 overflow-hidden ${isMobileDrawerOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                {renderSidebar()}
            </aside>

            {/* Main Content */}
            <main className="flex-1 min-w-0 md:h-screen md:overflow-y-auto w-full pt-20 md:pt-0 pb-20 md:pb-8 p-4 md:p-8 bg-parchment relative">
                <div className="max-w-6xl mx-auto">
                    {/* Header View Title */}
                    <div className="mb-6 flex justify-between items-center bg-white p-4 rounded-lg shadow-sm border border-stone-200">
                        <h2 className="text-xl font-serif font-bold text-history-green">
                            {modules.flatMap(m => m.subItems).find(s => s.id === currentView)?.label || 'Painel de Controle'}
                        </h2>
                    </div>

                    {/* ----------------- CONVITES ----------------- */}
                    {currentView === 'convites-gerar' && (
                        <div className="max-w-md mx-auto space-y-6">
                            <FormSection title="Gerar Convite">
                                <div className="flex items-center justify-between mb-4 border-b pb-2">
                                    <h2 className="text-lg font-bold text-history-green">Modo de Cadastro</h2>
                                    <div className="flex bg-stone-100 p-1 rounded-md text-xs">
                                        <button 
                                            onClick={() => { setIsBulkMode(false); setBulkResults([]); setGeneratedLink(''); }}
                                            className={`px-3 py-1 rounded ${!isBulkMode ? 'bg-white shadow text-history-green font-bold' : 'text-stone-500'}`}
                                        >
                                            Individual
                                        </button>
                                        <button 
                                            onClick={() => { setIsBulkMode(true); setGeneratedLink(''); setGeneratedMessage(''); }}
                                            className={`px-3 py-1 rounded ${isBulkMode ? 'bg-white shadow text-history-green font-bold' : 'text-stone-500'}`}
                                        >
                                            Bloco
                                        </button>
                                    </div>
                                </div>

                                {!isBulkMode ? (
                                    <form onSubmit={handleGenerateInvite} className="space-y-4">
                                        <InputField 
                                            label="Nome do Representante"
                                            value={inviteData.repName}
                                            onChange={(e) => setInviteData({ ...inviteData, repName: e.target.value })}
                                            placeholder="Ex: David Vidal"
                                            required
                                        />
                                        <InputField 
                                            label="E-mail"
                                            type="email"
                                            value={inviteData.email}
                                            onChange={(e) => setInviteData({ ...inviteData, email: e.target.value })}
                                            placeholder="Ex: david@email.com"
                                            required
                                        />
                                        <button 
                                            type="submit"
                                            disabled={isSubmitting}
                                            className="w-full bg-history-green text-white py-2 rounded-md font-bold hover:bg-opacity-90 transition-all flex items-center justify-center gap-2"
                                        >
                                            {isSubmitting ? 'Gerando...' : (
                                                <>
                                                    <Mail size={18} />
                                                    Gerar Convite
                                                </>
                                            )}
                                        </button>
                                    </form>
                                ) : (
                                    <div className="space-y-4">
                                        <div className="flex flex-col gap-1">
                                            <label className="text-sm font-semibold text-history-green">Lista de Convites (Nome e E-mail por linha)</label>
                                            <textarea 
                                                value={bulkText}
                                                onChange={(e) => setBulkText(e.target.value)}
                                                placeholder="Ex: David Vidal, david@email.com&#10;Amelia Bemerguy amelia@email.com"
                                                className="w-full h-32 p-3 border border-stone-300 rounded-md bg-stone-50 focus:ring-2 focus:ring-gold-accent focus:border-transparent outline-none shadow-sm text-sm"
                                            />
                                        </div>
                                        <button 
                                            onClick={handleBulkSubmit}
                                            disabled={isSubmitting || !bulkText.trim()}
                                            className="w-full bg-history-green text-white py-2 rounded-md font-bold hover:bg-opacity-90 transition-all flex items-center justify-center gap-2"
                                        >
                                            {isSubmitting ? 'Processando...' : (
                                                <>
                                                    <RefreshCw size={18} />
                                                    Gerar Convites em Bloco
                                                </>
                                            )}
                                        </button>
                                    </div>
                                )}

                                {(generatedLink || bulkResults.length > 0) && (
                                    <div className="mt-6 p-4 bg-history-green bg-opacity-5 rounded-lg border border-history-green border-dashed animate-in fade-in slide-in-from-top-2">
                                        <h3 className="text-history-green font-bold text-sm mb-2 flex items-center gap-2">
                                            <CheckCircle size={16} />
                                            {isBulkMode ? `${bulkResults.filter(r => r.status === 'success').length} Convites Gerados` : 'Convite Gerado!'}
                                        </h3>
                                        
                                        {!isBulkMode ? (
                                            <div className="space-y-3">
                                                <div className="p-2 bg-white border border-stone-200 rounded text-xs break-all font-mono text-stone-600">
                                                    {generatedLink}
                                                </div>
                                                <div className="p-2 bg-white border border-stone-200 rounded text-xs whitespace-pre-wrap text-stone-700 max-h-40 overflow-y-auto">
                                                    {generatedMessage}
                                                </div>
                                                <button 
                                                    onClick={() => {
                                                        navigator.clipboard.writeText(generatedMessage);
                                                        alert("Mensagem copiada!");
                                                    }}
                                                    className="w-full py-1.5 border border-history-green text-history-green text-xs font-bold rounded hover:bg-history-green hover:text-white transition-all flex items-center justify-center gap-1"
                                                >
                                                    <Copy size={14} /> Copiar Mensagem
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="space-y-4 max-h-80 overflow-y-auto pr-1">
                                                {bulkResults.map((res, i) => (
                                                    <div key={i} className={`p-2 border rounded text-xs ${res.status === 'success' ? 'bg-white border-stone-200' : 'bg-red-50 border-red-200'}`}>
                                                        <div className="font-bold flex justify-between items-center mb-1">
                                                            <span>{res.name}</span>
                                                            <span className={res.status === 'success' ? 'text-green-600' : 'text-red-500'}>
                                                                {res.status === 'success' ? 'Sucesso' : 'Falha'}
                                                            </span>
                                                        </div>
                                                        <div className="whitespace-pre-wrap text-stone-600 mb-2">
                                                            {res.message}
                                                        </div>
                                                        {res.status === 'success' && (
                                                            <button 
                                                                onClick={() => {
                                                                    navigator.clipboard.writeText(res.message);
                                                                    alert("Mensagem copiada!");
                                                                }}
                                                                className="px-2 py-1 bg-history-green text-white rounded text-[10px] font-bold"
                                                            >
                                                                Copiar
                                                            </button>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </FormSection>
                        </div>
                    )}


                    {/* ── REENVIO EM BLOCO ── */}
                    {currentView === 'convites-reenvio' && (
                        <div className="bg-white p-6 rounded-lg shadow-sm border border-stone-200">
                            <BulkResendPanel
                                user={user}
                                invites={invites}
                                families={families}
                                showToast={showToast}
                            />
                        </div>
                    )}

                    {currentView.startsWith('convites-') && currentView !== 'convites-gerar' && currentView !== 'convites-reenvio' && (
                        <div className="bg-white p-6 rounded-lg shadow-sm border border-stone-200">

                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 border-b pb-4">
                                    <h2 className="text-lg font-bold text-history-green">Convites Recentes</h2>
                                    
                                    <div className="flex flex-col gap-3 w-full md:w-auto">
                                        {/* Search Input */}
                                        <div className="relative">
                                            <InputField
                                                placeholder="Buscar por nome..."
                                                value={inviteSearchTerm}
                                                onChange={(e) => setInviteSearchTerm(e.target.value)}
                                                inputClassName="pl-8"
                                            />
                                            <Filter className="absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400" size={14} />
                                        </div>

                                        {/* Filters: Cadastrados | Pendentes | Expirados */}
                                        <div className="flex bg-stone-100 p-1 rounded-lg border border-stone-200">
                                            {[
                                                { id: 'all', label: 'Todos' },
                                                { id: 'used', label: 'Cadastrados' },
                                                { id: 'pending', label: 'Pendentes' },
                                                { id: 'expired', label: 'Expirados' }
                                            ].map(filter => (
                                                <button
                                                    key={filter.id}
                                                    onClick={() => setInviteStatusFilter(filter.id)}
                                                    className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all flex-1 min-w-[75px] ${
                                                        inviteStatusFilter === filter.id 
                                                            ? 'bg-history-green text-white shadow-sm' 
                                                            : 'text-stone-500 hover:text-stone-700 hover:bg-white/50'
                                                    }`}
                                                >
                                                    {filter.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                                <div className="overflow-x-auto pb-40">
                                    <table className="w-full text-sm text-left block md:table">
                                        <thead className="text-xs text-stone-500 uppercase bg-stone-50 hidden md:table-header-group">
                                            <tr className="md:table-row block p-2 md:p-0">
                                                <th className="px-4 py-2 block md:table-cell">Representante</th>
                                                <th className="px-4 py-2 text-center block md:table-cell">Tipo</th>
                                                {currentView !== 'convites-pendentes' && <th className="px-4 py-2 block md:table-cell">E-mail</th>}
                                                {currentView === 'convites-cadastrados' ? (
                                                    <>
                                                        <th className="px-4 py-2 block md:table-cell">Data Cadastro</th>
                                                        <th className="px-4 py-2 block md:table-cell">Situação App</th>
                                                    </>
                                                ) : (
                                                    <th className="px-4 py-2 block md:table-cell">Validade</th>
                                                )}
                                                {currentView !== 'convites-pendentes' && currentView !== 'convites-cadastrados' && <th className="px-4 py-2 block md:table-cell">Status</th>}
                                                <th className="px-4 py-2 text-right block md:table-cell">Ação</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-stone-100 block md:table-row-group">
                                            {filteredInvites.map(invite => (
                                                <tr key={invite.id} className="block md:table-row hover:bg-stone-50 group border border-stone-200 md:border-0 rounded-lg md:rounded-none mb-4 md:mb-0 shadow-sm md:shadow-none p-2 md:p-0">
                                                    {editingInviteId === invite.id ? (
                                                        <>
                                                            <td className="px-4 py-3">
                                                                <input
                                                                    className="border rounded p-1 text-sm w-full"
                                                                    value={editForm.repName}
                                                                    onChange={e => setEditForm({ ...editForm, repName: e.target.value })}
                                                                />
                                                            </td>
                                                            <td className="px-4 py-3 text-center">
                                                                <div className="flex justify-center gap-2">
                                                                    <label className="flex items-center gap-1 text-xs cursor-pointer font-bold select-none" title="Representante">
                                                                        <input
                                                                            type="checkbox"
                                                                            checked={editForm.isRepresentative}
                                                                            onChange={e => setEditForm({ ...editForm, isRepresentative: e.target.checked })}
                                                                            className="rounded text-history-green w-3 h-3"
                                                                        />
                                                                        R
                                                                    </label>
                                                                    <label className="flex items-center gap-1 text-xs cursor-pointer font-bold select-none" title="Membro Equipe">
                                                                        <input
                                                                            type="checkbox"
                                                                            checked={editForm.isTeamMember}
                                                                            onChange={e => setEditForm({ ...editForm, isTeamMember: e.target.checked })}
                                                                            className="rounded text-history-green w-3 h-3"
                                                                        />
                                                                        M
                                                                    </label>
                                                                </div>
                                                            </td>
                                                            <td className="px-4 py-3">
                                                                <input
                                                                    className="border rounded p-1 text-sm w-full"
                                                                    value={editForm.email}
                                                                    onChange={e => setEditForm({ ...editForm, email: e.target.value })}
                                                                />
                                                            </td>
                                                            <td className="px-4 py-3 text-center" colSpan="3">
                                                                <div className="flex justify-end gap-2">
                                                                    <button onClick={() => saveEdit(invite.id)} className="text-green-600 hover:bg-green-100 p-1 rounded">
                                                                        <Save size={16} />
                                                                    </button>
                                                                    <button onClick={cancelEdit} className="text-red-500 hover:bg-red-100 p-1 rounded">
                                                                        <X size={16} />
                                                                    </button>
                                                                </div>
                                                            </td>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <td className="px-4 py-3 font-medium block md:table-cell border-b border-stone-100 md:border-none flex justify-between items-center text-right md:text-left">
                                                                <span className="md:hidden text-[10px] uppercase font-bold text-stone-400">Representante</span>
                                                                <span>{invite.repName}</span>
                                                            </td>

                                                            {/* Coluna Tipo */}
                                                            <td className="px-4 py-3 text-center block md:table-cell border-b border-stone-100 md:border-none flex justify-between items-center">
                                                                <span className="md:hidden text-[10px] uppercase font-bold text-stone-400">Tipo</span>
                                                                <span className="font-mono font-bold text-xs bg-stone-100 px-2 py-1 rounded text-stone-600">
                                                                    {(invite.isRepresentative !== false && invite.isTeamMember) ? "R/M" :
                                                                        (invite.isTeamMember) ? "M" : "R"}
                                                                </span>
                                                            </td>

                                                            {currentView !== 'convites-pendentes' && (
                                                            <td className="px-4 py-3 text-stone-600 block md:table-cell border-b border-stone-100 md:border-none flex justify-between items-center text-right md:text-left">
                                                                <span className="md:hidden text-[10px] uppercase font-bold text-stone-400">E-mail</span>
                                                                <span className="break-all">{invite.email}</span>
                                                            </td>
                                                            )}

                                                            {currentView === 'convites-cadastrados' ? (
                                                                <>
                                                                <td className="px-4 py-3 text-xs block md:table-cell border-b border-stone-100 md:border-none flex justify-between items-center">
                                                                    <span className="md:hidden text-[10px] uppercase font-bold text-stone-400">Data Cadastro</span>
                                                                    <span className="text-stone-600">
                                                                        {invite.createdAt?.toDate ? invite.createdAt.toDate().toLocaleDateString('pt-BR') : '—'}
                                                                    </span>
                                                                </td>
                                                                <td className="px-4 py-3 text-xs block md:table-cell border-b border-stone-100 md:border-none flex justify-between items-center">
                                                                    <span className="md:hidden text-[10px] uppercase font-bold text-stone-400">Situação App</span>
                                                                    {(() => {
                                                                        const fam = families.find(f => f.email?.toLowerCase() === invite.email?.toLowerCase());
                                                                        if (!fam) return <span className="text-stone-400">—</span>;
                                                                        return fam.pwaInstalled
                                                                            ? <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-100 text-green-800">📱 App</span>
                                                                            : <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">✅ Ativo</span>;
                                                                    })()}
                                                                </td>
                                                                </>
                                                            ) : (
                                                            <td className="px-4 py-3 text-xs block md:table-cell border-b border-stone-100 md:border-none flex justify-between items-center">
                                                                <span className="md:hidden text-[10px] uppercase font-bold text-stone-400">Validade</span>
                                                                {(() => {
                                                                    if (invite.status === 'used') return <span className="text-stone-300">-</span>;
                                                                    if (!invite.createdAt?.toDate) return <span className="text-stone-400">?</span>;

                                                                    const created = invite.createdAt.toDate();
                                                                    const expires = new Date(created);
                                                                    expires.setDate(created.getDate() + 7);
                                                                    const isExpired = new Date() > expires;

                                                                    if (isExpired) {
                                                                        return (
                                                                            <div className="flex items-center gap-3">
                                                                                <span className="text-red-500 font-bold">Expirado</span>
                                                                                <div className="flex gap-1.5 border-l border-stone-200 pl-2">
                                                                                    <button
                                                                                        onClick={() => handleDeleteInvite(invite.id)}
                                                                                        className="p-1 hover:bg-red-50 text-stone-400 hover:text-red-600 rounded transition-all"
                                                                                        title="Excluir Convite Expirado"
                                                                                    >
                                                                                        <Trash2 size={15} />
                                                                                    </button>
                                                                                    <button
                                                                                        onClick={() => handleRenewInvite(invite.id)}
                                                                                        className="p-1 hover:bg-history-green/10 text-stone-400 hover:text-history-green rounded transition-all"
                                                                                        title="Renovar Validade (Mais 7 dias)"
                                                                                    >
                                                                                        <RefreshCw size={15} />
                                                                                    </button>
                                                                                </div>
                                                                            </div>
                                                                        );
                                                                    }

                                                                    return <span className="text-green-600">Até {expires.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}</span>;
                                                                })()}
                                                            </td>
                                                            )}
                                                            {currentView !== 'convites-pendentes' && currentView !== 'convites-cadastrados' && (
                                                            <td className="px-4 py-3 block md:table-cell border-b border-stone-100 md:border-none flex justify-between items-center">
                                                                <span className="md:hidden text-[10px] uppercase font-bold text-stone-400">Status</span>
                                                                <span className={`px-2 py-1 rounded-full text-xs font-bold ${invite.status === 'used' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                                                                    }`}>
                                                                    {invite.status === 'used' ? 'Cadastrado' : 'Pendente'}
                                                                </span>
                                                            </td>
                                                            )}

                                                            <td className="px-4 py-3 text-right text-stone-400 relative block md:table-cell md:border-none flex justify-between items-center">
                                                                <span className="md:hidden text-[10px] uppercase font-bold text-stone-400">Ações</span>
                                                                <div className="flex items-center justify-end gap-2">
                                                                    {invite.status === 'pending' && (
                                                                        <button
                                                                            title="Copiar Link Novamente"
                                                                            onClick={() => {
                                                                                const baseUrl = 'https://album-familia-final.web.app';
                                                                                navigator.clipboard.writeText(`${baseUrl}/register?token=${invite.id}`);
                                                                                alert("Link copiado!");
                                                                            }}
                                                                            className="hover:text-history-green p-1 rounded hover:bg-stone-100"
                                                                        >
                                                                            <Copy size={16} />
                                                                        </button>
                                                                    )}

                                                                    {/* Menu Dropdown */}
                                                                    <div className="relative">
                                                                        <button
                                                                            onClick={() => toggleMenu(invite.id)}
                                                                            className="p-1 rounded hover:bg-stone-100 text-stone-400 hover:text-stone-600"
                                                                        >
                                                                            <MoreVertical size={16} />
                                                                        </button>

                                                                        {openMenuId === invite.id && (
                                                                            <div className="absolute right-0 top-full mt-1 w-40 bg-white border border-stone-200 shadow-lg rounded-md z-20 py-1 text-left">
                                                                                {invite.status === 'pending' && (
                                                                                    <button
                                                                                        onClick={() => handleResendInvite(invite)}
                                                                                        className="w-full px-4 py-2 text-xs text-green-700 hover:bg-green-50 flex items-center gap-2 font-bold"
                                                                                    >
                                                                                        <Send size={12} /> Reenviar Link
                                                                                    </button>
                                                                                )}
                                                                                <button
                                                                                    onClick={() => startEditing(invite)}
                                                                                    className="w-full px-4 py-2 text-xs text-stone-700 hover:bg-stone-50 flex items-center gap-2"
                                                                                >
                                                                                    <Edit2 size={12} /> Editar
                                                                                </button>
                                                                                <button
                                                                                    onClick={() => handleDeleteInvite(invite.id)}
                                                                                    className="w-full px-4 py-2 text-xs text-red-600 hover:bg-red-50 flex items-center gap-2"
                                                                                >
                                                                                    <Trash2 size={12} /> Excluir
                                                                                </button>
                                                                            </div>
                                                                        )}
                                                                    </div>

                                                                    {/* Overlay para fechar ao clicar fora (opcional, ou usar useEffect global) */}
                                                                    {openMenuId === invite.id && (
                                                                        <div
                                                                            className="fixed inset-0 z-10 cursor-default"
                                                                            onClick={() => setOpenMenuId(null)}
                                                                        ></div>
                                                                    )}
                                                                </div>
                                                            </td>
                                                        </>
                                                    )}
                                                </tr>
                                            ))}
                                            {filteredInvites.length === 0 && (
                                                <tr>
                                                    <td colSpan="4" className="text-center py-8 text-stone-400 italic">
                                                        Nenhum convite gerado ainda.
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                            </div>
                        </div>
                    )}
                    {/* ----------------- FAMÍLIAS ----------------- */}
                    {currentView === 'familias-lista' && (
                        <div className="bg-white p-6 rounded-lg shadow-sm border border-stone-200">
                        <h2 className="text-lg font-bold text-history-green mb-4">Base de Famílias ({families.length})</h2>
                        <div className="overflow-x-auto pb-40">
                            <table className="w-full text-sm text-left block md:table">
                                <thead className="text-xs text-stone-500 uppercase bg-stone-50 hidden md:table-header-group">
                                    <tr className="md:table-row block p-2 md:p-0">
                                        <th className="px-4 py-2 block md:table-cell">Representante</th>
                                        <th className="px-4 py-2 block md:table-cell">E-mail</th>
                                        <th className="px-4 py-2 block md:table-cell">ID</th>
                                        <th className="px-4 py-2 text-center block md:table-cell">Status</th>
                                        <th className="px-4 py-2 text-right block md:table-cell">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-stone-100 block md:table-row-group">
                                    {families.map(fam => (
                                        <tr key={fam.uid || fam.id} className="block md:table-row hover:bg-stone-50 group border border-stone-200 md:border-0 rounded-lg md:rounded-none mb-4 md:mb-0 shadow-sm md:shadow-none p-2 md:p-0 relative">
                                            <td className="px-4 py-3 font-medium block md:table-cell border-b border-stone-100 md:border-none flex justify-between items-center text-right md:text-left">
                                                <span className="md:hidden text-[10px] uppercase font-bold text-stone-400">Representante</span>
                                                <span className="max-w-[200px] md:max-w-none truncate">{fam.repName || fam.displayName}</span>
                                            </td>
                                            <td className="px-4 py-3 text-stone-600 block md:table-cell border-b border-stone-100 md:border-none flex justify-between items-center text-right md:text-left">
                                                <span className="md:hidden text-[10px] uppercase font-bold text-stone-400">E-mail</span>
                                                <span className="break-all">{fam.email}</span>
                                            </td>
                                            <td className="px-4 py-3 text-stone-400 text-xs font-mono block md:table-cell border-b border-stone-100 md:border-none flex justify-between items-center text-right md:text-left">
                                                <span className="md:hidden text-[10px] uppercase font-bold text-stone-400">ID</span>
                                                <span>{fam.uid || fam.id}</span>
                                            </td>


                                            <td className="px-4 py-3 text-center block md:table-cell border-b border-stone-100 md:border-none flex justify-between items-center text-right md:text-left">
                                                <span className="md:hidden text-[10px] uppercase font-bold text-stone-400">Status</span>
                                                <button
                                                    onClick={() => handleBlockUser(fam.uid || fam.id, fam.status, fam.repName, fam.email)}
                                                    title={fam.status === 'Bloqueado' ? 'Clique para Desbloquear' : 'Clique para Bloquear'}
                                                    className={`px-3 py-1 rounded-full text-xs font-bold transition-all hover:scale-105 active:scale-95 w-24 ${fam.status === 'Bloqueado' ? 'bg-red-100 text-red-800 hover:bg-red-200' :
                                                        fam.status === 'Ativo' ? 'bg-green-100 text-green-800 hover:bg-green-200' : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                                                        }`}
                                                >
                                                    {fam.status || 'Ativo'}
                                                </button>
                                            </td>



                                            <td className="px-4 py-3 text-right block md:table-cell border-none flex justify-between items-center">
                                                <span className="md:hidden text-[10px] uppercase font-bold text-stone-400">Menu</span>
                                                <div className="relative">
                                                    <button
                                                        onClick={() => toggleMenu(`fam-${fam.uid || fam.id}`)}
                                                        className="p-1 rounded hover:bg-stone-100 text-stone-400 hover:text-stone-600"
                                                    >
                                                        <MoreVertical size={16} />
                                                    </button>

                                                    {openMenuId === `fam-${fam.uid || fam.id}` && (
                                                        <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-stone-200 shadow-lg rounded-md z-20 py-1 text-left z-[60]">
                                                            {(hasPerm('canEditUsers')) && (
                                                                <button
                                                                    onClick={async () => {
                                                                        const newName = prompt("Novo nome para o representante:", fam.repName || fam.displayName);
                                                                        if (newName && newName !== (fam.repName || fam.displayName)) {
                                                                            try {
                                                                                await updateFamilyName(fam.uid || fam.id, newName);
                                                                                setOpenMenuId(null);
                                                                            } catch (e) {
                                                                                alert("Erro ao renomear: " + e.message);
                                                                            }
                                                                        }
                                                                    }}
                                                                    className="w-full px-4 py-2 text-xs text-stone-700 hover:bg-stone-50 flex items-center gap-2"
                                                                >
                                                                    <Edit2 size={12} /> Editar Nome
                                                                </button>
                                                            )}
                                                            {/* Edit Email — Atualiza Firestore; sync Auth via console. */}
                                                            {(hasPerm('canEditUsers')) && (
                                                                <button
                                                                    onClick={async () => {
                                                                        const newEmail = prompt("Novo E-mail do cadastro:\n(Atenção: atualiza apenas o Firestore. O e-mail de login no Auth deve ser ajustado manualmente no Firebase Console.)", fam.email);
                                                                        if (newEmail && newEmail.trim() !== fam.email) {
                                                                            try {
                                                                                await updateFamilyEmail(fam.uid || fam.id, newEmail);
                                                                                showToast(`✅ E-mail atualizado no cadastro para ${newEmail.trim().toLowerCase()}`);
                                                                                setOpenMenuId(null);
                                                                            } catch (e) {
                                                                                showToast(`❌ Erro ao atualizar e-mail: ${e.message}`, 'error');
                                                                            }
                                                                        }
                                                                    }}
                                                                    className="w-full px-4 py-2 text-xs text-stone-700 hover:bg-stone-50 flex items-center gap-2"
                                                                >
                                                                    <Mail size={12} /> Editar E-mail
                                                                </button>
                                                            )}

                                                            <button
                                                                onClick={() => {
                                                                    setViewFamily(fam);
                                                                    setOpenMenuId(null);
                                                                }}
                                                                className="w-full px-4 py-2 text-xs text-stone-700 hover:bg-stone-50 flex items-center gap-2"
                                                            >
                                                                <ExternalLink size={12} /> Ver Dados
                                                            </button>
                                                            <button
                                                                onClick={() => {
                                                                    setTreeFamily(fam);
                                                                    setOpenMenuId(null);
                                                                }}
                                                                className="w-full px-4 py-2 text-xs text-stone-700 hover:bg-stone-50 flex items-center gap-2"
                                                            >
                                                                <Network size={12} /> Ver Árvore
                                                            </button>



                                                            {/* Botão de Banir/Excluir - Restrito a Rank >= 3 (Master/Pleno) */}
                                                            {(hasPerm('canDeleteUsers') || user.email === 'dvisrael@hotmail.com') && (getRank(user.role) >= 3 || user.email === 'dvisrael@hotmail.com') && (
                                                                <button
                                                                    onClick={() => handleDeleteFamily(fam.uid || fam.id, fam.repName || fam.displayName)}
                                                                    className="w-full px-4 py-2 text-xs text-red-600 hover:bg-red-50 flex items-center gap-2 border-t border-stone-100 mt-1 font-bold"
                                                                    title="Exclui todos os dados permanentemente (Restrito a Master/Pleno)"
                                                                >
                                                                    <Ban size={12} /> BANIR (Excluir)
                                                                </button>
                                                            )}

                                                            {/* Botão de BANIR COMPLETAMENTE - Apenas Master */}
                                                            {(user.role === 'master' || user.email === 'dvisrael@hotmail.com') && (
                                                                <button
                                                                    onClick={() => handleCompleteBan(fam.uid || fam.id, fam.email, fam.repName || fam.displayName)}
                                                                    className="w-full px-4 py-2 text-xs text-white bg-red-600 hover:bg-red-700 flex items-center gap-2 border-t-2 border-red-800 mt-1 font-bold"
                                                                    title="Remove TUDO do banco de dados - Apenas Master"
                                                                >
                                                                    <Ban size={12} /> BANIR COMPLETAMENTE
                                                                </button>
                                                            )}
                                                        </div>
                                                    )}

                                                    {openMenuId === `fam-${fam.uid || fam.id}` && (
                                                        <div
                                                            className="fixed inset-0 z-10 cursor-default"
                                                            onClick={() => setOpenMenuId(null)}
                                                        ></div>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
                
                {currentView === 'familias-progresso' && (
                    <div className="bg-white p-6 rounded-lg shadow-sm border border-stone-200">
                        <div className="flex flex-wrap justify-between items-center mb-4 gap-3">
                            <h2 className="text-lg font-bold text-history-green flex items-center gap-2">
                                <TrendingUp size={20} /> Progresso das Famílias
                            </h2>
                            <button
                                onClick={loadAllProgress}
                                disabled={isLoadingProgress}
                                className="flex items-center gap-2 px-4 py-2 bg-history-green text-white text-sm font-bold rounded-lg hover:bg-opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                            >
                                <RefreshCw size={14} className={isLoadingProgress ? 'animate-spin' : ''} />
                                {isLoadingProgress ? 'Carregando...' : 'Carregar Progresso Real'}
                            </button>
                        </div>
                        {!Object.keys(progressCache).length && (
                            <div className="text-center py-10 text-stone-400 text-sm">
                                <TrendingUp size={40} className="mx-auto mb-3 opacity-30" />
                                <p>Clique em <strong>"Carregar Progresso Real"</strong> para buscar os dados do Firestore.</p>
                                <p className="text-xs mt-1 text-stone-300">Os dados são carregados em lotes de 5 para economizar leituras do banco.</p>
                            </div>
                        )}
                        {Object.keys(progressCache).length > 0 && (
                        <div className="overflow-x-auto pb-40">
                            <table className="w-full text-sm text-left block md:table">
                                <thead className="text-xs text-stone-500 uppercase bg-stone-50 hidden md:table-header-group">
                                    <tr className="md:table-row block p-2 md:p-0">
                                        <th className="px-4 py-2 block md:table-cell">Representante</th>
                                        <th className="px-4 py-2 text-center block md:table-cell">Total Cadastrados</th>
                                        <th className="px-4 py-2 text-center block md:table-cell" title="Parentes com mais de 50% de perfil preenchido">Perfis &gt;50%</th>
                                        <th className="px-4 py-2 block md:table-cell" style={{minWidth: '150px'}}>Progresso Real</th>
                                        <th className="px-4 py-2 text-center block md:table-cell">Qtd Acessos</th>
                                        <th className="px-4 py-2 text-center block md:table-cell">Último Acesso</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-stone-100 block md:table-row-group">
                                    {families.map(fam => {
                                        const uid = fam.uid || fam.id;
                                        const cache = progressCache[uid];
                                        // lastActivity: gravado pelo App (familyService.js:131) a cada salvamento de membro
                                        // Cadeia de fallback: lastActivity → updatedAt → createdAt → '—'
                                        const lastLoginRaw = fam.lastActivity || fam.updatedAt || fam.createdAt || null;
                                        const lastLogin = lastLoginRaw?.toDate
                                            ? lastLoginRaw.toDate().toLocaleDateString('pt-BR')
                                            : (lastLoginRaw ? new Date(lastLoginRaw).toLocaleDateString('pt-BR') : '—');

                                        return (
                                        <tr key={uid} className="block md:table-row hover:bg-stone-50 group border border-stone-200 md:border-0 rounded-lg md:rounded-none mb-4 md:mb-0 shadow-sm md:shadow-none p-2 md:p-0 relative">
                                            <td className="px-4 py-3 font-medium block md:table-cell border-b border-stone-100 md:border-none flex justify-between items-center text-right md:text-left">
                                                <span className="md:hidden text-[10px] uppercase font-bold text-stone-400">Representante</span>
                                                <span className="max-w-[200px] md:max-w-none truncate">{fam.repName || fam.displayName}</span>
                                            </td>
                                            <td className="px-4 py-3 text-center block md:table-cell border-b border-stone-100 md:border-none flex justify-between items-center text-right md:text-left">
                                                <span className="md:hidden text-[10px] uppercase font-bold text-stone-400">Total Cadastrados</span>
                                                {cache?.loading ? (
                                                    <span className="animate-pulse text-stone-300">...</span>
                                                ) : cache?.loaded ? (
                                                    <span className="font-bold text-history-green">{cache.total}</span>
                                                ) : (
                                                    <button onClick={() => calculateFamilyProgress(fam)} className="text-xs text-blue-500 hover:underline">Carregar</button>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-center block md:table-cell border-b border-stone-100 md:border-none flex justify-between items-center text-right md:text-left">
                                                <span className="md:hidden text-[10px] uppercase font-bold text-stone-400">Perfis &gt;50%</span>
                                                {cache?.loading ? (
                                                    <span className="animate-pulse text-stone-300">...</span>
                                                ) : cache?.loaded ? (
                                                    <span className="font-bold text-blue-600">{cache.good}</span>
                                                ) : <span className="text-stone-300">—</span>}
                                            </td>
                                            <td className="px-4 py-3 block md:table-cell border-b border-stone-100 md:border-none flex flex-col justify-center">
                                                <span className="md:hidden text-[10px] uppercase font-bold text-stone-400 mb-1">Progresso Real</span>
                                                {cache?.loading ? (
                                                    <div className="w-full bg-stone-100 rounded-full h-2.5 mt-1 animate-pulse"></div>
                                                ) : cache?.loaded ? (
                                                    <>
                                                        <div className="w-full bg-stone-200 rounded-full h-2.5 mt-1">
                                                            <div
                                                                className={`h-2.5 rounded-full transition-all ${
                                                                    cache.progresso >= 70 ? 'bg-history-green' :
                                                                    cache.progresso >= 40 ? 'bg-yellow-400' : 'bg-red-400'
                                                                }`}
                                                                style={{ width: `${cache.progresso}%` }}
                                                            ></div>
                                                        </div>
                                                        <span className="text-[10px] text-stone-500 font-bold ml-0.5 mt-0.5">{cache.progresso}% concluído</span>
                                                    </>
                                                ) : (
                                                    <span className="text-stone-300 text-xs">—</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-center block md:table-cell border-b border-stone-100 md:border-none flex justify-between items-center text-right md:text-left">
                                                <span className="md:hidden text-[10px] uppercase font-bold text-stone-400">Qtd Acessos</span>
                                                <span className="text-xs font-bold text-stone-600 bg-stone-100 px-2 py-0.5 rounded">
                                                    {fam.loginCount ?? fam.quantidadeAcessos ?? 0}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-center block md:table-cell border-b border-stone-100 md:border-none flex justify-between items-center text-right md:text-left">
                                                <span className="md:hidden text-[10px] uppercase font-bold text-stone-400">Último Acesso</span>
                                                <span className="text-xs bg-stone-100 px-2 py-0.5 rounded">{lastLogin}</span>
                                            </td>
                                        </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                        )}
                    </div>
                )}
                
                {currentView === 'familias-acoes' && (
                    <div className="bg-white p-6 rounded-lg shadow-sm border border-red-200">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-lg font-bold text-red-600 flex items-center gap-2">
                                <AlertTriangle size={20} /> Ações Críticas de Segurança
                            </h2>
                        </div>
                        <div className="px-4 py-3 mb-4 rounded-lg bg-red-50 border border-red-200 text-red-800 text-sm">
                            <p><strong>Atenção:</strong> As ações desta lista possuem acesso root ao banco de dados. Qualquer operação é definitiva e irreversível.</p>
                        </div>
                        <div className="overflow-x-auto pb-64">
                            <table className="w-full text-sm text-left block md:table">
                                <thead className="text-xs text-stone-500 uppercase bg-stone-50 hidden md:table-header-group">
                                    <tr className="md:table-row block p-2 md:p-0">
                                        <th className="px-4 py-2 block md:table-cell">Representante</th>
                                        <th className="px-4 py-2 block md:table-cell">E-mail</th>
                                        <th className="px-4 py-2 block md:table-cell">ID</th>
                                        <th className="px-4 py-2 text-right block md:table-cell">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-red-100 block md:table-row-group">
                                    {families.filter((fam) => fam.uid || fam.id).map(fam => (
                                        <tr key={`crit-${fam.uid || fam.id}`} className="block md:table-row hover:bg-red-50 group border border-red-200 md:border-b rounded-lg md:rounded-none mb-4 md:mb-0 shadow-sm md:shadow-none p-2 md:p-0 relative">
                                            <td className="px-4 py-3 font-medium block md:table-cell border-b border-stone-100 md:border-none flex justify-between items-center text-right md:text-left">
                                                <span className="md:hidden text-[10px] uppercase font-bold text-stone-400">Representante</span>
                                                <span className="max-w-[200px] md:max-w-none truncate">{fam.repName || fam.displayName}</span>
                                            </td>
                                            <td className="px-4 py-3 text-stone-600 block md:table-cell border-b border-stone-100 md:border-none flex justify-between items-center text-right md:text-left">
                                                <span className="md:hidden text-[10px] uppercase font-bold text-stone-400">E-mail</span>
                                                <span className="break-all">{fam.email}</span>
                                            </td>
                                            <td className="px-4 py-3 text-stone-400 text-xs font-mono block md:table-cell border-b border-stone-100 md:border-none flex justify-between items-center text-right md:text-left">
                                                <span className="md:hidden text-[10px] uppercase font-bold text-stone-400">ID</span>
                                                <span>{fam.uid || fam.id}</span>
                                            </td>
                                            <td className="px-4 py-3 text-right block md:table-cell border-none flex justify-between items-center">
                                                <span className="md:hidden text-[10px] uppercase font-bold text-stone-400">Ações Destrutivas</span>
                                                <div className="flex flex-wrap items-center justify-end gap-2">
                                                    <button
                                                        onClick={() => {
                                                            const newId = prompt("Mover dados de: " + (fam.uid || fam.id) + "\n\nNova UID:");
                                                            if (newId) {
                                                                migrateUserData(fam.uid || fam.id, newId).then(async () => {
                                                                    await logSystemEvent('ACTION', 'admin-management', `Gestão de Dados: Migração ID - ${fam.uid || fam.id} para ${newId}`, user.email, { operador: user.email, status_final: `Migrado para ${newId}` });
                                                                    alert("Migrado");
                                                                }).catch(async (e) => {
                                                                    await logSystemEvent('ERROR', 'admin-system-fail', `Falha na operação administrativa: ${e.message}`, user.email, { error: e.message });
                                                                    alert(e.message);
                                                                });
                                                            }
                                                        }}
                                                        className="px-3 py-1 bg-white border border-stone-300 text-stone-600 rounded text-xs hover:bg-stone-100"
                                                        title="Migrar ID"
                                                    >
                                                        Migrar
                                                    </button>
                                                    <button
                                                        onClick={() => setDangerModalConfig({fam, type: 'ban'})}
                                                        className="px-3 py-1 bg-red-100 text-red-700 rounded text-xs hover:bg-red-200"
                                                        title="Banir/Excluir"
                                                    >
                                                        Banir
                                                    </button>
                                                    {user.role === 'master' && (
                                                        <button
                                                            onClick={() => setDangerModalConfig({fam, type: 'total_ban'})}
                                                            className="px-3 py-1 bg-red-600 text-white font-bold rounded text-xs shadow-sm hover:bg-red-700"
                                                            title="Banir Completamente"
                                                        >
                                                            Banir DB
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                    {/* ----------------- EQUIPE ----------------- */}
                    {currentView === 'equipe-todos' && hasPerm('canViewTeam') && (
                        <div className="bg-white p-6 rounded-lg shadow-sm border border-stone-200">
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-lg font-bold text-history-green">Gestão da Equipe (Administradores)</h2>
                            </div>
                            <div className="overflow-x-auto pb-40">
                                <table className="w-full text-sm text-left">
                                    <thead className="text-xs text-stone-500 uppercase bg-stone-50">
                                        <tr>
                                            <th className="px-4 py-2">Nome</th>
                                            <th className="px-4 py-2">E-mail</th>
                                            <th className="px-4 py-2">Função Atual</th>
                                            <th className="px-4 py-2">Tipo</th>
                                            <th className="px-4 py-2 text-center">Status</th>
                                            <th className="px-4 py-2 text-right">Ações</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-stone-100">
                                        {families.filter(f => f.adminRole && f.adminRole !== 'none').map(fam => (
                                            <tr key={fam.uid || fam.id} className="hover:bg-stone-50">
                                                <td className="px-4 py-3 font-medium">
                                                    {fam.repName || fam.displayName}
                                                    {fam.uid === user.uid && <span className="ml-2 text-xs text-stone-400">(Você)</span>}
                                                </td>
                                                <td className="px-4 py-3 text-stone-600">{fam.email}</td>

                                                {/* Função (Clicável) */}
                                                <td className="px-4 py-3 relative">
                                                    <button
                                                        onClick={() => toggleMenu(`role-${fam.uid || fam.id}`)}
                                                        disabled={((fam.uid || fam.id) === user.uid || fam.email === user.email) || !canModify(fam.adminRole)}
                                                        className={`px-2 py-1 rounded-full text-xs font-bold border-b-2 border-transparent hover:border-stone-300 hover:brightness-95 transition-all
                                                            ${(((fam.uid || fam.id) === user.uid || fam.email === user.email) || !canModify(fam.adminRole)) ? 'opacity-50 cursor-not-allowed' : ''}
                                                            ${fam.adminRole === 'master' ? 'bg-purple-100 text-purple-800' :
                                                                fam.adminRole === 'pleno' ? 'bg-blue-100 text-blue-800' :
                                                                    fam.adminRole ? 'bg-gray-100 text-gray-500' : 'bg-gray-100 text-gray-400'
                                                            }`}
                                                        title={((fam.uid || fam.id) === user.uid || fam.email === user.email) ? "Você não pode editar a si mesmo" : !canModify(fam.adminRole) ? "Nível hierárquico insuficiente" : "Clique para Alterar Patente ou Remover"}
                                                    >
                                                        {fam.adminRole || 'Usuário'}
                                                    </button>

                                                    {/* Role Menu Dropdown */}
                                                    {openMenuId === `role-${fam.uid || fam.id}` && (
                                                        <div className="absolute left-0 top-full mt-1 w-48 bg-white border border-stone-200 shadow-lg rounded-md z-[70] py-1 text-left">
                                                            <div className="px-4 py-2 text-xs font-bold text-stone-400 uppercase border-b border-stone-50">Alterar Patente</div>
                                                            {['basic', 'intermediate', 'pleno', 'master'].map(role => (
                                                                <button
                                                                    key={role}
                                                                    onClick={() => {
                                                                        handleRoleUpdate(fam.uid || fam.id, role, fam.email, fam.adminRole || 'none');
                                                                        setOpenMenuId(null);
                                                                    }}
                                                                    className={`w-full px-4 py-2 text-xs text-stone-700 hover:bg-stone-50 flex items-center gap-2 ${fam.adminRole === role ? 'font-bold bg-green-50' : ''}`}
                                                                >
                                                                    {role.charAt(0).toUpperCase() + role.slice(1)}
                                                                    {fam.adminRole === role && <CheckCircle size={10} className="text-green-600" />}
                                                                </button>
                                                            ))}
                                                            <div className="border-t border-stone-50 my-1"></div>
                                                            {hasPerm('canDeleteUsers') && (
                                                                <button
                                                                    onClick={() => {
                                                                        handleRoleUpdate(fam.uid || fam.id, 'none');
                                                                        setOpenMenuId(null);
                                                                    }}
                                                                    className="w-full px-4 py-2 text-xs text-red-600 hover:bg-red-50 flex items-center gap-2"
                                                                >
                                                                    <Trash2 size={12} /> Remover da Equipe
                                                                </button>
                                                            )}
                                                        </div>
                                                    )}

                                                    {openMenuId === `role-${fam.uid || fam.id}` && (
                                                        <div className="fixed inset-0 z-[60] cursor-default" onClick={() => setOpenMenuId(null)}></div>
                                                    )}
                                                </td>

                                                {/* Obs (Representante?) */}
                                                <td className="px-4 py-3">
                                                    <div className="flex flex-col gap-1 items-start">
                                                        <label className="flex items-center gap-1 text-xs cursor-pointer select-none">
                                                            <input
                                                                type="checkbox"
                                                                checked={!!(fam.isRepresentative !== false && (fam.repName || fam.displayName))}
                                                                onChange={(e) => updateFamilyData(fam.uid || fam.id, { isRepresentative: e.target.checked })}
                                                                disabled={!canModify(fam.adminRole)}
                                                                className="rounded text-history-green focus:ring-history-green w-3 h-3 disabled:opacity-50"
                                                            />
                                                            Repr.
                                                        </label>
                                                        <label className="flex items-center gap-1 text-xs cursor-pointer select-none">
                                                            <input
                                                                type="checkbox"
                                                                checked={!!(fam.adminRole && fam.adminRole !== 'none')}
                                                                onChange={(e) => {
                                                                    if (e.target.checked) handleRoleUpdate(fam.uid || fam.id, 'basic', fam.email, fam.adminRole || 'none');
                                                                    else handleRoleUpdate(fam.uid || fam.id, 'none', fam.email, fam.adminRole || 'none');
                                                                }}
                                                                disabled={!canModify(fam.adminRole)}
                                                                className="rounded text-blue-600 focus:ring-blue-600 w-3 h-3 disabled:opacity-50"
                                                            />
                                                            Membro
                                                        </label>
                                                    </div>
                                                </td>

                                                {/* Status Direto */}
                                                <td className="px-4 py-3 text-center">
                                                    {((fam.uid || fam.id) !== user.uid && fam.email !== user.email && canModify(fam.adminRole)) ? (
                                                        <button
                                                            onClick={() => handleBlockUser(fam.uid || fam.id, fam.status, fam.repName, fam.email)}
                                                            className={`px-3 py-1 rounded-full text-xs font-bold transition-all hover:scale-105 active:scale-95 w-24 ${fam.status === 'Bloqueado' ? 'bg-red-100 text-red-800 hover:bg-red-200' :
                                                                fam.status === 'Ativo' ? 'bg-green-100 text-green-800 hover:bg-green-200' : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                                                                }`}
                                                        >
                                                            {fam.status || 'Ativo'}
                                                        </button>
                                                    ) : (
                                                        <span className="text-stone-300 text-xs italic">N/A</span>
                                                    )}
                                                </td>


                                                <td className="px-4 py-3 text-right">
                                                    {((fam.uid || fam.id) !== user.uid && fam.email !== user.email && canModify(fam.adminRole)) && (
                                                        <div className="relative">
                                                            <button
                                                                onClick={() => toggleMenu(`team-${fam.uid || fam.id}`)}
                                                                className="p-1 rounded hover:bg-stone-100 text-stone-400 hover:text-stone-600"
                                                            >
                                                                <MoreVertical size={16} />
                                                            </button>

                                                            {openMenuId === `team-${fam.uid || fam.id}` && (
                                                                <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-stone-200 shadow-lg rounded-md z-[70] py-1 text-left">
                                                                    <button
                                                                        onClick={async () => {
                                                                            const newName = prompt("Editar Nome:", fam.repName || fam.displayName);
                                                                            if (newName && newName !== (fam.repName || fam.displayName)) {
                                                                                try {
                                                                                    await updateFamilyName(fam.uid || fam.id, newName);
                                                                                    await logSystemEvent('ACTION', 'admin-management', `Gestão de Dados: Edição Nome - ${newName}`, user.email, { operador: user.email, status_final: newName });
                                                                                    setOpenMenuId(null);
                                                                                } catch (e) {
                                                                                    await logSystemEvent('ERROR', 'admin-system-fail', `Falha na operação administrativa: ${e.message}`, user.email, { error: e.message });
                                                                                    alert(e.message);
                                                                                }
                                                                            }
                                                                        }}
                                                                        className="w-full px-4 py-2 text-xs text-stone-700 hover:bg-stone-50 flex items-center gap-2"
                                                                    >
                                                                        <Edit2 size={12} /> Editar Nome
                                                                    </button>
                                                                    <button
                                                                        onClick={async () => {
                                                                            const newEmail = prompt("Novo E-mail do cadastro:\n(Atenção: atualiza apenas o Firestore. O e-mail de login no Auth deve ser ajustado manualmente no Firebase Console.)", fam.email);
                                                                            if (newEmail && newEmail.trim() !== fam.email) {
                                                                                try {
                                                                                    await updateFamilyEmail(fam.uid || fam.id, newEmail);
                                                                                    await logSystemEvent('ACTION', 'admin-management', `Gestão de Dados: Edição E-mail - ${newEmail}`, user.email, { operador: user.email, status_final: newEmail });
                                                                                    showToast(`✅ E-mail atualizado para ${newEmail.trim().toLowerCase()}`);
                                                                                    setOpenMenuId(null);
                                                                                } catch (e) {
                                                                                    await logSystemEvent('ERROR', 'admin-system-fail', `Falha na operação administrativa: ${e.message}`, user.email, { error: e.message });
                                                                                    showToast(`❌ Erro: ${e.message}`, 'error');
                                                                                }
                                                                            }
                                                                        }}
                                                                        className="w-full px-4 py-2 text-xs text-stone-700 hover:bg-stone-50 flex items-center gap-2"
                                                                    >
                                                                        <Mail size={12} /> Editar E-mail
                                                                    </button>
                                                                    <button
                                                                        onClick={() => {
                                                                            setViewFamily(fam);
                                                                            setOpenMenuId(null);
                                                                        }}
                                                                        className="w-full px-4 py-2 text-xs text-stone-700 hover:bg-stone-50 flex items-center gap-2"
                                                                    >
                                                                        <ExternalLink size={12} /> Ver Dados
                                                                    </button>
                                                                </div>
                                                            )}

                                                            {openMenuId === `team-${fam.uid || fam.id}` && (
                                                                <div
                                                                    className="fixed inset-0 z-[60] cursor-default"
                                                                    onClick={() => setOpenMenuId(null)}
                                                                ></div>
                                                            )}
                                                        </div>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )
                }

                    {/* --------------- FERRAMENTAS: MIGRAR ID ---------------- */}
                    {currentView === 'ferramentas-migrar' && hasPerm('canMigrate') && (
                        <div className="max-w-2xl mx-auto">
                            {/* Card de Aviso */}
                            <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
                                <AlertTriangle className="text-amber-500 mt-0.5 shrink-0" size={20} />
                                <div>
                                    <p className="font-bold text-amber-800 text-sm">Ferramenta de Alto Impacto</p>
                                    <p className="text-amber-700 text-xs mt-1 leading-relaxed">
                                        Use esta ferramenta para transferir a titularidade de uma árvore genealógica quando um usuário perde acesso ao e-mail original e cria uma nova conta. A operação <strong>move todos os dados</strong> (documento raiz + subcoleção de membros) da conta de Origem para a de Destino e <strong>apaga a conta Origem</strong>. Esta ação é irreversível.
                                    </p>
                                </div>
                            </div>

                            {/* Card do Formulário */}
                            <div className="bg-white rounded-xl shadow-sm border border-stone-200 overflow-hidden">
                                <div className="px-6 py-4 border-b border-stone-100 bg-stone-50 flex items-center gap-3">
                                    <RefreshCw size={18} className="text-history-green" />
                                    <h3 className="font-bold text-stone-800">Migrar ID de Família</h3>
                                </div>

                                <div className="p-6 space-y-5">
                                    {/* Input Origem */}
                                    <div>
                                        <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-1.5">
                                            ID Atual (Origem)
                                        </label>
                                        <div className="relative">
                                            <input
                                                type="text"
                                                value={migrateOrigemId}
                                                onChange={e => { setMigrateOrigemId(e.target.value.trim()); setMigrateResult(null); }}
                                                placeholder="Cole o UID da conta que possui os dados hoje"
                                                className="w-full border border-stone-300 rounded-lg px-4 py-3 text-sm font-mono text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400 bg-stone-50 placeholder:text-stone-300"
                                                disabled={isMigrating}
                                            />
                                        </div>
                                        <p className="text-[11px] text-stone-400 mt-1">Este ID e seus dados serão apagados após a migração.</p>
                                    </div>

                                    {/* Seta visual */}
                                    <div className="flex items-center justify-center">
                                        <div className="flex flex-col items-center gap-1 text-stone-300">
                                            <div className="w-px h-4 bg-stone-200"></div>
                                            <div className="w-8 h-8 rounded-full border-2 border-stone-200 flex items-center justify-center">
                                                <ChevronDown size={16} className="text-stone-400" />
                                            </div>
                                            <div className="w-px h-4 bg-stone-200"></div>
                                        </div>
                                    </div>

                                    {/* Input Destino */}
                                    <div>
                                        <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-1.5">
                                            Novo ID (Destino)
                                        </label>
                                        <div className="relative">
                                            <input
                                                type="text"
                                                value={migrateDestinoId}
                                                onChange={e => { setMigrateDestinoId(e.target.value.trim()); setMigrateResult(null); }}
                                                placeholder="Cole o UID da nova conta que receberá os dados"
                                                className="w-full border border-stone-300 rounded-lg px-4 py-3 text-sm font-mono text-stone-800 focus:outline-none focus:ring-2 focus:ring-history-green focus:border-history-green bg-stone-50 placeholder:text-stone-300"
                                                disabled={isMigrating}
                                            />
                                        </div>
                                        <p className="text-[11px] text-stone-400 mt-1">Este ID receberá todos os dados da conta de Origem.</p>
                                    </div>

                                    {/* Validação visual em tempo real */}
                                    {migrateOrigemId && migrateDestinoId && migrateOrigemId === migrateDestinoId && (
                                        <div className="flex items-center gap-2 text-red-600 text-xs bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                                            <AlertTriangle size={14} />
                                            <span>O ID de Origem e o de Destino são iguais. Verifique os valores.</span>
                                        </div>
                                    )}

                                    {/* Resultado da operação */}
                                    {migrateResult && (
                                        <div className={`flex items-start gap-2 text-sm rounded-lg px-4 py-3 border ${
                                            migrateResult.status === 'success'
                                                ? 'bg-green-50 border-green-200 text-green-800'
                                                : 'bg-red-50 border-red-200 text-red-800'
                                        }`}>
                                            {migrateResult.status === 'success'
                                                ? <CheckCircle size={16} className="mt-0.5 shrink-0" />
                                                : <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                                            }
                                            <span>{migrateResult.message}</span>
                                        </div>
                                    )}

                                    {/* Botão de Execução */}
                                    <button
                                        disabled={
                                            isMigrating ||
                                            !migrateOrigemId ||
                                            !migrateDestinoId ||
                                            migrateOrigemId === migrateDestinoId
                                        }
                                        onClick={async () => {
                                            if (!window.confirm(
                                                `⚠️ CONFIRMAR MIGRAÇÃO\n\nOrigem: ${migrateOrigemId}\nDestino: ${migrateDestinoId}\n\nEsta ação apagará a conta de Origem após mover todos os dados. Deseja prosseguir?`
                                            )) return;

                                            setIsMigrating(true);
                                            setMigrateResult(null);
                                            try {
                                                const result = await migrateUserData(migrateOrigemId, migrateDestinoId);
                                                await logSystemEvent('ACTION', 'admin-management', `Gestão de Dados: Migração Ferramenta - ${migrateOrigemId} para ${migrateDestinoId}`, user.email, { operador: user.email, status_final: `Migrado para ${migrateDestinoId}` });
                                                setMigrateResult({ status: 'success', message: result.message });
                                                showToast(`✅ ${result.message}`, 'success');
                                                setMigrateOrigemId('');
                                                setMigrateDestinoId('');
                                            } catch (e) {
                                                const msg = e.message || 'Erro inesperado durante a migração.';
                                                await logSystemEvent('ERROR', 'admin-system-fail', `Falha na operação administrativa (Migração): ${msg}`, user.email, { error: msg });
                                                setMigrateResult({ status: 'error', message: msg });
                                                showToast(`❌ Erro: ${msg}`, 'error');
                                            } finally {
                                                setIsMigrating(false);
                                            }
                                        }}
                                        className="w-full flex items-center justify-center gap-2 bg-history-green text-white font-bold py-3 px-6 rounded-xl hover:bg-opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm"
                                    >
                                        {isMigrating ? (
                                            <><RefreshCw size={16} className="animate-spin" /> Migrando dados...</>
                                        ) : (
                                            <><RefreshCw size={16} /> Executar Migração</>
                                        )}
                                    </button>

                                    {/* Resumo do que a operação faz */}
                                    <div className="border-t border-stone-100 pt-4">
                                        <p className="text-[11px] text-stone-400 leading-relaxed">
                                            <strong className="text-stone-500">O que será migrado:</strong> Documento raiz da família (dados do representante) + todos os documentos da subcoleção <code className="bg-stone-100 px-1 rounded">/membros</code>.
                                            Após a migração, o documento de Origem é apagado permanentemente.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    
                    {currentView === 'ferramentas-importar' && (
                        <CsvImporter role={user.role} />
                    )}

                </div>
            </main >

            {/* View Data Modal */}
            {
                viewFamily && (
                    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                        <div className="bg-white w-full max-w-5xl max-h-[90vh] rounded-xl shadow-2xl flex flex-col overflow-hidden animate-fade-in">

                            {/* Header do Modal */}
                            <div className="p-6 border-b border-stone-200 flex justify-between items-start bg-stone-50">
                                <div>
                                    <h3 className="text-2xl font-serif font-bold text-history-green flex items-center gap-2">
                                        <Users size={24} /> Família {viewFamily.repName?.split(' ').pop()}
                                    </h3>
                                    <p className="text-sm text-stone-500 mt-1">
                                        Representante: <span className="font-bold text-stone-700">{viewFamily.repName || viewFamily.displayName}</span>
                                    </p>
                                    <p className="text-xs text-stone-400 font-mono mt-1">ID: {viewFamily.uid || viewFamily.id}</p>
                                </div>
                                <div className="flex gap-2 flex-wrap justify-end">
                                    <button
                                        onClick={() => {
                                            const repName = viewFamily.repName || viewFamily.displayName || 'Representante';
                                            const nomes = viewMembers.map((m, i) => `${i + 1}. ${m.nomeCompleto || m.name || '—'}`).join('\n');
                                            const texto = `Olá ${repName}, aqui está a lista de parentes já cadastrados no Livrão da Família:\n\n${nomes || '(Nenhum membro cadastrado ainda)'}\n\nTotal: ${viewMembers.length} parente(s).`;
                                            window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(texto)}`, '_blank');
                                        }}
                                        className="flex items-center gap-1 bg-green-600 text-white px-3 py-2 rounded-lg text-sm font-bold hover:bg-green-700 transition-colors shadow-sm"
                                        title="Enviar lista de parentes por WhatsApp"
                                    >
                                        <Send size={16} /> Lista por WhatsApp
                                    </button>
                                    <button
                                        onClick={handlePrint}
                                        className="flex items-center gap-1 bg-stone-600 text-white px-3 py-2 rounded-lg text-sm font-bold hover:bg-stone-700 transition-colors shadow-sm"
                                    >
                                        <Printer size={16} /> Relatório PDF
                                    </button>
                                    <button onClick={() => setViewFamily(null)} className="text-stone-400 hover:text-red-500 p-2 rounded-full hover:bg-red-50 transition-colors">
                                        <X size={28} />
                                    </button>
                                </div>
                            </div>

                            {/* COMPONENTE DE IMPRESSÃO (Escondido na tela, visível para o react-to-print) */}
                            <div className="hidden">
                                <PrintableReport ref={componentRef} data={{...viewFamily, members: viewMembers}} />
                            </div>

                            {/* Conteúdo Scrollável */}
                            <div className="flex-1 overflow-y-auto p-8 bg-stone-100/50">
                                {isLoadingMembers ? (
                                    <div className="flex flex-col items-center justify-center h-64 opacity-50">
                                        <RefreshCw className="animate-spin text-stone-500 mb-4" size={32} />
                                        <p className="text-stone-600 font-medium">Carregando dados da família...</p>
                                    </div>
                                ) : (
                                    <>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                                    {/* Cartão 1: Dados Gerais, Contato e Endereço */}
                                    <div className="bg-white p-6 rounded-lg shadow-sm border border-stone-200 space-y-4 h-fit">
                                        <h4 className="text-sm font-bold text-stone-400 uppercase tracking-wider border-b pb-2 mb-4">Dados Gerais</h4>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <label className="text-xs text-stone-500 block">Data de Nascimento</label>
                                                <div className="text-stone-800 font-medium">
                                                    {viewFamily.birthDate || 'Não informado'}
                                                </div>
                                            </div>
                                            <div>
                                                <label className="text-xs text-stone-500 block">Profissão</label>
                                                <div className="text-stone-800 font-medium">
                                                    {viewFamily.profession || 'Não informado'}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-3 pt-2 border-t border-stone-100 mt-2">
                                            <div>
                                                <label className="text-xs text-stone-500 block">E-mail Principal</label>
                                                <div className="text-stone-800 font-medium flex items-center gap-2">
                                                    <Mail size={14} className="text-stone-400" />
                                                    {viewFamily.email || 'Não informado'}
                                                </div>
                                            </div>
                                            <div>
                                                <label className="text-xs text-stone-500 block">Telefone / WhatsApp</label>
                                                <div className="text-stone-800 font-medium">
                                                    {viewFamily.repPhone || viewFamily.telefone || 'Não informado'}
                                                </div>
                                            </div>
                                            <div>
                                                <label className="text-xs text-stone-500 block">Endereço</label>
                                                <div className="text-stone-800">
                                                    {viewFamily.street ? (
                                                        <>
                                                            {viewFamily.street}, {viewFamily.number} {viewFamily.complement}<br />
                                                            {viewFamily.neighborhood} - {viewFamily.city}/{viewFamily.state}<br />
                                                            CEP: {viewFamily.zipCode}
                                                        </>
                                                    ) : (
                                                        <span className="text-stone-400 italic">Endereço não cadastrado</span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Cartão 2: Dados Familiares (Árvore Ascendente) */}
                                    <div className="bg-white p-6 rounded-lg shadow-sm border border-stone-200 space-y-4 h-fit">
                                        {(() => {
                                            // Cálculo de Progresso
                                            const fields = ['repName', 'email', 'repPhone', 'birthDate', 'profession', 'fatherName', 'motherName', 'street'];
                                            let filled = 0;
                                            fields.forEach(f => {
                                                if (viewFamily[f] && viewFamily[f].toString().trim() !== '') filled++;
                                            });
                                            const repProgress = Math.round((filled / fields.length) * 100);

                                            // Helper para buscar campo com múltiplas variações
                                            const v = (keys) => {
                                                if (!Array.isArray(keys)) keys = [keys];
                                                for (let k of keys) {
                                                    if (viewFamily[k]) return viewFamily[k];
                                                }
                                                return null;
                                            };

                                            // 1. Busca Ancestrais nos campos Raiz
                                            let lineageFromRoot = [
                                                { role: 'pai', label: 'Pai', val: v(['fatherName', 'pai', 'filiacao_pai']) },
                                                { role: 'mae', label: 'Mãe', val: v(['motherName', 'mae', 'filiacao_mae']) },
                                                { role: 'avo_p', label: 'Avô Paterno', val: v(['avo_paterno']) },
                                                { role: 'avo_pm', label: 'Avó Paterna', val: v(['avo_paterna']) },
                                                { role: 'avo_m', label: 'Avô Materno', val: v(['avo_materno']) },
                                                { role: 'avo_mm', label: 'Avó Materna', val: v(['avo_materna']) },
                                            ].filter(a => a.val);

                                            // 2. Busca Ancestrais na lista de Membros (Subcoleção)
                                            // Mapa expandido para aceitar códigos E nomes legíveis
                                            const roleMap = {
                                                // Códigos técnicos
                                                'pai': 'Pai', 'mae': 'Mãe',
                                                'avo_paterno': 'Avô Paterno', 'avo_paterna': 'Avó Paterna',
                                                'avo_materno': 'Avô Materno', 'avo_materna': 'Avó Materna',
                                                'bisavo_paterno': 'Bisavô Paterno', 'bisavo_paterna': 'Bisavó Paterna',
                                                'bisavo_materno': 'Bisavô Materno', 'bisavo_materna': 'Bisavó Materna',

                                                // Nomes legíveis (como visto no debug)
                                                'Pai': 'Pai', 'Mãe': 'Mãe',
                                                'Avô Paterno': 'Avô Paterno', 'Avó Paterna': 'Avó Paterna',
                                                'Avô Materno': 'Avô Materno', 'Avó Materna': 'Avó Materna',
                                                'Bisavô Paterno': 'Bisavô Paterno', 'Bisavó Paterna': 'Bisavó Paterna',
                                                'Bisavô Materno': 'Bisavô Materno', 'Bisavó Materna': 'Bisavó Materna'
                                            };

                                            // Função auxiliar para normalizar string (remove acentos e lowercase p/ comparação flexível se necessário)
                                            // Mas por enquanto vamos usar o map direto que é mais seguro

                                            const lineageFromMembers = viewMembers
                                                .filter(m => m.relationshipInfo?.papel && roleMap[m.relationshipInfo.papel]) // Só ancestrais conhecidos
                                                .map(m => ({
                                                    label: roleMap[m.relationshipInfo.papel],
                                                    val: m.nomeCompleto || m.name,
                                                    source: 'member'
                                                }));

                                            // 3. Unifica listas (priorizando Membros se duplicado)
                                            const lineageMap = new Map();
                                            [...lineageFromRoot, ...lineageFromMembers].forEach(item => {
                                                if (!lineageMap.has(item.label) || item.source === 'member') {
                                                    lineageMap.set(item.label, item);
                                                }
                                            });

                                            // Ordenar por importância: Pai/Mãe -> Avós -> Bisavós
                                            const roleOrder = [
                                                'Pai', 'Mãe',
                                                'Avô Paterno', 'Avó Paterna', 'Avô Materno', 'Avó Materna',
                                                'Bisavô Paterno', 'Bisavó Paterna', 'Bisavô Materno', 'Bisavó Materna'
                                            ];
                                            const finalLineage = Array.from(lineageMap.values()).sort((a, b) => {
                                                const idxA = roleOrder.indexOf(a.label);
                                                const idxB = roleOrder.indexOf(b.label);
                                                return (idxA === -1 ? 99 : idxA) - (idxB === -1 ? 99 : idxB);
                                            });

                                            // Helper para formar casais ou retornar solteiros
                                            const getPair = (label1, label2) => {
                                                const p1 = finalLineage.find(x => x.label === label1)?.val;
                                                const p2 = finalLineage.find(x => x.label === label2)?.val;
                                                if (p1 && p2) return `${p1} e ${p2}`;
                                                if (p1) return p1;
                                                if (p2) return p2;
                                                return null;
                                            };

                                            // Grupos Geracionais
                                            const parentsLine = getPair('Pai', 'Mãe');

                                            const grandParentsLines = [
                                                getPair('Avô Paterno', 'Avó Paterna'),
                                                getPair('Avô Materno', 'Avó Materna')
                                            ].filter(Boolean);

                                            const greatGrandParentsLines = [
                                                getPair('Bisavô Paterno', 'Bisavó Paterna'),
                                                getPair('Bisavô Materno', 'Bisavó Materna')
                                            ].filter(Boolean);

                                            return (
                                                <>
                                                    <div className="flex justify-between items-center border-b pb-2 mb-4">
                                                        <h4 className="text-sm font-bold text-stone-400 uppercase tracking-wider">Dados Familiares</h4>
                                                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${repProgress >= 100 ? 'bg-green-100 text-green-800' :
                                                            repProgress >= 50 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'
                                                            }`}>
                                                            {repProgress}%
                                                        </span>
                                                    </div>

                                                    <div className="w-full bg-stone-100 rounded-full h-1.5 mb-4 overflow-hidden">
                                                        <div className={`h-full rounded-full transition-all duration-500 ${repProgress >= 100 ? 'bg-history-green' : repProgress >= 50 ? 'bg-yellow-400' : 'bg-red-400'}`} style={{ width: `${repProgress}%` }}></div>
                                                    </div>

                                                    <div className="space-y-5 mt-4">
                                                        {parentsLine && (
                                                            <div>
                                                                <h5 className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-1 border-b border-stone-100 pb-0.5">Pais</h5>
                                                                <p className="text-stone-800 text-sm font-medium">{parentsLine}</p>
                                                            </div>
                                                        )}

                                                        {grandParentsLines.length > 0 && (
                                                            <div>
                                                                <h5 className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-1 border-b border-stone-100 pb-0.5">Avós</h5>
                                                                <div className="space-y-1">
                                                                    {grandParentsLines.map((line, idx) => (
                                                                        <p key={idx} className="text-stone-800 text-sm font-medium">{line}</p>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )}

                                                        {greatGrandParentsLines.length > 0 && (
                                                            <div>
                                                                <h5 className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-1 border-b border-stone-100 pb-0.5">Bisavós</h5>
                                                                <div className="space-y-1">
                                                                    {greatGrandParentsLines.map((line, idx) => (
                                                                        <p key={idx} className="text-stone-800 text-sm font-medium">{line}</p>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )}

                                                        {!parentsLine && grandParentsLines.length === 0 && greatGrandParentsLines.length === 0 && (
                                                            <div className="text-stone-400 italic text-sm text-center py-4">Nenhum dado de filiação encontrado.</div>
                                                        )}
                                                    </div>
                                                </>
                                            );
                                        })()}
                                    </div>

                                </div>

                                {/* Seção: Membros da Família */}
                                <div className="mt-8">
                                    <h4 className="text-lg font-bold text-history-green mb-4 flex items-center gap-2">
                                        <Users size={20} /> Composição Familiar
                                        <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">{viewMembers.length} membros</span>
                                    </h4>

                                    {isLoadingMembers ? (
                                        <div className="text-center py-8 text-stone-400 animate-pulse">Carregando membros...</div>
                                    ) : viewMembers.length > 0 ? (
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                            {viewMembers.map((member, idx) => (
                                                <div
                                                    key={idx}
                                                    onClick={() => setSelectedMember(member)}
                                                    className="bg-white p-4 rounded-lg border border-stone-200 hover:shadow-md transition-shadow relative overflow-hidden group cursor-pointer hover:border-green-300"
                                                >
                                                    <div className={`absolute top-0 left-0 w-1 h-full ${member.relationshipInfo?.papel === 'conjuge' ? 'bg-pink-400' :
                                                        member.relationshipInfo?.papel === 'filho' ? 'bg-blue-400' : 'bg-stone-300'
                                                        }`}></div>

                                                    <div className="pl-3">
                                                        <div className="flex justify-between items-start">
                                                            <h5 className="font-bold text-stone-800 text-sm truncate pr-2 group-hover:text-green-700 transition-colors">{member.nomeCompleto || member.name}</h5>
                                                            <span className="text-[10px] uppercase font-bold text-stone-400 bg-stone-100 px-1.5 py-0.5 rounded group-hover:bg-green-50 group-hover:text-green-600">
                                                                {member.relationshipInfo?.papel || 'Membro'}
                                                            </span>
                                                        </div>

                                                        <div className="mt-2 space-y-1">
                                                            {/* Barra de Progresso */}
                                                            <div className="w-full bg-stone-100 rounded-full h-1.5 mb-2 mt-1 relative overflow-hidden">
                                                                <div
                                                                    className={`h-full rounded-full transition-all duration-500 ${(member.completion || 0) >= 100 ? 'bg-history-green' :
                                                                        (member.completion || 0) >= 50 ? 'bg-yellow-400' : 'bg-red-400'
                                                                        }`}
                                                                    style={{ width: `${member.completion || 10}%` }}
                                                                ></div>
                                                            </div>

                                                            <p className="text-xs text-stone-500 flex items-center gap-1">
                                                                <span className="font-bold">Nasc:</span> {member.dataNascimento || '-'}
                                                            </p>
                                                            {member.email && (
                                                                <p className="text-xs text-stone-500 truncate" title={member.email}>
                                                                    {member.email}
                                                                </p>
                                                            )}
                                                            {member.phones?.mobile && (
                                                                <p className="text-xs text-stone-500">
                                                                    {member.phones.mobile}
                                                                </p>
                                                            )}
                                                            <p className="text-[10px] text-stone-400 mt-2 italic text-right">Clique para ver detalhes →</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="bg-stone-50 border border-stone-200 rounded-lg p-8 text-center text-stone-500 italic">
                                            Nenhum membro adicional cadastrado nesta família (apenas o Representante).
                                        </div>
                                    )}
                                </div>

                                {/* Seção: Dados Crus removida para limpeza visual */}
                                    </>
                                )}
                            </div>

                            {/* Footer */}
                            <div className="p-4 border-t border-stone-200 flex justify-end bg-white">
                                <button
                                    onClick={() => setViewFamily(null)}
                                    className="px-6 py-2 bg-stone-800 text-white rounded-md hover:bg-stone-900 font-bold text-sm shadow-md transition-all hover:translate-y-px"
                                >
                                    Fechar Ficha
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Hidden Member Report (For Printing) */}
            <div className="hidden">
                <PrintableReport ref={memberPrintRef} data={selectedMember} />
            </div>

            {/* Member Details Modal (Overlay) */}
            {
                selectedMember && (
                    <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4 animate-fade-in">
                        <div className="bg-white w-full max-w-2xl max-h-[85vh] rounded-xl shadow-2xl flex flex-col overflow-hidden">
                            <div className="p-4 border-b border-stone-200 flex justify-between items-center bg-stone-50">
                                <div>
                                    <h3 className="text-xl font-bold text-stone-800 flex items-center gap-2">
                                        {selectedMember.nomeCompleto || selectedMember.name}
                                    </h3>
                                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full uppercase ${selectedMember.relationshipInfo?.papel === 'conjuge' ? 'bg-pink-100 text-pink-700' :
                                        selectedMember.relationshipInfo?.papel === 'filho' ? 'bg-blue-100 text-blue-700' : 'bg-stone-100 text-stone-600'
                                        }`}>
                                        {selectedMember.relationshipInfo?.papel || 'Membro'}
                                    </span>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={handlePrintMember}
                                        className="flex items-center gap-1 bg-stone-600 text-white px-3 py-1 rounded-lg text-xs font-bold hover:bg-stone-700 transition-colors shadow-sm"
                                    >
                                        <Printer size={14} /> Imprimir Ficha
                                    </button>
                                    <button onClick={() => setSelectedMember(null)} className="text-stone-400 hover:text-stone-600 p-1">
                                        <X size={24} />
                                    </button>
                                </div>
                            </div>

                            <div className="p-6 overflow-y-auto bg-white space-y-6">
                                {/* 1. História de Vida (Peso 35%) */}
                                <section>
                                    <h4 className="text-sm font-bold text-history-green uppercase border-b border-green-100 pb-2 mb-4 flex items-center gap-2">
                                        <span className="bg-green-100 p-1 rounded-full"><BookOpen size={14} /></span> Memórias Vivas
                                    </h4>
                                    <div className="space-y-4">
                                        <div>
                                            <label className="text-xs text-stone-500 font-bold uppercase tracking-wide mb-1 block">Resumo Histórico</label>
                                            <div className="text-sm text-stone-700 bg-stone-50 p-3 rounded-lg border border-stone-100 whitespace-pre-line leading-relaxed">
                                                {selectedMember.resumoHistorico || <span className="text-stone-400 italic">Nenhum resumo histórico registrado.</span>}
                                            </div>
                                        </div>
                                        <div>
                                            <label className="text-xs text-stone-500 font-bold uppercase tracking-wide mb-1 block">Relatos Adicionais</label>
                                            <div className="text-sm text-stone-700 bg-stone-50 p-3 rounded-lg border border-stone-100 whitespace-pre-line leading-relaxed">
                                                {selectedMember.relatosAdicionais || <span className="text-stone-400 italic">Nenhum relato adicional.</span>}
                                            </div>
                                        </div>
                                    </div>
                                </section>

                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                    {/* Coluna da Esquerda */}
                                    <div className="space-y-8">
                                        {/* 2. Identidade e Origem */}
                                        <section>
                                            <h4 className="text-xs font-bold text-stone-400 uppercase border-b pb-1 mb-3">Identidade & Origem</h4>
                                            <div className="space-y-3">
                                                <div>
                                                    <label className="text-xs text-stone-500">Nome Completo</label>
                                                    <p className="font-medium text-stone-800">{selectedMember.nomeCompleto || selectedMember.name || '-'}</p>
                                                </div>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div>
                                                        <label className="text-xs text-stone-500">Apelido / Hebraico</label>
                                                        <p className="font-medium text-stone-800">{selectedMember.apelido || '-'}</p>
                                                    </div>
                                                    <div>
                                                        <label className="text-xs text-stone-500">Sobrenomes Solteiro(a)</label>
                                                        <p className="font-medium text-stone-800">{selectedMember.sobrenomesSolteiro || '-'}</p>
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div>
                                                        <label className="text-xs text-stone-500">Nascimento</label>
                                                        <p className="font-medium text-stone-800">{selectedMember.dataNascimento || '-'}</p>
                                                    </div>
                                                    <div>
                                                        <label className="text-xs text-stone-500">Local</label>
                                                        <p className="font-medium text-stone-800">{[selectedMember.localNascimento_cidade, selectedMember.localNascimento_pais].filter(Boolean).join(', ') || '-'}</p>
                                                    </div>
                                                </div>
                                                <div>
                                                    <label className="text-xs text-stone-500">Religião</label>
                                                    <p className="font-medium text-stone-800">{selectedMember.religiao || '-'}</p>
                                                </div>
                                            </div>
                                        </section>

                                        {/* 3. Filiação */}
                                        <section>
                                            <h4 className="text-xs font-bold text-stone-400 uppercase border-b pb-1 mb-3">Filiação</h4>
                                            <div className="space-y-3">
                                                <div>
                                                    <label className="text-xs text-stone-500">Nome do Pai</label>
                                                    <p className="font-medium text-stone-800">{selectedMember.nomePai || selectedMember.filiacao_pai || '-'}</p>
                                                </div>
                                                <div>
                                                    <label className="text-xs text-stone-500">Nome da Mãe</label>
                                                    <p className="font-medium text-stone-800">{selectedMember.nomeMae || selectedMember.filiacao_mae || '-'}</p>
                                                </div>
                                            </div>
                                        </section>
                                        {/* 4. Família e Vida */}
                                        <section>
                                            <h4 className="text-xs font-bold text-stone-400 uppercase border-b pb-1 mb-3">Família & Vida</h4>
                                            <div className="grid grid-cols-2 gap-4 mb-3">
                                                <div>
                                                    <label className="text-xs text-stone-500">Situação Conjugal</label>
                                                    <p className="font-medium text-stone-800">{selectedMember.situacaoConjugal || selectedMember.estadoCivil || '-'}</p>
                                                </div>
                                                <div>
                                                    <label className="text-xs text-stone-500">Filhos</label>
                                                    <p className="font-medium text-stone-800">{selectedMember.qtdFilhos || '-'}</p>
                                                </div>
                                            </div>
                                            {(selectedMember.dataCasamento || selectedMember.nomeConjuge) && (
                                                <div className="bg-stone-50 p-3 rounded border border-stone-100">
                                                    <p className="text-[10px] font-bold text-stone-400 mb-2 uppercase">Casamento</p>
                                                    <div className="space-y-2">
                                                        <div>
                                                            <label className="text-xs text-stone-500">Cônjuge</label>
                                                            <p className="text-sm font-medium text-stone-800">{selectedMember.nomeConjuge || '-'}</p>
                                                        </div>
                                                        <div className="grid grid-cols-2 gap-2">
                                                            <div>
                                                                <label className="text-xs text-stone-500">Data</label>
                                                                <p className="text-sm font-medium text-stone-800">{selectedMember.dataCasamento || '-'}</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </section>
                                    </div>

                                    {/* Coluna da Direita */}
                                    <div className="space-y-8">

                                        {/* 5. Educação e Trabalho */}
                                        <section>
                                            <h4 className="text-xs font-bold text-stone-400 uppercase border-b pb-1 mb-3">Educação & Trabalho</h4>
                                            <div className="space-y-3">
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div>
                                                        <label className="text-xs text-stone-500">Grau de Instrução</label>
                                                        <p className="font-medium text-stone-800">{selectedMember.grauInstrucao || '-'}</p>
                                                    </div>
                                                    <div>
                                                        <label className="text-xs text-stone-500">Ocupação</label>
                                                        <p className="font-medium text-stone-800">{selectedMember.ocupacaoPrincipal || selectedMember.profissao || '-'}</p>
                                                    </div>
                                                </div>
                                                <div>
                                                    <label className="text-xs text-stone-500">Locais de Trabalho</label>
                                                    <p className="font-medium text-stone-800 text-sm">{selectedMember.locaisTrabalho || '-'}</p>
                                                </div>
                                                <div>
                                                    <label className="text-xs text-stone-500">Escolas e Universidades</label>
                                                    <p className="font-medium text-stone-800 text-sm">{selectedMember.escolasUniversidades || '-'}</p>
                                                </div>
                                            </div>
                                        </section>

                                        {/* 6. Vida Comunitária & Hobbies */}
                                        <section>
                                            <h4 className="text-xs font-bold text-stone-400 uppercase border-b pb-1 mb-3">Vida Comunitária & Cultura</h4>
                                            <div className="space-y-3">
                                                <div>
                                                    <label className="text-xs text-stone-500">Sinagoga</label>
                                                    <p className="font-medium text-stone-800">{selectedMember.sinagogaFrequentava || '-'}</p>
                                                </div>
                                                <div>
                                                    <label className="text-xs text-stone-500">Atuação Comunitária</label>
                                                    <p className="font-medium text-stone-800 text-sm">{selectedMember.atuacaoComunitaria || '-'}</p>
                                                </div>
                                                <div>
                                                    <label className="text-xs text-stone-500">Realizações/Prêmios</label>
                                                    <p className="font-medium text-stone-800 text-sm">{selectedMember.realizacoesPremios || '-'}</p>
                                                </div>
                                                <div>
                                                    <label className="text-xs text-stone-500">Hobbies</label>
                                                    <p className="font-medium text-stone-800 text-sm">{selectedMember.hobbies || '-'}</p>
                                                </div>
                                            </div>
                                        </section>

                                        {/* 7. Lugares e Amigos */}
                                        <section>
                                            <h4 className="text-xs font-bold text-stone-400 uppercase border-b pb-1 mb-3">Lugares & Amizades</h4>
                                            <div className="space-y-3">
                                                <div>
                                                    <label className="text-xs text-stone-500">Cidades Onde Morou</label>
                                                    <p className="font-medium text-stone-800 text-sm whitespace-pre-line">{selectedMember.cidadesMorou || '-'}</p>
                                                </div>
                                                <div>
                                                    <label className="text-xs text-stone-500">Amizades Marcantes</label>
                                                    <p className="font-medium text-stone-800 text-sm whitespace-pre-line">{selectedMember.amizadesMarcantes || '-'}</p>
                                                </div>
                                            </div>
                                        </section>
                                    </div>
                                </div>

                                {/* 8. Falecimento (Se houver) */}
                                {(selectedMember.situacaoVital === 'Falecido' || selectedMember.dataFalecimento || selectedMember.cemiterio) && (
                                    <section className="bg-red-50 p-4 rounded-lg border border-red-100 mt-4">
                                        <h4 className="text-xs font-bold text-red-700 uppercase mb-3 flex items-center gap-2">
                                            Falecimento (Z'L)
                                        </h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <label className="text-xs text-red-400">Data de Falecimento</label>
                                                <p className="font-medium text-red-900">{selectedMember.dataFalecimento || '-'}</p>
                                            </div>
                                            <div>
                                                <label className="text-xs text-red-400">Cemitério / Local</label>
                                                <p className="font-medium text-red-900">{selectedMember.cemiterio || selectedMember.localSepultamento || '-'}</p>
                                            </div>
                                            <div className="md:col-span-2">
                                                <label className="text-xs text-red-400">Local do Óbito</label>
                                                <p className="font-medium text-red-900">{selectedMember.localFalecimento || '-'}</p>
                                            </div>
                                        </div>
                                    </section>
                                )}

                                {/* Debug JSON removido */}
                            </div>

                            <div className="p-4 bg-stone-50 border-t border-stone-200 text-right">
                                <button
                                    onClick={() => setSelectedMember(null)}
                                    className="px-5 py-2 bg-stone-200 text-stone-700 rounded hover:bg-stone-300 font-bold text-sm"
                                >
                                    Voltar
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* View: sistema-logs */}
            {currentView === 'sistema-logs' && (
                <div className="bg-white p-6 rounded-lg shadow-sm border border-stone-200">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-lg font-bold text-history-green flex items-center gap-2">
                            <AlertTriangle size={20} /> Monitoramento do Sistema (Últimos {systemLogs.length} logs)
                        </h2>
                        {isLoadingLogs && <span className="animate-pulse text-stone-400 text-sm">Atualizando...</span>}
                    </div>

                    <div className="space-y-4">
                        {logsRestricted ? (
                            <div className="flex flex-col items-center justify-center py-12 text-center text-stone-400">
                                <span className="text-4xl mb-3">🔒</span>
                                <p className="font-semibold text-stone-600">Acesso restrito aos logs</p>
                                <p className="text-sm mt-1">Apenas administradores com perfil <strong>super-admin</strong> podem visualizar o monitoramento do sistema.</p>
                            </div>
                        ) : Object.entries(
                            systemLogs.reduce((acc, log) => {
                                const email = log.userEmail || "Sistema / Não Identificado";
                                if (!acc[email]) acc[email] = { logs: [], errorCount: 0, infoCount: 0 };
                                acc[email].logs.push(log);
                                if (log.type === 'ERROR') acc[email].errorCount++;
                                else acc[email].infoCount++;
                                return acc;
                            }, {})
                        ).map(([email, data]) => (
                            <details key={email} className="group bg-stone-50 border border-stone-200 rounded-lg overflow-hidden">
                                <summary className="cursor-pointer bg-white p-4 flex flex-col md:flex-row md:items-center justify-between hover:bg-stone-50 transition-colors list-none">
                                    <div className="flex items-center gap-3">
                                        <ChevronDown size={18} className="text-stone-400 group-open:rotate-180 transition-transform" />
                                        <span className="font-bold text-stone-800 break-all">{email}</span>
                                    </div>
                                    <div className="flex items-center gap-3 mt-2 md:mt-0 pl-7 md:pl-0">
                                        {data.errorCount > 0 && (
                                            <span className="bg-red-100 text-red-700 text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1">
                                                <AlertTriangle size={12} /> {data.errorCount} Erros
                                            </span>
                                        )}
                                        <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-1 rounded-full">
                                            {data.infoCount} Infos
                                        </span>
                                    </div>
                                </summary>
                                <div className="p-0 border-t border-stone-200">
                                    <table className="w-full text-sm text-left">
                                        <tbody className="divide-y divide-stone-100">
                                            {data.logs.map((log, idx) => (
                                                <tr key={log.id || idx} 
                                                    className="hover:bg-stone-100 cursor-pointer transition-colors block md:table-row bg-white md:bg-transparent"
                                                    onClick={() => setLogDetailsModal(log)}
                                                >
                                                    <td className="px-4 py-3 whitespace-nowrap text-stone-500 md:w-32 font-mono text-xs block md:table-cell border-b md:border-b-0">
                                                        <span className="md:hidden font-bold mr-2 uppercase text-[10px]">Data:</span>
                                                        {log.timestamp?.toDate ? log.timestamp.toDate().toLocaleString() : 'Sem data'}
                                                    </td>
                                                    <td className="px-4 py-3 md:w-24 block md:table-cell border-b md:border-b-0">
                                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                                                            log.type === 'ERROR' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                                                        }`}>
                                                            {log.type}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 text-stone-700 max-w-xs md:max-w-md truncate block md:table-cell border-b md:border-b-0">
                                                        {log.message}
                                                    </td>
                                                    <td className="px-4 py-3 md:w-20 text-stone-400 block md:table-cell text-right md:text-left">
                                                        <span className="text-xs text-stone-400 underline md:hidden mr-2">Ver detalhes</span>
                                                        <ChevronRight size={16} className="ml-auto hidden md:block" />
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </details>
                        ))}
                        {systemLogs.length === 0 && !isLoadingLogs && !logsRestricted && (
                            <div className="text-center py-12 text-stone-400 bg-stone-50 rounded-lg border border-stone-200 border-dashed">Nenhum log encontrado no sistema.</div>
                        )}
                    </div>
                </div>
            )}

            {/* Tree Report Modal */}
            {
                treeFamily && (
                    <FamilyTreeReport
                        family={treeFamily}
                        members={viewMembers}
                        isLoading={isLoadingMembers}
                        onClose={() => setTreeFamily(null)}
                    />
                )
            }


            {/* DANGER ZONE MODAL */}
            {dangerModalConfig && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 overflow-y-auto">
                    <div className="bg-white rounded-lg shadow-2xl w-full max-w-md my-8 flex flex-col max-h-[90vh]">
                        <div className="p-4 border-b border-red-200 bg-red-50 flex justify-between items-center rounded-t-lg">
                            <h2 className="text-xl font-bold flex gap-2 items-center text-red-700">
                                <AlertTriangle className="text-red-600" /> 
                                {dangerModalConfig.type === 'total_ban' ? 'Banimento Total (DB)' : 'Excluir Acesso'}
                            </h2>
                            <button onClick={() => { setDangerModalConfig(null); setDangerModalInput(''); }} className="text-stone-500 hover:text-stone-700">
                                <X size={24} />
                            </button>
                        </div>
                        <div className="p-6 flex-1 overflow-y-auto">
                            <p className="mb-4 text-stone-700">Você está prestes a realizar uma ação <strong>irreversível</strong>.</p>
                            <p className="mb-4 text-stone-600 border-l-4 border-red-500 pl-3">
                                Família: <strong>{dangerModalConfig.fam.repName || dangerModalConfig.fam.displayName}</strong><br/>
                                E-mail: <strong>{dangerModalConfig.fam.email}</strong><br/>
                                Ação selecionada: <strong>{dangerModalConfig.type === 'total_ban' ? 'APAGAR TUDO (Inclusive fotos e parentes)' : 'REMOVER ACESSO DE LOGIN'}</strong>
                            </p>
                            <p className="mb-2 font-bold text-sm">Para confirmar, digite o e-mail da família abaixo:</p>
                            <input 
                                type="text"
                                className="w-full border-2 border-stone-300 p-2 rounded-lg text-center font-bold"
                                placeholder={dangerModalConfig.fam.email}
                                value={dangerModalInput}
                                onChange={(e) => setDangerModalInput(e.target.value)}
                            />
                        </div>
                        <div className="p-4 border-t border-stone-200 bg-stone-50 flex justify-end gap-3 rounded-b-lg">
                            <button 
                                onClick={() => { setDangerModalConfig(null); setDangerModalInput(''); }}
                                className="px-4 py-2 bg-stone-200 text-stone-700 rounded-lg hover:bg-stone-300 font-bold"
                            >
                                Cancelar
                            </button>
                            <button 
                                disabled={dangerModalInput !== dangerModalConfig.fam.email}
                                onClick={() => {
                                    if (dangerModalConfig.type === 'total_ban') {
                                        handleCompleteBan(dangerModalConfig.fam.uid || dangerModalConfig.fam.id, dangerModalConfig.fam.email, dangerModalConfig.fam.repName || dangerModalConfig.fam.displayName);
                                    } else {
                                        handleDeleteFamily(dangerModalConfig.fam.uid || dangerModalConfig.fam.id, dangerModalConfig.fam.repName || dangerModalConfig.fam.displayName);
                                    }
                                    setDangerModalConfig(null);
                                    setDangerModalInput('');
                                }}
                                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-bold disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                            >
                                {dangerModalConfig.type === 'total_ban' ? 'Apagar Definitivamente' : 'Banir Família'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* SYSTEM LOG MODAL */}
            {logDetailsModal && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-[90] overflow-y-auto" onClick={() => setLogDetailsModal(null)}>
                    <div className="bg-white rounded-lg shadow-2xl w-full max-w-2xl my-8 flex flex-col max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
                        <div className="p-4 border-b border-stone-200 bg-stone-50 flex justify-between items-center rounded-t-lg shrink-0">
                            <h2 className="text-lg font-bold flex gap-2 items-center text-stone-800">
                                {logDetailsModal.type === 'ERROR' ? <AlertTriangle className="text-red-500" /> : <CheckCircle className="text-blue-500" />}
                                Detalhes do Evento
                            </h2>
                            <button onClick={() => setLogDetailsModal(null)} className="text-stone-500 hover:text-stone-700">
                                <X size={24} />
                            </button>
                        </div>
                        <div className="p-6 flex-1 overflow-y-auto space-y-4 font-mono text-sm leading-relaxed">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-stone-50 p-4 rounded-lg border border-stone-200">
                                <div>
                                    <span className="text-[10px] uppercase font-bold text-stone-400 block mb-1">Data/Hora</span>
                                    <span className="text-stone-800">{logDetailsModal.timestamp?.toDate ? logDetailsModal.timestamp.toDate().toLocaleString() : 'N/A'}</span>
                                </div>
                                <div>
                                    <span className="text-[10px] uppercase font-bold text-stone-400 block mb-1">Tipo</span>
                                    <span className={logDetailsModal.type === 'ERROR' ? 'text-red-600 font-bold' : 'text-blue-600 font-bold'}>{logDetailsModal.type}</span>
                                </div>
                                <div>
                                    <span className="text-[10px] uppercase font-bold text-stone-400 block mb-1">Módulo</span>
                                    <span className="text-stone-800">{logDetailsModal.module || 'N/A'}</span>
                                </div>
                                <div>
                                    <span className="text-[10px] uppercase font-bold text-stone-400 block mb-1">Usuário</span>
                                    <span className="text-stone-800 break-all">{logDetailsModal.userEmail || 'Sistema/Anônimo'}</span>
                                </div>
                            </div>
                            
                            <div>
                                <span className="text-[10px] uppercase font-bold text-stone-400 block mb-2">Mensagem</span>
                                <div className="bg-white border border-stone-200 p-3 rounded text-stone-700 whitespace-pre-wrap">
                                    {logDetailsModal.message}
                                </div>
                            </div>

                            {logDetailsModal.metadata && Object.keys(logDetailsModal.metadata).length > 0 && (
                                <div>
                                    <span className="text-[10px] uppercase font-bold text-stone-400 block mb-2">Metadados Técnicos (JSON)</span>
                                    <pre className="bg-stone-900 border border-stone-800 p-4 rounded text-stone-300 overflow-x-auto text-[11px] leading-relaxed">
                                        {JSON.stringify(logDetailsModal.metadata, null, 2)}
                                    </pre>
                                </div>
                            )}
                        </div>
                        <div className="p-4 border-t border-stone-200 bg-stone-50 flex justify-end gap-3 rounded-b-lg shrink-0">
                            <button 
                                onClick={() => setLogDetailsModal(null)}
                                className="px-4 py-2 bg-stone-200 text-stone-700 rounded-lg hover:bg-stone-300 font-bold"
                            >
                                Fechar
                            </button>
                        </div>
                    </div>
                </div>
            )}
            
            {/* TOAST NOTIFICATION */}
            {toastMessage && (
                <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] px-6 py-3 rounded-xl shadow-2xl text-white font-bold text-sm flex items-center gap-3 animate-fade-in ${
                    toastMessage.type === 'error' ? 'bg-red-600' : 'bg-history-green'
                }`}>
                    {toastMessage.type === 'error' ? <AlertTriangle size={18} /> : <CheckCircle size={18} />}
                    {toastMessage.msg}
                </div>
            )}
        </div >
    );
};
