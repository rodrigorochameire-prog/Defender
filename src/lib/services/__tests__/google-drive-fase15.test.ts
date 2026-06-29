import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it, expect } from "vitest";

const ROOT = process.cwd();
const gdrive = readFileSync(join(ROOT, "src/lib/services/google-drive.ts"), "utf8");
const inngest = readFileSync(join(ROOT, "src/lib/inngest/functions.ts"), "utf8");

describe("Fase 1.5 — reverse-sync multi-tenant (contract)", () => {
  it("removeu o mapa global FOLDER_ID_TO_ATRIBUICAO", () => {
    expect(gdrive).not.toContain("FOLDER_ID_TO_ATRIBUICAO");
  });
  it("usa o resolver reverso por grupo", () => {
    expect(gdrive).toContain("resolveFolderToAtribuicao");
  });
  it("isAtribuicaoRootChild virou async", () => {
    expect(gdrive).toMatch(/export async function isAtribuicaoRootChild/);
  });
  it("atribui defensorId = ownerUserId nos inserts do reverse-sync", () => {
    expect(gdrive).toContain("ATRIBUICAO_KEY_TO_ENUM");
    expect(gdrive).toMatch(/defensorId:\s*ownerUserId/);
  });
  it("inngest aguarda isAtribuicaoRootChild", () => {
    expect(inngest).toMatch(/await isAtribuicaoRootChild\(/);
  });
});
