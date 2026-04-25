import React, { useRef, useEffect, useState } from 'react';
import { User, Users, Briefcase, BookOpen, Camera } from 'lucide-react';

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
        { id: 'Biografia', label: 'Identidade', icon: <User size={18} />, color: 'from-emerald-500 to-teal-600' },
        { id: 'FamilyVital', label: 'Família e vida', icon: <Users size={18} />, color: 'from-emerald-500 to-teal-600' },
        { id: 'LifeCulture', label: 'Trajetória', icon: <Briefcase size={18} />, color: 'from-emerald-500 to-teal-600' },
        { id: 'História', label: 'Memórias Vivas', icon: <BookOpen size={18} />, color: 'from-emerald-500 to-teal-600' },
        { id: 'GALLERY_ACTION', label: 'Fotos', icon: <Camera size={18} />, color: 'from-emerald-500 to-teal-600' }
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
        <div className="relative w-full mt-0 pb-3">
            {/* Elegant Left Fade */}
            <div
                className={`absolute left-0 top-0 bottom-3 w-20 bg-gradient-to-r from-white via-white/95 to-transparent z-10 pointer-events-none transition-opacity duration-500 ${showLeft ? 'opacity-100' : 'opacity-0'}`}
            />

            {/* Navigation Container */}
            <div
                ref={scrollRef}
                onScroll={handleScroll}
                className="flex items-center justify-start gap-2.5 overflow-x-auto w-full px-4 scrollbar-hide snap-x pt-1"
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
                                snap-center flex-shrink-0 flex items-center gap-2.5 px-5 py-2.5 rounded-xl text-xs font-semibold 
                                tracking-wide whitespace-nowrap transition-all duration-300 ease-out transform
                                ${isCurrent
                                    ? `bg-gradient-to-r ${item.color} text-white shadow-lg shadow-black/20 scale-105 hover:scale-110 border-2 border-white/30`
                                    : 'bg-white/80 backdrop-blur-sm text-slate-600 hover:text-slate-900 hover:bg-white hover:shadow-md border-2 border-slate-200/60 hover:border-slate-300'
                                }
                            `}
                        >
                            <span className={`transition-transform duration-300 ${isCurrent ? 'scale-110' : ''}`}>
                                {item.icon}
                            </span>
                            <span className="font-bold">{item.label}</span>
                        </button>
                    );
                })}
            </div>

            {/* Elegant Right Fade */}
            <div
                className={`absolute right-0 top-0 bottom-3 w-20 bg-gradient-to-l from-white via-white/95 to-transparent z-10 pointer-events-none transition-opacity duration-500 ${showRight ? 'opacity-100' : 'opacity-0'}`}
            />
        </div>
    );
};
