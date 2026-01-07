import { z } from "zod";
import { router, protectedProcedure, adminProcedure } from "../init";
import { db, pets, petVaccinations, vaccineLibrary, calendarEvents } from "@/lib/db";
import { eq, and, desc, gte, lte, sql } from "drizzle-orm";
import { safeAsync, Errors } from "@/lib/errors";
import {
  pgTable,
  serial,
  text,
  varchar,
  timestamp,
  integer,
} from "drizzle-orm/pg-core";

// Schema para tratamentos preventivos (antipulgas, vermífugos)
export const preventiveTreatments = pgTable("preventive_treatments", {
  id: serial("id").primaryKey(),
  petId: integer("pet_id").notNull(),
  type: varchar("type", { length: 50 }).notNull(), // 'flea' | 'deworming' | 'heartworm'
  productName: varchar("product_name", { length: 200 }).notNull(),
  applicationDate: timestamp("application_date").notNull(),
  nextDueDate: timestamp("next_due_date"),
  dosage: varchar("dosage", { length: 100 }),
  notes: text("notes"),
  createdById: integer("created_by_id").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Helper para nomes de tipos de preventivos
const PREVENTIVE_TYPES = {
  flea: { label: "Antipulgas", emoji: "🦟", color: "#3b82f6" },
  deworming: { label: "Vermífugo", emoji: "💊", color: "#22c55e" },
  heartworm: { label: "Dirofilariose", emoji: "❤️", color: "#ef4444" },
  tick: { label: "Carrapaticida", emoji: "🪲", color: "#f59e0b" },
} as const;

// Helper para criar evento no calendário
async function createPreventiveCalendarEvent(
  petId: number,
  productName: string,
  type: keyof typeof PREVENTIVE_TYPES,
  eventDate: Date,
  createdById: number,
  isReminder: boolean = false
) {
  const pet = await db.query.pets.findFirst({ where: eq(pets.id, petId) });
  const petName = pet?.name || "Pet";
  const typeInfo = PREVENTIVE_TYPES[type];

  await db.insert(calendarEvents).values({
    title: isReminder 
      ? `⏰ Lembrete: ${typeInfo.label} - ${petName}`
      : `${typeInfo.emoji} ${typeInfo.label}: ${productName} - ${petName}`,
    description: isReminder 
      ? `Lembrete para aplicar ${typeInfo.label.toLowerCase()}: ${productName}`
      : `Produto: ${productName}\nTipo: ${typeInfo.label}`,
    eventDate,
    eventType: "preventive",
    petId,
    isAllDay: true,
    color: typeInfo.color,
    createdById,
  });
}

export const preventivesRouter = router({
  /**
   * Lista tratamentos preventivos de um pet
   */
  byPet: protectedProcedure
    .input(
      z.object({
        petId: z.number(),
        type: z.enum(["flea", "deworming", "heartworm", "tick"]).optional(),
      })
    )
    .query(async ({ input }) => {
      return safeAsync(async () => {
        let conditions = [eq(preventiveTreatments.petId, input.petId)];

        if (input.type) {
          conditions.push(eq(preventiveTreatments.type, input.type));
        }

        const result = await db
          .select()
          .from(preventiveTreatments)
          .where(and(...conditions))
          .orderBy(desc(preventiveTreatments.applicationDate));

        return result;
      }, "Erro ao buscar tratamentos preventivos");
    }),

  /**
   * Adiciona tratamento preventivo com integração ao calendário
   */
  add: protectedProcedure
    .input(
      z.object({
        petId: z.number(),
        type: z.enum(["flea", "deworming", "heartworm", "tick"]),
        productName: z.string().min(1).max(200),
        applicationDate: z.string().or(z.date()),
        nextDueDate: z.string().or(z.date()).optional(),
        dosage: z.string().optional(),
        notes: z.string().optional(),
        addToCalendar: z.boolean().default(true), // Adicionar ao calendário
        reminderDaysBefore: z.number().default(3), // Lembrete X dias antes da próxima dose
      })
    )
    .mutation(async ({ ctx, input }) => {
      return safeAsync(async () => {
        const applicationDate = new Date(input.applicationDate);
        const nextDueDate = input.nextDueDate ? new Date(input.nextDueDate) : null;

        const [treatment] = await db
          .insert(preventiveTreatments)
          .values({
            petId: input.petId,
            type: input.type,
            productName: input.productName,
            applicationDate,
            nextDueDate,
            dosage: input.dosage || null,
            notes: input.notes || null,
            createdById: ctx.user.id,
          })
          .returning();

        // Criar eventos no calendário
        if (input.addToCalendar) {
          // Evento da aplicação
          await createPreventiveCalendarEvent(
            input.petId,
            input.productName,
            input.type,
            applicationDate,
            ctx.user.id,
            false
          );

          // Evento de lembrete para próxima dose (se tiver)
          if (nextDueDate) {
            // Evento da próxima dose
            await createPreventiveCalendarEvent(
              input.petId,
              input.productName,
              input.type,
              nextDueDate,
              ctx.user.id,
              false
            );

            // Lembrete X dias antes
            if (input.reminderDaysBefore > 0) {
              const reminderDate = new Date(nextDueDate);
              reminderDate.setDate(reminderDate.getDate() - input.reminderDaysBefore);
              
              // Só criar lembrete se for no futuro
              if (reminderDate > new Date()) {
                await createPreventiveCalendarEvent(
                  input.petId,
                  input.productName,
                  input.type,
                  reminderDate,
                  ctx.user.id,
                  true
                );
              }
            }
          }
        }

        return treatment;
      }, "Erro ao adicionar tratamento preventivo");
    }),

  /**
   * Atualiza tratamento
   */
  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        nextDueDate: z.string().or(z.date()).optional(),
        dosage: z.string().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      return safeAsync(async () => {
        const { id, ...data } = input;
        const updateData: Record<string, unknown> = {};

        if (data.nextDueDate) updateData.nextDueDate = new Date(data.nextDueDate);
        if (data.dosage !== undefined) updateData.dosage = data.dosage;
        if (data.notes !== undefined) updateData.notes = data.notes;

        const [treatment] = await db
          .update(preventiveTreatments)
          .set(updateData)
          .where(eq(preventiveTreatments.id, id))
          .returning();

        return treatment;
      }, "Erro ao atualizar tratamento preventivo");
    }),

  /**
   * Remove tratamento
   */
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      return safeAsync(async () => {
        await db.delete(preventiveTreatments).where(eq(preventiveTreatments.id, input.id));
        return { success: true };
      }, "Erro ao remover tratamento preventivo");
    }),

  /**
   * Lista próximos tratamentos (admin)
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
            treatment: preventiveTreatments,
            pet: {
              id: pets.id,
              name: pets.name,
              photoUrl: pets.photoUrl,
            },
          })
          .from(preventiveTreatments)
          .innerJoin(pets, eq(preventiveTreatments.petId, pets.id))
          .where(
            and(
              gte(preventiveTreatments.nextDueDate, today),
              lte(preventiveTreatments.nextDueDate, futureDate)
            )
          )
          .orderBy(preventiveTreatments.nextDueDate);

        return result;
      }, "Erro ao buscar próximos tratamentos");
    }),

  /**
   * Lista atrasados (admin)
   */
  overdue: adminProcedure.query(async () => {
    return safeAsync(async () => {
      const today = new Date();

      const result = await db
        .select({
          treatment: preventiveTreatments,
          pet: {
            id: pets.id,
            name: pets.name,
            photoUrl: pets.photoUrl,
          },
        })
        .from(preventiveTreatments)
        .innerJoin(pets, eq(preventiveTreatments.petId, pets.id))
        .where(lte(preventiveTreatments.nextDueDate, today))
        .orderBy(preventiveTreatments.nextDueDate);

      return result;
    }, "Erro ao buscar tratamentos atrasados");
  }),

  /**
   * Estatísticas (admin)
   */
  stats: adminProcedure.query(async () => {
    return safeAsync(async () => {
      const today = new Date();
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(today.getDate() + 30);

      const [total] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(preventiveTreatments);

      const [flea] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(preventiveTreatments)
        .where(eq(preventiveTreatments.type, "flea"));

      const [deworming] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(preventiveTreatments)
        .where(eq(preventiveTreatments.type, "deworming"));

      const [tick] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(preventiveTreatments)
        .where(eq(preventiveTreatments.type, "tick"));

      const [overdue] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(preventiveTreatments)
        .where(lte(preventiveTreatments.nextDueDate, today));

      const [upcoming] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(preventiveTreatments)
        .where(
          and(
            gte(preventiveTreatments.nextDueDate, today),
            lte(preventiveTreatments.nextDueDate, thirtyDaysFromNow)
          )
        );

      return {
        total: total.count,
        flea: flea.count,
        deworming: deworming.count,
        tick: tick.count,
        overdue: overdue.count,
        upcoming: upcoming.count,
      };
    }, "Erro ao buscar estatísticas de preventivos");
  }),
});
