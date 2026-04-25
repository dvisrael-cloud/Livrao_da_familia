
const fs = require('fs');
const content = fs.readFileSync('c:/Projetos/Comissao_Livrao_de_Familia/Novo_Livrao/livrao-app/src/constants/formConfig.js', 'utf8');

try {
    // Basic attempt to parse what's inside the brackets
    const match = content.match(/const formConfig = (\[[\s\S]*\]);/);
    if (!match) {
        console.error("Could not find formConfig array");
        process.exit(1);
    }
    JSON.parse(match[1]);
    console.log("JSON is valid");
} catch (e) {
    console.error("JSON Error:", e.message);
    // Try to find the position
    const posMatch = e.message.match(/at position (\d+)/);
    if (posMatch) {
        const pos = parseInt(posMatch[1]);
        const snippet = match[1].substring(Math.max(0, pos - 50), pos + 50);
        console.error("Context:", snippet);
        console.error("Error at position:", pos);
    }
}
