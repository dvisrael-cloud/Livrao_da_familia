import React from 'react';

export const StoryView = ({ data, onBack, onPrint }) => {

    // Helper: Formata data YYYY-MM-DD para DD/MM/YYYY
    const formatDate = (dateString) => {
        if (!dateString) return null;
        const [year, month, day] = dateString.split('-');
        return `${day}/${month}/${year}`;
    };

    const getBirthNarrative = () => {
        const date = formatDate(data.birthDate);
        const place = data.birthPlace;

        let text = "";
        if (data.fullName) {
            text += `${data.fullName} `;
        } else {
            text += "Este familiar ";
        }

        if (date && place) {
            text += `iniciou sua jornada em ${place}, nascido(a) na data de ${date}.`;
        } else if (date) {
            text += `nasceu em ${date}, em local ainda a ser registrado.`;
        } else if (place) {
            text += `nasceu em ${place}, em uma data que aguarda confirmação.`;
        } else {
            text += `tem seus dados de nascimento aguardando para serem contados.`;
        }

        if (data.maidenName) {
            text += ` Seu nome de solteiro(a) era ${data.maidenName}.`;
        }

        return text;
    };

    const getDeathNarrative = () => {
        if (data.vitalStatus !== 'Falecido') return null;

        const date = formatDate(data.deathDate);
        const place = data.deathPlace;
        const cem = data.cemetery;

        let text = "Sua despedida ocorreu";
        if (date) text += ` em ${date}`;
        if (place) text += `, na localidade de ${place}`;
        text += ".";

        if (cem) {
            text += ` Seu descanso eterno encontra-se no ${cem}.`;
        }

        return text;
    };

    const getMaritalNarrative = () => {
        if (!data.maritalStatus || data.maritalStatus === 'Solteiro') {
            return "Sobre sua vida conjugal, permaneceu solteiro(a) ou a informação ainda não foi registrada.";
        }

        const spouse = data.spouseName || <span className="italic text-stone-400">(nome do cônjuge a preencher)</span>;
        const marrDate = formatDate(data.marriageDate);

        let text = "";

        switch (data.maritalStatus) {
            case 'Casado':
            case 'União Estável':
                text = `Uniu sua vida à de ${typeof spouse === 'string' ? spouse : ''}`;
                if (typeof spouse !== 'string') text += "seu cônjuge";
                break;
            case 'Divorciado':
                text = `Compartilhou parte de sua trajetória com ${typeof spouse === 'string' ? spouse : 'seu ex-cônjuge'}`;
                break;
            case 'Viúvo':
                text = `Foi casado(a) com ${typeof spouse === 'string' ? spouse : 'seu cônjuge'}`;
                break;
            default:
                text = `Teve um relacionamento com ${typeof spouse === 'string' ? spouse : 'seu parceiro'}`;
        }

        if (marrDate) {
            text += `, selando esta união em ${marrDate}.`;
        } else {
            text += ".";
        }

        if (data.maritalStatus === 'Divorciado' && data.divorceDate) {
            text += ` O ciclo desta união encerrou-se oficialmente em ${formatDate(data.divorceDate)}.`;
        }

        if (data.maritalStatus === 'Viúvo') {
            if (data.spouseDeathDate) {
                text += ` A despedida de seu par ocorreu em ${formatDate(data.spouseDeathDate)}.`;
            } else {
                text += ` Tornou-se viúvo(a) após a partida de seu cônjuge.`;
            }
        }

        return text;
    };

    const getLifeNarrative = () => {
        const parts = [];

        if (data.occupation) {
            parts.push(`Dedicou seus esforços profissionais atuando como ${data.occupation}.`);
        } else {
            parts.push(`Sua trajetória profissional é um capítulo a ser escrito.`);
        }

        if (data.community) {
            parts.push(`Fez parte da comunidade ${data.community}, onde manteve suas raízes.`);
        }

        if (data.hobbies) {
            parts.push(`Nos momentos de lazer, encontrava alegria em: ${data.hobbies}.`);
        }

        if (data.residences) {
            parts.push(`Ao longo da vida, residiu em lugares como ${data.residences}.`);
        }

        return parts.join(" ");
    };

    return (
        <div className="min-h-screen bg-stone-100 py-8 print:bg-white print:py-0 font-serif">
            <div className="max-w-4xl mx-auto mb-8 flex justify-between items-center px-4 print:hidden">
                <button
                    onClick={onBack}
                    className="flex items-center gap-2 px-4 py-2 bg-stone-200 hover:bg-stone-300 text-stone-700 rounded-lg transition-colors"
                >
                    ← Voltar e Editar
                </button>
                <div className="text-stone-500 text-sm">
                    Revise o texto abaixo.
                </div>
                <button
                    onClick={onPrint}
                    className="flex items-center gap-2 px-6 py-2 bg-history-gold hover:bg-yellow-600 text-white font-bold rounded-lg shadow-md transition-transform hover:scale-105"
                >
                    🖨️ Imprimir Página
                </button>
            </div>

            <div className="max-w-[210mm] mx-auto bg-white p-[20mm] shadow-2xl print:shadow-none print:max-w-full print:p-0 text-stone-900 leading-relaxed">

                <div className="text-center border-b-2 border-stone-200 pb-8 mb-8">
                    <h1 className="text-4xl font-bold font-display text-history-green mb-2">
                        {data.fullName || "Nome do Familiar"}
                    </h1>
                    <p className="text-xl text-stone-500 italic">
                        {data.birthDate ? data.birthDate.split('-')[0] : '?'}
                        {' — '}
                        {data.vitalStatus === 'Falecido' && data.deathDate ? data.deathDate.split('-')[0] : (data.vitalStatus === 'Falecido' ? 'Falecido' : 'Presente')}
                    </p>
                </div>

                <div className="space-y-6 text-justify text-lg text-stone-800">

                    <section>
                        <h2 className="text-sm font-bold text-history-gold mb-2 uppercase tracking-widest text-center">Capítulo I: Origens</h2>
                        <p>{getBirthNarrative()}</p>
                    </section>

                    {(data.maritalStatus || data.spouseName) && (
                        <section>
                            <h2 className="text-sm font-bold text-history-gold mb-2 uppercase tracking-widest text-center">Capítulo II: Laços do Coração</h2>
                            <p>{getMaritalNarrative()}</p>
                            {data.relationship && (
                                <p className="mt-2 text-stone-500 italic text-base text-center">
                                    Parentesco registrado: {data.relationship}
                                </p>
                            )}
                        </section>
                    )}

                    <section>
                        <h2 className="text-sm font-bold text-history-gold mb-2 uppercase tracking-widest text-center">Capítulo III: Trajetória</h2>
                        <p>{getLifeNarrative()}</p>
                    </section>

                    {data.vitalStatus === 'Falecido' && (
                        <section>
                            <h2 className="text-sm font-bold text-history-gold mb-2 uppercase tracking-widest text-center">Capítulo IV: Despedida</h2>
                            <p>{getDeathNarrative()}</p>
                        </section>
                    )}

                    {data.history && (
                        <section className="mt-8 pt-6 border-t border-stone-100">
                            <h2 className="text-sm font-bold text-history-gold mb-4 uppercase tracking-widest text-center">Memórias Vivas</h2>
                            <div className="whitespace-pre-wrap italic text-stone-700 font-medium">
                                "{data.history}"
                            </div>
                        </section>
                    )}

                </div>

                <div className="mt-16 pt-8 border-t border-stone-200 text-center text-xs text-stone-400">
                    <p>Registro realizado por {data.repName} em {new Date().toLocaleDateString()}.</p>
                    <p className="mt-1">Livrão da Família — Preservando Histórias</p>
                </div>

            </div>
        </div>
    );
};
