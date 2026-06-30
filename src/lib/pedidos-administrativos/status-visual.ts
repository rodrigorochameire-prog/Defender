import type { VisualTipo } from "@/lib/config/tipologia";
const NEUTRAL = { badge: "bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400", dot: "bg-neutral-400" };
const SKY = { badge: "bg-sky-50 text-sky-700 dark:bg-sky-950/30 dark:text-sky-400", dot: "bg-sky-500" };
const EMERALD = { badge: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400", dot: "bg-emerald-500" };
const ROSE = { badge: "bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-400", dot: "bg-rose-500" };

const MAP: Record<string, VisualTipo> = {
  solicitado: { label: "Solicitado", ...NEUTRAL },
  em_analise: { label: "Em análise", ...SKY },
  deferido: { label: "Deferido", ...EMERALD },
  indeferido: { label: "Indeferido", ...ROSE },
  cancelado: { label: "Cancelado", ...NEUTRAL },
};

export function pedidoStatusInfo(estado?: string | null): VisualTipo {
  const k = (estado ?? "").trim().toLowerCase();
  return MAP[k] ?? { label: estado ?? "—", ...NEUTRAL };
}
