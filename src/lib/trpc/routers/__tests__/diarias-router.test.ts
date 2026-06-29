// src/lib/trpc/routers/__tests__/diarias-router.test.ts
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it, expect } from "vitest";

const ROUTERS = join(process.cwd(), "src/lib/trpc/routers");
const read = (rel: string) => readFileSync(join(ROUTERS, rel), "utf8");

describe("diarias router — contract", () => {
  const src = read("diarias.ts");

  it("scopes reads with getVidaFuncionalScope", () => {
    expect(src).toContain("getVidaFuncionalScope");
  });
  it("filters soft-deleted rows", () => {
    expect(src).toMatch(/isNull\([^)]*deletedAt\)/);
  });
  it("guards titular-only writes", () => {
    expect(src).toContain("FORBIDDEN");
  });
  it("guards NOT_FOUND before FORBIDDEN", () => {
    expect(src).toContain("NOT_FOUND");
  });
  it("gates status changes via podeTransicionar", () => {
    expect(src).toContain("podeTransicionar");
  });
  it("wraps writes in a transaction", () => {
    expect(src).toContain("db.transaction");
  });
  it("projects to vida_funcional with origem manual", () => {
    expect(src).toContain("projecaoEventoDeDiaria");
    expect(src).toMatch(/origem:\s*["']manual["']/);
  });
  it("does NOT reference afastamentos", () => {
    expect(src).not.toContain("afastamentos");
  });
  it("is registered in the appRouter", () => {
    const index = read("index.ts");
    expect(index).toContain("diariasRouter");
    expect(index).toMatch(/diarias:\s*diariasRouter/);
  });
});
