import React from 'react';

export const MainLayout = ({ children, title, subtitle, headerAction, headerBottom, navBar, headerTitle, view }) => {
    const isAuthView = view === 'login' || view === 'register';

    return (
        <div className="min-h-screen bg-slate-50 font-sans text-slate-900 selection:bg-amber-100 selection:text-amber-900 flex flex-col">

            {/* Header Structure based on User Mockup */}
            <header className="bg-white/80 text-slate-900 backdrop-blur-lg shadow-sm z-30 sticky top-0 border-b border-amber-400 transition-all duration-300">

                <div className={`max-w-5xl mx-auto flex flex-col relative ${isAuthView ? 'pt-0.5 pb-0.5' : 'pt-2 pb-0.5'}`}>

                    {/* Top Section: Logo + Right Column (Actions & Info) */}
                    <div className={`px-4 flex gap-3 relative ${isAuthView ? 'flex-col items-center justify-center py-1' : 'items-end mb-1'}`}>


                        {/* 1. LOGO (Top Left) */}
                        <div className="shrink-0 relative z-50">

                            <div className="w-16 h-16 sm:w-24 sm:h-24 bg-white rounded-full shadow-xl border-2 border-white ring-1 ring-slate-100 overflow-hidden flex items-center justify-center">
                                <img src="/logo-livrao.png"
                                    alt="Livrão"
                                    className="w-full h-full object-cover"
                                />
                            </div>
                        </div>

                        {/* 2. RIGHT COLUMN */}
                        <div className={`flex-1 min-w-0 flex flex-col justify-end h-auto gap-1 relative ${isAuthView ? 'items-center text-center' : ''}`}>


                            {/* Row A: Actions (Buttons) - Right Aligned */}
                            {(headerAction || headerTitle) && (
                                <div className={`flex items-center justify-between w-full gap-2 relative ${isAuthView ? 'justify-center' : ''}`}>
                                    {headerTitle && (
                                        <div className="relative">

                                            <span className="font-bold text-green-900 uppercase tracking-widest text-[20px] sm:text-5xl block leading-tight flex-shrink whitespace-nowrap">
                                                {headerTitle}
                                            </span>
                                        </div>
                                    )}
                                    <div className="flex justify-end gap-1 sm:gap-2 ml-auto flex-shrink-0 relative">

                                        {headerAction}
                                    </div>
                                </div>
                            )}

                            {/* Row B: Progress/Context Info */}
                            {headerBottom && (
                                <div className="w-full relative">

                                    {headerBottom}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* 3. NAVIGATION BAR (Full Width, Bottom of Header) */}
                    {navBar && (
                        <div className="w-full mt-0 border-t border-amber-400 relative">

                            {navBar}
                        </div>
                    )}
                </div>
            </header>

            {/* Main Content Area */}
            <main className={`flex-grow w-full mx-auto relative ${view === 'account' ? 'p-0 max-w-4xl' : view === 'form' ? 'p-4 md:p-6 mb-8 pt-1 max-w-7xl' : 'p-4 md:p-6 mb-8 pt-1 max-w-4xl'}`}>

                {children}
            </main>

        </div>
    );
};
