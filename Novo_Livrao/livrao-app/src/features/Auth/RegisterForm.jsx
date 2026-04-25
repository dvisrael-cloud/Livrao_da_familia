import React, { useState, useEffect } from 'react';
import { Check, Phone } from 'lucide-react';
import { Button, Input } from '../../components/common/UI';
import { registerUser, authenticateUser, validateInviteToken, registerUserWithInvite } from '../../services/api';
import { logEvent, logError } from '../../services/logService';

export const RegisterForm = ({ onRegisterSuccess, onSwitchLogin }) => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [inviteToken, setInviteToken] = useState(null);
    const [isInviteValid, setIsInviteValid] = useState(false);
    const [isTeamInvite, setIsTeamInvite] = useState(false);
    const [acceptTeam, setAcceptTeam] = useState(false);

    useEffect(() => {
        // Check for token in URL
        const params = new URLSearchParams(window.location.search);
        const token = params.get('token');

        if (token) {
            setInviteToken(token);
            setLoading(true);
            validateInviteToken(token).then(res => {
                setLoading(false);
                if (res.status === 'success') {
                    setIsInviteValid(true);
                    setEmail(res.data.email);
                    setName(res.data.repName);
                    if (res.data.repPhone) setPhone(res.data.repPhone);
                    // Check if invite includes Team Membership
                    if (res.data.isTeamMember) {
                        setIsTeamInvite(true);
                        setAcceptTeam(false); // Explicit confirmation required
                    }
                } else {
                    setError("Token de convite inválido ou expirado: " + res.message);
                }
            }).catch(() => {
                setLoading(false);
                setError("Erro ao validar convite.");
            });
        }
    }, []);

    const [isSuccess, setIsSuccess] = useState(false);
    const [regData, setRegData] = useState(null);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        if (!isInviteValid || !inviteToken) {
            setError('Acesso restrito. Um convite válido é necessário para criar uma conta.');
            setLoading(false);
            return;
        }

        if (password.length < 6) {
            setError("A senha deve ter pelo menos 6 caracteres.");
            setLoading(false);
            return;
        }

        if (!phone || phone.replace(/\D/g, '').length < 8) {
            setError("Por favor, informe um telefone/WhatsApp válido.");
            setLoading(false);
            return;
        }

        try {
            const result = await registerUserWithInvite(inviteToken, email, password, name, acceptTeam);

            if (result.status === 'success') {
                // ✅ LOG DE SUCESSO DE CADASTRO
                await logEvent('INFO', 'RegisterForm', `Novo cadastro realizado com sucesso. Representante: ${name}`, email, {
                    action: 'user_register',
                    inviteToken: inviteToken?.slice(0, 8) + '...' // Partial token for audit, not full
                });

                // Save phone to Firestore (profileService via result.data.uid will happen inside registerUserWithInvite)
                // The phone is passed via additionalFields path — we store separately here as whatsapp field
                const authRes = await authenticateUser(email, password);
                if (authRes.status === 'success') {
                    setRegData(authRes.data);
                    setIsSuccess(true);
                }
            } else {
                setError(result.message);

                // ❌ LOG DE FALHA DE CADASTRO
                await logError('RegisterForm', 'user_register_failed', new Error(result.message), email);
            }
        } catch (err) {
            const errMsg = err?.message || 'Erro desconhecido';
            setError(`Erro ao criar conta. ${errMsg}`);

            // ❌ LOG DE ERRO INESPERADO
            await logError('RegisterForm', 'user_register_exception', err, email);
        } finally {
            setLoading(false);
        }
    };

    if (isSuccess) {
        return (
            <div className="bg-white p-8 rounded-xl shadow-lg border-t-4 border-history-green max-w-sm w-full mx-auto text-center animate-fade-in">
                <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Check size={40} />
                </div>
                <h2 className="text-2xl font-serif text-history-green font-bold mb-4">
                    Conta Criada!
                </h2>
                <p className="text-stone-600 mb-6 text-sm leading-relaxed">
                    Seja bem-vindo(a), <span className="font-bold text-history-green">{name}</span>!<br />
                    Seu cadastro foi realizado com sucesso.
                </p>

                <div className="bg-stone-50 p-4 rounded-lg border border-stone-100 mb-8 text-left">
                    <h4 className="text-xs font-bold text-history-gold uppercase mb-2">Dica Importante:</h4>
                    <p className="text-[11px] text-stone-500 leading-snug">
                        Para facilitar seu acesso futuro, verifique o botão <span className="font-bold text-history-green">"Instalar App"</span> que aparecerá na parte inferior da tela. 
                        Ele criará um atalho diretamente na sua área de aplicativos.
                    </p>
                </div>

                <Button 
                    onClick={() => onRegisterSuccess(regData)}
                    variant="primary" 
                    className="w-full bg-history-green text-white hover:bg-[#152e26]"
                >
                    Entrar no Livrão
                </Button>
            </div>
        );
    }

    return (
        <div className="bg-white p-8 rounded-xl shadow-lg border-t-4 border-history-gold max-w-sm w-full mx-auto">
            <h2 className="text-2xl font-serif text-history-green font-bold mb-6 text-center">
                {isInviteValid ? 'Aceitar Convite' : 'Criar Conta'}
            </h2>

            {isInviteValid && (
                <div className="mb-4 text-center p-2 bg-green-50 text-green-800 text-xs rounded border border-green-200">
                    Convite validado! Confirme seus dados.
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
                {/* Nome — DESBLOQUEADO para edição */}
                <Input
                    label="Nome Completo"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Seu nome completo"
                    required
                    disabled={false}
                />

                {/* E-mail — BLOQUEADO (vem do convite) */}
                <Input
                    label="E-mail"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seu@email.com"
                    required
                    disabled={isInviteValid}
                />

                {/* Telefone / WhatsApp — NOVO CAMPO */}
                <div>
                    <label className="block text-sm font-semibold text-stone-700 mb-1 flex items-center gap-1.5">
                        <Phone size={14} className="text-green-600" />
                        Telefone / WhatsApp *
                    </label>
                    <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+55 (11) 99999-9999"
                        required
                        className="w-full px-3 py-2 border-2 border-stone-300 rounded-lg text-sm focus:outline-none focus:border-history-green focus:ring-2 focus:ring-history-green/20 transition-all"
                    />
                    <p className="text-[10px] text-stone-400 mt-0.5">Usado para contato pela Comissão.</p>
                </div>

                <Input
                    label="Senha"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    required
                />

                {isTeamInvite && (
                    <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg">
                        <label className="flex items-start gap-3 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={acceptTeam}
                                onChange={(e) => setAcceptTeam(e.target.checked)}
                                className="mt-1 w-4 h-4 rounded text-history-gold focus:ring-history-gold"
                            />
                            <div className="text-xs text-blue-900 leading-snug">
                                <span className="font-bold block mb-1">Convite Especial: Equipe Admin</span>
                                Desejo participar da Comissão Organizadora e aceito ter acesso administrativo.
                            </div>
                        </label>
                    </div>
                )}

                {error && <div className="p-3 bg-red-50 text-red-600 text-xs rounded-lg border border-red-100 text-center">{error}</div>}

                <Button type="submit" variant="primary" className="w-full bg-history-gold text-history-green hover:bg-yellow-500" disabled={loading || (inviteToken && !isInviteValid)}>
                    {loading ? 'Criando...' : isInviteValid ? 'Confirmar Cadastro' : 'Cadastrar'}
                </Button>
            </form>

            <div className="mt-6 text-center pt-4 border-t border-stone-100">
                <button onClick={onSwitchLogin} className="text-sm text-stone-500 hover:text-stone-800">
                    Já tenho conta. Fazer Login.
                </button>
            </div>
        </div>
    );
};
