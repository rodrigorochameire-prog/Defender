import { describe, it, expect } from "vitest";
import {
  STATUS_MEDIDA,
  STATUS_MEDIDA_LABEL,
  rotuloMedida,
} from "../medidas-taxonomia";

describe("rótulos da taxonomia MPU", () => {
  it("rotuloMedida devolve o rótulo legal de um código conhecido", () => {
    expect(rotuloMedida("PROIBICAO_APROXIMACAO")).toBe("Proibição de aproximação");
    expect(rotuloMedida("AFASTAMENTO_LAR")).toBe("Afastamento do lar");
  });

  it("rotuloMedida devolve o próprio código quando desconhecido", () => {
    expect(rotuloMedida("XPTO")).toBe("XPTO");
  });

  it("STATUS_MEDIDA_LABEL cobre todos os status (inclui suspensa, sem prorrogada)", () => {
    const valores = Object.values(STATUS_MEDIDA);
    expect(valores.sort()).toEqual(
      ["ativa", "cumprida", "descumprida", "revogada", "suspensa"].sort(),
    );
    for (const s of valores) {
      expect(typeof STATUS_MEDIDA_LABEL[s]).toBe("string");
      expect(STATUS_MEDIDA_LABEL[s].length).toBeGreaterThan(0);
    }
  });
});
