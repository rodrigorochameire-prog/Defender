# Hierarquia Assistido → Caso → Processo — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reformar a UX do OMBUDS pra expor `casos` como nível intermediário entre `assistidos` e `processos`, eliminar duplicação de abas, aplicar condicionais por `area`, e migrar cronologia pro nível do caso (read-only agregado).

**Architecture:** 3 níveis hierárquicos (Assistido → Caso → Processo). Rotas Next.js App Router aninhadas com layouts separados por nível. Abas do Nível 2 condicionais via hook `useVisibleCasoTabs(area)`. Legado (`/admin/processos/[id]`) redireciona pra nested URL preservando deep-link.

**Tech Stack:** Next.js 15 App Router · tRPC · Drizzle · React 19 · Tailwind · Radix UI · Vitest + RTL + happy-dom.

**Spec de referência:** `docs/plans/2026-04-20-hierarquia-assistido-caso-processo-design.md`

**Convenções estabelecidas:**
- `ctx.user.workspaceId ?? 1`, `ctx.user.id`
- Schema TS em `src/lib/db/schema/<modulo>.ts` + barrel `index.ts`
- tRPC imports: `router`, `protectedProcedure` de `"../init"` (routers) ou `"@/lib/trpc/init"` (tests)
- `db` de `@/lib/db`
- appRouter em `src/lib/trpc/routers/index.ts`
- Apply migrations via temp node script + `rm` (nunca drizzle-kit push)

---

## File Structure

```
drizzle/
└── 0039_processos_is_referencia.sql                   [new — coluna boolean + index]

src/lib/db/schema/core.ts                              [modify — add isReferencia a processos]

src/lib/trpc/routers/
├── casos.ts                                           [modify — +getCasosDoAssistido, +getCasoById, +setReferenciaProcesso se não existir]
└── cronologia.ts                                      [modify — +getCronologiaDoCaso]

src/lib/hierarquia/
├── infer-caso-area.ts                                 [new pure helper]
└── visible-caso-tabs.ts                               [new config per area]

src/hooks/
└── use-visible-caso-tabs.ts                           [new hook]

src/components/hierarquia/
├── caso-switcher.tsx                                  [new]
├── situacao-atual-block.tsx                           [new — X-δ]
└── index.ts                                           [new]

src/app/(dashboard)/admin/assistidos/[id]/
├── layout.tsx                                         [new AssistidoLayout]
├── page.tsx                                           [refactor — de 1058 → ~200 linhas, auto-redirect pra caso]
├── caso/[casoId]/
│   ├── layout.tsx                                     [new CasoLayout]
│   ├── page.tsx                                       [new caso hub — aba "Geral" default]
│   ├── [aba]/page.tsx                                 [new — render por aba]
│   ├── processo/[procId]/
│   │   ├── layout.tsx                                 [new ProcessoTecnicoLayout]
│   │   └── page.tsx                                   [new — aba Dados CNJ default]
│   └── _components/
│       ├── tab-demandas.tsx                           [migrated from assistidos/[id]]
│       ├── tab-oficios.tsx                            [migrated]
│       ├── tab-atendimentos.tsx                       [migrated]
│       ├── tab-investigacao.tsx                       [migrated]
│       ├── tab-audiencias.tsx                         [unified single-source]
│       ├── tab-documentos.tsx                         [unified]
│       ├── tab-midias.tsx                             [unified]
│       ├── tab-pessoas.tsx                            [migrated from processos; agrega cross-processo]
│       ├── tab-cronologia.tsx                         [X-δ read-only agregada]
│       ├── tab-delitos.tsx                            [migrated + conditional]
│       ├── tab-institutos.tsx                         [conditional]
│       ├── tab-mpu.tsx                                [conditional VVD]
│       ├── tab-execucao-penal.tsx                     [conditional EXECUCAO_PENAL]
│       └── tab-atos-infracionais.tsx                  [conditional INFANCIA_JUVENTUDE]

src/app/(dashboard)/admin/processos/[id]/
├── page.tsx                                           [refactor — redirect default + ?raw=1 standalone]

__tests__/
├── unit/
│   ├── infer-caso-area.test.ts                        [new — 6 testes]
│   └── visible-caso-tabs.test.ts                      [new — 8 testes]
├── trpc/
│   ├── casos-router.test.ts                           [modify — +getCasosDoAssistido, +getCasoById]
│   └── cronologia-router.test.ts                      [modify — +getCronologiaDoCaso]
└── components/hierarquia/
    ├── caso-switcher.test.tsx                         [new — 3 testes]
    └── situacao-atual-block.test.tsx                  [new — 3 testes]
```

---

# Sub-Fase X-α · Expor casos como entidade primária (Tasks 1-5)

## Task 1: Migration `processos.is_referencia` + schema TS

**Files:**
- Create: `drizzle/0039_processos_is_referencia.sql`
- Modify: `src/lib/db/schema/core.ts`

- [ ] **Step 1: Verify next migration number**

```
ls -1 /Users/rodrigorochameire/projetos/Defender/drizzle/*.sql | tail -3
```

Expected last: `0038_cronologia_fundacao.sql`. Next: **0039**.

- [ ] **Step 2: Create SQL**

`drizzle/0039_processos_is_referencia.sql`:

```sql
-- Processo referência de um caso (default false, user marca manualmente no Nível 3)
ALTER TABLE processos ADD COLUMN IF NOT EXISTS is_referencia boolean NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS processos_caso_referencia_idx ON processos(caso_id) WHERE is_referencia = true;
```

- [ ] **Step 3: Apply via temp script**

Create `/Users/rodrigorochameire/projetos/Defender/apply-is-referencia.mjs`:

```js
import { readFileSync } from "node:fs";
import postgres from "postgres";
import * as dotenv from "dotenv";
dotenv.config({ path: "/Users/rodrigorochameire/projetos/Defender/.env.local" });

const sql = postgres(process.env.DATABASE_URL, { max: 1 });
const content = readFileSync(process.argv[2], "utf-8");

for (const s of content.split(/;\s*$/m).map(x => x.trim()).filter(Boolean)) {
  console.log("Exec:", s.slice(0, 80));
  await sql.unsafe(s);
}

const check = await sql`
  SELECT column_name FROM information_schema.columns
  WHERE table_name = 'processos' AND column_name = 'is_referencia'
`;
console.log("is_referencia present:", check.length === 1);

await sql.end();
```

Run:
```
cd /Users/rodrigorochameire/projetos/Defender && node apply-is-referencia.mjs drizzle/0039_processos_is_referencia.sql
```

Expected: `is_referencia present: true`. Delete: `rm /Users/rodrigorochameire/projetos/Defender/apply-is-referencia.mjs`.

- [ ] **Step 4: Add to schema TS**

Open `src/lib/db/schema/core.ts`, find `export const processos = pgTable(...)`. Add inside the columns object:

```ts
isReferencia: boolean("is_referencia").notNull().default(false),
```

If `boolean` is not imported: `import { ..., boolean } from "drizzle-orm/pg-core";`.

- [ ] **Step 5: Typecheck**

```
cd /Users/rodrigorochameire/projetos/Defender && npm run typecheck 2>&1 | tail -20
```

Expected: 0 novos erros.

- [ ] **Step 6: Commit**

```
cd /Users/rodrigorochameire/projetos/Defender
git add drizzle/0039_processos_is_referencia.sql src/lib/db/schema/core.ts
git commit -m "feat(hierarquia): +processos.is_referencia"
```

---

## Task 2: tRPC — `getCasosDoAssistido` + `getCasoById` + `setReferenciaProcesso`

**Files:**
- Modify: `src/lib/trpc/routers/casos.ts` (or create se não existir)
- Modify: `__tests__/trpc/casos-router.test.ts` (criar se ausente)

- [ ] **Step 1: Inspect existing router**

```
grep -n "casosRouter\|casos:" /Users/rodrigorochameire/projetos/Defender/src/lib/trpc/routers/index.ts
ls /Users/rodrigorochameire/projetos/Defender/src/lib/trpc/routers/casos.ts 2>&1
head -40 /Users/rodrigorochameire/projetos/Defender/src/lib/trpc/routers/casos.ts 2>&1
```

Note: se `casos.ts` não existir ou não estiver registrado em appRouter, criar minimal router + registrar como `casos` (siga padrão de `lugares.ts` ou `cronologia.ts`).

- [ ] **Step 2: Add failing tests**

Append/create `__tests__/trpc/casos-router.test.ts`:

```ts
// copy helper pattern from __tests__/trpc/cronologia-router.test.ts (makeUser, mkCtx, createCaller)
import { describe, it, expect } from "vitest";
import { db } from "@/lib/db";
import { eq } from "drizzle-orm";
import { casos, processos, assistidos, users } from "@/lib/db/schema";

describe("casos.getCasosDoAssistido", { timeout: 30000 }, () => {
  it("retorna casos do assistido ordenados", async () => {
    const user = await makeUser();
    try {
      const caller = createCaller(mkCtx(user));
      const [ass] = await db.insert(assistidos).values({
        workspaceId: user.workspaceId ?? 1,
        nome: `Test Assist ${Date.now()}`,
      }).returning({ id: assistidos.id });
      const [c1] = await db.insert(casos).values({
        assistidoId: ass.id, workspaceId: user.workspaceId ?? 1,
        titulo: "Caso A",
      }).returning({ id: casos.id });
      const [c2] = await db.insert(casos).values({
        assistidoId: ass.id, workspaceId: user.workspaceId ?? 1,
        titulo: "Caso B",
      }).returning({ id: casos.id });
      try {
        const lista = await caller.casos.getCasosDoAssistido({ assistidoId: ass.id });
        const ids = lista.map(c => c.id);
        expect(ids).toContain(c1.id);
        expect(ids).toContain(c2.id);
      } finally {
        await db.delete(casos).where(eq(casos.assistidoId, ass.id));
        await db.delete(assistidos).where(eq(assistidos.id, ass.id));
      }
    } finally {
      await db.delete(users).where(eq(users.id, user.id));
    }
  });
});

describe("casos.getCasoById + ACL", { timeout: 30000 }, () => {
  it("retorna caso do workspace", async () => {
    const user = await makeUser();
    try {
      const caller = createCaller(mkCtx(user));
      const [c] = await db.insert(casos).values({
        workspaceId: user.workspaceId ?? 1, titulo: "X",
      }).returning({ id: casos.id });
      try {
        const got = await caller.casos.getCasoById({ id: c.id });
        expect(got?.titulo).toBe("X");
      } finally {
        await db.delete(casos).where(eq(casos.id, c.id));
      }
    } finally {
      await db.delete(users).where(eq(users.id, user.id));
    }
  });

  it("ACL: caso de outro workspace retorna null", async () => {
    const user = await makeUser();
    try {
      const caller = createCaller(mkCtx(user));
      const [c] = await db.insert(casos).values({
        workspaceId: 999999, titulo: "outro ws",
      }).returning({ id: casos.id });
      try {
        const got = await caller.casos.getCasoById({ id: c.id });
        expect(got).toBeNull();
      } finally {
        await db.delete(casos).where(eq(casos.id, c.id));
      }
    } finally {
      await db.delete(users).where(eq(users.id, user.id));
    }
  });
});

describe("casos.setReferenciaProcesso", { timeout: 30000 }, () => {
  it("marca processo como referência e desmarca outros do mesmo caso", async () => {
    const user = await makeUser();
    try {
      const caller = createCaller(mkCtx(user));
      const [c] = await db.insert(casos).values({
        workspaceId: user.workspaceId ?? 1, titulo: "Ref",
      }).returning({ id: casos.id });
      const [p1] = await db.insert(processos).values({
        workspaceId: user.workspaceId ?? 1, casoId: c.id, area: "JURI",
      }).returning({ id: processos.id });
      const [p2] = await db.insert(processos).values({
        workspaceId: user.workspaceId ?? 1, casoId: c.id, area: "JURI",
      }).returning({ id: processos.id });
      try {
        await caller.casos.setReferenciaProcesso({ processoId: p1.id });
        let row = await db.select({ ref: processos.isReferencia }).from(processos).where(eq(processos.id, p1.id));
        expect(row[0].ref).toBe(true);
        row = await db.select({ ref: processos.isReferencia }).from(processos).where(eq(processos.id, p2.id));
        expect(row[0].ref).toBe(false);

        await caller.casos.setReferenciaProcesso({ processoId: p2.id });
        row = await db.select({ ref: processos.isReferencia }).from(processos).where(eq(processos.id, p1.id));
        expect(row[0].ref).toBe(false);
        row = await db.select({ ref: processos.isReferencia }).from(processos).where(eq(processos.id, p2.id));
        expect(row[0].ref).toBe(true);
      } finally {
        await db.delete(processos).where(eq(processos.casoId, c.id));
        await db.delete(casos).where(eq(casos.id, c.id));
      }
    } finally {
      await db.delete(users).where(eq(users.id, user.id));
    }
  });
});
```

- [ ] **Step 3: Run FAIL**

```
cd /Users/rodrigorochameire/projetos/Defender && npm run test __tests__/trpc/casos-router.test.ts 2>&1 | tail -30
```

- [ ] **Step 4: Add/update procedures**

Em `src/lib/trpc/routers/casos.ts`, adicionar ao `router({...})` (ou criar o router se não existir — seguir padrão `cronologia.ts`):

```ts
  getCasosDoAssistido: protectedProcedure
    .input(z.object({ assistidoId: z.number() }))
    .query(async ({ input, ctx }) => {
      const workspaceId = ctx.user.workspaceId ?? 1;
      return await db.select().from(casos)
        .where(and(
          eq(casos.assistidoId, input.assistidoId),
          eq(casos.workspaceId, workspaceId),
          isNull(casos.deletedAt),
        ))
        .orderBy(desc(casos.updatedAt));
    }),

  getCasoById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input, ctx }) => {
      const workspaceId = ctx.user.workspaceId ?? 1;
      const rows = await db.select().from(casos)
        .where(and(eq(casos.id, input.id), eq(casos.workspaceId, workspaceId)))
        .limit(1);
      return rows[0] ?? null;
    }),

  setReferenciaProcesso: protectedProcedure
    .input(z.object({ processoId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const workspaceId = ctx.user.workspaceId ?? 1;
      const [proc] = await db.select({ id: processos.id, casoId: processos.casoId })
        .from(processos)
        .where(and(eq(processos.id, input.processoId), eq(processos.workspaceId, workspaceId)))
        .limit(1);
      if (!proc || !proc.casoId) throw new Error("Processo não encontrado ou sem caso");
      // Desmarca outros do mesmo caso, marca este
      await db.update(processos)
        .set({ isReferencia: false })
        .where(eq(processos.casoId, proc.casoId));
      await db.update(processos)
        .set({ isReferencia: true })
        .where(eq(processos.id, input.processoId));
      return { ok: true };
    }),
```

Imports necessários: `eq`, `and`, `isNull`, `desc` from drizzle-orm; `casos`, `processos` from schema.

- [ ] **Step 5: Registrar router em appRouter (se ainda não)**

```
grep -n "casos:" /Users/rodrigorochameire/projetos/Defender/src/lib/trpc/routers/index.ts
```

Se não aparecer, adicionar `casos: casosRouter` + import.

- [ ] **Step 6: Run PASS**

Expected: 4 tests pass (getCasosDoAssistido, getCasoById, ACL, setReferenciaProcesso).

- [ ] **Step 7: Commit**

```
cd /Users/rodrigorochameire/projetos/Defender
git add src/lib/trpc/routers/casos.ts src/lib/trpc/routers/index.ts __tests__/trpc/casos-router.test.ts
git commit -m "feat(hierarquia): tRPC getCasosDoAssistido + getCasoById + setReferenciaProcesso"
```

---

## Task 3: `AssistidoLayout` + `CasoLayout` + route scaffolding

**Files:**
- Create: `src/app/(dashboard)/admin/assistidos/[id]/layout.tsx`
- Create: `src/app/(dashboard)/admin/assistidos/[id]/caso/[casoId]/layout.tsx`
- Create: `src/app/(dashboard)/admin/assistidos/[id]/caso/[casoId]/page.tsx` (placeholder)

- [ ] **Step 1: AssistidoLayout**

Create `src/app/(dashboard)/admin/assistidos/[id]/layout.tsx`:

```tsx
"use client";

import { useParams, usePathname } from "next/navigation";
import Link from "next/link";
import { trpc } from "@/lib/trpc/client";
import { User, Briefcase, Clock, Newspaper } from "lucide-react";
import { cn } from "@/lib/utils";

const NIVEL_1_TABS = [
  { key: "geral",    label: "Geral",    icon: User,       path: "" },
  { key: "casos",    label: "Casos",    icon: Briefcase,  path: "casos" },
  { key: "timeline", label: "Timeline", icon: Clock,      path: "timeline" },
  { key: "radar",    label: "Radar",    icon: Newspaper,  path: "radar" },
] as const;

export default function AssistidoLayout({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const pathname = usePathname();
  const id = Number(params?.id);

  const { data: assistido } = trpc.assistidos.getById.useQuery({ id }, { enabled: !isNaN(id) });

  // Active tab baseada no pathname
  const base = `/admin/assistidos/${id}`;
  const sub = pathname.replace(base, "").replace(/^\//, "").split("/")[0];
  const activeKey = sub === "" || sub === "caso" ? "geral" : sub;

  return (
    <div className="flex flex-col h-full">
      {/* Header compacto */}
      <header className="border-b px-6 py-3 bg-white dark:bg-neutral-950">
        <h1 className="text-lg font-semibold truncate">{assistido?.nome ?? "Carregando…"}</h1>
        <div className="text-xs text-neutral-500 mt-0.5">
          {assistido?.cpf && <span className="font-mono">{assistido.cpf}</span>}
          {assistido?.telefone && <span className="ml-3">{assistido.telefone}</span>}
        </div>
      </header>

      {/* Tab-bar Nível 1 */}
      <nav className="border-b px-6 flex gap-1 bg-white dark:bg-neutral-950">
        {NIVEL_1_TABS.map((t) => {
          const Icon = t.icon;
          const href = t.path ? `${base}/${t.path}` : base;
          const isActive = activeKey === t.key;
          return (
            <Link
              key={t.key}
              href={href}
              className={cn(
                "flex items-center gap-1 px-3 py-2 text-xs border-b-2",
                isActive ? "border-emerald-500 text-emerald-700 font-medium" : "border-transparent text-neutral-500 hover:text-neutral-700",
              )}
            >
              <Icon className="w-3 h-3" />
              {t.label}
            </Link>
          );
        })}
      </nav>

      {/* Children — hub ou caso/... */}
      <div className="flex-1 overflow-auto">{children}</div>
    </div>
  );
}
```

- [ ] **Step 2: CasoLayout (nested)**

Create `src/app/(dashboard)/admin/assistidos/[id]/caso/[casoId]/layout.tsx`:

```tsx
"use client";

import { useParams, usePathname } from "next/navigation";
import Link from "next/link";
import { trpc } from "@/lib/trpc/client";
import { CaseSwitcher } from "@/components/hierarquia/caso-switcher";
import { useVisibleCasoTabs } from "@/hooks/use-visible-caso-tabs";
import { cn } from "@/lib/utils";

export default function CasoLayout({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const pathname = usePathname();
  const assistidoId = Number(params?.id);
  const casoId = Number(params?.casoId);

  const { data: caso } = trpc.casos.getCasoById.useQuery({ id: casoId }, { enabled: !isNaN(casoId) });
  const { data: processosDoCaso = [] } = trpc.processos.listByCaso.useQuery(
    { casoId }, { enabled: !isNaN(casoId) }
  );

  const tabs = useVisibleCasoTabs(processosDoCaso);

  const base = `/admin/assistidos/${assistidoId}/caso/${casoId}`;
  const sub = pathname.replace(base, "").replace(/^\//, "").split("/")[0];
  const activeKey = sub === "" ? "geral" : sub;

  return (
    <div className="flex flex-col">
      {/* Sub-header com CaseSwitcher */}
      <div className="border-b px-6 py-2 bg-neutral-50 dark:bg-neutral-900/50 flex items-center gap-3">
        <CaseSwitcher assistidoId={assistidoId} activeCasoId={casoId} />
        {caso && (
          <>
            <span className="text-xs text-neutral-500">·</span>
            <span className="text-xs">{caso.status}</span>
            {caso.fase && <span className="text-[10px] px-1.5 py-0.5 rounded bg-neutral-200 dark:bg-neutral-800">{caso.fase}</span>}
          </>
        )}
      </div>

      {/* Tab-bar Nível 2 */}
      <nav className="border-b px-6 flex gap-1 bg-white dark:bg-neutral-950 overflow-x-auto">
        {tabs.map((t) => {
          const href = t.key === "geral" ? base : `${base}/${t.key}`;
          const isActive = activeKey === t.key;
          return (
            <Link
              key={t.key}
              href={href}
              className={cn(
                "flex items-center gap-1 px-3 py-1.5 text-xs border-b-2 whitespace-nowrap",
                isActive ? "border-emerald-500 text-emerald-700 font-medium" : "border-transparent text-neutral-500 hover:text-neutral-700",
              )}
            >
              {t.label}
            </Link>
          );
        })}
      </nav>

      <div className="flex-1 overflow-auto">{children}</div>
    </div>
  );
}
```

**Nota:** `trpc.processos.listByCaso` pode não existir ainda. Se não existir, adicione em `src/lib/trpc/routers/processos.ts` (segue padrão simples: query por `casoId`). Se já existir, reuse.

**Nota 2:** Se `useVisibleCasoTabs` ainda não está implementado (Task 6 faz isso), use fallback temporário até lá:
```ts
const tabs = [{ key: "geral", label: "Geral" }, { key: "processos", label: "Processos" }];
```

- [ ] **Step 3: Placeholder page do caso**

Create `src/app/(dashboard)/admin/assistidos/[id]/caso/[casoId]/page.tsx`:

```tsx
"use client";

import { useParams } from "next/navigation";
import { trpc } from "@/lib/trpc/client";

export default function CasoHubPage() {
  const params = useParams();
  const casoId = Number(params?.casoId);
  const { data: caso, isLoading } = trpc.casos.getCasoById.useQuery({ id: casoId }, { enabled: !isNaN(casoId) });

  if (isLoading) return <p className="p-6 italic text-neutral-400">Carregando…</p>;
  if (!caso) return <p className="p-6">Caso não encontrado.</p>;

  return (
    <div className="p-6 space-y-4">
      <h2 className="text-base font-semibold">{caso.titulo}</h2>
      {caso.teoriaFatos && (
        <section>
          <h3 className="text-xs font-semibold text-neutral-500 uppercase">Teoria dos fatos</h3>
          <p className="text-sm mt-1 whitespace-pre-wrap">{caso.teoriaFatos}</p>
        </section>
      )}
      {caso.teoriaDireito && (
        <section>
          <h3 className="text-xs font-semibold text-neutral-500 uppercase">Teoria do direito</h3>
          <p className="text-sm mt-1 whitespace-pre-wrap">{caso.teoriaDireito}</p>
        </section>
      )}
      {/* Outras seções do caso: tags, status, fase, foco */}
    </div>
  );
}
```

- [ ] **Step 4: Typecheck**

```
cd /Users/rodrigorochameire/projetos/Defender && npm run typecheck 2>&1 | tail -20
```

Expected: pode ter erros se `useVisibleCasoTabs` ou `CaseSwitcher` não existem. Essas são criados nas próximas tasks — por enquanto, aceite os erros ou crie stubs vazios:

Stubs temporários (criar se necessário):
- `src/hooks/use-visible-caso-tabs.ts` → `export const useVisibleCasoTabs = () => [{ key: "geral", label: "Geral" }];`
- `src/components/hierarquia/caso-switcher.tsx` → placeholder que só mostra casoId

- [ ] **Step 5: Commit**

```
cd /Users/rodrigorochameire/projetos/Defender
git add 'src/app/(dashboard)/admin/assistidos/[id]/layout.tsx' \
        'src/app/(dashboard)/admin/assistidos/[id]/caso/[casoId]/layout.tsx' \
        'src/app/(dashboard)/admin/assistidos/[id]/caso/[casoId]/page.tsx' \
        src/hooks/use-visible-caso-tabs.ts \
        src/components/hierarquia/caso-switcher.tsx 2>/dev/null
git commit -m "feat(hierarquia): AssistidoLayout + CasoLayout + route scaffolding (X-α)"
```

---

## Task 4: `CaseSwitcher` + Nível 1 "Casos" tab

**Files:**
- Create/Modify: `src/components/hierarquia/caso-switcher.tsx`
- Create: `src/components/hierarquia/index.ts`
- Create: `__tests__/components/hierarquia/caso-switcher.test.tsx`
- Create: `src/app/(dashboard)/admin/assistidos/[id]/casos/page.tsx` (lista de casos)

- [ ] **Step 1: Write CaseSwitcher test**

`__tests__/components/hierarquia/caso-switcher.test.tsx`:

```tsx
// @vitest-environment happy-dom
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { CaseSwitcher } from "@/components/hierarquia/caso-switcher";

afterEach(() => cleanup());

vi.mock("@/lib/trpc/client", () => ({
  trpc: {
    casos: {
      getCasosDoAssistido: {
        useQuery: vi.fn(() => ({ data: [
          { id: 1, titulo: "Caso A", status: "ativo" },
          { id: 2, titulo: "Caso B", status: "ativo" },
        ], isLoading: false })),
      },
    },
  },
}));

describe("CaseSwitcher", () => {
  it("mostra caso ativo no botão", () => {
    render(<CaseSwitcher assistidoId={100} activeCasoId={1} />);
    expect(screen.getByText("Caso A")).toBeInTheDocument();
  });

  it("click abre lista com outros casos", () => {
    render(<CaseSwitcher assistidoId={100} activeCasoId={1} />);
    fireEvent.click(screen.getByRole("button"));
    expect(screen.getByText("Caso B")).toBeInTheDocument();
  });

  it("com 1 caso não mostra dropdown indicator", () => {
    vi.mocked(require("@/lib/trpc/client").trpc.casos.getCasosDoAssistido.useQuery).mockReturnValue({
      data: [{ id: 1, titulo: "Só um caso", status: "ativo" }], isLoading: false,
    });
    render(<CaseSwitcher assistidoId={100} activeCasoId={1} />);
    expect(screen.queryByLabelText(/trocar caso/i)).toBeNull();
  });
});
```

- [ ] **Step 2: Implement CaseSwitcher**

Replace/create `src/components/hierarquia/caso-switcher.tsx`:

```tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { trpc } from "@/lib/trpc/client";
import { ChevronDown, Briefcase } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  assistidoId: number;
  activeCasoId: number;
}

export function CaseSwitcher({ assistidoId, activeCasoId }: Props) {
  const [open, setOpen] = useState(false);
  const { data: casos = [] } = trpc.casos.getCasosDoAssistido.useQuery({ assistidoId });

  const active = casos.find((c) => c.id === activeCasoId);
  const outros = casos.filter((c) => c.id !== activeCasoId);
  const hasMultiple = casos.length > 1;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => hasMultiple && setOpen((o) => !o)}
        disabled={!hasMultiple}
        aria-label={hasMultiple ? "Trocar caso" : undefined}
        className={cn(
          "flex items-center gap-2 px-2 py-1 rounded text-sm cursor-pointer",
          hasMultiple && "hover:bg-neutral-100 dark:hover:bg-neutral-800",
        )}
      >
        <Briefcase className="w-3 h-3" />
        <span className="font-medium truncate max-w-[220px]">{active?.titulo ?? "—"}</span>
        {hasMultiple && <ChevronDown className="w-3 h-3" />}
      </button>

      {open && hasMultiple && (
        <div className="absolute top-full left-0 mt-1 w-72 rounded border bg-white dark:bg-neutral-900 shadow-md py-1 z-50">
          {outros.map((c) => (
            <Link
              key={c.id}
              href={`/admin/assistidos/${assistidoId}/caso/${c.id}`}
              onClick={() => setOpen(false)}
              className="block px-3 py-1.5 text-sm hover:bg-neutral-50 dark:hover:bg-neutral-800"
            >
              <div className="font-medium truncate">{c.titulo}</div>
              <div className="text-[10px] text-neutral-500">{c.status}</div>
            </Link>
          ))}
          <div className="border-t mt-1 pt-1">
            <Link
              href={`/admin/assistidos/${assistidoId}/casos`}
              onClick={() => setOpen(false)}
              className="block px-3 py-1.5 text-xs text-emerald-600 hover:bg-emerald-50"
            >
              Ver todos + novo caso →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: index barrel**

Create `src/components/hierarquia/index.ts`:
```ts
export { CaseSwitcher } from "./caso-switcher";
```

- [ ] **Step 4: Nível 1 "Casos" tab page**

Create `src/app/(dashboard)/admin/assistidos/[id]/casos/page.tsx`:

```tsx
"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { trpc } from "@/lib/trpc/client";
import { Briefcase, Plus } from "lucide-react";

export default function CasosListPage() {
  const params = useParams();
  const assistidoId = Number(params?.id);
  const { data: casos = [], isLoading } = trpc.casos.getCasosDoAssistido.useQuery({ assistidoId });

  if (isLoading) return <p className="p-6 italic text-neutral-400">Carregando…</p>;

  return (
    <div className="p-6 space-y-3">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base font-semibold">Casos ({casos.length})</h2>
        <Link
          href={`/admin/assistidos/${assistidoId}/casos/novo`}
          className="flex items-center gap-1 px-3 py-1.5 rounded border text-xs cursor-pointer hover:border-emerald-400"
        >
          <Plus className="w-3 h-3" /> Novo caso
        </Link>
      </div>
      {casos.length === 0 && <p className="italic text-neutral-400">Nenhum caso cadastrado.</p>}
      <div className="grid gap-2">
        {casos.map((c) => (
          <Link
            key={c.id}
            href={`/admin/assistidos/${assistidoId}/caso/${c.id}`}
            className="rounded border px-4 py-3 hover:border-emerald-400 flex items-start gap-3"
          >
            <Briefcase className="w-4 h-4 mt-0.5 text-neutral-500" />
            <div className="flex-1 min-w-0">
              <div className="font-medium truncate">{c.titulo}</div>
              <div className="text-xs text-neutral-500 mt-0.5 flex gap-2">
                <span>{c.status}</span>
                {c.fase && <span>· {c.fase}</span>}
                {c.prioridade && <span>· {c.prioridade}</span>}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Run tests**

```
cd /Users/rodrigorochameire/projetos/Defender && npm run test __tests__/components/hierarquia/ 2>&1 | tail -20
```

Expected: 3 tests pass.

- [ ] **Step 6: Commit**

```
cd /Users/rodrigorochameire/projetos/Defender
git add src/components/hierarquia/ __tests__/components/hierarquia/ 'src/app/(dashboard)/admin/assistidos/[id]/casos/page.tsx'
git commit -m "feat(hierarquia): CaseSwitcher + aba Casos (Nível 1)"
```

---

## Task 5: Auto-redirect + `/admin/processos/[id]` compat

**Files:**
- Refactor: `src/app/(dashboard)/admin/assistidos/[id]/page.tsx` (backup antigo, cria wrapper)
- Refactor: `src/app/(dashboard)/admin/processos/[id]/page.tsx`

- [ ] **Step 1: Backup assistido/[id] antigo**

```
cd /Users/rodrigorochameire/projetos/Defender
cp 'src/app/(dashboard)/admin/assistidos/[id]/page.tsx' 'src/app/(dashboard)/admin/assistidos/[id]/page.legacy.tsx.bak'
```

O arquivo `page.legacy.tsx.bak` não é compilado pelo Next.js (extensão `.bak`). Serve de referência pras migrações de aba nas próximas tasks.

- [ ] **Step 2: Nova `page.tsx` enxuta com auto-redirect**

Replace `src/app/(dashboard)/admin/assistidos/[id]/page.tsx` com:

```tsx
"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";
import { trpc } from "@/lib/trpc/client";

/**
 * Nível 1 (Assistido) — aba "Geral" default.
 * Se assistido tem exatamente 1 caso ativo, auto-redireciona pra caso hub.
 * Senão: mostra dados básicos do assistido + CTA "Ver casos".
 */
export default function AssistidoHubPage() {
  const params = useParams();
  const router = useRouter();
  const id = Number(params?.id);

  const { data: assistido } = trpc.assistidos.getById.useQuery({ id }, { enabled: !isNaN(id) });
  const { data: casos = [], isLoading } = trpc.casos.getCasosDoAssistido.useQuery(
    { assistidoId: id }, { enabled: !isNaN(id) }
  );

  const casosAtivos = casos.filter((c) => c.status === "ativo");

  useEffect(() => {
    if (!isLoading && casosAtivos.length === 1) {
      router.replace(`/admin/assistidos/${id}/caso/${casosAtivos[0].id}`);
    }
  }, [isLoading, casosAtivos, id, router]);

  if (isLoading) return <p className="p-6 italic text-neutral-400">Carregando…</p>;

  return (
    <div className="p-6 space-y-4 max-w-2xl">
      <section>
        <h2 className="text-base font-semibold mb-2">Dados pessoais</h2>
        <dl className="grid grid-cols-2 gap-2 text-sm">
          <div><dt className="text-xs text-neutral-500">Nome</dt><dd>{assistido?.nome}</dd></div>
          <div><dt className="text-xs text-neutral-500">CPF</dt><dd className="font-mono">{assistido?.cpf ?? "—"}</dd></div>
          <div><dt className="text-xs text-neutral-500">Telefone</dt><dd>{assistido?.telefone ?? "—"}</dd></div>
          <div><dt className="text-xs text-neutral-500">Endereço</dt><dd>{assistido?.endereco ?? "—"}</dd></div>
        </dl>
      </section>
      {casos.length > 0 && (
        <section>
          <p className="text-xs text-neutral-500">
            {casos.length} caso{casos.length !== 1 ? "s" : ""} · <a href={`/admin/assistidos/${id}/casos`} className="underline">ver todos</a>
          </p>
        </section>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Refactor /admin/processos/[id]**

Replace `src/app/(dashboard)/admin/processos/[id]/page.tsx`:

```tsx
"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { trpc } from "@/lib/trpc/client";

export default function ProcessoPage() {
  const params = useParams();
  const router = useRouter();
  const sp = useSearchParams();
  const raw = sp?.get("raw") === "1";
  const id = Number(params?.id);

  const { data: processo, isLoading } = trpc.processos.getById.useQuery({ id }, { enabled: !isNaN(id) });

  useEffect(() => {
    if (raw || isLoading || !processo) return;
    if (processo.casoId) {
      const assistidoIdNum = processo.assistidoId ?? null;
      if (assistidoIdNum) {
        router.replace(`/admin/assistidos/${assistidoIdNum}/caso/${processo.casoId}/processo/${id}`);
      }
    }
  }, [raw, isLoading, processo, id, router]);

  if (isLoading) return <p className="p-6 italic text-neutral-400">Carregando…</p>;
  if (!processo) return <p className="p-6">Processo não encontrado.</p>;

  // Vista técnica standalone (raw=1 ou processo sem caso)
  return (
    <div className="p-6 space-y-3 max-w-3xl">
      <h1 className="text-lg font-semibold">Processo #{id}</h1>
      <dl className="grid grid-cols-2 gap-3 text-sm">
        <div><dt className="text-xs text-neutral-500">Número CNJ</dt><dd className="font-mono">{processo.numero ?? "—"}</dd></div>
        <div><dt className="text-xs text-neutral-500">Área</dt><dd>{processo.area}</dd></div>
        <div><dt className="text-xs text-neutral-500">Vara</dt><dd>{processo.vara ?? "—"}</dd></div>
        <div><dt className="text-xs text-neutral-500">Juiz</dt><dd>{processo.juiz ?? "—"}</dd></div>
      </dl>
      {!raw && !processo.casoId && (
        <p className="text-xs italic text-amber-600">Processo sem caso vinculado — vista técnica standalone.</p>
      )}
    </div>
  );
}
```

**Nota:** se `processo.assistidoId` não existe como campo direto, buscar via `casos.assistidoId`. Ajuste o fetch: `trpc.casos.getCasoById({ id: processo.casoId })` pra pegar o assistidoId.

- [ ] **Step 4: Typecheck + manual smoke test**

```
cd /Users/rodrigorochameire/projetos/Defender && npm run typecheck 2>&1 | tail -20
npm run dev:webpack
# Abrir /admin/assistidos/<id> → deve renderizar layout novo
# Abrir /admin/processos/<id> → deve redirecionar pra caso (se tem) ou vista standalone
```

- [ ] **Step 5: Commit**

```
cd /Users/rodrigorochameire/projetos/Defender
git add 'src/app/(dashboard)/admin/assistidos/[id]/page.tsx' \
        'src/app/(dashboard)/admin/assistidos/[id]/page.legacy.tsx.bak' \
        'src/app/(dashboard)/admin/processos/[id]/page.tsx'
git commit -m "feat(hierarquia): auto-redirect + processos/[id] compat (X-α)"
```

---

# Sub-Fase X-β · Reorganizar abas entre níveis (Tasks 6-11)

## Task 6: `inferCasoArea` + `useVisibleCasoTabs` (TDD)

**Files:**
- Create: `src/lib/hierarquia/infer-caso-area.ts`
- Create: `src/lib/hierarquia/visible-caso-tabs.ts`
- Create: `src/hooks/use-visible-caso-tabs.ts`
- Create: `__tests__/unit/infer-caso-area.test.ts`
- Create: `__tests__/unit/visible-caso-tabs.test.ts`

- [ ] **Step 1: Write tests — inferCasoArea**

```ts
// __tests__/unit/infer-caso-area.test.ts
import { describe, it, expect } from "vitest";
import { inferCasoArea } from "@/lib/hierarquia/infer-caso-area";

describe("inferCasoArea", () => {
  it("processo referência tem prioridade", () => {
    expect(inferCasoArea([
      { id: 1, area: "VIOLENCIA_DOMESTICA", isReferencia: true },
      { id: 2, area: "JURI", isReferencia: false },
    ])).toBe("VIOLENCIA_DOMESTICA");
  });

  it("sem referência, usa moda", () => {
    expect(inferCasoArea([
      { id: 1, area: "JURI", isReferencia: false },
      { id: 2, area: "JURI", isReferencia: false },
      { id: 3, area: "EXECUCAO_PENAL", isReferencia: false },
    ])).toBe("JURI");
  });

  it("empate de moda, pega primeiro", () => {
    expect(inferCasoArea([
      { id: 1, area: "JURI", isReferencia: false },
      { id: 2, area: "VIOLENCIA_DOMESTICA", isReferencia: false },
    ])).toBe("JURI");
  });

  it("lista vazia → SUBSTITUICAO default", () => {
    expect(inferCasoArea([])).toBe("SUBSTITUICAO");
  });

  it("ignora processos sem area", () => {
    expect(inferCasoArea([
      { id: 1, area: null as any, isReferencia: false },
      { id: 2, area: "JURI", isReferencia: false },
    ])).toBe("JURI");
  });

  it("null/undefined → SUBSTITUICAO", () => {
    expect(inferCasoArea(null as any)).toBe("SUBSTITUICAO");
    expect(inferCasoArea(undefined as any)).toBe("SUBSTITUICAO");
  });
});
```

- [ ] **Step 2: Implement inferCasoArea**

```ts
// src/lib/hierarquia/infer-caso-area.ts
export type Area =
  | "JURI" | "EXECUCAO_PENAL" | "VIOLENCIA_DOMESTICA" | "SUBSTITUICAO"
  | "CURADORIA" | "FAMILIA" | "CIVEL" | "FAZENDA_PUBLICA" | "CRIMINAL"
  | "INFANCIA_JUVENTUDE";

interface ProcessoMin {
  id: number;
  area: Area | null;
  isReferencia: boolean;
}

export function inferCasoArea(processos: ProcessoMin[] | null | undefined): Area {
  if (!processos || processos.length === 0) return "SUBSTITUICAO";
  const ref = processos.find((p) => p.isReferencia && p.area);
  if (ref && ref.area) return ref.area;

  const counts = new Map<Area, number>();
  for (const p of processos) {
    if (p.area) counts.set(p.area, (counts.get(p.area) ?? 0) + 1);
  }
  if (counts.size === 0) return "SUBSTITUICAO";

  let best: Area = "SUBSTITUICAO";
  let bestCount = -1;
  for (const p of processos) {
    if (!p.area) continue;
    const n = counts.get(p.area) ?? 0;
    if (n > bestCount) { best = p.area; bestCount = n; }
  }
  return best;
}
```

- [ ] **Step 3: Run tests PASS (6 testes)**

- [ ] **Step 4: Write tests — useVisibleCasoTabs**

```ts
// __tests__/unit/visible-caso-tabs.test.ts
import { describe, it, expect } from "vitest";
import { computeVisibleCasoTabs } from "@/lib/hierarquia/visible-caso-tabs";

describe("computeVisibleCasoTabs", () => {
  it("inclui abas sempre em qualquer area", () => {
    const tabs = computeVisibleCasoTabs("SUBSTITUICAO").map((t) => t.key);
    expect(tabs).toContain("geral");
    expect(tabs).toContain("pessoas");
    expect(tabs).toContain("audiencias");
    expect(tabs).toContain("demandas");
    expect(tabs).toContain("documentos");
  });

  it("JURI mostra Delitos + Institutos", () => {
    const tabs = computeVisibleCasoTabs("JURI").map((t) => t.key);
    expect(tabs).toContain("delitos");
    expect(tabs).toContain("institutos");
    expect(tabs).not.toContain("mpu");
    expect(tabs).not.toContain("atos-infracionais");
    expect(tabs).not.toContain("execucao-penal");
  });

  it("VIOLENCIA_DOMESTICA mostra MPU + Delitos", () => {
    const tabs = computeVisibleCasoTabs("VIOLENCIA_DOMESTICA").map((t) => t.key);
    expect(tabs).toContain("mpu");
    expect(tabs).toContain("delitos");
    expect(tabs).not.toContain("institutos");
    expect(tabs).not.toContain("atos-infracionais");
  });

  it("EXECUCAO_PENAL mostra Execução Penal + Delitos", () => {
    const tabs = computeVisibleCasoTabs("EXECUCAO_PENAL").map((t) => t.key);
    expect(tabs).toContain("execucao-penal");
    expect(tabs).toContain("delitos");
    expect(tabs).not.toContain("institutos");
  });

  it("INFANCIA_JUVENTUDE mostra Atos Infracionais", () => {
    const tabs = computeVisibleCasoTabs("INFANCIA_JUVENTUDE").map((t) => t.key);
    expect(tabs).toContain("atos-infracionais");
    expect(tabs).not.toContain("delitos");
    expect(tabs).not.toContain("mpu");
  });

  it("CIVEL / FAMILIA — sem condicionais penais", () => {
    const tabsCivel = computeVisibleCasoTabs("CIVEL").map((t) => t.key);
    expect(tabsCivel).not.toContain("delitos");
    expect(tabsCivel).not.toContain("mpu");
    const tabsFam = computeVisibleCasoTabs("FAMILIA").map((t) => t.key);
    expect(tabsFam).not.toContain("delitos");
  });

  it("CRIMINAL mostra Delitos + Institutos", () => {
    const tabs = computeVisibleCasoTabs("CRIMINAL").map((t) => t.key);
    expect(tabs).toContain("delitos");
    expect(tabs).toContain("institutos");
  });

  it("primeira aba é sempre 'geral'", () => {
    const tabs = computeVisibleCasoTabs("JURI");
    expect(tabs[0].key).toBe("geral");
  });
});
```

- [ ] **Step 5: Implement visible-caso-tabs**

```ts
// src/lib/hierarquia/visible-caso-tabs.ts
import type { Area } from "./infer-caso-area";

export interface CasoTab {
  key: string;
  label: string;
}

const SEMPRE: CasoTab[] = [
  { key: "geral",         label: "Geral" },
  { key: "processos",     label: "Processos" },
  { key: "pessoas",       label: "Pessoas" },
  { key: "cronologia",    label: "Cronologia" },
  { key: "audiencias",    label: "Audiências" },
  { key: "atendimentos",  label: "Atendimentos" },
  { key: "documentos",    label: "Documentos" },
  { key: "midias",        label: "Mídias" },
  { key: "demandas",      label: "Demandas" },
  { key: "oficios",       label: "Ofícios" },
  { key: "investigacao",  label: "Investigação" },
];

const AREA_GRUPOS_PENAL = new Set<Area>(["JURI","CRIMINAL","SUBSTITUICAO","EXECUCAO_PENAL","VIOLENCIA_DOMESTICA"]);
const AREA_GRUPOS_ANPP  = new Set<Area>(["JURI","CRIMINAL","SUBSTITUICAO"]);

export function computeVisibleCasoTabs(area: Area): CasoTab[] {
  const tabs: CasoTab[] = [...SEMPRE];

  if (AREA_GRUPOS_PENAL.has(area)) {
    tabs.push({ key: "delitos", label: "Delitos" });
  }
  if (AREA_GRUPOS_ANPP.has(area)) {
    tabs.push({ key: "institutos", label: "Institutos" });
  }
  if (area === "VIOLENCIA_DOMESTICA") {
    tabs.push({ key: "mpu", label: "MPU" });
  }
  if (area === "EXECUCAO_PENAL") {
    tabs.push({ key: "execucao-penal", label: "Execução Penal" });
  }
  if (area === "INFANCIA_JUVENTUDE") {
    tabs.push({ key: "atos-infracionais", label: "Atos Infracionais" });
  }

  return tabs;
}
```

- [ ] **Step 6: Implement useVisibleCasoTabs hook**

```ts
// src/hooks/use-visible-caso-tabs.ts
import { useMemo } from "react";
import { inferCasoArea, type Area } from "@/lib/hierarquia/infer-caso-area";
import { computeVisibleCasoTabs, type CasoTab } from "@/lib/hierarquia/visible-caso-tabs";

interface ProcessoMin {
  id: number;
  area: Area | null;
  isReferencia: boolean;
}

export function useVisibleCasoTabs(processos: ProcessoMin[] | null | undefined): CasoTab[] {
  return useMemo(() => {
    const area = inferCasoArea(processos ?? []);
    return computeVisibleCasoTabs(area);
  }, [processos]);
}
```

- [ ] **Step 7: Run tests PASS (14 testes total)**

```
cd /Users/rodrigorochameire/projetos/Defender && npm run test __tests__/unit/infer-caso-area.test.ts __tests__/unit/visible-caso-tabs.test.ts 2>&1 | tail -20
```

- [ ] **Step 8: Commit**

```
cd /Users/rodrigorochameire/projetos/Defender
git add src/lib/hierarquia/ src/hooks/use-visible-caso-tabs.ts __tests__/unit/infer-caso-area.test.ts __tests__/unit/visible-caso-tabs.test.ts
git commit -m "feat(hierarquia): inferCasoArea + useVisibleCasoTabs (TDD)"
```

---

## Task 7: Migrate operational tabs → caso (demandas, ofícios, atendimentos, investigação)

**Files:**
- Create: `src/app/(dashboard)/admin/assistidos/[id]/caso/[casoId]/_components/tab-demandas.tsx`
- Create: `.../tab-oficios.tsx`
- Create: `.../tab-atendimentos.tsx`
- Create: `.../tab-investigacao.tsx`
- Create: `src/app/(dashboard)/admin/assistidos/[id]/caso/[casoId]/[aba]/page.tsx` (router de abas)

- [ ] **Step 1: Referência — inspect page.legacy.tsx.bak**

Ler `src/app/(dashboard)/admin/assistidos/[id]/page.legacy.tsx.bak`, seções correspondentes:
- `{tab === "demandas" && (...)`
- `{tab === "oficios" && (...)`
- `{tab === "atendimentos" && (...)`
- `{tab === "investigacao" && (...)`

Extrair JSX + queries tRPC usadas. Os queries hoje filtram por `assistidoId` — **vamos trocar pra filtrar por `casoId`**.

- [ ] **Step 2: tab-demandas.tsx**

```tsx
"use client";

import { trpc } from "@/lib/trpc/client";

interface Props {
  casoId: number;
}

export function TabDemandas({ casoId }: Props) {
  const { data: demandas = [], isLoading } = trpc.demandas.listByCaso.useQuery({ casoId });
  if (isLoading) return <p className="p-4 italic text-neutral-400">Carregando…</p>;

  return (
    <div className="p-4 space-y-2">
      <h3 className="text-base font-semibold mb-3">Demandas do caso ({demandas.length})</h3>
      {demandas.length === 0 && <p className="italic text-neutral-400">Nenhuma demanda.</p>}
      {/* Copiar layout de cards de demanda do page.legacy.tsx.bak, adaptando campos do objeto */}
      {demandas.map((d: any) => (
        <div key={d.id} className="rounded border px-3 py-2 text-sm">
          <div className="font-medium">{d.titulo}</div>
          <div className="text-xs text-neutral-500">{d.status} · {d.prazo ? new Date(d.prazo).toLocaleDateString("pt-BR") : "sem prazo"}</div>
        </div>
      ))}
    </div>
  );
}
```

**Nota:** `trpc.demandas.listByCaso` provavelmente não existe ainda. Verificar:
```
grep -rn "listByCaso\|list:.*caso\|listDemandas" /Users/rodrigorochameire/projetos/Defender/src/lib/trpc/routers/demandas.ts 2>&1 | head
```
Se não existir, adicionar procedure simples:
```ts
listByCaso: protectedProcedure
  .input(z.object({ casoId: z.number() }))
  .query(async ({ input, ctx }) => {
    const wid = ctx.user.workspaceId ?? 1;
    return await db.select().from(demandas)
      .where(and(eq(demandas.casoId, input.casoId), eq(demandas.workspaceId, wid)))
      .orderBy(desc(demandas.createdAt));
  }),
```
(Ajustar ao schema de `demandas`; pode ter nomes de colunas diferentes.)

- [ ] **Step 3: tab-oficios.tsx**

Mesmo padrão: `TabOficios` consumindo `trpc.oficios.listByCaso({ casoId })`. Copiar JSX do legacy.

```tsx
"use client";

import { trpc } from "@/lib/trpc/client";

interface Props { casoId: number; }

export function TabOficios({ casoId }: Props) {
  const { data: oficios = [], isLoading } = trpc.oficios.listByCaso.useQuery({ casoId });
  if (isLoading) return <p className="p-4 italic text-neutral-400">Carregando…</p>;
  return (
    <div className="p-4 space-y-2">
      <h3 className="text-base font-semibold mb-3">Ofícios ({oficios.length})</h3>
      {oficios.length === 0 && <p className="italic text-neutral-400">Nenhum ofício.</p>}
      {oficios.map((o: any) => (
        <div key={o.id} className="rounded border px-3 py-2 text-sm">
          <div className="font-medium">{o.assunto}</div>
          <div className="text-xs text-neutral-500">{o.status} · para {o.destinatario}</div>
        </div>
      ))}
    </div>
  );
}
```

Adicionar procedure `oficios.listByCaso` se necessário.

- [ ] **Step 4: tab-atendimentos.tsx**

```tsx
"use client";

import { trpc } from "@/lib/trpc/client";

interface Props { casoId: number; }

export function TabAtendimentos({ casoId }: Props) {
  const { data: atendimentos = [], isLoading } = trpc.atendimentos.listByCaso.useQuery({ casoId });
  if (isLoading) return <p className="p-4 italic text-neutral-400">Carregando…</p>;
  return (
    <div className="p-4 space-y-2">
      <h3 className="text-base font-semibold mb-3">Atendimentos ({atendimentos.length})</h3>
      {atendimentos.length === 0 && <p className="italic text-neutral-400">Nenhum atendimento.</p>}
      {atendimentos.map((a: any) => (
        <div key={a.id} className="rounded border px-3 py-2 text-sm">
          <div className="text-xs text-neutral-500">
            {a.createdAt ? new Date(a.createdAt).toLocaleDateString("pt-BR") : "—"}
          </div>
          <div className="font-medium mt-1 whitespace-pre-wrap line-clamp-3">{a.descricao ?? a.texto ?? ""}</div>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 5: tab-investigacao.tsx**

Copiar JSX de investigação do legacy, adaptar pra receber `casoId` em vez de `assistidoId`. Se investigação não tem `casoId` ainda no schema, usar temporariamente o primeiro processo do caso.

```tsx
"use client";

import { trpc } from "@/lib/trpc/client";

interface Props { casoId: number; }

export function TabInvestigacao({ casoId }: Props) {
  // Se investigacao tem casoId: usar direto. Senão, adaptar.
  const { data = [], isLoading } = trpc.investigacao.listByCaso.useQuery({ casoId });
  if (isLoading) return <p className="p-4 italic text-neutral-400">Carregando…</p>;
  return (
    <div className="p-4">
      <h3 className="text-base font-semibold mb-3">Investigação</h3>
      <p className="text-sm text-neutral-500">Board de investigação (migrar conteúdo do legacy).</p>
      {/* Copiar layout de cards de investigação do legacy */}
    </div>
  );
}
```

- [ ] **Step 6: Router de abas**

Create `src/app/(dashboard)/admin/assistidos/[id]/caso/[casoId]/[aba]/page.tsx`:

```tsx
"use client";

import { useParams } from "next/navigation";
import { TabDemandas } from "../_components/tab-demandas";
import { TabOficios } from "../_components/tab-oficios";
import { TabAtendimentos } from "../_components/tab-atendimentos";
import { TabInvestigacao } from "../_components/tab-investigacao";

export default function CasoAbaPage() {
  const params = useParams();
  const casoId = Number(params?.casoId);
  const aba = String(params?.aba);

  switch (aba) {
    case "demandas":     return <TabDemandas casoId={casoId} />;
    case "oficios":      return <TabOficios casoId={casoId} />;
    case "atendimentos": return <TabAtendimentos casoId={casoId} />;
    case "investigacao": return <TabInvestigacao casoId={casoId} />;
    default:             return <p className="p-4 italic text-neutral-400">Aba "{aba}" ainda não implementada.</p>;
  }
}
```

Este arquivo vai crescer nas próximas tasks conforme migramos mais abas. Use switch por enquanto.

- [ ] **Step 7: Commit**

```
cd /Users/rodrigorochameire/projetos/Defender
git add 'src/app/(dashboard)/admin/assistidos/[id]/caso/[casoId]/_components/' \
        'src/app/(dashboard)/admin/assistidos/[id]/caso/[casoId]/[aba]/page.tsx'
# adicionar routers se modificados:
git add src/lib/trpc/routers/demandas.ts src/lib/trpc/routers/oficios.ts src/lib/trpc/routers/atendimentos.ts src/lib/trpc/routers/investigacao.ts 2>/dev/null
git commit -m "feat(hierarquia): migrate demandas/ofícios/atendimentos/investigação → caso"
```

---

## Task 8: Unify audiências + documentos + mídias (source única no caso)

**Files:**
- Create: `.../tab-audiencias.tsx`
- Create: `.../tab-documentos.tsx`
- Create: `.../tab-midias.tsx`
- Modify: `[aba]/page.tsx` (add switch branches)

- [ ] **Step 1: tab-audiencias.tsx**

```tsx
"use client";

import { trpc } from "@/lib/trpc/client";

interface Props { casoId: number; }

export function TabAudiencias({ casoId }: Props) {
  const { data = [], isLoading } = trpc.audiencias.listByCaso.useQuery({ casoId });
  if (isLoading) return <p className="p-4 italic text-neutral-400">Carregando…</p>;
  return (
    <div className="p-4 space-y-2">
      <h3 className="text-base font-semibold mb-3">Audiências ({data.length})</h3>
      {data.length === 0 && <p className="italic text-neutral-400">Nenhuma audiência agendada.</p>}
      {data.map((a: any) => (
        <div key={a.id} className="rounded border px-3 py-2 text-sm">
          <div className="font-medium">{a.tipo}</div>
          <div className="text-xs text-neutral-500">
            {a.dataHora ? new Date(a.dataHora).toLocaleString("pt-BR") : "—"}
            {" · "}{a.status ?? "agendada"}
          </div>
        </div>
      ))}
    </div>
  );
}
```

Audiências já tem `caso_id` (linha 358 do schema); procedure `listByCaso` pode já existir. Verificar.

- [ ] **Step 2: tab-documentos.tsx**

Unificar drive files do caso + documentos estruturados:

```tsx
"use client";

import { trpc } from "@/lib/trpc/client";

interface Props { casoId: number; }

export function TabDocumentos({ casoId }: Props) {
  const { data = [], isLoading } = trpc.documentos.listByCaso.useQuery({ casoId });
  if (isLoading) return <p className="p-4 italic text-neutral-400">Carregando…</p>;
  return (
    <div className="p-4 space-y-2">
      <h3 className="text-base font-semibold mb-3">Documentos ({data.length})</h3>
      {data.length === 0 && <p className="italic text-neutral-400">Nenhum documento.</p>}
      {data.map((d: any) => (
        <a key={d.id} href={d.url ?? "#"} target="_blank" rel="noreferrer"
           className="block rounded border px-3 py-2 text-sm hover:border-emerald-400">
          <div className="font-medium">{d.nome}</div>
          <div className="text-xs text-neutral-500">{d.tipo} · {d.tamanho ?? ""}</div>
        </a>
      ))}
    </div>
  );
}
```

- [ ] **Step 3: tab-midias.tsx**

Mídias = áudios/vídeos (ex: gravações de depoimentos). Se tabela `midias` ou similar tem `caso_id`:

```tsx
"use client";

import { trpc } from "@/lib/trpc/client";

interface Props { casoId: number; }

export function TabMidias({ casoId }: Props) {
  const { data = [], isLoading } = trpc.midias.listByCaso.useQuery({ casoId });
  if (isLoading) return <p className="p-4 italic text-neutral-400">Carregando…</p>;
  return (
    <div className="p-4 space-y-2">
      <h3 className="text-base font-semibold mb-3">Mídias ({data.length})</h3>
      {data.length === 0 && <p className="italic text-neutral-400">Nenhuma mídia.</p>}
      {data.map((m: any) => (
        <div key={m.id} className="rounded border px-3 py-2 text-sm">
          <div className="font-medium">{m.nome}</div>
          <div className="text-xs text-neutral-500">{m.tipo} · {m.duracao ?? ""}</div>
        </div>
      ))}
    </div>
  );
}
```

Se midias não tem `caso_id`, buscar via processo: `trpc.midias.listByProcessosDoCaso({ casoId })`. Implementar procedure.

- [ ] **Step 4: Update router de abas**

Em `src/app/(dashboard)/admin/assistidos/[id]/caso/[casoId]/[aba]/page.tsx`:

```tsx
// Adicionar imports:
import { TabAudiencias } from "../_components/tab-audiencias";
import { TabDocumentos } from "../_components/tab-documentos";
import { TabMidias } from "../_components/tab-midias";

// No switch:
case "audiencias":  return <TabAudiencias casoId={casoId} />;
case "documentos":  return <TabDocumentos casoId={casoId} />;
case "midias":      return <TabMidias casoId={casoId} />;
```

- [ ] **Step 5: Typecheck + commit**

```
cd /Users/rodrigorochameire/projetos/Defender && npm run typecheck 2>&1 | tail -15
git add 'src/app/(dashboard)/admin/assistidos/[id]/caso/[casoId]/_components/' \
        'src/app/(dashboard)/admin/assistidos/[id]/caso/[casoId]/[aba]/page.tsx'
# Adicionar routers tRPC modificados:
git add src/lib/trpc/routers/*.ts 2>/dev/null
git commit -m "feat(hierarquia): unify audiências/documentos/mídias em caso"
```

---

## Task 9: Migrate `Pessoas` e `Cronologia stub` → caso (agregadas)

**Files:**
- Create: `.../tab-pessoas.tsx`
- Create: `.../tab-cronologia.tsx` (stub — conteúdo real em X-δ)
- Modify: `[aba]/page.tsx`
- Modify: `src/lib/trpc/routers/pessoas.ts` (+ `getParticipacoesDoCaso`)

- [ ] **Step 1: tRPC `getParticipacoesDoCaso`**

Em `src/lib/trpc/routers/pessoas.ts`, adicionar:

```ts
  getParticipacoesDoCaso: protectedProcedure
    .input(z.object({ casoId: z.number() }))
    .query(async ({ input, ctx }) => {
      const wid = ctx.user.workspaceId ?? 1;
      // Processos do caso
      const processosDoCaso = await db.select({ id: processos.id })
        .from(processos)
        .where(and(eq(processos.casoId, input.casoId), eq(processos.workspaceId, wid)));
      if (processosDoCaso.length === 0) return [];
      const procIds = processosDoCaso.map((p) => p.id);
      return await db.select().from(participacoesProcesso)
        .where(inArray(participacoesProcesso.processoId, procIds));
    }),
```

Imports: `processos`, `participacoesProcesso`, `inArray`, `and`, `eq`.

- [ ] **Step 2: tab-pessoas.tsx**

```tsx
"use client";

import { trpc } from "@/lib/trpc/client";
import { PessoaChip } from "@/components/pessoas";

interface Props { casoId: number; }

export function TabPessoas({ casoId }: Props) {
  const { data = [], isLoading } = trpc.pessoas.getParticipacoesDoCaso.useQuery({ casoId });
  if (isLoading) return <p className="p-4 italic text-neutral-400">Carregando…</p>;

  // Group by papel
  const byPapel = new Map<string, any[]>();
  for (const p of data) {
    const arr = byPapel.get(p.papel) ?? [];
    arr.push(p);
    byPapel.set(p.papel, arr);
  }

  return (
    <div className="p-4 space-y-3">
      <h3 className="text-base font-semibold mb-3">Pessoas do caso ({data.length})</h3>
      {[...byPapel.entries()].map(([papel, items]) => (
        <section key={papel}>
          <h4 className="text-xs font-semibold text-neutral-500 uppercase mb-1">{papel.replace(/-/g, " ")}</h4>
          <div className="flex flex-wrap gap-2">
            {items.map((p: any) => (
              <PessoaChip
                key={p.id}
                pessoaId={p.pessoaId}
                nome={p.pessoaNome ?? `#${p.pessoaId}`}
                papel={p.papel}
                size="sm"
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
```

- [ ] **Step 3: tab-cronologia.tsx (stub)**

```tsx
"use client";

interface Props { casoId: number; }

export function TabCronologia({ casoId }: Props) {
  return (
    <div className="p-4">
      <h3 className="text-base font-semibold mb-3">Cronologia do caso</h3>
      <p className="text-sm italic text-neutral-400">
        Em implementação (X-δ) — vai agregar marcos, prisões e cautelares de todos os processos do caso.
      </p>
    </div>
  );
}
```

Conteúdo real entra em Task 15 (X-δ).

- [ ] **Step 4: Update router de abas**

```tsx
import { TabPessoas } from "../_components/tab-pessoas";
import { TabCronologia } from "../_components/tab-cronologia";

// No switch:
case "pessoas":     return <TabPessoas casoId={casoId} />;
case "cronologia":  return <TabCronologia casoId={casoId} />;
```

- [ ] **Step 5: Typecheck + commit**

```
cd /Users/rodrigorochameire/projetos/Defender
git add 'src/app/(dashboard)/admin/assistidos/[id]/caso/[casoId]/_components/tab-pessoas.tsx' \
        'src/app/(dashboard)/admin/assistidos/[id]/caso/[casoId]/_components/tab-cronologia.tsx' \
        'src/app/(dashboard)/admin/assistidos/[id]/caso/[casoId]/[aba]/page.tsx' \
        src/lib/trpc/routers/pessoas.ts
git commit -m "feat(hierarquia): migrate pessoas + cronologia stub → caso"
```

---

## Task 10: Migrate abas condicionais (delitos, institutos, MPU, execução-penal, atos-infracionais)

**Files:**
- Create: `.../tab-delitos.tsx`
- Create: `.../tab-institutos.tsx`
- Create: `.../tab-mpu.tsx`
- Create: `.../tab-execucao-penal.tsx`
- Create: `.../tab-atos-infracionais.tsx`
- Modify: `[aba]/page.tsx`

- [ ] **Step 1: 5 stubs com mensagem "copy from processo-page"**

Cada aba é um stub que renderiza o conteúdo hoje presente em `/admin/processos/[id]` (que usa `ProcessoTabs`). Como hoje essas abas ficam no processo, migramos o JSX pro caso.

Estrutura comum pra cada uma:

```tsx
"use client";

import { trpc } from "@/lib/trpc/client";

interface Props { casoId: number; }

export function TabDelitos({ casoId }: Props) {
  // Como delitos hoje vive no processo (não no caso), buscar processos do caso
  const { data: processos = [] } = trpc.processos.listByCaso.useQuery({ casoId });
  const procRefId = processos.find((p: any) => p.isReferencia)?.id ?? processos[0]?.id;
  if (!procRefId) return <p className="p-4 italic text-neutral-400">Nenhum processo no caso.</p>;

  // Reusar componente existente de delitos (migrar lógica)
  return (
    <div className="p-4">
      <h3 className="text-base font-semibold mb-3">Delitos / Tipificações</h3>
      <p className="text-sm text-neutral-500">
        Processo referência: #{procRefId}. (Migrar conteúdo da aba "delitos" de /admin/processos/[id])
      </p>
      {/* TODO em X-β iteration: copiar componente atual de delitos do ProcessoTabs */}
    </div>
  );
}
```

Outras 4 (`tab-institutos.tsx`, `tab-mpu.tsx`, `tab-execucao-penal.tsx`, `tab-atos-infracionais.tsx`) seguem o mesmo padrão. Se hoje não existe componente específico em `/admin/processos/[id]`, é placeholder.

**Importante:** edit desses blocos permanece no Nível 3 do processo referência. No Nível 2, mostra read-only.

- [ ] **Step 2: Update router**

```tsx
import { TabDelitos } from "../_components/tab-delitos";
import { TabInstitutos } from "../_components/tab-institutos";
import { TabMpu } from "../_components/tab-mpu";
import { TabExecucaoPenal } from "../_components/tab-execucao-penal";
import { TabAtosInfracionais } from "../_components/tab-atos-infracionais";

case "delitos":            return <TabDelitos casoId={casoId} />;
case "institutos":         return <TabInstitutos casoId={casoId} />;
case "mpu":                return <TabMpu casoId={casoId} />;
case "execucao-penal":     return <TabExecucaoPenal casoId={casoId} />;
case "atos-infracionais":  return <TabAtosInfracionais casoId={casoId} />;
```

- [ ] **Step 3: Commit**

```
git add 'src/app/(dashboard)/admin/assistidos/[id]/caso/[casoId]/_components/' \
        'src/app/(dashboard)/admin/assistidos/[id]/caso/[casoId]/[aba]/page.tsx'
git commit -m "feat(hierarquia): migrate abas condicionais (delitos/institutos/mpu/exec/atos)"
```

---

## Task 11: Toggle "processo referência" no Nível 3

**Files:**
- Create: `src/app/(dashboard)/admin/assistidos/[id]/caso/[casoId]/processo/[procId]/layout.tsx`
- Create: `src/app/(dashboard)/admin/assistidos/[id]/caso/[casoId]/processo/[procId]/page.tsx`

Nota: scaffolding mínimo do Nível 3 fica aqui, pra oferecer o toggle `is_referencia`. Conteúdo completo do Nível 3 entra em X-γ.

- [ ] **Step 1: Nível 3 layout**

```tsx
// src/app/(dashboard)/admin/assistidos/[id]/caso/[casoId]/processo/[procId]/layout.tsx
"use client";

import { useParams } from "next/navigation";
import { trpc } from "@/lib/trpc/client";
import { toast } from "sonner";

export default function ProcessoTecnicoLayout({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const procId = Number(params?.procId);

  const { data: processo, refetch } = trpc.processos.getById.useQuery({ id: procId }, { enabled: !isNaN(procId) });

  const setRefMut = trpc.casos.setReferenciaProcesso.useMutation({
    onSuccess: () => { toast.success("Processo marcado como referência"); refetch(); },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div className="flex flex-col">
      <div className="border-b px-6 py-2 bg-neutral-100 dark:bg-neutral-900 flex items-center gap-3 text-xs">
        <span className="font-mono">#{processo?.numero ?? procId}</span>
        <span className="text-neutral-500">·</span>
        <span>{processo?.area}</span>
        <span className="text-neutral-500">·</span>
        {processo?.isReferencia ? (
          <span className="font-medium text-emerald-700">★ referência do caso</span>
        ) : (
          <button
            type="button"
            onClick={() => setRefMut.mutate({ processoId: procId })}
            disabled={setRefMut.isPending}
            className="px-2 py-0.5 rounded border text-[10px] cursor-pointer hover:border-emerald-400"
          >
            {setRefMut.isPending ? "Marcando…" : "Marcar como referência"}
          </button>
        )}
      </div>
      <div className="flex-1 overflow-auto">{children}</div>
    </div>
  );
}
```

- [ ] **Step 2: Nível 3 page (stub)**

```tsx
// src/app/(dashboard)/admin/assistidos/[id]/caso/[casoId]/processo/[procId]/page.tsx
"use client";

import { useParams } from "next/navigation";
import { trpc } from "@/lib/trpc/client";

export default function ProcessoTecnicoPage() {
  const params = useParams();
  const procId = Number(params?.procId);
  const { data: processo, isLoading } = trpc.processos.getById.useQuery({ id: procId }, { enabled: !isNaN(procId) });

  if (isLoading) return <p className="p-6 italic text-neutral-400">Carregando…</p>;
  if (!processo) return <p className="p-6">Processo não encontrado.</p>;

  return (
    <div className="p-6 space-y-3">
      <h2 className="text-base font-semibold">Dados técnicos</h2>
      <dl className="grid grid-cols-2 gap-3 text-sm">
        <div><dt className="text-xs text-neutral-500">Número CNJ</dt><dd className="font-mono">{processo.numero ?? "—"}</dd></div>
        <div><dt className="text-xs text-neutral-500">Área</dt><dd>{processo.area}</dd></div>
        <div><dt className="text-xs text-neutral-500">Vara</dt><dd>{processo.vara ?? "—"}</dd></div>
        <div><dt className="text-xs text-neutral-500">Juiz</dt><dd>{processo.juiz ?? "—"}</dd></div>
        <div><dt className="text-xs text-neutral-500">Classe</dt><dd>{processo.classe ?? "—"}</dd></div>
      </dl>
      <p className="text-xs italic text-neutral-400 mt-3">
        Abas técnicas (Andamentos, Documentos específicos) entram em X-γ.
      </p>
    </div>
  );
}
```

- [ ] **Step 3: Typecheck + commit**

```
cd /Users/rodrigorochameire/projetos/Defender && npm run typecheck 2>&1 | tail -15
git add 'src/app/(dashboard)/admin/assistidos/[id]/caso/[casoId]/processo/[procId]/'
git commit -m "feat(hierarquia): Nível 3 layout + toggle processo referência"
```

---

# Sub-Fase X-γ · Vista técnica do processo (Tasks 12-13)

## Task 12: Abas técnicas do Nível 3 (Dados CNJ, Andamentos, Documentos)

**Files:**
- Modify: `.../processo/[procId]/layout.tsx` (tab-bar Nível 3)
- Create: `.../processo/[procId]/[aba]/page.tsx`

- [ ] **Step 1: Add tab-bar no ProcessoTecnicoLayout**

Atualizar layout pra incluir tab-bar:

```tsx
// ... (imports)
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const NIVEL_3_TABS = [
  { key: "dados",       label: "Dados CNJ" },
  { key: "andamentos",  label: "Andamentos" },
  { key: "documentos",  label: "Documentos específicos" },
];

export default function ProcessoTecnicoLayout({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const pathname = usePathname();
  const assistidoId = Number(params?.id);
  const casoId = Number(params?.casoId);
  const procId = Number(params?.procId);

  // ... (existing processo query + setRefMut)

  const base = `/admin/assistidos/${assistidoId}/caso/${casoId}/processo/${procId}`;
  const sub = pathname.replace(base, "").replace(/^\//, "").split("/")[0];
  const activeKey = sub === "" ? "dados" : sub;

  return (
    <div className="flex flex-col">
      {/* ... (header existing com toggle referência) */}

      {/* Tab-bar Nível 3 */}
      <nav className="border-b px-6 flex gap-1 bg-white dark:bg-neutral-950">
        {NIVEL_3_TABS.map((t) => {
          const href = t.key === "dados" ? base : `${base}/${t.key}`;
          const isActive = activeKey === t.key;
          return (
            <Link
              key={t.key}
              href={href}
              className={cn(
                "px-3 py-1.5 text-xs border-b-2",
                isActive ? "border-emerald-500 text-emerald-700 font-medium" : "border-transparent text-neutral-500 hover:text-neutral-700",
              )}
            >
              {t.label}
            </Link>
          );
        })}
      </nav>

      <div className="flex-1 overflow-auto">{children}</div>
    </div>
  );
}
```

- [ ] **Step 2: Aba Andamentos (placeholder)**

Create `src/app/(dashboard)/admin/assistidos/[id]/caso/[casoId]/processo/[procId]/andamentos/page.tsx`:

```tsx
"use client";

export default function AndamentosPage() {
  return (
    <div className="p-6">
      <h2 className="text-base font-semibold mb-3">Andamentos</h2>
      <p className="text-sm italic text-neutral-400">
        Integração com PJe ainda não implementada. Lista de movimentações próprias deste autos entra em fase dedicada.
      </p>
    </div>
  );
}
```

- [ ] **Step 3: Aba Documentos específicos**

Create `src/app/(dashboard)/admin/assistidos/[id]/caso/[casoId]/processo/[procId]/documentos/page.tsx`:

```tsx
"use client";

import { useParams } from "next/navigation";
import { trpc } from "@/lib/trpc/client";

export default function DocumentosEspecificosPage() {
  const params = useParams();
  const procId = Number(params?.procId);
  const { data = [], isLoading } = trpc.documentos.listByProcesso.useQuery({ processoId: procId });

  if (isLoading) return <p className="p-6 italic text-neutral-400">Carregando…</p>;
  return (
    <div className="p-6 space-y-2">
      <h2 className="text-base font-semibold mb-3">Documentos deste autos ({data.length})</h2>
      {data.length === 0 && <p className="italic text-neutral-400">Nenhum documento vinculado a este processo específico.</p>}
      {data.map((d: any) => (
        <a key={d.id} href={d.url ?? "#"} target="_blank" rel="noreferrer"
           className="block rounded border px-3 py-2 text-sm hover:border-emerald-400">
          <div className="font-medium">{d.nome}</div>
          <div className="text-xs text-neutral-500">{d.tipo}</div>
        </a>
      ))}
    </div>
  );
}
```

Se `trpc.documentos.listByProcesso` não existe, adicionar procedure simples.

- [ ] **Step 4: Typecheck + commit**

```
cd /Users/rodrigorochameire/projetos/Defender && npm run typecheck 2>&1 | tail -15
git add 'src/app/(dashboard)/admin/assistidos/[id]/caso/[casoId]/processo/[procId]/' \
        src/lib/trpc/routers/documentos.ts 2>/dev/null
git commit -m "feat(hierarquia): abas técnicas Nível 3 (dados/andamentos/documentos)"
```

---

## Task 13: Redirect legado `/admin/processos/[id]` + `?raw=1`

**Files:**
- Modify: `src/app/(dashboard)/admin/processos/[id]/page.tsx` (já parcialmente feito em Task 5)

- [ ] **Step 1: Finalizar redirect com casoId fetch**

Verificar que `src/app/(dashboard)/admin/processos/[id]/page.tsx` (editado em Task 5) usa `processo.casoId` pra montar o redirect target. Se `processo.assistidoId` não está direto, fazer fetch auxiliar de caso:

```tsx
"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { trpc } from "@/lib/trpc/client";

export default function ProcessoPage() {
  const params = useParams();
  const router = useRouter();
  const sp = useSearchParams();
  const raw = sp?.get("raw") === "1";
  const id = Number(params?.id);

  const { data: processo, isLoading: loadingProc } = trpc.processos.getById.useQuery({ id }, { enabled: !isNaN(id) });
  const { data: caso } = trpc.casos.getCasoById.useQuery(
    { id: processo?.casoId ?? 0 },
    { enabled: !!processo?.casoId && !raw },
  );

  useEffect(() => {
    if (raw || loadingProc || !processo) return;
    if (caso?.assistidoId && processo.casoId) {
      router.replace(`/admin/assistidos/${caso.assistidoId}/caso/${processo.casoId}/processo/${id}`);
    }
  }, [raw, loadingProc, processo, caso, id, router]);

  if (loadingProc) return <p className="p-6 italic text-neutral-400">Carregando…</p>;
  if (!processo) return <p className="p-6">Processo não encontrado.</p>;

  // Vista técnica standalone (raw=1 ou sem caso)
  return (
    <div className="p-6 space-y-3 max-w-3xl">
      <h1 className="text-lg font-semibold">Processo #{id}</h1>
      <dl className="grid grid-cols-2 gap-3 text-sm">
        <div><dt className="text-xs text-neutral-500">Número CNJ</dt><dd className="font-mono">{processo.numero ?? "—"}</dd></div>
        <div><dt className="text-xs text-neutral-500">Área</dt><dd>{processo.area}</dd></div>
        <div><dt className="text-xs text-neutral-500">Vara</dt><dd>{processo.vara ?? "—"}</dd></div>
        <div><dt className="text-xs text-neutral-500">Juiz</dt><dd>{processo.juiz ?? "—"}</dd></div>
      </dl>
      {!raw && !processo.casoId && (
        <p className="text-xs italic text-amber-600">Processo sem caso vinculado — vista standalone.</p>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Manual smoke**

```
cd /Users/rodrigorochameire/projetos/Defender && npm run dev:webpack
# Teste 1: /admin/processos/<id> com casoId → redireciona pra nested URL
# Teste 2: /admin/processos/<id>?raw=1 → fica standalone
# Teste 3: /admin/processos/<id> sem casoId → fica standalone com warning amber
```

- [ ] **Step 3: Commit**

```
git add 'src/app/(dashboard)/admin/processos/[id]/page.tsx'
git commit -m "feat(hierarquia): finaliza redirect /processos/[id] + ?raw=1 (X-γ)"
```

---

# Sub-Fase X-δ · Cronologia agregada no caso (Tasks 14-15)

## Task 14: tRPC `getCronologiaDoCaso` (TDD)

**Files:**
- Modify: `src/lib/trpc/routers/cronologia.ts`
- Modify: `__tests__/trpc/cronologia-router.test.ts`

- [ ] **Step 1: Append failing test**

```ts
describe("cronologia.getCronologiaDoCaso", { timeout: 30000 }, () => {
  it("agrega marcos+prisões+cautelares de todos processos do caso", async () => {
    const user = await makeUser();
    try {
      const caller = createCaller(mkCtx(user));
      const wid = user.workspaceId ?? 1;
      // Cria caso com 2 processos
      const [c] = await db.insert(casos).values({ workspaceId: wid, titulo: "T" }).returning({ id: casos.id });
      const [p1] = await db.insert(processos).values({ workspaceId: wid, casoId: c.id, area: "JURI" }).returning({ id: processos.id });
      const [p2] = await db.insert(processos).values({ workspaceId: wid, casoId: c.id, area: "JURI" }).returning({ id: processos.id });
      try {
        await caller.cronologia.createMarco({ processoId: p1.id, tipo: "fato", data: "2025-01-01" });
        await caller.cronologia.createMarco({ processoId: p2.id, tipo: "denuncia", data: "2025-03-01" });
        await caller.cronologia.createPrisao({ processoId: p1.id, tipo: "preventiva", dataInicio: "2025-02-01" });

        const agg = await caller.cronologia.getCronologiaDoCaso({ casoId: c.id });
        expect(agg.marcos).toHaveLength(2);
        expect(agg.prisoes).toHaveLength(1);
        expect(agg.cautelares).toHaveLength(0);
        // Marcos ordenados por data asc
        expect(agg.marcos[0].data).toBe("2025-01-01");
      } finally {
        await db.delete(marcosProcessuais).where(inArray(marcosProcessuais.processoId, [p1.id, p2.id]));
        await db.delete(prisoes).where(inArray(prisoes.processoId, [p1.id, p2.id]));
        await db.delete(processos).where(eq(processos.casoId, c.id));
        await db.delete(casos).where(eq(casos.id, c.id));
      }
    } finally {
      await db.delete(users).where(eq(users.id, user.id));
    }
  });
});
```

Importar `casos` e `inArray` se faltarem.

- [ ] **Step 2: Run FAIL**

- [ ] **Step 3: Add procedure**

Em `src/lib/trpc/routers/cronologia.ts`:

```ts
import { inArray } from "drizzle-orm";
import { casos } from "@/lib/db/schema";

// ... dentro do router:
  getCronologiaDoCaso: protectedProcedure
    .input(z.object({ casoId: z.number() }))
    .query(async ({ input, ctx }) => {
      const wid = ctx.user.workspaceId ?? 1;
      // Verifica ACL do caso
      const [caso] = await db.select({ id: casos.id })
        .from(casos)
        .where(and(eq(casos.id, input.casoId), eq(casos.workspaceId, wid)))
        .limit(1);
      if (!caso) throw new Error("Caso não encontrado");

      const procs = await db.select({ id: processos.id })
        .from(processos)
        .where(and(eq(processos.casoId, input.casoId), eq(processos.workspaceId, wid)));
      if (procs.length === 0) return { marcos: [], prisoes: [], cautelares: [] };
      const procIds = procs.map((p) => p.id);

      const [marcos, prisoesRows, cautelaresRows] = await Promise.all([
        db.select().from(marcosProcessuais)
          .where(inArray(marcosProcessuais.processoId, procIds))
          .orderBy(marcosProcessuais.data),
        db.select().from(prisoes)
          .where(inArray(prisoes.processoId, procIds))
          .orderBy(desc(prisoes.dataInicio)),
        db.select().from(cautelares)
          .where(inArray(cautelares.processoId, procIds))
          .orderBy(desc(cautelares.dataInicio)),
      ]);
      return { marcos, prisoes: prisoesRows, cautelares: cautelaresRows };
    }),
```

- [ ] **Step 4: Run PASS (7 tests cronologia)**

- [ ] **Step 5: Commit**

```
cd /Users/rodrigorochameire/projetos/Defender
git add src/lib/trpc/routers/cronologia.ts __tests__/trpc/cronologia-router.test.ts
git commit -m "feat(hierarquia): tRPC getCronologiaDoCaso agregado"
```

---

## Task 15: Cronologia tab Nível 2 (read-only) + Situação atual block

**Files:**
- Modify: `.../tab-cronologia.tsx` (era stub, virar conteúdo real)
- Create: `src/components/hierarquia/situacao-atual-block.tsx`
- Modify: `src/app/(dashboard)/admin/assistidos/[id]/caso/[casoId]/layout.tsx` (ou page.tsx — render no topo do caso)

- [ ] **Step 1: tab-cronologia.tsx real**

Replace o stub com:

```tsx
"use client";

import { trpc } from "@/lib/trpc/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Props { casoId: number; }

export function TabCronologia({ casoId }: Props) {
  const { data, isLoading } = trpc.cronologia.getCronologiaDoCaso.useQuery({ casoId });
  if (isLoading) return <p className="p-4 italic text-neutral-400">Carregando…</p>;
  const marcos = data?.marcos ?? [];
  const prisoesData = data?.prisoes ?? [];
  const cautelares = data?.cautelares ?? [];

  return (
    <div className="p-4 space-y-6">
      <section>
        <h3 className="text-base font-semibold mb-2">Marcos ({marcos.length})</h3>
        {marcos.length === 0 ? (
          <p className="italic text-neutral-400 text-sm">Nenhum marco.</p>
        ) : (
          <div className="space-y-1">
            {marcos.map((m: any) => (
              <div key={m.id} className="text-sm">
                <strong>{format(new Date(m.data), "dd/MM/yyyy", { locale: ptBR })}</strong>
                {" · "}{m.tipo.replace(/-/g, " ")}
                <span className="text-[10px] text-neutral-400 ml-2">(processo #{m.processoId})</span>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h3 className="text-base font-semibold mb-2">Prisões ({prisoesData.length})</h3>
        {prisoesData.length === 0 ? (
          <p className="italic text-neutral-400 text-sm">Nenhuma.</p>
        ) : (
          <div className="space-y-1 text-sm">
            {prisoesData.map((p: any) => (
              <div key={p.id}>
                <strong>{format(new Date(p.dataInicio), "dd/MM/yyyy", { locale: ptBR })}</strong>
                {p.dataFim && <> — {format(new Date(p.dataFim), "dd/MM/yyyy", { locale: ptBR })}</>}
                {" · "}{p.tipo} <em>({p.situacao})</em>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h3 className="text-base font-semibold mb-2">Cautelares ({cautelares.length})</h3>
        {cautelares.length === 0 ? (
          <p className="italic text-neutral-400 text-sm">Nenhuma.</p>
        ) : (
          <div className="space-y-1 text-sm">
            {cautelares.map((c: any) => (
              <div key={c.id}>
                <strong>{format(new Date(c.dataInicio), "dd/MM/yyyy", { locale: ptBR })}</strong>
                {" · "}{c.tipo.replace(/-/g, " ")} <em>({c.status})</em>
              </div>
            ))}
          </div>
        )}
      </section>

      <p className="text-[11px] italic text-neutral-400 pt-2 border-t">
        Read-only. Edit em /admin/assistidos/.../caso/.../processo/[id] do processo correspondente.
      </p>
    </div>
  );
}
```

- [ ] **Step 2: SituacaoAtualBlock**

Create `src/components/hierarquia/situacao-atual-block.tsx`:

```tsx
"use client";

import { trpc } from "@/lib/trpc/client";
import { differenceInDays, format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Props { casoId: number; }

export function SituacaoAtualBlock({ casoId }: Props) {
  const { data } = trpc.cronologia.getCronologiaDoCaso.useQuery({ casoId });
  const prisaoAtiva = data?.prisoes.find((p: any) => p.situacao === "ativa");
  const cautelaresAtivas = (data?.cautelares ?? []).filter((c: any) => c.status === "ativa");

  if (!prisaoAtiva && cautelaresAtivas.length === 0) return null;

  return (
    <div className="border-l-4 border-rose-500 bg-rose-50 dark:bg-rose-950/20 px-4 py-2 text-sm">
      {prisaoAtiva && (
        <div className="font-medium text-rose-700 dark:text-rose-300">
          Preso desde {format(new Date(prisaoAtiva.dataInicio), "dd/MM/yyyy", { locale: ptBR })}
          {" ("}{differenceInDays(new Date(), new Date(prisaoAtiva.dataInicio))} dias)
          {" · "}{prisaoAtiva.tipo}
        </div>
      )}
      {cautelaresAtivas.length > 0 && (
        <div className="text-xs text-rose-600 dark:text-rose-400 mt-0.5">
          {cautelaresAtivas.length} cautelar{cautelaresAtivas.length !== 1 ? "es" : ""} ativa{cautelaresAtivas.length !== 1 ? "s" : ""}:
          {" "}{cautelaresAtivas.map((c: any) => c.tipo.replace(/-/g, " ")).join(", ")}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Export + render no CasoLayout**

Em `src/components/hierarquia/index.ts`:
```ts
export { SituacaoAtualBlock } from "./situacao-atual-block";
```

Em `src/app/(dashboard)/admin/assistidos/[id]/caso/[casoId]/layout.tsx`, adicionar o bloco ANTES da tab-bar:

```tsx
import { SituacaoAtualBlock } from "@/components/hierarquia";

// ... dentro do JSX, antes da <nav> tab-bar:
<SituacaoAtualBlock casoId={casoId} />
```

- [ ] **Step 4: Test SituacaoAtualBlock (opcional, mas recomendado)**

Create `__tests__/components/hierarquia/situacao-atual-block.test.tsx` com mocks simples cobrindo 3 casos: prisão ativa, cautelares ativas, nada ativo (retorna null).

- [ ] **Step 5: Manual smoke + commit**

```
cd /Users/rodrigorochameire/projetos/Defender
git add 'src/app/(dashboard)/admin/assistidos/[id]/caso/[casoId]/_components/tab-cronologia.tsx' \
        src/components/hierarquia/situacao-atual-block.tsx \
        src/components/hierarquia/index.ts \
        'src/app/(dashboard)/admin/assistidos/[id]/caso/[casoId]/layout.tsx' \
        __tests__/components/hierarquia/situacao-atual-block.test.tsx 2>/dev/null
git commit -m "feat(hierarquia): cronologia agregada + SituacaoAtualBlock (X-δ)"
```

---

## Task 16: Regression + cleanup + manual verification

- [ ] **Step 1: Remove legado não usado**

Se `page.legacy.tsx.bak` já não é necessário (abas migradas), deixar por 1 sprint e deletar depois. Por ora, manter.

Remover imports/código morto em arquivos editados (ex: abas hardcoded em `ProcessoTabs` se ainda existirem).

- [ ] **Step 2: Regressão smoke**

Run suite completa:
```
cd /Users/rodrigorochameire/projetos/Defender && npm run test 2>&1 | tail -30
```

Expected: todos os testes que passavam antes continuam passando + novos testes passam.

- [ ] **Step 3: Manual verification checklist**

```
cd /Users/rodrigorochameire/projetos/Defender
rm -rf .next/cache && npm run dev:webpack
```

Checklist:
- [ ] `/admin/assistidos/[id]` renderiza layout novo; se 1 caso ativo, auto-redireciona pra `/caso/[casoId]`
- [ ] `/admin/assistidos/[id]/casos` lista casos do assistido
- [ ] `/admin/assistidos/[id]/caso/[casoId]` renderiza CasoLayout com `CaseSwitcher` + tabs condicionais por area
- [ ] Assistido com 2+ casos: `CaseSwitcher` dropdown funciona
- [ ] Caso em VVD: mostra aba `MPU`, oculta `Institutos` e `Atos Infracionais`
- [ ] Caso em JURI: mostra `Delitos` + `Institutos`, oculta `MPU`
- [ ] Caso em EXECUCAO_PENAL: mostra `Execução Penal`
- [ ] Abas `demandas`, `oficios`, `atendimentos`, `audiencias`, `documentos`, `midias`, `pessoas`, `cronologia`, `investigacao` carregam no caso
- [ ] `SituacaoAtualBlock` aparece no topo do caso se há prisão/cautelar ativa
- [ ] `/admin/assistidos/[id]/caso/[casoId]/processo/[procId]` renderiza Nível 3 com toggle "marcar como referência"
- [ ] Click no toggle: processo vira referência; outros do mesmo caso desmarcam
- [ ] `/admin/processos/[id]` redireciona pra nested URL
- [ ] `/admin/processos/[id]?raw=1` fica standalone
- [ ] Typecheck limpo
- [ ] Todos os testes passam

- [ ] **Step 4: Commit final**

```
cd /Users/rodrigorochameire/projetos/Defender
git commit --allow-empty -m "chore(hierarquia): Fase X validada manualmente"
```

---

## Self-Review

**Spec coverage:**

| Spec | Task |
|---|---|
| X-α: Migration is_referencia | Task 1 |
| X-α: tRPC getCasosDoAssistido/getCasoById/setReferencia | Task 2 |
| X-α: AssistidoLayout | Task 3 |
| X-α: CasoLayout | Task 3 |
| X-α: CaseSwitcher + Nível 1 Casos tab | Task 4 |
| X-α: auto-redirect + processos/[id] compat | Task 5 |
| X-β: inferCasoArea | Task 6 |
| X-β: useVisibleCasoTabs hook | Task 6 |
| X-β: migrate demandas/oficios/atendimentos/investigação | Task 7 |
| X-β: unify audiências/documentos/mídias | Task 8 |
| X-β: pessoas aggregated no caso | Task 9 |
| X-β: cronologia stub no caso (real em X-δ) | Task 9 |
| X-β: abas condicionais (delitos/institutos/MPU/exec/atos) | Task 10 |
| X-β: toggle is_referencia no Nível 3 | Task 11 |
| X-γ: abas técnicas Nível 3 | Task 12 |
| X-γ: redirect legado | Task 13 |
| X-δ: getCronologiaDoCaso | Task 14 |
| X-δ: cronologia tab + SituacaoAtualBlock | Task 15 |
| Regressão + cleanup | Task 16 |

Cobertura completa da spec.

**Placeholders:** algumas abas Nível 2 (delitos/institutos/etc) têm "copiar conteúdo do legacy" como instrução — isso é legítimo porque o JSX existente é longo e precisa migração contextual. Implementer subagent pode inspecionar o bak file ou os componentes existentes em `/admin/processos/[id]` e copiar. Não é um placeholder de "esquecer" — é migração prática.

**Type consistency:**
- `Area` type exportado em Task 6 (`infer-caso-area.ts`) é usado em Task 6 (visible-caso-tabs) e Task 9 (enriquecimento futuro de pessoas)
- `CasoTab` interface em Task 6 consumida por `CasoLayout` em Task 3 (via hook retornando array de CasoTab)
- Signatures de `isReferencia: boolean` consistentes em schema TS (Task 1), tRPC (Task 2), layout (Task 11)

**Risco técnico documentado:**
- Task 7/8/9/10 dependem de procedures `trpc.<router>.listByCaso` que podem ou não existir. Implementer deve inspecionar e criar se faltarem, seguindo padrão simples (query por caso_id + ACL workspace).
- `processo.assistidoId` pode não existir — fetch assistidoId via `casos.assistidoId` (já tratado em Task 13).
- `page.legacy.tsx.bak` mantido como referência até confirmação manual.

Plano coerente. 16 tasks, ~18 commits esperados. Execução sequencial em ordem.
