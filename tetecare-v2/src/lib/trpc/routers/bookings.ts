import { z } from "zod";
import { router, protectedProcedure, adminProcedure } from "../init";
import { db, bookingRequests, pets, petTutors, users } from "@/lib/db";
import { eq, and, desc, gte, lte, sql } from "drizzle-orm";
import { Errors, safeAsync } from "@/lib/errors";
import { idSchema, bookingRequestSchema } from "@/lib/validations";

export const bookingsRouter = router({
  /**
   * Lista reservas do tutor
   */
  myBookings: protectedProcedure
    .input(
      z.object({
        status: z.enum(["pending", "approved", "rejected", "cancelled", "completed"]).optional(),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      return safeAsync(async () => {
        const userId = ctx.user!.id;

        let query = db
          .select({
            booking: bookingRequests,
            pet: {
              id: pets.id,
              name: pets.name,
              species: pets.species,
            },
          })
          .from(bookingRequests)
          .innerJoin(pets, eq(bookingRequests.petId, pets.id))
          .where(eq(bookingRequests.tutorId, userId))
          .orderBy(desc(bookingRequests.createdAt));

        const bookings = await query;

        // Filtrar por status se especificado
        if (input?.status) {
          return bookings.filter(b => b.booking.status === input.status);
        }

        return bookings;
      }, "Erro ao listar suas reservas");
    }),

  /**
   * Lista todas as reservas (admin)
   */
  list: adminProcedure
    .input(
      z.object({
        status: z.enum(["pending", "approved", "rejected", "cancelled", "completed"]).optional(),
      }).optional()
    )
    .query(async ({ input }) => {
      return safeAsync(async () => {
        const bookings = await db
          .select({
            booking: bookingRequests,
            pet: {
              id: pets.id,
              name: pets.name,
              species: pets.species,
            },
            tutor: {
              id: users.id,
              name: users.name,
              email: users.email,
            },
          })
          .from(bookingRequests)
          .innerJoin(pets, eq(bookingRequests.petId, pets.id))
          .innerJoin(users, eq(bookingRequests.tutorId, users.id))
          .orderBy(desc(bookingRequests.createdAt));

        if (input?.status) {
          return bookings.filter(b => b.booking.status === input.status);
        }

        return bookings;
      }, "Erro ao listar reservas");
    }),

  /**
   * Reservas pendentes (admin)
   */
  pending: adminProcedure.query(async () => {
    return safeAsync(async () => {
      const bookings = await db
        .select({
          booking: bookingRequests,
          pet: {
            id: pets.id,
            name: pets.name,
            species: pets.species,
          },
          tutor: {
            id: users.id,
            name: users.name,
            email: users.email,
            phone: users.phone,
          },
        })
        .from(bookingRequests)
        .innerJoin(pets, eq(bookingRequests.petId, pets.id))
        .innerJoin(users, eq(bookingRequests.tutorId, users.id))
        .where(eq(bookingRequests.status, "pending"))
        .orderBy(bookingRequests.startDate);

      return bookings;
    }, "Erro ao listar reservas pendentes");
  }),

  /**
   * Buscar reserva por ID
   */
  byId: protectedProcedure
    .input(z.object({ id: idSchema }))
    .query(async ({ ctx, input }) => {
      return safeAsync(async () => {
        const booking = await db.query.bookingRequests.findFirst({
          where: eq(bookingRequests.id, input.id),
        });

        if (!booking) {
          throw Errors.notFound("Reserva");
        }

        // Verificar permissão
        if (ctx.user!.role !== "admin" && booking.tutorId !== ctx.user!.id) {
          throw Errors.forbidden();
        }

        // Buscar pet e tutor
        const pet = await db.query.pets.findFirst({
          where: eq(pets.id, booking.petId),
        });

        const tutor = await db.query.users.findFirst({
          where: eq(users.id, booking.tutorId),
        });

        return {
          ...booking,
          pet,
          tutor: tutor ? { id: tutor.id, name: tutor.name, email: tutor.email, phone: tutor.phone } : null,
        };
      }, "Erro ao buscar reserva");
    }),

  /**
   * Criar reserva
   */
  create: protectedProcedure
    .input(bookingRequestSchema)
    .mutation(async ({ ctx, input }) => {
      return safeAsync(async () => {
        const userId = ctx.user!.id;

        // Verificar se o pet pertence ao usuário
        const relation = await db.query.petTutors.findFirst({
          where: and(
            eq(petTutors.petId, input.petId),
            eq(petTutors.tutorId, userId)
          ),
        });

        if (!relation && ctx.user!.role !== "admin") {
          throw Errors.forbidden();
        }

        // Verificar se pet está aprovado
        const pet = await db.query.pets.findFirst({
          where: eq(pets.id, input.petId),
        });

        if (!pet) {
          throw Errors.notFound("Pet");
        }

        if (pet.approvalStatus !== "approved") {
          throw Errors.badRequest("O pet precisa estar aprovado para fazer reservas");
        }

        // Criar reserva
        const [booking] = await db
          .insert(bookingRequests)
          .values({
            petId: input.petId,
            tutorId: userId,
            startDate: new Date(input.startDate),
            endDate: new Date(input.endDate),
            requestType: input.requestType,
            notes: input.notes || null,
            status: "pending",
          })
          .returning();

        return booking;
      }, "Erro ao criar reserva");
    }),

  /**
   * Aprovar reserva (admin)
   */
  approve: adminProcedure
    .input(z.object({ id: idSchema }))
    .mutation(async ({ input }) => {
      return safeAsync(async () => {
        const [updated] = await db
          .update(bookingRequests)
          .set({
            status: "approved",
            updatedAt: new Date(),
          })
          .where(eq(bookingRequests.id, input.id))
          .returning();

        if (!updated) {
          throw Errors.notFound("Reserva");
        }

        // TODO: Enviar notificação ao tutor

        return updated;
      }, "Erro ao aprovar reserva");
    }),

  /**
   * Rejeitar reserva (admin)
   */
  reject: adminProcedure
    .input(z.object({
      id: idSchema,
      rejectionReason: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      return safeAsync(async () => {
        const [updated] = await db
          .update(bookingRequests)
          .set({
            status: "rejected",
            rejectionReason: input.rejectionReason || null,
            updatedAt: new Date(),
          })
          .where(eq(bookingRequests.id, input.id))
          .returning();

        if (!updated) {
          throw Errors.notFound("Reserva");
        }

        // TODO: Enviar notificação ao tutor

        return updated;
      }, "Erro ao rejeitar reserva");
    }),

  /**
   * Cancelar reserva
   */
  cancel: protectedProcedure
    .input(z.object({ id: idSchema }))
    .mutation(async ({ ctx, input }) => {
      return safeAsync(async () => {
        const booking = await db.query.bookingRequests.findFirst({
          where: eq(bookingRequests.id, input.id),
        });

        if (!booking) {
          throw Errors.notFound("Reserva");
        }

        // Verificar permissão
        if (ctx.user!.role !== "admin" && booking.tutorId !== ctx.user!.id) {
          throw Errors.forbidden();
        }

        // Não pode cancelar reserva já concluída
        if (booking.status === "completed") {
          throw Errors.badRequest("Não é possível cancelar reserva já concluída");
        }

        const [updated] = await db
          .update(bookingRequests)
          .set({
            status: "cancelled",
            updatedAt: new Date(),
          })
          .where(eq(bookingRequests.id, input.id))
          .returning();

        return updated;
      }, "Erro ao cancelar reserva");
    }),

  /**
   * Marcar como concluída (admin)
   */
  complete: adminProcedure
    .input(z.object({ id: idSchema }))
    .mutation(async ({ input }) => {
      return safeAsync(async () => {
        const booking = await db.query.bookingRequests.findFirst({
          where: eq(bookingRequests.id, input.id),
        });

        if (!booking) {
          throw Errors.notFound("Reserva");
        }

        if (booking.status !== "approved") {
          throw Errors.badRequest("Apenas reservas aprovadas podem ser concluídas");
        }

        const [updated] = await db
          .update(bookingRequests)
          .set({
            status: "completed",
            updatedAt: new Date(),
          })
          .where(eq(bookingRequests.id, input.id))
          .returning();

        return updated;
      }, "Erro ao concluir reserva");
    }),

  /**
   * Estatísticas de reservas
   */
  stats: adminProcedure.query(async () => {
    return safeAsync(async () => {
      const [total] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(bookingRequests);

      const [pending] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(bookingRequests)
        .where(eq(bookingRequests.status, "pending"));

      const [approved] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(bookingRequests)
        .where(eq(bookingRequests.status, "approved"));

      const [completed] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(bookingRequests)
        .where(eq(bookingRequests.status, "completed"));

      return {
        total: total.count,
        pending: pending.count,
        approved: approved.count,
        completed: completed.count,
      };
    }, "Erro ao buscar estatísticas de reservas");
  }),
});
