import { describe, it, expect } from "vitest";
import { normalizarMotivo, LABEL_ORIGEM } from "./motivo-designacao";

describe("normalizarMotivo", () => {
  it("string legada vira { origem: null, detalhe }", () => {
    expect(normalizarMotivo("juiz remarcou para reavaliar")).toEqual({
      origem: null,
      detalhe: "juiz remarcou para reavaliar",
    });
  });

  it("objeto tipado é preservado", () => {
    expect(normalizarMotivo({ origem: "pedido_revogacao_ofendida", detalhe: "ela quer revogar" })).toEqual({
      origem: "pedido_revogacao_ofendida",
      detalhe: "ela quer revogar",
    });
  });

  it("origem inválida é descartada, detalhe mantido", () => {
    expect(normalizarMotivo({ origem: "xpto", detalhe: "algo" })).toEqual({ origem: null, detalhe: "algo" });
  });

  it("vazio/ausente → null", () => {
    expect(normalizarMotivo("")).toBeNull();
    expect(normalizarMotivo("   ")).toBeNull();
    expect(normalizarMotivo(null)).toBeNull();
    expect(normalizarMotivo(undefined)).toBeNull();
    expect(normalizarMotivo({ origem: null, detalhe: "" })).toBeNull();
  });

  it("há rótulo para toda origem", () => {
    expect(LABEL_ORIGEM.requerimento_defesa).toBe("Requerimento da defesa");
    expect(Object.keys(LABEL_ORIGEM)).toHaveLength(6);
  });

  it("string com token no início extrai origem + detalhe limpo", () => {
    expect(normalizarMotivo("pedido_revogacao_ofendida — ela compareceu e pediu revogação")).toEqual({
      origem: "pedido_revogacao_ofendida",
      detalhe: "ela compareceu e pediu revogação",
    });
  });

  it("alias 'primeiro_contato' (string) mapeia para reavaliacao_juizo, preservando parênteses", () => {
    expect(normalizarMotivo("primeiro_contato (designada de ofício): apos a soltura")).toEqual({
      origem: "reavaliacao_juizo",
      detalhe: "(designada de ofício): apos a soltura",
    });
  });

  it("alias 'primeiro_contato' também no objeto tipado", () => {
    expect(normalizarMotivo({ origem: "primeiro_contato", detalhe: "1º contato" })).toEqual({
      origem: "reavaliacao_juizo",
      detalhe: "1º contato",
    });
  });

  it("string sem token conhecido permanece como detalhe puro", () => {
    expect(normalizarMotivo("juiz remarcou para reavaliar")).toEqual({
      origem: null,
      detalhe: "juiz remarcou para reavaliar",
    });
  });
});
