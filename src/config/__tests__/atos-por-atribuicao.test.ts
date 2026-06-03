import { describe, it, expect } from "vitest";
import { getAtoOptionsPreview, ATOS_POR_ATRIBUICAO, ATOS_FREQUENTES_POR_ATRIBUICAO } from "../atos-por-atribuicao";

describe("getAtoOptionsPreview", () => {
  it("frequentes vêm primeiro e são todos válidos para a atribuição", () => {
    const opts = getAtoOptionsPreview("Violência Doméstica");
    const validos = new Set(ATOS_POR_ATRIBUICAO["Violência Doméstica"]);
    const frequentes = opts.filter((o) => o.group === "Frequentes");

    expect(frequentes.length).toBeGreaterThan(0);
    // Bloco contíguo no início
    expect(opts.slice(0, frequentes.length).every((o) => o.group === "Frequentes")).toBe(true);
    frequentes.forEach((o) => expect(validos.has(o.value)).toBe(true));
  });

  it("contém todos os atos da atribuição (além dos frequentes)", () => {
    const opts = getAtoOptionsPreview("Tribunal do Júri");
    const values = new Set(opts.map((o) => o.value));
    ATOS_POR_ATRIBUICAO["Tribunal do Júri"].forEach((ato) => {
      expect(values.has(ato)).toBe(true);
    });
  });

  it("atribuição desconhecida cai no fallback de todos os atos, sem Frequentes", () => {
    const opts = getAtoOptionsPreview("Atribuição Inexistente");
    expect(opts.length).toBeGreaterThan(0);
    expect(opts.some((o) => o.group === "Frequentes")).toBe(false);
  });
});

describe("ATOS_FREQUENTES_POR_ATRIBUICAO", () => {
  it("toda lista curada só contém atos que existem na atribuição (≥5 por atribuição)", () => {
    for (const [atribuicao, frequentes] of Object.entries(ATOS_FREQUENTES_POR_ATRIBUICAO)) {
      const lista = ATOS_POR_ATRIBUICAO[atribuicao];
      if (!lista) continue;
      const validos = new Set(lista);
      const invalidos = frequentes.filter((a) => !validos.has(a));
      expect(invalidos, `${atribuicao}: nomes inválidos`).toEqual([]);
      expect(frequentes.length, `${atribuicao}: poucos frequentes`).toBeGreaterThanOrEqual(5);
    }
  });
});
