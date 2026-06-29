import { describe, it, expect } from "vitest";
import { ausenciaStatusInfo } from "../status-visual";
describe("ausenciaStatusInfo", () => {
  it("labels every situação", () => {
    expect(ausenciaStatusInfo("solicitada").label).toBe("Solicitada");
    expect(ausenciaStatusInfo("deferida").label).toBe("Deferida");
    expect(ausenciaStatusInfo("gozada").label).toBe("Gozada");
    expect(ausenciaStatusInfo("indeferida").label).toBe("Indeferida");
    expect(ausenciaStatusInfo("cancelada").label).toBe("Cancelada");
  });
  it("returns badge + dot for all; neutral fallback echoes unknown", () => {
    for (const s of ["solicitada","deferida","gozada","indeferida","cancelada"]) {
      const r = ausenciaStatusInfo(s); expect(r.badge.length).toBeGreaterThan(0); expect(r.dot.length).toBeGreaterThan(0);
    }
    expect(ausenciaStatusInfo("xpto").label).toBe("xpto");
    expect(ausenciaStatusInfo("xpto").badge).toContain("neutral");
  });
});
