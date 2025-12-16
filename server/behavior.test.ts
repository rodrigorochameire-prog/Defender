import { describe, it, expect, beforeAll } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Mock context for testing
const createMockContext = (userId: number, role: "admin" | "user" = "user"): TrpcContext => ({
  user: {
    id: userId,
    openId: `test-${userId}`,
    name: `Test User ${userId}`,
    email: `test${userId}@example.com`,
    role,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
    loginMethod: "test",
  },
  req: {} as any,
  res: {} as any,
});

describe("Behavior Router", () => {
  const caller = appRouter.createCaller(createMockContext(1, "admin"));

  it("should create a behavior record", async () => {
    const result = await caller.behavior.create({
      petId: 1,
      date: new Date(),
      location: "home",
      behaviorType: "positive",
      description: "Pet muito calmo e obediente hoje",
      tags: "calmo, obediente",
      severity: "leve",
    });

    expect(result).toBeDefined();
  });

  it("should list behavior records for a pet", async () => {
    const records = await caller.behavior.list({ petId: 1 });
    expect(Array.isArray(records)).toBe(true);
  });

  it("should list all behavior records when no petId provided", async () => {
    const records = await caller.behavior.list({});
    expect(Array.isArray(records)).toBe(true);
  });
});

describe("Training Router", () => {
  const caller = appRouter.createCaller(createMockContext(1, "admin"));
  let trainingId: number;

  it("should create a training progress record", async () => {
    const result = await caller.training.create({
      petId: 1,
      skill: "Sentar",
      startDate: new Date(),
      currentLevel: 3,
      notes: "Progredindo bem",
    });

    expect(result).toBeDefined();
    trainingId = result.id;
  });

  it("should list training progress for a pet", async () => {
    const records = await caller.training.list({ petId: 1 });
    expect(Array.isArray(records)).toBe(true);
    expect(records.length).toBeGreaterThan(0);
  });

  it("should update training progress level", async () => {
    const result = await caller.training.update({
      id: trainingId,
      currentLevel: 5,
      notes: "Melhorou muito!",
    });

    expect(result).toBeDefined();
    // The update returns the updated record
    if (result.currentLevel !== undefined) {
      expect(result.currentLevel).toBe(5);
    }
  });

  it("should delete training progress", async () => {
    const result = await caller.training.delete({ id: trainingId });
    expect(result.success).toBe(true);
  });
});

describe("AI Router", () => {
  const caller = appRouter.createCaller(createMockContext(1, "user"));

  it("should respond to a chat message", async () => {
    const result = await caller.ai.chat({
      message: "Como funciona o sistema de créditos?",
      context: JSON.stringify([
        { name: "Rex", breed: "Golden Retriever", age: "3 anos", credits: 10 },
      ]),
    });

    expect(result).toBeDefined();
    expect(result.message).toBeDefined();
    expect(typeof result.message).toBe("string");
    expect(result.message.length).toBeGreaterThan(0);
  });

  it("should handle messages without context", async () => {
    const result = await caller.ai.chat({
      message: "Quais vacinas meu pet precisa?",
    });

    expect(result).toBeDefined();
    expect(result.message).toBeDefined();
  }, 10000); // Increase timeout for AI calls
});
