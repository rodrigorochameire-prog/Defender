import { z } from "zod";
import { router, protectedProcedure, adminProcedure } from "../init";
import { db, calendarEvents, processos, assistidos, demandas } from "@/lib/db";
import { eq, and, gte, lte, desc, sql } from "drizzle-orm";
import { Errors, safeAsync } from "@/lib/errors";
import { idSchema, calendarEventSchema } from "@/lib/validations";
import { startOfMonth, endOfMonth, startOfDay, endOfDay, addDays, addWeeks, addMonths, addYears } from "date-fns";

/**
 * Gera as datas de ocorrência para eventos recorrentes
 */
function generateRecurrenceOccurrences(
  startDate: Date,
  recurrenceType: string,
  interval: number,
  endDate: Date | null,
  maxCount: number,
  recurrenceDays?: string | null
): Date[] {
  const occurrences: Date[] = [startDate];
  let currentDate = new Date(startDate);
  const maxOccurrences = Math.min(maxCount, 100); // limite de segurança
  const limitDate = endDate || addYears(startDate, 1); // máximo 1 ano se não especificado

  while (occurrences.length < maxOccurrences) {
    switch (recurrenceType) {
      case "daily":
        currentDate = addDays(currentDate, interval);
        break;
      case "weekly":
        currentDate = addWeeks(currentDate, interval);
        break;
      case "biweekly":
        currentDate = addWeeks(currentDate, 2 * interval);
        break;
      case "monthly":
        currentDate = addMonths(currentDate, interval);
        break;
      case "yearly":
        currentDate = addYears(currentDate, interval);
        break;
      default:
        return occurrences;
    }

    if (currentDate > limitDate) break;
    occurrences.push(new Date(currentDate));
  }

  return occurrences;
}

// Tipos de eventos disponíveis para o contexto jurídico
export const EVENT_TYPES = {
  prazo: { label: "Prazo", color: "#ef4444" },
  audiencia: { label: "Audiência", color: "#3b82f6" },
  juri: { label: "Júri", color: "#8b5cf6" },
  reuniao: { label: "Reunião", color: "#f59e0b" },
  atendimento: { label: "Atendimento", color: "#22c55e" },
  visita: { label: "Visita Carcerária", color: "#14b8a6" },
  lembrete: { label: "Lembrete", color: "#6b7280" },
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
        processoId: idSchema.optional(),
        assistidoId: idSchema.optional(),
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
            processo: {
              id: processos.id,
              numeroAutos: processos.numeroAutos,
            },
            assistido: {
              id: assistidos.id,
              nome: assistidos.nome,
            },
          })
          .from(calendarEvents)
          .leftJoin(processos, eq(calendarEvents.processoId, processos.id))
          .leftJoin(assistidos, eq(calendarEvents.assistidoId, assistidos.id))
          .where(
            and(
              gte(calendarEvents.eventDate, startDate),
              lte(calendarEvents.eventDate, endDate)
            )
          )
          .orderBy(calendarEvents.eventDate);

        // Filtrar por processo específico
        if (input.processoId) {
          events = events.filter((e) => e.event.processoId === input.processoId);
        }

        // Filtrar por assistido específico
        if (input.assistidoId) {
          events = events.filter((e) => e.event.assistidoId === input.assistidoId);
        }

        return events.map((e) => ({
          ...e.event,
          processo: e.processo,
          assistido: e.assistido,
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

        const events = await db
          .select({
            event: calendarEvents,
            processo: {
              id: processos.id,
              numeroAutos: processos.numeroAutos,
            },
            assistido: {
              id: assistidos.id,
              nome: assistidos.nome,
            },
          })
          .from(calendarEvents)
          .leftJoin(processos, eq(calendarEvents.processoId, processos.id))
          .leftJoin(assistidos, eq(calendarEvents.assistidoId, assistidos.id))
          .where(
            and(
              gte(calendarEvents.eventDate, start),
              lte(calendarEvents.eventDate, end)
            )
          )
          .orderBy(calendarEvents.eventDate);

        return events.map((e) => ({
          ...e.event,
          processo: e.processo,
          assistido: e.assistido,
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

        // Buscar info do processo
        let processo = null;
        if (event.processoId) {
          processo = await db.query.processos.findFirst({
            where: eq(processos.id, event.processoId),
          });
        }

        // Buscar info do assistido
        let assistido = null;
        if (event.assistidoId) {
          assistido = await db.query.assistidos.findFirst({
            where: eq(assistidos.id, event.assistidoId),
          });
        }

        return {
          ...event,
          processo,
          assistido,
          typeInfo: EVENT_TYPES[event.eventType as keyof typeof EVENT_TYPES] || EVENT_TYPES.custom,
        };
      }, "Erro ao buscar evento");
    }),

  /**
   * Cria novo evento (com suporte a recorrência)
   */
  create: protectedProcedure
    .input(calendarEventSchema)
    .mutation(async ({ ctx, input }) => {
      return safeAsync(async () => {
        const eventColor = input.color || EVENT_TYPES[input.eventType as keyof typeof EVENT_TYPES]?.color || EVENT_TYPES.custom.color;

        // Criar evento principal
        const [event] = await db
          .insert(calendarEvents)
          .values({
            title: input.title,
            description: input.description || null,
            eventDate: new Date(input.eventDate),
            endDate: input.endDate ? new Date(input.endDate) : null,
            eventType: input.eventType,
            processoId: input.processoId || null,
            assistidoId: input.assistidoId || null,
            demandaId: input.demandaId || null,
            isAllDay: input.isAllDay,
            color: eventColor,
            location: input.location || null,
            notes: input.notes || null,
            reminderMinutes: input.reminderMinutes || null,
            priority: input.priority || "normal",
            status: input.status || "scheduled",
            isRecurring: input.isRecurring || false,
            recurrenceType: input.recurrenceType || null,
            recurrenceInterval: input.recurrenceInterval || 1,
            recurrenceEndDate: input.recurrenceEndDate ? new Date(input.recurrenceEndDate) : null,
            recurrenceCount: input.recurrenceCount || null,
            recurrenceDays: input.recurrenceDays || null,
            createdById: ctx.user.id,
          })
          .returning();

        // Se for evento recorrente, criar ocorrências futuras
        if (input.isRecurring && input.recurrenceType) {
          const occurrences = generateRecurrenceOccurrences(
            new Date(input.eventDate),
            input.recurrenceType,
            input.recurrenceInterval || 1,
            input.recurrenceEndDate ? new Date(input.recurrenceEndDate) : null,
            input.recurrenceCount || 52, // máximo de 52 ocorrências por padrão
            input.recurrenceDays
          );

          // Criar eventos filhos (pular o primeiro que já foi criado)
          for (const occurrence of occurrences.slice(1)) {
            await db.insert(calendarEvents).values({
              title: input.title,
              description: input.description || null,
              eventDate: occurrence,
              endDate: input.endDate ? new Date(occurrence.getTime() + (new Date(input.endDate).getTime() - new Date(input.eventDate).getTime())) : null,
              eventType: input.eventType,
              processoId: input.processoId || null,
              assistidoId: input.assistidoId || null,
              demandaId: input.demandaId || null,
              isAllDay: input.isAllDay,
              color: eventColor,
              location: input.location || null,
              notes: input.notes || null,
              reminderMinutes: input.reminderMinutes || null,
              priority: input.priority || "normal",
              status: "scheduled",
              isRecurring: true,
              recurrenceType: input.recurrenceType || null,
              parentEventId: event.id,
              createdById: ctx.user.id,
            });
          }
        }

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
        updateSeries: z.boolean().optional(), // Atualizar toda a série de eventos recorrentes
      })
    )
    .mutation(async ({ ctx, input }) => {
      return safeAsync(async () => {
        const { id, updateSeries, ...data } = input;

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
        const updateData: Record<string, unknown> = { updatedAt: new Date() };
        if (data.title) updateData.title = data.title;
        if (data.description !== undefined) updateData.description = data.description;
        if (data.eventDate) updateData.eventDate = new Date(data.eventDate);
        if (data.endDate) updateData.endDate = new Date(data.endDate);
        if (data.eventType) updateData.eventType = data.eventType;
        if (data.processoId !== undefined) updateData.processoId = data.processoId;
        if (data.assistidoId !== undefined) updateData.assistidoId = data.assistidoId;
        if (data.demandaId !== undefined) updateData.demandaId = data.demandaId;
        if (data.isAllDay !== undefined) updateData.isAllDay = data.isAllDay;
        if (data.color) updateData.color = data.color;
        if (data.location !== undefined) updateData.location = data.location;
        if (data.notes !== undefined) updateData.notes = data.notes;
        if (data.reminderMinutes !== undefined) updateData.reminderMinutes = data.reminderMinutes;
        if (data.priority !== undefined) updateData.priority = data.priority;
        if (data.status !== undefined) updateData.status = data.status;

        // Atualizar evento
        const [updated] = await db
          .update(calendarEvents)
          .set(updateData)
          .where(eq(calendarEvents.id, id))
          .returning();

        // Se solicitado, atualizar toda a série
        if (updateSeries && existing.parentEventId) {
          // Atualizar eventos filhos do mesmo pai
          await db
            .update(calendarEvents)
            .set({ title: data.title, description: data.description, color: data.color, location: data.location, notes: data.notes, priority: data.priority, updatedAt: new Date() })
            .where(eq(calendarEvents.parentEventId, existing.parentEventId));
        }

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

      const events = await db
        .select({
          event: calendarEvents,
          processo: {
            id: processos.id,
            numeroAutos: processos.numeroAutos,
          },
          assistido: {
            id: assistidos.id,
            nome: assistidos.nome,
          },
        })
        .from(calendarEvents)
        .leftJoin(processos, eq(calendarEvents.processoId, processos.id))
        .leftJoin(assistidos, eq(calendarEvents.assistidoId, assistidos.id))
        .where(
          and(
            gte(calendarEvents.eventDate, start),
            lte(calendarEvents.eventDate, end)
          )
        )
        .orderBy(calendarEvents.eventDate);

      return events.map((e) => ({
        ...e.event,
        processo: e.processo,
        assistido: e.assistido,
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
