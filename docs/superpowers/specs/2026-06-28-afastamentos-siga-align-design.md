# Afastamentos ↔ SIGA — alinhamento de campos formais

**Date:** 2026-06-28
**Status:** Approved design (pending spec review)
**Scope:** Slice B of the SIGA roadmap. Add SIGA's formal-solicitação metadata to the existing `afastamentos` table (the coverage table), as the scraper's afastamentos landing target. Reference: `docs/integrations/siga-carreira-map.md` (SIGA Afastamentos columns: Número da Solicitação, Duração, Data de Publicação, Data Inicial, Data Final, Situação).

---

## 1. Problem & Goal

`afastamentos` models team **coverage** (defensor↔substituto, `ativo` boolean). SIGA's Afastamentos is a formal **Solicitação** carrying fields we don't store (Número da Solicitação, Nº Siga, Data de Publicação, Situação). **Goal:** add these as additive nullable columns so afastamentos can mirror SIGA and the future scraper has a place to land — without changing the coverage semantics or the Carreira Hub.

---

## 2. Scope (YAGNI)

**In:** additive nullable columns on `afastamentos` (`numeroSolicitacao`, `nSiga`, `dataPublicacao`, `situacaoSiga`, `sigaSyncedAt`); the `coberturas` router `listar` returns them and `atualizar` accepts them; a light `/admin/coberturas` card touch to show `nº`/`SIGA:` when present.

**Deferred (v2):** modeling SIGA's afastamento sub-flows (Gozo / Indenização / Suspensão / Interrupção / Endereços / Comunicação) as structured fields — they stay folded into `situacaoSiga` (raw) for now; the SIGA scraper (Slice C).

---

## 3. Constraints (from existing code)

- **`afastamentos`** (`src/lib/db/schema/core.ts:438`): existing columns `defensorId, substitutoId, dataInicio, dataFim, tipo, motivo, ativo, acessoDemandas, acessoEquipe, timestamps`. New columns are ADDITIVE/nullable — existing rows/behaviour unaffected. Keep `ativo` as our operational state; `situacaoSiga` is the **raw SIGA mirror**, not a replacement.
- **No projection:** afastamentos do NOT project to `vida_funcional_eventos` (the carreira hub reads afastamentos directly via `coberturaRollup`). No event cascade. **No change to `coberturaRollup` / `carreira.ts`** — its `db.select().from(afastamentos)` picks up the new columns via SELECT *, but they are discarded by the `AfastamentoLite` mapping, so no code change and no behavioural change.
- **Consumers:** `coberturas.ts` router (`listar` explicit-column select; `atualizar` `if (input.X !== undefined)` pattern). The older `cobertura.ts` router is untouched **but its `db.query.afastamentos.findMany({with})` calls (`meusAfastamentos`, `coberturas`) will additively return the 5 new columns as `null`** — additive-safe, no code change, just a broadened return shape.
- Additive migration only; no other tables; idempotent. Dates `YYYY-MM-DD`.

---

## 4. Data Model — additive columns on `afastamentos`

`src/lib/db/schema/core.ts` — add to the `afastamentos` pgTable (after `acessoEquipe`, before `createdAt`):

```ts
numeroSolicitacao: text("numero_solicitacao"),
nSiga: text("n_siga"),
dataPublicacao: date("data_publicacao"),
situacaoSiga: text("situacao_siga"),
sigaSyncedAt: timestamp("siga_synced_at"),
```

(`text`, `date`, `timestamp` are already imported in core.ts.) No new index needed.

**Migration** `drizzle/0063_afastamentos_siga_align.sql` (verify it's the next free number in `drizzle/` on this branch — expected `0063`) — scoped idempotent `ALTER TABLE "afastamentos" ADD COLUMN IF NOT EXISTS …` for each. Hand-written (NOT `db:generate`). No other tables.

---

## 5. Router (`src/lib/trpc/routers/coberturas.ts`)

- `listar`: add the 5 new columns to the explicit `.select({...})` object (so the UI can read them).
- `atualizar`: add `numeroSolicitacao?, nSiga?, dataPublicacao?, situacaoSiga?` to the input schema — each as `z.string().optional()` (matching the existing `dataFim: z.string().optional()` convention; `dataPublicacao` carries an ISO `YYYY-MM-DD` string, no extra regex) — and the matching `if (input.X !== undefined) updateData.X = input.X` lines. (`sigaSyncedAt` is set only by the future scraper, not via this input.)
- No change to `criar`/`encerrar` or to the `cobertura.ts` router. No change to `carreira.ts` `coberturaRollup`.

---

## 6. UI (`src/app/(dashboard)/admin/coberturas/page.tsx` or its cobertura card)

Light touch: where a cobertura/afastamento is rendered, show, when present, a small muted metadata line `nº {numeroSolicitacao}` and/or `SIGA: {situacaoSiga}` (and `pub. {dataPublicacao}`). No form changes required in v1 (the fields are populated by the scraper or future edit UI). Respect dark-mode + existing tokens.

---

## 7. Testing
- **Schema:** a vitest asserting `afastamentos` exposes the 5 new columns (`expect((afastamentos as unknown as Record<string, unknown>)[col]).toBeDefined()`).
- **Router structural:** `coberturas.ts` `listar` selects `numeroSolicitacao`/`situacaoSiga`; `atualizar` input includes them.
- **Migration:** scoped additive `0063`, idempotent, no other tables.
- No pure-logic modules (this slice adds no computation).

---

## 8. Out of Scope (explicit)
- SIGA scraper (Slice C); structured sub-flow modeling (gozo/indenização/suspensão/interrupção).
- No `vida_funcional` projection; no `coberturaRollup`/carreira changes; no change to the `cobertura.ts` router.
- No lifecycle/enum change to afastamentos (keep `ativo`).
