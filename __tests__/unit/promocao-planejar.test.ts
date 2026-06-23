import { describe, it, expect } from "vitest";
import { planejarPromocao } from "@/lib/promocao/planejar";
import type { CandidatoPessoa, PessoaExistente, ParticipacaoExistente } from "@/lib/promocao/tipos";

const cand = (p: Partial<CandidatoPessoa>): CandidatoPessoa => ({ nome: "Zé", papel: "testemunha", fonteRef: "f", confianca: 0.9, ...p });

describe("planejarPromocao", () => {
  it("não toca participação manual existente (idempotência + soberania manual)", () => {
    const acoes = planejarPromocao({
      processoId: 1,
      candidatos: [cand({ cpf: "1" })],
      existentes: [{ id: 5, nomeNormalizado: "ze", nomesAlternativos: [], cpf: "1", dataNascimento: null }],
      participacoes: [{ pessoaId: 5, processoId: 1, papel: "testemunha", origem: "manual" }],
    });
    expect(acoes[0]).toMatchObject({ tipo: "ignorar" });
  });
  it("participação auto existente → vincular com atualizar=true", () => {
    const acoes = planejarPromocao({
      processoId: 1,
      candidatos: [cand({ cpf: "1" })],
      existentes: [{ id: 5, nomeNormalizado: "ze", nomesAlternativos: [], cpf: "1", dataNascimento: null }],
      participacoes: [{ pessoaId: 5, processoId: 1, papel: "testemunha", origem: "promocao" }],
    });
    expect(acoes[0]).toMatchObject({ tipo: "vincular", pessoaId: 5, atualizar: true });
  });
  it("sem match → criar", () => {
    const acoes = planejarPromocao({ processoId: 1, candidatos: [cand({})], existentes: [], participacoes: [] });
    expect(acoes[0].tipo).toBe("criar");
  });

  it("idempotência de só-nome: candidato cuja provisória de promoção já existe no processo → ignorar (não re-cria)", () => {
    // Simula a 2ª rodada: na 1ª, o candidato só-nome virou pessoa 9 (provisória,
    // origem='promocao'). Na 2ª, o resolvedor casa por nome (revisar) — mas como
    // já há participação de promoção dessa pessoa neste processo+papel, ignora.
    const acoes = planejarPromocao({
      processoId: 1,
      candidatos: [cand({})], // só nome, sem CPF/nascimento
      existentes: [{ id: 9, nomeNormalizado: "ze", nomesAlternativos: [], cpf: null, dataNascimento: null }],
      participacoes: [{ pessoaId: 9, processoId: 1, papel: "testemunha", origem: "promocao" }],
    });
    expect(acoes[0]).toMatchObject({ tipo: "ignorar" });
  });

  it("só-nome sem promoção prévia ainda vai para revisar", () => {
    const acoes = planejarPromocao({
      processoId: 1,
      candidatos: [cand({})],
      existentes: [{ id: 9, nomeNormalizado: "ze", nomesAlternativos: [], cpf: null, dataNascimento: null }],
      participacoes: [], // nenhuma participação prévia
    });
    expect(acoes[0].tipo).toBe("revisar");
  });
});
