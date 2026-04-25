import React, { useState } from 'react';
import { LogIn, KeyRound, Search, Mail, MessageCircle, ArrowLeft, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { Button, Input } from '../../components/common/UI';
import { authenticateUser, resetPassword } from '../../services/api';
import { logEvent, logError } from '../../services/logService';
import { db } from '../../services/firebase';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';

// ─────────────────────────────────────────────
// CONFIGURAÇÃO — substitua pelo número real do suporte
// Formato: código do país + DDD + número, sem espaços ou hífens
// Exemplo: 5511999999999
// ─────────────────────────────────────────────
const SUPORTE_WHATSAPP = '5592981124321';

// ─────────────────────────────────────────────
// FUNÇÕES DE MASCARAMENTO
// ─────────────────────────────────────────────

/**
 * Mascara e-mail: dvisrael@kkl.com → d***l@kkl.com
 */
const maskEmail = (email) => {
    if (!email || !email.includes('@')) return '***';
    const [local, domain] = email.split('@');
    if (local.length <= 2) return `${local[0]}***@${domain}`;
    return `${local[0]}${'*'.repeat(local.length - 2)}${local[local.length - 1]}@${domain}`;
};

/**
 * Mascara WhatsApp: +5511999999999 → +55 11 *****-9999
 * Aceita strings com ou sem formatação.
 */
const maskWhatsApp = (phone) => {
    if (!phone) return null;
    const digits = phone.replace(/\D/g, '');
    if (digits.length < 10) return `****-${digits.slice(-4)}`;
    // Formato internacional: país (2) + DDD (2) + número (8 ou 9)
    const country = digits.slice(0, 2);   // ex: 55
    const ddd = digits.slice(2, 4);       // ex: 11
    const last4 = digits.slice(-4);       // ex: 9999
    return `+${country} ${ddd} *****-${last4}`;
};

// ─────────────────────────────────────────────
// COMPONENTE PRINCIPAL
// ─────────────────────────────────────────────

export const LoginForm = ({ onLoginSuccess, onSwitchRegister, prefillEmail = '' }) => {

    // ── Login state ──
    const [email, setEmail] = useState(prefillEmail);
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // ── Reset flow state ──
    // screen: 'login' | 'reset-search' | 'reset-choose' | 'reset-done'
    const [screen, setScreen] = useState('login');
    const [resetEmail, setResetEmail] = useState('');       // e-mail digitado na busca
    const [searchLoading, setSearchLoading] = useState(false);
    const [searchError, setSearchError] = useState('');

    // Dados encontrados no Firestore (para mascaramento)
    const [foundEmail, setFoundEmail] = useState('');       // e-mail real do documento
    const [foundWhatsApp, setFoundWhatsApp] = useState(''); // whatsapp real do documento

    // Reset por e-mail resultado
    const [emailResetStatus, setEmailResetStatus] = useState(''); // 'success' | 'error' | ''
    const [emailResetMsg, setEmailResetMsg] = useState('');

    // ── Email prefill sync ──
    React.useEffect(() => {
        if (prefillEmail) setEmail(prefillEmail);
    }, [prefillEmail]);

    // ─────────────────────────────────────────
    // HANDLERS: LOGIN
    // ─────────────────────────────────────────

    const handleSubmit = async (e, destination = null) => {
        if (e) e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const result = await authenticateUser(email, password);
            if (result.status === 'success') {
                onLoginSuccess(result.data, destination);
            } else {
                setError(result.message);
            }
        } catch (err) {
            console.error('Login Failure:', err);
            setError(err.message || 'Erro de conexão ou dados incorretos.');
        } finally {
            setLoading(false);
        }
    };

    // ─────────────────────────────────────────
    // HANDLERS: RESET — ETAPA 1 (Busca)
    // ─────────────────────────────────────────

    const handleSearch = async () => {
        const target = resetEmail.trim().toLowerCase();
        if (!target) {
            setSearchError('Preencha o e-mail para buscar.');
            return;
        }
        setSearchLoading(true);
        setSearchError('');

        try {
            // Query no Firestore: coleção familias onde email == target
            const q = query(
                collection(db, 'familias'),
                where('email', '==', target),
                limit(1)
            );
            const snap = await getDocs(q);

            if (snap.empty) {
                // Mensagem genérica — não revela se existe ou não (segurança)
                setSearchError('E-mail não encontrado na base de usuários. Verifique se digitou corretamente.');
                setSearchLoading(false);
                return;
            }

            const data = snap.docs[0].data();
            setFoundEmail(data.email || target);
            // Tenta campo whatsapp (RegisterForm salva como 'whatsapp') ou fallback repPhone
            setFoundWhatsApp(data.whatsapp || data.repPhone || '');
            setScreen('reset-choose');
        } catch (err) {
            console.error('[Reset Search] Firestore error:', err);
            setSearchError('Erro ao buscar a conta. Tente novamente.');
            await logError('LoginForm', 'reset_search_firestore', err, target);
        } finally {
            setSearchLoading(false);
        }
    };

    // ─────────────────────────────────────────
    // HANDLERS: RESET — ETAPA 3a (Por E-mail)
    // ─────────────────────────────────────────

    const handleResetByEmail = async () => {
        setEmailResetStatus('');
        setEmailResetMsg('');

        try {
            const actionCodeSettings = {
                url: window.location.origin, // Retorna para a raiz do app após redefinição
                handleCodeInApp: false
            };
            const res = await resetPassword(foundEmail, actionCodeSettings);

            if (res.status === 'success') {
                setEmailResetStatus('success');
                setEmailResetMsg('E-mail enviado! Verifique sua caixa de entrada e spam.');
                await logEvent('INFO', 'LoginForm', 'Solicitação de reset de senha por e-mail', foundEmail, {
                    action: 'password_reset_email_sent'
                });
                // Avança para tela final
                setTimeout(() => setScreen('reset-done'), 400);
            } else {
                setEmailResetStatus('error');
                setEmailResetMsg(res.message);
                await logError('LoginForm', 'password_reset_email_failed', new Error(res.message), foundEmail);
            }
        } catch (err) {
            setEmailResetStatus('error');
            setEmailResetMsg('Erro inesperado ao enviar o e-mail.');
            await logError('LoginForm', 'password_reset_email_exception', err, foundEmail);
        }
    };

    // ─────────────────────────────────────────
    // HANDLERS: RESET — ETAPA 3b (Por WhatsApp)
    // ─────────────────────────────────────────

    const handleResetByWhatsApp = async () => {
        const text = encodeURIComponent(
            `Olá, suporte do Livrão da Família. Esqueci minha senha e preciso de um link de recuperação. Meu e-mail é: ${foundEmail}`
        );
        const url = `https://api.whatsapp.com/send?phone=${SUPORTE_WHATSAPP}&text=${text}`;
        window.open(url, '_blank', 'noopener,noreferrer');

        await logEvent('INFO', 'LoginForm', 'Solicitação de reset de senha por WhatsApp', foundEmail, {
            action: 'password_reset_whatsapp_opened'
        });
    };

    // ─────────────────────────────────────────
    // HELPERS DE NAVEGAÇÃO
    // ─────────────────────────────────────────

    const goToLogin = () => {
        setScreen('login');
        setResetEmail('');
        setSearchError('');
        setFoundEmail('');
        setFoundWhatsApp('');
        setEmailResetStatus('');
        setEmailResetMsg('');
    };

    // ─────────────────────────────────────────
    // RENDER: telas do fluxo de reset
    // ─────────────────────────────────────────

    // ── Etapa 1: Busca por e-mail ──
    if (screen === 'reset-search') {
        return (
            <div className="bg-white p-8 rounded-xl shadow-lg border-t-4 border-history-green max-w-sm w-full mx-auto animate-fade-in">
                <button
                    onClick={goToLogin}
                    className="flex items-center gap-1.5 text-xs text-stone-400 hover:text-stone-700 mb-5 transition-colors"
                >
                    <ArrowLeft size={13} /> Voltar ao Login
                </button>

                <div className="flex flex-col items-center mb-6">
                    <div className="w-14 h-14 rounded-full bg-history-green/10 flex items-center justify-center mb-3">
                        <KeyRound size={26} className="text-history-green" />
                    </div>
                    <h2 className="text-xl font-serif font-bold text-history-green text-center">Recuperar Acesso</h2>
                    <p className="text-xs text-stone-500 mt-1 text-center leading-snug">
                        Digite o e-mail cadastrado para encontrarmos sua conta.
                    </p>
                </div>

                <div className="space-y-3">
                    <div>
                        <label className="block text-sm font-semibold text-stone-700 mb-1">E-mail da conta</label>
                        <input
                            type="email"
                            value={resetEmail}
                            onChange={(e) => setResetEmail(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                            placeholder="seu@email.com"
                            autoFocus
                            className="w-full px-3 py-2 border-2 border-stone-300 rounded-lg text-sm focus:outline-none focus:border-history-green focus:ring-2 focus:ring-history-green/20 transition-all"
                        />
                    </div>

                    {searchError && (
                        <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-100 rounded-lg">
                            <AlertCircle size={14} className="text-red-500 mt-0.5 shrink-0" />
                            <p className="text-xs text-red-700">{searchError}</p>
                        </div>
                    )}

                    <button
                        onClick={handleSearch}
                        disabled={searchLoading}
                        className="w-full py-3 bg-history-green text-white font-bold rounded-xl hover:bg-[#152e26] transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {searchLoading
                            ? <><Loader2 size={16} className="animate-spin" /> Buscando...</>
                            : <><Search size={16} /> Buscar Conta</>
                        }
                    </button>
                </div>
            </div>
        );
    }

    // ── Etapa 2–3: Escolha do método de recuperação ──
    if (screen === 'reset-choose') {
        return (
            <div className="bg-white p-8 rounded-xl shadow-lg border-t-4 border-history-green max-w-sm w-full mx-auto animate-fade-in">
                <button
                    onClick={() => { setScreen('reset-search'); setFoundEmail(''); setFoundWhatsApp(''); setEmailResetStatus(''); }}
                    className="flex items-center gap-1.5 text-xs text-stone-400 hover:text-stone-700 mb-5 transition-colors"
                >
                    <ArrowLeft size={13} /> Buscar outro e-mail
                </button>

                <div className="flex flex-col items-center mb-6">
                    <div className="w-14 h-14 rounded-full bg-emerald-50 flex items-center justify-center mb-3">
                        <CheckCircle2 size={28} className="text-emerald-600" />
                    </div>
                    <h2 className="text-xl font-serif font-bold text-history-green text-center">Conta Encontrada!</h2>
                    <p className="text-xs text-stone-500 mt-1 text-center leading-snug">
                        Como você deseja recuperar sua conta?
                    </p>
                </div>

                {/* Feedback de resultado do reset por e-mail */}
                {emailResetStatus === 'error' && (
                    <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-100 rounded-lg mb-4">
                        <AlertCircle size={14} className="text-red-500 mt-0.5 shrink-0" />
                        <p className="text-xs text-red-700">{emailResetMsg}</p>
                    </div>
                )}

                <div className="space-y-3">
                    {/* Botão 1: Por E-mail */}
                    <button
                        onClick={handleResetByEmail}
                        disabled={emailResetStatus === 'success'}
                        className="w-full p-4 rounded-xl border-2 border-stone-200 hover:border-history-green hover:bg-stone-50 transition-all active:scale-95 disabled:opacity-60 text-left group"
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center shrink-0 group-hover:bg-blue-200 transition-colors">
                                <Mail size={18} className="text-blue-600" />
                            </div>
                            <div>
                                <p className="text-sm font-bold text-stone-800">Recuperar por E-mail</p>
                                <p className="text-xs text-stone-500 font-mono mt-0.5">{maskEmail(foundEmail)}</p>
                            </div>
                        </div>
                        {emailResetStatus === 'success' && (
                            <div className="flex items-center gap-1.5 mt-2 text-xs text-emerald-700 font-medium">
                                <CheckCircle2 size={13} /> E-mail enviado com sucesso!
                            </div>
                        )}
                    </button>

                    {/* Botão 2: Por WhatsApp (só exibe se houver número) */}
                    {foundWhatsApp ? (
                        <button
                            onClick={handleResetByWhatsApp}
                            className="w-full p-4 rounded-xl border-2 border-stone-200 hover:border-green-500 hover:bg-green-50 transition-all active:scale-95 text-left group"
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center shrink-0 group-hover:bg-green-200 transition-colors">
                                    <MessageCircle size={18} className="text-green-600" />
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-stone-800">Recuperar por WhatsApp</p>
                                    <p className="text-xs text-stone-500 font-mono mt-0.5">{maskWhatsApp(foundWhatsApp)}</p>
                                </div>
                            </div>
                            <p className="text-[10px] text-stone-400 mt-2 ml-13 pl-[52px]">
                                Abre uma conversa com o suporte da Comissão.
                            </p>
                        </button>
                    ) : (
                        <div className="p-3 bg-amber-50 border border-amber-100 rounded-xl text-xs text-amber-700 text-center">
                            Nenhum WhatsApp cadastrado nesta conta.<br />Use a opção de e-mail acima.
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // ── Etapa final: confirmação de envio ──
    if (screen === 'reset-done') {
        return (
            <div className="bg-white p-8 rounded-xl shadow-lg border-t-4 border-history-green max-w-sm w-full mx-auto animate-fade-in text-center">
                <div className="w-20 h-20 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-6">
                    <CheckCircle2 size={40} className="text-emerald-600" />
                </div>
                <h2 className="text-xl font-serif font-bold text-history-green mb-2">E-mail Enviado!</h2>
                <p className="text-sm text-stone-600 leading-relaxed mb-2">
                    Enviamos um link de redefinição para:
                </p>
                <p className="font-mono text-sm text-stone-700 font-bold bg-stone-100 rounded-lg px-4 py-2 inline-block mb-6">
                    {maskEmail(foundEmail)}
                </p>
                <p className="text-xs text-stone-400 leading-relaxed mb-8">
                    Verifique também a pasta de <span className="font-semibold">spam/lixo eletrônico</span>.<br />
                    O link expira em <span className="font-semibold">15 minutos</span>.
                </p>
                <button
                    onClick={goToLogin}
                    className="w-full py-3 bg-history-green text-white font-bold rounded-xl hover:bg-[#152e26] transition-all active:scale-95"
                >
                    Voltar ao Login
                </button>
            </div>
        );
    }

    // ─────────────────────────────────────────
    // RENDER PRINCIPAL: Tela de Login
    // ─────────────────────────────────────────

    return (
        <div className="bg-white p-8 rounded-xl shadow-lg border-t-4 border-history-green max-w-sm w-full mx-auto">
            <h2 className="text-2xl font-serif text-history-green font-bold mb-6 text-center">ACESSO AO LIVRÃO</h2>

            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                <Input
                    label="E-mail"
                    type="text"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seu@email.com"
                />
                <Input
                    label="Senha"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="******"
                    autoComplete="current-password"
                    required
                />

                {error && (
                    <div className="p-3 bg-red-50 text-red-600 text-xs rounded-lg border border-red-100 text-center">
                        {error}
                    </div>
                )}

                <Button type="submit" className="w-full" disabled={loading}>
                    <LogIn size={18} />
                    {loading ? 'Entrando...' : 'Entrar'}
                </Button>

                <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    disabled={loading}
                    onClick={() => handleSubmit(null, 'account')}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="inline mr-2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                    Atualizar Meu Perfil
                </Button>
            </form>

            {/* Link "Esqueci minha senha" → inicia fluxo híbrido */}
            <div className="mt-3 text-center">
                <button
                    type="button"
                    onClick={() => { setScreen('reset-search'); setResetEmail(email.trim()); }}
                    className="text-xs text-stone-400 hover:text-history-green underline transition-colors flex items-center gap-1 mx-auto"
                >
                    <KeyRound size={11} />
                    Esqueci minha senha
                </button>
            </div>

            {onSwitchRegister && (
                <div className="mt-6 pt-4 border-t border-stone-100">
                    <button
                        onClick={onSwitchRegister}
                        className="w-full px-6 py-3 rounded-xl font-semibold transition-all duration-300 bg-amber-50 text-amber-800 border-2 border-amber-400 hover:bg-amber-100 hover:border-amber-500 shadow-md hover:shadow-lg active:scale-95"
                    >
                        Novo por aqui? Criar Conta
                    </button>
                </div>
            )}
        </div>
    );
};
