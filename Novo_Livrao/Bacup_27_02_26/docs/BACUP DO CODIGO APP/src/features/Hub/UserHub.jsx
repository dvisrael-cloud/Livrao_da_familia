/**
 * PROJETO: Livrão da Família
 * DESENVOLVIMENTO: HOD (CNPJ: 11.702.142/0001-70)
 * AUTOR: David Vidal Israel (dvisrael@hotmail.com)
 * PARCERIA: Comissão Livrão da Família (Presidida por Marcia Barcessat Rubistein)
 * ASSISTÊNCIA: IA Google Gemini
 * STATUS: Código em fase de ajuste/migração Firebase
 * © 2025 HOD. Todos os direitos reservados.
 */

import React, { useEffect } from 'react';
import { FaSitemap, FaAddressCard, FaUtensils } from 'react-icons/fa6';

export const UserHub = ({ repName, onNavigate, onLogout, familyMembers = {} }) => {

    // Bloqueia scroll do body enquanto o Console estiver aberto
    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = ''; };
    }, []);

    // Contagem rápida de membros para status
    const memberCount = Object.keys(familyMembers).length;
    const hasData = memberCount > 0;

    return (
        <div className="h-full flex flex-col items-center justify-center p-4 animate-fade-in relative z-10 overflow-hidden">

            {/* Stack Vertical de Cartões (Novo Layout) */}
            <div className="flex flex-col gap-4 w-full max-w-md">

                {/* CARD 1: ÁRVORE FAMILIAR */}
                <button
                    onClick={() => onNavigate('form')}
                    className="group relative bg-gradient-to-br from-emerald-50 to-teal-50 border-2 border-emerald-200 rounded-3xl p-6 shadow-lg hover:shadow-2xl hover:border-emerald-400 transition-all duration-300 text-left flex items-center gap-4 overflow-hidden hover:-translate-y-1 active:scale-98"
                >
                    {/* Ícone Transparente de Fundo */}
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-10 group-hover:opacity-20 transition-opacity pointer-events-none">
                        <FaSitemap className="w-32 h-32 text-emerald-600" />
                    </div>

                    {/* Conteúdo */}
                    <div className="flex-1 z-10">
                        <h3 className="text-xl font-serif font-bold text-slate-800 mb-1 group-hover:text-emerald-700 transition-colors">
                            Árvore Familiar
                        </h3>
                        <p className="text-slate-600 text-sm leading-snug">
                            Preencher dados genealógicos e construir a árvore da família
                        </p>
                    </div>

                    {/* Seta */}
                    <div className="flex-shrink-0 z-10">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-emerald-600 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                    </div>
                </button>

                {/* CARD 2: ÁLBUM DIGITAL */}
                <button
                    onClick={() => onNavigate('gallery')}
                    className="group relative bg-gradient-to-br from-amber-50 to-yellow-50 border-2 border-amber-200 rounded-3xl p-6 shadow-lg hover:shadow-2xl hover:border-amber-400 transition-all duration-300 text-left flex items-center gap-4 overflow-hidden hover:-translate-y-1 active:scale-98"
                >
                    {/* Ícone Transparente de Fundo */}
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-10 group-hover:opacity-20 transition-opacity pointer-events-none">
                        <FaAddressCard className="w-32 h-32 text-amber-600" />
                    </div>

                    {/* Conteúdo */}
                    <div className="flex-1 z-10">
                        <h3 className="text-xl font-serif font-bold text-slate-800 mb-1 group-hover:text-amber-700 transition-colors">
                            Álbum Digital
                        </h3>
                        <p className="text-slate-600 text-sm leading-snug">
                            Digitalize e organize as fotos de cada parente
                        </p>
                    </div>

                    {/* Seta */}
                    <div className="flex-shrink-0 z-10">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-amber-600 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                    </div>
                </button>

                {/* CARD 3: RECEITAS DE FAMÍLIA */}
                <button
                    onClick={() => onNavigate('recipes')}
                    className="group relative bg-gradient-to-br from-rose-50 to-pink-50 border-2 border-rose-200 rounded-3xl p-6 shadow-lg hover:shadow-2xl hover:border-rose-400 transition-all duration-300 text-left flex items-center gap-4 overflow-hidden hover:-translate-y-1 active:scale-98"
                >
                    {/* Ícone Transparente de Fundo */}
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-10 group-hover:opacity-20 transition-opacity pointer-events-none">
                        <FaUtensils className="w-32 h-32 text-rose-600" />
                    </div>

                    {/* Conteúdo */}
                    <div className="flex-1 z-10">
                        <h3 className="text-xl font-serif font-bold text-slate-800 mb-1 group-hover:text-rose-700 transition-colors">
                            Receitas
                        </h3>
                        <p className="text-slate-600 text-sm leading-snug">
                            Preserve as receitas tradicionais da família
                        </p>
                    </div>

                    {/* Seta */}
                    <div className="flex-shrink-0 z-10">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-rose-600 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                    </div>
                </button>
            </div>

            {/* Acesso Minha Conta */}
            <div className="w-full max-w-md mt-6">
                <button
                    onClick={() => onNavigate('account')}
                    className="w-full bg-gradient-to-r from-slate-100 to-slate-200 hover:from-slate-200 hover:to-slate-300 text-slate-700 font-semibold py-3.5 rounded-xl transition-all duration-300 shadow-md hover:shadow-lg flex items-center justify-center gap-2.5 border-2 border-slate-300 hover:border-slate-400 active:scale-98"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                    Minha Conta (Configurações)
                </button>
            </div>


            {/* Footer / Logout */}
            <div className="mt-16">
                <button
                    onClick={onLogout}
                    className="text-slate-400 hover:text-red-600 text-sm font-medium flex items-center gap-2.5 transition-all duration-300 px-6 py-2.5 rounded-xl hover:bg-red-50 hover:shadow-md active:scale-95 border-2 border-transparent hover:border-red-200"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    Sair com segurança
                </button>
            </div>


        </div>
    );
};
