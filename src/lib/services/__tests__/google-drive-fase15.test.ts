import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it, expect } from "vitest";

const ROOT = process.cwd();
const gdrive = readFileSync(join(ROOT, "src/lib/services/google-drive.ts"), "utf8");
const inngest = readFileSync(join(ROOT, "src/lib/inngest/functions.ts"), "utf8");

describe("Fase 1.5 — reverse-sync multi-tenant (contract)", () => {
  it("removeu o mapa global FOLDER_ID_TO_ATRIBUICAO", () => {
    expect(gdrive).not.toMatch(/\bFOLDER_ID_TO_ATRIBUICAO\b/); // old global map gone; LEGACY_ prefixed is allowed
  });
  it("reverse-sync usa o resolver com fallback legado (não fica dormente pré-seed)", () => {
    expect(gdrive).toContain("resolveFolderToAtribuicaoOrLegacy");
    expect(gdrive).toContain("LEGACY_FOLDER_ID_TO_ATRIBUICAO");
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

describe("Fase 1.5 — de-hardcode forward (contract)", () => {
  it("define o helper de fallback legado", () => {
    expect(gdrive).toContain("folderForAtribuicaoOrLegacy");
  });
  it("threada ownerUserId nas 3 assinaturas forward", () => {
    expect(gdrive).toMatch(/createOrFindAssistidoFolder\([^)]*ownerUserId/);
    expect(gdrive).toMatch(/moveAssistidoFolder\([^)]*ownerUserId/);
    expect(gdrive).toMatch(/listAssistidoFoldersWithCount\([^)]*ownerUserId/);
  });
  it("as funções forward obtêm a pasta via o helper (>=4 ocorrências: def + create + move x2 + list)", () => {
    const usos = gdrive.match(/folderForAtribuicaoOrLegacy\(/g) ?? [];
    expect(usos.length).toBeGreaterThanOrEqual(4);
  });
  it("não há mais indexação direta ATRIBUICAO_FOLDER_IDS[...] (vai toda pelo helper)", () => {
    expect(gdrive).not.toMatch(/ATRIBUICAO_FOLDER_IDS\[/);
  });
  it("o helper forward usa o discriminador de grupo (fail-safe, sem vazamento entre defensores)", () => {
    expect(gdrive).toContain("loadUserGroupFolders");
  });
});
