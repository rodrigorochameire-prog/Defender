/**
 * Helpers puros para "recolher/expandir tudo" das seções do sheet de demanda.
 * Spec: docs/specs/sheet-polish.md
 */

/** Novo mapa com todas as chaves definidas para `value`. */
export function setAllSections<K extends string>(
  map: Record<K, boolean>,
  value: boolean,
): Record<K, boolean> {
  const next = {} as Record<K, boolean>;
  for (const k of Object.keys(map) as K[]) next[k] = value;
  return next;
}

/** Verdadeiro só quando o mapa é não-vazio e todas as seções estão abertas. */
export function areAllOpen(map: Record<string, boolean>): boolean {
  const values = Object.values(map);
  return values.length > 0 && values.every(Boolean);
}

/** Valor a aplicar ao alternar tudo: se já está tudo aberto → recolher; senão → expandir. */
export function nextToggleAll(map: Record<string, boolean>): boolean {
  return !areAllOpen(map);
}
