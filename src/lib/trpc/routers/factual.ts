import { z } from "zod";
import { router, protectedProcedure } from "../init";
import { db } from "@/lib/db";
import {
  factualEdicoes,
  factualArtigos,
  factualFavoritos,
  factualSecoes,
} from "@/lib/db/schema";
import { eq, and, desc, sql, inArray } from "drizzle-orm";

// ==========================================
// FACTUAL — DIÁRIO DA BAHIA
// ==========================================

export const factualRouter = router({

  // ------------------------------------------
  // Edições
  // ------------------------------------------

  /** Lista edições (mais recentes primeiro) */
  listEdicoes: protectedProcedure
    .input(z.object({
      limit: z.number().min(1).max(50).default(10),
      status: z.enum(["rascunho", "publicado", "arquivado"]).optional(),
    }).optional())
    .query(async ({ input }) => {
      const limit = input?.limit ?? 10;
      const conditions = input?.status
        ? eq(factualEdicoes.status, input.status)
        : undefined;

      return db
        .select()
        .from(factualEdicoes)
        .where(conditions)
        .orderBy(desc(factualEdicoes.dataEdicao))
        .limit(limit);
    }),

  /** Edição mais recente publicada (ou qualquer se não houver publicada) */
  getLatestEdicao: protectedProcedure
    .query(async () => {
      // Tenta publicada primeiro
      const [publicada] = await db
        .select()
        .from(factualEdicoes)
        .where(eq(factualEdicoes.status, "publicado"))
        .orderBy(desc(factualEdicoes.dataEdicao))
        .limit(1);

      if (publicada) return publicada;

      // Fallback: qualquer edição
      const [qualquer] = await db
        .select()
        .from(factualEdicoes)
        .orderBy(desc(factualEdicoes.dataEdicao))
        .limit(1);

      return qualquer ?? null;
    }),

  /** Busca edição por ID com artigos */
  getEdicao: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const [edicao] = await db
        .select()
        .from(factualEdicoes)
        .where(eq(factualEdicoes.id, input.id))
        .limit(1);

      if (!edicao) return null;

      const artigos = await db
        .select()
        .from(factualArtigos)
        .where(eq(factualArtigos.edicaoId, input.id))
        .orderBy(factualArtigos.secao, factualArtigos.ordem);

      return { ...edicao, artigos };
    }),

  /** Artigos de uma edição agrupados por seção */
  getArtigosPorSecao: protectedProcedure
    .input(z.object({ edicaoId: z.number() }))
    .query(async ({ input }) => {
      const artigos = await db
        .select()
        .from(factualArtigos)
        .where(eq(factualArtigos.edicaoId, input.edicaoId))
        .orderBy(factualArtigos.secao, factualArtigos.ordem);

      // Agrupar por seção mantendo ordem
      const secoes: Record<string, typeof artigos> = {};
      for (const artigo of artigos) {
        if (!secoes[artigo.secao]) secoes[artigo.secao] = [];
        secoes[artigo.secao].push(artigo);
      }

      return secoes;
    }),

  // ------------------------------------------
  // Publicação
  // ------------------------------------------

  /** Publicar uma edição */
  publicarEdicao: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      await db
        .update(factualEdicoes)
        .set({
          status: "publicado",
          publicadoPor: ctx.user.id,
          publicadoEm: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(factualEdicoes.id, input.id));

      return { success: true };
    }),

  // ------------------------------------------
  // Favoritos
  // ------------------------------------------

  /** IDs dos artigos favoritados pelo usuário */
  getFavoritosIds: protectedProcedure
    .query(async ({ ctx }) => {
      const favs = await db
        .select({ artigoId: factualFavoritos.artigoId })
        .from(factualFavoritos)
        .where(eq(factualFavoritos.userId, ctx.user.id));

      return favs.map(f => f.artigoId);
    }),

  /** Lista completa de favoritos com dados do artigo */
  listFavoritos: protectedProcedure
    .query(async ({ ctx }) => {
      const favs = await db
        .select({
          id: factualFavoritos.id,
          artigoId: factualFavoritos.artigoId,
          nota: factualFavoritos.nota,
          createdAt: factualFavoritos.createdAt,
          titulo: factualArtigos.titulo,
          resumo: factualArtigos.resumo,
          fonteNome: factualArtigos.fonteNome,
          fonteUrl: factualArtigos.fonteUrl,
          secao: factualArtigos.secao,
        })
        .from(factualFavoritos)
        .innerJoin(factualArtigos, eq(factualFavoritos.artigoId, factualArtigos.id))
        .where(eq(factualFavoritos.userId, ctx.user.id))
        .orderBy(desc(factualFavoritos.createdAt));

      return favs;
    }),

  /** Toggle favorito */
  toggleFavorito: protectedProcedure
    .input(z.object({ artigoId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const existing = await db
        .select({ id: factualFavoritos.id })
        .from(factualFavoritos)
        .where(and(
          eq(factualFavoritos.userId, ctx.user.id),
          eq(factualFavoritos.artigoId, input.artigoId),
        ))
        .limit(1);

      if (existing.length > 0) {
        await db
          .delete(factualFavoritos)
          .where(eq(factualFavoritos.id, existing[0].id));
        return { favorited: false };
      }

      await db.insert(factualFavoritos).values({
        userId: ctx.user.id,
        artigoId: input.artigoId,
      });
      return { favorited: true };
    }),

  /** Limpar todos os favoritos */
  clearFavoritos: protectedProcedure
    .mutation(async ({ ctx }) => {
      await db
        .delete(factualFavoritos)
        .where(eq(factualFavoritos.userId, ctx.user.id));
      return { success: true };
    }),

  // ------------------------------------------
  // Pipeline — Trigger manual
  // ------------------------------------------

  /** Dispara o pipeline de coleta */
  triggerPipeline: protectedProcedure
    .mutation(async () => {
      try {
        const { runFactualPipeline } = await import("@/lib/factual/scraper");
        const results = await runFactualPipeline();
        return { success: true, results };
      } catch (error) {
        console.error("[factual] Pipeline error:", error);
        return {
          success: false,
          message: error instanceof Error ? error.message : String(error),
        };
      }
    }),

  // ------------------------------------------
  // Seções (config)
  // ------------------------------------------

  /** Lista seções configuradas */
  listSecoes: protectedProcedure
    .input(z.object({
      jornal: z.enum(["factual", "juridico", "radar"]).default("factual"),
    }).optional())
    .query(async ({ input }) => {
      const jornal = input?.jornal ?? "factual";
      return db
        .select()
        .from(factualSecoes)
        .where(eq(factualSecoes.jornal, jornal))
        .orderBy(factualSecoes.ordem);
    }),

  // ------------------------------------------
  // Estatísticas
  // ------------------------------------------

  /** Stats rápidas para o header */
  stats: protectedProcedure
    .query(async () => {
      const [edicaoCount] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(factualEdicoes);

      const [artigoCount] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(factualArtigos);

      const [latestEdicao] = await db
        .select({
          dataEdicao: factualEdicoes.dataEdicao,
          totalArtigos: factualEdicoes.totalArtigos,
        })
        .from(factualEdicoes)
        .orderBy(desc(factualEdicoes.dataEdicao))
        .limit(1);

      return {
        totalEdicoes: edicaoCount?.count ?? 0,
        totalArtigos: artigoCount?.count ?? 0,
        ultimaEdicao: latestEdicao ?? null,
      };
    }),

  // ------------------------------------------
  // Importar edição a partir de JSON externo
  // ------------------------------------------

  /** Importa JSON no formato do news-hub-saas (Python pipeline) */
  importarJson: protectedProcedure
    .input(z.object({
      titulo: z.string().default("Diário da Bahia"),
      sections: z.array(z.object({
        name: z.string(),
        articles: z.array(z.object({
          title: z.string(),
          summary: z.string(),
          source_name: z.string(),
          source_url: z.string(),
        })),
      })),
      updated_at: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      // Criar edição
      const [edicao] = await db
        .insert(factualEdicoes)
        .values({
          titulo: input.titulo,
          subtitulo: "Camaçari · Salvador · Bahia · Brasil · Mundo",
          dataEdicao: new Date(),
          totalArtigos: input.sections.reduce((s, sec) => s + sec.articles.length, 0),
          secoes: input.sections.map(s => s.name),
          status: "publicado",
          publicadoPor: ctx.user.id,
          publicadoEm: new Date(),
        })
        .returning();

      // Inserir artigos
      let totalInseridos = 0;
      for (const section of input.sections) {
        for (let i = 0; i < section.articles.length; i++) {
          const art = section.articles[i];
          await db.insert(factualArtigos).values({
            edicaoId: edicao.id,
            secao: section.name,
            titulo: art.title,
            resumo: art.summary,
            fonteNome: art.source_name,
            fonteUrl: art.source_url,
            ordem: i,
            destaque: i < 3 && section === input.sections[0],
          });
          totalInseridos++;
        }
      }

      return { edicaoId: edicao.id, totalInseridos };
    }),
});
