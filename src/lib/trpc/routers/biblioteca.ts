import { z } from "zod";
import { router, protectedProcedure } from "../init";
import { db } from "@/lib/db";
import { referencesBiblioteca } from "@/lib/db/schema/biblioteca";
import { eq, and, count } from "drizzle-orm";
import { safeAsync } from "@/lib/errors";

export const bibliotecaRouter = router({
  citarEmCaso: protectedProcedure
    .input(z.object({
      tipo: z.enum(["tese", "artigo", "lei"]),
      referenciaId: z.string(),
      casoId: z.number(),
      observacao: z.string().optional(),
      citacaoFormatada: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      return safeAsync(async () => {
        const [ref] = await db
          .insert(referencesBiblioteca)
          .values({ ...input, createdById: ctx.user.id })
          .returning();
        return ref;
      }, "Erro ao citar referência");
    }),

  removerCitacao: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      return safeAsync(async () => {
        await db
          .delete(referencesBiblioteca)
          .where(and(
            eq(referencesBiblioteca.id, input.id),
            eq(referencesBiblioteca.createdById, ctx.user.id),
          ));
      }, "Erro ao remover citação");
    }),

  listPorCaso: protectedProcedure
    .input(z.object({ casoId: z.number() }))
    .query(async ({ input }) => {
      return safeAsync(async () => {
        return db
          .select()
          .from(referencesBiblioteca)
          .where(eq(referencesBiblioteca.casoId, input.casoId));
      }, "Erro ao listar referências");
    }),

  contarUsos: protectedProcedure
    .input(z.object({
      tipo: z.enum(["tese", "artigo", "lei"]),
      referenciaId: z.string(),
    }))
    .query(async ({ input }) => {
      return safeAsync(async () => {
        const [result] = await db
          .select({ total: count() })
          .from(referencesBiblioteca)
          .where(and(
            eq(referencesBiblioteca.tipo, input.tipo),
            eq(referencesBiblioteca.referenciaId, input.referenciaId),
          ));
        return result?.total ?? 0;
      }, "Erro ao contar usos");
    }),
});
