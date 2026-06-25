import { describe, it, expect } from "vitest";
import { getVidaFuncionalScope } from "@/lib/trpc/vida-funcional-scope";

const mk = (over: Record<string, unknown>) => ({
  id: 10, role: "defensor", supervisorId: null, defensoresVinculados: null, ...over,
} as any);

describe("getVidaFuncionalScope", () => {
  it("defensor vê só o próprio", () => {
    expect(getVidaFuncionalScope(mk({ id: 10, role: "defensor" }))).toEqual([10]);
  });
  it("admin NÃO tem god-view — vê só o próprio", () => {
    expect(getVidaFuncionalScope(mk({ id: 1, role: "admin" }))).toEqual([1]);
  });
  it("estagiário vê o supervisor", () => {
    expect(getVidaFuncionalScope(mk({ id: 20, role: "estagiario", supervisorId: 10 }))).toEqual([10]);
  });
  it("estagiário sem supervisor cai no próprio", () => {
    expect(getVidaFuncionalScope(mk({ id: 20, role: "estagiario", supervisorId: null }))).toEqual([20]);
  });
  it("servidor vê os defensores vinculados", () => {
    expect(getVidaFuncionalScope(mk({ id: 30, role: "servidor", defensoresVinculados: [10, 11] }))).toEqual([10, 11]);
  });
  it("servidor sem vínculo cai no próprio (sem god-view)", () => {
    expect(getVidaFuncionalScope(mk({ id: 30, role: "servidor", defensoresVinculados: null }))).toEqual([30]);
  });
});
