import React from 'react';

export const ProgressIndicator = ({ percent = 0, message = '', visible = false }) => {
    if (!visible) return null;

    // Video located in public folder; spaces encoded
    const videoSrc = '/logo%20em%20movimento.mp4';

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
            <div className="w-full max-w-md p-6 bg-white/95 rounded-xl shadow-xl text-center">
                <div className="relative w-48 h-28 mx-auto mb-4">
                    <video src={videoSrc} autoPlay loop muted className="w-full h-full object-cover rounded-md" />
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-white text-2xl font-bold drop-shadow-lg">{percent}%</div>
                    </div>
                </div>
                <div className="text-sm text-stone-600 mb-3">{message || 'Enviando arquivos...'}</div>
                <div className="w-full bg-stone-100 rounded-full h-2 overflow-hidden">
                    <div className="bg-history-green h-2" style={{ width: `${percent}%` }} />
                </div>
            </div>
        </div>
    );
};

export default ProgressIndicator;
