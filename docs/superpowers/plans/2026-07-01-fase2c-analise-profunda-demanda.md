# Fase 2c — Análise Profunda por Demanda — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Um clique numa demanda de triagem "cabe peça" (Júri/VVD) baixa os autos do PJe, organiza no Drive, roda a análise completa e popula `processos.analysisData` — autônomo, em duas lanes de daemon.

**Architecture:** Trigger tRPC (`analiseProfunda.criar`) enfileira uma task **lane browser** (`analise-profunda-demanda`) que baixa autos (reusa `baixar_pdf_autos`) + organiza no Drive (`distribuir-autos`) e então enfileira a task **lane ai** `analise-autos` (o mesmo caminho do `coworkAnalise`, que já grava `analysisData`). O estado vive em `demandas.analise_profunda_status`; a transição para `concluida` é **derivada na leitura** do status da task ai (padrão do `statusVarredura`).

**Tech Stack:** Next.js 15 + tRPC + Drizzle (PostgreSQL) + Vitest; Python 3.12 (`enrichment-engine/.venv/bin/python`) + pytest; browser CDP (patchright) no daemon do defensor.

## Global Constraints

- Atribuições elegíveis no MVP: **`JURI_CAMACARI`, `GRUPO_JURI`, `VVD_CAMACARI`** (verbatim do enum `atribuicaoEnum` em `src/lib/db/schema/enums.ts`). EP fora do MVP.
- Elegibilidade exige `registros.enrichment_data->>'peca_sugerida' IS NOT NULL` para a demanda (sinal da Fase 2a).
- `claude_code_tasks` **não tem coluna `demandaId`** — linkar demanda via `instrucaoAdicional` (string JSON), como faz `criarVarreduraJob`.
- Coluna de estado: `analise_profunda_status varchar(20)` + `analise_profunda_task_id integer` em `demandas` (snake_case no banco, camelCase no TS).
- Skill browser: `analise-profunda-demanda`. Skill ai reusada: `analise-autos` (alias → `analise-audiencias`).
- venv Python do daemon browser: `enrichment-engine/.venv/bin/python` (const `VENV_PYTHON`).
- Nada destrutivo; erros → estado `erro`, re-disparável.
- Testes tRPC: padrão de **contract test** (`readFileSync` do source + `expect(src).toContain/toMatch`), como `src/lib/trpc/routers/__tests__/ferias-router.test.ts`. Helpers puros exportados → unit test direto (padrão `intimacoes.test.ts`). pytest: loader **exec-strip-main** (padrão `test_baixar_pdf_autos_guard.py`).

---

## File Structure

| Arquivo | Responsabilidade |
|---|---|
| `src/lib/db/schema/core.ts` (modify) | +2 colunas em `demandas` |
| `drizzle/00NN_analise_profunda_status.sql` (create) | migration das colunas |
| `src/lib/trpc/routers/analise-profunda.ts` (create) | router `analiseProfunda` (`criar`, `status`) + helpers puros exportados |
| `src/lib/trpc/routers/index.ts` (modify) | registrar `analiseProfunda` |
| `.claude/skills/analise-profunda-demanda/SKILL.md` (create) | doc da skill browser |
| `.claude/skills/analise-profunda-demanda/scripts/analise_profunda_autos.py` (create) | worker browser (helpers puros + fluxo CDP) |
| `.claude/skills/analise-profunda-demanda/scripts/test_analise_profunda_helpers.py` (create) | pytest dos helpers puros |
| `scripts/browser-broker-daemon.mjs` (modify) | entrada `analise-profunda-demanda` no `SKILL_REGISTRY` |
| `src/hooks/use-analise-profunda-job.ts` (create) | hook UI (mutation + poll) |
| `src/components/demandas-premium/kanban-premium.tsx` (modify) | botão "Análise profunda" no card |
| `src/components/demandas-premium/demandas-premium-view.tsx` (modify) | fiar o hook ao card |

---

### Task 1: Colunas de estado em `demandas` (schema + migration)

**Files:**
- Modify: `src/lib/db/schema/core.ts` (fim da lista de colunas de `demandas`, ~linha 358, antes de `}, (table) => [`)
- Create: `drizzle/00NN_analise_profunda_status.sql`
- Test: `src/lib/db/schema/__tests__/demandas-analise-profunda.test.ts`

**Interfaces:**
- Produces: colunas `demandas.analiseProfundaStatus` (`varchar(20)`) e `demandas.analiseProfundaTaskId` (`integer`), disponíveis no tipo inferido `Demanda`.

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/db/schema/__tests__/demandas-analise-profunda.test.ts
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it, expect } from "vitest";

const src = readFileSync(join(process.cwd(), "src/lib/db/schema/core.ts"), "utf8");

describe("demandas — colunas de análise profunda", () => {
  it("declara analise_profunda_status varchar(20)", () => {
    expect(src).toMatch(/analiseProfundaStatus:\s*varchar\("analise_profunda_status",\s*\{\s*length:\s*20\s*\}\)/);
  });
  it("declara analise_profunda_task_id integer", () => {
    expect(src).toMatch(/analiseProfundaTaskId:\s*integer\("analise_profunda_task_id"\)/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/db/schema/__tests__/demandas-analise-profunda.test.ts`
Expected: FAIL (2 assertions, colunas não existem).

- [ ] **Step 3: Add the columns**

Em `src/lib/db/schema/core.ts`, logo após `analyzedAt: timestamp("analyzed_at", { withTimezone: true }),` (última coluna de `demandas`, antes de `}, (table) => [`), inserir:

```ts
  // Fase 2c — pipeline de análise profunda por demanda (autos→análise).
  // baixando_autos → analisando → concluida | erro. taskId aponta a task CORRENTE
  // (browser enquanto baixando_autos; ai depois de enfileirada a análise).
  analiseProfundaStatus: varchar("analise_profunda_status", { length: 20 }),
  analiseProfundaTaskId: integer("analise_profunda_task_id"),
```

Confirme que `varchar` e `integer` já estão importados no topo de `core.ts` (estão — usados por outras colunas).

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/db/schema/__tests__/demandas-analise-profunda.test.ts`
Expected: PASS (2).

- [ ] **Step 5: Create the migration SQL**

Descubra o próximo número: `ls drizzle/ | grep -E '^[0-9]{4}_' | sort | tail -1` → use o próximo (ex.: se o último é `0067_...`, crie `0068_...`). Crie `drizzle/00NN_analise_profunda_status.sql`:

```sql
ALTER TABLE "demandas" ADD COLUMN IF NOT EXISTS "analise_profunda_status" varchar(20);
ALTER TABLE "demandas" ADD COLUMN IF NOT EXISTS "analise_profunda_task_id" integer;
```

- [ ] **Step 6: Apply to the dev DB**

Run: `node --env-file=.env.local -e "const p=require('postgres');const sql=p(process.env.DATABASE_URL,{max:1});(async()=>{await sql.file('drizzle/00NN_analise_profunda_status.sql');console.log('applied');await sql.end();})()"`
Expected: `applied`. (Se `postgres` não resolver como CJS, use o padrão do repo: `npm run db:push` só desta migração, ou o mesmo helper import usado nos scripts `_*.mjs`.)

- [ ] **Step 7: Commit**

```bash
git add src/lib/db/schema/core.ts src/lib/db/schema/__tests__/demandas-analise-profunda.test.ts drizzle/00NN_analise_profunda_status.sql
git commit -m "feat(fase2c): colunas demandas.analise_profunda_status/_task_id"
```

---

### Task 2: Helpers puros do router (elegibilidade + meta da task)

**Files:**
- Create: `src/lib/trpc/routers/analise-profunda.ts` (só os helpers puros nesta task; o router vem na Task 3)
- Test: `src/lib/trpc/routers/analise-profunda.test.ts`

**Interfaces:**
- Produces:
  - `ATRIB_ELEGIVEIS_2C: readonly ["JURI_CAMACARI","GRUPO_JURI","VVD_CAMACARI"]`
  - `isElegivel2c(input: { atribuicao: string; pecaSugerida: string | null | undefined }): { ok: true } | { ok: false; motivo: string }`
  - `buildBrowserTaskMeta(input: { demandaId: number; processoId: number; assistidoId: number; atribuicao: string; defensorId: number }): string` — retorna JSON string p/ `instrucaoAdicional`.

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/trpc/routers/analise-profunda.test.ts
import { describe, it, expect } from "vitest";
import { isElegivel2c, buildBrowserTaskMeta, ATRIB_ELEGIVEIS_2C } from "./analise-profunda";

describe("isElegivel2c", () => {
  it("aceita Júri/VVD com peca_sugerida", () => {
    expect(isElegivel2c({ atribuicao: "JURI_CAMACARI", pecaSugerida: "memoriais" })).toEqual({ ok: true });
    expect(isElegivel2c({ atribuicao: "VVD_CAMACARI", pecaSugerida: "resposta_acusacao" })).toEqual({ ok: true });
    expect(isElegivel2c({ atribuicao: "GRUPO_JURI", pecaSugerida: "apelacao" })).toEqual({ ok: true });
  });
  it("rejeita quando peca_sugerida ausente", () => {
    const r = isElegivel2c({ atribuicao: "JURI_CAMACARI", pecaSugerida: null });
    expect(r.ok).toBe(false);
  });
  it("rejeita atribuição fora do MVP (EP)", () => {
    const r = isElegivel2c({ atribuicao: "EXECUCAO_PENAL", pecaSugerida: "manifestacao_ep" });
    expect(r.ok).toBe(false);
  });
});

describe("buildBrowserTaskMeta", () => {
  it("serializa os campos p/ instrucaoAdicional", () => {
    const meta = buildBrowserTaskMeta({ demandaId: 1, processoId: 2, assistidoId: 3, atribuicao: "VVD_CAMACARI", defensorId: 13 });
    expect(JSON.parse(meta)).toEqual({ demandaId: 1, processoId: 2, assistidoId: 3, atribuicao: "VVD_CAMACARI", defensorId: 13, modo: "cdp" });
  });
});

describe("ATRIB_ELEGIVEIS_2C", () => {
  it("é exatamente Júri/VVD do MVP", () => {
    expect([...ATRIB_ELEGIVEIS_2C].sort()).toEqual(["GRUPO_JURI", "JURI_CAMACARI", "VVD_CAMACARI"]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/trpc/routers/analise-profunda.test.ts`
Expected: FAIL ("Cannot find module './analise-profunda'").

- [ ] **Step 3: Write the helpers**

```ts
// src/lib/trpc/routers/analise-profunda.ts
export const ATRIB_ELEGIVEIS_2C = ["JURI_CAMACARI", "GRUPO_JURI", "VVD_CAMACARI"] as const;

export function isElegivel2c(input: {
  atribuicao: string;
  pecaSugerida: string | null | undefined;
}): { ok: true } | { ok: false; motivo: string } {
  if (!(ATRIB_ELEGIVEIS_2C as readonly string[]).includes(input.atribuicao)) {
    return { ok: false, motivo: "Atribuição fora do MVP (só Júri/VVD por ora)." };
  }
  if (!input.pecaSugerida) {
    return { ok: false, motivo: "Demanda não está marcada como 'cabe peça' (sem peca_sugerida)." };
  }
  return { ok: true };
}

export function buildBrowserTaskMeta(input: {
  demandaId: number; processoId: number; assistidoId: number; atribuicao: string; defensorId: number;
}): string {
  return JSON.stringify({
    demandaId: input.demandaId,
    processoId: input.processoId,
    assistidoId: input.assistidoId,
    atribuicao: input.atribuicao,
    defensorId: input.defensorId,
    modo: "cdp",
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/trpc/routers/analise-profunda.test.ts`
Expected: PASS (5).

- [ ] **Step 5: Commit**

```bash
git add src/lib/trpc/routers/analise-profunda.ts src/lib/trpc/routers/analise-profunda.test.ts
git commit -m "feat(fase2c): helpers de elegibilidade + meta da task (puros, testados)"
```

---

### Task 3: Router `analiseProfunda` (`criar` + `status`) + registro

**Files:**
- Modify: `src/lib/trpc/routers/analise-profunda.ts` (adiciona o `router`)
- Modify: `src/lib/trpc/routers/index.ts` (registra `analiseProfunda`)
- Test: `src/lib/trpc/routers/__tests__/analise-profunda-router.test.ts`

**Interfaces:**
- Consumes: `isElegivel2c`, `buildBrowserTaskMeta` (Task 2); `claudeCodeTasks` (`src/lib/db/schema/casos.ts`); `demandas`, `processos`, `registros` (schema); `protectedProcedure`.
- Produces:
  - `analiseProfunda.criar({ demandaId: number })` → `{ success: true; taskId: number; existing: boolean }`
  - `analiseProfunda.status({ demandaId: number })` → `{ status: string | null; erro: string | null }`

- [ ] **Step 1: Write the failing test** (contract test — assere o source)

```ts
// src/lib/trpc/routers/__tests__/analise-profunda-router.test.ts
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it, expect } from "vitest";

const ROUTERS = join(process.cwd(), "src/lib/trpc/routers");
const read = (rel: string) => readFileSync(join(ROUTERS, rel), "utf8");

describe("analiseProfunda router — contract", () => {
  const src = read("analise-profunda.ts");

  it("expõe criar e status", () => {
    expect(src).toMatch(/criar:\s*protectedProcedure/);
    expect(src).toMatch(/status:\s*protectedProcedure/);
  });
  it("valida elegibilidade via isElegivel2c", () => {
    expect(src).toContain("isElegivel2c");
  });
  it("dedup por estado em andamento (baixando_autos/analisando)", () => {
    expect(src).toContain("baixando_autos");
    expect(src).toContain("analisando");
    expect(src).toMatch(/existing:\s*true/);
  });
  it("enfileira task lane browser skill analise-profunda-demanda", () => {
    expect(src).toContain('lane: "browser"');
    expect(src).toContain('"analise-profunda-demanda"');
    expect(src).toContain("buildBrowserTaskMeta");
  });
  it("grava estado baixando_autos + task_id ao criar", () => {
    expect(src).toContain('"baixando_autos"');
    expect(src).toContain("analiseProfundaTaskId");
  });
  it("status deriva concluida quando a task ai completa", () => {
    expect(src).toContain('"concluida"');
    expect(src).toMatch(/completed/);
  });
  it("está registrado no appRouter", () => {
    const index = read("index.ts");
    expect(index).toContain("analiseProfundaRouter");
    expect(index).toMatch(/analiseProfunda:\s*analiseProfundaRouter/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/trpc/routers/__tests__/analise-profunda-router.test.ts`
Expected: FAIL (router/registro ausentes).

- [ ] **Step 3: Implement `criar` + `status` + register**

Adicionar ao topo de `src/lib/trpc/routers/analise-profunda.ts` os imports e o router (abaixo dos helpers da Task 2):

```ts
import { z } from "zod";
import { and, eq, inArray, isNotNull, desc } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../trpc";
import { db } from "@/lib/db";
import { demandas, processos, registros } from "@/lib/db/schema/core";
import { claudeCodeTasks } from "@/lib/db/schema/casos";

const EM_ANDAMENTO = ["baixando_autos", "analisando"] as const;

export const analiseProfundaRouter = router({
  criar: protectedProcedure
    .input(z.object({ demandaId: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      const [d] = await db
        .select({
          id: demandas.id,
          assistidoId: demandas.assistidoId,
          processoId: demandas.processoId,
          status2c: demandas.analiseProfundaStatus,
          taskId: demandas.analiseProfundaTaskId,
        })
        .from(demandas)
        .where(and(eq(demandas.id, input.demandaId), isNull(demandas.deletedAt)))
        .limit(1);
      if (!d) throw new TRPCError({ code: "NOT_FOUND", message: "Demanda não encontrada" });

      // Dedup: já em andamento → devolve a task corrente.
      if (d.status2c && (EM_ANDAMENTO as readonly string[]).includes(d.status2c)) {
        return { success: true as const, taskId: d.taskId ?? 0, existing: true };
      }

      // Atribuição (do processo) + peca_sugerida (do registro de análise da 2a).
      const [proc] = await db
        .select({ atribuicao: processos.atribuicao, numeroAutos: processos.numeroAutos })
        .from(processos)
        .where(eq(processos.id, d.processoId))
        .limit(1);
      const [reg] = await db
        .select({ enrichment: registros.enrichmentData })
        .from(registros)
        .where(and(
          eq(registros.demandaId, input.demandaId),
          eq(registros.tipo, "analise"),
          isNotNull(registros.enrichmentData),
        ))
        .orderBy(desc(registros.id))
        .limit(1);
      const pecaSugerida = (reg?.enrichment as Record<string, unknown> | undefined)?.["peca_sugerida"] as
        | string | null | undefined;

      const eleg = isElegivel2c({ atribuicao: String(proc?.atribuicao ?? ""), pecaSugerida });
      if (!eleg.ok) throw new TRPCError({ code: "PRECONDITION_FAILED", message: eleg.motivo });

      const [task] = await db
        .insert(claudeCodeTasks)
        .values({
          assistidoId: d.assistidoId,
          processoId: d.processoId,
          skill: "analise-profunda-demanda",
          lane: "browser",
          prompt: `Análise profunda — demanda ${input.demandaId} (autos → análise, lane browser)`,
          instrucaoAdicional: buildBrowserTaskMeta({
            demandaId: input.demandaId,
            processoId: d.processoId,
            assistidoId: d.assistidoId,
            atribuicao: String(proc?.atribuicao ?? ""),
            defensorId: ctx.user.id,
          }),
          status: "pending",
          createdBy: ctx.user.id,
        })
        .returning({ id: claudeCodeTasks.id });

      await db
        .update(demandas)
        .set({ analiseProfundaStatus: "baixando_autos", analiseProfundaTaskId: task.id })
        .where(eq(demandas.id, input.demandaId));

      return { success: true as const, taskId: task.id, existing: false };
    }),

  status: protectedProcedure
    .input(z.object({ demandaId: z.number().int() }))
    .query(async ({ input }) => {
      const [d] = await db
        .select({ status2c: demandas.analiseProfundaStatus, taskId: demandas.analiseProfundaTaskId })
        .from(demandas)
        .where(eq(demandas.id, input.demandaId))
        .limit(1);
      if (!d) throw new TRPCError({ code: "NOT_FOUND", message: "Demanda não encontrada" });
      let status = d.status2c ?? null;
      let erro: string | null = null;

      // Deriva-na-leitura (padrão statusVarredura): a task corrente fecha o estado.
      if (d.taskId && (status === "baixando_autos" || status === "analisando")) {
        const [t] = await db
          .select({ tstatus: claudeCodeTasks.status, terro: claudeCodeTasks.erro, tlane: claudeCodeTasks.lane })
          .from(claudeCodeTasks)
          .where(eq(claudeCodeTasks.id, d.taskId))
          .limit(1);
        if (t?.tstatus === "failed") { status = "erro"; erro = t.terro ?? null; }
        else if (t?.tstatus === "completed" && t.tlane === "ai") {
          status = "concluida";
          await db.update(demandas).set({ analiseProfundaStatus: "concluida" }).where(eq(demandas.id, input.demandaId));
        }
      }
      return { status, erro };
    }),
});
```

Adicionar `isNull` ao import do drizzle-orm (`import { and, eq, inArray, isNotNull, isNull, desc } from "drizzle-orm";`).

Em `src/lib/trpc/routers/index.ts`: `import { analiseProfundaRouter } from "./analise-profunda";` e adicionar `analiseProfunda: analiseProfundaRouter,` ao objeto `router({...})`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/trpc/routers/__tests__/analise-profunda-router.test.ts src/lib/trpc/routers/analise-profunda.test.ts`
Expected: PASS (helpers 5 + contract 7).

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit -p tsconfig.json 2>&1 | grep analise-profunda || echo "sem erros no arquivo"`
Expected: `sem erros no arquivo`.

- [ ] **Step 6: Commit**

```bash
git add src/lib/trpc/routers/analise-profunda.ts src/lib/trpc/routers/index.ts src/lib/trpc/routers/__tests__/analise-profunda-router.test.ts
git commit -m "feat(fase2c): router analiseProfunda (criar/status) + registro"
```

---

### Task 4: Helpers puros do worker browser (pytest)

**Files:**
- Create: `.claude/skills/analise-profunda-demanda/scripts/analise_profunda_autos.py` (só os helpers puros nesta task; o fluxo CDP vem na Task 5)
- Test: `.claude/skills/analise-profunda-demanda/scripts/test_analise_profunda_helpers.py`

**Interfaces:**
- Produces (puros, testáveis):
  - `parse_args_meta(argv: list[str]) -> dict` — lê `--demanda-id`, `--processo-id`, `--assistido-id`, `--atribuicao`, `--defensor-id`.
  - `build_analise_autos_task(row: dict, demanda_id: int, created_by: int) -> dict` — monta o `values` da task lane ai `analise-autos` (com `demandaId` embutido no `instrucao_adicional`).
  - `autos_pdf_no_drive_path(assistido_nome: str, cnj: str) -> str` — caminho esperado do PDF na pasta do assistido (determinístico, p/ o resume-safe).

- [ ] **Step 1: Write the failing test** (loader exec-strip-main)

```python
# .claude/skills/analise-profunda-demanda/scripts/test_analise_profunda_helpers.py
import sys, json
from pathlib import Path

SCRIPT = Path(__file__).parent / "analise_profunda_autos.py"
ns: dict = {"__file__": str(SCRIPT)}
src = SCRIPT.read_text()
src_no_main = "\n".join(
    l for l in src.splitlines()
    if not l.strip().startswith("main()") and l.strip() != 'if __name__ == "__main__":'
)
exec(compile(src_no_main, str(SCRIPT), "exec"), ns)
parse_args_meta = ns["parse_args_meta"]
build_analise_autos_task = ns["build_analise_autos_task"]

def check(cond, msg):
    if not cond:
        print(f"FAIL: {msg}"); return 1
    return 0

def main():
    fails = 0
    m = parse_args_meta(["--demanda-id", "5", "--processo-id", "7", "--assistido-id", "9",
                         "--atribuicao", "VVD_CAMACARI", "--defensor-id", "13"])
    fails += check(m["demanda_id"] == 5 and m["processo_id"] == 7 and m["assistido_id"] == 9, "parse_args_meta ids")
    fails += check(m["atribuicao"] == "VVD_CAMACARI" and m["defensor_id"] == 13, "parse_args_meta atrib/def")

    row = {"assistido_id": 9, "processo_id": 7}
    task = build_analise_autos_task(row, demanda_id=5, created_by=13)
    fails += check(task["skill"] == "analise-autos", "skill analise-autos")
    fails += check(task["lane"] == "ai", "lane ai")
    fails += check(task["assistido_id"] == 9 and task["processo_id"] == 7, "task fks")
    meta = json.loads(task["instrucao_adicional"])
    fails += check(meta.get("demandaId") == 5, "demandaId embutido no meta ai")

    print("OK" if not fails else f"{fails} FALHAS")
    sys.exit(1 if fails else 0)

if __name__ == "__main__":
    main()
```

- [ ] **Step 2: Run test to verify it fails**

Run: `enrichment-engine/.venv/bin/python .claude/skills/analise-profunda-demanda/scripts/test_analise_profunda_helpers.py`
Expected: FAIL (arquivo do worker não existe).

- [ ] **Step 3: Write the pure helpers**

```python
#!/usr/bin/env python3
"""analise_profunda_autos.py — worker BROWSER da Fase 2c.

Dado um demandaId: baixa os autos do PJe (reusa baixar_pdf_autos), organiza no
Drive (distribuir-autos) e enfileira a task lane=ai `analise-autos` (o caminho do
coworkAnalise), embutindo o demandaId. Atualiza demandas.analise_profunda_status.
Roda no daemon do defensor (CDP :9222). Só as funções puras abaixo são unit-testadas.
"""
import argparse, json, os, sys


def parse_args_meta(argv: list[str]) -> dict:
    p = argparse.ArgumentParser()
    p.add_argument("--demanda-id", type=int, required=True)
    p.add_argument("--processo-id", type=int, required=True)
    p.add_argument("--assistido-id", type=int, required=True)
    p.add_argument("--atribuicao", default="")
    p.add_argument("--defensor-id", type=int, default=1)
    a = p.parse_args(argv)
    return {
        "demanda_id": a.demanda_id, "processo_id": a.processo_id,
        "assistido_id": a.assistido_id, "atribuicao": a.atribuicao,
        "defensor_id": a.defensor_id,
    }


def build_analise_autos_task(row: dict, demanda_id: int, created_by: int) -> dict:
    """Values da task lane=ai `analise-autos` (mesmo caminho do coworkAnalise),
    com demandaId embutido p/ o fechamento de estado ser derivável na leitura."""
    return {
        "assistido_id": row["assistido_id"],
        "processo_id": row["processo_id"],
        "skill": "analise-autos",
        "lane": "ai",
        "prompt": f"Análise profunda dos autos — demanda {demanda_id}",
        "instrucao_adicional": json.dumps({"demandaId": demanda_id, "fonte": "fase2c"}),
        "status": "pending",
        "created_by": created_by,
    }


def autos_pdf_no_drive_path(assistido_nome: str, cnj: str) -> str:
    """Caminho determinístico do PDF dos autos na pasta do assistido (resume-safe)."""
    safe = "".join(c for c in assistido_nome if c.isalnum() or c in " -_").strip()
    return f"{safe}/Autos/autos-{cnj}.pdf"
```

- [ ] **Step 4: Run test to verify it passes**

Run: `enrichment-engine/.venv/bin/python .claude/skills/analise-profunda-demanda/scripts/test_analise_profunda_helpers.py`
Expected: `OK`.

- [ ] **Step 5: Commit**

```bash
git add .claude/skills/analise-profunda-demanda/scripts/analise_profunda_autos.py .claude/skills/analise-profunda-demanda/scripts/test_analise_profunda_helpers.py
git commit -m "feat(fase2c): helpers puros do worker browser (pytest)"
```

---

### Task 5: Fluxo CDP do worker browser + SKILL.md

**Files:**
- Modify: `.claude/skills/analise-profunda-demanda/scripts/analise_profunda_autos.py` (adiciona `async def main_async` + `main()`)
- Create: `.claude/skills/analise-profunda-demanda/SKILL.md`
- Test: (validação ao vivo; sem unit — depende de CDP. Um source-assertion garante a estrutura.)
- Test: `.claude/skills/analise-profunda-demanda/scripts/test_worker_structure.py`

**Interfaces:**
- Consumes: `parse_args_meta`, `build_analise_autos_task`, `autos_pdf_no_drive_path` (Task 4); reusa, do repo, a conexão Supabase REST e a primitiva de download. Copia `baixar_pdf_autos` e a resolução de link de autos do `varredura_triagem.py` (ou importa via `sys.path`), a resolução demanda→CNJ (`_DEMANDA_SELECT`/`build_by_ids_params`) e `update_demanda`.
- Produces: um executável que, dado `--demanda-id ...`, deixa o PDF em `<assistido>/Autos/` e insere a task `analise-autos`, atualizando o estado.

- [ ] **Step 1: Write the structural test**

```python
# .claude/skills/analise-profunda-demanda/scripts/test_worker_structure.py
import sys
from pathlib import Path
SRC = (Path(__file__).parent / "analise_profunda_autos.py").read_text()

def main():
    fails = 0
    needed = [
        "def main(", "async def main_async", "baixar_pdf_autos",
        "build_analise_autos_task", "analise_profunda_status",
        "distribuir", "baixando_autos", "analisando", "erro",
    ]
    for tok in needed:
        if tok not in SRC:
            print(f"FAIL: falta '{tok}' no worker"); fails += 1
    print("OK" if not fails else f"{fails} FALHAS")
    sys.exit(1 if fails else 0)

if __name__ == "__main__":
    main()
```

- [ ] **Step 2: Run test to verify it fails**

Run: `enrichment-engine/.venv/bin/python .claude/skills/analise-profunda-demanda/scripts/test_worker_structure.py`
Expected: FAIL (falta `main_async`/CDP tokens).

- [ ] **Step 3: Implement the CDP flow**

Adicionar ao `analise_profunda_autos.py`. Reusar a infra do `varredura_triagem.py` importando por caminho (mesmo diretório-pai de skills):

```python
# --- imports de runtime (topo do arquivo, junto aos existentes) ---
import asyncio
from pathlib import Path

# Reuso do varredura-triagem: conexão Supabase REST + primitivas de autos.
_VT = Path(__file__).resolve().parents[2] / "varredura-triagem" / "scripts"
sys.path.insert(0, str(_VT))
# de varredura_triagem.py: Supabase (sb), baixar_pdf_autos, resolução de link de autos,
# e a abertura do processo no PJe. Importar os símbolos usados:
import varredura_triagem as vt  # noqa: E402


async def main_async(meta: dict) -> dict:
    """Baixa autos → Drive → enfileira análise ai → estado. Retorna dict de resultado."""
    demanda_id = meta["demanda_id"]
    sb = vt.Supabase()  # mesma classe de acesso REST do varredura
    # 1. resolve demanda→processo→CNJ+assistido (reusa build_by_ids_params/list_demandas_by_ids)
    rows = sb.list_demandas_by_ids([demanda_id])
    if not rows:
        vt.update_demanda(demanda_id, {"analise_profunda_status": "erro"})
        return {"ok": False, "erro": "demanda não encontrada"}
    row = rows[0]
    cnj = row["processos"]["numero_autos"]
    assistido_nome = row["assistidos"]["nome"]

    try:
        ctx = await vt.abrir_cdp()  # conecta ao Chromium logado (CDP :9222) — helper do varredura
        # 2. resolve o link de autos completos do processo e baixa (guarda anti-ciência embutida)
        autos_url = await vt.resolver_link_autos(ctx, cnj)  # devolve caminho listProcessoCompletoAdvogado.seam
        pdf_path = await vt.baixar_pdf_autos(ctx, autos_url) if autos_url else None
        if not pdf_path:
            vt.update_demanda(demanda_id, {"analise_profunda_status": "erro"})
            return {"ok": False, "erro": "autos não baixados (sigilo/sem link)"}
        # 3. organiza no Drive (distribuir-autos por CNJ → <assistido>/Autos/)
        vt.distribuir_autos_para_assistido(pdf_path, cnj)  # wrapper do distribuir-autos
        # 4. enfileira a análise (lane ai) + estado analisando
        task = build_analise_autos_task(
            {"assistido_id": row["assistido_id"], "processo_id": row["processo_id"]},
            demanda_id=demanda_id, created_by=meta["defensor_id"],
        )
        ai_id = sb.insert_claude_code_task(task)  # devolve id
        vt.update_demanda(demanda_id, {
            "analise_profunda_status": "analisando",
            "analise_profunda_task_id": ai_id,
        })
        return {"ok": True, "cnj": cnj, "ai_task_id": ai_id}
    except Exception as e:  # noqa: BLE001
        vt.update_demanda(demanda_id, {"analise_profunda_status": "erro"})
        return {"ok": False, "erro": str(e)[:200]}


def main():
    meta = parse_args_meta(sys.argv[1:])
    result = asyncio.run(main_async(meta))
    # O daemon captura o último objeto JSON do stdout em resultado.
    print(json.dumps(result))
    sys.exit(0 if result.get("ok") else 1)


if __name__ == "__main__":
    main()
```

> **Nota de implementação (não placeholder):** três símbolos podem não existir com esses nomes exatos em `varredura_triagem.py` — `abrir_cdp`, `resolver_link_autos`, `distribuir_autos_para_assistido`, `Supabase.insert_claude_code_task`. O worker de varredura JÁ faz cada uma dessas coisas (conecta CDP, resolve o link de autos completos antes de `baixar_pdf_autos`, e insere tasks). Localize os nomes reais (`grep -n "def .*cdp\|listProcessoCompletoAdvogado\|def resolver\|insert.*task\|def distribuir" .claude/skills/varredura-triagem/scripts/varredura_triagem.py`) e ajuste os call-sites; se uma função não existir isolada, extraia-a de `varredura_triagem.py` para um módulo compartilhado e importe dos dois lados (DRY). A resolução demanda→CNJ (`list_demandas_by_ids`) e `update_demanda` existem verbatim (§5 do report).

Criar `.claude/skills/analise-profunda-demanda/SKILL.md`:

```markdown
---
name: analise-profunda-demanda
description: "Worker BROWSER da Fase 2c. Dado um demandaId de triagem 'cabe peça' (Júri/VVD), baixa os autos completos do PJe (vence sigilo VVD), organiza no Drive e enfileira a análise completa (lane ai, analise-autos). Rodado pelo browser-broker-daemon no daemon do defensor (CDP). Não é interativo p/ o usuário."
---

# Análise Profunda por Demanda (Fase 2c — lane browser)

Executado pelo `browser-broker-daemon` quando `analiseProfunda.criar` enfileira a task.
Recebe `--demanda-id/--processo-id/--assistido-id/--atribuicao/--defensor-id`.

Fluxo: resolve demanda→CNJ → baixa autos (`baixar_pdf_autos`, anti-ciência) → `distribuir-autos`
→ enfileira `analise-autos` (lane ai) com `demandaId` → grava `analise_profunda_status`.

Estados: `baixando_autos → analisando` (aqui) → `concluida` (derivado quando a task ai completa).
Erros → `erro` (re-disparável). Nada destrutivo.
```

- [ ] **Step 4: Run structural test + smoke**

Run: `enrichment-engine/.venv/bin/python .claude/skills/analise-profunda-demanda/scripts/test_worker_structure.py`
Expected: `OK`.
Run (smoke de argv, sem CDP): `enrichment-engine/.venv/bin/python .claude/skills/analise-profunda-demanda/scripts/analise_profunda_autos.py --help`
Expected: uso do argparse (não crasha na importação).

- [ ] **Step 5: Commit**

```bash
git add .claude/skills/analise-profunda-demanda/
git commit -m "feat(fase2c): fluxo CDP do worker browser + SKILL.md"
```

---

### Task 6: Entrada no SKILL_REGISTRY do daemon browser

**Files:**
- Modify: `scripts/browser-broker-daemon.mjs` (após a entrada `varredura-triagem`, ~linha 135)
- Test: `scripts/__tests__/browser-broker-registry.test.mjs` (ou um teste vitest de source-assertion)

**Interfaces:**
- Consumes: `VENV_PYTHON`, `PROJECT_DIR`, `resolve` (já no arquivo).
- Produces: `SKILL_REGISTRY['analise-profunda-demanda']` com `build(meta)` → argv do worker.

- [ ] **Step 1: Write the failing test**

```ts
// scripts/__tests__/browser-broker-registry.test.ts
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it, expect } from "vitest";

const src = readFileSync(join(process.cwd(), "scripts/browser-broker-daemon.mjs"), "utf8");

describe("browser-broker SKILL_REGISTRY — fase2c", () => {
  it("registra analise-profunda-demanda", () => {
    expect(src).toContain("'analise-profunda-demanda'");
  });
  it("aponta p/ o worker analise_profunda_autos.py", () => {
    expect(src).toContain("analise-profunda-demanda/scripts/analise_profunda_autos.py");
  });
  it("passa os ids da demanda por argv", () => {
    expect(src).toMatch(/--demanda-id/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run scripts/__tests__/browser-broker-registry.test.ts`
Expected: FAIL.

- [ ] **Step 3: Add the registry entry**

Em `scripts/browser-broker-daemon.mjs`, logo após o bloco de `'varredura-triagem': { ... },`:

```js
  'analise-profunda-demanda': {
    label: 'Análise profunda por demanda (Fase 2c)',
    interactive: true,
    build: (meta) => ({
      interpreter: VENV_PYTHON,
      argv: [
        resolve(PROJECT_DIR, '.claude/skills/analise-profunda-demanda/scripts/analise_profunda_autos.py'),
        '--demanda-id', String(meta.demandaId),
        '--processo-id', String(meta.processoId),
        '--assistido-id', String(meta.assistidoId),
        ...(meta.atribuicao ? ['--atribuicao', String(meta.atribuicao)] : []),
        ...(meta.defensorId ? ['--defensor-id', String(meta.defensorId)] : []),
      ],
      timeoutMs: 45 * 60_000,
    }),
  },
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run scripts/__tests__/browser-broker-registry.test.ts`
Expected: PASS (3).

- [ ] **Step 5: Commit**

```bash
git add scripts/browser-broker-daemon.mjs scripts/__tests__/browser-broker-registry.test.ts
git commit -m "feat(fase2c): registro analise-profunda-demanda no daemon browser"
```

---

### Task 7: Hook + UI (botão "Análise profunda" + badge)

**Files:**
- Create: `src/hooks/use-analise-profunda-job.ts`
- Modify: `src/components/demandas-premium/kanban-premium.tsx` (botão no card, junto ao `onAnalisar`)
- Modify: `src/components/demandas-premium/demandas-premium-view.tsx` (fiar o hook)
- Test: `src/hooks/__tests__/use-analise-profunda-job.test.ts` (contract/source-assertion)

**Interfaces:**
- Consumes: `trpc.analiseProfunda.criar` / `.status` (Task 3).
- Produces: `useAnaliseProfundaJob()` → `{ iniciar: (demandaId:number)=>void; status: string|null; isRunning: boolean }`.

- [ ] **Step 1: Write the failing test**

```ts
// src/hooks/__tests__/use-analise-profunda-job.test.ts
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it, expect } from "vitest";

const src = readFileSync(join(process.cwd(), "src/hooks/use-analise-profunda-job.ts"), "utf8");

describe("use-analise-profunda-job", () => {
  it("chama a mutation criar", () => {
    expect(src).toContain("analiseProfunda.criar");
  });
  it("faz poll de status com refetchInterval enquanto em andamento", () => {
    expect(src).toContain("analiseProfunda.status");
    expect(src).toContain("refetchInterval");
  });
  it("invalida demandas.list ao concluir", () => {
    expect(src).toMatch(/demandas\.list\.invalidate/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/hooks/__tests__/use-analise-profunda-job.test.ts`
Expected: FAIL (arquivo não existe).

- [ ] **Step 3: Write the hook** (espelha `use-varredura-job.ts`)

```ts
// src/hooks/use-analise-profunda-job.ts
"use client";
import { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { toast } from "sonner";

export function useAnaliseProfundaJob() {
  const utils = trpc.useUtils();
  const [demandaId, setDemandaId] = useState<number | null>(null);

  const criar = trpc.analiseProfunda.criar.useMutation({
    onSuccess: (res) => {
      setDemandaId((prev) => prev ?? null);
      toast.success(res.existing ? "Análise profunda já em andamento." : "Análise profunda iniciada.");
    },
    onError: (e) => toast.error(e.message),
  });

  const statusQuery = trpc.analiseProfunda.status.useQuery(
    { demandaId: demandaId ?? 0 },
    {
      enabled: demandaId != null,
      refetchInterval: (q) => {
        const s = q.state.data?.status;
        return s === "baixando_autos" || s === "analisando" ? 4000 : false;
      },
    },
  );

  useEffect(() => {
    const s = statusQuery.data?.status;
    if (s === "concluida") {
      toast.success("Análise profunda concluída.");
      void utils.demandas.list.invalidate();
      setDemandaId(null);
    } else if (s === "erro") {
      toast.error(statusQuery.data?.erro ?? "Falha na análise profunda.");
      setDemandaId(null);
    }
  }, [statusQuery.data?.status, statusQuery.data?.erro, utils]);

  const iniciar = (id: number) => {
    setDemandaId(id);
    criar.mutate({ demandaId: id });
  };

  return {
    iniciar,
    status: statusQuery.data?.status ?? null,
    isRunning: demandaId != null,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/hooks/__tests__/use-analise-profunda-job.test.ts`
Expected: PASS (3).

- [ ] **Step 5: Wire the button in the card**

Em `src/components/demandas-premium/kanban-premium.tsx`, no `KanbanAtoContext` adicionar `onAnaliseProfunda?: (id:number)=>void` e `analiseProfundaAtiva?: boolean` (junto a `onAnalisar`/`analisando`, linhas ~74-76, ~515, ~2155). Após o bloco do botão `onAnalisar` (linhas 684-707), adicionar o botão irmão (ícone `FileSearch` de lucide, já disponível no projeto):

```tsx
        {onAnaliseProfunda && (
          <button
            type="button"
            disabled={analiseProfundaAtiva}
            onClick={(e) => { e.stopPropagation(); onAnaliseProfunda(parseInt(String(demanda.id), 10)); }}
            aria-label="Análise profunda (baixa autos + análise completa)"
            title="Análise profunda — baixa autos e roda a análise completa"
            className="w-5 h-5 rounded flex items-center justify-center cursor-pointer text-neutral-400 dark:text-neutral-500 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <FileSearch className="w-3 h-3" />
          </button>
        )}
```

Garanta o import de `FileSearch` de `lucide-react` no topo do arquivo.

Em `src/components/demandas-premium/demandas-premium-view.tsx`: `import { useAnaliseProfundaJob } from "@/hooks/use-analise-profunda-job";`, instanciar `const ap = useAnaliseProfundaJob();` (junto ao `useVarreduraJob`, ~linha 883) e passar ao `KanbanPremium` (junto às props ~3825): `onAnaliseProfunda={(id) => ap.iniciar(id)}` e `analiseProfundaAtiva={ap.isRunning}`.

- [ ] **Step 6: Typecheck + build sanity**

Run: `npx tsc --noEmit -p tsconfig.json 2>&1 | grep -E "analise-profunda|kanban-premium|demandas-premium-view" || echo "sem erros nos arquivos tocados"`
Expected: `sem erros nos arquivos tocados`.

- [ ] **Step 7: Commit**

```bash
git add src/hooks/use-analise-profunda-job.ts src/hooks/__tests__/use-analise-profunda-job.test.ts src/components/demandas-premium/kanban-premium.tsx src/components/demandas-premium/demandas-premium-view.tsx
git commit -m "feat(fase2c): hook + botão 'Análise profunda' no card"
```

---

## Live Acceptance (após todas as tasks)

Fora do TDD (precisa do defensor logado no PJe via CDP :9222 + os dois daemons rodando):

1. Escolher 1 demanda real Júri/VVD com `enrichment_data.peca_sugerida != null` (as da triagem já marcadas na 2a).
2. Clicar "Análise profunda" no card → badge/estado vira `baixando_autos`.
3. Verificar o PDF dos autos em `Meu Drive/.../<assistido>/Autos/`.
4. Estado → `analisando` (task `analise-autos` enfileirada na lane ai).
5. Max daemon processa → `processos.analysisData` populado → estado `concluida` → card mostra a análise.
6. Dedup: durante o processo, um 2º clique retorna `existing:true` (sem nova task).
7. Erro: rodar numa demanda sem link de autos → estado `erro`, botão "Tentar de novo".

---

## Self-Review

- **Cobertura do spec:** §2 arquitetura → Tasks 3+5+6 (trigger→browser→ai). §3 componentes → todas as tasks (tabela File Structure = §3.1). §4 estado → Task 1 (colunas) + Task 3 (`status` derive-on-read) + Task 5 (worker escreve `analisando`). §5 idempotência/erros → Task 3 (dedup) + Task 5 (try/except→`erro`, resume-safe via `autos_pdf_no_drive_path`). §6 testes → cada task tem seu teste; aceite ao vivo à parte. §7 fora de escopo → respeitado (sem mídia/peça/EP).
- **Placeholders:** a única prosa "localize os nomes reais" na Task 5 é instrução deliberada (os símbolos CDP existem no varredura mas os nomes exatos precisam ser confirmados no arquivo) — acompanhada do `grep` exato. Não há TBD/TODO.
- **Consistência de tipos:** `analiseProfundaStatus`/`analiseProfundaTaskId` (Task 1) usados em Task 3; `build_analise_autos_task` (Task 4) usado em Task 5; `analiseProfunda.criar/status` (Task 3) usados em Task 7; `analise-profunda-demanda` skill (Task 5) referenciada no registry (Task 6) e no `criar` (Task 3). `taskId` escalar no `criar` (espelha `coworkAnalise`).
</content>
</invoke>
