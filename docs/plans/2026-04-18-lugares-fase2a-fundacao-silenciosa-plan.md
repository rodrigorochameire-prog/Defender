# Lugares · Fase II-A · Fundação Silenciosa — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Entidade `lugares` + `participacoes_lugar` + backfill idempotente de 6 fontes + catálogo `/admin/lugares` silencioso + geocoder on-demand Nominatim. Sem sinalização visual.

**Architecture:** Espelha I-A de Pessoas. Camada 1 (entidade cruzável) com catálogo global + participações N:N + merge-queue humano + audit log LGPD. Geocoder isolado atrás de interface pra permitir troca de provedor. Não toca legacy (`processos.local_do_fato_*`, `assistidos.endereco`, mapas existentes).

**Tech Stack:** PostgreSQL (com extensão `pg_trgm` já ativa) · Drizzle ORM via SQL hand-written · tRPC · React 19 · Radix UI · Vitest + RTL + happy-dom.

**Spec de referência:** `docs/plans/2026-04-18-lugares-fase2a-fundacao-silenciosa-design.md`

---

## File Structure

```
drizzle/
└── 0037_lugares_fundacao.sql                      [new — 4 tabelas + enum + indexes]

src/lib/lugares/
├── normalizar-endereco.ts                          [new pure helper]
├── geocoder.ts                                     [new interface]
├── nominatim.ts                                    [new Nominatim impl]
└── placeholders.ts                                 [new isPlaceholder helper]

src/lib/trpc/routers/lugares.ts                     [new router — ~15 procedures]
src/lib/trpc/root.ts                                [modify — registrar router]

src/components/lugares/
├── lugar-chip.tsx                                  [new silencioso]
├── lugar-sheet.tsx                                 [new 4 tabs]
├── lugar-form.tsx                                  [new create+edit]
├── merge-pair-card-lugar.tsx                       [new — paralelo a merge-queue pessoas]
└── index.ts                                        [new exports]

src/app/(dashboard)/admin/lugares/
├── page.tsx                                        [new catálogo]
├── nova/page.tsx                                   [new form]
├── merge-queue/page.tsx                            [new]
└── [id]/
    ├── page.tsx                                    [new detalhe 3 abas]
    └── _components/                                [vazio inicialmente]

src/components/layouts/admin-sidebar.tsx            [modify — +Lugares link]

scripts/
└── backfill-lugares.mjs                            [new idempotente]

__tests__/
├── unit/
│   ├── normalizar-endereco.test.ts                 [new]
│   ├── placeholders-lugar.test.ts                  [new]
│   └── nominatim-geocoder.test.ts                  [new]
├── trpc/
│   └── lugares-router.test.ts                      [new]
└── components/lugares/
    ├── lugar-chip.test.tsx                         [new]
    └── lugar-sheet.test.tsx                        [new]
```

---

## Task 1: Schema migration

**Files:**
- Create: `drizzle/0037_lugares_fundacao.sql`

- [ ] **Step 1: Verificar próximo número**

Run: `ls -1 /Users/rodrigorochameire/projetos/Defender/drizzle/*.sql | tail -3`
Último é `0036_pessoas_intel_signals.sql`. Próximo: **0037**.

- [ ] **Step 2: Criar SQL**

```sql
-- Lugares: Camada 1 entidade cruzável

CREATE TABLE IF NOT EXISTS lugares (
  id                               serial PRIMARY KEY,
  workspace_id                     int NOT NULL REFERENCES workspaces(id),
  logradouro                       text,
  numero                           varchar(30),
  complemento                      varchar(120),
  bairro                           varchar(120),
  cidade                           varchar(120) DEFAULT 'Camaçari',
  uf                               char(2) DEFAULT 'BA',
  cep                              varchar(9),
  latitude                         numeric(10,7),
  longitude                        numeric(10,7),
  endereco_completo                text,
  endereco_normalizado             text NOT NULL,
  observacoes                      text,
  fonte_criacao                    varchar(40),
  confidence                       numeric(3,2) DEFAULT 0.9,
  merged_into                      int REFERENCES lugares(id),
  geocoded_at                      timestamptz,
  geocoding_source                 varchar(30),
  created_at                       timestamptz DEFAULT now(),
  updated_at                       timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS lugares_workspace ON lugares(workspace_id);
CREATE INDEX IF NOT EXISTS lugares_normalizado ON lugares(endereco_normalizado) WHERE merged_into IS NULL;
CREATE INDEX IF NOT EXISTS lugares_bairro_trgm ON lugares USING gin(bairro gin_trgm_ops);
CREATE INDEX IF NOT EXISTS lugares_logradouro_trgm ON lugares USING gin(logradouro gin_trgm_ops);
CREATE INDEX IF NOT EXISTS lugares_geo ON lugares(latitude, longitude) WHERE latitude IS NOT NULL;

DO $$ BEGIN
  CREATE TYPE lugar_tipo_participacao AS ENUM (
    'local-do-fato',
    'endereco-assistido',
    'residencia-agressor',
    'trabalho-agressor',
    'local-atendimento',
    'radar-noticia'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS participacoes_lugar (
  id                serial PRIMARY KEY,
  lugar_id          int NOT NULL REFERENCES lugares(id),
  processo_id       int REFERENCES processos(id),
  pessoa_id         int REFERENCES pessoas(id),
  tipo              lugar_tipo_participacao NOT NULL,
  data_relacionada  date,
  source_table      varchar(40),
  source_id         int,
  fonte             varchar(30) NOT NULL,
  confidence        numeric(3,2) DEFAULT 0.9,
  created_at        timestamptz DEFAULT now(),
  UNIQUE (lugar_id, processo_id, tipo, source_table, source_id)
);

CREATE INDEX IF NOT EXISTS participacoes_lugar_lugar ON participacoes_lugar(lugar_id);
CREATE INDEX IF NOT EXISTS participacoes_lugar_processo ON participacoes_lugar(processo_id) WHERE processo_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS participacoes_lugar_pessoa ON participacoes_lugar(pessoa_id) WHERE pessoa_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS participacoes_lugar_tipo ON participacoes_lugar(tipo);

CREATE TABLE IF NOT EXISTS lugares_distincts_confirmed (
  id              serial PRIMARY KEY,
  lugar_a_id      int NOT NULL,
  lugar_b_id      int NOT NULL,
  confirmed_by    int REFERENCES users(id),
  confirmed_at    timestamptz DEFAULT now(),
  UNIQUE (lugar_a_id, lugar_b_id),
  CHECK (lugar_a_id < lugar_b_id)
);

CREATE TABLE IF NOT EXISTS lugares_access_log (
  id          bigserial PRIMARY KEY,
  lugar_id    int REFERENCES lugares(id),
  user_id     int REFERENCES users(id),
  action      varchar(40) NOT NULL,
  context     jsonb,
  ts          timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS lugares_access_log_user_ts ON lugares_access_log(user_id, ts DESC);
CREATE INDEX IF NOT EXISTS lugares_access_log_lugar ON lugares_access_log(lugar_id);
```

- [ ] **Step 3: Aplicar migration**

Criar script temporário `/Users/rodrigorochameire/projetos/Defender/apply-lugares.mjs`:

```js
import { readFileSync } from "node:fs";
import postgres from "postgres";
import * as dotenv from "dotenv";
dotenv.config({ path: "/Users/rodrigorochameire/projetos/Defender/.env.local" });

const sql = postgres(process.env.DATABASE_URL, { max: 1 });
const content = readFileSync(process.argv[2], "utf-8");

// Split por semicolon respeitando DO $$ ... END $$; blocks
const statements = [];
let current = "";
let inDo = false;
for (const line of content.split("\n")) {
  if (/DO \$\$/i.test(line)) inDo = true;
  current += line + "\n";
  if (inDo && /END \$\$;/i.test(line)) {
    inDo = false;
    statements.push(current.trim());
    current = "";
    continue;
  }
  if (!inDo && line.trim().endsWith(";")) {
    statements.push(current.trim());
    current = "";
  }
}

for (const s of statements) {
  if (!s) continue;
  console.log("Exec:", s.split("\n")[0].slice(0, 80));
  await sql.unsafe(s);
}

const check = await sql`SELECT COUNT(*)::int AS n FROM information_schema.tables WHERE table_name IN ('lugares','participacoes_lugar','lugares_distincts_confirmed','lugares_access_log')`;
console.log("tables created:", check[0].n, "(expected 4)");

await sql.end();
```

Run:
```
cd /Users/rodrigorochameire/projetos/Defender && node apply-lugares.mjs drizzle/0037_lugares_fundacao.sql
```

Expected: `tables created: 4 (expected 4)`. Se menos, investigar output. Delete script: `rm apply-lugares.mjs`.

- [ ] **Step 4: Commit**

```
cd /Users/rodrigorochameire/projetos/Defender
git add drizzle/0037_lugares_fundacao.sql
git commit -m "feat(lugares): schema II-A — lugares, participacoes_lugar, distincts, access_log"
```

---

## Task 2: `isPlaceholder` helper (TDD)

**Files:**
- Create: `src/lib/lugares/placeholders.ts`
- Create: `__tests__/unit/placeholders-lugar.test.ts`

- [ ] **Step 1: Write failing test**

Create `__tests__/unit/placeholders-lugar.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { isPlaceholderLugar } from "@/lib/lugares/placeholders";

describe("isPlaceholderLugar", () => {
  it.each([
    [""],
    ["   "],
    ["-"],
    ["?"],
    ["..."],
    ["n/c"],
    ["na"],
    ["não informado"],
    ["Nao Informado"],
    ["sem endereço"],
    ["sem endereco"],
    ["a confirmar"],
    ["a extrair"],
    ["A EXTRAIR pelo oficial"],
    ["desconhecido"],
    ["não consta"],
    ["NAO CONSTA"],
    ["ab"],
  ])("placeholder: %s", (s) => {
    expect(isPlaceholderLugar(s)).toBe(true);
  });

  it.each([
    ["Rua das Palmeiras, 123"],
    ["Av. Principal 100"],
    ["Centro"],
  ])("válido: %s", (s) => {
    expect(isPlaceholderLugar(s)).toBe(false);
  });
});
```

- [ ] **Step 2: Run FAIL**

Run: `cd /Users/rodrigorochameire/projetos/Defender && npm run test __tests__/unit/placeholders-lugar.test.ts`
Expected: cannot find module.

- [ ] **Step 3: Implement**

Create `src/lib/lugares/placeholders.ts`:

```ts
const PLACEHOLDER_PATTERNS: RegExp[] = [
  /^\s*$/,
  /^\s*[-?.]+\s*$/,
  /^\s*n\/c\s*$/i,
  /^\s*n\.?a\.?\s*$/i,
  /\bn[aã]o\s+informad/i,
  /\bn[aã]o\s+consta\b/i,
  /\bsem\s+endere[çc]o\b/i,
  /\ba\s+confirmar\b/i,
  /\ba\s+extrair\b/i,
  /\bA\s+EXTRAIR\b/,
  /\bdesconhecid/i,
];

export function isPlaceholderLugar(raw: string | null | undefined): boolean {
  if (!raw) return true;
  const s = String(raw).trim();
  if (s.length < 3) return true;
  return PLACEHOLDER_PATTERNS.some((re) => re.test(s));
}
```

- [ ] **Step 4: Run PASS**

Expected: todos os casos passam.

- [ ] **Step 5: Commit**

```
cd /Users/rodrigorochameire/projetos/Defender
git add src/lib/lugares/placeholders.ts __tests__/unit/placeholders-lugar.test.ts
git commit -m "feat(lugares): isPlaceholderLugar helper"
```

---

## Task 3: `normalizarEndereco` helper (TDD)

**Files:**
- Create: `src/lib/lugares/normalizar-endereco.ts`
- Create: `__tests__/unit/normalizar-endereco.test.ts`

- [ ] **Step 1: Write failing test**

Create `__tests__/unit/normalizar-endereco.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { normalizarEndereco } from "@/lib/lugares/normalizar-endereco";

describe("normalizarEndereco", () => {
  it("abreviações básicas", () => {
    expect(normalizarEndereco("R. das Palmeiras, 123 - Centro")).toBe("rua das palmeiras 123 centro");
    expect(normalizarEndereco("Av. Principal 100")).toBe("avenida principal 100");
    expect(normalizarEndereco("Pça da Matriz, 10")).toBe("praca da matriz 10");
    expect(normalizarEndereco("Tv. do Saber, 5")).toBe("travessa do saber 5");
    expect(normalizarEndereco("Estr. Velha 2km")).toBe("estrada velha 2km");
    expect(normalizarEndereco("Al. dos Anjos 8")).toBe("alameda dos anjos 8");
  });

  it("remove 'nº', 'n.', 'n°'", () => {
    expect(normalizarEndereco("Rua X, nº 123")).toBe("rua x 123");
    expect(normalizarEndereco("Rua X n. 123")).toBe("rua x 123");
    expect(normalizarEndereco("Rua X n° 123")).toBe("rua x 123");
  });

  it("s/n preserva como sn", () => {
    expect(normalizarEndereco("Av. Joao Goulart S/N")).toBe("avenida joao goulart sn");
  });

  it("remove CEP", () => {
    expect(normalizarEndereco("Rua X 123, CEP 42800-000")).toBe("rua x 123");
    expect(normalizarEndereco("Rua X 123, 42800000")).toBe("rua x 123");
  });

  it("remove cidade default e UF terminal", () => {
    expect(normalizarEndereco("Rua X 123, Camaçari/BA")).toBe("rua x 123");
    expect(normalizarEndereco("Rua X 123, Camacari - BA")).toBe("rua x 123");
    expect(normalizarEndereco("Rua X 123, Camaçari, Bahia, Brasil")).toBe("rua x 123");
  });

  it("remove acentos", () => {
    expect(normalizarEndereco("Praça São João")).toBe("praca sao joao");
  });

  it("collapse espaços", () => {
    expect(normalizarEndereco("  Rua    X    123  ")).toBe("rua x 123");
  });

  it("duas formas do mesmo endereço geram mesma normalização", () => {
    const a = normalizarEndereco("R. das Palmeiras, 123 - Centro, Camaçari/BA");
    const b = normalizarEndereco("Rua das Palmeiras nº 123 - Centro");
    expect(a).toBe(b);
  });

  it("vazio retorna string vazia", () => {
    expect(normalizarEndereco("")).toBe("");
    expect(normalizarEndereco(null as any)).toBe("");
    expect(normalizarEndereco(undefined as any)).toBe("");
  });
});
```

- [ ] **Step 2: Run FAIL**

- [ ] **Step 3: Implement**

Create `src/lib/lugares/normalizar-endereco.ts`:

```ts
/**
 * Pipeline:
 * 1. lowercase + remove acentos
 * 2. expande abreviações (r./av./pça/etc)
 * 3. remove pontuação
 * 4. remove CEP
 * 5. remove cidade default + UF terminal
 * 6. collapse espaços
 */
export function normalizarEndereco(s: string | null | undefined): string {
  if (!s) return "";
  let t = String(s)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

  // CEP primeiro (antes de mexer em pontuação)
  t = t.replace(/\b\d{5}-?\d{3}\b/g, " ");
  t = t.replace(/\bcep\s*/gi, " ");

  // Pontuação → espaço (mantém / pra depois)
  t = t.replace(/[,;:()]/g, " ");

  // s/n → sn (antes de remover /)
  t = t.replace(/\bs\s*\/\s*n\b/g, "sn");

  // Demais barras e hífens
  t = t.replace(/[-\/\\]/g, " ");

  // Expande abreviações de logradouro (só se no início de palavra)
  t = t.replace(/\bavenida\b/g, "avenida");
  t = t.replace(/\bav\.?/g, "avenida");
  t = t.replace(/\brua\b/g, "rua");
  t = t.replace(/\br\.?\b/g, "rua");
  t = t.replace(/\btravessa\b/g, "travessa");
  t = t.replace(/\btv\.?\b/g, "travessa");
  t = t.replace(/\bestrada\b/g, "estrada");
  t = t.replace(/\best\.?\b/g, "estrada");
  t = t.replace(/\bestr\.?\b/g, "estrada");
  t = t.replace(/\brodovia\b/g, "rodovia");
  t = t.replace(/\brod\.?\b/g, "rodovia");
  t = t.replace(/\balameda\b/g, "alameda");
  t = t.replace(/\bal\.?\b/g, "alameda");
  t = t.replace(/\bpraca\b/g, "praca");
  t = t.replace(/\bpca\b/g, "praca");

  // Remove "número" markers
  t = t.replace(/\bn[º°]\b/g, " ");
  t = t.replace(/\bn\.\s*/g, " ");
  t = t.replace(/\bno\.\s*/g, " ");

  // Cidade default + UF terminal
  t = t.replace(/\b(camacari|camaçari|camacari|salvador|lauro de freitas|dias davila|dias d avila)\b/g, " ");
  t = t.replace(/\b(bahia|brasil|brazil|ba)\b\s*$/g, " ");

  // Collapse
  t = t.replace(/\s+/g, " ").trim();

  return t;
}
```

- [ ] **Step 4: Run PASS**

Expected: todos os testes passam.

- [ ] **Step 5: Commit**

```
cd /Users/rodrigorochameire/projetos/Defender
git add src/lib/lugares/normalizar-endereco.ts __tests__/unit/normalizar-endereco.test.ts
git commit -m "feat(lugares): normalizarEndereco helper"
```

---

## Task 4: Geocoder interface + Nominatim impl (TDD)

**Files:**
- Create: `src/lib/lugares/geocoder.ts`
- Create: `src/lib/lugares/nominatim.ts`
- Create: `__tests__/unit/nominatim-geocoder.test.ts`

- [ ] **Step 1: Write failing test**

Create `__tests__/unit/nominatim-geocoder.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NominatimGeocoder } from "@/lib/lugares/nominatim";

describe("NominatimGeocoder", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("monta URL correta com User-Agent", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => [{ lat: "-12.697", lon: "-38.324" }],
    }));
    const g = new NominatimGeocoder({ userAgent: "Test/1.0", fetchImpl: fetchMock as any });
    await g.geocode({ logradouro: "Rua X", numero: "123", bairro: "Centro", cidade: "Camaçari", uf: "BA" });
    const [url, opts] = fetchMock.mock.calls[0] as [string, any];
    expect(url).toContain("nominatim.openstreetmap.org/search");
    expect(url).toContain("countrycodes=br");
    expect(url).toContain("format=json");
    expect(url).toContain("limit=1");
    expect(opts.headers["User-Agent"]).toBe("Test/1.0");
  });

  it("retorna lat/lng e source=nominatim em sucesso", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => [{ lat: "-12.697", lon: "-38.324", display_name: "..." }],
    }));
    const g = new NominatimGeocoder({ userAgent: "T", fetchImpl: fetchMock as any });
    const r = await g.geocode({ logradouro: "Rua X", cidade: "Camaçari", uf: "BA" });
    expect(r.latitude).toBe(-12.697);
    expect(r.longitude).toBe(-38.324);
    expect(r.source).toBe("nominatim");
    expect(r.failed).toBeFalsy();
  });

  it("failed=true quando resultado vazio", async () => {
    const fetchMock = vi.fn(async () => ({ ok: true, json: async () => [] }));
    const g = new NominatimGeocoder({ userAgent: "T", fetchImpl: fetchMock as any });
    const r = await g.geocode({ logradouro: "Lugar que não existe", cidade: "X", uf: "BA" });
    expect(r.failed).toBe(true);
    expect(r.latitude).toBeUndefined();
  });

  it("failed=true em HTTP error", async () => {
    const fetchMock = vi.fn(async () => ({ ok: false, status: 500, json: async () => ({}) }));
    const g = new NominatimGeocoder({ userAgent: "T", fetchImpl: fetchMock as any });
    const r = await g.geocode({ logradouro: "X", cidade: "Camaçari", uf: "BA" });
    expect(r.failed).toBe(true);
  });

  it("rate-limit: 2 chamadas seguidas respeitam 1 req/s", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => [{ lat: "0", lon: "0" }],
    }));
    const g = new NominatimGeocoder({ userAgent: "T", fetchImpl: fetchMock as any, minIntervalMs: 50 });
    const t0 = Date.now();
    await g.geocode({ cidade: "X", uf: "BA" });
    await g.geocode({ cidade: "Y", uf: "BA" });
    const elapsed = Date.now() - t0;
    expect(elapsed).toBeGreaterThanOrEqual(45);
  });
});
```

- [ ] **Step 2: Run FAIL**

- [ ] **Step 3: Implement interface**

Create `src/lib/lugares/geocoder.ts`:

```ts
export interface GeocoderInput {
  logradouro?: string | null;
  numero?: string | null;
  bairro?: string | null;
  cidade?: string | null;
  uf?: string | null;
}

export interface GeocoderResult {
  latitude?: number;
  longitude?: number;
  source: "nominatim" | "manual" | "origem";
  failed?: boolean;
}

export interface Geocoder {
  geocode(input: GeocoderInput): Promise<GeocoderResult>;
}
```

- [ ] **Step 4: Implement Nominatim**

Create `src/lib/lugares/nominatim.ts`:

```ts
import type { Geocoder, GeocoderInput, GeocoderResult } from "./geocoder";

interface Opts {
  userAgent: string;
  fetchImpl?: typeof fetch;
  minIntervalMs?: number; // 1000 default
}

export class NominatimGeocoder implements Geocoder {
  private lastCall = 0;
  private readonly userAgent: string;
  private readonly fetchImpl: typeof fetch;
  private readonly minIntervalMs: number;

  constructor(opts: Opts) {
    this.userAgent = opts.userAgent;
    this.fetchImpl = opts.fetchImpl ?? (globalThis.fetch as any);
    this.minIntervalMs = opts.minIntervalMs ?? 1000;
  }

  async geocode(input: GeocoderInput): Promise<GeocoderResult> {
    // rate-limit simples
    const now = Date.now();
    const wait = this.minIntervalMs - (now - this.lastCall);
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    this.lastCall = Date.now();

    const parts = [input.logradouro, input.numero, input.bairro, input.cidade, input.uf, "Brasil"]
      .filter((p) => p && String(p).trim())
      .join(", ");
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(parts)}&format=json&limit=1&countrycodes=br`;

    try {
      const res = await this.fetchImpl(url, {
        headers: { "User-Agent": this.userAgent, Accept: "application/json" },
      });
      if (!res.ok) return { source: "nominatim", failed: true };
      const json = (await res.json()) as Array<{ lat: string; lon: string }>;
      if (!Array.isArray(json) || json.length === 0) {
        return { source: "nominatim", failed: true };
      }
      const lat = Number(json[0].lat);
      const lng = Number(json[0].lon);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        return { source: "nominatim", failed: true };
      }
      return { latitude: lat, longitude: lng, source: "nominatim" };
    } catch {
      return { source: "nominatim", failed: true };
    }
  }
}
```

- [ ] **Step 5: Run PASS**

Expected: 5 testes passam.

- [ ] **Step 6: Commit**

```
cd /Users/rodrigorochameire/projetos/Defender
git add src/lib/lugares/geocoder.ts src/lib/lugares/nominatim.ts __tests__/unit/nominatim-geocoder.test.ts
git commit -m "feat(lugares): geocoder interface + Nominatim impl com rate-limit"
```

---

## Task 5: tRPC router skeleton + CRUD básico (TDD)

**Files:**
- Create: `src/lib/trpc/routers/lugares.ts`
- Modify: `src/lib/trpc/root.ts`
- Create: `__tests__/trpc/lugares-router.test.ts`

- [ ] **Step 1: Inspecionar padrão de tRPC router**

Run: `grep -n "createTRPCRouter\|router\s*=\|appRouter\|protectedProcedure" /Users/rodrigorochameire/projetos/Defender/src/lib/trpc/routers/pessoas.ts | head -15`

Copiar pattern: imports (`router`, `protectedProcedure`, `z`, `db`, `sql`, `eq`, etc) e estrutura `export const lugaresRouter = router({ ... })`.

Depois inspecionar `root.ts`:
Run: `grep -n "pessoas\|router" /Users/rodrigorochameire/projetos/Defender/src/lib/trpc/root.ts | head -20`

- [ ] **Step 2: Write failing tests — CRUD**

Create `__tests__/trpc/lugares-router.test.ts`. Siga o padrão exato de `__tests__/trpc/pessoas-router.test.ts` (imports, `makeUser`, `mkCtx`, `createCaller`, cleanup).

```ts
import { describe, it, expect } from "vitest";
import { db } from "@/lib/db";
import { eq, sql as sqltag } from "drizzle-orm";
import { lugares, participacoesLugar, lugaresDistinctsConfirmed, users } from "@/lib/db/schema";
import { createCaller, makeUser, mkCtx } from "./helpers"; // use o helper existente usado por pessoas-router.test.ts

describe("lugares.create + getById", { timeout: 30000 }, () => {
  it("cria + busca lugar com normalização", async () => {
    const user = await makeUser();
    try {
      const caller = createCaller(mkCtx(user));
      const created = await caller.lugares.create({
        logradouro: "Rua das Palmeiras",
        numero: "123",
        bairro: "Centro",
        cidade: "Camaçari",
        uf: "BA",
        fonte: "manual",
      });
      expect(created.id).toBeGreaterThan(0);
      const got = await caller.lugares.getById({ id: created.id });
      expect(got?.logradouro).toBe("Rua das Palmeiras");
      expect(got?.enderecoNormalizado).toContain("rua das palmeiras 123 centro");
      await db.delete(lugares).where(eq(lugares.id, created.id));
    } finally {
      await db.delete(users).where(eq(users.id, user.id));
    }
  });
});

describe("lugares.update", { timeout: 30000 }, () => {
  it("update re-normaliza quando endereço muda", async () => {
    const user = await makeUser();
    try {
      const caller = createCaller(mkCtx(user));
      const l = await caller.lugares.create({
        logradouro: "Rua A", numero: "10", fonte: "manual"
      });
      await caller.lugares.update({ id: l.id, patch: { logradouro: "Rua B", numero: "20" } });
      const got = await caller.lugares.getById({ id: l.id });
      expect(got?.logradouro).toBe("Rua B");
      expect(got?.enderecoNormalizado).toContain("rua b 20");
      await db.delete(lugares).where(eq(lugares.id, l.id));
    } finally {
      await db.delete(users).where(eq(users.id, user.id));
    }
  });
});

describe("lugares.list + filters", { timeout: 30000 }, () => {
  it("list filtra por bairro via trgm", async () => {
    const user = await makeUser();
    try {
      const caller = createCaller(mkCtx(user));
      const a = await caller.lugares.create({ logradouro: "X", bairro: "Centro", fonte: "manual" });
      const b = await caller.lugares.create({ logradouro: "Y", bairro: "Gravatá", fonte: "manual" });
      const result = await caller.lugares.list({ bairro: "Centro", limit: 50, offset: 0 });
      const ids = result.items.map((it: any) => it.id);
      expect(ids).toContain(a.id);
      expect(ids).not.toContain(b.id);
      await db.delete(lugares).where(eq(lugares.id, a.id));
      await db.delete(lugares).where(eq(lugares.id, b.id));
    } finally {
      await db.delete(users).where(eq(users.id, user.id));
    }
  });
});

describe("lugares.delete", { timeout: 30000 }, () => {
  it("delete remove lugar sem participações", async () => {
    const user = await makeUser();
    try {
      const caller = createCaller(mkCtx(user));
      const l = await caller.lugares.create({ logradouro: "Z", fonte: "manual" });
      const r = await caller.lugares.delete({ id: l.id });
      expect(r.deleted).toBe(true);
      const got = await caller.lugares.getById({ id: l.id });
      expect(got).toBeNull();
    } finally {
      await db.delete(users).where(eq(users.id, user.id));
    }
  });
});
```

**Nota:** `createCaller`, `makeUser`, `mkCtx` vivem em `__tests__/trpc/helpers.ts` ou análogo. Se não existem como export nomeado, o padrão usado em `pessoas-router.test.ts` é definir localmente — copie verbatim de lá.

- [ ] **Step 3: Run FAIL**

Run: `cd /Users/rodrigorochameire/projetos/Defender && npm run test __tests__/trpc/lugares-router.test.ts 2>&1 | tail -30`
Expected: falham porque router não existe.

- [ ] **Step 4: Implement router skeleton + CRUD**

Create `src/lib/trpc/routers/lugares.ts`. Comece com esqueleto idêntico ao pessoas router (inspecione `src/lib/trpc/routers/pessoas.ts` pros imports exatos):

```ts
import { z } from "zod";
import { router, protectedProcedure } from "@/lib/trpc/server";
import { db } from "@/lib/db";
import { lugares, participacoesLugar, lugaresDistinctsConfirmed, lugaresAccessLog } from "@/lib/db/schema";
import { eq, and, isNull, sql, desc, ilike, inArray, or } from "drizzle-orm";
import { normalizarEndereco } from "@/lib/lugares/normalizar-endereco";
import { isPlaceholderLugar } from "@/lib/lugares/placeholders";

export const lugaresRouter = router({
  create: protectedProcedure
    .input(z.object({
      logradouro: z.string().optional().nullable(),
      numero: z.string().optional().nullable(),
      complemento: z.string().optional().nullable(),
      bairro: z.string().optional().nullable(),
      cidade: z.string().optional().nullable(),
      uf: z.string().max(2).optional().nullable(),
      cep: z.string().optional().nullable(),
      enderecoCompleto: z.string().optional().nullable(),
      observacoes: z.string().optional().nullable(),
      fonte: z.string().min(1).default("manual"),
    }))
    .mutation(async ({ input, ctx }) => {
      const full = input.enderecoCompleto
        ?? [input.logradouro, input.numero, input.bairro, input.cidade, input.uf].filter(Boolean).join(", ");
      const norm = normalizarEndereco(full);
      if (!norm || isPlaceholderLugar(full)) {
        throw new Error("Endereço inválido ou placeholder");
      }
      const [row] = await db.insert(lugares).values({
        workspaceId: ctx.session.user.workspaceId,
        logradouro: input.logradouro ?? null,
        numero: input.numero ?? null,
        complemento: input.complemento ?? null,
        bairro: input.bairro ?? null,
        cidade: input.cidade ?? "Camaçari",
        uf: input.uf ?? "BA",
        cep: input.cep ?? null,
        enderecoCompleto: full,
        enderecoNormalizado: norm,
        observacoes: input.observacoes ?? null,
        fonteCriacao: input.fonte,
      }).returning({ id: lugares.id });
      return { id: row.id };
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      patch: z.object({
        logradouro: z.string().optional().nullable(),
        numero: z.string().optional().nullable(),
        complemento: z.string().optional().nullable(),
        bairro: z.string().optional().nullable(),
        cidade: z.string().optional().nullable(),
        uf: z.string().max(2).optional().nullable(),
        cep: z.string().optional().nullable(),
        observacoes: z.string().optional().nullable(),
        latitude: z.number().nullable().optional(),
        longitude: z.number().nullable().optional(),
      }),
    }))
    .mutation(async ({ input, ctx }) => {
      const current = await db.select().from(lugares)
        .where(and(eq(lugares.id, input.id), eq(lugares.workspaceId, ctx.session.user.workspaceId)))
        .limit(1);
      if (current.length === 0) throw new Error("Lugar não encontrado");
      const c = current[0];
      const next = {
        logradouro: input.patch.logradouro ?? c.logradouro,
        numero: input.patch.numero ?? c.numero,
        complemento: input.patch.complemento ?? c.complemento,
        bairro: input.patch.bairro ?? c.bairro,
        cidade: input.patch.cidade ?? c.cidade,
        uf: input.patch.uf ?? c.uf,
        cep: input.patch.cep ?? c.cep,
      };
      const addrChanged = (["logradouro","numero","bairro","cidade","uf","cep"] as const).some(
        (k) => input.patch[k] !== undefined && input.patch[k] !== c[k],
      );
      const full = [next.logradouro, next.numero, next.bairro, next.cidade, next.uf].filter(Boolean).join(", ");
      const norm = addrChanged ? normalizarEndereco(full) : c.enderecoNormalizado;
      const latChanged = input.patch.latitude !== undefined;
      const lngChanged = input.patch.longitude !== undefined;
      const clearGeo = latChanged && input.patch.latitude === null;
      await db.update(lugares).set({
        ...next,
        enderecoCompleto: full,
        enderecoNormalizado: norm,
        observacoes: input.patch.observacoes ?? c.observacoes,
        latitude: latChanged ? (input.patch.latitude ?? null) : c.latitude,
        longitude: lngChanged ? (input.patch.longitude ?? null) : c.longitude,
        geocodedAt: clearGeo ? null : c.geocodedAt,
        geocodingSource: clearGeo ? null : c.geocodingSource,
        updatedAt: new Date(),
      }).where(eq(lugares.id, input.id));
      return { id: input.id, updated: true };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      await db.delete(participacoesLugar).where(eq(participacoesLugar.lugarId, input.id));
      await db.delete(lugares)
        .where(and(eq(lugares.id, input.id), eq(lugares.workspaceId, ctx.session.user.workspaceId)));
      return { deleted: true };
    }),

  list: protectedProcedure
    .input(z.object({
      search: z.string().optional(),
      bairro: z.string().optional(),
      cidade: z.string().optional(),
      temCoord: z.boolean().optional(),
      limit: z.number().max(200).default(50),
      offset: z.number().default(0),
    }))
    .query(async ({ input, ctx }) => {
      const conds = [
        eq(lugares.workspaceId, ctx.session.user.workspaceId),
        isNull(lugares.mergedInto),
      ];
      if (input.search) {
        conds.push(or(
          ilike(lugares.logradouro, `%${input.search}%`),
          ilike(lugares.bairro, `%${input.search}%`),
          ilike(lugares.enderecoCompleto, `%${input.search}%`),
        ) as any);
      }
      if (input.bairro) conds.push(ilike(lugares.bairro, `%${input.bairro}%`));
      if (input.cidade) conds.push(ilike(lugares.cidade, `%${input.cidade}%`));
      if (input.temCoord) conds.push(sql`${lugares.latitude} IS NOT NULL`);
      const whereClause = and(...conds);
      const items = await db.select().from(lugares).where(whereClause)
        .orderBy(desc(lugares.updatedAt))
        .limit(input.limit).offset(input.offset);
      const [{ count }] = await db.execute<{ count: number }>(sql`
        SELECT COUNT(*)::int AS count FROM lugares
        WHERE workspace_id = ${ctx.session.user.workspaceId} AND merged_into IS NULL
      `) as any;

      // Log list-dump se sem filtros significativos
      if (!input.search && !input.bairro && !input.cidade) {
        await db.insert(lugaresAccessLog).values({
          userId: ctx.session.user.id,
          action: "list-dump",
          context: { limit: input.limit, offset: input.offset },
        });
      }

      return { items, total: count };
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input, ctx }) => {
      const rows = await db.select().from(lugares)
        .where(and(eq(lugares.id, input.id), eq(lugares.workspaceId, ctx.session.user.workspaceId)))
        .limit(1);
      if (rows.length === 0) return null;
      await db.insert(lugaresAccessLog).values({
        lugarId: input.id,
        userId: ctx.session.user.id,
        action: "get-by-id",
      });
      return rows[0];
    }),
});
```

**IMPORTANTE — Drizzle schema:** o router usa referências a `lugares`, `participacoesLugar`, etc em `@/lib/db/schema`. Se o projeto gera schema TS via drizzle-kit introspect, essas constantes ainda não existem — você precisa adicioná-las ao arquivo `src/lib/db/schema.ts` (ou equivalente). Veja o padrão olhando como `pessoas`, `participacoesProcesso`, `pessoasDistinctsConfirmed` são declarados lá. Procure:

Run: `grep -n "pessoas\s*=\s*pgTable\|participacoesProcesso\s*=\s*pgTable" /Users/rodrigorochameire/projetos/Defender/src/lib/db/schema.ts | head`

Acrescente schema TS correspondente pros 4 novos tables. Se o projeto **não** mantém schema TS drizzle (apenas SQL raw + `db.execute`), remova essas referências e use `sql` raw queries direto (seguindo padrão do `pessoas` router — verifique qual é).

- [ ] **Step 5: Registrar router em root**

Edite `src/lib/trpc/root.ts` — encontre onde `pessoasRouter` é importado e adicione análogo pra `lugaresRouter`:

```ts
import { lugaresRouter } from "./routers/lugares";

export const appRouter = router({
  // ... existentes ...
  lugares: lugaresRouter,
});
```

- [ ] **Step 6: Run tests PASS**

Expected: 4 testes CRUD básicos passam.

- [ ] **Step 7: Commit**

```
cd /Users/rodrigorochameire/projetos/Defender
git add src/lib/trpc/routers/lugares.ts src/lib/trpc/root.ts src/lib/db/schema.ts __tests__/trpc/lugares-router.test.ts
git commit -m "feat(lugares): tRPC router CRUD + list/getById/delete"
```

---

## Task 6: tRPC participações + busca

**Files:**
- Modify: `src/lib/trpc/routers/lugares.ts`
- Modify: `__tests__/trpc/lugares-router.test.ts`

- [ ] **Step 1: Append failing tests**

```ts
describe("lugares participações + busca", { timeout: 30000 }, () => {
  it("addParticipacao + getParticipacoesDoLugar", async () => {
    const user = await makeUser();
    try {
      const caller = createCaller(mkCtx(user));
      const l = await caller.lugares.create({ logradouro: "Rua A", numero: "1", fonte: "manual" });
      await caller.lugares.addParticipacao({
        lugarId: l.id, processoId: null, pessoaId: null, tipo: "local-do-fato"
      });
      const parts = await caller.lugares.getParticipacoesDoLugar({ lugarId: l.id });
      expect(parts).toHaveLength(1);
      expect(parts[0].tipo).toBe("local-do-fato");
      await db.delete(participacoesLugar).where(eq(participacoesLugar.lugarId, l.id));
      await db.delete(lugares).where(eq(lugares.id, l.id));
    } finally {
      await db.delete(users).where(eq(users.id, user.id));
    }
  });

  it("searchForAutocomplete encontra match fuzzy", async () => {
    const user = await makeUser();
    try {
      const caller = createCaller(mkCtx(user));
      const l = await caller.lugares.create({ logradouro: "Rua das Palmeiras", bairro: "Centro", fonte: "manual" });
      const results = await caller.lugares.searchForAutocomplete({ query: "palmeir", limit: 8 });
      expect(results.map((r: any) => r.id)).toContain(l.id);
      await db.delete(lugares).where(eq(lugares.id, l.id));
    } finally {
      await db.delete(users).where(eq(users.id, user.id));
    }
  });
});
```

- [ ] **Step 2: Run FAIL**

- [ ] **Step 3: Adicionar procedures ao router**

Dentro do `router({...})` de `lugares.ts`, antes do `});` final:

```ts
  getParticipacoesDoLugar: protectedProcedure
    .input(z.object({ lugarId: z.number() }))
    .query(async ({ input, ctx }) => {
      await db.insert(lugaresAccessLog).values({
        lugarId: input.lugarId,
        userId: ctx.session.user.id,
        action: "get-participacoes",
      });
      return await db.select().from(participacoesLugar)
        .where(eq(participacoesLugar.lugarId, input.lugarId))
        .orderBy(desc(participacoesLugar.createdAt));
    }),

  getParticipacoesDoProcesso: protectedProcedure
    .input(z.object({ processoId: z.number() }))
    .query(async ({ input }) => {
      return await db.select({
        participacao: participacoesLugar,
        lugar: lugares,
      })
      .from(participacoesLugar)
      .leftJoin(lugares, eq(lugares.id, participacoesLugar.lugarId))
      .where(eq(participacoesLugar.processoId, input.processoId))
      .orderBy(desc(participacoesLugar.createdAt));
    }),

  addParticipacao: protectedProcedure
    .input(z.object({
      lugarId: z.number(),
      processoId: z.number().nullable().optional(),
      pessoaId: z.number().nullable().optional(),
      tipo: z.enum([
        "local-do-fato","endereco-assistido","residencia-agressor",
        "trabalho-agressor","local-atendimento","radar-noticia",
      ]),
      dataRelacionada: z.string().nullable().optional(),
      sourceTable: z.string().nullable().optional(),
      sourceId: z.number().nullable().optional(),
      fonte: z.string().default("manual"),
    }))
    .mutation(async ({ input }) => {
      const [row] = await db.insert(participacoesLugar).values({
        lugarId: input.lugarId,
        processoId: input.processoId ?? null,
        pessoaId: input.pessoaId ?? null,
        tipo: input.tipo,
        dataRelacionada: input.dataRelacionada ? new Date(input.dataRelacionada) : null,
        sourceTable: input.sourceTable ?? null,
        sourceId: input.sourceId ?? null,
        fonte: input.fonte,
      }).onConflictDoNothing().returning({ id: participacoesLugar.id });
      return { id: row?.id ?? null };
    }),

  removeParticipacao: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await db.delete(participacoesLugar).where(eq(participacoesLugar.id, input.id));
      return { removed: true };
    }),

  searchForAutocomplete: protectedProcedure
    .input(z.object({
      query: z.string().min(1),
      bairro: z.string().optional(),
      limit: z.number().max(20).default(8),
    }))
    .query(async ({ input, ctx }) => {
      const q = `%${input.query}%`;
      const conds = [
        eq(lugares.workspaceId, ctx.session.user.workspaceId),
        isNull(lugares.mergedInto),
        or(ilike(lugares.logradouro, q), ilike(lugares.bairro, q), ilike(lugares.enderecoCompleto, q)),
      ];
      if (input.bairro) conds.push(ilike(lugares.bairro, `%${input.bairro}%`));
      return await db.select({
        id: lugares.id,
        enderecoCompleto: lugares.enderecoCompleto,
        logradouro: lugares.logradouro,
        numero: lugares.numero,
        bairro: lugares.bairro,
        cidade: lugares.cidade,
      }).from(lugares)
        .where(and(...conds))
        .limit(input.limit);
    }),
```

- [ ] **Step 4: Run PASS**

- [ ] **Step 5: Commit**

```
cd /Users/rodrigorochameire/projetos/Defender
git add src/lib/trpc/routers/lugares.ts __tests__/trpc/lugares-router.test.ts
git commit -m "feat(lugares): tRPC participações + searchForAutocomplete"
```

---

## Task 7: tRPC merge-queue + markDistinct

**Files:**
- Modify: `src/lib/trpc/routers/lugares.ts`
- Modify: `__tests__/trpc/lugares-router.test.ts`

- [ ] **Step 1: Append tests**

```ts
describe("lugares merge-queue", { timeout: 30000 }, () => {
  it("listDuplicates detecta mesmo normalizado", async () => {
    const user = await makeUser();
    try {
      const caller = createCaller(mkCtx(user));
      const a = await caller.lugares.create({ logradouro: "R. X", numero: "10", fonte: "manual" });
      const b = await caller.lugares.create({ logradouro: "Rua X", numero: "10", fonte: "manual" });
      const dupes = await caller.lugares.listDuplicates({ limit: 20, offset: 0 });
      const found = dupes.items.find((p: any) =>
        (p.aId === a.id && p.bId === b.id) || (p.aId === b.id && p.bId === a.id)
      );
      expect(found).toBeTruthy();
      await db.delete(lugares).where(eq(lugares.id, a.id));
      await db.delete(lugares).where(eq(lugares.id, b.id));
    } finally {
      await db.delete(users).where(eq(users.id, user.id));
    }
  });

  it("merge move participações e marca merged_into", async () => {
    const user = await makeUser();
    try {
      const caller = createCaller(mkCtx(user));
      const keep = await caller.lugares.create({ logradouro: "Rua A", numero: "1", fonte: "manual" });
      const dup = await caller.lugares.create({ logradouro: "Rua A dup", numero: "1", fonte: "manual" });
      await caller.lugares.addParticipacao({ lugarId: dup.id, tipo: "local-do-fato" });
      await caller.lugares.merge({ keepId: keep.id, mergeId: dup.id });
      const got = await caller.lugares.getById({ id: dup.id });
      expect(got?.mergedInto).toBe(keep.id);
      const parts = await caller.lugares.getParticipacoesDoLugar({ lugarId: keep.id });
      expect(parts.length).toBeGreaterThanOrEqual(1);
      await db.delete(participacoesLugar).where(eq(participacoesLugar.lugarId, keep.id));
      await db.delete(lugares).where(eq(lugares.id, dup.id));
      await db.delete(lugares).where(eq(lugares.id, keep.id));
    } finally {
      await db.delete(users).where(eq(users.id, user.id));
    }
  });

  it("markDistinct impede re-aparecer em listDuplicates", async () => {
    const user = await makeUser();
    try {
      const caller = createCaller(mkCtx(user));
      const a = await caller.lugares.create({ logradouro: "Rua Z", numero: "9", fonte: "manual" });
      const b = await caller.lugares.create({ logradouro: "R. Z", numero: "9", fonte: "manual" });
      await caller.lugares.markDistinct({ aId: a.id, bId: b.id });
      const dupes = await caller.lugares.listDuplicates({ limit: 50, offset: 0 });
      const found = dupes.items.find((p: any) =>
        (p.aId === a.id && p.bId === b.id) || (p.aId === b.id && p.bId === a.id)
      );
      expect(found).toBeUndefined();
      await db.delete(lugaresDistinctsConfirmed);
      await db.delete(lugares).where(eq(lugares.id, a.id));
      await db.delete(lugares).where(eq(lugares.id, b.id));
    } finally {
      await db.delete(users).where(eq(users.id, user.id));
    }
  });
});
```

- [ ] **Step 2: Run FAIL**

- [ ] **Step 3: Adicionar procedures**

```ts
  listDuplicates: protectedProcedure
    .input(z.object({ limit: z.number().max(50).default(20), offset: z.number().default(0) }))
    .query(async ({ input, ctx }) => {
      const rows = await db.execute<{
        a_id: number; b_id: number; tipo: string;
        a_endereco: string; b_endereco: string;
      }>(sql`
        SELECT LEAST(a.id, b.id) AS a_id, GREATEST(a.id, b.id) AS b_id,
               'mesmo-normalizado' AS tipo,
               a.endereco_completo AS a_endereco, b.endereco_completo AS b_endereco
        FROM lugares a
        JOIN lugares b ON a.endereco_normalizado = b.endereco_normalizado
          AND a.id < b.id
          AND a.merged_into IS NULL AND b.merged_into IS NULL
          AND a.workspace_id = ${ctx.session.user.workspaceId}
          AND b.workspace_id = ${ctx.session.user.workspaceId}
          AND NOT EXISTS (
            SELECT 1 FROM lugares_distincts_confirmed d
            WHERE d.lugar_a_id = LEAST(a.id, b.id) AND d.lugar_b_id = GREATEST(a.id, b.id)
          )
        ORDER BY a.id
        LIMIT ${input.limit} OFFSET ${input.offset}
      `);
      const data = (rows as any).rows ?? rows;
      return {
        items: data.map((r: any) => ({
          aId: r.a_id, bId: r.b_id, tipo: r.tipo,
          aEndereco: r.a_endereco, bEndereco: r.b_endereco,
        })),
      };
    }),

  merge: protectedProcedure
    .input(z.object({ keepId: z.number(), mergeId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      if (input.keepId === input.mergeId) throw new Error("keepId e mergeId não podem ser iguais");
      await db.update(participacoesLugar)
        .set({ lugarId: input.keepId })
        .where(eq(participacoesLugar.lugarId, input.mergeId));
      await db.update(lugares)
        .set({ mergedInto: input.keepId, updatedAt: new Date() })
        .where(and(eq(lugares.id, input.mergeId), eq(lugares.workspaceId, ctx.session.user.workspaceId)));
      return { merged: true };
    }),

  markDistinct: protectedProcedure
    .input(z.object({ aId: z.number(), bId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const [lo, hi] = input.aId < input.bId ? [input.aId, input.bId] : [input.bId, input.aId];
      await db.insert(lugaresDistinctsConfirmed).values({
        lugarAId: lo, lugarBId: hi, confirmedBy: ctx.session.user.id,
      }).onConflictDoNothing();
      return { marked: true };
    }),
```

- [ ] **Step 4: Run PASS**

- [ ] **Step 5: Commit**

```
cd /Users/rodrigorochameire/projetos/Defender
git add src/lib/trpc/routers/lugares.ts __tests__/trpc/lugares-router.test.ts
git commit -m "feat(lugares): tRPC listDuplicates + merge + markDistinct"
```

---

## Task 8: tRPC geocode

**Files:**
- Modify: `src/lib/trpc/routers/lugares.ts`
- Create/Modify: `src/lib/lugares/geocoder-instance.ts`
- Modify: `__tests__/trpc/lugares-router.test.ts`

- [ ] **Step 1: Criar singleton**

Create `src/lib/lugares/geocoder-instance.ts`:

```ts
import { NominatimGeocoder } from "./nominatim";
import type { Geocoder } from "./geocoder";

let _instance: Geocoder | null = null;

export function getGeocoder(): Geocoder {
  if (_instance) return _instance;
  _instance = new NominatimGeocoder({
    userAgent: "OMBUDS-Defender/1.0 (rodrigorochameire@gmail.com)",
  });
  return _instance;
}

// Apenas pra testes
export function _setGeocoderForTests(g: Geocoder | null) {
  _instance = g;
}
```

- [ ] **Step 2: Append tests**

```ts
import { _setGeocoderForTests } from "@/lib/lugares/geocoder-instance";

describe("lugares.geocode", { timeout: 30000 }, () => {
  it("geocode salva lat/lng", async () => {
    _setGeocoderForTests({
      async geocode() { return { latitude: -12.697, longitude: -38.324, source: "nominatim" }; },
    });
    const user = await makeUser();
    try {
      const caller = createCaller(mkCtx(user));
      const l = await caller.lugares.create({ logradouro: "Rua X", numero: "1", fonte: "manual" });
      const r = await caller.lugares.geocode({ id: l.id });
      expect(r.latitude).toBeCloseTo(-12.697);
      const got = await caller.lugares.getById({ id: l.id });
      expect(Number(got?.latitude)).toBeCloseTo(-12.697);
      expect(got?.geocodingSource).toBe("nominatim");
      await db.delete(lugares).where(eq(lugares.id, l.id));
    } finally {
      _setGeocoderForTests(null);
      await db.delete(users).where(eq(users.id, user.id));
    }
  });

  it("geocode skip-if-exists sem force", async () => {
    _setGeocoderForTests({
      async geocode() { throw new Error("não deveria chamar"); },
    });
    const user = await makeUser();
    try {
      const caller = createCaller(mkCtx(user));
      const l = await caller.lugares.create({ logradouro: "Rua Y", fonte: "manual" });
      await caller.lugares.update({ id: l.id, patch: { latitude: -12, longitude: -38 } });
      // Atualizar geocoding_source manualmente pra simular que já foi geocodado
      await db.update(lugares).set({ geocodingSource: "manual", geocodedAt: new Date() })
        .where(eq(lugares.id, l.id));
      const r = await caller.lugares.geocode({ id: l.id });
      expect(r.source).toBe("manual");
      await db.delete(lugares).where(eq(lugares.id, l.id));
    } finally {
      _setGeocoderForTests(null);
      await db.delete(users).where(eq(users.id, user.id));
    }
  });

  it("geocode falha grava geocoding_source=nominatim-fail", async () => {
    _setGeocoderForTests({
      async geocode() { return { source: "nominatim", failed: true }; },
    });
    const user = await makeUser();
    try {
      const caller = createCaller(mkCtx(user));
      const l = await caller.lugares.create({ logradouro: "Não existe", fonte: "manual" });
      const r = await caller.lugares.geocode({ id: l.id });
      expect(r.failed).toBe(true);
      const got = await caller.lugares.getById({ id: l.id });
      expect(got?.geocodingSource).toBe("nominatim-fail");
      await db.delete(lugares).where(eq(lugares.id, l.id));
    } finally {
      _setGeocoderForTests(null);
      await db.delete(users).where(eq(users.id, user.id));
    }
  });
});
```

- [ ] **Step 3: Run FAIL**

- [ ] **Step 4: Adicionar procedure geocode**

No router de `lugares.ts`, adicionar:

```ts
  geocode: protectedProcedure
    .input(z.object({ id: z.number(), force: z.boolean().optional() }))
    .mutation(async ({ input, ctx }) => {
      const rows = await db.select().from(lugares)
        .where(and(eq(lugares.id, input.id), eq(lugares.workspaceId, ctx.session.user.workspaceId)))
        .limit(1);
      if (rows.length === 0) throw new Error("Lugar não encontrado");
      const l = rows[0];

      if (!input.force && l.latitude !== null && l.longitude !== null) {
        return {
          latitude: Number(l.latitude),
          longitude: Number(l.longitude),
          source: l.geocodingSource ?? "manual",
        };
      }

      const { getGeocoder } = await import("@/lib/lugares/geocoder-instance");
      const geocoder = getGeocoder();
      const result = await geocoder.geocode({
        logradouro: l.logradouro,
        numero: l.numero,
        bairro: l.bairro,
        cidade: l.cidade,
        uf: l.uf,
      });

      await db.insert(lugaresAccessLog).values({
        lugarId: input.id,
        userId: ctx.session.user.id,
        action: "geocode",
        context: { failed: result.failed ?? false },
      });

      if (result.failed) {
        await db.update(lugares).set({
          geocodedAt: new Date(),
          geocodingSource: "nominatim-fail",
        }).where(eq(lugares.id, input.id));
        return { source: "nominatim", failed: true };
      }

      await db.update(lugares).set({
        latitude: String(result.latitude),
        longitude: String(result.longitude),
        geocodedAt: new Date(),
        geocodingSource: "nominatim",
      }).where(eq(lugares.id, input.id));

      return {
        latitude: result.latitude,
        longitude: result.longitude,
        source: "nominatim" as const,
      };
    }),
```

- [ ] **Step 5: Run PASS**

- [ ] **Step 6: Commit**

```
cd /Users/rodrigorochameire/projetos/Defender
git add src/lib/lugares/geocoder-instance.ts src/lib/trpc/routers/lugares.ts __tests__/trpc/lugares-router.test.ts
git commit -m "feat(lugares): tRPC geocode procedure + singleton"
```

---

## Task 9: Backfill script

**Files:**
- Create: `scripts/backfill-lugares.mjs`

- [ ] **Step 1: Implementar**

Create `scripts/backfill-lugares.mjs` (espelha `scripts/backfill-pessoas.mjs`):

```js
#!/usr/bin/env node
import postgres from "postgres";
import * as dotenv from "dotenv";

dotenv.config({ path: "/Users/rodrigorochameire/projetos/Defender/.env.local" });

const DRY = process.argv.includes("--dry-run");

// Espelha src/lib/lugares/normalizar-endereco.ts
function normalizarEndereco(s) {
  if (!s) return "";
  let t = String(s).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  t = t.replace(/\b\d{5}-?\d{3}\b/g, " ");
  t = t.replace(/\bcep\s*/gi, " ");
  t = t.replace(/[,;:()]/g, " ");
  t = t.replace(/\bs\s*\/\s*n\b/g, "sn");
  t = t.replace(/[-\/\\]/g, " ");
  t = t.replace(/\bav\.?/g, "avenida");
  t = t.replace(/\br\.?\b/g, "rua");
  t = t.replace(/\btv\.?\b/g, "travessa");
  t = t.replace(/\bestr\.?\b/g, "estrada");
  t = t.replace(/\best\.?\b/g, "estrada");
  t = t.replace(/\brod\.?\b/g, "rodovia");
  t = t.replace(/\bal\.?\b/g, "alameda");
  t = t.replace(/\bpca\b/g, "praca");
  t = t.replace(/\bpraça\b/g, "praca");
  t = t.replace(/\bn[º°]\b/g, " ");
  t = t.replace(/\bn\.\s*/g, " ");
  t = t.replace(/\bno\.\s*/g, " ");
  t = t.replace(/\b(camacari|camaçari|salvador|lauro de freitas|dias davila)\b/g, " ");
  t = t.replace(/\b(bahia|brasil|brazil|ba)\b\s*$/g, " ");
  return t.replace(/\s+/g, " ").trim();
}

const PLACEHOLDER_PATTERNS = [
  /^\s*$/, /^\s*[-?.]+\s*$/, /^\s*n\/c\s*$/i, /^\s*n\.?a\.?\s*$/i,
  /\bn[aã]o\s+informad/i, /\bn[aã]o\s+consta\b/i, /\bsem\s+endere[çc]o\b/i,
  /\ba\s+confirmar\b/i, /\ba\s+extrair\b/i, /\bA\s+EXTRAIR\b/, /\bdesconhecid/i,
];
function isPlaceholder(s) {
  if (!s) return true;
  const str = String(s).trim();
  if (str.length < 3) return true;
  return PLACEHOLDER_PATTERNS.some((re) => re.test(str));
}

const sql = postgres(process.env.DATABASE_URL, { max: 3 });
const counters = {
  lugaresCriados: 0,
  lugaresExistentes: 0,
  participacoesCriadas: 0,
  participacoesExistentes: 0,
  warningsPlaceholder: 0,
  warningsProximidade: 0,
};

async function getOrCreateLugar({ workspaceId, logradouro, numero, bairro, cidade, uf, cep, enderecoCompleto, lat, lng, fonte }) {
  const full = enderecoCompleto || [logradouro, numero, bairro, cidade, uf].filter(Boolean).join(", ");
  if (isPlaceholder(full) && isPlaceholder(logradouro)) {
    counters.warningsPlaceholder++;
    return null;
  }
  const norm = normalizarEndereco(full);
  if (!norm) {
    counters.warningsPlaceholder++;
    return null;
  }
  const existing = await sql`
    SELECT id FROM lugares
    WHERE endereco_normalizado = ${norm} AND merged_into IS NULL
      AND workspace_id = ${workspaceId}
    LIMIT 1
  `;
  if (existing.length > 0) {
    counters.lugaresExistentes++;
    return existing[0].id;
  }
  if (DRY) { counters.lugaresCriados++; return -1; }
  const [row] = await sql`
    INSERT INTO lugares (workspace_id, logradouro, numero, bairro, cidade, uf, cep,
                        endereco_completo, endereco_normalizado, latitude, longitude,
                        fonte_criacao, geocoded_at, geocoding_source)
    VALUES (${workspaceId}, ${logradouro ?? null}, ${numero ?? null}, ${bairro ?? null},
            ${cidade ?? "Camaçari"}, ${uf ?? "BA"}, ${cep ?? null},
            ${full}, ${norm}, ${lat ?? null}, ${lng ?? null},
            ${fonte}, ${lat != null ? new Date() : null}, ${lat != null ? "origem" : null})
    RETURNING id
  `;
  counters.lugaresCriados++;
  return row.id;
}

async function addParticipacao({ lugarId, processoId, pessoaId, tipo, dataRelacionada, sourceTable, sourceId, fonte, confidence = 0.9 }) {
  if (!lugarId || lugarId === -1) return;
  const exists = await sql`
    SELECT id FROM participacoes_lugar
    WHERE lugar_id = ${lugarId}
      AND processo_id IS NOT DISTINCT FROM ${processoId ?? null}
      AND tipo = ${tipo}
      AND source_table IS NOT DISTINCT FROM ${sourceTable ?? null}
      AND source_id IS NOT DISTINCT FROM ${sourceId ?? null}
    LIMIT 1
  `;
  if (exists.length > 0) { counters.participacoesExistentes++; return; }
  if (DRY) { counters.participacoesCriadas++; return; }
  await sql`
    INSERT INTO participacoes_lugar
      (lugar_id, processo_id, pessoa_id, tipo, data_relacionada, source_table, source_id, fonte, confidence)
    VALUES
      (${lugarId}, ${processoId ?? null}, ${pessoaId ?? null}, ${tipo},
       ${dataRelacionada ?? null}, ${sourceTable ?? null}, ${sourceId ?? null},
       ${fonte}, ${confidence})
    ON CONFLICT DO NOTHING
  `;
  counters.participacoesCriadas++;
}

async function columnExists(table, column) {
  const res = await sql`
    SELECT column_name FROM information_schema.columns
    WHERE table_name = ${table} AND column_name = ${column}
  `;
  return res.length > 0;
}

async function main() {
  console.log(DRY ? "DRY RUN\n" : "BACKFILL LUGARES\n");

  // 1/6 processos.local_do_fato_endereco
  console.log("1/6 processos.local_do_fato...");
  const hasLocalFato = await columnExists("processos", "local_do_fato_endereco");
  if (hasLocalFato) {
    const rows = await sql`
      SELECT id, workspace_id, local_do_fato_endereco AS endereco, local_do_fato_lat AS lat, local_do_fato_lng AS lng
      FROM processos WHERE local_do_fato_endereco IS NOT NULL AND local_do_fato_endereco != ''
    `;
    console.log(`  ${rows.length} processos`);
    for (const p of rows) {
      const lugarId = await getOrCreateLugar({
        workspaceId: p.workspace_id, enderecoCompleto: p.endereco,
        lat: p.lat, lng: p.lng, fonte: "backfill",
      });
      await addParticipacao({
        lugarId, processoId: p.id, tipo: "local-do-fato",
        sourceTable: "processos", sourceId: p.id, fonte: "backfill",
      });
    }
  }

  // 2/6 processos.vvd_agressor_residencia
  console.log("2/6 processos.vvd_agressor_residencia...");
  const hasVvdRes = await columnExists("processos", "vvd_agressor_residencia_endereco");
  if (hasVvdRes) {
    const rows = await sql`
      SELECT id, workspace_id,
             vvd_agressor_residencia_endereco AS endereco,
             vvd_agressor_residencia_lat AS lat,
             vvd_agressor_residencia_lng AS lng
      FROM processos WHERE vvd_agressor_residencia_endereco IS NOT NULL AND vvd_agressor_residencia_endereco != ''
    `;
    console.log(`  ${rows.length} processos`);
    for (const p of rows) {
      const lugarId = await getOrCreateLugar({
        workspaceId: p.workspace_id, enderecoCompleto: p.endereco,
        lat: p.lat, lng: p.lng, fonte: "backfill",
      });
      // Resolver pessoa_id via participacoes_processo(papel='co-reu')
      const ag = await sql`
        SELECT pessoa_id FROM participacoes_processo
        WHERE processo_id = ${p.id} AND papel = 'co-reu' LIMIT 1
      `;
      await addParticipacao({
        lugarId, processoId: p.id, pessoaId: ag[0]?.pessoa_id ?? null,
        tipo: "residencia-agressor",
        sourceTable: "processos_vvd_res", sourceId: p.id, fonte: "backfill",
      });
    }
  }

  // 3/6 processos.vvd_agressor_trabalho
  console.log("3/6 processos.vvd_agressor_trabalho...");
  const hasVvdTrab = await columnExists("processos", "vvd_agressor_trabalho_endereco");
  if (hasVvdTrab) {
    const rows = await sql`
      SELECT id, workspace_id,
             vvd_agressor_trabalho_endereco AS endereco,
             vvd_agressor_trabalho_lat AS lat,
             vvd_agressor_trabalho_lng AS lng
      FROM processos WHERE vvd_agressor_trabalho_endereco IS NOT NULL AND vvd_agressor_trabalho_endereco != ''
    `;
    console.log(`  ${rows.length} processos`);
    for (const p of rows) {
      const lugarId = await getOrCreateLugar({
        workspaceId: p.workspace_id, enderecoCompleto: p.endereco,
        lat: p.lat, lng: p.lng, fonte: "backfill",
      });
      const ag = await sql`
        SELECT pessoa_id FROM participacoes_processo
        WHERE processo_id = ${p.id} AND papel = 'co-reu' LIMIT 1
      `;
      await addParticipacao({
        lugarId, processoId: p.id, pessoaId: ag[0]?.pessoa_id ?? null,
        tipo: "trabalho-agressor",
        sourceTable: "processos_vvd_trab", sourceId: p.id, fonte: "backfill",
      });
    }
  }

  // 4/6 assistidos.endereco
  console.log("4/6 assistidos.endereco...");
  const hasAssistEnd = await columnExists("assistidos", "endereco");
  if (hasAssistEnd) {
    const rows = await sql`
      SELECT id, workspace_id, endereco, bairro, cidade, user_id
      FROM assistidos WHERE endereco IS NOT NULL AND endereco != ''
    `;
    console.log(`  ${rows.length} assistidos`);
    for (const a of rows) {
      const lugarId = await getOrCreateLugar({
        workspaceId: a.workspace_id,
        logradouro: a.endereco, bairro: a.bairro, cidade: a.cidade,
        enderecoCompleto: [a.endereco, a.bairro, a.cidade].filter(Boolean).join(", "),
        fonte: "backfill",
      });
      // Resolve pessoa_id via users → pessoas (se existir mapeamento)
      let pessoaId = null;
      if (a.user_id) {
        const p = await sql`SELECT id FROM pessoas WHERE user_id = ${a.user_id} LIMIT 1`;
        pessoaId = p[0]?.id ?? null;
      }
      await addParticipacao({
        lugarId, processoId: null, pessoaId, tipo: "endereco-assistido",
        sourceTable: "assistidos", sourceId: a.id, fonte: "backfill",
      });
    }
  }

  // 5/6 atendimentos.endereco
  console.log("5/6 atendimentos.endereco...");
  const hasAtEnd = await columnExists("atendimentos", "endereco");
  if (hasAtEnd) {
    const rows = await sql`
      SELECT id, workspace_id, endereco, processo_id
      FROM atendimentos WHERE endereco IS NOT NULL AND endereco != ''
    `;
    console.log(`  ${rows.length} atendimentos`);
    for (const a of rows) {
      const lugarId = await getOrCreateLugar({
        workspaceId: a.workspace_id, enderecoCompleto: a.endereco, fonte: "backfill",
      });
      await addParticipacao({
        lugarId, processoId: a.processo_id ?? null, tipo: "local-atendimento",
        sourceTable: "atendimentos", sourceId: a.id, fonte: "backfill",
      });
    }
  }

  // 6/6 radar_noticias
  console.log("6/6 radar_noticias...");
  const hasRadar = await columnExists("radar_noticias", "logradouro");
  if (hasRadar) {
    const rows = await sql`
      SELECT id, workspace_id, logradouro, bairro, latitude, longitude, publicado_em
      FROM radar_noticias WHERE (logradouro IS NOT NULL AND logradouro != '') OR (bairro IS NOT NULL AND bairro != '')
    `;
    console.log(`  ${rows.length} notícias`);
    for (const r of rows) {
      const enderecoCompleto = [r.logradouro, r.bairro, "Camaçari", "BA"].filter(Boolean).join(", ");
      const lugarId = await getOrCreateLugar({
        workspaceId: r.workspace_id, logradouro: r.logradouro, bairro: r.bairro,
        enderecoCompleto, lat: r.latitude, lng: r.longitude, fonte: "backfill",
      });
      await addParticipacao({
        lugarId, processoId: null, tipo: "radar-noticia",
        dataRelacionada: r.publicado_em ?? null,
        sourceTable: "radar_noticias", sourceId: r.id, fonte: "backfill",
      });
    }
  }

  console.log("\n=== Resultado ===");
  for (const [k, v] of Object.entries(counters)) console.log(`${k.padEnd(28)} ${v}`);
  await sql.end();
}

main().catch((e) => { console.error(e); process.exit(1); });
```

- [ ] **Step 2: Dry-run**

```
cd /Users/rodrigorochameire/projetos/Defender
node scripts/backfill-lugares.mjs --dry-run
```

Expected: relatório com counters > 0, zero erros.

- [ ] **Step 3: Run real**

```
node scripts/backfill-lugares.mjs
```

Expected: lugares criados (pelo menos > 0), participações criadas (> 0), warnings placeholders registrados.

- [ ] **Step 4: Verificar idempotência**

Run novamente:
```
node scripts/backfill-lugares.mjs
```

Expected: `lugaresExistentes` e `participacoesExistentes` devem ser altos; `lugaresCriados` e `participacoesCriadas` baixos ou zero.

- [ ] **Step 5: Commit**

```
cd /Users/rodrigorochameire/projetos/Defender
git add scripts/backfill-lugares.mjs
git commit -m "feat(lugares): backfill idempotente de 6 fontes"
```

---

## Task 10: `LugarChip` silencioso + `LugarSheet`

**Files:**
- Create: `src/components/lugares/lugar-chip.tsx`
- Create: `src/components/lugares/lugar-sheet.tsx`
- Create: `src/components/lugares/index.ts`
- Create: `__tests__/components/lugares/lugar-chip.test.tsx`

- [ ] **Step 1: Write failing test LugarChip**

Create `__tests__/components/lugares/lugar-chip.test.tsx`:

```tsx
// @vitest-environment happy-dom
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { LugarChip } from "@/components/lugares/lugar-chip";

afterEach(() => cleanup());

describe("LugarChip", () => {
  it("renderiza endereço + bairro em badge", () => {
    render(<LugarChip enderecoCompleto="Rua X, 123" bairro="Centro" />);
    expect(screen.getByText(/Rua X, 123/i)).toBeInTheDocument();
    expect(screen.getByText(/Centro/i)).toBeInTheDocument();
  });

  it("sem bairro não renderiza badge", () => {
    const { container } = render(<LugarChip enderecoCompleto="Rua X" />);
    expect(container.textContent).not.toContain("Centro");
  });

  it("click dispara onClick com lugarId", () => {
    let received: number | null = null;
    render(<LugarChip lugarId={42} enderecoCompleto="Rua X" onClick={(r) => { received = r.id ?? null; }} />);
    fireEvent.click(screen.getByRole("button"));
    expect(received).toBe(42);
  });

  it("clickable=false não vira button", () => {
    const { container } = render(<LugarChip enderecoCompleto="Rua X" clickable={false} />);
    expect(container.querySelector("button")).toBeNull();
  });
});
```

- [ ] **Step 2: Run FAIL**

- [ ] **Step 3: Implement LugarChip**

Create `src/components/lugares/lugar-chip.tsx`:

```tsx
"use client";

import { MapPin } from "lucide-react";
import { cn } from "@/lib/utils";

export interface LugarChipProps {
  lugarId?: number;
  enderecoCompleto?: string | null;
  bairro?: string | null;
  size?: "xs" | "sm" | "md";
  clickable?: boolean;
  onClick?: (resolved: { id?: number; enderecoCompleto?: string | null }) => void;
  className?: string;
}

export function LugarChip({
  lugarId, enderecoCompleto, bairro, size = "sm", clickable = true, onClick, className,
}: LugarChipProps) {
  const content = (
    <>
      <MapPin className={size === "xs" ? "w-2.5 h-2.5" : "w-3 h-3"} />
      <span className="truncate max-w-[200px]">{enderecoCompleto ?? "(sem endereço)"}</span>
      {bairro && (
        <span className="text-[9px] px-1 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 opacity-80">
          {bairro}
        </span>
      )}
    </>
  );

  const base = cn(
    "inline-flex items-center gap-1 rounded-md",
    size === "xs" && "text-[10px] px-1 py-0.5",
    size === "sm" && "text-[11px] px-1.5 py-0.5",
    size === "md" && "text-xs px-2 py-1",
    "border border-neutral-200 dark:border-neutral-800",
    className,
  );

  if (!clickable || !onClick) {
    return <span className={base}>{content}</span>;
  }
  return (
    <button
      type="button"
      onClick={() => onClick({ id: lugarId, enderecoCompleto })}
      className={cn(base, "cursor-pointer hover:border-emerald-400")}
    >
      {content}
    </button>
  );
}
```

- [ ] **Step 4: Run PASS**

- [ ] **Step 5: Write LugarSheet test**

Create `__tests__/components/lugares/lugar-sheet.test.tsx`:

```tsx
// @vitest-environment happy-dom
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { LugarSheet } from "@/components/lugares/lugar-sheet";

afterEach(() => cleanup());

vi.mock("@/lib/trpc/client", () => ({
  trpc: {
    lugares: {
      getById: { useQuery: () => ({ data: {
        id: 1, logradouro: "Rua X", numero: "123", bairro: "Centro",
        cidade: "Camaçari", uf: "BA", enderecoCompleto: "Rua X, 123 - Centro",
        latitude: null, longitude: null, geocodingSource: null,
      }, isLoading: false }) },
      getParticipacoesDoLugar: { useQuery: () => ({ data: [], isLoading: false }) },
      geocode: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) },
    },
  },
}));

describe("LugarSheet", () => {
  it("renderiza 4 abas com dados do lugar", () => {
    render(<LugarSheet lugarId={1} open={true} onOpenChange={() => {}} />);
    expect(screen.getByText(/Rua X, 123/i)).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /geral/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /participa/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /coordenada/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /merge/i })).toBeInTheDocument();
  });

  it("não renderiza quando lugarId=null", () => {
    const { container } = render(<LugarSheet lugarId={null} open={false} onOpenChange={() => {}} />);
    expect(container.querySelector('[role="dialog"]')).toBeNull();
  });
});
```

- [ ] **Step 6: Run FAIL**

- [ ] **Step 7: Implement LugarSheet**

Create `src/components/lugares/lugar-sheet.tsx`:

```tsx
"use client";

import { trpc } from "@/lib/trpc/client";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { MapPin } from "lucide-react";

interface Props {
  lugarId: number | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LugarSheet({ lugarId, open, onOpenChange }: Props) {
  if (lugarId === null) return null;
  const { data: lugar } = trpc.lugares.getById.useQuery({ id: lugarId }, { enabled: open });
  const { data: participacoes = [] } = trpc.lugares.getParticipacoesDoLugar.useQuery(
    { lugarId }, { enabled: open }
  );
  const geocodeMutation = trpc.lugares.geocode.useMutation();

  if (!lugar) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[480px] max-w-full">
        <div className="flex items-center gap-2 pb-3 border-b">
          <MapPin className="w-4 h-4" />
          <h2 className="text-sm font-semibold truncate">{lugar.enderecoCompleto}</h2>
        </div>

        <Tabs defaultValue="geral" className="mt-3">
          <TabsList>
            <TabsTrigger value="geral">Geral</TabsTrigger>
            <TabsTrigger value="participacoes">Participações ({participacoes.length})</TabsTrigger>
            <TabsTrigger value="coordenadas">Coordenadas</TabsTrigger>
            <TabsTrigger value="merge">Merge</TabsTrigger>
          </TabsList>

          <TabsContent value="geral" className="space-y-2 text-sm">
            <div><strong>Logradouro:</strong> {lugar.logradouro ?? "—"}</div>
            <div><strong>Número:</strong> {lugar.numero ?? "—"}</div>
            <div><strong>Bairro:</strong> {lugar.bairro ?? "—"}</div>
            <div><strong>Cidade/UF:</strong> {lugar.cidade ?? "—"} / {lugar.uf ?? "—"}</div>
            <div><strong>CEP:</strong> {lugar.cep ?? "—"}</div>
            <div><strong>Observações:</strong> {lugar.observacoes ?? "—"}</div>
          </TabsContent>

          <TabsContent value="participacoes" className="space-y-1.5 text-xs">
            {participacoes.length === 0 ? (
              <p className="italic text-neutral-400">Nenhuma participação vinculada.</p>
            ) : participacoes.map((p: any) => (
              <div key={p.id} className="rounded border px-2 py-1.5">
                <div className="font-medium">{p.tipo.replace(/-/g, " ")}</div>
                <div className="text-neutral-500">
                  {p.processoId && `Processo #${p.processoId}`}
                  {p.pessoaId && ` · Pessoa #${p.pessoaId}`}
                </div>
              </div>
            ))}
          </TabsContent>

          <TabsContent value="coordenadas" className="space-y-2 text-sm">
            {lugar.latitude != null ? (
              <>
                <div>Lat/Lng: <strong>{Number(lugar.latitude).toFixed(5)}, {Number(lugar.longitude).toFixed(5)}</strong></div>
                <div>Fonte: {lugar.geocodingSource ?? "—"}</div>
              </>
            ) : (
              <p className="italic text-neutral-400">Sem coordenadas.</p>
            )}
            <button
              type="button"
              onClick={() => geocodeMutation.mutate({ id: lugarId, force: lugar.latitude != null })}
              disabled={geocodeMutation.isPending}
              className="px-3 py-1.5 rounded border text-xs cursor-pointer hover:border-emerald-400"
            >
              {geocodeMutation.isPending ? "Geocodando…" : (lugar.latitude != null ? "Re-geocodar" : "Geocodar")}
            </button>
          </TabsContent>

          <TabsContent value="merge" className="text-sm">
            <p className="italic text-neutral-400">Veja o merge-queue global em /admin/lugares/merge-queue.</p>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
```

- [ ] **Step 8: Implement index.ts**

Create `src/components/lugares/index.ts`:

```ts
export { LugarChip, type LugarChipProps } from "./lugar-chip";
export { LugarSheet } from "./lugar-sheet";
```

- [ ] **Step 9: Run tests PASS**

Expected: 4 LugarChip + 2 LugarSheet.

- [ ] **Step 10: Commit**

```
cd /Users/rodrigorochameire/projetos/Defender
git add src/components/lugares/lugar-chip.tsx src/components/lugares/lugar-sheet.tsx src/components/lugares/index.ts __tests__/components/lugares/
git commit -m "feat(lugares): LugarChip silencioso + LugarSheet 4 abas"
```

---

## Task 11: `LugarForm` + páginas `/admin/lugares/[id]` + `/admin/lugares/nova`

**Files:**
- Create: `src/components/lugares/lugar-form.tsx`
- Create: `src/app/(dashboard)/admin/lugares/[id]/page.tsx`
- Create: `src/app/(dashboard)/admin/lugares/nova/page.tsx`

- [ ] **Step 1: Implement LugarForm**

Create `src/components/lugares/lugar-form.tsx`:

```tsx
"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface Props {
  mode: "create" | "edit";
  initial?: {
    id?: number;
    logradouro?: string | null;
    numero?: string | null;
    complemento?: string | null;
    bairro?: string | null;
    cidade?: string | null;
    uf?: string | null;
    cep?: string | null;
    observacoes?: string | null;
  };
}

export function LugarForm({ mode, initial }: Props) {
  const router = useRouter();
  const [form, setForm] = useState({
    logradouro: initial?.logradouro ?? "",
    numero: initial?.numero ?? "",
    complemento: initial?.complemento ?? "",
    bairro: initial?.bairro ?? "",
    cidade: initial?.cidade ?? "Camaçari",
    uf: initial?.uf ?? "BA",
    cep: initial?.cep ?? "",
    observacoes: initial?.observacoes ?? "",
  });

  const createMut = trpc.lugares.create.useMutation({
    onSuccess: ({ id }) => { toast.success("Lugar criado"); router.push(`/admin/lugares/${id}`); },
    onError: (e) => toast.error(e.message),
  });
  const updateMut = trpc.lugares.update.useMutation({
    onSuccess: () => { toast.success("Atualizado"); router.refresh(); },
    onError: (e) => toast.error(e.message),
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === "create") {
      createMut.mutate({ ...form, fonte: "manual" });
    } else if (initial?.id) {
      updateMut.mutate({ id: initial.id, patch: form });
    }
  };

  const pending = createMut.isPending || updateMut.isPending;

  return (
    <form onSubmit={submit} className="space-y-3 max-w-xl">
      <div className="grid grid-cols-3 gap-2">
        <label className="col-span-2 block">
          <span className="text-xs text-neutral-500">Logradouro</span>
          <input className="w-full px-2 py-1.5 border rounded text-sm"
            value={form.logradouro}
            onChange={(e) => setForm((f) => ({ ...f, logradouro: e.target.value }))} />
        </label>
        <label className="block">
          <span className="text-xs text-neutral-500">Número</span>
          <input className="w-full px-2 py-1.5 border rounded text-sm"
            value={form.numero}
            onChange={(e) => setForm((f) => ({ ...f, numero: e.target.value }))} />
        </label>
      </div>
      <label className="block">
        <span className="text-xs text-neutral-500">Complemento</span>
        <input className="w-full px-2 py-1.5 border rounded text-sm"
          value={form.complemento}
          onChange={(e) => setForm((f) => ({ ...f, complemento: e.target.value }))} />
      </label>
      <div className="grid grid-cols-3 gap-2">
        <label className="block">
          <span className="text-xs text-neutral-500">Bairro</span>
          <input className="w-full px-2 py-1.5 border rounded text-sm"
            value={form.bairro}
            onChange={(e) => setForm((f) => ({ ...f, bairro: e.target.value }))} />
        </label>
        <label className="block">
          <span className="text-xs text-neutral-500">Cidade</span>
          <input className="w-full px-2 py-1.5 border rounded text-sm"
            value={form.cidade}
            onChange={(e) => setForm((f) => ({ ...f, cidade: e.target.value }))} />
        </label>
        <label className="block">
          <span className="text-xs text-neutral-500">UF</span>
          <input className="w-full px-2 py-1.5 border rounded text-sm"
            maxLength={2}
            value={form.uf}
            onChange={(e) => setForm((f) => ({ ...f, uf: e.target.value.toUpperCase() }))} />
        </label>
      </div>
      <label className="block">
        <span className="text-xs text-neutral-500">CEP</span>
        <input className="w-40 px-2 py-1.5 border rounded text-sm"
          value={form.cep}
          onChange={(e) => setForm((f) => ({ ...f, cep: e.target.value }))} />
      </label>
      <label className="block">
        <span className="text-xs text-neutral-500">Observações</span>
        <textarea className="w-full px-2 py-1.5 border rounded text-sm" rows={3}
          value={form.observacoes}
          onChange={(e) => setForm((f) => ({ ...f, observacoes: e.target.value }))} />
      </label>
      <button type="submit" disabled={pending}
        className="px-4 py-2 rounded border cursor-pointer hover:border-emerald-400 text-sm">
        {pending ? "Salvando…" : (mode === "create" ? "Criar" : "Salvar")}
      </button>
    </form>
  );
}
```

- [ ] **Step 2: Implement /admin/lugares/nova**

Create `src/app/(dashboard)/admin/lugares/nova/page.tsx`:

```tsx
import { LugarForm } from "@/components/lugares/lugar-form";

export default function NovoLugarPage() {
  return (
    <div className="p-6">
      <h1 className="text-lg font-semibold mb-4">Novo lugar</h1>
      <LugarForm mode="create" />
    </div>
  );
}
```

- [ ] **Step 3: Implement /admin/lugares/[id]**

Create `src/app/(dashboard)/admin/lugares/[id]/page.tsx`:

```tsx
"use client";

import { useParams } from "next/navigation";
import { trpc } from "@/lib/trpc/client";
import { LugarForm } from "@/components/lugares/lugar-form";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export default function LugarDetalhePage() {
  const params = useParams();
  const id = Number(params?.id);
  const { data: lugar, isLoading } = trpc.lugares.getById.useQuery({ id }, { enabled: !isNaN(id) });
  const { data: participacoes = [] } = trpc.lugares.getParticipacoesDoLugar.useQuery({ lugarId: id }, { enabled: !isNaN(id) });
  const geocode = trpc.lugares.geocode.useMutation();

  if (isLoading) return <p className="p-6 text-sm text-neutral-500">Carregando…</p>;
  if (!lugar) return <p className="p-6 text-sm">Lugar não encontrado.</p>;

  return (
    <div className="p-6 max-w-3xl">
      <h1 className="text-lg font-semibold mb-4">{lugar.enderecoCompleto}</h1>
      <Tabs defaultValue="geral">
        <TabsList>
          <TabsTrigger value="geral">Geral</TabsTrigger>
          <TabsTrigger value="participacoes">Participações ({participacoes.length})</TabsTrigger>
          <TabsTrigger value="merge">Merge</TabsTrigger>
        </TabsList>
        <TabsContent value="geral" className="pt-4 space-y-4">
          <LugarForm mode="edit" initial={lugar as any} />
          <div className="pt-4 border-t">
            <div className="text-xs text-neutral-500 mb-2">
              Lat/Lng: {lugar.latitude != null ? `${Number(lugar.latitude).toFixed(5)}, ${Number(lugar.longitude).toFixed(5)}` : "—"}
              {lugar.geocodingSource && ` · ${lugar.geocodingSource}`}
            </div>
            <button
              type="button"
              onClick={() => geocode.mutate({ id, force: lugar.latitude != null })}
              disabled={geocode.isPending}
              className="px-3 py-1.5 rounded border text-xs cursor-pointer hover:border-emerald-400"
            >
              {geocode.isPending ? "Geocodando…" : (lugar.latitude != null ? "Re-geocodar" : "Geocodar")}
            </button>
          </div>
        </TabsContent>
        <TabsContent value="participacoes" className="pt-4 space-y-2">
          {participacoes.length === 0
            ? <p className="italic text-neutral-400 text-sm">Nenhuma.</p>
            : participacoes.map((p: any) => (
              <div key={p.id} className="rounded border px-3 py-2 text-sm">
                <div className="font-medium">{p.tipo.replace(/-/g, " ")}</div>
                <div className="text-xs text-neutral-500">
                  {p.processoId && <a href={`/admin/processos/${p.processoId}`} className="underline">Processo #{p.processoId}</a>}
                  {p.pessoaId && <> · <a href={`/admin/pessoas/${p.pessoaId}`} className="underline">Pessoa #{p.pessoaId}</a></>}
                </div>
              </div>
            ))}
        </TabsContent>
        <TabsContent value="merge" className="pt-4">
          <p className="italic text-neutral-400 text-sm">
            Veja candidatos globais em <a href="/admin/lugares/merge-queue" className="underline">merge-queue</a>.
          </p>
        </TabsContent>
      </Tabs>
    </div>
  );
}
```

- [ ] **Step 4: Typecheck**

```
cd /Users/rodrigorochameire/projetos/Defender && npm run typecheck 2>&1 | tail -30
```

Expected: 0 novos erros.

- [ ] **Step 5: Commit**

```
cd /Users/rodrigorochameire/projetos/Defender
git add 'src/app/(dashboard)/admin/lugares/nova/page.tsx' 'src/app/(dashboard)/admin/lugares/[id]/page.tsx' src/components/lugares/lugar-form.tsx
git commit -m "feat(lugares): LugarForm + páginas /admin/lugares/[id] + /nova"
```

---

## Task 12: `/admin/lugares` catálogo + merge-queue

**Files:**
- Create: `src/app/(dashboard)/admin/lugares/page.tsx`
- Create: `src/app/(dashboard)/admin/lugares/merge-queue/page.tsx`
- Create: `src/components/lugares/merge-pair-card-lugar.tsx`

- [ ] **Step 1: Catálogo**

Create `src/app/(dashboard)/admin/lugares/page.tsx`:

```tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { trpc } from "@/lib/trpc/client";
import { LugarChip, LugarSheet } from "@/components/lugares";
import { Plus } from "lucide-react";

export default function LugaresCatalogoPage() {
  const [search, setSearch] = useState("");
  const [bairro, setBairro] = useState("");
  const [temCoord, setTemCoord] = useState(false);
  const [sheetId, setSheetId] = useState<number | null>(null);
  const [offset, setOffset] = useState(0);
  const limit = 50;

  const { data, isLoading } = trpc.lugares.list.useQuery({
    search: search || undefined,
    bairro: bairro || undefined,
    temCoord: temCoord || undefined,
    limit, offset,
  });

  const items = data?.items ?? [];
  const total = data?.total ?? 0;

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-semibold">Lugares ({total})</h1>
        <div className="flex items-center gap-2">
          <Link href="/admin/lugares/merge-queue"
                className="text-xs text-neutral-500 underline hover:text-neutral-700">
            Merge-queue
          </Link>
          <Link href="/admin/lugares/nova"
                className="px-3 py-1.5 rounded border text-sm flex items-center gap-1 cursor-pointer hover:border-emerald-400">
            <Plus className="w-3 h-3" /> Novo
          </Link>
        </div>
      </div>

      <div className="flex gap-2 mb-3 flex-wrap">
        <input placeholder="Buscar..." value={search}
          onChange={(e) => { setSearch(e.target.value); setOffset(0); }}
          className="px-2 py-1.5 border rounded text-sm w-60" />
        <input placeholder="Bairro" value={bairro}
          onChange={(e) => { setBairro(e.target.value); setOffset(0); }}
          className="px-2 py-1.5 border rounded text-sm w-40" />
        <label className="flex items-center gap-1 text-xs">
          <input type="checkbox" checked={temCoord}
            onChange={(e) => { setTemCoord(e.target.checked); setOffset(0); }} />
          só c/ coord
        </label>
      </div>

      {isLoading && <p className="text-sm text-neutral-400 italic">Carregando...</p>}
      {!isLoading && items.length === 0 && (
        <p className="text-sm text-neutral-400 italic">Nenhum lugar encontrado.</p>
      )}

      <div className="space-y-1.5">
        {items.map((l: any) => (
          <div key={l.id} className="rounded border px-3 py-2 flex items-center gap-2">
            <LugarChip
              lugarId={l.id}
              enderecoCompleto={l.enderecoCompleto}
              bairro={l.bairro}
              onClick={() => setSheetId(l.id)}
              size="sm"
            />
            <span className="text-xs text-neutral-400 ml-auto">
              {l.latitude != null ? "🗺" : "📍"} {l.geocodingSource ?? ""}
            </span>
          </div>
        ))}
      </div>

      {total > limit && (
        <div className="flex items-center justify-between mt-4 text-sm">
          <button disabled={offset === 0} onClick={() => setOffset((o) => Math.max(0, o - limit))}
            className="px-3 py-1 border rounded cursor-pointer disabled:opacity-40">← Anterior</button>
          <span className="text-xs text-neutral-500">{offset + 1}—{Math.min(offset + limit, total)} de {total}</span>
          <button disabled={offset + limit >= total} onClick={() => setOffset((o) => o + limit)}
            className="px-3 py-1 border rounded cursor-pointer disabled:opacity-40">Próxima →</button>
        </div>
      )}

      <LugarSheet lugarId={sheetId} open={sheetId !== null} onOpenChange={(o) => !o && setSheetId(null)} />
    </div>
  );
}
```

- [ ] **Step 2: MergePairCardLugar**

Create `src/components/lugares/merge-pair-card-lugar.tsx`:

```tsx
"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { toast } from "sonner";

interface Props {
  aId: number;
  bId: number;
  aEndereco: string;
  bEndereco: string;
  onDone: () => void;
}

export function MergePairCardLugar({ aId, bId, aEndereco, bEndereco, onDone }: Props) {
  const [keepId, setKeepId] = useState(aId);
  const mergeMut = trpc.lugares.merge.useMutation({
    onSuccess: () => { toast.success("Mergeado"); onDone(); },
    onError: (e) => toast.error(e.message),
  });
  const distinctMut = trpc.lugares.markDistinct.useMutation({
    onSuccess: () => { toast.success("Marcado como distinto"); onDone(); },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div className="rounded border px-3 py-2 space-y-2">
      <div className="grid grid-cols-2 gap-2 text-sm">
        <label className="flex items-start gap-2">
          <input type="radio" name={`keep-${aId}-${bId}`} checked={keepId === aId} onChange={() => setKeepId(aId)} />
          <span className={keepId === aId ? "font-medium" : ""}>{aEndereco}</span>
        </label>
        <label className="flex items-start gap-2">
          <input type="radio" name={`keep-${aId}-${bId}`} checked={keepId === bId} onChange={() => setKeepId(bId)} />
          <span className={keepId === bId ? "font-medium" : ""}>{bEndereco}</span>
        </label>
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => mergeMut.mutate({ keepId, mergeId: keepId === aId ? bId : aId })}
          disabled={mergeMut.isPending}
          className="px-2 py-1 rounded border text-xs cursor-pointer hover:border-emerald-400"
        >Mergear</button>
        <button
          onClick={() => distinctMut.mutate({ aId, bId })}
          disabled={distinctMut.isPending}
          className="px-2 py-1 rounded border text-xs cursor-pointer hover:border-neutral-400"
        >São distintos</button>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Merge-queue page**

Create `src/app/(dashboard)/admin/lugares/merge-queue/page.tsx`:

```tsx
"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { MergePairCardLugar } from "@/components/lugares/merge-pair-card-lugar";

export default function MergeQueueLugares() {
  const [offset, setOffset] = useState(0);
  const limit = 20;
  const { data, isLoading, refetch } = trpc.lugares.listDuplicates.useQuery({ limit, offset });

  if (isLoading) return <p className="p-6 italic text-neutral-400">Carregando…</p>;
  const items = data?.items ?? [];

  return (
    <div className="p-6 max-w-4xl">
      <h1 className="text-lg font-semibold mb-4">Merge-queue · Lugares</h1>
      {items.length === 0 ? (
        <p className="italic text-neutral-400">Nenhum par candidato.</p>
      ) : (
        <div className="space-y-2">
          {items.map((p: any) => (
            <MergePairCardLugar
              key={`${p.aId}-${p.bId}`}
              aId={p.aId} bId={p.bId}
              aEndereco={p.aEndereco} bEndereco={p.bEndereco}
              onDone={refetch}
            />
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Typecheck**

```
cd /Users/rodrigorochameire/projetos/Defender && npm run typecheck 2>&1 | tail -30
```

Expected: 0 novos erros.

- [ ] **Step 5: Commit**

```
cd /Users/rodrigorochameire/projetos/Defender
git add 'src/app/(dashboard)/admin/lugares/page.tsx' 'src/app/(dashboard)/admin/lugares/merge-queue/page.tsx' src/components/lugares/merge-pair-card-lugar.tsx
git commit -m "feat(lugares): catálogo /admin/lugares + merge-queue"
```

---

## Task 13: Sidebar link + manual verification

**Files:**
- Modify: `src/components/layouts/admin-sidebar.tsx`

- [ ] **Step 1: Adicionar link em CADASTROS_NAV**

Edite `src/components/layouts/admin-sidebar.tsx`. Encontre `CADASTROS_NAV` (ou similar que lista `Pessoas`). Adicione entrada ANTES ou DEPOIS de Pessoas:

```ts
{ label: "Lugares", path: "/admin/lugares", icon: "MapPin" },
```

Certifique que `MapPin` é importado do `lucide-react` no mesmo arquivo. Se o sidebar usa um mapa de ícones (ex: `ICON_MAP`), adicione `MapPin` lá também.

- [ ] **Step 2: Dev server + checklist**

```
cd /Users/rodrigorochameire/projetos/Defender
rm -rf .next/cache && npm run dev:webpack
```

Checklist browser:
- [ ] `/admin/lugares` abre → tabela populada pelo backfill
- [ ] Filtro search funciona
- [ ] Filtro bairro funciona
- [ ] Filtro "só c/ coord" reduz lista
- [ ] Click em row → `LugarSheet` abre com 4 abas
- [ ] Aba Coordenadas → botão "Geocodar" dispara Nominatim (endereço sem coord recebe lat/lng)
- [ ] `/admin/lugares/[id]` → form edit funciona, salva, recarrega
- [ ] `/admin/lugares/nova` → cria lugar manual
- [ ] `/admin/lugares/merge-queue` → pares candidatos aparecem, merge funciona, markDistinct remove
- [ ] Sidebar mostra link "Lugares" em CADASTROS
- [ ] Re-executar backfill não duplica: `node scripts/backfill-lugares.mjs`

- [ ] **Step 3: Commit**

```
cd /Users/rodrigorochameire/projetos/Defender
git add src/components/layouts/admin-sidebar.tsx
git commit -m "feat(lugares): sidebar link em CADASTROS_NAV"
```

- [ ] **Step 4: Commit de marcação final**

```
git commit --allow-empty -m "chore(lugares): Fase II-A validada manualmente"
```

---

## Self-Review

**Spec coverage:**

| Spec | Tasks |
|---|---|
| Schema 4 tabelas + enum | Task 1 |
| `normalizarEndereco` | Task 3 |
| `isPlaceholderLugar` | Task 2 |
| Geocoder interface + Nominatim + rate-limit | Task 4 |
| CRUD básico + list + getById + audit log | Task 5 |
| Participações + searchForAutocomplete | Task 6 |
| Merge-queue (listDuplicates + merge + markDistinct) | Task 7 |
| Geocode procedure (skip-if-exists, force, fail cache, audit) | Task 8 |
| Backfill 6 fontes idempotente | Task 9 |
| LugarChip + LugarSheet | Task 10 |
| LugarForm + páginas detalhe/nova | Task 11 |
| `/admin/lugares` catálogo + merge-queue | Task 12 |
| Sidebar link + manual verification | Task 13 |

Cobre todos os entregáveis da seção "Entregáveis" da spec.

**Placeholders:** nenhum. Código completo em cada step, comandos exatos, expected outputs especificados.

**Type consistency:**
- `GeocoderInput` / `GeocoderResult` em Task 4 → consumidos em Task 8
- `lugares`, `participacoesLugar`, `lugaresDistinctsConfirmed`, `lugaresAccessLog` schema TS referenciados consistentemente nos routers e tests
- `LugarChipProps` definido em Task 10 → reusado em Task 12 (catálogo)
- `enderecoCompleto`, `enderecoNormalizado` snake↔camel coerente (schema snake, TS camel via drizzle introspect)

**Potencial risco técnico documentado:**
- Task 5 Step 4 nota que se o projeto não mantém schema TS drizzle (só SQL + `db.execute`), o implementador deve adaptar queries ao padrão do router pessoas.
- Task 9 usa `papel='co-reu'` pra resolver agressor (ver `PAPEIS_VALIDOS` em `intel-config.ts`). Se não houver participação registrada, `pessoaId` fica null (melhor esforço, conforme spec).

Plano coerente. 13 tasks, ~13 commits esperados.
