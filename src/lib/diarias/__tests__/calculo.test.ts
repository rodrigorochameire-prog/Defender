import { describe, it, expect } from "vitest";
import { totalCents } from "../calculo";

describe("totalCents", () => {
  it("multiplies quantidade by unit cents", () => {
    expect(totalCents(1, 10000)).toBe(10000);
    expect(totalCents(2, 15000)).toBe(30000);
  });
  it("supports meia-diária", () => {
    expect(totalCents(1.5, 15000)).toBe(22500);
    expect(totalCents(2.5, 12345)).toBe(30863); // 30862.5 → round
  });
  it("is zero when quantidade is zero", () => {
    expect(totalCents(0, 15000)).toBe(0);
  });
});
