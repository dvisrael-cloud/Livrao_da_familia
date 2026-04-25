import React, { useState } from 'react';
import { Users, Mail, RefreshCw, LogOut, Eye, EyeOff } from 'lucide-react';
import { adminLogin } from './services/api';

// Firebase implementation
export const Login = ({ onLogin }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const result = await adminLogin(email, password);

            if (result.status === 'success') {
                // Passa os dados do usuário para o App (Role, UID)
                onLogin(result.user);
            } else {
                setError(result.message || 'Credenciais inválidas.');
            }
        } catch (err) {
            console.error(err);
            setError('Erro ao conectar ao servidor.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-parchment p-4 font-sans">
            <div className="max-w-md w-full bg-white rounded-lg shadow-xl overflow-hidden border-t-4 border-history-green">
                <div className="bg-history-green p-6 text-center flex flex-col items-center">
                    <img src="/logo-livrao.png" alt="Logo" className="h-14 w-auto mb-3 bg-white/95 rounded-lg p-2 shadow-sm" />
                    <h1 className="text-2xl font-bold text-history-gold font-display mb-1">Livrão Admin</h1>
                    <p className="text-stone-300 text-sm uppercase tracking-wider">Painel da Comissão</p>
                </div>

                <div className="p-8">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label className="block text-sm font-bold text-history-green mb-1">E-mail da Comissão</label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full px-4 py-3 rounded-lg border border-stone-300 focus:ring-2 focus:ring-history-green focus:border-transparent outline-none transition-all"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-history-green mb-1">Senha de Acesso</label>
                            <div className="relative">
                                <input
                                    type={showPassword ? "text" : "password"}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full px-4 py-3 rounded-lg border border-stone-300 focus:ring-2 focus:ring-history-green focus:border-transparent outline-none transition-all pr-12"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-history-green transition-colors"
                                    title={showPassword ? "Ocultar senha" : "Mostrar senha"}
                                >
                                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                </button>
                            </div>
                        </div>

                        {error && (
                            <div className="text-red-600 text-sm font-semibold text-center bg-red-50 p-2 rounded">
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-history-gold text-history-green font-bold py-3 px-4 rounded-lg hover:bg-yellow-600 transition-colors shadow-md text-lg uppercase tracking-wide disabled:opacity-50 flex justify-center"
                        >
                            {loading ? (
                                <span className="w-6 h-6 border-2 border-history-green border-t-transparent rounded-full animate-spin"></span>
                            ) : 'Acessar Painel'}
                        </button>
                    </form>
                </div>
            </div >
        </div >
    );
};
