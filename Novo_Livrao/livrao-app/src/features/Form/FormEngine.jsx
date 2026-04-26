import React, { useMemo, useState, useCallback, useEffect, useRef } from 'react';
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

const XRAY_MODE = false;

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
    onDeleteMember,
    onArchiveMember,
    onArchiveAllOthers,
    onAcceptDuplicate,
    onMergeDuplicates = null,
    onCancel = null,
    uid = null,
    onRefreshMembers = null
}) => {
    // ==================== SECTION GROUPING ====================
    const sections = useMemo(() => {
        const sectionMap = new Map();
        const uniqueSections = [];

        formConfig.forEach(item => {
            if (item.wizardSection === 'VidaJudaica' && formData.religiao !== 'Judaica') {
                return;
            }
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
    }, [formData.religiao]);

    // ==================== HYBRID CONTROLLED/UNCONTROLLED STATE ====================
    const [internalIndex, setInternalIndex] = useState(initialStepIndex);
    const [expandedUploads, setExpandedUploads] = useState({});
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

    // Detecta se há dados significativos preenchidos — usa nomeCompleto como sinal principal
    const hasAnyData = useCallback(() => {
        return !!(formData.nomeCompleto?.trim());
    }, [formData.nomeCompleto]);

    // Saída inteligente: respeita onCancel do pai ou volta para a árvore
    const handleExit = useCallback(() => {
        if (onCancel) {
            onCancel();
        } else {
            setCurrentStepIndex(0);
        }
    }, [onCancel, setCurrentStepIndex]);

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
        const currentGender = formData.sexo || formData.gender || '';

        // Warning message visibility
        if (item.fieldId === 'gender_warning') {
            return currentGender !== 'Masculino' && currentGender !== 'Feminino';
        }

        // Gender field visibility - always visible for explicit selection
        if (item.fieldId === 'sexo' || item.fieldId === 'gender') {
            return true;
        }

        // No conditional rule - always visible
        if (!item.conditionalRule) return true;

        // Parse conditional rules
        return evaluateConditionalRule(item.conditionalRule, formData);
    }, [formData]);

    // ==================== STATE CLEANUP (Conditional Visibility) ====================
    const prevVisibleFields = useRef(null);

    useEffect(() => {
        // Collect all currently visible field IDs
        const visibleFieldIds = new Set();
        formConfig.forEach(item => {
            if (isVisible(item)) {
                visibleFieldIds.add(item.fieldId);
            }
        });

        // Serializa para comparar com a rodada anterior
        const visibleKey = [...visibleFieldIds].sort().join(',');
        if (prevVisibleFields.current === visibleKey) return; // nada mudou, sai
        prevVisibleFields.current = visibleKey;

        // Identify fields that should be cleared
        setFormData(prev => {
            const updated = { ...prev };
            let hasChanges = false;

            Object.keys(prev).forEach(key => {
                // Skip internal, structural, or non-config fields
                if (
                    key.startsWith('_') ||
                    key === 'relationshipInfo' ||
                    key === 'parentesco' ||
                    key === 'id_unico' ||
                    key === 'vinculoAcao' ||
                    key === 'vinculoFamiliarId'
                ) return;

                const configField = formConfig.find(f => f.fieldId === key);
                if (configField && !visibleFieldIds.has(key)) {
                    if (prev[key] !== undefined && prev[key] !== '' && prev[key] !== null) {
                        delete updated[key];
                        hasChanges = true;
                    }
                }
            });

            return hasChanges ? updated : prev;
        });

    // ✅ formData REMOVIDO das dependências — isVisible já captura o que precisa
    }, [isVisible]);

    // ==================== FORM DATA UPDATER ====================
    const updateFormData = useCallback((key, value) => {
        if (key === 'sexo') {
            const pivotMap = {
                'Avô Paterno': { targetRole: 'Avó Paterna', reqGender: 'Feminino', revertGender: 'Masculino' },
                'Avó Paterna': { targetRole: 'Avô Paterno', reqGender: 'Masculino', revertGender: 'Feminino' },
                'Avô Materno': { targetRole: 'Avó Materna', reqGender: 'Feminino', revertGender: 'Masculino' },
                'Avó Materna': { targetRole: 'Avô Materno', reqGender: 'Masculino', revertGender: 'Feminino' },
                'Pai': { targetRole: 'Mãe', reqGender: 'Feminino', revertGender: 'Masculino' },
                'Mãe': { targetRole: 'Pai', reqGender: 'Masculino', revertGender: 'Feminino' },
                'Pai do Avô Paterno': { targetRole: 'Mãe do Avô Paterno', reqGender: 'Feminino', revertGender: 'Masculino' },
                'Mãe do Avô Paterno': { targetRole: 'Pai do Avô Paterno', reqGender: 'Masculino', revertGender: 'Feminino' },
                'Pai da Avó Paterna': { targetRole: 'Mãe da Avó Paterna', reqGender: 'Feminino', revertGender: 'Masculino' },
                'Mãe da Avó Paterna': { targetRole: 'Pai da Avó Paterna', reqGender: 'Masculino', revertGender: 'Feminino' },
                'Pai do Avô Materno': { targetRole: 'Mãe do Avô Materno', reqGender: 'Feminino', revertGender: 'Masculino' },
                'Mãe do Avô Materno': { targetRole: 'Pai do Avô Materno', reqGender: 'Masculino', revertGender: 'Feminino' },
                'Pai da Avó Materna': { targetRole: 'Mãe da Avó Materna', reqGender: 'Feminino', revertGender: 'Masculino' },
                'Mãe da Avó Materna': { targetRole: 'Pai da Avó Materna', reqGender: 'Masculino', revertGender: 'Feminino' }
            };

            setFormData(prev => {
                // ✅ Lê currentRole do prev — nunca do formData closure (stale-safe)
                const currentRole = prev.relationshipInfo?.papel || '';
                const pivotRule = pivotMap[currentRole];

                if (pivotRule && value === pivotRule.reqGender) {
                    // Pivot try
                    const occupant = familyMembers[pivotRule.targetRole];
                    if (occupant && occupant.nomeCompleto) {
                        // Collision block — alerta fora do updater para não bloquear render
                        setTimeout(() => alert(`Aposição Inválida: O cargo de '${pivotRule.targetRole}' já se encontra ocupado por ${occupant.nomeCompleto || occupant.name}. Mude a aba ou exclua o parente antes de trocar o sexo.`), 0);
                        return { ...prev, sexo: pivotRule.revertGender };
                    } else {
                        // Safe Pivot
                        return {
                            ...prev,
                            sexo: value,
                            parentesco: pivotRule.targetRole,
                            relationshipInfo: {
                                ...prev.relationshipInfo,
                                papel: pivotRule.targetRole,
                                parentesco: pivotRule.targetRole
                            }
                        };
                    }
                }

                // Sem pivot: atualização simples do sexo
                return { ...prev, [key]: value };
            });
            return;
        }
        setFormData(prev => ({ ...prev, [key]: value }));
    // ✅ formData REMOVIDO — currentRole lido via prev dentro do updater funcional
    }, [setFormData, familyMembers]);

    // ==================== NAVIGATION HANDLERS ====================
    const handleNext = useCallback(() => {
        // Bloqueio de Criação: Nome e Data de Nascimento obrigratórios na seção Biografia
        const uniqueSections = [...new Set(formConfig.map(i => i.wizardSection))];
        const currentSection = uniqueSections[currentStepIndex];
        
        if (currentSection === 'Biografia') {
            if (!formData.nomeCompleto?.trim() || !formData.dataNascimento?.trim()) {
                alert("⚠️ Nome Completo e Data de Nascimento são campos obrigatórios para criar este registro.");
                return;
            }
        }
        
        // Bloqueio Global para OBRIGATORIEDADE DE SEXO - Impede avanços seções que contenham o campo
        const currentSectionItems = sections[currentStepIndex]?.items || [];
        const hasSexoField = currentSectionItems.some(i => i.fieldId === 'sexo' || i.fieldId === 'gender');
        if (hasSexoField) {
            if (!formData.sexo || formData.sexo === 'Indefinido') {
                 alert("⚠️ Por favor, selecione o Gênero (Masculino ou Feminino) antes de prosseguir.");
                 return;
            }
        }

        window.scrollTo(0, 0);
        setCurrentStepIndex(prev => prev + 1);
    }, [setCurrentStepIndex, currentStepIndex, formData, sections]);

    const handleSave = useCallback(() => {
        // Bloqueio Global para OBRIGATORIEDADE DE SEXO no Salvar
        // Ensure that sexo is always defined if it exists in the form
        if (!formData.sexo || formData.sexo === 'Indefinido') {
            alert("⚠️ Por favor, selecione o Gênero (Masculino ou Feminino) antes de salvar.");
            return;
        }
        
        if (onSave) onSave();
    }, [formData, onSave]);

    const handleOpenReference = useCallback(() => {
        setFormData(prev => ({ ...prev, _editingSource: true }));
    }, [setFormData]);

    const handleReferenceChange = useCallback((fieldId, val) => {
        // Store reference info in the form data for the given field
        updateFormData(fieldId, val);
    }, [updateFormData]);

    const handleFamilyTreeChange = useCallback((newVal, fieldId) => {
        const existingData = familyMembers[newVal.papel];


        if (existingData) {
            // Caminho A: membro já existe → carrega dados reais com prioridade total

            // [❗CORREÇÃO CRÍTICA] Monta o relationshipInfo com a seguinte prioridade:
            // 1. Dados reais salvos no Firestore (existingData.relationshipInfo)
            // 2. O papel (roleKey) vem do clique — nunca do parentesco do card (que pode ser um fallback sujo)
            // 3. newVal NUNCA sobrescreve parentesco — apenas assegura que o papel está correto
            const storedRelInfo = existingData[fieldId] || existingData.relationshipInfo || {};
            const safeRelationshipInfo = {
                ...storedRelInfo,
                // O papel é sempre o roleKey limpo do clique
                papel: newVal.papel,
                // parentesco vem do storage, NUNCA do payload do card
                parentesco: storedRelInfo.parentesco || existingData.parentesco || newVal.parentesco || '',
            };

            setFormData(prev => ({
                ...INITIAL_STATE,       // reseta primeiro — evita vazamento do membro anterior
                ...existingData,        // aplica dados reais do Firestore
                _originalRole: newVal.papel,
                repName: prev.repName,
                repEmail: prev.repEmail,
                repPhone: prev.repPhone,
                [fieldId]: safeRelationshipInfo
            }));
            // Advance to editing details session
            setCurrentStepIndex(3);
        } else {
            // Caminho B: novo parente → reset com INITIAL_STATE limpo
            setFormData(prev => {
                const newState = {
                    ...INITIAL_STATE,
                    repName: prev.repName,
                    repEmail: prev.repEmail,
                    repPhone: prev.repPhone,
                    [fieldId]: newVal,
                    nomeCompleto: newVal.nome || '',
                    // [FASE 2] Propaga o UUID gerado pelo FamilyTreeSelector
                    ...(newVal._newDocId ? { docId: newVal._newDocId, id: newVal._newDocId } : {}),
                    // [ETAPA 3] Propaga vinculoFamiliarId e parentesco escolhidos no modal
                    ...(newVal.vinculoFamiliarId ? { vinculoFamiliarId: newVal.vinculoFamiliarId } : {}),
                    ...(newVal.parentesco       ? { parentesco:        newVal.parentesco        } : {}),
                };

                // 1. SMART PRE-FILL FOR SPOUSE
                if (newVal.parentesco === 'Cônjuge' || newVal.papel.startsWith('Cônjuge')) {
                    const repData = familyMembers['Eu mesmo'] || {};
                    // Use data from Representative's profile if available, otherwise from App state
                    const repNome = repData.nomeCompleto || prev.repName;

                    if (newVal.papel === 'Cônjuge') {
                        newState.nomeConjuge = repNome;
                        newState.situacaoConjugal = 'Casado';
                        newState.dataCasamento = repData.dataCasamento || '';
                    }

                    // Invert gender based on Rep's gender
                    const repGender = repData.sexo || '';
                    if (repGender === 'Masculino') newState.sexo = 'Feminino';
                    else if (repGender === 'Feminino') newState.sexo = 'Masculino';
                }

                // 2. SMART PRE-FILL FOR CHILDREN
                if (newVal.parentesco === 'Filho(a)') {
                    const repData = familyMembers['Eu mesmo'] || {};
                    const spouseRole = (repData.sexo === 'Masculino') ? 'Esposa' : 'Esposo';
                    const spouseData = familyMembers[spouseRole] || {};

                    const repNome = repData.nomeCompleto || prev.repName;
                    const spouseNome = spouseData.nomeCompleto || repData.nomeConjuge || '';

                    if (repData.sexo === 'Masculino') {
                        newState.nomePai = repNome;
                        newState.nomeMae = spouseNome;
                    } else {
                        newState.nomePai = spouseNome;
                        newState.nomeMae = repNome;
                    }
                }

                const ANCESTOR_PREC_MAP = {
                    'Pai': { child: 'Eu mesmo', field: 'nomePai', gender: 'Masculino' },
                    'Mãe': { child: 'Eu mesmo', field: 'nomeMae', gender: 'Feminino' },
                    'Avô Paterno': { child: 'Pai', field: 'nomePai', gender: 'Masculino' },
                    'Avó Paterna': { child: 'Pai', field: 'nomeMae', gender: 'Feminino' },
                    'Avô Materno': { child: 'Mãe', field: 'nomePai', gender: 'Masculino' },
                    'Avó Materna': { child: 'Mãe', field: 'nomeMae', gender: 'Feminino' },
                    'Pai do Avô Paterno': { child: 'Avô Paterno', field: 'nomePai', gender: 'Masculino' },
                    'Mãe do Avô Paterno': { child: 'Avô Paterno', field: 'nomeMae', gender: 'Feminino' },
                    'Pai da Avó Paterna': { child: 'Avó Paterna', field: 'nomePai', gender: 'Masculino' },
                    'Mãe da Avó Paterna': { child: 'Avó Paterna', field: 'nomeMae', gender: 'Feminino' },
                    'Pai do Avô Materno': { child: 'Avô Materno', field: 'nomePai', gender: 'Masculino' },
                    'Mãe do Avô Materno': { child: 'Avô Materno', field: 'nomeMae', gender: 'Feminino' },
                    'Pai da Avó Materna': { child: 'Avó Materna', field: 'nomePai', gender: 'Masculino' },
                    'Mãe da Avó Materna': { child: 'Avó Materna', field: 'nomeMae', gender: 'Feminino' }
                };

                // ── Inicializa o array de controle de campos pré-preenchidos ──────
                newState._autoFilledFields = [];

                const precData = ANCESTOR_PREC_MAP[newVal.papel];
                if (precData) {
                    const childDoc = familyMembers[precData.child] || {};
                    newState.nomeCompleto = childDoc[precData.field] || '';
                    newState.sexo = precData.gender;
                    // nomeCompleto vem do ancestral — marca como auto-filled
                    if (newState.nomeCompleto) newState._autoFilledFields.push('nomeCompleto');
                }

                // 4. SMART PRE-FILL FOR SIBLINGS (Irmão/Irmã)
                const isIrmao = /irmão|irmao/i.test(newVal.parentesco);
                const isIrma  = /irmã|irma$/i.test(newVal.parentesco);
                if (isIrmao || isIrma) {
                    const repData = familyMembers['Eu mesmo'] || {};
                    if (!newState.nomePai && repData.nomePai) {
                        newState.nomePai = repData.nomePai;
                        newState._autoFilledFields.push('nomePai');
                    }
                    if (!newState.nomeMae && repData.nomeMae) {
                        newState.nomeMae = repData.nomeMae;
                        newState._autoFilledFields.push('nomeMae');
                    }
                    if (isIrmao) newState.sexo = 'Masculino';
                    if (isIrma)  newState.sexo = 'Feminino';
                }

                // 5. SMART PRE-FILL FOR CÔNJUGE DO IRMÃO
                const isCnjIrmao = /cônjuge.*irm|conjuge.*irm/i.test(newVal.parentesco);
                if (isCnjIrmao && newVal.vinculoFamiliarId) {
                    const irmaoData = familyMembers[newVal.vinculoFamiliarId] ||
                        Object.values(familyMembers).find(m =>
                            (m.docId || m.id || m.key) === newVal.vinculoFamiliarId ||
                            m.key === newVal.vinculoFamiliarId
                        ) || {};
                    if (!newState.nomeConjuge && irmaoData.nomeCompleto) {
                        newState.nomeConjuge = irmaoData.nomeCompleto;
                        newState._autoFilledFields.push('nomeConjuge');
                    }
                    newState.situacaoConjugal = 'Casado';
                    if (irmaoData.sexo === 'Masculino') newState.sexo = 'Feminino';
                    else if (irmaoData.sexo === 'Feminino') newState.sexo = 'Masculino';
                }

                // 6. SMART PRE-FILL FOR SOBRINHO/A
                const isSobrinho = /sobrinho/i.test(newVal.parentesco);
                const isSobrinha = /sobrinha/i.test(newVal.parentesco);

                console.log('[SOBRINHO] parentesco="' + newVal.parentesco + '" | isSobrinho=' + isSobrinho + ' | vinculoFamiliarId="' + newVal.vinculoFamiliarId + '"');

                if ((isSobrinho || isSobrinha) && newVal.vinculoFamiliarId) {
                    const ancData = familyMembers[newVal.vinculoFamiliarId] ||
                        Object.values(familyMembers).find(m =>
                            (m.docId || m.id || m.key) === newVal.vinculoFamiliarId ||
                            m.key === newVal.vinculoFamiliarId
                        ) || {};

                    console.log('[SOBRINHO] ancData.nomeCompleto="' + ancData.nomeCompleto + '" | ancData.sexo="' + ancData.sexo + '" | docId="' + (ancData.docId || ancData.id || ancData.key) + '"');
                    console.log('[SOBRINHO] Condição nomePai: sexo=Masculino?' + (ancData.sexo === 'Masculino') + ' | nomePai vazio?' + (!newState.nomePai) + ' | nomeCompleto presente?' + (!!ancData.nomeCompleto));
                    console.log('[SOBRINHO] Condição nomeMae: sexo=Feminino?' + (ancData.sexo === 'Feminino') + ' | nomeMae vazio?' + (!newState.nomeMae) + ' | nomeCompleto presente?' + (!!ancData.nomeCompleto));

                    if (ancData.sexo === 'Masculino' && !newState.nomePai && ancData.nomeCompleto) {
                        newState.nomePai = ancData.nomeCompleto;
                        newState._autoFilledFields.push('nomePai');
                        console.log('[SOBRINHO] ✅ nomePai preenchido com:', ancData.nomeCompleto);
                    } else if (ancData.sexo === 'Feminino' && !newState.nomeMae && ancData.nomeCompleto) {
                        newState.nomeMae = ancData.nomeCompleto;
                        newState._autoFilledFields.push('nomeMae');
                        console.log('[SOBRINHO] ✅ nomeMae preenchido com:', ancData.nomeCompleto);
                    } else {
                        console.log('[SOBRINHO] ❌ PRE-FILL NÃO EXECUTOU — sexo ausente ou campo já preenchido');
                        // Fallback: se não tem sexo cadastrado, preenche nomePai como fallback
                        if (!ancData.sexo && !newState.nomePai && ancData.nomeCompleto) {
                            newState.nomePai = ancData.nomeCompleto;
                            newState._autoFilledFields.push('nomePai');
                            console.log('[SOBRINHO] ⚠️ Fallback: nomePai preenchido (sexo ausente):', ancData.nomeCompleto);
                        }
                    }
                    if (isSobrinho) newState.sexo = 'Masculino';
                    if (isSobrinha) newState.sexo = 'Feminino';
                }



                // 7. SMART PRE-FILL FOR TIOS PATERNOS/MATERNOS
                const isTioPaterno = /tio.*paterno|tia.*paterna/i.test(newVal.parentesco);
                const isTioMaterno = /tio.*materno|tia.*materna/i.test(newVal.parentesco);
                if (isTioPaterno || isTioMaterno) {
                    const avoKey  = isTioPaterno ? 'Avô Paterno' : 'Avô Materno';
                    const avoaKey = isTioPaterno ? 'Avó Paterna' : 'Avó Materna';
                    const avoData  = familyMembers[avoKey]  || {};
                    const avoaData = familyMembers[avoaKey] || {};
                    if (!newState.nomePai && avoData.nomeCompleto) {
                        newState.nomePai = avoData.nomeCompleto;
                        newState._autoFilledFields.push('nomePai');
                    }
                    if (!newState.nomeMae && avoaData.nomeCompleto) {
                        newState.nomeMae = avoaData.nomeCompleto;
                        newState._autoFilledFields.push('nomeMae');
                    }
                    newState.sexo = /tia/i.test(newVal.parentesco) ? 'Feminino' : 'Masculino';
                }

                // 8. SMART PRE-FILL FOR PRIMOS/PRIMAS
                const isPrimo = /primo/i.test(newVal.parentesco);
                const isPrima = /prima/i.test(newVal.parentesco);
                if ((isPrimo || isPrima) && newVal.vinculoFamiliarId) {
                    const tioData = familyMembers[newVal.vinculoFamiliarId] ||
                        Object.values(familyMembers).find(m =>
                            (m.docId || m.id || m.key) === newVal.vinculoFamiliarId ||
                            m.key === newVal.vinculoFamiliarId
                        ) || {};
                    if (tioData.sexo === 'Masculino' && !newState.nomePai && tioData.nomeCompleto) {
                        newState.nomePai = tioData.nomeCompleto;
                        newState._autoFilledFields.push('nomePai');
                    } else if (tioData.sexo === 'Feminino' && !newState.nomeMae && tioData.nomeCompleto) {
                        newState.nomeMae = tioData.nomeCompleto;
                        newState._autoFilledFields.push('nomeMae');
                    }
                    if (isPrimo) newState.sexo = 'Masculino';
                    if (isPrima) newState.sexo = 'Feminino';
                }

                // 9. SMART PRE-FILL FOR GENRO/NORA
                const isGenro = /genro/i.test(newVal.parentesco);
                const isNora  = /nora/i.test(newVal.parentesco);
                if ((isGenro || isNora) && newVal.vinculoFamiliarId) {
                    const filhoData = familyMembers[newVal.vinculoFamiliarId] ||
                        Object.values(familyMembers).find(m =>
                            (m.docId || m.id || m.key) === newVal.vinculoFamiliarId ||
                            m.key === newVal.vinculoFamiliarId
                        ) || {};
                    if (!newState.nomeConjuge && filhoData.nomeCompleto) {
                        newState.nomeConjuge = filhoData.nomeCompleto;
                        newState._autoFilledFields.push('nomeConjuge');
                    }
                    newState.situacaoConjugal = 'Casado';
                    newState.sexo = isNora ? 'Feminino' : 'Masculino';
                }

                // 10. SMART PRE-FILL FOR NETO/NETA
                const isNeto = /^neto/i.test(newVal.parentesco);
                const isNeta = /^neta/i.test(newVal.parentesco);
                if ((isNeto || isNeta) && newVal.vinculoFamiliarId) {
                    const filhoData = familyMembers[newVal.vinculoFamiliarId] ||
                        Object.values(familyMembers).find(m =>
                            (m.docId || m.id || m.key) === newVal.vinculoFamiliarId ||
                            m.key === newVal.vinculoFamiliarId
                        ) || {};
                    if (filhoData.sexo === 'Masculino' && !newState.nomePai && filhoData.nomeCompleto) {
                        newState.nomePai = filhoData.nomeCompleto;
                        newState._autoFilledFields.push('nomePai');
                    } else if (filhoData.sexo === 'Feminino' && !newState.nomeMae && filhoData.nomeCompleto) {
                        newState.nomeMae = filhoData.nomeCompleto;
                        newState._autoFilledFields.push('nomeMae');
                    }
                    if (isNeto) newState.sexo = 'Masculino';
                    if (isNeta) newState.sexo = 'Feminino';
                }

                return newState;
            });
            // Advance to editing details session for new member
            setCurrentStepIndex(3);
        }
    }, [familyMembers, setFormData]);

    // ==================== FIELD RENDERER ====================
    const renderField = useCallback((item) => {
        if (!isVisible(item)) return null;

        const fieldValue = item.fieldId ? formData[item.fieldId] : undefined;

        // Dynamic tense replacement based on situacaoVital
        const isAlive = formData.situacaoVital === 'Vivo';
        const applyTense = (text) => {
            if (!text) return text;
            if (isAlive) {
                return text
                    .replace(/\bFrequentava\b/g, 'Frequenta')
                    .replace(/\bfrequentava\b/g, 'frequenta')
                    .replace(/\bera\b/g, 'é')
                    .replace(/\bEra\b/g, 'É')
                    .replace(/\bcostumava\b/g, 'costuma')
                    .replace(/\bCostumava\b/g, 'Costuma')
                    .replace(/\bexerceu\b/g, 'exerce')
                    .replace(/\bExerceu\b/g, 'Exerce')
                    .replace(/\busar\b/g, 'usar') // keep same for infinitive
            }
            return text;
        };

        const displayItem = {
            ...item,
            label: applyTense(item.label),
            helpText: applyTense(item.helpText)
        };

        if (XRAY_MODE && item.fieldId) {
            displayItem.label = (displayItem.label || '') + ` 🔴 [ID: ${item.fieldId}]`;
            if (['InputField', 'EditableField', 'TextAreaField'].includes(item.component)) {
                displayItem.placeholder = `[ID: ${item.fieldId}]`;
            }
        }

        const handleChange = (val) => {
            if (item.fieldId) {
                updateFormData(item.fieldId, val);
            }
        };

        // Props WITHOUT key (key will be added at JSX level)
        const fieldProps = {
            item: displayItem,
            value: fieldValue,
            onChange: handleChange,
            formData,
            updateData: updateFormData,
            autoFilledFields: formData._autoFilledFields || []
        };


        switch (item.component) {
        case 'InputField':
            case 'EditableField': {
                // Radio button para nomePai/nomeMae quando membro é Sobrinho/a ou Primo/a
                const _isSobrinhoR = /sobrinho|sobrinha/i.test(formData.parentesco || formData.relationshipInfo?.papel || '');
                const _isPrimoR    = /primo|prima/i.test(formData.parentesco || formData.relationshipInfo?.papel || '');
                const _needsRadio  = (_isSobrinhoR || _isPrimoR) &&
                                     (item.fieldId === 'nomePai' || item.fieldId === 'nomeMae');

                if (_needsRadio) {
                    const _radioLabel   = _isSobrinhoR ? 'Irmão/ã' : 'Tio/a';
                    const _checkedPai   = formData._vinculoNomePai === true;
                    const _checkedMae   = formData._vinculoNomeMae === true;
                    const _isNomePai    = item.fieldId === 'nomePai';
                    return (
                        <FormInputWithRadio
                            key={item.fieldId}
                            item={displayItem}
                            value={fieldValue}
                            onChange={handleChange}
                            radioLabel={_radioLabel}
                            radioChecked={_isNomePai ? _checkedPai : _checkedMae}
                            radioDisabled={_isNomePai ? _checkedMae : _checkedPai}
                            autoFilledFields={formData._autoFilledFields || []}
                            updateData={updateFormData}
                            formData={formData}
                            onRadioChange={(checked) => {
                                if (_isNomePai) {
                                    updateFormData('_vinculoNomePai', checked);
                                    if (checked) updateFormData('_vinculoNomeMae', false);
                                } else {
                                    updateFormData('_vinculoNomeMae', checked);
                                    if (checked) updateFormData('_vinculoNomePai', false);
                                }
                            }}
                        />
                    );
                }
                return <FormInput {...fieldProps} />;
            }

            case 'TextAreaField':
                return <FormTextArea {...fieldProps} />;

            case 'RichMediaInput':
                return <RichMediaInput {...fieldProps} />;

            case 'ReferenceField':
                return <ReferenceButton targetField={item.fieldId} label={item.label} onReferenceChange={val => handleReferenceChange(item.fieldId, val)} />;

            case 'WarningMessage':
                return (
                    <div className="bg-amber-50 text-amber-900 p-4 rounded-lg flex items-start gap-3 border border-amber-300 shadow-sm w-full">
                        <svg className="w-6 h-6 flex-shrink-0 mt-0.5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        <p className="text-[15px] font-medium leading-relaxed">{item.helpText}</p>
                    </div>
                );

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

            case 'UploadComponent': {
                const hasValue = Array.isArray(fieldValue) ? fieldValue.length > 0 : !!fieldValue;
                const isExpanded = expandedUploads[item.fieldId];

                if (!isExpanded) {
                    return (
                        <div className="md:col-span-12 w-full py-3 px-4 border border-dashed border-slate-300 rounded-xl flex items-center justify-between bg-slate-50/50 hover:bg-slate-100/50 transition-all group cursor-pointer" 
                             onClick={() => setExpandedUploads(prev => ({...prev, [item.fieldId]: true}))}>
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-history-green/10 flex items-center justify-center group-hover:bg-history-green/20 transition-colors">
                                    <svg className="w-5 h-5 text-history-green" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        {hasValue ? (
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                        ) : (
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                        )}
                                    </svg>
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-slate-700">
                                        {hasValue ? `Visualizar ${displayItem.label.replace(' 🔴 [ID:', ' [ID:')}` : `Incluir ${displayItem.label.replace(' 🔴 [ID:', ' [ID:')}?`}
                                    </p>
                                    <p className="text-[11px] text-slate-500">
                                        {hasValue ? 'Clique para ver a foto enviada' : 'Clique para anexar arquivos'}
                                    </p>
                                </div>
                            </div>
                            <div className="px-3 py-1 rounded-md bg-white border border-slate-200 text-[11px] font-bold text-slate-400 group-hover:text-history-green group-hover:border-history-green/30 transition-all uppercase tracking-wider">
                                {hasValue ? 'Visualizar' : 'Adicionar'}
                            </div>
                        </div>
                    );
                }

                return (
                    <UploadWidget
                        {...fieldProps}
                        item={item}
                        label={displayItem.label}
                        maxFiles={item.maxFiles}
                        placeholder={item.placeholder}
                    />
                );
            }

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
                        onArchiveAllOthers={onArchiveAllOthers}
                        onArchiveMember={onArchiveMember}
                        onAcceptDuplicate={onAcceptDuplicate}
                        onMergeDuplicates={onMergeDuplicates}
                        uid={uid}
                        onRefreshMembers={onRefreshMembers}
                    />
                );

            default:
                return <UnsupportedField item={item} />;
        }
    }, [isVisible, formData, updateFormData, familyMembers, handleNext, handleReferenceChange, handleFamilyTreeChange, expandedUploads]);

    // ==================== RENDER ====================
    const isFamilyTreeSection = currentSection.items.some(i => i.component === 'FamilyTreeSelector');

    return (
        <div className={isFamilyTreeSection ? 'w-full max-w-full lg:max-w-4xl mx-auto p-0' : 'max-w-4xl mx-auto pb-32 pt-0'}>
            {/* Form Card */}
            <div
                key={(formData?.id_unico || formData?.relationshipInfo?.papel || '') + '_' + currentStepIndex}
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
                        const COL_SPAN_MAP = {
                            1: 'md:col-span-1',
                            2: 'md:col-span-2',
                            3: 'md:col-span-3',
                            4: 'md:col-span-4',
                            5: 'md:col-span-5',
                            6: 'md:col-span-6',
                            7: 'md:col-span-7',
                            8: 'md:col-span-8',
                            9: 'md:col-span-9',
                            10: 'md:col-span-10',
                            11: 'md:col-span-11',
                            12: 'md:col-span-12'
                        };

                        const colSpan = item.colSpan
                            ? (COL_SPAN_MAP[item.colSpan] || `md:col-span-${item.colSpan}`)
                            : (item.halfWidth ? 'md:col-span-6' : 'md:col-span-12');
                        const key = item.fieldId || item.order;


                        return (
                            <div key={key} className={`w-full ${colSpan}`}>
                                {component}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end items-center gap-4 mt-8 pb-32">
                {!isFamilyTreeSection && (
                    <>
                    {/* Botão Cancelar — sempre visível */}
                        <NavigationButton
                            onClick={handleExit}
                            variant="back"
                        >
                            Cancelar
                        </NavigationButton>

                        {/* Botão Sair sem salvar — só aparece quando há dados preenchidos */}
                        {hasAnyData() && (
                            <NavigationButton
                                onClick={() => {
                                    if (window.confirm(
                                        'Tem certeza que deseja sair? Os dados preenchidos não serão salvos.'
                                    )) {
                                        handleExit();
                                    }
                                }}
                                variant="exit"
                            >
                                Sair sem salvar
                            </NavigationButton>
                        )}
                        
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
                                onClick={handleSave}
                                variant={formData._isReadOnly ? 'reference' : 'save'}
                            >
                                {formData._isReadOnly ? 'Fechar Consulta' : 'Salvar e Sair'}
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

    if (rule.includes(' == ')) operator = ' == ';
    else if (rule.includes('==')) operator = '==';
    else if (rule.includes(' != ')) operator = ' != ';
    else if (rule.includes('!=')) operator = '!=';
    else if (rule.includes(' in ')) operator = ' in ';
    else if (rule.includes(' >= ')) operator = ' >= ';
    else if (rule.includes('>=')) operator = '>=';

    // Implicit boolean check (e.g., "remarried_1")
    if (!operator) {
        const val = formData[rule.trim()];
        return val === true || val === 'Sim';
    }

    const [field, rawValue] = rule.split(operator).map(s => s.trim());
    const expectedValue = rawValue?.replace(/['"]/g, '').toLowerCase();
    const actualValue = String(formData[field] || '').toLowerCase();

    switch (operator.trim()) {
        case '==':
            return actualValue === expectedValue;

        case '!=':
            return actualValue !== expectedValue;

        case 'in':
            const options = expectedValue.split(',').map(s => s.trim());
            return options.includes(actualValue);

        case '>=':
            const actualNum = actualValue === 'nenhum' ? 0 : Number(actualValue);
            const expectedNum = Number(expectedValue);
            return !isNaN(actualNum) && !isNaN(expectedNum) && actualNum >= expectedNum;

        default:
            return false;
    }
}

// ==================== SUB-COMPONENTS ====================

/**
 * FormInputWithRadio — Campo de texto com botão radio elegante ao lado.
 * Usado em nomePai/nomeMae para Sobrinho/a e Primo/a marcarem o vínculo familiar.
 */
const FormInputWithRadio = ({
    item, value, onChange,
    radioLabel, radioChecked, radioDisabled, onRadioChange,
    autoFilledFields = [], updateData, formData
}) => {
    const isAutoFilled = item?.fieldId ? autoFilledFields.includes(item.fieldId) : false;

    const handleChange = (val) => {
        onChange(val);
        if (isAutoFilled && updateData && item?.fieldId) {
            const current = formData?._autoFilledFields || [];
            updateData('_autoFilledFields', current.filter(f => f !== item.fieldId));
        }
    };

    return (
    <div className="flex flex-col w-full relative group/field mb-8 px-0.5">
        <div className="flex justify-between items-end mb-2 gap-4">
            <label className="text-lg font-serif font-bold text-slate-800 leading-tight flex-1">
                {item.label}
                {item.required && <span className="text-amber-600"> *</span>}
            </label>
        </div>
        <div className="flex items-center gap-3">
            {/* Campo de texto */}
            <div className="flex-1">
                <input
                    type="text"
                    value={value || ''}
                    onChange={e => handleChange(e.target.value)}
                    placeholder={item.placeholder || ''}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-900 font-sans shadow-sm outline-none focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 transition-all placeholder:text-slate-300"
                />
            </div>
            {/* Botão radio elegante */}
            <button
                type="button"
                disabled={radioDisabled}
                onClick={() => onRadioChange(!radioChecked)}
                title={radioDisabled ? 'Já existe um vínculo marcado no outro campo' : `Marcar como ${radioLabel}`}
                className={[
                    'flex items-center gap-2 px-3 py-2 rounded-xl border transition-all shrink-0 text-xs font-bold',
                    radioChecked
                        ? 'bg-emerald-50 border-emerald-600 text-emerald-700'
                        : 'bg-slate-50 border-slate-200 text-slate-400 hover:border-slate-300',
                    radioDisabled ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'
                ].join(' ')}
            >
                <div className={[
                    'w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all',
                    radioChecked ? 'border-emerald-600 bg-emerald-600' : 'border-slate-300 bg-white'
                ].join(' ')}>
                    {radioChecked && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                </div>
                <span>{radioLabel}</span>
            </button>
        </div>
        {item.helpText && (
            <p className="text-xs text-slate-500 mt-2 ml-1">{item.helpText}</p>
        )}
        {isAutoFilled && (
            <div className="flex items-center gap-1 mt-1.5 ml-1">
                <span className="text-xs text-emerald-600 font-medium flex items-center gap-1 animate-[fadeIn_0.3s_ease-out]">
                    🔗 <span>Preenchido automaticamente</span>
                </span>
            </div>
        )}
    </div>
    );
};

/**
 * Navigation Button Component
 * Provides consistent styling for all navigation buttons
 */
const NavigationButton = ({ onClick, disabled = false, variant = 'default', children }) => {
    const variants = {
        tree:      'bg-amber-200 text-amber-950 border-amber-300 hover:bg-amber-300',
        back:      'bg-white text-black border-slate-200 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed',
        reference: 'bg-slate-200 text-slate-800 border-slate-300 hover:bg-slate-300',
        next:      'bg-slate-900 text-white border-slate-900 hover:bg-slate-800',
        save:      'bg-blue-600 text-white border-blue-600 hover:bg-blue-700',
        exit:      'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'
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
