import { describe, it, expect } from "vitest";
import { statusEventoDeAusencia, tipoEventoDeAusencia, tituloAusencia, projecaoEventoDeAusencia } from "../projecao";

describe("statusEventoDeAusencia", () => {
  it("maps situação to vf status", () => {
    expect(statusEventoDeAusencia("solicitada")).toBe("pendente");
    expect(statusEventoDeAusencia("deferida")).toBe("previsto");
    expect(statusEventoDeAusencia("gozada")).toBe("concluido");
  });
});
describe("tipoEventoDeAusencia", () => {
  it("maps tipo to vf evento tipo", () => {
    expect(tipoEventoDeAusencia("licenca")).toBe("LICENCA");
    expect(tipoEventoDeAusencia("outra_ausencia")).toBe("OUTRA_AUSENCIA");
  });
});
describe("tituloAusencia", () => {
  it("formats licença with motivo", () => {
    expect(tituloAusencia({ tipo: "licenca", motivo: "LUTO", dataInicio: "2026-07-01" })).toBe("Licença — LUTO (2026-07-01)");
  });
  it("formats outra without motivo", () => {
    expect(tituloAusencia({ tipo: "outra_ausencia", motivo: null, dataInicio: "2026-07-01" })).toBe("Ausência (2026-07-01)");
  });
});
describe("projecaoEventoDeAusencia", () => {
  it("builds the projection (no valorCents)", () => {
    const p = projecaoEventoDeAusencia({ id: 3, tipo: "licenca", motivo: "CASAMENTO", dataInicio: "2026-07-01", dataFim: "2026-07-08", situacao: "deferida" });
    expect(p).toEqual({
      tipo: "LICENCA", cluster: "ausencias", titulo: "Licença — CASAMENTO (2026-07-01)",
      dataEvento: "2026-07-01", dataFim: "2026-07-08", status: "previsto", dados: { ausenciaId: 3 },
    });
    expect("valorCents" in p).toBe(false);
  });
  it("accepts null id (creation)", () => {
    const p = projecaoEventoDeAusencia({ id: null, tipo: "outra_ausencia", motivo: null, dataInicio: "2026-07-01", dataFim: "2026-07-01", situacao: "solicitada" });
    expect(p.dados.ausenciaId).toBeNull();
    expect(p.tipo).toBe("OUTRA_AUSENCIA");
    expect(p.status).toBe("pendente");
  });
});
