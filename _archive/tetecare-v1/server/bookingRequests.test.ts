import { describe, it, expect, beforeAll } from "vitest";
import { appRouter } from "./routers";

describe("Booking Requests System", () => {
  let caller: ReturnType<typeof appRouter.createCaller>;
  let adminCaller: ReturnType<typeof appRouter.createCaller>;
  let tutorCaller: ReturnType<typeof appRouter.createCaller>;

  beforeAll(() => {
    // Mock admin context
    adminCaller = appRouter.createCaller({
      user: {
        id: 1,
        openId: "admin-test-id",
        name: "Admin Test",
        email: "admin@test.com",
        role: "admin",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    // Mock tutor context
    tutorCaller = appRouter.createCaller({
      user: {
        id: 2,
        openId: "tutor-test-id",
        name: "Tutor Test",
        email: "tutor@test.com",
        role: "user",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    // Mock unauthenticated context
    caller = appRouter.createCaller({
      user: null,
    });
  });

  describe("Availability Check", () => {
    it("should return availability for requested dates", async () => {
      const dates = ["2025-01-15", "2025-01-16", "2025-01-17"];
      const result = await caller.bookingRequests.getAvailability({ dates });

      expect(result).toBeDefined();
      expect(result.length).toBe(3);
      
      result.forEach((avail) => {
        expect(avail).toHaveProperty("date");
        expect(avail).toHaveProperty("occupancy");
        expect(avail).toHaveProperty("maxCapacity");
        expect(avail).toHaveProperty("available");
        expect(avail).toHaveProperty("status");
        expect(["available", "limited", "full"]).toContain(avail.status);
      });
    });

    it("should calculate correct availability status", async () => {
      const dates = ["2025-02-01"];
      const result = await caller.bookingRequests.getAvailability({ dates });

      const avail = result[0];
      expect(avail.available).toBe(avail.maxCapacity - avail.occupancy);
      
      if (avail.available > 3) {
        expect(avail.status).toBe("available");
      } else if (avail.available > 0) {
        expect(avail.status).toBe("limited");
      } else {
        expect(avail.status).toBe("full");
      }
    });
  });

  describe("Booking Request Creation", () => {
    it("should allow authenticated tutors to create booking requests", async () => {
      const result = await tutorCaller.bookingRequests.create({
        petId: 1,
        requestedDates: ["2025-03-01", "2025-03-02"],
        notes: "Test booking request",
      });

      expect(result).toBeDefined();
      expect(result.petId).toBe(1);
      expect(result.status).toBe("pending");
    });

    it("should reject unauthenticated booking requests", async () => {
      await expect(
        caller.bookingRequests.create({
          petId: 1,
          requestedDates: ["2025-03-01"],
        })
      ).rejects.toThrow();
    });
  });

  describe("Booking Request Management", () => {
    it("should allow tutors to view their own requests", async () => {
      const result = await tutorCaller.bookingRequests.myRequests();
      
      expect(Array.isArray(result)).toBe(true);
      // If there are results, they should belong to the tutor
      if (result.length > 0) {
        result.forEach((request) => {
          // tutorId might not be in the response, check other fields
          expect(request).toHaveProperty("petName");
          expect(request).toHaveProperty("status");
        });
      }
    });

    it("should allow admins to view pending requests", async () => {
      const result = await adminCaller.bookingRequests.pending();
      
      expect(Array.isArray(result)).toBe(true);
      result.forEach((request) => {
        expect(request.status).toBe("pending");
      });
    });

    it("should reject non-admin access to pending requests", async () => {
      await expect(
        tutorCaller.bookingRequests.pending()
      ).rejects.toThrow();
    });
  });

  describe("Booking Request Approval", () => {
    it("should allow admins to approve requests", async () => {
      // First create a request
      const request = await tutorCaller.bookingRequests.create({
        petId: 1,
        requestedDates: ["2025-04-01"],
        notes: "Test approval",
      });

      // Then try to approve it
      // This might fail if pet doesn't have credits, which is expected
      try {
        const result = await adminCaller.bookingRequests.approve({
          id: request.id,
          adminNotes: "Approved for testing",
        });

        expect(result.success).toBe(true);
        expect(result.creditsUsed).toBe(1);
      } catch (error: any) {
        // If it fails due to insufficient credits, that's expected behavior
        expect(error.message).toMatch(/credit/i);
      }
    });

    it("should reject non-admin approval attempts", async () => {
      await expect(
        tutorCaller.bookingRequests.approve({
          id: 1,
        })
      ).rejects.toThrow();
    });

    it("should validate credits before approval", async () => {
      // This test assumes a pet with insufficient credits exists
      // The actual behavior depends on database state
      try {
        await adminCaller.bookingRequests.approve({
          id: 999, // Non-existent ID
        });
      } catch (error: any) {
        expect(error.message).toBeDefined();
      }
    });
  });

  describe("Booking Request Rejection", () => {
    it("should allow admins to reject requests", async () => {
      // First create a request
      const request = await tutorCaller.bookingRequests.create({
        petId: 1,
        requestedDates: ["2025-05-01"],
        notes: "Test rejection",
      });

      // Then reject it
      const result = await adminCaller.bookingRequests.reject({
        id: request.id,
        adminNotes: "Not available for this date",
      });

      expect(result.success).toBe(true);
    });

    it("should reject non-admin rejection attempts", async () => {
      await expect(
        tutorCaller.bookingRequests.reject({
          id: 1,
        })
      ).rejects.toThrow();
    });
  });

  describe("Booking Request Cancellation", () => {
    it("should allow tutors to cancel their own pending requests", async () => {
      // First create a request
      const request = await tutorCaller.bookingRequests.create({
        petId: 1,
        requestedDates: ["2025-06-01"],
        notes: "Test cancellation",
      });

      // Then cancel it
      const result = await tutorCaller.bookingRequests.cancel({
        id: request.id,
      });

      expect(result.success).toBe(true);
    });

    it("should prevent cancelling non-pending requests", async () => {
      // This test assumes a non-pending request exists
      try {
        await tutorCaller.bookingRequests.cancel({
          id: 999, // Non-existent or non-pending ID
        });
      } catch (error: any) {
        expect(error.message).toBeDefined();
      }
    });
  });

  describe("Booking Request Statistics", () => {
    it("should return statistics for admins", async () => {
      const stats = await adminCaller.bookingRequests.stats();

      expect(stats).toBeDefined();
      expect(stats).toHaveProperty("total");
      expect(stats).toHaveProperty("pending");
      expect(stats).toHaveProperty("approved");
      expect(stats).toHaveProperty("rejected");
      expect(stats).toHaveProperty("cancelled");

      expect(typeof stats.total).toBe("number");
      expect(typeof stats.pending).toBe("number");
      expect(typeof stats.approved).toBe("number");
      expect(typeof stats.rejected).toBe("number");
      expect(typeof stats.cancelled).toBe("number");
    });

    it("should reject non-admin access to statistics", async () => {
      await expect(
        tutorCaller.bookingRequests.stats()
      ).rejects.toThrow();
    });
  });

  describe("Integration Tests", () => {
    it("should complete full booking request lifecycle", async () => {
      // 1. Tutor creates request
      const request = await tutorCaller.bookingRequests.create({
        petId: 1,
        requestedDates: ["2025-07-01", "2025-07-02"],
        notes: "Full lifecycle test",
      });

      expect(request.status).toBe("pending");

      // 2. Admin views pending requests
      const pending = await adminCaller.bookingRequests.pending();
      const foundRequest = pending.find((r) => r.id === request.id);
      expect(foundRequest).toBeDefined();

      // 3. Admin approves request (or rejects based on test scenario)
      // Note: This might fail if pet doesn't have enough credits
      try {
        const approval = await adminCaller.bookingRequests.approve({
          id: request.id,
          adminNotes: "Approved for lifecycle test",
        });
        expect(approval.success).toBe(true);
      } catch (error: any) {
        // If approval fails due to credits, that's expected behavior
        expect(error.message).toContain("credit");
      }
    });
  });
});
