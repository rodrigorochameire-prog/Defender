import { z } from "zod";
import { router, protectedProcedure, adminProcedure } from "../init";
import { db, pets, users, trainingLogs, trainingCommands } from "@/lib/db";
import { eq, and, desc, gte, lte, sql } from "drizzle-orm";
import { safeAsync } from "@/lib/errors";

export const trainingRouter = router({
  /**
   * Adiciona registro de treinamento
   */
  add: protectedProcedure
    .input(
      z.object({
        petId: z.number(),
        logDate: z.string().or(z.date()),
        command: z.string().min(1),
        category: z.enum(["obedience", "socialization", "behavior", "agility", "tricks"]),
        status: z.enum(["learning", "practicing", "mastered"]),
        successRate: z.number().min(0).max(100).optional(),
        duration: z.number().min(1).optional(),
        treats: z.number().min(0).optional(),
        method: z.enum(["positive_reinforcement", "clicker", "lure", "capture"]).optional(),
        notes: z.string().optional(),
        videoUrl: z.string().url().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return safeAsync(async () => {
        const [log] = await db
          .insert(trainingLogs)
          .values({
            petId: input.petId,
            logDate: new Date(input.logDate),
            command: input.command,
            category: input.category,
            status: input.status,
            successRate: input.successRate || null,
            duration: input.duration || null,
            treats: input.treats || null,
            method: input.method || null,
            notes: input.notes || null,
            videoUrl: input.videoUrl || null,
            createdById: ctx.user.id,
          })
          .returning();

        return log;
      }, "Erro ao adicionar registro de treinamento");
    }),

  /**
   * Busca registros de treinamento de um pet
   */
  byPet: protectedProcedure
    .input(
      z.object({
        petId: z.number(),
        category: z.enum(["obedience", "socialization", "behavior", "agility", "tricks"]).optional(),
        status: z.enum(["learning", "practicing", "mastered"]).optional(),
        limit: z.number().default(50),
      })
    )
    .query(async ({ input }) => {
      return safeAsync(async () => {
        const conditions = [eq(trainingLogs.petId, input.petId)];

        if (input.category) {
          conditions.push(eq(trainingLogs.category, input.category));
        }

        if (input.status) {
          conditions.push(eq(trainingLogs.status, input.status));
        }

        const result = await db
          .select({
            log: trainingLogs,
            createdBy: {
              id: users.id,
              name: users.name,
            },
          })
          .from(trainingLogs)
          .innerJoin(users, eq(trainingLogs.createdById, users.id))
          .where(and(...conditions))
          .orderBy(desc(trainingLogs.logDate))
          .limit(input.limit);

        return result.map((r) => ({
          ...r.log,
          createdBy: r.createdBy,
        }));
      }, "Erro ao buscar registros de treinamento");
    }),

  /**
   * Atualiza status de um comando
   */
  updateStatus: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        status: z.enum(["learning", "practicing", "mastered"]),
        successRate: z.number().min(0).max(100).optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      return safeAsync(async () => {
        const updateData: Record<string, unknown> = {
          status: input.status,
        };

        if (input.successRate !== undefined) {
          updateData.successRate = input.successRate;
        }
        if (input.notes !== undefined) {
          updateData.notes = input.notes;
        }

        const [log] = await db
          .update(trainingLogs)
          .set(updateData)
          .where(eq(trainingLogs.id, input.id))
          .returning();

        return log;
      }, "Erro ao atualizar registro de treinamento");
    }),

  /**
   * Remove registro
   */
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      return safeAsync(async () => {
        await db.delete(trainingLogs).where(eq(trainingLogs.id, input.id));
        return { success: true };
      }, "Erro ao remover registro de treinamento");
    }),

  /**
   * Lista todos os registros (admin)
   */
  list: adminProcedure
    .input(
      z
        .object({
          date: z.string().or(z.date()).optional(),
          category: z.enum(["obedience", "socialization", "behavior", "agility", "tricks"]).optional(),
          limit: z.number().default(50),
        })
        .optional()
    )
    .query(async ({ input }) => {
      return safeAsync(async () => {
        const conditions: ReturnType<typeof eq>[] = [];

        if (input?.date) {
          const date = new Date(input.date);
          const startOfDay = new Date(date);
          startOfDay.setHours(0, 0, 0, 0);
          const endOfDay = new Date(date);
          endOfDay.setHours(23, 59, 59, 999);

          conditions.push(gte(trainingLogs.logDate, startOfDay));
          conditions.push(lte(trainingLogs.logDate, endOfDay));
        }

        if (input?.category) {
          conditions.push(eq(trainingLogs.category, input.category));
        }

        const result = await db
          .select({
            log: trainingLogs,
            pet: {
              id: pets.id,
              name: pets.name,
              photoUrl: pets.photoUrl,
              breed: pets.breed,
            },
            createdBy: {
              id: users.id,
              name: users.name,
            },
          })
          .from(trainingLogs)
          .innerJoin(pets, eq(trainingLogs.petId, pets.id))
          .innerJoin(users, eq(trainingLogs.createdById, users.id))
          .where(conditions.length > 0 ? and(...conditions) : undefined)
          .orderBy(desc(trainingLogs.logDate))
          .limit(input?.limit || 50);

        return result.map((r) => ({
          ...r.log,
          pet: r.pet,
          createdBy: r.createdBy,
        }));
      }, "Erro ao listar registros de treinamento");
    }),

  /**
   * Resumo de progresso de um pet
   */
  progress: protectedProcedure
    .input(z.object({ petId: z.number() }))
    .query(async ({ input }) => {
      return safeAsync(async () => {
        const logs = await db
          .select()
          .from(trainingLogs)
          .where(eq(trainingLogs.petId, input.petId))
          .orderBy(desc(trainingLogs.logDate));

        // Agrupar por comando e pegar o status mais recente
        const commandProgress = new Map<string, { command: string; category: string; status: string; successRate: number | null; lastTraining: Date }>();

        logs.forEach((log) => {
          if (!commandProgress.has(log.command)) {
            commandProgress.set(log.command, {
              command: log.command,
              category: log.category,
              status: log.status,
              successRate: log.successRate,
              lastTraining: log.logDate,
            });
          }
        });

        const commands = Array.from(commandProgress.values());
        const mastered = commands.filter((c) => c.status === "mastered").length;
        const practicing = commands.filter((c) => c.status === "practicing").length;
        const learning = commands.filter((c) => c.status === "learning").length;

        return {
          totalCommands: commands.length,
          mastered,
          practicing,
          learning,
          progress: commands,
          recentLogs: logs.slice(0, 10),
        };
      }, "Erro ao buscar progresso de treinamento");
    }),

  // ========================================
  // BIBLIOTECA DE COMANDOS
  // ========================================

  /**
   * Lista comandos da biblioteca
   */
  commands: protectedProcedure
    .input(
      z
        .object({
          category: z.enum(["obedience", "socialization", "behavior", "agility", "tricks"]).optional(),
        })
        .optional()
    )
    .query(async ({ input }) => {
      return safeAsync(async () => {
        const conditions: ReturnType<typeof eq>[] = [];

        if (input?.category) {
          conditions.push(eq(trainingCommands.category, input.category));
        }

        const result = await db
          .select()
          .from(trainingCommands)
          .where(conditions.length > 0 ? and(...conditions) : undefined)
          .orderBy(trainingCommands.name);

        return result.map((cmd) => ({
          ...cmd,
          steps: cmd.steps ? JSON.parse(cmd.steps) : [],
        }));
      }, "Erro ao listar comandos de treinamento");
    }),

  /**
   * Adiciona comando à biblioteca (admin)
   */
  addCommand: adminProcedure
    .input(
      z.object({
        name: z.string().min(1),
        category: z.enum(["obedience", "socialization", "behavior", "agility", "tricks"]),
        description: z.string().optional(),
        difficulty: z.enum(["easy", "medium", "hard"]).optional(),
        steps: z.array(z.string()).optional(),
        tips: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      return safeAsync(async () => {
        const [cmd] = await db
          .insert(trainingCommands)
          .values({
            name: input.name,
            category: input.category,
            description: input.description || null,
            difficulty: input.difficulty || null,
            steps: input.steps ? JSON.stringify(input.steps) : null,
            tips: input.tips || null,
          })
          .returning();

        return cmd;
      }, "Erro ao adicionar comando de treinamento");
    }),
});

