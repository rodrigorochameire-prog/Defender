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

describe("Daily Logs", () => {
  let testPetId: number;
  let testLogId: number;
  const ctx = createTestContext();
  const caller = appRouter.createCaller(ctx);

  beforeAll(async () => {

    // Create a test pet for logs
    const pet = await caller.pets.create({
      name: "Test Pet for Logs",
      breed: "Test Breed",
      birthDate: new Date("2020-01-01"),
      weight: 5,
      foodBrand: "Test Food",
      foodAmount: 200,
    });
    testPetId = pet.id;
  });

  it("should create a daily log with all fields", async () => {
    const result = await caller.logs.add({
      petId: testPetId,
      logDate: new Date(),
      source: "daycare",
      mood: "feliz",
      stool: "normal",
      appetite: "normal",
      behavior: "Brincalhão",
      behaviorNotes: "Muito ativo durante a tarde",
      activities: JSON.stringify(["passeio", "brincadeira", "descanso"]),
      foodConsumed: "all",
      feedingTime: "12:00",
      feedingAmount: "200g",
      feedingAcceptance: "excelente",
      weight: 5200,
      notes: "Dia excelente, pet muito feliz",
    });

    expect(result).toBeDefined();
    expect(result.id).toBeGreaterThan(0);
    testLogId = result.id;
  });

  it("should create a minimal daily log", async () => {
    const result = await caller.logs.add({
      petId: testPetId,
      logDate: new Date(),
      source: "home",
    });

    expect(result).toBeDefined();
    expect(result.id).toBeGreaterThan(0);
  });

  it("should get pet logs", async () => {
    const logs = await caller.logs.getPetLogs({
      petId: testPetId,
    });

    expect(logs).toBeDefined();
    expect(Array.isArray(logs)).toBe(true);
    expect(logs.length).toBeGreaterThanOrEqual(2);
  });

  it("should get pet logs with date range", async () => {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7);

    const logs = await caller.logs.getPetLogs({
      petId: testPetId,
      startDate,
      endDate,
    });

    expect(logs).toBeDefined();
    expect(Array.isArray(logs)).toBe(true);
  });

  it("should update a daily log", async () => {
    const result = await caller.logs.update({
      id: testLogId,
      petId: testPetId,
      logDate: new Date(),
      source: "daycare",
      mood: "calmo",
      notes: "Log atualizado",
    });

    expect(result).toBeDefined();
    expect(result.success).toBe(true);
  });

  it("should list all logs for admin", async () => {
    const logs = await caller.logs.list();

    expect(logs).toBeDefined();
    expect(Array.isArray(logs)).toBe(true);
  });

  it("should list logs for specific pet", async () => {
    const logs = await caller.logs.list({ petId: testPetId });

    expect(logs).toBeDefined();
    expect(Array.isArray(logs)).toBe(true);
    expect(logs.length).toBeGreaterThanOrEqual(2);
  });

  it("should get logs by date", async () => {
    const logs = await caller.logs.getByDate({ date: new Date() });

    expect(logs).toBeDefined();
    expect(Array.isArray(logs)).toBe(true);
  });

  it("should delete a daily log", async () => {
    const result = await caller.logs.delete({ id: testLogId });

    expect(result).toBeDefined();
    expect(result.success).toBe(true);

    // Verify deletion
    const logs = await caller.logs.getPetLogs({ petId: testPetId });
    const deletedLog = logs.find((l: any) => l.id === testLogId);
    expect(deletedLog).toBeUndefined();
  });

  it("should handle different mood values", async () => {
    const moods = ["feliz", "calmo", "ansioso", "triste", "agitado"] as const;
    
    for (const mood of moods) {
      const result = await caller.logs.add({
        petId: testPetId,
        logDate: new Date(),
        source: "daycare",
        mood,
      });
      expect(result.id).toBeGreaterThan(0);
    }
  });

  it("should handle different stool values", async () => {
    const stools = ["normal", "diarreia", "constipado", "nao_fez"] as const;
    
    for (const stool of stools) {
      const result = await caller.logs.add({
        petId: testPetId,
        logDate: new Date(),
        source: "home",
        stool,
      });
      expect(result.id).toBeGreaterThan(0);
    }
  });

  it("should handle different appetite values", async () => {
    const appetites = ["normal", "aumentado", "diminuido", "nao_comeu"] as const;
    
    for (const appetite of appetites) {
      const result = await caller.logs.add({
        petId: testPetId,
        logDate: new Date(),
        source: "daycare",
        appetite,
      });
      expect(result.id).toBeGreaterThan(0);
    }
  });

  it("should handle different feeding acceptance values", async () => {
    const acceptances = ["excelente", "boa", "regular", "ruim", "recusou"] as const;
    
    for (const acceptance of acceptances) {
      const result = await caller.logs.add({
        petId: testPetId,
        logDate: new Date(),
        source: "daycare",
        feedingAcceptance: acceptance,
      });
      expect(result.id).toBeGreaterThan(0);
    }
  });
});
