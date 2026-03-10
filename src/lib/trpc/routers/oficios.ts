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
  documentos,
  driveFiles,
} from "@/lib/db/schema";
import { eq, ilike, or, desc, sql, and, isNull, asc, inArray } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { VARIAVEIS_PADRAO } from "./modelos";
import { pythonBackend, isPythonBackendAvailable } from "@/lib/services/python-backend";
import { listAllItemsInFolder } from "@/lib/services/google-drive";
import type { DriveFileInfo } from "@/lib/services/google-drive";

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
// CONSTANTES
// ==========================================

/** ID da pasta no Drive com ofícios existentes */
const OFICIOS_DRIVE_FOLDER_ID = "1LidSgAPdzrRPl0ohPJ7kKlDWY_quMr-7";

/** Classifica o tipo de ofício pelo nome do arquivo */
function classificarPorNome(fileName: string): string {
  const nome = fileName.toLowerCase();
  if (nome.includes("requisit")) return "requisitorio";
  if (nome.includes("comunic") || nome.includes("informa")) return "comunicacao";
  if (nome.includes("encaminh")) return "encaminhamento";
  if (nome.includes("solicita") || nome.includes("providen")) return "solicitacao_providencias";
  if (nome.includes("intima") || nome.includes("notifica")) return "intimacao";
  if (nome.includes("pedido") && nome.includes("informa")) return "pedido_informacao";
  if (nome.includes("manifesta")) return "manifestacao";
  if (nome.includes("represent")) return "representacao";
  if (nome.includes("parecer")) return "parecer_tecnico";
  if (nome.includes("convite") || nome.includes("convoca")) return "convite";
  if (nome.includes("resposta")) return "resposta_oficio";
  if (nome.includes("certid")) return "certidao";
  return "comunicacao"; // fallback
}

/** Verifica se um arquivo do Drive é um documento (não pasta) */
function isDocumentFile(file: DriveFileInfo): boolean {
  return file.mimeType !== "application/vnd.google-apps.folder";
}

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

  /** Analisa ofícios do Drive — lista arquivos, cria registros e classifica */
  analisarDrive: protectedProcedure.mutation(async () => {
    // 1. Listar arquivos da pasta de ofícios no Drive
    let driveFiles: DriveFileInfo[];
    try {
      driveFiles = await listAllItemsInFolder(OFICIOS_DRIVE_FOLDER_ID);
    } catch (err) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: `Erro ao listar pasta do Drive: ${err instanceof Error ? err.message : String(err)}`,
      });
    }

    // 2. Filtrar apenas documentos (não pastas)
    const documentFiles = driveFiles.filter(isDocumentFile);

    if (documentFiles.length === 0) {
      return { total: 0, novos: 0, jaAnalisados: 0 };
    }

    // 3. Verificar quais já foram analisados (evitar duplicatas)
    const existingAnalises = await db
      .select({ driveFileId: oficioAnalises.driveFileId })
      .from(oficioAnalises)
      .where(
        inArray(
          oficioAnalises.driveFileId,
          documentFiles.map((f) => f.id)
        )
      );

    const jaAnalisadosSet = new Set(existingAnalises.map((a) => a.driveFileId));
    const novosArquivos = documentFiles.filter((f) => !jaAnalisadosSet.has(f.id));

    if (novosArquivos.length === 0) {
      return {
        total: documentFiles.length,
        novos: 0,
        jaAnalisados: existingAnalises.length,
      };
    }

    // 4. Criar registros de análise com status "pendente"
    const registros = novosArquivos.map((f) => ({
      driveFileId: f.id,
      driveFileName: f.name,
      driveFolderId: OFICIOS_DRIVE_FOLDER_ID,
      status: "pendente" as const,
    }));

    await db.insert(oficioAnalises).values(registros);

    // 5. Tentar classificação — Python backend ou fallback por nome
    const backendAvailable = await isPythonBackendAvailable();

    // Processar em background (não bloquear a resposta)
    // Usa Promise sem await para fire-and-forget
    void (async () => {
      for (const file of novosArquivos) {
        try {
          // Marcar como "processando"
          await db
            .update(oficioAnalises)
            .set({ status: "processando", updatedAt: new Date() })
            .where(eq(oficioAnalises.driveFileId, file.id));

          if (backendAvailable) {
            // Tentar extração + classificação via Python backend
            try {
              const extractResult = await pythonBackend.extractFromDrive(file.id, file.name);

              if (extractResult.success && extractResult.content_markdown) {
                // Classificar o conteúdo extraído
                const classResult = await pythonBackend.classificarOficio(
                  extractResult.content_markdown
                );

                if (classResult.success) {
                  await db
                    .update(oficioAnalises)
                    .set({
                      tipoOficio: classResult.tipo_oficio,
                      destinatarioTipo: classResult.destinatario_tipo,
                      assunto: classResult.assunto,
                      qualidadeScore: classResult.qualidade_score,
                      variaveisIdentificadas: classResult.variaveis_detectadas,
                      estrutura: classResult.estrutura as Record<string, string>,
                      conteudoExtraido: extractResult.content_markdown.slice(0, 10000),
                      status: "concluido",
                      updatedAt: new Date(),
                    })
                    .where(eq(oficioAnalises.driveFileId, file.id));
                  continue;
                }
              }

              // Extraction succeeded but classification failed — fallback
              await db
                .update(oficioAnalises)
                .set({
                  tipoOficio: classificarPorNome(file.name),
                  qualidadeScore: 0,
                  conteudoExtraido: extractResult.content_markdown?.slice(0, 10000) || null,
                  status: "concluido",
                  updatedAt: new Date(),
                })
                .where(eq(oficioAnalises.driveFileId, file.id));
            } catch {
              // Python backend call failed — use filename fallback
              await db
                .update(oficioAnalises)
                .set({
                  tipoOficio: classificarPorNome(file.name),
                  qualidadeScore: 0,
                  status: "concluido",
                  updatedAt: new Date(),
                })
                .where(eq(oficioAnalises.driveFileId, file.id));
            }
          } else {
            // No Python backend — simple filename classification
            await db
              .update(oficioAnalises)
              .set({
                tipoOficio: classificarPorNome(file.name),
                qualidadeScore: 0,
                status: "concluido",
                updatedAt: new Date(),
              })
              .where(eq(oficioAnalises.driveFileId, file.id));
          }
        } catch (err) {
          // Mark as error
          await db
            .update(oficioAnalises)
            .set({
              status: "erro",
              erro: err instanceof Error ? err.message : String(err),
              updatedAt: new Date(),
            })
            .where(eq(oficioAnalises.driveFileId, file.id));
        }
      }
    })();

    return {
      total: documentFiles.length,
      novos: novosArquivos.length,
      jaAnalisados: existingAnalises.length,
    };
  }),

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
  // EXPORTAÇÃO — Google Docs + PDF
  // ==========================================

  /** Exporta ofício para Google Docs */
  exportarGoogleDocs: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const { createGoogleDoc, updateGoogleDoc } = await import("@/lib/services/google-drive");

      // Buscar ofício com dados do assistido
      const [oficio] = await db
        .select({
          id: documentosGerados.id,
          titulo: documentosGerados.titulo,
          conteudoFinal: documentosGerados.conteudoFinal,
          googleDocId: documentosGerados.googleDocId,
          googleDocUrl: documentosGerados.googleDocUrl,
          assistidoId: documentosGerados.assistidoId,
          metadata: documentosGerados.metadata,
        })
        .from(documentosGerados)
        .where(eq(documentosGerados.id, input.id))
        .limit(1);

      if (!oficio) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Oficio nao encontrado" });
      }

      if (!oficio.conteudoFinal || oficio.conteudoFinal.trim().length < 10) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "O oficio precisa ter conteudo para ser exportado",
        });
      }

      // Se ja tem Google Doc, atualizar o conteudo existente
      if (oficio.googleDocId) {
        const updated = await updateGoogleDoc(oficio.googleDocId, oficio.conteudoFinal);
        if (!updated) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Erro ao atualizar Google Doc existente",
          });
        }
        return {
          googleDocId: oficio.googleDocId,
          googleDocUrl: oficio.googleDocUrl!,
          updated: true,
        };
      }

      // Criar novo Google Doc
      const result = await createGoogleDoc(oficio.titulo, oficio.conteudoFinal);

      if (!result) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erro ao criar Google Doc. Verifique a configuracao do Google Drive.",
        });
      }

      // Salvar referencia no banco
      const currentMeta = (oficio.metadata as Record<string, unknown>) || {};
      await db
        .update(documentosGerados)
        .set({
          googleDocId: result.docId,
          googleDocUrl: result.docUrl,
          driveFileId: result.docId,
          metadata: {
            ...currentMeta,
            exportadoGoogleDocsEm: new Date().toISOString(),
          },
          updatedAt: new Date(),
        })
        .where(eq(documentosGerados.id, input.id));

      return {
        googleDocId: result.docId,
        googleDocUrl: result.docUrl,
        updated: false,
      };
    }),

  /** Exporta oficio como PDF (gera via Google Docs API e retorna URL base64 para download) */
  exportarPDF: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const { createGoogleDoc, exportGoogleDocAsPdf } = await import("@/lib/services/google-drive");

      // Buscar oficio
      const [oficio] = await db
        .select({
          id: documentosGerados.id,
          titulo: documentosGerados.titulo,
          conteudoFinal: documentosGerados.conteudoFinal,
          googleDocId: documentosGerados.googleDocId,
          assistidoId: documentosGerados.assistidoId,
          metadata: documentosGerados.metadata,
        })
        .from(documentosGerados)
        .where(eq(documentosGerados.id, input.id))
        .limit(1);

      if (!oficio) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Oficio nao encontrado" });
      }

      if (!oficio.conteudoFinal || oficio.conteudoFinal.trim().length < 10) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "O oficio precisa ter conteudo para ser exportado como PDF",
        });
      }

      let docId = oficio.googleDocId;

      // Se nao tem Google Doc, criar um temporario para gerar o PDF
      if (!docId) {
        const result = await createGoogleDoc(oficio.titulo, oficio.conteudoFinal);
        if (!result) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Erro ao criar Google Doc para conversao em PDF",
          });
        }
        docId = result.docId;

        // Salvar referencia do Google Doc no banco (bonus: usuario ganha o Doc tambem)
        const currentMeta = (oficio.metadata as Record<string, unknown>) || {};
        await db
          .update(documentosGerados)
          .set({
            googleDocId: result.docId,
            googleDocUrl: result.docUrl,
            driveFileId: result.docId,
            metadata: {
              ...currentMeta,
              exportadoGoogleDocsEm: new Date().toISOString(),
            },
            updatedAt: new Date(),
          })
          .where(eq(documentosGerados.id, input.id));
      }

      // Exportar o Google Doc como PDF
      const pdfBuffer = await exportGoogleDocAsPdf(docId);
      if (!pdfBuffer) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erro ao exportar PDF do Google Docs",
        });
      }

      // Retornar o PDF como base64 para download no cliente
      const pdfBase64 = pdfBuffer.toString("base64");
      const fileName = `${oficio.titulo.replace(/[^a-zA-Z0-9\s-]/g, "").trim()}.pdf`;

      return {
        pdfBase64,
        fileName,
        size: pdfBuffer.length,
      };
    }),

  // ==========================================
  // SUGESTÃO DE OFÍCIO PARA DEMANDA
  // ==========================================

  /** Sugere tipo de ofício baseado no ato e providências da demanda */
  sugerirParaDemanda: protectedProcedure
    .input(z.object({ demandaId: z.number() }))
    .query(async ({ input }) => {
      // Buscar demanda com ato e providências
      const [demanda] = await db
        .select({
          id: demandas.id,
          ato: demandas.ato,
          providencias: demandas.providencias,
          assistidoId: demandas.assistidoId,
          processoId: demandas.processoId,
        })
        .from(demandas)
        .where(eq(demandas.id, input.demandaId))
        .limit(1);

      if (!demanda) {
        return { sugerido: false, tipoOficio: null, mensagem: "Demanda não encontrada" };
      }

      const ato = (demanda.ato || "").toLowerCase().trim();
      const providencias = (demanda.providencias || "").toLowerCase().trim();

      // Mapping: ato => tipo de ofício sugerido
      let tipoOficio: string | null = null;
      let mensagem = "";

      // Manifestações processuais
      if (
        ato.includes("resposta à acusação") ||
        ato.includes("alegações finais") ||
        ato.includes("memoriais") ||
        ato.includes("contestação") ||
        ato.includes("embargos de declaração") ||
        ato.includes("manifestação contra")
      ) {
        tipoOficio = "manifestacao";
        mensagem = "Sugerido com base no ato processual que pode exigir manifestação formal";
      }
      // Ofícios explícitos e requisições
      else if (
        ato.includes("ofício") ||
        ato.includes("oficiar") ||
        providencias.includes("oficiar") ||
        providencias.includes("requisitar") ||
        providencias.includes("solicitar documento") ||
        providencias.includes("solicitar prontuário")
      ) {
        tipoOficio = "requisitorio";
        mensagem = "Sugerido por necessidade de requisição documental identificada";
      }
      // Diligências e solicitações de providências
      else if (
        ato.includes("diligência") ||
        ato.includes("designação") ||
        ato.includes("transferência") ||
        ato.includes("requerimento") ||
        providencias.includes("diligência") ||
        providencias.includes("providência")
      ) {
        tipoOficio = "solicitacao_providencias";
        mensagem = "Sugerido para formalizar solicitação de providências";
      }
      // Pedidos de informação
      else if (
        ato.includes("pedido de informação") ||
        providencias.includes("informação") ||
        providencias.includes("certidão") ||
        ato.includes("quesitos")
      ) {
        tipoOficio = "pedido_informacao";
        mensagem = "Sugerido para formalizar pedido de informação";
      }
      // Encaminhamento
      else if (
        ato.includes("encaminhar") ||
        providencias.includes("encaminhar") ||
        ato.includes("prosseguimento do feito")
      ) {
        tipoOficio = "encaminhamento";
        mensagem = "Sugerido para formalizar encaminhamento";
      }
      // Ciências geralmente não precisam de ofício, mas verificar providências
      else if (ato.includes("ciência")) {
        if (providencias.includes("oficiar") || providencias.includes("solicitar") || providencias.includes("requisitar")) {
          tipoOficio = "requisitorio";
          mensagem = "Sugerido com base nas providências indicadas";
        } else {
          return { sugerido: false, tipoOficio: null, mensagem: "Ato de ciência sem necessidade de ofício identificada" };
        }
      }
      // Comunicações genéricas
      else if (
        ato.includes("atualização de endereço") ||
        ato.includes("juntada de documentos") ||
        ato.includes("petição intermediária") ||
        ato.includes("testemunhas") ||
        ato.includes("rol de testemunhas")
      ) {
        tipoOficio = "comunicacao";
        mensagem = "Sugerido como comunicação genérica para o ato";
      }
      // Default: verificar providências para decidir
      else if (providencias) {
        tipoOficio = "comunicacao";
        mensagem = "Sugerido como comunicação com base nas providências";
      }

      if (!tipoOficio) {
        return { sugerido: false, tipoOficio: null, mensagem: "Nenhuma sugestão de ofício para este ato" };
      }

      // Buscar template mais usado para esse tipo
      const [templateSugerido] = await db
        .select({
          id: documentoModelos.id,
          titulo: documentoModelos.titulo,
        })
        .from(documentoModelos)
        .where(
          and(
            eq(documentoModelos.tipoPeca, "oficio"),
            eq(documentoModelos.isAtivo, true),
            isNull(documentoModelos.deletedAt),
            sql`${documentoModelos.formatacao}->>'tipoOficio' = ${tipoOficio}`
          )
        )
        .orderBy(desc(documentoModelos.totalUsos))
        .limit(1);

      // Buscar label do tipo
      const tipoLabel = TIPOS_OFICIO.find((t) => t.value === tipoOficio)?.label || tipoOficio;

      return {
        sugerido: true,
        tipoOficio,
        tipoLabel,
        templateSugerido: templateSugerido
          ? { id: templateSugerido.id, titulo: templateSugerido.titulo }
          : undefined,
        mensagem,
      };
    }),

  // ==========================================
  // DOCUMENTOS PARA CONTEXTO DE GERAÇÃO IA
  // ==========================================

  /** Lista documentos e arquivos do Drive vinculados a entidades, para selecionar contexto na geração IA */
  getDocumentosParaContexto: protectedProcedure
    .input(
      z.object({
        assistidoId: z.number().optional(),
        processoId: z.number().optional(),
        casoId: z.number().optional(),
      })
    )
    .query(async ({ input }) => {
      // Return empty if no filters provided
      if (!input.assistidoId && !input.processoId && !input.casoId) {
        return { documentos: [], driveFiles: [] };
      }

      // Build OR conditions for entity matching — documentos table
      const docConditions = [];
      if (input.assistidoId) {
        docConditions.push(eq(documentos.assistidoId, input.assistidoId));
      }
      if (input.processoId) {
        docConditions.push(eq(documentos.processoId, input.processoId));
      }
      if (input.casoId) {
        docConditions.push(eq(documentos.casoId, input.casoId));
      }

      const docsResult = await db
        .select({
          id: documentos.id,
          titulo: documentos.titulo,
          fileName: documentos.fileName,
          fileSize: documentos.fileSize,
          mimeType: documentos.mimeType,
          hasContent: sql<boolean>`(${documentos.conteudoCompleto} IS NOT NULL AND ${documentos.conteudoCompleto} != '')`.as("has_content"),
        })
        .from(documentos)
        .where(or(...docConditions))
        .orderBy(desc(documentos.createdAt))
        .limit(50);

      // Build OR conditions for entity matching — driveFiles table
      // Note: driveFiles has processoId and assistidoId but NOT casoId
      const driveConditions = [];
      if (input.assistidoId) {
        driveConditions.push(eq(driveFiles.assistidoId, input.assistidoId));
      }
      if (input.processoId) {
        driveConditions.push(eq(driveFiles.processoId, input.processoId));
      }

      let driveResult: Array<{
        id: number;
        name: string;
        driveFileId: string;
        mimeType: string | null;
        size: number | null;
      }> = [];

      if (driveConditions.length > 0) {
        driveResult = await db
          .select({
            id: driveFiles.id,
            name: driveFiles.name,
            driveFileId: driveFiles.driveFileId,
            mimeType: driveFiles.mimeType,
            size: driveFiles.fileSize,
          })
          .from(driveFiles)
          .where(
            and(
              or(...driveConditions),
              sql`${driveFiles.mimeType} != 'application/vnd.google-apps.folder'`
            )
          )
          .orderBy(asc(driveFiles.name))
          .limit(50);
      }

      return {
        documentos: docsResult,
        driveFiles: driveResult,
      };
    }),

  // ==========================================
  // GERAÇÃO DE OFÍCIO COM CLAUDE SONNET
  // ==========================================

  /** Gera ofício do zero a partir de uma ideia + contexto documental, usando Claude Sonnet */
  gerarComSonnet: protectedProcedure
    .input(
      z.object({
        tipoOficio: z.string(),
        ideia: z.string().min(10, "Descreva a ideia com pelo menos 10 caracteres"),
        destinatario: z.string().optional(),
        urgencia: z.enum(["normal", "urgente", "urgentissimo"]).default("normal"),
        assistidoId: z.number().optional(),
        processoId: z.number().optional(),
        demandaId: z.number().optional(),
        contextDriveFileIds: z.array(z.number()).default([]),
        contextDocumentoIds: z.array(z.number()).default([]),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Import generateOficio dynamically to keep the module lazy
      const { generateOficio } = await import("@/lib/services/anthropic");

      // 1. Fetch assistido data if provided
      let dadosAssistido: {
        nome: string;
        cpf: string | null;
        rg: string | null;
        endereco: string | null;
        telefone: string | null;
        nomeMae: string | null;
        unidadePrisional: string | null;
        statusPrisional: string | null;
      } | undefined;

      if (input.assistidoId) {
        const [a] = await db
          .select({
            nome: assistidos.nome,
            cpf: assistidos.cpf,
            rg: assistidos.rg,
            endereco: assistidos.endereco,
            telefone: assistidos.telefone,
            nomeMae: assistidos.nomeMae,
            unidadePrisional: assistidos.unidadePrisional,
            statusPrisional: assistidos.statusPrisional,
          })
          .from(assistidos)
          .where(eq(assistidos.id, input.assistidoId))
          .limit(1);
        if (a) dadosAssistido = a;
      }

      // 2. Fetch processo data if provided
      let dadosProcesso: {
        numero: string;
        vara: string | null;
        comarca: string | null;
        classeProcessual: string | null;
        assunto: string | null;
      } | undefined;

      if (input.processoId) {
        const [p] = await db
          .select({
            numero: processos.numeroAutos,
            vara: processos.vara,
            comarca: processos.comarca,
            classeProcessual: processos.classeProcessual,
            assunto: processos.assunto,
          })
          .from(processos)
          .where(eq(processos.id, input.processoId))
          .limit(1);
        if (p) dadosProcesso = p;
      }

      // 3. Get defensor name from session
      const nomeDefensor = ctx.session?.user?.name || "Defensor(a) Publico(a)";

      // 4. Collect document contexts
      const contextoDocumentos: Array<{ titulo: string; conteudo: string; fonte: string }> = [];

      // 4a. From documentos table (already have conteudoCompleto)
      if (input.contextDocumentoIds.length > 0) {
        const docs = await db
          .select({
            id: documentos.id,
            titulo: documentos.titulo,
            fileName: documentos.fileName,
            conteudoCompleto: documentos.conteudoCompleto,
          })
          .from(documentos)
          .where(inArray(documentos.id, input.contextDocumentoIds));

        for (const doc of docs) {
          if (doc.conteudoCompleto) {
            contextoDocumentos.push({
              titulo: doc.titulo || doc.fileName || `Documento #${doc.id}`,
              conteudo: doc.conteudoCompleto.slice(0, 30000), // truncate per doc
              fonte: "Documento vinculado",
            });
          }
        }
      }

      // 4b. From driveFiles table — need to extract content
      if (input.contextDriveFileIds.length > 0) {
        const files = await db
          .select({
            id: driveFiles.id,
            name: driveFiles.name,
            driveFileId: driveFiles.driveFileId,
            documentoId: driveFiles.documentoId,
          })
          .from(driveFiles)
          .where(inArray(driveFiles.id, input.contextDriveFileIds));

        for (const file of files) {
          try {
            // Try to find existing extracted content via linked documento
            if (file.documentoId) {
              const [linkedDoc] = await db
                .select({
                  conteudoCompleto: documentos.conteudoCompleto,
                })
                .from(documentos)
                .where(eq(documentos.id, file.documentoId))
                .limit(1);

              if (linkedDoc?.conteudoCompleto) {
                contextoDocumentos.push({
                  titulo: file.name,
                  conteudo: linkedDoc.conteudoCompleto.slice(0, 30000),
                  fonte: "Google Drive",
                });
                continue;
              }
            }

            // Extract on-demand via Python backend
            try {
              const extractResult = await pythonBackend.extractFromDrive(file.driveFileId, file.name);
              if (extractResult.success && extractResult.content_markdown) {
                contextoDocumentos.push({
                  titulo: file.name,
                  conteudo: extractResult.content_markdown.slice(0, 30000),
                  fonte: "Google Drive (extraido)",
                });
              }
            } catch (extractErr) {
              console.warn(`[Oficios] Nao foi possivel extrair ${file.name}:`, extractErr);
              // Skip this file, don't fail the whole operation
            }
          } catch {
            console.warn(`[Oficios] Erro ao processar arquivo Drive ${file.name}`);
          }
        }
      }

      // 5. Find tipo label
      const tipoLabel = TIPOS_OFICIO.find((t) => t.value === input.tipoOficio)?.label || input.tipoOficio;

      // 6. Call Anthropic service
      const result = await generateOficio({
        tipoOficio: input.tipoOficio,
        tipoLabel,
        ideia: input.ideia,
        contextoDocumentos,
        dadosAssistido,
        dadosProcesso,
        destinatario: input.destinatario,
        nomeDefensor,
      });

      // 7. Create documentosGerados record
      const [oficio] = await db
        .insert(documentosGerados)
        .values({
          titulo: result.titulo || `Oficio - ${tipoLabel}`,
          conteudoFinal: result.conteudoGerado,
          geradoPorIA: true,
          promptIA: input.ideia,
          assistidoId: input.assistidoId || null,
          processoId: input.processoId || null,
          demandaId: input.demandaId || null,
          createdById: ctx.session?.user?.id ? Number(ctx.session.user.id) : undefined,
          metadata: {
            tipoOficio: input.tipoOficio,
            destinatario: input.destinatario || "",
            urgencia: input.urgencia,
            status: "rascunho" as const,
            iaModelo: result.modeloUsado,
            versao: 1,
          },
        })
        .returning({ id: documentosGerados.id });

      return {
        id: oficio.id,
        titulo: result.titulo,
        modelo: result.modeloUsado,
        tokensEntrada: result.tokensEntrada,
        tokensSaida: result.tokensSaida,
        custoEstimado: result.custoEstimado,
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
