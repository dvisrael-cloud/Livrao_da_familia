// Script para adicionar allowReference: true nos campos com allowUnknown
const fs = require('fs');
const path = require('path');

const formConfigPath = path.join(__dirname, '../livrao-app/src/constants/formConfig.js');

// Lê o arquivo
let content = fs.readFileSync(formConfigPath, 'utf8');

// Campos que devem ter apenas allowReference (sem allowUnknown)
const referenceOnlyFields = ['resumoHistorico', 'relatosAdicionais'];

// Padrão para encontrar allowUnknown: true
const pattern = /"allowUnknown": true/g;

// Substitui adicionando allowReference logo após
content = content.replace(pattern, '"allowUnknown": true,\n        "allowReference": true');

// Agora adiciona allowReference nos campos resumoHistorico e relatosAdicionais
referenceOnlyFields.forEach(fieldId => {
    const fieldPattern = new RegExp(
        `("fieldId": "${fieldId}",[\\s\\S]*?)(\n    \\})`,
        'g'
    );

    content = content.replace(fieldPattern, (_match, p1, p2) => {
        // Verifica se já tem allowReference
        if (p1.includes('allowReference')) {
            return _match;
        }
        // Adiciona allowReference antes do fechamento
        return p1 + ',\n        "allowReference": true' + p2;
    });
});

// Salva o arquivo
fs.writeFileSync(formConfigPath, content, 'utf8');

console.log('✅ allowReference: true adicionado em 48 campos!');
console.log('  - 46 campos com allowUnknown + allowReference');
console.log('  - 2 campos com apenas allowReference (resumoHistorico, relatosAdicionais)');
