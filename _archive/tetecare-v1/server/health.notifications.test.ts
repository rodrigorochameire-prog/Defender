import { describe, it, expect, beforeAll } from "vitest";
import { appRouter } from "./routers";
import * as db from "./db";

describe("Health Notifications System", () => {
  let caller: ReturnType<typeof appRouter.createCaller>;

  beforeAll(() => {
    caller = appRouter.createCaller({
      user: { id: 1, email: "admin@test.com", name: "Admin", role: "admin" },
    });
  });

  it("should get upcoming vaccination reminders", async () => {
    const reminders = await db.getUpcomingVaccinationReminders(30);
    
    expect(Array.isArray(reminders)).toBe(true);
    
    // If there are reminders, validate structure
    if (reminders.length > 0) {
      const reminder = reminders[0];
      expect(reminder).toHaveProperty("vaccinationId");
      expect(reminder).toHaveProperty("petId");
      expect(reminder).toHaveProperty("petName");
      expect(reminder).toHaveProperty("vaccineId");
      expect(reminder).toHaveProperty("vaccineName");
      expect(reminder).toHaveProperty("nextDueDate");
    }
  });

  it("should get ending medication reminders", async () => {
    const reminders = await db.getEndingMedicationReminders(30);
    
    expect(Array.isArray(reminders)).toBe(true);
    
    // If there are reminders, validate structure
    if (reminders.length > 0) {
      const reminder = reminders[0];
      expect(reminder).toHaveProperty("medicationId");
      expect(reminder).toHaveProperty("petId");
      expect(reminder).toHaveProperty("petName");
      expect(reminder).toHaveProperty("medicationName");
      expect(reminder).toHaveProperty("endDate");
    }
  });

  it("should get upcoming flea treatment reminders", async () => {
    const reminders = await db.getUpcomingFleaTreatmentReminders(30);
    
    expect(Array.isArray(reminders)).toBe(true);
    
    // If there are reminders, validate structure
    if (reminders.length > 0) {
      const reminder = reminders[0];
      expect(reminder).toHaveProperty("treatmentId");
      expect(reminder).toHaveProperty("petId");
      expect(reminder).toHaveProperty("petName");
      expect(reminder).toHaveProperty("productName");
      expect(reminder).toHaveProperty("nextDueDate");
    }
  });

  it("should get upcoming deworming reminders", async () => {
    const reminders = await db.getUpcomingDewormingReminders(30);
    
    expect(Array.isArray(reminders)).toBe(true);
    
    // If there are reminders, validate structure
    if (reminders.length > 0) {
      const reminder = reminders[0];
      expect(reminder).toHaveProperty("treatmentId");
      expect(reminder).toHaveProperty("petId");
      expect(reminder).toHaveProperty("petName");
      expect(reminder).toHaveProperty("productName");
      expect(reminder).toHaveProperty("nextDueDate");
    }
  });

  it("should get all upcoming health reminders grouped by type", async () => {
    const reminders = await db.getAllUpcomingHealthReminders(30);
    
    expect(reminders).toHaveProperty("vaccinations");
    expect(reminders).toHaveProperty("medications");
    expect(reminders).toHaveProperty("fleaTreatments");
    expect(reminders).toHaveProperty("dewormingTreatments");
    expect(reminders).toHaveProperty("total");
    
    expect(Array.isArray(reminders.vaccinations)).toBe(true);
    expect(Array.isArray(reminders.medications)).toBe(true);
    expect(Array.isArray(reminders.fleaTreatments)).toBe(true);
    expect(Array.isArray(reminders.dewormingTreatments)).toBe(true);
    
    expect(typeof reminders.total).toBe("number");
    expect(reminders.total).toBe(
      reminders.vaccinations.length +
      reminders.medications.length +
      reminders.fleaTreatments.length +
      reminders.dewormingTreatments.length
    );
  });

  it("should get upcoming reminders via tRPC procedure", async () => {
    const result = await caller.healthNotifications.getUpcomingReminders({ daysAhead: 7 });
    
    expect(result).toHaveProperty("vaccinations");
    expect(result).toHaveProperty("medications");
    expect(result).toHaveProperty("fleaTreatments");
    expect(result).toHaveProperty("dewormingTreatments");
    expect(result).toHaveProperty("total");
  });

  it("should handle send notification when no reminders exist", async () => {
    // Test with 0 days ahead (should have no reminders)
    const result = await caller.healthNotifications.sendHealthReminders({ daysAhead: 0 });
    
    expect(result).toHaveProperty("success");
    expect(result).toHaveProperty("message");
    expect(result).toHaveProperty("sent");
    
    if (result.sent === false) {
      expect(result.message).toContain("Nenhum item próximo do vencimento");
    }
  });

  it("should format notification content correctly when reminders exist", async () => {
    const reminders = await db.getAllUpcomingHealthReminders(30);
    
    if (reminders.total > 0) {
      const result = await caller.healthNotifications.sendHealthReminders({ daysAhead: 30 });
      
      expect(result).toHaveProperty("success");
      expect(result.success).toBe(true);
      expect(result).toHaveProperty("reminders");
      
      // Notification should have been attempted
      expect(result).toHaveProperty("sent");
      expect(typeof result.sent).toBe("boolean");
    }
  });
});
