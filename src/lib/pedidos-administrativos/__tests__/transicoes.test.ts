import { describe, it, expect } from "vitest";
import { podeTransicionar } from "../transicoes";
describe("podeTransicionar", () => {
  it("allows valid edges", () => {
    expect(podeTransicionar("solicitado","em_analise")).toBe(true);
    expect(podeTransicionar("solicitado","indeferido")).toBe(true);
    expect(podeTransicionar("solicitado","cancelado")).toBe(true);
    expect(podeTransicionar("em_analise","deferido")).toBe(true);
    expect(podeTransicionar("em_analise","indeferido")).toBe(true);
  });
  it("rejects invalid edges and terminals", () => {
    expect(podeTransicionar("solicitado","deferido")).toBe(false);
    expect(podeTransicionar("deferido","cancelado")).toBe(false);
    expect(podeTransicionar("indeferido","em_analise")).toBe(false);
  });
  it("rejects unknown", () => { expect(podeTransicionar("foo","bar")).toBe(false); });
});
