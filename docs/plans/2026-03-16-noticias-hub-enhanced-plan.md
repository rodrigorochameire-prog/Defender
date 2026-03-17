# Notícias Hub — Enriquecimento Completo (Implementation Plan)

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Transformar o feed básico de notícias em hub completo com IA, Magazine Layout, Favoritos, Associação a Casos e Relatórios por Tema.

**Architecture:** Enriquecimento lazy via Claude Sonnet 4.6 (salvo em jsonb `analise_ia`). Layout Magazine com card featured + grid 2 colunas. Favoritos e vínculos com casos em tabelas dedicadas. Relatórios gerados por IA com síntese narrativa por tema.

**Pré-requisito:** Infraestrutura base (Tasks 1–9 do plano `2026-03-16-noticias-juridicas-design.md`) já implementada. As tabelas `noticias_fontes`, `noticias_juridicas`, `noticias_temas` já existem. O router `noticias` já está registrado.

**Tech Stack:** Claude Sonnet 4.6 (`@anthropic-ai/sdk`), Next.js 15, tRPC, Drizzle ORM, Supabase MCP (`apply_migration`), shadcn/ui Sheet + Dialog

---

## Tasks Paralelizáveis

- **Tasks A + B** podem rodar em paralelo (schema independente do enricher)
- **Tasks C + D** podem rodar em paralelo após A+B (router + enricher service)
- **Tasks E + F + G** podem rodar em paralelo após C+D (componentes UI independentes)
- **Task H** após E+F+G (relatório depende dos outros componentes)
- **Task I** após H (integração final + polish)

---

### Task A: Schema — Adicionar `analise_ia` + Tabelas `noticias_favoritos` + `noticias_processos`

**Files:**
- Modify: `src/lib/db/schema/noticias.ts`
- Apply migration via Supabase MCP

**Step 1: Adicionar coluna `analise_ia` e novas tabelas ao schema Drizzle**

Em `src/lib/db/schema/noticias.ts`, adicionar o campo `analise_ia` na tabela existente e as 2 novas tabelas:

```typescript
// Adicionar import de uniqueIndex se não existir
import {
  pgTable, serial, text, varchar, timestamp, integer, boolean, index, jsonb, uniqueIndex,
} from "drizzle-orm/pg-core";
import { users } from "./core";
import { processos } from "./core"; // ou onde processos é definido — verificar import correto
```

Na tabela `noticiasJuridicas`, adicionar campo após `updatedAt`:
```typescript
  analiseIa: jsonb("analise_ia").$type<{
    resumoExecutivo: string;
    impactoPratico: string;
    ratioDecidendi?: string;
    casosAplicaveis: string[];
    processadoEm: string;
    modeloUsado: string;
  } | null>().default(null),
```

Adicionar as 2 novas tabelas ao final do arquivo (antes dos type exports):

```typescript
// ==========================================
// FAVORITOS - Notícias salvas pelo defensor
// ==========================================

export const noticiasFavoritos = pgTable("noticias_favoritos", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  noticiaId: integer("noticia_id").references(() => noticiasJuridicas.id, { onDelete: "cascade" }).notNull(),
  nota: text("nota"), // anotação pessoal do defensor
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("not_fav_unique_idx").on(table.userId, table.noticiaId),
  index("not_fav_user_idx").on(table.userId),
]);

// ==========================================
// VÍNCULOS - Notícias associadas a processos
// ==========================================

export const noticiasProcessos = pgTable("noticias_processos", {
  id: serial("id").primaryKey(),
  noticiaId: integer("noticia_id").references(() => noticiasJuridicas.id, { onDelete: "cascade" }).notNull(),
  processoId: integer("processo_id").notNull(), // referência ao processo (sem FK para evitar dependência circular)
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  observacao: text("observacao"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("not_proc_unique_idx").on(table.noticiaId, table.processoId),
  index("not_proc_noticia_idx").on(table.noticiaId),
  index("not_proc_processo_idx").on(table.processoId),
]);
```

Adicionar types ao final:
```typescript
export type NoticiaFavorito = typeof noticiasFavoritos.$inferSelect;
export type InsertNoticiaFavorito = typeof noticiasFavoritos.$inferInsert;
export type NoticiaProcesso = typeof noticiasProcessos.$inferSelect;
export type InsertNoticiaProcesso = typeof noticiasProcessos.$inferInsert;
```

**Step 2: Aplicar migration via Supabase MCP**

Usar `apply_migration` com o seguinte SQL:

```sql
-- Coluna analise_ia na tabela existente
ALTER TABLE noticias_juridicas ADD COLUMN IF NOT EXISTS analise_ia jsonb DEFAULT NULL;

-- Tabela de favoritos
CREATE TABLE IF NOT EXISTS noticias_favoritos (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  noticia_id INTEGER NOT NULL REFERENCES noticias_juridicas(id) ON DELETE CASCADE,
  nota TEXT,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  CONSTRAINT not_fav_unique_idx UNIQUE (user_id, noticia_id)
);
CREATE INDEX IF NOT EXISTS not_fav_user_idx ON noticias_favoritos(user_id);

-- Tabela de vínculos notícia-processo
CREATE TABLE IF NOT EXISTS noticias_processos (
  id SERIAL PRIMARY KEY,
  noticia_id INTEGER NOT NULL REFERENCES noticias_juridicas(id) ON DELETE CASCADE,
  processo_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  observacao TEXT,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  CONSTRAINT not_proc_unique_idx UNIQUE (noticia_id, processo_id)
);
CREATE INDEX IF NOT EXISTS not_proc_noticia_idx ON noticias_processos(noticia_id);
CREATE INDEX IF NOT EXISTS not_proc_processo_idx ON noticias_processos(processo_id);
```

**Step 3: Commit**

```bash
git add src/lib/db/schema/noticias.ts
git commit -m "feat(noticias): adicionar analise_ia, noticias_favoritos e noticias_processos ao schema"
```

---

### Task B: IA Enricher Service

**Files:**
- Create: `src/lib/noticias/enricher.ts`

**Step 1: Criar serviço de enriquecimento**

```typescript
// src/lib/noticias/enricher.ts
import Anthropic from "@anthropic-ai/sdk";
import { db } from "@/lib/db";
import { noticiasJuridicas } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { extractPlainText } from "./html-cleaner";

const anthropic = new Anthropic();

export type AnaliseIA = {
  resumoExecutivo: string;
  impactoPratico: string;
  ratioDecidendi?: string;
  casosAplicaveis: string[];
  processadoEm: string;
  modeloUsado: string;
};

const SYSTEM_PROMPT = `Você é um assistente jurídico especializado da Defensoria Pública do Estado da Bahia (DPE-BA), 7ª Regional, com foco em direito penal e processual penal.

Sua função é analisar notícias jurídicas e extrair informações práticas para defensores públicos que atuam em:
- Criminal comum (furto, roubo, homicídio, tráfico, estelionato)
- Execução penal (progressão, livramento, indulto, remição)
- Tribunal do Júri
- Violência doméstica (Lei Maria da Penha)
- ECA (atos infracionais)

Responda SEMPRE em JSON válido, sem markdown, sem texto fora do JSON.`;

function buildPrompt(noticia: { titulo: string; categoria: string; conteudo: string | null; resumo: string | null }): string {
  const texto = noticia.conteudo
    ? extractPlainText(noticia.conteudo).slice(0, 4000)
    : (noticia.resumo ?? "");

  const ratioInstrucao = noticia.categoria === "jurisprudencial"
    ? `"ratioDecidendi": "Tese fixada em 1-2 frases, exatamente como citaria numa peça processual",`
    : `"ratioDecidendi": null,  // null para legislativa e artigo`;

  return `Analise a notícia jurídica abaixo e responda com JSON neste formato exato:
{
  "resumoExecutivo": "3-4 frases diretas sobre o que aconteceu, sem juridiquês desnecessário",
  "impactoPratico": "O que isso muda na prática para defensores públicos criminais? Seja concreto.",
  ${ratioInstrucao}
  "casosAplicaveis": ["situação concreta 1", "situação concreta 2", "situação concreta 3"]
}

Categoria: ${noticia.categoria}
Título: ${noticia.titulo}
Conteúdo: ${texto}`;
}

/** Enriquece uma notícia com análise IA. Salva no banco. Retorna a análise. */
export async function enriquecerNoticia(noticiaId: number): Promise<AnaliseIA> {
  const [noticia] = await db.select()
    .from(noticiasJuridicas)
    .where(eq(noticiasJuridicas.id, noticiaId))
    .limit(1);

  if (!noticia) throw new Error(`Notícia ${noticiaId} não encontrada`);

  // Retornar cache se já processado
  if (noticia.analiseIa) return noticia.analiseIa as AnaliseIA;

  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: buildPrompt(noticia) }],
  });

  const content = message.content[0];
  if (content.type !== "text") throw new Error("Resposta inesperada da API");

  // Parsear JSON — Claude às vezes inclui markdown code blocks
  const jsonText = content.text.replace(/```json\n?|```\n?/g, "").trim();
  const parsed = JSON.parse(jsonText);

  const analise: AnaliseIA = {
    resumoExecutivo: parsed.resumoExecutivo ?? "",
    impactoPratico: parsed.impactoPratico ?? "",
    ratioDecidendi: parsed.ratioDecidendi ?? undefined,
    casosAplicaveis: parsed.casosAplicaveis ?? [],
    processadoEm: new Date().toISOString(),
    modeloUsado: "claude-sonnet-4-6",
  };

  await db.update(noticiasJuridicas)
    .set({ analiseIa: analise, updatedAt: new Date() })
    .where(eq(noticiasJuridicas.id, noticiaId));

  return analise;
}

/** Processa em batch todas as notícias aprovadas sem análise IA */
export async function enriquecerPendentes(limit = 10): Promise<{ processadas: number; erros: number }> {
  const { sql } = await import("drizzle-orm");
  const noticias = await db.select({ id: noticiasJuridicas.id })
    .from(noticiasJuridicas)
    .where(sql`${noticiasJuridicas.status} = 'aprovado' AND ${noticiasJuridicas.analiseIa} IS NULL`)
    .limit(limit);

  let processadas = 0;
  let erros = 0;

  for (const { id } of noticias) {
    try {
      await enriquecerNoticia(id);
      processadas++;
      // Rate limit: 500ms entre chamadas
      await new Promise(r => setTimeout(r, 500));
    } catch {
      erros++;
    }
  }

  return { processadas, erros };
}
```

**Step 2: Commit**

```bash
git add src/lib/noticias/enricher.ts
git commit -m "feat(noticias): serviço de enriquecimento com Claude Sonnet 4.6"
```

---

### Task C: tRPC Router — Novos Endpoints

**Files:**
- Modify: `src/lib/trpc/routers/noticias.ts`

**Step 1: Verificar o router atual e adicionar os novos endpoints**

Abrir `src/lib/trpc/routers/noticias.ts` e adicionar os seguintes procedures ao router existente (dentro do objeto `router({...})`):

```typescript
// Adicionar ao topo dos imports se não existir:
import { noticiasFavoritos, noticiasProcessos } from "@/lib/db/schema";
import { enriquecerNoticia, enriquecerPendentes } from "@/lib/noticias/enricher";

// ==========================================
// IA ENRICHMENT
// ==========================================

enriquecerComIA: protectedProcedure
  .input(z.object({ noticiaId: z.number() }))
  .mutation(async ({ input }) => {
    return enriquecerNoticia(input.noticiaId);
  }),

enriquecerPendentes: protectedProcedure
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
    const vinculos = await db.select({
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
    return vinculos;
  }),

// ==========================================
// RELATÓRIO POR TEMA (IA)
// ==========================================

gerarRelatorio: protectedProcedure
  .input(z.object({
    periodo: z.enum(["7d", "30d", "90d", "custom"]),
    dataInicio: z.string().optional(), // ISO date string para custom
    dataFim: z.string().optional(),
    temas: z.array(z.string()), // nomes dos temas
    categorias: z.array(z.enum(["legislativa", "jurisprudencial", "artigo"])).optional(),
  }))
  .mutation(async ({ input }) => {
    const { sql: sqlHelper } = await import("drizzle-orm");

    // Calcular período
    const agora = new Date();
    let dataInicio: Date;
    let dataFim = agora;

    if (input.periodo === "custom" && input.dataInicio) {
      dataInicio = new Date(input.dataInicio);
      if (input.dataFim) dataFim = new Date(input.dataFim);
    } else {
      const dias = input.periodo === "7d" ? 7 : input.periodo === "30d" ? 30 : 90;
      dataInicio = new Date(agora.getTime() - dias * 24 * 60 * 60 * 1000);
    }

    // Buscar notícias do período com status aprovado
    const conditions = [
      eq(noticiasJuridicas.status, "aprovado"),
      sql`${noticiasJuridicas.publicadoEm} >= ${dataInicio.toISOString()}`,
      sql`${noticiasJuridicas.publicadoEm} <= ${dataFim.toISOString()}`,
    ];

    if (input.categorias?.length) {
      conditions.push(sql`${noticiasJuridicas.categoria} = ANY(${input.categorias})`);
    }

    // Filtrar por temas (keywords nas tags)
    if (input.temas.length > 0) {
      const temaConditions = input.temas.map(tema =>
        sql`${noticiasJuridicas.tags}::jsonb ? ${tema}`
      );
      conditions.push(sql`(${sqlHelper.join(temaConditions, sql` OR `)})`);
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
      return { sintese: null, noticias: [], periodoTexto: "" };
    }

    // Agrupar por tema para o prompt
    const listaParaIA = noticias.map((n, i) => {
      const analise = n.analiseIa as { ratioDecidendi?: string } | null;
      const ratio = analise?.ratioDecidendi ? `\n   Ratio: ${analise.ratioDecidendi}` : "";
      return `${i + 1}. [${n.fonte}][${n.categoria}] ${n.titulo}${ratio}`;
    }).join("\n");

    // Gerar síntese com Claude
    const Anthropic = (await import("@anthropic-ai/sdk")).default;
    const client = new Anthropic();

    const periodoTexto = `${dataInicio.toLocaleDateString("pt-BR")} a ${dataFim.toLocaleDateString("pt-BR")}`;
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

Responda em JSON:
{
  "sintese": "Parágrafo narrativo de 5-8 linhas sobre as tendências do período para cada tema solicitado",
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
    const parsed = JSON.parse(jsonText);

    return {
      sintese: parsed,
      noticias,
      periodoTexto,
      temasTexto,
    };
  }),
```

**Step 2: Verificar build do router**

```bash
npx tsc --noEmit 2>&1 | grep noticias
```

Corrigir quaisquer erros de tipo.

**Step 3: Commit**

```bash
git add src/lib/trpc/routers/noticias.ts
git commit -m "feat(noticias): endpoints de IA, favoritos, vínculos e relatório"
```

---

### Task D: Magazine Layout — Refatorar `noticias-feed.tsx`

**Files:**
- Modify: `src/components/noticias/noticias-feed.tsx`
- Create: `src/components/noticias/noticias-card-featured.tsx`
- Create: `src/components/noticias/noticias-card.tsx`

**Step 1: Criar componente `NoticiaCard` (card compacto do grid)**

```typescript
// src/components/noticias/noticias-card.tsx
"use client";

import { Star, Paperclip, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { NoticiaJuridica } from "@/lib/db/schema";

type AnaliseIA = {
  resumoExecutivo: string;
  impactoPratico: string;
  ratioDecidendi?: string;
  casosAplicaveis: string[];
};

interface NoticiaCardProps {
  noticia: NoticiaJuridica;
  corFonte: string;
  isFavorito: boolean;
  onToggleFavorito: () => void;
  onSalvarNoCaso: () => void;
  onClick: () => void;
}

export function NoticiaCard({
  noticia,
  corFonte,
  isFavorito,
  onToggleFavorito,
  onSalvarNoCaso,
  onClick,
}: NoticiaCardProps) {
  const analise = noticia.analiseIa as AnaliseIA | null;
  const tags = (noticia.tags as string[]) ?? [];

  return (
    <div
      className="group relative bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden hover:border-emerald-500/40 hover:shadow-md transition-all cursor-pointer"
      onClick={onClick}
    >
      {/* Barra colorida da fonte */}
      <div className="h-1" style={{ backgroundColor: corFonte }} />

      <div className="p-4">
        {/* Meta row */}
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          <Badge variant="outline" className="text-xs font-medium capitalize" style={{ borderColor: corFonte, color: corFonte }}>
            {noticia.fonte.replace(/-/g, " ")}
          </Badge>
          <Badge variant="secondary" className="text-xs capitalize">
            {noticia.categoria}
          </Badge>
          <span className="text-xs text-zinc-400 ml-auto">
            {noticia.publicadoEm
              ? formatDistanceToNow(new Date(noticia.publicadoEm), { addSuffix: true, locale: ptBR })
              : ""}
          </span>
        </div>

        {/* Título */}
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 line-clamp-2 mb-2 group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors">
          {noticia.titulo}
        </h3>

        {/* Preview IA */}
        {analise?.resumoExecutivo ? (
          <div className="bg-zinc-50 dark:bg-zinc-800/60 rounded-lg px-3 py-2 mb-3">
            <p className="text-xs text-zinc-600 dark:text-zinc-400 italic line-clamp-2">
              {analise.resumoExecutivo}
            </p>
          </div>
        ) : noticia.resumo ? (
          <p className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-2 mb-3">
            {noticia.resumo}
          </p>
        ) : null}

        {/* Tags */}
        {tags.length > 0 && (
          <div className="flex gap-1 flex-wrap mb-3">
            {tags.slice(0, 3).map(tag => (
              <span key={tag} className="text-xs bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 rounded px-1.5 py-0.5">
                {tag}
              </span>
            ))}
            {tags.length > 3 && (
              <span className="text-xs text-zinc-400">+{tags.length - 3}</span>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={onToggleFavorito}
            title={isFavorito ? "Remover dos salvos" : "Salvar"}
          >
            <Star className={cn("h-3.5 w-3.5", isFavorito ? "fill-amber-500 text-amber-500" : "text-zinc-400")} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={onSalvarNoCaso}
            title="Vincular a caso"
          >
            <Paperclip className="h-3.5 w-3.5 text-zinc-400" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 ml-auto"
            asChild
          >
            <a href={noticia.urlOriginal} target="_blank" rel="noopener noreferrer" title="Abrir original">
              <ExternalLink className="h-3.5 w-3.5 text-zinc-400" />
            </a>
          </Button>
        </div>
      </div>
    </div>
  );
}
```

**Step 2: Criar `NoticiaCardFeatured` (card grande, primeiro da lista)**

```typescript
// src/components/noticias/noticias-card-featured.tsx
"use client";

import { Star, Paperclip, ExternalLink, Copy } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import type { NoticiaJuridica } from "@/lib/db/schema";

type AnaliseIA = {
  resumoExecutivo: string;
  impactoPratico: string;
  ratioDecidendi?: string;
  casosAplicaveis: string[];
};

interface NoticiaCardFeaturedProps {
  noticia: NoticiaJuridica;
  corFonte: string;
  isFavorito: boolean;
  onToggleFavorito: () => void;
  onSalvarNoCaso: () => void;
  onClick: () => void;
}

export function NoticiaCardFeatured({
  noticia,
  corFonte,
  isFavorito,
  onToggleFavorito,
  onSalvarNoCaso,
  onClick,
}: NoticiaCardFeaturedProps) {
  const analise = noticia.analiseIa as AnaliseIA | null;
  const tags = (noticia.tags as string[]) ?? [];

  const copyRatio = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (analise?.ratioDecidendi) {
      navigator.clipboard.writeText(analise.ratioDecidendi);
      toast.success("Ratio decidendi copiado");
    }
  };

  return (
    <div
      className="group relative bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden hover:border-emerald-500/40 hover:shadow-lg transition-all cursor-pointer"
      onClick={onClick}
    >
      {/* Barra colorida da fonte */}
      <div className="h-1.5" style={{ backgroundColor: corFonte }} />

      <div className="p-6">
        {/* Meta row */}
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <Badge variant="outline" className="font-medium capitalize" style={{ borderColor: corFonte, color: corFonte }}>
            {noticia.fonte.replace(/-/g, " ")}
          </Badge>
          <Badge variant="secondary" className="capitalize">
            {noticia.categoria}
          </Badge>
          <span className="text-sm text-zinc-400 ml-auto">
            {noticia.publicadoEm
              ? formatDistanceToNow(new Date(noticia.publicadoEm), { addSuffix: true, locale: ptBR })
              : ""}
          </span>
        </div>

        {/* Título grande */}
        <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 mb-4 group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors leading-snug">
          {noticia.titulo}
        </h2>

        {/* Blocos IA */}
        {analise ? (
          <div className="space-y-3 mb-4">
            {/* Resumo executivo */}
            <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg p-3">
              <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wide mb-1">Resumo IA</p>
              <p className="text-sm text-zinc-700 dark:text-zinc-300">
                {analise.resumoExecutivo}
              </p>
            </div>

            {/* Ratio decidendi (só jurisprudencial) */}
            {analise.ratioDecidendi && (
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs font-semibold text-blue-700 dark:text-blue-400 uppercase tracking-wide">Ratio Decidendi</p>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={copyRatio}
                    title="Copiar ratio"
                  >
                    <Copy className="h-3 w-3 text-blue-400" />
                  </Button>
                </div>
                <p className="text-sm text-zinc-700 dark:text-zinc-300 italic">
                  "{analise.ratioDecidendi}"
                </p>
              </div>
            )}

            {/* Casos aplicáveis */}
            {analise.casosAplicaveis.length > 0 && (
              <div className="flex gap-1.5 flex-wrap">
                {analise.casosAplicaveis.map(caso => (
                  <span key={caso} className="text-xs bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 rounded-full px-2.5 py-1">
                    {caso}
                  </span>
                ))}
              </div>
            )}
          </div>
        ) : noticia.resumo ? (
          <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4 leading-relaxed">
            {noticia.resumo}
          </p>
        ) : null}

        {/* Tags */}
        {tags.length > 0 && (
          <div className="flex gap-1.5 flex-wrap mb-4">
            {tags.map(tag => (
              <span key={tag} className="text-xs bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 rounded px-2 py-0.5">
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 pt-3 border-t border-zinc-100 dark:border-zinc-800" onClick={e => e.stopPropagation()}>
          <Button
            variant="outline"
            size="sm"
            className={cn(isFavorito && "border-amber-300 bg-amber-50 dark:bg-amber-900/20")}
            onClick={onToggleFavorito}
          >
            <Star className={cn("h-4 w-4 mr-1.5", isFavorito ? "fill-amber-500 text-amber-500" : "text-zinc-400")} />
            {isFavorito ? "Salvo" : "Salvar"}
          </Button>
          <Button variant="outline" size="sm" onClick={onSalvarNoCaso}>
            <Paperclip className="h-4 w-4 mr-1.5 text-zinc-400" />
            Vincular Caso
          </Button>
          {analise?.ratioDecidendi && (
            <Button variant="outline" size="sm" onClick={copyRatio}>
              <Copy className="h-4 w-4 mr-1.5 text-zinc-400" />
              Copiar Ratio
            </Button>
          )}
          <Button variant="ghost" size="sm" className="ml-auto" asChild>
            <a href={noticia.urlOriginal} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4 mr-1.5" />
              Abrir Original
            </a>
          </Button>
        </div>
      </div>
    </div>
  );
}
```

**Step 3: Refatorar `noticias-feed.tsx` com Magazine Layout**

```typescript
// src/components/noticias/noticias-feed.tsx
"use client";

import { useState } from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc/client";
import { NoticiaCard } from "./noticias-card";
import { NoticiaCardFeatured } from "./noticias-card-featured";
import { NoticiaReaderSheet } from "./noticias-reader-sheet";
import { NoticiaSalvarCasoSheet } from "./noticias-salvar-caso-sheet";
import type { NoticiaJuridica } from "@/lib/db/schema";
import { useDebounce } from "@/hooks/use-debounce"; // hook de debounce existente no projeto

// Mapa de cores por fonte (fallback para zinc)
const COR_FONTE: Record<string, string> = {
  "conjur": "#dc2626",
  "stj-not-cias": "#1d4ed8",
  "ibccrim": "#7c3aed",
  "dizer-o-direito": "#059669",
};

function getCorFonte(fonte: string): string {
  return COR_FONTE[fonte.toLowerCase()] ?? "#71717a";
}

type CategoriaFeed = "legislativa" | "jurisprudencial" | "artigo" | "salvos";

interface NoticiasFeedProps {
  categoria: CategoriaFeed;
}

export function NoticiasFeed({ categoria }: NoticiasFeedProps) {
  const [busca, setBusca] = useState("");
  const [noticiaReader, setNoticiaReader] = useState<NoticiaJuridica | null>(null);
  const [noticiaCaso, setNoticiaCaso] = useState<NoticiaJuridica | null>(null);
  const debouncedBusca = useDebounce(busca, 400);
  const utils = trpc.useUtils();

  // Buscar IDs favoritados para highlight
  const { data: favoritosIds = [] } = trpc.noticias.getFavoritosIds.useQuery();
  const toggleFavorito = trpc.noticias.toggleFavorito.useMutation({
    onSuccess: () => utils.noticias.getFavoritosIds.invalidate(),
  });

  // Feed de notícias aprovadas
  const feedQuery = trpc.noticias.list.useInfiniteQuery(
    {
      categoria: categoria === "salvos" ? undefined : categoria,
      busca: debouncedBusca || undefined,
      status: "aprovado",
      limit: 20,
    },
    {
      enabled: categoria !== "salvos",
      getNextPageParam: (lastPage) => lastPage.nextCursor,
    }
  );

  // Feed de favoritos
  const favoritosQuery = trpc.noticias.listFavoritos.useQuery(undefined, {
    enabled: categoria === "salvos",
  });

  const noticias: NoticiaJuridica[] = categoria === "salvos"
    ? (favoritosQuery.data?.map(f => f.noticia) ?? [])
    : (feedQuery.data?.pages.flatMap(p => p.items) ?? []);

  const isLoading = categoria === "salvos"
    ? favoritosQuery.isLoading
    : feedQuery.isLoading;

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-64 w-full rounded-xl" />
        <div className="grid grid-cols-2 gap-4">
          <Skeleton className="h-48 rounded-xl" />
          <Skeleton className="h-48 rounded-xl" />
        </div>
      </div>
    );
  }

  const featuredNoticia = noticias[0];
  const restNoticias = noticias.slice(1);

  return (
    <>
      <div className="p-6 space-y-6">
        {/* Barra de busca */}
        {categoria !== "salvos" && (
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
            <Input
              placeholder="Buscar notícias..."
              className="pl-9 pr-8"
              value={busca}
              onChange={e => setBusca(e.target.value)}
            />
            {busca && (
              <button
                className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
                onClick={() => setBusca("")}
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        )}

        {/* Empty state */}
        {noticias.length === 0 && (
          <div className="text-center py-20 text-zinc-400">
            <p className="text-lg font-medium mb-1">Nenhuma notícia encontrada</p>
            <p className="text-sm">
              {categoria === "salvos"
                ? "Use ⭐ nos cards para salvar notícias de referência"
                : "Tente buscar por outro termo ou aguarde o próximo scraping"}
            </p>
          </div>
        )}

        {/* Featured card */}
        {featuredNoticia && (
          <NoticiaCardFeatured
            noticia={featuredNoticia}
            corFonte={getCorFonte(featuredNoticia.fonte)}
            isFavorito={favoritosIds.includes(featuredNoticia.id)}
            onToggleFavorito={() => toggleFavorito.mutate({ noticiaId: featuredNoticia.id })}
            onSalvarNoCaso={() => setNoticiaCaso(featuredNoticia)}
            onClick={() => setNoticiaReader(featuredNoticia)}
          />
        )}

        {/* Grid 2 colunas */}
        {restNoticias.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {restNoticias.map(noticia => (
              <NoticiaCard
                key={noticia.id}
                noticia={noticia}
                corFonte={getCorFonte(noticia.fonte)}
                isFavorito={favoritosIds.includes(noticia.id)}
                onToggleFavorito={() => toggleFavorito.mutate({ noticiaId: noticia.id })}
                onSalvarNoCaso={() => setNoticiaCaso(noticia)}
                onClick={() => setNoticiaReader(noticia)}
              />
            ))}
          </div>
        )}

        {/* Load more */}
        {feedQuery.hasNextPage && (
          <div className="flex justify-center pt-4">
            <Button
              variant="outline"
              onClick={() => feedQuery.fetchNextPage()}
              disabled={feedQuery.isFetchingNextPage}
            >
              {feedQuery.isFetchingNextPage ? "Carregando..." : "Carregar mais"}
            </Button>
          </div>
        )}
      </div>

      {/* Reader Sheet */}
      {noticiaReader && (
        <NoticiaReaderSheet
          noticia={noticiaReader}
          corFonte={getCorFonte(noticiaReader.fonte)}
          isFavorito={favoritosIds.includes(noticiaReader.id)}
          onToggleFavorito={() => toggleFavorito.mutate({ noticiaId: noticiaReader.id })}
          onClose={() => setNoticiaReader(null)}
        />
      )}

      {/* Salvar no Caso Sheet */}
      {noticiaCaso && (
        <NoticiaSalvarCasoSheet
          noticia={noticiaCaso}
          onClose={() => setNoticiaCaso(null)}
        />
      )}
    </>
  );
}
```

**Step 4: Verificar se `use-debounce` existe**

```bash
grep -r "useDebounce" /Users/rodrigorochameire/Projetos/Defender/src/hooks/ 2>/dev/null | head -3
```

Se não existir, criar `src/hooks/use-debounce.ts`:
```typescript
import { useState, useEffect } from "react";
export function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}
```

**Step 5: Commit**

```bash
git add src/components/noticias/
git commit -m "feat(noticias): Magazine Layout com card featured + grid 2 colunas"
```

---

### Task E: Reader Sheet (Modo Leitura)

**Files:**
- Create: `src/components/noticias/noticias-reader-sheet.tsx`

**Step 1: Criar Reader Sheet com 4 blocos IA + conteúdo completo**

```typescript
// src/components/noticias/noticias-reader-sheet.tsx
"use client";

import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Star, ExternalLink, Copy, Sparkles, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc/client";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { NoticiaJuridica } from "@/lib/db/schema";

type AnaliseIA = {
  resumoExecutivo: string;
  impactoPratico: string;
  ratioDecidendi?: string;
  casosAplicaveis: string[];
};

interface NoticiaReaderSheetProps {
  noticia: NoticiaJuridica;
  corFonte: string;
  isFavorito: boolean;
  onToggleFavorito: () => void;
  onClose: () => void;
}

export function NoticiaReaderSheet({
  noticia,
  corFonte,
  isFavorito,
  onToggleFavorito,
  onClose,
}: NoticiaReaderSheetProps) {
  const [analise, setAnalise] = useState<AnaliseIA | null>(
    (noticia.analiseIa as AnaliseIA | null)
  );
  const enriquecer = trpc.noticias.enriquecerComIA.useMutation({
    onSuccess: (data) => setAnalise(data as AnaliseIA),
    onError: () => toast.error("Erro ao analisar com IA"),
  });

  // Lazy enrichment: enriquecer ao abrir se não tiver análise
  useEffect(() => {
    if (!analise && !enriquecer.isPending) {
      enriquecer.mutate({ noticiaId: noticia.id });
    }
  }, [noticia.id]);

  const copyText = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copiado`);
  };

  return (
    <Sheet open onOpenChange={open => !open && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto p-0">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b px-6 py-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className="font-medium capitalize" style={{ borderColor: corFonte, color: corFonte }}>
                {noticia.fonte.replace(/-/g, " ")}
              </Badge>
              <Badge variant="secondary" className="capitalize">{noticia.categoria}</Badge>
              <span className="text-sm text-zinc-400">
                {noticia.publicadoEm
                  ? formatDistanceToNow(new Date(noticia.publicadoEm), { addSuffix: true, locale: ptBR })
                  : ""}
              </span>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onToggleFavorito}>
                <Star className={cn("h-4 w-4", isFavorito ? "fill-amber-500 text-amber-500" : "text-zinc-400")} />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                <a href={noticia.urlOriginal} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4 text-zinc-400" />
                </a>
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 mt-3 leading-snug">
            {noticia.titulo}
          </h2>
        </div>

        <div className="px-6 py-6 space-y-4">
          {/* Blocos IA */}
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="h-4 w-4 text-emerald-500" />
            <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Análise com IA</span>
          </div>

          {enriquecer.isPending && !analise && (
            <div className="space-y-3">
              <Skeleton className="h-20 rounded-lg" />
              <Skeleton className="h-16 rounded-lg" />
            </div>
          )}

          {analise && (
            <div className="space-y-3">
              {/* Resumo executivo */}
              <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wide">Resumo Executivo</p>
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => copyText(analise.resumoExecutivo, "Resumo")}>
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
                <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">{analise.resumoExecutivo}</p>
              </div>

              {/* Impacto prático */}
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wide">Impacto Prático</p>
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => copyText(analise.impactoPratico, "Impacto")}>
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
                <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">{analise.impactoPratico}</p>
              </div>

              {/* Ratio decidendi */}
              {analise.ratioDecidendi && (
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-semibold text-blue-700 dark:text-blue-400 uppercase tracking-wide">Ratio Decidendi</p>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => copyText(analise.ratioDecidendi!, "Ratio")}>
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                  <p className="text-sm text-zinc-700 dark:text-zinc-300 italic leading-relaxed">"{analise.ratioDecidendi}"</p>
                </div>
              )}

              {/* Casos aplicáveis */}
              {analise.casosAplicaveis.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-2">Casos Aplicáveis</p>
                  <div className="flex gap-2 flex-wrap">
                    {analise.casosAplicaveis.map(caso => (
                      <span key={caso} className="text-sm bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-full px-3 py-1">
                        {caso}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Divisor */}
          <div className="border-t pt-4">
            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-4">Conteúdo Original</p>
            {/* Conteúdo HTML limpo */}
            {noticia.conteudo ? (
              <div
                className="prose prose-sm dark:prose-invert max-w-none prose-zinc prose-a:text-emerald-600 dark:prose-a:text-emerald-400"
                dangerouslySetInnerHTML={{ __html: noticia.conteudo }}
              />
            ) : noticia.resumo ? (
              <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">{noticia.resumo}</p>
            ) : (
              <a
                href={noticia.urlOriginal}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-emerald-600 hover:underline"
              >
                Ler artigo completo no site original →
              </a>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
```

**Step 2: Commit**

```bash
git add src/components/noticias/noticias-reader-sheet.tsx
git commit -m "feat(noticias): Reader Sheet com lazy enrichment IA e 4 blocos"
```

---

### Task F: Favoritos — Aba "Salvos" na página principal

**Files:**
- Modify: `src/app/(dashboard)/admin/noticias/page.tsx`

**Step 1: Adicionar aba "Salvos" e "Relatórios" ao page.tsx**

Abrir `src/app/(dashboard)/admin/noticias/page.tsx`. Localizar o array `TABS` e adicionar:

```typescript
// Adicionar import de BookmarkCheck e BarChart2
import { Newspaper, Scale, Gavel, BookOpen, RefreshCw, Filter, BookmarkCheck, BarChart2 } from "lucide-react";

// Modificar tipo Tab
type Tab = "legislativa" | "jurisprudencial" | "artigo" | "salvos" | "relatorios";

// Modificar array TABS
const TABS: { value: Tab; label: string; icon: typeof Scale }[] = [
  { value: "legislativa", label: "Legislativas", icon: Scale },
  { value: "jurisprudencial", label: "Jurisprudenciais", icon: Gavel },
  { value: "artigo", label: "Artigos", icon: BookOpen },
  { value: "salvos", label: "Salvos", icon: BookmarkCheck },
  { value: "relatorios", label: "Relatórios", icon: BarChart2 },
];
```

No corpo do JSX, substituir o `<NoticiasFeed categoria={tab} />` por:

```typescript
{tab === "relatorios" ? (
  <NoticiasRelatorio />
) : (
  <NoticiasFeed categoria={tab} />
)}
```

Adicionar import:
```typescript
import { NoticiasRelatorio } from "@/components/noticias/noticias-relatorio";
```

**Step 2: Commit**

```bash
git add src/app/(dashboard)/admin/noticias/page.tsx
git commit -m "feat(noticias): abas Salvos e Relatórios na página principal"
```

---

### Task G: Associação a Casos — Sheet "Salvar no Caso"

**Files:**
- Create: `src/components/noticias/noticias-salvar-caso-sheet.tsx`

**Step 1: Criar sheet de vínculo com search de processos**

```typescript
// src/components/noticias/noticias-salvar-caso-sheet.tsx
"use client";

import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc/client";
import type { NoticiaJuridica } from "@/lib/db/schema";
import { useDebounce } from "@/hooks/use-debounce";

interface NoticiaSalvarCasoSheetProps {
  noticia: NoticiaJuridica;
  onClose: () => void;
}

export function NoticiaSalvarCasoSheet({ noticia, onClose }: NoticiaSalvarCasoSheetProps) {
  const [busca, setBusca] = useState("");
  const debouncedBusca = useDebounce(busca, 300);
  const [vinculados, setVinculados] = useState<number[]>([]);
  const utils = trpc.useUtils();

  // Buscar processos existentes — usar router de processos existente no projeto
  const { data: processosResult } = trpc.processos.list.useQuery(
    { busca: debouncedBusca, limit: 20 },
    { enabled: true }
  );
  const processos = processosResult?.items ?? [];

  const vincular = trpc.noticias.vincularProcesso.useMutation({
    onSuccess: (_, vars) => {
      setVinculados(prev => [...prev, vars.processoId]);
      toast.success("Notícia vinculada ao processo");
      utils.noticias.listProcessosByNoticia.invalidate({ noticiaId: noticia.id });
    },
    onError: () => toast.error("Erro ao vincular"),
  });

  return (
    <Sheet open onOpenChange={open => !open && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Vincular ao Processo</SheetTitle>
        </SheetHeader>
        <p className="text-sm text-zinc-500 mt-1 mb-4 line-clamp-2">{noticia.titulo}</p>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
          <Input
            placeholder="Buscar por réu, número ou crime..."
            className="pl-9"
            value={busca}
            onChange={e => setBusca(e.target.value)}
            autoFocus
          />
        </div>

        {/* Lista de processos */}
        <div className="space-y-2 overflow-y-auto max-h-[60vh]">
          {processos.length === 0 && debouncedBusca && (
            <p className="text-sm text-zinc-400 text-center py-8">Nenhum processo encontrado</p>
          )}
          {processos.map((processo: any) => {
            const jaVinculado = vinculados.includes(processo.id);
            return (
              <div
                key={processo.id}
                className="flex items-center justify-between gap-3 p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:border-emerald-500/40 transition-colors"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">
                    {processo.reu ?? processo.assistidoNome ?? "Processo"}
                  </p>
                  <p className="text-xs text-zinc-400 truncate">
                    {processo.numeroProcesso ?? processo.numero ?? `ID ${processo.id}`}
                    {processo.crime ? ` · ${processo.crime}` : ""}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant={jaVinculado ? "secondary" : "outline"}
                  disabled={jaVinculado || vincular.isPending}
                  onClick={() => vincular.mutate({ noticiaId: noticia.id, processoId: processo.id })}
                  className="shrink-0"
                >
                  {jaVinculado ? (
                    <><Check className="h-3.5 w-3.5 mr-1 text-emerald-500" />Vinculado</>
                  ) : vincular.isPending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    "Vincular"
                  )}
                </Button>
              </div>
            );
          })}
        </div>
      </SheetContent>
    </Sheet>
  );
}
```

> **Nota:** Verificar como o router `processos.list` retorna os dados (campos `reu`, `numeroProcesso`, etc.) para ajustar os acessos acima. Usar `trpc.processos.list.useQuery` ou o equivalente disponível.

**Step 2: Commit**

```bash
git add src/components/noticias/noticias-salvar-caso-sheet.tsx
git commit -m "feat(noticias): Sheet de vínculo notícia-processo com search"
```

---

### Task H: Relatórios por Tema

**Files:**
- Create: `src/components/noticias/noticias-relatorio.tsx`

**Step 1: Criar componente de relatório**

```typescript
// src/components/noticias/noticias-relatorio.tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { BarChart2, Sparkles, Copy, Download } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc/client";
import { TEMAS_PADRAO } from "@/config/noticias/classifier";

type Periodo = "7d" | "30d" | "90d";

export function NoticiasRelatorio() {
  const [periodo, setPeriodo] = useState<Periodo>("30d");
  const [temasSelecionados, setTemasSelecionados] = useState<string[]>([
    "Direito Penal", "Processo Penal",
  ]);

  const gerarRelatorio = trpc.noticias.gerarRelatorio.useMutation({
    onError: () => toast.error("Erro ao gerar relatório"),
  });

  const toggleTema = (tema: string) => {
    setTemasSelecionados(prev =>
      prev.includes(tema) ? prev.filter(t => t !== tema) : [...prev, tema]
    );
  };

  const relatorio = gerarRelatorio.data;

  const copiarTudo = () => {
    if (!relatorio?.sintese) return;
    const texto = [
      `RELATÓRIO DE JURISPRUDÊNCIA E LEGISLAÇÃO`,
      `Período: ${relatorio.periodoTexto}`,
      `Temas: ${relatorio.temasTexto}`,
      ``,
      `SÍNTESE`,
      relatorio.sintese.sintese,
      ``,
      `DESTAQUES`,
      ...(relatorio.sintese.destaques ?? []).map((d: any) => `• ${d.titulo}: ${d.impacto}`),
      ``,
      `⚠ ALERTAS PARA A DEFESA`,
      ...(relatorio.sintese.alertas ?? []).map((a: string) => `• ${a}`),
      ``,
      `NOTÍCIAS REFERENCIADAS (${relatorio.noticias.length})`,
      ...relatorio.noticias.map((n, i) => `${i + 1}. [${n.fonte}] ${n.titulo}`),
    ].join("\n");
    navigator.clipboard.writeText(texto);
    toast.success("Relatório copiado");
  };

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
          <BarChart2 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
        </div>
        <div>
          <h2 className="text-lg font-semibold">Relatório por Tema</h2>
          <p className="text-sm text-zinc-500">Síntese IA das notícias aprovadas no período</p>
        </div>
      </div>

      {/* Configuração */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 space-y-4">
        {/* Período */}
        <div>
          <p className="text-sm font-medium mb-2">Período</p>
          <div className="flex gap-2">
            {(["7d", "30d", "90d"] as Periodo[]).map(p => (
              <Button
                key={p}
                variant={periodo === p ? "default" : "outline"}
                size="sm"
                onClick={() => setPeriodo(p)}
                className={periodo === p ? "bg-emerald-600 hover:bg-emerald-700" : ""}
              >
                {p === "7d" ? "7 dias" : p === "30d" ? "30 dias" : "90 dias"}
              </Button>
            ))}
          </div>
        </div>

        {/* Temas */}
        <div>
          <p className="text-sm font-medium mb-2">Temas</p>
          <div className="grid grid-cols-2 gap-2">
            {TEMAS_PADRAO.map(({ nome }) => (
              <div key={nome} className="flex items-center gap-2">
                <Checkbox
                  id={`tema-${nome}`}
                  checked={temasSelecionados.includes(nome)}
                  onCheckedChange={() => toggleTema(nome)}
                />
                <Label htmlFor={`tema-${nome}`} className="text-sm cursor-pointer">{nome}</Label>
              </div>
            ))}
          </div>
        </div>

        <Button
          onClick={() => gerarRelatorio.mutate({ periodo, temas: temasSelecionados })}
          disabled={gerarRelatorio.isPending || temasSelecionados.length === 0}
          className="bg-emerald-600 hover:bg-emerald-700 text-white"
        >
          <Sparkles className="h-4 w-4 mr-2" />
          {gerarRelatorio.isPending ? "Gerando com IA..." : "Gerar Relatório"}
        </Button>
      </div>

      {/* Loading */}
      {gerarRelatorio.isPending && (
        <div className="space-y-3">
          <Skeleton className="h-32 rounded-xl" />
          <Skeleton className="h-20 rounded-xl" />
        </div>
      )}

      {/* Resultado */}
      {relatorio && relatorio.sintese && (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden">
          {/* Header do relatório */}
          <div className="bg-zinc-50 dark:bg-zinc-800/50 px-5 py-4 border-b flex items-center justify-between">
            <div>
              <p className="font-semibold">Relatório de Jurisprudência e Legislação</p>
              <p className="text-sm text-zinc-500">
                {relatorio.periodoTexto} · {relatorio.noticias.length} notícias analisadas
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={copiarTudo}>
                <Copy className="h-4 w-4 mr-1.5" />
                Copiar
              </Button>
            </div>
          </div>

          <div className="p-5 space-y-5">
            {/* Síntese */}
            <div>
              <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-2">Síntese</p>
              <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">
                {relatorio.sintese.sintese}
              </p>
            </div>

            {/* Destaques */}
            {relatorio.sintese.destaques?.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-2">★ Destaques</p>
                <div className="space-y-2">
                  {relatorio.sintese.destaques.map((d: any, i: number) => (
                    <div key={i} className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
                      <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">{d.titulo}</p>
                      <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-0.5">{d.impacto}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Alertas */}
            {relatorio.sintese.alertas?.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-2">⚠ Alertas para a Defesa</p>
                <ul className="space-y-1">
                  {relatorio.sintese.alertas.map((a: string, i: number) => (
                    <li key={i} className="text-sm text-zinc-700 dark:text-zinc-300 flex gap-2">
                      <span className="text-zinc-400 shrink-0">•</span>
                      {a}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Lista de notícias referenciadas */}
            <div>
              <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-2">
                Notícias Referenciadas ({relatorio.noticias.length})
              </p>
              <ol className="space-y-2">
                {relatorio.noticias.map((n, i) => (
                  <li key={n.id} className="flex gap-3 text-sm">
                    <span className="text-zinc-400 shrink-0 w-5 text-right">{i + 1}.</span>
                    <div className="min-w-0">
                      <span className="text-zinc-500 mr-1.5">
                        [{n.fonte.replace(/-/g, " ")}]
                      </span>
                      <a
                        href={n.urlOriginal}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-zinc-700 dark:text-zinc-300 hover:text-emerald-600 dark:hover:text-emerald-400"
                      >
                        {n.titulo}
                      </a>
                      {(n.analiseIa as any)?.ratioDecidendi && (
                        <p className="text-xs text-zinc-500 italic mt-0.5 line-clamp-1">
                          → {(n.analiseIa as any).ratioDecidendi}
                        </p>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </div>
      )}

      {/* Empty result */}
      {relatorio && relatorio.noticias.length === 0 && (
        <div className="text-center py-12 text-zinc-400">
          <p className="font-medium mb-1">Sem notícias no período</p>
          <p className="text-sm">Tente um período maior ou selecione outros temas</p>
        </div>
      )}
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add src/components/noticias/noticias-relatorio.tsx
git commit -m "feat(noticias): componente de relatório por tema com síntese IA"
```

---

### Task I: Build Check + Polish

**Step 1: Verificar se `processos.list` existe com o formato esperado**

```bash
grep -n "list:" /Users/rodrigorochameire/Projetos/Defender/src/lib/trpc/routers/processos.ts | head -10
```

Ajustar `NoticiaSalvarCasoSheet` para usar o endpoint correto e os campos certos da resposta.

**Step 2: Build check**

```bash
cd /Users/rodrigorochameire/Projetos/Defender && npm run build 2>&1 | tail -40
```

Corrigir todos os erros de tipo antes de prosseguir.

**Step 3: Verificar `date-fns` está instalado**

```bash
grep "date-fns" /Users/rodrigorochameire/Projetos/Defender/package.json
```

Se não estiver: `npm install date-fns`

**Step 4: Verificar `@tailwindcss/typography` para o `.prose`**

```bash
grep "typography" /Users/rodrigorochameire/Projetos/Defender/tailwind.config.ts
```

Se não estiver configurado, adicionar `require('@tailwindcss/typography')` ao array de plugins no `tailwind.config.ts` e instalar: `npm install @tailwindcss/typography`

**Step 5: Cron de enriquecimento batch**

Em `src/app/api/cron/noticias/route.ts`, após o scraping, chamar enriquecimento:

```typescript
// Adicionar ao final do try, após scrapeAllFontes():
const { enriquecerPendentes } = await import("@/lib/noticias/enricher");
const enriquecimento = await enriquecerPendentes(5); // max 5 por cron
```

**Step 6: Commit final**

```bash
git add -A
git commit -m "feat(noticias): polish, build fixes e enriquecimento no cron"
```

---

## Resumo de Tasks

| # | Task | Paralelo com | Dependência |
|---|------|-------------|-------------|
| A | Schema: `analise_ia` + `noticias_favoritos` + `noticias_processos` | B | — |
| B | IA Enricher service | A | — |
| C | tRPC: endpoints de IA, favoritos, vínculos, relatório | D | A + B |
| D | Magazine Layout: cards featured + grid | E, F, G | A |
| E | Reader Sheet com lazy enrichment | F, G | C |
| F | Aba Salvos + Relatórios no page.tsx | G | C |
| G | Sheet "Salvar no Caso" | E, F | C |
| H | Componente de Relatório | — | C + F |
| I | Build check + polish + cron enrichment | — | A–H |

**Execução recomendada:**
1. Paralelo: Tasks A + B
2. Paralelo: Tasks C + D (após A+B)
3. Paralelo: Tasks E + F + G (após C+D)
4. Sequencial: Task H (após F)
5. Sequencial: Task I (tudo pronto)
