import { describe, it, expect } from "vitest";
import {
  normalizeName,
  matchTermoDepoente,
  matchLaudo,
} from "../match-document";

type File = { driveFileId: string; name: string; mimeType?: string | null };

describe("normalizeName", () => {
  it("remove acentos", () => {
    expect(normalizeName("João da Silva")).toBe("joao da silva");
  });

  it("minúsculas e whitespace normalizado", () => {
    expect(normalizeName("  JOÃO  DA   SILVA  ")).toBe("joao da silva");
  });

  it("remove pontuação", () => {
    expect(normalizeName("Termo_Joao.Silva-01.pdf")).toBe("termo joao silva 01 pdf");
  });
});

describe("matchTermoDepoente", () => {
  const files: File[] = [
    { driveFileId: "a", name: "Termo de Depoimento - Joao da Silva.pdf" },
    { driveFileId: "b", name: "Laudo Balistico.pdf" },
    { driveFileId: "c", name: "Oitiva_Maria_Souza.pdf" },
    { driveFileId: "d", name: "Documento_Qualquer.pdf" },
  ];

  it("casa termo com nome completo do depoente", () => {
    expect(matchTermoDepoente("João da Silva", files)).toBe("a");
  });

  it("casa oitiva quando nome do arquivo usa underscore", () => {
    expect(matchTermoDepoente("Maria Souza", files)).toBe("c");
  });

  it("retorna null sem keyword termo/depoimento/oitiva", () => {
    expect(matchTermoDepoente("Documento Qualquer", files)).toBeNull();
  });

  it("retorna null para nome com só tokens curtos", () => {
    expect(matchTermoDepoente("J. A.", files)).toBeNull();
  });

  it("retorna null quando depoente não aparece em nenhum termo", () => {
    expect(matchTermoDepoente("Carlos Mendes", files)).toBeNull();
  });
});

describe("matchLaudo", () => {
  const files: File[] = [
    { driveFileId: "a", name: "Laudo Balistico 001.pdf" },
    { driveFileId: "b", name: "Laudo DNA.pdf" },
    { driveFileId: "c", name: "Pericia Necropsia.pdf" },
    { driveFileId: "d", name: "Termo de Depoimento.pdf" },
  ];

  it("casa laudo balístico pelo tipo na descrição", () => {
    expect(matchLaudo("Laudo balístico da arma", files)).toBe("a");
  });

  it("casa laudo com keyword pericia", () => {
    expect(matchLaudo("Necropsia da vítima", files)).toBe("c");
  });

  it("casa laudo genérico sem tipo específico (primeiro laudo disponível)", () => {
    expect(matchLaudo("Laudo técnico", files)).toBe("a");
  });

  it("retorna null quando nenhum arquivo tem keyword laudo/pericia/exame", () => {
    expect(matchLaudo("Balística", [{ driveFileId: "x", name: "Notas.pdf" }])).toBeNull();
  });
});
