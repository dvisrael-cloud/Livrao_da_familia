
const fs = require('fs');
const content = fs.readFileSync('C:/Projetos/Comissao_Livrao_de_Familia/Novo_Livrao/livrao-app/src/constants/formConfig.js', 'utf8');

try {
    const jsonStr = content.substring(content.indexOf('['), content.lastIndexOf(']') + 1);
    JSON.parse(jsonStr);
    console.log("JSON is valid");
} catch (e) {
    console.error("JSON Error:", e.message);
    const posMatch = e.message.match(/at position (\d+)/);
    if (posMatch) {
        const pos = parseInt(posMatch[1]);
        const jsonStr = content.substring(content.indexOf('['), content.lastIndexOf(']') + 1);
        const snippet = jsonStr.substring(Math.max(0, pos - 50), pos + 50);
        console.error("Context:", snippet);
        console.error("Error around character:", snippet.substring(50, 60));
    }
}
