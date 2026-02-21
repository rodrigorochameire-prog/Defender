/**
 * Router tRPC para Enrichment Engine (Sistema Nervoso Defensivo)
 *
 * Permite enriquecer on-demand:
 * - Documentos do Drive (PDF, DOCX)
 * - Texto PJe (intimações copy-paste)
 * - Transcrições de atendimento
 * - Pautas de audiência
 * - Mensagens WhatsApp
 *
 * Também expõe: health check, status de enrichment por entidade,
 * e retry de documentos com falha.
 */

import { z } from "zod";
import { router, protectedProcedure, adminProcedure } from "../init";
import { db } from "@/lib/db";
import { documentos, atendimentos, demandas, driveFiles } from "@/lib/db/schema";
import { eq, and, isNull, sql } from "drizzle-orm";
import {
  enrichmentClient,
  type EnrichDocumentOutput,
  type EnrichPjeOutput,
  type EnrichTranscriptOutput,
  type EnrichAudienciaOutput,
} from "@/lib/services/enrichment-client";

// ==========================================
// SCHEMAS DE INPUT
// ==========================================

const enrichDocumentInputSchema = z.object({
  documentoId: z.number(),
});

const enrichPjeTextInputSchema = z.object({
  rawText: z.string().min(10, "Texto PJe muito curto"),
});

const enrichTranscriptInputSchema = z.object({
  atendimentoId: z.number(),
  context: z.string().optional(),
});

const enrichAudienciaInputSchema = z.object({
  pautaText: z.string().min(10, "Pauta muito curta"),
});

const enrichmentStatusInputSchema = z.object({
  entityType: z.enum(["documento", "atendimento"]),
  entityId: z.number(),
});

const retryEnrichmentInputSchema = z.object({
  entityType: z.enum(["documento", "atendimento"]),
  entityId: z.number(),
});

// ==========================================
// ROUTER
// ==========================================

export const enrichmentRouter = router({
  /**
   * Verifica saúde do Enrichment Engine (Railway)
   */
  healthCheck: protectedProcedure.query(async () => {
    try {
      const health = await enrichmentClient.healthCheck();
      return {
        available: health.status === "healthy" || health.status === "ok",
        details: health,
      };
    } catch (error) {
      return {
        available: false,
        error: error instanceof Error ? error.message : "Enrichment Engine indisponível",
        details: null,
      };
    }
  }),

  /**
   * Enriquecer um documento on-demand
   * Busca o documento no banco, baixa do Drive e envia para o Engine
   */
  enrichDocument: protectedProcedure
    .input(enrichDocumentInputSchema)
    .mutation(async ({ input, ctx }) => {
      const { documentoId } = input;

      // 1. Buscar documento no banco
      const [doc] = await db
        .select()
        .from(documentos)
        .where(eq(documentos.id, documentoId))
        .limit(1);

      if (!doc) {
        return { success: false, error: "Documento não encontrado" };
      }

      // 2. Verificar se já está sendo processado
      if (doc.enrichmentStatus === "processing") {
        return { success: false, error: "Documento já está sendo processado" };
      }

      // 3. Marcar como processing
      await db
        .update(documentos)
        .set({ enrichmentStatus: "processing" })
        .where(eq(documentos.id, documentoId));

      // 4. Chamar Enrichment Engine
      try {
        const result = await enrichmentClient.enrichDocument({
          fileUrl: doc.fileUrl,
          mimeType: doc.mimeType || "application/pdf",
          assistidoId: doc.assistidoId,
          processoId: doc.processoId,
          casoId: doc.casoId,
          defensorId: ctx.user.id.toString(),
        });

        // 5. Salvar resultado
        await db
          .update(documentos)
          .set({
            enrichmentStatus: "enriched",
            enrichmentData: {
              document_type: result.document_type,
              extracted_data: result.extracted_data,
              confidence: result.confidence,
              markdown_preview: result.markdown_preview,
            },
            enrichedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(documentos.id, documentoId));

        return {
          success: true,
          data: result,
        };
      } catch (error) {
        // Marcar como failed
        await db
          .update(documentos)
          .set({
            enrichmentStatus: "failed",
            enrichmentData: {
              extracted_data: {
                error: error instanceof Error ? error.message : "Unknown error",
              },
            },
            updatedAt: new Date(),
          })
          .where(eq(documentos.id, documentoId));

        return {
          success: false,
          error: error instanceof Error ? error.message : "Erro no enriquecimento",
        };
      }
    }),

  /**
   * Enriquecer texto PJe (extração profunda de intimações)
   * Retorna dados estruturados sem salvar — o frontend decide o que fazer
   */
  enrichPjeText: protectedProcedure
    .input(enrichPjeTextInputSchema)
    .mutation(async ({ input, ctx }) => {
      try {
        const result = await enrichmentClient.enrichPjeText({
          rawText: input.rawText,
          defensorId: ctx.user.id.toString(),
        });

        return {
          success: true,
          data: result,
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : "Erro na extração PJe",
          data: null,
        };
      }
    }),

  /**
   * Enriquecer transcrição de um atendimento
   */
  enrichTranscript: protectedProcedure
    .input(enrichTranscriptInputSchema)
    .mutation(async ({ input, ctx }) => {
      const { atendimentoId, context } = input;

      // 1. Buscar atendimento
      const [atendimento] = await db
        .select()
        .from(atendimentos)
        .where(eq(atendimentos.id, atendimentoId))
        .limit(1);

      if (!atendimento) {
        return { success: false, error: "Atendimento não encontrado" };
      }

      // 2. Verificar se tem transcrição
      const transcricao = atendimento.transcricao || atendimento.resumo;
      if (!transcricao) {
        return { success: false, error: "Atendimento não possui transcrição" };
      }

      // 3. Verificar se já está sendo processado
      if (atendimento.enrichmentStatus === "processing") {
        return { success: false, error: "Atendimento já está sendo processado" };
      }

      // 4. Marcar como processing
      await db
        .update(atendimentos)
        .set({ enrichmentStatus: "processing" })
        .where(eq(atendimentos.id, atendimentoId));

      // 5. Chamar Enrichment Engine
      try {
        const result = await enrichmentClient.enrichTranscript({
          transcript: transcricao,
          assistidoId: atendimento.assistidoId,
          processoId: atendimento.processoId,
          casoId: atendimento.casoId,
          context: context || null,
        });

        // 6. Salvar resultado
        await db
          .update(atendimentos)
          .set({
            enrichmentStatus: "enriched",
            enrichmentData: {
              key_points: result.key_points,
              facts: result.facts,
              persons_mentioned: result.persons_mentioned,
              contradictions: result.contradictions,
              suggested_actions: result.suggested_actions,
              urgency_level: result.urgency_level,
            },
            enrichedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(atendimentos.id, atendimentoId));

        return {
          success: true,
          data: result,
        };
      } catch (error) {
        await db
          .update(atendimentos)
          .set({
            enrichmentStatus: "failed",
            enrichmentData: {
              key_points: [],
              facts: [],
              persons_mentioned: [],
              contradictions: [],
              suggested_actions: [],
              urgency_level: "low" as const,
              error: error instanceof Error ? error.message : "Unknown error",
            },
            updatedAt: new Date(),
          })
          .where(eq(atendimentos.id, atendimentoId));

        return {
          success: false,
          error: error instanceof Error ? error.message : "Erro no enriquecimento",
        };
      }
    }),

  /**
   * Enriquecer pauta de audiência
   * Retorna audiências parseadas — frontend decide como importar
   */
  enrichAudiencia: protectedProcedure
    .input(enrichAudienciaInputSchema)
    .mutation(async ({ input, ctx }) => {
      try {
        const result = await enrichmentClient.enrichAudiencia({
          pautaText: input.pautaText,
          defensorId: ctx.user.id.toString(),
        });

        return {
          success: true,
          data: result,
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : "Erro na extração de audiências",
          data: null,
        };
      }
    }),

  /**
   * Consultar status de enrichment de uma entidade
   */
  getStatus: protectedProcedure
    .input(enrichmentStatusInputSchema)
    .query(async ({ input }) => {
      const { entityType, entityId } = input;

      if (entityType === "documento") {
        const [doc] = await db
          .select({
            enrichmentStatus: documentos.enrichmentStatus,
            enrichmentData: documentos.enrichmentData,
            enrichedAt: documentos.enrichedAt,
          })
          .from(documentos)
          .where(eq(documentos.id, entityId))
          .limit(1);

        if (!doc) {
          return { found: false, status: null, data: null, enrichedAt: null };
        }

        return {
          found: true,
          status: doc.enrichmentStatus || "not_enriched",
          data: doc.enrichmentData,
          enrichedAt: doc.enrichedAt,
        };
      }

      if (entityType === "atendimento") {
        const [atend] = await db
          .select({
            enrichmentStatus: atendimentos.enrichmentStatus,
            enrichmentData: atendimentos.enrichmentData,
            enrichedAt: atendimentos.enrichedAt,
          })
          .from(atendimentos)
          .where(eq(atendimentos.id, entityId))
          .limit(1);

        if (!atend) {
          return { found: false, status: null, data: null, enrichedAt: null };
        }

        return {
          found: true,
          status: atend.enrichmentStatus || "not_enriched",
          data: atend.enrichmentData,
          enrichedAt: atend.enrichedAt,
        };
      }

      return { found: false, status: null, data: null, enrichedAt: null };
    }),

  /**
   * Retry enrichment de uma entidade com falha
   */
  retry: protectedProcedure
    .input(retryEnrichmentInputSchema)
    .mutation(async ({ input, ctx }) => {
      const { entityType, entityId } = input;

      if (entityType === "documento") {
        // Reset status
        await db
          .update(documentos)
          .set({ enrichmentStatus: "pending", updatedAt: new Date() })
          .where(
            and(
              eq(documentos.id, entityId),
              eq(documentos.enrichmentStatus, "failed"),
            ),
          );

        // Re-trigger (reusa a mutation enrichDocument internamente)
        const [doc] = await db
          .select()
          .from(documentos)
          .where(eq(documentos.id, entityId))
          .limit(1);

        if (!doc) {
          return { success: false, error: "Documento não encontrado" };
        }

        // Marcar como processing
        await db
          .update(documentos)
          .set({ enrichmentStatus: "processing" })
          .where(eq(documentos.id, entityId));

        try {
          const result = await enrichmentClient.enrichDocument({
            fileUrl: doc.fileUrl,
            mimeType: doc.mimeType || "application/pdf",
            assistidoId: doc.assistidoId,
            processoId: doc.processoId,
            casoId: doc.casoId,
            defensorId: ctx.user.id.toString(),
          });

          await db
            .update(documentos)
            .set({
              enrichmentStatus: "enriched",
              enrichmentData: {
                document_type: result.document_type,
                extracted_data: result.extracted_data,
                confidence: result.confidence,
                markdown_preview: result.markdown_preview,
              },
              enrichedAt: new Date(),
              updatedAt: new Date(),
            })
            .where(eq(documentos.id, entityId));

          return { success: true };
        } catch (error) {
          await db
            .update(documentos)
            .set({
              enrichmentStatus: "failed",
              updatedAt: new Date(),
            })
            .where(eq(documentos.id, entityId));

          return {
            success: false,
            error: error instanceof Error ? error.message : "Erro no retry",
          };
        }
      }

      if (entityType === "atendimento") {
        // Reset status
        await db
          .update(atendimentos)
          .set({ enrichmentStatus: "pending", updatedAt: new Date() })
          .where(
            and(
              eq(atendimentos.id, entityId),
              eq(atendimentos.enrichmentStatus, "failed"),
            ),
          );

        return { success: true, message: "Status resetado. Use enrichTranscript para re-processar." };
      }

      return { success: false, error: "Tipo de entidade não suportado" };
    }),

  /**
   * Dashboard de enrichment — estatísticas (admin only)
   */
  stats: adminProcedure.query(async () => {
    // Contar documentos por status
    const docStats = await db
      .select({
        status: documentos.enrichmentStatus,
        count: sql<number>`count(*)::int`,
      })
      .from(documentos)
      .groupBy(documentos.enrichmentStatus);

    // Contar atendimentos por status
    const atendStats = await db
      .select({
        status: atendimentos.enrichmentStatus,
        count: sql<number>`count(*)::int`,
      })
      .from(atendimentos)
      .groupBy(atendimentos.enrichmentStatus);

    // Formatar
    const formatStats = (rows: { status: string | null; count: number }[]) => {
      const result: Record<string, number> = {
        not_enriched: 0,
        pending: 0,
        processing: 0,
        enriched: 0,
        failed: 0,
      };

      for (const row of rows) {
        if (row.status === null) {
          result.not_enriched = row.count;
        } else {
          result[row.status] = row.count;
        }
      }

      return result;
    };

    return {
      documentos: formatStats(docStats),
      atendimentos: formatStats(atendStats),
    };
  }),
});

export type EnrichmentRouter = typeof enrichmentRouter;
