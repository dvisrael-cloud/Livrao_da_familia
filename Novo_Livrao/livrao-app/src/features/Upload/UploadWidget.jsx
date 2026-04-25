import React, { useRef, useEffect } from 'react';
import { Upload, X, FileText, Image as ImageIcon } from 'lucide-react';

export const UploadWidget = ({ label, value = [], onChange, maxFiles = 5, maxFileSize = 20 * 1024 * 1024 }) => {
    const fileInputRef = useRef(null);
    const createdPreviewsRef = useRef(new Set());

    const handleFileChange = (e) => {
        const filesList = Array.from(e.target.files || []);
        const remainingSlots = Math.max(0, maxFiles - value.length);

        // Only take as many files as remaining slots to avoid creating too many object URLs
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

        // Inform about rejected files once
        if (rejected.length > 0) {
            const names = rejected.map(r => r.name).join(', ');
            alert(`Alguns arquivos foram ignorados (tamanho excede ${Math.round(maxFileSize/1024/1024)}MB): ${names}`);
        }

        // clear the input so the same file can be selected again if needed
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const removeFile = (index) => {
        const newValue = [...value];
        const removed = newValue.splice(index, 1)[0];

        // Revoke object URL if we created a preview to free memory
        if (removed && removed.preview && typeof removed.preview === 'string') {
            try { URL.revokeObjectURL(removed.preview); } catch { /* noop */ }
            createdPreviewsRef.current.delete(removed.preview);
        }

        onChange(newValue);
    };

    // Cleanup on unmount: revoke any previews we created
    useEffect(() => {
        return () => {
            for (const url of createdPreviewsRef.current) {
                try { URL.revokeObjectURL(url); } catch { /* noop */ }
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
            {label && <h3 className="text-lg font-serif font-bold text-slate-800 mb-2">{label}</h3>}

            {/* DASHED DROP ZONE - Hidden when full */}
            {!isFull && (
                <>
                    <div
                        onClick={() => fileInputRef.current?.click()}
                        className="relative group flex flex-col items-center justify-center gap-4 p-8 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 cursor-pointer hover:bg-slate-100 hover:border-amber-400 transition-all duration-300"
                    >
                        <div className="w-12 h-12 rounded-full bg-white shadow-sm text-slate-400 flex items-center justify-center group-hover:scale-110 group-hover:text-amber-500 transition-transform duration-300">
                            <Upload size={24} />
                        </div>

                        <div className="text-center">
                            <p className="font-bold text-sm uppercase tracking-wide text-slate-600 group-hover:text-slate-800">
                                Clique para enviar fotos ou documentos
                            </p>
                            <p className="text-xs text-slate-400 mt-1">
                                {value.length} de {maxFiles} arquivos
                                {maxFiles === 1 ? ' (Máximo 1 foto)' : ` (Máximo ${maxFiles} fotos)`}
                            </p>
                        </div>

                        <input
                            type="file"
                            ref={fileInputRef}
                            className="hidden"
                            onChange={handleFileChange}
                            multiple={maxFiles > 1}
                            accept="image/*,application/pdf"
                        />
                    </div>

                    {/* FILE UPLOAD GUIDELINES */}
                    <div className="text-[10px] text-slate-400 mt-2 ml-1 leading-relaxed">
                        <p className="font-bold mb-0.5">Arquivos permitidos:</p>
                        <ul className="list-disc list-inside pl-1 space-y-0.5 opacity-80">
                            <li>Imagens (JPG, JPEG, PNG, WEBP, GIF)</li>
                            <li>Documentos PDF</li>
                            <li>Tamanho máximo: 20 MB por arquivo</li>
                        </ul>
                    </div>
                </>
            )}

            {/* PREVIEW LIST COMPACT & VISIBLE */}
            {value.length > 0 && (
                <div className="flex flex-col gap-4 mt-6">
                    {value.map((item, index) => (
                        <div key={index} className="flex gap-4 p-4 bg-white border border-slate-200 rounded-xl shadow-sm items-start">

                            {/* COLUNA 1: Miniatura */}
                            <div className="w-24 h-24 rounded-lg bg-slate-100 overflow-hidden shrink-0 flex items-center justify-center border border-slate-100 relative group">
                                {item.preview ? (
                                    <img src={item.preview} alt="Preview" className="w-full h-full object-cover" />
                                ) : (
                                    <FileText size={32} className="text-slate-400" />
                                )}
                                {/* Remove Button Overlay on Image for better UX? Or keep separate? */}
                            </div>

                            {/* COLUNA 2: Caixa de Legenda + Info */}
                            <div className="flex-1 flex flex-col h-full justify-between gap-2 min-w-0">

                                <div className="flex justify-between items-center">
                                    <span className="text-[10px] text-slate-400 truncate max-w-[150px]" title={item.name}>
                                        {item.name}
                                    </span>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); removeFile(index); }}
                                        className="text-red-400 hover:text-red-600 transition-colors p-1"
                                        title="Remover Foto"
                                    >
                                        <X size={16} />
                                    </button>
                                </div>

                                <textarea
                                    className="block w-full flex-grow text-sm px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400/20 transition-all placeholder:text-slate-400 text-slate-800 resize-none"
                                    placeholder="Escreva uma legenda..."
                                    rows={2}
                                    value={item.description || ''}
                                    onChange={(e) => handleDescriptionChange(index, e.target.value)}
                                />
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
