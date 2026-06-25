/**
 * Router de Intimacoes
 *
 * Gerencia o enfileiramento de jobs de importacao de intimacoes PJe
 * via lane browser (skill pje-intimacoes-import).
 */

import { z } from "zod";
import { router, protectedProcedure } from "../init";
import { db } from "@/lib/db";
import { claudeCodeTasks } from "@/lib/db/schema/casos";
import { and, eq, inArray } from "drizzle-orm";

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
});
