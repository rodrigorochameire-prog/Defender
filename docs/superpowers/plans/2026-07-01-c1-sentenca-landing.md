# C1 — Landing da inteligência de sentença — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Trazer o pipeline de inteligência de sentença (já construído em `feat/sentenca-intelligence`) para o `main` atual e ligar o auto-roteamento na varredura: ciência de sentença → enfileira `analise-sentenca`.

**Architecture:** Os 13 arquivos NOVOS vêm inteiros do tip da branch via `git checkout <branch> -- <path>` (traz o conteúdo final, já com o commit `9f1180a5` embutido, sem cadeia de cherry-pick). Os 3 arquivos EXISTENTES recebem adições append-only manuais. A migração é renomeada. O hook da varredura é escrito à mão (2 hunks) nas duas cópias (`skills/` + `skills-cowork/`), já que o arquivo foi reescrito por SEEU/A/B no main.

**Tech Stack:** Next.js 15 + tRPC + Drizzle (Postgres), Python 3.12 (varredura, PostgREST), vitest.

## Global Constraints

- **Cópia RUNTIME da varredura:** editar `.claude/skills/varredura-triagem/scripts/varredura_triagem.py` (browser-broker roda essa) E espelhar em `.claude/skills-cowork/varredura-triagem/scripts/varredura_triagem.py` (byte-idênticas).
- **`is_sentenca_ato` EXCLUI acórdão** (`_ACORDAO_RE` antes do `_SENTENCA_RE`).
- **Guarda por `doc_id` do PJe** (`pje_documento_id`/`enrichment_data.id_documento_pje`) — EP (SEEU, sem doc) é pulado.
- **`created_by = 1` literal** (SYSTEM_USER_ID é constante TS; comentar apontando `src/config/system-user.ts`).
- **Task de sentença:** `skill='analise-sentenca'`, `lane='browser'`. Coexiste com `analise-intimacao` (ai, em lote no fim do loop) — não colidem.
- **Hook em try/except** — nunca quebra a varredura nem o side-effect de audiência.
- **Migração:** renomear `drizzle/0067_sentenca_intelligence.sql` → **`0071`** (0067–0070 tomados: seeu/acordao/main/fase2c). Confirmar o próximo livre com `ls drizzle/` no momento. Aplicar no prod é DEFERIDO (com confirmação).
- **Fora de escopo:** acórdão-auto (C1b), captura de EP, UI de sentenças.
- Spec: `docs/superpowers/specs/2026-07-01-c1-sentenca-landing-design.md`.

---

### Task 1: Landar os arquivos do pipeline + wiring + renomear migração

**Files:**
- Checkout (novos, do tip da branch): `src/lib/db/schema/sentencas.ts`, `src/lib/trpc/routers/sentencas.ts`, `src/lib/sentenca/{ato-set,dedupe,magistrado-key,parse-analise}.ts` + `src/lib/sentenca/__tests__/{ato-set,dedupe,detail-scope,magistrado-key,parse-analise}.test.ts`, `src/config/system-user.ts`, `.claude/skills/analise-sentenca/SKILL.md`, `.claude/skills/analise-sentenca/scripts/capturar_sentenca.py`, `drizzle/0067_sentenca_intelligence.sql`
- Modify (append-only): `src/lib/db/schema/index.ts`, `src/lib/trpc/routers/index.ts`, `src/lib/trpc/defensor-scope.ts`
- Rename: `drizzle/0067_sentenca_intelligence.sql` → `drizzle/0071_sentenca_intelligence.sql`

**Interfaces:**
- Produces: schema `sentencas`/`magistrados` + tipo `AnaliseSentenca` (com `dataSentenca`); `sentencasRouter` (`upsertFromAnalysis`, `getDetail`, `aggregate`); `getSentencaDetailScope(user)`; `SYSTEM_USER_ID`.

- [ ] **Step 1: Trazer os arquivos NOVOS do tip da branch**

```bash
cd /Users/rodrigorochameire/Projetos/Defender-c1
git fetch origin
git checkout origin/feat/sentenca-intelligence -- \
  src/lib/db/schema/sentencas.ts \
  src/lib/trpc/routers/sentencas.ts \
  src/lib/sentenca/ato-set.ts src/lib/sentenca/dedupe.ts src/lib/sentenca/magistrado-key.ts src/lib/sentenca/parse-analise.ts \
  src/lib/sentenca/__tests__/ato-set.test.ts src/lib/sentenca/__tests__/dedupe.test.ts src/lib/sentenca/__tests__/detail-scope.test.ts src/lib/sentenca/__tests__/magistrado-key.test.ts src/lib/sentenca/__tests__/parse-analise.test.ts \
  src/config/system-user.ts \
  .claude/skills/analise-sentenca/SKILL.md .claude/skills/analise-sentenca/scripts/capturar_sentenca.py \
  drizzle/0067_sentenca_intelligence.sql
```

- [ ] **Step 2: Corrigir o frontmatter do SKILL.md (lane→browser)**

O `description:` da skill diz "Lane=ai" mas o corpo e o hook usam browser. Abrir `.claude/skills/analise-sentenca/SKILL.md` e trocar, no frontmatter `description:`, qualquer menção a `Lane=ai`/`lane ai` por `Lane=browser`. (Se já estiver `browser`, seguir.)

- [ ] **Step 3: Renomear a migração para o próximo número livre**

```bash
ls drizzle/*.sql | grep -oE "00[0-9]+" | sort -u | tail -3   # confirmar o maior; esperado 0069 (main); 0070 tomado por fase2c
git mv drizzle/0067_sentenca_intelligence.sql drizzle/0071_sentenca_intelligence.sql
```
(Se `ls` mostrar 0070 ou 0071 já presente no `main` no momento, usar o próximo livre acima disso.)

- [ ] **Step 4: Wire `schema/index.ts`** — acrescentar ao final dos re-exports:

```ts
export * from "./sentencas";
```

- [ ] **Step 5: Wire `routers/index.ts`** — adicionar o import junto aos outros router imports:

```ts
import { sentencasRouter } from "./sentencas";
```
e, dentro do objeto `appRouter` (junto dos demais routers), acrescentar:

```ts
  // ==========================================
  // SENTENÇAS (1º grau — persistência da análise IA)
  // ==========================================
  sentencas: sentencasRouter,
```

- [ ] **Step 6: Wire `defensor-scope.ts`** — acrescentar ao final do arquivo:

```ts
/** Detail-visibility scope for the shared `sentencas` table.
 *  A sentença's detail is visible if its origin demanda's defensorId is visible to the user.
 *  Returns "all" (admin/unrestricted servidor) or the list of visible defensorIds.
 *  Callers must JOIN sentencas.demandaOrigemId → demandas.defensorId and filter by this. */
export function getSentencaDetailScope(user: User): number[] | "all" {
  return getDefensoresVisiveis(user);
}
```
(Confirmar que `User` e `getDefensoresVisiveis` já estão importados/definidos no arquivo — estão, o `getDefensoresVisiveis` é usado por outros scopes ali.)

- [ ] **Step 7: Rodar os testes que já vêm no cherry-pick**

Run: `npm test -- src/lib/sentenca/`
Expected: PASS — 5 arquivos de teste (`ato-set`, `dedupe`, `detail-scope`, `magistrado-key`, `parse-analise`) verdes.

- [ ] **Step 8: Typecheck do schema/router novos**

Run: `npx tsc --noEmit 2>&1 | grep -E "sentenca|schema/index|routers/index|defensor-scope|system-user" || echo "no type errors in touched files"`
Expected: sem erros nos arquivos tocados.

- [ ] **Step 9: Commit**

```bash
git add src/lib/db/schema/sentencas.ts src/lib/db/schema/index.ts src/lib/trpc/routers/sentencas.ts src/lib/trpc/routers/index.ts src/lib/sentenca/ src/config/system-user.ts src/lib/trpc/defensor-scope.ts .claude/skills/analise-sentenca/ drizzle/0071_sentenca_intelligence.sql
git commit -m "feat(sentenca): landa pipeline de inteligência de sentença (schema/router/helpers/skill) + migração 0071"
```

---

### Task 2: Hook de auto-roteamento na varredura (2 cópias) + testes

**Files:**
- Modify (RUNTIME): `.claude/skills/varredura-triagem/scripts/varredura_triagem.py` — espelhar em `.claude/skills-cowork/varredura-triagem/scripts/varredura_triagem.py`
- Test: `.claude/skills/varredura-triagem/scripts/test_sentenca_hook.py`

**Interfaces:**
- Produces: `is_sentenca_ato(ato) -> bool` (exclui acórdão); `build_sentenca_task(demanda, rule, content, doc_id) -> dict` (task de `analise-sentenca`).

- [ ] **Step 1: Teste que falha** — `test_sentenca_hook.py` (padrão standalone das outras suítes):

```python
#!/usr/bin/env python3
"""is_sentenca_ato + build_sentenca_task. Standalone."""
from __future__ import annotations
import sys, json
from pathlib import Path
SCRIPT = Path(__file__).parent / "varredura_triagem.py"
ns: dict = {"__file__": str(SCRIPT)}
src = SCRIPT.read_text()
src_no_main = "\n".join(l for l in src.splitlines()
    if not l.strip().startswith("main()") and l.strip() != 'if __name__ == "__main__":')
exec(src_no_main, ns)
is_sentenca_ato = ns["is_sentenca_ato"]
build_sentenca_task = ns["build_sentenca_task"]

def main():
    fails = 0
    SENT = ["Analisar sentença", "Ciência condenação", "Ciência absolvição",
            "Analisar pronúncia (RESE)", "Analisar impronúncia", "Ciência de desclassificação"]
    NOT = ["Ciência acórdão", "Analisar acórdão", "Ciência", "Resposta à Acusação"]
    for a in SENT:
        if not is_sentenca_ato(a): print(f"FAIL deveria ser sentença: {a!r}"); fails += 1
    for a in NOT:
        if is_sentenca_ato(a): print(f"FAIL NÃO deveria ser sentença: {a!r}"); fails += 1
    demanda = {"id": 42, "assistido_id": 7, "processo_id": 9,
               "processos": {"numero_autos": "8000000-00.2026.8.05.0039", "atribuicao": "JURI_CAMACARI"}}
    task = build_sentenca_task(demanda, {"ato": "Analisar sentença"}, "corpo da sentença", "doc-123")
    checks = [(task["skill"], "analise-sentenca"), (task["lane"], "browser"),
              (task["created_by"], 1), (task["assistido_id"], 7), (task["processo_id"], 9)]
    for got, exp in checks:
        if got != exp: print(f"FAIL task {got!r}!={exp!r}"); fails += 1
    ia = json.loads(task["instrucao_adicional"])
    for k in ("numero_processo", "pje_documento_id", "assistido_id", "atribuicao", "demanda_origem_id", "registro_raw_text"):
        if k not in ia: print(f"FAIL instrucao_adicional sem {k}"); fails += 1
    if ia["pje_documento_id"] != "doc-123" or ia["demanda_origem_id"] != 42: print("FAIL payload ids"); fails += 1
    print("OK" if not fails else f"{fails} FALHAS")
    sys.exit(1 if fails else 0)

if __name__ == "__main__":
    main()
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `python3 .claude/skills/varredura-triagem/scripts/test_sentenca_hook.py`
Expected: FAIL — `KeyError: 'is_sentenca_ato'`.

- [ ] **Step 3: Adicionar os helpers** — em `varredura_triagem.py` (RUNTIME), logo após a função `normalize()`:

```python
_SENTENCA_RE = re.compile(r"senten|condena|absolvi|pronuncia|impron|desclassifica")
_ACORDAO_RE = re.compile(r"acordao")

def is_sentenca_ato(ato: str) -> bool:
    """True se o ato é de sentença (1ª instância). EXCLUI acórdão (2ª instância —
    fluxo manual via instancia-superior)."""
    n = normalize(ato or "")
    if _ACORDAO_RE.search(n):
        return False
    return bool(_SENTENCA_RE.search(n))


def build_sentenca_task(demanda: dict, rule: dict, content: str, doc_id: str) -> dict:
    """Task claude_code_tasks p/ a skill analise-sentenca (lane browser: captura o
    PDF no PJe, analisa, faz upsert em sentencas). created_by=1 (SYSTEM_USER_ID —
    ver src/config/system-user.ts)."""
    procs = demanda.get("processos") or {}
    numero = procs.get("numero_autos") or ""
    payload = {
        "numero_processo": numero,
        "pje_documento_id": doc_id,
        "assistido_id": demanda.get("assistido_id"),
        "atribuicao": procs.get("atribuicao"),
        "demanda_origem_id": demanda["id"],
        "registro_raw_text": (content or "")[:12000],
    }
    return {
        "skill": "analise-sentenca",
        "lane": "browser",
        "status": "pending",
        "etapa": "Na fila",
        "created_by": 1,  # SYSTEM_USER_ID — src/config/system-user.ts
        "assistido_id": demanda.get("assistido_id"),
        "processo_id": demanda.get("processo_id"),
        "prompt": (f"Capturar e analisar sentença de {numero or 'processo'}").strip(),
        "instrucao_adicional": json.dumps(payload, ensure_ascii=False),
    }
```

- [ ] **Step 4: Rodar o teste e ver passar**

Run: `python3 .claude/skills/varredura-triagem/scripts/test_sentenca_hook.py`
Expected: PASS — `OK`.

- [ ] **Step 5: Ligar o call-site em `apply_classification`** — inserir **imediatamente antes** do bloco `# ── Side-effect: agendar / reagendar audiência` (a variável `content` é o texto lido; `demanda`, `rule` estão em escopo):

```python
    # ── Auto-roteamento sentença (C1): ciência de sentença → captura+análise ────
    _doc_id = demanda.get("pje_documento_id") or (demanda.get("enrichment_data") or {}).get("id_documento_pje")
    if is_sentenca_ato(rule["ato"]) and _doc_id:
        try:
            sb._req("POST", "/rest/v1/claude_code_tasks",
                    build_sentenca_task(demanda, rule, content, str(_doc_id)),
                    prefer="return=minimal")
            log(f"  ⚖ análise de sentença enfileirada (analise-sentenca) p/ {(demanda.get('processos') or {}).get('numero_autos') or '?'}")
        except Exception as e:
            log(f"  ⚠ falha ao enfileirar analise-sentenca (demanda={demanda['id']}): {e}")
```

- [ ] **Step 6: Espelhar em skills-cowork + verificar idênticas**

```bash
cp .claude/skills/varredura-triagem/scripts/varredura_triagem.py .claude/skills-cowork/varredura-triagem/scripts/varredura_triagem.py
cp .claude/skills/varredura-triagem/scripts/test_sentenca_hook.py .claude/skills-cowork/varredura-triagem/scripts/test_sentenca_hook.py
diff .claude/skills/varredura-triagem/scripts/varredura_triagem.py .claude/skills-cowork/varredura-triagem/scripts/varredura_triagem.py && echo IDENTICAL
```

- [ ] **Step 7: Sintaxe + regressão da varredura**

Run: `python3 -c "import ast; ast.parse(open('.claude/skills/varredura-triagem/scripts/varredura_triagem.py').read()); print('ast ok')" && for t in test_sentenca_hook test_classify_juri test_classify_ep_criminal test_fase1_analise test_audit_write test_classify_mpu test_movimento_audiencia; do python3 .claude/skills/varredura-triagem/scripts/$t.py >/dev/null 2>&1 && echo "ok $t" || echo "FAIL $t"; done`
Expected: ast ok + todos green.

- [ ] **Step 8: Commit**

```bash
git add .claude/skills/varredura-triagem/scripts/ .claude/skills-cowork/varredura-triagem/scripts/
git commit -m "feat(varredura): hook auto-roteamento sentença (is_sentenca_ato + build_sentenca_task, exclui acórdão, pula EP) runtime+cowork"
```

---

### Task 3: Verificação de build + sincronização + memória

**Files:**
- Verify only + memória.

- [ ] **Step 1: Build de produção (o schema/router novos entram no bundle)**

Run: `NODE_OPTIONS=--max-old-space-size=8192 npm run build > /tmp/c1-build.log 2>&1; echo "BUILD_EXIT=$?"; grep -E "BUILD_EXIT|Failed to compile|✓ Generating static pages" /tmp/c1-build.log | tail -3`
Expected: `BUILD_EXIT=0`, sem "Failed to compile".

- [ ] **Step 2: Cópias idênticas (final)**

Run: `diff .claude/skills/varredura-triagem/scripts/varredura_triagem.py .claude/skills-cowork/varredura-triagem/scripts/varredura_triagem.py && echo IDENTICAL`
Expected: IDENTICAL.

- [ ] **Step 3: Suíte completa da varredura (as duas cópias)**

Run: `for base in .claude/skills .claude/skills-cowork; do for t in test_sentenca_hook test_classify_juri test_fase1_analise test_audit_write; do python3 $base/varredura-triagem/scripts/$t.py >/dev/null 2>&1 && echo "ok $base/$t" || echo "FAIL $base/$t"; done; done`
Expected: ok em ambas.

- [ ] **Step 4: Atualizar memória** — nota `project_c1_sentenca_landing.md`: pipeline de sentença landado (schema sentencas/magistrados, router, skill analise-sentenca, migração 0071); hook na varredura (is_sentenca_ato exclui acórdão, guarda por doc_id pula EP, lane=browser coexiste com analise-intimacao ai); DEFERIDOS: aplicar 0071 no prod, verificação viva de capturar_sentenca.py; acórdão-auto = C1b. Atualizar `MEMORY.md`.

- [ ] **Step 5: Commit (se a nota estiver no repo; senão só memória externa)** — memória fica em `~/.claude/.../memory/` (fora do git); nada a commitar aqui além do já feito. Registrar no ledger SDD.

---

## Self-Review

**Spec coverage:** §4.1 (cherry-pick/landing) → Task 1 (checkout novos + wire 3 + rename migração). §4.2 (renumeração) → Task 1 Step 3 (0071, próximo livre). §4.3 (hook) → Task 2 (is_sentenca_ato + build_sentenca_task + call-site, 2 cópias). §7 (testes) → sentenca/* (Task 1 Step 7) + test_sentenca_hook (Task 2). §8 critérios: #1 Task1 Step7-8; #2 Task1 Step3 (+ apply deferido); #3/#4/#5 Task2 test; #6 coexistência (call-site não toca o enqueue de analise-intimacao); #7 Task2 Step6-7 + Task3 Step2-3.

**Placeholder scan:** sem TODOs vazios; o único ponto "confirmar no momento" é o número da migração (0071 com verificação `ls drizzle/`), inerente ao churn de branches.

**Type/nome consistency:** `is_sentenca_ato`/`build_sentenca_task` definidos em Task 2 e testados no mesmo; `getSentencaDetailScope`/`SYSTEM_USER_ID`/`sentencasRouter` vêm dos arquivos landados em Task 1 (contrato do branch, já testado nos `sentenca/*` tests). Migração `0071` consistente entre Task 1 Step 3 e §8.

**Cópia runtime:** hook em `.claude/skills/` (browser-broker) espelhado em `.claude/skills-cowork/` (Task 2 Step 6, Task 3 Step 2).
