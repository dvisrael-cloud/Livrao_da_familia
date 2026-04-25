
import React, { useState } from 'react';
import { Upload, FileText, AlertCircle, CheckCircle, Save, X } from 'lucide-react';
import { doc, setDoc, serverTimestamp, collection, getDocs, getFirestore, deleteDoc } from "firebase/firestore";
import { db } from '../services/firebase';
import { initializeApp } from "firebase/app";

export const CsvImporter = ({ role }) => {
    const [file, setFile] = useState(null);
    const [previewData, setPreviewData] = useState([]);
    const [headers, setHeaders] = useState([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [importLog, setImportLog] = useState([]);

    const handleFileUpload = (e) => {
        const uploadedFile = e.target.files[0];
        if (!uploadedFile) return;

        setFile(uploadedFile);
        const reader = new FileReader();

        reader.onload = (event) => {
            const text = event.target.result;
            if (uploadedFile.name.toLowerCase().endsWith('.json')) {
                parseJSON(text);
            } else {
                parseCSV(text);
            }
        };

        reader.readAsText(uploadedFile);
    };

    const handleRecoverLegacy = async () => {
        if (!confirm("Isso tentará conectar ao banco de dados antigo e baixar seus dados. Continuar?")) return;

        const oldConfig = {
            apiKey: "AIzaSyBdornA9uXZP68XqkTYEl6SmqGkdeITY6o",
            authDomain: "livrao-familia-producao-3d41a.firebaseapp.com",
            projectId: "livrao-familia-producao-3d41a",
            storageBucket: "livrao-familia-producao-3d41a.firebasestorage.app",
            messagingSenderId: "678229413328",
            appId: "1:678229413328:web:6be2d4603d83c3b439fdd5"
        };

        try {
            const legacyApp = initializeApp(oldConfig, "LEGACY");
            const legacyDb = getFirestore(legacyApp);

            alert("Conectando ao banco antigo... aguarde.");
            const snap = await getDocs(collection(legacyDb, "familias"));

            let csvContent = "Nome;Email;Telefone;Cidade;Estado;DataNascimento\n";

            snap.forEach(doc => {
                const d = doc.data();
                const row = [
                    (d.repName || d.displayName || d.nome || '').replace(/;/g, ','),
                    (d.email || '').replace(/;/g, ','),
                    (d.repPhone || d.telefone || '').replace(/;/g, ','),
                    (d.city || d.cidade || '').replace(/;/g, ','),
                    (d.state || d.estado || '').replace(/;/g, ','),
                    (d.birthDate || '').replace(/;/g, ',')
                ].join(';');
                csvContent += row + "\n";
            });

            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.setAttribute("href", url);
            link.setAttribute("download", "RESGATE_DADOS_ANTIGOS.csv");
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            alert(`Sucesso! ${snap.size} registros recuperados. Use este arquivo para importar.`);

        } catch (err) {
            console.error(err);
            alert("Erro ao recuperar: " + err.message);
        }
    };

    const handleNukeDatabase = async () => {
        if (!confirm("⚠️ PERIGO: Isso apagará TODAS as famílias cadastradas no bancos de dados novo.\n\nUse isso para limpar a importação errada.\n\nTem certeza absoluta?")) return;

        const verification = prompt("Para confirmar, digite LIMPAR abaixo:");
        if (verification !== "LIMPAR") {
            alert("Ação cancelada.");
            return;
        }

        setIsProcessing(true);
        try {
            alert("Iniciando limpeza... isso pode levar um minuto.");
            const snap = await getDocs(collection(db, "familias"));
            let count = 0;

            for (const d of snap.docs) {
                await deleteDoc(doc(db, "familias", d.id));
                count++;
            }

            alert(`Faxina Concluída! 🧹\n${count} registros foram apagados do banco.\nAgora você pode fazer a importação correta.`);
            setImportLog([{ status: 'success', msg: `Faxina: ${count} itens removidos.` }]);

        } catch (err) {
            console.error(err);
            alert("Erro ao limpar: " + err.message);
        } finally {
            setIsProcessing(false);
        }
    };

    const parseJSON = (text) => {
        try {
            const data = JSON.parse(text);

            if (!Array.isArray(data)) {
                alert("O arquivo JSON não contém uma lista válida.");
                return;
            }

            const processed = data.map((item, index) => {
                let displayProps = {};

                if (item.type === 'familia') {
                    displayProps = {
                        Tipo: 'FAMÍLIA',
                        Nome: item.data.repName || item.data.displayName || '?',
                        Detalhe: item.data.email || 'Sem Email',
                        ParentID: '-'
                    };
                } else if (item.type === 'membro') {
                    displayProps = {
                        Tipo: 'MEMBRO',
                        Nome: item.data.nomeCompleto || '?',
                        Detalhe: item.data.dataNascimento ? `Nasc: ${item.data.dataNascimento}` : 'Sem data',
                        ParentID: item.parentId
                    };
                } else {
                    displayProps = { Tipo: 'DESCONHECIDO', Nome: '?', Detalhe: '?', ParentID: '?' };
                }

                return {
                    _id: index,
                    ...item,
                    ...displayProps
                };
            });

            setPreviewData(processed);
            setHeaders(['Tipo', 'Nome', 'Detalhe', 'ParentID']);
            setImportLog([]);

        } catch (e) {
            console.error(e);
            alert("Erro ao ler JSON: " + e.message);
        }
    };

    const parseCSV = (text) => {
        const firstLine = text.split('\n')[0];
        const separator = firstLine.includes(';') ? ';' : ',';
        const lines = text.split('\n').filter(line => line.trim() !== '');
        const extractedHeaders = lines[0].split(separator).map(h => h.trim().replace(/"/g, ''));

        setHeaders(extractedHeaders);

        const data = lines.slice(1).map((line, index) => {
            const values = line.split(separator).map(v => v.trim().replace(/"/g, ''));
            const rowObject = {};
            extractedHeaders.forEach((header, i) => {
                rowObject[header] = values[i] || '';
            });
            return { _id: index, ...rowObject };
        });

        setPreviewData(data);
        setImportLog([]);
    };

    const processImport = async () => {
        if (!confirm(`Confirma a importação de ${previewData.length} registros?`)) return;

        setIsProcessing(true);
        const newLogs = [];
        let successCount = 0;
        let errorCount = 0;

        for (const item of previewData) {
            try {
                if (item.type === 'familia') {
                    await setDoc(doc(db, "familias", item.id), {
                        ...item.data,
                        importedAt: serverTimestamp(),
                        createdAt: item.data.createdAt || serverTimestamp(),
                        status: 'Ativo'
                    }, { merge: true });

                    newLogs.push({ status: 'success', msg: `Família: ${item.Nome}` });
                    successCount++;

                } else if (item.type === 'membro') {
                    if (!item.parentId) throw new Error("Membro sem ParentID");

                    await setDoc(doc(db, "familias", item.parentId, "membros", item.id), {
                        ...item.data,
                        importedAt: serverTimestamp()
                    }, { merge: true });

                    newLogs.push({ status: 'success', msg: `Membro: ${item.Nome}` });
                    successCount++;

                } else {
                    const row = item;
                    const email = row['E-mail'] || row['Email'] || row['email'];
                    const nome = row['Nome'] || row['Nome Completo'] || row['nome'];

                    if (!email && !nome && row.type !== 'csv_flat') continue;

                    let docId = email ? email.replace(/[.#$[\]]/g, '_') : `import_${Date.now()}_${row._id}`;

                    const familyPayload = {
                        repName: nome || 'Sem Nome',
                        email: email || '',
                        importedData: row,
                        source: 'csv_import',
                        importedAt: serverTimestamp(),
                        createdAt: serverTimestamp(),
                        status: 'Ativo'
                    };

                    await setDoc(doc(db, "familias", docId), familyPayload, { merge: true });
                    successCount++;
                    newLogs.push({ status: 'success', msg: `Importado (CSV): ${nome || email}` });
                }

            } catch (error) {
                console.error(error);
                errorCount++;
                newLogs.push({ status: 'error', msg: `Erro linha ${item._id + 1}: ${error.message}` });
            }
        }

        setImportLog(newLogs);
        setIsProcessing(false);
        alert(`Importação concluída!\nSucessos: ${successCount}\nErros: ${errorCount}`);
    };

    const reset = () => {
        setFile(null);
        setPreviewData([]);
        setHeaders([]);
        setImportLog([]);
    };

    return (
        <div className="bg-white p-6 rounded-lg shadow-sm border border-stone-200">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-history-green flex items-center gap-2">
                    <FileText /> Importação em Massa (CSV)
                </h2>
                {file && (
                    <button onClick={reset} className="text-sm text-red-500 hover:text-red-700 flex items-center gap-1">
                        <X size={16} /> Cancelar / Limpar
                    </button>
                )}
            </div>

            {!file ? (
                <div className="border-2 border-dashed border-stone-300 rounded-lg p-10 text-center hover:bg-stone-50 transition-colors">
                    <Upload className="mx-auto text-stone-400 mb-4" size={48} />
                    <h3 className="text-lg font-bold text-stone-700 mb-2">Arraste seu arquivo CSV ou JSON aqui</h3>
                    <p className="text-stone-500 mb-4 text-sm">ou clique para selecionar do computador</p>
                    <input
                        type="file"
                        accept=".csv,.json"
                        onChange={handleFileUpload}
                        className="hidden"
                        id="csv-upload"
                    />
                    <label
                        htmlFor="csv-upload"
                        className="inline-block bg-history-gold text-history-green font-bold py-2 px-6 rounded-md cursor-pointer hover:bg-yellow-500 transition-colors"
                    >
                        Selecionar Arquivo
                    </label>
                    <p className="mt-4 text-xs text-stone-400">
                        Suporta: .csv (simples) e .json (backup completo)
                    </p>


                    {role === 'master' && (
                        <div className="mt-8 pt-6 border-t border-stone-100 flex justify-center gap-4">
                            <button
                                onClick={handleRecoverLegacy}
                                className="bg-stone-100 text-stone-600 hover:bg-stone-200 px-4 py-2 rounded text-xs font-bold flex items-center gap-2"
                            >
                                <FileText size={14} /> Resgatar Dados do Sistema Antigo
                            </button>

                            <button
                                onClick={handleNukeDatabase}
                                className="bg-red-50 text-red-600 hover:bg-red-100 px-4 py-2 rounded text-xs font-bold flex items-center gap-2 border border-red-200"
                            >
                                <X size={14} /> FAXINA GERAL (Apagar Tudo)
                            </button>
                        </div>
                    )}
                </div>
            ) : (
                <div className="space-y-6 animate-fade-in">
                    <div className="bg-stone-100 p-4 rounded flex justify-between items-center">
                        <div>
                            <span className="text-xs font-bold text-stone-500 uppercase">Arquivo Selecionado</span>
                            <p className="font-bold text-stone-800">{file.name}</p>
                            <p className="text-xs text-stone-500">{previewData.length} registros encontrados</p>
                        </div>
                        <button
                            onClick={processImport}
                            disabled={isProcessing}
                            className={`flex items-center gap-2 px-6 py-2 rounded font-bold text-white shadow-md transition-all ${isProcessing ? 'bg-stone-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'}`}
                        >
                            {isProcessing ? (
                                <>Processando...</>
                            ) : (
                                <><Save size={18} /> Iniciar Importação</>
                            )}
                        </button>
                    </div>

                    <div className="overflow-x-auto border border-stone-200 rounded-lg max-h-[400px]">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-stone-50 text-xs text-stone-500 uppercase sticky top-0 shadow-sm">
                                <tr>
                                    <th className="px-4 py-2 border-b">#</th>
                                    {headers.map(h => (
                                        <th key={h} className="px-4 py-2 border-b whitespace-nowrap">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-stone-100">
                                {previewData.slice(0, 100).map((row, idx) => (
                                    <tr key={idx} className="hover:bg-stone-50">
                                        <td className="px-4 py-2 text-stone-400 text-xs">{idx + 1}</td>
                                        {headers.map(h => (
                                            <td key={h} className="px-4 py-2 whitespace-nowrap text-stone-700 max-w-[200px] overflow-hidden text-ellipsis">
                                                {row[h]}
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                                {previewData.length > 100 && (
                                    <tr>
                                        <td colSpan={headers.length + 1} className="text-center py-2 text-stone-400 text-xs italic">
                                            ... e mais {previewData.length - 100} linhas ...
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {importLog.length > 0 && (
                        <div className="border border-stone-200 rounded-lg p-4 bg-stone-50 max-h-[200px] overflow-y-auto">
                            <h4 className="font-bold text-stone-700 mb-2 text-xs uppercase">Log de Processamento</h4>
                            <ul className="space-y-1">
                                {importLog.map((log, i) => (
                                    <li key={i} className={`text-xs flex items-center gap-2 ${log.status === 'success' ? 'text-green-700' : 'text-red-600'}`}>
                                        {log.status === 'success' ? <CheckCircle size={12} /> : <AlertCircle size={12} />}
                                        {log.msg}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
