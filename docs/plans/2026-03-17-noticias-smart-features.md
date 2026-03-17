# Notícias Jurídicas — Smart Features Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Adicionar 4 features ao módulo de notícias: auto-vínculo com processos (IA), digest semanal WhatsApp, pastas temáticas e busca full-text PostgreSQL, além de melhorias de UI/UX.

**Architecture:** 5 tasks independentes que podem rodar em paralelo após Task 1 (schema). A IA de auto-vínculo dispara no fluxo de aprovação já existente. O digest usa o endpoint cron já existente em `/api/cron/noticias/`. A busca full-text usa tsvector GENERATED ALWAYS AS — sem trigger manual.

**Tech Stack:** Next.js 15, tRPC, Drizzle ORM, Supabase PostgreSQL, Evolution API (`src/lib/services/evolution-api.ts`), Anthropic Claude, Tailwind CSS, shadcn/ui

---

## Task 1 — DB: Novas tabelas e colunas

**Files:**
- Modify: `src/lib/db/schema/noticias.ts`
- Run: migração SQL via Node.js com `SUPABASE_SERVICE_ROLE_KEY`

**Step 1: Adicionar `autoVinculada` à tabela `noticiasProcessos`**

Em `src/lib/db/schema/noticias.ts`, no `noticiasProcessos`, adicionar campo após `observacao`:
```typescript
autoVinculada: boolean("auto_vinculada").default(false).notNull(),
```

**Step 2: Adicionar tabelas de pastas**

Após `noticiasProcessos`, adicionar:
```typescript
// ==========================================
// PASTAS — Organização temática de notícias
// ==========================================

export const noticiasPastas = pgTable("noticias_pastas", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  nome: varchar("nome", { length: 100 }).notNull(),
  cor: varchar("cor", { length: 20 }).default("#6366f1"),
  icone: varchar("icone", { length: 50 }).default("Folder"),
  tipo: varchar("tipo", { length: 10 }).default("livre").notNull(), // "fixa" | "livre"
  area: varchar("area", { length: 50 }), // para pastas fixas: area de atuacao
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [
  index("not_pasta_user_idx").on(t.userId),
]);

export const noticiasPastaItens = pgTable("noticias_pasta_itens", {
  id: serial("id").primaryKey(),
  pastaId: integer("pasta_id").references(() => noticiasPastas.id, { onDelete: "cascade" }).notNull(),
  noticiaId: integer("noticia_id").references(() => noticiasJuridicas.id, { onDelete: "cascade" }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [
  uniqueIndex("not_pasta_item_unique_idx").on(t.pastaId, t.noticiaId),
  index("not_pasta_item_pasta_idx").on(t.pastaId),
]);

export type NoticiasPasta = typeof noticiasPastas.$inferSelect;
export type InsertNoticiasPasta = typeof noticiasPastas.$inferInsert;
export type NoticiasPastaItem = typeof noticiasPastaItens.$inferSelect;
```

Adicionar ao `schema/index.ts`: `export * from "./noticias";` (verificar se já existe — se sim, as novas tabelas já são exportadas automaticamente).

**Step 3: Aplicar migração via Node.js**

```bash
cd /Users/rodrigorochameire/Projetos/Defender
node -e "
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
async function main() {
  const sqls = [
    \`ALTER TABLE noticias_processos ADD COLUMN IF NOT EXISTS auto_vinculada BOOLEAN NOT NULL DEFAULT false\`,
    \`CREATE TABLE IF NOT EXISTS noticias_pastas (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      nome VARCHAR(100) NOT NULL,
      cor VARCHAR(20) DEFAULT '#6366f1',
      icone VARCHAR(50) DEFAULT 'Folder',
      tipo VARCHAR(10) NOT NULL DEFAULT 'livre',
      area VARCHAR(50),
      created_at TIMESTAMP DEFAULT NOW() NOT NULL
    )\`,
    \`CREATE INDEX IF NOT EXISTS not_pasta_user_idx ON noticias_pastas(user_id)\`,
    \`CREATE TABLE IF NOT EXISTS noticias_pasta_itens (
      id SERIAL PRIMARY KEY,
      pasta_id INTEGER NOT NULL REFERENCES noticias_pastas(id) ON DELETE CASCADE,
      noticia_id INTEGER NOT NULL REFERENCES noticias_juridicas(id) ON DELETE CASCADE,
      created_at TIMESTAMP DEFAULT NOW() NOT NULL,
      UNIQUE(pasta_id, noticia_id)
    )\`,
    \`CREATE INDEX IF NOT EXISTS not_pasta_item_pasta_idx ON noticias_pasta_itens(pasta_id)\`,
    \`ALTER TABLE noticias_juridicas ADD COLUMN IF NOT EXISTS search_vector tsvector GENERATED ALWAYS AS (to_tsvector('portuguese', coalesce(titulo,'') || ' ' || coalesce(conteudo,''))) STORED\`,
    \`CREATE INDEX IF NOT EXISTS noticias_search_idx ON noticias_juridicas USING GIN(search_vector)\`,
  ];
  for (const sql of sqls) {
    const { error } = await s.rpc('exec_sql', { query: sql }).catch(() => ({ error: null }));
    // Fallback direto
    const { error: e2 } = await s.from('_migrations').select().limit(0).then(() => ({ error: null })).catch(() => ({ error: null }));
    console.log('SQL:', sql.substring(0, 60), '...');
  }
}
main();
"
```

Se o rpc não funcionar, usar o MCP Supabase execute_sql (projeto `hxfvlaeqhkmelvyzgfqp`) com cada SQL individualmente.

**Step 4: Verificar tabelas criadas**
```bash
node -e "
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
s.from('noticias_pastas').select('id').limit(1).then(r => console.log('pastas:', r.error ?? 'OK'));
s.from('noticias_pasta_itens').select('id').limit(1).then(r => console.log('pasta_itens:', r.error ?? 'OK'));
"
```

**Step 5: Commit**
```bash
git add src/lib/db/schema/noticias.ts
git commit -m "feat(noticias): add pastas, pasta_itens schema and search_vector column"
```

---

## Task 2 — Router: Pastas Temáticas

**Files:**
- Modify: `src/lib/trpc/routers/noticias.ts`

**Step 1: Importar novas tabelas**

No topo de `noticias.ts`, adicionar ao import existente de `@/lib/db`:
```typescript
import { noticiasPastas, noticiasPastaItens } from "@/lib/db/schema/noticias";
```

**Step 2: Adicionar procedures de pastas ao router**

Adicionar antes do fechamento do `router({...})`:

```typescript
// ==========================================
// PASTAS TEMÁTICAS
// ==========================================

listPastas: protectedProcedure
  .query(async ({ ctx }) => {
    return safeAsync(async () => {
      return db
        .select()
        .from(noticiasPastas)
        .where(eq(noticiasPastas.userId, ctx.user.id))
        .orderBy(noticiasPastas.tipo, noticiasPastas.nome);
    }, "Erro ao listar pastas");
  }),

criarPasta: protectedProcedure
  .input(z.object({
    nome: z.string().min(1).max(100),
    cor: z.string().optional(),
    icone: z.string().optional(),
  }))
  .mutation(async ({ ctx, input }) => {
    return safeAsync(async () => {
      const [pasta] = await db
        .insert(noticiasPastas)
        .values({ ...input, userId: ctx.user.id, tipo: "livre" })
        .returning();
      return pasta;
    }, "Erro ao criar pasta");
  }),

deletarPasta: protectedProcedure
  .input(z.object({ id: z.number() }))
  .mutation(async ({ ctx, input }) => {
    return safeAsync(async () => {
      await db
        .delete(noticiasPastas)
        .where(and(eq(noticiasPastas.id, input.id), eq(noticiasPastas.userId, ctx.user.id)));
    }, "Erro ao deletar pasta");
  }),

adicionarNaPasta: protectedProcedure
  .input(z.object({ pastaId: z.number(), noticiaId: z.number() }))
  .mutation(async ({ ctx, input }) => {
    return safeAsync(async () => {
      // Verificar que a pasta pertence ao usuário
      const pasta = await db.query.noticiasPastas.findFirst({
        where: and(eq(noticiasPastas.id, input.pastaId), eq(noticiasPastas.userId, ctx.user.id)),
      });
      if (!pasta) throw new Error("Pasta não encontrada");
      const [item] = await db
        .insert(noticiasPastaItens)
        .values(input)
        .onConflictDoNothing()
        .returning();
      return item;
    }, "Erro ao adicionar à pasta");
  }),

removerDaPasta: protectedProcedure
  .input(z.object({ pastaId: z.number(), noticiaId: z.number() }))
  .mutation(async ({ input }) => {
    return safeAsync(async () => {
      await db
        .delete(noticiasPastaItens)
        .where(and(
          eq(noticiasPastaItens.pastaId, input.pastaId),
          eq(noticiasPastaItens.noticiaId, input.noticiaId),
        ));
    }, "Erro ao remover da pasta");
  }),

listNoticiasDaPasta: protectedProcedure
  .input(z.object({ pastaId: z.number(), limit: z.number().default(20), offset: z.number().default(0) }))
  .query(async ({ input }) => {
    return safeAsync(async () => {
      return db
        .select({ noticia: noticiasJuridicas })
        .from(noticiasPastaItens)
        .innerJoin(noticiasJuridicas, eq(noticiasPastaItens.noticiaId, noticiasJuridicas.id))
        .where(eq(noticiasPastaItens.pastaId, input.pastaId))
        .orderBy(desc(noticiasPastaItens.createdAt))
        .limit(input.limit)
        .offset(input.offset);
    }, "Erro ao listar notícias da pasta");
  }),

seedPastasFixas: protectedProcedure
  .mutation(async ({ ctx }) => {
    return safeAsync(async () => {
      const pastasFixas = [
        { nome: "Criminal Comum", cor: "#dc2626", icone: "Shield", area: "CRIMINAL_COMUM" },
        { nome: "Tribunal do Júri", cor: "#7c3aed", icone: "Gavel", area: "JURI" },
        { nome: "Execução Penal", cor: "#ea580c", icone: "Building", area: "EXECUCAO_PENAL" },
        { nome: "Violência Doméstica", cor: "#db2777", icone: "Heart", area: "VVD" },
        { nome: "Processo Penal", cor: "#2563eb", icone: "Scale", area: "PROCESSO_PENAL" },
      ];
      for (const p of pastasFixas) {
        await db
          .insert(noticiasPastas)
          .values({ ...p, userId: ctx.user.id, tipo: "fixa" })
          .onConflictDoNothing();
      }
      return { seeded: pastasFixas.length };
    }, "Erro ao criar pastas fixas");
  }),
```

**Step 3: Atualizar procedure `list` para busca full-text**

Localizar o procedure `list` no router. Adicionar parâmetro `busca` e condição:

```typescript
// No input do list, adicionar:
busca: z.string().optional(),

// Na query, adicionar condição:
if (input?.busca && input.busca.trim()) {
  const q = input.busca.trim().split(/\s+/).join(' & ');
  conditions.push(sql`search_vector @@ to_tsquery('portuguese', ${q})`);
}
```

**Step 4: TypeScript check**
```bash
cd /Users/rodrigorochameire/Projetos/Defender && npx tsc --noEmit 2>&1 | grep -v "schema.old\|page-refactored" | grep "error TS" | head -10
```

**Step 5: Commit**
```bash
git add src/lib/trpc/routers/noticias.ts
git commit -m "feat(noticias): add pastas router procedures and full-text search"
```

---

## Task 3 — Auto-vínculo IA com Processos

**Files:**
- Modify: `src/lib/trpc/routers/noticias.ts`

**Step 1: Adicionar função `vincularNoticiasAProcessos`**

Após a função `extrairTeseParaJurisprudencia` existente, adicionar:

```typescript
async function vincularNoticiasAProcessos(noticiaId: number, userId: number): Promise<void> {
  const noticia = await db.query.noticiasJuridicas.findFirst({
    where: eq(noticiasJuridicas.id, noticiaId),
    columns: { id: true, titulo: true, analiseIa: true, tags: true, categoria: true },
  });
  if (!noticia) return;

  // Buscar processos ativos do usuário (últimos 100)
  const processosList = await db
    .select({
      id: processos.id,
      numeroAutos: processos.numeroAutos,
      assunto: processos.assunto,
      area: processos.area,
      classeProcessual: processos.classeProcessual,
    })
    .from(processos)
    .where(eq(processos.defensorId, userId))
    .limit(100);

  if (processosList.length === 0) return;

  const { Anthropic } = await import("@anthropic-ai/sdk");
  const client = new Anthropic();

  const resumo = (noticia.analiseIa as any)?.resumoExecutivo ?? noticia.titulo;
  const impacto = (noticia.analiseIa as any)?.impactoPratico ?? "";
  const tags = (noticia.tags as string[])?.join(", ") ?? "";

  const prompt = `Você é assistente jurídico. Analise se esta notícia jurídica é relevante para algum dos processos listados.

NOTÍCIA:
Título: ${noticia.titulo}
Resumo: ${resumo}
Impacto prático: ${impacto}
Tags: ${tags}

PROCESSOS ATIVOS:
${processosList.map(p => `ID ${p.id}: ${p.area} — ${p.assunto ?? p.classeProcessual ?? "sem assunto"} (${p.numeroAutos})`).join("\n")}

Retorne APENAS JSON válido:
{
  "vinculos": [
    { "processoId": 123, "justificativa": "Decisão do STJ sobre X afeta diretamente este processo pois..." }
  ]
}
Se nenhum processo for relevante, retorne: { "vinculos": [] }`;

  const response = await client.messages.create({
    model: "claude-haiku-4-5",
    max_tokens: 500,
    messages: [{ role: "user", content: prompt }],
  });

  const raw = response.content[0]?.type === "text" ? response.content[0].text : "";
  const json = raw.match(/\{[\s\S]+\}/)?.[0];
  if (!json) return;

  const result = JSON.parse(json) as { vinculos: { processoId: number; justificativa: string }[] };
  if (!result.vinculos?.length) return;

  for (const vinculo of result.vinculos) {
    // Verificar que processoId pertence ao usuário
    const proc = processosList.find(p => p.id === vinculo.processoId);
    if (!proc) continue;

    try {
      await db.insert(noticiasProcessos).values({
        noticiaId,
        processoId: vinculo.processoId,
        userId,
        observacao: vinculo.justificativa,
        autoVinculada: true,
      }).onConflictDoNothing();
    } catch {
      // Já vinculado — ignorar
    }
  }

  // Criar notificação in-app se houve vínculos
  if (result.vinculos.length > 0) {
    const count = result.vinculos.length;
    try {
      await db.insert(notifications).values({
        userId,
        titulo: "Notícia relevante para seus processos",
        mensagem: `"${noticia.titulo.substring(0, 80)}..." pode afetar ${count} processo${count > 1 ? "s" : ""} seu${count > 1 ? "s" : ""}`,
        tipo: "noticias",
        link: `/admin/noticias`,
        lida: false,
      });
    } catch {
      // Notificação opcional — não quebra o fluxo
    }
  }
}
```

**Atenção:** Verificar o schema de notifications (`src/lib/db/schema/`) para usar os campos corretos. Se não existir tabela de notifications ou os campos forem diferentes, adaptar ou remover o bloco de notificação.

**Step 2: Chamar no bloco de aprovação**

No `void (async () => { ... })()` após `extrairTeseParaJurisprudencia`:
```typescript
try {
  await vincularNoticiasAProcessos(noticia.id, ctx.user.id);
} catch {
  // Silencioso
}
```

**Atenção:** O `ctx.user.id` não está disponível dentro do `void async` porque é um closure. Capturar antes:
```typescript
const currentUserId = ctx.user.id; // capturar fora do void
void (async () => {
  // ... usar currentUserId dentro
  await vincularNoticiasAProcessos(noticia.id, currentUserId);
})();
```

**Step 3: Adicionar import de `processos`**

No topo do router, verificar se `processos` já é importado de `@/lib/db`. Se não, adicionar:
```typescript
import { processos } from "@/lib/db/schema/casos"; // ou do schema correto
```
Verificar em qual arquivo `processos` está definido (`src/lib/db/schema/`).

**Step 4: TypeScript check e commit**
```bash
npx tsc --noEmit 2>&1 | grep -v "schema.old\|page-refactored" | grep "error TS" | head -5
git add src/lib/trpc/routers/noticias.ts
git commit -m "feat(noticias): auto-link noticias to processos via AI on approval"
```

---

## Task 4 — API Cron: Digest Semanal WhatsApp

**Files:**
- Modify: `src/app/api/cron/noticias/route.ts`

**Step 1: Ler o arquivo existente na íntegra**

Leia `src/app/api/cron/noticias/route.ts` para entender a estrutura atual.

**Step 2: Adicionar endpoint `digest`**

Se o arquivo exporta um `GET` handler que faz scraping, adicionar rota para digest. Verificar se usa `request.url` para rotear ou se é um único handler.

Adicionar função `gerarEEnviarDigest`:

```typescript
async function gerarEEnviarDigest() {
  // 1. Buscar notícias aprovadas dos últimos 7 dias
  const seteDiasAtras = new Date();
  seteDiasAtras.setDate(seteDiasAtras.getDate() - 7);

  const noticias = await db
    .select({
      id: noticiasJuridicas.id,
      titulo: noticiasJuridicas.titulo,
      fonte: noticiasJuridicas.fonte,
      analiseIa: noticiasJuridicas.analiseIa,
      aprovadoEm: noticiasJuridicas.aprovadoEm,
    })
    .from(noticiasJuridicas)
    .where(and(
      eq(noticiasJuridicas.status, "aprovado"),
      gte(noticiasJuridicas.aprovadoEm, seteDiasAtras),
    ))
    .orderBy(desc(noticiasJuridicas.aprovadoEm))
    .limit(20);

  if (noticias.length === 0) return { sent: 0, reason: "no_noticias" };

  // 2. Buscar notícias vinculadas a processos (prioritárias)
  const vinculadas = await db
    .select({ noticiaId: noticiasProcessos.noticiaId, processoId: noticiasProcessos.processoId, observacao: noticiasProcessos.observacao })
    .from(noticiasProcessos)
    .where(inArray(noticiasProcessos.noticiaId, noticias.map(n => n.id)));

  // 3. Formatar digest com Claude Haiku
  const { Anthropic } = await import("@anthropic-ai/sdk");
  const client = new Anthropic();

  const noticiasPrioritarias = noticias.filter(n => vinculadas.some(v => v.noticiaId === n.id));
  const noticiasGerais = noticias.filter(n => !vinculadas.some(v => v.noticiaId === n.id)).slice(0, 5);

  const hoje = new Date();
  const semanaPassada = new Date(hoje);
  semanaPassada.setDate(hoje.getDate() - 7);
  const fmt = (d: Date) => d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });

  const prompt = `Crie um digest de WhatsApp conciso e profissional com estas notícias jurídicas.
Use markdown do WhatsApp: *negrito* para títulos, bullet • para listas.
Máximo 800 caracteres.

PERÍODO: ${fmt(semanaPassada)} a ${fmt(hoje)}

${noticiasPrioritarias.length > 0 ? `NOTÍCIAS QUE AFETAM PROCESSOS ATIVOS:
${noticiasPrioritarias.map(n => `- ${n.titulo}: ${(n.analiseIa as any)?.resumoExecutivo?.substring(0, 100) ?? ""}`).join("\n")}` : ""}

DESTAQUES DA SEMANA:
${noticiasGerais.map(n => `- ${n.titulo}: ${(n.analiseIa as any)?.resumoExecutivo?.substring(0, 80) ?? ""}`).join("\n")}

Formato esperado:
📰 *Panorama Jurídico — [período]*
[conteúdo]
🔗 Ver todas: ombuds.vercel.app/admin/noticias`;

  const response = await client.messages.create({
    model: "claude-haiku-4-5",
    max_tokens: 400,
    messages: [{ role: "user", content: prompt }],
  });

  const mensagem = response.content[0]?.type === "text" ? response.content[0].text : "";
  if (!mensagem) return { sent: 0, reason: "no_message" };

  // 4. Buscar configs Evolution e enviar para todos os defensores com digest ativo
  const configs = await db
    .select()
    .from(evolutionConfig)
    .where(eq(evolutionConfig.isActive, true))
    .limit(20);

  const { sendText } = await import("@/lib/services/evolution-api");
  let sent = 0;

  for (const config of configs) {
    if (!config.phoneNumber) continue;
    try {
      await sendText(config.phoneNumber, mensagem, { instanceName: config.instanceName });
      sent++;
    } catch {
      // Falha silenciosa por instância
    }
  }

  return { sent, noticias: noticias.length };
}
```

**Step 3: Adicionar rota POST para o digest**

No handler do arquivo, adicionar condição para `action=digest`:
```typescript
// Se o arquivo usa searchParams:
const action = new URL(request.url).searchParams.get("action");
if (action === "digest") {
  const result = await gerarEEnviarDigest();
  return NextResponse.json(result);
}
```

**Step 4: Criar scheduled task via MCP**

Usar o MCP `scheduled-tasks` para criar a tarefa:
- URL: `https://ombuds.vercel.app/api/cron/noticias?action=digest`
- Schedule: toda segunda-feira às 08h (cron: `0 8 * * 1`)
- Nome: "Digest Semanal Notícias Jurídicas"

**Step 5: Commit**
```bash
git add src/app/api/cron/noticias/route.ts
git commit -m "feat(noticias): add weekly WhatsApp digest cron endpoint"
```

---

## Task 5 — UI: Sidebar de Pastas + Melhorias UX

**Files:**
- Create: `src/components/noticias/noticias-pastas-sidebar.tsx`
- Modify: `src/components/noticias/noticias-feed.tsx`
- Modify: `src/components/noticias/noticias-card.tsx`

**Step 1: Criar `noticias-pastas-sidebar.tsx`**

```tsx
"use client";
import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";
import { Folder, FolderOpen, Plus, Trash2, Shield, Gavel, Scale, Heart, Building } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

const ICONE_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Shield, Gavel, Scale, Heart, Building, Folder,
};

interface Props {
  pastaAtiva: number | null;
  onSelectPasta: (id: number | null) => void;
}

export function NoticiasPastasSidebar({ pastaAtiva, onSelectPasta }: Props) {
  const [criando, setCriando] = useState(false);
  const [nomePasta, setNomePasta] = useState("");
  const utils = trpc.useUtils();

  const { data: pastas = [] } = trpc.noticias.listPastas.useQuery();

  const criarPasta = trpc.noticias.criarPasta.useMutation({
    onSuccess: () => {
      toast.success("Pasta criada");
      setCriando(false);
      setNomePasta("");
      void utils.noticias.listPastas.invalidate();
    },
  });

  const deletarPasta = trpc.noticias.deletarPasta.useMutation({
    onSuccess: () => {
      void utils.noticias.listPastas.invalidate();
      if (pastaAtiva) onSelectPasta(null);
    },
  });

  const pastasFixas = pastas.filter(p => p.tipo === "fixa");
  const pastasLivres = pastas.filter(p => p.tipo === "livre");

  const PastaItem = ({ pasta }: { pasta: typeof pastas[0] }) => {
    const Icone = ICONE_MAP[pasta.icone ?? "Folder"] ?? Folder;
    const ativo = pastaAtiva === pasta.id;
    return (
      <div
        className={cn(
          "group flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-all text-sm",
          ativo
            ? "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900"
            : "hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
        )}
        onClick={() => onSelectPasta(ativo ? null : pasta.id)}
      >
        <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: pasta.cor ?? "#6366f1" }} />
        <span className="flex-1 truncate">{pasta.nome}</span>
        {pasta.tipo === "livre" && (
          <button
            onClick={(e) => { e.stopPropagation(); deletarPasta.mutate({ id: pasta.id }); }}
            className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:text-red-500 transition-all cursor-pointer"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="w-56 shrink-0 space-y-4">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400 px-3 mb-1">Pastas Fixas</p>
        {pastasFixas.map(p => <PastaItem key={p.id} pasta={p} />)}
        {pastasFixas.length === 0 && (
          <button
            onClick={() => trpc.noticias.seedPastasFixas.useMutation()}
            className="text-xs text-zinc-400 px-3 hover:underline cursor-pointer"
          >
            Inicializar pastas
          </button>
        )}
      </div>

      <div>
        <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400 px-3 mb-1">Minhas Pastas</p>
        {pastasLivres.map(p => <PastaItem key={p.id} pasta={p} />)}
        {criando ? (
          <div className="px-3 flex gap-1">
            <Input
              autoFocus
              value={nomePasta}
              onChange={e => setNomePasta(e.target.value)}
              onKeyDown={e => {
                if (e.key === "Enter") criarPasta.mutate({ nome: nomePasta });
                if (e.key === "Escape") setCriando(false);
              }}
              placeholder="Nome da pasta"
              className="h-7 text-xs"
            />
          </div>
        ) : (
          <button
            onClick={() => setCriando(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 cursor-pointer transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> Nova pasta
          </button>
        )}
      </div>
    </div>
  );
}
```

**Step 2: Adicionar botão "Salvar em pasta" no `noticias-card.tsx`**

No card, adicionar ao hover actions existente um `DropdownMenu` com `FolderPlus`:

```tsx
import { FolderPlus } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

// Dentro do card, nas actions:
const { data: pastas = [] } = trpc.noticias.listPastas.useQuery(undefined, { staleTime: 60_000 });
const adicionarNaPasta = trpc.noticias.adicionarNaPasta.useMutation({
  onSuccess: () => toast.success("Salvo na pasta"),
});

<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <button className="p-1.5 rounded hover:bg-zinc-100 dark:hover:bg-zinc-700 cursor-pointer transition-colors" title="Salvar em pasta">
      <FolderPlus className="w-3.5 h-3.5 text-zinc-400" />
    </button>
  </DropdownMenuTrigger>
  <DropdownMenuContent align="end" className="w-48">
    {pastas.map(p => (
      <DropdownMenuItem
        key={p.id}
        onClick={() => adicionarNaPasta.mutate({ pastaId: p.id, noticiaId: noticia.id })}
        className="gap-2 cursor-pointer"
      >
        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.cor ?? "#6366f1" }} />
        {p.nome}
      </DropdownMenuItem>
    ))}
    {pastas.length === 0 && (
      <DropdownMenuItem disabled>Nenhuma pasta criada</DropdownMenuItem>
    )}
  </DropdownMenuContent>
</DropdownMenu>
```

**Step 3: Integrar sidebar no `noticias-feed.tsx`**

Leia `noticias-feed.tsx` na íntegra. Adicionar:
- Import de `NoticiasPastasSidebar`
- Estado `pastaAtiva: number | null`
- Layout com `flex gap-6` envolvendo sidebar + feed
- Quando `pastaAtiva` está definido, usar `trpc.noticias.listNoticiasDaPasta` em vez de `trpc.noticias.list`
- Passar `busca` para o parâmetro da query `list` (busca full-text)

**Step 4: Melhorias UX adicionais**

Em `noticias-feed.tsx`:
- Substituir spinner por skeletons durante loading:
```tsx
{isLoading && (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
    {[1,2,3,4,5,6].map(i => (
      <div key={i} className="h-52 bg-zinc-100 dark:bg-zinc-800 rounded-xl animate-pulse" />
    ))}
  </div>
)}
```
- Badge de contagem na aba "Triagem" (já deve existir — verificar se `countPendentes` está sendo usado)
- Mobile: forçar `grid-cols-1` abaixo de 768px

**Step 5: Commit**
```bash
git add src/components/noticias/
git commit -m "feat(noticias): add pastas sidebar, folder button on cards, skeleton loading"
```

---

## Task 6 — Aba "Notícias" no Processo

**Files:**
- Modify: `src/app/(dashboard)/admin/processos/[id]/page.tsx`

**Step 1: Adicionar "Notícias" ao tipo Tab**

Já existe o tipo `Tab`. Adicionar `"noticias"`:
```typescript
type Tab = "partes" | "demandas" | "drive" | "audiencias" | "timeline" | "vinculados" | "inteligencia" | "fundamentos" | "noticias";
```

**Step 2: Adicionar tab ao array `tabs`**
```typescript
{ key: "noticias", label: "Notícias" },
```

**Step 3: Adicionar conteúdo da tab**

```tsx
{tab === "noticias" && (
  <ProcessoNoticiasTab processoId={Number(id)} />
)}
```

**Step 4: Criar componente `ProcessoNoticiasTab`**

No final do arquivo:
```tsx
function ProcessoNoticiasTab({ processoId }: { processoId: number }) {
  const utils = trpc.useUtils();

  const { data: vinculos = [], isLoading } = trpc.noticias.listPorProcesso.useQuery(
    { processoId },
    { enabled: !isNaN(processoId) }
  );

  const desvincular = trpc.noticias.desvincularProcesso.useMutation({
    onSuccess: () => {
      toast.success("Vínculo removido");
      void utils.noticias.listPorProcesso.invalidate({ processoId });
    },
  });

  if (isLoading) return (
    <div className="space-y-2">
      {[1,2,3].map(i => <div key={i} className="h-16 bg-zinc-100 rounded-lg animate-pulse" />)}
    </div>
  );

  if (vinculos.length === 0) return (
    <div className="text-center py-10 text-zinc-400 text-sm">
      <p>Nenhuma notícia vinculada</p>
      <p className="text-xs mt-1">Notícias relevantes são vinculadas automaticamente após aprovação</p>
    </div>
  );

  return (
    <div className="space-y-2">
      {vinculos.map((v) => (
        <div key={v.id} className="group bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-3 border-l-[3px] border-l-emerald-500">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200 line-clamp-2">
                {v.noticia?.titulo}
              </p>
              {v.observacao && (
                <p className="text-xs text-zinc-400 mt-1 italic">{v.observacao}</p>
              )}
              {v.autoVinculada && (
                <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600 bg-emerald-50 rounded-full px-1.5 py-0.5 mt-1">
                  ✦ Vinculada automaticamente
                </span>
              )}
            </div>
            <button
              onClick={() => desvincular.mutate({ processoId, noticiaId: v.noticiaId })}
              className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-50 cursor-pointer transition-all"
            >
              <Trash2 className="w-3.5 h-3.5 text-zinc-400 hover:text-red-500" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
```

**Atenção:** Verificar se o procedure `listPorProcesso` existe no router de noticias. Procurar em `noticias.ts` — deve estar em torno da linha 480+ onde `vincularProcesso` e `desvincularProcesso` existem. O procedure pode se chamar `listPorProcesso` ou pode precisar ser adicionado. Verificar e adaptar.

**Step 5: Verificar e commitar**
```bash
npx tsc --noEmit 2>&1 | grep -v "schema.old\|page-refactored" | grep "error TS" | head -5
git add "src/app/(dashboard)/admin/processos/[id]/page.tsx"
git commit -m "feat(noticias): add Noticias tab to processo detail with auto-linked news"
```

---

## Ordem de Execução (paralela após Task 1)

```
Task 1 (DB)
  ↓
Tasks 2, 3, 4, 5, 6 — em paralelo (independentes entre si)
```

## Verificação Final

```bash
npm run build
```

Sem erros. Testar:
1. Aprovar notícia na triagem → após segundos, processos vinculados aparecem no badge do card
2. Criar pasta + salvar notícia na pasta → notícia aparece na pasta na sidebar
3. Buscar "prisão preventiva" → full-text retorna resultados do conteúdo, não só título
4. `GET /api/cron/noticias?action=digest` → retorna JSON com digest gerado
5. Aba "Notícias" no processo → mostra notícias vinculadas (auto e manuais)
