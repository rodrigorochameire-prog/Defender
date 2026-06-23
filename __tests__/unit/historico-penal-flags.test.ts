import { describe, it, expect } from "vitest";
import { detectPrimariedadeArguivel } from "@/lib/assistidos/historico-penal-flags";

describe("detectPrimariedadeArguivel", () => {
  it("null/sem histórico → null", () => {
    expect(detectPrimariedadeArguivel(null)).toBeNull();
    expect(detectPrimariedadeArguivel(undefined)).toBeNull();
    expect(detectPrimariedadeArguivel({})).toBeNull();
  });

  it("maus antecedentes alegados sem condenação transitada → arguível (emerald)", () => {
    const f = detectPrimariedadeArguivel({ mausAntecedentesAlegados: true });
    expect(f).toBeTruthy();
    expect(f!.nivel).toBe("emerald");
  });

  it("passagens policiais sem condenação → arguível", () => {
    expect(detectPrimariedadeArguivel({ passagensPoliciaisSemCondenacao: 2 })).toBeTruthy();
  });

  it("condenação transitada e não extinta → NÃO arguível (afasta primariedade)", () => {
    const f = detectPrimariedadeArguivel({
      mausAntecedentesAlegados: true,
      condenacoesAnteriores: [{ dataTransitoJulgado: "2020-01-01", extinta: false }],
    });
    expect(f).toBeNull();
  });

  it("condenação transitada mas EXTINTA não afasta → ainda arguível", () => {
    const f = detectPrimariedadeArguivel({
      mausAntecedentesAlegados: true,
      condenacoesAnteriores: [{ dataTransitoJulgado: "2010-01-01", extinta: true, extintaMotivo: "prescrição" }],
    });
    expect(f).toBeTruthy();
  });

  it("condenação SEM trânsito em julgado não afasta → arguível", () => {
    const f = detectPrimariedadeArguivel({
      mausAntecedentesAlegados: true,
      condenacoesAnteriores: [{ dataTransitoJulgado: null }],
    });
    expect(f).toBeTruthy();
  });

  it("sem alegação alguma → null (argumento inútil)", () => {
    expect(detectPrimariedadeArguivel({ condenacoesAnteriores: [] })).toBeNull();
  });
});
