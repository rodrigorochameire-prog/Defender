import { describe, it, expect } from "vitest";
import { importAuditMetadata, ledgerDemandaMap, parseVarreduraResultado } from "./intimacoes";

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

describe("importAuditMetadata", () => {
  it("usa a chave snake_case job_id (bate com metadata->>'job_id')", () => {
    const m = importAuditMetadata(1352);
    expect(m).toEqual({ source: "pje-import", job_id: 1352 });
    expect("jobId" in m).toBe(false); // não camelCase — senão o drill-down fica vazio
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
