import { z } from "zod";
import { router, protectedProcedure } from "../init";
import { db } from "@/lib/db";
import { delitosCatalogo, tipificacoes, processos } from "@/lib/db/schema";
import { eq, and, ilike, or, desc } from "drizzle-orm";

export const tipificacoesRouter = router({
  listCatalogo: protectedProcedure
    .input(z.object({ search: z.string().optional(), area: z.string().optional(), limit: z.number().max(100).default(50) }))
    .query(async ({ input }) => {
      const conds: Parameters<typeof and>[0][] = [];
      if (input.search) {
        conds.push(or(
          ilike(delitosCatalogo.descricaoCurta, `%${input.search}%`),
          ilike(delitosCatalogo.artigo, `%${input.search}%`),
          ilike(delitosCatalogo.codigoLei, `%${input.search}%`),
        ));
      }
      if (input.area) conds.push(eq(delitosCatalogo.areaSugerida, input.area));
      const rows = await db.select().from(delitosCatalogo)
        .where(conds.length ? and(...conds) : undefined)
        .orderBy(delitosCatalogo.codigoLei, delitosCatalogo.artigo)
        .limit(input.limit);
      return rows;
    }),

  getCatalogoById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const [row] = await db.select().from(delitosCatalogo).where(eq(delitosCatalogo.id, input.id)).limit(1);
      return row ?? null;
    }),

  listTipificacoes: protectedProcedure
    .input(z.object({ processoId: z.number() }))
    .query(async ({ input, ctx }) => {
      const wid = ctx.user.workspaceId ?? 1;
      // ACL via processo
      const [proc] = await db.select({ id: processos.id })
        .from(processos)
        .where(and(eq(processos.id, input.processoId), eq(processos.workspaceId, wid)))
        .limit(1);
      if (!proc) throw new Error("Processo não encontrado");
      return await db.select({
        id: tipificacoes.id,
        processoId: tipificacoes.processoId,
        delitoId: tipificacoes.delitoId,
        qualificadoras: tipificacoes.qualificadoras,
        modalidade: tipificacoes.modalidade,
        observacoes: tipificacoes.observacoes,
        fonte: tipificacoes.fonte,
        delitoCodigoLei: delitosCatalogo.codigoLei,
        delitoArtigo: delitosCatalogo.artigo,
        delitoDescricao: delitosCatalogo.descricaoCurta,
        delitoHediondo: delitosCatalogo.hediondo,
      })
        .from(tipificacoes)
        .leftJoin(delitosCatalogo, eq(delitosCatalogo.id, tipificacoes.delitoId))
        .where(eq(tipificacoes.processoId, input.processoId))
        .orderBy(desc(tipificacoes.createdAt));
    }),

  createTipificacao: protectedProcedure
    .input(z.object({
      processoId: z.number(),
      delitoId: z.number(),
      qualificadoras: z.array(z.string()).optional(),
      modalidade: z.enum(["consumada", "tentada"]).default("consumada"),
      observacoes: z.string().optional().nullable(),
    }))
    .mutation(async ({ input, ctx }) => {
      const wid = ctx.user.workspaceId ?? 1;
      const [proc] = await db.select({ id: processos.id })
        .from(processos)
        .where(and(eq(processos.id, input.processoId), eq(processos.workspaceId, wid)))
        .limit(1);
      if (!proc) throw new Error("Processo não encontrado");
      const [row] = await db.insert(tipificacoes).values({
        processoId: input.processoId,
        delitoId: input.delitoId,
        qualificadoras: input.qualificadoras ?? [],
        modalidade: input.modalidade,
        observacoes: input.observacoes ?? null,
        fonte: "manual",
      }).returning({ id: tipificacoes.id });
      return { id: row.id };
    }),

  deleteTipificacao: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const wid = ctx.user.workspaceId ?? 1;
      const [row] = await db.select({ id: tipificacoes.id })
        .from(tipificacoes)
        .innerJoin(processos, eq(processos.id, tipificacoes.processoId))
        .where(and(eq(tipificacoes.id, input.id), eq(processos.workspaceId, wid)))
        .limit(1);
      if (!row) throw new Error("Tipificação não encontrada");
      await db.delete(tipificacoes).where(eq(tipificacoes.id, input.id));
      return { deleted: true };
    }),
});
