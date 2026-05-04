# MPU — Plano 1: Schema + Helper isMpu — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Estabelecer a fundação da reforma MPU — helper `isMpu()` (única fonte de verdade da derivação), 4 colunas novas em `processos_vvd`, 2 tabelas novas (`mpu_relatos` e `mpu_taxonomia`) e 7 atos novos em `atos-por-atribuicao.ts`. Sem mudança de comportamento existente; apenas pista para os planos seguintes.

**Architecture:** Atribuição derivada (opção A do spec) — enum `atribuicao` permanece. MPU é detectada via helper que combina `tipoProcesso='MPU'`, `mpuAtiva=true` ou prefixo `MPUMP*` no número. Schema cresce sem migração de dados (novas colunas nullable, novas tabelas vazias). Padrão Drizzle ORM (`src/lib/db/schema/`), TDD com Vitest.

**Tech Stack:** TypeScript, Drizzle ORM, PostgreSQL (Supabase), Vitest, pnpm.

**Spec referenciado:** `docs/superpowers/specs/2026-05-04-mpu-reform-design.md` — seções 1, 4 e 6.

---

## File Structure

| Tipo | Arquivo | Responsabilidade |
|---|---|---|
| Create | `src/lib/mpu.ts` | Helper puro `isMpu()` — única função de derivação MPU |
| Test | `__tests__/unit/mpu-helper.test.ts` | Testes do helper, casos exaustivos |
| Modify | `src/lib/db/schema/vvd.ts` | Adiciona 4 colunas em `processosVVD` |
| Create | `src/lib/db/schema/mpu.ts` | Tabelas `mpuRelatos` e `mpuTaxonomia` + tipos inferred |
| Modify | `src/lib/db/schema/index.ts` | Re-exporta o novo módulo `mpu` |
| Modify | `src/config/atos-por-atribuicao.ts` | +7 atos defensivos no array "Violência Doméstica" |
| Generate | `drizzle/<NNNN>_<nome>.sql` | Migration gerada por `pnpm db:generate` (não escrever manual) |

Os arquivos foram divididos por responsabilidade: helper puro fica isolado dos schemas; o módulo `mpu.ts` separa as tabelas analíticas das tabelas operacionais já em `vvd.ts`.

---

## Task 1: Helper `isMpu()` — TDD

**Files:**
- Create: `src/lib/mpu.ts`
- Test: `__tests__/unit/mpu-helper.test.ts`

- [ ] **Step 1: Escrever os testes failing**

Criar `__tests__/unit/mpu-helper.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { isMpu, type MpuInput } from "@/lib/mpu";

describe("isMpu", () => {
  it("retorna true quando tipoProcesso é 'MPU'", () => {
    const p: MpuInput = { processoVvd: { tipoProcesso: "MPU" } };
    expect(isMpu(p)).toBe(true);
  });

  it("retorna true quando mpuAtiva é true", () => {
    const p: MpuInput = { processoVvd: { mpuAtiva: true } };
    expect(isMpu(p)).toBe(true);
  });

  it("retorna true quando numero começa com 'MPUMP'", () => {
    expect(isMpu({ numero: "MPUMPCrim 8011120-58.2026.8.05.0039" })).toBe(true);
    expect(isMpu({ numero: "MPUMP 0001234-00.2026.8.05.0039" })).toBe(true);
  });

  it("retorna false para processo VVD sem MPU", () => {
    const p: MpuInput = {
      numero: "0001234-56.2026.8.05.0039",
      processoVvd: { tipoProcesso: "AP", mpuAtiva: false },
    };
    expect(isMpu(p)).toBe(false);
  });

  it("retorna false para processo sem dados de MPU", () => {
    expect(isMpu({})).toBe(false);
    expect(isMpu({ numero: "" })).toBe(false);
  });

  it("é tolerante a campos null/undefined em processoVvd", () => {
    expect(isMpu({ processoVvd: { tipoProcesso: null, mpuAtiva: null } })).toBe(false);
    expect(isMpu({ processoVvd: undefined })).toBe(false);
  });

  it("não é falso-positivo com 'MPU' no meio do número", () => {
    expect(isMpu({ numero: "0001234-MPU-2026" })).toBe(false);
  });

  it("é case-sensitive no prefixo (MPUMP exige maiúsculo)", () => {
    expect(isMpu({ numero: "mpump 0001234" })).toBe(false);
  });

  it("prioriza mpuAtiva sobre numero quando ambos presentes", () => {
    const p: MpuInput = {
      numero: "0001234-56.2026.8.05.0039",
      processoVvd: { mpuAtiva: true },
    };
    expect(isMpu(p)).toBe(true);
  });
});
```

- [ ] **Step 2: Rodar o teste e verificar que falha**

Run: `pnpm test __tests__/unit/mpu-helper.test.ts`
Expected: FAIL com `Cannot find module '@/lib/mpu'`.

- [ ] **Step 3: Implementar o helper**

Criar `src/lib/mpu.ts`:

```typescript
/**
 * Única fonte de verdade da derivação "isto é uma MPU?".
 * Usar SEMPRE este helper — nunca duplicar a lógica.
 */

export interface MpuInput {
  numero?: string | null;
  processoVvd?: {
    tipoProcesso?: string | null;
    mpuAtiva?: boolean | null;
  };
}

export function isMpu(p: MpuInput): boolean {
  if (p.processoVvd?.tipoProcesso === "MPU") return true;
  if (p.processoVvd?.mpuAtiva === true) return true;
  if (typeof p.numero === "string" && p.numero.startsWith("MPUMP")) return true;
  return false;
}
```

- [ ] **Step 4: Rodar os testes e verificar que passam**

Run: `pnpm test __tests__/unit/mpu-helper.test.ts`
Expected: PASS — 9 testes verdes.

- [ ] **Step 5: Commitar**

```bash
git add src/lib/mpu.ts __tests__/unit/mpu-helper.test.ts
git commit -m "$(cat <<'EOF'
feat(mpu): helper isMpu como única fonte de verdade

Combina tipoProcesso='MPU', mpuAtiva=true ou prefixo MPUMP no número.
9 testes cobrindo: cada gatilho, falsos-positivos, null/undefined,
prefixo case-sensitive, prioridade entre sinais.

Plano 1 da reforma MPU (docs/superpowers/specs/2026-05-04-mpu-reform-design.md).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Colunas novas em `processos_vvd`

**Files:**
- Modify: `src/lib/db/schema/vvd.ts:128-208` (definição de `processosVVD`)
- Generate: nova migration em `drizzle/`

- [ ] **Step 1: Adicionar 4 colunas no schema**

Em `src/lib/db/schema/vvd.ts`, dentro do bloco `pgTable("processos_vvd", { ... })`, adicionar **logo após `distanciaMinima`** (linha ~163):

```typescript
  // === Análise estruturada — fase + motivo da intimação ===
  faseProcedimento: varchar("fase_procedimento", { length: 40 }),
  // valores válidos: representacao_inicial, decisao_liminar, audiencia_designada,
  // audiencia_realizada, manifestacao_pendente, recurso, descumprimento_apurado,
  // expirada, revogada
  motivoUltimaIntimacao: varchar("motivo_ultima_intimacao", { length: 40 }),
  // valores válidos: ciencia_decisao_mpu, ciencia_audiencia, manifestar_renovacao,
  // manifestar_modulacao, manifestar_revogacao, manifestar_laudo,
  // manifestar_descumprimento, ciencia_modulacao, intimacao_generica
  prazoMpuDias: integer("prazo_mpu_dias"),
  juizDecisor: varchar("juiz_decisor", { length: 200 }),
```

E no array de índices da tabela (final do `pgTable`, antes do fechamento `]`), adicionar:

```typescript
  index("processos_vvd_fase_procedimento_idx").on(table.faseProcedimento),
  index("processos_vvd_motivo_ultima_intimacao_idx").on(table.motivoUltimaIntimacao),
```

- [ ] **Step 2: Gerar a migration**

Run: `pnpm db:generate`
Expected: cria arquivo novo em `drizzle/NNNN_<nome>.sql` com `ALTER TABLE processos_vvd ADD COLUMN ...` para os 4 campos + 2 índices.

- [ ] **Step 3: Conferir o SQL gerado**

Run: `ls -t drizzle/*.sql | head -1 | xargs cat`
Expected: SQL contém apenas os ALTERs esperados, nada de DROP ou rename. Se houver mais alterações, abortar e investigar (schema.ts pode ter outras alterações pendentes).

- [ ] **Step 4: Aplicar a migration**

Run: `pnpm db:push`
Expected: migration aplicada sem erros. As colunas existem como nullable (compatível com dados atuais).

- [ ] **Step 5: Verificar no banco**

Run:

```bash
psql "$DATABASE_URL" -c "SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = 'processos_vvd' AND column_name IN ('fase_procedimento', 'motivo_ultima_intimacao', 'prazo_mpu_dias', 'juiz_decisor') ORDER BY column_name;"
```

Expected: 4 linhas, todas `is_nullable = YES`, tipos `character varying` / `integer`.

- [ ] **Step 6: Commitar**

```bash
git add src/lib/db/schema/vvd.ts drizzle/
git commit -m "$(cat <<'EOF'
feat(mpu): campos fase_procedimento, motivo_ultima_intimacao em processos_vvd

Quatro colunas nullable adicionadas:
- fase_procedimento (varchar 40) — etapa do procedimento
- motivo_ultima_intimacao (varchar 40) — por que esta intimação chegou
- prazo_mpu_dias (int) — prazo da MPU em dias
- juiz_decisor (varchar 200) — magistrado que deferiu

Mais 2 índices em fase_procedimento e motivo_ultima_intimacao.

Sem migração de dados — colunas serão preenchidas pela skill
varredura-triagem (Plano 2).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: Módulo `mpu.ts` — tabelas `mpu_relatos` e `mpu_taxonomia`

**Files:**
- Create: `src/lib/db/schema/mpu.ts`
- Modify: `src/lib/db/schema/index.ts` (re-exportar)
- Generate: nova migration em `drizzle/`

- [ ] **Step 1: Criar o módulo de schema**

Criar `src/lib/db/schema/mpu.ts`:

```typescript
import {
  pgTable,
  serial,
  integer,
  text,
  timestamp,
  varchar,
  boolean,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { processos } from "./core";

// ==========================================
// MÓDULO MPU - Análise estruturada
// ==========================================
// Cada processo VVD com MPU tem 1 relato classificado (1:1).
// Taxonomia viva cresce com cada extração (Fase 3 do pipeline).
// Ver: docs/superpowers/specs/2026-05-04-mpu-reform-design.md

export const mpuRelatos = pgTable(
  "mpu_relatos",
  {
    id: serial("id").primaryKey(),
    processoId: integer("processo_id")
      .notNull()
      .references(() => processos.id, { onDelete: "cascade" }),

    // Relato literal extraído da representação/BO
    relatoTexto: text("relato_texto"),

    // Classificações (Lei 11.340/2006 art. 7º para violência)
    tiposViolencia: text("tipos_violencia").array(),
    relacao: varchar("relacao", { length: 30 }),
    gatilhos: text("gatilhos").array(),
    provasMencionadas: text("provas_mencionadas").array(),
    gravidade: varchar("gravidade", { length: 10 }),

    // Auditoria do classificador
    extraidoEm: timestamp("extraido_em").defaultNow().notNull(),
    extracaoModelo: varchar("extracao_modelo", { length: 40 }),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("mpu_relatos_processo_id_uniq").on(table.processoId),
    index("mpu_relatos_relacao_idx").on(table.relacao),
    index("mpu_relatos_gravidade_idx").on(table.gravidade),
  ],
);

export type MpuRelato = typeof mpuRelatos.$inferSelect;
export type InsertMpuRelato = typeof mpuRelatos.$inferInsert;

export const mpuTaxonomia = pgTable(
  "mpu_taxonomia",
  {
    id: serial("id").primaryKey(),
    categoria: varchar("categoria", { length: 20 }).notNull(),
    // valores: gatilho | violencia | medida | relacao | prova
    termo: varchar("termo", { length: 60 }).notNull(),
    contagem: integer("contagem").default(0).notNull(),
    primeiroVistoEm: timestamp("primeiro_visto_em").defaultNow().notNull(),
    ultimoVistoEm: timestamp("ultimo_visto_em").defaultNow().notNull(),
    aprovado: boolean("aprovado").default(false).notNull(),
    variantes: text("variantes").array(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("mpu_taxonomia_categoria_termo_uniq").on(
      table.categoria,
      table.termo,
    ),
    index("mpu_taxonomia_categoria_idx").on(table.categoria),
    index("mpu_taxonomia_aprovado_idx").on(table.aprovado),
  ],
);

export type MpuTaxonomiaRow = typeof mpuTaxonomia.$inferSelect;
export type InsertMpuTaxonomiaRow = typeof mpuTaxonomia.$inferInsert;
```

- [ ] **Step 2: Re-exportar do `index.ts` do schema**

Editar `src/lib/db/schema/index.ts` — adicionar uma linha de export ao lado dos outros (manter a ordem alfabética se o arquivo seguir esse padrão; senão adicionar no final):

```typescript
export * from "./mpu";
```

Confirmar primeiro o padrão atual:

Run: `head -40 src/lib/db/schema/index.ts`

Se o arquivo usa `export * from "./vvd";` etc., adicione `export * from "./mpu";` no mesmo bloco.

- [ ] **Step 3: Gerar a migration**

Run: `pnpm db:generate`
Expected: cria arquivo novo em `drizzle/NNNN_<nome>.sql` com `CREATE TABLE mpu_relatos`, `CREATE TABLE mpu_taxonomia` e os índices.

- [ ] **Step 4: Conferir o SQL gerado**

Run: `ls -t drizzle/*.sql | head -1 | xargs cat`
Expected: contém `CREATE TABLE "mpu_relatos"`, `CREATE TABLE "mpu_taxonomia"`, foreign key para `processos`, índices únicos e não-únicos. Sem ALTERs em outras tabelas.

- [ ] **Step 5: Aplicar a migration**

Run: `pnpm db:push`
Expected: 2 tabelas criadas sem erro.

- [ ] **Step 6: Verificar no banco**

Run:

```bash
psql "$DATABASE_URL" -c "\dt mpu_*"
```

Expected: lista 2 tabelas: `mpu_relatos` e `mpu_taxonomia`.

Run:

```bash
psql "$DATABASE_URL" -c "\d mpu_relatos"
```

Expected: colunas `id`, `processo_id`, `relato_texto`, `tipos_violencia[]`, `relacao`, `gatilhos[]`, `provas_mencionadas[]`, `gravidade`, `extraido_em`, `extracao_modelo`, `created_at`, `updated_at`. Índice único em `processo_id`.

- [ ] **Step 7: Typecheck**

Run: `pnpm typecheck`
Expected: 0 erros. (Se houver erro de import circular ou tipo, corrigir antes de commitar.)

- [ ] **Step 8: Commitar**

```bash
git add src/lib/db/schema/mpu.ts src/lib/db/schema/index.ts drizzle/
git commit -m "$(cat <<'EOF'
feat(mpu): tabelas mpu_relatos e mpu_taxonomia

mpu_relatos (1:1 com processos):
- relato_texto, tipos_violencia[], relacao, gatilhos[],
  provas_mencionadas[], gravidade
- auditoria: extraido_em, extracao_modelo

mpu_taxonomia (vocabulário emergente):
- categoria + termo (único), contagem, variantes[],
  primeiro_visto_em, ultimo_visto_em, aprovado

Plano 1 da reforma MPU. Tabelas vazias — populadas pela
extração estruturada (Plano 6).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: Atos novos em `atos-por-atribuicao.ts`

**Files:**
- Modify: `src/config/atos-por-atribuicao.ts:50-95` (array "Violência Doméstica")

- [ ] **Step 1: Adicionar 7 atos defensivos**

Em `src/config/atos-por-atribuicao.ts`, dentro do array `"Violência Doméstica"`, **antes** da linha `"Outro"`, inserir:

```typescript
    "Manifestar contra prorrogação de MPU",
    "Defesa em audiência de justificação",
    "Manifestar sobre laudo psicossocial",
    "Manifestar sobre modulação de MPU",
    "Pleitear não-renovação de MPU",
    "Defesa criminal — descumprimento art. 24-A",
    "Contestar imposição de tornozeleira",
```

- [ ] **Step 2: Verificar duplicidade**

Run:

```bash
grep -E "(Manifestar contra prorrogação|Defesa em audiência de justificação|Manifestar sobre laudo psicossocial|Manifestar sobre modulação|Pleitear não-renovação|Defesa criminal — descumprimento|Contestar imposição de tornozeleira)" src/config/atos-por-atribuicao.ts | wc -l
```

Expected: `7` (cada string aparece 1 vez).

- [ ] **Step 3: Typecheck**

Run: `pnpm typecheck`
Expected: 0 erros.

- [ ] **Step 4: Commitar**

```bash
git add src/config/atos-por-atribuicao.ts
git commit -m "$(cat <<'EOF'
feat(mpu): atos defensivos novos em Violência Doméstica

+7 atos sob ótica do requerido (assistido):
- Manifestar contra prorrogação de MPU
- Defesa em audiência de justificação
- Manifestar sobre laudo psicossocial
- Manifestar sobre modulação de MPU
- Pleitear não-renovação de MPU
- Defesa criminal — descumprimento art. 24-A
- Contestar imposição de tornozeleira

Plano 1 da reforma MPU. Heurísticas que mapeiam para esses
atos virão na skill (Plano 2).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: Validação cruzada (smoke test)

**Files:** nenhum novo — só rodar comandos.

- [ ] **Step 1: Rodar todos os testes**

Run: `pnpm test`
Expected: PASS em tudo, incluindo o `mpu-helper.test.ts` novo.

- [ ] **Step 2: Typecheck completo**

Run: `pnpm typecheck`
Expected: 0 erros.

- [ ] **Step 3: Lint**

Run: `pnpm lint`
Expected: 0 erros novos. (Se houver warnings preexistentes em arquivos não tocados, ignorar.)

- [ ] **Step 4: Verificar git log final**

Run: `git log --oneline -5`
Expected: 4 novos commits do Plano 1, na ordem:
1. `feat(mpu): atos defensivos novos em Violência Doméstica`
2. `feat(mpu): tabelas mpu_relatos e mpu_taxonomia`
3. `feat(mpu): campos fase_procedimento, motivo_ultima_intimacao em processos_vvd`
4. `feat(mpu): helper isMpu como única fonte de verdade`

- [ ] **Step 5: Push**

```bash
git push origin feat/varredura-triagem-skill
```

(Branch atual já foi base dos commits anteriores deste fluxo.)

- [ ] **Step 6: Merge para main via worktree**

Conforme padrão `feedback_branch_hygiene_isolated_fix`:

```bash
cd /Users/rodrigorochameire/Projetos/Defender/.worktrees/demanda-eventos
git fetch origin main
git merge --ff-only origin/feat/varredura-triagem-skill
git push origin main
```

Expected: fast-forward limpo, sem conflitos.

---

## Self-review checklist

- [x] Cada task tem código completo (sem "TBD" ou "ajustar conforme")
- [x] Caminhos exatos com linhas onde aplicável
- [x] Comandos exatos com expected output
- [x] TDD aplicado no helper (puro, perfeito para TDD)
- [x] Migrations Drizzle não escritas à mão (geradas via `pnpm db:generate`)
- [x] Tipos consistentes (`MpuInput` em Task 1, exportado e reusável; `MpuRelato`/`MpuTaxonomiaRow` em Task 3)
- [x] Spec coverage:
   - Modelagem (helper) ✓ Task 1
   - Schema processos_vvd (4 campos) ✓ Task 2
   - mpu_relatos ✓ Task 3
   - mpu_taxonomia ✓ Task 3
   - Atos novos ✓ Task 4
- [x] Sem placeholders, sem "similar a Task N"

## Dependências dos próximos planos

- **Plano 2 (Triagem MPU)** consome `isMpu()` da Task 1, escreve em `faseProcedimento` e `motivoUltimaIntimacao` da Task 2.
- **Plano 3 (Import das 31)** popula `processos_vvd` (incluindo campos da Task 2), depois aplica skill do Plano 2.
- **Plano 4 (Tab MPU)** filtra com `isMpu()` da Task 1; mostra atos da Task 4 no card.
- **Plano 5 (/admin/mpu)** mesma dependência do Plano 4.
- **Plano 6 (Análise estruturada)** popula `mpu_relatos` e `mpu_taxonomia` da Task 3.
