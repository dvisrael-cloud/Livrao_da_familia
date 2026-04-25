import React from 'react';

export const MainLayout = ({ children, title, subtitle, headerAction, headerBottom, navBar, headerTitle, view }) => {
    return (
        <div className="min-h-screen bg-slate-50 font-sans text-slate-900 selection:bg-amber-100 selection:text-amber-900 flex flex-col">

            {/* Header Structure based on User Mockup */}
            <header className="bg-white/80 text-slate-900 backdrop-blur-lg shadow-sm z-30 sticky top-0 border-b border-amber-400 transition-all duration-300">
                <div className="max-w-5xl mx-auto flex flex-col pt-3 pb-1">

                    {/* Top Section: Logo + Right Column (Actions & Info) */}
                    <div className="px-4 flex gap-4 items-center mb-2">

                        {/* 1. LOGO (Top Left) */}
                        <div className="shrink-0 relative z-50">
                            <div className="w-20 h-20 sm:w-24 sm:h-24 bg-white rounded-full shadow-lg border-2 border-white ring-1 ring-slate-100 overflow-hidden flex items-center justify-center">
                                <img src="/logo-livrao.png"
                                    alt="Livrão"
                                    className="w-full h-full object-cover"
                                />
                            </div>
                        </div>

                        {/* 2. RIGHT COLUMN */}
                        <div className="flex-1 min-w-0 flex flex-col justify-between h-auto gap-2">

                            {/* Row A: Actions (Buttons) - Right Aligned */}
                            {(headerAction || headerTitle) && (
                                <div className="flex items-center justify-between w-full gap-2">
                                    {headerTitle && (
                                        <span className="font-[family-name:var(--font-playfair)] font-bold text-green-900 uppercase tracking-widest text-[14px] sm:text-2xl block pl-1 sm:pl-2 mt-4 sm:mt-8 leading-tight flex-shrink">
                                            {headerTitle}
                                        </span>
                                    )}
                                    <div className="flex justify-end gap-1 sm:gap-2 ml-auto flex-shrink-0">
                                        {headerAction}
                                    </div>
                                </div>
                            )}

                            {/* Row B: Progress/Context Info */}
                            {headerBottom && (
                                <div className="w-full">
                                    {headerBottom}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* 3. NAVIGATION BAR (Full Width, Bottom of Header) */}
                    {navBar && (
                        <div className="w-full mt-0 border-t border-slate-100 pt-1">
                            {navBar}
                        </div>
                    )}
                </div>
            </header>

            {/* Main Content Area */}
            <main className={`flex-grow w-full mx-auto p-4 md:p-6 mb-8 pt-6 ${view === 'form' ? 'max-w-7xl' : 'max-w-4xl'}`}>
                {children}
            </main>

            {/* Footer */}
            <footer className="bg-white border-t border-stone-200 py-6 text-center text-xs text-stone-500">
                <div className="max-w-4xl mx-auto px-4">
                    <p className="mb-1 font-bold">Livrão da Família &copy; 2025</p>
                    <p>Comissão de Genealogia e Memória</p>
                </div>
            </footer>
        </div>
    );
};
