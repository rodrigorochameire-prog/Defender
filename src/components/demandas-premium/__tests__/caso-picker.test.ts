import { describe, it, expect } from "vitest";
import { casoLabel, searchCasos } from "../caso-picker";

const casos = [
  { id: 1, titulo: "Homicídio Bar do Zé", codigo: "JURI-001" },
  { id: 2, titulo: "Tráfico Rodoviária", codigo: "VVD-014" },
  { id: 3, titulo: "Roubo majorado", codigo: null },
  { id: 4, titulo: "Homologação de acordo", codigo: "EP-220" },
];

describe("casoLabel", () => {
  it("inclui o código quando há", () => {
    expect(casoLabel(casos[0])).toBe("JURI-001 · Homicídio Bar do Zé");
  });
  it("só o título quando sem código", () => {
    expect(casoLabel(casos[2])).toBe("Roubo majorado");
  });
});

describe("searchCasos", () => {
  it("query vazia → primeiros até limit", () => {
    expect(searchCasos(casos, "").map((c) => c.id)).toEqual([1, 2, 3, 4]);
    expect(searchCasos(casos, "  ", 2).map((c) => c.id)).toEqual([1, 2]);
  });

  it("ranqueia prefixo de título acima de substring", () => {
    const r = searchCasos(casos, "homi");
    // "Homicídio..." (prefixo) e "Homologação..." (prefixo) — ambos 100; desempate por título
    expect(r[0].titulo.startsWith("Homic")).toBe(true);
  });

  it("é tolerante a acento", () => {
    expect(searchCasos(casos, "homicidio").map((c) => c.id)).toContain(1);
  });

  it("casa pelo código", () => {
    expect(searchCasos(casos, "ep-220").map((c) => c.id)).toEqual([4]);
  });

  it("sem match → vazio", () => {
    expect(searchCasos(casos, "habeas")).toEqual([]);
  });

  it("respeita o limite", () => {
    expect(searchCasos(casos, "o", 1)).toHaveLength(1);
  });
});
