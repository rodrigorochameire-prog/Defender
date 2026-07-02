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
  it("aceita EP com peca_sugerida (Fase 2b — autos via SEEU)", () => {
    expect(isElegivel2c({ atribuicao: "EXECUCAO_PENAL", pecaSugerida: "manifestacao_ep" })).toEqual({ ok: true });
  });
  it("rejeita EP sem peca_sugerida", () => {
    const r = isElegivel2c({ atribuicao: "EXECUCAO_PENAL", pecaSugerida: null });
    expect(r.ok).toBe(false);
  });
  it("rejeita atribuição desconhecida com motivo genérico do MVP", () => {
    const r = isElegivel2c({ atribuicao: "CRIMINAL", pecaSugerida: "resposta_acusacao" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.motivo).toMatch(/MVP/);
  });
});

describe("buildBrowserTaskMeta", () => {
  it("serializa os campos p/ instrucaoAdicional", () => {
    const meta = buildBrowserTaskMeta({ demandaId: 1, processoId: 2, assistidoId: 3, atribuicao: "VVD_CAMACARI", defensorId: 13 });
    expect(JSON.parse(meta)).toEqual({ demandaId: 1, processoId: 2, assistidoId: 3, atribuicao: "VVD_CAMACARI", defensorId: 13, modo: "cdp" });
  });
});

describe("ATRIB_ELEGIVEIS_2C", () => {
  it("é Júri/VVD + EP (Fase 2b)", () => {
    expect([...ATRIB_ELEGIVEIS_2C].sort()).toEqual(["EXECUCAO_PENAL", "GRUPO_JURI", "JURI_CAMACARI", "VVD_CAMACARI"]);
  });
});
