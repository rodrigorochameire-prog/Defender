import { describe, it, expect } from "vitest";
import { defensoresPlantaoNoMes, defensorTitularPorVara } from "@/lib/services/triagem-escala";

describe("defensoresPlantaoNoMes", () => {
  it("janeiro 2026 (mês 1 ímpar) — Júri/EP Rodrigo, VVD Juliane", () => {
    const r = defensoresPlantaoNoMes(2026, 1);
    expect(r.juri).toBe("Rodrigo");
    expect(r.ep).toBe("Rodrigo");
    expect(r.vvd).toBe("Juliane");
  });

  it("abril 2026 (mês 4 par) — Júri/EP Juliane, VVD Rodrigo", () => {
    const r = defensoresPlantaoNoMes(2026, 4);
    expect(r.juri).toBe("Juliane");
    expect(r.ep).toBe("Juliane");
    expect(r.vvd).toBe("Rodrigo");
  });
});

describe("defensorTitularPorVara", () => {
  it("retorna Cristiane para 1ª Vara Crime", () => {
    expect(defensorTitularPorVara("1ª Crime")).toBe("Cristiane");
  });
  it("retorna Danilo para 2ª Vara Crime", () => {
    expect(defensorTitularPorVara("2ª Crime")).toBe("Danilo");
  });
});
