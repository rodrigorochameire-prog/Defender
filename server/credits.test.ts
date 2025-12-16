import { describe, it, expect, beforeAll } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createTestContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role: "admin",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: {} as any,
    res: {
      cookie: () => {},
      clearCookie: () => {},
    } as any,
  };
}

describe("Credit System", () => {
  let testPetId: number;
  const ctx = createTestContext();
  const caller = appRouter.createCaller(ctx);

  beforeAll(async () => {
    // Create a test pet
    const pet = await caller.pets.create({
      name: "Test Pet for Credits",
      breed: "Test Breed",
      birthDate: new Date("2020-01-01"),
      weight: 5,
    });
    testPetId = pet.id;
  });

  it("should get available credit packages", async () => {
    const packages = await caller.credits.getPackages();

    expect(packages).toBeDefined();
    expect(Array.isArray(packages)).toBe(true);
    expect(packages.length).toBeGreaterThan(0);

    // Check package structure
    const pkg = packages[0];
    expect(pkg).toHaveProperty("id");
    expect(pkg).toHaveProperty("name");
    expect(pkg).toHaveProperty("credits");
    expect(pkg).toHaveProperty("priceInCents");
    expect(pkg.isActive).toBe(true);
  });

  it("should purchase a credit package", async () => {
    const packages = await caller.credits.getPackages();
    const packageId = packages[0].id;

    const result = await caller.credits.purchasePackage({
      petId: testPetId,
      packageId,
    });

    expect(result).toBeDefined();
    expect(result.success).toBe(true);
    expect(result.credits).toBeGreaterThan(0);
    expect(result.creditId).toBeGreaterThan(0);
  });

  it("should get pet credit balance", async () => {
    const balance = await caller.credits.getBalance({ petId: testPetId });

    expect(balance).toBeDefined();
    expect(typeof balance).toBe("number");
    expect(balance).toBeGreaterThan(0);
  });

  it("should get credit purchase history", async () => {
    const history = await caller.credits.getHistory({ petId: testPetId });

    expect(history).toBeDefined();
    expect(Array.isArray(history)).toBe(true);
    expect(history.length).toBeGreaterThan(0);

    const purchase = history[0];
    expect(purchase).toHaveProperty("id");
    expect(purchase).toHaveProperty("packageDays");
    expect(purchase).toHaveProperty("packagePrice");
    expect(purchase).toHaveProperty("remainingDays");
  });

  it("should consume credit on check-in", async () => {
    const balanceBefore = await caller.credits.getBalance({ petId: testPetId });

    const result = await caller.checkin.checkIn({ petId: testPetId });

    expect(result).toBeDefined();
    expect(result.success).toBe(true);
    expect(result.remainingCredits).toBeDefined();
    expect(result.remainingCredits).toBe(balanceBefore - 1);
  });

  it("should get usage history", async () => {
    const usageHistory = await caller.credits.getUsageHistory({ petId: testPetId });

    expect(usageHistory).toBeDefined();
    expect(Array.isArray(usageHistory)).toBe(true);
    expect(usageHistory.length).toBeGreaterThan(0);

    const usage = usageHistory[0];
    expect(usage).toHaveProperty("id");
    expect(usage).toHaveProperty("petId");
    expect(usage).toHaveProperty("usageDate");
    expect(usage).toHaveProperty("checkInTime");
  });

  it("should block check-in when no credits available", async () => {
    // Create a pet without credits
    const pet = await caller.pets.create({
      name: "Pet Without Credits",
      breed: "Test Breed",
      birthDate: new Date("2021-01-01"),
      weight: 3,
    });

    // Try to check in without credits
    await expect(
      caller.checkin.checkIn({ petId: pet.id })
    ).rejects.toThrow(/créditos suficientes/i);
  });

  it("should add credits via admin package", async () => {
    const pet = await caller.pets.create({
      name: "Pet for Admin Package",
      breed: "Test Breed",
      birthDate: new Date("2021-01-01"),
      weight: 4,
    });

    const result = await caller.credits.addPackage({
      petId: pet.id,
      packageDays: 10,
      packagePrice: 80000, // R$ 800.00
    });

    expect(result).toBeDefined();
    expect(result.id).toBeGreaterThan(0);

    const balance = await caller.credits.getBalance({ petId: pet.id });
    expect(balance).toBe(10);
  });

  it("should get credit stats", async () => {
    const stats = await caller.credits.getStats();

    expect(stats).toBeDefined();
    expect(stats).toHaveProperty("monthlyRevenue");
    expect(stats).toHaveProperty("petsWithCredits");
    expect(stats).toHaveProperty("totalActiveCredits");
    expect(typeof stats.monthlyRevenue).toBe("number");
    expect(typeof stats.petsWithCredits).toBe("number");
    expect(typeof stats.totalActiveCredits).toBe("number");
  });

  it("should handle multiple credit packages for same pet", async () => {
    const packages = await caller.credits.getPackages();
    const pkg1 = packages[0];
    const pkg2 = packages[1] || pkg1;

    const pet = await caller.pets.create({
      name: "Pet Multiple Packages",
      breed: "Test Breed",
      birthDate: new Date("2021-01-01"),
      weight: 6,
    });

    // Purchase first package
    await caller.credits.purchasePackage({
      petId: pet.id,
      packageId: pkg1.id,
    });

    // Purchase second package
    await caller.credits.purchasePackage({
      petId: pet.id,
      packageId: pkg2.id,
    });

    const balance = await caller.credits.getBalance({ petId: pet.id });
    expect(balance).toBe(pkg1.credits + pkg2.credits);

    const history = await caller.credits.getHistory({ petId: pet.id });
    expect(history.length).toBe(2);
  });

  it("should consume credits in FIFO order", async () => {
    const pet = await caller.pets.create({
      name: "Pet FIFO Test",
      breed: "Test Breed",
      birthDate: new Date("2021-01-01"),
      weight: 7,
    });

    // Add 2 credits
    await caller.credits.addPackage({
      petId: pet.id,
      packageDays: 2,
      packagePrice: 16000,
    });

    // Check in (consume 1)
    await caller.checkin.checkIn({ petId: pet.id });
    
    // Check out
    await caller.checkin.checkOut({ petId: pet.id });

    const balance = await caller.credits.getBalance({ petId: pet.id });
    expect(balance).toBe(1);

    // Check in again (consume last one)
    await caller.checkin.checkIn({ petId: pet.id });
    
    const finalBalance = await caller.credits.getBalance({ petId: pet.id });
    expect(finalBalance).toBe(0);
  });
});
