import { describe, it, expect } from "vitest";
import { setAllSections, areAllOpen, nextToggleAll } from "../sheet-sections";

describe("setAllSections", () => {
  it("define todas as chaves para o valor, preservando as chaves", () => {
    const map = { a: true, b: false, c: true };
    expect(setAllSections(map, false)).toEqual({ a: false, b: false, c: false });
    expect(setAllSections(map, true)).toEqual({ a: true, b: true, c: true });
  });

  it("mapa vazio → mapa vazio", () => {
    expect(setAllSections({}, true)).toEqual({});
  });
});

describe("areAllOpen", () => {
  it("true só quando não-vazio e todos abertos", () => {
    expect(areAllOpen({ a: true, b: true })).toBe(true);
    expect(areAllOpen({ a: true, b: false })).toBe(false);
    expect(areAllOpen({})).toBe(false);
  });
});

describe("nextToggleAll", () => {
  it("se tudo aberto → false (recolher); senão → true (expandir)", () => {
    expect(nextToggleAll({ a: true, b: true })).toBe(false);
    expect(nextToggleAll({ a: true, b: false })).toBe(true);
    expect(nextToggleAll({})).toBe(true);
  });
});
