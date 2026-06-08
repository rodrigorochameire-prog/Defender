import { describe, it, expect } from "vitest";
import { montarMensagemDelegacao } from "../delegacao-message";

const oito = Array.from({ length: 8 }, (_, i) => ({
  processoNumero: `000${i}-00.2026`,
  assistidoNome: `Assistido ${i}`,
  ato: "Resposta à Acusação",
}));

describe("montarMensagemDelegacao", () => {
  it("lista TODAS as demandas, sem truncar em 5", () => {
    const msg = montarMensagemDelegacao({
      destinatarioNome: "Amanda Silva",
      demandas: oito,
      instrucoes: "Elaborar minutas.",
      prazo: "2026-06-20",
      horaDoDia: 9,
    });
    expect(msg).toContain("8. ");
    expect(msg).not.toContain("e mais");
    expect(msg).toContain("Amanda");
    expect(msg).toContain("Elaborar minutas.");
  });

  it("saudação varia por hora", () => {
    const m = montarMensagemDelegacao({ destinatarioNome: "Ana", demandas: oito.slice(0, 1), horaDoDia: 20 });
    expect(m.startsWith("Boa noite")).toBe(true);
  });
});
