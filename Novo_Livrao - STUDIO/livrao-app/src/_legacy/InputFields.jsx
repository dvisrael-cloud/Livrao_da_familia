import React, { useState, useEffect } from 'react';
import { MoreHorizontal, Check } from 'lucide-react';

export const EditableField = ({ label, value, onChange, placeholder, required = false }) => {
    const [isEditing, setIsEditing] = useState(false);

    // Force edit mode if no value exists (so user sees the input immediately)
    const showInput = isEditing || !value;

    if (showInput) {
        return (
            <div className="flex flex-col gap-1">
                <label className="text-sm font-semibold text-history-green">{label} {required && '*'}</label>
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={value || ''}
                        onChange={onChange}
                        placeholder={placeholder || (isEditing ? "Digite aqui..." : "Preencha este campo")}
                        className="flex-1 p-2 border border-stone-300 rounded-md bg-white focus:ring-2 focus:ring-gold-accent outline-none shadow-sm"
                        autoFocus={isEditing}
                    />
                    {/* Only show save checkmark if we have a value to save */}
                    {value && (
                        <button
                            onClick={() => setIsEditing(false)}
                            className="p-2 bg-history-green text-white rounded-md hover:bg-opacity-90 transition-colors"
                            title="Confirmar"
                        >
                            <Check size={20} />
                        </button>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-1">
            <label className="text-sm font-semibold text-history-green">{label} {required && '*'}</label>
            <div className="flex items-center justify-between p-2 border border-stone-200 rounded-md bg-stone-100 text-stone-600">
                <span className="truncate">{value || <span className="text-stone-400 italic">Clique para editar...</span>}</span>
                <button
                    onClick={() => setIsEditing(true)}
                    className="p-1 hover:bg-stone-200 rounded-full transition-colors text-stone-500"
                    title="Editar"
                >
                    <MoreHorizontal size={20} />
                </button>
            </div>
        </div>
    );
};

export const InputField = ({ label, type = 'text', value, onChange, placeholder, required = false, className = '', disabled = false }) => (
    <div className={`flex flex-col gap-1 ${className}`}>
        <label className="text-sm font-semibold text-history-green">{label} {required && '*'}</label>
        <input
            type={type}
            value={value || ''}
            onChange={onChange}
            placeholder={placeholder}
            disabled={disabled}
            className={`p-2 border border-stone-300 rounded-md bg-stone-50 focus:ring-2 focus:ring-gold-accent focus:border-transparent outline-none transition-all shadow-sm ${disabled ? 'bg-stone-200 text-stone-500 cursor-not-allowed' : ''}`}
        />
    </div>
);

export const DateInputField = ({ label, value, onChange, required = false }) => {
    // Converts YYYY-MM-DD to DD/MM/YYYY for display
    const formatDateToDisplay = (isoDate) => {
        if (!isoDate) return '';
        const [y, m, d] = isoDate.split('-');
        return `${d}/${m}/${y}`;
    };

    const [display, setDisplay] = useState(formatDateToDisplay(value));

    // Sync if external value changes (e.g. loading from DB)
    useEffect(() => {
        setDisplay(formatDateToDisplay(value));
    }, [value]);

    const handleChange = (e) => {
        // Allow only numbers
        let input = e.target.value.replace(/\D/g, '');
        if (input.length > 8) input = input.slice(0, 8);

        // Apply visual mask DD/MM/YYYY
        let formatted = input;
        if (input.length >= 2) {
            formatted = input.slice(0, 2) + '/' + input.slice(2);
        }
        if (input.length >= 4) {
            formatted = formatted.slice(0, 5) + '/' + formatted.slice(5);
        }

        setDisplay(formatted);

        // If complete (8 digits), validate and emit YYYY-MM-DD
        if (input.length === 8) {
            const day = input.slice(0, 2);
            const month = input.slice(2, 4);
            const year = input.slice(4, 8);

            // Basic validation
            const d = parseInt(day);
            const m = parseInt(month);
            const y = parseInt(year);

            if (m > 0 && m <= 12 && d > 0 && d <= 31) {
                onChange(`${year}-${month}-${day}`);
            }
            // If invalid, we don't emit, parent keeps old value or empty
        } else if (input.length === 0) {
            onChange('');
        }
    };

    return (
        <div className="flex flex-col gap-1">
            <label className="text-sm font-semibold text-history-green">{label} {required && '*'}</label>
            <input
                type="tel" // Opens numeric keypad on mobile
                value={display}
                onChange={handleChange}
                placeholder="DD/MM/AAAA"
                className="p-2 border border-stone-300 rounded-md bg-stone-50 focus:ring-2 focus:ring-gold-accent focus:border-transparent outline-none transition-all shadow-sm"
            />
        </div>
    );
};

export const SelectField = ({ label, options, value, onChange, required = false }) => (
    <div className="flex flex-col gap-1">
        <label className="text-sm font-semibold text-history-green">{label} {required && '*'}</label>
        <select
            value={value || ''}
            onChange={onChange} // Pass event directly to work with parent handlers expecting (e)
            className="p-2 border border-stone-300 rounded-md bg-stone-50 focus:ring-2 focus:ring-gold-accent focus:border-transparent outline-none shadow-sm"
        >
            <option value="">Selecione...</option>
            {options.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
            ))}
        </select>
    </div>
);

export const TextAreaField = ({ label, value, onChange, placeholder, rows = 4 }) => (
    <div className="flex flex-col gap-1">
        <label className="text-sm font-semibold text-history-green">{label}</label>
        <textarea
            value={value || ''}
            onChange={onChange}
            placeholder={placeholder}
            rows={rows}
            className="p-2 border border-stone-300 rounded-md bg-stone-50 focus:ring-2 focus:ring-gold-accent focus:border-transparent outline-none transition-all shadow-sm resize-none"
        />
    </div>
);

export const StaticText = ({ content, className = '' }) => (
    <div className={`p-4 bg-stone-100 rounded-md border-l-4 border-history-green text-stone-700 font-sans text-sm leading-relaxed my-4 ${className}`}>
        {content}
    </div>
);

export const CheckboxField = ({ label, value, onChange, required = false }) => (
    <div className="flex items-center gap-3 py-2 my-2 bg-stone-50 border border-stone-200 rounded-md p-3">
        <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
                type="checkbox"
                checked={!!value}
                onChange={(e) => onChange(e.target.checked)}
                className="w-5 h-5 text-history-green rounded border-gray-300 focus:ring-history-green"
            />
            <span className="text-sm font-semibold text-history-green">{label} {required && '*'}</span>
        </label>
    </div>
);

export const SingleSelectGroup = ({ label, value, onChange, options = [], required = false }) => (
    <div className="py-2 my-2">
        {label && <label className="block text-sm font-semibold text-history-green mb-2">{label} {required && '*'}</label>}
        <div className="flex flex-col gap-2">
            {options.map((option) => (
                <div
                    key={option}
                    onClick={() => onChange(value === option ? '' : option)}
                    className={`
                        flex items-center gap-3 p-3 rounded-md border cursor-pointer transition-colors
                        ${value === option
                            ? 'bg-history-green/10 border-history-green'
                            : 'bg-stone-50 border-stone-200 hover:bg-stone-100'}
                    `}
                >
                    <div className={`
                        w-5 h-5 rounded-full border flex items-center justify-center
                        ${value === option ? 'border-history-green' : 'border-gray-400'}
                    `}>
                        {value === option && <div className="w-2.5 h-2.5 rounded-full bg-history-green" />}
                    </div>
                    <span className={`text-sm ${value === option ? 'font-semibold text-history-green' : 'text-stone-600'}`}>
                        {option}
                    </span>
                </div>
            ))}
        </div>
    </div>
);
