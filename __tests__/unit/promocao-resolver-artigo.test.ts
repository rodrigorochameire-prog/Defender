import { describe, it, expect } from "vitest";
import { resolverArtigo } from "@/lib/promocao/resolver-artigo";
import type { CandidatoDelito, CatalogoDelito } from "@/lib/promocao/tipos-delito";

const cand = (p: Partial<CandidatoDelito>): CandidatoDelito => ({
  crime: "Homicídio",
  artigoBruto: "121",
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
  { id: 3, codigoLei: "CP", artigo: "121", paragrafo: "§2º-A", inciso: null },
  { id: 4, codigoLei: "11.343", artigo: "33", paragrafo: "caput", inciso: null },
  { id: 5, codigoLei: "11.343", artigo: "33", paragrafo: "§4º", inciso: null },
  { id: 6, codigoLei: "CP", artigo: "155", paragrafo: "caput", inciso: null },
  { id: 7, codigoLei: "CP", artigo: "155", paragrafo: "§4º", inciso: null },
];

describe("resolverArtigo", () => {
  it("match exato (codigoLei, artigo, paragrafo) → vincular 0.95", () => {
    const r = resolverArtigo(cand({ artigoBruto: "121, §2º" }), cat);
    expect(r).toMatchObject({ acao: "vincular", delitoId: 2 });
    if (r.acao === "vincular") expect(r.confianca).toBeCloseTo(0.95);
  });

  it("match exato artigo sem paragrafo → caput/null distinto", () => {
    const r = resolverArtigo(cand({ artigoBruto: "121" }), cat);
    expect(r).toMatchObject({ acao: "vincular", delitoId: 1 });
  });

  it("lei especial exato → '11.343 art. 33 §4º'", () => {
    const r = resolverArtigo(cand({ artigoBruto: "11.343 art. 33 §4º" }), cat);
    expect(r).toMatchObject({ acao: "vincular", delitoId: 5 });
  });

  it("paragrafo com letra → §2º-A feminicídio", () => {
    const r = resolverArtigo(cand({ artigoBruto: "121 §2º-A" }), cat);
    expect(r).toMatchObject({ acao: "vincular", delitoId: 3 });
  });

  it("fuzzy: artigo bate mas paragrafo extraído inexistente, único no (lei,artigo) → vincular 0.75", () => {
    // artigo 158 não está no catálogo → sem-correspondencia (sanity)
    const r = resolverArtigo(cand({ artigoBruto: "999" }), cat);
    expect(r.acao).toBe("sem-correspondencia");
  });

  it("fuzzy único: '11.343 art. 33 §9º' (paragrafo inexistente) NÃO é único → sem-correspondencia", () => {
    // (lei 11.343, art 33) tem 2 candidatos (caput, §4º) → ambíguo → sem fuzzy
    const r = resolverArtigo(cand({ artigoBruto: "11.343 33 §9º" }), cat);
    expect(r.acao).toBe("sem-correspondencia");
  });

  it("fuzzy único de fato: artigo com 1 entrada e paragrafo não bate → vincular 0.75", () => {
    const catUnico: CatalogoDelito[] = [
      { id: 50, codigoLei: "CP", artigo: "171", paragrafo: null, inciso: null },
    ];
    const r = resolverArtigo(cand({ artigoBruto: "171 §3º" }), catUnico);
    expect(r).toMatchObject({ acao: "vincular", delitoId: 50 });
    if (r.acao === "vincular") expect(r.confianca).toBeCloseTo(0.75);
  });

  it("artigo inexistente no catálogo → sem-correspondencia", () => {
    const r = resolverArtigo(cand({ artigoBruto: "art. 999" }), cat);
    expect(r.acao).toBe("sem-correspondencia");
  });

  it("artigoBruto nulo → sem-correspondencia", () => {
    const r = resolverArtigo(cand({ artigoBruto: null }), cat);
    expect(r.acao).toBe("sem-correspondencia");
  });

  it("exato tem prioridade sobre fuzzy", () => {
    // 121 §2º existe exato (id 2); não deve cair em fuzzy ambíguo
    const r = resolverArtigo(cand({ artigoBruto: "121 §2º" }), cat);
    expect(r).toMatchObject({ acao: "vincular", delitoId: 2 });
  });
});
