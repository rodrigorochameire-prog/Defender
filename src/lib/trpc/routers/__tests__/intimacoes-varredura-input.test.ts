import { describe, it, expect } from "vitest";
import { criarVarreduraJobInput } from "../intimacoes";

describe("criarVarreduraJobInput (XOR)", () => {
  it("aceita só atribuicoes", () => {
    expect(criarVarreduraJobInput.safeParse({ atribuicoes: ["VVD_CAMACARI"] }).success).toBe(true);
  });
  it("aceita só demandaIds", () => {
    expect(criarVarreduraJobInput.safeParse({ demandaIds: [1368] }).success).toBe(true);
  });
  it("rejeita os dois juntos", () => {
    expect(criarVarreduraJobInput.safeParse({ atribuicoes: ["VVD_CAMACARI"], demandaIds: [1] }).success).toBe(false);
  });
  it("rejeita nenhum", () => {
    expect(criarVarreduraJobInput.safeParse({}).success).toBe(false);
  });
  it("rejeita lote > 50", () => {
    expect(criarVarreduraJobInput.safeParse({ demandaIds: Array.from({ length: 51 }, (_, i) => i + 1) }).success).toBe(false);
  });
});
