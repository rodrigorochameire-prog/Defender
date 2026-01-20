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
  audienciasHistorico,
  casePersonas,
  caseFacts,
  factEvidence,
  juriScriptItems,
  documentos
} from "@/lib/db/schema";
import { eq, and, isNull, sql, desc, ilike, inArray } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { getWorkspaceScope, resolveWorkspaceId } from "../workspace";

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

const createPersonaSchema = z.object({
  casoId: z.number(),
  assistidoId: z.number().optional(),
  juradoId: z.number().optional(),
  nome: z.string().min(1),
  tipo: z.string().min(1),
  status: z.string().optional(),
  perfil: z.record(z.unknown()).optional(),
  contatos: z.record(z.unknown()).optional(),
  observacoes: z.string().optional(),
});

const updatePersonaSchema = createPersonaSchema.partial().extend({
  id: z.number(),
});

const createFactSchema = z.object({
  casoId: z.number(),
  titulo: z.string().min(1),
  descricao: z.string().optional(),
  tipo: z.string().optional(),
  tags: z.array(z.string()).optional(),
  status: z.string().optional(),
});

const updateFactSchema = createFactSchema.partial().extend({
  id: z.number(),
});

const createEvidenceSchema = z.object({
  factId: z.number(),
  documentoId: z.number().optional(),
  sourceType: z.string().optional(),
  sourceId: z.string().optional(),
  trecho: z.string().optional(),
  contradicao: z.boolean().optional(),
  confianca: z.number().min(0).max(100).optional(),
});

const updateEvidenceSchema = createEvidenceSchema.partial().extend({
  id: z.number(),
});

const createScriptItemSchema = z.object({
  casoId: z.number(),
  sessaoJuriId: z.number().optional(),
  personaId: z.number().optional(),
  factId: z.number().optional(),
  pergunta: z.string().optional(),
  fase: z.string().optional(),
  ordem: z.number().optional(),
  notas: z.string().optional(),
});

const updateScriptItemSchema = createScriptItemSchema.partial().extend({
  id: z.number(),
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
      })
    )
    .query(async ({ ctx, input }) => {
      const { isAdmin, workspaceId } = getWorkspaceScope(ctx.user);
      const conditions = [isNull(casos.deletedAt)];
      
      if (input.atribuicao) {
        conditions.push(eq(casos.atribuicao, input.atribuicao as any));
      }
      
      if (input.status) {
        conditions.push(eq(casos.status, input.status));
      }
      
      if (input.fase) {
        conditions.push(eq(casos.fase, input.fase));
      }
      
      if (input.search) {
        conditions.push(ilike(casos.titulo, `%${input.search}%`));
      }

      if (!isAdmin) {
        conditions.push(eq(casos.workspaceId, workspaceId));
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
        .limit(input.limit)
        .offset(input.offset);

      // Buscar contagens de assistidos, processos e demandas para cada caso
      // Em uma implementação real, isso seria feito com subqueries ou views
      
      return result;
    }),

  // ==========================================
  // BUSCAR CASO POR ID
  // ==========================================
  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const { isAdmin, workspaceId } = getWorkspaceScope(ctx.user);
      const conditions = [eq(casos.id, input.id), isNull(casos.deletedAt)];

      if (!isAdmin) {
        conditions.push(eq(casos.workspaceId, workspaceId));
      }

      const [caso] = await db
        .select()
        .from(casos)
        .where(and(...conditions))
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

      const personas = await db
        .select({
          id: casePersonas.id,
          nome: casePersonas.nome,
          tipo: casePersonas.tipo,
          status: casePersonas.status,
          assistidoId: casePersonas.assistidoId,
          juradoId: casePersonas.juradoId,
          perfil: casePersonas.perfil,
          contatos: casePersonas.contatos,
          observacoes: casePersonas.observacoes,
        })
        .from(casePersonas)
        .where(eq(casePersonas.casoId, input.id))
        .orderBy(desc(casePersonas.createdAt));

      const facts = await db
        .select({
          id: caseFacts.id,
          titulo: caseFacts.titulo,
          descricao: caseFacts.descricao,
          tipo: caseFacts.tipo,
          tags: caseFacts.tags,
          status: caseFacts.status,
        })
        .from(caseFacts)
        .where(eq(caseFacts.casoId, input.id))
        .orderBy(desc(caseFacts.createdAt));

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
        personas,
        facts,
      };
    }),

  // ==========================================
  // CRIAR CASO
  // ==========================================
  create: protectedProcedure
    .input(createCasoSchema)
    .mutation(async ({ input, ctx }) => {
      const workspaceId = resolveWorkspaceId(ctx.user);

      if (!workspaceId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Defina um workspace para criar o caso.",
        });
      }

      const [novoCaso] = await db
        .insert(casos)
        .values({
          ...input,
          atribuicao: input.atribuicao as any,
          prioridade: input.prioridade as any,
          defensorId: ctx.user?.id,
          workspaceId,
        })
        .returning();

      return novoCaso;
    }),

  // ==========================================
  // ATUALIZAR CASO
  // ==========================================
  update: protectedProcedure
    .input(updateCasoSchema)
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      const { isAdmin, workspaceId } = getWorkspaceScope(ctx.user);

      const [updated] = await db
        .update(casos)
        .set({
          ...data,
          atribuicao: data.atribuicao as any,
          prioridade: data.prioridade as any,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(casos.id, id),
            isNull(casos.deletedAt),
            ...(isAdmin ? [] : [eq(casos.workspaceId, workspaceId)])
          )
        )
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
    .mutation(async ({ ctx, input }) => {
      const { isAdmin, workspaceId } = getWorkspaceScope(ctx.user);
      const updateData: Record<string, any> = {
        [input.field]: input.value,
        updatedAt: new Date(),
      };

      const [updated] = await db
        .update(casos)
        .set(updateData)
        .where(
          and(
            eq(casos.id, input.casoId),
            isNull(casos.deletedAt),
            ...(isAdmin ? [] : [eq(casos.workspaceId, workspaceId)])
          )
        )
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
    .mutation(async ({ ctx, input }) => {
      const { isAdmin, workspaceId } = getWorkspaceScope(ctx.user);
      const [deleted] = await db
        .update(casos)
        .set({ deletedAt: new Date() })
        .where(
          and(
            eq(casos.id, input.id),
            isNull(casos.deletedAt),
            ...(isAdmin ? [] : [eq(casos.workspaceId, workspaceId)])
          )
        )
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
    .mutation(async ({ ctx, input }) => {
      const { isAdmin, workspaceId } = getWorkspaceScope(ctx.user);
      const casosSelecionados = await db
        .select({ id: casos.id, workspaceId: casos.workspaceId })
        .from(casos)
        .where(inArray(casos.id, [input.casoOrigemId, input.casoDestinoId]));

      if (casosSelecionados.length !== 2) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Casos não encontrados",
        });
      }

      const workspaceIds = new Set(casosSelecionados.map((c) => c.workspaceId));

      if (workspaceIds.size !== 1) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Os casos precisam pertencer ao mesmo workspace.",
        });
      }

      if (!isAdmin && !workspaceIds.has(workspaceId)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Você não tem acesso a esses casos.",
        });
      }

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
    .mutation(async ({ ctx, input }) => {
      const { isAdmin, workspaceId } = getWorkspaceScope(ctx.user);
      const [conexao] = await db
        .select({ id: casosConexos.id, workspaceId: casos.workspaceId })
        .from(casosConexos)
        .innerJoin(casos, eq(casosConexos.casoOrigemId, casos.id))
        .where(eq(casosConexos.id, input.id))
        .limit(1);

      if (!conexao) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Conexão não encontrada",
        });
      }

      if (!isAdmin && conexao.workspaceId !== workspaceId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Você não tem acesso a essa conexão.",
        });
      }

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
    .query(async ({ ctx, input }) => {
      const { isAdmin, workspaceId } = getWorkspaceScope(ctx.user);
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
        .where(
          and(
            isNull(casos.deletedAt),
            sql`${casos.id} != ${input.casoId}`,
            ...(isAdmin ? [] : [eq(casos.workspaceId, workspaceId)])
          )
        )
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
      const { isAdmin, workspaceId } = getWorkspaceScope(ctx.user);
      // Buscar versão atual
      const [audiencia] = await db
        .select({ anotacoesVersao: audiencias.anotacoesVersao, anotacoes: audiencias.anotacoes })
        .from(audiencias)
        .where(
          and(
            eq(audiencias.id, input.audienciaId),
            ...(isAdmin ? [] : [eq(audiencias.workspaceId, workspaceId)])
          )
        )
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
        .where(
          and(
            eq(audiencias.id, input.audienciaId),
            ...(isAdmin ? [] : [eq(audiencias.workspaceId, workspaceId)])
          )
        )
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
    .mutation(async ({ ctx, input }) => {
      const { isAdmin, workspaceId } = getWorkspaceScope(ctx.user);
      const [caso] = await db
        .select({ id: casos.id, workspaceId: casos.workspaceId })
        .from(casos)
        .where(and(eq(casos.id, input.casoId), isNull(casos.deletedAt)))
        .limit(1);

      if (!caso) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Caso não encontrado",
        });
      }

      if (!isAdmin && caso.workspaceId !== workspaceId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Você não tem acesso a este caso.",
        });
      }

      const [assistido] = await db
        .select({ id: assistidos.id, workspaceId: assistidos.workspaceId })
        .from(assistidos)
        .where(eq(assistidos.id, input.assistidoId))
        .limit(1);

      if (!assistido) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Assistido não encontrado",
        });
      }

      if (assistido.workspaceId !== caso.workspaceId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Assistido com workspace divergente do caso.",
        });
      }

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
    .mutation(async ({ ctx, input }) => {
      const { isAdmin, workspaceId } = getWorkspaceScope(ctx.user);
      const [caso] = await db
        .select({ id: casos.id, workspaceId: casos.workspaceId })
        .from(casos)
        .where(and(eq(casos.id, input.casoId), isNull(casos.deletedAt)))
        .limit(1);

      if (!caso) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Caso não encontrado",
        });
      }

      if (!isAdmin && caso.workspaceId !== workspaceId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Você não tem acesso a este caso.",
        });
      }

      const [processo] = await db
        .select({ id: processos.id, workspaceId: processos.workspaceId })
        .from(processos)
        .where(eq(processos.id, input.processoId))
        .limit(1);

      if (!processo) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Processo não encontrado",
        });
      }

      if (processo.workspaceId !== caso.workspaceId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Processo com workspace divergente do caso.",
        });
      }

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
  // PERSONAS DO CASO
  // ==========================================
  listPersonas: protectedProcedure
    .input(z.object({ casoId: z.number() }))
    .query(async ({ input }) => {
      const result = await db
        .select()
        .from(casePersonas)
        .where(eq(casePersonas.casoId, input.casoId))
        .orderBy(desc(casePersonas.createdAt));

      return result;
    }),

  createPersona: protectedProcedure
    .input(createPersonaSchema)
    .mutation(async ({ input }) => {
      const [novaPersona] = await db
        .insert(casePersonas)
        .values({
          ...input,
          updatedAt: new Date(),
        })
        .returning();

      return novaPersona;
    }),

  updatePersona: protectedProcedure
    .input(updatePersonaSchema)
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      const [updated] = await db
        .update(casePersonas)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(casePersonas.id, id))
        .returning();

      if (!updated) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Persona não encontrada",
        });
      }

      return updated;
    }),

  deletePersona: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const [deleted] = await db
        .delete(casePersonas)
        .where(eq(casePersonas.id, input.id))
        .returning();

      if (!deleted) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Persona não encontrada",
        });
      }

      return { success: true };
    }),

  // ==========================================
  // FATOS DO CASO
  // ==========================================
  listFacts: protectedProcedure
    .input(z.object({ casoId: z.number() }))
    .query(async ({ input }) => {
      const result = await db
        .select()
        .from(caseFacts)
        .where(eq(caseFacts.casoId, input.casoId))
        .orderBy(desc(caseFacts.createdAt));

      return result;
    }),

  createFact: protectedProcedure
    .input(createFactSchema)
    .mutation(async ({ input }) => {
      const [novoFato] = await db
        .insert(caseFacts)
        .values({
          ...input,
          updatedAt: new Date(),
        })
        .returning();

      return novoFato;
    }),

  updateFact: protectedProcedure
    .input(updateFactSchema)
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      const [updated] = await db
        .update(caseFacts)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(caseFacts.id, id))
        .returning();

      if (!updated) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Fato não encontrado",
        });
      }

      return updated;
    }),

  deleteFact: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const [deleted] = await db
        .delete(caseFacts)
        .where(eq(caseFacts.id, input.id))
        .returning();

      if (!deleted) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Fato não encontrado",
        });
      }

      return { success: true };
    }),

  // ==========================================
  // EVIDÊNCIAS DOS FATOS
  // ==========================================
  listEvidenceByFact: protectedProcedure
    .input(z.object({ factId: z.number() }))
    .query(async ({ input }) => {
      const result = await db
        .select()
        .from(factEvidence)
        .where(eq(factEvidence.factId, input.factId))
        .orderBy(desc(factEvidence.createdAt));

      return result;
    }),

  listEvidenceByCaso: protectedProcedure
    .input(z.object({ casoId: z.number() }))
    .query(async ({ input }) => {
      const result = await db
        .select({
          id: factEvidence.id,
          factId: factEvidence.factId,
          trecho: factEvidence.trecho,
          contradicao: factEvidence.contradicao,
          sourceType: factEvidence.sourceType,
          sourceId: factEvidence.sourceId,
          documentoId: factEvidence.documentoId,
          documentoTitulo: documentos.titulo,
          createdAt: factEvidence.createdAt,
        })
        .from(factEvidence)
        .innerJoin(caseFacts, eq(factEvidence.factId, caseFacts.id))
        .leftJoin(documentos, eq(factEvidence.documentoId, documentos.id))
        .where(eq(caseFacts.casoId, input.casoId))
        .orderBy(desc(factEvidence.createdAt));

      return result;
    }),

  createEvidence: protectedProcedure
    .input(createEvidenceSchema)
    .mutation(async ({ input }) => {
      const [novaEvidencia] = await db
        .insert(factEvidence)
        .values(input)
        .returning();

      return novaEvidencia;
    }),

  updateEvidence: protectedProcedure
    .input(updateEvidenceSchema)
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      const [updated] = await db
        .update(factEvidence)
        .set(data)
        .where(eq(factEvidence.id, id))
        .returning();

      if (!updated) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Evidência não encontrada",
        });
      }

      return updated;
    }),

  deleteEvidence: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const [deleted] = await db
        .delete(factEvidence)
        .where(eq(factEvidence.id, input.id))
        .returning();

      if (!deleted) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Evidência não encontrada",
        });
      }

      return { success: true };
    }),

  // ==========================================
  // ROTEIRO DO JÚRI (BASEADO EM FATOS)
  // ==========================================
  listScriptItems: protectedProcedure
    .input(z.object({
      casoId: z.number().optional(),
      sessaoJuriId: z.number().optional(),
    }))
    .query(async ({ input }) => {
      const conditions = [];

      if (input.casoId) {
        conditions.push(eq(juriScriptItems.casoId, input.casoId));
      }

      if (input.sessaoJuriId) {
        conditions.push(eq(juriScriptItems.sessaoJuriId, input.sessaoJuriId));
      }

      if (conditions.length === 0) {
        return [];
      }

      const result = await db
        .select()
        .from(juriScriptItems)
        .where(and(...conditions))
        .orderBy(juriScriptItems.ordem);

      return result;
    }),

  createScriptItem: protectedProcedure
    .input(createScriptItemSchema)
    .mutation(async ({ input }) => {
      const [novoItem] = await db
        .insert(juriScriptItems)
        .values({
          ...input,
          updatedAt: new Date(),
        })
        .returning();

      return novoItem;
    }),

  updateScriptItem: protectedProcedure
    .input(updateScriptItemSchema)
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      const [updated] = await db
        .update(juriScriptItems)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(juriScriptItems.id, id))
        .returning();

      if (!updated) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Item do roteiro não encontrado",
        });
      }

      return updated;
    }),

  deleteScriptItem: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const [deleted] = await db
        .delete(juriScriptItems)
        .where(eq(juriScriptItems.id, input.id))
        .returning();

      if (!deleted) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Item do roteiro não encontrado",
        });
      }

      return { success: true };
    }),

  // ==========================================
  // ESTATÍSTICAS DO DASHBOARD
  // ==========================================
  getDashboardStats: protectedProcedure
    .input(z.object({
      atribuicao: z.string().optional(),
    }).optional())
    .query(async ({ ctx, input }) => {
      const { isAdmin, workspaceId } = getWorkspaceScope(ctx.user);
      const filters = input || {};
      
      const conditions = [isNull(casos.deletedAt)];
      
      if (filters.atribuicao) {
        conditions.push(eq(casos.atribuicao, filters.atribuicao as any));
      }

      if (!isAdmin) {
        conditions.push(eq(casos.workspaceId, workspaceId));
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
