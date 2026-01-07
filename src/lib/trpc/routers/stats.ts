import { router, adminProcedure, protectedProcedure } from "../init";
import { db, users, pets, petTutors, calendarEvents, bookingRequests, notifications } from "@/lib/db";
import { eq, and, gte, lte, sql, desc } from "drizzle-orm";
import { safeAsync } from "@/lib/errors";
import { startOfDay, endOfDay, subDays, startOfMonth, endOfMonth } from "date-fns";

export const statsRouter = router({
  /**
   * Estatísticas gerais do sistema (admin)
   */
  dashboard: adminProcedure.query(async () => {
    return safeAsync(async () => {
      // Total de pets
      const [totalPets] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(pets);

      // Pets pendentes
      const [pendingPets] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(pets)
        .where(eq(pets.approvalStatus, "pending"));

      // Pets aprovados
      const [approvedPets] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(pets)
        .where(eq(pets.approvalStatus, "approved"));

      // Total de tutores
      const [totalTutors] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(users)
        .where(eq(users.role, "user"));

      // Reservas pendentes
      const [pendingBookings] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(bookingRequests)
        .where(eq(bookingRequests.status, "pending"));

      // Eventos hoje
      const now = new Date();
      const [todayEvents] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(calendarEvents)
        .where(
          and(
            gte(calendarEvents.eventDate, startOfDay(now)),
            lte(calendarEvents.eventDate, endOfDay(now))
          )
        );

      // Pets por espécie
      const petsBySpecies = await db
        .select({
          species: pets.species,
          count: sql<number>`count(*)::int`,
        })
        .from(pets)
        .where(eq(pets.approvalStatus, "approved"))
        .groupBy(pets.species);

      // Novos tutores esta semana
      const weekAgo = subDays(now, 7);
      const [newTutorsThisWeek] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(users)
        .where(
          and(
            eq(users.role, "user"),
            gte(users.createdAt, weekAgo)
          )
        );

      // Últimos pets cadastrados
      const recentPets = await db
        .select({
          id: pets.id,
          name: pets.name,
          species: pets.species,
          approvalStatus: pets.approvalStatus,
          createdAt: pets.createdAt,
        })
        .from(pets)
        .orderBy(desc(pets.createdAt))
        .limit(5);

      return {
        totalPets: totalPets.count,
        pendingPets: pendingPets.count,
        approvedPets: approvedPets.count,
        totalTutors: totalTutors.count,
        pendingBookings: pendingBookings.count,
        todayEvents: todayEvents.count,
        newTutorsThisWeek: newTutorsThisWeek.count,
        petsBySpecies: petsBySpecies.reduce((acc, curr) => {
          acc[curr.species] = curr.count;
          return acc;
        }, {} as Record<string, number>),
        recentPets,
      };
    }, "Erro ao buscar estatísticas");
  }),

  /**
   * Estatísticas do tutor logado
   */
  myStats: protectedProcedure.query(async ({ ctx }) => {
    return safeAsync(async () => {
      const userId = ctx.user!.id;

      // Meus pets
      const myPets = await db
        .select({
          id: pets.id,
          name: pets.name,
          species: pets.species,
          credits: pets.credits,
          approvalStatus: pets.approvalStatus,
        })
        .from(petTutors)
        .innerJoin(pets, eq(petTutors.petId, pets.id))
        .where(eq(petTutors.tutorId, userId));

      const totalPets = myPets.length;
      const approvedPets = myPets.filter(p => p.approvalStatus === "approved").length;
      const pendingPets = myPets.filter(p => p.approvalStatus === "pending").length;
      const totalCredits = myPets.reduce((sum, pet) => sum + pet.credits, 0);

      // Notificações não lidas
      const [unreadNotifications] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(notifications)
        .where(
          and(
            eq(notifications.userId, userId),
            eq(notifications.isRead, false)
          )
        );

      // Próximos eventos
      const now = new Date();
      const monthEnd = endOfMonth(now);
      const upcomingEvents = await db
        .select({
          id: calendarEvents.id,
          title: calendarEvents.title,
          eventDate: calendarEvents.eventDate,
          eventType: calendarEvents.eventType,
          color: calendarEvents.color,
        })
        .from(calendarEvents)
        .where(
          and(
            gte(calendarEvents.eventDate, now),
            lte(calendarEvents.eventDate, monthEnd)
          )
        )
        .orderBy(calendarEvents.eventDate)
        .limit(5);

      // Reservas ativas
      const [activeBookings] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(bookingRequests)
        .where(
          and(
            eq(bookingRequests.tutorId, userId),
            eq(bookingRequests.status, "approved")
          )
        );

      return {
        totalPets,
        approvedPets,
        pendingPets,
        totalCredits,
        unreadNotifications: unreadNotifications.count,
        activeBookings: activeBookings.count,
        upcomingEvents,
        pets: myPets,
      };
    }, "Erro ao buscar suas estatísticas");
  }),

  /**
   * Resumo mensal (admin)
   */
  monthlyReport: adminProcedure.query(async () => {
    return safeAsync(async () => {
      const now = new Date();
      const monthStart = startOfMonth(now);
      const monthEnd = endOfMonth(now);

      // Novos pets este mês
      const [newPets] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(pets)
        .where(gte(pets.createdAt, monthStart));

      // Novos tutores este mês
      const [newTutors] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(users)
        .where(
          and(
            eq(users.role, "user"),
            gte(users.createdAt, monthStart)
          )
        );

      // Reservas este mês
      const [monthBookings] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(bookingRequests)
        .where(gte(bookingRequests.createdAt, monthStart));

      // Eventos este mês
      const [monthEvents] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(calendarEvents)
        .where(
          and(
            gte(calendarEvents.eventDate, monthStart),
            lte(calendarEvents.eventDate, monthEnd)
          )
        );

      return {
        month: now.getMonth() + 1,
        year: now.getFullYear(),
        newPets: newPets.count,
        newTutors: newTutors.count,
        totalBookings: monthBookings.count,
        totalEvents: monthEvents.count,
      };
    }, "Erro ao gerar relatório mensal");
  }),
});
