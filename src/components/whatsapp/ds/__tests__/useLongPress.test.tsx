// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useLongPress } from "../useLongPress";

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

function ptr(over: Partial<React.PointerEvent> = {}): React.PointerEvent {
  return { pointerType: "touch", clientX: 0, clientY: 0, ...over } as React.PointerEvent;
}

describe("useLongPress", () => {
  it("dispara o callback após o delay com toque sustentado", () => {
    const cb = vi.fn();
    const { result } = renderHook(() => useLongPress(cb, { delayMs: 400 }));
    result.current.onPointerDown(ptr());
    expect(cb).not.toHaveBeenCalled();
    vi.advanceTimersByTime(400);
    expect(cb).toHaveBeenCalledTimes(1);
  });

  it("ignora mouse/pen (desktop usa o hover toolbar)", () => {
    const cb = vi.fn();
    const { result } = renderHook(() => useLongPress(cb, { delayMs: 400 }));
    result.current.onPointerDown(ptr({ pointerType: "mouse" }));
    vi.advanceTimersByTime(1000);
    expect(cb).not.toHaveBeenCalled();
  });

  it("cancela se o dedo se mover além da tolerância (scroll)", () => {
    const cb = vi.fn();
    const { result } = renderHook(() => useLongPress(cb, { delayMs: 400, moveTolerancePx: 10 }));
    result.current.onPointerDown(ptr());
    result.current.onPointerMove(ptr({ clientX: 50 }));
    vi.advanceTimersByTime(400);
    expect(cb).not.toHaveBeenCalled();
  });

  it("cancela se o toque terminar antes do delay", () => {
    const cb = vi.fn();
    const { result } = renderHook(() => useLongPress(cb, { delayMs: 400 }));
    result.current.onPointerDown(ptr());
    result.current.onPointerUp();
    vi.advanceTimersByTime(400);
    expect(cb).not.toHaveBeenCalled();
  });
});
