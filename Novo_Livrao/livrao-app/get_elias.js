import { execSync } from 'child_process';

async function getEliasTargetFields() {
    const token = execSync('gcloud auth print-access-token').toString().trim();
    const reps = ["1DyECP2wp9PJ3FjttzjlcQTIDc92", "ClUpAGJdTCNCjky5vJEq3vY6vmE2", "HsaeMrGKclcSxlPBtyHeycSWWEC3"];
    
    for (const repId of reps) {
        const url = `https://firestore.googleapis.com/v1/projects/album-familia-final/databases/(default)/documents/familias/${repId}/membros?pageSize=300`;
        const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
        if(!res.ok) continue;
        const data = await res.json();
        
        for (const doc of (data.documents || [])) {
             const f = doc.fields;
             const nome = (f.nomeCompleto?.stringValue || f.name?.stringValue || "").trim().toLowerCase();
             if (nome.includes("elias j")) {
                  const TARGET_FIELDS = ['nomePai','nomeMae','parentesco','_memoryKey','_originalRole','vinculoAcao','vinculoFamiliarId','relationshipInfo'];
                  const out = {};
                  TARGET_FIELDS.forEach(k => {
                    if (f[k]) out[k] = f[k];
                    else out[k] = '⚠️ CAMPO NÃO EXISTE NO DB';
                  });
                  console.log(JSON.stringify(out, null, 2));
                  return;
             }
        }
    }
    console.log("Não encontrado.");
}
getEliasTargetFields();
