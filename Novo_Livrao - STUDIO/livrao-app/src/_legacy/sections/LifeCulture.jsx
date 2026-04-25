import React from 'react';
import { FormSection } from '../components/FormSection';
import { InputField, TextAreaField, SelectField } from '../components/InputFields';

export const LifeCulture = ({ data, updateData }) => (
    <FormSection title="4. Vida, Carreira e Cultura" id="life">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

            {/* --- Educação --- */}
            <div className="md:col-span-2 border-b border-stone-200 pb-4 mb-2">
                <h4 className="text-sm font-semibold text-history-green mb-3 uppercase tracking-wider">Educação</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <SelectField
                        label="Grau de Instrução"
                        value={data.education || ''}
                        onChange={(e) => updateData('education', e.target.value)}
                        options={[
                            "Fundamental Incompleto", "Fundamental Completo",
                            "Médio Incompleto", "Médio Completo",
                            "Superior Incompleto", "Superior Completo",
                            "Pós-Graduação", "Mestrado", "Doutorado", "Autodidata"
                        ]}
                    />
                    <div className="md:col-span-2">
                        <TextAreaField
                            label="Escolas e Universidades (Detalhes)"
                            value={data.schools}
                            onChange={(e) => updateData('schools', e.target.value)}
                            placeholder="Liste as escolas, cidades e anos aproximados."
                        />
                    </div>
                </div>
            </div>

            {/* --- Trabalho --- */}
            <div className="md:col-span-2 border-b border-stone-200 pb-4 mb-2">
                <h4 className="text-sm font-semibold text-history-green mb-3 uppercase tracking-wider">Trabalho e Realizações</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                        <InputField
                            label="Ocupação Principal"
                            value={data.occupation}
                            onChange={(e) => updateData('occupation', e.target.value)}
                            placeholder="Ex: Comerciante, Professor, Médico..."
                        />
                    </div>
                    <div className="md:col-span-2">
                        <TextAreaField
                            label="Locais de Trabalho (Empresas/Negócios)"
                            value={data.workplaces}
                            onChange={(e) => updateData('workplaces', e.target.value)}
                            placeholder="Onde trabalhou, cargos que ocupou."
                        />
                    </div>
                    <div className="md:col-span-2">
                        <TextAreaField
                            label="Realizações e Prêmios"
                            value={data.achievements}
                            onChange={(e) => updateData('achievements', e.target.value)}
                            placeholder="Conquistas profissionais ou pessoais importantes."
                        />
                    </div>
                </div>
            </div>

            {/* --- Residência e Viagens --- */}
            <div className="md:col-span-2">
                <TextAreaField
                    label="Cidades Onde Morou (Cronológico com Anos)"
                    value={data.residences}
                    onChange={(e) => updateData('residences', e.target.value)}
                    placeholder="Ex: 1950-1960: Belém; 1960-1970: Manaus..."
                />
            </div>

            <div className="md:col-span-2">
                <TextAreaField
                    label="Locais que Conheceu (Viagens, etc)"
                    value={data.places}
                    onChange={(e) => updateData('places', e.target.value)}
                />
            </div>

            {/* --- Vida Social e Comunitária --- */}
            <div className="md:col-span-2 border-t border-stone-200 pt-4 mt-2">
                <h4 className="text-sm font-semibold text-history-green mb-3 uppercase tracking-wider">Vida Social e Comunitária</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <InputField
                        label="Vida Comunitária (Cargos, Atividades)"
                        value={data.communityLife}
                        onChange={(e) => updateData('communityLife', e.target.value)}
                    />

                    <InputField
                        label="Sinagoga que Frequentava"
                        value={data.synagogue}
                        onChange={(e) => updateData('synagogue', e.target.value)}
                    />
                    <InputField
                        label="Estudos Judaicos / Professor(a)"
                        value={data.jewishStudies}
                        onChange={(e) => updateData('jewishStudies', e.target.value)}
                    />
                    <InputField
                        label="Idiomas que falava"
                        value={data.languages}
                        onChange={(e) => updateData('languages', e.target.value)}
                        placeholder="Ex: Português, Ladino, Hakitia, Hebraico..."
                    />
                </div>
            </div>

            <div className="md:col-span-2">
                <TextAreaField
                    label="Amizades Marcantes"
                    value={data.friends}
                    onChange={(e) => updateData('friends', e.target.value)}
                />
            </div>

            <div className="md:col-span-2">
                <InputField
                    label="Hobbies (Esporte, Leitura, Música...)"
                    value={data.hobbies}
                    onChange={(e) => updateData('hobbies', e.target.value)}
                />
            </div>

            {/* --- Legado e Curiosidades --- */}
            <div className="md:col-span-2 border-t border-stone-200 pt-4 mt-2">
                <h4 className="text-sm font-semibold text-history-green mb-3 uppercase tracking-wider">Narrativa Pessoal</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                        <TextAreaField
                            label="Curiosidades e Fatos Interessantes"
                            value={data.curiosities}
                            onChange={(e) => updateData('curiosities', e.target.value)}
                            placeholder="Histórias engraçadas, manias, características marcantes..."
                        />
                    </div>
                    <div className="md:col-span-2">
                        <TextAreaField
                            label="Legado Deixado (Mensagem para gerações)"
                            value={data.legacy}
                            onChange={(e) => updateData('legacy', e.target.value)}
                            placeholder="Qual o maior ensinamento que essa pessoa deixou?"
                        />
                    </div>
                </div>
            </div>

        </div>
    </FormSection>
);
