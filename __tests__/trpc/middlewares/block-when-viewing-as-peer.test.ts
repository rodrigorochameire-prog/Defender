import { describe, it, expect, vi } from "vitest";
import { TRPCError } from "@trpc/server";
import { blockWhenViewingAsPeerCheck } from "@/lib/trpc/middlewares/block-when-viewing-as-peer";

const fakeUser = { id: 1, role: "admin", name: "Rodrigo" } as any;

describe("blockWhenViewingAsPeerCheck", () => {
  it("permite query mesmo com scope apontando para outro user", () => {
    expect(() =>
      blockWhenViewingAsPeerCheck({
        type: "query",
        user: fakeUser,
        selectedDefensorScopeId: 42,
      })
    ).not.toThrow();
  });

  it("permite mutation quando selectedDefensorScopeId é null", () => {
    expect(() =>
      blockWhenViewingAsPeerCheck({
        type: "mutation",
        user: fakeUser,
        selectedDefensorScopeId: null,
      })
    ).not.toThrow();
  });

  it("permite mutation quando selectedDefensorScopeId é igual ao user.id", () => {
    expect(() =>
      blockWhenViewingAsPeerCheck({
        type: "mutation",
        user: fakeUser,
        selectedDefensorScopeId: 1,
      })
    ).not.toThrow();
  });

  it("bloqueia mutation quando selectedDefensorScopeId aponta para outro user", () => {
    expect(() =>
      blockWhenViewingAsPeerCheck({
        type: "mutation",
        user: fakeUser,
        selectedDefensorScopeId: 42,
      })
    ).toThrow(TRPCError);
  });

  it("mensagem de erro é explicativa", () => {
    try {
      blockWhenViewingAsPeerCheck({
        type: "mutation",
        user: fakeUser,
        selectedDefensorScopeId: 42,
      });
    } catch (e) {
      expect((e as TRPCError).code).toBe("FORBIDDEN");
      expect((e as TRPCError).message).toMatch(/somente-leitura|read.?only/i);
    }
  });
});
