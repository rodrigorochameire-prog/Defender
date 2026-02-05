import { z } from "zod";
import { router, protectedProcedure } from "../init";
import { db } from "@/lib/db";
import {
  jurisprudenciaTemas,
  jurisprudenciaTeses,
  jurisprudenciaJulgados,
  jurisprudenciaBuscas,
  jurisprudenciaDriveFolders,
} from "@/lib/db/schema";
import { eq, ilike, or, desc, sql, and, isNull, asc, inArray } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { processJulgadoWithAI, searchJulgadosWithAI, askJurisprudenciaAI } from "@/lib/services/jurisprudencia-ai";
import { syncDriveFolderForJurisprudencia } from "@/lib/services/jurisprudencia-drive";

// ==========================================
// ROUTER DE JURISPRUDÊNCIA
// ==========================================

export const jurisprudenciaRouter = router({
  // ==========================================
  // TEMAS
  // ==========================================

  /** Lista todos os temas */
  listTemas: protectedProcedure
    .input(z.object({
      parentId: z.number().optional().nullable(),
      search: z.string().optional(),
    }).optional())
    .query(async ({ ctx, input }) => {
      const conditions = [];

      if (input?.parentId === null) {
        conditions.push(isNull(jurisprudenciaTemas.parentId));
      } else if (input?.parentId) {
        conditions.push(eq(jurisprudenciaTemas.parentId, input.parentId));
      }

      if (input?.search) {
        conditions.push(
          or(
            ilike(jurisprudenciaTemas.nome, `%${input.search}%`),
            ilike(jurisprudenciaTemas.descricao, `%${input.search}%`)
          )
        );
      }

      const temas = await db
        .select()
        .from(jurisprudenciaTemas)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(asc(jurisprudenciaTemas.nome));

      return temas;
    }),

  /** Busca tema por ID */
  getTema: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const [tema] = await db
        .select()
        .from(jurisprudenciaTemas)
        .where(eq(jurisprudenciaTemas.id, input.id));

      if (!tema) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Tema não encontrado" });
      }

      return tema;
    }),

  /** Cria novo tema */
  createTema: protectedProcedure
    .input(z.object({
      nome: z.string().min(1).max(200),
      descricao: z.string().optional(),
      cor: z.string().optional(),
      icone: z.string().optional(),
      parentId: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const [tema] = await db
        .insert(jurisprudenciaTemas)
        .values({
          ...input,
          createdById: ctx.user.id,
        })
        .returning();

      return tema;
    }),

  /** Atualiza tema */
  updateTema: protectedProcedure
    .input(z.object({
      id: z.number(),
      nome: z.string().min(1).max(200).optional(),
      descricao: z.string().optional(),
      cor: z.string().optional(),
      icone: z.string().optional(),
      parentId: z.number().optional().nullable(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;

      const [tema] = await db
        .update(jurisprudenciaTemas)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(jurisprudenciaTemas.id, id))
        .returning();

      if (!tema) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Tema não encontrado" });
      }

      return tema;
    }),

  /** Remove tema */
  deleteTema: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await db.delete(jurisprudenciaTemas).where(eq(jurisprudenciaTemas.id, input.id));
      return { success: true };
    }),

  // ==========================================
  // TESES
  // ==========================================

  /** Lista teses */
  listTeses: protectedProcedure
    .input(z.object({
      temaId: z.number().optional(),
      posicao: z.enum(["favoravel", "desfavoravel", "neutro"]).optional(),
      search: z.string().optional(),
    }).optional())
    .query(async ({ ctx, input }) => {
      const conditions = [];

      if (input?.temaId) {
        conditions.push(eq(jurisprudenciaTeses.temaId, input.temaId));
      }

      if (input?.posicao) {
        conditions.push(eq(jurisprudenciaTeses.posicao, input.posicao));
      }

      if (input?.search) {
        conditions.push(
          or(
            ilike(jurisprudenciaTeses.titulo, `%${input.search}%`),
            ilike(jurisprudenciaTeses.descricao, `%${input.search}%`)
          )
        );
      }

      const teses = await db
        .select()
        .from(jurisprudenciaTeses)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(jurisprudenciaTeses.totalJulgados));

      return teses;
    }),

  /** Cria tese */
  createTese: protectedProcedure
    .input(z.object({
      temaId: z.number().optional(),
      titulo: z.string().min(1).max(300),
      descricao: z.string().optional(),
      textoTese: z.string().optional(),
      posicao: z.enum(["favoravel", "desfavoravel", "neutro"]).optional(),
      forca: z.enum(["forte", "medio", "fraco"]).optional(),
      tags: z.array(z.string()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const [tese] = await db
        .insert(jurisprudenciaTeses)
        .values({
          ...input,
          createdById: ctx.user.id,
        })
        .returning();

      return tese;
    }),

  /** Atualiza tese */
  updateTese: protectedProcedure
    .input(z.object({
      id: z.number(),
      temaId: z.number().optional().nullable(),
      titulo: z.string().min(1).max(300).optional(),
      descricao: z.string().optional(),
      textoTese: z.string().optional(),
      posicao: z.enum(["favoravel", "desfavoravel", "neutro"]).optional(),
      forca: z.enum(["forte", "medio", "fraco"]).optional(),
      tags: z.array(z.string()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;

      const [tese] = await db
        .update(jurisprudenciaTeses)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(jurisprudenciaTeses.id, id))
        .returning();

      return tese;
    }),

  /** Remove tese */
  deleteTese: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await db.delete(jurisprudenciaTeses).where(eq(jurisprudenciaTeses.id, input.id));
      return { success: true };
    }),

  // ==========================================
  // JULGADOS
  // ==========================================

  /** Lista julgados com filtros */
  listJulgados: protectedProcedure
    .input(z.object({
      tribunal: z.enum(["STF", "STJ", "TJBA", "TRF1", "TRF3", "OUTRO"]).optional(),
      tipoDecisao: z.enum(["ACORDAO", "DECISAO_MONOCRATICA", "SUMULA", "SUMULA_VINCULANTE", "REPERCUSSAO_GERAL", "RECURSO_REPETITIVO", "INFORMATIVO", "OUTRO"]).optional(),
      temaId: z.number().optional(),
      teseId: z.number().optional(),
      status: z.enum(["pendente", "processando", "processado", "erro"]).optional(),
      isFavorito: z.boolean().optional(),
      search: z.string().optional(),
      limit: z.number().default(50),
      offset: z.number().default(0),
    }).optional())
    .query(async ({ ctx, input }) => {
      const {
        tribunal,
        tipoDecisao,
        temaId,
        teseId,
        status,
        isFavorito,
        search,
        limit = 50,
        offset = 0,
      } = input || {};

      const conditions = [];

      if (tribunal) {
        conditions.push(eq(jurisprudenciaJulgados.tribunal, tribunal));
      }

      if (tipoDecisao) {
        conditions.push(eq(jurisprudenciaJulgados.tipoDecisao, tipoDecisao));
      }

      if (temaId) {
        conditions.push(eq(jurisprudenciaJulgados.temaId, temaId));
      }

      if (teseId) {
        conditions.push(eq(jurisprudenciaJulgados.teseId, teseId));
      }

      if (status) {
        conditions.push(eq(jurisprudenciaJulgados.status, status));
      }

      if (isFavorito !== undefined) {
        conditions.push(eq(jurisprudenciaJulgados.isFavorito, isFavorito));
      }

      if (search) {
        conditions.push(
          or(
            ilike(jurisprudenciaJulgados.ementa, `%${search}%`),
            ilike(jurisprudenciaJulgados.numeroProcesso, `%${search}%`),
            ilike(jurisprudenciaJulgados.relator, `%${search}%`)
          )
        );
      }

      const julgados = await db
        .select({
          id: jurisprudenciaJulgados.id,
          tribunal: jurisprudenciaJulgados.tribunal,
          tipoDecisao: jurisprudenciaJulgados.tipoDecisao,
          numeroProcesso: jurisprudenciaJulgados.numeroProcesso,
          relator: jurisprudenciaJulgados.relator,
          orgaoJulgador: jurisprudenciaJulgados.orgaoJulgador,
          dataJulgamento: jurisprudenciaJulgados.dataJulgamento,
          ementa: jurisprudenciaJulgados.ementa,
          ementaResumo: jurisprudenciaJulgados.ementaResumo,
          temaId: jurisprudenciaJulgados.temaId,
          teseId: jurisprudenciaJulgados.teseId,
          tags: jurisprudenciaJulgados.tags,
          status: jurisprudenciaJulgados.status,
          isFavorito: jurisprudenciaJulgados.isFavorito,
          citacaoFormatada: jurisprudenciaJulgados.citacaoFormatada,
          driveFileUrl: jurisprudenciaJulgados.driveFileUrl,
          createdAt: jurisprudenciaJulgados.createdAt,
        })
        .from(jurisprudenciaJulgados)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(jurisprudenciaJulgados.dataJulgamento), desc(jurisprudenciaJulgados.createdAt))
        .limit(limit)
        .offset(offset);

      // Contar total
      const [countResult] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(jurisprudenciaJulgados)
        .where(conditions.length > 0 ? and(...conditions) : undefined);

      return {
        julgados,
        total: countResult?.count || 0,
      };
    }),

  /** Busca julgado por ID com detalhes completos */
  getJulgado: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const [julgado] = await db
        .select()
        .from(jurisprudenciaJulgados)
        .where(eq(jurisprudenciaJulgados.id, input.id));

      if (!julgado) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Julgado não encontrado" });
      }

      return julgado;
    }),

  /** Cria julgado */
  createJulgado: protectedProcedure
    .input(z.object({
      tribunal: z.enum(["STF", "STJ", "TJBA", "TRF1", "TRF3", "OUTRO"]),
      tipoDecisao: z.enum(["ACORDAO", "DECISAO_MONOCRATICA", "SUMULA", "SUMULA_VINCULANTE", "REPERCUSSAO_GERAL", "RECURSO_REPETITIVO", "INFORMATIVO", "OUTRO"]),
      numeroProcesso: z.string().optional(),
      numeroRecurso: z.string().optional(),
      relator: z.string().optional(),
      orgaoJulgador: z.string().optional(),
      dataJulgamento: z.string().optional(),
      dataPublicacao: z.string().optional(),
      ementa: z.string().optional(),
      decisao: z.string().optional(),
      votacao: z.string().optional(),
      temaId: z.number().optional(),
      teseId: z.number().optional(),
      tags: z.array(z.string()).optional(),
      driveFileId: z.string().optional(),
      driveFileUrl: z.string().optional(),
      arquivoNome: z.string().optional(),
      fonte: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Gerar citação formatada
      const citacao = gerarCitacaoFormatada(input);

      const [julgado] = await db
        .insert(jurisprudenciaJulgados)
        .values({
          ...input,
          citacaoFormatada: citacao,
          createdById: ctx.user.id,
        })
        .returning();

      // Atualizar contadores
      if (input.temaId) {
        await db
          .update(jurisprudenciaTemas)
          .set({ totalJulgados: sql`${jurisprudenciaTemas.totalJulgados} + 1` })
          .where(eq(jurisprudenciaTemas.id, input.temaId));
      }

      if (input.teseId) {
        await db
          .update(jurisprudenciaTeses)
          .set({ totalJulgados: sql`${jurisprudenciaTeses.totalJulgados} + 1` })
          .where(eq(jurisprudenciaTeses.id, input.teseId));
      }

      return julgado;
    }),

  /** Atualiza julgado */
  updateJulgado: protectedProcedure
    .input(z.object({
      id: z.number(),
      tribunal: z.enum(["STF", "STJ", "TJBA", "TRF1", "TRF3", "OUTRO"]).optional(),
      tipoDecisao: z.enum(["ACORDAO", "DECISAO_MONOCRATICA", "SUMULA", "SUMULA_VINCULANTE", "REPERCUSSAO_GERAL", "RECURSO_REPETITIVO", "INFORMATIVO", "OUTRO"]).optional(),
      numeroProcesso: z.string().optional(),
      relator: z.string().optional(),
      orgaoJulgador: z.string().optional(),
      dataJulgamento: z.string().optional(),
      ementa: z.string().optional(),
      decisao: z.string().optional(),
      temaId: z.number().optional().nullable(),
      teseId: z.number().optional().nullable(),
      tags: z.array(z.string()).optional(),
      isFavorito: z.boolean().optional(),
      observacoes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;

      const [julgado] = await db
        .update(jurisprudenciaJulgados)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(jurisprudenciaJulgados.id, id))
        .returning();

      return julgado;
    }),

  /** Deleta julgado */
  deleteJulgado: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await db.delete(jurisprudenciaJulgados).where(eq(jurisprudenciaJulgados.id, input.id));
      return { success: true };
    }),

  /** Marca/desmarca favorito */
  toggleFavorito: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const [julgado] = await db
        .select({ isFavorito: jurisprudenciaJulgados.isFavorito })
        .from(jurisprudenciaJulgados)
        .where(eq(jurisprudenciaJulgados.id, input.id));

      if (!julgado) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      const [updated] = await db
        .update(jurisprudenciaJulgados)
        .set({ isFavorito: !julgado.isFavorito })
        .where(eq(jurisprudenciaJulgados.id, input.id))
        .returning();

      return updated;
    }),

  /** Processa julgado com IA */
  processarJulgadoIA: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      // Buscar julgado
      const [julgado] = await db
        .select()
        .from(jurisprudenciaJulgados)
        .where(eq(jurisprudenciaJulgados.id, input.id));

      if (!julgado) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      // Marcar como processando
      await db
        .update(jurisprudenciaJulgados)
        .set({ status: "processando" })
        .where(eq(jurisprudenciaJulgados.id, input.id));

      try {
        // Processar com IA
        const resultado = await processJulgadoWithAI(julgado);

        // Atualizar com resultados
        const [updated] = await db
          .update(jurisprudenciaJulgados)
          .set({
            ementaResumo: resultado.resumo,
            iaResumo: resultado.resumo,
            iaPontosChave: resultado.pontosChave,
            iaArgumentos: resultado.argumentos,
            palavrasChave: resultado.palavrasChave,
            embedding: resultado.embedding,
            citacaoFormatada: resultado.citacao || julgado.citacaoFormatada,
            processadoPorIA: true,
            status: "processado",
            updatedAt: new Date(),
          })
          .where(eq(jurisprudenciaJulgados.id, input.id))
          .returning();

        return updated;
      } catch (error) {
        // Marcar erro
        await db
          .update(jurisprudenciaJulgados)
          .set({ status: "erro" })
          .where(eq(jurisprudenciaJulgados.id, input.id));

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "Erro ao processar julgado",
        });
      }
    }),

  // ==========================================
  // BUSCA COM IA
  // ==========================================

  /** Busca semântica com IA */
  searchIA: protectedProcedure
    .input(z.object({
      query: z.string().min(3),
      tribunal: z.enum(["STF", "STJ", "TJBA", "TRF1", "TRF3", "OUTRO"]).optional(),
      temaId: z.number().optional(),
      limit: z.number().default(10),
    }))
    .mutation(async ({ ctx, input }) => {
      const startTime = Date.now();

      // Buscar com IA
      const resultados = await searchJulgadosWithAI(input.query, {
        tribunal: input.tribunal,
        temaId: input.temaId,
        limit: input.limit,
      });

      // Registrar busca
      await db.insert(jurisprudenciaBuscas).values({
        query: input.query,
        tipoQuery: "busca",
        julgadosIds: resultados.map((r) => r.id),
        tempoResposta: Date.now() - startTime,
        totalResultados: resultados.length,
        userId: ctx.user.id,
      });

      return resultados;
    }),

  /** Pergunta à IA sobre jurisprudência */
  askIA: protectedProcedure
    .input(z.object({
      pergunta: z.string().min(10),
      contexto: z.object({
        tribunal: z.enum(["STF", "STJ", "TJBA", "TRF1", "TRF3", "OUTRO"]).optional(),
        temaId: z.number().optional(),
        julgadosIds: z.array(z.number()).optional(),
      }).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const startTime = Date.now();

      // Perguntar à IA
      const resposta = await askJurisprudenciaAI(input.pergunta, input.contexto);

      // Registrar busca
      await db.insert(jurisprudenciaBuscas).values({
        query: input.pergunta,
        tipoQuery: "pergunta",
        resposta: resposta.resposta,
        julgadosIds: resposta.julgadosCitados,
        tempoResposta: Date.now() - startTime,
        totalResultados: resposta.julgadosCitados?.length || 0,
        userId: ctx.user.id,
      });

      return resposta;
    }),

  // ==========================================
  // SINCRONIZAÇÃO COM DRIVE
  // ==========================================

  /** Lista pastas de sincronização */
  listDriveFolders: protectedProcedure.query(async ({ ctx }) => {
    const folders = await db
      .select()
      .from(jurisprudenciaDriveFolders)
      .orderBy(desc(jurisprudenciaDriveFolders.createdAt));

    return folders;
  }),

  /** Adiciona pasta do Drive para sincronização */
  addDriveFolder: protectedProcedure
    .input(z.object({
      folderId: z.string(),
      folderName: z.string().optional(),
      tribunal: z.enum(["STF", "STJ", "TJBA", "TRF1", "TRF3", "OUTRO"]).optional(),
      temaId: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const [folder] = await db
        .insert(jurisprudenciaDriveFolders)
        .values({
          ...input,
          createdById: ctx.user.id,
        })
        .returning();

      return folder;
    }),

  /** Sincroniza pasta do Drive */
  syncDriveFolder: protectedProcedure
    .input(z.object({ folderId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const [folder] = await db
        .select()
        .from(jurisprudenciaDriveFolders)
        .where(eq(jurisprudenciaDriveFolders.id, input.folderId));

      if (!folder) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      // Sincronizar
      const resultado = await syncDriveFolderForJurisprudencia(folder, ctx.user.id);

      // Atualizar status
      await db
        .update(jurisprudenciaDriveFolders)
        .set({
          lastSyncAt: new Date(),
          totalArquivos: resultado.total,
          arquivosSincronizados: resultado.sincronizados,
          updatedAt: new Date(),
        })
        .where(eq(jurisprudenciaDriveFolders.id, input.folderId));

      return resultado;
    }),

  /** Remove pasta de sincronização */
  removeDriveFolder: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await db.delete(jurisprudenciaDriveFolders).where(eq(jurisprudenciaDriveFolders.id, input.id));
      return { success: true };
    }),

  // ==========================================
  // ESTATÍSTICAS
  // ==========================================

  /** Estatísticas gerais */
  stats: protectedProcedure.query(async ({ ctx }) => {
    // Total de julgados
    const [totalJulgados] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(jurisprudenciaJulgados);

    // Por tribunal
    const porTribunal = await db
      .select({
        tribunal: jurisprudenciaJulgados.tribunal,
        count: sql<number>`count(*)::int`,
      })
      .from(jurisprudenciaJulgados)
      .groupBy(jurisprudenciaJulgados.tribunal);

    // Total de temas
    const [totalTemas] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(jurisprudenciaTemas);

    // Total de teses
    const [totalTeses] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(jurisprudenciaTeses);

    // Processados vs pendentes
    const porStatus = await db
      .select({
        status: jurisprudenciaJulgados.status,
        count: sql<number>`count(*)::int`,
      })
      .from(jurisprudenciaJulgados)
      .groupBy(jurisprudenciaJulgados.status);

    // Favoritos
    const [totalFavoritos] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(jurisprudenciaJulgados)
      .where(eq(jurisprudenciaJulgados.isFavorito, true));

    return {
      totalJulgados: totalJulgados?.count || 0,
      totalTemas: totalTemas?.count || 0,
      totalTeses: totalTeses?.count || 0,
      totalFavoritos: totalFavoritos?.count || 0,
      porTribunal,
      porStatus,
    };
  }),

  /** Histórico de buscas */
  historicoBuscas: protectedProcedure
    .input(z.object({ limit: z.number().default(20) }).optional())
    .query(async ({ ctx, input }) => {
      const buscas = await db
        .select()
        .from(jurisprudenciaBuscas)
        .where(eq(jurisprudenciaBuscas.userId, ctx.user.id))
        .orderBy(desc(jurisprudenciaBuscas.createdAt))
        .limit(input?.limit || 20);

      return buscas;
    }),
});

// ==========================================
// HELPERS
// ==========================================

function gerarCitacaoFormatada(julgado: {
  tribunal?: string;
  tipoDecisao?: string;
  numeroProcesso?: string;
  numeroRecurso?: string;
  relator?: string;
  orgaoJulgador?: string;
  dataJulgamento?: string;
}): string {
  const partes: string[] = [];

  if (julgado.tribunal) {
    partes.push(julgado.tribunal);
  }

  if (julgado.tipoDecisao) {
    const tipos: Record<string, string> = {
      ACORDAO: "Acórdão",
      DECISAO_MONOCRATICA: "Decisão Monocrática",
      SUMULA: "Súmula",
      SUMULA_VINCULANTE: "Súmula Vinculante",
      REPERCUSSAO_GERAL: "Tema de Repercussão Geral",
      RECURSO_REPETITIVO: "Recurso Repetitivo",
      INFORMATIVO: "Informativo",
      OUTRO: "",
    };
    if (tipos[julgado.tipoDecisao]) {
      partes.push(tipos[julgado.tipoDecisao]);
    }
  }

  if (julgado.numeroProcesso) {
    partes.push(julgado.numeroProcesso);
  } else if (julgado.numeroRecurso) {
    partes.push(julgado.numeroRecurso);
  }

  if (julgado.relator) {
    partes.push(`Rel. ${julgado.relator}`);
  }

  if (julgado.orgaoJulgador) {
    partes.push(julgado.orgaoJulgador);
  }

  if (julgado.dataJulgamento) {
    const data = new Date(julgado.dataJulgamento);
    partes.push(`j. ${data.toLocaleDateString("pt-BR")}`);
  }

  return partes.join(", ");
}
