# Módulo Férias Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A dedicated Férias module — períodos aquisitivos + parcelas de fruição with a real lifecycle, saldo by arithmetic, and auto-created cobertura (afastamento) + timeline projection (vida_funcional evento) so the Carreira Hub keeps working untouched.

**Architecture:** Two dedicated Drizzle tables (`ferias_periodos`, `ferias_parcelas`). Pure logic in `src/lib/ferias/` (saldo, transições, projeção, status-visual) — fully unit-tested. A `ferias` tRPC router fetches rows, enforces guards (titular-only, saldo, transitions, self-coverage), and on create/update runs a `db.transaction()` that also writes/cascades the linked afastamento + vida_funcional evento. One client page consumes it.

**Tech Stack:** Next.js 15 (App Router, client components), tRPC, Drizzle ORM (Postgres), Tailwind + Padrão Defender v5 tokens, vitest.

## Global Constraints

- **Privacy:** reads use `getVidaFuncionalScope(ctx.user)`; writes restricted to titular (`FORBIDDEN` if `defensorId !== ctx.user.id`), mirroring `vida-funcional.ts`.
- **`afastamentos` requires notNull `defensorId` + `substitutoId`** — a parcela creates an afastamento ONLY when `substitutoId` is set; reuse the shape `{ ativo:true, acessoDemandas:true, acessoEquipe:false }` from `coberturaRouter.criarAfastamento`.
- **Self-coverage forbidden:** `substitutoId !== ctx.user.id` (`BAD_REQUEST`).
- **Saldo guard (server-side):** `computeSaldo(diasDireito, parcelasNaoCanceladas).disponiveis >= diasInclusive(novaParcela)` else `BAD_REQUEST`. `atualizarPeriodo` rejects `diasDireito` reduction below `programados + concluidos`.
- **Transitions:** parcela status change rejected unless `podeTransicionar(de, para)`.
- **Transactions:** `criarParcela`, `atualizarParcela`, `removerParcela` wrap their multi-table writes in `db.transaction(async (tx) => …)`.
- **Dates:** `YYYY-MM-DD` strings; compare lexicographically; day counts via `diasInclusive` (UTC). No date-fns on raw values.
- **Soft-delete:** every read filters `isNull(deletedAt)`.
- **Projection:** each non-cancelada parcela projects a `vida_funcional_eventos` row (`tipo:"FERIAS"`, `cluster:"ausencias"`); cancel/remove soft-deletes it. NO changes to carreira router/views.
- **Status chips:** use the férias-local `feriasStatusInfo` — never the shared `carreiraStatusInfo` (which lacks these statuses).
- **Module pattern** mirrors substituições (schema in `src/lib/db/schema/`, router in `routers/` registered in `index.ts`, page under `admin/`).

---

### Task 1: Schema + migration

**Files:**
- Create: `src/lib/db/schema/ferias.ts`
- Modify: `src/lib/db/schema/index.ts` (append one export line)
- Test: `src/lib/db/schema/__tests__/ferias-schema.test.ts`

**Interfaces:**
- Consumes: `users` from `./core`.
- Produces: `feriasStatusEnum`, `feriasPeriodos`, `feriasParcelas`, and types `FeriasPeriodo`/`FeriasParcela`. Enum values: `["programada","homologada","em_fruicao","concluida","cancelada"]`.

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/db/schema/__tests__/ferias-schema.test.ts
import { describe, it, expect } from "vitest";
import { feriasPeriodos, feriasParcelas, feriasStatusEnum } from "@/lib/db/schema";

describe("ferias schema", () => {
  it("exports both tables and the status enum from the barrel", () => {
    expect(feriasPeriodos).toBeDefined();
    expect(feriasParcelas).toBeDefined();
    expect(feriasStatusEnum.enumValues).toEqual([
      "programada", "homologada", "em_fruicao", "concluida", "cancelada",
    ]);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/lib/db/schema/__tests__/ferias-schema.test.ts`
Expected: FAIL — `feriasPeriodos` is not exported.

- [ ] **Step 3: Write the schema**

```ts
// src/lib/db/schema/ferias.ts
import { pgTable, pgEnum, serial, integer, text, date, timestamp, index } from "drizzle-orm/pg-core";
import { users } from "./core";

export const feriasStatusEnum = pgEnum("ferias_status", [
  "programada", "homologada", "em_fruicao", "concluida", "cancelada",
]);

export const feriasPeriodos = pgTable("ferias_periodos", {
  id: serial("id").primaryKey(),
  defensorId: integer("defensor_id").references(() => users.id).notNull(),
  aquisitivoInicio: date("aquisitivo_inicio").notNull(),
  aquisitivoFim: date("aquisitivo_fim").notNull(),
  diasDireito: integer("dias_direito").default(30).notNull(),
  observacoes: text("observacoes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  deletedAt: timestamp("deleted_at"),
}, (t) => [
  index("ferias_periodos_defensor_deleted_idx").on(t.defensorId, t.deletedAt),
]);

export const feriasParcelas = pgTable("ferias_parcelas", {
  id: serial("id").primaryKey(),
  periodoId: integer("periodo_id").references(() => feriasPeriodos.id).notNull(),
  defensorId: integer("defensor_id").references(() => users.id).notNull(),
  dataInicio: date("data_inicio").notNull(),
  dataFim: date("data_fim").notNull(),
  status: feriasStatusEnum("status").default("programada").notNull(),
  substitutoId: integer("substituto_id").references(() => users.id),
  afastamentoId: integer("afastamento_id"),
  vidaFuncionalEventoId: integer("vida_funcional_evento_id"),
  seiProtocolo: text("sei_protocolo"),
  observacoes: text("observacoes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  deletedAt: timestamp("deleted_at"),
}, (t) => [
  index("ferias_parcelas_periodo_idx").on(t.periodoId),
  index("ferias_parcelas_defensor_status_deleted_idx").on(t.defensorId, t.status, t.deletedAt),
]);

export type FeriasPeriodo = typeof feriasPeriodos.$inferSelect;
export type FeriasParcela = typeof feriasParcelas.$inferSelect;
export type InsertFeriasPeriodo = typeof feriasPeriodos.$inferInsert;
export type InsertFeriasParcela = typeof feriasParcelas.$inferInsert;
```

- [ ] **Step 4: Register in the schema barrel**

Append to `src/lib/db/schema/index.ts` (after the last `export * from`):

```ts
export * from "./ferias";
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx vitest run src/lib/db/schema/__tests__/ferias-schema.test.ts`
Expected: PASS.

- [ ] **Step 6: Generate the migration**

Run: `npm run db:generate`
Expected: a new migration file appears under the drizzle migrations dir creating `ferias_status` enum + `ferias_periodos` + `ferias_parcelas`. (Applying it to the DB — `npm run db:push` — requires a live DB connection; run that in an environment that has one. Do NOT hand-edit the generated SQL.)

- [ ] **Step 7: Commit**

```bash
git add src/lib/db/schema/ferias.ts src/lib/db/schema/index.ts src/lib/db/schema/__tests__/ferias-schema.test.ts
git add drizzle 2>/dev/null || true
git commit -m "feat(ferias): schema ferias_periodos + ferias_parcelas + migration"
```

---

### Task 2: Saldo + transições (pure rules)

**Files:**
- Create: `src/lib/ferias/saldo.ts`
- Create: `src/lib/ferias/transicoes.ts`
- Test: `src/lib/ferias/__tests__/saldo.test.ts`
- Test: `src/lib/ferias/__tests__/transicoes.test.ts`

**Interfaces:**
- Consumes: nothing (pure).
- Produces:
  - `type ParcelaLite = { id: number; dataInicio: string; dataFim: string; status: string }`
  - `type Saldo = { direito: number; programados: number; concluidos: number; disponiveis: number }`
  - `function diasInclusive(inicio: string, fim: string): number`
  - `function computeSaldo(diasDireito: number, parcelas: ParcelaLite[]): Saldo`
  - `type FeriasStatus = "programada"|"homologada"|"em_fruicao"|"concluida"|"cancelada"`
  - `const TRANSICOES: Record<FeriasStatus, FeriasStatus[]>`
  - `function podeTransicionar(de: string, para: string): boolean`

- [ ] **Step 1: Write the failing tests**

```ts
// src/lib/ferias/__tests__/saldo.test.ts
import { describe, it, expect } from "vitest";
import { diasInclusive, computeSaldo, type ParcelaLite } from "../saldo";

function p(over: Partial<ParcelaLite>): ParcelaLite {
  return { id: 1, dataInicio: "2026-07-01", dataFim: "2026-07-10", status: "programada", ...over };
}

describe("diasInclusive", () => {
  it("counts inclusive days", () => {
    expect(diasInclusive("2026-07-01", "2026-07-10")).toBe(10);
    expect(diasInclusive("2026-07-01", "2026-07-01")).toBe(1);
  });
  it("returns 0 when fim < inicio", () => {
    expect(diasInclusive("2026-07-10", "2026-07-01")).toBe(0);
  });
});

describe("computeSaldo", () => {
  it("buckets programados vs concluidos and excludes cancelada", () => {
    const s = computeSaldo(30, [
      p({ id: 1, dataInicio: "2026-07-01", dataFim: "2026-07-10", status: "programada" }),   // 10
      p({ id: 2, dataInicio: "2026-08-01", dataFim: "2026-08-05", status: "concluida" }),     // 5
      p({ id: 3, dataInicio: "2026-09-01", dataFim: "2026-09-30", status: "cancelada" }),     // ignored
    ]);
    expect(s).toEqual({ direito: 30, programados: 10, concluidos: 5, disponiveis: 15 });
  });
  it("treats homologada and em_fruicao as programados", () => {
    const s = computeSaldo(30, [
      p({ id: 1, dataInicio: "2026-07-01", dataFim: "2026-07-05", status: "homologada" }),    // 5
      p({ id: 2, dataInicio: "2026-07-10", dataFim: "2026-07-12", status: "em_fruicao" }),    // 3
    ]);
    expect(s.programados).toBe(8);
    expect(s.disponiveis).toBe(22);
  });
  it("goes negative when over-allocated", () => {
    const s = computeSaldo(10, [p({ dataInicio: "2026-07-01", dataFim: "2026-07-20", status: "programada" })]); // 20
    expect(s.disponiveis).toBe(-10);
  });
});
```

```ts
// src/lib/ferias/__tests__/transicoes.test.ts
import { describe, it, expect } from "vitest";
import { podeTransicionar } from "../transicoes";

describe("podeTransicionar", () => {
  it("allows the valid edges", () => {
    expect(podeTransicionar("programada", "homologada")).toBe(true);
    expect(podeTransicionar("programada", "cancelada")).toBe(true);
    expect(podeTransicionar("homologada", "em_fruicao")).toBe(true);
    expect(podeTransicionar("em_fruicao", "concluida")).toBe(true);
  });
  it("rejects invalid edges and terminals", () => {
    expect(podeTransicionar("programada", "em_fruicao")).toBe(false);
    expect(podeTransicionar("programada", "concluida")).toBe(false);
    expect(podeTransicionar("concluida", "em_fruicao")).toBe(false);
    expect(podeTransicionar("cancelada", "programada")).toBe(false);
  });
  it("rejects unknown statuses", () => {
    expect(podeTransicionar("foo", "bar")).toBe(false);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/lib/ferias/__tests__/saldo.test.ts src/lib/ferias/__tests__/transicoes.test.ts`
Expected: FAIL — modules not found.

- [ ] **Step 3: Write the implementations**

```ts
// src/lib/ferias/saldo.ts
export type ParcelaLite = { id: number; dataInicio: string; dataFim: string; status: string };
export type Saldo = { direito: number; programados: number; concluidos: number; disponiveis: number };

/** Inclusive day count between two YYYY-MM-DD strings (UTC). 0 if fim < inicio. */
export function diasInclusive(inicio: string, fim: string): number {
  if (fim < inicio) return 0;
  const a = new Date(`${inicio}T00:00:00Z`).getTime();
  const b = new Date(`${fim}T00:00:00Z`).getTime();
  return Math.round((b - a) / 86_400_000) + 1;
}

const PROGRAMADO = new Set(["programada", "homologada", "em_fruicao"]);

export function computeSaldo(diasDireito: number, parcelas: ParcelaLite[]): Saldo {
  let programados = 0;
  let concluidos = 0;
  for (const p of parcelas) {
    if (p.status === "cancelada") continue;
    const dias = diasInclusive(p.dataInicio, p.dataFim);
    if (p.status === "concluida") concluidos += dias;
    else if (PROGRAMADO.has(p.status)) programados += dias;
  }
  return { direito: diasDireito, programados, concluidos, disponiveis: diasDireito - programados - concluidos };
}
```

```ts
// src/lib/ferias/transicoes.ts
export type FeriasStatus = "programada" | "homologada" | "em_fruicao" | "concluida" | "cancelada";

export const TRANSICOES: Record<FeriasStatus, FeriasStatus[]> = {
  programada: ["homologada", "cancelada"],
  homologada: ["em_fruicao", "cancelada"],
  em_fruicao: ["concluida", "cancelada"],
  concluida: [],
  cancelada: [],
};

export function podeTransicionar(de: string, para: string): boolean {
  const allowed = TRANSICOES[de as FeriasStatus];
  return Array.isArray(allowed) && allowed.includes(para as FeriasStatus);
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/lib/ferias/__tests__/saldo.test.ts src/lib/ferias/__tests__/transicoes.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/ferias/saldo.ts src/lib/ferias/transicoes.ts src/lib/ferias/__tests__/saldo.test.ts src/lib/ferias/__tests__/transicoes.test.ts
git commit -m "feat(ferias): lógica pura de saldo + máquina de transições"
```

---

### Task 3: Projeção + status visual (pure)

**Files:**
- Create: `src/lib/ferias/projecao.ts`
- Create: `src/lib/ferias/status-visual.ts`
- Test: `src/lib/ferias/__tests__/projecao.test.ts`
- Test: `src/lib/ferias/__tests__/status-visual.test.ts`

**Interfaces:**
- Consumes: `VisualTipo` from `@/lib/config/tipologia` (shape `{ label: string; badge: string; dot: string }`).
- Produces:
  - `function statusEventoDeParcela(status: string): "previsto"|"em_curso"|"concluido"`
  - `function tituloParcela(input: { aquisitivoInicio: string; aquisitivoFim: string; ordem: number }): string`
  - `type ProjecaoEvento = { tipo: "FERIAS"; cluster: "ausencias"; titulo: string; dataEvento: string; dataFim: string; status: "previsto"|"em_curso"|"concluido"; dados: { feriasParcelaId: number | null } }`
  - `function projecaoEventoDeParcela(parcela: { id: number | null; dataInicio: string; dataFim: string; status: string }, periodo: { aquisitivoInicio: string; aquisitivoFim: string }, ordem: number): ProjecaoEvento`
  - `function feriasStatusInfo(status?: string | null): VisualTipo`

- [ ] **Step 1: Write the failing tests**

```ts
// src/lib/ferias/__tests__/projecao.test.ts
import { describe, it, expect } from "vitest";
import { statusEventoDeParcela, tituloParcela, projecaoEventoDeParcela } from "../projecao";

describe("statusEventoDeParcela", () => {
  it("maps parcela status to vida_funcional event status", () => {
    expect(statusEventoDeParcela("programada")).toBe("previsto");
    expect(statusEventoDeParcela("homologada")).toBe("previsto");
    expect(statusEventoDeParcela("em_fruicao")).toBe("em_curso");
    expect(statusEventoDeParcela("concluida")).toBe("concluido");
  });
});

describe("tituloParcela", () => {
  it("formats with year range and ordinal", () => {
    expect(tituloParcela({ aquisitivoInicio: "2025-01-01", aquisitivoFim: "2026-12-31", ordem: 2 }))
      .toBe("Férias 2025/2026 — 2ª parcela");
  });
  it("collapses same year", () => {
    expect(tituloParcela({ aquisitivoInicio: "2025-01-01", aquisitivoFim: "2025-12-31", ordem: 1 }))
      .toBe("Férias 2025 — 1ª parcela");
  });
});

describe("projecaoEventoDeParcela", () => {
  it("builds the vida_funcional projection object", () => {
    const proj = projecaoEventoDeParcela(
      { id: 7, dataInicio: "2026-07-01", dataFim: "2026-07-10", status: "em_fruicao" },
      { aquisitivoInicio: "2025-01-01", aquisitivoFim: "2025-12-31" },
      1,
    );
    expect(proj).toEqual({
      tipo: "FERIAS", cluster: "ausencias", titulo: "Férias 2025 — 1ª parcela",
      dataEvento: "2026-07-01", dataFim: "2026-07-10", status: "em_curso",
      dados: { feriasParcelaId: 7 },
    });
  });
});
```

```ts
// src/lib/ferias/__tests__/status-visual.test.ts
import { describe, it, expect } from "vitest";
import { feriasStatusInfo } from "../status-visual";

describe("feriasStatusInfo", () => {
  it("labels every parcela status (no audiência fallback)", () => {
    expect(feriasStatusInfo("programada").label).toBe("Programada");
    expect(feriasStatusInfo("homologada").label).toBe("Homologada");
    expect(feriasStatusInfo("em_fruicao").label).toBe("Em fruição");
    expect(feriasStatusInfo("concluida").label).toBe("Concluída");
    expect(feriasStatusInfo("cancelada").label).toBe("Cancelada");
  });
  it("returns badge + dot for every known status", () => {
    for (const s of ["programada","homologada","em_fruicao","concluida","cancelada"]) {
      const r = feriasStatusInfo(s);
      expect(r.badge.length).toBeGreaterThan(0);
      expect(r.dot.length).toBeGreaterThan(0);
    }
  });
  it("neutral fallback echoes unknown status", () => {
    expect(feriasStatusInfo("xpto").label).toBe("xpto");
    expect(feriasStatusInfo("xpto").badge).toContain("neutral");
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/lib/ferias/__tests__/projecao.test.ts src/lib/ferias/__tests__/status-visual.test.ts`
Expected: FAIL — modules not found.

- [ ] **Step 3: Write the implementations**

```ts
// src/lib/ferias/projecao.ts
export function statusEventoDeParcela(status: string): "previsto" | "em_curso" | "concluido" {
  if (status === "em_fruicao") return "em_curso";
  if (status === "concluida") return "concluido";
  return "previsto"; // programada | homologada
}

function anoLabel(aquisitivoInicio: string, aquisitivoFim: string): string {
  const a = aquisitivoInicio.slice(0, 4);
  const b = aquisitivoFim.slice(0, 4);
  return a === b ? a : `${a}/${b}`;
}

export function tituloParcela(input: { aquisitivoInicio: string; aquisitivoFim: string; ordem: number }): string {
  return `Férias ${anoLabel(input.aquisitivoInicio, input.aquisitivoFim)} — ${input.ordem}ª parcela`;
}

export type ProjecaoEvento = {
  tipo: "FERIAS";
  cluster: "ausencias";
  titulo: string;
  dataEvento: string;
  dataFim: string;
  status: "previsto" | "em_curso" | "concluido";
  dados: { feriasParcelaId: number | null };
};

export function projecaoEventoDeParcela(
  parcela: { id: number | null; dataInicio: string; dataFim: string; status: string },
  periodo: { aquisitivoInicio: string; aquisitivoFim: string },
  ordem: number,
): ProjecaoEvento {
  return {
    tipo: "FERIAS",
    cluster: "ausencias",
    titulo: tituloParcela({ aquisitivoInicio: periodo.aquisitivoInicio, aquisitivoFim: periodo.aquisitivoFim, ordem }),
    dataEvento: parcela.dataInicio,
    dataFim: parcela.dataFim,
    status: statusEventoDeParcela(parcela.status),
    dados: { feriasParcelaId: parcela.id },
  };
}
```

```ts
// src/lib/ferias/status-visual.ts
import type { VisualTipo } from "@/lib/config/tipologia";

const NEUTRAL = { badge: "bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400", dot: "bg-neutral-400" };
const SKY = { badge: "bg-sky-50 text-sky-700 dark:bg-sky-950/30 dark:text-sky-400", dot: "bg-sky-500" };
const AMBER = { badge: "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400", dot: "bg-amber-500" };
const EMERALD = { badge: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400", dot: "bg-emerald-500" };
const ROSE = { badge: "bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-400", dot: "bg-rose-500" };

const MAP: Record<string, VisualTipo> = {
  programada: { label: "Programada", ...NEUTRAL },
  homologada: { label: "Homologada", ...SKY },
  em_fruicao: { label: "Em fruição", ...AMBER },
  concluida: { label: "Concluída", ...EMERALD },
  cancelada: { label: "Cancelada", ...ROSE },
};

/** Resolve um status de parcela de férias para VisualTipo (use via <StatusChip info={...} />). */
export function feriasStatusInfo(status?: string | null): VisualTipo {
  const k = (status ?? "").trim().toLowerCase();
  return MAP[k] ?? { label: status ?? "—", ...NEUTRAL };
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/lib/ferias/__tests__/projecao.test.ts src/lib/ferias/__tests__/status-visual.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/ferias/projecao.ts src/lib/ferias/status-visual.ts src/lib/ferias/__tests__/projecao.test.ts src/lib/ferias/__tests__/status-visual.test.ts
git commit -m "feat(ferias): projeção p/ vida_funcional + resolver de status visual"
```

---

### Task 4: `ferias` tRPC router + registration

**Files:**
- Create: `src/lib/trpc/routers/ferias.ts`
- Modify: `src/lib/trpc/routers/index.ts` (import + register `ferias: feriasRouter`)
- Test: `src/lib/trpc/routers/__tests__/ferias-router.test.ts` (structural — guards the contract by reading source, matching `carreira-router.test.ts`)

**Interfaces:**
- Consumes: Task 1 tables (`feriasPeriodos`, `feriasParcelas`) + `afastamentos`, `vidaFuncionalEventos`, `users` from schema; Task 2 (`computeSaldo`, `diasInclusive`, `ParcelaLite`, `podeTransicionar`); Task 3 (`projecaoEventoDeParcela`, `statusEventoDeParcela`); `getVidaFuncionalScope`.
- Produces: `feriasRouter` with `listar` (protected query), `criarPeriodo`/`atualizarPeriodo`/`removerPeriodo`, `criarParcela`/`atualizarParcela`/`removerParcela` (protected mutations). Registered as `appRouter.ferias`.

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/trpc/routers/__tests__/ferias-router.test.ts
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it, expect } from "vitest";

const ROUTERS = join(process.cwd(), "src/lib/trpc/routers");
const read = (rel: string) => readFileSync(join(ROUTERS, rel), "utf8");

describe("ferias router — contract", () => {
  const src = read("ferias.ts");

  it("scopes reads with getVidaFuncionalScope", () => {
    expect(src).toContain("getVidaFuncionalScope");
  });
  it("filters soft-deleted rows", () => {
    expect(src).toMatch(/isNull\([^)]*deletedAt\)/);
  });
  it("guards titular-only writes", () => {
    expect(src).toContain("FORBIDDEN");
  });
  it("rejects self-coverage", () => {
    expect(src).toMatch(/substitutoId\s*===\s*ctx\.user\.id/);
  });
  it("enforces the saldo guard", () => {
    expect(src).toContain("computeSaldo");
    expect(src).toMatch(/disponiveis/);
  });
  it("gates parcela status changes via podeTransicionar", () => {
    expect(src).toContain("podeTransicionar");
  });
  it("wraps multi-table writes in a transaction", () => {
    expect(src).toContain("db.transaction");
  });
  it("creates the afastamento only when a substituto is present", () => {
    expect(src).toMatch(/if\s*\(\s*input\.substitutoId/);
  });
  it("is registered in the appRouter", () => {
    const index = read("index.ts");
    expect(index).toContain("feriasRouter");
    expect(index).toMatch(/ferias:\s*feriasRouter/);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/lib/trpc/routers/__tests__/ferias-router.test.ts`
Expected: FAIL — `ferias.ts` does not exist.

- [ ] **Step 3: Write the router**

```ts
// src/lib/trpc/routers/ferias.ts
import { z } from "zod";
import { and, asc, eq, inArray, isNull } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../init";
import { db } from "@/lib/db";
import { feriasPeriodos, feriasParcelas, afastamentos, vidaFuncionalEventos, users } from "@/lib/db/schema";
import { getVidaFuncionalScope } from "../vida-funcional-scope";
import { computeSaldo, diasInclusive, type ParcelaLite } from "@/lib/ferias/saldo";
import { podeTransicionar } from "@/lib/ferias/transicoes";
import { projecaoEventoDeParcela, statusEventoDeParcela } from "@/lib/ferias/projecao";

const ISO = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "data inválida (AAAA-MM-DD)");
const today = () => new Date().toISOString().slice(0, 10);

/** ordem 1-indexed by dataInicio ASC (id tiebreaker) among the período's parcelas. */
function ordemDe(parcelas: { id: number; dataInicio: string }[], alvoDataInicio: string, alvoId: number): number {
  const sorted = [...parcelas].sort((a, b) =>
    a.dataInicio < b.dataInicio ? -1 : a.dataInicio > b.dataInicio ? 1 : a.id - b.id,
  );
  const idx = sorted.findIndex((p) => p.id === alvoId);
  if (idx >= 0) return idx + 1;
  // not yet inserted: position by date
  return sorted.filter((p) => p.dataInicio < alvoDataInicio).length + 1;
}

export const feriasRouter = router({
  /** Lista períodos do escopo + parcelas + saldo computado. */
  listar: protectedProcedure.query(async ({ ctx }) => {
    const scope = getVidaFuncionalScope(ctx.user);
    const periodos = await db
      .select()
      .from(feriasPeriodos)
      .where(and(isNull(feriasPeriodos.deletedAt), inArray(feriasPeriodos.defensorId, scope)))
      .orderBy(asc(feriasPeriodos.aquisitivoInicio));

    const periodoIds = periodos.map((p) => p.id);
    const parcelas = periodoIds.length
      ? await db
          .select()
          .from(feriasParcelas)
          .where(and(isNull(feriasParcelas.deletedAt), inArray(feriasParcelas.periodoId, periodoIds)))
      : [];

    const subIds = [...new Set(parcelas.map((p) => p.substitutoId).filter((x): x is number => x !== null))];
    const subRows = subIds.length
      ? await db.select({ id: users.id, name: users.name }).from(users).where(inArray(users.id, subIds))
      : [];
    const nome = new Map(subRows.map((u) => [u.id, u.name ?? `#${u.id}`]));

    return periodos.map((periodo) => {
      const ps = parcelas.filter((p) => p.periodoId === periodo.id);
      const lite: ParcelaLite[] = ps.map((p) => ({ id: p.id, dataInicio: p.dataInicio, dataFim: p.dataFim, status: p.status }));
      const ordemBase = ps.map((p) => ({ id: p.id, dataInicio: p.dataInicio }));
      return {
        periodo: {
          id: periodo.id,
          aquisitivoInicio: periodo.aquisitivoInicio,
          aquisitivoFim: periodo.aquisitivoFim,
          diasDireito: periodo.diasDireito,
          observacoes: periodo.observacoes,
        },
        saldo: computeSaldo(periodo.diasDireito, lite),
        parcelas: ps
          .map((p) => ({
            id: p.id,
            ordem: ordemDe(ordemBase, p.dataInicio, p.id),
            dataInicio: p.dataInicio,
            dataFim: p.dataFim,
            dias: diasInclusive(p.dataInicio, p.dataFim),
            status: p.status,
            substitutoId: p.substitutoId,
            substitutoNome: p.substitutoId !== null ? nome.get(p.substitutoId) ?? null : null,
            seiProtocolo: p.seiProtocolo,
            observacoes: p.observacoes,
          }))
          .sort((a, b) => a.ordem - b.ordem),
      };
    });
  }),

  criarPeriodo: protectedProcedure
    .input(z.object({
      aquisitivoInicio: ISO,
      aquisitivoFim: ISO,
      diasDireito: z.number().int().min(1).max(120).default(30),
      observacoes: z.string().nullable().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const [row] = await db.insert(feriasPeriodos).values({
        defensorId: ctx.user.id,
        aquisitivoInicio: input.aquisitivoInicio,
        aquisitivoFim: input.aquisitivoFim,
        diasDireito: input.diasDireito,
        observacoes: input.observacoes ?? null,
      }).returning();
      return row;
    }),

  atualizarPeriodo: protectedProcedure
    .input(z.object({
      id: z.number().int(),
      aquisitivoInicio: ISO.optional(),
      aquisitivoFim: ISO.optional(),
      diasDireito: z.number().int().min(1).max(120).optional(),
      observacoes: z.string().nullable().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const [periodo] = await db.select().from(feriasPeriodos)
        .where(and(eq(feriasPeriodos.id, input.id), isNull(feriasPeriodos.deletedAt))).limit(1);
      if (!periodo) throw new TRPCError({ code: "NOT_FOUND", message: "Período não encontrado" });
      if (periodo.defensorId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN", message: "Só o titular altera suas férias" });

      if (input.diasDireito !== undefined && input.diasDireito < periodo.diasDireito) {
        const ps = await db.select().from(feriasParcelas)
          .where(and(eq(feriasParcelas.periodoId, periodo.id), isNull(feriasParcelas.deletedAt)));
        const lite: ParcelaLite[] = ps.map((p) => ({ id: p.id, dataInicio: p.dataInicio, dataFim: p.dataFim, status: p.status }));
        const usado = computeSaldo(input.diasDireito, lite);
        if (usado.programados + usado.concluidos > input.diasDireito) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "diasDireito menor que os dias já programados/concluídos" });
        }
      }

      const { id, ...rest } = input;
      const [row] = await db.update(feriasPeriodos)
        .set({ ...rest, updatedAt: new Date() })
        .where(eq(feriasPeriodos.id, id)).returning();
      return row;
    }),

  removerPeriodo: protectedProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      const [periodo] = await db.select().from(feriasPeriodos)
        .where(and(eq(feriasPeriodos.id, input.id), isNull(feriasPeriodos.deletedAt))).limit(1);
      if (!periodo) throw new TRPCError({ code: "NOT_FOUND", message: "Período não encontrado" });
      if (periodo.defensorId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN", message: "Só o titular altera suas férias" });
      await db.update(feriasPeriodos).set({ deletedAt: new Date() }).where(eq(feriasPeriodos.id, input.id));
      return { ok: true };
    }),

  criarParcela: protectedProcedure
    .input(z.object({
      periodoId: z.number().int(),
      dataInicio: ISO,
      dataFim: ISO,
      substitutoId: z.number().int().nullable().optional(),
      seiProtocolo: z.string().nullable().optional(),
      observacoes: z.string().nullable().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const [periodo] = await db.select().from(feriasPeriodos)
        .where(and(eq(feriasPeriodos.id, input.periodoId), isNull(feriasPeriodos.deletedAt))).limit(1);
      if (!periodo) throw new TRPCError({ code: "NOT_FOUND", message: "Período não encontrado" });
      if (periodo.defensorId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN", message: "Só o titular altera suas férias" });
      if (input.dataFim < input.dataInicio) throw new TRPCError({ code: "BAD_REQUEST", message: "dataFim anterior a dataInicio" });
      if (input.substitutoId != null && input.substitutoId === ctx.user.id) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Você não pode ser seu próprio substituto" });
      }

      const existentes = await db.select().from(feriasParcelas)
        .where(and(eq(feriasParcelas.periodoId, periodo.id), isNull(feriasParcelas.deletedAt)));
      const lite: ParcelaLite[] = existentes.map((p) => ({ id: p.id, dataInicio: p.dataInicio, dataFim: p.dataFim, status: p.status }));
      const saldo = computeSaldo(periodo.diasDireito, lite);
      const novos = diasInclusive(input.dataInicio, input.dataFim);
      if (saldo.disponiveis < novos) {
        throw new TRPCError({ code: "BAD_REQUEST", message: `Saldo insuficiente (${saldo.disponiveis} disponíveis, ${novos} solicitados)` });
      }

      const ordem = existentes.filter((p) => p.dataInicio < input.dataInicio).length + 1;

      return await db.transaction(async (tx) => {
        let afastamentoId: number | null = null;
        if (input.substitutoId != null) {
          const [af] = await tx.insert(afastamentos).values({
            defensorId: ctx.user.id,
            substitutoId: input.substitutoId,
            dataInicio: input.dataInicio,
            dataFim: input.dataFim,
            tipo: "FERIAS",
            motivo: "Férias",
            ativo: true,
            acessoDemandas: true,
            acessoEquipe: false,
          }).returning({ id: afastamentos.id });
          afastamentoId = af.id;
        }

        const proj = projecaoEventoDeParcela(
          { id: null, dataInicio: input.dataInicio, dataFim: input.dataFim, status: "programada" },
          periodo, ordem,
        );
        const [evento] = await tx.insert(vidaFuncionalEventos).values({
          defensorId: ctx.user.id,
          tipo: proj.tipo, cluster: proj.cluster, titulo: proj.titulo,
          dataEvento: proj.dataEvento, dataFim: proj.dataFim, status: proj.status,
          origem: "manual", dados: { feriasParcelaId: null },
        }).returning({ id: vidaFuncionalEventos.id });

        const [parcela] = await tx.insert(feriasParcelas).values({
          periodoId: periodo.id,
          defensorId: ctx.user.id,
          dataInicio: input.dataInicio,
          dataFim: input.dataFim,
          status: "programada",
          substitutoId: input.substitutoId ?? null,
          afastamentoId,
          vidaFuncionalEventoId: evento.id,
          seiProtocolo: input.seiProtocolo ?? null,
          observacoes: input.observacoes ?? null,
        }).returning();

        // backfill the projection's dados with the real parcela id
        await tx.update(vidaFuncionalEventos)
          .set({ dados: { feriasParcelaId: parcela.id } })
          .where(eq(vidaFuncionalEventos.id, evento.id));

        return parcela;
      });
    }),

  atualizarParcela: protectedProcedure
    .input(z.object({
      id: z.number().int(),
      status: z.enum(["programada", "homologada", "em_fruicao", "concluida", "cancelada"]).optional(),
      dataInicio: ISO.optional(),
      dataFim: ISO.optional(),
      seiProtocolo: z.string().nullable().optional(),
      observacoes: z.string().nullable().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const [parcela] = await db.select().from(feriasParcelas)
        .where(and(eq(feriasParcelas.id, input.id), isNull(feriasParcelas.deletedAt))).limit(1);
      if (!parcela) throw new TRPCError({ code: "NOT_FOUND", message: "Parcela não encontrada" });
      if (parcela.defensorId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN", message: "Só o titular altera suas férias" });

      if (input.status && input.status !== parcela.status && !podeTransicionar(parcela.status, input.status)) {
        throw new TRPCError({ code: "BAD_REQUEST", message: `Transição inválida: ${parcela.status} → ${input.status}` });
      }

      const novaInicio = input.dataInicio ?? parcela.dataInicio;
      const novaFim = input.dataFim ?? parcela.dataFim;
      if (novaFim < novaInicio) throw new TRPCError({ code: "BAD_REQUEST", message: "dataFim anterior a dataInicio" });

      if (input.dataInicio || input.dataFim) {
        const [periodo] = await db.select().from(feriasPeriodos).where(eq(feriasPeriodos.id, parcela.periodoId)).limit(1);
        const outras = await db.select().from(feriasParcelas)
          .where(and(eq(feriasParcelas.periodoId, parcela.periodoId), isNull(feriasParcelas.deletedAt)));
        const lite: ParcelaLite[] = outras
          .filter((p) => p.id !== parcela.id)
          .map((p) => ({ id: p.id, dataInicio: p.dataInicio, dataFim: p.dataFim, status: p.status }));
        const saldo = computeSaldo(periodo!.diasDireito, lite);
        const novos = diasInclusive(novaInicio, novaFim);
        if ((input.status ?? parcela.status) !== "cancelada" && saldo.disponiveis < novos) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Saldo insuficiente para a nova janela" });
        }
      }

      const novoStatus = input.status ?? parcela.status;

      return await db.transaction(async (tx) => {
        await tx.update(feriasParcelas).set({
          status: novoStatus,
          dataInicio: novaInicio,
          dataFim: novaFim,
          seiProtocolo: input.seiProtocolo === undefined ? parcela.seiProtocolo : input.seiProtocolo,
          observacoes: input.observacoes === undefined ? parcela.observacoes : input.observacoes,
          updatedAt: new Date(),
        }).where(eq(feriasParcelas.id, parcela.id));

        // cascade: linked afastamento
        if (parcela.afastamentoId != null) {
          const ativo = novoStatus !== "cancelada" && novoStatus !== "concluida";
          await tx.update(afastamentos)
            .set({ ativo, dataInicio: novaInicio, dataFim: novaFim, updatedAt: new Date() })
            .where(eq(afastamentos.id, parcela.afastamentoId));
        }

        // cascade: linked vida_funcional evento
        if (parcela.vidaFuncionalEventoId != null) {
          if (novoStatus === "cancelada") {
            await tx.update(vidaFuncionalEventos).set({ deletedAt: new Date() })
              .where(eq(vidaFuncionalEventos.id, parcela.vidaFuncionalEventoId));
          } else {
            await tx.update(vidaFuncionalEventos).set({
              status: statusEventoDeParcela(novoStatus),
              dataEvento: novaInicio, dataFim: novaFim, updatedAt: new Date(),
            }).where(eq(vidaFuncionalEventos.id, parcela.vidaFuncionalEventoId));
          }
        }
        return { ok: true };
      });
    }),

  removerParcela: protectedProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      const [parcela] = await db.select().from(feriasParcelas)
        .where(and(eq(feriasParcelas.id, input.id), isNull(feriasParcelas.deletedAt))).limit(1);
      if (!parcela) throw new TRPCError({ code: "NOT_FOUND", message: "Parcela não encontrada" });
      if (parcela.defensorId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN", message: "Só o titular altera suas férias" });

      return await db.transaction(async (tx) => {
        await tx.update(feriasParcelas).set({ deletedAt: new Date() }).where(eq(feriasParcelas.id, parcela.id));
        if (parcela.vidaFuncionalEventoId != null) {
          await tx.update(vidaFuncionalEventos).set({ deletedAt: new Date() }).where(eq(vidaFuncionalEventos.id, parcela.vidaFuncionalEventoId));
        }
        if (parcela.afastamentoId != null) {
          await tx.update(afastamentos).set({ ativo: false, updatedAt: new Date() }).where(eq(afastamentos.id, parcela.afastamentoId));
        }
        return { ok: true };
      });
    }),
});
```

- [ ] **Step 4: Register the router in `index.ts`**

Add the import alongside the other router imports:

```ts
import { feriasRouter } from "./ferias";
```

Add the entry inside the `appRouter` object (near `vidaFuncional` / `carreira`):

```ts
  ferias: feriasRouter,
```

- [ ] **Step 5: Run the structural test + typecheck**

Run: `npx vitest run src/lib/trpc/routers/__tests__/ferias-router.test.ts`
Expected: PASS.

Run: `npx tsc --noEmit`
Expected: no new errors from `ferias.ts`. If `db.transaction`'s `tx` type rejects an insert, confirm the import of `db` and that `vidaFuncionalEventos.dados` accepts the `{ feriasParcelaId }` shape (its column type is `jsonb $type<Record<string, unknown>>`).

- [ ] **Step 6: Commit**

```bash
git add src/lib/trpc/routers/ferias.ts src/lib/trpc/routers/index.ts src/lib/trpc/routers/__tests__/ferias-router.test.ts
git commit -m "feat(ferias): router (CRUD períodos/parcelas + cascata afastamento/evento, guards, transações)"
```

---

### Task 5: UI page

**Files:**
- Create: `src/app/(dashboard)/admin/ferias/page.tsx`
- Create: `src/app/(dashboard)/admin/ferias/_components/ferias-view.tsx`

**Interfaces:**
- Consumes: `trpc.ferias.listar` / `criarPeriodo` / `criarParcela` / `atualizarParcela` / `removerParcela`; `trpc.cobertura.colegasDisponiveis` (substituto picker); `feriasStatusInfo` (Task 3); `podeTransicionar` (Task 2); `CollapsiblePageHeader`; `StatusChip`, `EmptyState` from `@/components/ds`; tokens.
- Produces: default-exported `FeriasPage` at `/admin/ferias`.

- [ ] **Step 1: Write the page entry**

```tsx
// src/app/(dashboard)/admin/ferias/page.tsx
"use client";

import { FeriasView } from "./_components/ferias-view";

export default function FeriasPage() {
  return <FeriasView />;
}
```

- [ ] **Step 2: Write the view component**

```tsx
// src/app/(dashboard)/admin/ferias/_components/ferias-view.tsx
"use client";

import { useMemo, useState } from "react";
import { Plane, CalendarClock, PlayCircle, FolderOpen, Plus } from "lucide-react";
import { CollapsiblePageHeader } from "@/components/layouts/collapsible-page-header";
import { StatusChip, EmptyState } from "@/components/ds";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc/client";
import { CARD_STYLE, TYPO } from "@/lib/config/design-tokens";
import { feriasStatusInfo } from "@/lib/ferias/status-visual";
import { podeTransicionar } from "@/lib/ferias/transicoes";
import { cn } from "@/lib/utils";

function Kpi({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string | number }) {
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/[0.08]">
      <Icon className="w-4 h-4 text-white/70" />
      <div className="leading-tight">
        <div className="text-sm font-semibold text-white">{value}</div>
        <div className="text-[11px] text-white/60">{label}</div>
      </div>
    </div>
  );
}

const ACAO_LABEL: Record<string, string> = {
  homologada: "Homologar",
  em_fruicao: "Iniciar fruição",
  concluida: "Concluir",
  cancelada: "Cancelar",
};

export function FeriasView() {
  const utils = trpc.useUtils();
  const { data = [], isLoading } = trpc.ferias.listar.useQuery();
  const { data: colegas = [] } = trpc.cobertura.colegasDisponiveis.useQuery();

  const invalidate = () => utils.ferias.listar.invalidate();
  const criarPeriodo = trpc.ferias.criarPeriodo.useMutation({ onSuccess: invalidate });
  const criarParcela = trpc.ferias.criarParcela.useMutation({ onSuccess: invalidate });
  const atualizarParcela = trpc.ferias.atualizarParcela.useMutation({ onSuccess: invalidate });
  const removerParcela = trpc.ferias.removerParcela.useMutation({ onSuccess: invalidate });

  const [novoPeriodo, setNovoPeriodo] = useState(false);
  const [pAq, setPAq] = useState({ inicio: "", fim: "", dias: 30 });
  const [parcelaForm, setParcelaForm] = useState<Record<number, { inicio: string; fim: string; substitutoId: string; sei: string }>>({});

  const kpis = useMemo(() => {
    let disponiveis = 0, programadas = 0, emFruicao = 0, abertos = 0;
    for (const row of data) {
      disponiveis += row.saldo.disponiveis;
      if (row.saldo.disponiveis > 0) abertos += 1;
      for (const p of row.parcelas) {
        if (p.status === "programada") programadas += 1;
        if (p.status === "em_fruicao") emFruicao += 1;
      }
    }
    return { disponiveis, programadas, emFruicao, abertos };
  }, [data]);

  const stats = (
    <div className="flex flex-wrap items-center gap-2">
      <Kpi icon={Plane} label="Dias disponíveis" value={kpis.disponiveis} />
      <Kpi icon={CalendarClock} label="Parcelas programadas" value={kpis.programadas} />
      <Kpi icon={PlayCircle} label="Em fruição" value={kpis.emFruicao} />
      <Kpi icon={FolderOpen} label="Períodos abertos" value={kpis.abertos} />
    </div>
  );

  return (
    <CollapsiblePageHeader title="Férias" icon={Plane}>
      {stats}
      <div className="p-4 space-y-4">
        {/* Novo período */}
        <section className={cn(CARD_STYLE.base)}>
          <div className="flex items-center justify-between">
            <h2 className={TYPO.h3}>Períodos aquisitivos</h2>
            <Button size="sm" variant="outline" onClick={() => setNovoPeriodo((v) => !v)}>
              <Plus className="w-4 h-4 mr-1" /> Novo período
            </Button>
          </div>
          {novoPeriodo && (
            <div className="mt-3 flex flex-wrap items-end gap-2">
              <label className="text-xs">Início aquisitivo
                <input type="date" className="block border rounded px-2 py-1 text-sm" value={pAq.inicio} onChange={(e) => setPAq({ ...pAq, inicio: e.target.value })} />
              </label>
              <label className="text-xs">Fim aquisitivo
                <input type="date" className="block border rounded px-2 py-1 text-sm" value={pAq.fim} onChange={(e) => setPAq({ ...pAq, fim: e.target.value })} />
              </label>
              <label className="text-xs">Dias de direito
                <input type="number" className="block border rounded px-2 py-1 text-sm w-24" value={pAq.dias} onChange={(e) => setPAq({ ...pAq, dias: Number(e.target.value) })} />
              </label>
              <Button size="sm" disabled={!pAq.inicio || !pAq.fim || criarPeriodo.isPending}
                onClick={() => criarPeriodo.mutate({ aquisitivoInicio: pAq.inicio, aquisitivoFim: pAq.fim, diasDireito: pAq.dias }, { onSuccess: () => { setNovoPeriodo(false); setPAq({ inicio: "", fim: "", dias: 30 }); } })}>
                Salvar
              </Button>
            </div>
          )}
        </section>

        {/* Lista de períodos */}
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando…</p>
        ) : data.length === 0 ? (
          <EmptyState icon={Plane} title="Nenhum período de férias cadastrado" />
        ) : (
          data.map((row) => {
            const f = parcelaForm[row.periodo.id] ?? { inicio: "", fim: "", substitutoId: "", sei: "" };
            const set = (patch: Partial<typeof f>) => setParcelaForm((m) => ({ ...m, [row.periodo.id]: { ...f, ...patch } }));
            const pct = row.saldo.direito > 0 ? Math.max(0, Math.min(100, (row.saldo.disponiveis / row.saldo.direito) * 100)) : 0;
            return (
              <section key={row.periodo.id} className={cn(CARD_STYLE.base)}>
                <div className="flex items-center justify-between">
                  <h3 className={TYPO.h3}>
                    Aquisitivo {row.periodo.aquisitivoInicio} – {row.periodo.aquisitivoFim}
                  </h3>
                  <span className="text-[11px] text-muted-foreground">
                    {row.saldo.disponiveis}/{row.saldo.direito} dias disponíveis
                  </span>
                </div>
                <div className="mt-2 h-1.5 rounded-full bg-neutral-100 overflow-hidden">
                  <div className="h-full bg-emerald-500" style={{ width: `${pct}%` }} />
                </div>

                {/* Parcelas */}
                <ul className="mt-3 divide-y divide-neutral-100">
                  {row.parcelas.length === 0 ? (
                    <li className="py-2"><EmptyState icon={CalendarClock} title="Sem parcelas" size="sm" /></li>
                  ) : row.parcelas.map((p) => (
                    <li key={p.id} className="flex items-center justify-between py-2 gap-2">
                      <div className="min-w-0">
                        <div className="text-sm font-medium truncate">
                          {p.ordem}ª parcela · {p.dataInicio} – {p.dataFim} ({p.dias}d)
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                          {p.substitutoNome ? `Substituto: ${p.substitutoNome}` : "Sem substituto"}{p.seiProtocolo ? ` · SEI ${p.seiProtocolo}` : ""}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <StatusChip info={feriasStatusInfo(p.status)} />
                        {(["homologada", "em_fruicao", "concluida", "cancelada"] as const)
                          .filter((s) => podeTransicionar(p.status, s))
                          .map((s) => (
                            <Button key={s} size="sm" variant="ghost" className="h-7 px-2 text-[11px]"
                              disabled={atualizarParcela.isPending}
                              onClick={() => atualizarParcela.mutate({ id: p.id, status: s })}>
                              {ACAO_LABEL[s]}
                            </Button>
                          ))}
                        <Button size="sm" variant="ghost" className="h-7 px-2 text-[11px] text-rose-600"
                          disabled={removerParcela.isPending}
                          onClick={() => removerParcela.mutate({ id: p.id })}>
                          Excluir
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>

                {/* Nova parcela */}
                <div className="mt-3 flex flex-wrap items-end gap-2 border-t border-neutral-100 pt-3">
                  <label className="text-xs">Início
                    <input type="date" className="block border rounded px-2 py-1 text-sm" value={f.inicio} onChange={(e) => set({ inicio: e.target.value })} />
                  </label>
                  <label className="text-xs">Fim
                    <input type="date" className="block border rounded px-2 py-1 text-sm" value={f.fim} onChange={(e) => set({ fim: e.target.value })} />
                  </label>
                  <label className="text-xs">Substituto
                    <select className="block border rounded px-2 py-1 text-sm" value={f.substitutoId} onChange={(e) => set({ substitutoId: e.target.value })}>
                      <option value="">— nenhum —</option>
                      {colegas.map((c: { id: number; name: string | null }) => (
                        <option key={c.id} value={c.id}>{c.name ?? `#${c.id}`}</option>
                      ))}
                    </select>
                  </label>
                  <label className="text-xs">SEI
                    <input type="text" className="block border rounded px-2 py-1 text-sm w-28" value={f.sei} onChange={(e) => set({ sei: e.target.value })} />
                  </label>
                  <Button size="sm" disabled={!f.inicio || !f.fim || criarParcela.isPending}
                    onClick={() => criarParcela.mutate({
                      periodoId: row.periodo.id,
                      dataInicio: f.inicio,
                      dataFim: f.fim,
                      substitutoId: f.substitutoId ? Number(f.substitutoId) : null,
                      seiProtocolo: f.sei || null,
                    }, { onSuccess: () => set({ inicio: "", fim: "", substitutoId: "", sei: "" }) })}>
                    Adicionar parcela
                  </Button>
                </div>
                {(criarParcela.error || atualizarParcela.error) && (
                  <p className="mt-2 text-[11px] text-rose-600">{criarParcela.error?.message ?? atualizarParcela.error?.message}</p>
                )}
              </section>
            );
          })
        )}
      </div>
    </CollapsiblePageHeader>
  );
}
```

- [ ] **Step 3: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: no new errors from `ferias-view.tsx`. If `colegasDisponiveis` returns a different field than `name`, or `StatusChip`/`EmptyState`/`Button` props differ, read the source and adjust (do not invent props). `CARD_STYLE.base` already includes `p-4` — do not double it.

- [ ] **Step 4: Run the full férias suite**

Run: `npx vitest run src/lib/ferias src/lib/db/schema/__tests__/ferias-schema.test.ts src/lib/trpc/routers/__tests__/ferias-router.test.ts`
Expected: PASS (all pure-logic + schema + structural tests).

- [ ] **Step 5: Commit**

```bash
git add "src/app/(dashboard)/admin/ferias/page.tsx" "src/app/(dashboard)/admin/ferias/_components/ferias-view.tsx"
git commit -m "feat(ferias): página de Férias (períodos, saldo, parcelas, transições, substituto)"
```

---

### Task 6: Manual smoke check

**Files:** none (verification only).

- [ ] **Step 1: Ensure the migration is applied**

In an environment with a DB: `npm run db:push` (applies the Task 1 migration). Expected: `ferias_periodos` and `ferias_parcelas` created.

- [ ] **Step 2: Start the dev server**

Run: `npm run dev:turbo`
Expected: boots without "Export … doesn't exist" errors.

- [ ] **Step 3: Exercise the lifecycle**

Open `http://localhost:3000/admin/ferias`. Create a período (30 dias). Add a parcela of 10 days with a substituto. Expected: parcela appears as "Programada"; saldo drops to 20. Click "Homologar" → "Iniciar fruição" → "Concluir"; confirm only valid transitions are offered at each step.

- [ ] **Step 4: Confirm the hub integration**

Open `/admin/carreira` (as the same defensor). Expected: the "Férias agendadas" KPI and the trajetória reflect the new parcela (via the projected vida_funcional evento). Open `/admin/carreira` as an admin → the cobertura rollup shows the auto-created afastamento for the parcela that had a substituto.

- [ ] **Step 5: Confirm saldo + transition guards**

Try adding a parcela longer than the remaining saldo → expect the inline error "Saldo insuficiente". Confirmed guards working.

---

## Self-Review

**Spec coverage:**
- §4 two tables + barrel + migration → Task 1. ✓
- §5 pure logic (saldo, transições, projeção, status-visual) → Tasks 2, 3. ✓
- §6 router (listar scoped, CRUD períodos/parcelas, transactions, afastamento+evento cascade, saldo guard, self-coverage, transitions, diasDireito guard) → Task 4. ✓
- §3 privacy (scope reads, titular writes) → Task 4, guarded by structural test. ✓
- §7 UI (período cards + saldo bar + parcela rows + status chips via feriasStatusInfo + allowed-only actions + forms incl. seiProtocolo + substituto picker + loading guards) → Task 5. ✓
- §8 testing (pure modules, boundaries, transitions, status-visual, structural router) → Tasks 2,3,4. ✓
- §9 out-of-scope respected: no carreira changes; no abono/GCal/entitlement/approval. ✓
- Dual-source note: accepted limitation (documented in spec; nothing to build). ✓

**Placeholder scan:** no TBDs; every code step shows full code. The "if a prop differs, read the source" notes (Task 5) are defensive checks against unverified third-party prop names, not placeholders for this task's own logic.

**Type consistency:** `ParcelaLite`/`Saldo` defined in Task 2 and imported by Task 4; `podeTransicionar` Task 2 → Task 4 & Task 5; `projecaoEventoDeParcela`/`statusEventoDeParcela` Task 3 → Task 4; `feriasStatusInfo` Task 3 → Task 5; schema tables Task 1 → Task 4. The `listar` return shape (periodo/saldo/parcelas with `ordem`, `dias`, `substitutoNome`) defined in Task 4 and consumed verbatim in Task 5. Status string literals match the `ferias_status` enum throughout.
