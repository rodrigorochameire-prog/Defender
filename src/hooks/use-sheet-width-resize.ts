"use client";

// Resize horizontal de sheets laterais — alça de arraste na borda esquerda,
// largura persistida em localStorage, duplo-clique reseta. Extraído do padrão
// do sheet da Agenda (event-detail-sheet) para reuso; a Agenda ainda usa sua
// cópia inline — quando unificarmos, basta apontá-la para este hook.

import { useCallback, useEffect, useState } from "react";

interface UseSheetWidthResizeOptions {
  /** Chave do localStorage onde a largura é persistida. */
  storageKey: string;
  /** Largura mínima (px). Default 420. */
  min?: number;
  /** Folga mínima à esquerda do sheet (px) — limita a largura máxima. Default 360. */
  leftGutter?: number;
  /** Fração da tela usada como default/reset quando não há valor salvo. Default 0.45. */
  defaultRatio?: number;
}

export interface SheetWidthResize {
  /** Largura atual do sheet (px). */
  sheetW: number;
  /** True enquanto a alça está sendo arrastada. */
  dragging: boolean;
  /** Handler de pointerDown para a alça de arraste. */
  startDrag: (e: React.PointerEvent) => void;
  /** Reseta para a largura padrão (defaultRatio da tela). */
  reset: () => void;
  /** Largura atual como % da viewport (para o badge de feedback). */
  pct: number;
  /**
   * True quando a viewport está abaixo do breakpoint `sm` (640px). Nessa faixa
   * o sheet ocupa a tela inteira (full-screen) e a largura ajustável (`sheetW`)
   * não deve ser aplicada — a alça de resize e o modal de autos ficam ocultos.
   */
  isMobile: boolean;
}

export function useSheetWidthResize({
  storageKey,
  min = 420,
  leftGutter = 360,
  defaultRatio = 0.45,
}: UseSheetWidthResizeOptions): SheetWidthResize {
  const [sheetW, setSheetW] = useState(760);
  const [dragging, setDragging] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Detecta viewport mobile (< sm = 640px), mesmo breakpoint que oculta a alça
  // de resize e o modal de autos. Nessa faixa o sheet é full-screen.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mql = window.matchMedia("(max-width: 639px)");
    const onChange = () => setIsMobile(mql.matches);
    onChange();
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  // Carrega a largura preferida (ou ~defaultRatio da tela) depois de montar.
  // No mobile o sheet é full-screen — não há largura ajustável a calcular
  // (e o clamp por leftGutter geraria uma largura minúscula numa tela estreita).
  useEffect(() => {
    if (isMobile) return;
    try {
      const v = Number(localStorage.getItem(storageKey));
      if (Number.isFinite(v) && v >= min) {
        setSheetW(v);
        return;
      }
    } catch {
      /* ignore */
    }
    if (typeof window !== "undefined") {
      setSheetW(
        Math.min(
          Math.max(Math.round(window.innerWidth * defaultRatio), min),
          window.innerWidth - leftGutter
        )
      );
    }
  }, [storageKey, min, leftGutter, defaultRatio, isMobile]);

  const persist = useCallback(
    (w: number) => {
      try {
        localStorage.setItem(storageKey, String(Math.round(w)));
      } catch {
        /* ignore */
      }
    },
    [storageKey]
  );

  const startDrag = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragging(true);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
      let last = sheetW;
      const onMove = (ev: PointerEvent) => {
        last = Math.min(
          Math.max(window.innerWidth - ev.clientX, min),
          window.innerWidth - leftGutter
        );
        setSheetW(last);
      };
      const onUp = () => {
        setDragging(false);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        persist(last);
      };
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
    },
    [sheetW, min, leftGutter, persist]
  );

  const reset = useCallback(() => {
    const w =
      typeof window !== "undefined"
        ? Math.round(window.innerWidth * defaultRatio)
        : 700;
    setSheetW(w);
    persist(w);
  }, [defaultRatio, persist]);

  const pct =
    typeof window !== "undefined" && window.innerWidth
      ? Math.round((sheetW / window.innerWidth) * 100)
      : 0;

  return { sheetW, dragging, startDrag, reset, pct, isMobile };
}
