import { storage } from './firebase';
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

/**
 * Uploads a single file to Firebase Storage
 * @param {File} file - The file object to upload
 * @param {string} path - The storage path (e.g. 'familias/uid/uploads')
 * @returns {Promise<string>} - The download URL
 */
export const uploadFile = async (file, path) => {
    if (!file) return null;

    // Create a reference (add timestamp to avoid overwrites)
    const storageRef = ref(storage, `${path}/${Date.now()}_${file.name}`);

    // Upload
    await uploadBytes(storageRef, file);

    // Get URL
    return await getDownloadURL(storageRef);
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

    // 3. Handle Arrays
    if (Array.isArray(obj)) {
        return obj.map(item => deepSanitize(item, visited));
    }

    // 4. Handle Objects
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
            // Firestore does not accept undefined. Skip key if undefined.
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

    // 2. Second pass: Aggressively remove any File objects that failed to upload or were missed
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
            if (item && typeof item === 'object' && item.file) {
                const isItemFile = item.file instanceof File ||
                    (item.file.constructor && item.file.constructor.name === 'File');

                if (isItemFile) {
                    try {
                        const url = await uploadFile(item.file, `familias/${uid}/uploads`);
                        return {
                            ...item,
                            file: null,
                            url: url,
                            preview: url,
                            uploadedAt: new Date().toISOString()
                        };
                    } catch (e) {
                        // Return valid object but without File
                        const { file, ...safeItem } = item;
                        return safeItem;
                    }
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
