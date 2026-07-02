import { z } from "zod";
import { and, eq, isNotNull, isNull, desc } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../init";
import { db } from "@/lib/db";
import { demandas, processos } from "@/lib/db/schema/core";
import { registros } from "@/lib/db/schema/agenda";
import { claudeCodeTasks } from "@/lib/db/schema/casos";

export const PECA_SUGERIDA_TO_REFERENCE: Record<string, { vvd?: string; juri?: string }> = {
  memoriais: { vvd: "vvd_alegacoes_finais", juri: "alegacoes_finais_juri" },
  resposta_acusacao: { vvd: "vvd_analise_para_ra" },
  apelacao: { vvd: "vvd_apelacao", juri: "apelacao_pos_juri" },
  rese: { vvd: "vvd_contrarrazoes_rese" },
  contrarrazoes: { vvd: "vvd_contrarrazoes_apelacao" },
};
const JURI_ATRIBS = new Set(["JURI_CAMACARI", "GRUPO_JURI"]);
const VVD_ATRIBS = new Set(["VVD_CAMACARI"]);

export function refParaAtribuicao(pecaSugerida: string, atribuicao: string): string | null {
  const m = PECA_SUGERIDA_TO_REFERENCE[pecaSugerida];
  if (!m) return null;
  if (JURI_ATRIBS.has(atribuicao)) return m.juri ?? null;
  if (VVD_ATRIBS.has(atribuicao)) return m.vvd ?? null;
  return null;
}

export function isElegivelRascunho(input: {
  statusAnalise: string | null; pecaSugerida: string | null | undefined; atribuicao: string;
}): { ok: true } | { ok: false; motivo: string } {
  if (input.statusAnalise !== "concluida")
    return { ok: false, motivo: "Análise profunda ainda não concluída." };
  if (!input.pecaSugerida)
    return { ok: false, motivo: "Demanda sem peça sugerida." };
  if (!refParaAtribuicao(input.pecaSugerida, input.atribuicao))
    return { ok: false, motivo: "Peça/atribuição fora do MVP (só Júri/VVD com peça mapeável)." };
  return { ok: true };
}

export function buildRascunhoTaskMeta(input: {
  demandaId: number; pecaSugerida: string; atribuicao: string; linhasMestras: string;
}): string {
  return JSON.stringify({
    demandaId: input.demandaId, pecaSugerida: input.pecaSugerida,
    atribuicao: input.atribuicao, linhasMestras: input.linhasMestras, fonte: "fase2c2b",
  });
}

const EM_ANDAMENTO_RASCUNHO = ["rascunhando"] as const;

export const rascunhoPecaRouter = router({
  criar: protectedProcedure
    .input(z.object({ demandaId: z.number().int(), linhasMestras: z.string().default("") }))
    .mutation(async ({ ctx, input }) => {
      const [d] = await db
        .select({
          id: demandas.id,
          assistidoId: demandas.assistidoId,
          processoId: demandas.processoId,
          statusAnalise: demandas.analiseProfundaStatus,
          rascunhoStatus: demandas.rascunhoStatus,
          rascunhoTaskId: demandas.rascunhoTaskId,
        })
        .from(demandas)
        .where(and(eq(demandas.id, input.demandaId), isNull(demandas.deletedAt)))
        .limit(1);
      if (!d) throw new TRPCError({ code: "NOT_FOUND", message: "Demanda não encontrada" });

      // Dedup: já em andamento → devolve a task corrente.
      if (d.rascunhoStatus && (EM_ANDAMENTO_RASCUNHO as readonly string[]).includes(d.rascunhoStatus)) {
        return { success: true as const, taskId: d.rascunhoTaskId ?? 0, existing: true };
      }

      // Atribuição (do processo) + peca_sugerida (do registro de análise da 2a).
      const [proc] = await db
        .select({ atribuicao: processos.atribuicao })
        .from(processos)
        .where(and(eq(processos.id, d.processoId), isNull(processos.deletedAt)))
        .limit(1);
      const [reg] = await db
        .select({ enrichment: registros.enrichmentData })
        .from(registros)
        .where(and(
          eq(registros.demandaId, input.demandaId),
          eq(registros.tipo, "analise"),
          isNotNull(registros.enrichmentData),
        ))
        .orderBy(desc(registros.id))
        .limit(1);
      const pecaSugerida = (reg?.enrichment as Record<string, unknown> | undefined)?.["peca_sugerida"] as
        | string | null | undefined;

      const eleg = isElegivelRascunho({
        statusAnalise: d.statusAnalise ?? null,
        pecaSugerida,
        atribuicao: String(proc?.atribuicao ?? ""),
      });
      if (!eleg.ok) throw new TRPCError({ code: "PRECONDITION_FAILED", message: eleg.motivo });

      const [task] = await db
        .insert(claudeCodeTasks)
        .values({
          assistidoId: d.assistidoId,
          processoId: d.processoId,
          skill: "gerar-peca",
          lane: "ai",
          prompt: `Rascunho de peça guiado — demanda ${input.demandaId}`,
          instrucaoAdicional: buildRascunhoTaskMeta({
            demandaId: input.demandaId,
            pecaSugerida: pecaSugerida!,
            atribuicao: String(proc?.atribuicao ?? ""),
            linhasMestras: input.linhasMestras,
          }),
          status: "pending",
          createdBy: ctx.user.id,
        })
        .returning({ id: claudeCodeTasks.id });

      await db
        .update(demandas)
        .set({ rascunhoStatus: "rascunhando", rascunhoTaskId: task.id, rascunhoDriveUrl: null })
        .where(eq(demandas.id, input.demandaId));

      return { success: true as const, taskId: task.id, existing: false };
    }),

  status: protectedProcedure
    .input(z.object({ demandaId: z.number().int() }))
    .query(async ({ input }) => {
      const [d] = await db
        .select({
          rascunhoStatus: demandas.rascunhoStatus,
          taskId: demandas.rascunhoTaskId,
          driveUrl: demandas.rascunhoDriveUrl,
        })
        .from(demandas)
        .where(eq(demandas.id, input.demandaId))
        .limit(1);
      if (!d) throw new TRPCError({ code: "NOT_FOUND", message: "Demanda não encontrada" });

      let status = d.rascunhoStatus ?? null;
      let erro: string | null = null;

      // Deriva-na-leitura (padrão statusVarredura / analiseProfunda): a task corrente fecha o estado.
      if (d.taskId && status === "rascunhando") {
        const [t] = await db
          .select({ tstatus: claudeCodeTasks.status, terro: claudeCodeTasks.erro })
          .from(claudeCodeTasks)
          .where(eq(claudeCodeTasks.id, d.taskId))
          .limit(1);
        if (t?.tstatus === "failed") {
          status = "erro";
          erro = t.terro ?? null;
        } else if (t?.tstatus === "completed") {
          status = "pronto";
          await db.update(demandas).set({ rascunhoStatus: "pronto" }).where(eq(demandas.id, input.demandaId));
        }
      }
      return { status, driveUrl: d.driveUrl ?? null, erro };
    }),
});
