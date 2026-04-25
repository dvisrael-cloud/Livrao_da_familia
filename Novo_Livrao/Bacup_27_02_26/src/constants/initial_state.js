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
    status: 'Pendente', // 'Ativo', 'Pendente'
    createdAt: null, // Timestamp

    // --- Representante (4) ---
    repName: '',
    repPhone: '',
    source: '',
    community: [], // Array, pois o CSV diz "pode escolher mais de um"

    // --- Personagem: Identificação (5) ---
    fullName: '',
    maidenName: '',
    nickname: '', // NOVO
    gender: '',
    relationship: '', // Parentesco com representante

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
    vitalStatus: 'Vivo', // Gatilho óbito
    deathDate: '',
    deathCause: '', // NOVO
    deathPlace: '',
    burialPlace: '',

    // --- Família: Relacionamento (7) ---
    maritalStatus: '',
    spouseName: '',
    spouseBirthDate: '',
    marriageDate: '',
    marriagePlace: '',
    divorceDate: '',
    spouseDeathDate: '',
    spouseDeathDate: '',
    ketubaUpload: [], // Array de objetos { url, caption, type: 'document' }
    marriageOutcome: '', // 'Divorciou-se' | 'Tornou-se viúvo(a)'
    isDivorced: false, // DEPRECATED implicitly
    isWidowed: false, // DEPRECATED implicitly
    remarried_1: false,

    // --- Casamento 2 ---
    spouseName_2: '',
    spouseBirthDate_2: '',
    marriageDate_2: '',
    marriagePlace_2: '',
    ketubaUpload_2: [],
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

    // --- Narrativa: Relatos (4) ---
    biography: '', // ID original: biography (História de Vida)
    legacy: '', // NOVO
    curiosities: '', // NOVO
    resumo: '', // NOVO

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
