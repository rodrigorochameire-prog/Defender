import { describe, it, expect } from "vitest";
import { agruparEnvolvimento, type LinhaEnvolvimento } from "../agrupar-envolvimento";

function linha(over: Partial<LinhaEnvolvimento>): LinhaEnvolvimento {
  return {
    participacaoId: 1,
    processoId: 10,
    papel: "testemunha",
    lado: null,
    subpapel: null,
    resumoNestaCausa: null,
    numeroAutos: "0001",
    area: "CRIMINAL",
    fase: "instrucao",
    atribuicao: "JURI_CAMACARI",
    classeProcessual: "Ação Penal",
    ...over,
  };
}

describe("agruparEnvolvimento", () => {
  it("retorna lista vazia para entrada vazia", () => {
    expect(agruparEnvolvimento([])).toEqual([]);
  });

  it("agrupa múltiplas participações do mesmo processo num único card", () => {
    const out = agruparEnvolvimento([
      linha({ participacaoId: 1, processoId: 10, papel: "testemunha", lado: "defesa" }),
      linha({ participacaoId: 2, processoId: 10, papel: "informante", lado: "neutro" }),
    ]);
    expect(out).toHaveLength(1);
    expect(out[0].processoId).toBe(10);
    expect(out[0].papeis).toHaveLength(2);
    expect(out[0].papeis.map((p) => p.papel)).toEqual(["testemunha", "informante"]);
  });

  it("mantém processos distintos em cards separados", () => {
    const out = agruparEnvolvimento([
      linha({ participacaoId: 1, processoId: 10 }),
      linha({ participacaoId: 2, processoId: 20 }),
    ]);
    expect(out).toHaveLength(2);
    expect(out.map((g) => g.processoId).sort()).toEqual([10, 20]);
  });

  it("propaga metadados do processo (numeroAutos, area, fase, atribuição)", () => {
    const out = agruparEnvolvimento([
      linha({ processoId: 7, numeroAutos: "0007-77", area: "VVD", fase: "sentenca", atribuicao: "VVD_CAMACARI" }),
    ]);
    expect(out[0]).toMatchObject({
      numeroAutos: "0007-77",
      area: "VVD",
      fase: "sentenca",
      atribuicao: "VVD_CAMACARI",
    });
  });

  it("preserva lado/subpapel/resumo por papel", () => {
    const out = agruparEnvolvimento([
      linha({ participacaoId: 9, papel: "vitima", lado: "acusacao", subpapel: "ofendida", resumoNestaCausa: "relato X" }),
    ]);
    expect(out[0].papeis[0]).toMatchObject({
      participacaoId: 9,
      papel: "vitima",
      lado: "acusacao",
      subpapel: "ofendida",
      resumoNestaCausa: "relato X",
    });
  });
});
