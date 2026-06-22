import { describe, it, expect } from "vitest";
import { calcularPrescricaoExecutoria } from "@/lib/execucao/prescricao";

// Data fixa para determinismo; marco = N dias antes de hoje.
const HOJE = new Date("2026-06-22T12:00:00");
const marcoHa = (dias: number) =>
  new Date(HOJE.getTime() - dias * 86400000).toISOString().slice(0, 10);

const base = {
  penaTotalDias: 5000,
  diasCumpridos: 4200, // residual 800d ≈ 2,19 anos → art.109: 8 anos = 2920d
  hoje: HOJE,
};

describe("calcularPrescricaoExecutoria", () => {
  it("null quando pena residual <= 0 (pena praticamente extinta)", () => {
    expect(
      calcularPrescricaoExecutoria({
        penaTotalDias: 1000,
        diasCumpridos: 1000,
        marcoInterruptivo: marcoHa(100),
        hoje: HOJE,
      }),
    ).toBeNull();
  });

  it("residual desconta cumprido + remição + detração", () => {
    // residual 700d ≈ 1,92 anos → art.109: 4 anos = 1460d; marco 1400d atrás → iminente
    const r = calcularPrescricaoExecutoria({
      penaTotalDias: 2000,
      diasCumpridos: 1000,
      diasRemidos: 200,
      diasDetraidos: 100,
      marcoInterruptivo: marcoHa(1400),
      hoje: HOJE,
    });
    expect(r!.penaResidualDias).toBe(700);
  });

  it("null quando prescrição ainda distante (fora da janela)", () => {
    const r = calcularPrescricaoExecutoria({
      ...base,
      marcoInterruptivo: marcoHa(100), // faltam ~2820d
    });
    expect(r).toBeNull();
  });

  it("amber quando iminente dentro da janela (120d para prescrever)", () => {
    const r = calcularPrescricaoExecutoria({
      ...base,
      marcoInterruptivo: marcoHa(2800), // prazo 2920 − 2800 = 120
    });
    expect(r).toBeTruthy();
    expect(r!.iminente).toBe(true);
    expect(r!.diasParaPrescricao).toBeGreaterThan(0);
    expect(r!.diasParaPrescricao).toBeLessThanOrEqual(180);
    expect(r!.nivel).toBe("amber");
  });

  it("red quando faltam <= 60 dias", () => {
    const r = calcularPrescricaoExecutoria({
      ...base,
      marcoInterruptivo: marcoHa(2890), // faltam ~30d
    });
    expect(r!.nivel).toBe("red");
  });

  it("red e diasParaPrescricao negativo quando já consumada", () => {
    const r = calcularPrescricaoExecutoria({
      ...base,
      marcoInterruptivo: marcoHa(2950), // prazo 2920 → já passou
    });
    expect(r).toBeTruthy();
    expect(r!.diasParaPrescricao).toBeLessThan(0);
    expect(r!.nivel).toBe("red");
  });

  it("reincidente aumenta o prazo em 1/3 (art. 110)", () => {
    // marco bem antigo p/ manter AMBOS na janela (reincidente tem prazo maior).
    const semReinc = calcularPrescricaoExecutoria({
      ...base,
      marcoInterruptivo: marcoHa(3850),
    });
    const comReinc = calcularPrescricaoExecutoria({
      ...base,
      reincidente: true,
      marcoInterruptivo: marcoHa(3850),
    });
    expect(semReinc!.prazoPrescricionalDias).toBe(2920);
    expect(comReinc!.prazoPrescricionalDias).toBeGreaterThan(2920);
    expect(comReinc!.prazoPrescricionalDias).toBe(Math.round((2920 * 4) / 3));
  });

  it("art. 115 reduz o prazo à metade (maior de 70 na sentença)", () => {
    const r = calcularPrescricaoExecutoria({
      ...base,
      maior70NaDataSentenca: true,
      marcoInterruptivo: marcoHa(1400),
    });
    expect(r!.prazoPrescricionalDias).toBe(1460); // 2920 / 2
  });

  it("tabela do art. 109: pena residual alta usa prazo de 20 anos", () => {
    const r = calcularPrescricaoExecutoria({
      penaTotalDias: 6000, // residual 6000 ≈ 16,4 anos → >12 → 20 anos
      diasCumpridos: 0,
      marcoInterruptivo: marcoHa(7200), // 20a≈7300d → faltam ~100
      hoje: HOJE,
    });
    expect(r!.prazoPrescricionalDias).toBe(7300);
    expect(r!.iminente).toBe(true);
  });
});
