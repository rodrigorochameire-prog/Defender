import { describe, it, expect, beforeEach } from "vitest";
import { appRouter } from "./routers";
import * as db from "./db";

describe("Security Tests - Data Isolation", () => {
  let tutorContext: any;
  let otherTutorContext: any;
  let adminContext: any;
  let tutorPetId: number;
  let otherTutorPetId: number;

  beforeEach(async () => {
    // Create test contexts
    tutorContext = {
      user: {
        id: 1,
        name: "Tutor Test",
        email: "tutor@test.com",
        role: "user" as const,
      },
    };

    otherTutorContext = {
      user: {
        id: 2,
        name: "Other Tutor",
        email: "other@test.com",
        role: "user" as const,
      },
    };

    adminContext = {
      user: {
        id: 999,
        name: "Admin Test",
        email: "admin@test.com",
        role: "admin" as const,
      },
    };

    // Create test pets
    tutorPetId = await db.createPet({
      name: "Tutor's Pet",
      species: "dog",
      breed: "Test Breed",
      birthDate: new Date("2020-01-01"),
      gender: "male",
      weight: 10,
      approvalStatus: "approved",
    });

    otherTutorPetId = await db.createPet({
      name: "Other Tutor's Pet",
      species: "dog",
      breed: "Test Breed",
      birthDate: new Date("2020-01-01"),
      gender: "female",
      weight: 12,
      approvalStatus: "approved",
    });

    // Link pets to tutors
    await db.linkPetToTutor(tutorPetId, tutorContext.user.id);
    await db.linkPetToTutor(otherTutorPetId, otherTutorContext.user.id);
  });

  describe("pets.listMine", () => {
    it("should only return pets owned by the current tutor", async () => {
      const caller = appRouter.createCaller(tutorContext);
      const pets = await caller.pets.listMine();

      expect(pets).toHaveLength(1);
      expect(pets[0].id).toBe(tutorPetId);
      expect(pets[0].name).toBe("Tutor's Pet");
    });

    it("should not return pets owned by other tutors", async () => {
      const caller = appRouter.createCaller(tutorContext);
      const pets = await caller.pets.listMine();

      const otherPet = pets.find((p) => p.id === otherTutorPetId);
      expect(otherPet).toBeUndefined();
    });
  });

  describe("logs.listMine", () => {
    it("should only return logs for pets owned by the current tutor", async () => {
      // Add log for tutor's pet
      await db.addDailyLog({
        petId: tutorPetId,
        logDate: new Date(),
        source: "daycare",
        mood: "feliz",
        createdById: adminContext.user.id,
      });

      // Add log for other tutor's pet
      await db.addDailyLog({
        petId: otherTutorPetId,
        logDate: new Date(),
        source: "daycare",
        mood: "calmo",
        createdById: adminContext.user.id,
      });

      const caller = appRouter.createCaller(tutorContext);
      const logs = await caller.logs.listMine();

      expect(logs.every((log) => log.petId === tutorPetId)).toBe(true);
      expect(logs.some((log) => log.petId === otherTutorPetId)).toBe(false);
    });
  });

  describe("pets.approve (admin-only)", () => {
    it("should reject when called by non-admin tutor", async () => {
      const caller = appRouter.createCaller(tutorContext);

      await expect(
        caller.pets.approve({ petId: tutorPetId })
      ).rejects.toThrow("Admin access required");
    });

    it("should succeed when called by admin", async () => {
      // Create pending pet
      const pendingPetId = await db.createPet({
        name: "Pending Pet",
        species: "dog",
        breed: "Test",
        birthDate: new Date("2020-01-01"),
        gender: "male",
        weight: 10,
        approvalStatus: "pending",
      });

      const caller = appRouter.createCaller(adminContext);
      await expect(
        caller.pets.approve({ petId: pendingPetId })
      ).resolves.not.toThrow();
    });
  });

  describe("pets.updateMine", () => {
    it("should allow tutor to update their own pet", async () => {
      const caller = appRouter.createCaller(tutorContext);

      await expect(
        caller.pets.updateMine({
          id: tutorPetId,
          name: "Updated Name",
          species: "dog",
          breed: "Updated Breed",
          birthDate: "2020-01-01",
          gender: "male",
          weight: 11,
        })
      ).resolves.not.toThrow();
    });

    it("should reject when tutor tries to update another tutor's pet", async () => {
      const caller = appRouter.createCaller(tutorContext);

      await expect(
        caller.pets.updateMine({
          id: otherTutorPetId,
          name: "Hacked Name",
          species: "dog",
          breed: "Hacked",
          birthDate: "2020-01-01",
          gender: "female",
          weight: 12,
        })
      ).rejects.toMatchObject({ code: "FORBIDDEN" });
    });
  });

  describe("behavior.create", () => {
    it("should allow tutor to create behavior record for their own pet", async () => {
      const caller = appRouter.createCaller(tutorContext);

      await expect(
        caller.behavior.create({
          petId: tutorPetId,
          date: new Date(),
          location: "home",
          behaviorType: "positive",
          description: "Good behavior",
        })
      ).resolves.not.toThrow();
    });

    it("should reject when tutor tries to create behavior record for another tutor's pet", async () => {
      const caller = appRouter.createCaller(tutorContext);

      await expect(
        caller.behavior.create({
          petId: otherTutorPetId,
          date: new Date(),
          location: "home",
          behaviorType: "negative",
          description: "Bad behavior",
        })
      ).rejects.toMatchObject({ code: "FORBIDDEN" });
    });
  });
});
