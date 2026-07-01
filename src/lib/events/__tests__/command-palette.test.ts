// @vitest-environment happy-dom
import { describe, it, expect, vi, afterEach } from "vitest";
import {
  OPEN_COMMAND_PALETTE_EVENT,
  openCommandPalette,
  onOpenCommandPalette,
} from "@/lib/events/command-palette";

afterEach(() => vi.restoreAllMocks());

describe("command-palette events", () => {
  it("openCommandPalette dispatches the named event", () => {
    const spy = vi.fn();
    window.addEventListener(OPEN_COMMAND_PALETTE_EVENT, spy);
    openCommandPalette();
    expect(spy).toHaveBeenCalledTimes(1);
    window.removeEventListener(OPEN_COMMAND_PALETTE_EVENT, spy);
  });

  it("onOpenCommandPalette subscribes and unsubscribes", () => {
    const handler = vi.fn();
    const off = onOpenCommandPalette(handler);
    openCommandPalette();
    expect(handler).toHaveBeenCalledTimes(1);
    off();
    openCommandPalette();
    expect(handler).toHaveBeenCalledTimes(1);
  });
});
