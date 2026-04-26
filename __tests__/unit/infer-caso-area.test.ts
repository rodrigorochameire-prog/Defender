import { describe, it, expect } from "vitest";
import { inferCasoArea } from "@/lib/hierarquia/infer-caso-area";

describe("inferCasoArea", () => {
  it("processo referência tem prioridade", () => {
    expect(inferCasoArea([
      { id: 1, area: "VIOLENCIA_DOMESTICA", isReferencia: true },
      { id: 2, area: "JURI", isReferencia: false },
    ])).toBe("VIOLENCIA_DOMESTICA");
  });

  it("sem referência, usa moda", () => {
    expect(inferCasoArea([
      { id: 1, area: "JURI", isReferencia: false },
      { id: 2, area: "JURI", isReferencia: false },
      { id: 3, area: "EXECUCAO_PENAL", isReferencia: false },
    ])).toBe("JURI");
  });

  it("empate de moda, pega primeiro", () => {
    expect(inferCasoArea([
      { id: 1, area: "JURI", isReferencia: false },
      { id: 2, area: "VIOLENCIA_DOMESTICA", isReferencia: false },
    ])).toBe("JURI");
  });

  it("lista vazia → SUBSTITUICAO default", () => {
    expect(inferCasoArea([])).toBe("SUBSTITUICAO");
  });

  it("ignora processos sem area", () => {
    expect(inferCasoArea([
      { id: 1, area: null as any, isReferencia: false },
      { id: 2, area: "JURI", isReferencia: false },
    ])).toBe("JURI");
  });

  it("null/undefined → SUBSTITUICAO", () => {
    expect(inferCasoArea(null as any)).toBe("SUBSTITUICAO");
    expect(inferCasoArea(undefined as any)).toBe("SUBSTITUICAO");
  });
});
