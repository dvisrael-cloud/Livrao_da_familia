import React, { useState, useEffect } from 'react';

export const SourceInfoWidget = ({ data, updateData }) => {
    // Garante que selectedSources seja sempre um array
    let selectedSources = [];
    if (Array.isArray(data.fonteInformacao)) {
        selectedSources = data.fonteInformacao;
    } else if (typeof data.fonteInformacao === 'string' && data.fonteInformacao.trim() !== '') {
        // Migração de dado legado (string única)
        selectedSources = [data.fonteInformacao];
    }

    const hasValue = selectedSources.length > 0;
    const isMyself = data.relationshipInfo?.papel === 'Eu mesmo';

    // Internal state to force form to stay open while user is interacting
    const [keepOpen, setKeepOpen] = useState(false);

    // AUTO-SELECT & HIDE logic for "Eu mesmo"
    useEffect(() => {
        if (isMyself) {
            const autoVal = "Própria Memória";
            // Check if already selected to avoid infinite loop
            if (!selectedSources.includes(autoVal)) {
                // If empty or different, enforce it. 
                // Using timeout to avoid collision with strict mode or render cycle
                setTimeout(() => {
                    updateData('fonteInformacao', [autoVal]);
                }, 0);
            }
        }
    }, [isMyself, selectedSources, updateData]);

    // If it is the Representative (Eu mesmo), NEVER show the widget.
    if (isMyself) return null;

    // Show form if NO value, OR if explicitly editing via Header trigger
    const showForm = !hasValue || data._editingSource || keepOpen;

    const options = [
        "Próprio Familiar (Entrevista)",
        "Depoimento de Pessoa que Conviveu",
        "Própria Memória",
        "Documentos"
    ];

    const needsDeponentName = selectedSources.includes("Depoimento de Pessoa que Conviveu");

    // Função de Toggle (Múltipla Escolha)
    const toggleOption = (option) => {
        let newSelection;
        if (selectedSources.includes(option)) {
            newSelection = selectedSources.filter(item => item !== option);
        } else {
            newSelection = [...selectedSources, option];
        }

        // Force Edit Mode to stay open locally AND globally
        setKeepOpen(true);
        if (!data._editingSource) {
            updateData('_editingSource', true);
        }

        updateData('fonteInformacao', newSelection);
    };

    const handleClose = () => {
        setKeepOpen(false);
        updateData('_editingSource', false);
    };

    // If we have data and are NOT editing, the Header displays the info. Render nothing here.
    if (!showForm) {
        return null;
    }

    // Edit Mode
    return (
        <div className="bg-white/5 border border-white/10 rounded-lg p-4 mb-6 animate-fade-in backdrop-blur-sm">
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-history-gold" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" /></svg>
                    <span className="text-history-gold font-bold text-sm uppercase">Origem da Informação (Múltipla escolha)</span>
                </div>
                {hasValue && (
                    <button
                        onClick={handleClose}
                        className="text-xs text-white/40 hover:text-white uppercase font-bold"
                    >
                        ✕ Fechar
                    </button>
                )}
            </div>

            <div className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {options.map(opt => {
                        const isSelected = selectedSources.includes(opt);
                        return (
                            <button
                                key={opt}
                                onClick={() => toggleOption(opt)}
                                className={`text-left px-4 py-3 rounded-lg border transition-all duration-200 flex items-center justify-between group ${isSelected
                                    ? 'bg-gray-400 border-gray-500 text-black font-bold shadow-inner'
                                    : 'bg-white border-white/80 text-black hover:bg-gray-100'
                                    }`}
                            >
                                <span className="font-medium text-sm">{opt}</span>
                                <div className={`w-5 h-5 rounded flex items-center justify-center border ${isSelected ? 'bg-black border-black' : 'border-gray-300'}`}>
                                    {isSelected && <svg className="w-3.5 h-3.5 text-white font-bold" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                                </div>
                            </button>
                        );
                    })}
                </div>

                {needsDeponentName && (
                    <div className="pt-2 animate-fade-in pl-2 border-l-2 border-history-gold/50 ml-1">
                        <label className="block text-xs uppercase text-history-gold font-bold mb-1">Nome do Depoente:</label>
                        <input
                            type="text"
                            value={data.nomeDepoente || ''}
                            onChange={(e) => updateData('nomeDepoente', e.target.value)}
                            className="w-full bg-black/40 border border-white/20 rounded-md p-2.5 text-white focus:border-history-gold outline-none placeholder-white/30"
                            placeholder="Quem forneceu o depoimento?"
                        />
                    </div>
                )}
            </div>

            {hasValue && (
                <div className="mt-4 text-right">
                    <button
                        onClick={handleClose}
                        className="bg-history-gold text-stone-900 text-xs font-bold px-4 py-2 rounded hover:bg-white transition-colors shadow-lg"
                    >
                        CONCLUIR SELEÇÃO
                    </button>
                </div>
            )}
        </div>
    );
};
