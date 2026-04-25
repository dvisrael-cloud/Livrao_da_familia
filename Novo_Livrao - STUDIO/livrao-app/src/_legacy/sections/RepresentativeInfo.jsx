import React from 'react';
import { FormSection } from '../components/FormSection';
import { InputField } from '../components/InputFields';

export const RepresentativeInfo = ({ data, updateData }) => (
    <FormSection title="1. Informações do Representante" id="representative">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InputField
                label="Nome do Representante"
                value={data.repName}
                onChange={(e) => updateData('repName', e.target.value)}
                placeholder="Quem está preenchendo?"
                required
            />
            <InputField
                label="E-mail"
                type="email"
                value={data.repEmail}
                onChange={(e) => updateData('repEmail', e.target.value)}
                placeholder="contato@exemplo.com"
                required
            />
            <InputField
                label="Telefone"
                type="tel"
                value={data.repPhone}
                onChange={(e) => updateData('repPhone', e.target.value)}
                placeholder="(XX) 99999-9999"
            />
        </div>
    </FormSection>
);
