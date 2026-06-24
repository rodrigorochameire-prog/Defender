import type { CSSProperties } from "react";

// Fundamentos visuais do módulo Demandas (Fase 1 do redesign).
// Fonte única dos padrões antes espalhados inline em DemandaCard/Table/Compact.

/** Converte hex (#rrggbb ou rrggbb) em rgba(). Base do tint dos chips semânticos. */
export function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace(/^#/, "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * Estilo do chip semântico (status/área): tint suave de fundo, texto na cor cheia,
 * borda discreta. Cor = sinal; o resto fica calmo. Substitui o bloco repetido inline.
 */
export function statusChipStyle(color: string): CSSProperties {
  return {
    backgroundColor: hexToRgba(color, 0.12),
    color,
    border: `1px solid ${hexToRgba(color, 0.3)}`,
  };
}
