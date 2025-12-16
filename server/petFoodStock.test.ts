import { describe, it, expect, beforeEach } from "vitest";
import { calculateStockDuration, calculateRestockDate } from "./db";

describe("Pet Food Stock - Calculations", () => {
  describe("calculateStockDuration", () => {
    it("should calculate days remaining correctly", () => {
      // 15kg stock, 300g daily consumption = 50 days
      const days = calculateStockDuration(15000, 300);
      expect(days).toBe(50);
    });

    it("should handle exact division", () => {
      // 10kg stock, 500g daily consumption = 20 days
      const days = calculateStockDuration(10000, 500);
      expect(days).toBe(20);
    });

    it("should floor partial days", () => {
      // 10kg stock, 333g daily consumption = 30.03 days -> 30
      const days = calculateStockDuration(10000, 333);
      expect(days).toBe(30);
    });

    it("should return 0 for zero consumption", () => {
      const days = calculateStockDuration(10000, 0);
      expect(days).toBe(0);
    });

    it("should return 0 for negative consumption", () => {
      const days = calculateStockDuration(10000, -100);
      expect(days).toBe(0);
    });

    it("should handle very low stock", () => {
      // 500g stock, 300g daily consumption = 1 day
      const days = calculateStockDuration(500, 300);
      expect(days).toBe(1);
    });

    it("should handle large stock", () => {
      // 100kg stock, 200g daily consumption = 500 days
      const days = calculateStockDuration(100000, 200);
      expect(days).toBe(500);
    });
  });

  describe("calculateRestockDate", () => {
    it("should calculate restock date with 15 day threshold", () => {
      const now = new Date();
      // 15kg stock, 300g daily = 50 days remaining
      // Alert threshold 15 days -> restock in 35 days
      const restockDate = calculateRestockDate(15000, 300, 15);
      
      const expectedDate = new Date(now);
      expectedDate.setDate(expectedDate.getDate() + 35);
      
      // Compare dates (ignore time)
      expect(restockDate.toDateString()).toBe(expectedDate.toDateString());
    });

    it("should return today if stock is below threshold", () => {
      const now = new Date();
      // 3kg stock, 300g daily = 10 days remaining
      // Alert threshold 15 days -> restock NOW (0 days)
      const restockDate = calculateRestockDate(3000, 300, 15);
      
      expect(restockDate.toDateString()).toBe(now.toDateString());
    });

    it("should handle exact threshold match", () => {
      const now = new Date();
      // 4.5kg stock, 300g daily = 15 days remaining
      // Alert threshold 15 days -> restock NOW (0 days)
      const restockDate = calculateRestockDate(4500, 300, 15);
      
      expect(restockDate.toDateString()).toBe(now.toDateString());
    });

    it("should handle custom threshold (30 days)", () => {
      const now = new Date();
      // 20kg stock, 400g daily = 50 days remaining
      // Alert threshold 30 days -> restock in 20 days
      const restockDate = calculateRestockDate(20000, 400, 30);
      
      const expectedDate = new Date(now);
      expectedDate.setDate(expectedDate.getDate() + 20);
      
      expect(restockDate.toDateString()).toBe(expectedDate.toDateString());
    });

    it("should handle low threshold (5 days)", () => {
      const now = new Date();
      // 10kg stock, 500g daily = 20 days remaining
      // Alert threshold 5 days -> restock in 15 days
      const restockDate = calculateRestockDate(10000, 500, 5);
      
      const expectedDate = new Date(now);
      expectedDate.setDate(expectedDate.getDate() + 15);
      
      expect(restockDate.toDateString()).toBe(expectedDate.toDateString());
    });
  });
});
