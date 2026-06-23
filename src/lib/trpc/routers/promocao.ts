import { z } from "zod";
import { sql } from "drizzle-orm";
import { router, protectedProcedure } from "../init";
import { db } from "@/lib/db";
import { promocaoLog } from "@/lib/db/schema/promocao";
import { backfillPromocaoPessoas } from "@/lib/promocao/backfill";

export const promocaoRouter = router({
  /**
   * Dispara o backfill de promoção de pessoas (idempotente). Processa um lote de
   * processos ainda não promovidos a partir das duas fontes (case_personas e
   * analysisData). Restrito ao workspace do usuário.
   */
  backfillPessoas: protectedProcedure
    .input(z.object({ limite: z.number().int().min(1).max(500).optional() }).optional())
    .mutation(async ({ ctx, input }) => {
      const workspaceId = ctx.user.workspaceId ?? 1;
      return backfillPromocaoPessoas({ limite: input?.limite, workspaceId });
    }),

  /** Contagem de decisões de promoção agrupadas por ação (auditoria). */
  stats: protectedProcedure.query(async () => {
    const rows = await db
      .select({
        acao: promocaoLog.acao,
        total: sql<number>`count(*)::int`,
      })
      .from(promocaoLog)
      .groupBy(promocaoLog.acao);
    return rows;
  }),
});
