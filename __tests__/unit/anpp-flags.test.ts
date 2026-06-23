import { describe, it, expect } from "vitest";
import { detectAnppCabivelNaoOferecido } from "@/lib/anpp/anpp-flags";

describe("detectAnppCabivelNaoOferecido", () => {
  const cabivel = { penaMinimaInferior4Anos: true, semViolenciaGraveAmeaca: true, primario: true };

  it("null → null", () => expect(detectAnppCabivelNaoOferecido(null)).toBeNull());

  it("cabível e não oferecido → flag (emerald)", () => {
    const f = detectAnppCabivelNaoOferecido(cabivel);
    expect(f).toBeTruthy();
    expect(f!.nivel).toBe("emerald");
  });

  it("cabível mas já oferecido → null", () => {
    expect(detectAnppCabivelNaoOferecido({ ...cabivel, oferecido: true })).toBeNull();
  });

  it("com violência → não cabível → null", () => {
    expect(detectAnppCabivelNaoOferecido({ ...cabivel, semViolenciaGraveAmeaca: false })).toBeNull();
  });

  it("reincidente (não primário) → null", () => {
    expect(detectAnppCabivelNaoOferecido({ ...cabivel, primario: false })).toBeNull();
  });

  it("pena mínima >= 4a → null", () => {
    expect(detectAnppCabivelNaoOferecido({ ...cabivel, penaMinimaInferior4Anos: false })).toBeNull();
  });

  it("requisitos incompletos (faltam campos) → null (conservador)", () => {
    expect(detectAnppCabivelNaoOferecido({ penaMinimaInferior4Anos: true })).toBeNull();
  });
});
