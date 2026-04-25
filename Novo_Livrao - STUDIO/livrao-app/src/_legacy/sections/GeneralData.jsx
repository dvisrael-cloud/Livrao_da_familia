import React from 'react';
import { FormSection } from '../components/FormSection';
import { SelectField, InputField } from '../components/InputFields';

export const GeneralData = ({ data, updateData }) => {

    // Categorias macro de parentesco
    const categories = [
        "Eu mesmo",
        "Meus pais",
        "Meus avós",
        "Meus bisavós",
        "Outro"
    ];

    // Detalhes por categoria
    const details = {
        "Meus pais": ["Pai", "Mãe"],
        "Meus avós": ["Avô Paterno", "Avó Paterna", "Avô Materno", "Avó Materna"],
        "Meus bisavós": [
            "Bisavô Paterno (Pai do Avô Paterno)", "Bisavó Paterna (Mãe do Avô Paterno)",
            "Bisavô Paterno (Pai da Avó Paterna)", "Bisavó Paterna (Mãe da Avó Paterna)",
            "Bisavô Materno (Pai do Avô Materno)", "Bisavó Materna (Mãe do Avô Materno)",
            "Bisavô Materno (Pai da Avó Materna)", "Bisavó Materna (Mãe da Avó Materna)"
        ]
    };

    // Helper para determinar a categoria atual baseado no valor salvo (para edição)
    const getCategoryFromValue = (val) => {
        if (!val) return "";
        if (val === "Eu mesmo") return "Eu mesmo";
        if (["Pai", "Mãe"].includes(val)) return "Meus pais";
        if (["Avô Paterno", "Avó Paterna", "Avô Materno", "Avó Materna"].includes(val)) return "Meus avós";
        if (val.includes("Bisavô") || val.includes("Bisavó")) return "Meus bisavós";
        return "Outro";
    };

    const [category, setCategory] = React.useState(getCategoryFromValue(data.relationship));

    // Handler para mudança de categoria
    const handleCategoryChange = (val) => {
        setCategory(val);
        if (val === "Eu mesmo") {
            updateData('relationship', "Eu mesmo");
            updateData('source', ''); // Limpa fonte pois pula
        } else if (val === "Outro") {
            updateData('relationship', "Outro");
        } else {
            updateData('relationship', ''); // Reseta para forçar escolha específica
        }
    };

    return (
        <FormSection title="2. Dados Gerais do Familiar" id="general">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                {/* Seção de Seleção de Parentesco - Árvore Genealógica */}
                <FamilyTreeSelector
                    value={data.relationshipInfo || { papel: '', nome: '' }}
                    onChange={(val) => updateData('relationshipInfo', val)}
                />

                <SelectField
                    label="Afiliação Comunitária Judaica"
                    value={data.community}
                    onChange={(e) => updateData('community', e.target.value)}
                    options={[
                        "Centro Israelita do Pará",
                        "Comitê Israelita do Amazonas",
                        "União Israelita Shel Guemilut Chassadim",
                        "Outros"
                    ]}
                />
            </div>
        </FormSection>
    );
};
