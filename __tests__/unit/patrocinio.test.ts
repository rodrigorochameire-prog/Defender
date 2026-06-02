import { describe, it, expect } from "vitest";
import { normalizePatrocinio, TIPOS_PATROCINIO } from "@/lib/processos/patrocinio";
import { setPatrocinioInput } from "@/lib/trpc/routers/processos";

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

describe("setPatrocinioInput", () => {
  it("aceita DEFENSORIA sem advogado", () => {
    const r = setPatrocinioInput.safeParse({ processoId: 1, tipoPatrocinio: "DEFENSORIA" });
    expect(r.success).toBe(true);
  });
  it("aceita PARTICULAR com advogado", () => {
    const r = setPatrocinioInput.safeParse({
      processoId: 1, tipoPatrocinio: "PARTICULAR", advogadoParticular: "Dr. X",
    });
    expect(r.success).toBe(true);
  });
  it("rejeita tipo inválido", () => {
    const r = setPatrocinioInput.safeParse({ processoId: 1, tipoPatrocinio: "OUTRO" });
    expect(r.success).toBe(false);
  });
});
