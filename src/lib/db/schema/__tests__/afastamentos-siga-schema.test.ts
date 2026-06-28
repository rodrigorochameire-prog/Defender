import { describe, it, expect } from "vitest";
import { afastamentos } from "@/lib/db/schema";

describe("afastamentos SIGA alignment columns", () => {
  it("exposes the 5 new columns", () => {
    for (const col of ["numeroSolicitacao","nSiga","dataPublicacao","situacaoSiga","sigaSyncedAt"]) {
      expect((afastamentos as unknown as Record<string, unknown>)[col]).toBeDefined();
    }
  });
});
