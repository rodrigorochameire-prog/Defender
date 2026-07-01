import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it, expect } from "vitest";

const src = readFileSync(join(process.cwd(), "scripts/browser-broker-daemon.mjs"), "utf8");

describe("browser-broker SKILL_REGISTRY — fase2c", () => {
  it("registra analise-profunda-demanda", () => {
    expect(src).toContain("'analise-profunda-demanda'");
  });
  it("aponta p/ o worker analise_profunda_autos.py", () => {
    expect(src).toContain("analise-profunda-demanda/scripts/analise_profunda_autos.py");
  });
  it("passa os ids da demanda por argv", () => {
    expect(src).toMatch(/--demanda-id/);
  });
});
