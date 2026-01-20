/**
 * Training Matrix Router - Skills Matrix
 * 
 * Gerencia a matriz de habilidades de treinamento dos pets
 */

import { z } from "zod";
import { router, adminProcedure, protectedProcedure } from "../init";
import { db } from "@/lib/db";
import { petTrainingCommands, trainingSessions } from "@/lib/db/schema-enhanced";
import { eq, desc, and } from "drizzle-orm";

const commandSchema = z.object({
  petId: z.number(),
  command: z.string(),
  category: z.enum(["basic", "intermediate", "advanced", "fun", "behavior"]).optional(),
  proficiency: z.enum(["not_started", "learning", "with_treat", "reliable", "proofed"]).default("not_started"),
  distanceLevel: z.number().min(1).max(5).default(1),
  durationLevel: z.number().min(1).max(5).default(1),
  distractionLevel: z.number().min(1).max(5).default(1),
  notes: z.string().optional(),
});

const sessionSchema = z.object({
  petId: z.number(),
  durationMinutes: z.number().optional(),
  commandsPracticed: z.array(z.object({
    command: z.string(),
    successRate: z.number().min(0).max(100).optional(),
  })).optional(),
  focusLevel: z.number().min(1).max(5).optional(),
  motivationLevel: z.number().min(1).max(5).optional(),
  notes: z.string().optional(),
  achievements: z.string().optional(),
});

interface TrainingCommand {
  id: number;
  petId: number;
  command: string;
  category: string | null;
  proficiency: string | null;
  distanceLevel: number | null;
  durationLevel: number | null;
  distractionLevel: number | null;
  notes: string | null;
  lastPracticed: string | null;
  createdAt: Date | null;
  updatedAt: Date | null;
}

export const trainingMatrixRouter = router({
  // ============================================
  // COMANDOS / SKILLS
  // ============================================

  /**
   * Obter matriz de comandos de um pet
   */
  getCommands: protectedProcedure
    .input(z.object({ petId: z.number() }))
    .query(async ({ input }) => {
      return db.select()
        .from(petTrainingCommands)
        .where(eq(petTrainingCommands.petId, input.petId))
        .orderBy(desc(petTrainingCommands.updatedAt));
    }),

  /**
   * Adicionar ou atualizar comando
   */
  upsertCommand: adminProcedure
    .input(commandSchema)
    .mutation(async ({ input }) => {
      // Verificar se já existe
      const [existing] = await db.select()
        .from(petTrainingCommands)
        .where(and(
          eq(petTrainingCommands.petId, input.petId),
          eq(petTrainingCommands.command, input.command)
        ))
        .limit(1);

      if (existing) {
        // Atualizar
        const [updated] = await db.update(petTrainingCommands)
          .set({
            category: input.category,
            proficiency: input.proficiency,
            distanceLevel: input.distanceLevel,
            durationLevel: input.durationLevel,
            distractionLevel: input.distractionLevel,
            notes: input.notes,
            lastPracticed: new Date().toISOString().split("T")[0],
            updatedAt: new Date(),
          })
          .where(eq(petTrainingCommands.id, existing.id))
          .returning();
        return updated;
      } else {
        // Inserir novo
        const [created] = await db.insert(petTrainingCommands)
          .values({
            petId: input.petId,
            command: input.command,
            category: input.category,
            proficiency: input.proficiency,
            distanceLevel: input.distanceLevel,
            durationLevel: input.durationLevel,
            distractionLevel: input.distractionLevel,
            notes: input.notes,
            lastPracticed: new Date().toISOString().split("T")[0],
          })
          .returning();
        return created;
      }
    }),

  /**
   * Remover comando
   */
  removeCommand: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await db.delete(petTrainingCommands)
        .where(eq(petTrainingCommands.id, input.id));
      return { success: true };
    }),

  /**
   * Obter resumo de progresso
   */
  getProgress: protectedProcedure
    .input(z.object({ petId: z.number() }))
    .query(async ({ input }) => {
      const commands = await db.select()
        .from(petTrainingCommands)
        .where(eq(petTrainingCommands.petId, input.petId));

      const proficiencyMap: Record<string, number> = {
        not_started: 0,
        learning: 25,
        with_treat: 50,
        reliable: 75,
        proofed: 100,
      };

      const total = commands.length;
      if (total === 0) {
        return {
          totalCommands: 0,
          averageProgress: 0,
          byCategory: {},
          byProficiency: {},
        };
      }

      const totalProgress = commands.reduce((sum: number, cmd: TrainingCommand) => {
        return sum + (proficiencyMap[cmd.proficiency || "not_started"] || 0);
      }, 0);

      // Agrupar por categoria
      const byCategory: Record<string, number> = {};
      const byCategoryCount: Record<string, number> = {};
      commands.forEach((cmd: TrainingCommand) => {
        const cat = cmd.category || "other";
        if (!byCategory[cat]) {
          byCategory[cat] = 0;
          byCategoryCount[cat] = 0;
        }
        byCategory[cat] += proficiencyMap[cmd.proficiency || "not_started"] || 0;
        byCategoryCount[cat]++;
      });

      Object.keys(byCategory).forEach(cat => {
        byCategory[cat] = Math.round(byCategory[cat] / byCategoryCount[cat]);
      });

      // Contar por proficiência
      const byProficiency: Record<string, number> = {};
      commands.forEach((cmd: TrainingCommand) => {
        const prof = cmd.proficiency || "not_started";
        byProficiency[prof] = (byProficiency[prof] || 0) + 1;
      });

      return {
        totalCommands: total,
        averageProgress: Math.round(totalProgress / total),
        byCategory,
        byProficiency,
      };
    }),

  // ============================================
  // SESSÕES DE TREINO
  // ============================================

  /**
   * Registrar sessão de treino
   */
  createSession: adminProcedure
    .input(sessionSchema)
    .mutation(async ({ ctx, input }) => {
      const [session] = await db.insert(trainingSessions)
        .values({
          petId: input.petId,
          durationMinutes: input.durationMinutes,
          commandsPracticed: input.commandsPracticed || [],
          focusLevel: input.focusLevel,
          motivationLevel: input.motivationLevel,
          notes: input.notes,
          achievements: input.achievements,
          trainerId: ctx.user.id,
        })
        .returning();

      // Atualizar lastPracticed dos comandos praticados
      if (input.commandsPracticed) {
        for (const cmd of input.commandsPracticed) {
          await db.update(petTrainingCommands)
            .set({ lastPracticed: new Date().toISOString().split("T")[0] })
            .where(and(
              eq(petTrainingCommands.petId, input.petId),
              eq(petTrainingCommands.command, cmd.command)
            ));
        }
      }

      return session;
    }),

  /**
   * Listar sessões de um pet
   */
  getSessions: protectedProcedure
    .input(z.object({ 
      petId: z.number(),
      limit: z.number().default(20),
    }))
    .query(async ({ input }) => {
      return db.select()
        .from(trainingSessions)
        .where(eq(trainingSessions.petId, input.petId))
        .orderBy(desc(trainingSessions.sessionDate))
        .limit(input.limit);
    }),
});
