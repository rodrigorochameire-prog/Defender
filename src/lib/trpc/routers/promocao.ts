import { z } from "zod";
import { sql } from "drizzle-orm";
import { router, protectedProcedure } from "../init";
import { db } from "@/lib/db";
import { promocaoLog } from "@/lib/db/schema/promocao";
import { backfillPromocaoPessoas, backfillPromocaoDepoentes } from "@/lib/promocao/backfill";
import { backfillPromocaoDelitos } from "@/lib/promocao/backfill-delito";
import { backfillPromocaoLocais } from "@/lib/promocao/backfill-locais";
import { backfillPromocaoCautelares } from "@/lib/promocao/backfill-cautelares";

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

  /**
   * Dispara o backfill de promoção de depoentes/testemunhas (idempotente).
   * Diferente de `backfillPessoas` (que só varre processos com case_personas ou
   * analysisData.pessoas), este seleciona processos que têm linhas em
   * `testemunhas` — cobrindo o caso de um processo cujos únicos candidatos a
   * pessoa são depoentes. A promoção em si reusa `promoverProcesso` (que já
   * inclui as três fontes), então a idempotência é a mesma.
   */
  backfillDepoentes: protectedProcedure
    .input(z.object({ limite: z.number().int().min(1).max(500).optional() }).optional())
    .mutation(async ({ ctx, input }) => {
      const workspaceId = ctx.user.workspaceId ?? 1;
      return backfillPromocaoDepoentes({ limite: input?.limite, workspaceId });
    }),

  /**
   * Dispara o backfill de promoção de delitos (idempotente). Processa um lote de
   * processos com `analysisData.imputacoes` ainda não promovidos. Conservador:
   * nunca cria entradas no catálogo (sem-correspondencia é só logada).
   */
  backfillDelitos: protectedProcedure
    .input(z.object({ limite: z.number().int().min(1).max(500).optional() }).optional())
    .mutation(async ({ ctx, input }) => {
      const workspaceId = ctx.user.workspaceId ?? 1;
      return backfillPromocaoDelitos({ limite: input?.limite, workspaceId });
    }),

  /**
   * Dispara o backfill de promoção de lugares (idempotente). Processa um lote de
   * processos com `analysisData.locais` ainda não promovidos. Dedup determinístico
   * por endereço normalizado (escopo de workspace).
   */
  backfillLugares: protectedProcedure
    .input(z.object({ limite: z.number().int().min(1).max(500).optional() }).optional())
    .mutation(async ({ ctx, input }) => {
      const workspaceId = ctx.user.workspaceId ?? 1;
      return backfillPromocaoLocais({ limite: input?.limite, workspaceId });
    }),

  /**
   * Dispara o backfill de promoção de cautelares (idempotente). Processa um lote
   * de processos com `analysisData.pessoas` ainda não promovidos quanto a
   * cautelares. Conservador: nunca cria entradas na taxonomia (sem-correspondencia
   * é só logada).
   */
  backfillCautelares: protectedProcedure
    .input(z.object({ limite: z.number().int().min(1).max(500).optional() }).optional())
    .mutation(async ({ ctx, input }) => {
      const workspaceId = ctx.user.workspaceId ?? 1;
      return backfillPromocaoCautelares({ limite: input?.limite, workspaceId });
    }),

  /**
   * Contagem de decisões de promoção agrupadas por entidade e ação (auditoria).
   * Inclui pessoas (vincular/criar/revisar/ignorar) e delitos
   * (vincular/sem-correspondencia/ignorar).
   */
  stats: protectedProcedure.query(async () => {
    const rows = await db
      .select({
        entidade: promocaoLog.entidade,
        acao: promocaoLog.acao,
        total: sql<number>`count(*)::int`,
      })
      .from(promocaoLog)
      .groupBy(promocaoLog.entidade, promocaoLog.acao);
    return rows;
  }),
});
