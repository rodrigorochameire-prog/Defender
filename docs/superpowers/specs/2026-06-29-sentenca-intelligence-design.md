# Sentença Intelligence — Design Spec

**Date:** 2026-06-29
**Status:** Draft (awaiting review)
**Slice:** 1 of N — Sentença 1º grau (criminal). Acórdão / 2º grau and intelligence dashboards are deferred (see §9).

## 1. Purpose

When a demanda is classified as a **sentença de 1º grau** (ciência/análise de sentença, condenação, absolvição, pronúncia, etc.), automatically:

1. Extract the sentença PDF from PJe.
2. Archive it in the assistido's organized Drive folder.
3. Run a structured AI analysis of the decision.
4. Persist that analysis into shared, institution-wide tables keyed by **magistrado** and **unidade judicial (vara/comarca)**.

The goal is dual intelligence: **functional** (how the judge in my unit is deciding — condenação/absolvição patterns, penas, teses that prevail) and **institutional** (the same, aggregated across every DPE-BA defensor who uses OMBUDS). This slice produces and stores the data; the dashboards that consume it are deferred to a later slice.

This is the 1º-grau mirror of the already-existing 2º-grau model (`acordaos` / `desembargadores` / `AnaliseAcordao` in `src/lib/db/schema/instancia-superior.ts`).

## 2. Decisions (locked)

| Decision | Choice |
|---|---|
| First slice | Sentença 1º grau (criminal) |
| Trigger | Automatic, on varredura classification |
| AI execution path | claude-max daemon (free, via `claude_code_tasks` + new skill) — respects the paid-API firewall |
| Visibility | Aggregates shared institution-wide; individual sentença row + assistido detail scoped to the responsible defensor (+ admin) |

## 3. What already exists (reuse, do not rebuild)

- **Classification**: the rich sentença atos ("Analisar sentença", "Ciência condenação/absolvição", "Ciência da pronúncia") are produced by the **`varredura-triagem` skill's LLM deep-read**, NOT by `src/lib/ato-suggestion.ts` (which only maps `/^Sentença$/i → ato "Ciência"`, generic — `ato-suggestion.ts:131-135`). This means our hook can only fire **post-varredura**, and inherits the known catch-22: varredura runs only on `5_TRIAGEM`/`URGENTE` demandas (see project memory `gotcha_leitura_profunda_so_triagem`). The varredura scrapes decision text into **`registros.enrichmentData.raw_text`** (≤12k chars; `varredura_triagem.py:1109`) — on the *registro*, not the demanda. The download key is **`demandas.pjeDocumentoId`** (`core.ts:348`), with `demandas.enrichmentData.id_documento_pje` (`core.ts:368`) as fallback.
- **PDF download by document id**: `enrichment-engine/services/pje_playwright_service.py::download_document(id_documento, tipo_documento)`.
- **Drive home + helpers**: every assistido folder has a `03 - Decisões e Sentenças` subfolder; `src/lib/services/assistido-drive-folder.ts::ensureAssistidoDriveFolder(assistidoId)`, `criarOuEncontrarPasta`, upload helpers in `src/lib/services/google-drive.ts`.
- **Full-text extraction**: `enrichment-engine/services/ocr_service.py` / `docling_service.py`.
- **AI execution lanes**: `claude_code_tasks` (`src/lib/db/schema/casos.ts`) with `lane: browser|ai`, enqueued via `src/lib/trpc/routers/analise.ts`, executed by `scripts/claude-code-daemon.mjs`. Cost firewall: `claude-code-daemon.mjs` strips API keys so `claude -p` uses only the Max account.
- **Robust JSON extraction pattern**: `enrichment-engine/services/analysis_service.py::_parse_analysis_response` (direct → markdown fence → first/last brace).
- **Registro cards**: `registros` table (`src/lib/db/schema/agenda.ts`), tipo `analise`; written today by the `analise-intimacao` skill (`write_analise.py`).
- **Scope model**: `src/lib/trpc/defensor-scope.ts` — demandas private per defensor; assistidos/processos/casos shared. Sentença/magistrado data follows the *shared* track.
- **2º-grau reference model**: `acordaos` (with `driveFileId`, `analiseStatus`, `analiseIa: jsonb<AnaliseAcordao>`), `desembargadores`. The new tables mirror these.

## 4. Architecture & data flow

Two queued stages hanging off the existing varredura:

```
varredura classifies demanda
   └─ ato ∈ {sentença set}  AND  1ª-instância criminal (NOT acórdão)
        │  NEW hook: enqueue capture task
        ▼
[browser-lane] capturar-sentenca
   • navigate/open the process in PJe FIRST (Painel → processo → doc list),
     because download_document(id) matches `a:has-text('{id}')` on the CURRENT page
     (pje_playwright_service.py:142) — it is NOT a standalone fetch-by-id
   • download PDF (download key = demandas.pjeDocumentoId)
   • upload → Drive "03 - Decisões e Sentenças" (ensureAssistidoDriveFolder + subfolder)
   • insert a drive_files row → obtain its integer id
   • extract full text (docling/OCR)
   • returns { driveFilesRowId (int), textoIntegral }
        │  on success: enqueue analysis task
        ▼
[ai-lane] analise-sentenca  (claude -p, new skill, FREE)
   • input = full sentença text (textoIntegral; fallback = registro raw_text, ≤12k)
   • token guard: if text > ~120k tokens, chunk/summarize before final pass
   • output = AnaliseSentenca JSON (robust extraction)
        │
        ▼
persist:
   • upsert magistrados row (match nomeNormalizado + comarcaId, else create NAO_CONFIRMADO)
   • upsert sentencas row (idempotent via partial unique index, §5.2)
   • create registro tipo "analise" on the demanda
   • refine demanda.ato only if confidence = alta and current ato is generic
```

Capture-first rationale: dosimetria and teses require the **full** sentença (often 20–40 pp.), so PDF→text precedes analysis instead of relying on the ≤12k-char registro `raw_text`.

### Classification hook (the only change to the existing trigger)

The varredura LLM deep-read already classifies. The new hook fires **after** classification, when:

- the resolved ato is in the sentença set (see §4.1), AND
- it is **not** an acórdão ato (the only real exclusion is the ato-set filter in §4.1 — there is no "title-priority" mechanism in code; acórdão atos like "Analisar acórdão"/"Ciência acórdão" simply are not in the capture set), AND
- a download id is present (`demandas.pjeDocumentoId`, else `enrichmentData.id_documento_pje`).

If no download id is present, skip capture and fall back to analyzing the registro `raw_text` (§7).

### 4.1 Sentença ato set (derived, not hand-typed)

Do **not** hardcode a flat string list — the exact atos differ per atribuição in `src/config/atos-por-atribuicao.ts` (e.g. "Ciência desclassificação" has no "da"; Júri/VVD/Criminal carry different condenação/absolvição variants). Instead, **derive** the set: normalize each configured ato (lowercase, accent-stripped) and include those matching `/senten|condena|absolvi|pron[uú]ncia|impron|desclassifica/` **minus** any matching `/ac[oó]rd[aã]o/`. This auto-captures variants and excludes acórdão without a brittle literal list.

## 5. Data model (two new SHARED tables)

New schema file: `src/lib/db/schema/sentencas.ts`. Mirror conventions from `instancia-superior.ts`.

### 5.1 `magistrados` (1º grau registry — shared)

| Column | Type | Notes |
|---|---|---|
| id | serial PK | |
| nome | text notNull | as written |
| nomeNormalizado | text notNull | uppercase, accent-stripped — match key |
| comarcaId | integer FK → comarcas | |
| varasConhecidas | jsonb `string[]` default [] | varas where seen |
| entrancia | varchar(30) nullable | |
| status | varchar(20) default ATIVO | ATIVO / APOSENTADO / AFASTADO / NAO_CONFIRMADO |
| observacoes | text nullable | |
| createdAt / updatedAt | timestamp | |

Index on `(nomeNormalizado, comarcaId)`. Matching: new sentença → match by `nomeNormalizado + comarcaId`; else create with `status=NAO_CONFIRMADO`. Dupes resolved by a manual-merge action (same UX intent as desembargadores).

**Known stub:** `comarcaId` defaults to `1` (Camaçari) on `assistidos`/`processos` (`core.ts:165,201`) until multi-comarca is populated, so today the comarca dimension does not actually separate judges — every magistrado collapses into `comarcaId=1`. Treat comarca disambiguation as a stub; the `(nome, comarca)` match is forward-correct but currently degenerates to name-only. Flag same-name/different-vara cases for manual review rather than auto-merging.

### 5.2 `sentencas` (shared row, detail-scoped in queries)

| Column | Type | Notes |
|---|---|---|
| id | serial PK | |
| processoId | integer FK → processos (set null) | shared entity |
| assistidoId | integer FK → assistidos (set null) | drives detail scoping; = intimado |
| demandaOrigemId | integer FK → demandas (set null) | provenance/trigger |
| magistradoId | integer FK → magistrados (set null) | |
| comarcaId | integer FK → comarcas | |
| vara | varchar(120) nullable | |
| numeroProcesso | varchar(30) nullable | denormalized |
| pjeDocumentoId | varchar(30) nullable | idempotency key |
| tipoDecisao | varchar(30) | enum-as-string, see below |
| dataSentenca | date nullable | |
| driveFileId | integer nullable | FK → `drive_files.id` (the int PK). Capture must INSERT a `drive_files` row first; the Google string file id lands in `drive_files.driveFileId varchar(100)`, mirroring `acordaos.driveFileId` |
| analiseIa | jsonb `AnaliseSentenca \| null` default null | |
| analiseStatus | varchar(20) default PENDENTE | PENDENTE / ANALISANDO / CONCLUIDO / ERRO |
| analyzedAt | timestamp nullable | |
| criadoPorId | integer FK → defensoresBa (set null) | |
| createdAt / updatedAt | timestamp | |

`tipoDecisao` ∈ `CONDENATORIA · ABSOLUTORIA · PARCIAL · ABSOLVICAO_SUMARIA · EXTINTIVA_PUNIBILIDADE · PRONUNCIA · IMPRONUNCIA · DESCLASSIFICACAO`.

**Idempotency (enforced, not "unique-ish"):** add a partial unique index `UNIQUE (processo_id, pje_documento_id) WHERE pje_documento_id IS NOT NULL`, declared in the Drizzle TS schema via `.where(sql\`...\`)` (precedent: `src/lib/db/schema/pje-import.ts:67`) so `db:push` stays in sync — no hand-edited SQL. When `pje_documento_id` is null, the writer must first SELECT by `(processoId, tipoDecisao, dataSentenca)` and UPDATE if found; if `dataSentenca` is also null, fall back to `(demandaOrigemId)` so a re-run of the same demanda updates in place rather than duplicating.

**Scoping rule (concrete — there is NO existing assistido→defensor visibility helper to reuse; `defensor-scope.ts` scopes only via `demandas.defensorId`):**
- **Detail** (the sentença row + assistido): scope by joining `sentencas.demandaOrigemId → demandas.defensorId` and comparing against `getDefensoresVisiveis(user)`. This requires a **new helper** `getSentencaDetailScope(user)` added to `defensor-scope.ts`. Responsible defensor + admin see detail; others do not.
- **Aggregate** (magistrado/vara stats): read **all** rows institution-wide, but the SELECT must project only non-identifying columns (magistrado, vara, comarca, tipoDecisao, pena, teses, flags) — never assistido/processo identifiers.
- **VVD/sigilo (see §7):** sigiloso atribuições never contribute a *detail* row to institutional reads; they contribute only the de-identified aggregate projection.

Migration: `npm run db:generate` then `db:push` (Drizzle). New tables + one partial unique index only — no changes to existing tables in this slice.

## 6. `AnaliseSentenca` extraction schema (the intelligence payload)

TypeScript type in `src/lib/db/schema/sentencas.ts`, mirroring `AnaliseAcordao`:

```ts
type Pena = {
  privativa: { anos: number; meses: number; dias: number } | null;
  regimeInicial: "FECHADO" | "SEMIABERTO" | "ABERTO" | null;
  substituicaoPRD: { concedida: boolean; quais: string[] };
  sursis: boolean;
  diasMulta: number | null;
  valorMulta: string | null;
  detracaoConsiderada: boolean;
};

type CircunstanciaJudicial = {
  circunstancia: string;        // ex.: "culpabilidade", "conduta social"
  valoracao: "FAVORAVEL" | "DESFAVORAVEL" | "NEUTRA";
  fundamento: string;
};

type AnaliseSentenca = {
  resultado: string;                    // espelha tipoDecisao em prosa
  dispositivoResumo: string;
  crimesImputados: { artigo: string; descricao: string }[];
  crimesCondenados: { artigo: string; descricao: string }[];
  crimesAbsolvidos: { artigo: string; descricao: string }[];
  pena: Pena | null;
  dosimetria: {
    penaBase: string | null;
    circunstanciasJudiciais: CircunstanciaJudicial[];
    atenuantes: string[];
    agravantes: string[];
    causasAumento: string[];
    causasDiminuicao: string[];
    penaDefinitiva: string | null;
  } | null;
  tesesDefensivas: { acolhidas: string[]; rejeitadas: string[] };
  provasValoradas: string[];            // ex.: "condenação fundada só em depoimento policial"
  fundamentosChave: string[];
  precedentesCitados: string[];
  juizProlator: string;                 // name as written → feeds magistrado matcher
  recurso: { prazoRecursal: string | null; recursoCabivel: string | null; fundamentoRecurso: string | null };
  flagsAlerta: string[];                // defensive red flags (Súmula 444, 718/719, dosimetria genérica…)
  impactoParaDefesa: string;
  recomendacaoProxPasso: string;
  confidence: "alta" | "media" | "baixa";
};
```

`flagsAlerta` + `dosimetria` are what make this *intelligence* rather than a summary; they seed the future "como esse juiz costuma decidir" aggregation.

## 7. Error handling & edge cases

- **PDF download fails** (missing doc, PJe auth, process not openable): capture task → `analiseStatus=ERRO`, demanda `revisaoPendente=true`; **fallback** to analyzing the registro `raw_text` (`registros.enrichmentData.raw_text`, ≤12k; result flagged `parcial`) so the case is never lost.
- **VVD / sigilo is a confidentiality problem, not just a download failure.** Writing an assistido-linked sentença *detail* row into a shared table would expose sigiloso cases. Rule: for sigiloso atribuições (VVD and any flagged sigilo), the `sentencas` detail row is created but **never** exposed to institutional/aggregate reads as detail — only its de-identified aggregate projection (magistrado, vara, tipoDecisao, pena, teses, flags) contributes to institutional stats. Combined with the detail-scoping helper (§5.2), VVD detail stays visible only to the responsible defensor + admin.
- **Low AI confidence** (`confidence=baixa`): persist, set demanda `revisaoPendente=true` + existing "revisar" selo (consistent with commit `270ee441`).
- **Ambiguous magistrado** (variant name / comarca stub): create with `status=NAO_CONFIRMADO`; surface in a manual-merge list. Never auto-merge same-name/different-vara.
- **Idempotency**: enforced by the partial unique index + null-key path in §5.2; re-running varredura or re-analysis updates in place and bumps `analyzedAt`. Never duplicates.
- **Auto-enqueue actor**: `claude_code_tasks.createdBy` is `notNull` FK → `users.id`, but auto-capture/analysis runs daemon-side with no `ctx.user`. Designate a dedicated **system user id** (config constant) as the creator for auto-enqueued tasks.
- **Token guard**: typical sentenças (20–40 pp) fit the Max-account context; for outlier long decisions, chunk/section-summarize before the final structured pass (see §4 flow).
- **Corréus / "e outros"**: attach the sentença to the **intimado** assistido (parser already resolves intimado ≠ réu). v1 = one `sentencas` row per (processo + documento); assistido = intimado. Multi-assistido linkage is future work.
- **Misclassified acórdão**: excluded by the ato-set derivation in §4.1 (acórdão atos are filtered out) — not by any title-priority mechanism.
- **Pronúncia/impronúncia/desclassificação** (júri): captured as `tipoDecisao` values; the RESE downstream stays in existing `analise-intimacao` rules — not duplicated here.

## 8. Testing

- **Unit**: classifier→enqueue hook (sentença 1º grau enqueues; acórdão does not); magistrado matcher (normalization, accent-stripping, dedupe); robust JSON extraction (truncated/fenced); idempotent upsert on `pjeDocumentoId`.
- **Integration**: a sample sentença PDF → end-to-end populates `sentencas` + `magistrados` + `registro`. Reuse the `src/lib/trpc/routers/intimacoes.test.ts` harness.

## 9. Deferred (YAGNI for this slice)

- **Slice C — dashboards**: magistrado/vara intelligence (condenação rates, penas médias, teses que vingam, recurring flags), functional + institutional. Schema is designed to feed it; this slice writes a forward-contract for the query shape only, no UI.
- **Acórdão replication**: reuse this pipeline into the existing `acordaos` table, plus add the two fields the user listed and that are currently missing — **parecer do MP + procurador que o proferiu**, and **vara de origem** — to `acordaos`/`recursos`.
- **Cross-defensor rollup** beyond per-magistrado stats.

## 10. New/changed components summary

| Component | Type | Action |
|---|---|---|
| `src/lib/db/schema/sentencas.ts` | schema | NEW — `magistrados`, `sentencas`, `AnaliseSentenca` type |
| Drizzle migration | migration | NEW — two tables |
| varredura classification hook | logic | EXTEND — enqueue capture task on derived sentença ato set (§4.1), system-user actor |
| `capturar-sentenca` | browser-lane task/skill | NEW — open process in PJe → download PDF → Drive → insert `drive_files` row → extract text |
| `analise-sentenca` | ai-lane skill | NEW — full-text (token-guarded) → `AnaliseSentenca` JSON |
| `getSentencaDetailScope(user)` | scope helper | NEW in `defensor-scope.ts` — detail via `demandaOrigemId → demandas.defensorId` |
| persistence (router) | tRPC | NEW procedures — upsert magistrado + sentença (idempotent §5.2), write registro |
| `sentencas` read API | tRPC | NEW — scoped detail + de-identified aggregate projection (forward-contract) |
| system user id | config | NEW constant — creator for auto-enqueued daemon tasks |
| tests | unit + integration | NEW |
