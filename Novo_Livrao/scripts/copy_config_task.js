const fs = require('fs');
const path = require('path');

const srcPath = 'c:/Users/dvisr/OneDrive/Comissão Livrão de Família/Novo livrão/livrao-app/src/constants/formConfig.js';
const destPath = 'c:/Users/dvisr/OneDrive/Comissão Livrão de Família/Novo livrão/livrao-admin/src/constants/adminFormConfig.js';

try {
    if (!fs.existsSync(srcPath)) {
        console.error('Source file not found:', srcPath);
        process.exit(1);
    }

    const dir = path.dirname(destPath);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }

    fs.copyFileSync(srcPath, destPath);
    console.log('Successfully copied formConfig.js to adminFormConfig.js');
} catch (error) {
    console.error('Error copying file:', error);
    process.exit(1);
}
