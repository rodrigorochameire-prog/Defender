# Módulo Pedidos Administrativos Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** A dedicated Pedidos Administrativos module — administrative requests with a lifecycle + SEI, projecting a `SOLICITACAO_ADM` vida_funcional event so the Carreira Hub's `administrativo` cluster + `pedidosPendentes` + `proximoPrazo` KPIs light up, with no carreira changes.

**Architecture:** One Drizzle table (`pedidos_administrativos`) + enum. Pure logic in `src/lib/pedidos-administrativos/` (transicoes, projecao, status-visual — unit-tested). A new `persist.ts` helper (the `ferias.ts criarParcela` insert-evento→insert-record→backfill pattern, extracted). A tRPC router + a client page + nav. Mirrors the shipped Férias module.

**Tech Stack:** Next.js 15, tRPC, Drizzle/Postgres, Tailwind + Padrão Defender v5, vitest.

## Global Constraints

- **No vida_funcional enum change** — `SOLICITACAO_ADM` + `administrativo` already exist.
- **Projection:** vida_funcional event, tipo `SOLICITACAO_ADM`, cluster `administrativo`, `origem:"manual"`, carries `prazo`, `dados.pedidoId`. NO valorCents, NO dataFim. `cancelado` → soft-delete the event. NO carreira changes.
- **Status mapping** (feeds the Hub KPIs): `solicitado→pendente`, `em_analise→em_curso`, `deferido→concluido`, `indeferido→arquivado`.
- **Privacy:** `listar` scoped via `getVidaFuncionalScope`; writes titular-only (`NOT_FOUND`→`FORBIDDEN`). Transactions; soft-delete filters everywhere. No money, no afastamento.
- Migration hand-scoped (NOT `db:generate`), idempotent. Status chips: pedidos-local resolver.

---

### Task 1: Schema + migration

**Files:**
- Create: `src/lib/db/schema/pedidos-administrativos.ts`
- Modify: `src/lib/db/schema/index.ts` (barrel)
- Create: `drizzle/0065_pedidos_administrativos.sql`
- Test: `src/lib/db/schema/__tests__/pedidos-administrativos-schema.test.ts`

**Interfaces:**
- Produces: `pedidoEstadoEnum`, `pedidosAdministrativos`, types.

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/db/schema/__tests__/pedidos-administrativos-schema.test.ts
import { describe, it, expect } from "vitest";
import { pedidosAdministrativos, pedidoEstadoEnum } from "@/lib/db/schema";

describe("pedidos administrativos schema", () => {
  it("exports the table and estado enum", () => {
    expect(pedidosAdministrativos).toBeDefined();
    expect(pedidoEstadoEnum.enumValues).toEqual(["solicitado","em_analise","deferido","indeferido","cancelado"]);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/lib/db/schema/__tests__/pedidos-administrativos-schema.test.ts`
Expected: FAIL.

- [ ] **Step 3: Write the schema**

```ts
// src/lib/db/schema/pedidos-administrativos.ts
import { pgTable, pgEnum, serial, integer, text, date, timestamp, index } from "drizzle-orm/pg-core";
import { users } from "./core";

export const pedidoEstadoEnum = pgEnum("pedido_estado", [
  "solicitado", "em_analise", "deferido", "indeferido", "cancelado",
]);

export const pedidosAdministrativos = pgTable("pedidos_administrativos", {
  id: serial("id").primaryKey(),
  defensorId: integer("defensor_id").references(() => users.id).notNull(),
  assunto: text("assunto").notNull(),
  descricao: text("descricao"),
  dataPedido: date("data_pedido").notNull(),
  prazo: date("prazo"),
  estado: pedidoEstadoEnum("estado").default("solicitado").notNull(),
  seiProtocolo: text("sei_protocolo"),
  observacao: text("observacao"),
  vidaFuncionalEventoId: integer("vida_funcional_evento_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  deletedAt: timestamp("deleted_at"),
}, (table) => [
  index("pedidos_adm_defensor_estado_deleted_idx").on(table.defensorId, table.estado, table.deletedAt),
  index("pedidos_adm_defensor_prazo_idx").on(table.defensorId, table.prazo),
]);

export type PedidoAdministrativo = typeof pedidosAdministrativos.$inferSelect;
export type InsertPedidoAdministrativo = typeof pedidosAdministrativos.$inferInsert;
```

Append to `src/lib/db/schema/index.ts`: `export * from "./pedidos-administrativos";`

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/lib/db/schema/__tests__/pedidos-administrativos-schema.test.ts`
Expected: PASS.

- [ ] **Step 5: Write the scoped migration**

```sql
-- drizzle/0065_pedidos_administrativos.sql
-- Módulo Pedidos Administrativos (idempotente).
DO $$ BEGIN
  CREATE TYPE "public"."pedido_estado" AS ENUM('solicitado', 'em_analise', 'deferido', 'indeferido', 'cancelado');
EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "pedidos_administrativos" (
	"id" serial PRIMARY KEY NOT NULL,
	"defensor_id" integer NOT NULL,
	"assunto" text NOT NULL,
	"descricao" text,
	"data_pedido" date NOT NULL,
	"prazo" date,
	"estado" "pedido_estado" DEFAULT 'solicitado' NOT NULL,
	"sei_protocolo" text,
	"observacao" text,
	"vida_funcional_evento_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "pedidos_administrativos" ADD CONSTRAINT "pedidos_administrativos_defensor_id_users_id_fk" FOREIGN KEY ("defensor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "pedidos_adm_defensor_estado_deleted_idx" ON "pedidos_administrativos" USING btree ("defensor_id","estado","deleted_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "pedidos_adm_defensor_prazo_idx" ON "pedidos_administrativos" USING btree ("defensor_id","prazo");
```

- [ ] **Step 6: Commit**

```bash
git add src/lib/db/schema/pedidos-administrativos.ts src/lib/db/schema/index.ts drizzle/0065_pedidos_administrativos.sql src/lib/db/schema/__tests__/pedidos-administrativos-schema.test.ts
git commit -m "feat(pedidos-adm): schema pedidos_administrativos + migration 0065"
```

---

### Task 2: Pure logic — transições + projeção + status visual

**Files:**
- Create: `src/lib/pedidos-administrativos/transicoes.ts`, `projecao.ts`, `status-visual.ts`
- Test: `src/lib/pedidos-administrativos/__tests__/transicoes.test.ts`, `projecao.test.ts`, `status-visual.test.ts`

**Interfaces:**
- Produces: `podeTransicionar`; `statusEventoDePedido`, `tituloPedido`, `projecaoEventoDePedido`; `pedidoStatusInfo`.

- [ ] **Step 1: Write the failing tests**

```ts
// src/lib/pedidos-administrativos/__tests__/transicoes.test.ts
import { describe, it, expect } from "vitest";
import { podeTransicionar } from "../transicoes";
describe("podeTransicionar", () => {
  it("allows valid edges", () => {
    expect(podeTransicionar("solicitado","em_analise")).toBe(true);
    expect(podeTransicionar("solicitado","indeferido")).toBe(true);
    expect(podeTransicionar("solicitado","cancelado")).toBe(true);
    expect(podeTransicionar("em_analise","deferido")).toBe(true);
    expect(podeTransicionar("em_analise","indeferido")).toBe(true);
  });
  it("rejects invalid edges and terminals", () => {
    expect(podeTransicionar("solicitado","deferido")).toBe(false);
    expect(podeTransicionar("deferido","cancelado")).toBe(false);
    expect(podeTransicionar("indeferido","em_analise")).toBe(false);
  });
  it("rejects unknown", () => { expect(podeTransicionar("foo","bar")).toBe(false); });
});
```

```ts
// src/lib/pedidos-administrativos/__tests__/projecao.test.ts
import { describe, it, expect } from "vitest";
import { statusEventoDePedido, tituloPedido, projecaoEventoDePedido } from "../projecao";
describe("statusEventoDePedido", () => {
  it("maps estado to vf status", () => {
    expect(statusEventoDePedido("solicitado")).toBe("pendente");
    expect(statusEventoDePedido("em_analise")).toBe("em_curso");
    expect(statusEventoDePedido("deferido")).toBe("concluido");
    expect(statusEventoDePedido("indeferido")).toBe("arquivado");
  });
});
describe("tituloPedido", () => {
  it("uses the assunto, with fallback", () => {
    expect(tituloPedido("Certidão de tempo de serviço")).toBe("Certidão de tempo de serviço");
    expect(tituloPedido("  ")).toBe("Solicitação administrativa");
  });
});
describe("projecaoEventoDePedido", () => {
  it("builds the projection carrying prazo, no valorCents/dataFim", () => {
    const p = projecaoEventoDePedido({ id: 4, assunto: "Auxílio-saúde", dataPedido: "2026-07-01", prazo: "2026-07-20", estado: "em_analise" });
    expect(p).toEqual({
      tipo: "SOLICITACAO_ADM", cluster: "administrativo", titulo: "Auxílio-saúde",
      dataEvento: "2026-07-01", prazo: "2026-07-20", status: "em_curso", dados: { pedidoId: 4 },
    });
    expect("valorCents" in p).toBe(false);
    expect("dataFim" in p).toBe(false);
  });
  it("accepts null id + null prazo", () => {
    const p = projecaoEventoDePedido({ id: null, assunto: "X", dataPedido: "2026-07-01", prazo: null, estado: "solicitado" });
    expect(p.dados.pedidoId).toBeNull();
    expect(p.prazo).toBeNull();
    expect(p.status).toBe("pendente");
  });
});
```

```ts
// src/lib/pedidos-administrativos/__tests__/status-visual.test.ts
import { describe, it, expect } from "vitest";
import { pedidoStatusInfo } from "../status-visual";
describe("pedidoStatusInfo", () => {
  it("labels every estado", () => {
    expect(pedidoStatusInfo("solicitado").label).toBe("Solicitado");
    expect(pedidoStatusInfo("em_analise").label).toBe("Em análise");
    expect(pedidoStatusInfo("deferido").label).toBe("Deferido");
    expect(pedidoStatusInfo("indeferido").label).toBe("Indeferido");
    expect(pedidoStatusInfo("cancelado").label).toBe("Cancelado");
  });
  it("badge+dot for all; neutral fallback echoes unknown", () => {
    for (const s of ["solicitado","em_analise","deferido","indeferido","cancelado"]) {
      const r = pedidoStatusInfo(s); expect(r.badge.length).toBeGreaterThan(0); expect(r.dot.length).toBeGreaterThan(0);
    }
    expect(pedidoStatusInfo("xpto").label).toBe("xpto");
    expect(pedidoStatusInfo("xpto").badge).toContain("neutral");
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/lib/pedidos-administrativos/__tests__/transicoes.test.ts src/lib/pedidos-administrativos/__tests__/projecao.test.ts src/lib/pedidos-administrativos/__tests__/status-visual.test.ts`
Expected: FAIL — modules not found.

- [ ] **Step 3: Write the implementations**

```ts
// src/lib/pedidos-administrativos/transicoes.ts
export type PedidoEstado = "solicitado" | "em_analise" | "deferido" | "indeferido" | "cancelado";
export const TRANSICOES: Record<PedidoEstado, PedidoEstado[]> = {
  solicitado: ["em_analise", "indeferido", "cancelado"],
  em_analise: ["deferido", "indeferido", "cancelado"],
  deferido: [],
  indeferido: [],
  cancelado: [],
};
export function podeTransicionar(de: string, para: string): boolean {
  const allowed = TRANSICOES[de as PedidoEstado];
  return Array.isArray(allowed) && allowed.includes(para as PedidoEstado);
}
```

```ts
// src/lib/pedidos-administrativos/projecao.ts
export function statusEventoDePedido(estado: string): "previsto" | "pendente" | "em_curso" | "concluido" | "arquivado" {
  if (estado === "solicitado") return "pendente";
  if (estado === "em_analise") return "em_curso";
  if (estado === "deferido") return "concluido";
  if (estado === "indeferido") return "arquivado";
  return "previsto";
}

export function tituloPedido(assunto: string): string {
  const t = (assunto ?? "").trim();
  return t.length ? t : "Solicitação administrativa";
}

export type ProjecaoPedidoEvento = {
  tipo: "SOLICITACAO_ADM";
  cluster: "administrativo";
  titulo: string;
  dataEvento: string;
  prazo: string | null;
  status: "previsto" | "pendente" | "em_curso" | "concluido" | "arquivado";
  dados: { pedidoId: number | null };
};

export function projecaoEventoDePedido(
  pedido: { id: number | null; assunto: string; dataPedido: string; prazo: string | null; estado: string },
): ProjecaoPedidoEvento {
  return {
    tipo: "SOLICITACAO_ADM",
    cluster: "administrativo",
    titulo: tituloPedido(pedido.assunto),
    dataEvento: pedido.dataPedido,
    prazo: pedido.prazo,
    status: statusEventoDePedido(pedido.estado),
    dados: { pedidoId: pedido.id },
  };
}
```

```ts
// src/lib/pedidos-administrativos/status-visual.ts
import type { VisualTipo } from "@/lib/config/tipologia";
const NEUTRAL = { badge: "bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400", dot: "bg-neutral-400" };
const SKY = { badge: "bg-sky-50 text-sky-700 dark:bg-sky-950/30 dark:text-sky-400", dot: "bg-sky-500" };
const EMERALD = { badge: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400", dot: "bg-emerald-500" };
const ROSE = { badge: "bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-400", dot: "bg-rose-500" };

const MAP: Record<string, VisualTipo> = {
  solicitado: { label: "Solicitado", ...NEUTRAL },
  em_analise: { label: "Em análise", ...SKY },
  deferido: { label: "Deferido", ...EMERALD },
  indeferido: { label: "Indeferido", ...ROSE },
  cancelado: { label: "Cancelado", ...NEUTRAL },
};

export function pedidoStatusInfo(estado?: string | null): VisualTipo {
  const k = (estado ?? "").trim().toLowerCase();
  return MAP[k] ?? { label: estado ?? "—", ...NEUTRAL };
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/lib/pedidos-administrativos/__tests__/transicoes.test.ts src/lib/pedidos-administrativos/__tests__/projecao.test.ts src/lib/pedidos-administrativos/__tests__/status-visual.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/pedidos-administrativos/transicoes.ts src/lib/pedidos-administrativos/projecao.ts src/lib/pedidos-administrativos/status-visual.ts src/lib/pedidos-administrativos/__tests__/
git commit -m "feat(pedidos-adm): transições + projeção (SOLICITACAO_ADM, carrega prazo) + status visual"
```

---

### Task 3: persist helper + router + registration

**Files:**
- Create: `src/lib/pedidos-administrativos/persist.ts`
- Create: `src/lib/trpc/routers/pedidos-administrativos.ts`
- Modify: `src/lib/trpc/routers/index.ts`
- Test: `src/lib/trpc/routers/__tests__/pedidos-administrativos-router.test.ts`

**Interfaces:**
- Produces: `criarPedidoComEvento(tx, defensorId, fields)`; `pedidosAdministrativosRouter` (`listar`/`criar`/`atualizar`/`remover`), registered as `appRouter.pedidosAdministrativos`.

- [ ] **Step 1: Write the persist helper**

```ts
// src/lib/pedidos-administrativos/persist.ts
import { eq } from "drizzle-orm";
import { pedidosAdministrativos, vidaFuncionalEventos } from "@/lib/db/schema";
import { projecaoEventoDePedido } from "@/lib/pedidos-administrativos/projecao";

export type CriarPedidoFields = {
  assunto: string;
  descricao?: string | null;
  dataPedido: string;
  prazo?: string | null;
  estado?: "solicitado" | "em_analise" | "deferido" | "indeferido" | "cancelado";
  seiProtocolo?: string | null;
  observacao?: string | null;
};

export async function criarPedidoComEvento(tx: any, defensorId: number, fields: CriarPedidoFields) {
  const estado = fields.estado ?? "solicitado";
  const proj = projecaoEventoDePedido({
    id: null, assunto: fields.assunto, dataPedido: fields.dataPedido, prazo: fields.prazo ?? null, estado,
  });
  const [evento] = await tx.insert(vidaFuncionalEventos).values({
    defensorId,
    tipo: proj.tipo, cluster: proj.cluster, titulo: proj.titulo,
    dataEvento: proj.dataEvento, prazo: proj.prazo, status: proj.status,
    origem: "manual", dados: { pedidoId: null },
  }).returning({ id: vidaFuncionalEventos.id });

  const [p] = await tx.insert(pedidosAdministrativos).values({
    defensorId,
    assunto: fields.assunto,
    descricao: fields.descricao ?? null,
    dataPedido: fields.dataPedido,
    prazo: fields.prazo ?? null,
    estado,
    seiProtocolo: fields.seiProtocolo ?? null,
    observacao: fields.observacao ?? null,
    vidaFuncionalEventoId: evento.id,
  }).returning();

  await tx.update(vidaFuncionalEventos).set({ dados: { pedidoId: p.id } }).where(eq(vidaFuncionalEventos.id, evento.id));
  return p;
}
```

- [ ] **Step 2: Write the structural test**

```ts
// src/lib/trpc/routers/__tests__/pedidos-administrativos-router.test.ts
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it, expect } from "vitest";
const ROUTERS = join(process.cwd(), "src/lib/trpc/routers");
const read = (rel: string) => readFileSync(join(ROUTERS, rel), "utf8");

describe("pedidos administrativos router — contract", () => {
  const src = read("pedidos-administrativos.ts");
  it("scopes reads with getVidaFuncionalScope", () => { expect(src).toContain("getVidaFuncionalScope"); });
  it("filters soft-deleted", () => { expect(src).toMatch(/isNull\([^)]*deletedAt\)/); });
  it("guards titular + NOT_FOUND", () => { expect(src).toContain("FORBIDDEN"); expect(src).toContain("NOT_FOUND"); });
  it("gates estado via podeTransicionar", () => { expect(src).toContain("podeTransicionar"); });
  it("wraps writes in a transaction", () => { expect(src).toContain("db.transaction"); });
  it("criar uses the persist helper", () => { expect(src).toContain("criarPedidoComEvento"); });
  it("soft-deletes the event on cancelado", () => { expect(src).toContain("cancelado"); });
  it("does NOT reference afastamentos", () => { expect(src).not.toContain("afastamentos"); });
  it("is registered", () => { const i = read("index.ts"); expect(i).toContain("pedidosAdministrativosRouter"); expect(i).toMatch(/pedidosAdministrativos:\s*pedidosAdministrativosRouter/); });
});
```

- [ ] **Step 3: Run the test (fails), then write the router**

Run: `npx vitest run src/lib/trpc/routers/__tests__/pedidos-administrativos-router.test.ts` → FAIL.

```ts
// src/lib/trpc/routers/pedidos-administrativos.ts
import { z } from "zod";
import { and, asc, eq, inArray, isNull } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../init";
import { db } from "@/lib/db";
import { pedidosAdministrativos, vidaFuncionalEventos } from "@/lib/db/schema";
import { getVidaFuncionalScope } from "../vida-funcional-scope";
import { podeTransicionar } from "@/lib/pedidos-administrativos/transicoes";
import { projecaoEventoDePedido, statusEventoDePedido } from "@/lib/pedidos-administrativos/projecao";
import { criarPedidoComEvento } from "@/lib/pedidos-administrativos/persist";

const ISO = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "data inválida (AAAA-MM-DD)");
const ESTADO = z.enum(["solicitado", "em_analise", "deferido", "indeferido", "cancelado"]);

const baseFields = {
  assunto: z.string().min(1),
  descricao: z.string().nullable().optional(),
  dataPedido: ISO,
  prazo: ISO.nullable().optional(),
  seiProtocolo: z.string().nullable().optional(),
  observacao: z.string().nullable().optional(),
};

const updateInput = z.object(baseFields).partial().extend({
  id: z.number().int(),
  estado: ESTADO.optional(),
});

export const pedidosAdministrativosRouter = router({
  listar: protectedProcedure.query(async ({ ctx }) => {
    const scope = getVidaFuncionalScope(ctx.user);
    return await db.select().from(pedidosAdministrativos)
      .where(and(isNull(pedidosAdministrativos.deletedAt), inArray(pedidosAdministrativos.defensorId, scope)))
      .orderBy(asc(pedidosAdministrativos.dataPedido));
  }),

  criar: protectedProcedure.input(z.object(baseFields)).mutation(async ({ ctx, input }) => {
    return await db.transaction(async (tx) =>
      criarPedidoComEvento(tx, ctx.user.id, {
        assunto: input.assunto, descricao: input.descricao ?? null,
        dataPedido: input.dataPedido, prazo: input.prazo ?? null,
        seiProtocolo: input.seiProtocolo ?? null, observacao: input.observacao ?? null,
      }),
    );
  }),

  atualizar: protectedProcedure.input(updateInput).mutation(async ({ ctx, input }) => {
    const [p] = await db.select().from(pedidosAdministrativos)
      .where(and(eq(pedidosAdministrativos.id, input.id), isNull(pedidosAdministrativos.deletedAt))).limit(1);
    if (!p) throw new TRPCError({ code: "NOT_FOUND", message: "Pedido não encontrado" });
    if (p.defensorId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN", message: "Só o titular altera seus pedidos" });

    if (input.estado && input.estado !== p.estado && !podeTransicionar(p.estado, input.estado)) {
      throw new TRPCError({ code: "BAD_REQUEST", message: `Transição inválida: ${p.estado} → ${input.estado}` });
    }

    const novoEstado = input.estado ?? p.estado;
    const novoAssunto = input.assunto ?? p.assunto;
    const novaData = input.dataPedido ?? p.dataPedido;
    const novoPrazo = input.prazo === undefined ? p.prazo : input.prazo;
    const proj = projecaoEventoDePedido({ id: p.id, assunto: novoAssunto, dataPedido: novaData, prazo: novoPrazo, estado: novoEstado });

    return await db.transaction(async (tx) => {
      await tx.update(pedidosAdministrativos).set({
        assunto: novoAssunto,
        descricao: input.descricao === undefined ? p.descricao : input.descricao,
        dataPedido: novaData,
        prazo: novoPrazo,
        estado: novoEstado,
        seiProtocolo: input.seiProtocolo === undefined ? p.seiProtocolo : input.seiProtocolo,
        observacao: input.observacao === undefined ? p.observacao : input.observacao,
        updatedAt: new Date(),
      }).where(eq(pedidosAdministrativos.id, p.id));

      if (p.vidaFuncionalEventoId != null) {
        if (novoEstado === "cancelado") {
          await tx.update(vidaFuncionalEventos).set({ deletedAt: new Date() }).where(eq(vidaFuncionalEventos.id, p.vidaFuncionalEventoId));
        } else {
          await tx.update(vidaFuncionalEventos).set({
            status: proj.status, titulo: proj.titulo,
            dataEvento: proj.dataEvento, prazo: proj.prazo,
            deletedAt: null, updatedAt: new Date(),
          }).where(eq(vidaFuncionalEventos.id, p.vidaFuncionalEventoId));
        }
      }
      return { ok: true };
    });
  }),

  remover: protectedProcedure.input(z.object({ id: z.number().int() })).mutation(async ({ ctx, input }) => {
    const [p] = await db.select().from(pedidosAdministrativos)
      .where(and(eq(pedidosAdministrativos.id, input.id), isNull(pedidosAdministrativos.deletedAt))).limit(1);
    if (!p) throw new TRPCError({ code: "NOT_FOUND", message: "Pedido não encontrado" });
    if (p.defensorId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN", message: "Só o titular altera seus pedidos" });

    return await db.transaction(async (tx) => {
      await tx.update(pedidosAdministrativos).set({ deletedAt: new Date() }).where(eq(pedidosAdministrativos.id, p.id));
      if (p.vidaFuncionalEventoId != null) {
        await tx.update(vidaFuncionalEventos).set({ deletedAt: new Date() }).where(eq(vidaFuncionalEventos.id, p.vidaFuncionalEventoId));
      }
      return { ok: true };
    });
  }),
});
```

Register in `index.ts`: `import { pedidosAdministrativosRouter } from "./pedidos-administrativos";` + `pedidosAdministrativos: pedidosAdministrativosRouter,` (near `vidaFuncional`/`carreira`).

- [ ] **Step 4: Run the structural test + typecheck**

Run: `npx vitest run src/lib/trpc/routers/__tests__/pedidos-administrativos-router.test.ts` → PASS.
Run: `npx tsc --noEmit` → no new errors from the new files. (Confirm `vidaFuncionalEventos` has a `prazo` column — it does; and `dados` accepts `{ pedidoId }`.)

- [ ] **Step 5: Commit**

```bash
git add src/lib/pedidos-administrativos/persist.ts src/lib/trpc/routers/pedidos-administrativos.ts src/lib/trpc/routers/index.ts src/lib/trpc/routers/__tests__/pedidos-administrativos-router.test.ts
git commit -m "feat(pedidos-adm): persist helper + router (CRUD + projeção/cascata, guards, transações)"
```

---

### Task 4: UI page + nav

**Files:**
- Create: `src/app/(dashboard)/admin/pedidos-administrativos/page.tsx`, `_components/pedidos-view.tsx`
- Modify: `src/components/layouts/admin-sidebar.tsx` (CARREIRA_NAV)

**Interfaces:**
- Consumes: `trpc.pedidosAdministrativos.listar`/`criar`/`atualizar`/`remover`; `pedidoStatusInfo`; `podeTransicionar`.

- [ ] **Step 1: Read `src/app/(dashboard)/admin/ferias/_components/ferias-view.tsx`** — the chrome to mirror (page wrapper outside `CollapsiblePageHeader` with KPI chips as children, `inputCls`, `trpc.useUtils()` invalidation, `StatusChip`, `EmptyState`+icon, loading-guard, dark-mode, per-card mutation-error scoping).

- [ ] **Step 2: Write `page.tsx`** (server, thin):

```tsx
// src/app/(dashboard)/admin/pedidos-administrativos/page.tsx
import { PedidosView } from "./_components/pedidos-view";
export default function PedidosAdministrativosPage() {
  return <PedidosView />;
}
```

- [ ] **Step 3: Write `pedidos-view.tsx`** (client). Mirror ferias-view chrome. Concrete behaviour:
- Query `trpc.pedidosAdministrativos.listar`; mutations `criar`/`atualizar`/`remover` with `useUtils` invalidation.
- KPI chips: **Pendentes** (`estado==="solicitado"` count) · **Em análise** (`estado==="em_analise"`) · **Deferidos** (`estado==="deferido"`) · **Total**.
- Rows: `{assunto}` + `dataPedido`, `prazo` when present (muted), `<StatusChip info={pedidoStatusInfo(p.estado)} />`, `seiProtocolo` metadata, action buttons filtered by `podeTransicionar(p.estado, target)` for `["em_analise","deferido","indeferido","cancelado"]` (labels: Em análise / Deferir / Indeferir / Cancelar) → `atualizar.mutate({ id, estado })`; plus "Excluir" with `window.confirm`.
- Form (create): assunto, descricao, dataPedido, prazo, seiProtocolo, observacao — using `inputCls` (dark-mode). `criar.mutate({...})` with `|| null` on optionals.
- `EmptyState icon={FileText}` (import from lucide-react); loading-guard; per-card mutation-error scoping (gate `atualizar.error`/`remover.error` on the row's id via `.variables`). No money/R$.

- [ ] **Step 4: Add the sidebar nav entry**

In `src/components/layouts/admin-sidebar.tsx`, add to `CARREIRA_NAV`:

```ts
  { label: "Pedidos Adm.", path: "/admin/pedidos-administrativos", icon: "FileText" },
```

(`FileText` is already used elsewhere in the sidebar — confirm it's in the `iconMap`; if not, add the import + map entry.)

- [ ] **Step 5: Verify + commit**

Run: `npx tsc --noEmit` → no new errors from the new files. (If `StatusChip`/`EmptyState`/`Button`/`CollapsiblePageHeader` props differ, read the source and adjust; `CARD_STYLE.base` already includes `p-4`.)
Run: `npx vitest run src/lib/pedidos-administrativos src/lib/db/schema/__tests__/pedidos-administrativos-schema.test.ts src/lib/trpc/routers/__tests__/pedidos-administrativos-router.test.ts` → PASS.

```bash
git add "src/app/(dashboard)/admin/pedidos-administrativos/page.tsx" "src/app/(dashboard)/admin/pedidos-administrativos/_components/pedidos-view.tsx" src/components/layouts/admin-sidebar.tsx
git commit -m "feat(pedidos-adm): página de Pedidos Administrativos (lifecycle, SEI, prazo) + nav"
```

---

### Task 5: Manual smoke check

**Files:** none.

- [ ] **Step 1:** Apply migration (env with DB): `npm run db:push`. Expected: `pedidos_administrativos` + `pedido_estado` enum created.
- [ ] **Step 2:** `npm run dev:turbo`; open `/admin/pedidos-administrativos` (also via sidebar "Pedidos Adm."). Create a pedido (assunto "Certidão de tempo de serviço", prazo in 15 days). Expected: row shows it as "Solicitado". Click Em análise → Deferir; confirm only valid transitions are offered.
- [ ] **Step 3:** Open `/admin/carreira` — the "pedidos pendentes" KPI reflects the new solicitado/em_analise pedido, and (if prazo set) the "próximo prazo" KPI surfaces it. Deferir/cancelar removes it from pendentes. Cancel → the projected event soft-deletes.

---

## Self-Review

**Spec coverage:** §4 table + barrel + migration → Task 1; §5 pure logic → Task 2; §6 router (listar scoped, criar via persist, atualizar NOT_FOUND/FORBIDDEN + transition gate + cascade with cancelado soft-delete + prazo, remover) + persist helper → Task 3; §7 UI (KPIs, lifecycle actions, SEI/prazo, nav) → Task 4; §8 testing → Tasks 1–3. ✓ No vida_funcional enum change; no carreira change (projection feeds existing KPIs); no money/afastamento. ✓

**Placeholder scan:** full code for schema/pure/persist/router; Task 4 UI is "mirror ferias-view with these concrete swaps" — concrete field/JSX-level instructions. No TBDs.

**Type consistency:** `podeTransicionar`/`projecaoEventoDePedido`/`statusEventoDePedido` (Task 2) consumed by persist (Task 3) + router (Task 3) + UI (Task 4); `pedidoStatusInfo` (Task 2) → UI. `criarPedidoComEvento` (Task 3) used by `criar`. `prazo` carried end to end (projection → event → panorama proximoPrazo). estado literals match the `pedido_estado` enum. The projection event sets `prazo` (real column) and NO `valorCents`/`dataFim`.
