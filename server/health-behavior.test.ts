import { describe, it, expect, beforeAll } from "vitest";
import * as db from "./db";

describe("Health Behavior Logs", () => {
  let testPetId: number;
  let testLogId: number;

  beforeAll(async () => {
    // Get a test pet
    const pets = await db.getAllPets();
    if (pets.length > 0) {
      testPetId = pets[0].id;
    }
  });

  it("should create a health behavior log", async () => {
    if (!testPetId) {
      console.log("No pets available for testing");
      return;
    }

    const result = await db.createHealthBehaviorLog({
      petId: testPetId,
      mood: "feliz",
      stool: "normal",
      behavior: "ativo",
      appetite: "normal",
      waterIntake: "normal",
      notes: "Pet está muito bem hoje!",
      recordedBy: 1,
      recordedAt: new Date(),
    });

    expect(result).toBeDefined();
    
    // Get the created log to verify
    const logs = await db.getHealthBehaviorLogsByPet(testPetId, 1);
    expect(logs.length).toBeGreaterThan(0);
    
    if (logs.length > 0) {
      testLogId = logs[0].id;
    }
  });

  it("should get logs by pet", async () => {
    if (!testPetId) {
      console.log("No pets available for testing");
      return;
    }

    const logs = await db.getHealthBehaviorLogsByPet(testPetId, 10);
    
    expect(Array.isArray(logs)).toBe(true);
    if (logs.length > 0) {
      expect(logs[0]).toHaveProperty("petId");
      expect(logs[0]).toHaveProperty("mood");
      expect(logs[0]).toHaveProperty("recordedAt");
    }
  });

  it("should get recent logs", async () => {
    const logs = await db.getRecentHealthBehaviorLogs(10);
    
    expect(Array.isArray(logs)).toBe(true);
    // Logs should be ordered by date desc
    if (logs.length > 1) {
      const first = new Date(logs[0].recordedAt);
      const second = new Date(logs[1].recordedAt);
      expect(first.getTime()).toBeGreaterThanOrEqual(second.getTime());
    }
  });

  it("should get statistics for a pet", async () => {
    if (!testPetId) {
      console.log("No pets available for testing");
      return;
    }

    const stats = await db.getHealthBehaviorStats(testPetId, 7);
    
    expect(stats).toBeDefined();
    expect(stats).toHaveProperty("totalLogs");
    expect(stats).toHaveProperty("moodDistribution");
    expect(stats).toHaveProperty("stoolDistribution");
    expect(stats).toHaveProperty("behaviorDistribution");
  });

  it("should get log by id", async () => {
    if (!testLogId) {
      console.log("No log created for testing");
      return;
    }

    const log = await db.getHealthBehaviorLogById(testLogId);
    
    expect(log).toBeDefined();
    expect(log?.id).toBe(testLogId);
    expect(log?.petId).toBe(testPetId);
  });

  it("should delete a log", async () => {
    if (!testLogId) {
      console.log("No log created for testing");
      return;
    }

    await db.deleteHealthBehaviorLog(testLogId);
    
    const deletedLog = await db.getHealthBehaviorLogById(testLogId);
    expect(deletedLog).toBeNull();
  });
});
