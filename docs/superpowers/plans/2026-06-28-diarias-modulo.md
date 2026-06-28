# Módulo Diárias Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A dedicated Diárias module — one table, a payment lifecycle, trip details, quantidade × valor unitário = total, SEI — projecting a `vida_funcional_eventos` row so the Carreira Hub's contraprestação cluster (counts + valores) lights up with no carreira changes.

**Architecture:** One Drizzle table (`diarias`). Pure logic in `src/lib/diarias/` (calculo, transições, projeção, status-visual) — unit-tested. A `diarias` tRPC router fetches rows and on create/update/remove runs a `db.transaction()` that projects/cascades a linked `vida_funcional_eventos` row. One client page + a sidebar nav entry.

**Tech Stack:** Next.js 15 (App Router, client components), tRPC, Drizzle ORM (Postgres), Tailwind + Padrão Defender v5 tokens, vitest.

## Global Constraints

- **Privacy:** reads use `getVidaFuncionalScope(ctx.user)`; writes restricted to titular (`FORBIDDEN` if `defensorId !== ctx.user.id`). Selects-first then `NOT_FOUND` then `FORBIDDEN`.
- **Money:** `valorUnitarioCents` integer cents (bigint mode:number). `quantidade` is `numeric(5,1)` — Drizzle returns it as a **string**; parse with `Number(...)` at the boundary, store with `String(...)`. `totalCents` is **computed, never stored** = `Math.round(quantidade × valorUnitarioCents)`.
- **Projection:** each diária projects a `vida_funcional_eventos` row (`tipo:"DIARIA"`, `cluster:"contraprestacao"`, `valorCents = totalCents`, `origem:"manual"`); on cancel/remove the evento is soft-deleted. The router (not the pure fn) adds `origem:"manual"`. NO carreira changes.
- **Status:** diária lifecycle `a_requerer → requerida → autorizada → paga` (+ `cancelada`); transitions gated by `podeTransicionar`. Projected event status via `statusEventoDeDiaria` (`a_requerer→previsto`, `requerida→pendente`, `autorizada→em_curso`, `paga→concluido`) — all valid `vfStatusEnum` values.
- **No afastamento cascade** (diárias ≠ cobertura).
- **Transactions:** `criar`, `atualizar`, `remover` wrap their multi-table writes in `db.transaction(async (tx) => …)`.
- **Soft-delete:** every read filters `isNull(deletedAt)`.
- **Dates:** `YYYY-MM-DD` strings, lexicographic compare, no date-fns.
- **Status chips:** diárias-local `diariaStatusInfo`; never the audiência / carreira / férias resolver.
- **Module pattern** mirrors Férias.

---

### Task 1: Schema + migration

**Files:**
- Create: `src/lib/db/schema/diarias.ts`
- Modify: `src/lib/db/schema/index.ts` (append one export)
- Create: `drizzle/0059_diarias_modulo.sql`
- Test: `src/lib/db/schema/__tests__/diarias-schema.test.ts`

**Interfaces:**
- Consumes: `users` from `./core`.
- Produces: `diariaStatusEnum`, `diarias`, types `Diaria`/`InsertDiaria`. Enum values: `["a_requerer","requerida","autorizada","paga","cancelada"]`.

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/db/schema/__tests__/diarias-schema.test.ts
import { describe, it, expect } from "vitest";
import { diarias, diariaStatusEnum } from "@/lib/db/schema";

describe("diarias schema", () => {
  it("exports the table and status enum from the barrel", () => {
    expect(diarias).toBeDefined();
    expect(diariaStatusEnum.enumValues).toEqual([
      "a_requerer", "requerida", "autorizada", "paga", "cancelada",
    ]);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/lib/db/schema/__tests__/diarias-schema.test.ts`
Expected: FAIL — `diarias` not exported.

- [ ] **Step 3: Write the schema**

```ts
// src/lib/db/schema/diarias.ts
import { pgTable, pgEnum, serial, integer, text, date, numeric, bigint, timestamp, index } from "drizzle-orm/pg-core";
import { users } from "./core";

export const diariaStatusEnum = pgEnum("diaria_status", [
  "a_requerer", "requerida", "autorizada", "paga", "cancelada",
]);

export const diarias = pgTable("diarias", {
  id: serial("id").primaryKey(),
  defensorId: integer("defensor_id").references(() => users.id).notNull(),
  destino: text("destino").notNull(),
  origem: text("origem"),
  motivo: text("motivo"),
  dataInicio: date("data_inicio").notNull(),
  dataFim: date("data_fim").notNull(),
  quantidade: numeric("quantidade", { precision: 5, scale: 1 }).notNull(),
  valorUnitarioCents: bigint("valor_unitario_cents", { mode: "number" }).notNull(),
  status: diariaStatusEnum("status").default("a_requerer").notNull(),
  seiProtocolo: text("sei_protocolo"),
  vidaFuncionalEventoId: integer("vida_funcional_evento_id"),
  observacoes: text("observacoes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  deletedAt: timestamp("deleted_at"),
}, (table) => [
  index("diarias_defensor_status_deleted_idx").on(table.defensorId, table.status, table.deletedAt),
  index("diarias_defensor_data_idx").on(table.defensorId, table.dataInicio),
]);

export type Diaria = typeof diarias.$inferSelect;
export type InsertDiaria = typeof diarias.$inferInsert;
```

- [ ] **Step 4: Register in the schema barrel**

Append to `src/lib/db/schema/index.ts` (after the last `export * from`):

```ts
export * from "./diarias";
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx vitest run src/lib/db/schema/__tests__/diarias-schema.test.ts`
Expected: PASS.

- [ ] **Step 6: Write the scoped migration**

Do NOT run `npm run db:generate` and commit its output (it produces a huge drift-capture migration because `drizzle/meta/` is gitignored — see the Férias `0058` lesson). Hand-write the scoped idempotent migration:

```sql
-- drizzle/0059_diarias_modulo.sql
-- Módulo Diárias: enum + tabela diarias (idempotente).
DO $$ BEGIN
  CREATE TYPE "public"."diaria_status" AS ENUM('a_requerer', 'requerida', 'autorizada', 'paga', 'cancelada');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "diarias" (
	"id" serial PRIMARY KEY NOT NULL,
	"defensor_id" integer NOT NULL,
	"destino" text NOT NULL,
	"origem" text,
	"motivo" text,
	"data_inicio" date NOT NULL,
	"data_fim" date NOT NULL,
	"quantidade" numeric(5, 1) NOT NULL,
	"valor_unitario_cents" bigint NOT NULL,
	"status" "diaria_status" DEFAULT 'a_requerer' NOT NULL,
	"sei_protocolo" text,
	"vida_funcional_evento_id" integer,
	"observacoes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "diarias" ADD CONSTRAINT "diarias_defensor_id_users_id_fk" FOREIGN KEY ("defensor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "diarias_defensor_status_deleted_idx" ON "diarias" USING btree ("defensor_id","status","deleted_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "diarias_defensor_data_idx" ON "diarias" USING btree ("defensor_id","data_inicio");
```

(Applying it — `npm run db:push` — needs a live DB; run that where one exists. The SQL is idempotent so re-runs are safe.)

- [ ] **Step 7: Commit**

```bash
git add src/lib/db/schema/diarias.ts src/lib/db/schema/index.ts src/lib/db/schema/__tests__/diarias-schema.test.ts drizzle/0059_diarias_modulo.sql
git commit -m "feat(diarias): schema diarias + migration escopada (0059)"
```

---

### Task 2: Cálculo + transições (pure)

**Files:**
- Create: `src/lib/diarias/calculo.ts`
- Create: `src/lib/diarias/transicoes.ts`
- Test: `src/lib/diarias/__tests__/calculo.test.ts`
- Test: `src/lib/diarias/__tests__/transicoes.test.ts`

**Interfaces:**
- Consumes: nothing (pure).
- Produces:
  - `function totalCents(quantidade: number, valorUnitarioCents: number): number`
  - `type DiariaStatus = "a_requerer"|"requerida"|"autorizada"|"paga"|"cancelada"`
  - `const TRANSICOES: Record<DiariaStatus, DiariaStatus[]>`
  - `function podeTransicionar(de: string, para: string): boolean`

- [ ] **Step 1: Write the failing tests**

```ts
// src/lib/diarias/__tests__/calculo.test.ts
import { describe, it, expect } from "vitest";
import { totalCents } from "../calculo";

describe("totalCents", () => {
  it("multiplies quantidade by unit cents", () => {
    expect(totalCents(1, 10000)).toBe(10000);
    expect(totalCents(2, 15000)).toBe(30000);
  });
  it("supports meia-diária", () => {
    expect(totalCents(1.5, 15000)).toBe(22500);
    expect(totalCents(2.5, 12345)).toBe(30863); // 30862.5 → round
  });
  it("is zero when quantidade is zero", () => {
    expect(totalCents(0, 15000)).toBe(0);
  });
});
```

```ts
// src/lib/diarias/__tests__/transicoes.test.ts
import { describe, it, expect } from "vitest";
import { podeTransicionar } from "../transicoes";

describe("podeTransicionar", () => {
  it("allows the valid edges", () => {
    expect(podeTransicionar("a_requerer", "requerida")).toBe(true);
    expect(podeTransicionar("requerida", "autorizada")).toBe(true);
    expect(podeTransicionar("autorizada", "paga")).toBe(true);
    expect(podeTransicionar("a_requerer", "cancelada")).toBe(true);
    expect(podeTransicionar("autorizada", "cancelada")).toBe(true);
  });
  it("rejects invalid edges and terminals", () => {
    expect(podeTransicionar("a_requerer", "paga")).toBe(false);
    expect(podeTransicionar("requerida", "paga")).toBe(false);
    expect(podeTransicionar("paga", "cancelada")).toBe(false);
    expect(podeTransicionar("cancelada", "a_requerer")).toBe(false);
  });
  it("rejects unknown statuses", () => {
    expect(podeTransicionar("foo", "bar")).toBe(false);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/lib/diarias/__tests__/calculo.test.ts src/lib/diarias/__tests__/transicoes.test.ts`
Expected: FAIL — modules not found.

- [ ] **Step 3: Write the implementations**

```ts
// src/lib/diarias/calculo.ts
/** Valor total em centavos = quantidade (pode ser meia-diária) × valor unitário. */
export function totalCents(quantidade: number, valorUnitarioCents: number): number {
  return Math.round(quantidade * valorUnitarioCents);
}
```

```ts
// src/lib/diarias/transicoes.ts
export type DiariaStatus = "a_requerer" | "requerida" | "autorizada" | "paga" | "cancelada";

export const TRANSICOES: Record<DiariaStatus, DiariaStatus[]> = {
  a_requerer: ["requerida", "cancelada"],
  requerida: ["autorizada", "cancelada"],
  autorizada: ["paga", "cancelada"],
  paga: [],
  cancelada: [],
};

export function podeTransicionar(de: string, para: string): boolean {
  const allowed = TRANSICOES[de as DiariaStatus];
  return Array.isArray(allowed) && allowed.includes(para as DiariaStatus);
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/lib/diarias/__tests__/calculo.test.ts src/lib/diarias/__tests__/transicoes.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/diarias/calculo.ts src/lib/diarias/transicoes.ts src/lib/diarias/__tests__/calculo.test.ts src/lib/diarias/__tests__/transicoes.test.ts
git commit -m "feat(diarias): cálculo de total + máquina de transições (puro)"
```

---

### Task 3: Projeção + status visual (pure)

**Files:**
- Create: `src/lib/diarias/projecao.ts`
- Create: `src/lib/diarias/status-visual.ts`
- Test: `src/lib/diarias/__tests__/projecao.test.ts`
- Test: `src/lib/diarias/__tests__/status-visual.test.ts`

**Interfaces:**
- Consumes: `VisualTipo` from `@/lib/config/tipologia` (shape `{ label: string; badge: string; dot: string }`).
- Produces:
  - `function statusEventoDeDiaria(status: string): "previsto"|"pendente"|"em_curso"|"concluido"`
  - `function tituloDiaria(input: { destino: string; dataInicio: string }): string`
  - `type ProjecaoDiariaEvento = { tipo: "DIARIA"; cluster: "contraprestacao"; titulo: string; dataEvento: string; dataFim: string; status: "previsto"|"pendente"|"em_curso"|"concluido"; valorCents: number; dados: { diariaId: number | null } }`
  - `function projecaoEventoDeDiaria(diaria: { id: number | null; destino: string; dataInicio: string; dataFim: string; status: string }, totalCents: number): ProjecaoDiariaEvento`
  - `function diariaStatusInfo(status?: string | null): VisualTipo`

- [ ] **Step 1: Write the failing tests**

```ts
// src/lib/diarias/__tests__/projecao.test.ts
import { describe, it, expect } from "vitest";
import { statusEventoDeDiaria, tituloDiaria, projecaoEventoDeDiaria } from "../projecao";

describe("statusEventoDeDiaria", () => {
  it("maps diária status to vida_funcional event status", () => {
    expect(statusEventoDeDiaria("a_requerer")).toBe("previsto");
    expect(statusEventoDeDiaria("requerida")).toBe("pendente");
    expect(statusEventoDeDiaria("autorizada")).toBe("em_curso");
    expect(statusEventoDeDiaria("paga")).toBe("concluido");
  });
});

describe("tituloDiaria", () => {
  it("formats destino + data", () => {
    expect(tituloDiaria({ destino: "Salvador", dataInicio: "2026-07-01" }))
      .toBe("Diária — Salvador (2026-07-01)");
  });
});

describe("projecaoEventoDeDiaria", () => {
  it("builds the vida_funcional projection with valorCents = total", () => {
    const proj = projecaoEventoDeDiaria(
      { id: 5, destino: "Salvador", dataInicio: "2026-07-01", dataFim: "2026-07-02", status: "autorizada" },
      22500,
    );
    expect(proj).toEqual({
      tipo: "DIARIA", cluster: "contraprestacao", titulo: "Diária — Salvador (2026-07-01)",
      dataEvento: "2026-07-01", dataFim: "2026-07-02", status: "em_curso",
      valorCents: 22500, dados: { diariaId: 5 },
    });
  });
  it("accepts a null id (creation, before backfill)", () => {
    const proj = projecaoEventoDeDiaria(
      { id: null, destino: "X", dataInicio: "2026-07-01", dataFim: "2026-07-01", status: "a_requerer" }, 0,
    );
    expect(proj.dados.diariaId).toBeNull();
    expect(proj.status).toBe("previsto");
  });
});
```

```ts
// src/lib/diarias/__tests__/status-visual.test.ts
import { describe, it, expect } from "vitest";
import { diariaStatusInfo } from "../status-visual";

describe("diariaStatusInfo", () => {
  it("labels every status (no audiência fallback)", () => {
    expect(diariaStatusInfo("a_requerer").label).toBe("A requerer");
    expect(diariaStatusInfo("requerida").label).toBe("Requerida");
    expect(diariaStatusInfo("autorizada").label).toBe("Autorizada");
    expect(diariaStatusInfo("paga").label).toBe("Paga");
    expect(diariaStatusInfo("cancelada").label).toBe("Cancelada");
  });
  it("returns badge + dot for every known status", () => {
    for (const s of ["a_requerer","requerida","autorizada","paga","cancelada"]) {
      const r = diariaStatusInfo(s);
      expect(r.badge.length).toBeGreaterThan(0);
      expect(r.dot.length).toBeGreaterThan(0);
    }
  });
  it("neutral fallback echoes unknown status", () => {
    expect(diariaStatusInfo("xpto").label).toBe("xpto");
    expect(diariaStatusInfo("xpto").badge).toContain("neutral");
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/lib/diarias/__tests__/projecao.test.ts src/lib/diarias/__tests__/status-visual.test.ts`
Expected: FAIL — modules not found.

- [ ] **Step 3: Write the implementations**

```ts
// src/lib/diarias/projecao.ts
export function statusEventoDeDiaria(status: string): "previsto" | "pendente" | "em_curso" | "concluido" {
  if (status === "requerida") return "pendente";
  if (status === "autorizada") return "em_curso";
  if (status === "paga") return "concluido";
  return "previsto"; // a_requerer
}

export function tituloDiaria(input: { destino: string; dataInicio: string }): string {
  return `Diária — ${input.destino} (${input.dataInicio})`;
}

export type ProjecaoDiariaEvento = {
  tipo: "DIARIA";
  cluster: "contraprestacao";
  titulo: string;
  dataEvento: string;
  dataFim: string;
  status: "previsto" | "pendente" | "em_curso" | "concluido";
  valorCents: number;
  dados: { diariaId: number | null };
};

export function projecaoEventoDeDiaria(
  diaria: { id: number | null; destino: string; dataInicio: string; dataFim: string; status: string },
  totalCents: number,
): ProjecaoDiariaEvento {
  return {
    tipo: "DIARIA",
    cluster: "contraprestacao",
    titulo: tituloDiaria({ destino: diaria.destino, dataInicio: diaria.dataInicio }),
    dataEvento: diaria.dataInicio,
    dataFim: diaria.dataFim,
    status: statusEventoDeDiaria(diaria.status),
    valorCents: totalCents,
    dados: { diariaId: diaria.id },
  };
}
```

```ts
// src/lib/diarias/status-visual.ts
import type { VisualTipo } from "@/lib/config/tipologia";

const NEUTRAL = { badge: "bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400", dot: "bg-neutral-400" };
const SKY = { badge: "bg-sky-50 text-sky-700 dark:bg-sky-950/30 dark:text-sky-400", dot: "bg-sky-500" };
const AMBER = { badge: "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400", dot: "bg-amber-500" };
const EMERALD = { badge: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400", dot: "bg-emerald-500" };
const ROSE = { badge: "bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-400", dot: "bg-rose-500" };

const MAP: Record<string, VisualTipo> = {
  a_requerer: { label: "A requerer", ...NEUTRAL },
  requerida: { label: "Requerida", ...SKY },
  autorizada: { label: "Autorizada", ...AMBER },
  paga: { label: "Paga", ...EMERALD },
  cancelada: { label: "Cancelada", ...ROSE },
};

/** Resolve um status de diária para VisualTipo (use via <StatusChip info={...} />). */
export function diariaStatusInfo(status?: string | null): VisualTipo {
  const k = (status ?? "").trim().toLowerCase();
  return MAP[k] ?? { label: status ?? "—", ...NEUTRAL };
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/lib/diarias/__tests__/projecao.test.ts src/lib/diarias/__tests__/status-visual.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/diarias/projecao.ts src/lib/diarias/status-visual.ts src/lib/diarias/__tests__/projecao.test.ts src/lib/diarias/__tests__/status-visual.test.ts
git commit -m "feat(diarias): projeção p/ vida_funcional + resolver de status visual"
```

---

### Task 4: `diarias` tRPC router + registration

**Files:**
- Create: `src/lib/trpc/routers/diarias.ts`
- Modify: `src/lib/trpc/routers/index.ts` (import + register `diarias: diariasRouter`)
- Test: `src/lib/trpc/routers/__tests__/diarias-router.test.ts`

**Interfaces:**
- Consumes: Task 1 `diarias` + `vidaFuncionalEventos` (schema); Task 2 (`totalCents`, `podeTransicionar`); Task 3 (`projecaoEventoDeDiaria`, `statusEventoDeDiaria`, `tituloDiaria`); `getVidaFuncionalScope`.
- Produces: `diariasRouter` with `listar`/`criar`/`atualizar`/`remover`. Registered as `appRouter.diarias`. `listar` returns rows with `quantidade: number` and `totalCents: number` added.

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/trpc/routers/__tests__/diarias-router.test.ts
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it, expect } from "vitest";

const ROUTERS = join(process.cwd(), "src/lib/trpc/routers");
const read = (rel: string) => readFileSync(join(ROUTERS, rel), "utf8");

describe("diarias router — contract", () => {
  const src = read("diarias.ts");

  it("scopes reads with getVidaFuncionalScope", () => {
    expect(src).toContain("getVidaFuncionalScope");
  });
  it("filters soft-deleted rows", () => {
    expect(src).toMatch(/isNull\([^)]*deletedAt\)/);
  });
  it("guards titular-only writes", () => {
    expect(src).toContain("FORBIDDEN");
  });
  it("guards NOT_FOUND before FORBIDDEN", () => {
    expect(src).toContain("NOT_FOUND");
  });
  it("gates status changes via podeTransicionar", () => {
    expect(src).toContain("podeTransicionar");
  });
  it("wraps writes in a transaction", () => {
    expect(src).toContain("db.transaction");
  });
  it("projects to vida_funcional with origem manual", () => {
    expect(src).toContain("projecaoEventoDeDiaria");
    expect(src).toMatch(/origem:\s*["']manual["']/);
  });
  it("does NOT reference afastamentos", () => {
    expect(src).not.toContain("afastamentos");
  });
  it("is registered in the appRouter", () => {
    const index = read("index.ts");
    expect(index).toContain("diariasRouter");
    expect(index).toMatch(/diarias:\s*diariasRouter/);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/lib/trpc/routers/__tests__/diarias-router.test.ts`
Expected: FAIL — `diarias.ts` does not exist.

- [ ] **Step 3: Write the router**

```ts
// src/lib/trpc/routers/diarias.ts
import { z } from "zod";
import { and, asc, eq, inArray, isNull } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../init";
import { db } from "@/lib/db";
import { diarias, vidaFuncionalEventos } from "@/lib/db/schema";
import { getVidaFuncionalScope } from "../vida-funcional-scope";
import { totalCents as calcTotal } from "@/lib/diarias/calculo";
import { podeTransicionar } from "@/lib/diarias/transicoes";
import { projecaoEventoDeDiaria, statusEventoDeDiaria, tituloDiaria } from "@/lib/diarias/projecao";

const ISO = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "data inválida (AAAA-MM-DD)");

const baseFields = {
  destino: z.string().min(1),
  origem: z.string().nullable().optional(),
  motivo: z.string().nullable().optional(),
  dataInicio: ISO,
  dataFim: ISO,
  quantidade: z.number().positive(),
  valorUnitarioCents: z.number().int().min(0),
  seiProtocolo: z.string().nullable().optional(),
  observacoes: z.string().nullable().optional(),
};

const STATUS = z.enum(["a_requerer", "requerida", "autorizada", "paga", "cancelada"]);

const updateInput = z.object(baseFields).partial().extend({
  id: z.number().int(),
  status: STATUS.optional(),
});

export const diariasRouter = router({
  listar: protectedProcedure.query(async ({ ctx }) => {
    const scope = getVidaFuncionalScope(ctx.user);
    const rows = await db
      .select()
      .from(diarias)
      .where(and(isNull(diarias.deletedAt), inArray(diarias.defensorId, scope)))
      .orderBy(asc(diarias.dataInicio));
    return rows.map((d) => {
      const quantidade = Number(d.quantidade);
      return { ...d, quantidade, totalCents: calcTotal(quantidade, d.valorUnitarioCents) };
    });
  }),

  criar: protectedProcedure.input(z.object(baseFields)).mutation(async ({ ctx, input }) => {
    if (input.dataFim < input.dataInicio) throw new TRPCError({ code: "BAD_REQUEST", message: "dataFim anterior a dataInicio" });
    const total = calcTotal(input.quantidade, input.valorUnitarioCents);

    return await db.transaction(async (tx) => {
      const proj = projecaoEventoDeDiaria(
        { id: null, destino: input.destino, dataInicio: input.dataInicio, dataFim: input.dataFim, status: "a_requerer" },
        total,
      );
      const [evento] = await tx.insert(vidaFuncionalEventos).values({
        defensorId: ctx.user.id,
        tipo: proj.tipo, cluster: proj.cluster, titulo: proj.titulo,
        dataEvento: proj.dataEvento, dataFim: proj.dataFim, status: proj.status,
        valorCents: proj.valorCents, origem: "manual", dados: { diariaId: null },
      }).returning({ id: vidaFuncionalEventos.id });

      const [d] = await tx.insert(diarias).values({
        defensorId: ctx.user.id,
        destino: input.destino,
        origem: input.origem ?? null,
        motivo: input.motivo ?? null,
        dataInicio: input.dataInicio,
        dataFim: input.dataFim,
        quantidade: String(input.quantidade),
        valorUnitarioCents: input.valorUnitarioCents,
        status: "a_requerer",
        seiProtocolo: input.seiProtocolo ?? null,
        vidaFuncionalEventoId: evento.id,
        observacoes: input.observacoes ?? null,
      }).returning();

      await tx.update(vidaFuncionalEventos).set({ dados: { diariaId: d.id } }).where(eq(vidaFuncionalEventos.id, evento.id));
      return d;
    });
  }),

  atualizar: protectedProcedure.input(updateInput).mutation(async ({ ctx, input }) => {
    const [d] = await db.select().from(diarias)
      .where(and(eq(diarias.id, input.id), isNull(diarias.deletedAt))).limit(1);
    if (!d) throw new TRPCError({ code: "NOT_FOUND", message: "Diária não encontrada" });
    if (d.defensorId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN", message: "Só o titular altera suas diárias" });

    if (input.status && input.status !== d.status && !podeTransicionar(d.status, input.status)) {
      throw new TRPCError({ code: "BAD_REQUEST", message: `Transição inválida: ${d.status} → ${input.status}` });
    }

    const novaInicio = input.dataInicio ?? d.dataInicio;
    const novaFim = input.dataFim ?? d.dataFim;
    if (novaFim < novaInicio) throw new TRPCError({ code: "BAD_REQUEST", message: "dataFim anterior a dataInicio" });

    const novaQtd = input.quantidade ?? Number(d.quantidade);
    const novoValorUnit = input.valorUnitarioCents ?? d.valorUnitarioCents;
    const novoStatus = input.status ?? d.status;
    const novoDestino = input.destino ?? d.destino;
    const total = calcTotal(novaQtd, novoValorUnit);

    return await db.transaction(async (tx) => {
      await tx.update(diarias).set({
        destino: novoDestino,
        origem: input.origem === undefined ? d.origem : input.origem,
        motivo: input.motivo === undefined ? d.motivo : input.motivo,
        dataInicio: novaInicio,
        dataFim: novaFim,
        quantidade: String(novaQtd),
        valorUnitarioCents: novoValorUnit,
        status: novoStatus,
        seiProtocolo: input.seiProtocolo === undefined ? d.seiProtocolo : input.seiProtocolo,
        observacoes: input.observacoes === undefined ? d.observacoes : input.observacoes,
        updatedAt: new Date(),
      }).where(eq(diarias.id, d.id));

      if (d.vidaFuncionalEventoId != null) {
        if (novoStatus === "cancelada") {
          await tx.update(vidaFuncionalEventos).set({ deletedAt: new Date() }).where(eq(vidaFuncionalEventos.id, d.vidaFuncionalEventoId));
        } else {
          await tx.update(vidaFuncionalEventos).set({
            status: statusEventoDeDiaria(novoStatus),
            dataEvento: novaInicio, dataFim: novaFim,
            valorCents: total,
            titulo: tituloDiaria({ destino: novoDestino, dataInicio: novaInicio }),
            updatedAt: new Date(),
          }).where(eq(vidaFuncionalEventos.id, d.vidaFuncionalEventoId));
        }
      }
      return { ok: true };
    });
  }),

  remover: protectedProcedure.input(z.object({ id: z.number().int() })).mutation(async ({ ctx, input }) => {
    const [d] = await db.select().from(diarias)
      .where(and(eq(diarias.id, input.id), isNull(diarias.deletedAt))).limit(1);
    if (!d) throw new TRPCError({ code: "NOT_FOUND", message: "Diária não encontrada" });
    if (d.defensorId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN", message: "Só o titular altera suas diárias" });

    return await db.transaction(async (tx) => {
      await tx.update(diarias).set({ deletedAt: new Date() }).where(eq(diarias.id, d.id));
      if (d.vidaFuncionalEventoId != null) {
        await tx.update(vidaFuncionalEventos).set({ deletedAt: new Date() }).where(eq(vidaFuncionalEventos.id, d.vidaFuncionalEventoId));
      }
      return { ok: true };
    });
  }),
});
```

- [ ] **Step 4: Register the router in `index.ts`**

Add the import alongside the other router imports (near `feriasRouter`):

```ts
import { diariasRouter } from "./diarias";
```

Add the entry inside the `appRouter` object (near `ferias: feriasRouter`):

```ts
  diarias: diariasRouter,
```

- [ ] **Step 5: Run the structural test + typecheck**

Run: `npx vitest run src/lib/trpc/routers/__tests__/diarias-router.test.ts`
Expected: PASS.

Run: `npx tsc --noEmit`
Expected: no new errors from `diarias.ts`. Confirm `vidaFuncionalEventos.dados` accepts `{ diariaId }` (jsonb `$type<Record<string, unknown>>`) and `quantidade` is set with a string (`String(...)`) since the column is `numeric`.

- [ ] **Step 6: Commit**

```bash
git add src/lib/trpc/routers/diarias.ts src/lib/trpc/routers/index.ts src/lib/trpc/routers/__tests__/diarias-router.test.ts
git commit -m "feat(diarias): router (CRUD + projeção/cascata vida_funcional, guards, transações)"
```

---

### Task 5: UI page + nav entry

**Files:**
- Create: `src/app/(dashboard)/admin/diarias/page.tsx`
- Create: `src/app/(dashboard)/admin/diarias/_components/diarias-view.tsx`
- Modify: `src/components/layouts/admin-sidebar.tsx` (add a Diárias nav item to `CARREIRA_NAV`)

**Interfaces:**
- Consumes: `trpc.diarias.listar`/`criar`/`atualizar`/`remover`; `diariaStatusInfo` (Task 3); `podeTransicionar` (Task 2); `CollapsiblePageHeader`; `StatusChip`, `EmptyState` from `@/components/ds`; `Button` from `@/components/ui/button`; tokens.
- Produces: default-exported `DiariasPage` at `/admin/diarias`; a `{ label: "Diárias", path: "/admin/diarias", icon: "Banknote" }` nav entry.

- [ ] **Step 1: Write the page entry (server component — no "use client")**

```tsx
// src/app/(dashboard)/admin/diarias/page.tsx
import { DiariasView } from "./_components/diarias-view";

export default function DiariasPage() {
  return <DiariasView />;
}
```

- [ ] **Step 2: Write the view component**

```tsx
// src/app/(dashboard)/admin/diarias/_components/diarias-view.tsx
"use client";

import { useMemo, useState } from "react";
import { Banknote, Wallet, Clock, CalendarDays, Plus } from "lucide-react";
import { CollapsiblePageHeader } from "@/components/layouts/collapsible-page-header";
import { StatusChip, EmptyState } from "@/components/ds";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc/client";
import { CARD_STYLE, TYPO } from "@/lib/config/design-tokens";
import { diariaStatusInfo } from "@/lib/diarias/status-visual";
import { podeTransicionar } from "@/lib/diarias/transicoes";
import { cn } from "@/lib/utils";

const inputCls = "block border rounded px-2 py-1 text-sm dark:bg-neutral-900 dark:border-neutral-700 dark:text-neutral-100";
const brl = (cents: number) => (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const ACAO_LABEL: Record<string, string> = {
  requerida: "Requerer",
  autorizada: "Autorizar",
  paga: "Marcar paga",
  cancelada: "Cancelar",
};

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

const EMPTY_FORM = { destino: "", origem: "", motivo: "", dataInicio: "", dataFim: "", quantidade: "1", valorUnitario: "", sei: "" };

export function DiariasView() {
  const utils = trpc.useUtils();
  const { data = [], isLoading } = trpc.diarias.listar.useQuery();
  const invalidate = () => utils.diarias.listar.invalidate();
  const criar = trpc.diarias.criar.useMutation({ onSuccess: invalidate });
  const atualizar = trpc.diarias.atualizar.useMutation({ onSuccess: invalidate });
  const remover = trpc.diarias.remover.useMutation({ onSuccess: invalidate });

  const [novo, setNovo] = useState(false);
  const [f, setF] = useState({ ...EMPTY_FORM });
  const set = (patch: Partial<typeof f>) => setF((cur) => ({ ...cur, ...patch }));

  const anoAtual = new Date().getFullYear().toString();
  const kpis = useMemo(() => {
    let aReceber = 0, pagoAno = 0, pendentes = 0;
    for (const d of data) {
      if (d.status === "a_requerer" || d.status === "requerida" || d.status === "autorizada") aReceber += d.totalCents;
      if (d.status === "paga" && d.dataInicio.slice(0, 4) === anoAtual) pagoAno += d.totalCents;
      if (d.status === "requerida") pendentes += 1;
    }
    return { aReceber, pagoAno, pendentes, total: data.length };
  }, [data, anoAtual]);

  const stats = (
    <div className="flex flex-wrap items-center gap-2">
      <Kpi icon={Wallet} label="A receber" value={brl(kpis.aReceber)} />
      <Kpi icon={Banknote} label={`Pago em ${anoAtual}`} value={brl(kpis.pagoAno)} />
      <Kpi icon={Clock} label="Pendentes" value={kpis.pendentes} />
      <Kpi icon={CalendarDays} label="Diárias" value={kpis.total} />
    </div>
  );

  return (
    <div className="min-h-screen">
      <CollapsiblePageHeader title="Diárias" icon={Banknote}>
        {stats}
      </CollapsiblePageHeader>

      <div className="p-4 space-y-4">
        {/* Nova diária */}
        <section className={cn(CARD_STYLE.base)}>
          <div className="flex items-center justify-between">
            <h2 className={TYPO.h3}>Minhas diárias</h2>
            <Button size="sm" variant="outline" onClick={() => setNovo((v) => !v)}>
              <Plus className="w-4 h-4 mr-1" /> Nova diária
            </Button>
          </div>
          {novo && (
            <div className="mt-3 flex flex-wrap items-end gap-2">
              <label className="text-xs">Destino<input className={inputCls} value={f.destino} onChange={(e) => set({ destino: e.target.value })} /></label>
              <label className="text-xs">Origem<input className={inputCls} value={f.origem} onChange={(e) => set({ origem: e.target.value })} /></label>
              <label className="text-xs">Início<input type="date" className={inputCls} value={f.dataInicio} onChange={(e) => set({ dataInicio: e.target.value })} /></label>
              <label className="text-xs">Fim<input type="date" className={inputCls} value={f.dataFim} onChange={(e) => set({ dataFim: e.target.value })} /></label>
              <label className="text-xs">Qtd<input type="number" step="0.5" min="0.5" className={cn(inputCls, "w-20")} value={f.quantidade} onChange={(e) => set({ quantidade: e.target.value })} /></label>
              <label className="text-xs">Valor unit. (R$)<input type="number" step="0.01" min="0" className={cn(inputCls, "w-28")} value={f.valorUnitario} onChange={(e) => set({ valorUnitario: e.target.value })} /></label>
              <label className="text-xs">SEI<input className={cn(inputCls, "w-28")} value={f.sei} onChange={(e) => set({ sei: e.target.value })} /></label>
              <Button size="sm" disabled={!f.destino || !f.dataInicio || !f.dataFim || !f.valorUnitario || criar.isPending}
                onClick={() => criar.mutate({
                  destino: f.destino,
                  origem: f.origem || null,
                  motivo: f.motivo || null,
                  dataInicio: f.dataInicio,
                  dataFim: f.dataFim,
                  quantidade: Number(f.quantidade),
                  valorUnitarioCents: Math.round(Number(f.valorUnitario) * 100),
                  seiProtocolo: f.sei || null,
                }, { onSuccess: () => { setNovo(false); setF({ ...EMPTY_FORM }); } })}>
                Salvar
              </Button>
            </div>
          )}
          {criar.error && <p className="mt-2 text-[11px] text-rose-600">{criar.error.message}</p>}
          {(atualizar.error || remover.error) && <p className="mt-2 text-[11px] text-rose-600">{atualizar.error?.message ?? remover.error?.message}</p>}
        </section>

        {/* Lista */}
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando…</p>
        ) : data.length === 0 ? (
          <EmptyState icon={Banknote} title="Nenhuma diária cadastrada" />
        ) : (
          <section className={cn(CARD_STYLE.base)}>
            <ul className="divide-y divide-neutral-100">
              {data.map((d) => (
                <li key={d.id} className="flex items-center justify-between py-2 gap-2">
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">
                      {d.destino} · {d.dataInicio} – {d.dataFim}
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      {d.quantidade} × {brl(d.valorUnitarioCents)} = <span className="font-semibold">{brl(d.totalCents)}</span>
                      {d.seiProtocolo ? ` · SEI ${d.seiProtocolo}` : ""}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <StatusChip info={diariaStatusInfo(d.status)} />
                    {(["requerida", "autorizada", "paga", "cancelada"] as const)
                      .filter((s) => podeTransicionar(d.status, s))
                      .map((s) => (
                        <Button key={s} size="sm" variant="ghost" className="h-7 px-2 text-[11px]"
                          disabled={atualizar.isPending}
                          onClick={() => atualizar.mutate({ id: d.id, status: s })}>
                          {ACAO_LABEL[s]}
                        </Button>
                      ))}
                    <Button size="sm" variant="ghost" className="h-7 px-2 text-[11px] text-rose-600"
                      disabled={remover.isPending}
                      onClick={() => { if (window.confirm("Excluir esta diária?")) remover.mutate({ id: d.id }); }}>
                      Excluir
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Add the sidebar nav entry**

In `src/components/layouts/admin-sidebar.tsx`, find `CARREIRA_NAV` (currently a single "Vida Funcional" item) and add a Diárias entry:

```ts
const CARREIRA_NAV: AssignmentMenuItem[] = [
  { label: "Vida Funcional", path: "/admin/carreira/vida-funcional", icon: "Briefcase" },
  { label: "Diárias", path: "/admin/diarias", icon: "Banknote" },
];
```

(Confirm "Banknote" resolves in whatever icon map this file uses; if the project maps icon strings to Lucide components by name, "Banknote" is a valid Lucide icon. If the map is an allowlist that doesn't include it, pick an included travel/money icon like "Wallet" or "Receipt".)

- [ ] **Step 4: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: no new errors from the new files. If `StatusChip`/`EmptyState`/`Button`/`CollapsiblePageHeader` props differ from usage here, read the source and adjust (do not invent props). `CARD_STYLE.base` already includes `p-4` — do not double it.

- [ ] **Step 5: Run the full diárias suite**

Run: `npx vitest run src/lib/diarias src/lib/db/schema/__tests__/diarias-schema.test.ts src/lib/trpc/routers/__tests__/diarias-router.test.ts`
Expected: PASS (pure-logic + schema + structural tests).

- [ ] **Step 6: Commit**

```bash
git add "src/app/(dashboard)/admin/diarias/page.tsx" "src/app/(dashboard)/admin/diarias/_components/diarias-view.tsx" src/components/layouts/admin-sidebar.tsx
git commit -m "feat(diarias): página de Diárias (KPIs, lista, transições, R$) + nav"
```

---

### Task 6: Manual smoke check

**Files:** none (verification only).

- [ ] **Step 1: Apply the migration** (env with a DB): `npm run db:push`. Expected: `diarias` table + `diaria_status` enum created.

- [ ] **Step 2: Start the dev server**: `npm run dev:turbo`. Expected: boots cleanly.

- [ ] **Step 3: Exercise the lifecycle.** Open `http://localhost:3000/admin/diarias` (also reachable from the sidebar "Diárias" entry). Create a diária (destino Salvador, 1.5 diárias × R$ 150,00). Expected: row shows `1.5 × R$ 150,00 = R$ 225,00`, status "A requerer", and the "A receber" KPI = R$ 225,00. Click Requerer → Autorizar → Marcar paga; confirm only valid transitions are offered and the "Pago em <ano>" KPI updates after paga.

- [ ] **Step 4: Confirm the hub integration.** Open `/admin/carreira`. Expected: the contraprestação cluster shows the diária (via the projected vida_funcional evento) with its value; status tracks (requerida→pendente, autorizada→em_curso, paga→concluido). Cancel a diária → it disappears from the hub (evento soft-deleted).

---

## Self-Review

**Spec coverage:**
- §4 table + enum + barrel + scoped migration → Task 1. ✓
- §5 pure logic (calculo, transições, projeção, status-visual) → Tasks 2, 3. ✓
- §6 router (listar scoped+parse, criar transactional projection + origem manual + backfill, atualizar full fields + NOT_FOUND/FORBIDDEN + transition gate + recompute + cascade, remover cascade) → Task 4. ✓
- §3 privacy → Task 4, guarded by structural test. ✓
- §7 UI (KPIs incl. R$ formatting, rows with chips via diariaStatusInfo + allowed-only actions + create form + dark-mode inputs + loading guard, nav entry) → Task 5. ✓
- §8 testing (pure + structural router + schema) → Tasks 1–4. ✓
- §9 out-of-scope respected: no carreira changes, no afastamento, no SEI gen / rate-table / reembolso / legacy migration. ✓

**Placeholder scan:** no TBDs; every code step shows full code. The "if a prop/icon differs, read the source" notes (Task 5) are defensive checks against unverified third-party names, not placeholders.

**Type consistency:** `totalCents` Task 2 → Tasks 4 & (UI computes via listar); `podeTransicionar` Task 2 → Tasks 4 & 5; `projecaoEventoDeDiaria`/`statusEventoDeDiaria`/`tituloDiaria` Task 3 → Task 4; `diariaStatusInfo` Task 3 → Task 5; schema `diarias`/`diariaStatusEnum` Task 1 → Task 4. The `listar` return shape (`...row, quantidade:number, totalCents:number`) defined in Task 4 and consumed in Task 5. Status literals match the `diaria_status` enum throughout. `quantidade` stored as `String(...)`, read as `Number(...)` consistently.
