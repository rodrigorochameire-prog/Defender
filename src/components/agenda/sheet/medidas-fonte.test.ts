import { describe, it, expect } from "vitest";
import { resolverFonteMedidas } from "./medidas-fonte";

describe("resolverFonteMedidas", () => {
  it("prefere o banco quando há registros estruturados", () => {
    expect(resolverFonteMedidas({ qtdBanco: 2, qtdAnalysis: 5 })).toBe("banco");
  });

  it("cai para analysisData quando o banco está vazio mas a IA extraiu", () => {
    expect(resolverFonteMedidas({ qtdBanco: 0, qtdAnalysis: 3 })).toBe("analysisData");
  });

  it("nenhuma quando ambos vazios", () => {
    expect(resolverFonteMedidas({ qtdBanco: 0, qtdAnalysis: 0 })).toBe("nenhuma");
  });
});
