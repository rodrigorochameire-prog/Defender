import { describe, it, expect } from "vitest";
import {
  ehAssistidoNaoIdentificado,
  placeholderAssistidoParaCnj,
} from "../assistido-placeholder";
import { ASSISTIDO_A_IDENTIFICAR } from "../pje-parser";

describe("ehAssistidoNaoIdentificado", () => {
  it("reconhece o marcador puro do parser", () => {
    expect(ehAssistidoNaoIdentificado(ASSISTIDO_A_IDENTIFICAR)).toBe(true);
  });

  it("reconhece o marcador já com CNJ anexado", () => {
    expect(
      ehAssistidoNaoIdentificado(`${ASSISTIDO_A_IDENTIFICAR} — 8010761-11.2026.8.05.0039`),
    ).toBe(true);
  });

  it("trata nome vazio ou só espaços como não identificado", () => {
    expect(ehAssistidoNaoIdentificado("")).toBe(true);
    expect(ehAssistidoNaoIdentificado("   ")).toBe(true);
    expect(ehAssistidoNaoIdentificado(undefined as unknown as string)).toBe(true);
  });

  it("NÃO confunde uma pessoa real com placeholder", () => {
    expect(ehAssistidoNaoIdentificado("Vinicius Santos de Jesus")).toBe(false);
    expect(ehAssistidoNaoIdentificado("Gilmar Santos da Silva Junior")).toBe(false);
  });
});

describe("placeholderAssistidoParaCnj", () => {
  it("isola o placeholder por CNJ (evita colapso de vários sigilosos num só)", () => {
    expect(placeholderAssistidoParaCnj("8010761-11.2026.8.05.0039")).toBe(
      `${ASSISTIDO_A_IDENTIFICAR} — 8010761-11.2026.8.05.0039`,
    );
  });

  it("produz formato que o painel listPendentesRevisao consegue parsear (— <cnj>)", () => {
    const nome = placeholderAssistidoParaCnj("8008728-48.2026.8.05.0039");
    const match = nome.match(/—\s*(.+)$/);
    expect(match?.[1]?.trim()).toBe("8008728-48.2026.8.05.0039");
  });

  it("sem CNJ, volta ao marcador puro (não inventa sufixo)", () => {
    expect(placeholderAssistidoParaCnj(undefined)).toBe(ASSISTIDO_A_IDENTIFICAR);
    expect(placeholderAssistidoParaCnj("  ")).toBe(ASSISTIDO_A_IDENTIFICAR);
  });
});
