# Sentença Intelligence Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Auto-capture and AI-analyze 1st-degree criminal sentenças triggered by the varredura's classification, persisting structured intelligence keyed by magistrado/unidade judicial into shared tables.

**Architecture:** Two-stage queued pipeline (browser-lane capture → ai-lane analysis via the free claude-max daemon) hanging off the existing `varredura-triagem` skill. New shared Drizzle tables `magistrados` + `sentencas` mirror the existing `acordaos`/`desembargadores` model. Correctness-critical logic is isolated into pure, unit-tested functions; I/O stages (PJe browser capture, daemon analysis, varredura write-back) carry concrete code + manual verification because the repo has no DB/browser test harness.

**Tech Stack:** TypeScript, Drizzle ORM (PostgreSQL/Supabase), tRPC, vitest (pure-function unit tests, `vitest run`), Python (Playwright capture skill, `claude -p` analysis skill).

**Spec:** `docs/superpowers/specs/2026-06-29-sentenca-intelligence-design.md`

---

## File Structure

| File | Responsibility | New/Modify |
|---|---|---|
| `src/lib/db/schema/sentencas.ts` | `magistrados`, `sentencas` tables + `AnaliseSentenca`/`Pena`/`CircunstanciaJudicial` types + relations | NEW |
| `src/lib/db/schema/index.ts` | export the new schema | MODIFY |
| `src/lib/sentenca/ato-set.ts` | `isSentencaAto(ato)` — pure derivation of the trigger set | NEW |
| `src/lib/sentenca/magistrado-key.ts` | `buildMagistradoKey(nome, comarcaId)` — pure match key (reuses `normalizeNameForMatch`) | NEW |
| `src/lib/sentenca/parse-analise.ts` | `parseAnaliseSentenca(raw)` — robust JSON extraction | NEW |
| `src/lib/sentenca/dedupe.ts` | `resolveSentencaDedupe(input)` — pure idempotency-key selection | NEW |
| `src/lib/trpc/defensor-scope.ts` | `getSentencaDetailScope(user)` — detail visibility via `demandaOrigemId → demandas.defensorId` | MODIFY |
| `src/lib/trpc/routers/sentencas.ts` | tRPC: `upsertFromAnalysis`, `getDetail` (scoped), `aggregate` (de-identified projection) | NEW |
| `src/lib/trpc/routers/index.ts` | register `sentencas` router | MODIFY |
| `src/config/system-user.ts` | `SYSTEM_USER_ID` constant — creator for auto-enqueued daemon tasks | NEW |
| `.claude/skills/analise-sentenca/SKILL.md` | ai-lane skill: full sentença text → `AnaliseSentenca` JSON | NEW |
| `.claude/skills/analise-sentenca/scripts/capturar_sentenca.py` | browser-lane: open process → download PDF → Drive → `drive_files` row → extract text | NEW |
| `.claude/skills/varredura-triagem/scripts/varredura_triagem.py` | enqueue capture task when `isSentencaAto` | MODIFY |
| `src/lib/sentenca/__tests__/*.test.ts` | vitest unit tests for the four pure modules + scope helper | NEW |

**Test commands:** unit `npm test` (vitest); types `npm run typecheck`; migration `npm run db:generate` then `npm run db:push`.

---

## Task 1: Schema — `magistrados`, `sentencas`, `AnaliseSentenca`

**Files:**
- Create: `src/lib/db/schema/sentencas.ts`
- Modify: `src/lib/db/schema/index.ts` (add `export * from "./sentencas";`)

- [ ] **Step 1: Write the schema file**

Create `src/lib/db/schema/sentencas.ts` mirroring `instancia-superior.ts` conventions:

```ts
import {
  pgTable, serial, text, varchar, integer, jsonb, date, timestamp, index, uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { assistidos, processos, demandas } from "./core";
import { comarcas } from "./comarcas";
import { defensoresBa } from "./defensoria";

// ── MAGISTRADOS (1º grau, shared registry) ──
export const magistrados = pgTable("magistrados", {
  id: serial("id").primaryKey(),
  nome: text("nome").notNull(),
  nomeNormalizado: text("nome_normalizado").notNull(), // uppercase/sem acento — match key
  comarcaId: integer("comarca_id").references(() => comarcas.id),
  varasConhecidas: jsonb("varas_conhecidas").$type<string[]>().default([]),
  entrancia: varchar("entrancia", { length: 30 }),
  status: varchar("status", { length: 20 }).default("ATIVO").notNull(), // ATIVO/APOSENTADO/AFASTADO/NAO_CONFIRMADO
  observacoes: text("observacoes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => [
  index("magistrados_nome_norm_comarca_idx").on(t.nomeNormalizado, t.comarcaId),
  index("magistrados_status_idx").on(t.status),
]);
export type Magistrado = typeof magistrados.$inferSelect;
export type InsertMagistrado = typeof magistrados.$inferInsert;

// ── ANÁLISE SENTENÇA (jsonb payload) ──
export type Pena = {
  privativa: { anos: number; meses: number; dias: number } | null;
  regimeInicial: "FECHADO" | "SEMIABERTO" | "ABERTO" | null;
  substituicaoPRD: { concedida: boolean; quais: string[] };
  sursis: boolean;
  diasMulta: number | null;
  valorMulta: string | null;
  detracaoConsiderada: boolean;
};
export type CircunstanciaJudicial = {
  circunstancia: string;
  valoracao: "FAVORAVEL" | "DESFAVORAVEL" | "NEUTRA";
  fundamento: string;
};
export type AnaliseSentenca = {
  resultado: string;
  dispositivoResumo: string;
  crimesImputados: { artigo: string; descricao: string }[];
  crimesCondenados: { artigo: string; descricao: string }[];
  crimesAbsolvidos: { artigo: string; descricao: string }[];
  pena: Pena | null;
  dosimetria: {
    penaBase: string | null;
    circunstanciasJudiciais: CircunstanciaJudicial[];
    atenuantes: string[];
    agravantes: string[];
    causasAumento: string[];
    causasDiminuicao: string[];
    penaDefinitiva: string | null;
  } | null;
  tesesDefensivas: { acolhidas: string[]; rejeitadas: string[] };
  provasValoradas: string[];
  fundamentosChave: string[];
  precedentesCitados: string[];
  juizProlator: string;
  recurso: { prazoRecursal: string | null; recursoCabivel: string | null; fundamentoRecurso: string | null };
  flagsAlerta: string[];
  impactoParaDefesa: string;
  recomendacaoProxPasso: string;
  confidence: "alta" | "media" | "baixa";
};

// ── SENTENÇAS (shared row, detail-scoped in queries) ──
export const sentencas = pgTable("sentencas", {
  id: serial("id").primaryKey(),
  processoId: integer("processo_id").references(() => processos.id, { onDelete: "set null" }),
  assistidoId: integer("assistido_id").references(() => assistidos.id, { onDelete: "set null" }),
  demandaOrigemId: integer("demanda_origem_id").references(() => demandas.id, { onDelete: "set null" }),
  magistradoId: integer("magistrado_id").references(() => magistrados.id, { onDelete: "set null" }),
  comarcaId: integer("comarca_id").references(() => comarcas.id),
  vara: varchar("vara", { length: 120 }),
  numeroProcesso: varchar("numero_processo", { length: 30 }),
  pjeDocumentoId: varchar("pje_documento_id", { length: 30 }),
  sigiloso: integer("sigiloso").default(0).notNull(), // 0/1 — VVD/sigilo: excluded from institutional detail reads
  tipoDecisao: varchar("tipo_decisao", { length: 30 }), // CONDENATORIA/ABSOLUTORIA/PARCIAL/ABSOLVICAO_SUMARIA/EXTINTIVA_PUNIBILIDADE/PRONUNCIA/IMPRONUNCIA/DESCLASSIFICACAO
  dataSentenca: date("data_sentenca"),
  driveFileId: integer("drive_file_id"), // FK → drive_files.id (insert that row first)
  analiseIa: jsonb("analise_ia").$type<AnaliseSentenca | null>().default(null),
  analiseStatus: varchar("analise_status", { length: 20 }).default("PENDENTE").notNull(),
  analyzedAt: timestamp("analyzed_at"),
  criadoPorId: integer("criado_por_id").references(() => defensoresBa.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => [
  uniqueIndex("sentencas_processo_doc_unique").on(t.processoId, t.pjeDocumentoId), // partial — see migration step
  index("sentencas_magistrado_idx").on(t.magistradoId),
  index("sentencas_comarca_idx").on(t.comarcaId),
  index("sentencas_tipo_decisao_idx").on(t.tipoDecisao),
  index("sentencas_demanda_origem_idx").on(t.demandaOrigemId),
  index("sentencas_analise_status_idx").on(t.analiseStatus),
]);
export type Sentenca = typeof sentencas.$inferSelect;
export type InsertSentenca = typeof sentencas.$inferInsert;

export const magistradosRelations = relations(magistrados, ({ many }) => ({
  sentencas: many(sentencas),
}));
export const sentencasRelations = relations(sentencas, ({ one }) => ({
  magistrado: one(magistrados, { fields: [sentencas.magistradoId], references: [magistrados.id] }),
  processo: one(processos, { fields: [sentencas.processoId], references: [processos.id] }),
  assistido: one(assistidos, { fields: [sentencas.assistidoId], references: [assistidos.id] }),
}));
```

> Note: verify the exact import path for `defensoresBa` (it is `./defensoria` in `instancia-superior.ts`). If `demandas` is not exported from `./core`, import it from wherever `core.ts` defines it (it is in `core.ts`).

- [ ] **Step 2: Export from the barrel**

Add to `src/lib/db/schema/index.ts` after the `instancia-superior` export (line ~56):

```ts
export * from "./sentencas";
```

- [ ] **Step 3: Verify types compile**

Run: `npm run typecheck`
Expected: no errors referencing `sentencas.ts`.

- [ ] **Step 4: Commit**

```bash
git add src/lib/db/schema/sentencas.ts src/lib/db/schema/index.ts
git commit -m "feat(sentencas): add magistrados + sentencas schema and AnaliseSentenca type"
```

---

## Task 2: Migration (with partial unique index)

**Files:**
- Generated: `drizzle/XXXX_*.sql`

- [ ] **Step 1: Generate the migration**

Run: `npm run db:generate`
Expected: a new `drizzle/NNNN_*.sql` creating `magistrados` and `sentencas`.

- [ ] **Step 2: Make the idempotency index PARTIAL**

drizzle-kit emits a plain `UNIQUE` on `(processo_id, pje_documento_id)`. Edit the generated SQL so it only applies when the doc id is present (nulls must not collide):

```sql
-- replace the generated unique index line with:
CREATE UNIQUE INDEX "sentencas_processo_doc_unique"
  ON "sentencas" ("processo_id","pje_documento_id")
  WHERE "pje_documento_id" IS NOT NULL;
```

- [ ] **Step 3: Apply**

Run: `npm run db:push`
Expected: tables created; no errors. (If push diverges from the hand-edited SQL, prefer running the migration file directly or re-edit until `db:push` is idempotent.)

- [ ] **Step 4: Commit**

```bash
git add drizzle/
git commit -m "feat(sentencas): migration for magistrados + sentencas (partial unique on processo+doc)"
```

---

## Task 3: `isSentencaAto` (pure trigger derivation)  — TDD

**Files:**
- Create: `src/lib/sentenca/ato-set.ts`
- Test: `src/lib/sentenca/__tests__/ato-set.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from "vitest";
import { isSentencaAto } from "../ato-set";

describe("isSentencaAto", () => {
  it("matches sentença/condenação/absolvição/pronúncia variants (accent + case insensitive)", () => {
    for (const a of [
      "Analisar sentença", "Ciência de sentença", "Ciência condenação",
      "Ciência da absolvição", "Ciência da pronúncia", "Ciência impronúncia",
      "Ciência desclassificação", "CIENCIA DE SENTENCA",
    ]) expect(isSentencaAto(a)).toBe(true);
  });
  it("excludes acórdão / 2º-grau atos", () => {
    for (const a of ["Analisar acórdão", "Ciência acórdão", "Ciência de acordao"])
      expect(isSentencaAto(a)).toBe(false);
  });
  it("excludes unrelated atos", () => {
    for (const a of ["Resposta à Acusação", "Ciência de despacho", "Ciência de certidão", ""])
      expect(isSentencaAto(a)).toBe(false);
  });
});
```

- [ ] **Step 2: Run it, verify it fails**

Run: `npm test -- ato-set`
Expected: FAIL — `isSentencaAto` not found.

- [ ] **Step 3: Implement**

```ts
// src/lib/sentenca/ato-set.ts
/** Pure trigger-set test for the sentença capture pipeline.
 *  Derives membership by normalized regex so it tolerates per-atribuição
 *  ato variants in src/config/atos-por-atribuicao.ts without a brittle literal list.
 *  Acórdão (2º grau) is explicitly excluded. */
const SENTENCA_RE = /senten|condena|absolvi|pron[uú]ncia|impron|desclassifica/;
const ACORDAO_RE = /ac[oó]rd[aã]o/;

function norm(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

export function isSentencaAto(ato: string | null | undefined): boolean {
  if (!ato) return false;
  const n = norm(ato);
  if (ACORDAO_RE.test(n)) return false;
  return SENTENCA_RE.test(n);
}
```

- [ ] **Step 4: Run, verify pass**

Run: `npm test -- ato-set`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/sentenca/ato-set.ts src/lib/sentenca/__tests__/ato-set.test.ts
git commit -m "feat(sentencas): isSentencaAto trigger derivation (pure, tested)"
```

---

## Task 4: `buildMagistradoKey` (pure match key) — TDD

**Files:**
- Create: `src/lib/sentenca/magistrado-key.ts`
- Test: `src/lib/sentenca/__tests__/magistrado-key.test.ts`

Reuse `normalizeNameForMatch` from `src/lib/utils/name-matching.ts`.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from "vitest";
import { buildMagistradoKey } from "../magistrado-key";

describe("buildMagistradoKey", () => {
  it("normalizes name and pairs with comarca", () => {
    expect(buildMagistradoKey("Dr. João Antônio de Sá", 1))
      .toEqual({ nomeNormalizado: "JOAO ANTONIO DE SA", comarcaId: 1 });
  });
  it("strips judicial honorifics/titles", () => {
    expect(buildMagistradoKey("MM. Juiz de Direito Maria Silva", 2).nomeNormalizado)
      .toBe("MARIA SILVA");
  });
  it("returns null comarca when unknown", () => {
    expect(buildMagistradoKey("Ana Costa", null).comarcaId).toBeNull();
  });
});
```

- [ ] **Step 2: Run, verify fail** — `npm test -- magistrado-key`

- [ ] **Step 3: Implement**

```ts
// src/lib/sentenca/magistrado-key.ts
import { normalizeNameForMatch } from "@/lib/utils/name-matching";

const TITLE_RE =
  /^(dr\.?|dra\.?|exmo\.?|exma\.?|mm\.?|meritíssim[oa]|juiz(?:a)?(?: de direito)?|magistrad[oa])\s+/i;

function stripTitles(name: string): string {
  let n = name.trim();
  let prev: string;
  do { prev = n; n = n.replace(TITLE_RE, "").trim(); } while (n !== prev);
  return n;
}

export function buildMagistradoKey(nome: string, comarcaId: number | null) {
  const cleaned = stripTitles(nome);
  // normalizeNameForMatch lowercases + strips accents; uppercase for the stored key.
  const nomeNormalizado = normalizeNameForMatch(cleaned).toUpperCase();
  return { nomeNormalizado, comarcaId: comarcaId ?? null };
}
```

> Verify `normalizeNameForMatch` output: read `src/lib/utils/name-matching.ts:5`. If it already uppercases or keeps punctuation, adjust the `.toUpperCase()` and the expected test strings to match its actual behavior before locking the test.

- [ ] **Step 4: Run, verify pass** — `npm test -- magistrado-key`

- [ ] **Step 5: Commit**

```bash
git add src/lib/sentenca/magistrado-key.ts src/lib/sentenca/__tests__/magistrado-key.test.ts
git commit -m "feat(sentencas): buildMagistradoKey pure match key"
```

---

## Task 5: `parseAnaliseSentenca` (robust JSON extraction) — TDD

**Files:**
- Create: `src/lib/sentenca/parse-analise.ts`
- Test: `src/lib/sentenca/__tests__/parse-analise.test.ts`

Mirrors `analysis_service.py::_parse_analysis_response` (direct → fenced → brace-slice).

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from "vitest";
import { parseAnaliseSentenca } from "../parse-analise";

const minimal = {
  resultado: "Condenação", dispositivoResumo: "...", crimesImputados: [],
  crimesCondenados: [], crimesAbsolvidos: [], pena: null, dosimetria: null,
  tesesDefensivas: { acolhidas: [], rejeitadas: [] }, provasValoradas: [],
  fundamentosChave: [], precedentesCitados: [], juizProlator: "Fulano",
  recurso: { prazoRecursal: null, recursoCabivel: null, fundamentoRecurso: null },
  flagsAlerta: [], impactoParaDefesa: "", recomendacaoProxPasso: "", confidence: "alta",
};

describe("parseAnaliseSentenca", () => {
  it("parses direct JSON", () => {
    expect(parseAnaliseSentenca(JSON.stringify(minimal))?.resultado).toBe("Condenação");
  });
  it("parses fenced ```json blocks", () => {
    expect(parseAnaliseSentenca("prose\n```json\n" + JSON.stringify(minimal) + "\n```\n")?.juizProlator).toBe("Fulano");
  });
  it("parses brace-sliced output with leading/trailing prose", () => {
    expect(parseAnaliseSentenca("Here:\n" + JSON.stringify(minimal) + "\nDone.")?.confidence).toBe("alta");
  });
  it("returns null on garbage", () => {
    expect(parseAnaliseSentenca("no json here")).toBeNull();
  });
  it("returns null when required keys are missing", () => {
    expect(parseAnaliseSentenca(JSON.stringify({ foo: 1 }))).toBeNull();
  });
});
```

- [ ] **Step 2: Run, verify fail** — `npm test -- parse-analise`

- [ ] **Step 3: Implement**

```ts
// src/lib/sentenca/parse-analise.ts
import type { AnaliseSentenca } from "@/lib/db/schema/sentencas";

const REQUIRED_KEYS = ["resultado", "tesesDefensivas", "juizProlator", "confidence"] as const;

function tryParse(s: string): unknown {
  try { return JSON.parse(s); } catch { return undefined; }
}

function isAnalise(o: unknown): o is AnaliseSentenca {
  if (!o || typeof o !== "object") return false;
  return REQUIRED_KEYS.every((k) => k in (o as Record<string, unknown>));
}

export function parseAnaliseSentenca(raw: string): AnaliseSentenca | null {
  if (!raw) return null;
  // 1) direct
  let parsed = tryParse(raw.trim());
  if (isAnalise(parsed)) return parsed;
  // 2) fenced ```json ... ```
  const fence = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) { parsed = tryParse(fence[1].trim()); if (isAnalise(parsed)) return parsed; }
  // 3) first-brace / last-brace slice
  const a = raw.indexOf("{"), b = raw.lastIndexOf("}");
  if (a !== -1 && b > a) { parsed = tryParse(raw.slice(a, b + 1)); if (isAnalise(parsed)) return parsed; }
  return null;
}
```

- [ ] **Step 4: Run, verify pass** — `npm test -- parse-analise`

- [ ] **Step 5: Commit**

```bash
git add src/lib/sentenca/parse-analise.ts src/lib/sentenca/__tests__/parse-analise.test.ts
git commit -m "feat(sentencas): robust parseAnaliseSentenca JSON extraction"
```

---

## Task 6: `resolveSentencaDedupe` (pure idempotency key) — TDD

**Files:**
- Create: `src/lib/sentenca/dedupe.ts`
- Test: `src/lib/sentenca/__tests__/dedupe.test.ts`

Decides which lookup key the upsert uses, per spec §5.2.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from "vitest";
import { resolveSentencaDedupe } from "../dedupe";

describe("resolveSentencaDedupe", () => {
  it("prefers (processoId, pjeDocumentoId) when doc id present", () => {
    expect(resolveSentencaDedupe({ processoId: 7, pjeDocumentoId: "99", tipoDecisao: "CONDENATORIA", dataSentenca: "2026-06-01", demandaOrigemId: 3 }))
      .toEqual({ by: "doc", processoId: 7, pjeDocumentoId: "99" });
  });
  it("falls back to (processoId, tipoDecisao, dataSentenca) when no doc id", () => {
    expect(resolveSentencaDedupe({ processoId: 7, pjeDocumentoId: null, tipoDecisao: "CONDENATORIA", dataSentenca: "2026-06-01", demandaOrigemId: 3 }))
      .toEqual({ by: "tipo_data", processoId: 7, tipoDecisao: "CONDENATORIA", dataSentenca: "2026-06-01" });
  });
  it("falls back to demandaOrigemId when doc id and dataSentenca both null", () => {
    expect(resolveSentencaDedupe({ processoId: 7, pjeDocumentoId: null, tipoDecisao: "CONDENATORIA", dataSentenca: null, demandaOrigemId: 3 }))
      .toEqual({ by: "demanda", demandaOrigemId: 3 });
  });
});
```

- [ ] **Step 2: Run, verify fail** — `npm test -- dedupe`

- [ ] **Step 3: Implement**

```ts
// src/lib/sentenca/dedupe.ts
export type DedupeInput = {
  processoId: number | null;
  pjeDocumentoId: string | null;
  tipoDecisao: string | null;
  dataSentenca: string | null;
  demandaOrigemId: number | null;
};
export type DedupeKey =
  | { by: "doc"; processoId: number; pjeDocumentoId: string }
  | { by: "tipo_data"; processoId: number; tipoDecisao: string; dataSentenca: string }
  | { by: "demanda"; demandaOrigemId: number };

export function resolveSentencaDedupe(i: DedupeInput): DedupeKey {
  if (i.processoId != null && i.pjeDocumentoId)
    return { by: "doc", processoId: i.processoId, pjeDocumentoId: i.pjeDocumentoId };
  if (i.processoId != null && i.tipoDecisao && i.dataSentenca)
    return { by: "tipo_data", processoId: i.processoId, tipoDecisao: i.tipoDecisao, dataSentenca: i.dataSentenca };
  if (i.demandaOrigemId != null) return { by: "demanda", demandaOrigemId: i.demandaOrigemId };
  throw new Error("resolveSentencaDedupe: insufficient keys to dedupe");
}
```

- [ ] **Step 4: Run, verify pass** — `npm test -- dedupe`

- [ ] **Step 5: Commit**

```bash
git add src/lib/sentenca/dedupe.ts src/lib/sentenca/__tests__/dedupe.test.ts
git commit -m "feat(sentencas): resolveSentencaDedupe idempotency key selection"
```

---

## Task 7: `getSentencaDetailScope` (detail visibility) — TDD

**Files:**
- Modify: `src/lib/trpc/defensor-scope.ts`
- Test: `src/lib/sentenca/__tests__/detail-scope.test.ts`

Returns the set of `demandas.defensorId` values whose sentença detail the user may see (or `"all"`), reusing `getDefensoresVisiveis`.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from "vitest";
import { getSentencaDetailScope } from "@/lib/trpc/defensor-scope";

const u = (over: Record<string, unknown>) => ({ id: 1, role: "defensor", ...over } as any);

describe("getSentencaDetailScope", () => {
  it("admin sees all", () => {
    expect(getSentencaDetailScope(u({ role: "admin" }))).toBe("all");
  });
  it("defensor sees only own (by demanda defensorId)", () => {
    expect(getSentencaDetailScope(u({ id: 2, role: "defensor" }))).toEqual([2]);
  });
  it("estagiário sees supervisor's", () => {
    expect(getSentencaDetailScope(u({ id: 9, role: "estagiario", supervisorId: 2 }))).toEqual([2]);
  });
});
```

- [ ] **Step 2: Run, verify fail** — `npm test -- detail-scope`

- [ ] **Step 3: Implement** — append to `src/lib/trpc/defensor-scope.ts`

```ts
/** Detail-visibility scope for the shared `sentencas` table.
 *  A sentença's detail is visible if its origin demanda's defensorId is visible to the user.
 *  Returns "all" (admin/unrestricted servidor) or the list of visible defensorIds.
 *  Callers must JOIN sentencas.demandaOrigemId → demandas.defensorId and filter by this. */
export function getSentencaDetailScope(user: User): number[] | "all" {
  return getDefensoresVisiveis(user);
}
```

- [ ] **Step 4: Run, verify pass** — `npm test -- detail-scope`

- [ ] **Step 5: Commit**

```bash
git add src/lib/trpc/defensor-scope.ts src/lib/sentenca/__tests__/detail-scope.test.ts
git commit -m "feat(sentencas): getSentencaDetailScope detail visibility helper"
```

---

## Task 8: Persistence router `sentencas.ts`

**Files:**
- Create: `src/lib/trpc/routers/sentencas.ts`
- Modify: `src/lib/trpc/routers/index.ts` (import + register `sentencas: sentencasRouter`)

No unit test (DB I/O; repo has no DB test harness) — verified via typecheck + manual query. Compose the pure helpers from Tasks 4–7.

- [ ] **Step 1: Implement the router**

Procedures:
- `upsertFromAnalysis` (protectedProcedure): input = the capture+analysis result (processoId, assistidoId, demandaOrigemId, comarcaId, vara, numeroProcesso, pjeDocumentoId, sigiloso, tipoDecisao, dataSentenca, driveFileId, juizProlator, analiseIa). Logic:
  1. `buildMagistradoKey(juizProlator, comarcaId)` → SELECT magistrado by `(nomeNormalizado, comarcaId)`; if absent INSERT with `status: "NAO_CONFIRMADO"`, else push `vara` into `varasConhecidas` if new.
  2. `resolveSentencaDedupe(...)` → SELECT existing sentença by the chosen key.
  3. INSERT or UPDATE the sentença row with `magistradoId`, `analiseIa`, `analiseStatus: "CONCLUIDO"`, `analyzedAt: now()`. On low `confidence`, the caller (varredura) also sets `demandas.revisaoPendente=true`.
- `getDetail` (protectedProcedure): input `{ id }`. Build `getSentencaDetailScope(ctx.user)`; SELECT the sentença JOIN demandas; if scope ≠ "all", require `demandas.defensorId ∈ scope` AND `sentencas.sigiloso = 0 OR demanda visible`. Return 404-equivalent if out of scope.
- `aggregate` (protectedProcedure): input `{ magistradoId? , comarcaId? }`. SELECT only non-identifying columns (`magistradoId, vara, comarcaId, tipoDecisao, analiseIa->pena, analiseIa->tesesDefensivas, analiseIa->flagsAlerta`) across **all** rows — never assistido/processo identifiers. This is the forward-contract for the deferred dashboards.

Follow the structure of `src/lib/trpc/routers/instancia-superior.ts` (imports, `router({...})`, `protectedProcedure`, drizzle `eq/and/sql`). Use `ctx.user.id` for `criadoPorId` when present.

- [ ] **Step 2: Register the router**

In `src/lib/trpc/routers/index.ts`: `import { sentencasRouter } from "./sentencas";` and add `sentencas: sentencasRouter,` to the `appRouter` object (near `instanciaSuperior`).

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: clean.

- [ ] **Step 4: Manual verification**

Start dev (`npm run dev`), then via tRPC client or a `node -e` script: call `upsertFromAnalysis` twice with the same `(processoId, pjeDocumentoId)` and confirm exactly **one** `sentencas` row exists and one `magistrados` row. Confirm `getDetail` as a non-owning defensor returns nothing.

- [ ] **Step 5: Commit**

```bash
git add src/lib/trpc/routers/sentencas.ts src/lib/trpc/routers/index.ts
git commit -m "feat(sentencas): persistence router (upsertFromAnalysis, scoped getDetail, aggregate)"
```

---

## Task 9: System-user constant

**Files:**
- Create: `src/config/system-user.ts`

- [ ] **Step 1: Implement**

```ts
// Creator id for tasks enqueued by daemons/automation (no ctx.user).
// claude_code_tasks.createdBy is notNull FK → users.id.
// Set to the seeded system/service user's id; override via env if present.
export const SYSTEM_USER_ID = Number(process.env.OMBUDS_SYSTEM_USER_ID ?? 1);
```

> Confirm a real seeded user exists for this id (e.g. the admin user). If not, create/seed one before relying on auto-enqueue. Document the chosen id here.

- [ ] **Step 2: Typecheck + commit**

```bash
git add src/config/system-user.ts
git commit -m "feat(sentencas): SYSTEM_USER_ID for auto-enqueued daemon tasks"
```

---

## Task 10: `analise-sentenca` skill (ai-lane, claude -p)

**Files:**
- Create: `.claude/skills/analise-sentenca/SKILL.md`

No automated test (LLM skill). Verified by running on a sample sentença.

- [ ] **Step 1: Write SKILL.md**

Frontmatter (name `analise-sentenca`, description) + body containing:
- Role: extract structured intelligence from a 1st-degree criminal sentença.
- Input contract: full sentença text (or registro `raw_text` fallback). Token guard: if the text is very large, section-summarize (relatório / fundamentação / dispositivo / dosimetria) then do a final structured pass.
- Output contract: **emit ONLY** a JSON object matching the `AnaliseSentenca` shape from `src/lib/db/schema/sentencas.ts` (paste the field list and enums verbatim, including `tipoDecisao` mapping, `flagsAlerta` guidance — Súmulas 444, 718/719, dosimetria genérica, condenação baseada só em prova policial — and `confidence`).
- Persistence note: the daemon writes `resultado` JSON to `claude_code_tasks.resultado`; a follow-up step calls `sentencas.upsertFromAnalysis`.

Model the prose/structure on the existing `.claude/skills-cowork/analise-intimacao/SKILL.md` so the daemon handles it consistently.

- [ ] **Step 2: Manual verification**

Run `claude -p` with this skill against a sample sentença PDF's extracted text; confirm the output passes `parseAnaliseSentenca` (paste into a quick node REPL using Task 5's function) and the fields are sensibly populated.

- [ ] **Step 3: Commit**

```bash
git add .claude/skills/analise-sentenca/SKILL.md
git commit -m "feat(sentencas): analise-sentenca ai-lane skill (full text → AnaliseSentenca JSON)"
```

---

## Task 11: `capturar_sentenca.py` (browser-lane capture)

**Files:**
- Create: `.claude/skills/analise-sentenca/scripts/capturar_sentenca.py`

Reuses `enrichment-engine/services/pje_playwright_service.py`. No automated test (browser I/O).

- [ ] **Step 1: Implement the capture script**

Inputs (argv/env): `numeroProcesso`, `pjeDocumentoId`, `assistidoId`, `atribuicao`. Steps, in order:
1. **Open the process in PJe first** (Painel → search `numeroProcesso` → open → document list) — because `download_document(id)` only matches `a:has-text('{id}')` on the **current** page (`pje_playwright_service.py:142`). Reuse the existing navigation in `pje_playwright_service.download_and_upload_processo` as the template.
2. `download_document(pjeDocumentoId, "Sentença")` → PDF bytes.
3. Resolve Drive folder: `ensureAssistidoDriveFolder(assistidoId)` then `criarOuEncontrarPasta("03 - Decisões e Sentenças", folderId)`; upload via `uploadFileBuffer`.
4. **Insert a `drive_files` row** (so we have an integer id) → capture `drive_files.id`.
5. Extract full text via `ocr_service.extract_text_with_ocr` / `docling_service`.
6. Emit JSON to stdout: `{ driveFilesRowId, textoIntegral, ok: true }`. On failure emit `{ ok: false, error, stage }` so the caller sets `analiseStatus=ERRO` + `revisaoPendente=true` and falls back to registro `raw_text`.

- [ ] **Step 2: Manual verification**

Run against one known sentença (with the daemon's PJe session live). Confirm: PDF lands in `03 - Decisões e Sentenças`, a `drive_files` row exists, stdout JSON has non-empty `textoIntegral`.

- [ ] **Step 3: Commit**

```bash
git add .claude/skills/analise-sentenca/scripts/capturar_sentenca.py
git commit -m "feat(sentencas): capturar_sentenca browser-lane (open process → PDF → Drive → text)"
```

---

## Task 12: Varredura enqueue hook

**Files:**
- Modify: `.claude/skills/varredura-triagem/scripts/varredura_triagem.py` (write-back stage, around the registro-creation block ~line 1091)
- Mirror: `.claude/skills-cowork/varredura-triagem/scripts/varredura_triagem.py` (keep the sibling copy in sync — see `evolucao-skills`)

- [ ] **Step 1: Add the enqueue at write-back**

After the demanda `ato` is resolved and the base registro is written, if the resolved ato satisfies the sentença test (port `isSentencaAto`'s regex to Python: `re.search(r"senten|condena|absolvi|pron[uú]ncia|impron|desclassifica", n)` and NOT `re.search(r"ac[oó]rd[aã]o", n)` on the accent-stripped lowercased ato), AND a download id is available (`pje_documento_id` on the demanda, else `enrichment_data.id_documento_pje`):
  - enqueue a `claude_code_tasks` row: `skill="analise-sentenca"`, `lane="browser"`, `created_by = SYSTEM_USER_ID`, `prompt`/`instrucao_adicional` carrying `numeroProcesso`, `pjeDocumentoId`, `assistidoId`, `atribuicao`, `demandaOrigemId`.
  - The daemon then runs capture (browser) → analysis (ai) → `sentencas.upsertFromAnalysis`.
Use the existing REST/insert pattern the varredura already uses to write `registros` (POST to Supabase `/rest/v1/claude_code_tasks`). Do **not** change demanda `status`.

- [ ] **Step 2: Manual verification**

Run the varredura on a triagem demanda known to be a sentença; confirm exactly one `claude_code_tasks` row (`skill=analise-sentenca`) is enqueued, and none for an acórdão demanda.

- [ ] **Step 3: Commit**

```bash
git add .claude/skills/varredura-triagem/scripts/varredura_triagem.py .claude/skills-cowork/varredura-triagem/scripts/varredura_triagem.py
git commit -m "feat(sentencas): enqueue analise-sentenca capture from varredura write-back"
```

---

## Task 13: Full-suite green + skill-evolution note

- [ ] **Step 1: Run the whole unit suite**

Run: `npm test`
Expected: all green (including the 5 new sentença pure-logic specs).

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: clean.

- [ ] **Step 3: Record the learning** (per `evolucao-skills`)

Update memory / the varredura skill notes that sentença classification now also triggers the capture+analysis pipeline, and that the trigger inherits the `5_TRIAGEM/URGENTE` catch-22 (sentenças that skip triagem are not yet covered — candidate follow-up).

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "test(sentencas): full suite green + skill-evolution note"
```

---

## Manual / Integration verification checklist (no automated harness for I/O)

- [ ] One end-to-end run: triagem sentença demanda → `claude_code_tasks` enqueued → PDF in Drive `03 - Decisões e Sentenças` → `drive_files` row → `sentencas` row with `analiseStatus=CONCLUIDO` + populated `analiseIa` → `magistrados` row → `registro` tipo `analise` on the demanda.
- [ ] Re-run the same demanda → no duplicate `sentencas`/`magistrados` rows (idempotency).
- [ ] Acórdão demanda → NOT enqueued.
- [ ] PDF download failure → `analiseStatus=ERRO`, `revisaoPendente=true`, fallback analysis from registro `raw_text`.
- [ ] VVD/sigiloso sentença → detail invisible to a non-owning defensor; aggregate projection still counts it.

## Deferred (NOT in this plan — see spec §9)
Dashboards (magistrado/vara intelligence UI), acórdão replication (+ parecer-MP/procurador, vara de origem on `acordaos`/`recursos`), cross-defensor rollup beyond per-magistrado stats, multi-assistido linkage, and covering sentenças that skip triagem.
