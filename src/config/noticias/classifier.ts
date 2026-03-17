export type CategoriaNoticia = "legislativa" | "jurisprudencial" | "artigo";

// ==========================================
// CAMADA 1: KEYWORDS NEGATIVAS (descarte imediato)
// ==========================================

export const KEYWORDS_NEGATIVAS = [
  // Eventos e cursos
  "inscrições abertas", "inscreva-se", "processo seletivo", "edital de seleção",
  "congresso", "seminário", "workshop", "webinar", "curso de",
  "evento", "programação do evento", "participe",
  // Institucional/RH
  "lista de aprovados", "resultado do concurso", "nomeação", "posse",
  "laboratório", "bolsa de estudos", "bolsista", "estágio",
  "aniversário", "homenagem", "nota de falecimento", "nota de pesar",
  // Comercial
  "assinatura", "desconto", "promoção", "black friday",
  "patrocinado", "publi",
  // Boletins genéricos
  "boletim informativo", "newsletter", "clipping",
  "expediente", "recesso", "feriado",
  // Tributário/Cível puro (sem intersecção com criminal)
  "icms", "ipi", "irpf", "irpj", "pis/cofins", "contribuição previdenciária",
  "imposto de renda", "nota fiscal", "crédito tributário", "base de cálculo",
  "recuperação judicial", "falência", "concordata",
  "guarda compartilhada", "alimentos", "divórcio", "inventário", "herança",
  "condomínio", "locação", "contrato de compra", "financiamento imobiliário",
];

/** Retorna true se a notícia deve ser descartada */
export function isIrrelevante(titulo: string, resumo: string): boolean {
  const combined = `${titulo} ${resumo}`.toLowerCase();
  return KEYWORDS_NEGATIVAS.some(kw => combined.includes(kw.toLowerCase()));
}

// ==========================================
// CAMADA 2: KEYWORDS POSITIVAS (relevância mínima)
// Foco: Direito Penal, Processo Penal, Execução Penal,
//        Júri, VVD, Drogas, ECA, Criminologia, Defensoria
// ==========================================

export const KEYWORDS_RELEVANCIA = [
  // ── DIREITO PENAL MATERIAL ──────────────────────────────
  "penal", "crime", "delito", "infração penal",
  "homicídio", "feminicídio", "latrocínio", "estupro", "abuso sexual",
  "furto", "roubo", "extorsão", "sequestro", "cárcere privado",
  "estelionato", "fraude", "falsidade", "receptação",
  "lesão corporal", "vias de fato", "periclitação",
  "peculato", "corrupção passiva", "corrupção ativa", "concussão",
  "prevaricação", "improbidade", "lavagem de dinheiro",
  "porte de arma", "disparo de arma", "arma de fogo",
  "código penal", "CP ", "art. 121", "art. 155", "art. 157",
  "art. 213", "art. 217", "art. 33", "art. 28",
  "tipicidade", "antijuridicidade", "culpabilidade", "imputabilidade",
  "dolo", "culpa", "nexo causal", "imputação objetiva",
  "tentativa", "concurso de crimes", "concurso formal", "crime continuado",
  "reincidência", "maus antecedentes", "pena base",
  "prescrição penal", "decadência", "perempção",
  "estado de necessidade", "legítima defesa", "estrito cumprimento",
  "excludentes de ilicitude", "excludente de culpabilidade",
  "coautoria", "participação", "autoria mediata",
  "crime hediondo", "equiparado a hediondo",
  "abolitio criminis", "lex mitior", "novatio legis",
  "teoria do delito", "teoria finalista", "teoria causalista",

  // ── PROCESSO PENAL ──────────────────────────────────────
  "processo penal", "CPP", "código de processo penal",
  "prisão preventiva", "prisão cautelar", "prisão temporária",
  "prisão em flagrante", "flagrante delito", "prisão domiciliar",
  "audiência de custódia", "auto de prisão em flagrante",
  "liberdade provisória", "fiança", "relaxamento de prisão",
  "revogação de prisão", "alvará de soltura",
  "medida cautelar alternativa", "comparecimento em juízo",
  "proibição de contato", "suspensão do passaporte",
  "interceptação telefônica", "escuta ambiental", "captação de sinais",
  "busca e apreensão", "mandado de busca",
  "inquérito policial", "termo circunstanciado",
  "denúncia", "queixa-crime", "ação penal pública", "ação penal privada",
  "nulidade processual", "nulidade absoluta", "nulidade relativa",
  "prova ilícita", "prova ilegal", "teoria dos frutos da árvore envenenada",
  "cadeia de custódia", "prova emprestada",
  "acordo de não persecução penal", "ANPP", "suspensão condicional do processo",
  "colaboração premiada", "delação premiada", "acordo de colaboração",
  "confissão", "interrogatório", "direito ao silêncio",
  "contraditório", "ampla defesa", "due process", "garantismo",
  "instrução criminal", "alegações finais", "memoriais",
  "habeas corpus", "HC", "RHC", "mandado de segurança criminal",
  "revisão criminal", "rescisória penal",
  "recurso em sentido estrito", "RESE", "apelação criminal",
  "embargos infringentes", "agravo em execução",
  "competência criminal", "conexão", "continência",
  "júri", "plenário", "pronúncia", "impronúncia",
  "desclassificação", "absolvição sumária",
  "sursis", "suspensão condicional da pena",
  "pena alternativa", "restritiva de direitos",

  // ── EXECUÇÃO PENAL ──────────────────────────────────────
  "execução penal", "LEP", "lei de execução penal",
  "preso", "detento", "reeducando", "sentenciado",
  "progressão de regime", "regime fechado", "regime semiaberto", "regime aberto",
  "livramento condicional", "liberdade condicional",
  "saída temporária", "indulto", "comutação de pena", "graça",
  "remição de pena", "remição pelo trabalho", "remição pelo estudo",
  "monitoramento eletrônico", "tornozeleira eletrônica",
  "falta disciplinar", "falta grave", "falta leve",
  "comissão técnica de classificação", "CTC", "atestado de comportamento",
  "benefícios prisionais", "visita íntima", "regime disciplinar diferenciado", "RDD",
  "SEAP", "DEPEN", "sistema prisional", "unidade prisional", "penitenciária",
  "encarceramento", "superlotação carcerária", "crise penitenciária",
  "reintegração social", "ressocialização",
  "casa de albergado", "colônia penal agrícola", "estabelecimento penal",
  "patronato", "conselho penitenciário",
  "agravo em execução", "incidente de execução",

  // ── TRIBUNAL DO JÚRI ────────────────────────────────────
  "tribunal do júri", "júri popular", "julgamento pelo júri",
  "conselho de sentença", "jurados", "jurado",
  "quesitos", "votação secreta", "incomunicabilidade",
  "pronúncia", "impronúncia", "desclassificação", "absolvição sumária",
  "plenário do júri", "sessão do júri", "debate no júri",
  "soberania do júri", "soberano do júri",
  "crimes dolosos contra a vida", "tentativa de homicídio",
  "revisão criminal", "novo júri",
  "protesto por novo júri", "error in procedendo",
  "apelação do júri", "anulação do júri",

  // ── VIOLÊNCIA DOMÉSTICA (VVD) ───────────────────────────
  "lei maria da penha", "lei 11.340", "violência doméstica",
  "violência contra a mulher", "violência de gênero",
  "medida protetiva", "medida protetiva de urgência",
  "afastamento do lar", "proibição de aproximação",
  "feminicídio", "violência familiar",
  "stalking", "perseguição", "importunação sexual",
  "DEAM", "delegacia da mulher", "casa da mulher",
  "rede de enfrentamento", "ciclo da violência",
  "violência psicológica", "violência patrimonial", "violência moral",
  "violência obstétrica", "assédio sexual",
  "VVD", "atribuição de violência doméstica",
  "crime de gênero", "violência baseada em gênero",

  // ── DROGAS ──────────────────────────────────────────────
  "lei de drogas", "lei 11.343", "lei antidrogas",
  "tráfico de drogas", "tráfico ilícito", "tráfico privilegiado",
  "associação para o tráfico", "financiamento ao tráfico",
  "uso de drogas", "porte para uso pessoal", "usuário de drogas",
  "art. 28 lei 11.343", "art. 33 lei 11.343",
  "entorpecente", "substância psicoativa", "droga ilícita",
  "cannabis", "crack", "cocaína", "maconha", "LSD",
  "descriminalização", "legalização", "política de drogas",
  "harm reduction", "redução de danos",

  // ── ECA / INFRACIONAL ───────────────────────────────────
  "ECA", "estatuto da criança", "estatuto do adolescente",
  "adolescente infrator", "menor infrator", "ato infracional",
  "medida socioeducativa", "internação de adolescente", "SINASE",
  "liberdade assistida", "prestação de serviços à comunidade",
  "desinternação", "progressão de medida socioeducativa",
  "CASE", "FEBEM", "unidade socioeducativa",
  "criança e adolescente em conflito com a lei",

  // ── CRIMINOLOGIA ────────────────────────────────────────
  "criminologia", "criminólogo", "criminológico",
  "teoria criminológica", "escola clássica", "escola positiva",
  "labeling", "teoria do etiquetamento", "estigmatização",
  "teoria da anomia", "subcultura delinquente",
  "criminologia crítica", "criminologia radical",
  "abolicionismo penal", "minimalismo penal", "garantismo penal",
  "seletividade penal", "seletividade do sistema penal",
  "encarceramento em massa", "criminalização da pobreza",
  "controle social", "sistema de controle social",
  "vitimologia", "vitimização", "vítima do crime",
  "cifra negra", "cifra oculta", "subnotificação criminal",
  "criminalidade", "delinquência", "reincidência criminal",
  "prevenção criminal", "prevenção ao crime",
  "perfil criminológico", "análise criminal",
  "política criminal", "política de segurança pública",
  "neoliberalismo penal", "populismo punitivo", "punitivismo",
  "racismo estrutural", "violência institucional",

  // ── DEFENSORIA / ACESSO À JUSTIÇA ───────────────────────
  "defensoria pública", "defensor público", "DPE", "DPU", "DPM",
  "LC 80", "lei complementar 80", "lei orgânica da defensoria",
  "assistência jurídica gratuita", "acesso à justiça",
  "hipossuficiente", "necessitado", "vulnerável",
  "assistido", "atendimento da defensoria",
  "núcleo criminal", "especialização criminal",

  // ── CONSTITUCIONAL / DIREITOS FUNDAMENTAIS ──────────────
  "STF", "STJ", "superior tribunal de justiça",
  "supremo tribunal federal", "STF decidiu", "STJ decidiu",
  "habeas corpus", "HC", "RHC", "mandado de segurança",
  "súmula vinculante", "súmula", "informativo do STF", "informativo do STJ",
  "informativo nº", "tese fixada", "tese firmada",
  "repercussão geral", "recurso repetitivo", "recurso especial", "REsp",
  "recurso extraordinário", "acórdão", "julgamento",
  "ADPF", "ADI", "ADC", "ação constitucional",
  "direitos fundamentais", "garantias constitucionais",
  "princípio da legalidade penal", "princípio da anterioridade",
  "princípio da culpabilidade", "presunção de inocência",
  "nemo tenetur", "direito ao silêncio", "contraditório",
  "devido processo legal", "ampla defesa",
  "direitos humanos", "tortura", "tratamento desumano",
  "CIDH", "corte interamericana de direitos humanos",
  "convenção americana", "pacto de são josé",

  // ── SEGURANÇA PÚBLICA ───────────────────────────────────
  "segurança pública", "polícia", "policial",
  "abuso de autoridade", "lei de abuso de autoridade", "lei 13.869",
  "uso da força", "uso progressivo da força",
  "letalidade policial", "morte por intervenção policial",
  "execução sumária", "chacina", "massacre",
  "violência policial", "brutalidade policial",
  "investigação criminal", "delegacia de polícia",
  "polícia civil", "polícia militar", "polícia federal",
  "perícia criminal", "laudo pericial", "exame de corpo de delito",
  "necropsia", "medicina legal",

  // ── LEGISLAÇÃO ──────────────────────────────────────────
  "lei nº", "lei n.", "projeto de lei", "PL ", "PEC ",
  "medida provisória", "MP nº",
  "sancionou", "sancionada", "promulgada", "promulgou",
  "nova redação", "alteração legislativa", "alterou", "revogou",
  "decreto nº", "resolução nº", "portaria nº",
  "entrou em vigor", "vacatio legis", "publicada no DOU",
  "aprovado pelo senado", "aprovado pela câmara",
];

/** Retorna true se a notícia é potencialmente relevante */
export function isRelevante(titulo: string, resumo: string): boolean {
  const combined = `${titulo} ${resumo}`.toLowerCase();
  return KEYWORDS_RELEVANCIA.some(kw => combined.includes(kw.toLowerCase()));
}

// ==========================================
// CLASSIFICAÇÃO POR CATEGORIA
// ==========================================

export const KEYWORDS_LEGISLATIVA = [
  "lei nº", "lei n.", "sancionou", "sancionada", "promulgada", "promulgou",
  "PL ", "PLC ", "PLS ", "PEC ", "MP nº", "medida provisória",
  "nova redação", "alteração legislativa", "alterou", "revogou", "revogada",
  "decreto nº", "decreto n.", "resolução nº", "portaria nº",
  "entrou em vigor", "vacatio legis", "publicada no DOU",
  "projeto de lei", "aprovado pelo senado", "aprovado pela câmara",
];

export const KEYWORDS_JURISPRUDENCIAL = [
  "STF decidiu", "STJ decidiu", "STF fixou", "STJ fixou",
  "informativo nº", "informativo stf", "informativo stj",
  "tese fixada", "tese firmada", "repercussão geral", "recurso repetitivo",
  "HC", "habeas corpus", "RHC", "recurso especial", "REsp",
  "recurso extraordinário", "RE ", "ADPF", "ADI", "ADC",
  "súmula vinculante", "súmula nº", "overruling",
  "turma decidiu", "plenário decidiu", "seção decidiu",
  "jurisprudência", "julgamento", "acórdão",
];

export const TEMAS_PADRAO: { nome: string; keywords: string[] }[] = [
  {
    nome: "Direito Penal",
    keywords: [
      "penal", "crime", "delito", "homicídio", "furto", "roubo", "estelionato",
      "código penal", "tipicidade", "antijuridicidade", "culpabilidade",
      "dolo", "culpa", "teoria do delito", "crime hediondo",
    ],
  },
  {
    nome: "Processo Penal",
    keywords: [
      "processo penal", "CPP", "prisão preventiva", "prisão cautelar",
      "audiência de custódia", "interceptação", "busca e apreensão",
      "nulidade", "prova ilícita", "cadeia de custódia",
      "ANPP", "colaboração premiada", "habeas corpus",
    ],
  },
  {
    nome: "Execução Penal",
    keywords: [
      "execução penal", "LEP", "preso", "detento", "progressão de regime",
      "regime fechado", "semiaberto", "livramento condicional",
      "saída temporária", "indulto", "remição", "tornozeleira",
      "sistema prisional", "encarceramento", "SEAP", "DEPEN",
    ],
  },
  {
    nome: "Tribunal do Júri",
    keywords: [
      "júri", "plenário", "quesitos", "pronúncia", "impronúncia",
      "desclassificação", "conselho de sentença", "jurado",
      "soberania do júri", "crimes dolosos contra a vida",
    ],
  },
  {
    nome: "Violência Doméstica",
    keywords: [
      "maria da penha", "lei 11.340", "violência doméstica",
      "medida protetiva", "feminicídio", "violência contra a mulher",
      "VVD", "DEAM", "ciclo da violência", "stalking",
    ],
  },
  {
    nome: "Drogas",
    keywords: [
      "lei 11.343", "lei de drogas", "tráfico", "tráfico privilegiado",
      "uso de drogas", "art. 28", "art. 33", "entorpecente",
      "descriminalização", "política de drogas",
    ],
  },
  {
    nome: "ECA / Infracional",
    keywords: [
      "ECA", "adolescente infrator", "ato infracional",
      "medida socioeducativa", "internação", "SINASE",
      "liberdade assistida", "menor infrator",
    ],
  },
  {
    nome: "Criminologia",
    keywords: [
      "criminologia", "criminólogo", "teoria criminológica",
      "labeling", "etiquetamento", "abolicionismo penal", "garantismo",
      "seletividade penal", "encarceramento em massa", "política criminal",
      "vitimologia", "cifra negra", "punitivismo", "populismo punitivo",
    ],
  },
  {
    nome: "Defensoria Pública",
    keywords: [
      "defensoria pública", "defensor público", "DPE", "DPU", "LC 80",
      "assistência jurídica gratuita", "acesso à justiça", "hipossuficiente",
    ],
  },
  {
    nome: "Segurança Pública",
    keywords: [
      "segurança pública", "polícia", "abuso de autoridade",
      "uso da força", "letalidade policial", "violência policial",
      "investigação criminal", "perícia criminal",
    ],
  },
  {
    nome: "Direitos Humanos",
    keywords: [
      "direitos humanos", "tortura", "tratamento desumano",
      "CIDH", "corte interamericana", "convenção americana",
      "presunção de inocência", "garantias constitucionais",
    ],
  },
];

/** Classifica uma notícia pela categoria baseado no título + resumo */
export function classificarNoticia(titulo: string, texto: string): CategoriaNoticia {
  const combined = `${titulo} ${texto}`.toLowerCase();

  const scoreleg = KEYWORDS_LEGISLATIVA.reduce((s, k) => s + (combined.includes(k.toLowerCase()) ? 1 : 0), 0);
  const scorejur = KEYWORDS_JURISPRUDENCIAL.reduce((s, k) => s + (combined.includes(k.toLowerCase()) ? 1 : 0), 0);

  if (scoreleg > scorejur && scoreleg > 0) return "legislativa";
  if (scorejur > scoreleg && scorejur > 0) return "jurisprudencial";
  if (scoreleg > 0) return "legislativa";
  if (scorejur > 0) return "jurisprudencial";
  return "artigo";
}

/** Retorna tags matched para uma notícia */
export function extrairTags(titulo: string, texto: string, temasCustom: { nome: string; keywords: string[] }[] = []): string[] {
  const combined = `${titulo} ${texto}`.toLowerCase();
  const allTemas = [...TEMAS_PADRAO, ...temasCustom];
  return allTemas
    .filter(tema => tema.keywords.some(kw => combined.includes(kw.toLowerCase())))
    .map(tema => tema.nome);
}
