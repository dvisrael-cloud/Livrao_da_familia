/**
 * PROJETO: Livrão da Família
  * DESENVOLVIMENTO: HOD(CNPJ: 11.702.142 /0001 - 70)
    * AUTOR: David Vidal Israel(dvisrael@hotmail.com)
      * PARCERIA: Comissão Livrão da Família(Presidida por Marcia Barcessat Rubistein)
        * ASSISTÊNCIA: IA Google Gemini
          * STATUS: Código em fase de ajuste / migração Firebase
            * © 2025 HOD.Todos os direitos reservados.
 */

import React, { useState, useEffect } from 'react';
import { User, Users, Briefcase, BookOpen, Camera, Check, LogOut, Trash2, ArrowLeft, Search, Archive } from 'lucide-react';
import { MainLayout } from './layouts/Layout';
import { LoginForm } from './features/Auth/LoginForm';
import { RegisterForm } from './features/Auth/RegisterForm';
import { FormEngine } from './features/Form/FormEngine';
import { INITIAL_STATE } from './constants/initial_state';
import { useUploadManager } from './features/Upload/useUploadManager';
import ProgressIndicator from './components/ProgressIndicator';
import { submitData, fetchFamilyMembers, deleteFamilyMember, archiveFamilyMember, flagDuplicateAccepted, getAccountData, checkInviteStatus } from './services/api';
import { saveFamilyBatch, mergeDuplicateMembers, getDisplayRole } from './services/familyService';
import { OnTheFlyModal, findNewMembers } from './components/OnTheFlyModal';
import { formConfig } from './constants/formConfig';
import { Button } from './components/common/UI';
import { PhotoGalleryModal } from './features/Gallery/PhotoGalleryModal';
import { UserHub } from './features/Hub/UserHub';
import { FormNavBar } from './features/Form/FormNavBar';
import { SourceInfoWidget } from './features/Form/SourceInfoWidget';
import { AccountSettings } from './features/Account/AccountSettings';
import { RecipesPage } from './features/Recipes/RecipesPage';
import { WelcomeScreen } from './features/Welcome/WelcomeScreen';
import { GlobalMemberSearchDrawer } from './components/GlobalMemberSearchDrawer';
import PWAInstallPrompt from './components/PWAInstallPrompt';
import { db } from './services/firebase';
import { doc, setDoc, deleteDoc, getDocs, query, orderBy, collection, limit, where, updateDoc, serverTimestamp } from 'firebase/firestore';
import { logEvent } from './services/logService';

// PROGRESS CALC (Weighted - Shared Utility)
const calculateProgress = (data) => {
  if (!data) return 0;
  const weights = {
    'nomeCompleto': 10, 'dataNascimento': 10, 'fotoIdentificacao': 10,
    'localNascimento_cidade': 5, 'localNascimento_estado': 2.5, 'localNascimento_pais': 2.5,
    'nomePai': 5, 'nomeMae': 5, 'biography': 5, 'resumoHistorico': 5,
    'situacaoConjugal': 2.5, 'formacaoAcademica': 2.5, 'grauInstrucao': 2.5,
    'escolasUniversidades': 2.5, 'hobbies': 2.5, 'religiao': 1.5,
    'situacaoVital': 1.5, 'ocupacaoPrincipal': 1.5, 'locaisTrabalho': 1.5,
    'locaisConheceu': 1.5, 'amizadesMarcantes': 1.5, 'sinagogaFrequentava': 1.5
  };
  let totalScore = 0;
  Object.keys(weights).forEach(fieldId => {
    let val = data[fieldId];
    if (fieldId === 'nomeCompleto' && (!val || val.trim() === '')) val = data.fullName;
    if (val && (Array.isArray(val) ? val.length > 0 : String(val).trim() !== '')) {
      if (fieldId === 'situacaoVital' && val === 'Vivo') return;
      totalScore += weights[fieldId];
    }
  });
  return Math.min(100, Math.round(totalScore));
};

const calculateTotalFamilyProgress = (familyMembers) => {
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

function App() {
  const [userSession, setUserSession] = useState(null);
  const [view, setView] = useState('login');
  const [formData, setFormData] = useState(INITIAL_STATE);
  const [formStep, setFormStep] = useState(0);
  const [initialStep, setInitialStep] = useState(0);
  const [formKey, setFormKey] = useState(0);
  const [familyMembers, setFamilyMembers] = useState({});
  const [progressInfo, setProgressInfo] = useState(null);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [galleryTarget, setGalleryTarget] = useState(null);
  const [isMemberSelectorOpen, setIsMemberSelectorOpen] = useState(false);
  const [isGlobalSearchOpen, setIsGlobalSearchOpen] = useState(false);
  const [hasMigrated, setHasMigrated] = useState(false); // Flag de migração

  // ── ON-THE-FLY EXPANSION STATE ──────────────────────────────────────────────
  const [isFlyModalOpen,   setIsFlyModalOpen]   = useState(false);
  const [flyDetectedMembers, setFlyDetectedMembers] = useState([]);  // [{ nome, papel, parentesco, label, dataNascimento }]
  const [flyPendingSave,   setFlyPendingSave]   = useState(null);    // finalData aguardando confirmação do modal
  const [flyIsSaving,      setFlyIsSaving]      = useState(false);
  // ─────────────────────────────────────────────────────────────────────────────

  // --- TOKEN INTERCEPTION STATE ---
  // tokenCheck: null = sem token na URL | 'checking' | 'pending' | 'used' | 'expired' | 'invalid' | 'error'
  const [tokenCheck, setTokenCheck] = useState(null);
  const [tokenData, setTokenData] = useState(null); // { email, repName, message }
  // ---------------------------------

  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const { processUploads, uploading, statusMessage, progress } = useUploadManager();

  // --- PWA INSTALL PROMPT LOGIC ---
  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      console.log('PWA: beforeinstallprompt intercepted');
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  // Derived variables (calculated on each render)
  const isEditingMember = progressInfo && progressInfo.currentStep >= 3;
  const globalProgress = calculateTotalFamilyProgress(familyMembers);
  const currentPercentage = isEditingMember ? (progressInfo?.progressPercentage || 0) : globalProgress;

  // --- TOKEN INTERCEPTION ON MOUNT ---
  // Intercepta ?token=XYZ antes de qualquer renderização de UI de Auth.
  // Roda UMA VEZ no mount. Não usa useEffect de URL para evitar loop.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    if (!token) return; // Sem token: fluxo normal (login)

    setTokenCheck('checking');
    checkInviteStatus(token)
      .then(result => {
        setTokenData(result);
        setTokenCheck(result.tokenStatus);

        if (result.tokenStatus === 'pending') {
          // Token novo e válido: vai para cadastro (RegisterForm já lê o token da URL)
          setView('register');
        } else if (result.tokenStatus === 'used') {
          // Já cadastrado: vai para login, pré-preenchendo o e-mail
          setView('login');
        } else {
          // 'expired' | 'invalid' | 'error' → fica na view 'login' mas mostramos a tela de bloqueio
          logEvent('ERROR', 'app-auth-invite', `Falha ao validar convite: ${result.message || result.tokenStatus}`, result.email || null, { token });
        }
      })
      .catch((err) => {
        setTokenCheck('error');
        setTokenData({ message: 'Erro inesperado ao verificar o convite. Tente recarregar a página.' });
        logEvent('ERROR', 'app-auth-invite', `Falha ao validar convite: Erro Inesperado`, null, { token, error: err?.message });
      });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  // -----------------------------------------

  // --- MIGRATION SAFE LOGIC ---
  useEffect(() => {
    if (userSession?.uid && familyMembers && Object.keys(familyMembers).length > 0 && !hasMigrated) {
      const migrateLegacy = async () => {
        let migrationHappened = false;
        const membersToMigrate = { ...familyMembers };
        
        Object.entries(membersToMigrate).forEach(([role, member]) => {
          if (member && !member.dataCriacaoFormulario) {
            membersToMigrate[role] = {
              ...member,
              dataCriacaoFormulario: '2026-03-19',
              migrationNote: "Data estabelecida pela Data Padrão desta atualização",
              _isLegacyMigration: true
            };
            migrationHappened = true;
          }
        });

        if (migrationHappened) {
          console.log("🛠️ Migrando registros legados no frontend...");
          setFamilyMembers(membersToMigrate);
        }
        setHasMigrated(true);
      };
      migrateLegacy();
    }
  }, [userSession, familyMembers, hasMigrated]);

  // --- VERIFICAÇÃO DE ACESSO ---
  React.useEffect(() => {
    if (userSession?.uid) {
      const testaPermissao = async () => {
        try {
          const localSnap = await getDocs(query(collection(db, `familias/${userSession.uid}/membros`), limit(1)));
          console.log(`✅ Acesso OK. Sua árvore possui ${localSnap.size} registros.`);
        } catch (err) {
          console.error("❌ ERRO DE PERMISSÃO:", err.message);
        }
      };
      testaPermissao();
    }
  }, [userSession?.uid]);
  // -----------------------------

  // AUTH SUCCESS
  const handleAuthSuccess = async (result, destination = null) => {
    console.log("Login Success:", result, destination);
    
    // RESET DE CONTEXTO: Limpa dados de sessões anteriores
    setFamilyMembers({});
    setFormData(INITIAL_STATE);
    
    setUserSession({
      uid: result.uid,
      email: result.email,
      repName: result.repName || '',
      repPhone: result.repPhone || ''
    });

    setFormData(prev => ({
      ...prev,
      userId: result.uid,
      repName: result.repName || '',
      repEmail: result.email,
      representativeEmail: result.email,
      repPhone: result.repPhone || ''
    }));
    
    // SYNC INVITATION STATUS IF PENDING
    try {
      const inviteQuery = query(
        collection(db, "invites"),
        where("email", "==", result.email.toLowerCase().trim()),
        where("status", "==", "pending")
      );
      const inviteSnap = await getDocs(inviteQuery);
      if (!inviteSnap.empty) {
        console.log("Found pending invitation. Syncing...");
        for (const docSnap of inviteSnap.docs) {
          await updateDoc(doc(db, "invites", docSnap.id), {
            status: 'used',
            usedBy: result.uid,
            usedAt: serverTimestamp()
          });
        }
      }
    } catch (inviteErr) {
      console.warn("Failed to sync invitation status:", inviteErr);
    }

    // ONBOARDING CHECK
    if (destination === 'account') {
      setView('account');
    } else {
      setView('welcome');
    }

    const startStep = 2; // Agora sempre começa no passo 2 (Formulário real), pois RepData está na Conta
    setInitialStep(startStep);
    setFormStep(startStep);

    try {
      const membersResponse = await fetchFamilyMembers(result.uid);
      console.log("Members loaded:", membersResponse);
      if (membersResponse && membersResponse.status === 'success' && membersResponse.data) {
        setFamilyMembers(membersResponse.data);

        // Sincroniza dados detalhados do representante se existirem
        const repData = membersResponse.data['Eu mesmo'];
        if (repData) {
          setFormData(prev => ({
            ...prev,
            ...repData,
            // Mantém info de sessão prioritária
            repName: result.repName || repData.nomeCompleto || repData.fullName || prev.repName,
            repPhone: result.repPhone || repData.repPhone || repData.phone || prev.repPhone
          }));
        }
      } else {
        setFamilyMembers({});
      }
    } catch (err) {
      console.error("Failed to load members:", err);
      setFamilyMembers({});
    }
  };


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

  const handleAcceptDuplicate = async (role, memberData) => {
    if (!role || !memberData || !userSession?.uid) return { status: 'error', message: 'Parâmetros inválidos.' };
    try {
      const res = await flagDuplicateAccepted(userSession.uid, role, memberData);
      if (res.status === 'success') {
        setFamilyMembers(prev => ({
          ...prev,
          [role]: { ...prev[role], duplicateAccepted: true }
        }));
      }
      return res;
    } catch (err) {
      console.error('Accept Duplicate Error:', err);
      return { status: 'error', message: err?.message || 'Erro ao aceitar duplicata.' };
    }
  };

  const handleMergeDuplicates = async (canonicalKey, duplicateKeys) => {
    if (!userSession?.uid) return { status: 'error', message: 'Sessão inválida.' };
    try {
      // DB1: passa o mapa em memória para evitar getDocs desnecessário ao Firestore
      const res = await mergeDuplicateMembers(userSession.uid, canonicalKey, duplicateKeys, familyMembers);
      if (res.status === 'success') {
        // Remove os duplicados do estado local imediatamente
        setFamilyMembers(prev => {
          const next = { ...prev };
          duplicateKeys.forEach(k => delete next[k]);
          if (next[canonicalKey]) next[canonicalKey].duplicateAccepted = true;
          return next;
        });
        // Recarrega do servidor para refletir o merge completo
        try {
          const result = await fetchFamilyMembers(userSession.uid);
          const refreshed = result?.data || result;
          if (refreshed && typeof refreshed === 'object' && Object.keys(refreshed).length > 0) {
            setFamilyMembers(refreshed);
          }
        } catch (_) { /* fallback: estado local já atualizado */ }
      }
      return res;
    } catch (err) {
      console.error('Merge Duplicate Error:', err);
      return { status: 'error', message: err?.message || 'Erro ao mesclar duplicatas.' };
    }
  };

  const handleArchiveMember = async (role, memberData) => {
    if (!role || !memberData || !userSession?.uid) return { status: 'error', message: 'Parâmetros inválidos.' };
    try {
      const res = await archiveFamilyMember(userSession.uid, role, memberData);
      if (res.status === 'success') {
        setFamilyMembers(prev => {
          const newState = { ...prev };
          delete newState[role];
          return newState;
        });
      }
      return res;
    } catch (err) {
      console.error('Archive Member Error:', err);
      return { status: 'error', message: err?.message || 'Erro ao arquivar membro.' };
    }
  };

  const handleArchiveAllMembersBatch = async (membersToArchive) => {
    if (!userSession) return { status: 'error', message: 'Sem sessão ativa' };
    let results = [];
    for (const [role, member] of Object.entries(membersToArchive)) {
      if (!member) continue;
      const res = await handleArchiveMember(role, member);
      results.push(res);
      if (res.status !== 'success') {
        // Stop on first failure or continue based on desired behavior
        return res;
      }
    }
    return { status: 'success' };
  };

  const handleArchiveAllOthers = async (rolesList) => {
    if (!userSession || !rolesList || rolesList.length === 0) return;

    if (confirm(`Tem certeza que deseja mover todos os ${rolesList.length} cadastros "Outro" para o Arquivo Morto?`)) {
      let successCount = 0;
      console.log('[App Debug] Archiving multiple roles:', rolesList);
      for (const role of rolesList) {
        const memberData = familyMembers[role];
        if (memberData) {
          const res = await handleArchiveMember(role, memberData);
          if (res.status === 'success') {
            successCount++;
          }
        }
      }
      alert(`${successCount} de ${rolesList.length} membros foram arquivados com sucesso!`);
    }
  };

  const handleSave = async () => {
    if (!userSession) return;

    // Bloqueio de Criação: Nome e Data de Nascimento obrigatórios
    if (!formData.nomeCompleto?.trim() || !formData.dataNascimento?.trim()) {
      alert("⚠️ Nome Completo e Data de Nascimento são campos obrigatórios para salvar o perfil.");
      return;
    }

    // ── ON-THE-FLY EXPANSION: Interceptação ─────────────────────────────────
    // Varre os campos de nome para detectar parentes ainda não cadastrados.
    // Se houver algum, suspende o flow normal e abre o Modal de captura.
    const newRelatives = findNewMembers(formData, familyMembers);
    if (newRelatives.length > 0) {
      // Pré-processa os dados do formulário para ter o finalData pronto quando o modal confirmar
      setFlyDetectedMembers(newRelatives);
      setFlyPendingSave({ formData: { ...formData } }); // snapshot do estado atual
      setIsFlyModalOpen(true);
      return; // ← interrompe o handleSave; o modal vai retomar via handleFlyConfirm
    }
    // ─────────────────────────────────────────────────────────────────────────

    if (formData.repPhone) {
      setUserSession(prev => ({ ...prev, repPhone: formData.repPhone }));
    }

    const uploadResult = await processUploads(userSession.uid, formData);

    // Log result for debugging
    console.log('[App] uploadResult:', uploadResult);

    // If authentication error, logout and redirect to login
    if (uploadResult.authError) {
      alert('Sua sessão expirou durante o upload. Por favor, faça login novamente.');
      setUserSession(null);
      setView('login');
      return;
    }

    // If unexpected error, show message but don't logout
    if (uploadResult.unexpectedError) {
      alert(`Erro durante upload: ${uploadResult.failures[0]?.message || 'Desconhecido'}`);
      return;
    }

    if (uploadResult.success || confirm("Alguns arquivos falharam. Deseja salvar assim mesmo?")) {
      const rawData = { ...uploadResult.data, lastUpdated: new Date().toISOString() };

      // ── SINCRONIA DE PARENTESCO ────────────────────────────────────────────────
      // Garante que os dois campos estejam em harmonia antes de gravar no Firestore.
      // Fonte de verdade: relationshipInfo.parentesco (o que o usuário selecionou).
      const canonicalParentesco = rawData.relationshipInfo?.parentesco || rawData.parentesco || '';
      const finalData = {
        ...rawData,
        parentesco: canonicalParentesco,
        relationshipInfo: rawData.relationshipInfo
          ? { ...rawData.relationshipInfo, parentesco: canonicalParentesco }
          : rawData.relationshipInfo
      };
      // ─────────────────────────────────────────────────────────────────────────

      // [DEBUG AUTO-CRIAR-IRMAO] — remover após diagnóstico
      console.log('[App→submitData] finalData _vinculo flags:', {
        _vinculoNomePai: finalData._vinculoNomePai,
        _vinculoNomeMae: finalData._vinculoNomeMae,
        nomePai: finalData.nomePai,
        nomeMae: finalData.nomeMae,
        parentesco: finalData.parentesco,
        vinculoFamiliarId: finalData.vinculoFamiliarId
      });

      const res = await submitData(userSession.uid, finalData);


      if (res.status === 'success') {
        const role = finalData.relationshipInfo?.papel;
        console.log('[App Debug] Saved role:', role, 'parentesco:', canonicalParentesco, 'FormData IDs:', { docId: finalData.docId, id: finalData.id, _originalRole: finalData._originalRole });

        if (role) {
          const originalRole = finalData._originalRole;
          setFamilyMembers(prev => {
            const newState = { ...prev };
            if (originalRole && originalRole !== role) {
              delete newState[originalRole];
            }
            // Atualiza o estado local com os dois campos em sincronia — re-render imediato
            newState[role] = {
              ...finalData,
              parentesco: canonicalParentesco,
              relationshipInfo: { ...(finalData.relationshipInfo || {}), parentesco: canonicalParentesco },
              name: finalData.nomeCompleto || role,
              progress: calculateProgress(finalData)
            };
            return newState;
          });
        }

        // Se um irmão/tio foi auto-criado via radio button, recarrega membrosData
        // para o card aparecer imediatamente na árvore sem precisar recarregar a página
        if (finalData._vinculoNomePai || finalData._vinculoNomeMae) {
          try {
            const refreshed = await fetchFamilyMembers(userSession.uid);
            if (refreshed?.data) {
              setFamilyMembers(refreshed.data);
            }
          } catch (err) {
            console.warn('[AUTO-CRIAR] Refresh falhou — recarregue a página se o card não aparecer:', err);
          }
        }

        // Redirecionamento após salvar
        if (view === 'form') {
          setFormKey(prev => prev + 1);
          setInitialStep(2);
          setFormStep(2);
          window.scrollTo(0, 0);
        } else {
          setView('success');
          window.scrollTo(0, 0);
        }
      } else {
        alert("Erro ao salvar dados: " + res.message);
      }
    }
  };

  // ── ON-THE-FLY EXPANSION: Confirmação do Modal ──────────────────────────────
  /**
   * Chamado pelo modal quando o usuário preenche todas as datas e clica em Confirmar.
   * @param {Array} membersWithDates - [{ ...member, dataNascimento }]
   */
  const handleFlyConfirm = async (membersWithDates) => {
    if (!userSession || !flyPendingSave) return;
    setFlyIsSaving(true);

    try {
      const { formData: savedFormData } = flyPendingSave;

      // Prepara o membro principal com sincronia de parentesco
      const canonicalParentesco = savedFormData.relationshipInfo?.parentesco || savedFormData.parentesco || '';
      const mainMember = {
        ...savedFormData,
        parentesco: canonicalParentesco,
        relationshipInfo: savedFormData.relationshipInfo
          ? { ...savedFormData.relationshipInfo, parentesco: canonicalParentesco }
          : savedFormData.relationshipInfo,
        lastUpdated: new Date().toISOString()
      };

      const res = await saveFamilyBatch(userSession.uid, mainMember, membersWithDates);

      if (res.status !== 'success') {
        alert(`❌ Erro ao salvar em lote: ${res.message}\n\nSeus dados NÃO foram perdidos — o formulário continua aberto.`);
        return; // não limpa o formulário
      }

      // ── Atualiza o estado local ──────────────────────────────────────────
      const role = mainMember.relationshipInfo?.papel;
      if (role) {
        setFamilyMembers(prev => {
          const newState = { ...prev };
          const originalRole = mainMember._originalRole;
          if (originalRole && originalRole !== role) delete newState[originalRole];
          newState[role] = {
            ...mainMember,
            name: mainMember.nomeCompleto || role,
            progress: calculateProgress(mainMember)
          };

          // Injeta os parentes criados on-the-fly no estado local
          for (const rel of (res.created || [])) {
            const relPapel = rel.papel;
            const relMember = membersWithDates.find(m => m.papel === relPapel);
            if (relMember) {
              newState[relPapel] = {
                docId:          rel.docId,
                nomeCompleto:   relMember.nome,
                parentesco:     relMember.parentesco,
                dataNascimento: relMember.dataNascimento,
                relationshipInfo: { papel: relPapel, parentesco: relMember.parentesco },
                name:           relMember.nome,
                status:         'ativo',
                _createdOnTheFly: true,
                progress:       10 // apenas nome e data preenchidos
              };
            }
          }

          return newState;
        });
      }

      // Fecha modal e redireciona
      setIsFlyModalOpen(false);
      setFlyPendingSave(null);
      setFlyDetectedMembers([]);

      if (view === 'form') {
        setFormKey(prev => prev + 1);
        setInitialStep(2);
        setFormStep(2);
        window.scrollTo(0, 0);
      } else {
        setView('success');
        window.scrollTo(0, 0);
      }

    } catch (err) {
      console.error('[handleFlyConfirm] Erro inesperado:', err);
      alert('Erro inesperado ao salvar. O formulário permanece aberto.');
    } finally {
      setFlyIsSaving(false);
    }
  };

  /**
   * Usuário optou por ignorar os parentes detectados e salvar só o membro principal.
   * Retoma o handleSave normal sem a verificação On-The-Fly.
   */
  const handleFlyCancel = async () => {
    setIsFlyModalOpen(false);
    setFlyPendingSave(null);
    setFlyDetectedMembers([]);
    // Chama o save normal — desta vez findNewMembers retornará vazio porque
    // guardamos os detalhes e o usuário optou por ignorar.
    // Usamos um flag temporário para não entrar em loop:
    await _performSaveWithoutFlyCheck();
  };

  /**
   * Executa o save do membro principal SEM verificar parentes novos.
   * Usada pelo handleFlyCancel após o usuário optar por ignorar.
   */
  const _performSaveWithoutFlyCheck = async () => {
    if (!userSession) return;
    if (formData.repPhone) setUserSession(prev => ({ ...prev, repPhone: formData.repPhone }));

    const uploadResult = await processUploads(userSession.uid, formData);
    if (uploadResult.authError) {
      alert('Sua sessão expirou. Faça login novamente.');
      setUserSession(null); setView('login'); return;
    }
    if (uploadResult.unexpectedError) {
      alert(`Erro durante upload: ${uploadResult.failures[0]?.message || 'Desconhecido'}`); return;
    }
    if (uploadResult.success || confirm("Alguns arquivos falharam. Deseja salvar assim mesmo?")) {
      const rawData = { ...uploadResult.data, lastUpdated: new Date().toISOString() };
      const canonicalParentesco = rawData.relationshipInfo?.parentesco || rawData.parentesco || '';
      const finalData = {
        ...rawData,
        parentesco: canonicalParentesco,
        relationshipInfo: rawData.relationshipInfo
          ? { ...rawData.relationshipInfo, parentesco: canonicalParentesco }
          : rawData.relationshipInfo
      };
      const res = await submitData(userSession.uid, finalData);
      if (res.status === 'success') {
        const role = finalData.relationshipInfo?.papel;
        if (role) {
          setFamilyMembers(prev => {
            const newState = { ...prev };
            const originalRole = finalData._originalRole;
            if (originalRole && originalRole !== role) delete newState[originalRole];
            newState[role] = { ...finalData, parentesco: canonicalParentesco, relationshipInfo: { ...(finalData.relationshipInfo || {}), parentesco: canonicalParentesco }, name: finalData.nomeCompleto || role, progress: calculateProgress(finalData) };
            return newState;
          });
        }
        if (view === 'form') { setFormKey(prev => prev + 1); setInitialStep(2); setFormStep(2); window.scrollTo(0, 0); }
        else { setView('success'); window.scrollTo(0, 0); }
      } else { alert("Erro ao salvar dados: " + res.message); }
    }
  };
  // ─────────────────────────────────────────────────────────────────────────────

  // ==================== AUTO-SAVE LOGIC ====================
  const handleAutoSave = async () => {
    if (!userSession || !isEditingMember || !formData?.nomeCompleto || !formData?.dataNascimento) return;

    // Sincronia de parentesco antes do auto-save
    const canonicalParentesco = formData.relationshipInfo?.parentesco || formData.parentesco || '';
    const finalData = {
      ...formData,
      parentesco: canonicalParentesco,
      relationshipInfo: formData.relationshipInfo
        ? { ...formData.relationshipInfo, parentesco: canonicalParentesco }
        : formData.relationshipInfo,
      lastUpdated: new Date().toISOString()
    };

    try {
      const res = await submitData(userSession.uid, finalData);
      
      if (res.status === 'success') {
        const role = finalData.relationshipInfo?.papel;
        if (role) {
          setFamilyMembers(prev => {
            const newState = { ...prev };
            newState[role] = {
              ...finalData,
              parentesco: canonicalParentesco,
              relationshipInfo: { ...(finalData.relationshipInfo || {}), parentesco: canonicalParentesco },
              name: finalData.nomeCompleto || role,
              progress: calculateProgress(finalData)
            };
            return newState;
          });
        }
        console.log('[Auto-Save] Success');
      }
    } catch (err) {
      console.error('[Auto-Save] Failed:', err);
    }
  };

  // Debounced Effect for Auto-Save
  useEffect(() => {
    if (view === 'form' && isEditingMember && formData?.nomeCompleto && formData?.dataNascimento) {
      const timer = setTimeout(() => {
        handleAutoSave();
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [formData, view, isEditingMember]);

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
      // RESET DE CONTEXTO: Limpa todos os dados da memória ao sair
      setFamilyMembers({});
      setFormData(INITIAL_STATE);
      setUserSession(null);
      setView('login');
    }
  };



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
              // [FASE 2] Máscara universal getDisplayRole — elimina "Outro N" da UI
              return getDisplayRole(label, familyMembers[label] || formData);
            })()}
            {!['Eu mesmo', 'Eu mesma'].includes(progressInfo.roleLabel) && userSession?.repName ? ` de ${userSession.repName}` : ''}
          </span>
        </div>
      )}
      {sourceDisplay}
    </div>
  ) : null;




  return (
    <>
      <GlobalMemberSearchDrawer
        isOpen={isGlobalSearchOpen}
        uid={userSession?.uid}
        onClose={() => setIsGlobalSearchOpen(false)}
        onSelectMember={(member) => {
          setFormData({
            ...INITIAL_STATE,
            ...member,
            _globalEditId: member._id
          });
          if (!member.relationshipInfo) {
            member.relationshipInfo = { papel: 'Familiar Adicional', parentesco: 'Familiar Adicional' };
          }
          setInitialStep(3);
          setFormStep(3);
          setView('form');
        }}
      />
      <MainLayout
        view={view}
        title={view !== 'form' && view !== 'recipes' ? (userSession ? `Olá, ${userSession.repName} ` : "Bem-vindo") : ''}
        subtitle={view !== 'form' && view !== 'recipes' ? (userSession && view !== 'hub' ? "Continue preenchendo o legado da sua família." : "Preservando memórias.") : ''}
        headerTitle={
          view === 'account' ? (
            <span className="flex flex-col justify-center">
              <span className="text-[28px] sm:text-5xl tracking-[0.05em] opacity-80">LIVRÃO DA FAMÍLIA</span>
            </span>
          ) : view === 'hub' ? (
            <span className="flex flex-col justify-center">
              <span className="text-[10px] sm:text-[12px] tracking-[0.2em] opacity-80">LIVRÃO DA FAMÍLIA</span>
              <span className="text-3xl sm:text-4xl font-serif font-extrabold leading-none bg-gradient-to-r from-history-green to-emerald-600 bg-clip-text text-transparent normal-case tracking-normal my-0.5 sm:my-1 truncate max-w-[180px] sm:max-w-none">
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

              {/* Global Member Search Trigger */}
              <button
                onClick={() => setIsGlobalSearchOpen(true)}
                className="text-sm font-semibold text-slate-700 bg-white border-2 border-slate-300 px-2 sm:px-3 py-2 rounded-xl hover:bg-slate-50 hover:border-slate-400 transition-all duration-300 shadow-md flex items-center gap-2 active:scale-95"
                title="Buscar Membros"
              >
                <Search size={16} />
                {view !== 'form' && <span className="hidden min-[600px]:inline">Buscar</span>}
              </button>

              {/* VIEW SPECIFIC ACTIONS */}

              {/* 1. Family Tree (Step 2) -> Show Back Button */}
              {(view === 'form' && formStep === 2) && (
                <button
                  onClick={() => setView('hub')}
                  className="text-sm font-bold text-slate-700 bg-white border-2 border-slate-300 p-2 md:px-4 md:py-2 rounded-xl hover:bg-slate-50 hover:border-slate-400 transition-all duration-300 shadow-md hover:shadow-lg hover:-translate-y-0.5 flex items-center gap-2 active:scale-95"
                >
                  <ArrowLeft size={18} /> <span style={{ display: 'none' }} className="md:inline-block">Voltar</span>
                </button>
              )}

              {/* 2. Form View -> Form Actions (Save/Delete) */}
              {view === 'form' && formStep !== 2 ? (
                progressInfo && progressInfo.currentStep >= 3 ? (
                  <div className="flex items-center gap-1.5 sm:gap-2.5">
                    <button
                      onClick={handleDeleteMember}
                      title="Apagar Parente"
                      className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 text-white rounded-xl shadow-lg shadow-red-900/30 transition-all duration-300 border-2 border-white/20 active:scale-95"
                    >
                      <Trash2 size={16} className="sm:w-[19px] sm:h-[19px]" />
                    </button>
                    <button
                      onClick={handleSave}
                      title="Salvar e Sair"
                      className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-500 hover:to-indigo-600 text-white rounded-xl shadow-lg shadow-blue-900/30 transition-all duration-300 border-2 border-white/20 active:scale-95"
                    >
                      <Check size={16} className="sm:w-[19px] sm:h-[19px]" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={handleSave}
                    className="bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-500 hover:to-indigo-600 text-white font-semibold text-xs py-2.5 px-5 rounded-xl shadow-lg shadow-blue-900/30 hover:shadow-xl hover:shadow-blue-900/40 transition-all duration-300 uppercase tracking-wide border-2 border-white/20 flex items-center gap-2 ml-2 active:scale-95"
                  >
                    <Check size={16} /> <span className="hidden min-[600px]:inline">Salvar e Sair</span>
                  </button>
                )
              ) : null}
            </div>
          ) : null
        }
      >
        {!userSession && (
          <div className="flex justify-center items-center min-h-[400px]">

            {/* ── TOKEN CHECKING: spinner de carregamento ── */}
            {tokenCheck === 'checking' && (
              <div className="flex flex-col items-center gap-4 py-16 animate-fade-in">
                <div className="w-12 h-12 border-4 border-history-green border-t-transparent rounded-full animate-spin" />
                <p className="text-stone-500 text-sm font-medium">Verificando seu convite...</p>
              </div>
            )}

            {/* ── TOKEN EXPIRADO ou INVÁLIDO: tela de bloqueio ── */}
            {(tokenCheck === 'expired' || tokenCheck === 'invalid' || tokenCheck === 'error') && (
              <div className="bg-white p-8 rounded-2xl shadow-xl border-t-4 border-red-500 max-w-sm w-full mx-auto text-center animate-fade-in">
                <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-5">
                  <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="12" y1="8" x2="12" y2="12"/>
                    <line x1="12" y1="16" x2="12.01" y2="16"/>
                  </svg>
                </div>
                <h2 className="text-xl font-serif font-bold text-stone-800 mb-2">
                  {tokenCheck === 'expired' ? 'Convite Expirado' : 'Link Inválido'}
                </h2>
                <p className="text-stone-500 text-sm leading-relaxed mb-6">
                  {tokenData?.message || 'Este link de convite não é válido.'}
                </p>
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 text-left">
                  <p className="text-xs text-amber-800 leading-snug">
                    <span className="font-bold block mb-1">O que fazer agora?</span>
                    Entre em contato com a Comissão Livrão da Família e peça que um novo convite seja enviado para o seu e-mail.
                  </p>
                </div>
                <button
                  onClick={() => { setTokenCheck(null); setTokenData(null); setView('login'); window.history.replaceState({}, '', window.location.pathname); }}
                  className="text-sm text-stone-400 hover:text-stone-700 underline transition-colors"
                >
                  Já tenho conta. Fazer Login.
                </button>
              </div>
            )}

            {/* ── TOKEN USED: loginForm com e-mail pré-preenchido + banner ── */}
            {tokenCheck === 'used' && view === 'login' && (
              <div className="flex flex-col items-center gap-3 w-full max-w-sm mx-auto animate-fade-in">
                <div className="w-full bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-center">
                  <p className="text-blue-800 text-xs font-semibold">✅ Você já possui cadastro!</p>
                  <p className="text-blue-600 text-xs mt-0.5">Faça login com o e-mail <strong>{tokenData?.email}</strong></p>
                </div>
                <LoginForm
                  onLoginSuccess={handleAuthSuccess}
                  onSwitchRegister={null}
                  prefillEmail={tokenData?.email || ''}
                />
              </div>
            )}

            {/* ── FLUXO NORMAL (sem token, ou token pending com usuário querendo fazer login) ── */}
            {(tokenCheck === null || tokenCheck === 'pending') && view === 'login' && (
              <LoginForm onLoginSuccess={handleAuthSuccess} onSwitchRegister={() => setView('register')} />
            )}
            {(tokenCheck === null || tokenCheck === 'pending') && view === 'register' && (
              <RegisterForm onRegisterSuccess={handleAuthSuccess} onSwitchLogin={() => setView('login')} />
            )}

          </div>
        )}
        {userSession && view === 'welcome' && (
          <WelcomeScreen repName={userSession.repName} onComplete={() => setView('hub')} />
        )}

        {userSession && view === 'hub' && (
          <UserHub
            repName={userSession.repName}
            familyMembers={familyMembers}
            deferredPrompt={deferredPrompt}
            onPWAInstall={async () => {
              if (deferredPrompt) {
                deferredPrompt.prompt();
                const { outcome } = await deferredPrompt.userChoice;
                if (outcome === 'accepted') setDeferredPrompt(null);
              } else {
                alert('Para instalar o Livrão:\n\n📱 Android/Chrome: toque no menu (⋮) → "Adicionar à tela inicial"\n🍎 Safari/iPhone: toque em Compartilhar (□↑) → "Adicionar à Tela de Início"');
              }
            }}
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
            onBack={() => setView('hub')}
            onComplete={async (savedData = null) => {
              // REFRESH SESSION DATA AFTER SAVE
              try {
                // Try immediate data from child first
                if (savedData) {
                  setUserSession(prev => ({
                    ...prev,
                    repName: savedData.repName || prev.repName,
                    repPhone: savedData.repPhone || prev.repPhone
                  }));
                } else {
                  // Background refresh for visualization mode
                  const freshData = await getAccountData(userSession.uid);
                  if (freshData) {
                    setUserSession(prev => ({
                      ...prev,
                      repName: freshData.repName || freshData.name || prev.repName,
                      repPhone: freshData.repPhone || freshData.phone || prev.repPhone
                    }));
                  }
                }
              } catch (err) {
                console.error("Failed to refresh session:", err);
              }
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
            <ProgressIndicator visible={uploading} percent={progress} message={statusMessage} />
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
              onArchiveMember={handleArchiveMember}
              onArchiveAllOthers={handleArchiveAllOthers}
              onAcceptDuplicate={handleAcceptDuplicate}
              onMergeDuplicates={handleMergeDuplicates}
              onCancel={() => { setFormStep(2); window.scrollTo(0, 0); }}
              uid={userSession?.uid || null}
              onRefreshMembers={async () => {
                if (!userSession?.uid) return;
                try {
                  // fetchFamilyMembers retorna { status, message, data } — não o objeto direto
                  const result = await fetchFamilyMembers(userSession.uid);
                  const refreshed = result?.data || result; // suporte a ambos os formatos
                  if (refreshed && typeof refreshed === 'object' && !refreshed.status) {
                    // só atualiza se vier um objeto de membros real (sem chave 'status')
                    if (Object.keys(refreshed).length > 0) {
                      setFamilyMembers(refreshed);
                    }
                  } else if (result?.data && typeof result.data === 'object') {
                    if (Object.keys(result.data).length > 0) {
                      setFamilyMembers(result.data);
                    }
                  }
                } catch (err) {
                  console.error('[onRefreshMembers] Falha ao recarregar membros:', err);
                  // Nunca limpa a tela em caso de erro
                }
              }}
              onOpenGallery={(member) => {
                setGalleryTarget(member);
                setIsGalleryOpen(true);
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
                {Object.entries(familyMembers)
                  .filter(([, data]) => data && (data.nomeCompleto || data.fullName))
                  .sort(([roleA, dataA], [roleB, dataB]) => {
                    const nameA = (dataA.nomeCompleto || dataA.fullName || roleA).toLowerCase();
                    const nameB = (dataB.nomeCompleto || dataB.fullName || roleB).toLowerCase();
                    return nameA.localeCompare(nameB, 'pt-BR');
                  })
                  .map(([role, data]) => (
                  <button
                    key={role}
                    onClick={() => {
                      setGalleryTarget({ id: role, name: data.nomeCompleto || role });
                      setIsMemberSelectorOpen(false);
                      setIsGalleryOpen(true);
                    }}
                    className="p-4 rounded-lg border-0 md:border border-stone-200 hover:border-history-gold hover:bg-history-gold/5 transition-all text-left flex items-center justify-between group"
                  >
                    <span className="font-bold text-stone-700 group-hover:text-history-gold">{data.nomeCompleto || data.fullName || role}</span>
                    <span className="text-xs text-stone-400 uppercase tracking-wider bg-stone-100 rounded px-2 py-0.5 ml-2 shrink-0">{role}</span>
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

        <PWAInstallPrompt 
          userSession={userSession} 
          deferredPrompt={deferredPrompt}
          setDeferredPrompt={setDeferredPrompt}
        />

        {/* ── ON-THE-FLY EXPANSION MODAL ─────────────────────────────────── */}
        <OnTheFlyModal
          isOpen={isFlyModalOpen}
          members={flyDetectedMembers}
          onConfirm={handleFlyConfirm}
          onCancel={handleFlyCancel}
          isSaving={flyIsSaving}
        />

      </MainLayout>
    </>
  );
}

export default App;
