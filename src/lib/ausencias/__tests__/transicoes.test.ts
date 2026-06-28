import { describe, it, expect } from "vitest";
import { podeTransicionar } from "../transicoes";

describe("podeTransicionar", () => {
  it("allows valid edges", () => {
    expect(podeTransicionar("solicitada", "deferida")).toBe(true);
    expect(podeTransicionar("solicitada", "indeferida")).toBe(true);
    expect(podeTransicionar("solicitada", "cancelada")).toBe(true);
    expect(podeTransicionar("deferida", "gozada")).toBe(true);
    expect(podeTransicionar("deferida", "cancelada")).toBe(true);
  });

  it("rejects invalid edges and terminals", () => {
    expect(podeTransicionar("solicitada", "gozada")).toBe(false);
    expect(podeTransicionar("deferida", "indeferida")).toBe(false);
    expect(podeTransicionar("gozada", "cancelada")).toBe(false);
    expect(podeTransicionar("indeferida", "solicitada")).toBe(false);
  });

  it("rejects unknown", () => {
    expect(podeTransicionar("foo", "bar")).toBe(false);
  });
});
