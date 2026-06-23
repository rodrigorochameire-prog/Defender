import { describe, it, expect } from "vitest";
import { mapearTipoLugar } from "@/lib/promocao/de-para-tipo-lugar";

describe("mapearTipoLugar", () => {
  it("FATO → local-do-fato", () => {
    expect(mapearTipoLugar("FATO")).toBe("local-do-fato");
  });

  it("RESIDENCIA_DEFENDIDO → endereco-assistido", () => {
    expect(mapearTipoLugar("RESIDENCIA_DEFENDIDO")).toBe("endereco-assistido");
  });

  it("RESIDENCIA_VITIMA → residencia-agressor (vítima/agressor é o outro lado)", () => {
    // No domínio (VVD), a "residência da vítima" / "residência do agressor" mapeia
    // ao enum residencia-agressor (único slot de residência de terceiro).
    expect(mapearTipoLugar("RESIDENCIA_VITIMA")).toBe("residencia-agressor");
  });

  it("RESIDENCIA_TESTEMUNHA → residencia-agressor (residência de terceiro)", () => {
    expect(mapearTipoLugar("RESIDENCIA_TESTEMUNHA")).toBe("residencia-agressor");
  });

  it("LOCAL_TRABALHO → trabalho-agressor", () => {
    expect(mapearTipoLugar("LOCAL_TRABALHO")).toBe("trabalho-agressor");
  });

  it("DELEGACIA → local-atendimento", () => {
    expect(mapearTipoLugar("DELEGACIA")).toBe("local-atendimento");
  });

  it("FORUM → local-atendimento", () => {
    expect(mapearTipoLugar("FORUM")).toBe("local-atendimento");
  });

  it("case-insensitive e com espaços", () => {
    expect(mapearTipoLugar("  fato ")).toBe("local-do-fato");
  });

  it("OUTRO → radar-noticia (fallback genérico)", () => {
    expect(mapearTipoLugar("OUTRO")).toBe("radar-noticia");
  });

  it("tipo desconhecido → radar-noticia (fallback)", () => {
    expect(mapearTipoLugar("CAMERA")).toBe("radar-noticia");
    expect(mapearTipoLugar("ROTA")).toBe("radar-noticia");
    expect(mapearTipoLugar("xpto-invalido")).toBe("radar-noticia");
  });

  it("string vazia/undefined → radar-noticia", () => {
    expect(mapearTipoLugar("")).toBe("radar-noticia");
    expect(mapearTipoLugar(undefined)).toBe("radar-noticia");
  });
});
