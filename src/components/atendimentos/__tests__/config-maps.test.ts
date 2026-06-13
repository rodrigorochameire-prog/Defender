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
