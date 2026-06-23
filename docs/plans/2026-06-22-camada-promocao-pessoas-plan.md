# Camada de Promoção (piloto: Pessoas) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use subagent-driven-development (recommended) or executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Promover pessoas extraídas pela IA (em `case_personas` e `processos.analysisData.pessoas[]`) para o catálogo global `pessoas` + `participacoes_processo`, com dedup conservador, idempotência, proveniência e auditoria.

**Architecture:** Lógica de decisão em funções **puras** (de-para de papéis, resolvedor de identidade, dois adaptadores de fonte, planejador idempotente) com TDD pesado; camada de IO fina (applier transacional, backfill, hook). Migração **aditiva** (2 colunas + `promocao_log` + 1 flag). Spec: `docs/plans/2026-06-22-camada-promocao-pessoas-design.md`.

**Tech Stack:** Next.js 15, Drizzle ORM, PostgreSQL (Supabase), tRPC, Inngest, vitest. Gate verde obrigatório: `npx tsc --noEmit` 0 · `npx next lint` 0 erros · `npx vitest run` verde.

**Branch:** `feat/promocao-pessoas`.

---

## File Structure

| Arquivo | Responsabilidade |
|---|---|
| `src/lib/db/schema/promocao.ts` (criar) | Tabela `promocao_log` (auditoria) |
| `src/lib/db/schema/pessoas.ts` (modificar) | +`origem`, +`fonteRef` em `participacoesProcesso` |
| `src/lib/db/schema/core.ts` (modificar) | +`pessoasPromovidasEm` em `processos` |
| `src/lib/db/schema/index.ts` (modificar) | `export * from "./promocao"` |
| `src/lib/promocao/tipos.ts` (criar) | Tipos: `CandidatoPessoa`, `PessoaExistente`, `ResultadoResolucao`, `AcaoPromocao` |
| `src/lib/promocao/de-para-papeis.ts` (criar) | Puro: vocabulário IA → `{papel, lado, subpapel}` |
| `src/lib/promocao/resolver-identidade.ts` (criar) | Puro: candidato + existentes → vincular/criar/revisar |
| `src/lib/promocao/adaptador-case-personas.ts` (criar) | Puro: linhas `case_personas` → `CandidatoPessoa[]` |
| `src/lib/promocao/adaptador-analysis.ts` (criar) | Puro: `analysisData` → `CandidatoPessoa[]` |
| `src/lib/promocao/planejar.ts` (criar) | Puro: candidatos + estado → lista de `AcaoPromocao` (idempotente) |
| `src/lib/promocao/applier.ts` (criar) | IO: executa o plano numa transação + `promocao_log` |
| `src/lib/promocao/backfill.ts` (criar) | IO: varre fontes, chama planejar+applier, contadores |
| `src/lib/trpc/routers/promocao.ts` (criar) | tRPC: `backfillPessoas` (dispara backfill), `statsPromocao` |
| `src/lib/inngest/functions.ts` (modificar) | Hook: promove ao final de `intelligence/consolidate` |
| `__tests__/unit/promocao-*.test.ts` | Testes das unidades puras |

---

## Task 0: Migração aditiva (schema)

**Files:**
- Create: `src/lib/db/schema/promocao.ts`
- Modify: `src/lib/db/schema/pessoas.ts` (tabela `participacoesProcesso`), `src/lib/db/schema/core.ts` (tabela `processos`), `src/lib/db/schema/index.ts`

- [ ] **Step 1: Criar `src/lib/db/schema/promocao.ts`**

```ts
import { pgTable, serial, integer, varchar, text, numeric, timestamp, index } from "drizzle-orm/pg-core";
import { processos } from "./core";

export const promocaoLog = pgTable("promocao_log", {
  id: serial("id").primaryKey(),
  entidade: varchar("entidade", { length: 20 }).notNull().default("pessoa"),
  processoId: integer("processo_id").references(() => processos.id, { onDelete: "cascade" }),
  candidatoNome: text("candidato_nome").notNull(),
  candidatoCpf: varchar("candidato_cpf", { length: 14 }),
  acao: varchar("acao", { length: 12 }).notNull(), // vincular | criar | revisar | ignorar
  pessoaId: integer("pessoa_id"),
  candidatosIds: text("candidatos_ids"), // CSV dos ids ambíguos quando acao=revisar
  confianca: numeric("confianca", { precision: 3, scale: 2 }),
  fonteRef: varchar("fonte_ref", { length: 120 }),
  modeloExtracao: varchar("modelo_extracao", { length: 60 }),
  criadoEm: timestamp("criado_em", { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  index("promocao_log_processo_idx").on(t.processoId),
  index("promocao_log_acao_idx").on(t.acao),
]);

export type PromocaoLogRow = typeof promocaoLog.$inferSelect;
```

- [ ] **Step 2: Adicionar colunas em `participacoesProcesso`** (`pessoas.ts`, dentro do objeto de colunas, após `fonte`)

```ts
    origem: varchar("origem", { length: 20 }).notNull().default("manual"),
    fonteRef: varchar("fonte_ref", { length: 120 }),
```

- [ ] **Step 3: Adicionar flag em `processos`** (`core.ts`, na tabela `processos`)

```ts
    pessoasPromovidasEm: timestamp("pessoas_promovidas_em", { withTimezone: true }),
```

- [ ] **Step 4: Registrar no index** (`index.ts`): adicionar `export * from "./promocao";`

- [ ] **Step 5: Verificar colisão em prod (antes de aplicar)**

Via `mcp__claude_ai_Supabase__execute_sql` no project `hxfvlaeqhkmelvyzgfqp`:
```sql
SELECT
  (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='promocao_log') AS tem_log,
  (SELECT 1 FROM information_schema.columns WHERE table_name='participacoes_processo' AND column_name='origem') AS tem_origem,
  (SELECT 1 FROM information_schema.columns WHERE table_name='processos' AND column_name='pessoas_promovidas_em') AS tem_flag;
```
Expected: todos `null` (não existem ainda).

- [ ] **Step 6: Aplicar migração aditiva**

Via `mcp__claude_ai_Supabase__apply_migration` (name: `promocao_pessoas_nucleo`):
```sql
ALTER TABLE participacoes_processo ADD COLUMN origem varchar(20) NOT NULL DEFAULT 'manual';
ALTER TABLE participacoes_processo ADD COLUMN fonte_ref varchar(120);
ALTER TABLE processos ADD COLUMN pessoas_promovidas_em timestamptz;
CREATE TABLE promocao_log (
  id serial PRIMARY KEY,
  entidade varchar(20) NOT NULL DEFAULT 'pessoa',
  processo_id integer REFERENCES processos(id) ON DELETE CASCADE,
  candidato_nome text NOT NULL,
  candidato_cpf varchar(14),
  acao varchar(12) NOT NULL,
  pessoa_id integer,
  candidatos_ids text,
  confianca numeric(3,2),
  fonte_ref varchar(120),
  modelo_extracao varchar(60),
  criado_em timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX promocao_log_processo_idx ON promocao_log (processo_id);
CREATE INDEX promocao_log_acao_idx ON promocao_log (acao);
```

- [ ] **Step 7: Verificar gate + commit**

Run: `npx tsc --noEmit 2>&1 | grep -c "error TS"` → Expected: `0`
```bash
git add -A && git commit -m "feat(promocao): schema aditivo — origem/fonteRef + promocao_log + flag"
```

---

## Task 1: De-para de papéis (puro, TDD)

**Files:**
- Create: `src/lib/promocao/de-para-papeis.ts`, `src/lib/promocao/tipos.ts`
- Test: `__tests__/unit/promocao-de-para-papeis.test.ts`

- [ ] **Step 1: Criar tipos** (`src/lib/promocao/tipos.ts`)

```ts
export interface CandidatoPessoa {
  nome: string;
  cpf?: string | null;
  dataNascimento?: string | null;
  papel: string;
  lado?: string | null;
  subpapel?: string | null;
  fonteRef: string;
  confianca: number;
}

export interface PessoaExistente {
  id: number;
  nomeNormalizado: string;
  nomesAlternativos: string[];
  cpf: string | null;
  dataNascimento: string | null;
}

export type ResultadoResolucao =
  | { acao: "vincular"; pessoaId: number; confianca: number; motivo: string }
  | { acao: "criar"; confianca: number; motivo: string }
  | { acao: "revisar"; candidatosIds: number[]; confianca: number; motivo: string };

export interface PapelCanonico { papel: string; lado: string | null; subpapel: string | null }
```

- [ ] **Step 2: Escrever o teste falho** (`__tests__/unit/promocao-de-para-papeis.test.ts`)

```ts
import { describe, it, expect } from "vitest";
import { mapearPapel } from "@/lib/promocao/de-para-papeis";

describe("mapearPapel", () => {
  it("mapeia papéis de acusação/defesa para lado correto", () => {
    expect(mapearPapel("testemunha_acusacao")).toEqual({ papel: "testemunha", lado: "acusacao", subpapel: null });
    expect(mapearPapel("testemunha_defesa")).toEqual({ papel: "testemunha", lado: "defesa", subpapel: null });
  });
  it("mapeia agentes públicos", () => {
    expect(mapearPapel("policial_condutor").papel).toBe("policial");
    expect(mapearPapel("perito").papel).toBe("perito");
  });
  it("defendido vira papel reu/assistido", () => {
    expect(mapearPapel("defendido").papel).toBe("reu");
  });
  it("desconhecido cai em 'outro' sem quebrar", () => {
    expect(mapearPapel("inexistente_xyz")).toEqual({ papel: "outro", lado: null, subpapel: null });
  });
});
```

- [ ] **Step 3: Rodar e ver falhar** — Run: `npx vitest run __tests__/unit/promocao-de-para-papeis.test.ts` → Expected: FAIL (módulo não existe)

- [ ] **Step 4: Implementar** (`src/lib/promocao/de-para-papeis.ts`)

```ts
import type { PapelCanonico } from "./tipos";

const MAPA: Record<string, PapelCanonico> = {
  defendido: { papel: "reu", lado: "defesa", subpapel: null },
  vitima: { papel: "vitima", lado: "acusacao", subpapel: null },
  testemunha_acusacao: { papel: "testemunha", lado: "acusacao", subpapel: null },
  testemunha_defesa: { papel: "testemunha", lado: "defesa", subpapel: null },
  perito: { papel: "perito", lado: null, subpapel: null },
  delegado: { papel: "delegado", lado: null, subpapel: null },
  policial_condutor: { papel: "policial", lado: null, subpapel: "condutor" },
  policial: { papel: "policial", lado: null, subpapel: null },
  familiar: { papel: "familiar", lado: null, subpapel: null },
  informante: { papel: "informante", lado: null, subpapel: null },
};

export function mapearPapel(tipoIa: string): PapelCanonico {
  return MAPA[(tipoIa ?? "").trim().toLowerCase()] ?? { papel: "outro", lado: null, subpapel: null };
}
```

- [ ] **Step 5: Rodar e ver passar** — Run: `npx vitest run __tests__/unit/promocao-de-para-papeis.test.ts` → Expected: PASS

- [ ] **Step 6: Commit** — `git add -A && git commit -m "feat(promocao): de-para de papéis IA→catálogo (puro, TDD)"`

---

## Task 2: Resolvedor de identidade (puro, TDD — núcleo)

**Files:**
- Create: `src/lib/promocao/resolver-identidade.ts`
- Test: `__tests__/unit/promocao-resolver.test.ts`

- [ ] **Step 1: Escrever os testes falhos** (`__tests__/unit/promocao-resolver.test.ts`)

```ts
import { describe, it, expect } from "vitest";
import { resolverIdentidade } from "@/lib/promocao/resolver-identidade";
import type { CandidatoPessoa, PessoaExistente } from "@/lib/promocao/tipos";

const cand = (p: Partial<CandidatoPessoa>): CandidatoPessoa => ({
  nome: "José da Silva", papel: "testemunha", fonteRef: "x", confianca: 0.9, ...p,
});
const ex = (p: Partial<PessoaExistente>): PessoaExistente => ({
  id: 1, nomeNormalizado: "jose da silva", nomesAlternativos: [], cpf: null, dataNascimento: null, ...p,
});

describe("resolverIdentidade", () => {
  it("CPF igual → vincular alta confiança", () => {
    const r = resolverIdentidade(cand({ cpf: "111.222.333-44" }), [ex({ id: 7, cpf: "111.222.333-44" })], new Set());
    expect(r).toMatchObject({ acao: "vincular", pessoaId: 7 });
    expect(r.confianca).toBeGreaterThanOrEqual(0.95);
  });
  it("sem CPF, nome+nascimento batem em 1 → vincular", () => {
    const r = resolverIdentidade(
      cand({ dataNascimento: "1990-05-10" }),
      [ex({ id: 3, dataNascimento: "1990-05-10" })], new Set());
    expect(r).toMatchObject({ acao: "vincular", pessoaId: 3 });
  });
  it("nome-só batendo em ≥1 → revisar com candidatosIds", () => {
    const r = resolverIdentidade(cand({}), [ex({ id: 3 }), ex({ id: 4 })], new Set());
    expect(r.acao).toBe("revisar");
    if (r.acao === "revisar") expect(r.candidatosIds).toEqual([3, 4]);
  });
  it("nenhum match → criar", () => {
    const r = resolverIdentidade(cand({ nome: "Maria Outra" }), [ex({ id: 3 })], new Set());
    expect(r.acao).toBe("criar");
  });
  it("match via nomesAlternativos conta como nome-só", () => {
    const r = resolverIdentidade(cand({}), [ex({ id: 9, nomeNormalizado: "outro nome", nomesAlternativos: ["jose da silva"] })], new Set());
    expect(r.acao).toBe("revisar");
  });
  it("par já confirmado distinto não entra em revisar", () => {
    // candidato bate por nome com id 3, mas (novo,3) é par distinto → não sugere
    const distinct = new Set<string>(["jose da silva|3"]);
    const r = resolverIdentidade(cand({}), [ex({ id: 3 })], distinct);
    expect(r.acao).toBe("criar");
  });
});
```

- [ ] **Step 2: Rodar e ver falhar** — Run: `npx vitest run __tests__/unit/promocao-resolver.test.ts` → Expected: FAIL

- [ ] **Step 3: Implementar** (`src/lib/promocao/resolver-identidade.ts`)

```ts
import { normalizarNome } from "@/lib/pessoas/normalize";
import type { CandidatoPessoa, PessoaExistente, ResultadoResolucao } from "./tipos";

const soDigitos = (s?: string | null) => (s ?? "").replace(/\D/g, "");

function nomeBate(cand: string, p: PessoaExistente): boolean {
  const n = normalizarNome(cand);
  if (!n) return false;
  return p.nomeNormalizado === n || p.nomesAlternativos.map(normalizarNome).includes(n);
}

/**
 * distinctsConfirmados: chaves "nomeNormalizadoCandidato|idExistente" de pares já
 * marcados como pessoas distintas — não devem ser sugeridos para revisão/merge.
 */
export function resolverIdentidade(
  candidato: CandidatoPessoa,
  existentes: PessoaExistente[],
  distinctsConfirmados: Set<string>,
): ResultadoResolucao {
  // 1. CPF
  const cpf = soDigitos(candidato.cpf);
  if (cpf) {
    const porCpf = existentes.find((p) => soDigitos(p.cpf) === cpf);
    if (porCpf) return { acao: "vincular", pessoaId: porCpf.id, confianca: 1.0, motivo: "CPF idêntico" };
  }

  // 2. nome + nascimento
  if (candidato.dataNascimento) {
    const porNomeNasc = existentes.filter(
      (p) => p.dataNascimento === candidato.dataNascimento && nomeBate(candidato.nome, p),
    );
    if (porNomeNasc.length === 1) {
      return { acao: "vincular", pessoaId: porNomeNasc[0].id, confianca: 0.9, motivo: "Nome + nascimento" };
    }
  }

  // 3. nome-só (descontando pares confirmados distintos)
  const nNorm = normalizarNome(candidato.nome);
  const porNome = existentes.filter(
    (p) => nomeBate(candidato.nome, p) && !distinctsConfirmados.has(`${nNorm}|${p.id}`),
  );
  if (porNome.length >= 1) {
    return { acao: "revisar", candidatosIds: porNome.map((p) => p.id), confianca: 0.4, motivo: "Nome coincide; ambíguo" };
  }

  // 4. nada
  return { acao: "criar", confianca: candidato.confianca, motivo: "Sem correspondência" };
}
```

- [ ] **Step 4: Rodar e ver passar** — Run: `npx vitest run __tests__/unit/promocao-resolver.test.ts` → Expected: PASS

- [ ] **Step 5: Commit** — `git add -A && git commit -m "feat(promocao): resolvedor de identidade conservador (puro, TDD)"`

---

## Task 3: Adaptador case_personas (puro, TDD)

**Files:**
- Create: `src/lib/promocao/adaptador-case-personas.ts`
- Test: `__tests__/unit/promocao-adaptador-case-personas.test.ts`

- [ ] **Step 1: Teste falho** — cobre: row→candidato; cpf/nascimento extraídos de `perfil`/`contatos`; `tipo`→papel via `mapearPapel`; `fonteRef="case_personas:<id>"`; lista vazia→[].

```ts
import { describe, it, expect } from "vitest";
import { candidatosDeCasePersonas } from "@/lib/promocao/adaptador-case-personas";

describe("candidatosDeCasePersonas", () => {
  it("converte row com cpf/nascimento no perfil", () => {
    const out = candidatosDeCasePersonas([
      { id: 5, nome: "Ana Lima", tipo: "testemunha_defesa", confidence: 0.8,
        perfil: { cpf: "999.888.777-66", dataNascimento: "1985-02-01" }, contatos: null },
    ] as any);
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ nome: "Ana Lima", cpf: "999.888.777-66", dataNascimento: "1985-02-01", papel: "testemunha", lado: "defesa", fonteRef: "case_personas:5" });
  });
  it("lista vazia → []", () => expect(candidatosDeCasePersonas([])).toEqual([]));
  it("sem perfil não quebra", () => {
    const out = candidatosDeCasePersonas([{ id: 1, nome: "X", tipo: "outro", confidence: null, perfil: null, contatos: null }] as any);
    expect(out[0].cpf).toBeNull();
  });
});
```

- [ ] **Step 2: Rodar e ver falhar.**
- [ ] **Step 3: Implementar** (`src/lib/promocao/adaptador-case-personas.ts`)

```ts
import type { CasePersonaRow } from "@/lib/db/schema/casos";
import type { CandidatoPessoa } from "./tipos";
import { mapearPapel } from "./de-para-papeis";

const pick = (o: unknown, k: string): string | null => {
  if (o && typeof o === "object" && k in o) {
    const v = (o as Record<string, unknown>)[k];
    return typeof v === "string" ? v : null;
  }
  return null;
};

export function candidatosDeCasePersonas(rows: CasePersonaRow[]): CandidatoPessoa[] {
  return rows.map((r) => {
    const pp = mapearPapel(r.tipo);
    return {
      nome: r.nome,
      cpf: pick(r.perfil, "cpf") ?? pick(r.contatos, "cpf"),
      dataNascimento: pick(r.perfil, "dataNascimento"),
      papel: pp.papel, lado: pp.lado, subpapel: pp.subpapel,
      fonteRef: `case_personas:${r.id}`,
      confianca: typeof r.confidence === "number" ? r.confidence : 0.7,
    };
  });
}
```

- [ ] **Step 4: Rodar e ver passar.**
- [ ] **Step 5: Commit** — `git add -A && git commit -m "feat(promocao): adaptador case_personas (puro, TDD)"`

---

## Task 4: Adaptador analysisData (puro, TDD)

**Files:**
- Create: `src/lib/promocao/adaptador-analysis.ts`
- Test: `__tests__/unit/promocao-adaptador-analysis.test.ts`

- [ ] **Step 1: Teste falho** — cobre: `analysisData` null→[]; **presente sem chave `pessoas`→[]**; pessoas[]→candidatos; `vinculoComDefendido`→subpapel; `fonteRef="analysis:<processoId>"`.

```ts
import { describe, it, expect } from "vitest";
import { candidatosDeAnalysis } from "@/lib/promocao/adaptador-analysis";

describe("candidatosDeAnalysis", () => {
  it("null → []", () => expect(candidatosDeAnalysis(10, null)).toEqual([]));
  it("presente sem chave pessoas → []", () => expect(candidatosDeAnalysis(10, { faseAtual: "x" })).toEqual([]));
  it("extrai pessoas com cpf e vínculo", () => {
    const out = candidatosDeAnalysis(10, { pessoas: [
      { nome: "Carla", papel: "vitima", cpf: "1", dataNascimento: "2000-01-01", vinculoComDefendido: "ex-companheira" },
    ]});
    expect(out[0]).toMatchObject({ nome: "Carla", cpf: "1", papel: "vitima", fonteRef: "analysis:10", subpapel: "ex-companheira" });
  });
});
```

- [ ] **Step 2: Rodar e ver falhar.**
- [ ] **Step 3: Implementar** (`src/lib/promocao/adaptador-analysis.ts`)

```ts
import type { CandidatoPessoa } from "./tipos";
import { mapearPapel } from "./de-para-papeis";

export function candidatosDeAnalysis(
  processoId: number,
  analysisData: Record<string, unknown> | null,
): CandidatoPessoa[] {
  const pessoas = analysisData && Array.isArray((analysisData as any).pessoas)
    ? ((analysisData as any).pessoas as Array<Record<string, unknown>>)
    : [];
  return pessoas
    .filter((p) => typeof p.nome === "string" && p.nome.trim())
    .map((p) => {
      const pp = mapearPapel(String(p.papel ?? ""));
      const vinculo = typeof p.vinculoComDefendido === "string" ? p.vinculoComDefendido : null;
      return {
        nome: String(p.nome),
        cpf: typeof p.cpf === "string" ? p.cpf : null,
        dataNascimento: typeof p.dataNascimento === "string" ? p.dataNascimento : null,
        papel: pp.papel, lado: pp.lado, subpapel: vinculo ?? pp.subpapel,
        fonteRef: `analysis:${processoId}`,
        confianca: 0.75,
      };
    });
}
```

- [ ] **Step 4: Rodar e ver passar.**
- [ ] **Step 5: Commit** — `git add -A && git commit -m "feat(promocao): adaptador analysisData (puro, TDD)"`

---

## Task 5: Planejador idempotente (puro, TDD)

Decide, dado os candidatos + pessoas existentes + participações já existentes (com `origem`), a lista de ações — **respeitando idempotência e proteção manual** — sem tocar o banco.

**Files:**
- Create: `src/lib/promocao/planejar.ts` (adiciona `AcaoPromocao` em `tipos.ts`)
- Test: `__tests__/unit/promocao-planejar.test.ts`

- [ ] **Step 1: Adicionar tipo `AcaoPromocao`** em `tipos.ts`

```ts
export type AcaoPromocao =
  | { tipo: "criar"; candidato: CandidatoPessoa }
  | { tipo: "vincular"; candidato: CandidatoPessoa; pessoaId: number; atualizar: boolean }
  | { tipo: "revisar"; candidato: CandidatoPessoa; candidatosIds: number[] }
  | { tipo: "ignorar"; candidato: CandidatoPessoa; motivo: string };

export interface ParticipacaoExistente { pessoaId: number; processoId: number; papel: string; origem: string }
```

- [ ] **Step 2: Teste falho** — cobre: participação já existente `origem='manual'`→ignorar; `origem='promocao'`→vincular com `atualizar=true`; nova → criar/vincular/revisar conforme resolvedor.

```ts
import { describe, it, expect } from "vitest";
import { planejarPromocao } from "@/lib/promocao/planejar";
import type { CandidatoPessoa, PessoaExistente, ParticipacaoExistente } from "@/lib/promocao/tipos";

const cand = (p: Partial<CandidatoPessoa>): CandidatoPessoa => ({ nome: "Zé", papel: "testemunha", fonteRef: "f", confianca: 0.9, ...p });

describe("planejarPromocao", () => {
  it("não toca participação manual existente (idempotência + soberania manual)", () => {
    const acoes = planejarPromocao({
      processoId: 1,
      candidatos: [cand({ cpf: "1" })],
      existentes: [{ id: 5, nomeNormalizado: "ze", nomesAlternativos: [], cpf: "1", dataNascimento: null }],
      participacoes: [{ pessoaId: 5, processoId: 1, papel: "testemunha", origem: "manual" }],
      distinctsConfirmados: new Set(),
    });
    expect(acoes[0]).toMatchObject({ tipo: "ignorar" });
  });
  it("participação auto existente → vincular com atualizar=true", () => {
    const acoes = planejarPromocao({
      processoId: 1,
      candidatos: [cand({ cpf: "1" })],
      existentes: [{ id: 5, nomeNormalizado: "ze", nomesAlternativos: [], cpf: "1", dataNascimento: null }],
      participacoes: [{ pessoaId: 5, processoId: 1, papel: "testemunha", origem: "promocao" }],
      distinctsConfirmados: new Set(),
    });
    expect(acoes[0]).toMatchObject({ tipo: "vincular", pessoaId: 5, atualizar: true });
  });
  it("sem match → criar", () => {
    const acoes = planejarPromocao({ processoId: 1, candidatos: [cand({})], existentes: [], participacoes: [], distinctsConfirmados: new Set() });
    expect(acoes[0].tipo).toBe("criar");
  });
});
```

- [ ] **Step 3: Rodar e ver falhar.**
- [ ] **Step 4: Implementar** (`src/lib/promocao/planejar.ts`)

```ts
import { resolverIdentidade } from "./resolver-identidade";
import type { AcaoPromocao, CandidatoPessoa, ParticipacaoExistente, PessoaExistente } from "./tipos";

export function planejarPromocao(args: {
  processoId: number;
  candidatos: CandidatoPessoa[];
  existentes: PessoaExistente[];
  participacoes: ParticipacaoExistente[];
  distinctsConfirmados: Set<string>;
}): AcaoPromocao[] {
  const { processoId, candidatos, existentes, participacoes, distinctsConfirmados } = args;
  return candidatos.map((candidato) => {
    const r = resolverIdentidade(candidato, existentes, distinctsConfirmados);
    if (r.acao === "criar") return { tipo: "criar", candidato };
    if (r.acao === "revisar") return { tipo: "revisar", candidato, candidatosIds: r.candidatosIds };
    // vincular: checar participação existente (idempotência + soberania manual)
    const ja = participacoes.find(
      (p) => p.pessoaId === r.pessoaId && p.processoId === processoId && p.papel === candidato.papel,
    );
    if (ja?.origem === "manual") return { tipo: "ignorar", candidato, motivo: "participação manual" };
    return { tipo: "vincular", candidato, pessoaId: r.pessoaId, atualizar: !!ja };
  });
}
```

- [ ] **Step 5: Rodar e ver passar.**
- [ ] **Step 6: Commit** — `git add -A && git commit -m "feat(promocao): planejador idempotente (puro, TDD)"`

---

## Task 6: Applier (IO, transação)

Executa um `AcaoPromocao[]` para um processo numa transação Drizzle: cria pessoas (`fonteCriacao` = `promocao-auto`/`promocao-revisao`), insere/atualiza participações (`origem='promocao'`, `fonteRef`, `confidence`), grava `promocao_log`, e seta `processos.pessoas_promovidas_em`.

**Files:**
- Create: `src/lib/promocao/applier.ts`
- Test: `__tests__/unit/promocao-applier.test.ts` (testa o **plano→efeitos** com um fake de transação; sem DB real)

- [ ] **Step 1: Teste falho com transação fake** — verifica que `criar` insere pessoa+participação+log; `vincular atualizar=false` insere participação; `vincular atualizar=true` faz update; `ignorar` só loga; `revisar` cria provisória + log com candidatosIds. Usar um objeto `tx` falso que coleta chamadas.

```ts
import { describe, it, expect, vi } from "vitest";
import { aplicarAcoes } from "@/lib/promocao/applier";

function fakeTx() {
  const calls: any[] = [];
  const ins = (tabela: string) => ({ values: (v: any) => ({ returning: async () => { calls.push({ op: "insert", tabela, v }); return [{ id: 99 }]; } }) });
  return {
    tx: {
      insert: (t: any) => ins(t?._name ?? "?"),
      update: (t: any) => ({ set: (v: any) => ({ where: async () => { calls.push({ op: "update", v }); } }) }),
    },
    calls,
  };
}

describe("aplicarAcoes", () => {
  it("criar insere pessoa + participação + log", async () => {
    const { tx, calls } = fakeTx();
    await aplicarAcoes(tx as any, 1, [{ tipo: "criar", candidato: { nome: "Novo", papel: "testemunha", fonteRef: "f", confianca: 0.8 } } as any]);
    expect(calls.filter((c) => c.op === "insert").length).toBeGreaterThanOrEqual(3); // pessoa, participacao, log
  });
});
```

> NOTA: o teste do applier valida o **fluxo de escrita** com um fake; a corretude end-to-end vem do Task 8 (backfill num fixture) ou de verificação manual. Mantenha o applier fino — toda decisão já foi tomada no planejador (puro).

- [ ] **Step 2–4: Implementar** `aplicarAcoes(tx, processoId, acoes)` usando `db.transaction` no chamador. Inserts: `pessoas` (nome, nomeNormalizado via `normalizarNome`, cpf, dataNascimento, confidence, fonteCriacao, workspaceId herdado), `participacoesProcesso` (pessoaId, processoId, papel, lado, subpapel, fonte='promocao', fonteRef, origem='promocao', confidence), `promocaoLog`. Para `vincular atualizar`, `update` da participação (confidence/fonteRef). Rodar e ver passar.

- [ ] **Step 5: Commit** — `git add -A && git commit -m "feat(promocao): applier transacional (IO)"`

---

## Task 7: Backfill (IO) + tRPC

**Files:**
- Create: `src/lib/promocao/backfill.ts`, `src/lib/trpc/routers/promocao.ts`
- Modify: `src/lib/trpc/routers/index.ts` (registrar `promocao`)

- [ ] **Step 1: Implementar `backfillPromocaoPessoas(opts)`** — itera, em lotes:
  - (a) `case_personas` com `processo_id` não nulo cujo processo tem `pessoas_promovidas_em IS NULL`;
  - (b) processos com `analysisData->'pessoas' IS NOT NULL` e `pessoas_promovidas_em IS NULL`.
  Para cada processo: carrega `existentes` (pessoas) + `participacoes` + `distinctsConfirmados`; junta candidatos das duas fontes; `planejarPromocao`; `db.transaction(tx => aplicarAcoes(...))`. Acumula contadores `{ processos, vinculadas, criadas, revisao, ignoradas }`.
- [ ] **Step 2: tRPC** `promocao.backfillPessoas` (mutation, protegida; aceita `limite` p/ lote) e `promocao.stats` (query: contagem por `acao` em `promocao_log`).
- [ ] **Step 3: Verificação manual controlada** — rodar `backfillPessoas({ limite: 5 })` em prod; conferir `promocao_log` e a merge-queue; validar com o defensor antes de ampliar.
- [ ] **Step 4: Gate + commit** — `npx tsc --noEmit` 0, `npx vitest run` verde → `git commit -m "feat(promocao): backfill + tRPC (IO)"`

---

## Task 8: Hook no intelligence/consolidate

**Files:**
- Modify: `src/lib/inngest/functions.ts` (função `intelligence/consolidate`, após escrever `case_personas`)

- [ ] **Step 1: Localizar** o ponto em `intelligence-consolidation.ts`/`functions.ts` onde `case_personas` é gravado para o caso/processo.
- [ ] **Step 2: Após a escrita**, chamar a promoção dos processos afetados (reusa `planejarPromocao`+`aplicarAcoes` por processo). Idempotente — se já promovido, o planejador não duplica.
- [ ] **Step 3: Gate + commit** — `git commit -m "feat(promocao): hook no intelligence/consolidate"`

---

## Encerramento

- [ ] Gate final completo: `npx tsc --noEmit` 0 · `npx next lint` 0 erros · `npx vitest run` verde.
- [ ] Atualizar log do design (`...-design.md`) e o spec-master (memória).
- [ ] PR `feat/promocao-pessoas` → CI verde → merge.
- [ ] Próximo sub-projeto (replicar padrão para delitos/cautelares/lugares) ou voltar ao sub-projeto A (assistidos).

## Notas de execução
- **Gate verde é lei** (F.0): nenhum commit com `tsc`/lint/teste vermelho.
- **Migração em prod**: sempre checar colisão antes via `execute_sql`; só `ADD COLUMN`/`CREATE TABLE`.
- **Sem `any` mascarando tipos** nas unidades puras; o `Record<string, unknown>` dos adaptadores é guard de boundary legítimo.
- **Applier fino**: toda decisão mora no planejador puro; o applier só executa.
