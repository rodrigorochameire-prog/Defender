import { describe, it, expect } from "vitest";
import { pickDemandaId } from "./backfill_ledger_demanda.mjs";

// Antes um script node:assert (rodado só via `node`), o que fazia o vitest
// falhar com "No test suite found". Convertido p/ vitest — agora roda no CI.
describe("pickDemandaId", () => {
  it("empata pelo menor id", () => {
    expect(pickDemandaId([{ id: 9 }, { id: 3 }, { id: 7 }])).toBe(3);
  });
  it("único candidato", () => {
    expect(pickDemandaId([{ id: 5 }])).toBe(5);
  });
  it("vazio → null", () => {
    expect(pickDemandaId([])).toBe(null);
  });
});
