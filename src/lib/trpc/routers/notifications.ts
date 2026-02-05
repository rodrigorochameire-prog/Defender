import { z } from "zod";
import { router, protectedProcedure, adminProcedure } from "../init";
import { db, notifications, users, demandas } from "@/lib/db";
import { eq, and, desc, sql, ne, lte, gte, or } from "drizzle-orm";
import { Errors, safeAsync } from "@/lib/errors";
import { idSchema, notificationSchema } from "@/lib/validations";
import { inngest } from "@/lib/inngest/client";

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
   * Dispara verificação de prazos críticos e gera notificações
   */
  checkPrazosCriticos: protectedProcedure.mutation(async ({ ctx }) => {
    return safeAsync(async () => {
      const userId = ctx.user!.id;

      // Disparar via Inngest para processamento assíncrono
      await inngest.send({
        name: "prazos/check",
        data: { userId },
      });

      return {
        success: true,
        message: "Verificação de prazos iniciada. Você receberá notificações em breve."
      };
    }, "Erro ao verificar prazos");
  }),

  /**
   * Retorna resumo de prazos críticos (sem criar notificações)
   */
  resumoPrazos: protectedProcedure.query(async ({ ctx }) => {
    return safeAsync(async () => {
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);

      const em7dias = new Date(hoje);
      em7dias.setDate(em7dias.getDate() + 7);

      // Buscar demandas com prazos críticos
      const demandasCriticas = await db.query.demandas.findMany({
        where: and(
          or(
            lte(demandas.prazo, em7dias.toISOString().split("T")[0]),
            lte(demandas.prazoFinal, em7dias)
          ),
          sql`${demandas.status} NOT IN ('CONCLUIDO', 'ARQUIVADO', '7_PROTOCOLADO', '7_CIENCIA')`
        ),
        with: {
          assistido: true,
        },
      });

      // Categorizar
      let vencidos = 0;
      let venceHoje = 0;
      let proximosDias = 0;
      let reuPresoVencido = 0;
      let reuPresoCritico = 0;

      for (const d of demandasCriticas) {
        const prazo = d.prazoFinal || (d.prazo ? new Date(d.prazo) : null);
        if (!prazo) continue;

        const prazoDate = new Date(prazo);
        prazoDate.setHours(0, 0, 0, 0);

        const diffDias = Math.ceil((prazoDate.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));

        if (diffDias < 0) {
          vencidos++;
          if (d.reuPreso) reuPresoVencido++;
        } else if (diffDias === 0) {
          venceHoje++;
          if (d.reuPreso) reuPresoCritico++;
        } else if (diffDias <= 7) {
          proximosDias++;
          if (d.reuPreso && diffDias <= 3) reuPresoCritico++;
        }
      }

      return {
        total: demandasCriticas.length,
        vencidos,
        venceHoje,
        proximosDias,
        reuPresoVencido,
        reuPresoCritico,
      };
    }, "Erro ao buscar resumo de prazos");
  }),

  /**
   * Envia notificação para todos os usuários internos (admin)
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
        // Buscar todos os usuários não-admin
        const recipients = await db
          .select({ id: users.id })
          .from(users)
          .where(ne(users.role, "admin"));

        if (recipients.length === 0) {
          return { sent: 0 };
        }

        // Criar notificações para todos
        const notificationValues = recipients.map(recipient => ({
          userId: recipient.id,
          title: input.title,
          message: input.message,
          type: input.type,
          actionUrl: input.actionUrl || null,
          isRead: false,
        }));

        await db.insert(notifications).values(notificationValues);

        return { sent: recipients.length };
      }, "Erro ao enviar notificações");
    }),
});
