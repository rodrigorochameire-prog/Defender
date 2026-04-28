import { describe, it, expect } from "vitest";

describe("autoVincularAtendimentoADemandas exports", () => {
  it("é exportado do router demanda-eventos", async () => {
    const mod = await import("@/lib/trpc/routers/demanda-eventos");
    expect(typeof mod.autoVincularAtendimentoADemandas).toBe("function");
  });
});
