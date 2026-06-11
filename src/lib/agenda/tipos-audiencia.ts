// Fonte ÚNICA dos tipos de audiência. Parser, siglas, views, dropdown manual,
// Plaud e subtipo derivam deste catálogo. A ordem do array É a ordem de
// detecção (mais específico primeiro). Regex operam sobre texto ACHATADO
// (sem espaços, caixa alta) — imune à quebra mid-word da coluna "Tipo" do PJe.

export type AtribuicaoTipo = "JURI" | "VVD" | "EP" | "CRIMINAL" | "CIVEL";

export interface TipoAudiencia {
  slug: string;
  descricao: string;
  sigla: string;
  duracaoMin: number;
  atribuicoes: AtribuicaoTipo[];
  cor?: string;
  detectar: RegExp[];
  classeCodigos?: string[];
  aliases?: string[];
}

export const TIPOS_AUDIENCIA: TipoAudiencia[] = [
  {
    slug: "plenario_juri",
    descricao: "Sessão de Julgamento do Tribunal do Júri",
    sigla: "Júri",
    duracaoMin: 480,
    atribuicoes: ["JURI"],
    cor: "violet",
    detectar: [/SESS[ÃA]ODEJULGAMENTO/, /PLEN[ÁA]RIO/, /TRIBUNALDOJ[UÚ]RI.*JULGAMENTO/],
  },
  {
    slug: "anpp",
    descricao: "Acordo de Não Persecução Penal",
    sigla: "ANPP",
    duracaoMin: 30,
    atribuicoes: ["CRIMINAL"],
    detectar: [/ANPP/, /N[ÃA]OPERSECU[CÇ][ÃA]O/, /ACORDO.*PENAL/],
  },
  {
    slug: "admonitoria",
    descricao: "Audiência Admonitória",
    sigla: "Admonitória",
    duracaoMin: 15,
    atribuicoes: ["EP"],
    detectar: [/ADMONIT[OÓ]RIA/],
  },
  {
    slug: "instrucao_oitiva",
    descricao: "Instrução + Depoimento Especial",
    sigla: "Instrução + Dep. Especial",
    duracaoMin: 90,
    atribuicoes: ["VVD"],
    cor: "emerald",
    detectar: [
      /INSTRU[CÇ][ÃA]O.*(DEPOIMENTO|OITIVA)ESPECIAL/,
      /(DEPOIMENTO|OITIVA)ESPECIAL.*INSTRU[CÇ][ÃA]O/,
    ],
  },
  {
    slug: "oitiva_especial",
    descricao: "Depoimento Especial",
    sigla: "Dep. Especial",
    duracaoMin: 30,
    atribuicoes: ["VVD", "CRIMINAL"],
    cor: "rose",
    detectar: [/OITIVAESPECIAL/, /DEPOIMENTOESPECIAL/, /DEPOIMENTOSEMDANO/],
    classeCodigos: ["11955"],
    aliases: ["Oitiva Especial", "Oitiva Especializada", "OITIVA_ESPECIALIZADA"],
  },
  {
    slug: "pap",
    descricao: "Produção Antecipada de Provas",
    sigla: "PAP",
    duracaoMin: 30,
    atribuicoes: ["JURI", "CRIMINAL"],
    detectar: [/PRODU[CÇ][ÃA]OANTECIPADA/, /\bPAP\b/, /ANTECIPADADEPROVAS/, /COLETA.*PROVAS/],
  },
  {
    slug: "retratacao",
    descricao: "Audiência de Retratação",
    sigla: "Retratação",
    duracaoMin: 30,
    atribuicoes: ["VVD"],
    detectar: [/RETRATA[CÇ][ÃA]O/],
  },
  {
    slug: "justificacao",
    descricao: "Justificação",
    sigla: "Justificação",
    duracaoMin: 30,
    atribuicoes: ["VVD", "EP", "CRIMINAL"],
    cor: "amber",
    detectar: [/JUSTIFICA[CÇ][ÃA]O/],
    classeCodigos: ["1268", "280"],
    aliases: ["Audiência de Justificação", "JUSTIFICAÇÃO"],
  },
  {
    slug: "custodia",
    descricao: "Audiência de Custódia",
    sigla: "Custódia",
    duracaoMin: 30,
    atribuicoes: ["JURI", "VVD", "EP", "CRIMINAL"],
    cor: "sky",
    detectar: [/CUST[OÓ]DIA/],
  },
  {
    slug: "sumariante",
    descricao: "Audiência de Instrução Sumariante",
    sigla: "Sumariante",
    duracaoMin: 90,
    atribuicoes: ["JURI"],
    cor: "violet",
    detectar: [/SUMARIANTE/],
    aliases: ["Instrução Sumariante", "Sumariante"],
  },
  {
    slug: "preliminar",
    descricao: "Audiência Preliminar",
    sigla: "Preliminar",
    duracaoMin: 30,
    atribuicoes: ["VVD", "CRIMINAL"],
    detectar: [/AUDI[EÊ]NCIAPRELIMINAR/],
    aliases: ["Preliminar"],
  },
  {
    slug: "aij",
    descricao: "Audiência de Instrução e Julgamento",
    sigla: "AIJ",
    duracaoMin: 90,
    atribuicoes: ["JURI", "VVD", "CRIMINAL"],
    cor: "emerald",
    detectar: [/INSTRU[CÇ][ÃA]O/, /\bAIJ\b/],
    classeCodigos: ["283", "10943"],
    aliases: ["Instrução e Julgamento", "Instrução", "INSTRUCAO", "AIJ", "Continuação de Instrução / Acareação"],
  },
  {
    slug: "conciliacao",
    descricao: "Audiência de Conciliação",
    sigla: "Conciliação",
    duracaoMin: 30,
    atribuicoes: ["CIVEL"],
    detectar: [/CONCILIA[CÇ][ÃA]O/],
  },
  {
    slug: "indefinido",
    descricao: "Audiência",
    sigla: "Audiência",
    duracaoMin: 30,
    atribuicoes: [],
    detectar: [],
    aliases: ["audiencia", "Audiência"],
  },
];

const INDEFINIDO = TIPOS_AUDIENCIA[TIPOS_AUDIENCIA.length - 1];

export const SIGLAS_LEGADAS: Record<string, string> = {
  "Audiência de Execução": "Execução",
  "Audiência de Progressão": "Progressão",
  "Audiência de Livramento": "Livramento",
  "Audiência de Unificação": "Unificação",
  "Audiência Concentrada": "Concentrada",
  "Audiência de Apresentação": "Apresentação",
  "Audiência de Medidas Protetivas": "Med. Protetivas",
  "Medidas Protetivas": "Med. Protetivas",
  Atendimento: "Atendimento",
  Reunião: "Reunião",
  Diligência: "Diligência",
};

/** Achata o texto: remove TODO whitespace e sobe pra caixa alta. */
export function flatten(texto: string): string {
  return texto.replace(/\s+/g, "").toUpperCase();
}

/** Detecta o slug do tipo a partir de um bloco de texto cru. 'indefinido' se nada casar. */
export function detectarSlug(textoBloco: string): string {
  const flat = flatten(textoBloco);
  for (const t of TIPOS_AUDIENCIA) {
    if (t.detectar.some((re) => re.test(flat))) return t.slug;
  }
  const cod = flat.match(/\((\d{2,5})\)/)?.[1] ?? "";
  if (cod) {
    const porCodigo = TIPOS_AUDIENCIA.find((t) => t.classeCodigos?.includes(cod));
    if (porCodigo) return porCodigo.slug;
  }
  return "indefinido";
}

/** Entrada do catálogo por slug (cai em indefinido). */
export function tipoPorSlug(slug: string): TipoAudiencia {
  return TIPOS_AUDIENCIA.find((t) => t.slug === slug) ?? INDEFINIDO;
}

/**
 * Resolve um valor BRUTO (texto livre do banco/pauta) para a entrada canônica.
 * Ordem: descrição/alias exatos (case-insensitive) → detecção por padrão.
 */
export function resolverTipo(valorBruto: string | null | undefined): TipoAudiencia {
  if (!valorBruto || !valorBruto.trim()) return INDEFINIDO;
  const low = valorBruto.trim().toLowerCase();
  for (const t of TIPOS_AUDIENCIA) {
    if (t.descricao.toLowerCase() === low) return t;
    if (t.aliases?.some((a) => a.toLowerCase() === low)) return t;
  }
  return tipoPorSlug(detectarSlug(valorBruto));
}

/** Mapa descrição/alias → sigla (consumido por extrair-tipo). Inclui siglas legadas. */
export function buildTipoAbreviacoes(): Record<string, string> {
  const m: Record<string, string> = { ...SIGLAS_LEGADAS };
  for (const t of TIPOS_AUDIENCIA) {
    m[t.descricao] = t.sigla;
    for (const a of t.aliases ?? []) m[a] = t.sigla;
  }
  return m;
}
