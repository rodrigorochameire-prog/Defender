import { describe, it, expect } from "vitest";
import { planejarCautelares } from "@/lib/promocao/planejar-cautelares";
import type { CandidatoCautelar, CautelarExistente } from "@/lib/promocao/tipos-cautelar";

const cand = (medida: string): CandidatoCautelar => ({
  medida,
  fonteRef: "analysis:1",
  confianca: 0.75,
});

describe("planejarCautelares", () => {
  it("medida com match e sem cautelar prévia → vincular", () => {
    const acoes = planejarCautelares({
      processoId: 1,
      candidatos: [cand("Monitoração eletrônica")],
      existentes: [],
    });
    expect(acoes[0]).toMatchObject({ tipo: "vincular", codigo: "MONITORACAO_ELETRONICA", especie: "diversa" });
  });

  it("sem match na taxonomia → sem-correspondencia", () => {
    const acoes = planejarCautelares({
      processoId: 1,
      candidatos: [cand("medida atípica xyz")],
      existentes: [],
    });
    expect(acoes[0].tipo).toBe("sem-correspondencia");
  });

  it("cautelar 'promocao' já existe p/ mesmo (processo, codigo) → ignorar (idempotente)", () => {
    const ex: CautelarExistente[] = [
      { processoId: 1, codigo: "FIANCA", origem: "promocao" },
    ];
    const acoes = planejarCautelares({ processoId: 1, candidatos: [cand("Fiança")], existentes: ex });
    expect(acoes[0]).toMatchObject({ tipo: "ignorar", codigo: "FIANCA" });
  });

  it("cautelar 'parser' já existe p/ mesmo codigo → ignorar (não duplica parser)", () => {
    const ex: CautelarExistente[] = [
      { processoId: 1, codigo: "FIANCA", origem: "parser" },
    ];
    const acoes = planejarCautelares({ processoId: 1, candidatos: [cand("Fiança")], existentes: ex });
    expect(acoes[0]).toMatchObject({ tipo: "ignorar", codigo: "FIANCA" });
  });

  it("cautelar 'manual' já existe p/ mesmo codigo → ignorar (soberania manual)", () => {
    const ex: CautelarExistente[] = [
      { processoId: 1, codigo: "FIANCA", origem: "manual" },
    ];
    const acoes = planejarCautelares({ processoId: 1, candidatos: [cand("Fiança")], existentes: ex });
    expect(acoes[0]).toMatchObject({ tipo: "ignorar", codigo: "FIANCA" });
  });

  it("codigo diferente já existe → vincular (nova cautelar)", () => {
    const ex: CautelarExistente[] = [
      { processoId: 1, codigo: "MONITORACAO_ELETRONICA", origem: "promocao" },
    ];
    const acoes = planejarCautelares({ processoId: 1, candidatos: [cand("Fiança")], existentes: ex });
    expect(acoes[0]).toMatchObject({ tipo: "vincular", codigo: "FIANCA" });
  });

  it("cautelar de OUTRO processo não bloqueia → vincular", () => {
    const ex: CautelarExistente[] = [
      { processoId: 99, codigo: "FIANCA", origem: "promocao" },
    ];
    const acoes = planejarCautelares({ processoId: 1, candidatos: [cand("Fiança")], existentes: ex });
    expect(acoes[0]).toMatchObject({ tipo: "vincular", codigo: "FIANCA" });
  });

  it("vários candidatos preservam ordem; sem-correspondencia passa adiante", () => {
    const acoes = planejarCautelares({
      processoId: 1,
      candidatos: [cand("Fiança"), cand("atípico xyz"), cand("Prisão preventiva")],
      existentes: [],
    });
    expect(acoes[0]).toMatchObject({ tipo: "vincular", codigo: "FIANCA" });
    expect(acoes[1].tipo).toBe("sem-correspondencia");
    expect(acoes[2]).toMatchObject({ tipo: "vincular", codigo: "PRISAO_PREVENTIVA" });
  });

  it("dois candidatos mesmo codigo no MESMO lote: 2º vira ignorar não é garantido por estado de DB; sem estado prévio ambos vinculam", () => {
    // O planejador é puro sobre `existentes` (estado de DB). Dois candidatos do
    // mesmo lote que resolvem para o mesmo codigo, sem cautelar prévia, ambos
    // vinculam — a deduplicação intra-lote não é responsabilidade do planejador.
    const acoes = planejarCautelares({
      processoId: 1,
      candidatos: [cand("Fiança"), cand("arbitrada a fiança")],
      existentes: [],
    });
    expect(acoes[0].tipo).toBe("vincular");
    expect(acoes[1].tipo).toBe("vincular");
  });
});
