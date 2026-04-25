import React, { useState } from 'react';
import { authenticateUser, registerUser, resetPassword, validateInviteToken, registerUserWithInvite } from './services/api';
import { motion } from 'framer-motion';
import { Eye, EyeOff } from 'lucide-react';

export const Welcome = ({ onStart }) => {
    const [step, setStep] = useState('login'); // 'login' or 'register'
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [repName, setRepName] = useState('');

    // UI States
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Invite State
    const [inviteToken, setInviteToken] = useState(null);
    const [isInviteFlow, setIsInviteFlow] = useState(false);

    // Check for Invite Token on Load
    React.useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const token = params.get('token');

        if (token) {
            setLoading(true);
            setStep('validating');
            validateInviteToken(token).then(result => {
                if (result.status === 'success') {
                    setInviteToken(token);
                    setIsInviteFlow(true);
                    setEmail(result.data.email);
                    setRepName(result.data.repName);
                    setStep('invite'); // New step for locked register
                } else {
                    alert(result.message); // Ou setar erro
                    setStep('login');
                }
            }).finally(() => {
                setLoading(false);
            });
        }
    }, []);

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const result = await authenticateUser(email, password);
            if (result.status === 'success') {
                onStart('authenticated', result);
            } else {
                setError(result.message);
            }
        } catch (err) {
            setError("Erro interno ao tentar login.");
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        if (password.length < 6) {
            setError("A senha deve ter no mínimo 6 caracteres.");
            setLoading(false);
            return;
        }

        try {
            const result = await registerUser(email, password, repName);
            if (result.status === 'success') {
                // Auto login after register
                const authRes = await authenticateUser(email, password);
                if (authRes.status === 'success') {
                    onStart('authenticated', authRes);
                }
            } else {
                setError(result.message);
            }
        } catch (err) {
            setError("Erro ao criar conta.");
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleForgotPassword = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const result = await resetPassword(email);
            if (result.status === 'success') {
                alert('E-mail de recuperação enviado! Verifique sua caixa de entrada.');
                setStep('login');
            } else {
                setError(result.message);
            }
        } catch (err) {
            setError("Erro ao enviar e-mail.");
        } finally {
            setLoading(false);
        }

    };

    const handleInviteRegister = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        if (password.length < 6) {
            setError("A senha deve ter no mínimo 6 caracteres.");
            setLoading(false);
            return;
        }

        try {
            const result = await registerUserWithInvite(inviteToken, email, password, repName);
            if (result.status === 'success') {
                // Auto login
                const authRes = await authenticateUser(email, password);
                if (authRes.status === 'success') {
                    onStart('authenticated', authRes);
                }
            } else {
                setError(result.message);
            }
        } catch (err) {
            setError("Erro ao criar conta com convite.");
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4 font-sans">
            <div className="max-w-md w-full bg-white rounded-lg shadow-xl overflow-hidden border-t-4 border-history-green">
                <div className="bg-history-green p-6 text-center">
                    <h1 className="text-3xl font-bold text-history-gold font-display mb-2">Livrão da Família</h1>
                    <p className="text-white/80 text-lg">Preservando memórias e gerações</p>

                    <div className="mt-6 px-2 border-t border-white/10 pt-4">
                        <p className="text-white/90 text-xs italic font-serif leading-relaxed mb-2">
                            "Lembra-te dos dias da antiguidade, atenta para os anos de geração em geração, pergunta a teu pai ele te informará aos teus velhos e eles te dirão."
                        </p>
                        <p className="text-white text-sm font-serif mb-1" dir="rtl" lang="he">
                            "זְכֹר יְמוֹת עוֹלָם בִּינוּ שְׁנוֹת דּוֹר וָדוֹר שְׁאַל אָבִיךָ וְיַגֵּדְךָ זְקֵנֶיךָ וְיֹאמְרוּ לָךְ"
                        </p>
                        <p className="text-white/60 text-[10px] uppercase tracking-wider">
                            Devarim 32:7
                        </p>
                    </div>
                </div>

                <div className="p-8">
                    {step === 'login' && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                            <div className="text-center mb-6">
                                <h2 className="text-xl font-bold text-gray-800">Acesse sua conta</h2>
                                <p className="text-gray-600 text-sm">Entre para editar o seu Livrão.</p>
                            </div>
                            <form onSubmit={handleLogin} className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">E-mail</label>
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="w-full px-4 py-3 rounded-lg border border-gray-300 outline-none focus:ring-2 focus:ring-history-green"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Senha</label>
                                    <div className="relative">
                                        <input
                                            id="password-login"
                                            type={showPassword ? "text" : "password"}
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            className="w-full px-4 py-3 rounded-lg border border-gray-300 outline-none focus:ring-2 focus:ring-history-green pr-12 relative z-10 bg-transparent"
                                            placeholder="******"
                                            autoComplete="current-password"
                                            required
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-history-green z-20"
                                            tabIndex="-1"
                                        >
                                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                        </button>
                                    </div>
                                    <div className="text-right mt-1">
                                        <button type="button" onClick={() => setStep('forgot')} className="text-xs text-history-green hover:underline">
                                            Esqueci minha senha
                                        </button>
                                    </div>
                                </div>

                                {error && (
                                    <div className="text-red-500 text-sm bg-red-50 p-2 rounded text-center border border-100">
                                        {error}
                                    </div>
                                )}

                                <button type="submit" disabled={loading} className="w-full bg-history-gold text-history-green font-bold py-3 rounded-lg hover:bg-yellow-500 transition-colors shadow-sm disabled:opacity-70">
                                    {loading ? 'Entrando...' : 'Entrar'}
                                </button>

                                <div className="text-center pt-2">
                                    <span className="text-sm text-gray-500">Ainda não tem cadastro? </span>
                                    <button type="button" onClick={() => { setError(''); setStep('register'); }} className="text-sm font-bold text-history-green hover:underline">
                                        Criar conta
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    )}

                    {step === 'register' && (
                        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
                            <div className="text-center mb-6">
                                <h2 className="text-xl font-bold text-history-green">Primeiro Acesso</h2>
                                <p className="text-gray-600 text-sm">Crie sua conta para começar.</p>
                            </div>
                            <form onSubmit={handleRegister} className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Seu Nome Completo (Representante)</label>
                                    <input
                                        type="text"
                                        value={repName}
                                        onChange={(e) => setRepName(e.target.value)}
                                        placeholder="Quem está preenchendo?"
                                        className="w-full px-4 py-3 rounded-lg border border-gray-300 outline-none focus:ring-2 focus:ring-history-green"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">E-mail</label>
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="w-full px-4 py-3 rounded-lg border border-gray-300 outline-none focus:ring-2 focus:ring-history-green"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Crie uma Senha</label>
                                    <div className="relative">
                                        <input
                                            type={showPassword ? "text" : "password"}
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            className="w-full px-4 py-3 rounded-lg border border-gray-300 outline-none focus:ring-2 focus:ring-history-green pr-12"
                                            required
                                            minLength={6}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-history-green"
                                        >
                                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                        </button>
                                    </div>
                                    <p className="text-xs text-gray-400 mt-1">Mínimo de 6 caracteres</p>
                                </div>

                                {error && (
                                    <div className="text-red-500 text-sm bg-red-50 p-2 rounded text-center border border-red-100">
                                        {error}
                                    </div>
                                )}

                                <button type="submit" disabled={loading} className="w-full bg-history-gold text-history-green font-bold py-3 rounded-lg hover:bg-yellow-500 transition-colors shadow-sm disabled:opacity-70">
                                    {loading ? 'Criando Conta...' : 'Cadastrar e Entrar'}
                                </button>

                                <div className="text-center pt-2">
                                    <button type="button" onClick={() => { setError(''); setStep('login'); }} className="text-sm text-gray-500 hover:text-history-green">
                                        Já tenho conta. Fazer Login.
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    )}

                    {step === 'forgot' && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                            <div className="text-center mb-6">
                                <h2 className="text-xl font-bold text-gray-800">Recuperar Senha</h2>
                                <p className="text-gray-600 text-sm">Digite seu e-mail para receber um link de redefinição.</p>
                            </div>
                            <form onSubmit={handleForgotPassword} className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">E-mail</label>
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="w-full px-4 py-3 rounded-lg border border-gray-300 outline-none focus:ring-2 focus:ring-history-green"
                                        required
                                    />
                                </div>

                                {error && (
                                    <div className="text-red-500 text-sm bg-red-50 p-2 rounded text-center border border-red-100">
                                        {error}
                                    </div>
                                )}

                                <button type="submit" disabled={loading} className="w-full bg-history-gold text-history-green font-bold py-3 rounded-lg hover:bg-yellow-500 transition-colors shadow-sm disabled:opacity-70">
                                    {loading ? 'Enviando E-mail...' : 'Recuperar Senha'}
                                </button>

                                <div className="text-center pt-2">
                                    <button type="button" onClick={() => { setError(''); setStep('login'); }} className="text-sm text-gray-500 hover:text-history-green">
                                        Voltar para o Login
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    )}
                    {step === 'validating' && (
                        <div className="text-center py-10">
                            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-history-green mx-auto mb-4"></div>
                            <p className="text-gray-600">Verificando convite...</p>
                        </div>
                    )}

                    {step === 'invite' && (
                        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
                            <div className="text-center mb-6">
                                <h2 className="text-xl font-bold text-history-green">Convite Especial</h2>
                                <p className="text-gray-600 text-sm">finalize seu cadastro para acessar o Livrão.</p>
                            </div>
                            <form onSubmit={handleInviteRegister} className="space-y-4">
                                <div className="p-3 bg-green-50 text-green-800 text-xs rounded border border-green-100 mb-2">
                                    <span className="font-bold">Convite verificado!</span> Alguns dados foram preenchidos automaticamente.
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Seu Nome (Representante)</label>
                                    <input
                                        type="text"
                                        value={repName}
                                        readOnly
                                        className="w-full px-4 py-3 rounded-lg border border-gray-200 bg-gray-100 text-gray-500 cursor-not-allowed"
                                        title="Definido pelo convite"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">E-mail Oficial</label>
                                    <div className="relative">
                                        <input
                                            type="email"
                                            value={email}
                                            readOnly
                                            className="w-full px-4 py-3 rounded-lg border border-gray-200 bg-gray-100 text-gray-500 cursor-not-allowed pr-10"
                                            title="Definido pelo convite"
                                        />
                                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">🔒</span>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Crie sua Senha</label>
                                    <div className="relative">
                                        <input
                                            type={showPassword ? "text" : "password"}
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            className="w-full px-4 py-3 rounded-lg border border-gray-300 outline-none focus:ring-2 focus:ring-history-green pr-12"
                                            required
                                            minLength={6}
                                            placeholder="Mínimo 6 caracteres"
                                            autoFocus
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-history-green"
                                        >
                                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                        </button>
                                    </div>
                                </div>

                                {error && (
                                    <div className="text-red-500 text-sm bg-red-50 p-2 rounded text-center border border-red-100">
                                        {error}
                                    </div>
                                )}

                                <button type="submit" disabled={loading} className="w-full bg-history-gold text-history-green font-bold py-3 rounded-lg hover:bg-yellow-500 transition-colors shadow-sm disabled:opacity-70">
                                    {loading ? 'Finalizando...' : 'Confirmar e Entrar'}
                                </button>

                                <div className="text-center pt-2">
                                    <button type="button" onClick={() => { setStep('login'); setInviteToken(null); }} className="text-sm text-gray-400 hover:text-gray-600">
                                        Cancelar e voltar ao login
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    )}
                </div>
            </div>
        </div>
    );
};
