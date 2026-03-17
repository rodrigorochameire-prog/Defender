import { z } from "zod";
import { router, protectedProcedure } from "../init";
import { db } from "@/lib/db";
import { noticiasJuridicas, noticiasFontes, noticiasTemas, noticiasFavoritos, noticiasProcessos, jurisprudenciaJulgados } from "@/lib/db/schema";
import { eq, and, desc, sql, inArray } from "drizzle-orm";
import { enriquecerNoticia, enriquecerPendentes } from "@/lib/noticias/enricher";
import { fetchFullContent } from "@/lib/noticias/scraper";
import { cleanHtml, extractPdfLink, fetchPdfContent } from "@/lib/noticias/html-cleaner";

// ==========================================
// EXTRAÇÃO DE TESES - Dizer o Direito
// ==========================================

async function extrairTeseParaJurisprudencia(noticiaId: number): Promise<void> {
  // 1. Buscar a notícia
  const [noticia] = await db
    .select({
      id: noticiasJuridicas.id,
      titulo: noticiasJuridicas.titulo,
      fonte: noticiasJuridicas.fonte,
      conteudo: noticiasJuridicas.conteudo,
    })
    .from(noticiasJuridicas)
    .where(eq(noticiasJuridicas.id, noticiaId))
    .limit(1);

  if (!noticia) return;

  // 2. Apenas Dizer o Direito
  if (noticia.fonte !== "dizer_o_direito") return;

  // 3. Ignorar revisões de concurso
  if (/revis[aã]o|concurso/i.test(noticia.titulo ?? "")) return;

  const titulo = noticia.titulo ?? "";
  const conteudo = noticia.conteudo ?? "";

  // 4. Chamar Claude para extrair tese
  const Anthropic = (await import("@anthropic-ai/sdk")).default;
  const client = new Anthropic();

  const message = await client.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 1024,
    messages: [{
      role: "user",
      content: `Analise este post do blog "Dizer o Direito" e extraia a tese jurídica principal.
Retorne APENAS um JSON válido, sem texto adicional:
{
  "tribunal": "STF" ou "STJ",
  "numeroInformativo": "xxx" ou null,
  "holding": "Texto da tese em 1-2 frases objetivas",
  "tema": "Penal" ou "Processo Penal" ou "Execução Penal" ou "Júri" ou "Violência Doméstica" ou "Outro",
  "ratioDecidendi": "Fundamento central em 1 parágrafo",
  "relator": "Nome do relator" ou null
}

Título: ${titulo}
Conteúdo: ${conteudo.substring(0, 4000)}`,
    }],
  });

  const content = message.content[0];
  if (content.type !== "text") return;

  const jsonText = content.text.replace(/```json\n?|```\n?/g, "").trim();
  const parsed = JSON.parse(jsonText) as {
    tribunal: string;
    numeroInformativo: string | null;
    holding: string;
    tema: string;
    ratioDecidendi: string;
    relator: string | null;
  };

  // 5. Mapear tribunal para o enum válido
  const tribunalMap: Record<string, "STF" | "STJ" | "TJBA" | "TRF1" | "TRF3" | "OUTRO"> = {
    STF: "STF",
    STJ: "STJ",
  };
  const tribunalValue = tribunalMap[parsed.tribunal] ?? "OUTRO";

  // 6. Inserir em jurisprudenciaJulgados
  await db.insert(jurisprudenciaJulgados).values({
    tribunal: tribunalValue,
    tipoDecisao: "INFORMATIVO",
    ementa: parsed.holding,
    ementaResumo: parsed.holding,
    observacoes: parsed.ratioDecidendi,
    relator: parsed.relator ?? undefined,
    numeroProcesso: parsed.numeroInformativo ? `Informativo ${parsed.numeroInformativo}` : undefined,
    tags: [parsed.tema],
    fonte: "dizer_o_direito",
    status: "processado",
    processadoPorIA: true,
    iaResumo: parsed.ratioDecidendi,
  });
}

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
      // 1. Marcar como aprovado
      await db.update(noticiasJuridicas)
        .set({
          status: "aprovado",
          aprovadoPor: ctx.user.id,
          aprovadoEm: new Date(),
          updatedAt: new Date(),
        })
        .where(inArray(noticiasJuridicas.id, input.ids));

      // 2. Para cada notícia aprovada: buscar conteúdo completo + enriquecer com IA
      // Executa em background sem bloquear a resposta
      void (async () => {
        const noticias = await db
          .select({ id: noticiasJuridicas.id, urlOriginal: noticiasJuridicas.urlOriginal, conteudo: noticiasJuridicas.conteudo })
          .from(noticiasJuridicas)
          .where(inArray(noticiasJuridicas.id, input.ids));

        for (const noticia of noticias) {
          // Buscar conteúdo completo — falha não bloqueia enriquecimento
          const conteudoAtual = noticia.conteudo ?? "";
          if (conteudoAtual.length < 500 && noticia.urlOriginal) {
            try {
              const fullHtml = await fetchFullContent(noticia.urlOriginal);
              const pdfLink = extractPdfLink(conteudoAtual) || extractPdfLink(fullHtml);
              let conteudoFinal: string;
              if (pdfLink) {
                const pdfText = await fetchPdfContent(pdfLink);
                conteudoFinal = pdfText
                  .split("\n\n")
                  .map(p => `<p>${p.replace(/\n/g, "<br>")}</p>`)
                  .join("\n");
              } else {
                conteudoFinal = cleanHtml(fullHtml);
              }
              await db.update(noticiasJuridicas)
                .set({ conteudo: conteudoFinal, updatedAt: new Date() })
                .where(eq(noticiasJuridicas.id, noticia.id));
            } catch {
              // Site pode bloquear scraping — usa o resumo RSS para enriquecimento
            }
          }

          // Enriquecer com IA — independente do conteúdo completo
          try {
            await enriquecerNoticia(noticia.id);
          } catch {
            // Silencioso — não quebra o fluxo de aprovação
          }

          // Extrair tese para jurisprudência — apenas Dizer o Direito
          try {
            await extrairTeseParaJurisprudencia(noticia.id);
          } catch {
            // Silencioso — não quebra o fluxo de aprovação
          }
        }
      })();

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

  // ==========================================
  // IA ENRICHMENT
  // ==========================================

  // Busca e salva o conteúdo completo de uma notícia (usado pelo reader)
  buscarConteudo: protectedProcedure
    .input(z.object({ noticiaId: z.number() }))
    .mutation(async ({ input }) => {
      const [noticia] = await db.select({
        id: noticiasJuridicas.id,
        urlOriginal: noticiasJuridicas.urlOriginal,
        conteudo: noticiasJuridicas.conteudo,
      })
        .from(noticiasJuridicas)
        .where(eq(noticiasJuridicas.id, input.noticiaId))
        .limit(1);

      if (!noticia) throw new Error("Notícia não encontrada");

      const conteudoAtual = noticia.conteudo ?? "";
      if (conteudoAtual.length >= 500) {
        return { conteudo: conteudoAtual, fromCache: true };
      }

      if (!noticia.urlOriginal) throw new Error("URL original não disponível");

      // 1. Buscar página original
      const fullHtml = await fetchFullContent(noticia.urlOriginal);

      // 2. Se houver link de PDF no conteúdo atual ou na página (ex: Dizer o Direito)
      const pdfLink = extractPdfLink(conteudoAtual) || extractPdfLink(fullHtml);
      let conteudoFinal: string;
      if (pdfLink) {
        try {
          const pdfText = await fetchPdfContent(pdfLink);
          // Formata como HTML simples para o prose renderer
          conteudoFinal = pdfText
            .split("\n\n")
            .map(p => `<p>${p.replace(/\n/g, "<br>")}</p>`)
            .join("\n");
        } catch {
          // Falha no PDF — usa HTML da página
          conteudoFinal = cleanHtml(fullHtml);
        }
      } else {
        conteudoFinal = cleanHtml(fullHtml);
      }

      await db.update(noticiasJuridicas)
        .set({ conteudo: conteudoFinal, updatedAt: new Date() })
        .where(eq(noticiasJuridicas.id, noticia.id));

      return { conteudo: conteudoFinal, fromCache: false };
    }),

  enriquecerComIA: protectedProcedure
    .input(z.object({ noticiaId: z.number() }))
    .mutation(async ({ input }) => {
      return enriquecerNoticia(input.noticiaId);
    }),

  enriquecerBatch: protectedProcedure
    .mutation(async () => {
      return enriquecerPendentes(10);
    }),

  // ==========================================
  // FAVORITOS
  // ==========================================

  toggleFavorito: protectedProcedure
    .input(z.object({ noticiaId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await db.select()
        .from(noticiasFavoritos)
        .where(and(
          eq(noticiasFavoritos.userId, ctx.user.id),
          eq(noticiasFavoritos.noticiaId, input.noticiaId),
        ))
        .limit(1);

      if (existing.length > 0) {
        await db.delete(noticiasFavoritos)
          .where(and(
            eq(noticiasFavoritos.userId, ctx.user.id),
            eq(noticiasFavoritos.noticiaId, input.noticiaId),
          ));
        return { favoritado: false };
      } else {
        await db.insert(noticiasFavoritos)
          .values({ userId: ctx.user.id, noticiaId: input.noticiaId });
        return { favoritado: true };
      }
    }),

  listFavoritos: protectedProcedure
    .query(async ({ ctx }) => {
      const favs = await db.select({
        favorito: noticiasFavoritos,
        noticia: noticiasJuridicas,
      })
        .from(noticiasFavoritos)
        .innerJoin(noticiasJuridicas, eq(noticiasFavoritos.noticiaId, noticiasJuridicas.id))
        .where(eq(noticiasFavoritos.userId, ctx.user.id))
        .orderBy(desc(noticiasFavoritos.createdAt));
      return favs;
    }),

  updateNotaFavorito: protectedProcedure
    .input(z.object({ noticiaId: z.number(), nota: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await db.update(noticiasFavoritos)
        .set({ nota: input.nota })
        .where(and(
          eq(noticiasFavoritos.userId, ctx.user.id),
          eq(noticiasFavoritos.noticiaId, input.noticiaId),
        ));
      return { success: true };
    }),

  getFavoritosIds: protectedProcedure
    .query(async ({ ctx }) => {
      const favs = await db.select({ noticiaId: noticiasFavoritos.noticiaId })
        .from(noticiasFavoritos)
        .where(eq(noticiasFavoritos.userId, ctx.user.id));
      return favs.map(f => f.noticiaId);
    }),

  // ==========================================
  // VÍNCULOS NOTÍCIA ↔ PROCESSO
  // ==========================================

  vincularProcesso: protectedProcedure
    .input(z.object({
      noticiaId: z.number(),
      processoId: z.number(),
      observacao: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      await db.insert(noticiasProcessos)
        .values({
          noticiaId: input.noticiaId,
          processoId: input.processoId,
          userId: ctx.user.id,
          observacao: input.observacao,
        })
        .onConflictDoNothing();
      return { success: true };
    }),

  desvincularProcesso: protectedProcedure
    .input(z.object({ noticiaId: z.number(), processoId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await db.delete(noticiasProcessos)
        .where(and(
          eq(noticiasProcessos.noticiaId, input.noticiaId),
          eq(noticiasProcessos.processoId, input.processoId),
          eq(noticiasProcessos.userId, ctx.user.id),
        ));
      return { success: true };
    }),

  listProcessosByNoticia: protectedProcedure
    .input(z.object({ noticiaId: z.number() }))
    .query(async ({ ctx, input }) => {
      return db.select()
        .from(noticiasProcessos)
        .where(and(
          eq(noticiasProcessos.noticiaId, input.noticiaId),
          eq(noticiasProcessos.userId, ctx.user.id),
        ));
    }),

  listNoticiasByProcesso: protectedProcedure
    .input(z.object({ processoId: z.number() }))
    .query(async ({ ctx, input }) => {
      return db.select({
        vinculo: noticiasProcessos,
        noticia: noticiasJuridicas,
      })
        .from(noticiasProcessos)
        .innerJoin(noticiasJuridicas, eq(noticiasProcessos.noticiaId, noticiasJuridicas.id))
        .where(and(
          eq(noticiasProcessos.processoId, input.processoId),
          eq(noticiasProcessos.userId, ctx.user.id),
        ))
        .orderBy(desc(noticiasProcessos.createdAt));
    }),

  // ==========================================
  // RELATÓRIO POR TEMA (IA)
  // ==========================================

  gerarRelatorio: protectedProcedure
    .input(z.object({
      periodo: z.enum(["7d", "30d", "90d"]),
      temas: z.array(z.string()),
      categorias: z.array(z.enum(["legislativa", "jurisprudencial", "artigo"])).optional(),
    }))
    .mutation(async ({ input }) => {
      const agora = new Date();
      const dias = input.periodo === "7d" ? 7 : input.periodo === "30d" ? 30 : 90;
      const dataInicio = new Date(agora.getTime() - dias * 24 * 60 * 60 * 1000);

      const conditions: Parameters<typeof and>[0][] = [
        eq(noticiasJuridicas.status, "aprovado"),
        sql`${noticiasJuridicas.publicadoEm} >= ${dataInicio.toISOString()}`,
      ];

      if (input.categorias?.length) {
        conditions.push(inArray(noticiasJuridicas.categoria, input.categorias));
      }

      if (input.temas.length > 0) {
        const temaConditions = input.temas.map(tema =>
          sql`${noticiasJuridicas.tags}::jsonb ? ${tema}`
        );
        conditions.push(sql`(${sql.join(temaConditions, sql` OR `)})`);
      }

      const noticias = await db.select({
        id: noticiasJuridicas.id,
        titulo: noticiasJuridicas.titulo,
        categoria: noticiasJuridicas.categoria,
        tags: noticiasJuridicas.tags,
        urlOriginal: noticiasJuridicas.urlOriginal,
        fonte: noticiasJuridicas.fonte,
        publicadoEm: noticiasJuridicas.publicadoEm,
        analiseIa: noticiasJuridicas.analiseIa,
      })
        .from(noticiasJuridicas)
        .where(and(...conditions))
        .orderBy(desc(noticiasJuridicas.publicadoEm))
        .limit(50);

      if (noticias.length === 0) {
        return { sintese: null, noticias: [], periodoTexto: "", temasTexto: "" };
      }

      const listaParaIA = noticias.map((n, i) => {
        const analise = n.analiseIa as { ratioDecidendi?: string } | null;
        const ratio = analise?.ratioDecidendi ? `\n   Ratio: ${analise.ratioDecidendi}` : "";
        return `${i + 1}. [${n.fonte}][${n.categoria}] ${n.titulo}${ratio}`;
      }).join("\n");

      const Anthropic = (await import("@anthropic-ai/sdk")).default;
      const client = new Anthropic();

      const periodoTexto = `${dataInicio.toLocaleDateString("pt-BR")} a ${agora.toLocaleDateString("pt-BR")}`;
      const temasTexto = input.temas.join(", ") || "todos os temas";

      const message = await client.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 2048,
        messages: [{
          role: "user",
          content: `Você é um assistente jurídico da DPE-BA. Gere um relatório executivo de jurisprudência e legislação.

Período: ${periodoTexto}
Temas: ${temasTexto}
Total de notícias: ${noticias.length}

Notícias:
${listaParaIA}

Responda em JSON (sem markdown):
{
  "sintese": "Parágrafo narrativo de 5-8 linhas sobre as tendências do período",
  "destaques": [
    { "titulo": "Destaque 1", "impacto": "Por que é importante para a defesa" }
  ],
  "alertas": ["Ponto de atenção 1 para defensores", "Ponto 2"]
}`,
        }],
      });

      const content = message.content[0];
      if (content.type !== "text") throw new Error("Resposta inesperada");
      const jsonText = content.text.replace(/```json\n?|```\n?/g, "").trim();
      const parsed = JSON.parse(jsonText) as {
        sintese: string;
        destaques: { titulo: string; impacto: string }[];
        alertas: string[];
      };

      return {
        sintese: parsed,
        noticias,
        periodoTexto,
        temasTexto,
      };
    }),
});
