import { describe, it, expect } from "vitest";
import { resolverIdentidade } from "@/lib/promocao/resolver-identidade";
import type { CandidatoPessoa, PessoaExistente } from "@/lib/promocao/tipos";

const cand = (p: Partial<CandidatoPessoa>): CandidatoPessoa => ({
  nome: "José da Silva", papel: "testemunha", fonteRef: "x", confianca: 0.9, ...p,
});
const ex = (p: Partial<PessoaExistente>): PessoaExistente => ({
  id: 1, nomeNormalizado: "jose da silva", nomesAlternativos: [], cpf: null, dataNascimento: null, ...p,
});

describe("resolverIdentidade", () => {
  it("CPF igual → vincular alta confiança", () => {
    const r = resolverIdentidade(cand({ cpf: "111.222.333-44" }), [ex({ id: 7, cpf: "111.222.333-44" })]);
    expect(r).toMatchObject({ acao: "vincular", pessoaId: 7 });
    expect(r.confianca).toBeGreaterThanOrEqual(0.95);
  });
  it("sem CPF, nome+nascimento batem em 1 → vincular", () => {
    const r = resolverIdentidade(
      cand({ dataNascimento: "1990-05-10" }),
      [ex({ id: 3, dataNascimento: "1990-05-10" })]);
    expect(r).toMatchObject({ acao: "vincular", pessoaId: 3 });
  });
  it("nome-só batendo em ≥1 → revisar com candidatosIds", () => {
    const r = resolverIdentidade(cand({}), [ex({ id: 3 }), ex({ id: 4 })]);
    expect(r.acao).toBe("revisar");
    if (r.acao === "revisar") expect(r.candidatosIds).toEqual([3, 4]);
  });
  it("nenhum match → criar", () => {
    const r = resolverIdentidade(cand({ nome: "Maria Outra" }), [ex({ id: 3 })]);
    expect(r.acao).toBe("criar");
  });
  it("match via nomesAlternativos conta como nome-só", () => {
    const r = resolverIdentidade(cand({}), [ex({ id: 9, nomeNormalizado: "outro nome", nomesAlternativos: ["jose da silva"] })]);
    expect(r.acao).toBe("revisar");
  });
});

// NOTA: a exclusão de pares confirmados-distintos (pessoasDistinctsConfirmed)
// NÃO é do resolvedor — o candidato não tem id. Esse filtro já vive na
// merge-queue existente (suggestMerges), que exclui pares confirmados distintos
// entre pessoas EXISTENTES. O resolvedor só decide vincular/criar/revisar.
