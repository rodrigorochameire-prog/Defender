import { describe, it, expect } from "vitest";
import { aplicarAcoesLugar } from "@/lib/promocao/applier-lugar";
import type { PromocaoLugarRepo } from "@/lib/promocao/repo-lugar";
import type { CandidatoLugar } from "@/lib/promocao/tipos-lugar";

function fakeRepo() {
  const c: Record<string, any[]> = { criar: [], part: [], log: [], marcar: [] };
  const repo: PromocaoLugarRepo = {
    async criarLugar(cand, ws) {
      c.criar.push({ cand, ws });
      return 42;
    },
    async inserirParticipacao(p, lugarId, cand) {
      c.part.push({ p, lugarId, tipo: cand.tipo });
    },
    async log(p, acao, cand, lugarId) {
      c.log.push({ p, acao, lugarId, endereco: cand.enderecoCompleto });
    },
    async marcarPromovido(p) {
      c.marcar.push(p);
    },
  };
  return { repo, c };
}

const cand = (x: Partial<CandidatoLugar> = {}): CandidatoLugar => ({
  enderecoCompleto: "Rua A, 1",
  tipo: "local-do-fato",
  fonteRef: "analysis:1",
  confianca: 0.75,
  ...x,
});

describe("aplicarAcoesLugar", () => {
  it("criar: cria lugar + participação (com id criado) + log + marca promovido", async () => {
    const { repo, c } = fakeRepo();
    await aplicarAcoesLugar(repo, 1, 7, [{ tipo: "criar", candidato: cand({}) }]);
    expect(c.criar).toHaveLength(1);
    expect(c.criar[0].ws).toBe(7);
    expect(c.part).toHaveLength(1);
    expect(c.part[0].lugarId).toBe(42); // id do lugar criado
    expect(c.log[0].acao).toBe("criar");
    expect(c.log[0].lugarId).toBe(42);
    expect(c.marcar).toEqual([1]);
  });

  it("vincular: NÃO cria lugar, cria participação no lugar existente + log", async () => {
    const { repo, c } = fakeRepo();
    await aplicarAcoesLugar(repo, 1, 7, [{ tipo: "vincular", candidato: cand({}), lugarId: 9 }]);
    expect(c.criar).toHaveLength(0);
    expect(c.part[0].lugarId).toBe(9);
    expect(c.log[0].acao).toBe("vincular");
    expect(c.log[0].lugarId).toBe(9);
    expect(c.marcar).toEqual([1]);
  });

  it("ignorar: NÃO cria nada, só loga com o lugarId", async () => {
    const { repo, c } = fakeRepo();
    await aplicarAcoesLugar(repo, 1, 7, [{ tipo: "ignorar", candidato: cand({}), lugarId: 9, motivo: "manual" }]);
    expect(c.criar).toHaveLength(0);
    expect(c.part).toHaveLength(0);
    expect(c.log[0].acao).toBe("ignorar");
    expect(c.log[0].lugarId).toBe(9);
    expect(c.marcar).toEqual([1]);
  });

  it("marca promovido mesmo com zero ações (liveness do backfill)", async () => {
    const { repo, c } = fakeRepo();
    await aplicarAcoesLugar(repo, 5, 7, []);
    expect(c.log).toHaveLength(0);
    expect(c.marcar).toEqual([5]);
  });

  it("plano misto preserva ordem", async () => {
    const { repo, c } = fakeRepo();
    await aplicarAcoesLugar(repo, 3, 7, [
      { tipo: "criar", candidato: cand({ enderecoCompleto: "A" }) },
      { tipo: "vincular", candidato: cand({ enderecoCompleto: "B" }), lugarId: 2 },
      { tipo: "ignorar", candidato: cand({ enderecoCompleto: "C" }), lugarId: 3, motivo: "x" },
    ]);
    expect(c.log.map((l) => l.acao)).toEqual(["criar", "vincular", "ignorar"]);
    expect(c.marcar).toEqual([3]);
  });
});
