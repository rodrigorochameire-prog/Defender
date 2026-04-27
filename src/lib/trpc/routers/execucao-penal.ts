import { z } from "zod";
import { router, protectedProcedure } from "../init";
import { db } from "@/lib/db";
import { execucaoPenal, execucaoPenalEventos, processos } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";

export const execucaoPenalRouter = router({
  getByCaso: protectedProcedure
    .input(z.object({ casoId: z.number() }))
    .query(async ({ input, ctx }) => {
      const wid = ctx.user.workspaceId ?? 1;
      const procs = await db.select({ id: processos.id })
        .from(processos)
        .where(and(eq(processos.casoId, input.casoId), eq(processos.workspaceId, wid)));
      if (procs.length === 0) return null;

      const procIds = procs.map(p => p.id);
      const [exec] = await db.select().from(execucaoPenal)
        .where(eq(execucaoPenal.processoId, procIds[0]))  // pega da primeira (referência ideal)
        .limit(1);
      if (!exec) return null;
      const eventos = await db.select().from(execucaoPenalEventos)
        .where(eq(execucaoPenalEventos.execucaoId, exec.id))
        .orderBy(desc(execucaoPenalEventos.data));
      return { execucao: exec, eventos };
    }),

  upsert: protectedProcedure
    .input(z.object({
      processoId: z.number(),
      pessoaId: z.number().nullable().optional(),
      dataInicioPena: z.string().nullable().optional(),
      dataTerminoPrevisto: z.string().nullable().optional(),
      dataProgressaoPrevista: z.string().nullable().optional(),
      dataLivramentoPrevisto: z.string().nullable().optional(),
      penaTotalDias: z.number().nullable().optional(),
      regimeAtual: z.enum(["fechado", "semiaberto", "aberto", "preso-provisorio"]).nullable().optional(),
      unidadeAtual: z.string().nullable().optional(),
      jaCumpridoDias: z.number().nullable().optional(),
      jaRemidoDias: z.number().nullable().optional(),
      observacoes: z.string().nullable().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const wid = ctx.user.workspaceId ?? 1;
      const [proc] = await db.select({ id: processos.id })
        .from(processos)
        .where(and(eq(processos.id, input.processoId), eq(processos.workspaceId, wid)))
        .limit(1);
      if (!proc) throw new Error("Processo não encontrado");

      const [existing] = await db.select({ id: execucaoPenal.id })
        .from(execucaoPenal)
        .where(eq(execucaoPenal.processoId, input.processoId))
        .limit(1);

      const sharedValues = {
        pessoaId: input.pessoaId ?? null,
        dataInicioPena: input.dataInicioPena ?? null,
        dataTerminoPrevisto: input.dataTerminoPrevisto ?? null,
        dataProgressaoPrevista: input.dataProgressaoPrevista ?? null,
        dataLivramentoPrevisto: input.dataLivramentoPrevisto ?? null,
        penaTotalDias: input.penaTotalDias ?? null,
        regimeAtual: input.regimeAtual ?? null,
        unidadeAtual: input.unidadeAtual ?? null,
        jaCumpridoDias: input.jaCumpridoDias ?? 0,
        jaRemidoDias: input.jaRemidoDias ?? 0,
        observacoes: input.observacoes ?? null,
        fonte: "manual" as const,
        updatedAt: new Date(),
      };

      if (existing) {
        await db.update(execucaoPenal).set(sharedValues).where(eq(execucaoPenal.id, existing.id));
        return { id: existing.id, action: "updated" };
      } else {
        const [row] = await db.insert(execucaoPenal).values({ processoId: input.processoId, ...sharedValues }).returning({ id: execucaoPenal.id });
        return { id: row.id, action: "created" };
      }
    }),

  addEvento: protectedProcedure
    .input(z.object({
      execucaoId: z.number(),
      tipo: z.string(),
      data: z.string(),
      detalhes: z.string().nullable().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const wid = ctx.user.workspaceId ?? 1;
      // ACL via execucao → processo → workspace
      const [exec] = await db.select({ id: execucaoPenal.id, processoId: execucaoPenal.processoId })
        .from(execucaoPenal)
        .innerJoin(processos, eq(processos.id, execucaoPenal.processoId))
        .where(and(eq(execucaoPenal.id, input.execucaoId), eq(processos.workspaceId, wid)))
        .limit(1);
      if (!exec) throw new Error("Execução não encontrada");
      const [row] = await db.insert(execucaoPenalEventos).values({
        execucaoId: input.execucaoId,
        tipo: input.tipo,
        data: input.data,
        detalhes: input.detalhes ?? null,
      }).returning({ id: execucaoPenalEventos.id });
      return { id: row.id };
    }),
});
