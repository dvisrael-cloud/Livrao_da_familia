/**
 * Initial State - Livrão da Família
 * Baseado no Dicionário de Dados Mestre (CSV Revisado)
 * Total de Campos: 67 (Aproximadamente)
 * Estrutura Canônica para Firestore
 */

export const INITIAL_STATE = {
    // --- Sistema (5) ---
    // email: '', // Gerenciado pelo Auth
    // password: '', // Gerenciado pelo Auth
    role: 'member', // 'admin' ou 'member'
    status: 'Ativo', // 'Ativo', 'Pendente'
    createdAt: null, // Timestamp

    // --- Representante (4) ---
    repName: '',
    repPhone: '',
    source: '',
    community: [], // Array, pois o CSV diz "pode escolher mais de um"

    // --- Personagem: Identificação (5) ---
    nomeCompleto: '',         // Alinhado com formConfig. Antes: fullName
    maidenName: '',
    sobrenomesSolteiro: '',   // Alinhado com formConfig. Antes: maidenName (redundância para segurança)
    apelido: '',              // NOVO. Alinhado com formConfig
    sexo: '',                 // Alinhado com formConfig. Antes: gender
    parentesco: '',           // Alinhado com formConfig. Antes: relationship

    // --- Personagem: Nascimento (4) ---
    birthDate: '', // DD/MM/AAAA ou ISO
    birthCity: '', // NOVO
    birthState: '', // NOVO
    birthCountry: '', // NOVO

    // --- Personagem: Cidadania (2) ---
    religiao: '',
    religiao_outro: '',
    naturalization: '', // NOVO

    // --- Personagem: Imigração (3) ---
    arrivalDate: '', // NOVO
    arrivalPort: '', // NOVO
    shipName: '', // NOVO

    // --- Personagem: Saúde/Óbito (5) ---
    situacaoVital: 'Vivo', // Gatilho óbito
    deathDate: '',
    deathCause: '', // NOVO
    deathPlace: '',
    burialPlace: '',

    // --- Família: Relacionamento (7) ---
    maritalStatus: '',
    nomeConjuge: '',
    dataNascimentoConjuge: '',
    dataCasamento: '',
    marriagePlace: '',
    dataDivorcio: '',
    dataFalecimentoConjuge: '',

    ketubaUpload: [], // Array de objetos { url, caption, type: 'document' }
    wedding_photo: [], // NOVO
    wedding_celebrant: '', // NOVO
    wedding_location: '', // NOVO
    qtdFilhos: 'Nenhum',
    nomeFilho1: '', nomeFilho2: '', nomeFilho3: '', nomeFilho4: '',
    nomeFilho5: '', nomeFilho6: '', nomeFilho7: '', nomeFilho8: '',
    nomeFilho9: '', nomeFilho10: '', nomeFilho11: '', nomeFilho12: '',

    marriageOutcome: '', // 'Divórcio' | 'Falecimento' | 'Foram felizes para sempre'
    isDivorced: false, // DEPRECATED implicitly
    isWidowed: false, // DEPRECATED implicitly
    remarried_1: false,

    // --- Casamento 2 ---
    spouseName_2: '',
    spouseBirthDate_2: '',
    marriageDate_2: '',
    marriagePlace_2: '',
    ketubaUpload_2: [],
    wedding_photo_2: [],
    wedding_celebrant_2: '',
    wedding_location_2: '',
    qtdFilhos_2: 'Nenhum',
    nomeFilho1_2: '', nomeFilho2_2: '', nomeFilho3_2: '', nomeFilho4_2: '',
    nomeFilho5_2: '', nomeFilho6_2: '', nomeFilho7_2: '', nomeFilho8_2: '',
    nomeFilho9_2: '', nomeFilho10_2: '', nomeFilho11_2: '', nomeFilho12_2: '',
    marriageOutcome_2: '',
    isDivorced_2: false,
    isWidowed_2: false,
    divorceDate_2: '',
    spouseDeathDate_2: '',
    remarried_2: false,


    // --- Casamento 3 ---
    spouseName_3: '',
    spouseBirthDate_3: '',
    marriageDate_3: '',
    marriagePlace_3: '',
    ketubaUpload_3: [],
    wedding_photo_3: [],
    wedding_celebrant_3: '',
    wedding_location_3: '',
    qtdFilhos_3: 'Nenhum',
    nomeFilho1_3: '', nomeFilho2_3: '', nomeFilho3_3: '', nomeFilho4_3: '',
    nomeFilho5_3: '', nomeFilho6_3: '', nomeFilho7_3: '', nomeFilho8_3: '',
    nomeFilho9_3: '', nomeFilho10_3: '', nomeFilho11_3: '', nomeFilho12_3: '',
    marriageOutcome_3: '',
    isDivorced_3: false,
    isWidowed_3: false,
    divorceDate_3: '',
    spouseDeathDate_3: '',
    remarried_3: false,


    // --- Casamento 4 ---
    spouseName_4: '',
    spouseBirthDate_4: '',
    marriageDate_4: '',
    marriagePlace_4: '',
    ketubaUpload_4: [],
    wedding_photo_4: [],
    wedding_celebrant_4: '',
    wedding_location_4: '',
    qtdFilhos_4: 'Nenhum',
    nomeFilho1_4: '', nomeFilho2_4: '', nomeFilho3_4: '', nomeFilho4_4: '',
    nomeFilho5_4: '', nomeFilho6_4: '', nomeFilho7_4: '', nomeFilho8_4: '',
    nomeFilho9_4: '', nomeFilho10_4: '', nomeFilho11_4: '', nomeFilho12_4: '',
    marriageOutcome_4: '',
    isDivorced_4: false,
    isWidowed_4: false,
    divorceDate_4: '',
    spouseDeathDate_4: '',


    // --- Família: Descendência (2) ---
    children: '', // Long Text
    grandchildren: '', // Long Text

    // --- Família: Parentesco (2) ---
    fatherName: '', // NOVO
    motherName: '', // NOVO

    // --- Vida Ativa: Educação (2) ---
    education: '', // NOVO
    schools: '', // NOVO (Long Text)

    // --- Vida Ativa: Trabalho (3) ---
    occupation: '',
    workplaces: '', // NOVO (Long Text)
    achievements: '', // NOVO (Long Text)

    // --- Vida Ativa: Endereços (1) ---
    residences: '', // Long Text

    // --- Vida Social: Círculo (2) ---
    friends: '', // Long Text
    places: '', // Long Text

    // --- Vida Social: Institucional (3 - Resolvendo conflito de ID 'synagogue') ---
    communityLife: '', // Long Text
    synagogue: '', // Instituição religiosa
    jewishStudies: '', // ORIGINAL: 'synagogue' (Professor de judaismo) -> Renomeado para evitar colisão

    // --- Vida Social: Lazer (2) ---
    hobbies: '', // Long Text
    languages: '', // NOVO
    did_brit_millah: false, // Checkbox sim/não
    brit_millah_date: '', // NOVO
    brit_millah_location: '', // NOVO
    brit_millah_responsible: '', // NOVO
    did_fadas: false, // Checkbox sim/não
    fadas_date: '', // NOVO - Para Mulheres
    fadas_location: '', // NOVO - Para Mulheres
    fadas_responsible: '', // NOVO - Para Mulheres
    did_bar_mitzva: false, // Checkbox
    bar_mitzva_date: '',
    bar_mitzva_location: '',
    did_bat_mitzva: false, // Checkbox
    bat_mitzva_date: '',
    bat_mitzva_location: '',
    youth_movements: '', // NOVO
    additional_skills: '', // NOVO

    // --- Narrativa: Relatos (4) ---
    biography: '', // ID original: biography (História de Vida)
    legacy: '', // NOVO
    curiosities: '', // NOVO
    resumo: '', // NOVO
    hakitia_expressions: '', // NOVO

    // --- Mídia (6) ---
    // Estrutura Complexa: { url: string, caption: string, type: 'image'|'video'|'audio'|'document' }

    photoMain: null, // { url, caption, type: 'image' }

    gallery: [], // Array de objetos { url, caption, type: 'image' }
    photoCaptions: '', // NOVO (Long Text) - Legendas texto livre, mantido por fidelidade ao CSV

    documents: [], // Array de objetos { url, caption, type: 'document' }
    videos: [], // Array de objetos { url, caption, type: 'video' } (Links YouTube etc)
    audios: [], // Array de objetos { url, caption, type: 'audio' }

    // --- Requisitos: Técnicos (3) ---
    fotoIdentificacao: [], // Array de objetos { url, caption, file, preview }
    lastUpdate: null, // Automático
    validatedBy: '', // NOVO
};
