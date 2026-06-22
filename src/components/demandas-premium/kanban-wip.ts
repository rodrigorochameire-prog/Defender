/**
 * Consciência de WIP (work-in-progress) por coluna do kanban. Lógica pura.
 * Spec: docs/specs/kanban-wip.md
 */

export interface WipLimits {
  warn: number;
  danger: number;
}

export type WipHealth = "ok" | "warn" | "danger";

/** Limites por grupo de status. Só colunas listadas têm WIP monitorado. */
export const WIP_LIMITS: Record<string, WipLimits> = {
  em_andamento: { warn: 15, danger: 25 },
};

/**
 * Saúde da coluna pelo número de itens: sem limite → ok; >= danger → danger;
 * >= warn → warn; senão ok.
 */
export function wipHealth(count: number, limit?: WipLimits | null): WipHealth {
  if (!limit) return "ok";
  if (count >= limit.danger) return "danger";
  if (count >= limit.warn) return "warn";
  return "ok";
}
