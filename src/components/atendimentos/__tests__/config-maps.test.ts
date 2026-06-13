import { describe, it, expect } from "vitest";
import {
  AREA_TO_ATRIBUICAO_ENUM,
  AREA_TO_ATOS_LABEL,
  AREA_CONFIG,
} from "../config";

// Os 6 únicos enums aceitos por demandas.createFromForm (ATRIBUICOES_VALIDAS).
const ATRIBUICOES_VALIDAS = new Set([
  "JURI_CAMACARI",
  "GRUPO_JURI",
  "VVD_CAMACARI",
  "EXECUCAO_PENAL",
  "SUBSTITUICAO",
  "SUBSTITUICAO_CIVEL",
]);

describe("AREA_TO_ATRIBUICAO_ENUM", () => {
  it("toda área mapeia para um enum aceito por createFromForm", () => {
    for (const [area, enumVal] of Object.entries(AREA_TO_ATRIBUICAO_ENUM)) {
      expect(ATRIBUICOES_VALIDAS.has(enumVal), `${area} → ${enumVal}`).toBe(true);
    }
  });

  it("cobre todas as áreas do AREA_CONFIG", () => {
    for (const area of Object.keys(AREA_CONFIG)) {
      expect(AREA_TO_ATRIBUICAO_ENUM[area], `falta enum p/ ${area}`).toBeDefined();
      expect(AREA_TO_ATOS_LABEL[area], `falta label de atos p/ ${area}`).toBeDefined();
    }
  });
});

import { whatsappUrl } from "../config";

describe("whatsappUrl", () => {
  it("prefixa 55 e remove formatação", () => {
    expect(whatsappUrl("(71) 99999-8888")).toBe("https://wa.me/5571999998888");
  });
  it("mantém número que já tem código do país", () => {
    expect(whatsappUrl("5571999998888")).toBe("https://wa.me/5571999998888");
  });
  it("anexa texto quando fornecido", () => {
    expect(whatsappUrl("71999998888", "Oi")).toBe("https://wa.me/5571999998888?text=Oi");
  });
  it("retorna null sem telefone discável", () => {
    expect(whatsappUrl(null)).toBeNull();
    expect(whatsappUrl("123")).toBeNull();
  });
});
