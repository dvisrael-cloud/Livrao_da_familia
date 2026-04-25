import React, { useState, useRef, useEffect } from 'react';
import { Mic, Video, Type, Upload, X, Play, Pause, Trash2, Camera, StopCircle } from 'lucide-react';

export const RichMediaInput = ({ item, value, onChange, formData, updateData }) => {
    const [activeTab, setActiveTab] = useState('text'); // text, audio, video

    // --- AUDIO STATE ---
    const [isRecordingAudio, setIsRecordingAudio] = useState(false);
    const [audioTime, setAudioTime] = useState(0);
    const [audioBlob, setAudioBlob] = useState(null);

    // --- VIDEO STATE ---
    const [videoMode, setVideoMode] = useState('idle'); // idle, recording, preview
    const [videoTime, setVideoTime] = useState(0);
    const [videoBlob, setVideoBlob] = useState(null);
    const [liveStream, setLiveStream] = useState(null);

    // --- DICTATION STATE ---
    const [isDictating, setIsDictating] = useState(false);

    // Refs
    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);
    const videoChunksRef = useRef([]);
    const timerRef = useRef(null);
    const fileInputRef = useRef(null);
    const videoInputRef = useRef(null);
    const recognitionRef = useRef(null);
    const liveVideoRef = useRef(null);

    // Keys
    const audioKey = `${item.fieldId}_audio`;
    const videoKey = `${item.fieldId}_video`;

    // Existing Data
    const existingAudio = formData?.[audioKey];
    const existingVideo = formData?.[videoKey];

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            stopTimer();
            if (liveStream) {
                liveStream.getTracks().forEach(track => track.stop());
            }
        };
    }, [liveStream]);

    // --- HELPER: TIMER ---
    const startTimer = (setter) => {
        setter(0);
        timerRef.current = setInterval(() => {
            setter(prev => prev + 1);
        }, 1000);
    };

    const stopTimer = () => {
        if (timerRef.current) clearInterval(timerRef.current);
    };

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    };

    // --- DICTATION (SPEECH TO TEXT) ---
    const toggleDictation = () => {
        if (isDictating) {
            recognitionRef.current?.stop();
            setIsDictating(false);
        } else {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            if (!SpeechRecognition) {
                alert("Seu navegador não suporta ditado de voz (Use Chrome, Edge ou Safari).");
                return;
            }

            const recognition = new SpeechRecognition();
            recognition.lang = 'pt-BR';
            recognition.continuous = true;
            recognition.interimResults = true;

            recognition.onstart = () => setIsDictating(true);

            recognition.onresult = (event) => {
                let finalTranscript = '';
                for (let i = event.resultIndex; i < event.results.length; ++i) {
                    if (event.results[i].isFinal) {
                        finalTranscript += event.results[i][0].transcript + ' ';
                    }
                }
                if (finalTranscript) {
                    // Append text safely
                    onChange((value || '') + finalTranscript);
                }
            };

            recognition.onerror = (event) => {
                console.error("Speech error", event);
                setIsDictating(false);
            };

            recognition.onend = () => {
                setIsDictating(false);
            };

            recognitionRef.current = recognition;
            recognition.start();
        }
    };

    // --- AUDIO RECORDING ---
    const startAudioRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorderRef.current = new MediaRecorder(stream);
            audioChunksRef.current = [];

            mediaRecorderRef.current.ondataavailable = (e) => {
                if (e.data.size > 0) audioChunksRef.current.push(e.data);
            };

            mediaRecorderRef.current.onstop = () => {
                const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                const file = new File([blob], `audio_${Date.now()}.webm`, { type: 'audio/webm' });
                updateData(audioKey, file);
                setAudioBlob(URL.createObjectURL(blob));
                stopTimer();
            };

            mediaRecorderRef.current.start();
            setIsRecordingAudio(true);
            startTimer(setAudioTime);
        } catch (err) {
            console.error("Mic Error:", err);
            alert("Erro ao acessar microfone.");
        }
    };

    const stopAudioRecording = () => {
        if (mediaRecorderRef.current && isRecordingAudio) {
            mediaRecorderRef.current.stop();
            mediaRecorderRef.current.stream.getTracks().forEach(t => t.stop());
            setIsRecordingAudio(false);
        }
    };

    const handleAudioUpload = (e) => {
        const file = e.target.files[0];
        if (file) updateData(audioKey, file);
    };

    const removeAudio = () => {
        if (confirm("Remover áudio?")) {
            setAudioBlob(null);
            updateData(audioKey, null);
        }
    };

    // --- VIDEO RECORDING ---
    const initCamera = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            setLiveStream(stream);
            if (liveVideoRef.current) {
                liveVideoRef.current.srcObject = stream;
            }
            setVideoMode('recording_ready');
        } catch (err) {
            console.error("Camera Error:", err);
            alert("Erro ao acessar câmera.");
        }
    };

    const startVideoRecording = () => {
        if (!liveStream) return;
        mediaRecorderRef.current = new MediaRecorder(liveStream);
        videoChunksRef.current = [];

        mediaRecorderRef.current.ondataavailable = (e) => {
            if (e.data.size > 0) videoChunksRef.current.push(e.data);
        };

        mediaRecorderRef.current.onstop = () => {
            const blob = new Blob(videoChunksRef.current, { type: 'video/webm' });
            const file = new File([blob], `video_${Date.now()}.webm`, { type: 'video/webm' });
            updateData(videoKey, file);
            setVideoBlob(URL.createObjectURL(blob));

            // Stop stream
            liveStream.getTracks().forEach(t => t.stop());
            setLiveStream(null);
            setVideoMode('preview');
            stopTimer();
        };

        mediaRecorderRef.current.start();
        setVideoMode('recording');
        startTimer(setVideoTime);
    };

    const stopVideoRecording = () => {
        if (mediaRecorderRef.current && videoMode === 'recording') {
            mediaRecorderRef.current.stop();
        }
    };

    const cancelVideoRecording = () => {
        if (liveStream) {
            liveStream.getTracks().forEach(t => t.stop());
            setLiveStream(null);
        }
        setVideoMode('idle');
        stopTimer();
    };

    const handleVideoUpload = (e) => {
        const file = e.target.files[0];
        if (file) updateData(videoKey, file);
    };

    const removeVideo = () => {
        if (confirm("Remover vídeo?")) {
            setVideoBlob(null);
            updateData(videoKey, null);
            setVideoMode('idle');
        }
    };

    // --- PREVIEWS ---
    const getPreviewUrl = (data) => {
        if (!data) return null;
        if (typeof data === 'string') return data;
        if (data instanceof File || data instanceof Blob) return URL.createObjectURL(data);
        return null;
    };

    const finalAudioUrl = audioBlob || getPreviewUrl(existingAudio);
    const finalVideoUrl = videoBlob || getPreviewUrl(existingVideo);

    return (
        <div className="flex flex-col w-full mb-8">
            <label className="text-lg font-serif font-bold text-slate-800 mb-2 block">
                {item.label}
            </label>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                {/* Tabs */}
                <div className="flex border-b border-slate-100 bg-slate-50/50">
                    <button type="button" onClick={() => setActiveTab('text')} className={`flex-1 py-3 px-4 flex items-center justify-center gap-2 text-sm font-bold uppercase transition-colors ${activeTab === 'text' ? 'bg-white text-blue-600 border-b-2 border-blue-600' : 'text-slate-500 hover:bg-slate-100'}`}>
                        <Type size={16} /> Texto
                    </button>
                    <button type="button" onClick={() => setActiveTab('audio')} className={`flex-1 py-3 px-4 flex items-center justify-center gap-2 text-sm font-bold uppercase transition-colors ${activeTab === 'audio' ? 'bg-white text-purple-600 border-b-2 border-purple-600' : 'text-slate-500 hover:bg-slate-100'}`}>
                        <Mic size={16} /> Áudio
                        {existingAudio && <span className="w-2 h-2 bg-purple-500 rounded-full"></span>}
                    </button>
                    <button type="button" onClick={() => setActiveTab('video')} className={`flex-1 py-3 px-4 flex items-center justify-center gap-2 text-sm font-bold uppercase transition-colors ${activeTab === 'video' ? 'bg-white text-rose-600 border-b-2 border-rose-600' : 'text-slate-500 hover:bg-slate-100'}`}>
                        <Video size={16} /> Vídeo
                        {existingVideo && <span className="w-2 h-2 bg-rose-500 rounded-full"></span>}
                    </button>
                </div>

                {/* Content */}
                <div className="p-4 bg-white min-h-[200px]">

                    {/* TEXT TAB */}
                    {activeTab === 'text' && (
                        <div className="relative animate-fade-in group">
                            <textarea
                                value={value || ''}
                                onChange={(e) => onChange(e.target.value)}
                                placeholder={item.placeholder || "Escreva sua história aqui..."}
                                rows={8}
                                className="w-full p-2 border-0 focus:ring-0 text-slate-700 font-serif text-lg leading-relaxed placeholder:text-slate-300 resize-none rounded-lg focus:bg-slate-50 transition-colors"
                            />
                            {/* Dictation Button */}
                            <button
                                type="button"
                                onClick={toggleDictation}
                                className={`absolute bottom-8 right-2 p-3 rounded-full shadow-md transition-all ${isDictating ? 'bg-red-500 text-white animate-pulse' : 'bg-blue-100 text-blue-600 hover:bg-blue-200'}`}
                                title="Ditar texto"
                            >
                                <Mic size={20} />
                            </button>
                            <p className="text-xs text-slate-400 mt-2 text-right">
                                {value ? value.length : 0} caracteres | {isDictating ? <span className="text-red-500 font-bold">Ouvindo...</span> : "Digite ou use o microfone"}
                            </p>
                        </div>
                    )}

                    {/* AUDIO TAB */}
                    {activeTab === 'audio' && (
                        <div className="flex flex-col items-center justify-center py-6 animate-fade-in gap-6">
                            {!finalAudioUrl && !isRecordingAudio && (
                                <div className="flex gap-4">
                                    <button type="button" onClick={startAudioRecording} className="flex flex-col items-center justify-center w-32 h-32 rounded-full bg-purple-50 hover:bg-purple-100 border-2 border-purple-100 transition-all group">
                                        <div className="w-16 h-16 rounded-full bg-purple-600 text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform mb-2">
                                            <Mic size={32} />
                                        </div>
                                        <span className="text-xs font-bold text-purple-900 uppercase">Gravar Voz</span>
                                    </button>
                                    <div className="flex flex-col justify-center text-slate-300 font-bold text-xs uppercase">OU</div>
                                    <button type="button" onClick={() => fileInputRef.current?.click()} className="flex flex-col items-center justify-center w-32 h-32 rounded-full bg-slate-50 hover:bg-slate-100 border-2 border-slate-100 transition-all group">
                                        <div className="w-16 h-16 rounded-full bg-white border border-slate-200 text-slate-500 flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform mb-2">
                                            <Upload size={24} />
                                        </div>
                                        <span className="text-xs font-bold text-slate-500 uppercase">Enviar</span>
                                    </button>
                                    <input type="file" ref={fileInputRef} accept="audio/*" className="hidden" onChange={handleAudioUpload} />
                                </div>
                            )}

                            {isRecordingAudio && (
                                <div className="flex flex-col items-center animate-pulse">
                                    <div className="text-4xl font-mono font-bold text-purple-600 mb-4">{formatTime(audioTime)}</div>
                                    <button type="button" onClick={stopAudioRecording} className="px-8 py-3 bg-red-500 hover:bg-red-600 text-white rounded-full font-bold uppercase tracking-wider shadow-lg flex items-center gap-2">
                                        <StopCircle size={16} /> Parar
                                    </button>
                                    <p className="text-xs text-purple-400 mt-4 uppercase font-bold tracking-widest">Gravando...</p>
                                </div>
                            )}

                            {finalAudioUrl && !isRecordingAudio && (
                                <div className="w-full max-w-md bg-purple-50 p-4 rounded-xl border border-purple-100 flex flex-col gap-3">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-bold text-purple-800 uppercase flex items-center gap-2"><Mic size={14} /> Áudio Gravado</span>
                                        <button type="button" onClick={removeAudio} className="text-red-500 hover:bg-red-100 p-1.5 rounded-full"><Trash2 size={16} /></button>
                                    </div>
                                    <audio controls src={finalAudioUrl} className="w-full h-10" />
                                </div>
                            )}
                        </div>
                    )}

                    {/* VIDEO TAB */}
                    {activeTab === 'video' && (
                        <div className="flex flex-col items-center justify-center py-6 animate-fade-in gap-6">

                            {/* 1. SELECTION STATE */}
                            {!videoMode.startsWith('recording') && videoMode !== 'preview' && !finalVideoUrl && (
                                <div className="flex gap-4">
                                    <button type="button" onClick={initCamera} className="flex flex-col items-center justify-center w-32 h-32 rounded-full bg-rose-50 hover:bg-rose-100 border-2 border-rose-100 transition-all group">
                                        <div className="w-16 h-16 rounded-full bg-rose-600 text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform mb-2">
                                            <Video size={32} />
                                        </div>
                                        <span className="text-xs font-bold text-rose-900 uppercase">Câmera</span>
                                    </button>
                                    <div className="flex flex-col justify-center text-slate-300 font-bold text-xs uppercase">OU</div>
                                    <button type="button" onClick={() => videoInputRef.current?.click()} className="flex flex-col items-center justify-center w-32 h-32 rounded-full bg-slate-50 hover:bg-slate-100 border-2 border-slate-100 transition-all group">
                                        <div className="w-16 h-16 rounded-full bg-white border border-slate-200 text-slate-500 flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform mb-2">
                                            <Upload size={24} />
                                        </div>
                                        <span className="text-xs font-bold text-slate-500 uppercase">Enviar</span>
                                    </button>
                                    <input type="file" ref={videoInputRef} accept="video/*" className="hidden" onChange={handleVideoUpload} />
                                </div>
                            )}

                            {/* 2. RECORDING STATE */}
                            {(videoMode === 'recording_ready' || videoMode === 'recording') && (
                                <div className="flex flex-col items-center w-full max-w-lg bg-black rounded-lg overflow-hidden relative shadow-xl">
                                    <video ref={liveVideoRef} autoPlay muted playsInline className="w-full bg-black aspect-video object-cover" />

                                    <div className="absolute bottom-4 flex gap-4 items-center z-10">
                                        {videoMode === 'recording' ? (
                                            <button type="button" onClick={stopVideoRecording} className="w-16 h-16 rounded-full border-4 border-white flex items-center justify-center bg-red-600 hover:scale-105 transition-transform shadow-lg">
                                                <div className="w-6 h-6 bg-white rounded-sm" />
                                            </button>
                                        ) : (
                                            <button type="button" onClick={startVideoRecording} className="w-16 h-16 rounded-full border-4 border-white flex items-center justify-center bg-red-500 hover:scale-105 transition-transform shadow-lg group">
                                                <div className="w-14 h-14 rounded-full bg-red-600 group-hover:bg-red-700" />
                                            </button>
                                        )}
                                    </div>
                                    <button onClick={cancelVideoRecording} className="absolute top-4 right-4 text-white bg-black/50 p-2 rounded-full hover:bg-black/80"><X size={20} /></button>

                                    {videoMode === 'recording' && (
                                        <div className="absolute top-4 left-4 bg-red-600 text-white px-3 py-1 rounded-md text-xs font-mono font-bold animate-pulse">
                                            REC {formatTime(videoTime)}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* 3. PREVIEW STATE */}
                            {finalVideoUrl && videoMode !== 'recording' && videoMode !== 'recording_ready' && (
                                <div className="w-full max-w-md relative group">
                                    <video controls src={finalVideoUrl} className="w-full rounded-lg shadow-md bg-black" />
                                    <button type="button" onClick={removeVideo} className="absolute top-2 right-2 bg-white/90 text-red-600 p-2 rounded-full shadow-md hover:bg-white transition-colors" title="Remover vídeo">
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
            {item.helpText && <p className="text-xs text-slate-400 mt-2 ml-1">{item.helpText}</p>}
        </div>
    );
};
