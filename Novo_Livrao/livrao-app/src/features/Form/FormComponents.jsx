import React, { memo } from 'react';
import { AutoLocationSelector } from '../../components/AutoLocationSelector';
import { HelpCircle, AlertCircle, ChevronDown } from 'lucide-react';
import { ReferenceButtonTrigger, ReferenceForm } from './ReferenceButton';

// --- SMART WRAPPER COMPONENT ---
export const SmartFieldWrapper = ({ item, currentValue, onChange, children, label, formData, updateData }) => {
    const [isRefOpen, setIsRefOpen] = React.useState(false);

    // Estados especiais
    const isUnknown = currentValue === '[NÃO SEI]' || (typeof currentValue === 'string' && currentValue.startsWith('ID_DESCONHECIDO_'));
    const isNotApplicable = currentValue === '[NÃO HÁ]';
    const isBlocked = isUnknown || isNotApplicable;

    // Referência atual (se existe)
    const currentRef = formData?.[`_ref_${item.fieldId}`];

    // ... (rest of helper functions same as before)
    const handleSpecialOption = (option) => {
        if (option === 'unknown') {
            if (isUnknown) {
                onChange('');
            } else {
                const unknownValue = item.fieldId === 'dataNascimento' 
                    ? `ID_DESCONHECIDO_${formData?.userId || 'USERID'}_${Math.random().toString(36).substring(2, 11)}_${Date.now()}` 
                    : '[NÃO SEI]';
                onChange(unknownValue);
            }
        } else if (option === 'na') {
            onChange(isNotApplicable ? '' : '[NÃO HÁ]');
        } else if (option === 'onlyYear') {
            const isOnlyYear = currentValue && typeof currentValue === 'string' && currentValue.startsWith('[ANO]');
            onChange(isOnlyYear ? '' : '[ANO] ');
        }
    };

    const handleValueChange = (newValue) => {
        onChange(newValue);
    };

    const childrenWithProps = React.Children.map(children, child => {
        if (React.isValidElement(child)) {
            const isLocation = child.type === AutoLocationSelector || child.type?.displayName === 'AutoLocationSelector';
            if (isLocation) {
                return React.cloneElement(child, {
                    className: `${child.props.className || ''} ${isBlocked ? 'opacity-50 pointer-events-none filter grayscale' : ''}`
                });
            }
            return React.cloneElement(child, {
                className: `${child.props.className || ''} ${isBlocked ? 'bg-slate-50 text-slate-400 cursor-text' : ''}`,
                onChange: (eOrVal) => {
                    if (child.props.onChange) {
                        child.props.onChange(eOrVal);
                    } else {
                        const finalVal = eOrVal && eOrVal.target ? eOrVal.target.value : eOrVal;
                        handleValueChange(finalVal);
                    }
                },
                onFocus: () => { if (isBlocked) onChange(''); },
                onClick: () => { if (isBlocked) onChange(''); }
            });
        }
        return child;
    });

    return (
        <div className="flex flex-col w-full relative group/field mb-8 px-0.5">

            {/* Header: Label + Smart Buttons */}
            <div className="flex justify-between items-end mb-2 gap-4">
                {label && (
                    <label className="text-lg font-serif font-bold text-slate-800 leading-tight flex-1">
                        {label} {item.required && <span className="text-amber-600">*</span>}
                    </label>
                )}

                {/* Botões Smart: Topo Direita */}
                {(item.allowUnknown || item.allowNotApplicable || item.allowReference) && (
                    <div className="flex flex-wrap justify-end gap-1.5 shrink-0">
                        {item.allowUnknown && (
                            <button
                                type="button"
                                onClick={() => handleSpecialOption('unknown')}
                                className={`text-[10px] uppercase font-bold px-2 py-1 rounded transition-colors
                                    ${isUnknown
                                        ? 'bg-amber-100 text-amber-700 ring-1 ring-amber-200'
                                        : 'bg-slate-100 text-slate-400 hover:bg-amber-50 hover:text-amber-600'
                                    }`}
                            >
                                Não Sei
                            </button>
                        )}
                        {item.component === 'DateInputField' && (
                            <button
                                type="button"
                                onClick={() => handleSpecialOption('onlyYear')}
                                className={`text-[10px] uppercase font-bold px-2 py-1 rounded transition-colors
                                    ${(currentValue && typeof currentValue === 'string' && currentValue.startsWith('[ANO]'))
                                        ? 'bg-amber-100 text-amber-700 ring-1 ring-amber-200'
                                        : 'bg-slate-100 text-slate-400 hover:bg-amber-50 hover:text-amber-600'
                                    }`}
                            >
                                Apenas Ano
                            </button>
                        )}
                        {item.allowNotApplicable && (
                            <button
                                type="button"
                                onClick={() => handleSpecialOption('na')}
                                className={`text-[10px] uppercase font-bold px-2 py-1 rounded transition-colors
                                    ${isNotApplicable
                                        ? 'bg-amber-100 text-amber-700 ring-1 ring-amber-200'
                                        : 'bg-slate-100 text-slate-400 hover:bg-amber-50 hover:text-amber-600'
                                    }`}
                            >
                                Não Há
                            </button>
                        )}

                        {item.manualToggleField && updateData && (
                            <button
                                type="button"
                                onClick={() => updateData(item.manualToggleField, !formData?.[item.manualToggleField])}
                                className={`flex items-center gap-1.5 px-2 py-1 rounded transition-colors border
                                    ${formData?.[item.manualToggleField]
                                        ? 'bg-amber-100 text-amber-800 border-amber-300'
                                        : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                                    }`}
                            >
                                <div className={`w-3 h-3 rounded-sm border flex items-center justify-center
                                    ${formData?.[item.manualToggleField] ? 'bg-amber-600 border-amber-600' : 'border-slate-300 bg-white'}`}>
                                    {formData?.[item.manualToggleField] && <svg width="8" height="6" viewBox="0 0 10 8" fill="none" stroke="white" strokeWidth="2"><path d="M1 4L4 7L9 1" /></svg>}
                                </div>
                                <span className="text-[9px] uppercase font-bold tracking-tight">
                                    {item.manualToggleLabel || "Outra Localidade"}
                                </span>
                            </button>
                        )}

                        {item.allowReference && updateData && (
                            <ReferenceButtonTrigger
                                isOpen={isRefOpen}
                                onClick={() => setIsRefOpen(!isRefOpen)}
                                hasReference={!!currentRef}
                            />
                        )}
                    </div>
                )}
            </div>

            {/* REFERENCE FORM - MOVED OUT OF HEADER FLEXBOX - NO LONGER CAUSES CONFUSION */}
            {isRefOpen && (
                <div className="pb-4 animate-fade-in">
                    <ReferenceForm
                        fieldLabel={label}
                        currentRef={currentRef}
                        onSave={(refData) => updateData(`_ref_${item.fieldId}`, refData)}
                        onClose={() => setIsRefOpen(false)}
                    />
                </div>
            )}

            {/* NOVO: Exibe referência se existir */}
            {currentRef && currentRef.type && (
                <div className="text-xs text-slate-500 mt-2 ml-1 flex items-start gap-1.5">
                    <span className="text-blue-500">📎</span>
                    <span>
                        <strong>Origem:</strong> {currentRef.type}
                        {currentRef.details && ` — ${currentRef.details}`}
                    </span>
                </div>
            )}

            {/* Input Container */}
            <div className="relative">
                <div className={`transition-all duration-300 ${isBlocked ? "opacity-75" : ""}`}>
                    {childrenWithProps}
                </div>
            </div>

            {/* Help Text */}
            {item.helpText && (
                <p className="text-xs text-slate-500 mt-2 flex items-start gap-1.5 ml-1">
                    <HelpCircle size={14} className="text-amber-500 mt-0 shrink-0" />
                    <span>{item.helpText}</span>
                </p>
            )}
        </div>
    );
};

// --- COMPONENTS ---

export const FormInput = memo(({ item, value, onChange, formData, updateData }) => (
    <SmartFieldWrapper item={item} currentValue={value} onChange={onChange} label={item.label} formData={formData} updateData={updateData}>
        <input
            type="text"
            value={typeof value === 'object' ? '' : (value || '')}
            onChange={(e) => { e.stopPropagation(); onChange(e.target.value); }}
            placeholder={item.placeholder}
            className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-900 font-sans shadow-sm outline-none focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 transition-all placeholder:text-slate-300"
            disabled={item.disabled}
        />
    </SmartFieldWrapper>
));

export const FormTextArea = memo(({ item, value, onChange, formData, updateData }) => {
    const textareaRef = React.useRef(null);

    React.useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
        }
    }, [value]);

    return (
        <SmartFieldWrapper item={item} currentValue={value} onChange={onChange} label={item.label} formData={formData} updateData={updateData}>
            <textarea
                ref={textareaRef}
                value={typeof value === 'object' ? '' : (value || '')}
                onChange={(e) => { e.stopPropagation(); onChange(e.target.value); }}
                placeholder={item.placeholder}
                rows={4}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-900 font-sans shadow-sm outline-none focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 resize-none transition-all placeholder:text-slate-300 overflow-hidden"
                disabled={item.disabled}
            />
        </SmartFieldWrapper>
    );
});

export const FormDate = memo(({ item, value, onChange, formData, updateData }) => {
    // Helper to format YYYY-MM-DD -> DD/MM/YYYY
    const formatToDisplay = (val) => {
        if (!val) return '';
        if (val === '[NÃO SEI]' || (typeof val === 'string' && val.startsWith('ID_DESCONHECIDO_'))) return 'Ignorada';
        if (val.includes('/')) return val; // Already formatted?
        const partIdx = val.indexOf('T'); // Handle ISO timestamps if any
        const cleanVal = partIdx > -1 ? val.substring(0, partIdx) : val;
        const parts = cleanVal.split('-');
        if (parts.length === 3) {
            return `${parts[2]}/${parts[1]}/${parts[0]}`;
        }
        return val;
    };

    const [displayValue, setDisplayValue] = React.useState(formatToDisplay(value));

    // Sync external value changes
    React.useEffect(() => {
        setDisplayValue(formatToDisplay(value));
    }, [value]);

    const lastRawLen = React.useRef(0);

    const handleChange = (e) => {
        const rawVal = e.target.value;

        // Se está no modo "Apenas Ano"
        if (displayValue.startsWith('[ANO] ') || rawVal.startsWith('[ANO] ')) {
            let vYear = rawVal.replace('[ANO] ', '').replace(/\D/g, '');
            if (vYear.length > 4) vYear = vYear.slice(0, 4);
            const maskedYear = `[ANO] ${vYear}`;
            setDisplayValue(maskedYear);
            onChange(maskedYear);
            return;
        }

        let v = rawVal.replace(/\D/g, ''); // Digits only
        if (v.length > 8) v = v.slice(0, 8); // Max 8 digits (DDMMAAAA)

        const isDeleting = v.length < lastRawLen.current;
        lastRawLen.current = v.length;

        // Apply Mask DD/MM/AAAA with smart trailing slash
        let masked = v;
        if (!isDeleting) {
            if (v.length >= 4) {
                masked = `${v.slice(0, 2)}/${v.slice(2, 4)}/${v.slice(4)}`;
            } else if (v.length >= 2) {
                masked = `${v.slice(0, 2)}/${v.slice(2)}`;
            }
        } else {
            // If deleting, standard formatting but don't force trailing slash if it was just deleted
            if (v.length > 4) {
                masked = `${v.slice(0, 2)}/${v.slice(2, 4)}/${v.slice(4)}`;
            } else if (v.length > 2) {
                masked = `${v.slice(0, 2)}/${v.slice(2)}`;
            }
        }

        setDisplayValue(masked);

        // Sync with parent immediately
        if (v.length === 8) {
            const day = v.slice(0, 2);
            const month = v.slice(2, 4);
            const year = v.slice(4);
            const numMonth = parseInt(month, 10);
            const numDay = parseInt(day, 10);

            if (numMonth > 0 && numMonth <= 12 && numDay > 0 && numDay <= 31) {
                onChange(`${year}-${month}-${day}`);
            } else {
                onChange(masked);
            }
        } else {
            onChange(masked);
        }
    };

    return (
        <SmartFieldWrapper item={item} currentValue={value} onChange={onChange} label={item.label} formData={formData} updateData={updateData}>
            <input
                type="tel"
                inputMode="numeric"
                pattern="\d*"
                value={displayValue}
                onChange={handleChange}
                placeholder="DD/MM/ANO"
                autoComplete="off"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-900 font-sans shadow-sm outline-none focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 transition-all placeholder:text-slate-300 tracking-widest text-left"
                disabled={item.disabled}
                onClick={(e) => e.stopPropagation()}
            />
        </SmartFieldWrapper>
    );
});

// --- HELPERS PARA HISTÓRICO ---
const ColorizedLabel = ({ text }) => {
    if (!text) return null;

    // Casos especiais: Negrito conforme solicitado (comparação case-insensitive para robustez)
    const lower = text.toLowerCase();
    const isSpecialBold = lower === 'alfabetizado' || lower === 'instrução em casa';

    if (isSpecialBold) {
        return <span className="text-slate-900 font-black text-sm tracking-wider">{text}</span>;
    }

    const parts = text.split(',').map(p => p.trim());
    return (
        <span className="flex flex-col gap-0.5">
            {parts[0] && <span className="text-slate-900 font-bold text-sm">{parts[0]}</span>}
            <div className="flex flex-wrap gap-x-2 gap-y-0.5">
                {parts[1] && (
                    <span className="text-blue-600 font-bold text-[10px] tracking-wider">
                        de 1971 a 1996: {parts[1]}
                    </span>
                )}
                {parts[2] && (
                    <span className="text-emerald-600 font-medium text-[10px] tracking-wider border-l border-slate-200 pl-2">
                        Pré-1971: {parts[2]}
                    </span>
                )}
            </div>
        </span>
    );
};

const HistoricalSelect = ({ item, value, onChange }) => {
    const [isOpen, setIsOpen] = React.useState(false);
    const containerRef = React.useRef(null);

    // Close on click outside
    React.useEffect(() => {
        const handleClick = (e) => {
            if (containerRef.current && !containerRef.current.contains(e.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);

    const handleSelect = (opt) => {
        onChange(opt);
        setIsOpen(false);
    };

    return (
        <div className="relative w-full" ref={containerRef}>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={`w-full px-4 py-3 rounded-xl border bg-white text-left shadow-sm flex items-center justify-between transition-all
                    ${isOpen ? 'border-amber-400 ring-4 ring-amber-400/10' : 'border-slate-200'}
                `}
            >
                <div className="flex-1 overflow-hidden">
                    {value ? (
                        <ColorizedLabel text={value} />
                    ) : (
                        <span className="text-slate-400">Selecione o grau de instrução...</span>
                    )}
                </div>
                <ChevronDown size={20} className={`text-slate-400 transition-transform duration-300 ml-2 ${isOpen ? 'rotate-180 text-amber-500' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute z-[100] w-full mt-2 bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 pb-1">
                    <div className="max-h-80 overflow-y-auto">
                        {item.options?.map((opt, idx) => (
                            <button
                                key={idx}
                                type="button"
                                onClick={() => handleSelect(opt)}
                                className={`w-full px-4 py-3 text-left hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0
                                    ${value === opt ? 'bg-amber-50/50' : ''}
                                `}
                            >
                                <ColorizedLabel text={opt} />
                                {value === opt && (
                                    <div className="absolute right-3 transform -translate-y-1/2 mt-1">
                                        <div className="w-1.5 h-1.5 rounded-full bg-amber-500 shadow-sm shadow-amber-200" />
                                    </div>
                                )}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export const FormSelect = memo(({ item, value, onChange, formData, updateData }) => {
    // Manual Toggle Logic
    const isManual = item.manualToggleField && formData?.[item.manualToggleField];
    const manualKey = `${item.fieldId}_manual`;

    if (isManual) {
        return (
            <SmartFieldWrapper item={item} currentValue={formData[manualKey] || ''} onChange={(val) => updateData(manualKey, val)} label={item.label} formData={formData} updateData={updateData}>
                <div className="flex flex-col gap-2 mt-1">
                    <label className="text-xs font-bold uppercase text-slate-500 tracking-wider">Descreva {item.label}</label>
                    <input
                        type="text"
                        value={formData[manualKey] || ''}
                        onChange={(e) => updateData(manualKey, e.target.value)}
                        placeholder={`Digite ${item.label}`}
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-900 font-sans shadow-sm outline-none focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 transition-all placeholder:text-slate-300"
                    />
                </div>
            </SmartFieldWrapper>
        );
    }

    if (item.fieldId === 'grauInstrucao') {
        return (
            <SmartFieldWrapper item={item} currentValue={value} onChange={onChange} label={item.label} formData={formData} updateData={updateData}>
                <HistoricalSelect item={item} value={value} onChange={onChange} />
            </SmartFieldWrapper>
        );
    }

    return (
        <SmartFieldWrapper item={item} currentValue={value} onChange={onChange} label={item.label} formData={formData} updateData={updateData}>
            <div className="relative">
                <select
                    value={(typeof value === 'object' || Array.isArray(value)) ? '' : (value || '')}
                    onChange={(e) => {
                        e.stopPropagation();
                        onChange(e.target.value);
                    }}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-900 font-sans shadow-sm outline-none focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 transition-all appearance-none cursor-pointer"
                    required={item.required}
                    disabled={item.disabled}
                >
                    <option value="">Selecione uma opção...</option>
                    {item.options?.map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                    ))}
                </select>
                {/* Custom Arrow */}
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none opacity-50 text-slate-500">
                    <ChevronDown size={20} />
                </div>
            </div>
        </SmartFieldWrapper>
    );
});

export const FormLocationSelector = memo(({ item, formData, setFormData }) => {
    if (!item || !item.fieldId) return null;

    const baseId = item.fieldId.replace('_pais', '');
    const currentValue = formData[`${baseId}_pais`];

    // Check for Manual Toggle
    const isManual = item.manualToggleField && formData?.[item.manualToggleField];
    const updateData = (key, val) => setFormData(p => ({ ...p, [key]: val }));

    if (isManual) {
        return (
            <SmartFieldWrapper item={item} currentValue={formData['localNascimento_manual'] || ''} onChange={(val) => setFormData(p => ({ ...p, localNascimento_manual: val }))} label={item.label} formData={formData} updateData={updateData}>
                <div className="flex flex-col gap-2 mt-1">
                    <label className="text-xs font-bold uppercase text-slate-500 tracking-wider">Digite o Local de Nascimento</label>
                    <input
                        type="text"
                        value={formData['localNascimento_manual'] || ''}
                        onChange={(e) => setFormData(p => ({ ...p, localNascimento_manual: e.target.value }))}
                        placeholder="Cidade, Estado, País"
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-900 font-sans shadow-sm outline-none focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 transition-all placeholder:text-slate-300"
                    />
                    <p className="text-[10px] text-slate-400 font-medium">Informe o local manualmente (Cidade, País, etc).</p>
                </div>
            </SmartFieldWrapper>
        );
    }

    const compoundValue = {
        cidade: formData[`${baseId}_cidade`],
        estado: formData[`${baseId}_estado`],
        pais: formData[`${baseId}_pais`]
    };

    const handleSmartChange = (val) => {
        if (val === '[NÃO SEI]' || val === '[NÃO HÁ]') {
            setFormData(prev => ({
                ...prev,
                [`${baseId}_pais`]: val,
                [`${baseId}_estado`]: val,
                [`${baseId}_cidade`]: val
            }));
        } else if (val === '') {
            setFormData(prev => ({
                ...prev,
                [`${baseId}_pais`]: '',
                [`${baseId}_estado`]: '',
                [`${baseId}_cidade`]: ''
            }));
        }
    };

    return (
        <SmartFieldWrapper item={item} currentValue={currentValue} onChange={handleSmartChange} label={item.label} formData={formData} updateData={updateData}>
            <div className="rounded-xl border border-slate-200 bg-white shadow-sm focus-within:ring-4 focus-within:ring-amber-500/10 focus-within:border-amber-500 transition-all relative z-20">
                <AutoLocationSelector
                    label={null}
                    helpText={null}
                    value={compoundValue}
                    onChange={(result) => {
                        if (result) {
                            setFormData(prev => ({
                                ...prev,
                                [`${baseId}_cidade`]: result.cidade,
                                [`${baseId}_estado`]: result.estado,
                                [`${baseId}_pais`]: result.pais
                            }));
                        } else {
                            setFormData(prev => ({
                                ...prev,
                                [`${baseId}_cidade`]: '',
                                [`${baseId}_estado`]: '',
                                [`${baseId}_pais`]: ''
                            }));
                        }
                    }}
                />
            </div>
        </SmartFieldWrapper>
    );
});

export const FormStaticText = memo(({ item }) => (
    <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 my-8 shadow-sm">
        <div className="flex gap-4 items-start">
            <div className="bg-amber-100 p-2 rounded-full h-fit shrink-0 mt-1">
                <AlertCircle className="text-amber-600" size={20} />
            </div>
            <div>
                <p className="text-slate-700 text-sm leading-relaxed text-justify font-sans">
                    {item.content}
                </p>
            </div>
        </div>
    </div>
));

export const FormCheckbox = memo(({ item, value, onChange }) => (
    <div
        onClick={() => onChange(!value)}
        className={`flex items-start gap-4 my-6 p-5 rounded-xl border cursor-pointer hover:bg-slate-50 transition-all duration-300 group
            ${value ? 'border-amber-500 bg-amber-50/30' : 'border-slate-200 bg-white'}`}
    >
        <div className={`w-6 h-6 rounded flex items-center justify-center shrink-0 transition-all border-2
            ${value ? 'bg-amber-500 border-amber-500' : 'border-slate-300 bg-white group-hover:border-amber-400'}`}>
            {value && <div className="w-2.5 h-2.5 bg-white rounded-sm" />}
        </div>
        <div className="flex flex-col gap-1">
            <span className={`font-bold font-serif text-lg ${value ? 'text-amber-900' : 'text-slate-700'}`}>{item.label}</span>
            {item.helpText && <span className="text-sm text-slate-500 leading-snug">{item.helpText}</span>}
        </div>
    </div>
));

export const UnsupportedField = ({ item }) => (
    <div className="p-4 bg-red-50 text-red-600 rounded-xl text-center border border-red-200 text-xs font-mono my-4">
        Camppo não suportado: {item.component}
    </div>
);
