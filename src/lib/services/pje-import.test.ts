import { describe, it, expect } from "vitest";
import type { ImportResult } from "./pje-import";

// TYPE-CONTRACT test only: verifies ImportResult exposes a typed `rows` field.
// It does NOT call importarDemandas() — that function uses the Drizzle `db`
// directly and there is no DB-mock harness in this repo, so runtime behavior
// coverage (rows populated on insert/update/skip) is deferred.
describe("ImportResult.rows — type contract", () => {
  it("exposes rows[] with pjeDocumentoId, demandaId, and action (type contract only)", () => {
    // This test constructs an ImportResult object literal to verify the type
    // contract; it does NOT exercise the behavior of importarDemandas().
    const r: ImportResult = { imported: 0, updated: 0, skipped: 0, errors: [], assistidosSemSolar: 0, rows: [] };
    r.rows.push({ pjeDocumentoId: "doc-1", demandaId: 42, action: "imported" });
    expect(r.rows[0]).toEqual({ pjeDocumentoId: "doc-1", demandaId: 42, action: "imported" });
  });
});
