import React from 'react';
import { FormSection } from '../components/FormSection';
import { InputField, SelectField, DateInputField } from '../components/InputFields';
import { UploadComponent } from '../components/UploadComponent';

export const BiographicalData = ({ data, updateData }) => (
    <FormSection title="3. Dados Biográficos Essenciais" id="bio">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* --- Identificação --- */}
            <div className="md:col-span-2">
                <InputField
                    label="Nome Completo (com todos os sobrenomes)"
                    value={data.fullName}
                    onChange={(e) => updateData('fullName', e.target.value)}
                    required
                />
            </div>

            <InputField
                label="Sobrenomes de Solteiro(a)"
                value={data.maidenName}
                onChange={(e) => updateData('maidenName', e.target.value)}
            />

            <InputField
                label="Apelido / Nome Hebraico"
                value={data.nickname}
                onChange={(e) => updateData('nickname', e.target.value)}
            />

            {/* --- Filiação (Novo) --- */}
            <div className="md:col-span-2 border-t border-stone-200 pt-4 mt-2">
                <h4 className="text-sm font-semibold text-history-green mb-3 uppercase tracking-wider">Filiação</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <InputField
                        label="Nome do Pai"
                        value={data.fatherName}
                        onChange={(e) => updateData('fatherName', e.target.value)}
                    />
                    <InputField
                        label="Nome da Mãe"
                        value={data.motherName}
                        onChange={(e) => updateData('motherName', e.target.value)}
                    />
                </div>
            </div>

            {/* --- Nascimento e Origem (Expandido) --- */}
            <div className="md:col-span-2 border-t border-stone-200 pt-4 mt-2">
                <h4 className="text-sm font-semibold text-history-green mb-3 uppercase tracking-wider">Nascimento e Origem</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <DateInputField
                        label="Data de Nascimento"
                        value={data.birthDate}
                        onChange={(val) => updateData('birthDate', val)}
                    />
                    <InputField
                        label="Cidade de Nascimento"
                        value={data.birthCity}
                        onChange={(e) => updateData('birthCity', e.target.value)}
                    />
                    <InputField
                        label="Estado/Província"
                        value={data.birthState}
                        onChange={(e) => updateData('birthState', e.target.value)}
                    />
                    <InputField
                        label="País de Origem"
                        value={data.birthCountry}
                        onChange={(e) => updateData('birthCountry', e.target.value)}
                    />
                </div>
            </div>

            {/* --- Cidadania e Imigração (Novo) --- */}
            <div className="md:col-span-2 border-t border-stone-200 pt-4 mt-2">
                <h4 className="text-sm font-semibold text-history-green mb-3 uppercase tracking-wider">Imigração e Identidade</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <InputField
                        label="Religião"
                        value={data.religion}
                        onChange={(e) => updateData('religion', e.target.value)}
                    />
                    <InputField
                        label="Naturalização"
                        value={data.naturalization}
                        onChange={(e) => updateData('naturalization', e.target.value)}
                    />
                    <InputField
                        label="Navio de Chegada"
                        value={data.shipName}
                        onChange={(e) => updateData('shipName', e.target.value)}
                    />
                    <DateInputField
                        label="Data da Chegada"
                        value={data.arrivalDate}
                        onChange={(val) => updateData('arrivalDate', val)}
                    />
                    <div className="md:col-span-2">
                        <InputField
                            label="Porto de Chegada"
                            value={data.arrivalPort}
                            onChange={(e) => updateData('arrivalPort', e.target.value)}
                        />
                    </div>
                </div>
            </div>

            {/* --- Situação Vital --- */}
            <div className="md:col-span-2 border-t border-stone-200 pt-4 mt-2">
                <SelectField
                    label="Situação Vital"
                    value={data.vitalStatus || ''}
                    onChange={(e) => updateData('vitalStatus', e.target.value)}
                    options={["Vivo", "Falecido"]}
                />
            </div>

            {data.vitalStatus === 'Falecido' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:col-span-2 bg-stone-50 p-4 rounded-lg border border-stone-200">
                    <div className="md:col-span-3 text-sm font-semibold text-stone-500 uppercase tracking-wide mb-2">
                        Informações do Falecimento
                    </div>
                    <DateInputField
                        label="Data de Falecimento"
                        value={data.deathDate || ''}
                        onChange={(val) => updateData('deathDate', val)}
                    />
                    <InputField
                        label="Causa do Falecimento"
                        value={data.deathCause || ''}
                        onChange={(e) => updateData('deathCause', e.target.value)}
                    />
                    <InputField
                        label="Local de Falecimento"
                        placeholder="Cidade/Estado/País"
                        value={data.deathPlace || ''}
                        onChange={(e) => updateData('deathPlace', e.target.value)}
                    />
                    <div className="md:col-span-3">
                        <InputField
                            label="Cemitério (Onde está sepultado)"
                            placeholder="Nome do cemitério e cidade"
                            value={data.cemetery || ''}
                            onChange={(e) => updateData('cemetery', e.target.value)}
                        />
                        <InputField
                            label="Local Sepultamento"
                            placeholder="Quadra, Setor, Túmulo (Se souber)"
                            value={data.burialPlace || ''} // Usando burialPlace que já estava no state
                            onChange={(e) => updateData('burialPlace', e.target.value)}
                        />
                    </div>
                </div>
            )}

            {/* --- Situação Conjugal --- */}
            <div className="md:col-span-2 border-t border-stone-200 pt-4 mt-2">
                <SelectField
                    label="Situação Conjugal"
                    value={data.maritalStatus || ''}
                    onChange={(e) => updateData('maritalStatus', e.target.value)}
                    options={["Solteiro", "Casado", "Divorciado", "Viúvo", "União Estável"]}
                />
            </div>

            {data.maritalStatus && data.maritalStatus !== 'Solteiro' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:col-span-2 bg-stone-50 p-4 rounded-lg border border-stone-200">
                    <div className="md:col-span-2 text-sm font-semibold text-stone-500 uppercase tracking-wide mb-2">
                        Dados do Cônjuge & Casamento
                    </div>
                    <InputField
                        label="Nome Completo do Cônjuge"
                        placeholder="Nome do marido/esposa"
                        value={data.spouseName || ''}
                        onChange={(e) => updateData('spouseName', e.target.value)}
                    />
                    <DateInputField
                        label="Data de Nascimento do Cônjuge"
                        value={data.spouseBirthDate || ''}
                        onChange={(val) => updateData('spouseBirthDate', val)}
                    />

                    <div className="flex flex-col gap-2">
                        <DateInputField
                            label="Data do Casamento"
                            value={data.marriageDate || ''}
                            onChange={(val) => updateData('marriageDate', val)}
                        />
                        <UploadComponent
                            label="Upload da Ketubá (Contrato de Casamento)"
                            value={data.ketuba}
                            onChange={(val) => updateData('ketuba', val)}
                            maxFiles={1}
                        />
                    </div>
                    <InputField
                        label="Local do Casamento"
                        value={data.marriagePlace || ''}
                        onChange={(e) => updateData('marriagePlace', e.target.value)}
                    />

                    {data.maritalStatus === 'Divorciado' && (
                        <DateInputField
                            label="Data do Divórcio"
                            value={data.divorceDate || ''}
                            onChange={(val) => updateData('divorceDate', val)}
                        />
                    )}

                    {data.maritalStatus === 'Viúvo' && (
                        <DateInputField
                            label="Data de Falecimento do Cônjuge"
                            value={data.spouseDeathDate || ''}
                            onChange={(val) => updateData('spouseDeathDate', val)}
                        />
                    )}

                </div>
            )}
        </div>
    </FormSection>
);
