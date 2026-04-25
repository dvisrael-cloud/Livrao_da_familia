import React from 'react';
import { FormSection } from '../components/FormSection';
import { TextAreaField } from '../components/InputFields';

export const Media = ({ data, updateData }) => (
    <FormSection title="5. Resumo e Mídia" id="media">
        <div className="grid gap-4">
            <TextAreaField
                label="Resumo Histórico (Texto livre sobre a pessoa)"
                value={data.history}
                onChange={(e) => updateData('history', e.target.value)}
                rows={6}
                placeholder="Conte a história de vida aqui..."
            />

            <TextAreaField
                label="Detalhes e Legendas das Fotos"
                value={data.photoCaptions}
                onChange={(e) => updateData('photoCaptions', e.target.value)}
                rows={4}
                placeholder="Descreva quem está nas fotos ou documentos enviados..."
            />

            <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-history-green">Fotos e Documentos Adicionais (Máximo 7)</label>
                <div className="border-2 border-dashed border-stone-300 rounded-md p-6 flex flex-col items-center justify-center text-stone-500 bg-stone-50 hover:bg-stone-100 transition-colors cursor-pointer">
                    <span>(Upload de arquivos em breve - por enquanto, envie por email/WhatsApp)</span>
                    {/* Placeholder for future file input implementation */}
                    <input type="file" multiple className="hidden" />
                </div>
            </div>
        </div>
    </FormSection>
);
