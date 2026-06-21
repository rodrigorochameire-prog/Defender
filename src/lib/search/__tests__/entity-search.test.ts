import { describe, it, expect } from "vitest";
import { foldText, searchEntities, type SearchEntity } from "../entity-search";

const ents: SearchEntity[] = [
  { id: 1, kind: "assistido", label: "João da Silva", sublabel: "CPF 123" },
  { id: 2, kind: "processo", label: "Ação Penal", numero: "2000109-71.2025.8.05.0039" },
  { id: 3, kind: "caso", label: "Homicídio Bar do Zé", sublabel: "JURI-001" },
  { id: 4, kind: "assistido", label: "Maria Joana", sublabel: "réu preso" },
  { id: 5, kind: "audiencia", label: "Instrução — Pedro", sublabel: "10/07 14h" },
];

describe("foldText", () => {
  it("remove acento e baixa caixa", () => {
    expect(foldText("AÇÃO Penal")).toBe("acao penal");
  });
});

describe("searchEntities", () => {
  it("query vazia → []", () => {
    expect(searchEntities(ents, "")).toEqual([]);
    expect(searchEntities(ents, "  ")).toEqual([]);
  });

  it("prefixo de label vence início-de-palavra", () => {
    const r = searchEntities(ents, "joao");
    expect(r[0].entity.id).toBe(1); // "João da Silva" prefixo (100)
    expect(r[0].score).toBeGreaterThanOrEqual(r[r.length - 1].score);
  });

  it("acha processo por dígitos ignorando máscara", () => {
    const r = searchEntities(ents, "2000109");
    expect(r[0].entity.id).toBe(2);
  });

  it("é tolerante a acento", () => {
    expect(searchEntities(ents, "homicidio").map((h) => h.entity.id)).toContain(3);
    expect(searchEntities(ents, "acao").map((h) => h.entity.id)).toContain(2);
  });

  it("casa no sublabel com pontuação baixa", () => {
    const r = searchEntities(ents, "preso");
    expect(r.map((h) => h.entity.id)).toContain(4);
  });

  it("mistura kinds no resultado", () => {
    const r = searchEntities(ents, "a"); // 'a' aparece em vários labels
    const kinds = new Set(r.map((h) => h.entity.kind));
    expect(kinds.size).toBeGreaterThan(1);
  });

  it("sem match → []", () => {
    expect(searchEntities(ents, "habeas corpus zzz")).toEqual([]);
  });

  it("respeita o limite", () => {
    expect(searchEntities(ents, "a", 2)).toHaveLength(2);
  });
});
