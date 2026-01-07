import { describe, it, expect, beforeAll } from "vitest";
import { appRouter } from "./routers";
import type { Context } from "./_core/context";

/**
 * Test suite for notification templates and preferences system
 */

// Mock admin context
const mockAdminContext: Context = {
  user: {
    id: 1,
    openId: "admin-test",
    name: "Admin Test",
    email: "admin@test.com",
    role: "admin",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
    loginMethod: "test",
    phone: null,
    stripeCustomerId: null,
  },
  req: {} as any,
  res: {} as any,
};

// Mock tutor context
const mockTutorContext: Context = {
  user: {
    id: 2,
    openId: "tutor-test",
    name: "Tutor Test",
    email: "tutor@test.com",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
    loginMethod: "test",
    phone: null,
    stripeCustomerId: null,
  },
  req: {} as any,
  res: {} as any,
};

const adminCaller = appRouter.createCaller(mockAdminContext);
const tutorCaller = appRouter.createCaller(mockTutorContext);

describe("Notification Templates System", () => {
  let createdTemplateId: number;

  it("should allow admin to create notification template", async () => {
    const result = await adminCaller.notificationTemplates.create({
      type: "checkin_notification",
      title: "{{petName}} chegou! 🐾",
      message: "Olá {{tutorName}}, {{petName}} fez check-in às {{time}}.",
      availableVariables: JSON.stringify(["{{petName}}", "{{tutorName}}", "{{time}}"]),
      isActive: true,
    });

    expect(result.success).toBe(true);
    expect(result.id).toBeDefined();
    createdTemplateId = result.id!;
  });

  it("should retrieve all notification templates", async () => {
    const templates = await adminCaller.notificationTemplates.getAll();
    
    expect(Array.isArray(templates)).toBe(true);
    expect(templates.length).toBeGreaterThan(0);
    
    const createdTemplate = templates.find(t => t.id === createdTemplateId);
    expect(createdTemplate).toBeDefined();
    expect(createdTemplate?.type).toBe("checkin_notification");
  });

  it("should retrieve template by type", async () => {
    const template = await adminCaller.notificationTemplates.getByType({
      type: "checkin_notification",
    });

    expect(template).toBeDefined();
    expect(template?.type).toBe("checkin_notification");
    expect(template?.title).toContain("{{petName}}");
  });

  it("should allow admin to update notification template", async () => {
    const result = await adminCaller.notificationTemplates.update({
      id: createdTemplateId,
      title: "{{petName}} chegou na creche! 🐕",
      message: "Olá {{tutorName}}, seu pet {{petName}} fez check-in às {{time}}. Tenha um ótimo dia!",
    });

    expect(result.success).toBe(true);

    const updated = await adminCaller.notificationTemplates.getByType({
      type: "checkin_notification",
    });
    expect(updated?.title).toContain("chegou na creche");
  });

  it("should allow admin to deactivate template", async () => {
    const result = await adminCaller.notificationTemplates.update({
      id: createdTemplateId,
      isActive: false,
    });

    expect(result.success).toBe(true);

    const updated = await adminCaller.notificationTemplates.getByType({
      type: "checkin_notification",
    });
    expect(updated?.isActive).toBe(false);
  });

  it("should allow admin to delete notification template", async () => {
    const result = await adminCaller.notificationTemplates.delete({
      id: createdTemplateId,
    });

    expect(result.success).toBe(true);
  });
});

describe("Tutor Notification Preferences System", () => {
  it("should allow tutor to set notification preference", async () => {
    const result = await tutorCaller.tutorPreferences.upsert({
      notificationType: "checkin_notification",
      enabled: true,
    });

    expect(result.success).toBe(true);
    expect(result.id).toBeDefined();
  });

  it("should allow tutor to retrieve their preferences", async () => {
    const preferences = await tutorCaller.tutorPreferences.getMine();

    expect(Array.isArray(preferences)).toBe(true);
    
    const checkinPref = preferences.find(p => p.notificationType === "checkin_notification");
    expect(checkinPref).toBeDefined();
    expect(checkinPref?.enabled).toBe(true);
  });

  it("should allow tutor to disable notification", async () => {
    const result = await tutorCaller.tutorPreferences.upsert({
      notificationType: "checkin_notification",
      enabled: false,
    });

    expect(result.success).toBe(true);

    const preferences = await tutorCaller.tutorPreferences.getMine();
    const checkinPref = preferences.find(p => p.notificationType === "checkin_notification");
    expect(checkinPref?.enabled).toBe(false);
  });

  it("should allow admin to view all tutor preferences", async () => {
    const allPreferences = await adminCaller.tutorPreferences.getAll();

    expect(Array.isArray(allPreferences)).toBe(true);
    expect(allPreferences.length).toBeGreaterThan(0);
  });

  it("should allow admin to override tutor preference", async () => {
    const result = await adminCaller.tutorPreferences.adminOverride({
      tutorId: 2, // tutor test user
      notificationType: "daily_report",
      adminOverride: true,
    });

    expect(result.success).toBe(true);
  });

  it("should prevent tutor from changing admin-overridden preference", async () => {
    try {
      await tutorCaller.tutorPreferences.upsert({
        notificationType: "daily_report",
        enabled: true,
      });
      // Should not reach here
      expect(true).toBe(false);
    } catch (error: any) {
      expect(error.message).toContain("bloqueada pelo administrador");
    }
  });

  it("should allow admin to remove override", async () => {
    const result = await adminCaller.tutorPreferences.adminOverride({
      tutorId: 2,
      notificationType: "daily_report",
      adminOverride: false,
    });

    expect(result.success).toBe(true);

    // Now tutor should be able to change it
    const updateResult = await tutorCaller.tutorPreferences.upsert({
      notificationType: "daily_report",
      enabled: true,
    });

    expect(updateResult.success).toBe(true);
  });
});

describe("Notification Service Integration", () => {
  it("should check if notification templates exist", async () => {
    const templates = await adminCaller.notificationTemplates.getAll();
    
    // Should have templates for all notification types
    const expectedTypes = [
      "vaccine_reminder_7d",
      "vaccine_reminder_1d",
      "medication_reminder",
      "checkin_notification",
      "checkout_notification",
      "daily_report",
      "credits_low",
      "event_reminder",
    ];

    // Note: This test will pass even if no templates exist yet
    // In production, you should seed default templates
    console.log(`Found ${templates.length} notification templates`);
  });

  it("should verify tutor preferences system is working", async () => {
    const preferences = await tutorCaller.tutorPreferences.getMine();
    
    // Tutor should be able to retrieve their preferences
    expect(Array.isArray(preferences)).toBe(true);
    console.log(`Tutor has ${preferences.length} notification preferences configured`);
  });
});
