export type CategoriaNoticia = "legislativa" | "jurisprudencial" | "artigo";

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
