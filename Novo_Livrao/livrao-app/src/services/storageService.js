import { storage } from './firebase';
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";

/**
 * Uploads a single file to Firebase Storage
 * @param {File} file - The file object to upload
 * @param {string} path - The storage path (e.g. 'familias/uid/uploads')
 * @returns {Promise<string>} - The download URL
 */
export const uploadFile = async (file, path, onProgress) => {
    if (!file) return null;

    // Create a reference (add timestamp to avoid overwrites)
    const storageRef = ref(storage, `${path}/${Date.now()}_${file.name}`);

    // Use resumable upload to provide progress
    const uploadTask = uploadBytesResumable(storageRef, file);

    return new Promise((resolve, reject) => {
        uploadTask.on('state_changed',
            (snapshot) => {
                if (onProgress && snapshot.totalBytes) {
                    const percent = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
                    try { onProgress(percent); } catch { /* noop */ }
                }
            },
            (error) => {
                console.error('[uploadFile] Error:', error.code, error.message);
                
                // Classify error type for better handling
                if (error.code === 'storage/unauthenticated' || error.code === 'auth/unauthorized') {
                    error.isAuthError = true;
                }
                if (error.code === 'storage/network-error' || error.code === 'storage/canceled' || error.code === 'storage/retry-limit-exceeded' || error.code === 'storage/bucket-not-found') {
                    error.isNetworkError = true;
                }
                
                reject(error);
            },
            async () => {
                try {
                    const url = await getDownloadURL(uploadTask.snapshot.ref);
                    console.log('[uploadFile] Success:', url);
                    resolve(url);
                } catch (e) {
                    console.error('[uploadFile] getDownloadURL Error:', e.code, e.message);
                    if (e.code === 'storage/object-not-found') {
                        e.isNetworkError = true;
                    }
                    reject(e);
                }
            }
        );
    });
};

/**
 * Recursively processes formData to upload any File objects
 * Safety function to strip any remaining File objects or non-serializable data
 * This is the final gatekeeper before Firestore
 */
const deepSanitize = (obj, visited = new WeakSet()) => {
    if (obj === null || obj === undefined) return obj;

    // 1. Detect Event Objects (Common error: passing event instead of value)
    if (obj.preventDefault && typeof obj.preventDefault === 'function' &&
        obj.stopPropagation && typeof obj.stopPropagation === 'function') {
        console.warn("Sanitized a React/DOM Event object found in data.");
        return null;
    }

    // 2. Check for File/Blob
    if (obj instanceof File || obj instanceof Blob ||
        (typeof obj === 'object' && (obj.constructor?.name === 'File' || obj.constructor?.name === 'Blob'))) {
        console.warn("Sanitized a leftover File object:", obj.name);
        return null; // Nuke it
    }

    // 3. Prevent blob: strings from reaching Firestore
    if (typeof obj === 'string' && obj.startsWith('blob:')) {
        console.warn("Nuked a blob URL string before it hit Firestore.");
        return null;
    }

    // 4. Handle Arrays
    if (Array.isArray(obj)) {
        return obj.map(item => deepSanitize(item, visited));
    }

    // 5. Handle Objects
    if (typeof obj === 'object') {
        // Stop Circular References
        if (visited.has(obj)) {
            console.warn("Circular reference detected in formData. Removing.");
            return null;
        }
        visited.add(obj);

        // Keep Dates
        if (obj instanceof Date) return obj;

        const clone = {};
        for (const [key, val] of Object.entries(obj)) {
            const sanitizedVal = deepSanitize(val, visited);
            // Firestore does not accept undefined or null in a way that breaks queries if not careful.
            // But here we specifically want to avoid undefined.
            if (sanitizedVal !== undefined) {
                clone[key] = sanitizedVal;
            }
        }
        return clone;
    }

    return obj;
};

export const processFormData = async (uid, data) => {
    // 1. First pass: Try to upload Files
    const uploadedData = await processFormDataRecursive(uid, data);

    // 2. Second pass: Aggressively remove any File objects or blob URLs that failed to upload or were missed
    return deepSanitize(uploadedData);
};

// Original Logic moved to Internal Recursive Function
const processFormDataRecursive = async (uid, data) => {
    // 0. Safety/Base cases
    if (data === null || data === undefined) return data;

    // 1. Detect File/Blob (Strict Check)
    const isFile = data instanceof File ||
        (typeof data === 'object' && data.toString() === '[object File]') ||
        (data.constructor && data.constructor.name === 'File');

    if (isFile) {
        try {
            const url = await uploadFile(data, `familias/${uid}/uploads`);
            return url;
        } catch (e) {
            console.error("Upload failed in processFormData", e);
            return null;
        }
    }

    // 2. Arrays
    if (Array.isArray(data)) {
        return await Promise.all(data.map(async (item) => {
            // Specialized handling for our UploadWidget structure { file: File, ... }
            if (item && typeof item === 'object' && (item.file || item.preview?.startsWith('blob:'))) {
                const isItemFile = item.file && (item.file instanceof File ||
                    (item.file.constructor && item.file.constructor.name === 'File'));

                if (isItemFile) {
                    try {
                        const url = await uploadFile(item.file, `familias/${uid}/uploads`);
                        return {
                            ...item,
                            file: null, // Clear file object
                            url: url,
                            preview: url, // Replace blob with real URL
                            uploadedAt: new Date().toISOString()
                        };
                    } catch {
                        // Return valid object but without File or Blob preview
                        const { file: _, ...safeItem } = item;
                        if (safeItem.preview?.startsWith('blob:')) delete safeItem.preview;
                        return safeItem;
                    }
                } else if (item.preview?.startsWith('blob:') && !item.file) {
                    // It has a blob preview but no file object to upload? (Lost reference)
                    // This is dangerous, so we clean it.
                    const { preview: _, ...cleanItem } = item;
                    return cleanItem;
                }
            }
            // Generic recursion for array items
            return await processFormDataRecursive(uid, item);
        }));
    }

    // 3. Objects (Deep Traversal)
    if (typeof data === 'object') {
        if (data instanceof Date) return data;

        const processed = {};
        for (const [key, value] of Object.entries(data)) {
            processed[key] = await processFormDataRecursive(uid, value);
        }
        return processed;
    }

    // 4. Primitives
    return data;
};
