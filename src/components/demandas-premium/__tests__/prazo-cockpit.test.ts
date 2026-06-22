import { describe, it, expect } from "vitest";
import { buildPrazoCockpit, PRAZO_COCKPIT_ORDER } from "../prazo-cockpit";

describe("buildPrazoCockpit", () => {
  const counts = { atrasados: 3, hoje: 2, semana: 5, sem_prazo: 7, reu_preso: 9 };

  it("retorna os 4 chips de prazo na ordem de severidade", () => {
    const { chips } = buildPrazoCockpit(counts, []);
    expect(chips.map((c) => c.key)).toEqual(["atrasados", "hoje", "semana", "sem_prazo"]);
    expect(PRAZO_COCKPIT_ORDER).toEqual(["atrasados", "hoje", "semana", "sem_prazo"]);
  });

  it("mapeia as contagens e os tons corretos", () => {
    const { chips } = buildPrazoCockpit(counts, []);
    expect(chips.map((c) => c.count)).toEqual([3, 2, 5, 7]);
    expect(chips.map((c) => c.tone)).toEqual(["danger", "warn", "neutral", "muted"]);
  });

  it("contagem ausente vira 0", () => {
    const { chips } = buildPrazoCockpit({}, []);
    expect(chips.every((c) => c.count === 0)).toBe(true);
  });

  it("totalEmRisco = atrasados + hoje; hasUrgencia quando > 0", () => {
    const cockpit = buildPrazoCockpit(counts, []);
    expect(cockpit.totalEmRisco).toBe(5);
    expect(cockpit.hasUrgencia).toBe(true);

    const calmo = buildPrazoCockpit({ atrasados: 0, hoje: 0, semana: 4 }, []);
    expect(calmo.totalEmRisco).toBe(0);
    expect(calmo.hasUrgencia).toBe(false);
  });

  it("reflete os filtros ativos (Set)", () => {
    const { chips } = buildPrazoCockpit(counts, new Set(["hoje", "semana"]));
    expect(chips.find((c) => c.key === "hoje")!.active).toBe(true);
    expect(chips.find((c) => c.key === "semana")!.active).toBe(true);
    expect(chips.find((c) => c.key === "atrasados")!.active).toBe(false);
  });

  it("reflete os filtros ativos (array)", () => {
    const { chips } = buildPrazoCockpit(counts, ["atrasados"]);
    expect(chips.find((c) => c.key === "atrasados")!.active).toBe(true);
    expect(chips.find((c) => c.key === "hoje")!.active).toBe(false);
  });

  it("labels legíveis", () => {
    const { chips } = buildPrazoCockpit(counts, []);
    expect(chips.map((c) => c.label)).toEqual(["Atrasados", "Vencem hoje", "Esta semana", "Sem prazo"]);
  });
});
