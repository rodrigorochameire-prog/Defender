import { describe, it, expect } from "vitest";
import { normalizePatrocinio, TIPOS_PATROCINIO } from "@/lib/processos/patrocinio";

describe("normalizePatrocinio", () => {
  it("zera o advogado quando o tipo é DEFENSORIA", () => {
    expect(normalizePatrocinio("DEFENSORIA", "Dr. Fulano")).toEqual({
      tipoPatrocinio: "DEFENSORIA",
      advogadoParticular: null,
    });
  });

  it("mantém o nome do advogado (trim) quando PARTICULAR", () => {
    expect(normalizePatrocinio("PARTICULAR", "  Dra. Beltrana  ")).toEqual({
      tipoPatrocinio: "PARTICULAR",
      advogadoParticular: "Dra. Beltrana",
    });
  });

  it("PARTICULAR sem nome vira null", () => {
    expect(normalizePatrocinio("PARTICULAR", "   ")).toEqual({
      tipoPatrocinio: "PARTICULAR",
      advogadoParticular: null,
    });
  });

  it("expõe os tipos válidos", () => {
    expect(TIPOS_PATROCINIO).toEqual(["DEFENSORIA", "PARTICULAR"]);
  });
});
