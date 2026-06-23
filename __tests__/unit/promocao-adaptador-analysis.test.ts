import { describe, it, expect } from "vitest";
import { candidatosDeAnalysis } from "@/lib/promocao/adaptador-analysis";

describe("candidatosDeAnalysis", () => {
  it("null → []", () => expect(candidatosDeAnalysis(10, null)).toEqual([]));
  it("presente sem chave pessoas → []", () => expect(candidatosDeAnalysis(10, { faseAtual: "x" })).toEqual([]));
  it("extrai pessoas com cpf e vínculo", () => {
    const out = candidatosDeAnalysis(10, { pessoas: [
      { nome: "Carla", papel: "vitima", cpf: "1", dataNascimento: "2000-01-01", vinculoComDefendido: "ex-companheira" },
    ]});
    expect(out[0]).toMatchObject({ nome: "Carla", cpf: "1", papel: "vitima", fonteRef: "analysis:10", subpapel: "ex-companheira" });
  });
});
