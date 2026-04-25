const fs = require('fs');
const path = require('path');

// Root source file
const source = 'c:/Users/dvisr/OneDrive/Comissão Livrão de Família/Novo livrão/LOGO LIVRÃO DA FAMILIA - Classic.png';

// Destinations (Using the filename found in Layout.jsx: logo-livrao.png)
const destApp = 'c:/Users/dvisr/OneDrive/Comissão Livrão de Família/Novo livrão/livrao-app/public/logo-livrao.png';
const destAdmin = 'c:/Users/dvisr/OneDrive/Comissão Livrão de Família/Novo livrão/livrao-admin/public/logo-livrao.png';

console.log('Overwriting logo-livrao.png with new file...');

if (fs.existsSync(source)) {
    // App
    const dirApp = path.dirname(destApp);
    if (!fs.existsSync(dirApp)) fs.mkdirSync(dirApp, { recursive: true });

    fs.copyFileSync(source, destApp);
    console.log(`Updated: ${destApp}`);

    // Admin
    const dirAdmin = path.dirname(destAdmin);
    if (!fs.existsSync(dirAdmin)) fs.mkdirSync(dirAdmin, { recursive: true });

    fs.copyFileSync(source, destAdmin);
    console.log(`Updated: ${destAdmin}`);

} else {
    console.error('Source file not found:', source);
}
