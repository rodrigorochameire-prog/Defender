import { describe, it, expect } from "vitest";
import { convertToCSV, convertToExcel, formatPetsForExport, formatLogsForExport } from "./exportUtils";

describe("exportUtils", () => {
  describe("convertToCSV", () => {
    it("should convert array of objects to CSV", () => {
      const data = [
        { name: "Rex", breed: "Golden", age: "3" },
        { name: "Max", breed: "Poodle", age: "2" },
      ];
      const csv = convertToCSV(data);
      expect(csv).toContain("name,breed,age");
      expect(csv).toContain("Rex,Golden,3");
      expect(csv).toContain("Max,Poodle,2");
    });

    it("should handle empty array", () => {
      const csv = convertToCSV([]);
      expect(csv).toBe("");
    });

    it("should escape commas in values", () => {
      const data = [{ name: "Rex, the dog", breed: "Golden" }];
      const csv = convertToCSV(data);
      expect(csv).toContain('"Rex, the dog"');
    });

    it("should handle null and undefined values", () => {
      const data = [{ name: "Rex", breed: null, age: undefined }];
      const csv = convertToCSV(data);
      expect(csv).toContain("Rex,,");
    });
  });

  describe("convertToExcel", () => {
    it("should convert array of objects to TSV", () => {
      const data = [
        { name: "Rex", breed: "Golden", age: "3" },
        { name: "Max", breed: "Poodle", age: "2" },
      ];
      const excel = convertToExcel(data);
      expect(excel).toContain("name\tbreed\tage");
      expect(excel).toContain("Rex\tGolden\t3");
      expect(excel).toContain("Max\tPoodle\t2");
    });

    it("should handle empty array", () => {
      const excel = convertToExcel([]);
      expect(excel).toBe("");
    });
  });

  describe("formatPetsForExport", () => {
    it("should format pets data correctly", () => {
      const pets = [
        {
          id: 1,
          name: "Rex",
          breed: "Golden Retriever",
          age: "3 anos",
          weight: 32500,
          status: "checked-in" as const,
          foodBrand: "Royal Canin",
          foodAmount: 300,
          notes: null,
          birthDate: null,
          photoUrl: null,
          photoKey: null,
          checkInTime: null,
          checkOutTime: null,
          credits: 10,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];
      const formatted = formatPetsForExport(pets);
      expect(formatted[0]).toEqual({
        Nome: "Rex",
        Raça: "Golden Retriever",
        Idade: "3 anos",
        Peso: "32.5 kg",
        Status: "Na Creche",
        "Marca de Ração": "Royal Canin",
        "Quantidade Diária": "300g",
      });
    });

    it("should handle missing optional fields", () => {
      const pets = [
        {
          id: 1,
          name: "Max",
          breed: null,
          age: null,
          weight: null,
          status: "checked-out" as const,
          foodBrand: null,
          foodAmount: null,
          notes: null,
          birthDate: null,
          photoUrl: null,
          photoKey: null,
          checkInTime: null,
          checkOutTime: null,
          credits: 5,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];
      const formatted = formatPetsForExport(pets);
      expect(formatted[0]).toEqual({
        Nome: "Max",
        Raça: "-",
        Idade: "-",
        Peso: "-",
        Status: "Fora da Creche",
        "Marca de Ração": "-",
        "Quantidade Diária": "-",
      });
    });
  });

  describe("formatLogsForExport", () => {
    it("should format logs data correctly", () => {
      const logs = [
        {
          id: 1,
          petId: 1,
          logDate: new Date("2024-01-15"),
          source: "daycare" as const,
          mood: "feliz",
          stool: "normal",
          appetite: "bom",
          activities: "Brincou muito",
          notes: "Dia ótimo",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];
      const pets = [
        {
          id: 1,
          name: "Rex",
          breed: "Golden",
          age: null,
          weight: null,
          status: "checked-in" as const,
          foodBrand: null,
          foodAmount: null,
          notes: null,
          birthDate: null,
          photoUrl: null,
          photoKey: null,
          checkInTime: null,
          checkOutTime: null,
          credits: 10,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];
      const formatted = formatLogsForExport(logs, pets);
      expect(formatted[0].Pet).toBe("Rex");
      expect(formatted[0].Origem).toBe("Creche");
      expect(formatted[0].Humor).toBe("feliz");
      expect(formatted[0].Fezes).toBe("normal");
    });

    it("should handle missing pet reference", () => {
      const logs = [
        {
          id: 1,
          petId: 999,
          logDate: new Date(),
          source: "home" as const,
          mood: "calmo",
          stool: null,
          appetite: null,
          activities: null,
          notes: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];
      const formatted = formatLogsForExport(logs, []);
      expect(formatted[0].Pet).toBe("-");
      expect(formatted[0].Origem).toBe("Casa");
    });
  });
});
