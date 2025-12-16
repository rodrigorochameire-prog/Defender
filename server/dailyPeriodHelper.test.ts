import { describe, it, expect } from "vitest";
import {
  calculateDailyCount,
  generatePeriodDates,
  isDateInPeriod,
  formatPeriod,
  validatePeriod,
} from "./dailyPeriodHelper";

describe("dailyPeriodHelper", () => {
  describe("calculateDailyCount", () => {
    it("should calculate 1 day for same check-in and check-out", () => {
      const date = new Date("2024-01-15");
      const count = calculateDailyCount(date, date);
      expect(count).toBe(1);
    });

    it("should calculate 3 days for Mon-Wed period", () => {
      const checkIn = new Date("2024-01-15"); // Monday
      const checkOut = new Date("2024-01-17"); // Wednesday
      const count = calculateDailyCount(checkIn, checkOut);
      expect(count).toBe(3);
    });

    it("should calculate 7 days for a week", () => {
      const checkIn = new Date("2024-01-15");
      const checkOut = new Date("2024-01-21");
      const count = calculateDailyCount(checkIn, checkOut);
      expect(count).toBe(7);
    });

    it("should handle dates with different times", () => {
      const checkIn = new Date("2024-01-15T10:00:00");
      const checkOut = new Date("2024-01-17T18:30:00");
      const count = calculateDailyCount(checkIn, checkOut);
      expect(count).toBe(3);
    });

    it("should return minimum 1 day even for invalid periods", () => {
      const checkIn = new Date("2024-01-17");
      const checkOut = new Date("2024-01-15"); // Earlier than check-in
      const count = calculateDailyCount(checkIn, checkOut);
      expect(count).toBe(1);
    });
  });

  describe("generatePeriodDates", () => {
    it("should generate single date for same check-in/check-out", () => {
      const date = new Date("2024-01-15T12:00:00");
      const dates = generatePeriodDates(date, date);
      
      expect(dates).toHaveLength(1);
      expect(dates[0].getHours()).toBe(0);
      expect(dates[0].getMinutes()).toBe(0);
    });

    it("should generate all dates for 3-day period", () => {
      const checkIn = new Date("2024-01-15T12:00:00");
      const checkOut = new Date("2024-01-17T12:00:00");
      const dates = generatePeriodDates(checkIn, checkOut);
      
      expect(dates).toHaveLength(3);
      // Dates should be consecutive
      expect(dates[1].getTime() - dates[0].getTime()).toBe(24 * 60 * 60 * 1000);
      expect(dates[2].getTime() - dates[1].getTime()).toBe(24 * 60 * 60 * 1000);
    });

    it("should handle month boundaries", () => {
      const checkIn = new Date("2024-01-30T12:00:00");
      const checkOut = new Date("2024-02-02T12:00:00");
      const dates = generatePeriodDates(checkIn, checkOut);
      
      expect(dates).toHaveLength(4);
      expect(dates[0].getMonth()).toBe(0); // January
      expect(dates[3].getMonth()).toBe(1); // February
    });

    it("should normalize times to midnight", () => {
      const checkIn = new Date("2024-01-15T10:00:00");
      const checkOut = new Date("2024-01-16T18:30:00");
      const dates = generatePeriodDates(checkIn, checkOut);
      
      expect(dates).toHaveLength(2);
      dates.forEach(date => {
        expect(date.getHours()).toBe(0);
        expect(date.getMinutes()).toBe(0);
        expect(date.getSeconds()).toBe(0);
      });
    });
  });

  describe("isDateInPeriod", () => {
    const checkIn = new Date("2024-01-15");
    const checkOut = new Date("2024-01-17");

    it("should return true for check-in date", () => {
      const result = isDateInPeriod(checkIn, checkIn, checkOut);
      expect(result).toBe(true);
    });

    it("should return true for check-out date", () => {
      const result = isDateInPeriod(checkOut, checkIn, checkOut);
      expect(result).toBe(true);
    });

    it("should return true for middle date", () => {
      const middleDate = new Date("2024-01-16");
      const result = isDateInPeriod(middleDate, checkIn, checkOut);
      expect(result).toBe(true);
    });

    it("should return false for date before period", () => {
      const beforeDate = new Date("2024-01-14");
      const result = isDateInPeriod(beforeDate, checkIn, checkOut);
      expect(result).toBe(false);
    });

    it("should return false for date after period", () => {
      const afterDate = new Date("2024-01-18");
      const result = isDateInPeriod(afterDate, checkIn, checkOut);
      expect(result).toBe(false);
    });

    it("should ignore time components", () => {
      const dateWithTime = new Date("2024-01-16T23:59:59");
      const result = isDateInPeriod(dateWithTime, checkIn, checkOut);
      expect(result).toBe(true);
    });
  });

  describe("formatPeriod", () => {
    it("should format 1-day period", () => {
      const checkIn = new Date("2024-01-15T12:00:00");
      const checkOut = new Date("2024-01-15T12:00:00");
      const formatted = formatPeriod(checkIn, checkOut, 1);
      
      expect(formatted).toContain("/01");
      expect(formatted).toContain("1 diária");
    });

    it("should format 3-day period", () => {
      const checkIn = new Date("2024-01-15T12:00:00");
      const checkOut = new Date("2024-01-17T12:00:00");
      const formatted = formatPeriod(checkIn, checkOut, 3);
      
      expect(formatted).toMatch(/\d{2}\/01/);
      expect(formatted).toContain("3 diárias");
    });

    it("should format multi-day period with plural", () => {
      const checkIn = new Date("2024-01-15T12:00:00");
      const checkOut = new Date("2024-01-21T12:00:00");
      const formatted = formatPeriod(checkIn, checkOut, 7);
      
      expect(formatted).toContain("7 diárias");
    });

    it("should handle cross-month periods", () => {
      const checkIn = new Date("2024-01-30T12:00:00");
      const checkOut = new Date("2024-02-02T12:00:00");
      const formatted = formatPeriod(checkIn, checkOut, 4);
      
      expect(formatted).toContain("/01");
      expect(formatted).toContain("/02");
      expect(formatted).toContain("4 diárias");
    });
  });

  describe("validatePeriod", () => {
    it("should validate correct period", () => {
      const checkIn = new Date("2024-01-15");
      const checkOut = new Date("2024-01-17");
      const result = validatePeriod(checkIn, checkOut);
      
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it("should validate same-day period", () => {
      const date = new Date("2024-01-15");
      const result = validatePeriod(date, date);
      
      expect(result.valid).toBe(true);
    });

    it("should reject check-out before check-in", () => {
      const checkIn = new Date("2024-01-17");
      const checkOut = new Date("2024-01-15");
      const result = validatePeriod(checkIn, checkOut);
      
      expect(result.valid).toBe(false);
      expect(result.error).toContain("posterior");
    });

    it("should reject periods longer than 90 days", () => {
      const checkIn = new Date("2024-01-01");
      const checkOut = new Date("2024-04-15"); // More than 90 days
      const result = validatePeriod(checkIn, checkOut);
      
      expect(result.valid).toBe(false);
      expect(result.error).toContain("90 dias");
    });

    it("should accept exactly 90 days", () => {
      const checkIn = new Date("2024-01-01");
      const checkOut = new Date("2024-03-31"); // Exactly 90 days
      const result = validatePeriod(checkIn, checkOut);
      
      expect(result.valid).toBe(true);
    });

    it("should ignore time components in validation", () => {
      const checkIn = new Date("2024-01-15T23:59:59");
      const checkOut = new Date("2024-01-17T00:00:01");
      const result = validatePeriod(checkIn, checkOut);
      
      expect(result.valid).toBe(true);
    });
  });
});
