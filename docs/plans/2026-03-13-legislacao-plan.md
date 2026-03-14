# Legislacao Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a legislation reference tool at `/admin/legislacao` with 15 laws, 3 navigation modes, personal highlights/notes (Supabase), automatic cross-references, intertemporal history, and manual update via scraping.

**Architecture:** Static JSON files for law content in `src/config/legislacao/`, Supabase table for user highlights/notes/favorites, tRPC router for CRUD on highlights and update flow, Supabase Edge Function for scraping planalto.gov.br / al.ba.gov.br.

**Tech Stack:** Next.js 15 (App Router), tRPC, Drizzle ORM, Supabase PostgreSQL, Tailwind CSS, shadcn/ui, Lucide icons.

---

### Task 1: Types and Registry

**Files:**
- Create: `src/config/legislacao/types.ts`
- Create: `src/config/legislacao/index.ts`

**Step 1: Create type definitions**

Create `src/config/legislacao/types.ts`:

```typescript
export type TipoEstrutura = "parte" | "livro" | "titulo" | "capitulo" | "secao" | "subsecao";

export type Dispositivo = {
  id: string;
  numero: string;
  texto: string;
  alineas?: Dispositivo[];
  itens?: Dispositivo[];
};

export type VersaoArtigo = {
  versao: number;
  texto: string;
  textoAnterior?: string;
  redacaoDadaPor: { lei: string; artigo: string } | null;
  publicadoEm: string;
  vigenteDesde: string;
  vigenteAte: string | null;
};

export type Artigo = {
  tipo: "artigo";
  id: string;
  numero: string;
  caput: string;
  rubrica?: string;
  paragrafos: Dispositivo[];
  incisos: Dispositivo[];
  referencias: string[];
  historico: VersaoArtigo[];
};

export type NodoEstrutura = {
  tipo: TipoEstrutura;
  nome: string;
  filhos: (NodoEstrutura | Artigo)[];
};

export type Legislacao = {
  id: string;
  nome: string;
  nomeAbreviado: string;
  referencia: string;
  fonte: string;
  dataUltimaAtualizacao: string;
  estrutura: NodoEstrutura[];
};

export type LegislacaoMeta = {
  id: string;
  nome: string;
  nomeAbreviado: string;
  referencia: string;
  fonte: string;
  dataUltimaAtualizacao: string;
  totalArtigos: number;
  cor: string;
};
```

**Step 2: Create registry index**

Create `src/config/legislacao/index.ts`:

```typescript
import type { LegislacaoMeta } from "./types";

export const LEGISLACOES: LegislacaoMeta[] = [
  { id: "codigo-penal", nome: "Codigo Penal", nomeAbreviado: "CP", referencia: "Decreto-Lei n. 2.848/1940", fonte: "https://www.planalto.gov.br/ccivil_03/decreto-lei/del2848compilado.htm", dataUltimaAtualizacao: "2026-03-13", totalArtigos: 0, cor: "#ef4444" },
  { id: "cpp", nome: "Codigo de Processo Penal", nomeAbreviado: "CPP", referencia: "Decreto-Lei n. 3.689/1941", fonte: "https://www.planalto.gov.br/ccivil_03/decreto-lei/del3689compilado.htm", dataUltimaAtualizacao: "2026-03-13", totalArtigos: 0, cor: "#f97316" },
  { id: "lep", nome: "Lei de Execucao Penal", nomeAbreviado: "LEP", referencia: "Lei n. 7.210/1984", fonte: "https://www.planalto.gov.br/ccivil_03/leis/l7210compilado.htm", dataUltimaAtualizacao: "2026-03-13", totalArtigos: 0, cor: "#8b5cf6" },
  { id: "maria-da-penha", nome: "Lei Maria da Penha", nomeAbreviado: "LMP", referencia: "Lei n. 11.340/2006", fonte: "https://www.planalto.gov.br/ccivil_03/_ato2004-2006/2006/lei/l11340.htm", dataUltimaAtualizacao: "2026-03-13", totalArtigos: 0, cor: "#ec4899" },
  { id: "drogas", nome: "Lei de Drogas", nomeAbreviado: "LD", referencia: "Lei n. 11.343/2006", fonte: "https://www.planalto.gov.br/ccivil_03/_ato2004-2006/2006/lei/l11343.htm", dataUltimaAtualizacao: "2026-03-13", totalArtigos: 0, cor: "#14b8a6" },
  { id: "eca", nome: "Estatuto da Crianca e do Adolescente", nomeAbreviado: "ECA", referencia: "Lei n. 8.069/1990", fonte: "https://www.planalto.gov.br/ccivil_03/leis/l8069compilado.htm", dataUltimaAtualizacao: "2026-03-13", totalArtigos: 0, cor: "#06b6d4" },
  { id: "abuso-autoridade", nome: "Lei de Abuso de Autoridade", nomeAbreviado: "LAA", referencia: "Lei n. 13.869/2019", fonte: "https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2019/lei/L13869.htm", dataUltimaAtualizacao: "2026-03-13", totalArtigos: 0, cor: "#f59e0b" },
  { id: "cf88-titulo2", nome: "CF/88 - Direitos e Garantias Fundamentais", nomeAbreviado: "CF", referencia: "Constituicao Federal de 1988, Titulo II", fonte: "https://www.planalto.gov.br/ccivil_03/constituicao/constituicao.htm", dataUltimaAtualizacao: "2026-03-13", totalArtigos: 0, cor: "#22c55e" },
  { id: "contravencoes", nome: "Lei das Contravencoes Penais", nomeAbreviado: "LCP", referencia: "Decreto-Lei n. 3.688/1941", fonte: "https://www.planalto.gov.br/ccivil_03/decreto-lei/del3688.htm", dataUltimaAtualizacao: "2026-03-13", totalArtigos: 0, cor: "#a3a3a3" },
  { id: "desarmamento", nome: "Estatuto do Desarmamento", nomeAbreviado: "ED", referencia: "Lei n. 10.826/2003", fonte: "https://www.planalto.gov.br/ccivil_03/leis/2003/l10.826.htm", dataUltimaAtualizacao: "2026-03-13", totalArtigos: 0, cor: "#64748b" },
  { id: "testemunhas-protegidas", nome: "Protecao a Testemunhas", nomeAbreviado: "LPT", referencia: "Lei n. 9.807/1999", fonte: "https://www.planalto.gov.br/ccivil_03/leis/l9807.htm", dataUltimaAtualizacao: "2026-03-13", totalArtigos: 0, cor: "#6366f1" },
  { id: "prisao-temporaria", nome: "Prisao Temporaria", nomeAbreviado: "LPTe", referencia: "Lei n. 7.960/1989", fonte: "https://www.planalto.gov.br/ccivil_03/leis/l7960.htm", dataUltimaAtualizacao: "2026-03-13", totalArtigos: 0, cor: "#dc2626" },
  { id: "mariana-ferrer", nome: "Lei Mariana Ferrer", nomeAbreviado: "LMF", referencia: "Lei n. 14.245/2021", fonte: "https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2021/lei/L14245.htm", dataUltimaAtualizacao: "2026-03-13", totalArtigos: 0, cor: "#d946ef" },
  { id: "lc80", nome: "LC da Defensoria Publica", nomeAbreviado: "LC80", referencia: "Lei Complementar n. 80/1994", fonte: "https://www.planalto.gov.br/ccivil_03/leis/lcp/Lcp80.htm", dataUltimaAtualizacao: "2026-03-13", totalArtigos: 0, cor: "#059669" },
  { id: "lce26-bahia", nome: "LCE Defensoria Bahia", nomeAbreviado: "LCE26", referencia: "Lei Complementar Estadual n. 26/2006", fonte: "https://al.ba.gov.br/atividade-legislativa/legislacao/pesquisa-legislativa", dataUltimaAtualizacao: "2026-03-13", totalArtigos: 0, cor: "#0284c7" },
];

export type { Legislacao, LegislacaoMeta, Artigo, NodoEstrutura, Dispositivo, VersaoArtigo } from "./types";
```

**Step 3: Commit**

```
feat(legislacao): add types and registry for 15 laws
```

---

### Task 2: Seed Initial Law Data (CP, CPP + 3 smaller laws)

**Files:**
- Create: `src/config/legislacao/data/codigo-penal.ts`
- Create: `src/config/legislacao/data/cpp.ts`
- Create: `src/config/legislacao/data/prisao-temporaria.ts`
- Create: `src/config/legislacao/data/mariana-ferrer.ts`
- Create: `src/config/legislacao/data/testemunhas-protegidas.ts`

**Step 1: Create a scraping helper script**

Create `scripts/seed-legislacao.ts` — a Node.js script that:
1. Fetches HTML from planalto.gov.br for a given law URL
2. Parses the HTML to extract articles (regex-based: `Art\. \d+` patterns, paragraphs `§`, incisos `I -`, alineas `a)`)
3. Extracts modification notes from the "complete version" (parenthetical notes like "(Redacao dada pela Lei n. X/YYYY)")
4. Outputs a TypeScript file with the structured `Legislacao` object

Use `cheerio` for HTML parsing. The planalto pages use `<p>` tags with specific patterns for articles.

**Step 2: Run the script for the 5 initial laws**

Start with the 3 smallest (Prisao Temporaria ~10 arts, Mariana Ferrer ~5 arts, Testemunhas ~20 arts) to validate the parser, then CP (~361 arts) and CPP (~811 arts).

**Step 3: Create a loader function**

Create `src/config/legislacao/loader.ts`:

```typescript
import type { Legislacao } from "./types";

const cache = new Map<string, Legislacao>();

export async function loadLegislacao(id: string): Promise<Legislacao | null> {
  if (cache.has(id)) return cache.get(id)!;
  try {
    const mod = await import(`./data/${id}`);
    const data = mod.default as Legislacao;
    cache.set(id, data);
    return data;
  } catch {
    return null;
  }
}
```

**Step 4: Commit**

```
feat(legislacao): seed initial law data (CP, CPP, 3 smaller laws)
```

---

### Task 3: Seed Remaining 10 Laws

**Files:**
- Create: `src/config/legislacao/data/lep.ts`
- Create: `src/config/legislacao/data/maria-da-penha.ts`
- Create: `src/config/legislacao/data/drogas.ts`
- Create: `src/config/legislacao/data/eca.ts`
- Create: `src/config/legislacao/data/abuso-autoridade.ts`
- Create: `src/config/legislacao/data/cf88-titulo2.ts`
- Create: `src/config/legislacao/data/contravencoes.ts`
- Create: `src/config/legislacao/data/desarmamento.ts`
- Create: `src/config/legislacao/data/lc80.ts`
- Create: `src/config/legislacao/data/lce26-bahia.ts`

**Step 1: Run seed script for each law**

Use the same `scripts/seed-legislacao.ts` from Task 2. For `lce26-bahia`, adapt the parser for `al.ba.gov.br` HTML structure.

**Step 2: Validate all 15 laws load correctly**

Quick verification: import each, check `estrutura.length > 0` and total artigos count.

**Step 3: Update registry `totalArtigos` counts**

Update `src/config/legislacao/index.ts` with actual article counts from seeded data.

**Step 4: Commit**

```
feat(legislacao): seed remaining 10 laws data
```

---

### Task 4: Database Schema for Highlights

**Files:**
- Create: `src/lib/db/schema/legislacao.ts`
- Modify: `src/lib/db/schema/index.ts` — add export

**Step 1: Create schema file**

Create `src/lib/db/schema/legislacao.ts`:

```typescript
import {
  pgTable,
  serial,
  text,
  varchar,
  timestamp,
  integer,
  index,
} from "drizzle-orm/pg-core";
import { users } from "./core";

export const legislacaoDestaques = pgTable("legislacao_destaques", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  leiId: varchar("lei_id", { length: 50 }).notNull(),
  artigoId: varchar("artigo_id", { length: 100 }).notNull(),
  tipo: varchar("tipo", { length: 20 }).notNull(), // "highlight" | "note" | "favorite"
  conteudo: text("conteudo"),
  cor: varchar("cor", { length: 20 }).default("yellow"),
  textoSelecionado: text("texto_selecionado"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("leg_dest_user_idx").on(table.userId),
  index("leg_dest_user_artigo_idx").on(table.userId, table.artigoId),
  index("leg_dest_user_lei_idx").on(table.userId, table.leiId),
]);

export type LegislacaoDestaque = typeof legislacaoDestaques.$inferSelect;
export type InsertLegislacaoDestaque = typeof legislacaoDestaques.$inferInsert;
```

**Step 2: Add export to schema barrel**

In `src/lib/db/schema/index.ts` add:
```typescript
export * from "./legislacao";
```

**Step 3: Run migration**

```bash
npm run db:generate
npm run db:push
```

**Step 4: Commit**

```
feat(legislacao): add legislacao_destaques schema + migration
```

---

### Task 5: tRPC Router

**Files:**
- Create: `src/lib/trpc/routers/legislacao.ts`
- Modify: `src/lib/trpc/routers/index.ts` — register router

**Step 1: Create router**

Create `src/lib/trpc/routers/legislacao.ts` with procedures:

- `destaques.list` — query: list user's highlights/notes/favorites, filterable by leiId
- `destaques.create` — mutation: create highlight/note/favorite
- `destaques.update` — mutation: update note content or highlight color
- `destaques.delete` — mutation: delete a highlight/note/favorite

Use `protectedProcedure` (requires auth). Filter by `ctx.session.user.id`.

Input validation with Zod:
```typescript
z.object({
  leiId: z.string().optional(),
  tipo: z.enum(["highlight", "note", "favorite"]).optional(),
})
```

**Step 2: Register in router index**

In `src/lib/trpc/routers/index.ts`:
```typescript
import { legislacaoRouter } from "./legislacao";
// ...
legislacao: legislacaoRouter,
```

**Step 3: Commit**

```
feat(legislacao): add tRPC router for highlights CRUD
```

---

### Task 6: Core UI Components

**Files:**
- Create: `src/components/legislacao/artigo-renderer.tsx`
- Create: `src/components/legislacao/cross-reference-link.tsx`
- Create: `src/components/legislacao/highlight-popover.tsx`

**Step 1: Create ArtigoRenderer**

Renders a single article with proper legal typography:
- Caput with bold article number
- Paragraphs indented with `§` or `Paragrafo unico`
- Incisos with Roman numerals, further indented
- Alineas with lowercase letters, further indented
- Rubrica (crime name) as subtitle when present
- Detect cross-references in text and render as `<CrossReferenceLink>`
- On text selection, show `<HighlightPopover>`
- Show existing highlights (colored background spans)
- Show favorite star icon
- "Copy reference" button (copies "Art. 121, §1o, do CP")

**Step 2: Create CrossReferenceLink**

- Parses text for patterns like `art. \d+`, `§ \d+`, `inciso [IVX]+`
- Renders as emerald underlined text
- Tooltip on hover shows preview of referenced article (first 100 chars of caput)
- Click navigates to the referenced article

**Step 3: Create HighlightPopover**

- Appears when user selects text within an article
- Shows 4 color buttons (yellow, green, blue, red)
- "Add note" button opens textarea
- "Favorite" toggle
- "Copy reference" button
- Calls tRPC mutations on action

**Step 4: Commit**

```
feat(legislacao): core UI components (renderer, cross-ref, highlights)
```

---

### Task 7: Navigation Mode — Global Search

**Files:**
- Create: `src/components/legislacao/legislacao-search.tsx`

**Step 1: Create search component**

- Large search input centered at top
- On type (debounced 300ms), searches ALL loaded laws client-side
- Search through: artigo.caput, paragrafos.texto, incisos.texto, alineas.texto
- Results grouped by law with colored badge (nomeAbreviado + cor from registry)
- Each result shows: article number, matching text with highlight, law badge
- Filter chips: by law, by dispositivo type
- Click result → emits event to switch to "Per Lei" mode focused on that article
- Show total results count

**Step 2: Commit**

```
feat(legislacao): global search mode component
```

---

### Task 8: Navigation Mode — Per Lei (Tabs)

**Files:**
- Create: `src/components/legislacao/legislacao-tabs.tsx`

**Step 1: Create tabs component**

- Horizontal scrollable tabs with all 15 laws (badge color from registry)
- Selected tab loads law data via `loadLegislacao(id)`
- Sticky header with law name + local search input
- Continuous scroll of articles using `<ArtigoRenderer>` for each
- Local search filters articles within selected law (same highlight behavior as global)
- Loading skeleton while law data loads
- Accept optional `scrollToArtigoId` prop (from global search click)
- Virtualized list (react-window or intersection observer) for large laws like CP/CPP

**Step 2: Commit**

```
feat(legislacao): per-law tabs navigation mode
```

---

### Task 9: Navigation Mode — Tree

**Files:**
- Create: `src/components/legislacao/legislacao-tree.tsx`

**Step 1: Create tree component**

- Left sidebar (280px) with collapsible tree
- Tree nodes: Parte > Titulo > Capitulo > Secao > Artigo
- Each node shows name, article count badge
- Click on article → renders in right panel via `<ArtigoRenderer>`
- Breadcrumb at top of right panel (CP > Parte Especial > Titulo I > Art. 121)
- Prev/Next navigation buttons between articles
- Tree state persisted in component state (which nodes are expanded)
- Law selector dropdown at top of tree sidebar

**Step 2: Commit**

```
feat(legislacao): tree navigation mode with sidebar
```

---

### Task 10: Timeline and Intertemporal History

**Files:**
- Create: `src/components/legislacao/artigo-timeline.tsx`
- Create: `src/components/legislacao/artigo-diff.tsx`
- Create: `src/components/legislacao/data-vigente-picker.tsx`

**Step 1: Create ArtigoTimeline**

- Horizontal timeline with dots for each version in `artigo.historico`
- Each dot shows: year, law that modified, tooltip with full details
- Clickable dots expand the version text below
- Color coding: green (current), gray (superseded), red (revoked)
- Below timeline: collapsible cards for each historical version
- Each card shows: full text, date range (vigente desde/ate), modifying law with link

**Step 2: Create ArtigoDiff**

- Side-by-side or inline diff between two selected versions
- Red background for removed text, green for added
- Dropdown selectors: "Compare version X with version Y"
- Uses simple word-level diff algorithm (no external dependency)

**Step 3: Create DataVigentePicker**

- Date input: "Qual era a redacao em:"
- On date select, finds the version where `vigenteDesde <= date` and (`vigenteAte > date` or `vigenteAte === null`)
- Renders that version's text in a highlighted card
- Shows badge: "Redacao vigente em DD/MM/YYYY"
- If vacatio legis period, shows warning: "Lei publicada mas ainda nao vigente nesta data"

**Step 4: Commit**

```
feat(legislacao): intertemporal timeline, diff, and date picker
```

---

### Task 11: Meus Destaques Sheet

**Files:**
- Create: `src/components/legislacao/meus-destaques-sheet.tsx`

**Step 1: Create sheet component**

- Sheet (shadcn) sliding from right
- Tabs: Favoritos | Destaques | Notas
- Each item shows: law badge, article number, content preview
- Filter by law (dropdown) and by color (for highlights)
- Click item → navigates to the article
- Delete button on each item
- Uses `trpc.legislacao.destaques.list` query
- Empty state for each tab

**Step 2: Commit**

```
feat(legislacao): personal highlights/notes sheet panel
```

---

### Task 12: Main Page Assembly

**Files:**
- Create: `src/app/(dashboard)/admin/legislacao/page.tsx`
- Modify: `src/components/layouts/admin-sidebar.tsx` — add to TOOLS_NAV

**Step 1: Create the page**

Assemble all components:
```typescript
"use client";

import { useState } from "react";
import { Breadcrumbs } from "@/components/shared/breadcrumbs";
import { LegislacaoSearch } from "@/components/legislacao/legislacao-search";
import { LegislacaoTabs } from "@/components/legislacao/legislacao-tabs";
import { LegislacaoTree } from "@/components/legislacao/legislacao-tree";
import { MeusDestaquesSheet } from "@/components/legislacao/meus-destaques-sheet";
// ... imports

type NavigationMode = "search" | "tabs" | "tree";

export default function LegislacaoPage() {
  const [mode, setMode] = useState<NavigationMode>("search");
  const [destaquesOpen, setDestaquesOpen] = useState(false);
  const [selectedLeiId, setSelectedLeiId] = useState<string | null>(null);
  const [scrollToArtigoId, setScrollToArtigoId] = useState<string | null>(null);

  const handleSearchResultClick = (leiId: string, artigoId: string) => {
    setSelectedLeiId(leiId);
    setScrollToArtigoId(artigoId);
    setMode("tabs");
  };

  return (
    <div className="min-h-screen bg-zinc-50/50 dark:bg-zinc-950">
      {/* Header */}
      <div className="border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
        <div className="px-6 py-4">
          <Breadcrumbs items={[{ label: "Dashboard", href: "/admin" }, { label: "Legislacao" }]} />
          <div className="flex items-center justify-between mt-2">
            <h1>Legislacao</h1>
            <div className="flex gap-2">
              <Button onClick={() => setDestaquesOpen(true)}>Meus Destaques</Button>
              <AtualizarModal />
            </div>
          </div>
          {/* Mode switcher tabs */}
          <Tabs value={mode} onValueChange={setMode}>
            <TabsList>
              <TabsTrigger value="search">Busca Global</TabsTrigger>
              <TabsTrigger value="tabs">Por Lei</TabsTrigger>
              <TabsTrigger value="tree">Arvore</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Content by mode */}
      {mode === "search" && <LegislacaoSearch onResultClick={handleSearchResultClick} />}
      {mode === "tabs" && <LegislacaoTabs selectedLeiId={selectedLeiId} scrollToArtigoId={scrollToArtigoId} />}
      {mode === "tree" && <LegislacaoTree />}

      <MeusDestaquesSheet open={destaquesOpen} onOpenChange={setDestaquesOpen} />
    </div>
  );
}
```

**Step 2: Add to sidebar**

In `src/components/layouts/admin-sidebar.tsx`, add to `TOOLS_NAV` array:
```typescript
{ label: "Legislacao", path: "/admin/legislacao", icon: "Scale" },
```

Ensure `Scale` is in the `iconMap`.

**Step 3: Commit**

```
feat(legislacao): main page with 3 navigation modes + sidebar entry
```

---

### Task 13: Update Modal (Scraping Flow)

**Files:**
- Create: `src/components/legislacao/atualizar-modal.tsx`
- Create: `src/app/api/legislacao/update/route.ts`

**Step 1: Create API route for scraping**

API route at `/api/legislacao/update` that:
1. Receives POST with `{ leiId: string }`
2. Fetches HTML from the law's `fonte` URL (planalto.gov.br or al.ba.gov.br)
3. Parses articles using same logic as seed script
4. Extracts modification history from complete version notes
5. Compares with current static data
6. Returns diff: `{ novas: Artigo[], modificadas: { antes: Artigo, depois: Artigo }[], revogadas: Artigo[] }`

Use server-side fetch (no CORS issues). Protected by auth check.

**Step 2: Create AtualizarModal**

- Dialog with law selector (checkboxes for which laws to update)
- "Buscar atualizacoes" button → calls API route
- Shows loading state per law
- Results screen: expandable list of changes per law
  - NEW articles (green badge)
  - MODIFIED articles (orange badge) with inline diff (red/green)
  - REVOKED articles (red badge)
- Each change has accept/reject toggle
- "Aplicar selecionadas" button → writes updated data

**Step 3: Commit**

```
feat(legislacao): update modal with scraping and diff review
```

---

### Task 14: Seed All 15 Laws via Scraping

**Step 1: Run the seed script for all 15 laws**

Execute `scripts/seed-legislacao.ts` against all URLs. This is the heaviest task — the script will produce large TypeScript files.

For very large laws (CP, CPP, ECA), split into chunks if needed or use dynamic imports.

**Step 2: Validate data quality**

Spot-check 5 random articles per law:
- Correct article number
- Complete caput text
- Paragraphs, incisos, alineas properly nested
- Cross-references detected
- Historical versions populated where applicable

**Step 3: Update totalArtigos in registry**

**Step 4: Commit**

```
feat(legislacao): seed all 15 laws with full article data
```

---

### Task 15: Polish and Integration Testing

**Step 1: Test all 3 navigation modes**

- Global search: search "homicidio" → results from CP, CPP
- Per Lei: open CP → scroll to art. 121 → verify typography
- Tree: navigate CP > Parte Especial > Titulo I > Art. 121

**Step 2: Test highlights flow**

- Select text → highlight with color → verify saved in DB
- Add note to article → verify persists on reload
- Favorite article → verify appears in Meus Destaques sheet

**Step 3: Test cross-references**

- In CP art. 121, references to other articles should be clickable
- Clicking navigates to the referenced article

**Step 4: Test timeline**

- Open article with history → verify timeline renders
- Use date picker → verify correct version shown
- Compare two versions → verify diff display

**Step 5: Test update flow**

- Click update → select a small law → verify scraping works
- Review diff → accept changes → verify data updated

**Step 6: Commit**

```
feat(legislacao): polish and integration fixes
```

---

## Execution Order and Dependencies

```
Task 1 (types/registry) ──┐
                           ├── Task 2 (seed 5 laws) ── Task 3 (seed 10 more)
Task 4 (schema) ───────────┤
                           ├── Task 5 (tRPC router)
                           │
Task 6 (core components) ──┤
                           ├── Task 7 (search mode)
                           ├── Task 8 (tabs mode)
                           ├── Task 9 (tree mode)
                           ├── Task 10 (timeline/diff)
                           └── Task 11 (destaques sheet)
                                      │
                           Task 12 (page assembly) ── Task 13 (update modal)
                                      │
                           Task 14 (seed all laws)
                                      │
                           Task 15 (polish)
```

**Parallelizable groups:**
- Tasks 1, 4, 6 can run in parallel (no dependencies)
- Tasks 7, 8, 9, 10, 11 can run in parallel (all depend on Task 6)
- Tasks 2-3 and 14 are sequential (data seeding)
