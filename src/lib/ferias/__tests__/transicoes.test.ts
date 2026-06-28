import { describe, it, expect } from "vitest";
import { podeTransicionar } from "../transicoes";

describe("podeTransicionar", () => {
  it("allows the valid edges", () => {
    expect(podeTransicionar("programada", "homologada")).toBe(true);
    expect(podeTransicionar("programada", "cancelada")).toBe(true);
    expect(podeTransicionar("homologada", "em_fruicao")).toBe(true);
    expect(podeTransicionar("em_fruicao", "concluida")).toBe(true);
  });
  it("rejects invalid edges and terminals", () => {
    expect(podeTransicionar("programada", "em_fruicao")).toBe(false);
    expect(podeTransicionar("programada", "concluida")).toBe(false);
    expect(podeTransicionar("concluida", "em_fruicao")).toBe(false);
    expect(podeTransicionar("cancelada", "programada")).toBe(false);
  });
  it("rejects unknown statuses", () => {
    expect(podeTransicionar("foo", "bar")).toBe(false);
  });
});
