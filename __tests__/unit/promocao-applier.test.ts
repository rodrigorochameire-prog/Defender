import { describe, it, expect } from "vitest";
import { aplicarAcoes } from "@/lib/promocao/applier";
import type { PromocaoRepo } from "@/lib/promocao/repo";

function fakeRepo() {
  const c: Record<string, any[]> = { criarPessoa: [], inserir: [], atualizar: [], log: [], marcar: [] };
  const repo: PromocaoRepo = {
    async criarPessoa(cand, fonte) { c.criarPessoa.push({ cand, fonte }); return 99; },
    async inserirParticipacao(p, id, cand) { c.inserir.push({ p, id, cand }); },
    async atualizarParticipacao(p, id, cand) { c.atualizar.push({ p, id, cand }); },
    async log(p, acao, cand, id, ids) { c.log.push({ p, acao, id, ids }); },
    async marcarPromovido(p) { c.marcar.push(p); },
  };
  return { repo, c };
}
const cand = (x: any) => ({ nome: "N", papel: "testemunha", fonteRef: "f", confianca: 0.8, ...x });

describe("aplicarAcoes", () => {
  it("criar: cria pessoa + participação + log + marca promovido", async () => {
    const { repo, c } = fakeRepo();
    await aplicarAcoes(repo, 1, null, [{ tipo: "criar", candidato: cand({}) } as any]);
    expect(c.criarPessoa).toHaveLength(1);
    expect(c.criarPessoa[0].fonte).toBe("promocao-auto");
    expect(c.inserir).toHaveLength(1);
    expect(c.log[0].acao).toBe("criar");
    expect(c.marcar).toEqual([1]);
  });
  it("vincular atualizar=true → atualiza, não insere", async () => {
    const { repo, c } = fakeRepo();
    await aplicarAcoes(repo, 1, null, [{ tipo: "vincular", candidato: cand({}), pessoaId: 5, atualizar: true } as any]);
    expect(c.atualizar).toHaveLength(1);
    expect(c.inserir).toHaveLength(0);
  });
  it("revisar → pessoa provisória + log com candidatosIds", async () => {
    const { repo, c } = fakeRepo();
    await aplicarAcoes(repo, 1, null, [{ tipo: "revisar", candidato: cand({}), candidatosIds: [3, 4] } as any]);
    expect(c.criarPessoa[0].fonte).toBe("promocao-revisao");
    expect(c.log[0].ids).toEqual([3, 4]);
  });
  it("ignorar → só loga", async () => {
    const { repo, c } = fakeRepo();
    await aplicarAcoes(repo, 1, null, [{ tipo: "ignorar", candidato: cand({}), motivo: "manual" } as any]);
    expect(c.criarPessoa).toHaveLength(0);
    expect(c.log[0].acao).toBe("ignorar");
  });
});
