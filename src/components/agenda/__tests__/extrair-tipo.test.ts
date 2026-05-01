import { describe, it, expect } from "vitest";
import { extrairTipo } from "../extrair-tipo";

describe("extrairTipo", () => {
  it("título com em-dash separa pelo dash (regressão do bug 2026-04-28)", () => {
    expect(extrairTipo("JUSTIFICAÇÃO — JADSON DE JESUS MACHADO")).toBe(
      "Justificação"
    );
  });

  it("título com hífen comum também separa", () => {
    expect(extrairTipo("JUSTIFICAÇÃO - JADSON")).toBe("Justificação");
  });

  it("título com en-dash também separa", () => {
    expect(extrairTipo("JUSTIFICAÇÃO – JADSON")).toBe("Justificação");
  });

  it("preserva siglas mapeadas", () => {
    expect(extrairTipo("AIJ — JADSON")).toBe("AIJ");
    expect(
      extrairTipo("Audiência de Instrução e Julgamento — JADSON")
    ).toBe("AIJ");
    expect(extrairTipo("Acordo de Não Persecução Penal — Maria")).toBe("ANPP");
  });

  it("preserva abreviações de tipos mapeados (Concentrada/Preliminar)", () => {
    expect(extrairTipo("AUDIÊNCIA CONCENTRADA — Joao")).toBe("Concentrada");
    expect(extrairTipo("AUDIÊNCIA PRELIMINAR — Maria")).toBe("Preliminar");
  });

  it("aplica Title Case quando não há sigla mapeada", () => {
    expect(extrairTipo("OITIVA INFORMAL — Joao")).toBe("Oitiva Informal");
  });

  it("remove prefixo ADV", () => {
    expect(extrairTipo("ADV - JUSTIFICAÇÃO — JADSON")).toBe("Justificação");
    expect(extrairTipo("ADV JUSTIFICAÇÃO")).toBe("Justificação");
  });

  it("título sem dash usa string inteira (em Title Case)", () => {
    expect(extrairTipo("JUSTIFICAÇÃO")).toBe("Justificação");
    expect(extrairTipo("AIJ")).toBe("AIJ");
  });

  it("título longo sem dash é truncado", () => {
    const titulo = "ALGUMA AUDIÊNCIA EXTREMAMENTE LONGA";
    const out = extrairTipo(titulo);
    expect(out.endsWith("…")).toBe(true);
    expect(out.length).toBeLessThanOrEqual(21);
  });
});
