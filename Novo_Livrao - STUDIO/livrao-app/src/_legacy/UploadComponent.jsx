import React from 'react';
import { Upload, X, Image as ImageIcon } from 'lucide-react';

export const UploadComponent = ({ label, value = [], onChange, maxFiles = 5 }) => {
    // Value should be an array of file objects or metadata

    const handleFileChange = (e) => {
        const files = Array.from(e.target.files);
        const currentFiles = value || [];

        if (currentFiles.length + files.length > maxFiles) {
            alert(`Você pode enviar no máximo ${maxFiles} arquivos.`);
            return;
        }

        // For now, we just store the file objects in state. 
        // In the future, we will upload them to Firebase Storage here or on submit.
        // We create a local preview URL for UX.
        const newFiles = files.map(file => ({
            file,
            preview: URL.createObjectURL(file),
            name: file.name
        }));

        onChange([...currentFiles, ...newFiles]);
    };

    const removeFile = (index) => {
        const currentFiles = [...(value || [])];
        currentFiles.splice(index, 1);
        onChange(currentFiles);
    };

    const [showLinkInput, setShowLinkInput] = React.useState(false);
    const [linkUrl, setLinkUrl] = React.useState('');

    const handleAddLink = () => {
        if (!linkUrl) return;
        const newLinkItem = {
            file: null, // No file object
            url: linkUrl, // Direct URL
            preview: null, // No preview image
            name: 'Link Externo',
            type: 'external_link', // Marker
            caption: ''
        };
        onChange([...(value || []), newLinkItem]);
        setLinkUrl('');
        setShowLinkInput(false);
    };

    return (
        <div className="flex flex-col gap-2 my-2">
            <label className="text-sm font-semibold text-history-green">{label}</label>

            <div className="border-2 border-dashed border-stone-300 rounded-lg p-6 flex flex-col items-center justify-center bg-stone-50 hover:bg-stone-100 transition-colors cursor-pointer relative">
                <input
                    type="file"
                    multiple
                    accept="image/*,application/pdf"
                    onChange={handleFileChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" // z-10 to stay above text but below link button if needed
                />
                <Upload size={32} className="text-stone-400 mb-2" />
                <p className="text-sm text-stone-500 font-medium">Clique ou arraste arquivos aqui</p>
                <p className="text-xs text-stone-400 mt-1">Máximo {maxFiles} arquivos (JPG, PNG, PDF)</p>
            </div>

            {/* Fallback Link Option */}
            <div className="flex flex-col gap-2 mt-2">
                {!showLinkInput ? (
                    <button
                        type="button"
                        onClick={() => setShowLinkInput(true)}
                        className="text-xs text-history-green font-semibold hover:underline self-start flex items-center gap-1"
                    >
                        <span>🔗</span> Está com problemas no envio? Cole um link (Drive/Photos)
                    </button>
                ) : (
                    <div className="flex items-center gap-2 bg-stone-50 p-2 rounded border border-stone-200 animate-fade-in">
                        <input
                            type="text"
                            placeholder="Cole o link aqui (https://...)"
                            value={linkUrl}
                            onChange={(e) => setLinkUrl(e.target.value)}
                            className="flex-1 text-sm p-1 bg-transparent outline-none"
                            autoFocus
                        />
                        <button
                            type="button"
                            onClick={handleAddLink}
                            className="text-xs bg-history-green text-white px-3 py-1 rounded font-bold"
                        >
                            Adicionar
                        </button>
                        <button
                            type="button"
                            onClick={() => setShowLinkInput(false)}
                            className="text-stone-400 hover:text-stone-600"
                        >
                            <X size={14} />
                        </button>
                    </div>
                )}
            </div>

            {/* Preview List with Captions */}
            {value && value.length > 0 && (
                <div className="flex flex-col gap-3 mt-4">
                    {value.map((item, index) => (
                        <div key={index} className="flex items-start gap-3 p-3 border border-stone-200 rounded-lg bg-white shadow-sm">
                            {/* Thumbnail */}
                            <div className="w-16 h-16 flex-shrink-0 bg-stone-100 rounded overflow-hidden border border-stone-100 flex items-center justify-center">
                                {item.type === 'external_link' ? (
                                    <span className="text-2xl">🔗</span>
                                ) : item.preview ? (
                                    <img src={item.preview} alt={item.name} className="w-full h-full object-cover" />
                                ) : (
                                    <ImageIcon size={20} className="text-stone-400" />
                                )}
                            </div>

                            {/* Info + Caption */}
                            <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-start">
                                    <p className="text-xs font-bold text-stone-700 truncate" title={item.name}>
                                        {item.type === 'external_link' ? <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">{item.url}</a> : item.name}
                                    </p>
                                    <button
                                        onClick={() => removeFile(index)}
                                        className="text-red-500 hover:text-red-700 p-1"
                                        title="Remover arquivo"
                                    >
                                        <X size={16} />
                                    </button>
                                </div>

                                <input
                                    type="text"
                                    placeholder={item.type === 'external_link' ? "Descrição deste link..." : "Descreva esta foto..."}
                                    value={item.caption || ''}
                                    onChange={(e) => {
                                        const newFiles = [...value];
                                        newFiles[index] = { ...newFiles[index], caption: e.target.value };
                                        onChange(newFiles);
                                    }}
                                    className="mt-2 w-full text-sm p-2 border border-stone-200 rounded bg-stone-50 focus:bg-white focus:ring-1 focus:ring-history-green outline-none transition-all placeholder:text-stone-400"
                                />
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
