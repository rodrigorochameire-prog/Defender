# Auditabilidade de importações e varreduras (Subsistema B) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dar proveniência e histórico completos às importações e varreduras: quem rodou o quê, quando, com que resultado, quais demandas mudaram e o que mudou — numa tela read-only.

**Architecture:** Sem triggers de banco. Os caminhos automáticos (varredura Python; importação `confirmarImport`) passam a escrever `audit_logs` explicitamente com o ator exato + `metadata.job_id` (a tabela já existe e é escrita pela UI via `logAudit`). Proveniência por-linha (`ledger.demanda_id`, `demandas.analyzed_at`), resultado estruturado da varredura via stdout, e uma tela `/admin/auditoria` que une execuções (`claude_code_tasks`) às linhas de `audit_logs` por `metadata.job_id`.

**Tech Stack:** Next.js 15 + tRPC + Drizzle (Postgres/Supabase), React + vitest/@testing-library, Python 3.12 (PostgREST via cliente `Supabase`), Node (`postgres` client p/ scripts).

## Global Constraints

- **Cópia RUNTIME correta (crítico):** a varredura é executada pelo `browser-broker-daemon.mjs` a partir de **`.claude/skills/varredura-triagem/scripts/varredura_triagem.py`** — edições Python da varredura vão AÍ. O `write_analise.py` (lane ai) roda de **`.claude/skills-cowork/analise-intimacao/`**. Toda edição na varredura `skills/` deve ser **espelhada em `.claude/skills-cowork/varredura-triagem/`** (mesma no fim) para não reabrir o drift.
- **`entity_type` SINGULAR:** `'demanda'`, `'registro'`, `'audiencia'` — igual ao `logAudit` existente (`demandas.ts`). Nunca plural.
- **`audit_logs` já existe** (~719 linhas). Sem nova tabela, sem triggers. Única DDL: `demandas.analyzed_at timestamptz`.
- **Ator exato:** varredura = `DEFENSOR_ID` (de `--defensor-id`, já in-process); import = `ctx.user`. `--job-id` (novo) alimenta só `metadata.job_id`.
- **Resultado da varredura:** o `browser-broker` `buildResultado(stdout)` captura o ÚLTIMO objeto JSON do stdout (`/\{[\s\S]*\}\s*$/`) em `resultado.parsed` — então basta o script imprimir o JSON estruturado como última linha. NÃO fazer PATCH mid-run (seria clobberado).
- **Nunca quebrar o worker:** escritas de audit em `try/except`.
- **`pje_documento_id` não é único** — matches múltiplos no backfill exigem tie-break determinístico.
- **Shape de `audit_logs`:** `{userId:int, userName:text, entityType:varchar, entityId:int, action:('create'|'update'|'delete'|'import'|'status_change'), changes:jsonb {col:{old,new}}, metadata:jsonb}`.
- Spec: `docs/superpowers/specs/2026-07-01-triagem-auditoria-design.md`.

---

### Task 1: `importarDemandas` retorna mapa por-linha (`rows[]`)

**Files:**
- Modify: `src/lib/services/pje-import.ts` (interface `ImportResult` :49-55; init `results` :176; insert branch :501-529; update branch :488-492; skip branches :493/:496)
- Test: `src/lib/services/pje-import.test.ts` (criar; se já existir, adicionar caso)

**Interfaces:**
- Produces: `ImportResult.rows: Array<{ pjeDocumentoId: string | null; demandaId: number; action: 'imported' | 'updated' | 'skipped' }>`.

- [ ] **Step 1: Teste que falha** — `src/lib/services/pje-import.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import type { ImportResult } from "./pje-import";

// Contrato de tipo: ImportResult expõe rows[] com pjeDocumentoId→demandaId.
describe("ImportResult.rows", () => {
  it("tem o campo rows tipado", () => {
    const r: ImportResult = { imported: 0, updated: 0, skipped: 0, errors: [], assistidosSemSolar: 0, rows: [] };
    r.rows.push({ pjeDocumentoId: "doc-1", demandaId: 42, action: "imported" });
    expect(r.rows[0]).toEqual({ pjeDocumentoId: "doc-1", demandaId: 42, action: "imported" });
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npm test -- src/lib/services/pje-import.test.ts`
Expected: FAIL — `rows` não existe em `ImportResult`.

- [ ] **Step 3: Adicionar `rows` à interface** — `pje-import.ts:49-55`:

```ts
export interface ImportResult {
  imported: number;
  updated: number;
  skipped: number;
  errors: string[];
  assistidosSemSolar: number;
  rows: Array<{ pjeDocumentoId: string | null; demandaId: number; action: "imported" | "updated" | "skipped" }>;
}
```

- [ ] **Step 4: Inicializar `rows`** — no objeto `results` (~:176), adicionar `rows: [],` junto dos contadores.

- [ ] **Step 5: Popular no branch de INSERT** — trocar `await db.insert(demandas).values({...});` (:501) por captura do id e push:

```ts
      const [inserted] = await db.insert(demandas).values({
        processoId: processo.id,
        assistidoId: assistido.id,
        ato: row.ato,
        pjeDocumentoId: row.idDocumentoPje || null,
        syncedAt: new Date(),
        prazo: convertDate(row.prazo),
        dataEntrada: convertDate(row.dataEntrada),
        status: dbStatus as any,
        substatus,
        prioridade: reuPreso ? "REU_PRESO" : "NORMAL",
        reuPreso,
        defensorId,
        importBatchId: row.importBatchId || null,
        ordemOriginal: row.ordemOriginal ?? null,
        enrichmentData: (row.crime || row.tipoDocumento || row.tipoProcesso) ? {
          crime: row.crime || undefined,
          artigos: [],
          fase_processual: inferirFaseProcessual(row.tipoDocumento),
          tipo_documento_pje: row.tipoDocumento || undefined,
          tipo_processo: row.tipoProcesso || undefined,
          id_documento_pje: row.idDocumentoPje || undefined,
          vara: row.vara || undefined,
        } as any : undefined,
      }).returning({ id: demandas.id });
      results.rows.push({ pjeDocumentoId: row.idDocumentoPje || null, demandaId: inserted.id, action: "imported" });
```

- [ ] **Step 6: Popular nos branches de UPDATE e SKIP** — no branch update (:488-492), após `results.updated++;`:

```ts
            results.updated++;
            results.rows.push({ pjeDocumentoId: existingDemanda.pjeDocumentoId ?? (row.idDocumentoPje || null), demandaId: existingDemanda.id, action: "updated" });
```
E em cada `results.skipped++;` onde há `existingDemanda` em escopo (:493 e :496), acrescentar logo depois:
```ts
            results.rows.push({ pjeDocumentoId: existingDemanda.pjeDocumentoId ?? (row.idDocumentoPje || null), demandaId: existingDemanda.id, action: "skipped" });
```

- [ ] **Step 7: Rodar teste e typecheck**

Run: `npm test -- src/lib/services/pje-import.test.ts && npx tsc --noEmit 2>&1 | grep -E "pje-import" || echo "no type errors in pje-import"`
Expected: PASS + sem erros de tipo.

- [ ] **Step 8: Commit**

```bash
git add src/lib/services/pje-import.ts src/lib/services/pje-import.test.ts
git commit -m "feat(pje-import): importarDemandas retorna rows[] (pje_documento_id→demanda_id)"
```

---

### Task 2: `confirmarImport` preenche `ledger.demanda_id` + audita a importação

**Files:**
- Modify: `src/lib/trpc/routers/intimacoes.ts` (`confirmarImport`, ledger upsert ~:440-462; após `importarDemandas` :408)
- Test: `src/lib/trpc/routers/intimacoes.audit.test.ts` (criar — testa o helper puro de linkage)

**Interfaces:**
- Consumes: `ImportResult.rows` (Task 1); `logAudit({userId,userName,entityType,entityId,action,changes?,metadata?})` de `src/lib/audit.ts`.
- Produces: `ledgerDemandaMap(rows): Map<string, number>` (helper puro, exportado, `pjeDocumentoId → demandaId`, ignora `null`).

- [ ] **Step 1: Teste que falha** — `src/lib/trpc/routers/intimacoes.audit.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { ledgerDemandaMap } from "./intimacoes";

describe("ledgerDemandaMap", () => {
  it("mapeia pjeDocumentoId→demandaId, ignora null", () => {
    const m = ledgerDemandaMap([
      { pjeDocumentoId: "a", demandaId: 1, action: "imported" },
      { pjeDocumentoId: null, demandaId: 2, action: "skipped" },
      { pjeDocumentoId: "b", demandaId: 3, action: "updated" },
    ]);
    expect(m.get("a")).toBe(1);
    expect(m.get("b")).toBe(3);
    expect(m.size).toBe(2);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npm test -- src/lib/trpc/routers/intimacoes.audit.test.ts`
Expected: FAIL — `ledgerDemandaMap` não exportado.

- [ ] **Step 3: Exportar o helper** — no topo de `intimacoes.ts` (após imports):

```ts
export function ledgerDemandaMap(
  rows: Array<{ pjeDocumentoId: string | null; demandaId: number; action: string }>,
): Map<string, number> {
  const m = new Map<string, number>();
  for (const r of rows) if (r.pjeDocumentoId) m.set(r.pjeDocumentoId, r.demandaId);
  return m;
}
```

- [ ] **Step 4: Usar o mapa no upsert do ledger** — em `confirmarImport`, antes do loop do ledger, construir o mapa a partir do `result` de `importarDemandas`; no INSERT do ledger (:453-458) trocar o comentário `demandaId: null` por:

```ts
      const docMap = ledgerDemandaMap(result.rows);
      // ... dentro do loop, no branch else (insert):
            await tx.insert(pjeIntimacoesLedger).values({
              pjeDocumentoId: u.pjeDocumentoId,
              contentHash: u.contentHash,
              processoNumero: u.processoNumero,
              atribuicao: u.atribuicao as never,
              decisao: u.decisao,
              jobId: u.jobId,
              demandaId: docMap.get(u.pjeDocumentoId) ?? null,
            });
```
E no branch de UPDATE do ledger (:443-447), acrescentar `demandaId` ao `.set(...)` quando o mapa tiver o doc:
```ts
            await tx
              .update(pjeIntimacoesLedger)
              .set({ decisao: u.decisao, lastSeenAt: new Date(), jobId: u.jobId,
                     ...(docMap.has(u.pjeDocumentoId) ? { demandaId: docMap.get(u.pjeDocumentoId)! } : {}) })
              .where(eq(pjeIntimacoesLedger.id, existing.id));
```

- [ ] **Step 5: Auditar a importação** — após `importarDemandas` (:408), antes/depois do ledger, registrar em `audit_logs` por demanda importada/atualizada. Importar `logAudit` no topo e adicionar:

```ts
      // Import via intimações não passa pelo logAudit da UI — registrar aqui.
      for (const r of result.rows) {
        if (r.action === "skipped") continue;
        await logAudit({
          userId: ctx.user.id,
          userName: ctx.user.name ?? String(ctx.user.id),
          entityType: "demanda",
          entityId: r.demandaId,
          action: "import",
          metadata: { source: "pje-import", jobId: input.jobId ?? null, importBatchId: input.importBatchId ?? null },
        });
      }
```
(Ajustar `input.jobId`/`input.importBatchId` para os campos reais do input de `confirmarImport`; se não existirem, usar o `jobId` das linhas staged `u.jobId`.)

- [ ] **Step 6: Rodar teste + typecheck**

Run: `npm test -- src/lib/trpc/routers/intimacoes.audit.test.ts && npx tsc --noEmit 2>&1 | grep -E "intimacoes" || echo "no type errors in intimacoes"`
Expected: PASS + sem erros.

- [ ] **Step 7: Commit**

```bash
git add src/lib/trpc/routers/intimacoes.ts src/lib/trpc/routers/intimacoes.audit.test.ts
git commit -m "feat(intimacoes): confirmarImport preenche ledger.demanda_id + audita importação (action=import)"
```

---

### Task 3: coluna `demandas.analyzed_at` + varredura carimba

**Files:**
- Create: `drizzle/0068_demandas_analyzed_at.sql` (confirmar o próximo número livre com `ls drizzle/`)
- Modify: `src/lib/db/schema/core.ts` (tabela `demandas` — adicionar `analyzedAt`)
- Modify (RUNTIME): `.claude/skills/varredura-triagem/scripts/varredura_triagem.py` (`apply_classification`, no `update_demanda` de campos ~:1053-1060) — e **espelhar** em `.claude/skills-cowork/varredura-triagem/scripts/varredura_triagem.py`

**Interfaces:**
- Produces: coluna `demandas.analyzed_at` (nullable timestamptz); varredura seta `analyzed_at=now()` ao classificar.

- [ ] **Step 1: Migração** — `drizzle/0068_demandas_analyzed_at.sql`:

```sql
ALTER TABLE "demandas" ADD COLUMN IF NOT EXISTS "analyzed_at" timestamp with time zone;
```

- [ ] **Step 2: Tipar no schema** — em `core.ts`, na definição de `demandas`, junto de `updatedAt`/`syncedAt`:

```ts
  analyzedAt: timestamp("analyzed_at", { withTimezone: true }),
```

- [ ] **Step 3: Aplicar a migração** (confirmar via com o usuário se vai por `db:push` ou direto — ver Global Constraints do spec):

Run: `npx drizzle-kit push 2>&1 | tail -20` (ou aplicar o SQL direto no prod, conforme a via decidida)
Expected: coluna criada, sem erro.

- [ ] **Step 4: Carimbar na varredura** — em `apply_classification` (RUNTIME skills/), no dict `fields` (~:1053):

```python
    fields: dict = {
        "ato": rule["ato"],
        "prioridade": rule["prioridade"],
        "revisao_pendente": False,
        "analyzed_at": datetime.now().isoformat(),
    }
```
**Espelhar** a mesma edição em `.claude/skills-cowork/varredura-triagem/scripts/varredura_triagem.py`.

- [ ] **Step 5: Verificar sintaxe das duas cópias**

Run: `for f in .claude/skills/varredura-triagem/scripts/varredura_triagem.py .claude/skills-cowork/varredura-triagem/scripts/varredura_triagem.py; do python3 -c "import ast; ast.parse(open('$f').read()); print('ok $f')"; done`
Expected: ok nas duas.

- [ ] **Step 6: Regressão dos testes standalone (cópia runtime)**

Run: `for t in test_classify_juri test_classify_mpu test_fase1_analise; do python3 .claude/skills/varredura-triagem/scripts/$t.py >/dev/null 2>&1 && echo ok $t || echo FAIL $t; done`
Expected: ok (as edições não tocam a classificação; só adicionam um campo ao update).

- [ ] **Step 7: Commit**

```bash
git add drizzle/0068_demandas_analyzed_at.sql src/lib/db/schema/core.ts \
        .claude/skills/varredura-triagem/scripts/varredura_triagem.py \
        .claude/skills-cowork/varredura-triagem/scripts/varredura_triagem.py
git commit -m "feat(auditoria): demandas.analyzed_at + varredura carimba ao classificar (runtime+cowork)"
```

---

### Task 4: varredura escreve `audit_logs` + resultado estruturado + `--job-id`

**Files:**
- Modify (RUNTIME): `.claude/skills/varredura-triagem/scripts/varredura_triagem.py` (classe `Supabase`: novo `audit_write`; `apply_classification`; `varredura()` final; `main()` argparse) — **espelhar em skills-cowork**
- Modify: `scripts/browser-broker-daemon.mjs` (entry `varredura-triagem` ~:110-133: passar `--job-id`)
- Test: `.claude/skills/varredura-triagem/scripts/test_audit_write.py` (novo, standalone)

**Interfaces:**
- Produces: `Supabase.audit_write(entity_type, entity_id, action, changes, metadata)` → insere em `audit_logs`; helper puro `build_audit_payload(...)` testável; `--job-id` alimenta `JOB_ID` global usado em `metadata.job_id`; varredura imprime JSON `{atribuicao,since,limit,total,ok,manual_review,nao_painel,erros,atos}` como última linha.

- [ ] **Step 1: Teste que falha** — `test_audit_write.py`:

```python
#!/usr/bin/env python3
"""build_audit_payload — shape do audit_logs. Standalone."""
from __future__ import annotations
import sys
from pathlib import Path
SCRIPT = Path(__file__).parent / "varredura_triagem.py"
ns: dict = {"__file__": str(SCRIPT)}
src = SCRIPT.read_text()
src_no_main = "\n".join(l for l in src.splitlines()
    if not l.strip().startswith("main()") and l.strip() != 'if __name__ == "__main__":')
exec(src_no_main, ns)
build_audit_payload = ns["build_audit_payload"]

def main():
    fails = 0
    p = build_audit_payload(entity_type="demanda", entity_id=42, action="update",
                            changes={"ato": {"old": "Ciência", "new": "Analisar pronúncia (RESE)"}},
                            defensor_id=1, defensor_nome="Rodrigo", job_id=1352)
    checks = [
        (p["entity_type"], "demanda"), (p["entity_id"], 42), (p["action"], "update"),
        (p["user_id"], 1), (p["user_name"], "Rodrigo"),
        (p["metadata"]["job_id"], 1352), (p["metadata"]["source"], "varredura"),
        (p["changes"]["ato"]["new"], "Analisar pronúncia (RESE)"),
    ]
    for got, exp in checks:
        if got != exp: print(f"FAIL {got!r}!={exp!r}"); fails += 1
    print("OK" if not fails else f"{fails} FALHAS")
    sys.exit(1 if fails else 0)

if __name__ == "__main__":
    main()
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `python3 .claude/skills/varredura-triagem/scripts/test_audit_write.py`
Expected: FAIL — `KeyError: 'build_audit_payload'`.

- [ ] **Step 3: Helper puro + método** — em `varredura_triagem.py` (RUNTIME), adicionar o helper (perto de `fase_motivo_patch`) e o método na classe `Supabase`:

```python
JOB_ID: int | None = None  # setado por --job-id no main()

def build_audit_payload(entity_type: str, entity_id: int, action: str,
                        changes: dict | None, defensor_id: int, defensor_nome: str,
                        job_id: int | None) -> dict:
    """Payload de audit_logs (paridade com logAudit TS). entity_type SINGULAR."""
    return {
        "user_id": defensor_id,
        "user_name": defensor_nome,
        "entity_type": entity_type,
        "entity_id": entity_id,
        "action": action,
        "changes": changes or None,
        "metadata": {"source": "varredura", "job_id": job_id, "skill": "varredura-triagem"},
    }
```
E na classe `Supabase`:
```python
    def audit_write(self, payload: dict) -> None:
        try:
            self._req("POST", "/rest/v1/audit_logs", payload, prefer="return=minimal")
        except Exception as e:
            log(f"  ⚠ falha audit_write: {e}")
```

- [ ] **Step 4: Rodar teste e ver passar**

Run: `python3 .claude/skills/varredura-triagem/scripts/test_audit_write.py`
Expected: PASS — `OK`.

- [ ] **Step 5: Chamar audit_write em `apply_classification`** — ao final, junto do carimbo de `analyzed_at`, registrar a mudança do ato (usar o helper). Precisa do nome do defensor: buscar uma vez ou reusar um global `DEFENSOR_NOME` (setar de `--defensor-nome` opcional; se ausente, `f"Defensor #{DEFENSOR_ID}"`). Inserir após `sb.update_demanda(...)`:

```python
    try:
        old_ato = demanda.get("ato")
        changes = {"ato": {"old": old_ato, "new": rule["ato"]}} if old_ato != rule["ato"] else {"ato": {"old": old_ato, "new": rule["ato"]}}
        sb.audit_write(build_audit_payload("demanda", demanda["id"], "update", changes,
                        DEFENSOR_ID, globals().get("DEFENSOR_NOME") or f"Defensor #{DEFENSOR_ID}", JOB_ID))
    except Exception as e:
        log(f"  ⚠ audit demanda: {e}")
```
(Registros/audiências: opcional na 1ª iteração — a mudança do `ato` da demanda já dá a proveniência principal. Se incluir, um `audit_write` análogo em `insert_registro_returning`/`_agendar_audiencia` com `entity_type='registro'/'audiencia'`.) **Espelhar tudo em skills-cowork.**

- [ ] **Step 6: Resultado estruturado (última linha do stdout)** — no fim de `varredura()` (após `print_report(stats, counts)` ~:1895), adicionar:

```python
    result_json = {
        "atribuicao": atribuicao, "total": sum(stats.values()),
        "ok": stats["ok"], "manual_review": stats["manual"],
        "nao_painel": stats["not_found"], "erros": stats["errors"],
        "atos": counts,
    }
    print(json.dumps(result_json, ensure_ascii=False))  # última linha → browser-broker buildResultado captura
```
(Confirmar `import json` no topo do script — já usado.)

- [ ] **Step 7: `--job-id` no argparse + broker** — em `main()` adicionar:

```python
    parser.add_argument("--job-id", type=int, default=None)
    parser.add_argument("--defensor-nome", default=None)
```
e após parse: `global JOB_ID; JOB_ID = args.job_id` (e `DEFENSOR_NOME` análogo). No `scripts/browser-broker-daemon.mjs`, entry `varredura-triagem` (~:126), acrescentar ao `argv`:
```js
        ...(meta.jobId ? ['--job-id', String(meta.jobId)] : []),
```
(O broker já recebe `meta.jobId` — confirmar; os workers `pje-intimacoes-import`/`importar-pauta` já passam `--job-id` em :148/:173.)

- [ ] **Step 8: Sintaxe + regressão + espelho**

Run: `python3 -c "import ast; ast.parse(open('.claude/skills/varredura-triagem/scripts/varredura_triagem.py').read()); print('ok')" && for t in test_audit_write test_classify_juri test_fase1_analise; do python3 .claude/skills/varredura-triagem/scripts/$t.py >/dev/null 2>&1 && echo ok $t || echo FAIL $t; done`
Then copy the runtime script + new test to skills-cowork (espelho): `cp .claude/skills/varredura-triagem/scripts/varredura_triagem.py .claude/skills-cowork/varredura-triagem/scripts/varredura_triagem.py && cp .claude/skills/varredura-triagem/scripts/test_audit_write.py .claude/skills-cowork/varredura-triagem/scripts/test_audit_write.py`
Expected: ok/green nas duas cópias.

- [ ] **Step 9: Commit**

```bash
git add .claude/skills/varredura-triagem/scripts/ .claude/skills-cowork/varredura-triagem/scripts/ scripts/browser-broker-daemon.mjs
git commit -m "feat(varredura): audit_write por demanda + resultado estruturado no stdout + --job-id (runtime+cowork)"
```

---

### Task 5: endpoint `ultimaVarredura`

**Files:**
- Modify: `src/lib/trpc/routers/intimacoes.ts` (nova query, espelhando `ultimaImportacao` :336)
- Test: `src/lib/trpc/routers/intimacoes.audit.test.ts` (adicionar caso de shape do resultado)

**Interfaces:**
- Produces: `intimacoes.ultimaVarredura` → `{ jobId, finishedAt, resultado: {total,ok,manual_review,nao_painel,erros,atos} | null, atribuicao, createdBy } | null`.

- [ ] **Step 1: Teste que falha** — adicionar em `intimacoes.audit.test.ts` um teste do parser puro do resultado:

```ts
import { parseVarreduraResultado } from "./intimacoes";
it("parseVarreduraResultado extrai contadores do resultado bruto", () => {
  const r = parseVarreduraResultado({ ok: true, parsed: { total: 5, ok: 3, manual_review: 1, nao_painel: 1, erros: 0, atos: { "Ciência": 2 } } });
  expect(r).toEqual({ total: 5, ok: 3, manual_review: 1, nao_painel: 1, erros: 0, atos: { "Ciência": 2 } });
  expect(parseVarreduraResultado({ ok: true, stdoutTail: "x" })).toBeNull();
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npm test -- src/lib/trpc/routers/intimacoes.audit.test.ts`
Expected: FAIL — `parseVarreduraResultado` não existe.

- [ ] **Step 3: Helper + query** — em `intimacoes.ts`:

```ts
export function parseVarreduraResultado(resultado: unknown): {
  total: number; ok: number; manual_review: number; nao_painel: number; erros: number; atos: Record<string, number>;
} | null {
  const p = (resultado as { parsed?: Record<string, unknown> } | null)?.parsed;
  if (!p || typeof p.total !== "number") return null;
  return {
    total: p.total as number, ok: (p.ok as number) ?? 0,
    manual_review: (p.manual_review as number) ?? 0, nao_painel: (p.nao_painel as number) ?? 0,
    erros: (p.erros as number) ?? 0, atos: (p.atos as Record<string, number>) ?? {},
  };
}
```
E a query (após `ultimaImportacao`):
```ts
  ultimaVarredura: protectedProcedure.query(async () => {
    const [job] = await db
      .select({ id: claudeCodeTasks.id, completedAt: claudeCodeTasks.completedAt,
                createdAt: claudeCodeTasks.createdAt, resultado: claudeCodeTasks.resultado,
                createdBy: claudeCodeTasks.createdBy, meta: claudeCodeTasks.instrucaoAdicional })
      .from(claudeCodeTasks)
      .where(and(eq(claudeCodeTasks.skill, "varredura-triagem"), eq(claudeCodeTasks.status, "completed")))
      .orderBy(desc(claudeCodeTasks.id)).limit(1);
    if (!job) return null;
    const meta = (typeof job.meta === "string" ? JSON.parse(job.meta) : job.meta) ?? {};
    return {
      jobId: job.id,
      finishedAt: (job.completedAt ?? job.createdAt)?.toISOString() ?? null,
      resultado: parseVarreduraResultado(job.resultado),
      atribuicao: meta.atribuicao ?? null,
      createdBy: job.createdBy ?? null,
    };
  }),
```

- [ ] **Step 4: Teste + typecheck**

Run: `npm test -- src/lib/trpc/routers/intimacoes.audit.test.ts && npx tsc --noEmit 2>&1 | grep intimacoes || echo "no type errors"`
Expected: PASS + limpo.

- [ ] **Step 5: Commit**

```bash
git add src/lib/trpc/routers/intimacoes.ts src/lib/trpc/routers/intimacoes.audit.test.ts
git commit -m "feat(intimacoes): ultimaVarredura + parseVarreduraResultado"
```

---

### Task 6: implementar `auditLogs.list`/`stats` reais + backfill do ledger

**Files:**
- Modify: `src/lib/trpc/routers/auditLogs.ts` (implementar contra `audit_logs` real)
- Create: `scripts/audit/backfill_ledger_demanda.mjs`
- Test: `src/lib/trpc/routers/auditLogs.test.ts` (shape do filtro/paginação — SQL builder) e `scripts/audit/backfill.test.mjs` (matching)

**Interfaces:**
- Produces: `auditLogs.list({limit,offset,entityType?,entityId?,action?})` → `{logs: AuditLog[], total}`; `auditLogs.stats` → `{total, byAction, uniqueUsers}`. Backfill: função pura `pickDemandaId(matches[])` (tie-break: menor id).

- [ ] **Step 1: Teste que falha (backfill tie-break)** — `scripts/audit/backfill.test.mjs`:

```js
import { pickDemandaId } from "./backfill_ledger_demanda.mjs";
import assert from "node:assert";
assert.equal(pickDemandaId([{ id: 9 }, { id: 3 }, { id: 7 }]), 3, "tie-break = menor id");
assert.equal(pickDemandaId([{ id: 5 }]), 5);
assert.equal(pickDemandaId([]), null);
console.log("OK");
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `node scripts/audit/backfill.test.mjs`
Expected: FAIL — módulo não existe.

- [ ] **Step 3: Backfill script** — `scripts/audit/backfill_ledger_demanda.mjs`:

```js
import postgres from "postgres";
import { readFileSync } from "node:fs";

export function pickDemandaId(matches) {
  if (!matches.length) return null;
  return matches.reduce((min, m) => (m.id < min.id ? m : min)).id; // tie-break determinístico: menor id
}

async function main() {
  const env = readFileSync(".env.local", "utf8");
  const url = (env.match(/^DATABASE_URL=(.*)$/m) || [])[1]?.trim()?.replace(/^["']|["']$/g, "");
  const sql = postgres(url, { max: 1, prepare: false });
  let filled = 0, ambiguous = 0, unmatched = 0;
  try {
    const rows = await sql`SELECT id, pje_documento_id FROM pje_intimacoes_ledger WHERE demanda_id IS NULL AND pje_documento_id IS NOT NULL`;
    for (const r of rows) {
      const matches = await sql`SELECT id FROM demandas WHERE pje_documento_id = ${r.pje_documento_id}`;
      const did = pickDemandaId(matches);
      if (did === null) { unmatched++; continue; }
      if (matches.length > 1) ambiguous++;
      await sql`UPDATE pje_intimacoes_ledger SET demanda_id = ${did} WHERE id = ${r.id}`;
      filled++;
    }
    console.log(`backfill: filled=${filled} (ambiguous-resolved=${ambiguous}) unmatched=${unmatched}`);
  } finally { await sql.end(); }
}
if (import.meta.url === `file://${process.argv[1]}`) main();
```

- [ ] **Step 4: Rodar teste e ver passar**

Run: `node scripts/audit/backfill.test.mjs`
Expected: PASS — `OK`.

- [ ] **Step 5: Implementar o router real** — substituir o stub de `auditLogs.ts`:

```ts
import { router, adminProcedure } from "../init";
import { z } from "zod";
import { db } from "@/lib/db";
import { auditLogs } from "@/lib/db/schema";
import { and, eq, desc, sql, count } from "drizzle-orm";

export const auditLogsRouter = router({
  list: adminProcedure
    .input(z.object({
      limit: z.number().min(1).max(100).default(50),
      offset: z.number().min(0).default(0),
      entityType: z.string().optional(),
      entityId: z.number().optional(),
      action: z.string().optional(),
      jobId: z.number().optional(),
    }))
    .query(async ({ input }) => {
      const conds = [] as any[];
      if (input.entityType) conds.push(eq(auditLogs.entityType, input.entityType));
      if (input.entityId) conds.push(eq(auditLogs.entityId, input.entityId));
      if (input.action) conds.push(eq(auditLogs.action, input.action));
      if (input.jobId) conds.push(sql`${auditLogs.metadata}->>'job_id' = ${String(input.jobId)}`);
      const where = conds.length ? and(...conds) : undefined;
      const logs = await db.select().from(auditLogs).where(where)
        .orderBy(desc(auditLogs.id)).limit(input.limit).offset(input.offset);
      const [{ total }] = await db.select({ total: count() }).from(auditLogs).where(where);
      return { logs, total };
    }),
  stats: adminProcedure.query(async () => {
    const byAction = await db.select({ action: auditLogs.action, n: count() })
      .from(auditLogs).groupBy(auditLogs.action);
    const [{ total }] = await db.select({ total: count() }).from(auditLogs);
    const [{ users }] = await db.select({ users: sql<number>`count(distinct ${auditLogs.userId})::int` }).from(auditLogs);
    return { total, byAction, uniqueUsers: users };
  }),
});
```

- [ ] **Step 6: Rodar o backfill (uma vez, com confirmação do usuário) + typecheck**

Run: `npx tsc --noEmit 2>&1 | grep auditLogs || echo "no type errors"` — depois, sob confirmação, `node scripts/audit/backfill_ledger_demanda.mjs`
Expected: sem erros de tipo; backfill loga contagens.

- [ ] **Step 7: Commit**

```bash
git add src/lib/trpc/routers/auditLogs.ts scripts/audit/
git commit -m "feat(auditoria): auditLogs.list/stats reais + backfill do ledger.demanda_id (tie-break)"
```

---

### Task 7: router `auditoria` (listRuns, runDetail)

**Files:**
- Create: `src/lib/trpc/routers/auditoria.ts`; registrar em `src/lib/trpc/routers/index.ts`
- Test: `src/lib/trpc/routers/auditoria.test.ts` (shape/SQL do join por job_id)

**Interfaces:**
- Produces: `auditoria.listRuns({limit,offset})` → execuções import+varredura; `auditoria.runDetail({taskId})` → `{run, changes: AuditLog[]}` (changes via `metadata->>'job_id' = taskId`).

- [ ] **Step 1: Teste que falha** — `auditoria.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { runDetailChangesSql } from "./auditoria";
import { auditLogs } from "@/lib/db/schema";
import { PgDialect } from "drizzle-orm/pg-core";
describe("auditoria runDetail", () => {
  it("filtra audit_logs por metadata.job_id", () => {
    const s = new PgDialect().sqlToQuery(runDetailChangesSql(auditLogs, 1352)).sql;
    expect(s).toContain("metadata");
    expect(s).toContain("job_id");
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npm test -- src/lib/trpc/routers/auditoria.test.ts`
Expected: FAIL — módulo não existe.

- [ ] **Step 3: Router** — `auditoria.ts`:

```ts
import { router, adminProcedure } from "../init";
import { z } from "zod";
import { db } from "@/lib/db";
import { claudeCodeTasks, users, auditLogs } from "@/lib/db/schema";
import { and, eq, desc, inArray, sql, type SQL } from "drizzle-orm";

const AUDIT_SKILLS = ["pje-intimacoes-import", "varredura-triagem"] as const;

export function runDetailChangesSql(al: typeof auditLogs, taskId: number): SQL {
  return sql`SELECT * FROM ${al} WHERE ${al.metadata}->>'job_id' = ${String(taskId)} ORDER BY ${al.id} DESC LIMIT 500`;
}

export const auditoriaRouter = router({
  listRuns: adminProcedure
    .input(z.object({ limit: z.number().min(1).max(100).default(50), offset: z.number().min(0).default(0) }))
    .query(async ({ input }) => {
      const rows = await db.select({
        id: claudeCodeTasks.id, skill: claudeCodeTasks.skill, status: claudeCodeTasks.status,
        startedAt: claudeCodeTasks.startedAt, completedAt: claudeCodeTasks.completedAt,
        createdAt: claudeCodeTasks.createdAt, resultado: claudeCodeTasks.resultado,
        createdBy: claudeCodeTasks.createdBy, quem: users.name,
      })
        .from(claudeCodeTasks)
        .leftJoin(users, eq(claudeCodeTasks.createdBy, users.id))
        .where(inArray(claudeCodeTasks.skill, AUDIT_SKILLS as unknown as string[]))
        .orderBy(desc(claudeCodeTasks.id)).limit(input.limit).offset(input.offset);
      return rows;
    }),
  runDetail: adminProcedure
    .input(z.object({ taskId: z.number() }))
    .query(async ({ input }) => {
      const [run] = await db.select().from(claudeCodeTasks).where(eq(claudeCodeTasks.id, input.taskId)).limit(1);
      const changes = await db.execute(runDetailChangesSql(auditLogs, input.taskId));
      return { run: run ?? null, changes: (changes as unknown as { rows: unknown[] }).rows ?? changes };
    }),
});
```

- [ ] **Step 4: Registrar no index** — em `src/lib/trpc/routers/index.ts`, importar e adicionar `auditoria: auditoriaRouter,` ao `appRouter` (junto de `auditLogs`).

- [ ] **Step 5: Teste + typecheck**

Run: `npm test -- src/lib/trpc/routers/auditoria.test.ts && npx tsc --noEmit 2>&1 | grep auditoria || echo "no type errors"`
Expected: PASS + limpo.

- [ ] **Step 6: Commit**

```bash
git add src/lib/trpc/routers/auditoria.ts src/lib/trpc/routers/auditoria.test.ts src/lib/trpc/routers/index.ts
git commit -m "feat(auditoria): router listRuns/runDetail (join por metadata.job_id)"
```

---

### Task 8: tela `/admin/auditoria` (read-only) + redirect da órfã

**Files:**
- Create: `src/app/(dashboard)/admin/auditoria/page.tsx` + `src/components/auditoria/RunsList.tsx` + `src/components/auditoria/RunDetail.tsx`
- Modify: `src/app/(dashboard)/admin/audit-logs/page.tsx` (redirect p/ `/admin/auditoria`)
- Test: `src/components/auditoria/RunsList.test.tsx` (render de uma execução)

**Interfaces:**
- Consumes: `trpc.auditoria.listRuns`, `trpc.auditoria.runDetail` (Task 7).
- Produces: componentes `RunsList`, `RunDetail`.

- [ ] **Step 1: Teste que falha** — `RunsList.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { RunsList } from "./RunsList";
describe("RunsList", () => {
  it("mostra skill amigável, quem, contadores", () => {
    render(<RunsList runs={[{ id: 1352, skill: "varredura-triagem", status: "completed",
      quem: "Rodrigo", completedAt: new Date().toISOString(),
      resultado: { parsed: { total: 5, ok: 3 } } } as any]} onOpen={() => {}} />);
    expect(screen.getByText(/Varredura/i)).toBeInTheDocument();
    expect(screen.getByText("Rodrigo")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npm test -- src/components/auditoria/RunsList.test.tsx`
Expected: FAIL — módulo não existe.

- [ ] **Step 3: Componentes** — `RunsList.tsx` (apresentação; segue Padrão Defender — zinc/emerald, Lucide, sem emoji):

```tsx
"use client";
const SKILL_LABEL: Record<string, string> = {
  "varredura-triagem": "Varredura de triagem",
  "pje-intimacoes-import": "Importação de intimações",
};
export interface RunRow {
  id: number; skill: string; status: string; quem?: string | null;
  completedAt?: string | null; startedAt?: string | null;
  resultado?: { parsed?: Record<string, number> } | null;
}
export function RunsList({ runs, onOpen }: { runs: RunRow[]; onOpen: (id: number) => void }) {
  return (
    <ul className="divide-y divide-zinc-200">
      {runs.map((r) => {
        const p = r.resultado?.parsed ?? {};
        return (
          <li key={r.id} className="flex items-center justify-between py-2 px-1 hover:bg-zinc-50 cursor-pointer"
              onClick={() => onOpen(r.id)}>
            <div className="min-w-0">
              <p className="text-sm font-medium text-zinc-800">{SKILL_LABEL[r.skill] ?? r.skill}</p>
              <p className="text-xs text-zinc-500">
                {r.quem ?? "—"} · {(r.completedAt ?? r.startedAt ?? "").slice(0, 16).replace("T", " ")} · {r.status}
              </p>
            </div>
            {typeof p.total === "number" && (
              <span className="text-xs text-zinc-500 shrink-0">
                {p.total} itens{typeof p.ok === "number" ? ` · ${p.ok} ok` : ""}
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}
```
`RunDetail.tsx`: recebe `{run, changes}` e lista as mudanças (`entity_type #entity_id` + diff de `changes`); apresentacional, sem lógica de fetch.

- [ ] **Step 4: Rodar teste e ver passar**

Run: `npm test -- src/components/auditoria/RunsList.test.tsx`
Expected: PASS.

- [ ] **Step 5: Página** — `admin/auditoria/page.tsx`: client component que usa `trpc.auditoria.listRuns.useQuery()` para a lista e, ao abrir, `trpc.auditoria.runDetail.useQuery({taskId})` no `RunDetail`. Seguir o layout das páginas admin existentes (ex.: `admin/audit-logs/page.tsx` como referência de casca, mas com os componentes novos).

- [ ] **Step 6: Redirect da página órfã** — substituir o corpo de `admin/audit-logs/page.tsx` por um redirect server-side:

```tsx
import { redirect } from "next/navigation";
export default function AuditLogsRedirect() {
  redirect("/admin/auditoria");
}
```

- [ ] **Step 7: Typecheck + build das rotas**

Run: `npx tsc --noEmit 2>&1 | grep -E "auditoria|audit-logs" || echo "no type errors"`
Expected: limpo. (Verificação visual da tela é DEFERIDA a uma sessão com dev-server + login — sem harness de página.)

- [ ] **Step 8: Commit**

```bash
git add "src/app/(dashboard)/admin/auditoria" src/components/auditoria "src/app/(dashboard)/admin/audit-logs/page.tsx"
git commit -m "feat(auditoria): tela /admin/auditoria (runs + drill-down) + redirect da página órfã"
```

---

### Task 9: sincronizar cópias de skill + memória

**Files:**
- Sync: `.claude/skills/varredura-triagem/` ↔ `.claude/skills-cowork/varredura-triagem/` (garantir idênticos após B)
- Modify: memória do projeto

- [ ] **Step 1: Confirmar espelho idêntico** — as duas cópias do `varredura_triagem.py` devem ser iguais após B:

Run: `diff .claude/skills/varredura-triagem/scripts/varredura_triagem.py .claude/skills-cowork/varredura-triagem/scripts/varredura_triagem.py && echo IDENTICAL || echo "DIVERGE — copiar runtime→cowork"`
Expected: `IDENTICAL` (se divergir, `cp` runtime→cowork e re-rodar a suíte).

- [ ] **Step 2: Suíte completa nas duas cópias**

Run: `for base in .claude/skills .claude/skills-cowork; do for t in test_fase_motivo_routing test_classify_juri test_classify_ep_criminal test_fase1_analise test_audit_write; do python3 $base/varredura-triagem/scripts/$t.py >/dev/null 2>&1 && echo "ok $base/$t" || echo "FAIL $base/$t"; done; done`
Expected: ok em ambas.

- [ ] **Step 3: Atualizar memória** — anexar à nota `project_triagem_parity_anotacoes.md` (ou nota B nova) o estado de B: audit_write nos caminhos automáticos, ledger.demanda_id preenchido, analyzed_at, ultimaVarredura, /admin/auditoria, e o **gotcha crítico** de que a varredura roda de `.claude/skills/` (browser lane) e write_analise de `.claude/skills-cowork/` (ai lane). Atualizar `MEMORY.md`.

- [ ] **Step 4: Commit**

```bash
git add .claude/skills/varredura-triagem/ .claude/skills-cowork/varredura-triagem/
git commit -m "chore(auditoria): sincroniza cópias skill/skills-cowork da varredura pós-B"
```

---

## Self-Review

**Spec coverage:** B1 provenance → Tasks 1,2,3 (rows, ledger.demanda_id, analyzed_at) + backfill (Task 6). B2 run-observability → Task 4 (resultado estruturado) + Task 5 (ultimaVarredura). B3 audit trail → Task 4 (varredura audit_write) + Task 2 (import logAudit) + Task 6 (router real, sem triggers). B4 UI → Task 7 (routers) + Task 8 (tela + redirect da órfã). Sync/memória → Task 9.

**Placeholder scan:** os únicos pontos "confirmar na implementação" são plumbing real a verificar (campo `input.jobId` de confirmarImport; `meta.jobId` no broker; via de aplicação da migração) — cada um com fallback explícito, não TODOs vazios.

**Type/nome consistency:** `ImportResult.rows` (Task 1) é consumido por `ledgerDemandaMap` (Task 2); `build_audit_payload`/`audit_write` (Task 4) produzem o shape de `audit_logs` que `auditLogs.list` e `runDetail` (Tasks 6,7) leem, com `entity_type` singular e `metadata.job_id` como chave do drill-down (Task 8). `parseVarreduraResultado` (Task 5) lê o `resultado.parsed` que o `buildResultado` do broker gera a partir do JSON impresso pela varredura (Task 4).

**Cópia runtime:** todas as edições Python da varredura tocam `.claude/skills/` (o que o broker roda) e são espelhadas em `.claude/skills-cowork/` (Tasks 3,4,9).
