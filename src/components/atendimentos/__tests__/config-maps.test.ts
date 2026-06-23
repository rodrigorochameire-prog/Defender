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

// Cores de área unificadas com a atribuição central (decisão do usuário):
// Criminal→rose, Cível/Família→orange, demais batendo com a paleta do app.
describe("AREA_CONFIG · cores da atribuição central", () => {
  const HUE: Record<string, string> = {
    CRIMINAL: "rose",
    VIOLENCIA_DOMESTICA: "amber",
    JURI: "emerald",
    EXECUCAO_PENAL: "blue",
    CIVEL: "orange",
    FAMILIA: "orange",
  };
  for (const [area, hue] of Object.entries(HUE)) {
    it(`${area} usa ${hue}`, () => {
      expect(AREA_CONFIG[area].border).toBe(`border-l-${hue}-500`);
      expect(AREA_CONFIG[area].badge).toContain(`${hue}-`);
    });
  }
  it("preserva rótulos próprios do atendimento", () => {
    expect(AREA_CONFIG.CRIMINAL.label).toBe("Criminal");
    expect(AREA_CONFIG.EXECUCAO_PENAL.shortLabel).toBe("EP");
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
