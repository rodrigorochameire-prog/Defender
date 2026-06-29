import { describe, it, expect } from "vitest";
import { statusEventoDeDiaria, tituloDiaria, projecaoEventoDeDiaria } from "../projecao";

describe("statusEventoDeDiaria", () => {
  it("maps diária status to vida_funcional event status", () => {
    expect(statusEventoDeDiaria("a_requerer")).toBe("previsto");
    expect(statusEventoDeDiaria("requerida")).toBe("pendente");
    expect(statusEventoDeDiaria("autorizada")).toBe("em_curso");
    expect(statusEventoDeDiaria("paga")).toBe("concluido");
  });
});

describe("tituloDiaria", () => {
  it("formats destino + data", () => {
    expect(tituloDiaria({ destino: "Salvador", dataInicio: "2026-07-01" }))
      .toBe("Diária — Salvador (2026-07-01)");
  });
});

describe("projecaoEventoDeDiaria", () => {
  it("builds the vida_funcional projection with valorCents = total", () => {
    const proj = projecaoEventoDeDiaria(
      { id: 5, destino: "Salvador", dataInicio: "2026-07-01", dataFim: "2026-07-02", status: "autorizada" },
      22500,
    );
    expect(proj).toEqual({
      tipo: "DIARIA", cluster: "contraprestacao", titulo: "Diária — Salvador (2026-07-01)",
      dataEvento: "2026-07-01", dataFim: "2026-07-02", status: "em_curso",
      valorCents: 22500, dados: { diariaId: 5 },
    });
  });
  it("accepts a null id (creation, before backfill)", () => {
    const proj = projecaoEventoDeDiaria(
      { id: null, destino: "X", dataInicio: "2026-07-01", dataFim: "2026-07-01", status: "a_requerer" }, 0,
    );
    expect(proj.dados.diariaId).toBeNull();
    expect(proj.status).toBe("previsto");
  });
});
