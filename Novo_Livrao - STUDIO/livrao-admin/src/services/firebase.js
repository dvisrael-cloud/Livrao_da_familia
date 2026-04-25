import { initializeApp } from "firebase/app";
import {
    getFirestore,
    initializeFirestore,
    CACHE_SIZE_UNLIMITED
} from "firebase/firestore";
import { getAuth } from "firebase/auth";

// CONFIGURAÇÃO DO FIREBASE
// Mesma configuração do App Principal
const firebaseConfig = {
    apiKey: "AIzaSyCXqnaH3oEjThDGoCeqMqAae2Qisppw7AA",
    authDomain: "album-familia-final.firebaseapp.com",
    projectId: "album-familia-final",
    storageBucket: "album-familia-final.firebasestorage.app",
    messagingSenderId: "456904076058",
    appId: "1:456904076058:web:7d8b5017c65eb198301aa3"
};

let app, db, auth;

try {
    app = initializeApp(firebaseConfig);
    db = initializeFirestore(app, {
        cacheSizeBytes: CACHE_SIZE_UNLIMITED
    });
    auth = getAuth(app);
} catch (e) {
    console.error("Erro na inicialização do Firebase Admin:", e);
}

export { db, auth };
