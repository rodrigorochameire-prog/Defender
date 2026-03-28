import { describe, it, expect } from "vitest";
import { calcularBeneficios } from "@/lib/legal/beneficios";

describe("calcularBeneficios", () => {
  it("furto simples (min 12, max 48, sem violência): ANPP=true, sursis=true, transação=false, substituição=true", () => {
    const result = calcularBeneficios({
      tipoDelito: "furto simples",
      penaMinimaMeses: 12,
      penaMaximaMeses: 48,
      envolveuViolencia: false,
    });

    expect(result.cabeAnpp).toBe(true);
    expect(result.cabeSursis).toBe(true);
    expect(result.cabeTransacao).toBe(false);
    expect(result.cabeSubstituicao).toBe(true);
  });

  it("roubo majorado (min 64, max 180, com violência): todos false", () => {
    const result = calcularBeneficios({
      tipoDelito: "roubo majorado",
      penaMinimaMeses: 64,
      penaMaximaMeses: 180,
      envolveuViolencia: true,
    });

    expect(result.cabeAnpp).toBe(false);
    expect(result.cabeSursis).toBe(false);
    expect(result.cabeTransacao).toBe(false);
    expect(result.cabeSubstituicao).toBe(false);
  });

  it("tráfico privilegiado (min 20, max 40, sem violência): ANPP=true, sursis=false, transação=false, substituição=true", () => {
    const result = calcularBeneficios({
      tipoDelito: "tráfico privilegiado",
      penaMinimaMeses: 20,
      penaMaximaMeses: 40,
      envolveuViolencia: false,
    });

    expect(result.cabeAnpp).toBe(true);
    expect(result.cabeSursis).toBe(false);
    expect(result.cabeTransacao).toBe(false);
    expect(result.cabeSubstituicao).toBe(true);
  });

  it("ameaça (min 1, max 6, sem violência): todos true", () => {
    const result = calcularBeneficios({
      tipoDelito: "ameaça",
      penaMinimaMeses: 1,
      penaMaximaMeses: 6,
      envolveuViolencia: false,
    });

    expect(result.cabeAnpp).toBe(true);
    expect(result.cabeSursis).toBe(true);
    expect(result.cabeTransacao).toBe(true);
    expect(result.cabeSubstituicao).toBe(true);
  });

  it("lesão corporal leve (min 3, max 12, com violência): ANPP=false, sursis=true, transação=true, substituição=false", () => {
    const result = calcularBeneficios({
      tipoDelito: "lesão corporal leve",
      penaMinimaMeses: 3,
      penaMaximaMeses: 12,
      envolveuViolencia: true,
    });

    expect(result.cabeAnpp).toBe(false);
    expect(result.cabeSursis).toBe(true);
    expect(result.cabeTransacao).toBe(true);
    expect(result.cabeSubstituicao).toBe(false);
  });
});
