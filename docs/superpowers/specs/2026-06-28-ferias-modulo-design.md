# Módulo Férias — lifecycle, parcelamento, saldo e cobertura

**Date:** 2026-06-28
**Status:** Approved design (pending spec review)
**Scope:** Step 2 of the "vida funcional / day-to-day administrativo" roadmap. A dedicated Férias module that feeds the Carreira Hub (step 1, already shipped in PR #288).

---

## 1. Problem & Goal

A Defensor's férias today are represented loosely in two places — a generic `afastamentos` row (coverage) and an optional `vida_funcional_eventos` row (timeline) — with no lifecycle, no parcelamento, and no saldo. There is no surface to answer "quantos dias me restam neste período aquisitivo?" or "quais parcelas estão programadas / em fruição / concluídas?".

**Goal:** a dedicated Férias module that tracks **períodos aquisitivos** and their **parcelas de fruição** through a real lifecycle, computes **saldo** by simple arithmetic, and — when a substituto is chosen — auto-creates the `afastamento` (cobertura) and a `vida_funcional_eventos` projection so the **Carreira Hub lights up with zero changes to carreira code**.

### Roadmap context (this spec = step 2 only)

1. Carreira Hub — shipped (PR #288).
2. **Módulo Férias** — *this spec*.
3. Módulo Diárias — later.
4. Módulo Pedidos Administrativos — later.
5. UI/UX refinement pass — later.

---

## 2. Scope (YAGNI — explicit)

**In v1:**
- Períodos aquisitivos (manual `diasDireito`, default 30) + parcelas de fruição.
- Parcelamento: one período split into N parcelas.
- Lifecycle per parcela: `programada → homologada → em_fruicao → concluida`, plus `cancelada`.
- Saldo by arithmetic (no entitlement rules).
- Cobertura linkage: a parcela with a `substitutoId` auto-creates an `afastamentos` row (tipo `FERIAS`) and links it.
- Timeline projection: each non-cancelada parcela projects a `vida_funcional_eventos` row (tipo `FERIAS`, cluster `ausencias`), keeping the hub KPI/timeline correct with no carreira changes.

**Deferred to v2 (NOT built — flagged):**
- Automatic entitlement / período-aquisitivo computation from tempo de serviço.
- Abono pecuniário (venda de 1/3).
- Google Calendar sync.
- Multi-step homologação/approval routing (v1 `homologada` is a manual status flip by the defensor, not an approval workflow).

---

## 3. Constraints (from existing code)

- **Privacy:** férias are personal-sensitive. Reads use `getVidaFuncionalScope(ctx.user)` (admin = own only; servidor/estagiário = linked). Writes are restricted to the titular (`defensorId === ctx.user.id`), mirroring `vida-funcional.ts`.
- **`afastamentos`** (`src/lib/db/schema/core.ts:438`) requires **notNull `defensorId` + `substitutoId`**. Therefore a parcela can create an afastamento **only when a substituto is set**; otherwise `afastamentoId` stays null. Reuse the create shape used by `coberturaRouter.criarAfastamento` (`ativo:true, acessoDemandas:true, acessoEquipe:false`).
- **`vida_funcional_eventos`** (`src/lib/db/schema/vida-funcional.ts:70`) — projection target. Columns used: `defensorId, tipo, cluster, titulo, dataEvento, dataFim, status, dados, deletedAt`. `tipo=FERIAS`, `cluster=ausencias`. Soft-delete on cancel.
- **Dates** are `YYYY-MM-DD` strings; compare lexicographically; day counts via a pure UTC helper. No date-fns on raw values.
- **Status chips** reuse `carreiraStatusInfo` (`src/lib/carreira/status-visual.ts`) — extend it (or add a férias-local map) so the parcela statuses get correct labels; do NOT rely on the audiência resolver.
- **Padrão Defender v5:** `CollapsiblePageHeader`, tokens, DS primitives, mirroring `admin/substituicoes/page.tsx`.
- **Module pattern** mirrors substituições: schema in `src/lib/db/schema/`, router in `routers/` registered in `index.ts`, page under `admin/`.

---

## 4. Data Model — two dedicated tables

`src/lib/db/schema/ferias.ts`:

```ts
export const feriasPeriodos = pgTable("ferias_periodos", {
  id: serial("id").primaryKey(),
  defensorId: integer("defensor_id").references(() => users.id).notNull(),
  aquisitivoInicio: date("aquisitivo_inicio").notNull(),
  aquisitivoFim: date("aquisitivo_fim").notNull(),
  diasDireito: integer("dias_direito").default(30).notNull(),
  observacoes: text("observacoes"),
  createdAt, updatedAt, deletedAt,
}, indexes on (defensorId, deletedAt));

export const feriasParcelas = pgTable("ferias_parcelas", {
  id: serial("id").primaryKey(),
  periodoId: integer("periodo_id").references(() => feriasPeriodos.id).notNull(),
  defensorId: integer("defensor_id").references(() => users.id).notNull(), // denormalized for scope queries
  dataInicio: date("data_inicio").notNull(),
  dataFim: date("data_fim").notNull(),
  status: feriasStatusEnum("status").default("programada").notNull(),
  substitutoId: integer("substituto_id").references(() => users.id),
  afastamentoId: integer("afastamento_id"),       // set when substituto chosen
  vidaFuncionalEventoId: integer("vida_funcional_evento_id"), // timeline projection
  seiProtocolo: text("sei_protocolo"),
  observacoes: text("observacoes"),
  createdAt, updatedAt, deletedAt,
}, indexes on (periodoId), (defensorId, status, deletedAt));

feriasStatusEnum = pgEnum("ferias_status", ["programada","homologada","em_fruicao","concluida","cancelada"]);
```

`dataFim` is **notNull** on parcelas (a fruição always has an end). `defensorId` is denormalized onto parcelas so scope filtering doesn't need a join.

**Schema barrel:** add `export * from "./ferias";` to `src/lib/db/schema/index.ts` (required for tRPC/migration tooling and `db` query types to see the tables).

**Migration:** one Drizzle migration creating both tables + the enum (`npm run db:generate` then `db:push`). No changes to existing tables.

**Note on dual-source FERIAS events:** after this module ships it becomes the **canonical** way to register férias. Pre-existing manually-created `vida_funcional_eventos` rows (tipo FERIAS) are NOT migrated; if a user duplicates a férias both manually and via this module the hub KPI could double-count. Accepted v1 limitation (reconciliation is v2).

---

## 5. Pure logic (`src/lib/ferias/`)

### `saldo.ts`
- `diasInclusive(inicio: string, fim: string): number` — UTC day count inclusive (`fim − inicio + 1`); returns 0 if `fim < inicio`.
- `type ParcelaLite = { id: number; dataInicio: string; dataFim: string; status: string }`
- `type Saldo = { direito: number; programados: number; concluidos: number; disponiveis: number }`
- `computeSaldo(diasDireito: number, parcelas: ParcelaLite[]): Saldo`
  - `programados` = Σ dias of parcelas in {programada, homologada, em_fruicao}
  - `concluidos` = Σ dias of parcelas in {concluida}
  - `disponiveis` = `direito − programados − concluidos`
  - `cancelada` excluded entirely.

### `projecao.ts`
- `statusEventoDeParcela(status: string): "previsto"|"em_curso"|"concluido"` — `programada|homologada → previsto`, `em_fruicao → em_curso`, `concluida → concluido` (cancelada handled by soft-deleting the evento, not mapped here).
- `tituloParcela(input: { aquisitivoInicio: string; aquisitivoFim: string; ordem: number }): string` — e.g. `"Férias 2025/2026 — 2ª parcela"`. **`ordem`** is the 1-indexed position of the parcela by `dataInicio ASC` (tiebreaker `createdAt ASC`) among the período's non-deleted parcelas; it is computed at query/mutation time (there is no `ordem` column).
- `projecaoEventoDeParcela(parcela, periodo, ordem)` → the `vida_funcional_eventos` insert/patch object (`tipo:"FERIAS", cluster:"ausencias", titulo, dataEvento, dataFim, status, dados:{ feriasParcelaId }`).

### `status-visual.ts` (férias-local)
- `FERIAS_STATUS_MAP` + `feriasStatusInfo(status): VisualTipo` covering `programada` (neutral), `homologada` (sky), `em_fruicao` (amber/active), `concluida` (emerald), `cancelada` (muted/rose). Do **NOT** modify the shared `carreiraStatusInfo`; the férias page calls this local resolver.

### `transicoes.ts` (state machine — pure)
- `TRANSICOES: Record<status, status[]>` and `podeTransicionar(de, para): boolean`. Allowed edges:

| de | para permitido |
|----|----------------|
| programada | homologada, cancelada |
| homologada | em_fruicao, cancelada |
| em_fruicao | concluida, cancelada |
| concluida | (terminal) |
| cancelada | (terminal) |

All four modules are pure and unit-tested with a fixed `TODAY`.

---

## 6. Router (`src/lib/trpc/routers/ferias.ts`)

Registered as `ferias: feriasRouter` in `routers/index.ts`.

- `listar` (protected, scoped): períodos in scope + their parcelas + `computeSaldo` per período. Excludes soft-deleted.
- `criarPeriodo` / `atualizarPeriodo` / `removerPeriodo` (titular-only; soft-delete). **`atualizarPeriodo` rejects (`BAD_REQUEST`) a `diasDireito` reduction below `programados + concluidos`** of that período's current parcelas.
- `criarParcela` (titular-only), inside a single **`db.transaction(async (tx) => …)`**:
  1. Validate the período belongs to the user; `dataFim ≥ dataInicio`; `substitutoId !== ctx.user.id` (`BAD_REQUEST` — cannot cover yourself, mirroring `coberturaRouter.criarAfastamento`).
  2. **Saldo guard:** `computeSaldo(periodo.diasDireito, parcelasNaoCanceladas).disponiveis ≥ diasInclusive(dataInicio, dataFim)` else `BAD_REQUEST` ("saldo insuficiente").
  3. If `substitutoId` set: insert an `afastamentos` row (tipo FERIAS, period = parcela window, `ativo:true, acessoDemandas:true, acessoEquipe:false`), capture `afastamentoId`.
  4. Insert the `vida_funcional_eventos` projection (via `projecao.ts`), capture `vidaFuncionalEventoId`.
  5. Insert the parcela with both FKs.
- `atualizarParcela` (titular-only, transactional): a status change is rejected (`BAD_REQUEST`) unless `podeTransicionar(de, para)` (see `transicoes.ts`); a date change re-applies the saldo guard. Cascade to the linked afastamento (`cancelada`/`concluida` → `ativo:false`; date change → update afastamento window) and patch/soft-delete the linked vida_funcional evento via `projecao.ts`.
- `removerParcela` (titular-only, transactional): soft-delete parcela + soft-delete linked evento + deactivate linked afastamento.

Writes use the same titular guard as `vida-funcional.ts` (`FORBIDDEN` if `defensorId !== ctx.user.id`). The multi-insert/cascade steps run inside `db.transaction()` so a mid-sequence failure leaves no orphan afastamento/evento.

**No admin view** — the afastamentos this creates flow into the Carreira Hub's existing `coberturaRollup`.

---

## 7. UI (`src/app/(dashboard)/admin/ferias/`)

`page.tsx` (client) + `_components/`. Personal-only (uses `listar`):
- `CollapsiblePageHeader` title "Férias", KPI chips: Dias disponíveis (somados) · Parcelas programadas · Em fruição · Períodos abertos.
- **Período cards**: each shows aquisitivo window, `diasDireito`, and a saldo bar (`disponiveis / direito`), plus its parcelas.
- **Parcela rows**: window, `dias`, `StatusChip info={feriasStatusInfo(status)}`, substituto name if any, and only the status-transition actions allowed by `podeTransicionar(status, …)` (homologar / iniciar fruição / concluir / cancelar) calling `atualizarParcela`.
- **Forms**: add período (aquisitivo window + diasDireito); add parcela to a período (dates + optional substituto select reusing the colega-picker pattern from coberturas + optional `seiProtocolo` text field).
- `EmptyState` per section; loading guards (gate on `isLoading` before EmptyState, per the carreira lesson).

---

## 8. Testing

- **Pure (primary):** `saldo.ts` (day counts incl. boundaries `dataFim===dataInicio`, status buckets, cancelada excluded, negative `disponiveis` when over-allocated); `projecao.ts` (status mapping, titulo with `ordem`, projection shape); `transicoes.ts` (every allowed edge true, every disallowed edge false, terminals reject all); `status-visual.ts` (all 5 statuses get a non-fallback label+badge+dot).
- **Router structural:** `listar` uses `getVidaFuncionalScope`; writes guard titular; `criarParcela` creates afastamento only when substituto present, rejects self-coverage, enforces the saldo guard, and wraps inserts in `db.transaction`; `atualizarParcela` gates on `podeTransicionar`; soft-delete filters everywhere. (Source-reading test, matching the carreira pattern.)
- **Migration:** generated migration applies cleanly (`db:push`), no edits to existing tables.

---

## 9. Out of Scope (explicit)
- Entitlement auto-computation, abono pecuniário, GCal sync, approval routing (all v2).
- Any change to the carreira router/views — the projection keeps them working untouched.
- Admin férias rollup — covered operationally by the existing Carreira Hub.
