import { useCallback, useRef } from "react";

/**
 * Touch long-press detector for the message bubble.
 *
 * Fires `callback` after `delayMs` of a sustained touch press. Cancels if the
 * finger moves past `moveTolerancePx` (a scroll) or lifts early. Mouse/pen are
 * intentionally ignored — desktop keeps the hover action toolbar; only touch
 * (where hover doesn't exist) opens the action sheet.
 */

export interface LongPressOptions {
  delayMs?: number;
  moveTolerancePx?: number;
}

export interface LongPressHandlers {
  onPointerDown: (e: React.PointerEvent) => void;
  onPointerMove: (e: React.PointerEvent) => void;
  onPointerUp: () => void;
  onPointerLeave: () => void;
  onPointerCancel: () => void;
}

export function useLongPress(
  callback: () => void,
  { delayMs = 450, moveTolerancePx = 10 }: LongPressOptions = {},
): LongPressHandlers {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const origin = useRef<{ x: number; y: number } | null>(null);

  const clear = useCallback(() => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    origin.current = null;
  }, []);

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (e.pointerType !== "touch") return; // touch-only
      origin.current = { x: e.clientX, y: e.clientY };
      timer.current = setTimeout(() => {
        callback();
        clear();
      }, delayMs);
    },
    [callback, delayMs, clear],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!origin.current) return;
      const dx = Math.abs(e.clientX - origin.current.x);
      const dy = Math.abs(e.clientY - origin.current.y);
      if (dx > moveTolerancePx || dy > moveTolerancePx) clear();
    },
    [moveTolerancePx, clear],
  );

  return {
    onPointerDown,
    onPointerMove,
    onPointerUp: clear,
    onPointerLeave: clear,
    onPointerCancel: clear,
  };
}
