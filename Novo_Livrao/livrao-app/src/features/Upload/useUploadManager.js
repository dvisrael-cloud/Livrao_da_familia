import { useState } from 'react';
import { uploadFile } from '../../services/api';
import { compressImage } from '../../utils/fileUtils';
import { logError } from '../../services/logService';

// Limits to avoid OOM/crashes when many large scans are provided
const RECOMMENDED_MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB - UI guideline
const HARD_MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB - absolute reject to protect browser

const sleep = (ms) => new Promise(res => setTimeout(res, ms));

// Detect mobile user agent
const isMobileDevice = () => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

export const useUploadManager = () => {
    const [uploading, setUploading] = useState(false);
    const [statusMessage, setStatusMessage] = useState('');
    const [failedUploads, setFailedUploads] = useState([]);
    const [progress, setProgress] = useState(0);

    // Helper to standardize filenames
    const getFilePrefix = (data) => {
        const rawName = data.nomeCompleto || 'SemNome';
        const cleanName = rawName.normalize('NFD').replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9]/g, '');
        const rawDate = data.dataNascimento || '';
        let cleanDate = rawDate.replace(/\D/g, '');
        if (rawDate.includes('-') && rawDate.split('-').length === 3) {
            const [year, month, day] = rawDate.split('-');
            cleanDate = `${day}${month}${year}`;
        }
        return `${cleanName}_${cleanDate}`;
    };

    const processUploads = async (userId, dataToSubmit) => {
        try {
            setUploading(true);
            setStatusMessage("Preparando arquivos...");
            setFailedUploads([]);
            setProgress(0);

        const filePrefix = getFilePrefix(dataToSubmit);
        const fileFields = ['ketubaUpload', 'ketubaUpload_2', 'ketubaUpload_3', 'ketubaUpload_4', 'fotosOrigem', 'galeriaFotos', 'fotoIdentificacao', 'fotoKetuba'];
        const failures = [];

        // Pre-calculate total uploads to provide aggregated progress
        let totalUploads = 0;
        for (const f of fileFields) {
            if (Array.isArray(dataToSubmit[f])) {
                for (const it of dataToSubmit[f]) {
                    if (it && it.file && it.file instanceof File) totalUploads++;
                }
            }
        }
        let completedUploads = 0;
        if (totalUploads === 0) setProgress(100);

        const isMobile = isMobileDevice();
        const uploadDelay = isMobile ? 350 : 120;
        let hasAuthError = false;  // Flag to stop uploads on auth error

        // Clone data to avoid mutation
        const processedData = { ...dataToSubmit };

        for (const field of fileFields) {
            if (Array.isArray(processedData[field])) {
                const finalFiles = [];
                const filesArray = processedData[field];

                for (let i = 0; i < filesArray.length; i++) {
                    const item = filesArray[i];

                    // Already uploaded (has URL)
                    if (item.url) {
                        const { ...cleanItem } = item;
                        finalFiles.push(cleanItem);
                        continue;
                    }

                    // Needs upload (has File object)
                    if (item.file && item.file instanceof File) {
                        // Safety checks on file size before any heavy processing
                        if (item.file.size > HARD_MAX_FILE_SIZE) {
                            console.warn('File exceeds hard max size, skipping upload:', item.name);
                            failures.push({ field, name: item.name, reason: 'file_too_large' });
                            continue;
                        }

                        if (item.file.size > RECOMMENDED_MAX_FILE_SIZE) {
                            // Mark as large but attempt upload after compression; warn in status
                            setStatusMessage(`Arquivo grande detectado: ${item.name}. Tentando upload...`);
                        }
                        setStatusMessage(`Processando ${item.name}...`);
                        let fileToUpload = item.file;

                        const isImage = item.file.type.startsWith('image/');
                        if (isImage) {
                            try {
                                // Choose compression settings based on device type for memory safety
                                if (isMobile) {
                                    // Mobile: aggressive compression to prevent OOM
                                    if (item.file.size > 3 * 1024 * 1024) {
                                        fileToUpload = await compressImage(item.file, 800, 0.45);
                                    } else {
                                        fileToUpload = await compressImage(item.file, 1024, 0.5);
                                    }
                                } else {
                                    // Desktop: normal compression based on size
                                    if (item.file.size > 10 * 1024 * 1024) {
                                        fileToUpload = await compressImage(item.file, 1000, 0.6);
                                    } else if (item.file.size > 5 * 1024 * 1024) {
                                        fileToUpload = await compressImage(item.file, 1400, 0.7);
                                    } else {
                                        fileToUpload = await compressImage(item.file, 1600, 0.8);
                                    }
                                }
                            } catch (e) {
                                console.warn("Compression failed or OOM; falling back to original file", e);
                                fileToUpload = item.file;
                            }
                        }

                        // Upload
                        try {
                            const customName = `${filePrefix}_${field}_${i + 1}`;

                            // Corrected call to match storageService: (file, path)
                            // We construct the path string here.
                            const uploadPath = `familias/${userId}/uploads`;

                            // Aggregate progress callback for this upload
                            const downloadUrl = await uploadFile(fileToUpload, uploadPath, (p) => {
                                if (totalUploads > 0) {
                                    const overall = Math.round(((completedUploads + p / 100) / totalUploads) * 100);
                                    setProgress(overall);
                                }
                            });

                            if (downloadUrl) {
                                finalFiles.push({
                                    name: customName,
                                    url: downloadUrl,
                                    preview: downloadUrl, // Ensure preview matches url for UI components
                                    path: uploadPath,
                                    type: fileToUpload.type,
                                    caption: item.caption || '',
                                    uploadedAt: new Date().toISOString()
                                });
                                completedUploads++;
                                if (totalUploads > 0) setProgress(Math.round((completedUploads / totalUploads) * 100));
                            } else {
                                throw new Error("Falha no upload");
                            }

                            // Allow pause so browser can free memory and handle UI updates
                            // Longer pause on mobile between uploads to prevent OOM
                            await sleep(uploadDelay);

                            // Release heavy reference
                            try {
                                fileToUpload = null;
                                if (isMobile) await sleep(50);
                            } catch { /* noop */ }
                        } catch (err) {
                            console.error('Upload error:', err);
                            
                            // If authentication error, stop entire process
                            if (err.isAuthError || err.code === 'storage/unauthenticated') {
                                setStatusMessage('Sessão expirada. Por favor, faça login novamente.');
                                hasAuthError = true;
                                // ❌ LOG: erro de autenticação no upload
                                logError('useUploadManager', 'upload_auth_error', err, null, item.name);
                                failures.push({ 
                                    field, 
                                    name: item.name, 
                                    file: item.file, 
                                    message: 'Sessão expirada durante upload' 
                                });
                                break; // Break inner loop
                            }
                            
                            // For network errors, offer retry
                            if (err.isNetworkError) {
                                // ❌ LOG: erro de rede no upload
                                logError('useUploadManager', 'upload_network_error', err, null, item.name);
                                failures.push({ 
                                    field, 
                                    name: item.name, 
                                    file: item.file, 
                                    message: 'Erro de rede - tente novamente',
                                    retryable: true 
                                });
                            } else {
                                // ❌ LOG: erro genérico no upload
                                logError('useUploadManager', 'upload_failed', err, null, item.name);
                                // Record other failures
                                failures.push({ 
                                    field, 
                                    name: item.name, 
                                    file: item.file, 
                                    message: err.message 
                                });
                            }
                        }
                    }
                }
                processedData[field] = finalFiles;
                
                // Break outer loop if auth error
                if (hasAuthError) break;
            }
        }

        if (hasAuthError) {
            setUploading(false);
            return { success: false, data: processedData, failures, authError: true };
        }

        if (failures.length > 0) {
            setFailedUploads(failures);
            setStatusMessage(`${failures.length} arquivo(s) falharam ao enviar.`);
        } else {
            setStatusMessage('Uploads concluídos.');
        }

        setUploading(false);
        return { success: failures.length === 0, data: processedData, failures };
        } catch (unexpectedErr) {
            console.error('[processUploads] UNEXPECTED ERROR:', unexpectedErr);
            // ❌ LOG: erro inesperado no processamento de uploads
            logError('useUploadManager', 'processUploads_unexpected', unexpectedErr);
            setStatusMessage(`Erro inesperado: ${unexpectedErr.message || String(unexpectedErr)}`);
            setUploading(false);
            return { 
                success: false, 
                data: dataToSubmit, 
                failures: [{ message: `Erro: ${unexpectedErr.message || 'Desconhecido'}`, errorCode: unexpectedErr.code }],
                unexpectedError: true 
            };
        }
    };

    return { processUploads, uploading, statusMessage, failedUploads, progress };
};
