# Carreira Hub — Panoramic Functional/Administrative Cockpit

**Date:** 2026-06-28
**Status:** Approved design (pending spec review)
**Scope:** First slice of the "vida funcional / day-to-day administrative" panorama for OMBUDS/Defender.

---

## 1. Problem & Goal

A Defensor Público's day-to-day involves many functional/administrative threads — férias,
diárias, substituições, convocações, pedidos administrativos, prazos, gratificações. Today these
live in separate surfaces (or not at all) and there is no single panoramic view of "what is
active and what is coming up" in a defensor's functional life.

**Goal:** a single role-switched **Carreira Hub** cockpit that aggregates the existing functional
data into one panoramic day-to-day view, refined to Padrão Defender v5. This is step 1 of a larger
roadmap; later modules feed richer data into this same hub.

### Roadmap context (this spec = step 1 only)

1. **Carreira Hub** — role-switched cockpit over existing data *(this spec)*
2. Módulo Férias — dedicated table + workflow
3. Módulo Diárias — dedicated table + payment tracking
4. Módulo Pedidos Administrativos — dedicated table + SEI protocol
5. UI/UX refinement pass on vida-funcional / substituições to Padrão Defender v5

Steps 2–4 use **dedicated tables per domain** (decided), each linking back to
`vida_funcional_eventos` for the unified timeline. They are out of scope here.

---

## 2. Constraints (from existing code)

- **Privacy boundary is intentional.** `getVidaFuncionalScope(user)`
  (`src/lib/trpc/vida-funcional-scope.ts:10-22`) deliberately gives admin **no god-view** of
  others' funcional data ("admin sem god-view dos dados funcionais alheios (caráter sensível)").
  Férias details, diárias values, and pedidos administrativos are personal-sensitive.
  - Scope rules: `estagiario` → `[supervisorId]`; `servidor` → `defensoresVinculados`;
    `defensor`/`admin`/`triagem` → `[user.id]` (own only).
- **Operational data is legitimately shared.** `afastamentos` ("cobertura de equipe": who covers
  whom for case access) and `substituicoes` (coverage + gratification lifecycle) are operational,
  not personal-sensitive, and may appear in a management rollup.
- **Two distinct coverage tables (confirmed against schema):**
  - `afastamentos` (`src/lib/db/schema/core.ts:438`) = case-access coverage. Has **notNull
    `defensorId` (away) + `substitutoId` (covers)** — every afastamento is *intrinsically paired*;
    plus `dataInicio`/`dataFim`, `tipo` (default `FERIAS`), `ativo`, `acessoDemandas`,
    `acessoEquipe`. So who-covers is never null here.
  - `substituicoes` (`src/lib/db/schema/funcional.ts`) = gratification-claim lifecycle, with an
    **optional `afastamentoId`** linking back to an afastamento. A claim may not yet exist for a
    given coverage.
  - These model different things; the rollup joins them via `substituicoes.afastamentoId =
    afastamentos.id`.
- **No new schema in this slice.** The hub is a read-only aggregation layer over existing tables.
  No migration.
- Follow existing conventions: page in `src/app/(dashboard)/admin/{module}/page.tsx`, router in
  `src/lib/trpc/routers/{module}.ts` registered in `routers/index.ts`, Padrão Defender v5 tokens
  (`src/lib/config/design-tokens.ts`), `CollapsiblePageHeader`, DS primitives (`StatusChip`,
  `EmptyState`).

### Existing data surfaces reused

- `vida_funcional_eventos` (`src/lib/db/schema/vida-funcional.ts`) — polymorphic timeline, 4
  clusters (`progressao`, `ausencias`, `contraprestacao`, `administrativo`), status
  (`previsto`/`em_curso`/`concluido`/`pendente`/`arquivado`), `dataEvento`/`dataFim`/`prazo`,
  `valorCents`, soft-delete via `deletedAt`.
- `substituicoes` (`src/lib/db/schema/funcional.ts`) — lifecycle
  `em_andamento`/`concluida`/`oficiada`/`paga`, pendência fields (`oficioNumero`, `relatorioPath`,
  `seiProtocolo`), optional `afastamentoId`.
- `afastamentos` — coverage table (who's away ↔ who covers), confirmed present (see Constraints).
- Existing components: `trajetoria-timeline.tsx`, `vida-funcional-view.tsx` (currently in the
  route-private `admin/carreira/vida-funcional/_components/`), DS primitives.

---

## 3. Chosen Approach

**A — Dedicated `carreira` cockpit page + read-only aggregation router.**

`carreira/` is an **existing route section** (it already hosts `vida-funcional/`); it has no
`layout.tsx` and no index `page.tsx` (confirmed), so we add the index `page.tsx` at
`admin/carreira/page.tsx` plus a new `carreira` tRPC router whose queries fan out across the
existing tables. **All mutations stay in their existing routers** (`vida-funcional`,
`substituicoes`); the hub only reads and links out / delegates. The existing vida-funcional
timeline becomes one panel inside the hub.

**Component reuse / cross-route import.** `trajetoria-timeline.tsx` currently lives in the
route-private `vida-funcional/_components/`. Importing it from the carreira index page crosses
route boundaries, which the project has hit before (Turbopack cross-route `[id]` import gotcha,
recorded in memory). To avoid it, **promote `trajetoria-timeline.tsx` to a shared location**
(`src/components/carreira/` or `src/components/vida-funcional/`) and re-import it from the existing
vida-funcional view. This is a targeted move, not a refactor.

Rejected alternatives:
- **B — Evolve vida-funcional page in place.** Tangles read-only timeline with cross-domain
  aggregation + role-switching; worse boundaries.
- **C — Carreira section inside Observatory.** Observatory is conceptually admin-only; the
  personal cockpit doesn't belong there and inherits the wrong scope model.

### Unit boundaries

| Unit | Responsibility | Depends on |
|------|----------------|------------|
| `carreira.ts` router — `meuPanorama` | Personal aggregation for logged-in defensor | `vidaFuncionalEventos`, `substituicoes`, `getVidaFuncionalScope` |
| `carreira.ts` router — `coberturaRollup` | Management operational rollup (admin) | `afastamentos`, `substituicoes`; admin-gated |
| `carreira/page.tsx` | Role switch + layout composition | router via tRPC |
| Personal cockpit panels | Render KPIs + cluster cards + timeline | `meuPanorama`, existing `trajetoria-timeline` |
| Management rollup panels | Render cobertura + pendências + per-defensor counts | `coberturaRollup` |

Each panel is independently understandable: it takes one query result and renders it; a failing
sub-query degrades that panel, not the page.

---

## 4. Data Contracts

### `carreira.meuPanorama` (query, protected)

Scope: `getVidaFuncionalScope(ctx.user)` (own data; servidor/estagiário see linked defensor).
Optional input: `{ defensorId?: number }` validated to be within scope (servidor/estagiário
selecting among linked defensores); defaults to the primary scoped id.

Returns:
```ts
{
  kpis: {
    proximoPrazo: { titulo: string; prazo: string; tipo: string } | null;
    substituicoesAtivas: number;   // status em_andamento | concluida | oficiada (not paga)
    pedidosPendentes: number;      // tipo SOLICITACAO_ADM, status pendente|em_curso
    feriasAgendadas: number;       // tipo FERIAS, status previsto|em_curso, dataFim >= today
  };
  agoraProximos: Array<{          // em_curso now OR upcoming within window, all clusters
    id: number; tipo: string; cluster: string; titulo: string;
    status: string; dataEvento: string; dataFim: string | null; prazo: string | null;
  }>;
  clusters: {
    ausencias:        ClusterSummary;
    contraprestacao:  ClusterSummary;
    progressao:       ClusterSummary;
    administrativo:   ClusterSummary;
  };
}

type ClusterSummary = {
  total: number;
  emCurso: number;
  pendentes: number;
  itens: Array<{ id: number; tipo: string; titulo: string; status: string;
                 dataEvento: string; prazo: string | null; valorCents: number | null }>;
};
```
Always excludes `deletedAt is not null`. "Upcoming window" = next 90 days (constant, tunable).

### `carreira.coberturaRollup` (query, admin only)

Gate: `adminProcedure` (or role check) — returns 403/empty for non-admin. **Operational data only;
no personal funcional detail.**

Source model: `cobertura` is driven by **`afastamentos`** (the always-paired coverage table),
**left-joined** to `substituicoes` via `substituicoes.afastamentoId = afastamentos.id` for the
gratification status. Therefore `defensorAfastado` and `defensorSubstituto` come from
`afastamentos` and are **never null**; the substituição fields **are** nullable (a coverage may
have no gratification claim yet). `semCobertura` = active afastamentos with **no linked
substituição** (coverage happening, gratification process not yet opened) — a real operational gap.

Returns:
```ts
{
  kpis: {
    afastadosHoje: number;             // afastamentos.ativo, today within [dataInicio,dataFim]
    substituicoesAbertas: number;      // substituicoes.status != paga
    semCobertura: number;              // active afastamentos with no linked substituição
    gratificacoesAOficiar: number;     // substituicoes.status = concluida (awaiting ofício)
    gratificacoesAPagar: number;       // substituicoes.status = oficiada (awaiting payment)
  };
  cobertura: Array<{                    // who's away ↔ who covers (from afastamentos)
    afastamentoId: number; defensorAfastado: string; periodo: string;
    substituicaoId: number | null; defensorSubstituto: string;   // substituto never null
    statusGratificacao: string | null; // from linked substituição, null if none
  }>;
  pendencias: Array<{                   // substituições by pending step
    substituicaoId: number; defensorSubstituto: string; unidadeSubstituida: string;
    status: string; faltando: string[]; // e.g. ["ofício","relatório","SEI"]
  }>;
  porDefensor: Array<{ defensorId: number; nome: string;
                       substituicoesAbertas: number; afastamentoAtivo: boolean }>;
}
```

---

## 5. UI Layout (Padrão Defender v5)

`CollapsiblePageHeader` with role-aware title and KPI stats row. Card grid using
`CARD_STYLE.base`, `SPACE` grid, `TYPO` scale, `StatusChip` for statuses.

### Personal cockpit (defensor)
- **Header KPIs:** Próximo prazo · Substituições ativas · Pedidos pendentes · Férias agendadas
- **"Agora & Próximos"** panel — actionable list of em_curso + upcoming across all clusters,
  `StatusChip`, sorted by prazo/dataEvento.
- **Four cluster cards:** Ausências · Contraprestação · Progressão · Administrativo — each shows
  total/emCurso/pendentes + a short item list, linking to the relevant detail surface.
- **Trajetória** panel — reuses existing `trajetoria-timeline.tsx`.
- **Quick actions** — link to existing create surfaces. The `substituicoes` and `vidaFuncional`
  routers expose create mutations; the exact UI entry points (dialog vs. route) are to be
  confirmed during implementation and reused, not rebuilt. Later wired to dedicated módulos
  (Férias/Diárias/Pedidos).

### Management rollup (admin/coordenador)
- **Header KPIs:** Afastados hoje · Substituições abertas · Sem cobertura · Gratificações a
  oficiar / a pagar.
- **Cobertura** panel — afastamento-driven cobertura list (who's away ↔ who covers), with the
  linked gratification status where a substituição exists.
- **Pendências operacionais** — substituições grouped by missing step.
- **Per-defensor operational rollup** — counts only, no sensitive detail.

### States
- `EmptyState` per panel when no data in period.
- Loading skeletons via existing patterns.
- Resilient: a failing sub-query degrades only its panel.

---

## 6. Testing

Router-level (primary, since this is an aggregation layer):
- **Scope enforcement:** defensor sees only own events; `coberturaRollup` is admin-gated and
  returns **no** personal funcional detail of others (regression guard for the privacy boundary).
- **Aggregation correctness:** seeded `vida_funcional_eventos` produce the right KPI counts,
  cluster summaries, and agoraProximos windowing (90-day boundary, em_curso inclusion).
- **Soft-delete:** `deletedAt` rows excluded everywhere.
- **Cobertura join edge:** an active afastamento with **no linked substituição** appears in
  `semCobertura` and renders `statusGratificacao: null`; once a `substituicoes` row links via
  `afastamentoId`, it drops out of `semCobertura` and shows the gratification status.

UI-level (light): role switch renders the correct cockpit; empty states render with no data.

No new schema → no migration test.

---

## 7. Out of Scope (explicit)

- Dedicated módulos Férias / Diárias / Pedidos Administrativos (steps 2–4).
- Any new write/mutation flow — the hub reads and delegates only.
- God-view of others' personal funcional data — deliberately excluded.
- The broader UI/UX refinement pass on existing modules (step 5).
