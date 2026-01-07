import { describe, it, expect, beforeAll } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createTestContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role: "admin",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: {} as any,
    res: {
      cookie: () => {},
      clearCookie: () => {},
    } as any,
  };
}

describe("Calendar Events", () => {
  let testPetId: number;
  let testEventId: number;
  const ctx = createTestContext();
  const caller = appRouter.createCaller(ctx);

  beforeAll(async () => {
    // Create a test pet for calendar events
    const pet = await caller.pets.create({
      name: "Test Pet for Calendar",
      breed: "Test Breed",
      birthDate: new Date("2020-01-01"),
      weight: 5,
    });
    testPetId = pet.id;
  });

  it("should create a general event", async () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    const result = await caller.calendar.add({
      title: "Evento Geral de Teste",
      description: "Descrição do evento",
      eventDate: tomorrow,
      eventType: "general",
      isAllDay: true,
    });

    expect(result).toBeDefined();
    expect(result.id).toBeGreaterThan(0);
    testEventId = result.id;
  });

  it("should create a holiday event", async () => {
    const holidayDate = new Date("2025-12-25");

    const result = await caller.calendar.add({
      title: "Natal",
      description: "Feriado de Natal",
      eventDate: holidayDate,
      eventType: "holiday",
      isAllDay: true,
    });

    expect(result).toBeDefined();
    expect(result.id).toBeGreaterThan(0);
  });

  it("should create a closure event", async () => {
    const closureDate = new Date("2025-01-01");

    const result = await caller.calendar.add({
      title: "Fechamento - Ano Novo",
      description: "Creche fechada para feriado",
      eventDate: closureDate,
      eventType: "closure",
      location: "TucoCare",
      isAllDay: true,
    });

    expect(result).toBeDefined();
    expect(result.id).toBeGreaterThan(0);
  });

  it("should create a vaccination event for a pet", async () => {
    const vaccineDate = new Date();
    vaccineDate.setDate(vaccineDate.getDate() + 7);

    const result = await caller.calendar.add({
      title: "Vacinação Antirrábica",
      description: "Vacina anual",
      eventDate: vaccineDate,
      eventType: "vaccination",
      petId: testPetId,
      location: "Clínica Veterinária",
      isAllDay: false,
    });

    expect(result).toBeDefined();
    expect(result.id).toBeGreaterThan(0);
  });

  it("should create a medical event for a pet", async () => {
    const medicalDate = new Date();
    medicalDate.setDate(medicalDate.getDate() + 3);

    const result = await caller.calendar.add({
      title: "Consulta Veterinária",
      description: "Check-up de rotina",
      eventDate: medicalDate,
      eventType: "medical",
      petId: testPetId,
      location: "Clínica Pet Care",
      isAllDay: false,
    });

    expect(result).toBeDefined();
    expect(result.id).toBeGreaterThan(0);
  });

  it("should create a medication event for a pet", async () => {
    const medicationDate = new Date();
    medicationDate.setDate(medicationDate.getDate() + 1);

    const result = await caller.calendar.add({
      title: "Administrar Antibiótico",
      description: "Dose matinal",
      eventDate: medicationDate,
      eventType: "medication",
      petId: testPetId,
      isAllDay: false,
    });

    expect(result).toBeDefined();
    expect(result.id).toBeGreaterThan(0);
  });

  it("should get events in date range", async () => {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7);

    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 30);

    const events = await caller.calendar.getEvents({
      startDate,
      endDate,
    });

    expect(events).toBeDefined();
    expect(Array.isArray(events)).toBe(true);
    expect(events.length).toBeGreaterThan(0);
  });

  it("should get events for a specific pet", async () => {
    const events = await caller.calendar.getPetEvents({ petId: testPetId });

    expect(events).toBeDefined();
    expect(Array.isArray(events)).toBe(true);
    expect(events.length).toBeGreaterThan(0);
    
    // All events should be for the test pet
    events.forEach((event: any) => {
      expect(event.petId).toBe(testPetId);
    });
  });

  it("should update an event", async () => {
    const result = await caller.calendar.update({
      id: testEventId,
      title: "Evento Atualizado",
      description: "Descrição atualizada",
      location: "Novo Local",
    });

    expect(result).toBeDefined();
    expect(result.success).toBe(true);
  });

  it("should create an event with end date", async () => {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() + 10);

    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 2);

    const result = await caller.calendar.add({
      title: "Evento de Múltiplos Dias",
      description: "Evento que dura 3 dias",
      eventDate: startDate,
      endDate: endDate,
      eventType: "general",
      isAllDay: true,
    });

    expect(result).toBeDefined();
    expect(result.id).toBeGreaterThan(0);
  });

  it("should create an event with specific time (not all day)", async () => {
    const eventDate = new Date();
    eventDate.setDate(eventDate.getDate() + 5);
    eventDate.setHours(14, 30, 0, 0); // 14:30

    const result = await caller.calendar.add({
      title: "Reunião às 14:30",
      eventDate: eventDate,
      eventType: "general",
      isAllDay: false,
    });

    expect(result).toBeDefined();
    expect(result.id).toBeGreaterThan(0);
  });

  it("should handle different event types", async () => {
    const eventTypes = ["holiday", "medical", "general", "vaccination", "medication", "closure"] as const;
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    for (const eventType of eventTypes) {
      const result = await caller.calendar.add({
        title: `Teste ${eventType}`,
        eventDate: tomorrow,
        eventType,
        petId: ["vaccination", "medication", "medical"].includes(eventType) ? testPetId : undefined,
        isAllDay: true,
      });
      expect(result.id).toBeGreaterThan(0);
    }
  });

  it("should delete an event", async () => {
    const result = await caller.calendar.delete({
      id: testEventId,
      title: "Evento Atualizado",
    });

    expect(result).toBeDefined();
    expect(result.success).toBe(true);
  });
});
