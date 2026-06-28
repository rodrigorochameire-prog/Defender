import { describe, it, expect } from "vitest";
import { diasInclusive, computeSaldo, type ParcelaLite } from "../saldo";

function p(over: Partial<ParcelaLite>): ParcelaLite {
  return { id: 1, dataInicio: "2026-07-01", dataFim: "2026-07-10", status: "programada", ...over };
}

describe("diasInclusive", () => {
  it("counts inclusive days", () => {
    expect(diasInclusive("2026-07-01", "2026-07-10")).toBe(10);
    expect(diasInclusive("2026-07-01", "2026-07-01")).toBe(1);
  });
  it("returns 0 when fim < inicio", () => {
    expect(diasInclusive("2026-07-10", "2026-07-01")).toBe(0);
  });
});

describe("computeSaldo", () => {
  it("buckets programados vs concluidos and excludes cancelada", () => {
    const s = computeSaldo(30, [
      p({ id: 1, dataInicio: "2026-07-01", dataFim: "2026-07-10", status: "programada" }),   // 10
      p({ id: 2, dataInicio: "2026-08-01", dataFim: "2026-08-05", status: "concluida" }),     // 5
      p({ id: 3, dataInicio: "2026-09-01", dataFim: "2026-09-30", status: "cancelada" }),     // ignored
    ]);
    expect(s).toEqual({ direito: 30, programados: 10, concluidos: 5, disponiveis: 15 });
  });
  it("treats homologada and em_fruicao as programados", () => {
    const s = computeSaldo(30, [
      p({ id: 1, dataInicio: "2026-07-01", dataFim: "2026-07-05", status: "homologada" }),    // 5
      p({ id: 2, dataInicio: "2026-07-10", dataFim: "2026-07-12", status: "em_fruicao" }),    // 3
    ]);
    expect(s.programados).toBe(8);
    expect(s.disponiveis).toBe(22);
  });
  it("goes negative when over-allocated", () => {
    const s = computeSaldo(10, [p({ dataInicio: "2026-07-01", dataFim: "2026-07-20", status: "programada" })]); // 20
    expect(s.disponiveis).toBe(-10);
  });
});
