import { describe, it, expect } from "vitest";
import { feriasStatusInfo } from "../status-visual";

describe("feriasStatusInfo", () => {
  it("labels every parcela status (no audiência fallback)", () => {
    expect(feriasStatusInfo("programada").label).toBe("Programada");
    expect(feriasStatusInfo("homologada").label).toBe("Homologada");
    expect(feriasStatusInfo("em_fruicao").label).toBe("Em fruição");
    expect(feriasStatusInfo("concluida").label).toBe("Concluída");
    expect(feriasStatusInfo("cancelada").label).toBe("Cancelada");
  });
  it("returns badge + dot for every known status", () => {
    for (const s of ["programada","homologada","em_fruicao","concluida","cancelada"]) {
      const r = feriasStatusInfo(s);
      expect(r.badge.length).toBeGreaterThan(0);
      expect(r.dot.length).toBeGreaterThan(0);
    }
  });
  it("neutral fallback echoes unknown status", () => {
    expect(feriasStatusInfo("xpto").label).toBe("xpto");
    expect(feriasStatusInfo("xpto").badge).toContain("neutral");
  });
});
