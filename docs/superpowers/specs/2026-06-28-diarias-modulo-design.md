# Módulo Diárias — lifecycle de pagamento, cálculo e projeção

**Date:** 2026-06-28
**Status:** Approved design (pending spec review)
**Scope:** Step 3 of the "vida funcional / day-to-day administrativo" roadmap. Feeds the Carreira Hub (step 1, PR #288); sibling of Módulo Férias (step 2, PR #289).

---

## 1. Problem & Goal

Diárias (per-diem travel allowances) are today represented only ad hoc: a `vida_funcional_eventos` row (tipo `DIARIA`, cluster `contraprestacao`) with a free-form 3-state `dados.status` (`a_requerer|requerida|recebida`) set in the generic event dialog — no trip details, no quantidade × valor unitário, no SEI, no real lifecycle.

**Goal:** a dedicated Diárias module — one table, a payment lifecycle, trip details, **quantidade × valor unitário = total** (supporting meia-diária), SEI protocol — that projects a `vida_funcional_eventos` row so the **Carreira Hub's contraprestação cluster (counts + valores) lights up with NO changes to carreira code**. A `/admin/diarias` page becomes the canonical surface, superseding the ad-hoc dialog control.

### Roadmap context (this spec = step 3 only)
1. Carreira Hub — PR #288.
2. Módulo Férias — PR #289.
3. **Módulo Diárias** — *this spec*.
4. Módulo Pedidos Administrativos — later.
5. UI/UX refinement — later.

---

## 2. Scope (YAGNI — explicit)

**In v1:** per-trip diárias; lifecycle `a_requerer → requerida → autorizada → paga` (+ `cancelada`); trip details (destino, origem, motivo, dataInicio, dataFim); `quantidade` (meia-diária allowed) × `valorUnitarioCents` = computed total; `seiProtocolo`; `vida_funcional` projection (tipo DIARIA, cluster contraprestação, `valorCents = totalCents`); `/admin/diarias` page.

**Deferred to v2 (NOT built — flagged):**
- SEI/ofício document generation via the Claude daemon (cf. substituições `gerarGratificacao`).
- Official per-diem rate-table lookup (valor unitário auto-fill).
- Deslocamento / reembolso de transporte.
- Migrating pre-existing `dados.status` diária events into the table.

---

## 3. Constraints (from existing code)

- **Privacy:** diárias are personal. Reads use `getVidaFuncionalScope(ctx.user)`; writes restricted to titular (`FORBIDDEN` if `defensorId !== ctx.user.id`), mirroring `vida-funcional.ts` and the Férias router.
- **`vida_funcional_eventos`** is the projection target (`src/lib/db/schema/vida-funcional.ts`): columns `defensorId, tipo, cluster, titulo, dataEvento, dataFim, status, valorCents, origem, dados, deletedAt`. `tipo=DIARIA`, `cluster=contraprestacao`, `valorCents=totalCents`. Soft-delete on cancel/remove.
- **Hub consumption:** `panorama.ts` groups `contraprestacao`-cluster events with `{ total, emCurso, pendentes, itens(…valorCents) }`; the projection's `tipo/cluster/status/valorCents` land there directly. NO carreira changes.
- **No afastamento cascade** — diárias are not cobertura.
- **Dates** are `YYYY-MM-DD` strings; compare lexicographically; no date-fns on raw values.
- **Money:** `valorUnitarioCents` is integer cents (bigint). `quantidade` is `numeric(5,1)` (supports `1.5`); Drizzle returns numeric as a **string**, parsed to `number` at the boundary. `totalCents` is **computed, never stored**.
- **Status chips:** a diárias-local `diariaStatusInfo` resolver (do NOT reuse `carreiraStatusInfo`/`feriasStatusInfo`).
- **Soft-delete** filters everywhere.
- **Module pattern** mirrors Férias: schema in `src/lib/db/schema/diarias.ts` (+ barrel `export * from "./diarias"`), router `routers/diarias.ts` registered in `index.ts`, page under `admin/diarias/`.

---

## 4. Data Model — one dedicated table

`src/lib/db/schema/diarias.ts`:

```ts
export const diariaStatusEnum = pgEnum("diaria_status", ["a_requerer","requerida","autorizada","paga","cancelada"]);

export const diarias = pgTable("diarias", {
  id: serial("id").primaryKey(),
  defensorId: integer("defensor_id").references(() => users.id).notNull(),
  destino: text("destino").notNull(),
  origem: text("origem"),
  motivo: text("motivo"),
  dataInicio: date("data_inicio").notNull(),
  dataFim: date("data_fim").notNull(),
  quantidade: numeric("quantidade", { precision: 5, scale: 1 }).notNull(),   // "1.5"
  valorUnitarioCents: bigint("valor_unitario_cents", { mode: "number" }).notNull(),
  status: diariaStatusEnum("status").default("a_requerer").notNull(),
  seiProtocolo: text("sei_protocolo"),
  vidaFuncionalEventoId: integer("vida_funcional_evento_id"),
  observacoes: text("observacoes"),
  createdAt, updatedAt, deletedAt,
}, indexes on (defensorId, status, deletedAt), (defensorId, dataInicio));
```

`dataFim` notNull (a trip has an end; same-day trip → `dataFim === dataInicio`).

**Schema barrel:** add `export * from "./diarias";` to `src/lib/db/schema/index.ts`.
**Migration:** one scoped idempotent Drizzle migration `0059_diarias_modulo.sql` (enum + table + FK + indexes, `IF NOT EXISTS` / guarded `DO` blocks). Do NOT commit the full drift-capture `db:generate` output — hand-scope it (lesson from Férias 0058). No changes to existing tables.

---

## 5. Pure logic (`src/lib/diarias/`)

### `calculo.ts`
- `totalCents(quantidade: number, valorUnitarioCents: number): number` = `Math.round(quantidade * valorUnitarioCents)`. (e.g. `1.5 × 15000 = 22500`.)

### `transicoes.ts`
- `type DiariaStatus = "a_requerer"|"requerida"|"autorizada"|"paga"|"cancelada"`
- `TRANSICOES`: `a_requerer→{requerida,cancelada}`, `requerida→{autorizada,cancelada}`, `autorizada→{paga,cancelada}`, `paga→[]`, `cancelada→[]`.
- `podeTransicionar(de, para): boolean` (false for unknown).

### `projecao.ts`
- `statusEventoDeDiaria(status): "previsto"|"pendente"|"em_curso"|"concluido"` — `a_requerer→previsto`, `requerida→pendente`, `autorizada→em_curso`, `paga→concluido` (cancelada handled by soft-delete, not mapped).
- `tituloDiaria(input: { destino: string; dataInicio: string }): string` — e.g. `"Diária — Salvador (2026-07-01)"`.
- `projecaoEventoDeDiaria(diaria: { id: number | null; destino: string; dataInicio: string; dataFim: string; status: string }, totalCents: number)` → the `vida_funcional_eventos` shape: `{ tipo:"DIARIA", cluster:"contraprestacao", titulo, dataEvento:dataInicio, dataFim, status, valorCents: totalCents, dados:{ diariaId } }`. `id` is **nullable** (mirroring Férias `projecaoEventoDeParcela`): in `criar` it is called with `id: null`, returning `dados:{ diariaId: null }`, and the router **backfills** the real id after the diária is inserted. Note: `origem` is NOT part of the pure shape — the router adds `origem:"manual"` at insert time.

### `status-visual.ts`
- `diariaStatusInfo(status): VisualTipo` covering all 5 statuses (a_requerer neutral, requerida sky, autorizada amber, paga emerald, cancelada rose); neutral fallback echoes raw status.

All four pure and unit-tested.

---

## 6. Router (`src/lib/trpc/routers/diarias.ts`)

Registered as `diarias: diariasRouter` in `routers/index.ts`.

- `listar` (protected, scoped via `getVidaFuncionalScope`): diárias in scope, each with `totalCents = calculo.totalCents(Number(row.quantidade), row.valorUnitarioCents)` (parse the `numeric` string to number at this boundary). Excludes soft-deleted.
- `criar` (titular-only, transactional): validate `dataFim ≥ dataInicio`, `quantidade > 0`, `valorUnitarioCents ≥ 0`. In `db.transaction`: insert the `vida_funcional_eventos` projection — spread `projecaoEventoDeDiaria({ id:null, … }, totalCents)` **plus `origem:"manual"`** and `dados:{ diariaId: null }` — capture the evento id; insert the diária (`defensorId: ctx.user.id`) with `vidaFuncionalEventoId`; backfill the evento `dados` with the real `diariaId`.
- `atualizar` (titular-only, transactional): select first, `NOT_FOUND` if missing, then `FORBIDDEN` if not titular. All data fields optional in input (`destino, origem, motivo, dataInicio, dataFim, quantidade, valorUnitarioCents, seiProtocolo, observacoes, status`); on any change revalidate `dataFim ≥ dataInicio` and recompute `totalCents`; a `status` change is rejected unless `podeTransicionar(de, para)`. Set `updatedAt: new Date()`. Cascade to the linked evento — `cancelada` → soft-delete the evento; else update its `status` (via `statusEventoDeDiaria`), `dataEvento/dataFim`, `valorCents` (= recomputed totalCents), `titulo`.
- `remover` (titular-only, transactional): select first, `NOT_FOUND` if missing, `FORBIDDEN` if not titular; soft-delete diária + soft-delete linked evento.

Writes guard titular (`FORBIDDEN` if `defensorId !== ctx.user.id`). No afastamento involvement.

---

## 7. UI (`src/app/(dashboard)/admin/diarias/`)

`page.tsx` (server, thin) → `_components/diarias-view.tsx` (client, `"use client"`). Personal (uses `listar`):
- `CollapsiblePageHeader` title "Diárias" + KPI chips: **Total a receber** (Σ totalCents of a_requerer|requerida|autorizada) · **Pago no ano** (Σ totalCents of paga in current year) · **Solicitações pendentes** (count requerida) · **Diárias este ano** (count).
- **Diária rows/cards**: destino + período, `quantidade × R$ valorUnitário = R$ total`, `StatusChip info={diariaStatusInfo(status)}`, SEI if any, and only the transition actions allowed by `podeTransicionar` (requerer / autorizar / marcar paga / cancelar) calling `atualizar`.
- **Form**: create/edit (destino, origem, motivo, dataInicio, dataFim, quantidade, valorUnitário, SEI). Money rendered in R$ (cents → `(c/100).toLocaleString("pt-BR",{style:"currency",currency:"BRL"})`).
- `EmptyState` per section (with required `icon`); loading-guard before EmptyState; inputs carry dark-mode variants (lessons from Férias UI review).
- **Navigation:** add a `/admin/diarias` entry to the admin sidebar/nav alongside the Férias entry, following whatever pattern Férias used (the plan locates the exact nav file). If Férias added no nav entry, match that (page reachable by URL) and note the gap.

---

## 8. Testing
- **Pure (primary):** `calculo` (incl. meia-diária rounding, zero); `transicoes` (every allowed/disallowed edge, terminals, unknown); `projecao` (status map, titulo, shape incl. `valorCents`); `status-visual` (all 5 + fallback).
- **Router structural:** `listar` uses `getVidaFuncionalScope`; writes guard titular; `criar`/`atualizar`/`remover` use `db.transaction`; `atualizar` gates via `podeTransicionar`; cancel soft-deletes the linked evento; soft-delete filters everywhere; NO afastamentos reference. (Source-reading test, matching the carreira/férias pattern.)
- **Migration:** scoped idempotent `0059`, no edits to existing tables.

---

## 9. Out of Scope (explicit)
- SEI/ofício doc generation, rate-table lookup, reembolso de transporte, migration of legacy `dados.status` diárias (all v2).
- Any change to carreira router/views — the projection keeps them working.
- No afastamento/cobertura cascade.
