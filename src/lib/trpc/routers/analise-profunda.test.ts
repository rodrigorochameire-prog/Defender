import { describe, it, expect } from "vitest";
import { isElegivel2c, buildBrowserTaskMeta, ATRIB_ELEGIVEIS_2C } from "./analise-profunda";

describe("isElegivel2c", () => {
  it("aceita Júri/VVD com peca_sugerida", () => {
    expect(isElegivel2c({ atribuicao: "JURI_CAMACARI", pecaSugerida: "memoriais" })).toEqual({ ok: true });
    expect(isElegivel2c({ atribuicao: "VVD_CAMACARI", pecaSugerida: "resposta_acusacao" })).toEqual({ ok: true });
    expect(isElegivel2c({ atribuicao: "GRUPO_JURI", pecaSugerida: "apelacao" })).toEqual({ ok: true });
  });
  it("rejeita quando peca_sugerida ausente", () => {
    const r = isElegivel2c({ atribuicao: "JURI_CAMACARI", pecaSugerida: null });
    expect(r.ok).toBe(false);
  });
  it("rejeita atribuição fora do MVP (EP)", () => {
    const r = isElegivel2c({ atribuicao: "EXECUCAO_PENAL", pecaSugerida: "manifestacao_ep" });
    expect(r.ok).toBe(false);
  });
});

describe("buildBrowserTaskMeta", () => {
  it("serializa os campos p/ instrucaoAdicional", () => {
    const meta = buildBrowserTaskMeta({ demandaId: 1, processoId: 2, assistidoId: 3, atribuicao: "VVD_CAMACARI", defensorId: 13 });
    expect(JSON.parse(meta)).toEqual({ demandaId: 1, processoId: 2, assistidoId: 3, atribuicao: "VVD_CAMACARI", defensorId: 13, modo: "cdp" });
  });
});

describe("ATRIB_ELEGIVEIS_2C", () => {
  it("é exatamente Júri/VVD do MVP", () => {
    expect([...ATRIB_ELEGIVEIS_2C].sort()).toEqual(["GRUPO_JURI", "JURI_CAMACARI", "VVD_CAMACARI"]);
  });
});
