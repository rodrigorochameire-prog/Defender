import { z } from "zod";
import { router, protectedProcedure, adminProcedure } from "../init";
import { db } from "@/lib/db";
import { eq, and, desc, sql } from "drizzle-orm";
import { safeAsync } from "@/lib/errors";
import {
  pgTable,
  serial,
  text,
  varchar,
  boolean,
  timestamp,
  integer,
} from "drizzle-orm/pg-core";

// Schema para biblioteca de medicamentos
export const medicationLibrary = pgTable("medication_library", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 200 }).notNull(),
  type: varchar("type", { length: 100 }).notNull(), // 'flea' | 'deworming' | 'antibiotic' | 'other'
  description: text("description"),
  commonDosage: varchar("common_dosage", { length: 200 }),
  isCommon: boolean("is_common").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Schema para medicamentos do pet
export const petMedications = pgTable("pet_medications", {
  id: serial("id").primaryKey(),
  petId: integer("pet_id").notNull(),
  medicationId: integer("medication_id").notNull(),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date"),
  dosage: varchar("dosage", { length: 200 }).notNull(),
  frequency: varchar("frequency", { length: 100 }),
  administrationTimes: text("administration_times"), // JSON array
  notes: text("notes"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const medicationsRouter = router({
  /**
   * Lista biblioteca de medicamentos
   */
  library: protectedProcedure.query(async () => {
    return safeAsync(async () => {
      const result = await db
        .select()
        .from(medicationLibrary)
        .orderBy(medicationLibrary.name);
      return result;
    }, "Erro ao buscar medicamentos");
  }),

  /**
   * Adiciona medicamento à biblioteca
   */
  addToLibrary: adminProcedure
    .input(
      z.object({
        name: z.string().min(1).max(200),
        type: z.string().min(1),
        description: z.string().optional(),
        commonDosage: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      return safeAsync(async () => {
        const [medication] = await db
          .insert(medicationLibrary)
          .values({
            name: input.name,
            type: input.type,
            description: input.description || null,
            commonDosage: input.commonDosage || null,
          })
          .returning();
        return medication;
      }, "Erro ao adicionar medicamento à biblioteca");
    }),

  /**
   * Busca medicamentos de um pet
   */
  getPetMedications: protectedProcedure
    .input(z.object({ petId: z.number() }))
    .query(async ({ input }) => {
      return safeAsync(async () => {
        const result = await db
          .select({
            medication: petMedications,
            library: medicationLibrary,
          })
          .from(petMedications)
          .leftJoin(medicationLibrary, eq(petMedications.medicationId, medicationLibrary.id))
          .where(eq(petMedications.petId, input.petId))
          .orderBy(desc(petMedications.startDate));

        return result;
      }, "Erro ao buscar medicamentos do pet");
    }),

  /**
   * Busca medicamentos ativos
   */
  getActive: protectedProcedure
    .input(z.object({ petId: z.number().optional() }))
    .query(async ({ input }) => {
      return safeAsync(async () => {
        const conditions = [eq(petMedications.isActive, true)];
        
        if (input.petId) {
          conditions.push(eq(petMedications.petId, input.petId));
        }

        const result = await db
          .select({
            medication: petMedications,
            library: medicationLibrary,
          })
          .from(petMedications)
          .leftJoin(medicationLibrary, eq(petMedications.medicationId, medicationLibrary.id))
          .where(and(...conditions))
          .orderBy(desc(petMedications.startDate));

        return result;
      }, "Erro ao buscar medicamentos ativos");
    }),

  /**
   * Adiciona medicamento ao pet
   */
  add: protectedProcedure
    .input(
      z.object({
        petId: z.number(),
        medicationId: z.number().optional(),
        customMedName: z.string().optional(),
        customMedType: z.string().optional(),
        startDate: z.string().or(z.date()),
        endDate: z.string().or(z.date()).optional(),
        dosage: z.string(),
        frequency: z.string().optional(),
        administrationTimes: z.string().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      return safeAsync(async () => {
        let medicationId = input.medicationId;

        // Se for medicamento customizado, criar primeiro
        if (input.customMedName && input.customMedType) {
          const [newMed] = await db
            .insert(medicationLibrary)
            .values({
              name: input.customMedName,
              type: input.customMedType,
            })
            .returning();
          medicationId = newMed.id;
        }

        if (!medicationId) {
          throw new Error("Medicamento não especificado");
        }

        const [medication] = await db
          .insert(petMedications)
          .values({
            petId: input.petId,
            medicationId: medicationId,
            startDate: new Date(input.startDate),
            endDate: input.endDate ? new Date(input.endDate) : null,
            dosage: input.dosage,
            frequency: input.frequency || null,
            administrationTimes: input.administrationTimes || null,
            notes: input.notes || null,
            isActive: true,
          })
          .returning();

        return medication;
      }, "Erro ao adicionar medicamento");
    }),

  /**
   * Atualiza medicamento
   */
  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        dosage: z.string().optional(),
        frequency: z.string().optional(),
        endDate: z.string().or(z.date()).optional(),
        isActive: z.boolean().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      return safeAsync(async () => {
        const { id, ...data } = input;
        const updateData: Record<string, unknown> = {};

        if (data.dosage !== undefined) updateData.dosage = data.dosage;
        if (data.frequency !== undefined) updateData.frequency = data.frequency;
        if (data.endDate !== undefined) updateData.endDate = new Date(data.endDate);
        if (data.isActive !== undefined) updateData.isActive = data.isActive;
        if (data.notes !== undefined) updateData.notes = data.notes;

        const [medication] = await db
          .update(petMedications)
          .set(updateData)
          .where(eq(petMedications.id, id))
          .returning();

        return medication;
      }, "Erro ao atualizar medicamento");
    }),

  /**
   * Remove medicamento
   */
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      return safeAsync(async () => {
        await db.delete(petMedications).where(eq(petMedications.id, input.id));
        return { success: true };
      }, "Erro ao remover medicamento");
    }),

  /**
   * Estatísticas (admin)
   */
  stats: adminProcedure.query(async () => {
    return safeAsync(async () => {
      const [total] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(petMedications);

      const [active] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(petMedications)
        .where(eq(petMedications.isActive, true));

      return {
        total: total.count,
        active: active.count,
      };
    }, "Erro ao buscar estatísticas de medicamentos");
  }),
});
