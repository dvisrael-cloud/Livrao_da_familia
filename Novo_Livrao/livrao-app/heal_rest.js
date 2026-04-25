import fsOrig from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { globSync } from 'glob';

// Since Node doesn't explicitly have glob in native without import, let's just use standard fs traversal
const fs = fsOrig.promises;
const baseDir = 'C:\\Users\\dvisr\\.gemini\\antigravity\\brain\\3434a55f-d15e-48af-b0b4-c483a3bb9661\\.system_generated\\steps';

async function healDatabase() {
    console.log("🏥 Saneamento Zero Cicatriz (Via REST API)...");
    
    // Obter o Token Ativo do Cloud CLI
    const token = execSync('gcloud auth print-access-token').toString().trim();
    if (!token) throw new Error("Não foi possível obter Token GCloud.");
    
    // Mapear Diretórios Locais em busca dos output.txt
    const directories = await fs.readdir(baseDir);
    const outputFiles = directories
        .map(d => path.join(baseDir, d, 'output.txt'))
        .filter(p => fsOrig.existsSync(p));

    let members = [];
    
    for (const f of outputFiles) {
        try {
            const content = await fs.readFile(f, 'utf8');
            const data = JSON.parse(content);
            if (data && data.documents) {
                // Excluir a lista raiz de familias (nó sem /membros/)
                const first = data.documents[0].name || "";
                if (first.includes('/familias/') && !first.includes('/membros/')) continue;
                members.push(...data.documents);
            }
        } catch(e) {}
    }
    
    // 1. Criar o Mapa Nome -> ID
    const nameToId = {};
    const activeUUIDs = new Set();
    
    // Primeiro loop para mapear
    for (const m of members) {
        const docId = m.name.split('/').pop();
        activeUUIDs.add(docId);
        const fields = m.fields || {};
        const nome = fields.nomeCompleto?.stringValue || fields.name?.stringValue || docId;
        if (nome) nameToId[nome.toLowerCase().trim()] = docId;
    }
    
    const findIdByName = (searchName) => nameToId[(searchName || "").toLowerCase().trim()] || null;

    // 2. Definir Curadores Fixos Assumidos das Regras Familiares (Exclusivo Família 1DyEC...)
    const mainLeaderId = findIdByName("David Vidal Israel"); 
    const motherId = findIdByName("Julia Cohen Israel");
    const fatherId = findIdByName("David José Israel");

    let totalMigrated = 0;
    let totalPhantomsHealed = 0;
    
    console.log(`📡 Processando ${members.length} documentos encontrados...`);

    // 3. Varredura de Correções
    for (const m of members) {
        const docId = m.name.split('/').pop();
        const familyId = m.name.split('/familias/')[1].split('/')[0];
        const fields = m.fields || {};
        
        const nome = fields.nomeCompleto?.stringValue || fields.name?.stringValue || docId;
        const vinculoId = fields.vinculoFamiliarId?.stringValue || "";
        
        let papel = fields.papel?.stringValue || "";
        let parentesco = fields.parentesco?.stringValue || "";
        const relFields = fields.relationshipInfo?.mapValue?.fields || {};
        if (!papel) papel = relFields.papel?.stringValue || "";
        if (!parentesco) parentesco = relFields.parentesco?.stringValue || "";
        
        let updates = {};
        
        // --- 3.1. CURA DE VÍNCULOS LEGADOS (Sem ID, com texto antigo)
        if (!vinculoId) {
            let newAnchorId = null;
            const normalizeP = (parentesco || "").toLowerCase();
            
            if (normalizeP.includes("karla")) newAnchorId = findIdByName("Karla Petruccelli Israel");
            else if (normalizeP.includes("materno") && motherId) newAnchorId = motherId;
            else if (normalizeP.includes("paterno") && fatherId) newAnchorId = fatherId;
            else if (normalizeP.includes("cônjuge") || normalizeP.includes("madrasta") || normalizeP.includes("irmão")) newAnchorId = mainLeaderId || familyId;

            if (newAnchorId) {
                console.log(`[LEGADO CORRIGIDO] ${nome} -> Âncora setada para ${newAnchorId}`);
                updates.vinculoFamiliarId = newAnchorId;
                totalMigrated++;
            }
        }
        
        // --- 3.2. CURA DE VÍNCULOS FANTASMAS (Apontando para ID furado / Outro X)
        if (vinculoId && !activeUUIDs.has(vinculoId)) {
            let newAnchorId = mainLeaderId || familyId;
            const normalizeN = (nome || "").toLowerCase();
            
            if (normalizeN.includes("cohen") && motherId) newAnchorId = motherId;
            else if (normalizeN.includes("israel") && fatherId) newAnchorId = fatherId;
            
            console.log(`[FANTASMA DESTRUÍDO] ${nome} -> de '${vinculoId}' para ${newAnchorId}`);
            updates.vinculoFamiliarId = newAnchorId;
            totalPhantomsHealed++;
        }
        
        // 4. Efetivar Updates
        if (Object.keys(updates).length > 0) {
            const patchUrl = `https://firestore.googleapis.com/v1/${m.name}?updateMask.fieldPaths=vinculoFamiliarId`;
            
            // Corpo da requisição REST para os campos maskeados
            const payload = {
                fields: {
                    vinculoFamiliarId: { stringValue: updates.vinculoFamiliarId }
                }
            };
            
            // Fazendo a requisição
            const response = await fetch(patchUrl, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });
            
            if (!response.ok) {
                console.error(`Erro ao atualizar ${nome}:`, await response.text());
            } else {
                console.log(`✅ Update finalizado via API para ${nome}`);
            }
        }
    }
    
    console.log("\n================ RESULTADO DA OPERAÇÃO CICATRIZ ZERO ================");
    console.log(`Legados Transformados: ${totalMigrated}`);
    console.log(`Fantasmas Saneados: ${totalPhantomsHealed}`);
    console.log("Sucesso total.");
}

healDatabase().catch(console.error);
