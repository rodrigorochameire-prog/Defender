/**
 * Speaker Labels Router — Diarização de Transcrições
 *
 * CRUD para speaker labels (quem é quem nos áudios transcritos).
 * Labels podem ser inferidos automaticamente via Claude Sonnet
 * ou editados manualmente pelo defensor.
 */

import { z } from "zod";
import { router, protectedProcedure } from "../init";
import { db } from "@/lib/db";
import { speakerLabels, driveFiles } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export const speakerLabelsRouter = router({
  /**
   * Buscar labels de speakers de um arquivo específico.
   */
  getByFile: protectedProcedure
    .input(z.object({ fileId: z.number() }))
    .query(async ({ input }) => {
      return db
        .select()
        .from(speakerLabels)
        .where(eq(speakerLabels.fileId, input.fileId))
        .orderBy(speakerLabels.speakerKey);
    }),

  /**
   * Buscar todos os labels de um assistido (todas as gravações).
   */
  getByAssistido: protectedProcedure
    .input(z.object({ assistidoId: z.number() }))
    .query(async ({ input }) => {
      return db
        .select()
        .from(speakerLabels)
        .where(eq(speakerLabels.assistidoId, input.assistidoId))
        .orderBy(speakerLabels.speakerKey);
    }),

  /**
   * Atualizar label e role de um speaker (edição manual).
   * Marca como is_manual=true e confidence=1.0.
   */
  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      label: z.string().min(1),
      role: z.string().min(1),
    }))
    .mutation(async ({ input }) => {
      const [updated] = await db
        .update(speakerLabels)
        .set({
          label: input.label,
          role: input.role,
          isManual: true,
          confidence: 1.0,
          updatedAt: new Date(),
        })
        .where(eq(speakerLabels.id, input.id))
        .returning();
      return updated;
    }),

  /**
   * Trigger diarização manual para um arquivo.
   * Chama o enrichment engine para identificar speakers.
   */
  triggerDiarization: protectedProcedure
    .input(z.object({
      fileId: z.number(),
      assistidoId: z.number(),
    }))
    .mutation(async ({ input }) => {
      // Get file content
      const [file] = await db
        .select()
        .from(driveFiles)
        .where(eq(driveFiles.id, input.fileId));

      if (!file?.enrichmentData) {
        throw new Error("Arquivo sem dados de transcrição");
      }

      const enrichment = file.enrichmentData as Record<string, unknown>;
      const transcription =
        (enrichment.transcript as string) ||
        (enrichment.transcript_plain as string) ||
        (enrichment.markdown_content as string) ||
        "";

      if (!transcription) {
        throw new Error("Nenhuma transcrição encontrada no arquivo");
      }

      // Get existing manual labels
      const existingLabels = await db
        .select()
        .from(speakerLabels)
        .where(
          and(
            eq(speakerLabels.assistidoId, input.assistidoId),
            eq(speakerLabels.isManual, true),
          )
        );

      // Call enrichment engine
      const { enrichmentClient } = await import("@/lib/services/enrichment-client");

      return enrichmentClient.diarizeAsync({
        fileId: input.fileId,
        assistidoId: input.assistidoId,
        transcriptionText: transcription,
        existingLabels: existingLabels.map((l) => ({
          speaker_key: l.speakerKey,
          label: l.label,
          role: l.role || "outro",
        })),
      });
    }),
});
