import { describe, it, expect } from "vitest";
import { detectAbordagemSemFundadaSuspeita } from "@/lib/modus/modus-flags";

describe("detectAbordagemSemFundadaSuspeita", () => {
  it("denúncia anônima, sem fundada suspeita, com apreensão → flag", () => {
    const f = detectAbordagemSemFundadaSuspeita({ abordagem: "denuncia-anonima", fundadaSuspeitaDocumentada: false }, true);
    expect(f).toBeTruthy();
    expect(f!.nivel).toBe("amber");
  });

  it("fundada suspeita documentada → null", () => {
    expect(detectAbordagemSemFundadaSuspeita({ abordagem: "bloqueio", fundadaSuspeitaDocumentada: true }, true)).toBeNull();
  });

  it("sem apreensão ilícita → null (sem prova a excluir)", () => {
    expect(detectAbordagemSemFundadaSuspeita({ abordagem: "flagrante-ronda" }, false)).toBeNull();
  });

  it("abordagem com mandado (não exige suspeita) → null", () => {
    expect(detectAbordagemSemFundadaSuspeita({ abordagem: "mandado" }, true)).toBeNull();
  });

  it("sem modus/abordagem → null", () => {
    expect(detectAbordagemSemFundadaSuspeita(null, true)).toBeNull();
    expect(detectAbordagemSemFundadaSuspeita({}, true)).toBeNull();
  });
});
