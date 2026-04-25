/**
 * PROJETO: Livrão da Família
 * DESENVOLVIMENTO: HOD (CNPJ: 11.702.142/0001-70)
 * AUTOR: David Vidal Israel (dvisrael@hotmail.com)
 * PARCERIA: Comissão Livrão da Família (Presidida por Marcia Barcessat Rubistein)
 * ASSISTÊNCIA: IA Google Gemini
 * STATUS: Código em fase de ajuste/migração Firebase
 * © 2025 HOD. Todos os direitos reservados.
 */

import React, { useState, useRef, useEffect } from 'react';
import { Camera, Image as ImageIcon, Trash2, X } from 'lucide-react';
import { Button } from '../../components/common/UI';
import { db } from '../../services/firebase';
import { doc, onSnapshot, setDoc, arrayUnion } from 'firebase/firestore';
import { uploadFile, compressImage } from '../../services/api';

/**
 * Componente Item individual para gerenciar legenda e delete
 */
const GalleryItem = ({ photo, onDelete, onUpdateCaption }) => {
    const [caption, setCaption] = useState(photo.caption || '');

    // Sync if remote changes
    useEffect(() => {
        setCaption(photo.caption || '');
    }, [photo.caption]);

    const handleBlur = () => {
        if (caption !== photo.caption) {
            onUpdateCaption(photo, caption);
        }
    };

    return (
        <div className="flex gap-4 p-4 bg-slate-50 border-2 border-slate-200 rounded-xl items-start animate-fade-in group hover:bg-white hover:shadow-md transition-all">

            {/* 1. Miniature (Left Column) */}
            <div className="w-24 h-24 shrink-0 bg-slate-200 rounded-lg overflow-hidden border-2 border-slate-300 relative cursor-pointer hover:border-emerald-400" onClick={() => window.open(photo.url, '_blank')}>
                <img
                    src={photo.url}
                    alt={photo.name}
                    className="w-full h-full object-cover hover:scale-110 transition-transform duration-500"
                />
            </div>

            {/* 2. Text Box (Right Column) */}
            <div className="flex-1 flex flex-col justify-between min-w-0 h-full gap-2">
                <div className="flex justify-between items-start">
                    <span className="text-[10px] text-slate-500 truncate max-w-[200px] uppercase tracking-wider font-medium">{photo.name}</span>
                    <button
                        onClick={() => onDelete(photo)}
                        className="text-slate-400 hover:text-red-600 transition-colors p-1 hover:bg-red-50 rounded"
                        title="Excluir foto"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                    </button>
                </div>

                <textarea
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    onBlur={handleBlur}
                    placeholder="Escreva uma legenda... (Quem é? Onde? Quando?)"
                    className="w-full bg-white text-slate-700 text-sm p-3 rounded-lg border-2 border-slate-300 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 outline-none resize-none placeholder:text-slate-400 transition-all font-sans shadow-sm"
                    rows={2}
                />
            </div>
        </div>
    );
};


export const PhotoGalleryModal = ({ isOpen, onClose, targetMember, uid }) => {
    const [isDragging, setIsDragging] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [photos, setPhotos] = useState([]);

    // Refs for Inputs
    const fileInputRef = useRef(null); // Standard file picker
    const cameraInputRef = useRef(null); // Camera capture

    // Subscribe to Member Data
    useEffect(() => {
        if (!isOpen || !uid || !targetMember?.id) return;

        console.log(`[Gallery] Listening to: familias/${uid}/membros/${targetMember.id}`);
        const memberRef = doc(db, "familias", uid, "membros", targetMember.id);

        const unsubscribe = onSnapshot(memberRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                console.log(`[Gallery] Snapshot received. Photos:`, data.gallery?.length);
                setPhotos(data.gallery || []);
            } else {
                console.log(`[Gallery] Document does not exist (yet).`);
                setPhotos([]);
            }
        });

        return () => unsubscribe();
    }, [isOpen, uid, targetMember]);

    if (!isOpen) return null;

    const handleDragOver = (e) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = () => {
        setIsDragging(false);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragging(false);
        const files = Array.from(e.dataTransfer.files);
        handleFiles(files);
    };

    const handleFiles = async (files) => {
        if (!files.length) return;
        setUploading(true);
        console.log(`[Gallery] Starting upload of ${files.length} files...`);

        try {
            const uploads = files.map(async (file) => {
                // 1. Client-Side Compression
                let fileToUpload = file;
                try {
                    if (file.type.startsWith('image/')) {
                        console.log(`[Gallery] Compressing ${file.name}...`);
                        fileToUpload = await compressImage(file, 1600, 0.85);
                    }
                } catch (err) {
                    console.warn("Image compression skipped:", err);
                }

                // 2. Upload to Storage  (use same path as other uploads)
                const storagePath = `familias/${uid}/uploads`;
                console.log(`[Gallery] Uploading to: ${storagePath}`);

                try {
                    const downloadURL = await uploadFile(fileToUpload, storagePath);
                    console.log("[Gallery] Upload result:", downloadURL);

                    if (downloadURL) {
                        const newPhoto = {
                            id: Date.now() + Math.random(),
                            url: downloadURL,
                            path: storagePath,
                            name: file.name,
                            caption: '',
                            uploadedAt: new Date().toISOString()
                        };

                        // 3. Save to Firestore (CRITICAL FIX: setDoc + merge)
                        const memberRef = doc(db, "familias", uid, "membros", targetMember.id);
                        console.log(`[Gallery] Saving metadata to Firestore...`);

                        await setDoc(memberRef, {
                            gallery: arrayUnion(newPhoto),
                            lastUpdated: new Date().toISOString()
                        }, { merge: true });

                        console.log(`[Gallery] Metadata saved successfully for ${file.name}`);
                    } else {
                        console.error(`[Gallery] Upload failed for ${file.name}: No URL returned`);
                    }
                } catch (uploadError) {
                    console.error(`[Gallery] Upload error for ${file.name}:`, uploadError);
                    throw uploadError; // Re-throw to be caught by outer try-catch
                }
            });

            await Promise.all(uploads);
            console.log("[Gallery] All uploads processed.");

        } catch (error) {
            console.error("[Gallery] Upload Process Error:", error);
            alert("Erro ao enviar algumas fotos: " + error.message);
        } finally {
            setUploading(false);
        }
    };

    const handleDelete = async (photoToDelete) => {
        if (!window.confirm("Deseja excluir esta foto permanentemente?")) return;

        try {
            // ROBUST DELETE: Filter array and rewrite
            const newGallery = photos.filter(p => p.id !== photoToDelete.id);
            const memberRef = doc(db, "familias", uid, "membros", targetMember.id);
            await setDoc(memberRef, { gallery: newGallery }, { merge: true });

        } catch (error) {
            console.error("Delete Error:", error);
            alert("Erro ao excluir foto.");
        }
    };

    const handleUpdateCaption = async (photo, newCaption) => {
        try {
            const newGallery = photos.map(p => {
                if (p.id === photo.id) {
                    return { ...p, caption: newCaption };
                }
                return p;
            });

            const memberRef = doc(db, "familias", uid, "membros", targetMember.id);
            await setDoc(memberRef, { gallery: newGallery }, { merge: true });

        } catch (error) {
            console.error("Caption Update Error:", error);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in">

            {/* Main Container */}
            <div className="w-full max-w-5xl h-[90vh] bg-white rounded-2xl border-2 border-slate-300 shadow-2xl flex flex-col overflow-hidden relative">

                {/* Header */}
                <div className="bg-gradient-to-r from-emerald-50 to-teal-50 p-5 border-b-2 border-slate-200 flex justify-between items-center shrink-0">
                    <div>
                        <h2 className="text-emerald-700 font-serif text-2xl font-bold flex items-center gap-3">
                            <Camera className="w-8 h-8 text-emerald-600" />
                            Álbum de Memórias
                        </h2>
                        <p className="text-slate-600 text-sm mt-1">
                            Curadoria visual de: <span className="text-slate-900 font-bold">{targetMember?.name || 'Familiar'}</span>
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-10 h-10 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-700 transition-all shadow-md"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-y-auto p-6 bg-slate-50">

                    {/* INPUTS INVISÍVEIS */}
                    <input
                        type="file"
                        multiple
                        accept="image/*"
                        className="hidden"
                        ref={fileInputRef}
                        onChange={(e) => handleFiles(Array.from(e.target.files))}
                    />
                    {/* INPUT CÂMERA (Mobile Trigger) */}
                    <input
                        type="file"
                        accept="image/*"
                        capture="environment" // Forces rear camera on mobile
                        className="hidden"
                        ref={cameraInputRef}
                        onChange={(e) => handleFiles(Array.from(e.target.files))}
                    />

                    {/* ACTIONS AREA */}
                    {uploading ? (
                        <div className="border-2 border-dashed border-emerald-400 bg-emerald-50 rounded-xl p-10 flex flex-col items-center justify-center min-h-[200px] animate-pulse">
                            <h3 className="text-emerald-700 text-lg font-bold mb-2">Comprimindo e Enviando...</h3>
                            <p className="text-slate-600">Otimizando suas memórias para a eternidade.</p>
                        </div>
                    ) : (
                        <div
                            className={`border-2 border-dashed rounded-xl p-8 text-center transition-all mb-8
                                ${isDragging
                                    ? 'border-emerald-500 bg-emerald-100 scale-[1.01]'
                                    : 'border-slate-300 hover:border-slate-400 hover:bg-white'}`}
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onDrop={handleDrop}
                        >
                            <div className="flex flex-col items-center gap-6">

                                <h3 className="text-slate-600 font-serif italic text-lg">Como deseja adicionar?</h3>

                                <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md">
                                    {/* Botão Câmera */}
                                    <button
                                        onClick={() => cameraInputRef.current?.click()}
                                        className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-semibold py-4 px-6 rounded-xl flex items-center justify-center gap-3 transition-all hover:scale-105 shadow-lg shadow-emerald-500/30 active:scale-95"
                                    >
                                        <Camera className="w-6 h-6" />
                                        <span>Escanear Foto</span>
                                    </button>

                                    {/* Botão Galeria */}
                                    <button
                                        onClick={() => fileInputRef.current?.click()}
                                        className="flex-1 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold py-4 px-6 rounded-xl flex items-center justify-center gap-3 transition-all hover:scale-105 shadow-md active:scale-95"
                                    >
                                        <ImageIcon className="w-6 h-6" />
                                        <span>Galeria / PC</span>
                                    </button>
                                </div>

                                <p className="text-slate-400 text-xs hidden sm:block">ou arraste arquivos para esta área</p>
                            </div>
                        </div>
                    )}

                    {/* Gallery Grid */}
                    {photos.length > 0 ? (
                        <div className="flex flex-col gap-4">
                            {photos.map(photo => (
                                <GalleryItem
                                    key={photo.id}
                                    photo={photo}
                                    onDelete={handleDelete}
                                    onUpdateCaption={handleUpdateCaption}
                                />
                            ))}
                        </div>
                    ) : (
                        !uploading && (
                            <div className="text-center py-10 opacity-40 select-none">
                                <p className="text-slate-700 text-3xl font-serif italic mb-2">"Lembrar é viver..."</p>
                                <p className="text-slate-500 text-sm">Este álbum ainda está vazio.</p>
                            </div>
                        )
                    )}
                </div>

                {/* Footer Controls */}
                <div className="p-4 border-t-2 border-slate-200 bg-white flex justify-end gap-3 shrink-0">
                    <Button onClick={onClose} variant="primary">
                        Concluir e Voltar
                    </Button>
                </div>

            </div>
        </div>
    );
};
