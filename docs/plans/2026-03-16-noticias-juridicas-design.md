# Notícias Jurídicas — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Página de feed de notícias jurídicas com scraping automático de portais, curadoria manual, e 3 abas (Legislativas, Jurisprudenciais, Artigos).

**Architecture:** Cron job diário (Vercel Cron) scrapa RSS/HTML de portais jurídicos, classifica por categoria e tags via keywords, salva como "pendente". Defensor faz triagem (aprovar/descartar). Feed mostra conteúdo completo inline com filtros por fonte, tag e período.

**Tech Stack:** Next.js 15 App Router, tRPC (protectedProcedure), Drizzle ORM + Supabase PostgreSQL, Tailwind + shadcn/ui, cheerio (HTML parsing), Vercel Cron

---

## Fontes de Dados (Fase 1)

| Portal | Tipo | URL Feed |
|--------|------|----------|
| ConJur | RSS 2.0 | `https://www.conjur.com.br/feed/` |
| STJ Notícias | RSS 2.0 | `https://res.stj.jus.br/hrestp-c-portalp/RSS.xml` |
| IBCCRIM | RSS 2.0 | `https://ibccrim.org.br/feed/` |
| Dizer o Direito | HTML scrape | `https://www.dizerodireito.com.br/` |

---

### Task 1: Schema do Banco de Dados

**Files:**
- Create: `src/lib/db/schema/noticias.ts`
- Modify: `src/lib/db/schema/index.ts`

**Step 1: Criar schema Drizzle com 3 tabelas**

```typescript
// src/lib/db/schema/noticias.ts
import {
  pgTable, serial, text, varchar, timestamp, integer, boolean, index, jsonb,
} from "drizzle-orm/pg-core";
import { users } from "./core";

// ==========================================
// NOTÍCIAS JURÍDICAS - Feed + Curadoria
// ==========================================

export const noticiasFontes = pgTable("noticias_fontes", {
  id: serial("id").primaryKey(),
  nome: varchar("nome", { length: 100 }).notNull(),
  urlBase: varchar("url_base", { length: 500 }).notNull(),
  urlFeed: varchar("url_feed", { length: 500 }).notNull(),
  tipo: varchar("tipo", { length: 20 }).notNull(), // "rss" | "html_scrape"
  seletorCss: text("seletor_css"), // CSS selector for HTML scrape
  cor: varchar("cor", { length: 20 }).default("#71717a"), // badge color
  ativo: boolean("ativo").default(true).notNull(),
  ultimoScrapeEm: timestamp("ultimo_scrape_em"),
  ultimoErro: text("ultimo_erro"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const noticiasJuridicas = pgTable("noticias_juridicas", {
  id: serial("id").primaryKey(),
  titulo: text("titulo").notNull(),
  conteudo: text("conteudo"), // HTML completo limpo
  resumo: text("resumo"), // preview 2-3 linhas
  fonte: varchar("fonte", { length: 50 }).notNull(), // "conjur" | "stj" | "ibccrim" | "dizer-o-direito"
  fonteId: integer("fonte_id").references(() => noticiasFontes.id),
  urlOriginal: varchar("url_original", { length: 1000 }).notNull().unique(),
  autor: varchar("autor", { length: 200 }),
  imagemUrl: varchar("imagem_url", { length: 1000 }),
  categoria: varchar("categoria", { length: 30 }).notNull(), // "legislativa" | "jurisprudencial" | "artigo"
  tags: jsonb("tags").$type<string[]>().default([]),
  status: varchar("status", { length: 20 }).default("pendente").notNull(), // "pendente" | "aprovado" | "descartado"
  aprovadoPor: integer("aprovado_por").references(() => users.id),
  aprovadoEm: timestamp("aprovado_em"),
  publicadoEm: timestamp("publicado_em"), // data original do portal
  scrapeadoEm: timestamp("scrapeado_em").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("not_jur_status_idx").on(table.status),
  index("not_jur_categoria_idx").on(table.categoria),
  index("not_jur_fonte_idx").on(table.fonte),
  index("not_jur_publicado_idx").on(table.publicadoEm),
  index("not_jur_url_idx").on(table.urlOriginal),
]);

export const noticiasTemas = pgTable("noticias_temas", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  nome: varchar("nome", { length: 100 }).notNull(),
  keywords: jsonb("keywords").$type<string[]>().default([]),
  ativo: boolean("ativo").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("not_temas_user_idx").on(table.userId),
]);

export type NoticiaFonte = typeof noticiasFontes.$inferSelect;
export type InsertNoticiaFonte = typeof noticiasFontes.$inferInsert;
export type NoticiaJuridica = typeof noticiasJuridicas.$inferSelect;
export type InsertNoticiaJuridica = typeof noticiasJuridicas.$inferInsert;
export type NoticiaTema = typeof noticiasTemas.$inferSelect;
export type InsertNoticiaTema = typeof noticiasTemas.$inferInsert;
```

**Step 2: Adicionar export ao barrel**

Em `src/lib/db/schema/index.ts`, adicionar antes da linha `export * from "./relations"`:
```typescript
export * from "./noticias";
```

**Step 3: Aplicar migration via Supabase MCP**

Usar `apply_migration` com SQL equivalente ao schema acima (CREATE TABLE + indexes).

**Step 4: Seed fontes iniciais**

Inserir as 4 fontes da Fase 1 na tabela `noticias_fontes` via SQL.

**Step 5: Commit**

```bash
git add src/lib/db/schema/noticias.ts src/lib/db/schema/index.ts
git commit -m "feat(noticias): schema para notícias jurídicas, fontes e temas"
```

---

### Task 2: Configuração de Classificação e Tags

**Files:**
- Create: `src/config/noticias/classifier.ts`
- Create: `src/config/noticias/index.ts`

**Step 1: Criar config de classificação por keywords**

```typescript
// src/config/noticias/classifier.ts

export type CategoriaNoticia = "legislativa" | "jurisprudencial" | "artigo";

export const KEYWORDS_LEGISLATIVA = [
  "lei nº", "lei n.", "sancionou", "sancionada", "promulgada", "promulgou",
  "PL ", "PLC ", "PLS ", "PEC ", "MP nº", "medida provisória",
  "nova redação", "alteração legislativa", "alterou", "revogou", "revogada",
  "decreto nº", "decreto n.", "resolução nº", "portaria nº",
  "entrou em vigor", "vacatio legis", "publicada no DOU",
  "projeto de lei", "aprovado pelo senado", "aprovado pela câmara",
];

export const KEYWORDS_JURISPRUDENCIAL = [
  "STF decidiu", "STJ decidiu", "STF fixou", "STJ fixou",
  "informativo nº", "informativo stf", "informativo stj",
  "tese fixada", "tese firmada", "repercussão geral", "recurso repetitivo",
  "HC", "habeas corpus", "RHC", "recurso especial", "REsp",
  "recurso extraordinário", "RE ", "ADPF", "ADI", "ADC",
  "súmula vinculante", "súmula nº", "overruling",
  "turma decidiu", "plenário decidiu", "seção decidiu",
  "jurisprudência", "julgamento", "acórdão",
];

export const TEMAS_PADRAO: { nome: string; keywords: string[] }[] = [
  { nome: "Direito Penal", keywords: ["penal", "crime", "homicídio", "art. 121", "furto", "roubo", "estelionato", "código penal"] },
  { nome: "Processo Penal", keywords: ["processo penal", "CPP", "prisão preventiva", "prisão cautelar", "audiência de custódia", "interceptação", "busca e apreensão"] },
  { nome: "Execução Penal", keywords: ["execução penal", "LEP", "preso", "progressão", "regime", "livramento condicional", "saída temporária", "indulto"] },
  { nome: "Tribunal do Júri", keywords: ["júri", "plenário", "quesitos", "pronúncia", "impronúncia", "desclassificação"] },
  { nome: "Violência Doméstica", keywords: ["maria da penha", "violência doméstica", "medida protetiva", "lei 11.340", "VVD"] },
  { nome: "Drogas", keywords: ["drogas", "lei 11.343", "tráfico", "uso de drogas", "art. 28", "art. 33", "tráfico privilegiado"] },
  { nome: "ECA", keywords: ["ECA", "adolescente", "menor", "ato infracional", "medida socioeducativa", "internação"] },
  { nome: "Defensoria Pública", keywords: ["defensoria", "defensor público", "DPE", "DPU", "LC 80", "assistência jurídica"] },
];

/** Classifica uma notícia pela categoria baseado no título + resumo */
export function classificarNoticia(titulo: string, texto: string): CategoriaNoticia {
  const combined = `${titulo} ${texto}`.toLowerCase();

  const scoreleg = KEYWORDS_LEGISLATIVA.reduce((s, k) => s + (combined.includes(k.toLowerCase()) ? 1 : 0), 0);
  const scorejur = KEYWORDS_JURISPRUDENCIAL.reduce((s, k) => s + (combined.includes(k.toLowerCase()) ? 1 : 0), 0);

  if (scoreleg > scorejur && scoreleg > 0) return "legislativa";
  if (scorejur > scoreleg && scorejur > 0) return "jurisprudencial";
  if (scoreleg > 0) return "legislativa";
  if (scorejur > 0) return "jurisprudencial";
  return "artigo";
}

/** Retorna tags matched para uma notícia */
export function extrairTags(titulo: string, texto: string, temasCustom: { nome: string; keywords: string[] }[] = []): string[] {
  const combined = `${titulo} ${texto}`.toLowerCase();
  const allTemas = [...TEMAS_PADRAO, ...temasCustom];
  return allTemas
    .filter(tema => tema.keywords.some(kw => combined.includes(kw.toLowerCase())))
    .map(tema => tema.nome);
}
```

```typescript
// src/config/noticias/index.ts
export * from "./classifier";
```

**Step 2: Commit**

```bash
git add src/config/noticias/
git commit -m "feat(noticias): classificador de categorias e tags por keywords"
```

---

### Task 3: Serviço de Scraping (RSS + HTML)

**Files:**
- Create: `src/lib/noticias/scraper.ts`
- Create: `src/lib/noticias/html-cleaner.ts`

**Step 1: Criar HTML cleaner**

```typescript
// src/lib/noticias/html-cleaner.ts

/**
 * Remove tags desnecessárias e preserva conteúdo legível.
 * Mantém: p, h1-h6, ul, ol, li, blockquote, strong, em, a, br, img
 * Remove: script, style, nav, aside, footer, iframe, form, ads
 */
export function cleanHtml(rawHtml: string): string {
  let html = rawHtml;

  // Remove scripts, styles, nav, aside, footer
  html = html.replace(/<script[\s\S]*?<\/script>/gi, "");
  html = html.replace(/<style[\s\S]*?<\/style>/gi, "");
  html = html.replace(/<nav[\s\S]*?<\/nav>/gi, "");
  html = html.replace(/<aside[\s\S]*?<\/aside>/gi, "");
  html = html.replace(/<footer[\s\S]*?<\/footer>/gi, "");
  html = html.replace(/<iframe[\s\S]*?<\/iframe>/gi, "");
  html = html.replace(/<form[\s\S]*?<\/form>/gi, "");
  html = html.replace(/<noscript[\s\S]*?<\/noscript>/gi, "");

  // Remove classes and data attributes, keep href and src
  html = html.replace(/ (class|id|data-[a-z-]+|style|onclick|onload)="[^"]*"/gi, "");

  // Remove empty tags
  html = html.replace(/<(\w+)[^>]*>\s*<\/\1>/gi, "");

  return html.trim();
}

/** Extrai texto puro (sem HTML) para preview/resumo */
export function extractPlainText(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

/** Gera resumo de N caracteres do texto */
export function gerarResumo(html: string, maxChars = 300): string {
  const plain = extractPlainText(html);
  if (plain.length <= maxChars) return plain;
  return plain.slice(0, maxChars).replace(/\s\S*$/, "") + "…";
}
```

**Step 2: Criar scraper principal**

```typescript
// src/lib/noticias/scraper.ts
import { db } from "@/lib/db";
import { noticiasFontes, noticiasJuridicas } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { cleanHtml, gerarResumo, extractPlainText } from "./html-cleaner";
import { classificarNoticia, extrairTags } from "@/config/noticias";

type ScrapedItem = {
  titulo: string;
  url: string;
  autor?: string;
  publicadoEm?: Date;
  conteudoHtml?: string;
};

// ==========================================
// RSS PARSER (sem dependência externa)
// ==========================================

function parseRssItems(xml: string): ScrapedItem[] {
  const items: ScrapedItem[] = [];
  const itemMatches = xml.match(/<item[\s\S]*?<\/item>/gi) || [];

  for (const itemXml of itemMatches) {
    const titulo = itemXml.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/)?.[1]
      || itemXml.match(/<title>(.*?)<\/title>/)?.[1]
      || "";
    const url = itemXml.match(/<link>(.*?)<\/link>/)?.[1]
      || itemXml.match(/<link[^>]*href="([^"]*)"[^>]*\/>/)?.[1]
      || "";
    const autor = itemXml.match(/<dc:creator><!\[CDATA\[(.*?)\]\]><\/dc:creator>/)?.[1]
      || itemXml.match(/<author>(.*?)<\/author>/)?.[1];
    const pubDate = itemXml.match(/<pubDate>(.*?)<\/pubDate>/)?.[1];
    const contentEncoded = itemXml.match(/<content:encoded><!\[CDATA\[([\s\S]*?)\]\]><\/content:encoded>/)?.[1];
    const description = itemXml.match(/<description><!\[CDATA\[([\s\S]*?)\]\]><\/description>/)?.[1]
      || itemXml.match(/<description>([\s\S]*?)<\/description>/)?.[1];

    if (!titulo || !url) continue;

    items.push({
      titulo: titulo.replace(/<!\[CDATA\[|\]\]>/g, "").trim(),
      url: url.trim(),
      autor: autor?.trim(),
      publicadoEm: pubDate ? new Date(pubDate) : undefined,
      conteudoHtml: contentEncoded || description,
    });
  }
  return items;
}

// ==========================================
// HTML SCRAPER (para Dizer o Direito etc.)
// ==========================================

async function scrapeHtmlPage(url: string, seletorCss?: string | null): Promise<ScrapedItem[]> {
  const res = await fetch(url, {
    headers: { "User-Agent": "OmbudsBot/1.0 (Defensoria Publica BA; legal research)" },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${url}`);
  const html = await res.text();

  // Para Dizer o Direito (Blogger): extrair posts da página principal
  const items: ScrapedItem[] = [];
  const postPattern = /<h3[^>]*class="[^"]*post-title[^"]*"[^>]*>[\s\S]*?<a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi;
  let match;
  while ((match = postPattern.exec(html)) !== null) {
    items.push({
      titulo: match[2].replace(/<[^>]+>/g, "").trim(),
      url: match[1].trim(),
    });
  }

  // Fallback: extrair todos os links de artigo com h2/h3
  if (items.length === 0) {
    const linkPattern = /<(?:h2|h3)[^>]*>[\s\S]*?<a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi;
    while ((match = linkPattern.exec(html)) !== null) {
      const titulo = match[2].replace(/<[^>]+>/g, "").trim();
      if (titulo.length > 10) {
        items.push({ titulo, url: match[1].trim() });
      }
    }
  }

  return items.slice(0, 20); // max 20 por scrape
}

// ==========================================
// FETCH CONTEÚDO COMPLETO
// ==========================================

async function fetchFullContent(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { "User-Agent": "OmbudsBot/1.0 (Defensoria Publica BA; legal research)" },
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const html = await res.text();

  // Extrair conteúdo do article/main ou body
  const articleMatch = html.match(/<article[^>]*>([\s\S]*?)<\/article>/i)
    || html.match(/<main[^>]*>([\s\S]*?)<\/main>/i)
    || html.match(/<div[^>]*class="[^"]*(?:post-body|entry-content|article-content|content-text|materia-content)[^"]*"[^>]*>([\s\S]*?)<\/div>/i);

  const rawContent = articleMatch ? (articleMatch[1] || articleMatch[0]) : html;
  return cleanHtml(rawContent);
}

// ==========================================
// PIPELINE PRINCIPAL
// ==========================================

export type ScrapeResult = {
  fonte: string;
  total: number;
  novos: number;
  erros: number;
  erro?: string;
};

export async function scrapeAllFontes(): Promise<ScrapeResult[]> {
  const fontes = await db.select().from(noticiasFontes).where(eq(noticiasFontes.ativo, true));
  const results: ScrapeResult[] = [];

  for (const fonte of fontes) {
    const result: ScrapeResult = { fonte: fonte.nome, total: 0, novos: 0, erros: 0 };

    try {
      let items: ScrapedItem[];

      if (fonte.tipo === "rss") {
        const res = await fetch(fonte.urlFeed, {
          headers: { "User-Agent": "OmbudsBot/1.0 (Defensoria Publica BA)" },
          signal: AbortSignal.timeout(10000),
        });
        if (!res.ok) throw new Error(`RSS HTTP ${res.status}`);
        items = parseRssItems(await res.text());
      } else {
        items = await scrapeHtmlPage(fonte.urlFeed, fonte.seletorCss);
      }

      result.total = items.length;

      for (const item of items) {
        try {
          // Checar duplicata por URL
          const existing = await db.select({ id: noticiasJuridicas.id })
            .from(noticiasJuridicas)
            .where(eq(noticiasJuridicas.urlOriginal, item.url))
            .limit(1);

          if (existing.length > 0) continue;

          // Fetch conteúdo completo se não veio no RSS
          let conteudo = item.conteudoHtml || "";
          if (!conteudo || conteudo.length < 200) {
            try {
              conteudo = await fetchFullContent(item.url);
            } catch {
              // Use o que temos
            }
          }

          const plainText = extractPlainText(conteudo);
          const categoria = classificarNoticia(item.titulo, plainText);
          const tags = extrairTags(item.titulo, plainText);
          const resumo = gerarResumo(conteudo);

          await db.insert(noticiasJuridicas).values({
            titulo: item.titulo,
            conteudo: cleanHtml(conteudo),
            resumo,
            fonte: fonte.nome.toLowerCase().replace(/\s+/g, "-"),
            fonteId: fonte.id,
            urlOriginal: item.url,
            autor: item.autor,
            categoria,
            tags,
            status: "pendente",
            publicadoEm: item.publicadoEm,
          });

          result.novos++;
        } catch (err) {
          result.erros++;
        }
      }

      // Atualizar timestamp do último scrape
      await db.update(noticiasFontes)
        .set({ ultimoScrapeEm: new Date(), ultimoErro: null })
        .where(eq(noticiasFontes.id, fonte.id));

    } catch (err) {
      result.erro = err instanceof Error ? err.message : String(err);
      await db.update(noticiasFontes)
        .set({ ultimoErro: result.erro, ultimoScrapeEm: new Date() })
        .where(eq(noticiasFontes.id, fonte.id));
    }

    results.push(result);
  }

  return results;
}
```

**Step 3: Commit**

```bash
git add src/lib/noticias/
git commit -m "feat(noticias): scraper RSS/HTML + classificador + HTML cleaner"
```

---

### Task 4: Cron Job API Route

**Files:**
- Create: `src/app/api/cron/noticias/route.ts`
- Modify: `vercel.json` (adicionar cron)

**Step 1: Criar route**

```typescript
// src/app/api/cron/noticias/route.ts
import { NextRequest, NextResponse } from "next/server";
import { scrapeAllFontes } from "@/lib/noticias/scraper";

/**
 * Cron job para scraping de notícias jurídicas.
 * Roda 1x/dia às 7h BRT (10h UTC).
 * Protegido por CRON_SECRET.
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const results = await scrapeAllFontes();
    const totalNovos = results.reduce((s, r) => s + r.novos, 0);
    const totalErros = results.reduce((s, r) => s + r.erros, 0);

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      totalNovos,
      totalErros,
      fontes: results,
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }, { status: 500 });
  }
}
```

**Step 2: Adicionar cron ao vercel.json**

Adicionar ao array `crons`:
```json
{
  "path": "/api/cron/noticias",
  "schedule": "0 10 * * *"
}
```

(10h UTC = 7h BRT)

**Step 3: Commit**

```bash
git add src/app/api/cron/noticias/route.ts vercel.json
git commit -m "feat(noticias): cron job diário para scraping de portais jurídicos"
```

---

### Task 5: tRPC Router

**Files:**
- Create: `src/lib/trpc/routers/noticias.ts`
- Modify: `src/lib/trpc/routers/index.ts`

**Step 1: Criar router completo**

```typescript
// src/lib/trpc/routers/noticias.ts
import { z } from "zod";
import { router, protectedProcedure } from "../init";
import { db } from "@/lib/db";
import { noticiasJuridicas, noticiasFontes, noticiasTemas } from "@/lib/db/schema";
import { eq, and, desc, ilike, sql, inArray } from "drizzle-orm";

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
      cursor: z.number().optional(), // id for cursor-based pagination
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
```

**Step 2: Registrar no router principal**

Em `src/lib/trpc/routers/index.ts`:
- Adicionar import: `import { noticiasRouter } from "./noticias";`
- Adicionar ao `appRouter`: `noticias: noticiasRouter,`

**Step 3: Commit**

```bash
git add src/lib/trpc/routers/noticias.ts src/lib/trpc/routers/index.ts
git commit -m "feat(noticias): tRPC router com feed, triagem, scrape manual, fontes e temas"
```

---

### Task 6: Página Principal — Layout + Abas + Header

**Files:**
- Create: `src/app/(dashboard)/admin/noticias/page.tsx`
- Modify: `src/components/layouts/admin-sidebar.tsx`

**Step 1: Criar página com 3 abas**

```typescript
// src/app/(dashboard)/admin/noticias/page.tsx
"use client";

import { useState, useCallback } from "react";
import { Breadcrumbs } from "@/components/shared/breadcrumbs";
import { Newspaper, Scale, Gavel, BookOpen, RefreshCw, Settings, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc/client";
import { NoticiasFeed } from "@/components/noticias/noticias-feed";
import { NoticiasTriagem } from "@/components/noticias/noticias-triagem";

type Tab = "legislativa" | "jurisprudencial" | "artigo";

const TABS: { value: Tab; label: string; icon: typeof Scale }[] = [
  { value: "legislativa", label: "Legislativas", icon: Scale },
  { value: "jurisprudencial", label: "Jurisprudenciais", icon: Gavel },
  { value: "artigo", label: "Artigos", icon: BookOpen },
];

export default function NoticiasPage() {
  const [tab, setTab] = useState<Tab>("legislativa");
  const [triagemOpen, setTriagemOpen] = useState(true);

  const { data: pendentesCount } = trpc.noticias.countPendentes.useQuery();
  const buscarAgora = trpc.noticias.buscarAgora.useMutation();
  const utils = trpc.useUtils();

  const handleBuscarAgora = useCallback(async () => {
    await buscarAgora.mutateAsync();
    utils.noticias.listPendentes.invalidate();
    utils.noticias.countPendentes.invalidate();
    utils.noticias.list.invalidate();
  }, [buscarAgora, utils]);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
              <Newspaper className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <Breadcrumbs items={[
                { label: "Ferramentas" },
                { label: "Notícias Jurídicas" },
              ]} />
              <h1 className="text-lg font-semibold">Notícias Jurídicas</h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {(pendentesCount ?? 0) > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setTriagemOpen(!triagemOpen)}
              >
                <Filter className="h-4 w-4 mr-1" />
                Triagem
                <Badge variant="destructive" className="ml-1.5 animate-pulse">
                  {pendentesCount}
                </Badge>
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={handleBuscarAgora}
              disabled={buscarAgora.isPending}
            >
              <RefreshCw className={cn("h-4 w-4 mr-1", buscarAgora.isPending && "animate-spin")} />
              Buscar Agora
            </Button>
          </div>
        </div>

        {/* Tab switcher */}
        <div className="flex gap-1 bg-zinc-100 dark:bg-zinc-800/50 rounded-lg p-1 w-fit">
          {TABS.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              onClick={() => setTab(value)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all",
                tab === value
                  ? "bg-white dark:bg-zinc-700 shadow-sm text-emerald-700 dark:text-emerald-400"
                  : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Triagem panel */}
      {triagemOpen && (pendentesCount ?? 0) > 0 && (
        <NoticiasTriagem
          onClose={() => setTriagemOpen(false)}
          onUpdate={() => {
            utils.noticias.list.invalidate();
            utils.noticias.countPendentes.invalidate();
          }}
        />
      )}

      {/* Feed */}
      <div className="flex-1 overflow-y-auto">
        <NoticiasFeed categoria={tab} />
      </div>
    </div>
  );
}
```

**Step 2: Adicionar na sidebar**

Em `src/components/layouts/admin-sidebar.tsx`, no array `TOOLS_NAV`, adicionar após "Legislação":
```typescript
{ label: "Notícias", path: "/admin/noticias", icon: "Newspaper" },
```

Também adicionar `Newspaper` ao import e iconMap se necessário.

**Step 3: Commit**

```bash
git add src/app/(dashboard)/admin/noticias/page.tsx src/components/layouts/admin-sidebar.tsx
git commit -m "feat(noticias): página principal com 3 abas e sidebar entry"
```

---

### Task 7: Componente de Feed (lista de notícias aprovadas)

**Files:**
- Create: `src/components/noticias/noticias-feed.tsx`

**Step 1: Criar componente de feed com cards expansíveis**

Componente que:
- Recebe `categoria` como prop
- Usa `trpc.noticias.list.useInfiniteQuery` com cursor pagination
- Cards com: badge da fonte (colorido), título, data, preview, tags
- Click expande inline mostrando conteúdo HTML completo (via `dangerouslySetInnerHTML`)
- Botões no card expandido: "Abrir Original" (link externo), "Copiar Link"
- Filtros: busca textual, filtro por fonte, filtro por tag
- "Carregar mais" no fim da lista
- Skeleton loading state
- Empty state com ícone e mensagem

Seguir Padrão Defender (zinc + emerald). Cards com `hover:border-emerald-500/30`, `group`, `cursor-pointer`. Tags como badges `bg-zinc-100 dark:bg-zinc-800`. Fonte badge com cor da fonte.

**Step 2: Commit**

```bash
git add src/components/noticias/noticias-feed.tsx
git commit -m "feat(noticias): componente de feed com cards expansíveis e filtros"
```

---

### Task 8: Componente de Triagem (curadoria)

**Files:**
- Create: `src/components/noticias/noticias-triagem.tsx`

**Step 1: Criar componente de triagem**

Componente que:
- Usa `trpc.noticias.listPendentes.useQuery()`
- Seção colapsável no topo da página com fundo amarelo/amber suave
- Header: "Triagem" + contagem + "Aprovar Todos" + "Descartar Todos"
- Cards compactos horizontais: fonte badge, título, preview 1 linha, categoria sugerida (dropdown editável), data
- Ações por card: ✅ (aprovar) e ❌ (descartar) — botões icon-only
- Checkbox para seleção múltipla + ações em batch
- Usa `trpc.noticias.aprovar` e `trpc.noticias.descartar` mutations
- `onUpdate` callback para invalidar queries do pai
- `onClose` para fechar o painel

**Step 2: Commit**

```bash
git add src/components/noticias/noticias-triagem.tsx
git commit -m "feat(noticias): componente de triagem com aprovação/descarte batch"
```

---

### Task 9: Testes e Polish

**Step 1: Build check**

```bash
npm run build
```

Fix any type errors.

**Step 2: Testar scrape manual via browser**

Abrir `/admin/noticias`, clicar "Buscar Agora", verificar que:
- Pendentes aparecem na triagem
- Aprovar funciona
- Feed mostra notícias aprovadas
- Cards expandem com conteúdo
- 3 abas filtram corretamente

**Step 3: Deploy test**

```bash
vercel --prod
```

Verificar que o cron está registrado no dashboard Vercel.

**Step 4: Commit final**

```bash
git add -A
git commit -m "feat(noticias): polish, fixes e deploy de notícias jurídicas"
```

---

## Resumo de Tasks

| # | Task | Arquivos | Dependência |
|---|------|----------|-------------|
| 1 | Schema DB | schema/noticias.ts | - |
| 2 | Classificador | config/noticias/ | - |
| 3 | Scraper | lib/noticias/ | 1, 2 |
| 4 | Cron API Route | api/cron/noticias/ | 3 |
| 5 | tRPC Router | routers/noticias.ts | 1 |
| 6 | Página + Sidebar | admin/noticias/page.tsx | 5 |
| 7 | Feed Component | noticias-feed.tsx | 5 |
| 8 | Triagem Component | noticias-triagem.tsx | 5 |
| 9 | Testes e Polish | - | 1-8 |

**Tasks parallelizáveis:**
- Tasks 1 + 2 (sem dependência mútua)
- Tasks 4 + 5 (ambas dependem de 1+2+3, mas não entre si)
- Tasks 6 + 7 + 8 (UI components, dependem de 5 mas não entre si)
