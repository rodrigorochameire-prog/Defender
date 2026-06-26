/**
 * Router de Intimacoes
 *
 * Gerencia o enfileiramento de jobs de importacao de intimacoes PJe
 * via lane browser (skill pje-intimacoes-import).
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../init";
import { db } from "@/lib/db";
import { claudeCodeTasks } from "@/lib/db/schema/casos";
import { pjeImportStaging, pjeIntimacoesLedger, demandas } from "@/lib/db/schema";
import { and, desc, eq, inArray, isNull } from "drizzle-orm";
import {
  enrichStagingWithLiveDedup,
  stagingRowToImportRow,
  buildLedgerUpserts,
  parseStagingRow,
} from "@/lib/services/pje-intimacoes-import";
import type { PjeImportStaging } from "@/lib/db/schema/pje-import";

/**
 * Enriquece linhas de staging com os campos SEMÂNTICOS do parser canônico
 * (crime, tipoProcesso, vara, MPU, assistido title-case) — os mesmos que serão
 * gravados na importação — para a tela de revisão ficar tão rica quanto o import
 * manual. Parser é puro/regex; barato mesmo em dezenas de linhas.
 */
// Extrai a "Data limite prevista para ciência/manifestação: [Dia-da-semana,] DD/MM/YYYY"
// do texto cru do expediente → ISO date (YYYY-MM-DD), ou null. É o prazo que o PJe
// mostra ao defensor; a urgência (dias restantes) é calculada no cliente.
function extrairDataLimite(conteudo: string | null): string | null {
  if (!conteudo) return null;
  const m = conteudo.match(
    /Data limite prevista[^:]*:\s*(?:[A-Za-zÀ-ÿ-]+,?\s*)?(\d{2})\/(\d{2})\/(\d{4})/i,
  );
  return m ? `${m[3]}-${m[2]}-${m[1]}` : null;
}

function comCamposParseados(rows: PjeImportStaging[]) {
  return rows.map((r) => {
    const int = parseStagingRow(r)?.int;
    return {
      ...r,
      crime: int?.crime ?? null,
      tipoProcesso: int?.tipoProcesso ?? null,
      vara: int?.vara ?? null,
      isMPU: Boolean(int?.isMPU),
      assistidoParsed: int?.assistido ?? null,
      dataLimite: extrairDataLimite(r.conteudo),
    };
  });
}
import { importarDemandas } from "@/lib/services/pje-import";

// ==========================================
// INTIMACOES ROUTER
// ==========================================

const ATRIBUICOES_PERMITIDAS = ["VVD_CAMACARI", "JURI_CAMACARI"] as const;

const criarImportJobInput = z.object({
  atribuicoes: z.array(z.enum(ATRIBUICOES_PERMITIDAS)).min(1),
  since: z.string().optional(), // YYYY-MM-DD
  until: z.string().optional(), // YYYY-MM-DD
  limit: z.number().int().min(1).max(500).optional(),
});

export type CriarImportJobInput = z.infer<typeof criarImportJobInput>;

export function buildJobMeta(input: CriarImportJobInput) {
  return {
    atribuicoes: input.atribuicoes,
    since: input.since,
    until: input.until,
    limit: input.limit ?? 80,
  };
}

export const intimacoesRouter = router({
  /**
   * criarImportJob — Enfileira importacao de intimacoes PJe (lane browser).
   * Dedup: retorna job existente se ja houver um pending/processing.
   */
  criarImportJob: protectedProcedure
    .input(criarImportJobInput)
    .mutation(async ({ ctx, input }) => {
      // Dedup: nao enfileira se ja houver um import ativo — evita imports concorrentes.
      const emAndamento = await db
        .select({ id: claudeCodeTasks.id })
        .from(claudeCodeTasks)
        .where(
          and(
            eq(claudeCodeTasks.skill, "pje-intimacoes-import"),
            inArray(claudeCodeTasks.status, ["pending", "processing"]),
          ),
        )
        .limit(1);

      if (emAndamento.length > 0) {
        return { success: true, existing: true, taskId: emAndamento[0].id };
      }

      const meta = buildJobMeta(input);
      const [task] = await db
        .insert(claudeCodeTasks)
        .values({
          skill: "pje-intimacoes-import",
          lane: "browser",
          prompt: `Importar intimacoes PJe — ${meta.atribuicoes.join(", ")} (lane browser)`,
          instrucaoAdicional: JSON.stringify(meta),
          status: "pending",
          createdBy: ctx.user.id,
        })
        .returning({ id: claudeCodeTasks.id });

      return { success: true, existing: false, taskId: task.id };
    }),

  /**
   * listStaging — Retorna status do job + linhas staged, enriquecidas com Layer-B.
   * Layer-B rebaixa 'nova' → 'incerta' para linhas que batem com demandas vivas.
   */
  listStaging: protectedProcedure
    .input(z.object({ jobId: z.number().int() }))
    .query(async ({ input }) => {
      const [task] = await db
        .select({ status: claudeCodeTasks.status, etapa: claudeCodeTasks.etapa })
        .from(claudeCodeTasks)
        .where(eq(claudeCodeTasks.id, input.jobId))
        .limit(1);

      if (!task) throw new TRPCError({ code: "NOT_FOUND", message: "Job de importação não encontrado" });

      const stagingRows = await db
        .select()
        .from(pjeImportStaging)
        .where(eq(pjeImportStaging.jobId, input.jobId));

      // Layer-B: dedup fuzzy contra demandas vivas — só quando o job está concluído.
      // Durante pending/processing as linhas ainda estão sendo escritas; rodar Layer-B
      // seria parcial e desperdiçaria um full-scan de demandas a cada heartbeat.
      // Nota: demandas não tem coluna processoNumero (usa processoId FK → processos),
      // portanto o scope por número de processo exigiria um join adicional.
      // O gate completed-only cobre o caso principal e já elimina o hot-path.
      if (task.status === "completed") {
        const demandasVivas = await db
          .select()
          .from(demandas)
          .where(isNull(demandas.deletedAt));
        const rows = comCamposParseados(
          enrichStagingWithLiveDedup(stagingRows, demandasVivas),
        );
        return { status: task.status, etapa: task.etapa ?? null, rows };
      }
      return {
        status: task.status,
        etapa: task.etapa ?? null,
        rows: comCamposParseados(stagingRows),
      };
    }),

  /**
   * ultimaImportacao — Retorna a última importação concluída (para a UI saber de
   * onde continuar na próxima). Lê o último job completed da skill, com a data de
   * conclusão, total raspado e atribuições cobertas.
   */
  ultimaImportacao: protectedProcedure.query(async () => {
    const [job] = await db
      .select({
        id: claudeCodeTasks.id,
        completedAt: claudeCodeTasks.completedAt,
        createdAt: claudeCodeTasks.createdAt,
        resultado: claudeCodeTasks.resultado,
      })
      .from(claudeCodeTasks)
      .where(
        and(
          eq(claudeCodeTasks.skill, "pje-intimacoes-import"),
          eq(claudeCodeTasks.status, "completed"),
        ),
      )
      .orderBy(desc(claudeCodeTasks.id))
      .limit(1);

    if (!job) return null;
    const r = (job.resultado ?? {}) as {
      raspadas?: number;
      atribuicoes?: string[];
    };
    return {
      jobId: job.id,
      finishedAt: (job.completedAt ?? job.createdAt)?.toISOString() ?? null,
      totalRaspadas: typeof r.raspadas === "number" ? r.raspadas : null,
      atribuicoes: Array.isArray(r.atribuicoes) ? r.atribuicoes : [],
    };
  }),

  /**
   * confirmarImport — Aplica edições do usuário, importa as linhas selecionadas
   * via importarDemandas, e grava o ledger permanente para TODAS as linhas staged.
   *
   * Ledger upsert: usa SELECT-then-UPDATE/INSERT para contornar a limitação do
   * Drizzle com onConflictDoUpdate em partial unique indexes.
   *
   * Nota: importarDemandas retorna apenas contadores agregados (imported/updated/
   * skipped/errors), sem IDs por linha. Por isso demandaId fica null no ledger —
   * não temos como vincular per-row sem refatorar importarDemandas.
   */
  confirmarImport: protectedProcedure
    .input(
      z.object({
        jobId: z.number().int(),
        selectedIds: z.array(z.number().int()),
        edits: z.record(z.string(), z.record(z.string(), z.unknown())).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const stagingRows = await db
        .select()
        .from(pjeImportStaging)
        .where(eq(pjeImportStaging.jobId, input.jobId));

      const selectedSet = new Set(input.selectedIds);

      // Aplica edições da página (revisao) antes de mapear.
      const withEdits = stagingRows.map((r) => {
        const e = input.edits?.[String(r.id)];
        return e ? { ...r, revisao: { ...(r.revisao ?? {}), ...e } } : r;
      });

      const rowsToImport = withEdits.filter((r) => selectedSet.has(r.id));
      const importRows = rowsToImport.map(stagingRowToImportRow);

      const result = await importarDemandas(importRows, ctx.user.id, false);

      // Ledger: grava TODOS os itens staged (imported/skipped/duplicate).
      // Usa SELECT-then-UPDATE/INSERT para contornar partial-index onConflict.
      // Wrapped em transaction para garantir atomicidade: ou grava tudo ou nada.
      const upserts = buildLedgerUpserts(withEdits, selectedSet, input.jobId);
      let ledgerWritten = 0;

      await db.transaction(async (tx) => {
        for (const u of upserts) {
          let existing: { id: number } | undefined;

          if (u.pjeDocumentoId) {
            // Busca pela chave forte: pje_documento_id
            [existing] = await tx
              .select({ id: pjeIntimacoesLedger.id })
              .from(pjeIntimacoesLedger)
              .where(eq(pjeIntimacoesLedger.pjeDocumentoId, u.pjeDocumentoId))
              .limit(1);
          } else {
            // Fallback: content_hash único onde pje_documento_id IS NULL
            [existing] = await tx
              .select({ id: pjeIntimacoesLedger.id })
              .from(pjeIntimacoesLedger)
              .where(
                and(
                  eq(pjeIntimacoesLedger.contentHash, u.contentHash),
                  isNull(pjeIntimacoesLedger.pjeDocumentoId),
                ),
              )
              .limit(1);
          }

          if (existing) {
            await tx
              .update(pjeIntimacoesLedger)
              .set({ decisao: u.decisao, lastSeenAt: new Date(), jobId: u.jobId })
              .where(eq(pjeIntimacoesLedger.id, existing.id));
          } else {
            await tx.insert(pjeIntimacoesLedger).values({
              pjeDocumentoId: u.pjeDocumentoId,
              contentHash: u.contentHash,
              processoNumero: u.processoNumero,
              atribuicao: u.atribuicao as never,
              decisao: u.decisao,
              jobId: u.jobId,
              // demandaId: null — importarDemandas não retorna IDs por linha.
            });
          }

          ledgerWritten++;
        }
      });

      return { ...result, ledgerWritten };
    }),
});
