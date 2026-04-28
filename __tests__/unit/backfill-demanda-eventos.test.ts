import { describe, it, expect } from "vitest";

describe("backfill-demanda-eventos script", () => {
  it("can be imported without throwing", async () => {
    const mod = await import("../../scripts/backfill-demanda-eventos");
    expect(typeof mod.main).toBe("function");
  });
});
