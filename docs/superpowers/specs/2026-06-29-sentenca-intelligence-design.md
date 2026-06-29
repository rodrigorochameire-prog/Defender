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

- **Classification**: `src/lib/ato-suggestion.ts` + the `varredura-triagem` skill already detect sentença from the PJe document title and set atos like "Analisar sentença", "Ciência condenação/absolvição", "Ciência da pronúncia". The varredura already scrapes decision text into `demandas.enrichmentData.raw_text` and stores `demandas.pjeDocumentoId`.
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
   • download PDF by demandas.pjeDocumentoId (pje_playwright_service.download_document)
   • upload → Drive "03 - Decisões e Sentenças" (ensureAssistidoDriveFolder + subfolder)
   • extract full text (docling/OCR)
   • returns { driveFileId, textoIntegral }
        │  on success: enqueue analysis task
        ▼
[ai-lane] analise-sentenca  (claude -p, new skill, FREE)
   • input = full sentença text (NOT the 8k-capped raw_text)
   • output = AnaliseSentenca JSON (robust extraction)
        │
        ▼
persist:
   • upsert magistrados row (match nomeNormalizado + comarcaId, else create)
   • upsert sentencas row (idempotent on pjeDocumentoId)
   • create registro tipo "analise" on the demanda
   • refine demanda.ato only if confidence = alta and current ato is generic
```

Capture-first rationale: dosimetria and teses require the **full** sentença (often 20–40 pp.), so PDF→text precedes analysis instead of relying on the 8k-char `raw_text`.

### Classification hook (the only change to the existing trigger)

The varredura already classifies. The new hook fires **after** classification, when:

- the resolved ato is in the sentença set (see §4.1), AND
- the document is a 1º-grau decision (title-priority already places Acórdão > Sentença, so 2º-grau decisions are excluded), AND
- `demandas.pjeDocumentoId` is present (needed to download the PDF).

If `pjeDocumentoId` is missing, skip capture and fall back to raw_text-only analysis (§7).

### 4.1 Sentença ato set

`Analisar sentença`, `Ciência de sentença`, `Ciência condenação`, `Ciência absolvição`, `Ciência da pronúncia`, `Ciência da impronúncia`, `Ciência da desclassificação`. Sourced from `src/config/atos-por-atribuicao.ts`. Acórdão atos are explicitly excluded in this slice.

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
| driveFileId | integer nullable | PDF in Drive |
| analiseIa | jsonb `AnaliseSentenca \| null` default null | |
| analiseStatus | varchar(20) default PENDENTE | PENDENTE / ANALISANDO / CONCLUIDO / ERRO |
| analyzedAt | timestamp nullable | |
| criadoPorId | integer FK → defensoresBa (set null) | |
| createdAt / updatedAt | timestamp | |

`tipoDecisao` ∈ `CONDENATORIA · ABSOLUTORIA · PARCIAL · ABSOLVICAO_SUMARIA · EXTINTIVA_PUNIBILIDADE · PRONUNCIA · IMPRONUNCIA · DESCLASSIFICACAO`.

Unique-ish idempotency: upsert keyed on `pjeDocumentoId` (when present); fallback dedupe on `(processoId, tipoDecisao, dataSentenca)`.

**Scoping rule:**
- Aggregate/statistics queries (magistrado/vara stats) read **all** `sentencas` rows institution-wide.
- Row/detail queries (the sentença + assistido) filter by the existing assistido-visibility rules in `defensor-scope.ts`. The responsible defensor and admin see detail; other defensores see only aggregates.

Migration: `npm run db:generate` then `db:push` (Drizzle). New tables only — no changes to existing tables in this slice.

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

- **PDF download fails** (VVD sigilo, missing doc, PJe auth): capture task → `analiseStatus=ERRO`, demanda `revisaoPendente=true`; **fallback** to analyzing the scraped `raw_text` (result flagged `parcial`) so the case is never lost.
- **Low AI confidence** (`confidence=baixa`): persist, set demanda `revisaoPendente=true` + existing "revisar" selo (consistent with commit `270ee441`).
- **Ambiguous magistrado** (variant name / no comarca match): create with `status=NAO_CONFIRMADO`; surface in a manual-merge list.
- **Idempotency**: upsert keyed on `pjeDocumentoId`; re-running varredura or re-analysis updates in place and bumps `analyzedAt`. Never duplicates.
- **Corréus / "e outros"**: attach the sentença to the **intimado** assistido (parser already resolves intimado ≠ réu). v1 = one `sentencas` row per (processo + documento); assistido = intimado. Multi-assistido linkage is future work.
- **Misclassified acórdão**: title-priority (Acórdão > Sentença) keeps 2º-grau decisions out of this pipeline.
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
| varredura classification hook | logic | EXTEND — enqueue capture task on sentença set |
| `capturar-sentenca` | browser-lane task/skill | NEW — download PDF → Drive → extract text |
| `analise-sentenca` | ai-lane skill | NEW — full-text → `AnaliseSentenca` JSON |
| persistence (router) | tRPC | NEW procedures — upsert magistrado + sentença, write registro |
| `sentencas` read API | tRPC | NEW — scoped detail + (forward-contract) aggregate query shape |
| tests | unit + integration | NEW |
