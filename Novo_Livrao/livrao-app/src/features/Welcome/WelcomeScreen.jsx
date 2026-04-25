import React, { useEffect, useState, useRef } from 'react';
import aberturaVideo from '../../../public/abertura_movimento.mp4';

const VERSE = "Lembra-te dos dias antigos; reflete sobre os anos das gerações passadas. Pergunta a teu pai, e ele te contará; aos teus anciãos, e eles te informarão.";
const VERSE_SOURCE = "— Devarim 32:7";
const CHAR_DELAY_MS = 28; // speed per character (ms)

export const WelcomeScreen = ({ repName, onComplete }) => {
    const [isVisible, setIsVisible] = useState(false);
    const [typedText, setTypedText] = useState('');
    const videoRef = useRef(null);
    const hasTransitioned = useRef(false);
    const typingTimerRef = useRef(null);

    const triggerTransition = () => {
        if (hasTransitioned.current) return;
        hasTransitioned.current = true;
        clearTimeout(typingTimerRef.current);
        setTimeout(() => {
            setIsVisible(false);
            setTimeout(onComplete, 500);
        }, 600);
    };

    // Bloqueia scroll do body enquanto a tela estiver aberta
    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = ''; };
    }, []);

    // Fade in + fallback timer
    useEffect(() => {
        setIsVisible(true);
        // Explicit play to circumvent some autoplay blocks
        if (videoRef.current) {
            videoRef.current.play().catch(e => console.log("Autoplay blocked/failed:", e));
        }
        const fallback = setTimeout(triggerTransition, 8000);
        return () => clearTimeout(fallback);
    }, [onComplete]);

    // Typewriter effect
    useEffect(() => {
        let idx = 0;
        const type = () => {
            if (idx <= VERSE.length) {
                setTypedText(VERSE.slice(0, idx));
                idx++;
                typingTimerRef.current = setTimeout(type, CHAR_DELAY_MS);
            }
        };
        // Small delay before starting typing so the logo can appear first
        const startDelay = setTimeout(type, 400);
        return () => {
            clearTimeout(startDelay);
            clearTimeout(typingTimerRef.current);
        };
    }, []);

    return (
        <div className={`fixed inset-0 bg-stone-50 z-50 flex items-center justify-center overflow-hidden transition-opacity duration-500 ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
            <div className="text-center p-6 flex flex-col items-center max-w-lg w-full">

                {/* Logo Animado */}
                <div className="w-28 h-28 sm:w-36 sm:h-36 mb-5">
                    <video
                        ref={videoRef}
                        src={aberturaVideo}
                        autoPlay
                        muted
                        playsInline
                        onEnded={triggerTransition}
                        className="w-full h-full object-contain"
                    />
                </div>

                {/* Saudação */}
                <p className="text-stone-500 font-serif italic mb-1 text-base sm:text-lg">Shalom,</p>
                <h1 className="text-3xl md:text-4xl font-serif font-bold text-history-green mb-6">
                    {repName || 'Família'}
                </h1>

                {/* Verso Bíblico com Efeito Datilografia */}
                <div className="min-h-[90px] flex flex-col items-center justify-start px-2">
                    <p className="text-stone-600 font-serif italic text-sm sm:text-base leading-relaxed text-center">
                        "{typedText}
                        <span className="inline-block w-0.5 h-4 bg-stone-400 ml-0.5 align-middle animate-pulse" />
                        "
                    </p>
                    {typedText.length === VERSE.length && (
                        <p className="text-xs text-stone-400 mt-2 font-semibold tracking-wide animate-fade-in">
                            {VERSE_SOURCE}
                        </p>
                    )}
                </div>

            </div>
        </div>
    );
};
