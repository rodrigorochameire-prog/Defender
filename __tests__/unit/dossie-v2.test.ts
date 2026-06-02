import { describe, it, expect } from "vitest";
import { hasDossieV2, nivelTeseClass } from "@/lib/agenda/dossie-v2";

describe("hasDossieV2", () => {
  it("true quando analysisData tem .dossie objeto", () => {
    expect(hasDossieV2({ dossie: { ato: "x" }, pje_autos: {} })).toBe(true);
  });
  it("false sem dossie", () => {
    expect(hasDossieV2({ pje_autos: {} })).toBe(false);
  });
  it("false para null/undefined/não-objeto/dossie nulo", () => {
    expect(hasDossieV2(null)).toBe(false);
    expect(hasDossieV2(undefined)).toBe(false);
    expect(hasDossieV2("x")).toBe(false);
    expect(hasDossieV2({ dossie: null })).toBe(false);
  });
});

describe("nivelTeseClass", () => {
  it("classifica ALTA/MÉDIA/BAIXA pelo texto do nível", () => {
    expect(nivelTeseClass("■■■■□ ALTA")).toBe("alta");
    expect(nivelTeseClass("■■■□□ MÉDIA")).toBe("media");
    expect(nivelTeseClass("■■□□□ BAIXA")).toBe("baixa");
  });
  it("fallback neutra", () => {
    expect(nivelTeseClass(undefined)).toBe("neutra");
    expect(nivelTeseClass("???")).toBe("neutra");
  });
});
