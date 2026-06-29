import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it, expect } from "vitest";
const src = readFileSync(join(process.cwd(), "src/lib/trpc/routers/coberturas.ts"), "utf8");

describe("coberturas router — SIGA fields", () => {
  it("listar selects the SIGA columns", () => {
    expect(src).toMatch(/numeroSolicitacao:\s*afastamentos\.numeroSolicitacao/);
    expect(src).toMatch(/situacaoSiga:\s*afastamentos\.situacaoSiga/);
  });
  it("atualizar accepts numeroSolicitacao + situacaoSiga", () => {
    const idx = src.indexOf("atualizar");
    const seg = src.slice(idx);
    expect(seg).toContain("numeroSolicitacao");
    expect(seg).toContain("situacaoSiga");
  });
});
