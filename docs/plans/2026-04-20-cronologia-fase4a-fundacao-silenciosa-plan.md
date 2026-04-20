# Cronologia · Fase IV-A · Fundação Silenciosa — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Schema `marcos_processuais` + `prisoes` + `cautelares` + CRUD tRPC + backfill one-shot de `atendimentos.enrichment_data` + aba "Cronologia" silenciosa em `/admin/processos/[id]`. Sem timeline visual, sem flags.

**Architecture:** Camada 2 (atributos estruturados) — três tabelas filhas de `processos` com FK + `ON DELETE CASCADE`. Workspace ACL via join em `processos`. Padrão tRPC idêntico a Pessoas I-A e Lugares II-A. UI: nova aba integrada a `ProcessoTabs`, seguindo padrão da aba "Pessoas" de I-B.

**Tech Stack:** PostgreSQL · Drizzle ORM (SQL hand-written para migrations, schema TS para router) · tRPC · React 19 · Radix UI · Vitest + RTL + happy-dom.

**Spec de referência:** `docs/plans/2026-04-20-cronologia-fase4a-fundacao-silenciosa-design.md`

**Convenções do projeto (estabelecidas nas fases anteriores):**
- `ctx.user.workspaceId ?? 1`, `ctx.user.id`
- Schema TS em `src/lib/db/schema/<modulo>.ts` com barrel em `src/lib/db/schema/index.ts`
- tRPC: `router`, `protectedProcedure` de `"../init"` (router files) ou `"@/lib/trpc/init"` (tests)
- `db` de `@/lib/db`
- appRouter em `src/lib/trpc/routers/index.ts`
- Tabs UI custom (`role="tab"`, não Radix Tabs)
- Apply migrations via temp node script + `rm` após

---

## File Structure

```
drizzle/
└── 0038_cronologia_fundacao.sql                       [new — 3 tables + 4 enums]

src/lib/db/schema/
├── cronologia.ts                                       [new TS module]
└── index.ts                                            [modify: +export from "./cronologia"]

src/lib/cronologia/
├── readers.ts                                          [new — enrichment_data parser]
└── placeholders.ts                                     [new — optional, for date/enum validation]

src/lib/trpc/routers/
├── cronologia.ts                                       [new — 13 procedures]
└── index.ts                                            [modify: +register cronologia]

scripts/
└── backfill-cronologia.mjs                             [new idempotent]

src/app/(dashboard)/admin/processos/[id]/
├── page.tsx                                            [modify: +tab === "cronologia" render]
└── _components/
    ├── cronologia-tab.tsx                              [new]
    ├── marcos-block.tsx                                [new]
    ├── prisoes-block.tsx                               [new]
    ├── cautelares-block.tsx                            [new]
    ├── marco-form.tsx                                  [new inline form]
    ├── prisao-form.tsx                                 [new inline form]
    └── cautelar-form.tsx                               [new inline form]

src/components/processo/processo-tabs.tsx               [modify: +cronologia tab entry]

__tests__/
├── unit/
│   └── cronologia-readers.test.ts                      [new]
├── trpc/
│   └── cronologia-router.test.ts                       [new]
└── components/cronologia/
    ├── marcos-block.test.tsx                           [new]
    └── cronologia-tab.test.tsx                         [new]
```

---

## Task 1: Schema migration

**Files:**
- Create: `drizzle/0038_cronologia_fundacao.sql`

- [ ] **Step 1: Verify next number**

Run: `ls -1 /Users/rodrigorochameire/projetos/Defender/drizzle/*.sql | tail -3`
Expected last: `0037_lugares_fundacao.sql`. Next: **0038**.

- [ ] **Step 2: Create SQL**

Create `drizzle/0038_cronologia_fundacao.sql` with EXACTLY:

```sql
-- Cronologia Processual · Fase IV-A · Camada 2 (atributos estruturados)

-- Enums

DO $$ BEGIN
  CREATE TYPE marco_tipo AS ENUM (
    'fato',
    'apf',
    'audiencia-custodia',
    'denuncia',
    'recebimento-denuncia',
    'resposta-acusacao',
    'aij-designada',
    'aij-realizada',
    'memoriais',
    'sentenca',
    'recurso-interposto',
    'acordao-recurso',
    'transito-julgado',
    'execucao-inicio',
    'outro'
  );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE prisao_tipo AS ENUM (
    'flagrante',
    'temporaria',
    'preventiva',
    'decorrente-sentenca',
    'outro'
  );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE prisao_situacao AS ENUM (
    'ativa',
    'relaxada',
    'revogada',
    'extinta',
    'cumprida',
    'convertida-em-preventiva'
  );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE cautelar_tipo AS ENUM (
    'monitoramento-eletronico',
    'comparecimento-periodico',
    'recolhimento-noturno',
    'proibicao-contato',
    'proibicao-frequentar',
    'afastamento-lar',
    'fianca',
    'suspensao-porte-arma',
    'suspensao-habilitacao',
    'outro'
  );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE cautelar_status AS ENUM (
    'ativa',
    'cumprida',
    'descumprida',
    'revogada',
    'extinta'
  );
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Tables

CREATE TABLE IF NOT EXISTS marcos_processuais (
  id                       serial PRIMARY KEY,
  processo_id              int NOT NULL REFERENCES processos(id) ON DELETE CASCADE,
  tipo                     marco_tipo NOT NULL,
  data                     date NOT NULL,
  documento_referencia     text,
  observacoes              text,
  fonte                    varchar(30) NOT NULL,
  confidence               numeric(3,2) DEFAULT 0.9,
  created_at               timestamptz DEFAULT now(),
  updated_at               timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS marcos_processuais_processo ON marcos_processuais(processo_id);
CREATE INDEX IF NOT EXISTS marcos_processuais_data ON marcos_processuais(data);
CREATE INDEX IF NOT EXISTS marcos_processuais_tipo ON marcos_processuais(tipo);

CREATE TABLE IF NOT EXISTS prisoes (
  id                       serial PRIMARY KEY,
  processo_id              int NOT NULL REFERENCES processos(id) ON DELETE CASCADE,
  pessoa_id                int REFERENCES pessoas(id),
  tipo                     prisao_tipo NOT NULL,
  data_inicio              date NOT NULL,
  data_fim                 date,
  motivo                   text,
  unidade                  varchar(200),
  situacao                 prisao_situacao NOT NULL DEFAULT 'ativa',
  fonte                    varchar(30) NOT NULL,
  confidence               numeric(3,2) DEFAULT 0.9,
  created_at               timestamptz DEFAULT now(),
  updated_at               timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS prisoes_processo ON prisoes(processo_id);
CREATE INDEX IF NOT EXISTS prisoes_pessoa ON prisoes(pessoa_id) WHERE pessoa_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS prisoes_situacao ON prisoes(situacao);

CREATE TABLE IF NOT EXISTS cautelares (
  id                       serial PRIMARY KEY,
  processo_id              int NOT NULL REFERENCES processos(id) ON DELETE CASCADE,
  pessoa_id                int REFERENCES pessoas(id),
  tipo                     cautelar_tipo NOT NULL,
  data_inicio              date NOT NULL,
  data_fim                 date,
  detalhes                 text,
  status                   cautelar_status NOT NULL DEFAULT 'ativa',
  fonte                    varchar(30) NOT NULL,
  confidence               numeric(3,2) DEFAULT 0.9,
  created_at               timestamptz DEFAULT now(),
  updated_at               timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS cautelares_processo ON cautelares(processo_id);
CREATE INDEX IF NOT EXISTS cautelares_pessoa ON cautelares(pessoa_id) WHERE pessoa_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS cautelares_status ON cautelares(status);
```

- [ ] **Step 3: Apply migration**

Create temp `/Users/rodrigorochameire/projetos/Defender/apply-cronologia.mjs`:

```js
import { readFileSync } from "node:fs";
import postgres from "postgres";
import * as dotenv from "dotenv";
dotenv.config({ path: "/Users/rodrigorochameire/projetos/Defender/.env.local" });

const sql = postgres(process.env.DATABASE_URL, { max: 1 });
const content = readFileSync(process.argv[2], "utf-8");

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

const check = await sql`
  SELECT COUNT(*)::int AS n
  FROM information_schema.tables
  WHERE table_name IN ('marcos_processuais','prisoes','cautelares')
`;
console.log("tables:", check[0].n, "(expected 3)");

const enums = await sql`
  SELECT COUNT(*)::int AS n FROM pg_type
  WHERE typname IN ('marco_tipo','prisao_tipo','prisao_situacao','cautelar_tipo','cautelar_status')
`;
console.log("enums:", enums[0].n, "(expected 5)");

await sql.end();
```

Run:
```
cd /Users/rodrigorochameire/projetos/Defender && node apply-cronologia.mjs drizzle/0038_cronologia_fundacao.sql
```

Expected: `tables: 3 (expected 3)` + `enums: 5 (expected 5)`.

Delete: `rm /Users/rodrigorochameire/projetos/Defender/apply-cronologia.mjs`

- [ ] **Step 4: Commit**

```
cd /Users/rodrigorochameire/projetos/Defender
git add drizzle/0038_cronologia_fundacao.sql
git commit -m "feat(cronologia): schema IV-A — marcos, prisoes, cautelares"
```

---

## Task 2: Schema TS Drizzle

**Files:**
- Create: `src/lib/db/schema/cronologia.ts`
- Modify: `src/lib/db/schema/index.ts`

- [ ] **Step 1: Create TS schema**

Create `src/lib/db/schema/cronologia.ts`:

```ts
import { pgTable, pgEnum, serial, integer, varchar, text, numeric, date, timestamp } from "drizzle-orm/pg-core";
import { processos } from "./core";
import { pessoas } from "./pessoas";

export const marcoTipoEnum = pgEnum("marco_tipo", [
  "fato", "apf", "audiencia-custodia", "denuncia", "recebimento-denuncia",
  "resposta-acusacao", "aij-designada", "aij-realizada", "memoriais",
  "sentenca", "recurso-interposto", "acordao-recurso", "transito-julgado",
  "execucao-inicio", "outro",
]);

export const prisaoTipoEnum = pgEnum("prisao_tipo", [
  "flagrante", "temporaria", "preventiva", "decorrente-sentenca", "outro",
]);

export const prisaoSituacaoEnum = pgEnum("prisao_situacao", [
  "ativa", "relaxada", "revogada", "extinta", "cumprida", "convertida-em-preventiva",
]);

export const cautelarTipoEnum = pgEnum("cautelar_tipo", [
  "monitoramento-eletronico", "comparecimento-periodico", "recolhimento-noturno",
  "proibicao-contato", "proibicao-frequentar", "afastamento-lar", "fianca",
  "suspensao-porte-arma", "suspensao-habilitacao", "outro",
]);

export const cautelarStatusEnum = pgEnum("cautelar_status", [
  "ativa", "cumprida", "descumprida", "revogada", "extinta",
]);

export const marcosProcessuais = pgTable("marcos_processuais", {
  id: serial("id").primaryKey(),
  processoId: integer("processo_id").notNull().references(() => processos.id, { onDelete: "cascade" }),
  tipo: marcoTipoEnum("tipo").notNull(),
  data: date("data").notNull(),
  documentoReferencia: text("documento_referencia"),
  observacoes: text("observacoes"),
  fonte: varchar("fonte", { length: 30 }).notNull(),
  confidence: numeric("confidence", { precision: 3, scale: 2 }).default("0.9"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const prisoes = pgTable("prisoes", {
  id: serial("id").primaryKey(),
  processoId: integer("processo_id").notNull().references(() => processos.id, { onDelete: "cascade" }),
  pessoaId: integer("pessoa_id").references(() => pessoas.id),
  tipo: prisaoTipoEnum("tipo").notNull(),
  dataInicio: date("data_inicio").notNull(),
  dataFim: date("data_fim"),
  motivo: text("motivo"),
  unidade: varchar("unidade", { length: 200 }),
  situacao: prisaoSituacaoEnum("situacao").notNull().default("ativa"),
  fonte: varchar("fonte", { length: 30 }).notNull(),
  confidence: numeric("confidence", { precision: 3, scale: 2 }).default("0.9"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const cautelares = pgTable("cautelares", {
  id: serial("id").primaryKey(),
  processoId: integer("processo_id").notNull().references(() => processos.id, { onDelete: "cascade" }),
  pessoaId: integer("pessoa_id").references(() => pessoas.id),
  tipo: cautelarTipoEnum("tipo").notNull(),
  dataInicio: date("data_inicio").notNull(),
  dataFim: date("data_fim"),
  detalhes: text("detalhes"),
  status: cautelarStatusEnum("status").notNull().default("ativa"),
  fonte: varchar("fonte", { length: 30 }).notNull(),
  confidence: numeric("confidence", { precision: 3, scale: 2 }).default("0.9"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});
```

**Nota:** ajuste os imports de `processos` e `pessoas` caminhando os módulos do schema conforme existam. Se `processos` vive em `./core` e `pessoas` em `./pessoas`, use esses paths. Se estão em outros módulos, inspect `src/lib/db/schema/index.ts` antes.

- [ ] **Step 2: Add to barrel**

Abrir `src/lib/db/schema/index.ts` e adicionar:

```ts
export * from "./cronologia";
```

- [ ] **Step 3: Typecheck**

```
cd /Users/rodrigorochameire/projetos/Defender && npm run typecheck 2>&1 | tail -20
```

Expected: 0 novos erros.

- [ ] **Step 4: Commit**

```
cd /Users/rodrigorochameire/projetos/Defender
git add src/lib/db/schema/cronologia.ts src/lib/db/schema/index.ts
git commit -m "feat(cronologia): schema TS Drizzle"
```

---

## Task 3: `readers.ts` — enrichment_data parsers (TDD)

**Files:**
- Create: `src/lib/cronologia/readers.ts`
- Create: `__tests__/unit/cronologia-readers.test.ts`

- [ ] **Step 1: Write failing test**

Create `__tests__/unit/cronologia-readers.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { readMarcos, readPrisoes, readCautelares, parseDateTolerant } from "@/lib/cronologia/readers";

describe("parseDateTolerant", () => {
  it("aceita ISO", () => {
    expect(parseDateTolerant("2025-03-15")).toBe("2025-03-15");
  });
  it("aceita BR DD/MM/YYYY", () => {
    expect(parseDateTolerant("15/03/2025")).toBe("2025-03-15");
  });
  it("aceita BR DD-MM-YYYY", () => {
    expect(parseDateTolerant("15-03-2025")).toBe("2025-03-15");
  });
  it("retorna null pra data inválida", () => {
    expect(parseDateTolerant("abc")).toBeNull();
    expect(parseDateTolerant("")).toBeNull();
    expect(parseDateTolerant(null as any)).toBeNull();
  });
});

describe("readMarcos", () => {
  it("lê array enrichment_data.cronologia[]", () => {
    const ed = {
      cronologia: [
        { tipo: "fato", data: "2025-01-15" },
        { tipo: "denuncia", data: "15/05/2025" },
      ],
    };
    const out = readMarcos(ed);
    expect(out).toHaveLength(2);
    expect(out[0].tipo).toBe("fato");
    expect(out[0].data).toBe("2025-01-15");
    expect(out[1].tipo).toBe("denuncia");
    expect(out[1].data).toBe("2025-05-15");
  });

  it("lê campos esparsos", () => {
    const ed = { data_fato: "2025-01-15", data_denuncia: "2025-05-15" };
    const out = readMarcos(ed);
    const tipos = out.map((m) => m.tipo);
    expect(tipos).toContain("fato");
    expect(tipos).toContain("denuncia");
  });

  it("skip data inválida", () => {
    const ed = { cronologia: [{ tipo: "fato", data: "bogus" }] };
    const out = readMarcos(ed);
    expect(out).toHaveLength(0);
  });

  it("skip enum inválido", () => {
    const ed = { cronologia: [{ tipo: "pancake", data: "2025-01-01" }] };
    const out = readMarcos(ed);
    expect(out).toHaveLength(0);
  });

  it("retorna vazio quando enrichment_data vazio", () => {
    expect(readMarcos({})).toEqual([]);
    expect(readMarcos(null as any)).toEqual([]);
  });
});

describe("readPrisoes", () => {
  it("lê array prisoes[]", () => {
    const ed = {
      prisoes: [
        { tipo: "preventiva", data_inicio: "2025-03-20", situacao: "ativa" },
      ],
    };
    const out = readPrisoes(ed);
    expect(out).toHaveLength(1);
    expect(out[0].tipo).toBe("preventiva");
  });

  it("lê campos esparsos: esta_preso + data_prisao → preventiva", () => {
    const ed = { esta_preso: true, data_prisao: "2025-03-20" };
    const out = readPrisoes(ed);
    expect(out).toHaveLength(1);
    expect(out[0].tipo).toBe("preventiva");
    expect(out[0].situacao).toBe("ativa");
  });

  it("esta_preso=false não gera prisão", () => {
    const ed = { esta_preso: false, data_prisao: "2025-03-20" };
    expect(readPrisoes(ed)).toEqual([]);
  });
});

describe("readCautelares", () => {
  it("lê array cautelares[]", () => {
    const ed = {
      cautelares: [
        { tipo: "monitoramento-eletronico", data_inicio: "2025-04-01", status: "ativa" },
      ],
    };
    const out = readCautelares(ed);
    expect(out).toHaveLength(1);
    expect(out[0].tipo).toBe("monitoramento-eletronico");
  });

  it("tem_tornozeleira → monitoramento-eletronico ativa", () => {
    const ed = { tem_tornozeleira: true, data_tornozeleira: "2025-04-01" };
    const out = readCautelares(ed);
    expect(out).toHaveLength(1);
    expect(out[0].tipo).toBe("monitoramento-eletronico");
  });

  it("mpu_ativa → proibicao-contato", () => {
    const ed = { mpu_ativa: true, data_mpu: "2025-02-10" };
    const out = readCautelares(ed);
    expect(out).toHaveLength(1);
    expect(out[0].tipo).toBe("proibicao-contato");
  });
});
```

- [ ] **Step 2: Run FAIL**

Run: `cd /Users/rodrigorochameire/projetos/Defender && npm run test __tests__/unit/cronologia-readers.test.ts 2>&1 | tail -20`

- [ ] **Step 3: Implement**

Create `src/lib/cronologia/readers.ts`:

```ts
const MARCO_TIPOS = new Set([
  "fato","apf","audiencia-custodia","denuncia","recebimento-denuncia",
  "resposta-acusacao","aij-designada","aij-realizada","memoriais",
  "sentenca","recurso-interposto","acordao-recurso","transito-julgado",
  "execucao-inicio","outro",
]);
const PRISAO_TIPOS = new Set(["flagrante","temporaria","preventiva","decorrente-sentenca","outro"]);
const PRISAO_SITUACOES = new Set(["ativa","relaxada","revogada","extinta","cumprida","convertida-em-preventiva"]);
const CAUTELAR_TIPOS = new Set([
  "monitoramento-eletronico","comparecimento-periodico","recolhimento-noturno",
  "proibicao-contato","proibicao-frequentar","afastamento-lar","fianca",
  "suspensao-porte-arma","suspensao-habilitacao","outro",
]);
const CAUTELAR_STATUSES = new Set(["ativa","cumprida","descumprida","revogada","extinta"]);

export function parseDateTolerant(raw: unknown): string | null {
  if (!raw) return null;
  const s = String(raw).trim();
  if (!s) return null;
  // ISO YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    const d = new Date(s);
    if (!isNaN(d.getTime())) return s.slice(0, 10);
  }
  // BR DD/MM/YYYY or DD-MM-YYYY
  const br = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
  if (br) {
    const [, dd, mm, yyyy] = br;
    const iso = `${yyyy}-${mm.padStart(2,"0")}-${dd.padStart(2,"0")}`;
    const d = new Date(iso);
    if (!isNaN(d.getTime())) return iso;
  }
  return null;
}

export interface MarcoRead {
  tipo: string;
  data: string;
  documentoReferencia?: string | null;
  observacoes?: string | null;
}

const SPARSE_MARCO_FIELDS: Array<[string[], string]> = [
  [["data_fato", "dataFato", "fato_data"], "fato"],
  [["data_apf", "data_flagrante"], "apf"],
  [["data_audiencia_custodia"], "audiencia-custodia"],
  [["data_denuncia", "dataDenuncia"], "denuncia"],
  [["data_recebimento_denuncia"], "recebimento-denuncia"],
  [["data_resposta_acusacao"], "resposta-acusacao"],
  [["data_aij", "data_audiencia_instrucao"], "aij-designada"],
  [["data_memoriais"], "memoriais"],
  [["data_sentenca", "dataSentenca"], "sentenca"],
  [["data_acordao"], "acordao-recurso"],
  [["data_transito_julgado", "dataTransito"], "transito-julgado"],
];

export function readMarcos(ed: Record<string, any> | null | undefined): MarcoRead[] {
  if (!ed || typeof ed !== "object") return [];
  const out: MarcoRead[] = [];

  const arr = ed.cronologia ?? ed.linha_tempo ?? ed.marcos ?? ed.timeline;
  if (Array.isArray(arr)) {
    for (const m of arr) {
      if (!m || typeof m !== "object") continue;
      const tipo = String(m.tipo ?? "").trim();
      const data = parseDateTolerant(m.data);
      if (!MARCO_TIPOS.has(tipo) || !data) continue;
      out.push({
        tipo, data,
        documentoReferencia: m.documento_referencia ?? m.documentoReferencia ?? null,
        observacoes: m.observacoes ?? null,
      });
    }
  }

  for (const [fields, tipo] of SPARSE_MARCO_FIELDS) {
    for (const f of fields) {
      if (ed[f]) {
        const data = parseDateTolerant(ed[f]);
        if (data) {
          const exists = out.some((m) => m.tipo === tipo && m.data === data);
          if (!exists) out.push({ tipo, data });
        }
      }
    }
  }

  return out;
}

export interface PrisaoRead {
  tipo: string;
  dataInicio: string;
  dataFim?: string | null;
  motivo?: string | null;
  unidade?: string | null;
  situacao: string;
}

export function readPrisoes(ed: Record<string, any> | null | undefined): PrisaoRead[] {
  if (!ed || typeof ed !== "object") return [];
  const out: PrisaoRead[] = [];

  const arr = ed.prisoes;
  if (Array.isArray(arr)) {
    for (const p of arr) {
      if (!p || typeof p !== "object") continue;
      const tipo = String(p.tipo ?? "").trim();
      const dataInicio = parseDateTolerant(p.data_inicio ?? p.dataInicio);
      const situacao = String(p.situacao ?? "ativa");
      if (!PRISAO_TIPOS.has(tipo) || !dataInicio) continue;
      if (!PRISAO_SITUACOES.has(situacao)) continue;
      out.push({
        tipo, dataInicio, situacao,
        dataFim: parseDateTolerant(p.data_fim ?? p.dataFim) ?? null,
        motivo: p.motivo ?? null,
        unidade: p.unidade ?? null,
      });
    }
  }

  // esparsos
  if (ed.esta_preso === true) {
    const data = parseDateTolerant(ed.data_prisao ?? ed.data_prisao_preventiva);
    if (data && !out.some((p) => p.dataInicio === data)) {
      out.push({ tipo: "preventiva", dataInicio: data, situacao: "ativa" });
    }
  }
  if (ed.data_flagrante) {
    const ini = parseDateTolerant(ed.data_flagrante);
    const fim = parseDateTolerant(ed.data_soltura);
    if (ini && !out.some((p) => p.tipo === "flagrante" && p.dataInicio === ini)) {
      out.push({ tipo: "flagrante", dataInicio: ini, dataFim: fim, situacao: fim ? "relaxada" : "ativa" });
    }
  }

  return out;
}

export interface CautelarRead {
  tipo: string;
  dataInicio: string;
  dataFim?: string | null;
  detalhes?: string | null;
  status: string;
}

export function readCautelares(ed: Record<string, any> | null | undefined): CautelarRead[] {
  if (!ed || typeof ed !== "object") return [];
  const out: CautelarRead[] = [];

  const arr = ed.cautelares ?? ed.medidas_cautelares;
  if (Array.isArray(arr)) {
    for (const c of arr) {
      if (!c || typeof c !== "object") continue;
      const tipo = String(c.tipo ?? "").trim();
      const dataInicio = parseDateTolerant(c.data_inicio ?? c.dataInicio);
      const status = String(c.status ?? "ativa");
      if (!CAUTELAR_TIPOS.has(tipo) || !dataInicio) continue;
      if (!CAUTELAR_STATUSES.has(status)) continue;
      out.push({
        tipo, dataInicio, status,
        dataFim: parseDateTolerant(c.data_fim ?? c.dataFim) ?? null,
        detalhes: c.detalhes ?? null,
      });
    }
  }

  if (ed.tem_tornozeleira === true) {
    const data = parseDateTolerant(ed.data_tornozeleira) ?? parseDateTolerant(ed.data_inicio_tornozeleira);
    if (data && !out.some((c) => c.tipo === "monitoramento-eletronico" && c.dataInicio === data)) {
      out.push({ tipo: "monitoramento-eletronico", dataInicio: data, status: "ativa" });
    } else if (ed.tem_tornozeleira && !data) {
      // sem data → usar hoje como fallback conservador? Spec pede skip.
    }
  }

  if (ed.mpu_ativa === true || ed.medida_protetiva_ativa === true) {
    const data = parseDateTolerant(ed.data_mpu) ?? parseDateTolerant(ed.data_medida_protetiva);
    if (data && !out.some((c) => c.tipo === "proibicao-contato" && c.dataInicio === data)) {
      out.push({ tipo: "proibicao-contato", dataInicio: data, status: "ativa" });
    }
  }

  if (ed.afastamento_lar_ativo === true) {
    const data = parseDateTolerant(ed.data_afastamento_lar);
    if (data && !out.some((c) => c.tipo === "afastamento-lar" && c.dataInicio === data)) {
      out.push({ tipo: "afastamento-lar", dataInicio: data, status: "ativa" });
    }
  }

  if (ed.fianca_paga === true) {
    const data = parseDateTolerant(ed.data_fianca);
    if (data && !out.some((c) => c.tipo === "fianca" && c.dataInicio === data)) {
      out.push({ tipo: "fianca", dataInicio: data, status: "cumprida" });
    }
  }

  return out;
}
```

- [ ] **Step 4: Run PASS**

Expected: ~14 testes passam.

- [ ] **Step 5: Commit**

```
cd /Users/rodrigorochameire/projetos/Defender
git add src/lib/cronologia/readers.ts __tests__/unit/cronologia-readers.test.ts
git commit -m "feat(cronologia): parsers enrichment_data → marcos/prisoes/cautelares"
```

---

## Task 4: tRPC router — Marcos CRUD (TDD)

**Files:**
- Create: `src/lib/trpc/routers/cronologia.ts`
- Modify: `src/lib/trpc/routers/index.ts`
- Create: `__tests__/trpc/cronologia-router.test.ts`

- [ ] **Step 1: Inspect project patterns**

Run to understand test helper structure:

```
head -40 /Users/rodrigorochameire/projetos/Defender/__tests__/trpc/lugares-router.test.ts
grep -n "export const appRouter\|lugares:" /Users/rodrigorochameire/projetos/Defender/src/lib/trpc/routers/index.ts
grep -n "^import\|router\|protectedProcedure" /Users/rodrigorochameire/projetos/Defender/src/lib/trpc/routers/lugares.ts | head -15
```

Note exact imports, helpers, context patterns.

- [ ] **Step 2: Write failing tests for Marcos**

Create `__tests__/trpc/cronologia-router.test.ts`:

```ts
// Copiar padrão exato de __tests__/trpc/lugares-router.test.ts
import { describe, it, expect } from "vitest";
import { db } from "@/lib/db";
import { eq } from "drizzle-orm";
import { marcosProcessuais, prisoes, cautelares, processos, users } from "@/lib/db/schema";
// importe também os helpers createCaller, makeUser, mkCtx seguindo lugares-router.test.ts

describe("cronologia.marcos CRUD", { timeout: 30000 }, () => {
  it("createMarco + listMarcos", async () => {
    const user = await makeUser();
    try {
      const caller = createCaller(mkCtx(user));
      // Precisa de processo do workspace do user. Se helper makeUser cria workspace +
      // helper makeProcesso(user) existe, use. Senão, insert direto:
      const [proc] = await db.insert(processos).values({
        workspaceId: user.workspaceId ?? 1,
        numero: `TEST-${Date.now()}`,
      }).returning({ id: processos.id });

      try {
        const created = await caller.cronologia.createMarco({
          processoId: proc.id,
          tipo: "fato",
          data: "2025-01-15",
          observacoes: "teste",
        });
        expect(created.id).toBeGreaterThan(0);

        const lista = await caller.cronologia.listMarcos({ processoId: proc.id });
        expect(lista).toHaveLength(1);
        expect(lista[0].tipo).toBe("fato");

        await caller.cronologia.deleteMarco({ id: created.id });
        const listaAfter = await caller.cronologia.listMarcos({ processoId: proc.id });
        expect(listaAfter).toHaveLength(0);
      } finally {
        await db.delete(marcosProcessuais).where(eq(marcosProcessuais.processoId, proc.id));
        await db.delete(processos).where(eq(processos.id, proc.id));
      }
    } finally {
      await db.delete(users).where(eq(users.id, user.id));
    }
  });

  it("updateMarco", async () => {
    const user = await makeUser();
    try {
      const caller = createCaller(mkCtx(user));
      const [proc] = await db.insert(processos).values({
        workspaceId: user.workspaceId ?? 1, numero: `TEST-${Date.now()}`,
      }).returning({ id: processos.id });
      try {
        const { id } = await caller.cronologia.createMarco({
          processoId: proc.id, tipo: "fato", data: "2025-01-15",
        });
        await caller.cronologia.updateMarco({ id, patch: { tipo: "denuncia", data: "2025-02-20" } });
        const lista = await caller.cronologia.listMarcos({ processoId: proc.id });
        expect(lista[0].tipo).toBe("denuncia");
        expect(lista[0].data).toBe("2025-02-20");
        await db.delete(marcosProcessuais).where(eq(marcosProcessuais.id, id));
      } finally {
        await db.delete(processos).where(eq(processos.id, proc.id));
      }
    } finally {
      await db.delete(users).where(eq(users.id, user.id));
    }
  });

  it("ACL: processo de outro workspace rejeita createMarco", async () => {
    const user = await makeUser();
    try {
      const caller = createCaller(mkCtx(user));
      const [proc] = await db.insert(processos).values({
        workspaceId: 999999, // workspace diferente
        numero: `TEST-other-${Date.now()}`,
      }).returning({ id: processos.id });
      try {
        await expect(
          caller.cronologia.createMarco({ processoId: proc.id, tipo: "fato", data: "2025-01-15" })
        ).rejects.toThrow();
      } finally {
        await db.delete(processos).where(eq(processos.id, proc.id));
      }
    } finally {
      await db.delete(users).where(eq(users.id, user.id));
    }
  });
});
```

- [ ] **Step 3: Run FAIL**

- [ ] **Step 4: Create router with Marcos procedures**

Create `src/lib/trpc/routers/cronologia.ts`:

```ts
import { z } from "zod";
import { router, protectedProcedure } from "../init";
import { db } from "@/lib/db";
import {
  marcosProcessuais, prisoes, cautelares, processos,
} from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";

const MARCO_TIPO = z.enum([
  "fato","apf","audiencia-custodia","denuncia","recebimento-denuncia",
  "resposta-acusacao","aij-designada","aij-realizada","memoriais",
  "sentenca","recurso-interposto","acordao-recurso","transito-julgado",
  "execucao-inicio","outro",
]);

async function assertProcessoInWorkspace(processoId: number, workspaceId: number) {
  const [row] = await db.select({ id: processos.id })
    .from(processos)
    .where(and(eq(processos.id, processoId), eq(processos.workspaceId, workspaceId)))
    .limit(1);
  if (!row) throw new Error("Processo não encontrado");
}

async function assertMarcoInWorkspace(marcoId: number, workspaceId: number) {
  const [row] = await db.select({ id: marcosProcessuais.id, processoId: marcosProcessuais.processoId })
    .from(marcosProcessuais)
    .innerJoin(processos, eq(processos.id, marcosProcessuais.processoId))
    .where(and(eq(marcosProcessuais.id, marcoId), eq(processos.workspaceId, workspaceId)))
    .limit(1);
  if (!row) throw new Error("Marco não encontrado");
  return row;
}

export const cronologiaRouter = router({
  listMarcos: protectedProcedure
    .input(z.object({ processoId: z.number() }))
    .query(async ({ input, ctx }) => {
      await assertProcessoInWorkspace(input.processoId, ctx.user.workspaceId ?? 1);
      return await db.select().from(marcosProcessuais)
        .where(eq(marcosProcessuais.processoId, input.processoId))
        .orderBy(marcosProcessuais.data);
    }),

  createMarco: protectedProcedure
    .input(z.object({
      processoId: z.number(),
      tipo: MARCO_TIPO,
      data: z.string(),
      documentoReferencia: z.string().optional().nullable(),
      observacoes: z.string().optional().nullable(),
    }))
    .mutation(async ({ input, ctx }) => {
      await assertProcessoInWorkspace(input.processoId, ctx.user.workspaceId ?? 1);
      const [row] = await db.insert(marcosProcessuais).values({
        processoId: input.processoId,
        tipo: input.tipo,
        data: input.data,
        documentoReferencia: input.documentoReferencia ?? null,
        observacoes: input.observacoes ?? null,
        fonte: "manual",
      }).returning({ id: marcosProcessuais.id });
      return { id: row.id };
    }),

  updateMarco: protectedProcedure
    .input(z.object({
      id: z.number(),
      patch: z.object({
        tipo: MARCO_TIPO.optional(),
        data: z.string().optional(),
        documentoReferencia: z.string().optional().nullable(),
        observacoes: z.string().optional().nullable(),
      }),
    }))
    .mutation(async ({ input, ctx }) => {
      await assertMarcoInWorkspace(input.id, ctx.user.workspaceId ?? 1);
      await db.update(marcosProcessuais)
        .set({
          ...(input.patch.tipo !== undefined && { tipo: input.patch.tipo }),
          ...(input.patch.data !== undefined && { data: input.patch.data }),
          ...(input.patch.documentoReferencia !== undefined && { documentoReferencia: input.patch.documentoReferencia }),
          ...(input.patch.observacoes !== undefined && { observacoes: input.patch.observacoes }),
          updatedAt: new Date(),
        })
        .where(eq(marcosProcessuais.id, input.id));
      return { id: input.id, updated: true };
    }),

  deleteMarco: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      await assertMarcoInWorkspace(input.id, ctx.user.workspaceId ?? 1);
      await db.delete(marcosProcessuais).where(eq(marcosProcessuais.id, input.id));
      return { deleted: true };
    }),
});
```

- [ ] **Step 5: Register in appRouter**

Edit `src/lib/trpc/routers/index.ts`:

```ts
import { cronologiaRouter } from "./cronologia";

export const appRouter = router({
  // ... existentes ...
  cronologia: cronologiaRouter,
});
```

- [ ] **Step 6: Run tests PASS**

Expected: 3 tests pass.

- [ ] **Step 7: Commit**

```
cd /Users/rodrigorochameire/projetos/Defender
git add src/lib/trpc/routers/cronologia.ts src/lib/trpc/routers/index.ts __tests__/trpc/cronologia-router.test.ts
git commit -m "feat(cronologia): tRPC router Marcos CRUD + registro"
```

---

## Task 5: tRPC — Prisões CRUD

**Files:**
- Modify: `src/lib/trpc/routers/cronologia.ts`
- Modify: `__tests__/trpc/cronologia-router.test.ts`

- [ ] **Step 1: Append failing tests**

Add ao final do test file:

```ts
describe("cronologia.prisoes CRUD", { timeout: 30000 }, () => {
  it("createPrisao + listPrisoes + update + delete", async () => {
    const user = await makeUser();
    try {
      const caller = createCaller(mkCtx(user));
      const [proc] = await db.insert(processos).values({
        workspaceId: user.workspaceId ?? 1, numero: `TEST-${Date.now()}`,
      }).returning({ id: processos.id });
      try {
        const { id } = await caller.cronologia.createPrisao({
          processoId: proc.id, tipo: "preventiva", dataInicio: "2025-03-20", situacao: "ativa",
        });
        const lista = await caller.cronologia.listPrisoes({ processoId: proc.id });
        expect(lista).toHaveLength(1);
        expect(lista[0].tipo).toBe("preventiva");
        expect(lista[0].situacao).toBe("ativa");

        await caller.cronologia.updatePrisao({ id, patch: { situacao: "relaxada", dataFim: "2025-06-10" } });
        const after = await caller.cronologia.listPrisoes({ processoId: proc.id });
        expect(after[0].situacao).toBe("relaxada");
        expect(after[0].dataFim).toBe("2025-06-10");

        await caller.cronologia.deletePrisao({ id });
        expect((await caller.cronologia.listPrisoes({ processoId: proc.id })).length).toBe(0);
      } finally {
        await db.delete(prisoes).where(eq(prisoes.processoId, proc.id));
        await db.delete(processos).where(eq(processos.id, proc.id));
      }
    } finally {
      await db.delete(users).where(eq(users.id, user.id));
    }
  });
});
```

- [ ] **Step 2: Run FAIL**

- [ ] **Step 3: Add procedures to router**

Em `src/lib/trpc/routers/cronologia.ts`, adicionar dentro de `router({...})`:

```ts
  listPrisoes: protectedProcedure
    .input(z.object({ processoId: z.number() }))
    .query(async ({ input, ctx }) => {
      await assertProcessoInWorkspace(input.processoId, ctx.user.workspaceId ?? 1);
      return await db.select().from(prisoes)
        .where(eq(prisoes.processoId, input.processoId))
        .orderBy(desc(prisoes.dataInicio));
    }),

  createPrisao: protectedProcedure
    .input(z.object({
      processoId: z.number(),
      pessoaId: z.number().nullable().optional(),
      tipo: z.enum(["flagrante","temporaria","preventiva","decorrente-sentenca","outro"]),
      dataInicio: z.string(),
      dataFim: z.string().nullable().optional(),
      motivo: z.string().nullable().optional(),
      unidade: z.string().nullable().optional(),
      situacao: z.enum(["ativa","relaxada","revogada","extinta","cumprida","convertida-em-preventiva"]).default("ativa"),
    }))
    .mutation(async ({ input, ctx }) => {
      await assertProcessoInWorkspace(input.processoId, ctx.user.workspaceId ?? 1);
      const [row] = await db.insert(prisoes).values({
        processoId: input.processoId,
        pessoaId: input.pessoaId ?? null,
        tipo: input.tipo,
        dataInicio: input.dataInicio,
        dataFim: input.dataFim ?? null,
        motivo: input.motivo ?? null,
        unidade: input.unidade ?? null,
        situacao: input.situacao,
        fonte: "manual",
      }).returning({ id: prisoes.id });
      return { id: row.id };
    }),

  updatePrisao: protectedProcedure
    .input(z.object({
      id: z.number(),
      patch: z.object({
        tipo: z.enum(["flagrante","temporaria","preventiva","decorrente-sentenca","outro"]).optional(),
        dataInicio: z.string().optional(),
        dataFim: z.string().nullable().optional(),
        motivo: z.string().nullable().optional(),
        unidade: z.string().nullable().optional(),
        situacao: z.enum(["ativa","relaxada","revogada","extinta","cumprida","convertida-em-preventiva"]).optional(),
        pessoaId: z.number().nullable().optional(),
      }),
    }))
    .mutation(async ({ input, ctx }) => {
      const workspaceId = ctx.user.workspaceId ?? 1;
      const [row] = await db.select({ id: prisoes.id })
        .from(prisoes)
        .innerJoin(processos, eq(processos.id, prisoes.processoId))
        .where(and(eq(prisoes.id, input.id), eq(processos.workspaceId, workspaceId)))
        .limit(1);
      if (!row) throw new Error("Prisão não encontrada");
      await db.update(prisoes).set({
        ...(input.patch.tipo !== undefined && { tipo: input.patch.tipo }),
        ...(input.patch.dataInicio !== undefined && { dataInicio: input.patch.dataInicio }),
        ...(input.patch.dataFim !== undefined && { dataFim: input.patch.dataFim }),
        ...(input.patch.motivo !== undefined && { motivo: input.patch.motivo }),
        ...(input.patch.unidade !== undefined && { unidade: input.patch.unidade }),
        ...(input.patch.situacao !== undefined && { situacao: input.patch.situacao }),
        ...(input.patch.pessoaId !== undefined && { pessoaId: input.patch.pessoaId }),
        updatedAt: new Date(),
      }).where(eq(prisoes.id, input.id));
      return { id: input.id, updated: true };
    }),

  deletePrisao: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const workspaceId = ctx.user.workspaceId ?? 1;
      const [row] = await db.select({ id: prisoes.id })
        .from(prisoes)
        .innerJoin(processos, eq(processos.id, prisoes.processoId))
        .where(and(eq(prisoes.id, input.id), eq(processos.workspaceId, workspaceId)))
        .limit(1);
      if (!row) throw new Error("Prisão não encontrada");
      await db.delete(prisoes).where(eq(prisoes.id, input.id));
      return { deleted: true };
    }),
```

- [ ] **Step 4: Run PASS**

- [ ] **Step 5: Commit**

```
cd /Users/rodrigorochameire/projetos/Defender
git add src/lib/trpc/routers/cronologia.ts __tests__/trpc/cronologia-router.test.ts
git commit -m "feat(cronologia): tRPC router Prisoes CRUD"
```

---

## Task 6: tRPC — Cautelares CRUD

**Files:**
- Modify: `src/lib/trpc/routers/cronologia.ts`
- Modify: `__tests__/trpc/cronologia-router.test.ts`

- [ ] **Step 1: Append failing test**

```ts
describe("cronologia.cautelares CRUD", { timeout: 30000 }, () => {
  it("create + list + update + delete", async () => {
    const user = await makeUser();
    try {
      const caller = createCaller(mkCtx(user));
      const [proc] = await db.insert(processos).values({
        workspaceId: user.workspaceId ?? 1, numero: `TEST-${Date.now()}`,
      }).returning({ id: processos.id });
      try {
        const { id } = await caller.cronologia.createCautelar({
          processoId: proc.id, tipo: "monitoramento-eletronico", dataInicio: "2025-04-01", status: "ativa",
        });
        const lista = await caller.cronologia.listCautelares({ processoId: proc.id });
        expect(lista).toHaveLength(1);
        expect(lista[0].tipo).toBe("monitoramento-eletronico");

        await caller.cronologia.updateCautelar({ id, patch: { status: "descumprida" } });
        expect((await caller.cronologia.listCautelares({ processoId: proc.id }))[0].status).toBe("descumprida");

        await caller.cronologia.deleteCautelar({ id });
        expect((await caller.cronologia.listCautelares({ processoId: proc.id })).length).toBe(0);
      } finally {
        await db.delete(cautelares).where(eq(cautelares.processoId, proc.id));
        await db.delete(processos).where(eq(processos.id, proc.id));
      }
    } finally {
      await db.delete(users).where(eq(users.id, user.id));
    }
  });
});
```

- [ ] **Step 2: Run FAIL**

- [ ] **Step 3: Add procedures**

Em `cronologia.ts`, adicionar:

```ts
  listCautelares: protectedProcedure
    .input(z.object({ processoId: z.number() }))
    .query(async ({ input, ctx }) => {
      await assertProcessoInWorkspace(input.processoId, ctx.user.workspaceId ?? 1);
      return await db.select().from(cautelares)
        .where(eq(cautelares.processoId, input.processoId))
        .orderBy(desc(cautelares.dataInicio));
    }),

  createCautelar: protectedProcedure
    .input(z.object({
      processoId: z.number(),
      pessoaId: z.number().nullable().optional(),
      tipo: z.enum([
        "monitoramento-eletronico","comparecimento-periodico","recolhimento-noturno",
        "proibicao-contato","proibicao-frequentar","afastamento-lar","fianca",
        "suspensao-porte-arma","suspensao-habilitacao","outro",
      ]),
      dataInicio: z.string(),
      dataFim: z.string().nullable().optional(),
      detalhes: z.string().nullable().optional(),
      status: z.enum(["ativa","cumprida","descumprida","revogada","extinta"]).default("ativa"),
    }))
    .mutation(async ({ input, ctx }) => {
      await assertProcessoInWorkspace(input.processoId, ctx.user.workspaceId ?? 1);
      const [row] = await db.insert(cautelares).values({
        processoId: input.processoId,
        pessoaId: input.pessoaId ?? null,
        tipo: input.tipo,
        dataInicio: input.dataInicio,
        dataFim: input.dataFim ?? null,
        detalhes: input.detalhes ?? null,
        status: input.status,
        fonte: "manual",
      }).returning({ id: cautelares.id });
      return { id: row.id };
    }),

  updateCautelar: protectedProcedure
    .input(z.object({
      id: z.number(),
      patch: z.object({
        tipo: z.enum([
          "monitoramento-eletronico","comparecimento-periodico","recolhimento-noturno",
          "proibicao-contato","proibicao-frequentar","afastamento-lar","fianca",
          "suspensao-porte-arma","suspensao-habilitacao","outro",
        ]).optional(),
        dataInicio: z.string().optional(),
        dataFim: z.string().nullable().optional(),
        detalhes: z.string().nullable().optional(),
        status: z.enum(["ativa","cumprida","descumprida","revogada","extinta"]).optional(),
        pessoaId: z.number().nullable().optional(),
      }),
    }))
    .mutation(async ({ input, ctx }) => {
      const workspaceId = ctx.user.workspaceId ?? 1;
      const [row] = await db.select({ id: cautelares.id })
        .from(cautelares)
        .innerJoin(processos, eq(processos.id, cautelares.processoId))
        .where(and(eq(cautelares.id, input.id), eq(processos.workspaceId, workspaceId)))
        .limit(1);
      if (!row) throw new Error("Cautelar não encontrada");
      await db.update(cautelares).set({
        ...(input.patch.tipo !== undefined && { tipo: input.patch.tipo }),
        ...(input.patch.dataInicio !== undefined && { dataInicio: input.patch.dataInicio }),
        ...(input.patch.dataFim !== undefined && { dataFim: input.patch.dataFim }),
        ...(input.patch.detalhes !== undefined && { detalhes: input.patch.detalhes }),
        ...(input.patch.status !== undefined && { status: input.patch.status }),
        ...(input.patch.pessoaId !== undefined && { pessoaId: input.patch.pessoaId }),
        updatedAt: new Date(),
      }).where(eq(cautelares.id, input.id));
      return { id: input.id, updated: true };
    }),

  deleteCautelar: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const workspaceId = ctx.user.workspaceId ?? 1;
      const [row] = await db.select({ id: cautelares.id })
        .from(cautelares)
        .innerJoin(processos, eq(processos.id, cautelares.processoId))
        .where(and(eq(cautelares.id, input.id), eq(processos.workspaceId, workspaceId)))
        .limit(1);
      if (!row) throw new Error("Cautelar não encontrada");
      await db.delete(cautelares).where(eq(cautelares.id, input.id));
      return { deleted: true };
    }),
```

- [ ] **Step 4: Run PASS**

- [ ] **Step 5: Commit**

```
cd /Users/rodrigorochameire/projetos/Defender
git add src/lib/trpc/routers/cronologia.ts __tests__/trpc/cronologia-router.test.ts
git commit -m "feat(cronologia): tRPC router Cautelares CRUD"
```

---

## Task 7: tRPC — `getCronologiaCompleta` agregado

**Files:**
- Modify: `src/lib/trpc/routers/cronologia.ts`
- Modify: `__tests__/trpc/cronologia-router.test.ts`

- [ ] **Step 1: Append test**

```ts
describe("cronologia.getCronologiaCompleta", { timeout: 30000 }, () => {
  it("retorna marcos + prisoes + cautelares em uma chamada", async () => {
    const user = await makeUser();
    try {
      const caller = createCaller(mkCtx(user));
      const [proc] = await db.insert(processos).values({
        workspaceId: user.workspaceId ?? 1, numero: `TEST-${Date.now()}`,
      }).returning({ id: processos.id });
      try {
        await caller.cronologia.createMarco({ processoId: proc.id, tipo: "fato", data: "2025-01-15" });
        await caller.cronologia.createPrisao({ processoId: proc.id, tipo: "preventiva", dataInicio: "2025-03-20" });
        await caller.cronologia.createCautelar({ processoId: proc.id, tipo: "monitoramento-eletronico", dataInicio: "2025-04-01" });

        const full = await caller.cronologia.getCronologiaCompleta({ processoId: proc.id });
        expect(full.marcos).toHaveLength(1);
        expect(full.prisoes).toHaveLength(1);
        expect(full.cautelares).toHaveLength(1);
      } finally {
        await db.delete(marcosProcessuais).where(eq(marcosProcessuais.processoId, proc.id));
        await db.delete(prisoes).where(eq(prisoes.processoId, proc.id));
        await db.delete(cautelares).where(eq(cautelares.processoId, proc.id));
        await db.delete(processos).where(eq(processos.id, proc.id));
      }
    } finally {
      await db.delete(users).where(eq(users.id, user.id));
    }
  });
});
```

- [ ] **Step 2: Run FAIL**

- [ ] **Step 3: Add procedure**

Em `cronologia.ts`:

```ts
  getCronologiaCompleta: protectedProcedure
    .input(z.object({ processoId: z.number() }))
    .query(async ({ input, ctx }) => {
      await assertProcessoInWorkspace(input.processoId, ctx.user.workspaceId ?? 1);
      const [marcos, prisoesRows, cautelaresRows] = await Promise.all([
        db.select().from(marcosProcessuais)
          .where(eq(marcosProcessuais.processoId, input.processoId))
          .orderBy(marcosProcessuais.data),
        db.select().from(prisoes)
          .where(eq(prisoes.processoId, input.processoId))
          .orderBy(desc(prisoes.dataInicio)),
        db.select().from(cautelares)
          .where(eq(cautelares.processoId, input.processoId))
          .orderBy(desc(cautelares.dataInicio)),
      ]);
      return { marcos, prisoes: prisoesRows, cautelares: cautelaresRows };
    }),
```

- [ ] **Step 4: Run PASS**

Expected: test novo + 5 anteriores (3 marcos + 1 prisão + 1 cautelar) = 6 tests. Todos passando.

- [ ] **Step 5: Commit**

```
cd /Users/rodrigorochameire/projetos/Defender
git add src/lib/trpc/routers/cronologia.ts __tests__/trpc/cronologia-router.test.ts
git commit -m "feat(cronologia): tRPC getCronologiaCompleta agregado"
```

---

## Task 8: Backfill script

**Files:**
- Create: `scripts/backfill-cronologia.mjs`

- [ ] **Step 1: Implement**

Create `scripts/backfill-cronologia.mjs`:

```js
#!/usr/bin/env node
import postgres from "postgres";
import * as dotenv from "dotenv";

dotenv.config({ path: "/Users/rodrigorochameire/projetos/Defender/.env.local" });

const DRY = process.argv.includes("--dry-run");

// Inline reader copies (JS, independent of TS module)

const MARCO_TIPOS = new Set([
  "fato","apf","audiencia-custodia","denuncia","recebimento-denuncia",
  "resposta-acusacao","aij-designada","aij-realizada","memoriais",
  "sentenca","recurso-interposto","acordao-recurso","transito-julgado",
  "execucao-inicio","outro",
]);
const PRISAO_TIPOS = new Set(["flagrante","temporaria","preventiva","decorrente-sentenca","outro"]);
const PRISAO_SITUACOES = new Set(["ativa","relaxada","revogada","extinta","cumprida","convertida-em-preventiva"]);
const CAUTELAR_TIPOS = new Set([
  "monitoramento-eletronico","comparecimento-periodico","recolhimento-noturno",
  "proibicao-contato","proibicao-frequentar","afastamento-lar","fianca",
  "suspensao-porte-arma","suspensao-habilitacao","outro",
]);
const CAUTELAR_STATUSES = new Set(["ativa","cumprida","descumprida","revogada","extinta"]);

function parseDateTolerant(raw) {
  if (!raw) return null;
  const s = String(raw).trim();
  if (!s) return null;
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    const d = new Date(s);
    if (!isNaN(d.getTime())) return s.slice(0, 10);
  }
  const br = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
  if (br) {
    const [, dd, mm, yyyy] = br;
    const iso = `${yyyy}-${mm.padStart(2,"0")}-${dd.padStart(2,"0")}`;
    const d = new Date(iso);
    if (!isNaN(d.getTime())) return iso;
  }
  return null;
}

const SPARSE_MARCO_FIELDS = [
  [["data_fato","dataFato","fato_data"], "fato"],
  [["data_apf","data_flagrante"], "apf"],
  [["data_audiencia_custodia"], "audiencia-custodia"],
  [["data_denuncia","dataDenuncia"], "denuncia"],
  [["data_recebimento_denuncia"], "recebimento-denuncia"],
  [["data_resposta_acusacao"], "resposta-acusacao"],
  [["data_aij","data_audiencia_instrucao"], "aij-designada"],
  [["data_memoriais"], "memoriais"],
  [["data_sentenca","dataSentenca"], "sentenca"],
  [["data_acordao"], "acordao-recurso"],
  [["data_transito_julgado","dataTransito"], "transito-julgado"],
];

function readMarcos(ed) {
  if (!ed || typeof ed !== "object") return [];
  const out = [];
  const arr = ed.cronologia ?? ed.linha_tempo ?? ed.marcos ?? ed.timeline;
  if (Array.isArray(arr)) {
    for (const m of arr) {
      if (!m || typeof m !== "object") continue;
      const tipo = String(m.tipo ?? "").trim();
      const data = parseDateTolerant(m.data);
      if (!MARCO_TIPOS.has(tipo) || !data) continue;
      out.push({ tipo, data });
    }
  }
  for (const [fields, tipo] of SPARSE_MARCO_FIELDS) {
    for (const f of fields) {
      if (ed[f]) {
        const data = parseDateTolerant(ed[f]);
        if (data && !out.some((m) => m.tipo === tipo && m.data === data)) {
          out.push({ tipo, data });
        }
      }
    }
  }
  return out;
}

function readPrisoes(ed) {
  if (!ed || typeof ed !== "object") return [];
  const out = [];
  const arr = ed.prisoes;
  if (Array.isArray(arr)) {
    for (const p of arr) {
      if (!p || typeof p !== "object") continue;
      const tipo = String(p.tipo ?? "").trim();
      const dataInicio = parseDateTolerant(p.data_inicio ?? p.dataInicio);
      const situacao = String(p.situacao ?? "ativa");
      if (!PRISAO_TIPOS.has(tipo) || !dataInicio || !PRISAO_SITUACOES.has(situacao)) continue;
      out.push({ tipo, dataInicio, situacao, dataFim: parseDateTolerant(p.data_fim) ?? null });
    }
  }
  if (ed.esta_preso === true) {
    const d = parseDateTolerant(ed.data_prisao);
    if (d && !out.some((p) => p.dataInicio === d)) {
      out.push({ tipo: "preventiva", dataInicio: d, situacao: "ativa" });
    }
  }
  return out;
}

function readCautelares(ed) {
  if (!ed || typeof ed !== "object") return [];
  const out = [];
  const arr = ed.cautelares ?? ed.medidas_cautelares;
  if (Array.isArray(arr)) {
    for (const c of arr) {
      if (!c || typeof c !== "object") continue;
      const tipo = String(c.tipo ?? "").trim();
      const dataInicio = parseDateTolerant(c.data_inicio ?? c.dataInicio);
      const status = String(c.status ?? "ativa");
      if (!CAUTELAR_TIPOS.has(tipo) || !dataInicio || !CAUTELAR_STATUSES.has(status)) continue;
      out.push({ tipo, dataInicio, status });
    }
  }
  if (ed.tem_tornozeleira === true) {
    const d = parseDateTolerant(ed.data_tornozeleira ?? ed.data_inicio_tornozeleira);
    if (d && !out.some((c) => c.tipo === "monitoramento-eletronico" && c.dataInicio === d)) {
      out.push({ tipo: "monitoramento-eletronico", dataInicio: d, status: "ativa" });
    }
  }
  if (ed.mpu_ativa === true || ed.medida_protetiva_ativa === true) {
    const d = parseDateTolerant(ed.data_mpu ?? ed.data_medida_protetiva);
    if (d && !out.some((c) => c.tipo === "proibicao-contato" && c.dataInicio === d)) {
      out.push({ tipo: "proibicao-contato", dataInicio: d, status: "ativa" });
    }
  }
  return out;
}

// --- SQL runtime ---

const sql = postgres(process.env.DATABASE_URL, { max: 3 });

const counters = {
  atendimentosProcessados: 0,
  marcosCriados: 0,
  marcosExistentes: 0,
  prisoesCriadas: 0,
  prisoesExistentes: 0,
  cautelaresCriadas: 0,
  cautelaresExistentes: 0,
  warningsDataInvalida: 0,
};

async function insertMarco(processoId, m) {
  const exists = await sql`
    SELECT id FROM marcos_processuais
    WHERE processo_id = ${processoId} AND tipo = ${m.tipo} AND data = ${m.data} AND fonte = 'backfill-ia'
    LIMIT 1
  `;
  if (exists.length > 0) { counters.marcosExistentes++; return; }
  if (DRY) { counters.marcosCriados++; return; }
  await sql`
    INSERT INTO marcos_processuais (processo_id, tipo, data, fonte, confidence)
    VALUES (${processoId}, ${m.tipo}, ${m.data}, 'backfill-ia', 0.7)
  `;
  counters.marcosCriados++;
}

async function insertPrisao(processoId, p) {
  const exists = await sql`
    SELECT id FROM prisoes
    WHERE processo_id = ${processoId} AND tipo = ${p.tipo} AND data_inicio = ${p.dataInicio} AND fonte = 'backfill-ia'
    LIMIT 1
  `;
  if (exists.length > 0) { counters.prisoesExistentes++; return; }
  if (DRY) { counters.prisoesCriadas++; return; }
  await sql`
    INSERT INTO prisoes (processo_id, tipo, data_inicio, data_fim, situacao, fonte, confidence)
    VALUES (${processoId}, ${p.tipo}, ${p.dataInicio}, ${p.dataFim ?? null}, ${p.situacao}, 'backfill-ia', 0.7)
  `;
  counters.prisoesCriadas++;
}

async function insertCautelar(processoId, c) {
  const exists = await sql`
    SELECT id FROM cautelares
    WHERE processo_id = ${processoId} AND tipo = ${c.tipo} AND data_inicio = ${c.dataInicio} AND fonte = 'backfill-ia'
    LIMIT 1
  `;
  if (exists.length > 0) { counters.cautelaresExistentes++; return; }
  if (DRY) { counters.cautelaresCriadas++; return; }
  await sql`
    INSERT INTO cautelares (processo_id, tipo, data_inicio, status, fonte, confidence)
    VALUES (${processoId}, ${c.tipo}, ${c.dataInicio}, ${c.status}, 'backfill-ia', 0.7)
  `;
  counters.cautelaresCriadas++;
}

async function main() {
  console.log(DRY ? "DRY RUN CRONOLOGIA\n" : "BACKFILL CRONOLOGIA\n");

  // Verificar coluna existe
  const col = await sql`
    SELECT column_name FROM information_schema.columns
    WHERE table_name = 'atendimentos' AND column_name = 'enrichment_data'
  `;
  if (col.length === 0) {
    console.log("atendimentos.enrichment_data não existe — nada a fazer.");
    await sql.end();
    return;
  }

  const rows = await sql`
    SELECT id, processo_id, enrichment_data
    FROM atendimentos
    WHERE processo_id IS NOT NULL AND enrichment_data IS NOT NULL
      AND jsonb_typeof(enrichment_data) = 'object'
  `;
  console.log(`atendimentos candidatos: ${rows.length}`);

  for (const a of rows) {
    counters.atendimentosProcessados++;
    const ed = a.enrichment_data;

    for (const m of readMarcos(ed)) await insertMarco(a.processo_id, m);
    for (const p of readPrisoes(ed)) await insertPrisao(a.processo_id, p);
    for (const c of readCautelares(ed)) await insertCautelar(a.processo_id, c);
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
node scripts/backfill-cronologia.mjs --dry-run 2>&1 | tail -20
```

Expected: prints counters (0 se não há dados de IA, não é erro).

- [ ] **Step 3: Real run**

```
node scripts/backfill-cronologia.mjs 2>&1 | tail -20
```

- [ ] **Step 4: Idempotency check**

```
node scripts/backfill-cronologia.mjs 2>&1 | tail -20
```

Expected: `marcosExistentes` + `prisoesExistentes` + `cautelaresExistentes` ≥ criados do passo 3; `criados` = 0 no re-run.

- [ ] **Step 5: Commit**

```
cd /Users/rodrigorochameire/projetos/Defender
git add scripts/backfill-cronologia.mjs
git commit -m "feat(cronologia): backfill idempotente de enrichment_data"
```

---

## Task 9: Forms inline (Marco / Prisão / Cautelar)

**Files:**
- Create: `src/app/(dashboard)/admin/processos/[id]/_components/marco-form.tsx`
- Create: `src/app/(dashboard)/admin/processos/[id]/_components/prisao-form.tsx`
- Create: `src/app/(dashboard)/admin/processos/[id]/_components/cautelar-form.tsx`

- [ ] **Step 1: marco-form.tsx**

```tsx
"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { toast } from "sonner";

const TIPOS = [
  "fato","apf","audiencia-custodia","denuncia","recebimento-denuncia",
  "resposta-acusacao","aij-designada","aij-realizada","memoriais",
  "sentenca","recurso-interposto","acordao-recurso","transito-julgado",
  "execucao-inicio","outro",
] as const;

interface Props {
  processoId: number;
  initial?: {
    id?: number;
    tipo?: typeof TIPOS[number] | string;
    data?: string;
    documentoReferencia?: string | null;
    observacoes?: string | null;
  };
  onDone: () => void;
  onCancel: () => void;
}

export function MarcoForm({ processoId, initial, onDone, onCancel }: Props) {
  const [form, setForm] = useState({
    tipo: initial?.tipo ?? "fato",
    data: initial?.data ?? new Date().toISOString().slice(0,10),
    documentoReferencia: initial?.documentoReferencia ?? "",
    observacoes: initial?.observacoes ?? "",
  });

  const createMut = trpc.cronologia.createMarco.useMutation({
    onSuccess: () => { toast.success("Marco criado"); onDone(); },
    onError: (e) => toast.error(e.message),
  });
  const updateMut = trpc.cronologia.updateMarco.useMutation({
    onSuccess: () => { toast.success("Atualizado"); onDone(); },
    onError: (e) => toast.error(e.message),
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (initial?.id) {
      updateMut.mutate({ id: initial.id, patch: {
        tipo: form.tipo as any,
        data: form.data,
        documentoReferencia: form.documentoReferencia || null,
        observacoes: form.observacoes || null,
      } });
    } else {
      createMut.mutate({
        processoId,
        tipo: form.tipo as any,
        data: form.data,
        documentoReferencia: form.documentoReferencia || null,
        observacoes: form.observacoes || null,
      });
    }
  };

  const pending = createMut.isPending || updateMut.isPending;

  return (
    <form onSubmit={submit} className="space-y-2 p-3 rounded border bg-neutral-50 dark:bg-neutral-900/50">
      <div className="flex gap-2">
        <label className="block flex-1">
          <span className="text-[10px] text-neutral-500">Tipo</span>
          <select className="w-full px-2 py-1.5 border rounded text-sm"
            value={form.tipo}
            onChange={(e) => setForm((f) => ({ ...f, tipo: e.target.value }))}>
            {TIPOS.map((t) => <option key={t} value={t}>{t.replace(/-/g, " ")}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="text-[10px] text-neutral-500">Data</span>
          <input type="date" className="w-full px-2 py-1.5 border rounded text-sm"
            value={form.data}
            onChange={(e) => setForm((f) => ({ ...f, data: e.target.value }))} />
        </label>
      </div>
      <label className="block">
        <span className="text-[10px] text-neutral-500">Documento de referência</span>
        <input className="w-full px-2 py-1.5 border rounded text-sm"
          placeholder='ex: "sentença fls. 234"'
          value={form.documentoReferencia}
          onChange={(e) => setForm((f) => ({ ...f, documentoReferencia: e.target.value }))} />
      </label>
      <label className="block">
        <span className="text-[10px] text-neutral-500">Observações</span>
        <textarea rows={2} className="w-full px-2 py-1.5 border rounded text-sm"
          value={form.observacoes}
          onChange={(e) => setForm((f) => ({ ...f, observacoes: e.target.value }))} />
      </label>
      <div className="flex gap-2">
        <button type="submit" disabled={pending}
          className="px-3 py-1 rounded border text-xs cursor-pointer hover:border-emerald-400">
          {pending ? "Salvando…" : (initial?.id ? "Salvar" : "Criar")}
        </button>
        <button type="button" onClick={onCancel}
          className="px-3 py-1 rounded border text-xs cursor-pointer hover:border-neutral-400">
          Cancelar
        </button>
      </div>
    </form>
  );
}
```

- [ ] **Step 2: prisao-form.tsx**

```tsx
"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { toast } from "sonner";

const TIPOS = ["flagrante","temporaria","preventiva","decorrente-sentenca","outro"] as const;
const SITUACOES = ["ativa","relaxada","revogada","extinta","cumprida","convertida-em-preventiva"] as const;

interface Props {
  processoId: number;
  initial?: any;
  onDone: () => void;
  onCancel: () => void;
}

export function PrisaoForm({ processoId, initial, onDone, onCancel }: Props) {
  const [form, setForm] = useState({
    tipo: initial?.tipo ?? "preventiva",
    dataInicio: initial?.dataInicio ?? new Date().toISOString().slice(0,10),
    dataFim: initial?.dataFim ?? "",
    motivo: initial?.motivo ?? "",
    unidade: initial?.unidade ?? "",
    situacao: initial?.situacao ?? "ativa",
  });

  const createMut = trpc.cronologia.createPrisao.useMutation({
    onSuccess: () => { toast.success("Prisão criada"); onDone(); },
    onError: (e) => toast.error(e.message),
  });
  const updateMut = trpc.cronologia.updatePrisao.useMutation({
    onSuccess: () => { toast.success("Atualizado"); onDone(); },
    onError: (e) => toast.error(e.message),
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      tipo: form.tipo as any,
      dataInicio: form.dataInicio,
      dataFim: form.dataFim || null,
      motivo: form.motivo || null,
      unidade: form.unidade || null,
      situacao: form.situacao as any,
    };
    if (initial?.id) updateMut.mutate({ id: initial.id, patch: payload });
    else createMut.mutate({ processoId, ...payload });
  };

  const pending = createMut.isPending || updateMut.isPending;

  return (
    <form onSubmit={submit} className="space-y-2 p-3 rounded border bg-neutral-50 dark:bg-neutral-900/50">
      <div className="grid grid-cols-3 gap-2">
        <label className="block">
          <span className="text-[10px] text-neutral-500">Tipo</span>
          <select className="w-full px-2 py-1.5 border rounded text-sm"
            value={form.tipo} onChange={(e) => setForm((f) => ({ ...f, tipo: e.target.value }))}>
            {TIPOS.map((t) => <option key={t} value={t}>{t.replace(/-/g," ")}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="text-[10px] text-neutral-500">Data início</span>
          <input type="date" className="w-full px-2 py-1.5 border rounded text-sm"
            value={form.dataInicio}
            onChange={(e) => setForm((f) => ({ ...f, dataInicio: e.target.value }))} />
        </label>
        <label className="block">
          <span className="text-[10px] text-neutral-500">Data fim</span>
          <input type="date" className="w-full px-2 py-1.5 border rounded text-sm"
            value={form.dataFim}
            onChange={(e) => setForm((f) => ({ ...f, dataFim: e.target.value }))} />
        </label>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <label className="block">
          <span className="text-[10px] text-neutral-500">Situação</span>
          <select className="w-full px-2 py-1.5 border rounded text-sm"
            value={form.situacao} onChange={(e) => setForm((f) => ({ ...f, situacao: e.target.value }))}>
            {SITUACOES.map((s) => <option key={s} value={s}>{s.replace(/-/g," ")}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="text-[10px] text-neutral-500">Unidade</span>
          <input className="w-full px-2 py-1.5 border rounded text-sm"
            placeholder="Conjunto Penal..."
            value={form.unidade} onChange={(e) => setForm((f) => ({ ...f, unidade: e.target.value }))} />
        </label>
      </div>
      <label className="block">
        <span className="text-[10px] text-neutral-500">Motivo</span>
        <textarea rows={2} className="w-full px-2 py-1.5 border rounded text-sm"
          value={form.motivo} onChange={(e) => setForm((f) => ({ ...f, motivo: e.target.value }))} />
      </label>
      <div className="flex gap-2">
        <button type="submit" disabled={pending}
          className="px-3 py-1 rounded border text-xs cursor-pointer hover:border-emerald-400">
          {pending ? "Salvando…" : (initial?.id ? "Salvar" : "Criar")}
        </button>
        <button type="button" onClick={onCancel}
          className="px-3 py-1 rounded border text-xs cursor-pointer hover:border-neutral-400">Cancelar</button>
      </div>
    </form>
  );
}
```

- [ ] **Step 3: cautelar-form.tsx**

```tsx
"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { toast } from "sonner";

const TIPOS = [
  "monitoramento-eletronico","comparecimento-periodico","recolhimento-noturno",
  "proibicao-contato","proibicao-frequentar","afastamento-lar","fianca",
  "suspensao-porte-arma","suspensao-habilitacao","outro",
] as const;
const STATUSES = ["ativa","cumprida","descumprida","revogada","extinta"] as const;

interface Props {
  processoId: number;
  initial?: any;
  onDone: () => void;
  onCancel: () => void;
}

export function CautelarForm({ processoId, initial, onDone, onCancel }: Props) {
  const [form, setForm] = useState({
    tipo: initial?.tipo ?? "monitoramento-eletronico",
    dataInicio: initial?.dataInicio ?? new Date().toISOString().slice(0,10),
    dataFim: initial?.dataFim ?? "",
    detalhes: initial?.detalhes ?? "",
    status: initial?.status ?? "ativa",
  });

  const createMut = trpc.cronologia.createCautelar.useMutation({
    onSuccess: () => { toast.success("Cautelar criada"); onDone(); },
    onError: (e) => toast.error(e.message),
  });
  const updateMut = trpc.cronologia.updateCautelar.useMutation({
    onSuccess: () => { toast.success("Atualizado"); onDone(); },
    onError: (e) => toast.error(e.message),
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      tipo: form.tipo as any,
      dataInicio: form.dataInicio,
      dataFim: form.dataFim || null,
      detalhes: form.detalhes || null,
      status: form.status as any,
    };
    if (initial?.id) updateMut.mutate({ id: initial.id, patch: payload });
    else createMut.mutate({ processoId, ...payload });
  };

  const pending = createMut.isPending || updateMut.isPending;

  return (
    <form onSubmit={submit} className="space-y-2 p-3 rounded border bg-neutral-50 dark:bg-neutral-900/50">
      <div className="grid grid-cols-3 gap-2">
        <label className="block">
          <span className="text-[10px] text-neutral-500">Tipo</span>
          <select className="w-full px-2 py-1.5 border rounded text-sm"
            value={form.tipo} onChange={(e) => setForm((f) => ({ ...f, tipo: e.target.value }))}>
            {TIPOS.map((t) => <option key={t} value={t}>{t.replace(/-/g," ")}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="text-[10px] text-neutral-500">Data início</span>
          <input type="date" className="w-full px-2 py-1.5 border rounded text-sm"
            value={form.dataInicio}
            onChange={(e) => setForm((f) => ({ ...f, dataInicio: e.target.value }))} />
        </label>
        <label className="block">
          <span className="text-[10px] text-neutral-500">Data fim</span>
          <input type="date" className="w-full px-2 py-1.5 border rounded text-sm"
            value={form.dataFim}
            onChange={(e) => setForm((f) => ({ ...f, dataFim: e.target.value }))} />
        </label>
      </div>
      <label className="block">
        <span className="text-[10px] text-neutral-500">Status</span>
        <select className="w-40 px-2 py-1.5 border rounded text-sm"
          value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}>
          {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </label>
      <label className="block">
        <span className="text-[10px] text-neutral-500">Detalhes</span>
        <textarea rows={2} className="w-full px-2 py-1.5 border rounded text-sm"
          placeholder='ex: "não se aproximar a menos de 300m"'
          value={form.detalhes}
          onChange={(e) => setForm((f) => ({ ...f, detalhes: e.target.value }))} />
      </label>
      <div className="flex gap-2">
        <button type="submit" disabled={pending}
          className="px-3 py-1 rounded border text-xs cursor-pointer hover:border-emerald-400">
          {pending ? "Salvando…" : (initial?.id ? "Salvar" : "Criar")}
        </button>
        <button type="button" onClick={onCancel}
          className="px-3 py-1 rounded border text-xs cursor-pointer hover:border-neutral-400">Cancelar</button>
      </div>
    </form>
  );
}
```

- [ ] **Step 4: Typecheck**

```
cd /Users/rodrigorochameire/projetos/Defender && npm run typecheck 2>&1 | tail -20
```

- [ ] **Step 5: Commit**

```
cd /Users/rodrigorochameire/projetos/Defender
git add 'src/app/(dashboard)/admin/processos/[id]/_components/marco-form.tsx' \
        'src/app/(dashboard)/admin/processos/[id]/_components/prisao-form.tsx' \
        'src/app/(dashboard)/admin/processos/[id]/_components/cautelar-form.tsx'
git commit -m "feat(cronologia): forms inline Marco/Prisão/Cautelar"
```

---

## Task 10: Blocks (Marcos / Prisões / Cautelares) + CronologiaTab

**Files:**
- Create: `src/app/(dashboard)/admin/processos/[id]/_components/marcos-block.tsx`
- Create: `src/app/(dashboard)/admin/processos/[id]/_components/prisoes-block.tsx`
- Create: `src/app/(dashboard)/admin/processos/[id]/_components/cautelares-block.tsx`
- Create: `src/app/(dashboard)/admin/processos/[id]/_components/cronologia-tab.tsx`
- Create: `__tests__/components/cronologia/marcos-block.test.tsx`
- Create: `__tests__/components/cronologia/cronologia-tab.test.tsx`

- [ ] **Step 1: marcos-block.tsx**

```tsx
"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { MarcoForm } from "./marco-form";
import { Plus, MoreHorizontal } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

interface Props {
  processoId: number;
  marcos: any[];
  onRefresh: () => void;
}

export function MarcosBlock({ processoId, marcos, onRefresh }: Props) {
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const deleteMut = trpc.cronologia.deleteMarco.useMutation({
    onSuccess: () => { toast.success("Removido"); onRefresh(); },
    onError: (e) => toast.error(e.message),
  });

  const handleDelete = (id: number) => {
    if (!confirm("Remover esse marco?")) return;
    deleteMut.mutate({ id });
  };

  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Marcos ({marcos.length})</h3>
        {!adding && (
          <button
            type="button"
            onClick={() => { setAdding(true); setEditingId(null); }}
            className="flex items-center gap-1 px-2 py-1 rounded border text-xs cursor-pointer hover:border-emerald-400"
          >
            <Plus className="w-3 h-3" /> Novo
          </button>
        )}
      </div>

      {adding && (
        <MarcoForm
          processoId={processoId}
          onDone={() => { setAdding(false); onRefresh(); }}
          onCancel={() => setAdding(false)}
        />
      )}

      {marcos.length === 0 && !adding && (
        <p className="text-xs italic text-neutral-400">Nenhum marco.</p>
      )}

      <div className="space-y-1">
        {marcos.map((m) => editingId === m.id ? (
          <MarcoForm
            key={m.id}
            processoId={processoId}
            initial={m}
            onDone={() => { setEditingId(null); onRefresh(); }}
            onCancel={() => setEditingId(null)}
          />
        ) : (
          <div key={m.id} className="flex items-center justify-between px-3 py-1.5 rounded border text-xs">
            <span>
              <strong>{format(new Date(m.data), "dd/MM/yyyy", { locale: ptBR })}</strong>
              {" · "}{m.tipo.replace(/-/g, " ")}
              {m.documentoReferencia && <span className="text-neutral-500"> · {m.documentoReferencia}</span>}
            </span>
            <div className="flex gap-1">
              <button onClick={() => setEditingId(m.id)}
                className="text-neutral-400 hover:text-emerald-500 cursor-pointer">Editar</button>
              <button onClick={() => handleDelete(m.id)}
                className="text-neutral-400 hover:text-rose-500 cursor-pointer">Remover</button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
```

- [ ] **Step 2: prisoes-block.tsx**

```tsx
"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { PrisaoForm } from "./prisao-form";
import { Plus } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

interface Props {
  processoId: number;
  prisoes: any[];
  onRefresh: () => void;
}

export function PrisoesBlock({ processoId, prisoes, onRefresh }: Props) {
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const deleteMut = trpc.cronologia.deletePrisao.useMutation({
    onSuccess: () => { toast.success("Removida"); onRefresh(); },
    onError: (e) => toast.error(e.message),
  });

  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Prisões ({prisoes.length})</h3>
        {!adding && (
          <button
            type="button"
            onClick={() => { setAdding(true); setEditingId(null); }}
            className="flex items-center gap-1 px-2 py-1 rounded border text-xs cursor-pointer hover:border-emerald-400"
          >
            <Plus className="w-3 h-3" /> Nova
          </button>
        )}
      </div>

      {adding && (
        <PrisaoForm
          processoId={processoId}
          onDone={() => { setAdding(false); onRefresh(); }}
          onCancel={() => setAdding(false)}
        />
      )}

      {prisoes.length === 0 && !adding && (
        <p className="text-xs italic text-neutral-400">Nenhuma prisão.</p>
      )}

      <div className="space-y-1">
        {prisoes.map((p) => editingId === p.id ? (
          <PrisaoForm
            key={p.id}
            processoId={processoId}
            initial={p}
            onDone={() => { setEditingId(null); onRefresh(); }}
            onCancel={() => setEditingId(null)}
          />
        ) : (
          <div key={p.id} className="flex items-center justify-between px-3 py-1.5 rounded border text-xs">
            <span>
              <strong>{format(new Date(p.dataInicio), "dd/MM/yyyy", { locale: ptBR })}</strong>
              {p.dataFim && <> — {format(new Date(p.dataFim), "dd/MM/yyyy", { locale: ptBR })}</>}
              {" · "}{p.tipo} · <em>{p.situacao}</em>
              {p.unidade && <span className="text-neutral-500"> · {p.unidade}</span>}
            </span>
            <div className="flex gap-1">
              <button onClick={() => setEditingId(p.id)}
                className="text-neutral-400 hover:text-emerald-500 cursor-pointer">Editar</button>
              <button onClick={() => { if (confirm("Remover?")) deleteMut.mutate({ id: p.id }); }}
                className="text-neutral-400 hover:text-rose-500 cursor-pointer">Remover</button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
```

- [ ] **Step 3: cautelares-block.tsx**

```tsx
"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { CautelarForm } from "./cautelar-form";
import { Plus } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

interface Props {
  processoId: number;
  cautelares: any[];
  onRefresh: () => void;
}

export function CautelaresBlock({ processoId, cautelares, onRefresh }: Props) {
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const deleteMut = trpc.cronologia.deleteCautelar.useMutation({
    onSuccess: () => { toast.success("Removida"); onRefresh(); },
    onError: (e) => toast.error(e.message),
  });

  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Cautelares ({cautelares.length})</h3>
        {!adding && (
          <button
            type="button"
            onClick={() => { setAdding(true); setEditingId(null); }}
            className="flex items-center gap-1 px-2 py-1 rounded border text-xs cursor-pointer hover:border-emerald-400"
          >
            <Plus className="w-3 h-3" /> Nova
          </button>
        )}
      </div>

      {adding && (
        <CautelarForm
          processoId={processoId}
          onDone={() => { setAdding(false); onRefresh(); }}
          onCancel={() => setAdding(false)}
        />
      )}

      {cautelares.length === 0 && !adding && (
        <p className="text-xs italic text-neutral-400">Nenhuma cautelar.</p>
      )}

      <div className="space-y-1">
        {cautelares.map((c) => editingId === c.id ? (
          <CautelarForm
            key={c.id}
            processoId={processoId}
            initial={c}
            onDone={() => { setEditingId(null); onRefresh(); }}
            onCancel={() => setEditingId(null)}
          />
        ) : (
          <div key={c.id} className="flex items-center justify-between px-3 py-1.5 rounded border text-xs">
            <span>
              <strong>{format(new Date(c.dataInicio), "dd/MM/yyyy", { locale: ptBR })}</strong>
              {c.dataFim && <> — {format(new Date(c.dataFim), "dd/MM/yyyy", { locale: ptBR })}</>}
              {" · "}{c.tipo.replace(/-/g, " ")} · <em>{c.status}</em>
              {c.detalhes && <span className="text-neutral-500"> · {c.detalhes}</span>}
            </span>
            <div className="flex gap-1">
              <button onClick={() => setEditingId(c.id)}
                className="text-neutral-400 hover:text-emerald-500 cursor-pointer">Editar</button>
              <button onClick={() => { if (confirm("Remover?")) deleteMut.mutate({ id: c.id }); }}
                className="text-neutral-400 hover:text-rose-500 cursor-pointer">Remover</button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
```

- [ ] **Step 4: cronologia-tab.tsx**

```tsx
"use client";

import { trpc } from "@/lib/trpc/client";
import { MarcosBlock } from "./marcos-block";
import { PrisoesBlock } from "./prisoes-block";
import { CautelaresBlock } from "./cautelares-block";

interface Props {
  processoId: number;
}

export function CronologiaTab({ processoId }: Props) {
  const { data, isLoading, refetch } = trpc.cronologia.getCronologiaCompleta.useQuery({ processoId });

  if (isLoading) return <p className="p-4 text-sm italic text-neutral-400">Carregando…</p>;

  const marcos = data?.marcos ?? [];
  const prisoes = data?.prisoes ?? [];
  const cautelares = data?.cautelares ?? [];

  return (
    <div className="p-4 space-y-6">
      <MarcosBlock processoId={processoId} marcos={marcos} onRefresh={refetch} />
      <PrisoesBlock processoId={processoId} prisoes={prisoes} onRefresh={refetch} />
      <CautelaresBlock processoId={processoId} cautelares={cautelares} onRefresh={refetch} />
    </div>
  );
}
```

- [ ] **Step 5: Component tests**

Create `__tests__/components/cronologia/marcos-block.test.tsx`:

```tsx
// @vitest-environment happy-dom
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { MarcosBlock } from "@/app/(dashboard)/admin/processos/[id]/_components/marcos-block";

afterEach(() => cleanup());

vi.mock("@/lib/trpc/client", () => ({
  trpc: {
    cronologia: {
      createMarco: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) },
      updateMarco: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) },
      deleteMarco: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) },
    },
  },
}));

describe("MarcosBlock", () => {
  it("renderiza lista com count correto", () => {
    render(<MarcosBlock processoId={1} marcos={[
      { id: 1, tipo: "fato", data: "2025-01-15", documentoReferencia: null },
      { id: 2, tipo: "denuncia", data: "2025-05-20", documentoReferencia: null },
    ]} onRefresh={() => {}} />);
    expect(screen.getByText(/Marcos \(2\)/)).toBeInTheDocument();
    expect(screen.getByText(/fato/)).toBeInTheDocument();
    expect(screen.getByText(/denuncia/)).toBeInTheDocument();
  });

  it("renderiza 'nenhum marco' quando vazio", () => {
    render(<MarcosBlock processoId={1} marcos={[]} onRefresh={() => {}} />);
    expect(screen.getByText(/Nenhum marco/i)).toBeInTheDocument();
  });

  it("click Novo abre form", () => {
    render(<MarcosBlock processoId={1} marcos={[]} onRefresh={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: /novo/i }));
    expect(screen.getByText(/Tipo/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /criar/i })).toBeInTheDocument();
  });
});
```

Create `__tests__/components/cronologia/cronologia-tab.test.tsx`:

```tsx
// @vitest-environment happy-dom
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { CronologiaTab } from "@/app/(dashboard)/admin/processos/[id]/_components/cronologia-tab";

afterEach(() => cleanup());

vi.mock("@/lib/trpc/client", () => ({
  trpc: {
    cronologia: {
      getCronologiaCompleta: {
        useQuery: () => ({
          data: {
            marcos: [{ id: 1, tipo: "fato", data: "2025-01-15", documentoReferencia: null }],
            prisoes: [],
            cautelares: [],
          },
          isLoading: false,
          refetch: vi.fn(),
        }),
      },
      createMarco: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) },
      updateMarco: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) },
      deleteMarco: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) },
      createPrisao: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) },
      updatePrisao: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) },
      deletePrisao: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) },
      createCautelar: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) },
      updateCautelar: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) },
      deleteCautelar: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) },
    },
  },
}));

describe("CronologiaTab", () => {
  it("renderiza 3 seções com counts corretos", () => {
    render(<CronologiaTab processoId={1} />);
    expect(screen.getByText(/Marcos \(1\)/)).toBeInTheDocument();
    expect(screen.getByText(/Prisões \(0\)/)).toBeInTheDocument();
    expect(screen.getByText(/Cautelares \(0\)/)).toBeInTheDocument();
  });
});
```

- [ ] **Step 6: Run tests PASS**

```
cd /Users/rodrigorochameire/projetos/Defender && npm run test __tests__/components/cronologia/ 2>&1 | tail -20
```

Expected: 4 tests pass.

- [ ] **Step 7: Commit**

```
cd /Users/rodrigorochameire/projetos/Defender
git add 'src/app/(dashboard)/admin/processos/[id]/_components/' __tests__/components/cronologia/
git commit -m "feat(cronologia): blocks + CronologiaTab + tests"
```

---

## Task 11: ProcessoTabs integration + manual verification

**Files:**
- Modify: `src/components/processo/processo-tabs.tsx`
- Modify: `src/app/(dashboard)/admin/processos/[id]/page.tsx`

- [ ] **Step 1: Inspect ProcessoTabs**

Run:
```
grep -n "MainTab\|BASE_TABS\|pessoas\|icon:" /Users/rodrigorochameire/projetos/Defender/src/components/processo/processo-tabs.tsx | head -30
```

Identificar:
- Onde `MainTab` union é declarado (add "cronologia")
- Onde `BASE_TABS` lista entradas (add `{ key: "cronologia", label: "Cronologia", icon: Clock }`)
- Import de ícone `Clock` de lucide-react

- [ ] **Step 2: Modificar ProcessoTabs**

1. Adicionar `"cronologia"` em `MainTab` union:
```ts
export type MainTab = "resumo" | "pessoas" | "cronologia" | /* ... outras ... */;
```

2. Import do ícone (adicione na linha que importa `Users`, `MapPin`, etc):
```ts
import { ..., Clock } from "lucide-react";
```

3. Entry em `BASE_TABS` depois de Pessoas:
```ts
{ key: "cronologia", label: "Cronologia", icon: Clock },
```

- [ ] **Step 3: Modificar page.tsx**

Abrir `src/app/(dashboard)/admin/processos/[id]/page.tsx`. Procurar pela linha `{tab === "pessoas" && <PessoasTab ...` e adicionar IMEDIATAMENTE DEPOIS:

```tsx
import { CronologiaTab } from "./_components/cronologia-tab";
// (se o import já não existir acima, acrescentar no bloco de imports)

// No JSX onde tabs renderizam:
{tab === "cronologia" && <CronologiaTab processoId={data.id} />}
```

- [ ] **Step 4: Typecheck**

```
cd /Users/rodrigorochameire/projetos/Defender && npm run typecheck 2>&1 | tail -20
```

Expected: 0 novos erros.

- [ ] **Step 5: Commit**

```
cd /Users/rodrigorochameire/projetos/Defender
git add src/components/processo/processo-tabs.tsx 'src/app/(dashboard)/admin/processos/[id]/page.tsx'
git commit -m "feat(cronologia): integração ProcessoTabs + page.tsx"
```

- [ ] **Step 6: Dev server + checklist manual**

```
cd /Users/rodrigorochameire/projetos/Defender
rm -rf .next/cache && npm run dev:webpack
```

Checklist browser:
- [ ] `/admin/processos/[id]` mostra nova aba "Cronologia" (ícone Clock)
- [ ] Click na aba: 3 seções (Marcos, Prisões, Cautelares) aparecem
- [ ] Botão `[+ Novo]` em cada seção abre form inline
- [ ] Criar um marco → aparece na lista ordenado por data
- [ ] Criar uma prisão → aparece ordenada desc
- [ ] Botão "Editar" em linha abre form em modo edit; salvar atualiza
- [ ] Botão "Remover" pede confirmação e remove
- [ ] Filtros de workspace: processo de outro workspace (se existir) → não é acessível

- [ ] **Step 7: Empty commit final**

```
cd /Users/rodrigorochameire/projetos/Defender
git commit --allow-empty -m "chore(cronologia): Fase IV-A validada manualmente"
```

---

## Self-Review

**Spec coverage:**

| Spec | Task |
|---|---|
| Schema (3 tabelas + 5 enums) | Task 1 + Task 2 |
| `readers.ts` parser enrichment_data | Task 3 |
| tRPC CRUD Marcos | Task 4 |
| tRPC CRUD Prisões | Task 5 |
| tRPC CRUD Cautelares | Task 6 |
| `getCronologiaCompleta` agregado | Task 7 |
| Backfill script idempotente | Task 8 |
| Forms inline (Marco/Prisão/Cautelar) | Task 9 |
| Blocks + CronologiaTab | Task 10 |
| ProcessoTabs integration + manual verify | Task 11 |

Cobre todos os entregáveis da spec IV-A.

**Placeholders:** nenhum. Todas as procedures têm código completo; testes têm queries concretas; comandos exatos.

**Type consistency:**
- Enums SQL (Task 1) e TS (Task 2) têm valores idênticos; `pgEnum` em Drizzle TS espelha o CREATE TYPE SQL
- Campos `tipo`, `dataInicio`, `data`, `situacao`, `status` consistentes entre tRPC procedures (Tasks 4-7), forms (Task 9) e blocks (Task 10)
- `MarcoForm`/`PrisaoForm`/`CautelarForm` recebem `processoId` + `initial?` + callbacks; assinaturas idênticas consumidas pelos blocks
- `CronologiaTab` chama `getCronologiaCompleta` e passa `marcos`/`prisoes`/`cautelares` pros 3 blocks

**Risco técnico documentado:**
- Task 2 nota que imports de `processos`/`pessoas` podem vir de módulos diferentes; implementer inspeciona schema index antes.
- Task 4 Step 1 pede inspeção do helper test pattern (`createCaller`, `makeUser`, `mkCtx`) seguindo lugares-router.test.ts.
- Task 11 Step 1 pede inspeção de `ProcessoTabs` antes de editar (padrão pode ter evoluído desde I-B).

Plano coerente. 11 tasks, ~13 commits esperados.
