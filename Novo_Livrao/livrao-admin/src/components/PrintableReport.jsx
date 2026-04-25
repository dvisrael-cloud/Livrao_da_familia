import React from 'react';
import { BookOpen } from 'lucide-react';
import { formConfig } from '../constants/adminFormConfig';

export const PrintableReport = React.forwardRef(({ data }, ref) => {
    if (!data) return null;

    // Detect if this is a Family View (Invite) or Individual Member
    // Families have 'members' collection/array. Members have 'relationshipInfo'.
    const isFamilyView = data.members || (data.repName && !data.relationshipInfo);

    // --- FAMILY REPORT (Summary + List) ---
    if (isFamilyView) {
        const membersList = data.members ? Object.values(data.members) : [];
        const address = data.street ?
            `${data.street}, ${data.number}${data.complement ? ' ' + data.complement : ''} - ${data.neighborhood}, ${data.city}/${data.state} (${data.zipCode})`
            : 'Endereço não cadastrado';

        return (
            <div ref={ref} className="p-12 max-w-[210mm] mx-auto bg-white text-stone-900 print:p-8">
                {/* Header */}
                <div className="border-b-4 border-history-green pb-6 mb-8 flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-serif font-bold text-history-green mb-2">Relatório Familiar</h1>
                        <h2 className="text-xl text-stone-600">Família {data.repName?.split(' ').pop()}</h2>
                    </div>
                    <div className="opacity-80">
                        <BookOpen size={48} className="text-history-green" />
                    </div>
                </div>

                {/* Dados Gerais */}
                <div className="bg-stone-50 border border-stone-200 rounded-lg p-6 mb-8">
                    <h3 className="text-history-green font-bold uppercase tracking-wider text-sm mb-4 border-b border-stone-200 pb-2">
                        Dados Gerais do Representante
                    </h3>
                    <div className="grid grid-cols-2 gap-6 text-sm">
                        <div>
                            <span className="block text-xs text-stone-500 uppercase font-bold">Representante</span>
                            <span className="block text-lg font-medium">{data.repName}</span>
                        </div>
                        <div>
                            <span className="block text-xs text-stone-500 uppercase font-bold">ID da Família</span>
                            <span className="block font-mono text-stone-600">{data.uid || data.id}</span>
                        </div>
                        <div>
                            <span className="block text-xs text-stone-500 uppercase font-bold">E-mail</span>
                            <span>{data.email || data.repEmail || '---'}</span>
                        </div>
                        <div>
                            <span className="block text-xs text-stone-500 uppercase font-bold">Telefone</span>
                            <span>{data.repPhone || data.telefone || '---'}</span>
                        </div>
                        <div>
                            <span className="block text-xs text-stone-500 uppercase font-bold">Data de Nascimento</span>
                            <span>{data.birthDate || 'Não informado'}</span>
                        </div>
                        <div>
                            <span className="block text-xs text-stone-500 uppercase font-bold">Profissão</span>
                            <span>{data.profession || 'Não informado'}</span>
                        </div>
                        <div className="col-span-2">
                            <span className="block text-xs text-stone-500 uppercase font-bold">Endereço</span>
                            <span>{address}</span>
                        </div>
                    </div>
                </div>

                {/* Composição Familiar */}
                <div className="mb-8">
                    <h3 className="text-history-green font-bold uppercase tracking-wider text-sm mb-4 border-b border-stone-200 pb-2 flex justify-between">
                        <span>Composição Familiar</span>
                        <span className="text-stone-500 normal-case">{membersList.length} membros</span>
                    </h3>

                    {membersList.length > 0 ? (
                        <table className="w-full text-sm text-left border-collapse">
                            <thead>
                                <tr className="bg-stone-100 text-stone-500 text-xs uppercase">
                                    <th className="px-4 py-2 border-b border-stone-200">Nome</th>
                                    <th className="px-4 py-2 border-b border-stone-200">Papel</th>
                                    <th className="px-4 py-2 border-b border-stone-200">Nascimento</th>
                                    <th className="px-4 py-2 border-b border-stone-200 text-right">Progresso</th>
                                </tr>
                            </thead>
                            <tbody>
                                {membersList.map((m, i) => (
                                    <tr key={i} className="border-b border-stone-100 hover:bg-stone-50">
                                        <td className="px-4 py-2 font-bold text-stone-800">{m.nomeCompleto || m.name}</td>
                                        <td className="px-4 py-2">
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${m.relationshipInfo?.papel === 'conjuge' ? 'bg-pink-100 text-pink-700' :
                                                    m.relationshipInfo?.papel === 'filho' ? 'bg-blue-100 text-blue-700' :
                                                        'bg-stone-100 text-stone-600'
                                                }`}>
                                                {m.relationshipInfo?.papel || 'Membro'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-2 text-stone-600">{m.dataNascimento || '-'}</td>
                                        <td className="px-4 py-2 text-right font-mono text-stone-500">
                                            {(m.completion || 0)}%
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <p className="text-stone-400 italic">Nenhum membro adicional cadastrado.</p>
                    )}
                </div>

                {/* FOOTER */}
                <div className="mt-12 pt-6 border-t border-stone-200 text-center text-xs text-stone-400">
                    Gerado em {new Date().toLocaleDateString()} • Livrão da Família (Relatório Geral)
                </div>
            </div>
        );
    }

    // --- INDIVIDUAL REPORT (Existing Logic) ---
    // 1. Prepare Config: Sort by order
    const sortedConfig = [...formConfig].sort((a, b) => a.order - b.order);

    // 2. Helper to format value
    const formatValue = (key, val) => {
        if (val === undefined || val === null || val === '') return '---';
        if (typeof val === 'boolean') return val ? 'Sim' : 'Não';
        if (typeof val === 'object') {
            if (val.seconds) return new Date(val.seconds * 1000).toLocaleDateString(); // Timestamp
            if (Array.isArray(val)) return val.join(', ');
            return JSON.stringify(val);
        }
        return String(val);
    };

    // 3. Render logic: Group by Section
    // Tracks current section to output headers
    let currentSection = '';

    return (
        <div ref={ref} className="p-8 max-w-[210mm] mx-auto bg-white text-stone-900 print:p-0">
            {/* HEADER */}
            <div className="border-b-4 border-emerald-800 pb-6 mb-8 flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-serif font-bold text-emerald-900 mb-2">Livrão da Família</h1>
                    <h2 className="text-xl text-stone-600">Ficha de Dados: {data.relationshipInfo?.papel || 'Membro'}</h2>
                </div>
                <div className="opacity-80">
                    <BookOpen size={48} className="text-emerald-800" />
                </div>
            </div>

            {/* DADOS CADASTRAIS (Topo Fixo) */}
            <div className="bg-stone-50 border border-stone-200 rounded-lg p-6 mb-8">
                <h3 className="text-emerald-800 font-bold uppercase tracking-wider text-sm mb-4 border-b border-stone-200 pb-2">
                    Identificação
                </h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                    {/* Only show relevant individual info */}
                    <div>
                        <span className="block text-xs text-stone-500 uppercase">Nome Completo</span>
                        <strong className="text-lg">{data.nomeCompleto || data.name}</strong>
                    </div>
                    <div>
                        <span className="block text-xs text-stone-500 uppercase">Papel na Família</span>
                        <strong className="text-lg">{data.relationshipInfo?.papel || 'Membro'}</strong>
                    </div>
                    <div>
                        <span className="block text-xs text-stone-500 uppercase">E-mail</span>
                        <span>{data.email || '---'}</span>
                    </div>
                    <div>
                        <span className="block text-xs text-stone-500 uppercase">Telefone</span>
                        <span>{data.phone || data.phones?.mobile || '---'}</span>
                    </div>
                </div>
            </div>

            {/* RELATÓRIO ORDENADO */}
            <table className="w-full text-sm text-left border-collapse">
                <tbody>
                    {sortedConfig.map((item, idx) => {
                        // Skip items without fieldId (StaticText, Buttons, Logos)
                        if (!item.fieldId) return null;

                        // Exclude fields already displayed in header or multimedia
                        // ALSO exclude 'repName' etc as they are context for the REPresentative, not member
                        const excludedFields = ['repName', 'repEmail', 'repPhone', 'nomeCompleto', 'fotoIdentificacao', 'fotoKetuba', 'relationshipInfo'];
                        if (excludedFields.includes(item.fieldId)) return null;

                        // Check if data exists (show only filled fields or explictly answered)
                        const val = data[item.fieldId];

                        // Use loose check for null/undefined/empty string
                        if (val === undefined || val === null || val === '') {
                            return null;
                        }

                        const renderSectionHeader = item.newSection && item.newSection !== currentSection;
                        if (renderSectionHeader) {
                            currentSection = item.newSection;
                        }

                        return (
                            <React.Fragment key={idx}>
                                {renderSectionHeader && (
                                    <tr className="break-before-auto break-after-avoid">
                                        <td colSpan="2" className="pt-8 pb-3">
                                            <h4 className="text-md font-bold text-emerald-700 uppercase border-b-2 border-emerald-100 pb-1">
                                                {item.newSection}
                                            </h4>
                                        </td>
                                    </tr>
                                )}
                                <tr className="border-b border-stone-100 hover:bg-stone-50 break-inside-avoid">
                                    <td className="px-4 py-2 w-1/3 font-semibold text-stone-600 align-top bg-stone-50/30">
                                        {item.label}
                                    </td>
                                    <td className="px-4 py-2 text-stone-800 font-serif whitespace-pre-line align-top">
                                        {formatValue(item.fieldId, val)}
                                    </td>
                                </tr>
                            </React.Fragment>
                        );
                    })}
                </tbody>
            </table>

            {/* FOOTER */}
            <div className="mt-12 pt-6 border-t border-stone-200 text-center text-xs text-stone-400">
                Gerado em {new Date().toLocaleDateString()} • Livrão da Família
            </div>
        </div>
    );
});

PrintableReport.displayName = 'PrintableReport';
