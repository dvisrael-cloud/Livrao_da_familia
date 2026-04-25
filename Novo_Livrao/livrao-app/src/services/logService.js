/**
 * LIVRÃO DA FAMÍLIA — logService.js
 * Motor de Telemetria Centralizado.
 *
 * Grava events na coleção `system_logs` do Firestore.
 * Estrutura de cada documento:
 * {
 *   timestamp: serverTimestamp(),
 *   type: 'INFO' | 'ERROR' | 'WARN',
 *   module: string,        // ex: 'RegisterForm', 'Gallery', 'Upload'
 *   message: string,       // descrição humana do evento
 *   userEmail: string|null,
 *   metadata: {            // dados extras opcionais
 *     errorCode?: string,
 *     action?: string,
 *     fileName?: string,
 *     [key: string]: any
 *   }
 * }
 *
 * USO:
 *   import { logEvent } from '../../services/logService';
 *   await logEvent('INFO', 'RegisterForm', 'Cadastro realizado com sucesso', userEmail);
 *   await logEvent('ERROR', 'Gallery', 'Upload falhou', userEmail, { errorCode: err.code, fileName: file.name });
 */

import { db } from './firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

const LOGS_COLLECTION = 'system_logs';

/**
 * Grava um log de sistema no Firestore (fire-and-forget seguro).
 *
 * @param {'INFO'|'ERROR'|'WARN'} type  - Nível do log
 * @param {string}  module              - Módulo/componente de origem
 * @param {string}  message             - Descrição do evento
 * @param {string|null} userEmail       - E-mail do usuário (ou null)
 * @param {object}  [metadata={}]       - Dados extras (errorCode, action, fileName...)
 * @returns {Promise<void>}
 */
export const logEvent = async (type, module, message, userEmail = null, metadata = {}) => {
    try {
        await addDoc(collection(db, LOGS_COLLECTION), {
            timestamp: serverTimestamp(),
            type: type || 'INFO',
            module: module || 'unknown',
            message: message || '',
            userEmail: userEmail || null,
            metadata: {
                ...metadata,
                userAgent: typeof navigator !== 'undefined'
                    ? navigator.userAgent.slice(0, 200) // Truncate for storage safety
                    : 'unknown',
                url: typeof window !== 'undefined'
                    ? window.location.pathname
                    : 'unknown'
            }
        });
    } catch (firestoreErr) {
        // Silencioso: logging nunca deve quebrar a UI principal
        console.warn('[logService] Falha ao gravar log:', firestoreErr.message);
    }
};

/**
 * Atalho para logs de ERRO com captura automática do Error object.
 *
 * @param {string}  module
 * @param {string}  action  - O que estava sendo feito (ex: 'upload_foto', 'delete_galeria')
 * @param {Error}   error
 * @param {string|null} userEmail
 * @param {string}  [fileName]  - Nome do arquivo se aplicável
 */
export const logError = async (module, action, error, userEmail = null, fileName = null) => {
    const metadata = {
        action,
        errorCode: error?.code || 'unknown',
        errorMessage: error?.message || String(error)
    };
    if (fileName) metadata.fileName = fileName;
    await logEvent('ERROR', module, `[${action}] ${error?.message || String(error)}`, userEmail, metadata);
};
