import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";

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

async function check() {
    try {
        const uid = '1DyECP2wp9PJ3FjttzjlcQTIDc92';
        const snapshot = await getDocs(collection(db, "familias", uid, "membros"));
        console.log(`COUNT_MEMBROS: ${snapshot.size}`);
        
        const archiveSnapshot = await getDocs(collection(db, "familias", uid, "arquivo_morto"));
        console.log(`COUNT_ARQUIVO: ${archiveSnapshot.size}`);
        
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

check();
