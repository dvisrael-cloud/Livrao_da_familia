/**
 * PROJETO: Livrão da Família
 * DESENVOLVIMENTO: HOD (CNPJ: 11.702.142/0001-70)
 * AUTOR: David Vidal Israel (dvisrael@hotmail.com)
 * PARCERIA: Comissão Livrão da Família (Presidida por Marcia Barcessat Rubistein)
 * ASSISTÊNCIA: IA Google Gemini
 * STATUS: Código em fase de ajuste/migração Firebase
 * © 2025 HOD. Todos os direitos reservados.
 */

import React, { useEffect, useState } from 'react';
import { FaSitemap, FaAddressCard } from 'react-icons/fa6';
import { Smartphone, X } from 'lucide-react';

// --- Detecção de SO ---
const detectOS = () => {
    const ua = navigator.userAgent;
    if (/iPhone|iPad|iPod/i.test(ua)) return 'ios';
    if (/Android/i.test(ua)) return 'android';
    if (/Win/i.test(navigator.platform || ua)) return 'windows';
    if (/Mac/i.test(navigator.platform || ua)) return 'mac';
    return 'linux';
};

const isStandalone = () =>
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true;

// --- Config por SO ---
const OS_CONFIG = {
    ios: {
        label: 'iPhone / iPad',
        icon: '🍎',
        color: '#f1f5f9',
        border: '#cbd5e1',
        text: '#334155',
        installSteps: [
            'No Safari, toque no botão Compartilhar (□↑) na barra inferior.',
            'Role a lista e toque em "Adicionar à Tela de Início".',
            'Confirme o nome e toque em "Adicionar".',
        ],
        fixTip: 'Pressione e segure o ícone → toque em "Editar tela inicial" → arraste-o para a primeira página.',
    },
    android: {
        label: 'Android',
        icon: '🤖',
        color: '#f0fdf4',
        border: '#86efac',
        text: '#166534',
        installSteps: [
            'No Chrome, toque no menu (⋮) no canto superior direito.',
            'Selecione "Adicionar à tela inicial".',
            'Confirme e toque em "Adicionar".',
        ],
        fixTip: 'Pressione e segure o ícone → arraste para o topo da tela inicial para fixá-lo.',
    },
    windows: {
        label: 'Windows',
        icon: '🖥️',
        color: '#eff6ff',
        border: '#93c5fd',
        text: '#1e40af',
        installSteps: [
            'No Chrome ou Edge, clique no ícone de instalação (⊕) na barra de endereços.',
            'Clique em "Instalar" na caixa de diálogo.',
            'O Livrão abrirá como app independente.',
        ],
        fixTip: 'Clique com o botão direito no ícone do Livrão na barra de tarefas → "Fixar na barra de tarefas".',
    },
    mac: {
        label: 'Mac',
        icon: '🍎',
        color: '#f8fafc',
        border: '#cbd5e1',
        text: '#334155',
        installSteps: [
            'No Chrome ou Edge, clique no ícone de instalação (⊕) na barra de endereços.',
            'Clique em "Instalar".',
            'O Livrão abrirá como app independente no Mac.',
        ],
        fixTip: 'Clique com o botão direito no ícone do Livrão no Dock → "Opções" → "Manter no Dock".',
    },
    linux: {
        label: 'Linux',
        icon: '🐧',
        color: '#fefce8',
        border: '#fde047',
        text: '#713f12',
        installSteps: [
            'No Chrome, clique no ícone de instalação (⊕) na barra de endereços.',
            'Clique em "Instalar".',
        ],
        fixTip: 'Adicione o atalho do Livrão à sua barra de favoritos ou dock do sistema.',
    },
};

// Modal interno isolado — detecta o SO no momento da abertura
const PWATipsModal = ({ standalone, onClose }) => {
    const os = detectOS();
    const cfg = OS_CONFIG[os];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 relative">
                <button onClick={onClose} className="absolute top-3 right-3 text-slate-400 hover:text-slate-700 transition-colors">
                    <X size={20} />
                </button>

                {/* Cabeçalho */}
                <div className="flex items-center gap-3 mb-5">
                    <span className="text-4xl">{cfg.icon}</span>
                    <div>
                        <h3 className="font-bold text-slate-800 text-base leading-snug">
                            {standalone
                                ? `Você já está usando o App! ✅`
                                : `Como instalar o Livrão no seu ${cfg.label}`}
                        </h3>
                        <p className="text-slate-500 text-xs mt-0.5">
                            {standalone
                                ? `Para nunca perdê-lo de vista no ${cfg.label}:`
                                : 'Siga os passos abaixo:'}
                        </p>
                    </div>
                </div>

                {/* Conteúdo dinâmico */}
                <div
                    className="rounded-xl p-4 border"
                    style={{ background: cfg.color, borderColor: cfg.border }}
                >
                    {standalone ? (
                        <p className="text-sm leading-relaxed" style={{ color: cfg.text }}>
                            {cfg.fixTip}
                        </p>
                    ) : (
                        <ol className="space-y-2">
                            {cfg.installSteps.map((step, i) => (
                                <li key={i} className="flex gap-2 text-xs leading-relaxed" style={{ color: cfg.text }}>
                                    <span className="font-bold shrink-0">{i + 1}.</span>
                                    <span>{step}</span>
                                </li>
                            ))}
                        </ol>
                    )}
                </div>

                <button
                    onClick={onClose}
                    className="w-full mt-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all active:scale-95"
                    style={{ background: '#1d4ed8' }}
                >
                    Entendi!
                </button>
            </div>
        </div>
    );
};

export const UserHub = ({ onNavigate, onLogout, deferredPrompt, onPWAInstall }) => {
    const [showTipsModal, setShowTipsModal] = useState(false);
    const [installed, setInstalled] = useState(isStandalone());

    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = ''; };
    }, []);

    useEffect(() => {
        const handler = () => setInstalled(true);
        window.addEventListener('appinstalled', handler);
        return () => window.removeEventListener('appinstalled', handler);
    }, []);

    const handleInstallClick = () => {
        if (installed || !deferredPrompt) {
            setShowTipsModal(true);
        } else {
            onPWAInstall();
        }
    };

    return (
        <div className="h-full flex flex-col items-center justify-center p-4 animate-fade-in relative z-10 overflow-hidden">

            {showTipsModal && (
                <PWATipsModal standalone={installed} onClose={() => setShowTipsModal(false)} />
            )}

            {/* Stack Vertical de Cartões */}
            <div className="flex flex-col gap-4 w-full max-w-md">

                {/* CARD 1: ÁRVORE FAMILIAR */}
                <button
                    onClick={() => onNavigate('form')}
                    className="group relative bg-gradient-to-br from-emerald-50 to-teal-50 border-2 border-emerald-200 rounded-3xl p-6 shadow-lg hover:shadow-2xl hover:border-emerald-400 transition-all duration-300 text-left flex items-center gap-4 overflow-hidden hover:-translate-y-1 active:scale-98"
                >
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-10 group-hover:opacity-20 transition-opacity pointer-events-none">
                        <FaSitemap className="w-32 h-32 text-emerald-600" />
                    </div>
                    <div className="flex-1 z-10">
                        <h3 className="text-xl font-serif font-bold text-slate-800 mb-1 group-hover:text-emerald-700 transition-colors">
                            Árvore Familiar
                        </h3>
                        <p className="text-slate-600 text-sm leading-snug">
                            Preencher dados genealógicos e construir a árvore da família
                        </p>
                    </div>
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
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-10 group-hover:opacity-20 transition-opacity pointer-events-none">
                        <FaAddressCard className="w-32 h-32 text-amber-600" />
                    </div>
                    <div className="flex-1 z-10">
                        <h3 className="text-xl font-serif font-bold text-slate-800 mb-1 group-hover:text-amber-700 transition-colors">
                            Álbum Digital
                        </h3>
                        <p className="text-slate-600 text-sm leading-snug">
                            Digitalize e organize as fotos de cada parente
                        </p>
                    </div>
                    <div className="flex-shrink-0 z-10">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-amber-600 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                    </div>
                </button>

            </div>

            {/* Botão Secundário: apenas Minha Conta */}
            <div className="w-full max-w-md mt-6">
                <button
                    onClick={() => onNavigate('account')}
                    className="w-full bg-gradient-to-r from-slate-100 to-slate-200 hover:from-slate-200 hover:to-slate-300 text-slate-700 font-semibold py-3.5 rounded-xl transition-all duration-300 shadow-md hover:shadow-lg flex items-center justify-center gap-2.5 border-2 border-slate-300 hover:border-slate-400 active:scale-98"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                    Minha Conta (Configurações)
                </button>
            </div>

            {/* Footer: Instalar App + Sair — mesmo tamanho, bloco compacto */}
            <div className="mt-8 flex flex-col items-center gap-2">

                {/* BOTÃO INSTALAR APP */}
                <button
                    onClick={handleInstallClick}
                    className="text-sm font-medium flex items-center gap-2.5 transition-all duration-300 px-6 py-2.5 rounded-xl active:scale-95 border-2 hover:shadow-md"
                    style={{
                        background: installed ? '#dbeafe' : '#1e40af',
                        borderColor: installed ? '#93c5fd' : '#1e3a8a',
                        color: installed ? '#1e40af' : '#ffffff'
                    }}
                >
                    <Smartphone className="h-4 w-4" />
                    {installed ? 'App Instalado ✅' : 'Instalar App / Criar Ícone'}
                </button>

                {/* BOTÃO SAIR */}
                <button
                    onClick={onLogout}
                    className="text-sm font-medium flex items-center gap-2.5 transition-all duration-300 px-6 py-2.5 rounded-xl active:scale-95 border-2 bg-slate-200 border-slate-300 text-slate-600 hover:bg-red-50 hover:text-red-600 hover:border-red-200 hover:shadow-md"
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
