/**
 * Cockpit de prazos — apresentação pura dos chips de prazo sempre visíveis no topo
 * de Demandas. Reaproveita as contagens (`pillCounts`) e os filtros (`pillFilters`)
 * já existentes; aqui só ordenamos por severidade e derivamos o "total em risco".
 *
 * Spec: docs/specs/cockpit-prazos.md
 */

export type PrazoKey = "atrasados" | "hoje" | "semana" | "sem_prazo";

export type PrazoTone = "danger" | "warn" | "neutral" | "muted";

export interface PrazoChip {
  key: PrazoKey;
  label: string;
  count: number;
  tone: PrazoTone;
  active: boolean;
}

export interface PrazoCockpit {
  chips: PrazoChip[];
  /** Atrasados + vencem hoje — o que exige ação imediata. */
  totalEmRisco: number;
  hasUrgencia: boolean;
}

/** Ordem fixa por severidade (mais grave primeiro). */
export const PRAZO_COCKPIT_ORDER: PrazoKey[] = ["atrasados", "hoje", "semana", "sem_prazo"];

const META: Record<PrazoKey, { label: string; tone: PrazoTone }> = {
  atrasados: { label: "Atrasados", tone: "danger" },
  hoje: { label: "Vencem hoje", tone: "warn" },
  semana: { label: "Esta semana", tone: "neutral" },
  sem_prazo: { label: "Sem prazo", tone: "muted" },
};

export function buildPrazoCockpit(
  counts: Partial<Record<string, number>>,
  active: Set<string> | string[],
): PrazoCockpit {
  const activeSet = active instanceof Set ? active : new Set(active);
  const chips: PrazoChip[] = PRAZO_COCKPIT_ORDER.map((key) => ({
    key,
    label: META[key].label,
    tone: META[key].tone,
    count: counts[key] ?? 0,
    active: activeSet.has(key),
  }));
  const totalEmRisco = (counts.atrasados ?? 0) + (counts.hoje ?? 0);
  return { chips, totalEmRisco, hasUrgencia: totalEmRisco > 0 };
}
