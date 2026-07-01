import { describe, it, expect } from "vitest";
import { ledgerDemandaMap } from "./intimacoes";

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
