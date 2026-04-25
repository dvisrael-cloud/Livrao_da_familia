import React, { useMemo, useState, useCallback, useEffect } from 'react';
import { formConfig } from '../../constants/formConfig';
import { INITIAL_STATE } from '../../constants/initial_state';
import { Button } from '../../components/common/UI';
import { UploadWidget } from '../Upload/UploadWidget';
import { LocationSelector } from '../../components/LocationSelector';
import { FamilyTreeSelector } from '../../components/FamilyTreeSelector';
import { SourceInfoWidget } from './SourceInfoWidget';
import {
    FormInput,
    FormTextArea,
    FormDate,
    FormSelect,
    FormStaticText,
    FormCheckbox,
    UnsupportedField,
    FormLocationSelector
} from './FormComponents';
import { RichMediaInput } from './RichMediaInput';

/**
 * Main Form Engine Component
 * Renders dynamic form sections based on formConfig
 * Supports controlled/uncontrolled mode and handles complex visibility logic
 */
export const FormEngine = ({
    formData,
    setFormData,
    onSave,
    initialStepIndex = 0,
    currentStepIndex: controlledIndex,
    onStepChange,
    familyMembers = {},
    onProgressUpdate,
    onExit,
    onDeleteMember
}) => {
    // ==================== SECTION GROUPING ====================
    const sections = useMemo(() => {
        const sectionMap = new Map();
        const uniqueSections = [];

        formConfig.forEach(item => {
            if (!sectionMap.has(item.wizardSection)) {
                sectionMap.set(item.wizardSection, []);
                uniqueSections.push(item.wizardSection);
            }
            sectionMap.get(item.wizardSection).push(item);
        });

        return uniqueSections.map(name => ({
            name,
            items: sectionMap.get(name).sort((a, b) => a.order - b.order)
        }));
    }, []);

    // ==================== HYBRID CONTROLLED/UNCONTROLLED STATE ====================
    const [internalIndex, setInternalIndex] = useState(initialStepIndex);
    const isControlled = controlledIndex !== undefined;
    const currentStepIndex = isControlled ? controlledIndex : internalIndex;

    const setCurrentStepIndex = useCallback((arg) => {
        const nextIndex = typeof arg === 'function' ? arg(currentStepIndex) : arg;

        if (isControlled) {
            onStepChange?.(nextIndex);
        } else {
            setInternalIndex(nextIndex);
        }
    }, [isControlled, onStepChange, currentStepIndex]);

    const currentSection = sections[currentStepIndex] || sections[0];

    // ==================== PROGRESS CALCULATION ====================
    const calculateDataProgress = useCallback(() => {
        const weights = {
            'resumoHistorico': 21.0,
            'relatosAdicionais': 14.0,
            'nomePai': 5.5,
            'nomeMae': 5.5,
            'cidadesMorou': 4.0,
            'nomeCompleto': 3.0,
            'sobrenomesSolteiro': 3.0,
            'apelido': 3.0,
            'dataNascimento': 3.0,
            'localNascimento_pais': 3.0,
            'localNascimento_cidade': 3.0,
            'realizacoesPremios': 3.0,
            'atuacaoComunitaria': 3.0,
            'professorHebraico': 3.0,
            'situacaoConjugal': 2.5,
            'qtdFilhos': 2.5,
            'grauInstrucao': 2.5,
            'escolasUniversidades': 2.5,
            'hobbies': 2.5,
            'religiao': 1.5,
            'situacaoVital': 1.5,
            'ocupacaoPrincipal': 1.5,
            'locaisTrabalho': 1.5,
            'locaisConheceu': 1.5,
            'amizadesMarcantes': 1.5,
            'sinagogaFrequentava': 1.5
        };

        let totalScore = 0;

        Object.keys(weights).forEach(fieldId => {
            const val = formData[fieldId];
            const hasValue = val && (Array.isArray(val) ? val.length > 0 : String(val).trim() !== '');

            // Skip "Vivo" as it's default state
            if (hasValue && !(fieldId === 'situacaoVital' && val === 'Vivo')) {
                totalScore += weights[fieldId];
            }
        });

        return Math.min(100, Math.round(totalScore));
    }, [formData]);

    // ==================== PROGRESS REPORTING ====================
    useEffect(() => {
        if (onProgressUpdate && currentSection) {
            onProgressUpdate({
                currentStep: currentStepIndex + 1,
                totalSteps: sections.length,
                sectionName: currentSection.name,
                progressPercentage: calculateDataProgress(),
                roleLabel: formData.relationshipInfo?.papel || ''
            });
        }
    }, [currentStepIndex, sections.length, currentSection, onProgressUpdate, calculateDataProgress, formData.relationshipInfo?.papel]);

    // ==================== VISIBILITY LOGIC ====================
    const isVisible = useCallback((item) => {
        // Gender field visibility - only show for roles without implicit gender
        if (item.fieldId === 'sexo') {
            const role = formData.relationshipInfo?.papel;
            return !role || role === 'Eu mesmo' || role === 'Outro';
        }

        // Maiden name visibility - for female roles or female gender
        if (item.fieldId === 'sobrenomesSolteiro') {
            const role = formData.relationshipInfo?.papel;
            const femaleRoles = [
                'Mãe',
                'Avó Paterna', 'Avó Materna',
                'Mãe do Avô Paterno', 'Mãe da Avó Paterna',
                'Mãe do Avô Materno', 'Mãe da Avó Materna'
            ];
            return femaleRoles.includes(role) || formData.sexo === 'Feminino';
        }

        // Remarriage checkbox visibility
        if (item.fieldId === 'remarried_1') {
            const outcome = formData.marriageOutcome;
            return outcome === 'Divorciou-se' || outcome === 'Tornou-se viúvo(a)';
        }
        if (item.fieldId === 'remarried_2') {
            const outcome = formData.marriageOutcome_2;
            return outcome === 'Divorciou-se' || outcome === 'Tornou-se viúvo(a)';
        }

        // Remarriage dependent fields visibility
        if (item.conditionalRule === 'remarried_1') {
            const outcome = formData.marriageOutcome;
            const validOutcome = outcome === 'Divorciou-se' || outcome === 'Tornou-se viúvo(a)';
            return !!formData.remarried_1 && validOutcome;
        }
        if (item.conditionalRule === 'remarried_2') {
            const outcome = formData.marriageOutcome_2;
            const validOutcome = outcome === 'Divorciou-se' || outcome === 'Tornou-se viúvo(a)';
            return !!formData.remarried_2 && validOutcome;
        }

        // No conditional rule - always visible
        if (!item.conditionalRule) return true;

        // Parse conditional rules
        return evaluateConditionalRule(item.conditionalRule, formData);
    }, [formData]);

    // ==================== FORM DATA UPDATER ====================
    const updateFormData = useCallback((key, value) => {
        setFormData(prev => ({ ...prev, [key]: value }));
    }, [setFormData]);

    // ==================== NAVIGATION HANDLERS ====================
    const handlePrevious = useCallback(() => {
        setCurrentStepIndex(prev => Math.max(0, prev - 1));
    }, [setCurrentStepIndex]);

    const handleNext = useCallback(() => {
        window.scrollTo(0, 0);
        setCurrentStepIndex(prev => prev + 1);
    }, [setCurrentStepIndex]);

    const handleOpenReference = useCallback(() => {
        setFormData(prev => ({ ...prev, _editingSource: true }));
    }, [setFormData]);

    // ==================== FIELD RENDERER ====================
    const renderField = useCallback((item) => {
        if (!isVisible(item)) return null;

        const fieldValue = item.fieldId ? formData[item.fieldId] : undefined;

        const handleChange = (val) => {
            if (item.fieldId) {
                updateFormData(item.fieldId, val);
            }
        };

        // Props WITHOUT key (key will be added at JSX level)
        const fieldProps = {
            item,
            value: fieldValue,
            onChange: handleChange,
            formData,
            updateData: updateFormData
        };

        switch (item.component) {
            case 'InputField':
            case 'EditableField':
                return <FormInput {...fieldProps} />;

            case 'TextAreaField':
                return <FormTextArea {...fieldProps} />;

            case 'RichMediaInput':
                return <RichMediaInput {...fieldProps} />;

            case 'DateInputField':
                return <FormDate {...fieldProps} />;

            case 'SelectField':
            case 'SingleSelectGroup':
                return <FormSelect {...fieldProps} />;

            case 'CheckboxField':
                return <FormCheckbox {...fieldProps} />;

            case 'StaticText':
                return <FormStaticText {...fieldProps} />;

            case 'Logomarca do livrão':
                return (
                    <h1 className="text-4xl text-history-green font-serif font-bold text-center my-8">
                        Livrão da Família
                    </h1>
                );

            case 'Prosseguir/de acordo':
                return (
                    <div className="text-center italic text-stone-500 my-4">
                        (Clique em Próximo para concordar)
                    </div>
                );

            case 'UploadComponent':
                return (
                    <UploadWidget
                        {...fieldProps}
                        maxFiles={item.maxFiles}
                    />
                );

            case 'SourceInfoWidget':
                return (
                    <SourceInfoWidget
                        data={formData}
                        updateData={updateFormData}
                    />
                );

            case 'LocationSelector':
                return (
                    <FormLocationSelector
                        item={item}
                        formData={formData}
                        setFormData={setFormData}
                    />
                );

            case 'FamilyTreeSelector':
                return (
                    <FamilyTreeSelector
                        value={fieldValue}
                        onChange={(newVal) => handleFamilyTreeChange(newVal, item.fieldId)}
                        representativeName={formData.repName}
                        representativePhone={formData.repPhone}
                        membersData={familyMembers}
                        onNext={handleNext}
                        onDeleteMember={onDeleteMember}
                    />
                );

            default:
                return <UnsupportedField item={item} />;
        }
    }, [isVisible, formData, updateFormData, familyMembers, handleNext, setFormData]);

    // ==================== FAMILY TREE CHANGE HANDLER ====================
    const handleFamilyTreeChange = useCallback((newVal, fieldId) => {
        const existingData = familyMembers[newVal.papel];

        if (existingData) {
            // Load existing member data, preserving rep info and merging updated kinship if changed
            setFormData(prev => ({
                ...existingData,
                repName: prev.repName,
                repEmail: prev.repEmail,
                repPhone: prev.repPhone,
                [fieldId]: {
                    ...existingData[fieldId],
                    ...newVal
                }
            }));
        } else {
            // New member: reset to initial state, preserving rep info and new selection
            setFormData(prev => ({
                ...INITIAL_STATE,
                repName: prev.repName,
                repEmail: prev.repEmail,
                repPhone: prev.repPhone,
                [fieldId]: newVal
            }));
        }
    }, [familyMembers, setFormData]);

    // ==================== RENDER ====================
    const isFamilyTreeSection = currentSection.items.some(i => i.component === 'FamilyTreeSelector');

    return (
        <div className="max-w-4xl mx-auto pb-32 pt-6">
            {/* Form Card */}
            <div
                key={currentStepIndex}
                className={`
                    animate-[fadeInUp_0.6s_ease-out]
                    ${isFamilyTreeSection
                        ? 'p-0 bg-transparent border-0 shadow-none'
                        : 'bg-white p-4 md:p-12 rounded-xl shadow-sm border border-slate-200'}
                `}
                style={{ animationFillMode: 'both' }}
            >
                <div className="grid grid-cols-1 md:grid-cols-12 gap-x-6 gap-y-4 items-start pt-2">
                    {currentSection.items.map(item => {
                        if (!isVisible(item)) return null;

                        const component = renderField(item);
                        const colSpan = item.halfWidth ? 'md:col-span-6' : 'md:col-span-12';
                        const key = item.fieldId || item.order;

                        return (
                            <div key={key} className={`w-full ${colSpan}`}>
                                {component}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Navigation Footer */}
            <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/90 backdrop-blur border-t border-slate-200 flex justify-between items-center max-w-5xl mx-auto md:relative md:bg-transparent md:border-0 md:mt-8 md:p-0 z-40">
                {isFamilyTreeSection ? (
                    <NavigationButton
                        onClick={onExit}
                        variant="tree"
                    >
                        Sair
                    </NavigationButton>
                ) : (
                    <>
                        <NavigationButton
                            onClick={handlePrevious}
                            disabled={currentStepIndex === 0}
                            variant="back"
                        >
                            Voltar
                        </NavigationButton>

                        {currentStepIndex > 2 && (
                            <NavigationButton
                                onClick={handleOpenReference}
                                variant="reference"
                            >
                                REFERÊNCIA
                            </NavigationButton>
                        )}

                        {currentStepIndex < sections.length - 1 ? (
                            <NavigationButton
                                onClick={handleNext}
                                variant="next"
                            >
                                Próximo
                            </NavigationButton>
                        ) : (
                            <NavigationButton
                                onClick={onSave}
                                variant="save"
                            >
                                Salvar e Finalizar
                            </NavigationButton>
                        )}
                    </>
                )}
            </div>

            <style>{`
                @keyframes fadeInUp {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </div>
    );
};

// ==================== HELPER FUNCTIONS ====================

/**
 * Evaluates conditional rules for field visibility
 * Supports operators: ==, !=, in, >=, and boolean checks
 */
function evaluateConditionalRule(rule, formData) {
    let operator = null;

    if (rule.includes('==')) operator = '==';
    else if (rule.includes('!=')) operator = '!=';
    else if (rule.includes(' in ')) operator = ' in ';
    else if (rule.includes('>=')) operator = '>=';

    // Implicit boolean check (e.g., "remarried_1")
    if (!operator) {
        return !!formData[rule.trim()];
    }

    const [field, rawValue] = rule.split(operator).map(s => s.trim());
    const expectedValue = rawValue?.replace(/['"]/g, '');
    const actualValue = formData[field];

    switch (operator) {
        case '==':
            return String(actualValue) === expectedValue;

        case '!=':
            return String(actualValue) !== expectedValue;

        case ' in ':
            const options = expectedValue.split(',').map(s => s.trim());
            return options.includes(String(actualValue));

        case '>=':
            const actual = actualValue === 'Nenhum' ? 0 : Number(actualValue);
            const expected = Number(expectedValue);
            return !isNaN(actual) && !isNaN(expected) && actual >= expected;

        default:
            return false;
    }
}

// ==================== SUB-COMPONENTS ====================

/**
 * Navigation Button Component
 * Provides consistent styling for all navigation buttons
 */
const NavigationButton = ({ onClick, disabled = false, variant = 'default', children }) => {
    const variants = {
        tree: 'bg-amber-200 text-amber-950 border-amber-300 hover:bg-amber-300',
        back: 'bg-white text-black border-slate-200 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed',
        reference: 'bg-slate-200 text-slate-800 border-slate-300 hover:bg-slate-300',
        next: 'bg-slate-900 text-white border-slate-900 hover:bg-slate-800',
        save: 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700'
    };

    const baseClasses = 'h-9 px-5 rounded-full font-bold text-[9px] uppercase tracking-wider shadow-sm hover:shadow-md transition-all min-w-[100px] flex items-center justify-center border';
    const variantClasses = variants[variant] || '';

    return (
        <button
            onClick={onClick}
            disabled={disabled}
            className={`${baseClasses} ${variantClasses}`}
        >
            {children}
        </button>
    );
};
