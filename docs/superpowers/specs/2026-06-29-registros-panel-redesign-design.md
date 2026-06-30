# Registros Panel — Redesign & Standardization

**Date:** 2026-06-29
**Status:** Approved design (brainstorming) — ready for implementation plan
**Owner:** Rodrigo Rocha Meire

## 1. Problem

The "Registros" feature (timeline entries attached to a demanda/processo/assistido/atendimento/audiência) is the day-to-day record of what was read and what must be done on each case. Today it suffers from two classes of problem:

**UI/UX (the panel in the demanda drawer):**
- Idle/empty layout wastes space — `+ Adicionar` floats with a large dead gap; the empty state is a bland "Sem registros nesta demanda." that proposes no next action.
- Adding a registro has friction (no quick tipo presets surfaced; the add control competes with a sparse filter row).
- When populated, card readability and visual hierarchy are weak.
- The filter/search row (`Todos` chip + filter icon + search icon) reads as sparse and unclear.

**Architecture (consistency):**
- The feature is implemented divergently across **5 surfaces**, so it looks and behaves differently depending on where you are:
  1. Demanda drawer — `src/components/demandas-premium/DemandaQuickPreview.tsx` (+ `demandas-premium-view.tsx`)
  2. Processo detail — `src/app/(dashboard)/admin/processos/[id]/page.tsx` + `src/components/processo/sheet/processo-sheet.tsx`
  3. Assistido detail — `src/app/(dashboard)/admin/assistidos/[id]/page.tsx` via `FeedUnificado`/`FeedPorCaso`
  4. Atendimentos — `src/components/atendimentos/atendimento-detail-sheet.tsx`
  5. Audiência — `src/components/agenda/registro-audiencia/tabs/tab-anotacoes.tsx` (+ `agenda/sheet/sheet-action-footer.tsx`)

## 2. Goals & Non-Goals

**Goals**
- A single, refined, reusable Registros component shared across all 5 surfaces.
- Fix the 4 pain points: idle/empty layout, add flow, timeline readability, filter/search.
- Keep all existing behavior: `registros.create` side-effects (audiência auto-schedule, MPU/cautelar parsing, Sheets sync), inline edit/delete, "Com autos" (read PDF side-by-side), tipo taxonomy.

**Non-Goals**
- No change to the import/varredura pipelines that *populate* registros.
- No change to the tipo taxonomy values (`registro-tipo-config.ts`).
- No redesign of the `FeedUnificado` data merge logic — only its visual language is unified (see §6).
- Not addressing the separate "registros never created for `2_ATENDER` demandas" data gap (tracked separately as the *caso Fábio* catch-22).

## 3. Chosen Design — Direction B ("Composer-first timeline")

Validated visually with the user. Key decisions:

- **Composer-first:** a persistent "Adicionar registro…" bar sits at the top of the panel; clicking expands an inline editor (zero-click to start capturing). This removes the dead space and makes adding the primary affordance.
- **Two sections:**
  - **Pendências** (pinned at top, amber): open actionable items — `tipo='diligencia' AND status='agendado'`, sorted by `prazo asc`, each showing a countdown badge ("prazo 11/07 · 2d").
  - **Histórico** (below): everything else, grouped by day (desc) on a vertical timeline spine ("HOJE", "26 JUN").
- **Density:** balanced (between compact and comfortable).
- **Icons:** Lucide line-icons throughout (no emoji), per Padrão Defender.
- **Color coding by tipo:** Ciência = azul, Diligência = âmbar, Anotação = cinza (extends to the full taxonomy via `registro-tipo-config.ts` colors).
- **Toolbar:** search / tipo-filter / sort collapse into 3 header icon-buttons (replaces the sparse chip row). Tipo filter is a dropdown; search expands an inline text filter over `titulo + conteudo` (logic already exists in `registros-timeline.tsx`).

### Card anatomy (`RegistroCard`)
`[tipo dot/rail] [tipo badge + Lucide icon] [title, ellipsized] [relative time →]` / 2-line content preview / `[autor]`. Diligências in Pendências additionally show the prazo countdown.

## 4. Component Architecture

A single **`RegistrosPanel`** replaces the divergent usages. Props:

```ts
// Only dimensions that trpc.registros.list actually filters by. `casoId` is
// intentionally excluded: list does NOT filter by casoId today and no surface
// needs caso-scoped filtering — adding it would be unused (YAGNI). If a real
// caso scope is ever needed, extend registros.list first, then add it here.
type RegistrosScope = {
  assistidoId?: number;
  processoId?: number;
  demandaId?: number;
  audienciaId?: number;
};

type RegistrosPanelProps = {
  scope: RegistrosScope;                 // at least one id; drives trpc.registros.list
  variant?: "drawer" | "page" | "tab";   // chrome density/affordances per surface
  tiposPermitidos?: TipoRegistro[];      // restrict composer presets (e.g. audiência tab)
  tipoDefault?: TipoRegistro;            // default selected tipo in composer
  emptyHint?: string;                    // optional override of empty-state copy
  quickActions?: ("agendarAudiencia" | "adicionarPrazo")[]; // empty-state shortcuts
};
```

Internals (each independently understandable/testable):

| Unit | Responsibility | Reuses |
|---|---|---|
| `RegistrosPanel` | Orchestrates list query, derives Pendências/Histórico split, renders sections + toolbar + composer. | `trpc.registros.list` (scope), count query |
| `RegistroComposer` | Collapsed bar → expanded inline editor; tipo presets (3 primary + "mais"); prazo picker (diligência); "Abrir autos". | existing `RegistroEditor` logic, `registros.create`, `registro-com-autos-dialog.tsx` |
| `RegistrosToolbar` | Search / tipo-filter / sort as 3 header icon-buttons. | client-side filter from `registros-timeline.tsx` |
| `RegistroCard` | One registro row (badge + Lucide icon, title, preview, autor, time, hover edit/delete). | refactor of `registro-card.tsx`; `registros.update`/`delete` |
| `registro-tipo-config.ts` | Tipo taxonomy: labels, colors, **Lucide icons** (swap any non-Lucide glyphs). | existing, extended |

`registros-timeline.tsx` is **refactored in place** into `RegistrosPanel` (renamed) — no parallel wrapper is kept, to avoid two divergent components lingering. The section-splitting + grouping is pure, derived client-side from the `registros.list` result.

## 5. Data Model

**One additive migration** to power Pendências/prazo:

```sql
ALTER TABLE registros ADD COLUMN prazo date NULL;
```

- Backward-compatible (nullable, no backfill required).
- `RegistroComposer`'s prazo picker writes `registros.prazo` for diligências.
- Pendências = `tipo='diligencia' AND status='agendado'` ordered by `prazo asc nulls last`.
- Add `prazo` to the `registros.create`/`update` zod input + Drizzle insert in `src/lib/trpc/routers/registros.ts` and the `registros` table in `src/lib/db/schema/agenda.ts:179`.

`trpc.registros.list` is otherwise unchanged (already filters by each scope id and returns `autor`).

**Rejected alternative:** derive Pendências from `demanda.prazo`. Rejected because prazo on the demanda is ambiguous once the panel is scoped to a processo or assistido (many demandas, many prazos), and a registro-level prazo keeps the section self-contained across all scopes.

## 6. Standardization Rollout

| Surface | Change |
|---|---|
| Demanda drawer (`DemandaQuickPreview`) | Replace inline registros tab body with `<RegistrosPanel scope={{assistidoId,processoId,demandaId}} variant="drawer" />`. Quick actions (Agendar audiência / Adicionar prazo) become the empty-state shortcuts. |
| Processo detail / `processo-sheet` | `<RegistrosPanel scope={{processoId, assistidoId}} variant="page|tab" />`. |
| Atendimento sheet | `<RegistrosPanel scope={{assistidoId, ...}} variant="tab" />`. |
| Audiência tab (`tab-anotacoes`) | `<RegistrosPanel scope={{audienciaId, ...}} variant="tab" tiposPermitidos={...} />`. |
| Assistido detail (`FeedUnificado`/`FeedPorCaso`) | **Keep** the multi-source merge (registros + demandaEventos + audiências), but reskin its rows to the shared `RegistroCard` + adopt `RegistrosToolbar`. Visual parity, richer data. |

Phasing (for the implementation plan):
1. Build `RegistrosPanel` + internals + migration; wire the **Demanda drawer** first (the screenshot surface).
2. Roll to Processo, Atendimento, Audiência.
3. Reskin the Assistido feed.

## 7. Error Handling & Edge Cases

- **List/empty:** loading skeleton (Padrão Defender `animate-pulse`); empty state = composer + nudge + quick actions.
- **Composer save failure:** keep editor open, inline error toast, don't lose typed content; `registros.create` runs in a transaction already.
- **Side-effects preserved:** creating via the composer must go through `registros.create` (NOT a raw insert) so audiência auto-schedule / MPU-cautelar parsing / Sheets sync still fire.
- **Prazo null:** Pendências sorts nulls last; a diligência without prazo still appears in Pendências (no countdown badge) so it isn't lost.
- **Scope with no ids:** guard — render nothing / dev warning.
- **Long titles/content:** title ellipsizes; preview clamps to 2 lines.
- **Filtered-empty:** distinct copy ("Nenhum registro com esse filtro") vs truly empty.

## 8. Testing

- **Unit (pure):** Pendências/Histórico split + day-grouping from a fixture list; sort order; filter over `titulo+conteudo`.
- **Component:** composer expand→save calls `registros.create` with `prazo`; tipo presets; edit/delete via `registros.update`/`delete`.
- **Migration:** `db:generate`/`db:push` applies `registros.prazo`; existing rows read as null.
- **Visual regression:** the 5 surfaces render the same panel (variant chrome aside).
- **Manual:** verify side-effects (create a `ciencia` that designates an audiência → audiência still auto-schedules).

## 9. Open Questions

None blocking. Color tokens for the full 13-tipo taxonomy reuse `registro-tipo-config.ts`; only Ciência/Diligência/Anotação were validated visually — the rest inherit their existing config colors mapped to the new badge style.
