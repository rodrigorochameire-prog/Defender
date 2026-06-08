import { describe, it, expect } from "vitest";
import { rotuloDelegacaoChip } from "../delegacao-chip";

describe("rotuloDelegacaoChip", () => {
  it("a_delegar → Delegar a {primeiroNome}, tom a_delegar", () => {
    expect(rotuloDelegacaoChip({ statusDelegacao: "a_delegar", nome: "Amanda Silva" }))
      .toEqual({ texto: "Delegar a Amanda", tom: "a_delegar" });
  });

  it("delegado sem andamento → Delegado a {nome}, tom ativo", () => {
    expect(rotuloDelegacaoChip({ statusDelegacao: "delegado", nome: "Amanda Silva", delegacaoWorkStatus: null }))
      .toEqual({ texto: "Delegado a Amanda", tom: "ativo" });
  });

  it("delegado aguardando revisão → mostra o andamento", () => {
    expect(rotuloDelegacaoChip({ statusDelegacao: "delegado", nome: "Amanda Silva", delegacaoWorkStatus: "aguardando_revisao" }))
      .toEqual({ texto: "Delegado a Amanda · aguardando revisão", tom: "ativo" });
  });

  it("workStatus terminal → concluída, tom concluida", () => {
    expect(rotuloDelegacaoChip({ statusDelegacao: "delegado", nome: "Amanda", delegacaoWorkStatus: "concluida" }))
      .toEqual({ texto: "Delegado a Amanda · concluída", tom: "concluida" });
    expect(rotuloDelegacaoChip({ statusDelegacao: "delegado", nome: "Amanda", delegacaoWorkStatus: "protocolado" }).tom)
      .toBe("concluida");
  });

  it("sem delegação → null", () => {
    expect(rotuloDelegacaoChip({ statusDelegacao: null, nome: "X" })).toBeNull();
  });
});
