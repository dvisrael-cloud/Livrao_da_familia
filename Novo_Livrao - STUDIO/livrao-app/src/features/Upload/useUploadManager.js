import { useState } from 'react';
import { uploadFile } from '../../services/api';
import { compressImage } from '../../utils/fileUtils';

export const useUploadManager = () => {
    const [uploading, setUploading] = useState(false);
    const [statusMessage, setStatusMessage] = useState('');
    const [failedUploads, setFailedUploads] = useState([]);

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
        setUploading(true);
        setStatusMessage("Preparando arquivos...");
        setFailedUploads([]);

        const filePrefix = getFilePrefix(dataToSubmit);
        const fileFields = ['ketubaUpload', 'ketubaUpload_2', 'ketubaUpload_3', 'ketubaUpload_4', 'fotosOrigem', 'galeriaFotos', 'fotoIdentificacao', 'fotoKetuba'];
        const failures = [];

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
                        const { preview, file, ...cleanItem } = item;
                        finalFiles.push(cleanItem);
                        continue;
                    }

                    // Needs upload (has File object)
                    if (item.file && item.file instanceof File) {
                        setStatusMessage(`Processando ${item.name}...`);
                        let fileToUpload = item.file;

                        // Compress if image & > 5MB (Wait, > 5MB? Maybe optimize all?)
                        const isImage = item.file.type.startsWith('image/');
                        if (isImage) {
                            try {
                                // Aggressive compression for legacy look & speed
                                fileToUpload = await compressImage(item.file, 1600, 0.8);
                            } catch (e) {
                                console.warn("Compression failed", e);
                            }
                        }

                        // Upload
                        try {
                            const customName = `${filePrefix}_${field}_${i + 1}`;

                            // Corrected call to match storageService: (file, path)
                            // We construct the path string here.
                            const uploadPath = `familias/${userId}/uploads`;
                            const downloadUrl = await uploadFile(fileToUpload, uploadPath);

                            if (downloadUrl) {
                                finalFiles.push({
                                    name: customName,
                                    url: downloadUrl,
                                    path: uploadPath,
                                    type: fileToUpload.type,
                                    caption: item.caption || ''
                                });
                            } else {
                                throw new Error("Falha no upload");
                            }
                        } catch (err) {
                            console.error(err);
                            alert(`Erro de Upload no arquivo ${item.name}: ${err.message}`);
                            failures.push({ field, name: item.name, file: item.file });
                        }
                    }
                }
                processedData[field] = finalFiles;
            }
        }

        setUploading(false);
        return { success: failures.length === 0, data: processedData, failures };
    };

    return { processUploads, uploading, statusMessage, failedUploads };
};
