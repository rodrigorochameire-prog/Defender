import { describe, it, expect } from "vitest";
import { normalizarNome } from "@/lib/pessoas/normalize";

describe("normalizarNome", () => {
  it("lowercase + trim", () => {
    expect(normalizarNome("  João Silva  ")).toBe("joao silva");
  });

  it("remove acentos", () => {
    expect(normalizarNome("João")).toBe("joao");
    expect(normalizarNome("Antônio")).toBe("antonio");
    expect(normalizarNome("José Cândido")).toBe("jose candido");
  });

  it("colapsa múltiplos espaços", () => {
    expect(normalizarNome("João   da    Silva")).toBe("joao da silva");
  });

  it("remove pontuação", () => {
    expect(normalizarNome("Dr. João S.")).toBe("joao s");
  });

  it("remove pronomes de tratamento", () => {
    expect(normalizarNome("Dr. João Silva")).toBe("joao silva");
    expect(normalizarNome("Dra. Ana Costa")).toBe("ana costa");
    expect(normalizarNome("PM João Souza")).toBe("joao souza");
    expect(normalizarNome("Sgt. Carlos Lima")).toBe("carlos lima");
  });

  it("vazio retorna vazio", () => {
    expect(normalizarNome("")).toBe("");
    expect(normalizarNome("   ")).toBe("");
  });

  it("números são preservados", () => {
    expect(normalizarNome("João 2º")).toBe("joao 2");
  });

  it("não falha com null-like", () => {
    expect(normalizarNome(null as any)).toBe("");
    expect(normalizarNome(undefined as any)).toBe("");
  });
});
