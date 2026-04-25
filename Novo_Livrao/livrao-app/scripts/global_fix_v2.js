
import http from 'https';
import { execSync } from 'child_process';

const project = 'album-familia-final';
const familyId = '1DyECP2wp9PJ3FjttzjlcQTIDc92';

async function run() {
    console.log("Getting token...");
    const token = execSync('gcloud auth print-access-token --project=' + project).toString().trim();
    const baseUrl = `https://firestore.googleapis.com/v1/projects/${project}/databases/(default)/documents/familias/${familyId}/membros`;

    console.log("Fetching members...");
    const members = await fetchAll(baseUrl, token);
    
    const nameMap = {};
    const uuidMap = {};
    const outroMap = {};

    members.forEach(m => {
        const id = m.name.split('/').pop();
        const f = m.fields;
        const name = (f.nomeCompleto?.stringValue || f.name?.stringValue || "").trim().toLowerCase();
        if (name) nameMap[name] = id;
        uuidMap[id] = m;
        if (f._migratedFromOutro?.stringValue) outroMap[f._migratedFromOutro.stringValue] = id;
    });

    const norm = (s) => (s || "").trim().toLowerCase();

    const FIXED_TRONCOS = ['Eu mesmo', 'Pai', 'Mãe', 'Avô Paterno', 'Avó Paterna', 'Avô Materno', 'Avó Materna', 'Pai do Avô Paterno', 'Mãe do Avô Paterno', 'Pai da Avó Paterna', 'Mãe da Avó Paterna', 'Pai do Avô Materno', 'Mãe do Avô Materno', 'Pai da Avó Materna', 'Mãe da Avó Materna', 'Cônjuge', 'Cônjuge 2', 'Cônjuge 3', 'Cônjuge 4'];

    for (const m of members) {
        const id = m.name.split('/').pop();
        const f = m.fields;
        const papel = f.relationshipInfo?.mapValue?.fields?.papel?.stringValue || f.papel?.stringValue || "";
        const parentesco = f.relationshipInfo?.mapValue?.fields?.parentesco?.stringValue || f.parentesco?.stringValue || "";
        const updates = {};

        // Fix legacy Outro pointers
        if (f.linkedToAnchorId?.stringValue?.startsWith("Outro") && outroMap[f.linkedToAnchorId.stringValue]) {
            updates.linkedToAnchorId = { stringValue: outroMap[f.linkedToAnchorId.stringValue] };
        }
        if (f.vinculoFamiliarId?.stringValue?.startsWith("Outro") && outroMap[f.vinculoFamiliarId.stringValue]) {
            updates.vinculoFamiliarId = { stringValue: outroMap[f.vinculoFamiliarId.stringValue] };
        }

        // Heal Orphans
        const needsAnchor = !FIXED_TRONCOS.includes(papel) && !linkExists(f);
        if (needsAnchor) {
            console.log(`Checking orphan: ${f.nomeCompleto?.stringValue} (${id})`);
            
            // Try Parents
            const father = norm(f.nomePai?.stringValue);
            const mother = norm(f.nomeMae?.stringValue);
            if (father && nameMap[father]) {
                updates.linkedToAnchorId = { stringValue: nameMap[father] };
                 console.log(`  -> Linked to Father: ${father}`);
            } else if (mother && nameMap[mother]) {
                updates.linkedToAnchorId = { stringValue: nameMap[mother] };
                console.log(`  -> Linked to Mother: ${mother}`);
            }
            // Try Spouse
            else if (f.nomeConjuge?.stringValue && nameMap[norm(f.nomeConjuge.stringValue)]) {
                updates.linkedToAnchorId = { stringValue: nameMap[norm(f.nomeConjuge.stringValue)] };
                console.log(`  -> Linked to Spouse: ${f.nomeConjuge.stringValue}`);
            }
            // Special: Siblings
            else if (papel.includes("Irmao") || parentesco.includes("Irmao")) {
                // Link to Eu mesmo or Pai
                const euMesmo = members.find(x => x.fields.papel?.stringValue === "Eu mesmo")?.name?.split('/').pop();
                if (euMesmo) {
                    updates.linkedToAnchorId = { stringValue: euMesmo };
                    console.log(`  -> Linked Sibling to Eu mesmo`);
                }
            }
        }

        if (Object.keys(updates).length > 0) {
            await patchDoc(m.name, updates, token);
        }
    }
    console.log("Global Integrity Restored.");
}

function linkExists(f) {
    return (f.linkedToAnchorId?.stringValue && !f.linkedToAnchorId.stringValue.startsWith("Outro")) || 
           (f.vinculoFamiliarId?.stringValue && !f.vinculoFamiliarId.stringValue.startsWith("Outro"));
}

async function fetchAll(url, token) {
    return new Promise((resolve, reject) => {
        http.get(url, { headers: { 'Authorization': `Bearer ${token}` } }, (res) => {
            let data = '';
            res.on('data', d => data += d);
            res.on('end', () => resolve(JSON.parse(data).documents || []));
        }).on('error', reject);
    });
}

async function patchDoc(docName, fields, token) {
    const fieldPaths = Object.keys(fields).map(f => `updateMask.fieldPaths=${f}`).join('&');
    const url = `https://firestore.googleapis.com/v1/${docName}?${fieldPaths}`;
    const body = JSON.stringify({ fields });
    return new Promise((resolve, reject) => {
        const req = http.request(url, { method: 'PATCH', headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) } }, (res) => {
            if (res.statusCode < 300) resolve();
            else { let d=''; res.on('data', x=>d+=x); res.on('end', () => { console.error("Error", d); resolve(); }); }
        });
        req.on('error', reject); req.write(body); req.end();
    });
}

run().catch(console.error);
