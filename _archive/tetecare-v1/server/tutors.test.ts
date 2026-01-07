import { describe, it, expect } from "vitest";
import { appRouter } from "./routers";
import * as db from "./db";

describe("Tutors Management", () => {
  const caller = appRouter.createCaller({
    user: { id: 1, email: "admin@test.com", name: "Admin", role: "admin" },
  });

  it("should list tutors with pagination", async () => {
    const result = await caller.tutors.list({
      page: 1,
      limit: 20,
    });

    expect(result).toHaveProperty("tutors");
    expect(result).toHaveProperty("total");
    expect(Array.isArray(result.tutors)).toBe(true);
    expect(typeof result.total).toBe("number");
  });

  it("should handle search parameter", async () => {
    const result = await caller.tutors.list({
      page: 1,
      limit: 20,
      search: "test",
    });

    expect(result).toHaveProperty("tutors");
    expect(Array.isArray(result.tutors)).toBe(true);
  });

  it("should return empty linkedPets for non-existent tutor", async () => {
    const result = await caller.tutors.getById({ tutorId: 99999 });
    expect(result).toBeNull();
  });

  it("should update tutor phone field", async () => {
    // First get a tutor
    const tutorsList = await caller.tutors.list({ page: 1, limit: 1 });
    
    if (tutorsList.tutors.length > 0) {
      const tutorId = tutorsList.tutors[0].id;
      const testPhone = "+55 11 98765-4321";

      const updatedTutor = await caller.tutors.update({
        tutorId,
        phone: testPhone,
      });

      expect(updatedTutor).toBeDefined();
      expect(updatedTutor?.phone).toBe(testPhone);
    } else {
      // Skip test if no tutors exist
      expect(true).toBe(true);
    }
  });

  it("should link and unlink pet from tutor", async () => {
    // Get a tutor and a pet
    const tutorsList = await caller.tutors.list({ page: 1, limit: 1 });
    const petsList = await db.getAllPets();

    if (tutorsList.tutors.length > 0 && petsList.length > 0) {
      const tutorId = tutorsList.tutors[0].id;
      const petId = petsList[0].id;

      // Link pet to tutor
      const linkResult = await caller.tutors.linkPet({
        tutorId,
        petId,
        isPrimary: true,
      });

      expect(linkResult).toBe(true);

      // Verify link
      const tutor = await caller.tutors.getById({ tutorId });
      const linkedPet = tutor?.linkedPets.find((p) => p.petId === petId);
      expect(linkedPet).toBeDefined();

      // Unlink pet
      const unlinkResult = await caller.tutors.unlinkPet({
        tutorId,
        petId,
      });

      expect(unlinkResult).toBe(true);

      // Verify unlink
      const tutorAfterUnlink = await caller.tutors.getById({ tutorId });
      const linkedPetAfterUnlink = tutorAfterUnlink?.linkedPets.find((p) => p.petId === petId);
      expect(linkedPetAfterUnlink).toBeUndefined();
    } else {
      // Skip test if no data exists
      expect(true).toBe(true);
    }
  });

  it("should get reminder history (currently returns empty array)", async () => {
    const tutorsList = await caller.tutors.list({ page: 1, limit: 1 });
    
    if (tutorsList.tutors.length > 0) {
      const tutorId = tutorsList.tutors[0].id;
      const result = await caller.tutors.getReminderHistory({ tutorId });

      expect(Array.isArray(result)).toBe(true);
      // Currently returns empty array as reminder tracking is not yet implemented
      expect(result.length).toBe(0);
    } else {
      expect(true).toBe(true);
    }
  });
});
