import { describe, it, expect } from "vitest";
import { PAPEIS_ROTATIVOS, isPapelRotativo, PAPEIS_VALIDOS } from "@/lib/pessoas/intel-config";

describe("PAPEIS_ROTATIVOS", () => {
  it("inclui depoentes", () => {
    expect(PAPEIS_ROTATIVOS.has("testemunha")).toBe(true);
    expect(PAPEIS_ROTATIVOS.has("vitima")).toBe(true);
    expect(PAPEIS_ROTATIVOS.has("co-reu")).toBe(true);
    expect(PAPEIS_ROTATIVOS.has("informante")).toBe(true);
  });

  it("inclui policiais e peritos", () => {
    expect(PAPEIS_ROTATIVOS.has("policial-militar")).toBe(true);
    expect(PAPEIS_ROTATIVOS.has("perito-criminal")).toBe(true);
    expect(PAPEIS_ROTATIVOS.has("medico-legista")).toBe(true);
  });

  it("inclui advogado parte contrária", () => {
    expect(PAPEIS_ROTATIVOS.has("advogado-parte-contraria")).toBe(true);
  });

  it("exclui titulares estáveis (juiz, promotor, servidor)", () => {
    expect(PAPEIS_ROTATIVOS.has("juiz")).toBe(false);
    expect(PAPEIS_ROTATIVOS.has("promotor")).toBe(false);
    expect(PAPEIS_ROTATIVOS.has("desembargador")).toBe(false);
    expect(PAPEIS_ROTATIVOS.has("procurador")).toBe(false);
    expect(PAPEIS_ROTATIVOS.has("servidor-cartorio")).toBe(false);
    expect(PAPEIS_ROTATIVOS.has("oficial-justica")).toBe(false);
  });
});

describe("isPapelRotativo", () => {
  it("retorna true para rotativos", () => {
    expect(isPapelRotativo("testemunha")).toBe(true);
    expect(isPapelRotativo("policial-militar")).toBe(true);
  });

  it("retorna false para estáveis", () => {
    expect(isPapelRotativo("juiz")).toBe(false);
    expect(isPapelRotativo("promotor")).toBe(false);
  });

  it("retorna false para null/undefined/desconhecido", () => {
    expect(isPapelRotativo(null)).toBe(false);
    expect(isPapelRotativo(undefined)).toBe(false);
    expect(isPapelRotativo("papel-inexistente")).toBe(false);
  });
});

describe("PAPEIS_VALIDOS", () => {
  it("inclui todos os rotativos + estáveis + outro", () => {
    expect(PAPEIS_VALIDOS).toContain("testemunha");
    expect(PAPEIS_VALIDOS).toContain("juiz");
    expect(PAPEIS_VALIDOS).toContain("outro");
  });
});
