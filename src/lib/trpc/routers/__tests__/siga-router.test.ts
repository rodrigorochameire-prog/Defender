// src/lib/trpc/routers/__tests__/siga-router.test.ts
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it, expect } from "vitest";
const ROUTERS = join(process.cwd(), "src/lib/trpc/routers");
const read = (rel: string) => readFileSync(join(ROUTERS, rel), "utf8");

describe("siga router — contract", () => {
  const src = read("siga.ts");
  it("all procedures are protected", () => { expect(src).not.toMatch(/publicProcedure/); expect(src).toContain("protectedProcedure"); });
  it("extrair calls the enrichment client", () => { expect(src).toContain("sigaExtrairCarreira"); });
  it("dedups via decidir + maps via mapToAusencia", () => { expect(src).toContain("decidir"); expect(src).toContain("mapToAusencia"); });
  it("confirmar uses the shared persist helper and bypasses podeTransicionar", () => {
    expect(src).toContain("criarAusenciaComEvento");
    expect(src).not.toContain("podeTransicionar");
  });
  it("owns rows by ctx.user.id", () => { expect(src).toMatch(/defensorId:\s*ctx\.user\.id/); });
  it("is registered", () => { const i = read("index.ts"); expect(i).toContain("sigaRouter"); expect(i).toMatch(/siga:\s*sigaRouter/); });
});
