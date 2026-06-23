import { describe, it, expect } from "vitest";
import { calcularIdade } from "../calcular-idade";

// `hoje` fixo torna o cálculo determinístico (o repo desencoraja Date.now() implícito).
const HOJE = new Date("2026-06-23T12:00:00Z");

describe("calcularIdade", () => {
  it("retorna null para entrada nula", () => {
    expect(calcularIdade(null, HOJE)).toBeNull();
  });

  it("retorna null para string vazia ou inválida", () => {
    expect(calcularIdade("", HOJE)).toBeNull();
    expect(calcularIdade("não-é-data", HOJE)).toBeNull();
  });

  it("calcula idade a partir de ISO date (aniversário já passou no ano)", () => {
    // Nascido 1990-01-10; em 2026-06-23 já fez aniversário → 36.
    expect(calcularIdade("1990-01-10", HOJE)).toBe(36);
  });

  it("subtrai um ano quando o aniversário ainda não chegou neste ano", () => {
    // Nascido 1990-12-31; em 2026-06-23 ainda não fez aniversário → 35.
    expect(calcularIdade("1990-12-31", HOJE)).toBe(35);
  });

  it("trata o próprio dia do aniversário como idade completa", () => {
    // Nascido 2000-06-23; em 2026-06-23 faz exatamente 26.
    expect(calcularIdade("2000-06-23", HOJE)).toBe(26);
  });

  it("trata o dia anterior ao aniversário como ainda não feito", () => {
    // Nascido 2000-06-24; em 2026-06-23 ainda tem 25.
    expect(calcularIdade("2000-06-24", HOJE)).toBe(25);
  });

  it("lida com ano bissexto (29/02) sem quebrar", () => {
    // Nascido 2000-02-29; em 2026-06-23 → 26.
    expect(calcularIdade("2000-02-29", HOJE)).toBe(26);
  });

  it("aceita objeto Date como entrada", () => {
    expect(calcularIdade(new Date("1995-03-15"), HOJE)).toBe(31);
  });

  it("retorna null para nascimento no futuro", () => {
    expect(calcularIdade("2030-01-01", HOJE)).toBeNull();
  });

  it("usa new Date() como referência padrão quando hoje é omitido", () => {
    // Sanidade: para uma data muito antiga, a idade é positiva e plausível.
    const idade = calcularIdade("1980-01-01");
    expect(idade).not.toBeNull();
    expect(idade!).toBeGreaterThan(40);
  });
});
