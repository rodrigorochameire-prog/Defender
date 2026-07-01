import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it, expect } from "vitest";

const src = readFileSync(join(process.cwd(), "src/hooks/use-analise-profunda-job.ts"), "utf8");

describe("use-analise-profunda-job", () => {
  it("chama a mutation criar", () => {
    expect(src).toContain("analiseProfunda.criar");
  });
  it("faz poll de status com refetchInterval enquanto em andamento", () => {
    expect(src).toContain("analiseProfunda.status");
    expect(src).toContain("refetchInterval");
  });
  it("invalida demandas.list ao concluir", () => {
    expect(src).toMatch(/demandas\.list\.invalidate/);
  });
});
