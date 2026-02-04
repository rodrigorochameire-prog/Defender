import { z } from "zod";
import { router, protectedProcedure } from "../init";
import { db } from "@/lib/db";
import { diligencias, casos, assistidos, processos, users } from "@/lib/db/schema";
import { eq, and, isNull, desc, ilike, inArray, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { getWorkspaceScope, resolveWorkspaceId } from "../workspace";

// ==========================================
// SCHEMAS DE VALIDAÇÃO
// ==========================================

const checklistItemSchema = z.object({
  id: z.string(),
  texto: z.string(),
  concluido: z.boolean(),
});

const arquivoSchema = z.object({
  id: z.string(),
  nome: z.string(),
  url: z.string(),
});

const createDiligenciaSchema = z.object({
  casoId: z.number().optional(),
  assistidoId: z.number().optional(),
  processoId: z.number().optional(),

  titulo: z.string().min(1, "Título é obrigatório"),
  descricao: z.string().optional(),

  categoria: z.enum([
    "SOCIAL",
    "CAMPO",
    "OFICIAL",
    "GEO",
    "TELEFONIA",
    "DOCUMENTAL",
    "PERICIAL",
    "TESTEMUNHAL",
  ]),
  status: z.enum([
    "NAO_INICIADA",
    "EM_ANDAMENTO",
    "AGUARDANDO",
    "CONCLUIDA",
    "INFRUTIFERA",
    "CANCELADA",
  ]).default("NAO_INICIADA"),

  executor: z.enum([
    "DEFENSOR",
    "SERVIDOR",
    "ESTAGIARIO",
    "FAMILIA",
    "INFORMANTE",
    "INVESTIGADOR",
    "ASSISTIDO",
    "PERITO",
  ]).optional(),
  executorNome: z.string().optional(),
  executorContato: z.string().optional(),

  prazo: z.string().optional(), // Date string

  checklist: z.array(checklistItemSchema).optional(),
  notas: z.string().optional(),

  prioridade: z.enum(["BAIXA", "NORMAL", "ALTA", "URGENTE", "REU_PRESO"]).default("NORMAL"),
});

const updateDiligenciaSchema = createDiligenciaSchema.partial().extend({
  id: z.number(),
  resultado: z.string().optional(),
  arquivos: z.array(arquivoSchema).optional(),
});

// ==========================================
// ROUTER DE DILIGÊNCIAS
// ==========================================

export const diligenciasRouter = router({
  // ==========================================
  // LISTAR DILIGÊNCIAS
  // ==========================================
  list: protectedProcedure
    .input(
      z.object({
        casoId: z.number().optional(),
        assistidoId: z.number().optional(),
        processoId: z.number().optional(),
        categoria: z.string().optional(),
        status: z.string().optional(),
        search: z.string().optional(),
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      const { workspaceId } = getWorkspaceScope(ctx.user);
      const conditions = [isNull(diligencias.deletedAt)];

      if (workspaceId) {
        conditions.push(eq(diligencias.workspaceId, workspaceId));
      }

      if (input.casoId) {
        conditions.push(eq(diligencias.casoId, input.casoId));
      }

      if (input.assistidoId) {
        conditions.push(eq(diligencias.assistidoId, input.assistidoId));
      }

      if (input.processoId) {
        conditions.push(eq(diligencias.processoId, input.processoId));
      }

      if (input.categoria) {
        conditions.push(eq(diligencias.categoria, input.categoria as any));
      }

      if (input.status) {
        conditions.push(eq(diligencias.status, input.status as any));
      }

      if (input.search) {
        conditions.push(ilike(diligencias.titulo, `%${input.search}%`));
      }

      const result = await db
        .select({
          id: diligencias.id,
          casoId: diligencias.casoId,
          assistidoId: diligencias.assistidoId,
          processoId: diligencias.processoId,
          titulo: diligencias.titulo,
          descricao: diligencias.descricao,
          categoria: diligencias.categoria,
          status: diligencias.status,
          executor: diligencias.executor,
          executorNome: diligencias.executorNome,
          executorContato: diligencias.executorContato,
          dataInicio: diligencias.dataInicio,
          dataConclusao: diligencias.dataConclusao,
          prazo: diligencias.prazo,
          checklist: diligencias.checklist,
          notas: diligencias.notas,
          resultado: diligencias.resultado,
          arquivos: diligencias.arquivos,
          prioridade: diligencias.prioridade,
          createdAt: diligencias.createdAt,
          updatedAt: diligencias.updatedAt,
        })
        .from(diligencias)
        .where(and(...conditions))
        .orderBy(desc(diligencias.createdAt))
        .limit(input.limit)
        .offset(input.offset);

      return result;
    }),

  // ==========================================
  // BUSCAR DILIGÊNCIA POR ID
  // ==========================================
  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const { isAdmin, workspaceId } = getWorkspaceScope(ctx.user);

      const conditions = [
        eq(diligencias.id, input.id),
        isNull(diligencias.deletedAt),
      ];

      if (!isAdmin && workspaceId) {
        conditions.push(eq(diligencias.workspaceId, workspaceId));
      }

      const [diligencia] = await db
        .select()
        .from(diligencias)
        .where(and(...conditions))
        .limit(1);

      if (!diligencia) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Diligência não encontrada",
        });
      }

      // Buscar dados relacionados
      let casoInfo = null;
      let assistidoInfo = null;
      let processoInfo = null;

      if (diligencia.casoId) {
        const [caso] = await db
          .select({ id: casos.id, titulo: casos.titulo, codigo: casos.codigo })
          .from(casos)
          .where(eq(casos.id, diligencia.casoId))
          .limit(1);
        casoInfo = caso;
      }

      if (diligencia.assistidoId) {
        const [assistido] = await db
          .select({ id: assistidos.id, nome: assistidos.nome })
          .from(assistidos)
          .where(eq(assistidos.id, diligencia.assistidoId))
          .limit(1);
        assistidoInfo = assistido;
      }

      if (diligencia.processoId) {
        const [processo] = await db
          .select({ id: processos.id, numeroAutos: processos.numeroAutos })
          .from(processos)
          .where(eq(processos.id, diligencia.processoId))
          .limit(1);
        processoInfo = processo;
      }

      return {
        ...diligencia,
        caso: casoInfo,
        assistido: assistidoInfo,
        processo: processoInfo,
      };
    }),

  // ==========================================
  // CRIAR DILIGÊNCIA
  // ==========================================
  create: protectedProcedure
    .input(createDiligenciaSchema)
    .mutation(async ({ ctx, input }) => {
      const workspaceId = resolveWorkspaceId(ctx.user);

      const [novaDiligencia] = await db
        .insert(diligencias)
        .values({
          ...input,
          categoria: input.categoria as any,
          status: input.status as any,
          executor: input.executor as any,
          prioridade: input.prioridade as any,
          prazo: input.prazo ? input.prazo : null,
          workspaceId,
          createdById: ctx.user?.id,
          dataInicio: input.status === "EM_ANDAMENTO" ? new Date() : null,
        })
        .returning();

      return novaDiligencia;
    }),

  // ==========================================
  // ATUALIZAR DILIGÊNCIA
  // ==========================================
  update: protectedProcedure
    .input(updateDiligenciaSchema)
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      const { isAdmin, workspaceId } = getWorkspaceScope(ctx.user);

      // Verificar se a diligência existe
      const conditions = [
        eq(diligencias.id, id),
        isNull(diligencias.deletedAt),
      ];

      if (!isAdmin && workspaceId) {
        conditions.push(eq(diligencias.workspaceId, workspaceId));
      }

      // Preparar dados para atualização
      const updateData: Record<string, any> = {
        ...data,
        updatedAt: new Date(),
      };

      // Cast dos enums
      if (data.categoria) {
        updateData.categoria = data.categoria as any;
      }
      if (data.status) {
        updateData.status = data.status as any;

        // Se status for EM_ANDAMENTO e não tinha dataInicio, definir
        if (data.status === "EM_ANDAMENTO") {
          const [existing] = await db
            .select({ dataInicio: diligencias.dataInicio })
            .from(diligencias)
            .where(eq(diligencias.id, id))
            .limit(1);

          if (!existing?.dataInicio) {
            updateData.dataInicio = new Date();
          }
        }

        // Se status for CONCLUIDA ou INFRUTIFERA, definir dataConclusao
        if (data.status === "CONCLUIDA" || data.status === "INFRUTIFERA") {
          updateData.dataConclusao = new Date();
        }
      }
      if (data.executor) {
        updateData.executor = data.executor as any;
      }
      if (data.prioridade) {
        updateData.prioridade = data.prioridade as any;
      }

      const [updated] = await db
        .update(diligencias)
        .set(updateData)
        .where(and(...conditions))
        .returning();

      if (!updated) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Diligência não encontrada",
        });
      }

      return updated;
    }),

  // ==========================================
  // ATUALIZAR STATUS DA DILIGÊNCIA
  // ==========================================
  updateStatus: protectedProcedure
    .input(z.object({
      id: z.number(),
      status: z.enum([
        "NAO_INICIADA",
        "EM_ANDAMENTO",
        "AGUARDANDO",
        "CONCLUIDA",
        "INFRUTIFERA",
        "CANCELADA",
      ]),
      resultado: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { isAdmin, workspaceId } = getWorkspaceScope(ctx.user);

      const conditions = [
        eq(diligencias.id, input.id),
        isNull(diligencias.deletedAt),
      ];

      if (!isAdmin && workspaceId) {
        conditions.push(eq(diligencias.workspaceId, workspaceId));
      }

      const updateData: Record<string, any> = {
        status: input.status as any,
        updatedAt: new Date(),
      };

      if (input.resultado) {
        updateData.resultado = input.resultado;
      }

      // Definir dataInicio se estiver iniciando
      if (input.status === "EM_ANDAMENTO") {
        const [existing] = await db
          .select({ dataInicio: diligencias.dataInicio })
          .from(diligencias)
          .where(eq(diligencias.id, input.id))
          .limit(1);

        if (!existing?.dataInicio) {
          updateData.dataInicio = new Date();
        }
      }

      // Definir dataConclusao se estiver concluindo
      if (input.status === "CONCLUIDA" || input.status === "INFRUTIFERA") {
        updateData.dataConclusao = new Date();
      }

      const [updated] = await db
        .update(diligencias)
        .set(updateData)
        .where(and(...conditions))
        .returning();

      if (!updated) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Diligência não encontrada",
        });
      }

      return updated;
    }),

  // ==========================================
  // ATUALIZAR CHECKLIST DA DILIGÊNCIA
  // ==========================================
  updateChecklist: protectedProcedure
    .input(z.object({
      id: z.number(),
      checklist: z.array(checklistItemSchema),
    }))
    .mutation(async ({ ctx, input }) => {
      const { isAdmin, workspaceId } = getWorkspaceScope(ctx.user);

      const conditions = [
        eq(diligencias.id, input.id),
        isNull(diligencias.deletedAt),
      ];

      if (!isAdmin && workspaceId) {
        conditions.push(eq(diligencias.workspaceId, workspaceId));
      }

      const [updated] = await db
        .update(diligencias)
        .set({
          checklist: input.checklist,
          updatedAt: new Date(),
        })
        .where(and(...conditions))
        .returning();

      if (!updated) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Diligência não encontrada",
        });
      }

      return updated;
    }),

  // ==========================================
  // SOFT DELETE DILIGÊNCIA
  // ==========================================
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const { isAdmin, workspaceId } = getWorkspaceScope(ctx.user);

      const conditions = [
        eq(diligencias.id, input.id),
        isNull(diligencias.deletedAt),
      ];

      if (!isAdmin && workspaceId) {
        conditions.push(eq(diligencias.workspaceId, workspaceId));
      }

      const [deleted] = await db
        .update(diligencias)
        .set({ deletedAt: new Date() })
        .where(and(...conditions))
        .returning();

      if (!deleted) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Diligência não encontrada",
        });
      }

      return { success: true };
    }),

  // ==========================================
  // ESTATÍSTICAS DE DILIGÊNCIAS
  // ==========================================
  getStats: protectedProcedure
    .input(z.object({
      casoId: z.number().optional(),
      assistidoId: z.number().optional(),
      processoId: z.number().optional(),
    }).optional())
    .query(async ({ ctx, input }) => {
      const { workspaceId } = getWorkspaceScope(ctx.user);
      const filters = input || {};

      const conditions = [isNull(diligencias.deletedAt)];

      if (workspaceId) {
        conditions.push(eq(diligencias.workspaceId, workspaceId));
      }

      if (filters.casoId) {
        conditions.push(eq(diligencias.casoId, filters.casoId));
      }

      if (filters.assistidoId) {
        conditions.push(eq(diligencias.assistidoId, filters.assistidoId));
      }

      if (filters.processoId) {
        conditions.push(eq(diligencias.processoId, filters.processoId));
      }

      // Total
      const [total] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(diligencias)
        .where(and(...conditions));

      // Por status
      const [emAndamento] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(diligencias)
        .where(and(
          ...conditions,
          inArray(diligencias.status, ["EM_ANDAMENTO", "AGUARDANDO"] as any)
        ));

      const [concluidas] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(diligencias)
        .where(and(
          ...conditions,
          eq(diligencias.status, "CONCLUIDA" as any)
        ));

      const [pendentes] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(diligencias)
        .where(and(
          ...conditions,
          eq(diligencias.status, "NAO_INICIADA" as any)
        ));

      const [infrutiferas] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(diligencias)
        .where(and(
          ...conditions,
          eq(diligencias.status, "INFRUTIFERA" as any)
        ));

      return {
        total: total?.count || 0,
        emAndamento: emAndamento?.count || 0,
        concluidas: concluidas?.count || 0,
        pendentes: pendentes?.count || 0,
        infrutiferas: infrutiferas?.count || 0,
      };
    }),

  // ==========================================
  // LISTAR POR CATEGORIA (AGRUPADO)
  // ==========================================
  listByCategoria: protectedProcedure
    .input(z.object({
      casoId: z.number().optional(),
      assistidoId: z.number().optional(),
      processoId: z.number().optional(),
    }).optional())
    .query(async ({ ctx, input }) => {
      const { workspaceId } = getWorkspaceScope(ctx.user);
      const filters = input || {};

      const conditions = [isNull(diligencias.deletedAt)];

      if (workspaceId) {
        conditions.push(eq(diligencias.workspaceId, workspaceId));
      }

      if (filters.casoId) {
        conditions.push(eq(diligencias.casoId, filters.casoId));
      }

      if (filters.assistidoId) {
        conditions.push(eq(diligencias.assistidoId, filters.assistidoId));
      }

      if (filters.processoId) {
        conditions.push(eq(diligencias.processoId, filters.processoId));
      }

      const result = await db
        .select({
          categoria: diligencias.categoria,
          count: sql<number>`count(*)::int`,
        })
        .from(diligencias)
        .where(and(...conditions))
        .groupBy(diligencias.categoria);

      return result;
    }),
});
