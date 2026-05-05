/**
 * Maps classe processual (from PJe/DataJud) to tipoProcesso short code.
 */

const EXACT_MAP: Record<string, string> = {
  "Ação Penal": "AP",
  "Ação Penal - Procedimento Ordinário": "AP",
  "Ação Penal - Procedimento do Júri": "AP",
  "Ação Penal - Procedimento Sumário": "AP",
  "Ação Penal - Procedimento Sumaríssimo": "AP",
  "Inquérito Policial": "IP",
  "Auto de Prisão em Flagrante": "APF",
  "Medidas Protetivas de Urgência": "MPU",
  "Medida Protetiva de Urgência": "MPU",
  "Medida Cautelar": "CAUTELAR",
  "Medida Cautelar Inominada": "CAUTELAR",
  "Prisão Preventiva": "PPP",
  "Produção Antecipada de Provas": "PAP",
  "Liberdade Provisória": "LP",
  "Pedido de Liberdade Provisória": "LP",
  "Pedido de Revogação de Prisão Preventiva": "LP",
  "Revogação de Prisão Preventiva": "LP",
  "Pedido de Revogação de Medida Protetiva": "LP",
  "Revogação de Medida Protetiva": "LP",
  "Execução Penal": "EP",
  "Execução da Pena": "EP",
  "Execução de ANPP": "EANPP",
  "Acordo de Não Persecução Penal": "EANPP",
  "Habeas Corpus": "HC",
  "Recurso em Sentido Estrito": "RESE",
  "Apelação Criminal": "APELACAO",
  "Agravo em Execução Penal": "AGRAVO",
};

// LP (Liberdade Provisória / Pedido de Revogação) deve vir ANTES das regras
// de cautelar e prisão preventiva — são incidentes instaurados pela DEFESA
// e merecem classe própria pra triagem (não confundir com cautelar inominada
// da acusação ou produção antecipada).
const PARTIAL_MAP: [RegExp, string][] = [
  [/liberdade\s+provis/i, "LP"],
  [/revoga[çc][aã]o.*pris/i, "LP"],
  [/revoga[çc][aã]o.*(medida\s+)?protet/i, "LP"],
  [/pedido.*revoga/i, "LP"],
  [/med.*protet/i, "MPU"],
  [/inqu[eé]rito/i, "IP"],
  [/flagrante/i, "APF"],
  [/execu[çc][aã]o.*penal/i, "EP"],
  [/execu[çc][aã]o.*pena/i, "EP"],
  [/execu[çc][aã]o.*anpp/i, "EANPP"],
  [/habeas/i, "HC"],
  [/cautelar/i, "CAUTELAR"],
  [/protetiva/i, "MPU"],
  [/produ[çc][aã]o.*antecipada/i, "PAP"],
  [/pris[aã]o.*preventiva/i, "PPP"],
  [/a[çc][aã]o penal/i, "AP"],
  [/apela[çc][aã]o/i, "APELACAO"],
  [/agravo/i, "AGRAVO"],
  [/recurso.*sentido.*estrito/i, "RESE"],
];

export function classifyTipoProcesso(classeProcessual: string | null | undefined): string {
  if (!classeProcessual) return "AP";

  const trimmed = classeProcessual.trim();

  // Exact match
  if (EXACT_MAP[trimmed]) return EXACT_MAP[trimmed];

  // Partial match
  for (const [regex, tipo] of PARTIAL_MAP) {
    if (regex.test(trimmed)) return tipo;
  }

  return "AP"; // default
}

/** Labels for display */
export const TIPO_PROCESSO_LABEL: Record<string, string> = {
  AP: "Ação Penal",
  IP: "Inquérito Policial",
  APF: "Auto Prisão Flagrante",
  MPU: "Medida Protetiva",
  EP: "Execução Penal",
  EANPP: "Execução ANPP",
  PPP: "Prisão Preventiva",
  HC: "Habeas Corpus",
  CAUTELAR: "Cautelar",
  PAP: "Prod. Antecipada Provas",
  LP: "Liberdade Provisória",
  RESE: "Recurso Sent. Estrito",
  APELACAO: "Apelação",
  AGRAVO: "Agravo",
};

/** Is this tipo a reference process (AP or EP)? */
export function isReferenceTipo(tipo: string): boolean {
  return tipo === "AP" || tipo === "EP";
}
