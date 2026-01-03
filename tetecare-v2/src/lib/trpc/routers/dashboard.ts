import { z } from "zod";
import { router, adminProcedure, protectedProcedure } from "../init";
import { db, pets, petTutors, users, calendarEvents, dailyLogs, petVaccinations, vaccineLibrary, notifications } from "@/lib/db";
import { eq, and, desc, gte, lte, sql, count } from "drizzle-orm";
import { safeAsync } from "@/lib/errors";

export const dashboardRouter = router({
  /**
   * Estatísticas do dashboard admin
   */
  stats: adminProcedure.query(async () => {
    return safeAsync(async () => {
      // Total de pets
      const [totalPets] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(pets);

      // Pets na creche (checked-in)
      const [checkedIn] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(pets)
        .where(eq(pets.status, "checked-in"));

      // Total de tutores
      const [totalTutors] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(users)
        .where(eq(users.role, "user"));

      // Pets pendentes de aprovação
      const [pendingApproval] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(pets)
        .where(eq(pets.approvalStatus, "pending"));

      // Logs de hoje
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const [logsToday] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(dailyLogs)
        .where(gte(dailyLogs.logDate, today));

      // Receita mensal (aproximada pelos créditos)
      const [monthlyCredits] = await db
        .select({ total: sql<number>`COALESCE(sum(credits), 0)::int` })
        .from(pets);

      return {
        totalPets: totalPets.count,
        checkedIn: checkedIn.count,
        totalTutors: totalTutors.count,
        pendingApproval: pendingApproval.count,
        logsToday: logsToday.count,
        monthlyRevenue: (monthlyCredits.total || 0) * 5000, // Estimativa: R$50 por crédito
      };
    }, "Erro ao buscar estatísticas");
  }),

  /**
   * Pets na creche agora
   */
  checkedInPets: adminProcedure.query(async () => {
    return safeAsync(async () => {
      const result = await db
        .select()
        .from(pets)
        .where(eq(pets.status, "checked-in"))
        .orderBy(pets.name);

      return result;
    }, "Erro ao buscar pets na creche");
  }),

  /**
   * Eventos recentes do calendário
   */
  recentEvents: adminProcedure
    .input(z.object({ limit: z.number().default(5) }))
    .query(async ({ input }) => {
      return safeAsync(async () => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const result = await db
          .select({
            event: calendarEvents,
            pet: {
              id: pets.id,
              name: pets.name,
            },
          })
          .from(calendarEvents)
          .leftJoin(pets, eq(calendarEvents.petId, pets.id))
          .where(gte(calendarEvents.eventDate, today))
          .orderBy(calendarEvents.eventDate)
          .limit(input.limit);

        return result;
      }, "Erro ao buscar eventos recentes");
    }),

  /**
   * Dashboard do tutor
   */
  tutorStats: protectedProcedure.query(async ({ ctx }) => {
    return safeAsync(async () => {
      // Pets do tutor
      const myPets = await db
        .select({
          pet: pets,
        })
        .from(pets)
        .innerJoin(petTutors, eq(pets.id, petTutors.petId))
        .where(eq(petTutors.tutorId, ctx.user.id));

      // Total de créditos
      const totalCredits = myPets.reduce((acc, p) => acc + (p.pet.credits || 0), 0);

      // Próximas vacinas (próximos 30 dias)
      const petIds = myPets.map(p => p.pet.id);
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

      let upcomingVaccines = 0;
      if (petIds.length > 0) {
        const [result] = await db
          .select({ count: sql<number>`count(*)::int` })
          .from(petVaccinations)
          .where(
            and(
              sql`${petVaccinations.petId} = ANY(${petIds})`,
              gte(petVaccinations.nextDueDate, new Date()),
              lte(petVaccinations.nextDueDate, thirtyDaysFromNow)
            )
          );
        upcomingVaccines = result?.count || 0;
      }

      // Notificações não lidas
      const [unreadNotifications] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(notifications)
        .where(
          and(
            eq(notifications.userId, ctx.user.id),
            eq(notifications.isRead, false)
          )
        );

      return {
        totalPets: myPets.length,
        totalCredits,
        upcomingVaccines,
        unreadNotifications: unreadNotifications?.count || 0,
        pets: myPets.map(p => p.pet),
      };
    }, "Erro ao buscar estatísticas do tutor");
  }),

  /**
   * Atividade recente (admin)
   */
  recentActivity: adminProcedure
    .input(z.object({ limit: z.number().default(10) }))
    .query(async ({ input }) => {
      return safeAsync(async () => {
        // Logs recentes
        const recentLogs = await db
          .select({
            id: dailyLogs.id,
            type: sql<string>`'log'`,
            date: dailyLogs.logDate,
            petId: dailyLogs.petId,
            petName: pets.name,
            description: sql<string>`'Log diário registrado'`,
          })
          .from(dailyLogs)
          .innerJoin(pets, eq(dailyLogs.petId, pets.id))
          .orderBy(desc(dailyLogs.createdAt))
          .limit(input.limit);

        return recentLogs;
      }, "Erro ao buscar atividade recente");
    }),
});
