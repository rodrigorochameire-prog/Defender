/**
 * Tipologia unificada do feed do assistido (registros + eventos de demanda +
 * audiências). Puro, sem React — config de família/rótulo/cor/ícone por tipo.
 * Ícones são NOMES (string) que a UI resolve para Lucide.
 */

export type Familia = "contato" | "producao" | "investigacao" | "gestao" | "nota" | "audiencia";

export type Origem = "registro" | "demanda-evento" | "audiencia";

const FAMILIA_REGISTRO: Record<string, Familia> = {
  atendimento: "contato",
  ciencia: "contato",
  peticao: "producao",
  elaboracao: "producao",
  providencia: "producao",
  diligencia: "producao",
  pesquisa: "investigacao",
  busca: "investigacao",
  investigacao: "investigacao",
  delegacao: "gestao",
  transferencia: "gestao",
  anotacao: "nota",
};

const FAMILIA_DEMANDA_EVENTO: Record<string, Familia> = {
  atendimento: "contato",
  diligencia: "producao",
  observacao: "nota",
};

export function familiaDeTipo(origem: Origem, tipo: string): Familia {
  if (origem === "audiencia") return "audiencia";
  if (origem === "demanda-evento") return FAMILIA_DEMANDA_EVENTO[tipo] ?? "nota";
  return FAMILIA_REGISTRO[tipo] ?? "nota";
}

export const FAMILIA_CONFIG: Record<Familia, { label: string; cor: string; icone: string }> = {
  contato: { label: "Contato", cor: "#10b981", icone: "Users" }, // emerald
  producao: { label: "Produção", cor: "#3b82f6", icone: "PenLine" }, // blue
  investigacao: { label: "Investigação", cor: "#6366f1", icone: "Search" }, // indigo
  gestao: { label: "Gestão", cor: "#a855f7", icone: "ArrowRightLeft" }, // purple
  nota: { label: "Nota", cor: "#71717a", icone: "StickyNote" }, // zinc
  audiencia: { label: "Audiência", cor: "#06b6d4", icone: "Gavel" }, // cyan
};

/** Rótulo + ícone específico por tipo (sobrepõe a família onde faz sentido). */
export const TIPO_CONFIG: Record<string, { label: string; icone: string }> = {
  atendimento: { label: "Atendimento", icone: "Users" },
  ciencia: { label: "Ciência", icone: "Eye" },
  peticao: { label: "Petição", icone: "FileSignature" },
  elaboracao: { label: "Elaboração", icone: "PenLine" },
  providencia: { label: "Providência", icone: "CheckSquare" },
  diligencia: { label: "Diligência", icone: "MapPin" },
  pesquisa: { label: "Pesquisa", icone: "BookOpen" },
  busca: { label: "Busca", icone: "Search" },
  investigacao: { label: "Investigação", icone: "Microscope" },
  delegacao: { label: "Delegação", icone: "Send" },
  transferencia: { label: "Transferência", icone: "ArrowRightLeft" },
  anotacao: { label: "Anotação", icone: "StickyNote" },
  observacao: { label: "Observação", icone: "MessageSquare" },
  audiencia: { label: "Audiência", icone: "Gavel" },
};

export function rotuloDoTipo(origem: Origem, tipo: string): string {
  if (origem === "audiencia") return "Audiência";
  return TIPO_CONFIG[tipo]?.label ?? tipo;
}

export function iconeDoTipo(origem: Origem, tipo: string): string {
  if (origem === "audiencia") return "Gavel";
  return TIPO_CONFIG[tipo]?.icone ?? FAMILIA_CONFIG[familiaDeTipo(origem, tipo)].icone;
}

export const FAMILIAS_ORDEM: Familia[] = ["contato", "audiencia", "producao", "investigacao", "gestao", "nota"];
