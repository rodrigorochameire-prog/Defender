import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it, expect } from "vitest";

const src = readFileSync(join(process.cwd(), "src/hooks/use-rascunho-peca-job.ts"), "utf8");

describe("use-rascunho-peca-job", () => {
  it("chama criar", () => expect(src).toContain("rascunhoPeca.criar"));
  it("poll status com refetchInterval", () => {
    expect(src).toContain("rascunhoPeca.status");
    expect(src).toContain("refetchInterval");
  });
  it("invalida demandas.list ao pronto", () => expect(src).toMatch(/demandas\.list\.invalidate/));
});
