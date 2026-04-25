
import { initializeApp } from "firebase/app";
import { getStorage, ref, listAll } from "firebase/storage";

const firebaseConfig = {
    apiKey: "AIzaSyCXqnaH3oEjThDGoCeqMqAae2Qisppw7AA",
    authDomain: "album-familia-final.firebaseapp.com",
    projectId: "album-familia-final",
    storageBucket: "album-familia-final.firebasestorage.app",
    messagingSenderId: "456904076058",
    appId: "1:456904076058:web:7d8b5017c65eb198301aa3"
};

const app = initializeApp(firebaseConfig);
const storage = getStorage(app);

async function checkStorage() {
    console.log("Checking storage for both likely UIDs...");
    // dvisrael@gmail.com and marcia.rubinstein@hotmail.com
    const uids = ["1DyECP2wp9PJ3FjttzjlcQTIDc92", "ClUpAGJdTCNCjky5vJEq3vY6vmE2"];
    
    for (const uid of uids) {
        console.log(`\nUID: ${uid}`);
        try {
            const listRef = ref(storage, `users/${uid}`);
            const res = await listAll(listRef);
            
            console.log(`Found ${res.prefixes.length} folders.`);
            res.prefixes.forEach((folderRef) => {
                console.log(`- Folder: ${folderRef.name}`);
            });

            console.log(`Found ${res.items.length} files at root level.`);
            res.items.forEach((itemRef) => {
                console.log(`- File: ${itemRef.name}`);
            });
            
        } catch (e) {
            console.error(`Error checking UID ${uid}:`, e.message);
        }
    }
}

checkStorage();
