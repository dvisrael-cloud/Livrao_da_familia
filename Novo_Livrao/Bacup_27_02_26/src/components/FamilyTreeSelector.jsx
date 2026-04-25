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
    const [childrenModal, setChildrenModal] = useState(null); // Names of children to show in modal

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
        { role: 'Pai', label: 'PAI', x: 3.53, y: 29.70, w: 10.00, h: 3.90, level: 2, type: 'pai' },
        { role: 'Mãe', label: 'MÃE', x: 19.90, y: 29.70, w: 10.00, h: 3.90, level: 2, type: 'mae' },

        // NÍVEL 1: REPRESENTANTE
        { role: 'Eu mesmo', label: 'REPRESENTANTE FAMILIAR', x: 11.715, y: 35.60, w: 10.00, h: 3.90, level: 1, type: 'representante' },
    ];

    const familyButtons = useMemo(() => {
        const gridWithSpouse = [...familyButtonsGrid];
        const repData = membersData['Eu mesmo'] || {};
        const isMarried = ['Casado', 'Divorciado', 'Viúvo', 'União Estável'].includes(repData.situacaoConjugal);

        if (isMarried) {
            gridWithSpouse.push({
                role: 'Cônjuge',
                label: 'ESPOSO(A)',
                x: 22.20, // To the right of the Representative
                y: 35.60,
                w: 5.84,
                h: 1.95,
                level: 1,
                type: 'conjuge'
            });
        }

        const hasChildrenNames = !!repData.children ||
            [...Array(12)].some((_, i) => !!repData[`nomeFilho${i + 1}`]);
        const hasChildrenCount = repData.qtdFilhos && repData.qtdFilhos !== 'Nenhum';

        if (hasChildrenNames || hasChildrenCount) {
            gridWithSpouse.push({
                role: 'Filhos',
                label: 'DESCENDÊNCIA',
                x: 22.20,
                y: isMarried ? 38.30 : 35.60, // Lowered if married, top-aligned if not
                w: 5.84,
                h: 0.975, // Half the height of the spouse card (1.95 / 2)
                level: 1,
                type: 'filhos'
            });
        }

        const toPct = (val, total) => (val / total) * 100;
        return gridWithSpouse.map(btn => {
            const isHalfHeight = btn.h < 2.0 && btn.h >= 1.0;
            const isQuarterHeight = btn.h < 1.0;
            let finalWidth = toPct(btn.w, GRID_COLS) * SCALE_FACTOR;
            let finalHeight = toPct(btn.h, GRID_ROWS) * SCALE_FACTOR;

            const xOffset = (finalWidth - toPct(btn.w, GRID_COLS)) / 2;
            const yOffset = (finalHeight - toPct(btn.h, GRID_ROWS)) / 2;

            return {
                ...btn,
                x: toPct(btn.x, GRID_COLS) - xOffset,
                y: toPct(btn.y, GRID_ROWS) - yOffset,
                w: finalWidth,
                h: finalHeight,
                isHalfHeight,
                isQuarterHeight
            };
        });
    }, [membersData]);

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
            const scaleClass = button.type === 'filhos' ? 'scale-[2.2]' : 'scale-125';
            return `${shared} ${overflowClass} z-[110] ${scaleClass} shadow-2xl ring-4 ring-slate-400/20 bg-white border-stone-400 text-slate-800`;
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

                        // New: Logic for Spouse (fetching from Representative data)
                        let firstName = '';
                        let lastName = '';
                        let birthYear = '';
                        let deathYear = '';
                        let marriageDate = '';
                        let childrenList = [];

                        const repData = membersData['Eu mesmo'] || {};
                        if (btn.type === 'conjuge') {
                            const spouseFullName = repData.nomeConjuge || '';
                            const parts = spouseFullName.trim().split(/\s+/);
                            firstName = parts[0] || '';
                            lastName = parts.slice(1).join(' ') || '';
                            marriageDate = repData.dataCasamento || '';
                        } else if (btn.type === 'filhos') {
                            // Collect from legacy single field
                            const childrenStr = repData.children || '';
                            const legacyList = childrenStr.split(',').map(c => c.trim()).filter(Boolean);

                            // Collect from individual form fields
                            const individualList = [];
                            for (let i = 1; i <= 12; i++) {
                                const name = repData[`nomeFilho${i}`];
                                if (name) individualList.push(name.trim());
                            }

                            childrenList = [...legacyList, ...individualList];
                        } else {
                            const fullName = membersData[btn.role]?.nomeCompleto || '';
                            const nameParts = fullName.trim().split(/\s+/);
                            firstName = nameParts[0] || '';
                            lastName = nameParts.slice(1).join(' ') || '';
                            birthYear = membersData[btn.role]?.dataNascimento ? (membersData[btn.role].dataNascimento.match(/\d{4}/)?.[0] || '') : '';
                            deathYear = membersData[btn.role]?.dataFalecimento ? (membersData[btn.role].dataFalecimento.match(/\d{4}/)?.[0] || '') : '';
                        }
                        return (
                            <button
                                key={btn.role}
                                onClick={(e) => {
                                    e.stopPropagation();

                                    if (btn.type === 'filhos') {
                                        setChildrenModal(childrenList);
                                        return;
                                    }

                                    if (isExpanded) {
                                        // Only navigate to form for standard family members
                                        if (btn.type !== 'conjuge') {
                                            onNext?.();
                                        }
                                    } else {
                                        setExpandedRole(btn.role);
                                        // Only trigger form selection for standard family members
                                        if (btn.type !== 'conjuge') {
                                            onChange({
                                                papel: btn.role,
                                                nome: membersData[btn.role]?.nomeCompleto || '',
                                                parentesco: membersData[btn.role]?.parentesco || ''
                                            });
                                        }
                                    }
                                }}
                                style={{
                                    left: `${btn.x}%`,
                                    top: `${btn.y}%`,
                                    width: `${btn.w}%`,
                                    height: `${btn.h}%`,
                                    zIndex: isExpanded ? 100 : 10,
                                    padding: '0'
                                }}
                                className={`${getButtonStyle(btn)} overflow-hidden`}
                            >
                                <div
                                    className="w-full h-full grid px-1"
                                    style={{
                                        gridTemplateColumns: 'repeat(16, 1fr)',
                                        gridTemplateRows: btn.isQuarterHeight ? 'repeat(4, 1fr)' : (btn.isHalfHeight ? 'repeat(6, 1fr)' : 'repeat(11, 1fr)'),
                                        fontSize: '8px',
                                        lineHeight: '1.2'
                                    }}
                                >
                                    {/* Label */}
                                    <div className="col-start-1 col-span-16 row-start-1 flex items-center">
                                        <span className="uppercase font-black tracking-tighter text-black/25 truncate text-[5px]">
                                            {btn.label}
                                        </span>
                                    </div>

                                    {/* Standard Cards Content */}
                                    {!btn.isHalfHeight && !btn.isQuarterHeight && (
                                        <>
                                            <div className={`row-start-2 row-span-7 col-start-1 ${(btn.level <= 2) ? 'col-span-6' : 'col-span-8'} flex items-center justify-start py-0.5`}>
                                                <div className="h-full aspect-[3/4] bg-slate-50/50 rounded-sm border border-slate-300 overflow-hidden flex items-center justify-center">
                                                    {membersData[btn.role]?.fotoIdentificacao?.[0]?.url || membersData[btn.role]?.fotoIdentificacao?.[0]?.preview ? (
                                                        <img src={membersData[btn.role].fotoIdentificacao[0].url || membersData[btn.role].fotoIdentificacao[0].preview} className="w-full h-full object-cover" alt="" />
                                                    ) : (
                                                        <Users size={10} className="text-slate-300" />
                                                    )}
                                                </div>
                                            </div>
                                            <div className={`row-start-3 flex items-center text-[7.5px] font-bold text-slate-500 whitespace-nowrap ${(btn.level <= 2) ? 'col-start-8' : 'col-start-10'} col-span-9`}>
                                                N {birthYear || '----'}
                                            </div>
                                            <div className={`row-start-5 flex items-center text-[7.5px] font-bold text-slate-500 whitespace-nowrap ${(btn.level <= 2) ? 'col-start-8' : 'col-start-10'} col-span-9`}>
                                                {btn.type !== 'representante' && `F ${deathYear || '----'}`}
                                            </div>
                                            <div className="col-start-1 col-span-16 row-start-9 flex items-end font-black text-slate-900 truncate leading-none">
                                                {firstName}
                                            </div>
                                            <div className="col-start-1 col-span-16 row-start-10 flex items-start font-bold text-slate-700 truncate leading-none">
                                                {lastName}
                                            </div>
                                        </>
                                    )}

                                    {/* Spouse Card Content */}
                                    {btn.type === 'conjuge' && (
                                        <>
                                            <div className="col-start-1 col-span-16 row-start-2 flex items-end font-black text-slate-900 truncate leading-none">
                                                {firstName}
                                            </div>
                                            <div className="col-start-1 col-span-16 row-start-3 flex items-start font-bold text-slate-700 truncate leading-none">
                                                {lastName}
                                            </div>
                                            <div className="col-start-1 col-span-16 row-start-5 row-span-2 flex flex-col items-center justify-center leading-none py-0.5">
                                                <span className="text-[6px] font-black text-rose-600/40 uppercase tracking-tighter">
                                                    Casamento
                                                </span>
                                                <span className="text-[7.5px] font-bold text-rose-700/80 tracking-tighter">
                                                    {marriageDate || '----'}
                                                </span>
                                            </div>
                                        </>
                                    )}

                                    {/* Children Card Content (Always collapsed view) */}
                                    {btn.type === 'filhos' && (
                                        <div className="col-start-1 col-span-16 row-start-2 row-span-3 flex flex-col items-center justify-center">
                                            <div className="flex items-center justify-center gap-1.5 -mt-0.5">
                                                <span className="text-[11px] font-black text-slate-700 leading-none">
                                                    {childrenList.length}
                                                </span>
                                                <span className="text-[7px] font-black text-slate-400 uppercase tracking-tighter">
                                                    Filhos
                                                </span>
                                            </div>
                                        </div>
                                    )}

                                    {/* Indicator space */}
                                    <div className="col-start-1 col-span-16 row-start-11" />
                                </div>
                                {/* Completion Indicator */}
                                {!isExpanded && !btn.isHalfHeight && (isCompleted || btn.level === 4) && (
                                    <div className={`absolute bottom-1 left-1 right-1 h-[2px] rounded-full ${isCompleted ? 'bg-green-600' : 'bg-slate-300/40'}`} />
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>

            <div className="w-full mt-8 px-4 pb-2">
                {/* ... (Existing select component code) */}
            </div>

            {/* Modal de Filhos (A Caixa) */}
            {childrenModal && (
                <div
                    className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm transition-all"
                    onClick={() => setChildrenModal(null)}
                >
                    <div
                        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-[280px] overflow-hidden transform animate-in fade-in zoom-in duration-300"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                            <div className="flex flex-col">
                                <span className="text-[10px] uppercase font-black text-slate-400 tracking-widest leading-none">
                                    DESCENDÊNCIA
                                </span>
                                <span className="text-xs font-black text-slate-800">
                                    {childrenModal.length} {childrenModal.length === 1 ? 'Filho' : 'Filhos'}
                                </span>
                            </div>
                            <button
                                onClick={() => setChildrenModal(null)}
                                className="p-1 hover:bg-slate-200 rounded-full transition-colors text-slate-400"
                            >
                                <svg size={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                                    <line x1="18" y1="6" x2="6" y2="18"></line>
                                    <line x1="6" y1="6" x2="18" y2="18"></line>
                                </svg>
                            </button>
                        </div>
                        <div className="p-4 max-h-[300px] overflow-y-auto">
                            <div className="flex flex-col gap-2">
                                {childrenModal.map((name, idx) => (
                                    <div key={idx} className="flex items-center gap-3 p-2 bg-slate-50/50 rounded-lg border border-slate-100">
                                        <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center text-[10px] font-black text-green-700">
                                            {idx + 1}
                                        </div>
                                        <span className="text-sm font-bold text-slate-800">
                                            {name}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="p-3 bg-slate-50 border-t border-slate-100 flex justify-center">
                            <button
                                onClick={() => setChildrenModal(null)}
                                className="px-6 py-2 bg-slate-800 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-900 transition-colors shadow-lg shadow-slate-200"
                            >
                                Fechar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div >
    );
};
