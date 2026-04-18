# Pessoas · Fase I-A · Fundação Silenciosa — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Criar a fundação do catálogo global de Pessoas — schema + backfill + tRPC + `/admin/pessoas` + componentes silenciosos (`PessoaChip`, `PessoaSheet`) + merge-queue — **sem qualquer sinalização de inteligência**. I-B liga as luzes depois.

**Architecture:** 3 tabelas novas (`pessoas`, `participacoes_processo`, `pessoas_distincts_confirmed`) + extension `pg_trgm`. Router tRPC `pessoas` com 14+ procedures. Pages novas em `/admin/pessoas/*` + componentes isolados em `src/components/pessoas/*`. Backfill idempotente que transforma strings existentes (testemunhas, juízes, promotores, vítimas, mencionados IA) em entidades navegáveis. Zero edição em arquivos da agenda.

**Tech Stack:** PostgreSQL (pg_trgm) · Drizzle ORM · tRPC · Next.js 15 App Router · Radix UI · Zod · Vitest + RTL + happy-dom.

**Spec de referência:** `docs/plans/2026-04-18-pessoas-fase1a-fundacao-silenciosa-design.md`

---

## File Structure

```
src/
├── lib/db/schema/
│   ├── pessoas.ts                          [new]  pessoas, participacoes_processo, pessoas_distincts_confirmed
│   └── index.ts                            [modify]  +export * from "./pessoas"
├── lib/pessoas/
│   ├── normalize.ts                        [new]  normalizarNome()
│   └── intel-config.ts                     [new]  PAPEIS_ROTATIVOS set
├── lib/trpc/routers/
│   ├── pessoas.ts                          [new]  14+ procedures
│   └── index.ts                            [modify]  +pessoasRouter registrado
├── components/pessoas/
│   ├── pessoa-chip.tsx                     [new]  versão silenciosa
│   ├── pessoa-sheet.tsx                    [new]  sheet lateral, 4 tabs
│   ├── pessoa-form.tsx                     [new]  criar/editar
│   ├── merge-pair-card.tsx                 [new]  usado na merge-queue
│   └── index.ts                            [new]  barrel exports
├── app/(dashboard)/admin/pessoas/
│   ├── page.tsx                            [new]  catálogo
│   ├── [id]/page.tsx                       [new]  detalhe
│   ├── merge-queue/page.tsx                [new]  tela de dedup
│   └── nova/page.tsx                       [new]  wizard de criação

scripts/
└── backfill-pessoas.mjs                    [new]  idempotente

drizzle/
└── NNNN_pessoas_fundacao.sql              [new]  migration

__tests__/
├── unit/
│   ├── normalize-pessoa.test.ts            [new]
│   └── intel-config.test.ts                [new]
├── trpc/
│   └── pessoas-router.test.ts              [new]
└── components/pessoas/
    ├── pessoa-chip.test.tsx                [new]
    ├── pessoa-sheet.test.tsx               [new]
    └── merge-pair-card.test.tsx            [new]
```

---

## Task 1: Schema — tabelas `pessoas`, `participacoes_processo`, `pessoas_distincts_confirmed`

**Files:**
- Create: `src/lib/db/schema/pessoas.ts`
- Modify: `src/lib/db/schema/index.ts` (barrel)
- Create: `drizzle/NNNN_pessoas_fundacao.sql` (hand-written)

- [ ] **Step 1: Determinar próximo número de migration**

Run: `ls -1 /Users/rodrigorochameire/projetos/Defender/drizzle/*.sql | tail -3`

Usar próximo número sequencial. Ex: se último for `0034`, criar `0035_pessoas_fundacao.sql`.

- [ ] **Step 2: Criar arquivo de schema Drizzle**

Criar `src/lib/db/schema/pessoas.ts`:

```ts
import {
  pgTable,
  serial,
  text,
  varchar,
  date,
  timestamp,
  integer,
  jsonb,
  numeric,
  primaryKey,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { users } from "./core";
import { processos } from "./core";
import { testemunhas } from "./agenda";

export const pessoas = pgTable(
  "pessoas",
  {
    id: serial("id").primaryKey(),
    nome: text("nome").notNull(),
    nomeNormalizado: text("nome_normalizado").notNull(),
    nomesAlternativos: jsonb("nomes_alternativos").$type<string[]>().default(sql`'[]'::jsonb`),
    cpf: varchar("cpf", { length: 14 }).unique(),
    rg: text("rg"),
    dataNascimento: date("data_nascimento"),
    telefone: text("telefone"),
    endereco: text("endereco"),
    fotoDriveFileId: varchar("foto_drive_file_id", { length: 100 }),
    observacoes: text("observacoes"),
    categoriaPrimaria: varchar("categoria_primaria", { length: 30 }),
    fonteCriacao: varchar("fonte_criacao", { length: 40 }).notNull(),
    criadoPor: integer("criado_por").references(() => users.id),
    confidence: numeric("confidence", { precision: 3, scale: 2 }).default("1.0").notNull(),
    mergedInto: integer("merged_into"),
    mergeReason: text("merge_reason"),
    mergedAt: timestamp("merged_at"),
    mergedBy: integer("merged_by").references(() => users.id),
    workspaceId: integer("workspace_id"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => ({
    nomeNormIdx: index("pessoas_nome_norm_idx").on(t.nomeNormalizado),
    nomeTrgmIdx: index("pessoas_nome_trgm_idx").using("gin", sql`${t.nomeNormalizado} gin_trgm_ops`),
    mergedIdx: index("pessoas_merged_idx").on(t.mergedInto),
    categoriaIdx: index("pessoas_categoria_idx").on(t.categoriaPrimaria),
    workspaceIdx: index("pessoas_workspace_idx").on(t.workspaceId),
  }),
);

export const participacoesProcesso = pgTable(
  "participacoes_processo",
  {
    id: serial("id").primaryKey(),
    pessoaId: integer("pessoa_id")
      .notNull()
      .references(() => pessoas.id, { onDelete: "cascade" }),
    processoId: integer("processo_id")
      .notNull()
      .references(() => processos.id, { onDelete: "cascade" }),
    papel: varchar("papel", { length: 30 }).notNull(),
    lado: varchar("lado", { length: 20 }),
    subpapel: varchar("subpapel", { length: 40 }),
    testemunhaId: integer("testemunha_id").references(() => testemunhas.id),
    resumoNestaCausa: text("resumo_nesta_causa"),
    observacoesNestaCausa: text("observacoes_nesta_causa"),
    audioDriveFileId: varchar("audio_drive_file_id", { length: 100 }),
    dataPrimeiraAparicao: date("data_primeira_aparicao"),
    fonte: varchar("fonte", { length: 40 }).notNull(),
    confidence: numeric("confidence", { precision: 3, scale: 2 }).default("1.0").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => ({
    uniquePessoaProcessoPapel: uniqueIndex("participacoes_unique_pessoa_processo_papel").on(
      t.pessoaId,
      t.processoId,
      t.papel,
    ),
    pessoaIdx: index("participacoes_pessoa_idx").on(t.pessoaId),
    processoIdx: index("participacoes_processo_idx").on(t.processoId),
    papelIdx: index("participacoes_papel_idx").on(t.papel),
    testemunhaIdx: index("participacoes_testemunha_idx").on(t.testemunhaId),
  }),
);

export const pessoasDistinctsConfirmed = pgTable(
  "pessoas_distincts_confirmed",
  {
    pessoaAId: integer("pessoa_a_id")
      .notNull()
      .references(() => pessoas.id, { onDelete: "cascade" }),
    pessoaBId: integer("pessoa_b_id")
      .notNull()
      .references(() => pessoas.id, { onDelete: "cascade" }),
    confirmadoPor: integer("confirmado_por").references(() => users.id),
    confirmadoEm: timestamp("confirmado_em").defaultNow().notNull(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.pessoaAId, t.pessoaBId] }),
  }),
);

export type Pessoa = typeof pessoas.$inferSelect;
export type NovaPessoa = typeof pessoas.$inferInsert;
export type ParticipacaoProcesso = typeof participacoesProcesso.$inferSelect;
export type NovaParticipacaoProcesso = typeof participacoesProcesso.$inferInsert;
```

- [ ] **Step 3: Criar SQL hand-written**

Criar `drizzle/NNNN_pessoas_fundacao.sql` (NNNN = próximo número):

```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TABLE IF NOT EXISTS "pessoas" (
  "id" serial PRIMARY KEY NOT NULL,
  "nome" text NOT NULL,
  "nome_normalizado" text NOT NULL,
  "nomes_alternativos" jsonb DEFAULT '[]'::jsonb,
  "cpf" varchar(14),
  "rg" text,
  "data_nascimento" date,
  "telefone" text,
  "endereco" text,
  "foto_drive_file_id" varchar(100),
  "observacoes" text,
  "categoria_primaria" varchar(30),
  "fonte_criacao" varchar(40) NOT NULL,
  "criado_por" integer,
  "confidence" numeric(3,2) DEFAULT 1.0 NOT NULL,
  "merged_into" integer,
  "merge_reason" text,
  "merged_at" timestamp,
  "merged_by" integer,
  "workspace_id" integer,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "pessoas_cpf_unique" UNIQUE("cpf")
);

CREATE INDEX IF NOT EXISTS "pessoas_nome_norm_idx" ON "pessoas"("nome_normalizado");
CREATE INDEX IF NOT EXISTS "pessoas_nome_trgm_idx" ON "pessoas" USING gin("nome_normalizado" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "pessoas_merged_idx" ON "pessoas"("merged_into") WHERE "merged_into" IS NOT NULL;
CREATE INDEX IF NOT EXISTS "pessoas_categoria_idx" ON "pessoas"("categoria_primaria");
CREATE INDEX IF NOT EXISTS "pessoas_workspace_idx" ON "pessoas"("workspace_id");

DO $$ BEGIN
  ALTER TABLE "pessoas" ADD CONSTRAINT "pessoas_criado_por_users_id_fk"
    FOREIGN KEY ("criado_por") REFERENCES "users"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "pessoas" ADD CONSTRAINT "pessoas_merged_by_users_id_fk"
    FOREIGN KEY ("merged_by") REFERENCES "users"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "pessoas" ADD CONSTRAINT "pessoas_merged_into_pessoas_id_fk"
    FOREIGN KEY ("merged_into") REFERENCES "pessoas"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "participacoes_processo" (
  "id" serial PRIMARY KEY NOT NULL,
  "pessoa_id" integer NOT NULL,
  "processo_id" integer NOT NULL,
  "papel" varchar(30) NOT NULL,
  "lado" varchar(20),
  "subpapel" varchar(40),
  "testemunha_id" integer,
  "resumo_nesta_causa" text,
  "observacoes_nesta_causa" text,
  "audio_drive_file_id" varchar(100),
  "data_primeira_aparicao" date,
  "fonte" varchar(40) NOT NULL,
  "confidence" numeric(3,2) DEFAULT 1.0 NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "participacoes_unique_pessoa_processo_papel"
  ON "participacoes_processo"("pessoa_id", "processo_id", "papel");
CREATE INDEX IF NOT EXISTS "participacoes_pessoa_idx" ON "participacoes_processo"("pessoa_id");
CREATE INDEX IF NOT EXISTS "participacoes_processo_idx" ON "participacoes_processo"("processo_id");
CREATE INDEX IF NOT EXISTS "participacoes_papel_idx" ON "participacoes_processo"("papel");
CREATE INDEX IF NOT EXISTS "participacoes_testemunha_idx" ON "participacoes_processo"("testemunha_id");

DO $$ BEGIN
  ALTER TABLE "participacoes_processo" ADD CONSTRAINT "participacoes_pessoa_id_fk"
    FOREIGN KEY ("pessoa_id") REFERENCES "pessoas"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "participacoes_processo" ADD CONSTRAINT "participacoes_processo_id_fk"
    FOREIGN KEY ("processo_id") REFERENCES "processos"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "participacoes_processo" ADD CONSTRAINT "participacoes_testemunha_id_fk"
    FOREIGN KEY ("testemunha_id") REFERENCES "testemunhas"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "pessoas_distincts_confirmed" (
  "pessoa_a_id" integer NOT NULL,
  "pessoa_b_id" integer NOT NULL,
  "confirmado_por" integer,
  "confirmado_em" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "pessoas_distincts_pk" PRIMARY KEY ("pessoa_a_id", "pessoa_b_id")
);

DO $$ BEGIN
  ALTER TABLE "pessoas_distincts_confirmed" ADD CONSTRAINT "pessoas_distincts_a_fk"
    FOREIGN KEY ("pessoa_a_id") REFERENCES "pessoas"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "pessoas_distincts_confirmed" ADD CONSTRAINT "pessoas_distincts_b_fk"
    FOREIGN KEY ("pessoa_b_id") REFERENCES "pessoas"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "pessoas_distincts_confirmed" ADD CONSTRAINT "pessoas_distincts_confirmado_por_fk"
    FOREIGN KEY ("confirmado_por") REFERENCES "users"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
```

- [ ] **Step 4: Registrar no barrel**

Editar `src/lib/db/schema/index.ts`, adicionar depois do `export * from "./delitos";` (ou próximo do fim do arquivo):

```ts
export * from "./pessoas";
```

- [ ] **Step 5: Aplicar migration no DB**

Criar script temporário `/tmp/apply-pessoas.mjs`:

```js
import { readFileSync } from "node:fs";
import postgres from "postgres";
import * as dotenv from "dotenv";
dotenv.config({ path: "/Users/rodrigorochameire/projetos/Defender/.env.local" });

const sql = postgres(process.env.DATABASE_URL, { max: 1 });
const file = process.argv[2];
const content = readFileSync(file, "utf-8");

// Split por ; mas preserva DO $$ ... $$ blocos
const statements = [];
let current = "";
let inDoBlock = false;
for (const line of content.split("\n")) {
  if (/^DO\s+\$\$/.test(line.trim())) inDoBlock = true;
  current += line + "\n";
  if (inDoBlock && /^END\s+\$\$;?\s*$/.test(line.trim())) {
    inDoBlock = false;
    statements.push(current.trim());
    current = "";
    continue;
  }
  if (!inDoBlock && line.trim().endsWith(";")) {
    statements.push(current.trim());
    current = "";
  }
}

for (const s of statements) {
  if (!s) continue;
  console.log("Exec:", s.split("\n")[0].slice(0, 80));
  await sql.unsafe(s);
}

const tables = await sql`
  SELECT table_name FROM information_schema.tables
  WHERE table_name IN ('pessoas', 'participacoes_processo', 'pessoas_distincts_confirmed')
  ORDER BY table_name
`;
console.log("Created tables:", tables);

await sql.end();
```

Run: `cd ~/projetos/Defender && node /tmp/apply-pessoas.mjs drizzle/NNNN_pessoas_fundacao.sql`

Expected output:
```
Created tables: [
  { table_name: 'participacoes_processo' },
  { table_name: 'pessoas' },
  { table_name: 'pessoas_distincts_confirmed' }
]
```

Run: `rm /tmp/apply-pessoas.mjs`

- [ ] **Step 6: Typecheck**

Run: `cd ~/projetos/Defender && npm run typecheck`
Expected: 0 new errors.

- [ ] **Step 7: Commit**

```bash
git add src/lib/db/schema/pessoas.ts src/lib/db/schema/index.ts drizzle/*_pessoas_fundacao.sql
git commit -m "feat(pessoas): schema pessoas + participacoes_processo + distincts"
```

---

## Task 2: Helper `normalizarNome` (TDD)

**Files:**
- Create: `src/lib/pessoas/normalize.ts`
- Create: `__tests__/unit/normalize-pessoa.test.ts`

- [ ] **Step 1: Write failing test**

```ts
// __tests__/unit/normalize-pessoa.test.ts
import { describe, it, expect } from "vitest";
import { normalizarNome } from "@/lib/pessoas/normalize";

describe("normalizarNome", () => {
  it("lowercase + trim", () => {
    expect(normalizarNome("  João Silva  ")).toBe("joao silva");
  });

  it("remove acentos", () => {
    expect(normalizarNome("João")).toBe("joao");
    expect(normalizarNome("Antônio")).toBe("antonio");
    expect(normalizarNome("José Cândido")).toBe("jose candido");
  });

  it("colapsa múltiplos espaços", () => {
    expect(normalizarNome("João   da    Silva")).toBe("joao da silva");
  });

  it("remove pontuação", () => {
    expect(normalizarNome("Dr. João S.")).toBe("joao s");
  });

  it("remove pronomes de tratamento", () => {
    expect(normalizarNome("Dr. João Silva")).toBe("joao silva");
    expect(normalizarNome("Dra. Ana Costa")).toBe("ana costa");
    expect(normalizarNome("PM João Souza")).toBe("joao souza");
    expect(normalizarNome("Sgt. Carlos Lima")).toBe("carlos lima");
  });

  it("vazio retorna vazio", () => {
    expect(normalizarNome("")).toBe("");
    expect(normalizarNome("   ")).toBe("");
  });

  it("números são preservados", () => {
    expect(normalizarNome("João 2º")).toBe("joao 2");
  });

  it("não falha com null-like", () => {
    expect(normalizarNome(null as any)).toBe("");
    expect(normalizarNome(undefined as any)).toBe("");
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

Run: `cd ~/projetos/Defender && npm run test __tests__/unit/normalize-pessoa.test.ts`
Expected: FAIL ("Cannot find module").

- [ ] **Step 3: Implement**

```ts
// src/lib/pessoas/normalize.ts
/**
 * Normaliza nome para comparação e indexação.
 * Regras:
 * - NFD + remoção de marcas de acento
 * - Lowercase
 * - Remoção de pronomes de tratamento comuns (Dr., PM, Sgt., etc)
 * - Remoção de pontuação e caracteres não-alfanuméricos (preserva números)
 * - Colapso de múltiplos espaços
 * - Trim
 */
export function normalizarNome(s: string): string {
  if (!s) return "";
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(
      /\b(dr|dra|sr|sra|pm|pc|pf|cb|sgt|sub|insp|esc|inv|tte|cabo|soldado)\.?\s+/gi,
      " ",
    )
    .replace(/[^a-z0-9\s]/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}
```

- [ ] **Step 4: Run — expect 8 PASS**

Run: `npm run test __tests__/unit/normalize-pessoa.test.ts`

- [ ] **Step 5: Commit**

```bash
git add src/lib/pessoas/normalize.ts __tests__/unit/normalize-pessoa.test.ts
git commit -m "feat(pessoas): normalizarNome helper"
```

---

## Task 3: Config `intel-config.ts` (TDD)

**Files:**
- Create: `src/lib/pessoas/intel-config.ts`
- Create: `__tests__/unit/intel-config.test.ts`

- [ ] **Step 1: Write failing test**

```ts
// __tests__/unit/intel-config.test.ts
import { describe, it, expect } from "vitest";
import { PAPEIS_ROTATIVOS, isPapelRotativo, PAPEIS_VALIDOS } from "@/lib/pessoas/intel-config";

describe("PAPEIS_ROTATIVOS", () => {
  it("inclui depoentes", () => {
    expect(PAPEIS_ROTATIVOS.has("testemunha")).toBe(true);
    expect(PAPEIS_ROTATIVOS.has("vitima")).toBe(true);
    expect(PAPEIS_ROTATIVOS.has("co-reu")).toBe(true);
    expect(PAPEIS_ROTATIVOS.has("informante")).toBe(true);
  });

  it("inclui policiais e peritos", () => {
    expect(PAPEIS_ROTATIVOS.has("policial-militar")).toBe(true);
    expect(PAPEIS_ROTATIVOS.has("perito-criminal")).toBe(true);
    expect(PAPEIS_ROTATIVOS.has("medico-legista")).toBe(true);
  });

  it("inclui advogado parte contrária", () => {
    expect(PAPEIS_ROTATIVOS.has("advogado-parte-contraria")).toBe(true);
  });

  it("exclui titulares estáveis (juiz, promotor, servidor)", () => {
    expect(PAPEIS_ROTATIVOS.has("juiz")).toBe(false);
    expect(PAPEIS_ROTATIVOS.has("promotor")).toBe(false);
    expect(PAPEIS_ROTATIVOS.has("desembargador")).toBe(false);
    expect(PAPEIS_ROTATIVOS.has("procurador")).toBe(false);
    expect(PAPEIS_ROTATIVOS.has("servidor-cartorio")).toBe(false);
    expect(PAPEIS_ROTATIVOS.has("oficial-justica")).toBe(false);
  });
});

describe("isPapelRotativo", () => {
  it("retorna true para rotativos", () => {
    expect(isPapelRotativo("testemunha")).toBe(true);
    expect(isPapelRotativo("policial-militar")).toBe(true);
  });

  it("retorna false para estáveis", () => {
    expect(isPapelRotativo("juiz")).toBe(false);
    expect(isPapelRotativo("promotor")).toBe(false);
  });

  it("retorna false para null/undefined/desconhecido", () => {
    expect(isPapelRotativo(null)).toBe(false);
    expect(isPapelRotativo(undefined)).toBe(false);
    expect(isPapelRotativo("papel-inexistente")).toBe(false);
  });
});

describe("PAPEIS_VALIDOS", () => {
  it("inclui todos os rotativos + estáveis + outro", () => {
    expect(PAPEIS_VALIDOS).toContain("testemunha");
    expect(PAPEIS_VALIDOS).toContain("juiz");
    expect(PAPEIS_VALIDOS).toContain("outro");
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

Run: `npm run test __tests__/unit/intel-config.test.ts`

- [ ] **Step 3: Implement**

```ts
// src/lib/pessoas/intel-config.ts
/**
 * Papéis com alto valor de cruzamento (rotativos).
 * Em comarca única, pessoas nesses papéis mudam de caso pra caso —
 * merecem sinalização de inteligência (dot, peek, banner) em Fase I-B.
 */
export const PAPEIS_ROTATIVOS = new Set<string>([
  // Depoentes / Acusação
  "testemunha",
  "vitima",
  "informante",
  "co-reu",
  "testemunha-defesa",
  // Policial / Investigação
  "autoridade-policial",
  "policial-militar",
  "policial-civil",
  "policial-federal",
  "guarda-municipal",
  "agente-penitenciario",
  // Pericial / Técnico
  "perito-criminal",
  "perito-medico",
  "medico-legista",
  "medico-assistente",
  "psicologo-forense",
  "psiquiatra-forense",
  "assistente-social",
  "tradutor-interprete",
  // Parte contrária
  "advogado-parte-contraria",
]);

/**
 * Papéis estáveis — titularidade fixa em comarca única.
 * Entidade existe no banco (para estatística/audit) mas em Fase I-B
 * NÃO ganha dot/peek/banner.
 */
export const PAPEIS_ESTAVEIS = new Set<string>([
  "juiz",
  "desembargador",
  "promotor",
  "procurador",
  "servidor-cartorio",
  "oficial-justica",
  "analista-judiciario",
]);

/**
 * Lista completa de papéis válidos (para Zod enum).
 */
export const PAPEIS_VALIDOS = [
  ...PAPEIS_ROTATIVOS,
  ...PAPEIS_ESTAVEIS,
  "outro",
] as const;

export type PapelParticipacao = typeof PAPEIS_VALIDOS[number];

export function isPapelRotativo(papel: string | null | undefined): boolean {
  if (!papel) return false;
  return PAPEIS_ROTATIVOS.has(papel);
}
```

- [ ] **Step 4: Run — expect all PASS**

Run: `npm run test __tests__/unit/intel-config.test.ts`

- [ ] **Step 5: Commit**

```bash
git add src/lib/pessoas/intel-config.ts __tests__/unit/intel-config.test.ts
git commit -m "feat(pessoas): PAPEIS_ROTATIVOS config + isPapelRotativo helper"
```

---

## Task 4: tRPC router `pessoas` — CRUD básico (TDD)

**Files:**
- Create: `src/lib/trpc/routers/pessoas.ts`
- Create: `__tests__/trpc/pessoas-router.test.ts`
- Modify: `src/lib/trpc/routers/index.ts`

- [ ] **Step 1: Write failing tests for CRUD básico**

```ts
// __tests__/trpc/pessoas-router.test.ts
import { describe, it, expect } from "vitest";
import { db } from "@/lib/db";
import { pessoas } from "@/lib/db/schema";
import { users } from "@/lib/db/schema/core";
import { eq } from "drizzle-orm";
import { createCallerFactory } from "@/lib/trpc/init";
import { appRouter } from "@/lib/trpc/routers";

const createCaller = createCallerFactory(appRouter);
const mkCtx = (user: any) => ({
  user,
  requestId: "test-" + Math.random(),
  selectedDefensorScopeId: null,
});

async function makeUser() {
  const [u] = await db
    .insert(users)
    .values({
      name: "Test Pessoas",
      email: `pessoas-${Date.now()}-${Math.random()}@test.local`,
      workspaceId: 1,
    } as any)
    .returning();
  return u;
}

describe("pessoas.create + pessoas.getById", { timeout: 30000 }, () => {
  it("cria pessoa e recupera por id", async () => {
    const user = await makeUser();
    try {
      const caller = createCaller(mkCtx(user));
      const created = await caller.pessoas.create({
        nome: "Maria Teste Silva",
        fonteCriacao: "manual",
      });
      expect(created.id).toBeGreaterThan(0);
      expect(created.nomeNormalizado).toBe("maria teste silva");

      const fetched = await caller.pessoas.getById({ id: created.id });
      expect(fetched.pessoa.id).toBe(created.id);
      expect(fetched.pessoa.nome).toBe("Maria Teste Silva");
      expect(fetched.participacoes).toEqual([]);

      await db.delete(pessoas).where(eq(pessoas.id, created.id));
    } finally {
      await db.delete(users).where(eq(users.id, user.id));
    }
  });

  it("normaliza nome automaticamente", async () => {
    const user = await makeUser();
    try {
      const caller = createCaller(mkCtx(user));
      const created = await caller.pessoas.create({
        nome: "Dr. João da Silva",
        fonteCriacao: "manual",
      });
      expect(created.nomeNormalizado).toBe("joao da silva");
      await db.delete(pessoas).where(eq(pessoas.id, created.id));
    } finally {
      await db.delete(users).where(eq(users.id, user.id));
    }
  });

  it("rejeita cpf duplicado", async () => {
    const user = await makeUser();
    const uniqueCpf = `${Date.now()}`.padStart(11, "0").slice(0, 11);
    try {
      const caller = createCaller(mkCtx(user));
      await caller.pessoas.create({
        nome: "Primeira",
        cpf: uniqueCpf,
        fonteCriacao: "manual",
      });
      await expect(
        caller.pessoas.create({
          nome: "Segunda",
          cpf: uniqueCpf,
          fonteCriacao: "manual",
        }),
      ).rejects.toThrow();
    } finally {
      await db.delete(pessoas).where(eq(pessoas.cpf, uniqueCpf));
      await db.delete(users).where(eq(users.id, user.id));
    }
  });
});

describe("pessoas.list", { timeout: 30000 }, () => {
  it("lista pessoas com busca por nome normalizado", async () => {
    const user = await makeUser();
    const nomesCriados: number[] = [];
    try {
      const caller = createCaller(mkCtx(user));
      const p1 = await caller.pessoas.create({ nome: "Aurélio Teste", fonteCriacao: "manual" });
      const p2 = await caller.pessoas.create({ nome: "Beatriz Teste", fonteCriacao: "manual" });
      nomesCriados.push(p1.id, p2.id);

      const res = await caller.pessoas.list({ search: "aurelio", limit: 10, offset: 0 });
      expect(res.items.some((p) => p.id === p1.id)).toBe(true);
      expect(res.items.some((p) => p.id === p2.id)).toBe(false);
    } finally {
      for (const id of nomesCriados) await db.delete(pessoas).where(eq(pessoas.id, id));
      await db.delete(users).where(eq(users.id, user.id));
    }
  });
});

describe("pessoas.update + pessoas.delete", { timeout: 30000 }, () => {
  it("update atualiza campos e re-normaliza nome", async () => {
    const user = await makeUser();
    try {
      const caller = createCaller(mkCtx(user));
      const p = await caller.pessoas.create({ nome: "Carlos Original", fonteCriacao: "manual" });
      const upd = await caller.pessoas.update({ id: p.id, nome: "Dr. Carlos Alterado" });
      expect(upd.nome).toBe("Dr. Carlos Alterado");
      expect(upd.nomeNormalizado).toBe("carlos alterado");
      await db.delete(pessoas).where(eq(pessoas.id, p.id));
    } finally {
      await db.delete(users).where(eq(users.id, user.id));
    }
  });
});
```

- [ ] **Step 2: Run — expect FAIL (router não existe)**

Run: `cd ~/projetos/Defender && npm run test __tests__/trpc/pessoas-router.test.ts`

- [ ] **Step 3: Implement router skeleton + CRUD**

Criar `src/lib/trpc/routers/pessoas.ts`:

```ts
import { z } from "zod";
import { router, protectedProcedure } from "../init";
import { db } from "@/lib/db";
import { pessoas } from "@/lib/db/schema";
import { eq, and, isNull, desc, asc, sql, or, inArray } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { normalizarNome } from "@/lib/pessoas/normalize";
import { PAPEIS_VALIDOS } from "@/lib/pessoas/intel-config";

const papelEnum = z.enum(PAPEIS_VALIDOS as unknown as [string, ...string[]]);

const pessoaInputSchema = z.object({
  nome: z.string().min(2, "Nome muito curto"),
  cpf: z.string().max(14).optional(),
  rg: z.string().optional(),
  dataNascimento: z.string().optional(),
  telefone: z.string().optional(),
  endereco: z.string().optional(),
  observacoes: z.string().optional(),
  categoriaPrimaria: z.string().max(30).optional(),
  fonteCriacao: z.enum([
    "manual",
    "backfill",
    "ia-atendimento",
    "ia-denuncia",
    "import-pje",
  ]),
});

export const pessoasRouter = router({
  create: protectedProcedure
    .input(pessoaInputSchema)
    .mutation(async ({ input, ctx }) => {
      const nomeNorm = normalizarNome(input.nome);
      if (!nomeNorm) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Nome inválido" });
      }
      try {
        const [row] = await db
          .insert(pessoas)
          .values({
            nome: input.nome.trim(),
            nomeNormalizado: nomeNorm,
            cpf: input.cpf || null,
            rg: input.rg || null,
            dataNascimento: input.dataNascimento || null,
            telefone: input.telefone || null,
            endereco: input.endereco || null,
            observacoes: input.observacoes || null,
            categoriaPrimaria: input.categoriaPrimaria || null,
            fonteCriacao: input.fonteCriacao,
            criadoPor: ctx.user?.id ?? null,
          } as any)
          .returning();
        return row;
      } catch (e: any) {
        if (e?.code === "23505") {
          throw new TRPCError({ code: "CONFLICT", message: "CPF já cadastrado" });
        }
        throw e;
      }
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      nome: z.string().min(2).optional(),
      cpf: z.string().max(14).nullable().optional(),
      rg: z.string().nullable().optional(),
      dataNascimento: z.string().nullable().optional(),
      telefone: z.string().nullable().optional(),
      endereco: z.string().nullable().optional(),
      observacoes: z.string().nullable().optional(),
      categoriaPrimaria: z.string().max(30).nullable().optional(),
    }))
    .mutation(async ({ input }) => {
      const updates: any = { updatedAt: new Date() };
      if (input.nome !== undefined) {
        updates.nome = input.nome.trim();
        updates.nomeNormalizado = normalizarNome(input.nome);
      }
      for (const k of ["cpf", "rg", "dataNascimento", "telefone", "endereco", "observacoes", "categoriaPrimaria"] as const) {
        if (input[k] !== undefined) updates[k] = input[k];
      }
      const [row] = await db
        .update(pessoas)
        .set(updates)
        .where(eq(pessoas.id, input.id))
        .returning();
      if (!row) throw new TRPCError({ code: "NOT_FOUND" });
      return row;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await db.delete(pessoas).where(eq(pessoas.id, input.id));
      return { ok: true };
    }),

  list: protectedProcedure
    .input(z.object({
      search: z.string().optional(),
      papel: papelEnum.optional(),
      categoria: z.string().optional(),
      hasProcessos: z.boolean().optional(),
      limit: z.number().min(1).max(200).default(50),
      offset: z.number().min(0).default(0),
      orderBy: z.enum(["nome", "recente"]).default("nome"),
    }))
    .query(async ({ input }) => {
      const where = [isNull(pessoas.mergedInto)];
      if (input.search) {
        const searchNorm = normalizarNome(input.search);
        where.push(sql`${pessoas.nomeNormalizado} ILIKE ${'%' + searchNorm + '%'}`);
      }
      if (input.categoria) where.push(eq(pessoas.categoriaPrimaria, input.categoria));

      const orderByCol = input.orderBy === "recente" ? desc(pessoas.updatedAt) : asc(pessoas.nome);

      const items = await db
        .select()
        .from(pessoas)
        .where(and(...where))
        .orderBy(orderByCol)
        .limit(input.limit)
        .offset(input.offset);

      const [{ total }] = await db
        .select({ total: sql<number>`count(*)::int` })
        .from(pessoas)
        .where(and(...where));

      return { items, total: Number(total) };
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const [pessoa] = await db.select().from(pessoas).where(eq(pessoas.id, input.id));
      if (!pessoa) throw new TRPCError({ code: "NOT_FOUND" });
      // Participações serão populadas na Task 5
      return { pessoa, participacoes: [] as any[] };
    }),
});
```

- [ ] **Step 4: Registrar no router root**

Editar `src/lib/trpc/routers/index.ts`, adicionar import + registro:

```ts
import { pessoasRouter } from "./pessoas";
// ... existing imports ...

export const appRouter = router({
  // ... existing routers ...
  pessoas: pessoasRouter,
  // ...
});
```

Encontrar a linha onde outros routers são registrados e adicionar `pessoas: pessoasRouter,` na lista.

- [ ] **Step 5: Run — expect PASS**

Run: `npm run test __tests__/trpc/pessoas-router.test.ts`

- [ ] **Step 6: Typecheck**

Run: `npm run typecheck`
Expected: 0 new errors.

- [ ] **Step 7: Commit**

```bash
git add src/lib/trpc/routers/pessoas.ts src/lib/trpc/routers/index.ts __tests__/trpc/pessoas-router.test.ts
git commit -m "feat(pessoas): tRPC router CRUD básico (create, list, getById, update, delete)"
```

---

## Task 5: tRPC router — participações + busca (TDD)

**Files:**
- Modify: `src/lib/trpc/routers/pessoas.ts`
- Modify: `__tests__/trpc/pessoas-router.test.ts`

- [ ] **Step 1: Adicionar testes de participações**

Append ao arquivo de teste:

```ts
import { participacoesProcesso } from "@/lib/db/schema";
import { processos, assistidos } from "@/lib/db/schema/core";

describe("pessoas — participações", { timeout: 30000 }, () => {
  async function seed() {
    const user = await makeUser();
    const [assistido] = await db.insert(assistidos).values({
      nome: "Test Assistido " + Date.now(),
      workspaceId: 1,
    } as any).returning();
    const [processo] = await db.insert(processos).values({
      assistidoId: assistido.id,
      numeroAutos: "PESSOAS-" + Date.now(),
      area: "JURI",
    } as any).returning();
    return { user, assistido, processo };
  }
  async function cleanup(ids: { userId: number; assistidoId: number; processoId: number }) {
    await db.delete(processos).where(eq(processos.id, ids.processoId));
    await db.delete(assistidos).where(eq(assistidos.id, ids.assistidoId));
    await db.delete(users).where(eq(users.id, ids.userId));
  }

  it("addParticipacao cria e getById retorna", async () => {
    const { user, assistido, processo } = await seed();
    try {
      const caller = createCaller(mkCtx(user));
      const p = await caller.pessoas.create({ nome: "Test Part", fonteCriacao: "manual" });
      try {
        await caller.pessoas.addParticipacao({
          pessoaId: p.id,
          processoId: processo.id,
          papel: "testemunha",
          lado: "acusacao",
          fonte: "manual",
        });
        const res = await caller.pessoas.getById({ id: p.id });
        expect(res.participacoes).toHaveLength(1);
        expect(res.participacoes[0].papel).toBe("testemunha");
      } finally {
        await db.delete(pessoas).where(eq(pessoas.id, p.id));
      }
    } finally {
      await cleanup({ userId: user.id, assistidoId: assistido.id, processoId: processo.id });
    }
  });

  it("searchForAutocomplete retorna matches", async () => {
    const user = await makeUser();
    try {
      const caller = createCaller(mkCtx(user));
      const p = await caller.pessoas.create({ nome: "Zeferino Autocomplete", fonteCriacao: "manual" });
      try {
        const res = await caller.pessoas.searchForAutocomplete({ query: "zeferino", limit: 5 });
        expect(res.some((x) => x.id === p.id)).toBe(true);
      } finally {
        await db.delete(pessoas).where(eq(pessoas.id, p.id));
      }
    } finally {
      await db.delete(users).where(eq(users.id, user.id));
    }
  });

  it("addParticipacao bloqueia duplicata (mesmo papel)", async () => {
    const { user, assistido, processo } = await seed();
    try {
      const caller = createCaller(mkCtx(user));
      const p = await caller.pessoas.create({ nome: "Unique Part", fonteCriacao: "manual" });
      try {
        await caller.pessoas.addParticipacao({
          pessoaId: p.id,
          processoId: processo.id,
          papel: "testemunha",
          fonte: "manual",
        });
        await expect(
          caller.pessoas.addParticipacao({
            pessoaId: p.id,
            processoId: processo.id,
            papel: "testemunha",
            fonte: "manual",
          }),
        ).rejects.toThrow();
      } finally {
        await db.delete(pessoas).where(eq(pessoas.id, p.id));
      }
    } finally {
      await cleanup({ userId: user.id, assistidoId: assistido.id, processoId: processo.id });
    }
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

- [ ] **Step 3: Adicionar procedures ao router**

Em `src/lib/trpc/routers/pessoas.ts`, antes do `});` final do `router(...)`, adicionar:

```ts
  // === BUSCA ===
  searchForAutocomplete: protectedProcedure
    .input(z.object({
      query: z.string().min(1),
      papel: papelEnum.optional(),
      limit: z.number().min(1).max(20).default(10),
    }))
    .query(async ({ input }) => {
      const q = normalizarNome(input.query);
      const rows = await db
        .select({
          id: pessoas.id,
          nome: pessoas.nome,
          nomeNormalizado: pessoas.nomeNormalizado,
          categoriaPrimaria: pessoas.categoriaPrimaria,
          confidence: pessoas.confidence,
        })
        .from(pessoas)
        .where(
          and(
            isNull(pessoas.mergedInto),
            sql`${pessoas.nomeNormalizado} ILIKE ${'%' + q + '%'}`,
          ),
        )
        .limit(input.limit);
      return rows;
    }),

  getByCpf: protectedProcedure
    .input(z.object({ cpf: z.string().min(11) }))
    .query(async ({ input }) => {
      const [row] = await db
        .select()
        .from(pessoas)
        .where(and(eq(pessoas.cpf, input.cpf), isNull(pessoas.mergedInto)));
      return row ?? null;
    }),

  // === PARTICIPAÇÕES ===
  addParticipacao: protectedProcedure
    .input(z.object({
      pessoaId: z.number(),
      processoId: z.number(),
      papel: papelEnum,
      lado: z.enum(["acusacao", "defesa", "neutro"]).optional(),
      subpapel: z.string().max(40).optional(),
      testemunhaId: z.number().optional(),
      resumoNestaCausa: z.string().optional(),
      observacoesNestaCausa: z.string().optional(),
      fonte: z.enum(["manual", "backfill", "ia-atendimento", "ia-denuncia", "import-pje"]).default("manual"),
      confidence: z.number().min(0).max(1).default(1.0),
    }))
    .mutation(async ({ input }) => {
      try {
        const [row] = await db
          .insert(participacoesProcesso)
          .values({
            pessoaId: input.pessoaId,
            processoId: input.processoId,
            papel: input.papel,
            lado: input.lado ?? null,
            subpapel: input.subpapel ?? null,
            testemunhaId: input.testemunhaId ?? null,
            resumoNestaCausa: input.resumoNestaCausa ?? null,
            observacoesNestaCausa: input.observacoesNestaCausa ?? null,
            fonte: input.fonte,
            confidence: String(input.confidence),
          } as any)
          .returning();
        return row;
      } catch (e: any) {
        if (e?.code === "23505") {
          throw new TRPCError({ code: "CONFLICT", message: "Pessoa já tem esse papel nesse processo" });
        }
        throw e;
      }
    }),

  updateParticipacao: protectedProcedure
    .input(z.object({
      id: z.number(),
      papel: papelEnum.optional(),
      lado: z.enum(["acusacao", "defesa", "neutro"]).nullable().optional(),
      subpapel: z.string().max(40).nullable().optional(),
      testemunhaId: z.number().nullable().optional(),
      resumoNestaCausa: z.string().nullable().optional(),
      observacoesNestaCausa: z.string().nullable().optional(),
    }))
    .mutation(async ({ input }) => {
      const updates: any = { updatedAt: new Date() };
      for (const k of ["papel", "lado", "subpapel", "testemunhaId", "resumoNestaCausa", "observacoesNestaCausa"] as const) {
        if (input[k] !== undefined) updates[k] = input[k];
      }
      const [row] = await db
        .update(participacoesProcesso)
        .set(updates)
        .where(eq(participacoesProcesso.id, input.id))
        .returning();
      if (!row) throw new TRPCError({ code: "NOT_FOUND" });
      return row;
    }),

  removeParticipacao: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await db.delete(participacoesProcesso).where(eq(participacoesProcesso.id, input.id));
      return { ok: true };
    }),

  getParticipacoesDoProcesso: protectedProcedure
    .input(z.object({ processoId: z.number() }))
    .query(async ({ input }) => {
      return db
        .select()
        .from(participacoesProcesso)
        .where(eq(participacoesProcesso.processoId, input.processoId))
        .orderBy(asc(participacoesProcesso.papel));
    }),
```

Atualizar também o `getById` existente pra buscar participações:

```ts
  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const [pessoa] = await db.select().from(pessoas).where(eq(pessoas.id, input.id));
      if (!pessoa) throw new TRPCError({ code: "NOT_FOUND" });
      const parts = await db
        .select()
        .from(participacoesProcesso)
        .where(eq(participacoesProcesso.pessoaId, input.id))
        .orderBy(desc(participacoesProcesso.createdAt));
      return { pessoa, participacoes: parts };
    }),
```

Adicionar imports de `participacoesProcesso` no topo do arquivo (já está no barrel). Verificar que `import { pessoas, participacoesProcesso } from "@/lib/db/schema"` inclui ambos.

- [ ] **Step 4: Run — expect PASS**

Run: `npm run test __tests__/trpc/pessoas-router.test.ts`

- [ ] **Step 5: Commit**

```bash
git add src/lib/trpc/routers/pessoas.ts __tests__/trpc/pessoas-router.test.ts
git commit -m "feat(pessoas): tRPC participações + busca por autocomplete/cpf"
```

---

## Task 6: tRPC router — merge + distinctConfirmed (TDD)

**Files:**
- Modify: `src/lib/trpc/routers/pessoas.ts`
- Modify: `__tests__/trpc/pessoas-router.test.ts`

- [ ] **Step 1: Adicionar testes de merge**

```ts
describe("pessoas — merge", { timeout: 30000 }, () => {
  it("merge move participações e marca mergedInto", async () => {
    const user = await makeUser();
    const [assistido] = await db.insert(assistidos).values({
      nome: "Merge Test " + Date.now(), workspaceId: 1,
    } as any).returning();
    const [proc] = await db.insert(processos).values({
      assistidoId: assistido.id, numeroAutos: "MERGE-" + Date.now(), area: "JURI",
    } as any).returning();
    try {
      const caller = createCaller(mkCtx(user));
      const from = await caller.pessoas.create({ nome: "Duplicata A", fonteCriacao: "manual" });
      const into = await caller.pessoas.create({ nome: "Duplicata B", fonteCriacao: "manual" });
      try {
        await caller.pessoas.addParticipacao({
          pessoaId: from.id, processoId: proc.id, papel: "testemunha", fonte: "manual",
        });
        await caller.pessoas.merge({ fromId: from.id, intoId: into.id, reason: "mesma pessoa" });

        const [fromRow] = await db.select().from(pessoas).where(eq(pessoas.id, from.id));
        expect(fromRow.mergedInto).toBe(into.id);
        expect(fromRow.mergeReason).toBe("mesma pessoa");

        const parts = await db
          .select()
          .from(participacoesProcesso)
          .where(eq(participacoesProcesso.pessoaId, into.id));
        expect(parts.some((p) => p.processoId === proc.id)).toBe(true);
      } finally {
        await db.delete(pessoas).where(eq(pessoas.id, from.id));
        await db.delete(pessoas).where(eq(pessoas.id, into.id));
      }
    } finally {
      await db.delete(processos).where(eq(processos.id, proc.id));
      await db.delete(assistidos).where(eq(assistidos.id, assistido.id));
      await db.delete(users).where(eq(users.id, user.id));
    }
  });

  it("markAsDistinct grava em pessoas_distincts_confirmed", async () => {
    const user = await makeUser();
    try {
      const caller = createCaller(mkCtx(user));
      const a = await caller.pessoas.create({ nome: "Distinct A", fonteCriacao: "manual" });
      const b = await caller.pessoas.create({ nome: "Distinct B", fonteCriacao: "manual" });
      try {
        await caller.pessoas.markAsDistinct({ pessoaAId: a.id, pessoaBId: b.id });
        const { pessoasDistinctsConfirmed } = await import("@/lib/db/schema");
        const rows = await db.select().from(pessoasDistinctsConfirmed);
        const pair = rows.find(
          (r) =>
            (r.pessoaAId === a.id && r.pessoaBId === b.id) ||
            (r.pessoaAId === b.id && r.pessoaBId === a.id),
        );
        expect(pair).toBeTruthy();
      } finally {
        await db.delete(pessoas).where(eq(pessoas.id, a.id));
        await db.delete(pessoas).where(eq(pessoas.id, b.id));
      }
    } finally {
      await db.delete(users).where(eq(users.id, user.id));
    }
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

- [ ] **Step 3: Implementar procedures**

Em `pessoas.ts`, antes do `});` final, adicionar:

```ts
  // === MERGE / DEDUP ===
  suggestMerges: protectedProcedure
    .input(z.object({ pessoaId: z.number().optional(), limit: z.number().min(1).max(50).default(20) }))
    .query(async ({ input }) => {
      // Se pessoaId fornecido, busca candidatos dessa pessoa;
      // senão retorna top N pares por similaridade agregada.
      const { pessoasDistinctsConfirmed } = await import("@/lib/db/schema");

      if (input.pessoaId) {
        const [p] = await db.select().from(pessoas).where(eq(pessoas.id, input.pessoaId));
        if (!p) return [];
        const candidates = await db
          .select()
          .from(pessoas)
          .where(
            and(
              eq(pessoas.nomeNormalizado, p.nomeNormalizado),
              sql`${pessoas.id} != ${input.pessoaId}`,
              isNull(pessoas.mergedInto),
            ),
          )
          .limit(input.limit);

        const excluded = await db.select().from(pessoasDistinctsConfirmed);
        const excludedIds = new Set(
          excluded
            .filter((r) => r.pessoaAId === input.pessoaId || r.pessoaBId === input.pessoaId)
            .map((r) => (r.pessoaAId === input.pessoaId ? r.pessoaBId : r.pessoaAId)),
        );
        return candidates.filter((c) => !excludedIds.has(c.id));
      }

      // Sem pessoaId: top pares globais
      const rows = await db.execute<{ a: number; b: number; nome: string }>(sql`
        SELECT p1.id AS a, p2.id AS b, p1.nome_normalizado AS nome
        FROM pessoas p1
        JOIN pessoas p2 ON p1.nome_normalizado = p2.nome_normalizado
          AND p1.id < p2.id
          AND p1.merged_into IS NULL AND p2.merged_into IS NULL
        WHERE NOT EXISTS (
          SELECT 1 FROM pessoas_distincts_confirmed
          WHERE pessoa_a_id = p1.id AND pessoa_b_id = p2.id
        )
        LIMIT ${input.limit}
      `);
      return (rows as any).rows ?? rows;
    }),

  merge: protectedProcedure
    .input(z.object({ fromId: z.number(), intoId: z.number(), reason: z.string().min(3) }))
    .mutation(async ({ input, ctx }) => {
      if (input.fromId === input.intoId) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "fromId = intoId" });
      }
      // Move participações
      await db
        .update(participacoesProcesso)
        .set({ pessoaId: input.intoId, updatedAt: new Date() })
        .where(eq(participacoesProcesso.pessoaId, input.fromId));

      // Marca fromId como merged
      const [row] = await db
        .update(pessoas)
        .set({
          mergedInto: input.intoId,
          mergeReason: input.reason,
          mergedAt: new Date(),
          mergedBy: ctx.user?.id ?? null,
          updatedAt: new Date(),
        })
        .where(eq(pessoas.id, input.fromId))
        .returning();
      if (!row) throw new TRPCError({ code: "NOT_FOUND" });
      return { ok: true };
    }),

  unmerge: protectedProcedure
    .input(z.object({ pessoaId: z.number() }))
    .mutation(async ({ input }) => {
      // Apenas desfaz o flag; não move participações de volta (seria ambíguo)
      const [row] = await db
        .update(pessoas)
        .set({
          mergedInto: null,
          mergeReason: null,
          mergedAt: null,
          mergedBy: null,
          updatedAt: new Date(),
        })
        .where(eq(pessoas.id, input.pessoaId))
        .returning();
      if (!row) throw new TRPCError({ code: "NOT_FOUND" });
      return row;
    }),

  markAsDistinct: protectedProcedure
    .input(z.object({ pessoaAId: z.number(), pessoaBId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const { pessoasDistinctsConfirmed } = await import("@/lib/db/schema");
      const [a, b] = input.pessoaAId < input.pessoaBId
        ? [input.pessoaAId, input.pessoaBId]
        : [input.pessoaBId, input.pessoaAId];
      await db
        .insert(pessoasDistinctsConfirmed)
        .values({
          pessoaAId: a,
          pessoaBId: b,
          confirmadoPor: ctx.user?.id ?? null,
        } as any)
        .onConflictDoNothing();
      return { ok: true };
    }),
```

- [ ] **Step 4: Run — expect PASS**

Run: `npm run test __tests__/trpc/pessoas-router.test.ts`
Expected: todos os testes verdes.

- [ ] **Step 5: Commit**

```bash
git add src/lib/trpc/routers/pessoas.ts __tests__/trpc/pessoas-router.test.ts
git commit -m "feat(pessoas): tRPC merge/unmerge/markAsDistinct + suggestMerges"
```

---

## Task 7: Backfill script

**Files:**
- Create: `scripts/backfill-pessoas.mjs`

- [ ] **Step 1: Implementar script**

Criar `scripts/backfill-pessoas.mjs`:

```js
#!/usr/bin/env node
/**
 * Backfill script: transforma strings existentes em entidades pessoas.
 * Fontes: testemunhas, processos.juiz, processos.promotor, audiencias.juiz,
 * audiencias.promotor, processos.vitima, atendimentos.enrichmentData.persons_mentioned[].
 *
 * Idempotente: re-run não duplica (checa por nome_normalizado + scope).
 * Suporta --dry-run.
 */
import postgres from "postgres";
import * as dotenv from "dotenv";

dotenv.config({ path: "/Users/rodrigorochameire/projetos/Defender/.env.local" });

const DRY = process.argv.includes("--dry-run");

function normalizarNome(s) {
  if (!s) return "";
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(
      /\b(dr|dra|sr|sra|pm|pc|pf|cb|sgt|sub|insp|esc|inv|tte|cabo|soldado)\.?\s+/gi,
      " ",
    )
    .replace(/[^a-z0-9\s]/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const sql = postgres(process.env.DATABASE_URL, { max: 3 });

const counters = {
  pessoasCriadas: 0,
  pessoasExistentes: 0,
  participacoesCriadas: 0,
  warnings: 0,
};

async function getOrCreatePessoa({ nome, fonte, categoriaPrimaria, confidence = 0.9 }) {
  const nomeNorm = normalizarNome(nome);
  if (!nomeNorm || nomeNorm.length < 2) {
    counters.warnings++;
    return null;
  }
  const existing = await sql`
    SELECT id FROM pessoas
    WHERE nome_normalizado = ${nomeNorm}
      AND merged_into IS NULL
    LIMIT 1
  `;
  if (existing.length > 0) {
    counters.pessoasExistentes++;
    return existing[0].id;
  }
  if (DRY) {
    counters.pessoasCriadas++;
    return -1;
  }
  const [row] = await sql`
    INSERT INTO pessoas (nome, nome_normalizado, fonte_criacao, categoria_primaria, confidence)
    VALUES (${nome.trim()}, ${nomeNorm}, ${fonte}, ${categoriaPrimaria}, ${confidence})
    RETURNING id
  `;
  counters.pessoasCriadas++;
  return row.id;
}

async function addParticipacao({ pessoaId, processoId, papel, fonte, testemunhaId, lado, confidence = 0.9 }) {
  if (!pessoaId || pessoaId === -1) return;
  const exists = await sql`
    SELECT id FROM participacoes_processo
    WHERE pessoa_id = ${pessoaId} AND processo_id = ${processoId} AND papel = ${papel}
    LIMIT 1
  `;
  if (exists.length > 0) return;
  if (DRY) {
    counters.participacoesCriadas++;
    return;
  }
  await sql`
    INSERT INTO participacoes_processo
      (pessoa_id, processo_id, papel, lado, testemunha_id, fonte, confidence)
    VALUES
      (${pessoaId}, ${processoId}, ${papel}, ${lado}, ${testemunhaId}, ${fonte}, ${confidence})
    ON CONFLICT DO NOTHING
  `;
  counters.participacoesCriadas++;
}

function papelFromTestemunhaTipo(tipo) {
  switch (tipo) {
    case "VITIMA":
    case "vitima": return { papel: "vitima", lado: "acusacao" };
    case "ACUSACAO": return { papel: "testemunha", lado: "acusacao" };
    case "DEFESA": return { papel: "testemunha-defesa", lado: "defesa" };
    case "INFORMANTE":
    case "informante": return { papel: "informante", lado: "neutro" };
    case "PERITO":
    case "perito": return { papel: "perito-criminal", lado: "neutro" };
    default: return { papel: "testemunha", lado: null };
  }
}

async function main() {
  console.log(DRY ? "DRY RUN — nenhuma inserção real\n" : "BACKFILL\n");

  // 1. Testemunhas
  console.log("1/5 Testemunhas...");
  const testemunhas = await sql`SELECT id, processo_id, nome, tipo FROM testemunhas WHERE nome IS NOT NULL AND nome != ''`;
  for (const t of testemunhas) {
    const { papel, lado } = papelFromTestemunhaTipo(t.tipo);
    const pessoaId = await getOrCreatePessoa({
      nome: t.nome,
      fonte: "backfill",
      categoriaPrimaria: papel,
      confidence: 0.9,
    });
    if (t.processo_id) {
      await addParticipacao({
        pessoaId,
        processoId: t.processo_id,
        papel,
        lado,
        testemunhaId: t.id,
        fonte: "backfill",
      });
    }
  }

  // 2. Juízes de processos
  console.log("2/5 Juízes...");
  const juizesProc = await sql`SELECT id, juiz FROM processos WHERE juiz IS NOT NULL AND juiz != ''`;
  for (const p of juizesProc) {
    const pessoaId = await getOrCreatePessoa({
      nome: p.juiz,
      fonte: "backfill",
      categoriaPrimaria: "juiz",
      confidence: 0.85,
    });
    await addParticipacao({
      pessoaId,
      processoId: p.id,
      papel: "juiz",
      fonte: "backfill",
      confidence: 0.85,
    });
  }

  // 3. Promotores
  console.log("3/5 Promotores...");
  const promotoresProc = await sql`SELECT id, promotor FROM processos WHERE promotor IS NOT NULL AND promotor != ''`;
  for (const p of promotoresProc) {
    const pessoaId = await getOrCreatePessoa({
      nome: p.promotor,
      fonte: "backfill",
      categoriaPrimaria: "promotor",
      confidence: 0.85,
    });
    await addParticipacao({
      pessoaId,
      processoId: p.id,
      papel: "promotor",
      fonte: "backfill",
      confidence: 0.85,
    });
  }

  // 4. Vítimas (string em processos.vitima)
  console.log("4/5 Vítimas (string)...");
  // Verifica se coluna existe primeiro
  const vitimaCol = await sql`
    SELECT column_name FROM information_schema.columns
    WHERE table_name = 'processos' AND column_name = 'vitima'
  `;
  if (vitimaCol.length > 0) {
    const vitimas = await sql`SELECT id, vitima FROM processos WHERE vitima IS NOT NULL AND vitima != ''`;
    for (const v of vitimas) {
      const pessoaId = await getOrCreatePessoa({
        nome: v.vitima,
        fonte: "backfill",
        categoriaPrimaria: "vitima",
        confidence: 0.8,
      });
      await addParticipacao({
        pessoaId,
        processoId: v.id,
        papel: "vitima",
        lado: "acusacao",
        fonte: "backfill",
        confidence: 0.8,
      });
    }
  }

  // 5. Persons mentioned em atendimentos (sem participação — limbo)
  console.log("5/5 Persons mentioned (IA)...");
  const atendimentos = await sql`
    SELECT id, enrichment_data FROM atendimentos
    WHERE enrichment_data IS NOT NULL
      AND enrichment_data::text LIKE '%persons_mentioned%'
  `;
  for (const a of atendimentos) {
    const ed = a.enrichment_data || {};
    const mentioned = Array.isArray(ed.persons_mentioned) ? ed.persons_mentioned : [];
    for (const m of mentioned) {
      const nome = typeof m === "string" ? m : m?.nome;
      if (!nome) continue;
      await getOrCreatePessoa({
        nome,
        fonte: "ia-atendimento",
        categoriaPrimaria: null,
        confidence: 0.5,
      });
    }
  }

  console.log("\n=== Resultado ===");
  console.log(`Pessoas criadas:       ${counters.pessoasCriadas}`);
  console.log(`Pessoas já existentes: ${counters.pessoasExistentes}`);
  console.log(`Participações criadas: ${counters.participacoesCriadas}`);
  console.log(`Warnings (nome vazio/curto): ${counters.warnings}`);

  await sql.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
```

- [ ] **Step 2: Dry-run**

Run: `cd ~/projetos/Defender && node scripts/backfill-pessoas.mjs --dry-run`
Expected: contadores populados, nenhum registro no DB alterado.

- [ ] **Step 3: Rodar de verdade**

Run: `cd ~/projetos/Defender && node scripts/backfill-pessoas.mjs`
Expected: reporte final com contagens reais. Verificar no DB que pessoas foram criadas.

- [ ] **Step 4: Rodar idempotência check**

Run: `cd ~/projetos/Defender && node scripts/backfill-pessoas.mjs`
Expected: todas as contagens `pessoas existentes` altas e `pessoas criadas` próximas de 0.

- [ ] **Step 5: Commit**

```bash
git add scripts/backfill-pessoas.mjs
git commit -m "feat(pessoas): backfill script (idempotente, dry-run)"
```

---

## Task 8: Componente `PessoaChip` silencioso (TDD)

**Files:**
- Create: `src/components/pessoas/pessoa-chip.tsx`
- Create: `src/components/pessoas/index.ts`
- Create: `__tests__/components/pessoas/pessoa-chip.test.tsx`

- [ ] **Step 1: Write failing tests**

```tsx
// __tests__/components/pessoas/pessoa-chip.test.tsx
// @vitest-environment happy-dom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { PessoaChip } from "@/components/pessoas/pessoa-chip";

afterEach(() => cleanup());

describe("PessoaChip (silencioso — Fase I-A)", () => {
  it("renderiza nome passado direto", () => {
    render(<PessoaChip nome="Maria Silva" />);
    expect(screen.getByText("Maria Silva")).toBeInTheDocument();
  });

  it("renderiza ícone de pessoa", () => {
    const { container } = render(<PessoaChip nome="João" />);
    expect(container.querySelector("svg")).toBeTruthy();
  });

  it("mostra papel quando fornecido", () => {
    render(<PessoaChip nome="Maria" papel="testemunha" />);
    expect(screen.getByText(/testemunha/i)).toBeInTheDocument();
  });

  it("chama onClick quando clicável", () => {
    const onClick = vi.fn();
    render(<PessoaChip nome="X" onClick={onClick} />);
    fireEvent.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalled();
  });

  it("não é clicável quando clickable=false", () => {
    render(<PessoaChip nome="Y" clickable={false} />);
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("aplica cor indigo para papéis policiais", () => {
    const { container } = render(<PessoaChip nome="PM João" papel="policial-militar" />);
    expect(container.firstElementChild?.className ?? "").toMatch(/indigo/);
  });

  it("aplica cor emerald para testemunha", () => {
    const { container } = render(<PessoaChip nome="X" papel="testemunha" />);
    expect(container.firstElementChild?.className ?? "").toMatch(/emerald/);
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

Run: `cd ~/projetos/Defender && npm run test __tests__/components/pessoas/pessoa-chip.test.tsx`

- [ ] **Step 3: Implement**

Criar `src/components/pessoas/pessoa-chip.tsx`:

```tsx
"use client";

import { User } from "lucide-react";
import { cn } from "@/lib/utils";

type PapelColor = "neutral" | "rose" | "indigo" | "violet" | "emerald" | "amber" | "slate" | "cyan";

const PAPEL_COLOR_MAP: Record<string, PapelColor> = {
  // Judicial (estáveis, mas ainda com cor neutra quando renderizados)
  juiz: "neutral",
  desembargador: "neutral",
  "servidor-cartorio": "neutral",
  "oficial-justica": "neutral",
  "analista-judiciario": "neutral",
  // MP
  promotor: "rose",
  procurador: "rose",
  // Policial / Investigação
  "autoridade-policial": "indigo",
  "policial-militar": "indigo",
  "policial-civil": "indigo",
  "policial-federal": "indigo",
  "guarda-municipal": "indigo",
  "agente-penitenciario": "indigo",
  // Perícia / Médico
  "perito-criminal": "violet",
  "perito-medico": "violet",
  "medico-legista": "violet",
  "medico-assistente": "violet",
  "psicologo-forense": "violet",
  "psiquiatra-forense": "violet",
  "assistente-social": "violet",
  "tradutor-interprete": "violet",
  // Depoentes
  testemunha: "emerald",
  "testemunha-defesa": "emerald",
  informante: "emerald",
  vitima: "amber",
  // Defesa / Contraparte
  "co-reu": "slate",
  "advogado-parte-contraria": "cyan",
};

const COLOR_CLASSES: Record<PapelColor, string> = {
  neutral: "bg-neutral-50 border-neutral-200 text-neutral-700",
  rose: "bg-rose-50 border-rose-200 text-rose-700",
  indigo: "bg-indigo-50 border-indigo-200 text-indigo-700",
  violet: "bg-violet-50 border-violet-200 text-violet-700",
  emerald: "bg-emerald-50 border-emerald-200 text-emerald-700",
  amber: "bg-amber-50 border-amber-200 text-amber-700",
  slate: "bg-slate-50 border-slate-200 text-slate-700",
  cyan: "bg-cyan-50 border-cyan-200 text-cyan-700",
};

export interface PessoaChipProps {
  pessoaId?: number;
  nome?: string;
  papel?: string;
  size?: "xs" | "sm" | "md";
  clickable?: boolean;
  onClick?: (resolved: { id?: number; nome: string }) => void;
  className?: string;
}

/**
 * Chip silencioso (Fase I-A). Renderiza nome + ícone + cor por papel.
 * Fase I-B adiciona dot de sinalização de inteligência.
 */
export function PessoaChip({
  pessoaId,
  nome,
  papel,
  size = "sm",
  clickable = true,
  onClick,
  className,
}: PessoaChipProps) {
  const color = papel ? PAPEL_COLOR_MAP[papel] ?? "neutral" : "neutral";
  const sizeClass = size === "xs" ? "text-[10px] px-1.5 py-0.5" : size === "md" ? "text-xs px-2.5 py-1" : "text-[11px] px-2 py-0.5";

  const resolved = { id: pessoaId, nome: nome ?? "(sem nome)" };

  const handleClick = () => {
    if (onClick) onClick(resolved);
  };

  const baseClass = cn(
    "inline-flex items-center gap-1 rounded-md border font-medium",
    COLOR_CLASSES[color],
    sizeClass,
    clickable && "cursor-pointer hover:border-neutral-400 transition-colors",
    className,
  );

  const content = (
    <>
      <User className={size === "xs" ? "w-2.5 h-2.5" : "w-3 h-3"} />
      <span className="truncate max-w-[200px]">{nome ?? "(sem nome)"}</span>
      {papel && <span className="text-[9px] opacity-70">{papel.replace(/-/g, " ")}</span>}
    </>
  );

  if (clickable) {
    return (
      <button type="button" onClick={handleClick} className={baseClass}>
        {content}
      </button>
    );
  }

  return <span className={baseClass}>{content}</span>;
}
```

Criar `src/components/pessoas/index.ts`:

```ts
export { PessoaChip } from "./pessoa-chip";
export type { PessoaChipProps } from "./pessoa-chip";
```

- [ ] **Step 4: Run — expect PASS**

Run: `npm run test __tests__/components/pessoas/pessoa-chip.test.tsx`

- [ ] **Step 5: Commit**

```bash
git add src/components/pessoas/pessoa-chip.tsx src/components/pessoas/index.ts __tests__/components/pessoas/pessoa-chip.test.tsx
git commit -m "feat(pessoas): PessoaChip silencioso (cores por papel)"
```

---

## Task 9: Componente `PessoaSheet` (TDD)

**Files:**
- Create: `src/components/pessoas/pessoa-sheet.tsx`
- Modify: `src/components/pessoas/index.ts`
- Create: `__tests__/components/pessoas/pessoa-sheet.test.tsx`

- [ ] **Step 1: Write failing tests**

```tsx
// __tests__/components/pessoas/pessoa-sheet.test.tsx
// @vitest-environment happy-dom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { PessoaSheet } from "@/components/pessoas/pessoa-sheet";

afterEach(() => cleanup());

vi.mock("@/lib/trpc/client", () => ({
  trpc: {
    pessoas: {
      getById: {
        useQuery: vi.fn(() => ({
          data: {
            pessoa: {
              id: 1,
              nome: "Maria Silva",
              nomeNormalizado: "maria silva",
              cpf: null,
              fonteCriacao: "backfill",
              confidence: "0.9",
              categoriaPrimaria: "testemunha",
              createdAt: new Date("2026-01-01").toISOString(),
            },
            participacoes: [
              { id: 10, pessoaId: 1, processoId: 100, papel: "testemunha", lado: "acusacao" },
            ],
          },
          isLoading: false,
        })),
      },
    },
  },
}));

describe("PessoaSheet", () => {
  it("renderiza nome + categoria", () => {
    render(<PessoaSheet pessoaId={1} open onOpenChange={() => {}} />);
    expect(screen.getByText("Maria Silva")).toBeInTheDocument();
  });

  it("não renderiza quando pessoaId é null", () => {
    render(<PessoaSheet pessoaId={null} open={true} onOpenChange={() => {}} />);
    expect(screen.queryByText("Maria Silva")).toBeNull();
  });

  it("mostra tabs", () => {
    render(<PessoaSheet pessoaId={1} open onOpenChange={() => {}} />);
    expect(screen.getByRole("tab", { name: /visão geral/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /processos/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /mídias/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /proveniência/i })).toBeInTheDocument();
  });

  it("tab processos mostra participações", () => {
    render(<PessoaSheet pessoaId={1} open onOpenChange={() => {}} />);
    fireEvent.click(screen.getByRole("tab", { name: /processos/i }));
    expect(screen.getByText(/testemunha/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

- [ ] **Step 3: Implement**

Criar `src/components/pessoas/pessoa-sheet.tsx`:

```tsx
"use client";

import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { X } from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";
import { PessoaChip } from "./pessoa-chip";

interface Props {
  pessoaId: number | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Tab = "visao" | "processos" | "midias" | "proveniencia";

export function PessoaSheet({ pessoaId, open, onOpenChange }: Props) {
  const [tab, setTab] = useState<Tab>("visao");
  const { data, isLoading } = trpc.pessoas.getById.useQuery(
    { id: pessoaId ?? 0 },
    { enabled: !!pessoaId && open, retry: false },
  );

  if (!pessoaId) return null;

  const pessoa = data?.pessoa;
  const participacoes = data?.participacoes ?? [];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:w-[520px] p-0 flex flex-col gap-0">
        <div className="bg-neutral-100/95 dark:bg-neutral-900/95 backdrop-blur-md border-b border-neutral-200/40 px-4 py-3 flex items-center justify-between">
          <SheetHeader className="p-0">
            <SheetTitle className="text-sm font-semibold">Pessoa</SheetTitle>
          </SheetHeader>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="w-7 h-7 rounded-lg hover:bg-neutral-200/60 flex items-center justify-center cursor-pointer"
            aria-label="Fechar"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {isLoading && <p className="p-4 text-xs text-neutral-500">Carregando…</p>}
          {!isLoading && !pessoa && (
            <p className="p-4 text-xs text-neutral-500">Pessoa não encontrada</p>
          )}
          {!isLoading && pessoa && (
            <>
              <div className="px-4 pt-4 pb-2">
                <h2 className="text-base font-semibold text-neutral-800 dark:text-neutral-200">
                  {pessoa.nome}
                </h2>
                {pessoa.categoriaPrimaria && (
                  <p className="text-xs text-neutral-500 mt-0.5">{pessoa.categoriaPrimaria}</p>
                )}
              </div>

              <div role="tablist" className="flex border-b border-neutral-200 px-2">
                {(["visao", "processos", "midias", "proveniencia"] as Tab[]).map((t) => (
                  <button
                    key={t}
                    type="button"
                    role="tab"
                    aria-selected={tab === t}
                    onClick={() => setTab(t)}
                    className={cn(
                      "px-3 py-2 text-[11px] font-medium border-b-2 cursor-pointer",
                      tab === t ? "border-foreground text-foreground" : "border-transparent text-neutral-500",
                    )}
                  >
                    {t === "visao" ? "Visão geral" : t === "processos" ? "Processos" : t === "midias" ? "Mídias" : "Proveniência"}
                  </button>
                ))}
              </div>

              <div className="p-4">
                {tab === "visao" && (
                  <div className="space-y-3 text-xs">
                    <div>
                      <div className="text-[10px] text-neutral-400 uppercase mb-1">CPF</div>
                      <div>{pessoa.cpf ?? "—"}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-neutral-400 uppercase mb-1">Total de participações</div>
                      <div>{participacoes.length}</div>
                    </div>
                  </div>
                )}

                {tab === "processos" && (
                  <div className="space-y-2">
                    {participacoes.length === 0 && (
                      <p className="text-xs text-neutral-400 italic">Nenhuma participação registrada.</p>
                    )}
                    {participacoes.map((p: any) => (
                      <div key={p.id} className="rounded-lg border border-neutral-200 p-2 text-xs">
                        <div className="flex items-center gap-2">
                          <PessoaChip nome={pessoa.nome} papel={p.papel} clickable={false} size="xs" />
                          <span className="text-neutral-500">processo #{p.processoId}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {tab === "midias" && (
                  <p className="text-xs text-neutral-400 italic">Nenhuma mídia vinculada.</p>
                )}

                {tab === "proveniencia" && (
                  <div className="space-y-3 text-xs">
                    <div>
                      <div className="text-[10px] text-neutral-400 uppercase mb-1">Fonte de criação</div>
                      <div>{pessoa.fonteCriacao}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-neutral-400 uppercase mb-1">Confidence</div>
                      <div>{pessoa.confidence}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-neutral-400 uppercase mb-1">Criada em</div>
                      <div>{new Date(pessoa.createdAt as any).toLocaleString("pt-BR")}</div>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
```

Atualizar `src/components/pessoas/index.ts`:

```ts
export { PessoaChip } from "./pessoa-chip";
export type { PessoaChipProps } from "./pessoa-chip";
export { PessoaSheet } from "./pessoa-sheet";
```

- [ ] **Step 4: Run — expect PASS**

Run: `npm run test __tests__/components/pessoas/pessoa-sheet.test.tsx`

- [ ] **Step 5: Commit**

```bash
git add src/components/pessoas/pessoa-sheet.tsx src/components/pessoas/index.ts __tests__/components/pessoas/pessoa-sheet.test.tsx
git commit -m "feat(pessoas): PessoaSheet com 4 tabs silenciosas"
```

---

## Task 10: Página `/admin/pessoas` — catálogo

**Files:**
- Create: `src/app/(dashboard)/admin/pessoas/page.tsx`

- [ ] **Step 1: Implementar**

```tsx
// src/app/(dashboard)/admin/pessoas/page.tsx
"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { PessoaChip, PessoaSheet } from "@/components/pessoas";
import { Plus } from "lucide-react";

export default function PessoasPage() {
  const [search, setSearch] = useState("");
  const [offset, setOffset] = useState(0);
  const [sheetId, setSheetId] = useState<number | null>(null);

  const { data, isLoading } = trpc.pessoas.list.useQuery({
    search: search || undefined,
    limit: 50,
    offset,
  });

  const items = data?.items ?? [];
  const total = data?.total ?? 0;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold">Pessoas</h1>
          <p className="text-xs text-neutral-500 mt-1">Catálogo global — {total} pessoas</p>
        </div>
        <Link href="/admin/pessoas/nova">
          <Button size="sm"><Plus className="w-3.5 h-3.5 mr-1.5" /> Nova pessoa</Button>
        </Link>
      </div>

      <div className="mb-4">
        <Input
          placeholder="Buscar por nome…"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setOffset(0); }}
          className="max-w-md"
        />
      </div>

      <div className="border rounded-lg">
        <table className="w-full text-sm">
          <thead className="bg-neutral-50 text-xs text-neutral-500">
            <tr>
              <th className="text-left px-3 py-2 font-medium">Nome</th>
              <th className="text-left px-3 py-2 font-medium">Categoria</th>
              <th className="text-left px-3 py-2 font-medium">Fonte</th>
              <th className="text-left px-3 py-2 font-medium">Confidence</th>
              <th className="text-left px-3 py-2 font-medium">Criada</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && <tr><td colSpan={5} className="px-3 py-4 text-center text-neutral-500 text-xs">Carregando…</td></tr>}
            {!isLoading && items.length === 0 && (
              <tr><td colSpan={5} className="px-3 py-4 text-center text-neutral-500 text-xs">Nenhuma pessoa encontrada.</td></tr>
            )}
            {items.map((p) => (
              <tr key={p.id} className="border-t hover:bg-neutral-50/50 cursor-pointer" onClick={() => setSheetId(p.id)}>
                <td className="px-3 py-2">
                  <PessoaChip nome={p.nome} papel={p.categoriaPrimaria ?? undefined} clickable={false} size="sm" />
                </td>
                <td className="px-3 py-2 text-xs text-neutral-600">{p.categoriaPrimaria ?? "—"}</td>
                <td className="px-3 py-2 text-xs text-neutral-500">{p.fonteCriacao}</td>
                <td className="px-3 py-2 text-xs text-neutral-500">{p.confidence}</td>
                <td className="px-3 py-2 text-xs text-neutral-500">{new Date(p.createdAt as any).toLocaleDateString("pt-BR")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {total > 50 && (
        <div className="flex items-center justify-between mt-4">
          <Button size="sm" variant="outline" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - 50))}>
            Anterior
          </Button>
          <span className="text-xs text-neutral-500">{offset + 1}–{Math.min(offset + 50, total)} de {total}</span>
          <Button size="sm" variant="outline" disabled={offset + 50 >= total} onClick={() => setOffset(offset + 50)}>
            Próxima
          </Button>
        </div>
      )}

      <PessoaSheet pessoaId={sheetId} open={sheetId !== null} onOpenChange={(o) => !o && setSheetId(null)} />
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `cd ~/projetos/Defender && npm run typecheck`
Expected: 0 new errors.

- [ ] **Step 3: Commit**

```bash
git add 'src/app/(dashboard)/admin/pessoas/page.tsx'
git commit -m "feat(pessoas): página /admin/pessoas catálogo"
```

---

## Task 11: Página detalhe `/admin/pessoas/[id]` + criar

**Files:**
- Create: `src/app/(dashboard)/admin/pessoas/[id]/page.tsx`
- Create: `src/app/(dashboard)/admin/pessoas/nova/page.tsx`
- Create: `src/components/pessoas/pessoa-form.tsx`

- [ ] **Step 1: Implementar página de detalhe (reusa sheet)**

```tsx
// src/app/(dashboard)/admin/pessoas/[id]/page.tsx
"use client";

import { useParams, useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import { PessoaChip } from "@/components/pessoas";
import { ArrowLeft, Edit2, GitMerge, Trash2 } from "lucide-react";
import Link from "next/link";

export default function PessoaDetalhePage() {
  const params = useParams();
  const router = useRouter();
  const id = Number(params.id);
  const { data, isLoading } = trpc.pessoas.getById.useQuery({ id }, { enabled: !isNaN(id) });

  if (isLoading) return <div className="p-6 text-sm text-neutral-500">Carregando…</div>;
  if (!data) return <div className="p-6 text-sm text-neutral-500">Pessoa não encontrada</div>;

  const { pessoa, participacoes } = data;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <Link href="/admin/pessoas" className="text-xs text-neutral-500 hover:text-neutral-700 inline-flex items-center gap-1 mb-4">
        <ArrowLeft className="w-3 h-3" /> Voltar ao catálogo
      </Link>

      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold">{pessoa.nome}</h1>
          <p className="text-sm text-neutral-500 mt-1">{pessoa.categoriaPrimaria ?? "sem categoria"}</p>
          <div className="flex gap-2 mt-3">
            <PessoaChip nome={pessoa.nome} papel={pessoa.categoriaPrimaria ?? undefined} clickable={false} />
            <span className="text-xs text-neutral-400 self-center">confidence {pessoa.confidence}</span>
          </div>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline"><Edit2 className="w-3.5 h-3.5 mr-1.5" /> Editar</Button>
          <Button size="sm" variant="outline"><GitMerge className="w-3.5 h-3.5 mr-1.5" /> Mesclar</Button>
        </div>
      </div>

      <div className="space-y-6">
        <section>
          <h2 className="text-sm font-semibold mb-2">Participações ({participacoes.length})</h2>
          {participacoes.length === 0 && <p className="text-xs text-neutral-400 italic">Nenhuma participação.</p>}
          <ul className="space-y-1">
            {participacoes.map((p: any) => (
              <li key={p.id} className="flex items-center gap-2 text-sm">
                <PessoaChip nome={pessoa.nome} papel={p.papel} clickable={false} size="xs" />
                <Link href={`/admin/processos/${p.processoId}`} className="text-xs text-blue-600 hover:underline">
                  Processo #{p.processoId}
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h2 className="text-sm font-semibold mb-2">Dados</h2>
          <dl className="text-xs space-y-1">
            {pessoa.cpf && <div><dt className="text-neutral-400 inline">CPF:</dt> <dd className="inline ml-1">{pessoa.cpf}</dd></div>}
            {pessoa.rg && <div><dt className="text-neutral-400 inline">RG:</dt> <dd className="inline ml-1">{pessoa.rg}</dd></div>}
            {pessoa.telefone && <div><dt className="text-neutral-400 inline">Tel:</dt> <dd className="inline ml-1">{pessoa.telefone}</dd></div>}
            {pessoa.observacoes && <div><dt className="text-neutral-400 inline">Obs:</dt> <dd className="inline ml-1">{pessoa.observacoes}</dd></div>}
          </dl>
        </section>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Implementar formulário**

Criar `src/components/pessoas/pessoa-form.tsx`:

```tsx
"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface Props {
  initial?: {
    nome?: string;
    cpf?: string;
    rg?: string;
    telefone?: string;
    endereco?: string;
    observacoes?: string;
    categoriaPrimaria?: string;
  };
  onSubmit: (data: any) => void;
  submitting?: boolean;
}

export function PessoaForm({ initial, onSubmit, submitting }: Props) {
  const [form, setForm] = useState({
    nome: initial?.nome ?? "",
    cpf: initial?.cpf ?? "",
    rg: initial?.rg ?? "",
    telefone: initial?.telefone ?? "",
    endereco: initial?.endereco ?? "",
    observacoes: initial?.observacoes ?? "",
    categoriaPrimaria: initial?.categoriaPrimaria ?? "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      ...form,
      cpf: form.cpf || undefined,
      rg: form.rg || undefined,
      telefone: form.telefone || undefined,
      endereco: form.endereco || undefined,
      observacoes: form.observacoes || undefined,
      categoriaPrimaria: form.categoriaPrimaria || undefined,
      fonteCriacao: "manual",
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-xl">
      <div>
        <Label htmlFor="nome">Nome *</Label>
        <Input id="nome" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} required />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="cpf">CPF</Label>
          <Input id="cpf" value={form.cpf} onChange={(e) => setForm({ ...form, cpf: e.target.value })} />
        </div>
        <div>
          <Label htmlFor="rg">RG</Label>
          <Input id="rg" value={form.rg} onChange={(e) => setForm({ ...form, rg: e.target.value })} />
        </div>
      </div>
      <div>
        <Label htmlFor="categoria">Categoria primária</Label>
        <Input
          id="categoria"
          value={form.categoriaPrimaria}
          onChange={(e) => setForm({ ...form, categoriaPrimaria: e.target.value })}
          placeholder="ex: testemunha, policial-militar, perito-criminal"
        />
      </div>
      <div>
        <Label htmlFor="telefone">Telefone</Label>
        <Input id="telefone" value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })} />
      </div>
      <div>
        <Label htmlFor="endereco">Endereço</Label>
        <Input id="endereco" value={form.endereco} onChange={(e) => setForm({ ...form, endereco: e.target.value })} />
      </div>
      <div>
        <Label htmlFor="obs">Observações</Label>
        <Textarea id="obs" rows={3} value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} />
      </div>
      <Button type="submit" disabled={submitting || !form.nome.trim()}>
        {submitting ? "Salvando…" : "Criar pessoa"}
      </Button>
    </form>
  );
}
```

Exportar em `src/components/pessoas/index.ts`:

```ts
export { PessoaForm } from "./pessoa-form";
```

- [ ] **Step 3: Página /nova**

Criar `src/app/(dashboard)/admin/pessoas/nova/page.tsx`:

```tsx
"use client";

import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc/client";
import { PessoaForm } from "@/components/pessoas";
import { toast } from "sonner";

export default function NovaPessoaPage() {
  const router = useRouter();
  const create = trpc.pessoas.create.useMutation({
    onSuccess: (p) => {
      toast.success("Pessoa criada");
      router.push(`/admin/pessoas/${p.id}`);
    },
    onError: (e) => toast.error(e.message ?? "Erro"),
  });

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-xl font-semibold mb-6">Nova pessoa</h1>
      <PessoaForm onSubmit={(data) => create.mutate(data)} submitting={create.isPending} />
    </div>
  );
}
```

- [ ] **Step 4: Typecheck**

Run: `npm run typecheck`
Expected: 0 new errors.

- [ ] **Step 5: Commit**

```bash
git add 'src/app/(dashboard)/admin/pessoas/[id]/page.tsx' 'src/app/(dashboard)/admin/pessoas/nova/page.tsx' src/components/pessoas/pessoa-form.tsx src/components/pessoas/index.ts
git commit -m "feat(pessoas): páginas /[id] + /nova com PessoaForm"
```

---

## Task 12: Merge-queue `/admin/pessoas/merge-queue`

**Files:**
- Create: `src/app/(dashboard)/admin/pessoas/merge-queue/page.tsx`
- Create: `src/components/pessoas/merge-pair-card.tsx`
- Create: `__tests__/components/pessoas/merge-pair-card.test.tsx`

- [ ] **Step 1: Write failing test para MergePairCard**

```tsx
// __tests__/components/pessoas/merge-pair-card.test.tsx
// @vitest-environment happy-dom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { MergePairCard } from "@/components/pessoas/merge-pair-card";

afterEach(() => cleanup());

const pair = {
  a: { id: 42, nome: "Maria Silva", cpf: null, categoriaPrimaria: "testemunha", confidence: "0.9" },
  b: { id: 87, nome: "Maria Silva", cpf: null, categoriaPrimaria: "testemunha", confidence: "0.9" },
};

describe("MergePairCard", () => {
  it("mostra nomes dos dois lados", () => {
    render(<MergePairCard pair={pair} onMerge={() => {}} onDistinct={() => {}} />);
    expect(screen.getAllByText("Maria Silva")).toHaveLength(2);
  });

  it("dispara onMerge com direção correta", () => {
    const onMerge = vi.fn();
    render(<MergePairCard pair={pair} onMerge={onMerge} onDistinct={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: /mesclar em #42/i }));
    expect(onMerge).toHaveBeenCalledWith({ fromId: 87, intoId: 42 });
  });

  it("dispara onDistinct", () => {
    const onDistinct = vi.fn();
    render(<MergePairCard pair={pair} onMerge={() => {}} onDistinct={onDistinct} />);
    fireEvent.click(screen.getByRole("button", { name: /distintas/i }));
    expect(onDistinct).toHaveBeenCalledWith({ pessoaAId: 42, pessoaBId: 87 });
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

- [ ] **Step 3: Implement MergePairCard**

```tsx
// src/components/pessoas/merge-pair-card.tsx
"use client";

import { Button } from "@/components/ui/button";
import { PessoaChip } from "./pessoa-chip";

interface Pessoa {
  id: number;
  nome: string;
  cpf?: string | null;
  categoriaPrimaria?: string | null;
  confidence?: string;
}

interface Props {
  pair: { a: Pessoa; b: Pessoa };
  onMerge: (args: { fromId: number; intoId: number }) => void;
  onDistinct: (args: { pessoaAId: number; pessoaBId: number }) => void;
}

export function MergePairCard({ pair, onMerge, onDistinct }: Props) {
  return (
    <div className="border rounded-lg p-4 space-y-3">
      <h3 className="text-sm font-semibold">Possível duplicata: "{pair.a.nome}"</h3>
      <div className="grid grid-cols-2 gap-3">
        {[pair.a, pair.b].map((p) => (
          <div key={p.id} className="border rounded p-3 text-xs space-y-1 bg-neutral-50">
            <PessoaChip nome={p.nome} papel={p.categoriaPrimaria ?? undefined} clickable={false} size="sm" />
            <div><span className="text-neutral-400">#</span>{p.id}</div>
            <div><span className="text-neutral-400">CPF:</span> {p.cpf ?? "—"}</div>
            <div><span className="text-neutral-400">Cat:</span> {p.categoriaPrimaria ?? "—"}</div>
            <div><span className="text-neutral-400">Conf:</span> {p.confidence}</div>
          </div>
        ))}
      </div>
      <div className="flex gap-2 justify-end">
        <Button size="sm" variant="outline" onClick={() => onMerge({ fromId: pair.b.id, intoId: pair.a.id })}>
          Mesclar em #{pair.a.id}
        </Button>
        <Button size="sm" variant="outline" onClick={() => onMerge({ fromId: pair.a.id, intoId: pair.b.id })}>
          Mesclar em #{pair.b.id}
        </Button>
        <Button size="sm" variant="ghost" onClick={() => onDistinct({ pessoaAId: pair.a.id, pessoaBId: pair.b.id })}>
          São distintas
        </Button>
      </div>
    </div>
  );
}
```

Export em `index.ts`:

```ts
export { MergePairCard } from "./merge-pair-card";
```

- [ ] **Step 4: Implementar página /merge-queue**

Criar `src/app/(dashboard)/admin/pessoas/merge-queue/page.tsx`:

```tsx
"use client";

import { trpc } from "@/lib/trpc/client";
import { MergePairCard } from "@/components/pessoas";
import { toast } from "sonner";

export default function MergeQueuePage() {
  const utils = trpc.useUtils();
  const { data, isLoading, refetch } = trpc.pessoas.suggestMerges.useQuery({ limit: 50 });
  const merge = trpc.pessoas.merge.useMutation({
    onSuccess: () => { toast.success("Mescladas"); refetch(); },
    onError: (e) => toast.error(e.message),
  });
  const markDistinct = trpc.pessoas.markAsDistinct.useMutation({
    onSuccess: () => { toast.success("Marcadas como distintas"); refetch(); },
    onError: (e) => toast.error(e.message),
  });

  // O suggestMerges retorna pares no modo global (rows com a, b, nome)
  const pairs = (data as any)?.rows ?? data ?? [];

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-semibold">Fila de duplicatas</h1>
        <p className="text-xs text-neutral-500 mt-1">Pares de pessoas com mesmo nome normalizado — confirme</p>
      </div>

      {isLoading && <p className="text-sm text-neutral-500">Carregando…</p>}
      {!isLoading && pairs.length === 0 && (
        <p className="text-sm text-neutral-400 italic">Nenhuma duplicata sugerida.</p>
      )}

      <div className="space-y-4">
        {pairs.map((row: any) => (
          <MergePairPairLoader
            key={`${row.a}-${row.b}`}
            aId={row.a}
            bId={row.b}
            onMerge={(args) => merge.mutate({ ...args, reason: "merge manual via queue" })}
            onDistinct={(args) => markDistinct.mutate(args)}
          />
        ))}
      </div>
    </div>
  );
}

function MergePairPairLoader({ aId, bId, onMerge, onDistinct }: any) {
  const a = trpc.pessoas.getById.useQuery({ id: aId });
  const b = trpc.pessoas.getById.useQuery({ id: bId });
  if (!a.data || !b.data) return <div className="text-xs text-neutral-400">Carregando par…</div>;
  return (
    <MergePairCard
      pair={{ a: a.data.pessoa, b: b.data.pessoa }}
      onMerge={onMerge}
      onDistinct={onDistinct}
    />
  );
}
```

- [ ] **Step 5: Run — expect PASS**

Run: `npm run test __tests__/components/pessoas/merge-pair-card.test.tsx`

- [ ] **Step 6: Commit**

```bash
git add 'src/app/(dashboard)/admin/pessoas/merge-queue/page.tsx' src/components/pessoas/merge-pair-card.tsx src/components/pessoas/index.ts __tests__/components/pessoas/merge-pair-card.test.tsx
git commit -m "feat(pessoas): merge-queue + MergePairCard"
```

---

## Task 13: Manual verification

**Files:** nenhum (checklist).

- [ ] **Step 1: Dev server**

```bash
cd ~/projetos/Defender && rm -rf .next/cache && npm run dev:webpack
```

- [ ] **Step 2: Verificar**

- [ ] `/admin/pessoas` carrega, mostra catálogo do backfill
- [ ] Busca funciona (digitar nome → filtra)
- [ ] Paginação funciona com 50+ pessoas
- [ ] Click em linha abre `PessoaSheet` com 4 tabs
- [ ] Tab Processos mostra participações (se pessoa tem)
- [ ] Click em "Nova pessoa" → `/admin/pessoas/nova` → form → cria → redireciona pra detalhe
- [ ] `/admin/pessoas/[id]` renderiza detalhe com botões Editar/Mesclar
- [ ] `/admin/pessoas/merge-queue` lista pares; click em "Mesclar em #X" mescla; click em "Distintas" marca
- [ ] Nenhuma regressão em outras páginas (assistidos, processos, agenda)
- [ ] Zero edição em `src/components/agenda/**` ou `src/components/agenda/registro-audiencia/**`

- [ ] **Step 3: Commit de marcação**

```bash
git commit --allow-empty -m "chore(pessoas): Fase I-A validada manualmente"
```

---

## Self-Review

**Spec coverage:**

| Requisito da spec | Task(s) |
|---|---|
| Schema `pessoas` + `participacoes_processo` + `pessoas_distincts_confirmed` | Task 1 |
| Extension `pg_trgm` | Task 1 |
| Normalização `normalizarNome` | Task 2 |
| `PAPEIS_ROTATIVOS` config | Task 3 |
| Taxonomia de papéis completa | Task 3 |
| tRPC CRUD (create, list, getById, update, delete) | Task 4 |
| tRPC participações (add, update, remove, getDoProcesso) | Task 5 |
| tRPC busca (searchForAutocomplete, getByCpf) | Task 5 |
| tRPC merge (suggestMerges, merge, unmerge, markAsDistinct) | Task 6 |
| Backfill (testemunhas, juízes, promotores, vítimas, persons_mentioned) | Task 7 |
| `PessoaChip` silencioso com cores por papel | Task 8 |
| `PessoaSheet` com 4 tabs (visão, processos, mídias, proveniência) | Task 9 |
| `/admin/pessoas` catálogo | Task 10 |
| `/admin/pessoas/[id]` detalhe | Task 11 |
| `/admin/pessoas/nova` + `PessoaForm` | Task 11 |
| `/admin/pessoas/merge-queue` + `MergePairCard` | Task 12 |
| LGPD: observações sensíveis (protegido via escopo existente) | Task 4-6 (seguem pattern da app) |
| Nenhum outro arquivo fora de `src/components/pessoas/`, `src/lib/pessoas/`, etc | Tasks 1-12 isoladas |
| Audit logs gravados em merge | Infra existente `audit_logs` — a integração fica como polish futuro (I-A marca `merged_by` em pessoas) |
| Manual | Task 13 |

**Placeholders:** nenhum.

**Type consistency:**
- `papelEnum` em Task 4 é baseado em `PAPEIS_VALIDOS` da Task 3.
- `PessoaChipProps` em Task 8 consumido em Task 9 e Task 10.
- `MergePairCard` Task 12 reutiliza tipo `Pessoa` compatível com retorno de `getById`.
- `participacoes` em Task 5 atualização do `getById` coincide com o consumo em Task 9 e 11.

Plano coerente. 13 tasks, ~15 commits esperados. Todo o trabalho isolado em `src/components/pessoas/`, `src/lib/pessoas/`, `src/lib/trpc/routers/pessoas.ts`, `src/lib/db/schema/pessoas.ts`, `scripts/backfill-pessoas.mjs` e `src/app/(dashboard)/admin/pessoas/`. Zero edição em arquivos da agenda.
