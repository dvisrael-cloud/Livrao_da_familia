import React from 'react';

export const Dashboard = ({ records, onSelectEdit, onSelectNew, userEmail }) => {
    // Graus que sugerimos preencher
    const REQUIRED_RELATIONS = [
        "Pai", "Mãe"
    ];

    // Graus secundários que aparecem sugeridos
    const SECONDARY_RELATIONS = [
        "Avô Paterno", "Avó Paterna",
        "Avô Materno", "Avó Materna"
    ];

    // Helper para normalizar strings (Case Insensitive + Trim)
    const normalize = (str) => str ? str.toString().trim().toLowerCase() : '';

    // Filtra registros por parentesco
    const findRecord = (relation) => records.find(r => normalize(r.relationship) === normalize(relation));

    // Todos os registros que não são os principais
    const otherRecords = records.filter(r => {
        const rel = normalize(r.relationship);
        const isRequired = REQUIRED_RELATIONS.some(req => normalize(req) === rel);
        const isSecondary = SECONDARY_RELATIONS.some(sec => normalize(sec) === rel);
        return !isRequired && !isSecondary;
    });

    // Pega dados do representante (do primeiro registro encontrado, se houver)
    const repName = records.length > 0 ? records[0].repName : '';

    const renderCard = (relation, isRequired = false) => {
        const record = findRecord(relation);
        const exists = !!record;

        return (
            <div
                key={relation}
                onClick={() => exists ? onSelectEdit(record) : onSelectNew(relation)}
                className={`
                    cursor-pointer p-4 rounded-lg border-2 transition-all group relative
                    ${exists
                        ? 'bg-white border-history-green hover:shadow-md'
                        : 'bg-stone-50 border-stone-200 border-dashed hover:border-history-gold hover:bg-yellow-50'}
                `}
            >
                <div className="flex justify-between items-start mb-2">
                    <span className={`text-sm font-bold uppercase tracking-wide ${exists ? 'text-history-green' : 'text-stone-400'}`}>
                        {relation}
                    </span>
                    {exists && <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full">Cadastrado</span>}
                </div>

                {exists ? (
                    <div>
                        <div className="font-serif text-xl text-stone-900 font-bold mb-1">
                            {record.fullName}
                        </div>
                        <div className="text-sm text-stone-500">
                            {record.birthDate ? new Date(record.birthDate).getFullYear() : '?'} — {record.vitalStatus === 'Falecido' ? 'Falecido' : 'Presente'}
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-4 text-stone-400 group-hover:text-history-gold">
                        <span className="text-3xl mb-1">+</span>
                        <span className="text-sm font-medium">Adicionar</span>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="max-w-4xl mx-auto px-4 py-8">
            <h2 className="text-2xl font-serif text-history-green font-bold mb-6 border-b border-stone-200 pb-2">
                Árvore Familiar de {repName || userEmail}
            </h2>
            {repName && (
                <div className="text-sm text-stone-500 mb-6 -mt-4">
                    Representante: {repName} • {userEmail}
                </div>
            )}

            {/* Pais (Obrigatórios/Destaque) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                {REQUIRED_RELATIONS.map(rel => renderCard(rel, true))}
            </div>

            {/* Avós (Secundários) */}
            <h3 className="text-sm font-bold text-stone-500 uppercase mb-4">Avós</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                {SECONDARY_RELATIONS.map(rel => renderCard(rel))}
            </div>

            {/* Outros (Tios, etc) */}
            <h3 className="text-sm font-bold text-stone-500 uppercase mb-4">Outros Familiares Cadastrados</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                {otherRecords.map(record => (
                    <div
                        key={record._rowIndex}
                        onClick={() => onSelectEdit(record)}
                        className="cursor-pointer bg-white p-4 rounded-lg border border-stone-200 hover:border-history-green hover:shadow-md transition-all"
                    >
                        <div className="text-xs font-bold text-stone-400 uppercase mb-1">{record.relationship}</div>
                        <div className="font-serif font-bold text-stone-900 truncate">{record.fullName}</div>
                    </div>
                ))}

                {/* Card para Adicionar "Outro" */}
                <div
                    onClick={() => onSelectNew('Outro')}
                    className="cursor-pointer bg-stone-50 p-4 rounded-lg border-2 border-dashed border-stone-200 hover:border-history-gold hover:bg-yellow-50 transition-all flex items-center justify-center gap-2 text-stone-400 hover:text-history-gold"
                >
                    <span className="text-xl font-bold">+</span>
                    <span className="font-medium">Cadastrar Outro</span>
                </div>
            </div>
        </div>
    );
};
