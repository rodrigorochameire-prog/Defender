# Módulo Pedidos Administrativos

**Date:** 2026-06-28
**Status:** Approved design (pending spec review)
**Scope:** The `administrativo` pillar of the panoramic carreira vision — administrative requests (certidões, auxílios, reembolsos, requerimentos, etc.) with a lifecycle + SEI tracking, projecting to the vida_funcional timeline.

---

## 1. Problem & Goal

The carreira Hub already counts "pedidos pendentes" from `vida_funcional_eventos` of tipo `SOLICITACAO_ADM`, but there is no surface to **manage** those requests (only ad-hoc events). **Goal:** a dedicated `pedidos_administrativos` module with a real lifecycle and SEI protocol, projecting a `SOLICITACAO_ADM` event so the Hub's `administrativo` cluster + `pedidosPendentes` KPI + `proximoPrazo` (via the analysis deadline) light up — with no carreira code changes. OMBUDS-native (no SIGA dependency).

---

## 2. Scope (YAGNI)

**In:** one table; lifecycle `solicitado → em_analise → deferido/indeferido` (+`cancelado`); fields assunto (free-text title) / descricao / dataPedido / prazo / seiProtocolo / observacao; projection to vida_funcional (tipo `SOLICITACAO_ADM`, cluster `administrativo`, carrying `prazo`); `/admin/pedidos-administrativos` page + nav.

**Deferred (v2):** a rigid `categoria` enum (free-text assunto for now); SEI/ofício document generation via the daemon (just a `seiProtocolo` field); linkage pedido↔`documentosGerados` (ofícios); attachments.

---

## 3. Constraints (from existing code)

- **No vida_funcional enum change** — `SOLICITACAO_ADM` (tipo) and `administrativo` (cluster) already exist (`src/lib/db/schema/vida-funcional.ts`), as does the `solicitacoes` domain (`src/lib/vida-funcional/dominios.ts`). No edits to the vida_funcional support files.
- **Hub integration (no carreira change):** `panorama.ts` counts `pedidosPendentes` = events `tipo==="SOLICITACAO_ADM"` && status `pendente|em_curso`; `proximoPrazo` = events with `prazo >= today` && status ∉ {concluido, arquivado}. So the projection's status mapping must yield `pendente`/`em_curso` for open pedidos, and carry `prazo` (the analysis deadline) so they surface in próximo-prazo.
- **Privacy:** reads use `getVidaFuncionalScope(ctx.user)`; writes titular-only (`NOT_FOUND`→`FORBIDDEN`), mirroring Diárias/Ausências.
- **No money** (no valorCents). **No afastamento cascade.**
- **Module pattern** mirrors the shipped **Férias** module (this branch is based on `feat/ferias-modulo`; the Diárias/Ausências modules live on *sibling* branches and are NOT present here). Follow `src/lib/trpc/routers/ferias.ts` (the `criarParcela` insert-evento → insert-record → backfill-`dados` transaction pattern) + `src/lib/ferias/{transicoes,projecao,status-visual}.ts`. The `persist.ts` helper here is **new work** (a clean extraction of that transaction pattern into `src/lib/pedidos-administrativos/persist.ts`), not a copy of an existing file. Schema `src/lib/db/schema/pedidos-administrativos.ts` (+ barrel), router `routers/pedidos-administrativos.ts` (registered), page `admin/pedidos-administrativos/`.
- Dates `YYYY-MM-DD`. Soft-delete filters everywhere. Status chips: pedidos-local resolver.

---

## 4. Data Model

`src/lib/db/schema/pedidos-administrativos.ts`:

```ts
export const pedidoEstadoEnum = pgEnum("pedido_estado", ["solicitado","em_analise","deferido","indeferido","cancelado"]);

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
}, indexes on (defensorId, estado, deletedAt), (defensorId, prazo));
```

(Timestamps inline, mirroring `ferias.ts` — no shared helper.) **Schema barrel:** add `export * from "./pedidos-administrativos";`. **Migration `drizzle/0065_pedidos_administrativos.sql`:** the highest migration on *this* branch is `0058`, but `0059`–`0064` are consumed by the sibling stacked branches (diárias/férias-siga/ausências/afastamentos-siga/siga-scraper) that all merge into the same history — so use `0065` to avoid a confusing same-number clash on merge. Hand-scoped idempotent (guarded enum + `CREATE TABLE IF NOT EXISTS` + FK + 2 indexes); NOT `db:generate`; no other tables.

---

## 5. Pure logic (`src/lib/pedidos-administrativos/`)

### `transicoes.ts`
- `type PedidoEstado = "solicitado"|"em_analise"|"deferido"|"indeferido"|"cancelado"`.
- `TRANSICOES`: `solicitado→{em_analise,indeferido,cancelado}`, `em_analise→{deferido,indeferido,cancelado}`, `deferido→[]`, `indeferido→[]`, `cancelado→[]`.
- `podeTransicionar(de, para)` (false for unknown).

### `projecao.ts`
- `statusEventoDePedido(estado): "previsto"|"pendente"|"em_curso"|"concluido"|"arquivado"` — `solicitado→pendente`, `em_analise→em_curso`, `deferido→concluido`, `indeferido→arquivado` (cancelado → soft-delete the event, not mapped).
- `tituloPedido(assunto: string): string` — e.g. `assunto` verbatim (trimmed; fallback "Solicitação administrativa").
- `projecaoEventoDePedido(pedido, id)` → `{ tipo:"SOLICITACAO_ADM", cluster:"administrativo", titulo, dataEvento:dataPedido, prazo, status, dados:{ pedidoId } }`. **Carries `prazo`** (so the Hub's próximo-prazo picks it up). No `dataFim`, no `valorCents`.

### `status-visual.ts`
- `pedidoStatusInfo(estado): VisualTipo` for all 5 estados (solicitado neutral, em_analise sky, deferido emerald, indeferido rose, cancelado muted); neutral fallback echoes raw.

All three pure and unit-tested.

---

## 6. Router (`src/lib/trpc/routers/pedidos-administrativos.ts`)

Registered as `pedidosAdministrativos: pedidosAdministrativosRouter`.

- `listar` (protected, scoped): pedidos in scope. Excludes soft-deleted. (No computed field.)
- `criar` (titular-only, transactional): via a new **`src/lib/pedidos-administrativos/persist.ts` `criarPedidoComEvento(tx, defensorId, fields)`** (the same insert-evento → insert-record → backfill-`dados` transaction `ferias.ts criarParcela` does, extracted into a helper) — insert the projection event (`origem:"manual"`, `dados:{pedidoId:null}`, carrying `prazo`), insert the pedido, backfill `dados.pedidoId`. (`estado` defaults `solicitado`.)
- `atualizar` (titular-only, transactional): `NOT_FOUND`→`FORBIDDEN`; an `estado` change rejected unless `podeTransicionar`; re-derive the projection; cascade — `cancelado` → soft-delete the event; else update `status`/`titulo`/`dataEvento`/`prazo`. Persist all fields (`=== undefined ? existing : input`). `updatedAt`.
- `remover` (titular-only, transactional): soft-delete pedido + linked event.

Titular guard `FORBIDDEN` if `defensorId !== ctx.user.id`. No afastamento.

---

## 7. UI (`src/app/(dashboard)/admin/pedidos-administrativos/`)

`page.tsx` (server, thin) → `_components/pedidos-view.tsx` (client). Personal (uses `listar`). Mirror the shipped **`src/app/(dashboard)/admin/ferias/_components/ferias-view.tsx`** chrome (page wrapper outside `CollapsiblePageHeader`, `inputCls`, `useUtils` invalidation, `EmptyState`+icon, loading-guard, dark-mode, per-card mutation-error scoping):
- `CollapsiblePageHeader` "Pedidos administrativos" + KPI chips: Pendentes (solicitado) · Em análise · Deferidos (ano) · Próximo prazo.
- **rows**: assunto + dataPedido, prazo (if any), `StatusChip info={pedidoStatusInfo(estado)}`, seiProtocolo metadata, allowed-only lifecycle actions (analisar / deferir / indeferir / cancelar) → `atualizar`; "Excluir" with confirm.
- **form** (create/edit): assunto, descricao, dataPedido, prazo, seiProtocolo, observacao.
- `EmptyState` (icon); loading-guard; dark-mode inputs; per-card mutation-error scoping (lessons from prior UI reviews).
- **Nav:** add `{ label: "Pedidos Adm.", path: "/admin/pedidos-administrativos", icon: "FileText" }` to `CARREIRA_NAV` in `src/components/layouts/admin-sidebar.tsx` (confirm `FileText` is in the iconMap allowlist — it's used elsewhere, likely present; else add it).

---

## 8. Testing
- **Pure:** `transicoes` (edges/terminals/unknown); `projecao` (status map incl. indeferido→arquivado, titulo, shape carries `prazo`, no valorCents/dataFim); `status-visual` (5 + fallback).
- **Router structural:** `listar` uses `getVidaFuncionalScope`; writes guard titular; `criar`/`atualizar`/`remover` use `db.transaction`; `criar` uses the `criarPedidoComEvento` helper; `atualizar` gates via `podeTransicionar` and soft-deletes the event on cancelado; soft-delete filters; NO afastamentos; registered.
- **Migration:** scoped, idempotent, no other tables.

---

## 9. Out of Scope (explicit)
- `categoria` enum; SEI/ofício doc generation; pedido↔ofícios linkage; attachments (all v2).
- No vida_funcional enum/support-file change; no carreira router/view change (projection feeds the existing KPIs).
- No money; no afastamento cascade.
