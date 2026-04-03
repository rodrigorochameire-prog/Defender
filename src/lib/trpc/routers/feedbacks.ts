import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../init";
import { db, feedbacks, users } from "@/lib/db";
import { eq, and, desc } from "drizzle-orm";
import { createJiraTicket } from "@/lib/jira/create-ticket";

export const feedbacksRouter = router({
  // Create feedback — any authenticated user
  create: protectedProcedure
    .input(
      z.object({
        tipo: z.enum(["bug", "sugestao", "duvida"]),
        mensagem: z.string().min(1).max(500),
        pagina: z.string().optional(),
        contexto: z
          .object({
            viewport: z.string().optional(),
            userAgent: z.string().optional(),
            consoleErrors: z.array(z.string()).optional(),
          })
          .optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const [feedback] = await db
        .insert(feedbacks)
        .values({
          userId: ctx.user.id,
          tipo: input.tipo,
          mensagem: input.mensagem,
          pagina: input.pagina,
          contexto: input.contexto,
        })
        .returning();

      return feedback;
    }),

  // List feedbacks — admin only, with optional filters
  list: protectedProcedure
    .input(
      z
        .object({
          tipo: z.enum(["bug", "sugestao", "duvida"]).optional(),
          status: z
            .enum(["novo", "visto", "enviado_jira", "descartado"])
            .optional(),
        })
        .optional()
    )
    .query(async ({ input, ctx }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Acesso negado: requer permissao de administrador",
        });
      }

      const conditions = [];
      if (input?.tipo) {
        conditions.push(eq(feedbacks.tipo, input.tipo));
      }
      if (input?.status) {
        conditions.push(eq(feedbacks.status, input.status));
      }

      const rows = await db
        .select({
          id: feedbacks.id,
          userId: feedbacks.userId,
          tipo: feedbacks.tipo,
          mensagem: feedbacks.mensagem,
          pagina: feedbacks.pagina,
          contexto: feedbacks.contexto,
          status: feedbacks.status,
          jiraTicketId: feedbacks.jiraTicketId,
          createdAt: feedbacks.createdAt,
          userName: users.name,
        })
        .from(feedbacks)
        .leftJoin(users, eq(feedbacks.userId, users.id))
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(feedbacks.createdAt));

      return rows;
    }),

  // Update feedback status — admin only
  updateStatus: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        status: z.enum(["novo", "visto", "enviado_jira", "descartado"]),
        jiraTicketId: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Acesso negado: requer permissao de administrador",
        });
      }

      const updateData: Record<string, unknown> = {
        status: input.status,
      };
      if (input.jiraTicketId !== undefined) {
        updateData.jiraTicketId = input.jiraTicketId;
      }

      const [updated] = await db
        .update(feedbacks)
        .set(updateData)
        .where(eq(feedbacks.id, input.id))
        .returning();

      if (!updated) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Feedback nao encontrado",
        });
      }

      return updated;
    }),

  // Export feedback to Jira — admin only
  exportToJira: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        prioridade: z.enum(["baixa", "media", "alta"]),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Apenas administradores podem exportar para Jira",
        });
      }

      const [fb] = await db
        .select({
          id: feedbacks.id,
          tipo: feedbacks.tipo,
          mensagem: feedbacks.mensagem,
          pagina: feedbacks.pagina,
          contexto: feedbacks.contexto,
          createdAt: feedbacks.createdAt,
          userName: users.name,
        })
        .from(feedbacks)
        .leftJoin(users, eq(feedbacks.userId, users.id))
        .where(eq(feedbacks.id, input.id));

      if (!fb) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Feedback não encontrado" });
      }

      const ticket = await createJiraTicket({
        tipo: fb.tipo,
        mensagem: fb.mensagem,
        pagina: fb.pagina,
        contexto: fb.contexto as {
          viewport?: string;
          userAgent?: string;
          consoleErrors?: string[];
        } | null,
        userName: fb.userName,
        createdAt: fb.createdAt,
        prioridade: input.prioridade,
      });

      await db
        .update(feedbacks)
        .set({ status: "enviado_jira", jiraTicketId: ticket.key })
        .where(eq(feedbacks.id, input.id));

      return { ticketKey: ticket.key };
    }),
});
