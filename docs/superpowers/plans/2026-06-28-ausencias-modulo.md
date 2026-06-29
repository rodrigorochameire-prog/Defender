# Módulo Ausências Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A unified Ausências module (Licenças + Outras Ausências, `tipo` discriminator) mirroring SIGA — lifecycle, motivo taxonomy, formal SIGA fields — projecting a vida_funcional event (licença→LICENCA, outra→additive OUTRA_AUSENCIA) so the Carreira Hub's ausências cluster stays complete, with no carreira code changes.

**Architecture:** One Drizzle table `ausencias` (+ 2 new enums); one additive `OUTRA_AUSENCIA` value on `vf_tipo_evento` with its TS-enforced support edits. Pure logic in `src/lib/ausencias/`. An `ausencias` tRPC router (scope, titular guard, transactional projection/cascade — no afastamento, no money). One client page + sidebar nav.

**Tech Stack:** Next.js 15 (App Router, client), tRPC, Drizzle ORM (Postgres), Tailwind + Padrão Defender v5, vitest.

## Global Constraints

- **Privacy:** reads use `getVidaFuncionalScope`; writes titular-only (`NOT_FOUND`→`FORBIDDEN`).
- **Projection:** vida_funcional event, cluster `ausencias`, tipo via `tipoEventoDeAusencia` (licenca→`LICENCA`, outra→`OUTRA_AUSENCIA`), `origem:"manual"`, `dados.ausenciaId`. **No valorCents.** `indeferida`/`cancelada` → soft-delete the event. NO carreira changes.
- **Additive vf enum:** `OUTRA_AUSENCIA` added to `vfTipoEventoEnum` + the `VfTipo` union + `TIPO_CLUSTER` (=`"ausencias"`) + `TIPO_LABELS` (=`"Outra ausência"`). Do NOT edit `dominios.ts` or `MARCO_TIPOS`.
- **Migrations:** `0061` = ONLY the `ALTER TYPE … ADD VALUE` (isolated from any txn that uses it); `0062` = the 2 new types + table. Hand-scoped, idempotent. No edits to existing tables.
- **No afastamento cascade.** Dates `YYYY-MM-DD` strings, no date-fns. Soft-delete filters everywhere.
- **Status chips:** ausências-local `ausenciaStatusInfo`.
- **Module pattern** mirrors Diárias.

---

### Task 1: Schema + additive vf enum + migrations

**Files:**
- Create: `src/lib/db/schema/ausencias.ts`
- Modify: `src/lib/db/schema/vida-funcional.ts` (add `"OUTRA_AUSENCIA"` to the enum)
- Modify: `src/lib/vida-funcional/tipo-cluster.ts` (VfTipo union + TIPO_CLUSTER)
- Modify: `src/lib/vida-funcional/labels.ts` (TIPO_LABELS)
- Modify: `src/lib/db/schema/index.ts` (barrel)
- Create: `drizzle/0061_ausencias_enum.sql`, `drizzle/0062_ausencias_modulo.sql`
- Test: `src/lib/db/schema/__tests__/ausencias-schema.test.ts`

**Interfaces:**
- Produces: `ausenciaTipoEnum`, `ausenciaSituacaoEnum`, `ausencias`, types `Ausencia`/`InsertAusencia`; `OUTRA_AUSENCIA` as a valid `VfTipo`.

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/db/schema/__tests__/ausencias-schema.test.ts
import { describe, it, expect } from "vitest";
import { ausencias, ausenciaTipoEnum, ausenciaSituacaoEnum, vfTipoEventoEnum } from "@/lib/db/schema";

describe("ausencias schema", () => {
  it("exports the table and the two enums", () => {
    expect(ausencias).toBeDefined();
    expect(ausenciaTipoEnum.enumValues).toEqual(["licenca", "outra_ausencia"]);
    expect(ausenciaSituacaoEnum.enumValues).toEqual(["solicitada","deferida","gozada","indeferida","cancelada"]);
  });
  it("vf_tipo_evento now includes OUTRA_AUSENCIA", () => {
    expect(vfTipoEventoEnum.enumValues).toContain("OUTRA_AUSENCIA");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/lib/db/schema/__tests__/ausencias-schema.test.ts`
Expected: FAIL — `ausencias` not exported.

- [ ] **Step 3: Write the schema**

```ts
// src/lib/db/schema/ausencias.ts
import { pgTable, pgEnum, serial, integer, text, date, boolean, timestamp, index } from "drizzle-orm/pg-core";
import { users } from "./core";

export const ausenciaTipoEnum = pgEnum("ausencia_tipo", ["licenca", "outra_ausencia"]);
export const ausenciaSituacaoEnum = pgEnum("ausencia_situacao", [
  "solicitada", "deferida", "gozada", "indeferida", "cancelada",
]);

export const ausencias = pgTable("ausencias", {
  id: serial("id").primaryKey(),
  defensorId: integer("defensor_id").references(() => users.id).notNull(),
  tipo: ausenciaTipoEnum("tipo").notNull(),
  motivo: text("motivo"),
  dataInicio: date("data_inicio").notNull(),
  dataFim: date("data_fim").notNull(),
  situacao: ausenciaSituacaoEnum("situacao").default("solicitada").notNull(),
  interrompida: boolean("interrompida").default(false).notNull(),
  suspensa: boolean("suspensa").default(false).notNull(),
  numeroSolicitacao: text("numero_solicitacao"),
  nSiga: text("n_siga"),
  dataPublicacao: date("data_publicacao"),
  observacao: text("observacao"),
  situacaoSiga: text("situacao_siga"),
  sigaSyncedAt: timestamp("siga_synced_at"),
  vidaFuncionalEventoId: integer("vida_funcional_evento_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  deletedAt: timestamp("deleted_at"),
}, (table) => [
  index("ausencias_defensor_situacao_deleted_idx").on(table.defensorId, table.situacao, table.deletedAt),
  index("ausencias_defensor_tipo_data_idx").on(table.defensorId, table.tipo, table.dataInicio),
]);

export type Ausencia = typeof ausencias.$inferSelect;
export type InsertAusencia = typeof ausencias.$inferInsert;
```

- [ ] **Step 4: Add the additive vf enum value + support edits**

In `src/lib/db/schema/vida-funcional.ts`, in `vfTipoEventoEnum`, add `"OUTRA_AUSENCIA",` immediately after `"COOPERACAO",` (still in the `// cluster: ausencias` group).

In `src/lib/vida-funcional/tipo-cluster.ts`: add `| "OUTRA_AUSENCIA"` to the `VfTipo` union (on the ausências line, after `"COOPERACAO"`), and add `OUTRA_AUSENCIA: "ausencias",` to the `TIPO_CLUSTER` map (after `COOPERACAO: "ausencias",`).

In `src/lib/vida-funcional/labels.ts`: add `OUTRA_AUSENCIA: "Outra ausência",` to `TIPO_LABELS` (after `COOPERACAO: "Cooperação",`).

Append to `src/lib/db/schema/index.ts`:

```ts
export * from "./ausencias";
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx vitest run src/lib/db/schema/__tests__/ausencias-schema.test.ts`
Expected: PASS.

- [ ] **Step 6: Write the two scoped migrations**

`drizzle/0061_ausencias_enum.sql` (ONLY the enum value — isolated):

```sql
-- Aditivo: novo valor no enum vf_tipo_evento (isolado — ADD VALUE não pode ser usado na mesma transação em que é criado).
ALTER TYPE "public"."vf_tipo_evento" ADD VALUE IF NOT EXISTS 'OUTRA_AUSENCIA';
```

`drizzle/0062_ausencias_modulo.sql`:

```sql
-- Módulo Ausências: enums + tabela ausencias (idempotente).
DO $$ BEGIN
  CREATE TYPE "public"."ausencia_tipo" AS ENUM('licenca', 'outra_ausencia');
EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint
DO $$ BEGIN
  CREATE TYPE "public"."ausencia_situacao" AS ENUM('solicitada', 'deferida', 'gozada', 'indeferida', 'cancelada');
EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ausencias" (
	"id" serial PRIMARY KEY NOT NULL,
	"defensor_id" integer NOT NULL,
	"tipo" "ausencia_tipo" NOT NULL,
	"motivo" text,
	"data_inicio" date NOT NULL,
	"data_fim" date NOT NULL,
	"situacao" "ausencia_situacao" DEFAULT 'solicitada' NOT NULL,
	"interrompida" boolean DEFAULT false NOT NULL,
	"suspensa" boolean DEFAULT false NOT NULL,
	"numero_solicitacao" text,
	"n_siga" text,
	"data_publicacao" date,
	"observacao" text,
	"situacao_siga" text,
	"siga_synced_at" timestamp,
	"vida_funcional_evento_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "ausencias" ADD CONSTRAINT "ausencias_defensor_id_users_id_fk" FOREIGN KEY ("defensor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ausencias_defensor_situacao_deleted_idx" ON "ausencias" USING btree ("defensor_id","situacao","deleted_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ausencias_defensor_tipo_data_idx" ON "ausencias" USING btree ("defensor_id","tipo","data_inicio");
```

(Apply with `npm run db:push` where a DB exists; run `0061` then `0062`. Do NOT `db:generate`.)

- [ ] **Step 7: Typecheck (the union edit is TS-enforced) + commit**

Run: `npx tsc --noEmit`
Expected: no new errors — `TIPO_CLUSTER`/`TIPO_LABELS` are `Record<VfTipo, …>`, so missing the new key fails the build; adding it in Step 4 satisfies them.

```bash
git add src/lib/db/schema/ausencias.ts src/lib/db/schema/vida-funcional.ts src/lib/vida-funcional/tipo-cluster.ts src/lib/vida-funcional/labels.ts src/lib/db/schema/index.ts drizzle/0061_ausencias_enum.sql drizzle/0062_ausencias_modulo.sql src/lib/db/schema/__tests__/ausencias-schema.test.ts
git commit -m "feat(ausencias): schema ausencias + valor aditivo OUTRA_AUSENCIA + migrations 0061/0062"
```

---

### Task 2: Cálculos + transições + motivos (pure)

**Files:**
- Create: `src/lib/ausencias/calculos.ts`, `src/lib/ausencias/transicoes.ts`, `src/lib/ausencias/motivos.ts`
- Test: `src/lib/ausencias/__tests__/calculos.test.ts`, `transicoes.test.ts`, `motivos.test.ts`

**Interfaces:**
- Produces: `diasInclusive(inicio,fim):number`; `type AusenciaSituacao`, `TRANSICOES`, `podeTransicionar(de,para):boolean`; `LICENCA_MOTIVOS: readonly string[]`.

- [ ] **Step 1: Write the failing tests**

```ts
// src/lib/ausencias/__tests__/calculos.test.ts
import { describe, it, expect } from "vitest";
import { diasInclusive } from "../calculos";
describe("diasInclusive", () => {
  it("counts inclusive days", () => { expect(diasInclusive("2026-07-01","2026-07-10")).toBe(10); expect(diasInclusive("2026-07-01","2026-07-01")).toBe(1); });
  it("returns 0 when fim < inicio", () => { expect(diasInclusive("2026-07-10","2026-07-01")).toBe(0); });
});
```

```ts
// src/lib/ausencias/__tests__/transicoes.test.ts
import { describe, it, expect } from "vitest";
import { podeTransicionar } from "../transicoes";
describe("podeTransicionar", () => {
  it("allows valid edges", () => {
    expect(podeTransicionar("solicitada","deferida")).toBe(true);
    expect(podeTransicionar("solicitada","indeferida")).toBe(true);
    expect(podeTransicionar("solicitada","cancelada")).toBe(true);
    expect(podeTransicionar("deferida","gozada")).toBe(true);
    expect(podeTransicionar("deferida","cancelada")).toBe(true);
  });
  it("rejects invalid edges and terminals", () => {
    expect(podeTransicionar("solicitada","gozada")).toBe(false);
    expect(podeTransicionar("deferida","indeferida")).toBe(false);
    expect(podeTransicionar("gozada","cancelada")).toBe(false);
    expect(podeTransicionar("indeferida","solicitada")).toBe(false);
  });
  it("rejects unknown", () => { expect(podeTransicionar("foo","bar")).toBe(false); });
});
```

```ts
// src/lib/ausencias/__tests__/motivos.test.ts
import { describe, it, expect } from "vitest";
import { LICENCA_MOTIVOS } from "../motivos";
describe("LICENCA_MOTIVOS", () => {
  it("has the 11 official SIGA motivos", () => {
    expect(LICENCA_MOTIVOS).toHaveLength(11);
    expect(LICENCA_MOTIVOS).toContain("LUTO");
    expect(LICENCA_MOTIVOS).toContain("MATERNIDADE (OU ADOTANTE)");
    expect(LICENCA_MOTIVOS).toContain("DOENÇA DE PESSOA DA FAMÍLIA");
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/lib/ausencias/__tests__/calculos.test.ts src/lib/ausencias/__tests__/transicoes.test.ts src/lib/ausencias/__tests__/motivos.test.ts`
Expected: FAIL — modules not found.

- [ ] **Step 3: Write the implementations**

```ts
// src/lib/ausencias/calculos.ts
export function diasInclusive(inicio: string, fim: string): number {
  if (fim < inicio) return 0;
  const a = new Date(`${inicio}T00:00:00Z`).getTime();
  const b = new Date(`${fim}T00:00:00Z`).getTime();
  return Math.round((b - a) / 86_400_000) + 1;
}
```

```ts
// src/lib/ausencias/transicoes.ts
export type AusenciaSituacao = "solicitada" | "deferida" | "gozada" | "indeferida" | "cancelada";
export const TRANSICOES: Record<AusenciaSituacao, AusenciaSituacao[]> = {
  solicitada: ["deferida", "indeferida", "cancelada"],
  deferida: ["gozada", "cancelada"],
  gozada: [],
  indeferida: [],
  cancelada: [],
};
export function podeTransicionar(de: string, para: string): boolean {
  const allowed = TRANSICOES[de as AusenciaSituacao];
  return Array.isArray(allowed) && allowed.includes(para as AusenciaSituacao);
}
```

```ts
// src/lib/ausencias/motivos.ts
/** Taxonomia oficial de motivos de licença do SIGA (strings exatas para casar no scraper). */
export const LICENCA_MOTIVOS = [
  "ACIDENTE EM SERVIÇO",
  "CASAMENTO",
  "CESSÃO",
  "DOENÇA DE PESSOA DA FAMÍLIA",
  "EM CARATER ESPECIAL/INTERESSE PARTICULAR",
  "EXERCER MANDATO ELETIVO",
  "LUTO",
  "MATERNIDADE (ABORTO OU NATIMORTO)",
  "MATERNIDADE (OU ADOTANTE)",
  "PARA CONCORRER A MANDATO ELETIVO",
  "PATERNIDADE (OU ADOTANTE)",
] as const;
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/lib/ausencias/__tests__/calculos.test.ts src/lib/ausencias/__tests__/transicoes.test.ts src/lib/ausencias/__tests__/motivos.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/ausencias/calculos.ts src/lib/ausencias/transicoes.ts src/lib/ausencias/motivos.ts src/lib/ausencias/__tests__/calculos.test.ts src/lib/ausencias/__tests__/transicoes.test.ts src/lib/ausencias/__tests__/motivos.test.ts
git commit -m "feat(ausencias): dias + máquina de transições + taxonomia de motivos (puro)"
```

---

### Task 3: Projeção + status visual (pure)

**Files:**
- Create: `src/lib/ausencias/projecao.ts`, `src/lib/ausencias/status-visual.ts`
- Test: `src/lib/ausencias/__tests__/projecao.test.ts`, `status-visual.test.ts`

**Interfaces:**
- Consumes: `VisualTipo` from `@/lib/config/tipologia`.
- Produces: `statusEventoDeAusencia(situacao): "previsto"|"pendente"|"concluido"`; `tipoEventoDeAusencia(tipo): "LICENCA"|"OUTRA_AUSENCIA"`; `tituloAusencia(input)`; `type ProjecaoAusenciaEvento`; `projecaoEventoDeAusencia(ausencia): ProjecaoAusenciaEvento`; `ausenciaStatusInfo(situacao): VisualTipo`.

- [ ] **Step 1: Write the failing tests**

```ts
// src/lib/ausencias/__tests__/projecao.test.ts
import { describe, it, expect } from "vitest";
import { statusEventoDeAusencia, tipoEventoDeAusencia, tituloAusencia, projecaoEventoDeAusencia } from "../projecao";

describe("statusEventoDeAusencia", () => {
  it("maps situação to vf status", () => {
    expect(statusEventoDeAusencia("solicitada")).toBe("pendente");
    expect(statusEventoDeAusencia("deferida")).toBe("previsto");
    expect(statusEventoDeAusencia("gozada")).toBe("concluido");
  });
});
describe("tipoEventoDeAusencia", () => {
  it("maps tipo to vf evento tipo", () => {
    expect(tipoEventoDeAusencia("licenca")).toBe("LICENCA");
    expect(tipoEventoDeAusencia("outra_ausencia")).toBe("OUTRA_AUSENCIA");
  });
});
describe("tituloAusencia", () => {
  it("formats licença with motivo", () => {
    expect(tituloAusencia({ tipo: "licenca", motivo: "LUTO", dataInicio: "2026-07-01" })).toBe("Licença — LUTO (2026-07-01)");
  });
  it("formats outra without motivo", () => {
    expect(tituloAusencia({ tipo: "outra_ausencia", motivo: null, dataInicio: "2026-07-01" })).toBe("Ausência (2026-07-01)");
  });
});
describe("projecaoEventoDeAusencia", () => {
  it("builds the projection (no valorCents)", () => {
    const p = projecaoEventoDeAusencia({ id: 3, tipo: "licenca", motivo: "CASAMENTO", dataInicio: "2026-07-01", dataFim: "2026-07-08", situacao: "deferida" });
    expect(p).toEqual({
      tipo: "LICENCA", cluster: "ausencias", titulo: "Licença — CASAMENTO (2026-07-01)",
      dataEvento: "2026-07-01", dataFim: "2026-07-08", status: "previsto", dados: { ausenciaId: 3 },
    });
    expect("valorCents" in p).toBe(false);
  });
  it("accepts null id (creation)", () => {
    const p = projecaoEventoDeAusencia({ id: null, tipo: "outra_ausencia", motivo: null, dataInicio: "2026-07-01", dataFim: "2026-07-01", situacao: "solicitada" });
    expect(p.dados.ausenciaId).toBeNull();
    expect(p.tipo).toBe("OUTRA_AUSENCIA");
    expect(p.status).toBe("pendente");
  });
});
```

```ts
// src/lib/ausencias/__tests__/status-visual.test.ts
import { describe, it, expect } from "vitest";
import { ausenciaStatusInfo } from "../status-visual";
describe("ausenciaStatusInfo", () => {
  it("labels every situação", () => {
    expect(ausenciaStatusInfo("solicitada").label).toBe("Solicitada");
    expect(ausenciaStatusInfo("deferida").label).toBe("Deferida");
    expect(ausenciaStatusInfo("gozada").label).toBe("Gozada");
    expect(ausenciaStatusInfo("indeferida").label).toBe("Indeferida");
    expect(ausenciaStatusInfo("cancelada").label).toBe("Cancelada");
  });
  it("returns badge + dot for all; neutral fallback echoes unknown", () => {
    for (const s of ["solicitada","deferida","gozada","indeferida","cancelada"]) {
      const r = ausenciaStatusInfo(s); expect(r.badge.length).toBeGreaterThan(0); expect(r.dot.length).toBeGreaterThan(0);
    }
    expect(ausenciaStatusInfo("xpto").label).toBe("xpto");
    expect(ausenciaStatusInfo("xpto").badge).toContain("neutral");
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/lib/ausencias/__tests__/projecao.test.ts src/lib/ausencias/__tests__/status-visual.test.ts`
Expected: FAIL — modules not found.

- [ ] **Step 3: Write the implementations**

```ts
// src/lib/ausencias/projecao.ts
export function statusEventoDeAusencia(situacao: string): "previsto" | "pendente" | "concluido" {
  if (situacao === "solicitada") return "pendente";
  if (situacao === "gozada") return "concluido";
  return "previsto"; // deferida
}

export function tipoEventoDeAusencia(tipo: string): "LICENCA" | "OUTRA_AUSENCIA" {
  return tipo === "outra_ausencia" ? "OUTRA_AUSENCIA" : "LICENCA";
}

export function tituloAusencia(input: { tipo: string; motivo: string | null; dataInicio: string }): string {
  const label = input.tipo === "outra_ausencia" ? "Ausência" : "Licença";
  const m = input.motivo ? ` — ${input.motivo}` : "";
  return `${label}${m} (${input.dataInicio})`;
}

export type ProjecaoAusenciaEvento = {
  tipo: "LICENCA" | "OUTRA_AUSENCIA";
  cluster: "ausencias";
  titulo: string;
  dataEvento: string;
  dataFim: string;
  status: "previsto" | "pendente" | "concluido";
  dados: { ausenciaId: number | null };
};

export function projecaoEventoDeAusencia(
  ausencia: { id: number | null; tipo: string; motivo: string | null; dataInicio: string; dataFim: string; situacao: string },
): ProjecaoAusenciaEvento {
  return {
    tipo: tipoEventoDeAusencia(ausencia.tipo),
    cluster: "ausencias",
    titulo: tituloAusencia({ tipo: ausencia.tipo, motivo: ausencia.motivo, dataInicio: ausencia.dataInicio }),
    dataEvento: ausencia.dataInicio,
    dataFim: ausencia.dataFim,
    status: statusEventoDeAusencia(ausencia.situacao),
    dados: { ausenciaId: ausencia.id },
  };
}
```

```ts
// src/lib/ausencias/status-visual.ts
import type { VisualTipo } from "@/lib/config/tipologia";

const NEUTRAL = { badge: "bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400", dot: "bg-neutral-400" };
const SKY = { badge: "bg-sky-50 text-sky-700 dark:bg-sky-950/30 dark:text-sky-400", dot: "bg-sky-500" };
const EMERALD = { badge: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400", dot: "bg-emerald-500" };
const ROSE = { badge: "bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-400", dot: "bg-rose-500" };

const MAP: Record<string, VisualTipo> = {
  solicitada: { label: "Solicitada", ...NEUTRAL },
  deferida: { label: "Deferida", ...SKY },
  gozada: { label: "Gozada", ...EMERALD },
  indeferida: { label: "Indeferida", ...ROSE },
  cancelada: { label: "Cancelada", ...NEUTRAL },
};

export function ausenciaStatusInfo(situacao?: string | null): VisualTipo {
  const k = (situacao ?? "").trim().toLowerCase();
  return MAP[k] ?? { label: situacao ?? "—", ...NEUTRAL };
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/lib/ausencias/__tests__/projecao.test.ts src/lib/ausencias/__tests__/status-visual.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/ausencias/projecao.ts src/lib/ausencias/status-visual.ts src/lib/ausencias/__tests__/projecao.test.ts src/lib/ausencias/__tests__/status-visual.test.ts
git commit -m "feat(ausencias): projeção (tipo/status) + resolver de status visual"
```

---

### Task 4: `ausencias` tRPC router + registration

**Files:**
- Create: `src/lib/trpc/routers/ausencias.ts`
- Modify: `src/lib/trpc/routers/index.ts`
- Test: `src/lib/trpc/routers/__tests__/ausencias-router.test.ts`

**Interfaces:**
- Consumes: Task 1 `ausencias` + `vidaFuncionalEventos`; Task 2 (`diasInclusive`, `podeTransicionar`); Task 3 (`projecaoEventoDeAusencia`); `getVidaFuncionalScope`.
- Produces: `ausenciasRouter` (`listar`/`criar`/`atualizar`/`remover`), registered as `appRouter.ausencias`. `listar` adds `dias` per row.

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/trpc/routers/__tests__/ausencias-router.test.ts
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it, expect } from "vitest";
const ROUTERS = join(process.cwd(), "src/lib/trpc/routers");
const read = (rel: string) => readFileSync(join(ROUTERS, rel), "utf8");

describe("ausencias router — contract", () => {
  const src = read("ausencias.ts");
  it("scopes reads with getVidaFuncionalScope", () => { expect(src).toContain("getVidaFuncionalScope"); });
  it("filters soft-deleted", () => { expect(src).toMatch(/isNull\([^)]*deletedAt\)/); });
  it("guards titular + NOT_FOUND", () => { expect(src).toContain("FORBIDDEN"); expect(src).toContain("NOT_FOUND"); });
  it("gates situação via podeTransicionar", () => { expect(src).toContain("podeTransicionar"); });
  it("wraps writes in a transaction", () => { expect(src).toContain("db.transaction"); });
  it("projects via projecaoEventoDeAusencia with origem manual", () => {
    expect(src).toContain("projecaoEventoDeAusencia");
    expect(src).toMatch(/origem:\s*["']manual["']/);
  });
  it("soft-deletes the event on indeferida/cancelada", () => { expect(src).toMatch(/indeferida|cancelada/); });
  it("does NOT reference afastamentos", () => { expect(src).not.toContain("afastamentos"); });
  it("is registered", () => {
    const idx = read("index.ts"); expect(idx).toContain("ausenciasRouter"); expect(idx).toMatch(/ausencias:\s*ausenciasRouter/);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/lib/trpc/routers/__tests__/ausencias-router.test.ts`
Expected: FAIL — `ausencias.ts` missing.

- [ ] **Step 3: Write the router**

```ts
// src/lib/trpc/routers/ausencias.ts
import { z } from "zod";
import { and, asc, eq, inArray, isNull } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../init";
import { db } from "@/lib/db";
import { ausencias, vidaFuncionalEventos } from "@/lib/db/schema";
import { getVidaFuncionalScope } from "../vida-funcional-scope";
import { diasInclusive } from "@/lib/ausencias/calculos";
import { podeTransicionar } from "@/lib/ausencias/transicoes";
import { projecaoEventoDeAusencia } from "@/lib/ausencias/projecao";

const ISO = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "data inválida (AAAA-MM-DD)");
const TIPO = z.enum(["licenca", "outra_ausencia"]);
const SITUACAO = z.enum(["solicitada", "deferida", "gozada", "indeferida", "cancelada"]);

const baseFields = {
  tipo: TIPO,
  motivo: z.string().nullable().optional(),
  dataInicio: ISO,
  dataFim: ISO,
  interrompida: z.boolean().optional(),
  suspensa: z.boolean().optional(),
  numeroSolicitacao: z.string().nullable().optional(),
  nSiga: z.string().nullable().optional(),
  dataPublicacao: ISO.nullable().optional(),
  observacao: z.string().nullable().optional(),
  situacaoSiga: z.string().nullable().optional(),
};

const updateInput = z.object(baseFields).partial().extend({
  id: z.number().int(),
  situacao: SITUACAO.optional(),
});

export const ausenciasRouter = router({
  listar: protectedProcedure.query(async ({ ctx }) => {
    const scope = getVidaFuncionalScope(ctx.user);
    const rows = await db.select().from(ausencias)
      .where(and(isNull(ausencias.deletedAt), inArray(ausencias.defensorId, scope)))
      .orderBy(asc(ausencias.dataInicio));
    return rows.map((a) => ({ ...a, dias: diasInclusive(a.dataInicio, a.dataFim) }));
  }),

  criar: protectedProcedure.input(z.object(baseFields)).mutation(async ({ ctx, input }) => {
    if (input.dataFim < input.dataInicio) throw new TRPCError({ code: "BAD_REQUEST", message: "dataFim anterior a dataInicio" });

    return await db.transaction(async (tx) => {
      const proj = projecaoEventoDeAusencia({
        id: null, tipo: input.tipo, motivo: input.motivo ?? null,
        dataInicio: input.dataInicio, dataFim: input.dataFim, situacao: "solicitada",
      });
      const [evento] = await tx.insert(vidaFuncionalEventos).values({
        defensorId: ctx.user.id,
        tipo: proj.tipo, cluster: proj.cluster, titulo: proj.titulo,
        dataEvento: proj.dataEvento, dataFim: proj.dataFim, status: proj.status,
        origem: "manual", dados: { ausenciaId: null },
      }).returning({ id: vidaFuncionalEventos.id });

      const [a] = await tx.insert(ausencias).values({
        defensorId: ctx.user.id,
        tipo: input.tipo,
        motivo: input.motivo ?? null,
        dataInicio: input.dataInicio,
        dataFim: input.dataFim,
        situacao: "solicitada",
        interrompida: input.interrompida ?? false,
        suspensa: input.suspensa ?? false,
        numeroSolicitacao: input.numeroSolicitacao ?? null,
        nSiga: input.nSiga ?? null,
        dataPublicacao: input.dataPublicacao ?? null,
        observacao: input.observacao ?? null,
        situacaoSiga: input.situacaoSiga ?? null,
        vidaFuncionalEventoId: evento.id,
      }).returning();

      await tx.update(vidaFuncionalEventos).set({ dados: { ausenciaId: a.id } }).where(eq(vidaFuncionalEventos.id, evento.id));
      return a;
    });
  }),

  atualizar: protectedProcedure.input(updateInput).mutation(async ({ ctx, input }) => {
    const [a] = await db.select().from(ausencias)
      .where(and(eq(ausencias.id, input.id), isNull(ausencias.deletedAt))).limit(1);
    if (!a) throw new TRPCError({ code: "NOT_FOUND", message: "Ausência não encontrada" });
    if (a.defensorId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN", message: "Só o titular altera suas ausências" });

    if (input.situacao && input.situacao !== a.situacao && !podeTransicionar(a.situacao, input.situacao)) {
      throw new TRPCError({ code: "BAD_REQUEST", message: `Transição inválida: ${a.situacao} → ${input.situacao}` });
    }

    const novaInicio = input.dataInicio ?? a.dataInicio;
    const novaFim = input.dataFim ?? a.dataFim;
    if (novaFim < novaInicio) throw new TRPCError({ code: "BAD_REQUEST", message: "dataFim anterior a dataInicio" });

    const novoTipo = input.tipo ?? a.tipo;
    const novoMotivo = input.motivo === undefined ? a.motivo : input.motivo;
    const novaSituacao = input.situacao ?? a.situacao;
    const proj = projecaoEventoDeAusencia({
      id: a.id, tipo: novoTipo, motivo: novoMotivo, dataInicio: novaInicio, dataFim: novaFim, situacao: novaSituacao,
    });

    return await db.transaction(async (tx) => {
      await tx.update(ausencias).set({
        tipo: novoTipo,
        motivo: novoMotivo,
        dataInicio: novaInicio,
        dataFim: novaFim,
        situacao: novaSituacao,
        interrompida: input.interrompida ?? a.interrompida,
        suspensa: input.suspensa ?? a.suspensa,
        numeroSolicitacao: input.numeroSolicitacao === undefined ? a.numeroSolicitacao : input.numeroSolicitacao,
        nSiga: input.nSiga === undefined ? a.nSiga : input.nSiga,
        dataPublicacao: input.dataPublicacao === undefined ? a.dataPublicacao : input.dataPublicacao,
        observacao: input.observacao === undefined ? a.observacao : input.observacao,
        situacaoSiga: input.situacaoSiga === undefined ? a.situacaoSiga : input.situacaoSiga,
        updatedAt: new Date(),
      }).where(eq(ausencias.id, a.id));

      if (a.vidaFuncionalEventoId != null) {
        if (novaSituacao === "indeferida" || novaSituacao === "cancelada") {
          await tx.update(vidaFuncionalEventos).set({ deletedAt: new Date() }).where(eq(vidaFuncionalEventos.id, a.vidaFuncionalEventoId));
        } else {
          await tx.update(vidaFuncionalEventos).set({
            tipo: proj.tipo, status: proj.status,
            dataEvento: proj.dataEvento, dataFim: proj.dataFim,
            titulo: proj.titulo, updatedAt: new Date(),
          }).where(eq(vidaFuncionalEventos.id, a.vidaFuncionalEventoId));
        }
      }
      return { ok: true };
    });
  }),

  remover: protectedProcedure.input(z.object({ id: z.number().int() })).mutation(async ({ ctx, input }) => {
    const [a] = await db.select().from(ausencias)
      .where(and(eq(ausencias.id, input.id), isNull(ausencias.deletedAt))).limit(1);
    if (!a) throw new TRPCError({ code: "NOT_FOUND", message: "Ausência não encontrada" });
    if (a.defensorId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN", message: "Só o titular altera suas ausências" });

    return await db.transaction(async (tx) => {
      await tx.update(ausencias).set({ deletedAt: new Date() }).where(eq(ausencias.id, a.id));
      if (a.vidaFuncionalEventoId != null) {
        await tx.update(vidaFuncionalEventos).set({ deletedAt: new Date() }).where(eq(vidaFuncionalEventos.id, a.vidaFuncionalEventoId));
      }
      return { ok: true };
    });
  }),
});
```

- [ ] **Step 4: Register in `index.ts`**

Add `import { ausenciasRouter } from "./ausencias";` near the other imports, and `ausencias: ausenciasRouter,` in the `appRouter` object (near `diarias`/`ferias`).

- [ ] **Step 5: Run the structural test + typecheck**

Run: `npx vitest run src/lib/trpc/routers/__tests__/ausencias-router.test.ts`
Expected: PASS.

Run: `npx tsc --noEmit`
Expected: no new errors from `ausencias.ts`. (Confirm `vidaFuncionalEventos.tipo` accepts `"OUTRA_AUSENCIA"` now that Task 1 added it to the enum, and `dados` accepts `{ ausenciaId }`.)

- [ ] **Step 6: Commit**

```bash
git add src/lib/trpc/routers/ausencias.ts src/lib/trpc/routers/index.ts src/lib/trpc/routers/__tests__/ausencias-router.test.ts
git commit -m "feat(ausencias): router (CRUD + projeção/cascata vida_funcional, guards, transações)"
```

---

### Task 5: UI page + nav

**Files:**
- Create: `src/app/(dashboard)/admin/ausencias/page.tsx`
- Create: `src/app/(dashboard)/admin/ausencias/_components/ausencias-view.tsx`
- Modify: `src/components/layouts/admin-sidebar.tsx` (CARREIRA_NAV)

**Interfaces:**
- Consumes: `trpc.ausencias.listar`/`criar`/`atualizar`/`remover`; `ausenciaStatusInfo` (Task 3); `podeTransicionar` (Task 2); `LICENCA_MOTIVOS` (Task 2); `CollapsiblePageHeader`; `StatusChip`, `EmptyState`; `Button`; tokens.

- [ ] **Step 1: Read the sibling `diarias-view.tsx` for the exact patterns to mirror**

Read `src/app/(dashboard)/admin/diarias/_components/diarias-view.tsx` — copy its structure (page wrapper outside `CollapsiblePageHeader`, `inputCls`, KPI chips, per-card error scoping via `.variables`, `useUtils` invalidation, status chips, allowed-only action buttons, `window.confirm` delete).

- [ ] **Step 2: Write the page entry (server component — no "use client")**

```tsx
// src/app/(dashboard)/admin/ausencias/page.tsx
import { AusenciasView } from "./_components/ausencias-view";

export default function AusenciasPage() {
  return <AusenciasView />;
}
```

- [ ] **Step 3: Write the view component**

Mirror `diarias-view.tsx`. Key differences:
- Query `trpc.ausencias.listar`; mutations `criar`/`atualizar`/`remover`.
- KPI chips: **Licenças** (`tipo==="licenca"` count) · **Outras** (`tipo==="outra_ausencia"`) · **Solicitadas** (`situacao==="solicitada"`) · **Em vigor** (`situacao==="deferida"`).
- A client-side **tipo filter** (`"todos" | "licenca" | "outra_ausencia"`) over the list.
- Form state `{ tipo, motivo, dataInicio, dataFim, observacao, suspensa, interrompida, numeroSolicitacao, dataPublicacao }`. The **motivo** field renders a `<select>` of `LICENCA_MOTIVOS` when `tipo==="licenca"`, else a free-text `<input>`. Use `inputCls` (dark-mode) for all inputs.
- `criar.mutate` sends all fields (`motivo: f.motivo || null`, booleans `!!`, optionals `|| null`).
- Rows: `{tipoLabel} · {dataInicio} – {dataFim} ({dias}d)`, motivo line, `<StatusChip info={ausenciaStatusInfo(a.situacao)} />`, chips for `suspensa`/`interrompida`, metadata `nº {numeroSolicitacao}` / `SIGA: {situacaoSiga}`. Action buttons filtered by `podeTransicionar(a.situacao, target)` for targets `["deferida","gozada","indeferida","cancelada"]` (labels: Deferir / Marcar gozada / Indeferir / Cancelar) → `atualizar.mutate({ id, situacao })`; plus an "Excluir" ghost button with `window.confirm`.
- `EmptyState icon={CalendarOff}` (import from lucide-react) for the list; loading-guard before it; per-card error scoping like diárias.

Full reference for the chrome (KPI chip component, `inputCls`, error scoping) is in `diarias-view.tsx` — reproduce it, swapping the diária-specific bits for the ausência ones above. No `brl`/money anywhere (ausências have no value).

- [ ] **Step 4: Add the sidebar nav entry**

In `src/components/layouts/admin-sidebar.tsx`, add to `CARREIRA_NAV`:

```ts
  { label: "Ausências", path: "/admin/ausencias", icon: "CalendarOff" },
```

Confirm `"CalendarOff"` is in the file's `iconMap` allowlist (and that `CalendarOff` is imported from lucide-react there); if not, add the import + map entry, or use an already-mapped icon (e.g. `"CalendarX"`, `"Plane"`).

- [ ] **Step 5: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: no new errors from the new files. If `StatusChip`/`EmptyState`/`Button`/`CollapsiblePageHeader` props differ, read the source and adjust. `CARD_STYLE.base` already includes `p-4` — do not double it.

- [ ] **Step 6: Run the full ausências suite**

Run: `npx vitest run src/lib/ausencias src/lib/db/schema/__tests__/ausencias-schema.test.ts src/lib/trpc/routers/__tests__/ausencias-router.test.ts`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add "src/app/(dashboard)/admin/ausencias/page.tsx" "src/app/(dashboard)/admin/ausencias/_components/ausencias-view.tsx" src/components/layouts/admin-sidebar.tsx
git commit -m "feat(ausencias): página de Ausências (licenças/outras, lifecycle, motivos) + nav"
```

---

### Task 6: Manual smoke check

**Files:** none.

- [ ] **Step 1: Apply migrations** (env with DB): `npm run db:push` (runs 0061 then 0062). Expected: `OUTRA_AUSENCIA` added to `vf_tipo_evento`; `ausencias` table + 2 enums created.
- [ ] **Step 2: `npm run dev:turbo`** — boots cleanly.
- [ ] **Step 3:** Open `/admin/ausencias` (also via sidebar "Ausências"). Create a Licença (motivo dropdown shows the 11 SIGA motivos) of 8 days. Expected: row shows "Licença — <motivo> · … (8d)", situação "Solicitada". Click Deferir → Marcar gozada; confirm only valid transitions are offered. Create an "Outra ausência" with free-text motivo; the tipo filter splits them.
- [ ] **Step 4: Hub integration:** open `/admin/carreira` — the ausências cluster reflects the new licença/outra (projected events; indeferir/cancelar removes them). Confirm "Outra ausência" appears (tipo OUTRA_AUSENCIA) without errors.

---

## Self-Review

**Spec coverage:**
- §4 table + 2 enums + barrel + additive vf enum value + the 3 TS-enforced support edits + 2 migrations → Task 1. ✓
- §5 pure logic (calculos, transicoes, motivos, projecao, status-visual) → Tasks 2, 3. ✓
- §6 router (listar scoped+dias, criar transactional projection, atualizar NOT_FOUND/FORBIDDEN + transition gate + cascade with indeferida/cancelada soft-delete + tipo on event, remover) → Task 4. ✓
- §3 privacy → Task 4, structural test. ✓
- §7 UI (tipo filter, motivo dropdown for licenças, lifecycle actions, chips, nav) → Task 5. ✓
- §8 testing (pure + structural + schema incl. OUTRA_AUSENCIA present) → Tasks 1–4. ✓
- §9 out-of-scope: no scraper/afastamentos/suspensão-history/prorrogação; no money; no dominios edit. ✓

**Placeholder scan:** no TBDs; full code for schema/pure/router; Task 5 UI is "mirror diárias-view with these concrete swaps" (the sibling file is the literal template) — concrete field lists + JSX-level instructions, not vague.

**Type consistency:** `diasInclusive`/`podeTransicionar`/`projecaoEventoDeAusencia` (Tasks 2,3) consumed by the router (Task 4) and `ausenciaStatusInfo`/`LICENCA_MOTIVOS` by the UI (Task 5). `OUTRA_AUSENCIA` added to the vf enum (Task 1) lets the router set `vidaFuncionalEventos.tipo = "OUTRA_AUSENCIA"`. Situação literals match the enum; tipo literals (`licenca|outra_ausencia`) consistent.
