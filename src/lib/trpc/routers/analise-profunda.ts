import { z } from "zod";
import { and, eq, isNotNull, isNull, desc } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../init";
import { db } from "@/lib/db";
import { demandas, processos } from "@/lib/db/schema/core";
import { registros } from "@/lib/db/schema/agenda";
import { claudeCodeTasks } from "@/lib/db/schema/casos";

export const ATRIB_ELEGIVEIS_2C = ["JURI_CAMACARI", "GRUPO_JURI", "VVD_CAMACARI"] as const;

export function isElegivel2c(input: {
  atribuicao: string;
  pecaSugerida: string | null | undefined;
}): { ok: true } | { ok: false; motivo: string } {
  if (!(ATRIB_ELEGIVEIS_2C as readonly string[]).includes(input.atribuicao)) {
    return { ok: false, motivo: "Atribuição fora do MVP (só Júri/VVD por ora)." };
  }
  if (!input.pecaSugerida) {
    return { ok: false, motivo: "Demanda não está marcada como 'cabe peça' (sem peca_sugerida)." };
  }
  return { ok: true };
}

export function buildBrowserTaskMeta(input: {
  demandaId: number; processoId: number; assistidoId: number; atribuicao: string; defensorId: number;
}): string {
  return JSON.stringify({
    demandaId: input.demandaId,
    processoId: input.processoId,
    assistidoId: input.assistidoId,
    atribuicao: input.atribuicao,
    defensorId: input.defensorId,
    modo: "cdp",
  });
}

const EM_ANDAMENTO = ["baixando_autos", "analisando"] as const;

export const analiseProfundaRouter = router({
  criar: protectedProcedure
    .input(z.object({ demandaId: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      const [d] = await db
        .select({
          id: demandas.id,
          assistidoId: demandas.assistidoId,
          processoId: demandas.processoId,
          status2c: demandas.analiseProfundaStatus,
          taskId: demandas.analiseProfundaTaskId,
        })
        .from(demandas)
        .where(and(eq(demandas.id, input.demandaId), isNull(demandas.deletedAt)))
        .limit(1);
      if (!d) throw new TRPCError({ code: "NOT_FOUND", message: "Demanda não encontrada" });

      // Dedup: já em andamento → devolve a task corrente.
      if (d.status2c && (EM_ANDAMENTO as readonly string[]).includes(d.status2c)) {
        return { success: true as const, taskId: d.taskId ?? 0, existing: true };
      }

      // Atribuição (do processo) + peca_sugerida (do registro de análise da 2a).
      const [proc] = await db
        .select({ atribuicao: processos.atribuicao, numeroAutos: processos.numeroAutos })
        .from(processos)
        .where(eq(processos.id, d.processoId))
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

      const eleg = isElegivel2c({ atribuicao: String(proc?.atribuicao ?? ""), pecaSugerida });
      if (!eleg.ok) throw new TRPCError({ code: "PRECONDITION_FAILED", message: eleg.motivo });

      const [task] = await db
        .insert(claudeCodeTasks)
        .values({
          assistidoId: d.assistidoId,
          processoId: d.processoId,
          skill: "analise-profunda-demanda",
          lane: "browser",
          prompt: `Análise profunda — demanda ${input.demandaId} (autos → análise, lane browser)`,
          instrucaoAdicional: buildBrowserTaskMeta({
            demandaId: input.demandaId,
            processoId: d.processoId,
            assistidoId: d.assistidoId,
            atribuicao: String(proc?.atribuicao ?? ""),
            defensorId: ctx.user.id,
          }),
          status: "pending",
          createdBy: ctx.user.id,
        })
        .returning({ id: claudeCodeTasks.id });

      await db
        .update(demandas)
        .set({ analiseProfundaStatus: "baixando_autos", analiseProfundaTaskId: task.id })
        .where(eq(demandas.id, input.demandaId));

      return { success: true as const, taskId: task.id, existing: false };
    }),

  status: protectedProcedure
    .input(z.object({ demandaId: z.number().int() }))
    .query(async ({ input }) => {
      const [d] = await db
        .select({ status2c: demandas.analiseProfundaStatus, taskId: demandas.analiseProfundaTaskId })
        .from(demandas)
        .where(eq(demandas.id, input.demandaId))
        .limit(1);
      if (!d) throw new TRPCError({ code: "NOT_FOUND", message: "Demanda não encontrada" });
      let status = d.status2c ?? null;
      let erro: string | null = null;

      // Deriva-na-leitura (padrão statusVarredura): a task corrente fecha o estado.
      if (d.taskId && (status === "baixando_autos" || status === "analisando")) {
        const [t] = await db
          .select({ tstatus: claudeCodeTasks.status, terro: claudeCodeTasks.erro, tlane: claudeCodeTasks.lane })
          .from(claudeCodeTasks)
          .where(eq(claudeCodeTasks.id, d.taskId))
          .limit(1);
        if (t?.tstatus === "failed") { status = "erro"; erro = t.terro ?? null; }
        else if (t?.tstatus === "completed" && t.tlane === "ai") {
          status = "concluida";
          await db.update(demandas).set({ analiseProfundaStatus: "concluida" }).where(eq(demandas.id, input.demandaId));
        }
      }
      return { status, erro };
    }),
});
