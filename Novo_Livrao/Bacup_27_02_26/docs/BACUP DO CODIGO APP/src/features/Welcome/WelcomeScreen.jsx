import React, { useEffect, useState, useRef } from 'react';

export const WelcomeScreen = ({ repName, onComplete }) => {
    const [isVisible, setIsVisible] = useState(false);
    const videoRef = useRef(null);
    const hasTransitioned = useRef(false);

    const triggerTransition = () => {
        if (hasTransitioned.current) return;
        hasTransitioned.current = true;

        // Congela por 500ms no último frame, depois faz fade out
        setTimeout(() => {
            setIsVisible(false);
            setTimeout(onComplete, 500);
        }, 500);
    };

    // Bloqueia scroll do body enquanto a tela estiver aberta
    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = ''; };
    }, []);

    useEffect(() => {
        setIsVisible(true);

        // Fallback: se o vídeo não disparar onEnded em 6s, transiciona mesmo assim
        const fallback = setTimeout(triggerTransition, 6000);
        return () => clearTimeout(fallback);
    }, [onComplete]);

    return (
        <div className={`fixed inset-0 bg-stone-50 z-50 flex items-center justify-center overflow-hidden transition-opacity duration-500 ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
            <div className="text-center p-6 flex flex-col items-center">

                {/* Logo Animado */}
                <div className="w-36 h-36 sm:w-44 sm:h-44 mb-8">
                    <video
                        ref={videoRef}
                        src="/logo_movimento.mp4"
                        autoPlay
                        muted
                        playsInline
                        onEnded={triggerTransition}
                        className="w-full h-full object-contain"
                    />
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
