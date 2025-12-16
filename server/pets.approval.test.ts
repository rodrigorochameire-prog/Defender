import { describe, it, expect, beforeAll } from "vitest";
import { appRouter } from "./routers";
import { getDb } from "./db";
import type { User } from "./_core/context";

describe("Pet Approval & Edit Flow", () => {
  let adminContext: { user: User };
  let tutorContext: { user: User };
  let testPetId: number;

  beforeAll(async () => {
    // Use mock users for testing
    const adminUser: User = {
      id: 999,
      openId: "test-admin-approval",
      name: "Admin Test",
      email: null,
      loginMethod: null,
      role: "admin",
      phone: null,
      stripeCustomerId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    };

    const tutorUser: User = {
      id: 998,
      openId: "test-tutor-approval",
      name: "Tutor Test",
      email: null,
      loginMethod: null,
      role: "user",
      phone: null,
      stripeCustomerId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    };

    adminContext = { user: adminUser };
    tutorContext = { user: tutorUser };
  });

  it("should allow tutor to create pet with pending status", async () => {
    const caller = appRouter.createCaller(tutorContext);
    const result = await caller.pets.create({
      name: "Test Pet for Approval",
      breed: "Golden Retriever",
      age: "2 anos",
      weight: 30000,
    });

    expect(result).toHaveProperty("id");
    testPetId = result.id;

    // Check pet status is pending
    const pets = await caller.pets.listMine();
    const createdPet = pets.find((p: any) => p.id === testPetId);
    expect(createdPet?.approvalStatus).toBe("pending");
  });

  it("should list pending pets for admin", async () => {
    const caller = appRouter.createCaller(adminContext);
    const pendingPets = await caller.pets.listPending();

    const testPet = pendingPets.find((p: any) => p.id === testPetId);
    expect(testPet).toBeDefined();
    expect(testPet?.name).toBe("Test Pet for Approval");
  });

  it("should allow tutor to edit pending pet", async () => {
    const caller = appRouter.createCaller(tutorContext);
    
    const result = await caller.pets.updateMine({
      id: testPetId,
      name: "Updated Test Pet",
      breed: "Labrador",
    });

    expect(result.success).toBe(true);

    // Verify update
    const pets = await caller.pets.listMine();
    const updatedPet = pets.find((p: any) => p.id === testPetId);
    expect(updatedPet?.name).toBe("Updated Test Pet");
    expect(updatedPet?.breed).toBe("Labrador");
    expect(updatedPet?.approvalStatus).toBe("pending");
  });

  it("should allow admin to approve pet", async () => {
    const caller = appRouter.createCaller(adminContext);
    
    const result = await caller.pets.approve({ petId: testPetId });
    expect(result.success).toBe(true);

    // Verify approval by checking tutor's pets
    const tutorCaller = appRouter.createCaller(tutorContext);
    const tutorPets = await tutorCaller.pets.listMine();
    const approvedPet = tutorPets.find((p: any) => p.id === testPetId);
    expect(approvedPet?.approvalStatus).toBe("approved");
  });

  it("should NOT allow tutor to edit approved pet", async () => {
    const caller = appRouter.createCaller(tutorContext);
    
    await expect(
      caller.pets.updateMine({
        id: testPetId,
        name: "Should Fail",
      })
    ).rejects.toThrow("Pets aprovados não podem ser editados");
  });

  it("should allow admin to reject pet", async () => {
    // Create another pet to test rejection
    const tutorCaller = appRouter.createCaller(tutorContext);
    const newPet = await tutorCaller.pets.create({
      name: "Pet to Reject",
      breed: "Poodle",
    });

    const adminCaller = appRouter.createCaller(adminContext);
    const result = await adminCaller.pets.reject({ petId: newPet.id });
    expect(result.success).toBe(true);

    // Verify rejection by checking tutor's pets
    const tutorPets = await tutorCaller.pets.listMine();
    const rejectedPet = tutorPets.find((p: any) => p.id === newPet.id);
    expect(rejectedPet?.approvalStatus).toBe("rejected");
  });

  it("should allow tutor to edit rejected pet", async () => {
    // Find the rejected pet
    const tutorCaller = appRouter.createCaller(tutorContext);
    const pets = await tutorCaller.pets.listMine();
    const rejectedPet = pets.find((p: any) => p.approvalStatus === "rejected");

    expect(rejectedPet).toBeDefined();

    const result = await tutorCaller.pets.updateMine({
      id: rejectedPet!.id,
      name: "Fixed Pet",
    });

    expect(result.success).toBe(true);

    // Verify it's back to pending after edit
    const updatedPets = await tutorCaller.pets.listMine();
    const updatedPet = updatedPets.find((p: any) => p.id === rejectedPet!.id);
    expect(updatedPet?.approvalStatus).toBe("pending");
  });

  it("should NOT allow tutor to edit another tutor's pet", async () => {
    // Create another tutor context
    const anotherTutor: User = {
      id: 997,
      openId: "test-tutor-2-approval",
      name: "Another Tutor",
      email: null,
      loginMethod: null,
      role: "user",
      phone: null,
      stripeCustomerId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    };

    const anotherContext = { user: anotherTutor };
    const caller = appRouter.createCaller(anotherContext);

    await expect(
      caller.pets.updateMine({
        id: testPetId,
        name: "Hacked Pet",
      })
    ).rejects.toThrow("Voc\u00ea n\u00e3o tem permiss\u00e3o para editar este pet");
  });
});
