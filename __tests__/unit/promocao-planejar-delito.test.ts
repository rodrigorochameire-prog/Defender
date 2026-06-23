import { describe, it, expect } from "vitest";
import { planejarDelitos } from "@/lib/promocao/planejar-delito";
import type { CandidatoDelito, CatalogoDelito, TipificacaoExistente } from "@/lib/promocao/tipos-delito";

const cand = (p: Partial<CandidatoDelito>): CandidatoDelito => ({
  crime: "Homicídio qualificado",
  artigoBruto: "121, §2º",
  qualificadoras: [],
  majorantes: [],
  minorantes: [],
  fonteRef: "analysis:1",
  confianca: 0.75,
  ...p,
});

const cat: CatalogoDelito[] = [
  { id: 1, codigoLei: "CP", artigo: "121", paragrafo: null, inciso: null },
  { id: 2, codigoLei: "CP", artigo: "121", paragrafo: "§2º", inciso: null },
];

describe("planejarDelitos", () => {
  it("candidato com match e sem tipificação prévia → vincular", () => {
    const acoes = planejarDelitos({ processoId: 1, candidatos: [cand({})], catalogo: cat, tipificacoes: [] });
    expect(acoes[0]).toMatchObject({ tipo: "vincular", delitoId: 2 });
  });

  it("sem match no catálogo → sem-correspondencia", () => {
    const acoes = planejarDelitos({
      processoId: 1,
      candidatos: [cand({ artigoBruto: "art. 999" })],
      catalogo: cat,
      tipificacoes: [],
    });
    expect(acoes[0].tipo).toBe("sem-correspondencia");
  });

  it("tipificação 'promocao' já existe p/ mesmo (delito, qualificadoras) → ignorar (idempotente)", () => {
    const tip: TipificacaoExistente[] = [
      { processoId: 1, delitoId: 2, qualificadoras: [], origem: "promocao" },
    ];
    const acoes = planejarDelitos({ processoId: 1, candidatos: [cand({})], catalogo: cat, tipificacoes: tip });
    expect(acoes[0]).toMatchObject({ tipo: "ignorar", delitoId: 2 });
  });

  it("tipificação 'manual' existe p/ mesmo delito → ignorar (soberania manual)", () => {
    const tip: TipificacaoExistente[] = [
      { processoId: 1, delitoId: 2, qualificadoras: [], origem: "manual" },
    ];
    const acoes = planejarDelitos({ processoId: 1, candidatos: [cand({})], catalogo: cat, tipificacoes: tip });
    expect(acoes[0]).toMatchObject({ tipo: "ignorar", delitoId: 2 });
  });

  it("mesmo delito mas qualificadoras diferentes → vincular (nova tipificação)", () => {
    const tip: TipificacaoExistente[] = [
      { processoId: 1, delitoId: 2, qualificadoras: ["motivo fútil"], origem: "promocao" },
    ];
    const acoes = planejarDelitos({
      processoId: 1,
      candidatos: [cand({ qualificadoras: ["feminicídio"] })],
      catalogo: cat,
      tipificacoes: tip,
    });
    expect(acoes[0]).toMatchObject({ tipo: "vincular", delitoId: 2 });
  });

  it("qualificadoras iguais em ordem diferente → tratado como mesmo (ignorar)", () => {
    const tip: TipificacaoExistente[] = [
      { processoId: 1, delitoId: 2, qualificadoras: ["b", "a"], origem: "promocao" },
    ];
    const acoes = planejarDelitos({
      processoId: 1,
      candidatos: [cand({ qualificadoras: ["a", "b"] })],
      catalogo: cat,
      tipificacoes: tip,
    });
    expect(acoes[0].tipo).toBe("ignorar");
  });

  it("vários candidatos: ordena ações na ordem de entrada", () => {
    const acoes = planejarDelitos({
      processoId: 1,
      candidatos: [cand({ artigoBruto: "121" }), cand({ artigoBruto: "art. 999" })],
      catalogo: cat,
      tipificacoes: [],
    });
    expect(acoes[0]).toMatchObject({ tipo: "vincular", delitoId: 1 });
    expect(acoes[1].tipo).toBe("sem-correspondencia");
  });
});
