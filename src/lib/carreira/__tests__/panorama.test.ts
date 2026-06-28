import { describe, it, expect } from "vitest";
import { addDaysISO, buildMeuPanorama, type EventoLite } from "../panorama";

const TODAY = "2026-06-28";

function ev(p: Partial<EventoLite>): EventoLite {
  return {
    id: 1, tipo: "FERIAS", cluster: "ausencias", titulo: "x", status: "previsto",
    dataEvento: TODAY, dataFim: null, prazo: null, valorCents: null, ...p,
  };
}

describe("addDaysISO", () => {
  it("adds days across month boundary in UTC", () => {
    expect(addDaysISO("2026-06-28", 90)).toBe("2026-09-26");
    expect(addDaysISO("2026-01-31", 1)).toBe("2026-02-01");
  });
});

describe("buildMeuPanorama", () => {
  it("counts substituições ativas as those not paga", () => {
    const r = buildMeuPanorama(
      { eventos: [], substituicoes: [
        { id: 1, status: "em_andamento" }, { id: 2, status: "oficiada" }, { id: 3, status: "paga" },
      ] },
      TODAY,
    );
    expect(r.kpis.substituicoesAtivas).toBe(2);
  });

  it("counts pedidos administrativos pendentes (SOLICITACAO_ADM, pendente|em_curso)", () => {
    const r = buildMeuPanorama({ eventos: [
      ev({ id: 1, tipo: "SOLICITACAO_ADM", cluster: "administrativo", status: "pendente" }),
      ev({ id: 2, tipo: "SOLICITACAO_ADM", cluster: "administrativo", status: "em_curso" }),
      ev({ id: 3, tipo: "SOLICITACAO_ADM", cluster: "administrativo", status: "concluido" }),
    ], substituicoes: [] }, TODAY);
    expect(r.kpis.pedidosPendentes).toBe(2);
  });

  it("counts férias agendadas (FERIAS, previsto|em_curso, not ended)", () => {
    const r = buildMeuPanorama({ eventos: [
      ev({ id: 1, tipo: "FERIAS", status: "previsto", dataFim: "2026-07-10" }),
      ev({ id: 2, tipo: "FERIAS", status: "em_curso", dataFim: null }),
      ev({ id: 3, tipo: "FERIAS", status: "concluido", dataFim: "2026-01-10" }),
      ev({ id: 4, tipo: "FERIAS", status: "previsto", dataFim: "2026-01-01" }), // already ended
    ], substituicoes: [] }, TODAY);
    expect(r.kpis.feriasAgendadas).toBe(2);
  });

  it("picks the nearest upcoming prazo", () => {
    const r = buildMeuPanorama({ eventos: [
      ev({ id: 1, tipo: "SOLICITACAO_ADM", cluster: "administrativo", status: "pendente", prazo: "2026-08-01", titulo: "B" }),
      ev({ id: 2, tipo: "SOLICITACAO_ADM", cluster: "administrativo", status: "pendente", prazo: "2026-07-05", titulo: "A" }),
    ], substituicoes: [] }, TODAY);
    expect(r.kpis.proximoPrazo).toEqual({ titulo: "A", prazo: "2026-07-05", tipo: "SOLICITACAO_ADM" });
  });

  it("agoraProximos includes em_curso now and items within 90-day window, sorted", () => {
    const r = buildMeuPanorama({ eventos: [
      ev({ id: 1, status: "em_curso", dataEvento: "2026-05-01", titulo: "ongoing" }),
      ev({ id: 2, status: "previsto", dataEvento: "2026-07-10", titulo: "soon" }),
      ev({ id: 3, status: "previsto", dataEvento: "2027-01-01", titulo: "far" }), // outside window
    ], substituicoes: [] }, TODAY);
    const ids = r.agoraProximos.map((e) => e.id);
    expect(ids).toContain(1);
    expect(ids).toContain(2);
    expect(ids).not.toContain(3);
  });

  it("summarizes clusters with total/emCurso/pendentes", () => {
    const r = buildMeuPanorama({ eventos: [
      ev({ id: 1, cluster: "ausencias", status: "em_curso" }),
      ev({ id: 2, cluster: "ausencias", status: "pendente" }),
      ev({ id: 3, cluster: "contraprestacao", status: "concluido" }),
    ], substituicoes: [] }, TODAY);
    expect(r.clusters.ausencias.total).toBe(2);
    expect(r.clusters.ausencias.emCurso).toBe(1);
    expect(r.clusters.ausencias.pendentes).toBe(1);
    expect(r.clusters.contraprestacao.total).toBe(1);
    expect(r.clusters.progressao.total).toBe(0);
  });
});
