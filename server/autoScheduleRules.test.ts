import { describe, it, expect } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAdminContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "admin-autoschedule",
    email: "admin@test.com",
    name: "Admin User",
    loginMethod: "manus",
    role: "admin",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: {
      protocol: "https",
      headers: {},
      ip: "127.0.0.1",
    } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

function createUserContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 2,
    openId: "user-autoschedule",
    email: "user@test.com",
    name: "Regular User",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: {
      protocol: "https",
      headers: {},
      ip: "127.0.0.1",
    } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe.sequential("autoScheduleRules router", () => {
  let ruleId: number;
  const medicationId = 1; // Simparic

  it("should allow admin to create auto-schedule rule", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.autoScheduleRules.create({
      medicationId,
      intervalDays: 35,
      intervalType: "days",
      intervalValue: 35,
      notes: "Simparic: aplicar a cada 35 dias",
    });

    expect(result).toBeDefined();
    expect(result.id).toBeGreaterThan(0);
    ruleId = result.id;
  });

  it("should list all active auto-schedule rules (public)", async () => {
    const caller = appRouter.createCaller(createUserContext());
    const result = await caller.autoScheduleRules.list();

    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
  });

  it("should get auto-schedule rule by id", async () => {
    const caller = appRouter.createCaller(createUserContext());
    const result = await caller.autoScheduleRules.getById({ id: ruleId });

    expect(result).toBeDefined();
    expect(result?.medicationId).toBe(medicationId);
    expect(result?.intervalDays).toBe(35);
  });

  it("should get auto-schedule rule by medication id", async () => {
    const caller = appRouter.createCaller(createUserContext());
    const result = await caller.autoScheduleRules.getByMedicationId({ medicationId });

    expect(result).toBeDefined();
    expect(result?.id).toBe(ruleId);
    expect(result?.intervalDays).toBe(35);
  });

  it("should allow admin to update auto-schedule rule", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    await caller.autoScheduleRules.update({
      id: ruleId,
      intervalDays: 30,
      intervalValue: 30,
      notes: "Atualizado para 30 dias",
    });

    const updated = await caller.autoScheduleRules.getById({ id: ruleId });
    expect(updated?.intervalDays).toBe(30);
    expect(updated?.notes).toBe("Atualizado para 30 dias");
  });

  it("should allow admin to create rule with years interval", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.autoScheduleRules.create({
      medicationId: 2, // V10
      intervalDays: 365,
      intervalType: "years",
      intervalValue: 1,
      notes: "V10: aplicar anualmente",
    });

    expect(result).toBeDefined();
    expect(result.id).toBeGreaterThan(0);

    const rule = await caller.autoScheduleRules.getById({ id: result.id });
    expect(rule?.intervalType).toBe("years");
    expect(rule?.intervalValue).toBe(1);
  });

  it("should allow admin to soft delete auto-schedule rule", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    await caller.autoScheduleRules.delete({ id: ruleId });

    const allRules = await caller.autoScheduleRules.listAll();
    const deletedRule = allRules.find((r) => r.id === ruleId);
    expect(deletedRule?.isActive).toBe(false);
  });

  it("should not list inactive rules in public list", async () => {
    const caller = appRouter.createCaller(createUserContext());
    const result = await caller.autoScheduleRules.list();

    expect(result.some((r) => r.id === ruleId)).toBe(false);
  });

  it("should prevent non-admin from creating auto-schedule rule", async () => {
    const caller = appRouter.createCaller(createUserContext());
    
    await expect(
      caller.autoScheduleRules.create({
        medicationId: 3,
        intervalDays: 30,
        intervalType: "days",
        intervalValue: 30,
      })
    ).rejects.toThrow("Admin access required");
  });

  it("should prevent non-admin from updating auto-schedule rule", async () => {
    const caller = appRouter.createCaller(createUserContext());
    
    await expect(
      caller.autoScheduleRules.update({
        id: ruleId,
        intervalDays: 40,
      })
    ).rejects.toThrow("Admin access required");
  });

  it("should prevent non-admin from deleting auto-schedule rule", async () => {
    const caller = appRouter.createCaller(createUserContext());
    
    await expect(
      caller.autoScheduleRules.delete({ id: ruleId })
    ).rejects.toThrow("Admin access required");
  });
});
