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
import { CsvImporter } from './components/CsvImporter';
import { Users, Mail, RefreshCw, LogOut, Copy, CheckCircle, ExternalLink, MoreVertical, Trash2, Edit2, X, Save, Ban, Unlock, BookOpen, Eye, Filter, Download, Upload, Network, Book, Send } from 'lucide-react';
import { FamilyTreeReport } from './components/FamilyTreeReport';
import { createInvite, subscribeToFamilies, subscribeToInvites, updateUserRole, deleteInvite, updateInvite, toggleUserBlock, migrateUserData, updateFamilyName, fetchFamilyMembers, updateFamilyData, deleteFamilyRecord, resendInvite, completeBan } from './services/api';
import { useRef } from 'react';
import { useReactToPrint } from 'react-to-print';
import { PrintableReport } from './components/PrintableReport';
import { Printer } from 'lucide-react';

export const AdminDashboard = ({ user, onLogout }) => {
    // Tabs: 'invites' | 'families' | 'team' (Master only)
    const [activeTab, setActiveTab] = useState('invites');

    // Data State
    const [families, setFamilies] = useState([]);
    const [invites, setInvites] = useState([]);

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

    const [lastInvite, setLastInvite] = useState(null); // Stores data for the success message

    const handleInviteCreate = async () => {
        if (!inviteData.repName || !inviteData.email) return alert("Preencha todos os campos.");

        setIsSubmitting(true);
        setGeneratedLink('');
        setLastInvite(null);

        const result = await createInvite(user.uid, inviteData);

        if (result.status === 'success') {
            setGeneratedLink(result.link);
            // Save details for the buttons before clearing form
            setLastInvite({
                ...inviteData,
                link: result.link
            });
            setInviteData({ ...inviteData, repName: '', email: '', repPhone: '' });
        } else {
            alert(result.message);
        }
        setIsSubmitting(false);
    };

    const copyToClipboard = () => {
        navigator.clipboard.writeText(generatedLink);
        alert("Link copiado para a área de transferência!");
    };

    // Helper to clean phone for WhatsApp link
    const cleanPhone = (phone) => {
        if (!phone) return '';
        return phone.replace(/\D/g, ''); // Removes all non-digits
    };

    // ... (rest of code) ...

    // RENDER SECTION (Inside the Conditional Render for generatedLink)
    // We replace the entire block inside {generatedLink && (...)}

    /* ... inside render ... */

    const handleRoleUpdate = async (uid, newRole) => {
        if (!confirm(`Tem certeza que deseja alterar o nível de acesso para '${newRole}'?`)) return;
        const result = await updateUserRole(uid, newRole);
        if (result.status === 'success') {
            alert("Permissão atualizada!");
        } else {
            alert(result.message);
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

    const [showPermissions, setShowPermissions] = useState(false);

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

    // Save on Change
    const updatePermission = (role, action, value) => {
        const newPerms = { ...permissions, [role]: { ...permissions[role], [action]: value } };
        setPermissions(newPerms);
        localStorage.setItem('appPermissions', JSON.stringify(newPerms));
    };

    const [viewMembers, setViewMembers] = useState([]);
    const [selectedMember, setSelectedMember] = useState(null);
    const [isLoadingMembers, setIsLoadingMembers] = useState(false);

    useEffect(() => {
        if (viewFamily) {
            setIsLoadingMembers(true);
            fetchFamilyMembers(viewFamily.uid || viewFamily.id)
                .then(members => setViewMembers(members))
                .catch(err => console.error(err))
                .finally(() => setIsLoadingMembers(false));
        } else {
            setViewMembers([]);
        }
    }, [viewFamily]);

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

    const handleBlockUser = async (uid, currentStatus) => {
        const action = currentStatus === 'Bloqueado' ? 'Desbloquear' : 'Bloquear';
        if (confirm(`Tem certeza que deseja ${action} este usuário?`)) {
            const res = await toggleUserBlock(uid, currentStatus);
            if (res.status === 'success') {
                alert(res.message);
            } else {
                alert(res.message);
            }
            setOpenMenuId(null);
        }
    };

    const handleDeleteFamily = async (id, name) => {
        // Restrição Rigorosa: Apenas Master (3) e Pleno (4)
        // Hardcoded para segurança, além da permissão configurável
        const userRank = getRank(user.role);
        const isSuperAdmin = user.email === 'dvisrael@hotmail.com';

        if (!isSuperAdmin && userRank < 3) {
            return alert("ACESSO NEGADO: Apenas Master e Pleno podem realizar esta ação.");
        }

        if (!hasPerm('canDeleteUsers')) return alert("Sem permissão ativa.");

        const confirmMessage = `⚠️ ATENÇÃO: BANIR USUÁRIO ⚠️\n\nVocê está prestes a excluir PERMANENTEMENTE a família de "${name}".\n\nIsso apagará:\n- Todos os dados\n- Histórico\n- Acesso\n\nO usuário só poderá retornar se for convidado novamente.\n\nDigite "BANIR" para confirmar.`;

        if (prompt(confirmMessage) === "BANIR") {
            try {
                const res = await deleteFamilyRecord(id);
                if (res.status === 'success') {
                    alert("Usuário banido com sucesso.");
                    setOpenMenuId(null);
                } else {
                    alert(res.message);
                }
            } catch (e) {
                alert("Erro: " + e.message);
            }
        }
    };

    const handleResendInvite = async (invite) => {
        console.log('[DEBUG] handleResendInvite chamado com:', invite);
        const result = await resendInvite(invite.id, invite.email, invite.repName);
        console.log('[DEBUG] resendInvite retornou:', result);
        if (result.status === 'success') {
            // Mostrar o mesmo painel de sucesso que aparece ao criar convite
            setGeneratedLink(result.link);
            setLastInvite({
                repName: result.name,
                email: result.email,
                repPhone: invite.repPhone || '',
                link: result.link
            });
            alert(result.message);
        } else {
            alert(result.message);
        }
        setOpenMenuId(null);
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

    return (


        <div className="min-h-screen bg-parchment pb-20">
            {/* Header */}
            <header className="bg-white shadow-sm sticky top-0 z-10 border-b-4 border-history-green">
                <div className="max-w-6xl mx-auto px-4 py-3 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <img src="/logo-livrao.png" alt="Logo" className="h-12 w-auto object-contain" />
                        <div>
                            <h1 className="text-xl font-serif font-bold text-history-green leading-none">
                                {activeTab === 'invites' && "Gestão de Convites"}
                                {activeTab === 'families' && "Monitoramento de Famílias"}
                                {activeTab === 'team' && "Gestão de Equipe"}
                            </h1>
                            <span className="text-xs text-stone-500 font-bold uppercase tracking-wider">
                                {user.role === 'master' ? 'Administrador Master' : user.role}
                            </span>
                            <div className="flex flex-col text-[10px] text-stone-500 mt-1 leading-tight border-t border-stone-200 pt-1">
                                <span className="font-bold">
                                    {families.find(f => f.email === user.email)?.repName ||
                                        families.find(f => f.email === user.email)?.displayName ||
                                        user.displayName ||
                                        'Membro da Equipe'}
                                </span>
                                <span>{user.email}</span>
                            </div>
                        </div>
                    </div>


                    {/* Navigation Tabs (Responsive: Bottom Bar on Mobile, Header Menu on Desktop) */}
                    <nav className="fixed bottom-0 left-0 w-full bg-white border-t border-stone-200 p-2 flex justify-around items-center z-50 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] md:shadow-none md:static md:w-auto md:border-0 md:p-0 md:gap-4 md:bg-transparent">
                        {hasPerm('canViewInvites') && (
                            <button
                                onClick={() => setActiveTab('invites')}
                                className={`flex flex-col md:flex-row items-center gap-1 px-3 py-1 rounded-md text-[10px] md:text-sm font-bold transition-colors ${activeTab === 'invites' ? 'text-history-green md:bg-history-green md:text-white' : 'text-stone-400 hover:text-stone-600 md:text-stone-600 md:hover:bg-stone-100'}`}
                            >
                                <Mail size={18} className="md:hidden" />
                                <span>Convites</span>
                            </button>
                        )}
                        <button
                            onClick={() => setActiveTab('families')}
                            className={`flex flex-col md:flex-row items-center gap-1 px-3 py-1 rounded-md text-[10px] md:text-sm font-bold transition-colors ${activeTab === 'families' ? 'text-history-green md:bg-history-green md:text-white' : 'text-stone-400 hover:text-stone-600 md:text-stone-600 md:hover:bg-stone-100'}`}
                        >
                            <Users size={18} className="md:hidden" />
                            <span>Famílias</span>
                        </button>
                        {(hasPerm('canViewTeam')) && (
                            <button
                                onClick={() => setActiveTab('team')}
                                className={`flex flex-col md:flex-row items-center gap-1 px-3 py-1 rounded-md text-[10px] md:text-sm font-bold transition-colors ${activeTab === 'team' ? 'text-history-green md:bg-history-green md:text-white' : 'text-stone-400 hover:text-stone-600 md:text-stone-600 md:hover:bg-stone-100'}`}
                            >
                                <CheckCircle size={18} className="md:hidden" />
                                <span>Equipe</span>
                            </button>
                        )}
                        <button
                            onClick={() => setActiveTab('import')}
                            className={`flex flex-col md:flex-row items-center gap-1 px-3 py-1 rounded-md text-[10px] md:text-sm font-bold transition-colors ${activeTab === 'import' ? 'text-history-green md:bg-history-green md:text-white' : 'text-stone-400 hover:text-stone-600 md:text-stone-600 md:hover:bg-stone-100'}`}
                        >
                            <RefreshCw size={18} className="md:hidden" />
                            <span>Importar</span>
                        </button>
                    </nav>

                    <button
                        onClick={onLogout}
                        className="flex items-center gap-1 text-red-800 font-bold text-sm hover:text-red-600 transition-colors"
                    >
                        <LogOut size={16} /> Sair
                    </button>
                </div>
            </header>

            <main className="max-w-6xl mx-auto px-4 py-8">

                {activeTab === 'invites' && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Coluna Esquerda: Gerador */}
                        <div className="lg:col-span-1 space-y-6">
                            <FormSection title="Gerar Link de Convite" id="invite-form">
                                <div className="space-y-4">
                                    <div className="p-3 bg-blue-50 text-blue-800 text-xs rounded border border-blue-100 mb-4">
                                        ℹ️ O link gerado trava o e-mail no cadastro do usuário. Garanta que o e-mail está correto.
                                    </div>

                                    <InputField
                                        label="Nome do Representante"
                                        value={inviteData.repName}
                                        onChange={(e) => setInviteData({ ...inviteData, repName: e.target.value })}
                                    />
                                    <InputField
                                        label="E-mail Oficial"
                                        type="email"
                                        value={inviteData.email}
                                        onChange={(e) => setInviteData({ ...inviteData, email: e.target.value.toLowerCase() })}
                                    />
                                    <InputField
                                        label="Telefone (DDI + DDD + Número)"
                                        type="tel"
                                        placeholder="+55 (XX) 9XXXX-XXXX"
                                        value={inviteData.repPhone || ''}
                                        onChange={(e) => setInviteData({ ...inviteData, repPhone: e.target.value })}
                                    />


                                    {/* Checkboxes: Representante e Membro de Equipe */}
                                    <div className="flex flex-col gap-3 mt-4 mb-6">
                                        <label className="flex items-center gap-3 cursor-pointer bg-stone-50 p-3 rounded-lg border border-stone-200 hover:bg-stone-100 transition-colors">
                                            <input
                                                type="checkbox"
                                                checked={inviteData.isRepresentative !== false}
                                                onChange={e => setInviteData({ ...inviteData, isRepresentative: e.target.checked })}
                                                className="w-5 h-5 rounded text-history-green focus:ring-history-green border-gray-300"
                                            />
                                            <span className="text-sm text-stone-700 font-bold">Representante da Família</span>
                                        </label>

                                        <label className="flex items-center gap-3 cursor-pointer bg-stone-50 p-3 rounded-lg border border-stone-200 hover:bg-stone-100 transition-colors">
                                            <div className={`p-1.5 rounded-full ${inviteData.isTeamMember ? "bg-green-100 text-history-green" : "bg-gray-100 text-stone-400"}`}>
                                                <Eye size={18} />
                                            </div>
                                            <input
                                                type="checkbox"
                                                checked={inviteData.isTeamMember || false}
                                                onChange={e => setInviteData({ ...inviteData, isTeamMember: e.target.checked })}
                                                className="w-5 h-5 rounded text-history-green focus:ring-history-green border-gray-300"
                                            />
                                            <div className="flex flex-col">
                                                <span className="text-sm text-stone-700 font-bold">Membro da Equipe (Admin)</span>
                                                <span className="text-[10px] text-stone-500 uppercase font-bold tracking-wider">Entrará como 'Básico'</span>
                                            </div>
                                        </label>
                                    </div>                                    <button
                                        onClick={handleInviteCreate}
                                        disabled={isSubmitting}
                                        className="w-full bg-history-gold text-history-green font-bold py-3 rounded-md hover:bg-yellow-500 transition-all shadow-sm"
                                    >
                                        {isSubmitting ? 'Gerando...' : 'Gerar Link Seguro'}
                                    </button>

                                    {generatedLink && lastInvite && (
                                        <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg animate-fade-in">
                                            <div className="flex items-center gap-2 text-green-800 font-bold mb-2">
                                                <CheckCircle size={18} /> Link Gerado!
                                            </div>
                                            <div className="text-xs text-stone-600 break-all bg-white p-2 rounded border border-stone-100 mb-3 font-mono">
                                                {generatedLink}
                                            </div>
                                            <div className="grid grid-cols-2 gap-2">
                                                {/* COPY BUTTON */}
                                                <button
                                                    onClick={copyToClipboard}
                                                    className="col-span-2 bg-stone-600 text-white py-2 rounded text-xs font-bold hover:bg-stone-700 flex items-center justify-center gap-1"
                                                >
                                                    <Copy size={14} /> Copiar Link
                                                </button>

                                                {/* EMAIL BUTTON */}
                                                <a
                                                    href={`mailto:${lastInvite.email}?subject=Convite para o Livrão da Família&body=${encodeURIComponent(`Olá ${lastInvite.repName},\n\nAqui está seu link exclusivo para cadastro:\n${generatedLink}`)}`}
                                                    className="bg-blue-600 text-white py-2 rounded text-xs font-bold hover:bg-blue-700 flex items-center justify-center gap-1 text-center decoration-0"
                                                >
                                                    <Mail size={14} /> Email
                                                </a>

                                                {/* WHATSAPP BUTTON */}
                                                {lastInvite.repPhone && (
                                                    <a
                                                        href={`https://wa.me/${cleanPhone(lastInvite.repPhone)}?text=${encodeURIComponent(`Olá ${lastInvite.repName}, segue o link para acessar o Livrão da Família:\n\n${generatedLink}`)}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="bg-green-500 text-white py-2 rounded text-xs font-bold hover:bg-green-600 flex items-center justify-center gap-1 text-center decoration-0"
                                                    >
                                                        <ExternalLink size={14} /> WhatsApp
                                                    </a>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </FormSection>
                        </div>

                        {/* Coluna Direita: Lista de Convites */}
                        <div className="lg:col-span-2">
                            <div className="bg-white p-6 rounded-lg shadow-sm border border-stone-200">
                                <h2 className="text-lg font-bold text-history-green mb-4 border-b pb-2">Convites Recentes</h2>
                                <div className="overflow-x-auto pb-40">
                                    <table className="w-full text-sm text-left">
                                        <thead className="text-xs text-stone-500 uppercase bg-stone-50">
                                            <tr>
                                                <th className="px-4 py-2">Representante</th>
                                                <th className="px-4 py-2 text-center">Tipo</th>
                                                <th className="px-4 py-2">E-mail</th>
                                                <th className="px-4 py-2">Validade</th>
                                                <th className="px-4 py-2">Status</th>
                                                <th className="px-4 py-2 text-right">Ação</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-stone-100">
                                            {invites.map(invite => (
                                                <tr key={invite.id} className="hover:bg-stone-50 group">
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
                                                            <td className="px-4 py-3 font-medium">{invite.repName}</td>

                                                            {/* Coluna Tipo */}
                                                            <td className="px-4 py-3 text-center">
                                                                <span className="font-mono font-bold text-xs bg-stone-100 px-2 py-1 rounded text-stone-600">
                                                                    {(invite.isRepresentative !== false && invite.isTeamMember) ? "R/M" :
                                                                        (invite.isTeamMember) ? "M" : "R"}
                                                                </span>
                                                            </td>

                                                            <td className="px-4 py-3 text-stone-600">{invite.email}</td>
                                                            <td className="px-4 py-3 text-xs">
                                                                {(() => {
                                                                    if (invite.status === 'used') return <span className="text-stone-300">-</span>;
                                                                    if (!invite.createdAt?.toDate) return <span className="text-stone-400">?</span>;

                                                                    const created = invite.createdAt.toDate();
                                                                    const expires = new Date(created);
                                                                    expires.setDate(created.getDate() + 7);
                                                                    const isExpired = new Date() > expires;

                                                                    return isExpired
                                                                        ? <span className="text-red-500 font-bold">Expirado</span>
                                                                        : <span className="text-green-600">Até {expires.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}</span>
                                                                })()}
                                                            </td>
                                                            <td className="px-4 py-3">
                                                                <span className={`px-2 py-1 rounded-full text-xs font-bold ${invite.status === 'used' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                                                                    }`}>
                                                                    {invite.status === 'used' ? 'Cadastrado' : 'Pendente'}
                                                                </span>
                                                            </td>
                                                            <td className="px-4 py-3 text-right text-stone-400 relative">
                                                                <div className="flex items-center justify-end gap-2">
                                                                    {invite.status === 'pending' && (
                                                                        <button
                                                                            title="Copiar Link Novamente"
                                                                            onClick={() => {
                                                                                const baseUrl = 'https://album-familia-1beta.web.app';
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
                                            {invites.length === 0 && (
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
                        </div>
                    </div>
                )}

                {activeTab === 'families' && (
                    <div className="bg-white p-6 rounded-lg shadow-sm border border-stone-200">
                        <h2 className="text-lg font-bold text-history-green mb-4">Base de Famílias ({families.length})</h2>
                        <div className="overflow-x-auto pb-80">
                            <table className="w-full text-sm text-left">
                                <thead className="text-xs text-stone-500 uppercase bg-stone-50">
                                    <tr>
                                        <th className="px-4 py-2">Representante</th>
                                        <th className="px-4 py-2">E-mail</th>
                                        <th className="px-4 py-2">ID</th>
                                        <th className="px-4 py-2">Tipo</th>
                                        <th className="px-4 py-2 text-center">Status</th>
                                        <th className="px-4 py-2 text-right">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-stone-100">
                                    {families.map(fam => (
                                        <tr key={fam.uid || fam.id} className="hover:bg-stone-50">
                                            <td className="px-4 py-3 font-medium">{fam.repName || fam.displayName}</td>
                                            <td className="px-4 py-3 text-stone-600">{fam.email}</td>
                                            <td className="px-4 py-3 text-stone-400 text-xs font-mono">{fam.uid || fam.id}</td>

                                            {/* Coluna Obs: Admin ou Representante */}
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
                                                                if (e.target.checked) handleRoleUpdate(fam.uid || fam.id, 'basic');
                                                                else handleRoleUpdate(fam.uid || fam.id, 'none');
                                                            }}
                                                            disabled={!canModify(fam.adminRole)}
                                                            className="rounded text-blue-600 focus:ring-blue-600 w-3 h-3 disabled:opacity-50"
                                                        />
                                                        Membro
                                                    </label>
                                                </div>
                                            </td>

                                            {/* Coluna Status (Direto) */}
                                            <td className="px-4 py-3 text-center">
                                                <button
                                                    onClick={() => handleBlockUser(fam.uid || fam.id, fam.status)}
                                                    title={fam.status === 'Bloqueado' ? 'Clique para Desbloquear' : 'Clique para Bloquear'}
                                                    className={`px-3 py-1 rounded-full text-xs font-bold transition-all hover:scale-105 active:scale-95 w-24 ${fam.status === 'Bloqueado' ? 'bg-red-100 text-red-800 hover:bg-red-200' :
                                                        fam.status === 'Ativo' ? 'bg-green-100 text-green-800 hover:bg-green-200' : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                                                        }`}
                                                >
                                                    {fam.status || 'Ativo'}
                                                </button>
                                            </td>

                                            <td className="px-4 py-3 text-right">
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
                                                            {/* Edit Email Placeholder */}
                                                            {(hasPerm('canEditUsers')) && (
                                                                <button
                                                                    onClick={() => {
                                                                        const newEmail = prompt("Novo E-mail (Atenção: Atualiza apenas o cadastro, não o login):", fam.email);
                                                                        if (newEmail) alert("Edição de e-mail será implementada na próxima versão.");
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

                                                            {hasPerm('canMigrate') && (
                                                                <button
                                                                    onClick={async () => {
                                                                        const currentId = fam.uid || fam.id;
                                                                        const targetId = prompt("Para qual Novo ID (UID) você deseja mover estes dados?");
                                                                        if (!targetId) return;
                                                                        if (!confirm(`Mover dados de ${currentId} -> ${targetId}?`)) return;
                                                                        try {
                                                                            await migrateUserData(currentId, targetId);
                                                                            alert("Migração concluída com sucesso!");
                                                                            setOpenMenuId(null);
                                                                        } catch (e) {
                                                                            alert("Erro: " + e.message);
                                                                        }
                                                                    }}
                                                                    className="w-full px-4 py-2 text-xs text-blue-600 hover:bg-blue-50 flex items-center gap-2"
                                                                >
                                                                    <RefreshCw size={12} /> Migrar ID
                                                                </button>
                                                            )}

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
                )
                }

                {
                    activeTab === 'team' && (hasPerm('canViewTeam')) && (
                        <div className="bg-white p-6 rounded-lg shadow-sm border border-stone-200">
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-lg font-bold text-history-green">Gestão da Equipe (Administradores)</h2>
                                {(getRank(user.role) >= 3 || user.email === 'dvisrael@hotmail.com') && (
                                    <button
                                        onClick={() => setShowPermissions(true)}
                                        className="flex items-center gap-2 text-sm text-stone-500 hover:text-history-green font-bold bg-stone-50 hover:bg-green-50 px-3 py-2 rounded-lg border border-stone-200 hover:border-green-200 transition-all"
                                    >
                                        <Book size={16} /> Ver Tabela de Patentes (Regras)
                                    </button>
                                )}
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
                                                                        handleRoleUpdate(fam.uid || fam.id, role);
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
                                                                    if (e.target.checked) handleRoleUpdate(fam.uid || fam.id, 'basic');
                                                                    else handleRoleUpdate(fam.uid || fam.id, 'none');
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
                                                            onClick={() => handleBlockUser(fam.uid || fam.id, fam.status)}
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
                                                                                    setOpenMenuId(null);
                                                                                } catch (e) { alert(e.message); }
                                                                            }
                                                                        }}
                                                                        className="w-full px-4 py-2 text-xs text-stone-700 hover:bg-stone-50 flex items-center gap-2"
                                                                    >
                                                                        <Edit2 size={12} /> Editar Nome
                                                                    </button>
                                                                    <button
                                                                        onClick={() => {
                                                                            const newEmail = prompt("Editar E-mail:", fam.email);
                                                                            if (newEmail) alert("Edição de e-mail em breve.");
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

                {
                    activeTab === 'import' && (
                        <CsvImporter role={user.role} />
                    )
                }

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
                                <div className="flex gap-2">
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
                                <PrintableReport ref={componentRef} data={viewFamily} />
                            </div>

                            {/* Conteúdo Scrollável */}
                            <div className="flex-1 overflow-y-auto p-8 bg-stone-100/50">
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
            {/* Tree Report Modal */}
            {
                treeFamily && (
                    <FamilyTreeReport
                        family={treeFamily}
                        onClose={() => setTreeFamily(null)}
                    />
                )
            }

            {/* Permissions Matrix Modal */}
            {showPermissions && (
                <div className="fixed inset-0 bg-black/50 z-[80] flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-4xl rounded-xl shadow-2xl flex flex-col overflow-hidden animate-fade-in relative">
                        <div className="p-6 border-b border-stone-200 flex justify-between items-center bg-stone-50">
                            <h3 className="text-xl font-serif font-bold text-history-green flex items-center gap-2">
                                <Book size={24} /> Tabela de Patentes e Permissões
                            </h3>
                            <button onClick={() => setShowPermissions(false)} className="text-stone-400 hover:text-stone-600">
                                <X size={24} />
                            </button>
                        </div>
                        <div className="p-6 overflow-y-auto">
                            <div className="mb-4 text-sm text-stone-600">
                                Esta tabela define o que cada nível hierárquico pode fazer no sistema.
                                <br />
                                <span className="text-xs text-stone-400 italic">Nota: As regras de segurança são aplicadas automaticamente pelo sistema (Hardcoded) e não podem ser editadas aqui.</span>
                            </div>

                            <div className="overflow-x-auto border rounded-lg">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-stone-100 text-xs text-stone-600 uppercase font-bold">
                                        <tr>
                                            <th className="px-4 py-3">Nível</th>
                                            <th className="px-4 py-3 text-center">Ver Convites</th>
                                            <th className="px-4 py-3 text-center">Ver Equipe</th>
                                            <th className="px-4 py-3 text-center">Editar Dados</th>
                                            <th className="px-4 py-3 text-center">Remover Membros</th>
                                            <th className="px-4 py-3 text-center">Migrar ID</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-stone-100">
                                        {['master', 'pleno', 'intermediate', 'basic'].map((role) => (
                                            <tr key={role} className="hover:bg-stone-50">
                                                <td className="px-4 py-3 font-bold capitalize">
                                                    <span className={`px-2 py-1 rounded text-xs ${role === 'master' ? 'bg-purple-100 text-purple-800' :
                                                        role === 'pleno' ? 'bg-blue-100 text-blue-800' :
                                                            'text-stone-600'
                                                        }`}>
                                                        {role}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    <input
                                                        type="checkbox"
                                                        checked={permissions[role]?.canViewInvites}
                                                        onChange={(e) => updatePermission(role, 'canViewInvites', e.target.checked)}
                                                        disabled={role === 'master' || (getRank(user.role) < 4 && user.email !== 'dvisrael@hotmail.com')}
                                                        className="rounded text-history-green focus:ring-history-green cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                                    />
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    <input
                                                        type="checkbox"
                                                        checked={permissions[role]?.canViewTeam}
                                                        onChange={(e) => updatePermission(role, 'canViewTeam', e.target.checked)}
                                                        disabled={role === 'master' || (getRank(user.role) < 4 && user.email !== 'dvisrael@hotmail.com')}
                                                        className="rounded text-history-green focus:ring-history-green cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                                    />
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    <input
                                                        type="checkbox"
                                                        checked={permissions[role]?.canEditUsers}
                                                        onChange={(e) => updatePermission(role, 'canEditUsers', e.target.checked)}
                                                        disabled={role === 'master' || (getRank(user.role) < 4 && user.email !== 'dvisrael@hotmail.com')}
                                                        className="rounded text-history-green focus:ring-history-green cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                                    />
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    <input
                                                        type="checkbox"
                                                        checked={permissions[role]?.canDeleteUsers}
                                                        onChange={(e) => updatePermission(role, 'canDeleteUsers', e.target.checked)}
                                                        disabled={role === 'master' || (getRank(user.role) < 4 && user.email !== 'dvisrael@hotmail.com')}
                                                        className="rounded text-history-green focus:ring-history-green cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                                    />
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    <input
                                                        type="checkbox"
                                                        checked={permissions[role]?.canMigrate}
                                                        onChange={(e) => updatePermission(role, 'canMigrate', e.target.checked)}
                                                        disabled={role === 'master' || (getRank(user.role) < 4 && user.email !== 'dvisrael@hotmail.com')}
                                                        className="rounded text-history-green focus:ring-history-green cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                                    />
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                        <div className="p-4 border-t border-stone-200 bg-stone-50 text-right">
                            <button onClick={() => setShowPermissions(false)} className="px-4 py-2 bg-stone-200 text-stone-700 rounded hover:bg-stone-300 font-bold text-sm">
                                Fechar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div >
    );
};
