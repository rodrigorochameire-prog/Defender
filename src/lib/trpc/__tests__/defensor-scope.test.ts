import { describe, it, expect } from "vitest";
import {
  getDefensorResponsavel,
  getDefensoresVisiveis,
} from "@/lib/trpc/defensor-scope";
import type { User } from "@/lib/db/schema";

// Helper to construct minimal User objects for testing
function makeUser(overrides: Partial<User> & { role: string }): User {
  return {
    id: 1,
    name: "Test User",
    email: "test@example.com",
    passwordHash: null,
    role: "defensor",
    phone: null,
    oab: null,
    comarca: null,
    emailVerified: false,
    approvalStatus: "approved",
    supervisorId: null,
    comarcaId: 1,
    funcao: null,
    nucleo: null,
    isAdmin: false,
    podeVerTodosAssistidos: true,
    podeVerTodosProcessos: true,
    deletedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as User;
}

// ─── getDefensorResponsavel ────────────────────────────────────────────────

describe("getDefensorResponsavel", () => {
  it("returns user.id for defensor", () => {
    const user = makeUser({ id: 10, role: "defensor" });
    expect(getDefensorResponsavel(user)).toBe(10);
  });

  it("returns null for admin", () => {
    const user = makeUser({ id: 2, role: "admin" });
    expect(getDefensorResponsavel(user)).toBeNull();
  });

  it("returns null for servidor", () => {
    const user = makeUser({ id: 3, role: "servidor" });
    expect(getDefensorResponsavel(user)).toBeNull();
  });

  it("returns supervisorId for estagiario with supervisor", () => {
    const user = makeUser({ id: 5, role: "estagiario", supervisorId: 1 });
    expect(getDefensorResponsavel(user)).toBe(1);
  });

  it("returns user.id for estagiario without supervisor", () => {
    const user = makeUser({ id: 5, role: "estagiario", supervisorId: null });
    expect(getDefensorResponsavel(user)).toBe(5);
  });
});

// ─── getDefensoresVisiveis ─────────────────────────────────────────────────

describe("getDefensoresVisiveis", () => {
  it("returns 'all' for admin", () => {
    const user = makeUser({ id: 2, role: "admin" });
    expect(getDefensoresVisiveis(user)).toBe("all");
  });

  it("returns 'all' for servidor", () => {
    const user = makeUser({ id: 3, role: "servidor" });
    expect(getDefensoresVisiveis(user)).toBe("all");
  });

  it("returns [user.id] for defensor", () => {
    const user = makeUser({ id: 10, role: "defensor" });
    expect(getDefensoresVisiveis(user)).toEqual([10]);
  });

  it("returns [supervisorId] for estagiario with supervisor", () => {
    const user = makeUser({ id: 5, role: "estagiario", supervisorId: 2 });
    expect(getDefensoresVisiveis(user)).toEqual([2]);
  });

  it("returns [user.id] for estagiario without supervisor", () => {
    const user = makeUser({ id: 5, role: "estagiario", supervisorId: null });
    expect(getDefensoresVisiveis(user)).toEqual([5]);
  });
});
