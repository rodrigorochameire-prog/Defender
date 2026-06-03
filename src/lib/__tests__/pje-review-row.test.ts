import { describe, it, expect } from "vitest";
import { montarReviewRow, calcularPrazoParaAto } from "../pje-review-row";

const base = {
  assistido: "João da Silva",
  numeroProcesso: "0000001-00.2026.8.05.0039",
  dataExpedicao: "01/06/2026",
  crime: "Ameaça",
  ordemOriginal: 0,
};

describe("montarReviewRow — pré-preenchimento de ato", () => {
  it("confiança alta preenche ato e prazo derivado", () => {
    const row = montarReviewRow(
      { ...base, tipoDocumento: "Intimação", tipoProcesso: "APOrd" },
      "Violência Doméstica",
      0,
    );
    expect(row.ato).toBe("Resposta à Acusação");
    expect(row.atoConfidence).toBe("high");
    expect(row.prazo).toBe(calcularPrazoParaAto("01/06/2026", "Resposta à Acusação"));
    expect(row.status).toBe("triagem");
    expect(row.prazoManual).toBe(false);
  });

  it("confiança média preenche ato", () => {
    const row = montarReviewRow(
      { ...base, tipoDocumento: "Intimação", tipoProcesso: "MPUMPCrim" },
      "Violência Doméstica",
      0,
    );
    expect(row.ato).toBe("Modulação de MPU");
    expect(row.atoConfidence).toBe("medium");
  });

  it("confiança baixa deixa ato e prazo vazios", () => {
    const row = montarReviewRow(
      { ...base, tipoDocumento: "Intimação", tipoProcesso: undefined },
      "Violência Doméstica",
      0,
    );
    expect(row.atoConfidence).toBe("low");
    expect(row.ato).toBe("");
    expect(row.prazo).toBe("");
  });

  it("ordemOriginal ausente cai no index", () => {
    const row = montarReviewRow(
      { ...base, ordemOriginal: undefined, tipoDocumento: "Sentença" },
      "Tribunal do Júri",
      7,
    );
    expect(row.ordemOriginal).toBe(7);
  });
});
