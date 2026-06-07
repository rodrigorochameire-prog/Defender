import { describe, it, expect } from "vitest";
import {
  normalizeStatusKey,
  effectiveSectionKeys,
  bucketIntoSections,
  type BucketSection,
} from "../section-bucketing";

// Espelha SUB_GROUP_SECTIONS.acompanhar de @/config/demanda-status
const ACOMPANHAR: BucketSection[] = [
  { label: "Monitorar", statuses: ["monitorar"] },
  { label: "Delegação", statuses: ["delegar"] },
];

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

describe("effectiveSectionKeys", () => {
  it("demanda delegada → ['delegar'] (ignora status base)", () => {
    expect(effectiveSectionKeys({ id: 1, status: "5_TRIAGEM", substatus: "triagem", delegadoPara: "Juliane" }))
      .toEqual(["delegar"]);
  });
  it("não delegada → chave do substatus", () => {
    expect(effectiveSectionKeys({ id: 2, status: "4_MONITORAR", substatus: null })).toEqual(["monitorar"]);
  });
});

describe("bucketIntoSections — acompanhar", () => {
  it("demanda #996 (status 4_MONITORAR, substatus null) cai em Monitorar (não some)", () => {
    const { perSection, leftover } = bucketIntoSections(
      [{ id: 996, status: "4_MONITORAR", substatus: null }],
      ACOMPANHAR,
    );
    expect(perSection.get("Monitorar")).toHaveLength(1);
    expect(leftover).toHaveLength(0);
  });

  it("demanda #1057 (delegada, substatus 'triagem') cai em Delegação (não some)", () => {
    const { perSection, leftover } = bucketIntoSections(
      [{ id: 1057, status: "5_TRIAGEM", substatus: "triagem", delegadoPara: "Juliane Andrade" }],
      ACOMPANHAR,
    );
    expect(perSection.get("Delegação")).toHaveLength(1);
    expect(leftover).toHaveLength(0);
  });

  it("INVARIANTE: nº de itens distribuídos + leftover == total (nada some)", () => {
    const items = [
      { id: 1, status: "4_MONITORAR", substatus: null },               // Monitorar
      { id: 2, status: "5_TRIAGEM", substatus: "triagem", delegadoPara: "X" }, // Delegação
      { id: 3, status: "4_MONITORAR", substatus: "monitorar" },        // Monitorar
      { id: 4, status: "ALGO_DESCONHECIDO", substatus: "fase_nova" },  // leftover
    ];
    const { perSection, leftover } = bucketIntoSections(items, ACOMPANHAR);
    const distribuidos = Array.from(perSection.values()).reduce((n, arr) => n + arr.length, 0);
    expect(distribuidos + leftover.length).toBe(items.length);
    expect(leftover).toHaveLength(1); // o status desconhecido vai pro leftover, mas NÃO é descartado
  });
});
