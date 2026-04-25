import React, { useState, useEffect } from 'react';
import { Button, Input } from '../../components/common/UI';
import { registerUser, authenticateUser, validateInviteToken, registerUserWithInvite } from '../../services/api';

export const RegisterForm = ({ onRegisterSuccess, onSwitchLogin }) => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
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
                    // Check if invite includes Team Membership
                    if (res.data.isTeamMember) {
                        setIsTeamInvite(true);
                        setAcceptTeam(true); // Default checked? User said "selection button for... CONFIRM", maybe default unchecked for explicit action?
                        // Let's default to false to require explicit "selection/confirmation" per user intent phrase "confirmar"
                        setAcceptTeam(false);
                    }
                } else {
                    setError("Token de convite inválido ou expirado: " + res.message);
                }
            }).catch(err => {
                setLoading(false);
                setError("Erro ao validar convite.");
            });
        }
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        if (password.length < 6) {
            setError("A senha deve ter pelo menos 6 caracteres.");
            setLoading(false);
            return;
        }

        try {
            let result;

            if (isInviteValid && inviteToken) {
                // Register with Invite + Team Acceptance Flag
                result = await registerUserWithInvite(inviteToken, email, password, name, acceptTeam);
            } else {
                // Register Standard (Should checking duplicates be handled? API handles duplicats)
                result = await registerUser(email, password, name);
            }

            if (result.status === 'success') {
                const authRes = await authenticateUser(email, password);
                if (authRes.status === 'success') {
                    onRegisterSuccess(authRes);
                }
            } else {
                setError(result.message);
            }
        } catch (err) {
            setError("Erro ao criar conta. Tente outro e-mail.");
        } finally {
            setLoading(false);
        }
    };

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
                <Input
                    label="Nome Completo"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Seu nome"
                    required
                    disabled={isInviteValid} // Lock if invite
                />
                <Input
                    label="E-mail"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seu@email.com"
                    required
                    disabled={isInviteValid} // Lock if invite
                />
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
