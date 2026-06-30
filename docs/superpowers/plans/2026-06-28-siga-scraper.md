# SIGA Scraper Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** A read-only SIGA Carreira scraper: Python enrichment-engine (CDP + pure parsers + router) → OMBUDS staging → review → idempotent import (by `nSiga`) of Licenças + Outras Ausências into `ausencias`; Férias/Afastamentos extracted + staged + shown (commit deferred).

**Architecture:** Two codebases. Python: pure `siga_parsers` (header-normalized, unit-tested) + `siga_scraper_service` (CDP, mirrors `pje_scraper_service`) + FastAPI router. OMBUDS: pure `siga-import/{dedup,mapToAusencia}` (unit-tested) + a shared `ausencias/persist.ts` helper (additive refactor of `ausencias.criar`) + `siga_import_staging` + `trpc/routers/siga.ts` + review UI.

**Tech Stack:** Python 3.12 (FastAPI, Playwright, pytest); Next.js 15, tRPC, Drizzle/Postgres, Tailwind, vitest.

## Global Constraints

- **Auth = CDP** (`connect_over_cdp(siga_cdp_url)`), mirroring `enrichment-engine/services/pje_scraper_service.py` — NOT the SIGAD form-login model. No credentials in code.
- **SIGA HTML facts are recon-assumed** (column orders per `docs/integrations/siga-carreira-map.md`, date `DD/MM/YYYY`, Situação strings) — parsers are header-normalized + tolerant; the situação mapper falls through to `solicitada`. Live re-verification pending an active account.
- **Landing:** Licenças→`ausencias` tipo `licenca`; Outras→`outra_ausencia`; idempotent by `nSiga` (`nova`/`ja_importada`/`atualizada`). Férias/Afastamentos: staged + displayed, **import deferred (v2)** (`ferias_parcelas` needs `periodoId`, `afastamentos` needs `substitutoId`).
- **SIGA is authoritative:** `confirmar`'s `atualizada` path sets `situacao` directly and **bypasses `podeTransicionar`** (not a user transition).
- Privacy: all data is the logged-in defensor's own; import tRPC `protectedProcedure`, rows owned by `ctx.user.id`. Dates `YYYY-MM-DD` in OMBUDS. Migrations hand-scoped.

---

### Task 1: Python — config + pure parsers

**Files:**
- Modify: `enrichment-engine/config.py` (Settings)
- Create: `enrichment-engine/services/siga_parsers.py`
- Create: `enrichment-engine/tests/test_siga_parsers.py`

**Interfaces:**
- Produces: `parse_br_date`, `parse_licenca`, `parse_outra_ausencia`, `parse_ferias`, `parse_afastamento` (each `(headers: list[str], cells: list[str]) -> dict`).

- [ ] **Step 1: Write the failing tests**

```python
# enrichment-engine/tests/test_siga_parsers.py
from services.siga_parsers import parse_br_date, parse_licenca, parse_outra_ausencia

def test_parse_br_date():
    assert parse_br_date("01/07/2026") == "2026-07-01"
    assert parse_br_date("") is None
    assert parse_br_date("-") is None
    assert parse_br_date("31/12/2025") == "2025-12-31"

LICENCA_HEADERS = ["Número Solicitação","Data Início","Data Final","Situação","Motivo Ausência","Duração","Data Publicação","Nº Siga","Observação","Interrupção","Suspensão",""]

def test_parse_licenca_full():
    cells = ["12345","01/07/2026","10/07/2026","Gozada","LUTO","10","15/06/2026","SG-999","obs","Não","Sim",""]
    r = parse_licenca(LICENCA_HEADERS, cells)
    assert r["tipo"] == "licenca"
    assert r["numeroSolicitacao"] == "12345"
    assert r["dataInicio"] == "2026-07-01"
    assert r["dataFim"] == "2026-07-10"
    assert r["situacaoSiga"] == "Gozada"
    assert r["motivo"] == "LUTO"
    assert r["dataPublicacao"] == "2026-06-15"
    assert r["nSiga"] == "SG-999"
    assert r["observacao"] == "obs"
    assert r["interrompida"] is False
    assert r["suspensa"] is True

def test_parse_licenca_missing_trailing_cells():
    r = parse_licenca(LICENCA_HEADERS, ["1","01/07/2026","02/07/2026","Solicitada"])
    assert r["motivo"] is None and r["nSiga"] is None and r["suspensa"] is False

OUTRA_HEADERS = ["Numero Solicitação","Data Inicio","Data Final","Situação","Duração","Publicação","Motivo Ausencia","Observação","Interrupção","Nº Siga",""]

def test_parse_outra_uses_variant_headers():
    cells = ["77","05/08/2026","06/08/2026","Solicitada","2","01/08/2026","Compensação","-","Não","SG-7",""]
    r = parse_outra_ausencia(OUTRA_HEADERS, cells)
    assert r["tipo"] == "outra_ausencia"
    assert r["numeroSolicitacao"] == "77"
    assert r["dataInicio"] == "2026-08-05"
    assert r["motivo"] == "Compensação"
    assert r["dataPublicacao"] == "2026-08-01"
    assert r["nSiga"] == "SG-7"
    assert r["suspensa"] is False  # no Suspensão column
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd enrichment-engine && python -m pytest tests/test_siga_parsers.py -q`
Expected: FAIL — module `services.siga_parsers` not found.

- [ ] **Step 3: Write the parsers**

```python
# enrichment-engine/services/siga_parsers.py
"""Pure parsers for SIGA Carreira DataTables. Header-normalized + tolerant. No I/O."""
import re
import unicodedata


def _norm(s: str) -> str:
    s = unicodedata.normalize("NFKD", s or "").encode("ascii", "ignore").decode()
    return re.sub(r"\s+", " ", s).strip().lower()


def parse_br_date(s: str | None) -> str | None:
    m = re.match(r"^(\d{2})/(\d{2})/(\d{4})$", (s or "").strip())
    if not m:
        return None
    d, mo, y = m.groups()
    return f"{y}-{mo}-{d}"


def _row(headers: list[str], cells: list[str]) -> dict[str, str]:
    return {_norm(h): (cells[i] if i < len(cells) else "") for i, h in enumerate(headers)}


def _get(row: dict[str, str], *aliases: str) -> str | None:
    for a in aliases:
        v = row.get(_norm(a))
        if v not in (None, "", "-"):
            return v
    return None


def _bool_cell(v: str | None) -> bool:
    n = _norm(v or "")
    return bool(n) and n not in ("nao", "-")


def parse_licenca(headers: list[str], cells: list[str]) -> dict:
    r = _row(headers, cells)
    return {
        "tipo": "licenca",
        "numeroSolicitacao": _get(r, "Número Solicitação", "Numero Solicitação"),
        "dataInicio": parse_br_date(_get(r, "Data Início", "Data Inicio")),
        "dataFim": parse_br_date(_get(r, "Data Final")),
        "situacaoSiga": _get(r, "Situação"),
        "motivo": _get(r, "Motivo Ausência", "Motivo Ausencia"),
        "dataPublicacao": parse_br_date(_get(r, "Data Publicação", "Publicação")),
        "nSiga": _get(r, "Nº Siga"),
        "observacao": _get(r, "Observação"),
        "interrompida": _bool_cell(_get(r, "Interrupção")),
        "suspensa": _bool_cell(_get(r, "Suspensão")),
    }


def parse_outra_ausencia(headers: list[str], cells: list[str]) -> dict:
    d = parse_licenca(headers, cells)
    d["tipo"] = "outra_ausencia"
    d["suspensa"] = False  # Outras Ausências has no Suspensão column
    return d


def parse_ferias(headers: list[str], cells: list[str]) -> dict:
    r = _row(headers, cells)
    return {
        "tipo": "ferias",
        "numeroSolicitacao": _get(r, "Número Solicitação", "Numero Solicitação"),
        "dataInicio": parse_br_date(_get(r, "Data Início", "Data Inicio")),
        "dataFim": parse_br_date(_get(r, "Data Final")),
        "situacaoSiga": _get(r, "Situação"),
        "provimento": _get(r, "Provimento"),
        "dataPublicacao": parse_br_date(_get(r, "Data Publicação", "Publicação")),
        "nSiga": _get(r, "Nº Siga"),
        "suspensa": _bool_cell(_get(r, "Suspensão")),
    }


def parse_afastamento(headers: list[str], cells: list[str]) -> dict:
    r = _row(headers, cells)
    return {
        "tipo": "afastamento",
        "numeroSolicitacao": _get(r, "Número da Solicitação", "Número Solicitação"),
        "dataPublicacao": parse_br_date(_get(r, "Data de Publicação", "Data Publicação")),
        "dataInicio": parse_br_date(_get(r, "Data Inicial", "Data Início")),
        "dataFim": parse_br_date(_get(r, "Data Final")),
        "situacaoSiga": _get(r, "Situação"),
    }
```

- [ ] **Step 4: Add config + run tests**

In `enrichment-engine/config.py`, add to the `Settings` class (near the PJe CDP settings):

```python
    # --- SIGA (CDP — sessão autenticada do defensor) ---
    siga_cdp_url: str = "http://127.0.0.1:9222"
    siga_base_url: str = "https://siga.defensoria.ba.def.br"
    siga_scrape_rate_limit_seconds: float = 1.5
    siga_scrape_timeout: int = 20_000
```

Run: `cd enrichment-engine && python -m pytest tests/test_siga_parsers.py -q`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add enrichment-engine/services/siga_parsers.py enrichment-engine/tests/test_siga_parsers.py enrichment-engine/config.py
git commit -m "feat(siga-scraper): parsers puros das tabelas SIGA (header-normalized) + config CDP"
```

---

### Task 2: Python — scraper service + router + models

**Files:**
- Create: `enrichment-engine/services/siga_scraper_service.py`
- Create: `enrichment-engine/routers/siga.py`
- Modify: `enrichment-engine/models/schemas.py` (Pydantic models)
- Modify: `enrichment-engine/main.py` (register router)

**Interfaces:**
- Consumes: Task 1 parsers; the CDP pattern from `pje_scraper_service.py`.
- Produces: `POST /siga/extrair-carreira` → `SigaExtrairCarreiraOutput { success, licencas, outras, ferias, afastamentos, errors, error }`.

- [ ] **Step 1: Read `enrichment-engine/services/pje_scraper_service.py`** — copy its `_connect()` (`connect_over_cdp(self.settings.siga_cdp_url)` + the "Chrome must be open with --remote-debugging-port=9222" error), the singleton pattern, and `_rate_limit`. Read `enrichment-engine/routers/sigad.py` + `main.py` for the router/registration shape, and `models/schemas.py` for the Pydantic style.

- [ ] **Step 2: Write the Pydantic models** in `models/schemas.py`:

```python
class SigaCarreiraRow(BaseModel):
    tipo: str
    numeroSolicitacao: str | None = None
    nSiga: str | None = None
    dataInicio: str | None = None
    dataFim: str | None = None
    situacaoSiga: str | None = None
    motivo: str | None = None
    dataPublicacao: str | None = None
    observacao: str | None = None
    provimento: str | None = None
    interrompida: bool = False
    suspensa: bool = False

class SigaExtrairCarreiraOutput(BaseModel):
    success: bool
    licencas: list[SigaCarreiraRow] = Field(default_factory=list)
    outras: list[SigaCarreiraRow] = Field(default_factory=list)
    ferias: list[SigaCarreiraRow] = Field(default_factory=list)
    afastamentos: list[SigaCarreiraRow] = Field(default_factory=list)
    errors: list[str] = Field(default_factory=list)
    error: str | None = None
```

- [ ] **Step 3: Write the service** `siga_scraper_service.py` — a `SigaScraperService` + `get_siga_scraper_service()` singleton. `_connect()` mirrors PJe. `_get_siga_page()` finds the tab whose URL contains `siga.defensoria.ba.def.br` (raise a clear error if none / if redirected to a login page). `_extract_table(page, url)` does `page.goto(url, wait_until="domcontentloaded", timeout=settings.siga_scrape_timeout)`, rate-limits, then `page.evaluate` to read the first `<table>`'s `thead th` + `tbody tr td` into `{headers, rows}` (reuse the recon extraction JS — headers as strings, rows as list-of-cell-strings). `extrair_carreira()` iterates the four sections:

```python
SECOES = [
    ("licencas", "/Carreira/Licenca", parse_licenca),
    ("outras", "/Carreira/OutrasAusencias", parse_outra_ausencia),
    ("ferias", "/Carreira/Ferias", parse_ferias),
    ("afastamentos", "/Carreira/Afastamentos", parse_afastamento),
]
```

For each: try `_extract_table`, map each data row via the section's parser (skip rows whose first cell is "Nenhum registro encontrado"), collect; on exception append `f"{key}: {e}"` to `errors` and continue. Return the dict. Wrap the whole thing so any top-level failure returns `{success: False, error}`.

- [ ] **Step 4: Write the router** `routers/siga.py`:

```python
@router.post("/siga/extrair-carreira", response_model=SigaExtrairCarreiraOutput)
async def extrair_carreira() -> SigaExtrairCarreiraOutput:
    try:
        scraper = get_siga_scraper_service()
        result = await scraper.extrair_carreira()
        return SigaExtrairCarreiraOutput(success=True, **result)
    except Exception as e:
        logger.error("SIGA extrair-carreira failed: %s", e)
        return SigaExtrairCarreiraOutput(success=False, error=str(e))
```

Register in `main.py`: `from routers.siga import router as siga_router` + `app.include_router(siga_router, tags=["SIGA"])`.

- [ ] **Step 5: Verify imports + commit**

Run: `cd enrichment-engine && python -c "import main; import services.siga_scraper_service; import routers.siga"`
Expected: no ImportError. (Live extraction is not runnable without an authenticated SIGA Chrome — structural check only.)

```bash
git add enrichment-engine/services/siga_scraper_service.py enrichment-engine/routers/siga.py enrichment-engine/models/schemas.py enrichment-engine/main.py
git commit -m "feat(siga-scraper): service CDP + router /siga/extrair-carreira + models"
```

---

### Task 3: OMBUDS — staging schema + migration

**Files:**
- Create: `src/lib/db/schema/siga-import.ts`
- Modify: `src/lib/db/schema/index.ts` (barrel)
- Create: `drizzle/0064_siga_import_staging.sql`
- Test: `src/lib/db/schema/__tests__/siga-import-schema.test.ts`

**Interfaces:**
- Produces: `sigaImportDecisaoEnum`, `sigaImportStaging`, types.

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/db/schema/__tests__/siga-import-schema.test.ts
import { describe, it, expect } from "vitest";
import { sigaImportStaging, sigaImportDecisaoEnum } from "@/lib/db/schema";

describe("siga import staging schema", () => {
  it("exports the table and decisao enum", () => {
    expect(sigaImportStaging).toBeDefined();
    expect(sigaImportDecisaoEnum.enumValues).toEqual(["nova", "ja_importada", "atualizada"]);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/lib/db/schema/__tests__/siga-import-schema.test.ts`
Expected: FAIL.

- [ ] **Step 3: Write the schema**

```ts
// src/lib/db/schema/siga-import.ts
import { pgTable, pgEnum, serial, integer, text, boolean, jsonb, timestamp, index } from "drizzle-orm/pg-core";
import { users } from "./core";

export const sigaImportDecisaoEnum = pgEnum("siga_import_decisao", ["nova", "ja_importada", "atualizada"]);

export const sigaImportStaging = pgTable("siga_import_staging", {
  id: serial("id").primaryKey(),
  defensorId: integer("defensor_id").references(() => users.id).notNull(),
  sessionId: text("session_id").notNull(),
  tipo: text("tipo").notNull(), // licenca | outra_ausencia | ferias | afastamento
  nSiga: text("n_siga"),
  numeroSolicitacao: text("numero_solicitacao"),
  payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
  decisao: sigaImportDecisaoEnum("decisao").default("nova").notNull(),
  matchedAusenciaId: integer("matched_ausencia_id"),
  importavel: boolean("importavel").default(false).notNull(),
  selected: boolean("selected").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [
  index("siga_import_staging_defensor_session_idx").on(t.defensorId, t.sessionId),
  index("siga_import_staging_defensor_nsiga_idx").on(t.defensorId, t.nSiga),
]);

export type SigaImportStaging = typeof sigaImportStaging.$inferSelect;
export type InsertSigaImportStaging = typeof sigaImportStaging.$inferInsert;
```

Append to `src/lib/db/schema/index.ts`: `export * from "./siga-import";`

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/lib/db/schema/__tests__/siga-import-schema.test.ts`
Expected: PASS.

- [ ] **Step 5: Write the migration** `drizzle/0064_siga_import_staging.sql` (verify next free number — expected 0064):

```sql
-- SIGA import staging (idempotente).
DO $$ BEGIN
  CREATE TYPE "public"."siga_import_decisao" AS ENUM('nova', 'ja_importada', 'atualizada');
EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "siga_import_staging" (
	"id" serial PRIMARY KEY NOT NULL,
	"defensor_id" integer NOT NULL,
	"session_id" text NOT NULL,
	"tipo" text NOT NULL,
	"n_siga" text,
	"numero_solicitacao" text,
	"payload" jsonb NOT NULL,
	"decisao" "siga_import_decisao" DEFAULT 'nova' NOT NULL,
	"matched_ausencia_id" integer,
	"importavel" boolean DEFAULT false NOT NULL,
	"selected" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "siga_import_staging" ADD CONSTRAINT "siga_import_staging_defensor_id_users_id_fk" FOREIGN KEY ("defensor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "siga_import_staging_defensor_session_idx" ON "siga_import_staging" USING btree ("defensor_id","session_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "siga_import_staging_defensor_nsiga_idx" ON "siga_import_staging" USING btree ("defensor_id","n_siga");
```

- [ ] **Step 6: Commit**

```bash
git add src/lib/db/schema/siga-import.ts src/lib/db/schema/index.ts drizzle/0064_siga_import_staging.sql src/lib/db/schema/__tests__/siga-import-schema.test.ts
git commit -m "feat(siga-scraper): schema siga_import_staging + migration 0064"
```

---

### Task 4: OMBUDS — pure dedup + map

**Files:**
- Create: `src/lib/siga-import/dedup.ts`, `src/lib/siga-import/mapToAusencia.ts`
- Test: `src/lib/siga-import/__tests__/dedup.test.ts`, `mapToAusencia.test.ts`

**Interfaces:**
- Produces: `decidir(staged, porNSiga)`; `situacaoFromSiga(raw)`; `mapToAusencia(tipo, payload)`.

- [ ] **Step 1: Write the failing tests**

```ts
// src/lib/siga-import/__tests__/mapToAusencia.test.ts
import { describe, it, expect } from "vitest";
import { situacaoFromSiga, mapToAusencia } from "../mapToAusencia";

describe("situacaoFromSiga", () => {
  it("maps SIGA situação strings", () => {
    expect(situacaoFromSiga("Gozada")).toEqual({ situacao: "gozada", suspensa: false });
    expect(situacaoFromSiga("Licenças Indeferidas/Desistência")).toEqual({ situacao: "indeferida", suspensa: false });
    expect(situacaoFromSiga("Suspensa")).toEqual({ situacao: "deferida", suspensa: true });
    expect(situacaoFromSiga("Passível de Prorrogação")).toEqual({ situacao: "solicitada", suspensa: false });
    expect(situacaoFromSiga(null)).toEqual({ situacao: "solicitada", suspensa: false });
  });
});

describe("mapToAusencia", () => {
  it("maps a licença payload to an ausência record (carries observacao)", () => {
    const r = mapToAusencia("licenca", {
      motivo: "LUTO", dataInicio: "2026-07-01", dataFim: "2026-07-10", situacaoSiga: "Gozada",
      numeroSolicitacao: "12345", nSiga: "SG-999", dataPublicacao: "2026-06-15",
      observacao: "obs", interrompida: false, suspensa: false,
    });
    expect(r).toMatchObject({
      tipo: "licenca", motivo: "LUTO", dataInicio: "2026-07-01", dataFim: "2026-07-10",
      situacao: "gozada", suspensa: false, interrompida: false,
      numeroSolicitacao: "12345", nSiga: "SG-999", dataPublicacao: "2026-06-15",
      situacaoSiga: "Gozada", observacao: "obs",
    });
  });
  it("ORs suspensa from situação and payload", () => {
    expect(mapToAusencia("licenca", { situacaoSiga: "Suspensa", dataInicio: "2026-07-01", dataFim: "2026-07-02" }).suspensa).toBe(true);
    expect(mapToAusencia("licenca", { situacaoSiga: "Gozada", suspensa: true, dataInicio: "2026-07-01", dataFim: "2026-07-02" }).suspensa).toBe(true);
  });
});
```

```ts
// src/lib/siga-import/__tests__/dedup.test.ts
import { describe, it, expect } from "vitest";
import { decidir } from "../dedup";

const mapped = { situacao: "gozada", dataInicio: "2026-07-01", dataFim: "2026-07-10", motivo: "LUTO" };

describe("decidir", () => {
  it("nova when nSiga absent or unseen", () => {
    expect(decidir({ nSiga: null, mapped }, new Map())).toEqual({ decisao: "nova", matchedAusenciaId: null });
    expect(decidir({ nSiga: "SG-1", mapped }, new Map())).toEqual({ decisao: "nova", matchedAusenciaId: null });
  });
  it("ja_importada when nSiga matches and fields equal", () => {
    const m = new Map([["SG-1", { id: 9, nSiga: "SG-1", situacao: "gozada", dataInicio: "2026-07-01", dataFim: "2026-07-10", motivo: "LUTO" }]]);
    expect(decidir({ nSiga: "SG-1", mapped }, m)).toEqual({ decisao: "ja_importada", matchedAusenciaId: 9 });
  });
  it("atualizada when nSiga matches but a field differs", () => {
    const m = new Map([["SG-1", { id: 9, nSiga: "SG-1", situacao: "solicitada", dataInicio: "2026-07-01", dataFim: "2026-07-10", motivo: "LUTO" }]]);
    expect(decidir({ nSiga: "SG-1", mapped }, m)).toEqual({ decisao: "atualizada", matchedAusenciaId: 9 });
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/lib/siga-import/__tests__/dedup.test.ts src/lib/siga-import/__tests__/mapToAusencia.test.ts`
Expected: FAIL — modules not found.

- [ ] **Step 3: Write the implementations**

```ts
// src/lib/siga-import/mapToAusencia.ts
export type AusenciaTipo = "licenca" | "outra_ausencia";

const SITUACAO_RULES: { match: RegExp; situacao: string; suspensa?: boolean }[] = [
  { match: /gozad/i, situacao: "gozada" },
  { match: /indefer|desist/i, situacao: "indeferida" },
  { match: /suspens/i, situacao: "deferida", suspensa: true },
];

export function situacaoFromSiga(raw: string | null): { situacao: string; suspensa: boolean } {
  const s = raw ?? "";
  for (const r of SITUACAO_RULES) if (r.match.test(s)) return { situacao: r.situacao, suspensa: !!r.suspensa };
  return { situacao: "solicitada", suspensa: false };
}

export function mapToAusencia(tipo: AusenciaTipo, payload: Record<string, unknown>) {
  const p = payload as Record<string, any>;
  const { situacao, suspensa } = situacaoFromSiga((p.situacaoSiga as string) ?? null);
  return {
    tipo,
    motivo: (p.motivo as string) ?? null,
    dataInicio: p.dataInicio as string,
    dataFim: p.dataFim as string,
    situacao,
    suspensa: suspensa || Boolean(p.suspensa),
    interrompida: Boolean(p.interrompida),
    numeroSolicitacao: (p.numeroSolicitacao as string) ?? null,
    nSiga: (p.nSiga as string) ?? null,
    dataPublicacao: (p.dataPublicacao as string) ?? null,
    situacaoSiga: (p.situacaoSiga as string) ?? null,
    observacao: (p.observacao as string) ?? null,
  };
}
```

```ts
// src/lib/siga-import/dedup.ts
export type ExistingAusencia = { id: number; nSiga: string | null; situacao: string; dataInicio: string; dataFim: string; motivo: string | null };
export type Decisao = { decisao: "nova" | "ja_importada" | "atualizada"; matchedAusenciaId: number | null };

export function decidir(
  staged: { nSiga: string | null; mapped: { situacao: string; dataInicio: string; dataFim: string; motivo: string | null } },
  porNSiga: Map<string, ExistingAusencia>,
): Decisao {
  if (!staged.nSiga) return { decisao: "nova", matchedAusenciaId: null };
  const ex = porNSiga.get(staged.nSiga);
  if (!ex) return { decisao: "nova", matchedAusenciaId: null };
  const same =
    ex.situacao === staged.mapped.situacao &&
    ex.dataInicio === staged.mapped.dataInicio &&
    ex.dataFim === staged.mapped.dataFim &&
    (ex.motivo ?? null) === (staged.mapped.motivo ?? null);
  return { decisao: same ? "ja_importada" : "atualizada", matchedAusenciaId: ex.id };
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/lib/siga-import/__tests__/dedup.test.ts src/lib/siga-import/__tests__/mapToAusencia.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/siga-import/dedup.ts src/lib/siga-import/mapToAusencia.ts src/lib/siga-import/__tests__/dedup.test.ts src/lib/siga-import/__tests__/mapToAusencia.test.ts
git commit -m "feat(siga-scraper): lógica pura de dedup (por nSiga) + map SIGA→ausência"
```

---

### Task 5: OMBUDS — shared `persist.ts` helper (additive refactor of ausencias.criar)

**Files:**
- Create: `src/lib/ausencias/persist.ts`
- Modify: `src/lib/trpc/routers/ausencias.ts` (`criar` calls the helper)

**Interfaces:**
- Produces: `criarAusenciaComEvento(tx, defensorId, fields)` where `fields` includes `tipo, motivo, dataInicio, dataFim, situacao (default "solicitada"), interrompida, suspensa, numeroSolicitacao, nSiga, dataPublicacao, observacao, situacaoSiga, sigaSyncedAt?`. Returns the inserted ausência.

- [ ] **Step 1: Write the helper** (extracting the projection insert from `ausencias.criar` lines ~48-77):

```ts
// src/lib/ausencias/persist.ts
import { eq } from "drizzle-orm";
import { ausencias, vidaFuncionalEventos } from "@/lib/db/schema";
import { projecaoEventoDeAusencia } from "@/lib/ausencias/projecao";

export type CriarAusenciaFields = {
  tipo: "licenca" | "outra_ausencia";
  motivo?: string | null;
  dataInicio: string;
  dataFim: string;
  situacao?: "solicitada" | "deferida" | "gozada" | "indeferida" | "cancelada";
  interrompida?: boolean;
  suspensa?: boolean;
  numeroSolicitacao?: string | null;
  nSiga?: string | null;
  dataPublicacao?: string | null;
  observacao?: string | null;
  situacaoSiga?: string | null;
  sigaSyncedAt?: Date | null;
};

/** Insere a ausência + o evento de vida funcional projetado, com backfill do ausenciaId.
 *  `situacao` default "solicitada" preserva o comportamento do ausencias.criar. */
export async function criarAusenciaComEvento(tx: any, defensorId: number, fields: CriarAusenciaFields) {
  const situacao = fields.situacao ?? "solicitada";
  const proj = projecaoEventoDeAusencia({
    id: null, tipo: fields.tipo, motivo: fields.motivo ?? null,
    dataInicio: fields.dataInicio, dataFim: fields.dataFim, situacao,
  });
  const [evento] = await tx.insert(vidaFuncionalEventos).values({
    defensorId,
    tipo: proj.tipo, cluster: proj.cluster, titulo: proj.titulo,
    dataEvento: proj.dataEvento, dataFim: proj.dataFim, status: proj.status,
    origem: "manual", dados: { ausenciaId: null },
  }).returning({ id: vidaFuncionalEventos.id });

  const [a] = await tx.insert(ausencias).values({
    defensorId,
    tipo: fields.tipo,
    motivo: fields.motivo ?? null,
    dataInicio: fields.dataInicio,
    dataFim: fields.dataFim,
    situacao,
    interrompida: fields.interrompida ?? false,
    suspensa: fields.suspensa ?? false,
    numeroSolicitacao: fields.numeroSolicitacao ?? null,
    nSiga: fields.nSiga ?? null,
    dataPublicacao: fields.dataPublicacao ?? null,
    observacao: fields.observacao ?? null,
    situacaoSiga: fields.situacaoSiga ?? null,
    sigaSyncedAt: fields.sigaSyncedAt ?? null,
    vidaFuncionalEventoId: evento.id,
  }).returning();

  await tx.update(vidaFuncionalEventos).set({ dados: { ausenciaId: a.id } }).where(eq(vidaFuncionalEventos.id, evento.id));
  return a;
}
```

- [ ] **Step 2: Rewire `ausencias.criar` to use the helper**

In `src/lib/trpc/routers/ausencias.ts`, add `import { criarAusenciaComEvento } from "@/lib/ausencias/persist";` and replace the body of the `criar` `db.transaction(async (tx) => { … })` (the manual projection insert + ausência insert + backfill) with:

```ts
    return await db.transaction(async (tx) =>
      criarAusenciaComEvento(tx, ctx.user.id, {
        tipo: input.tipo, motivo: input.motivo ?? null,
        dataInicio: input.dataInicio, dataFim: input.dataFim,
        situacao: "solicitada",
        interrompida: input.interrompida, suspensa: input.suspensa,
        numeroSolicitacao: input.numeroSolicitacao, nSiga: input.nSiga,
        dataPublicacao: input.dataPublicacao, observacao: input.observacao,
        situacaoSiga: input.situacaoSiga,
      }),
    );
```

(Keep the `dataFim < dataInicio` BAD_REQUEST guard before the transaction. `ausencias.atualizar`/`remover`/`listar` are unchanged.)

- [ ] **Step 3: Verify the existing ausências tests still pass + tsc**

Run: `npx vitest run src/lib/trpc/routers/__tests__/ausencias-router.test.ts`
Expected: PASS (the structural test still matches — `projecaoEventoDeAusencia`/`origem:"manual"`/transaction/getVidaFuncionalScope are now reached through the helper which is imported into the router; if the structural test asserts a string that moved into `persist.ts`, update the test to read `persist.ts` for that assertion, noting it).

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 4: Commit**

```bash
git add src/lib/ausencias/persist.ts src/lib/trpc/routers/ausencias.ts src/lib/trpc/routers/__tests__/ausencias-router.test.ts
git commit -m "refactor(ausencias): extrai criarAusenciaComEvento p/ persist.ts (reuso pelo SIGA)"
```

---

### Task 6: OMBUDS — enrichment-client + SIGA tRPC router

**Files:**
- Modify: `src/lib/services/enrichment-client.ts` (method + types)
- Create: `src/lib/trpc/routers/siga.ts`
- Modify: `src/lib/trpc/routers/index.ts` (register)
- Test: `src/lib/trpc/routers/__tests__/siga-router.test.ts` (structural)

**Interfaces:**
- Consumes: `enrichmentClient.sigaExtrairCarreira()`; Task 3 staging; Task 4 `decidir`/`mapToAusencia`; Task 5 `criarAusenciaComEvento`; `getVidaFuncionalScope`.
- Produces: `sigaRouter` (`extrair`/`listStaging`/`confirmar`), registered as `appRouter.siga`.

- [ ] **Step 1: Add the client method + types** to `enrichment-client.ts` (mirror the SIGAD methods):

```ts
export interface SigaCarreiraRow {
  tipo: string;
  numeroSolicitacao?: string | null; nSiga?: string | null;
  dataInicio?: string | null; dataFim?: string | null;
  situacaoSiga?: string | null; motivo?: string | null;
  dataPublicacao?: string | null; observacao?: string | null; provimento?: string | null;
  interrompida?: boolean; suspensa?: boolean;
}
export interface SigaExtrairCarreiraOutput {
  success: boolean;
  licencas?: SigaCarreiraRow[]; outras?: SigaCarreiraRow[];
  ferias?: SigaCarreiraRow[]; afastamentos?: SigaCarreiraRow[];
  errors?: string[]; error?: string | null;
}
// inside the class:
async sigaExtrairCarreira(): Promise<SigaExtrairCarreiraOutput> {
  return this.request<SigaExtrairCarreiraOutput>("/siga/extrair-carreira", {}, 120_000);
}
```

- [ ] **Step 2: Write the structural test**

```ts
// src/lib/trpc/routers/__tests__/siga-router.test.ts
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it, expect } from "vitest";
const ROUTERS = join(process.cwd(), "src/lib/trpc/routers");
const read = (rel: string) => readFileSync(join(ROUTERS, rel), "utf8");

describe("siga router — contract", () => {
  const src = read("siga.ts");
  it("all procedures are protected", () => { expect(src).not.toMatch(/publicProcedure/); expect(src).toContain("protectedProcedure"); });
  it("extrair calls the enrichment client", () => { expect(src).toContain("sigaExtrairCarreira"); });
  it("dedups via decidir + maps via mapToAusencia", () => { expect(src).toContain("decidir"); expect(src).toContain("mapToAusencia"); });
  it("confirmar uses the shared persist helper and bypasses podeTransicionar", () => {
    expect(src).toContain("criarAusenciaComEvento");
    expect(src).not.toContain("podeTransicionar");
  });
  it("owns rows by ctx.user.id", () => { expect(src).toMatch(/defensorId:\s*ctx\.user\.id/); });
  it("is registered", () => { const i = read("index.ts"); expect(i).toContain("sigaRouter"); expect(i).toMatch(/siga:\s*sigaRouter/); });
});
```

- [ ] **Step 3: Run the test (fails), then write the router**

Run: `npx vitest run src/lib/trpc/routers/__tests__/siga-router.test.ts` → FAIL.

Write `src/lib/trpc/routers/siga.ts`. Read `src/lib/trpc/routers/ausencias.ts` (for the `ausencias` query/update shapes) and `src/lib/trpc/routers/intimacoes.ts` (for the staging session/list/confirm shape). Implement:

- `extrair` (protected mutation): `const out = await enrichmentClient.sigaExtrairCarreira();` if `!out.success` throw with `out.error`. Build a `sessionId` (e.g. `String(Date.now())` is NOT allowed in workflow scripts, but here it's a normal mutation — `crypto.randomUUID()` is fine). Fetch the user's existing non-deleted `ausencias` (scope `getVidaFuncionalScope`), build `porNSiga: Map<string, ExistingAusencia>` (only rows with nSiga). For each licença/outra row: `mapped = mapToAusencia(tipo, row)`; `{decisao, matchedAusenciaId} = decidir({nSiga: row.nSiga, mapped}, porNSiga)`; stage with `importavel:true`. For ferias/afastamento rows: stage `payload=row`, `importavel:false`, `decisao:"nova"`. Insert all staging rows (`defensorId: ctx.user.id, sessionId`). Return `{ sessionId, counts: {...} }`.
- `listStaging` (protected query, input `{ sessionId }`): return this user's staging rows for that session, grouped/sorted by tipo (+ the matched ausência summary if needed). Guard `defensorId === ctx.user.id`.
- `confirmar` (protected mutation, input `{ sessionId, selectedIds: number[] }`): in a `db.transaction`, for each selected `importavel` staging row owned by the user:
  - `mapped = mapToAusencia(row.tipo, row.payload)`.
  - `decisao "nova"` → `criarAusenciaComEvento(tx, ctx.user.id, { ...mapped, sigaSyncedAt: new Date() })`.
  - `decisao "atualizada"` (and `row.matchedAusenciaId`) → update that ausência's fields to `mapped` + `sigaSyncedAt`, set `situacao` DIRECTLY (no `podeTransicionar`); re-derive the projection via `projecaoEventoDeAusencia` and update the linked event (soft-delete it if `mapped.situacao` is `indeferida`/`cancelada`, else update tipo/status/dates/titulo) — mirroring `ausencias.atualizar`'s cascade MINUS the transition guard.
  - `decisao "ja_importada"` → skip.
  Return counts `{ criadas, atualizadas, puladas }`.

Register in `index.ts`: `import { sigaRouter } from "./siga";` + `siga: sigaRouter,`.

- [ ] **Step 4: Run the structural test + tsc**

Run: `npx vitest run src/lib/trpc/routers/__tests__/siga-router.test.ts` → PASS.
Run: `npx tsc --noEmit` → no new errors from `siga.ts`/`enrichment-client.ts`.

- [ ] **Step 5: Commit**

```bash
git add src/lib/services/enrichment-client.ts src/lib/trpc/routers/siga.ts src/lib/trpc/routers/index.ts src/lib/trpc/routers/__tests__/siga-router.test.ts
git commit -m "feat(siga-scraper): client + tRPC siga (extrair→stage→confirmar import em ausencias)"
```

---

### Task 7: OMBUDS — review UI + nav

**Files:**
- Create: `src/app/(dashboard)/admin/siga-import/page.tsx`, `_components/siga-import-view.tsx`
- Modify: `src/components/layouts/admin-sidebar.tsx` (CARREIRA_NAV)

**Interfaces:**
- Consumes: `trpc.siga.extrair`/`listStaging`/`confirmar`.

- [ ] **Step 1: Write `page.tsx`** (server, thin):

```tsx
// src/app/(dashboard)/admin/siga-import/page.tsx
import { SigaImportView } from "./_components/siga-import-view";
export default function SigaImportPage() {
  return <SigaImportView />;
}
```

- [ ] **Step 2: Write the view** `siga-import-view.tsx` (client). Mirror the chrome of `src/app/(dashboard)/admin/ausencias/_components/ausencias-view.tsx` (page wrapper outside `CollapsiblePageHeader`, tokens, `useUtils` invalidation, `EmptyState` with icon, loading-guard, dark-mode). Behaviour:
  - A "Sincronizar com SIGA" button → `trpc.siga.extrair` mutation; on success store the returned `sessionId`.
  - An inline hint when no session yet: "Abra o SIGA no Chrome com depuração remota (porta 9222) e faça login antes de sincronizar."
  - `trpc.siga.listStaging.useQuery({ sessionId }, { enabled: !!sessionId })` → render rows grouped by tipo. Licença/Outra rows: a checkbox (default checked when `decisao !== "ja_importada"`), a decisao chip (`nova`/`ja_importada`/`atualizada`), period + motivo + situacaoSiga. Férias/Afastamento rows: read-only, with a muted "importação v2" badge.
  - A "Importar selecionados" button → `trpc.siga.confirmar` with the selected importável ids → on success show the counts and invalidate.
  - Surface mutation errors inline.
- Use a status/decisao chip styling consistent with the other modules (sky for `nova`, neutral for `ja_importada`, amber for `atualizada`).

- [ ] **Step 3: Add the sidebar nav entry**

In `src/components/layouts/admin-sidebar.tsx`, add to `CARREIRA_NAV`:

```ts
  { label: "Importar SIGA", path: "/admin/siga-import", icon: "DownloadCloud" },
```

Confirm `"DownloadCloud"` is in the file's `iconMap` allowlist (import from lucide-react + add to the map if missing; else use an included icon like `"Download"` / `"RefreshCw"`).

- [ ] **Step 4: Verify + commit**

Run: `npx tsc --noEmit` → no new errors from the new files.
Run: `npx vitest run src/lib/siga-import src/lib/db/schema/__tests__/siga-import-schema.test.ts src/lib/trpc/routers/__tests__/siga-router.test.ts` → PASS.

```bash
git add "src/app/(dashboard)/admin/siga-import/page.tsx" "src/app/(dashboard)/admin/siga-import/_components/siga-import-view.tsx" src/components/layouts/admin-sidebar.tsx
git commit -m "feat(siga-scraper): UI de sincronização/import do SIGA + nav"
```

---

### Task 8: Manual smoke check (requires an active SIGA account)

**Files:** none. (Cannot run without an authenticated SIGA Chrome + the enrichment-engine deployed/running.)

- [ ] **Step 1:** With an ACTIVE SIGA account, open SIGA in Chrome with `--remote-debugging-port=9222` and log in. Run the enrichment-engine locally (`cd enrichment-engine && uvicorn main:app`) with `SIGA_CDP_URL=http://127.0.0.1:9222`.
- [ ] **Step 2:** `npm run dev:turbo`; open `/admin/siga-import`; click "Sincronizar com SIGA". Expected: staged rows appear grouped by tipo with decisão chips; the Licença motivos/situações match SIGA. **Verify the assumed `DD/MM/YYYY` date format + the Situação strings against the live data — adjust `siga_parsers`/`mapToAusencia` if SIGA differs.**
- [ ] **Step 3:** Select Licença/Outra rows → "Importar selecionados" → confirm they appear in `/admin/ausencias` and in the Carreira Hub's ausências cluster. Re-sync → the same rows show `ja_importada` (idempotent); edit one in SIGA → `atualizada` on re-sync, and confirm updates the row.

---

## Self-Review

**Spec coverage:** §4 Python (parsers→Task 1, service/router/models→Task 2, config→Task 1); §5 OMBUDS (staging→Task 3, dedup/map→Task 4, persist helper→Task 5, client/tRPC→Task 6, UI→Task 7); §6 testing (pytest Task 1, vitest Tasks 4/3, structural Task 6); §7 out-of-scope (Férias/Afastamentos commit deferred — staged `importavel:false`; no deploy/schedule). ✓

**Placeholder scan:** pure pieces (Tasks 1,4,5) + schema (3) carry full code. The glue (Tasks 2,6,7) gives the concrete signatures/JS/flow + "mirror sibling X" with the exact adaptations — the siblings (`pje_scraper_service`, `intimacoes`, `ausencias-view`) are the literal templates the implementer must read. No TBDs.

**Type consistency:** parser dict keys (Task 1) === Pydantic `SigaCarreiraRow` (Task 2) === `SigaCarreiraRow` TS type (Task 6) === `mapToAusencia` payload reads (Task 4). `criarAusenciaComEvento` fields (Task 5) consumed by `confirmar` (Task 6). `decidir`'s `ExistingAusencia`/`mapped` shapes consistent. `situacao` values match `ausencia_situacao` enum. `sigaImportStaging` columns (Task 3) read by the router (Task 6) + UI (Task 7).
