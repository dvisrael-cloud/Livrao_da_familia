/**
 * PROJETO: Livrão da Família
  * DESENVOLVIMENTO: HOD(CNPJ: 11.702.142 /0001 - 70)
    * AUTOR: David Vidal Israel(dvisrael@hotmail.com)
      * PARCERIA: Comissão Livrão da Família(Presidida por Marcia Barcessat Rubistein)
        * ASSISTÊNCIA: IA Google Gemini
          * STATUS: Código em fase de ajuste / migração Firebase
            * © 2025 HOD.Todos os direitos reservados.
 */

import React, { useState, useEffect, useRef } from 'react';
import { User, Users, Briefcase, BookOpen, Camera, Check, LogOut, Trash2, ArrowLeft } from 'lucide-react';
import { MainLayout } from './layouts/Layout';
import { LoginForm } from './features/Auth/LoginForm';
import { RegisterForm } from './features/Auth/RegisterForm';
import { FormEngine } from './features/Form/FormEngine';
import { INITIAL_STATE } from './constants/initial_state';
import { useUploadManager } from './features/Upload/useUploadManager';
import { submitData, fetchFamilyMembers, deleteFamilyMember } from './services/api';
import { formConfig } from './constants/formConfig';
import { Button } from './components/common/UI';
import { PhotoGalleryModal } from './features/Gallery/PhotoGalleryModal';
import { UserHub } from './features/Hub/UserHub';
import { FormNavBar } from './features/Form/FormNavBar';
import { SourceInfoWidget } from './features/Form/SourceInfoWidget';
import { AccountSettings } from './features/Account/AccountSettings';
import { RecipesPage } from './features/Recipes/RecipesPage';
import { WelcomeScreen } from './features/Welcome/WelcomeScreen';

function App() {
  const [userSession, setUserSession] = useState(null);
  const [view, setView] = useState('login'); // 'login', 'register', 'form', 'hub', 'recipes', 'account', 'success', 'goodbye'
  const [formData, setFormData] = useState(INITIAL_STATE);

  // STATE FOR NAVIGATION CONTROL
  const [formStep, setFormStep] = useState(0);
  const [initialStep, setInitialStep] = useState(0); // Mantido para compatibilidade de reset

  const [formKey, setFormKey] = useState(0); // Force-reset FormEngine
  const [familyMembers, setFamilyMembers] = useState({}); // Stores data for each role
  const [progressInfo, setProgressInfo] = useState(null); // Lifted state for header progress
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [galleryTarget, setGalleryTarget] = useState(null); // { id, name }
  const [isMemberSelectorOpen, setIsMemberSelectorOpen] = useState(false);

  const { processUploads, uploading, statusMessage } = useUploadManager();

  // AUTH SUCCESS
  const handleAuthSuccess = async (result, destination = null) => {
    console.log("Login Success:", result, destination);
    setUserSession({
      uid: result.uid,
      email: result.email,
      repName: result.repName || '',
      repPhone: result.repPhone || ''
    });

    setFormData(prev => ({
      ...prev,
      repName: result.repName || '',
      repEmail: result.email,
      representativeEmail: result.email,
      repPhone: result.repPhone || ''
    }));

    // ONBOARDING CHECK
    if (destination === 'account' || !result.repPhone) {
      setView('account');
    } else {
      setView('welcome');
    }

    const startStep = 2; // Agora sempre começa no passo 2 (Formulário real), pois RepData está na Conta
    setInitialStep(startStep);
    setFormStep(startStep);

    try {
      const members = await fetchFamilyMembers(result.uid);
      console.log("Members loaded:", members);
      setFamilyMembers(members);
    } catch (err) {
      console.error("Failed to load members:", err);
    }
  };

  // PROGRESS CALC (Weighted - Custom Table)
  const calculateProgress = (data) => {
    if (!data) return 0;

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
      const val = data[fieldId];
      if (val && (Array.isArray(val) ? val.length > 0 : String(val).trim() !== '')) {
        if (fieldId === 'situacaoVital' && val === 'Vivo') return;
        totalScore += weights[fieldId];
      }
    });

    return Math.min(100, Math.round(totalScore));
  };

  // HANDLERS
  const handleCancelEdit = () => {
    if (window.confirm("Deseja sair sem salvar? Suas alterações neste parente serão perdidas.")) {
      setFormKey(prev => prev + 1); // Hard Reset
      setInitialStep(2);
      setFormStep(2);
    }
  };

  const handleDeleteMember = async () => {
    const role = formData.relationshipInfo?.papel;
    if (!role) return;
    if (window.confirm(`ATENÇÃO: Tem certeza que deseja apagar todos os dados de "${role}"?\nEsta ação não pode ser desfeita.`)) {
      const result = await deleteFamilyMember(userSession.uid, role);
      if (result.status === 'success') {
        setFamilyMembers(prev => {
          const newState = { ...prev };
          delete newState[role];
          return newState;
        });
        setFormKey(prev => prev + 1);
        setInitialStep(2);
        setFormStep(2);
      } else {
        alert("Erro ao apagar: " + result.message);
      }
    }
  };

  const handleDeleteFromTree = async (role) => {
    if (!role) return;
    if (window.confirm(`ATENÇÃO: Tem certeza que deseja apagar todos os dados de "${role}"?\nEsta ação não pode ser desfeita.`)) {
      const result = await deleteFamilyMember(userSession.uid, role);
      if (result.status === 'success') {
        setFamilyMembers(prev => {
          const newState = { ...prev };
          delete newState[role];
          return newState;
        });
        alert(`Dados de "${role}" removidos com sucesso!`);
      } else {
        alert("Erro ao apagar: " + result.message);
      }
    }
  };

  const handleSave = async () => {
    if (!userSession) return;
    if (formData.repPhone) {
      setUserSession(prev => ({ ...prev, repPhone: formData.repPhone }));
    }

    const uploadResult = await processUploads(userSession.uid, formData);
    if (uploadResult.success || confirm("Alguns arquivos falharam. Deseja salvar assim mesmo?")) {
      const finalData = { ...uploadResult.data, lastUpdated: new Date().toISOString() };
      const res = await submitData(userSession.uid, finalData);

      if (res.status === 'success') {
        const role = formData.relationshipInfo?.papel;

        if (role) {
          setFamilyMembers(prev => ({
            ...prev,
            [role]: {
              ...formData,
              name: formData.nomeCompleto || role,
              progress: calculateProgress(formData)
            }
          }));
        }

        const currentStep = progressInfo?.currentStep || 0;

        // If step >= 3, we are editing a specific family member (past the welcome/tree selection screens)
        if (role && currentStep >= 3) {
          alert(`Dados de "${role}" salvos e atualizados na árvore!`);
          setFormKey(prev => prev + 1);
          setInitialStep(2);
          setFormStep(2);
        } else {
          setView('success');
          window.scrollTo(0, 0);
        }
      } else {
        alert("Erro ao salvar dados: " + res.message);
      }
    }
  };

  const handleAddNewMember = () => {
    setFormData({
      ...INITIAL_STATE,
      repName: userSession.repName,
      repEmail: userSession.email,
      repPhone: userSession.repPhone || formData.repPhone
    });
    setInitialStep(2);
    setFormStep(2);
    setView('form');
  };

  const handleLogout = () => {
    if (confirm("Tem certeza que deseja sair agora?")) {
      setUserSession(null);
      setView('login');
    }
  };

  const calculateTotalFamilyProgress = () => {
    const roles = [
      'Eu mesmo', 'Pai', 'Mãe',
      'Avô Paterno', 'Avó Paterna', 'Avô Materno', 'Avó Materna',
      'Pai do Avô Paterno', 'Mãe do Avô Paterno', 'Pai da Avó Paterna', 'Mãe da Avó Paterna',
      'Pai do Avô Materno', 'Mãe do Avô Materno', 'Pai da Avó Materna', 'Mãe da Avó Materna'
    ];

    let totalSum = 0;
    roles.forEach(role => {
      const member = familyMembers[role];
      if (member) {
        const p = member.progress || calculateProgress(member);
        totalSum += p;
      }
    });

    return Math.round(totalSum / 15);
  };

  // HEADER PROGRESS COMPONENT
  // Edit mode starts at step 3 now (index >= 3)
  const isEditingMember = progressInfo && progressInfo.currentStep >= 3;
  const globalProgress = calculateTotalFamilyProgress();
  const currentPercentage = isEditingMember ? (progressInfo?.progressPercentage || 0) : globalProgress;

  // SOURCE INFO DISPLAY LOGIC
  let sourceDisplay = null;
  if (isEditingMember && formData.fonteInformacao) {
    const sources = Array.isArray(formData.fonteInformacao)
      ? formData.fonteInformacao
      : [formData.fonteInformacao];

    const readableSources = sources.map(s => {
      if (s.includes('Memória')) return "sua própria memória";
      if (s.includes('Documentos')) return "documentos";
      if (s.includes('Depoimento')) return `depoimento de ${formData.nomeDepoente || 'familiar'}`;
      if (s.includes('Familiar')) return "entrevista com familiar";
      return s;
    });

    let joinedText = "";
    if (readableSources.length === 1) {
      joinedText = readableSources[0];
    } else {
      const last = readableSources.pop();
      joinedText = readableSources.join(', ') + ' e ' + last;
    }

    const text = `Segundo ${joinedText}`;

    sourceDisplay = (
      <div className="text-[10px] text-slate-500 mt-0.5 flex items-center gap-1 animate-fade-in">
        <span className="italic truncate max-w-[95%]">{text}</span>
        {!formData._editingSource && (
          <button
            onClick={() => setFormData(p => ({ ...p, _editingSource: true }))}
            className="text-slate-400 hover:text-slate-700 px-1 tracking-widest text-xs font-bold"
            title="Editar Fonte"
          >
            ...
          </button>
        )}
      </div>
    );
  }

  const progressComponent = view === 'form' ? (
    <div className="w-full max-w-2xl mx-auto pb-1 mt-1">
      <div className="flex justify-between text-[10px] text-slate-900 font-bold uppercase tracking-wider mb-1">
        <span>
          {isEditingMember
            ? (() => {
              const rawName = progressInfo?.sectionName || '';
              const sectionLabels = {
                'FamilyVital': 'FAMÍLIA E VIDA',
                'LifeCulture': 'TRAJETÓRIA',
                'Narrative': 'MEMÓRIAS VIVAS',
                'Identity': 'IDENTIDADE',
                'Biografia': 'IDENTIDADE',
                'História': 'MEMÓRIAS VIVAS'
              };
              return sectionLabels[rawName] || rawName.toUpperCase();
            })()
            : 'PROGRESSO TOTAL DA FAMÍLIA'
          }
        </span>
        <span>{currentPercentage}%</span>
      </div>
      <div className="h-1.5 bg-black/20 rounded-full overflow-hidden mb-1 border border-white/10">
        <div
          className="h-full shadow-[0_0_15px_rgba(37,99,235,0.8)] transition-all duration-500 ease-out bg-blue-600 shadow-blue-500/50"
          style={{ width: `${currentPercentage}%` }}
        />
      </div>
      {isEditingMember && progressInfo?.roleLabel && (
        <div className="text-[11px] text-slate-800 font-medium truncate animate-fade-in mt-1">
          <span className="opacity-70 mr-1 text-slate-500">EDITANDO:</span>
          <span className="font-bold text-slate-900">
            {formData.nomeCompleto ? `${formData.nomeCompleto}, ` : ''}
          </span>
          <span className="text-slate-700 font-normal opacity-90">
            {(() => {
              const label = progressInfo.roleLabel;
              // For "Outro N" slots, show the stored kinship degree instead of the raw key
              if (/^Outro \d+$/.test(label)) {
                return familyMembers[label]?.parentesco
                  || formData.relationshipInfo?.parentesco
                  || 'Outro Parente';
              }
              return label;
            })()}
            {!['Eu mesmo', 'Eu mesma'].includes(progressInfo.roleLabel) && userSession?.repName ? ` de ${userSession.repName}` : ''}
          </span>
        </div>
      )}
      {sourceDisplay}
    </div>
  ) : null;




  return (
    <MainLayout
      view={view}
      title={view !== 'form' && view !== 'recipes' ? (userSession ? `Olá, ${userSession.repName} ` : "Bem-vindo") : ''}
      subtitle={view !== 'form' && view !== 'recipes' ? (userSession && view !== 'hub' ? "Continue preenchendo o legado da sua família." : "Preservando memórias.") : ''}
      headerTitle={
        view === 'account' ? (
          <span className="flex flex-col justify-center">
            <span className="text-[11px] sm:text-[13px] tracking-[0.2em] opacity-80">LIVRÃO DA FAMÍLIA</span>
            <span className="text-2xl sm:text-3xl font-serif font-black leading-none text-slate-700 normal-case tracking-normal my-0.5 sm:my-1">
              Minha Conta
            </span>
          </span>
        ) : view === 'hub' ? (
          <span className="flex flex-col justify-center">
            <span className="text-[10px] sm:text-[12px] tracking-[0.2em] opacity-80">LIVRÃO DA FAMÍLIA</span>
            <span className="text-3xl sm:text-4xl font-serif font-extrabold leading-none bg-gradient-to-r from-history-green to-emerald-600 bg-clip-text text-transparent normal-case tracking-normal my-0.5 sm:my-1">
              {(() => {
                const fullName = userSession?.repName;
                if (!fullName) return 'Família';
                const parts = fullName.trim().split(' ');
                if (parts.length <= 2) return fullName;
                return `${parts[0]} ${parts[parts.length - 1]}`;
              })()}
            </span>
            <span className="text-[9px] sm:text-[11px] font-sans tracking-[0.3em] text-slate-500 uppercase font-bold mt-0.5">Console</span>
          </span>
        ) : view === 'recipes' ? (
          <span className="flex flex-col justify-center">
            <span className="text-[11px] sm:text-[13px] tracking-[0.2em] opacity-80">LIVRÃO DA FAMÍLIA</span>
            <span className="text-2xl sm:text-3xl font-serif font-black leading-none text-rose-700 normal-case tracking-normal my-0.5 sm:my-1">
              Receitas
            </span>
          </span>
        ) : "LIVRÃO DA FAMÍLIA"
      }
      headerBottom={
        <div>
          {progressComponent}
        </div>
      }
      navBar={
        (view === 'form' && isEditingMember) ? (
          <FormNavBar
            activeSection={progressInfo?.sectionName}
            onNavigate={(targetId) => {
              const uniqueSections = [...new Set(formConfig.map(i => i.wizardSection))];
              const targetIndex = uniqueSections.indexOf(targetId);
              if (targetIndex !== -1) setFormStep(targetIndex);
            }}
            isGalleryOpen={isGalleryOpen}
            onGalleryOpen={() => {
              if (formData.relationshipInfo?.papel) {
                setGalleryTarget({
                  id: formData.relationshipInfo.papel,
                  name: formData.nomeCompleto || formData.relationshipInfo.papel
                });
                setIsGalleryOpen(true);
              } else {
                alert("Para acessar o álbum, selecione um familiar na Árvore (Início) primeiro.");
              }
            }}
          />
        ) : null
      }
      headerAction={
        userSession ? (
          <div className="flex items-center gap-2">

            {/* VIEW SPECIFIC ACTIONS */}

            {/* 1. Account View -> Show Back Button */}
            {/* 1. Account View OR Family Tree (Step 2) -> Show Back Button */}
            {(view === 'account' || (view === 'form' && formStep === 2)) && (
              <button
                onClick={() => setView('hub')}
                className="text-sm font-semibold text-slate-700 bg-white border-2 border-slate-300 px-4 py-2 rounded-xl hover:bg-slate-50 hover:border-slate-400 transition-all duration-300 shadow-md hover:shadow-lg hover:-translate-y-0.5 flex items-center gap-2 active:scale-95"
              >
                <ArrowLeft size={16} /> Voltar
              </button>
            )}

            {/* 2. Form View -> Form Actions (Save/Delete) */}
            {view === 'form' && formStep !== 2 ? (
              progressInfo && progressInfo.currentStep >= 3 ? (
                <div className="flex items-center gap-1.5 sm:gap-2.5">
                  <button
                    onClick={handleCancelEdit}
                    title="Sair sem Salvar"
                    className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white rounded-xl shadow-lg shadow-amber-900/30 hover:shadow-xl hover:shadow-amber-900/40 transition-all duration-300 border-2 border-white/20 active:scale-95"
                  >
                    <LogOut size={16} className="sm:w-[19px] sm:h-[19px]" />
                  </button>
                  <button
                    onClick={handleDeleteMember}
                    title="Apagar Parente"
                    className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 text-white rounded-xl shadow-lg shadow-red-900/30 hover:shadow-xl hover:shadow-red-900/40 transition-all duration-300 border-2 border-white/20 active:scale-95"
                  >
                    <Trash2 size={16} className="sm:w-[19px] sm:h-[19px]" />
                  </button>
                  <button
                    onClick={handleSave}
                    title="Salvar"
                    className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-500 hover:to-indigo-600 text-white rounded-xl shadow-lg shadow-blue-900/30 hover:shadow-xl hover:shadow-blue-900/40 transition-all duration-300 border-2 border-white/20 active:scale-95"
                  >
                    <Check size={16} className="sm:w-[19px] sm:h-[19px]" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleSave}
                  className="bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-500 hover:to-indigo-600 text-white font-semibold text-xs py-2.5 px-5 rounded-xl shadow-lg shadow-blue-900/30 hover:shadow-xl hover:shadow-blue-900/40 transition-all duration-300 uppercase tracking-wide border-2 border-white/20 flex items-center gap-2 ml-2 active:scale-95"
                >
                  <Check size={16} /> Finalizar
                </button>
              )
            ) : null}
          </div>
        ) : null
      }
    >
      {!userSession && (
        <div className="flex justify-center items-center min-h-[400px]">
          {view === 'login' && <LoginForm onLoginSuccess={handleAuthSuccess} onSwitchRegister={() => setView('register')} />}
          {view === 'register' && <RegisterForm onRegisterSuccess={handleAuthSuccess} onSwitchLogin={() => setView('login')} />}
        </div>
      )}
      {userSession && view === 'welcome' && (
        <WelcomeScreen repName={userSession.repName} onComplete={() => setView('hub')} />
      )}

      {userSession && view === 'hub' && (
        <UserHub
          repName={userSession.repName}
          familyMembers={familyMembers}
          onNavigate={(dest) => {
            if (dest === 'form') {
              setView('form');
              setFormKey(k => k + 1);
            } else if (dest === 'gallery') {
              setIsMemberSelectorOpen(true);
            } else if (dest === 'recipes') {
              setView('recipes');
            } else if (dest === 'account') {
              setView('account');
            }
          }}
          onLogout={handleLogout}
        />
      )}

      {userSession && view === 'account' && (
        <AccountSettings
          user={userSession}
          onComplete={() => {
            // Ao salvar, atualiza sessão e vai para Hub
            // Recarregar dados da sessão seria ideal, mas vamos confiar no update local por enquanto ou fazer um fetch rápido
            setView('hub');
          }}
        />
      )}

      {userSession && view === 'recipes' && (
        <RecipesPage
          onBack={() => setView('hub')}
          uid={userSession.uid}
        />
      )}

      {/* GLOBAL SOURCE INFO OVERLAY */}
      {view === 'form' && formData._editingSource && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-lg">
            <SourceInfoWidget
              data={formData}
              updateData={(key, val) => setFormData(prev => ({ ...prev, [key]: val }))}
            />
          </div>
        </div>
      )}

      {userSession && view === 'form' && (
        <>
          {uploading && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center text-white">
              <div className="bg-white text-stone-800 p-6 rounded-xl shadow-xl text-center">
                <div className="animate-spin h-8 w-8 border-4 border-history-green border-t-transparent rounded-full mx-auto mb-4"></div>
                <p className="font-bold">{statusMessage}</p>
              </div>
            </div>
          )}
          <FormEngine
            key={formKey}
            formData={formData}
            setFormData={setFormData}
            onSave={handleSave}
            initialStepIndex={initialStep} // Ainda passamos isso para initialize, mas controlamos via currentStepIndex
            currentStepIndex={formStep}
            onStepChange={setFormStep}
            familyMembers={familyMembers}
            onProgressUpdate={setProgressInfo}
            onDeleteMember={handleDeleteFromTree}
            onOpenGallery={(member) => {
              setGalleryTarget(member);
              setIsGalleryOpen(true);
            }}
            onExit={() => {
              if (window.confirm("Voltar para o console inicial?")) {
                setView('hub');
                window.scrollTo(0, 0);
              }
            }}
          />
          {!uploading && (
            <div className="text-center mt-2 text-xs text-stone-300">v1.5 Beta</div>
          )}
        </>
      )}

      {userSession && view === 'success' && (
        <div className="flex flex-col items-center justify-center p-8 bg-white rounded-xl shadow-sm border border-stone-200 text-center animate-fade-in-up">
          <div className="w-16 h-16 bg-history-green/10 text-history-green rounded-full flex items-center justify-center mb-6">
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
          </div>
          <h2 className="text-3xl font-serif text-history-green font-bold mb-4">Cadastro Salvo com Sucesso!</h2>
          <p className="text-stone-600 mb-8 max-w-md mx-auto leading-relaxed">
            Agradecemos imensamente sua contribuição.
          </p>
          <div className="flex flex-col gap-4 w-full max-w-sm">
            <button onClick={handleAddNewMember} className="w-full py-3 px-6 bg-history-green text-white font-bold rounded-lg shadow-md hover:bg-history-green/90 transition-colors flex items-center justify-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="16"></line><line x1="8" y1="12" x2="16" y2="12"></line></svg>
              Incluir ou Editar Membro Familiar
            </button>
            <button onClick={() => setView('hub')} className="w-full py-3 px-6 bg-stone-100 text-stone-600 font-bold rounded-lg hover:bg-stone-200 transition-colors flex items-center justify-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
              Voltar ao Console
            </button>
          </div>
        </div>
      )}

      {userSession && view === 'goodbye' && (
        <div className="flex flex-col items-center justify-center p-8 bg-white rounded-xl shadow-sm border border-stone-200 text-center animate-fade-in mt-12 max-w-md mx-auto">
          <div className="text-6xl mb-6">👋</div>
          <h2 className="text-3xl font-serif text-history-green font-bold mb-4">Até logo, {userSession.repName}!</h2>
          <p className="text-stone-600 mb-8 leading-relaxed">
            Seus dados foram salvos com segurança.<br />Obrigado por contribuir com a memória da nossa família.
          </p>
          <Button onClick={() => { setUserSession(null); setView('login'); window.scrollTo(0, 0); }} variant="outline">
            Voltar ao Início
          </Button>
        </div>
      )}

      {/* MEMBER SELECTOR MODAL (Para acessar galeria do Hub) */}
      {isMemberSelectorOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 text-center">
            <h3 className="text-xl font-serif font-bold text-stone-800 mb-4">Selecione o Familiar</h3>
            <p className="text-stone-500 mb-6 text-sm">De quem você deseja ver ou adicionar fotos?</p>

            <div className="grid grid-cols-1 gap-3 max-h-[60vh] overflow-y-auto">
              {Object.entries(familyMembers).map(([role, data]) => (
                <button
                  key={role}
                  onClick={() => {
                    setGalleryTarget({ id: role, name: data.nomeCompleto || role });
                    setIsMemberSelectorOpen(false);
                    setIsGalleryOpen(true);
                  }}
                  className="p-4 rounded-lg border border-stone-200 hover:border-history-gold hover:bg-history-gold/5 transition-all text-left flex items-center justify-between group"
                >
                  <span className="font-bold text-stone-700 group-hover:text-history-gold">{data.nomeCompleto || role}</span>
                  <span className="text-xs text-stone-400 uppercase tracking-wider">{role}</span>
                </button>
              ))}
              {Object.keys(familyMembers).length === 0 && (
                <p className="text-stone-400 italic py-4">Nenhum membro cadastrado ainda. Preencha o formulário primeiro.</p>
              )}
            </div>

            <button
              onClick={() => setIsMemberSelectorOpen(false)}
              className="mt-6 text-stone-400 hover:text-stone-600 underline text-sm"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* GLOBAL MODALS */}
      <PhotoGalleryModal
        isOpen={isGalleryOpen}
        onClose={() => setIsGalleryOpen(false)}
        targetMember={galleryTarget}
        uid={userSession?.uid}
      />

    </MainLayout>
  );
}

export default App;
