import React, { useState, useEffect } from 'react';

export const InputField = ({ label, type = 'text', value, onChange, placeholder, required = false, className = '' }) => (
    <div className={`flex flex-col gap-1 ${className}`}>
        <label className="text-sm font-semibold text-history-green">{label} {required && '*'}</label>
        <input
            type={type}
            value={value || ''}
            onChange={onChange}
            placeholder={placeholder}
            className="p-2 border border-stone-300 rounded-md bg-stone-50 focus:ring-2 focus:ring-gold-accent focus:border-transparent outline-none transition-all shadow-sm"
        />
    </div>
);

export const selectField = ({ label, options, value, onChange, required = false }) => (
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

// Added specifically for Admin export, usually named SelectField but respecting the file content logic
export const SelectField = selectField;
