import { z } from "zod";
import { router, protectedProcedure } from "../init";
import { db } from "@/lib/db";
import {
  radarNoticias,
  radarMatches,
  radarFontes,
  assistidos,
  notifications,
  users,
  processos,
} from "@/lib/db/schema";
import { eq, and, desc, sql, gte, lte, ilike, or, count, isNull, ne } from "drizzle-orm";

// ==========================================
// ROUTER RADAR CRIMINAL
// Monitoramento de notícias policiais + matching com assistidos DPE
// ==========================================

export const radarRouter = router({
  // ==========================================
  // FEED DE NOTÍCIAS
  // ==========================================

  list: protectedProcedure
    .input(
      z.object({
        tipoCrime: z.string().optional(),
        bairro: z.string().optional(),
        fonte: z.string().optional(),
        search: z.string().optional(),
        dataInicio: z.string().optional(),
        dataFim: z.string().optional(),
        soMatches: z.boolean().optional().default(false),
        limit: z.number().min(1).max(100).optional().default(20),
        cursor: z.number().optional(), // id da última notícia para cursor pagination
      })
    )
    .query(async ({ input }) => {
      const conditions = [];

      if (input.tipoCrime && input.tipoCrime !== "todos") {
        conditions.push(eq(radarNoticias.tipoCrime, input.tipoCrime as any));
      }

      if (input.bairro) {
        conditions.push(ilike(radarNoticias.bairro, `%${input.bairro}%`));
      }

      if (input.fonte) {
        conditions.push(eq(radarNoticias.fonte, input.fonte));
      }

      if (input.search) {
        conditions.push(
          or(
            ilike(radarNoticias.titulo, `%${input.search}%`),
            ilike(radarNoticias.bairro, `%${input.search}%`),
            ilike(radarNoticias.resumoIA, `%${input.search}%`)
          )!
        );
      }

      if (input.dataInicio) {
        conditions.push(gte(radarNoticias.dataFato, new Date(input.dataInicio)));
      }

      if (input.dataFim) {
        conditions.push(lte(radarNoticias.dataFato, new Date(input.dataFim)));
      }

      if (input.cursor) {
        conditions.push(sql`${radarNoticias.id} < ${input.cursor}`);
      }

      // Base query
      let query;

      if (input.soMatches) {
        // Só notícias com match
        query = db
          .selectDistinctOn([radarNoticias.id], {
            id: radarNoticias.id,
            url: radarNoticias.url,
            fonte: radarNoticias.fonte,
            titulo: radarNoticias.titulo,
            dataPublicacao: radarNoticias.dataPublicacao,
            dataFato: radarNoticias.dataFato,
            imagemUrl: radarNoticias.imagemUrl,
            tipoCrime: radarNoticias.tipoCrime,
            bairro: radarNoticias.bairro,
            resumoIA: radarNoticias.resumoIA,
            envolvidos: radarNoticias.envolvidos,
            enrichmentStatus: radarNoticias.enrichmentStatus,
            createdAt: radarNoticias.createdAt,
            matchCount: sql<number>`count(${radarMatches.id}) over (partition by ${radarNoticias.id})`,
          })
          .from(radarNoticias)
          .innerJoin(radarMatches, eq(radarNoticias.id, radarMatches.noticiaId))
          .where(conditions.length > 0 ? and(...conditions) : undefined)
          .orderBy(desc(radarNoticias.id))
          .limit(input.limit + 1);
      } else {
        query = db
          .select({
            id: radarNoticias.id,
            url: radarNoticias.url,
            fonte: radarNoticias.fonte,
            titulo: radarNoticias.titulo,
            dataPublicacao: radarNoticias.dataPublicacao,
            dataFato: radarNoticias.dataFato,
            imagemUrl: radarNoticias.imagemUrl,
            tipoCrime: radarNoticias.tipoCrime,
            bairro: radarNoticias.bairro,
            resumoIA: radarNoticias.resumoIA,
            envolvidos: radarNoticias.envolvidos,
            enrichmentStatus: radarNoticias.enrichmentStatus,
            createdAt: radarNoticias.createdAt,
          })
          .from(radarNoticias)
          .where(conditions.length > 0 ? and(...conditions) : undefined)
          .orderBy(desc(radarNoticias.id))
          .limit(input.limit + 1);
      }

      const result = await query;

      const hasMore = result.length > input.limit;
      const items = hasMore ? result.slice(0, -1) : result;
      const nextCursor = hasMore ? items[items.length - 1]?.id : undefined;

      return { items, nextCursor };
    }),

  // Detalhe de uma notícia
  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const [noticia] = await db
        .select()
        .from(radarNoticias)
        .where(eq(radarNoticias.id, input.id));

      if (!noticia) return null;

      // Buscar matches vinculados
      const matches = await db
        .select({
          id: radarMatches.id,
          assistidoId: radarMatches.assistidoId,
          processoId: radarMatches.processoId,
          casoId: radarMatches.casoId,
          nomeEncontrado: radarMatches.nomeEncontrado,
          scoreConfianca: radarMatches.scoreConfianca,
          status: radarMatches.status,
          dadosExtraidos: radarMatches.dadosExtraidos,
          assistidoNome: assistidos.nome,
        })
        .from(radarMatches)
        .leftJoin(assistidos, eq(radarMatches.assistidoId, assistidos.id))
        .where(eq(radarMatches.noticiaId, input.id));

      return { ...noticia, matches };
    }),

  // ==========================================
  // ESTATÍSTICAS
  // ==========================================

  stats: protectedProcedure
    .input(
      z.object({
        periodo: z.enum(["7d", "30d", "90d", "1a", "total"]).optional().default("30d"),
      })
    )
    .query(async ({ input }) => {
      const periodoMap: Record<string, number> = {
        "7d": 7,
        "30d": 30,
        "90d": 90,
        "1a": 365,
      };

      const dias = periodoMap[input.periodo];
      const conditions = [];
      if (dias) {
        const dataInicio = new Date();
        dataInicio.setDate(dataInicio.getDate() - dias);
        conditions.push(gte(radarNoticias.createdAt, dataInicio));
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      // Total de notícias
      const [totalResult] = await db
        .select({ total: count() })
        .from(radarNoticias)
        .where(whereClause);

      // Por tipo de crime
      const porTipo = await db
        .select({
          tipoCrime: radarNoticias.tipoCrime,
          count: count(),
        })
        .from(radarNoticias)
        .where(whereClause)
        .groupBy(radarNoticias.tipoCrime)
        .orderBy(desc(count()));

      // Total de matches
      const matchConditions = [];
      if (dias) {
        const dataInicio = new Date();
        dataInicio.setDate(dataInicio.getDate() - dias);
        matchConditions.push(gte(radarMatches.createdAt, dataInicio));
      }

      const [matchResult] = await db
        .select({ total: count() })
        .from(radarMatches)
        .where(matchConditions.length > 0 ? and(...matchConditions) : undefined);

      // Por mês (para gráfico de barras empilhadas)
      const porMes = await db
        .select({
          mes: sql<string>`to_char(${radarNoticias.createdAt}, 'YYYY-MM')`,
          tipoCrime: radarNoticias.tipoCrime,
          count: count(),
        })
        .from(radarNoticias)
        .where(whereClause)
        .groupBy(sql`to_char(${radarNoticias.createdAt}, 'YYYY-MM')`, radarNoticias.tipoCrime)
        .orderBy(sql`to_char(${radarNoticias.createdAt}, 'YYYY-MM')`);

      return {
        total: Number(totalResult?.total || 0),
        totalMatches: Number(matchResult?.total || 0),
        porTipo: porTipo.map((r) => ({
          tipo: r.tipoCrime || "outros",
          count: Number(r.count),
        })),
        porMes: porMes.map((r) => ({
          mes: r.mes,
          tipo: r.tipoCrime || "outros",
          count: Number(r.count),
        })),
      };
    }),

  statsByBairro: protectedProcedure
    .input(
      z.object({
        periodo: z.enum(["7d", "30d", "90d", "1a", "total"]).optional().default("30d"),
        limit: z.number().optional().default(10),
      })
    )
    .query(async ({ input }) => {
      const periodoMap: Record<string, number> = {
        "7d": 7, "30d": 30, "90d": 90, "1a": 365,
      };

      const dias = periodoMap[input.periodo];
      const conditions = [];
      if (dias) {
        const dataInicio = new Date();
        dataInicio.setDate(dataInicio.getDate() - dias);
        conditions.push(gte(radarNoticias.createdAt, dataInicio));
      }
      conditions.push(sql`${radarNoticias.bairro} IS NOT NULL`);

      const result = await db
        .select({
          bairro: radarNoticias.bairro,
          count: count(),
        })
        .from(radarNoticias)
        .where(and(...conditions))
        .groupBy(radarNoticias.bairro)
        .orderBy(desc(count()))
        .limit(input.limit);

      return result.map((r) => ({
        bairro: r.bairro || "Desconhecido",
        count: Number(r.count),
      }));
    }),

  // Dados para mapa (lat/lng de todas notícias com coordenadas)
  mapData: protectedProcedure
    .input(
      z.object({
        tipoCrime: z.string().optional(),
        dataInicio: z.string().optional(),
        dataFim: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      const conditions = [
        sql`${radarNoticias.latitude} IS NOT NULL`,
        sql`${radarNoticias.longitude} IS NOT NULL`,
      ];

      if (input.tipoCrime && input.tipoCrime !== "todos") {
        conditions.push(eq(radarNoticias.tipoCrime, input.tipoCrime as any));
      }

      if (input.dataInicio) {
        conditions.push(gte(radarNoticias.dataFato, new Date(input.dataInicio)));
      }

      if (input.dataFim) {
        conditions.push(lte(radarNoticias.dataFato, new Date(input.dataFim)));
      }

      const result = await db
        .select({
          id: radarNoticias.id,
          titulo: radarNoticias.titulo,
          tipoCrime: radarNoticias.tipoCrime,
          bairro: radarNoticias.bairro,
          latitude: radarNoticias.latitude,
          longitude: radarNoticias.longitude,
          dataFato: radarNoticias.dataFato,
          envolvidos: radarNoticias.envolvidos,
        })
        .from(radarNoticias)
        .where(and(...conditions));

      return result;
    }),

  // ==========================================
  // MATCHES DPE
  // ==========================================

  matchesList: protectedProcedure
    .input(
      z.object({
        status: z.string().optional(),
        limit: z.number().min(1).max(100).optional().default(50),
        offset: z.number().min(0).optional().default(0),
      })
    )
    .query(async ({ input }) => {
      const conditions = [];

      if (input.status && input.status !== "todos") {
        conditions.push(eq(radarMatches.status, input.status as any));
      }

      const matches = await db
        .select({
          id: radarMatches.id,
          noticiaId: radarMatches.noticiaId,
          assistidoId: radarMatches.assistidoId,
          nomeEncontrado: radarMatches.nomeEncontrado,
          scoreConfianca: radarMatches.scoreConfianca,
          status: radarMatches.status,
          dadosExtraidos: radarMatches.dadosExtraidos,
          createdAt: radarMatches.createdAt,
          // Join notícia
          noticiaTitulo: radarNoticias.titulo,
          noticiaFonte: radarNoticias.fonte,
          noticiaTipoCrime: radarNoticias.tipoCrime,
          noticiaBairro: radarNoticias.bairro,
          noticiaDataFato: radarNoticias.dataFato,
          noticiaResumo: radarNoticias.resumoIA,
          // Join assistido
          assistidoNome: assistidos.nome,
        })
        .from(radarMatches)
        .innerJoin(radarNoticias, eq(radarMatches.noticiaId, radarNoticias.id))
        .leftJoin(assistidos, eq(radarMatches.assistidoId, assistidos.id))
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(radarMatches.scoreConfianca), desc(radarMatches.createdAt))
        .limit(input.limit)
        .offset(input.offset);

      const [totalResult] = await db
        .select({ total: count() })
        .from(radarMatches)
        .where(conditions.length > 0 ? and(...conditions) : undefined);

      return {
        items: matches,
        total: Number(totalResult?.total || 0),
      };
    }),

  confirmMatch: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const [updated] = await db
        .update(radarMatches)
        .set({
          status: "confirmado_manual",
          confirmedBy: ctx.user.id,
          confirmedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(radarMatches.id, input.id))
        .returning();

      return updated;
    }),

  dismissMatch: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const [updated] = await db
        .update(radarMatches)
        .set({
          status: "descartado",
          updatedAt: new Date(),
        })
        .where(eq(radarMatches.id, input.id))
        .returning();

      return updated;
    }),

  // ==========================================
  // FONTES
  // ==========================================

  fontesList: protectedProcedure.query(async () => {
    const fontes = await db
      .select()
      .from(radarFontes)
      .orderBy(radarFontes.nome);

    return fontes;
  }),

  updateFonte: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        ativo: z.boolean().optional(),
        seletorTitulo: z.string().optional(),
        seletorCorpo: z.string().optional(),
        seletorData: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, ...data } = input;

      const [updated] = await db
        .update(radarFontes)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(radarFontes.id, id))
        .returning();

      return updated;
    }),

  // Bairros distintos (para combobox de filtro)
  bairros: protectedProcedure.query(async () => {
    const result = await db
      .selectDistinct({ bairro: radarNoticias.bairro })
      .from(radarNoticias)
      .where(sql`${radarNoticias.bairro} IS NOT NULL`)
      .orderBy(radarNoticias.bairro);

    return result.map((r) => r.bairro!).filter(Boolean);
  }),

  // Fontes distintas (para select de filtro)
  fontesDistintas: protectedProcedure.query(async () => {
    const result = await db
      .selectDistinct({ fonte: radarNoticias.fonte })
      .from(radarNoticias)
      .orderBy(radarNoticias.fonte);

    return result.map((r) => r.fonte);
  }),

  // Matches por assistido (para card no perfil)
  matchesByAssistido: protectedProcedure
    .input(z.object({ assistidoId: z.number() }))
    .query(async ({ input }) => {
      const matches = await db
        .select({
          id: radarMatches.id,
          noticiaId: radarMatches.noticiaId,
          nomeEncontrado: radarMatches.nomeEncontrado,
          scoreConfianca: radarMatches.scoreConfianca,
          status: radarMatches.status,
          dadosExtraidos: radarMatches.dadosExtraidos,
          createdAt: radarMatches.createdAt,
          noticiaTitulo: radarNoticias.titulo,
          noticiaFonte: radarNoticias.fonte,
          noticiaTipoCrime: radarNoticias.tipoCrime,
          noticiaBairro: radarNoticias.bairro,
          noticiaDataFato: radarNoticias.dataFato,
          noticiaResumo: radarNoticias.resumoIA,
          noticiaUrl: radarNoticias.url,
        })
        .from(radarMatches)
        .innerJoin(radarNoticias, eq(radarMatches.noticiaId, radarNoticias.id))
        .where(eq(radarMatches.assistidoId, input.assistidoId))
        .orderBy(desc(radarMatches.scoreConfianca), desc(radarMatches.createdAt));

      return matches;
    }),

  // Trigger pipeline completo no enrichment engine
  triggerPipeline: protectedProcedure.mutation(async () => {
    const engineUrl = process.env.ENRICHMENT_ENGINE_URL;
    const apiKey = process.env.ENRICHMENT_API_KEY;

    if (!engineUrl || !apiKey) {
      return { success: false, message: "Enrichment Engine não configurado" };
    }

    try {
      const response = await fetch(`${engineUrl}/api/radar/pipeline`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": apiKey,
        },
      });

      if (!response.ok) {
        return { success: false, message: `Engine retornou ${response.status}` };
      }

      const data = await response.json();

      // Gerar notificações para novos matches após pipeline
      try {
        await notifyAdminsOfNewMatches();
      } catch {
        // Não falhar o pipeline por causa de notificação
      }

      return { success: true, ...data };
    } catch (error) {
      return { success: false, message: String(error) };
    }
  }),

  // ==========================================
  // NOTIFICAÇÕES
  // ==========================================

  // Gerar notificações para matches recentes (últimas 24h sem notificação)
  notifyNewMatches: protectedProcedure.mutation(async () => {
    const count = await notifyAdminsOfNewMatches();
    return { notified: count };
  }),
});

// ==========================================
// HELPERS
// ==========================================

async function notifyAdminsOfNewMatches(): Promise<number> {
  // Buscar matches das últimas 24h que ainda não geraram notificação
  const oneDayAgo = new Date();
  oneDayAgo.setDate(oneDayAgo.getDate() - 1);

  const recentMatches = await db
    .select({
      id: radarMatches.id,
      nomeEncontrado: radarMatches.nomeEncontrado,
      scoreConfianca: radarMatches.scoreConfianca,
      status: radarMatches.status,
      assistidoId: radarMatches.assistidoId,
      noticiaTitulo: radarNoticias.titulo,
      noticiaTipoCrime: radarNoticias.tipoCrime,
      assistidoNome: assistidos.nome,
    })
    .from(radarMatches)
    .innerJoin(radarNoticias, eq(radarMatches.noticiaId, radarNoticias.id))
    .leftJoin(assistidos, eq(radarMatches.assistidoId, assistidos.id))
    .where(
      and(
        gte(radarMatches.createdAt, oneDayAgo),
        ne(radarMatches.status, "descartado"),
      )
    )
    .orderBy(desc(radarMatches.scoreConfianca));

  if (recentMatches.length === 0) return 0;

  // Buscar admins e defensores para notificar
  const adminUsers = await db
    .select({ id: users.id })
    .from(users)
    .where(
      and(
        sql`${users.role} IN ('admin', 'defensor')`,
        isNull(users.deletedAt),
      )
    );

  if (adminUsers.length === 0) return 0;

  // Agrupar matches: se muitos, fazer resumo
  let title: string;
  let message: string;
  let type: string;

  if (recentMatches.length === 1) {
    const m = recentMatches[0];
    title = `Radar: Match ${m.scoreConfianca}% — ${m.nomeEncontrado}`;
    message = `Possível correspondência entre "${m.nomeEncontrado}" (notícia) e "${m.assistidoNome}" (assistido DPE). ${m.noticiaTipoCrime ? `Crime: ${m.noticiaTipoCrime}.` : ""} Verifique no Radar Criminal.`;
    type = m.scoreConfianca >= 80 ? "warning" : "radar_match";
  } else {
    const highScore = recentMatches.filter((m) => m.scoreConfianca >= 80);
    title = `Radar: ${recentMatches.length} novos matches encontrados`;
    message = `O Radar Criminal encontrou ${recentMatches.length} possíveis correspondências com assistidos DPE${highScore.length > 0 ? ` (${highScore.length} com alta confiança)` : ""}. Verifique no painel de Matches.`;
    type = highScore.length > 0 ? "warning" : "radar_match";
  }

  // Verificar se já existe notificação similar recente (evitar spam)
  const [existing] = await db
    .select({ total: count() })
    .from(notifications)
    .where(
      and(
        eq(notifications.type, type),
        gte(notifications.createdAt, oneDayAgo),
        sql`${notifications.title} LIKE 'Radar:%'`,
      )
    );

  if (Number(existing?.total || 0) > 0) return 0; // Já notificou hoje

  // Criar notificações para cada admin/defensor
  let notified = 0;
  for (const user of adminUsers) {
    try {
      await db.insert(notifications).values({
        userId: user.id,
        type,
        title,
        message,
        actionUrl: "/admin/radar?tab=matches",
        isRead: false,
      });
      notified++;
    } catch {
      // Silently skip if notification creation fails
    }
  }

  return notified;
}
