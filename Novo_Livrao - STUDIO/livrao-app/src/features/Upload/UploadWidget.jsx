import React, { useRef } from 'react';
import { Upload, X, FileText, Image as ImageIcon } from 'lucide-react';

export const UploadWidget = ({ label, value = [], onChange, maxFiles = 5 }) => {
    const fileInputRef = useRef(null);

    const handleFileChange = (e) => {
        const newFiles = Array.from(e.target.files).map(file => ({
            file,
            name: file.name,
            preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : null,
            description: ''
        }));

        const combined = [...value, ...newFiles].slice(0, maxFiles);
        onChange(combined);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const removeFile = (index) => {
        const newValue = [...value];
        newValue.splice(index, 1);
        onChange(newValue);
    };

    const handleDescriptionChange = (index, text) => {
        const newValue = [...value];
        newValue[index] = { ...newValue[index], description: text };
        onChange(newValue);
    };

    const isFull = value.length >= maxFiles;

    return (
        <div className="w-full mb-8">
            {label && <h3 className="text-lg font-serif font-bold text-slate-800 mb-2">{label}</h3>}

            {/* DASHED DROP ZONE */}
            <div
                onClick={() => !isFull && fileInputRef.current?.click()}
                className={`
                    relative group flex flex-col items-center justify-center gap-4 p-8 rounded-xl border-2 border-dashed transition-all duration-300
                    ${isFull
                        ? 'border-slate-200 bg-slate-50 cursor-not-allowed opacity-75'
                        : 'border-slate-300 bg-slate-50 cursor-pointer hover:bg-slate-100 hover:border-amber-400'
                    }
                `}
            >
                <div className={`
                    w-12 h-12 rounded-full flex items-center justify-center transition-transform duration-300
                    ${isFull ? 'bg-slate-200 text-slate-400' : 'bg-white shadow-sm text-slate-400 group-hover:scale-110 group-hover:text-amber-500'}
                `}>
                    {isFull ? <FileText size={24} /> : <Upload size={24} />}
                </div>

                <div className="text-center">
                    <p className={`font-bold text-sm uppercase tracking-wide ${isFull ? 'text-slate-400' : 'text-slate-600 group-hover:text-slate-800'}`}>
                        {isFull ? 'Limite Atingido' : 'Clique para enviar fotos ou documentos'}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                        {value.length} de {maxFiles} arquivos
                    </p>
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

            {/* FILE UPLOAD GUIDELINES */}
            <div className="text-[10px] text-slate-400 mt-2 ml-1 leading-relaxed">
                <p className="font-bold mb-0.5">Arquivos permitidos:</p>
                <ul className="list-disc list-inside pl-1 space-y-0.5 opacity-80">
                    <li>Imagens (JPG, JPEG, PNG, WEBP, GIF)</li>
                    <li>Documentos PDF</li>
                    <li>Tamanho máximo: 20 MB por arquivo</li>
                </ul>
            </div>

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
