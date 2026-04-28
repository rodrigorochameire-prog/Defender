# Timeline de Eventos da Demanda — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Substituir o campo de texto livre `demandas.providencias` por uma timeline estruturada (`demanda_eventos`) com 3 tipos de evento (atendimento, diligência, observação), refazer o card do kanban e o drawer da demanda para consumir essa timeline, mover a triagem do dashboard para uma página própria.

**Architecture:** Tabela polimórfica `demanda_eventos` com discriminator `tipo`; tabela N:N `atendimento_demandas` para vincular atendimentos existentes; novo router tRPC `demandaEventos`; refactor incremental de `kanban-premium.tsx` (card) e `demanda-timeline-drawer.tsx` (drawer) consumindo o router; nova rota `/admin/triagem`; integrações cross-OMBUDS via consultas adicionais ao mesmo router.

**Tech Stack:** Next.js 15 (App Router), tRPC v11, Drizzle ORM, PostgreSQL/Supabase, Tailwind, vitest, Playwright (E2E), shadcn/ui.

**Spec:** `docs/superpowers/specs/2026-04-27-demanda-eventos-timeline-design.md`

**Notas de contexto importantes:**

- Já existe uma tabela `diligencias` em `src/lib/db/schema/investigacao.ts` — domínio diferente (investigação OSINT). NÃO mexer nela. O `tipo='diligencia'` no novo `demanda_eventos` é independente.
- Já existe `atendimentos` em `src/lib/db/schema/agenda.ts` com pipeline Plaud — NÃO mexer no schema. Apenas adicionar a tabela N:N e hook na criação.
- Routers tRPC ficam em `src/lib/trpc/routers/` e são registrados em `src/lib/trpc/routers/index.ts:89` (`appRouter`).
- Tests vitest ficam em `__tests__/trpc/` para routers e `__tests__/unit/` para utilitários puros.
- Migrations Drizzle: `npm run db:generate` produz SQL em `drizzle/`; `npm run db:push` aplica.

---

## File Structure

**Novos:**
- `src/lib/db/schema/demanda-eventos.ts` — schema da nova tabela + N:N + tipos
- `src/lib/trpc/routers/demanda-eventos.ts` — router tRPC
- `src/lib/trpc/zod/demanda-eventos.ts` — zod schemas (discriminated union)
- `scripts/backfill-demanda-eventos.ts` — script one-shot de migração
- `src/app/(dashboard)/admin/triagem/page.tsx` — nova página
- `src/components/triagem/triagem-list.tsx` — lista de demandas em triagem
- `src/components/demanda-eventos/event-line.tsx` — render compacto 1-linha (reutilizado em card e drawer)
- `src/components/demanda-eventos/event-form-diligencia.tsx`
- `src/components/demanda-eventos/event-form-atendimento.tsx`
- `src/components/demanda-eventos/event-form-observacao.tsx`
- `__tests__/unit/demanda-eventos-zod.test.ts`
- `__tests__/trpc/demanda-eventos-router.test.ts`
- `__tests__/unit/demanda-eventos-render.test.ts`

**Modificados:**
- `src/lib/db/schema/index.ts` — exportar novo schema
- `src/lib/db/schema/relations.ts` — relations das novas tabelas
- `src/lib/trpc/routers/index.ts:89` — registrar `demandaEventos: demandaEventosRouter` no appRouter
- `src/lib/trpc/routers/atendimentos.ts` — hook em `create`/`update` com `processoId` para vincular automaticamente
- `src/components/demandas-premium/kanban-premium.tsx:357-365` — substituir bloco `providenciaResumo` por linha de evento + linha de pendência
- `src/components/demandas-premium/demanda-timeline-drawer.tsx` — refatoração total (158 linhas → tabs + FAB + forms)
- `src/components/demandas-premium/demandas-premium-view.tsx` — substituir consumo de `providencias`/`providenciaResumo` por `lastEvento`/`pendenteEvento`; remover handler `handleProvidenciasChange` (linhas 1078-1093) ou redirecionar pra novo router
- `src/app/(dashboard)/admin/page.tsx:21` — remover `<AtendimentosPendentesCard>`
- `src/components/layout/sidebar.tsx` (ou equivalente) — adicionar badge de contagem em "Demandas"
- `src/app/(dashboard)/admin/assistidos/[id]/page.tsx` — nova aba "Histórico"
- `src/app/(dashboard)/admin/processos/[id]/page.tsx` — seção timeline agregada

---

## Phase 1 — Fundação (DB)

### Task 1: Schema das novas tabelas

**Files:**
- Create: `src/lib/db/schema/demanda-eventos.ts`
- Modify: `src/lib/db/schema/index.ts`
- Modify: `src/lib/db/schema/relations.ts`
- Test: `__tests__/unit/demanda-eventos-schema.test.ts`

- [ ] **Step 1: Criar arquivo de schema**

```ts
// src/lib/db/schema/demanda-eventos.ts
import {
  pgTable, serial, integer, varchar, text, timestamp, date, primaryKey,
  index, check, pgEnum
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { demandas } from "./core";
import { atendimentos } from "./agenda";
import { users } from "./core";

export const demandaEventoTipoEnum = pgEnum("demanda_evento_tipo", [
  "atendimento",
  "diligencia",
  "observacao",
]);

export const demandaEventos = pgTable("demanda_eventos", {
  id: serial("id").primaryKey(),
  demandaId: integer("demanda_id").notNull()
    .references(() => demandas.id, { onDelete: "cascade" }),
  tipo: demandaEventoTipoEnum("tipo").notNull(),
  subtipo: varchar("subtipo", { length: 30 }),
  status: varchar("status", { length: 20 }),
  resumo: varchar("resumo", { length: 140 }).notNull(),
  descricao: text("descricao"),
  prazo: date("prazo"),
  responsavelId: integer("responsavel_id").references(() => users.id),
  atendimentoId: integer("atendimento_id")
    .references(() => atendimentos.id, { onDelete: "set null" }),
  autorId: integer("autor_id").notNull().references(() => users.id),
  dataConclusao: timestamp("data_conclusao"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  deletedAt: timestamp("deleted_at"),
}, (table) => [
  index("demanda_eventos_demanda_created_idx")
    .on(table.demandaId, table.createdAt.desc()),
  index("demanda_eventos_pendentes_idx")
    .on(table.demandaId, table.tipo, table.status),
  index("demanda_eventos_autor_idx").on(table.autorId, table.createdAt.desc()),
  index("demanda_eventos_prazo_idx").on(table.prazo),
  index("demanda_eventos_atendimento_idx").on(table.atendimentoId),
  index("demanda_eventos_deleted_idx").on(table.deletedAt),
  check(
    "demanda_eventos_diligencia_only",
    sql`${table.tipo} = 'diligencia' OR (${table.subtipo} IS NULL AND ${table.status} IS NULL AND ${table.prazo} IS NULL)`
  ),
  check(
    "demanda_eventos_atendimento_only",
    sql`${table.tipo} = 'atendimento' OR ${table.atendimentoId} IS NULL`
  ),
]);

export const atendimentoDemandas = pgTable("atendimento_demandas", {
  atendimentoId: integer("atendimento_id").notNull()
    .references(() => atendimentos.id, { onDelete: "cascade" }),
  demandaId: integer("demanda_id").notNull()
    .references(() => demandas.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  primaryKey({ columns: [table.atendimentoId, table.demandaId] }),
  index("atendimento_demandas_demanda_idx").on(table.demandaId),
]);

export type DemandaEvento = typeof demandaEventos.$inferSelect;
export type InsertDemandaEvento = typeof demandaEventos.$inferInsert;
export type AtendimentoDemanda = typeof atendimentoDemandas.$inferSelect;

export const DEMANDA_EVENTO_TIPOS = ["atendimento","diligencia","observacao"] as const;
export const DILIGENCIA_SUBTIPOS = ["peticao","contato_cartorio","contato_orgao","juntada","recurso","outro"] as const;
export const DILIGENCIA_STATUS = ["pendente","feita","cancelada"] as const;
```

- [ ] **Step 2: Exportar pelo barrel**

Adicionar ao final de `src/lib/db/schema/index.ts`:

```ts
export * from "./demanda-eventos";
```

- [ ] **Step 3: Adicionar relations**

Adicionar ao final de `src/lib/db/schema/relations.ts`:

```ts
import { relations } from "drizzle-orm";
import { demandaEventos, atendimentoDemandas } from "./demanda-eventos";
import { demandas } from "./core";
import { atendimentos } from "./agenda";
import { users } from "./core";

export const demandaEventosRelations = relations(demandaEventos, ({ one }) => ({
  demanda: one(demandas, { fields: [demandaEventos.demandaId], references: [demandas.id] }),
  autor: one(users, { fields: [demandaEventos.autorId], references: [users.id], relationName: "evento_autor" }),
  responsavel: one(users, { fields: [demandaEventos.responsavelId], references: [users.id], relationName: "evento_responsavel" }),
  atendimento: one(atendimentos, { fields: [demandaEventos.atendimentoId], references: [atendimentos.id] }),
}));

export const atendimentoDemandasRelations = relations(atendimentoDemandas, ({ one }) => ({
  atendimento: one(atendimentos, { fields: [atendimentoDemandas.atendimentoId], references: [atendimentos.id] }),
  demanda: one(demandas, { fields: [atendimentoDemandas.demandaId], references: [demandas.id] }),
}));
```

- [ ] **Step 4: Teste de tipos (sanity check em runtime)**

```ts
// __tests__/unit/demanda-eventos-schema.test.ts
import { describe, it, expect } from "vitest";
import {
  demandaEventos, atendimentoDemandas,
  DEMANDA_EVENTO_TIPOS, DILIGENCIA_SUBTIPOS, DILIGENCIA_STATUS,
} from "@/lib/db/schema/demanda-eventos";

describe("demanda_eventos schema", () => {
  it("expõe os 3 tipos", () => {
    expect(DEMANDA_EVENTO_TIPOS).toEqual(["atendimento","diligencia","observacao"]);
  });
  it("expõe 6 subtipos de diligência", () => {
    expect(DILIGENCIA_SUBTIPOS).toHaveLength(6);
  });
  it("expõe 3 status de diligência", () => {
    expect(DILIGENCIA_STATUS).toEqual(["pendente","feita","cancelada"]);
  });
  it("table.demandaId tem FK obrigatória", () => {
    const col = demandaEventos.demandaId;
    expect(col.notNull).toBe(true);
  });
  it("atendimentoDemandas tem PK composta", () => {
    expect(atendimentoDemandas.atendimentoId).toBeDefined();
    expect(atendimentoDemandas.demandaId).toBeDefined();
  });
});
```

- [ ] **Step 5: Rodar test**

```bash
npm test -- demanda-eventos-schema
```

Expected: PASS (5 testes).

- [ ] **Step 6: Commit**

```bash
git add src/lib/db/schema/demanda-eventos.ts \
  src/lib/db/schema/index.ts \
  src/lib/db/schema/relations.ts \
  __tests__/unit/demanda-eventos-schema.test.ts
git commit -m "feat(demanda-eventos): add schema for timeline events"
```

---

### Task 2: Migration SQL

**Files:**
- Create: `drizzle/00XX_demanda_eventos.sql` (gerado por drizzle-kit)

- [ ] **Step 1: Gerar migration**

```bash
npm run db:generate
```

Expected: novo arquivo em `drizzle/` com `CREATE TYPE demanda_evento_tipo`, `CREATE TABLE demanda_eventos`, `CREATE TABLE atendimento_demandas`, indexes e checks.

- [ ] **Step 2: Inspecionar migration gerada**

Abrir o arquivo SQL gerado. Verificar que tem:
- `CREATE TYPE "public"."demanda_evento_tipo" AS ENUM('atendimento','diligencia','observacao')`
- `CREATE TABLE "demanda_eventos" (...)` com FK em demandas/atendimentos/users com cascade correto
- `CREATE TABLE "atendimento_demandas" (...)` com PK composta
- 6 índices em `demanda_eventos`, 1 em `atendimento_demandas`
- 2 CHECK constraints

Se faltar algo (ex: drizzle-kit não emitiu o `check()` corretamente), ajustar o SQL manualmente.

- [ ] **Step 3: Aplicar em ambiente local/dev**

```bash
npm run db:push
```

Expected: confirmação de que tabelas foram criadas. Sem prompts destrutivos.

- [ ] **Step 4: Verificar no Studio**

```bash
npm run db:studio
```

Confirmar visualmente que `demanda_eventos` e `atendimento_demandas` existem.

- [ ] **Step 5: Commit**

```bash
git add drizzle/
git commit -m "feat(demanda-eventos): generate and apply migration"
```

---

### Task 3: Backfill dos dados existentes

**Files:**
- Create: `scripts/backfill-demanda-eventos.ts`
- Test: `__tests__/unit/backfill-demanda-eventos.test.ts`

- [ ] **Step 1: Escrever teste do backfill (em transação rollback)**

```ts
// __tests__/unit/backfill-demanda-eventos.test.ts
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { db } from "@/lib/db";
import { demandas } from "@/lib/db/schema/core";
import { demandaEventos } from "@/lib/db/schema/demanda-eventos";
import { eq } from "drizzle-orm";
import { backfillDemandaEventos } from "@/../scripts/backfill-demanda-eventos";

describe("backfillDemandaEventos", () => {
  it("cria 1 evento diligencia/outro/feita por demanda com providencias", async () => {
    // Pré-condição: pegar uma demanda real com providencias preenchida
    const [d] = await db.select().from(demandas)
      .where(/* providencias IS NOT NULL */ /* TODO: usar isNotNull */)
      .limit(1);
    if (!d) return; // sem dados para testar

    const result = await backfillDemandaEventos({ dryRun: true });
    expect(result.toCreate).toBeGreaterThan(0);
    expect(result.errors).toHaveLength(0);
  });
});
```

(Se preferir teste com seed isolado, pode pular este e validar manualmente em dev — o script tem `--dry-run`.)

- [ ] **Step 2: Implementar script com `--dry-run`**

```ts
// scripts/backfill-demanda-eventos.ts
import { db } from "@/lib/db";
import { demandas } from "@/lib/db/schema/core";
import { demandaEventos } from "@/lib/db/schema/demanda-eventos";
import { and, isNotNull, isNull, ne, sql } from "drizzle-orm";

export async function backfillDemandaEventos(opts: { dryRun?: boolean } = {}) {
  const rows = await db.select({
    id: demandas.id,
    providencias: demandas.providencias,
    providenciaResumo: demandas.providenciaResumo,
    defensorId: demandas.defensorId,
    updatedAt: demandas.updatedAt,
  })
    .from(demandas)
    .where(and(
      isNotNull(demandas.providencias),
      ne(demandas.providencias, ""),
      isNull(demandas.deletedAt)
    ));

  const toInsert = rows.map(r => ({
    demandaId: r.id,
    tipo: "diligencia" as const,
    subtipo: "outro",
    status: "feita",
    resumo: (r.providenciaResumo?.trim() || r.providencias!.slice(0, 140)),
    descricao: r.providencias,
    autorId: r.defensorId ?? 1,
    createdAt: r.updatedAt ?? new Date(),
    updatedAt: r.updatedAt ?? new Date(),
    dataConclusao: r.updatedAt ?? new Date(),
  }));

  if (opts.dryRun) {
    return { toCreate: toInsert.length, errors: [] };
  }

  // Insert em batches de 500 para evitar payload grande
  let inserted = 0;
  for (let i = 0; i < toInsert.length; i += 500) {
    const batch = toInsert.slice(i, i + 500);
    await db.insert(demandaEventos).values(batch);
    inserted += batch.length;
  }
  return { toCreate: toInsert.length, inserted, errors: [] };
}

if (require.main === module) {
  const dryRun = process.argv.includes("--dry-run");
  backfillDemandaEventos({ dryRun }).then(r => {
    console.log(JSON.stringify(r, null, 2));
    process.exit(0);
  }).catch(e => {
    console.error(e);
    process.exit(1);
  });
}
```

- [ ] **Step 3: Rodar dry-run em dev**

```bash
npx tsx scripts/backfill-demanda-eventos.ts --dry-run
```

Expected: imprime `{ "toCreate": <N>, "errors": [] }`. Conferir que N bate com `SELECT count(*) FROM demandas WHERE providencias IS NOT NULL AND providencias != '' AND deleted_at IS NULL`.

- [ ] **Step 4: Rodar backfill real**

```bash
npx tsx scripts/backfill-demanda-eventos.ts
```

Expected: `{ "toCreate": N, "inserted": N, "errors": [] }`.

- [ ] **Step 5: Verificar no banco**

```sql
SELECT tipo, subtipo, status, COUNT(*) FROM demanda_eventos GROUP BY 1,2,3;
```

Expected: 1 linha `(diligencia, outro, feita, N)` com N == toCreate.

- [ ] **Step 6: Commit**

```bash
git add scripts/backfill-demanda-eventos.ts __tests__/unit/backfill-demanda-eventos.test.ts
git commit -m "feat(demanda-eventos): backfill script for legacy providencias"
```

---

## Phase 2 — Backend (tRPC)

### Task 4: Zod schemas (discriminated union)

**Files:**
- Create: `src/lib/trpc/zod/demanda-eventos.ts`
- Test: `__tests__/unit/demanda-eventos-zod.test.ts`

- [ ] **Step 1: Escrever testes**

```ts
// __tests__/unit/demanda-eventos-zod.test.ts
import { describe, it, expect } from "vitest";
import { createEventoSchema, updateEventoSchema } from "@/lib/trpc/zod/demanda-eventos";

describe("createEventoSchema", () => {
  it("aceita diligencia feita sem prazo", () => {
    const r = createEventoSchema.safeParse({
      demandaId: 1, tipo: "diligencia", subtipo: "peticao",
      status: "feita", resumo: "Petição protocolada",
    });
    expect(r.success).toBe(true);
  });
  it("rejeita diligencia pendente sem prazo", () => {
    const r = createEventoSchema.safeParse({
      demandaId: 1, tipo: "diligencia", subtipo: "peticao",
      status: "pendente", resumo: "Protocolar petição",
    });
    expect(r.success).toBe(false);
  });
  it("aceita atendimento com atendimentoId", () => {
    const r = createEventoSchema.safeParse({
      demandaId: 1, tipo: "atendimento", atendimentoId: 99,
      resumo: "Reunião com assistido",
    });
    expect(r.success).toBe(true);
  });
  it("rejeita observacao com subtipo", () => {
    const r = createEventoSchema.safeParse({
      demandaId: 1, tipo: "observacao", subtipo: "peticao",
      resumo: "nota",
    });
    expect(r.success).toBe(false);
  });
  it("rejeita resumo vazio", () => {
    const r = createEventoSchema.safeParse({
      demandaId: 1, tipo: "observacao", resumo: "",
    });
    expect(r.success).toBe(false);
  });
  it("rejeita resumo > 140 chars", () => {
    const r = createEventoSchema.safeParse({
      demandaId: 1, tipo: "observacao", resumo: "x".repeat(141),
    });
    expect(r.success).toBe(false);
  });
});
```

- [ ] **Step 2: Implementar schemas**

```ts
// src/lib/trpc/zod/demanda-eventos.ts
import { z } from "zod";
import { DILIGENCIA_SUBTIPOS, DILIGENCIA_STATUS } from "@/lib/db/schema/demanda-eventos";

const baseFields = {
  demandaId: z.number().int().positive(),
  resumo: z.string().min(1).max(140),
  descricao: z.string().max(10_000).optional(),
  responsavelId: z.number().int().positive().optional(),
};

const diligenciaSchema = z.object({
  ...baseFields,
  tipo: z.literal("diligencia"),
  subtipo: z.enum(DILIGENCIA_SUBTIPOS),
  status: z.enum(DILIGENCIA_STATUS).default("feita"),
  prazo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
}).refine(
  (v) => v.status !== "pendente" || !!v.prazo,
  { message: "Diligência pendente requer prazo", path: ["prazo"] }
);

const atendimentoSchema = z.object({
  ...baseFields,
  tipo: z.literal("atendimento"),
  atendimentoId: z.number().int().positive(),
});

const observacaoSchema = z.object({
  ...baseFields,
  tipo: z.literal("observacao"),
});

export const createEventoSchema = z.discriminatedUnion("tipo", [
  diligenciaSchema, atendimentoSchema, observacaoSchema,
]);

export const updateEventoSchema = z.object({
  id: z.number().int().positive(),
  resumo: z.string().min(1).max(140).optional(),
  descricao: z.string().max(10_000).optional(),
  status: z.enum(DILIGENCIA_STATUS).optional(),
  prazo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
});

export type CreateEventoInput = z.infer<typeof createEventoSchema>;
export type UpdateEventoInput = z.infer<typeof updateEventoSchema>;
```

- [ ] **Step 3: Rodar testes**

```bash
npm test -- demanda-eventos-zod
```

Expected: PASS (6 testes).

- [ ] **Step 4: Commit**

```bash
git add src/lib/trpc/zod/demanda-eventos.ts __tests__/unit/demanda-eventos-zod.test.ts
git commit -m "feat(demanda-eventos): zod schemas (discriminated union)"
```

---

### Task 5: Router tRPC — queries (list, batch)

**Files:**
- Create: `src/lib/trpc/routers/demanda-eventos.ts` (parcial)
- Modify: `src/lib/trpc/routers/index.ts:89` — registrar

- [ ] **Step 1: Esqueleto do router com `list`**

```ts
// src/lib/trpc/routers/demanda-eventos.ts
import { z } from "zod";
import { router, protectedProcedure } from "../init";
import { db } from "@/lib/db";
import { demandaEventos } from "@/lib/db/schema/demanda-eventos";
import { demandas } from "@/lib/db/schema/core";
import { atendimentos } from "@/lib/db/schema/agenda";
import { users } from "@/lib/db/schema/core";
import { and, eq, inArray, isNull, desc, asc, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import {
  createEventoSchema, updateEventoSchema,
} from "../zod/demanda-eventos";

export const demandaEventosRouter = router({
  list: protectedProcedure
    .input(z.object({
      demandaId: z.number().int().positive(),
      limit: z.number().int().min(1).max(200).default(50),
      cursor: z.number().int().optional(),
    }))
    .query(async ({ input }) => {
      const rows = await db.select({
        evento: demandaEventos,
        autor: { id: users.id, nome: users.nome },
      })
        .from(demandaEventos)
        .leftJoin(users, eq(users.id, demandaEventos.autorId))
        .where(and(
          eq(demandaEventos.demandaId, input.demandaId),
          isNull(demandaEventos.deletedAt),
          input.cursor ? sql`${demandaEventos.id} < ${input.cursor}` : sql`true`,
        ))
        .orderBy(desc(demandaEventos.createdAt), desc(demandaEventos.id))
        .limit(input.limit + 1);

      const hasMore = rows.length > input.limit;
      const items = hasMore ? rows.slice(0, -1) : rows;
      const nextCursor = hasMore ? items[items.length - 1].evento.id : undefined;
      return { items, nextCursor };
    }),
});
```

- [ ] **Step 2: Adicionar `lastByDemandaIds` (batch para o kanban)**

Adicionar dentro do `router({ ... })`:

```ts
  lastByDemandaIds: protectedProcedure
    .input(z.object({ demandaIds: z.array(z.number().int().positive()).max(500) }))
    .query(async ({ input }) => {
      if (input.demandaIds.length === 0) return {};
      // DISTINCT ON: para cada demanda_id, pega o evento mais recente não deletado
      const rows = await db.execute(sql`
        SELECT DISTINCT ON (demanda_id)
          id, demanda_id, tipo, subtipo, status, resumo, prazo, autor_id, created_at
        FROM demanda_eventos
        WHERE demanda_id IN (${sql.join(input.demandaIds, sql`, `)})
          AND deleted_at IS NULL
        ORDER BY demanda_id, created_at DESC, id DESC
      `);
      const map: Record<number, typeof rows[number]> = {};
      for (const r of rows as any[]) map[r.demanda_id] = r;
      return map;
    }),
```

- [ ] **Step 3: Adicionar `pendentesByDemandaIds`**

```ts
  pendentesByDemandaIds: protectedProcedure
    .input(z.object({ demandaIds: z.array(z.number().int().positive()).max(500) }))
    .query(async ({ input }) => {
      if (input.demandaIds.length === 0) return {};
      const rows = await db.execute(sql`
        SELECT DISTINCT ON (demanda_id)
          id, demanda_id, tipo, subtipo, status, resumo, prazo, responsavel_id
        FROM demanda_eventos
        WHERE demanda_id IN (${sql.join(input.demandaIds, sql`, `)})
          AND tipo = 'diligencia' AND status = 'pendente' AND deleted_at IS NULL
        ORDER BY demanda_id, prazo ASC NULLS LAST, created_at ASC
      `);
      const map: Record<number, typeof rows[number]> = {};
      for (const r of rows as any[]) map[r.demanda_id] = r;
      return map;
    }),
```

- [ ] **Step 4: Adicionar `historicoByAssistidoId` e `historicoByProcessoId`**

```ts
  historicoByAssistidoId: protectedProcedure
    .input(z.object({ assistidoId: z.number().int().positive(), limit: z.number().default(100) }))
    .query(async ({ input }) => {
      return await db.select({
        evento: demandaEventos,
        demanda: { id: demandas.id, ato: demandas.ato },
        autor: { id: users.id, nome: users.nome },
      })
        .from(demandaEventos)
        .innerJoin(demandas, eq(demandas.id, demandaEventos.demandaId))
        .leftJoin(users, eq(users.id, demandaEventos.autorId))
        .where(and(
          eq(demandas.assistidoId, input.assistidoId),
          isNull(demandaEventos.deletedAt),
        ))
        .orderBy(desc(demandaEventos.createdAt))
        .limit(input.limit);
    }),

  historicoByProcessoId: protectedProcedure
    .input(z.object({ processoId: z.number().int().positive(), limit: z.number().default(100) }))
    .query(async ({ input }) => {
      return await db.select({
        evento: demandaEventos,
        demanda: { id: demandas.id, ato: demandas.ato },
        autor: { id: users.id, nome: users.nome },
      })
        .from(demandaEventos)
        .innerJoin(demandas, eq(demandas.id, demandaEventos.demandaId))
        .leftJoin(users, eq(users.id, demandaEventos.autorId))
        .where(and(
          eq(demandas.processoId, input.processoId),
          isNull(demandaEventos.deletedAt),
        ))
        .orderBy(desc(demandaEventos.createdAt))
        .limit(input.limit);
    }),
```

- [ ] **Step 5: Registrar no appRouter**

Em `src/lib/trpc/routers/index.ts`:

Adicionar import (linha ~88, junto com outros):

```ts
import { demandaEventosRouter } from "./demanda-eventos";
```

Adicionar dentro de `appRouter`, abaixo de `demandas: demandasRouter`:

```ts
  demandaEventos: demandaEventosRouter,
```

- [ ] **Step 6: Rodar typecheck**

```bash
npx tsc --noEmit
```

Expected: 0 erros.

- [ ] **Step 7: Commit**

```bash
git add src/lib/trpc/routers/demanda-eventos.ts src/lib/trpc/routers/index.ts
git commit -m "feat(demanda-eventos): tRPC queries (list, batch by demanda ids)"
```

---

### Task 6: Router tRPC — mutations

**Files:**
- Modify: `src/lib/trpc/routers/demanda-eventos.ts`
- Test: `__tests__/trpc/demanda-eventos-router.test.ts`

- [ ] **Step 1: Escrever teste do `create`**

Olhar `__tests__/trpc/casos-router.test.ts` para o padrão de criação de contexto e seed mínimo. Espelhar:

```ts
// __tests__/trpc/demanda-eventos-router.test.ts
import { describe, it, expect, beforeAll } from "vitest";
import { appRouter } from "@/lib/trpc/routers";
import { createTRPCContext } from "@/lib/trpc/init"; // ajustar import conforme padrão local

describe("demandaEventos.create", () => {
  it("rejeita diligencia pendente sem prazo", async () => {
    const ctx = await createTestContext({ userId: 1 });
    const caller = appRouter.createCaller(ctx);
    await expect(caller.demandaEventos.create({
      demandaId: 1, tipo: "diligencia", subtipo: "peticao",
      status: "pendente", resumo: "x",
    })).rejects.toThrow();
  });
  it("cria observacao mínima", async () => {
    const ctx = await createTestContext({ userId: 1 });
    const caller = appRouter.createCaller(ctx);
    const r = await caller.demandaEventos.create({
      demandaId: <ID-existente>, tipo: "observacao", resumo: "anotação",
    });
    expect(r.id).toBeGreaterThan(0);
    expect(r.tipo).toBe("observacao");
  });
});
```

(Adaptar `createTestContext` ao padrão local — ver `__tests__/trpc/context.test.ts`.)

- [ ] **Step 2: Implementar `create` mutation**

Adicionar ao router:

```ts
  create: protectedProcedure
    .input(createEventoSchema)
    .mutation(async ({ ctx, input }) => {
      // Verificar que a demanda existe e o user pode escrever
      const [d] = await db.select().from(demandas).where(eq(demandas.id, input.demandaId)).limit(1);
      if (!d) throw new TRPCError({ code: "NOT_FOUND", message: "Demanda não encontrada" });
      const userId = ctx.session.user.id;
      const isOwner = d.defensorId === userId || d.delegadoParaId === userId;
      const isAdmin = ctx.session.user.role === "admin";
      if (!isOwner && !isAdmin) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Sem permissão na demanda" });
      }

      const dataConclusao =
        input.tipo === "diligencia" && input.status === "feita" ? new Date() : null;

      const [created] = await db.insert(demandaEventos).values({
        demandaId: input.demandaId,
        tipo: input.tipo,
        subtipo: input.tipo === "diligencia" ? input.subtipo : null,
        status: input.tipo === "diligencia" ? input.status : null,
        resumo: input.resumo,
        descricao: input.descricao ?? null,
        prazo: input.tipo === "diligencia" ? input.prazo ?? null : null,
        responsavelId: ("responsavelId" in input && input.responsavelId) || null,
        atendimentoId: input.tipo === "atendimento" ? input.atendimentoId : null,
        autorId: userId,
        dataConclusao,
      }).returning();

      return created;
    }),
```

- [ ] **Step 3: Implementar `update`**

```ts
  update: protectedProcedure
    .input(updateEventoSchema)
    .mutation(async ({ ctx, input }) => {
      const [ev] = await db.select().from(demandaEventos)
        .where(eq(demandaEventos.id, input.id)).limit(1);
      if (!ev) throw new TRPCError({ code: "NOT_FOUND" });

      const userId = ctx.session.user.id;
      const isAdmin = ctx.session.user.role === "admin";
      if (!isAdmin && ev.autorId !== userId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Só o autor pode editar" });
      }

      const patch: Record<string, unknown> = { updatedAt: new Date() };
      if (input.resumo !== undefined) patch.resumo = input.resumo;
      if (input.descricao !== undefined) patch.descricao = input.descricao;
      if (input.status !== undefined) {
        if (ev.tipo !== "diligencia") {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Status só aplica a diligência" });
        }
        patch.status = input.status;
        if (input.status === "feita" && !ev.dataConclusao) patch.dataConclusao = new Date();
      }
      if (input.prazo !== undefined) patch.prazo = input.prazo;

      const [updated] = await db.update(demandaEventos)
        .set(patch).where(eq(demandaEventos.id, input.id)).returning();
      return updated;
    }),
```

- [ ] **Step 4: Implementar `marcarFeita` e `archive`**

```ts
  marcarFeita: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      // Reuso do update (interno)
      const userId = ctx.session.user.id;
      const isAdmin = ctx.session.user.role === "admin";
      const [ev] = await db.select().from(demandaEventos)
        .where(eq(demandaEventos.id, input.id)).limit(1);
      if (!ev) throw new TRPCError({ code: "NOT_FOUND" });
      if (ev.tipo !== "diligencia") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Só diligência pode ser marcada como feita" });
      }
      if (!isAdmin && ev.autorId !== userId) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      const [updated] = await db.update(demandaEventos)
        .set({ status: "feita", dataConclusao: new Date(), updatedAt: new Date() })
        .where(eq(demandaEventos.id, input.id)).returning();
      return updated;
    }),

  archive: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const isAdmin = ctx.session.user.role === "admin";
      const [ev] = await db.select().from(demandaEventos)
        .where(eq(demandaEventos.id, input.id)).limit(1);
      if (!ev) throw new TRPCError({ code: "NOT_FOUND" });
      if (!isAdmin && ev.autorId !== userId) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      await db.update(demandaEventos)
        .set({ deletedAt: new Date() }).where(eq(demandaEventos.id, input.id));
      return { ok: true };
    }),
```

- [ ] **Step 5: Rodar testes**

```bash
npm test -- demanda-eventos-router
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/trpc/routers/demanda-eventos.ts __tests__/trpc/demanda-eventos-router.test.ts
git commit -m "feat(demanda-eventos): tRPC mutations (create, update, marcarFeita, archive)"
```

---

### Task 7: Hook em `atendimentos.create` para vinculação automática

**Files:**
- Modify: `src/lib/trpc/routers/atendimentos.ts`
- Modify: `src/lib/trpc/routers/demanda-eventos.ts` (helper exportável)
- Test: `__tests__/trpc/demanda-eventos-router.test.ts` (extend)

- [ ] **Step 1: Helper exportável em `demanda-eventos.ts`**

Adicionar fora do `router({...})`:

```ts
import { atendimentoDemandas } from "@/lib/db/schema/demanda-eventos";

/** Vincula um atendimento a todas as demandas abertas do processo. Cria evento por demanda. */
export async function autoVincularAtendimentoADemandas(args: {
  atendimentoId: number;
  processoId: number;
  autorId: number;
  resumoBase: string; // ex: assunto do atendimento
}) {
  // Status considerados "abertos" — qualquer um diferente de concluída/arquivada
  const abertas = await db.select({ id: demandas.id })
    .from(demandas)
    .where(and(
      eq(demandas.processoId, args.processoId),
      isNull(demandas.deletedAt),
      sql`${demandas.status} NOT IN ('4_CONCLUIDA','6_ARQUIVADA')`,
    ));
  if (abertas.length === 0) return { vinculadas: 0 };

  await db.insert(atendimentoDemandas).values(
    abertas.map(d => ({ atendimentoId: args.atendimentoId, demandaId: d.id })),
  ).onConflictDoNothing();

  await db.insert(demandaEventos).values(
    abertas.map(d => ({
      demandaId: d.id,
      tipo: "atendimento" as const,
      resumo: args.resumoBase.slice(0, 140),
      atendimentoId: args.atendimentoId,
      autorId: args.autorId,
    })),
  );
  return { vinculadas: abertas.length };
}
```

- [ ] **Step 2: Hook em `atendimentos.create`**

Em `src/lib/trpc/routers/atendimentos.ts`, no final da mutation `create` (logo após o `db.insert(...).returning()`), antes de retornar:

```ts
import { autoVincularAtendimentoADemandas } from "./demanda-eventos";
// ...
if (created.processoId) {
  await autoVincularAtendimentoADemandas({
    atendimentoId: created.id,
    processoId: created.processoId,
    autorId: ctx.session.user.id,
    resumoBase: created.assunto || "Atendimento",
  });
}
```

(Localizar a mutation `create` em `atendimentos.ts` — buscar por `.mutation(` perto da definição que recebe `assistidoId`/`processoId`.)

- [ ] **Step 3: Adicionar mutations `vincularAtendimento` e `desvincularAtendimento`**

No `demanda-eventos.ts` router:

```ts
  vincularAtendimento: protectedProcedure
    .input(z.object({
      demandaId: z.number().int().positive(),
      atendimentoId: z.number().int().positive(),
      resumo: z.string().min(1).max(140).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Permissão: dono ou delegado da demanda
      // ... mesma checagem que `create`
      await db.insert(atendimentoDemandas).values({
        atendimentoId: input.atendimentoId, demandaId: input.demandaId,
      }).onConflictDoNothing();
      const [a] = await db.select().from(atendimentos)
        .where(eq(atendimentos.id, input.atendimentoId)).limit(1);
      const [created] = await db.insert(demandaEventos).values({
        demandaId: input.demandaId, tipo: "atendimento",
        resumo: (input.resumo ?? a?.assunto ?? "Atendimento").slice(0, 140),
        atendimentoId: input.atendimentoId,
        autorId: ctx.session.user.id,
      }).returning();
      return created;
    }),

  desvincularAtendimento: protectedProcedure
    .input(z.object({ demandaId: z.number().int().positive(), atendimentoId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      // Soft-delete o evento; remove a linha N:N
      await db.update(demandaEventos).set({ deletedAt: new Date() })
        .where(and(
          eq(demandaEventos.demandaId, input.demandaId),
          eq(demandaEventos.atendimentoId, input.atendimentoId),
          isNull(demandaEventos.deletedAt),
        ));
      await db.delete(atendimentoDemandas)
        .where(and(
          eq(atendimentoDemandas.demandaId, input.demandaId),
          eq(atendimentoDemandas.atendimentoId, input.atendimentoId),
        ));
      return { ok: true };
    }),
```

- [ ] **Step 4: Teste do hook**

Adicionar em `__tests__/trpc/demanda-eventos-router.test.ts`:

```ts
describe("atendimento → vinculação automática", () => {
  it("ao criar atendimento com processoId, gera evento em cada demanda aberta", async () => {
    const ctx = await createTestContext({ userId: 1 });
    const caller = appRouter.createCaller(ctx);
    // Pré-condição: ter um processoId com 2 demandas abertas
    const before = await db.select().from(demandaEventos)
      .where(eq(demandaEventos.tipo, "atendimento"));
    await caller.atendimentos.create({
      assistidoId: <id>, processoId: <id-com-2-demandas>,
      dataAtendimento: new Date(), tipo: "telefone",
      assunto: "ligação cartório",
    });
    const after = await db.select().from(demandaEventos)
      .where(eq(demandaEventos.tipo, "atendimento"));
    expect(after.length - before.length).toBe(2);
  });
});
```

- [ ] **Step 5: Rodar testes**

```bash
npm test -- demanda-eventos-router
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/trpc/routers/demanda-eventos.ts \
  src/lib/trpc/routers/atendimentos.ts \
  __tests__/trpc/demanda-eventos-router.test.ts
git commit -m "feat(demanda-eventos): auto-vincular atendimento a demandas abertas do processo"
```

---

## Phase 3 — Card UI (kanban)

### Task 8: Componente `<EventLine>` (1-linha reutilizável)

**Files:**
- Create: `src/components/demanda-eventos/event-line.tsx`
- Test: `__tests__/unit/demanda-eventos-render.test.ts`

- [ ] **Step 1: Componente**

```tsx
// src/components/demanda-eventos/event-line.tsx
import { CalendarClock, MessageSquare, FileText, NotebookPen } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

type EventoLine = {
  id: number;
  tipo: "atendimento" | "diligencia" | "observacao";
  subtipo: string | null;
  status: "pendente" | "feita" | "cancelada" | null;
  resumo: string;
  prazo: string | null;
  createdAt: string | Date;
};

const TIPO_ICON = {
  atendimento: MessageSquare,
  diligencia: FileText,
  observacao: NotebookPen,
} as const;

export function EventLine({ evento, variant = "default" }: {
  evento: EventoLine;
  variant?: "default" | "pendente";
}) {
  const Icon = TIPO_ICON[evento.tipo];
  const tempo = formatDistanceToNow(new Date(evento.createdAt), { locale: ptBR, addSuffix: false });

  if (variant === "pendente") {
    const tone = prazoTone(evento.prazo);
    return (
      <span className={`flex items-center gap-1.5 text-[10px] ${tone.text}`}>
        <CalendarClock className="size-3 shrink-0" />
        <span className="truncate">
          Pendente: {evento.resumo}
          {evento.prazo && <> · prazo {formatPrazo(evento.prazo)}</>}
        </span>
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1.5 text-[10px] text-neutral-500 dark:text-neutral-400">
      <Icon className="size-3 shrink-0 opacity-60" />
      <span className="truncate">
        <span className="opacity-60 mr-1">{tempo}</span>
        {evento.resumo}
      </span>
    </span>
  );
}

function prazoTone(prazo: string | null) {
  if (!prazo) return { text: "text-neutral-500" };
  const d = Math.floor((new Date(prazo).getTime() - Date.now()) / 86400000);
  if (d < 0) return { text: "text-red-500 font-medium" };
  if (d <= 7) return { text: "text-amber-600" };
  return { text: "text-neutral-500" };
}

function formatPrazo(prazo: string) {
  const d = Math.floor((new Date(prazo).getTime() - Date.now()) / 86400000);
  if (d < 0) return `vencido há ${-d}d`;
  if (d === 0) return "hoje";
  if (d === 1) return "amanhã";
  return `em ${d}d`;
}
```

- [ ] **Step 2: Teste de render**

```ts
// __tests__/unit/demanda-eventos-render.test.ts
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { EventLine } from "@/components/demanda-eventos/event-line";

describe("EventLine default", () => {
  it("renderiza resumo e tempo", () => {
    render(<EventLine evento={{
      id: 1, tipo: "diligencia", subtipo: "peticao", status: "feita",
      resumo: "Petição protocolada", prazo: null,
      createdAt: new Date(Date.now() - 2 * 86400000),
    }} />);
    expect(screen.getByText(/Petição protocolada/)).toBeTruthy();
    expect(screen.getByText(/2 dias/i)).toBeTruthy();
  });
});

describe("EventLine pendente", () => {
  it("renderiza tone vermelho quando vencido", () => {
    const { container } = render(<EventLine variant="pendente" evento={{
      id: 1, tipo: "diligencia", subtipo: "peticao", status: "pendente",
      resumo: "Protocolar AG", prazo: new Date(Date.now() - 86400000).toISOString().slice(0,10),
      createdAt: new Date(),
    }} />);
    expect(container.querySelector(".text-red-500")).toBeTruthy();
  });
});
```

- [ ] **Step 3: Rodar testes**

```bash
npm test -- demanda-eventos-render
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/components/demanda-eventos/event-line.tsx __tests__/unit/demanda-eventos-render.test.ts
git commit -m "feat(demanda-eventos): EventLine component"
```

---

### Task 9: Refactor do card no kanban

**Files:**
- Modify: `src/components/demandas-premium/kanban-premium.tsx:357-365`
- Modify: `src/components/demandas-premium/demandas-premium-view.tsx` — fetch batch dos eventos

- [ ] **Step 1: Adicionar fetch batch no `demandas-premium-view.tsx`**

Localizar onde os dados das demandas são carregados (em torno da linha 860, onde tem `providencias: d.providencias || ""`). Adicionar abaixo:

```tsx
const demandaIds = useMemo(() => demandas.map(d => d.id), [demandas]);
const { data: lastEventos = {} } = trpc.demandaEventos.lastByDemandaIds.useQuery(
  { demandaIds },
  { enabled: demandaIds.length > 0, staleTime: 10_000 },
);
const { data: pendentes = {} } = trpc.demandaEventos.pendentesByDemandaIds.useQuery(
  { demandaIds },
  { enabled: demandaIds.length > 0, staleTime: 10_000 },
);
```

Passar `lastEventos[d.id]` e `pendentes[d.id]` como props para `<DemandaCard>` ou para o componente que renderiza o card no kanban.

- [ ] **Step 2: Atualizar tipo `DemandaCardProps` em `kanban-premium.tsx`**

Adicionar (perto da definição da interface, em torno da linha 78):

```tsx
type EventoSummary = {
  id: number;
  tipo: "atendimento" | "diligencia" | "observacao";
  subtipo: string | null;
  status: "pendente" | "feita" | "cancelada" | null;
  resumo: string;
  prazo: string | null;
  createdAt: string | Date;
};

interface DemandaCardProps {
  // ... props existentes
  lastEvento?: EventoSummary | null;
  pendenteEvento?: EventoSummary | null;
}
```

- [ ] **Step 3: Substituir o bloco de `providenciaResumo` (linhas 357-365)**

Remover:

```tsx
{/* Providência resumida — só se preenchida */}
{demanda.providenciaResumo && ( ... )}
```

E inserir no lugar:

```tsx
{/* Pendência — só se houver diligência pendente */}
{pendenteEvento && (
  <div className="mt-1.5 pt-1.5 border-t border-neutral-200/40 dark:border-neutral-700/40">
    <EventLine evento={pendenteEvento} variant="pendente" />
  </div>
)}
{/* Última atividade — sempre presente; placeholder se não há eventos */}
<div className={`mt-1.5 ${pendenteEvento ? "" : "pt-1.5 border-t border-neutral-200/40 dark:border-neutral-700/40"}`}>
  {lastEvento ? (
    <EventLine evento={lastEvento} />
  ) : (
    <button
      onClick={(e) => { e.stopPropagation(); onOpenDrawer?.(demanda.id); }}
      className="text-[10px] text-neutral-400 italic hover:text-emerald-600 transition"
    >
      + registrar atividade
    </button>
  )}
</div>
```

- [ ] **Step 4: Importar `EventLine` no topo do arquivo**

```tsx
import { EventLine } from "@/components/demanda-eventos/event-line";
```

- [ ] **Step 5: Verificar visualmente**

```bash
npm run dev
```

Abrir `/admin/demandas`, verificar que:
- Cards com providência migrada mostram a linha de "última atividade".
- Cards sem nenhum evento mostram `+ registrar atividade`.
- Cards com diligência pendente (criar uma manualmente via SQL ou via drawer depois da Task 11) mostram a linha amber/red.

- [ ] **Step 6: Commit**

```bash
git add src/components/demandas-premium/kanban-premium.tsx \
  src/components/demandas-premium/demandas-premium-view.tsx
git commit -m "feat(demanda-eventos): card do kanban consome timeline"
```

---

### Task 10: Expand inline (3 últimos)

**Files:**
- Modify: `src/components/demandas-premium/kanban-premium.tsx`

- [ ] **Step 1: Adicionar estado de expansão por card**

No componente do card, adicionar:

```tsx
const [expanded, setExpanded] = useState(false);
const { data: ultimos } = trpc.demandaEventos.list.useQuery(
  { demandaId: demanda.id, limit: 4 },
  { enabled: expanded },
);
```

- [ ] **Step 2: Adicionar handler de click**

No container do card (área não-interativa — não badge, não menu, não delegação), adicionar:

```tsx
onClick={(e) => {
  if ((e.target as HTMLElement).closest("[data-no-expand]")) return;
  setExpanded(v => !v);
}}
```

E marcar elementos interativos com `data-no-expand`.

- [ ] **Step 3: Renderizar acordeão se `expanded`**

Abaixo do bloco de última atividade:

```tsx
{expanded && ultimos && (
  <div className="mt-2 pt-2 border-t border-neutral-200/40 dark:border-neutral-700/40 space-y-1">
    {ultimos.items.slice(1, 4).map(({ evento }) => (
      <EventLine key={evento.id} evento={evento} />
    ))}
    <button
      onClick={(e) => { e.stopPropagation(); onOpenDrawer?.(demanda.id); }}
      className="text-[10px] text-emerald-600 hover:underline mt-1"
      data-no-expand
    >
      Ver todos →
    </button>
  </div>
)}
```

- [ ] **Step 4: Verificar visualmente**

Abrir kanban, clicar em card com vários eventos → ver acordeão. Clicar de novo → fechar.

- [ ] **Step 5: Commit**

```bash
git add src/components/demandas-premium/kanban-premium.tsx
git commit -m "feat(demanda-eventos): inline expand mostra 3 últimos eventos"
```

---

## Phase 4 — Drawer reform

### Task 11: Drawer base — header + tabs

**Files:**
- Modify: `src/components/demandas-premium/demanda-timeline-drawer.tsx` (rewrite total)

- [ ] **Step 1: Ler estado atual**

```bash
cat src/components/demandas-premium/demanda-timeline-drawer.tsx
```

Identificar como ele é aberto (provavelmente `open`/`onOpenChange` props) e o que recebe (provavelmente `demandaId`).

- [ ] **Step 2: Reescrever**

```tsx
// src/components/demandas-premium/demanda-timeline-drawer.tsx
"use client";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc/client";
import { EventLine } from "@/components/demanda-eventos/event-line";
import { TimelineFAB } from "@/components/demanda-eventos/timeline-fab";
import { useState } from "react";

export function DemandaTimelineDrawer({
  open, onOpenChange, demandaId,
}: { open: boolean; onOpenChange: (v: boolean) => void; demandaId: number | null }) {
  const [tab, setTab] = useState<"timeline"|"pendentes"|"atendimentos">("timeline");
  const enabled = open && demandaId !== null;
  const { data: demanda } = trpc.demandas.getById.useQuery(
    { id: demandaId! }, { enabled },
  );
  const { data: lista } = trpc.demandaEventos.list.useQuery(
    { demandaId: demandaId!, limit: 100 }, { enabled },
  );

  if (!demandaId) return null;
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[480px] sm:w-[560px]">
        <SheetHeader>
          <SheetTitle className="text-base">{demanda?.assistido ?? "..."}</SheetTitle>
          <div className="text-xs text-neutral-500">
            {demanda?.processo?.numero} · {demanda?.ato}
          </div>
        </SheetHeader>

        <Tabs value={tab} onValueChange={(v) => setTab(v as any)} className="mt-4">
          <TabsList className="w-full">
            <TabsTrigger value="timeline">Timeline</TabsTrigger>
            <TabsTrigger value="pendentes">Pendentes</TabsTrigger>
            <TabsTrigger value="atendimentos">Atendimentos</TabsTrigger>
          </TabsList>

          <TabsContent value="timeline" className="mt-3">
            <div className="space-y-2 max-h-[calc(100vh-250px)] overflow-y-auto">
              {lista?.items.map(({ evento }) => (
                <EventLine key={evento.id} evento={evento} />
              ))}
              {lista?.items.length === 0 && (
                <div className="text-sm text-neutral-400 py-8 text-center">
                  Nenhum evento ainda. Use o botão + abaixo.
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="pendentes">
            {/* Filtro: tipo=diligencia, status=pendente */}
            <div className="space-y-2">
              {lista?.items
                .filter(i => i.evento.tipo === "diligencia" && i.evento.status === "pendente")
                .map(({ evento }) => (
                  <EventLine key={evento.id} evento={evento} variant="pendente" />
                ))}
            </div>
          </TabsContent>

          <TabsContent value="atendimentos">
            <div className="space-y-2">
              {lista?.items
                .filter(i => i.evento.tipo === "atendimento")
                .map(({ evento }) => (
                  <EventLine key={evento.id} evento={evento} />
                ))}
            </div>
          </TabsContent>
        </Tabs>

        <TimelineFAB demandaId={demandaId} />
      </SheetContent>
    </Sheet>
  );
}
```

- [ ] **Step 3: Stub do `TimelineFAB` (será preenchido na Task 12)**

```tsx
// src/components/demanda-eventos/timeline-fab.tsx
export function TimelineFAB({ demandaId }: { demandaId: number }) {
  return null; // implementado na próxima task
}
```

- [ ] **Step 4: Verificar que drawer abre**

```bash
npm run dev
```

Abrir kanban → clicar no header de um card → drawer abre com tabs e timeline.

- [ ] **Step 5: Commit**

```bash
git add src/components/demandas-premium/demanda-timeline-drawer.tsx \
  src/components/demanda-eventos/timeline-fab.tsx
git commit -m "feat(demanda-eventos): drawer com tabs (timeline/pendentes/atendimentos)"
```

---

### Task 12: FAB + form de diligência

**Files:**
- Modify: `src/components/demanda-eventos/timeline-fab.tsx`
- Create: `src/components/demanda-eventos/event-form-diligencia.tsx`

- [ ] **Step 1: FAB com menu**

```tsx
// src/components/demanda-eventos/timeline-fab.tsx
"use client";
import { useState } from "react";
import { Plus, FileText, MessageSquare, NotebookPen } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { EventFormDiligencia } from "./event-form-diligencia";
// (atendimento e observacao formulários: tasks seguintes)

export function TimelineFAB({ demandaId }: { demandaId: number }) {
  const [openForm, setOpenForm] = useState<null | "diligencia" | "atendimento" | "observacao">(null);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="fixed bottom-6 right-6 size-12 rounded-full bg-emerald-600 text-white shadow-lg hover:bg-emerald-700 flex items-center justify-center">
            <Plus className="size-5" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem onClick={() => setOpenForm("diligencia")}>
            <FileText className="size-4 mr-2" /> Diligência
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setOpenForm("atendimento")}>
            <MessageSquare className="size-4 mr-2" /> Atendimento
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setOpenForm("observacao")}>
            <NotebookPen className="size-4 mr-2" /> Observação
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <EventFormDiligencia
        demandaId={demandaId}
        open={openForm === "diligencia"}
        onOpenChange={(v) => setOpenForm(v ? "diligencia" : null)}
      />
      {/* Forms de atendimento/observacao — Tasks 13/14 */}
    </>
  );
}
```

- [ ] **Step 2: Form de diligência**

```tsx
// src/components/demanda-eventos/event-form-diligencia.tsx
"use client";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc/client";
import { DILIGENCIA_SUBTIPOS } from "@/lib/db/schema/demanda-eventos";
import { toast } from "sonner";

export function EventFormDiligencia({
  demandaId, open, onOpenChange,
}: { demandaId: number; open: boolean; onOpenChange: (v: boolean) => void }) {
  const [subtipo, setSubtipo] = useState<typeof DILIGENCIA_SUBTIPOS[number]>("peticao");
  const [status, setStatus] = useState<"feita" | "pendente">("feita");
  const [resumo, setResumo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [prazo, setPrazo] = useState("");
  const utils = trpc.useUtils();
  const mut = trpc.demandaEventos.create.useMutation({
    onSuccess: () => {
      toast.success("Diligência registrada");
      utils.demandaEventos.list.invalidate({ demandaId });
      utils.demandaEventos.lastByDemandaIds.invalidate();
      utils.demandaEventos.pendentesByDemandaIds.invalidate();
      onOpenChange(false);
      setResumo(""); setDescricao(""); setPrazo("");
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Nova diligência</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="text-xs">Tipo</label>
            <div className="flex flex-wrap gap-1 mt-1">
              {DILIGENCIA_SUBTIPOS.map(s => (
                <button key={s} onClick={() => setSubtipo(s)}
                  className={`text-xs px-2 py-1 rounded-full border ${subtipo === s ? "bg-emerald-600 text-white border-emerald-600" : "border-neutral-300"}`}>
                  {s.replace("_", " ")}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs">Status</label>
            <div className="flex gap-2 mt-1">
              <button onClick={() => setStatus("feita")}
                className={`text-xs px-2 py-1 rounded ${status === "feita" ? "bg-emerald-600 text-white" : "border"}`}>
                Já feita
              </button>
              <button onClick={() => setStatus("pendente")}
                className={`text-xs px-2 py-1 rounded ${status === "pendente" ? "bg-amber-600 text-white" : "border"}`}>
                A fazer
              </button>
            </div>
          </div>
          <Input maxLength={140} placeholder="Resumo (até 140)" value={resumo} onChange={e => setResumo(e.target.value)} />
          <Textarea placeholder="Descrição (opcional)" value={descricao} onChange={e => setDescricao(e.target.value)} />
          {status === "pendente" && (
            <Input type="date" value={prazo} onChange={e => setPrazo(e.target.value)} />
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button
            disabled={!resumo || (status === "pendente" && !prazo) || mut.isPending}
            onClick={() => mut.mutate({
              demandaId, tipo: "diligencia", subtipo, status,
              resumo, descricao: descricao || undefined,
              prazo: status === "pendente" ? prazo : undefined,
            })}
          >Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 3: Testar manualmente**

Abrir drawer → FAB → "Diligência" → preencher (resumo: "Petição protocolada", subtipo: peticao, status: feita) → Salvar. Confirmar que aparece na timeline.

- [ ] **Step 4: Commit**

```bash
git add src/components/demanda-eventos/timeline-fab.tsx \
  src/components/demanda-eventos/event-form-diligencia.tsx
git commit -m "feat(demanda-eventos): FAB + form diligência"
```

---

### Task 13: Form de atendimento manual

**Files:**
- Create: `src/components/demanda-eventos/event-form-atendimento.tsx`
- Modify: `src/components/demanda-eventos/timeline-fab.tsx`

- [ ] **Step 1: Form**

Criar dialog que cria um `atendimento` (via `trpc.atendimentos.create.useMutation`) já com `processoId` e `assistidoId` derivados da demanda. O hook da Task 7 cuida da vinculação automática. Campos: data (default agora), tipo (presencial/telefone/whatsapp), interlocutor, assunto (vai virar `resumo` do evento), descricao.

```tsx
// src/components/demanda-eventos/event-form-atendimento.tsx
"use client";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc/client";
import { toast } from "sonner";

export function EventFormAtendimento({
  demandaId, open, onOpenChange,
}: { demandaId: number; open: boolean; onOpenChange: (v: boolean) => void }) {
  const { data: demanda } = trpc.demandas.getById.useQuery({ id: demandaId }, { enabled: open });
  const [tipo, setTipo] = useState<"presencial"|"telefone"|"whatsapp">("telefone");
  const [interlocutor, setInterlocutor] = useState("assistido");
  const [assunto, setAssunto] = useState("");
  const [resumo, setResumo] = useState("");
  const utils = trpc.useUtils();
  const mut = trpc.atendimentos.create.useMutation({
    onSuccess: () => {
      toast.success("Atendimento registrado");
      utils.demandaEventos.list.invalidate({ demandaId });
      utils.demandaEventos.lastByDemandaIds.invalidate();
      onOpenChange(false);
      setAssunto(""); setResumo("");
    },
    onError: e => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Novo atendimento</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="flex gap-2">
            {["presencial","telefone","whatsapp"].map(t => (
              <button key={t} onClick={() => setTipo(t as any)}
                className={`text-xs px-2 py-1 rounded ${tipo === t ? "bg-emerald-600 text-white" : "border"}`}>{t}</button>
            ))}
          </div>
          <Input placeholder="Interlocutor" value={interlocutor} onChange={e => setInterlocutor(e.target.value)} />
          <Input maxLength={140} placeholder="Assunto" value={assunto} onChange={e => setAssunto(e.target.value)} />
          <Textarea placeholder="Resumo do que foi conversado" value={resumo} onChange={e => setResumo(e.target.value)} />
          <a className="text-xs text-emerald-600 hover:underline" href={`/admin/atendimentos/novo?demandaId=${demandaId}`}>
            Abrir página completa (anexar áudio/transcrição) →
          </a>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button
            disabled={!assunto || mut.isPending}
            onClick={() => {
              if (!demanda) return;
              mut.mutate({
                assistidoId: demanda.assistidoId,
                processoId: demanda.processoId,
                dataAtendimento: new Date(),
                tipo, interlocutor, assunto, resumo,
              });
            }}
          >Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Conectar ao FAB**

Em `timeline-fab.tsx`, importar e renderizar:

```tsx
import { EventFormAtendimento } from "./event-form-atendimento";
// ...
<EventFormAtendimento
  demandaId={demandaId}
  open={openForm === "atendimento"}
  onOpenChange={(v) => setOpenForm(v ? "atendimento" : null)}
/>
```

- [ ] **Step 3: Testar manualmente**

FAB → "Atendimento" → preencher → salvar. Verificar que entra na timeline e que (se a demanda tem `processoId` com outras demandas abertas) também aparece nelas.

- [ ] **Step 4: Commit**

```bash
git add src/components/demanda-eventos/event-form-atendimento.tsx \
  src/components/demanda-eventos/timeline-fab.tsx
git commit -m "feat(demanda-eventos): form atendimento manual"
```

---

### Task 14: Form de observação

**Files:**
- Create: `src/components/demanda-eventos/event-form-observacao.tsx`
- Modify: `src/components/demanda-eventos/timeline-fab.tsx`

- [ ] **Step 1: Form simples**

```tsx
// src/components/demanda-eventos/event-form-observacao.tsx
"use client";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc/client";
import { toast } from "sonner";

export function EventFormObservacao({
  demandaId, open, onOpenChange,
}: { demandaId: number; open: boolean; onOpenChange: (v: boolean) => void }) {
  const [texto, setTexto] = useState("");
  const utils = trpc.useUtils();
  const mut = trpc.demandaEventos.create.useMutation({
    onSuccess: () => {
      toast.success("Observação registrada");
      utils.demandaEventos.list.invalidate({ demandaId });
      utils.demandaEventos.lastByDemandaIds.invalidate();
      onOpenChange(false);
      setTexto("");
    },
    onError: e => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Observação</DialogTitle></DialogHeader>
        <Textarea
          maxLength={1000} rows={6}
          placeholder="Anotação livre"
          value={texto} onChange={e => setTexto(e.target.value)}
        />
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button
            disabled={!texto.trim() || mut.isPending}
            onClick={() => mut.mutate({
              demandaId, tipo: "observacao",
              resumo: texto.slice(0, 140),
              descricao: texto.length > 140 ? texto : undefined,
            })}
          >Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Conectar ao FAB** (espelhar Task 13).

- [ ] **Step 3: Testar manualmente.**

- [ ] **Step 4: Commit**

```bash
git add src/components/demanda-eventos/event-form-observacao.tsx \
  src/components/demanda-eventos/timeline-fab.tsx
git commit -m "feat(demanda-eventos): form observação"
```

---

## Phase 5 — Triagem

### Task 15: Página `/admin/triagem`

**Files:**
- Create: `src/app/(dashboard)/admin/triagem/page.tsx`
- Create: `src/components/triagem/triagem-list.tsx`

- [ ] **Step 1: Page wrapper**

```tsx
// src/app/(dashboard)/admin/triagem/page.tsx
import { TriagemList } from "@/components/triagem/triagem-list";
import { getSession } from "@/lib/auth/session";

export default async function TriagemPage() {
  const user = await getSession();
  if (!user) return null;
  return (
    <div className="px-4 py-6">
      <h1 className="text-xl font-semibold mb-1">Triagem de demandas</h1>
      <p className="text-sm text-neutral-500 mb-4">
        Demandas pendentes de distribuição ou priorização.
      </p>
      <TriagemList defensorId={user.id} role={user.role} />
    </div>
  );
}
```

- [ ] **Step 2: Componente lista**

```tsx
// src/components/triagem/triagem-list.tsx
"use client";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";

export function TriagemList({ defensorId, role }: { defensorId: number; role: string }) {
  const { data: demandas, refetch } = trpc.demandas.list.useQuery({
    status: "5_TRIAGEM",
    defensorId: role === "admin" ? undefined : defensorId,
    limit: 100,
  });
  const distribuir = trpc.demandas.update.useMutation({ onSuccess: () => refetch() });
  const arquivar = trpc.demandas.update.useMutation({ onSuccess: () => refetch() });

  if (!demandas?.length) {
    return <div className="text-sm text-neutral-400 py-8 text-center">Sem pendências.</div>;
  }
  return (
    <div className="border rounded divide-y">
      {demandas.map(d => (
        <div key={d.id} className="flex items-center justify-between px-4 py-2 hover:bg-neutral-50">
          <div className="min-w-0">
            <div className="text-sm font-medium truncate">{d.assistido}</div>
            <div className="text-xs text-neutral-500">{d.processo?.numero} · {d.ato}</div>
          </div>
          <div className="flex gap-2 shrink-0">
            <Button size="sm" variant="outline"
              onClick={() => distribuir.mutate({ id: d.id, status: "1_NOVA", defensorId })}>
              Assumir
            </Button>
            <Button size="sm" variant="ghost"
              onClick={() => arquivar.mutate({ id: d.id, status: "6_ARQUIVADA" })}>
              Arquivar
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
```

(Ajustar nomes de mutations/inputs ao que o `demandasRouter` realmente expõe — abrir `src/lib/trpc/routers/demandas.ts` e conferir.)

- [ ] **Step 3: Testar**

Acessar `/admin/triagem` → ver lista. Clicar "Assumir" → demanda some da lista (mudou status).

- [ ] **Step 4: Commit**

```bash
git add src/app/\(dashboard\)/admin/triagem/page.tsx \
  src/components/triagem/triagem-list.tsx
git commit -m "feat(triagem): página /admin/triagem dedicada"
```

---

### Task 16: Badge no menu lateral

**Files:**
- Modify: `src/components/layout/sidebar.tsx` (ou equivalente — buscar onde "Demandas" é renderizado no nav)

- [ ] **Step 1: Localizar nav**

```bash
grep -rn "\"Demandas\"\|/admin/demandas" src/components/layout/ src/components/ 2>/dev/null | head
```

- [ ] **Step 2: Adicionar query de contagem**

No componente do nav:

```tsx
const { data: triagemCount } = trpc.demandas.count.useQuery(
  { status: "5_TRIAGEM" },
  { staleTime: 60_000 },
);
```

(Se `demandas.count` não existir, adicionar em `demandasRouter` — query simples que retorna `db.select({ c: count() }).from(demandas).where(...)`.)

- [ ] **Step 3: Renderizar badge**

No item "Demandas":

```tsx
<NavItem href="/admin/demandas" label="Demandas">
  {!!triagemCount && triagemCount > 0 && (
    <span className="ml-auto inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-amber-500 text-white text-[10px] font-medium">
      {triagemCount}
    </span>
  )}
</NavItem>
```

- [ ] **Step 4: Commit**

```bash
git add src/components/layout/sidebar.tsx src/lib/trpc/routers/demandas.ts
git commit -m "feat(triagem): badge de contagem no menu lateral"
```

---

### Task 17: Remover card de triagem do dashboard

**Files:**
- Modify: `src/app/(dashboard)/admin/page.tsx`

- [ ] **Step 1: Remover bloco**

Em `src/app/(dashboard)/admin/page.tsx:18-23`, remover:

```tsx
{user && (
  <div className="px-4 pt-4">
    <Suspense fallback={null}>
      <AtendimentosPendentesCard defensorId={user.id} workspaceId={user.workspaceId} />
    </Suspense>
  </div>
)}
```

E remover os imports não usados (`Suspense`, `AtendimentosPendentesCard`, `getSession`).

- [ ] **Step 2: NÃO deletar `atendimentos-pendentes-card.tsx`**

Pode ser usado em outro lugar; deixar o componente, só remover o uso aqui. Após deploy estável, dá pra remover via grep posterior.

- [ ] **Step 3: Testar**

Abrir `/admin` → confirmar que o card sumiu, dashboard começa direto no DashboardJuriPage.

- [ ] **Step 4: Commit**

```bash
git add src/app/\(dashboard\)/admin/page.tsx
git commit -m "refactor(dashboard): remove triagem card; movido para /admin/triagem"
```

---

## Phase 6 — Integrações cross-OMBUDS

### Task 18: Aba "Histórico" na página do assistido

**Files:**
- Modify: `src/app/(dashboard)/admin/assistidos/[id]/page.tsx` (ou onde ficam as tabs do assistido)

- [ ] **Step 1: Localizar estrutura de tabs**

```bash
grep -rn "TabsList\|TabsTrigger" src/app/\(dashboard\)/admin/assistidos/ | head
```

- [ ] **Step 2: Adicionar nova aba**

```tsx
<TabsTrigger value="historico">Histórico</TabsTrigger>
```

E o conteúdo:

```tsx
<TabsContent value="historico">
  <AssistidoHistoricoView assistidoId={assistidoId} />
</TabsContent>
```

- [ ] **Step 3: Componente `AssistidoHistoricoView`**

```tsx
// src/components/assistido/assistido-historico-view.tsx
"use client";
import { trpc } from "@/lib/trpc/client";
import { EventLine } from "@/components/demanda-eventos/event-line";

export function AssistidoHistoricoView({ assistidoId }: { assistidoId: number }) {
  const { data } = trpc.demandaEventos.historicoByAssistidoId.useQuery({ assistidoId, limit: 200 });
  if (!data?.length) {
    return <div className="text-sm text-neutral-400 py-8 text-center">Sem histórico ainda.</div>;
  }
  return (
    <div className="space-y-2">
      {data.map(({ evento, demanda }) => (
        <div key={evento.id} className="flex items-start gap-2 py-1 border-b border-neutral-100">
          <div className="flex-1 min-w-0">
            <EventLine evento={{ ...evento, createdAt: evento.createdAt }} />
            <div className="text-[10px] text-neutral-400 ml-5">demanda: {demanda.ato}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add src/app/\(dashboard\)/admin/assistidos/\[id\]/page.tsx \
  src/components/assistido/assistido-historico-view.tsx
git commit -m "feat(assistido): aba histórico agrega eventos de todas demandas"
```

---

### Task 19: Seção timeline na página do processo

Espelha Task 18 mas usa `historicoByProcessoId`.

**Files:**
- Modify: `src/app/(dashboard)/admin/processos/[id]/page.tsx`
- Create: `src/components/processo/processo-historico-view.tsx`

- [ ] **Step 1**: Localizar onde ficam as seções/tabs do processo.
- [ ] **Step 2**: Adicionar seção "Atividade".
- [ ] **Step 3**: Componente reutilizando padrão da Task 18.
- [ ] **Step 4**: Commit `feat(processo): seção atividade agrega eventos das demandas do processo`.

---

### Task 20: KPIs novos no dashboard

**Files:**
- Modify: `src/components/dashboard/kpis-section.tsx`
- Modify: `src/lib/trpc/routers/demanda-eventos.ts` — nova query `kpis`

- [ ] **Step 1: Adicionar query agregada**

```ts
// no router demanda-eventos
  kpis: protectedProcedure
    .input(z.object({ defensorId: z.number().int().positive().optional() }))
    .query(async ({ ctx, input }) => {
      const userId = input.defensorId ?? ctx.session.user.id;
      const [pendentes, vencidas, atividade7d] = await Promise.all([
        db.execute(sql`
          SELECT COUNT(*)::int AS n FROM demanda_eventos e
          JOIN demandas d ON d.id = e.demanda_id
          WHERE e.tipo='diligencia' AND e.status='pendente' AND e.deleted_at IS NULL
            AND d.defensor_id = ${userId}
        `),
        db.execute(sql`
          SELECT COUNT(*)::int AS n FROM demanda_eventos e
          JOIN demandas d ON d.id = e.demanda_id
          WHERE e.tipo='diligencia' AND e.status='pendente' AND e.deleted_at IS NULL
            AND e.prazo < CURRENT_DATE
            AND d.defensor_id = ${userId}
        `),
        db.execute(sql`
          SELECT COUNT(*)::int AS n FROM demanda_eventos e
          JOIN demandas d ON d.id = e.demanda_id
          WHERE e.deleted_at IS NULL
            AND e.created_at >= NOW() - INTERVAL '7 days'
            AND d.defensor_id = ${userId}
        `),
      ]);
      return {
        pendentes: (pendentes as any)[0]?.n ?? 0,
        vencidas: (vencidas as any)[0]?.n ?? 0,
        atividade7d: (atividade7d as any)[0]?.n ?? 0,
      };
    }),
```

- [ ] **Step 2: Renderizar 3 cards de KPI**

Em `kpis-section.tsx`, adicionar:

```tsx
const { data: ev } = trpc.demandaEventos.kpis.useQuery({});
// ...
<KPICard label="Diligências pendentes" value={ev?.pendentes} accent={ev?.vencidas ? "red" : "amber"} />
<KPICard label="Vencidas" value={ev?.vencidas} accent="red" />
<KPICard label="Atividade (7d)" value={ev?.atividade7d} accent="emerald" />
```

- [ ] **Step 3: Commit**

```bash
git add src/components/dashboard/kpis-section.tsx src/lib/trpc/routers/demanda-eventos.ts
git commit -m "feat(dashboard): KPIs novos a partir de demanda_eventos"
```

---

### Task 21: Realtime (opcional/incremental)

**Files:**
- Modify: `src/components/demandas-premium/demandas-premium-view.tsx`

- [ ] **Step 1: Subscribe Supabase**

Adicionar effect que escuta `demanda_eventos` e invalida `lastByDemandaIds`/`pendentesByDemandaIds`:

```tsx
useEffect(() => {
  const channel = supabase
    .channel("demanda-eventos")
    .on("postgres_changes", { event: "*", schema: "public", table: "demanda_eventos" },
      () => {
        utils.demandaEventos.lastByDemandaIds.invalidate();
        utils.demandaEventos.pendentesByDemandaIds.invalidate();
      })
    .subscribe();
  return () => { supabase.removeChannel(channel); };
}, []);
```

(Ajustar imports e `utils` ao padrão local — checar como outras telas fazem subscribe, ex: `src/components/...`.)

- [ ] **Step 2: Habilitar publication para `demanda_eventos`**

No Supabase (via SQL ou Studio):

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE public.demanda_eventos;
```

(Conferir `docs/superpowers/specs/2026-04-27-...` se já existe runbook do realtime no projeto.)

- [ ] **Step 3: Testar com 2 abas**

Abrir kanban em duas abas → criar evento numa → ver atualizar na outra sem reload.

- [ ] **Step 4: Commit**

```bash
git add src/components/demandas-premium/demandas-premium-view.tsx
git commit -m "feat(demanda-eventos): realtime subscribe atualiza kanban"
```

---

## Phase 7 — Cleanup (deferido)

Após 30 dias estáveis em produção, criar PR separado:

- Remover colunas `providencias` e `providencia_resumo` de `demandas` (migration drop column).
- Remover handler `handleProvidenciasChange` de `demandas-premium-view.tsx:1078-1093`.
- Remover referências a esses campos em outros arquivos (ex: linha 1440 export TSV, linha 1871 filtro de busca).

Anotar como TODO/agendar agente:
> Em 2026-05-27, abrir PR removendo campos legados `providencias` e `providencia_resumo` de demandas (após validação em produção).

---

## Self-review

**Spec coverage:** todas as seções da spec têm tasks correspondentes:
- Modelo de dados (`demanda_eventos` + `atendimento_demandas`) — Tasks 1, 2.
- Migração — Task 3.
- 3 tipos com constraints — Tasks 1, 4.
- Permissões — Task 6.
- Hook Plaud — Task 7.
- Card 1-linha + pendência + expand — Tasks 8, 9, 10.
- Drawer com tabs + FAB + 3 forms — Tasks 11–14.
- Página triagem + badge sidebar + remover card — Tasks 15, 16, 17.
- Histórico assistido / processo — Tasks 18, 19.
- KPIs — Task 20.
- Realtime — Task 21.

**Gaps conhecidos (assumidos como tradeoff aceito):**
- Permissões testadas só por revisão de código + manual; não há integration test cobrindo cada role × ação. RLS Supabase é safety net.
- Form de atendimento manual cria atendimento simples; anexar áudio fica via "abrir página completa". OK pra MVP.
- Realtime depende do publication estar habilitado — Step 2 da Task 21 cobre.

**Ambiguidades resolvidas inline:**
- Hook Plaud é em `atendimentos.create` tRPC (não DB trigger).
- Migração de `providencias` antigos vira `diligencia/outro/feita` (sem inferência semântica).
- Cards sem eventos mostram placeholder italic clicável.
