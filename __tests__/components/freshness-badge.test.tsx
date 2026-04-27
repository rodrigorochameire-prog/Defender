// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { FreshnessBadge } from "@/components/agenda/sheet/freshness-badge";

afterEach(() => cleanup());

describe("FreshnessBadge", () => {
  const NOW = new Date("2026-04-16T12:00:00Z");

  beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(NOW); });
  afterEach(() => { vi.useRealTimers(); });

  it("retorna null quando analyzedAt vazio", () => {
    const { container } = render(<FreshnessBadge analyzedAt={null} />);
    expect(container.firstChild).toBeNull();
  });

  it("renderiza hoje com classe emerald", () => {
    const recent = new Date(NOW.getTime() - 60 * 60 * 1000);
    const { container } = render(<FreshnessBadge analyzedAt={recent.toISOString()} />);
    expect(screen.getByText("hoje")).toBeInTheDocument();
    expect(container.firstElementChild?.className ?? "").toMatch(/emerald/);
  });

  it("renderiza Nd atrás neutral (2d)", () => {
    const old = new Date(NOW.getTime() - 2 * 24 * 60 * 60 * 1000);
    render(<FreshnessBadge analyzedAt={old} />);
    expect(screen.getByText(/2d atrás/i)).toBeInTheDocument();
  });

  it("renderiza reanalisar em rose quando > 30d", () => {
    const stale = new Date(NOW.getTime() - 60 * 24 * 60 * 60 * 1000);
    const { container } = render(<FreshnessBadge analyzedAt={stale} />);
    expect(screen.getByText(/reanalisar/i)).toBeInTheDocument();
    expect(container.firstElementChild?.className ?? "").toMatch(/rose/);
  });
});
