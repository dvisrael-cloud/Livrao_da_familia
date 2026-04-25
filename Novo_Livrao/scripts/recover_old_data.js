import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";
import fs from 'fs';

// Configuração do PROJETO ANTIGO (livrao-familia-producao)
const oldConfig = {
    apiKey: "AIzaSyBdornA9uXZP68XqkTYEl6SmqGkdeITY6o",
    authDomain: "livrao-familia-producao-3d41a.firebaseapp.com",
    projectId: "livrao-familia-producao-3d41a",
    storageBucket: "livrao-familia-producao-3d41a.firebasestorage.app",
    messagingSenderId: "678229413328",
    appId: "1:678229413328:web:6be2d4603d83c3b439fdd5"
};

const app = initializeApp(oldConfig);
const db = getFirestore(app);

console.log("🔍 Conectando ao Banco de Dados Antigo...");

try {
    const snapshot = await getDocs(collection(db, "familias"));

    if (snapshot.empty) {
        console.log("❌ Nenhum dado encontrado na coleção 'familias' do projeto antigo.");
        process.exit(0);
    }

    console.log(`✅ ${snapshot.size} registros encontrados! Gerando CSV...`);

    // Cabeçalho compatível com nosso Importador
    const csvRows = ["Nome;Email;Telefone;Cidade;Estado;DataNascimento;ID_Original"];

    snapshot.forEach(doc => {
        const data = doc.data();

        // Mapea os campos
        const nome = data.repName || data.displayName || data.nome || 'Sem Nome';
        const email = data.email || 'sem_email';
        const telefone = data.repPhone || data.telefone || '';
        const cidade = data.city || data.cidade || '';
        const estado = data.state || data.estado || '';
        const nascimento = data.birthDate || '';

        // Cria linha CSV (evitar ponto e vírgula nos dados)
        const row = [
            nome.replace(/;/g, ","),
            email.replace(/;/g, ","),
            telefone.replace(/;/g, ","),
            cidade.replace(/;/g, ","),
            estado.replace(/;/g, ","),
            nascimento,
            doc.id
        ];

        csvRows.push(row.join(';'));
    });

    fs.writeFileSync('DADOS_RECUPERADOS_DO_ANTIGO.csv', csvRows.join('\n'));
    console.log("🎉 SUCESSO! Arquivo 'DADOS_RECUPERADOS_DO_ANTIGO.csv' criado na raiz do projeto.");

} catch (error) {
    console.error("Erro ao buscar dados:", error);
}

process.exit();
