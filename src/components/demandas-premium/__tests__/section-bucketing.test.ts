import { describe, it, expect } from "vitest";
import {
  normalizeStatusKey,
  effectiveSectionKeys,
  bucketIntoSections,
  type BucketSection,
} from "../section-bucketing";

// ---------------------------------------------------------------------------
// Testes originais — normalização de chave (invariantes de baixo nível)
// ---------------------------------------------------------------------------

describe("normalizeStatusKey", () => {
  it("remove prefixo com hífen ('2 - Elaborar')", () => {
    expect(normalizeStatusKey("2 - Elaborar")).toBe("elaborar");
  });
  it("remove prefixo de enum com underscore ('4_MONITORAR')", () => {
    expect(normalizeStatusKey("4_MONITORAR")).toBe("monitorar");
  });
  it("normaliza acentos e espaços", () => {
    expect(normalizeStatusKey("Diligência Extra")).toBe("diligencia_extra");
  });
  it("trata nulo/vazio", () => {
    expect(normalizeStatusKey(null)).toBe("");
    expect(normalizeStatusKey(undefined)).toBe("");
  });
});

// ---------------------------------------------------------------------------
// Testes novos — roteamento por statusDelegacao (novo modelo)
// ---------------------------------------------------------------------------

const SECOES: BucketSection[] = [
  { label: "Monitorar", statuses: ["monitorar"] },
  { label: "A delegar", statuses: ["a_delegar"] },
  { label: "Delegados", statuses: ["delegado"] },
];

describe("effectiveSectionKeys — delegação por statusDelegacao", () => {
  it("a_delegar vai para a seção 'A delegar'", () => {
    expect(
      effectiveSectionKeys({ id: 1, delegadoPara: "Amanda", statusDelegacao: "a_delegar" }),
    ).toEqual(["a_delegar"]);
  });

  it("delegado vai para a seção 'Delegados'", () => {
    expect(
      effectiveSectionKeys({ id: 2, delegadoPara: "Amanda", statusDelegacao: "delegado" }),
    ).toEqual(["delegado"]);
  });

  it("delegatário presente mas statusDelegacao nulo → cai no status da pipeline (não prende em delegação)", () => {
    const keys = effectiveSectionKeys({
      id: 3,
      delegadoPara: "Amanda",
      statusDelegacao: null,
      substatus: "monitorar",
    });
    expect(keys).toEqual(["monitorar"]);
  });

  it("sem delegação usa o substatus normalizado", () => {
    expect(effectiveSectionKeys({ id: 4, substatus: "4_MONITORAR" })).toEqual(["monitorar"]);
  });

  it("bucketIntoSections distribui nas subseções certas", () => {
    const { perSection } = bucketIntoSections(
      [
        { id: 1, delegadoPara: "Amanda", statusDelegacao: "a_delegar" },
        { id: 2, delegadoPara: "Emilly", statusDelegacao: "delegado" },
        { id: 3, statusDelegacao: null, substatus: "monitorar" },
      ],
      SECOES,
    );
    expect(perSection.get("A delegar")!.map((i) => i.id)).toEqual([1]);
    expect(perSection.get("Delegados")!.map((i) => i.id)).toEqual([2]);
    expect(perSection.get("Monitorar")!.map((i) => i.id)).toEqual([3]);
  });
});

// ---------------------------------------------------------------------------
// Invariante geral (imutável)
// ---------------------------------------------------------------------------

describe("bucketIntoSections — invariante de contagem", () => {
  it("nº distribuídos + leftover == total (nada some)", () => {
    const items = [
      { id: 1, status: "4_MONITORAR", substatus: null },
      { id: 2, delegadoPara: "Amanda", statusDelegacao: "a_delegar" },
      { id: 3, delegadoPara: "Emilly", statusDelegacao: "delegado" },
      { id: 4, status: "ALGO_DESCONHECIDO", substatus: "fase_nova" }, // leftover
    ];
    const { perSection, leftover } = bucketIntoSections(items, SECOES);
    const distribuidos = Array.from(perSection.values()).reduce((n, arr) => n + arr.length, 0);
    expect(distribuidos + leftover.length).toBe(items.length);
    expect(leftover).toHaveLength(1);
  });
});
