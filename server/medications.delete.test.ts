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

describe("Medications Delete Procedure", () => {
  let caller: ReturnType<typeof appRouter.createCaller>;
  let testPetId: number;
  let testMedicationId: number;
  let testPetMedicationId: number;

  beforeAll(async () => {
    // Create admin caller
    const ctx = createAdminContext();
    caller = appRouter.createCaller(ctx);

    // Create test pet
    testPetId = await db.createPet({
      name: "Test Pet for Medication Delete",
      species: "dog",
      breed: "Test Breed",
      birthDate: new Date("2020-01-01"),
      weight: 10,
      gender: "male",
      microchipNumber: null,
      isActive: true,
      createdById: 1,
    });

    // Create test medication in library
    testMedicationId = await db.addMedicationToLibrary({
      name: "Test Medication to Delete",
      type: "treatment",
      description: "Test medication for deletion",
    });

    // Add medication to pet
    testPetMedicationId = await db.addPetMedication({
      petId: testPetId,
      medicationId: testMedicationId,
      startDate: new Date(),
      dosage: "1 pill",
      frequency: "daily",
      isActive: true,
    });
  });

  it("should delete pet medication successfully", async () => {
    const result = await caller.medications.delete({
      id: testPetMedicationId,
      petId: testPetId,
    });

    expect(result).toEqual({ success: true });

    // Verify medication was deleted
    const medications = await db.getPetMedications(testPetId);
    const deletedMed = medications.find((m: any) => m.medication.id === testPetMedicationId);
    expect(deletedMed).toBeUndefined();
  });

  it("should delete multiple medications successfully", async () => {
    // Add two medications to delete
    const med1Id = await db.addPetMedication({
      petId: testPetId,
      medicationId: testMedicationId,
      startDate: new Date(),
      dosage: "2 pills",
      frequency: "twice daily",
      isActive: true,
    });

    const med2Id = await db.addPetMedication({
      petId: testPetId,
      medicationId: testMedicationId,
      startDate: new Date(),
      dosage: "3 pills",
      frequency: "three times daily",
      isActive: true,
    });

    // Delete first medication
    await caller.medications.delete({
      id: med1Id,
      petId: testPetId,
    });

    // Verify first was deleted but second remains
    const medications = await db.getPetMedications(testPetId);
    expect(medications.find((m: any) => m.medication.id === med1Id)).toBeUndefined();
    expect(medications.find((m: any) => m.medication.id === med2Id)).toBeDefined();

    // Clean up
    await caller.medications.delete({
      id: med2Id,
      petId: testPetId,
    });
  });
});
