import { z } from "zod";
import { router, protectedProcedure } from "../init";
import { db } from "@/lib/db";
import {
  diligencias,
  diligenciaTemplates,
  processos,
  assistidos,
  casos,
  casePersonas
} from "@/lib/db/schema";
import { eq, and, isNull, sql, desc, ilike, or, inArray } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { getWorkspaceScope, resolveWorkspaceId } from "../workspace";

// ==========================================
// SCHEMAS DE VALIDAÇÃO
// ==========================================

const diligenciaStatusValues = [
  "A_PESQUISAR",
  "EM_ANDAMENTO",
  "AGUARDANDO",
  "LOCALIZADO",
  "OBTIDO",
  "INFRUTIFERO",
  "ARQUIVADO",
] as const;

const diligenciaTipoValues = [
  "LOCALIZACAO_PESSOA",
  "LOCALIZACAO_DOCUMENTO",
  "REQUISICAO_DOCUMENTO",
  "PESQUISA_OSINT",
  "DILIGENCIA_CAMPO",
  "INTIMACAO",
  "OITIVA",
  "PERICIA",
  "EXAME",
  "OUTRO",
] as const;

const prioridadeValues = [
  "BAIXA",
  "NORMAL",
  "ALTA",
  "URGENTE",
  "REU_PRESO",
] as const;

const linksOsintSchema = z.object({
  jusbrasil: z.string().optional(),
  escavador: z.string().optional(),
  facebook: z.string().optional(),
  instagram: z.string().optional(),
  linkedin: z.string().optional(),
  outros: z.array(z.string()).optional(),
}).optional();

const documentoSchema = z.object({
  nome: z.string(),
  url: z.string(),
  tipo: z.string(),
  dataUpload: z.string(),
});

const historicoEntradaSchema = z.object({
  data: z.string(),
  acao: z.string(),
  descricao: z.string(),
  userId: z.number().optional(),
});

const createDiligenciaSchema = z.object({
  titulo: z.string().min(1, "Título é obrigatório"),
  descricao: z.string().optional(),
  tipo: z.enum(diligenciaTipoValues).default("OUTRO"),
  status: z.enum(diligenciaStatusValues).default("A_PESQUISAR"),

  // Vinculação
  processoId: z.number().optional(),
  assistidoId: z.number().optional(),
  casoId: z.number().optional(),
  personaId: z.number().optional(),

  // Detalhes do alvo
  nomePessoaAlvo: z.string().optional(),
  tipoRelacao: z.string().optional(),
  cpfAlvo: z.string().optional(),
  enderecoAlvo: z.string().optional(),
  telefoneAlvo: z.string().optional(),

  // Acompanhamento
  resultado: z.string().optional(),
  prazoEstimado: z.string().optional(), // ISO date string
  prioridade: z.enum(prioridadeValues).default("NORMAL"),

  // OSINT e documentos
  linksOsint: linksOsintSchema,
  documentos: z.array(documentoSchema).optional(),
  tags: z.array(z.string()).optional(),

  // Sugestão
  isSugestaoAutomatica: z.boolean().default(false),
  sugestaoOrigem: z.string().optional(),
});

const updateDiligenciaSchema = createDiligenciaSchema.partial().extend({
  id: z.number(),
});

const createTemplateSchema = z.object({
  nome: z.string().min(1, "Nome é obrigatório"),
  descricao: z.string().optional(),
  tipo: z.enum(diligenciaTipoValues),

  // Condições de aplicação
  aplicavelA: z.object({
    areas: z.array(z.string()).optional(),
    fases: z.array(z.string()).optional(),
    tiposCrime: z.array(z.string()).optional(),
    tags: z.array(z.string()).optional(),
  }).optional(),

  // Template
  tituloTemplate: z.string().min(1, "Título do template é obrigatório"),
  descricaoTemplate: z.string().optional(),
  checklistItens: z.array(z.string()).optional(),

  // Sugestões
  prioridadeSugerida: z.enum(prioridadeValues).default("NORMAL"),
  prazoSugeridoDias: z.number().optional(),

  ordem: z.number().default(0),
  ativo: z.boolean().default(true),
});

const updateTemplateSchema = createTemplateSchema.partial().extend({
  id: z.number(),
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
        processoId: z.number().optional(),
        assistidoId: z.number().optional(),
        casoId: z.number().optional(),
        status: z.enum(diligenciaStatusValues).optional(),
        tipo: z.enum(diligenciaTipoValues).optional(),
        prioridade: z.enum(prioridadeValues).optional(),
        search: z.string().optional(),
        includeArchived: z.boolean().default(false),
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().default(0),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const { isAdmin, workspaceId } = getWorkspaceScope(ctx.user);
      const params = input || {};

      const conditions = [];

      // Soft delete
      if (!params.includeArchived) {
        conditions.push(isNull(diligencias.deletedAt));
      }

      // Filtros de vinculação
      if (params.processoId) {
        conditions.push(eq(diligencias.processoId, params.processoId));
      }

      if (params.assistidoId) {
        conditions.push(eq(diligencias.assistidoId, params.assistidoId));
      }

      if (params.casoId) {
        conditions.push(eq(diligencias.casoId, params.casoId));
      }

      // Filtros de status/tipo
      if (params.status) {
        conditions.push(eq(diligencias.status, params.status));
      }

      if (params.tipo) {
        conditions.push(eq(diligencias.tipo, params.tipo));
      }

      if (params.prioridade) {
        conditions.push(eq(diligencias.prioridade, params.prioridade));
      }

      // Busca textual
      if (params.search) {
        conditions.push(
          or(
            ilike(diligencias.titulo, `%${params.search}%`),
            ilike(diligencias.descricao, `%${params.search}%`),
            ilike(diligencias.nomePessoaAlvo, `%${params.search}%`)
          )
        );
      }

      // Filtro de workspace (se não admin)
      if (!isAdmin) {
        conditions.push(eq(diligencias.workspaceId, workspaceId));
      }

      const result = await db
        .select({
          id: diligencias.id,
          titulo: diligencias.titulo,
          descricao: diligencias.descricao,
          tipo: diligencias.tipo,
          status: diligencias.status,
          prioridade: diligencias.prioridade,
          processoId: diligencias.processoId,
          assistidoId: diligencias.assistidoId,
          casoId: diligencias.casoId,
          personaId: diligencias.personaId,
          nomePessoaAlvo: diligencias.nomePessoaAlvo,
          tipoRelacao: diligencias.tipoRelacao,
          prazoEstimado: diligencias.prazoEstimado,
          dataConclusao: diligencias.dataConclusao,
          isSugestaoAutomatica: diligencias.isSugestaoAutomatica,
          tags: diligencias.tags,
          createdAt: diligencias.createdAt,
          updatedAt: diligencias.updatedAt,
          // Joins
          processoNumero: processos.numeroAutos,
          assistidoNome: assistidos.nome,
          casoTitulo: casos.titulo,
        })
        .from(diligencias)
        .leftJoin(processos, eq(diligencias.processoId, processos.id))
        .leftJoin(assistidos, eq(diligencias.assistidoId, assistidos.id))
        .leftJoin(casos, eq(diligencias.casoId, casos.id))
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(
          sql`CASE
            WHEN ${diligencias.prioridade} = 'REU_PRESO' THEN 1
            WHEN ${diligencias.prioridade} = 'URGENTE' THEN 2
            WHEN ${diligencias.prioridade} = 'ALTA' THEN 3
            WHEN ${diligencias.prioridade} = 'NORMAL' THEN 4
            ELSE 5
          END`,
          desc(diligencias.createdAt)
        )
        .limit(params.limit)
        .offset(params.offset);

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

      if (!isAdmin) {
        conditions.push(eq(diligencias.workspaceId, workspaceId));
      }

      const [diligencia] = await db
        .select({
          diligencia: diligencias,
          processoNumero: processos.numeroAutos,
          assistidoNome: assistidos.nome,
          casoTitulo: casos.titulo,
          personaNome: casePersonas.nome,
        })
        .from(diligencias)
        .leftJoin(processos, eq(diligencias.processoId, processos.id))
        .leftJoin(assistidos, eq(diligencias.assistidoId, assistidos.id))
        .leftJoin(casos, eq(diligencias.casoId, casos.id))
        .leftJoin(casePersonas, eq(diligencias.personaId, casePersonas.id))
        .where(and(...conditions))
        .limit(1);

      if (!diligencia) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Diligência não encontrada",
        });
      }

      return {
        ...diligencia.diligencia,
        processoNumero: diligencia.processoNumero,
        assistidoNome: diligencia.assistidoNome,
        casoTitulo: diligencia.casoTitulo,
        personaNome: diligencia.personaNome,
      };
    }),

  // ==========================================
  // CRIAR DILIGÊNCIA
  // ==========================================
  create: protectedProcedure
    .input(createDiligenciaSchema)
    .mutation(async ({ ctx, input }) => {
      const workspaceId = resolveWorkspaceId(ctx.user);

      // Validar que pelo menos uma vinculação existe
      if (!input.processoId && !input.assistidoId && !input.casoId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "A diligência precisa estar vinculada a um processo, assistido ou caso.",
        });
      }

      // Preparar dados para inserção
      const insertData: any = {
        titulo: input.titulo,
        descricao: input.descricao,
        tipo: input.tipo,
        status: input.status,
        processoId: input.processoId,
        assistidoId: input.assistidoId,
        casoId: input.casoId,
        personaId: input.personaId,
        nomePessoaAlvo: input.nomePessoaAlvo,
        tipoRelacao: input.tipoRelacao,
        cpfAlvo: input.cpfAlvo,
        enderecoAlvo: input.enderecoAlvo,
        telefoneAlvo: input.telefoneAlvo,
        resultado: input.resultado,
        prazoEstimado: input.prazoEstimado ? new Date(input.prazoEstimado) : null,
        prioridade: input.prioridade,
        linksOsint: input.linksOsint,
        documentos: input.documentos,
        tags: input.tags,
        isSugestaoAutomatica: input.isSugestaoAutomatica,
        sugestaoOrigem: input.sugestaoOrigem,
        workspaceId,
        defensorId: ctx.user?.id,
        criadoPorId: ctx.user?.id,
        // Histórico inicial
        historico: [{
          data: new Date().toISOString(),
          acao: "criacao",
          descricao: "Diligência criada",
          userId: ctx.user?.id,
        }],
      };

      const [novaDiligencia] = await db
        .insert(diligencias)
        .values(insertData)
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

      // Buscar diligência atual para histórico
      const [current] = await db
        .select({
          status: diligencias.status,
          historico: diligencias.historico,
        })
        .from(diligencias)
        .where(eq(diligencias.id, id))
        .limit(1);

      if (!current) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Diligência não encontrada",
        });
      }

      // Preparar histórico atualizado
      const historicoAtual = (current.historico as any[]) || [];
      const novaEntrada = {
        data: new Date().toISOString(),
        acao: "atualizacao",
        descricao: data.status && data.status !== current.status
          ? `Status alterado para ${data.status}`
          : "Diligência atualizada",
        userId: ctx.user?.id,
      };

      // Preparar dados para atualização
      const updateData: any = {
        ...data,
        prazoEstimado: data.prazoEstimado ? new Date(data.prazoEstimado) : undefined,
        historico: [...historicoAtual, novaEntrada],
        updatedAt: new Date(),
      };

      // Se mudou para status de conclusão, registrar data
      if (data.status && ["LOCALIZADO", "OBTIDO", "INFRUTIFERO", "ARQUIVADO"].includes(data.status)) {
        if (!current.status || !["LOCALIZADO", "OBTIDO", "INFRUTIFERO", "ARQUIVADO"].includes(current.status)) {
          updateData.dataConclusao = new Date();
        }
      }

      // Limpar campos undefined
      Object.keys(updateData).forEach(key => {
        if (updateData[key] === undefined) {
          delete updateData[key];
        }
      });

      const [atualizada] = await db
        .update(diligencias)
        .set(updateData)
        .where(
          isAdmin
            ? and(eq(diligencias.id, id), isNull(diligencias.deletedAt))
            : and(
                eq(diligencias.id, id),
                eq(diligencias.workspaceId, workspaceId),
                isNull(diligencias.deletedAt)
              )
        )
        .returning();

      if (!atualizada) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Diligência não encontrada ou sem permissão",
        });
      }

      return atualizada;
    }),

  // ==========================================
  // SOFT DELETE DILIGÊNCIA
  // ==========================================
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const { isAdmin, workspaceId } = getWorkspaceScope(ctx.user);

      const [deleted] = await db
        .update(diligencias)
        .set({ deletedAt: new Date() })
        .where(
          isAdmin
            ? and(eq(diligencias.id, input.id), isNull(diligencias.deletedAt))
            : and(
                eq(diligencias.id, input.id),
                eq(diligencias.workspaceId, workspaceId),
                isNull(diligencias.deletedAt)
              )
        )
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
  // ADICIONAR NOTA AO HISTÓRICO
  // ==========================================
  addHistorico: protectedProcedure
    .input(z.object({
      diligenciaId: z.number(),
      acao: z.string(),
      descricao: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { isAdmin, workspaceId } = getWorkspaceScope(ctx.user);

      // Buscar histórico atual
      const [current] = await db
        .select({ historico: diligencias.historico })
        .from(diligencias)
        .where(
          isAdmin
            ? eq(diligencias.id, input.diligenciaId)
            : and(eq(diligencias.id, input.diligenciaId), eq(diligencias.workspaceId, workspaceId))
        )
        .limit(1);

      if (!current) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Diligência não encontrada",
        });
      }

      const historicoAtual = (current.historico as any[]) || [];
      const novaEntrada = {
        data: new Date().toISOString(),
        acao: input.acao,
        descricao: input.descricao,
        userId: ctx.user?.id,
      };

      const [updated] = await db
        .update(diligencias)
        .set({
          historico: [...historicoAtual, novaEntrada],
          updatedAt: new Date(),
        })
        .where(eq(diligencias.id, input.diligenciaId))
        .returning();

      return updated;
    }),

  // ==========================================
  // ADICIONAR LINK OSINT
  // ==========================================
  addLinkOsint: protectedProcedure
    .input(z.object({
      diligenciaId: z.number(),
      tipo: z.enum(["jusbrasil", "escavador", "facebook", "instagram", "linkedin", "outros"]),
      url: z.string().url(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { isAdmin, workspaceId } = getWorkspaceScope(ctx.user);

      const [current] = await db
        .select({ linksOsint: diligencias.linksOsint })
        .from(diligencias)
        .where(
          isAdmin
            ? eq(diligencias.id, input.diligenciaId)
            : and(eq(diligencias.id, input.diligenciaId), eq(diligencias.workspaceId, workspaceId))
        )
        .limit(1);

      if (!current) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Diligência não encontrada",
        });
      }

      const linksAtuais = (current.linksOsint as any) || {};

      if (input.tipo === "outros") {
        linksAtuais.outros = [...(linksAtuais.outros || []), input.url];
      } else {
        linksAtuais[input.tipo] = input.url;
      }

      const [updated] = await db
        .update(diligencias)
        .set({
          linksOsint: linksAtuais,
          updatedAt: new Date(),
        })
        .where(eq(diligencias.id, input.diligenciaId))
        .returning();

      return updated;
    }),

  // ==========================================
  // ESTATÍSTICAS
  // ==========================================
  stats: protectedProcedure
    .input(z.object({
      processoId: z.number().optional(),
      assistidoId: z.number().optional(),
      casoId: z.number().optional(),
    }).optional())
    .query(async ({ ctx, input }) => {
      const { isAdmin, workspaceId } = getWorkspaceScope(ctx.user);
      const filters = input || {};

      const conditions = [isNull(diligencias.deletedAt)];

      if (filters.processoId) {
        conditions.push(eq(diligencias.processoId, filters.processoId));
      }
      if (filters.assistidoId) {
        conditions.push(eq(diligencias.assistidoId, filters.assistidoId));
      }
      if (filters.casoId) {
        conditions.push(eq(diligencias.casoId, filters.casoId));
      }
      if (!isAdmin) {
        conditions.push(eq(diligencias.workspaceId, workspaceId));
      }

      const baseWhere = and(...conditions);

      // Contagens por status
      const [stats] = await db
        .select({
          total: sql<number>`count(*)::int`,
          aPesquisar: sql<number>`count(*) FILTER (WHERE ${diligencias.status} = 'A_PESQUISAR')::int`,
          emAndamento: sql<number>`count(*) FILTER (WHERE ${diligencias.status} = 'EM_ANDAMENTO')::int`,
          aguardando: sql<number>`count(*) FILTER (WHERE ${diligencias.status} = 'AGUARDANDO')::int`,
          concluidas: sql<number>`count(*) FILTER (WHERE ${diligencias.status} IN ('LOCALIZADO', 'OBTIDO'))::int`,
          infrutiferas: sql<number>`count(*) FILTER (WHERE ${diligencias.status} = 'INFRUTIFERO')::int`,
          urgentes: sql<number>`count(*) FILTER (WHERE ${diligencias.prioridade} IN ('URGENTE', 'REU_PRESO'))::int`,
        })
        .from(diligencias)
        .where(baseWhere);

      return {
        total: stats?.total || 0,
        aPesquisar: stats?.aPesquisar || 0,
        emAndamento: stats?.emAndamento || 0,
        aguardando: stats?.aguardando || 0,
        concluidas: stats?.concluidas || 0,
        infrutiferas: stats?.infrutiferas || 0,
        urgentes: stats?.urgentes || 0,
      };
    }),

  // ==========================================
  // TEMPLATES DE DILIGÊNCIAS
  // ==========================================

  listTemplates: protectedProcedure
    .input(z.object({
      tipo: z.enum(diligenciaTipoValues).optional(),
      apenasAtivos: z.boolean().default(true),
    }).optional())
    .query(async ({ ctx, input }) => {
      const { isAdmin, workspaceId } = getWorkspaceScope(ctx.user);
      const params = input || {};

      const conditions = [];

      if (params.apenasAtivos) {
        conditions.push(eq(diligenciaTemplates.ativo, true));
      }

      if (params.tipo) {
        conditions.push(eq(diligenciaTemplates.tipo, params.tipo));
      }

      // Templates globais (sem workspace) ou do workspace do usuário
      if (!isAdmin) {
        conditions.push(
          or(
            isNull(diligenciaTemplates.workspaceId),
            eq(diligenciaTemplates.workspaceId, workspaceId)
          )
        );
      }

      const result = await db
        .select()
        .from(diligenciaTemplates)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(diligenciaTemplates.ordem, diligenciaTemplates.nome);

      return result;
    }),

  createTemplate: protectedProcedure
    .input(createTemplateSchema)
    .mutation(async ({ ctx, input }) => {
      const workspaceId = resolveWorkspaceId(ctx.user);

      const [novoTemplate] = await db
        .insert(diligenciaTemplates)
        .values({
          ...input,
          workspaceId,
        })
        .returning();

      return novoTemplate;
    }),

  updateTemplate: protectedProcedure
    .input(updateTemplateSchema)
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      const { isAdmin, workspaceId } = getWorkspaceScope(ctx.user);

      const [updated] = await db
        .update(diligenciaTemplates)
        .set({
          ...data,
          updatedAt: new Date(),
        })
        .where(
          isAdmin
            ? eq(diligenciaTemplates.id, id)
            : and(eq(diligenciaTemplates.id, id), eq(diligenciaTemplates.workspaceId, workspaceId))
        )
        .returning();

      if (!updated) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Template não encontrado",
        });
      }

      return updated;
    }),

  deleteTemplate: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const { isAdmin, workspaceId } = getWorkspaceScope(ctx.user);

      const [deleted] = await db
        .delete(diligenciaTemplates)
        .where(
          isAdmin
            ? eq(diligenciaTemplates.id, input.id)
            : and(eq(diligenciaTemplates.id, input.id), eq(diligenciaTemplates.workspaceId, workspaceId))
        )
        .returning();

      if (!deleted) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Template não encontrado",
        });
      }

      return { success: true };
    }),

  // ==========================================
  // SUGESTÕES AUTOMÁTICAS DE DILIGÊNCIAS
  // ==========================================
  getSugestoes: protectedProcedure
    .input(z.object({
      casoId: z.number().optional(),
      processoId: z.number().optional(),
      assistidoId: z.number().optional(),
      area: z.string().optional(),
      fase: z.string().optional(),
      tags: z.array(z.string()).optional(),
    }))
    .query(async ({ ctx, input }) => {
      const { isAdmin, workspaceId } = getWorkspaceScope(ctx.user);

      // Buscar templates ativos
      const templates = await db
        .select()
        .from(diligenciaTemplates)
        .where(
          and(
            eq(diligenciaTemplates.ativo, true),
            isAdmin
              ? undefined
              : or(
                  isNull(diligenciaTemplates.workspaceId),
                  eq(diligenciaTemplates.workspaceId, workspaceId)
                )
          )
        )
        .orderBy(diligenciaTemplates.ordem);

      // Filtrar templates aplicáveis
      const sugestoes = templates.filter(template => {
        const aplicavel = template.aplicavelA as any;
        if (!aplicavel) return true; // Template sem restrições

        // Verificar área
        if (aplicavel.areas?.length && input.area) {
          if (!aplicavel.areas.includes(input.area)) return false;
        }

        // Verificar fase
        if (aplicavel.fases?.length && input.fase) {
          if (!aplicavel.fases.includes(input.fase)) return false;
        }

        // Verificar tags
        if (aplicavel.tags?.length && input.tags?.length) {
          const hasMatchingTag = aplicavel.tags.some((t: string) => input.tags?.includes(t));
          if (!hasMatchingTag) return false;
        }

        return true;
      });

      // Buscar diligências já criadas para este contexto
      const conditions = [isNull(diligencias.deletedAt)];
      if (input.casoId) conditions.push(eq(diligencias.casoId, input.casoId));
      if (input.processoId) conditions.push(eq(diligencias.processoId, input.processoId));
      if (input.assistidoId) conditions.push(eq(diligencias.assistidoId, input.assistidoId));

      const existentes = await db
        .select({ titulo: diligencias.titulo, tipo: diligencias.tipo })
        .from(diligencias)
        .where(and(...conditions));

      // Marcar sugestões já existentes
      const existentesTitulos = new Set(existentes.map(e => e.titulo.toLowerCase()));

      return sugestoes.map(template => ({
        templateId: template.id,
        titulo: template.tituloTemplate,
        descricao: template.descricaoTemplate,
        tipo: template.tipo,
        prioridade: template.prioridadeSugerida,
        prazoSugeridoDias: template.prazoSugeridoDias,
        checklistItens: template.checklistItens,
        jaExiste: existentesTitulos.has(template.tituloTemplate.toLowerCase()),
      }));
    }),

  // ==========================================
  // CRIAR DILIGÊNCIA A PARTIR DE SUGESTÃO
  // ==========================================
  createFromSugestao: protectedProcedure
    .input(z.object({
      templateId: z.number(),
      processoId: z.number().optional(),
      assistidoId: z.number().optional(),
      casoId: z.number().optional(),
      personaId: z.number().optional(),
      // Permite sobrescrever dados do template
      titulo: z.string().optional(),
      descricao: z.string().optional(),
      nomePessoaAlvo: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const workspaceId = resolveWorkspaceId(ctx.user);

      // Buscar template
      const [template] = await db
        .select()
        .from(diligenciaTemplates)
        .where(eq(diligenciaTemplates.id, input.templateId))
        .limit(1);

      if (!template) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Template não encontrado",
        });
      }

      // Validar vinculação
      if (!input.processoId && !input.assistidoId && !input.casoId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "A diligência precisa estar vinculada a um processo, assistido ou caso.",
        });
      }

      // Calcular prazo estimado
      let prazoEstimado = null;
      if (template.prazoSugeridoDias) {
        prazoEstimado = new Date();
        prazoEstimado.setDate(prazoEstimado.getDate() + template.prazoSugeridoDias);
      }

      const [novaDiligencia] = await db
        .insert(diligencias)
        .values({
          titulo: input.titulo || template.tituloTemplate,
          descricao: input.descricao || template.descricaoTemplate,
          tipo: template.tipo,
          status: "A_PESQUISAR",
          prioridade: template.prioridadeSugerida || "NORMAL",
          prazoEstimado,
          processoId: input.processoId,
          assistidoId: input.assistidoId,
          casoId: input.casoId,
          personaId: input.personaId,
          nomePessoaAlvo: input.nomePessoaAlvo,
          isSugestaoAutomatica: true,
          sugestaoOrigem: "template",
          workspaceId,
          defensorId: ctx.user?.id,
          criadoPorId: ctx.user?.id,
          historico: [{
            data: new Date().toISOString(),
            acao: "criacao_sugestao",
            descricao: `Diligência criada a partir do template "${template.nome}"`,
            userId: ctx.user?.id,
          }],
        })
        .returning();

      return novaDiligencia;
    }),

  // ==========================================
  // BULK CREATE - ACEITAR MÚLTIPLAS SUGESTÕES
  // ==========================================
  bulkCreateFromSugestoes: protectedProcedure
    .input(z.object({
      templateIds: z.array(z.number()),
      processoId: z.number().optional(),
      assistidoId: z.number().optional(),
      casoId: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const workspaceId = resolveWorkspaceId(ctx.user);

      if (!input.processoId && !input.assistidoId && !input.casoId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Vinculação obrigatória.",
        });
      }

      // Buscar templates
      const templates = await db
        .select()
        .from(diligenciaTemplates)
        .where(inArray(diligenciaTemplates.id, input.templateIds));

      if (templates.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Nenhum template encontrado",
        });
      }

      // Criar diligências em batch
      const diligenciasParaCriar = templates.map(template => {
        let prazoEstimado = null;
        if (template.prazoSugeridoDias) {
          prazoEstimado = new Date();
          prazoEstimado.setDate(prazoEstimado.getDate() + template.prazoSugeridoDias);
        }

        return {
          titulo: template.tituloTemplate,
          descricao: template.descricaoTemplate,
          tipo: template.tipo,
          status: "A_PESQUISAR" as const,
          prioridade: template.prioridadeSugerida || "NORMAL",
          prazoEstimado,
          processoId: input.processoId,
          assistidoId: input.assistidoId,
          casoId: input.casoId,
          isSugestaoAutomatica: true,
          sugestaoOrigem: "template_bulk",
          workspaceId,
          defensorId: ctx.user?.id,
          criadoPorId: ctx.user?.id!,
          historico: [{
            data: new Date().toISOString(),
            acao: "criacao_sugestao",
            descricao: `Diligência criada em lote a partir do template "${template.nome}"`,
            userId: ctx.user?.id,
          }],
        };
      });

      const criadas = await db
        .insert(diligencias)
        .values(diligenciasParaCriar)
        .returning();

      return {
        count: criadas.length,
        diligencias: criadas,
      };
    }),
});
