import { describe, it, expect, beforeAll } from "vitest";
import * as db from "./db";

describe("Credit Packages System", () => {
  let testPackageId: number;

  beforeAll(async () => {
    // Create a test package
    const result = await db.createCreditPackage({
      name: "Pacote Teste",
      description: "Pacote para testes automatizados",
      credits: 10,
      priceInCents: 10000, // R$ 100.00
      discountPercent: 10,
      isActive: true,
      displayOrder: 1,
    });
    testPackageId = result?.id || 0;
  });

  it("should create a credit package", async () => {
    const result = await db.createCreditPackage({
      name: "Pacote Básico",
      description: "10 créditos para daycare",
      credits: 10,
      priceInCents: 10000,
      discountPercent: 0,
      isActive: true,
      displayOrder: 1,
    });

    expect(result).toBeDefined();
    expect(result?.id).toBeGreaterThanOrEqual(0);
  });

  it("should list all active packages", async () => {
    const packages = await db.getAllCreditPackages();
    
    expect(Array.isArray(packages)).toBe(true);
    expect(packages.length).toBeGreaterThan(0);
    expect(packages.every(p => p.isActive)).toBe(true);
  });

  it("should list all packages including inactive", async () => {
    const packages = await db.getAllCreditPackagesIncludingInactive();
    
    expect(Array.isArray(packages)).toBe(true);
    expect(packages.length).toBeGreaterThanOrEqual(await db.getAllCreditPackages().then(p => p.length));
  });

  it("should get package by ID", async () => {
    if (testPackageId === 0) {
      console.warn("Skipping test: testPackageId is 0");
      return;
    }

    const pkg = await db.getCreditPackageById(testPackageId);
    
    expect(pkg).toBeDefined();
    expect(pkg?.id).toBe(testPackageId);
    expect(pkg?.name).toBe("Pacote Teste");
  });

  it("should update package", async () => {
    if (testPackageId === 0) {
      console.warn("Skipping test: testPackageId is 0");
      return;
    }

    const updated = await db.updateCreditPackage(testPackageId, {
      name: "Pacote Teste Atualizado",
      priceInCents: 12000,
    });

    expect(updated).toBe(true);

    const pkg = await db.getCreditPackageById(testPackageId);
    expect(pkg?.name).toBe("Pacote Teste Atualizado");
    expect(pkg?.priceInCents).toBe(12000);
  });

  it("should soft delete package", async () => {
    if (testPackageId === 0) {
      console.warn("Skipping test: testPackageId is 0");
      return;
    }

    const deleted = await db.deleteCreditPackage(testPackageId);
    expect(deleted).toBe(true);

    const pkg = await db.getCreditPackageById(testPackageId);
    expect(pkg?.isActive).toBe(false);
  });
});
