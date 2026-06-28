# SIGA Scraper — extração e importação da Carreira (Slice C)

**Date:** 2026-06-28
**Status:** Approved design (pending spec review)
**Scope:** Slice C of the SIGA roadmap. A read-only scraper that extracts the SIGA Carreira sections via CDP and imports them into OMBUDS through a staging→review→commit pipeline. Mirrors the proven SIGAD/PJe pipeline. Reference: `docs/integrations/siga-carreira-map.md`.

---

## 1. Problem & Goal

The carreira modules (Férias, Diárias, Ausências) and the afastamentos/férias SIGA-field alignments are built — but data is entered by hand. **Goal:** pull the defensor's real SIGA Carreira data (Férias, Afastamentos, Licenças, Outras Ausências) into OMBUDS automatically, via the established `enrichment-engine` scraper pattern + a staging/dedup/review/commit flow, landing it idempotently in the modules.

**Auth = CDP:** the defensor logs into SIGA in a Chrome with `--remote-debugging-port=9222` (exactly how the recon ran); the scraper attaches via `connect_over_cdp` and reuses the session. No credentials in code. Same model as the PJe scraper.

> ⚠️ **Validation caveat:** the recon SIGA account is flagged "Defensor(a) Inativo" (structure known, tables empty). The **pure parsers and the staging/dedup/upsert logic are fully unit-tested** against recon-shaped data; the **live CDP path + enrichment-engine deploy are validated structurally only** — a real-data run awaits an active SIGA account.

---

## 2. Scope (YAGNI — explicit)

**In:**
- **Python (enrichment-engine):** `siga_scraper_service.py` (CDP connect + navigate `/Carreira/{Ferias,Afastamentos,Licenca,OutrasAusencias}` + extract DataTables), a **pure `siga_parsers.py`** (BR-date + per-section row→dict mapping, unit-tested), `routers/siga.py` (one endpoint), Pydantic models, config.
- **OMBUDS:** `enrichment-client.ts` method + types; a `siga_import_staging` table; **pure `src/lib/siga-import/` logic** (dedup decision by `nSiga`, map a parsed row → `ausencias` insert/patch), unit-tested; `trpc/routers/siga.ts` (`extrair` → stage with dedup; `listStaging`; `confirmar` → upsert into `ausencias`); a review UI.
- **Landing:** Licenças + Outras Ausências → **`ausencias`** (clean fit, idempotent by `nSiga`). Férias + Afastamentos are extracted, staged, and shown in review, but **import is deferred** (see below).

**Deferred (v2):**
- **Importing Férias** (needs find-or-create of a `ferias_periodos` parent per aquisitivo) and **Afastamentos** (our `afastamentos` requires a `substitutoId` — SIGA's afastamento is the defensor's own leave, not a cobertura pairing). Both are extracted + staged + displayed read-only now; their commit is v2.
- enrichment-engine **deploy** to Railway (config + code land now; deploy is an ops step).
- Auto-scheduling / periodic sync (manual trigger only in v1).

---

## 3. Constraints (from existing code)

- **Branch base:** this slice is built on `feat/ausencias-modulo` (PR #292) — the `ausencias` table + router + `src/lib/ausencias/projecao.ts` (the landing target) exist there. The recon doc `docs/integrations/siga-carreira-map.md` is also present on this branch (the parser's column/situação reference).
- **enrichment-engine pattern** (`main.py` router registration; `auth.py` X-API-Key; `config.py` `@lru_cache get_settings`). **The auth/browser skeleton to mirror is `services/pje_scraper_service.py`** (`connect_over_cdp`, tab-search, rate-limit, singleton) — NOT `sigad_scraper_service.py` (that one launches a fresh browser + form-login, the opposite model).
- **SIGA HTML facts are recon-assumed, pending a live run on an active account:** the column order per section (from `docs/integrations/siga-carreira-map.md` + the recon JSONs), the **date format `DD/MM/YYYY`**, and the **Situação cell strings** ("Gozada"/"Indeferida"/"Desistência"/"Suspensa"/…). The parsers are written against these but MUST be re-verified on first live extraction; the situação mapper falls through to `solicitada` for any unrecognized string (safe default).
- **OMBUDS client** `src/lib/services/enrichment-client.ts` (`request()` + `X-API-Key`; `ENRICHMENT_ENGINE_URL`/`_API_KEY`).
- **Staging/import pattern** from `intimacoes.ts` (`criarImportJob`/`listStaging`/`confirmarImport`) + `pje-import.ts` (staging table + dedup decisao enum). Reuse the **shape**, not the tables.
- **`ausencias`** is the landing table (from the Ausências módulo): a SIGA Licença → `tipo:"licenca"`; Outra Ausência → `tipo:"outra_ausencia"`; setting `numeroSolicitacao, nSiga, dataPublicacao, situacaoSiga, sigaSyncedAt, motivo, dataInicio, dataFim` and a mapped `situacao`. The router's existing `criar` path projects the vida_funcional event — **the SIGA commit must reuse the same projection** (insert event + ausência + backfill) so imported rows light up the Hub identically.
- **Privacy:** all SIGA data is the logged-in defensor's own (CDP session). The import tRPC is `protectedProcedure`; staged/committed rows are owned by `ctx.user.id`.
- Dates: SIGA renders **`DD/MM/YYYY`** → parser converts to `YYYY-MM-DD`.

---

## 4. Python — enrichment-engine

### `config.py` (add to Settings)
```python
siga_cdp_url: str = "http://127.0.0.1:9222"
siga_base_url: str = "https://siga.defensoria.ba.def.br"
siga_scrape_rate_limit_seconds: float = 1.5
siga_scrape_timeout: int = 20_000
```

### `services/siga_parsers.py` — PURE (unit-tested)
- `parse_br_date(s: str) -> str | None` — `"01/07/2026" → "2026-07-01"`; empty/`"-"`/invalid → `None`.
- `parse_licenca_row(cells: list[str]) -> dict` — maps the Licença columns (Número Solicitação, Data Início, Data Final, Situação, Motivo Ausência, Duração, Data Publicação, Nº Siga, Observação, Interrupção, Suspensão) to `{numeroSolicitacao, dataInicio, dataFim, situacaoSiga, motivo, dataPublicacao, nSiga, observacao, interrompida, suspensa}` (booleans from the Interrupção/Suspensão cell text).
- `parse_outra_ausencia_row(cells)` — analogous (no Suspensão column).
- `parse_ferias_row(cells)` / `parse_afastamento_row(cells)` — map to display dicts (for staging/review; not committed in v1).
- Each `parse_*_row` is keyed by **column position by header** (the service passes header→index), tolerant of missing trailing cells.

### `services/siga_scraper_service.py` — browser I/O (structural)
- `SigaScraperService` + singleton `get_siga_scraper_service()`.
- `_connect()` → `connect_over_cdp(settings.siga_cdp_url)` (copy PJe `_connect`, incl. the "Chrome must be open with --remote-debugging-port=9222" error).
- `_get_siga_page()` → find the tab whose URL contains `siga.defensoria.ba.def.br`; raise a clear error if none (session not open) or if redirected to a login page.
- `_extract_table(page, url) -> {headers, rows}` → `page.goto(url, domcontentloaded)` + `page.evaluate(JS)` to read the first DataTable's `thead`/`tbody` cells (reuse the recon extraction JS).
- `extrair_carreira() -> dict` → for each Carreira section, `_extract_table`, then map rows via the matching `siga_parsers` function; return `{ licencas:[…], outras:[…], ferias:[…], afastamentos:[…], errors:[…] }`. Rate-limited; crash-resilient (try/except per section → record in `errors`, continue).

### `routers/siga.py` + models
- `POST /siga/extrair-carreira` (no body) → `SigaExtrairCarreiraOutput { success, licencas, outras, ferias, afastamentos, error }` (Pydantic). Calls the service; on any exception returns `success:false, error`.
- Register in `main.py` (`app.include_router(siga_router, tags=["SIGA"])`).

---

## 5. OMBUDS

### `enrichment-client.ts`
- `sigaExtrairCarreira(): Promise<SigaExtrairCarreiraOutput>` → `this.request<SigaExtrairCarreiraOutput>("/siga/extrair-carreira", {}, 120_000)` (the 3rd arg is `timeoutMs`, per the existing `request` signature). + the `SigaExtrairCarreiraOutput` / row types.

### `src/lib/db/schema/siga-import.ts`
```ts
export const sigaImportDecisaoEnum = pgEnum("siga_import_decisao", ["nova","ja_importada","atualizada"]);
export const sigaImportStaging = pgTable("siga_import_staging", {
  id, defensorId (FK users), sessionId (text — one extract run), tipo (text: licenca|outra_ausencia|ferias|afastamento),
  nSiga (text), numeroSolicitacao (text),
  payload (jsonb — the parsed row), decisao (sigaImportDecisaoEnum default "nova"),
  matchedAusenciaId (integer, nullable), importavel (boolean — false for ferias/afastamento in v1),
  selected (boolean default false), createdAt,
}, indexes on (defensorId, sessionId), (defensorId, nSiga));
```
Barrel + migration (verify next free number in `drizzle/` on this branch — expected `0064`; scoped idempotent: enum + table). Ephemeral (purgeable per session).

### `src/lib/siga-import/` — PURE (unit-tested)
- `dedup.ts`: `decidir(staged: {tipo,nSiga,payload}, existentesPorNSiga: Map<string, {id, …campos}>) -> { decisao: "nova"|"ja_importada"|"atualizada", matchedAusenciaId: number|null }` — `nova` if nSiga unseen; `ja_importada` if an `ausencias` row has that nSiga and the same fields; `atualizada` if nSiga matches but a field differs.
- `mapToAusencia.ts`: `mapLicencaToAusencia(payload) / mapOutraToAusencia(payload) -> { tipo, motivo, dataInicio, dataFim, situacao, numeroSolicitacao, nSiga, dataPublicacao, situacaoSiga, suspensa, interrompida, observacao }` — incl. `situacao` mapping from the raw SIGA situação string (e.g. "Gozada"→`gozada`, "Indeferida"/"Desistência"→`indeferida`, "Suspensa"→`deferida`+`suspensa:true`, else `solicitada`). **`observacao` is carried through** (column exists).

### `src/lib/trpc/routers/siga.ts`
- `extrair` (protected mutation): call `enrichmentClient.sigaExtrairCarreira()`; for licença/outra rows compute `decidir(...)` against the user's existing `ausencias` (by nSiga); insert staging rows (`importavel:true` for licença/outra, `false` for ferias/afastamento) under a new `sessionId`; return `{ sessionId, counts }`.
- `listStaging` (protected query, by `sessionId`): return staged rows grouped by tipo + decisao, with the matched ausência summary.
- `confirmar` (protected mutation): for `selected` importável rows, in a transaction —
  - `nova` → call the shared `criarAusenciaComEvento` helper with the **mapped `situacao`** (see helper note below) + `sigaSyncedAt: now`.
  - `atualizada` → update the matched ausência's SIGA fields **and `situacao` directly to the mapped value, BYPASSING `podeTransicionar`** — SIGA is the authoritative source of truth, not a user-driven workflow transition, so a `solicitada→gozada` jump or a re-sync of a terminal row must NOT throw. Re-derive the projection (status via `statusEventoDeAusencia`, titulo/tipo/dates/valorless) and update the linked event (or soft-delete it if the new `situacao` is `indeferida`/`cancelada`), mirroring `ausencias.atualizar`'s cascade **minus the transition guard**.
  - Idempotent by `nSiga`. Returns counts.
- Registered as `appRouter.siga`. **Shared helper (additive refactor):** extract the create-from-fields + projection-event insert/backfill out of the existing `ausencias.ts` `criar` into `src/lib/ausencias/persist.ts` → `criarAusenciaComEvento(tx, defensorId, fields)`, where `fields` **includes a `situacao` (default `"solicitada"`)**. `ausencias.criar` calls it with `situacao: "solicitada"` (preserving today's hardcoded behaviour — note `ausencias.criar`'s `baseFields` has no `situacao` input, so the default keeps it identical); `siga.confirmar` calls it with the mapper's `situacao`. The existing ausências router tests must still pass after the refactor (behaviour for the `criar` path is unchanged; the helper is additive).

### UI — `src/app/(dashboard)/admin/siga-import/page.tsx` (+ view)
- A "Sincronizar com SIGA" button → `extrair` → shows staged rows grouped by tipo with decisao chips (nova/ja_importada/atualizada); licença/outra rows selectable; ferias/afastamento rows shown read-only with a "importação v2" note. Confirm → `confirmar`. Padrão Defender v5; loading/empty/error states; the CDP precondition surfaced as an inline hint ("abra o SIGA no Chrome com depuração remota").

---

## 6. Testing
- **Python (pytest — confirmed present: `pytest>=8.0.0` + `pytest-asyncio` in `enrichment-engine/requirements.txt`):** `siga_parsers` — `parse_br_date` (valid/empty/`"-"`/invalid), `parse_licenca_row`/`parse_outra_ausencia_row` (full mapping incl. boolean cells from Interrupção/Suspensão + missing trailing cells), keyed by header. Test file under `enrichment-engine/tests/`.
- **TS (vitest):** `siga-import/dedup` (nova/ja_importada/atualizada by nSiga + field diff); `mapToAusencia` (situação→situacao mapping incl. suspensa/indeferida, all fields).
- **Structural:** `siga.ts` router uses `protectedProcedure`, owns rows by `ctx.user.id`, `confirmar` reuses the ausências projection helper, idempotent by nSiga; the shared ausências helper is called by both routers.
- **Migration:** scoped `0064` (enum + staging table), idempotent.
- No live SIGA assertion (blocked); the service's `_extract_table` JS mirrors the validated recon extraction.

---

## 7. Out of Scope (explicit)
- Committing Férias/Afastamentos (período/substituto reconciliation) — v2.
- enrichment-engine Railway deploy; periodic/scheduled sync.
- Any write back to SIGA (read-only).
- Changes to the carreira hub / other modules beyond the shared ausências projection helper (a refactor, behaviour-preserving).
