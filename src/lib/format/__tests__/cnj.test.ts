import { describe, it, expect } from "vitest";
import { onlyDigits, computeCnjCheckDigits, isValidCnj, formatCnj } from "../cnj";

// Número real (do processo de referência): 2000109-71.2025.8.05.0039
const VALIDO = "2000109-71.2025.8.05.0039";
const VALIDO_DIGITOS = "20001097120258050039";

describe("onlyDigits", () => {
  it("remove máscara e espaços", () => {
    expect(onlyDigits(VALIDO)).toBe(VALIDO_DIGITOS);
    expect(onlyDigits(" 12.34-56 ")).toBe("123456");
    expect(onlyDigits("")).toBe("");
  });
});

describe("computeCnjCheckDigits", () => {
  it("calcula o DV correto dos 18 dígitos sem DV", () => {
    // seq=2000109 ano=2025 jus=8 trib=05 orig=0039 → 200010920258050039
    expect(computeCnjCheckDigits("200010920258050039")).toBe("71");
  });

  it("retorna DV com zero à esquerda quando < 10", () => {
    expect(computeCnjCheckDigits("200010920258050039")).toHaveLength(2);
  });
});

describe("isValidCnj", () => {
  it("aceita número real válido (com e sem máscara)", () => {
    expect(isValidCnj(VALIDO)).toBe(true);
    expect(isValidCnj(VALIDO_DIGITOS)).toBe(true);
  });

  it("rejeita DV trocado", () => {
    expect(isValidCnj("2000109-72.2025.8.05.0039")).toBe(false);
  });

  it("rejeita tamanho errado", () => {
    expect(isValidCnj("2000109")).toBe(false);
    expect(isValidCnj(VALIDO_DIGITOS + "0")).toBe(false);
    expect(isValidCnj("")).toBe(false);
  });

  it("rejeita não-numérico", () => {
    expect(isValidCnj("abc")).toBe(false);
  });
});

describe("formatCnj", () => {
  it("aplica a máscara completa", () => {
    expect(formatCnj(VALIDO_DIGITOS)).toBe("2000109-71.2025.8.05.0039");
    expect(formatCnj(VALIDO)).toBe("2000109-71.2025.8.05.0039");
  });

  it("formata parcial conforme o usuário digita", () => {
    expect(formatCnj("2000109")).toBe("2000109");
    expect(formatCnj("200010971")).toBe("2000109-71");
    expect(formatCnj("2000109712025")).toBe("2000109-71.2025");
  });

  it("ignora dígitos além de 20", () => {
    expect(formatCnj(VALIDO_DIGITOS + "999")).toBe("2000109-71.2025.8.05.0039");
  });
});
