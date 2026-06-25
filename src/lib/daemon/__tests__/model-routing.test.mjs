import { describe, it, expect } from "vitest";
import { resolveModel, MODEL_ROUTING } from "../model-routing.mjs";

describe("resolveModel", () => {
  it("roteia skills de classificação/baixa complexidade para haiku", () => {
    expect(resolveModel("classify-document")).toBe("haiku");
  });

  it("roteia peças/análises de alta complexidade para opus", () => {
    expect(resolveModel("juri")).toBe("opus");
    expect(resolveModel("vvd")).toBe("opus");
    expect(resolveModel("criminal-comum")).toBe("opus");
    expect(resolveModel("execucao-penal")).toBe("opus");
  });

  it("retorna null para skill não mapeada (mantém default da conta Max)", () => {
    expect(resolveModel("analise-audiencias")).toBeNull();
    expect(resolveModel("pergunte-ao-auto")).toBeNull();
    expect(resolveModel("skill-inexistente-xyz")).toBeNull();
  });

  it("é robusto a entrada vazia/indefinida", () => {
    expect(resolveModel("")).toBeNull();
    expect(resolveModel(undefined)).toBeNull();
    expect(resolveModel(null)).toBeNull();
  });

  it("só usa modelos válidos no mapa", () => {
    const validos = new Set(["haiku", "sonnet", "opus"]);
    for (const m of Object.values(MODEL_ROUTING)) {
      expect(validos.has(m)).toBe(true);
    }
  });
});
