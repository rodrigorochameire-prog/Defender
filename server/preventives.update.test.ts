import { describe, it, expect, beforeAll } from "vitest";
import { appRouter } from "./routers";
import * as db from "./db";
import type { TrpcContext } from "./_core/context";

function createAdminContext(): TrpcContext {
  return {
    user: {
      id: 1,
      openId: "test-admin",
      email: "admin@test.com",
      name: "Test Admin",
      loginMethod: "manus",
      role: "admin",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
}

describe("Preventives Update and Delete Procedures", () => {
  let caller: ReturnType<typeof appRouter.createCaller>;
  let testPetId: number;
  let testFleaTreatmentId: number;
  let testDewormingTreatmentId: number;

  beforeAll(async () => {
    // Create admin caller
    const ctx = createAdminContext();
    caller = appRouter.createCaller(ctx);

    // Create test pet
    testPetId = await db.createPet({
      name: "Test Pet for Preventives",
      species: "dog",
      breed: "Test Breed",
      birthDate: new Date("2020-01-01"),
      weight: 10,
      gender: "male",
      microchipNumber: null,
      isActive: true,
      createdById: 1,
    });

    // Add flea treatment
    const fleaResult = await db.createFleaTreatment({
      petId: testPetId,
      productName: "Test Flea Product",
      applicationDate: new Date(),
      nextDueDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days from now
      createdById: 1,
    });
    testFleaTreatmentId = Number(fleaResult.insertId);

    // Add deworming treatment
    const dewormingResult = await db.createDewormingTreatment({
      petId: testPetId,
      productName: "Test Deworming Product",
      applicationDate: new Date(),
      nextDueDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days from now
      createdById: 1,
    });
    testDewormingTreatmentId = Number(dewormingResult.insertId);
  });

  it("should update flea treatment successfully", async () => {
    const newNextDueDate = new Date(Date.now() + 120 * 24 * 60 * 60 * 1000); // 120 days from now
    const newNotes = "Updated flea treatment notes";

    const result = await caller.preventives.updateFlea({
      id: testFleaTreatmentId,
      applicationDate: new Date().toISOString(),
      nextDueDate: newNextDueDate.toISOString(),
      notes: newNotes,
    });

    expect(result).toEqual({ success: true });

    // Verify update
    const treatments = await db.getFleaTreatmentsByPetId(testPetId);
    const updated = treatments.find((t: any) => t.id === testFleaTreatmentId);
    expect(updated).toBeDefined();
    expect(updated?.notes).toBe(newNotes);
  });

  it("should update deworming treatment successfully", async () => {
    const newNextDueDate = new Date(Date.now() + 120 * 24 * 60 * 60 * 1000); // 120 days from now
    const newNotes = "Updated deworming treatment notes";

    const result = await caller.preventives.updateDeworming({
      id: testDewormingTreatmentId,
      applicationDate: new Date().toISOString(),
      nextDueDate: newNextDueDate.toISOString(),
      notes: newNotes,
    });

    expect(result).toEqual({ success: true });

    // Verify update
    const treatments = await db.getDewormingTreatmentsByPetId(testPetId);
    const updated = treatments.find((t: any) => t.id === testDewormingTreatmentId);
    expect(updated).toBeDefined();
    expect(updated?.notes).toBe(newNotes);
  });

  it("should delete flea treatment successfully", async () => {
    const result = await caller.preventives.deleteFlea({
      id: testFleaTreatmentId,
    });

    expect(result).toEqual({ success: true });

    // Verify deletion
    const treatments = await db.getFleaTreatmentsByPetId(testPetId);
    const deleted = treatments.find((t: any) => t.id === testFleaTreatmentId);
    expect(deleted).toBeUndefined();
  });

  it("should delete deworming treatment successfully", async () => {
    const result = await caller.preventives.deleteDeworming({
      id: testDewormingTreatmentId,
    });

    expect(result).toEqual({ success: true });

    // Verify deletion
    const treatments = await db.getDewormingTreatmentsByPetId(testPetId);
    const deleted = treatments.find((t: any) => t.id === testDewormingTreatmentId);
    expect(deleted).toBeUndefined();
  });

  it("should create and delete multiple flea treatments", async () => {
    // Create multiple treatments
    const result1 = await db.createFleaTreatment({
      petId: testPetId,
      productName: "Flea Product 1",
      applicationDate: new Date(),
      nextDueDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
      createdById: 1,
    });
    const treatment1 = Number(result1.insertId);

    const result2 = await db.createFleaTreatment({
      petId: testPetId,
      productName: "Flea Product 2",
      applicationDate: new Date(),
      nextDueDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
      createdById: 1,
    });
    const treatment2 = Number(result2.insertId);

    // Delete first treatment
    await caller.preventives.deleteFlea({ id: treatment1 });

    // Verify only second treatment remains
    const treatments = await db.getFleaTreatmentsByPetId(testPetId);
    expect(treatments.find((t: any) => t.id === treatment1)).toBeUndefined();
    expect(treatments.find((t: any) => t.id === treatment2)).toBeDefined();

    // Clean up
    await caller.preventives.deleteFlea({ id: treatment2 });
  });
});
