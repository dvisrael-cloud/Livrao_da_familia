
import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc, collection, getDocs, setDoc } from "firebase/firestore";

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

async function checkAndResetMarcia() {
    const uid = "ClUpAGJdTCNCjky5vJEq3vY6vmE2";
    console.log(`Checking UID: ${uid}`);

    try {
        const userRef = doc(db, "familias", uid);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
            console.log("Marcia's Main Document Exists:", userSnap.data());
        } else {
            console.log("Marcia's Main Document is MISSING. We need to recreate it.");
        }

        const membersRef = collection(db, "familias", uid, "membros");
        const membersSnap = await getDocs(membersRef);
        console.log(`Found ${membersSnap.size} members in subcollection.`);
        
        membersSnap.forEach(m => {
             console.log(`- Member: ${m.id}`, m.data());
        });

    } catch (e) {
        console.error("Error:", e.message);
    }
}

checkAndResetMarcia();
