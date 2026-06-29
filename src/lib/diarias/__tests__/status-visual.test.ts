import { describe, it, expect } from "vitest";
import { diariaStatusInfo } from "../status-visual";

describe("diariaStatusInfo", () => {
  it("labels every status (no audiência fallback)", () => {
    expect(diariaStatusInfo("a_requerer").label).toBe("A requerer");
    expect(diariaStatusInfo("requerida").label).toBe("Requerida");
    expect(diariaStatusInfo("autorizada").label).toBe("Autorizada");
    expect(diariaStatusInfo("paga").label).toBe("Paga");
    expect(diariaStatusInfo("cancelada").label).toBe("Cancelada");
  });
  it("returns badge + dot for every known status", () => {
    for (const s of ["a_requerer","requerida","autorizada","paga","cancelada"]) {
      const r = diariaStatusInfo(s);
      expect(r.badge.length).toBeGreaterThan(0);
      expect(r.dot.length).toBeGreaterThan(0);
    }
  });
  it("neutral fallback echoes unknown status", () => {
    expect(diariaStatusInfo("xpto").label).toBe("xpto");
    expect(diariaStatusInfo("xpto").badge).toContain("neutral");
  });
});
