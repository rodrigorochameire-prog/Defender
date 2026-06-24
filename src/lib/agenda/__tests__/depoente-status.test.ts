import { describe, it, expect } from "vitest";
import { derivarStatusOitiva } from "../depoente-status";

describe("derivarStatusOitiva", () => {
  it("marca ouvido na delegacia quando há depoimento_ip", () => {
    const s = derivarStatusOitiva({ depoimento_ip: "Declarou que viu o fato (Num. 1 - Pág. 2)." });
    expect(s.ouvidoDelegacia).toBe(true);
    expect(s.ouvidoJuizo).toBe(false);
  });

  it("não marca delegacia quando depoimento_ip é vazio/nulo", () => {
    expect(derivarStatusOitiva({ depoimento_ip: null }).ouvidoDelegacia).toBe(false);
    expect(derivarStatusOitiva({ depoimento_ip: "   " }).ouvidoDelegacia).toBe(false);
  });

  it("marca ouvido em juízo quando há depoimento_juizo", () => {
    const s = derivarStatusOitiva({ depoimento_juizo: "Confirmou em juízo (Num. 5 - Pág. 1)." });
    expect(s.ouvidoJuizo).toBe(true);
  });

  it("marca ouvido em juízo quando ja_ouvido.sim é true (mesmo sem depoimento_juizo)", () => {
    const s = derivarStatusOitiva({ ja_ouvido: { sim: true, data: "2023-08-28" } });
    expect(s.ouvidoJuizo).toBe(true);
  });

  it("marca ouvido em juízo quando comparecimento é ouvido_anteriormente", () => {
    expect(derivarStatusOitiva({ comparecimento: "ouvido_anteriormente" }).ouvidoJuizo).toBe(true);
  });

  it("faltaJuizo é true quando não ouvido em juízo", () => {
    expect(derivarStatusOitiva({ depoimento_ip: "x" }).faltaJuizo).toBe(true);
    expect(derivarStatusOitiva({ ja_ouvido: { sim: true } }).faltaJuizo).toBe(false);
  });

  it("traz o motivo (label) quando não intimado", () => {
    const s = derivarStatusOitiva({ intimacao: "nao_intimado", motivo_nao_intimacao: "mandado_nao_cumprido" });
    expect(s.intimacao).toBe("nao_intimado");
    expect(s.motivoLabel).toBe("mandado não cumprido");
  });

  it("motivoLabel é null quando intimado (motivo só importa se não intimado)", () => {
    const s = derivarStatusOitiva({ intimacao: "intimado", motivo_nao_intimacao: "mandado_nao_cumprido" });
    expect(s.motivoLabel).toBeNull();
  });

  it("intimação default é 'desconhecido' quando ausente", () => {
    expect(derivarStatusOitiva({}).intimacao).toBe("desconhecido");
  });

  // --- F3: intimado (boolean|null) + certidão de comunicação ---

  it("intimado é true quando intimação === 'intimado'", () => {
    expect(derivarStatusOitiva({ intimacao: "intimado" }).intimado).toBe(true);
  });

  it("intimado é false quando explicitamente não intimado", () => {
    expect(derivarStatusOitiva({ intimacao: "nao_intimado" }).intimado).toBe(false);
  });

  it("intimado é null quando o status é desconhecido (ausente)", () => {
    expect(derivarStatusOitiva({}).intimado).toBeNull();
    expect(derivarStatusOitiva({ intimacao: "desconhecido" }).intimado).toBeNull();
  });

  it("intimado é null para estados que não afirmam nem negam a intimação (pendente/dispensada)", () => {
    expect(derivarStatusOitiva({ intimacao: "pendente" }).intimado).toBeNull();
    expect(derivarStatusOitiva({ intimacao: "dispensada" }).intimado).toBeNull();
  });

  it("expõe o teor da certidão quando presente (snake_case certidao_comunicacao)", () => {
    const s = derivarStatusOitiva({ certidao_comunicacao: "Mandado cumprido. Intimado pessoalmente." });
    expect(s.certidao).toBe("Mandado cumprido. Intimado pessoalmente.");
  });

  it("expõe o teor da certidão quando presente (camelCase certidaoComunicacao)", () => {
    const s = derivarStatusOitiva({ certidaoComunicacao: "AR negativo — não localizado." });
    expect(s.certidao).toBe("AR negativo — não localizado.");
  });

  it("certidao é null quando ausente ou vazia", () => {
    expect(derivarStatusOitiva({}).certidao).toBeNull();
    expect(derivarStatusOitiva({ certidao_comunicacao: "   " }).certidao).toBeNull();
  });
});
