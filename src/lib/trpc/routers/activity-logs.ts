import { z } from "zod";
import { router, protectedProcedure } from "../init";
import { db } from "@/lib/db";
import { activityLogs, users } from "@/lib/db/schema";
import { eq, desc, and, gte, lte, count } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

// ==========================================
// HELPER: Verificar se pode ver logs
// ==========================================

function checkCanViewLogs(role: string) {
  if (!["admin", "defensor"].includes(role)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Acesso negado: apenas administradores e defensores podem ver logs de atividade",
    });
  }
}

// ==========================================
// ROUTER DE LOGS DE ATIVIDADE
// ==========================================

export const activityLogsRouter = router({
  /**
   * Registra uma nova atividade
   */
  log: protectedProcedure
    .input(z.object({
      acao: z.enum(["CREATE", "UPDATE", "DELETE", "VIEW", "COMPLETE", "DELEGATE", "UPLOAD", "SYNC"]),
      entidadeTipo: z.enum(["demanda", "assistido", "processo", "documento", "audiencia", "delegacao", "caso", "jurado"]),
      entidadeId: z.number().optional(),
      descricao: z.string().optional(),
      detalhes: z.record(z.any()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const [log] = await db.insert(activityLogs).values({
        userId: ctx.user.id,
        acao: input.acao,
        entidadeTipo: input.entidadeTipo,
        entidadeId: input.entidadeId,
        descricao: input.descricao,
        detalhes: input.detalhes,
      }).returning();

      return log;
    }),

  /**
   * Lista logs de atividade (apenas admin/defensor)
   */
  list: protectedProcedure
    .input(z.object({
      userId: z.number().optional(),
      entidadeTipo: z.string().optional(),
      acao: z.string().optional(),
      startDate: z.date().optional(),
      endDate: z.date().optional(),
      limit: z.number().min(1).max(100).default(50),
      offset: z.number().default(0),
    }))
    .query(async ({ ctx, input }) => {
      checkCanViewLogs(ctx.user.role);
      const conditions = [];
      
      if (input.userId) {
        conditions.push(eq(activityLogs.userId, input.userId));
      }
      if (input.entidadeTipo) {
        conditions.push(eq(activityLogs.entidadeTipo, input.entidadeTipo));
      }
      if (input.acao) {
        conditions.push(eq(activityLogs.acao, input.acao));
      }
      if (input.startDate) {
        conditions.push(gte(activityLogs.createdAt, input.startDate));
      }
      if (input.endDate) {
        conditions.push(lte(activityLogs.createdAt, input.endDate));
      }

      const logs = await db.query.activityLogs.findMany({
        where: conditions.length > 0 ? and(...conditions) : undefined,
        with: {
          user: {
            columns: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
        },
        orderBy: [desc(activityLogs.createdAt)],
        limit: input.limit,
        offset: input.offset,
      });

      return logs;
    }),

  /**
   * Estatísticas de atividade por usuário (admin/defensor)
   */
  userStats: protectedProcedure
    .input(z.object({
      userId: z.number().optional(),
      days: z.number().default(30),
    }))
    .query(async ({ ctx, input }) => {
      checkCanViewLogs(ctx.user.role);
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - input.days);

      const conditions = [gte(activityLogs.createdAt, startDate)];
      if (input.userId) {
        conditions.push(eq(activityLogs.userId, input.userId));
      }

      // Contagem por tipo de entidade
      const byEntity = await db
        .select({
          entidadeTipo: activityLogs.entidadeTipo,
          total: count(),
        })
        .from(activityLogs)
        .where(and(...conditions))
        .groupBy(activityLogs.entidadeTipo);

      // Contagem por ação
      const byAction = await db
        .select({
          acao: activityLogs.acao,
          total: count(),
        })
        .from(activityLogs)
        .where(and(...conditions))
        .groupBy(activityLogs.acao);

      // Total geral
      const [{ total }] = await db
        .select({ total: count() })
        .from(activityLogs)
        .where(and(...conditions));

      return {
        total,
        byEntity,
        byAction,
      };
    }),

  /**
   * Estatísticas de todos os membros da equipe (admin/defensor)
   */
  teamStats: protectedProcedure
    .input(z.object({
      days: z.number().default(30),
    }))
    .query(async ({ ctx, input }) => {
      checkCanViewLogs(ctx.user.role);
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - input.days);

      // Atividades por usuário
      const userActivity = await db
        .select({
          userId: activityLogs.userId,
          userName: users.name,
          userRole: users.role,
          total: count(),
        })
        .from(activityLogs)
        .innerJoin(users, eq(activityLogs.userId, users.id))
        .where(gte(activityLogs.createdAt, startDate))
        .groupBy(activityLogs.userId, users.name, users.role);

      // Contagem de criações por tipo
      const creationsByUser = await db
        .select({
          userId: activityLogs.userId,
          entidadeTipo: activityLogs.entidadeTipo,
          total: count(),
        })
        .from(activityLogs)
        .where(and(
          gte(activityLogs.createdAt, startDate),
          eq(activityLogs.acao, "CREATE")
        ))
        .groupBy(activityLogs.userId, activityLogs.entidadeTipo);

      // Organizar dados por usuário
      const teamData = userActivity.map(user => {
        const userCreations = creationsByUser.filter(c => c.userId === user.userId);
        return {
          ...user,
          demandas: userCreations.find(c => c.entidadeTipo === "demanda")?.total || 0,
          assistidos: userCreations.find(c => c.entidadeTipo === "assistido")?.total || 0,
          processos: userCreations.find(c => c.entidadeTipo === "processo")?.total || 0,
          documentos: userCreations.find(c => c.entidadeTipo === "documento")?.total || 0,
        };
      });

      return teamData;
    }),

  /**
   * Últimas atividades da equipe (admin/defensor)
   */
  recentTeamActivity: protectedProcedure
    .input(z.object({
      limit: z.number().default(20),
      excludeAdmins: z.boolean().default(true),
    }))
    .query(async ({ ctx, input }) => {
      checkCanViewLogs(ctx.user.role);
      const logs = await db.query.activityLogs.findMany({
        with: {
          user: {
            columns: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
        },
        orderBy: [desc(activityLogs.createdAt)],
        limit: input.limit,
      });

      // Filtrar se necessário
      if (input.excludeAdmins) {
        return logs.filter(log => log.user?.role !== "admin");
      }

      return logs;
    }),
});
