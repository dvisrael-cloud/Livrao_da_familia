import React, { memo } from 'react';
import { AutoLocationSelector } from '../../components/AutoLocationSelector';
import { HelpCircle, AlertCircle } from 'lucide-react';
import { ReferenceButton } from './ReferenceButton';

// --- SMART WRAPPER COMPONENT ---
export const SmartFieldWrapper = ({ item, currentValue, onChange, children, label, formData, updateData }) => {

    // Estados especiais
    const isUnknown = currentValue === '[NÃO SEI]';
    const isNotApplicable = currentValue === '[NÃO HÁ]';
    const isBlocked = isUnknown || isNotApplicable;

    // Referência atual (se existe)
    const currentRef = formData?.[`_ref_${item.fieldId}`];

    // Função ao clicar nas opções especiais
    const handleSpecialOption = (option) => {
        if (option === 'unknown') {
            onChange(isUnknown ? '' : '[NÃO SEI]');
        } else if (option === 'na') {
            onChange(isNotApplicable ? '' : '[NÃO HÁ]');
        }
    };

    const handleValueChange = (newValue) => {
        if (newValue !== '[NÃO SEI]' && newValue !== '[NÃO HÁ]') {
            onChange(newValue);
        } else {
            onChange(newValue);
        }
    };

    const handleBlockedClick = (e) => {
        if (isBlocked) {
            alert("Para preencher este campo, desmarque a opção selecionada ('Não sei' ou 'Não há').");
            e.preventDefault();
            e.stopPropagation();
        }
    };

    // Injeta props interceptadas nos children
    const childrenWithProps = React.Children.map(children, child => {
        if (React.isValidElement(child)) {
            // Se o componente for AutoLocationSelector, tratamos diferente
            const isLocation = child.type === AutoLocationSelector || child.type?.displayName === 'AutoLocationSelector';

            if (isLocation) {
                return React.cloneElement(child, {
                    className: `${child.props.className || ''} ${isBlocked ? 'opacity-50 pointer-events-none filter grayscale' : ''}`
                });
            }

            return React.cloneElement(child, {
                disabled: child.props.disabled, // REMOVED || isBlocked to allow focus/click to clear it
                className: `${child.props.className || ''} ${isBlocked ? 'bg-slate-50 text-slate-400 cursor-text' : ''}`, // Changed cursor-not-allowed to cursor-text
                onChange: (eOrVal) => {
                    // Critical: if child has its own onChange (e.g. FormDate mask), call it!
                    if (child.props.onChange) {
                        child.props.onChange(eOrVal);
                    } else {
                        // Otherwise, use default pass-through
                        const finalVal = eOrVal && eOrVal.target ? eOrVal.target.value : eOrVal;
                        handleValueChange(finalVal);
                    }
                },
                onFocus: () => {
                    if (isBlocked) onChange('');
                },
                onClick: () => {
                    if (isBlocked) onChange('');
                }
            });
        }
        return child;
    });

    return (
        <div className="flex flex-col w-full relative group/field mb-8">

            {/* Header: Label + Smart Buttons */}
            <div className="flex justify-between items-end mb-2">
                {label && (
                    <label className="text-lg font-serif font-bold text-slate-800 leading-tight">
                        {label} {item.required && <span className="text-amber-600">*</span>}
                    </label>
                )}

                {/* Botões Smart: Topo Direita */}
                {(item.allowUnknown || item.allowNotApplicable || item.allowReference) && (
                    <div className="flex gap-2">
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

                        {/* Botão "Informação" - NOVO */}
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
                            <ReferenceButton
                                fieldId={item.fieldId}
                                fieldLabel={label}
                                currentRef={currentRef}
                                onSave={(refData) => {
                                    updateData(`_ref_${item.fieldId}`, refData);
                                }}
                            />
                        )}
                    </div>
                )}
            </div>

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

export const FormTextArea = memo(({ item, value, onChange, formData, updateData }) => (
    <SmartFieldWrapper item={item} currentValue={value} onChange={onChange} label={item.label} formData={formData} updateData={updateData}>
        <textarea
            value={typeof value === 'object' ? '' : (value || '')}
            onChange={(e) => { e.stopPropagation(); onChange(e.target.value); }}
            placeholder={item.placeholder}
            rows={4}
            className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-900 font-sans shadow-sm outline-none focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 resize-none transition-all placeholder:text-slate-300"
            disabled={item.disabled}
        />
    </SmartFieldWrapper>
));

export const FormDate = memo(({ item, value, onChange, formData, updateData }) => {
    // Helper to format YYYY-MM-DD -> DD/MM/YYYY
    const formatToDisplay = (val) => {
        if (!val) return '';
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
        let v = e.target.value.replace(/\D/g, ''); // Digits only
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

    return (
        <SmartFieldWrapper item={item} currentValue={value} onChange={onChange} label={item.label} formData={formData} updateData={updateData}>
            <div className="relative">
                <select
                    value={value || ''}
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
                    <svg width="12" height="8" viewBox="0 0 12 8" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M1 1.5L6 6.5L11 1.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
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
