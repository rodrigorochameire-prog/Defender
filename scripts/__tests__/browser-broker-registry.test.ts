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

describe("browser-broker gate — skill desconhecida num broker não-interativo", () => {
  it("defere (retorna sem travar o lock) skill desconhecida quando !INTERACTIVE", () => {
    // Guarda contra o bug do broker de servidor atrasado que reivindicava+falhava
    // jobs de skills novas antes do broker atualizado pegar. Ver gotcha.
    expect(src).toMatch(/if \(!preSkill\.entry && !INTERACTIVE\)/);
  });
  it("o defer acontece ANTES do lock otimista (update status=processing)", () => {
    const gateIdx = src.indexOf("!preSkill.entry && !INTERACTIVE");
    const lockIdx = src.indexOf("status: 'processing'");
    expect(gateIdx).toBeGreaterThan(0);
    expect(gateIdx).toBeLessThan(lockIdx);
  });
});
