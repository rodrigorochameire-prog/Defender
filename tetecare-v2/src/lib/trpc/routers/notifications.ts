import { z } from "zod";
import { router, protectedProcedure, adminProcedure } from "../init";
import { db, notifications, users } from "@/lib/db";
import { eq, and, desc, sql } from "drizzle-orm";
import { Errors, safeAsync } from "@/lib/errors";
import { idSchema, notificationSchema } from "@/lib/validations";

export const notificationsRouter = router({
  /**
   * Lista notificações do usuário
   */
  list: protectedProcedure
    .input(
      z.object({
        unreadOnly: z.boolean().optional(),
        limit: z.number().min(1).max(100).optional(),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      return safeAsync(async () => {
        const userId = ctx.user!.id;

        let result = await db
          .select()
          .from(notifications)
          .where(eq(notifications.userId, userId))
          .orderBy(desc(notifications.createdAt))
          .limit(input?.limit || 50);

        if (input?.unreadOnly) {
          result = result.filter(n => !n.isRead);
        }

        return result;
      }, "Erro ao listar notificações");
    }),

  /**
   * Conta notificações não lidas
   */
  unreadCount: protectedProcedure.query(async ({ ctx }) => {
    return safeAsync(async () => {
      const userId = ctx.user!.id;

      const [result] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(notifications)
        .where(
          and(
            eq(notifications.userId, userId),
            eq(notifications.isRead, false)
          )
        );

      return result.count;
    }, "Erro ao contar notificações");
  }),

  /**
   * Marca notificação como lida
   */
  markAsRead: protectedProcedure
    .input(z.object({ id: idSchema }))
    .mutation(async ({ ctx, input }) => {
      return safeAsync(async () => {
        const userId = ctx.user!.id;

        const notification = await db.query.notifications.findFirst({
          where: and(
            eq(notifications.id, input.id),
            eq(notifications.userId, userId)
          ),
        });

        if (!notification) {
          throw Errors.notFound("Notificação");
        }

        const [updated] = await db
          .update(notifications)
          .set({ isRead: true })
          .where(eq(notifications.id, input.id))
          .returning();

        return updated;
      }, "Erro ao marcar notificação como lida");
    }),

  /**
   * Marca todas como lidas
   */
  markAllAsRead: protectedProcedure.mutation(async ({ ctx }) => {
    return safeAsync(async () => {
      const userId = ctx.user!.id;

      await db
        .update(notifications)
        .set({ isRead: true })
        .where(
          and(
            eq(notifications.userId, userId),
            eq(notifications.isRead, false)
          )
        );

      return { success: true };
    }, "Erro ao marcar todas notificações como lidas");
  }),

  /**
   * Deleta notificação
   */
  delete: protectedProcedure
    .input(z.object({ id: idSchema }))
    .mutation(async ({ ctx, input }) => {
      return safeAsync(async () => {
        const userId = ctx.user!.id;

        const notification = await db.query.notifications.findFirst({
          where: and(
            eq(notifications.id, input.id),
            eq(notifications.userId, userId)
          ),
        });

        if (!notification) {
          throw Errors.notFound("Notificação");
        }

        await db.delete(notifications).where(eq(notifications.id, input.id));

        return { success: true, deletedId: input.id };
      }, "Erro ao deletar notificação");
    }),

  /**
   * Limpa todas notificações lidas
   */
  clearRead: protectedProcedure.mutation(async ({ ctx }) => {
    return safeAsync(async () => {
      const userId = ctx.user!.id;

      await db
        .delete(notifications)
        .where(
          and(
            eq(notifications.userId, userId),
            eq(notifications.isRead, true)
          )
        );

      return { success: true };
    }, "Erro ao limpar notificações");
  }),

  /**
   * Envia notificação para um usuário (admin)
   */
  send: adminProcedure
    .input(notificationSchema)
    .mutation(async ({ input }) => {
      return safeAsync(async () => {
        // Verificar se usuário existe
        const user = await db.query.users.findFirst({
          where: eq(users.id, input.userId),
        });

        if (!user) {
          throw Errors.notFound("Usuário");
        }

        const [notification] = await db
          .insert(notifications)
          .values({
            userId: input.userId,
            title: input.title,
            message: input.message,
            type: input.type,
            actionUrl: input.actionUrl || null,
            isRead: false,
          })
          .returning();

        return notification;
      }, "Erro ao enviar notificação");
    }),

  /**
   * Envia notificação para todos os tutores (admin)
   */
  sendToAll: adminProcedure
    .input(
      z.object({
        title: z.string().min(1),
        message: z.string().min(1),
        type: z.enum(["info", "warning", "success", "error"]).default("info"),
        actionUrl: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      return safeAsync(async () => {
        // Buscar todos os tutores
        const tutors = await db
          .select({ id: users.id })
          .from(users)
          .where(eq(users.role, "user"));

        if (tutors.length === 0) {
          return { sent: 0 };
        }

        // Criar notificações para todos
        const notificationValues = tutors.map(tutor => ({
          userId: tutor.id,
          title: input.title,
          message: input.message,
          type: input.type,
          actionUrl: input.actionUrl || null,
          isRead: false,
        }));

        await db.insert(notifications).values(notificationValues);

        return { sent: tutors.length };
      }, "Erro ao enviar notificações");
    }),
});
