"use client";

import { useRef, useState, useCallback } from "react";
import {
  type Point,
  type NormPoint,
  normalizePoint,
  simplify,
  toSvgPath,
} from "./ink-geometry";

interface InkCanvasProps {
  /** Cor do traço (hex). */
  colorHex: string;
  /** Espessura do traço em px (default 2.5). */
  strokeWidth?: number;
  /** Chamado ao soltar: traço único, normalizado [0..1] relativo à página. */
  onStrokeComplete: (stroke: NormPoint[], strokeWidth: number) => void;
}

/**
 * Overlay de captura de caneta livre sobre a página do PDF. Coleta pontos via
 * pointer events e, ao soltar, simplifica + normaliza e entrega o traço ao pai.
 * Componente isolado — a geometria pura vive em ink-geometry.ts (testada).
 *
 * Spec: docs/specs/leitor-ink.md
 */
export function InkCanvas({ colorHex, strokeWidth = 2.5, onStrokeComplete }: InkCanvasProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [points, setPoints] = useState<Point[]>([]);
  const drawing = useRef(false);

  const localPoint = useCallback((e: React.PointerEvent): Point => {
    const rect = ref.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }, []);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    (e.target as Element).setPointerCapture?.(e.pointerId);
    drawing.current = true;
    setPoints([localPoint(e)]);
  }, [localPoint]);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!drawing.current) return;
    setPoints((prev) => [...prev, localPoint(e)]);
  }, [localPoint]);

  const finish = useCallback(() => {
    if (!drawing.current) return;
    drawing.current = false;
    setPoints((prev) => {
      const rect = ref.current?.getBoundingClientRect();
      if (rect && rect.width > 0 && rect.height > 0 && prev.length >= 2) {
        const simplified = simplify(prev, 1.2);
        const stroke: NormPoint[] = simplified.map((p) => normalizePoint(p, rect.width, rect.height));
        onStrokeComplete(stroke, strokeWidth);
      }
      return [];
    });
  }, [onStrokeComplete, strokeWidth]);

  return (
    <div
      ref={ref}
      className="absolute inset-0 z-20 cursor-crosshair touch-none"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={finish}
      onPointerCancel={finish}
      onPointerLeave={finish}
    >
      {points.length > 0 && (
        <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ overflow: "visible" }}>
          <path
            d={toSvgPath(points)}
            fill="none"
            stroke={colorHex}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </div>
  );
}
