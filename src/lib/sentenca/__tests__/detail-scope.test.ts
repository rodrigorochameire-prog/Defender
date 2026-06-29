import { describe, it, expect } from "vitest";
import { getSentencaDetailScope } from "@/lib/trpc/defensor-scope";

const u = (over: Record<string, unknown>) => ({ id: 1, role: "defensor", ...over } as any);

describe("getSentencaDetailScope", () => {
  it("admin sees all", () => {
    expect(getSentencaDetailScope(u({ role: "admin" }))).toBe("all");
  });
  it("defensor sees only own (by demanda defensorId)", () => {
    expect(getSentencaDetailScope(u({ id: 2, role: "defensor" }))).toEqual([2]);
  });
  it("estagiário sees supervisor's", () => {
    expect(getSentencaDetailScope(u({ id: 9, role: "estagiario", supervisorId: 2 }))).toEqual([2]);
  });
});
