import { describe, it, expect } from "vitest";
import { toTitleCasePtBr } from "../title-case";

describe("toTitleCasePtBr", () => {
  it("converte vara em CAIXA ALTA para Title Case pt-BR", () => {
    expect(toTitleCasePtBr("VARA DE VIOLÊNCIA DOMÉSTICA FAM CONTRA A MULHER DE CAMAÇARI"))
      .toBe("Vara de Violência Doméstica Fam Contra a Mulher de Camaçari");
  });

  it("preserva ordinais", () => {
    expect(toTitleCasePtBr("1ª VARA CRIMINAL DA COMARCA DE CAMAÇARI"))
      .toBe("1ª Vara Criminal da Comarca de Camaçari");
  });

  it("mantém conectivos minúsculos exceto na 1ª palavra", () => {
    expect(toTitleCasePtBr("DA SILVA E SOUZA")).toBe("Da Silva e Souza");
  });

  it("trata vazio/nulo", () => {
    expect(toTitleCasePtBr("")).toBe("");
    expect(toTitleCasePtBr(null)).toBe("");
    expect(toTitleCasePtBr(undefined)).toBe("");
  });

  it("normaliza espaços múltiplos", () => {
    expect(toTitleCasePtBr("VARA   DE   EXECUÇÕES")).toBe("Vara de Execuções");
  });
});
