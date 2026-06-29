/**
 * Smoke test for importarAudiencias — pure logic path only.
 *
 * The function requires real DB access even for empty input
 * (it always fetches allAssistidosForMatching and existingAudiencias).
 * We mock @/lib/db to intercept those calls and return empty arrays,
 * verifying that an empty eventos array returns all-zero counts without
 * touching the transaction body.
 *
 * Finding: importarAudiencias([]) does NOT early-return for empty input —
 * it always runs two SELECT queries before the transaction. With the mock
 * below those resolve to [], so the result is correctly all-zero.
 */
import { vi, describe, it, expect } from "vitest";

// ----------------------------------------
// Mock @/lib/db before importing the SUT
// ----------------------------------------
vi.mock("@/lib/db", () => {
  // Chainable query builder that resolves to an empty array when awaited.
  const makeChain = (): any => {
    const c: any = {};
    c.from = () => c;
    c.leftJoin = () => c;
    c.where = () => c;
    // Make thenable: await chain → []
    c.then = (onFulfilled: (v: unknown[]) => void) =>
      Promise.resolve([]).then(onFulfilled);
    c.catch = (onRejected: (e: unknown) => void) =>
      Promise.resolve([]).catch(onRejected);
    c.finally = (cb: () => void) => Promise.resolve([]).finally(cb);
    return c;
  };

  return {
    db: { select: () => makeChain() },
    // For empty eventos the transaction callback returns zeros without any tx calls.
    withTransaction: async (fn: (tx: any) => Promise<any>) => fn({}),
    // Table references (passed as column descriptors to drizzle helpers — ignored by mock).
    audiencias: {},
    processos: {},
    assistidos: {},
    sessoesJuri: {},
  };
});

import { importarAudiencias } from "../importar-audiencias";

describe("importarAudiencias", () => {
  it("returns all-zero counts for an empty events array", async () => {
    const result = await importarAudiencias([]);

    expect(result).toEqual({
      superados: 0,
      importados: 0,
      duplicados: 0,
      atualizados: 0,
      duplicadosProcessos: [],
      assistidosCriados: 0,
    });
  });
});
