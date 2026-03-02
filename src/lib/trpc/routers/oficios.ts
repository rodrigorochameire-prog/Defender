/**
 * OMBUDS - Router de Ofícios
 *
 * CRUD de ofícios + integração IA (Gemini + Claude) + análise Drive
 */

import { z } from "zod";
import { router, protectedProcedure } from "../init";
import { db } from "@/lib/db";
import {
  documentoModelos,
  documentosGerados,
  oficioAnalises,
  processos,
  assistidos,
  demandas,
  casos,
  users,
} from "@/lib/db/schema";
import { eq, ilike, or, desc, sql, and, isNull, asc, inArray } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { VARIAVEIS_PADRAO } from "./modelos";
import { pythonBackend } from "@/lib/services/python-backend";

// ==========================================
// TIPOS DE OFÍCIOS
// ==========================================

export const TIPOS_OFICIO = [
  { value: "requisitorio", label: "Requisitório" },
  { value: "comunicacao", label: "Comunicação/Informação" },
  { value: "encaminhamento", label: "Encaminhamento" },
  { value: "solicitacao_providencias", label: "Solicitação de Providências" },
  { value: "intimacao", label: "Intimação/Notificação" },
  { value: "pedido_informacao", label: "Pedido de Informação" },
  { value: "manifestacao", label: "Manifestação" },
  { value: "representacao", label: "Representação" },
  { value: "parecer_tecnico", label: "Parecer Técnico" },
  { value: "convite", label: "Convite/Convocação" },
  { value: "resposta_oficio", label: "Resposta a Ofício" },
  { value: "certidao", label: "Certidão" },
] as const;

export const STATUS_OFICIO = [
  "rascunho",
  "revisao",
  "enviado",
  "arquivado",
] as const;

// ==========================================
// FUNÇÕES AUXILIARES
// ==========================================

function substituirVariaveis(
  template: string,
  valores: Record<string, string>
): string {
  let resultado = template;
  for (const [variavel, valor] of Object.entries(valores)) {
    const regex = new RegExp(`\\{\\{${variavel}\\}\\}`, "gi");
    resultado = resultado.replace(regex, valor || "");
  }
  return resultado;
}

/** Preenche variáveis automaticamente a partir do banco */
async function autoPreencherVariaveis(opts: {
  assistidoId?: number;
  processoId?: number;
  casoId?: number;
  userId?: number;
}): Promise<Record<string, string>> {
  const valores: Record<string, string> = {};

  // Data do sistema
  const hoje = new Date();
  valores["DATA_HOJE"] = hoje.toLocaleDateString("pt-BR");
  const meses = [
    "janeiro", "fevereiro", "março", "abril", "maio", "junho",
    "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
  ];
  valores["DATA_EXTENSO"] = `${hoje.getDate()} de ${meses[hoje.getMonth()]} de ${hoje.getFullYear()}`;

  // Assistido
  if (opts.assistidoId) {
    const [assistido] = await db
      .select()
      .from(assistidos)
      .where(eq(assistidos.id, opts.assistidoId))
      .limit(1);

    if (assistido) {
      valores["NOME_ASSISTIDO"] = assistido.nome || "";
      valores["CPF_ASSISTIDO"] = assistido.cpf || "";
      valores["RG_ASSISTIDO"] = (assistido as Record<string, unknown>).rg as string || "";
      valores["TELEFONE_ASSISTIDO"] = assistido.telefone || "";
      valores["NOME_MAE_ASSISTIDO"] = assistido.nomeMae || "";
      valores["LOCAL_PRISAO"] = assistido.unidadePrisional || "";
    }
  }

  // Processo
  if (opts.processoId) {
    const [processo] = await db
      .select()
      .from(processos)
      .where(eq(processos.id, opts.processoId))
      .limit(1);

    if (processo) {
      valores["NUMERO_PROCESSO"] = processo.numeroAutos || "";
      valores["COMARCA"] = processo.comarca || "";
      valores["VARA"] = processo.vara || "";
      valores["CLASSE_PROCESSUAL"] = processo.classeProcessual || "";
    }
  }

  // Defensor
  if (opts.userId) {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, opts.userId))
      .limit(1);

    if (user) {
      valores["NOME_DEFENSOR"] = user.name || "";
    }
  }

  return valores;
}

// ==========================================
// ROUTER
// ==========================================

export const oficiosRouter = router({
  // ==========================================
  // CRUD DE OFÍCIOS
  // ==========================================

  /** Lista ofícios gerados com filtros */
  list: protectedProcedure
    .input(
      z
        .object({
          tipoOficio: z.string().optional(),
          status: z.enum(["rascunho", "revisao", "enviado", "arquivado"]).optional(),
          assistidoId: z.number().optional(),
          processoId: z.number().optional(),
          demandaId: z.number().optional(),
          search: z.string().optional(),
          limit: z.number().default(20),
          offset: z.number().default(0),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const {
        tipoOficio,
        status,
        assistidoId,
        processoId,
        demandaId,
        search,
        limit = 20,
        offset = 0,
      } = input || {};

      const conditions = [];

      // Filtrar por tipo de peça "oficio"
      conditions.push(eq(documentoModelos.tipoPeca, "oficio"));

      if (assistidoId) {
        conditions.push(eq(documentosGerados.assistidoId, assistidoId));
      }
      if (processoId) {
        conditions.push(eq(documentosGerados.processoId, processoId));
      }
      if (demandaId) {
        conditions.push(eq(documentosGerados.demandaId, demandaId));
      }
      if (search) {
        conditions.push(
          or(
            ilike(documentosGerados.titulo, `%${search}%`),
            ilike(documentosGerados.conteudoFinal, `%${search}%`)
          )
        );
      }

      // Filtro por tipo/status via metadata JSONB
      const jsonConditions: ReturnType<typeof sql>[] = [];
      if (tipoOficio) {
        jsonConditions.push(
          sql`${documentosGerados.metadata}->>'tipoOficio' = ${tipoOficio}`
        );
      }
      if (status) {
        jsonConditions.push(
          sql`${documentosGerados.metadata}->>'status' = ${status}`
        );
      }

      const allConditions = [
        ...conditions,
        ...jsonConditions,
      ];

      const results = await db
        .select({
          id: documentosGerados.id,
          titulo: documentosGerados.titulo,
          conteudoFinal: documentosGerados.conteudoFinal,
          metadata: documentosGerados.metadata,
          geradoPorIA: documentosGerados.geradoPorIA,
          googleDocUrl: documentosGerados.googleDocUrl,
          driveFileId: documentosGerados.driveFileId,
          createdAt: documentosGerados.createdAt,
          updatedAt: documentosGerados.updatedAt,
          // Joins
          assistidoNome: assistidos.nome,
          processoNumero: processos.numeroAutos,
          modeloTitulo: documentoModelos.titulo,
        })
        .from(documentosGerados)
        .leftJoin(assistidos, eq(documentosGerados.assistidoId, assistidos.id))
        .leftJoin(processos, eq(documentosGerados.processoId, processos.id))
        .leftJoin(documentoModelos, eq(documentosGerados.modeloId, documentoModelos.id))
        .where(allConditions.length > 0 ? and(...allConditions) : undefined)
        .orderBy(desc(documentosGerados.updatedAt))
        .limit(limit)
        .offset(offset);

      // Count total
      const [countResult] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(documentosGerados)
        .leftJoin(documentoModelos, eq(documentosGerados.modeloId, documentoModelos.id))
        .where(allConditions.length > 0 ? and(...allConditions) : undefined);

      return {
        items: results,
        total: countResult?.count ?? 0,
      };
    }),

  /** Busca um ofício por ID */
  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const [oficio] = await db
        .select({
          id: documentosGerados.id,
          titulo: documentosGerados.titulo,
          conteudoFinal: documentosGerados.conteudoFinal,
          valoresVariaveis: documentosGerados.valoresVariaveis,
          metadata: documentosGerados.metadata,
          geradoPorIA: documentosGerados.geradoPorIA,
          promptIA: documentosGerados.promptIA,
          googleDocId: documentosGerados.googleDocId,
          googleDocUrl: documentosGerados.googleDocUrl,
          driveFileId: documentosGerados.driveFileId,
          modeloId: documentosGerados.modeloId,
          assistidoId: documentosGerados.assistidoId,
          processoId: documentosGerados.processoId,
          demandaId: documentosGerados.demandaId,
          casoId: documentosGerados.casoId,
          createdAt: documentosGerados.createdAt,
          updatedAt: documentosGerados.updatedAt,
          // Joins
          assistidoNome: assistidos.nome,
          processoNumero: processos.numeroAutos,
          modeloTitulo: documentoModelos.titulo,
          modeloConteudo: documentoModelos.conteudo,
        })
        .from(documentosGerados)
        .leftJoin(assistidos, eq(documentosGerados.assistidoId, assistidos.id))
        .leftJoin(processos, eq(documentosGerados.processoId, processos.id))
        .leftJoin(documentoModelos, eq(documentosGerados.modeloId, documentoModelos.id))
        .where(eq(documentosGerados.id, input.id))
        .limit(1);

      if (!oficio) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Ofício não encontrado" });
      }

      return oficio;
    }),

  /** Cria um novo ofício */
  create: protectedProcedure
    .input(
      z.object({
        modeloId: z.number().optional(),
        assistidoId: z.number().optional(),
        processoId: z.number().optional(),
        demandaId: z.number().optional(),
        casoId: z.number().optional(),
        titulo: z.string().min(1),
        conteudoFinal: z.string().min(1),
        tipoOficio: z.string().default("comunicacao"),
        destinatario: z.string().optional(),
        urgencia: z.enum(["normal", "urgente", "urgentissimo"]).default("normal"),
        valoresVariaveis: z.record(z.string()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [oficio] = await db
        .insert(documentosGerados)
        .values({
          modeloId: input.modeloId,
          assistidoId: input.assistidoId,
          processoId: input.processoId,
          demandaId: input.demandaId,
          casoId: input.casoId,
          titulo: input.titulo,
          conteudoFinal: input.conteudoFinal,
          valoresVariaveis: input.valoresVariaveis || {},
          geradoPorIA: false,
          metadata: {
            tipoOficio: input.tipoOficio,
            destinatario: input.destinatario || "",
            urgencia: input.urgencia,
            status: "rascunho" as const,
            versao: 1,
          },
          workspaceId: ctx.session?.user?.workspaceId ?? undefined,
          createdById: ctx.session?.user?.id ? Number(ctx.session.user.id) : undefined,
        })
        .returning();

      // Incrementar totalUsos no modelo se aplicável
      if (input.modeloId) {
        await db
          .update(documentoModelos)
          .set({ totalUsos: sql`${documentoModelos.totalUsos} + 1` })
          .where(eq(documentoModelos.id, input.modeloId));
      }

      return oficio;
    }),

  /** Atualiza um ofício existente */
  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        titulo: z.string().optional(),
        conteudoFinal: z.string().optional(),
        metadata: z
          .object({
            tipoOficio: z.string().optional(),
            destinatario: z.string().optional(),
            urgencia: z.enum(["normal", "urgente", "urgentissimo"]).optional(),
            status: z.enum(["rascunho", "revisao", "enviado", "arquivado"]).optional(),
          })
          .optional(),
      })
    )
    .mutation(async ({ input }) => {
      // Buscar ofício atual para merge de metadata
      const [current] = await db
        .select()
        .from(documentosGerados)
        .where(eq(documentosGerados.id, input.id))
        .limit(1);

      if (!current) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Ofício não encontrado" });
      }

      const currentMeta = (current.metadata as Record<string, unknown>) || {};
      const newMeta = input.metadata
        ? { ...currentMeta, ...input.metadata, versao: ((currentMeta.versao as number) || 1) + 1 }
        : currentMeta;

      const [updated] = await db
        .update(documentosGerados)
        .set({
          ...(input.titulo && { titulo: input.titulo }),
          ...(input.conteudoFinal && { conteudoFinal: input.conteudoFinal }),
          metadata: newMeta,
          updatedAt: new Date(),
        })
        .where(eq(documentosGerados.id, input.id))
        .returning();

      return updated;
    }),

  // ==========================================
  // AUTO-PREENCHIMENTO
  // ==========================================

  /** Preenche variáveis automaticamente */
  autoPreencherVariaveis: protectedProcedure
    .input(
      z.object({
        assistidoId: z.number().optional(),
        processoId: z.number().optional(),
        casoId: z.number().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const valores = await autoPreencherVariaveis({
        ...input,
        userId: ctx.session?.user?.id ? Number(ctx.session.user.id) : undefined,
      });
      return valores;
    }),

  /** Lista variáveis padrão disponíveis */
  variaveisPadrao: protectedProcedure.query(() => VARIAVEIS_PADRAO),

  // ==========================================
  // TEMPLATES DE OFÍCIO
  // ==========================================

  /** Lista templates de ofício (filtra por tipoPeca = 'oficio') */
  templates: protectedProcedure
    .input(
      z
        .object({
          tipoOficio: z.string().optional(),
          area: z.string().optional(),
          search: z.string().optional(),
          limit: z.number().default(50),
        })
        .optional()
    )
    .query(async ({ input }) => {
      const { tipoOficio, area, search, limit = 50 } = input || {};

      const conditions = [
        eq(documentoModelos.tipoPeca, "oficio"),
        isNull(documentoModelos.deletedAt),
        eq(documentoModelos.isAtivo, true),
      ];

      if (area && area !== "all") {
        conditions.push(eq(documentoModelos.area, area as never));
      }

      if (search) {
        conditions.push(
          or(
            ilike(documentoModelos.titulo, `%${search}%`),
            ilike(documentoModelos.descricao, `%${search}%`)
          )!
        );
      }

      // Filter by tipoOficio in formatacao JSONB
      const jsonConds: ReturnType<typeof sql>[] = [];
      if (tipoOficio) {
        jsonConds.push(
          sql`${documentoModelos.formatacao}->>'tipoOficio' = ${tipoOficio}`
        );
      }

      const allConds = [...conditions, ...jsonConds];

      return db
        .select({
          id: documentoModelos.id,
          titulo: documentoModelos.titulo,
          descricao: documentoModelos.descricao,
          categoria: documentoModelos.categoria,
          area: documentoModelos.area,
          conteudo: documentoModelos.conteudo,
          variaveis: documentoModelos.variaveis,
          formatacao: documentoModelos.formatacao,
          tags: documentoModelos.tags,
          totalUsos: documentoModelos.totalUsos,
        })
        .from(documentoModelos)
        .where(and(...allConds))
        .orderBy(desc(documentoModelos.totalUsos))
        .limit(limit);
    }),

  // ==========================================
  // GERAÇÃO COM TEMPLATE
  // ==========================================

  /** Gera ofício a partir de template + valores */
  gerarDeTemplate: protectedProcedure
    .input(
      z.object({
        modeloId: z.number(),
        assistidoId: z.number().optional(),
        processoId: z.number().optional(),
        demandaId: z.number().optional(),
        casoId: z.number().optional(),
        valoresExtras: z.record(z.string()).optional(),
        titulo: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Buscar template
      const [modelo] = await db
        .select()
        .from(documentoModelos)
        .where(
          and(eq(documentoModelos.id, input.modeloId), isNull(documentoModelos.deletedAt))
        )
        .limit(1);

      if (!modelo) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Template não encontrado" });
      }

      // Auto-preencher variáveis
      const valoresAuto = await autoPreencherVariaveis({
        assistidoId: input.assistidoId,
        processoId: input.processoId,
        casoId: input.casoId,
        userId: ctx.session?.user?.id ? Number(ctx.session.user.id) : undefined,
      });

      // Merge: auto + extras (extras sobrescrevem auto)
      const valoresFinais = { ...valoresAuto, ...(input.valoresExtras || {}) };

      // Substituir variáveis no template
      const conteudoFinal = substituirVariaveis(modelo.conteudo, valoresFinais);

      // Título do ofício
      const titulo = input.titulo || `${modelo.titulo} - ${valoresFinais["NOME_ASSISTIDO"] || "Sem assistido"}`;

      // Extrair tipo do ofício do modelo
      const formatacao = modelo.formatacao as Record<string, unknown> | null;

      // Criar ofício
      const [oficio] = await db
        .insert(documentosGerados)
        .values({
          modeloId: modelo.id,
          assistidoId: input.assistidoId,
          processoId: input.processoId,
          demandaId: input.demandaId,
          casoId: input.casoId,
          titulo,
          conteudoFinal,
          valoresVariaveis: valoresFinais,
          geradoPorIA: false,
          metadata: {
            tipoOficio: (formatacao?.tipoOficio as string) || "comunicacao",
            destinatario: (formatacao?.destinatarioPadrao as string) || "",
            urgencia: ((formatacao?.urgencia as string) || "normal") as "normal" | "urgente" | "urgentissimo",
            status: "rascunho" as const,
            versao: 1,
          },
          workspaceId: ctx.session?.user?.workspaceId ?? undefined,
          createdById: ctx.session?.user?.id ? Number(ctx.session.user.id) : undefined,
        })
        .returning();

      // Incrementar uso do modelo
      await db
        .update(documentoModelos)
        .set({ totalUsos: sql`${documentoModelos.totalUsos} + 1` })
        .where(eq(documentoModelos.id, modelo.id));

      return oficio;
    }),

  // ==========================================
  // IA — GERAR CORPO + REVISAR
  // ==========================================

  /** Gera corpo do ofício com Gemini 2.5 Pro via Python backend */
  gerarComIA: protectedProcedure
    .input(
      z.object({
        oficioId: z.number(),
        tipoOficio: z.string().default("comunicacao"),
        templateBase: z.string().default(""),
        instrucoes: z.string().default(""),
        contextoAdicional: z.string().default(""),
      })
    )
    .mutation(async ({ input }) => {
      // Buscar ofício e dados relacionados
      const [oficio] = await db
        .select({
          id: documentosGerados.id,
          conteudoFinal: documentosGerados.conteudoFinal,
          assistidoId: documentosGerados.assistidoId,
          processoId: documentosGerados.processoId,
          metadata: documentosGerados.metadata,
        })
        .from(documentosGerados)
        .where(eq(documentosGerados.id, input.oficioId))
        .limit(1);

      if (!oficio) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Ofício não encontrado" });
      }

      // Buscar dados do assistido
      const dadosAssistido: Record<string, string> = {};
      if (oficio.assistidoId) {
        const [assistido] = await db
          .select()
          .from(assistidos)
          .where(eq(assistidos.id, oficio.assistidoId))
          .limit(1);
        if (assistido) {
          dadosAssistido["nome"] = assistido.nome || "";
          dadosAssistido["cpf"] = assistido.cpf || "";
          dadosAssistido["telefone"] = assistido.telefone || "";
          dadosAssistido["nomeMae"] = assistido.nomeMae || "";
          dadosAssistido["unidadePrisional"] = assistido.unidadePrisional || "";
        }
      }

      // Buscar dados do processo
      const dadosProcesso: Record<string, string> = {};
      if (oficio.processoId) {
        const [processo] = await db
          .select()
          .from(processos)
          .where(eq(processos.id, oficio.processoId))
          .limit(1);
        if (processo) {
          dadosProcesso["numero"] = processo.numeroAutos || "";
          dadosProcesso["vara"] = processo.vara || "";
          dadosProcesso["comarca"] = processo.comarca || "";
          dadosProcesso["classe"] = processo.classeProcessual || "";
        }
      }

      // Chamar Python backend
      const result = await pythonBackend.gerarMinuta(
        input.tipoOficio,
        input.templateBase || oficio.conteudoFinal || "",
        dadosAssistido,
        dadosProcesso,
        input.contextoAdicional,
        input.instrucoes
      );

      if (!result.success) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: result.error || "Erro ao gerar conteúdo com IA",
        });
      }

      // Atualizar ofício com conteúdo gerado
      const currentMeta = (oficio.metadata as Record<string, unknown>) || {};
      const [updated] = await db
        .update(documentosGerados)
        .set({
          conteudoFinal: result.conteudo,
          geradoPorIA: true,
          metadata: {
            ...currentMeta,
            iaModelo: result.modelo,
            versao: ((currentMeta.versao as number) || 1) + 1,
          },
          updatedAt: new Date(),
        })
        .where(eq(documentosGerados.id, input.oficioId))
        .returning();

      return {
        conteudo: result.conteudo,
        modelo: result.modelo,
        tokensEntrada: result.tokens_entrada,
        tokensSaida: result.tokens_saida,
      };
    }),

  /** Revisa ofício com Claude Sonnet 4.6 via Python backend */
  revisarComIA: protectedProcedure
    .input(
      z.object({
        oficioId: z.number(),
        contextoAdicional: z.string().default(""),
      })
    )
    .mutation(async ({ input }) => {
      // Buscar ofício
      const [oficio] = await db
        .select({
          id: documentosGerados.id,
          conteudoFinal: documentosGerados.conteudoFinal,
          metadata: documentosGerados.metadata,
        })
        .from(documentosGerados)
        .where(eq(documentosGerados.id, input.oficioId))
        .limit(1);

      if (!oficio) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Ofício não encontrado" });
      }

      if (!oficio.conteudoFinal || oficio.conteudoFinal.trim().length < 50) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "O ofício precisa ter pelo menos 50 caracteres para revisão",
        });
      }

      const meta = (oficio.metadata as Record<string, unknown>) || {};

      // Chamar Python backend
      const result = await pythonBackend.revisarOficio(
        oficio.conteudoFinal,
        (meta.tipoOficio as string) || "comunicacao",
        (meta.destinatario as string) || "",
        input.contextoAdicional
      );

      if (!result.success) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: result.error || "Erro ao revisar com IA",
        });
      }

      // Salvar resultado da revisão na metadata
      const [updated] = await db
        .update(documentosGerados)
        .set({
          metadata: {
            ...meta,
            iaRevisao: {
              modelo: result.modelo,
              score: result.score,
              sugestoes: result.sugestoes.map((s) => s.descricao),
              tomAdequado: result.tom_adequado,
              formalidadeOk: result.formalidade_ok,
              dadosCorretos: result.dados_corretos,
              revisadoEm: new Date().toISOString(),
            },
          },
          updatedAt: new Date(),
        })
        .where(eq(documentosGerados.id, input.oficioId))
        .returning();

      return {
        score: result.score,
        sugestoes: result.sugestoes,
        tomAdequado: result.tom_adequado,
        formalidadeOk: result.formalidade_ok,
        dadosCorretos: result.dados_corretos,
        conteudoRevisado: result.conteudo_revisado,
        modelo: result.modelo,
        tokensEntrada: result.tokens_entrada,
        tokensSaida: result.tokens_saida,
      };
    }),

  /** Melhora texto com instruções específicas via Claude */
  melhorarComIA: protectedProcedure
    .input(
      z.object({
        oficioId: z.number(),
        instrucao: z.string().min(5, "Instrução precisa ter pelo menos 5 caracteres"),
      })
    )
    .mutation(async ({ input }) => {
      // Buscar ofício
      const [oficio] = await db
        .select({
          id: documentosGerados.id,
          conteudoFinal: documentosGerados.conteudoFinal,
          metadata: documentosGerados.metadata,
        })
        .from(documentosGerados)
        .where(eq(documentosGerados.id, input.oficioId))
        .limit(1);

      if (!oficio) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Ofício não encontrado" });
      }

      if (!oficio.conteudoFinal || oficio.conteudoFinal.trim().length < 20) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "O ofício precisa ter conteúdo para ser melhorado",
        });
      }

      const result = await pythonBackend.melhorarTexto(
        oficio.conteudoFinal,
        input.instrucao
      );

      if (!result.success) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: result.error || "Erro ao melhorar texto com IA",
        });
      }

      // Atualizar conteúdo
      const currentMeta = (oficio.metadata as Record<string, unknown>) || {};
      await db
        .update(documentosGerados)
        .set({
          conteudoFinal: result.conteudo,
          geradoPorIA: true,
          metadata: {
            ...currentMeta,
            iaModelo: result.modelo,
            versao: ((currentMeta.versao as number) || 1) + 1,
          },
          updatedAt: new Date(),
        })
        .where(eq(documentosGerados.id, input.oficioId));

      return {
        conteudo: result.conteudo,
        modelo: result.modelo,
      };
    }),

  // ==========================================
  // ANÁLISE DRIVE
  // ==========================================

  /** Retorna status da última análise de ofícios do Drive */
  statusAnalise: protectedProcedure.query(async () => {
    const [stats] = await db
      .select({
        total: sql<number>`count(*)::int`,
        pendentes: sql<number>`count(*) filter (where status = 'pendente')::int`,
        processando: sql<number>`count(*) filter (where status = 'processando')::int`,
        concluidos: sql<number>`count(*) filter (where status = 'concluido')::int`,
        erros: sql<number>`count(*) filter (where status = 'erro')::int`,
        ultimaAnalise: sql<string>`max(updated_at)::text`,
      })
      .from(oficioAnalises);

    return stats;
  }),

  /** Lista análises de ofícios */
  analises: protectedProcedure
    .input(
      z
        .object({
          tipo: z.string().optional(),
          status: z.string().optional(),
          limit: z.number().default(50),
          offset: z.number().default(0),
        })
        .optional()
    )
    .query(async ({ input }) => {
      const { tipo, status, limit = 50, offset = 0 } = input || {};

      const conditions = [];
      if (tipo) {
        conditions.push(eq(oficioAnalises.tipoOficio, tipo));
      }
      if (status) {
        conditions.push(eq(oficioAnalises.status, status as never));
      }

      const results = await db
        .select()
        .from(oficioAnalises)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(oficioAnalises.createdAt))
        .limit(limit)
        .offset(offset);

      return results;
    }),

  // ==========================================
  // ESTATÍSTICAS
  // ==========================================

  /** Estatísticas de uso de ofícios */
  stats: protectedProcedure.query(async () => {
    // Total de ofícios gerados
    const [oficioStats] = await db
      .select({
        total: sql<number>`count(*)::int`,
        rascunhos: sql<number>`count(*) filter (where metadata->>'status' = 'rascunho')::int`,
        enviados: sql<number>`count(*) filter (where metadata->>'status' = 'enviado')::int`,
        comIA: sql<number>`count(*) filter (where gerado_por_ia = true)::int`,
      })
      .from(documentosGerados)
      .leftJoin(documentoModelos, eq(documentosGerados.modeloId, documentoModelos.id))
      .where(eq(documentoModelos.tipoPeca, "oficio"));

    // Templates de ofício disponíveis
    const [templateStats] = await db
      .select({ total: sql<number>`count(*)::int` })
      .from(documentoModelos)
      .where(
        and(
          eq(documentoModelos.tipoPeca, "oficio"),
          eq(documentoModelos.isAtivo, true),
          isNull(documentoModelos.deletedAt)
        )
      );

    // Análises do Drive
    const [analiseStats] = await db
      .select({
        total: sql<number>`count(*)::int`,
        concluidas: sql<number>`count(*) filter (where status = 'concluido')::int`,
      })
      .from(oficioAnalises);

    return {
      oficios: oficioStats || { total: 0, rascunhos: 0, enviados: 0, comIA: 0 },
      templates: templateStats?.total || 0,
      analises: analiseStats || { total: 0, concluidas: 0 },
    };
  }),

  // ==========================================
  // TIPOS DE OFÍCIO (REFERÊNCIA)
  // ==========================================

  /** Lista tipos de ofícios disponíveis */
  tiposOficio: protectedProcedure.query(() => TIPOS_OFICIO),

  /** Lista status possíveis */
  statusPossiveis: protectedProcedure.query(() => STATUS_OFICIO),
});
