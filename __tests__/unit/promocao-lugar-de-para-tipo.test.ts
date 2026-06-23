import { describe, it, expect } from "vitest";
import { mapearTipoLugar } from "@/lib/promocao/de-para-tipo-lugar";

describe("mapearTipoLugar", () => {
  it("FATO → local-do-fato", () => {
    expect(mapearTipoLugar("FATO")).toBe("local-do-fato");
  });

  it("RESIDENCIA_DEFENDIDO → endereco-assistido", () => {
    expect(mapearTipoLugar("RESIDENCIA_DEFENDIDO")).toBe("endereco-assistido");
  });

  it("RESIDENCIA_VITIMA → residencia-vitima (NUNCA conflar com agressor)", () => {
    expect(mapearTipoLugar("RESIDENCIA_VITIMA")).toBe("residencia-vitima");
  });

  it("RESIDENCIA_TESTEMUNHA → residencia-testemunha", () => {
    expect(mapearTipoLugar("RESIDENCIA_TESTEMUNHA")).toBe("residencia-testemunha");
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

  it("OUTRO/CAMERA/ROTA/desconhecido → outro (fallback honesto)", () => {
    expect(mapearTipoLugar("OUTRO")).toBe("outro");
    expect(mapearTipoLugar("CAMERA")).toBe("outro");
    expect(mapearTipoLugar("ROTA")).toBe("outro");
    expect(mapearTipoLugar("xpto-invalido")).toBe("outro");
  });

  it("string vazia/undefined → outro", () => {
    expect(mapearTipoLugar("")).toBe("outro");
    expect(mapearTipoLugar(undefined)).toBe("outro");
  });
});
