import { describe, it, expect } from "vitest";
import {
  buildCitationGroups,
  citationsToText,
  filterCitations,
  type CitationCategory,
} from "../citation-export";

// Paleta na ordem semântica (subconjunto do real).
const CATEGORIES: CitationCategory[] = [
  { color: "yellow", label: "Fatos" },
  { color: "red", label: "Contradições" },
  { color: "green", label: "Teses" },
  { color: "pink", label: "Provas" },
];

const annotations = [
  { tipo: "highlight", cor: "green", pagina: 8, textoSelecionado: "tese da legítima defesa" },
  { tipo: "highlight", cor: "yellow", pagina: 3, textoSelecionado: "réu estava em casa" },
  { tipo: "underline", cor: "yellow", pagina: 1, textoSelecionado: "no dia dos fatos" },
  { tipo: "highlight", cor: "red", pagina: 5, textoSelecionado: "depoimento contraditório" },
  { tipo: "bookmark", cor: "yellow", pagina: 2 }, // ignorado (bookmark)
  { tipo: "note", cor: "red", pagina: 4, texto: "lembrar disso" }, // ignorado (note)
  { tipo: "highlight", cor: "green", pagina: 2, textoSelecionado: "" }, // ignorado (sem texto)
];

describe("buildCitationGroups", () => {
  it("agrupa por categoria na ordem da paleta, só com itens", () => {
    const groups = buildCitationGroups(annotations, CATEGORIES);
    expect(groups.map((g) => g.label)).toEqual(["Fatos", "Contradições", "Teses"]);
    // "Provas" (pink) não tem itens → omitido
  });

  it("ordena itens por página dentro de cada categoria", () => {
    const groups = buildCitationGroups(annotations, CATEGORIES);
    const fatos = groups.find((g) => g.label === "Fatos")!;
    expect(fatos.items.map((i) => i.pagina)).toEqual([1, 3]);
    expect(fatos.items[0].texto).toBe("no dia dos fatos");
  });

  it("ignora bookmark, note e grifos sem texto", () => {
    const groups = buildCitationGroups(annotations, CATEGORIES);
    const total = groups.reduce((n, g) => n + g.items.length, 0);
    expect(total).toBe(4);
  });

  it("lista vazia → sem grupos", () => {
    expect(buildCitationGroups([], CATEGORIES)).toEqual([]);
  });

  it("cor fora da paleta cai num grupo 'Sem categoria' ao final", () => {
    const groups = buildCitationGroups(
      [{ tipo: "highlight", cor: "cyan", pagina: 1, textoSelecionado: "x" }],
      CATEGORIES,
    );
    expect(groups).toHaveLength(1);
    expect(groups[0].label).toBe("Sem categoria");
  });
});

describe("citationsToText", () => {
  it("gera texto estruturado por categoria", () => {
    const groups = buildCitationGroups(annotations, CATEGORIES);
    const txt = citationsToText(groups);
    expect(txt).toBe(
      [
        "## Fatos",
        '• Pág. 1: "no dia dos fatos"',
        '• Pág. 3: "réu estava em casa"',
        "",
        "## Contradições",
        '• Pág. 5: "depoimento contraditório"',
        "",
        "## Teses",
        '• Pág. 8: "tese da legítima defesa"',
      ].join("\n"),
    );
  });

  it("vazio → string vazia", () => {
    expect(citationsToText([])).toBe("");
  });
});

describe("filterCitations", () => {
  it("query vazia retorna tudo", () => {
    expect(filterCitations(annotations, "")).toHaveLength(annotations.length);
    expect(filterCitations(annotations, "   ")).toHaveLength(annotations.length);
  });

  it("filtra por texto selecionado, ignorando caixa e acento", () => {
    expect(filterCitations(annotations, "CONTRADITÓRIO")).toHaveLength(1);
    expect(filterCitations(annotations, "contraditorio")).toHaveLength(1);
  });

  it("também busca no campo texto (notas)", () => {
    expect(filterCitations(annotations, "lembrar")).toHaveLength(1);
  });

  it("sem match → vazio", () => {
    expect(filterCitations(annotations, "habeas corpus")).toEqual([]);
  });
});
