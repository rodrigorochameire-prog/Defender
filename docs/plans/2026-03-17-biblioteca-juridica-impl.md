# Biblioteca Jurídica — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Estender as páginas de Jurisprudência e Legislação existentes com: auto-ingestão do Dizer o Direito, diff de alterações legislativas, "Citar em caso", "Inserir em peça" e badge de uso em casos.

**Architecture:** Quatro tarefas independentes que podem rodar em paralelo. Todas estendem infraestrutura já existente (não reescrevem). Duas exigem migração de banco (Task 1 e Task 4).

**Tech Stack:** Next.js 15, tRPC, Drizzle ORM, Supabase PostgreSQL, Tailwind CSS, shadcn/ui, Anthropic Claude (enriquecimento)

---

## Task 1 — DB: Tabelas `referencias_biblioteca` e `leis_versoes`

**Files:**
- Create: `src/lib/db/schema/biblioteca.ts`
- Modify: `src/lib/db/schema/index.ts`
- Modify: `src/lib/db/index.ts`

**Step 1: Criar schema**

```typescript
// src/lib/db/schema/biblioteca.ts
import { pgTable, serial, varchar, text, integer, timestamp, index } from "drizzle-orm/pg-core";
import { casos } from "./casos";
import { users } from "./core";

export const referencesBiblioteca = pgTable("referencias_biblioteca", {
  id: serial("id").primaryKey(),
  tipo: varchar("tipo", { length: 20 }).notNull(), // "tese" | "artigo" | "lei"
  referenciaId: varchar("referencia_id", { length: 100 }).notNull(),
  casoId: integer("caso_id").references(() => casos.id, { onDelete: "cascade" }).notNull(),
  observacao: text("observacao"),
  citacaoFormatada: text("citacao_formatada"),
  createdById: integer("created_by_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [
  index("ref_bib_caso_idx").on(t.casoId),
  index("ref_bib_ref_idx").on(t.tipo, t.referenciaId),
]);

export const leisVersoes = pgTable("leis_versoes", {
  id: serial("id").primaryKey(),
  leiId: varchar("lei_id", { length: 50 }).notNull(),
  artigoId: varchar("artigo_id", { length: 100 }).notNull(),
  textoAnterior: text("texto_anterior"),
  textoNovo: text("texto_novo").notNull(),
  leisAlteradora: varchar("lei_alteradora", { length: 200 }),
  dataVigencia: varchar("data_vigencia", { length: 30 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [
  index("leis_versoes_lei_artigo_idx").on(t.leiId, t.artigoId),
  index("leis_versoes_lei_idx").on(t.leiId),
]);

export type ReferenciaBiblioteca = typeof referencesBiblioteca.$inferSelect;
export type InsertReferenciaBiblioteca = typeof referencesBiblioteca.$inferInsert;
export type LeiVersao = typeof leisVersoes.$inferSelect;
export type InsertLeiVersao = typeof leisVersoes.$inferInsert;
```

**Step 2: Exportar do index de schemas**

Em `src/lib/db/schema/index.ts`, adicionar:
```typescript
export * from "./biblioteca";
```

**Step 3: Exportar do index do db**

Em `src/lib/db/index.ts`, adicionar `referencesBiblioteca` e `leisVersoes` ao objeto exportado de tabelas.

**Step 4: Gerar e aplicar migration**

```bash
npm run db:generate
npm run db:push
```

Verificar no Supabase Table Editor que as tabelas `referencias_biblioteca` e `leis_versoes` foram criadas.

**Step 5: Commit**

```bash
git add src/lib/db/schema/biblioteca.ts src/lib/db/schema/index.ts src/lib/db/index.ts
git commit -m "feat: add referencias_biblioteca and leis_versoes schema tables"
```

---

## Task 2 — Router: `biblioteca.ts` (citar em caso + inserir em peça)

**Files:**
- Create: `src/lib/trpc/routers/biblioteca.ts`
- Modify: `src/lib/trpc/routers/index.ts`

**Step 1: Criar router**

```typescript
// src/lib/trpc/routers/biblioteca.ts
import { z } from "zod";
import { router, protectedProcedure } from "../init";
import { db, referencesBiblioteca } from "@/lib/db";
import { eq, and, count } from "drizzle-orm";
import { safeAsync } from "@/lib/errors";

export const bibliotecaRouter = router({
  /** Vincula tese/artigo a um caso */
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
          .onConflictDoNothing()
          .returning();
        return ref;
      }, "Erro ao citar referência");
    }),

  /** Remove vínculo */
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

  /** Lista referências de um caso */
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

  /** Conta quantos casos usam uma referência (para badge) */
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
```

**Step 2: Registrar no index de routers**

Em `src/lib/trpc/routers/index.ts`, adicionar:
```typescript
import { bibliotecaRouter } from "./biblioteca";
// ...
biblioteca: bibliotecaRouter,
```

**Step 3: Commit**

```bash
git add src/lib/trpc/routers/biblioteca.ts src/lib/trpc/routers/index.ts
git commit -m "feat: add biblioteca router with citar-em-caso and contar-usos"
```

---

## Task 3 — UI Jurisprudência: Badge de uso + "Citar em caso" + "Inserir em peça"

**Files:**
- Create: `src/components/biblioteca/citar-em-caso-modal.tsx`
- Create: `src/components/biblioteca/badge-uso-casos.tsx`
- Modify: `src/app/(dashboard)/admin/jurisprudencia/page.tsx`

**Step 1: Criar `badge-uso-casos.tsx`**

Componente que exibe "Aplicada em N casos" com fetch via `trpc.biblioteca.contarUsos`.

```tsx
// src/components/biblioteca/badge-uso-casos.tsx
"use client";
import { trpc } from "@/lib/trpc/client";
import { Briefcase } from "lucide-react";

interface Props {
  tipo: "tese" | "artigo" | "lei";
  referenciaId: string;
}

export function BadgeUsoCasos({ tipo, referenciaId }: Props) {
  const { data: total } = trpc.biblioteca.contarUsos.useQuery(
    { tipo, referenciaId: String(referenciaId) },
    { staleTime: 60_000 }
  );
  if (!total) return null;
  return (
    <span className="inline-flex items-center gap-1 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5">
      <Briefcase className="w-3 h-3" />
      Aplicada em {total} {total === 1 ? "caso" : "casos"}
    </span>
  );
}
```

**Step 2: Criar `citar-em-caso-modal.tsx`**

Modal com busca de casos (usa `trpc.casos.list`) e vincula ao clicar.

```tsx
// src/components/biblioteca/citar-em-caso-modal.tsx
"use client";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc/client";
import { toast } from "sonner";
import { Briefcase, Search } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  tipo: "tese" | "artigo" | "lei";
  referenciaId: string;
  citacaoFormatada?: string;
}

export function CitarEmCasoModal({ open, onOpenChange, tipo, referenciaId, citacaoFormatada }: Props) {
  const [search, setSearch] = useState("");
  const [casoId, setCasoId] = useState<number | null>(null);
  const [observacao, setObservacao] = useState("");

  const { data: casos } = trpc.casos.list.useQuery(
    { search, limit: 10 },
    { enabled: open }
  );

  const citar = trpc.biblioteca.citarEmCaso.useMutation({
    onSuccess: () => {
      toast.success("Referência vinculada ao caso");
      onOpenChange(false);
      setCasoId(null);
      setObservacao("");
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-emerald-600" />
            Citar em Caso
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-zinc-400" />
            <Input
              placeholder="Buscar processo..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {casos?.items?.map((caso) => (
              <button
                key={caso.id}
                type="button"
                onClick={() => setCasoId(caso.id)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors cursor-pointer ${
                  casoId === caso.id
                    ? "bg-emerald-50 border border-emerald-300 text-emerald-900"
                    : "hover:bg-zinc-50 border border-transparent"
                }`}
              >
                <span className="font-medium">{caso.numeroProcesso}</span>
                {caso.assistido && (
                  <span className="text-zinc-500 ml-2">— {caso.assistido}</span>
                )}
              </button>
            ))}
          </div>
          <Textarea
            placeholder="Observação (opcional)"
            value={observacao}
            onChange={(e) => setObservacao(e.target.value)}
            rows={2}
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button
              disabled={!casoId || citar.isPending}
              onClick={() => casoId && citar.mutate({
                tipo, referenciaId: String(referenciaId), casoId, observacao, citacaoFormatada
              })}
            >
              Vincular
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

**Step 3: Integrar no card de julgado na página de jurisprudência**

Em `src/app/(dashboard)/admin/jurisprudencia/page.tsx`, nos cards de julgados:
- Adicionar `<BadgeUsoCasos tipo="tese" referenciaId={String(julgado.id)} />` abaixo do título
- Adicionar estado `citarModalId` e botão `[Citar em caso]` no hover actions
- Botão `[Inserir em peça]` usa `navigator.clipboard.writeText(julgado.citacaoFormatada)` + toast "Copiado para clipboard"
- Adicionar `<CitarEmCasoModal>` renderizado no root do componente

**Step 4: Commit**

```bash
git add src/components/biblioteca/ "src/app/(dashboard)/admin/jurisprudencia/page.tsx"
git commit -m "feat: add citar-em-caso and badge-uso-casos to jurisprudencia"
```

---

## Task 4 — Diff de Alterações Legislativas

**Files:**
- Create: `src/components/legislacao/artigo-diff.tsx`
- Modify: `src/components/legislacao/artigo-renderer.tsx`
- Modify: `src/components/legislacao/update-modal.tsx`
- Modify: `src/lib/trpc/routers/legislacao.ts`

**Step 1: Criar `artigo-diff.tsx`**

Componente que compara duas versões de texto artigo a artigo, linha a linha.

```tsx
// src/components/legislacao/artigo-diff.tsx
"use client";
import { useState } from "react";
import { ChevronDown, ChevronUp, History } from "lucide-react";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc/client";

interface Props {
  leiId: string;
  artigoId: string;
  textoAtual: string;
}

export function ArtigoDiff({ leiId, artigoId, textoAtual }: Props) {
  const [open, setOpen] = useState(false);

  const { data: versoes } = trpc.legislacao.listVersoes.useQuery(
    { leiId, artigoId },
    { enabled: open }
  );

  const ultima = versoes?.[0];

  if (!ultima) return null;

  const linhasAntes = (ultima.textoAnterior ?? "").split("\n");
  const linhasDepois = ultima.textoNovo.split("\n");

  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2.5 py-1 cursor-pointer hover:bg-amber-100 transition-colors"
      >
        <History className="w-3 h-3" />
        Ver o que mudou
        {open ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
      </button>

      {open && ultima && (
        <div className="mt-2 rounded-lg border border-amber-200 overflow-hidden text-xs">
          <div className="bg-amber-50 px-3 py-1.5 text-amber-800 font-medium">
            Alteração: {ultima.leisAlteradora ?? "Lei não identificada"}
            {ultima.dataVigencia && <span className="ml-2 text-amber-600">· vigência: {ultima.dataVigencia}</span>}
          </div>
          <div className="grid grid-cols-2 divide-x divide-amber-200">
            <div className="p-3 bg-red-50/40">
              <div className="text-red-700 font-semibold mb-1">ANTES</div>
              {linhasAntes.map((linha, i) => (
                <div key={i} className={cn("leading-relaxed", !linhasDepois.includes(linha) && "line-through text-red-600")}>
                  {linha}
                </div>
              ))}
            </div>
            <div className="p-3 bg-emerald-50/40">
              <div className="text-emerald-700 font-semibold mb-1">DEPOIS</div>
              {linhasDepois.map((linha, i) => (
                <div key={i} className={cn("leading-relaxed", !linhasAntes.includes(linha) && "font-medium text-emerald-700")}>
                  {linha}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
```

**Step 2: Adicionar `listVersoes` ao router de legislação**

Em `src/lib/trpc/routers/legislacao.ts`, adicionar:

```typescript
import { leisVersoes } from "@/lib/db";
import { desc } from "drizzle-orm";

// dentro do router:
listVersoes: protectedProcedure
  .input(z.object({ leiId: z.string(), artigoId: z.string() }))
  .query(async ({ input }) => {
    return db
      .select()
      .from(leisVersoes)
      .where(and(
        eq(leisVersoes.leiId, input.leiId),
        eq(leisVersoes.artigoId, input.artigoId),
      ))
      .orderBy(desc(leisVersoes.createdAt))
      .limit(5);
  }),
```

**Step 3: Integrar `ArtigoDiff` em `artigo-renderer.tsx`**

Após o texto do artigo, adicionar:
```tsx
<ArtigoDiff leiId={leiId} artigoId={artigo.id} textoAtual={artigo.texto} />
```

**Step 4: Salvar versão em `update-modal.tsx`**

Quando a atualização da lei detecta texto diferente num artigo, inserir em `leisVersoes` antes de salvar o novo texto. Localizar a função que salva artigos e adicionar:

```typescript
// Se texto mudou, salvar versão anterior
if (artigoExistente && artigoExistente.texto !== novoTexto) {
  await db.insert(leisVersoes).values({
    leiId,
    artigoId: artigo.id,
    textoAnterior: artigoExistente.texto,
    textoNovo: novoTexto,
    leisAlteradora: legislacaoAlteradora, // extraído do XML LexML
    dataVigencia: dataVigencia,
  });
}
```

**Step 5: Commit**

```bash
git add src/components/legislacao/artigo-diff.tsx src/components/legislacao/artigo-renderer.tsx src/components/legislacao/update-modal.tsx src/lib/trpc/routers/legislacao.ts
git commit -m "feat: add legislation diff view and version history"
```

---

## Task 5 — Dizer o Direito → Auto-Extração de Teses

**Files:**
- Modify: `src/lib/trpc/routers/noticias.ts`

**Contexto:** Quando uma notícia do Dizer o Direito é aprovada na triagem, além de buscar conteúdo completo e enriquecer, extrair a tese jurídica e criar entrada em `jurisprudenciaJulgados`.

**Step 1: Adicionar `extrairTeseDoPost` em `noticias.ts`**

Adicionar função após `enriquecerNoticia`:

```typescript
async function extrairTeseParaJurisprudencia(noticiaId: number): Promise<void> {
  const noticia = await db.query.noticiasJuridicas.findFirst({
    where: eq(noticiasJuridicas.id, noticiaId),
  });
  if (!noticia || noticia.fonte !== "dizer_o_direito") return;
  if (!noticia.titulo || !noticia.conteudo) return;

  // Só extrair se o post parece ser um informativo ou análise de caso (não revisão de concurso)
  const isConcurso = /revis[aã]o|concurso|dp[e ]|tj\/|trf\//i.test(noticia.titulo);
  if (isConcurso) return;

  const { Anthropic } = await import("@anthropic-ai/sdk");
  const client = new Anthropic();

  const prompt = `Analise este post do blog "Dizer o Direito" e extraia a tese jurídica principal.
Retorne um JSON com:
{
  "tribunal": "STF" | "STJ" | "STF e STJ",
  "numeroInformativo": "xxx" ou null,
  "holding": "Texto da tese em 1-2 frases, na terceira pessoa",
  "tema": "Penal" | "Processo Penal" | "Execução Penal" | "Júri" | "Violência Doméstica" | "Outro",
  "ratioDecidendi": "Fundamento central da decisão em 1 parágrafo",
  "relator": "Nome do relator ou null",
  "numerosProcesso": ["xxx"] ou []
}

Título: ${noticia.titulo}
Conteúdo: ${(noticia.conteudo ?? "").substring(0, 4000)}`;

  const response = await client.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 800,
    messages: [{ role: "user", content: prompt }],
  });

  const raw = response.content[0]?.type === "text" ? response.content[0].text : "";
  const json = raw.match(/\{[\s\S]+\}/)?.[0];
  if (!json) return;

  const tese = JSON.parse(json) as {
    tribunal: string; numeroInformativo: string | null;
    holding: string; tema: string; ratioDecidendi: string;
    relator: string | null; numerosProcesso: string[];
  };

  if (!tese.holding) return;

  // Mapear tribunal para enum existente
  const tribunalMap: Record<string, string> = {
    "STF": "STF", "STJ": "STJ", "STF e STJ": "STF",
  };

  // Citação formatada
  const numInf = tese.numeroInformativo ? ` (Inf. ${tese.numeroInformativo})` : "";
  const citacao = `Nos termos da tese firmada pelo ${tese.tribunal}${numInf}: "${tese.holding}" (Fonte: Dizer o Direito).`;

  await db.insert(jurisprudenciaJulgados).values({
    tribunal: (tribunalMap[tese.tribunal] ?? "STJ") as any,
    tipoDecisao: "informativo" as any,
    ementa: noticia.titulo,
    ementaResumo: tese.holding,
    textoIntegral: noticia.conteudo,
    relator: tese.relator,
    orgaoJulgador: tese.numeroInformativo ? `Informativo ${tese.numeroInformativo}` : undefined,
    tags: [tese.tema, "dizer_o_direito"],
    fonte: "dizer_o_direito",
    processadoPorIA: true,
    iaResumo: tese.ratioDecidendi,
    citacaoFormatada: citacao,
    status: "processado",
  });
}
```

**Step 2: Chamar no bloco de aprovação**

Dentro do `void (async () => { ... })()` em `aprovar`, após `enriquecerNoticia`:
```typescript
await extrairTeseParaJurisprudencia(noticia.id);
```

**Step 3: Commit**

```bash
git add src/lib/trpc/routers/noticias.ts
git commit -m "feat: auto-extract teses from Dizer o Direito posts on approval"
```

---

## Task 6 — UI: "Citar em caso" na Legislação

**Files:**
- Modify: `src/components/legislacao/artigo-renderer.tsx`
- Modify: `src/components/legislacao/highlight-popover.tsx`

**Step 1: Adicionar botões no `artigo-renderer.tsx`**

Junto aos controles existentes de cada artigo, adicionar:
```tsx
import { CitarEmCasoModal } from "@/components/biblioteca/citar-em-caso-modal";
import { BadgeUsoCasos } from "@/components/biblioteca/badge-uso-casos";

// No card do artigo:
<BadgeUsoCasos tipo="artigo" referenciaId={`${leiId}-${artigo.id}`} />
<button
  onClick={() => setCitarModal({ leiId, artigoId: artigo.id })}
  className="text-xs text-emerald-700 hover:underline cursor-pointer"
>
  Citar em caso
</button>
<button
  onClick={() => {
    const texto = `Art. ${artigo.numeroArtigo} — ${artigo.texto}`;
    navigator.clipboard.writeText(texto);
    toast.success("Artigo copiado para clipboard");
  }}
  className="text-xs text-zinc-500 hover:underline cursor-pointer"
>
  Inserir em peça
</button>
```

**Step 2: Commit**

```bash
git add src/components/legislacao/
git commit -m "feat: add citar-em-caso and inserir-em-peca to artigo-renderer"
```

---

## Ordem de Execução Recomendada (paralela)

```
Task 1 (DB) → Task 2 (Router) → Tasks 3, 4, 5, 6 em paralelo
```

Tasks 3-6 dependem do Task 1 (tabelas) e Task 2 (router), mas são independentes entre si.

## Verificação Final

```bash
npm run build
```

Sem erros de TypeScript. Testar manualmente:
1. Abrir `/admin/jurisprudencia` → card mostra badge "Aplicada em N casos"
2. Clicar `[Citar em caso]` → modal abre, busca caso, vincula
3. Aprovar notícia do Dizer o Direito na triagem → após segundos, novo julgado aparece em jurisprudência
4. Abrir `/admin/legislacao` → artigo alterado mostra botão "Ver o que mudou"
5. `[Inserir em peça]` copia texto formatado para clipboard
