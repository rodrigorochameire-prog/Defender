import { describe, it, expect, vi } from "vitest";
import { createTRPCContext } from "@/lib/trpc/init";

vi.mock("@/lib/auth/session", () => ({
  getSession: vi.fn(() => Promise.resolve(null)),
}));

describe("createTRPCContext", () => {
  it("extrai selectedDefensorScopeId do header x-defensor-scope", async () => {
    const req = new Request("http://localhost/api/trpc", {
      headers: { "x-defensor-scope": "42" },
    });
    const ctx = await createTRPCContext({ req });
    expect(ctx.selectedDefensorScopeId).toBe(42);
  });

  it("retorna null quando o header está ausente", async () => {
    const req = new Request("http://localhost/api/trpc");
    const ctx = await createTRPCContext({ req });
    expect(ctx.selectedDefensorScopeId).toBeNull();
  });

  it("retorna null quando o header é inválido (não numérico)", async () => {
    const req = new Request("http://localhost/api/trpc", {
      headers: { "x-defensor-scope": "abc" },
    });
    const ctx = await createTRPCContext({ req });
    expect(ctx.selectedDefensorScopeId).toBeNull();
  });

  it("retorna null quando o header é 'null' (string literal)", async () => {
    const req = new Request("http://localhost/api/trpc", {
      headers: { "x-defensor-scope": "null" },
    });
    const ctx = await createTRPCContext({ req });
    expect(ctx.selectedDefensorScopeId).toBeNull();
  });
});
