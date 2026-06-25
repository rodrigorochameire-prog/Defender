import { describe, it, expect } from "vitest";
import { summarizePrazos } from "../alert-summary";

describe("summarizePrazos", () => {
  it("has no urgency when nothing is overdue or due today", () => {
    const m = summarizePrazos({ vencidos: 0, vencendoHoje: 0, proximosDias: 5 });
    expect(m.hasUrgent).toBe(false);
    expect(m.count).toBe(0);
    expect(m.tone).toBe("muted");
    expect(m.label).toBe("");
  });

  it("counts overdue + due-today as the actionable count", () => {
    const m = summarizePrazos({ vencidos: 3, vencendoHoje: 2 });
    expect(m.hasUrgent).toBe(true);
    expect(m.count).toBe(5);
    expect(m.label).toBe("3 vencidos · 2 hoje");
  });

  it("uses singular for a single overdue", () => {
    expect(summarizePrazos({ vencidos: 1 }).label).toBe("1 vencido");
  });

  it("is danger when there are overdue deadlines", () => {
    expect(summarizePrazos({ vencidos: 1, vencendoHoje: 0 }).tone).toBe("danger");
  });

  it("is warning when only due today (none overdue)", () => {
    const m = summarizePrazos({ vencidos: 0, vencendoHoje: 4 });
    expect(m.tone).toBe("warning");
    expect(m.label).toBe("4 hoje");
  });

  it("is danger when a jailed defendant has an overdue deadline, even if vencidos count is via that", () => {
    const m = summarizePrazos({ vencidos: 0, vencendoHoje: 0, reuPresoVencido: 1 });
    expect(m.tone).toBe("danger");
    expect(m.reuPresoVencido).toBe(1);
  });

  it("tolerates null/undefined stats", () => {
    expect(summarizePrazos(null).hasUrgent).toBe(false);
    expect(summarizePrazos(undefined).count).toBe(0);
    expect(summarizePrazos({ vencidos: null, vencendoHoje: null }).hasUrgent).toBe(false);
  });
});
