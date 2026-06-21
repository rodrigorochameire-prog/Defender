import { describe, it, expect } from "vitest";
import { foldText, searchDemandas } from "../demanda-search";

const mk = (id: string, assistido: string, numero: string, ato = "") => ({
  id,
  assistido,
  ato,
  processos: numero ? [{ tipo: "AP", numero }] : [],
});

const demandas = [
  mk("1", "João da Silva", "2000109-71.2025.8.05.0039", "Alegações finais"),
  mk("2", "Maria Joana Souza", "1234567-00.2024.8.05.0001", "Apelação"),
  mk("3", "Antônio Carlos", "9999999-99.2023.8.05.0002", "Resposta à acusação"),
  mk("4", "Pedro Silva João", "5555555-55.2022.8.05.0003", ""),
];

describe("foldText", () => {
  it("remove acento e baixa a caixa", () => {
    expect(foldText("João ANTÔNIO")).toBe("joao antonio");
    expect(foldText("")).toBe("");
  });
});

describe("searchDemandas", () => {
  it("query vazia → nenhum resultado", () => {
    expect(searchDemandas(demandas, "")).toEqual([]);
    expect(searchDemandas(demandas, "   ")).toEqual([]);
  });

  it("é tolerante a acento e caixa", () => {
    const r = searchDemandas(demandas, "antonio");
    expect(r.map((x) => x.demanda.id)).toContain("3");
  });

  it("ranqueia prefixo de nome acima de início-de-palavra e substring", () => {
    const r = searchDemandas(demandas, "joao");
    // id 1 "João da Silva" (prefixo) antes de 2 "Maria Joana" (início de palavra)
    // e de 4 "Pedro Silva João" (início de palavra também). Prefixo vence.
    expect(r[0].demanda.id).toBe("1");
    expect(r[0].score).toBeGreaterThan(r[1].score);
  });

  it("acha processo por dígitos ignorando a máscara", () => {
    const r = searchDemandas(demandas, "1234567");
    expect(r[0].demanda.id).toBe("2");
    expect(r[0].matchField).toBe("processo");
  });

  it("processo: ignora pontuação digitada pelo usuário", () => {
    const r = searchDemandas(demandas, "2000109-71");
    expect(r[0].demanda.id).toBe("1");
  });

  it("casa no ato com pontuação baixa", () => {
    const r = searchDemandas(demandas, "apelação");
    expect(r.map((x) => x.demanda.id)).toContain("2");
    expect(r.find((x) => x.demanda.id === "2")!.matchField).toBe("ato");
  });

  it("exclui quem não casa", () => {
    expect(searchDemandas(demandas, "habeas corpus xyz")).toEqual([]);
  });

  it("respeita o limite", () => {
    expect(searchDemandas(demandas, "silva", 1)).toHaveLength(1);
  });
});
