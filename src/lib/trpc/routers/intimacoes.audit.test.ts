import { describe, it, expect } from "vitest";
import { ledgerDemandaMap, parseVarreduraResultado } from "./intimacoes";

describe("ledgerDemandaMap", () => {
  it("mapeia pjeDocumentoId→demandaId, ignora null", () => {
    const m = ledgerDemandaMap([
      { pjeDocumentoId: "a", demandaId: 1, action: "imported" },
      { pjeDocumentoId: null, demandaId: 2, action: "skipped" },
      { pjeDocumentoId: "b", demandaId: 3, action: "updated" },
    ]);
    expect(m.get("a")).toBe(1);
    expect(m.get("b")).toBe(3);
    expect(m.size).toBe(2);
  });
});

describe("parseVarreduraResultado", () => {
  it("extrai contadores do resultado bruto", () => {
    const r = parseVarreduraResultado({
      ok: true,
      parsed: {
        total: 5,
        ok: 3,
        manual_review: 1,
        nao_painel: 1,
        erros: 0,
        atos: { "Ciência": 2 },
      },
    });
    expect(r).toEqual({
      total: 5,
      ok: 3,
      manual_review: 1,
      nao_painel: 1,
      erros: 0,
      atos: { "Ciência": 2 },
    });
    expect(parseVarreduraResultado({ ok: true, stdoutTail: "x" })).toBeNull();
  });
});
