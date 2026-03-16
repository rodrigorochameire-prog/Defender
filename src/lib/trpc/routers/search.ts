import { z } from "zod";
import { router, protectedProcedure } from "../init";
import { enrichmentClient } from "@/lib/services/enrichment-client";
import { db } from "@/lib/db";
import { assistidos, processos, demandas, driveFiles, documentEmbeddings } from "@/lib/db/schema";
import { eq, ilike, or, sql } from "drizzle-orm";

export const searchRouter = router({
  /**
   * Busca semântica via pgvector (enrichment engine) — embeddings table (Gemini 768d)
   */
  semantic: protectedProcedure
    .input(
      z.object({
        query: z.string().min(2).max(1000),
        filters: z
          .object({
            assistidoId: z.number().optional(),
            processoId: z.number().optional(),
            entityTypes: z.array(z.string()).optional(),
          })
          .optional(),
        limit: z.number().min(1).max(100).default(20),
      })
    )
    .query(async ({ input }) => {
      try {
        const result = await enrichmentClient.semanticSearch({
          query: input.query,
          filters: {
            assistido_id: input.filters?.assistidoId,
            processo_id: input.filters?.processoId,
            entity_types: input.filters?.entityTypes,
          },
          limit: input.limit,
        });

        return {
          results: result.results,
          total: result.total,
          query: result.query,
        };
      } catch (error) {
        // Fallback: se enrichment engine offline, retornar vazio
        console.error("[search.semantic] Enrichment engine error:", error);
        return { results: [], total: 0, query: input.query };
      }
    }),

  /**
   * Busca hibrida em document_embeddings (OpenAI 1536d + pg_trgm)
   * Retorna chunks de documentos com score combinado semantico + texto
   */
  documentSearch: protectedProcedure
    .input(
      z.object({
        query: z.string().min(2).max(1000),
        assistidoId: z.number().optional(),
        threshold: z.number().min(0).max(1).default(0.3),
        limit: z.number().min(1).max(50).default(20),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const result = await enrichmentClient.documentSearch({
          query: input.query,
          assistidoId: input.assistidoId,
          threshold: input.threshold,
          limit: input.limit,
        });

        // Enrich results with file and assistido names
        if (result.results.length > 0) {
          const fileIds = [...new Set(result.results.map((r) => r.file_id))];
          const files = await db
            .select({
              id: driveFiles.id,
              name: driveFiles.name,
              assistidoId: driveFiles.assistidoId,
            })
            .from(driveFiles)
            .where(
              or(...fileIds.map((fid) => eq(driveFiles.id, fid)))
            );

          const fileMap = new Map(files.map((f) => [f.id, f]));

          const assistidoIds = [
            ...new Set(
              result.results
                .map((r) => r.assistido_id)
                .filter((id): id is number => id !== null)
            ),
          ];

          let assistidoMap = new Map<number, string>();
          if (assistidoIds.length > 0) {
            const assistidoRows = await db
              .select({ id: assistidos.id, nome: assistidos.nome })
              .from(assistidos)
              .where(
                or(...assistidoIds.map((aid) => eq(assistidos.id, aid)))
              );
            assistidoMap = new Map(assistidoRows.map((a) => [a.id, a.nome]));
          }

          return {
            results: result.results.map((r) => ({
              ...r,
              fileName: fileMap.get(r.file_id)?.name ?? null,
              assistidoNome: r.assistido_id
                ? assistidoMap.get(r.assistido_id) ?? null
                : null,
            })),
            count: result.count,
          };
        }

        return { results: [], count: 0 };
      } catch (error) {
        console.error("[search.documentSearch] Error:", error);
        return { results: [], count: 0 };
      }
    }),

  /**
   * Verificar status de embedding de um arquivo
   */
  embedStatus: protectedProcedure
    .input(z.object({ fileId: z.number() }))
    .query(async ({ input }) => {
      try {
        const rows = await db
          .select({ count: sql<number>`count(*)::int` })
          .from(documentEmbeddings)
          .where(eq(documentEmbeddings.fileId, input.fileId));
        const count = rows[0]?.count ?? 0;
        return { hasEmbeddings: count > 0, chunkCount: count };
      } catch {
        return { hasEmbeddings: false, chunkCount: 0 };
      }
    }),

  /**
   * Disparar indexacao de um arquivo (background)
   */
  embedFile: protectedProcedure
    .input(
      z.object({
        fileId: z.number(),
        assistidoId: z.number().optional(),
      })
    )
    .mutation(async ({ input }) => {
      // Get file content
      const [file] = await db
        .select()
        .from(driveFiles)
        .where(eq(driveFiles.id, input.fileId));

      if (!file) throw new Error("Arquivo nao encontrado");

      const enrichment = (file.enrichmentData || {}) as Record<string, unknown>;
      const text =
        (enrichment.transcription as string) ||
        (enrichment.transcript as string) ||
        (enrichment.transcript_plain as string) ||
        (enrichment.markdown_content as string) ||
        "";

      if (!text || text.length < 50) {
        throw new Error("Nenhum conteudo para indexar (texto muito curto ou ausente)");
      }

      return enrichmentClient.embedDocument({
        fileId: input.fileId,
        assistidoId: input.assistidoId ?? file.assistidoId ?? undefined,
        text,
        metadata: { fileName: file.name },
      });
    }),

  /**
   * Busca local rápida (DB direta) — processos, assistidos, demandas
   */
  local: protectedProcedure
    .input(
      z.object({
        query: z.string().min(2).max(200),
        limit: z.number().min(1).max(50).default(20),
      })
    )
    .query(async ({ input }) => {
      const term = `%${input.query}%`;

      // Buscar assistidos por nome ou CPF
      const matchingAssistidos = await db
        .select({
          id: assistidos.id,
          nome: assistidos.nome,
          cpf: assistidos.cpf,
          driveFolderId: assistidos.driveFolderId,
          atribuicao: assistidos.atribuicaoPrimaria,
          statusPrisional: assistidos.statusPrisional,
        })
        .from(assistidos)
        .where(
          or(
            ilike(assistidos.nome, term),
            ilike(assistidos.cpf, term)
          )
        )
        .limit(input.limit);

      // Buscar processos por número, classe processual ou vara
      const matchingProcessos = await db
        .select({
          id: processos.id,
          numeroAutos: processos.numeroAutos,
          classeProcessual: processos.classeProcessual,
          vara: processos.vara,
          assistidoId: processos.assistidoId,
        })
        .from(processos)
        .where(
          or(
            ilike(processos.numeroAutos, term),
            ilike(processos.classeProcessual, term),
            ilike(processos.vara, term)
          )
        )
        .limit(input.limit);

      // Buscar demandas por ato ou tipo de ato
      const matchingDemandas = await db
        .select({
          id: demandas.id,
          ato: demandas.ato,
          status: demandas.status,
          prioridade: demandas.prioridade,
          tipoAto: demandas.tipoAto,
          prazo: demandas.prazo,
          assistidoId: demandas.assistidoId,
          createdAt: demandas.createdAt,
        })
        .from(demandas)
        .where(
          or(
            ilike(demandas.ato, term),
            ilike(demandas.tipoAto, term)
          )
        )
        .limit(input.limit);

      return {
        assistidos: matchingAssistidos,
        processos: matchingProcessos,
        demandas: matchingDemandas,
      };
    }),
});
