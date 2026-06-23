import { describe, it, expect } from "vitest";
import { planejarLocais } from "@/lib/promocao/planejar-locais";
import type { CandidatoLugar, LugarExistente, ParticipacaoLugarExistente } from "@/lib/promocao/tipos-lugar";

const cand = (p: Partial<CandidatoLugar>): CandidatoLugar => ({
  enderecoCompleto: "Rua das Flores, 123, Centro",
  tipo: "local-do-fato",
  fonteRef: "analysis:1",
  confianca: 0.75,
  ...p,
});

const lugarFlores: LugarExistente = { id: 9, enderecoNormalizado: "rua das flores 123 centro" };

describe("planejarLocais", () => {
  it("sem lugar existente → criar", () => {
    const acoes = planejarLocais({ processoId: 1, candidatos: [cand({})], existentes: [], participacoes: [] });
    expect(acoes[0]).toMatchObject({ tipo: "criar" });
  });

  it("lugar existe e sem participação prévia → vincular", () => {
    const acoes = planejarLocais({
      processoId: 1,
      candidatos: [cand({})],
      existentes: [lugarFlores],
      participacoes: [],
    });
    expect(acoes[0]).toMatchObject({ tipo: "vincular", lugarId: 9 });
  });

  it("participação (processo, lugar, tipo) já existe → ignorar (idempotente)", () => {
    const part: ParticipacaoLugarExistente[] = [
      { lugarId: 9, processoId: 1, tipo: "local-do-fato", fonte: "promocao" },
    ];
    const acoes = planejarLocais({
      processoId: 1,
      candidatos: [cand({})],
      existentes: [lugarFlores],
      participacoes: part,
    });
    expect(acoes[0]).toMatchObject({ tipo: "ignorar", lugarId: 9 });
  });

  it("participação manual com mesmo (processo, lugar, tipo) → ignorar (protege manual)", () => {
    const part: ParticipacaoLugarExistente[] = [
      { lugarId: 9, processoId: 1, tipo: "local-do-fato", fonte: "manual" },
    ];
    const acoes = planejarLocais({
      processoId: 1,
      candidatos: [cand({})],
      existentes: [lugarFlores],
      participacoes: part,
    });
    expect(acoes[0]).toMatchObject({ tipo: "ignorar", lugarId: 9 });
  });

  it("mesmo lugar mas TIPO diferente → vincular (nova participação)", () => {
    const part: ParticipacaoLugarExistente[] = [
      { lugarId: 9, processoId: 1, tipo: "local-do-fato", fonte: "promocao" },
    ];
    const acoes = planejarLocais({
      processoId: 1,
      candidatos: [cand({ tipo: "endereco-assistido" })],
      existentes: [lugarFlores],
      participacoes: part,
    });
    expect(acoes[0]).toMatchObject({ tipo: "vincular", lugarId: 9 });
  });

  it("participação de OUTRO processo não bloqueia → vincular", () => {
    const part: ParticipacaoLugarExistente[] = [
      { lugarId: 9, processoId: 99, tipo: "local-do-fato", fonte: "promocao" },
    ];
    const acoes = planejarLocais({
      processoId: 1,
      candidatos: [cand({})],
      existentes: [lugarFlores],
      participacoes: part,
    });
    expect(acoes[0]).toMatchObject({ tipo: "vincular", lugarId: 9 });
  });

  it("vários candidatos preservam ordem de entrada", () => {
    const acoes = planejarLocais({
      processoId: 1,
      candidatos: [cand({}), cand({ enderecoCompleto: "Rua Nova, 5" })],
      existentes: [lugarFlores],
      participacoes: [],
    });
    expect(acoes[0]).toMatchObject({ tipo: "vincular", lugarId: 9 });
    expect(acoes[1]).toMatchObject({ tipo: "criar" });
  });
});
