import { db, storage } from './firebase';
import { doc, getDoc, onSnapshot, setDoc, updateDoc } from "firebase/firestore";
import { ref, uploadBytes, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { INITIAL_STATE } from '../constants/initial_state';

/**
 * Busca dados do usuário (Read)
 */
export const fetchUserData = async (uid) => {
    if (!uid) return { status: 'error', message: 'UID não fornecido' };

    try {
        const docRef = doc(db, "familias", uid);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const data = docSnap.data();
            // Merge com INITIAL_STATE para garantir que campos novos não estejam undefined
            return {
                ...INITIAL_STATE,
                ...data,
                // Garantias de Arrays para Mídia
                gallery: Array.isArray(data.gallery) ? data.gallery : [],
                documents: Array.isArray(data.documents) ? data.documents : [],
                videos: Array.isArray(data.videos) ? data.videos : [],
                audios: Array.isArray(data.audios) ? data.audios : [],
                community: Array.isArray(data.community) ? data.community : []
            };
        } else {
            console.warn("Usuário sem documento no Firestore. Retornando estado inicial.");
            return { ...INITIAL_STATE, id_unico: uid };
        }
    } catch (error) {
        console.error("Fetch Data Error:", error);
        throw error;
    }
};

/**
 * Inscreve-se para atualizações em tempo real (Realtime Listener)
 * @param {string} uid 
 * @param {function} onUpdate - Callback recebe dados atualizados
 * @returns {function} Unsubscribe function
 */
export const subscribeToUserData = (uid, onUpdate, onError) => {
    if (!uid) return () => { };

    const docRef = doc(db, "familias", uid);

    // onSnapshot dispara sempre que o documento muda no servidor (ex: validação do admin)
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
        if (docSnap.exists()) {
            const data = docSnap.data();
            const mergedData = {
                ...INITIAL_STATE,
                ...data,
                // Garantir arrays
                gallery: Array.isArray(data.gallery) ? data.gallery : [],
                documents: Array.isArray(data.documents) ? data.documents : [],
                videos: Array.isArray(data.videos) ? data.videos : [],
                audios: Array.isArray(data.audios) ? data.audios : [],
                community: Array.isArray(data.community) ? data.community : []
            };
            onUpdate(mergedData);
        } else {
            // Se foi deletado ou não existe
            console.warn("Documento não encontrado para UID:", uid);
            onUpdate({ ...INITIAL_STATE, uid });
        }
    }, (error) => {
        console.error("Snapshot Error:", error);
        if (onError) onError(error);
    });

    return unsubscribe;
};

/**
 * Upload de Arquivo para Firebase Storage
 * @param {string} uid - ID do Usuário
 * @param {File} file - Objeto File do input HTML
 * @param {string} category - 'photos', 'documents', 'audios'
 * @returns {Promise<{url: string, path: string}>}
 */
export const uploadFile = (uid, file, category = 'photos', customFileName = null, onProgress = null) => {
    return new Promise(async (resolve, reject) => {
        if (!uid || !file) {
            reject(new Error('Parâmetros inválidos'));
            return;
        }

        try {
            const fileExt = file.name.split('.').pop();
            let fileName;
            if (customFileName) {
                fileName = `${customFileName}.${fileExt} `;
            } else {
                fileName = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${fileExt} `;
            }

            let storagePath;
            if (category.includes('/')) {
                // It's a full path provided by PhotoGalleryModal
                const cleanCategory = category.split('/').map(s => s.trim()).join('/');
                storagePath = `familias/${uid}/${cleanCategory}/${fileName.trim()}`;
            } else {
                storagePath = `familias/${uid}/${category}/${fileName.trim()}`;
            }

            const storageRef = ref(storage, storagePath);

            // Optimization: Use simple upload for small files to avoid Resumable overhead/issues
            // Use Resumable only for files > 2MB
            if (file.size < 2 * 1024 * 1024) {
                // SIMPLE UPLOAD (< 2MB)
                if (onProgress) onProgress(10); // Fake start

                // Wrap simple upload in timeout race
                const uploadTask = uploadBytes(storageRef, file);
                const timeoutPromise = new Promise((_, reject) =>
                    setTimeout(() => reject(new Error("Timeout: O envio simples demorou muito (10s).")), 10000)
                );

                if (onProgress) onProgress(50); // Fake middle

                const snapshot = await Promise.race([uploadTask, timeoutPromise]);
                const downloadURL = await getDownloadURL(snapshot.ref);

                if (onProgress) onProgress(100); // Done

                resolve({
                    status: 'success',
                    url: downloadURL,
                    path: storagePath,
                    name: fileName,
                    type: file.type
                });
            } else {
                // RESUMABLE UPLOAD (For large files)
                const uploadTask = uploadBytesResumable(storageRef, file);

                // Timeout Promise (20s) - Cancel upload if too slow
                const timeoutPromise = new Promise((_, reject) =>
                    setTimeout(() => {
                        uploadTask.cancel();
                        reject(new Error("Timeout: O envio do arquivo grande demorou muito (20s)."));
                    }, 20000)
                );

                const uploadPromise = new Promise((resolve, reject) => {
                    uploadTask.on('state_changed',
                        (snapshot) => {
                            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                            if (onProgress) onProgress(progress);
                        },
                        (error) => {
                            console.error("Upload Error:", error);
                            reject(new Error(error.message));
                        },
                        async () => {
                            try {
                                const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                                resolve({
                                    status: 'success',
                                    url: downloadURL,
                                    path: storagePath,
                                    name: fileName,
                                    type: file.type
                                });
                            } catch (e) {
                                reject(e);
                            }
                        }
                    );
                });

                // Race Upload vs Timeout
                const result = await Promise.race([uploadPromise, timeoutPromise]);
                resolve(result);
            }

        } catch (error) {
            console.error("Setup Error:", error);
            reject(new Error(error.message || 'Erro ao iniciar envio.'));
        }
    });
};

// --- Helper: Client-Side Image Compression ---
export const compressImage = (file, maxWidth = 1200, quality = 0.6) => {
    // Wrap compression in a timeout race (10s)
    const compressionPromise = new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                if (width > maxWidth || height > maxWidth) {
                    if (width > height) {
                        height *= maxWidth / width;
                        width = maxWidth;
                    } else {
                        width *= maxWidth / height;
                        height = maxWidth;
                    }
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                canvas.toBlob((blob) => {
                    if (blob) {
                        // Create new File object to retain name/type
                        const newFile = new File([blob], file.name, {
                            type: 'image/jpeg',
                            lastModified: Date.now(),
                        });
                        resolve(newFile);
                    } else {
                        reject(new Error("Canvas to Blob failed"));
                    }
                }, 'image/jpeg', quality);
            };
            img.onerror = (err) => reject(err);
        };
        reader.onerror = (err) => reject(err);
    });

    const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Optimizing took too long")), 10000)
    );

    return Promise.race([compressionPromise, timeoutPromise]);
};

// --- ACCOUNT SERVICE (USERS COLLECTION) ---

/**
 * Busca dados da CONTA do usuário (Coleção 'users')
 * @param {string} uid
 */
export const getAccountData = async (uid) => {
    if (!uid) return null;
    try {
        const docRef = doc(db, "users", uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            return docSnap.data();
        } else {
            return null; // Usuário ainda não tem perfil de conta
        }
    } catch (e) {
        console.error("Erro ao buscar dados da conta:", e);
        return null;
    }
};

/**
 * Atualiza dados da CONTA do usuário (Coleção 'users')
 * @param {string} uid
 * @param {object} data { repPhone, reAddress, photoURL, name }
 */
export const updateAccountData = async (uid, data) => {
    if (!uid) return { status: 'error', message: 'UID inválido' };
    try {
        const docRef = doc(db, "users", uid);
        // setDoc com merge: true cria se não existir ou atualiza
        await setDoc(docRef, data, { merge: true });
        return { status: 'success' };
    } catch (e) {
        console.error("Erro ao atualizar conta:", e);
        return { status: 'error', message: e.message };
    }
};

/**
 * Upload específico para Foto de Perfil (Selfie)
 * Salva em users/{uid}/profile_pic.jpg
 */
export const uploadAccountPhoto = async (uid, file) => {
    if (!uid || !file) return { status: 'error', message: 'Arquivo inválido' };
    try {
        // Caminho: users/UID/profile_pic.jpg
        const storagePath = `users/${uid}/profile_pic.jpg`;
        const storageRef = ref(storage, storagePath);

        const uploadTask = await uploadBytes(storageRef, file);
        const downloadURL = await getDownloadURL(uploadTask.ref);

        // Atualiza URL no documento do usuário
        await updateAccountData(uid, { photoURL: downloadURL });

        return { status: 'success', url: downloadURL };
    } catch (e) {
        console.error("Erro upload foto conta:", e);
        return { status: 'error', message: e.message };
    }
};
