/**
 * Intelligence Router — Sistema Nervoso Defensivo
 *
 * Consolida enrichments de multiplos documentos em uma visao
 * sintetica unificada para cada assistido/processo.
 *
 * Core consolidation logic lives in @/lib/services/intelligence-consolidation.
 */

import { z } from "zod";
import { router, protectedProcedure } from "../init";
import { db } from "@/lib/db";
import {
  assistidos,
  processos,
  documentos,
  caseFacts,
  casePersonas,
  driveFiles,
  crossAnalyses,
  assistidosProcessos,
} from "@/lib/db/schema";
import { eq, and, sql, desc, count, isNotNull, inArray } from "drizzle-orm";
import { enrichmentClient } from "@/lib/services/enrichment-client";

// ─────────────────────────────────────────────────────────────
// Router
// ─────────────────────────────────────────────────────────────

export const intelligenceRouter = router({
  /**
   * Get analysis data for an assistido.
   * Returns analysisData + case_facts + case_personas.
   */
  getForAssistido: protectedProcedure
    .input(z.object({ assistidoId: z.number() }))
    .query(async ({ input }) => {
      const [assistido] = await db
        .select({
          analysisStatus: assistidos.analysisStatus,
          analysisData: assistidos.analysisData,
          analyzedAt: assistidos.analyzedAt,
          analysisVersion: assistidos.analysisVersion,
        })
        .from(assistidos)
        .where(eq(assistidos.id, input.assistidoId))
        .limit(1);

      if (!assistido) {
        return { found: false, analysis: null, facts: [], personas: [] };
      }

      // Derive casoIds via assistidos_processos → processos.casoId
      const linkedCasoIds = await db
        .selectDistinct({ casoId: processos.casoId })
        .from(assistidosProcessos)
        .innerJoin(processos, eq(processos.id, assistidosProcessos.processoId))
        .where(and(
          eq(assistidosProcessos.assistidoId, input.assistidoId),
          isNotNull(processos.casoId),
        ));

      // Fetch case_facts and case_personas for linked casos
      let facts: (typeof caseFacts.$inferSelect)[] = [];
      let personas: (typeof casePersonas.$inferSelect)[] = [];

      const casoIds = linkedCasoIds.map(r => r.casoId).filter((id): id is number => id !== null);
      if (casoIds.length > 0) {
        facts = await db
          .select()
          .from(caseFacts)
          .where(inArray(caseFacts.casoId, casoIds))
          .orderBy(caseFacts.dataFato);

        personas = await db
          .select()
          .from(casePersonas)
          .where(inArray(casePersonas.casoId, casoIds));
      }

      return {
        found: true,
        analysis: {
          status: assistido.analysisStatus,
          data: assistido.analysisData,
          analyzedAt: assistido.analyzedAt,
          version: assistido.analysisVersion,
        },
        facts,
        personas,
      };
    }),

  /**
   * Get analysis data for a processo.
   */
  getForProcesso: protectedProcedure
    .input(z.object({ processoId: z.number() }))
    .query(async ({ input }) => {
      const [processo] = await db
        .select({
          analysisStatus: processos.analysisStatus,
          analysisData: processos.analysisData,
          analyzedAt: processos.analyzedAt,
          analysisVersion: processos.analysisVersion,
          casoId: processos.casoId,
          assistidoId: processos.assistidoId,
        })
        .from(processos)
        .where(eq(processos.id, input.processoId))
        .limit(1);

      if (!processo) {
        return { found: false, analysis: null, facts: [], personas: [] };
      }

      let facts: (typeof caseFacts.$inferSelect)[] = [];
      let personas: (typeof casePersonas.$inferSelect)[] = [];

      if (processo.casoId) {
        facts = await db
          .select()
          .from(caseFacts)
          .where(
            and(
              eq(caseFacts.casoId, processo.casoId),
            ),
          )
          .orderBy(caseFacts.dataFato);

        personas = await db
          .select()
          .from(casePersonas)
          .where(eq(casePersonas.casoId, processo.casoId));
      }

      return {
        found: true,
        analysis: {
          status: processo.analysisStatus,
          data: processo.analysisData,
          analyzedAt: processo.analyzedAt,
          version: processo.analysisVersion,
        },
        facts,
        personas,
      };
    }),

  /**
   * Get pending enrichment counts for badge display.
   */
  getPendingEnrichments: protectedProcedure
    .input(
      z.object({
        assistidoId: z.number().optional(),
        processoId: z.number().optional(),
      }),
    )
    .query(async ({ input }) => {
      const conditions = [];

      if (input.assistidoId) {
        // Consolidated: 3 parallel queries instead of 6 sequential
        const [docCountsResult, driveCountsResult, [assistido]] = await Promise.all([
          // 1) Doc counts: total + enriched in one query
          db
            .select({
              total: count(),
              enriched: sql<number>`count(*) filter (where ${documentos.enrichmentStatus} = 'enriched')`,
            })
            .from(documentos)
            .where(eq(documentos.assistidoId, input.assistidoId)),
          // 2) Drive file counts: total + completed in one query
          db
            .select({
              total: count(),
              enriched: sql<number>`count(*) filter (where ${driveFiles.enrichmentStatus} = 'completed')`,
            })
            .from(driveFiles)
            .where(
              and(
                eq(driveFiles.assistidoId, input.assistidoId),
                eq(driveFiles.isFolder, false),
              ),
            ),
          // 3) Assistido analysis metadata
          db
            .select({
              analyzedAt: assistidos.analyzedAt,
              analysisStatus: assistidos.analysisStatus,
            })
            .from(assistidos)
            .where(eq(assistidos.id, input.assistidoId))
            .limit(1),
        ]);

        const docCounts = docCountsResult[0] ?? { total: 0, enriched: 0 };
        const driveCounts = driveCountsResult[0] ?? { total: 0, enriched: 0 };

        // Pending count: enriched since last analysis
        let pendingCount = 0;
        if (assistido?.analyzedAt) {
          const [pending] = await db
            .select({
              count: sql<number>`(
                select count(*) from ${documentos}
                where ${documentos.assistidoId} = ${input.assistidoId}
                  and ${documentos.enrichmentStatus} = 'enriched'
                  and ${documentos.enrichedAt} > ${assistido.analyzedAt}
              ) + (
                select count(*) from ${driveFiles}
                where ${driveFiles.assistidoId} = ${input.assistidoId}
                  and ${driveFiles.enrichmentStatus} = 'completed'
                  and ${driveFiles.isFolder} = false
                  and ${driveFiles.enrichedAt} > ${assistido.analyzedAt}
              )`,
            })
            .from(sql`(select 1) as _`);
          pendingCount = pending?.count || 0;
        } else {
          pendingCount = Number(docCounts.enriched) + Number(driveCounts.enriched);
        }

        return {
          enrichedDocs: Number(docCounts.enriched) + Number(driveCounts.enriched),
          totalDocs: Number(docCounts.total) + Number(driveCounts.total),
          driveFiles: Number(driveCounts.total),
          driveEnriched: Number(driveCounts.enriched),
          lastConsolidation: assistido?.analyzedAt || null,
          analysisStatus: assistido?.analysisStatus || null,
          pendingCount,
        };
      }

      if (input.processoId) {
        // Consolidated: 5 parallel queries instead of 5 sequential
        const [enrichedDocsResult, totalDocsResult, driveEnrichedResult, driveTotalResult, [processo]] = await Promise.all([
          db
            .select({ count: count() })
            .from(documentos)
            .where(
              and(
                eq(documentos.processoId, input.processoId),
                eq(documentos.enrichmentStatus, "enriched"),
              ),
            ),
          db
            .select({ count: count() })
            .from(documentos)
            .where(eq(documentos.processoId, input.processoId)),
          db
            .select({ count: count() })
            .from(driveFiles)
            .where(
              and(
                eq(driveFiles.processoId, input.processoId),
                eq(driveFiles.enrichmentStatus, "completed"),
                eq(driveFiles.isFolder, false),
              ),
            ),
          db
            .select({ count: count() })
            .from(driveFiles)
            .where(
              and(
                eq(driveFiles.processoId, input.processoId),
                eq(driveFiles.isFolder, false),
              ),
            ),
          db
            .select({
              analyzedAt: processos.analyzedAt,
              analysisStatus: processos.analysisStatus,
            })
            .from(processos)
            .where(eq(processos.id, input.processoId))
            .limit(1),
        ]);

        const [enrichedDocs] = enrichedDocsResult;
        const [totalDocs] = totalDocsResult;
        const [driveEnriched] = driveEnrichedResult;
        const [driveTotal] = driveTotalResult;

        let pendingCount = 0;
        if (processo?.analyzedAt) {
          const [pendingDocsResult, pendingDriveResult] = await Promise.all([
            db
              .select({ count: count() })
              .from(documentos)
              .where(
                and(
                  eq(documentos.processoId, input.processoId),
                  eq(documentos.enrichmentStatus, "enriched"),
                  sql`${documentos.enrichedAt} > ${processo.analyzedAt}`,
                ),
              ),
            db
              .select({ count: count() })
              .from(driveFiles)
              .where(
                and(
                  eq(driveFiles.processoId, input.processoId),
                  eq(driveFiles.enrichmentStatus, "completed"),
                  eq(driveFiles.isFolder, false),
                  sql`${driveFiles.enrichedAt} > ${processo.analyzedAt}`,
                ),
              ),
          ]);
          const [pendingDocs] = pendingDocsResult;
          const [pendingDrive] = pendingDriveResult;
          pendingCount = (pendingDocs?.count || 0) + (pendingDrive?.count || 0);
        } else {
          pendingCount = (enrichedDocs?.count || 0) + (driveEnriched?.count || 0);
        }

        return {
          enrichedDocs: (enrichedDocs?.count || 0) + (driveEnriched?.count || 0),
          totalDocs: (totalDocs?.count || 0) + (driveTotal?.count || 0),
          driveFiles: driveTotal?.count || 0,
          driveEnriched: driveEnriched?.count || 0,
          lastConsolidation: processo?.analyzedAt || null,
          analysisStatus: processo?.analysisStatus || null,
          pendingCount,
        };
      }

      return {
        enrichedDocs: 0,
        totalDocs: 0,
        driveFiles: 0,
        driveEnriched: 0,
        lastConsolidation: null,
        analysisStatus: null,
        pendingCount: 0,
      };
    }),

  /**
   * Generate/regenerate analysis for an assistido.
   * Delegates to the intelligence-consolidation service.
   */
  generateForAssistido: protectedProcedure
    .input(z.object({ assistidoId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const { consolidateForAssistido } = await import("@/lib/services/intelligence-consolidation");
      return consolidateForAssistido(input.assistidoId, ctx.user.id.toString());
    }),

  /**
   * Generate/regenerate analysis for a processo.
   * Delegates to the intelligence-consolidation service.
   */
  generateForProcesso: protectedProcedure
    .input(z.object({ processoId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const { consolidateForProcesso } = await import("@/lib/services/intelligence-consolidation");
      return consolidateForProcesso(input.processoId, ctx.user.id.toString());
    }),

  // ─────────────────────────────────────────────────────────────
  // Cross-Analysis — Análise Cruzada de Depoimentos
  // ─────────────────────────────────────────────────────────────

  getCrossAnalysis: protectedProcedure
    .input(z.object({ assistidoId: z.number() }))
    .query(async ({ input }) => {
      const { assistidoId } = input;

      const [result] = await db
        .select()
        .from(crossAnalyses)
        .where(eq(crossAnalyses.assistidoId, assistidoId))
        .orderBy(desc(crossAnalyses.updatedAt))
        .limit(1);

      if (!result) {
        return { found: false, data: null };
      }

      return {
        found: true,
        data: {
          id: result.id,
          contradictionMatrix: result.contradictionMatrix ?? [],
          teseConsolidada: result.teseConsolidada ?? {},
          timelineFatos: result.timelineFatos ?? [],
          mapaAtores: result.mapaAtores ?? [],
          providenciasAgregadas: result.providenciasAgregadas ?? [],
          sourceFileIds: result.sourceFileIds ?? [],
          analysisCount: result.analysisCount,
          modelVersion: result.modelVersion,
          updatedAt: result.updatedAt,
        },
      };
    }),

  regenerateCrossAnalysis: protectedProcedure
    .input(z.object({ assistidoId: z.number() }))
    .mutation(async ({ input }) => {
      const { assistidoId } = input;

      // Get assistido name
      const [assistido] = await db
        .select({ nome: assistidos.nome })
        .from(assistidos)
        .where(eq(assistidos.id, assistidoId))
        .limit(1);

      if (!assistido) {
        return { success: false, error: "Assistido não encontrado" };
      }

      // Get all drive_files with Sonnet analysis for this assistido
      const files = await db
        .select({
          id: driveFiles.id,
          name: driveFiles.name,
          enrichmentData: driveFiles.enrichmentData,
        })
        .from(driveFiles)
        .where(
          and(
            eq(driveFiles.assistidoId, assistidoId),
            eq(driveFiles.enrichmentStatus, "completed"),
          ),
        );

      // Filter files that have analysis
      const analyzedFiles = files.filter((f) => {
        const ed = f.enrichmentData as Record<string, unknown> | null;
        return ed?.analysis && typeof ed.analysis === "object";
      });

      if (analyzedFiles.length < 2) {
        return {
          success: false,
          error: `Necessário pelo menos 2 análises individuais. Encontradas: ${analyzedFiles.length}`,
        };
      }

      // Fire cross-analysis async
      try {
        await enrichmentClient.crossAnalyzeAsync({
          assistidoId,
          assistidoNome: assistido.nome,
          analyses: analyzedFiles.map((f) => {
            const ed = f.enrichmentData as Record<string, unknown>;
            const analysis = ed.analysis as Record<string, unknown>;
            const depoente = analysis.depoente as Record<string, unknown> | undefined;
            const classificacoes = (depoente?.classificacoes as string[]) ?? [];
            return {
              fileId: f.id,
              fileName: f.name,
              depoente: classificacoes.join(", ") || (depoente?.nome as string) || "",
              analysis,
            };
          }),
        });

        return {
          success: true,
          message: `Cross-analysis de ${analyzedFiles.length} depoimentos iniciada`,
          analysisCount: analyzedFiles.length,
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        console.error(`[Intelligence] Cross-analysis failed for assistido ${assistidoId}:`, message);
        return { success: false, error: message };
      }
    }),
});

export type IntelligenceRouter = typeof intelligenceRouter;
