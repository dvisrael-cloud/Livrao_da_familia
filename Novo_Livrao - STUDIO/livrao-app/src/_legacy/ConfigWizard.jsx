import React, { useState, useMemo } from 'react';
import { formConfig } from '../constants/formConfig';
import { InputField, SelectField, DateInputField, TextAreaField, StaticText, EditableField, CheckboxField, SingleSelectGroup } from './InputFields';
import { UploadComponent } from './UploadComponent';
import { LocationSelector } from './LocationSelector';
import { FormSection } from './FormSection';
import { ArrowLeft, ArrowRight, Save } from 'lucide-react';

export const ConfigWizard = ({ data, updateData, onSave, isSubmitting }) => {
    // 1. Group config by sections to define "Steps"
    const sections = useMemo(() => {
        const uniqueSections = [];
        const sectionMap = new Map();

        formConfig.forEach(item => {
            if (!sectionMap.has(item.wizardSection)) {
                sectionMap.set(item.wizardSection, []);
                uniqueSections.push(item.wizardSection);
            }
            sectionMap.get(item.wizardSection).push(item);
        });

        return uniqueSections.map(sectionName => ({
            name: sectionName,
            items: sectionMap.get(sectionName).sort((a, b) => a.order - b.order)
        }));
    }, []);

    const [currentStepIndex, setCurrentStepIndex] = useState(0);
    const currentStep = sections[currentStepIndex];

    // Helper to evaluate conditional rules
    const isVisible = (item) => {
        if (!item.conditionalRule) return true;

        let operator = '==';
        if (item.conditionalRule.includes('!=')) operator = '!=';
        if (item.conditionalRule.includes('>=')) operator = '>=';
        if (item.conditionalRule.includes(' in ')) operator = ' in ';

        const [field, valueRaw] = item.conditionalRule.split(operator).map(s => s.trim());
        const expectedValue = valueRaw.replace(/['"]/g, ''); // Remove quotes

        const actualValue = data[field];

        // Handle Boolean Strings (true/false) specially
        if (expectedValue === 'true' || expectedValue === 'false') {
            const boolExpected = expectedValue === 'true';
            const boolActual = !!actualValue; // Force boolean

            if (operator === '==') return boolActual === boolExpected;
            if (operator === '!=') return boolActual !== boolExpected;
        }

        if (operator === '==') return actualValue === expectedValue;
        if (operator === '!=') return actualValue && actualValue !== expectedValue;
        if (operator === ' in ') {
            const options = expectedValue.split(',').map(s => s.trim());
            return options.includes(actualValue);
        }
        if (operator === '>=') {
            const numActual = parseInt(actualValue) || 0;
            const numExpected = parseInt(expectedValue) || 0;
            return numActual >= numExpected;
        }

        return false;

        // Boolean check (handle "true"/"false" strings from config)
        if (expectedValue === 'true' || expectedValue === 'false') {
            const boolExpected = expectedValue === 'true';
            return (!!actualValue) === boolExpected;
        }

        return false;
    };

    // Helper to render dynamic component
    const renderComponent = (item) => {
        if (!isVisible(item)) return null;

        const commonProps = {
            key: item.order,
            label: item.label,
            value: item.fieldId ? data[item.fieldId] : undefined,
            onChange: (e) => {
                // Handling different event types or direct values
                const val = e && e.target ? e.target.value : e;
                if (item.fieldId) updateData(item.fieldId, val);
            },
            placeholder: item.placeholder,
            placeholder: item.placeholder,
            required: item.required,
            disabled: item.disabled
        };

        switch (item.component) {
            case 'InputField':
                return <InputField {...commonProps} />;
            case 'EditableField':
                return <EditableField {...commonProps} />;
            case 'LocationSelector':
                return <LocationSelector key={commonProps.key} data={data} updateData={updateData} />;
            case 'SelectField':
                return <SelectField {...commonProps} options={item.options || []} />; // Handle dynamic options later if needed (countries/states)
            case 'DateInputField':
                return <DateInputField {...commonProps} />;
            case 'TextAreaField':
                return <TextAreaField {...commonProps} />;
            case 'UploadComponent':
                return <UploadComponent {...commonProps} maxFiles={item.maxFiles} />;
            case 'StaticText':
                return <StaticText content={item.content} />;
            case 'CheckboxField':
                return <CheckboxField {...commonProps} />;
            case 'SingleSelectGroup':
                return (
                    <SingleSelectGroup
                        label={item.label}
                        value={data[item.fieldId]}
                        options={item.options}
                        onChange={(val) => updateData(item.fieldId, val)}
                    />
                );
            case 'Logomarca do livrão':
                return <div className="text-center py-8"><h1 className="text-4xl font-serif text-history-green font-bold">Livrão da Família</h1></div>;
            case 'Prosseguir/de acordo':
                return (
                    <div className="flex justify-center mt-8">
                        <button
                            onClick={handleNext}
                            className="bg-history-green text-white px-8 py-3 rounded-full font-bold text-lg hover:bg-opacity-90 shadow-lg flex items-center gap-2"
                        >
                            Começar <ArrowRight size={20} />
                        </button>
                    </div>
                );
            default:
                return <div className="text-red-500 text-xs">Componente desconhecido: {item.component}</div>;
        }
    };

    // Navigation
    const handleNext = () => {
        if (currentStepIndex < sections.length - 1) {
            setCurrentStepIndex(prev => prev + 1);
            window.scrollTo(0, 0);
        }
    };

    const handleBack = () => {
        if (currentStepIndex > 0) {
            setCurrentStepIndex(prev => prev - 1);
            window.scrollTo(0, 0);
        }
    };

    // Progress Bar
    const progress = ((currentStepIndex + 1) / sections.length) * 100;

    return (
        <div className="max-w-3xl mx-auto pb-24">

            {/* Progress Header */}
            <div className="mb-8 sticky top-16 z-40 bg-parchment pt-4 pb-2 transition-all">
                {/* Character Name Label (To keep context) */}
                {data.nomeCompleto && currentStep.name !== 'Boas-vindas' && (
                    <div className="mb-3 text-center animate-fade-in">
                        <span className="block text-[10px] font-bold font-mono text-stone-400 uppercase tracking-widest mb-1">Cadastrando Familiar</span>
                        <div className="inline-block px-4 py-1 bg-white border border-history-green/20 rounded-full shadow-sm">
                            <h2 className="text-sm font-bold text-history-green flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                                {data.nomeCompleto}
                            </h2>
                        </div>
                    </div>
                )}

                <div className="h-2 w-full bg-stone-200 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-history-green transition-all duration-500 ease-out"
                        style={{ width: `${progress}%` }}
                    ></div>
                </div>
                <div className="flex justify-between text-xs text-stone-500 mt-2 font-mono uppercase tracking-wider">
                    <span>Passo {currentStepIndex + 1} de {sections.length}</span>
                    <span>{currentStep.name}</span>
                </div>
            </div>

            {/* Step Content */}
            <div className="bg-white p-6 md:p-8 rounded-xl shadow-sm border border-stone-200 min-h-[400px]">
                {/* Find current subsection title if any - Filter Visible First to ensure correct title grouping */}
                {currentStep.items
                    .filter(item => isVisible(item))
                    .map((item, idx, visibleArr) => {
                        // Check if this item starts a new visible subsection title
                        const showTitle = idx === 0 || item.uiTitle !== visibleArr[idx - 1].uiTitle;

                        return (
                            <React.Fragment key={item.fieldId || idx}>
                                {showTitle && item.uiTitle && item.component !== 'Logomarca do livrão' && item.component !== 'Prosseguir/de acordo' && (
                                    <h2 className="text-2xl font-serif text-history-green font-bold mt-8 mb-4 border-b border-stone-100 pb-2">
                                        {item.uiTitle}
                                    </h2>
                                )}
                                <div className="mb-4">
                                    {renderComponent(item)}
                                </div>
                            </React.Fragment>
                        );
                    })}
            </div>

            {/* Footer Navigation */}
            {/* Hide default Nav for "Boas-vindas" since it uses custom button "Prosseguir" */}
            {currentStep.name !== 'Boas-vindas' && (
                <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-stone-200 shadow-xl z-50 flex justify-between max-w-4xl mx-auto md:relative md:bg-transparent md:border-0 md:shadow-none md:mt-8 md:p-0">
                    <button
                        onClick={handleBack}
                        disabled={currentStepIndex === 0}
                        className="px-6 py-3 bg-stone-200 text-stone-600 font-bold rounded-lg hover:bg-stone-300 disabled:opacity-50 flex items-center gap-2"
                    >
                        <ArrowLeft size={20} /> Voltar
                    </button>

                    {currentStepIndex === sections.length - 1 ? (
                        <button
                            onClick={onSave}
                            disabled={isSubmitting}
                            className="px-8 py-3 bg-history-green text-white font-bold rounded-lg hover:bg-opacity-90 shadow-md disabled:opacity-50 flex items-center gap-2"
                        >
                            <Save size={20} /> {isSubmitting ? 'Salvando...' : 'Finalizar e Salvar'}
                        </button>
                    ) : (
                        <button
                            onClick={handleNext}
                            className="px-8 py-3 bg-history-green text-white font-bold rounded-lg hover:bg-opacity-90 shadow-md flex items-center gap-2"
                        >
                            Próximo <ArrowRight size={20} />
                        </button>
                    )}
                </div>
            )}
        </div>
    );
};
