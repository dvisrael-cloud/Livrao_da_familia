import React, { useState, useCallback, useMemo } from 'react';
import {
    Users, Phone, CheckCircle2, Clock, Send, RefreshCw,
    Search, AlertCircle, Share2, MessageSquare, Save,
    Settings, RotateCcw, ChevronDown, ChevronUp
} from 'lucide-react';
import {
    markInviteSent,
    markMembroSent,
    logSystemEvent,
    fetchFamilyMembers,
    updateMemberPhone
} from '../services/api';

// ─────────────────────────────────────────────────────────────────────────────
// TEMPLATES PADRÃO
// ─────────────────────────────────────────────────────────────────────────────

const DEFAULT_TEMPLATE = `Prezado(a) [Nome],

Convidamos você a acessar o seguinte endereço eletrônico:
[Link]

Ao acessar o link do seu convite, você será direcionado(a) automaticamente para a tela de Acesso. Seu e-mail ([Email]) já estará vinculado de forma segura.

Basta conferir seu nome, informar seu WhatsApp para contato da Comissão e criar uma senha pessoal de no mínimo 6 dígitos. Após concluir, você já estará dentro do Livrão da Família!

⚠️ Este convite é válido até [DataExpiracao]. Após essa data, um novo link precisará ser gerado.`;

const DEFAULT_TEMPLATE_RECONVITE = `Olá [Nome]! 👋

Sou da Comissão do Livrão da Família e notamos que os membros abaixo ainda não tiveram seus dados preenchidos:

[Membros]

📖 Por favor, incentive-os a preencher suas informações no Livrão da Família.

Obrigado pela colaboração! 🙏`;

const BASE_URL = 'https://album-familia-final.web.app';

// ─────────────────────────────────────────────────────────────────────────────
// UTILITÁRIOS
// ─────────────────────────────────────────────────────────────────────────────

const cleanPhone = (raw) => String(raw || '').replace(/\D/g, '');
const isValidPhone = (raw) => { const d = cleanPhone(raw); return d.length === 10 || d.length === 11; };

const buildWhatsappUrl = (telefone, texto) => {
    const num = cleanPhone(telefone);
    const br = num.startsWith('55') ? num : `55${num}`;
    return `https://api.whatsapp.com/send?phone=${br}&text=${encodeURIComponent(texto)}`;
};

const formatDate = (ts) => {
    if (!ts) return null;
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });
};

const interpolate = (tpl, nome, link, email, dataExpiracao, pendingNames) =>
    tpl
        .replace(/\[Nome\]/g, nome)
        .replace(/\[Link\]/g, link || '(sem link)')
        .replace(/\[Email\]/g, email || '(e-mail)')
        .replace(/\[DataExpiracao\]/g, dataExpiracao || '(data não definida)')
        .replace(/\[Membros\]/g, pendingNames || '(lista de membros)');

const buildDirect = (tpl, nome, link, email, dataExpiracao, pendingNames) => interpolate(tpl, nome, link, email, dataExpiracao, pendingNames);

const buildViaOp = (tpl, opNome, memNome, link, email, dataExpiracao, pendingNames) =>
    `Oi ${opNome}! Aqui é o Admin do Livrão da Família 📖\n\nPode enviar o convite abaixo para ${memNome}?\n\n---\n${interpolate(tpl, memNome, link, email, dataExpiracao, pendingNames)}\n---\n\nObrigado! 🙏`;

const resolveRoute = (r, manualPhone, tplDirect, tplReconvite) => {
    const hasManual = isValidPhone(manualPhone);
    const phone = hasManual ? manualPhone : r.telefone;
    const tpl = r.tipo === 'invite' ? tplDirect : tplReconvite;
    const link = r.inviteLink || null;
    const { email, dataExpiracao, _pendingNames } = r;

    if (phone) {
        const msg = buildDirect(tpl, r.nome, link, email, dataExpiracao, _pendingNames);
        return { effectivePhone: phone, viaOperador: false, url: buildWhatsappUrl(phone, msg) };
    }
    if (r.operadorTelefone) {
        const msg = buildViaOp(tpl, r.operadorNome, r.nome, link, email, dataExpiracao, _pendingNames);
        return { effectivePhone: r.operadorTelefone, viaOperador: true, url: buildWhatsappUrl(r.operadorTelefone, msg) };
    }
    return { effectivePhone: null, viaOperador: false, url: null };
};

const buildRecipients = (invites, otfMembers) => {
    const fromInvites = invites
        .filter(inv => inv.status === 'pending')
        .map(inv => {
            const expiresAt = inv.expiresAt || inv.dataExpiracao || null;
            const expiresStr = expiresAt
                ? (expiresAt.toDate ? expiresAt.toDate() : new Date(expiresAt))
                    .toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
                : null;
            return {
                id: inv.id, tipo: 'invite',
                nome: inv.repName || 'Sem nome',
                email: inv.email || null,
                dataExpiracao: expiresStr,
                telefone: inv.repPhone || inv.phone || null,
                hasTelefone: !!(inv.repPhone || inv.phone),
                operadorNome: null, operadorTelefone: null,
                inviteLink: `${BASE_URL}/register?token=${inv.id}`,
                dataUltimoConvite: inv.dataUltimoConvite || null,
            };
        });

    const fromOtf = otfMembers.map(m => ({
        id: m.id, familiaId: m.familiaId, tipo: 'membro',
        nome: m.nome,
        email: m.email,
        telefone: m.telefone,
        hasTelefone: !!(m.telefone),
        operadorNome: m.operadorNome || null,
        operadorTelefone: m.operadorTelefone || null,
        inviteLink: null,
        dataUltimoConvite: m.dataUltimoConvite || null,
        progress: m.progress || 0,
    }));

    return [...fromInvites, ...fromOtf];
};

// ─────────────────────────────────────────────────────────────────────────────
// SUB-COMPONENTES
// ─────────────────────────────────────────────────────────────────────────────

const RouteIcon = ({ viaOperador, hasUrl }) => {
    if (!hasUrl) return <AlertCircle size={14} className="text-stone-300" title="Sem contato" />;
    if (viaOperador) return <Share2 size={14} className="text-violet-500 transition-colors duration-300" title="Via operador" />;
    return <MessageSquare size={14} className="text-emerald-500 transition-colors duration-300" title="Envio direto" />;
};

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENTE PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────

const BulkResendPanel = ({ user, invites = [], families = [], showToast }) => {

    // Templates
    const [templateDirect, setTemplateDirect] = useState(DEFAULT_TEMPLATE);
    const [templateReconvite, setTemplateReconvite] = useState(DEFAULT_TEMPLATE_RECONVITE);
    const [activeTemplate, setActiveTemplate] = useState('direct');
    const [settingsExpanded, setSettingsExpanded] = useState(true);

    // Carga OTF
    const [otfLoading, setOtfLoading] = useState(false);
    const [otfMembers, setOtfMembers] = useState(null);

    // UI
    const [selected, setSelected] = useState(new Set());
    const [search, setSearch] = useState('');
    const [activeTab, setActiveTab] = useState('all');

    // Envios desta sessão {id → bool}
    const [sent, setSent] = useState(new Set());

    // Telefones manuais e checkbox salvar
    const [phoneInputs, setPhoneInputs] = useState({});
    const [saveToDb, setSaveToDb] = useState({});

    // ─────────────────────────────────────────────────────────────────────
    const loadOtfMembers = useCallback(async () => {
        setOtfLoading(true);
        try {
            // ── Coleta todos os membros OTF por família ──────────────────
            const byFamily = {}; // { famId: { fam, membros[] } }

            await Promise.all(families.map(async (fam) => {
                const famId = fam.uid || fam.id;
                const membros = await fetchFamilyMembers(famId);

                const pendentes = membros.filter(m =>
                    m._createdOnTheFly === true &&
                    m.isRepresentative !== true   // 🔑 Filtro de Elite — exclui representantes
                );

                if (pendentes.length > 0) {
                    byFamily[famId] = { fam, membros: pendentes };
                }
            }));

            // ── Gera UM destinatário por família (o Operador/Representante) ──
            const all = Object.entries(byFamily).map(([famId, { fam, membros }]) => {
                const nomes = membros.map(m => `• ${m.nomeCompleto || 'Sem nome'}`).join('\n');
                const dataUltimoConvite = membros.reduce((latest, m) => {
                    if (!m.dataUltimoConvite) return latest;
                    if (!latest) return m.dataUltimoConvite;
                    const a = m.dataUltimoConvite?.toDate?.() ?? new Date(m.dataUltimoConvite);
                    const b = latest?.toDate?.() ?? new Date(latest);
                    return a > b ? m.dataUltimoConvite : latest;
                }, null);

                return {
                    id: famId,                              // destinatário único = família
                    familiaId: famId,
                    tipo: 'membro',
                    nome: fam.repName || fam.displayName || 'Representante',
                    email: fam.email || null,
                    dataExpiracao: null,
                    telefone: fam.repPhone || fam.phone || null,
                    hasTelefone: !!(fam.repPhone || fam.phone),
                    operadorNome: null,
                    operadorTelefone: null,
                    inviteLink: null,
                    dataUltimoConvite,
                    progress: null,
                    // Metadados extras para o template
                    _pendingNames: nomes,           // lista formatada de nomes
                    _pendingCount: membros.length,
                };
            });

            setOtfMembers(all);
            const initSave = {};
            all.forEach(m => { initSave[m.id] = true; });
            setSaveToDb(prev => ({ ...initSave, ...prev }));
            const total = Object.values(byFamily).reduce((s, { membros }) => s + membros.length, 0);
            showToast?.(`${total} membro(s) OTF agrupados em ${all.length} família(s).`, 'success');
        } catch (err) {
            console.error('[BulkResendPanel]', err);
            showToast?.('Erro ao carregar membros.', 'error');
        } finally {
            setOtfLoading(false);
        }
    }, [families, showToast]);

    // ─────────────────────────────────────────────────────────────────────
    const allRecipients = useMemo(
        () => buildRecipients(invites, otfMembers || []),
        [invites, otfMembers]
    );

    // Rotas resolvidas — reativas ao template e aos telefones manuais
    const resolvedMap = useMemo(() => {
        const map = {};
        allRecipients.forEach(r => {
            map[r.id] = resolveRoute(r, phoneInputs[r.id], templateDirect, templateReconvite);
        });
        return map;
    }, [allRecipients, phoneInputs, templateDirect, templateReconvite]);

    const filtered = useMemo(() => allRecipients
        .filter(r => activeTab === 'all' || r.tipo === activeTab)
        .filter(r => !search ||
            r.nome.toLowerCase().includes(search.toLowerCase()) ||
            (r.email || '').toLowerCase().includes(search.toLowerCase())
        ), [allRecipients, activeTab, search]);

    const stats = useMemo(() => ({
        total: allRecipients.length,
        direto: allRecipients.filter(r => resolvedMap[r.id]?.url && !resolvedMap[r.id]?.viaOperador).length,
        viaOperador: allRecipients.filter(r => resolvedMap[r.id]?.viaOperador).length,
        semContato: allRecipients.filter(r => !resolvedMap[r.id]?.url).length,
        invites: allRecipients.filter(r => r.tipo === 'invite').length,
        membros: allRecipients.filter(r => r.tipo === 'membro').length,
    }), [allRecipients, resolvedMap]);

    // ─────────────────────────────────────────────────────────────────────
    // Seleção
    // ─────────────────────────────────────────────────────────────────────
    const toggleSelect = (id) => setSelected(prev => {
        const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next;
    });
    const toggleAll = () => setSelected(
        selected.size === filtered.length ? new Set() : new Set(filtered.map(r => r.id))
    );

    const selectedCount = selected.size;
    const selectedCanSend = [...selected].filter(id => resolvedMap[id]?.url).length;

    // ─────────────────────────────────────────────────────────────────────
    // Envio individual direto da linha
    // ─────────────────────────────────────────────────────────────────────
    const handleSend = async (r) => {
        const route = resolvedMap[r.id];
        if (!route?.url) return;

        window.open(route.url, '_blank', 'noopener,noreferrer');
        setSent(prev => new Set([...prev, r.id]));

        if (r.tipo === 'invite') {
            await markInviteSent(r.id);
        } else if (r.tipo === 'membro' && r.familiaId) {
            await markMembroSent(r.familiaId, r.id);
            const manual = phoneInputs[r.id];
            if (saveToDb[r.id] !== false && isValidPhone(manual) && !r.hasTelefone) {
                const res = await updateMemberPhone(r.familiaId, r.id, cleanPhone(manual));
                if (res.status === 'success') showToast?.(`Telefone de ${r.nome} salvo.`, 'success');
            }
        }

        // fire-and-forget — erros de permissão são silenciados em api.js
        logSystemEvent('INFO', 'admin-invites',
            `Reenvio: ${r.nome} via ${route.viaOperador ? 'operador' : 'direto'}`,
            user?.email, { id: r.id, tipo: r.tipo }
        );
    };

    // Enviar todos os selecionados em sequência (abre múltiplas abas)
    const handleSendAll = () => {
        const toSend = filtered.filter(r => selected.has(r.id) && resolvedMap[r.id]?.url);
        if (toSend.length === 0) { showToast?.('Nenhum selecionado com contato.', 'error'); return; }
        toSend.forEach(r => handleSend(r));
    };

    // ─────────────────────────────────────────────────────────────────────
    // RENDER
    // ─────────────────────────────────────────────────────────────────────
    return (
        <div className="space-y-5">

            {/* ── Cabeçalho Global ── */}
            <div className="bg-gradient-to-br from-history-green/5 to-emerald-50 border border-history-green/20 rounded-xl overflow-hidden shadow-sm">

                {/* Barra de título */}
                <div
                    className="flex items-center justify-between px-5 py-3 cursor-pointer select-none border-b border-history-green/10 hover:bg-history-green/5 transition-colors"
                    onClick={() => setSettingsExpanded(v => !v)}
                >
                    <div className="flex items-center gap-2 font-bold text-history-green text-sm">
                        <Settings size={15} />
                        Configurações de Envio
                        {selectedCount > 0 && (
                            <span className="ml-2 bg-history-green text-white text-xs font-bold px-2.5 py-0.5 rounded-full">
                                {selectedCount} selecionado{selectedCount !== 1 ? 's' : ''}
                                {selectedCanSend < selectedCount && (
                                    <span className="ml-1 opacity-75">({selectedCanSend} c/ contato)</span>
                                )}
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-3" onClick={e => e.stopPropagation()}>
                        {selectedCount > 0 && (
                            <button
                                onClick={handleSendAll}
                                disabled={selectedCanSend === 0}
                                className="flex items-center gap-2 px-4 py-1.5 bg-[#25D366] text-white text-xs font-bold rounded-lg hover:bg-[#1ebe5a] active:scale-95 transition-all shadow disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                                <Send size={13} />
                                Enviar Selecionados ({selectedCanSend})
                            </button>
                        )}
                        <div onClick={e => { e.stopPropagation(); setSettingsExpanded(v => !v); }}>
                            {settingsExpanded
                                ? <ChevronUp size={16} className="text-history-green" />
                                : <ChevronDown size={16} className="text-history-green" />
                            }
                        </div>
                    </div>
                </div>

                {/* Painel expansível */}
                {settingsExpanded && (
                    <div className="p-5 space-y-4">
                        <div className="flex items-center gap-3 flex-wrap">
                            <span className="text-xs font-bold text-stone-500 uppercase tracking-wide">Template:</span>
                            <div className="flex bg-white border border-stone-200 rounded-lg p-0.5 gap-0.5 text-xs font-bold">
                                {[
                                    { id: 'direct', label: '📩 Convite c/ Link' },
                                    { id: 'reconvite', label: '📋 Reconvite c/ Link' },
                                ].map(t => (
                                    <button key={t.id} onClick={() => setActiveTemplate(t.id)}
                                        className={`px-3 py-1.5 rounded-md transition-all ${activeTemplate === t.id ? 'bg-history-green text-white shadow-sm' : 'text-stone-500 hover:text-stone-700'}`}>
                                        {t.label}
                                    </button>
                                ))}
                            </div>
                            <button
                                onClick={() => activeTemplate === 'direct' ? setTemplateDirect(DEFAULT_TEMPLATE) : setTemplateReconvite(DEFAULT_TEMPLATE_RECONVITE)}
                                className="flex items-center gap-1 text-xs text-stone-400 hover:text-stone-600 transition-colors ml-auto"
                            >
                                <RotateCcw size={11} /> Restaurar padrão
                            </button>
                        </div>

                        <div className="grid md:grid-cols-[1fr_auto] gap-4 items-start">
                            <div className="space-y-1.5">
                                <textarea
                                    value={activeTemplate === 'direct' ? templateDirect : templateReconvite}
                                    onChange={e => activeTemplate === 'direct'
                                        ? setTemplateDirect(e.target.value)
                                        : setTemplateReconvite(e.target.value)}
                                    rows={7}
                                    className="w-full text-sm border border-stone-200 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-history-green/30 bg-white font-mono resize-y leading-relaxed"
                                />
                                <p className="text-xs text-stone-400 flex items-center gap-3 flex-wrap">
                                    <span>Marcadores:</span>
                                    <code className="bg-stone-100 px-1.5 py-0.5 rounded text-history-green font-bold">[Nome]</code>
                                    <code className="bg-stone-100 px-1.5 py-0.5 rounded text-history-green font-bold">[Link]</code>
                                    <code className="bg-stone-100 px-1.5 py-0.5 rounded text-history-green font-bold">[Email]</code>
                                    <code className="bg-stone-100 px-1.5 py-0.5 rounded text-history-green font-bold">[DataExpiracao]</code>
                                    <code className="bg-stone-100 px-1.5 py-0.5 rounded text-violet-600 font-bold" title="Só para Reconvite OTF">[Membros]</code>
                                </p>
                            </div>

                            <div className="flex flex-col gap-3 min-w-[160px]">
                                {otfMembers === null ? (
                                    <button onClick={loadOtfMembers} disabled={otfLoading}
                                        className="flex items-center justify-center gap-2 px-3 py-2.5 border border-history-green text-history-green text-xs font-semibold rounded-lg hover:bg-history-green/5 active:scale-95 transition-all disabled:opacity-60">
                                        {otfLoading
                                            ? <><RefreshCw size={13} className="animate-spin" /> Carregando...</>
                                            : <><Users size={13} /> Carregar On-The-Fly</>}
                                    </button>
                                ) : (
                                    <div className="text-xs text-center text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
                                        <CheckCircle2 size={13} className="inline mr-1" />
                                        {otfMembers.length} membros OTF carregados
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* ── Cards de Estatísticas ── */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                    { label: 'Total Pendentes', value: stats.total, color: 'stone' },
                    { label: 'Envio Direto', value: stats.direto, color: 'emerald', icon: <MessageSquare size={13} /> },
                    { label: 'Via Operador', value: stats.viaOperador, color: 'violet', icon: <Share2 size={13} /> },
                    { label: 'Sem Contato', value: stats.semContato, color: 'rose', icon: <AlertCircle size={13} /> },
                ].map(s => (
                    <div key={s.label} className={`bg-${s.color}-50 border border-${s.color}-200 rounded-lg p-3`}>
                        <div className={`text-xs font-semibold text-${s.color}-500 mb-1 flex items-center gap-1`}>{s.icon}{s.label}</div>
                        <div className={`text-2xl font-bold text-${s.color}-700`}>{s.value}</div>
                    </div>
                ))}
            </div>

            {/* ── Barra de ferramentas ── */}
            <div className="bg-white border border-stone-200 rounded-lg p-3 flex flex-col md:flex-row gap-3 items-start md:items-center">
                <div className="relative flex-1 max-w-xs">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                    <input type="text" placeholder="Buscar por nome ou e-mail..."
                        value={search} onChange={e => setSearch(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 text-sm border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-history-green/30" />
                </div>
                <div className="flex bg-stone-100 rounded-lg p-1 gap-1 text-xs font-bold">
                    {[
                        { id: 'all', label: `Todos (${stats.total})` },
                        { id: 'invite', label: `Convites (${stats.invites})` },
                        { id: 'membro', label: `OTF (${stats.membros})` },
                    ].map(tab => (
                        <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                            className={`px-3 py-1.5 rounded-md transition-all ${activeTab === tab.id ? 'bg-history-green text-white shadow-sm' : 'text-stone-500 hover:text-stone-700'}`}>
                            {tab.label}
                        </button>
                    ))}
                </div>
                <label className="flex items-center gap-2 text-sm text-stone-600 cursor-pointer select-none ml-auto">
                    <input type="checkbox"
                        checked={filtered.length > 0 && selected.size === filtered.length}
                        onChange={toggleAll}
                        className="rounded text-history-green w-4 h-4" />
                    Todos ({filtered.length})
                </label>
            </div>

            {/* ══════════════════════════════════════════════════════════
                TABELA DE DESTINATÁRIOS
                Colunas: ☐ | Nome+Email | Telefone | Enviar | Status
            ══════════════════════════════════════════════════════════ */}
            <div className="bg-white border border-stone-200 rounded-lg overflow-hidden">

                {/* Cabeçalho da tabela */}
                <div className="hidden md:grid grid-cols-[auto_1fr_200px_80px_130px] gap-x-4 px-4 py-2 bg-stone-50 border-b border-stone-200 text-xs font-bold text-stone-500 uppercase tracking-wide">
                    <div className="w-4" />
                    <div>Nome / E-mail</div>
                    <div>Telefone</div>
                    <div className="text-center">Enviar</div>
                    <div>Status</div>
                </div>

                {filtered.length === 0 ? (
                    <div className="p-12 text-center text-stone-400">
                        <Users size={32} className="mx-auto mb-3 opacity-30" />
                        <p className="font-medium">Nenhum pendente encontrado.</p>
                        <p className="text-sm mt-1">
                            {otfMembers === null
                                ? 'Clique em "Carregar On-The-Fly" para ver membros incompletos.'
                                : 'Todos os convites foram utilizados.'}
                        </p>
                    </div>
                ) : (
                    <div className="divide-y divide-stone-100">
                        {filtered.map(r => {
                            const manualPhone = phoneInputs[r.id] || '';
                            const route = resolvedMap[r.id] || {};
                            const isSelected = selected.has(r.id);
                            const isSent = sent.has(r.id);
                            const needsPhone = !r.hasTelefone;

                            return (
                                <div key={r.id}
                                    className={`grid grid-cols-1 md:grid-cols-[auto_1fr_200px_80px_130px] items-center gap-x-4 gap-y-2 px-4 py-3 transition-colors cursor-pointer
                                        ${isSelected ? 'bg-emerald-50' : 'hover:bg-stone-50'}
                                        ${isSent ? 'opacity-60' : ''}`}
                                    onClick={() => toggleSelect(r.id)}
                                >
                                    {/* ── Col 1: Checkbox ── */}
                                    <div className="flex items-center" onClick={e => e.stopPropagation()}>
                                        <input type="checkbox" checked={isSelected} onChange={() => toggleSelect(r.id)}
                                            className="rounded text-history-green w-4 h-4" />
                                    </div>

                                    {/* ── Col 2: Nome + Email ── */}
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                            <RouteIcon viaOperador={route.viaOperador} hasUrl={!!route.url} />
                                            <span className="font-semibold text-sm text-stone-800 truncate">{r.nome}</span>
                                            {route.viaOperador && (
                                                <span className="text-xs bg-violet-100 text-violet-700 px-1.5 py-0.5 rounded-full font-medium flex-shrink-0">
                                                    ↪ {r.operadorNome}
                                                </span>
                                            )}
                                            {r.tipo === 'membro' && (
                                                <span className="text-xs text-stone-400 flex-shrink-0">{r.progress}%</span>
                                            )}
                                        </div>
                                        <div className="text-xs text-stone-400 truncate mt-0.5">{r.email || '—'}</div>
                                    </div>

                                    {/* ── Col 3: Telefone ── */}
                                    <div onClick={e => e.stopPropagation()}>
                                        {r.hasTelefone ? (
                                            /* Telefone já cadastrado */
                                            <span className="flex items-center gap-1.5 text-sm text-stone-600">
                                                <Phone size={13} className="text-stone-400 flex-shrink-0" />
                                                {r.telefone}
                                            </span>
                                        ) : (
                                            /* Input para digitar telefone */
                                            <div className="space-y-1.5">
                                                <div className="relative inline-flex items-center">
                                                    <Phone size={12} className="absolute left-2.5 text-stone-400 pointer-events-none" />
                                                    <input
                                                        type="tel"
                                                        placeholder="DDD + número"
                                                        value={manualPhone}
                                                        onChange={e => {
                                                            const val = e.target.value;
                                                            setPhoneInputs(prev => ({ ...prev, [r.id]: val }));
                                                            setSaveToDb(prev => ({ [r.id]: true, ...prev }));
                                                        }}
                                                        maxLength={15}
                                                        className={`pl-7 pr-6 py-1.5 text-xs border rounded-lg focus:outline-none focus:ring-2 w-full transition-colors ${
                                                            isValidPhone(manualPhone)
                                                                ? 'border-emerald-400 focus:ring-emerald-200 bg-emerald-50'
                                                                : 'border-stone-300 focus:ring-history-green/20 bg-white'
                                                        }`}
                                                    />
                                                    {isValidPhone(manualPhone) && (
                                                        <CheckCircle2 size={11} className="absolute right-2 text-emerald-500 pointer-events-none" />
                                                    )}
                                                </div>
                                                {/* Checkbox salvar — só para membros com número válido */}
                                                {r.tipo === 'membro' && isValidPhone(manualPhone) && (
                                                    <label className="flex items-center gap-1 text-xs text-stone-500 cursor-pointer w-fit">
                                                        <input type="checkbox"
                                                            checked={saveToDb[r.id] !== false}
                                                            onChange={e => setSaveToDb(prev => ({ ...prev, [r.id]: e.target.checked }))}
                                                            className="rounded text-history-green w-3 h-3"
                                                        />
                                                        <Save size={10} /> Salvar no cadastro
                                                    </label>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {/* ── Col 4: Botão Enviar ── */}
                                    <div className="flex justify-center" onClick={e => e.stopPropagation()}>
                                        {isSent ? (
                                            <span title="Enviado nesta sessão"
                                                className="flex items-center justify-center w-9 h-9 bg-emerald-100 text-emerald-600 rounded-full">
                                                <CheckCircle2 size={18} />
                                            </span>
                                        ) : route.url ? (
                                            <button
                                                onClick={() => handleSend(r)}
                                                title="Abrir WhatsApp"
                                                className="flex items-center justify-center w-9 h-9 bg-[#25D366] text-white rounded-full hover:bg-[#1ebe5a] active:scale-90 transition-all shadow-sm"
                                            >
                                                <Send size={16} />
                                            </button>
                                        ) : (
                                            <span title="Sem contato disponível"
                                                className="flex items-center justify-center w-9 h-9 bg-stone-100 text-stone-300 rounded-full cursor-not-allowed">
                                                <Send size={16} />
                                            </span>
                                        )}
                                    </div>

                                    {/* ── Col 5: Status ── */}
                                    <div className="flex items-center">
                                        {isSent ? (
                                            <span className="inline-flex items-center gap-1 text-xs text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full whitespace-nowrap">
                                                <CheckCircle2 size={10} /> Enviado agora
                                            </span>
                                        ) : r.dataUltimoConvite ? (
                                            <span className="inline-flex items-center gap-1 text-xs text-sky-600 bg-sky-50 border border-sky-200 px-2 py-0.5 rounded-full whitespace-nowrap">
                                                <Send size={10} /> {formatDate(r.dataUltimoConvite)}
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1 text-xs text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full whitespace-nowrap">
                                                <Clock size={10} /> Nunca
                                            </span>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

export default BulkResendPanel;
