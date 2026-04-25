import React, { useState } from 'react';
import { Button, Input } from '../../components/common/UI';
import { authenticateUser } from '../../services/api';

export const LoginForm = ({ onLoginSuccess, onSwitchRegister }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e, destination = null) => {
        if (e) e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const result = await authenticateUser(email, password);
            if (result.status === 'success') {
                onLoginSuccess(result, destination);
            } else {
                setError(result.message);
            }
        } catch (err) {
            console.error("Login Failure:", err);
            setError(err.message || "Erro de conexão ou dados incorretos.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-white p-8 rounded-xl shadow-lg border-t-4 border-history-green max-w-sm w-full mx-auto">
            <h2 className="text-2xl font-serif text-history-green font-bold mb-6 text-center">Acessar Livrão</h2>

            <form onSubmit={handleSubmit} className="space-y-4">
                <Input
                    label="E-mail"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seu@email.com"
                    required
                />
                <Input
                    label="Senha"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="******"
                    required
                />

                {error && <div className="p-3 bg-red-50 text-red-600 text-xs rounded-lg border border-red-100 text-center">{error}</div>}

                <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? 'Entrando...' : 'Entrar'}
                </Button>

                <div className="text-center">
                    <button
                        type="button"
                        onClick={() => handleSubmit(null, 'account')}
                        className="text-xs text-stone-500 hover:text-history-green underline flex items-center justify-center gap-1 mx-auto"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                        Ir para Minha Conta
                    </button>
                </div>
            </form>

            <div className="mt-6 text-center pt-4 border-t border-stone-100">
                <span className="text-sm text-stone-500">Novo por aqui? </span>
                <button onClick={onSwitchRegister} className="text-sm font-bold text-history-green hover:underline">
                    Criar Conta
                </button>
            </div>
        </div>
    );
};
