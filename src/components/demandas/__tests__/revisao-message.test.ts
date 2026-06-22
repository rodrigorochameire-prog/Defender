import { describe, it, expect } from "vitest";
import { montarMensagemRevisao } from "../revisao-message";

describe("montarMensagemRevisao", () => {
  it("monta saudação pelo horário + primeiro nome + corpo", () => {
    const msg = montarMensagemRevisao("Emilly Teste", "Ficou bom. Ajustei X.", 9);
    expect(msg).toContain("Bom dia, Emilly!");
    expect(msg).toContain("Ficou bom. Ajustei X.");
  });
  it("usa Boa tarde/Boa noite conforme a hora", () => {
    expect(montarMensagemRevisao("Ana", "ok", 15)).toContain("Boa tarde, Ana!");
    expect(montarMensagemRevisao("Ana", "ok", 20)).toContain("Boa noite, Ana!");
  });
  it("não quebra com nome vazio", () => {
    expect(montarMensagemRevisao("", "ok", 9)).toContain("Bom dia");
  });
});
