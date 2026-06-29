import { describe, it, expect } from "vitest";
import { pedidoStatusInfo } from "../status-visual";
describe("pedidoStatusInfo", () => {
  it("labels every estado", () => {
    expect(pedidoStatusInfo("solicitado").label).toBe("Solicitado");
    expect(pedidoStatusInfo("em_analise").label).toBe("Em análise");
    expect(pedidoStatusInfo("deferido").label).toBe("Deferido");
    expect(pedidoStatusInfo("indeferido").label).toBe("Indeferido");
    expect(pedidoStatusInfo("cancelado").label).toBe("Cancelado");
  });
  it("badge+dot for all; neutral fallback echoes unknown", () => {
    for (const s of ["solicitado","em_analise","deferido","indeferido","cancelado"]) {
      const r = pedidoStatusInfo(s); expect(r.badge.length).toBeGreaterThan(0); expect(r.dot.length).toBeGreaterThan(0);
    }
    expect(pedidoStatusInfo("xpto").label).toBe("xpto");
    expect(pedidoStatusInfo("xpto").badge).toContain("neutral");
  });
});
