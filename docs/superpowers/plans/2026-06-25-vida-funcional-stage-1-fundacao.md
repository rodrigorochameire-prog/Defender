# Vida Funcional — Stage 1 (Fundação) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Entregar a fundação da Vida Funcional — a tabela de eventos polimórficos privada por defensor, com router tRPC CRUD escopado, alcançável por um novo grupo de navegação "Carreira" e uma página inicial mínima.

**Architecture:** Uma tabela `vida_funcional_eventos` (tipo polimórfico + `dados jsonb`). Helpers puros para mapa tipo→cluster e para o escopo de acesso privado (`getVidaFuncionalScope` — sem god-view de admin). Router `vidaFuncional` com list/get/create/update/delete, todos filtrados pelo escopo. Novo grupo de sidebar "Carreira" → item "Vida Funcional" → página `/admin/carreira/vida-funcional`.

**Tech Stack:** Next.js 15 (App Router), tRPC v11 + superjson, Drizzle ORM (PostgreSQL/Supabase), Zod, Vitest, Tailwind/Padrão Defender, lucide-react.

**Escopo deste plano:** apenas Stage 1 da spec `docs/superpowers/specs/2026-06-25-vida-funcional-design.md`. Stages 2–5 (telas bento/trajetória/detalhe, Radar, indexador+sugestões, Produtividade) terão planos próprios. A tabela `vida_funcional_sugestoes` é deliberadamente adiada para o plano do Stage 4 (YAGNI).

## Global Constraints

- **Imports absolutos** via alias `@/` (configurado em `vitest.config.ts` e `tsconfig`).
- **Install:** usar `pnpm` (não `npm ci`). Scripts do projeto rodam via `npm run <script>`.
- **Gate de teste honesto:** `CI=1 vitest run` (testes que tocam o banco ficam quarentenados no CI via `CI_QUARANTINE` em `vitest.config.ts`; rodam localmente com `npm test`).
- **Build gate:** `npm run build` deve passar.
- **Soft delete:** toda exclusão é `deletedAt = now()`, nunca DELETE físico (exceto em teardown de teste).
- **Auditoria:** toda mutação chama `logAudit({...})` de `@/lib/audit`.
- **Privacidade (fonte única — §3.2 da spec):** Vida Funcional é privada ao defensor. Escopo = `{ próprio defensor }` + (estagiário) supervisor + (servidor) `defensoresVinculados`. **`admin` NÃO tem god-view.** Nunca há `"all"`.
- **Migrações:** `npm run db:generate` (gera SQL em `drizzle/`) e `npm run db:push` (aplica). `drizzle.config.ts` auto-globa `src/lib/db/schema/*.ts`.

---

### Task 1: Schema — enums + tabela `vida_funcional_eventos`

**Files:**
- Create: `src/lib/db/schema/vida-funcional.ts`
- Modify: `src/lib/db/schema/index.ts` (adicionar re-export)

**Interfaces:**
- Produces: tabela `vidaFuncionalEventos`; tipos `VidaFuncionalEvento`, `InsertVidaFuncionalEvento`; enums `vfTipoEventoEnum`, `vfClusterEnum`, `vfStatusEnum`, `vfOrigemEnum`. Colunas: `id, defensorId, tipo, cluster, titulo, descricao, dataEvento, dataFim, prazo, status, valorCents, driveFolderId, driveFileId, origem, dados, createdAt, updatedAt, deletedAt`.

- [ ] **Step 1: Criar o arquivo de schema**

Create `src/lib/db/schema/vida-funcional.ts`:

```typescript
import {
  pgTable,
  pgEnum,
  serial,
  integer,
  text,
  varchar,
  date,
  timestamp,
  bigint,
  jsonb,
  index,
} from "drizzle-orm/pg-core";
import { users } from "./core";

// ==========================================
// VIDA FUNCIONAL — Enums
// ==========================================

export const vfTipoEventoEnum = pgEnum("vf_tipo_evento", [
  // cluster: progressao
  "POSSE",
  "PROMOCAO",
  "REMOCAO",
  "TITULARIDADE",
  "ACUMULO",
  // cluster: ausencias
  "DESIGNACAO_RELEVANTE",
  "CONVOCACAO",
  "FERIAS",
  "LICENCA",
  "AFASTAMENTO",
  "COOPERACAO",
  // cluster: contraprestacao
  "DIARIA",
  "FOLGA",
  "TRABALHO_EXTRAORDINARIO",
  "SUBSTITUICAO",
  "GRATIFICACAO",
  "REEMBOLSO",
  // cluster: administrativo
  "SOLICITACAO_ADM",
]);

export const vfClusterEnum = pgEnum("vf_cluster", [
  "progressao",
  "ausencias",
  "contraprestacao",
  "administrativo",
]);

export const vfStatusEnum = pgEnum("vf_status", [
  "previsto",
  "em_curso",
  "concluido",
  "pendente",
  "arquivado",
]);

export const vfOrigemEnum = pgEnum("vf_origem", [
  "manual",
  "indexador",
  "skill",
]);

// ==========================================
// VIDA FUNCIONAL — Eventos (tabela polimórfica)
// ==========================================

export const vidaFuncionalEventos = pgTable("vida_funcional_eventos", {
  id: serial("id").primaryKey(),
  defensorId: integer("defensor_id").references(() => users.id).notNull(),
  tipo: vfTipoEventoEnum("tipo").notNull(),
  cluster: vfClusterEnum("cluster").notNull(),
  titulo: text("titulo").notNull(),
  descricao: text("descricao"),
  dataEvento: date("data_evento").notNull(),
  dataFim: date("data_fim"),
  prazo: date("prazo"),
  status: vfStatusEnum("status").default("previsto").notNull(),
  valorCents: bigint("valor_cents", { mode: "number" }),
  driveFolderId: varchar("drive_folder_id", { length: 100 }),
  driveFileId: varchar("drive_file_id", { length: 100 }),
  origem: vfOrigemEnum("origem").default("manual").notNull(),
  dados: jsonb("dados").$type<Record<string, unknown>>().default({}).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  deletedAt: timestamp("deleted_at"),
}, (table) => [
  index("vf_eventos_defensor_status_deleted_idx").on(table.defensorId, table.status, table.deletedAt),
  index("vf_eventos_defensor_tipo_data_idx").on(table.defensorId, table.tipo, table.dataEvento),
  index("vf_eventos_defensor_prazo_idx").on(table.defensorId, table.prazo),
  index("vf_eventos_cluster_idx").on(table.cluster),
]);

export type VidaFuncionalEvento = typeof vidaFuncionalEventos.$inferSelect;
export type InsertVidaFuncionalEvento = typeof vidaFuncionalEventos.$inferInsert;
```

- [ ] **Step 2: Re-exportar no barrel**

Modify `src/lib/db/schema/index.ts` — adicionar logo após `export * from "./funcional";`:

```typescript
export * from "./vida-funcional";
```

- [ ] **Step 3: Gerar a migração**

Run: `npm run db:generate`
Expected: cria um arquivo SQL novo em `drizzle/` contendo `CREATE TYPE "public"."vf_tipo_evento"`, os demais enums e `CREATE TABLE "vida_funcional_eventos"`.

- [ ] **Step 4: Aplicar no banco**

Run: `npm run db:push`
Expected: aplica sem erro; a tabela `vida_funcional_eventos` passa a existir.

- [ ] **Step 5: Verificar tipagem e build**

Run: `npx tsc --noEmit`
Expected: sem erros relativos a `vida-funcional.ts`.

- [ ] **Step 6: Commit**

```bash
git add src/lib/db/schema/vida-funcional.ts src/lib/db/schema/index.ts drizzle/
git commit -m "feat(carreira): schema vida_funcional_eventos (enums + tabela polimorfica)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: Helper puro — mapa tipo → cluster + marcos

**Files:**
- Create: `src/lib/vida-funcional/tipo-cluster.ts`
- Test: `__tests__/unit/vida-funcional-tipo-cluster.test.ts`

**Interfaces:**
- Consumes: nada.
- Produces: `tipoToCluster(tipo: VfTipo): VfCluster`; `isMarco(tipo: VfTipo): boolean`; constante `MARCO_TIPOS: readonly VfTipo[]`; tipos `VfTipo`, `VfCluster`.

- [ ] **Step 1: Escrever o teste que falha**

Create `__tests__/unit/vida-funcional-tipo-cluster.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { tipoToCluster, isMarco } from "@/lib/vida-funcional/tipo-cluster";

describe("tipoToCluster", () => {
  it("mapeia tipos de progressão", () => {
    expect(tipoToCluster("POSSE")).toBe("progressao");
    expect(tipoToCluster("PROMOCAO")).toBe("progressao");
    expect(tipoToCluster("ACUMULO")).toBe("progressao");
  });
  it("mapeia ausências", () => {
    expect(tipoToCluster("FERIAS")).toBe("ausencias");
    expect(tipoToCluster("CONVOCACAO")).toBe("ausencias");
  });
  it("mapeia contraprestação", () => {
    expect(tipoToCluster("FOLGA")).toBe("contraprestacao");
    expect(tipoToCluster("REEMBOLSO")).toBe("contraprestacao");
  });
  it("mapeia administrativo", () => {
    expect(tipoToCluster("SOLICITACAO_ADM")).toBe("administrativo");
  });
});

describe("isMarco", () => {
  it("marcos da trajetória são verdadeiros", () => {
    expect(isMarco("POSSE")).toBe(true);
    expect(isMarco("PROMOCAO")).toBe(true);
    expect(isMarco("CONVOCACAO")).toBe(true);
  });
  it("operacionais não são marcos", () => {
    expect(isMarco("FOLGA")).toBe(false);
    expect(isMarco("REEMBOLSO")).toBe(false);
    expect(isMarco("SOLICITACAO_ADM")).toBe(false);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `CI=1 npx vitest run __tests__/unit/vida-funcional-tipo-cluster.test.ts`
Expected: FAIL — "Cannot find module '@/lib/vida-funcional/tipo-cluster'".

- [ ] **Step 3: Implementar**

Create `src/lib/vida-funcional/tipo-cluster.ts`:

```typescript
export type VfTipo =
  | "POSSE" | "PROMOCAO" | "REMOCAO" | "TITULARIDADE" | "ACUMULO"
  | "DESIGNACAO_RELEVANTE" | "CONVOCACAO" | "FERIAS" | "LICENCA" | "AFASTAMENTO" | "COOPERACAO"
  | "DIARIA" | "FOLGA" | "TRABALHO_EXTRAORDINARIO" | "SUBSTITUICAO" | "GRATIFICACAO" | "REEMBOLSO"
  | "SOLICITACAO_ADM";

export type VfCluster = "progressao" | "ausencias" | "contraprestacao" | "administrativo";

const TIPO_CLUSTER: Record<VfTipo, VfCluster> = {
  POSSE: "progressao",
  PROMOCAO: "progressao",
  REMOCAO: "progressao",
  TITULARIDADE: "progressao",
  ACUMULO: "progressao",
  DESIGNACAO_RELEVANTE: "ausencias",
  CONVOCACAO: "ausencias",
  FERIAS: "ausencias",
  LICENCA: "ausencias",
  AFASTAMENTO: "ausencias",
  COOPERACAO: "ausencias",
  DIARIA: "contraprestacao",
  FOLGA: "contraprestacao",
  TRABALHO_EXTRAORDINARIO: "contraprestacao",
  SUBSTITUICAO: "contraprestacao",
  GRATIFICACAO: "contraprestacao",
  REEMBOLSO: "contraprestacao",
  SOLICITACAO_ADM: "administrativo",
};

/** Tipos exibidos como marcos na Linha do Tempo de Carreira (Trajetória). */
export const MARCO_TIPOS = [
  "POSSE", "PROMOCAO", "REMOCAO", "TITULARIDADE", "ACUMULO",
  "DESIGNACAO_RELEVANTE", "CONVOCACAO",
] as const satisfies readonly VfTipo[];

export function tipoToCluster(tipo: VfTipo): VfCluster {
  return TIPO_CLUSTER[tipo];
}

export function isMarco(tipo: VfTipo): boolean {
  return (MARCO_TIPOS as readonly VfTipo[]).includes(tipo);
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `CI=1 npx vitest run __tests__/unit/vida-funcional-tipo-cluster.test.ts`
Expected: PASS (todos os casos verdes).

- [ ] **Step 5: Commit**

```bash
git add src/lib/vida-funcional/tipo-cluster.ts __tests__/unit/vida-funcional-tipo-cluster.test.ts
git commit -m "feat(carreira): helper tipo->cluster e isMarco (Trajetoria)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: Helper de escopo privado `getVidaFuncionalScope`

**Files:**
- Create: `src/lib/trpc/vida-funcional-scope.ts`
- Test: `__tests__/unit/vida-funcional-scope.test.ts`

**Interfaces:**
- Consumes: tipo `User` de `@/lib/db/schema`.
- Produces: `getVidaFuncionalScope(user: User): number[]` — sempre um array não-vazio de `defensorId` visíveis; **nunca `"all"`**; admin recebe só `[user.id]`.

- [ ] **Step 1: Escrever o teste que falha**

Create `__tests__/unit/vida-funcional-scope.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { getVidaFuncionalScope } from "@/lib/trpc/vida-funcional-scope";

const mk = (over: Record<string, unknown>) => ({
  id: 10, role: "defensor", supervisorId: null, defensoresVinculados: null, ...over,
} as any);

describe("getVidaFuncionalScope", () => {
  it("defensor vê só o próprio", () => {
    expect(getVidaFuncionalScope(mk({ id: 10, role: "defensor" }))).toEqual([10]);
  });
  it("admin NÃO tem god-view — vê só o próprio", () => {
    expect(getVidaFuncionalScope(mk({ id: 1, role: "admin" }))).toEqual([1]);
  });
  it("estagiário vê o supervisor", () => {
    expect(getVidaFuncionalScope(mk({ id: 20, role: "estagiario", supervisorId: 10 }))).toEqual([10]);
  });
  it("estagiário sem supervisor cai no próprio", () => {
    expect(getVidaFuncionalScope(mk({ id: 20, role: "estagiario", supervisorId: null }))).toEqual([20]);
  });
  it("servidor vê os defensores vinculados", () => {
    expect(getVidaFuncionalScope(mk({ id: 30, role: "servidor", defensoresVinculados: [10, 11] }))).toEqual([10, 11]);
  });
  it("servidor sem vínculo cai no próprio (sem god-view)", () => {
    expect(getVidaFuncionalScope(mk({ id: 30, role: "servidor", defensoresVinculados: null }))).toEqual([30]);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `CI=1 npx vitest run __tests__/unit/vida-funcional-scope.test.ts`
Expected: FAIL — módulo inexistente.

- [ ] **Step 3: Implementar**

Create `src/lib/trpc/vida-funcional-scope.ts`:

```typescript
import type { User } from "@/lib/db/schema";

/**
 * Escopo de acesso da Vida Funcional — PRIVADO ao defensor.
 *
 * Diferente de `getDefensoresVisiveis` (demandas), aqui NÃO existe "all":
 * admin não recebe god-view dos dados funcionais alheios (caráter sensível).
 * Retorna sempre um array não-vazio de defensorIds visíveis ao usuário.
 */
export function getVidaFuncionalScope(user: User): number[] {
  const supervisorId = (user as any).supervisorId as number | null | undefined;
  const vinculados = (user as any).defensoresVinculados as number[] | null | undefined;

  if (user.role === "estagiario") {
    return supervisorId ? [supervisorId] : [user.id];
  }
  if (user.role === "servidor") {
    return vinculados && vinculados.length > 0 ? vinculados : [user.id];
  }
  // defensor, admin, triagem: só o próprio (admin sem god-view)
  return [user.id];
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `CI=1 npx vitest run __tests__/unit/vida-funcional-scope.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/trpc/vida-funcional-scope.ts __tests__/unit/vida-funcional-scope.test.ts
git commit -m "feat(carreira): getVidaFuncionalScope (privado por defensor, admin sem god-view)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 4: Router tRPC `vidaFuncional` (CRUD escopado) + teste de integração

**Files:**
- Create: `src/lib/trpc/routers/vida-funcional.ts`
- Modify: `src/lib/trpc/routers/index.ts` (import + registro)
- Modify: `vitest.config.ts` (adicionar o teste de integração ao `CI_QUARANTINE`)
- Test: `__tests__/trpc/vida-funcional-router.test.ts`

**Interfaces:**
- Consumes: `getVidaFuncionalScope` (Task 3), `tipoToCluster` (Task 2), tabela `vidaFuncionalEventos` (Task 1), `protectedProcedure`/`router` (`@/lib/trpc/init`), `logAudit` (`@/lib/audit`).
- Produces: router `vidaFuncionalRouter` com `listEventos`, `getEvento`, `createEvento`, `updateEvento`, `deleteEvento`; registrado em `appRouter` como `vidaFuncional`.

- [ ] **Step 1: Implementar o router**

Create `src/lib/trpc/routers/vida-funcional.ts`:

```typescript
import { z } from "zod";
import { and, desc, eq, inArray, isNull } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../init";
import { db } from "@/lib/db";
import { vidaFuncionalEventos } from "@/lib/db/schema";
import { getVidaFuncionalScope } from "../vida-funcional-scope";
import { tipoToCluster, type VfTipo } from "@/lib/vida-funcional/tipo-cluster";
import { logAudit, diffFields } from "@/lib/audit";

const TIPO_VALUES = [
  "POSSE", "PROMOCAO", "REMOCAO", "TITULARIDADE", "ACUMULO",
  "DESIGNACAO_RELEVANTE", "CONVOCACAO", "FERIAS", "LICENCA", "AFASTAMENTO", "COOPERACAO",
  "DIARIA", "FOLGA", "TRABALHO_EXTRAORDINARIO", "SUBSTITUICAO", "GRATIFICACAO", "REEMBOLSO",
  "SOLICITACAO_ADM",
] as const;

const STATUS_VALUES = ["previsto", "em_curso", "concluido", "pendente", "arquivado"] as const;

const tipoSchema = z.enum(TIPO_VALUES);
const statusSchema = z.enum(STATUS_VALUES);

const createInput = z.object({
  tipo: tipoSchema,
  titulo: z.string().min(1).max(500),
  descricao: z.string().optional(),
  dataEvento: z.string(), // ISO date (YYYY-MM-DD)
  dataFim: z.string().optional(),
  prazo: z.string().optional(),
  status: statusSchema.optional(),
  valorCents: z.number().int().optional(),
  driveFolderId: z.string().max(100).optional(),
  driveFileId: z.string().max(100).optional(),
  dados: z.record(z.string(), z.unknown()).optional(),
  defensorId: z.number().int().optional(), // só se dentro do escopo
});

export const vidaFuncionalRouter = router({
  /** Lista eventos do escopo do usuário (privado por defensor). */
  listEventos: protectedProcedure
    .input(
      z.object({
        tipo: tipoSchema.optional(),
        cluster: z.enum(["progressao", "ausencias", "contraprestacao", "administrativo"]).optional(),
        status: statusSchema.optional(),
        marcosOnly: z.boolean().optional(),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const scope = getVidaFuncionalScope(ctx.user);
      const conditions = [
        isNull(vidaFuncionalEventos.deletedAt),
        inArray(vidaFuncionalEventos.defensorId, scope),
      ];
      if (input?.tipo) conditions.push(eq(vidaFuncionalEventos.tipo, input.tipo));
      if (input?.cluster) conditions.push(eq(vidaFuncionalEventos.cluster, input.cluster));
      if (input?.status) conditions.push(eq(vidaFuncionalEventos.status, input.status));

      return await db
        .select()
        .from(vidaFuncionalEventos)
        .where(and(...conditions))
        .orderBy(desc(vidaFuncionalEventos.dataEvento));
    }),

  /** Busca um evento por id, respeitando o escopo. */
  getEvento: protectedProcedure
    .input(z.object({ id: z.number().int() }))
    .query(async ({ ctx, input }) => {
      const scope = getVidaFuncionalScope(ctx.user);
      const [row] = await db
        .select()
        .from(vidaFuncionalEventos)
        .where(and(eq(vidaFuncionalEventos.id, input.id), isNull(vidaFuncionalEventos.deletedAt)))
        .limit(1);
      if (!row || !scope.includes(row.defensorId)) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Evento não encontrado" });
      }
      return row;
    }),

  /** Cria um evento. defensorId default = usuário; se informado, deve estar no escopo. */
  createEvento: protectedProcedure
    .input(createInput)
    .mutation(async ({ ctx, input }) => {
      const scope = getVidaFuncionalScope(ctx.user);
      const defensorId = input.defensorId ?? ctx.user.id;
      if (!scope.includes(defensorId)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Fora do seu escopo de vida funcional" });
      }
      const cluster = tipoToCluster(input.tipo as VfTipo);
      const [created] = await db
        .insert(vidaFuncionalEventos)
        .values({
          defensorId,
          tipo: input.tipo,
          cluster,
          titulo: input.titulo,
          descricao: input.descricao,
          dataEvento: input.dataEvento,
          dataFim: input.dataFim,
          prazo: input.prazo,
          status: input.status ?? "previsto",
          valorCents: input.valorCents,
          driveFolderId: input.driveFolderId,
          driveFileId: input.driveFileId,
          origem: "manual",
          dados: input.dados ?? {},
        })
        .returning();

      await logAudit({
        userId: ctx.user.id,
        userName: ctx.user.name,
        entityType: "vida_funcional_evento",
        entityId: created.id,
        action: "create",
        metadata: { tipo: created.tipo },
      });
      return created;
    }),

  /** Atualiza campos de um evento dentro do escopo. */
  updateEvento: protectedProcedure
    .input(
      z.object({ id: z.number().int() }).and(createInput.partial())
    )
    .mutation(async ({ ctx, input }) => {
      const scope = getVidaFuncionalScope(ctx.user);
      const { id, defensorId: _ignore, ...patch } = input;
      const [existing] = await db
        .select()
        .from(vidaFuncionalEventos)
        .where(and(eq(vidaFuncionalEventos.id, id), isNull(vidaFuncionalEventos.deletedAt)))
        .limit(1);
      if (!existing || !scope.includes(existing.defensorId)) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Evento não encontrado" });
      }
      const values: Record<string, unknown> = { ...patch, updatedAt: new Date() };
      if (patch.tipo) values.cluster = tipoToCluster(patch.tipo as VfTipo);
      const [updated] = await db
        .update(vidaFuncionalEventos)
        .set(values)
        .where(eq(vidaFuncionalEventos.id, id))
        .returning();

      await logAudit({
        userId: ctx.user.id,
        userName: ctx.user.name,
        entityType: "vida_funcional_evento",
        entityId: id,
        action: "update",
        changes: diffFields(existing as any, updated as any, ["titulo", "status", "prazo", "tipo"]),
      });
      return updated;
    }),

  /** Soft-delete de um evento dentro do escopo. */
  deleteEvento: protectedProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      const scope = getVidaFuncionalScope(ctx.user);
      const [existing] = await db
        .select()
        .from(vidaFuncionalEventos)
        .where(and(eq(vidaFuncionalEventos.id, input.id), isNull(vidaFuncionalEventos.deletedAt)))
        .limit(1);
      if (!existing || !scope.includes(existing.defensorId)) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Evento não encontrado" });
      }
      await db
        .update(vidaFuncionalEventos)
        .set({ deletedAt: new Date() })
        .where(eq(vidaFuncionalEventos.id, input.id));

      await logAudit({
        userId: ctx.user.id,
        userName: ctx.user.name,
        entityType: "vida_funcional_evento",
        entityId: input.id,
        action: "delete",
      });
      return { ok: true };
    }),
});
```

- [ ] **Step 2: Registrar o router**

Modify `src/lib/trpc/routers/index.ts`:
- Adicionar o import junto aos demais imports de routers:
```typescript
import { vidaFuncionalRouter } from "./vida-funcional";
```
- Adicionar a chave no objeto `appRouter` (ex.: após `demandas: demandasRouter,`):
```typescript
  vidaFuncional: vidaFuncionalRouter,
```

- [ ] **Step 3: Escrever o teste de integração**

Create `__tests__/trpc/vida-funcional-router.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema/core";
import { vidaFuncionalEventos } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { createCallerFactory } from "@/lib/trpc/init";
import { appRouter } from "@/lib/trpc/routers";

const createCaller = createCallerFactory(appRouter);
const mkCtx = (user: any) => ({ user, requestId: "test-" + Math.random(), selectedDefensorScopeId: null });

async function makeDefensor(suffix: string) {
  const [u] = await db.insert(users).values({
    name: "VF Test " + suffix,
    email: `vf-${suffix}-${Date.now()}-${Math.random()}@test.local`,
    role: "defensor",
    workspaceId: 1,
  } as any).returning();
  return u;
}

describe("vidaFuncional CRUD + isolamento", { timeout: 30000 }, () => {
  it("cria evento e recupera por id; calcula cluster", async () => {
    const a = await makeDefensor("a");
    try {
      const caller = createCaller(mkCtx(a));
      const ev = await caller.vidaFuncional.createEvento({
        tipo: "PROMOCAO", titulo: "Classe Especial", dataEvento: "2026-01-10",
      });
      expect(ev.id).toBeGreaterThan(0);
      expect(ev.cluster).toBe("progressao");
      expect(ev.defensorId).toBe(a.id);

      const fetched = await caller.vidaFuncional.getEvento({ id: ev.id });
      expect(fetched.titulo).toBe("Classe Especial");

      await db.delete(vidaFuncionalEventos).where(eq(vidaFuncionalEventos.id, ev.id));
    } finally {
      await db.delete(users).where(eq(users.id, a.id));
    }
  });

  it("defensor B NÃO vê o evento do defensor A (privado)", async () => {
    const a = await makeDefensor("a2");
    const b = await makeDefensor("b2");
    try {
      const ev = await createCaller(mkCtx(a)).vidaFuncional.createEvento({
        tipo: "FERIAS", titulo: "Férias de A", dataEvento: "2026-05-04",
      });
      const listB = await createCaller(mkCtx(b)).vidaFuncional.listEventos({});
      expect(listB.some((e) => e.id === ev.id)).toBe(false);
      await expect(createCaller(mkCtx(b)).vidaFuncional.getEvento({ id: ev.id })).rejects.toThrow();

      await db.delete(vidaFuncionalEventos).where(eq(vidaFuncionalEventos.id, ev.id));
    } finally {
      await db.delete(users).where(eq(users.id, a.id));
      await db.delete(users).where(eq(users.id, b.id));
    }
  });

  it("admin NÃO tem god-view sobre a vida funcional de outro", async () => {
    const a = await makeDefensor("a3");
    const [admin] = await db.insert(users).values({
      name: "Admin VF", email: `vf-admin-${Date.now()}@test.local`, role: "admin", workspaceId: 1,
    } as any).returning();
    try {
      const ev = await createCaller(mkCtx(a)).vidaFuncional.createEvento({
        tipo: "GRATIFICACAO", titulo: "Gratif. de A", dataEvento: "2026-03-01",
      });
      const listAdmin = await createCaller(mkCtx(admin)).vidaFuncional.listEventos({});
      expect(listAdmin.some((e) => e.id === ev.id)).toBe(false);
      await db.delete(vidaFuncionalEventos).where(eq(vidaFuncionalEventos.id, ev.id));
    } finally {
      await db.delete(users).where(eq(users.id, a.id));
      await db.delete(users).where(eq(users.id, admin.id));
    }
  });

  it("soft-delete remove da listagem", async () => {
    const a = await makeDefensor("a4");
    try {
      const caller = createCaller(mkCtx(a));
      const ev = await caller.vidaFuncional.createEvento({
        tipo: "DIARIA", titulo: "Diária X", dataEvento: "2026-02-02",
      });
      await caller.vidaFuncional.deleteEvento({ id: ev.id });
      const list = await caller.vidaFuncional.listEventos({});
      expect(list.some((e) => e.id === ev.id)).toBe(false);
      await db.delete(vidaFuncionalEventos).where(eq(vidaFuncionalEventos.id, ev.id));
    } finally {
      await db.delete(users).where(eq(users.id, a.id));
    }
  });
});
```

- [ ] **Step 4: Quarentenar no CI (toca o banco)**

Modify `vitest.config.ts` — adicionar no array `CI_QUARANTINE`, junto aos outros testes de tRPC:

```typescript
  "__tests__/trpc/vida-funcional-router.test.ts",
```

- [ ] **Step 5: Rodar localmente (requer DATABASE_URL em .env.local)**

Run: `npx vitest run __tests__/trpc/vida-funcional-router.test.ts`
Expected: PASS nos 4 testes (criação/cluster, isolamento B, admin sem god-view, soft-delete).

- [ ] **Step 6: Confirmar o gate de CI verde**

Run: `CI=1 npx vitest run __tests__/unit/vida-funcional-tipo-cluster.test.ts __tests__/unit/vida-funcional-scope.test.ts`
Expected: PASS (os unit tests do Stage 1 rodam no CI; o teste de integração fica quarentenado).

- [ ] **Step 7: Commit**

```bash
git add src/lib/trpc/routers/vida-funcional.ts src/lib/trpc/routers/index.ts vitest.config.ts __tests__/trpc/vida-funcional-router.test.ts
git commit -m "feat(carreira): router vidaFuncional CRUD escopado por defensor

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 5: Grupo de navegação "Carreira" na sidebar

**Files:**
- Modify: `src/components/layouts/admin-sidebar.tsx` (CARREIRA_NAV, CarreiraMenu, render)

**Interfaces:**
- Consumes: `AssignmentMenuItem` (já importado), `iconMap` (já tem `Briefcase`), `SidebarPopoverMenu`/`SidebarMenuItem`/`SidebarMenuButton` (já no arquivo).
- Produces: grupo "Carreira" renderizado logo após Cadastros, com item "Vida Funcional" → `/admin/carreira/vida-funcional`.

- [ ] **Step 1: Adicionar o array de navegação**

Modify `src/components/layouts/admin-sidebar.tsx` — logo após o array `CADASTROS_NAV`:

```typescript
const CARREIRA_NAV: AssignmentMenuItem[] = [
  { label: "Vida Funcional", path: "/admin/carreira/vida-funcional", icon: "Briefcase" },
];
```

- [ ] **Step 2: Adicionar o componente de menu**

Modify `src/components/layouts/admin-sidebar.tsx` — adicionar a função `CarreiraMenu` logo após a função `CadastrosMenu`. É uma cópia de `CadastrosMenu` trocando rótulo "Cadastros"→"Carreira", ícone `BookUser`→`Briefcase`, e `theme="cadastros"`→`theme="cowork"` (reusa um tema existente):

```typescript
function CarreiraMenu({ items, pathname, onNavigate, userRole, isCollapsed }: {
  items: AssignmentMenuItem[];
  pathname: string;
  onNavigate: () => void;
  userRole?: UserRole;
  isCollapsed: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const hasActiveItem = items.some(item => pathname.startsWith(item.path));

  useEffect(() => {
    if (hasActiveItem && !expanded) setExpanded(true);
  }, [hasActiveItem]);

  if (isCollapsed) {
    return (
      <SidebarPopoverMenu
        items={items}
        pathname={pathname}
        onNavigate={onNavigate}
        userRole={userRole}
        label="Carreira"
        icon={Briefcase}
        theme="cowork"
      />
    );
  }

  return (
    <div className="space-y-0.5">
      <SidebarMenuItem>
        <button
          onClick={() => setExpanded(!expanded)}
          className={cn(
            "w-full h-10 transition-all duration-300 rounded-xl flex items-center px-3 group/item",
            hasActiveItem
              ? "bg-emerald-600/15 text-emerald-400"
              : "text-neutral-700 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-black/[0.04] dark:hover:bg-white/[0.06]"
          )}
        >
          <div className="mr-2.5 transition-all duration-200">
            <Briefcase className={cn(
              "h-[18px] w-[18px] transition-all duration-200",
              hasActiveItem ? "text-emerald-500" : "text-neutral-900 dark:text-neutral-400 group-hover/item:text-neutral-950 dark:group-hover/item:text-neutral-200"
            )} />
          </div>
          <span className="text-[13px] font-medium">Carreira</span>
          {hasActiveItem && <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0 ml-1.5" />}
          <ChevronDown className={cn(
            "h-4 w-4 ml-auto transition-transform duration-300",
            expanded && "rotate-180"
          )} />
        </button>
      </SidebarMenuItem>

      <div className={cn(
        "overflow-hidden transition-all duration-300 ease-in-out",
        expanded ? "max-h-[600px] opacity-100" : "max-h-0 opacity-0"
      )}>
        <div className="relative pl-4 space-y-0.5">
          <div className="absolute left-[22px] top-1 bottom-1 w-px bg-gradient-to-b from-emerald-500/20 via-black/[0.06] dark:via-white/[0.06] to-transparent" />
          {items.map((item) => {
            if (item.requiredRoles && userRole && !item.requiredRoles.includes(userRole)) {
              return null;
            }
            const Icon = iconMap[item.icon] || Briefcase;
            const isActive = pathname.startsWith(item.path);
            return (
              <SidebarMenuItem key={item.path}>
                <SidebarMenuButton
                  asChild
                  isActive={isActive}
                  className={cn(
                    "h-9 transition-all duration-300 rounded-lg group/subitem relative",
                    isActive
                      ? "bg-emerald-500/15 text-emerald-400 font-medium"
                      : "text-neutral-400 dark:text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-black/[0.04] dark:hover:bg-white/[0.06]"
                  )}
                >
                  <Link href={item.path} prefetch={true} onClick={onNavigate}>
                    <div className={cn(
                      "absolute left-[-12px] w-2 h-px transition-all duration-200",
                      isActive ? "bg-emerald-500/50" : "bg-black/[0.06] dark:bg-white/[0.06]"
                    )} />
                    <Icon className={cn(
                      "h-3.5 w-3.5 mr-2 transition-all duration-300",
                      isActive ? "text-emerald-400" : "text-neutral-400 dark:text-neutral-500 group-hover/subitem:text-neutral-600 dark:group-hover/subitem:text-neutral-300"
                    )} />
                    <span className="text-[12px] truncate">{item.label}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Renderizar o grupo após Cadastros**

Modify `src/components/layouts/admin-sidebar.tsx` — em `AdminSidebarContent()`, logo após o bloco `<SidebarMenu>...<CadastrosMenu .../></SidebarMenu>`, inserir:

```tsx
{/* 3. Carreira - Vida Funcional */}
<NavDivider collapsed={isCollapsed} />
<SidebarMenu className="space-y-0.5">
  <CarreiraMenu
    items={CARREIRA_NAV}
    pathname={pathname}
    onNavigate={handleNavigate}
    userRole={userRole}
    isCollapsed={isCollapsed}
  />
</SidebarMenu>
```

- [ ] **Step 4: Verificar build**

Run: `npm run build`
Expected: build conclui sem erro de tipo/compilação no sidebar.

- [ ] **Step 5: Commit**

```bash
git add src/components/layouts/admin-sidebar.tsx
git commit -m "feat(carreira): grupo de navegacao Carreira > Vida Funcional na sidebar

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 6: Página inicial mínima da Vida Funcional + loading

**Files:**
- Create: `src/app/(dashboard)/admin/carreira/vida-funcional/page.tsx`
- Create: `src/app/(dashboard)/admin/carreira/vida-funcional/loading.tsx`

**Interfaces:**
- Consumes: `trpc.vidaFuncional.listEventos` (Task 4), `CollapsiblePageHeader`, `trpc` client.
- Produces: rota navegável `/admin/carreira/vida-funcional` exibindo a contagem de eventos (placeholder da home; o bento/abas vêm no Stage 2).

- [ ] **Step 1: Criar a página**

Create `src/app/(dashboard)/admin/carreira/vida-funcional/page.tsx`:

```tsx
"use client";

import { Briefcase } from "lucide-react";
import { CollapsiblePageHeader } from "@/components/layouts/collapsible-page-header";
import { trpc } from "@/lib/trpc/client";

export default function VidaFuncionalPage() {
  const { data: eventos, isLoading } = trpc.vidaFuncional.listEventos.useQuery({});

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-background">
      <CollapsiblePageHeader title="Vida Funcional" icon={Briefcase}>
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="w-9 h-9 rounded-xl bg-[#525252] flex items-center justify-center shrink-0">
            <Briefcase className="w-4 h-4 text-white" />
          </div>
          <div className="min-w-0">
            <h1 className="text-white text-[15px] font-semibold">Vida Funcional</h1>
            <p className="text-[10px] text-white/55 hidden sm:block">
              {isLoading ? "carregando…" : `${eventos?.length ?? 0} evento(s)`}
            </p>
          </div>
        </div>
      </CollapsiblePageHeader>

      <div className="px-5 md:px-8 py-3 md:py-4 space-y-6">
        <p className="text-sm text-muted-foreground">
          Fundação pronta. As telas (Radar, Trajetória, domínios, Produtividade) chegam nos próximos estágios.
        </p>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Criar o loading**

Create `src/app/(dashboard)/admin/carreira/vida-funcional/loading.tsx`:

```tsx
import { Skeleton } from "@/components/ui/skeleton";

export default function VidaFuncionalLoading() {
  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-background">
      <div className="px-5 md:px-8 py-6 space-y-4">
        <div className="flex items-center gap-3">
          <Skeleton className="w-9 h-9 rounded-xl" />
          <div className="space-y-1.5">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
        <Skeleton className="h-24 w-full rounded-xl" />
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Verificar build e rota**

Run: `npm run build`
Expected: build inclui a rota `/admin/carreira/vida-funcional` sem erro.

- [ ] **Step 4: Verificação manual (dev)**

Run: `npm run dev`, abrir `http://localhost:3000/admin/carreira/vida-funcional`, logado como defensor.
Expected: a página carrega, o cabeçalho mostra "Vida Funcional" e a contagem de eventos; o item aparece na sidebar sob "Carreira".

- [ ] **Step 5: Commit**

```bash
git add "src/app/(dashboard)/admin/carreira/vida-funcional/page.tsx" "src/app/(dashboard)/admin/carreira/vida-funcional/loading.tsx"
git commit -m "feat(carreira): pagina inicial minima da Vida Funcional + loading

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Verificação final do Stage 1

- [ ] **Gate de teste do CI:** `CI=1 vitest run` — verde (os dois unit tests novos passam; o de integração fica quarentenado).
- [ ] **Build:** `npm run build` — verde.
- [ ] **Funcional:** criar um evento via UI/caller, confirmar isolamento entre dois defensores e admin sem god-view (Task 4 cobre via teste).

## Self-review (rodado pelo autor do plano)

- **Cobertura da spec (Stage 1 = passos 1–2 da §7):** tabela polimórfica (Task 1) ✓; escopo privado `getVidaFuncionalScope` (Task 3) ✓; router `vidaFuncional` (Task 4) ✓; grupo de nav "Carreira" + rota (Tasks 5–6) ✓; mapa tipo→cluster e marcos (Task 2) ✓. Radar, Drive embutido, indexador/sugestões e Produtividade ficam para Stages 2–5 (declarado no escopo).
- **Sem placeholders:** todo passo tem código/comandos concretos. A `vida_funcional_sugestoes` é explicitamente adiada (não é placeholder — é decisão de escopo).
- **Consistência de tipos:** `VfTipo`/`VfCluster` definidos na Task 2 e reusados na Task 4; `getVidaFuncionalScope` retorna `number[]` e é usado uniformemente; nomes de colunas batem entre Task 1 (schema) e Task 4 (router/test).
