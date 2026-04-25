import React, { useRef, useEffect, useState } from 'react';
import { Fingerprint, Users, Map, Heart, Image } from 'lucide-react';

export const FormNavBar = ({
    activeSection,
    onNavigate,
    isGalleryOpen,
    onGalleryOpen
}) => {
    const scrollRef = useRef(null);
    const itemsRef = useRef({});
    const [showLeft, setShowLeft] = useState(false);
    const [showRight, setShowRight] = useState(true);

    const navItems = [
        { id: 'Biografia', label: 'Identidade', icon: '/identidade.png' },
        { id: 'FamilyVital', label: 'Família e Vida', icon: '/Familia_e_vida.png' },
        { id: 'LifeCulture', label: 'Trajetória', icon: '/trajetoria.png' },
        { id: 'História', label: 'Memórias Vivas', icon: '/memorias.png' },
        { id: 'GALLERY_ACTION', label: 'Fotos', icon: '/fotos.png' }
    ];

    const handleScroll = () => {
        if (!scrollRef.current) return;
        const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
        setShowLeft(scrollLeft > 10);
        setShowRight(scrollLeft < scrollWidth - clientWidth - 10);
    };

    useEffect(() => {
        const currentId = isGalleryOpen ? 'GALLERY_ACTION' : activeSection;
        const el = itemsRef.current[currentId];
        if (el && scrollRef.current) {
            el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        }
    }, [activeSection, isGalleryOpen]);

    useEffect(() => {
        handleScroll();
    }, []);

    return (
        <div className="relative w-full mt-0 pb-0 shadow-[0_10px_15px_-3px_rgba(0,0,0,0.04)] bg-white/50">
            {/* Elegant Left Fade */}
            <div
                className={`absolute left-0 top-0 bottom-0 w-20 bg-gradient-to-r from-white via-white/80 to-transparent z-10 pointer-events-none transition-opacity duration-500 ${showLeft ? 'opacity-100' : 'opacity-0'}`}
            />

            {/* Navigation Container - Glassmorphism Style */}
            <div
                ref={scrollRef}
                onScroll={handleScroll}
                className="flex items-center justify-start gap-4 overflow-x-auto w-full px-6 scrollbar-hide snap-x pt-1 pb-1"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
                {navItems.map(item => {
                    const isCurrent = (isGalleryOpen && item.id === 'GALLERY_ACTION') || (!isGalleryOpen && item.id === activeSection);

                    return (
                        <button
                            key={item.id}
                            ref={el => itemsRef.current[item.id] = el}
                            onClick={() => {
                                if (item.id === 'GALLERY_ACTION') {
                                    onGalleryOpen();
                                } else {
                                    onNavigate(item.id);
                                }
                            }}
                            className={`
                                snap-center flex-shrink-0 flex flex-col items-center gap-1 px-3 py-0.5 
                                text-[9px] sm:text-[10px] font-bold tracking-tighter uppercase whitespace-nowrap transition-all duration-300
                                relative
                                ${isCurrent ? 'text-green-700' : 'text-slate-400 hover:text-slate-700'}
                            `}
                        >
                            <span className={`
                                transition-all duration-300 flex items-center justify-center
                                ${isCurrent ? 'scale-110' : 'scale-100 opacity-40'}
                            `}>
                                <img
                                    src={item.icon}
                                    alt={item.label}
                                    className="w-9 h-9 sm:w-10 sm:h-10 object-contain"
                                />
                            </span>
                            <span className="font-sans leading-none">{item.label}</span>

                            {/* Active Indicator: 3px bottom border Green-600 */}
                            {isCurrent && (
                                <div className="absolute bottom-0 left-3 right-3 h-[2px] bg-green-600 rounded-full shadow-[0_0_10px_rgba(22,163,74,0.3)]" />
                            )}
                        </button>
                    );
                })}
            </div>

            {/* Elegant Right Fade */}
            <div
                className={`absolute right-0 top-0 bottom-0 w-20 bg-gradient-to-l from-white via-white/80 to-transparent z-10 pointer-events-none transition-opacity duration-500 ${showRight ? 'opacity-100' : 'opacity-0'}`}
            />
        </div>
    );
};
