import { describe, it, expect } from "vitest";
import type { ImportResult } from "./pje-import";

// Contrato de tipo: ImportResult expõe rows[] com pjeDocumentoId→demandaId.
describe("ImportResult.rows", () => {
  it("tem o campo rows tipado", () => {
    const r: ImportResult = { imported: 0, updated: 0, skipped: 0, errors: [], assistidosSemSolar: 0, rows: [] };
    r.rows.push({ pjeDocumentoId: "doc-1", demandaId: 42, action: "imported" });
    expect(r.rows[0]).toEqual({ pjeDocumentoId: "doc-1", demandaId: 42, action: "imported" });
  });
});
