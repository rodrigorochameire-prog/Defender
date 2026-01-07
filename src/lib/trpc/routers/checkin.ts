import { z } from "zod";
import { router, adminProcedure, protectedProcedure } from "../init";
import { db, pets, calendarEvents } from "@/lib/db";
import { eq } from "drizzle-orm";
import { safeAsync, Errors } from "@/lib/errors";

export const checkinRouter = router({
  /**
   * Faz check-in de um pet
   */
  checkIn: adminProcedure
    .input(z.object({ petId: z.number() }))
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

        // Verificar créditos
        if ((pet.credits || 0) <= 0) {
          throw Errors.badRequest("Pet sem créditos disponíveis");
        }

        // Atualizar status e consumir crédito
        const [updatedPet] = await db
          .update(pets)
          .set({
            status: "checked-in",
            credits: (pet.credits || 0) - 1,
            updatedAt: new Date(),
          })
          .where(eq(pets.id, input.petId))
          .returning();

        // Criar evento no calendário
        await db.insert(calendarEvents).values({
          title: `Check-in: ${pet.name}`,
          eventDate: new Date(),
          eventType: "checkin",
          petId: input.petId,
          isAllDay: false,
          createdById: ctx.user!.id,
        });

        return updatedPet;
      }, "Erro ao fazer check-in");
    }),

  /**
   * Faz check-out de um pet
   */
  checkOut: adminProcedure
    .input(z.object({ petId: z.number() }))
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

        // Atualizar status
        const [updatedPet] = await db
          .update(pets)
          .set({
            status: "active",
            updatedAt: new Date(),
          })
          .where(eq(pets.id, input.petId))
          .returning();

        // Criar evento no calendário
        await db.insert(calendarEvents).values({
          title: `Check-out: ${pet.name}`,
          eventDate: new Date(),
          eventType: "checkout",
          petId: input.petId,
          isAllDay: false,
          createdById: ctx.user!.id,
        });

        return updatedPet;
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
   * Status de check-in de um pet
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

        return {
          petId: pet.id,
          name: pet.name,
          status: pet.status,
          credits: pet.credits || 0,
          isCheckedIn: pet.status === "checked-in",
        };
      }, "Erro ao buscar status do pet");
    }),
});
