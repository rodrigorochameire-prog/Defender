import { describe, it, expect } from "vitest";
import { computeVisibleActions, type OverflowItem } from "./overflow-logic";

const item = (id: string, priority: number, width = 40): OverflowItem => ({ id, priority, width });

describe("computeVisibleActions", () => {
  it("mantém tudo visível quando cabe (sem reservar o botão …)", () => {
    const r = computeVisibleActions([item("a", 10), item("b", 20)], 100, 40);
    expect(r).toEqual({ visibleIds: ["a", "b"], overflowIds: [] });
  });

  it("derruba a menor prioridade primeiro, preservando a ordem visual dos visíveis", () => {
    // total 120 > 100; budget = 100 - 40 = 60 → derruba até caber
    const r = computeVisibleActions([item("a", 10), item("b", 30), item("c", 20)], 100, 40);
    expect(r.overflowIds).toEqual(["a"]); // prioridade 10 cai primeiro
    expect(r.visibleIds).toEqual(["b", "c"]); // ordem original preservada
  });

  it("derruba vários até caber", () => {
    const r = computeVisibleActions(
      [item("a", 10), item("b", 30), item("c", 20), item("d", 40)],
      100,
      40,
    ); // total 160, budget 60 → sobra 1 item de 40 + reserva
    expect(r.visibleIds).toEqual(["d"]);
    expect(r.overflowIds).toEqual(["a", "c", "b"]); // ordem original entre os que caíram
  });

  it("empate de prioridade: o item mais à direita cai primeiro", () => {
    const r = computeVisibleActions([item("a", 10), item("b", 10), item("c", 10)], 100, 40);
    // budget 60 → derruba c, depois b
    expect(r.visibleIds).toEqual(["a"]);
    expect(r.overflowIds).toEqual(["b", "c"]);
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
