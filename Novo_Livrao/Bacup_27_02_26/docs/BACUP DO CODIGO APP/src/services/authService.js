import { auth, db } from './firebase';
import {
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    updateProfile,
    sendPasswordResetEmail
} from "firebase/auth";
import {
    doc,
    getDoc,
    setDoc,
    updateDoc,
    serverTimestamp
} from "firebase/firestore";
import { INITIAL_STATE } from '../constants/initial_state';
import { submitData } from './familyService';

// --- Helpers ---
const mapAuthError = (code) => {
    switch (code) {
        case 'auth/invalid-email': return 'E-mail inválido.';
        case 'auth/user-disabled': return 'Usuário desativado.';
        case 'auth/user-not-found': return 'Usuário não encontrado.';
        case 'auth/wrong-password': return 'Senha incorreta.';
        case 'auth/invalid-credential': return 'E-mail ou senha incorretos.';
        case 'auth/email-already-in-use': return 'Este e-mail já está em uso.';
        case 'auth/weak-password': return 'A senha é muito fraca.';
        default: return `Erro de autenticação(${code})`;
    }
};

/**
 * Autentica o usuário (Login)
 */
export const authenticateUser = async (email, password) => {
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // Busca dados do usuário no Firestore
        const userDocRef = doc(db, "familias", user.uid);
        const userSnap = await getDoc(userDocRef);

        let firestoreData = {};

        if (userSnap.exists()) {
            firestoreData = userSnap.data();
        } else {
            // AUTO-FIX: Se o usuário existe no Auth mas não no Firestore (apagado ou erro), recria o stub.
            console.warn("Usuário Auth sem registro Firestore. Recriando...");
            const newRecord = {
                ...INITIAL_STATE,
                uid: user.uid,
                id_unico: user.uid,
                repName: user.displayName || email.split('@')[0],
                email: email,
                role: 'member',
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
                status: 'Ativo'
            };

            await setDoc(userDocRef, newRecord);
            firestoreData = newRecord;
        }

        // Retorna status e dados relevantes para a sessão
        return {
            status: 'success',
            uid: user.uid,
            email: user.email,
            role: firestoreData.role || 'member',
            repName: firestoreData.repName || user.displayName || 'Representante',
            repPhone: firestoreData.repPhone || '',
            accountStatus: firestoreData.status || 'Ativo'
        };
    } catch (error) {
        console.error("Login Error:", error);
        return { status: 'error', message: mapAuthError(error.code) };
    }
};

/**
 * Registra novo usuário (Fluxo Admin ou Primeiro Acesso)
 */
export const registerUser = async (email, password, repName, role = 'member', additionalFields = {}) => {
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // Atualiza display name no Auth
        await updateProfile(user, { displayName: repName });

        // Cria documento inicial no Firestore com TODOS os 67 campos
        const userDocRef = doc(db, "familias", user.uid);

        const newRecord = {
            ...INITIAL_STATE,
            uid: user.uid, // Metadado técnico
            id_unico: user.uid, // Requisito: id_unico baseado no UID
            repName: repName,
            email: email, // Audit: Saving email to Firestore for Admin Panel visibility
            role: role,
            ...additionalFields,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            status: 'Ativo'
        };

        await setDoc(userDocRef, newRecord);

        return { status: 'success', uid: user.uid };
    } catch (error) {
        console.error("Register Error:", error);
        return { status: 'error', message: mapAuthError(error.code) };
    }
};

/**
 * Valida o Token de Convite (Chamado ao carregar /register?token=XYZ)
 */
export const validateInviteToken = async (token) => {
    console.log('[DEBUG] validateInviteToken chamado com token:', token);
    try {
        const inviteRef = doc(db, "invites", token);
        console.log('[DEBUG] inviteRef criado:', inviteRef.path);

        const inviteSnap = await getDoc(inviteRef);
        console.log('[DEBUG] inviteSnap recebido, exists:', inviteSnap.exists());

        if (!inviteSnap.exists()) {
            console.log('[DEBUG] Convite NÃO encontrado no Firebase');
            return { status: 'error', message: 'Convite não encontrado.' };
        }

        const data = inviteSnap.data();
        console.log('[DEBUG] Dados do convite:', JSON.stringify(data, null, 2));

        if (data.status === 'used') {
            console.log('[DEBUG] Convite já utilizado');
            return { status: 'error', message: 'Este convite já foi utilizado.' };
        }

        console.log('[DEBUG] Convite válido! Retornando success');
        return {
            status: 'success',
            data: {
                email: data.email,
                repName: data.repName,
                permission: data.permission,
                repPhone: data.repPhone,
                isTeamMember: data.isTeamMember,
                isRepresentative: data.isRepresentative
            }
        };

    } catch (error) {
        console.error("[DEBUG] Validate Invite Error:", error);
        console.error("[DEBUG] Error stack:", error.stack);
        return { status: 'error', message: 'Erro ao validar convite: ' + error.message };
    }
};

/**
 * Registra usuário vinculado a um convite
 */
export const registerUserWithInvite = async (token, email, password, repName, acceptTeamInvite = false) => {
    // 1. Valida novamente (segurança)
    const check = await validateInviteToken(token);
    if (check.status !== 'success') return check;

    // 2. Garante que o email bate com o do convite (Evitar fraude de link trocado)
    if (check.data.email !== email) {
        return { status: 'error', message: 'O email informado não corresponde ao convite.' };
    }

    // 3. Preparar dados estendidos (Admin/Papel)
    const additionalFields = {};
    if (check.data.isTeamMember && acceptTeamInvite) {
        additionalFields.adminRole = 'basic';
    }

    // Define papel principal
    const role = check.data.isRepresentative ? 'representative' : 'member';

    // 3. Cria usuário
    const result = await registerUser(email, password, repName, role, additionalFields);
    if (result.status === 'error') return result;

    // 3.1 Se houver telefone no convite, salva no perfil
    if (check.data.repPhone) {
        // Uses submitData from familyService (imported)
        await submitData(result.uid, { repPhone: check.data.repPhone });
    }

    // 4. Marca convite como usado
    try {
        const inviteRef = doc(db, "invites", token);
        await updateDoc(inviteRef, {
            status: 'used',
            usedBy: result.uid,
            usedAt: serverTimestamp()
        });
    } catch (err) {
        console.error("Failed to mark invite as used:", err);
        // Não vamos falhar o registro por isso, mas logamos
    }

    return result;
}

/**
 * Envia e-mail de redefinição de senha
 */
export const resetPassword = async (email) => {
    try {
        await sendPasswordResetEmail(auth, email);
        return { status: 'success', message: 'E-mail de redefinição enviado!' };
    } catch (error) {
        console.error("Reset Password Error:", error);
        return { status: 'error', message: mapAuthError(error.code) };
    }
};
