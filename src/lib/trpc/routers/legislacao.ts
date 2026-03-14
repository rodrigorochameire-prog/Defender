import { z } from "zod";
import { router, protectedProcedure } from "../init";
import { db } from "@/lib/db";
import { legislacaoDestaques } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";

// ==========================================
// ROUTER DE LEGISLAÇÃO - CONSULTA DE LEIS
// ==========================================

export const legislacaoRouter = router({
  // ==========================================
  // DESTAQUES - Highlights, Notes, Favorites
  // ==========================================

  /** Lista destaques do usuário, opcionalmente filtrando por lei ou tipo */
  listDestaques: protectedProcedure
    .input(z.object({
      leiId: z.string().optional(),
      tipo: z.enum(["highlight", "note", "favorite"]).optional(),
    }).optional())
    .query(async ({ ctx, input }) => {
      const conditions = [eq(legislacaoDestaques.userId, ctx.user.id)];
      if (input?.leiId) conditions.push(eq(legislacaoDestaques.leiId, input.leiId));
      if (input?.tipo) conditions.push(eq(legislacaoDestaques.tipo, input.tipo));

      return db
        .select()
        .from(legislacaoDestaques)
        .where(and(...conditions))
        .orderBy(desc(legislacaoDestaques.createdAt));
    }),

  /** Cria novo destaque (highlight, note ou favorite) */
  createDestaque: protectedProcedure
    .input(z.object({
      leiId: z.string(),
      artigoId: z.string(),
      tipo: z.enum(["highlight", "note", "favorite"]),
      conteudo: z.string().optional(),
      cor: z.enum(["yellow", "green", "blue", "red"]).optional(),
      textoSelecionado: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const [destaque] = await db
        .insert(legislacaoDestaques)
        .values({
          userId: ctx.user.id,
          ...input,
        })
        .returning();
      return destaque;
    }),

  /** Atualiza destaque (conteúdo ou cor) */
  updateDestaque: protectedProcedure
    .input(z.object({
      id: z.number(),
      conteudo: z.string().optional(),
      cor: z.enum(["yellow", "green", "blue", "red"]).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...updates } = input;
      const [updated] = await db
        .update(legislacaoDestaques)
        .set({ ...updates, updatedAt: new Date() })
        .where(and(
          eq(legislacaoDestaques.id, id),
          eq(legislacaoDestaques.userId, ctx.user.id),
        ))
        .returning();
      return updated;
    }),

  /** Remove destaque (somente do próprio usuário) */
  deleteDestaque: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await db
        .delete(legislacaoDestaques)
        .where(and(
          eq(legislacaoDestaques.id, input.id),
          eq(legislacaoDestaques.userId, ctx.user.id),
        ));
      return { success: true };
    }),
});
