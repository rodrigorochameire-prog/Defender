import { z } from "zod";
import { router, protectedProcedure, adminProcedure } from "../init";
import { db, dailyLogs, pets, users, calendarEvents, notifications } from "@/lib/db";
import { eq, and, desc, gte, lte, sql } from "drizzle-orm";
import { safeAsync, Errors } from "@/lib/errors";

// Helper para criar alerta de saúde no calendário
async function createHealthAlertEvent(
  petId: number,
  issue: string,
  createdById: number
) {
  const pet = await db.query.pets.findFirst({ where: eq(pets.id, petId) });
  const petName = pet?.name || "Pet";

  await db.insert(calendarEvents).values({
    title: `⚠️ Alerta de Saúde: ${petName}`,
    description: `Problema detectado: ${issue}\n\nRequer atenção veterinária.`,
    eventDate: new Date(),
    eventType: "medical",
    petId,
    isAllDay: false,
    color: "#ef4444",
    createdById,
  });
}

export const logsRouter = router({
  /**
   * Adiciona log diário com opções avançadas
   */
  add: protectedProcedure
    .input(
      z.object({
        petId: z.number(),
        logDate: z.string().or(z.date()),
        source: z.enum(["home", "daycare"]),
        // Saúde física
        mood: z.enum(["happy", "calm", "anxious", "tired", "agitated", "sick"]).optional(),
        stool: z.enum(["normal", "soft", "hard", "diarrhea", "bloody", "mucus", "none"]).optional(),
        appetite: z.enum(["excellent", "good", "moderate", "poor", "none"]).optional(),
        vomit: z.boolean().optional(),
        cough: z.boolean().optional(),
        sneeze: z.boolean().optional(),
        // Comportamento
        energy: z.enum(["high", "normal", "low", "very_low"]).optional(),
        socialization: z.enum(["excellent", "good", "moderate", "poor", "avoided"]).optional(),
        playfulness: z.enum(["very_playful", "normal", "low", "not_interested"]).optional(),
        // Atividades (JSON array)
        activities: z.array(z.string()).optional(),
        // Água e alimentação
        waterIntake: z.enum(["normal", "increased", "decreased", "none"]).optional(),
        foodAmount: z.enum(["all", "most", "half", "little", "none"]).optional(),
        // Outros
        notes: z.string().optional(),
        photos: z.array(z.string()).optional(), // URLs das fotos
        createAlertOnIssues: z.boolean().default(true),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return safeAsync(async () => {
        const logDate = new Date(input.logDate);
        
        const [log] = await db
          .insert(dailyLogs)
          .values({
            petId: input.petId,
            logDate,
            source: input.source,
            mood: input.mood || null,
            stool: input.stool || null,
            appetite: input.appetite || null,
            notes: input.notes || null,
            createdById: ctx.user.id,
          })
          .returning();

        // Detectar problemas de saúde e criar alertas
        if (input.createAlertOnIssues) {
          const issues: string[] = [];
          
          if (input.stool === "diarrhea" || input.stool === "bloody" || input.stool === "mucus") {
            issues.push(`Problema nas fezes (${input.stool})`);
          }
          if (input.appetite === "none" || input.appetite === "poor") {
            issues.push("Perda de apetite");
          }
          if (input.mood === "sick") {
            issues.push("Aparência doente");
          }
          if (input.vomit) {
            issues.push("Vômito");
          }
          if (input.energy === "very_low") {
            issues.push("Energia muito baixa");
          }
          if (input.waterIntake === "none") {
            issues.push("Não está bebendo água");
          }

          // Se houver problemas, criar alerta
          if (issues.length > 0) {
            await createHealthAlertEvent(
              input.petId,
              issues.join(", "),
              ctx.user.id
            );
          }
        }

        return log;
      }, "Erro ao adicionar log diário");
    }),

  /**
   * Busca logs de um pet
   */
  byPet: protectedProcedure
    .input(
      z.object({
        petId: z.number(),
        source: z.enum(["home", "daycare"]).optional(),
        startDate: z.string().or(z.date()).optional(),
        endDate: z.string().or(z.date()).optional(),
        limit: z.number().default(30),
      })
    )
    .query(async ({ input }) => {
      return safeAsync(async () => {
        let conditions = [eq(dailyLogs.petId, input.petId)];

        if (input.source) {
          conditions.push(eq(dailyLogs.source, input.source));
        }

        if (input.startDate) {
          conditions.push(gte(dailyLogs.logDate, new Date(input.startDate)));
        }

        if (input.endDate) {
          conditions.push(lte(dailyLogs.logDate, new Date(input.endDate)));
        }

        const result = await db
          .select({
            log: dailyLogs,
            createdBy: {
              id: users.id,
              name: users.name,
            },
          })
          .from(dailyLogs)
          .innerJoin(users, eq(dailyLogs.createdById, users.id))
          .where(and(...conditions))
          .orderBy(desc(dailyLogs.logDate))
          .limit(input.limit);

        return result;
      }, "Erro ao buscar logs do pet");
    }),

  /**
   * Busca log por ID
   */
  byId: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      return safeAsync(async () => {
        const [log] = await db
          .select({
            log: dailyLogs,
            pet: pets,
            createdBy: {
              id: users.id,
              name: users.name,
            },
          })
          .from(dailyLogs)
          .innerJoin(pets, eq(dailyLogs.petId, pets.id))
          .innerJoin(users, eq(dailyLogs.createdById, users.id))
          .where(eq(dailyLogs.id, input.id));

        if (!log) {
          throw Errors.notFound("Log");
        }

        return log;
      }, "Erro ao buscar log");
    }),

  /**
   * Atualiza log
   */
  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        mood: z.enum(["happy", "calm", "anxious", "tired", "agitated"]).optional(),
        stool: z.enum(["normal", "soft", "hard", "diarrhea", "none"]).optional(),
        appetite: z.enum(["good", "moderate", "poor", "none"]).optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      return safeAsync(async () => {
        const { id, ...data } = input;
        const updateData: Record<string, unknown> = {};

        if (data.mood !== undefined) updateData.mood = data.mood;
        if (data.stool !== undefined) updateData.stool = data.stool;
        if (data.appetite !== undefined) updateData.appetite = data.appetite;
        if (data.notes !== undefined) updateData.notes = data.notes;

        const [log] = await db
          .update(dailyLogs)
          .set(updateData)
          .where(eq(dailyLogs.id, id))
          .returning();

        return log;
      }, "Erro ao atualizar log");
    }),

  /**
   * Remove log
   */
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      return safeAsync(async () => {
        await db.delete(dailyLogs).where(eq(dailyLogs.id, input.id));
        return { success: true };
      }, "Erro ao remover log");
    }),

  /**
   * Lista todos os logs (admin)
   */
  list: adminProcedure
    .input(
      z.object({
        source: z.enum(["home", "daycare"]).optional(),
        date: z.string().or(z.date()).optional(),
        limit: z.number().default(50),
      })
    )
    .query(async ({ input }) => {
      return safeAsync(async () => {
        let conditions: ReturnType<typeof eq>[] = [];

        if (input.source) {
          conditions.push(eq(dailyLogs.source, input.source));
        }

        if (input.date) {
          const date = new Date(input.date);
          const startOfDay = new Date(date);
          startOfDay.setHours(0, 0, 0, 0);
          const endOfDay = new Date(date);
          endOfDay.setHours(23, 59, 59, 999);

          conditions.push(gte(dailyLogs.logDate, startOfDay));
          conditions.push(lte(dailyLogs.logDate, endOfDay));
        }

        const result = await db
          .select({
            log: dailyLogs,
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
          .from(dailyLogs)
          .innerJoin(pets, eq(dailyLogs.petId, pets.id))
          .innerJoin(users, eq(dailyLogs.createdById, users.id))
          .where(conditions.length > 0 ? and(...conditions) : undefined)
          .orderBy(desc(dailyLogs.logDate))
          .limit(input.limit);

        return result;
      }, "Erro ao listar logs");
    }),

  /**
   * Estatísticas de logs (admin)
   */
  stats: adminProcedure.query(async () => {
    return safeAsync(async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const [totalLogs] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(dailyLogs);

      const [todayLogs] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(dailyLogs)
        .where(gte(dailyLogs.logDate, today));

      const [daycareLogsToday] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(dailyLogs)
        .where(and(gte(dailyLogs.logDate, today), eq(dailyLogs.source, "daycare")));

      return {
        total: totalLogs.count,
        today: todayLogs.count,
        daycareToday: daycareLogsToday.count,
      };
    }, "Erro ao buscar estatísticas de logs");
  }),
});
