import { describe, it, expect } from "vitest";
import { chipsDaMedida } from "../medida-mpu-card";

describe("chipsDaMedida", () => {
  it("monta chips de protegidos, meios e lugares com rótulos legíveis", () => {
    const chips = chipsDaMedida({
      protegidos: ["ofendida", "familiares"],
      meios: ["telefone", "redes_sociais"],
      lugares: ["trabalho_vitima"],
      valor: undefined,
    });
    expect(chips).toContain("Ofendida");
    expect(chips).toContain("Familiares");
    expect(chips).toContain("Telefone");
    expect(chips).toContain("Redes sociais");
    expect(chips).toContain("Trabalho da vítima");
  });

  it("devolve lista vazia quando não há parâmetros", () => {
    expect(chipsDaMedida(null)).toEqual([]);
    expect(chipsDaMedida({})).toEqual([]);
  });
});
