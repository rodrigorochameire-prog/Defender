import { describe, it, expect } from "vitest";
import { podeTransicionar } from "../transicoes";

describe("podeTransicionar", () => {
  it("allows the valid edges", () => {
    expect(podeTransicionar("a_requerer", "requerida")).toBe(true);
    expect(podeTransicionar("requerida", "autorizada")).toBe(true);
    expect(podeTransicionar("autorizada", "paga")).toBe(true);
    expect(podeTransicionar("a_requerer", "cancelada")).toBe(true);
    expect(podeTransicionar("autorizada", "cancelada")).toBe(true);
  });
  it("rejects invalid edges and terminals", () => {
    expect(podeTransicionar("a_requerer", "paga")).toBe(false);
    expect(podeTransicionar("requerida", "paga")).toBe(false);
    expect(podeTransicionar("paga", "cancelada")).toBe(false);
    expect(podeTransicionar("cancelada", "a_requerer")).toBe(false);
  });
  it("rejects unknown statuses", () => {
    expect(podeTransicionar("foo", "bar")).toBe(false);
  });
});
