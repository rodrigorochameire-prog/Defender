import { describe, it, expect, beforeAll } from "vitest";
import { appRouter } from "./routers";
import * as db from "./db";

describe("Health Statistics System", () => {
  let caller: ReturnType<typeof appRouter.createCaller>;

  beforeAll(() => {
    caller = appRouter.createCaller({
      user: { id: 1, email: "admin@test.com", name: "Admin", role: "admin" },
    });
  });

  it("should get vaccination statistics", async () => {
    const stats = await db.getVaccinationStatistics();
    
    expect(stats).toHaveProperty("total");
    expect(stats).toHaveProperty("upToDate");
    expect(stats).toHaveProperty("overdue");
    expect(stats).toHaveProperty("upcoming");
    expect(stats).toHaveProperty("rate");
    
    expect(typeof stats.total).toBe("number");
    expect(typeof stats.upToDate).toBe("number");
    expect(typeof stats.overdue).toBe("number");
    expect(typeof stats.upcoming).toBe("number");
    expect(typeof stats.rate).toBe("number");
    
    // Rate should be between 0 and 100
    expect(stats.rate).toBeGreaterThanOrEqual(0);
    expect(stats.rate).toBeLessThanOrEqual(100);
    
    // Sum should equal total
    expect(stats.upToDate + stats.overdue + stats.upcoming).toBe(stats.total);
  });

  it("should get active medications count", async () => {
    const stats = await db.getActiveMedicationsCount();
    
    expect(stats).toHaveProperty("total");
    expect(stats).toHaveProperty("byPet");
    
    expect(typeof stats.total).toBe("number");
    expect(Array.isArray(stats.byPet)).toBe(true);
    
    // If there are medications, validate structure
    if (stats.byPet.length > 0) {
      const pet = stats.byPet[0];
      expect(pet).toHaveProperty("petId");
      expect(pet).toHaveProperty("petName");
      expect(pet).toHaveProperty("count");
      expect(pet).toHaveProperty("medications");
      expect(Array.isArray(pet.medications)).toBe(true);
    }
  });

  it("should get preventives applied this month", async () => {
    const stats = await db.getPreventivesThisMonth();
    
    expect(stats).toHaveProperty("flea");
    expect(stats).toHaveProperty("deworming");
    expect(stats).toHaveProperty("total");
    
    expect(typeof stats.flea).toBe("number");
    expect(typeof stats.deworming).toBe("number");
    expect(typeof stats.total).toBe("number");
    
    // Total should equal sum
    expect(stats.total).toBe(stats.flea + stats.deworming);
  });

  it("should get overdue treatments", async () => {
    const overdue = await db.getOverdueTreatments();
    
    expect(Array.isArray(overdue)).toBe(true);
    
    // If there are overdue treatments, validate structure
    if (overdue.length > 0) {
      const treatment = overdue[0];
      expect(treatment).toHaveProperty("type");
      expect(treatment).toHaveProperty("petId");
      expect(treatment).toHaveProperty("petName");
      expect(treatment).toHaveProperty("itemName");
      expect(treatment).toHaveProperty("dueDate");
      
      // Type should be one of the expected values
      expect(["vaccination", "flea", "deworming"]).toContain(treatment.type);
      
      // Due date should be in the past
      const dueDate = new Date(treatment.dueDate);
      const now = new Date();
      expect(dueDate.getTime()).toBeLessThan(now.getTime());
    }
  });

  it("should get all health dashboard stats", async () => {
    const stats = await db.getHealthDashboardStats();
    
    expect(stats).toHaveProperty("vaccination");
    expect(stats).toHaveProperty("medications");
    expect(stats).toHaveProperty("preventives");
    expect(stats).toHaveProperty("overdue");
    
    // Validate vaccination stats
    expect(stats.vaccination).toHaveProperty("total");
    expect(stats.vaccination).toHaveProperty("rate");
    
    // Validate medications stats
    expect(stats.medications).toHaveProperty("total");
    expect(stats.medications).toHaveProperty("byPet");
    
    // Validate preventives stats
    expect(stats.preventives).toHaveProperty("total");
    expect(stats.preventives).toHaveProperty("flea");
    expect(stats.preventives).toHaveProperty("deworming");
    
    // Validate overdue
    expect(Array.isArray(stats.overdue)).toBe(true);
  });

  it("should get dashboard stats via tRPC procedure", async () => {
    const result = await caller.healthStats.getDashboardStats();
    
    expect(result).toHaveProperty("vaccination");
    expect(result).toHaveProperty("medications");
    expect(result).toHaveProperty("preventives");
    expect(result).toHaveProperty("overdue");
  });

  it("should get vaccination stats via tRPC procedure", async () => {
    const result = await caller.healthStats.getVaccinationStats();
    
    expect(result).toHaveProperty("total");
    expect(result).toHaveProperty("rate");
  });

  it("should get active medications via tRPC procedure", async () => {
    const result = await caller.healthStats.getActiveMedications();
    
    expect(result).toHaveProperty("total");
    expect(result).toHaveProperty("byPet");
  });

  it("should get preventives this month via tRPC procedure", async () => {
    const result = await caller.healthStats.getPreventivesThisMonth();
    
    expect(result).toHaveProperty("flea");
    expect(result).toHaveProperty("deworming");
    expect(result).toHaveProperty("total");
  });

  it("should get overdue treatments via tRPC procedure", async () => {
    const result = await caller.healthStats.getOverdueTreatments();
    
    expect(Array.isArray(result)).toBe(true);
  });
});
