/**
 * Router de Intimacoes SEEU (Execucao Penal)
 *
 * Espelha `intimacoes.ts` (PJe), porem aponta para as tabelas SEEU
 * (`seeu_import_staging` / `seeu_ledger`) e usa o parser SEEU FORCADO
 * (`parseSeeuRow`/`seeuStagingRowToImportRow`, Task 5) — nunca a
 * auto-deteccao usada no router PJe.
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../init";
import { db } from "@/lib/db";
import { claudeCodeTasks } from "@/lib/db/schema/casos";
import { seeuImportStaging, seeuLedger } from "@/lib/db/schema/seeu-import";
import { demandas } from "@/lib/db/schema";
import { and, eq, inArray, isNull } from "drizzle-orm";
import { enrichStagingWithLiveDedup } from "@/lib/services/pje-intimacoes-import";
import {
  buildSeeuLedgerUpserts,
  parseSeeuRow,
  seeuStagingRowToImportRow,
} from "@/lib/services/seeu-intimacoes-import";
import { importarDemandas } from "@/lib/services/pje-import";
import type { SeeuImportStaging } from "@/lib/db/schema/seeu-import";
import type { PjeImportStaging } from "@/lib/db/schema/pje-import";

const ABAS = ["manifestacao", "ciencia", "razoes"] as const;

const criarImportJobInput = z.object({
  atribuicoes: z.array(z.enum(["EXECUCAO_PENAL"])).min(1),
  abas: z.array(z.enum(ABAS)).min(1).optional(),
  limit: z.number().int().min(1).max(500).optional(),
});
export type CriarSeeuImportJobInput = z.infer<typeof criarImportJobInput>;

export function buildSeeuJobMeta(input: CriarSeeuImportJobInput) {
  return {
    atribuicoes: input.atribuicoes,
    abas: input.abas ?? [...ABAS],
    limit: input.limit ?? 300,
  };
}

// SeeuImportStaging é superconjunto estrutural de PjeImportStaging → o helper
// enrichStagingWithLiveDedup (Layer-B) aceita via cast.
const asPje = (rows: SeeuImportStaging[]) => rows as unknown as PjeImportStaging[];

export const seeuIntimacoesRouter = router({
  /**
   * criarImportJob — Enfileira importacao de intimacoes SEEU (lane browser).
   * Dedup: retorna job existente se ja houver um pending/processing.
   */
  criarImportJob: protectedProcedure
    .input(criarImportJobInput)
    .mutation(async ({ ctx, input }) => {
      const emAndamento = await db
        .select({ id: claudeCodeTasks.id })
        .from(claudeCodeTasks)
        .where(and(
          eq(claudeCodeTasks.skill, "seeu-intimacoes-import"),
          inArray(claudeCodeTasks.status, ["pending", "processing"]),
        ))
        .limit(1);
      if (emAndamento.length > 0)
        return { success: true, existing: true, taskId: emAndamento[0].id };

      const meta = buildSeeuJobMeta(input);
      const [task] = await db.insert(claudeCodeTasks).values({
        skill: "seeu-intimacoes-import",
        lane: "browser",
        prompt: `Importar intimações SEEU — ${meta.abas.join(", ")} (Execução Penal)`,
        instrucaoAdicional: JSON.stringify(meta),
        status: "pending",
        createdBy: ctx.user.id,
      }).returning({ id: claudeCodeTasks.id });
      return { success: true, existing: false, taskId: task.id };
    }),

  /**
   * listStaging — Retorna status do job + linhas staged, enriquecidas com Layer-B.
   */
  listStaging: protectedProcedure
    .input(z.object({ jobId: z.number().int() }))
    .query(async ({ input }) => {
      const [task] = await db
        .select({ status: claudeCodeTasks.status, etapa: claudeCodeTasks.etapa })
        .from(claudeCodeTasks)
        .where(eq(claudeCodeTasks.id, input.jobId))
        .limit(1);
      if (!task) throw new TRPCError({ code: "NOT_FOUND", message: "Job SEEU não encontrado" });

      const stagingRows = await db
        .select().from(seeuImportStaging)
        .where(eq(seeuImportStaging.jobId, input.jobId))
        .orderBy(seeuImportStaging.id);

      // Parse FORÇADO SEEU (não auto-detecta) para os campos de exibição. Também
      // injeta o assistido derivado em `assistidoNome` (o worker deixa a coluna
      // nula) para o Layer-B ter nome com que casar contra demandas vivas.
      const comAssistido = (rows: SeeuImportStaging[]) =>
        rows.map((r) => {
          const int = parseSeeuRow(r);
          return int?.assistido ? { ...r, assistidoNome: int.assistido } : r;
        });
      const withParsed = (rows: SeeuImportStaging[]) =>
        rows.map((r) => {
          const int = parseSeeuRow(r);
          return {
            ...r,
            assistidoParsed: int?.assistido ?? null,
            crime: int?.crime ?? null,
            tipoProcesso: int?.tipoProcesso ?? null,
          };
        });

      const base = comAssistido(stagingRows);
      if (task.status === "completed") {
        const demandasVivas = await db.select().from(demandas).where(isNull(demandas.deletedAt));
        const enriched = enrichStagingWithLiveDedup(asPje(base), demandasVivas) as unknown as SeeuImportStaging[];
        return { status: task.status, etapa: task.etapa ?? null, rows: withParsed(enriched) };
      }
      return { status: task.status, etapa: task.etapa ?? null, rows: withParsed(base) };
    }),

  /**
   * confirmarImport — Aplica edições do usuário, importa as linhas selecionadas
   * via importarDemandas, e grava o ledger permanente para TODAS as linhas staged.
   *
   * Ledger upsert: usa SELECT-then-UPDATE/INSERT (partial unique indexes em
   * (processoNumero, seq) quando seq presente, ou contentHash quando seq IS NULL).
   */
  confirmarImport: protectedProcedure
    .input(z.object({
      jobId: z.number().int(),
      selectedIds: z.array(z.number().int()),
      edits: z.record(z.string(), z.record(z.string(), z.unknown())).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const stagingRows = await db
        .select().from(seeuImportStaging)
        .where(eq(seeuImportStaging.jobId, input.jobId));
      const selectedSet = new Set(input.selectedIds);
      const withEdits = stagingRows.map((r) => {
        const e = input.edits?.[String(r.id)];
        return e ? { ...r, revisao: { ...(r.revisao ?? {}), ...e } } : r;
      });
      const importRows = withEdits
        .filter((r) => selectedSet.has(r.id))
        .map((r) => seeuStagingRowToImportRow(r));
      const result = await importarDemandas(importRows, ctx.user.id, false);

      const upserts = buildSeeuLedgerUpserts(withEdits, selectedSet, input.jobId);
      let ledgerWritten = 0;
      await db.transaction(async (tx) => {
        for (const u of upserts) {
          let existing: { id: number } | undefined;
          if (u.processoNumero && u.seq != null) {
            [existing] = await tx.select({ id: seeuLedger.id }).from(seeuLedger)
              .where(and(eq(seeuLedger.processoNumero, u.processoNumero), eq(seeuLedger.seq, u.seq)))
              .limit(1);
          } else {
            [existing] = await tx.select({ id: seeuLedger.id }).from(seeuLedger)
              .where(and(eq(seeuLedger.contentHash, u.contentHash), isNull(seeuLedger.seq)))
              .limit(1);
          }
          if (existing) {
            await tx.update(seeuLedger)
              .set({ decisao: u.decisao, lastSeenAt: new Date(), jobId: u.jobId })
              .where(eq(seeuLedger.id, existing.id));
          } else {
            await tx.insert(seeuLedger).values({
              processoNumero: u.processoNumero,
              seq: u.seq,
              contentHash: u.contentHash,
              atribuicao: u.atribuicao as never,
              ato: u.ato,
              decisao: u.decisao,
              jobId: u.jobId,
            });
          }
          ledgerWritten++;
        }
      });
      return { ...result, ledgerWritten };
    }),
});
