const { initializeApp } = require("firebase/app");
const { getFirestore, collection, getDocs } = require("firebase/firestore");

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
    console.log("Checking known collections in album-familia-final...");
    const collections = ['familias', 'membros', 'usuarios', 'users', 'family', 'members'];
    
    for (const collName of collections) {
        try {
            const snap = await getDocs(collection(db, collName));
            console.log(`Collection '${collName}': ${snap.size} documents found.`);
            if (snap.size > 0) {
                snap.docs.slice(0, 5).forEach(doc => {
                    const data = doc.data();
                    console.log(` - Doc: ${doc.id} | Name: ${data.repName || data.nomeCompleto || data.fullName || 'N/A'}`);
                });
            }
        } catch (e) {
            console.log(`Collection '${collName}': Error (${e.message})`);
        }
    }
}

check();
