import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const configPath = path.join(__dirname, 'src', 'constants', 'formConfig.js');
let lines = fs.readFileSync(configPath, 'utf8').split('\n');

const vidaJudaicaFields = [
    'did_fadas', 'sinagogaFrequentava', 'professorHebraico',
    'did_brit_millah', 'brit_millah_date', 'brit_millah_location', 'brit_millah_responsible',
    'did_bar_mitzva', 'bar_mitzva_date', 'bar_mitzva_location',
    'did_bat_mitzva', 'fadas_date', 'bat_mitzva_date', 'bat_mitzva_location',
    'fadas_location', 'fadas_responsible', 'youth_movements'
];

for (let i = 0; i < lines.length; i++) {
    for (const field of vidaJudaicaFields) {
        if (lines[i].includes(`"fieldId": "${field}"`)) {
            // go back a few lines and replace
            for (let j = i; j > i - 15; j--) {
                if (lines[j] && lines[j].includes('"wizardSection": "LifeCulture"')) {
                    lines[j] = lines[j].replace('"LifeCulture"', '"VidaJudaica"');
                }
                if (lines[j] && lines[j].includes('"uiTitle": "10. Vida Social e Comunitária"')) {
                    lines[j] = lines[j].replace('"10. Vida Social e Comunitária"', '"10. Vida Judaica"');
                }
            }
        }
    }
}

fs.writeFileSync(configPath, lines.join('\n'), 'utf8');
console.log('Atualizado com sucesso!');
