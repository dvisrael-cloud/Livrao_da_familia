import fs from 'fs';
import { execSync } from 'child_process';

function calculateGlobalRelation(acaoA, ancoraRoleInfo) {
    if (!acaoA || !ancoraRoleInfo) return 'Calculando...';
    const acao = acaoA.toLowerCase();
    const role = ancoraRoleInfo.toLowerCase();
    
    const isRep = role.includes('eu mesmo') || role === 'representante';
    
    if (acao.includes('filh')) {
        if (isRep) return 'Filho(a)';
        if (role.includes('irmã') || role === 'irmão') return 'Sobrinho(a)';
        if (role.includes('pai') || role.includes('mãe')) return 'Irmão(ã)';
        return `Filho(a) do(a) ${ancoraRoleInfo}`;
    }
    if (acao.includes('espos') || acao.includes('companheir')) {
        if (isRep) return 'Cônjuge';
        if (role.includes('pai') || role.includes('mãe')) return 'Madrasta/Padrasto';
        return `Cônjuge do(a) ${ancoraRoleInfo}`;
    }
    if (acao.includes('pai') || acao.includes('mãe')) {
        if (isRep) return 'Pai/Mãe';
        if (role.includes('irmã') || role === 'irmão') return 'Pai/Mãe';
        if (role.includes('cônjuge')) return 'Sogro/Sogra';
        return `Pai/Mãe do(a) ${ancoraRoleInfo}`;
    }
    if (acao.includes('irmã') || acao === 'irmão') {
        if (isRep) return 'Irmão/Irmã';
        if (role.includes('pai') || role.includes('mãe')) return 'Tio/Tia';
        if (role.includes('filh')) return 'Filho(a)';
        return `Irmão/Irmã do(a) ${ancoraRoleInfo}`;
    }
    return `Parente`;
}

function getValue(fieldInfo) {
    if(!fieldInfo) return null;
    return fieldInfo.stringValue !== undefined ? fieldInfo.stringValue : null;
}

// Regex to detect UUID-like patterns (20-chars alphanumeric Firebase IDs or proper UUIDs)
const uuidRegex = /^[a-zA-Z0-9]{20,28}$|^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

// Detects lixo and returns a formatted string.
function getLixoTecnico(m) {
    const lixo = [];
    if (m._memoryKey) lixo.push(`_memKey:${m._memoryKey}`);
    if (m._originalRole) lixo.push(`_origRole:${m._originalRole}`);
    
    if (m.parentesco && m.parentesco.match(uuidRegex)) {
         lixo.push(`HASH(parentesco)`);
    }
    // _originalRole might also appear inside papel
    const papelHoje = m.relationshipInfo?.papel || '';
    if (papelHoje && papelHoje.match(uuidRegex)) {
         lixo.push(`HASH(papel)`);
    }

    return lixo.length > 0 ? lixo.join(' | ') : 'Limpo';
}

async function runAuditFull() {
    console.log("Inicializando Consulta via REST API para todas as famílias...");
    const token = execSync('gcloud auth print-access-token').toString().trim();
    if (!token) throw new Error("Não foi possível obter Token GCloud.");
    
    const projectId = 'album-familia-final';
    const reps = ["1DyECP2wp9PJ3FjttzjlcQTIDc92", "ClUpAGJdTCNCjky5vJEq3vY6vmE2", "HsaeMrGKclcSxlPBtyHeycSWWEC3"];
    
    const familyMembersMap = {};
    const memList = [];
    
    for (const repId of reps) {
        const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/familias/${repId}/membros?pageSize=300`;
        try {
            let response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
            if (!response.ok) continue;
            const data = await response.json();
            
            (data.documents || []).forEach(doc => {
                const id = doc.name.split('/').pop();
                const fields = doc.fields;
                const m = {
                    id,
                    repId,
                    nomeCompleto: getValue(fields.nomeCompleto) || getValue(fields.name) || "[Vazio]",
                    parentesco: getValue(fields.parentesco) || "null",
                    vinculoAcao: getValue(fields.vinculoAcao) || "null",
                    vinculoFamiliarId: getValue(fields.vinculoFamiliarId) || "null",
                    _memoryKey: getValue(fields._memoryKey),
                    _originalRole: getValue(fields._originalRole),
                    relationshipInfo: {
                        papel: getValue(fields.relationshipInfo?.mapValue?.fields?.papel) || getValue(fields.papel) || "null"
                    }
                };
                if (m.relationshipInfo.papel === "null") {
                   m.relationshipInfo.papel = m.parentesco;
                }
                familyMembersMap[id] = m;
                memList.push(m);
            });
        } catch(e) {
            console.error(e);
        }
    }
    
    const rows = [];
    
    for (const m of memList) {
        let frase = "-";
        
        let papelHoje = m.relationshipInfo?.papel;
        if (papelHoje === "null") papelHoje = m.parentesco;
        
        const isRep = m.parentesco === 'Eu Mesmo' || papelHoje === 'Eu Mesmo' || papelHoje === 'Representante';
        const isPai = m.parentesco === 'Pai' || papelHoje === 'Pai';
        const isMae = m.parentesco === 'Mãe' || papelHoje === 'Mãe';
        
        if (isRep) {
            frase = "(Cabeçalho Oculto: Dono da Árvore)";
        } else if (isPai) {
             frase = "Vidal David Israel é casado com Júlia Cohen Israel e é Pai de David Vidal Israel. 🔒";
        } else if (isMae) {
             frase = "Júlia Cohen Israel é casada com Vidal David Israel e é Mãe de David Vidal Israel. 🔒";
        } else if (m.vinculoAcao !== "null" && m.vinculoFamiliarId !== "null") {
             const ancDoc = familyMembersMap[m.vinculoFamiliarId];
             if (ancDoc) {
                 const currentAcao = m.vinculoAcao;
                 const roleB = ancDoc.relationshipInfo?.papel || ancDoc.parentesco || 'Desconhecido';
                 const calculatedRole = calculateGlobalRelation(currentAcao, roleB);
                 const acaoTxt = currentAcao.endsWith(' de') ? currentAcao : currentAcao + ' de';
                 frase = `${m.nomeCompleto} é ${acaoTxt} ${ancDoc.nomeCompleto} — * que é seu ${calculatedRole}.`;
             } else {
                 frase = `${m.nomeCompleto} é ${m.vinculoAcao} de [Âncora Inválida]`;
             }
        } else {
             frase = "(Sem vínculo no Banco)";
        }
        
        // Cols: Nome | UUID | Parentesco Bruto | Papel (RelInfo) | Acao | Ancora ID | Frase | Lixo
        const getFixedStr = (str, len) => String(str).substring(0, len).padEnd(len, ' ');
        const lixo = getLixoTecnico(m);
        rows.push([
            getFixedStr(m.nomeCompleto, 35),
            getFixedStr(m.id, 28),
            getFixedStr(m.parentesco, 20),
            getFixedStr(m.relationshipInfo?.papel, 25),
            getFixedStr(m.vinculoAcao, 15),
            getFixedStr(m.vinculoFamiliarId, 25),
            getFixedStr(frase, 70),
            getFixedStr(lixo, 60)
        ].join(' | '));
    }
    
    // Sort logic to make the table legible (group by families / roles maybe)
    // rows.sort();
    
    let md = `## MAPA DE CALOR TÉCNICO: EXTRAÇÃO COMPLETA DE MEMBROS E CONTAMINAÇÃO LIXO\n\n`;
    md += `| Nome Completo                       | UUID (ID)                    | Parentesco Bruto     | Papel (RelationshipInfo)  | Ação Vinculada  | ID da Âncora              | Frase Gerada                                                           | Lixo Técnico (Heranças / Hashs detectados)                                   |\n`;
    md += `|-------------------------------------|------------------------------|----------------------|---------------------------|-----------------|---------------------------|------------------------------------------------------------------------|------------------------------------------------------------------------------|\n`;
    for(const r of rows) {
        md += `| ${r} |\n`;
    }
    
    fs.writeFileSync('./audit_table_full.md', md, 'utf-8');
    fs.writeFileSync('./audit_table_full_raw.txt', JSON.stringify(memList, null, 2), 'utf-8');
    console.log("Gerado array final de auditoria com", rows.length, "registros.");
}

runAuditFull().catch(console.error);
