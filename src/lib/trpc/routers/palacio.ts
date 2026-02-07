import { z } from "zod";
import { router, protectedProcedure } from "../init";
import { db } from "@/lib/db";
import {
  palacioDiagramas,
  palacioElementos,
  palacioConexoes,
  casos,
  casePersonas,
  caseFacts,
  documentos,
  testemunhas,
  tesesDefensivas,
} from "@/lib/db/schema";
import { eq, and, isNull, desc, sql, inArray } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { getWorkspaceScope, resolveWorkspaceId } from "../workspace";

// ==========================================
// SCHEMAS DE VALIDAÇÃO
// ==========================================

const excalidrawDataSchema = z.object({
  type: z.literal("excalidraw"),
  version: z.number(),
  source: z.string(),
  elements: z.array(z.unknown()),
  appState: z.record(z.unknown()),
  files: z.record(z.unknown()),
});

const createDiagramaSchema = z.object({
  casoId: z.number(),
  titulo: z.string().min(1, "Título é obrigatório"),
  descricao: z.string().optional(),
  tipo: z.enum([
    "MAPA_MENTAL",
    "TIMELINE",
    "RELACIONAL",
    "HIERARQUIA",
    "MATRIX",
    "FLUXOGRAMA",
    "LIVRE",
  ]).default("MAPA_MENTAL"),
  excalidrawData: excalidrawDataSchema.optional(),
  thumbnail: z.string().optional(),
  formatoExportacao: z.enum(["obsidian", "standard", "animated"]).optional(),
  tags: z.array(z.string()).optional(),
  ordem: z.number().optional(),
});

const updateDiagramaSchema = createDiagramaSchema.partial().extend({
  id: z.number(),
});

const saveExcalidrawDataSchema = z.object({
  diagramaId: z.number(),
  excalidrawData: excalidrawDataSchema,
  thumbnail: z.string().optional(),
});

const createElementoSchema = z.object({
  diagramaId: z.number(),
  excalidrawElementId: z.string(),
  tipoVinculo: z.enum(["persona", "fato", "prova", "tese", "documento", "testemunha"]).optional(),
  personaId: z.number().optional(),
  fatoId: z.number().optional(),
  documentoId: z.number().optional(),
  testemunhaId: z.number().optional(),
  teseId: z.number().optional(),
  label: z.string().optional(),
  notas: z.string().optional(),
  cor: z.string().optional(),
  icone: z.string().optional(),
});

const updateElementoSchema = createElementoSchema.partial().extend({
  id: z.number(),
});

const createConexaoSchema = z.object({
  diagramaId: z.number(),
  elementoOrigemId: z.number(),
  elementoDestinoId: z.number(),
  tipoConexao: z.enum(["contradicao", "corrobora", "sequencia", "hierarquia", "associacao"]).optional(),
  label: z.string().optional(),
  forca: z.number().min(0).max(100).optional(),
  direcional: z.boolean().optional(),
});

// ==========================================
// ROUTER DO PALÁCIO DA MENTE
// ==========================================

export const palacioRouter = router({
  // ==========================================
  // DIAGRAMAS - CRUD
  // ==========================================

  // Listar todos os diagramas de um caso
  listByCaso: protectedProcedure
    .input(z.object({
      casoId: z.number(),
      includeDeleted: z.boolean().optional().default(false),
    }))
    .query(async ({ ctx, input }) => {
      const workspaceId = await resolveWorkspaceId(ctx);

      // Verificar se o caso existe e pertence ao workspace
      const caso = await db.query.casos.findFirst({
        where: and(
          eq(casos.id, input.casoId),
          eq(casos.workspaceId, workspaceId),
          isNull(casos.deletedAt),
        ),
      });

      if (!caso) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Caso não encontrado",
        });
      }

      const conditions = [
        eq(palacioDiagramas.casoId, input.casoId),
      ];

      if (!input.includeDeleted) {
        conditions.push(isNull(palacioDiagramas.deletedAt));
      }

      const diagramas = await db.query.palacioDiagramas.findMany({
        where: and(...conditions),
        orderBy: [desc(palacioDiagramas.updatedAt)],
        with: {
          criadoPor: {
            columns: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      return diagramas;
    }),

  // Buscar diagrama por ID
  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const workspaceId = await resolveWorkspaceId(ctx);

      const diagrama = await db.query.palacioDiagramas.findFirst({
        where: and(
          eq(palacioDiagramas.id, input.id),
          eq(palacioDiagramas.workspaceId, workspaceId),
          isNull(palacioDiagramas.deletedAt),
        ),
        with: {
          caso: {
            columns: {
              id: true,
              titulo: true,
              atribuicao: true,
            },
          },
          criadoPor: {
            columns: {
              id: true,
              name: true,
              email: true,
            },
          },
          elementos: true,
          conexoes: true,
        },
      });

      if (!diagrama) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Diagrama não encontrado",
        });
      }

      return diagrama;
    }),

  // Criar novo diagrama
  create: protectedProcedure
    .input(createDiagramaSchema)
    .mutation(async ({ ctx, input }) => {
      const workspaceId = await resolveWorkspaceId(ctx);
      const userId = ctx.session.user.id;

      // Verificar se o caso existe
      const caso = await db.query.casos.findFirst({
        where: and(
          eq(casos.id, input.casoId),
          eq(casos.workspaceId, workspaceId),
          isNull(casos.deletedAt),
        ),
      });

      if (!caso) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Caso não encontrado",
        });
      }

      const [diagrama] = await db.insert(palacioDiagramas).values({
        casoId: input.casoId,
        titulo: input.titulo,
        descricao: input.descricao,
        tipo: input.tipo,
        excalidrawData: input.excalidrawData,
        thumbnail: input.thumbnail,
        formatoExportacao: input.formatoExportacao,
        tags: input.tags,
        ordem: input.ordem ?? 0,
        criadoPorId: parseInt(userId),
        atualizadoPorId: parseInt(userId),
        workspaceId,
      }).returning();

      return diagrama;
    }),

  // Atualizar diagrama
  update: protectedProcedure
    .input(updateDiagramaSchema)
    .mutation(async ({ ctx, input }) => {
      const workspaceId = await resolveWorkspaceId(ctx);
      const userId = ctx.session.user.id;

      const { id, ...data } = input;

      // Verificar se o diagrama existe
      const existing = await db.query.palacioDiagramas.findFirst({
        where: and(
          eq(palacioDiagramas.id, id),
          eq(palacioDiagramas.workspaceId, workspaceId),
          isNull(palacioDiagramas.deletedAt),
        ),
      });

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Diagrama não encontrado",
        });
      }

      const [updated] = await db.update(palacioDiagramas)
        .set({
          ...data,
          atualizadoPorId: parseInt(userId),
          updatedAt: new Date(),
        })
        .where(eq(palacioDiagramas.id, id))
        .returning();

      return updated;
    }),

  // Salvar dados do Excalidraw (auto-save)
  saveExcalidrawData: protectedProcedure
    .input(saveExcalidrawDataSchema)
    .mutation(async ({ ctx, input }) => {
      const workspaceId = await resolveWorkspaceId(ctx);
      const userId = ctx.session.user.id;

      // Verificar se o diagrama existe
      const existing = await db.query.palacioDiagramas.findFirst({
        where: and(
          eq(palacioDiagramas.id, input.diagramaId),
          eq(palacioDiagramas.workspaceId, workspaceId),
          isNull(palacioDiagramas.deletedAt),
        ),
      });

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Diagrama não encontrado",
        });
      }

      const [updated] = await db.update(palacioDiagramas)
        .set({
          excalidrawData: input.excalidrawData,
          thumbnail: input.thumbnail,
          versao: (existing.versao ?? 1) + 1,
          atualizadoPorId: parseInt(userId),
          updatedAt: new Date(),
        })
        .where(eq(palacioDiagramas.id, input.diagramaId))
        .returning();

      return updated;
    }),

  // Soft delete diagrama
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const workspaceId = await resolveWorkspaceId(ctx);

      const [deleted] = await db.update(palacioDiagramas)
        .set({
          deletedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(and(
          eq(palacioDiagramas.id, input.id),
          eq(palacioDiagramas.workspaceId, workspaceId),
        ))
        .returning();

      if (!deleted) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Diagrama não encontrado",
        });
      }

      return { success: true };
    }),

  // Restaurar diagrama deletado
  restore: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const workspaceId = await resolveWorkspaceId(ctx);

      const [restored] = await db.update(palacioDiagramas)
        .set({
          deletedAt: null,
          updatedAt: new Date(),
        })
        .where(and(
          eq(palacioDiagramas.id, input.id),
          eq(palacioDiagramas.workspaceId, workspaceId),
        ))
        .returning();

      if (!restored) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Diagrama não encontrado",
        });
      }

      return restored;
    }),

  // ==========================================
  // ELEMENTOS - VÍNCULOS COM ENTIDADES
  // ==========================================

  // Criar elemento vinculado
  createElement: protectedProcedure
    .input(createElementoSchema)
    .mutation(async ({ ctx, input }) => {
      const workspaceId = await resolveWorkspaceId(ctx);

      // Verificar se o diagrama existe
      const diagrama = await db.query.palacioDiagramas.findFirst({
        where: and(
          eq(palacioDiagramas.id, input.diagramaId),
          eq(palacioDiagramas.workspaceId, workspaceId),
          isNull(palacioDiagramas.deletedAt),
        ),
      });

      if (!diagrama) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Diagrama não encontrado",
        });
      }

      const [elemento] = await db.insert(palacioElementos).values({
        diagramaId: input.diagramaId,
        excalidrawElementId: input.excalidrawElementId,
        tipoVinculo: input.tipoVinculo,
        personaId: input.personaId,
        fatoId: input.fatoId,
        documentoId: input.documentoId,
        testemunhaId: input.testemunhaId,
        teseId: input.teseId,
        label: input.label,
        notas: input.notas,
        cor: input.cor,
        icone: input.icone,
      }).returning();

      return elemento;
    }),

  // Atualizar elemento
  updateElement: protectedProcedure
    .input(updateElementoSchema)
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;

      const [updated] = await db.update(palacioElementos)
        .set({
          ...data,
          updatedAt: new Date(),
        })
        .where(eq(palacioElementos.id, id))
        .returning();

      if (!updated) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Elemento não encontrado",
        });
      }

      return updated;
    }),

  // Deletar elemento
  deleteElement: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await db.delete(palacioElementos)
        .where(eq(palacioElementos.id, input.id));

      return { success: true };
    }),

  // Listar elementos de um diagrama
  listElements: protectedProcedure
    .input(z.object({ diagramaId: z.number() }))
    .query(async ({ input }) => {
      const elementos = await db.query.palacioElementos.findMany({
        where: eq(palacioElementos.diagramaId, input.diagramaId),
        with: {
          persona: true,
          fato: true,
          documento: true,
          testemunha: true,
          tese: true,
        },
      });

      return elementos;
    }),

  // ==========================================
  // CONEXÕES - RELACIONAMENTOS
  // ==========================================

  // Criar conexão entre elementos
  createConexao: protectedProcedure
    .input(createConexaoSchema)
    .mutation(async ({ input }) => {
      const [conexao] = await db.insert(palacioConexoes).values({
        diagramaId: input.diagramaId,
        elementoOrigemId: input.elementoOrigemId,
        elementoDestinoId: input.elementoDestinoId,
        tipoConexao: input.tipoConexao,
        label: input.label,
        forca: input.forca,
        direcional: input.direcional ?? true,
      }).returning();

      return conexao;
    }),

  // Deletar conexão
  deleteConexao: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await db.delete(palacioConexoes)
        .where(eq(palacioConexoes.id, input.id));

      return { success: true };
    }),

  // Listar conexões de um diagrama
  listConexoes: protectedProcedure
    .input(z.object({ diagramaId: z.number() }))
    .query(async ({ input }) => {
      const conexoes = await db.query.palacioConexoes.findMany({
        where: eq(palacioConexoes.diagramaId, input.diagramaId),
        with: {
          elementoOrigem: true,
          elementoDestino: true,
        },
      });

      return conexoes;
    }),

  // ==========================================
  // DADOS PARA POVOAR O DIAGRAMA
  // ==========================================

  // Buscar entidades do caso para vincular no diagrama
  getCaseEntities: protectedProcedure
    .input(z.object({ casoId: z.number() }))
    .query(async ({ ctx, input }) => {
      const workspaceId = await resolveWorkspaceId(ctx);

      // Verificar se o caso existe
      const caso = await db.query.casos.findFirst({
        where: and(
          eq(casos.id, input.casoId),
          eq(casos.workspaceId, workspaceId),
          isNull(casos.deletedAt),
        ),
      });

      if (!caso) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Caso não encontrado",
        });
      }

      // Buscar todas as entidades do caso
      const [personas, fatos, docs, tests, teses] = await Promise.all([
        db.query.casePersonas.findMany({
          where: eq(casePersonas.casoId, input.casoId),
        }),
        db.query.caseFacts.findMany({
          where: eq(caseFacts.casoId, input.casoId),
        }),
        db.query.documentos.findMany({
          where: eq(documentos.casoId, input.casoId),
        }),
        db.query.testemunhas.findMany({
          where: eq(testemunhas.casoId, input.casoId),
        }),
        db.query.tesesDefensivas.findMany({
          where: eq(tesesDefensivas.casoId, input.casoId),
        }),
      ]);

      return {
        personas,
        fatos,
        documentos: docs,
        testemunhas: tests,
        teses,
      };
    }),

  // ==========================================
  // EXPORTAÇÃO
  // ==========================================

  // Exportar diagrama para formato específico
  export: protectedProcedure
    .input(z.object({
      diagramaId: z.number(),
      formato: z.enum(["obsidian", "standard", "animated"]),
    }))
    .mutation(async ({ ctx, input }) => {
      const workspaceId = await resolveWorkspaceId(ctx);
      const userId = ctx.session.user.id;

      const diagrama = await db.query.palacioDiagramas.findFirst({
        where: and(
          eq(palacioDiagramas.id, input.diagramaId),
          eq(palacioDiagramas.workspaceId, workspaceId),
          isNull(palacioDiagramas.deletedAt),
        ),
      });

      if (!diagrama) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Diagrama não encontrado",
        });
      }

      if (!diagrama.excalidrawData) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Diagrama não tem dados para exportar",
        });
      }

      // Atualizar registro de exportação
      await db.update(palacioDiagramas)
        .set({
          ultimoExportado: new Date(),
          formatoExportacao: input.formato,
          atualizadoPorId: parseInt(userId),
          updatedAt: new Date(),
        })
        .where(eq(palacioDiagramas.id, input.diagramaId));

      // Retornar dados formatados conforme o tipo
      const data = diagrama.excalidrawData;

      if (input.formato === "obsidian") {
        // Formato Obsidian com markdown wrapper
        const obsidianData = {
          ...data,
          source: "https://github.com/zsviczian/obsidian-excalidraw-plugin",
        };

        return {
          formato: "obsidian",
          extensao: ".md",
          conteudo: `---
excalidraw-plugin: parsed
tags: [excalidraw]
---
==⚠  Switch to EXCALIDRAW VIEW in the MORE OPTIONS menu of this document. ⚠== You can decompress Drawing data with the command palette: 'Decompress current Excalidraw file'. For more info check in plugin settings under 'Saving'

# Excalidraw Data

## Text Elements
%%
## Drawing
\`\`\`json
${JSON.stringify(obsidianData, null, 2)}
\`\`\`
%%`,
          nomeArquivo: `${diagrama.titulo.toLowerCase().replace(/\s+/g, "-")}.${diagrama.tipo.toLowerCase()}.md`,
        };
      }

      if (input.formato === "animated") {
        // Formato animado - adicionar customData.animate aos elementos
        const animatedData = {
          ...data,
          source: "https://excalidraw.com",
          elements: (data.elements as { id: string }[]).map((el, idx) => ({
            ...el,
            customData: {
              animate: {
                order: idx + 1,
                duration: 500,
              },
            },
          })),
        };

        return {
          formato: "animated",
          extensao: ".excalidraw",
          conteudo: JSON.stringify(animatedData, null, 2),
          nomeArquivo: `${diagrama.titulo.toLowerCase().replace(/\s+/g, "-")}.${diagrama.tipo.toLowerCase()}.animate.excalidraw`,
        };
      }

      // Formato standard
      const standardData = {
        ...data,
        source: "https://excalidraw.com",
      };

      return {
        formato: "standard",
        extensao: ".excalidraw",
        conteudo: JSON.stringify(standardData, null, 2),
        nomeArquivo: `${diagrama.titulo.toLowerCase().replace(/\s+/g, "-")}.${diagrama.tipo.toLowerCase()}.excalidraw`,
      };
    }),
});
