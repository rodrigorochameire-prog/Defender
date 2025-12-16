import { describe, it, expect } from "vitest";
import {
  parseDosage,
  parseProgressionRate,
  calculateProgressiveDosage,
  generateDosagePreview,
  hasReachedTarget,
  formatPeriodicity,
} from "./dosageProgression";

describe("dosageProgression", () => {
  describe("parseDosage", () => {
    it("should parse dosage with mg unit", () => {
      const result = parseDosage("10mg");
      expect(result).toEqual({ value: 10, unit: "mg" });
    });

    it("should parse dosage with ml unit", () => {
      const result = parseDosage("1.5ml");
      expect(result).toEqual({ value: 1.5, unit: "ml" });
    });

    it("should parse dosage with comprimidos", () => {
      const result = parseDosage("2 comprimidos");
      expect(result).toEqual({ value: 2, unit: "comprimidos" });
    });

    it("should parse dosage with no unit", () => {
      const result = parseDosage("5");
      expect(result).toEqual({ value: 5, unit: "" });
    });

    it("should throw error for invalid dosage", () => {
      expect(() => parseDosage("invalid")).toThrow("Invalid dosage format");
    });
  });

  describe("parseProgressionRate", () => {
    it("should parse percentage rate", () => {
      const result = parseProgressionRate("10%");
      expect(result).toEqual({ value: 10, isPercentage: true });
    });

    it("should parse absolute rate with unit", () => {
      const result = parseProgressionRate("5mg");
      expect(result).toEqual({ value: 5, isPercentage: false, unit: "mg" });
    });

    it("should parse absolute rate without unit", () => {
      const result = parseProgressionRate("2");
      expect(result).toEqual({ value: 2, isPercentage: false, unit: "" });
    });
  });

  describe("calculateProgressiveDosage", () => {
    it("should return base dosage for stable progression", () => {
      const result = calculateProgressiveDosage("10mg", {
        dosageProgression: "stable",
        progressionRate: "10%",
        progressionInterval: 3,
        currentDoseCount: 10,
      });
      expect(result).toBe("10mg");
    });

    it("should increase dosage with percentage rate", () => {
      const result = calculateProgressiveDosage("10mg", {
        dosageProgression: "increase",
        progressionRate: "10%",
        progressionInterval: 3,
        currentDoseCount: 3, // 1 adjustment
      });
      expect(result).toBe("11mg");
    });

    it("should increase dosage with absolute rate", () => {
      const result = calculateProgressiveDosage("10mg", {
        dosageProgression: "increase",
        progressionRate: "5mg",
        progressionInterval: 2,
        currentDoseCount: 4, // 2 adjustments
      });
      expect(result).toBe("20mg");
    });

    it("should decrease dosage with percentage rate", () => {
      const result = calculateProgressiveDosage("10mg", {
        dosageProgression: "decrease",
        progressionRate: "20%",
        progressionInterval: 3,
        currentDoseCount: 3, // 1 adjustment
      });
      expect(result).toBe("8mg");
    });

    it("should decrease dosage with absolute rate", () => {
      const result = calculateProgressiveDosage("10mg", {
        dosageProgression: "decrease",
        progressionRate: "2mg",
        progressionInterval: 2,
        currentDoseCount: 4, // 2 adjustments
      });
      expect(result).toBe("6mg");
    });

    it("should not go below zero", () => {
      const result = calculateProgressiveDosage("5mg", {
        dosageProgression: "decrease",
        progressionRate: "10mg",
        progressionInterval: 1,
        currentDoseCount: 10,
      });
      expect(result).toBe("0mg");
    });

    it("should stop at target dosage when increasing", () => {
      const result = calculateProgressiveDosage("10mg", {
        dosageProgression: "increase",
        progressionRate: "5mg",
        progressionInterval: 1,
        targetDosage: "20mg",
        currentDoseCount: 10, // Would go to 60mg without target
      });
      expect(result).toBe("20mg");
    });

    it("should stop at target dosage when decreasing", () => {
      const result = calculateProgressiveDosage("20mg", {
        dosageProgression: "decrease",
        progressionRate: "5mg",
        progressionInterval: 1,
        targetDosage: "10mg",
        currentDoseCount: 10, // Would go to -30mg without target
      });
      expect(result).toBe("10mg");
    });

    it("should return base dosage before first adjustment", () => {
      const result = calculateProgressiveDosage("10mg", {
        dosageProgression: "increase",
        progressionRate: "10%",
        progressionInterval: 3,
        currentDoseCount: 2, // Not yet 3 doses
      });
      expect(result).toBe("10mg");
    });

    it("should handle multiple adjustments correctly", () => {
      const result = calculateProgressiveDosage("10mg", {
        dosageProgression: "increase",
        progressionRate: "10%",
        progressionInterval: 3,
        currentDoseCount: 9, // 3 adjustments
      });
      expect(result).toBe("13mg");
    });
  });

  describe("generateDosagePreview", () => {
    it("should generate preview of next doses", () => {
      const preview = generateDosagePreview(
        "10mg",
        {
          dosageProgression: "increase",
          progressionRate: "5mg",
          progressionInterval: 2,
          currentDoseCount: 0,
        },
        5
      );

      expect(preview).toHaveLength(5);
      expect(preview[0]).toEqual({ doseNumber: 1, dosage: "10mg" });
      expect(preview[1]).toEqual({ doseNumber: 2, dosage: "10mg" });
      expect(preview[2]).toEqual({ doseNumber: 3, dosage: "15mg" }); // First adjustment at dose 3
      expect(preview[3]).toEqual({ doseNumber: 4, dosage: "15mg" });
      expect(preview[4]).toEqual({ doseNumber: 5, dosage: "20mg" }); // Second adjustment at dose 5
    });

    it("should generate preview with target limit", () => {
      const preview = generateDosagePreview(
        "10mg",
        {
          dosageProgression: "increase",
          progressionRate: "10mg",
          progressionInterval: 1,
          targetDosage: "25mg",
          currentDoseCount: 0,
        },
        5
      );

      expect(preview[0]).toEqual({ doseNumber: 1, dosage: "10mg" });
      expect(preview[1]).toEqual({ doseNumber: 2, dosage: "20mg" });
      expect(preview[2]).toEqual({ doseNumber: 3, dosage: "25mg" }); // Capped at target
      expect(preview[3]).toEqual({ doseNumber: 4, dosage: "25mg" });
      expect(preview[4]).toEqual({ doseNumber: 5, dosage: "25mg" });
    });
  });

  describe("hasReachedTarget", () => {
    it("should return false when no target is set", () => {
      const result = hasReachedTarget("10mg", {
        dosageProgression: "increase",
        progressionRate: "5mg",
        progressionInterval: 1,
        currentDoseCount: 10,
      });
      expect(result).toBe(false);
    });

    it("should return false for stable progression", () => {
      const result = hasReachedTarget("10mg", {
        dosageProgression: "stable",
        progressionRate: "5mg",
        progressionInterval: 1,
        targetDosage: "20mg",
        currentDoseCount: 10,
      });
      expect(result).toBe(false);
    });

    it("should return true when target is reached (increase)", () => {
      const result = hasReachedTarget("10mg", {
        dosageProgression: "increase",
        progressionRate: "5mg",
        progressionInterval: 1,
        targetDosage: "20mg",
        currentDoseCount: 2, // 10 + 5*2 = 20
      });
      expect(result).toBe(true);
    });

    it("should return true when target is reached (decrease)", () => {
      const result = hasReachedTarget("20mg", {
        dosageProgression: "decrease",
        progressionRate: "5mg",
        progressionInterval: 1,
        targetDosage: "10mg",
        currentDoseCount: 2, // 20 - 5*2 = 10
      });
      expect(result).toBe(true);
    });

    it("should return false when target not yet reached", () => {
      const result = hasReachedTarget("10mg", {
        dosageProgression: "increase",
        progressionRate: "5mg",
        progressionInterval: 1,
        targetDosage: "20mg",
        currentDoseCount: 1, // 10 + 5*1 = 15 < 20
      });
      expect(result).toBe(false);
    });
  });

  describe("formatPeriodicity", () => {
    it("should format daily periodicity", () => {
      const result = formatPeriodicity("daily");
      expect(result).toBe("Diária");
    });

    it("should format weekly periodicity without days", () => {
      const result = formatPeriodicity("weekly");
      expect(result).toBe("Semanal");
    });

    it("should format weekly periodicity with specific days", () => {
      const result = formatPeriodicity("weekly", undefined, JSON.stringify([1, 3, 5]));
      expect(result).toBe("Semanal: Seg, Qua, Sex");
    });

    it("should format monthly periodicity without days", () => {
      const result = formatPeriodicity("monthly");
      expect(result).toBe("Mensal");
    });

    it("should format monthly periodicity with specific days", () => {
      const result = formatPeriodicity("monthly", undefined, undefined, JSON.stringify([1, 15, 30]));
      expect(result).toBe("Mensal: dias 1, 15, 30");
    });

    it("should format custom periodicity", () => {
      const result = formatPeriodicity("custom", 7);
      expect(result).toBe("A cada 7 dias");
    });

    it("should format custom periodicity without interval", () => {
      const result = formatPeriodicity("custom");
      expect(result).toBe("Personalizada");
    });
  });
});
