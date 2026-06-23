import { describe, it, expect } from "vitest";
import { detectArmaNaoPericiada, detectDrogaSemLaudo, avaliarFlagsObjeto } from "@/lib/objetos/objetos-flags";

describe("objetos flags", () => {
  it("arma de fogo não periciada → flag", () => {
    expect(detectArmaNaoPericiada({ tipo: "arma-fogo" }, { destino: "em-custodia" })).toBeTruthy();
    expect(detectArmaNaoPericiada({ tipo: "arma-fogo" }, { destino: "pendente" })?.nivel).toBe("amber");
  });
  it("arma de fogo periciada → sem flag", () => {
    expect(detectArmaNaoPericiada({ tipo: "arma-fogo" }, { destino: "periciado" })).toBeNull();
  });
  it("não-arma → sem flag de arma", () => {
    expect(detectArmaNaoPericiada({ tipo: "veiculo" }, { destino: "pendente" })).toBeNull();
  });
  it("droga sem laudo → flag", () => {
    expect(detectDrogaSemLaudo({ tipo: "droga" }, { destino: "pendente" })).toBeTruthy();
  });
  it("droga periciada → sem flag", () => {
    expect(detectDrogaSemLaudo({ tipo: "droga" }, { destino: "periciado" })).toBeNull();
  });
  it("avaliarFlagsObjeto agrega só as ativas", () => {
    expect(avaliarFlagsObjeto({ tipo: "arma-fogo" }, { destino: "pendente" })).toHaveLength(1);
    expect(avaliarFlagsObjeto({ tipo: "celular" }, { destino: "pendente" })).toHaveLength(0);
  });
});
