import { describe, it, expect } from "vitest";
import { shouldShowBanner, filterBannerPessoas } from "@/lib/pessoas/should-show-banner";
import type { IntelSignal } from "@/lib/pessoas/compute-dot-level";

function sig(partial: Partial<IntelSignal>): IntelSignal {
  return {
    pessoaId: 1,
    totalCasos: 0,
    casosRecentes6m: 0, casosRecentes12m: 0,
    papeisCount: {}, papelPrimario: "testemunha",
    ladoAcusacao: 0, ladoDefesa: 0,
    lastSeenAt: null, firstSeenAt: null,
    sameComarcaCount: 0, ambiguityFlag: false,
    contradicoesConhecidas: 0, consistenciasDetectadas: 0, highValueFlag: false,
    ...partial,
  };
}

describe("shouldShowBanner", () => {
  it("retorna false com 0 sinais", () => {
    expect(shouldShowBanner([])).toBe(false);
  });

  it("retorna false quando nenhum atinge threshold", () => {
    expect(shouldShowBanner([sig({ totalCasos: 1 }), sig({ totalCasos: 2 })])).toBe(false);
  });

  it("liga com ≥3 casos + ≥2 na mesma comarca", () => {
    expect(shouldShowBanner([sig({ totalCasos: 4, sameComarcaCount: 2 })])).toBe(true);
  });

  it("liga com contradição conhecida", () => {
    expect(shouldShowBanner([sig({ totalCasos: 1, contradicoesConhecidas: 1 })])).toBe(true);
  });

  it("papel estável não conta mesmo com contradição", () => {
    expect(shouldShowBanner([sig({ papelPrimario: "juiz", totalCasos: 10, contradicoesConhecidas: 1 })])).toBe(false);
  });
});

describe("filterBannerPessoas", () => {
  it("retorna apenas rotativos que passam threshold", () => {
    const signals = [
      sig({ pessoaId: 1, totalCasos: 4, sameComarcaCount: 2 }),       // passa
      sig({ pessoaId: 2, totalCasos: 1 }),                              // não passa
      sig({ pessoaId: 3, papelPrimario: "juiz", contradicoesConhecidas: 1 }), // estável — filtrado
      sig({ pessoaId: 4, contradicoesConhecidas: 1 }),                  // passa
    ];
    const result = filterBannerPessoas(signals);
    expect(result.map((s) => s.pessoaId)).toEqual([1, 4]);
  });
});
