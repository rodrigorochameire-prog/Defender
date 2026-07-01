import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it, expect } from "vitest";

const src = readFileSync(join(process.cwd(), "src/lib/db/schema/core.ts"), "utf8");

describe("demandas — colunas de análise profunda", () => {
  it("declara analise_profunda_status varchar(20)", () => {
    expect(src).toMatch(/analiseProfundaStatus:\s*varchar\("analise_profunda_status",\s*\{\s*length:\s*20\s*\}\)/);
  });
  it("declara analise_profunda_task_id integer", () => {
    expect(src).toMatch(/analiseProfundaTaskId:\s*integer\("analise_profunda_task_id"\)/);
  });
});
