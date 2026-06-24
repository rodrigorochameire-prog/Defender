import { describe, it, expect } from "vitest";
import { htmlParaTexto } from "../html-para-texto";

describe("htmlParaTexto — limpa HTML cru do texto importado (Gerar demanda)", () => {
  it("remove tags inline preservando o texto", () => {
    expect(htmlParaTexto("<p>Olá <b>mundo</b></p>")).toBe("Olá mundo");
  });

  it("<br> e fim de bloco viram quebra de linha", () => {
    expect(htmlParaTexto("linha1<br>linha2")).toBe("linha1\nlinha2");
    expect(htmlParaTexto("<p>A</p><p>B</p>")).toBe("A\nB");
  });

  it("decodifica entidades comuns", () => {
    expect(htmlParaTexto("a &amp; b &nbsp;c")).toBe("a & b c");
    expect(htmlParaTexto("aspas &quot;x&quot; e &#39;y&#39;")).toBe('aspas "x" e \'y\'');
  });

  it("decodifica entidade numérica", () => {
    expect(htmlParaTexto("café &#233;")).toBe("café é");
  });

  it("colapsa espaços e linhas em excesso", () => {
    expect(htmlParaTexto("<p>A</p>\n\n\n<p>B</p>")).toBe("A\n\nB");
    expect(htmlParaTexto("muito    espaço")).toBe("muito espaço");
  });

  it("texto simples passa praticamente intacto (só trim)", () => {
    expect(htmlParaTexto("  texto simples  ")).toBe("texto simples");
  });

  it("nulo/indefinido/vazio → string vazia", () => {
    expect(htmlParaTexto(null)).toBe("");
    expect(htmlParaTexto(undefined)).toBe("");
    expect(htmlParaTexto("<p></p>")).toBe("");
  });
});
