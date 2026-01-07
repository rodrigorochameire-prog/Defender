import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAdminContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "admin-test",
    email: "admin@tucocare.com",
    name: "Admin Test",
    loginMethod: "manus",
    role: "admin",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };

  return ctx;
}

function createTutorContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 2,
    openId: "tutor-test",
    email: "tutor@tucocare.com",
    name: "Tutor Test",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };

  return ctx;
}

describe("Pets Management", () => {
  it("admin can list all pets", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const pets = await caller.pets.list();
    expect(Array.isArray(pets)).toBe(true);
  });

  it("tutor can list only their pets", async () => {
    const ctx = createTutorContext();
    const caller = appRouter.createCaller(ctx);

    const pets = await caller.pets.list();
    expect(Array.isArray(pets)).toBe(true);
  });

  it("admin can create a new pet", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.pets.create({
      name: "Test Pet",
      breed: "Golden Retriever",
      age: "2a",
      weight: 30000,
    });

    expect(result).toHaveProperty("id");
    expect(typeof result.id).toBe("number");
  });

  it("tutor cannot create a pet (admin only)", async () => {
    const ctx = createTutorContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.pets.create({
        name: "Test Pet",
        breed: "Golden Retriever",
      })
    ).rejects.toThrow("Admin access required");
  });
});

describe("Dashboard Stats", () => {
  it("admin can view dashboard stats", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const stats = await caller.dashboard.stats();
    
    expect(stats).toHaveProperty("totalPets");
    expect(stats).toHaveProperty("checkedIn");
    expect(stats).toHaveProperty("checkedOut");
    expect(stats).toHaveProperty("monthlyRevenue");
    expect(stats).toHaveProperty("upcomingVaccines");
    
    expect(typeof stats.totalPets).toBe("number");
    expect(typeof stats.checkedIn).toBe("number");
    expect(typeof stats.checkedOut).toBe("number");
  });

  it("tutor cannot view dashboard stats (admin only)", async () => {
    const ctx = createTutorContext();
    const caller = appRouter.createCaller(ctx);

    await expect(caller.dashboard.stats()).rejects.toThrow("Admin access required");
  });
});

describe("Vaccine Library", () => {
  it("anyone can view vaccine library", async () => {
    const ctx = createTutorContext();
    const caller = appRouter.createCaller(ctx);

    const vaccines = await caller.vaccines.library();
    
    expect(Array.isArray(vaccines)).toBe(true);
    expect(vaccines.length).toBeGreaterThan(0);
    
    // Check if common vaccines are present
    const vaccineNames = vaccines.map(v => v.name);
    expect(vaccineNames).toContain("V10 (Déctupla)");
    expect(vaccineNames).toContain("Antirrábica");
  });
});

describe("Medication Library", () => {
  it("anyone can view medication library", async () => {
    const ctx = createTutorContext();
    const caller = appRouter.createCaller(ctx);

    const medications = await caller.medications.library();
    
    expect(Array.isArray(medications)).toBe(true);
    expect(medications.length).toBeGreaterThan(0);
    
    // Check if common medications are present
    const medNames = medications.map(m => m.name);
    expect(medNames).toContain("Simparic");
    expect(medNames).toContain("Bravecto");
  });
});

describe("Authentication", () => {
  it("returns user info for authenticated user", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const user = await caller.auth.me();
    
    expect(user).toBeDefined();
    expect(user?.email).toBe("admin@tucocare.com");
    expect(user?.role).toBe("admin");
  });

  it("returns null for unauthenticated user", async () => {
    const ctx: TrpcContext = {
      user: null,
      req: {
        protocol: "https",
        headers: {},
      } as TrpcContext["req"],
      res: {
        clearCookie: () => {},
      } as TrpcContext["res"],
    };
    
    const caller = appRouter.createCaller(ctx);
    const user = await caller.auth.me();
    
    expect(user).toBeNull();
  });
});
