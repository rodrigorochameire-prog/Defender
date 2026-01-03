import { z } from "zod";
import { router, protectedProcedure, adminProcedure } from "../init";
import { db, pets, dailyLogs, users } from "@/lib/db";
import { eq, and, desc, gte, lte, sql } from "drizzle-orm";
import { safeAsync, Errors } from "@/lib/errors";
import {
  pgTable,
  serial,
  text,
  varchar,
  boolean,
  timestamp,
  integer,
} from "drizzle-orm/pg-core";

// Schema para registros de comportamento
export const behaviorLogs = pgTable("behavior_logs", {
  id: serial("id").primaryKey(),
  petId: integer("pet_id").notNull(),
  logDate: timestamp("log_date").notNull(),
  socialization: varchar("socialization", { length: 50 }), // 'excellent' | 'good' | 'moderate' | 'poor'
  energy: varchar("energy", { length: 50 }), // 'high' | 'normal' | 'low'
  obedience: varchar("obedience", { length: 50 }), // 'excellent' | 'good' | 'needs_work'
  anxiety: varchar("anxiety", { length: 50 }), // 'none' | 'mild' | 'moderate' | 'severe'
  aggression: varchar("aggression", { length: 50 }), // 'none' | 'mild' | 'moderate' | 'severe'
  notes: text("notes"),
  activities: text("activities"), // JSON array
  createdById: integer("created_by_id").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const behaviorRouter = router({
  /**
   * Adiciona registro de comportamento
   */
  add: protectedProcedure
    .input(
      z.object({
        petId: z.number(),
        logDate: z.string().or(z.date()),
        socialization: z.enum(["excellent", "good", "moderate", "poor"]).optional(),
        energy: z.enum(["high", "normal", "low"]).optional(),
        obedience: z.enum(["excellent", "good", "needs_work"]).optional(),
        anxiety: z.enum(["none", "mild", "moderate", "severe"]).optional(),
        aggression: z.enum(["none", "mild", "moderate", "severe"]).optional(),
        notes: z.string().optional(),
        activities: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return safeAsync(async () => {
        const [log] = await db
          .insert(behaviorLogs)
          .values({
            petId: input.petId,
            logDate: new Date(input.logDate),
            socialization: input.socialization || null,
            energy: input.energy || null,
            obedience: input.obedience || null,
            anxiety: input.anxiety || null,
            aggression: input.aggression || null,
            notes: input.notes || null,
            activities: input.activities ? JSON.stringify(input.activities) : null,
            createdById: ctx.user.id,
          })
          .returning();

        return log;
      }, "Erro ao adicionar registro de comportamento");
    }),

  /**
   * Busca registros de um pet
   */
  byPet: protectedProcedure
    .input(
      z.object({
        petId: z.number(),
        startDate: z.string().or(z.date()).optional(),
        endDate: z.string().or(z.date()).optional(),
        limit: z.number().default(30),
      })
    )
    .query(async ({ input }) => {
      return safeAsync(async () => {
        let conditions = [eq(behaviorLogs.petId, input.petId)];

        if (input.startDate) {
          conditions.push(gte(behaviorLogs.logDate, new Date(input.startDate)));
        }

        if (input.endDate) {
          conditions.push(lte(behaviorLogs.logDate, new Date(input.endDate)));
        }

        const result = await db
          .select({
            log: behaviorLogs,
            createdBy: {
              id: users.id,
              name: users.name,
            },
          })
          .from(behaviorLogs)
          .innerJoin(users, eq(behaviorLogs.createdById, users.id))
          .where(and(...conditions))
          .orderBy(desc(behaviorLogs.logDate))
          .limit(input.limit);

        return result.map(r => ({
          ...r.log,
          activities: r.log.activities ? JSON.parse(r.log.activities) : [],
          createdBy: r.createdBy,
        }));
      }, "Erro ao buscar registros de comportamento");
    }),

  /**
   * Atualiza registro
   */
  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        socialization: z.enum(["excellent", "good", "moderate", "poor"]).optional(),
        energy: z.enum(["high", "normal", "low"]).optional(),
        obedience: z.enum(["excellent", "good", "needs_work"]).optional(),
        anxiety: z.enum(["none", "mild", "moderate", "severe"]).optional(),
        aggression: z.enum(["none", "mild", "moderate", "severe"]).optional(),
        notes: z.string().optional(),
        activities: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ input }) => {
      return safeAsync(async () => {
        const { id, ...data } = input;
        const updateData: Record<string, unknown> = {};

        if (data.socialization !== undefined) updateData.socialization = data.socialization;
        if (data.energy !== undefined) updateData.energy = data.energy;
        if (data.obedience !== undefined) updateData.obedience = data.obedience;
        if (data.anxiety !== undefined) updateData.anxiety = data.anxiety;
        if (data.aggression !== undefined) updateData.aggression = data.aggression;
        if (data.notes !== undefined) updateData.notes = data.notes;
        if (data.activities !== undefined) updateData.activities = JSON.stringify(data.activities);

        const [log] = await db
          .update(behaviorLogs)
          .set(updateData)
          .where(eq(behaviorLogs.id, id))
          .returning();

        return log;
      }, "Erro ao atualizar registro de comportamento");
    }),

  /**
   * Remove registro
   */
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      return safeAsync(async () => {
        await db.delete(behaviorLogs).where(eq(behaviorLogs.id, input.id));
        return { success: true };
      }, "Erro ao remover registro de comportamento");
    }),

  /**
   * Lista todos os registros (admin)
   */
  list: adminProcedure
    .input(
      z.object({
        date: z.string().or(z.date()).optional(),
        limit: z.number().default(50),
      }).optional()
    )
    .query(async ({ input }) => {
      return safeAsync(async () => {
        let conditions: ReturnType<typeof eq>[] = [];

        if (input?.date) {
          const date = new Date(input.date);
          const startOfDay = new Date(date);
          startOfDay.setHours(0, 0, 0, 0);
          const endOfDay = new Date(date);
          endOfDay.setHours(23, 59, 59, 999);

          conditions.push(gte(behaviorLogs.logDate, startOfDay));
          conditions.push(lte(behaviorLogs.logDate, endOfDay));
        }

        const result = await db
          .select({
            log: behaviorLogs,
            pet: {
              id: pets.id,
              name: pets.name,
              photoUrl: pets.photoUrl,
            },
            createdBy: {
              id: users.id,
              name: users.name,
            },
          })
          .from(behaviorLogs)
          .innerJoin(pets, eq(behaviorLogs.petId, pets.id))
          .innerJoin(users, eq(behaviorLogs.createdById, users.id))
          .where(conditions.length > 0 ? and(...conditions) : undefined)
          .orderBy(desc(behaviorLogs.logDate))
          .limit(input?.limit || 50);

        return result.map(r => ({
          ...r.log,
          activities: r.log.activities ? JSON.parse(r.log.activities) : [],
          pet: r.pet,
          createdBy: r.createdBy,
        }));
      }, "Erro ao listar registros de comportamento");
    }),

  /**
   * Análise de comportamento de um pet
   */
  analysis: protectedProcedure
    .input(
      z.object({
        petId: z.number(),
        days: z.number().default(30),
      })
    )
    .query(async ({ input }) => {
      return safeAsync(async () => {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - input.days);

        const logs = await db
          .select()
          .from(behaviorLogs)
          .where(
            and(
              eq(behaviorLogs.petId, input.petId),
              gte(behaviorLogs.logDate, startDate)
            )
          )
          .orderBy(behaviorLogs.logDate);

        // Calcular médias e tendências
        const socializations = logs.map(l => l.socialization).filter(Boolean);
        const energies = logs.map(l => l.energy).filter(Boolean);
        const anxieties = logs.map(l => l.anxiety).filter(Boolean);

        return {
          totalLogs: logs.length,
          period: {
            start: startDate.toISOString(),
            end: new Date().toISOString(),
          },
          averages: {
            socialization: socializations.length > 0 ? socializations : [],
            energy: energies.length > 0 ? energies : [],
            anxiety: anxieties.length > 0 ? anxieties : [],
          },
          recentLogs: logs.slice(-5),
        };
      }, "Erro ao gerar análise de comportamento");
    }),
});
