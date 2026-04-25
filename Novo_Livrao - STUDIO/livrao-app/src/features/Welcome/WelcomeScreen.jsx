import React, { useEffect, useState } from 'react';

export const WelcomeScreen = ({ repName, onComplete }) => {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        // Trigger fade in on mount
        setIsVisible(true);

        // Wait 3 seconds, then trigger fade out and call onComplete
        const timer = setTimeout(() => {
            setIsVisible(false);
            // Wait for fade out animation before unmounting
            setTimeout(onComplete, 500);
        }, 3000);

        return () => clearTimeout(timer);
    }, [onComplete]);

    return (
        <div className={`fixed inset-0 bg-stone-50 z-50 flex items-center justify-center transition-opacity duration-500 ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
            <div className="text-center p-6 flex flex-col items-center">

                {/* Ícone Animado */}
                <div className="w-24 h-24 sm:w-32 sm:h-32 bg-white rounded-full shadow-lg border-2 border-white ring-1 ring-slate-100 overflow-hidden flex items-center justify-center mb-8 animate-bounce">
                    <img src="/logo-livrao.png" alt="Livrão" className="w-full h-full object-cover" />
                </div>

                {/* Saudação */}
                <p className="text-stone-500 font-serif italic mb-2 text-lg sm:text-xl">Shalom,</p>
                <h1 className="text-4xl md:text-5xl font-serif font-bold text-history-green mb-4">
                    {repName || 'Família'}
                </h1>

                {/* Mensagem */}
                <p className="text-stone-600 max-w-md mx-auto text-lg">
                    Bem-vindo ao console da sua história.
                </p>

            </div>
        </div>
    );
};
