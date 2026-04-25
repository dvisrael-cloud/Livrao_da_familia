import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, listCollections } from "firebase/firestore";

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

// Note: listCollections is only available in Admin SDK or through special APIs in Web SDK 
// depending on version/environment. In web SDK it's usually not available.
// I will try to list documents in 'familias' and check for sub-collections manually if possible,
// or check for other known collections.

async function check() {
    console.log("Checking known collections...");
    const collections = ['familias', 'users', 'membros', 'profiles', 'accounts', 'families'];
    
    for (const collName of collections) {
        try {
            const snap = await getDocs(collection(db, collName));
            console.log(`Collection '${collName}': ${snap.size} documents found.`);
            if (snap.size > 0) {
                snap.forEach(doc => {
                    const data = doc.data();
                    console.log(` - Doc: ${doc.id} | Email: ${data.email || data.repEmail || 'N/A'} | Name: ${data.repName || data.nomeCompleto || data.fullName || 'N/A'}`);
                });
            }
        } catch (e) {
            console.log(`Collection '${collName}': Error or not found (${e.message})`);
        }
    }
}

check();
