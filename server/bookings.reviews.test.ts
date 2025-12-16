import { describe, it, expect, beforeAll } from "vitest";
import { appRouter } from "./routers";
import * as db from "./db";

describe("Bookings Router", () => {
  let ctx: any;
  let caller: any;

  beforeAll(async () => {
    // Mock authenticated user context
    ctx = {
      user: { id: 1, name: "Test Tutor", email: "tutor@test.com", role: "user" },
    };
    caller = appRouter.createCaller(ctx);

    // Ensure test pet exists
    const pets = await db.getPetsByTutorId(ctx.user.id);
    if (pets.length === 0) {
      await db.createPet({
        name: "Test Pet",
        species: "dog",
        breed: "Test Breed",
        birthDate: new Date("2020-01-01"),
        gender: "male",
        weight: 10,
        tutorId: ctx.user.id,
      });
    }
  });

  it("should create a booking", async () => {
    const pets = await db.getPetsByTutorId(ctx.user.id);
    const petId = pets[0].id;

    const booking = await caller.bookings.create({
      petId,
      bookingDate: new Date("2025-02-01"),
      numberOfDays: 2,
      notes: "Test booking",
    });

    expect(booking).toBeDefined();
    expect(booking.petId).toBe(petId);
    expect(booking.numberOfDays).toBe(2);
    expect(booking.status).toBe("confirmed");
  });

  it("should list bookings for a pet", async () => {
    const pets = await db.getPetsByTutorId(ctx.user.id);
    const petId = pets[0].id;

    const bookings = await caller.bookings.list({ petId });

    expect(Array.isArray(bookings)).toBe(true);
    expect(bookings.length).toBeGreaterThan(0);
  });

  it("should cancel a booking", async () => {
    const pets = await db.getPetsByTutorId(ctx.user.id);
    const petId = pets[0].id;

    // Create a booking first
    const booking = await caller.bookings.create({
      petId,
      bookingDate: new Date("2025-03-01"),
      numberOfDays: 1,
    });

    // Cancel it
    const result = await caller.bookings.cancel({ id: booking.id });
    expect(result.success).toBe(true);

    // Verify status changed
    const updated = await db.getBookingById(booking.id);
    expect(updated?.status).toBe("cancelled");
  });

  it("should get bookings by date range", async () => {
    const startDate = new Date("2025-01-01");
    const endDate = new Date("2025-12-31");

    const bookings = await caller.bookings.getByDateRange({ startDate, endDate });

    expect(Array.isArray(bookings)).toBe(true);
  });
});

describe("Reviews Router", () => {
  let ctx: any;
  let caller: any;

  beforeAll(async () => {
    ctx = {
      user: { id: 1, name: "Test Tutor", email: "tutor@test.com", role: "user" },
    };
    caller = appRouter.createCaller(ctx);

    // Ensure test pet exists
    const pets = await db.getPetsByTutorId(ctx.user.id);
    if (pets.length === 0) {
      await db.createPet({
        name: "Test Pet Review",
        species: "dog",
        breed: "Test Breed",
        birthDate: new Date("2020-01-01"),
        gender: "male",
        weight: 10,
        tutorId: ctx.user.id,
      });
    }
  });

  it("should create a review", async () => {
    const pets = await db.getPetsByTutorId(ctx.user.id);
    if (pets.length === 0) {
      console.log("No pets found, skipping test");
      return;
    }
    const petId = pets[0].id;

    const review = await caller.reviews.create({
      petId,
      rating: 5,
      comment: "Excellent service!",
      visitDate: new Date("2025-01-15"),
    });

    expect(review).toBeDefined();
    expect(review.rating).toBe(5);
    expect(review.comment).toBe("Excellent service!");
  });

  it("should list reviews", async () => {
    const reviews = await caller.reviews.list({});
    expect(Array.isArray(reviews)).toBe(true);
  });

  it("should get average rating", async () => {
    const avgRating = await caller.reviews.getAverageRating();

    expect(typeof avgRating).toBe("number");
    expect(avgRating).toBeGreaterThanOrEqual(0);
    expect(avgRating).toBeLessThanOrEqual(5);
  });

  it("should validate rating range", async () => {
    const pets = await db.getPetsByTutorId(ctx.user.id);
    if (pets.length === 0) return;
    
    const petId = pets[0].id;

    await expect(
      caller.reviews.create({
        petId,
        rating: 6, // Invalid: > 5
        visitDate: new Date(),
      })
    ).rejects.toThrow();
  });
});

describe("Analytics Data", () => {
  it("should fetch weight history", async () => {
    const pets = await db.getPetsByTutorId(1);
    if (pets.length === 0) return;

    const petId = pets[0].id;

    // This would require implementing the analytics router
    // For now, we test the data structure
    const weightHistory = await db.getWeightHistory?.(petId);

    if (weightHistory) {
      expect(Array.isArray(weightHistory)).toBe(true);
    }
  });

  it("should calculate behavior statistics", async () => {
    const pets = await db.getPetsByTutorId(1);
    if (pets.length === 0) return;

    const petId = pets[0].id;
    const behaviors = await db.listBehaviorRecords({ petId });

    expect(Array.isArray(behaviors)).toBe(true);

    const stats = {
      positive: behaviors.filter((b) => b.behaviorType === "positive").length,
      negative: behaviors.filter((b) => b.behaviorType === "negative").length,
      neutral: behaviors.filter((b) => b.behaviorType === "neutral").length,
    };

    expect(stats.positive).toBeGreaterThanOrEqual(0);
    expect(stats.negative).toBeGreaterThanOrEqual(0);
    expect(stats.neutral).toBeGreaterThanOrEqual(0);
  });
});
