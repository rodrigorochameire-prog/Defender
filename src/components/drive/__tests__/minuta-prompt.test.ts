import { describe, it, expect } from "vitest";
import { buildMinutaPrompt } from "../minuta-prompt";
import type { CitationGroup } from "../citation-export";

const groups: CitationGroup[] = [
  { color: "yellow", label: "Fatos", items: [{ pagina: 3, texto: "réu estava em casa" }] },
  { color: "green", label: "Teses", items: [{ pagina: 8, texto: "legítima defesa" }] },
];

describe("buildMinutaPrompt", () => {
  it("usa tipo de peça padrão quando não informado", () => {
    const p = buildMinutaPrompt(groups, {});
    expect(p).toContain("peça de defesa");
  });

  it("inclui tipo de peça, assistido e processo quando informados", () => {
    const p = buildMinutaPrompt(groups, {
      tipoPeca: "resposta à acusação",
      assistido: "João da Silva",
      processo: "2000109-71.2025.8.05.0039",
    });
    expect(p).toContain("resposta à acusação");
    expect(p).toContain("João da Silva");
    expect(p).toContain("2000109-71.2025.8.05.0039");
  });

  it("embute o caderno de citações (categorias + páginas)", () => {
    const p = buildMinutaPrompt(groups, {});
    expect(p).toContain("## Fatos");
    expect(p).toContain('Pág. 3: "réu estava em casa"');
    expect(p).toContain("## Teses");
  });

  it("traz a regra de não inventar fatos", () => {
    const p = buildMinutaPrompt(groups, {});
    expect(p.toLowerCase()).toContain("não invente");
  });

  it("avisa quando não há grifos", () => {
    const p = buildMinutaPrompt([], {});
    expect(p.toLowerCase()).toContain("não há grifos");
  });

  it("ordem: cabeçalho antes do caderno", () => {
    const p = buildMinutaPrompt(groups, { tipoPeca: "alegações finais" });
    expect(p.indexOf("alegações finais")).toBeLessThan(p.indexOf("## Fatos"));
  });
});
