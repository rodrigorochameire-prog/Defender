import { z } from "zod";
import { router, protectedProcedure } from "../init";
import { db } from "@/lib/db";
import { objetosApreendidos, participacoesObjeto } from "@/lib/db/schema";
import { eq, and, isNull, desc, ilike, or, SQL } from "drizzle-orm";

export const objetosRouter = router({
  list: protectedProcedure
    .input(z.object({
      search: z.string().optional(),
      tipo: z.string().optional(),
      limit: z.number().max(200).default(50),
      offset: z.number().default(0),
    }))
    .query(async ({ input, ctx }) => {
      const wid = ctx.user.workspaceId ?? 1;
      const conds: SQL[] = [
        eq(objetosApreendidos.workspaceId, wid),
        isNull(objetosApreendidos.mergedInto),
      ];
      if (input.search) {
        const s = or(
          ilike(objetosApreendidos.descricao, `%${input.search}%`),
          ilike(objetosApreendidos.marca, `%${input.search}%`),
          ilike(objetosApreendidos.modelo, `%${input.search}%`),
        );
        if (s) conds.push(s);
      }
      if (input.tipo) conds.push(eq(objetosApreendidos.tipo, input.tipo));
      return await db.select().from(objetosApreendidos)
        .where(and(...conds))
        .orderBy(desc(objetosApreendidos.updatedAt))
        .limit(input.limit).offset(input.offset);
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input, ctx }) => {
      const wid = ctx.user.workspaceId ?? 1;
      const [row] = await db.select().from(objetosApreendidos)
        .where(and(eq(objetosApreendidos.id, input.id), eq(objetosApreendidos.workspaceId, wid)))
        .limit(1);
      return row ?? null;
    }),

  create: protectedProcedure
    .input(z.object({
      tipo: z.string().min(1),
      descricao: z.string().min(1),
      marca: z.string().optional().nullable(),
      modelo: z.string().optional().nullable(),
      numeroSerie: z.string().optional().nullable(),
      quantidade: z.number().optional().nullable(),
      unidade: z.string().optional().nullable(),
      observacoes: z.string().optional().nullable(),
    }))
    .mutation(async ({ input, ctx }) => {
      const wid = ctx.user.workspaceId ?? 1;
      const [row] = await db.insert(objetosApreendidos).values({
        workspaceId: wid,
        tipo: input.tipo,
        descricao: input.descricao,
        marca: input.marca ?? null,
        modelo: input.modelo ?? null,
        numeroSerie: input.numeroSerie ?? null,
        quantidade: input.quantidade != null ? String(input.quantidade) : null,
        unidade: input.unidade ?? null,
        observacoes: input.observacoes ?? null,
        fonteCriacao: "manual",
      }).returning({ id: objetosApreendidos.id });
      return { id: row.id };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const wid = ctx.user.workspaceId ?? 1;
      await db.delete(participacoesObjeto).where(eq(participacoesObjeto.objetoId, input.id));
      await db.delete(objetosApreendidos)
        .where(and(eq(objetosApreendidos.id, input.id), eq(objetosApreendidos.workspaceId, wid)));
      return { deleted: true };
    }),

  getParticipacoesDoProcesso: protectedProcedure
    .input(z.object({ processoId: z.number() }))
    .query(async ({ input }) => {
      return await db.select({
        participacao: participacoesObjeto,
        objeto: objetosApreendidos,
      })
        .from(participacoesObjeto)
        .leftJoin(objetosApreendidos, eq(objetosApreendidos.id, participacoesObjeto.objetoId))
        .where(eq(participacoesObjeto.processoId, input.processoId))
        .orderBy(desc(participacoesObjeto.createdAt));
    }),
});
