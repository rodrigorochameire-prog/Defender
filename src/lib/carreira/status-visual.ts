import type { VisualTipo } from "@/lib/config/tipologia";

// Paleta consistente com o registry de tipologia (bg-X-50 / text-X-700 / dark / dot bg-X-500).
const EMERALD: Omit<VisualTipo, "label"> = { badge: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400", dot: "bg-emerald-500" };
const SKY: Omit<VisualTipo, "label"> = { badge: "bg-sky-50 text-sky-700 dark:bg-sky-950/30 dark:text-sky-400", dot: "bg-sky-500" };
const AMBER: Omit<VisualTipo, "label"> = { badge: "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400", dot: "bg-amber-500" };
const INDIGO: Omit<VisualTipo, "label"> = { badge: "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/30 dark:text-indigo-400", dot: "bg-indigo-500" };
const NEUTRAL: Omit<VisualTipo, "label"> = { badge: "bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400", dot: "bg-neutral-400" };

const MAP: Record<string, VisualTipo> = {
  // vida_funcional_eventos
  previsto:     { label: "Previsto", ...NEUTRAL },
  em_curso:     { label: "Em curso", ...SKY },
  concluido:    { label: "Concluído", ...EMERALD },
  pendente:     { label: "Pendente", ...AMBER },
  arquivado:    { label: "Arquivado", ...NEUTRAL },
  // substituicoes (ciclo da gratificação)
  em_andamento: { label: "Em andamento", ...AMBER },
  concluida:    { label: "Concluída", ...SKY },
  oficiada:     { label: "Oficiada", ...INDIGO },
  paga:         { label: "Paga", ...EMERALD },
};

/**
 * Resolve um status de carreira (evento OU substituição) para um VisualTipo,
 * usado via `<StatusChip info={...} />`. Não depende do resolver de audiência
 * (que faz substring-match e rotularia tudo como "Designada"/"Realizada").
 */
export function carreiraStatusInfo(status?: string | null): VisualTipo {
  const key = (status ?? "").trim().toLowerCase();
  return MAP[key] ?? { label: status ?? "—", ...NEUTRAL };
}
