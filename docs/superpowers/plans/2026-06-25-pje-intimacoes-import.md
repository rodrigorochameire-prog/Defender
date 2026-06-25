# Importação de Intimações do PJe por Atribuição — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a button on the demandas page that scrapes PJe expedientes per atribuição via the daemon's browser lane, stages them on a review page (dedup-aware), and inserts only the demandas the user confirms.

**Architecture:** Python worker (browser lane) scrapes PJe and writes ephemeral staging rows + a permanent dedup ledger — never touching `demandas`. TypeScript reuses the existing `importarDemandas()` / `verificarDuplicatas()` to enrich (live fuzzy dedup), confirm, and insert. A new Next.js page renders staging → confirm.

**Tech Stack:** Next.js 15 (App Router, `use(params)`), tRPC, Drizzle ORM (PostgreSQL/Supabase), Supabase Realtime, Python 3 + Playwright (CDP), Vitest, Python `unittest`.

## Global Constraints

- **Zero paid API.** The worker runs in the daemon's `browser` lane (Python only); it must NOT call any paid LLM API. Daemon already strips paid keys from the child env — do not add any.
- **Never write to `demandas` from the worker.** The worker writes only `pje_import_staging` and `pje_intimacoes_ledger`. Inserts into `demandas` happen only in `confirmarImport` via `importarDemandas()`.
- **Atribuições in scope:** `VVD_CAMACARI`, `JURI_CAMACARI` only. `EXECUCAO_PENAL` is disabled in the UI ("em breve").
- **Default demanda status on import:** `5_TRIAGEM`. Default `origem`: `pje`.
- **Dedup keys:** strong key `pjeDocumentoId`; fallback unique key `contentHash = sha256(processoNumero + "|" + (pjeDocumentoId ?? "") + "|" + conteudoNormalizado)`, where `conteudoNormalizado` = lowercased, collapsed-whitespace, trimmed `conteudo`. The SAME formula is used in Python (worker) and TypeScript (any re-derivation) — keep them identical.
- **Job payload channel:** the daemon reads job input from `claude_code_tasks.instrucaoAdicional` (a JSON string) and passes it to the Python script as CLI argv. Follow the existing `enqueueVarredura` pattern verbatim.
- **Test gate:** `CI=1 npx vitest run <file>` for TS; `python3 -m unittest <module>` for Python pure-logic tests.
- **Migrations:** new schema file must be re-exported from `src/lib/db/schema/index.ts`; generate with `npm run db:generate`, apply with `npm run db:push`.

---

## File Structure

**Create:**
- `src/lib/db/schema/pje-import.ts` — `pjeImportStaging` + `pjeIntimacoesLedger` tables + types.
- `src/lib/services/pje-intimacoes-import.ts` — pure server helpers: `normalizeConteudo`, `computeContentHash`, `enrichStagingWithLiveDedup`, `stagingRowToImportRow`, `buildLedgerUpserts`.
- `src/lib/services/pje-intimacoes-import.test.ts` — Vitest unit tests for the above.
- `src/lib/trpc/routers/intimacoes.ts` — `criarImportJob`, `listStaging`, `confirmarImport`.
- `src/lib/trpc/routers/intimacoes.test.ts` — Vitest test for the `buildJobMeta` helper.
- `.claude/skills/pje-intimacoes-import/scripts/pje_intimacoes_import.py` — the scrape worker.
- `.claude/skills/pje-intimacoes-import/scripts/test_pje_intimacoes_import.py` — Python `unittest` for pure helpers.
- `.claude/skills/pje-intimacoes-import/SKILL.md` — skill doc (browser-lane scraper).
- `src/components/demandas-premium/intimacoes-import-modal.tsx` — config modal.
- `src/app/(dashboard)/admin/demandas/importar/[jobId]/page.tsx` — staging route.
- `src/components/demandas-premium/intimacoes-staging-view.tsx` — staging client view.

**Modify:**
- `src/lib/db/schema/enums.ts` — add `stagingDecisaoEnum`, `ledgerDecisaoEnum`.
- `src/lib/db/schema/index.ts` — re-export `./pje-import`.
- `src/lib/trpc/routers/_app.ts` (root router) — register `intimacoes`.
- `scripts/browser-broker-daemon.mjs` — add `pje-intimacoes-import` to `SKILL_REGISTRY`.
- `src/components/demandas-premium/import-dropdown.tsx` — add `onImportIntimacoesPJe` prop + item.
- `src/components/demandas-premium/demandas-premium-view.tsx` — wire the modal.

---

## Task 1: Schema — staging + ledger tables

**Files:**
- Modify: `src/lib/db/schema/enums.ts` (append two enums)
- Create: `src/lib/db/schema/pje-import.ts`
- Modify: `src/lib/db/schema/index.ts` (add re-export)

**Interfaces:**
- Produces: tables `pjeImportStaging`, `pjeIntimacoesLedger`; types `PjeImportStaging`, `InsertPjeImportStaging`, `PjeIntimacoesLedger`, `InsertPjeIntimacoesLedger`; enums `stagingDecisaoEnum` (`nova|duplicada|ja_importada|incerta`), `ledgerDecisaoEnum` (`imported|skipped|duplicate`).

- [ ] **Step 1: Add the two enums**

In `src/lib/db/schema/enums.ts`, append at the end of the file (after `demandaOrigemEnum`):

```typescript
// Importação de intimações do PJe — decisão de dedup na staging
export const stagingDecisaoEnum = pgEnum("staging_decisao", [
  "nova",
  "duplicada",
  "ja_importada",
  "incerta",
]);

// Importação de intimações do PJe — decisão registrada no ledger permanente
export const ledgerDecisaoEnum = pgEnum("ledger_decisao", [
  "imported",
  "skipped",
  "duplicate",
]);
```

- [ ] **Step 2: Create the schema file**

Create `src/lib/db/schema/pje-import.ts`:

```typescript
import {
  pgTable,
  serial,
  integer,
  text,
  varchar,
  boolean,
  timestamp,
  date,
  jsonb,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import {
  atribuicaoEnum,
  stagingDecisaoEnum,
  ledgerDecisaoEnum,
} from "./enums";

// Efêmera: 1 linha por expediente raspado num job. Pode ser podada após confirm.
export const pjeImportStaging = pgTable("pje_import_staging", {
  id: serial("id").primaryKey(),
  jobId: integer("job_id").notNull(), // = claude_code_tasks.id
  atribuicao: atribuicaoEnum("atribuicao"),
  processoNumero: varchar("processo_numero", { length: 40 }),
  assistidoNome: text("assistido_nome"),
  ato: text("ato"),
  tipoDocumento: varchar("tipo_documento", { length: 80 }),
  dataExpedicao: timestamp("data_expedicao"),
  dataIntimacao: timestamp("data_intimacao"),
  prazo: date("prazo"),
  conteudo: text("conteudo"),
  pjeDocumentoId: varchar("pje_documento_id", { length: 30 }),
  contentHash: varchar("content_hash", { length: 64 }).notNull(),
  decisao: stagingDecisaoEnum("decisao").notNull().default("nova"),
  matchedDemandaId: integer("matched_demanda_id"),
  matchedLedgerId: integer("matched_ledger_id"),
  selected: boolean("selected").notNull().default(false),
  revisao: jsonb("revisao").$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("pje_import_staging_job_id_idx").on(table.jobId),
  index("pje_import_staging_content_hash_idx").on(table.contentHash),
]);

export type PjeImportStaging = typeof pjeImportStaging.$inferSelect;
export type InsertPjeImportStaging = typeof pjeImportStaging.$inferInsert;

// Permanente: memória de toda intimação já vista (importada/pulada/duplicada).
export const pjeIntimacoesLedger = pgTable("pje_intimacoes_ledger", {
  id: serial("id").primaryKey(),
  pjeDocumentoId: varchar("pje_documento_id", { length: 30 }),
  contentHash: varchar("content_hash", { length: 64 }).notNull(),
  processoNumero: varchar("processo_numero", { length: 40 }),
  processoId: integer("processo_id"),
  atribuicao: atribuicaoEnum("atribuicao"),
  decisao: ledgerDecisaoEnum("decisao").notNull(),
  demandaId: integer("demanda_id"),
  firstSeenAt: timestamp("first_seen_at").defaultNow().notNull(),
  lastSeenAt: timestamp("last_seen_at").defaultNow().notNull(),
  jobId: integer("job_id"),
}, (table) => [
  // Chave forte: pjeDocumentoId único quando presente.
  uniqueIndex("pje_ledger_documento_id_uidx")
    .on(table.pjeDocumentoId)
    .where(sql`pje_documento_id IS NOT NULL`),
  // Chave fallback: contentHash único quando NÃO há pjeDocumentoId.
  uniqueIndex("pje_ledger_content_hash_uidx")
    .on(table.contentHash)
    .where(sql`pje_documento_id IS NULL`),
  index("pje_ledger_processo_numero_idx").on(table.processoNumero),
]);

export type PjeIntimacoesLedger = typeof pjeIntimacoesLedger.$inferSelect;
export type InsertPjeIntimacoesLedger = typeof pjeIntimacoesLedger.$inferInsert;
```

- [ ] **Step 3: Re-export from the barrel**

In `src/lib/db/schema/index.ts`, add (near the other `export *` lines):

```typescript
export * from "./pje-import";
```

- [ ] **Step 4: Generate the migration**

Run: `npm run db:generate`
Expected: a new SQL file appears under `./drizzle/` creating `staging_decisao` + `ledger_decisao` enums and both tables. Open it and confirm it has the two `CREATE UNIQUE INDEX ... WHERE ...` partial indexes.

- [ ] **Step 5: Apply the migration**

Run: `npm run db:push`
Expected: success, no errors. (If it prompts about the new enums/tables, accept the create.)

- [ ] **Step 6: Verify tables exist**

Run: `npm run db:studio` (or a quick `psql`/Supabase check) and confirm `pje_import_staging` and `pje_intimacoes_ledger` exist with the columns above. Close studio.

- [ ] **Step 7: Commit**

```bash
git add src/lib/db/schema/enums.ts src/lib/db/schema/pje-import.ts src/lib/db/schema/index.ts drizzle/
git commit -m "feat(intimacoes): schema de staging + ledger para import de intimações PJe"
```

---

## Task 2: Pure dedup/mapping service (TDD)

This is the most logic-dense, fully-testable unit. Build it test-first.

**Files:**
- Create: `src/lib/services/pje-intimacoes-import.ts`
- Test: `src/lib/services/pje-intimacoes-import.test.ts`

**Interfaces:**
- Consumes: `ImportRow` (from `src/lib/services/pje-import.ts`), `verificarDuplicatas` + `IntimacaoPJeSimples` + `ResultadoVerificacaoDuplicatas` (from `src/lib/pje-parser.ts`), `PjeImportStaging` (from schema).
- Produces:
  - `normalizeConteudo(s: string): string`
  - `computeContentHash(processoNumero: string, pjeDocumentoId: string | null, conteudo: string): string` (sha256 hex)
  - `stagingRowToImportRow(row: PjeImportStaging): ImportRow`
  - `buildLedgerUpserts(rows: PjeImportStaging[], selectedIds: Set<number>, jobId: number): LedgerUpsert[]` where
    `type LedgerUpsert = { pjeDocumentoId: string | null; contentHash: string; processoNumero: string | null; atribuicao: string | null; decisao: "imported" | "skipped" | "duplicate"; jobId: number }`
    (note: `demandaId` is filled in later by the caller after insert; not set here)

- [ ] **Step 1: Write failing tests**

Create `src/lib/services/pje-intimacoes-import.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import {
  normalizeConteudo,
  computeContentHash,
  buildLedgerUpserts,
} from "./pje-intimacoes-import";
import type { PjeImportStaging } from "@/lib/db/schema/pje-import";

function mkRow(over: Partial<PjeImportStaging>): PjeImportStaging {
  return {
    id: 1, jobId: 10, atribuicao: "VVD_CAMACARI", processoNumero: "0001",
    assistidoNome: "Fulano", ato: "Intimação", tipoDocumento: null,
    dataExpedicao: null, dataIntimacao: null, prazo: null, conteudo: "x",
    pjeDocumentoId: "DOC1", contentHash: "h", decisao: "nova",
    matchedDemandaId: null, matchedLedgerId: null, selected: false,
    revisao: null, createdAt: new Date(),
    ...over,
  } as PjeImportStaging;
}

describe("normalizeConteudo", () => {
  it("lowercases, trims and collapses whitespace", () => {
    expect(normalizeConteudo("  Olá   MUNDO\n\t teste ")).toBe("olá mundo teste");
  });
});

describe("computeContentHash", () => {
  it("is deterministic and 64 hex chars", () => {
    const a = computeContentHash("0001", "DOC1", "Conteúdo  X");
    const b = computeContentHash("0001", "DOC1", "conteúdo x");
    expect(a).toBe(b); // normalization makes them equal
    expect(a).toMatch(/^[0-9a-f]{64}$/);
  });
  it("treats null pjeDocumentoId as empty component", () => {
    const a = computeContentHash("0001", null, "x");
    const b = computeContentHash("0001", "", "x");
    expect(a).toBe(b);
  });
});

describe("buildLedgerUpserts", () => {
  it("selected -> imported; unselected nova -> skipped; dup -> duplicate", () => {
    const rows = [
      mkRow({ id: 1, decisao: "nova", contentHash: "h1" }),
      mkRow({ id: 2, decisao: "nova", contentHash: "h2" }),
      mkRow({ id: 3, decisao: "duplicada", contentHash: "h3" }),
      mkRow({ id: 4, decisao: "ja_importada", contentHash: "h4" }),
    ];
    const out = buildLedgerUpserts(rows, new Set([1]), 10);
    const by = (h: string) => out.find((u) => u.contentHash === h)!;
    expect(by("h1").decisao).toBe("imported");   // selected
    expect(by("h2").decisao).toBe("skipped");     // nova but unchecked
    expect(by("h3").decisao).toBe("duplicate");   // dup
    expect(by("h4").decisao).toBe("duplicate");   // already imported -> duplicate sighting
    expect(out.every((u) => u.jobId === 10)).toBe(true);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `CI=1 npx vitest run src/lib/services/pje-intimacoes-import.test.ts`
Expected: FAIL — module `./pje-intimacoes-import` not found.

- [ ] **Step 3: Implement the service**

Create `src/lib/services/pje-intimacoes-import.ts`:

```typescript
import { createHash } from "node:crypto";
import type { ImportRow } from "@/lib/services/pje-import";
import { verificarDuplicatas } from "@/lib/pje-parser";
import type { PjeImportStaging } from "@/lib/db/schema/pje-import";

export function normalizeConteudo(s: string): string {
  return (s ?? "").toLowerCase().replace(/\s+/g, " ").trim();
}

export function computeContentHash(
  processoNumero: string,
  pjeDocumentoId: string | null,
  conteudo: string,
): string {
  const payload = `${processoNumero ?? ""}|${pjeDocumentoId ?? ""}|${normalizeConteudo(conteudo)}`;
  return createHash("sha256").update(payload, "utf8").digest("hex");
}

export function stagingRowToImportRow(row: PjeImportStaging): ImportRow {
  const rev = (row.revisao ?? {}) as Record<string, unknown>;
  const pick = <T>(k: string, fallback: T): T =>
    (rev[k] as T | undefined) ?? fallback;
  return {
    assistido: pick("assistidoNome", row.assistidoNome ?? ""),
    processoNumero: pick("processoNumero", row.processoNumero ?? undefined),
    ato: pick("ato", row.ato ?? ""),
    prazo: pick("prazo", row.prazo ?? undefined),
    dataExpedicaoCompleta: row.dataExpedicao
      ? row.dataExpedicao.toISOString()
      : undefined,
    atribuicao: pick("atribuicao", row.atribuicao ?? undefined),
    tipoDocumento: row.tipoDocumento ?? undefined,
    idDocumentoPje: row.pjeDocumentoId ?? undefined,
    assistidoMatchId: pick<number | undefined>("assistidoMatchId", undefined),
  };
}

export type LedgerUpsert = {
  pjeDocumentoId: string | null;
  contentHash: string;
  processoNumero: string | null;
  atribuicao: string | null;
  decisao: "imported" | "skipped" | "duplicate";
  jobId: number;
};

export function buildLedgerUpserts(
  rows: PjeImportStaging[],
  selectedIds: Set<number>,
  jobId: number,
): LedgerUpsert[] {
  return rows.map((r) => {
    let decisao: LedgerUpsert["decisao"];
    if (selectedIds.has(r.id)) decisao = "imported";
    else if (r.decisao === "duplicada" || r.decisao === "ja_importada")
      decisao = "duplicate";
    else decisao = "skipped"; // nova/incerta que o usuário não selecionou
    return {
      pjeDocumentoId: r.pjeDocumentoId ?? null,
      contentHash: r.contentHash,
      processoNumero: r.processoNumero ?? null,
      atribuicao: (r.atribuicao as string | null) ?? null,
      decisao,
      jobId,
    };
  });
}

// Layer-B: rebaixa linhas 'nova' para 'incerta' quando verificarDuplicatas
// acha candidata viva. Mutação retornada como novo array (sem efeitos colaterais).
export function enrichStagingWithLiveDedup(
  rows: PjeImportStaging[],
  demandasExistentes: unknown[],
): PjeImportStaging[] {
  const novas = rows.filter((r) => r.decisao === "nova");
  if (novas.length === 0) return rows;
  const intimacoes = novas.map((r) => ({
    idDocumento: r.pjeDocumentoId ?? undefined,
    numeroProcesso: r.processoNumero ?? undefined,
    nomeAssistido: r.assistidoNome ?? undefined,
    dataExpedicao: r.dataExpedicao ? r.dataExpedicao.toISOString() : undefined,
    _stagingId: r.id,
  })) as unknown as Parameters<typeof verificarDuplicatas>[0];
  const res = verificarDuplicatas(intimacoes, demandasExistentes as never[]);
  const dupStagingIds = new Set(
    (res.duplicadas as unknown as Array<{ _stagingId?: number }>)
      .map((d) => d._stagingId)
      .filter((x): x is number => typeof x === "number"),
  );
  return rows.map((r) =>
    dupStagingIds.has(r.id) && r.decisao === "nova"
      ? { ...r, decisao: "incerta" as const }
      : r,
  );
}
```

> **Note for the implementer:** `verificarDuplicatas` lives at `src/lib/pje-parser.ts:1109`. Read its `IntimacaoPJeSimples` input type before wiring `enrichStagingWithLiveDedup` — the field names (`idDocumento`, `numeroProcesso`, `nomeAssistido`, `dataExpedicao`) must match that interface exactly; adjust the mapping above if the real field names differ. The `_stagingId` passthrough is how we map results back to staging rows; if `verificarDuplicatas` strips unknown fields, fall back to matching by `idDocumento`/`numeroProcesso`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `CI=1 npx vitest run src/lib/services/pje-intimacoes-import.test.ts`
Expected: PASS (3 describe blocks, 5 assertions).

- [ ] **Step 5: Commit**

```bash
git add src/lib/services/pje-intimacoes-import.ts src/lib/services/pje-intimacoes-import.test.ts
git commit -m "feat(intimacoes): serviço puro de hash, mapeamento e dedup ledger (TDD)"
```

---

## Task 3: tRPC `criarImportJob` + router registration

Mirrors `analise.enqueueVarredura` (`src/lib/trpc/routers/analise.ts:215-267`).

**Files:**
- Create: `src/lib/trpc/routers/intimacoes.ts`
- Create: `src/lib/trpc/routers/intimacoes.test.ts`
- Modify: root router `src/lib/trpc/routers/_app.ts` (register `intimacoes`)

**Interfaces:**
- Consumes: `claudeCodeTasks` (schema `casos.ts`), `protectedProcedure`/`router` (the repo's tRPC builders).
- Produces:
  - helper `buildJobMeta(input): { atribuicoes: string[]; since?: string; until?: string; limit: number }`
  - `intimacoes.criarImportJob` mutation → `{ success: boolean; existing: boolean; taskId: number }`

- [ ] **Step 1: Write failing test for `buildJobMeta`**

Create `src/lib/trpc/routers/intimacoes.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { buildJobMeta } from "./intimacoes";

describe("buildJobMeta", () => {
  it("defaults limit to 80 and keeps selected atribuições", () => {
    const m = buildJobMeta({ atribuicoes: ["VVD_CAMACARI", "JURI_CAMACARI"] });
    expect(m.atribuicoes).toEqual(["VVD_CAMACARI", "JURI_CAMACARI"]);
    expect(m.limit).toBe(80);
    expect(m.since).toBeUndefined();
  });
  it("passes through interval and limit", () => {
    const m = buildJobMeta({
      atribuicoes: ["VVD_CAMACARI"], since: "2026-06-01", until: "2026-06-25", limit: 40,
    });
    expect(m.since).toBe("2026-06-01");
    expect(m.until).toBe("2026-06-25");
    expect(m.limit).toBe(40);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `CI=1 npx vitest run src/lib/trpc/routers/intimacoes.test.ts`
Expected: FAIL — `buildJobMeta` not found.

- [ ] **Step 3: Implement the router**

> **First read** `src/lib/trpc/routers/analise.ts:1-30` (imports) and `:215-267` (the `enqueueVarredura` mutation) to copy the exact import paths for `router`, `protectedProcedure`, `db`, `claudeCodeTasks`, and the `and`/`eq`/`inArray` drizzle helpers. Use those exact import lines here.

Create `src/lib/trpc/routers/intimacoes.ts`:

```typescript
import { z } from "zod";
// Copy these import lines from analise.ts (paths must match this repo):
import { router, protectedProcedure } from "@/lib/trpc/trpc";
import { db } from "@/lib/db";
import { claudeCodeTasks } from "@/lib/db/schema";
import { and, eq, inArray } from "drizzle-orm";

const ATRIBUICOES_PERMITIDAS = ["VVD_CAMACARI", "JURI_CAMACARI"] as const;

const criarImportJobInput = z.object({
  atribuicoes: z.array(z.enum(ATRIBUICOES_PERMITIDAS)).min(1),
  since: z.string().optional(), // YYYY-MM-DD
  until: z.string().optional(), // YYYY-MM-DD
  limit: z.number().int().min(1).max(500).optional(),
});

export type CriarImportJobInput = z.infer<typeof criarImportJobInput>;

export function buildJobMeta(input: CriarImportJobInput) {
  return {
    atribuicoes: input.atribuicoes,
    since: input.since,
    until: input.until,
    limit: input.limit ?? 80,
  };
}

export const intimacoesRouter = router({
  criarImportJob: protectedProcedure
    .input(criarImportJobInput)
    .mutation(async ({ ctx, input }) => {
      // Dedup: nenhum job de import ativo (qualquer atribuição) — evita scrapes concorrentes.
      const emAndamento = await db
        .select({ id: claudeCodeTasks.id })
        .from(claudeCodeTasks)
        .where(
          and(
            eq(claudeCodeTasks.skill, "pje-intimacoes-import"),
            inArray(claudeCodeTasks.status, ["pending", "processing"]),
          ),
        )
        .limit(1);

      if (emAndamento.length > 0) {
        return { success: true, existing: true, taskId: emAndamento[0].id };
      }

      const meta = buildJobMeta(input);
      const [task] = await db
        .insert(claudeCodeTasks)
        .values({
          skill: "pje-intimacoes-import",
          lane: "browser",
          prompt: `Importar intimações PJe — ${meta.atribuicoes.join(", ")} (lane browser)`,
          instrucaoAdicional: JSON.stringify(meta),
          status: "pending",
          createdBy: ctx.user.id,
        })
        .returning({ id: claudeCodeTasks.id });

      return { success: true, existing: false, taskId: task.id };
    }),
});
```

- [ ] **Step 4: Register the router**

In the root router (find it: `src/lib/trpc/routers/_app.ts` or `root.ts`), import and add:

```typescript
import { intimacoesRouter } from "./intimacoes";
// ...inside the router({...}) map:
  intimacoes: intimacoesRouter,
```

- [ ] **Step 5: Run test to verify it passes**

Run: `CI=1 npx vitest run src/lib/trpc/routers/intimacoes.test.ts`
Expected: PASS.

- [ ] **Step 6: Typecheck**

Run: `npm run typecheck` (or `npx tsc --noEmit`)
Expected: no new errors in the two new files. Fix import paths if `@/lib/trpc/trpc` / `@/lib/db` differ from analise.ts.

- [ ] **Step 7: Commit**

```bash
git add src/lib/trpc/routers/intimacoes.ts src/lib/trpc/routers/intimacoes.test.ts src/lib/trpc/routers/_app.ts
git commit -m "feat(intimacoes): criarImportJob (enfileira job browser, dedup de job ativo)"
```

---

## Task 4: Python scrape worker + pure-logic tests

The DOM navigation is reused from `varredura_triagem.py`; only the pure helpers are unit-tested (scraping a live site is verified manually).

**Files:**
- Create: `.claude/skills/pje-intimacoes-import/scripts/pje_intimacoes_import.py`
- Create: `.claude/skills/pje-intimacoes-import/scripts/test_pje_intimacoes_import.py`
- Create: `.claude/skills/pje-intimacoes-import/SKILL.md`

**Interfaces:**
- Produces (Python): `normalize_conteudo(s) -> str`, `compute_content_hash(processo, doc_id, conteudo) -> str` (MUST match the TS formula byte-for-byte), `decide_layer_a(doc_id, content_hash, ledger_index) -> str` returning one of `nova|duplicada|ja_importada`.
- CLI contract (consumed by Task 5 daemon entry): `pje_intimacoes_import.py --job-id N --atribuicoes VVD_CAMACARI,JURI_CAMACARI [--since YYYY-MM-DD] [--until YYYY-MM-DD] [--limit N] [--modo cdp|direct]`.

- [ ] **Step 1: Write failing pure-logic tests**

Create `.claude/skills/pje-intimacoes-import/scripts/test_pje_intimacoes_import.py`:

```python
import unittest
from pje_intimacoes_import import normalize_conteudo, compute_content_hash, decide_layer_a


class TestPureHelpers(unittest.TestCase):
    def test_normalize(self):
        self.assertEqual(normalize_conteudo("  Olá   MUNDO\n\t teste "), "olá mundo teste")

    def test_hash_matches_normalization(self):
        a = compute_content_hash("0001", "DOC1", "Conteúdo  X")
        b = compute_content_hash("0001", "DOC1", "conteúdo x")
        self.assertEqual(a, b)
        self.assertRegex(a, r"^[0-9a-f]{64}$")

    def test_hash_null_doc_id(self):
        self.assertEqual(
            compute_content_hash("0001", None, "x"),
            compute_content_hash("0001", "", "x"),
        )

    def test_decide_layer_a(self):
        ledger = {"by_doc": {"DOC1": "imported"}, "by_hash": {"HASH2": "skipped"}}
        self.assertEqual(decide_layer_a("DOC1", "h", ledger), "ja_importada")
        self.assertEqual(decide_layer_a(None, "HASH2", ledger), "duplicada")
        self.assertEqual(decide_layer_a("DOCX", "hx", ledger), "nova")


if __name__ == "__main__":
    unittest.main()
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd .claude/skills/pje-intimacoes-import/scripts && python3 -m unittest test_pje_intimacoes_import`
Expected: FAIL — cannot import `pje_intimacoes_import`.

- [ ] **Step 3: Implement the worker (pure helpers complete; scraping reuses varredura)**

> **Reuse instruction:** Open `.claude/skills/varredura-triagem/scripts/varredura_triagem.py` and reuse, by copying or importing: (a) `load_env()`, (b) the `Supabase` REST client class (lines ~117-124), (c) the CDP attach `connect_over_cdp("http://127.0.0.1:9222")` and the headless-login fallback, and (d) the Painel do Defensor navigation. The NEW navigation target is the **EXPEDIENTES** tab filtered by atribuição + date interval. Discover the EXPEDIENTES row selectors live (they are not in this plan — inspect the painel DOM during implementation) and extract per expediente: processo, assistido, tipo/ato, dataExpedicao, dataIntimacao, prazo, conteudo, pjeDocumentoId.

Create `.claude/skills/pje-intimacoes-import/scripts/pje_intimacoes_import.py`:

```python
#!/usr/bin/env python3
"""Worker (browser lane): raspa EXPEDIENTES do PJe por atribuição e grava em
pje_import_staging (NUNCA em demandas). Decisão de dedup Layer-A via ledger.

Reusa de varredura_triagem.py: load_env, Supabase, CDP attach + login fallback,
e a navegação do Painel do Defensor. Ver instrução de reuso no plano.
"""
import argparse
import hashlib
import re
import sys

CDP_URL = "http://127.0.0.1:9222"


def normalize_conteudo(s):
    s = s or ""
    return re.sub(r"\s+", " ", s).strip().lower()


def compute_content_hash(processo, doc_id, conteudo):
    payload = "%s|%s|%s" % (processo or "", doc_id or "", normalize_conteudo(conteudo))
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def decide_layer_a(doc_id, content_hash, ledger_index):
    """ledger_index = {"by_doc": {docId: decisao}, "by_hash": {hash: decisao}}.
    Retorna 'nova' | 'duplicada' | 'ja_importada'."""
    if doc_id and doc_id in ledger_index.get("by_doc", {}):
        prev = ledger_index["by_doc"][doc_id]
        return "ja_importada" if prev == "imported" else "duplicada"
    if content_hash in ledger_index.get("by_hash", {}):
        prev = ledger_index["by_hash"][content_hash]
        return "ja_importada" if prev == "imported" else "duplicada"
    return "nova"


def load_ledger_index(sb):
    """Lê pje_intimacoes_ledger e indexa por doc id e por hash."""
    rows = sb.select("pje_intimacoes_ledger",
                     "pje_documento_id,content_hash,decisao") or []
    idx = {"by_doc": {}, "by_hash": {}}
    for r in rows:
        if r.get("pje_documento_id"):
            idx["by_doc"][r["pje_documento_id"]] = r["decisao"]
        if r.get("content_hash"):
            idx["by_hash"][r["content_hash"]] = r["decisao"]
    return idx


def set_etapa(sb, job_id, texto):
    sb.update("claude_code_tasks", {"id": "eq.%d" % job_id}, {"etapa": texto})


def parse_args(argv=None):
    p = argparse.ArgumentParser()
    p.add_argument("--job-id", type=int, required=True)
    p.add_argument("--atribuicoes", required=True,
                   help="CSV: VVD_CAMACARI,JURI_CAMACARI")
    p.add_argument("--since", default=None)
    p.add_argument("--until", default=None)
    p.add_argument("--limit", type=int, default=80)
    p.add_argument("--modo", choices=["cdp", "direct"], default="cdp")
    return p.parse_args(argv)


def run(args):
    # --- reuse de varredura_triagem.py ---
    from varredura_triagem import load_env, Supabase  # type: ignore
    env = load_env()
    sb = Supabase(env["NEXT_PUBLIC_SUPABASE_URL"], env["SUPABASE_SERVICE_ROLE_KEY"])

    atribuicoes = [a.strip() for a in args.atribuicoes.split(",") if a.strip()]
    set_etapa(sb, args.job_id, "Conectando ao PJe…")
    ledger_index = load_ledger_index(sb)

    total = 0
    # PSEUDOCÓDIGO de orquestração — a extração concreta reusa a navegação do
    # painel de varredura_triagem.py (ver instrução de reuso). Para CADA
    # atribuição, abrir EXPEDIENTES filtrando intervalo e limite:
    for atrib in atribuicoes:
        set_etapa(sb, args.job_id, "%s: abrindo expedientes…" % atrib)
        expedientes = scrape_expedientes(  # implementar reusando varredura
            sb, env, atrib, args.since, args.until, args.limit, args.modo,
            heartbeat=lambda n: set_etapa(sb, args.job_id, "%s: %d expedientes…" % (atrib, n)),
        )
        for exp in expedientes:
            ch = compute_content_hash(exp["processoNumero"], exp.get("pjeDocumentoId"), exp.get("conteudo", ""))
            decisao = decide_layer_a(exp.get("pjeDocumentoId"), ch, ledger_index)
            sb.insert("pje_import_staging", {
                "job_id": args.job_id,
                "atribuicao": atrib,
                "processo_numero": exp.get("processoNumero"),
                "assistido_nome": exp.get("assistidoNome"),
                "ato": exp.get("ato"),
                "tipo_documento": exp.get("tipoDocumento"),
                "data_expedicao": exp.get("dataExpedicao"),
                "data_intimacao": exp.get("dataIntimacao"),
                "prazo": exp.get("prazo"),
                "conteudo": exp.get("conteudo"),
                "pje_documento_id": exp.get("pjeDocumentoId"),
                "content_hash": ch,
                "decisao": decisao,
                "selected": decisao == "nova",
            })
            # Bump lastSeenAt no ledger se já existe (hit de Layer-A)
            if decisao != "nova":
                _bump_ledger_last_seen(sb, exp.get("pjeDocumentoId"), ch, args.job_id)
            total += 1

    sb.update("claude_code_tasks", {"id": "eq.%d" % args.job_id}, {
        "status": "completed",
        "etapa": "Concluído",
        "resultado": {"raspadas": total, "atribuicoes": atribuicoes},
    })


def _bump_ledger_last_seen(sb, doc_id, content_hash, job_id):
    flt = {"pje_documento_id": "eq.%s" % doc_id} if doc_id else {"content_hash": "eq.%s" % content_hash}
    sb.update("pje_intimacoes_ledger", flt, {"last_seen_at": "now()", "job_id": job_id})


def scrape_expedientes(sb, env, atribuicao, since, until, limit, modo, heartbeat):
    """IMPLEMENTAR reusando a navegação do Painel do Defensor de
    varredura_triagem.py, mas mirando a aba EXPEDIENTES filtrada por
    atribuicao + intervalo. Deve retornar lista de dicts com chaves:
    processoNumero, assistidoNome, ato, tipoDocumento, dataExpedicao,
    dataIntimacao, prazo, conteudo, pjeDocumentoId. Chamar heartbeat(n) a
    cada ~10 itens. Fail-loud: se CDP off e login falhar, levantar exceção
    com mensagem 'Abra o PJe logado ou configure credenciais'."""
    raise NotImplementedError("reusar navegação de varredura_triagem.py (aba EXPEDIENTES)")


def main(argv=None):
    args = parse_args(argv)
    try:
        run(args)
    except Exception as e:  # fail-loud: marca task como failed
        from varredura_triagem import load_env, Supabase  # type: ignore
        env = load_env()
        sb = Supabase(env["NEXT_PUBLIC_SUPABASE_URL"], env["SUPABASE_SERVICE_ROLE_KEY"])
        sb.update("claude_code_tasks", {"id": "eq.%d" % args.job_id}, {
            "status": "failed", "erro": str(e), "etapa": "Falha na importação",
        })
        print("ERRO:", e, file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
```

> **Honest note:** `scrape_expedientes` is intentionally `NotImplementedError`. The pure helpers (hash/normalize/decide) are complete and unit-tested in this task; the live DOM extraction is implemented by reusing `varredura_triagem.py`'s painel navigation during this task and verified manually in Step 5 (no fabricated browser unit test). Confirm `Supabase` exposes `.select/.insert/.update` with the signatures used here; if the real method names differ (e.g. positional filters), adapt the calls to match varredura's client.

- [ ] **Step 4: Run pure-logic tests to verify they pass**

Run: `cd .claude/skills/pje-intimacoes-import/scripts && python3 -m unittest test_pje_intimacoes_import`
Expected: PASS (4 tests). This also proves the Python hash matches the TS hash formula (same normalization + `processo|doc|conteudo`).

- [ ] **Step 5: Implement + manually verify the scrape**

Implement `scrape_expedientes` by reusing varredura's navigation. Then, with a logged-in PJe Chromium on CDP :9222, run:

Run: `cd .claude/skills/pje-intimacoes-import/scripts && python3 pje_intimacoes_import.py --job-id 999999 --atribuicoes VVD_CAMACARI --limit 5 --modo cdp`
Expected: 5 rows appear in `pje_import_staging` with `job_id=999999`, sensible `decisao` values, and non-null `content_hash`. (Use a throwaway job-id; clean up the rows after.) If CDP is off, expect a fast `failed` with the "Abra o PJe logado…" message.

- [ ] **Step 6: Write the SKILL.md**

Create `.claude/skills/pje-intimacoes-import/SKILL.md` with: purpose (browser-lane scraper of EXPEDIENTES → staging), the CLI contract from the Interfaces block, env vars required (`NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `PJE_CPF`, `PJE_SENHA`), the "never writes to demandas" rule, and the reuse-from-varredura note.

- [ ] **Step 7: Commit**

```bash
git add .claude/skills/pje-intimacoes-import/
git commit -m "feat(intimacoes): worker browser-lane de scraping de expedientes + testes puros"
```

---

## Task 5: Register the worker in the daemon

**Files:**
- Modify: `scripts/browser-broker-daemon.mjs` (`SKILL_REGISTRY`)

**Interfaces:**
- Consumes: the CLI contract from Task 4. The daemon parses `task.instrucaoAdicional` (JSON: `{atribuicoes, since, until, limit}`) into `meta` and must pass `--job-id <task.id>` plus the CSV/flags.

- [ ] **Step 1: Add the registry entry**

> First read `scripts/browser-broker-daemon.mjs` around the `SKILL_REGISTRY` (the `varredura-triagem` entry, ~lines 98-125) and confirm: the variable name for the python interpreter (`VENV_PYTHON`), `PROJECT_DIR`, `resolve`, and whether `meta` already includes `task.id`. If `meta` does NOT include the task id, find where `build(meta)` is called and pass the id in (e.g. `entry.build({ ...meta, jobId: task.id })`), OR read `task.id` inside build if it's in scope.

Add this entry to `SKILL_REGISTRY` (mirror the varredura entry's shape exactly):

```javascript
'pje-intimacoes-import': {
  label: 'Importar intimações PJe (staging)',
  build: (meta) => ({
    interpreter: VENV_PYTHON,
    argv: [
      resolve(PROJECT_DIR, '.claude/skills/pje-intimacoes-import/scripts/pje_intimacoes_import.py'),
      '--job-id', String(meta.jobId),
      '--atribuicoes', (meta.atribuicoes || []).join(','),
      ...(meta.since ? ['--since', String(meta.since)] : []),
      ...(meta.until ? ['--until', String(meta.until)] : []),
      ...(meta.limit ? ['--limit', String(meta.limit)] : []),
      '--modo', meta.modo || 'cdp',
    ],
    timeoutMs: 30 * 60_000,
  }),
},
```

- [ ] **Step 2: Ensure `jobId` reaches `build(meta)`**

If the daemon's `build(meta)` doesn't already have the task id, modify the call site so `meta.jobId = task.id` before `entry.build(meta)`. Quote the change in the commit. (The Python worker REQUIRES `--job-id`.)

- [ ] **Step 3: Verify the daemon loads without error**

Run: `node --check scripts/browser-broker-daemon.mjs`
Expected: no syntax error. (Full daemon restart is a manual/devops step — do not restart here; just verify it parses.)

- [ ] **Step 4: End-to-end smoke (manual)**

With the daemon running and PJe logged in on CDP, trigger `intimacoes.criarImportJob({ atribuicoes: ["VVD_CAMACARI"], limit: 3 })` (via the app once Task 6/7 exist, or insert a `claude_code_tasks` row by hand with `skill='pje-intimacoes-import'`, `lane='browser'`, `instrucaoAdicional` JSON including the meta). Expected: daemon picks it up, spawns the worker, `etapa` updates, staging rows appear, task → `completed`.

- [ ] **Step 5: Commit**

```bash
git add scripts/browser-broker-daemon.mjs
git commit -m "feat(intimacoes): registra worker pje-intimacoes-import na lane browser do daemon"
```

---

## Task 6: tRPC `listStaging` + `confirmarImport`

**Files:**
- Modify: `src/lib/trpc/routers/intimacoes.ts` (add two procedures)

**Interfaces:**
- Consumes: Task 2 service (`stagingRowToImportRow`, `buildLedgerUpserts`, `enrichStagingWithLiveDedup`), `importarDemandas` (`src/lib/services/pje-import.ts`), `pjeImportStaging` + `pjeIntimacoesLedger` (schema), `demandas` (for the live-dedup fetch), `claudeCodeTasks`.
- Produces:
  - `intimacoes.listStaging({ jobId }) -> { status, etapa, rows: PjeImportStaging[] }` (rows already enriched with Layer-B).
  - `intimacoes.confirmarImport({ jobId, selectedIds, edits }) -> ImportResult & { ledgerWritten: number }`.

- [ ] **Step 1: Add `listStaging`**

Append inside `router({ ... })` in `intimacoes.ts`:

```typescript
  listStaging: protectedProcedure
    .input(z.object({ jobId: z.number().int() }))
    .query(async ({ input }) => {
      const [task] = await db
        .select({ status: claudeCodeTasks.status, etapa: claudeCodeTasks.etapa })
        .from(claudeCodeTasks)
        .where(eq(claudeCodeTasks.id, input.jobId))
        .limit(1);

      const stagingRows = await db
        .select()
        .from(pjeImportStaging)
        .where(eq(pjeImportStaging.jobId, input.jobId));

      // Layer-B: dedup fuzzy contra demandas vivas (não deletadas).
      const demandasVivas = await db
        .select()
        .from(demandas)
        .where(isNull(demandas.deletedAt));

      const rows = enrichStagingWithLiveDedup(stagingRows, demandasVivas);
      return { status: task?.status ?? "pending", etapa: task?.etapa ?? null, rows };
    }),
```

Add the needed imports at the top of the file:

```typescript
import { isNull } from "drizzle-orm";
import { pjeImportStaging, pjeIntimacoesLedger } from "@/lib/db/schema";
import { demandas } from "@/lib/db/schema";
import {
  enrichStagingWithLiveDedup,
  stagingRowToImportRow,
  buildLedgerUpserts,
} from "@/lib/services/pje-intimacoes-import";
import { importarDemandas } from "@/lib/services/pje-import";
import { sql } from "drizzle-orm";
```

- [ ] **Step 2: Add `confirmarImport`**

```typescript
  confirmarImport: protectedProcedure
    .input(z.object({
      jobId: z.number().int(),
      selectedIds: z.array(z.number().int()),
      edits: z.record(z.string(), z.record(z.string(), z.unknown())).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const stagingRows = await db
        .select()
        .from(pjeImportStaging)
        .where(eq(pjeImportStaging.jobId, input.jobId));

      const selectedSet = new Set(input.selectedIds);

      // Aplica edições da página (revisao) antes de mapear.
      const withEdits = stagingRows.map((r) => {
        const e = input.edits?.[String(r.id)];
        return e ? { ...r, revisao: { ...(r.revisao ?? {}), ...e } } : r;
      });

      const rowsToImport = withEdits.filter((r) => selectedSet.has(r.id));
      const importRows = rowsToImport.map(stagingRowToImportRow);

      const result = await importarDemandas(importRows, ctx.user.id, false);

      // Ledger: grava TODOS os itens staged (imported/skipped/duplicate).
      const upserts = buildLedgerUpserts(withEdits, selectedSet, input.jobId);
      let ledgerWritten = 0;
      for (const u of upserts) {
        const conflictTarget = u.pjeDocumentoId
          ? sql`(pje_documento_id)`
          : sql`(content_hash) WHERE pje_documento_id IS NULL`;
        await db
          .insert(pjeIntimacoesLedger)
          .values({
            pjeDocumentoId: u.pjeDocumentoId,
            contentHash: u.contentHash,
            processoNumero: u.processoNumero,
            atribuicao: u.atribuicao as never,
            decisao: u.decisao,
            jobId: u.jobId,
          })
          .onConflictDoUpdate({
            target: conflictTarget as never,
            set: { decisao: u.decisao, lastSeenAt: new Date(), jobId: u.jobId },
          });
        ledgerWritten++;
      }

      return { ...result, ledgerWritten };
    }),
```

> **Note for the implementer:** Drizzle's `onConflictDoUpdate` target must reference the actual unique index. Because the two unique indexes are *partial*, you may need `onConflictDoNothing`/raw `sql` upsert instead — verify against the generated migration's index names (`pje_ledger_documento_id_uidx`, `pje_ledger_content_hash_uidx`). If `onConflictDoUpdate` with a partial-index target is rejected by the driver, fall back to: SELECT existing by doc-id/hash → UPDATE if found else INSERT. Keep the imported `sql` import only if used.

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: no new errors. Resolve any import-path or Drizzle upsert-target issues per the note.

- [ ] **Step 4: Manual integration check**

With staging rows present (from Task 4 Step 5), call `intimacoes.confirmarImport({ jobId: 999999, selectedIds: [<one id>] })`. Expected: one demanda created in `5_TRIAGEM`; ledger has rows for every staged item with the right `decisao`; calling it again with the same selection imports 0 new (dedup holds).

- [ ] **Step 5: Commit**

```bash
git add src/lib/trpc/routers/intimacoes.ts
git commit -m "feat(intimacoes): listStaging (Layer-B) + confirmarImport (insere + grava ledger)"
```

---

## Task 7: Config modal + dropdown wiring

**Files:**
- Create: `src/components/demandas-premium/intimacoes-import-modal.tsx`
- Modify: `src/components/demandas-premium/import-dropdown.tsx`
- Modify: `src/components/demandas-premium/demandas-premium-view.tsx`

**Interfaces:**
- Consumes: `trpc.intimacoes.criarImportJob` (Task 3), Next `useRouter` for navigation.
- Produces: a modal that, on submit, calls `criarImportJob` and `router.push('/admin/demandas/importar/' + taskId)`.

- [ ] **Step 1: Create the modal**

Create `src/components/demandas-premium/intimacoes-import-modal.tsx`:

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc/client";
import { toast } from "sonner";

const ATRIBUICOES = [
  { value: "VVD_CAMACARI", label: "Violência Doméstica" },
  { value: "JURI_CAMACARI", label: "Júri" },
] as const;

export function IntimacoesImportModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [selecionadas, setSelecionadas] = useState<string[]>(["VVD_CAMACARI"]);
  const [since, setSince] = useState("");
  const [until, setUntil] = useState("");
  const [limit, setLimit] = useState(80);

  const criar = trpc.intimacoes.criarImportJob.useMutation({
    onSuccess: (res) => {
      onClose();
      router.push(`/admin/demandas/importar/${res.taskId}`);
    },
    onError: (e) => toast.error("Erro ao iniciar importação: " + e.message),
  });

  if (!isOpen) return null;

  const toggle = (v: string) =>
    setSelecionadas((s) => (s.includes(v) ? s.filter((x) => x !== v) : [...s, v]));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-md rounded-lg bg-white p-5 dark:bg-neutral-900">
        <h2 className="mb-3 text-sm font-semibold">Importar intimações do PJe</h2>

        <div className="mb-3 space-y-1">
          {ATRIBUICOES.map((a) => (
            <label key={a.value} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={selecionadas.includes(a.value)}
                onChange={() => toggle(a.value)}
              />
              {a.label}
            </label>
          ))}
          <label className="flex items-center gap-2 text-sm text-neutral-400">
            <input type="checkbox" disabled /> Execução Penal (em breve)
          </label>
        </div>

        <div className="mb-3 grid grid-cols-2 gap-2 text-sm">
          <label className="flex flex-col gap-1">De
            <input type="date" value={since} onChange={(e) => setSince(e.target.value)}
              className="rounded border px-2 py-1" />
          </label>
          <label className="flex flex-col gap-1">Até
            <input type="date" value={until} onChange={(e) => setUntil(e.target.value)}
              className="rounded border px-2 py-1" />
          </label>
          <label className="col-span-2 flex flex-col gap-1">Limite de itens
            <input type="number" min={1} max={500} value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
              className="rounded border px-2 py-1" />
          </label>
        </div>

        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-3 py-1.5 text-sm">Cancelar</button>
          <button
            disabled={selecionadas.length === 0 || criar.isPending}
            onClick={() =>
              criar.mutate({
                atribuicoes: selecionadas as ("VVD_CAMACARI" | "JURI_CAMACARI")[],
                since: since || undefined,
                until: until || undefined,
                limit,
              })
            }
            className="rounded bg-emerald-600 px-3 py-1.5 text-sm text-white disabled:opacity-50"
          >
            {criar.isPending ? "Iniciando…" : "Iniciar importação"}
          </button>
        </div>
      </div>
    </div>
  );
}
```

> **Note:** Match the project's modal style (Padrão Defender) — if there's a shared `Dialog`/`Modal` component used by `PJeImportModal`, use it instead of the raw overlay above. Confirm the toast import path (`sonner` vs `@/...`) from `demandas-premium-view.tsx`.

- [ ] **Step 2: Add the dropdown item**

In `src/components/demandas-premium/import-dropdown.tsx`, add `onImportIntimacoesPJe?: () => void;` to `ImportDropdownProps`, and add a button mirroring the existing PJe item:

```tsx
{onImportIntimacoesPJe && (
  <button
    onClick={() => { onImportIntimacoesPJe(); }}
    className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-neutral-50 dark:hover:bg-neutral-800 text-sm"
  >
    <FileText className="w-4 h-4 text-emerald-600" />
    <span>Intimações do PJe (automático)</span>
  </button>
)}
```

- [ ] **Step 3: Wire it in the view**

In `src/components/demandas-premium/demandas-premium-view.tsx`:
- Add state: `const [isIntimacoesImportOpen, setIsIntimacoesImportOpen] = useState(false);`
- Dynamic import near the `PJeImportModal` one:
  ```tsx
  const IntimacoesImportModal = dynamic(() => import("@/components/demandas-premium/intimacoes-import-modal").then(m => ({ default: m.IntimacoesImportModal })), { ssr: false });
  ```
- Pass `onImportIntimacoesPJe={() => { setIsImportDropdownOpen(false); setIsIntimacoesImportOpen(true); }}` to the `ImportDropdown` (and to the inline dropdown variant if present ~line 3138).
- Render near the other modals (~line 3921):
  ```tsx
  <IntimacoesImportModal isOpen={isIntimacoesImportOpen} onClose={() => setIsIntimacoesImportOpen(false)} />
  ```

- [ ] **Step 4: Verify build + manual UI check**

Run: `npm run build` (or `npm run dev` and open the demandas page)
Expected: builds clean. In the UI, the import dropdown shows "Intimações do PJe (automático)"; clicking opens the modal; submitting navigates to `/admin/demandas/importar/<id>` (the page is built in Task 8 — until then it 404s/empties, which is fine).

- [ ] **Step 5: Commit**

```bash
git add src/components/demandas-premium/intimacoes-import-modal.tsx src/components/demandas-premium/import-dropdown.tsx src/components/demandas-premium/demandas-premium-view.tsx
git commit -m "feat(intimacoes): modal de configuração + entrada no dropdown de importação"
```

---

## Task 8: Staging page (progress + review + confirm)

**Files:**
- Create: `src/app/(dashboard)/admin/demandas/importar/[jobId]/page.tsx`
- Create: `src/components/demandas-premium/intimacoes-staging-view.tsx`

**Interfaces:**
- Consumes: `trpc.intimacoes.listStaging`, `trpc.intimacoes.confirmarImport`, Supabase Realtime on `claude_code_tasks` (for live `etapa`).

- [ ] **Step 1: Create the route**

Create `src/app/(dashboard)/admin/demandas/importar/[jobId]/page.tsx`:

```tsx
"use client";

import { use } from "react";
import { IntimacoesStagingView } from "@/components/demandas-premium/intimacoes-staging-view";

export default function ImportarIntimacoesPage({
  params,
}: {
  params: Promise<{ jobId: string }>;
}) {
  const { jobId } = use(params);
  return <IntimacoesStagingView jobId={Number(jobId)} />;
}
```

- [ ] **Step 2: Create the staging view (progress + table + confirm)**

Create `src/components/demandas-premium/intimacoes-staging-view.tsx`:

```tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { getSupabaseClient } from "@/lib/supabase/client";
import { toast } from "sonner";

const BADGE: Record<string, string> = {
  nova: "bg-emerald-100 text-emerald-700",
  incerta: "bg-amber-100 text-amber-700",
  duplicada: "bg-neutral-200 text-neutral-600",
  ja_importada: "bg-neutral-200 text-neutral-600",
};
const BADGE_LABEL: Record<string, string> = {
  nova: "NOVA", incerta: "POSSÍVEL DUP", duplicada: "DUPLICADA", ja_importada: "JÁ IMPORTADA",
};

export function IntimacoesStagingView({ jobId }: { jobId: number }) {
  const utils = trpc.useUtils();
  const query = trpc.intimacoes.listStaging.useQuery({ jobId }, { refetchInterval: 0 });
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const seeded = useRef(false);

  // Realtime: re-fetch quando a task muda (etapa/status).
  useEffect(() => {
    const supabase = getSupabaseClient();
    const channel = supabase
      .channel(`import-job-${jobId}`)
      .on("postgres_changes",
        { event: "*", schema: "public", table: "claude_code_tasks" },
        (payload) => {
          const row = payload.new as { id?: number } | null;
          if (row?.id === jobId) utils.intimacoes.listStaging.invalidate({ jobId });
        })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [jobId, utils]);

  // Pré-marca as NOVA quando os dados chegam (uma vez).
  useEffect(() => {
    if (!seeded.current && query.data?.rows?.length) {
      seeded.current = true;
      setSelected(new Set(query.data.rows.filter((r) => r.decisao === "nova").map((r) => r.id)));
    }
  }, [query.data]);

  const confirmar = trpc.intimacoes.confirmarImport.useMutation({
    onSuccess: (res) => toast.success(`${res.imported} importadas, ${res.skipped} puladas`),
    onError: (e) => toast.error("Erro: " + e.message),
  });

  const rows = query.data?.rows ?? [];
  const status = query.data?.status ?? "pending";
  const running = status === "pending" || status === "processing";

  const resumo = useMemo(() => {
    const c = { nova: 0, incerta: 0, duplicada: 0, ja_importada: 0 } as Record<string, number>;
    for (const r of rows) c[r.decisao] = (c[r.decisao] ?? 0) + 1;
    return c;
  }, [rows]);

  const grupos = useMemo(() => {
    const m = new Map<string, typeof rows>();
    for (const r of rows) {
      const k = (r.atribuicao as string) ?? "—";
      if (!m.has(k)) m.set(k, []);
      m.get(k)!.push(r);
    }
    return [...m.entries()];
  }, [rows]);

  const toggle = (id: number) =>
    setSelected((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });

  return (
    <div className="p-6">
      <h1 className="text-lg font-semibold">Importação de intimações</h1>

      {running && (
        <div className="mt-2 text-sm text-neutral-500">
          {query.data?.etapa ?? "Processando…"} <span className="animate-pulse">●</span>
        </div>
      )}

      <div className="mt-3 flex gap-4 text-sm">
        <span>Raspadas: {rows.length}</span>
        <span className="text-emerald-700">Novas: {resumo.nova}</span>
        <span className="text-amber-700">Possíveis dup: {resumo.incerta}</span>
        <span className="text-neutral-500">Duplicadas: {resumo.duplicada + resumo.ja_importada}</span>
      </div>

      {grupos.map(([atrib, lista]) => (
        <section key={atrib} className="mt-5">
          <h2 className="mb-2 text-sm font-medium">{atrib}</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-neutral-400">
                <th className="w-8"></th><th>Processo</th><th>Assistido</th><th>Ato</th><th>Status</th>
              </tr>
            </thead>
            <tbody>
              {lista.map((r) => (
                <tr key={r.id} className="border-t">
                  <td>
                    <input type="checkbox" checked={selected.has(r.id)}
                      disabled={r.decisao === "ja_importada" || r.decisao === "duplicada"}
                      onChange={() => toggle(r.id)} />
                  </td>
                  <td className="font-mono text-xs">{r.processoNumero}</td>
                  <td>{r.assistidoNome}</td>
                  <td className="max-w-md truncate">{r.ato}</td>
                  <td>
                    <span className={`rounded px-1.5 py-0.5 text-xs ${BADGE[r.decisao]}`}>
                      {BADGE_LABEL[r.decisao]}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ))}

      <div className="mt-6">
        <button
          disabled={selected.size === 0 || confirmar.isPending || running}
          onClick={() => confirmar.mutate({ jobId, selectedIds: [...selected] })}
          className="rounded bg-emerald-600 px-4 py-2 text-sm text-white disabled:opacity-50"
        >
          {confirmar.isPending ? "Importando…" : `Confirmar importação (${selected.size})`}
        </button>
      </div>
    </div>
  );
}
```

> **Notes for the implementer:** (1) Confirm the Supabase browser-client helper name/path — the realtime explorer found `getSupabaseClient()` used in `src/hooks/use-realtime-demanda-eventos.ts`; reuse that exact import. (2) The table above is intentionally minimal — once it works, swap in the richer inline-edit `pje-review-table.tsx` component (`src/components/demandas-premium/pje-review-table.tsx`) if you want field editing, threading edits into `confirmarImport`'s `edits` param keyed by staging row id. (3) Style per Padrão Defender.

- [ ] **Step 3: Build + manual end-to-end verification**

Run: `npm run build`
Expected: clean build. Then full flow with the daemon running and PJe logged in: demandas page → "Intimações do PJe (automático)" → pick VVD, limit 5 → "Iniciar" → lands on staging page → progress shows `etapa` live → on completion the table lists 5 expedientes with badges, NOVA pre-checked → "Confirmar importação" → toast `N importadas` → new demandas appear in triagem → re-running the same scrape now shows them as JÁ IMPORTADA (ledger works).

- [ ] **Step 4: Commit**

```bash
git add src/app/(dashboard)/admin/demandas/importar src/components/demandas-premium/intimacoes-staging-view.tsx
git commit -m "feat(intimacoes): página de staging com progresso, revisão e confirmação"
```

---

## Self-Review (completed against the spec)

**Spec coverage:**
- §3 architecture (Python stages / TS commits) → Tasks 1,2,4,6. ✓
- §4 two tables → Task 1. ✓
- §5 Layer-A (Python) → Task 4 `decide_layer_a`; Layer-B (TS) → Task 2 `enrichStagingWithLiveDedup` + Task 6 `listStaging`. ✓
- §6 hybrid CDP/login, fail-loud, heartbeat, bounded by interval+limit → Task 4 (`--modo`, `set_etapa`, `--since/--until/--limit`). ✓
- §7 staging page (progress, summary, grouped table, badges, NOVA pre-checked, confirm) → Task 8. ✓
- §7 confirm writes ledger for ALL staged items incl. unchecked-NOVA → `skipped` → Task 2 `buildLedgerUpserts` + test; Task 6 loop. ✓
- §8 job-level dedup (no concurrent import) → Task 3 `criarImportJob`. ✓
- §8 safe re-run (upsert by doc/hash) → Task 1 partial unique indexes + Task 6 upsert. ✓
- Global: zero paid API (browser lane), never write demandas from worker, VVD+Júri only, 5_TRIAGEM default → enforced across Tasks 3,4,6,7. ✓

**Open item carried from spec review (§10):** Before Task 4, the implementer must check `2026-04-06-pje-scan-intimacoes-design.md` / any existing `scan_worker.py` to decide reuse vs. supersede, to avoid two scraping paths. Captured as the reuse instruction in Task 4 Step 3.

**Type consistency:** `decisao` staging values (`nova|duplicada|ja_importada|incerta`) and ledger values (`imported|skipped|duplicate`) are used consistently in schema (Task 1), service + tests (Task 2), worker (Task 4), and view (Task 8). `contentHash` formula is identical in TS (`computeContentHash`) and Python (`compute_content_hash`), asserted by both test suites.

**Placeholder scan:** the only deliberate `NotImplementedError` is `scrape_expedientes` (live DOM, reused from varredura + manually verified) — flagged honestly, not a hidden gap.
