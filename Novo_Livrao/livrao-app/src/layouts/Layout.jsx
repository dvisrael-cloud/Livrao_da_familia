import React from 'react';
import brandLogo from '../../public/brand-livrao.png';

export const MainLayout = ({ children, headerAction, headerBottom, navBar, headerTitle, view }) => {
    const isAuthView = view === 'login' || view === 'register';

    return (
        <div className="min-h-screen bg-slate-50 font-sans text-slate-900 selection:bg-amber-100 selection:text-amber-900 flex flex-col overflow-x-hidden w-full max-w-[100vw]">

            {/* Header Structure based on User Mockup */}
            <header className="bg-white/80 text-slate-900 backdrop-blur-lg shadow-sm z-30 sticky top-0 border-b border-amber-400 transition-all duration-300 w-full">
                <div className={`w-full flex flex-col relative ${isAuthView ? 'pt-0.5 pb-0.5' : 'pt-2 pb-0.5'}`}>
                    {/* Top Section: Logo + Right Column (Actions & Info) */}
                    <div className={`px-2 sm:px-4 flex items-center gap-2 sm:gap-4 relative w-full ${isAuthView ? 'flex-col py-2' : 'flex-row py-1'}`}>
                        {/* 1. LOGO */}
                        <div className="shrink-0 relative z-50">
                            <div className="w-16 h-16 sm:w-24 sm:h-24 bg-white rounded-full shadow-lg border-2 border-white overflow-hidden flex items-center justify-center">
                                <img src={brandLogo} alt="Livrão" className="w-full h-full object-cover scale-110" />
                            </div>
                        </div>

                        {/* 2. CENTER COLUMN */}
                        <div className={`flex-grow min-w-0 flex flex-col justify-center ${isAuthView ? 'items-center text-center' : 'items-start text-left'} gap-1 relative overflow-hidden`}>
                            {headerTitle && (
                                <div className="w-full min-w-0 overflow-visible">
                                    {headerTitle}
                                </div>
                            )}
                            {headerBottom && (
                                <div className="w-full min-w-0 mt-0 sm:mt-0.5">
                                    {headerBottom}
                                </div>
                            )}
                        </div>

                        {/* 3. RIGHT COLUMN (Actions) */}
                        {headerAction && (
                            <div className={`shrink-0 flex ${isAuthView ? 'flex-row items-center ml-0 mt-2' : 'flex-col items-end gap-1.5 sm:gap-2 ml-1 sm:ml-4'}`}>
                                {headerAction}
                            </div>
                        )}
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
            <main className={`flex-grow w-full max-w-full mx-auto relative ${view === 'account' ? 'p-0 sm:max-w-4xl' : view === 'form' ? 'p-2 sm:p-4 md:p-6 mb-8 pt-1 sm:max-w-full lg:max-w-7xl' : 'p-4 md:p-6 mb-8 pt-1 sm:max-w-4xl'}`}>
                {children}
            </main>

        </div>
    );
};
