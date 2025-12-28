import { z } from "zod";
import { router, protectedProcedure, adminProcedure } from "../init";
import { db, calendarEvents, pets, petTutors } from "@/lib/db";
import { eq, and, gte, lte, desc, sql } from "drizzle-orm";
import { Errors, safeAsync } from "@/lib/errors";
import { idSchema, calendarEventSchema } from "@/lib/validations";
import { startOfMonth, endOfMonth, startOfDay, endOfDay } from "date-fns";

// Tipos de eventos disponíveis
export const EVENT_TYPES = {
  checkin: { label: "Check-in", color: "#22c55e" },
  checkout: { label: "Check-out", color: "#ef4444" },
  vaccine: { label: "Vacina", color: "#3b82f6" },
  medication: { label: "Medicamento", color: "#f59e0b" },
  grooming: { label: "Banho/Tosa", color: "#8b5cf6" },
  vet: { label: "Veterinário", color: "#ec4899" },
  training: { label: "Adestramento", color: "#14b8a6" },
  custom: { label: "Outro", color: "#6b7280" },
} as const;

export const calendarRouter = router({
  /**
   * Lista eventos por período
   */
  list: protectedProcedure
    .input(
      z.object({
        start: z.string().datetime(),
        end: z.string().datetime(),
        petId: idSchema.optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      return safeAsync(async () => {
        const startDate = new Date(input.start);
        const endDate = new Date(input.end);

        // Base query
        let events = await db
          .select({
            event: calendarEvents,
            pet: {
              id: pets.id,
              name: pets.name,
              species: pets.species,
            },
          })
          .from(calendarEvents)
          .leftJoin(pets, eq(calendarEvents.petId, pets.id))
          .where(
            and(
              gte(calendarEvents.eventDate, startDate),
              lte(calendarEvents.eventDate, endDate)
            )
          )
          .orderBy(calendarEvents.eventDate);

        // Se não for admin, filtrar apenas pets do usuário
        if (ctx.user.role !== "admin") {
          const userPetIds = await db
            .select({ petId: petTutors.petId })
            .from(petTutors)
            .where(eq(petTutors.tutorId, ctx.user.id));

          const petIds = new Set(userPetIds.map((p) => p.petId));

          events = events.filter(
            (e) => e.event.petId === null || petIds.has(e.event.petId)
          );
        }

        // Filtrar por pet específico
        if (input.petId) {
          events = events.filter((e) => e.event.petId === input.petId);
        }

        return events.map((e) => ({
          ...e.event,
          pet: e.pet,
          typeInfo: EVENT_TYPES[e.event.eventType as keyof typeof EVENT_TYPES] || EVENT_TYPES.custom,
        }));
      }, "Erro ao listar eventos");
    }),

  /**
   * Lista eventos do mês atual
   */
  currentMonth: protectedProcedure
    .input(
      z
        .object({
          month: z.number().min(0).max(11).optional(),
          year: z.number().optional(),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      return safeAsync(async () => {
        const now = new Date();
        const month = input?.month ?? now.getMonth();
        const year = input?.year ?? now.getFullYear();

        const start = startOfMonth(new Date(year, month));
        const end = endOfMonth(new Date(year, month));

        let events = await db
          .select({
            event: calendarEvents,
            pet: {
              id: pets.id,
              name: pets.name,
              species: pets.species,
            },
          })
          .from(calendarEvents)
          .leftJoin(pets, eq(calendarEvents.petId, pets.id))
          .where(
            and(
              gte(calendarEvents.eventDate, start),
              lte(calendarEvents.eventDate, end)
            )
          )
          .orderBy(calendarEvents.eventDate);

        // Se não for admin, filtrar apenas pets do usuário
        if (ctx.user.role !== "admin") {
          const userPetIds = await db
            .select({ petId: petTutors.petId })
            .from(petTutors)
            .where(eq(petTutors.tutorId, ctx.user.id));

          const petIds = new Set(userPetIds.map((p) => p.petId));

          events = events.filter(
            (e) => e.event.petId === null || petIds.has(e.event.petId)
          );
        }

        return events.map((e) => ({
          ...e.event,
          pet: e.pet,
          typeInfo: EVENT_TYPES[e.event.eventType as keyof typeof EVENT_TYPES] || EVENT_TYPES.custom,
        }));
      }, "Erro ao listar eventos do mês");
    }),

  /**
   * Busca evento por ID
   */
  byId: protectedProcedure
    .input(z.object({ id: idSchema }))
    .query(async ({ ctx, input }) => {
      return safeAsync(async () => {
        const event = await db.query.calendarEvents.findFirst({
          where: eq(calendarEvents.id, input.id),
        });

        if (!event) {
          throw Errors.notFound("Evento");
        }

        // Verificar permissão
        if (ctx.user.role !== "admin" && event.petId) {
          const relation = await db.query.petTutors.findFirst({
            where: and(
              eq(petTutors.petId, event.petId),
              eq(petTutors.tutorId, ctx.user.id)
            ),
          });

          if (!relation) {
            throw Errors.forbidden();
          }
        }

        // Buscar info do pet
        let pet = null;
        if (event.petId) {
          pet = await db.query.pets.findFirst({
            where: eq(pets.id, event.petId),
          });
        }

        return {
          ...event,
          pet,
          typeInfo: EVENT_TYPES[event.eventType as keyof typeof EVENT_TYPES] || EVENT_TYPES.custom,
        };
      }, "Erro ao buscar evento");
    }),

  /**
   * Cria novo evento
   */
  create: protectedProcedure
    .input(calendarEventSchema)
    .mutation(async ({ ctx, input }) => {
      return safeAsync(async () => {
        // Verificar permissão para o pet
        if (input.petId && ctx.user.role !== "admin") {
          const relation = await db.query.petTutors.findFirst({
            where: and(
              eq(petTutors.petId, input.petId),
              eq(petTutors.tutorId, ctx.user.id)
            ),
          });

          if (!relation) {
            throw Errors.forbidden();
          }
        }

        const [event] = await db
          .insert(calendarEvents)
          .values({
            title: input.title,
            description: input.description || null,
            eventDate: new Date(input.eventDate),
            endDate: input.endDate ? new Date(input.endDate) : null,
            eventType: input.eventType,
            petId: input.petId || null,
            isAllDay: input.isAllDay,
            color: input.color || EVENT_TYPES[input.eventType as keyof typeof EVENT_TYPES]?.color || EVENT_TYPES.custom.color,
            createdById: ctx.user.id,
          })
          .returning();

        return event;
      }, "Erro ao criar evento");
    }),

  /**
   * Atualiza evento
   */
  update: protectedProcedure
    .input(
      calendarEventSchema.partial().extend({
        id: idSchema,
      })
    )
    .mutation(async ({ ctx, input }) => {
      return safeAsync(async () => {
        const { id, ...data } = input;

        // Verificar se evento existe
        const existing = await db.query.calendarEvents.findFirst({
          where: eq(calendarEvents.id, id),
        });

        if (!existing) {
          throw Errors.notFound("Evento");
        }

        // Verificar permissão
        if (ctx.user.role !== "admin" && existing.createdById !== ctx.user.id) {
          throw Errors.forbidden();
        }

        // Preparar dados
        const updateData: Record<string, unknown> = {};
        if (data.title) updateData.title = data.title;
        if (data.description !== undefined) updateData.description = data.description;
        if (data.eventDate) updateData.eventDate = new Date(data.eventDate);
        if (data.endDate) updateData.endDate = new Date(data.endDate);
        if (data.eventType) updateData.eventType = data.eventType;
        if (data.petId !== undefined) updateData.petId = data.petId;
        if (data.isAllDay !== undefined) updateData.isAllDay = data.isAllDay;
        if (data.color) updateData.color = data.color;

        const [updated] = await db
          .update(calendarEvents)
          .set(updateData)
          .where(eq(calendarEvents.id, id))
          .returning();

        return updated;
      }, "Erro ao atualizar evento");
    }),

  /**
   * Deleta evento
   */
  delete: protectedProcedure
    .input(z.object({ id: idSchema }))
    .mutation(async ({ ctx, input }) => {
      return safeAsync(async () => {
        const existing = await db.query.calendarEvents.findFirst({
          where: eq(calendarEvents.id, input.id),
        });

        if (!existing) {
          throw Errors.notFound("Evento");
        }

        // Verificar permissão
        if (ctx.user.role !== "admin" && existing.createdById !== ctx.user.id) {
          throw Errors.forbidden();
        }

        await db.delete(calendarEvents).where(eq(calendarEvents.id, input.id));

        return { success: true, deletedId: input.id };
      }, "Erro ao excluir evento");
    }),

  /**
   * Eventos de hoje
   */
  today: protectedProcedure.query(async ({ ctx }) => {
    return safeAsync(async () => {
      const now = new Date();
      const start = startOfDay(now);
      const end = endOfDay(now);

      let events = await db
        .select({
          event: calendarEvents,
          pet: {
            id: pets.id,
            name: pets.name,
            species: pets.species,
          },
        })
        .from(calendarEvents)
        .leftJoin(pets, eq(calendarEvents.petId, pets.id))
        .where(
          and(
            gte(calendarEvents.eventDate, start),
            lte(calendarEvents.eventDate, end)
          )
        )
        .orderBy(calendarEvents.eventDate);

      // Se não for admin, filtrar apenas pets do usuário
      if (ctx.user.role !== "admin") {
        const userPetIds = await db
          .select({ petId: petTutors.petId })
          .from(petTutors)
          .where(eq(petTutors.tutorId, ctx.user.id));

        const petIds = new Set(userPetIds.map((p) => p.petId));

        events = events.filter(
          (e) => e.event.petId === null || petIds.has(e.event.petId)
        );
      }

      return events.map((e) => ({
        ...e.event,
        pet: e.pet,
        typeInfo: EVENT_TYPES[e.event.eventType as keyof typeof EVENT_TYPES] || EVENT_TYPES.custom,
      }));
    }, "Erro ao listar eventos de hoje");
  }),

  /**
   * Tipos de eventos disponíveis
   */
  eventTypes: protectedProcedure.query(() => {
    return Object.entries(EVENT_TYPES).map(([key, value]) => ({
      value: key,
      ...value,
    }));
  }),
});
