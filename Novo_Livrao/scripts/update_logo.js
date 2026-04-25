const fs = require('fs');
const path = require('path');

const source = 'c:/Users/dvisr/OneDrive/Comissão Livrão de Família/Novo livrão/LOGO LIVRÃO DA FAMILIA - Classic.png';
const dest1 = 'c:/Users/dvisr/OneDrive/Comissão Livrão de Família/Novo livrão/livrao-app/public/logo-livrao-classic.png';
const dest2 = 'c:/Users/dvisr/OneDrive/Comissão Livrão de Família/Novo livrão/livrao-admin/public/logo-livrao-classic.png';

console.log('Copying new logo to applications...');

if (fs.existsSync(source)) {
    // App
    const dir1 = path.dirname(dest1);
    if (!fs.existsSync(dir1)) fs.mkdirSync(dir1, { recursive: true });
    fs.copyFileSync(source, dest1);
    console.log('User App Logo Updated.');

    // Admin
    const dir2 = path.dirname(dest2);
    if (!fs.existsSync(dir2)) fs.mkdirSync(dir2, { recursive: true });
    fs.copyFileSync(source, dest2);
    console.log('Admin App Logo Updated.');
} else {
    console.error('Source logo file not found!');
}
