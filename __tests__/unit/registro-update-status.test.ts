import { describe, it, expect } from "vitest";
import { updateRegistroInput } from "@/lib/trpc/routers/registros";

describe("updateRegistroInput", () => {
  it("aceita status realizado", () => {
    expect(updateRegistroInput.safeParse({ id: 1, status: "realizado" }).success).toBe(true);
  });
  it("aceita status cancelado", () => {
    expect(updateRegistroInput.safeParse({ id: 1, status: "cancelado" }).success).toBe(true);
  });
  it("rejeita status inválido", () => {
    expect(updateRegistroInput.safeParse({ id: 1, status: "xpto" }).success).toBe(false);
  });
});
