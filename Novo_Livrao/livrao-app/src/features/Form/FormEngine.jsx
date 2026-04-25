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

const XRAY_MODE = true;

// ==================== MOTOR DE LINGUAGEM NATURAL ====================
const ACTION_OPTIONS = [
    { label: 'Esposo de', sexo: 'Masculino', conjugal: 'Casado' },
    { label: 'Esposa de', sexo: 'Feminino', conjugal: 'Casado' },
    { label: 'Companheiro de', sexo: 'Masculino', conjugal: 'União Estável' },
    { label: 'Companheira de', sexo: 'Feminino', conjugal: 'União Estável' },
    { label: 'Filho de', sexo: 'Masculino', conjugal: null },
    { label: 'Filha de', sexo: 'Feminino', conjugal: null },
    { label: 'Pai de', sexo: 'Masculino', conjugal: null },
    { label: 'Mãe de', sexo: 'Feminino', conjugal: null },
    { label: 'Irmão de', sexo: 'Masculino', conjugal: null },
    { label: 'Irmã de', sexo: 'Feminino', conjugal: null }
];

export function calculateGlobalRelation(acaoA, ancoraRoleInfo) {
    if (!acaoA || !ancoraRoleInfo) return 'Calculando...';
    const acao = acaoA.toLowerCase();
    const role = ancoraRoleInfo.toLowerCase();
    
    const isRep = role.includes('eu mesmo') || role === 'representante';
    
    if (acao.includes('filh')) {
        if (isRep) return 'Filho(a)';
        if (role.includes('irmã') || role === 'irmão') return 'Sobrinho(a)';
        if (role.includes('pai') || role.includes('mãe')) return 'Irmão(ã)';
        return `Filho(a) do(a) ${ancoraRoleInfo}`;
    }
    
    if (acao.includes('espos') || acao.includes('companheir')) {
        if (isRep) return 'Cônjuge';
        if (role.includes('pai') || role.includes('mãe')) return 'Madrasta/Padrasto';
        return `Cônjuge do(a) ${ancoraRoleInfo}`;
    }
    
    if (acao.includes('pai') || acao.includes('mãe')) {
        if (isRep) return 'Pai/Mãe';
        if (role.includes('irmã') || role === 'irmão') return 'Pai/Mãe';
        if (role.includes('cônjuge')) return 'Sogro/Sogra';
        return `Pai/Mãe do(a) ${ancoraRoleInfo}`;
    }

    if (acao.includes('irmã') || acao === 'irmão') {
        if (isRep) return 'Irmão/Irmã';
        if (role.includes('pai') || role.includes('mãe')) return 'Tio/Tia';
        if (role.includes('filh')) return 'Filho(a)';
        return `Irmão/Irmã do(a) ${ancoraRoleInfo}`;
    }

    // Default estrito simplificado
    return `Parente`;
}

const SearchableAnchorSelector = ({ value, onChange, familyMembers, currentDocId, disabled }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    
    const selectedObj = Object.values(familyMembers || {}).find(m => (m.docId || m.id || m.key) === value);
    const displayValue = selectedObj ? (selectedObj.nomeCompleto || selectedObj.name || selectedObj.id) : '';

    const list = Object.values(familyMembers || {})
        .filter(m => {
            const mId = m.docId || m.id || m.key;
            return mId && mId !== currentDocId && (m.nomeCompleto || m.name);
        })
        .filter(m => (m.nomeCompleto || m.name || '').toLowerCase().includes(search.toLowerCase()))
        .sort((a,b) => (a.nomeCompleto||a.name).localeCompare(b.nomeCompleto||b.name));

    return (
        <div className="relative inline-block w-auto min-w-[180px] max-w-[280px]">
            {isOpen ? (
                <div className="absolute top-full mt-2 left-0 w-64 z-[100] bg-white rounded shadow-xl border border-slate-200 overflow-hidden font-sans">
                    <input 
                        type="text" 
                        autoFocus
                        className="w-full p-2 outline-none border-b border-slate-100 text-[13px]"
                        placeholder="Buscar Familiar..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        onBlur={() => setTimeout(() => setIsOpen(false), 250)} 
                    />
                    <div className="max-h-40 overflow-y-auto">
                        {list.length === 0 && <div className="p-2 text-[11px] text-slate-400 text-center">Nenhum encontrado.</div>}
                        {list.map(m => (
                            <div 
                                key={m.docId || m.id || m.key}
                                className="p-2 hover:bg-slate-50 cursor-pointer transition text-sm flex flex-col items-start border-b border-slate-50 last:border-0"
                                onMouseDown={(e) => { 
                                    e.preventDefault();
                                    const uuidLinked = m.docId || m.id || m.key;
                                    console.log("===============================");
                                    console.log("[MOTOR SEMÂNTICO] UI Dropdown clicado.");
                                    console.log("Membro Selecionado: ", m.nomeCompleto || m.name);
                                    console.log("UUID Capturado e Vinculado: ", uuidLinked);
                                    console.log("===============================");
                                    onChange(uuidLinked, m);
                                    setIsOpen(false);
                                    setSearch('');
                                }}
                            >
                                <span className="font-bold text-slate-700 leading-tight">{m.nomeCompleto || m.name}</span>
                                <span className="text-[10px] text-slate-400 capitalize">{m.relationshipInfo?.parentesco || m.parentesco || 'Membro'}</span>
                            </div>
                        ))}
                    </div>
                </div>
            ) : (
                <button 
                    type="button"
                    disabled={disabled}
                    onClick={() => setIsOpen(true)}
                    className="w-full py-1 px-3 bg-transparent border-b-2 border-slate-300 text-center text-lg md:text-xl font-bold text-slate-900 focus:border-history-green outline-none transition-all flex items-center justify-center gap-2 hover:border-slate-400 disabled:opacity-50"
                >
                    <span className="truncate">{displayValue || '[Selecionar Âncora]'}</span>
                    {!disabled && <svg className="w-4 h-4 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>}
                </button>
            )}
        </div>
    );
};

const ConnectionHeader = ({ formData, setFormData, updateFormData, familyMembers }) => {
    
    const selfId = formData?.docId || formData?.id || '';
    
    // ITEM 3: Esconder do Representante (Dono da Árvore)
    const isRepresentative = selfId === "1DyECP2wp9PJ3FjttzjlcQTIDc92" || formData?.parentesco === 'Eu Mesmo' || formData?.relationshipInfo?.papel === 'Eu Mesmo';
    if (isRepresentative) return null;

    // ITEM 2: Ajuste de Trunk com nomes corretos
    const isPai = formData?.parentesco === 'Pai' || formData?.relationshipInfo?.papel === 'Pai';
    const isMae = formData?.parentesco === 'Mãe' || formData?.relationshipInfo?.papel === 'Mãe';
    const isTrunkLocked = isPai || isMae;
    
    // CADEADO DO TRONCO SEGURO POR DB ID
    if (isTrunkLocked) {
        const spouseName = isPai ? 'Júlia Cohen Israel' : 'Vidal David Israel';
        const verb = isPai ? 'Pai' : 'Mãe';
        const thisName = isPai ? 'Vidal David Israel' : 'Júlia Cohen Israel';
        
        return (
            <div className="w-full md:col-span-12 mb-8 animate-[fadeIn_0.5s_ease-out] flex flex-col items-center justify-center pt-4">
                 <p className="text-xl md:text-2xl font-serif text-slate-800 text-center leading-relaxed">
                     <strong>{thisName}</strong> é casado(a) com <strong>{spouseName}</strong> e é <strong>{verb} de David Vidal Israel</strong>.
                 </p>
                 <div className="mt-3 flex items-center gap-1.5 px-3 py-1 bg-slate-100 rounded-full text-[10px] uppercase font-bold tracking-widest text-slate-500">
                    <span>🔒</span>
                    <span>Ligações Fixas do Tronco da Árvore</span>
                 </div>
            </div>
        );
    }
    
    const currentName = formData?.nomeCompleto || formData?.name || 'Este Membro';
    const currentAcao = formData?.vinculoAcao || '';
    const currentFamiliarId = formData?.vinculoFamiliarId || '';
    
    React.useEffect(() => {
        if (currentFamiliarId && currentAcao && !formData.relationshipInfo?.papel) {
             const mDoc = familyMembers[currentFamiliarId] || Object.values(familyMembers).find(m => (m.docId || m.id || m.key) === currentFamiliarId);
             if (mDoc) {
                 const roleB = mDoc.relationshipInfo?.papel || mDoc.parentesco || '';
                 const calculatedRole = calculateGlobalRelation(currentAcao, roleB);
                 updateFormData('parentesco', calculatedRole);
                 updateFormData('relationshipInfo', { ...(formData.relationshipInfo || {}), papel: calculatedRole, parentesco: calculatedRole });
             }
        }
    }, [currentFamiliarId, currentAcao, familyMembers]);
    
    const handleAcaoChange = (e) => {
        const acao = e.target.value;
        const newUpdates = { vinculoAcao: acao };
        
        const match = ACTION_OPTIONS.find(a => a.label === acao);
        if (match) {
            if (match.sexo) newUpdates.sexo = match.sexo;
            if (match.conjugal) newUpdates.situacaoConjugal = match.conjugal;
        }
        
        // Recalcular Motor Síncrono
        if (currentFamiliarId && acao) {
            const mDoc = familyMembers[currentFamiliarId] || Object.values(familyMembers).find(m => (m.docId || m.id || m.key) === currentFamiliarId);
            if (mDoc) {
                const roleB = mDoc.relationshipInfo?.papel || mDoc.parentesco || '';
                const calculatedRole = calculateGlobalRelation(acao, roleB);
                newUpdates.parentesco = calculatedRole;
                newUpdates.relationshipInfo = { ...(formData.relationshipInfo || {}), papel: calculatedRole, parentesco: calculatedRole };
                
                // Item 5: Sincronia de Pais
                if (acao === 'Filho de' || acao === 'Filha de') {
                    if (mDoc.sexo === 'Masculino' || !mDoc.sexo) {
                        newUpdates.nomePai = mDoc.nomeCompleto || mDoc.name || '';
                    } else if (mDoc.sexo === 'Feminino') {
                        newUpdates.nomeMae = mDoc.nomeCompleto || mDoc.name || '';
                    }
                }
            }
        }
        
        Object.entries(newUpdates).forEach(([k, v]) => updateFormData(k, v));
    };
    
    const handleAncoraChange = (vId, ancDoc) => {
        const newUpdates = { vinculoFamiliarId: vId };
        
        if (currentAcao && ancDoc) {
             const roleB = ancDoc.relationshipInfo?.papel || ancDoc.parentesco || '';
             const calculatedRole = calculateGlobalRelation(currentAcao, roleB);
             
             newUpdates.parentesco = calculatedRole;
             newUpdates.relationshipInfo = { ...(formData.relationshipInfo || {}), papel: calculatedRole, parentesco: calculatedRole };
             
             // Item 5: Sincronia de Pais
             if (currentAcao === 'Filho de' || currentAcao === 'Filha de') {
                 if (ancDoc.sexo === 'Masculino' || !ancDoc.sexo) {
                     newUpdates.nomePai = ancDoc.nomeCompleto || ancDoc.name || '';
                 } else if (ancDoc.sexo === 'Feminino') {
                     newUpdates.nomeMae = ancDoc.nomeCompleto || ancDoc.name || '';
                 }
             }
        }
        
        Object.entries(newUpdates).forEach(([k, v]) => updateFormData(k, v));
    };

    return (
        <div className="w-full md:col-span-12 mb-8 animate-[fadeIn_0.5s_ease-out] text-slate-800 flex justify-center px-2" style={{ fontFamily: "'Cormorant Garamond', 'Playfair Display', serif" }}>
            <div className="text-xl md:text-[1.35rem] text-center flex flex-wrap items-center justify-center gap-x-2 gap-y-4 max-w-4xl leading-loose">
                
                <strong className="tracking-tight" style={{ fontFamily: "'Cinzel', serif" }}>{currentName}</strong>
                
                <span>é</span>
                
                <select 
                    className="inline-block px-1 py-1 bg-transparent border-b-2 border-slate-300 text-center font-bold text-slate-900 focus:border-history-green outline-none transition-all cursor-pointer appearance-none min-w-[130px]"
                    style={{ textAlignLast: 'center' }}
                    value={currentAcao}
                    onChange={handleAcaoChange}
                >
                    <option value="" disabled>Selecione a relação</option>
                    {ACTION_OPTIONS.map(a => <option key={a.label} value={a.label}>{a.label}</option>)}
                </select>
                
                <span>de</span>
                
                <SearchableAnchorSelector 
                    value={currentFamiliarId} 
                    onChange={handleAncoraChange} 
                    familyMembers={familyMembers}
                    currentDocId={selfId}
                />
                
                {currentAcao && currentFamiliarId && (
                    <span className="flex items-center gap-1 flex-wrap justify-center animate-[fadeIn_0.4s_ease-out]">
                        <span className="italic px-1">—</span>
                        <span className="text-[14px] leading-none opacity-60 relative top-[-1px] font-sans">*</span>
                        <span className="tracking-tight px-0.5">
                            que é seu <strong style={{ fontFamily: "'Cinzel', serif" }}>{(formData?.relationshipInfo?.papel || 'Calculando...')}</strong>
                        </span><span className="relative left-[-2px]">.</span>
                    </span>
                )}
            </div>
        </div>
    );
};

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
    useEffect(() => {
        // Collect all currently visible field IDs
        const visibleFieldIds = new Set();
        formConfig.forEach(item => {
            if (isVisible(item)) {
                visibleFieldIds.add(item.fieldId);
            }
        });

        // Identify fields that should be cleared
        const cleanedData = { ...formData };
        let hasChanges = false;

        Object.keys(formData).forEach(key => {
            // Skip internal, structural, or non-config fields
            if (key.startsWith('_') || key === 'relationshipInfo' || key === 'parentesco' || key === 'id_unico' || key === 'vinculoAcao' || key === 'vinculoFamiliarId') return;

            // Check if it's a field defined in config
            const configField = formConfig.find(f => f.fieldId === key);
            if (configField && !visibleFieldIds.has(key)) {
                // Field exists in config but is currently invisible - clear it
                if (formData[key] !== undefined && formData[key] !== '' && formData[key] !== null) {
                    delete cleanedData[key];
                    hasChanges = true;
                }
            }
        });

        if (hasChanges) {
            // Use a functional update to avoid stale state issues and loops
            setFormData(prev => {
                const updated = { ...prev };
                let reallyChanged = false;
                Object.keys(cleanedData).forEach(k => {
                   if (updated[k] !== cleanedData[k]) {
                       updated[k] = cleanedData[k];
                       reallyChanged = true;
                   }
                });
                // Also handle deletions
                Object.keys(updated).forEach(k => {
                    if (cleanedData[k] === undefined && updated[k] !== undefined) {
                        if (!k.startsWith('_') && k !== 'relationshipInfo' && k !== 'parentesco' && k !== 'id_unico') {
                            delete updated[k];
                            reallyChanged = true;
                        }
                    }
                });
                return reallyChanged ? updated : prev;
            });
        }
    }, [formData, isVisible]);

    // ==================== FORM DATA UPDATER ====================

    // ==================== FORM DATA UPDATER ====================
    const updateFormData = useCallback((key, value) => {
        if (key === 'sexo') {
            const currentRole = formData.relationshipInfo?.papel || '';
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

            const pivotRule = pivotMap[currentRole];
            if (pivotRule && value === pivotRule.reqGender) {
                // Pivot try
                const occupant = familyMembers[pivotRule.targetRole];
                if (occupant && occupant.nomeCompleto) {
                    // Collision block!
                    alert(`Aposição Inválida: O cargo de '${pivotRule.targetRole}' já se encontra ocupado por ${occupant.nomeCompleto || occupant.name}. Mude a aba ou exclua o parente antes de trocar o sexo.`);
                    setFormData(prev => ({ ...prev, sexo: pivotRule.revertGender }));
                    return;
                } else {
                    // Safe Pivot
                    setFormData(prev => ({ 
                        ...prev, 
                        sexo: value,
                        parentesco: pivotRule.targetRole,
                        relationshipInfo: {
                            ...prev.relationshipInfo,
                            papel: pivotRule.targetRole,
                            parentesco: pivotRule.targetRole
                        }
                    }));
                    return;
                }
            }
        }
        setFormData(prev => ({ ...prev, [key]: value }));
    }, [setFormData, formData, familyMembers]);

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

        console.log('[FormEngine] handleFamilyTreeChange chamado:', {
            papel: newVal.papel,
            parentesco: newVal.parentesco,
            existingDataEncontrado: !!existingData,
            caminho: existingData ? 'A — EDIÇÃO (dados existentes)' : 'B — CRIAÇÃO (formulário limpo)'
        });

        if (existingData) {
            // Caminho A: membro já existe → carrega dados reais com prioridade total
            console.log('[FormEngine] Caminho A — carregando dados de:', existingData.nomeCompleto || newVal.papel);

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
                ...existingData,
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
            console.log('[FormEngine] Caminho B — Criando novo parente. Resetando estado com INITIAL_STATE.');
            setFormData(prev => {
                const newState = {
                    ...INITIAL_STATE,
                    repName: prev.repName,
                    repEmail: prev.repEmail,
                    repPhone: prev.repPhone,
                    [fieldId]: newVal,
                    nomeCompleto: newVal.nome || '',
                    // [FASE 2] Propaga o UUID gerado pelo FamilyTreeSelector
                    ...(newVal._newDocId ? { docId: newVal._newDocId, id: newVal._newDocId } : {})
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

                // 3. SMART PRE-FILL FOR ANCESTORS (Parents, Grandparents, etc.)
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

                const precData = ANCESTOR_PREC_MAP[newVal.papel];
                if (precData) {
                    const childDoc = familyMembers[precData.child] || {};
                    newState.nomeCompleto = childDoc[precData.field] || '';
                    newState.sexo = precData.gender;
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

        // Dynamic tense replacement based on vitalStatus
        const isAlive = formData.vitalStatus === 'Vivo';
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
                    {/* [NOVA ARQUITETURA] Header de Ligação: Motor de Linguagem Natural e Graus de Parentesco */}
                    {!isFamilyTreeSection && (
                        <ConnectionHeader 
                            formData={formData} 
                            setFormData={setFormData}
                            updateFormData={updateFormData}
                            familyMembers={familyMembers}
                        />
                    )}

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
                        <NavigationButton
                            onClick={() => onCancel ? onCancel() : window.history.back()}
                            variant="back"
                        >
                            Cancelar
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
