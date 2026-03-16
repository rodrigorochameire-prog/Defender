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
];

/** Retorna true se a notícia deve ser descartada */
export function isIrrelevante(titulo: string, resumo: string): boolean {
  const combined = `${titulo} ${resumo}`.toLowerCase();
  return KEYWORDS_NEGATIVAS.some(kw => combined.includes(kw.toLowerCase()));
}

// ==========================================
// CAMADA 2: KEYWORDS POSITIVAS (relevância mínima)
// ==========================================

export const KEYWORDS_RELEVANCIA = [
  // Direito Penal / Material
  "penal", "crime", "homicídio", "furto", "roubo", "estelionato", "lesão corporal",
  "código penal", "CP", "tipicidade", "antijuridicidade", "culpabilidade",
  "tentativa", "concurso de crimes", "reincidência", "prescrição",
  "feminicídio", "latrocínio", "extorsão", "corrupção", "peculato",
  // Processo Penal
  "processo penal", "CPP", "prisão preventiva", "prisão cautelar", "prisão temporária",
  "audiência de custódia", "interceptação", "busca e apreensão", "flagrante",
  "inquérito", "denúncia", "queixa-crime", "ação penal",
  "nulidade", "prova ilícita", "cadeia de custódia",
  "acordo de não persecução", "ANPP", "colaboração premiada",
  // Execução Penal
  "execução penal", "LEP", "preso", "progressão", "regime",
  "livramento condicional", "saída temporária", "indulto", "remição",
  "monitoramento eletrônico", "tornozeleira", "sistema prisional",
  // Júri
  "júri", "plenário do júri", "quesitos", "pronúncia", "impronúncia",
  "desclassificação", "absolvição sumária",
  // VVD
  "maria da penha", "violência doméstica", "medida protetiva", "lei 11.340",
  "violência contra a mulher", "feminicídio",
  // Drogas
  "drogas", "lei 11.343", "tráfico", "uso de drogas",
  "tráfico privilegiado", "entorpecente",
  // ECA
  "ECA", "adolescente infrator", "ato infracional", "medida socioeducativa",
  "internação de menor", "sinase",
  // Defensoria
  "defensoria", "defensor público", "DPE", "DPU", "LC 80",
  "assistência jurídica", "acesso à justiça", "hipossuficiente",
  // Constitucional Penal
  "habeas corpus", "HC", "RHC", "STF", "STJ",
  "súmula", "informativo", "tese fixada", "repercussão geral",
  "recurso especial", "REsp", "recurso extraordinário",
  // Legislação
  "lei nº", "projeto de lei", "PL ", "PEC ", "sancionou", "promulgada",
  "nova redação", "alteração legislativa", "entrou em vigor",
  // Segurança Pública
  "segurança pública", "polícia", "abuso de autoridade",
  "uso da força", "letalidade policial",
  // Direitos Humanos
  "direitos humanos", "tortura", "CIDH", "corte interamericana",
  "encarceramento em massa", "seletividade penal",
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
  { nome: "Direito Penal", keywords: ["penal", "crime", "homicídio", "art. 121", "furto", "roubo", "estelionato", "código penal"] },
  { nome: "Processo Penal", keywords: ["processo penal", "CPP", "prisão preventiva", "prisão cautelar", "audiência de custódia", "interceptação", "busca e apreensão"] },
  { nome: "Execução Penal", keywords: ["execução penal", "LEP", "preso", "progressão", "regime", "livramento condicional", "saída temporária", "indulto"] },
  { nome: "Tribunal do Júri", keywords: ["júri", "plenário", "quesitos", "pronúncia", "impronúncia", "desclassificação"] },
  { nome: "Violência Doméstica", keywords: ["maria da penha", "violência doméstica", "medida protetiva", "lei 11.340", "VVD"] },
  { nome: "Drogas", keywords: ["drogas", "lei 11.343", "tráfico", "uso de drogas", "art. 28", "art. 33", "tráfico privilegiado"] },
  { nome: "ECA", keywords: ["ECA", "adolescente", "menor", "ato infracional", "medida socioeducativa", "internação"] },
  { nome: "Defensoria Pública", keywords: ["defensoria", "defensor público", "DPE", "DPU", "LC 80", "assistência jurídica"] },
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
