/**
 * OnTheFlyModal — Captura de Datas para Parentes Detectados Automaticamente
 *
 * Este modal é exibido quando o handleSave detecta nomes em campos como
 * nomeConjuge, nomeFilho1..12 etc. que ainda não existem como documentos
 * no Firestore. Para cada parente detectado, solicita a dataNascimento
 * antes de prosseguir com o saveFamilyBatch.
 */

import React, { useState, useEffect } from 'react';
import { Users, Calendar, AlertTriangle, X, CheckCircle2, Loader2 } from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// MAPEAMENTO: campo da formData → { papa, parentesco, label amigável }
// ─────────────────────────────────────────────────────────────────────────────
export const FIELD_ROLE_MAP = [
    // Cônjuges
    { field: 'nomeConjuge',   papel: 'Cônjuge',   parentesco: 'Cônjuge',   label: 'Cônjuge' },
    { field: 'spouseName_2',  papel: 'Cônjuge 2', parentesco: 'Cônjuge 2', label: 'Cônjuge 2' },
    { field: 'spouseName_3',  papel: 'Cônjuge 3', parentesco: 'Cônjuge 3', label: 'Cônjuge 3' },
    { field: 'spouseName_4',  papel: 'Cônjuge 4', parentesco: 'Cônjuge 4', label: 'Cônjuge 4' },

    // Filhos — Casamento 1
    ...[1,2,3,4,5,6,7,8,9,10,11,12].map(n => ({
        field: `nomeFilho${n}`,
        papel: `Filho/a ${n}`,
        parentesco: 'Filho/a',
        label: `Filho(a) ${n} — Casamento 1`
    })),

    // Filhos — Casamento 2
    ...[1,2,3,4,5,6,7,8,9,10,11,12].map(n => ({
        field: `nomeFilho${n}_2`,
        papel: `Filho/a ${n}_C2`,
        parentesco: 'Filho/a',
        label: `Filho(a) ${n} — Casamento 2`
    })),

    // Filhos — Casamento 3
    ...[1,2,3,4,5,6,7,8,9,10,11,12].map(n => ({
        field: `nomeFilho${n}_3`,
        papel: `Filho/a ${n}_C3`,
        parentesco: 'Filho/a',
        label: `Filho(a) ${n} — Casamento 3`
    })),

    // Filhos — Casamento 4
    ...[1,2,3,4,5,6,7,8,9,10,11,12].map(n => ({
        field: `nomeFilho${n}_4`,
        papel: `Filho/a ${n}_C4`,
        parentesco: 'Filho/a',
        label: `Filho(a) ${n} — Casamento 4`
    })),
];

// ─────────────────────────────────────────────────────────────────────────────
// UTILITÁRIO: detecta parentes novos varressendo o formData
// ─────────────────────────────────────────────────────────────────────────────
/**
 * @param {object} formData        - Estado atual do FormEngine
 * @param {object} existingMembers - { [role]: memberDoc } do familyMembers
 * @returns {Array} [{ nome, papel, parentesco, label, fieldKey }]
 */
export const findNewMembers = (formData, existingMembers) => {
    const existingNames = new Set(
        Object.values(existingMembers)
            .map(m => m?.nomeCompleto?.trim()?.toLowerCase())
            .filter(Boolean)
    );
    const existingRoles = new Set(Object.keys(existingMembers));

    const detected = [];
    const seenNames = new Set(); // evita duplicatas na varredura

    for (const mapping of FIELD_ROLE_MAP) {
        const nome = formData[mapping.field]?.trim();
        if (!nome) continue;

        const nameLower = nome.toLowerCase();

        // Ignora se já existe um membro com este nome OU com este papel
        if (existingNames.has(nameLower)) continue;
        if (existingRoles.has(mapping.papel)) continue;
        if (seenNames.has(nameLower)) continue;

        seenNames.add(nameLower);
        detected.push({
            nome,
            papel:      mapping.papel,
            parentesco: mapping.parentesco,
            label:      mapping.label,
            fieldKey:   mapping.field
        });
    }

    return detected;
};

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENTE MODAL
// ─────────────────────────────────────────────────────────────────────────────
export const OnTheFlyModal = ({ isOpen, members, onConfirm, onCancel, isSaving }) => {
    const [dates, setDates] = useState({});

    // Reset quando o modal abre com nova lista
    useEffect(() => {
        if (isOpen) {
            const initial = {};
            members.forEach((m, i) => { initial[i] = ''; });
            setDates(initial);
        }
    }, [isOpen, members]);

    if (!isOpen || !members?.length) return null;

    const allFilled = members.every((_, i) => dates[i]?.trim());

    const handleConfirm = () => {
        const withDates = members.map((m, i) => ({
            ...m,
            dataNascimento: dates[i]?.trim() || ''
        }));
        onConfirm(withDates);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
             style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>

            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden"
                 style={{ border: '1px solid #e2e8f0' }}>

                {/* ── Header ── */}
                <div className="flex items-center gap-3 px-6 pt-6 pb-4"
                     style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <div className="w-10 h-10 rounded-full flex items-center justify-center"
                         style={{ backgroundColor: '#fef3c7' }}>
                        <Users size={20} style={{ color: '#d97706' }} />
                    </div>
                    <div className="flex-1">
                        <h2 className="text-base font-bold text-slate-800">
                            Novos membros detectados
                        </h2>
                        <p className="text-xs text-slate-500 mt-0.5">
                            {members.length} {members.length === 1 ? 'parente' : 'parentes'} encontrado{members.length > 1 ? 's' : ''} nos campos — precisamos da data de nascimento para criar o cadastro.
                        </p>
                    </div>
                    <button onClick={onCancel} disabled={isSaving}
                            className="p-2 rounded-lg hover:bg-slate-100 transition-colors">
                        <X size={18} className="text-slate-400" />
                    </button>
                </div>

                {/* ── Body ── */}
                <div className="overflow-y-auto flex-1 px-6 py-4 space-y-4">
                    <div className="flex items-start gap-2 p-3 rounded-lg"
                         style={{ backgroundColor: '#fffbeb', border: '1px solid #fde68a' }}>
                        <AlertTriangle size={16} style={{ color: '#d97706', marginTop: '2px', flexShrink: 0 }} />
                        <p className="text-xs text-amber-800">
                            Estes nomes foram preenchidos nos campos do formulário mas ainda <strong>não possuem cadastro</strong> na árvore. Ao confirmar, serão criados como <strong>rascunhos</strong> que você poderá completar depois.
                        </p>
                    </div>

                    {members.map((member, i) => (
                        <div key={i} className="p-4 rounded-xl"
                             style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}>

                            <div className="flex items-center justify-between mb-3">
                                <div>
                                    <p className="font-semibold text-slate-800 text-sm">{member.nome}</p>
                                    <p className="text-xs text-slate-500 mt-0.5">
                                        <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium"
                                              style={{ backgroundColor: '#e0f2fe', color: '#0369a1' }}>
                                            {member.label}
                                        </span>
                                    </p>
                                </div>
                            </div>

                            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">
                                <Calendar size={10} className="inline mr-1" />
                                Data de Nascimento *
                            </label>
                            <input
                                type="text"
                                placeholder="DD/MM/AAAA"
                                value={dates[i] || ''}
                                onChange={e => setDates(prev => ({ ...prev, [i]: e.target.value }))}
                                className="w-full p-2.5 rounded-lg text-sm text-slate-700 outline-none transition-all"
                                style={{
                                    border: dates[i]?.trim()
                                        ? '2px solid #22c55e'
                                        : '2px solid #e2e8f0',
                                    backgroundColor: '#fff'
                                }}
                            />
                        </div>
                    ))}
                </div>

                {/* ── Footer ── */}
                <div className="px-6 py-4 flex gap-3"
                     style={{ borderTop: '1px solid #f1f5f9' }}>

                    <button
                        onClick={onCancel}
                        disabled={isSaving}
                        className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
                        style={{ border: '1px solid #e2e8f0' }}>
                        Ignorar e salvar só o principal
                    </button>

                    <button
                        onClick={handleConfirm}
                        disabled={!allFilled || isSaving}
                        className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white transition-all flex items-center justify-center gap-2"
                        style={{
                            backgroundColor: allFilled && !isSaving ? '#16a34a' : '#94a3b8',
                            cursor: allFilled && !isSaving ? 'pointer' : 'not-allowed'
                        }}>
                        {isSaving
                            ? <><Loader2 size={15} className="animate-spin" /> Salvando...</>
                            : <><CheckCircle2 size={15} /> Criar {members.length} cadastro{members.length > 1 ? 's' : ''}</>
                        }
                    </button>
                </div>
            </div>
        </div>
    );
};

export default OnTheFlyModal;
