import { z } from "zod";
import { router, protectedProcedure } from "../init";
import { db } from "@/lib/db";
import { demandas, delegacoesHistorico, users, notifications } from "@/lib/db/schema";
import { eq, and, desc, isNull, inArray } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

// ==========================================
// TIPOS DE PEDIDO DE TRABALHO
// ==========================================
export const TIPOS_PEDIDO = {
  minuta: { label: "Minuta", icon: "FileEdit", workflow: ["pendente", "aceita", "em_andamento", "aguardando_revisao", "revisado", "protocolado"] },
  atendimento: { label: "Atendimento", icon: "UserCheck", workflow: ["pendente", "aceita", "em_andamento", "concluida"] },
  diligencia: { label: "Diligencia", icon: "Search", workflow: ["pendente", "aceita", "em_andamento", "concluida"] },
  analise: { label: "Analise", icon: "BookOpen", workflow: ["pendente", "aceita", "em_andamento", "concluida"] },
  outro: { label: "Outro", icon: "MoreHorizontal", workflow: ["pendente", "aceita", "em_andamento", "concluida"] },
  delegacao_generica: { label: "Tarefa", icon: "Send", workflow: ["pendente", "aceita", "em_andamento", "concluida", "devolvida"] },
} as const;

export type TipoPedido = keyof typeof TIPOS_PEDIDO;

// Todos os status possíveis
export const ALL_STATUS = [
  "pendente", "aceita", "em_andamento",
  "aguardando_revisao", "revisado", "protocolado",
  "concluida", "devolvida", "cancelada",
] as const;

export type StatusPedido = typeof ALL_STATUS[number];

// Status que indicam "ativo" (não finalizado)
export const STATUS_ATIVOS = ["pendente", "aceita", "em_andamento", "aguardando_revisao"] as const;

// Status que indicam "finalizado"
export const STATUS_FINALIZADOS = ["revisado", "protocolado", "concluida", "devolvida", "cancelada"] as const;

// Schema de validação para criar pedido de trabalho
const criarPedidoSchema = z.object({
  tipo: z.enum(["minuta", "atendimento", "diligencia", "analise", "outro", "delegacao_generica"]).default("delegacao_generica"),
  demandaId: z.number().optional(),
  destinatarioId: z.number(),
  instrucoes: z.string().min(1, "Instruções são obrigatórias"),
  orientacoes: z.string().optional(),
  prazoSugerido: z.string().optional(),
  prioridade: z.enum(["NORMAL", "URGENTE", "BAIXA"]).default("NORMAL"),
  assistidoId: z.number().optional(),
  processoId: z.number().optional(),
});

// Schema para atualizar status
const atualizarStatusSchema = z.object({
  delegacaoId: z.number(),
  status: z.enum(["aceita", "em_andamento", "aguardando_revisao", "revisado", "protocolado", "concluida", "devolvida", "cancelada"]),
  observacoes: z.string().optional(),
});

// Labels amigáveis para notificações
const STATUS_LABELS: Record<string, string> = {
  pendente: "Pendente",
  aceita: "Aceita",
  em_andamento: "Em andamento",
  aguardando_revisao: "Aguardando revisão",
  revisado: "Revisado",
  protocolado: "Protocolado",
  concluida: "Concluída",
  devolvida: "Devolvida",
  cancelada: "Cancelada",
};

export const delegacaoRouter = router({
  // Listar delegações/pedidos recebidos pelo usuário atual
  minhasDelegacoes: protectedProcedure
    .input(z.object({
      status: z.enum(["pendente", "aceita", "em_andamento", "aguardando_revisao", "concluida", "devolvida", "todas", "ativos"]).optional(),
      tipo: z.enum(["minuta", "atendimento", "diligencia", "analise", "outro", "delegacao_generica", "todos"]).optional(),
    }).optional())
    .query(async ({ ctx, input }) => {
      const userId = ctx.user.id;
      const status = input?.status;
      const tipo = input?.tipo;

      const whereConditions = [
        eq(delegacoesHistorico.delegadoParaId, userId),
      ];

      if (status && status !== "todas") {
        if (status === "ativos") {
          whereConditions.push(inArray(delegacoesHistorico.status, [...STATUS_ATIVOS]));
        } else {
          whereConditions.push(eq(delegacoesHistorico.status, status));
        }
      }

      if (tipo && tipo !== "todos") {
        whereConditions.push(eq(delegacoesHistorico.tipo, tipo));
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
          assistido: true,
          processo: true,
          delegadoDe: true,
        },
        orderBy: [desc(delegacoesHistorico.dataDelegacao)],
      });

      return delegacoes;
    }),

  // Listar delegações/pedidos enviados pelo usuário atual
  delegacoesEnviadas: protectedProcedure
    .input(z.object({
      status: z.enum(["pendente", "aceita", "em_andamento", "aguardando_revisao", "concluida", "devolvida", "todas", "ativos"]).optional(),
      tipo: z.enum(["minuta", "atendimento", "diligencia", "analise", "outro", "delegacao_generica", "todos"]).optional(),
    }).optional())
    .query(async ({ ctx, input }) => {
      const userId = ctx.user.id;
      const status = input?.status;
      const tipo = input?.tipo;

      const whereConditions = [
        eq(delegacoesHistorico.delegadoDeId, userId),
      ];

      if (status && status !== "todas") {
        if (status === "ativos") {
          whereConditions.push(inArray(delegacoesHistorico.status, [...STATUS_ATIVOS]));
        } else {
          whereConditions.push(eq(delegacoesHistorico.status, status));
        }
      }

      if (tipo && tipo !== "todos") {
        whereConditions.push(eq(delegacoesHistorico.tipo, tipo));
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
          assistido: true,
          processo: true,
          delegadoPara: true,
        },
        orderBy: [desc(delegacoesHistorico.dataDelegacao)],
      });

      return delegacoes;
    }),

  // Criar novo pedido de trabalho / delegação
  criar: protectedProcedure
    .input(criarPedidoSchema)
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id;
      const userRole = ctx.user.role;

      // Verificar se o usuário pode delegar (apenas defensor ou admin)
      if (!["admin", "defensor"].includes(userRole)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Apenas defensores podem criar pedidos de trabalho",
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
          tipo: input.tipo,
          demandaId: input.demandaId || null,
          delegadoDeId: userId,
          delegadoParaId: input.destinatarioId,
          instrucoes: input.instrucoes,
          orientacoes: input.orientacoes || null,
          prazoSugerido: input.prazoSugerido ? new Date(input.prazoSugerido).toISOString().split("T")[0] : null,
          prioridade: input.prioridade,
          status: "pendente",
          assistidoId: input.assistidoId || null,
          processoId: input.processoId || null,
          workspaceId: ctx.user.workspaceId || null,
        })
        .returning();

      // Buscar nome do remetente para a notificação
      const remetente = await db.query.users.findFirst({
        where: eq(users.id, userId),
        columns: { name: true },
      });

      // Label do tipo para notificação
      const tipoLabel = TIPOS_PEDIDO[input.tipo]?.label || "Tarefa";

      // Criar notificação para o destinatário
      await db.insert(notifications).values({
        userId: input.destinatarioId,
        title: `Novo pedido: ${tipoLabel}`,
        message: `${remetente?.name || "Um defensor"} enviou um pedido de ${tipoLabel.toLowerCase()} para você.`,
        type: input.prioridade === "URGENTE" ? "warning" : "info",
        actionUrl: "/admin/delegacoes",
        isRead: false,
      });

      return delegacao;
    }),

  // Atualizar status da delegação/pedido
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
          message: "Pedido não encontrado",
        });
      }

      // Verificar se o usuário pode atualizar (destinatário ou remetente)
      if (delegacao.delegadoParaId !== userId && delegacao.delegadoDeId !== userId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Você não tem permissão para atualizar este pedido",
        });
      }

      // Atualizar status
      const updateData: any = {
        status: input.status,
      };

      if (input.status === "aceita") {
        updateData.dataAceitacao = new Date();
      } else if (["concluida", "protocolado", "revisado"].includes(input.status)) {
        updateData.dataConclusao = new Date();
      }

      if (input.observacoes) {
        updateData.observacoes = input.observacoes;
      }

      const [updated] = await db.update(delegacoesHistorico)
        .set(updateData)
        .where(eq(delegacoesHistorico.id, input.delegacaoId))
        .returning();

      // Atualizar demanda associada (se houver)
      if (delegacao.demandaId) {
        await db.update(demandas)
          .set({
            statusDelegacao: input.status,
            updatedAt: new Date(),
          })
          .where(eq(demandas.id, delegacao.demandaId));
      }

      // Notificações baseadas no novo status
      const executor = await db.query.users.findFirst({
        where: eq(users.id, userId),
        columns: { name: true },
      });
      const executorName = executor?.name || "Um membro da equipe";
      const tipoLabel = delegacao.tipo ? (TIPOS_PEDIDO[delegacao.tipo as TipoPedido]?.label || "Tarefa") : "Tarefa";

      // Notificar remetente em transições importantes
      if (["aguardando_revisao", "concluida", "devolvida", "protocolado"].includes(input.status)) {
        const messages: Record<string, { title: string; message: string; type: string }> = {
          aguardando_revisao: {
            title: `${tipoLabel} pronta para revisão`,
            message: `${executorName} finalizou a ${tipoLabel.toLowerCase()} e aguarda sua revisão.`,
            type: "info",
          },
          concluida: {
            title: `${tipoLabel} concluída`,
            message: `${executorName} concluiu o pedido de ${tipoLabel.toLowerCase()}.`,
            type: "success",
          },
          devolvida: {
            title: `${tipoLabel} devolvida`,
            message: `${executorName} devolveu o pedido de ${tipoLabel.toLowerCase()}.`,
            type: "warning",
          },
          protocolado: {
            title: `${tipoLabel} protocolada`,
            message: `${executorName} marcou a ${tipoLabel.toLowerCase()} como protocolada.`,
            type: "success",
          },
        };

        const msg = messages[input.status];
        if (msg) {
          await db.insert(notifications).values({
            userId: delegacao.delegadoDeId,
            title: msg.title,
            message: msg.message,
            type: msg.type,
            actionUrl: "/admin/delegacoes",
            isRead: false,
          });
        }
      }

      // Notificar destinatário quando defensor revisa/aprova
      if (["revisado"].includes(input.status) && userId === delegacao.delegadoDeId) {
        await db.insert(notifications).values({
          userId: delegacao.delegadoParaId,
          title: `${tipoLabel} revisada e aprovada`,
          message: `${executorName} revisou e aprovou sua ${tipoLabel.toLowerCase()}.`,
          type: "success",
          actionUrl: "/admin/delegacoes",
          isRead: false,
        });
      }

      // Notificar executor quando delegação é aceita (por outro)
      if (input.status === "aceita" && userId !== delegacao.delegadoParaId) {
        await db.insert(notifications).values({
          userId: delegacao.delegadoParaId,
          title: "Pedido aceito",
          message: "Seu pedido foi aceito. Acompanhe o andamento na página de delegações.",
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

      // Buscar servidores e estagiários
      const membros = await db.query.users.findMany({
        where: and(
          isNull(users.deletedAt),
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

      // Filtrar apenas servidores e estagiários (excluindo o próprio usuário)
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
        const emAndamento = recebidas.filter(d => ["aceita", "em_andamento", "aguardando_revisao"].includes(d.status)).length;
        const concluidas = recebidas.filter(d => ["concluida", "revisado", "protocolado"].includes(d.status)).length;

        return { pendentes, emAndamento, concluidas, total: recebidas.length };
      } else {
        // Para defensores: suas delegações enviadas
        const enviadas = await db.query.delegacoesHistorico.findMany({
          where: eq(delegacoesHistorico.delegadoDeId, userId),
        });

        const pendentes = enviadas.filter(d => d.status === "pendente").length;
        const emAndamento = enviadas.filter(d => ["aceita", "em_andamento"].includes(d.status)).length;
        const aguardandoRevisao = enviadas.filter(d => d.status === "aguardando_revisao").length;
        const concluidas = enviadas.filter(d => ["concluida", "revisado", "protocolado"].includes(d.status)).length;

        return { pendentes, emAndamento, aguardandoRevisao, concluidas, total: enviadas.length };
      }
    }),
});
