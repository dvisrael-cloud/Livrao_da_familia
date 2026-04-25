import React, { useState, useEffect, useRef } from 'react';
import { Users, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * FamilyTree Selector Component - Grid Based Layout
 * Interactive genealogical tree with precise button positioning
 * Based on 19x20px grid cell system
 */
export const FamilyTreeSelector = ({
    value,
    onChange,
    representativeName,
    representativePhone,
    membersData = {},
    onNext,
    onDeleteMember
}) => {
    const [showIntro, setShowIntro] = useState(true);
    const containerRef = useRef(null);
    const repRef = useRef(null);

    // 4 second timer for intro
    useEffect(() => {
        const timer = setTimeout(() => {
            setShowIntro(false);
        }, 4000);
        return () => clearTimeout(timer);
    }, []);

    // Center on representative when intro ends
    useEffect(() => {
        if (!showIntro && repRef.current && containerRef.current) {
            repRef.current.scrollIntoView({
                behavior: 'smooth',
                block: 'center',
                inline: 'center'
            });
        }
    }, [showIntro]);
    // Kinship degree options for 'Outro Parente'
    const PARENTESCO_OPTIONS = [
        '-- Selecione o parentesco --',
        'Irmão',
        'Irmã',
        'Primo (materno)',
        'Prima (materna)',
        'Primo (paterno)',
        'Prima (paterna)',
        'Tio (materno)',
        'Tia (materna)',
        'Tio (paterno)',
        'Tia (paterna)',
        'Tio-avô (materno)',
        'Tia-avó (materna)',
        'Tio-avô (paterno)',
        'Tia-avó (paterna)',
        'Sobrinho',
        'Sobrinha',
        'Cunhado',
        'Cunhada',
        'Genro',
        'Nora',
        'Neto',
        'Neta',
        'Bisneto',
        'Bisneta',
        'Outro'
    ];
    const [outroParentesco, setOutroParentesco] = useState('');

    // Grid configuration: ~34 columns x 52 rows (based on reference image)
    const GRID_COLS = 34;
    const GRID_ROWS = 52;

    // Helper to convert grid units to percentage
    const toPercent = (gridValue, totalGridUnits) => (gridValue / totalGridUnits) * 100;

    // Mapeamento de roles para coordenadas e estilos (em unidades de grid)
    const familyButtonsGrid = [
        // BISAVÓS - Alinhados verticalmente acima dos respectivos filhos (Avós)
        // Casal 1: Pais da Avó Paterna (filha em x: 1.68)
        { role: 'Pai da Avó Paterna', label: 'BISAVÔ', x: 1.68, y: 13.00, w: 5.84, h: 3.00, type: 'bisavo' },
        { role: 'Mãe da Avó Paterna', label: 'BISAVÓ', x: 1.68, y: 16.50, w: 5.84, h: 3.00, type: 'bisavo' },

        // Casal 2: Pais do Avô Paterno (filho em x: 9.54)
        { role: 'Pai do Avô Paterno', label: 'BISAVÔ', x: 9.54, y: 13.00, w: 5.84, h: 3.00, type: 'bisavo' },
        { role: 'Mãe do Avô Paterno', label: 'BISAVÓ', x: 9.54, y: 16.50, w: 5.84, h: 3.00, type: 'bisavo' },

        // Casal 3: Pais da Avó Materna (filha em x: 17.98)
        { role: 'Pai da Avó Materna', label: 'BISAVÔ', x: 17.98, y: 13.00, w: 5.84, h: 3.00, type: 'bisavo' },
        { role: 'Mãe da Avó Materna', label: 'BISAVÓ', x: 17.98, y: 16.50, w: 5.84, h: 3.00, type: 'bisavo' },

        // Casal 4: Pais do Avô Materno (filho em x: 25.99)
        { role: 'Pai do Avô Materno', label: 'BISAVÔ', x: 25.99, y: 13.00, w: 5.84, h: 3.00, type: 'bisavo' },
        { role: 'Mãe do Avô Materno', label: 'BISAVÓ', x: 25.99, y: 16.50, w: 5.84, h: 3.00, type: 'bisavo' },

        // AVÓS (descidos 70%)
        { role: 'Avó Paterna', label: 'AVÓ PATERNA', x: 1.68, y: 22.00, w: 5.84, h: 3.00, type: 'avo' },
        { role: 'Avô Paterno', label: 'AVÔ PATERNO', x: 9.54, y: 22.00, w: 5.79, h: 3.00, type: 'avo' },
        { role: 'Avó Materna', label: 'AVÓ MATERNA', x: 17.98, y: 22.00, w: 5.84, h: 3.00, type: 'avo' },
        { role: 'Avô Materno', label: 'AVÔ MATERNO', x: 25.99, y: 22.00, w: 5.84, h: 3.00, type: 'avo' },

        // PAIS (descidos 100% e afastados 7%)
        { role: 'Pai', label: 'PAI', x: 5.61, y: 27.50, w: 5.74, h: 2.95, type: 'pai' }, // Entre Avó Paterna (1.68) e Avô Paterno (9.54)
        { role: 'Mãe', label: 'MÃE', x: 21.98, y: 27.50, w: 5.74, h: 2.95, type: 'mae' }, // Entre Avó Materna (17.98) e Avô Materno (25.99)

        // REPRESENTANTE
        { role: 'Eu mesmo', label: 'REPRESENTANTE FAMILIAR', x: 9.00, y: 33.00, w: 14.00, h: 2.95, type: 'representante' },

    ];

    // Convert grid coordinates to percentages and increase by 30%
    // Adjust positions to center the larger buttons
    const SCALE_FACTOR = 1.3;

    // Standard size for bottom buttons (Representante and Outro) - ensure identical
    const bottomButtonWidthFull = toPercent(14.00, GRID_COLS) * SCALE_FACTOR;
    const bottomButtonHeight = toPercent(2.95, GRID_ROWS) * SCALE_FACTOR;
    const bottomButtonWidthNarrow = bottomButtonWidthFull * 0.7; // 30% narrower for Representante
    const familyButtons = familyButtonsGrid.map(btn => {
        const widthPct = toPercent(btn.w, GRID_COLS);
        const heightPct = toPercent(btn.h, GRID_ROWS);
        const xPct = toPercent(btn.x, GRID_COLS);
        const yPct = toPercent(btn.y, GRID_ROWS);

        // Use standardized size for bottom buttons to ensure they're identical
        let finalWidth = widthPct * SCALE_FACTOR;
        let finalHeight = heightPct * SCALE_FACTOR * 1.1; // Increase height by 10%

        if (btn.type === 'representante') {
            finalWidth = bottomButtonWidthNarrow; // 30% narrower
            finalHeight = bottomButtonHeight * 1.1; // Increase height by 10%
        }

        // Offset to center the larger button at the original position
        const xOffset = (finalWidth - widthPct) / 2;
        const yOffset = (finalHeight - heightPct) / 2;

        return {
            ...btn,
            x: xPct - xOffset,
            y: yPct - yOffset,
            w: finalWidth,
            h: finalHeight
        };
    });

    // Compute dynamic 'Outro N' slots: show all filled ones + 1 empty next slot
    const MAX_OUTROS = 8;
    const OUTRO_CARD_W = 5.84; // same as bisavó
    const OUTRO_CARD_H = 3.00; // same as bisavó
    const OUTRO_START_Y = 38.50; // just below Representante (33.00 + h ≈ 38.5)
    const OUTRO_GAP_Y = 3.80;   // ~10% of grid height between cards
    // 4 columns: coluna 0→x≈1.68, 1→x≈9.54, 2→x≈17.98, 3→x≈25.99
    const OUTRO_COLS = [1.68, 9.54, 17.98, 25.99];
    const OUTRO_COLORS = [
        'bg-violet-50 border-violet-200 text-slate-800',
        'bg-orange-50 border-orange-200 text-slate-800',
        'bg-teal-50 border-teal-200 text-slate-800',
        'bg-pink-50 border-pink-200 text-slate-800',
        'bg-yellow-50 border-yellow-200 text-slate-800',
        'bg-sky-50 border-sky-200 text-slate-800',
        'bg-lime-50 border-lime-200 text-slate-800',
        'bg-fuchsia-50 border-fuchsia-200 text-slate-800',
    ];

    // Build list of slots to show (only filled ones)
    const outroSlots = [];
    let col = 0;
    let row = 0;
    for (let i = 1; i <= MAX_OUTROS; i++) {
        const slotKey = `Outro ${i}`;
        // A slot is filled if it exists in the database
        const isSaved = !!membersData[slotKey];

        if (isSaved) {
            const xPct = toPercent(OUTRO_COLS[col % 4], GRID_COLS);
            const yPct = toPercent(OUTRO_START_Y + row * OUTRO_GAP_Y, GRID_ROWS);
            outroSlots.push({
                key: slotKey,
                xPct,
                yPct,
                colorClass: OUTRO_COLORS[i - 1],
                filled: isSaved
            });
            col++;
            if (col % 4 === 0) row++;
        } else {
            break; // stop at first empty and unselected slot
        }
    }

    const handleButtonClick = (role, parentesco = null) => {
        const existingName = membersData[role]?.nomeCompleto || '';
        const existingParentesco = membersData[role]?.relationshipInfo?.parentesco || membersData[role]?.parentesco || parentesco || '';
        onChange({
            papel: role,
            nome: existingName,
            parentesco: existingParentesco
        });

        // Auto-advance after selection
        if (onNext) {
            setTimeout(onNext, 400);
        }
    };

    // Check if a role has data
    const hasData = (role) => {
        return membersData[role] && membersData[role].nomeCompleto;
    };

    // Get button style based on state
    const getButtonStyle = (button) => {
        const isSelected = value?.papel === button.role;
        const isCompleted = hasData(button.role);

        let bgClass = '';
        let textClass = 'text-slate-800';
        let borderClass = 'border-slate-300';
        let opacityClass = '';

        if (isSelected && isCompleted) {
            // Selected with data - darker green
            bgClass = 'bg-green-600 shadow-lg scale-105';
            textClass = 'text-white';
            borderClass = 'border-green-700';
            opacityClass = 'opacity-100';
        } else if (isSelected && !isCompleted) {
            // Selected without data - darker white/gray
            bgClass = 'bg-slate-300 shadow-lg scale-105';
            textClass = 'text-slate-900';
            borderClass = 'border-slate-400';
            opacityClass = 'opacity-100';
        } else {
            if (isCompleted) {
                // Not selected but has data - light green
                bgClass = 'bg-green-100 hover:bg-green-200';
                textClass = 'text-green-900';
                borderClass = 'border-green-400';
                opacityClass = 'opacity-100';
            } else {
                // Empty - semi-transparent white
                bgClass = 'bg-white/80 hover:bg-blue-100';
                borderClass = 'border-slate-300 hover:border-blue-400';
                opacityClass = 'opacity-60 hover:opacity-80';
            }

            // Apply didactic colors to great-grandparent couples
            if (button.type === 'bisavo') {
                opacityClass = isCompleted ? 'opacity-100' : 'opacity-90 hover:opacity-100';

                if (button.role.includes('Avô Paterno')) {
                    bgClass = isCompleted ? 'bg-blue-100 hover:bg-blue-200' : 'bg-blue-50 hover:bg-blue-100';
                    borderClass = isCompleted ? 'border-blue-400' : 'border-blue-200 hover:border-blue-300';
                    textClass = isCompleted ? 'text-blue-900' : 'text-slate-800';
                } else if (button.role.includes('Avó Paterna')) {
                    bgClass = isCompleted ? 'bg-rose-100 hover:bg-rose-200' : 'bg-rose-50 hover:bg-rose-100';
                    borderClass = isCompleted ? 'border-rose-400' : 'border-rose-200 hover:border-rose-300';
                    textClass = isCompleted ? 'text-rose-900' : 'text-slate-800';
                } else if (button.role.includes('Avô Materno')) {
                    bgClass = isCompleted ? 'bg-amber-100 hover:bg-amber-200' : 'bg-amber-50 hover:bg-amber-100';
                    borderClass = isCompleted ? 'border-amber-400' : 'border-amber-200 hover:border-amber-300';
                    textClass = isCompleted ? 'text-amber-900' : 'text-slate-800';
                } else if (button.role.includes('Avó Materna')) {
                    bgClass = isCompleted ? 'bg-emerald-100 hover:bg-emerald-200' : 'bg-emerald-50 hover:bg-emerald-100';
                    borderClass = isCompleted ? 'border-emerald-400' : 'border-emerald-200 hover:border-emerald-300';
                    textClass = isCompleted ? 'text-emerald-900' : 'text-slate-800';
                }
            } else if (button.type === 'avo') {
                opacityClass = isCompleted ? 'opacity-100' : 'opacity-90 hover:opacity-100';

                if (button.role.includes('Patern')) {
                    bgClass = isCompleted ? 'bg-fuchsia-100 hover:bg-fuchsia-200' : 'bg-fuchsia-50 hover:bg-fuchsia-100';
                    borderClass = isCompleted ? 'border-fuchsia-400' : 'border-fuchsia-200 hover:border-fuchsia-300';
                    textClass = isCompleted ? 'text-fuchsia-900' : 'text-slate-800';
                } else if (button.role.includes('Matern')) {
                    bgClass = isCompleted ? 'bg-cyan-100 hover:bg-cyan-200' : 'bg-cyan-50 hover:bg-cyan-100';
                    borderClass = isCompleted ? 'border-cyan-400' : 'border-cyan-200 hover:border-cyan-300';
                    textClass = isCompleted ? 'text-cyan-900' : 'text-slate-800';
                }
            }
        }

        return `${bgClass} ${textClass} ${borderClass} ${opacityClass}`;
    };

    return (
        <div className="w-full flex items-center justify-center py-8 px-4">
            {/* Container com image de fundo */}
            <div
                className="relative w-full max-w-[1200px] rounded-2xl shadow-2xl overflow-hidden"
                style={{
                    backgroundImage: 'url(/FUNDO.png)',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    backgroundColor: '#e8f4f8',
                    height: '750px',
                    minHeight: '600px',
                    overflow: 'auto',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}
                ref={containerRef}
            >
                {/* Intro Animation Layer */}
                <AnimatePresence>
                    {showIntro && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 z-[100] bg-white/95 backdrop-blur-md flex flex-col items-center justify-center p-8 text-center"
                        >
                            <div className="relative w-full max-w-2xl flex flex-col items-center justify-center">
                                <video
                                    src="/logo_movimento.mp4"
                                    autoPlay
                                    muted
                                    playsInline
                                    className="w-64 h-64 object-contain mb-8"
                                />
                                <motion.h2
                                    initial={{ y: 20, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    transition={{ delay: 0.5 }}
                                    className="text-3xl md:text-4xl font-serif font-bold text-history-green mb-4"
                                >
                                    Árvore Genealógica da Família
                                </motion.h2>
                                <motion.p
                                    initial={{ y: 20, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    transition={{ delay: 0.8 }}
                                    className="text-lg text-slate-600"
                                >
                                    Clique em um membro para cadastrar ou editar suas informações
                                </motion.p>
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: "200px" }}
                                    transition={{ duration: 4, ease: "linear" }}
                                    className="h-1 bg-history-green/20 rounded-full mt-12 overflow-hidden"
                                >
                                    <div className="h-full bg-history-green w-full" />
                                </motion.div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
                {/* Grid overlay para debug */}
                <div className="absolute inset-0 pointer-events-none opacity-20"
                    style={{
                        backgroundImage: 'url(/LAYOUT COM GRID.png)',
                        backgroundSize: 'cover',
                        backgroundPosition: 'center'
                    }}
                />

                {/* Botões posicionados */}
                {familyButtons.map((button, index) => {
                    const isCompleted = hasData(button.role);
                    const displayName = isCompleted
                        ? membersData[button.role].nomeCompleto
                        : button.label;

                    return (
                        <button
                            key={button.role}
                            onClick={() => handleButtonClick(button.role)}
                            ref={button.type === 'representante' ? repRef : null}
                            className={`
                                absolute transition-all duration-300 
                                rounded-lg border-2 font-bold
                                flex flex-col items-center justify-between
                                hover:shadow-xl hover:scale-105
                                ${getButtonStyle(button)}
                            `}
                            style={{
                                left: `${button.x}%`,
                                top: `${button.y}%`,
                                width: `${button.w}%`,
                                height: `${button.h}%`,
                                fontSize: '0.55rem',
                                padding: '0.3rem 0.4rem'
                            }}
                            title={`${button.role}${isCompleted ? ` - ${membersData[button.role].nomeCompleto}` : ''}`}
                        >
                            {/* Label no topo */}
                            <div className="text-center w-full">
                                <span className="text-[0.5rem] opacity-70 block w-full uppercase tracking-tight leading-tight">
                                    {button.label}
                                </span>
                            </div>

                            {/* Nome no meio (quando cadastrado) ou Papel (se não cadastrado e for bisavô) */}
                            <div className="text-center w-full flex-1 flex items-center justify-center overflow-hidden">
                                {isCompleted ? (
                                    <span className="text-[0.6rem] font-semibold truncate w-full px-1">
                                        {membersData[button.role].nomeCompleto}
                                    </span>
                                ) : (
                                    button.type === 'bisavo' ? (
                                        <span className="text-[0.45rem] opacity-75 leading-tight w-full px-0.5 whitespace-normal">
                                            {button.role}
                                        </span>
                                    ) : null
                                )}
                            </div>

                            {/* Barra de progresso embaixo (solta) */}
                            {isCompleted && (
                                <div className="w-full" style={{ marginTop: '5px' }}>
                                    <div className="w-full bg-green-600 rounded-sm" style={{ height: '3px' }}></div>
                                </div>
                            )}
                        </button>
                    );
                })}

                {/* Status Bar no topo */}
                {!showIntro && (
                    <div className="absolute top-4 left-4 right-4 bg-white/90 backdrop-blur-sm rounded-xl p-2.5 shadow-md z-50 border border-slate-100 max-w-sm mx-auto transition-all duration-500 animate-fade-in">
                        <h2 className="text-[10px] font-serif font-bold text-slate-900 uppercase tracking-widest leading-none mb-1">
                            Árvore Genealógica da Família
                        </h2>
                        <p className="text-[9px] text-slate-500 italic">
                            Clique em um membro para editar
                        </p>

                    </div>
                )}

                {/* Outros Parentes - Cards dinâmicos abaixo do Representante */}
                {outroSlots.map((slot) => {
                    const isSelected = value?.papel === slot.key;
                    const isFilled = !!slot.filled;
                    return (
                        <button
                            key={slot.key}
                            onClick={() => handleButtonClick(slot.key)}
                            className={`
                                absolute transition-all duration-300 rounded-lg border-2 font-bold
                                flex flex-col items-center justify-between
                                hover:shadow-xl hover:scale-105
                                ${isSelected ? 'shadow-lg scale-105' : ''}
                                ${isFilled ? 'bg-green-100 border-green-400 text-green-900 opacity-100' : `${slot.colorClass} opacity-90 hover:opacity-100`}
                            `}
                            style={{
                                left: `${slot.xPct}%`,
                                top: `${slot.yPct}%`,
                                width: `${toPercent(OUTRO_CARD_W, GRID_COLS) * SCALE_FACTOR}%`,
                                height: `${toPercent(OUTRO_CARD_H, GRID_ROWS) * SCALE_FACTOR * 1.1}%`,
                                fontSize: '0.55rem',
                                padding: '0.3rem 0.4rem'
                            }}
                            title={slot.key}
                        >
                            <div className="text-center w-full">
                                <span className="text-[0.45rem] opacity-70 block w-full uppercase tracking-tight leading-loose">
                                    {isFilled ? (membersData[slot.key]?.relationshipInfo?.parentesco || membersData[slot.key]?.parentesco || 'PARENTE') : 'NOVO PARENTE'}
                                </span>
                            </div>
                            <div className="text-center w-full flex-1 flex items-center justify-center overflow-hidden">
                                {isFilled ? (
                                    <span className="text-[0.6rem] font-semibold truncate w-full px-1">
                                        {membersData[slot.key].nomeCompleto}
                                    </span>
                                ) : (
                                    <span className="text-[0.45rem] opacity-60 leading-tight w-full px-0.5 whitespace-normal">
                                        {outroParentesco && outroParentesco !== '-- Selecione o parentesco --' ? outroParentesco : 'Clique para cadastrar'}
                                    </span>
                                )}
                            </div>
                            {isFilled && (
                                <div className="w-full" style={{ marginTop: '3px' }}>
                                    <div className="w-full bg-green-600 rounded-sm" style={{ height: '3px' }}></div>
                                </div>
                            )}
                        </button>
                    );
                })}

                {/* Barra inferior: seletor de parentesco para adicionar novo parente */}
                <div className="absolute bottom-4 left-4 right-4">
                    <div className="w-full bg-white/95 backdrop-blur-sm rounded-xl shadow-lg border border-slate-200 px-4 py-2 flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-600 uppercase tracking-widest whitespace-nowrap">+ Parente:</span>
                        <select
                            value={outroParentesco}
                            onChange={(e) => setOutroParentesco(e.target.value)}
                            className="flex-1 text-xs border border-slate-300 rounded-lg px-2 py-1 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-400"
                        >
                            {PARENTESCO_OPTIONS.map(opt => (
                                <option key={opt} value={opt}>{opt}</option>
                            ))}
                        </select>
                        {outroParentesco && outroParentesco !== '-- Selecione o parentesco --' && (
                            <button
                                onClick={() => {
                                    // find next empty slot
                                    let nextKey = 'Outro 1';
                                    for (let i = 1; i <= MAX_OUTROS; i++) {
                                        if (!membersData[`Outro ${i}`]?.nomeCompleto) {
                                            nextKey = `Outro ${i}`;
                                            break;
                                        }
                                    }
                                    handleButtonClick(nextKey, outroParentesco);
                                }}
                                className="text-xs bg-slate-700 text-white px-3 py-1 rounded-lg hover:bg-slate-900 transition-colors whitespace-nowrap"
                            >
                                Cadastrar
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
