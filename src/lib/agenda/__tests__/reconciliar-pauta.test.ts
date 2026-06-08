import { describe, it, expect } from "vitest";
import { idsParaSuperar, type ExistingAud, type ReconcileInput } from "../reconciliar-pauta";

const windowStart = new Date("2026-06-01T00:00:00-03:00");
const windowEnd = new Date("2026-06-30T23:59:00-03:00");

function build(existing: ExistingAud[], opts?: Partial<ReconcileInput>): ReconcileInput {
  return {
    existing,
    touchedProcessoIds: new Set([10]),
    touchedAudienciaIds: new Set([999]),
    windowStart,
    windowEnd,
    ...opts,
  };
}

describe("idsParaSuperar", () => {
  it("supera slot antigo: mesmo processo tocado, data na janela, agendada, não tocado", () => {
    const aud: ExistingAud = {
      id: 1,
      processoId: 10,
      dataAudiencia: new Date("2026-06-10T09:00:00-03:00"),
      status: "agendada",
    };
    expect(idsParaSuperar(build([aud]))).toEqual([1]);
  });

  it("NÃO supera audiência que foi tocada nesta importação (id em touchedAudienciaIds)", () => {
    const aud: ExistingAud = {
      id: 999,
      processoId: 10,
      dataAudiencia: new Date("2026-06-10T09:00:00-03:00"),
      status: "agendada",
    };
    expect(idsParaSuperar(build([aud]))).toEqual([]);
  });

  it("NÃO supera slot fora da janela da pauta", () => {
    const aud: ExistingAud = {
      id: 2,
      processoId: 10,
      dataAudiencia: new Date("2026-07-15T09:00:00-03:00"),
      status: "agendada",
    };
    expect(idsParaSuperar(build([aud]))).toEqual([]);
  });

  it("NÃO supera audiência já realizada ou cancelada", () => {
    const realizada: ExistingAud = {
      id: 3,
      processoId: 10,
      dataAudiencia: new Date("2026-06-10T09:00:00-03:00"),
      status: "realizada",
    };
    const cancelada: ExistingAud = {
      id: 4,
      processoId: 10,
      dataAudiencia: new Date("2026-06-12T09:00:00-03:00"),
      status: "cancelada",
    };
    expect(idsParaSuperar(build([realizada, cancelada]))).toEqual([]);
  });

  it("NÃO supera audiência de processo não tocado pela pauta", () => {
    const aud: ExistingAud = {
      id: 5,
      processoId: 77,
      dataAudiencia: new Date("2026-06-10T09:00:00-03:00"),
      status: "agendada",
    };
    expect(idsParaSuperar(build([aud]))).toEqual([]);
  });

  it("ignora audiências com processoId nulo", () => {
    const aud: ExistingAud = {
      id: 6,
      processoId: null,
      dataAudiencia: new Date("2026-06-10T09:00:00-03:00"),
      status: "agendada",
    };
    expect(idsParaSuperar(build([aud]))).toEqual([]);
  });
});
