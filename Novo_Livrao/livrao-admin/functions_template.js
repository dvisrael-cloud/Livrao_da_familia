/**
 * CLOUD FUNCTIONS TEMPLATE (Fase 4)
 * Instruções:
 * 1. Inicialize functions no terminal: 'firebase init functions'
 * 2. Instale dependências se necessário: 'npm install firebase-admin firebase-functions'
 * 3. Substitua o conteúdo de 'functions/index.js' por este código.
 */

const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();

/**
 * 1. Sincronização de E-mail (Admin Triggered)
 * Permite que um Admin Master altere o e-mail de Login (Auth) de um usuário
 * Chamada no Front: const syncEmail = httpsCallable(functions, 'syncUserEmail');
 */
exports.syncUserEmail = functions.https.onCall(async (data, context) => {
    // Verificação de Segurança
    if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Requer login.');

    // Verificar se quem chama é Master
    const callerId = context.auth.uid;
    const callerDoc = await admin.firestore().collection('familias').doc(callerId).get();

    // Verifica se é Master ou se o próprio usuário está tentando (não permitido aqui, só Master)
    if (!callerDoc.exists || callerDoc.data().adminRole !== 'master') {
        throw new functions.https.HttpsError('permission-denied', 'Apenas Master pode alterar e-mails de sistema.');
    }

    const { targetUid, newEmail } = data;
    if (!targetUid || !newEmail) {
        throw new functions.https.HttpsError('invalid-argument', 'UID e Novo Email são obrigatórios.');
    }

    try {
        // Atualiza no Firebase Auth
        await admin.auth().updateUser(targetUid, { email: newEmail });

        // Opcional: Atualizar no Firestore também para garantir consistência
        await admin.firestore().collection('familias').doc(targetUid).update({ email: newEmail });

        return { success: true, message: `E-mail alterado para ${newEmail} com sucesso.` };
    } catch (error) {
        console.error("Erro ao alterar email:", error);
        throw new functions.https.HttpsError('internal', error.message);
    }
});

/**
 * 2. Limpeza de Convites Expirados (Agendado)
 * Roda todo dia à meia-noite para invalidar convites pendentes > 7 dias
 * Requer Cloud Scheduler habilitado no projeto.
 */
exports.cleanupInvites = functions.pubsub.schedule('every 24 hours').timeZone('America/Sao_Paulo').onRun(async (context) => {
    // Data de corte: 7 dias atrás
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 7);

    // Se você tiver um campo 'createdAt' (Timestamp) nos convites:
    // Nota: O código atual cria convites com token mas não vi 'createdAt' explícito no createInvite.
    // Recomendação: Adicionar 'createdAt: serverTimestamp()' no createInvite do api.js

    try {
        const snapshot = await admin.firestore().collection('invites')
            .where('status', '==', 'pending')
            // .where('createdAt', '<', cutoffDate) // Descomente quando tiver o campo
            .get();

        const batch = admin.firestore().batch();
        let count = 0;

        snapshot.docs.forEach(doc => {
            const data = doc.data();
            // Fallback se não tiver createdAt no banco: checa se tem timestamp no ID ou ignora
            // Aqui assumimos que vamos expirar todos pendentes antigos se filtrar por data.

            // Exemplo simples: marca como expirado
            if (data.createdAt && data.createdAt.toDate() < cutoffDate) {
                batch.update(doc.ref, { status: 'expired' });
                count++;
            }
        });

        if (count > 0) {
            await batch.commit();
            console.log(`Rotina de Limpeza: ${count} convites expirados.`);
        }
    } catch (e) {
        console.error("Erro na limpeza de convites:", e);
    }
    return null;
});
