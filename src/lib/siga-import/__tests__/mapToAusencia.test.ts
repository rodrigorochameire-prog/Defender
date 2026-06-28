import { describe, it, expect } from "vitest";
import { situacaoFromSiga, mapToAusencia } from "../mapToAusencia";

describe("situacaoFromSiga", () => {
  it("maps SIGA situação strings", () => {
    expect(situacaoFromSiga("Gozada")).toEqual({ situacao: "gozada", suspensa: false });
    expect(situacaoFromSiga("Licenças Indeferidas/Desistência")).toEqual({ situacao: "indeferida", suspensa: false });
    expect(situacaoFromSiga("Suspensa")).toEqual({ situacao: "deferida", suspensa: true });
    expect(situacaoFromSiga("Passível de Prorrogação")).toEqual({ situacao: "solicitada", suspensa: false });
    expect(situacaoFromSiga(null)).toEqual({ situacao: "solicitada", suspensa: false });
  });
});

describe("mapToAusencia", () => {
  it("maps a licença payload to an ausência record (carries observacao)", () => {
    const r = mapToAusencia("licenca", {
      motivo: "LUTO", dataInicio: "2026-07-01", dataFim: "2026-07-10", situacaoSiga: "Gozada",
      numeroSolicitacao: "12345", nSiga: "SG-999", dataPublicacao: "2026-06-15",
      observacao: "obs", interrompida: false, suspensa: false,
    });
    expect(r).toMatchObject({
      tipo: "licenca", motivo: "LUTO", dataInicio: "2026-07-01", dataFim: "2026-07-10",
      situacao: "gozada", suspensa: false, interrompida: false,
      numeroSolicitacao: "12345", nSiga: "SG-999", dataPublicacao: "2026-06-15",
      situacaoSiga: "Gozada", observacao: "obs",
    });
  });
  it("ORs suspensa from situação and payload", () => {
    expect(mapToAusencia("licenca", { situacaoSiga: "Suspensa", dataInicio: "2026-07-01", dataFim: "2026-07-02" }).suspensa).toBe(true);
    expect(mapToAusencia("licenca", { situacaoSiga: "Gozada", suspensa: true, dataInicio: "2026-07-01", dataFim: "2026-07-02" }).suspensa).toBe(true);
  });
});
