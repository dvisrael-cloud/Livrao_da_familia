
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
    console.log(`Found ${members.length} members.`);

    // Map Outro -> MemoryKey
    const outroMap = {};
    members.forEach(m => {
        const fields = m.fields;
        if (fields._migratedFromOutro && fields._migratedFromOutro.stringValue) {
            outroMap[fields._migratedFromOutro.stringValue] = m.name.split('/').pop();
        }
    });

    console.log("Outro Mapping:", outroMap);

    // Fixes
    for (const m of members) {
        const docId = m.name.split('/').pop();
        const fields = m.fields;
        const updates = {};

        // 1. Check for Outro survivors in linkedToAnchorId
        if (fields.linkedToAnchorId && fields.linkedToAnchorId.stringValue && fields.linkedToAnchorId.stringValue.startsWith('Outro')) {
            const legacy = fields.linkedToAnchorId.stringValue;
            if (outroMap[legacy]) {
                updates.linkedToAnchorId = { stringValue: outroMap[legacy] };
                console.log(`[FIX] Member ${docId}: fixing linkedToAnchorId ${legacy} -> ${outroMap[legacy]}`);
            }
        }

        // 2. Check for Outro survivors in vinculoFamiliarId
        if (fields.vinculoFamiliarId && fields.vinculoFamiliarId.stringValue && fields.vinculoFamiliarId.stringValue.startsWith('Outro')) {
            const legacy = fields.vinculoFamiliarId.stringValue;
            if (outroMap[legacy]) {
                updates.vinculoFamiliarId = { stringValue: outroMap[legacy] };
                console.log(`[FIX] Member ${docId}: fixing vinculoFamiliarId ${legacy} -> ${outroMap[legacy]}`);
            }
        }

        // 3. Special Case: Jime Israel (Manual fix was missing)
        if (fields.nomeCompleto && fields.nomeCompleto.stringValue === "Jime Elias Israel") {
             if (!fields.linkedToAnchorId || !fields.linkedToAnchorId.stringValue) {
                 // Elias Josè Israel is Outro 10 -> UUID sODwm9X5rlICL7j6CkrT
                 updates.linkedToAnchorId = { stringValue: "sODwm9X5rlICL7j6CkrT" };
                 console.log(`[HEAL] Jime Israel: adding missing link to Elias`);
             }
        }

        if (Object.keys(updates).length > 0) {
            await patchDoc(m.name, updates, token);
        }
    }

    console.log("Migration Complete.");
}

async function fetchAll(url, token) {
    return new Promise((resolve, reject) => {
        http.get(url, {
            headers: { 'Authorization': `Bearer ${token}` }
        }, (res) => {
            let data = '';
            res.on('data', d => data += d);
            res.on('end', () => {
                const json = JSON.parse(data);
                resolve(json.documents || []);
            });
        }).on('error', reject);
    });
}

async function patchDoc(docName, fields, token) {
    const fieldPaths = Object.keys(fields).map(f => `updateMask.fieldPaths=${f}`).join('&');
    const url = `https://firestore.googleapis.com/v1/${docName}?${fieldPaths}`;
    
    const body = JSON.stringify({ fields });

    return new Promise((resolve, reject) => {
        const req = http.request(url, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(body)
            }
        }, (res) => {
            if (res.statusCode >= 200 && res.statusCode < 300) {
                resolve();
            } else {
                let data = '';
                res.on('data', d => data += d);
                res.on('end', () => {
                    console.error(`Error patching ${docName}: ${res.statusCode}`, data);
                    resolve(); // continue anyway
                });
            }
        });
        req.on('error', reject);
        req.write(body);
        req.end();
    });
}

run().catch(console.error);
