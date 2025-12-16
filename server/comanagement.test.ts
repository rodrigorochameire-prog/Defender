/**
 * Co-Management System Tests
 * 
 * Tests for change tracking and collaboration between admins and tutors
 */

import { describe, it, expect, beforeAll } from "vitest";
import { logChange, logMultipleChanges, getRecentChanges, getPetHistory, getCollaborationStats } from "./changeTracker";

describe("Co-Management System", () => {
  describe("Change Tracking", () => {
    it("should log a single change successfully", async () => {
      const result = await logChange({
        resourceType: "medication",
        resourceId: 1,
        petId: 1,
        fieldName: "dosage",
        oldValue: "1 comprimido",
        newValue: "1.5 comprimidos",
        changedBy: 1,
        changedByRole: "admin",
        changeType: "update",
      });

      // logChange returns void, so we just check it doesn't throw
      expect(result).toBeUndefined();
    });

    it("should log multiple changes at once", async () => {
      const result = await logMultipleChanges(
        {
          resourceType: "medication",
          resourceId: 2,
          petId: 1,
          changedBy: 1,
          changedByRole: "admin",
          changeType: "update",
        },
        [
          { fieldName: "dosage", oldValue: "1x", newValue: "2x" },
          { fieldName: "frequency", oldValue: "daily", newValue: "twice daily" },
        ]
      );

      expect(result).toBeUndefined();
    });
  });

  describe("Change History Retrieval", () => {
    it("should retrieve recent changes", async () => {
      const changes = await getRecentChanges(10);
      
      expect(Array.isArray(changes)).toBe(true);
      expect(changes.length).toBeLessThanOrEqual(10);
      
      if (changes.length > 0) {
        const change = changes[0];
        expect(change).toHaveProperty("resourceType");
        expect(change).toHaveProperty("resourceId");
        expect(change).toHaveProperty("petId");
        expect(change).toHaveProperty("changedBy");
        expect(change).toHaveProperty("changedByRole");
      }
    });

    it("should retrieve pet-specific history", async () => {
      const petId = 1;
      const history = await getPetHistory(petId);
      
      expect(Array.isArray(history)).toBe(true);
      
      // All changes should be for the specified pet
      history.forEach((change: any) => {
        expect(change.petId).toBe(petId);
      });
    });

    it("should calculate collaboration stats correctly", async () => {
      const stats = await getCollaborationStats();
      
      expect(stats).toHaveProperty("totalChanges");
      expect(stats).toHaveProperty("adminChanges");
      expect(stats).toHaveProperty("tutorChanges");
      expect(stats).toHaveProperty("byResourceType");
      
      expect(typeof stats.totalChanges).toBe("number");
      expect(typeof stats.adminChanges).toBe("number");
      expect(typeof stats.tutorChanges).toBe("number");
      
      // Admin + tutor changes should equal total
      expect(stats.adminChanges + stats.tutorChanges).toBe(stats.totalChanges);
      
      // Resource type breakdown
      expect(stats.byResourceType).toHaveProperty("medication");
      expect(stats.byResourceType).toHaveProperty("food");
      expect(stats.byResourceType).toHaveProperty("preventive");
      expect(stats.byResourceType).toHaveProperty("pet_data");
      expect(stats.byResourceType).toHaveProperty("calendar");
    });
  });

  describe("Change Tracking Integration", () => {
    it("should track medication additions", async () => {
      const beforeCount = (await getRecentChanges(100)).length;
      
      await logChange({
        resourceType: "medication",
        resourceId: 999,
        petId: 1,
        fieldName: "medication_added",
        oldValue: null,
        newValue: "Test medication - 1 pill daily",
        changedBy: 1,
        changedByRole: "admin",
        changeType: "create",
      });
      
      const afterCount = (await getRecentChanges(100)).length;
      expect(afterCount).toBeGreaterThan(beforeCount);
    });

    it("should track vaccine additions", async () => {
      await logChange({
        resourceType: "preventive",
        resourceId: 888,
        petId: 1,
        fieldName: "vaccine_added",
        oldValue: null,
        newValue: "V10 - Dose 1",
        changedBy: 1,
        changedByRole: "admin",
        changeType: "create",
      });
      
      const history = await getPetHistory(1);
      const vaccineChanges = history.filter((c: any) => c.fieldName === "vaccine_added");
      
      expect(vaccineChanges.length).toBeGreaterThan(0);
    });

    it("should differentiate between admin and tutor changes", async () => {
      // Log admin change
      await logChange({
        resourceType: "medication",
        resourceId: 777,
        petId: 1,
        fieldName: "test_field",
        oldValue: null,
        newValue: "admin change",
        changedBy: 1,
        changedByRole: "admin",
        changeType: "update",
      });
      
      // Log tutor change
      await logChange({
        resourceType: "medication",
        resourceId: 666,
        petId: 1,
        fieldName: "test_field",
        oldValue: null,
        newValue: "tutor change",
        changedBy: 2,
        changedByRole: "tutor",
        changeType: "update",
      });
      
      const stats = await getCollaborationStats();
      expect(stats.adminChanges).toBeGreaterThan(0);
      expect(stats.tutorChanges).toBeGreaterThan(0);
    });
  });
});
