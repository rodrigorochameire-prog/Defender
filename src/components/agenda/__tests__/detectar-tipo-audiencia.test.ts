import { describe, it, expect } from "vitest";
import {
  detectarTipoAudiencia,
  detectarSituacao,
} from "../detectar-tipo-audiencia";

describe("detectarTipoAudiencia", () => {
  // Regressão da pauta 02/06/2026: o PJe quebrou "JUSTIFICAÇÃO" exatamente entre
  // Ç e Ã ("JUSTIFICAÇ\nÃO"), e toda Justificação caía no default AIJ.
  it("detecta Justificação mesmo quebrada no meio da palavra (Ç|Ã)", () => {
    const bloco = `MEDIDAS\nPROTETIVAS\nDE\nURGÊNCIA\n(LEI MARIA\nDA PENHA) -\nCRIMINAL\n(1268)\nJUSTIFICAÇ\nÃO\nJUSTIFICAÇ\nÃO\ndesignada`;
    expect(detectarTipoAudiencia(bloco)).toBe("Justificação");
  });

  it("detecta Justificação em auto de prisão em flagrante quebrado", () => {
    const bloco = `AUTO DE\nPRISÃO EM\nFLAGRANTE\n(280)\nJUSTIFICAÇ\nÃO\ndesignada`;
    expect(detectarTipoAudiencia(bloco)).toBe("Justificação");
  });

  it("detecta AIJ com 'INSTRUÇÃO/JULGAMENTO' quebrados em várias linhas", () => {
    const bloco = `AÇÃO PENAL\n-\nPROCEDIME\nNTO\nORDINÁRIO\n(283)\nAUDIÊNCIA\nDE\nINSTRUÇÃO\nE\nJULGAMENT\nO\ndesignada`;
    expect(detectarTipoAudiencia(bloco)).toBe("Instrução e Julgamento");
  });

  it("detecta Oitiva Especial (cautelar) com texto quebrado", () => {
    const bloco = `CAUTELAR\nINOMINADA\nCRIMINAL\n(11955)\nOITIVA\nESPECIAL\nredesignada`;
    expect(detectarTipoAudiencia(bloco)).toBe("Oitiva especial");
  });

  it("detecta Sessão de Julgamento do Júri", () => {
    expect(detectarTipoAudiencia("Plenário do Júri\nSessão de Julgamento")).toBe(
      "Sessão de Julgamento do Tribunal do Júri"
    );
  });

  it("fallback por código de classe quando o texto do tipo é ilegível", () => {
    // Sem palavra de tipo reconhecível, mas com código (1268) → Justificação
    expect(detectarTipoAudiencia("MEDIDAS PROTETIVAS (1268) algo ilegível")).toBe(
      "Justificação"
    );
    expect(detectarTipoAudiencia("(283) sem tipo textual")).toBe(
      "Instrução e Julgamento"
    );
  });

  it("retorna vazio quando nada casa (deixa o chamador decidir pela atribuição)", () => {
    expect(detectarTipoAudiencia("texto qualquer sem pistas")).toBe("");
  });
});

describe("detectarSituacao", () => {
  it("classifica situações normais", () => {
    expect(detectarSituacao("... designada")).toBe("designada");
    expect(detectarSituacao("... realizada")).toBe("realizada");
  });

  it("redesignada não é confundida com designada", () => {
    expect(detectarSituacao("Sala 1 redesignada")).toBe("redesignada");
  });

  it("cancelada quebrada mid-word não vaza como vigente", () => {
    expect(detectarSituacao("Sala 1\nCANCELA\nDA")).toBe("cancelada");
  });
});
