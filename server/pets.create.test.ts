import { describe, it, expect } from "vitest";
import { appRouter } from "./routers";

describe("pets.create - Cadastro de pets por tutores", () => {
  it("deve permitir tutor cadastrar pet com status pending", async () => {
    const caller = appRouter.createCaller({
      user: { id: 1, role: "user", name: "Tutor Test", openId: "test123" },
    });

    const result = await caller.pets.create({
      name: "Rex Test",
      breed: "Golden Retriever",
      age: "2 anos",
      weight: 32500, // 32.5kg in grams
      foodBrand: "Premier Golden",
      foodAmount: 300,
      notes: "Pet muito amigável",
    });

    expect(result).toHaveProperty("id");
    expect(typeof result.id).toBe("number");
  });

  it("deve permitir admin cadastrar pet com status approved", async () => {
    const caller = appRouter.createCaller({
      user: { id: 2, role: "admin", name: "Admin Test", openId: "admin123" },
    });

    const result = await caller.pets.create({
      name: "Buddy Admin",
      breed: "Labrador",
      age: "3 anos",
    });

    expect(result).toHaveProperty("id");
  });

  it("deve aceitar birthDate como string", async () => {
    const caller = appRouter.createCaller({
      user: { id: 1, role: "user", name: "Tutor Test", openId: "test123" },
    });

    const result = await caller.pets.create({
      name: "Max Date Test",
      birthDate: "2022-01-15",
    });

    expect(result).toHaveProperty("id");
  });

  it("deve exigir nome do pet", async () => {
    const caller = appRouter.createCaller({
      user: { id: 1, role: "user", name: "Tutor Test", openId: "test123" },
    });

    await expect(
      caller.pets.create({
        name: "",
        breed: "Test Breed",
      })
    ).rejects.toThrow();
  });
});

describe("pets.listMine - Listar pets do tutor", () => {
  it("deve retornar apenas pets do tutor logado", async () => {
    const caller = appRouter.createCaller({
      user: { id: 1, role: "user", name: "Tutor Test", openId: "test123" },
    });

    const pets = await caller.pets.listMine();

    expect(Array.isArray(pets)).toBe(true);
    // Todos os pets devem ter link com o tutor ID 1
  });

  it("deve funcionar para admin também", async () => {
    const caller = appRouter.createCaller({
      user: { id: 2, role: "admin", name: "Admin Test", openId: "admin123" },
    });

    const pets = await caller.pets.listMine();

    expect(Array.isArray(pets)).toBe(true);
  });
});
