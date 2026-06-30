import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it, expect } from "vitest";

const src = readFileSync(join(process.cwd(), "src/lib/trpc/routers/assistidos.ts"), "utf8");

describe("assistidos — owner-aware drive (contract)", () => {
  it("resolve o defensorId do assistido como dono", () => {
    expect(src).toMatch(/defensorId:\s*assistidos\.defensorId/);
    expect(src).toContain("ownerUserId");
  });
  it("passa ownerUserId para createOrFindAssistidoFolder e moveAssistidoFolder", () => {
    expect(src).toMatch(/createOrFindAssistidoFolder\(\s*folderKey,\s*nome,\s*ownerUserId/);
    expect(src).toMatch(/moveAssistidoFolder\(\s*existingFolderId,\s*oldKey,\s*folderKey,\s*ownerUserId/);
  });
});
