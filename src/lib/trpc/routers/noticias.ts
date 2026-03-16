import { z } from "zod";
import { router, protectedProcedure } from "../init";
import { db } from "@/lib/db";
import { noticiasJuridicas, noticiasFontes, noticiasTemas } from "@/lib/db/schema";
import { eq, and, desc, sql, inArray } from "drizzle-orm";

export const noticiasRouter = router({
  // ==========================================
  // FEED - Listagem paginada com filtros
  // ==========================================

  list: protectedProcedure
    .input(z.object({
      categoria: z.enum(["legislativa", "jurisprudencial", "artigo"]).optional(),
      fonte: z.string().optional(),
      tag: z.string().optional(),
      busca: z.string().optional(),
      status: z.enum(["pendente", "aprovado", "descartado"]).default("aprovado"),
      limit: z.number().min(1).max(50).default(20),
      cursor: z.number().optional(),
    }))
    .query(async ({ input }) => {
      const conditions = [eq(noticiasJuridicas.status, input.status)];

      if (input.categoria) conditions.push(eq(noticiasJuridicas.categoria, input.categoria));
      if (input.fonte) conditions.push(eq(noticiasJuridicas.fonte, input.fonte));
      if (input.busca) conditions.push(
        sql`(${noticiasJuridicas.titulo} ILIKE ${'%' + input.busca + '%'} OR ${noticiasJuridicas.resumo} ILIKE ${'%' + input.busca + '%'})`
      );
      if (input.tag) conditions.push(
        sql`${noticiasJuridicas.tags}::jsonb ? ${input.tag}`
      );
      if (input.cursor) conditions.push(
        sql`${noticiasJuridicas.id} < ${input.cursor}`
      );

      const items = await db.select()
        .from(noticiasJuridicas)
        .where(and(...conditions))
        .orderBy(desc(noticiasJuridicas.publicadoEm), desc(noticiasJuridicas.id))
        .limit(input.limit + 1);

      const hasMore = items.length > input.limit;
      if (hasMore) items.pop();

      return {
        items,
        nextCursor: hasMore ? items[items.length - 1]?.id : undefined,
      };
    }),

  // ==========================================
  // TRIAGEM - Pendentes para curadoria
  // ==========================================

  listPendentes: protectedProcedure
    .query(async () => {
      return db.select()
        .from(noticiasJuridicas)
        .where(eq(noticiasJuridicas.status, "pendente"))
        .orderBy(desc(noticiasJuridicas.scrapeadoEm));
    }),

  countPendentes: protectedProcedure
    .query(async () => {
      const [result] = await db.select({ count: sql<number>`count(*)` })
        .from(noticiasJuridicas)
        .where(eq(noticiasJuridicas.status, "pendente"));
      return result?.count ?? 0;
    }),

  aprovar: protectedProcedure
    .input(z.object({ ids: z.array(z.number()) }))
    .mutation(async ({ ctx, input }) => {
      await db.update(noticiasJuridicas)
        .set({
          status: "aprovado",
          aprovadoPor: ctx.user.id,
          aprovadoEm: new Date(),
          updatedAt: new Date(),
        })
        .where(inArray(noticiasJuridicas.id, input.ids));
      return { success: true, count: input.ids.length };
    }),

  descartar: protectedProcedure
    .input(z.object({ ids: z.array(z.number()) }))
    .mutation(async ({ ctx, input }) => {
      await db.update(noticiasJuridicas)
        .set({
          status: "descartado",
          aprovadoPor: ctx.user.id,
          aprovadoEm: new Date(),
          updatedAt: new Date(),
        })
        .where(inArray(noticiasJuridicas.id, input.ids));
      return { success: true, count: input.ids.length };
    }),

  updateCategoria: protectedProcedure
    .input(z.object({
      id: z.number(),
      categoria: z.enum(["legislativa", "jurisprudencial", "artigo"]),
    }))
    .mutation(async ({ input }) => {
      const [updated] = await db.update(noticiasJuridicas)
        .set({ categoria: input.categoria, updatedAt: new Date() })
        .where(eq(noticiasJuridicas.id, input.id))
        .returning();
      return updated;
    }),

  updateTags: protectedProcedure
    .input(z.object({
      id: z.number(),
      tags: z.array(z.string()),
    }))
    .mutation(async ({ input }) => {
      const [updated] = await db.update(noticiasJuridicas)
        .set({ tags: input.tags, updatedAt: new Date() })
        .where(eq(noticiasJuridicas.id, input.id))
        .returning();
      return updated;
    }),

  // ==========================================
  // SCRAPE MANUAL
  // ==========================================

  buscarAgora: protectedProcedure
    .mutation(async () => {
      const { scrapeAllFontes } = await import("@/lib/noticias/scraper");
      return scrapeAllFontes();
    }),

  // ==========================================
  // FONTES - Config
  // ==========================================

  listFontes: protectedProcedure
    .query(async () => {
      return db.select().from(noticiasFontes).orderBy(noticiasFontes.nome);
    }),

  toggleFonte: protectedProcedure
    .input(z.object({ id: z.number(), ativo: z.boolean() }))
    .mutation(async ({ input }) => {
      const [updated] = await db.update(noticiasFontes)
        .set({ ativo: input.ativo })
        .where(eq(noticiasFontes.id, input.id))
        .returning();
      return updated;
    }),

  // ==========================================
  // TEMAS CUSTOM - Tags do usuário
  // ==========================================

  listTemas: protectedProcedure
    .query(async ({ ctx }) => {
      return db.select()
        .from(noticiasTemas)
        .where(eq(noticiasTemas.userId, ctx.user.id))
        .orderBy(noticiasTemas.nome);
    }),

  createTema: protectedProcedure
    .input(z.object({
      nome: z.string().min(2),
      keywords: z.array(z.string()),
    }))
    .mutation(async ({ ctx, input }) => {
      const [tema] = await db.insert(noticiasTemas)
        .values({ userId: ctx.user.id, ...input })
        .returning();
      return tema;
    }),

  deleteTema: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await db.delete(noticiasTemas)
        .where(and(
          eq(noticiasTemas.id, input.id),
          eq(noticiasTemas.userId, ctx.user.id),
        ));
      return { success: true };
    }),

  // ==========================================
  // DETALHES - Notícia individual
  // ==========================================

  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const [noticia] = await db.select()
        .from(noticiasJuridicas)
        .where(eq(noticiasJuridicas.id, input.id))
        .limit(1);
      return noticia ?? null;
    }),
});
