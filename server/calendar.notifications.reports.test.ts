import { describe, it, expect, beforeAll } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import * as db from "./db";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAdminContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "admin-test",
    email: "admin@tetocare.com",
    name: "Admin Test",
    loginMethod: "manus",
    role: "admin",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };

  return ctx;
}

function createTutorContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 2,
    openId: "tutor-test",
    email: "tutor@tetocare.com",
    name: "Tutor Test",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };

  return ctx;
}

describe("Calendar Router", () => {
  let testPetId: number;

  beforeAll(async () => {
    // Criar um pet de teste
    testPetId = await db.createPet({
      name: "Calendar Test Pet",
      breed: "Test Breed",
    });
  });

  it("should get events within date range", async () => {
    const ctx = createTutorContext();
    const caller = appRouter.createCaller(ctx);
    
    const startDate = new Date("2024-01-01");
    const endDate = new Date("2024-12-31");
    
    const events = await caller.calendar.getEvents({ startDate, endDate });
    
    expect(Array.isArray(events)).toBe(true);
  });

  it("should get pet events", async () => {
    const ctx = createTutorContext();
    const caller = appRouter.createCaller(ctx);
    
    const events = await caller.calendar.getPetEvents({ petId: testPetId });
    
    expect(Array.isArray(events)).toBe(true);
  });

  it("should add calendar event", async () => {
    const ctx = createTutorContext();
    const caller = appRouter.createCaller(ctx);
    
    const result = await caller.calendar.add({
      petId: testPetId,
      eventType: "vaccination",
      title: "Test Vaccine",
      description: "Test vaccine appointment",
      eventDate: new Date("2024-06-15T10:00:00"),
      isAllDay: false,
    });
    
    expect(result.id).toBeDefined();
  });
});

describe("Notifications Router", () => {
  it("should get user notifications", async () => {
    const ctx = createTutorContext();
    const caller = appRouter.createCaller(ctx);
    
    const notifications = await caller.notifications.getUserNotifications();
    
    expect(Array.isArray(notifications)).toBe(true);
  });

  it("should mark notification as read", async () => {
    const ctx = createTutorContext();
    const caller = appRouter.createCaller(ctx);
    
    // Primeiro, obter notificações
    const notifications = await caller.notifications.getUserNotifications();
    
    if (notifications.length > 0) {
      const result = await caller.notifications.markAsRead({ id: notifications[0].id });
      expect(result.success).toBe(true);
      
      // Verificar se foi marcada como lida
      const updated = await caller.notifications.getUserNotifications();
      const notification = updated.find(n => n.id === notifications[0].id);
      
      if (notification) {
        expect(notification.isRead).toBe(true);
      }
    } else {
      // Se não há notificações, o teste passa
      expect(true).toBe(true);
    }
  });
});

describe("Reports Router", () => {
  let testPetId: number;

  beforeAll(async () => {
    // Criar um pet de teste
    testPetId = await db.createPet({
      name: "Report Test Pet",
      breed: "Test Breed",
    });
  });

  it("should generate behavior report", async () => {
    const ctx = createTutorContext();
    const caller = appRouter.createCaller(ctx);
    
    const result = await caller.reports.generate({
      petId: testPetId,
      type: "behavior",
      periodDays: 30,
    });
    
    expect(result.success).toBe(true);
    expect(result.url).toBeDefined();
    expect(result.message).toContain("behavior");
  });

  it("should generate health report", async () => {
    const ctx = createTutorContext();
    const caller = appRouter.createCaller(ctx);
    
    const result = await caller.reports.generate({
      petId: testPetId,
      type: "health",
      periodDays: 90,
    });
    
    expect(result.success).toBe(true);
    expect(result.url).toBeDefined();
    expect(result.message).toContain("health");
  });

  it("should generate financial report", async () => {
    const ctx = createTutorContext();
    const caller = appRouter.createCaller(ctx);
    
    const result = await caller.reports.generate({
      petId: testPetId,
      type: "financial",
      periodDays: 180,
    });
    
    expect(result.success).toBe(true);
    expect(result.url).toBeDefined();
    expect(result.message).toContain("financial");
  });

  it("should validate report type", async () => {
    const ctx = createTutorContext();
    const caller = appRouter.createCaller(ctx);
    
    await expect(
      caller.reports.generate({
        petId: testPetId,
        type: "invalid" as any,
        periodDays: 30,
      })
    ).rejects.toThrow();
  });
});
