import { initializeApp } from "firebase/app";
import {
    initializeFirestore,
    CACHE_SIZE_UNLIMITED,
    connectFirestoreEmulator
} from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";

// CONFIGURAÇÃO DO FIREBASE
// Substitua pelas chaves do seu projeto no Firebase Console (Ver Guia de Ativação)
const firebaseConfig = {
    apiKey: "AIzaSyCXqnaH3oEjThDGoCeqMqAae2Qisppw7AA",
    authDomain: "album-familia-final.firebaseapp.com",
    projectId: "album-familia-final", // ID FIXO PARA SINCRONIA TOTAL
    storageBucket: "album-familia-final.firebasestorage.app",
    messagingSenderId: "456904076058",
    appId: "1:456904076058:web:7d8b5017c65eb198301aa3"
};

// Inicializa Firebase de forma segura
let app, db, auth, storage;

try {
    // Validação básica para não quebrar a tela branca
    if (!firebaseConfig.apiKey || firebaseConfig.apiKey === "DEMO_API_KEY_FOR_UI_TESTING") {
        console.warn("Firebase Config missing or in demo mode. App running in UI-only mode.");
        // Se quiser que funcione parcialmente ou mockado, precisaríamos de mocks.
        // Por enquanto, tentamos inicializar mesmo assim se for DEMO, ou lançamos erro controlado.
        if (!firebaseConfig.apiKey) throw new Error("Missing API Key");
    }

    app = initializeApp(firebaseConfig);

    // Inicializa Firestore com configurações para persistência offline e cache
    db = initializeFirestore(app, {
        cacheSizeBytes: CACHE_SIZE_UNLIMITED
    });

    /* COMENTADO PARA VOLTAR À NUVEM (PRODUÇÃO)
    if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
        connectFirestoreEmulator(db, '127.0.0.1', 8080);
        console.log("🛡️ FIREBASE EMULADOR ATIVADO COM SUCESSO!");
    }
    */

    // Habilita Persistência Offline
    /* OFF FOR DEBUGGING - PREVENTS MULTI-TAB LOCKS
    enableIndexedDbPersistence(db)
        .catch((err) => {
            console.warn('Persistência falhou:', err.code);
        });
    */

    // Inicializa Auth e Storage
    auth = getAuth(app);
    storage = getStorage(app);

} catch (e) {
    console.error("Erro na inicialização do Firebase:", e);
    // Mocks para evitar crash do React
    app = {};
    db = {};
    auth = {};
    storage = {};
}

export { db, auth, storage };
