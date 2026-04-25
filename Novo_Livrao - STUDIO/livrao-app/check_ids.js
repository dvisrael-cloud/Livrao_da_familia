
import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";

// Configuração do PROJETO NOVO
const firebaseConfig = {
    apiKey: "AIzaSyCXqnaH3oEjThDGoCeqMqAae2Qisppw7AA",
    authDomain: "album-familia-final.firebaseapp.com",
    projectId: "album-familia-final",
    storageBucket: "album-familia-final.firebasestorage.app",
    messagingSenderId: "456904076058",
    appId: "1:456904076058:web:7d8b5017c65eb198301aa3"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function checkIDs() {
    console.log("🔍 Verificando Famílias no Banco...");
    const snap = await getDocs(collection(db, "familias"));

    console.log(`\nEncontrados ${snap.size} registros:`);
    console.log("---------------------------------------------------");
    console.log("ID (Gaveta)                      | Email (Quem deve ser)");
    console.log("---------------------------------------------------");

    snap.forEach(doc => {
        const d = doc.data();
        console.log(`${doc.id.padEnd(32)} | ${d.email || d.repEmail || 'Sem Email'}`);
    });
    console.log("---------------------------------------------------");
    process.exit();
}

checkIDs();
