import { z } from "zod";
import { router, adminProcedure, protectedProcedure } from "../init";
import { db, pets, calendarEvents } from "@/lib/db";
import { eq } from "drizzle-orm";
import { safeAsync, Errors } from "@/lib/errors";
import { debitCredits, hasCredits } from "@/lib/services/credit-engine";

export const checkinRouter = router({
  /**
   * Faz check-in de um pet
   * Usa Credit Engine para débito atômico de créditos com registro de transação
   */
  checkIn: adminProcedure
    .input(z.object({ 
      petId: z.number(),
      skipCreditCheck: z.boolean().optional(), // Para bypass em casos especiais
    }))
    .mutation(async ({ ctx, input }) => {
      return safeAsync(async () => {
        const pet = await db.query.pets.findFirst({
          where: eq(pets.id, input.petId),
        });

        if (!pet) {
          throw Errors.notFound("Pet");
        }

        if (pet.status === "checked-in") {
          throw Errors.badRequest("Pet já está na creche");
        }

        // Verificar créditos (a menos que seja bypass)
        if (!input.skipCreditCheck) {
          const hasEnoughCredits = await hasCredits(input.petId, 1);
          if (!hasEnoughCredits) {
            throw Errors.badRequest("Pet sem créditos disponíveis");
          }
        }

        // Criar evento de check-in primeiro
        const [calendarEvent] = await db.insert(calendarEvents).values({
          title: `Check-in: ${pet.name}`,
          eventDate: new Date(),
          eventType: "checkin",
          petId: input.petId,
          isAllDay: false,
          status: "completed",
          createdById: ctx.user!.id,
        }).returning();

        // Debitar crédito usando Credit Engine (operação atômica)
        if (!input.skipCreditCheck) {
          const debitResult = await debitCredits(
            input.petId,
            1,
            ctx.user!.id,
            {
              type: "checkin",
              eventId: calendarEvent.id,
              description: `Check-in na creche - ${new Date().toLocaleDateString("pt-BR")}`,
            }
          );

          if (!debitResult.success) {
            // Rollback do evento de calendário
            await db.delete(calendarEvents).where(eq(calendarEvents.id, calendarEvent.id));
            throw Errors.badRequest(debitResult.error || "Erro ao debitar créditos");
          }
        }

        // Atualizar status do pet
        const [updatedPet] = await db
          .update(pets)
          .set({
            status: "checked-in",
            updatedAt: new Date(),
          })
          .where(eq(pets.id, input.petId))
          .returning();

        return updatedPet;
      }, "Erro ao fazer check-in");
    }),

  /**
   * Faz check-out de um pet
   * Registra evento de calendário e pode calcular tempo de permanência
   */
  checkOut: adminProcedure
    .input(z.object({ 
      petId: z.number(),
      notes: z.string().max(500).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      return safeAsync(async () => {
        const pet = await db.query.pets.findFirst({
          where: eq(pets.id, input.petId),
        });

        if (!pet) {
          throw Errors.notFound("Pet");
        }

        if (pet.status !== "checked-in") {
          throw Errors.badRequest("Pet não está na creche");
        }

        // Buscar evento de check-in correspondente para calcular tempo
        const lastCheckin = await db.query.calendarEvents.findFirst({
          where: eq(calendarEvents.petId, input.petId),
          orderBy: (c, { desc }) => [desc(c.eventDate)],
        });

        let stayDuration: number | null = null;
        if (lastCheckin && lastCheckin.eventType === "checkin") {
          const checkinTime = new Date(lastCheckin.eventDate);
          const checkoutTime = new Date();
          stayDuration = Math.round((checkoutTime.getTime() - checkinTime.getTime()) / (1000 * 60)); // em minutos
        }

        // Atualizar status
        const [updatedPet] = await db
          .update(pets)
          .set({
            status: "active",
            updatedAt: new Date(),
          })
          .where(eq(pets.id, input.petId))
          .returning();

        // Criar evento de check-out no calendário
        await db.insert(calendarEvents).values({
          title: `Check-out: ${pet.name}`,
          eventDate: new Date(),
          eventType: "checkout",
          petId: input.petId,
          isAllDay: false,
          status: "completed",
          description: input.notes || (stayDuration 
            ? `Permanência: ${Math.floor(stayDuration / 60)}h${stayDuration % 60}min`
            : undefined),
          createdById: ctx.user!.id,
        });

        return {
          ...updatedPet,
          stayDurationMinutes: stayDuration,
        };
      }, "Erro ao fazer check-out");
    }),

  /**
   * Lista pets na creche
   */
  list: protectedProcedure.query(async () => {
    return safeAsync(async () => {
      const result = await db
        .select()
        .from(pets)
        .where(eq(pets.status, "checked-in"))
        .orderBy(pets.name);

      return result;
    }, "Erro ao listar pets na creche");
  }),

  /**
   * Status de check-in de um pet com informações adicionais
   */
  status: protectedProcedure
    .input(z.object({ petId: z.number() }))
    .query(async ({ input }) => {
      return safeAsync(async () => {
        const pet = await db.query.pets.findFirst({
          where: eq(pets.id, input.petId),
        });

        if (!pet) {
          throw Errors.notFound("Pet");
        }

        // Buscar último evento para calcular tempo na creche
        let currentStayMinutes: number | null = null;
        if (pet.status === "checked-in") {
          const lastCheckin = await db.query.calendarEvents.findFirst({
            where: eq(calendarEvents.petId, input.petId),
            orderBy: (c, { desc }) => [desc(c.eventDate)],
          });

          if (lastCheckin && lastCheckin.eventType === "checkin") {
            const checkinTime = new Date(lastCheckin.eventDate);
            currentStayMinutes = Math.round((Date.now() - checkinTime.getTime()) / (1000 * 60));
          }
        }

        return {
          petId: pet.id,
          name: pet.name,
          status: pet.status,
          credits: pet.credits || 0,
          isCheckedIn: pet.status === "checked-in",
          currentStayMinutes,
          hasCredits: (pet.credits || 0) > 0,
          lowCredits: (pet.credits || 0) > 0 && (pet.credits || 0) <= 3,
        };
      }, "Erro ao buscar status do pet");
    }),
});
