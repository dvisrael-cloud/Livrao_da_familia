import React, { useState, useEffect, useMemo } from 'react';
import { Search, X, Archive, Users, Calendar, Percent, AlertCircle } from 'lucide-react';
import { collection, getDocs, doc, setDoc, deleteDoc, query, orderBy, limit, startAfter } from 'firebase/firestore';
import { db } from '../services/firebase';

const calculateProgress = (data) => {
    if (!data) return 0;
    const baseFields = ['nomeCompleto', 'dataNascimento', 'localNascimento_cidade', 'localNascimento_pais', 'religiao', 'nomePai', 'nomeMae', 'situacaoConjugal', 'situacaoVital', 'biography', 'resumoHistorico'];
    let filled = 0;
    let total = baseFields.length + 1;
    baseFields.forEach(f => { if (data[f] && typeof data[f] === 'string' && data[f].trim() !== '') filled++; });
    if (data.fotoIdentificacao?.length > 0 || data.photoMain) filled++;

    if (data.situacaoVital === 'Falecido') {
        const deathFields = ['dataFalecimento', 'localFalecimento_cidade', 'causaMorte'];
        total += deathFields.length;
        deathFields.forEach(f => { if (data[f] && typeof data[f] === 'string' && data[f].trim() !== '') filled++; });
    }
    return Math.round((filled / total) * 100);
};

export function useMembrosPaginados(isOpen, uid) {
  const [rawMembers, setRawMembers] = useState([]);
  const [lastVisibleDoc, setLastVisibleDoc] = useState(null);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  // Constante para definir quantos cards carregar por vez
  const TAMANHO_DA_PAGINA = 20;

  const carregarMembros = async (proximaPagina = false) => {
    if (loading || (!hasMore && proximaPagina)) return;

    setLoading(true);

    try {
      if (!uid) {
        console.warn("UID não disponível para carregar membros.");
        setLoading(false);
        return;
      }

      let q;
      // CONSULTA RESTRITA: Apenas membros da família do próprio usuário logado
      const colecaoRef = collection(db, 'familias', uid, 'membros'); 

      console.log("🔒 BUSCA RESTRITA AO USUÁRIO:", uid);
      
      q = query(colecaoRef, orderBy('nomeCompleto', 'asc')); 
      
      const snapshot = await getDocs(q);
      console.log("💎 Total de membros encontrados na sua árvore:", snapshot.size);
      if (snapshot.size > 0) {
        console.table(snapshot.docs.map(d => ({id: d.id, nome: d.data().nomeCompleto, papel: d.data().relationshipInfo?.papel})));
      }
      
      if (snapshot.empty) {
        console.log("ℹ️ Sua lista de membros está vazia.");
        setHasMore(false);
        setLoading(false);
        return;
      }

      const novosMembros = snapshot.docs.map(docSnap => {
          const data = docSnap.data();
          let citationDate = 'Sem Data';
          if (data.createdAt?.toDate) {
              citationDate = data.createdAt.toDate().toLocaleDateString('pt-BR');
          } else if (data.createdAt) {
              citationDate = new Date(data.createdAt).toLocaleDateString('pt-BR');
          } else {
              citationDate = 'Criado sem data/Seed';
          }
          const progressPct = calculateProgress(data);
          
          return {
              _id: docSnap.id,
              ...data,
              citationDate,
              progressPct
          };
      });

      // Atualiza o ponteiro (cursor) para a próxima requisição
      setLastVisibleDoc(snapshot.docs[snapshot.docs.length - 1]);

      // Acumulamos os registros brutos com deduplicação por ID
      setRawMembers(prev => {
          const base = proximaPagina ? prev : [];
          const combined = [...base, ...novosMembros];
          // Remove duplicatas caso o cursor de paginação repita documentos
          const uniqueIds = new Set();
          return combined.filter(m => {
              if (uniqueIds.has(m._id)) return false;
              uniqueIds.add(m._id);
              return true;
          });
      });

      // Se trouxe menos documentos que o limite, chegamos ao final da lista
      if (snapshot.docs.length < TAMANHO_DA_PAGINA) {
        setHasMore(false);
      } else {
        // Garantir que caso for nova busca (fechou/abriu), hasMore volte a true se há mais paginas
        if (!proximaPagina) setHasMore(true); 
      }

    } catch (error) {
      console.error("Erro ao carregar a lista de membros:", error);
    } finally {
      setLoading(false);
    }
  };

  // Cálculo reativo das tags: executa sempre que novos registros são acumulados ou excluídos
  const membersWithTags = useMemo(() => {
     return rawMembers.map((membro, _, array) => {
        const memNome = (membro.nomeCompleto || '').trim().toLowerCase();
        const memData = (membro.dataNascimento || '').trim();
        
        if(!memNome) return { ...membro, isDuplicate: false, isHomonym: false };
        
        let isDuplicate = false;
        let isHomonym = false;

        // Loop rigoroso para identificação e logs de comparação
        array.forEach(outro => {
            if (membro._id === outro._id) return;

            const outroNome = (outro.nomeCompleto || '').trim().toLowerCase();
            const outroData = (outro.dataNascimento || '').trim();

            if (memNome === outroNome) {
                // [D] só se NOME igual E DATA igual E DATA não vazia
                const hasSameData = memData !== '' && outroData !== '' && memData === outroData;
                
                // [H] se NOME igual mas DATA diferente
                const hasDiffData = memData !== outroData;

                if (hasSameData) isDuplicate = true;
                if (hasDiffData) isHomonym = true;

                console.log(`🔍 Comparando: [${membro.nomeCompleto}] + [${memData}] VS [${outro.nomeCompleto}] + [${outroData}]. Resultado: [D] ${hasSameData ? 'APLICADO' : 'NÃO APLICADO'}`);
            }
        });

        return { ...membro, isDuplicate, isHomonym };
      });
  }, [rawMembers]);

  useEffect(() => {
     if (isOpen) {
         setRawMembers([]);
         setLastVisibleDoc(null);
         setHasMore(true);
         carregarMembros(false);
     }
  }, [isOpen]);

  // Expor "membersWithTags" como "members", e "setRawMembers" como "setMembers"
  return { members: membersWithTags, carregarMembros, loading, hasMore, setMembers: setRawMembers };
}

const TriangleBadge = ({ colorClass, textClass, letter, title }) => (
    <div className={`relative flex items-center justify-center w-5 h-5 shrink-0 pt-[2px] ${textClass} opacity-90 hover:opacity-100 transition-opacity cursor-help`} title={title}>
        <svg viewBox="0 0 24 24" className={`absolute inset-0 w-full h-full ${colorClass}`} fill="currentColor">
            <polygon points="12,2 22,20 2,20" />
        </svg>
        <span className="relative z-10 text-[9px] font-extrabold">{letter}</span>
    </div>
);

export const GlobalMemberSearchDrawer = ({ isOpen, onClose, onSelectMember, uid }) => {
    const { members, carregarMembros, loading, hasMore, setMembers } = useMembrosPaginados(isOpen, uid);

    const handleArchive = async (e, member) => {
        e.stopPropagation();
        if(!window.confirm(`Deseja realmente mover ${member.nomeCompleto} para o Arquivo Morto?`)) return;
        
        try {
            const archiveRef = doc(db, 'familias', uid, 'arquivo_morto', member._id);
            await setDoc(archiveRef, { 
                ...member, 
                archivedAt: new Date().toISOString() 
            });
            
            const memberRef = doc(db, 'familias', uid, 'membros', member._id);
            await deleteDoc(memberRef);
            
            alert(`${member.nomeCompleto} foi movido para o Arquivo Morto com sucesso!`);
            
            setMembers(prev => prev.filter(m => m._id !== member._id));
        } catch (err) {
            console.error("Erro ao arquivar", err);
            alert("Erro ao arquivar: " + err.message);
        }
    };

    return (
        <>
            {isOpen && (
                <div 
                  className="fixed inset-0 bg-black/60 z-[90] backdrop-blur-sm transition-opacity"
                  onClick={onClose}
                />
            )}
            
            <div className={`fixed inset-y-0 right-0 z-[100] w-full max-w-sm bg-white shadow-2xl transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : 'translate-x-full'} flex flex-col`}>
                <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-slate-50 shrink-0">
                    <h2 className="text-lg font-serif font-bold text-slate-800 flex items-center gap-2">
                        <Users size={20} className="text-history-green" />
                        Membros da Família
                    </h2>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-200 text-slate-500 transition-colors">
                        <X size={20} />
                    </button>
                </div>
                
                <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2">
                    {members.length === 0 && !loading && (
                         <div className="text-center p-8 text-slate-500 text-sm">
                            Nenhum membro encontrado na sua família.
                        </div>
                    )}
                    
                    {members.map(member => (
                        <div 
                            key={member._id}
                            onClick={() => {
                                onSelectMember(member);
                                onClose();
                            }}
                            className="flex items-center justify-between p-3 rounded-xl border border-slate-200 hover:border-history-green hover:bg-emerald-50 cursor-pointer transition-all group shadow-sm hover:shadow-md shrink-0"
                        >
                            <div className="flex flex-col flex-1 min-w-0 pr-2 gap-1.5">
                                <div className="flex items-center gap-2">
                                    <h3 className="font-bold text-slate-800 truncate text-sm">
                                        {member.nomeCompleto || 'Nome Desconhecido'}
                                    </h3>
                                    <div className="flex items-center gap-1 shrink-0">
                                        {member.isDuplicate && <TriangleBadge colorClass="text-amber-400" textClass="text-amber-900" letter="D" title={`Duplicata (Mesmo nome e data: ${member.nomeCompleto})`} />}
                                        {member.isHomonym && <TriangleBadge colorClass="text-blue-400" textClass="text-blue-900" letter="H" title={`Homônimo (Mesmo nome, datas diferentes: ${member.nomeCompleto})`} />}
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 text-[10px] text-slate-500 font-medium">
                                    <span 
                                        className={`flex items-center gap-1 ${!member.dataCriacaoFormulario ? 'text-amber-600' : ''}`} 
                                        title={member.dataCriacaoFormulario ? (member.migrationNote || "Data de Cadastro") : "Data padrão estabelecida na atualização de sistema"}
                                    >
                                        <Calendar size={12} className="opacity-70" />
                                        {member.dataCriacaoFormulario 
                                            ? new Date(member.dataCriacaoFormulario + 'T00:00:00').toLocaleDateString('pt-BR') 
                                            : "19/03/2026 ⚠️"}
                                        {!member.dataCriacaoFormulario && <AlertCircle size={12} className="animate-pulse" />}
                                    </span>
                                    <span className="flex items-center gap-1 text-emerald-600" title="Cadastro Completo">
                                        <Percent size={12} className="opacity-70" />
                                        {member.progressPct}% Completo
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))}
                    
                    {loading && (
                        <div className="flex justify-center items-center py-4">
                            <span className="text-slate-500 font-bold animate-pulse text-sm flex items-center gap-2">
                                <span className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin"></span>
                                Carregando...
                            </span>
                        </div>
                    )}
                    
                    {hasMore && members.length > 0 && !loading && (
                        <div className="py-2 flex justify-center mt-2">
                            <button
                                onClick={() => carregarMembros(true)}
                                className="w-full py-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 font-medium rounded-xl text-sm transition-colors flex items-center justify-center shadow-sm"
                            >
                                Carregar Mais
                            </button>
                        </div>
                    )}
                    
                    {!hasMore && members.length > 0 && (
                        <div className="text-center py-4 text-slate-400 text-xs font-medium mt-2">
                            Todos os membros foram carregados.
                        </div>
                    )}
                </div>
            </div>
        </>
    );
};
