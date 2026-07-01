/**
 * Overflow por prioridade do header — lógica pura (testável sem DOM).
 * Determinístico: derruba a menor prioridade primeiro (empate: o item mais
 * à direita cai primeiro) até o conjunto caber. Quando algo cai, o espaço
 * do botão "…" (overflowReserve) é descontado do disponível.
 */

export interface OverflowItem {
  id: string;
  /** Maior prioridade sobrevive mais tempo. Infinity nunca colapsa. */
  priority: number;
  /** Largura medida em px (já incluindo o gap). */
  width: number;
}

export interface OverflowResult {
  visibleIds: string[];
  overflowIds: string[];
}

export function computeVisibleActions(
  items: OverflowItem[],
  available: number,
  overflowReserve: number,
): OverflowResult {
  const totalAll = items.reduce((sum, i) => sum + i.width, 0);
  if (totalAll <= available) {
    return { visibleIds: items.map((i) => i.id), overflowIds: [] };
  }

  const budget = Math.max(0, available - overflowReserve);
  const dropOrder = items
    .map((it, index) => ({ it, index }))
    .sort((a, b) =>
      a.it.priority !== b.it.priority
        ? a.it.priority - b.it.priority
        : b.index - a.index,
    );

  const dropped = new Set<string>();
  const droppedInOrder: string[] = [];
  let total = totalAll;
  for (const { it } of dropOrder) {
    if (total <= budget) break;
    if (!Number.isFinite(it.priority)) continue;
    dropped.add(it.id);
    droppedInOrder.push(it.id);
    total -= it.width;
  }

  return {
    visibleIds: items.filter((i) => !dropped.has(i.id)).map((i) => i.id),
    overflowIds: droppedInOrder,
  };
}
