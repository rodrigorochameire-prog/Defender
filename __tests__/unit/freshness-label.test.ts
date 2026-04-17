import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { freshnessLabel } from "@/lib/agenda/freshness-label";

describe("freshnessLabel", () => {
  const NOW = new Date("2026-04-16T12:00:00Z");

  beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(NOW); });
  afterEach(() => { vi.useRealTimers(); });

  it("null retorna null", () => {
    expect(freshnessLabel(null)).toBeNull();
    expect(freshnessLabel(undefined)).toBeNull();
  });

  it("< 1h retorna agora / emerald", () => {
    const t = new Date(NOW.getTime() - 30 * 60 * 1000);
    expect(freshnessLabel(t)).toEqual({ label: "agora", tone: "emerald" });
  });

  it("< 24h retorna hoje / emerald", () => {
    const t = new Date(NOW.getTime() - 6 * 60 * 60 * 1000);
    expect(freshnessLabel(t)).toEqual({ label: "hoje", tone: "emerald" });
  });

  it("< 7d retorna Nd atrás / neutral", () => {
    const t = new Date(NOW.getTime() - 3 * 24 * 60 * 60 * 1000);
    expect(freshnessLabel(t)).toEqual({ label: "3d atrás", tone: "neutral" });
  });

  it("entre 7d e 30d retorna Nd atrás / amber", () => {
    const t = new Date(NOW.getTime() - 15 * 24 * 60 * 60 * 1000);
    expect(freshnessLabel(t)).toEqual({ label: "15d atrás", tone: "amber" });
  });

  it(">= 30d retorna Nd · reanalisar? / rose", () => {
    const t = new Date(NOW.getTime() - 45 * 24 * 60 * 60 * 1000);
    expect(freshnessLabel(t)).toEqual({ label: "45d · reanalisar?", tone: "rose" });
  });

  it("data inválida retorna null", () => {
    expect(freshnessLabel("not-a-date")).toBeNull();
  });
});
