import React, { useState, useEffect, useRef } from 'react';
// import { useAuth } from '../../context/AuthContext'; // Removed
import { getAccountData, updateAccountData, uploadAccountPhoto, fetchUserData } from '../../services/profileService';
import { AutoLocationSelector } from '../../components/AutoLocationSelector';
import PhoneInput from 'react-phone-input-2';
import 'react-phone-input-2/lib/style.css';
import { Camera, Save, User, Smartphone, MapPin, Loader2, Briefcase } from 'lucide-react';

export const AccountSettings = ({ user, onComplete }) => {
    // const { user } = useAuth(); // Removed
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        profession: '',
        repPhone: '',
        reAddress: {}, // Structure expected by LocationSelector
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
            photoURL: data.photoURL || user.photoURL || ''
        }));

        setUserInfo({
            plan: familyData.adminRole || 'Basic',
            role: familyData.role || 'Representante'
        });

        setLoading(false);
    }, [user]);

    useEffect(() => {
        if (user?.uid) {
            loadData();
        }
    }, [loadData, user?.uid]);



    const handleCameraStart = async () => {
        setCameraOpen(true);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }
        } catch (err) {
            console.error("Camera Error:", err);
            alert("Não foi possível acessar a câmera.");
            setCameraOpen(false);
        }
    };

    const handleCapture = async () => {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        if (video && canvas) {
            const context = canvas.getContext('2d');
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            context.drawImage(video, 0, 0, canvas.width, canvas.height);

            // Stop stream
            const stream = video.srcObject;
            const tracks = stream.getTracks();
            tracks.forEach(track => track.stop());
            setCameraOpen(false);

            // Upload
            canvas.toBlob(async (blob) => {
                const res = await uploadAccountPhoto(user.uid, blob);
                if (res.status === 'success') {
                    setFormData(prev => ({ ...prev, photoURL: res.url }));
                } else {
                    alert('Erro ao salvar foto: ' + res.message);
                }
            }, 'image/jpeg', 0.8);
        }
    };

    const handleSave = async () => {
        // Validation
        if (!formData.repPhone || formData.repPhone.length < 8) {
            alert("Por favor, informe um telefone válido.");
            return;
        }
        if (!formData.photoURL) {
            alert("A foto de perfil (Selfie) é obrigatória para identificação.");
            return;
        }

        setSaving(true);
        const res = await updateAccountData(user.uid, formData);
        setSaving(false);

        if (res.status === 'success') {
            if (onComplete) onComplete();
            else alert("Dados salvos com sucesso!");
        } else {
            alert("Erro ao salvar: " + res.message);
        }
    };

    if (loading) return <div className="flex justify-center p-10"><Loader2 className="animate-spin" /></div>;

    return (
        <div className="max-w-2xl mx-auto bg-white p-6 rounded-xl shadow-lg mt-10">
            <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                    <User /> Minha Conta
                </div>
                {(userInfo.plan || userInfo.role) && (
                    <div className="flex items-center gap-2">
                        {userInfo.plan && (
                            <span className="text-xs font-bold text-amber-900 bg-amber-100 px-2 py-1 rounded border border-amber-200 uppercase tracking-wider">
                                {userInfo.plan}
                            </span>
                        )}
                        {userInfo.role && (
                            <span className="text-xs font-semibold text-sky-700 bg-sky-50 px-3 py-1 rounded-full border border-sky-100 uppercase tracking-wide">
                                {(userInfo.role === 'representative' || userInfo.plan?.toLowerCase() === 'master') ? 'Representante' : (userInfo.role === 'member' ? 'Membro' : userInfo.role)}
                            </span>
                        )}
                    </div>
                )}
            </h2>
            <p className="text-sm text-slate-500 mb-6">
                Para manter a segurança e organização da Comissão, precisamos que você mantenha esses dados atualizados.
            </p>

            {/* FOTO DE PERFIL / SELFIE */}


            {/* FORMULÁRIO */}
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

                {/* FOTO DE PERFIL / SELFIE (Moved) */}
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
                                <img src={formData.photoURL} alt="Perfil" className="w-32 h-32 rounded-full object-cover border-4 border-blue-500 shadow-md" />
                            ) : (
                                <div className="w-32 h-32 rounded-full bg-slate-200 flex items-center justify-center text-slate-400">
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
                            borderColor: '#d6d3d1' // stone-300
                        }}
                        buttonStyle={{
                            borderRadius: '0.375rem 0 0 0.375rem',
                            borderColor: '#d6d3d1',
                            backgroundColor: '#f5f5f4' // stone-100
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

            <div className="mt-8">
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="w-full bg-green-600 text-white py-3 rounded-lg font-bold text-lg hover:bg-green-700 transition flex items-center justify-center gap-2 disabled:opacity-50"
                >
                    {saving ? <Loader2 className="animate-spin" /> : <Save />}
                    Salvar e Continuar
                </button>
            </div>
        </div>
    );
};
