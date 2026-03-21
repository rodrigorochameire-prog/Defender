# Multi-Comarca — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Adicionar isolamento por comarca ao OMBUDS — tabela `comarcas`, `comarcaId` nas entidades, filtro em 3 camadas para assistidos, filtro simples para processos/radar, e sidebar condicional por features.

**Architecture:** Banco único, isolamento lógico por `comarcaId`. Camada 1 = própria comarca; Camada 2 = toggle RMS (user_settings); Camada 3 = automático via processo na comarca. Toda migração é aditiva — Camaçari nunca quebra.

**Tech Stack:** Drizzle ORM (pgTable), tRPC protectedProcedure, PostgreSQL migration SQL, Next.js sidebar component.

**Spec:** `docs/plans/2026-03-16-expansao-multi-comarca-design.md`

---

## Task 1: Schema `comarcas` — tabela + export

**Files:**
- Create: `src/lib/db/schema/comarcas.ts`
- Modify: `src/lib/db/schema/index.ts`

**Step 1: Criar arquivo de schema**

```typescript
// src/lib/db/schema/comarcas.ts
import {
  pgTable,
  serial,
  varchar,
  boolean,
  jsonb,
  timestamp,
  index,
} from "drizzle-orm/pg-core";

export type ComarcaFeatures = {
  drive: boolean;
  whatsapp: boolean;
  enrichment: boolean;
  calendar_sync: boolean;
};

export const comarcas = pgTable("comarcas", {
  id: serial("id").primaryKey(),
  nome: varchar("nome", { length: 100 }).notNull().unique(),
  regional: varchar("regional", { length: 50 }),
  regiaoMetro: varchar("regiao_metro", { length: 50 }),
  uf: varchar("uf", { length: 2 }).default("BA").notNull(),
  ativo: boolean("ativo").default(true).notNull(),
  features: jsonb("features")
    .$type<ComarcaFeatures>()
    .default({ drive: false, whatsapp: false, enrichment: false, calendar_sync: false })
    .notNull(),
  config: jsonb("config").$type<Record<string, unknown>>().default({}).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("comarcas_regiao_metro_idx").on(table.regiaoMetro),
  index("comarcas_ativo_idx").on(table.ativo),
]);

export type Comarca = typeof comarcas.$inferSelect;
export type InsertComarca = typeof comarcas.$inferInsert;
```

**Step 2: Adicionar export no barrel**

Em `src/lib/db/schema/index.ts`, adicionar após `export * from "./core";`:

```typescript
export * from "./comarcas";
```

**Step 3: Verificar que o TypeScript compila**

```bash
cd /Users/rodrigorochameire/Projetos/Defender
npx tsc --noEmit 2>&1 | head -30
```

Expected: sem erros relacionados a comarcas.

**Step 4: Commit**

```bash
git add src/lib/db/schema/comarcas.ts src/lib/db/schema/index.ts
git commit -m "feat(schema): tabela comarcas com features e regiao_metro"
```

---

## Task 2: Migration SQL — criar tabela + seed + comarcaId nas entidades

**Files:**
- Create: `supabase/migrations/20260320_comarcas_multi_comarca.sql`

**Step 1: Escrever a migration**

```sql
-- supabase/migrations/20260320_comarcas_multi_comarca.sql
-- =============================================
-- MULTI-COMARCA: tabela comarcas + comarcaId em users/assistidos/processos
-- Migração aditiva — Camaçari não pode quebrar.
-- =============================================

BEGIN;

-- 1. Criar tabela comarcas
CREATE TABLE IF NOT EXISTS comarcas (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(100) NOT NULL UNIQUE,
  regional VARCHAR(50),
  regiao_metro VARCHAR(50),
  uf VARCHAR(2) NOT NULL DEFAULT 'BA',
  ativo BOOLEAN NOT NULL DEFAULT true,
  features JSONB NOT NULL DEFAULT '{"drive":false,"whatsapp":false,"enrichment":false,"calendar_sync":false}',
  config JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS comarcas_regiao_metro_idx ON comarcas(regiao_metro);
CREATE INDEX IF NOT EXISTS comarcas_ativo_idx ON comarcas(ativo);

-- 2. Seed: Camaçari (id=1) com todas as features habilitadas
INSERT INTO comarcas (nome, regional, regiao_metro, features) VALUES
  ('Camaçari',               '7ª Regional', 'RMS', '{"drive":true,"whatsapp":true,"enrichment":true,"calendar_sync":true}'),
  ('Salvador',               '1ª Regional', 'RMS', '{"drive":false,"whatsapp":false,"enrichment":false,"calendar_sync":false}'),
  ('Lauro de Freitas',       '7ª Regional', 'RMS', '{"drive":false,"whatsapp":false,"enrichment":false,"calendar_sync":false}'),
  ('Simões Filho',           '7ª Regional', 'RMS', '{"drive":false,"whatsapp":false,"enrichment":false,"calendar_sync":false}'),
  ('Dias d''Ávila',          '7ª Regional', 'RMS', '{"drive":false,"whatsapp":false,"enrichment":false,"calendar_sync":false}'),
  ('Candeias',               '7ª Regional', 'RMS', '{"drive":false,"whatsapp":false,"enrichment":false,"calendar_sync":false}'),
  ('São Francisco do Conde', '7ª Regional', 'RMS', '{"drive":false,"whatsapp":false,"enrichment":false,"calendar_sync":false}'),
  ('Madre de Deus',          '7ª Regional', 'RMS', '{"drive":false,"whatsapp":false,"enrichment":false,"calendar_sync":false}'),
  ('São Sebastião do Passé', '7ª Regional', 'RMS', '{"drive":false,"whatsapp":false,"enrichment":false,"calendar_sync":false}')
ON CONFLICT (nome) DO NOTHING;

-- 3. Adicionar comarcaId em users (nullable → popular → default)
ALTER TABLE users ADD COLUMN IF NOT EXISTS comarca_id INTEGER REFERENCES comarcas(id);
UPDATE users SET comarca_id = (SELECT id FROM comarcas WHERE nome = 'Camaçari') WHERE comarca_id IS NULL;
ALTER TABLE users ALTER COLUMN comarca_id SET DEFAULT (SELECT id FROM comarcas WHERE nome = 'Camaçari');
CREATE INDEX IF NOT EXISTS users_comarca_id_idx ON users(comarca_id);

-- 4. Adicionar comarcaId em assistidos (nullable → popular → default)
ALTER TABLE assistidos ADD COLUMN IF NOT EXISTS comarca_id INTEGER REFERENCES comarcas(id);
UPDATE assistidos SET comarca_id = (SELECT id FROM comarcas WHERE nome = 'Camaçari') WHERE comarca_id IS NULL;
ALTER TABLE assistidos ALTER COLUMN comarca_id SET DEFAULT (SELECT id FROM comarcas WHERE nome = 'Camaçari');
CREATE INDEX IF NOT EXISTS assistidos_comarca_id_idx ON assistidos(comarca_id);

-- 5. Adicionar comarcaId em processos (o campo comarca varchar já existe, mantemos ele)
ALTER TABLE processos ADD COLUMN IF NOT EXISTS comarca_id INTEGER REFERENCES comarcas(id);
-- Popular: usar o campo comarca varchar existente como guia
UPDATE processos SET comarca_id = c.id
  FROM comarcas c WHERE lower(processos.comarca) = lower(c.nome) AND processos.comarca_id IS NULL;
-- Processos sem match → Camaçari
UPDATE processos SET comarca_id = (SELECT id FROM comarcas WHERE nome = 'Camaçari') WHERE comarca_id IS NULL;
ALTER TABLE processos ALTER COLUMN comarca_id SET DEFAULT (SELECT id FROM comarcas WHERE nome = 'Camaçari');
CREATE INDEX IF NOT EXISTS processos_comarca_id_idx ON processos(comarca_id);

-- 6. RLS: service_role full access em comarcas
ALTER TABLE comarcas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_role_full_access" ON comarcas;
CREATE POLICY "service_role_full_access" ON comarcas FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "postgres_full_access" ON comarcas;
CREATE POLICY "postgres_full_access" ON comarcas FOR ALL TO postgres USING (true) WITH CHECK (true);

COMMIT;
```

**Step 2: Aplicar no Supabase**

```bash
npx supabase db push --local 2>&1 || echo "Se não tiver local, usar Supabase MCP ou dashboard"
```

> Se não tiver Supabase CLI local configurado, aplicar via MCP Supabase (`apply_migration`) ou colar no SQL Editor do dashboard.

**Step 3: Verificar**

```sql
-- No SQL Editor do Supabase, verificar:
SELECT * FROM comarcas ORDER BY id;
SELECT comarca_id, COUNT(*) FROM users GROUP BY comarca_id;
SELECT comarca_id, COUNT(*) FROM assistidos GROUP BY comarca_id;
```

Expected: 9 comarcas criadas; todos os users/assistidos/processos com `comarca_id = 1`.

**Step 4: Commit**

```bash
git add supabase/migrations/20260320_comarcas_multi_comarca.sql
git commit -m "feat(migration): tabela comarcas + comarcaId em users/assistidos/processos"
```

---

## Task 3: Atualizar schema Drizzle — `comarcaId` em users e assistidos

**Files:**
- Modify: `src/lib/db/schema/core.ts`

O Drizzle precisa saber sobre as novas colunas para gerar tipos corretos.

**Step 1: Adicionar `comarcaId` em `users`**

Em `src/lib/db/schema/core.ts`, no `pgTable("users", {...})`:

Após `supervisorId: integer("supervisor_id"),` adicionar:
```typescript
comarcaId: integer("comarca_id").references(() => comarcas.id),
```

E no índice (dentro do array de indexes), após `index("users_comarca_idx").on(table.comarca),`:
```typescript
index("users_comarca_id_idx").on(table.comarcaId),
```

**Step 2: Adicionar `comarcaId` em `assistidos`**

No `pgTable("assistidos", {...})`, após `deletedAt: timestamp("deleted_at"),` adicionar:
```typescript
comarcaId: integer("comarca_id").references(() => comarcas.id),
```

E no array de indexes do assistidos (ver se já existe índice para adicionar junto):
```typescript
index("assistidos_comarca_id_idx").on(table.comarcaId),
```

**Step 3: Adicionar `comarcaId` em `processos`**

No `pgTable("processos", {...})` (está em core.ts, por volta da linha 148), após `comarca: varchar("comarca", { length: 100 }),` adicionar:
```typescript
comarcaId: integer("comarca_id").references(() => comarcas.id),
```

E no array de indexes:
```typescript
index("processos_comarca_id_idx").on(table.comarcaId),
```

> IMPORTANTE: O import de `comarcas` precisa existir. Como `comarcas.ts` é importado no barrel, mas `core.ts` não pode importar do barrel (circular). Usar import direto:
> Adicionar no topo de `core.ts`:
> ```typescript
> import { comarcas } from "./comarcas";
> ```

**Step 4: Verificar TypeScript**

```bash
npx tsc --noEmit 2>&1 | head -40
```

Expected: sem erros de tipo.

**Step 5: Commit**

```bash
git add src/lib/db/schema/core.ts
git commit -m "feat(schema): comarcaId em users, assistidos e processos (Drizzle types)"
```

---

## Task 4: `comarca-scope.ts` — helper com filtro de 3 camadas

**Files:**
- Create: `src/lib/trpc/comarca-scope.ts`

**Step 1: Criar o arquivo**

```typescript
// src/lib/trpc/comarca-scope.ts
import { eq, or, inArray, exists, and, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { assistidos, processos, assistidosProcessos, comarcas } from "@/lib/db/schema";
import type { User } from "@/lib/db/schema";

/** IDs das comarcas da Região Metropolitana de Salvador.
 *  Populado dinamicamente — evita hardcode de IDs do seed. */
export async function getRMSComarcaIds(): Promise<number[]> {
  const result = await db
    .select({ id: comarcas.id })
    .from(comarcas)
    .where(eq(comarcas.regiaoMetro, "RMS"));
  return result.map((r) => r.id);
}

/** ID da comarca do usuário. Fallback para 1 (Camaçari) se não configurado. */
export function getComarcaId(user: User): number {
  return (user as any).comarcaId ?? 1;
}

/**
 * Filtro de visibilidade de assistidos em 3 camadas (OR):
 *
 * Camada 1 — comarca própria (sempre)
 * Camada 2 — RMS (opcional, via toggle em user_settings)
 * Camada 3 — assistido com processo tramitando na comarca do defensor (sempre automático)
 */
export async function getAssistidosVisibilityFilter(
  user: User,
  opts?: { verRMS?: boolean }
) {
  const comarcaId = getComarcaId(user);
  const camadas = [];

  // Camada 1: comarca própria
  camadas.push(eq(assistidos.comarcaId, comarcaId));

  // Camada 2: toggle RMS (opcional)
  if (opts?.verRMS) {
    const rmsIds = await getRMSComarcaIds();
    if (rmsIds.length > 0) {
      camadas.push(inArray(assistidos.comarcaId, rmsIds));
    }
  }

  // Camada 3: assistido com processo na comarca do defensor (automático)
  camadas.push(
    exists(
      db
        .select({ one: sql`1` })
        .from(assistidosProcessos)
        .innerJoin(processos, eq(processos.id, assistidosProcessos.processoId))
        .where(
          and(
            eq(assistidosProcessos.assistidoId, assistidos.id),
            eq(processos.comarcaId, comarcaId)
          )
        )
    )
  );

  return or(...camadas)!;
}

/**
 * Filtro simples por comarca — para processos, radar, configs.
 * Recebe a tabela como parâmetro para ser reutilizável.
 */
export function getComarcaFilter<T extends { comarcaId: any }>(
  table: T,
  user: User
) {
  return eq(table.comarcaId, getComarcaId(user));
}
```

**Step 2: Verificar TypeScript**

```bash
npx tsc --noEmit 2>&1 | head -40
```

Expected: sem erros.

**Step 3: Commit**

```bash
git add src/lib/trpc/comarca-scope.ts
git commit -m "feat(trpc): comarca-scope com filtro de visibilidade em 3 camadas"
```

---

## Task 5: Router `comarcas` — `getMinhaComarca` + `listRMS`

**Files:**
- Create: `src/lib/trpc/routers/comarcas.ts`
- Modify: `src/lib/trpc/routers/_app.ts` (ou onde o router raiz está definido)

**Step 1: Encontrar onde os routers são registrados**

```bash
grep -r "assistidosRouter\|processosRouter" /Users/rodrigorochameire/Projetos/Defender/src/lib/trpc/routers/ --include="*.ts" -l
```

Esse arquivo registra todos os routers — adicionar `comarcasRouter` lá também.

**Step 2: Criar o router**

```typescript
// src/lib/trpc/routers/comarcas.ts
import { router, protectedProcedure } from "../init";
import { db } from "@/lib/db";
import { comarcas, users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getComarcaId } from "../comarca-scope";

export const comarcasRouter = router({
  /** Retorna a comarca do usuário logado com suas features */
  getMinhaComarca: protectedProcedure.query(async ({ ctx }) => {
    const comarcaId = getComarcaId(ctx.user);
    const result = await db
      .select()
      .from(comarcas)
      .where(eq(comarcas.id, comarcaId))
      .limit(1);
    return result[0] ?? null;
  }),

  /** Lista comarcas da região metropolitana (para seletor no toggle) */
  listRMS: protectedProcedure.query(async () => {
    return db
      .select({ id: comarcas.id, nome: comarcas.nome, regional: comarcas.regional })
      .from(comarcas)
      .where(eq(comarcas.regiaoMetro, "RMS"))
      .orderBy(comarcas.nome);
  }),
});
```

**Step 3: Registrar no router raiz**

No arquivo que registra todos os routers (geralmente `src/lib/trpc/routers/index.ts` ou `_app.ts`), adicionar:

```typescript
import { comarcasRouter } from "./comarcas";
// ...
comarcas: comarcasRouter,
```

**Step 4: Verificar TypeScript**

```bash
npx tsc --noEmit 2>&1 | head -40
```

**Step 5: Commit**

```bash
git add src/lib/trpc/routers/comarcas.ts src/lib/trpc/routers/[arquivo-raiz].ts
git commit -m "feat(trpc): router comarcas com getMinhaComarca e listRMS"
```

---

## Task 6: Aplicar filtro em `assistidos.list`

**Files:**
- Modify: `src/lib/trpc/routers/assistidos.ts`

O router atual tem comentário `// Assistidos são COMPARTILHADOS - todos os defensores têm acesso`. Vamos substituir isso pelo filtro de 3 camadas.

**Step 1: Adicionar import de comarca-scope**

No topo de `src/lib/trpc/routers/assistidos.ts`, adicionar:
```typescript
import { getAssistidosVisibilityFilter } from "@/lib/trpc/comarca-scope";
import { userSettings } from "@/lib/db/schema";
```

**Step 2: Atualizar o input do `list` para aceitar `verRMS`**

No `z.object({...})` do input do `list`, adicionar:
```typescript
verRMS: z.boolean().optional(),
```

**Step 3: Aplicar o filtro dentro do `.query`**

Substituir o bloco:
```typescript
// Assistidos são compartilhados - não filtrar por workspace
```

Por:
```typescript
// Filtro de visibilidade em 3 camadas (comarca própria + RMS opcional + processo local)
const visibilityFilter = await getAssistidosVisibilityFilter(ctx.user, {
  verRMS: input?.verRMS,
});
conditions.push(visibilityFilter);
```

> ATENÇÃO: O `conditions` já é usado no router. Garantir que `visibilityFilter` é adicionado ANTES do `and(...conditions)` final. Verificar como o `conditions` é montado e inserir o filtro de comarca no início ou como condição separada que é sempre AND-ed.

**Step 4: Verificar TypeScript**

```bash
npx tsc --noEmit 2>&1 | head -40
```

**Step 5: Commit**

```bash
git add src/lib/trpc/routers/assistidos.ts
git commit -m "feat(assistidos): filtro de visibilidade multi-comarca em 3 camadas"
```

---

## Task 7: Aplicar filtro em `processos.list`

**Files:**
- Modify: `src/lib/trpc/routers/processos.ts`

**Step 1: Adicionar import**

```typescript
import { getComarcaId } from "@/lib/trpc/comarca-scope";
import { eq } from "drizzle-orm"; // já deve existir
```

**Step 2: Substituir o bloco vazio `if (!isAdmin) {}`**

O router atual tem:
```typescript
if (!isAdmin) {
}
```

Substituir por:
```typescript
if (!isAdmin) {
  conditions.push(eq(processos.comarcaId, getComarcaId(ctx.user)));
}
```

Admin vê todos os processos (sem filtro de comarca). Defensor vê apenas da sua comarca.

**Step 3: Verificar TypeScript**

```bash
npx tsc --noEmit 2>&1 | head -40
```

**Step 4: Commit**

```bash
git add src/lib/trpc/routers/processos.ts
git commit -m "feat(processos): filtro de comarca na listagem (admins veem tudo)"
```

---

## Task 8: Aplicar filtro no Radar

**Files:**
- Modify: `src/lib/trpc/routers/radar.ts`

**Step 1: Ler o início do radar router para entender a estrutura**

```bash
head -60 /Users/rodrigorochameire/Projetos/Defender/src/lib/trpc/routers/radar.ts
```

**Step 2: Adicionar import de comarca-scope**

```typescript
import { getComarcaId } from "@/lib/trpc/comarca-scope";
```

**Step 3: Encontrar onde `conditions` é construído no router `list`**

Buscar pelo bloco que monta `whereClause`. Adicionar no início da construção de conditions:

```typescript
// Filtro por comarca — defensor vê apenas radar da sua comarca
if (ctx.user.role !== "admin") {
  conditions.push(eq(radarNoticias.comarcaId, getComarcaId(ctx.user)));
}
```

> VERIFICAR: `radarNoticias` tem campo `comarcaId`? Rodar:
> ```bash
> grep -n "comarcaId\|comarca_id" src/lib/db/schema/radar.ts
> ```
> Se não tiver, essa task pode ser adiada até que a tabela radar seja migrada.

**Step 4: Se `radarNoticias` não tem `comarcaId` ainda**

Criar migration adicional:
```sql
ALTER TABLE radar_noticias ADD COLUMN IF NOT EXISTS comarca_id INTEGER REFERENCES comarcas(id);
UPDATE radar_noticias SET comarca_id = (SELECT id FROM comarcas WHERE nome = 'Camaçari') WHERE comarca_id IS NULL;
CREATE INDEX IF NOT EXISTS radar_noticias_comarca_id_idx ON radar_noticias(comarca_id);
```

E adicionar `comarcaId` no schema Drizzle `src/lib/db/schema/radar.ts`.

**Step 5: Commit**

```bash
git add src/lib/trpc/routers/radar.ts supabase/migrations/*.sql src/lib/db/schema/radar.ts
git commit -m "feat(radar): filtro de comarca na listagem"
```

---

## Task 9: Toggle "Ver RMS" em `user_settings` — router + hook

**Files:**
- Modify: `src/lib/trpc/routers/settings.ts` (ou criar se não existir)
- Create: `src/hooks/use-comarca-visibilidade.ts`

**Step 1: Encontrar o router de settings**

```bash
ls /Users/rodrigorochameire/Projetos/Defender/src/lib/trpc/routers/ | grep -i setting
```

**Step 2: Adicionar procedimento para salvar/ler preferência de comarca**

No router de settings existente (ou novo), adicionar:

```typescript
getComarcaVisibilidade: protectedProcedure.query(async ({ ctx }) => {
  const result = await db
    .select({ settings: userSettings.settings })
    .from(userSettings)
    .where(eq(userSettings.userId, ctx.user.id))
    .limit(1);

  const settings = (result[0]?.settings ?? {}) as Record<string, any>;
  return {
    verRMS: settings?.comarcaVisibilidade?.verRMS ?? false,
  };
}),

setComarcaVisibilidade: protectedProcedure
  .input(z.object({ verRMS: z.boolean() }))
  .mutation(async ({ ctx, input }) => {
    // Upsert em user_settings
    await db
      .insert(userSettings)
      .values({
        userId: ctx.user.id,
        settings: { comarcaVisibilidade: { verRMS: input.verRMS } },
      })
      .onConflictDoUpdate({
        target: userSettings.userId,
        set: {
          settings: sql`user_settings.settings || '{"comarcaVisibilidade": ${JSON.stringify({ verRMS: input.verRMS })}}'::jsonb`,
          updatedAt: new Date(),
        },
      });
    return { ok: true };
  }),
```

**Step 3: Criar hook cliente**

```typescript
// src/hooks/use-comarca-visibilidade.ts
"use client";

import { trpc } from "@/lib/trpc/client";

export function useComarcaVisibilidade() {
  const utils = trpc.useUtils();
  const { data } = trpc.settings.getComarcaVisibilidade.useQuery();
  const mutation = trpc.settings.setComarcaVisibilidade.useMutation({
    onSuccess: () => {
      utils.settings.getComarcaVisibilidade.invalidate();
      utils.assistidos.list.invalidate();
    },
  });

  return {
    verRMS: data?.verRMS ?? false,
    toggle: (verRMS: boolean) => mutation.mutate({ verRMS }),
    isLoading: mutation.isPending,
  };
}
```

**Step 4: Commit**

```bash
git add src/lib/trpc/routers/ src/hooks/use-comarca-visibilidade.ts
git commit -m "feat(settings): toggle verRMS salvo em user_settings + hook"
```

---

## Task 10: Toggle "Ver RMS" na UI de Assistidos

**Files:**
- Modify: `src/app/(dashboard)/admin/assistidos/page.tsx`
- Modify: `src/app/(dashboard)/admin/assistidos/_components/filter-section-assistidos.tsx` (se existir)

**Step 1: Ler a página atual de assistidos**

```bash
head -80 /Users/rodrigorochameire/Projetos/Defender/src/app/(dashboard)/admin/assistidos/page.tsx
```

**Step 2: Adicionar o toggle**

Na página de assistidos, importar o hook e passar `verRMS` para o tRPC query:

```typescript
import { useComarcaVisibilidade } from "@/hooks/use-comarca-visibilidade";

// Dentro do componente:
const { verRMS, toggle } = useComarcaVisibilidade();

const { data } = trpc.assistidos.list.useQuery({
  search,
  statusPrisional,
  atribuicaoPrimaria,
  verRMS,  // ← novo
});
```

**Step 3: Adicionar o botão de toggle próximo aos filtros**

```tsx
<button
  onClick={() => toggle(!verRMS)}
  className={cn(
    "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border transition-colors",
    verRMS
      ? "bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-950/30 dark:border-emerald-800 dark:text-emerald-400"
      : "border-zinc-200 text-zinc-500 hover:border-zinc-300 dark:border-zinc-700 dark:text-zinc-400"
  )}
>
  <MapPin className="h-3.5 w-3.5" />
  {verRMS ? "Região Metro" : "Só Camaçari"}
</button>
```

> Adicionar `MapPin` nos imports do Lucide.

**Step 4: Badge de comarca na listagem**

Para assistidos que vieram via Camada 2 ou 3 (outras comarcas), exibir badge com nome da comarca.
O router `assistidos.list` já retorna os dados do assistido. Adicionar `comarcaNome` no select:

Em `assistidos.ts` router, no select da query principal, incluir join com comarcas:
```typescript
// join com comarcas para obter o nome
comarcaNome: comarcas.nome,
```
E adicionar `.leftJoin(comarcas, eq(assistidos.comarcaId, comarcas.id))`.

Na listagem, exibir badge se `comarcaNome !== "Camaçari"` (ou se `comarcaId !== user.comarcaId`).

**Step 5: Verificar TypeScript + build**

```bash
npx tsc --noEmit 2>&1 | head -40
npm run build 2>&1 | tail -20
```

**Step 6: Commit**

```bash
git add src/app/(dashboard)/admin/assistidos/
git commit -m "feat(assistidos-ui): toggle Ver RMS + badge de comarca de origem"
```

---

## Task 11: Sidebar condicional por `comarca.features`

**Files:**
- Modify: `src/components/layouts/admin-sidebar.tsx`

**Step 1: Adicionar query de comarca no sidebar**

No componente `AdminSidebar` (já tem `trpc` importado), adicionar:

```typescript
const { data: minhaComarca } = trpc.comarcas.getMinhaComarca.useQuery();
const features = minhaComarca?.features ?? {
  drive: false, whatsapp: false, enrichment: false, calendar_sync: false
};
```

**Step 2: Tornar Drive e WhatsApp condicionais**

No `MAIN_NAV` (linhas ~60-66 do sidebar), Drive e WhatsApp são itens fixos. Convertê-los para renderização condicional — ao invés de mudar o array estático, filtrar na renderização:

Encontrar onde `MAIN_NAV` é mapeado/renderizado. Envolver os itens Drive e WhatsApp:

```tsx
{features.drive && (
  <SidebarMenuItem key="drive">
    {/* item Drive existente */}
  </SidebarMenuItem>
)}
{features.whatsapp && (
  <SidebarMenuItem key="whatsapp">
    {/* item WhatsApp existente */}
  </SidebarMenuItem>
)}
```

**Step 3: Verificar visualmente**

```bash
npm run dev
```

Abrir o app e confirmar que Drive e WhatsApp aparecem (comarca Camaçari tem features=true). Para testar sem features, temporariamente mudar o valor retornado em `getMinhaComarca` para features=false.

**Step 4: Commit**

```bash
git add src/components/layouts/admin-sidebar.tsx
git commit -m "feat(sidebar): itens Drive e WhatsApp condicionais por comarca.features"
```

---

## Task 12: Tela de convite com comarca pré-definida (Fase 2 - opcional agora)

**Files:**
- Modificar tela de convite existente (procurar em `src/app/(dashboard)/admin/`)

**Step 1: Encontrar a tela de convite**

```bash
grep -r "convite\|invite\|invitation" /Users/rodrigorochameire/Projetos/Defender/src/app --include="*.tsx" -l
```

**Step 2: Adicionar campo `comarcaId` no formulário de convite**

No formulário de criação de convite, adicionar um select de comarca:

```tsx
import { trpc } from "@/lib/trpc/client";

const { data: comarcasRMS } = trpc.comarcas.listRMS.useQuery();

// No formulário:
<select name="comarcaId">
  {comarcasRMS?.map(c => (
    <option key={c.id} value={c.id}>{c.nome}</option>
  ))}
</select>
```

**Step 3: No backend de criação de usuário via convite**

Ao criar o usuário, setar `comarcaId` com o valor vindo do convite.

**Step 4: Commit**

```bash
git commit -m "feat(convite): comarca pré-definida ao convidar novo defensor"
```

---

## Ordem de Execução Recomendada

```
Task 1  → Task 2 (aplicar migration) → Task 3 → Task 4 → Task 5
→ Task 6 → Task 7 → Task 8 → Task 9 → Task 10 → Task 11 → Task 12
```

Tasks 1, 2, 3 são sequenciais (schema antes de código).
Tasks 6, 7, 8 podem ir em paralelo após Task 4.
Tasks 9 e 10 são uma unidade (toggle + UI).
Task 11 independente após Task 5.
Task 12 independente, pode ficar para depois.

## Verificação Final

Após todas as tasks:

1. Usuário logado como defensor de Camaçari → vê assistidos de Camaçari
2. Assistido de Salvador com processo em Camaçari → aparece automaticamente na lista
3. Toggle "Ver RMS" → expande para todos os municípios da RMS
4. Defensor de Salvador (quando criado via convite) → não vê assistidos de Camaçari
5. Drive e WhatsApp aparecem para Camaçari; somem se features=false
6. Admin → vê tudo (sem filtro)
