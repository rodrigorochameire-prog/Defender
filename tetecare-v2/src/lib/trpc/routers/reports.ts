import { z } from "zod";
import { router, protectedProcedure, adminProcedure } from "../init";
import { db, pets, petTutors, dailyLogs, petVaccinations, vaccineLibrary } from "@/lib/db";
import { eq, and, desc, gte, lte, sql } from "drizzle-orm";
import { safeAsync } from "@/lib/errors";

export const reportsRouter = router({
  /**
   * Relatório de um pet (tutor)
   */
  petReport: protectedProcedure
    .input(
      z.object({
        petId: z.number(),
        startDate: z.string().or(z.date()),
        endDate: z.string().or(z.date()),
      })
    )
    .query(async ({ ctx, input }) => {
      return safeAsync(async () => {
        // Verificar acesso
        if (ctx.user.role !== "admin") {
          const relation = await db.query.petTutors.findFirst({
            where: and(
              eq(petTutors.petId, input.petId),
              eq(petTutors.tutorId, ctx.user.id)
            ),
          });

          if (!relation) {
            throw new Error("Acesso negado");
          }
        }

        const startDate = new Date(input.startDate);
        const endDate = new Date(input.endDate);

        // Dados do pet
        const pet = await db.query.pets.findFirst({
          where: eq(pets.id, input.petId),
        });

        // Logs do período
        const logs = await db
          .select()
          .from(dailyLogs)
          .where(
            and(
              eq(dailyLogs.petId, input.petId),
              gte(dailyLogs.logDate, startDate),
              lte(dailyLogs.logDate, endDate)
            )
          )
          .orderBy(dailyLogs.logDate);

        // Vacinações do período
        const vaccinations = await db
          .select({
            vaccination: petVaccinations,
            vaccine: vaccineLibrary,
          })
          .from(petVaccinations)
          .innerJoin(vaccineLibrary, eq(petVaccinations.vaccineId, vaccineLibrary.id))
          .where(
            and(
              eq(petVaccinations.petId, input.petId),
              gte(petVaccinations.applicationDate, startDate),
              lte(petVaccinations.applicationDate, endDate)
            )
          )
          .orderBy(petVaccinations.applicationDate);

        // Análise de humor
        const moodCounts: Record<string, number> = {};
        const stoolCounts: Record<string, number> = {};
        const appetiteCounts: Record<string, number> = {};

        logs.forEach((log) => {
          if (log.mood) moodCounts[log.mood] = (moodCounts[log.mood] || 0) + 1;
          if (log.stool) stoolCounts[log.stool] = (stoolCounts[log.stool] || 0) + 1;
          if (log.appetite) appetiteCounts[log.appetite] = (appetiteCounts[log.appetite] || 0) + 1;
        });

        return {
          pet,
          period: {
            start: startDate.toISOString(),
            end: endDate.toISOString(),
          },
          summary: {
            totalLogs: logs.length,
            totalVaccinations: vaccinations.length,
            daycareCount: logs.filter(l => l.source === "daycare").length,
            homeCount: logs.filter(l => l.source === "home").length,
          },
          analysis: {
            mood: moodCounts,
            stool: stoolCounts,
            appetite: appetiteCounts,
          },
          logs,
          vaccinations,
        };
      }, "Erro ao gerar relatório do pet");
    }),

  /**
   * Relatório geral (admin)
   */
  generalReport: adminProcedure
    .input(
      z.object({
        startDate: z.string().or(z.date()),
        endDate: z.string().or(z.date()),
      })
    )
    .query(async ({ input }) => {
      return safeAsync(async () => {
        const startDate = new Date(input.startDate);
        const endDate = new Date(input.endDate);

        // Total de pets
        const [totalPets] = await db
          .select({ count: sql<number>`count(*)::int` })
          .from(pets);

        // Logs no período
        const [logsInPeriod] = await db
          .select({ count: sql<number>`count(*)::int` })
          .from(dailyLogs)
          .where(
            and(
              gte(dailyLogs.logDate, startDate),
              lte(dailyLogs.logDate, endDate)
            )
          );

        // Vacinações no período
        const [vaccinationsInPeriod] = await db
          .select({ count: sql<number>`count(*)::int` })
          .from(petVaccinations)
          .where(
            and(
              gte(petVaccinations.applicationDate, startDate),
              lte(petVaccinations.applicationDate, endDate)
            )
          );

        // Check-ins no período (baseado em logs de creche)
        const [checkInsInPeriod] = await db
          .select({ count: sql<number>`count(*)::int` })
          .from(dailyLogs)
          .where(
            and(
              eq(dailyLogs.source, "daycare"),
              gte(dailyLogs.logDate, startDate),
              lte(dailyLogs.logDate, endDate)
            )
          );

        // Top pets por frequência
        const topPets = await db
          .select({
            petId: dailyLogs.petId,
            petName: pets.name,
            count: sql<number>`count(*)::int`,
          })
          .from(dailyLogs)
          .innerJoin(pets, eq(dailyLogs.petId, pets.id))
          .where(
            and(
              eq(dailyLogs.source, "daycare"),
              gte(dailyLogs.logDate, startDate),
              lte(dailyLogs.logDate, endDate)
            )
          )
          .groupBy(dailyLogs.petId, pets.name)
          .orderBy(desc(sql`count(*)`))
          .limit(10);

        return {
          period: {
            start: startDate.toISOString(),
            end: endDate.toISOString(),
          },
          summary: {
            totalPets: totalPets.count,
            logsInPeriod: logsInPeriod.count,
            vaccinationsInPeriod: vaccinationsInPeriod.count,
            checkInsInPeriod: checkInsInPeriod.count,
          },
          topPets,
        };
      }, "Erro ao gerar relatório geral");
    }),

  /**
   * Relatório de ocupação (admin)
   */
  occupancyReport: adminProcedure
    .input(
      z.object({
        startDate: z.string().or(z.date()),
        endDate: z.string().or(z.date()),
      })
    )
    .query(async ({ input }) => {
      return safeAsync(async () => {
        const startDate = new Date(input.startDate);
        const endDate = new Date(input.endDate);

        // Ocupação diária
        const dailyOccupancy = await db
          .select({
            date: sql<string>`DATE(${dailyLogs.logDate})`,
            count: sql<number>`count(DISTINCT ${dailyLogs.petId})::int`,
          })
          .from(dailyLogs)
          .where(
            and(
              eq(dailyLogs.source, "daycare"),
              gte(dailyLogs.logDate, startDate),
              lte(dailyLogs.logDate, endDate)
            )
          )
          .groupBy(sql`DATE(${dailyLogs.logDate})`)
          .orderBy(sql`DATE(${dailyLogs.logDate})`);

        // Média de ocupação
        const avgOccupancy = dailyOccupancy.length > 0
          ? dailyOccupancy.reduce((acc, d) => acc + d.count, 0) / dailyOccupancy.length
          : 0;

        // Pico de ocupação
        const peakOccupancy = dailyOccupancy.length > 0
          ? Math.max(...dailyOccupancy.map(d => d.count))
          : 0;

        return {
          period: {
            start: startDate.toISOString(),
            end: endDate.toISOString(),
          },
          summary: {
            averageOccupancy: Math.round(avgOccupancy * 10) / 10,
            peakOccupancy,
            totalDays: dailyOccupancy.length,
          },
          dailyData: dailyOccupancy,
        };
      }, "Erro ao gerar relatório de ocupação");
    }),
});
