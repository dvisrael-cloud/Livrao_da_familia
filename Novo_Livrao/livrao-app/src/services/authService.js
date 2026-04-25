import { auth, db } from './firebase';
import {
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    updateProfile,
    sendPasswordResetEmail,
    updatePassword,
    reauthenticateWithCredential,
    EmailAuthProvider
} from "firebase/auth";
import {
    doc,
    getDoc,
    setDoc,
    updateDoc,
    serverTimestamp
} from "firebase/firestore";
import { INITIAL_STATE } from '../constants/initial_state';
import { updateAccountData } from './profileService';

// --- Helpers ---
const mapAuthError = (code) => {
    if (!code) return 'Erro inesperado de autenticação. Tente novamente mais tarde ou verifique sua conexão.';
    switch (code) {
        case 'auth/invalid-email': return 'E-mail inválido.';
        case 'auth/user-disabled': return 'Usuário desativado.';
        case 'auth/user-not-found': return 'Usuário não encontrado.';
        case 'auth/wrong-password': return 'Senha incorreta.';
        case 'auth/invalid-credential': return 'E-mail ou senha incorretos.';
        case 'auth/email-already-in-use': return 'Este e-mail já está em uso.';
        case 'auth/weak-password': return 'A senha é muito fraca.';
        default: return `Erro de autenticação (${code || 'desconhecido'})`;
    }
};

/**
 * Autentica o usuário (Login)
 */
export const authenticateUser = async (email, password) => {
    if (!email || email.trim() === '') {
        return { status: 'error', message: 'Por favor, insira um e-mail válido.', data: null };
    }
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
            message: 'Login realizado com sucesso',
            data: {
                uid: user.uid,
                email: user.email,
                role: firestoreData.role || 'member',
                repName: firestoreData.repName || user.displayName || 'Representante',
                repPhone: firestoreData.repPhone || '',
                accountStatus: firestoreData.status || 'Ativo'
            }
        };
    } catch (error) {
        console.error("Login Error:", error);
        return { status: 'error', message: mapAuthError(error.code), data: null };
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

        return { status: 'success', message: 'Usuário registrado com sucesso', data: { uid: user.uid } };
    } catch (error) {
        console.error("Register Error:", error);
        return { status: 'error', message: mapAuthError(error.code), data: null };
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
            return { status: 'error', message: 'Convite não encontrado.', data: null };
        }

        const data = inviteSnap.data();
        console.log('[DEBUG] Dados do convite:', JSON.stringify(data, null, 2));

        // Helper: registra tentativa no documento do convite (fire-and-forget)
        const recordAttempt = (result) => {
            try {
                updateDoc(inviteRef, {
                    lastAttempt: {
                        timestamp: serverTimestamp(),
                        result,
                        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown'
                    },
                    attemptCount: (data.attemptCount || 0) + 1
                });
            } catch (_) { /* silencioso */ }
        };

        if (data.status === 'used') {
            console.log('[DEBUG] Convite já utilizado');
            recordAttempt('already_used');
            return { status: 'error', message: 'Este convite já foi utilizado.', data: null };
        }

        // Verificar expiração: convites expiram 7 dias após createdAt
        if (data.createdAt) {
            const createdAt = data.createdAt.toDate ? data.createdAt.toDate() : new Date(data.createdAt);
            const expiresAt = new Date(createdAt);
            expiresAt.setDate(expiresAt.getDate() + 7);
            if (new Date() > expiresAt) {
                console.log('[DEBUG] Convite expirado em:', expiresAt);
                recordAttempt('expired');
                return { status: 'error', message: 'Este convite expirou. Por favor, solicite um novo convite ao administrador.', data: null };
            }
        }

        console.log('[DEBUG] Convite válido! Retornando success');
        recordAttempt('success');
        return {
            status: 'success',
            message: 'Convite válido',
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
 * Verifica o status de um token de convite SEM side effects (sem gravar tentativas).
 * Usado exclusivamente para roteamento inteligente na entrada do app.
 *
 * @returns {{ tokenStatus: 'pending'|'used'|'expired'|'invalid'|'error', email?, repName?, message }}
 */
export const checkInviteStatus = async (token) => {
    if (!token || token.trim() === '') {
        return { tokenStatus: 'invalid', message: 'Token ausente ou inválido.' };
    }
    try {
        const inviteRef = doc(db, "invites", token.trim());
        const inviteSnap = await getDoc(inviteRef);

        if (!inviteSnap.exists()) {
            return { tokenStatus: 'invalid', message: 'Convite não encontrado. O link pode estar incorreto.' };
        }

        const data = inviteSnap.data();

        if (data.status === 'used') {
            return {
                tokenStatus: 'used',
                email: data.email || null,
                repName: data.repName || null,
                message: 'Este convite já foi utilizado. Faça login com o e-mail cadastrado.'
            };
        }

        // Verificar expiração (7 dias a partir de createdAt)
        if (data.createdAt) {
            const createdAt = data.createdAt.toDate ? data.createdAt.toDate() : new Date(data.createdAt);
            const expiresAt = new Date(createdAt);
            expiresAt.setDate(expiresAt.getDate() + 7);
            if (new Date() > expiresAt) {
                return {
                    tokenStatus: 'expired',
                    message: `Este convite expirou em ${expiresAt.toLocaleDateString('pt-BR')}. Solicite um novo convite ao administrador.`
                };
            }
        }

        // Token válido e pendente
        return {
            tokenStatus: 'pending',
            email: data.email || null,
            repName: data.repName || null,
            message: 'Convite válido.'
        };

    } catch (error) {
        console.error('[checkInviteStatus] Erro:', error.message);
        return { tokenStatus: 'error', message: 'Erro ao verificar convite. Verifique sua conexão.' };
    }
};

/**
 * Registra usuário vinculado a um convite
 */
export const registerUserWithInvite = async (token, email, password, repName, acceptTeamInvite = false) => {
    // 1. Valida novamente (segurança)
    const check = await validateInviteToken(token);
    if (check.status !== 'success') return { ...check, data: null };

    // 2. Garante que o email bate com o do convite (Evitar fraude de link trocado)
    if (check.data.email !== email) {
        return { status: 'error', message: 'O email informado não corresponde ao convite.', data: null };
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
    if (result.status === 'error') return { ...result, data: null };

    // 3.1 Se houver telefone no convite, salva no perfil
    if (check.data.repPhone) {
        // CORREÇÃO: Salva no perfil da conta (familias/{uid}), não na subcoleção de membros
        await updateAccountData(result.data.uid, { repPhone: check.data.repPhone });
    }

    // 4. Marca convite como usado
    try {
        const inviteRef = doc(db, "invites", token);
        await updateDoc(inviteRef, {
            status: 'used',
            usedBy: result.data.uid,
            usedAt: serverTimestamp()
        });
    } catch (err) {
        console.error("Failed to mark invite as used:", err);
        // Não vamos falhar o registro por isso, mas logamos
    }

    return { ...result, message: 'Usuário registrado com convite', data: { uid: result.data?.uid || result.uid } };
}

/**
 * Envia e-mail de redefinição de senha
 */
export const resetPassword = async (email) => {
    try {
        await sendPasswordResetEmail(auth, email);
        return { status: 'success', message: 'E-mail de redefinição enviado!', data: null };
    } catch (error) {
        console.error("Reset Password Error:", error);
        return { status: 'error', message: mapAuthError(error.code), data: null };
    }
};

/**
 * Troca a senha do usuário logado.
 * Exige senha atual para reautenticar antes de atualizar (regra de segurança do Firebase).
 *
 * @param {string} currentPassword - Senha atual do usuário
 * @param {string} newPassword     - Nova senha (mín. 6 chars)
 * @returns {{ status: 'success'|'error', message: string }}
 */
export const changePassword = async (currentPassword, newPassword) => {
    try {
        const user = auth.currentUser;
        if (!user) return { status: 'error', message: 'Nenhum usuário autenticado.' };
        if (!user.email) return { status: 'error', message: 'Usuário sem e-mail associado.' };
        if (newPassword.length < 6) return { status: 'error', message: 'A nova senha deve ter pelo menos 6 caracteres.' };

        // Reautenticar antes de trocar a senha (exigência do Firebase)
        const credential = EmailAuthProvider.credential(user.email, currentPassword);
        await reauthenticateWithCredential(user, credential);

        await updatePassword(user, newPassword);
        return { status: 'success', message: 'Senha atualizada com sucesso!' };
    } catch (error) {
        console.error('changePassword Error:', error);
        return { status: 'error', message: mapAuthError(error.code) };
    }
};
