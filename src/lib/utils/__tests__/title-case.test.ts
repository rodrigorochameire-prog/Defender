import { describe, it, expect } from "vitest";
import { toTitleCase } from "../title-case";

describe("toTitleCase", () => {
  it("uppercase comum vira Title Case", () => {
    expect(toTitleCase("JUSTIFICAÇÃO")).toBe("Justificação");
    expect(toTitleCase("AUDIÊNCIA CONCENTRADA")).toBe("Audiência Concentrada");
    expect(toTitleCase("MEDIDAS PROTETIVAS")).toBe("Medidas Protetivas");
  });

  it("siglas conhecidas permanecem em caixa alta", () => {
    expect(toTitleCase("AIJ")).toBe("AIJ");
    expect(toTitleCase("ANPP")).toBe("ANPP");
    expect(toTitleCase("PAP")).toBe("PAP");
    expect(toTitleCase("IRDR")).toBe("IRDR");
    expect(toTitleCase("STJ")).toBe("STJ");
  });

  it("siglas embutidas em frase permanecem em caixa alta", () => {
    expect(toTitleCase("AUDIÊNCIA AIJ")).toBe("Audiência AIJ");
    expect(toTitleCase("ACORDO ANPP COM MP")).toBe("Acordo ANPP com MP");
  });

  it("conectivos minúsculos exceto na primeira posição", () => {
    expect(toTitleCase("AUDIÊNCIA DE INSTRUÇÃO")).toBe("Audiência de Instrução");
    expect(toTitleCase("VARA DA FAZENDA PÚBLICA")).toBe("Vara da Fazenda Pública");
    expect(toTitleCase("DE ACORDO COM A LEI")).toBe("De Acordo com a Lei");
  });

  it("heurística: token todo maiúsculo de até 4 chars vira sigla", () => {
    expect(toTitleCase("CASO XYZ")).toBe("Caso XYZ");
    expect(toTitleCase("RELATOR JKLM")).toBe("Relator JKLM");
  });

  it("heurística não dispara para tokens longos", () => {
    expect(toTitleCase("AUDIÊNCIA")).toBe("Audiência");
    expect(toTitleCase("CONCENTRADA")).toBe("Concentrada");
  });

  it("input misto/Title já formatado preserva siglas", () => {
    expect(toTitleCase("Audiência AIJ")).toBe("Audiência AIJ");
    expect(toTitleCase("audiência aij")).toBe("Audiência AIJ");
  });

  it("strings vazias/whitespace", () => {
    expect(toTitleCase("")).toBe("");
    expect(toTitleCase("   ")).toBe("   ");
  });

  it("preserva pontuação adjacente", () => {
    expect(toTitleCase("AUDIÊNCIA, INSTRUÇÃO E JULGAMENTO")).toBe(
      "Audiência, Instrução e Julgamento"
    );
  });
});
