import { z } from "zod";
import { and, desc, eq, inArray } from "drizzle-orm";
import { router, protectedProcedure } from "../init";
import { db, pjeDownloadJobs, processos } from "@/lib/db";

const SUPPORTED_ATRIBUICOES_V1 = ["JURI_CAMACARI", "VVD_CAMACARI"] as const;

export const pjeRouter = router({
  /**
   * Enqueue a PJe download job for a given processo.
   * - Returns { status: "not_found" } if processo doesn't exist
   * - Returns { status: "unsupported_atribuicao", ... } if V1 doesn't support it
   * - Returns { status: "already_queued", jobId } if a pending/running job exists
   * - Returns { status: "queued", jobId } on success
   */
  enqueueDownload: protectedProcedure
    .input(z.object({ processoId: z.number().int() }))
    .mutation(async ({ input }) => {
      const [processo] = await db
        .select({
          id: processos.id,
          numeroAutos: processos.numeroAutos,
          atribuicao: processos.atribuicao,
          assistidoId: processos.assistidoId,
        })
        .from(processos)
        .where(eq(processos.id, input.processoId))
        .limit(1);

      if (!processo) {
        return { status: "not_found" as const };
      }

      const atribuicao = (processo.atribuicao ?? "").toUpperCase();
      if (!SUPPORTED_ATRIBUICOES_V1.includes(atribuicao as (typeof SUPPORTED_ATRIBUICOES_V1)[number])) {
        return {
          status: "unsupported_atribuicao" as const,
          atribuicao,
          supported: SUPPORTED_ATRIBUICOES_V1,
        };
      }

      const [existing] = await db
        .select({ id: pjeDownloadJobs.id, status: pjeDownloadJobs.status })
        .from(pjeDownloadJobs)
        .where(
          and(
            eq(pjeDownloadJobs.processoId, processo.id),
            inArray(pjeDownloadJobs.status, ["pending", "running"]),
          ),
        )
        .orderBy(desc(pjeDownloadJobs.createdAt))
        .limit(1);

      if (existing) {
        return { status: "already_queued" as const, jobId: existing.id };
      }

      const [inserted] = await db
        .insert(pjeDownloadJobs)
        .values({
          processoId: processo.id,
          numeroProcesso: processo.numeroAutos ?? "",
          atribuicao,
          assistidoId: processo.assistidoId ?? null,
          status: "pending",
        })
        .returning({ id: pjeDownloadJobs.id });

      return { status: "queued" as const, jobId: inserted.id };
    }),

  /**
   * Return the latest job status for a set of processos.
   * Used by the "Preparar Audiências" modal to show download progress.
   */
  listJobsForProcessos: protectedProcedure
    .input(z.object({ processoIds: z.array(z.number().int()) }))
    .query(async ({ input }) => {
      if (input.processoIds.length === 0) return [];
      const rows = await db
        .select({
          id: pjeDownloadJobs.id,
          processoId: pjeDownloadJobs.processoId,
          status: pjeDownloadJobs.status,
          error: pjeDownloadJobs.error,
          pdfBytes: pjeDownloadJobs.pdfBytes,
          createdAt: pjeDownloadJobs.createdAt,
          completedAt: pjeDownloadJobs.completedAt,
        })
        .from(pjeDownloadJobs)
        .where(inArray(pjeDownloadJobs.processoId, input.processoIds))
        .orderBy(desc(pjeDownloadJobs.createdAt));

      // Keep only the LATEST job per processo
      const latest = new Map<number, (typeof rows)[number]>();
      for (const row of rows) {
        if (!latest.has(row.processoId)) latest.set(row.processoId, row);
      }
      return Array.from(latest.values());
    }),
});
