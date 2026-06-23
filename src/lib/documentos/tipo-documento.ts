/**
 * Tipo de documento (peça processual) — resolução HÍBRIDA:
 *   1) tipo real enriquecido pela IA (drive_files.document_type), quando existir;
 *   2) fallback heurístico pelo nome/path do arquivo.
 *
 * Puro, sem React. `cor` é hex (badge inline). Cobre 100% (cai em "outro").
 */

export interface TipoDocumento {
  key: string;
  label: string;
  cor: string;
  /** Origem da classificação. */
  fonte: "ia" | "heuristica" | "desconhecido";
}

interface TipoDef {
  label: string;
  cor: string;
  /** Palavras-chave (já normalizadas: minúsculas, sem acento) para casar. */
  kws: string[];
}

// Ordem importa: tipos mais específicos antes dos genéricos.
const TAXONOMIA: Array<{ key: string } & TipoDef> = [
  { key: "denuncia", label: "Denúncia", cor: "#ef4444", kws: ["denuncia"] },
  { key: "pronuncia", label: "Pronúncia", cor: "#f59e0b", kws: ["pronuncia"] },
  { key: "sentenca", label: "Sentença", cor: "#f59e0b", kws: ["sentenca"] },
  { key: "acordao", label: "Acórdão", cor: "#f97316", kws: ["acordao"] },
  { key: "decisao", label: "Decisão", cor: "#f97316", kws: ["decisao", "interlocutoria"] },
  { key: "despacho", label: "Despacho", cor: "#60a5fa", kws: ["despacho"] },
  { key: "ata", label: "Ata de audiência", cor: "#06b6d4", kws: ["ata"] },
  { key: "audiencia", label: "Audiência", cor: "#06b6d4", kws: ["audiencia"] },
  { key: "laudo", label: "Laudo", cor: "#a855f7", kws: ["laudo"] },
  { key: "pericia", label: "Perícia", cor: "#a855f7", kws: ["pericia", "exame de corpo", "necropsia"] },
  { key: "quesitos", label: "Quesitos", cor: "#8b5cf6", kws: ["quesito"] },
  { key: "depoimento", label: "Depoimento", cor: "#3b82f6", kws: ["depoimento", "oitiva", "testemunh", "declaracao"] },
  { key: "interrogatorio", label: "Interrogatório", cor: "#3b82f6", kws: ["interrogatorio"] },
  { key: "recurso", label: "Recurso", cor: "#8b5cf6", kws: ["recurso", "apelacao", "agravo", "rese", "embargos"] },
  { key: "habeas", label: "Habeas Corpus", cor: "#f43f5e", kws: ["habeas", "hc-", "hc_"] },
  { key: "alegacoes", label: "Alegações / Memoriais", cor: "#10b981", kws: ["alegacoes", "alegacao", "memorial", "razoes"] },
  { key: "peticao", label: "Petição", cor: "#10b981", kws: ["peticao", "requerimento", "manifestacao"] },
  { key: "inquerito", label: "Inquérito / BO", cor: "#737373", kws: ["inquerito", "boletim", "ocorrencia", "ipl", "apf", "flagrante"] },
  { key: "certidao", label: "Certidão", cor: "#737373", kws: ["certidao", "intimacao", "mandado"] },
];

const OUTRO: TipoDocumento = { key: "outro", label: "Outro", cor: "#9ca3af", fonte: "desconhecido" };

/** minúsculas + remove acentos/diacríticos (faixa U+0300–U+036F). */
export function normalizar(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

function casar(texto: string): (typeof TAXONOMIA)[number] | null {
  const n = normalizar(texto);
  for (const t of TAXONOMIA) {
    if (t.kws.some((k) => n.includes(k))) return t;
  }
  return null;
}

/**
 * Resolve o tipo: prioriza o `documentType` da IA; cai na heurística do nome;
 * por fim "outro". Sempre retorna algo (cobertura 100%).
 */
export function tipoDocumento(
  documentType: string | null | undefined,
  fileName: string | null | undefined,
): TipoDocumento {
  if (documentType) {
    const t = casar(documentType);
    if (t) return { key: t.key, label: t.label, cor: t.cor, fonte: "ia" };
  }
  if (fileName) {
    const t = casar(fileName);
    if (t) return { key: t.key, label: t.label, cor: t.cor, fonte: "heuristica" };
  }
  return OUTRO;
}

export const TIPOS_DOCUMENTO_KEYS = TAXONOMIA.map((t) => t.key);
