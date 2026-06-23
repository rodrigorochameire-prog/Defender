import { describe, it, expect } from "vitest";
import { aplicarAcoesDelito } from "@/lib/promocao/applier-delito";
import type { PromocaoDelitoRepo } from "@/lib/promocao/repo-delito";
import type { CandidatoDelito } from "@/lib/promocao/tipos-delito";

function fakeRepo() {
  const c: Record<string, any[]> = { criar: [], log: [], marcar: [] };
  const repo: PromocaoDelitoRepo = {
    async criarTipificacao(p, delitoId, cand) {
      c.criar.push({ p, delitoId, cand });
      return 42;
    },
    async log(p, acao, cand, delitoId) {
      c.log.push({ p, acao, delitoId, crime: cand.crime });
    },
    async marcarPromovido(p) {
      c.marcar.push(p);
    },
  };
  return { repo, c };
}

const cand = (x: Partial<CandidatoDelito> = {}): CandidatoDelito => ({
  crime: "Homicídio",
  artigoBruto: "121",
  qualificadoras: [],
  majorantes: [],
  minorantes: [],
  fonteRef: "analysis:1",
  confianca: 0.95,
  ...x,
});

describe("aplicarAcoesDelito", () => {
  it("vincular: cria tipificação + log(vincular, delitoId) + marca promovido", async () => {
    const { repo, c } = fakeRepo();
    await aplicarAcoesDelito(repo, 1, [{ tipo: "vincular", candidato: cand({}), delitoId: 7 }]);
    expect(c.criar).toHaveLength(1);
    expect(c.criar[0].delitoId).toBe(7);
    expect(c.log).toHaveLength(1);
    expect(c.log[0].acao).toBe("vincular");
    expect(c.log[0].delitoId).toBe(42); // id da tipificação criada
    expect(c.marcar).toEqual([1]);
  });

  it("sem-correspondencia: NÃO cria tipificação, só loga (delitoId=null)", async () => {
    const { repo, c } = fakeRepo();
    await aplicarAcoesDelito(repo, 1, [{ tipo: "sem-correspondencia", candidato: cand({}) }]);
    expect(c.criar).toHaveLength(0);
    expect(c.log[0].acao).toBe("sem-correspondencia");
    expect(c.log[0].delitoId).toBeNull();
    expect(c.marcar).toEqual([1]);
  });

  it("ignorar: NÃO cria tipificação, só loga com o delitoId", async () => {
    const { repo, c } = fakeRepo();
    await aplicarAcoesDelito(repo, 1, [{ tipo: "ignorar", candidato: cand({}), delitoId: 9, motivo: "manual" }]);
    expect(c.criar).toHaveLength(0);
    expect(c.log[0].acao).toBe("ignorar");
    expect(c.log[0].delitoId).toBe(9);
    expect(c.marcar).toEqual([1]);
  });

  it("marca promovido mesmo com zero ações (liveness do backfill)", async () => {
    const { repo, c } = fakeRepo();
    await aplicarAcoesDelito(repo, 5, []);
    expect(c.criar).toHaveLength(0);
    expect(c.log).toHaveLength(0);
    expect(c.marcar).toEqual([5]);
  });

  it("plano misto preserva ordem e contagens", async () => {
    const { repo, c } = fakeRepo();
    await aplicarAcoesDelito(repo, 3, [
      { tipo: "vincular", candidato: cand({ crime: "A" }), delitoId: 1 },
      { tipo: "sem-correspondencia", candidato: cand({ crime: "B" }) },
      { tipo: "ignorar", candidato: cand({ crime: "C" }), delitoId: 2, motivo: "já promovido" },
    ]);
    expect(c.criar).toHaveLength(1);
    expect(c.log.map((l) => l.acao)).toEqual(["vincular", "sem-correspondencia", "ignorar"]);
    expect(c.marcar).toEqual([3]);
  });
});
