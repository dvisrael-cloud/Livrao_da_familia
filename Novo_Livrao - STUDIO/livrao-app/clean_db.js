
import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, deleteDoc, doc } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyCXqnaH3oEjThDGoCeqMqAae2Qisppw7AA",
    authDomain: "album-familia-final.firebaseapp.com",
    projectId: "album-familia-final",
    storageBucket: "album-familia-final.firebasestorage.app",
    messagingSenderId: "456904076058",
    appId: "1:456904076058:web:7d8b5017c65eb198301aa3"
};

// Inicializa Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function nukeDatabase() {
    console.log("☢️  INICIANDO OPERAÇÃO FAXINA...");

    try {
        const ref = collection(db, "familias");
        const snap = await getDocs(ref);

        console.log(`🗑️  Encontradas ${snap.size} famílias/registros para deletar.`);

        // Deletar em lotes (Promises)
        const deletePromises = snap.docs.map(d => deleteDoc(doc(db, "familias", d.id)));

        await Promise.all(deletePromises);

        console.log("✨ LIMPEZA CONCLUÍDA! O banco 'familias' está zerado.");

    } catch (error) {
        console.error("❌ Erro na faxina:", error);
    }

    process.exit();
}

nukeDatabase();
