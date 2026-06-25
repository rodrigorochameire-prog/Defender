import { describe, it, expect } from "vitest";
import { buildJobMeta } from "./intimacoes";

describe("buildJobMeta", () => {
  it("defaults limit to 80 and keeps selected atribuições", () => {
    const m = buildJobMeta({ atribuicoes: ["VVD_CAMACARI", "JURI_CAMACARI"] });
    expect(m.atribuicoes).toEqual(["VVD_CAMACARI", "JURI_CAMACARI"]);
    expect(m.limit).toBe(80);
    expect(m.since).toBeUndefined();
  });
  it("passes through interval and limit", () => {
    const m = buildJobMeta({
      atribuicoes: ["VVD_CAMACARI"], since: "2026-06-01", until: "2026-06-25", limit: 40,
    });
    expect(m.since).toBe("2026-06-01");
    expect(m.until).toBe("2026-06-25");
    expect(m.limit).toBe(40);
  });
});
