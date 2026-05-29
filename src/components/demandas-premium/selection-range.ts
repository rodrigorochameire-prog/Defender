// Shift-click range selection for demanda cards.
//
// The Kanban renders cards nested by column/subgroup/section, so their on-screen
// order does NOT match the flat `demandasOrdenadas` list. Ranging over that flat
// list skips cards that sit visually between two clicks (the original bug). The
// source of truth for "what's between A and B" is the rendered DOM order, which
// every Kanban card exposes via `data-card-id`. The flat list is the fallback for
// the table/compact views, which don't tag cards and already render in that order.

/** Card ids in on-screen order: rendered `[data-card-id]` order, else `fallback`. */
export function orderedCardIds(fallback: string[]): string[] {
  if (typeof document === "undefined") return fallback;
  const dom = Array.from(document.querySelectorAll<HTMLElement>("[data-card-id]"))
    .map((el) => el.dataset.cardId)
    .filter((v): v is string => !!v);
  return dom.length > 0 ? dom : fallback;
}

/** Inclusive set of ids between `anchorId` and `targetId` within `orderedIds`.
 *  Returns [] when either id isn't present (caller falls back to a single toggle). */
export function shiftRangeIds(orderedIds: string[], anchorId: string, targetId: string): string[] {
  const a = orderedIds.indexOf(anchorId);
  const b = orderedIds.indexOf(targetId);
  if (a === -1 || b === -1) return [];
  const [from, to] = a <= b ? [a, b] : [b, a];
  return orderedIds.slice(from, to + 1);
}
