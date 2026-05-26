// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { resolveCalendarId, colorIdForAudiencia } from "../calendar-mapping";

describe("resolveCalendarId", () => {
  const ORIGINAL_ENV = { ...process.env };
  beforeEach(() => {
    delete process.env.GOOGLE_CALENDAR_ID_JURI;
    delete process.env.GOOGLE_CALENDAR_ID_VVD;
    delete process.env.GOOGLE_CALENDAR_ID_EP;
    delete process.env.GOOGLE_CALENDAR_ID_CRIMINAL;
    delete process.env.GOOGLE_CALENDAR_ID_CRIMINAL_2;
    delete process.env.GOOGLE_CALENDAR_ID;
  });
  afterEach(() => {
    Object.assign(process.env, ORIGINAL_ENV);
  });

  it("usa calendar específico da área quando env existe", () => {
    process.env.GOOGLE_CALENDAR_ID_JURI = "juri@cal";
    expect(resolveCalendarId("JURI")).toBe("juri@cal");
  });

  it("cai no GOOGLE_CALENDAR_ID quando área não tem env específico", () => {
    process.env.GOOGLE_CALENDAR_ID = "default@cal";
    expect(resolveCalendarId("JURI")).toBe("default@cal");
  });

  it("cai em 'primary' quando nada configurado", () => {
    expect(resolveCalendarId("JURI")).toBe("primary");
  });

  it("aceita area null/undefined", () => {
    process.env.GOOGLE_CALENDAR_ID = "default@cal";
    expect(resolveCalendarId(null)).toBe("default@cal");
    expect(resolveCalendarId(undefined)).toBe("default@cal");
  });

  it("aceita área desconhecida (cai no default)", () => {
    process.env.GOOGLE_CALENDAR_ID = "default@cal";
    expect(resolveCalendarId("FAMILIA")).toBe("default@cal");
  });

  it("mapeia VIOLENCIA_DOMESTICA, EXECUCAO_PENAL, CRIMINAL, CRIMINAL_2_GRAU", () => {
    process.env.GOOGLE_CALENDAR_ID_VVD = "vvd@cal";
    process.env.GOOGLE_CALENDAR_ID_EP = "ep@cal";
    process.env.GOOGLE_CALENDAR_ID_CRIMINAL = "crim@cal";
    process.env.GOOGLE_CALENDAR_ID_CRIMINAL_2 = "crim2@cal";
    expect(resolveCalendarId("VIOLENCIA_DOMESTICA")).toBe("vvd@cal");
    expect(resolveCalendarId("EXECUCAO_PENAL")).toBe("ep@cal");
    expect(resolveCalendarId("CRIMINAL")).toBe("crim@cal");
    expect(resolveCalendarId("CRIMINAL_2_GRAU")).toBe("crim2@cal");
  });
});

describe("colorIdForAudiencia", () => {
  it("Plenário do Júri → ROXO ('3')", () => {
    expect(colorIdForAudiencia("Plenário do Júri")).toBe("3");
    expect(colorIdForAudiencia("plenario do juri")).toBe("3");
  });

  it("Custódia → VERMELHO ('11')", () => {
    expect(colorIdForAudiencia("Custódia")).toBe("11");
    expect(colorIdForAudiencia("custodia")).toBe("11");
  });

  it("Oitiva Especial / Depoimento sem dano → LARANJA ('6')", () => {
    expect(colorIdForAudiencia("Oitiva Especial")).toBe("6");
    expect(colorIdForAudiencia("Depoimento sem dano")).toBe("6");
  });

  it("Preliminar Maria da Penha → AMARELO ('5')", () => {
    expect(colorIdForAudiencia("Preliminar (Maria da Penha)")).toBe("5");
  });

  it("Default → AZUL ('9')", () => {
    expect(colorIdForAudiencia("Instrução e Julgamento")).toBe("9");
    expect(colorIdForAudiencia("Conciliação")).toBe("9");
    expect(colorIdForAudiencia("Una")).toBe("9");
    expect(colorIdForAudiencia("")).toBe("9");
  });
});
