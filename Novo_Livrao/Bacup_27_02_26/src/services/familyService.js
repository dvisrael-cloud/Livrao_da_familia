import { db } from './firebase';
import { doc, setDoc, deleteDoc, collection, getDocs, serverTimestamp } from "firebase/firestore";

/**
 * Busca todos os membros familiares cadastrados
 */
export const fetchFamilyMembers = async (uid) => {
    if (!uid) return {};

    try {
        const membersRef = collection(db, "familias", uid, "membros");
        const snapshot = await getDocs(membersRef);

        const membersData = {};
        snapshot.forEach(doc => {
            const data = doc.data();
            // Calculate progress simply if not present
            if (!data.progress) {
                // Simple heuristic logic
                let filled = 0, total = 0;
                ['nomeCompleto', 'dataNascimento', 'localNascimento_pais'].forEach(f => {
                    total++;
                    if (data[f]) filled++;
                });
                data.progress = Math.round((filled / total) * 100);
            }

            // Assume doc.id is the role (papel) or data.relationshipInfo.papel
            const role = data.relationshipInfo?.papel || doc.id;
            membersData[role] = { ...data, name: data.nomeCompleto || role };
        });

        return membersData;
    } catch (e) {
        console.error("Error fetching family members:", e);
        return {};
    }
};

/**
 * Salva/Atualiza dados (Write) - REFACTORED to use Sub-collections
 */
import { processFormData } from './storageService';

/**
 * Salva/Atualiza dados (Write) - REFACTORED to use Sub-collections
 */
export const submitData = async (uid, formData) => {
    try {
        if (!uid) throw new Error("Usuário não autenticado.");

        // 0. Process Uploads (File Objects -> URLs)
        // This ensures no "File" objects are sent to Firestore
        const cleanData = await processFormData(uid, formData);

        // DEBUG: Inspect the data before Firestore
        console.log("Data ready for Firestore:", cleanData);

        const role = cleanData.relationshipInfo?.papel;

        // 1. If it's a family member data, save to Sub-collection
        if (role) {
            const memberRef = doc(db, "familias", uid, "membros", role);

            await setDoc(memberRef, {
                ...cleanData,
                lastUpdated: new Date().toISOString()
            }, { merge: true });

            // 2. Update Parent Document with Audit & Metadata
            const userRef = doc(db, "familias", uid);
            await setDoc(userRef, {
                lastActivity: serverTimestamp(),
                ...(cleanData.repPhone ? { repPhone: cleanData.repPhone } : {})
            }, { merge: true });

        } else {
            // 3. If no role (e.g. just user profile update), save to Root
            const docRef = doc(db, "familias", uid);
            await setDoc(docRef, {
                ...cleanData,
                lastUpdated: new Date().toISOString()
            }, { merge: true });
        }

        return { status: 'success', message: 'Dados salvos com sucesso!' };
    } catch (error) {
        console.error("Save Data Error - Complete Details:", {
            message: error.message,
            code: error.code,
            fullError: error
        });
        return { status: 'error', message: `Erro ao salvar dados: ${error.message} ` };
    }
};

/**
 * Exclui um membro da família (Sub-coleção)
 */
export const deleteFamilyMember = async (uid, role) => {
    try {
        if (!uid || !role) throw new Error("Parâmetros inválidos.");

        const memberRef = doc(db, "familias", uid, "membros", role);
        await deleteDoc(memberRef);

        return { status: 'success' };
    } catch (error) {
        console.error("Delete Error:", error);
        return { status: 'error', message: error.message };
    }
};
