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

describe("Vaccines Delete Procedure", () => {
  let caller: ReturnType<typeof appRouter.createCaller>;
  let testPetId: number;
  let testVaccineId: number;
  let testVaccinationId: number;

  beforeAll(async () => {
    // Create admin caller
    const ctx = createAdminContext();
    caller = appRouter.createCaller(ctx);

    // Create test pet
    testPetId = await db.createPet({
      name: "Test Pet for Vaccine Delete",
      species: "dog",
      breed: "Test Breed",
      birthDate: new Date("2020-01-01"),
      weight: 10,
      gender: "male",
      microchipNumber: null,
      isActive: true,
      createdById: 1,
    });

    // Create test vaccine in library
    testVaccineId = await db.addVaccineToLibrary({
      name: "Test Vaccine to Delete",
      description: "Test vaccine for deletion",
      intervalDays: 365,
      dosesRequired: 1,
    });

    // Add vaccination to pet
    testVaccinationId = await db.addPetVaccination({
      petId: testPetId,
      vaccineId: testVaccineId,
      applicationDate: new Date(),
      nextDueDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      doseNumber: 1,
      veterinarian: "Test Vet",
    });
  });

  it("should delete pet vaccination successfully", async () => {
    const result = await caller.vaccines.delete({
      id: testVaccinationId,
      petId: testPetId,
    });

    expect(result).toEqual({ success: true });

    // Verify vaccination was deleted
    const vaccinations = await db.getPetVaccinations(testPetId);
    const deletedVacc = vaccinations.find((v: any) => v.vaccination.id === testVaccinationId);
    expect(deletedVacc).toBeUndefined();
  });

  it("should delete multiple vaccinations successfully", async () => {
    // Add two vaccinations to delete
    const vacc1Id = await db.addPetVaccination({
      petId: testPetId,
      vaccineId: testVaccineId,
      applicationDate: new Date(),
      nextDueDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      doseNumber: 2,
      veterinarian: "Test Vet",
    });

    const vacc2Id = await db.addPetVaccination({
      petId: testPetId,
      vaccineId: testVaccineId,
      applicationDate: new Date(),
      nextDueDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      doseNumber: 3,
      veterinarian: "Test Vet",
    });

    // Delete first vaccination
    await caller.vaccines.delete({
      id: vacc1Id,
      petId: testPetId,
    });

    // Verify first was deleted but second remains
    const vaccinations = await db.getPetVaccinations(testPetId);
    expect(vaccinations.find((v: any) => v.vaccination.id === vacc1Id)).toBeUndefined();
    expect(vaccinations.find((v: any) => v.vaccination.id === vacc2Id)).toBeDefined();

    // Clean up
    await caller.vaccines.delete({
      id: vacc2Id,
      petId: testPetId,
    });
  });
});
