// src/lib/trpc/routers/__tests__/ferias-router.test.ts
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it, expect } from "vitest";

const ROUTERS = join(process.cwd(), "src/lib/trpc/routers");
const read = (rel: string) => readFileSync(join(ROUTERS, rel), "utf8");

describe("ferias router — contract", () => {
  const src = read("ferias.ts");

  it("scopes reads with getVidaFuncionalScope", () => {
    expect(src).toContain("getVidaFuncionalScope");
  });
  it("filters soft-deleted rows", () => {
    expect(src).toMatch(/isNull\([^)]*deletedAt\)/);
  });
  it("guards titular-only writes", () => {
    expect(src).toContain("FORBIDDEN");
  });
  it("rejects self-coverage", () => {
    expect(src).toMatch(/substitutoId\s*===\s*ctx\.user\.id/);
  });
  it("enforces the saldo guard", () => {
    expect(src).toContain("computeSaldo");
    expect(src).toMatch(/disponiveis/);
  });
  it("gates parcela status changes via podeTransicionar", () => {
    expect(src).toContain("podeTransicionar");
  });
  it("wraps multi-table writes in a transaction", () => {
    expect(src).toContain("db.transaction");
  });
  it("creates the afastamento only when a substituto is present", () => {
    expect(src).toMatch(/if\s*\(\s*input\.substitutoId/);
  });
  it("is registered in the appRouter", () => {
    const index = read("index.ts");
    expect(index).toContain("feriasRouter");
    expect(index).toMatch(/ferias:\s*feriasRouter/);
  });
  it("criarParcela writes valorCents into the evento insert", () => {
    // the evento insert must include valorCents from the projection
    expect(src).toMatch(/valorCents:\s*proj\.valorCents/);
  });
  it("atualizarParcela fetches periodo unconditionally (not only on date change)", () => {
    // the periodo fetch must NOT be nested only under an if(input.dataInicio...) block
    const idx = src.indexOf("atualizarParcela");
    const seg = src.slice(idx);
    expect(seg).toContain("Período não encontrado");
    // titulo + valorCents propagated to the evento update
    expect(seg).toMatch(/titulo:\s*proj\.titulo/);
    expect(seg).toMatch(/valorCents:\s*proj\.valorCents/);
  });
  it("rejects conversaoPecunia without valorAbonoCents", () => {
    expect(src).toMatch(/Convers[aã]o em pec[úu]nia exige valor/);
  });
  it("persists the SIGA fields (numeroSolicitacao, provimento, conversaoPecunia)", () => {
    expect(src).toContain("numeroSolicitacao");
    expect(src).toContain("provimento");
    expect(src).toContain("conversaoPecunia");
  });
});
