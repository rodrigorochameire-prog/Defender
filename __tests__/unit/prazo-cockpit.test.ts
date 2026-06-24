import { describe, it, expect } from "vitest";
import { buildPrazoCockpit, PRAZO_COCKPIT_ORDER } from "@/components/demandas-premium/prazo-cockpit";

describe("prazo-cockpit · buildPrazoCockpit", () => {
  it("monta 4 chips na ordem de severidade com rótulos/tons corretos", () => {
    const { chips } = buildPrazoCockpit({}, []);
    expect(chips.map((c) => c.key)).toEqual(PRAZO_COCKPIT_ORDER);
    expect(chips.map((c) => c.key)).toEqual(["atrasados", "hoje", "semana", "sem_prazo"]);
    expect(chips.map((c) => c.tone)).toEqual(["danger", "warn", "neutral", "muted"]);
    expect(chips.find((c) => c.key === "atrasados")!.label).toBe("Atrasados");
    expect(chips.find((c) => c.key === "hoje")!.label).toBe("Vencem hoje");
  });

  it("mapeia counts; ausentes viram 0", () => {
    const { chips } = buildPrazoCockpit({ atrasados: 3, semana: 5 }, []);
    const by = Object.fromEntries(chips.map((c) => [c.key, c.count]));
    expect(by.atrasados).toBe(3);
    expect(by.semana).toBe(5);
    expect(by.hoje).toBe(0);
    expect(by.sem_prazo).toBe(0);
  });

  it("totalEmRisco = atrasados + hoje; hasUrgencia reflete > 0", () => {
    expect(buildPrazoCockpit({ atrasados: 2, hoje: 1, semana: 9 }, []).totalEmRisco).toBe(3);
    expect(buildPrazoCockpit({ atrasados: 2 }, []).hasUrgencia).toBe(true);
    expect(buildPrazoCockpit({ semana: 9, sem_prazo: 4 }, []).hasUrgencia).toBe(false);
    expect(buildPrazoCockpit({}, []).totalEmRisco).toBe(0);
  });

  it("marca active por Set ou array", () => {
    const fromArr = buildPrazoCockpit({}, ["hoje"]);
    const fromSet = buildPrazoCockpit({}, new Set(["atrasados"]));
    expect(fromArr.chips.find((c) => c.key === "hoje")!.active).toBe(true);
    expect(fromArr.chips.find((c) => c.key === "atrasados")!.active).toBe(false);
    expect(fromSet.chips.find((c) => c.key === "atrasados")!.active).toBe(true);
  });
});
