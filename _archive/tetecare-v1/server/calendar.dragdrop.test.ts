import { describe, it, expect, beforeAll } from "vitest";
import { appRouter } from "./routers";

describe("Calendar Drag & Drop - Update Events", () => {
  let caller: ReturnType<typeof appRouter.createCaller>;

  beforeAll(() => {
    caller = appRouter.createCaller({
      user: { openId: "admin-test", email: "admin@test.com", name: "Admin", role: "admin" },
    });
  });

  it("should have updateBooking procedure for drag & drop", async () => {
    expect(caller.healthCalendar.updateBooking).toBeDefined();
    expect(typeof caller.healthCalendar.updateBooking).toBe("function");
  });

  it("should have updateTransaction procedure for drag & drop", async () => {
    expect(caller.healthCalendar.updateTransaction).toBeDefined();
    expect(typeof caller.healthCalendar.updateTransaction).toBe("function");
  });

  it("should have vaccines.update procedure for drag & drop", async () => {
    expect(caller.vaccines.update).toBeDefined();
    expect(typeof caller.vaccines.update).toBe("function");
  });

  it("should have medications.update procedure for drag & drop", async () => {
    expect(caller.medications.update).toBeDefined();
    expect(typeof caller.medications.update).toBe("function");
  });

  it("should have all required procedures for drag & drop functionality", () => {
    // Verify all procedures exist
    expect(caller.healthCalendar.updateBooking).toBeDefined();
    expect(caller.healthCalendar.updateTransaction).toBeDefined();
    expect(caller.vaccines.update).toBeDefined();
    expect(caller.medications.update).toBeDefined();
    
    // Verify they are functions
    expect(typeof caller.healthCalendar.updateBooking).toBe("function");
    expect(typeof caller.healthCalendar.updateTransaction).toBe("function");
    expect(typeof caller.vaccines.update).toBe("function");
    expect(typeof caller.medications.update).toBe("function");
  });
});
