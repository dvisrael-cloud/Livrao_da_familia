import React from 'react';

export const FamilyTreeReport = ({ family, members, onClose }) => {
    // TODO: Mapping logic based on actual member relationships will go here.
    // For now, we visualize the structure.

    // Helper to find member by relation (Placeholder logic)
    const findMember = (role) => {
        // This would need strict relationship fields in the database
        return null;
    };

    return (
        <div className="fixed inset-0 bg-stone-900/90 z-50 overflow-y-auto flex items-center justify-center p-4">
            <div className="bg-[#Fdfbf7] w-full max-w-[1400px] min-h-[90vh] rounded-xl shadow-2xl relative flex flex-col items-center py-10 px-4 overflow-hidden print:w-full print:max-w-none print:h-auto print:bg-white">

                {/* Close Button (Screen Only) */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 bg-stone-200 hover:bg-stone-300 rounded-full text-stone-600 print:hidden"
                >
                    ✕
                </button>

                {/* Print Button */}
                <button
                    onClick={() => window.print()}
                    className="absolute top-4 left-4 px-4 py-2 bg-stone-800 text-white rounded hover:bg-stone-700 print:hidden flex items-center gap-2"
                >
                    <span>Imprimir / PDF</span>
                </button>

                {/* Background Watermark (CSS/SVG) */}
                <div className="absolute inset-0 flex items-center justify-center opacity-[0.07] pointer-events-none select-none overflow-hidden">
                    <svg viewBox="0 0 500 500" className="w-[120%] h-[120%] text-green-900 fill-current">
                        <path d="M250 450 C 100 450, 50 300, 50 200 C 50 100, 150 50, 250 50 C 350 50, 450 100, 450 200 C 450 300, 400 450, 250 450 Z M 250 450 L 250 250" />
                        <path d="M250 450 Q 150 400 150 300 M250 450 Q 350 400 350 300" stroke="currentColor" strokeWidth="20" fill="none" />
                        {/* Abstract Tree/Book shapes */}
                    </svg>
                </div>

                {/* Title */}
                <h1 className="text-5xl font-serif font-black text-black mb-16 z-10 uppercase tracking-widest text-center border-b-2 border-stone-300 pb-4 px-10">
                    Árvore de Família
                </h1>

                {/* TREE GRID */}
                <div className="flex flex-col items-center gap-16 w-full z-10">

                    {/* Gener. 1: Bisavós (8) */}
                    <div className="grid grid-cols-8 gap-4 w-full max-w-6xl">
                        {Array(8).fill(null).map((_, i) => (
                            <TreeCard key={i} title="Bisavô(ó)" size="sm" />
                        ))}
                    </div>

                    {/* Gener. 2: Avós (4) */}
                    <div className="grid grid-cols-4 gap-20 w-full max-w-4xl">
                        {Array(4).fill(null).map((_, i) => (
                            <TreeCard key={i} title="Avô(ó)" size="md" />
                        ))}
                    </div>

                    {/* Gener. 3: Pais (2) */}
                    <div className="flex justify-center gap-40 w-full max-w-2xl">
                        <TreeCard title="Mãe" size="lg" />
                        <TreeCard title="Pai" size="lg" />
                    </div>

                    {/* Gener. 4: Representante (1) */}
                    <div className="flex justify-center w-full">
                        <TreeCard
                            title="Representante"
                            name={family?.repName || "Nome do Representante"}
                            size="xl"
                            isMain
                        />
                    </div>

                </div>

                {/* Footer Logo */}
                <div className="mt-20 opacity-50 font-serif text-stone-500 italic">
                    Livrão da Família - Comissão de Genealogia e Memória
                </div>

            </div>
        </div>
    );
};

// Card Component
const TreeCard = ({ title, name, size = 'md', isMain }) => {
    // Size Mapping
    const sizeClasses = {
        sm: "w-full aspect-[4/5] max-w-[120px]", // Bisavós
        md: "w-full aspect-[4/5] max-w-[160px]", // Avós
        lg: "w-full aspect-[4/5] max-w-[200px]", // Pais
        xl: "w-full aspect-[4/5] max-w-[240px]", // Repr
    };

    const imageSize = {
        sm: "w-16 h-16",
        md: "w-24 h-24",
        lg: "w-28 h-28",
        xl: "w-32 h-32",
    };

    return (
        <div className={`flex flex-col items-center justify-center p-3 rounded-2xl shadow-md border-2 border-stone-200/50 bg-[#e3d0c0] ${sizeClasses[size]} mx-auto transition-transform hover:scale-105`}>
            {/* Photo Placeholder */}
            <div className={`${imageSize[size]} rounded-full bg-stone-300 border-4 border-stone-100 flex items-center justify-center overflow-hidden mb-2 shadow-inner text-stone-500`}>
                <svg className="w-2/3 h-2/3" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                </svg>
            </div>
            {/* Content */}
            <div className="text-center w-full">
                <div className="font-bold text-stone-900 leading-tight truncate px-1 text-sm md:text-base">
                    {name || "NOME"}
                </div>
                <div className="text-[10px] md:text-xs uppercase tracking-wide text-stone-700 font-semibold mt-1">
                    {title}
                </div>
            </div>
        </div>
    );
};
