import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import admin from 'firebase-admin';
const { credential } = admin;

// Initialize Admin SDK with Application Default Credentials
// Isso assume que o gcloud ou firebase CLI está autenticado como deployer
const app = initializeApp({
    credential: credential.applicationDefault(),
    projectId: "album-familia-final"
});
const db = getFirestore(app);

async function healDatabase() {
    console.log("🏥 Iniciando Operação Cicatriz Zero...");
    const familiasSnapshot = await db.collection("familias").get();
    
    let totalMigrated = 0;
    let totalPhantomsHealed = 0;
    let totalRolesFixed = 0;

    for (const d of familiasSnapshot.docs) {
        const familyId = d.id;
        const membrosRef = db.collection("familias").doc(familyId).collection("membros");
        const membrosSnapshot = await membrosRef.get();
        if (membrosSnapshot.empty) continue;
        
        console.log(`\n🔍 Analisando Família: ${familyId}`);
        
        // 1. Criar Mapeamento Nome -> UUID
        const nameToId = {};
        const activeUUIDs = new Set();
        
        for (const mDoc of membrosSnapshot.docs) {
            const data = mDoc.data();
            activeUUIDs.add(mDoc.id);
            const nome = data.nomeCompleto || data.name || data.id;
            if (nome) {
                // Normaliza o nome para busca fácil
                nameToId[nome.toLowerCase().trim()] = mDoc.id;
            }
        }
        
        // Função auxiliar para achar ID pelo nome
        const findIdByName = (searchName) => {
            if (!searchName) return null;
            return nameToId[searchName.toLowerCase().trim()] || null;
        };

        // Identificar líderes comuns assumidos para essa base se o vinculo faltar
        // Padrão do Livrão: "David Vidal Israel" é a cabeça de 1DyECP...
        const mainLeaderId = findIdByName("David Vidal Israel") || d.id; 
        const motherId = findIdByName("Julia Cohen Israel");
        const fatherId = findIdByName("David José Israel");

        // 2. Passar curando registros
        for (const mDoc of membrosSnapshot.docs) {
            const data = mDoc.data();
            const docId = mDoc.id;
            let updates = {};
            
            const nome = data.nomeCompleto || data.name || docId;
            const vinculoId = data.vinculoFamiliarId || "";
            let papel = data.relationshipInfo?.papel || data.papel || "";
            let parentesco = data.relationshipInfo?.parentesco || data.parentesco || "";
            
            // --- CURA DE VÍNCULOS LEGADOS (Membros sem UUID mas com parentesco) ---
            if (!vinculoId) {
                let newAnchorId = null;
                const normalizeP = (parentesco || "").toLowerCase();
                
                // Mapeamento heurístico guiado pelo parentesco textual
                if (normalizeP.includes("karla")) {
                    newAnchorId = findIdByName("Karla Petruccelli Israel");
                } else if (normalizeP.includes("materno") && motherId) {
                    newAnchorId = motherId;
                } else if (normalizeP.includes("paterno") && fatherId) {
                    newAnchorId = fatherId;
                } else if (normalizeP.includes("cônjuge") || normalizeP.includes("madrasta") || normalizeP.includes("irmão")) {
                    newAnchorId = mainLeaderId; // Liga no tronco se for cônjuge/irmão do dono
                }

                if (newAnchorId) {
                    console.log(`[LEGADO] ${nome}: Ancora atualizada para -> ${newAnchorId}`);
                    updates.vinculoFamiliarId = newAnchorId;
                    totalMigrated++;
                }
            }
            
            // --- CURA DE VÍNCULOS FANTASMAS ---
            if (vinculoId && !activeUUIDs.has(vinculoId)) {
                // Se o UUID não existe, ou se é um 'Outro X', vamos atrelar ao líder do clã correto.
                let newAnchorId = mainLeaderId; // Fallback raiz
                const normalizeN = (nome || "").toLowerCase();
                
                if (normalizeN.includes("cohen") && motherId) {
                    newAnchorId = motherId; // Lado materno
                } else if (normalizeN.includes("israel") && fatherId) {
                    newAnchorId = fatherId; // Lado paterno
                }
                
                console.log(`[FANTASMA] ${nome}: Redirecionado de '${vinculoId}' para -> ${newAnchorId}`);
                updates.vinculoFamiliarId = newAnchorId;
                totalPhantomsHealed++;
            }
            
            // --- CURA DE PAPEL AUSENTE (Para Otimização) ---
            if (!papel && !parentesco) {
                const memoryKey = data._memoryKey || "Membro";
                console.log(`[PAPEL] ${nome}: Preenchendo papel ausente com '${memoryKey}'`);
                // Precisamos garantir a compatibilidade com a sub-árvore
                updates["relationshipInfo.papel"] = memoryKey;
                updates["relationshipInfo.parentesco"] = memoryKey;
                totalRolesFixed++;
            }
            
            // EFETIVAR UPDATES
            if (Object.keys(updates).length > 0) {
                console.log(` > Update Payload para ${nome}:`, updates);
                // ATENÇÃO: Descomente a linha abaixo para executar a alteração no BD!
                await membrosRef.doc(docId).update(updates);
            }
        }
    }
    
    console.log("\n================ RELATÓRIO DE SANEAMENTO ================");
    console.log(`Vínculos Legados Resolvidos: ${totalMigrated}`);
    console.log(`Vínculos Fantasmas Eliminados: ${totalPhantomsHealed}`);
    console.log(`Papéis Nulos Preenchidos: ${totalRolesFixed}`);
    console.log("Operação Cicatriz Zero finalizada.");
    process.exit(0);
}

healDatabase().catch(e => {
    console.error("Erro Crítico no Saneamento:", e);
});
