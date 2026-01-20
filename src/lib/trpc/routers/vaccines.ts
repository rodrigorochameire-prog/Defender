import { z } from "zod";
import { router, protectedProcedure, adminProcedure } from "../init";
import { db, vaccineLibrary, petVaccinations, pets } from "@/lib/db";
import { eq, and, desc, gte, lte, sql } from "drizzle-orm";
import { safeAsync } from "@/lib/errors";

export const vaccinesRouter = router({
  /**
   * Lista biblioteca de vacinas
   */
  library: protectedProcedure.query(async () => {
    return safeAsync(async () => {
      return await db
        .select()
        .from(vaccineLibrary)
        .orderBy(vaccineLibrary.name);
    }, "Erro ao buscar vacinas");
  }),

  /**
   * Adiciona vacina à biblioteca (admin)
   */
  addToLibrary: adminProcedure
    .input(
      z.object({
        name: z.string().min(1).max(200),
        description: z.string().optional(),
        intervalDays: z.number().int().min(1).optional(),
        dosesRequired: z.number().int().min(1).default(1),
      })
    )
    .mutation(async ({ input }) => {
      return safeAsync(async () => {
        const [vaccine] = await db
          .insert(vaccineLibrary)
          .values({
            name: input.name,
            description: input.description || null,
            intervalDays: input.intervalDays || null,
            dosesRequired: input.dosesRequired,
          })
          .returning();
        return vaccine;
      }, "Erro ao adicionar vacina à biblioteca");
    }),

  /**
   * Busca vacinações de um pet
   */
  getPetVaccinations: protectedProcedure
    .input(z.object({ petId: z.number() }))
    .query(async ({ input }) => {
      return safeAsync(async () => {
        const result = await db
          .select({
            vaccination: petVaccinations,
            vaccine: vaccineLibrary,
          })
          .from(petVaccinations)
          .innerJoin(vaccineLibrary, eq(petVaccinations.vaccineId, vaccineLibrary.id))
          .where(eq(petVaccinations.petId, input.petId))
          .orderBy(desc(petVaccinations.applicationDate));

        return result;
      }, "Erro ao buscar vacinações do pet");
    }),

  /**
   * Adiciona vacinação
   */
  addVaccination: protectedProcedure
    .input(
      z.object({
        petId: z.number(),
        vaccineId: z.number(),
        applicationDate: z.string().or(z.date()),
        nextDueDate: z.string().or(z.date()).optional(),
        doseNumber: z.number().int().default(1),
        veterinarian: z.string().optional(),
        clinic: z.string().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      return safeAsync(async () => {
        const [vaccination] = await db
          .insert(petVaccinations)
          .values({
            petId: input.petId,
            vaccineId: input.vaccineId,
            applicationDate: new Date(input.applicationDate),
            nextDueDate: input.nextDueDate ? new Date(input.nextDueDate) : null,
            doseNumber: input.doseNumber,
            veterinarian: input.veterinarian || null,
            clinic: input.clinic || null,
            notes: input.notes || null,
          })
          .returning();

        return vaccination;
      }, "Erro ao registrar vacinação");
    }),

  /**
   * Atualiza vacinação
   */
  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        nextDueDate: z.string().or(z.date()).optional(),
        veterinarian: z.string().optional(),
        clinic: z.string().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      return safeAsync(async () => {
        const { id, ...data } = input;
        const updateData: Record<string, unknown> = {};

        if (data.nextDueDate) updateData.nextDueDate = new Date(data.nextDueDate);
        if (data.veterinarian !== undefined) updateData.veterinarian = data.veterinarian;
        if (data.clinic !== undefined) updateData.clinic = data.clinic;
        if (data.notes !== undefined) updateData.notes = data.notes;

        const [vaccination] = await db
          .update(petVaccinations)
          .set(updateData)
          .where(eq(petVaccinations.id, id))
          .returning();

        return vaccination;
      }, "Erro ao atualizar vacinação");
    }),

  /**
   * Remove vacinação
   */
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      return safeAsync(async () => {
        await db.delete(petVaccinations).where(eq(petVaccinations.id, input.id));
        return { success: true };
      }, "Erro ao remover vacinação");
    }),

  /**
   * Vacinas próximas (admin)
   */
  upcoming: adminProcedure
    .input(z.object({ daysAhead: z.number().default(30) }))
    .query(async ({ input }) => {
      return safeAsync(async () => {
        const today = new Date();
        const futureDate = new Date();
        futureDate.setDate(today.getDate() + input.daysAhead);

        const result = await db
          .select({
            vaccination: petVaccinations,
            vaccine: vaccineLibrary,
            pet: pets,
          })
          .from(petVaccinations)
          .innerJoin(vaccineLibrary, eq(petVaccinations.vaccineId, vaccineLibrary.id))
          .innerJoin(pets, eq(petVaccinations.petId, pets.id))
          .where(
            and(
              gte(petVaccinations.nextDueDate, today),
              lte(petVaccinations.nextDueDate, futureDate)
            )
          )
          .orderBy(petVaccinations.nextDueDate);

        return result;
      }, "Erro ao buscar vacinas próximas");
    }),

  /**
   * Estatísticas de vacinação (admin)
   */
  stats: adminProcedure.query(async () => {
    return safeAsync(async () => {
      const today = new Date();
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(today.getDate() + 30);

      const [total] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(petVaccinations);

      const [upcoming] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(petVaccinations)
        .where(
          and(
            gte(petVaccinations.nextDueDate, today),
            lte(petVaccinations.nextDueDate, thirtyDaysFromNow)
          )
        );

      const [overdue] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(petVaccinations)
        .where(lte(petVaccinations.nextDueDate, today));

      return {
        total: total.count,
        upcoming: upcoming.count,
        overdue: overdue.count,
      };
    }, "Erro ao buscar estatísticas de vacinação");
  }),
});
