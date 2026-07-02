"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Esconde um elemento flutuante ao rolar para baixo e revela ao rolar para cima
 * (ou perto do topo). Usa listener em capture-phase no document para captar o
 * scroll de qualquer container — inclusive o `flex-1 overflow-y-auto` do layout,
 * já que eventos de scroll não borbulham.
 *
 * A decisão é tomada sobre a posição ESTABILIZADA (debounce), não por evento:
 * um único gesto dispara vários eventos não-monotônicos (ex.: 700 → 605 por
 * inércia/settle) e a direção por evento oscilaria. A cada rajada escolhemos o
 * container que mais se moveu, ignorando ruído de containers parados.
 *
 * @param threshold distância do topo abaixo da qual pode esconder (px)
 * @param delta     movimento mínimo estabilizado para considerar direção (px)
 * @param settleMs  janela de debounce para a posição estabilizar (ms)
 */
export function useHideOnScroll(threshold = 80, delta = 8, settleMs = 90): boolean {
  const [hidden, setHidden] = useState(false);
  const settled = useRef<WeakMap<object, number>>(new WeakMap());
  const pending = useRef<Map<HTMLElement, number>>(new Map());
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    function flush() {
      let best: { y: number; diff: number } | null = null;
      let bestAbs = 0;
      for (const [el, y] of pending.current) {
        const prev = settled.current.get(el) ?? 0;
        const diff = y - prev;
        settled.current.set(el, y);
        if (Math.abs(diff) > bestAbs) {
          bestAbs = Math.abs(diff);
          best = { y, diff };
        }
      }
      pending.current.clear();

      if (!best || bestAbs < delta) return;
      if (best.y <= threshold) setHidden(false);
      else if (best.diff > 0) setHidden(true); // descendo
      else setHidden(false); // subindo
    }

    function onScroll(e: Event) {
      const el =
        e.target instanceof HTMLElement ? e.target : document.documentElement;
      pending.current.set(el, el.scrollTop);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(flush, settleMs);
    }

    // capture: true → captura scroll de elementos internos (não borbulha)
    document.addEventListener("scroll", onScroll, true);
    return () => {
      document.removeEventListener("scroll", onScroll, true);
      if (timer.current) clearTimeout(timer.current);
    };
  }, [threshold, delta, settleMs]);

  return hidden;
}
