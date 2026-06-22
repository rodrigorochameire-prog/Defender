import { describe, it, expect } from "vitest";
import { createOptimisticIdFactory } from "../optimistic-id";

describe("createOptimisticIdFactory", () => {
  it("gera ids negativos, monotônicos e únicos", () => {
    const next = createOptimisticIdFactory();
    const a = next();
    const b = next();
    const c = next();
    expect([a, b, c]).toEqual([-1, -2, -3]);
    expect(a < 0 && b < 0 && c < 0).toBe(true);
  });

  it("nunca colide em uma rajada (o bug da chave React duplicada)", () => {
    const next = createOptimisticIdFactory();
    const ids = Array.from({ length: 1000 }, () => next());
    expect(new Set(ids).size).toBe(1000);
  });

  it("fábricas independentes têm contadores independentes", () => {
    const a = createOptimisticIdFactory();
    const b = createOptimisticIdFactory();
    expect(a()).toBe(-1);
    expect(a()).toBe(-2);
    expect(b()).toBe(-1); // não compartilha estado com `a`
  });
});
