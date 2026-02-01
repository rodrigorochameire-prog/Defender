import { z } from "zod";
import { router, protectedProcedure } from "../init";
import { db } from "@/lib/db";
import { sessoesJuri, processos } from "@/lib/db/schema";
import { eq, desc, sql, gte, and } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { getWorkspaceScope } from "../workspace";

export const juriRouter = router({
  // Listar todas as sessões do júri
  // Júris são filtrados pela atribuição, não por workspace
  list: protectedProcedure
    .input(
      z.object({
        status: z.string().optional(),
        defensor: z.string().optional(),
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const { status, defensor, limit = 50, offset = 0 } = input || {};
      getWorkspaceScope(ctx.user); // Validar autenticação
      
      let conditions = [];
      
      if (status && status !== "all") {
        conditions.push(eq(sessoesJuri.status, status as any));
      }
      
      if (defensor) {
        conditions.push(eq(sessoesJuri.defensorNome, defensor));
      }

      // Júris são compartilhados (filtrados no frontend pela atribuição)
      
      const result = await db
        .select({
          id: sessoesJuri.id,
          dataSessao: sessoesJuri.dataSessao,
          defensorNome: sessoesJuri.defensorNome,
          assistidoNome: sessoesJuri.assistidoNome,
          status: sessoesJuri.status,
          resultado: sessoesJuri.resultado,
          observacoes: sessoesJuri.observacoes,
          processoId: sessoesJuri.processoId,
          processo: {
            id: processos.id,
            numeroAutos: processos.numeroAutos,
          },
        })
        .from(sessoesJuri)
        .leftJoin(processos, eq(sessoesJuri.processoId, processos.id))
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(sessoesJuri.dataSessao)
        .limit(limit)
        .offset(offset);
      
      return result;
    }),

  // Listar próximas sessões
  proximas: protectedProcedure
    .input(
      z.object({
        dias: z.number().default(30),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const { dias = 30 } = input || {};
      getWorkspaceScope(ctx.user); // Validar autenticação
      const hoje = new Date();
      
      const result = await db
        .select({
          id: sessoesJuri.id,
          dataSessao: sessoesJuri.dataSessao,
          defensorNome: sessoesJuri.defensorNome,
          assistidoNome: sessoesJuri.assistidoNome,
          status: sessoesJuri.status,
          processo: {
            id: processos.id,
            numeroAutos: processos.numeroAutos,
          },
        })
        .from(sessoesJuri)
        .leftJoin(processos, eq(sessoesJuri.processoId, processos.id))
        .where(gte(sessoesJuri.dataSessao, hoje))
        .orderBy(sessoesJuri.dataSessao)
        .limit(10);
      
      return result;
    }),

  // Buscar sessão por ID
  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const { isAdmin, workspaceId } = getWorkspaceScope(ctx.user);
      const [sessao] = await db
        .select()
        .from(sessoesJuri)
        .where(
          and(
            eq(sessoesJuri.id, input.id),
            ...(isAdmin ? [] : [eq(sessoesJuri.workspaceId, workspaceId)])
          )
        );
      
      return sessao || null;
    }),

  // Criar nova sessão do júri
  create: protectedProcedure
    .input(
      z.object({
        processoId: z.number(),
        dataSessao: z.string(),
        defensorNome: z.string(),
        assistidoNome: z.string(),
        status: z.enum(["AGENDADA", "REALIZADA", "ADIADA", "CANCELADA"]).default("AGENDADA"),
        resultado: z.string().optional(),
        observacoes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { isAdmin, workspaceId } = getWorkspaceScope(ctx.user);
      const processo = await db.query.processos.findFirst({
        where: eq(processos.id, input.processoId),
      });

      if (!processo) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Processo não encontrado" });
      }

      if (!processo.workspaceId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Processo sem workspace atribuído.",
        });
      }

      if (!isAdmin && processo.workspaceId !== workspaceId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Você não tem acesso ao workspace deste processo.",
        });
      }

      const [novaSessao] = await db
        .insert(sessoesJuri)
        .values({
          ...input,
          dataSessao: new Date(input.dataSessao),
          workspaceId: processo.workspaceId,
        })
        .returning();
      
      return novaSessao;
    }),

  // Atualizar sessão
  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        dataSessao: z.string().optional(),
        defensorNome: z.string().optional(),
        status: z.enum(["AGENDADA", "REALIZADA", "ADIADA", "CANCELADA"]).optional(),
        resultado: z.string().optional(),
        observacoes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, dataSessao, ...data } = input;
      const { isAdmin, workspaceId } = getWorkspaceScope(ctx.user);
      
      const updateData: any = {
        ...data,
        updatedAt: new Date(),
      };
      
      if (dataSessao) {
        updateData.dataSessao = new Date(dataSessao);
      }
      
      const [atualizado] = await db
        .update(sessoesJuri)
        .set(updateData)
        .where(
          and(
            eq(sessoesJuri.id, id),
            ...(isAdmin ? [] : [eq(sessoesJuri.workspaceId, workspaceId)])
          )
        )
        .returning();
      
      return atualizado;
    }),

  // Excluir sessão
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const { isAdmin, workspaceId } = getWorkspaceScope(ctx.user);
      const [excluido] = await db
        .delete(sessoesJuri)
        .where(
          and(
            eq(sessoesJuri.id, input.id),
            ...(isAdmin ? [] : [eq(sessoesJuri.workspaceId, workspaceId)])
          )
        )
        .returning();
      
      return excluido;
    }),

  // Estatísticas
  stats: protectedProcedure.query(async ({ ctx }) => {
    const { isAdmin, workspaceId } = getWorkspaceScope(ctx.user);
    const baseCondition = isAdmin ? undefined : eq(sessoesJuri.workspaceId, workspaceId);

    const total = await db
      .select({ count: sql<number>`count(*)` })
      .from(sessoesJuri)
      .where(baseCondition);
    
    const agendadas = await db
      .select({ count: sql<number>`count(*)` })
      .from(sessoesJuri)
      .where(
        baseCondition
          ? and(baseCondition, eq(sessoesJuri.status, "AGENDADA"))
          : eq(sessoesJuri.status, "AGENDADA")
      );
    
    const realizadas = await db
      .select({ count: sql<number>`count(*)` })
      .from(sessoesJuri)
      .where(
        baseCondition
          ? and(baseCondition, eq(sessoesJuri.status, "REALIZADA"))
          : eq(sessoesJuri.status, "REALIZADA")
      );
    
    return {
      total: Number(total[0]?.count || 0),
      agendadas: Number(agendadas[0]?.count || 0),
      realizadas: Number(realizadas[0]?.count || 0),
    };
  }),
});
