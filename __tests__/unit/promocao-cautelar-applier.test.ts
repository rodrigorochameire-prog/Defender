import { describe, it, expect } from "vitest";
import { aplicarAcoesCautelar } from "@/lib/promocao/applier-cautelar";
import type { PromocaoCautelarRepo } from "@/lib/promocao/repo-cautelar";
import type { CandidatoCautelar } from "@/lib/promocao/tipos-cautelar";

function fakeRepo() {
  const c: Record<string, any[]> = { criar: [], log: [], marcar: [] };
  const repo: PromocaoCautelarRepo = {
    async criarCautelar(p, dados, cand) {
      c.criar.push({ p, dados, medida: cand.medida });
      return 42;
    },
    async log(p, acao, cand, cautelarId) {
      c.log.push({ p, acao, cautelarId, medida: cand.medida });
    },
    async marcarPromovido(p) {
      c.marcar.push(p);
    },
  };
  return { repo, c };
}

const cand = (medida = "Fiança"): CandidatoCautelar => ({
  medida,
  fonteRef: "analysis:1",
  confianca: 0.75,
});

describe("aplicarAcoesCautelar", () => {
  it("vincular: cria cautelar + log(vincular, id) + marca promovido", async () => {
    const { repo, c } = fakeRepo();
    await aplicarAcoesCautelar(repo, 1, [
      { tipo: "vincular", candidato: cand(), codigo: "FIANCA", especie: "diversa", artigo: "319, VIII" },
    ]);
    expect(c.criar).toHaveLength(1);
    expect(c.criar[0].dados).toMatchObject({ codigo: "FIANCA", especie: "diversa", artigo: "319, VIII" });
    expect(c.log[0].acao).toBe("vincular");
    expect(c.log[0].cautelarId).toBe(42); // id da cautelar criada
    expect(c.marcar).toEqual([1]);
  });

  it("sem-correspondencia: NÃO cria cautelar, só loga (cautelarId=null)", async () => {
    const { repo, c } = fakeRepo();
    await aplicarAcoesCautelar(repo, 1, [{ tipo: "sem-correspondencia", candidato: cand("xyz") }]);
    expect(c.criar).toHaveLength(0);
    expect(c.log[0].acao).toBe("sem-correspondencia");
    expect(c.log[0].cautelarId).toBeNull();
    expect(c.marcar).toEqual([1]);
  });

  it("ignorar: NÃO cria cautelar, só loga (cautelarId=null)", async () => {
    const { repo, c } = fakeRepo();
    await aplicarAcoesCautelar(repo, 1, [
      { tipo: "ignorar", candidato: cand(), codigo: "FIANCA", motivo: "já existe" },
    ]);
    expect(c.criar).toHaveLength(0);
    expect(c.log[0].acao).toBe("ignorar");
    expect(c.log[0].cautelarId).toBeNull();
    expect(c.marcar).toEqual([1]);
  });

  it("marca promovido mesmo com zero ações (liveness do backfill)", async () => {
    const { repo, c } = fakeRepo();
    await aplicarAcoesCautelar(repo, 5, []);
    expect(c.log).toHaveLength(0);
    expect(c.marcar).toEqual([5]);
  });

  it("plano misto preserva ordem e contagens", async () => {
    const { repo, c } = fakeRepo();
    await aplicarAcoesCautelar(repo, 3, [
      { tipo: "vincular", candidato: cand("A"), codigo: "FIANCA", especie: "diversa", artigo: "319, VIII" },
      { tipo: "sem-correspondencia", candidato: cand("B") },
      { tipo: "ignorar", candidato: cand("C"), codigo: "X", motivo: "dup" },
    ]);
    expect(c.criar).toHaveLength(1);
    expect(c.log.map((l) => l.acao)).toEqual(["vincular", "sem-correspondencia", "ignorar"]);
    expect(c.marcar).toEqual([3]);
  });
});
