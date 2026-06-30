import { describe, it, expect } from "vitest";
import { diasInclusive } from "../calculos";

describe("diasInclusive", () => {
  it("counts inclusive days", () => {
    expect(diasInclusive("2026-07-01", "2026-07-10")).toBe(10);
    expect(diasInclusive("2026-07-01", "2026-07-01")).toBe(1);
  });

  it("returns 0 when fim < inicio", () => {
    expect(diasInclusive("2026-07-10", "2026-07-01")).toBe(0);
  });
});
