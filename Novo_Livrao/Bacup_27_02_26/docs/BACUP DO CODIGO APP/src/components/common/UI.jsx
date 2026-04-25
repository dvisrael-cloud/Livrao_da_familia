import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

export const Button = ({ children, onClick, variant = 'primary', disabled = false, className = '', type = 'button' }) => {
    const baseStyles = "px-6 py-3 rounded-xl font-semibold transition-all duration-300 ease-out transform flex items-center justify-center gap-2.5 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95";

    const variants = {
        primary: "bg-gradient-to-r from-emerald-600 to-teal-700 text-white shadow-lg shadow-emerald-900/30 hover:shadow-xl hover:shadow-emerald-900/40 hover:from-emerald-500 hover:to-teal-600 border-2 border-white/20",
        secondary: "bg-gradient-to-r from-amber-500 to-yellow-600 text-white shadow-lg shadow-amber-900/30 hover:shadow-xl hover:shadow-amber-900/40 hover:from-amber-400 hover:to-yellow-500 border-2 border-white/20",
        outline: "border-2 border-slate-300 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-400 shadow-md hover:shadow-lg hover:-translate-y-0.5",
        ghost: "text-slate-600 hover:text-slate-900 hover:bg-slate-100 shadow-none px-4 hover:shadow-sm"
    };

    return (
        <button
            type={type}
            onClick={onClick}
            disabled={disabled}
            className={`${baseStyles} ${variants[variant]} ${className}`}
        >
            {children}
        </button>
    );
};

export const Input = ({ label, value, onChange, type = 'text', placeholder, error, ...props }) => {
    const [showPassword, setShowPassword] = useState(false);
    const [isFocused, setIsFocused] = useState(false);
    const isPassword = type === 'password';
    const inputType = isPassword ? (showPassword ? 'text' : 'password') : type;

    return (
        <div className="flex flex-col gap-2 w-full relative">
            {label && (
                <label className="text-sm font-semibold text-slate-700 tracking-wide">
                    {label}
                </label>
            )}

            <div className="relative">
                <input
                    type={inputType}
                    value={value}
                    onChange={onChange}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                    placeholder={placeholder}
                    className={`
                        w-full px-4 py-3.5 rounded-xl border-2 bg-white outline-none transition-all duration-300 ease-out
                        ${error
                            ? 'border-red-400 focus:border-red-500 focus:ring-4 focus:ring-red-100 shadow-lg shadow-red-100/50'
                            : isFocused
                                ? 'border-emerald-500 ring-4 ring-emerald-100 shadow-lg shadow-emerald-100/50'
                                : 'border-slate-300 hover:border-slate-400 shadow-md'
                        }
                        ${isPassword ? 'pr-12' : ''}
                    `}
                    {...props}
                />

                {isPassword && (
                    <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-emerald-600 focus:outline-none transition-colors duration-200"
                    >
                        {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                )}
            </div>

            {error && (
                <span className="text-xs text-red-600 font-medium flex items-center gap-1.5">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    {error}
                </span>
            )}
        </div>
    );
};
