import React, { useState, useRef, useMemo } from 'react';
import { Users, Fingerprint } from 'lucide-react';

/**
 * FamilyTree Selector Component (v2.0 Stable)
 * Integrated with SVG Overlay for precise "L" connections and hierarchical styling.
 */
export const FamilyTreeSelector = ({
    value,
    onChange,
    membersData = {},
    onNext
}) => {
    const containerRef = useRef(null);
    const [outroParentesco, setOutroParentesco] = useState('');
    const [expandedRole, setExpandedRole] = useState(null);

    // Grid configuration (34 columns x 52 rows)
    const GRID_COLS = 34;
    const GRID_ROWS = 52;
    const SCALE_FACTOR = 1.3;

    // 1. DEFINIÇÃO DA GRADE (ESTRUTURA MATEMÁTICA)
    const familyButtonsGrid = [
        // NÍVEL 4: BISAVÓS
        { role: 'Pai da Avó Paterna', label: 'BISAVÔ', x: 1.68, y: 13.00, w: 5.84, h: 3.90, level: 4, type: 'bisavo' },
        { role: 'Mãe da Avó Paterna', label: 'BISAVÓ', x: 1.68, y: 17.90, w: 5.84, h: 3.90, level: 4, type: 'bisavo' },
        { role: 'Pai do Avô Paterno', label: 'BISAVÔ', x: 9.54, y: 13.00, w: 5.84, h: 3.90, level: 4, type: 'bisavo' },
        { role: 'Mãe do Avô Paterno', label: 'BISAVÓ', x: 9.54, y: 17.90, w: 5.84, h: 3.90, level: 4, type: 'bisavo' },
        { role: 'Pai da Avó Materna', label: 'BISAVÔ', x: 17.98, y: 13.00, w: 5.84, h: 3.90, level: 4, type: 'bisavo' },
        { role: 'Mãe da Avó Materna', label: 'BISAVÓ', x: 17.98, y: 17.90, w: 5.84, h: 3.90, level: 4, type: 'bisavo' },
        { role: 'Pai do Avô Materno', label: 'BISAVÔ', x: 25.99, y: 13.00, w: 5.84, h: 3.90, level: 4, type: 'bisavo' },
        { role: 'Mãe do Avô Materno', label: 'BISAVÓ', x: 25.99, y: 17.90, w: 5.84, h: 3.90, level: 4, type: 'bisavo' },

        // NÍVEL 3: AVÓS
        { role: 'Avó Paterna', label: 'AVÓ PATERNA', x: 1.68, y: 23.80, w: 5.84, h: 3.90, level: 3, type: 'avo' },
        { role: 'Avô Paterno', label: 'AVÔ PATERNO', x: 9.54, y: 23.80, w: 5.84, h: 3.90, level: 3, type: 'avo' },
        { role: 'Avó Materna', label: 'AVÓ MATERNA', x: 17.98, y: 23.80, w: 5.84, h: 3.90, level: 3, type: 'avo' },
        { role: 'Avô Materno', label: 'AVÔ MATERNO', x: 25.99, y: 23.80, w: 5.84, h: 3.90, level: 3, type: 'avo' },

        // NÍVEL 2: PAIS
        { role: 'Pai', label: 'PAI', x: 3.53, y: 29.20, w: 10.00, h: 2.92, level: 2, type: 'pai' },
        { role: 'Mãe', label: 'MÃE', x: 19.90, y: 29.20, w: 10.00, h: 2.92, level: 2, type: 'mae' },

        // NÍVEL 1: REPRESENTANTE
        { role: 'Eu mesmo', label: 'REPRESENTANTE FAMILIAR', x: 8.715, y: 33.62, w: 16.00, h: 2.92, level: 1, type: 'representante' },
    ];

    const familyButtons = useMemo(() => familyButtonsGrid.map(btn => {
        const toPct = (val, total) => (val / total) * 100;
        let finalWidth = toPct(btn.w, GRID_COLS) * SCALE_FACTOR;
        let finalHeight = toPct(btn.h, GRID_ROWS) * SCALE_FACTOR;

        if (btn.type === 'representante') finalWidth = toPct(btn.w, GRID_COLS) * SCALE_FACTOR;

        const xOffset = (finalWidth - toPct(btn.w, GRID_COLS)) / 2;
        const yOffset = (finalHeight - toPct(btn.h, GRID_ROWS)) / 2;

        return {
            ...btn,
            x: toPct(btn.x, GRID_COLS) - xOffset,
            y: toPct(btn.y, GRID_ROWS) - yOffset,
            w: finalWidth,
            h: finalHeight
        };
    }), []);

    // 2. CONEXÕES SVG (ALGORITMO DE EIXOS v2.0)
    const renderConnections = () => {
        const find = (r) => familyButtonsGrid.find(b => b.role === r);

        // Conexão vertical do filho para o ponto de união dos pais
        const drawL = (childR, p1R, p2R) => {
            const c = find(childR), p1 = find(p1R), p2 = find(p2R);
            if (!c || !p1 || !p2) return null;
            const px = (p1.x + p1.w / 2 + p2.x + p2.w / 2) / 2;
            const py = Math.max(p1.y + p1.h, p2.y + p2.h);
            const my = (c.y + py) / 2;
            return <path key={`v-${childR}`} d={`M ${c.x + c.w / 2} ${c.y} L ${c.x + c.w / 2} ${my} L ${px} ${my} L ${px} ${py}`} opacity={expandedRole ? 0.2 : 1} className="transition-opacity duration-500" fill="none" stroke="#cbd5e1" strokeWidth="0.15" strokeLinejoin="round" />;
        };

        // Ponte horizontal entre o casal
        const drawBridge = (p1R, p2R) => {
            const p1 = find(p1R), p2 = find(p2R);
            if (!p1 || !p2) return null;
            const y = Math.max(p1.y + p1.h, p2.y + p2.h);
            return <line key={`b-${p1R}-${p2R}`} x1={p1.x + p1.w / 2} y1={y} x2={p2.x + p2.w / 2} y2={y} opacity={expandedRole ? 0.2 : 1} className="transition-opacity duration-500" stroke="#cbd5e1" strokeWidth="0.15" />;
        };

        return [
            // Pontes de união (casais)
            drawBridge('Pai', 'Mãe'),
            drawBridge('Avó Paterna', 'Avô Paterno'),
            drawBridge('Avó Materna', 'Avô Materno'),
            drawBridge('Pai da Avó Paterna', 'Mãe da Avó Paterna'),
            drawBridge('Pai do Avô Paterno', 'Mãe do Avô Paterno'),
            drawBridge('Pai da Avó Materna', 'Mãe da Avó Materna'),
            drawBridge('Pai do Avô Materno', 'Mãe do Avô Materno'),

            // Conexões de descendência
            drawL('Eu mesmo', 'Pai', 'Mãe'),
            drawL('Pai', 'Avó Paterna', 'Avô Paterno'),
            drawL('Mãe', 'Avó Materna', 'Avô Materno'),
            drawL('Avó Paterna', 'Pai da Avó Paterna', 'Mãe da Avó Paterna'),
            drawL('Avô Paterno', 'Pai do Avô Paterno', 'Mãe do Avô Paterno'),
            drawL('Avó Materna', 'Pai da Avó Materna', 'Mãe da Avó Materna'),
            drawL('Avô Materno', 'Pai do Avô Materno', 'Mãe do Avô Materno')
        ];
    };

    // 3. ESTILIZAÇÃO E CROMATISMO
    const getButtonStyle = (button) => {
        const isSelected = value?.papel === button.role;
        const isExpanded = expandedRole === button.role;
        const shared = "absolute transition-all duration-500 rounded-lg border-2 font-bold flex flex-col items-center shadow-sm";
        const overflowClass = isExpanded ? "" : "overflow-hidden";

        // Se outro card estiver expandido, este fica em segundo plano
        const dimClass = expandedRole && !isExpanded ? "opacity-30 scale-90 grayscale-[0.5]" : "opacity-100";

        if (isExpanded) {
            return `${shared} ${overflowClass} z-[100] scale-125 shadow-2xl ring-4 ring-slate-400/20 bg-white border-stone-400 text-slate-800`;
        }

        switch (button.level) {
            case 1: return `${shared} ${overflowClass} ${dimClass} bg-[#A5D6A7] border-[#4CAF50] text-[#052207] ${isSelected ? 'ring-4 ring-green-200' : ''}`;
            case 2: return `${shared} ${overflowClass} ${dimClass} bg-[#C8E6C9] border-[#A5D6A7] text-[#0A3D0E] ${isSelected ? 'ring-4 ring-green-100' : ''}`;
            case 3: return `${shared} ${overflowClass} ${dimClass} bg-[#E8F5E9] border-[#C8E6C9] text-[#0A3D0E] ${isSelected ? 'ring-4 ring-green-50' : ''}`;
            case 4: return `${shared} ${overflowClass} ${dimClass} bg-[#F1F9F1] border-solid border-slate-300 text-slate-900 ${isSelected ? 'bg-slate-50 border-slate-400' : ''}`;
            default: return `${shared} ${overflowClass} ${dimClass}`;
        }
    };

    return (
        <div className="w-full flex flex-col font-primary select-none items-center">
            {/* Tree Viewport - Restoring original stable values */}
            <div className="relative w-full overflow-hidden" style={{ height: '520px' }}>
                <div
                    className="absolute top-[-220px] left-0 right-0 h-[960px] transition-transform duration-500"
                    ref={containerRef}
                    onClick={() => setExpandedRole(null)}
                >

                    {/* SVG Connections */}
                    <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox={`0 0 ${GRID_COLS} ${GRID_ROWS}`} preserveAspectRatio="none">
                        {renderConnections()}
                    </svg>

                    {familyButtons.map((btn) => {
                        const isCompleted = !!membersData[btn.role]?.nomeCompleto;
                        const isExpanded = expandedRole === btn.role;
                        const fullName = membersData[btn.role]?.nomeCompleto || '';
                        const nameParts = fullName.trim().split(/\s+/);
                        const firstName = nameParts[0] || (isCompleted ? '' : '');
                        const lastName = nameParts.slice(1).join(' ') || (isCompleted ? '' : '');

                        return (
                            <button
                                key={btn.role}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (isExpanded) {
                                        onNext?.();
                                    } else {
                                        setExpandedRole(btn.role);
                                        onChange({
                                            papel: btn.role,
                                            nome: membersData[btn.role]?.nomeCompleto || '',
                                            parentesco: membersData[btn.role]?.parentesco || ''
                                        });
                                    }
                                }}
                                style={{
                                    left: `${btn.x}%`,
                                    top: `${btn.y}%`,
                                    width: `${btn.w}%`,
                                    height: `${btn.h}%`,
                                    zIndex: isExpanded ? 100 : 10,
                                    padding: '0.15rem'
                                }}
                                className={`${getButtonStyle(btn)} ${btn.level <= 2 ? 'sm:!h-[8%]' : ''}`}
                            >
                                <div className={`w-full text-center border-b border-black/10 pb-0.5 mb-0.5 ${isExpanded ? 'bg-amber-50/70' : ''}`}>
                                    <span className={`uppercase font-black block leading-none tracking-tighter ${isExpanded ? 'text-[9.5px] text-amber-900' : 'text-[8px] text-black/80'}`}>
                                        {btn.label}
                                    </span>
                                </div>

                                {/* 2. CONTEÚDO (Nome e Foto) - RESPONSIVO PARA DESKTOP */}
                                <div className={`
                                    flex-1 w-full flex gap-1 px-1.5 
                                    ${btn.level <= 2
                                        ? 'flex-row items-center justify-start'
                                        : 'flex-col sm:flex-row items-center sm:items-center justify-center sm:justify-start'
                                    } 
                                    ${isExpanded ? '' : 'overflow-hidden'}
                                `}>

                                    {/* A. FOTO (Box ampliada no desktop) */}
                                    <div className={`
                                        bg-slate-50/80 rounded border border-dashed border-slate-300 flex items-center justify-center shrink-0 overflow-hidden
                                        ${isExpanded ? 'w-[40px] h-[45px]' : 'w-[30px] h-[35px] sm:w-[45px] sm:h-[55px]'}
                                        ${btn.level <= 2 ? 'order-1' : 'order-2 mb-1.5 sm:mb-0 sm:order-1'}
                                    `}>
                                        {membersData[btn.role]?.fotoIdentificacao?.[0]?.url || membersData[btn.role]?.fotoIdentificacao?.[0]?.preview ? (
                                            <img
                                                src={membersData[btn.role].fotoIdentificacao[0].url || membersData[btn.role].fotoIdentificacao[0].preview}
                                                alt="ID"
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <Users size={isExpanded ? 15 : 11} className="text-slate-300 sm:w-5 sm:h-5" />
                                        )}
                                    </div>

                                    {/* B. DADOS (Fontes maiores no desktop) */}
                                    <div className={`
                                        flex-1 flex flex-col leading-[1.1] min-w-0 
                                        ${btn.level <= 2
                                            ? 'order-2 items-start text-left'
                                            : 'order-1 items-center text-center sm:order-2 sm:items-start sm:text-left'
                                        }
                                    `}>
                                        {isCompleted ? (
                                            <>
                                                <span className={`font-black w-full ${isExpanded ? 'text-[12px]' : 'text-[10px] sm:text-[14px] text-slate-950 truncate'}`}>
                                                    {firstName}
                                                </span>
                                                <span className={`font-bold w-full ${isExpanded ? 'text-[10.5px]' : 'text-[8.5px] sm:text-[12px] text-slate-900 truncate'}`}>
                                                    {lastName}
                                                </span>
                                            </>
                                        ) : (
                                            <span className="text-[8px] sm:text-[11px] text-black/40 font-black uppercase tracking-widest italic w-full text-center sm:text-left">Vazio</span>
                                        )}
                                    </div>
                                </div>

                                {/* Completion Indicator (Floating Pill) */}
                                {!isExpanded && (isCompleted || btn.level === 4) && (
                                    <div className={`absolute bottom-1 left-1 right-1 h-[2px] rounded-full ${isCompleted ? 'bg-green-600' : 'bg-slate-300/40'}`} />
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>

            <div className="w-full mt-8 px-4 pb-2">
                <div className="bg-white/70 backdrop-blur-md rounded-2xl border border-slate-200 p-2 flex items-center gap-2 shadow-sm">
                    <div className="p-2 bg-green-50 rounded-lg text-green-700">
                        <Fingerprint size={16} />
                    </div>
                    <select
                        value={outroParentesco}
                        onChange={(e) => setOutroParentesco(e.target.value)}
                        className="flex-1 bg-transparent text-xs font-bold text-slate-700 focus:outline-none"
                    >
                        <option value="">+ Outro parente...</option>
                        <option value="Irmão">Irmão/Irmã</option>
                        <option value="Tio">Tio/Tia</option>
                        <option value="Primo">Primo/Prima</option>
                        <option value="Neto">Neto/Neta</option>
                    </select>
                </div>
            </div>
        </div>
    );
};
