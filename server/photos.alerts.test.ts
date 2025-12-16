import { describe, it, expect, beforeAll } from "vitest";
import { appRouter } from "./routers";
import type { Context } from "./_core/context";
import * as db from "./db";

// Mock context for admin user
const mockAdminContext: Context = {
  user: {
    id: 1,
    openId: "admin-test",
    name: "Admin Test",
    email: "admin@test.com",
    role: "admin",
    loginMethod: "test",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  },
  req: {} as any,
  res: {} as any,
};

// Mock context for regular user
const mockUserContext: Context = {
  user: {
    id: 2,
    openId: "user-test",
    name: "User Test",
    email: "user@test.com",
    role: "user",
    loginMethod: "test",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  },
  req: {} as any,
  res: {} as any,
};

describe("Photos Router", () => {
  let testPetId: number;

  beforeAll(async () => {
    // Create a test pet
    testPetId = await db.createPet({
      name: "Test Photo Pet",
      breed: "Test Breed",
      status: "checked-out",
      credits: 10,
    });
  });

  it("should list photos for a pet", async () => {
    const caller = appRouter.createCaller(mockAdminContext);
    const photos = await caller.photos.list({ petId: testPetId });
    expect(Array.isArray(photos)).toBe(true);
  });

  it("should verify photos router is accessible", async () => {
    const caller = appRouter.createCaller(mockAdminContext);
    
    // Just verify the router exists and can be called
    const photos = await caller.photos.list({ petId: testPetId });
    expect(Array.isArray(photos)).toBe(true);
  });
});

describe("Alerts Router", () => {
  it("should check for low credits", async () => {
    const caller = appRouter.createCaller(mockAdminContext);
    
    const result = await caller.alerts.checkLowCredits({ threshold: 5 });
    
    expect(result).toHaveProperty("count");
    expect(result).toHaveProperty("pets");
    expect(typeof result.count).toBe("number");
    expect(Array.isArray(result.pets)).toBe(true);
  });

  it("should check for upcoming vaccines", async () => {
    const caller = appRouter.createCaller(mockAdminContext);
    
    const result = await caller.alerts.checkUpcomingVaccines({ daysAhead: 30 });
    
    expect(result).toHaveProperty("count");
    expect(result).toHaveProperty("vaccines");
    expect(typeof result.count).toBe("number");
    expect(Array.isArray(result.vaccines)).toBe(true);
  });

  it("should run all checks", async () => {
    const caller = appRouter.createCaller(mockAdminContext);
    
    const result = await caller.alerts.runAllChecks();
    
    expect(result).toHaveProperty("alerts");
    expect(result).toHaveProperty("totalAlerts");
    expect(Array.isArray(result.alerts)).toBe(true);
    expect(typeof result.totalAlerts).toBe("number");
  });

  it("should not allow non-admin to run checks", async () => {
    const caller = appRouter.createCaller(mockUserContext);
    
    await expect(
      caller.alerts.checkLowCredits({ threshold: 5 })
    ).rejects.toThrow("Admin access required");
  });
});
