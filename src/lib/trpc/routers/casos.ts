import { z } from "zod";
import { router, protectedProcedure } from "../init";
import { db } from "@/lib/db";
import { 
  casos, 
  assistidos, 
  processos, 
  demandas, 
  audiencias,
  casosConexos,
  casoTags,
  audienciasHistorico 
} from "@/lib/db/schema";
import { eq, and, isNull, sql, desc, ilike, inArray } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

// ==========================================
// SCHEMAS DE VALIDAÇÃO
// ==========================================

const createCasoSchema = z.object({
  titulo: z.string().min(1, "Título é obrigatório"),
  codigo: z.string().optional(),
  atribuicao: z.enum([
    "JURI_CAMACARI",
    "VVD_CAMACARI",
    "EXECUCAO_PENAL",
    "SUBSTITUICAO",
    "SUBSTITUICAO_CIVEL",
    "GRUPO_JURI",
  ]),
  status: z.string().default("ativo"),
  fase: z.string().optional(),
  prioridade: z.enum(["BAIXA", "NORMAL", "ALTA", "URGENTE", "REU_PRESO"]).default("NORMAL"),
  teoriaFatos: z.string().optional(),
  teoriaProvas: z.string().optional(),
  teoriaDireito: z.string().optional(),
  tags: z.string().optional(), // JSON array
  linkDrive: z.string().url().optional(),
  observacoes: z.string().optional(),
  casoConexoId: z.number().optional(),
});

const updateCasoSchema = createCasoSchema.partial().extend({
  id: z.number(),
});

const updateTeoriaSchema = z.object({
  casoId: z.number(),
  field: z.enum(["teoriaFatos", "teoriaProvas", "teoriaDireito"]),
  value: z.string(),
});

const createCasoConexoSchema = z.object({
  casoOrigemId: z.number(),
  casoDestinoId: z.number(),
  tipoConexao: z.string().optional(),
  descricao: z.string().optional(),
});

const saveAudienciaNotasSchema = z.object({
  audienciaId: z.number(),
  anotacoes: z.string(),
});

// ==========================================
// ROUTER DE CASOS
// ==========================================

export const casosRouter = router({
  // ==========================================
  // LISTAR CASOS
  // ==========================================
  list: protectedProcedure
    .input(
      z.object({
        atribuicao: z.string().optional(),
        status: z.string().optional(),
        fase: z.string().optional(),
        search: z.string().optional(),
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().default(0),
      }).optional()
    )
    .query(async ({ input }) => {
      const filters = input || {};
      
      const conditions = [isNull(casos.deletedAt)];
      
      if (filters.atribuicao) {
        conditions.push(eq(casos.atribuicao, filters.atribuicao as any));
      }
      
      if (filters.status) {
        conditions.push(eq(casos.status, filters.status));
      }
      
      if (filters.fase) {
        conditions.push(eq(casos.fase, filters.fase));
      }
      
      if (filters.search) {
        conditions.push(ilike(casos.titulo, `%${filters.search}%`));
      }

      const result = await db
        .select({
          id: casos.id,
          titulo: casos.titulo,
          codigo: casos.codigo,
          atribuicao: casos.atribuicao,
          status: casos.status,
          fase: casos.fase,
          prioridade: casos.prioridade,
          tags: casos.tags,
          linkDrive: casos.linkDrive,
          defensorId: casos.defensorId,
          createdAt: casos.createdAt,
          hasTeoriaFatos: sql<boolean>`${casos.teoriaFatos} IS NOT NULL AND ${casos.teoriaFatos} != ''`,
          hasTeoriaProvas: sql<boolean>`${casos.teoriaProvas} IS NOT NULL AND ${casos.teoriaProvas} != ''`,
          hasTeoriaDireito: sql<boolean>`${casos.teoriaDireito} IS NOT NULL AND ${casos.teoriaDireito} != ''`,
        })
        .from(casos)
        .where(and(...conditions))
        .orderBy(desc(casos.createdAt))
        .limit(filters.limit)
        .offset(filters.offset);

      // Buscar contagens de assistidos, processos e demandas para cada caso
      // Em uma implementação real, isso seria feito com subqueries ou views
      
      return result;
    }),

  // ==========================================
  // BUSCAR CASO POR ID
  // ==========================================
  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const [caso] = await db
        .select()
        .from(casos)
        .where(and(eq(casos.id, input.id), isNull(casos.deletedAt)))
        .limit(1);

      if (!caso) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Caso não encontrado",
        });
      }

      // Buscar assistidos vinculados
      const assistidosVinculados = await db
        .select({
          id: assistidos.id,
          nome: assistidos.nome,
          photoUrl: assistidos.photoUrl,
          statusPrisional: assistidos.statusPrisional,
          localPrisao: assistidos.localPrisao,
        })
        .from(assistidos)
        .where(and(
          eq(assistidos.casoId, input.id),
          isNull(assistidos.deletedAt)
        ));

      // Buscar processos vinculados
      const processosVinculados = await db
        .select({
          id: processos.id,
          numeroAutos: processos.numeroAutos,
          vara: processos.vara,
          comarca: processos.comarca,
          fase: processos.fase,
          isJuri: processos.isJuri,
        })
        .from(processos)
        .where(and(
          eq(processos.casoId, input.id),
          isNull(processos.deletedAt)
        ));

      // Buscar audiências
      const audienciasVinculadas = await db
        .select()
        .from(audiencias)
        .where(eq(audiencias.casoId, input.id))
        .orderBy(audiencias.dataAudiencia);

      // Buscar casos conexos
      const conexos = await db
        .select({
          id: casosConexos.id,
          casoDestinoId: casosConexos.casoDestinoId,
          tipoConexao: casosConexos.tipoConexao,
          descricao: casosConexos.descricao,
          casoTitulo: casos.titulo,
        })
        .from(casosConexos)
        .innerJoin(casos, eq(casosConexos.casoDestinoId, casos.id))
        .where(eq(casosConexos.casoOrigemId, input.id));

      return {
        ...caso,
        assistidos: assistidosVinculados.map(a => ({
          ...a,
          preso: a.statusPrisional !== "SOLTO",
        })),
        processos: processosVinculados,
        audiencias: audienciasVinculadas,
        conexos,
      };
    }),

  // ==========================================
  // CRIAR CASO
  // ==========================================
  create: protectedProcedure
    .input(createCasoSchema)
    .mutation(async ({ input, ctx }) => {
      const [novoCaso] = await db
        .insert(casos)
        .values({
          ...input,
          atribuicao: input.atribuicao as any,
          prioridade: input.prioridade as any,
          defensorId: ctx.user?.id,
        })
        .returning();

      return novoCaso;
    }),

  // ==========================================
  // ATUALIZAR CASO
  // ==========================================
  update: protectedProcedure
    .input(updateCasoSchema)
    .mutation(async ({ input }) => {
      const { id, ...data } = input;

      const [updated] = await db
        .update(casos)
        .set({
          ...data,
          atribuicao: data.atribuicao as any,
          prioridade: data.prioridade as any,
          updatedAt: new Date(),
        })
        .where(and(eq(casos.id, id), isNull(casos.deletedAt)))
        .returning();

      if (!updated) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Caso não encontrado",
        });
      }

      return updated;
    }),

  // ==========================================
  // ATUALIZAR TEORIA DO CASO
  // ==========================================
  updateTeoria: protectedProcedure
    .input(updateTeoriaSchema)
    .mutation(async ({ input }) => {
      const updateData: Record<string, any> = {
        [input.field]: input.value,
        updatedAt: new Date(),
      };

      const [updated] = await db
        .update(casos)
        .set(updateData)
        .where(and(eq(casos.id, input.casoId), isNull(casos.deletedAt)))
        .returning();

      if (!updated) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Caso não encontrado",
        });
      }

      return updated;
    }),

  // ==========================================
  // SOFT DELETE CASO
  // ==========================================
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const [deleted] = await db
        .update(casos)
        .set({ deletedAt: new Date() })
        .where(and(eq(casos.id, input.id), isNull(casos.deletedAt)))
        .returning();

      if (!deleted) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Caso não encontrado",
        });
      }

      return { success: true };
    }),

  // ==========================================
  // CRIAR CONEXÃO ENTRE CASOS
  // ==========================================
  createConexao: protectedProcedure
    .input(createCasoConexoSchema)
    .mutation(async ({ input }) => {
      const [conexao] = await db
        .insert(casosConexos)
        .values(input)
        .returning();

      return conexao;
    }),

  // ==========================================
  // REMOVER CONEXÃO ENTRE CASOS
  // ==========================================
  removeConexao: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await db
        .delete(casosConexos)
        .where(eq(casosConexos.id, input.id));

      return { success: true };
    }),

  // ==========================================
  // BUSCAR CASOS SIMILARES (POR TAGS)
  // ==========================================
  findSimilar: protectedProcedure
    .input(z.object({ 
      casoId: z.number(),
      tags: z.array(z.string()),
    }))
    .query(async ({ input }) => {
      // Buscar casos com pelo menos uma tag em comum
      const result = await db
        .select({
          id: casos.id,
          titulo: casos.titulo,
          codigo: casos.codigo,
          fase: casos.fase,
          tags: casos.tags,
        })
        .from(casos)
        .where(and(
          isNull(casos.deletedAt),
          sql`${casos.id} != ${input.casoId}`,
        ))
        .limit(10);

      // Filtrar por tags em comum
      const similarCases = result.filter(c => {
        if (!c.tags) return false;
        try {
          const caseTags = JSON.parse(c.tags);
          return input.tags.some(tag => caseTags.includes(tag));
        } catch {
          return false;
        }
      });

      return similarCases;
    }),

  // ==========================================
  // SALVAR ANOTAÇÕES DE AUDIÊNCIA (COM VERSIONAMENTO)
  // ==========================================
  saveAudienciaNotas: protectedProcedure
    .input(saveAudienciaNotasSchema)
    .mutation(async ({ input, ctx }) => {
      // Buscar versão atual
      const [audiencia] = await db
        .select({ anotacoesVersao: audiencias.anotacoesVersao, anotacoes: audiencias.anotacoes })
        .from(audiencias)
        .where(eq(audiencias.id, input.audienciaId))
        .limit(1);

      if (!audiencia) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Audiência não encontrada",
        });
      }

      const novaVersao = (audiencia.anotacoesVersao || 0) + 1;

      // Salvar histórico se houver anotação anterior
      if (audiencia.anotacoes) {
        await db.insert(audienciasHistorico).values({
          audienciaId: input.audienciaId,
          versao: audiencia.anotacoesVersao || 1,
          anotacoes: audiencia.anotacoes,
          editadoPorId: ctx.user?.id,
        });
      }

      // Atualizar audiência com nova anotação
      const [updated] = await db
        .update(audiencias)
        .set({
          anotacoes: input.anotacoes,
          anotacoesVersao: novaVersao,
        })
        .where(eq(audiencias.id, input.audienciaId))
        .returning();

      return updated;
    }),

  // ==========================================
  // LISTAR TAGS DISPONÍVEIS
  // ==========================================
  listTags: protectedProcedure
    .query(async () => {
      const tags = await db
        .select()
        .from(casoTags)
        .orderBy(desc(casoTags.usoCount))
        .limit(50);

      return tags;
    }),

  // ==========================================
  // CRIAR/ATUALIZAR TAG
  // ==========================================
  upsertTag: protectedProcedure
    .input(z.object({
      nome: z.string().min(1),
      descricao: z.string().optional(),
      cor: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const [tag] = await db
        .insert(casoTags)
        .values({
          nome: input.nome,
          descricao: input.descricao,
          cor: input.cor || "slate",
          usoCount: 1,
        })
        .onConflictDoUpdate({
          target: casoTags.nome,
          set: {
            usoCount: sql`${casoTags.usoCount} + 1`,
          },
        })
        .returning();

      return tag;
    }),

  // ==========================================
  // VINCULAR ASSISTIDO AO CASO
  // ==========================================
  vincularAssistido: protectedProcedure
    .input(z.object({
      casoId: z.number(),
      assistidoId: z.number(),
    }))
    .mutation(async ({ input }) => {
      const [updated] = await db
        .update(assistidos)
        .set({ casoId: input.casoId })
        .where(eq(assistidos.id, input.assistidoId))
        .returning();

      if (!updated) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Assistido não encontrado",
        });
      }

      return updated;
    }),

  // ==========================================
  // VINCULAR PROCESSO AO CASO
  // ==========================================
  vincularProcesso: protectedProcedure
    .input(z.object({
      casoId: z.number(),
      processoId: z.number(),
    }))
    .mutation(async ({ input }) => {
      const [updated] = await db
        .update(processos)
        .set({ casoId: input.casoId })
        .where(eq(processos.id, input.processoId))
        .returning();

      if (!updated) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Processo não encontrado",
        });
      }

      return updated;
    }),

  // ==========================================
  // ESTATÍSTICAS DO DASHBOARD
  // ==========================================
  getDashboardStats: protectedProcedure
    .input(z.object({
      atribuicao: z.string().optional(),
    }).optional())
    .query(async ({ input }) => {
      const filters = input || {};
      
      const conditions = [isNull(casos.deletedAt)];
      
      if (filters.atribuicao) {
        conditions.push(eq(casos.atribuicao, filters.atribuicao as any));
      }

      // Total de casos ativos
      const [totalCasos] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(casos)
        .where(and(...conditions, eq(casos.status, "ativo")));

      // Casos com réu preso
      const [casosReuPreso] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(casos)
        .where(and(...conditions, eq(casos.prioridade, "REU_PRESO")));

      // Demandas pendentes
      const [demandasPendentes] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(demandas)
        .where(and(
          isNull(demandas.deletedAt),
          sql`${demandas.status} NOT IN ('7_PROTOCOLADO', '7_CIENCIA', 'CONCLUIDO', 'ARQUIVADO')`
        ));

      // Audiências futuras
      const [audienciasFuturas] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(audiencias)
        .where(and(
          sql`${audiencias.dataAudiencia} > NOW()`,
          eq(audiencias.status, "agendada")
        ));

      return {
        totalCasos: totalCasos?.count || 0,
        casosReuPreso: casosReuPreso?.count || 0,
        demandasPendentes: demandasPendentes?.count || 0,
        audienciasFuturas: audienciasFuturas?.count || 0,
      };
    }),
});
