import { execSync } from 'child_process';

// Script de patch cirúrgico para Elias José Israel
// Ação: Limpar campos corrompidos, atualizar vínculo para ID real, remover lixo técnico

async function patchElias() {
    const token = execSync('gcloud auth print-access-token').toString().trim();
    const projectId = 'album-familia-final';
    const db = `projects/${projectId}/databases/(default)/documents`;
    const headers = { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    };
    
    // --- PASSO 1: Localizar o documento "David José israel" (Avô Paterno)
    // Da auditoria anterior, sabemos que o docId dele é literalmente "Avô Paterno"
    // Precisamos confirmar e obter o nome completo exato
    console.log("PASSO 1: Confirmando o docId do Avô Paterno...");
    
    const reps = ["1DyECP2wp9PJ3FjttzjlcQTIDc92", "ClUpAGJdTCNCjky5vJEq3vY6vmE2", "HsaeMrGKclcSxlPBtyHeycSWWEC3"];
    let davidJoseDocId = null;
    let davidJoseNome = null;
    let eliasFamiliaRepId = null;
    let eliasDocId = null;
    
    for (const repId of reps) {
        const url = `https://firestore.googleapis.com/v1/${db}/familias/${repId}/membros?pageSize=300`;
        const res = await fetch(url, { headers });
        if(!res.ok) continue;
        const data = await res.json();
        
        for (const doc of (data.documents || [])) {
            const id = doc.name.split('/').pop();
            const f = doc.fields;
            const nome = (f.nomeCompleto?.stringValue || f.name?.stringValue || "").trim();
            const papel = f.relationshipInfo?.mapValue?.fields?.papel?.stringValue || 
                          f.parentesco?.stringValue || "";
            
            // Procurar o Avô Paterno (David José israel) na árvore do David Vidal Israel
            if (["avô paterno"].includes(papel.toLowerCase()) && repId === "1DyECP2wp9PJ3FjttzjlcQTIDc92") {
                davidJoseDocId = id;
                davidJoseNome = nome;
                console.log(`  ✅ Avô Paterno encontrado: "${nome}" | DocID = "${id}"`);
            }
            
            // Procurar o Elias
            if (nome.toLowerCase().includes("elias j") && nome.toLowerCase().includes("israel")) {
                eliasFamiliaRepId = repId;
                eliasDocId = id;
                console.log(`  ✅ Elias encontrado: "${nome}" | DocID = "${id}" | Família = ${repId}`);
            }
        }
    }
    
    if (!davidJoseDocId || !eliasDocId) {
        console.error("❌ Não foi possível identificar ambos os documentos. Abortando.");
        return;
    }
    
    console.log("\n--- RELATÓRIO PRÉ-PATCH ---");
    console.log(`Âncora Real (David José israel): docId = "${davidJoseDocId}"`);
    console.log(`Elias: docId = "${eliasDocId}" | família = ${eliasFamiliaRepId}`);
    console.log("---------------------------\n");
    
    // --- PASSO 2 + 3 + 4: PATCH no documento do Elias
    // Utilizando updateDocument via REST com updateMask para:
    //   a) Substituir vinculoFamiliarId pelo docId real
    //   b) Limpar parentesco e papel para "Tio/a (Paterno)"
    //   c) Remover _memoryKey e _originalRole (incluir no mask, excluir do body = deleção)
    
    console.log("PASSO 2-4: Aplicando PATCH no documento do Elias...");
    
    const eliasDocPath = `${db}/familias/${eliasFamiliaRepId}/membros/${eliasDocId}`;
    
    // Campos que serão DELETADOS: incluir no mask, mas NÃO no body
    // Campos que serão ATUALIZADOS: incluir no mask E no body
    const updateMask = [
        'vinculoFamiliarId',
        'parentesco',
        'relationshipInfo',
        '_memoryKey',
        '_originalRole'
    ].join(',');
    
    const patchBody = {
        fields: {
            vinculoFamiliarId: { stringValue: davidJoseDocId },
            parentesco: { stringValue: "Tio/a (Paterno)" },
            relationshipInfo: {
                mapValue: {
                    fields: {
                        papel: { stringValue: "Tio/a (Paterno)" },
                        parentesco: { stringValue: "Tio/a (Paterno)" },
                        nome: { stringValue: "" }
                    }
                }
            }
            // _memoryKey e _originalRole NÃO estão no body → serão DELETADOS pelo mask
        }
    };
    
    const patchUrl = `https://firestore.googleapis.com/v1/${eliasDocPath}?updateMask.fieldPaths=${updateMask.split(',').map(f => encodeURIComponent(f)).join('&updateMask.fieldPaths=')}`;
    
    const patchRes = await fetch(patchUrl, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ name: eliasDocPath, ...patchBody })
    });
    
    if (!patchRes.ok) {
        const err = await patchRes.text();
        console.error("❌ PATCH falhou:", err);
        return;
    }
    
    const result = await patchRes.json();
    console.log("✅ PATCH aplicado com sucesso!");
    console.log("\n--- VERIFICAÇÃO PÓS-PATCH ---");
    
    const checkFields = result.fields;
    console.log(`vinculoFamiliarId: "${checkFields.vinculoFamiliarId?.stringValue}"`);
    console.log(`vinculoAcao:       "${checkFields.vinculoAcao?.stringValue}"`);
    console.log(`parentesco:        "${checkFields.parentesco?.stringValue}"`);
    console.log(`papel (info):      "${checkFields.relationshipInfo?.mapValue?.fields?.papel?.stringValue}"`);
    console.log(`_memoryKey:        ${checkFields._memoryKey ? `"${checkFields._memoryKey.stringValue}" ❌ Ainda existe!` : "✅ DELETADO"}`);
    console.log(`_originalRole:     ${checkFields._originalRole ? `"${checkFields._originalRole.stringValue}" ❌ Ainda existe!` : "✅ DELETADO"}`);
    console.log("-----------------------------");
    console.log("\n🔗 Frase esperada pela calculateGlobalRelation:");
    console.log(`   Elias José Israel é Filho de ${davidJoseNome} — * que é seu Tio/a (Paterno).`);
}

patchElias().catch(console.error);
