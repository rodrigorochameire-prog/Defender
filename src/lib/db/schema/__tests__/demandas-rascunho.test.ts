import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it, expect } from "vitest";

const src = readFileSync(join(process.cwd(), "src/lib/db/schema/core.ts"), "utf8");

describe("demandas — colunas de rascunho de peça", () => {
  it("rascunho_status varchar(20)", () =>
    expect(src).toMatch(/rascunhoStatus:\s*varchar\("rascunho_status",\s*\{\s*length:\s*20\s*\}\)/));
  it("rascunho_task_id integer", () =>
    expect(src).toMatch(/rascunhoTaskId:\s*integer\("rascunho_task_id"\)/));
  it("rascunho_drive_url text", () =>
    expect(src).toMatch(/rascunhoDriveUrl:\s*text\("rascunho_drive_url"\)/));
});
