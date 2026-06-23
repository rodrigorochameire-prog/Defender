import { describe, it, expect } from "vitest";
import { corDoTipo, labelDoTipo, corPrincipal, TIPOS_LUGAR } from "@/components/mapa-dos-fatos/tipos-config";

describe("mapa-dos-fatos tipos-config", () => {
  it("cor e label conhecidos", () => {
    expect(corDoTipo("local-do-fato")).toBe("#e11d48");
    expect(labelDoTipo("residencia-vitima")).toBe("Residência da vítima");
  });

  it("tipo desconhecido cai em fallback", () => {
    expect(corDoTipo("xpto")).toBe("#71717a");
    expect(labelDoTipo(null)).toBe("Outro");
  });

  it("corPrincipal prioriza local-do-fato sobre os demais", () => {
    expect(corPrincipal(["residencia-agressor", "local-do-fato"])).toBe("#e11d48");
  });

  it("corPrincipal prioriza vítima sobre agressor", () => {
    expect(corPrincipal(["residencia-agressor", "residencia-vitima"])).toBe("#f59e0b");
  });

  it("todos os tipos têm cor e label", () => {
    for (const t of TIPOS_LUGAR) {
      expect(corDoTipo(t)).toMatch(/^#[0-9a-f]{6}$/i);
      expect(labelDoTipo(t).length).toBeGreaterThan(0);
    }
  });
});
