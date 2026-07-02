import { describe, it, expect } from "vitest";
import { buildMagistradoKey } from "../magistrado-key";

describe("buildMagistradoKey", () => {
  it("normalizes name and pairs with comarca", () => {
    expect(buildMagistradoKey("Dr. João Antônio de Sá", 1))
      .toEqual({ nomeNormalizado: "JOAO ANTONIO DE SA", comarcaId: 1 });
  });
  it("strips judicial honorifics/titles", () => {
    expect(buildMagistradoKey("MM. Juiz de Direito Maria Silva", 2).nomeNormalizado)
      .toBe("MARIA SILVA");
  });
  it("returns null comarca when unknown", () => {
    expect(buildMagistradoKey("Ana Costa", null).comarcaId).toBeNull();
  });
});
