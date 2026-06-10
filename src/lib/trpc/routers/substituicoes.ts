import { z } from "zod";
import { router, protectedProcedure } from "../init";
import { db } from "@/lib/db";
import { substituicoes } from "@/lib/db/schema";
import { eq, desc, and, gte, lte } from "drizzle-orm";
import { audiencias, processos } from "@/lib/db/schema";
import { sql } from "drizzle-orm";

const substituicaoInput = z.object({
  unidadeSubstituida: z.string().min(1),
  tipo: z.enum(["automatica", "cumulativa", "extraordinaria"]).default("automatica"),
  escopoAtribuicoes: z.array(z.string()).default([]),
  dataInicio: z.string(), // YYYY-MM-DD
  dataFim: z.string().nullable().optional(),
  motivo: z.string().nullable().optional(),
  status: z.enum(["em_andamento", "concluida", "oficiada", "paga"]).default("em_andamento"),
  oficioNumero: z.string().nullable().optional(),
  oficioPath: z.string().nullable().optional(),
  relatorioPath: z.string().nullable().optional(),
  seiProtocolo: z.string().nullable().optional(),
  observacoes: z.string().nullable().optional(),
});

export const substituicoesRouter = router({
  listar: protectedProcedure.query(async () => {
    return db.select().from(substituicoes).orderBy(desc(substituicoes.dataInicio));
  }),

  criar: protectedProcedure
    .input(substituicaoInput)
    .mutation(async ({ input, ctx }) => {
      const [row] = await db
        .insert(substituicoes)
        .values({
          ...input,
          dataFim: input.dataFim ?? null,
          defensorId: (ctx as any)?.user?.id ?? null,
        })
        .returning();
      return row;
    }),

  atualizar: protectedProcedure
    .input(z.object({ id: z.number() }).merge(substituicaoInput.partial()))
    .mutation(async ({ input }) => {
      const { id, ...rest } = input;
      const [row] = await db
        .update(substituicoes)
        .set({ ...rest, updatedAt: new Date() })
        .where(eq(substituicoes.id, id))
        .returning();
      return row;
    }),

  remover: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await db.delete(substituicoes).where(eq(substituicoes.id, input.id));
      return { ok: true };
    }),

  /**
   * Prévia dos dados do período agrupados por atribuição — alimenta o relatório.
   * Filtra audiências do período; o orquestrador da skill complementa com
   * demandas/atendimentos e petições do Drive.
   */
  previewDados: protectedProcedure
    .input(z.object({ dataInicio: z.string(), dataFim: z.string() }))
    .query(async ({ input }) => {
      const rows = await db
        .select({
          atribuicao: processos.atribuicao,
          numero: processos.numeroAutos,
          tipo: audiencias.tipo,
          data: audiencias.dataAudiencia,
        })
        .from(audiencias)
        .leftJoin(processos, eq(audiencias.processoId, processos.id))
        .where(
          and(
            gte(
              sql`DATE(${audiencias.dataAudiencia} AT TIME ZONE 'America/Bahia')`,
              input.dataInicio,
            ),
            lte(
              sql`DATE(${audiencias.dataAudiencia} AT TIME ZONE 'America/Bahia')`,
              input.dataFim,
            ),
          ),
        );
      const porAtribuicao: Record<string, number> = {};
      for (const r of rows) {
        const k = r.atribuicao ?? "—";
        porAtribuicao[k] = (porAtribuicao[k] ?? 0) + 1;
      }
      return { totalAudiencias: rows.length, porAtribuicao, audiencias: rows };
    }),
});
