# Férias ↔ SIGA — alinhamento de campos formais

**Date:** 2026-06-28
**Status:** Approved design (pending spec review)
**Scope:** Extend the shipped Férias módulo (PR #289) with the formal SIGA fields, so it mirrors SIGA's `/Carreira/Ferias` and defines the target for the future SIGA scraper. Reference: `docs/integrations/siga-carreira-map.md`.

---

## 1. Problem & Goal

SIGA's férias row is a formal **Solicitação** carrying fields our `ferias_parcelas` lacks (Número Solicitação, Provimento, Data de Publicação, Nº Siga, Suspensão) and a first-class **Conversão em pecúnia** (abono) outcome. To make Férias SIGA-faithful — and to give the scraper a place to land — we add these as **additive, nullable columns** plus a small projection/UI surface. Existing rows and the saldo logic are unaffected.

---

## 2. Scope (YAGNI)

**In:** additive columns on `ferias_parcelas`; `conversaoPecunia` + `valorAbonoCents` (abono, un-deferred from the original Férias v2 list because SIGA makes it first-class); `suspensa` boolean; the formal-id fields; a `situacaoSiga` raw mirror + `sigaSyncedAt` provenance; router input + projection for abono valor; UI fields.

**Deferred (v2):** full suspensão/interrupção **event history** (we keep a boolean now); the SIGA **scraper** itself (separate slice); auto-mapping SIGA situação → our status (the scraper's job later); other SIGA Carreira sections (Licenças, Outras Ausências, etc.).

---

## 3. Constraints (from existing code)

- **Keep our lifecycle enum** `ferias_status` (`programada→homologada→em_fruicao→concluida`/`cancelada`) as the workflow truth. `situacaoSiga` is a **raw text mirror** of SIGA's situação, NOT a replacement enum. (Loose mapping for humans/scraper: gozada→concluida, suspensa→`suspensa` flag, não gozada→programada/homologada.)
- **Saldo unchanged.** `computeSaldo` already counts non-cancelada parcelas; an abono parcela still consumes entitlement dias (`conversaoPecunia` does NOT exclude it). No change to `src/lib/ferias/saldo.ts`.
- **Projection target** is `vida_funcional_eventos` (tipo FERIAS, cluster ausencias). For an abono parcela the projected event carries `valorCents = valorAbonoCents` (surfaces the cash value in the Hub's ausências cluster). Non-abono parcelas keep `valorCents` null.
- **Privacy / transactions / soft-delete / titular guard** unchanged — the router's existing patterns apply to the new fields.
- Additive migration only; no enum changes; no changes to `ferias_periodos`.
- Current projection fn (`src/lib/ferias/projecao.ts`): `projecaoEventoDeParcela(parcela:{id,dataInicio,dataFim,status}, periodo, ordem)` → `ProjecaoEvento` (no valorCents today). This spec extends both.

---

## 4. Data Model — additive columns on `ferias_parcelas`

`src/lib/db/schema/ferias.ts` — add to `feriasParcelas`:

```ts
numeroSolicitacao: text("numero_solicitacao"),
nSiga: text("n_siga"),
provimento: text("provimento"),                          // nº do ato / provimento
dataPublicacao: date("data_publicacao"),
conversaoPecunia: boolean("conversao_pecunia").default(false).notNull(),
valorAbonoCents: bigint("valor_abono_cents", { mode: "number" }),
suspensa: boolean("suspensa").default(false).notNull(),
situacaoSiga: text("situacao_siga"),                     // raw SIGA situação mirror
sigaSyncedAt: timestamp("siga_synced_at"),               // provenance for scraped rows
```

(Imports `boolean`, `bigint` added to the drizzle import line.) No new index needed.

**Migration:** scoped idempotent `drizzle/0060_ferias_siga_align.sql` — `ALTER TABLE "ferias_parcelas" ADD COLUMN IF NOT EXISTS …` for each. Booleans get `DEFAULT false NOT NULL` (safe backfill on existing rows). Hand-written (NOT `db:generate`). No other tables touched.

---

## 5. Pure logic (`src/lib/ferias/projecao.ts`)

Extend the projection to carry an optional value for abono:

- `ProjecaoEvento` gains `valorCents: number | null`.
- `projecaoEventoDeParcela`'s `parcela` arg gains `conversaoPecunia?: boolean` and `valorAbonoCents?: number | null`. When `conversaoPecunia` is true → `valorCents = valorAbonoCents ?? null` (NOT `?? 0` — R$0 ≠ "unknown amount"; a future scraper writing an abono row with a null value must surface null, and the scraper slice must enforce `valor_abono_cents NOT NULL` when `conversao_pecunia = true` at its own layer) and the titulo is suffixed `" (abono pecuniário)"`; otherwise `valorCents = null` and titulo unchanged.
- `statusEventoDeParcela`, `tituloParcela`, saldo: unchanged.

Unit-tested: abono → valorCents set + titulo suffix; non-abono → valorCents null + titulo unchanged.

---

## 6. Router (`src/lib/trpc/routers/ferias.ts`)

- `criarParcela` / `atualizarParcela` input schemas gain the new optional fields: `numeroSolicitacao?`, `nSiga?`, `provimento?`, `dataPublicacao?` (ISO), `conversaoPecunia?` (boolean), `valorAbonoCents?` (int ≥ 0), `suspensa?` (boolean), `situacaoSiga?`. (`sigaSyncedAt` is set only by the future scraper, not via this input.)
- `criarParcela`: persist the new fields; when building the projection, pass `conversaoPecunia`/`valorAbonoCents`. **Add `valorCents: proj.valorCents` to the `vidaFuncionalEventos.values()` insert** (it has no `valorCents` key today). Validation: if `conversaoPecunia` then `valorAbonoCents` must be present (≥ 0) — `BAD_REQUEST` if missing.
- `atualizarParcela`: accept partial updates to the new fields; re-derive the projection. **Two corrections to the current code, because abono changes the projection without changing dates:**
  1. The current router fetches `periodo` only inside the date-change/saldo-guard block. Since `conversaoPecunia`/`valorAbonoCents` changes also affect the projection (titulo + valorCents) but don't touch dates, **fetch `periodo` unconditionally** (filtered `isNull(deletedAt)`, `NOT_FOUND` if gone) whenever the parcela is being updated, so it's available to rebuild the projection.
  2. The current `vidaFuncionalEventos` SET (non-cancel branch) writes only `{status, dataEvento, dataFim, updatedAt}`. **It must also set `titulo: proj.titulo` and `valorCents: proj.valorCents`** so abono toggles propagate. Existing cascade rules (cancel → soft-delete evento; transitions gated; saldo guard on date change) unchanged.
- `listar`: return the new fields on each parcela (already returns the row; extend the mapped shape so the UI can read them).
- Saldo guard unchanged — abono parcelas count toward `programados`/`concluidos` exactly like gozo parcelas.

---

## 7. UI (`src/app/(dashboard)/admin/ferias/_components/ferias-view.tsx`)

- **Add-parcela form:** new optional inputs — Nº Solicitação, Provimento, Data de Publicação, a **"Converter em pecúnia (abono)"** checkbox that reveals a Valor (R$) input, and a **Suspensa** checkbox. Inputs carry dark-mode variants (existing `inputCls`).
- **Parcela rows:** show provimento / nº solicitação as metadata; when `conversaoPecunia`, render an "abono R$ …" chip (R$ via `toLocaleString("pt-BR",{style:"currency",currency:"BRL"})`); when `suspensa`, a "suspensa" amber chip; when `situacaoSiga` present, show it as a small SIGA-source label.
- No change to KPIs/saldo bar.

---

## 8. Testing

- **Pure:** `projecao` — abono parcela → `valorCents = valorAbonoCents` + titulo `"… (abono pecuniário)"`; non-abono → `valorCents: null`, titulo unchanged. Existing projecao tests still pass.
- **Router structural:** input schemas include the new fields; `criarParcela` rejects `conversaoPecunia` without `valorAbonoCents`, and its `vidaFuncionalEventos.values()` includes `valorCents`; `atualizarParcela`'s evento SET includes `titulo` and `valorCents`, and `periodo` is fetched unconditionally. (Source-reading test, extending the existing `ferias-router.test.ts`.)
- **Behavioural (the update path — guards issues that source-reading can't fully catch):** specify that toggling `conversaoPecunia=true, valorAbonoCents=X` on an existing non-abono parcela must rewrite the linked `vida_funcional_eventos` row with the suffixed titulo (`"… (abono pecuniário)"`) and `valorCents = X`. (Covered at the pure-projection level by the §5 test; the router test asserts the SET clause includes both columns.)
- **Migration:** scoped additive `0060`, idempotent, no other tables; booleans default false.
- **Saldo:** unchanged — add a test asserting an abono parcela still consumes saldo (counts in `programados`/`concluidos`).

---

## 9. Out of Scope (explicit)
- The SIGA scraper (separate slice) — this only defines/prepares the target fields.
- Suspensão/interrupção event history (boolean only for now).
- Auto-mapping SIGA situação → our status (scraper's job).
- New SIGA modules (Licenças, Outras Ausências, Licença Prêmio, Compensação) — separate slices.
- No changes to carreira router/views beyond what the projection already feeds.
