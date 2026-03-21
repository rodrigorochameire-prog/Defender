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
import { eq, and, desc, sql, gte, lte, lt, ilike, or, count, isNull, ne, inArray } from "drizzle-orm";
import { sendText } from "@/lib/services/evolution-api";
import { getComarcaId } from "@/lib/trpc/comarca-scope";

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
        circunstancia: z.string().optional(),
        relevanciaMin: z.number().min(0).max(100).optional(),
        limit: z.number().min(1).max(100).optional().default(20),
        cursor: z.number().optional(), // id of the last item
      })
    )
    .query(async ({ input, ctx }) => {
      // Cidades fora da jurisdição da DPE-BA Camaçari (7ª Regional)
      // Jurisdição cobre: Camaçari, Dias d'Ávila, Simões Filho, Madre de Deus, Lauro de Freitas
      const CIDADES_FORA_DA_JURISDICAO = [
        "Nazaré", "Alagoinhas", "Feira de Santana", "Itaparica", "Mar Grande",
        "Vera Cruz", "Jaguaripe", "Bom Jesus da Lapa", "São Félix", "Copacabana",
        "Ilhéus", "Itabuna", "Paulo Afonso", "Cachoeira", "Santo Antônio de Jesus",
        "Cruz das Almas", "Santo Amaro", "Candeias", "Eunápolis", "Porto Seguro",
        "Vitória da Conquista", "Barreiras", "Juazeiro", "Jacobina", "Valença",
        "Cairu", "Belmonte", "Rio Real",
      ];

      const conditions = [
        // Só mostra artigos já enriquecidos (não pending)
        ne(radarNoticias.enrichmentStatus, "pending"),
        // Excluir artigos de cidades claramente fora da jurisdição
        ...CIDADES_FORA_DA_JURISDICAO.map((cidade) =>
          sql`${radarNoticias.titulo} NOT ILIKE ${"%" + cidade + "%"}`
        ),
      ];

      // Filtro por comarca — não-admins só veem notícias da sua comarca
      if (ctx.user.role !== "admin") {
        conditions.push(eq(radarNoticias.comarcaId, getComarcaId(ctx.user)));
      }

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

      if (input.circunstancia) {
        conditions.push(eq(radarNoticias.circunstancia, input.circunstancia as any));
      }

      if (input.cursor) {
        conditions.push(sql`${radarNoticias.id} < ${input.cursor}`);
      }

      if (input.relevanciaMin !== undefined) {
        conditions.push(gte(radarNoticias.relevanciaScore, input.relevanciaMin));
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
            armaMeio: radarNoticias.armaMeio,
            resumoIA: radarNoticias.resumoIA,
            envolvidos: radarNoticias.envolvidos,
            enrichmentStatus: radarNoticias.enrichmentStatus,
            relevanciaScore: radarNoticias.relevanciaScore,
            createdAt: radarNoticias.createdAt,
            matchCount: sql<number>`count(${radarMatches.id}) over (partition by ${radarNoticias.id})`,
          })
          .from(radarNoticias)
          .innerJoin(radarMatches, eq(radarNoticias.id, radarMatches.noticiaId))
          .where(conditions.length > 0 ? and(...conditions) : undefined)
          .orderBy(sql`${radarNoticias.dataPublicacao} DESC NULLS LAST`, desc(radarNoticias.createdAt), desc(radarNoticias.id))
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
            armaMeio: radarNoticias.armaMeio,
            resumoIA: radarNoticias.resumoIA,
            envolvidos: radarNoticias.envolvidos,
            enrichmentStatus: radarNoticias.enrichmentStatus,
            relevanciaScore: radarNoticias.relevanciaScore,
            matchCount: sql<number>`(
  SELECT COALESCE(COUNT(*)::int, 0) FROM radar_matches rm
  WHERE rm.noticia_id = ${radarNoticias.id}
)`,
            createdAt: radarNoticias.createdAt,
          })
          .from(radarNoticias)
          .where(conditions.length > 0 ? and(...conditions) : undefined)
          .orderBy(sql`${radarNoticias.dataPublicacao} DESC NULLS LAST`, desc(radarNoticias.createdAt), desc(radarNoticias.id))
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
          notes: radarMatches.notes,
          confirmedAt: radarMatches.confirmedAt,
          updatedAt: radarMatches.updatedAt,
          assistidoNome: assistidos.nome,
        })
        .from(radarMatches)
        .leftJoin(assistidos, eq(radarMatches.assistidoId, assistidos.id))
        .where(eq(radarMatches.noticiaId, input.id));

      return { ...noticia, matches };
    }),

  // ==========================================
  // EDIÇÃO MANUAL DE NOTÍCIA
  // ==========================================

  updateNoticia: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        tipoCrime: z.string().optional(),
        bairro: z.string().optional(),
        logradouro: z.string().optional(),
        delegacia: z.string().optional(),
        resumoIA: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, ...data } = input;

      // Remove undefined keys so we only update provided fields
      const updateData: Record<string, unknown> = { updatedAt: new Date() };
      if (data.tipoCrime !== undefined) updateData.tipoCrime = data.tipoCrime;
      if (data.bairro !== undefined) updateData.bairro = data.bairro;
      if (data.logradouro !== undefined) updateData.logradouro = data.logradouro;
      if (data.delegacia !== undefined) updateData.delegacia = data.delegacia;
      if (data.resumoIA !== undefined) updateData.resumoIA = data.resumoIA;

      const [updated] = await db
        .update(radarNoticias)
        .set(updateData)
        .where(eq(radarNoticias.id, id))
        .returning();

      return updated;
    }),

  // ==========================================
  // ESTATÍSTICAS
  // ==========================================

  stats: protectedProcedure
    .input(
      z.object({
        periodo: z.enum(["7d", "30d", "90d", "1a", "total"]).optional().default("30d"),
        tipoCrime: z.string().optional(),
        bairro: z.string().optional(),
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
      if (input.tipoCrime && input.tipoCrime !== "todos") {
        conditions.push(eq(radarNoticias.tipoCrime, input.tipoCrime as any));
      }
      if (input.bairro) {
        conditions.push(ilike(radarNoticias.bairro, `%${input.bairro}%`));
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const matchConditions = [];
      if (dias) {
        const dataInicio = new Date();
        dataInicio.setDate(dataInicio.getDate() - dias);
        matchConditions.push(gte(radarMatches.createdAt, dataInicio));
      }

      // Todas as queries em paralelo — elimina 5 round-trips sequenciais
      const [
        [totalResult],
        porTipo,
        [matchResult],
        porMes,
        relevanciaRaw,
      ] = await Promise.all([
        db.select({ total: count() }).from(radarNoticias).where(whereClause),
        db.select({ tipoCrime: radarNoticias.tipoCrime, count: count() })
          .from(radarNoticias).where(whereClause)
          .groupBy(radarNoticias.tipoCrime).orderBy(desc(count())),
        db.select({ total: count() }).from(radarMatches)
          .where(matchConditions.length > 0 ? and(...matchConditions) : undefined),
        db.select({
            mes: sql<string>`to_char(${radarNoticias.createdAt}, 'YYYY-MM')`,
            tipoCrime: radarNoticias.tipoCrime,
            count: count(),
          })
          .from(radarNoticias).where(whereClause)
          .groupBy(sql`to_char(${radarNoticias.createdAt}, 'YYYY-MM')`, radarNoticias.tipoCrime)
          .orderBy(sql`to_char(${radarNoticias.createdAt}, 'YYYY-MM')`),
        db.execute(sql`
          SELECT
            COUNT(*) FILTER (WHERE relevancia_score >= 85)::int                    AS confirmadas,
            COUNT(*) FILTER (WHERE relevancia_score >= 60 AND relevancia_score < 85)::int AS provaveis,
            COUNT(*) FILTER (WHERE relevancia_score >= 35 AND relevancia_score < 60)::int AS possiveis
          FROM radar_noticias
        `).catch(() => [{ confirmadas: 0, provaveis: 0, possiveis: 0 }]),
      ]);

      const rel = (relevanciaRaw as unknown as Array<Record<string, number>>)[0] ?? {};

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
        relevancia: {
          confirmadas: Number(rel.confirmadas ?? 0),
          provaveis: Number(rel.provaveis ?? 0),
          possiveis: Number(rel.possiveis ?? 0),
        },
      };
    }),

  statsByBairro: protectedProcedure
    .input(
      z.object({
        periodo: z.enum(["7d", "30d", "90d", "1a", "total"]).optional().default("30d"),
        limit: z.number().min(1).max(20).optional().default(10),
        tipoCrime: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      const daysMap: Record<string, number> = {
        "7d": 7, "30d": 30, "90d": 90, "1a": 365, "total": 36500,
      };
      const days = daysMap[input.periodo] ?? 30;
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - days);

      const tipoCrimeFilter =
        input.tipoCrime && input.tipoCrime !== "todos"
          ? sql`AND tipo_crime = ${input.tipoCrime}`
          : sql``;

      const result = await db.execute(sql`
        SELECT
          bairro,
          COUNT(*) AS total,
          MODE() WITHIN GROUP (ORDER BY tipo_crime) AS tipo_crime_dominante
        FROM radar_noticias
        WHERE bairro IS NOT NULL
          AND created_at >= ${cutoff.toISOString()}
          ${tipoCrimeFilter}
        GROUP BY bairro
        ORDER BY total DESC
        LIMIT ${input.limit}
      `);

      return (result as unknown as Array<{
        bairro: string;
        total: string;
        tipo_crime_dominante: string | null;
      }>).map(r => ({
        bairro: r.bairro,
        count: Number(r.total),
        tipoCrimeDominante: r.tipo_crime_dominante,
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
          armaMeio: radarNoticias.armaMeio,
          resumoIA: radarNoticias.resumoIA,
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
        search: z.string().optional(),
        limit: z.number().min(1).max(100).optional().default(50),
        offset: z.number().min(0).optional().default(0),
      })
    )
    .query(async ({ input }) => {
      const conditions = [];

      if (input.status && input.status !== "todos") {
        conditions.push(eq(radarMatches.status, input.status as any));
      }

      if (input.search && input.search.trim()) {
        conditions.push(
          or(
            ilike(radarMatches.nomeEncontrado, `%${input.search.trim()}%`),
            ilike(assistidos.nome, `%${input.search.trim()}%`)
          )!
        );
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
          notes: radarMatches.notes,
          casoId: radarMatches.casoId,
          processoId: radarMatches.processoId,
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
        .leftJoin(assistidos, eq(radarMatches.assistidoId, assistidos.id))
        .where(conditions.length > 0 ? and(...conditions) : undefined);

      return {
        items: matches,
        total: Number(totalResult?.total || 0),
      };
    }),

  confirmMatch: protectedProcedure
    .input(z.object({
      id: z.number(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const [updated] = await db
        .update(radarMatches)
        .set({
          status: "confirmado_manual",
          confirmedBy: ctx.user.id,
          confirmedAt: new Date(),
          updatedAt: new Date(),
          ...(input.notes !== undefined && { notes: input.notes }),
        })
        .where(eq(radarMatches.id, input.id))
        .returning();

      // Send WhatsApp notification to the responsible defensor (fire-and-forget with 1 retry)
      if (updated) {
        const sendWithRetry = async () => {
          try {
            await notifyMatchViaWhatsApp(updated.id);
          } catch (firstErr) {
            console.warn("[Radar] Primeira tentativa WhatsApp falhou, tentando novamente em 3s...", firstErr);
            await new Promise((r) => setTimeout(r, 3000));
            try {
              await notifyMatchViaWhatsApp(updated.id);
            } catch (secondErr) {
              console.error("[Radar] Falha definitiva no WhatsApp após retry (confirmMatch):", secondErr);
            }
          }
        };
        sendWithRetry(); // fire-and-forget com retry
      }

      return updated;
    }),

  dismissMatch: protectedProcedure
    .input(z.object({
      id: z.number(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const [updated] = await db
        .update(radarMatches)
        .set({
          status: "descartado",
          updatedAt: new Date(),
          ...(input.notes !== undefined && { notes: input.notes }),
        })
        .where(eq(radarMatches.id, input.id))
        .returning();

      return updated;
    }),

  bulkConfirmMatches: protectedProcedure
    .input(z.object({
      ids: z.array(z.number()).min(1).max(100),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const updated = await db
        .update(radarMatches)
        .set({
          status: "confirmado_manual",
          confirmedBy: ctx.user.id,
          confirmedAt: new Date(),
          updatedAt: new Date(),
          ...(input.notes !== undefined && { notes: input.notes }),
        })
        .where(
          and(
            sql`${radarMatches.id} IN (${sql.join(input.ids.map(id => sql`${id}`), sql`, `)})`,
            eq(radarMatches.status, "possivel"),
          )!
        )
        .returning({ id: radarMatches.id });

      // Fire-and-forget WhatsApp for each confirmed match (with 1 retry each)
      for (const match of updated) {
        const matchId = match.id;
        const sendWithRetry = async () => {
          try {
            await notifyMatchViaWhatsApp(matchId);
          } catch (firstErr) {
            console.warn("[Radar] Primeira tentativa WhatsApp falhou (bulk), tentando novamente em 3s...", firstErr);
            await new Promise((r) => setTimeout(r, 3000));
            try {
              await notifyMatchViaWhatsApp(matchId);
            } catch (secondErr) {
              console.error(`[Radar] Falha definitiva no WhatsApp após retry (bulkConfirm matchId=${matchId}):`, secondErr);
            }
          }
        };
        sendWithRetry(); // fire-and-forget com retry
      }

      return { confirmed: updated.length };
    }),

  bulkDismissMatches: protectedProcedure
    .input(z.object({
      ids: z.array(z.number()).min(1).max(100),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const updated = await db
        .update(radarMatches)
        .set({
          status: "descartado",
          updatedAt: new Date(),
          ...(input.notes !== undefined && { notes: input.notes }),
        })
        .where(
          and(
            sql`${radarMatches.id} IN (${sql.join(input.ids.map(id => sql`${id}`), sql`, `)})`,
            eq(radarMatches.status, "possivel"),
          )!
        )
        .returning({ id: radarMatches.id });

      return { dismissed: updated.length };
    }),

  linkMatchToCaso: protectedProcedure
    .input(z.object({
      matchId: z.number(),
      casoId: z.number().nullable(),
      processoId: z.number().nullable(),
    }))
    .mutation(async ({ input }) => {
      const [updated] = await db
        .update(radarMatches)
        .set({
          casoId: input.casoId,
          processoId: input.processoId,
          updatedAt: new Date(),
        })
        .where(eq(radarMatches.id, input.matchId))
        .returning();

      return updated;
    }),

  // Matches pendentes agrupados por notícia (para quick actions no feed)
  matchesPendentesByNoticias: protectedProcedure
    .input(z.object({ noticiaIds: z.array(z.number()) }))
    .query(async ({ input }) => {
      if (input.noticiaIds.length === 0) return {};

      const matches = await db
        .select({
          id: radarMatches.id,
          noticiaId: radarMatches.noticiaId,
          assistidoId: radarMatches.assistidoId,
          assistidoNome: assistidos.nome,
          nomeEncontrado: radarMatches.nomeEncontrado,
          scoreConfianca: radarMatches.scoreConfianca,
          status: radarMatches.status,
        })
        .from(radarMatches)
        .leftJoin(assistidos, eq(radarMatches.assistidoId, assistidos.id))
        .where(
          and(
            inArray(radarMatches.noticiaId, input.noticiaIds),
            eq(radarMatches.status, "possivel")
          )
        );

      // Group by noticiaId
      const grouped: Record<number, typeof matches> = {};
      matches.forEach((m) => {
        if (!grouped[m.noticiaId]) grouped[m.noticiaId] = [];
        grouped[m.noticiaId].push(m);
      });
      return grouped;
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

  fontesStats: protectedProcedure.query(async () => {
    const result = await db
      .select({
        fonteNome: radarNoticias.fonte,
        totalNoticias: count(radarNoticias.id),
        totalMatches: sql<number>`count(distinct ${radarMatches.id})`,
        ultimaNoticia: sql<string>`max(${radarNoticias.createdAt})`,
        semCorpo: sql<number>`count(case when ${radarNoticias.corpo} is null or length(${radarNoticias.corpo}) < 100 then 1 end)`,
      })
      .from(radarNoticias)
      .leftJoin(radarMatches, eq(radarNoticias.id, radarMatches.noticiaId))
      .groupBy(radarNoticias.fonte)
      .orderBy(desc(sql`count(${radarNoticias.id})`));

    return result.map((row) => {
      const total = Number(row.totalNoticias);
      const semCorpo = Number(row.semCorpo);
      const taxaExtracao = total > 0 ? Math.round((1 - semCorpo / total) * 100) : null;
      return { ...row, semCorpo, taxaExtracao };
    });
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
          noticiaImagemUrl: radarNoticias.imagemUrl,
        })
        .from(radarMatches)
        .innerJoin(radarNoticias, eq(radarMatches.noticiaId, radarNoticias.id))
        .where(eq(radarMatches.assistidoId, input.assistidoId))
        .orderBy(desc(radarMatches.scoreConfianca), desc(radarMatches.createdAt));

      return matches;
    }),

  // Trigger pipeline completo no enrichment engine (fire-and-forget)
  // Retorna imediatamente — o enrichment engine processa em background no Railway.
  // Isso evita o timeout de 60s do Vercel para pipelines com 15+ feeds RSS.
  triggerPipeline: protectedProcedure.mutation(async () => {
    const engineUrl = process.env.ENRICHMENT_ENGINE_URL;
    const apiKey = process.env.ENRICHMENT_API_KEY;

    if (!engineUrl || !apiKey) {
      return { success: false, message: "Enrichment Engine não configurado" };
    }

    const headers = {
      "Content-Type": "application/json",
      "X-API-Key": apiKey,
    };

    // Disparar o pipeline completo sem aguardar resposta (fire-and-forget)
    // O Railway não tem limite de tempo como o Vercel — processa em background.
    fetch(`${engineUrl}/api/radar/pipeline`, {
      method: "POST",
      headers,
      signal: AbortSignal.timeout(5_000), // só verifica se o engine está online
    }).catch(() => {
      // Ignorar timeout — o engine continuou processando em background
    });

    return {
      success: true,
      message: "Pipeline iniciado em background. Os dados serão atualizados em instantes.",
    };
  }),

  // ==========================================
  // NOTIFICAÇÕES
  // ==========================================

  // Gerar notificações para matches recentes (últimas 24h sem notificação)
  notifyNewMatches: protectedProcedure.mutation(async () => {
    const count = await notifyAdminsOfNewMatches();
    return { notified: count };
  }),

  // ==========================================
  // DASHBOARD EXECUTIVO
  // ==========================================

  statsDeteccao: protectedProcedure
    .input(
      z.object({
        periodo: z.enum(["7d", "30d", "90d", "1a", "total"]).optional().default("30d"),
      })
    )
    .query(async ({ input }) => {
      const periodoMap: Record<string, number> = {
        "7d": 7, "30d": 30, "90d": 90, "1a": 365,
      };
      const dias = periodoMap[input.periodo];
      const dataInicio = dias ? new Date(Date.now() - dias * 86400000) : null;

      // Matches by status (in the period)
      const matchesPorStatusRaw = await db
        .select({
          status: radarMatches.status,
          total: count(),
        })
        .from(radarMatches)
        .where(dataInicio ? gte(radarMatches.createdAt, dataInicio) : undefined)
        .groupBy(radarMatches.status);

      const matchesPorStatus = matchesPorStatusRaw.map((r) => ({
        status: r.status,
        count: Number(r.total),
      }));

      // Confirmation rate: (confirmado_manual + auto_confirmado) / (total - descartado)
      const totalMatches = matchesPorStatus.reduce((s, m) => s + m.count, 0);
      const confirmados = matchesPorStatus
        .filter((m) => m.status === "confirmado_manual" || m.status === "auto_confirmado")
        .reduce((s, m) => s + m.count, 0);
      const descartados = matchesPorStatus.find((m) => m.status === "descartado")?.count || 0;
      const taxaConfirmacao = totalMatches - descartados > 0
        ? Math.round((confirmados / (totalMatches - descartados)) * 100)
        : 0;

      // Average detection time: avg hours between noticia.dataFato and match.createdAt
      const [deteccaoResult] = await db
        .select({
          avgHoras: sql<number>`
            AVG(EXTRACT(EPOCH FROM (${radarMatches.createdAt} - ${radarNoticias.dataFato})) / 3600)
          `,
        })
        .from(radarMatches)
        .innerJoin(radarNoticias, eq(radarMatches.noticiaId, radarNoticias.id))
        .where(
          and(
            sql`${radarNoticias.dataFato} IS NOT NULL`,
            dataInicio ? gte(radarMatches.createdAt, dataInicio) : undefined,
          )
        );

      const tempoMedioHoras = Math.round(Number(deteccaoResult?.avgHoras || 0));

      // Top defensores with most confirmed matches
      const topDefensoresRaw = await db
        .select({
          defensorNome: users.name,
          total: count(),
        })
        .from(radarMatches)
        .innerJoin(assistidos, eq(radarMatches.assistidoId, assistidos.id))
        .innerJoin(users, eq(assistidos.defensorId, users.id))
        .where(
          and(
            sql`${radarMatches.status} IN ('confirmado_manual', 'auto_confirmado')`,
            dataInicio ? gte(radarMatches.createdAt, dataInicio) : undefined,
          )
        )
        .groupBy(users.name)
        .orderBy(desc(count()))
        .limit(5);

      const topDefensores = topDefensoresRaw.map((r) => ({
        nome: r.defensorNome || "Desconhecido",
        count: Number(r.total),
      }));

      // Weekly trend: last 8 weeks
      const oitoSemanasAtras = new Date(Date.now() - 8 * 7 * 86400000);
      const tendenciaRaw = await db
        .select({
          semana: sql<string>`to_char(date_trunc('week', ${radarMatches.createdAt}), 'YYYY-MM-DD')`,
          total: count(),
        })
        .from(radarMatches)
        .where(gte(radarMatches.createdAt, oitoSemanasAtras))
        .groupBy(sql`date_trunc('week', ${radarMatches.createdAt})`)
        .orderBy(sql`date_trunc('week', ${radarMatches.createdAt})`);

      const tendencia = tendenciaRaw.map((r) => ({
        semana: r.semana,
        count: Number(r.total),
      }));

      return {
        taxaConfirmacao,
        tempoMedioHoras,
        matchesPorStatus,
        topDefensores,
        tendencia,
        totalMatches,
        confirmados,
      };
    }),

  statsByHora: protectedProcedure
    .input(z.object({
      periodo: z.enum(["7d", "30d", "90d", "1a", "total"]).optional().default("30d"),
    }))
    .query(async ({ input }) => {
      const daysMap: Record<string, number> = {
        "7d": 7, "30d": 30, "90d": 90, "1a": 365, "total": 36500,
      };
      const days = daysMap[input.periodo] ?? 30;
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - days);

      const result = await db.execute(sql`
        SELECT
          EXTRACT(HOUR FROM data_fato)::int AS hora,
          COUNT(*) AS total
        FROM radar_noticias
        WHERE data_fato IS NOT NULL AND data_fato >= ${cutoff.toISOString()}
        GROUP BY hora
        ORDER BY hora
      `);

      const byHora: Record<number, number> = {};
      (result as unknown as Array<{ hora: number; total: string }>).forEach((r) => {
        byHora[Number(r.hora)] = Number(r.total);
      });

      return Array.from({ length: 24 }, (_, h) => ({
        hora: h,
        label: `${String(h).padStart(2, "0")}h`,
        total: byHora[h] ?? 0,
      }));
    }),

  statsByDiaSemana: protectedProcedure
    .input(z.object({
      periodo: z.enum(["7d", "30d", "90d", "1a", "total"]).optional().default("30d"),
    }))
    .query(async ({ input }) => {
      const daysMap: Record<string, number> = {
        "7d": 7, "30d": 30, "90d": 90, "1a": 365, "total": 36500,
      };
      const days = daysMap[input.periodo] ?? 30;
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - days);

      const result = await db.execute(sql`
        SELECT
          EXTRACT(DOW FROM data_fato)::int AS dia,
          COUNT(*) AS total
        FROM radar_noticias
        WHERE data_fato IS NOT NULL AND data_fato >= ${cutoff.toISOString()}
        GROUP BY dia
        ORDER BY dia
      `);

      const DIAS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
      const byDia: Record<number, number> = {};
      (result as unknown as Array<{ dia: number; total: string }>).forEach((r) => {
        byDia[Number(r.dia)] = Number(r.total);
      });

      return Array.from({ length: 7 }, (_, d) => ({
        dia: d,
        label: DIAS[d],
        total: byDia[d] ?? 0,
      }));
    }),

  noticiasRelacionadas: protectedProcedure
    .input(z.object({
      id: z.number(),
      limit: z.number().min(1).max(6).optional().default(4),
    }))
    .query(async ({ input }) => {
      // Busca a notícia atual para pegar bairro e tipoCrime
      const [current] = await db
        .select({
          tipoCrime: radarNoticias.tipoCrime,
          bairro: radarNoticias.bairro,
        })
        .from(radarNoticias)
        .where(eq(radarNoticias.id, input.id))
        .limit(1);

      if (!current) return [];

      const conditions = [
        sql`${radarNoticias.id} != ${input.id}`,
        sql`${radarNoticias.enrichmentStatus} IN ('extracted', 'matched')`,
      ];

      // Busca por mesmo bairro OU mesmo tipo de crime
      if (current.bairro || current.tipoCrime) {
        const orConditions = [];
        if (current.bairro) orConditions.push(eq(radarNoticias.bairro, current.bairro));
        if (current.tipoCrime) orConditions.push(eq(radarNoticias.tipoCrime, current.tipoCrime));
        conditions.push(or(...orConditions)!);
      }

      const related = await db
        .select({
          id: radarNoticias.id,
          titulo: radarNoticias.titulo,
          tipoCrime: radarNoticias.tipoCrime,
          bairro: radarNoticias.bairro,
          dataFato: radarNoticias.dataFato,
          fonte: radarNoticias.fonte,
          imagemUrl: radarNoticias.imagemUrl,
        })
        .from(radarNoticias)
        .where(and(...conditions))
        .orderBy(desc(radarNoticias.dataFato))
        .limit(input.limit);

      return related;
    }),

  reprocessNoticia: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      // Reset status para pending
      await db
        .update(radarNoticias)
        .set({
          enrichmentStatus: "pending",
          updatedAt: new Date(),
        })
        .where(eq(radarNoticias.id, input.id));

      // Chamar API de enriquecimento em background
      // (fire-and-forget, sem aguardar)
      try {
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL ||
          (process.env.VERCEL_URL
            ? `https://${process.env.VERCEL_URL}`
            : "http://localhost:3000");

        fetch(`${baseUrl}/api/radar/enrich`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ limit: 1, forceId: input.id }),
        }).catch(() => {}); // fire-and-forget
      } catch {}

      return { success: true };
    }),

  reincidentes: protectedProcedure
    .input(
      z.object({
        minOcorrencias: z.number().min(2).max(20).optional().default(2),
        limit: z.number().min(1).max(50).optional().default(20),
        dias: z.number().min(7).max(365).optional().default(90),
      })
    )
    .query(async ({ input }) => {
      const cutoff = new Date(Date.now() - input.dias * 24 * 60 * 60 * 1000).toISOString();
      // Unnest envolvidos JSON array and find people appearing in 2+ distinct articles.
      // Date filter + simplified jsonb_agg (no DISTINCT ORDER BY) to avoid statement timeout.
      const result = await db.execute(sql`
        SELECT
          unaccent(lower(env->>'nome')) as nome,
          env->>'papel' as papel,
          COUNT(DISTINCT n.id) as total_noticias,
          jsonb_agg(jsonb_build_object(
            'id', n.id,
            'titulo', n.titulo,
            'dataFato', n.data_fato,
            'tipoCrime', n.tipo_crime,
            'bairro', n.bairro
          )) as noticias
        FROM radar_noticias n,
             jsonb_array_elements(n.envolvidos) env
        WHERE
          n.envolvidos IS NOT NULL
          AND jsonb_typeof(n.envolvidos) = 'array'
          AND n.created_at >= ${cutoff}
          AND env->>'nome' IS NOT NULL
          AND length(env->>'nome') > 4
          AND unaccent(lower(env->>'nome')) NOT IN (
            'homem', 'mulher', 'suspeito', 'suspeitos', 'vitima', 'vítima', 'vítimas', 'vitimas',
            'menor', 'menores', 'adolescente', 'adolescentes',
            'policial', 'policiais', 'pm', 'delegado', 'delegados', 'criminoso', 'criminosos',
            'individuo', 'individuos', 'desconhecido', 'desconhecidos',
            'pessoa', 'pessoas', 'agente', 'agentes',
            'agressor', 'agressora', 'agressores', 'agredido', 'agredida',
            'envolvido', 'envolvida', 'envolvidos', 'envolvidas',
            'acusado', 'acusada', 'acusados', 'acusadas',
            'autor', 'autores', 'autora', 'autoras',
            'infrator', 'infratores',
            'reu', 're',
            'silva', 'santos'
          )
        GROUP BY unaccent(lower(env->>'nome')), env->>'papel'
        HAVING COUNT(DISTINCT n.id) >= ${input.minOcorrencias}
        ORDER BY total_noticias DESC
        LIMIT ${input.limit}
      `);

      type ReincidenteRow = {
        nome: string;
        papel: string;
        total_noticias: string | number;
        noticias: Array<{
          id: number;
          titulo: string;
          dataFato: string | null;
          tipoCrime: string | null;
          bairro: string | null;
        }>;
      };

      return (result as unknown as ReincidenteRow[]).map((row) => ({
        nome: row.nome,
        papel: row.papel,
        totalNoticias: Number(row.total_noticias),
        noticias: Array.isArray(row.noticias) ? row.noticias.slice(0, 10) : [],
      }));
    }),

  // ==========================================
  // CONTAGEM RÁPIDA DE MATCHES PENDENTES
  // Usado pelo badge na sidebar
  // ==========================================

  // Contagem total leve — só COUNT(*), sem GROUP BY
  totalCount: protectedProcedure.query(async () => {
    const [row] = await db.select({ total: count() }).from(radarNoticias);
    return { total: row?.total ?? 0 };
  }),

  matchesPendentesCount: protectedProcedure.query(async () => {
    const [result] = await db
      .select({ count: count() })
      .from(radarMatches)
      .where(eq(radarMatches.status, "possivel"));

    return { count: result?.count ?? 0 };
  }),

  // ==========================================
  // SAÚDE DO ENRIQUECIMENTO
  // ==========================================

  enrichmentHealth: protectedProcedure.query(async () => {
    // Uma única query com agregação condicional (FILTER) em vez de 7 round-trips
    const [row] = await db.execute(sql`
      SELECT
        COUNT(*)::int                                                                 AS total,
        COUNT(*) FILTER (WHERE enrichment_status = 'pending')::int                  AS pending,
        COUNT(*) FILTER (WHERE enrichment_status IN ('extracted','matched'))::int    AS done,
        COUNT(*) FILTER (WHERE bairro IS NULL
          AND enrichment_status IN ('extracted','matched'))::int                     AS sem_bairro,
        COUNT(*) FILTER (WHERE latitude IS NULL
          AND enrichment_status IN ('extracted','matched'))::int                     AS sem_coordenadas,
        COUNT(*) FILTER (WHERE resumo_ia IS NULL
          AND enrichment_status IN ('extracted','matched'))::int                     AS sem_resumo,
        COUNT(*) FILTER (WHERE enrichment_status = 'failed')::int                   AS failed,
        COUNT(*) FILTER (WHERE enrichment_status = 'duplicate')::int                AS duplicate
      FROM radar_noticias
    `) as unknown as [Record<string, number>];

    return {
      total: row?.total ?? 0,
      pending: row?.pending ?? 0,
      done: row?.done ?? 0,
      semBairro: row?.sem_bairro ?? 0,
      semCoordenadas: row?.sem_coordenadas ?? 0,
      semResumo: row?.sem_resumo ?? 0,
      failed: row?.failed ?? 0,
      duplicate: row?.duplicate ?? 0,
    };
  }),

  reprocessPending: protectedProcedure
    .input(z.object({
      limit: z.number().min(1).max(100).optional().default(20),
    }))
    .mutation(async ({ input }) => {
      try {
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL ||
          (process.env.VERCEL_URL
            ? `https://${process.env.VERCEL_URL}`
            : "http://localhost:3000");

        const cronSecret = process.env.CRON_SECRET;
        fetch(`${baseUrl}/api/cron/radar-extract`, {
          method: "GET",
          headers: cronSecret ? { "Authorization": `Bearer ${cronSecret}` } : {},
        }).catch(() => {}); // fire-and-forget
      } catch {}

      return { success: true, message: `Processando até ${input.limit} notícias pendentes` };
    }),

  // ==========================================
  // ALERTAS CRÍTICOS — matches ≥80% pendentes
  // ==========================================

  alertasCriticos: protectedProcedure.query(async () => {
    const items = await db
      .select({
        id: radarMatches.id,
        scoreConfianca: radarMatches.scoreConfianca,
        nomeEncontrado: radarMatches.nomeEncontrado,
        assistidoNome: assistidos.nome,
        assistidoId: assistidos.id,
        noticiaTitulo: radarNoticias.titulo,
        noticiaFonte: radarNoticias.fonte,
        noticiaTipoCrime: radarNoticias.tipoCrime,
        noticiaId: radarNoticias.id,
        createdAt: radarMatches.createdAt,
      })
      .from(radarMatches)
      .innerJoin(assistidos, eq(radarMatches.assistidoId, assistidos.id))
      .innerJoin(radarNoticias, eq(radarMatches.noticiaId, radarNoticias.id))
      .where(
        and(
          eq(radarMatches.status, "possivel"),
          gte(radarMatches.scoreConfianca, 80)
        )
      )
      .orderBy(desc(radarMatches.scoreConfianca))
      .limit(10);
    return items;
  }),

  // ==========================================
  // STATS COMPARATIVO — deltas semanais
  // ==========================================

  statsComparativo: protectedProcedure.query(async () => {
    const agora = new Date();
    const semanaPassadaInicio = new Date(agora.getTime() - 14 * 24 * 60 * 60 * 1000);
    const semanaAtualInicio = new Date(agora.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [semanaAtual] = await db
      .select({ count: count() })
      .from(radarNoticias)
      .where(gte(radarNoticias.createdAt, semanaAtualInicio));

    const [semanaAnterior] = await db
      .select({ count: count() })
      .from(radarNoticias)
      .where(
        and(
          gte(radarNoticias.createdAt, semanaPassadaInicio),
          lt(radarNoticias.createdAt, semanaAtualInicio)
        )
      );

    const [matchesAtual] = await db
      .select({ count: count() })
      .from(radarMatches)
      .where(gte(radarMatches.createdAt, semanaAtualInicio));

    const [matchesAnterior] = await db
      .select({ count: count() })
      .from(radarMatches)
      .where(
        and(
          gte(radarMatches.createdAt, semanaPassadaInicio),
          lt(radarMatches.createdAt, semanaAtualInicio)
        )
      );

    return {
      noticias: { atual: semanaAtual.count, anterior: semanaAnterior.count },
      matches: { atual: matchesAtual.count, anterior: matchesAnterior.count },
    };
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
      noticiaBairro: radarNoticias.bairro,
      assistidoNome: assistidos.nome,
      assistidoDefensorId: assistidos.defensorId,
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
    .select({ id: users.id, phone: users.phone, role: users.role })
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

  // Send WhatsApp notifications grouped by defensor (fire-and-forget)
  sendWhatsAppForNewMatches(recentMatches, adminUsers).catch((err) => {
    console.error("[Radar] Falha ao enviar WhatsApp para novos matches:", err);
  });

  return notified;
}

// ==========================================
// WHATSAPP NOTIFICATION HELPERS
// ==========================================

/**
 * Send WhatsApp notification for a single confirmed match.
 * Looks up the defensor responsible for the assistido and sends a message.
 */
async function notifyMatchViaWhatsApp(matchId: number): Promise<void> {
  // Fetch match details with assistido + noticia + defensor info
  const [match] = await db
    .select({
      nomeEncontrado: radarMatches.nomeEncontrado,
      scoreConfianca: radarMatches.scoreConfianca,
      assistidoNome: assistidos.nome,
      assistidoDefensorId: assistidos.defensorId,
      noticiaTitulo: radarNoticias.titulo,
      noticiaBairro: radarNoticias.bairro,
    })
    .from(radarMatches)
    .innerJoin(radarNoticias, eq(radarMatches.noticiaId, radarNoticias.id))
    .leftJoin(assistidos, eq(radarMatches.assistidoId, assistidos.id))
    .where(eq(radarMatches.id, matchId));

  if (!match || !match.assistidoDefensorId) return;

  // Find defensor's phone
  const [defensor] = await db
    .select({ phone: users.phone })
    .from(users)
    .where(eq(users.id, match.assistidoDefensorId));

  if (!defensor?.phone) return;

  const whatsappMessage = formatRadarWhatsAppMessage({
    assistidoNome: match.assistidoNome || match.nomeEncontrado,
    titulo: match.noticiaTitulo,
    score: match.scoreConfianca,
    bairro: match.noticiaBairro,
  });

  try {
    await sendText(defensor.phone, whatsappMessage);
    console.log(`[Radar] WhatsApp enviado para defensor (match ${matchId})`);
  } catch (err) {
    console.error(`[Radar] Erro ao enviar WhatsApp para defensor (match ${matchId}):`, err);
  }
}

/**
 * Send WhatsApp notifications for new matches, grouped by defensor.
 * Each defensor receives one summary message with all their matches.
 * Admins without specific matches also receive a summary.
 */
async function sendWhatsAppForNewMatches(
  matches: Array<{
    nomeEncontrado: string;
    scoreConfianca: number;
    assistidoNome: string | null;
    assistidoDefensorId: number | null;
    noticiaTitulo: string;
    noticiaBairro: string | null;
  }>,
  adminUsers: Array<{ id: number; phone: string | null; role: string | null }>
): Promise<void> {
  // Group matches by defensorId
  const matchesByDefensor = new Map<number, typeof matches>();
  for (const match of matches) {
    if (match.assistidoDefensorId) {
      const existing = matchesByDefensor.get(match.assistidoDefensorId) || [];
      existing.push(match);
      matchesByDefensor.set(match.assistidoDefensorId, existing);
    }
  }

  // Build a set of defensor IDs that have matches
  const defensorIdsWithMatches = new Set(matchesByDefensor.keys());

  // Send personalized message to each defensor with matches
  for (const [defensorId, defensorMatches] of matchesByDefensor) {
    const defensor = adminUsers.find((u) => u.id === defensorId);
    if (!defensor?.phone) continue;

    let whatsappMessage: string;
    if (defensorMatches.length === 1) {
      const m = defensorMatches[0];
      whatsappMessage = formatRadarWhatsAppMessage({
        assistidoNome: m.assistidoNome || m.nomeEncontrado,
        titulo: m.noticiaTitulo,
        score: m.scoreConfianca,
        bairro: m.noticiaBairro,
      });
    } else {
      // Summary for multiple matches
      const lines = defensorMatches.slice(0, 5).map(
        (m) => `- ${m.assistidoNome || m.nomeEncontrado} (${m.scoreConfianca}%)`
      );
      const extra = defensorMatches.length > 5 ? `\n... e mais ${defensorMatches.length - 5}` : "";
      whatsappMessage =
        `\u{1F534} *Radar Criminal - ${defensorMatches.length} Matches Encontrados*\n\n` +
        lines.join("\n") +
        extra +
        `\n\nAcesse: https://ombuds.vercel.app/admin/radar`;
    }

    try {
      await sendText(defensor.phone, whatsappMessage);
    } catch (err) {
      console.error(`[Radar] Erro WhatsApp para defensor ${defensorId}:`, err);
    }
  }

  // Send generic summary to admins who are NOT already notified as defensores
  const adminSummary =
    `\u{1F534} *Radar Criminal - ${matches.length} Novo(s) Match(es)*\n\n` +
    `O Radar encontrou ${matches.length} possíveis correspondências com assistidos DPE.\n\n` +
    `Acesse: https://ombuds.vercel.app/admin/radar`;

  for (const admin of adminUsers) {
    if (!admin.phone) continue;
    if (defensorIdsWithMatches.has(admin.id)) continue; // Already got personalized message
    if (admin.role !== "admin") continue; // Only send generic summary to admins

    try {
      await sendText(admin.phone, adminSummary);
    } catch (err) {
      console.error(`[Radar] Erro WhatsApp para admin ${admin.id}:`, err);
    }
  }
}

/**
 * Format a single radar match WhatsApp message.
 */
function formatRadarWhatsAppMessage(data: {
  assistidoNome: string;
  titulo: string;
  score: number;
  bairro: string | null;
}): string {
  return (
    `\u{1F534} *Radar Criminal - Match Encontrado*\n\n` +
    `Assistido: ${data.assistidoNome}\n` +
    `Not\u00edcia: ${data.titulo}\n` +
    `Score: ${data.score}%\n` +
    (data.bairro ? `Bairro: ${data.bairro}\n` : "") +
    `\nAcesse: https://ombuds.vercel.app/admin/radar`
  );
}
