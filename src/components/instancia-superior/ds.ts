// ─── Design system local — Módulo Instância Superior ──────────────────────
// Tokens, configs e rótulos do domínio recursal. Mantido local (enums
// específicos do módulo, como agenda/ds) em vez do tipologia central.

export const ACCENT = "#7c8aa0"; // tom institucional (azul-acinzentado de tribunal)

export const TIPO_LABELS: Record<string, string> = {
  APELACAO: "Apelação",
  RESE: "RESE",
  AGRAVO_EXECUCAO: "Agravo em Execução",
  AGRAVO_INSTRUMENTO: "Agravo de Instrumento",
  EMBARGOS_INFRINGENTES: "Embargos Infringentes",
  EMBARGOS_DECLARACAO: "Embargos de Declaração",
  HABEAS_CORPUS: "Habeas Corpus",
  REVISAO_CRIMINAL: "Revisão Criminal",
};

export const TIPO_SHORT: Record<string, string> = {
  APELACAO: "APL",
  RESE: "RESE",
  AGRAVO_EXECUCAO: "AGR",
  AGRAVO_INSTRUMENTO: "AGI",
  EMBARGOS_INFRINGENTES: "EI",
  EMBARGOS_DECLARACAO: "ED",
  HABEAS_CORPUS: "HC",
  REVISAO_CRIMINAL: "RC",
};

export const STATUS_ORDER = [
  "INTERPOSTO", "DISTRIBUIDO", "CONCLUSO", "PAUTADO", "JULGADO", "TRANSITADO",
] as const;

export type RecursoStatus = (typeof STATUS_ORDER)[number];

export const STATUS_CONFIG: Record<string, { label: string; dot: string }> = {
  INTERPOSTO: { label: "Interposto", dot: "bg-blue-500" },
  DISTRIBUIDO: { label: "Distribuído", dot: "bg-amber-500" },
  CONCLUSO: { label: "Concluso", dot: "bg-purple-500" },
  PAUTADO: { label: "Pautado", dot: "bg-orange-500" },
  JULGADO: { label: "Julgado", dot: "bg-emerald-500" },
  TRANSITADO: { label: "Transitado", dot: "bg-neutral-400" },
};

export const RESULTADO_CONFIG: Record<string, { label: string; color: string }> = {
  PENDENTE: { label: "Pendente", color: "text-neutral-400" },
  PROVIDO: { label: "Provido", color: "text-emerald-500" },
  PARCIALMENTE_PROVIDO: { label: "Parc. Provido", color: "text-amber-500" },
  NAO_PROVIDO: { label: "Não Provido", color: "text-red-500" },
  NAO_CONHECIDO: { label: "Não Conhecido", color: "text-neutral-400" },
  PREJUDICADO: { label: "Prejudicado", color: "text-neutral-400" },
  CONCEDIDO: { label: "Concedido", color: "text-emerald-500" },
  PARCIALMENTE_CONCEDIDO: { label: "Parc. Concedido", color: "text-amber-500" },
  DENEGADO: { label: "Denegado", color: "text-red-500" },
};

export const TRIBUNAIS = [
  { key: "TJBA", label: "TJBA", full: "Tribunal de Justiça da Bahia" },
  { key: "STJ", label: "STJ", full: "Superior Tribunal de Justiça" },
  { key: "STF", label: "STF", full: "Supremo Tribunal Federal" },
] as const;

export const CAMARAS = ["1ª Câmara Criminal", "2ª Câmara Criminal", "Seção Criminal"];

export const DIMENSOES = [
  { key: "comarca", label: "Comarca" },
  { key: "unidade", label: "Unidade" },
  { key: "especialidade", label: "Especialidade" },
  { key: "area", label: "Área" },
  { key: "localizacao", label: "Localização" },
] as const;

export type Dimensao = (typeof DIMENSOES)[number]["key"];
