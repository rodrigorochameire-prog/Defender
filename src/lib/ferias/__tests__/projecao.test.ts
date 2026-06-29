import { describe, it, expect } from "vitest";
import { statusEventoDeParcela, tituloParcela, projecaoEventoDeParcela } from "../projecao";

describe("statusEventoDeParcela", () => {
  it("maps parcela status to vida_funcional event status", () => {
    expect(statusEventoDeParcela("programada")).toBe("previsto");
    expect(statusEventoDeParcela("homologada")).toBe("previsto");
    expect(statusEventoDeParcela("em_fruicao")).toBe("em_curso");
    expect(statusEventoDeParcela("concluida")).toBe("concluido");
  });
});

describe("tituloParcela", () => {
  it("formats with year range and ordinal", () => {
    expect(tituloParcela({ aquisitivoInicio: "2025-01-01", aquisitivoFim: "2026-12-31", ordem: 2 }))
      .toBe("Férias 2025/2026 — 2ª parcela");
  });
  it("collapses same year", () => {
    expect(tituloParcela({ aquisitivoInicio: "2025-01-01", aquisitivoFim: "2025-12-31", ordem: 1 }))
      .toBe("Férias 2025 — 1ª parcela");
  });
});

describe("projecaoEventoDeParcela", () => {
  it("builds the vida_funcional projection object", () => {
    const proj = projecaoEventoDeParcela(
      { id: 7, dataInicio: "2026-07-01", dataFim: "2026-07-10", status: "em_fruicao" },
      { aquisitivoInicio: "2025-01-01", aquisitivoFim: "2025-12-31" },
      1,
    );
    expect(proj).toEqual({
      tipo: "FERIAS", cluster: "ausencias", titulo: "Férias 2025 — 1ª parcela",
      dataEvento: "2026-07-01", dataFim: "2026-07-10", status: "em_curso",
      valorCents: null,
      dados: { feriasParcelaId: 7 },
    });
  });

  it("abono parcela carries valorCents and a titulo suffix", () => {
    const proj = projecaoEventoDeParcela(
      { id: 7, dataInicio: "2026-07-01", dataFim: "2026-07-10", status: "concluida", conversaoPecunia: true, valorAbonoCents: 50000 },
      { aquisitivoInicio: "2025-01-01", aquisitivoFim: "2025-12-31" }, 1,
    );
    expect(proj.valorCents).toBe(50000);
    expect(proj.titulo).toBe("Férias 2025 — 1ª parcela (abono pecuniário)");
    expect(proj.status).toBe("concluido");
  });

  it("abono with null valorAbonoCents projects valorCents null (not 0)", () => {
    const proj = projecaoEventoDeParcela(
      { id: 1, dataInicio: "2026-07-01", dataFim: "2026-07-02", status: "programada", conversaoPecunia: true, valorAbonoCents: null },
      { aquisitivoInicio: "2025-01-01", aquisitivoFim: "2025-12-31" }, 1,
    );
    expect(proj.valorCents).toBeNull();
  });

  it("non-abono parcela has valorCents null and no suffix", () => {
    const proj = projecaoEventoDeParcela(
      { id: 2, dataInicio: "2026-07-01", dataFim: "2026-07-02", status: "programada" },
      { aquisitivoInicio: "2025-01-01", aquisitivoFim: "2025-12-31" }, 2,
    );
    expect(proj.valorCents).toBeNull();
    expect(proj.titulo).toBe("Férias 2025 — 2ª parcela");
  });
});
