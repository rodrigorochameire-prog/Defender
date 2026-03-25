/**
 * Intelligence Consolidation Service
 *
 * Extracts core consolidation logic from the intelligence tRPC router
 * into a standalone service that can be called from both tRPC mutations
 * and Inngest background jobs.
 */

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
  driveDocumentSections,
} from "@/lib/db/schema";
import { eq, and, isNotNull, sql, count } from "drizzle-orm";
import { enrichmentClient } from "@/lib/services/enrichment-client";
import type { ConsolidationPessoa } from "@/lib/services/enrichment-client";

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

export interface ConsolidationResult {
  success: boolean;
  skipped?: boolean;
  skipReason?: string;
  resumo?: string;
  totalPersonas?: number;
  totalFacts?: number;
  totalDocs?: number;
  error?: string;
}

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

export function normalizeName(name: string): string {
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
export function deduplicatePersonas(
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
export async function ensureCaso(
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
// consolidateForAssistido
// ─────────────────────────────────────────────────────────────

export async function consolidateForAssistido(
  assistidoId: number,
  userId: string,
): Promise<ConsolidationResult> {
  // Idempotency guard: check if already processing
  const [current] = await db
    .select({
      analysisStatus: assistidos.analysisStatus,
      analyzedAt: assistidos.analyzedAt,
    })
    .from(assistidos)
    .where(eq(assistidos.id, assistidoId))
    .limit(1);

  if (current?.analysisStatus === "processing") {
    return { success: true, skipped: true, skipReason: "Already processing" };
  }

  // Check if there are new enrichments since last analysis
  if (current?.analyzedAt) {
    const [newEnrichments] = await db
      .select({
        count: sql<number>`(
          SELECT count(*) FROM documentos
          WHERE assistido_id = ${assistidoId}
            AND enrichment_status = 'enriched'
            AND enriched_at > ${current.analyzedAt}
        ) + (
          SELECT count(*) FROM drive_files
          WHERE assistido_id = ${assistidoId}
            AND enrichment_status = 'completed'
            AND is_folder = false
            AND enriched_at > ${current.analyzedAt}
        ) + (
          SELECT count(*) FROM atendimentos
          WHERE assistido_id = ${assistidoId}
            AND enrichment_status = 'enriched'
            AND enriched_at > ${current.analyzedAt}
        )`,
      })
      .from(sql`(select 1) as _`);

    if (!newEnrichments?.count || newEnrichments.count === 0) {
      return {
        success: true,
        skipped: true,
        skipReason: "No new enrichments since last analysis",
      };
    }
  }

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

    // 5. Gather classified PDF sections (Sonnet-extracted metadata)
    const sections = await db
      .select({
        tipo: driveDocumentSections.tipo,
        titulo: driveDocumentSections.titulo,
        resumo: driveDocumentSections.resumo,
        textoExtraido: driveDocumentSections.textoExtraido,
        metadata: driveDocumentSections.metadata,
        confianca: driveDocumentSections.confianca,
        fichaData: driveDocumentSections.fichaData,
      })
      .from(driveDocumentSections)
      .innerJoin(driveFiles, eq(driveDocumentSections.driveFileId, driveFiles.id))
      .where(
        and(
          eq(driveFiles.assistidoId, assistidoId),
          sql`${driveDocumentSections.reviewStatus} != 'rejected'`,
        ),
      );

    // Transform sections into documents for consolidation
    const sectionDocs = sections.map((s) => ({
      nome: `[${s.tipo}] ${s.titulo}`,
      document_type: s.tipo,
      extracted_data: {
        ...((s.metadata as Record<string, unknown>) || {}),
        ...((s.fichaData as Record<string, unknown>) || {}),
      },
      markdown_preview: s.textoExtraido?.slice(0, 2000) || s.resumo || "",
      confidence: (s.confianca || 0) / 100,
      source: "drive_section",
    }));

    // 6. Get assistido context
    const [assistido] = await db
      .select({ nome: assistidos.nome, cpf: assistidos.cpf })
      .from(assistidos)
      .where(eq(assistidos.id, assistidoId))
      .limit(1);

    // 7. Count total docs (including non-enriched)
    const [totalDocsCount] = await db
      .select({ count: count() })
      .from(documentos)
      .where(eq(documentos.assistidoId, assistidoId));

    // 8. Call consolidation engine
    const result = await enrichmentClient.consolidateCase({
      assistidoId,
      documents: [
        ...enrichedDocs.map((d) => ({
          nome: d.nome,
          ...((d.enrichmentData as Record<string, unknown>) || {}),
          markdown_preview: d.conteudoCompleto?.slice(0, 2000) || "",
        })),
        ...sectionDocs,
      ],
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

    // 9. Ensure caso exists
    const casoId = await ensureCaso(assistidoId, userId);

    // 10. Dedup personas and upsert into case_personas
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

    // 11. Upsert case_facts (clear old + insert new)
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

    // 12. Save consolidated analysis on assistido
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
}

// ─────────────────────────────────────────────────────────────
// consolidateForProcesso
// ─────────────────────────────────────────────────────────────

export async function consolidateForProcesso(
  processoId: number,
  userId: string,
): Promise<ConsolidationResult> {
  // Idempotency guard: check if already processing
  const [current] = await db
    .select({
      analysisStatus: processos.analysisStatus,
      analyzedAt: processos.analyzedAt,
    })
    .from(processos)
    .where(eq(processos.id, processoId))
    .limit(1);

  if (current?.analysisStatus === "processing") {
    return { success: true, skipped: true, skipReason: "Already processing" };
  }

  // Check if there are new enrichments since last analysis
  if (current?.analyzedAt) {
    const [newEnrichments] = await db
      .select({
        count: sql<number>`(
          SELECT count(*) FROM documentos
          WHERE processo_id = ${processoId}
            AND enrichment_status = 'enriched'
            AND enriched_at > ${current.analyzedAt}
        ) + (
          SELECT count(*) FROM drive_files
          WHERE processo_id = ${processoId}
            AND enrichment_status = 'completed'
            AND is_folder = false
            AND enriched_at > ${current.analyzedAt}
        )`,
      })
      .from(sql`(select 1) as _`);

    if (!newEnrichments?.count || newEnrichments.count === 0) {
      return {
        success: true,
        skipped: true,
        skipReason: "No new enrichments since last analysis",
      };
    }
  }

  // Set status to processing
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

    // Gather classified PDF sections for the processo's assistido
    let sectionDocs: Array<{
      nome: string;
      document_type: string;
      extracted_data: Record<string, unknown>;
      markdown_preview: string;
      confidence: number;
      source: string;
    }> = [];

    if (processo?.assistidoId) {
      const sections = await db
        .select({
          tipo: driveDocumentSections.tipo,
          titulo: driveDocumentSections.titulo,
          resumo: driveDocumentSections.resumo,
          textoExtraido: driveDocumentSections.textoExtraido,
          metadata: driveDocumentSections.metadata,
          confianca: driveDocumentSections.confianca,
          fichaData: driveDocumentSections.fichaData,
        })
        .from(driveDocumentSections)
        .innerJoin(driveFiles, eq(driveDocumentSections.driveFileId, driveFiles.id))
        .where(
          and(
            eq(driveFiles.processoId, processoId),
            sql`${driveDocumentSections.reviewStatus} != 'rejected'`,
          ),
        );

      sectionDocs = sections.map((s) => ({
        nome: `[${s.tipo}] ${s.titulo}`,
        document_type: s.tipo,
        extracted_data: {
          ...((s.metadata as Record<string, unknown>) || {}),
          ...((s.fichaData as Record<string, unknown>) || {}),
        },
        markdown_preview: s.textoExtraido?.slice(0, 2000) || s.resumo || "",
        confidence: (s.confianca || 0) / 100,
        source: "drive_section",
      }));
    }

    const [totalDocsCount] = await db
      .select({ count: count() })
      .from(documentos)
      .where(eq(documentos.processoId, processoId));

    // Call consolidation engine
    const result = await enrichmentClient.consolidateCase({
      processoId,
      assistidoId: processo?.assistidoId || undefined,
      documents: [
        ...enrichedDocs.map((d) => ({
          nome: d.nome,
          ...((d.enrichmentData as Record<string, unknown>) || {}),
          markdown_preview: d.conteudoCompleto?.slice(0, 2000) || "",
        })),
        ...sectionDocs,
      ],
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
      casoId = await ensureCaso(processo.assistidoId, userId);
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
}
