import { describe, it, expect } from "vitest";
import { extrairNarrativaFatos } from "./extrair-narrativa-fatos";

const RAW_PDF = `
Num. 508976743 - Pág. 1 de 3
TRIBUNAL DE JUSTIÇA DO ESTADO DA BAHIA
VARA CRIMINAL

Assinado eletronicamente por: FULANO DE TAL
https://projudi.tjba.jus.br/…

DENÚNCIA

No dia 07 de maio de 2025, por volta das 23h44min, na Rua das Flores, o
denunciado João da Silva subtraiu para si, mediante violência, a quantia de
R$ 500,00 de Maria dos Santos.
`;

const CLEAN = `No dia 07 de maio de 2025, por volta das 23h44min, na Rua das Flores, o
denunciado João da Silva subtraiu para si, mediante violência, a quantia de
R$ 500,00 de Maria dos Santos.`;

describe("extrairNarrativaFatos", () => {
  it("retorna somente o parágrafo narrativo — sem cabeçalho, sem assinatura, sem URL", () => {
    const result = extrairNarrativaFatos(RAW_PDF);
    expect(result).toContain("No dia 07 de maio de 2025");
    expect(result).not.toContain("Num. 508976743");
    expect(result).not.toContain("projudi.tjba.jus.br");
    expect(result).not.toContain("Assinado eletronicamente");
  });

  it("retorna texto já limpo inalterado (sem marcador temporal: retorna tudo sem os ruídos)", () => {
    const alreadyClean = "O denunciado saiu correndo pela rua.";
    const result = extrairNarrativaFatos(alreadyClean);
    expect(result).toBe("O denunciado saiu correndo pela rua.");
  });

  it("handles empty string", () => {
    expect(extrairNarrativaFatos("")).toBe("");
  });

  it("remove linhas que são só URLs", () => {
    const withUrl = "https://projudi.tjba.jus.br/link\nNo dia 10 de março, o réu apareceu.";
    expect(extrairNarrativaFatos(withUrl)).toBe("No dia 10 de março, o réu apareceu.");
  });

  it("remove linhas de numeração de página", () => {
    const withPage = "Num. 123456 - Pág. 1 de 5\nA vítima relatou os fatos.";
    expect(extrairNarrativaFatos(withPage)).toBe("A vítima relatou os fatos.");
  });
});
