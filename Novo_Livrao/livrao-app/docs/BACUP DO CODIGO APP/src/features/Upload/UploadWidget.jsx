import React, { useRef, useEffect, useState } from 'react';
import { Upload, X, FileText, Image as ImageIcon, Plus, Camera } from 'lucide-react';

export const UploadWidget = ({ label, value = [], onChange, placeholder, maxFiles = 5, maxFileSize = 20 * 1024 * 1024 }) => {
    const fileInputRef = useRef(null);
    const createdPreviewsRef = useRef(new Set());
    const [isAdding, setIsAdding] = useState(false);

    const handleFileChange = (e) => {
        const filesList = Array.from(e.target.files || []);
        const remainingSlots = Math.max(0, maxFiles - value.length);
        const acceptedFiles = filesList.slice(0, remainingSlots);

        const rejected = [];
        const newFiles = acceptedFiles.map(file => {
            if (file.size > maxFileSize) {
                rejected.push({ name: file.name, size: file.size });
                return null;
            }
            const preview = file.type.startsWith('image/') ? URL.createObjectURL(file) : null;
            if (preview) createdPreviewsRef.current.add(preview);
            return ({
                file,
                name: file.name,
                preview,
                description: ''
            });
        }).filter(Boolean);

        const combined = [...value, ...newFiles];
        onChange(combined);

        if (rejected.length > 0) {
            const names = rejected.map(r => r.name).join(', ');
            alert(`Alguns arquivos foram ignorados (tamanho excede ${Math.round(maxFileSize / 1024 / 1024)}MB): ${names}`);
        }

        if (fileInputRef.current) fileInputRef.current.value = '';
        setIsAdding(false); // Close the dropzone after upload
    };

    const removeFile = (index) => {
        const newValue = [...value];
        const removed = newValue.splice(index, 1)[0];
        if (removed && removed.preview && typeof removed.preview === 'string') {
            try { URL.revokeObjectURL(removed.preview); } catch (e) { /* noop */ }
            createdPreviewsRef.current.delete(removed.preview);
        }
        onChange(newValue);
    };

    useEffect(() => {
        return () => {
            for (const url of createdPreviewsRef.current) {
                try { URL.revokeObjectURL(url); } catch (e) { /* noop */ }
            }
            createdPreviewsRef.current.clear();
        };
    }, []);

    const handleDescriptionChange = (index, text) => {
        const newValue = [...value];
        newValue[index] = { ...newValue[index], description: text };
        onChange(newValue);
    };

    const isFull = value.length >= maxFiles;

    return (
        <div className="w-full mb-8">
            {label && <h3 className="text-lg font-serif font-bold text-slate-800 mb-3">{label}</h3>}

            {/* PREVIEW LIST (Showing supplementary files, skipping the first one which is on the button) */}
            {value.length > 1 && (
                <div className="flex flex-col gap-3 mb-4">
                    {value.slice(1).map((item, index) => {
                        const originalIndex = index + 1;
                        return (
                            <div key={originalIndex} className="flex gap-3 p-3 bg-white border border-slate-200 rounded-xl shadow-sm items-start animate-fade-in">
                                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-lg bg-slate-100 overflow-hidden shrink-0 flex items-center justify-center border border-slate-100 relative group">
                                    {(item.url || item.preview) ? (
                                        <img src={item.url || item.preview} alt="Preview" className="w-full h-full object-cover" />
                                    ) : (
                                        <FileText size={24} className="text-slate-400" />
                                    )}
                                </div>
                                <div className="flex-1 flex flex-col min-w-0 gap-1.5">
                                    <div className="flex justify-between items-center">
                                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider truncate max-w-[120px]" title={item.name}>
                                            {item.name}
                                        </span>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); removeFile(originalIndex); }}
                                            className="text-slate-300 hover:text-red-500 transition-colors p-1"
                                        >
                                            <X size={14} />
                                        </button>
                                    </div>
                                    <textarea
                                        className="block w-full text-xs px-2.5 py-1.5 bg-slate-50/50 border border-slate-200 rounded-lg outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400/10 transition-all placeholder:text-slate-400 text-slate-800 resize-none"
                                        placeholder="Legenda..."
                                        rows={1}
                                        value={item.description || ''}
                                        onChange={(e) => handleDescriptionChange(originalIndex, e.target.value)}
                                    />
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* TRIGGER / PREVIEW BUTTON - 3x4 Aspect Ratio Card */}
            {!isAdding && (
                <div className="flex justify-start">
                    <button
                        type="button"
                        onClick={() => {
                            if (value.length > 0) {
                                if (window.confirm("Deseja realmente remover esta foto para anexar uma nova?")) {
                                    removeFile(0);
                                    setIsAdding(true);
                                }
                            } else {
                                setIsAdding(true);
                            }
                        }}
                        className={`w-32 aspect-[3/4] rounded-xl border-2 overflow-hidden transition-all duration-300 flex flex-col items-center justify-center gap-3 group active:scale-[0.98] shadow-sm
                            ${value.length > 0
                                ? 'border-amber-400 bg-white'
                                : 'border-dashed border-slate-300 bg-slate-50 text-slate-500 hover:border-amber-400 hover:bg-amber-50/30 hover:text-amber-600'
                            }`}
                    >
                        {value.length > 0 && (value[0].url || value[0].preview) ? (
                            <div className="relative w-full h-full group">
                                <img
                                    src={value[0].url || value[0].preview}
                                    alt="Foto de Rosto"
                                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                                    <Camera size={24} className="text-white" />
                                    <span className="text-[9px] text-white font-black uppercase tracking-widest text-center px-1">Trocar Foto</span>
                                </div>
                            </div>
                        ) : (
                            <>
                                <div className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center group-hover:scale-110 transition-transform">
                                    <Camera size={20} className="text-slate-400 group-hover:text-amber-500" />
                                </div>
                                <span className="font-black text-[10px] uppercase tracking-wider text-center px-2">
                                    Anexar Foto de Rosto
                                </span>
                            </>
                        )}
                    </button>
                </div>
            )}

            {/* DASHED DROP ZONE - Shown when trigger clicked */}
            {isAdding && (
                <div className="animate-in slide-in-from-top-2 duration-300">
                    <div
                        onClick={() => !isFull && fileInputRef.current?.click()}
                        className={`relative group flex flex-col items-center justify-center gap-3 p-6 sm:p-10 rounded-xl border-2 border-dashed transition-all duration-300
                            ${isFull
                                ? 'border-slate-200 bg-slate-50 cursor-not-allowed opacity-75'
                                : 'border-amber-300 bg-amber-50/20 cursor-pointer hover:bg-amber-50/40'
                            }`}
                    >
                        <button
                            onClick={(e) => { e.stopPropagation(); setIsAdding(false); }}
                            className="absolute top-3 right-3 text-slate-400 hover:text-slate-600 p-1"
                        >
                            <X size={18} />
                        </button>

                        <div className={`w-12 h-12 rounded-full bg-white shadow-md flex items-center justify-center transition-transform
                            ${isFull ? 'text-slate-300 scale-90' : 'text-amber-500 group-hover:scale-110'}`}>
                            <Upload size={24} />
                        </div>

                        <div className="text-center">
                            <p className={`font-black text-xs sm:text-sm uppercase tracking-wider ${isFull ? 'text-slate-400' : 'text-amber-900/60'}`}>
                                {isFull ? 'Limite Atingido' : (placeholder || 'Selecione ou arraste o arquivo aqui')}
                            </p>
                            {!isFull && (
                                <p className="text-[10px] text-amber-700/50 mt-1 uppercase font-bold">
                                    Formatos: JPG, PNG, PDF (Máx 20MB)
                                </p>
                            )}
                        </div>

                        <input
                            type="file"
                            ref={fileInputRef}
                            className="hidden"
                            onChange={handleFileChange}
                            multiple={maxFiles > 1}
                            accept="image/*,application/pdf"
                            disabled={isFull}
                        />
                    </div>
                </div>
            )}

            {/* MESSAGE IF FULL - Discreet indicator below the card */}
            {isFull && value.length > 0 && !isAdding && (
                <div className="mt-2 text-slate-300 text-[9px] uppercase font-bold tracking-widest flex items-center gap-1.5 ml-1 animate-fade-in">
                    <div className="w-1 h-1 rounded-full bg-slate-200" />
                    Limite atingido ({maxFiles}/{maxFiles})
                </div>
            )}
        </div>
    );
};
