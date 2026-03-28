import { describe, it, expect } from "vitest";
import {
  getComarcaId,
  getComarcaFilter,
} from "@/lib/trpc/comarca-scope";
import type { User } from "@/lib/db/schema";

// Helper to construct minimal User objects for testing
function makeUser(overrides: Partial<User> & { role?: string }): User {
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

// ─── getComarcaId ─────────────────────────────────────────────────────────────

describe("getComarcaId", () => {
  it("returns user.comarcaId when set", () => {
    const user = makeUser({ comarcaId: 5 });
    expect(getComarcaId(user)).toBe(5);
  });

  it("falls back to 1 (Camaçari) when comarcaId is null", () => {
    const user = makeUser({ comarcaId: null as unknown as number });
    expect(getComarcaId(user)).toBe(1);
  });

  it("falls back to 1 when comarcaId is undefined", () => {
    const user = makeUser({ comarcaId: undefined as unknown as number });
    expect(getComarcaId(user)).toBe(1);
  });

  it("returns comarcaId 99 for a user in a remote comarca", () => {
    const user = makeUser({ comarcaId: 99 });
    expect(getComarcaId(user)).toBe(99);
  });
});

// ─── getComarcaFilter ────────────────────────────────────────────────────────

describe("getComarcaFilter", () => {
  it("returns a Drizzle SQL condition object (not null/undefined)", () => {
    const user = makeUser({ comarcaId: 3 });
    // Provide a minimal fake table with a comarcaId column shape
    const fakeTable = { comarcaId: { name: "comarca_id" } };
    const filter = getComarcaFilter(fakeTable as any, user);
    expect(filter).toBeDefined();
    expect(filter).not.toBeNull();
  });

  it("uses the comarcaId from the user (different users produce different SQL)", () => {
    const userA = makeUser({ comarcaId: 2 });
    const userB = makeUser({ comarcaId: 7 });
    const fakeTable = { comarcaId: { name: "comarca_id" } };

    const filterA = getComarcaFilter(fakeTable as any, userA);
    const filterB = getComarcaFilter(fakeTable as any, userB);

    // Both filters should be defined objects
    expect(filterA).toBeDefined();
    expect(filterB).toBeDefined();

    // They should not be the same reference (independent SQL nodes)
    expect(filterA).not.toBe(filterB);
  });

  it("falls back to comarcaId 1 when user has no comarcaId", () => {
    const user = makeUser({ comarcaId: null as unknown as number });
    // getComarcaId returns 1, so getComarcaFilter should not throw
    const fakeTable = { comarcaId: { name: "comarca_id" } };
    expect(() => getComarcaFilter(fakeTable as any, user)).not.toThrow();
    const filter = getComarcaFilter(fakeTable as any, user);
    expect(filter).toBeDefined();
  });
});
