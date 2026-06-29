# Afastamentos ↔ SIGA Alignment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Add 5 additive nullable SIGA columns to `afastamentos` and surface them in the `coberturas` router + a light UI touch, as the scraper's afastamentos landing target.

**Architecture:** Additive columns on the existing `afastamentos` table (one idempotent migration); `coberturas` router `listar`/`atualizar` extended; small metadata line on the coberturas card. No projection, no carreira/coberturaRollup change.

**Tech Stack:** Next.js 15, tRPC, Drizzle/Postgres, Tailwind, vitest.

## Global Constraints

- Additive nullable columns only; existing rows/behaviour unaffected. No other tables. No `vida_funcional` projection. No change to `carreira.ts`/`coberturaRollup` or the old `cobertura.ts` router.
- Dates `YYYY-MM-DD`. Migration hand-scoped (NOT `db:generate`), idempotent.

---

### Task 1: Schema columns + migration

**Files:**
- Modify: `src/lib/db/schema/core.ts` (afastamentos table)
- Create: `drizzle/0063_afastamentos_siga_align.sql`
- Test: `src/lib/db/schema/__tests__/afastamentos-siga-schema.test.ts`

**Interfaces:**
- Produces: 5 new columns on `afastamentos` (`numeroSolicitacao`, `nSiga`, `dataPublicacao`, `situacaoSiga`, `sigaSyncedAt`).

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/db/schema/__tests__/afastamentos-siga-schema.test.ts
import { describe, it, expect } from "vitest";
import { afastamentos } from "@/lib/db/schema";

describe("afastamentos SIGA alignment columns", () => {
  it("exposes the 5 new columns", () => {
    for (const col of ["numeroSolicitacao","nSiga","dataPublicacao","situacaoSiga","sigaSyncedAt"]) {
      expect((afastamentos as unknown as Record<string, unknown>)[col]).toBeDefined();
    }
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/lib/db/schema/__tests__/afastamentos-siga-schema.test.ts`
Expected: FAIL — columns undefined.

- [ ] **Step 3: Add the columns**

In `src/lib/db/schema/core.ts`, in the `afastamentos` `pgTable`, add these immediately after `acessoEquipe: boolean("acesso_equipe").default(false),` and before `createdAt:`:

```ts
  numeroSolicitacao: text("numero_solicitacao"),
  nSiga: text("n_siga"),
  dataPublicacao: date("data_publicacao"),
  situacaoSiga: text("situacao_siga"),
  sigaSyncedAt: timestamp("siga_synced_at"),
```

(`text`, `date`, `timestamp` are already imported in core.ts.)

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/lib/db/schema/__tests__/afastamentos-siga-schema.test.ts`
Expected: PASS.

- [ ] **Step 5: Write the scoped migration**

```sql
-- drizzle/0063_afastamentos_siga_align.sql
-- Alinhamento Afastamentos↔SIGA: campos formais (aditivo/idempotente).
ALTER TABLE "afastamentos" ADD COLUMN IF NOT EXISTS "numero_solicitacao" text;--> statement-breakpoint
ALTER TABLE "afastamentos" ADD COLUMN IF NOT EXISTS "n_siga" text;--> statement-breakpoint
ALTER TABLE "afastamentos" ADD COLUMN IF NOT EXISTS "data_publicacao" date;--> statement-breakpoint
ALTER TABLE "afastamentos" ADD COLUMN IF NOT EXISTS "situacao_siga" text;--> statement-breakpoint
ALTER TABLE "afastamentos" ADD COLUMN IF NOT EXISTS "siga_synced_at" timestamp;
```

- [ ] **Step 6: Typecheck + commit**

Run: `npx tsc --noEmit`
Expected: no new errors.

```bash
git add src/lib/db/schema/core.ts drizzle/0063_afastamentos_siga_align.sql src/lib/db/schema/__tests__/afastamentos-siga-schema.test.ts
git commit -m "feat(afastamentos-siga): colunas formais SIGA em afastamentos + migration 0063"
```

---

### Task 2: coberturas router surface + UI touch

**Files:**
- Modify: `src/lib/trpc/routers/coberturas.ts` (`listar` select + `atualizar` input/update)
- Modify: `src/app/(dashboard)/admin/coberturas/page.tsx` (light metadata line) — *if the card lives in a separate component, modify that file instead; locate it first.*
- Test: `src/lib/trpc/routers/__tests__/coberturas-siga.test.ts`

**Interfaces:**
- Consumes: Task 1 columns.
- Produces: `coberturas.listar` returns the 5 fields; `coberturas.atualizar` accepts 4 of them (not `sigaSyncedAt`).

- [ ] **Step 1: Write the failing structural test**

```ts
// src/lib/trpc/routers/__tests__/coberturas-siga.test.ts
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it, expect } from "vitest";
const src = readFileSync(join(process.cwd(), "src/lib/trpc/routers/coberturas.ts"), "utf8");

describe("coberturas router — SIGA fields", () => {
  it("listar selects the SIGA columns", () => {
    expect(src).toMatch(/numeroSolicitacao:\s*afastamentos\.numeroSolicitacao/);
    expect(src).toMatch(/situacaoSiga:\s*afastamentos\.situacaoSiga/);
  });
  it("atualizar accepts numeroSolicitacao + situacaoSiga", () => {
    const idx = src.indexOf("atualizar");
    const seg = src.slice(idx);
    expect(seg).toContain("numeroSolicitacao");
    expect(seg).toContain("situacaoSiga");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/lib/trpc/routers/__tests__/coberturas-siga.test.ts`
Expected: FAIL.

- [ ] **Step 3: Extend `listar`'s select**

In `src/lib/trpc/routers/coberturas.ts`, in the `listar` `.select({...})` object, add after `updatedAt: afastamentos.updatedAt,` (before the `defensorNome` sql line):

```ts
          numeroSolicitacao: afastamentos.numeroSolicitacao,
          nSiga: afastamentos.nSiga,
          dataPublicacao: afastamentos.dataPublicacao,
          situacaoSiga: afastamentos.situacaoSiga,
          sigaSyncedAt: afastamentos.sigaSyncedAt,
```

- [ ] **Step 4: Extend `atualizar`'s input + update**

In the `atualizar` `.input(z.object({...}))`, add after `ativo: z.boolean().optional(),`:

```ts
      numeroSolicitacao: z.string().optional(),
      nSiga: z.string().optional(),
      dataPublicacao: z.string().optional(),
      situacaoSiga: z.string().optional(),
```

And in the mutation body, after `if (input.ativo !== undefined) updateData.ativo = input.ativo;`, add:

```ts
      if (input.numeroSolicitacao !== undefined) updateData.numeroSolicitacao = input.numeroSolicitacao;
      if (input.nSiga !== undefined) updateData.nSiga = input.nSiga;
      if (input.dataPublicacao !== undefined) updateData.dataPublicacao = input.dataPublicacao;
      if (input.situacaoSiga !== undefined) updateData.situacaoSiga = input.situacaoSiga;
```

- [ ] **Step 5: Light UI touch**

Read `src/app/(dashboard)/admin/coberturas/page.tsx` (and any cobertura-card component it renders — e.g. `src/components/cowork/cobertura-modal.tsx` or a card in the page). Where each cobertura/afastamento row is displayed, add a small muted metadata line that renders only when present:

```tsx
{(c.numeroSolicitacao || c.situacaoSiga || c.dataPublicacao) && (
  <div className="text-[11px] text-muted-foreground">
    {c.numeroSolicitacao ? `nº ${c.numeroSolicitacao}` : ""}
    {c.situacaoSiga ? ` · SIGA: ${c.situacaoSiga}` : ""}
    {c.dataPublicacao ? ` · pub. ${c.dataPublicacao}` : ""}
  </div>
)}
```

(Use the actual variable name for the cobertura row in that file. If the page consumes `trpc.coberturas.listar`, the fields are present on each row after Step 3. If it consumes the old `cobertura.ts` router instead, the fields are also present — they come through `findMany`. Keep dark-mode/token-consistent; do not hardcode colors tokens cover.)

- [ ] **Step 6: Verify + commit**

Run: `npx vitest run src/lib/trpc/routers/__tests__/coberturas-siga.test.ts`
Expected: PASS.

Run: `npx tsc --noEmit`
Expected: no new errors from `coberturas.ts` or the touched page.

```bash
git add src/lib/trpc/routers/coberturas.ts src/lib/trpc/routers/__tests__/coberturas-siga.test.ts "src/app/(dashboard)/admin/coberturas/page.tsx"
git commit -m "feat(afastamentos-siga): coberturas router surface dos campos SIGA + metadata na UI"
```

(If the UI metadata went into a component file other than `page.tsx`, stage that file instead/also.)

---

## Self-Review

**Spec coverage:** §4 columns + migration → Task 1; §5 router → Task 2 Steps 3-4; §6 UI → Task 2 Step 5; §7 testing → both tasks. ✓ No projection, no carreira/coberturaRollup change, no cobertura.ts change. ✓

**Placeholder scan:** no TBDs; the UI step says "locate the card component and add this concrete JSX with the row's real variable name" — a real instruction with the exact snippet, since the card's host file must be confirmed by reading.

**Type consistency:** column names identical between schema (Task 1), the `listar` select and `atualizar` (Task 2), and the UI read (Task 2 Step 5). `dataPublicacao` is `z.string().optional()` matching the existing `dataFim` convention.
