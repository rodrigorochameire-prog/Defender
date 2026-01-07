import { describe, it, expect } from "vitest";
import {
  calculateNextDose,
  calculateFutureDoses,
  calculateAutoScheduledDose,
  type PeriodicityConfig,
} from "./medicationScheduler";

describe("medicationScheduler", () => {
  describe("calculateNextDose - daily", () => {
    it("should add 1 day for daily periodicity", () => {
      const lastDate = new Date("2024-01-15T10:00:00");
      const config: PeriodicityConfig = { periodicity: "daily" };
      
      const nextDose = calculateNextDose(lastDate, config);
      
      expect(nextDose.getDate()).toBe(16);
      expect(nextDose.getMonth()).toBe(0); // January
    });
  });

  describe("calculateNextDose - weekly", () => {
    it("should add 7 days when no weekDays specified", () => {
      const lastDate = new Date("2024-01-15T10:00:00"); // Monday
      const config: PeriodicityConfig = { periodicity: "weekly" };
      
      const nextDose = calculateNextDose(lastDate, config);
      
      expect(nextDose.getDate()).toBe(22);
    });

    it("should find next matching weekday in same week", () => {
      const lastDate = new Date("2024-01-15T10:00:00"); // Monday (day 1)
      const config: PeriodicityConfig = {
        periodicity: "weekly",
        weekDays: [3, 5], // Wednesday, Friday
      };
      
      const nextDose = calculateNextDose(lastDate, config);
      
      expect(nextDose.getDay()).toBe(3); // Wednesday
      expect(nextDose.getDate()).toBe(17);
    });

    it("should wrap to next week when no more days in current week", () => {
      const lastDate = new Date("2024-01-19T10:00:00"); // Friday (day 5)
      const config: PeriodicityConfig = {
        periodicity: "weekly",
        weekDays: [1, 3], // Monday, Wednesday
      };
      
      const nextDose = calculateNextDose(lastDate, config);
      
      expect(nextDose.getDay()).toBe(1); // Monday
      expect(nextDose.getDate()).toBe(22);
    });
  });

  describe("calculateNextDose - monthly", () => {
    it("should add 1 month when no monthDays specified", () => {
      const lastDate = new Date("2024-01-15T10:00:00");
      const config: PeriodicityConfig = { periodicity: "monthly" };
      
      const nextDose = calculateNextDose(lastDate, config);
      
      expect(nextDose.getMonth()).toBe(1); // February
      expect(nextDose.getDate()).toBe(15);
    });

    it("should find next matching day in same month", () => {
      const lastDate = new Date("2024-01-10T10:00:00");
      const config: PeriodicityConfig = {
        periodicity: "monthly",
        monthDays: [15, 25],
      };
      
      const nextDose = calculateNextDose(lastDate, config);
      
      expect(nextDose.getMonth()).toBe(0); // January
      expect(nextDose.getDate()).toBe(15);
    });

    it("should wrap to next month when no more days in current month", () => {
      const lastDate = new Date("2024-01-26T10:00:00");
      const config: PeriodicityConfig = {
        periodicity: "monthly",
        monthDays: [5, 15, 25],
      };
      
      const nextDose = calculateNextDose(lastDate, config);
      
      expect(nextDose.getMonth()).toBe(1); // February
      expect(nextDose.getDate()).toBe(5);
    });

    it("should handle invalid dates (e.g., Feb 30)", () => {
      const lastDate = new Date("2024-01-30T10:00:00");
      const config: PeriodicityConfig = {
        periodicity: "monthly",
        monthDays: [30],
      };
      
      const nextDose = calculateNextDose(lastDate, config);
      
      // Feb doesn't have 30 days, should move to March
      expect(nextDose.getMonth()).toBe(2); // March
    });
  });

  describe("calculateNextDose - custom", () => {
    it("should add custom interval in days", () => {
      const lastDate = new Date("2024-01-15T10:00:00");
      const config: PeriodicityConfig = {
        periodicity: "custom",
        customInterval: 35, // Simparic interval
      };
      
      const nextDose = calculateNextDose(lastDate, config);
      
      expect(nextDose.getDate()).toBe(19);
      expect(nextDose.getMonth()).toBe(1); // February
    });

    it("should default to 1 day if customInterval not specified", () => {
      const lastDate = new Date("2024-01-15T10:00:00");
      const config: PeriodicityConfig = { periodicity: "custom" };
      
      const nextDose = calculateNextDose(lastDate, config);
      
      expect(nextDose.getDate()).toBe(16);
    });
  });

  describe("calculateFutureDoses", () => {
    it("should calculate multiple future doses", () => {
      const startDate = new Date("2024-01-01T10:00:00");
      const config: PeriodicityConfig = {
        periodicity: "custom",
        customInterval: 7,
      };
      
      const doses = calculateFutureDoses(startDate, config, 5);
      
      expect(doses).toHaveLength(5);
      expect(doses[0]?.getDate()).toBe(1);
      expect(doses[1]?.getDate()).toBe(8);
      expect(doses[2]?.getDate()).toBe(15);
      expect(doses[3]?.getDate()).toBe(22);
      expect(doses[4]?.getDate()).toBe(29);
    });
  });

  describe("calculateAutoScheduledDose", () => {
    it("should add days correctly", () => {
      const lastDate = new Date("2024-01-15T10:00:00");
      const nextDose = calculateAutoScheduledDose(lastDate, "days", 35);
      
      expect(nextDose.getDate()).toBe(19);
      expect(nextDose.getMonth()).toBe(1); // February
    });

    it("should add weeks correctly", () => {
      const lastDate = new Date("2024-01-15T10:00:00");
      const nextDose = calculateAutoScheduledDose(lastDate, "weeks", 2);
      
      expect(nextDose.getDate()).toBe(29);
      expect(nextDose.getMonth()).toBe(0); // January
    });

    it("should add months correctly", () => {
      const lastDate = new Date("2024-01-15T10:00:00");
      const nextDose = calculateAutoScheduledDose(lastDate, "months", 3);
      
      expect(nextDose.getDate()).toBe(15);
      expect(nextDose.getMonth()).toBe(3); // April
    });

    it("should add years correctly", () => {
      const lastDate = new Date("2024-01-15T10:00:00");
      const nextDose = calculateAutoScheduledDose(lastDate, "years", 1);
      
      expect(nextDose.getDate()).toBe(15);
      expect(nextDose.getMonth()).toBe(0); // January
      expect(nextDose.getFullYear()).toBe(2025);
    });
  });
});
