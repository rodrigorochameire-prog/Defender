import { describe, it, expect } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAdminContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "admin-eventtypes",
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
    openId: "user-eventtypes",
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

describe.sequential("eventTypes router", () => {
  let eventTypeId: number;

  it("should allow admin to create event type", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.eventTypes.create({
      name: "Aniversário",
      color: "#FF6B9D",
      icon: "cake",
    });

    expect(result).toBeDefined();
    expect(result.id).toBeGreaterThan(0);
    eventTypeId = result.id;
  });

  it("should list all active event types (public)", async () => {
    const caller = appRouter.createCaller(createUserContext());
    const result = await caller.eventTypes.list();

    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
    expect(result.some((et) => et.name === "Aniversário")).toBe(true);
  });

  it("should get event type by id", async () => {
    const caller = appRouter.createCaller(createUserContext());
    const result = await caller.eventTypes.getById({ id: eventTypeId });

    expect(result).toBeDefined();
    expect(result?.name).toBe("Aniversário");
    expect(result?.color).toBe("#FF6B9D");
  });

  it("should allow admin to update event type", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    await caller.eventTypes.update({
      id: eventTypeId,
      name: "Festa de Aniversário",
      color: "#FF1493",
    });

    const updated = await caller.eventTypes.getById({ id: eventTypeId });
    expect(updated?.name).toBe("Festa de Aniversário");
    expect(updated?.color).toBe("#FF1493");
  });

  it("should allow admin to soft delete event type", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    await caller.eventTypes.delete({ id: eventTypeId });

    const allTypes = await caller.eventTypes.listAll();
    const deletedType = allTypes.find((et) => et.id === eventTypeId);
    expect(deletedType?.isActive).toBe(false);
  });

  it("should not list inactive event types in public list", async () => {
    const caller = appRouter.createCaller(createUserContext());
    const result = await caller.eventTypes.list();

    expect(result.some((et) => et.id === eventTypeId)).toBe(false);
  });

  it("should prevent non-admin from creating event type", async () => {
    const caller = appRouter.createCaller(createUserContext());
    
    await expect(
      caller.eventTypes.create({
        name: "Unauthorized",
        color: "#000000",
      })
    ).rejects.toThrow("Admin access required");
  });

  it("should prevent non-admin from updating event type", async () => {
    const caller = appRouter.createCaller(createUserContext());
    
    await expect(
      caller.eventTypes.update({
        id: eventTypeId,
        name: "Hacked",
      })
    ).rejects.toThrow("Admin access required");
  });

  it("should prevent non-admin from deleting event type", async () => {
    const caller = appRouter.createCaller(createUserContext());
    
    await expect(
      caller.eventTypes.delete({ id: eventTypeId })
    ).rejects.toThrow("Admin access required");
  });
});
