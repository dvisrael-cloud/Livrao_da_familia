import React, { useState } from 'react';

// --- TRIGGER BUTTON ---
export const ReferenceButtonTrigger = ({ isOpen, onClick, hasReference }) => (
    <button
        type="button"
        onClick={onClick}
        className={`text-[10px] uppercase font-bold px-2 py-1 rounded transition-colors
            ${hasReference
                ? 'bg-blue-100 text-blue-700 ring-1 ring-blue-200'
                : 'bg-slate-100 text-slate-400 hover:bg-blue-50 hover:text-blue-600'
            }`}
    >
        📎 FONTE INF.
    </button>
);

// --- REFERENCE FORM CONTENT ---
export const ReferenceForm = ({ fieldLabel, currentRef, onSave, onClose }) => {
    const [refData, setRefData] = useState(currentRef || {
        type: '',
        details: ''
    });

    const hasReference = currentRef && currentRef.type;

    const referenceTypes = [
        "Personagem Familiar (Entrevista)",
        "Depoimento de Pessoa que conviveu",
        "Minha memória",
        "Documentos"
    ];

    const handleTypeSelect = (type) => {
        setRefData({ ...refData, type });
    };

    const handleSave = () => {
        if (!refData.type) {
            alert('Selecione o tipo de informação');
            return;
        }
        onSave(refData);
        onClose();
    };

    const handleRemove = () => {
        if (confirm('Deseja remover esta referência?')) {
            onSave(null);
            onClose();
        }
    };

    return (
        <div className="mb-4 bg-blue-50/50 border border-blue-100 rounded-lg p-4 animate-fade-in shadow-sm">
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-500" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                    <span className="text-blue-600 font-bold text-sm uppercase">
                        Origem: {fieldLabel}
                    </span>
                </div>
                <button
                    onClick={onClose}
                    className="text-xs text-slate-400 hover:text-slate-700 uppercase font-bold"
                >
                    ✕ Fechar
                </button>
            </div>

            <div className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {referenceTypes.map(type => {
                        const isSelected = refData.type === type;
                        return (
                            <button
                                key={type}
                                onClick={() => handleTypeSelect(type)}
                                className={`text-left px-4 py-3 rounded-lg border transition-all duration-200 flex items-center justify-between group ${isSelected
                                    ? 'bg-blue-600 border-blue-600 text-white font-bold shadow-md'
                                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                                    }`}
                            >
                                <span className={`font-medium text-sm ${isSelected ? 'text-white' : ''}`}>{type}</span>
                                <div className={`w-5 h-5 rounded flex items-center justify-center border ${isSelected ? 'bg-white border-white' : 'border-slate-300'
                                    }`}>
                                    {isSelected && (
                                        <svg className="w-3.5 h-3.5 text-blue-600 font-bold" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                        </svg>
                                    )}
                                </div>
                            </button>
                        );
                    })}
                </div>

                <div className="pt-2 animate-fade-in pl-2 border-l-2 border-blue-500/50 ml-1">
                    <label className="block text-xs uppercase text-blue-600 font-bold mb-1">
                        Detalhes (Opcional):
                    </label>
                    <textarea
                        value={refData.details}
                        onChange={(e) => setRefData({ ...refData, details: e.target.value })}
                        placeholder="Ex: Tia Sarah contou em 2020 / Certidão de nascimento - Cartório de Belém"
                        rows={2}
                        className="w-full bg-white border border-slate-200 rounded-md p-2.5 text-slate-900 focus:border-blue-500 outline-none placeholder-slate-400 text-sm"
                    />
                </div>
            </div>

            <div className="mt-4 flex gap-2 justify-end">
                {hasReference && (
                    <button
                        onClick={handleRemove}
                        className="text-red-600 hover:bg-red-50 text-xs font-bold px-3 py-2 rounded transition-colors"
                    >
                        🗑️ Remover
                    </button>
                )}
                <button
                    onClick={handleSave}
                    className="bg-blue-600 text-white text-xs font-bold px-4 py-2 rounded hover:bg-blue-700 transition-colors shadow-lg"
                >
                    SALVAR REFERÊNCIA
                </button>
            </div>
        </div>
    );
};

// COMPATIBILITY EXPORT (Optional, but better to use specific exports)
export const ReferenceButton = ({ fieldId, fieldLabel, currentRef, onSave }) => {
    const [isOpen, setIsOpen] = useState(false);
    return (
        <div className="relative">
            <ReferenceButtonTrigger
                isOpen={isOpen}
                onClick={() => setIsOpen(!isOpen)}
                hasReference={!!(currentRef && currentRef.type)}
            />
            {isOpen && (
                <div className="absolute top-full right-0 mt-2 z-50 w-[300px] md:w-[450px]">
                    <ReferenceForm
                        fieldLabel={fieldLabel}
                        currentRef={currentRef}
                        onSave={onSave}
                        onClose={() => setIsOpen(false)}
                    />
                </div>
            )}
        </div>
    );
};
