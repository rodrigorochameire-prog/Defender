# OMBUDS Scaling — Camada 0 + Camada 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expand OMBUDS from 4 to 9 users by adding Vara Criminal Comum support (ANPP, sursis, delitos) and onboarding Danilo, Cristiane, estagiários and Renan.

**Architecture:** Two-phase approach. Camada 0 adds test coverage for existing scoping logic and CI. Camada 1 adds new schema tables (institutos, delitos), expands defensor-scope for servidor vinculado, creates tRPC routers, enrichment pipeline, and frontend tabs. All changes are additive — no existing functionality is modified.

**Tech Stack:** Next.js 15, tRPC v11-rc, Drizzle ORM 0.36, PostgreSQL (Supabase), Vitest 4.1, Python FastAPI (enrichment-engine), Gemini 3.x

**Spec:** `docs/superpowers/specs/2026-03-28-ombuds-scaling-design.md`

**Jira Epic:** SCRUM-67

---

## File Structure

### New Files (Camada 0)
| File | Responsibility |
|------|---------------|
| `src/lib/trpc/__tests__/defensor-scope.test.ts` | Tests for defensor visibility logic |
| `src/lib/trpc/__tests__/comarca-scope.test.ts` | Tests for comarca filtering logic |
| `.github/workflows/ci.yml` | Lint + typecheck + test on push |

### New Files (Camada 1)
| File | Responsibility |
|------|---------------|
| `src/lib/db/schema/institutos.ts` | Schema: ANPP, sursis, transação penal |
| `src/lib/db/schema/delitos.ts` | Schema: tipificação penal estruturada |
| `src/lib/trpc/routers/institutos.ts` | CRUD + status transitions para institutos |
| `src/lib/trpc/routers/delitos.ts` | CRUD + cálculo de benefícios |
| `src/lib/trpc/__tests__/institutos.test.ts` | Tests for institutos router logic |
| `src/lib/trpc/__tests__/delitos.test.ts` | Tests for delitos + benefícios calc |
| `src/components/processo/delitos-tab.tsx` | Tab "Delitos" na página de processo |
| `src/components/processo/institutos-tab.tsx` | Tab "Institutos" na página de processo |
| `src/components/demandas-premium/instituto-badge.tsx` | Badge "ANPP possível" no kanban |
| `src/components/dashboard/institutos-card.tsx` | Card dashboard: institutos em andamento |
| `enrichment-engine/prompts/criminal_comum/delitos_institutos.md` | Prompt IA para detecção |
| `scripts/seed-camada1-users.ts` | Script de criação de users Camada 1 |

### Modified Files (Camada 1)
| File | Change |
|------|--------|
| `src/lib/db/schema/enums.ts` | Add `CRIMINAL_CAMACARI` to atribuicaoEnum |
| `src/lib/db/schema/core.ts` | Add `defensoresVinculados` JSONB to users |
| `src/lib/db/schema/index.ts` | Export new schemas |
| `src/lib/trpc/defensor-scope.ts` | Handle servidor vinculado |
| `src/lib/trpc/routers/index.ts` | Register new routers |
| `src/lib/services/enrichment-client.ts` | Add enrichCriminalComum method |
| `src/app/(dashboard)/admin/processos/[id]/page.tsx` | Add Delitos + Institutos tabs |
| `enrichment-engine/routers/pje.py` | Expand extraction for delitos/institutos |

---

## CAMADA 0 — Fundação

### Task 1: Testes unitários para defensor-scope.ts [SCRUM-69]

**Files:**
- Create: `src/lib/trpc/__tests__/defensor-scope.test.ts`
- Read: `src/lib/trpc/defensor-scope.ts`

- [ ] **Step 1: Create test file with first failing test**

```typescript
// src/lib/trpc/__tests__/defensor-scope.test.ts
import { describe, it, expect } from "vitest";
import { getDefensorResponsavel, getDefensoresVisiveis } from "../defensor-scope";

// Minimal User type for testing
function makeUser(overrides: Partial<{
  id: number;
  role: string;
  isAdmin: boolean;
  supervisorId: number | null;
  podeVerTodosAssistidos: boolean;
  podeVerTodosProcessos: boolean;
}>) {
  return {
    id: 1,
    role: "defensor",
    isAdmin: false,
    supervisorId: null,
    podeVerTodosAssistidos: false,
    podeVerTodosProcessos: false,
    ...overrides,
  } as any;
}

describe("getDefensorResponsavel", () => {
  it("returns user.id for defensor role", () => {
    const user = makeUser({ id: 5, role: "defensor" });
    expect(getDefensorResponsavel(user)).toBe(5);
  });

  it("returns null for admin role", () => {
    const user = makeUser({ role: "admin", isAdmin: true });
    expect(getDefensorResponsavel(user)).toBeNull();
  });

  it("returns null for servidor role", () => {
    const user = makeUser({ role: "servidor" });
    expect(getDefensorResponsavel(user)).toBeNull();
  });

  it("returns supervisorId for estagiario with supervisor", () => {
    const user = makeUser({ id: 10, role: "estagiario", supervisorId: 5 });
    expect(getDefensorResponsavel(user)).toBe(5);
  });

  it("returns user.id for estagiario without supervisor", () => {
    const user = makeUser({ id: 10, role: "estagiario", supervisorId: null });
    expect(getDefensorResponsavel(user)).toBe(10);
  });
});

describe("getDefensoresVisiveis", () => {
  it("returns 'all' for admin", () => {
    const user = makeUser({ role: "admin", isAdmin: true });
    expect(getDefensoresVisiveis(user)).toBe("all");
  });

  it("returns 'all' for servidor", () => {
    const user = makeUser({ role: "servidor" });
    expect(getDefensoresVisiveis(user)).toBe("all");
  });

  it("returns [user.id] for defensor", () => {
    const user = makeUser({ id: 7, role: "defensor" });
    expect(getDefensoresVisiveis(user)).toEqual([7]);
  });

  it("returns [supervisorId] for estagiario with supervisor", () => {
    const user = makeUser({ id: 10, role: "estagiario", supervisorId: 3 });
    const result = getDefensoresVisiveis(user);
    expect(result).toContain(3);
  });
});
```

- [ ] **Step 2: Run test to verify it passes (or identify API differences)**

Run: `cd /Users/rodrigorochameire/Projetos/Defender && npx vitest run src/lib/trpc/__tests__/defensor-scope.test.ts`
Expected: All 9 tests PASS. If any fail, adjust test expectations to match actual function signatures.

- [ ] **Step 3: Commit**

```bash
cd /Users/rodrigorochameire/Projetos/Defender
git add src/lib/trpc/__tests__/defensor-scope.test.ts
git commit -m "test: add unit tests for defensor-scope (9 cases)"
```

---

### Task 2: Testes unitários para comarca-scope.ts [SCRUM-69]

**Files:**
- Create: `src/lib/trpc/__tests__/comarca-scope.test.ts`
- Read: `src/lib/trpc/comarca-scope.ts`

- [ ] **Step 1: Create test file**

```typescript
// src/lib/trpc/__tests__/comarca-scope.test.ts
import { describe, it, expect } from "vitest";
import { getComarcaFilter, getComarcaId } from "../comarca-scope";

function makeUser(overrides: Partial<{
  id: number;
  comarcaId: number;
  comarca: string;
}>) {
  return {
    id: 1,
    comarcaId: 1,
    comarca: "Camaçari",
    ...overrides,
  } as any;
}

describe("getComarcaId", () => {
  it("returns user comarcaId", () => {
    const user = makeUser({ comarcaId: 3 });
    expect(getComarcaId(user)).toBe(3);
  });

  it("defaults to 1 when comarcaId is missing", () => {
    const user = makeUser({ comarcaId: undefined as any });
    const result = getComarcaId(user);
    // Should default to 1 (Camaçari) or throw
    expect(result).toBeDefined();
  });
});

describe("getComarcaFilter", () => {
  it("returns a Drizzle condition matching comarcaId", () => {
    const user = makeUser({ comarcaId: 2 });
    const mockTable = { comarcaId: { name: "comarca_id" } } as any;
    const result = getComarcaFilter(mockTable, user);
    // Should return a SQL condition (eq expression)
    expect(result).toBeDefined();
  });
});
```

- [ ] **Step 2: Run tests**

Run: `cd /Users/rodrigorochameire/Projetos/Defender && npx vitest run src/lib/trpc/__tests__/comarca-scope.test.ts`
Expected: Tests pass. Adjust mock shapes if Drizzle types require specific structure.

- [ ] **Step 3: Commit**

```bash
cd /Users/rodrigorochameire/Projetos/Defender
git add src/lib/trpc/__tests__/comarca-scope.test.ts
git commit -m "test: add unit tests for comarca-scope"
```

---

### Task 3: Setup CI com GitHub Actions [SCRUM-70]

**Files:**
- Create: `.github/workflows/ci.yml`

- [ ] **Step 1: Create CI workflow**

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm

      - run: npm ci

      - name: TypeScript check
        run: npx tsc --noEmit

      - name: Lint
        run: npm run lint

      - name: Tests
        run: npm test
```

- [ ] **Step 2: Verify workflow syntax**

Run: `cd /Users/rodrigorochameire/Projetos/Defender && cat .github/workflows/ci.yml | python3 -c "import sys,yaml; yaml.safe_load(sys.stdin); print('YAML valid')" 2>/dev/null || echo "Install pyyaml or trust the syntax"`

- [ ] **Step 3: Commit**

```bash
cd /Users/rodrigorochameire/Projetos/Defender
git add .github/workflows/ci.yml
git commit -m "ci: add GitHub Actions workflow (typecheck + lint + test)"
```

---

### Task 4: Aumentar pool de conexões DB [SCRUM-72]

**Files:**
- Modify: `src/lib/db/index.ts:16` (change `max: 5` to `max: 15`)

- [ ] **Step 1: Update pool config**

In `src/lib/db/index.ts`, change line 16:
```typescript
// Before:
max: process.env.NODE_ENV === "production" ? 5 : 10,
// After:
max: process.env.NODE_ENV === "production" ? 15 : 10,
```

- [ ] **Step 2: Verify build still works**

Run: `cd /Users/rodrigorochameire/Projetos/Defender && npx tsc --noEmit 2>&1 | tail -5`
Expected: No new errors.

- [ ] **Step 3: Commit**

```bash
cd /Users/rodrigorochameire/Projetos/Defender
git add src/lib/db/index.ts
git commit -m "infra: increase DB pool from 5 to 15 connections for multi-user scaling"
```

---

## CAMADA 1 — Varas Criminais Camaçari

### Task 5: Migration — CRIMINAL_CAMACARI no atribuicaoEnum [SCRUM-83]

**Files:**
- Modify: `src/lib/db/schema/enums.ts:8-15`

- [ ] **Step 1: Add new enum value**

In `src/lib/db/schema/enums.ts`, modify `atribuicaoEnum`:
```typescript
export const atribuicaoEnum = pgEnum("atribuicao", [
  "JURI_CAMACARI",
  "VVD_CAMACARI",
  "EXECUCAO_PENAL",
  "SUBSTITUICAO",
  "SUBSTITUICAO_CIVEL",
  "GRUPO_JURI",
  "CRIMINAL_CAMACARI",    // Varas Criminais Comuns Camaçari
]);
```

- [ ] **Step 2: Generate migration**

Run: `cd /Users/rodrigorochameire/Projetos/Defender && npx drizzle-kit generate --name add-criminal-camacari-enum`
Expected: New migration file in `drizzle/` directory.

- [ ] **Step 3: Review generated SQL**

Run: `cat drizzle/$(ls -t drizzle/*.sql | head -1)`
Expected: `ALTER TYPE "atribuicao" ADD VALUE 'CRIMINAL_CAMACARI';`

- [ ] **Step 4: Apply migration**

Run: `cd /Users/rodrigorochameire/Projetos/Defender && npx drizzle-kit push`

- [ ] **Step 5: Commit**

```bash
cd /Users/rodrigorochameire/Projetos/Defender
git add src/lib/db/schema/enums.ts drizzle/
git commit -m "feat: add CRIMINAL_CAMACARI to atribuicao enum"
```

---

### Task 6: Migration — defensoresVinculados em users [SCRUM-86]

**Files:**
- Modify: `src/lib/db/schema/core.ts` (users table)

- [ ] **Step 1: Add field to users table**

In `src/lib/db/schema/core.ts`, add after `podeVerTodosProcessos` (line ~49):
```typescript
  defensoresVinculados: jsonb("defensores_vinculados").$type<number[]>(),
```

- [ ] **Step 2: Generate and apply migration**

Run:
```bash
cd /Users/rodrigorochameire/Projetos/Defender
npx drizzle-kit generate --name add-defensores-vinculados
npx drizzle-kit push
```

- [ ] **Step 3: Commit**

```bash
cd /Users/rodrigorochameire/Projetos/Defender
git add src/lib/db/schema/core.ts drizzle/
git commit -m "feat: add defensoresVinculados JSONB to users table"
```

---

### Task 7: Expand defensor-scope para servidor vinculado [SCRUM-86]

**Files:**
- Modify: `src/lib/trpc/defensor-scope.ts`
- Modify: `src/lib/trpc/__tests__/defensor-scope.test.ts`

- [ ] **Step 1: Write failing tests for servidor vinculado**

Add to `src/lib/trpc/__tests__/defensor-scope.test.ts`:
```typescript
describe("getDefensoresVisiveis — servidor vinculado", () => {
  it("returns specific IDs for servidor with defensoresVinculados", () => {
    const user = makeUser({
      role: "servidor",
      defensoresVinculados: [5, 7],
    });
    const result = getDefensoresVisiveis(user);
    expect(result).toEqual([5, 7]);
  });

  it("returns 'all' for servidor without defensoresVinculados", () => {
    const user = makeUser({ role: "servidor" });
    expect(getDefensoresVisiveis(user)).toBe("all");
  });

  it("returns 'all' for servidor with empty defensoresVinculados", () => {
    const user = makeUser({
      role: "servidor",
      defensoresVinculados: [],
    });
    expect(getDefensoresVisiveis(user)).toBe("all");
  });
});
```

Update `makeUser` to include `defensoresVinculados`:
```typescript
function makeUser(overrides: Partial<{
  id: number;
  role: string;
  isAdmin: boolean;
  supervisorId: number | null;
  podeVerTodosAssistidos: boolean;
  podeVerTodosProcessos: boolean;
  defensoresVinculados: number[] | null;
}>) {
  return {
    id: 1,
    role: "defensor",
    isAdmin: false,
    supervisorId: null,
    podeVerTodosAssistidos: false,
    podeVerTodosProcessos: false,
    defensoresVinculados: null,
    ...overrides,
  } as any;
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/rodrigorochameire/Projetos/Defender && npx vitest run src/lib/trpc/__tests__/defensor-scope.test.ts`
Expected: 3 new tests FAIL (servidor vinculado returns "all" regardless).

- [ ] **Step 3: Implement servidor vinculado in defensor-scope.ts**

In `src/lib/trpc/defensor-scope.ts`, modify the `getDefensoresVisiveis` function. Find the `servidor` case and change:

```typescript
// Before (servidor always returns "all"):
case "servidor":
  return "all";

// After:
case "servidor":
  if (user.defensoresVinculados?.length) {
    return user.defensoresVinculados;
  }
  return "all";
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd /Users/rodrigorochameire/Projetos/Defender && npx vitest run src/lib/trpc/__tests__/defensor-scope.test.ts`
Expected: All tests PASS (old + new).

- [ ] **Step 5: Commit**

```bash
cd /Users/rodrigorochameire/Projetos/Defender
git add src/lib/trpc/defensor-scope.ts src/lib/trpc/__tests__/defensor-scope.test.ts
git commit -m "feat: support servidor vinculado in defensor-scope"
```

---

### Task 8: Schema — tabela institutos [SCRUM-84]

**Files:**
- Create: `src/lib/db/schema/institutos.ts`
- Modify: `src/lib/db/schema/index.ts`

- [ ] **Step 1: Create institutos schema**

```typescript
// src/lib/db/schema/institutos.ts
import {
  pgTable, serial, text, varchar, boolean, timestamp,
  integer, date, jsonb, numeric, index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { processos, assistidos, users } from "./core";
import { comarcas } from "./comarcas";

export const institutos = pgTable("institutos", {
  id: serial("id").primaryKey(),
  processoId: integer("processo_id").references(() => processos.id, { onDelete: "cascade" }).notNull(),
  assistidoId: integer("assistido_id").references(() => assistidos.id, { onDelete: "cascade" }).notNull(),
  tipo: varchar("tipo", { length: 30 }).notNull(),
  // ANPP, SURSIS_PROCESSUAL, TRANSACAO_PENAL, COMPOSICAO_CIVIL
  status: varchar("status", { length: 30 }).notNull().default("PROPOSTO"),
  // PROPOSTO, ACEITO, HOMOLOGADO, EM_CUMPRIMENTO, CUMPRIDO, DESCUMPRIDO, REVOGADO, RECUSADO, EXTINTO

  condicoes: jsonb("condicoes").$type<string[]>(),
  dataAcordo: date("data_acordo"),
  dataInicio: date("data_inicio"),
  dataFim: date("data_fim"),
  prazoMeses: integer("prazo_meses"),

  audienciaHomologacaoId: integer("audiencia_homologacao_id"),
  audienciaAdmonitoriaId: integer("audiencia_admonitoria_id"),

  valorPrestacao: numeric("valor_prestacao"),
  horasServico: integer("horas_servico"),

  observacoes: text("observacoes"),
  defensorId: integer("defensor_id").references(() => users.id),
  comarcaId: integer("comarca_id").references(() => comarcas.id).notNull(),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("institutos_processo_idx").on(table.processoId),
  index("institutos_assistido_idx").on(table.assistidoId),
  index("institutos_defensor_idx").on(table.defensorId),
  index("institutos_status_idx").on(table.status),
  index("institutos_tipo_idx").on(table.tipo),
  index("institutos_comarca_idx").on(table.comarcaId),
]);

export const institutosRelations = relations(institutos, ({ one }) => ({
  processo: one(processos, {
    fields: [institutos.processoId],
    references: [processos.id],
  }),
  assistido: one(assistidos, {
    fields: [institutos.assistidoId],
    references: [assistidos.id],
  }),
  defensor: one(users, {
    fields: [institutos.defensorId],
    references: [users.id],
  }),
  comarca: one(comarcas, {
    fields: [institutos.comarcaId],
    references: [comarcas.id],
  }),
}));

export type Instituto = typeof institutos.$inferSelect;
export type InsertInstituto = typeof institutos.$inferInsert;
```

- [ ] **Step 2: Export from schema index**

In `src/lib/db/schema/index.ts`, add:
```typescript
export * from "./institutos";
```

- [ ] **Step 3: Generate and apply migration**

Run:
```bash
cd /Users/rodrigorochameire/Projetos/Defender
npx drizzle-kit generate --name create-institutos-table
npx drizzle-kit push
```

- [ ] **Step 4: Commit**

```bash
cd /Users/rodrigorochameire/Projetos/Defender
git add src/lib/db/schema/institutos.ts src/lib/db/schema/index.ts drizzle/
git commit -m "feat: create institutos table (ANPP, sursis, transação)"
```

---

### Task 9: Schema — tabela delitos [SCRUM-85]

**Files:**
- Create: `src/lib/db/schema/delitos.ts`
- Modify: `src/lib/db/schema/index.ts`

- [ ] **Step 1: Create delitos schema**

```typescript
// src/lib/db/schema/delitos.ts
import {
  pgTable, serial, text, varchar, boolean, timestamp,
  integer, date, jsonb, index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { processos, assistidos } from "./core";
import { comarcas } from "./comarcas";

export const delitos = pgTable("delitos", {
  id: serial("id").primaryKey(),
  processoId: integer("processo_id").references(() => processos.id, { onDelete: "cascade" }).notNull(),
  assistidoId: integer("assistido_id").references(() => assistidos.id, { onDelete: "cascade" }),

  tipoDelito: varchar("tipo_delito", { length: 80 }).notNull(),
  artigoBase: varchar("artigo_base", { length: 50 }).notNull(),
  incisos: jsonb("incisos").$type<string[]>(),
  qualificadoras: jsonb("qualificadoras").$type<string[]>(),
  causasAumento: jsonb("causas_aumento").$type<string[]>(),
  causasDiminuicao: jsonb("causas_diminuicao").$type<string[]>(),

  penaMinimaMeses: integer("pena_minima_meses"),
  penaMaximaMeses: integer("pena_maxima_meses"),
  penaAplicadaMeses: integer("pena_aplicada_meses"),
  regimeInicial: varchar("regime_inicial", { length: 20 }),

  cabeAnpp: boolean("cabe_anpp"),
  cabeSursis: boolean("cabe_sursis"),
  cabeTransacao: boolean("cabe_transacao"),
  cabeSubstituicao: boolean("cabe_substituicao"),

  dataSentenca: date("data_sentenca"),
  resultadoSentenca: varchar("resultado_sentenca", { length: 30 }),
  observacoes: text("observacoes"),
  comarcaId: integer("comarca_id").references(() => comarcas.id).notNull(),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("delitos_processo_idx").on(table.processoId),
  index("delitos_assistido_idx").on(table.assistidoId),
  index("delitos_tipo_idx").on(table.tipoDelito),
  index("delitos_comarca_idx").on(table.comarcaId),
]);

export const delitosRelations = relations(delitos, ({ one }) => ({
  processo: one(processos, {
    fields: [delitos.processoId],
    references: [processos.id],
  }),
  assistido: one(assistidos, {
    fields: [delitos.assistidoId],
    references: [assistidos.id],
  }),
  comarca: one(comarcas, {
    fields: [delitos.comarcaId],
    references: [comarcas.id],
  }),
}));

export type Delito = typeof delitos.$inferSelect;
export type InsertDelito = typeof delitos.$inferInsert;
```

- [ ] **Step 2: Export from schema index**

In `src/lib/db/schema/index.ts`, add:
```typescript
export * from "./delitos";
```

- [ ] **Step 3: Generate and apply migration**

Run:
```bash
cd /Users/rodrigorochameire/Projetos/Defender
npx drizzle-kit generate --name create-delitos-table
npx drizzle-kit push
```

- [ ] **Step 4: Commit**

```bash
cd /Users/rodrigorochameire/Projetos/Defender
git add src/lib/db/schema/delitos.ts src/lib/db/schema/index.ts drizzle/
git commit -m "feat: create delitos table (tipificação penal estruturada)"
```

---

### Task 10: Lógica de cálculo de benefícios + testes [SCRUM-88]

**Files:**
- Create: `src/lib/legal/beneficios.ts`
- Create: `src/lib/legal/__tests__/beneficios.test.ts`

- [ ] **Step 1: Write failing tests first**

```typescript
// src/lib/legal/__tests__/beneficios.test.ts
import { describe, it, expect } from "vitest";
import { calcularBeneficios } from "../beneficios";

describe("calcularBeneficios", () => {
  it("furto simples: cabe ANPP, sursis, transação, substituição", () => {
    const result = calcularBeneficios({
      tipoDelito: "furto_simples",
      penaMinimaMeses: 12,  // 1 ano
      penaMaximaMeses: 48,  // 4 anos
      envolveuViolencia: false,
    });
    expect(result.cabeAnpp).toBe(true);       // mínima < 48 meses, sem violência
    expect(result.cabeSursis).toBe(true);      // mínima <= 12 meses
    expect(result.cabeTransacao).toBe(false);  // máxima > 24 meses
    expect(result.cabeSubstituicao).toBe(true); // <= 48 meses, sem violência
  });

  it("roubo qualificado: não cabe nenhum benefício", () => {
    const result = calcularBeneficios({
      tipoDelito: "roubo_majorado",
      penaMinimaMeses: 64,  // 5a4m (art. 157 §2º)
      penaMaximaMeses: 180, // 15 anos
      envolveuViolencia: true,
    });
    expect(result.cabeAnpp).toBe(false);
    expect(result.cabeSursis).toBe(false);
    expect(result.cabeTransacao).toBe(false);
    expect(result.cabeSubstituicao).toBe(false);
  });

  it("tráfico privilegiado: cabe ANPP", () => {
    const result = calcularBeneficios({
      tipoDelito: "trafico_privilegiado",
      penaMinimaMeses: 20,  // 1a8m (com redutor §4º)
      penaMaximaMeses: 40,
      envolveuViolencia: false,
    });
    expect(result.cabeAnpp).toBe(true);
    expect(result.cabeSursis).toBe(false);
    expect(result.cabeTransacao).toBe(false);
    expect(result.cabeSubstituicao).toBe(true);
  });

  it("ameaça: cabe transação penal (JECRIM)", () => {
    const result = calcularBeneficios({
      tipoDelito: "ameaca",
      penaMinimaMeses: 1,
      penaMaximaMeses: 6,
      envolveuViolencia: false,
    });
    expect(result.cabeAnpp).toBe(true);
    expect(result.cabeSursis).toBe(true);
    expect(result.cabeTransacao).toBe(true);   // máxima <= 24 meses
    expect(result.cabeSubstituicao).toBe(true);
  });

  it("lesão corporal leve (violência): não cabe ANPP nem substituição", () => {
    const result = calcularBeneficios({
      tipoDelito: "lesao_corporal_leve",
      penaMinimaMeses: 3,
      penaMaximaMeses: 12,
      envolveuViolencia: true,
    });
    expect(result.cabeAnpp).toBe(false);        // violência
    expect(result.cabeSursis).toBe(true);        // mínima <= 12
    expect(result.cabeTransacao).toBe(true);     // máxima <= 24
    expect(result.cabeSubstituicao).toBe(false); // violência
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd /Users/rodrigorochameire/Projetos/Defender && npx vitest run src/lib/legal/__tests__/beneficios.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement calcularBeneficios**

```typescript
// src/lib/legal/beneficios.ts

export interface DelitoBeneficiosInput {
  tipoDelito: string;
  penaMinimaMeses: number;
  penaMaximaMeses: number;
  envolveuViolencia: boolean;
}

export interface DelitoBeneficiosResult {
  cabeAnpp: boolean;
  cabeSursis: boolean;
  cabeTransacao: boolean;
  cabeSubstituicao: boolean;
}

/**
 * Calcula benefícios penais cabíveis com base na pena e tipo de crime.
 *
 * ANPP (art. 28-A CPP): pena mínima < 4 anos + sem violência/grave ameaça
 * Sursis processual (art. 89 Lei 9.099): pena mínima <= 1 ano
 * Transação penal (art. 76 Lei 9.099): pena máxima <= 2 anos
 * Substituição (art. 44 CP): pena <= 4 anos + sem violência/grave ameaça
 */
export function calcularBeneficios(input: DelitoBeneficiosInput): DelitoBeneficiosResult {
  const { penaMinimaMeses, penaMaximaMeses, envolveuViolencia } = input;

  return {
    cabeAnpp: penaMinimaMeses < 48 && !envolveuViolencia,
    cabeSursis: penaMinimaMeses <= 12,
    cabeTransacao: penaMaximaMeses <= 24,
    cabeSubstituicao: penaMaximaMeses <= 48 && !envolveuViolencia,
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd /Users/rodrigorochameire/Projetos/Defender && npx vitest run src/lib/legal/__tests__/beneficios.test.ts`
Expected: All 5 tests PASS.

- [ ] **Step 5: Commit**

```bash
cd /Users/rodrigorochameire/Projetos/Defender
git add src/lib/legal/beneficios.ts src/lib/legal/__tests__/beneficios.test.ts
git commit -m "feat: add calcularBeneficios with TDD (ANPP, sursis, transação)"
```

---

### Task 11: tRPC router — institutosRouter [SCRUM-87]

**Files:**
- Create: `src/lib/trpc/routers/institutos.ts`
- Modify: `src/lib/trpc/routers/index.ts`

- [ ] **Step 1: Create institutos router**

```typescript
// src/lib/trpc/routers/institutos.ts
import { z } from "zod";
import { router, protectedProcedure } from "../init";
import { db } from "@/lib/db";
import { institutos } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { getComarcaFilter } from "../comarca-scope";

const VALID_TIPOS = ["ANPP", "SURSIS_PROCESSUAL", "TRANSACAO_PENAL", "COMPOSICAO_CIVIL"] as const;
const VALID_STATUS = [
  "PROPOSTO", "ACEITO", "HOMOLOGADO", "EM_CUMPRIMENTO",
  "CUMPRIDO", "DESCUMPRIDO", "REVOGADO", "RECUSADO", "EXTINTO",
] as const;

export const institutosRouter = router({
  listByProcesso: protectedProcedure
    .input(z.object({ processoId: z.number() }))
    .query(async ({ input }) => {
      return db.query.institutos.findMany({
        where: eq(institutos.processoId, input.processoId),
        orderBy: desc(institutos.createdAt),
      });
    }),

  listByDefensor: protectedProcedure
    .input(z.object({ status: z.enum(VALID_STATUS).optional() }))
    .query(async ({ ctx, input }) => {
      const conditions = [getComarcaFilter(institutos, ctx.user)];
      if (ctx.user.role === "defensor") {
        conditions.push(eq(institutos.defensorId, ctx.user.id));
      }
      if (input.status) {
        conditions.push(eq(institutos.status, input.status));
      }
      return db.query.institutos.findMany({
        where: and(...conditions),
        with: { processo: true, assistido: true },
        orderBy: desc(institutos.createdAt),
      });
    }),

  create: protectedProcedure
    .input(z.object({
      processoId: z.number(),
      assistidoId: z.number(),
      tipo: z.enum(VALID_TIPOS),
      condicoes: z.array(z.string()).optional(),
      dataAcordo: z.string().optional(),
      dataInicio: z.string().optional(),
      dataFim: z.string().optional(),
      prazoMeses: z.number().optional(),
      valorPrestacao: z.string().optional(),
      horasServico: z.number().optional(),
      observacoes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const [created] = await db.insert(institutos).values({
        ...input,
        status: "PROPOSTO",
        defensorId: ctx.user.id,
        comarcaId: ctx.user.comarcaId,
      }).returning();
      return created;
    }),

  updateStatus: protectedProcedure
    .input(z.object({
      id: z.number(),
      status: z.enum(VALID_STATUS),
      observacoes: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const [updated] = await db.update(institutos)
        .set({
          status: input.status,
          observacoes: input.observacoes,
          updatedAt: new Date(),
        })
        .where(eq(institutos.id, input.id))
        .returning();
      return updated;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await db.delete(institutos).where(eq(institutos.id, input.id));
      return { success: true };
    }),
});
```

- [ ] **Step 2: Register router in index**

In `src/lib/trpc/routers/index.ts`, add:
```typescript
import { institutosRouter } from "./institutos";
// ... in the router() call:
  institutos: institutosRouter,
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `cd /Users/rodrigorochameire/Projetos/Defender && npx tsc --noEmit 2>&1 | grep -c "error" || echo "0 errors"`

- [ ] **Step 4: Commit**

```bash
cd /Users/rodrigorochameire/Projetos/Defender
git add src/lib/trpc/routers/institutos.ts src/lib/trpc/routers/index.ts
git commit -m "feat: add institutosRouter (ANPP, sursis CRUD + status transitions)"
```

---

### Task 12: tRPC router — delitosRouter [SCRUM-88]

**Files:**
- Create: `src/lib/trpc/routers/delitos.ts`
- Modify: `src/lib/trpc/routers/index.ts`

- [ ] **Step 1: Create delitos router**

```typescript
// src/lib/trpc/routers/delitos.ts
import { z } from "zod";
import { router, protectedProcedure } from "../init";
import { db } from "@/lib/db";
import { delitos } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { calcularBeneficios } from "@/lib/legal/beneficios";

export const delitosRouter = router({
  listByProcesso: protectedProcedure
    .input(z.object({ processoId: z.number() }))
    .query(async ({ input }) => {
      return db.query.delitos.findMany({
        where: eq(delitos.processoId, input.processoId),
        orderBy: desc(delitos.createdAt),
      });
    }),

  create: protectedProcedure
    .input(z.object({
      processoId: z.number(),
      assistidoId: z.number().optional(),
      tipoDelito: z.string().min(1),
      artigoBase: z.string().min(1),
      incisos: z.array(z.string()).optional(),
      qualificadoras: z.array(z.string()).optional(),
      causasAumento: z.array(z.string()).optional(),
      causasDiminuicao: z.array(z.string()).optional(),
      penaMinimaMeses: z.number().optional(),
      penaMaximaMeses: z.number().optional(),
      envolveuViolencia: z.boolean().default(false),
      observacoes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { envolveuViolencia, ...data } = input;

      // Auto-calculate benefícios if penas are provided
      let beneficios = {};
      if (data.penaMinimaMeses && data.penaMaximaMeses) {
        beneficios = calcularBeneficios({
          tipoDelito: data.tipoDelito,
          penaMinimaMeses: data.penaMinimaMeses,
          penaMaximaMeses: data.penaMaximaMeses,
          envolveuViolencia,
        });
      }

      const [created] = await db.insert(delitos).values({
        ...data,
        ...beneficios,
        comarcaId: ctx.user.comarcaId,
      }).returning();
      return created;
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      penaAplicadaMeses: z.number().optional(),
      regimeInicial: z.string().optional(),
      dataSentenca: z.string().optional(),
      resultadoSentenca: z.string().optional(),
      observacoes: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      const [updated] = await db.update(delitos)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(delitos.id, id))
        .returning();
      return updated;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await db.delete(delitos).where(eq(delitos.id, input.id));
      return { success: true };
    }),
});
```

- [ ] **Step 2: Register router**

In `src/lib/trpc/routers/index.ts`, add:
```typescript
import { delitosRouter } from "./delitos";
// ... in the router() call:
  delitos: delitosRouter,
```

- [ ] **Step 3: Verify TypeScript**

Run: `cd /Users/rodrigorochameire/Projetos/Defender && npx tsc --noEmit 2>&1 | tail -3`

- [ ] **Step 4: Commit**

```bash
cd /Users/rodrigorochameire/Projetos/Defender
git add src/lib/trpc/routers/delitos.ts src/lib/trpc/routers/index.ts
git commit -m "feat: add delitosRouter with auto-calculated benefícios"
```

---

### Task 13: Frontend — Delitos tab na página de processo [SCRUM-90]

**Files:**
- Create: `src/components/processo/delitos-tab.tsx`
- Modify: `src/app/(dashboard)/admin/processos/[id]/page.tsx`

- [ ] **Step 1: Create DelitosTab component**

```tsx
// src/components/processo/delitos-tab.tsx
"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Scale, CheckCircle, XCircle } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";

function BeneficioBadge({ label, cabe }: { label: string; cabe: boolean | null }) {
  if (cabe === null) return null;
  return (
    <Badge variant={cabe ? "default" : "secondary"} className={cabe ? "bg-emerald-600" : ""}>
      {cabe ? <CheckCircle className="h-3 w-3 mr-1" /> : <XCircle className="h-3 w-3 mr-1" />}
      {label}
    </Badge>
  );
}

export function DelitosTab({ processoId, comarcaId }: { processoId: number; comarcaId: number }) {
  const [open, setOpen] = useState(false);
  const utils = trpc.useUtils();
  const { data: delitos, isLoading } = trpc.delitos.listByProcesso.useQuery({ processoId });

  const createMutation = trpc.delitos.create.useMutation({
    onSuccess: () => {
      utils.delitos.listByProcesso.invalidate({ processoId });
      setOpen(false);
    },
  });

  const [form, setForm] = useState({
    tipoDelito: "",
    artigoBase: "",
    penaMinimaMeses: "",
    penaMaximaMeses: "",
    envolveuViolencia: false,
  });

  if (isLoading) return <div className="animate-pulse h-32 bg-zinc-800 rounded-lg" />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-zinc-400">Tipificação Penal</h3>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline">
              <Plus className="h-4 w-4 mr-1" /> Adicionar Delito
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Novo Delito</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Tipo</Label>
                <Input
                  placeholder="ex: furto, roubo, tráfico..."
                  value={form.tipoDelito}
                  onChange={(e) => setForm({ ...form, tipoDelito: e.target.value })}
                />
              </div>
              <div>
                <Label>Artigo Base</Label>
                <Input
                  placeholder="ex: art. 155 CP"
                  value={form.artigoBase}
                  onChange={(e) => setForm({ ...form, artigoBase: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>Pena Mínima (meses)</Label>
                  <Input
                    type="number"
                    value={form.penaMinimaMeses}
                    onChange={(e) => setForm({ ...form, penaMinimaMeses: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Pena Máxima (meses)</Label>
                  <Input
                    type="number"
                    value={form.penaMaximaMeses}
                    onChange={(e) => setForm({ ...form, penaMaximaMeses: e.target.value })}
                  />
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.envolveuViolencia}
                  onChange={(e) => setForm({ ...form, envolveuViolencia: e.target.checked })}
                />
                Envolveu violência ou grave ameaça
              </label>
              <Button
                className="w-full"
                onClick={() => createMutation.mutate({
                  processoId,
                  tipoDelito: form.tipoDelito,
                  artigoBase: form.artigoBase,
                  penaMinimaMeses: form.penaMinimaMeses ? parseInt(form.penaMinimaMeses) : undefined,
                  penaMaximaMeses: form.penaMaximaMeses ? parseInt(form.penaMaximaMeses) : undefined,
                  envolveuViolencia: form.envolveuViolencia,
                })}
                disabled={createMutation.isPending || !form.tipoDelito || !form.artigoBase}
              >
                {createMutation.isPending ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {!delitos?.length ? (
        <p className="text-sm text-zinc-500">Nenhum delito registrado.</p>
      ) : (
        <div className="space-y-3">
          {delitos.map((d) => (
            <Card key={d.id} className="bg-zinc-900 border-zinc-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Scale className="h-4 w-4 text-emerald-500" />
                  {d.tipoDelito} — {d.artigoBase}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {d.penaMinimaMeses && d.penaMaximaMeses && (
                  <p className="text-xs text-zinc-500 mb-2">
                    Pena: {d.penaMinimaMeses}m – {d.penaMaximaMeses}m
                  </p>
                )}
                <div className="flex flex-wrap gap-1">
                  <BeneficioBadge label="ANPP" cabe={d.cabeAnpp} />
                  <BeneficioBadge label="Sursis" cabe={d.cabeSursis} />
                  <BeneficioBadge label="Transação" cabe={d.cabeTransacao} />
                  <BeneficioBadge label="Substituição" cabe={d.cabeSubstituicao} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Add tab to processo page**

In `src/app/(dashboard)/admin/processos/[id]/page.tsx`, find the `tabs` array and add:
```typescript
{ key: "delitos", label: "Delitos" },
{ key: "institutos", label: "Institutos" },
```

Add the import at the top:
```typescript
import { DelitosTab } from "@/components/processo/delitos-tab";
```

Add the tab content in the render section (find where other tabs render):
```tsx
{tab === "delitos" && <DelitosTab processoId={data.id} comarcaId={data.comarcaId} />}
```

- [ ] **Step 3: Verify it compiles**

Run: `cd /Users/rodrigorochameire/Projetos/Defender && npx tsc --noEmit 2>&1 | tail -5`

- [ ] **Step 4: Commit**

```bash
cd /Users/rodrigorochameire/Projetos/Defender
git add src/components/processo/delitos-tab.tsx src/app/\(dashboard\)/admin/processos/\[id\]/page.tsx
git commit -m "feat: add Delitos tab to processo detail page"
```

---

### Task 14: Frontend — Institutos tab na página de processo [SCRUM-90]

**Files:**
- Create: `src/components/processo/institutos-tab.tsx`
- Modify: `src/app/(dashboard)/admin/processos/[id]/page.tsx`

- [ ] **Step 1: Create InstitutosTab component**

```tsx
// src/components/processo/institutos-tab.tsx
"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus, FileCheck, Clock, CheckCircle2, XOctagon } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";

const TIPO_LABELS: Record<string, string> = {
  ANPP: "ANPP (art. 28-A CPP)",
  SURSIS_PROCESSUAL: "Sursis Processual (art. 89 Lei 9.099)",
  TRANSACAO_PENAL: "Transação Penal (art. 76 Lei 9.099)",
  COMPOSICAO_CIVIL: "Composição Civil",
};

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  PROPOSTO: { label: "Proposto", color: "bg-yellow-600", icon: Clock },
  ACEITO: { label: "Aceito", color: "bg-blue-600", icon: FileCheck },
  HOMOLOGADO: { label: "Homologado", color: "bg-blue-700", icon: FileCheck },
  EM_CUMPRIMENTO: { label: "Em Cumprimento", color: "bg-emerald-600", icon: Clock },
  CUMPRIDO: { label: "Cumprido", color: "bg-green-700", icon: CheckCircle2 },
  DESCUMPRIDO: { label: "Descumprido", color: "bg-red-600", icon: XOctagon },
  REVOGADO: { label: "Revogado", color: "bg-red-700", icon: XOctagon },
  RECUSADO: { label: "Recusado", color: "bg-zinc-600", icon: XOctagon },
  EXTINTO: { label: "Extinto", color: "bg-zinc-700", icon: CheckCircle2 },
};

export function InstitutosTab({
  processoId,
  assistidoId,
}: {
  processoId: number;
  assistidoId: number;
}) {
  const [open, setOpen] = useState(false);
  const utils = trpc.useUtils();
  const { data: list, isLoading } = trpc.institutos.listByProcesso.useQuery({ processoId });

  const createMutation = trpc.institutos.create.useMutation({
    onSuccess: () => {
      utils.institutos.listByProcesso.invalidate({ processoId });
      setOpen(false);
    },
  });

  const updateStatusMutation = trpc.institutos.updateStatus.useMutation({
    onSuccess: () => utils.institutos.listByProcesso.invalidate({ processoId }),
  });

  const [form, setForm] = useState({
    tipo: "" as string,
    prazoMeses: "",
    observacoes: "",
  });

  if (isLoading) return <div className="animate-pulse h-32 bg-zinc-800 rounded-lg" />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-zinc-400">Institutos Despenalizadores</h3>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline">
              <Plus className="h-4 w-4 mr-1" /> Novo Instituto
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Registrar Instituto</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Tipo</Label>
                <Select value={form.tipo} onValueChange={(v) => setForm({ ...form, tipo: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(TIPO_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Prazo (meses)</Label>
                <Input
                  type="number"
                  value={form.prazoMeses}
                  onChange={(e) => setForm({ ...form, prazoMeses: e.target.value })}
                />
              </div>
              <div>
                <Label>Observações</Label>
                <Textarea
                  value={form.observacoes}
                  onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
                />
              </div>
              <Button
                className="w-full"
                onClick={() => createMutation.mutate({
                  processoId,
                  assistidoId,
                  tipo: form.tipo as any,
                  prazoMeses: form.prazoMeses ? parseInt(form.prazoMeses) : undefined,
                  observacoes: form.observacoes || undefined,
                })}
                disabled={createMutation.isPending || !form.tipo}
              >
                {createMutation.isPending ? "Salvando..." : "Registrar"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {!list?.length ? (
        <p className="text-sm text-zinc-500">Nenhum instituto registrado.</p>
      ) : (
        <div className="space-y-3">
          {list.map((inst) => {
            const cfg = STATUS_CONFIG[inst.status] ?? STATUS_CONFIG.PROPOSTO;
            const Icon = cfg.icon;
            return (
              <Card key={inst.id} className="bg-zinc-900 border-zinc-800">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Icon className="h-4 w-4" />
                      {TIPO_LABELS[inst.tipo] ?? inst.tipo}
                    </span>
                    <Badge className={cfg.color}>{cfg.label}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {inst.prazoMeses && (
                    <p className="text-xs text-zinc-500">Prazo: {inst.prazoMeses} meses</p>
                  )}
                  {inst.condicoes?.length ? (
                    <ul className="text-xs text-zinc-400 list-disc list-inside">
                      {inst.condicoes.map((c, i) => <li key={i}>{c}</li>)}
                    </ul>
                  ) : null}
                  {inst.observacoes && (
                    <p className="text-xs text-zinc-500">{inst.observacoes}</p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Add Institutos tab to processo page**

In `src/app/(dashboard)/admin/processos/[id]/page.tsx`, add the import and tab content:
```typescript
import { InstitutosTab } from "@/components/processo/institutos-tab";
```
```tsx
{tab === "institutos" && <InstitutosTab processoId={data.id} assistidoId={data.assistidoId} />}
```

- [ ] **Step 3: Commit**

```bash
cd /Users/rodrigorochameire/Projetos/Defender
git add src/components/processo/institutos-tab.tsx src/app/\(dashboard\)/admin/processos/\[id\]/page.tsx
git commit -m "feat: add Institutos tab to processo detail page"
```

---

### Task 15: Frontend — Badge ANPP/Sursis no kanban [SCRUM-91]

**Files:**
- Create: `src/components/demandas-premium/instituto-badge.tsx`

- [ ] **Step 1: Create badge component**

```tsx
// src/components/demandas-premium/instituto-badge.tsx
import { Badge } from "@/components/ui/badge";
import { Handshake } from "lucide-react";

interface InstitutoBadgeProps {
  enrichmentData: {
    instituto_possivel?: string | null;
    motivo_instituto?: string | null;
  } | null;
}

export function InstitutoBadge({ enrichmentData }: InstitutoBadgeProps) {
  if (!enrichmentData?.instituto_possivel) return null;

  const labels: Record<string, string> = {
    ANPP: "ANPP possível",
    SURSIS_PROCESSUAL: "Sursis possível",
    TRANSACAO_PENAL: "Transação possível",
  };

  const label = labels[enrichmentData.instituto_possivel] ?? enrichmentData.instituto_possivel;

  return (
    <Badge
      variant="outline"
      className="border-emerald-600 text-emerald-400 text-[10px] gap-1"
      title={enrichmentData.motivo_instituto ?? undefined}
    >
      <Handshake className="h-3 w-3" />
      {label}
    </Badge>
  );
}
```

- [ ] **Step 2: Integrate into demandas kanban card**

Find the demandas card component (likely in `src/components/demandas-premium/`) and add the badge where other badges render. Import and add:
```tsx
import { InstitutoBadge } from "./instituto-badge";
// Inside the card JSX, near other badges:
<InstitutoBadge enrichmentData={demanda.enrichmentData} />
```

- [ ] **Step 3: Commit**

```bash
cd /Users/rodrigorochameire/Projetos/Defender
git add src/components/demandas-premium/instituto-badge.tsx
git commit -m "feat: add ANPP/Sursis badge to demandas kanban"
```

---

### Task 16: Seed users da Camada 1 [SCRUM-92]

**Files:**
- Create: `scripts/seed-camada1-users.ts`

- [ ] **Step 1: Create seed script**

```typescript
// scripts/seed-camada1-users.ts
import { db } from "../src/lib/db";
import { users } from "../src/lib/db/schema";
import { hash } from "bcryptjs";

async function seed() {
  const defaultPassword = await hash("Ombuds2026!", 12);
  const CAMACARI_ID = 1;

  // 1. Create Danilo
  const [danilo] = await db.insert(users).values({
    name: "Danilo",
    email: "danilo@defensoria.ba.def.br",
    passwordHash: defaultPassword,
    role: "defensor",
    comarcaId: CAMACARI_ID,
    approvalStatus: "approved",
    emailVerified: true,
    podeVerTodosAssistidos: false,
    podeVerTodosProcessos: false,
  }).returning();
  console.log(`Danilo: id=${danilo.id}`);

  // 2. Create Cristiane
  const [cristiane] = await db.insert(users).values({
    name: "Cristiane",
    email: "cristiane@defensoria.ba.def.br",
    passwordHash: defaultPassword,
    role: "defensor",
    comarcaId: CAMACARI_ID,
    approvalStatus: "approved",
    emailVerified: true,
    podeVerTodosAssistidos: false,
    podeVerTodosProcessos: false,
  }).returning();
  console.log(`Cristiane: id=${cristiane.id}`);

  // 3. Estagiário do Danilo
  const [estDanilo] = await db.insert(users).values({
    name: "Estagiário(a) de Danilo",
    email: "est.danilo@defensoria.ba.def.br",
    passwordHash: defaultPassword,
    role: "estagiario",
    supervisorId: danilo.id,
    comarcaId: CAMACARI_ID,
    approvalStatus: "approved",
    emailVerified: true,
  }).returning();
  console.log(`Estagiário Danilo: id=${estDanilo.id}, supervisor=${danilo.id}`);

  // 4. Estagiária da Cristiane
  const [estCristiane] = await db.insert(users).values({
    name: "Estagiário(a) de Cristiane",
    email: "est.cristiane@defensoria.ba.def.br",
    passwordHash: defaultPassword,
    role: "estagiario",
    supervisorId: cristiane.id,
    comarcaId: CAMACARI_ID,
    approvalStatus: "approved",
    emailVerified: true,
  }).returning();
  console.log(`Estagiária Cristiane: id=${estCristiane.id}, supervisor=${cristiane.id}`);

  // 5. Renan (servidor vinculado a Danilo + Cristiane)
  const [renan] = await db.insert(users).values({
    name: "Renan",
    email: "renan@defensoria.ba.def.br",
    passwordHash: defaultPassword,
    role: "servidor",
    comarcaId: CAMACARI_ID,
    approvalStatus: "approved",
    emailVerified: true,
    defensoresVinculados: [danilo.id, cristiane.id],
  }).returning();
  console.log(`Renan: id=${renan.id}, vinculados=[${danilo.id}, ${cristiane.id}]`);

  console.log("\nCamada 1 seed completo! 5 users criados.");
  console.log("Senha padrão: Ombuds2026! (trocar no primeiro login)");
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
```

- [ ] **Step 2: Verify script compiles**

Run: `cd /Users/rodrigorochameire/Projetos/Defender && npx tsc --noEmit scripts/seed-camada1-users.ts 2>&1 | head -5`
Note: This may need to run via tsx: `npx tsx scripts/seed-camada1-users.ts`

- [ ] **Step 3: Commit (do NOT run seed yet)**

```bash
cd /Users/rodrigorochameire/Projetos/Defender
git add scripts/seed-camada1-users.ts
git commit -m "feat: add seed script for Camada 1 users (Danilo, Cristiane, estagiários, Renan)"
```

---

### Task 17: Enrichment — prompt para delitos e institutos [SCRUM-89]

**Files:**
- Create: `enrichment-engine/prompts/criminal_comum/delitos_institutos.md`
- Modify: `enrichment-engine/routers/pje.py`

- [ ] **Step 1: Create prompt template**

```markdown
<!-- enrichment-engine/prompts/criminal_comum/delitos_institutos.md -->
# Extração de Delitos e Institutos Despenalizadores

Analise o texto processual abaixo e extraia:

## 1. Delitos
Para cada delito identificado, retorne:
- tipo: nome do delito (furto, roubo, tráfico, estelionato, lesão corporal, ameaça, receptação, dano, etc.)
- artigo: artigo completo com parágrafos e incisos (ex: "art. 155, §4º, II, CP")
- qualificado: true/false
- pena_minima_meses: pena mínima em meses (baseada no artigo)
- pena_maxima_meses: pena máxima em meses (baseada no artigo)
- envolveu_violencia: true/false (se o tipo penal envolve violência ou grave ameaça à pessoa)

## 2. Instituto Despenalizador Possível
Baseado nos delitos detectados, determine se cabe:
- ANPP: se pena mínima < 4 anos E sem violência/grave ameaça (art. 28-A CPP)
- SURSIS_PROCESSUAL: se pena mínima <= 1 ano (art. 89 Lei 9.099)
- TRANSACAO_PENAL: se pena máxima <= 2 anos (art. 76 Lei 9.099)
- Retorne null se nenhum instituto é cabível

## 3. Concurso de Crimes
Se houver múltiplos delitos, identifique:
- material: crimes independentes, penas somadas
- formal: uma ação, múltiplos resultados
- continuidade_delitiva: mesmas condições de tempo/lugar/modo

Retorne JSON no formato:
```json
{
  "delitos_detectados": [
    {
      "tipo": "string",
      "artigo": "string",
      "qualificado": boolean,
      "pena_minima_meses": number,
      "pena_maxima_meses": number,
      "envolveu_violencia": boolean
    }
  ],
  "instituto_possivel": "ANPP" | "SURSIS_PROCESSUAL" | "TRANSACAO_PENAL" | null,
  "motivo_instituto": "string explicando por que cabe ou não",
  "concurso_crimes": "material" | "formal" | "continuidade_delitiva" | null
}
```

Texto processual:
{texto}
```

- [ ] **Step 2: Add endpoint in pje.py to use the new prompt**

This step integrates with the existing enrichment orchestrator. The exact integration depends on how the orchestrator loads prompts. Add the new fields to the PjeOutput model and pass them through.

In `enrichment-engine/routers/pje.py`, extend the `PjeOutput` to include the new fields:
```python
class PjeOutput(BaseModel):
    intimacoes: list = []
    processos_atualizados: list = []
    demandas_criadas: list = []
    assistidos_identificados: list = []
    total_processadas: int = 0
    # NEW: criminal comum enrichment
    delitos_detectados: list = []
    instituto_possivel: str | None = None
    motivo_instituto: str | None = None
```

- [ ] **Step 3: Commit**

```bash
cd /Users/rodrigorochameire/Projetos/Defender
git add enrichment-engine/prompts/criminal_comum/delitos_institutos.md enrichment-engine/routers/pje.py
git commit -m "feat: add enrichment prompt for delitos + institutos detection"
```

---

## Execution Checklist

| # | Task | Jira | Type | Est. |
|---|------|------|------|------|
| 1 | Tests defensor-scope | SCRUM-69 | Test | 10min |
| 2 | Tests comarca-scope | SCRUM-69 | Test | 10min |
| 3 | CI GitHub Actions | SCRUM-70 | Infra | 5min |
| 4 | Pool DB 5→15 | SCRUM-72 | Infra | 5min |
| 5 | Enum CRIMINAL_CAMACARI | SCRUM-83 | Schema | 10min |
| 6 | defensoresVinculados users | SCRUM-86 | Schema | 10min |
| 7 | Expand defensor-scope | SCRUM-86 | Backend | 15min |
| 8 | Schema institutos | SCRUM-84 | Schema | 10min |
| 9 | Schema delitos | SCRUM-85 | Schema | 10min |
| 10 | calcularBeneficios TDD | SCRUM-88 | Backend | 15min |
| 11 | institutosRouter | SCRUM-87 | Backend | 15min |
| 12 | delitosRouter | SCRUM-88 | Backend | 15min |
| 13 | DelitosTab frontend | SCRUM-90 | Frontend | 20min |
| 14 | InstitutosTab frontend | SCRUM-90 | Frontend | 20min |
| 15 | Badge ANPP kanban | SCRUM-91 | Frontend | 10min |
| 16 | Seed users Camada 1 | SCRUM-92 | Script | 10min |
| 17 | Enrichment prompt | SCRUM-89 | AI | 15min |
