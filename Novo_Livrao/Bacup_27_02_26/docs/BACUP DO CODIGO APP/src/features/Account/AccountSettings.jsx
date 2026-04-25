import React, { useState, useEffect, useRef } from 'react';
import { getAccountData, updateAccountData, uploadAccountPhoto, fetchUserData } from '../../services/profileService';
import { AutoLocationSelector } from '../../components/AutoLocationSelector';
import PhoneInput from 'react-phone-input-2';
import 'react-phone-input-2/lib/style.css';
import { Camera, Save, User, Smartphone, MapPin, Loader2, Briefcase, Pencil, X, ArrowLeft, ArrowRight } from 'lucide-react';

export const AccountSettings = ({ user, onComplete, onBack }) => {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [editing, setEditing] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        profession: '',
        repPhone: '',
        reAddress: {},
        photoURL: ''
    });
    const [userInfo, setUserInfo] = useState({ plan: '', role: '' });

    // Camera State
    const [cameraOpen, setCameraOpen] = useState(false);
    const videoRef = useRef(null);
    const canvasRef = useRef(null);

    const loadData = React.useCallback(async () => {
        setLoading(true);
        const [accountData, familyData] = await Promise.all([
            getAccountData(user.uid),
            fetchUserData(user.uid)
        ]);

        const data = accountData || {};

        setFormData(prev => ({
            ...prev,
            name: data.name || user.displayName || '',
            profession: data.profession || '',
            repPhone: data.repPhone || '',
            reAddress: data.reAddress || {},
            photoURL: data.photoURL || ''
        }));

        if (familyData || data) {
            const plan = familyData?.adminRole || data?.adminRole || familyData?.plan || data?.plan || '';
            const role = familyData?.role || data?.role || '';
            setUserInfo({ plan, role });
        }

        setLoading(false);
    }, [user]);

    useEffect(() => { loadData(); }, [loadData]);

    // Camera handlers
    const handleCameraStart = async () => {
        setCameraOpen(true);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
            if (videoRef.current) videoRef.current.srcObject = stream;
        } catch (err) { console.error("Camera error:", err); setCameraOpen(false); }
    };

    const handleCapture = async () => {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        if (!video || !canvas) return;

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        canvas.getContext('2d').drawImage(video, 0, 0);

        const stream = video.srcObject;
        if (stream) stream.getTracks().forEach(t => t.stop());
        setCameraOpen(false);

        canvas.toBlob(async (blob) => {
            if (!blob) return;
            const file = new File([blob], `selfie_${Date.now()}.jpg`, { type: 'image/jpeg' });
            const url = await uploadAccountPhoto(user.uid, file);
            if (url) setFormData(p => ({ ...p, photoURL: url }));
        }, 'image/jpeg', 0.85);
    };

    const handleSave = async () => {
        setSaving(true);
        const res = await updateAccountData(user.uid, formData);
        setSaving(false);
        if (res?.status === 'success') {
            setEditing(false);
            if (onComplete) onComplete();
        } else {
            alert("Erro ao salvar: " + res.message);
        }
    };

    // Check if profile needs completion (first time)
    const isProfileIncomplete = !formData.name || !formData.repPhone;

    // Auto-enable edit mode if profile is incomplete
    useEffect(() => {
        if (!loading && isProfileIncomplete) setEditing(true);
    }, [loading, isProfileIncomplete]);

    if (loading) return <div className="flex justify-center p-10"><Loader2 className="animate-spin" /></div>;

    const formatPhone = (phone) => {
        if (!phone) return '—';
        const clean = phone.replace(/\D/g, '');
        if (clean.length === 13) return `+${clean.slice(0, 2)} (${clean.slice(2, 4)}) ${clean.slice(4, 9)}-${clean.slice(9)}`;
        if (clean.length === 12) return `+${clean.slice(0, 2)} (${clean.slice(2, 4)}) ${clean.slice(4, 8)}-${clean.slice(8)}`;
        return phone;
    };

    const getCity = () => {
        if (!formData.reAddress) return '—';
        if (typeof formData.reAddress === 'string') return formData.reAddress;
        if (formData.reAddress.fullAddress) return formData.reAddress.fullAddress;
        if (formData.reAddress.cidade) {
            const parts = [formData.reAddress.cidade, formData.reAddress.estado, formData.reAddress.pais];
            return parts.filter(Boolean).join(', ');
        }
        return '—';
    };

    return (
        <div className="w-full px-2 py-2">
            <h2 className="text-xl font-bold text-slate-800 mb-2 flex items-center gap-2">
                <div className="flex items-center gap-2">
                    <User /> Meu Perfil
                </div>
            </h2>
            {/* ========== MODO VISUALIZAÇÃO ========== */}
            {!editing ? (
                <div className="mt-3">
                    {/* Topo: Foto + Nome + Badges */}
                    <div className="flex gap-4 items-end mb-5">
                        {/* Foto */}
                        <div className="shrink-0">
                            {formData.photoURL ? (
                                <img src={formData.photoURL} alt="Perfil" className="w-24 h-32 rounded-lg object-cover border-2 border-emerald-200 shadow-md" />
                            ) : (
                                <div className="w-24 h-32 rounded-lg bg-slate-100 flex items-center justify-center text-slate-300 border-2 border-slate-200">
                                    <User size={40} />
                                </div>
                            )}
                        </div>

                        {/* Nome + Badges */}
                        <div className="flex flex-col justify-end gap-1.5">
                            <span className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">Nome</span>
                            <p className="text-xl font-bold text-slate-800 leading-tight">{formData.name || '—'}</p>
                            <span className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mt-1">Usuário</span>
                            <div className="flex items-center gap-2">
                                {userInfo.plan && (
                                    <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded tracking-wider uppercase">
                                        ⭐ {userInfo.plan}
                                    </span>
                                )}
                                {userInfo.role && (
                                    <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded tracking-wider uppercase">
                                        {(userInfo.role === 'representative' || userInfo.plan?.toLowerCase() === 'master') ? 'Representante' : (userInfo.role === 'member' ? 'Membro' : userInfo.role)}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Dados consolidados - Grid 2x2 */}
                    <div className="grid grid-cols-2 gap-4 border-t border-slate-200 pt-4">
                        <div>
                            <span className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">Profissão</span>
                            <p className="text-base text-slate-700">{formData.profession || '—'}</p>
                        </div>
                        <div>
                            <span className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">Telefone</span>
                            <p className="text-base text-slate-700 flex items-center gap-1.5">
                                <Smartphone size={14} className="text-slate-400" />
                                {formatPhone(formData.repPhone)}
                            </p>
                        </div>
                        <div>
                            <span className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">Residência</span>
                            <p className="text-base text-slate-700 flex items-center gap-1.5">
                                <MapPin size={14} className="text-slate-400" />
                                {getCity()}
                            </p>
                        </div>
                        <div>
                            <span className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">E-mail</span>
                            <p className="text-sm text-slate-500">{user.email}</p>
                        </div>
                    </div>

                    {/* 3 Botões */}
                    <div className="mt-5 flex gap-2">
                        <button
                            onClick={onBack}
                            className="flex-1 flex items-center justify-center gap-1.5 bg-white text-slate-600 py-2.5 rounded-xl font-semibold border-2 border-slate-300 hover:bg-slate-50 transition-all active:scale-95 text-sm"
                        >
                            <ArrowLeft size={16} />
                            Voltar
                        </button>
                        <button
                            onClick={() => setEditing(true)}
                            className="flex-1 flex items-center justify-center gap-1.5 bg-slate-100 text-slate-700 py-2.5 rounded-xl font-semibold border-2 border-slate-300 hover:bg-slate-200 transition-all active:scale-95 text-sm"
                        >
                            <Pencil size={16} />
                            Editar
                        </button>
                        <button
                            onClick={onComplete}
                            className="flex-1 flex items-center justify-center gap-1.5 bg-emerald-600 text-white py-2.5 rounded-xl font-semibold border-2 border-emerald-600 hover:bg-emerald-700 transition-all active:scale-95 text-sm"
                        >
                            Continuar
                            <ArrowRight size={16} />
                        </button>
                    </div>
                </div>
            ) : (
                /* ========== MODO EDIÇÃO ========== */
                <div className="mt-4">
                    <p className="text-sm text-slate-500 mb-6">
                        Mantenha seus dados atualizados para a segurança e organização do Livrão.
                    </p>

                    <div className="space-y-4">
                        {/* Nome */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-2">
                                <User size={14} /> Nome do Representante *
                            </label>
                            <input
                                type="text"
                                value={formData.name}
                                onChange={(e) => setFormData(p => ({ ...p, name: e.target.value }))}
                                className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                        </div>

                        {/* Profissão */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-2">
                                <Briefcase size={14} /> Profissão
                            </label>
                            <input
                                type="text"
                                value={formData.profession}
                                onChange={(e) => setFormData(p => ({ ...p, profession: e.target.value }))}
                                placeholder="Ex: Engenheiro, Professor, Autônomo"
                                className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                        </div>

                        {/* Foto / Selfie */}
                        <div className="my-6 text-center p-4 bg-slate-50 rounded-lg border border-slate-200 dashed">
                            <label className="block text-sm font-semibold text-slate-700 mb-2">Foto de Identificação (Selfie)</label>
                            {cameraOpen ? (
                                <div className="relative bg-black rounded-lg overflow-hidden max-w-sm mx-auto">
                                    <video ref={videoRef} autoPlay playsInline muted className="w-full h-64 object-cover" />
                                    <button
                                        onClick={handleCapture}
                                        className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-white text-black px-6 py-2 rounded-full font-bold shadow-lg hover:scale-105 transition"
                                    >
                                        Capturar Foto
                                    </button>
                                    <canvas ref={canvasRef} className="hidden" />
                                </div>
                            ) : (
                                <div className="flex flex-col items-center gap-3">
                                    {formData.photoURL ? (
                                        <img src={formData.photoURL} alt="Perfil" className="w-28 h-36 rounded-lg object-cover border-2 border-blue-500 shadow-md" />
                                    ) : (
                                        <div className="w-28 h-36 rounded-lg bg-slate-200 flex items-center justify-center text-slate-400">
                                            <User size={48} />
                                        </div>
                                    )}
                                    <button
                                        onClick={handleCameraStart}
                                        className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
                                    >
                                        <Camera size={18} />
                                        {formData.photoURL ? 'Atualizar Selfie' : 'Tirar Selfie Agora'}
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Telefone */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-2">
                                <Smartphone size={14} /> Telefone (WhatsApp)
                            </label>
                            <PhoneInput
                                country={'br'}
                                value={formData.repPhone}
                                onChange={phone => setFormData(prev => ({ ...prev, repPhone: phone }))}
                                inputStyle={{
                                    width: '100%',
                                    height: '42px',
                                    fontSize: '16px',
                                    paddingLeft: '48px',
                                    borderRadius: '0.375rem',
                                    borderColor: '#d6d3d1'
                                }}
                                buttonStyle={{
                                    borderRadius: '0.375rem 0 0 0.375rem',
                                    borderColor: '#d6d3d1',
                                    backgroundColor: '#f5f5f4'
                                }}
                                containerClass="mt-1"
                                placeholder="(99) 99999-9999"
                            />
                        </div>

                        {/* Email (Readonly) */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-2">
                                <span>@</span> E-mail (Login)
                            </label>
                            <input
                                type="text"
                                value={user.email}
                                disabled
                                className="w-full p-2 border border-slate-200 bg-slate-100 rounded-lg text-slate-500 cursor-not-allowed"
                            />
                        </div>

                        {/* Cidade */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-2">
                                <MapPin size={14} /> Cidade Atual
                            </label>
                            <AutoLocationSelector
                                label="Cidade de Residência"
                                value={formData.reAddress}
                                onChange={(val) => setFormData(p => ({ ...p, reAddress: val }))}
                                helpText="Digite e selecione a cidade na lista do Google"
                            />
                        </div>
                    </div>

                    {/* Botões Salvar + Cancelar */}
                    <div className="mt-8 flex gap-3">
                        {!isProfileIncomplete && (
                            <button
                                onClick={() => { setEditing(false); loadData(); }}
                                className="flex-1 flex items-center justify-center gap-2 bg-white text-slate-600 py-3 rounded-xl font-semibold border-2 border-slate-300 hover:bg-slate-50 transition active:scale-95"
                            >
                                <X size={18} />
                                Cancelar
                            </button>
                        )}
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="flex-1 bg-green-600 text-white py-3 rounded-xl font-bold text-lg hover:bg-green-700 transition flex items-center justify-center gap-2 disabled:opacity-50 active:scale-95"
                        >
                            {saving ? <Loader2 className="animate-spin" /> : <Save />}
                            Salvar
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
