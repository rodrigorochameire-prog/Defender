// src/lib/trpc/routers/__tests__/carreira-router.test.ts
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it, expect } from "vitest";

const ROUTERS = join(process.cwd(), "src/lib/trpc/routers");
const read = (rel: string) => readFileSync(join(ROUTERS, rel), "utf8");

describe("carreira router — privacy contract", () => {
  const src = read("carreira.ts");

  it("meuPanorama uses getVidaFuncionalScope (no god-view)", () => {
    expect(src).toContain("getVidaFuncionalScope");
  });

  it("filters soft-deleted eventos", () => {
    expect(src).toMatch(/isNull\([^)]*deletedAt\)/);
  });

  it("coberturaRollup is an adminProcedure", () => {
    expect(src).toMatch(/coberturaRollup:\s*adminProcedure/);
  });

  it("coberturaRollup never selects valorCents (no sensitive value leak)", () => {
    // coberturaRollup must not touch the eventos value column.
    const idx = src.indexOf("coberturaRollup");
    expect(idx).toBeGreaterThan(-1);
    expect(src.slice(idx)).not.toContain("valorCents");
  });

  it("is registered in the appRouter", () => {
    const index = read("index.ts");
    expect(index).toContain("carreiraRouter");
    expect(index).toMatch(/carreira:\s*carreiraRouter/);
  });
});
