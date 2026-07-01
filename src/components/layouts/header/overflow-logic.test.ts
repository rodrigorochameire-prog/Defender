import { describe, it, expect } from "vitest";
import { computeVisibleActions, type OverflowItem } from "./overflow-logic";

const item = (id: string, priority: number, width = 40): OverflowItem => ({ id, priority, width });

describe("computeVisibleActions", () => {
  it("mantém tudo visível quando cabe (sem reservar o botão …)", () => {
    const r = computeVisibleActions([item("a", 10), item("b", 20)], 100, 40);
    expect(r).toEqual({ visibleIds: ["a", "b"], overflowIds: [] });
  });

  it("derruba a menor prioridade primeiro, preservando a ordem visual dos visíveis", () => {
    // total 120 > 100; budget 60 → caem a (p10) e c (p20) em ordem de queda
    const r = computeVisibleActions([item("a", 10), item("b", 30), item("c", 20)], 100, 40);
    expect(r.visibleIds).toEqual(["b"]);
    expect(r.overflowIds).toEqual(["a", "c"]); // ordem de queda: a (p10), depois c (p20)
  });

  it("derruba vários até caber", () => {
    const r = computeVisibleActions(
      [item("a", 10), item("b", 30), item("c", 20), item("d", 40)],
      100,
      40,
    ); // total 160, budget 60 → derruba a (p10), c (p20), b (p30) em ordem de queda
    expect(r.visibleIds).toEqual(["d"]);
    expect(r.overflowIds).toEqual(["a", "c", "b"]); // ordem de queda por prioridade
  });

  it("empate de prioridade: o item mais à direita cai primeiro", () => {
    const r = computeVisibleActions([item("a", 10), item("b", 10), item("c", 10)], 100, 40);
    // budget 60 → derruba c (rightmost, index 2), depois b (index 1)
    expect(r.visibleIds).toEqual(["a"]);
    expect(r.overflowIds).toEqual(["c", "b"]);
  });

  it("priority Infinity nunca cai, mesmo sem caber", () => {
    const r = computeVisibleActions([item("novo", Infinity, 80), item("x", 10, 80)], 100, 40);
    expect(r.visibleIds).toContain("novo");
    expect(r.overflowIds).toEqual(["x"]);
  });

  it("lista vazia", () => {
    expect(computeVisibleActions([], 100, 40)).toEqual({ visibleIds: [], overflowIds: [] });
  });
});
