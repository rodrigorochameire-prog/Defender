import { z } from "zod";
import { router, protectedProcedure } from "../init";
import { db } from "@/lib/db";
import { demandas, delegacoesHistorico, users, notifications } from "@/lib/db/schema";
import { eq, and, desc, isNull } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

// Schema de validação para criar delegação
const criarDelegacaoSchema = z.object({
  demandaId: z.number().optional(),
  destinatarioId: z.number(),
  instrucoes: z.string().min(1, "Instruções são obrigatórias"),
  prazoSugerido: z.string().optional(),
  prioridade: z.enum(["NORMAL", "URGENTE", "BAIXA"]).default("NORMAL"),
  assistidoId: z.number().optional(),
  processoId: z.number().optional(),
});

// Schema para atualizar status da delegação
const atualizarStatusSchema = z.object({
  delegacaoId: z.number(),
  status: z.enum(["aceita", "em_andamento", "concluida", "devolvida", "cancelada"]),
  observacoes: z.string().optional(),
});

export const delegacaoRouter = router({
  // Listar delegações recebidas pelo usuário atual
  minhasDelegacoes: protectedProcedure
    .input(z.object({
      status: z.enum(["pendente", "aceita", "em_andamento", "concluida", "devolvida", "todas"]).optional(),
    }).optional())
    .query(async ({ ctx, input }) => {
      const userId = ctx.user.id;
      const status = input?.status;

      const whereConditions = [
        eq(delegacoesHistorico.delegadoParaId, userId),
      ];

      if (status && status !== "todas") {
        whereConditions.push(eq(delegacoesHistorico.status, status));
      }

      const delegacoes = await db.query.delegacoesHistorico.findMany({
        where: and(...whereConditions),
        with: {
          demanda: {
            with: {
              assistido: true,
              processo: true,
            },
          },
          delegadoDe: true,
        },
        orderBy: [desc(delegacoesHistorico.dataDelegacao)],
      });

      return delegacoes;
    }),

  // Listar delegações enviadas pelo usuário atual
  delegacoesEnviadas: protectedProcedure
    .input(z.object({
      status: z.enum(["pendente", "aceita", "em_andamento", "concluida", "devolvida", "todas"]).optional(),
    }).optional())
    .query(async ({ ctx, input }) => {
      const userId = ctx.user.id;
      const status = input?.status;

      const whereConditions = [
        eq(delegacoesHistorico.delegadoDeId, userId),
      ];

      if (status && status !== "todas") {
        whereConditions.push(eq(delegacoesHistorico.status, status));
      }

      const delegacoes = await db.query.delegacoesHistorico.findMany({
        where: and(...whereConditions),
        with: {
          demanda: {
            with: {
              assistido: true,
              processo: true,
            },
          },
          delegadoPara: true,
        },
        orderBy: [desc(delegacoesHistorico.dataDelegacao)],
      });

      return delegacoes;
    }),

  // Criar nova delegação
  criar: protectedProcedure
    .input(criarDelegacaoSchema)
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id;
      const userRole = ctx.user.role;

      // Verificar se o usuário pode delegar (apenas defensor ou admin)
      if (!["admin", "defensor"].includes(userRole)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Apenas defensores podem delegar tarefas",
        });
      }

      // Verificar se o destinatário existe e é servidor ou estagiário
      const destinatario = await db.query.users.findFirst({
        where: eq(users.id, input.destinatarioId),
      });

      if (!destinatario) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Destinatário não encontrado",
        });
      }

      if (!["servidor", "estagiario"].includes(destinatario.role)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Só é possível delegar para servidores ou estagiários",
        });
      }

      // Se há uma demanda associada, atualizar seus campos de delegação
      if (input.demandaId) {
        await db.update(demandas)
          .set({
            delegadoParaId: input.destinatarioId,
            dataDelegacao: new Date(),
            motivoDelegacao: input.instrucoes,
            statusDelegacao: "pendente",
            prazoSugerido: input.prazoSugerido ? new Date(input.prazoSugerido).toISOString().split("T")[0] : null,
            updatedAt: new Date(),
          })
          .where(eq(demandas.id, input.demandaId));
      }

      // Criar registro no histórico
      const [delegacao] = await db.insert(delegacoesHistorico)
        .values({
          demandaId: input.demandaId || 0, // TODO: Criar demanda se não existir
          delegadoDeId: userId,
          delegadoParaId: input.destinatarioId,
          instrucoes: input.instrucoes,
          prazoSugerido: input.prazoSugerido ? new Date(input.prazoSugerido).toISOString().split("T")[0] : null,
          status: "pendente",
          workspaceId: ctx.user.workspaceId || null,
        })
        .returning();

      // Buscar nome do remetente para a notificação
      const remetente = await db.query.users.findFirst({
        where: eq(users.id, userId),
        columns: { name: true },
      });

      // Criar notificação para o destinatário
      await db.insert(notifications).values({
        userId: input.destinatarioId,
        title: "Nova tarefa delegada",
        message: `${remetente?.name || "Um defensor"} delegou uma nova tarefa para você.`,
        type: "info",
        actionUrl: "/admin/delegacoes",
        isRead: false,
      });

      return delegacao;
    }),

  // Atualizar status da delegação
  atualizarStatus: protectedProcedure
    .input(atualizarStatusSchema)
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id;

      // Buscar a delegação
      const delegacao = await db.query.delegacoesHistorico.findFirst({
        where: eq(delegacoesHistorico.id, input.delegacaoId),
      });

      if (!delegacao) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Delegação não encontrada",
        });
      }

      // Verificar se o usuário pode atualizar (destinatário ou remetente)
      if (delegacao.delegadoParaId !== userId && delegacao.delegadoDeId !== userId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Você não tem permissão para atualizar esta delegação",
        });
      }

      // Atualizar status
      const updateData: any = {
        status: input.status,
      };

      if (input.status === "aceita") {
        updateData.dataAceitacao = new Date();
      } else if (input.status === "concluida") {
        updateData.dataConclusao = new Date();
      }

      if (input.observacoes) {
        updateData.observacoes = input.observacoes;
      }

      const [updated] = await db.update(delegacoesHistorico)
        .set(updateData)
        .where(eq(delegacoesHistorico.id, input.delegacaoId))
        .returning();

      // Atualizar demanda associada
      if (delegacao.demandaId) {
        await db.update(demandas)
          .set({
            statusDelegacao: input.status,
            updatedAt: new Date(),
          })
          .where(eq(demandas.id, delegacao.demandaId));
      }

      // Criar notificação para o remetente quando a delegação é concluída ou devolvida
      if (["concluida", "devolvida"].includes(input.status)) {
        const executor = await db.query.users.findFirst({
          where: eq(users.id, userId),
          columns: { name: true },
        });

        const statusLabel = input.status === "concluida" ? "concluiu" : "devolveu";
        const statusType = input.status === "concluida" ? "success" : "warning";

        await db.insert(notifications).values({
          userId: delegacao.delegadoDeId,
          title: input.status === "concluida" ? "Tarefa concluída" : "Tarefa devolvida",
          message: `${executor?.name || "Um membro da equipe"} ${statusLabel} a tarefa delegada.`,
          type: statusType,
          actionUrl: "/admin/delegacoes",
          isRead: false,
        });
      }

      // Notificar o executor quando a delegação é aceita
      if (input.status === "aceita" && userId !== delegacao.delegadoParaId) {
        await db.insert(notifications).values({
          userId: delegacao.delegadoParaId,
          title: "Delegação aceita",
          message: "Sua delegação foi aceita. Acompanhe o andamento na página de delegações.",
          type: "info",
          actionUrl: "/admin/delegacoes",
          isRead: false,
        });
      }

      return updated;
    }),

  // Listar membros da equipe para delegação
  membrosEquipe: protectedProcedure
    .query(async ({ ctx }) => {
      const userId = ctx.user.id;

      // Buscar servidores e estagiários do mesmo workspace
      const membros = await db.query.users.findMany({
        where: and(
          isNull(users.deletedAt),
          // Filtrar por role servidor ou estagiário
        ),
        columns: {
          id: true,
          name: true,
          email: true,
          role: true,
          funcao: true,
          supervisorId: true,
        },
      });

      // Filtrar apenas servidores e estagiários
      return membros.filter(m => 
        ["servidor", "estagiario"].includes(m.role) && m.id !== userId
      );
    }),

  // Estatísticas de delegações
  estatisticas: protectedProcedure
    .query(async ({ ctx }) => {
      const userId = ctx.user.id;
      const userRole = ctx.user.role;

      if (["servidor", "estagiario"].includes(userRole)) {
        // Para servidores/estagiários: suas delegações recebidas
        const recebidas = await db.query.delegacoesHistorico.findMany({
          where: eq(delegacoesHistorico.delegadoParaId, userId),
        });

        const pendentes = recebidas.filter(d => d.status === "pendente").length;
        const emAndamento = recebidas.filter(d => ["aceita", "em_andamento"].includes(d.status)).length;
        const concluidas = recebidas.filter(d => d.status === "concluida").length;

        return { pendentes, emAndamento, concluidas, total: recebidas.length };
      } else {
        // Para defensores: suas delegações enviadas
        const enviadas = await db.query.delegacoesHistorico.findMany({
          where: eq(delegacoesHistorico.delegadoDeId, userId),
        });

        const pendentes = enviadas.filter(d => d.status === "pendente").length;
        const emAndamento = enviadas.filter(d => ["aceita", "em_andamento"].includes(d.status)).length;
        const concluidas = enviadas.filter(d => d.status === "concluida").length;

        return { pendentes, emAndamento, concluidas, total: enviadas.length };
      }
    }),
});
