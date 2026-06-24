/**
 * Tipologia da Agenda — status de audiência e status de preparo.
 *
 * Fonte única de cores/rótulos para os dois estados que a Agenda exibe com mais
 * frequência: o status do ato (designada/realizada/...) e o status de preparo
 * (completo/parcial/pendente). Segue o mesmo contrato `VisualTipo` do resto do
 * registry de tipologia, para que `StatusChip` consuma qualquer domínio.
 *
 * Nota: `statusAudienciaInfo` (em `@/lib/config/design-tokens`) permanece para os
 * consumidores legados que esperam o shape `{ label, cls }`. Esta é a forma
 * canônica (`VisualTipo`, com `dot`) para a reformulação da Agenda.
 */

import type { VisualTipo } from "./caso";

const NEUTRO: VisualTipo = {
  label: "—",
  badge: "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300",
  dot: "bg-neutral-400",
};

// ── Status da audiência/ato ─────────────────────────────────────────
// Chaves canônicas. O matching tolera as variações que vêm do banco/PJe
// (concluída, remarcada, etc.) via `statusAudienciaTipo`.
export const AUDIENCIA_STATUS_CONFIG: Record<string, VisualTipo> = {
  realizada: {
    label: "Realizada",
    badge: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400",
    dot: "bg-emerald-500",
  },
  cancelada: {
    label: "Cancelada",
    badge: "bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-400",
    dot: "bg-rose-500",
  },
  redesignada: {
    label: "Redesignada",
    badge: "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400",
    dot: "bg-amber-500",
  },
  aguardando_ata: {
    label: "Aguard. ata",
    badge: "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400",
    dot: "bg-amber-500",
  },
  designada: {
    label: "Designada",
    badge: "bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400",
    dot: "bg-neutral-400",
  },
};

/**
 * Tom (VisualTipo) do status de uma audiência. Mesmo agrupamento semântico de
 * `statusAudienciaInfo`, porém no shape canônico com `dot`. Padrão: Designada.
 */
export function statusAudienciaTipo(status?: string | null): VisualTipo {
  const s = (status ?? "").toLowerCase();
  if (s.includes("conclu") || s.includes("realiz")) return AUDIENCIA_STATUS_CONFIG.realizada;
  if (s.includes("cancel")) return AUDIENCIA_STATUS_CONFIG.cancelada;
  if (s.includes("redesign") || s.includes("remarc") || s.includes("reagend") || s.includes("adiad"))
    return AUDIENCIA_STATUS_CONFIG.redesignada;
  if (s.includes("ata")) return AUDIENCIA_STATUS_CONFIG.aguardando_ata;
  return AUDIENCIA_STATUS_CONFIG.designada;
}

// ── Status de preparo do ato ────────────────────────────────────────
// Inbox de preparação: completo (pronto), parcial (iniciado, falta algo),
// pendente (não iniciado). Tons sóbrios; o rótulo carrega o significado.
export const PREPARO_STATUS_CONFIG: Record<string, VisualTipo> = {
  completo: {
    label: "Completo",
    badge: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400",
    dot: "bg-emerald-500",
  },
  parcial: {
    label: "Parcial",
    badge: "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400",
    dot: "bg-amber-500",
  },
  pendente: {
    label: "Pendente",
    badge: "bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400",
    dot: "bg-neutral-400",
  },
};

export function statusPreparoInfo(status: string | null | undefined): VisualTipo {
  if (!status) return { ...NEUTRO, label: "—" };
  return PREPARO_STATUS_CONFIG[status.toLowerCase()] ?? { ...NEUTRO, label: status };
}
