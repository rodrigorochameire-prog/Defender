import { describe, it, expect } from "vitest";
import {
  montarInputPrescricao,
  avaliarPrescricaoExecucao,
  type ExecucaoParaPrescricao,
  type EventoParaPrescricao,
} from "@/lib/execucao/reader";

const HOJE = new Date("2026-06-22T12:00:00");
const diasAtras = (n: number) =>
  new Date(HOJE.getTime() - n * 86400000).toISOString().slice(0, 10);

const baseExec: ExecucaoParaPrescricao = {
  penaAnos: 8,
  penaMeses: 0,
  penaDias: 0,
  detracaoDias: 0,
  reincidente: false,
  menor21NoFato: false,
  maior70NaSentenca: false,
  inicioCumprimento: diasAtras(2000),
  transitoJulgadoData: diasAtras(2100),
  situacao: "preso",
};

describe("montarInputPrescricao", () => {
  it("converte pena anos/meses/dias em dias (365/30/1)", () => {
    const input = montarInputPrescricao(
      { ...baseExec, penaAnos: 2, penaMeses: 3, penaDias: 10 },
      [],
      HOJE,
    );
    expect(input!.penaTotalDias).toBe(2 * 365 + 3 * 30 + 10);
  });

  it("soma remições dos eventos e usa detração do título", () => {
    const eventos: EventoParaPrescricao[] = [
      { tipo: "remissao", dados: { dias: 30 } },
      { tipo: "remissao", dados: { dias: 15 } },
      { tipo: "progressao", dados: {} },
    ];
    const input = montarInputPrescricao(
      { ...baseExec, detracaoDias: 40 },
      eventos,
      HOJE,
    );
    expect(input!.diasRemidos).toBe(45);
    expect(input!.diasDetraidos).toBe(40);
  });

  it("marcoInterruptivo usa início do cumprimento quando presente", () => {
    const input = montarInputPrescricao(baseExec, [], HOJE);
    expect(input!.marcoInterruptivo).toBe(diasAtras(2000));
  });

  it("cai para trânsito em julgado quando não há início de cumprimento", () => {
    const input = montarInputPrescricao(
      { ...baseExec, inicioCumprimento: null },
      [],
      HOJE,
    );
    expect(input!.marcoInterruptivo).toBe(diasAtras(2100));
  });

  it("retorna null sem início de cumprimento nem trânsito", () => {
    const input = montarInputPrescricao(
      { ...baseExec, inicioCumprimento: null, transitoJulgadoData: null },
      [],
      HOJE,
    );
    expect(input).toBeNull();
  });
});

describe("avaliarPrescricaoExecucao (reader + cálculo)", () => {
  it("detecta prescrição iminente com dado realista", () => {
    // pena 8a = 2920d; cumprido 2000d → residual 920d ≈ 2,5a → art.109: 8a=2920d prazo
    // decorrido (desde início 2000d) ~2000; faltam ~920 → ainda distante? testar limites
    const flag = avaliarPrescricaoExecucao(
      { ...baseExec, penaAnos: 8, inicioCumprimento: diasAtras(2850) },
      [],
      HOJE,
    );
    // residual = 2920 - 2850 = 70d (<1a) → prazo 3a=1095; decorrido 2850 → já consumada
    expect(flag).toBeTruthy();
    expect(flag!.nivel).toBe("red");
  });

  it("retorna null quando não há base temporal", () => {
    const flag = avaliarPrescricaoExecucao(
      { ...baseExec, inicioCumprimento: null, transitoJulgadoData: null },
      [],
      HOJE,
    );
    expect(flag).toBeNull();
  });
});
