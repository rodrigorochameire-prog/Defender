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
import { documentos, atendimentos, demandas, driveFiles, processos, assistidos } from "@/lib/db/schema";
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

      // 1. Buscar documento no banco (exclui enrichmentData e conteudoCompleto — pesados e desnecessários aqui)
      const [doc] = await db
        .select({
          id: documentos.id,
          enrichmentStatus: documentos.enrichmentStatus,
          fileUrl: documentos.fileUrl,
          mimeType: documentos.mimeType,
          assistidoId: documentos.assistidoId,
          processoId: documentos.processoId,
          casoId: documentos.casoId,
        })
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

      // 1. Buscar atendimento (apenas campos necessários, exclui enrichmentData/pontosChave/transcricaoMetadados)
      const [atendimento] = await db
        .select({
          id: atendimentos.id,
          transcricao: atendimentos.transcricao,
          resumo: atendimentos.resumo,
          enrichmentStatus: atendimentos.enrichmentStatus,
          assistidoId: atendimentos.assistidoId,
          processoId: atendimentos.processoId,
          casoId: atendimentos.casoId,
        })
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
              urgency_level: "low",
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
        // Exclui enrichmentData e conteudoCompleto — pesados e desnecessários aqui
        const [doc] = await db
          .select({
            id: documentos.id,
            fileUrl: documentos.fileUrl,
            mimeType: documentos.mimeType,
            assistidoId: documentos.assistidoId,
            processoId: documentos.processoId,
            casoId: documentos.casoId,
          })
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

  /**
   * Sugere ações a partir do enrichment de um arquivo Drive
   * Ex: Sentença → sugerir "Criar demanda: Apelação"
   */
  suggestActionsFromEnrichment: protectedProcedure
    .input(z.object({ driveFileId: z.number() }))
    .query(async ({ input }) => {
      // Busca apenas campos necessários para sugestões (exclui links, checksums etc.)
      const [file] = await db
        .select({
          id: driveFiles.id,
          name: driveFiles.name,
          documentType: driveFiles.documentType,
          categoria: driveFiles.categoria,
          enrichmentData: driveFiles.enrichmentData,
          enrichmentStatus: driveFiles.enrichmentStatus,
          processoId: driveFiles.processoId,
          assistidoId: driveFiles.assistidoId,
        })
        .from(driveFiles)
        .where(eq(driveFiles.id, input.driveFileId))
        .limit(1);

      if (!file) return { suggestions: [] };

      const docType = (file.documentType || "").toLowerCase();
      const categoria = (file.categoria || "").toLowerCase();
      const enrichData = (file.enrichmentData || {}) as Record<string, unknown>;
      const subType = ((enrichData.sub_type as string) || "").toLowerCase();

      const suggestions: Array<{
        type: "criar_demanda" | "atualizar_processo" | "criar_atendimento";
        title: string;
        description: string;
        demandaTipo?: string;
        urgencia?: "alta" | "media" | "baixa";
        confidence: number;
      }> = [];

      // Sentença → sugerir Apelação ou Embargos
      if (docType.includes("sentença") || docType.includes("sentenca") || subType.includes("sentença") || subType.includes("sentenca")) {
        suggestions.push({
          type: "criar_demanda",
          title: "Interpor Apelação",
          description: "Sentença detectada. Prazo de 5 dias úteis para apelação criminal.",
          demandaTipo: "Apelação",
          urgencia: "alta",
          confidence: 0.85,
        });
        suggestions.push({
          type: "criar_demanda",
          title: "Embargos de Declaração",
          description: "Verificar se há omissão, contradição ou obscuridade na sentença.",
          demandaTipo: "Embargos de Declaração",
          urgencia: "media",
          confidence: 0.6,
        });
        suggestions.push({
          type: "atualizar_processo",
          title: "Atualizar fase: Sentença",
          description: "Marcar processo como fase 'sentença' para controle de prazos.",
          confidence: 0.9,
        });
      }

      // Decisão → sugerir Agravo ou Recurso
      if (docType.includes("decisão") || docType.includes("decisao") || subType.includes("decisão") || subType.includes("decisao")) {
        suggestions.push({
          type: "criar_demanda",
          title: "Agravo de Instrumento",
          description: "Decisão interlocutória detectada. Avaliar cabimento de agravo.",
          demandaTipo: "Agravo de Instrumento",
          urgencia: "media",
          confidence: 0.7,
        });
      }

      // Intimação → sugerir Resposta/Manifestação
      if (docType.includes("intimação") || docType.includes("intimacao") || subType.includes("intimação") || subType.includes("intimacao")) {
        suggestions.push({
          type: "criar_demanda",
          title: "Manifestação/Resposta",
          description: "Intimação detectada. Verificar prazo e providenciar resposta.",
          demandaTipo: "Manifestação",
          urgencia: "alta",
          confidence: 0.75,
        });
      }

      // Acórdão → possível recurso especial/extraordinário
      if (docType.includes("acórdão") || docType.includes("acordao") || subType.includes("acórdão") || subType.includes("acordao")) {
        suggestions.push({
          type: "criar_demanda",
          title: "Recurso Especial/Extraordinário",
          description: "Acórdão detectado. Avaliar cabimento de recurso às instâncias superiores.",
          demandaTipo: "Recurso Especial",
          urgencia: "media",
          confidence: 0.6,
        });
      }

      // Mandado de Prisão → urgência alta
      if (docType.includes("mandado") || subType.includes("mandado") || docType.includes("prisão") || docType.includes("prisao")) {
        suggestions.push({
          type: "criar_demanda",
          title: "Habeas Corpus",
          description: "Mandado/prisão detectado. Avaliar urgência de HC.",
          demandaTipo: "Habeas Corpus",
          urgencia: "alta",
          confidence: 0.7,
        });
      }

      // Denúncia → resposta à acusação
      if (docType.includes("denúncia") || docType.includes("denuncia") || subType.includes("denúncia") || subType.includes("denuncia")) {
        suggestions.push({
          type: "criar_demanda",
          title: "Resposta à Acusação",
          description: "Denúncia detectada. Prazo de 10 dias para resposta à acusação.",
          demandaTipo: "Resposta à Acusação",
          urgencia: "alta",
          confidence: 0.8,
        });
      }

      // If file has processo but no demandas linked, suggest creating one
      if (file.processoId && suggestions.length === 0 && (file.enrichmentStatus === "completed" || file.enrichmentStatus === "classified")) {
        suggestions.push({
          type: "criar_demanda",
          title: "Criar Demanda Genérica",
          description: "Arquivo classificado vinculado a processo. Registrar providência.",
          demandaTipo: "Providência",
          urgencia: "baixa",
          confidence: 0.4,
        });
      }

      return { suggestions, fileId: file.id, processoId: file.processoId, assistidoId: file.assistidoId };
    }),

  /**
   * Aplica ações sugeridas pelo enrichment (cria demandas, atualiza processos)
   */
  applyEnrichmentActions: protectedProcedure
    .input(z.object({
      driveFileId: z.number(),
      actions: z.array(z.object({
        type: z.enum(["criar_demanda", "atualizar_processo", "criar_atendimento"]),
        demandaTipo: z.string().optional(),
        processoId: z.number().optional(),
        assistidoId: z.number().optional(),
      })),
    }))
    .mutation(async ({ input, ctx }) => {
      const results: Array<{ type: string; success: boolean; id?: number; error?: string }> = [];

      // Busca apenas campos necessários (exclui enrichmentData JSONB e links pesados)
      const [file] = await db
        .select({
          id: driveFiles.id,
          name: driveFiles.name,
          documentType: driveFiles.documentType,
          categoria: driveFiles.categoria,
          processoId: driveFiles.processoId,
          assistidoId: driveFiles.assistidoId,
        })
        .from(driveFiles)
        .where(eq(driveFiles.id, input.driveFileId))
        .limit(1);
      if (!file) return { results: [{ type: "error", success: false, error: "Arquivo não encontrado" }] };

      const processoId = input.actions[0]?.processoId || file.processoId;
      const assistidoId = input.actions[0]?.assistidoId || file.assistidoId;

      for (const action of input.actions) {
        try {
          if (action.type === "criar_demanda") {
            // Create a demanda linked to the processo/assistido
            const [novaDemanda] = await db.insert(demandas).values({
              tipo: action.demandaTipo || "Providência",
              descricao: `Demanda criada automaticamente a partir de enrichment do arquivo: ${file.name}`,
              status: "pendente",
              prioridade: "media",
              processoId: processoId || undefined,
              assistidoId: assistidoId || undefined,
              defensorId: ctx.user.id,
              enrichmentData: {
                origem: "enrichment_bridge",
                arquivo_origem: file.name,
                drive_file_id: file.id,
                documento_tipo: file.documentType,
                categoria: file.categoria,
              },
              createdAt: new Date(),
              updatedAt: new Date(),
            } as any).returning({ id: demandas.id });

            results.push({ type: "criar_demanda", success: true, id: novaDemanda?.id });
          }

          if (action.type === "atualizar_processo" && processoId) {
            // Update processo fase based on document type
            const docType = (file.documentType || "").toLowerCase();
            let fase: string | undefined;
            if (docType.includes("sentença") || docType.includes("sentenca")) fase = "sentença";
            else if (docType.includes("decisão") || docType.includes("decisao")) fase = "instrução";
            else if (docType.includes("denúncia") || docType.includes("denuncia")) fase = "instrução";

            if (fase) {
              await db.update(processos)
                .set({ fase, updatedAt: new Date() })
                .where(eq(processos.id, processoId));
            }
            results.push({ type: "atualizar_processo", success: true, id: processoId });
          }
        } catch (err) {
          results.push({
            type: action.type,
            success: false,
            error: err instanceof Error ? err.message : "Erro desconhecido",
          });
        }
      }

      return { results };
    }),

  /**
   * Global enrichment stats for dashboard
   */
  globalStats: adminProcedure.query(async () => {
    // File counts by enrichment status
    const fileStats = await db
      .select({
        total: sql<number>`count(*)::int`,
        enriched: sql<number>`count(*) filter (where ${driveFiles.enrichmentStatus} = 'completed')::int`,
        processing: sql<number>`count(*) filter (where ${driveFiles.enrichmentStatus} = 'processing')::int`,
        failed: sql<number>`count(*) filter (where ${driveFiles.enrichmentStatus} = 'failed')::int`,
        pending: sql<number>`count(*) filter (where ${driveFiles.enrichmentStatus} is null and ${driveFiles.isFolder} = false)::int`,
      })
      .from(driveFiles);

    // Enrichment by atribuição
    const byAtribuicao = await db
      .select({
        atribuicao: assistidos.atribuicaoPrimaria,
        totalFiles: sql<number>`count(${driveFiles.id})::int`,
        enriched: sql<number>`count(*) filter (where ${driveFiles.enrichmentStatus} = 'completed')::int`,
      })
      .from(driveFiles)
      .innerJoin(assistidos, eq(driveFiles.driveFolderId, assistidos.driveFolderId))
      .where(eq(driveFiles.isFolder, false))
      .groupBy(assistidos.atribuicaoPrimaria);

    // Pendentes revisão (reverse sync duplicates)
    const pendentesRevisao = await db
      .select({
        id: assistidos.id,
        nome: assistidos.nome,
        atribuicaoPrimaria: assistidos.atribuicaoPrimaria,
        duplicataSugerida: assistidos.duplicataSugerida,
        createdAt: assistidos.createdAt,
      })
      .from(assistidos)
      .where(and(
        sql`${assistidos.duplicataSugerida} is not null`,
        isNull(assistidos.deletedAt),
      ));

    return {
      files: fileStats[0] || { total: 0, enriched: 0, processing: 0, failed: 0, pending: 0 },
      byAtribuicao,
      pendentesRevisao,
    };
  }),

  /**
   * Batch process enrichment for multiple files
   */
  batchProcess: adminProcedure
    .input(z.object({
      scope: z.enum(["all_pending", "by_atribuicao", "by_ids"]),
      atribuicao: z.string().optional(),
      assistidoIds: z.array(z.number()).optional(),
      onlyNew: z.boolean().default(true),
    }))
    .mutation(async ({ input }) => {
      const { inngest } = await import("@/lib/inngest/client");

      // Build filter conditions
      const conditions = [
        eq(driveFiles.isFolder, false),
      ];

      if (input.onlyNew) {
        conditions.push(isNull(driveFiles.enrichmentStatus));
      }

      let query = db
        .select({
          assistidoId: assistidos.id,
          driveFolderId: assistidos.driveFolderId,
        })
        .from(assistidos)
        .where(and(
          sql`${assistidos.driveFolderId} is not null`,
          isNull(assistidos.deletedAt),
          ...(input.scope === "by_atribuicao" && input.atribuicao
            ? [sql`${assistidos.atribuicaoPrimaria} = ${input.atribuicao}`]
            : []),
          ...(input.scope === "by_ids" && input.assistidoIds
            ? [sql`${assistidos.id} = ANY(${input.assistidoIds})`]
            : []),
        ));

      const targets = await query;
      let queued = 0;

      for (const target of targets) {
        if (!target.driveFolderId) continue;
        await inngest.send({
          name: "enrichment/process-folder",
          data: {
            assistidoId: target.assistidoId,
            driveFolderId: target.driveFolderId,
          },
        });
        queued++;
      }

      return { queued, total: targets.length };
    }),

  /**
   * Resolve a pendente_revisao: confirm as new or merge with existing
   */
  resolvePendente: adminProcedure
    .input(z.object({
      assistidoId: z.number(),
      action: z.enum(["confirm_new", "merge"]),
      mergeTargetId: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      if (input.action === "confirm_new") {
        await db
          .update(assistidos)
          .set({
            duplicataSugerida: null,
            updatedAt: new Date(),
          })
          .where(eq(assistidos.id, input.assistidoId));

        return { action: "confirmed", assistidoId: input.assistidoId };
      }

      if (input.action === "merge" && input.mergeTargetId) {
        // Get the pending assistido
        const [pending] = await db
          .select({ driveFolderId: assistidos.driveFolderId })
          .from(assistidos)
          .where(eq(assistidos.id, input.assistidoId))
          .limit(1);

        if (pending?.driveFolderId) {
          // Transfer the folder to the existing assistido
          await db
            .update(assistidos)
            .set({
              driveFolderId: pending.driveFolderId,
              updatedAt: new Date(),
            })
            .where(eq(assistidos.id, input.mergeTargetId));
        }

        // Soft-delete the duplicate
        await db
          .update(assistidos)
          .set({
            deletedAt: new Date(),
            driveFolderId: null,
            updatedAt: new Date(),
          })
          .where(eq(assistidos.id, input.assistidoId));

        return { action: "merged", assistidoId: input.assistidoId, mergedInto: input.mergeTargetId };
      }

      throw new Error("Invalid action or missing mergeTargetId");
    }),
});

export type EnrichmentRouter = typeof enrichmentRouter;
