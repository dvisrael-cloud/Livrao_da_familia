
import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";
import fs from 'fs';

// Configuração do PROJETO ANTIGO
const oldConfig = {
    apiKey: "AIzaSyBdornA9uXZP68XqkTYEl6SmqGkdeITY6o",
    authDomain: "livrao-familia-producao-3d41a.firebaseapp.com",
    projectId: "livrao-familia-producao-3d41a",
    storageBucket: "livrao-familia-producao-3d41a.firebasestorage.app",
    messagingSenderId: "678229413328",
    appId: "1:678229413328:web:6be2d4603d83c3b439fdd5"
};

// Inicializa Firebase no Node.js
const app = initializeApp(oldConfig);
const db = getFirestore(app);

async function runBackup() {
    console.log("🚀 Iniciando Resgate Profundo via Terminal...");

    try {
        const familiasRef = collection(db, "familias");
        const familiasSnap = await getDocs(familiasRef);

        console.log(`📦 Encontradas ${familiasSnap.size} famílias.`);

        let allData = [];
        let membersCount = 0;

        for (const famDoc of familiasSnap.docs) {
            const famData = famDoc.data();

            // Adiciona Família
            allData.push({
                type: 'familia',
                id: famDoc.id,
                data: famData
            });

            // Busca Membros dessa Família
            const membrosRef = collection(db, "familias", famDoc.id, "membros");
            const membrosSnap = await getDocs(membrosRef);

            if (!membrosSnap.empty) {
                console.log(`   -> Família ${famData.repName || famDoc.id}: ${membrosSnap.size} membros encontrados.`);
                membrosSnap.forEach(memDoc => {
                    allData.push({
                        type: 'membro',
                        parentId: famDoc.id,
                        id: memDoc.id,
                        data: memDoc.data()
                    });
                    membersCount++;
                });
            }
        }

        const filename = '../BACKUP_COMPLETO_VIA_TERMINAL.json'; // Salva na raiz
        fs.writeFileSync(filename, JSON.stringify(allData, null, 2));

        console.log("\n✅ SUCESSO TOTAL!");
        console.log(`📊 Famílias: ${familiasSnap.size}`);
        console.log(`👤 Membros: ${membersCount}`);
        console.log(`💾 Arquivo salvo na raiz: BACKUP_COMPLETO_VIA_TERMINAL.json`);

    } catch (error) {
        console.error("❌ Erro fatal:", error);
    }

    process.exit();
}

runBackup();
