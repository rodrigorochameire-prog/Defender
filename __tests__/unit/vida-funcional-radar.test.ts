import { describe, it, expect } from "vitest";
import { computeRadar, daysUntil, type RadarEventoInput } from "@/lib/vida-funcional/radar";

const TODAY = new Date(2026, 5, 26); // 2026-06-26 local

function ev(over: Partial<RadarEventoInput>): RadarEventoInput {
  return {
    id: 1, tipo: "FERIAS", titulo: "x", status: "previsto",
    dataEvento: "2026-06-01", dataFim: null, prazo: null, dados: {}, ...over,
  };
}

describe("daysUntil (date-only, local)", () => {
  it("conta dias corretamente", () => {
    expect(daysUntil("2026-06-26", TODAY)).toBe(0);
    expect(daysUntil("2026-06-29", TODAY)).toBe(3);
    expect(daysUntil("2026-06-20", TODAY)).toBe(-6);
  });
});

describe("computeRadar — regra base por prazo", () => {
  it("prazo em 3 dias → critico; 20 dias → atencao; 45 → info", () => {
    const r = computeRadar([
      ev({ id: 1, prazo: "2026-06-29" }),
      ev({ id: 2, prazo: "2026-07-16" }),
      ev({ id: 3, prazo: "2026-08-10" }),
    ], TODAY);
    const byId = Object.fromEntries(r.map((a) => [a.eventoId, a.severidade]));
    expect(byId[1]).toBe("critico");
    expect(byId[2]).toBe("atencao");
    expect(byId[3]).toBe("info");
  });
  it("evento concluido/arquivado não gera alerta", () => {
    const r = computeRadar([
      ev({ id: 1, prazo: "2026-06-29", status: "concluido" }),
      ev({ id: 2, prazo: "2026-06-29", status: "arquivado" }),
    ], TODAY);
    expect(r).toHaveLength(0);
  });
  it("evento sem prazo e sem regra específica não gera alerta", () => {
    expect(computeRadar([ev({ id: 1, prazo: null })], TODAY)).toHaveLength(0);
  });
  it("prazo muito distante (>60d) é ignorado", () => {
    expect(computeRadar([ev({ id: 1, prazo: "2026-12-01" })], TODAY)).toHaveLength(0);
  });
});

describe("computeRadar — regras específicas", () => {
  it("FOLGA com vencimento próximo", () => {
    const r = computeRadar([ev({ id: 1, tipo: "FOLGA", dados: { vencimento: "2026-06-30" } })], TODAY);
    expect(r[0].severidade).toBe("critico");
    expect(r[0].motivo).toMatch(/folga/i);
  });
  it("DIARIA a_requerer", () => {
    const r = computeRadar([ev({ id: 1, tipo: "DIARIA", status: "concluido", dados: { status: "a_requerer" } })], TODAY);
    expect(r[0].severidade).toBe("atencao");
    expect(r[0].motivo).toMatch(/requerer/i);
  });
  it("GRATIFICACAO com SEI pendente e período encerrado", () => {
    const r = computeRadar([ev({ id: 1, tipo: "GRATIFICACAO", dataFim: "2026-06-10", dados: { seiStatus: "pendente" } })], TODAY);
    expect(r[0].motivo).toMatch(/SEI|ofício/i);
  });
  it("SOLICITACAO_ADM pendente há mais de 15 dias", () => {
    const r = computeRadar([ev({ id: 1, tipo: "SOLICITACAO_ADM", status: "pendente", dataEvento: "2026-06-01" })], TODAY);
    expect(r[0].motivo).toMatch(/sem resposta/i);
  });
  it("PROMOCAO com prazo → info (nunca critico)", () => {
    const r = computeRadar([ev({ id: 1, tipo: "PROMOCAO", prazo: "2026-06-28" })], TODAY);
    expect(r[0].severidade).toBe("info");
  });
});

describe("computeRadar — ordenação", () => {
  it("ordena por severidade depois por prazo", () => {
    const r = computeRadar([
      ev({ id: 1, prazo: "2026-08-10" }),   // info
      ev({ id: 2, prazo: "2026-06-28" }),   // critico
      ev({ id: 3, prazo: "2026-07-10" }),   // atencao
    ], TODAY);
    expect(r.map((a) => a.eventoId)).toEqual([2, 3, 1]);
  });
  it("vincula dominioKey pelo tipo", () => {
    const r = computeRadar([ev({ id: 1, tipo: "FERIAS", prazo: "2026-06-28" })], TODAY);
    expect(r[0].dominioKey).toBe("ferias-licencas");
  });
});
