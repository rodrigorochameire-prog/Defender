import { describe, it, expect } from "vitest";
import { isSentencaAto } from "../ato-set";

describe("isSentencaAto", () => {
  it("matches sentença/condenação/absolvição/pronúncia variants (accent + case insensitive)", () => {
    for (const a of [
      "Analisar sentença", "Ciência de sentença", "Ciência condenação",
      "Ciência da absolvição", "Ciência da pronúncia", "Ciência impronúncia",
      "Ciência desclassificação", "CIENCIA DE SENTENCA",
    ]) expect(isSentencaAto(a)).toBe(true);
  });
  it("excludes acórdão / 2º-grau atos", () => {
    for (const a of ["Analisar acórdão", "Ciência acórdão", "Ciência de acordao"])
      expect(isSentencaAto(a)).toBe(false);
  });
  it("excludes unrelated atos", () => {
    for (const a of ["Resposta à Acusação", "Ciência de despacho", "Ciência de certidão", ""])
      expect(isSentencaAto(a)).toBe(false);
  });
});
