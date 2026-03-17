/**
 * Intelligence Router — Sistema Nervoso Defensivo
 *
 * Consolida enrichments de multiplos documentos em uma visao
 * sintetica unificada para cada assistido/processo.
 */

import { z } from "zod";
import { router, protectedProcedure } from "../init";
import { db } from "@/lib/db";
import {
  assistidos,
  processos,
  documentos,
  atendimentos,
  demandas,
  caseFacts,
  casePersonas,
  casos,
  driveFiles,
  crossAnalyses,
} from "@/lib/db/schema";
import { eq, and, or, isNotNull, sql, desc, count, gt } from "drizzle-orm";
import { enrichmentClient } from "@/lib/services/enrichment-client";
import type {
  ConsolidationPessoa,
  ConsolidationEvento,
  ConsolidationNulidade,
  ConsolidationTese,
} from "@/lib/services/enrichment-client";

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

function normalizeName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");
}

/**
 * Dedup personas by normalized name. When duplicates found,
 * keep the one with higher confidence and merge document refs.
 */
function deduplicatePersonas(
  personas: ConsolidationPessoa[],
): ConsolidationPessoa[] {
  const map = new Map<string, ConsolidationPessoa>();

  for (const p of personas) {
    const key = normalizeName(p.nome);
    const existing = map.get(key);
    if (!existing) {
      map.set(key, { ...p });
    } else {
      // Merge: keep higher confidence, merge doc refs
      if (p.confidence > existing.confidence) {
        existing.tipo = p.tipo;
        existing.descricao = p.descricao || existing.descricao;
        existing.relevancia_defesa =
          p.relevancia_defesa || existing.relevancia_defesa;
        existing.confidence = p.confidence;
      }
      const existingRefs = new Set(existing.documentos_ref);
      for (const ref of p.documentos_ref) {
        existingRefs.add(ref);
      }
      existing.documentos_ref = [...existingRefs];
    }
  }

  return [...map.values()];
}

/**
 * Ensure assistido has a caso — create one if missing.
 * Returns the casoId.
 */
async function ensureCaso(
  assistidoId: number,
  userId: string,
): Promise<number> {
  const [assistido] = await db
    .select({ casoId: assistidos.casoId, nome: assistidos.nome })
    .from(assistidos)
    .where(eq(assistidos.id, assistidoId))
    .limit(1);

  if (assistido?.casoId) return assistido.casoId;

  // Create a caso for this assistido
  const [newCaso] = await db
    .insert(casos)
    .values({
      titulo: `Caso — ${assistido?.nome || "Assistido #" + assistidoId}`,
      status: "ativo",
      defensorId: parseInt(userId),
    })
    .returning({ id: casos.id });

  // Link assistido to caso
  await db
    .update(assistidos)
    .set({ casoId: newCaso.id })
    .where(eq(assistidos.id, assistidoId));

  return newCaso.id;
}

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
          casoId: assistidos.casoId,
        })
        .from(assistidos)
        .where(eq(assistidos.id, input.assistidoId))
        .limit(1);

      if (!assistido) {
        return { found: false, analysis: null, facts: [], personas: [] };
      }

      // Fetch case_facts and case_personas for this assistido
      let facts: (typeof caseFacts.$inferSelect)[] = [];
      let personas: (typeof casePersonas.$inferSelect)[] = [];

      if (assistido.casoId) {
        facts = await db
          .select()
          .from(caseFacts)
          .where(eq(caseFacts.casoId, assistido.casoId))
          .orderBy(caseFacts.dataFato);

        personas = await db
          .select()
          .from(casePersonas)
          .where(eq(casePersonas.casoId, assistido.casoId));
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
        const [enrichedDocs] = await db
          .select({ count: count() })
          .from(documentos)
          .where(
            and(
              eq(documentos.processoId, input.processoId),
              eq(documentos.enrichmentStatus, "enriched"),
            ),
          );

        const [totalDocs] = await db
          .select({ count: count() })
          .from(documentos)
          .where(eq(documentos.processoId, input.processoId));

        // Count Drive files
        const [driveEnriched] = await db
          .select({ count: count() })
          .from(driveFiles)
          .where(
            and(
              eq(driveFiles.processoId, input.processoId),
              eq(driveFiles.enrichmentStatus, "completed"),
              eq(driveFiles.isFolder, false),
            ),
          );

        const [driveTotal] = await db
          .select({ count: count() })
          .from(driveFiles)
          .where(
            and(
              eq(driveFiles.processoId, input.processoId),
              eq(driveFiles.isFolder, false),
            ),
          );

        const [processo] = await db
          .select({
            analyzedAt: processos.analyzedAt,
            analysisStatus: processos.analysisStatus,
          })
          .from(processos)
          .where(eq(processos.id, input.processoId))
          .limit(1);

        let pendingCount = 0;
        if (processo?.analyzedAt) {
          const [pendingDocs] = await db
            .select({ count: count() })
            .from(documentos)
            .where(
              and(
                eq(documentos.processoId, input.processoId),
                eq(documentos.enrichmentStatus, "enriched"),
                sql`${documentos.enrichedAt} > ${processo.analyzedAt}`,
              ),
            );
          const [pendingDrive] = await db
            .select({ count: count() })
            .from(driveFiles)
            .where(
              and(
                eq(driveFiles.processoId, input.processoId),
                eq(driveFiles.enrichmentStatus, "completed"),
                eq(driveFiles.isFolder, false),
                sql`${driveFiles.enrichedAt} > ${processo.analyzedAt}`,
              ),
            );
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
   * The heavy operation — calls enrichment engine consolidation.
   */
  generateForAssistido: protectedProcedure
    .input(z.object({ assistidoId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const assistidoId = input.assistidoId;

      // 1. Set status to processing
      await db
        .update(assistidos)
        .set({ analysisStatus: "processing" })
        .where(eq(assistidos.id, assistidoId));

      try {
        // 2. Gather all enriched documents
        const enrichedDocs = await db
          .select({
            id: documentos.id,
            nome: documentos.titulo,
            enrichmentData: documentos.enrichmentData,
            conteudoCompleto: documentos.conteudoCompleto,
          })
          .from(documentos)
          .where(
            and(
              eq(documentos.assistidoId, assistidoId),
              eq(documentos.enrichmentStatus, "enriched"),
              isNotNull(documentos.enrichmentData),
            ),
          );

        // 3. Gather enriched atendimentos
        const enrichedAtendimentos = await db
          .select({
            id: atendimentos.id,
            enrichmentData: atendimentos.enrichmentData,
          })
          .from(atendimentos)
          .where(
            and(
              eq(atendimentos.assistidoId, assistidoId),
              eq(atendimentos.enrichmentStatus, "enriched"),
              isNotNull(atendimentos.enrichmentData),
            ),
          );

        // 4. Gather enriched demandas
        const enrichedDemandas = await db
          .select({
            id: demandas.id,
            enrichmentData: demandas.enrichmentData,
          })
          .from(demandas)
          .where(
            and(
              eq(demandas.assistidoId, assistidoId),
              isNotNull(demandas.enrichmentData),
            ),
          );

        // 5. Get assistido context
        const [assistido] = await db
          .select({ nome: assistidos.nome, cpf: assistidos.cpf })
          .from(assistidos)
          .where(eq(assistidos.id, assistidoId))
          .limit(1);

        // 6. Count total docs (including non-enriched)
        const [totalDocsCount] = await db
          .select({ count: count() })
          .from(documentos)
          .where(eq(documentos.assistidoId, assistidoId));

        // 7. Call consolidation engine
        const result = await enrichmentClient.consolidateCase({
          assistidoId,
          documents: enrichedDocs.map((d) => ({
            nome: d.nome,
            ...((d.enrichmentData as Record<string, unknown>) || {}),
            markdown_preview: d.conteudoCompleto?.slice(0, 2000) || "",
          })),
          transcripts: enrichedAtendimentos.map(
            (a) => (a.enrichmentData as Record<string, unknown>) || {},
          ),
          demandas: enrichedDemandas.map(
            (d) => (d.enrichmentData as Record<string, unknown>) || {},
          ),
          context: {
            nome_assistido: assistido?.nome || "",
            cpf: assistido?.cpf || "",
          },
        });

        // 8. Ensure caso exists
        const casoId = await ensureCaso(assistidoId, ctx.user.id.toString());

        // 9. Dedup personas and upsert into case_personas
        const dedupedPersonas = deduplicatePersonas(result.pessoas);
        // Clear old intelligence-generated personas for this caso
        await db
          .delete(casePersonas)
          .where(
            and(
              eq(casePersonas.casoId, casoId),
              eq(casePersonas.fonte, "intelligence"),
            ),
          );

        for (const persona of dedupedPersonas) {
          await db.insert(casePersonas).values({
            casoId,
            nome: persona.nome,
            tipo: persona.tipo as string,
            observacoes: persona.descricao || persona.relevancia_defesa || null,
            fonte: "intelligence",
            confidence: persona.confidence,
          });
        }

        // 10. Upsert case_facts (clear old + insert new)
        await db
          .delete(caseFacts)
          .where(
            and(
              eq(caseFacts.casoId, casoId),
              eq(caseFacts.fonte, "intelligence"),
            ),
          );

        // Insert cronologia as events
        for (const evento of result.cronologia) {
          await db.insert(caseFacts).values({
            casoId,
            assistidoId,
            titulo: evento.descricao,
            tipo: "evento",
            dataFato: evento.data || null,
            fonte: "intelligence",
            severidade: evento.relevancia as string,
            confidence: 0.8,
          });
        }

        // Insert nulidades
        for (const nulidade of result.nulidades) {
          await db.insert(caseFacts).values({
            casoId,
            assistidoId,
            titulo: nulidade.tipo,
            descricao: nulidade.descricao,
            tipo: "nulidade",
            fonte: "intelligence",
            severidade: nulidade.severidade as string,
            tags: [nulidade.fundamentacao],
            confidence: 0.9,
          });
        }

        // Insert teses
        for (const tese of result.teses) {
          await db.insert(caseFacts).values({
            casoId,
            assistidoId,
            titulo: tese.titulo,
            descricao: tese.fundamentacao,
            tipo: "tese",
            fonte: "intelligence",
            confidence: tese.confidence,
          });
        }

        // Insert acusacoes
        for (const acusacao of result.acusacoes) {
          await db.insert(caseFacts).values({
            casoId,
            assistidoId,
            titulo: acusacao.crime,
            descricao: `Artigos: ${acusacao.artigos.join(", ")}${acusacao.qualificadoras.length ? ` | Qualificadoras: ${acusacao.qualificadoras.join(", ")}` : ""}`,
            tipo: "acusacao",
            fonte: "intelligence",
            tags: acusacao.artigos,
          });
        }

        // 11. Save consolidated analysis on assistido
        await db
          .update(assistidos)
          .set({
            analysisStatus: "completed",
            analysisData: {
              resumo: result.resumo,
              achadosChave: result.achados_chave,
              recomendacoes: result.recomendacoes,
              inconsistencias: result.inconsistencias,
              kpis: {
                totalPessoas: dedupedPersonas.length,
                totalAcusacoes: result.acusacoes.length,
                totalDocumentosAnalisados: enrichedDocs.length,
                totalEventos: result.cronologia.length,
                totalNulidades: result.nulidades.length,
                totalRelacoes: dedupedPersonas.reduce(
                  (acc, p) => acc + p.documentos_ref.length,
                  0,
                ),
              },
              documentosProcessados: enrichedDocs.length,
              documentosTotal: totalDocsCount?.count || 0,
              versaoModelo: "gemini-2.0-flash",
            },
            analyzedAt: new Date(),
            analysisVersion: sql`COALESCE(${assistidos.analysisVersion}, 0) + 1`,
          })
          .where(eq(assistidos.id, assistidoId));

        return {
          success: true,
          resumo: result.resumo,
          totalPersonas: dedupedPersonas.length,
          totalFacts:
            result.cronologia.length +
            result.nulidades.length +
            result.teses.length +
            result.acusacoes.length,
          totalDocs: enrichedDocs.length,
        };
      } catch (error) {
        // Mark as failed
        await db
          .update(assistidos)
          .set({ analysisStatus: "failed" })
          .where(eq(assistidos.id, assistidoId));

        const message =
          error instanceof Error ? error.message : "Unknown error";
        console.error(
          `[Intelligence] Failed to generate for assistido ${assistidoId}:`,
          message,
        );
        return { success: false, error: message };
      }
    }),

  /**
   * Generate/regenerate analysis for a processo.
   */
  generateForProcesso: protectedProcedure
    .input(z.object({ processoId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const processoId = input.processoId;

      await db
        .update(processos)
        .set({ analysisStatus: "processing" })
        .where(eq(processos.id, processoId));

      try {
        // Gather enriched documents for this processo
        const enrichedDocs = await db
          .select({
            id: documentos.id,
            nome: documentos.titulo,
            enrichmentData: documentos.enrichmentData,
            conteudoCompleto: documentos.conteudoCompleto,
          })
          .from(documentos)
          .where(
            and(
              eq(documentos.processoId, processoId),
              eq(documentos.enrichmentStatus, "enriched"),
              isNotNull(documentos.enrichmentData),
            ),
          );

        // Get processo context
        const [processo] = await db
          .select({
            numeroAutos: processos.numeroAutos,
            vara: processos.vara,
            assunto: processos.assunto,
            assistidoId: processos.assistidoId,
            casoId: processos.casoId,
          })
          .from(processos)
          .where(eq(processos.id, processoId))
          .limit(1);

        // Enriched demandas for this processo
        const enrichedDemandas = await db
          .select({
            id: demandas.id,
            enrichmentData: demandas.enrichmentData,
          })
          .from(demandas)
          .where(
            and(
              eq(demandas.processoId, processoId),
              isNotNull(demandas.enrichmentData),
            ),
          );

        const [totalDocsCount] = await db
          .select({ count: count() })
          .from(documentos)
          .where(eq(documentos.processoId, processoId));

        // Call consolidation engine
        const result = await enrichmentClient.consolidateCase({
          processoId,
          assistidoId: processo?.assistidoId || undefined,
          documents: enrichedDocs.map((d) => ({
            nome: d.nome,
            ...((d.enrichmentData as Record<string, unknown>) || {}),
            markdown_preview: d.conteudoCompleto?.slice(0, 2000) || "",
          })),
          transcripts: [],
          demandas: enrichedDemandas.map(
            (d) => (d.enrichmentData as Record<string, unknown>) || {},
          ),
          context: {
            numero_processo: processo?.numeroAutos || "",
            vara: processo?.vara || "",
            assunto: processo?.assunto || "",
          },
        });

        // Ensure caso exists for the assistido
        let casoId = processo?.casoId;
        if (!casoId && processo?.assistidoId) {
          casoId = await ensureCaso(processo.assistidoId, ctx.user.id.toString());
          // Also update processo with casoId
          await db
            .update(processos)
            .set({ casoId })
            .where(eq(processos.id, processoId));
        }

        if (casoId) {
          // Dedup and upsert personas
          const dedupedPersonas = deduplicatePersonas(result.pessoas);
          await db
            .delete(casePersonas)
            .where(
              and(
                eq(casePersonas.casoId, casoId),
                eq(casePersonas.fonte, "intelligence"),
                eq(casePersonas.processoId, processoId),
              ),
            );

          for (const persona of dedupedPersonas) {
            await db.insert(casePersonas).values({
              casoId,
              processoId,
              nome: persona.nome,
              tipo: persona.tipo as string,
              observacoes:
                persona.descricao || persona.relevancia_defesa || null,
              fonte: "intelligence",
              confidence: persona.confidence,
            });
          }

          // Upsert case_facts
          await db
            .delete(caseFacts)
            .where(
              and(
                eq(caseFacts.casoId, casoId),
                eq(caseFacts.fonte, "intelligence"),
                eq(caseFacts.processoId, processoId),
              ),
            );

          for (const evento of result.cronologia) {
            await db.insert(caseFacts).values({
              casoId,
              processoId,
              titulo: evento.descricao,
              tipo: "evento",
              dataFato: evento.data || null,
              fonte: "intelligence",
              severidade: evento.relevancia as string,
            });
          }

          for (const nulidade of result.nulidades) {
            await db.insert(caseFacts).values({
              casoId,
              processoId,
              titulo: nulidade.tipo,
              descricao: nulidade.descricao,
              tipo: "nulidade",
              fonte: "intelligence",
              severidade: nulidade.severidade as string,
              tags: [nulidade.fundamentacao],
            });
          }

          for (const tese of result.teses) {
            await db.insert(caseFacts).values({
              casoId,
              processoId,
              titulo: tese.titulo,
              descricao: tese.fundamentacao,
              tipo: "tese",
              fonte: "intelligence",
              confidence: tese.confidence,
            });
          }

          for (const acusacao of result.acusacoes) {
            await db.insert(caseFacts).values({
              casoId,
              processoId,
              titulo: acusacao.crime,
              descricao: `Artigos: ${acusacao.artigos.join(", ")}`,
              tipo: "acusacao",
              fonte: "intelligence",
              tags: acusacao.artigos,
            });
          }
        }

        const dedupedPersonas = deduplicatePersonas(result.pessoas);

        // Save consolidated analysis on processo
        await db
          .update(processos)
          .set({
            analysisStatus: "completed",
            analysisData: {
              resumo: result.resumo,
              achadosChave: result.achados_chave,
              recomendacoes: result.recomendacoes,
              inconsistencias: result.inconsistencias,
              teses: result.teses.map((t) => t.titulo),
              nulidades: result.nulidades.map((n) => ({
                tipo: n.tipo,
                descricao: n.descricao,
                severidade: n.severidade as "alta" | "media" | "baixa",
                fundamentacao: n.fundamentacao,
                documentoRef: n.documento_ref || undefined,
              })),
              kpis: {
                totalPessoas: dedupedPersonas.length,
                totalAcusacoes: result.acusacoes.length,
                totalDocumentosAnalisados: enrichedDocs.length,
                totalEventos: result.cronologia.length,
                totalNulidades: result.nulidades.length,
                totalRelacoes: dedupedPersonas.reduce(
                  (acc, p) => acc + p.documentos_ref.length,
                  0,
                ),
              },
              documentosProcessados: enrichedDocs.length,
              documentosTotal: totalDocsCount?.count || 0,
              versaoModelo: "gemini-2.0-flash",
            },
            analyzedAt: new Date(),
            analysisVersion: sql`COALESCE(${processos.analysisVersion}, 0) + 1`,
          })
          .where(eq(processos.id, processoId));

        return {
          success: true,
          resumo: result.resumo,
          totalPersonas: dedupedPersonas.length,
          totalFacts:
            result.cronologia.length +
            result.nulidades.length +
            result.teses.length,
          totalDocs: enrichedDocs.length,
        };
      } catch (error) {
        await db
          .update(processos)
          .set({ analysisStatus: "failed" })
          .where(eq(processos.id, processoId));

        const message =
          error instanceof Error ? error.message : "Unknown error";
        console.error(
          `[Intelligence] Failed to generate for processo ${processoId}:`,
          message,
        );
        return { success: false, error: message };
      }
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
