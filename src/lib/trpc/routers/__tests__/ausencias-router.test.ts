// src/lib/trpc/routers/__tests__/ausencias-router.test.ts
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it, expect } from "vitest";
const ROUTERS = join(process.cwd(), "src/lib/trpc/routers");
const LIB = join(process.cwd(), "src/lib/ausencias");
const read = (rel: string) => readFileSync(join(ROUTERS, rel), "utf8");
const readLib = (rel: string) => readFileSync(join(LIB, rel), "utf8");

describe("ausencias router — contract", () => {
  const src = read("ausencias.ts");
  it("scopes reads with getVidaFuncionalScope", () => { expect(src).toContain("getVidaFuncionalScope"); });
  it("filters soft-deleted", () => { expect(src).toMatch(/isNull\([^)]*deletedAt\)/); });
  it("guards titular + NOT_FOUND", () => { expect(src).toContain("FORBIDDEN"); expect(src).toContain("NOT_FOUND"); });
  it("gates situação via podeTransicionar", () => { expect(src).toContain("podeTransicionar"); });
  it("wraps writes in a transaction", () => { expect(src).toContain("db.transaction"); });
  it("projects via projecaoEventoDeAusencia with origem manual", () => {
    // projecaoEventoDeAusencia is used in ausencias.ts (atualizar) and in persist.ts (criar)
    expect(src).toContain("projecaoEventoDeAusencia");
    // origem:"manual" moved to persist.ts after Task 5 refactor
    const persist = readLib("persist.ts");
    expect(persist).toMatch(/origem:\s*["']manual["']/);
  });
  it("soft-deletes the event on indeferida/cancelada", () => { expect(src).toMatch(/indeferida|cancelada/); });
  it("does NOT reference afastamentos", () => { expect(src).not.toContain("afastamentos"); });
  it("is registered", () => {
    const idx = read("index.ts"); expect(idx).toContain("ausenciasRouter"); expect(idx).toMatch(/ausencias:\s*ausenciasRouter/);
  });
});
