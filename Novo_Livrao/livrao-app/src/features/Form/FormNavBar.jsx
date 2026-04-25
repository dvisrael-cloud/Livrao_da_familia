import React, { useRef, useEffect, useState } from 'react';
import { Fingerprint, Users, Map, Heart, Image } from 'lucide-react';

import iconIdentidade from '../../../public/identidade.png';
import iconFamiliaVida from '../../../public/Familia_e_vida.png';
import iconTrajetoria from '../../../public/trajetoria.png';
import iconVidaJudaica from '../../../public/Vida Judaica.png';
import iconMemorias from '../../../public/memorias.png';
import iconFotos from '../../../public/fotos.png';

export const FormNavBar = ({
    activeSection,
    onNavigate,
    isGalleryOpen,
    onGalleryOpen,
    formData
}) => {
    const scrollRef = useRef(null);
    const itemsRef = useRef({});
    const [showLeft, setShowLeft] = useState(false);
    const [showRight, setShowRight] = useState(true);

    const baseItems = [
        { id: 'Biografia', label: 'Identidade', icon: iconIdentidade },
        { id: 'FamilyVital', label: 'Família e Vida', icon: iconFamiliaVida },
        { id: 'LifeCulture', label: 'Trajetória', icon: iconTrajetoria }
    ];

    if (formData?.religiao === 'Judaica') {
        baseItems.push({ id: 'VidaJudaica', label: 'Vida Judaica', icon: iconVidaJudaica });
    }

    baseItems.push(
        { id: 'História', label: 'Memórias Vivas', icon: iconMemorias },
        { id: 'GALLERY_ACTION', label: 'Fotos', icon: iconFotos }
    );

    const navItems = baseItems;

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
                className="flex items-end justify-start md:justify-center gap-2 sm:gap-4 overflow-x-auto w-full px-4 pt-2 pb-3 scrollbar-hide"
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
                                flex-shrink-0 flex flex-col items-center justify-end gap-2 px-3 py-2 text-[10px] sm:text-xs font-bold relative min-w-[85px] sm:min-w-[100px]
                                transition-all duration-300
                                ${isCurrent ? 'text-green-700' : 'text-slate-400 hover:text-slate-700'}
                            `}
                        >
                            <span className={`
                                transition-all duration-300 flex items-center justify-center
                                ${isCurrent ? 'scale-110 drop-shadow-sm' : 'scale-100 opacity-50'}
                            `}>
                                <img
                                    src={item.icon}
                                    alt={item.label}
                                    className="w-10 h-10 sm:w-11 sm:h-11 object-contain"
                                />
                            </span>
                            <span className="font-sans leading-tight mt-0.5 text-center">{item.label}</span>

                            {/* Active Indicator: 3px bottom border Green-600 */}
                            {isCurrent && (
                                <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-green-600 rounded-t-lg shadow-[0_0_10px_rgba(22,163,74,0.3)]" />
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
