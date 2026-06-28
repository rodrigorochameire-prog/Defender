import { describe, it, expect } from "vitest";
import { buildCoberturaRollup, faltandoSteps, type AfastamentoLite, type SubstituicaoLite, type UserLite } from "../cobertura-rollup";

const TODAY = "2026-06-28";
const users: UserLite[] = [
  { id: 1, name: "Ana" }, { id: 2, name: "Bruno" }, { id: 3, name: "Carla" },
];

function af(p: Partial<AfastamentoLite>): AfastamentoLite {
  return { id: 1, defensorId: 1, substitutoId: 2, dataInicio: "2026-06-01", dataFim: "2026-07-15", ativo: true, tipo: "FERIAS", ...p };
}
function sub(p: Partial<SubstituicaoLite>): SubstituicaoLite {
  return { id: 1, defensorId: 2, afastamentoId: null, unidadeSubstituida: "7ª DP", status: "em_andamento", oficioNumero: null, relatorioPath: null, seiProtocolo: null, ...p };
}

describe("faltandoSteps", () => {
  it("lists the missing gratification steps", () => {
    expect(faltandoSteps(sub({}))).toEqual(["ofício", "relatório", "SEI"]);
    expect(faltandoSteps(sub({ oficioNumero: "12", relatorioPath: "/r", seiProtocolo: "X" }))).toEqual([]);
  });
});

describe("buildCoberturaRollup", () => {
  it("counts afastados hoje (active, today within period)", () => {
    const r = buildCoberturaRollup({
      afastamentos: [
        af({ id: 1, dataInicio: "2026-06-01", dataFim: "2026-07-15" }),       // contains today
        af({ id: 2, dataInicio: "2026-01-01", dataFim: "2026-02-01" }),       // past
        af({ id: 3, dataInicio: "2026-06-10", dataFim: null, ativo: true }),  // open-ended, started
      ],
      substituicoes: [], users,
    }, TODAY);
    expect(r.kpis.afastadosHoje).toBe(2);
  });

  it("semCobertura = active afastamentos with no linked substituição", () => {
    const r = buildCoberturaRollup({
      afastamentos: [af({ id: 1 }), af({ id: 2 })],
      substituicoes: [sub({ id: 9, afastamentoId: 1 })], // covers afastamento 1 only
      users,
    }, TODAY);
    expect(r.kpis.semCobertura).toBe(1);
  });

  it("cobertura row links substituto and gratification status", () => {
    const r = buildCoberturaRollup({
      afastamentos: [af({ id: 1, defensorId: 1, substitutoId: 2 })],
      substituicoes: [sub({ id: 9, afastamentoId: 1, status: "oficiada" })],
      users,
    }, TODAY);
    expect(r.cobertura[0]).toMatchObject({
      afastamentoId: 1, defensorAfastado: "Ana", defensorSubstituto: "Bruno",
      substituicaoId: 9, statusGratificacao: "oficiada",
    });
  });

  it("cobertura statusGratificacao null when no linked substituição", () => {
    const r = buildCoberturaRollup({ afastamentos: [af({ id: 1 })], substituicoes: [], users }, TODAY);
    expect(r.cobertura[0].statusGratificacao).toBeNull();
    expect(r.cobertura[0].substituicaoId).toBeNull();
  });

  it("kpis: gratificacoes a oficiar (concluida) and a pagar (oficiada)", () => {
    const r = buildCoberturaRollup({
      afastamentos: [],
      substituicoes: [sub({ id: 1, status: "concluida" }), sub({ id: 2, status: "oficiada" }), sub({ id: 3, status: "paga" })],
      users,
    }, TODAY);
    expect(r.kpis.gratificacoesAOficiar).toBe(1);
    expect(r.kpis.gratificacoesAPagar).toBe(1);
    expect(r.kpis.substituicoesAbertas).toBe(2); // not paga
  });

  it("pendencias lists open substituições with missing steps", () => {
    const r = buildCoberturaRollup({
      afastamentos: [],
      substituicoes: [sub({ id: 1, defensorId: 2, status: "concluida", oficioNumero: "10" })],
      users,
    }, TODAY);
    expect(r.pendencias[0]).toMatchObject({ substituicaoId: 1, defensorSubstituto: "Bruno", faltando: ["relatório", "SEI"] });
  });

  it("porDefensor counts open substituições and active afastamento per user", () => {
    const r = buildCoberturaRollup({
      afastamentos: [af({ id: 1, defensorId: 1, ativo: true, dataInicio: "2026-06-01", dataFim: "2026-07-15" })],
      substituicoes: [sub({ id: 1, defensorId: 2, status: "em_andamento" })],
      users,
    }, TODAY);
    const ana = r.porDefensor.find((d) => d.defensorId === 1)!;
    const bruno = r.porDefensor.find((d) => d.defensorId === 2)!;
    expect(ana.afastamentoAtivo).toBe(true);
    expect(bruno.substituicoesAbertas).toBe(1);
  });
});
