/**
 * Router tRPC para Gestão de Prazos
 *
 * Funcionalidades:
 * - CRUD de tipos de prazo
 * - CRUD de feriados forenses
 * - Cálculo automático de prazos
 * - Dashboard de prazos críticos
 * - Histórico de cálculos
 */

import { z } from "zod";
import { router, protectedProcedure } from "../init";
import { db } from "@/lib/db";
import {
  tipoPrazos,
  feriadosForenses,
  calculosPrazos,
  demandas,
  assistidos,
  processos,
} from "@/lib/db/schema";
import { eq, and, gte, lte, desc, asc, or, sql, isNull } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import {
  calcularPrazo,
  salvarCalculoPrazo,
  seedTiposPrazo,
  type ParametrosCalculo,
} from "@/lib/services/calculo-prazos";

// Helper para obter workspace scope
function getWorkspaceScope(user: { workspaceId?: number | null }) {
  return user.workspaceId ? { workspaceId: user.workspaceId } : {};
}

export const prazosRouter = router({
  // ==========================================
  // TIPOS DE PRAZO
  // ==========================================

  /**
   * Lista tipos de prazo cadastrados
   */
  listTiposPrazo: protectedProcedure
    .input(
      z.object({
        areaDireito: z.enum(["CRIMINAL", "CIVEL", "TRABALHISTA", "EXECUCAO_PENAL", "JURI"]).optional(),
        categoria: z.string().optional(),
        fase: z.string().optional(),
        search: z.string().optional(),
        apenasAtivos: z.boolean().default(true),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const filters = input || {};
      const conditions: any[] = [];

      // Workspace: tipos globais (null) ou do workspace
      conditions.push(
        or(
          isNull(tipoPrazos.workspaceId),
          eq(tipoPrazos.workspaceId, ctx.user.workspaceId || 0)
        )
      );

      if (filters.apenasAtivos) {
        conditions.push(eq(tipoPrazos.isActive, true));
      }

      if (filters.areaDireito) {
        conditions.push(eq(tipoPrazos.areaDireito, filters.areaDireito));
      }

      if (filters.categoria) {
        conditions.push(eq(tipoPrazos.categoria, filters.categoria));
      }

      if (filters.fase) {
        conditions.push(eq(tipoPrazos.fase, filters.fase));
      }

      if (filters.search) {
        conditions.push(
          or(
            sql`${tipoPrazos.nome} ILIKE ${`%${filters.search}%`}`,
            sql`${tipoPrazos.codigo} ILIKE ${`%${filters.search}%`}`
          )
        );
      }

      return db
        .select()
        .from(tipoPrazos)
        .where(and(...conditions))
        .orderBy(asc(tipoPrazos.nome));
    }),

  /**
   * Busca um tipo de prazo por ID ou código
   */
  getTipoPrazo: protectedProcedure
    .input(
      z.object({
        id: z.number().optional(),
        codigo: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      if (!input.id && !input.codigo) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Informe ID ou código do tipo de prazo",
        });
      }

      const condition = input.id
        ? eq(tipoPrazos.id, input.id)
        : eq(tipoPrazos.codigo, input.codigo!);

      const [tipo] = await db
        .select()
        .from(tipoPrazos)
        .where(condition)
        .limit(1);

      return tipo || null;
    }),

  /**
   * Cria novo tipo de prazo
   */
  createTipoPrazo: protectedProcedure
    .input(
      z.object({
        codigo: z.string().min(1).max(50),
        nome: z.string().min(1).max(150),
        descricao: z.string().optional(),
        prazoLegalDias: z.number().min(0),
        areaDireito: z.enum(["CRIMINAL", "CIVEL", "TRABALHISTA", "EXECUCAO_PENAL", "JURI"]),
        contarEmDiasUteis: z.boolean().default(false),
        aplicarDobroDefensoria: z.boolean().default(true),
        tempoLeituraDias: z.number().min(0).default(10),
        termoInicial: z.string().default("INTIMACAO"),
        categoria: z.string().optional(),
        fase: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Verificar se código já existe
      const [existing] = await db
        .select()
        .from(tipoPrazos)
        .where(eq(tipoPrazos.codigo, input.codigo))
        .limit(1);

      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: `Já existe um tipo de prazo com código "${input.codigo}"`,
        });
      }

      const [created] = await db
        .insert(tipoPrazos)
        .values({
          ...input,
          workspaceId: ctx.user.workspaceId,
        })
        .returning();

      return created;
    }),

  /**
   * Atualiza tipo de prazo
   */
  updateTipoPrazo: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        nome: z.string().min(1).max(150).optional(),
        descricao: z.string().optional(),
        prazoLegalDias: z.number().min(0).optional(),
        areaDireito: z.enum(["CRIMINAL", "CIVEL", "TRABALHISTA", "EXECUCAO_PENAL", "JURI"]).optional(),
        contarEmDiasUteis: z.boolean().optional(),
        aplicarDobroDefensoria: z.boolean().optional(),
        tempoLeituraDias: z.number().min(0).optional(),
        termoInicial: z.string().optional(),
        categoria: z.string().optional(),
        fase: z.string().optional(),
        isActive: z.boolean().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, ...data } = input;

      const [updated] = await db
        .update(tipoPrazos)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(tipoPrazos.id, id))
        .returning();

      return updated;
    }),

  /**
   * Remove tipo de prazo (soft delete)
   */
  deleteTipoPrazo: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const [updated] = await db
        .update(tipoPrazos)
        .set({ isActive: false, updatedAt: new Date() })
        .where(eq(tipoPrazos.id, input.id))
        .returning();

      return updated;
    }),

  /**
   * Popula tipos de prazo padrão
   */
  seedTiposPrazo: protectedProcedure.mutation(async () => {
    const inserted = await seedTiposPrazo();
    return { inserted, message: `${inserted} tipos de prazo inseridos` };
  }),

  // ==========================================
  // FERIADOS FORENSES
  // ==========================================

  /**
   * Lista feriados forenses
   */
  listFeriados: protectedProcedure
    .input(
      z.object({
        ano: z.number().optional(),
        dataInicio: z.string().optional(),
        dataFim: z.string().optional(),
        abrangencia: z.enum(["NACIONAL", "ESTADUAL", "MUNICIPAL", "TRIBUNAL"]).optional(),
        estado: z.string().optional(),
        tribunal: z.string().optional(),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const filters = input || {};
      const conditions: any[] = [];

      // Workspace: feriados globais (null) ou do workspace
      conditions.push(
        or(
          isNull(feriadosForenses.workspaceId),
          eq(feriadosForenses.workspaceId, ctx.user.workspaceId || 0)
        )
      );

      if (filters.ano) {
        conditions.push(
          sql`EXTRACT(YEAR FROM ${feriadosForenses.data}) = ${filters.ano}`
        );
      }

      if (filters.dataInicio) {
        conditions.push(gte(feriadosForenses.data, filters.dataInicio));
      }

      if (filters.dataFim) {
        conditions.push(lte(feriadosForenses.data, filters.dataFim));
      }

      if (filters.abrangencia) {
        conditions.push(eq(feriadosForenses.abrangencia, filters.abrangencia));
      }

      if (filters.estado) {
        conditions.push(eq(feriadosForenses.estado, filters.estado));
      }

      if (filters.tribunal) {
        conditions.push(eq(feriadosForenses.tribunal, filters.tribunal));
      }

      return db
        .select()
        .from(feriadosForenses)
        .where(and(...conditions))
        .orderBy(asc(feriadosForenses.data));
    }),

  /**
   * Cria feriado forense
   */
  createFeriado: protectedProcedure
    .input(
      z.object({
        data: z.string(),
        nome: z.string().min(1).max(150),
        tipo: z.enum(["FERIADO", "PONTO_FACULTATIVO", "RECESSO", "SUSPENSAO"]).default("FERIADO"),
        abrangencia: z.enum(["NACIONAL", "ESTADUAL", "MUNICIPAL", "TRIBUNAL"]).default("NACIONAL"),
        estado: z.string().optional(),
        comarca: z.string().optional(),
        tribunal: z.string().optional(),
        suspendePrazo: z.boolean().default(true),
        apenasExpediente: z.boolean().default(false),
        dataFim: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [created] = await db
        .insert(feriadosForenses)
        .values({
          ...input,
          workspaceId: ctx.user.workspaceId,
        })
        .returning();

      return created;
    }),

  /**
   * Atualiza feriado
   */
  updateFeriado: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        data: z.string().optional(),
        nome: z.string().min(1).max(150).optional(),
        tipo: z.enum(["FERIADO", "PONTO_FACULTATIVO", "RECESSO", "SUSPENSAO"]).optional(),
        abrangencia: z.enum(["NACIONAL", "ESTADUAL", "MUNICIPAL", "TRIBUNAL"]).optional(),
        estado: z.string().optional(),
        comarca: z.string().optional(),
        tribunal: z.string().optional(),
        suspendePrazo: z.boolean().optional(),
        apenasExpediente: z.boolean().optional(),
        dataFim: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, ...data } = input;

      const [updated] = await db
        .update(feriadosForenses)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(feriadosForenses.id, id))
        .returning();

      return updated;
    }),

  /**
   * Remove feriado
   */
  deleteFeriado: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await db.delete(feriadosForenses).where(eq(feriadosForenses.id, input.id));
      return { success: true };
    }),

  // ==========================================
  // CÁLCULO DE PRAZOS
  // ==========================================

  /**
   * Calcula prazo automaticamente
   */
  calcularPrazo: protectedProcedure
    .input(
      z.object({
        // Datas de entrada
        dataExpedicao: z.string().optional(),
        dataLeitura: z.string().optional(),

        // Tipo de prazo
        tipoPrazoCodigo: z.string().optional(),
        prazoBaseDias: z.number().optional(),

        // Configurações
        areaDireito: z.enum(["CRIMINAL", "CIVEL", "TRABALHISTA", "EXECUCAO_PENAL", "JURI"]).optional(),
        aplicarDobro: z.boolean().optional(),
        tempoLeituraDias: z.number().optional(),
        contarEmDiasUteis: z.boolean().optional(),

        // Contexto
        estado: z.string().optional(),
        comarca: z.string().optional(),
        tribunal: z.string().optional(),

        // Para salvar no histórico
        demandaId: z.number().optional(),
        salvarHistorico: z.boolean().default(false),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const params: ParametrosCalculo = {
        dataExpedicao: input.dataExpedicao,
        dataLeitura: input.dataLeitura,
        tipoPrazoCodigo: input.tipoPrazoCodigo,
        prazoBaseDias: input.prazoBaseDias,
        areaDireito: input.areaDireito,
        aplicarDobro: input.aplicarDobro,
        tempoLeituraDias: input.tempoLeituraDias,
        contarEmDiasUteis: input.contarEmDiasUteis,
        estado: input.estado || "BA",
        comarca: input.comarca,
        tribunal: input.tribunal,
        workspaceId: ctx.user.workspaceId || undefined,
      };

      const resultado = await calcularPrazo(params);

      // Salvar no histórico se solicitado
      if (input.salvarHistorico && input.demandaId) {
        await salvarCalculoPrazo(
          input.demandaId,
          resultado,
          input.tipoPrazoCodigo,
          ctx.user.workspaceId || undefined,
          ctx.user.id
        );
      }

      return {
        ...resultado,
        // Formatar datas para o frontend
        dataExpedicao: resultado.dataExpedicao.toISOString().split("T")[0],
        dataLeitura: resultado.dataLeitura.toISOString().split("T")[0],
        dataTermoInicial: resultado.dataTermoInicial.toISOString().split("T")[0],
        dataTermoFinal: resultado.dataTermoFinal.toISOString().split("T")[0],
        feriadosEncontrados: resultado.feriadosEncontrados.map((f) => ({
          data: f.data.toISOString().split("T")[0],
          nome: f.nome,
        })),
      };
    }),

  /**
   * Histórico de cálculos de uma demanda
   */
  historicoCalculos: protectedProcedure
    .input(z.object({ demandaId: z.number() }))
    .query(async ({ input }) => {
      return db
        .select()
        .from(calculosPrazos)
        .where(eq(calculosPrazos.demandaId, input.demandaId))
        .orderBy(desc(calculosPrazos.createdAt));
    }),

  // ==========================================
  // DASHBOARD DE PRAZOS CRÍTICOS
  // ==========================================

  /**
   * Lista prazos críticos (vencendo em breve ou vencidos)
   */
  prazosCriticos: protectedProcedure
    .input(
      z.object({
        diasAFrente: z.number().default(7), // Próximos X dias
        incluirVencidos: z.boolean().default(true),
        apenasReuPreso: z.boolean().default(false),
        status: z.array(z.string()).optional(),
        defensorId: z.number().optional(),
        limit: z.number().default(50),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const filters = input || {};
      const hoje = new Date();
      const dataLimite = new Date();
      dataLimite.setDate(dataLimite.getDate() + (filters.diasAFrente || 7));

      const conditions: any[] = [];

      // Workspace
      const workspaceScope = getWorkspaceScope(ctx.user);
      if (workspaceScope.workspaceId) {
        conditions.push(eq(demandas.workspaceId, workspaceScope.workspaceId));
      }

      // Prazo não nulo
      conditions.push(sql`${demandas.prazo} IS NOT NULL`);

      // Data do prazo
      if (filters.incluirVencidos) {
        // Vencidos OU vencendo nos próximos dias
        conditions.push(lte(demandas.prazo, dataLimite.toISOString().split("T")[0]));
      } else {
        // Apenas vencendo nos próximos dias (não vencidos)
        conditions.push(gte(demandas.prazo, hoje.toISOString().split("T")[0]));
        conditions.push(lte(demandas.prazo, dataLimite.toISOString().split("T")[0]));
      }

      // Não concluídos/arquivados
      conditions.push(
        sql`${demandas.status} NOT IN ('CONCLUIDO', 'ARQUIVADO')`
      );

      // Não deletados
      conditions.push(isNull(demandas.deletedAt));

      // Réu preso
      if (filters.apenasReuPreso) {
        conditions.push(eq(demandas.reuPreso, true));
      }

      // Status específicos
      if (filters.status && filters.status.length > 0) {
        conditions.push(sql`${demandas.status} IN (${sql.join(filters.status.map(s => sql`${s}`), sql`, `)})`);
      }

      // Defensor
      if (filters.defensorId) {
        conditions.push(
          or(
            eq(demandas.defensorId, filters.defensorId),
            eq(demandas.delegadoParaId, filters.defensorId)
          )
        );
      }

      const result = await db
        .select({
          demanda: demandas,
          assistido: {
            id: assistidos.id,
            nome: assistidos.nome,
            statusPrisional: assistidos.statusPrisional,
          },
          processo: {
            id: processos.id,
            numeroAutos: processos.numeroAutos,
            vara: processos.vara,
            comarca: processos.comarca,
          },
        })
        .from(demandas)
        .leftJoin(assistidos, eq(demandas.assistidoId, assistidos.id))
        .leftJoin(processos, eq(demandas.processoId, processos.id))
        .where(and(...conditions))
        .orderBy(asc(demandas.prazo), desc(demandas.reuPreso))
        .limit(filters.limit || 50);

      // Calcular dias restantes e categorizar
      return result.map((row) => {
        const prazoDate = row.demanda.prazo ? new Date(row.demanda.prazo) : null;
        const diasRestantes = prazoDate
          ? Math.ceil((prazoDate.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24))
          : null;

        let urgencia: "VENCIDO" | "HOJE" | "CRITICO" | "ATENCAO" | "NORMAL" = "NORMAL";
        if (diasRestantes !== null) {
          if (diasRestantes < 0) urgencia = "VENCIDO";
          else if (diasRestantes === 0) urgencia = "HOJE";
          else if (diasRestantes <= 2) urgencia = "CRITICO";
          else if (diasRestantes <= 5) urgencia = "ATENCAO";
        }

        return {
          ...row,
          diasRestantes,
          urgencia,
        };
      });
    }),

  /**
   * Estatísticas de prazos
   */
  estatisticasPrazos: protectedProcedure
    .input(
      z.object({
        defensorId: z.number().optional(),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const hoje = new Date();
      const hojeStr = hoje.toISOString().split("T")[0];

      const conditions: any[] = [
        sql`${demandas.prazo} IS NOT NULL`,
        isNull(demandas.deletedAt),
        sql`${demandas.status} NOT IN ('CONCLUIDO', 'ARQUIVADO')`,
      ];

      const workspaceScope = getWorkspaceScope(ctx.user);
      if (workspaceScope.workspaceId) {
        conditions.push(eq(demandas.workspaceId, workspaceScope.workspaceId));
      }

      if (input?.defensorId) {
        conditions.push(
          or(
            eq(demandas.defensorId, input.defensorId),
            eq(demandas.delegadoParaId, input.defensorId)
          )
        );
      }

      // Query para contar por categoria
      const baseWhere = and(...conditions);

      const [stats] = await db
        .select({
          total: sql<number>`COUNT(*)::int`,
          vencidos: sql<number>`COUNT(*) FILTER (WHERE ${demandas.prazo} < ${hojeStr})::int`,
          vencendoHoje: sql<number>`COUNT(*) FILTER (WHERE ${demandas.prazo} = ${hojeStr})::int`,
          proximosDias: sql<number>`COUNT(*) FILTER (WHERE ${demandas.prazo} > ${hojeStr} AND ${demandas.prazo} <= ${hoje.toISOString().split("T")[0].replace(/\d{2}$/, String(hoje.getDate() + 7).padStart(2, "0"))})::int`,
          reuPreso: sql<number>`COUNT(*) FILTER (WHERE ${demandas.reuPreso} = true)::int`,
          reuPresoVencido: sql<number>`COUNT(*) FILTER (WHERE ${demandas.reuPreso} = true AND ${demandas.prazo} < ${hojeStr})::int`,
        })
        .from(demandas)
        .where(baseWhere);

      // Prazos por status
      const porStatus = await db
        .select({
          status: demandas.status,
          count: sql<number>`COUNT(*)::int`,
        })
        .from(demandas)
        .where(baseWhere)
        .groupBy(demandas.status);

      return {
        ...stats,
        porStatus: porStatus.reduce(
          (acc, item) => {
            if (item.status) acc[item.status] = item.count;
            return acc;
          },
          {} as Record<string, number>
        ),
      };
    }),
});

export type PrazosRouter = typeof prazosRouter;
