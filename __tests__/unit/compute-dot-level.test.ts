import { describe, it, expect } from "vitest";
import { computeDotLevel, type IntelSignal } from "@/lib/pessoas/compute-dot-level";

function sig(partial: Partial<IntelSignal>): IntelSignal {
  return {
    pessoaId: 1,
    totalCasos: 0,
    casosRecentes6m: 0,
    casosRecentes12m: 0,
    papeisCount: {},
    papelPrimario: null,
    ladoAcusacao: 0,
    ladoDefesa: 0,
    lastSeenAt: null,
    firstSeenAt: null,
    sameComarcaCount: 0,
    ambiguityFlag: false,
    contradicoesConhecidas: 0,
    consistenciasDetectadas: 0,
    highValueFlag: false,
    ...partial,
  };
}

describe("computeDotLevel", () => {
  it("papel estável (juiz) retorna none", () => {
    expect(computeDotLevel(sig({ papelPrimario: "juiz", totalCasos: 20 }))).toBe("none");
  });

  it("papel estável (promotor) retorna none mesmo com contradições", () => {
    expect(computeDotLevel(sig({ papelPrimario: "promotor", totalCasos: 10, contradicoesConhecidas: 5 }))).toBe("none");
  });

  it("contradição em rotativo → amber", () => {
    expect(computeDotLevel(sig({ papelPrimario: "testemunha", totalCasos: 3, contradicoesConhecidas: 1 }))).toBe("amber");
  });

  it("highValueFlag → red", () => {
    expect(computeDotLevel(sig({ papelPrimario: "testemunha", totalCasos: 3, highValueFlag: true }))).toBe("red");
  });

  it("5+ casos com 3+ consistencias → emerald", () => {
    expect(computeDotLevel(sig({
      papelPrimario: "policial-militar", totalCasos: 7, consistenciasDetectadas: 4
    }))).toBe("emerald");
  });

  it("3+ casos → normal", () => {
    expect(computeDotLevel(sig({ papelPrimario: "testemunha", totalCasos: 3 }))).toBe("normal");
  });

  it("2 casos → subtle", () => {
    expect(computeDotLevel(sig({ papelPrimario: "vitima", totalCasos: 2 }))).toBe("subtle");
  });

  it("1 caso → none", () => {
    expect(computeDotLevel(sig({ papelPrimario: "testemunha", totalCasos: 1 }))).toBe("none");
  });

  it("0 casos → none", () => {
    expect(computeDotLevel(sig({ papelPrimario: "testemunha", totalCasos: 0 }))).toBe("none");
  });

  it("papelPrimario null → usa heurística de contagem (não bloqueia)", () => {
    expect(computeDotLevel(sig({ papelPrimario: null, totalCasos: 3 }))).toBe("normal");
  });
});
