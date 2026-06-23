import { describe, it, expect } from "vitest";
import {
  STATUS_PRISIONAL_CONFIG,
  STATUS_PRISIONAL_VALUES,
  STATUS_PRISIONAL_OPTIONS,
  statusPrisionalInfo,
} from "@/lib/config/tipologia";

describe("tipologia · status prisional (fonte única)", () => {
  it("rótulos acentuados e completos", () => {
    expect(STATUS_PRISIONAL_CONFIG.CADEIA_PUBLICA.label).toBe("Cadeia Pública");
    expect(STATUS_PRISIONAL_CONFIG.PENITENCIARIA.label).toBe("Penitenciária");
    expect(STATUS_PRISIONAL_CONFIG.HOSPITAL_CUSTODIA.label).toBe("Hospital de Custódia");
  });

  it("labelShort compacto para pills (só Hospital difere)", () => {
    expect(STATUS_PRISIONAL_CONFIG.HOSPITAL_CUSTODIA.labelShort).toBe("Hosp. Custódia");
    expect(STATUS_PRISIONAL_CONFIG.CADEIA_PUBLICA.labelShort).toBe("Cadeia Pública");
  });

  it("paleta canônica unificada (demandas-premium)", () => {
    // Pontos que divergiam: Hospital→orange, Domiciliar→amber, Monitorado→orange.
    expect(STATUS_PRISIONAL_CONFIG.HOSPITAL_CUSTODIA.color).toContain("orange");
    expect(STATUS_PRISIONAL_CONFIG.DOMICILIAR.color).toContain("amber");
    expect(STATUS_PRISIONAL_CONFIG.MONITORADO.color).toContain("orange");
    expect(STATUS_PRISIONAL_CONFIG.SOLTO.color).toContain("emerald");
    expect(STATUS_PRISIONAL_CONFIG.CADEIA_PUBLICA.color).toContain("rose");
  });

  it("priority: preso primeiro (1) … solto por último (7)", () => {
    expect(STATUS_PRISIONAL_CONFIG.CADEIA_PUBLICA.priority).toBe(1);
    expect(STATUS_PRISIONAL_CONFIG.SOLTO.priority).toBe(7);
    const ordenado = [...STATUS_PRISIONAL_VALUES].sort(
      (a, b) => STATUS_PRISIONAL_CONFIG[a].priority - STATUS_PRISIONAL_CONFIG[b].priority,
    );
    expect(ordenado[0]).toBe("CADEIA_PUBLICA");
    expect(ordenado[ordenado.length - 1]).toBe("SOLTO");
  });

  it("options cobrem os 7 valores; helper cai em null", () => {
    expect(STATUS_PRISIONAL_OPTIONS).toHaveLength(7);
    expect(statusPrisionalInfo("SOLTO")?.label).toBe("Solto");
    expect(statusPrisionalInfo("xpto")).toBeNull();
    expect(statusPrisionalInfo(null)).toBeNull();
  });
});
