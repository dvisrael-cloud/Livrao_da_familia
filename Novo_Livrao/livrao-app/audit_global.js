import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

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

async function runAudit() {
    console.log("Iniciando auditoria global...");
    const familiasSnapshot = await getDocs(collection(db, "familias"));
    
    let totalFamiliesWithMembers = 0;
    let totalMembers = 0;
    let legacyLinks = [];
    let phantomLinks = [];
    let missingRoles = [];
    
    for (const d of familiasSnapshot.docs) {
        const familyId = d.id;
        const membrosSnapshot = await getDocs(collection(db, "familias", familyId, "membros"));
        
        if (membrosSnapshot.empty) continue;
        
        totalFamiliesWithMembers++;
        const activeUUIDs = new Set(membrosSnapshot.docs.map(doc => doc.id));
        
        let familyLegacy = 0;
        
        for (const mDoc of membrosSnapshot.docs) {
            totalMembers++;
            const data = mDoc.data();
            const docId = mDoc.id;
            
            const nome = data.nomeCompleto || data.name || docId;
            const vinculoId = data.vinculoFamiliarId || "";
            // Buscar na raiz ou dentro de relationshipInfo
            const papel = data.relationshipInfo?.papel || data.papel || "";
            const parentesco = data.relationshipInfo?.parentesco || data.parentesco || "";
            const pai = data.pai || "";
            const mae = data.mae || "";
            
            // 1. Legados
            if (!vinculoId && (pai || mae || parentesco)) {
                legacyLinks.push({ familyId, nome, pai, mae, parentesco });
                familyLegacy++;
            }
            
            // 2. Fantasmas
            if (vinculoId && !activeUUIDs.has(vinculoId)) {
                phantomLinks.push({ familyId, nome, vinculoId });
            }
            
            // 3. Sem Papel Definido
            if (!papel && !parentesco) {
                missingRoles.push({ familyId, nome });
            }
        }
    }
    
    console.log("================ RELATÓRIO GLOBAL ================");
    console.log(`Famílias com Membros   : ${totalFamiliesWithMembers}`);
    console.log(`Total de Membros       : ${totalMembers}`);
    console.log(`Vínculos Legados       : ${legacyLinks.length}`);
    console.log(`Vínculos Fantasmas     : ${phantomLinks.length}`);
    console.log(`Membros Sem Papel      : ${missingRoles.length}`);
    
    // Contagem de legados por família
    const familiesWithLegacy = {};
    for (const l of legacyLinks) {
        familiesWithLegacy[l.familyId] = (familiesWithLegacy[l.familyId] || 0) + 1;
    }
    console.log("\n--- Distribuição de Legados por Família ---");
    for (const [fId, count] of Object.entries(familiesWithLegacy)) {
        console.log(`Família ${fId}: ${count} legados`);
    }

    console.log("\n--- IDs Fantasmas Críticos ---");
    for (const p of phantomLinks) {
        console.log(`Família ${p.familyId} | ${p.nome} aponta para -> ${p.vinculoId}`);
    }
    
    // Save details to a file for review without cluttering console
    import('fs').then(fs => {
        fs.writeFileSync('audit_report.json', JSON.stringify({ legacyLinks, phantomLinks, missingRoles }, null, 2));
    });
    
    process.exit(0);
}

runAudit().catch(console.error);
