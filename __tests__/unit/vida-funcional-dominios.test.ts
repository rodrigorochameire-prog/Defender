import { describe, it, expect } from "vitest";
import { DOMINIOS, getDominio, dominiosByCluster } from "@/lib/vida-funcional/dominios";

describe("dominios", () => {
  it("todo domínio tem key/label/icon/cluster/tipos não-vazios e keys únicas", () => {
    const keys = new Set<string>();
    for (const d of DOMINIOS) {
      expect(d.key).toBeTruthy();
      expect(d.label).toBeTruthy();
      expect(d.icon).toBeTruthy();
      expect(d.tipos.length).toBeGreaterThan(0);
      expect(keys.has(d.key)).toBe(false);
      keys.add(d.key);
    }
  });
  it("getDominio resolve por key", () => {
    expect(getDominio("ferias-licencas")?.tipos).toContain("FERIAS");
    expect(getDominio("inexistente")).toBeUndefined();
  });
  it("dominiosByCluster agrupa", () => {
    expect(dominiosByCluster("administrativo").some((d) => d.key === "solicitacoes")).toBe(true);
    expect(dominiosByCluster("contraprestacao").length).toBeGreaterThanOrEqual(3);
  });
});
