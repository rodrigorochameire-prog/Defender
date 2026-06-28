# Módulo Ausências — Licenças + Outras Ausências (SIGA)

**Date:** 2026-06-28
**Status:** Approved design (pending spec review)
**Scope:** Slice A of the SIGA roadmap. A unified Ausências module mirroring SIGA's `/Carreira/Licenca` and `/Carreira/OutrasAusencias`, feeding the Carreira Hub. Reference: `docs/integrations/siga-carreira-map.md`.

---

## 1. Problem & Goal

SIGA tracks **Licenças** and **Outras Ausências** as formal Solicitações (Número, Situação, Motivo, Duração, Publicação, Nº Siga, Observação, Interrupção, Suspensão). OMBUDS has only a loose `vida_funcional_eventos` tipo `LICENCA` and nothing for outras ausências. **Goal:** one dedicated `ausencias` module (tipo discriminator `licenca | outra_ausencia`) with a real lifecycle, the official motivo taxonomy, the formal SIGA fields, projecting a `vida_funcional` event so the Hub's ausências cluster is complete — with no carreira code changes. Defines the scraper target (Slice C).

---

## 2. Scope (YAGNI)

**In:** one table both tipos; lifecycle `solicitada→deferida→gozada` (+`indeferida`,`cancelada`); `suspensa`/`interrompida` booleans; motivo (licença taxonomy dropdown / outras free-text); formal fields (numeroSolicitacao, nSiga, dataPublicacao, observacao, situacaoSiga, sigaSyncedAt); projection to vida_funcional (licença→`LICENCA`, outra→new additive `OUTRA_AUSENCIA`); `/admin/ausencias` page + nav.

**Deferred (v2):** suspensão/interrupção **event history** (booleans now); prorrogação workflow; the SIGA **scraper** (Slice C); afastamentos alignment (Slice B).

---

## 3. Constraints (from existing code)

- **Privacy:** reads use `getVidaFuncionalScope(ctx.user)`; writes titular-only (`NOT_FOUND`→`FORBIDDEN`), mirroring Diárias/Férias.
- **Projection target** `vida_funcional_eventos` (cluster `ausencias`): licença→tipo `LICENCA` (exists); outra→tipo **`OUTRA_AUSENCIA`** (new). `indeferida`/`cancelada` → soft-delete the event. No `valorCents` (ausências carry no money). NO carreira changes.
- **Additive vida_funcional enum value:** `OUTRA_AUSENCIA` added to `vf_tipo_evento` via `ALTER TYPE … ADD VALUE IF NOT EXISTS` (additive, safe). This forces three TS-enforced additive edits (the `VfTipo` union is `Record`-keyed downstream): the `VfTipo` union + `TIPO_CLUSTER["OUTRA_AUSENCIA"]="ausencias"` (`src/lib/vida-funcional/tipo-cluster.ts`) + `labels.ts` (`OUTRA_AUSENCIA: "Outra ausência"`). **Do NOT edit `src/lib/vida-funcional/dominios.ts`** — `DOMINIOS` drives a carreira sub-route, and the panorama hub groups by the `cluster` string (never consults `DOMINIOS`), so the cluster summary works without it. Adding it there would be a carreira-view change (deferred v2). Net: additive support-file edits only; no rows change, no carreira route change.
- **No afastamento cascade** (ausências ≠ cobertura).
- **Dates** `YYYY-MM-DD` strings, lexicographic, no date-fns. **Soft-delete** filters everywhere.
- **Status chips:** ausências-local `ausenciaStatusInfo` (own resolver, not carreira/férias/diárias).
- **Module pattern** mirrors Diárias: schema `src/lib/db/schema/ausencias.ts` (+ barrel), router `routers/ausencias.ts` (registered), page `admin/ausencias/`, pure logic `src/lib/ausencias/`.

---

## 4. Data Model

`src/lib/db/schema/ausencias.ts`:

```ts
export const ausenciaTipoEnum = pgEnum("ausencia_tipo", ["licenca", "outra_ausencia"]);
export const ausenciaSituacaoEnum = pgEnum("ausencia_situacao", ["solicitada","deferida","gozada","indeferida","cancelada"]);

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
}, indexes on (defensorId, situacao, deletedAt), (defensorId, tipo, dataInicio));
```

(Timestamps defined inline, mirroring `vida-funcional.ts`/`diarias.ts` — there is no shared helper.) `dataFim` notNull. **Schema barrel:** add `export * from "./ausencias";`.

**Migration — TWO files (Postgres `ADD VALUE` cannot run in the same transaction block as the rest):**
- `drizzle/0061_ausencias_enum.sql`: **only** `ALTER TYPE "public"."vf_tipo_evento" ADD VALUE IF NOT EXISTS 'OUTRA_AUSENCIA';` — kept alone so it is never bundled into a `BEGIN/COMMIT` with statements that depend on it (the new value can't be *used* in the same transaction it's added; isolating it sidesteps the caveat on every PG version). Supabase/Railway are PG ≥ 15, but isolation keeps it robust.
- `drizzle/0062_ausencias_modulo.sql`: guarded `CREATE TYPE ausencia_tipo` + `ausencia_situacao`; `CREATE TABLE IF NOT EXISTS ausencias` + FK + 2 indexes. (The table references the NEW `ausencia_*` enums, not `vf_tipo_evento`, so there is no cross-statement dependency here.)

Both hand-scoped + idempotent (`ADD VALUE IF NOT EXISTS`, guarded `DO` for `CREATE TYPE`, `IF NOT EXISTS` for table/indexes). No edits to existing tables/rows.

---

## 5. Pure logic (`src/lib/ausencias/`)

### `calculos.ts`
- `diasInclusive(inicio: string, fim: string): number` — UTC inclusive day count (`Math.round((Date.parse(`${fim}T00:00:00Z`) − Date.parse(`${inicio}T00:00:00Z`)) / 86_400_000) + 1`; 0 if `fim < inicio`). Same formula as Férias/Diárias. Unit-tested (incl. same-day = 1, inverted = 0).

### `motivos.ts`
- `LICENCA_MOTIVOS: readonly string[]` — the 11 official SIGA values (ACIDENTE EM SERVIÇO, CASAMENTO, CESSÃO, DOENÇA DE PESSOA DA FAMÍLIA, EM CARÁTER ESPECIAL/INTERESSE PARTICULAR, EXERCER MANDATO ELETIVO, LUTO, MATERNIDADE (ABORTO OU NATIMORTO), MATERNIDADE (OU ADOTANTE), PARA CONCORRER A MANDATO ELETIVO, PATERNIDADE (OU ADOTANTE)).

### `transicoes.ts`
- `type AusenciaSituacao = "solicitada"|"deferida"|"gozada"|"indeferida"|"cancelada"`.
- `TRANSICOES`: `solicitada→{deferida,indeferida,cancelada}`, `deferida→{gozada,cancelada}`, `gozada→[]`, `indeferida→[]`, `cancelada→[]`.
- `podeTransicionar(de, para)` (false for unknown).

### `projecao.ts`
- `statusEventoDeAusencia(situacao): "previsto"|"pendente"|"concluido"` — `solicitada→pendente`, `deferida→previsto`, `gozada→concluido` (indeferida/cancelada handled by soft-delete, not mapped). **Tradeoff (acknowledged):** there is no `em_curso` mapping, so a `deferida` ausência already in progress (today within dataInicio/dataFim) shows as `previsto` in the hub cluster — the ausências cluster's `emCurso` count stays 0 even during an active leave. The hub's "agora & próximos" still surfaces it via the date window. Deriving `em_curso` from current-date-vs-dates is deferred to v2.
- `tipoEventoDeAusencia(tipo): "LICENCA"|"OUTRA_AUSENCIA"` — `licenca→LICENCA`, `outra_ausencia→OUTRA_AUSENCIA`.
- `tituloAusencia(input: { tipo: string; motivo: string | null; dataInicio: string }): string` — e.g. `"Licença — LUTO (2026-07-01)"` / `"Ausência — <motivo> (…)"` (no motivo → just the label).
- `projecaoEventoDeAusencia(ausencia, id)` → `{ tipo: LICENCA|OUTRA_AUSENCIA, cluster:"ausencias", titulo, dataEvento:dataInicio, dataFim, status, dados:{ ausenciaId } }`. **No valorCents.**

### `status-visual.ts`
- `ausenciaStatusInfo(situacao): VisualTipo` for all 5 situações (solicitada neutral, deferida sky, gozada emerald, indeferida rose, cancelada muted); neutral fallback echoes raw.

All four pure and unit-tested.

---

## 6. Router (`src/lib/trpc/routers/ausencias.ts`)

Registered as `ausencias: ausenciasRouter`.

- `listar` (protected, scoped): ausências in scope + `dias` (`diasInclusive`). Excludes soft-deleted.
- `criar` (titular-only, transactional): validate `dataFim ≥ dataInicio`. In `db.transaction`: insert the projection event (`origem:"manual"`, `dados:{ ausenciaId:null }`, tipo via `tipoEventoDeAusencia`), capture id; insert the ausência with `vidaFuncionalEventoId`; backfill event `dados.ausenciaId`.
- `atualizar` (titular-only, transactional): `NOT_FOUND`→`FORBIDDEN`; a `situacao` change rejected unless `podeTransicionar`; re-derive the projection; cascade to the event — `indeferida`/`cancelada` → soft-delete the event; else update `tipo`/`status`/`dataEvento`/`dataFim`/`titulo`. Persist all fields (`=== undefined ? existing : input` merge). `updatedAt`.
- `remover` (titular-only, transactional): soft-delete ausência + linked event.

Titular guard `FORBIDDEN` if `defensorId !== ctx.user.id`. No afastamento involvement.

---

## 7. UI (`src/app/(dashboard)/admin/ausencias/`)

`page.tsx` (server, thin) → `_components/ausencias-view.tsx` (client). Personal (uses `listar`):
- `CollapsiblePageHeader` "Ausências" + KPI chips: Licenças (count) · Outras ausências (count) · Solicitadas (situacao=solicitada) · Em vigor (deferida).
- **tipo filter** (Todos / Licenças / Outras) — client-side.
- **rows**: tipo + período + `dias`, motivo, `StatusChip info={ausenciaStatusInfo(situacao)}`, suspensa/interrompida chips, numeroSolicitacao/dataPublicacao/situacaoSiga metadata, allowed-only lifecycle actions (deferir / marcar gozada / indeferir / cancelar) → `atualizar`.
- **form** (create/edit): tipo select; **motivo** = dropdown from `LICENCA_MOTIVOS` when tipo=licenca, free-text input when tipo=outra_ausencia; dataInicio/dataFim; observacao; suspensa/interrompida checkboxes; numeroSolicitacao/dataPublicacao/nSiga.
- `EmptyState` (with icon); loading-guard; dark-mode inputs; per-card mutation-error scoping (lessons from Diárias/Férias UI reviews).
- **Nav:** add `{ label: "Ausências", path: "/admin/ausencias", icon: "CalendarOff" }` to `CARREIRA_NAV` in `src/components/layouts/admin-sidebar.tsx` (the file maps icon strings via an allowlist `iconMap` — confirm `CalendarOff` is included; else pick an included icon like `CalendarX` / `Plane` / `FileText`).

---

## 8. Testing
- **Pure:** `calculos` (diasInclusive boundaries); `transicoes` (edges/terminals/unknown); `projecao` (status map, tipo map licença/outra, titulo, shape, no valorCents); `status-visual` (5 + fallback); `motivos` (the 11 values present).
- **Router structural:** `listar` uses `getVidaFuncionalScope`; writes guard titular; `criar`/`atualizar`/`remover` use `db.transaction`; `atualizar` gates via `podeTransicionar` and soft-deletes the event on indeferida/cancelada; projection uses `tipoEventoDeAusencia`; soft-delete filters; NO afastamentos reference; registered.
- **Migration:** scoped `0061` (enum ADD VALUE) + `0062` (2 new types + table); idempotent; no edits to existing tables.

---

## 9. Out of Scope (explicit)
- SIGA scraper (Slice C), afastamentos alignment (Slice B).
- Suspensão/interrupção event history (booleans only); prorrogação workflow.
- No carreira router/view changes (only additive vida_funcional support-file edits for the new enum value).
- No money (ausências carry no valorCents).
