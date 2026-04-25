import React, { useState, useEffect } from 'react';
import { Download, X, Smartphone } from 'lucide-react';
import { db } from '../services/firebase';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';

const PWAInstallPrompt = ({ userSession, deferredPrompt, setDeferredPrompt }) => {
    const [isVisible, setIsVisible] = useState(false);

    // Grava no Firestore que o usuário instalou o PWA
    const markAsInstalled = async () => {
        if (!userSession?.uid) return;
        try {
            await updateDoc(doc(db, 'familias', userSession.uid), {
                pwaInstalled: true,
                pwaInstalledAt: serverTimestamp()
            });
        } catch (_) { /* silencioso */ }
    };

    useEffect(() => {
        const handler = (e) => {
            // we already handle this in App.jsx but keeping this for robustness
            // setDeferredPrompt(e); 
            
            const isInstalled = window.matchMedia('(display-mode: standalone)').matches;
            const hasDismissed = localStorage.getItem('pwa_prompt_dismissed');

            if (!isInstalled && !hasDismissed) {
                setIsVisible(true);
            }
        };

        const onAppInstalled = () => {
            setDeferredPrompt(null);
            setIsVisible(false);
            console.log('App instalado com sucesso!');
            markAsInstalled();
        };

        window.addEventListener('beforeinstallprompt', handler);
        window.addEventListener('appinstalled', onAppInstalled);

        // Pre-check if already promptable
        if (deferredPrompt && !isVisible) {
             const isInstalled = window.matchMedia('(display-mode: standalone)').matches;
             const hasDismissed = localStorage.getItem('pwa_prompt_dismissed');
             if (!isInstalled && !hasDismissed) setIsVisible(true);
        }

        return () => {
            window.removeEventListener('beforeinstallprompt', handler);
            window.removeEventListener('appinstalled', onAppInstalled);
        };
    }, [userSession, deferredPrompt]);

    const handleInstallClick = async () => {
        if (!deferredPrompt) return;

        deferredPrompt.prompt();

        const { outcome } = await deferredPrompt.userChoice;
        console.log(`Usuário escolheu: ${outcome}`);

        if (outcome === 'accepted') {
            setIsVisible(false);
            markAsInstalled();
        }
        setDeferredPrompt(null);
    };

    const handleDismiss = () => {
        setIsVisible(false);
        localStorage.setItem('pwa_prompt_dismissed', 'true');
    };

    if (!isVisible) return null;

    return (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] w-[90%] max-w-sm animate-fade-in-up">
            <div className="bg-[#1c3d33] text-white p-4 rounded-2xl shadow-2xl border border-[#c5a059]/30 flex items-center gap-4 relative overflow-hidden group">
                {/* Background Decor */}
                <div className="absolute top-0 right-0 w-24 h-24 bg-[#c5a059]/10 rounded-full -mr-12 -mt-12 blur-2xl" />

                <div className="bg-[#c5a059] p-3 rounded-xl text-[#1c3d33]">
                    <Smartphone size={24} />
                </div>

                <div className="flex-1">
                    <h4 className="font-serif font-bold text-sm text-[#c5a059]">Instalar App</h4>
                    <p className="text-[11px] text-stone-300 leading-tight">
                        Adicione um atalho do Livrão na sua tela de aplicativos para acesso rápido.
                    </p>
                </div>

                <div className="flex flex-col gap-2">
                    <button
                        onClick={handleInstallClick}
                        className="bg-[#c5a059] text-[#1c3d33] px-3 py-1.5 rounded-lg text-[11px] font-bold hover:bg-[#d4b57a] transition-colors flex items-center gap-1 shadow-lg"
                    >
                        <Download size={12} /> Instalar
                    </button>
                </div>

                <button
                    onClick={handleDismiss}
                    className="absolute top-2 right-2 text-stone-400 hover:text-white p-1"
                >
                    <X size={14} />
                </button>
            </div>
        </div>
    );
};

export default PWAInstallPrompt;
