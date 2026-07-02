# Fix — Guard de re-enqueue da sentença — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax.

**Goal:** O hook de sentença na varredura para de re-enfileirar `analise-sentenca` a cada passada — pula se a sentença já foi processada (`sentencas` row) ou está em curso (task `analise-sentenca` pending/processing).

**Architecture:** Uma função `sentenca_ja_processada(sb, processo_id, doc_id)` (2 GETs PostgREST, try/except → False = fail-open) + uma condição a mais no call-site (`varredura_triagem.py:1500`). Espelhado nas duas cópias (`skills/` + `skills-cowork/`).

**Tech Stack:** Python 3.12 (varredura), PostgREST, teste standalone.

## Global Constraints

- Editar `.claude/skills/varredura-triagem/scripts/varredura_triagem.py` E espelhar byte-idêntico em `.claude/skills-cowork/varredura-triagem/scripts/varredura_triagem.py`.
- `sentenca_ja_processada` **nunca levanta** (try/except → `False` = fail-open: em erro, deixa enfileirar).
- Guarda só PULA quando confirma positivamente: `sentencas?processo_id=eq.X&pje_documento_id=eq.Y` retorna linha, OU `claude_code_tasks?skill=eq.analise-sentenca&processo_id=eq.X&status=in.(pending,processing)` retorna linha.
- Call-site: `if is_sentenca_ato(rule["ato"]) and _doc_id and not sentenca_ja_processada(sb, proc_id, str(_doc_id)):` — `proc_id` (=`demanda.get("processo_id")`) já em escopo (~L1433).
- Não mexer em `is_sentenca_ato`/`build_sentenca_task`/daemon/skill; sem migração.
- Colunas confirmadas: `sentencas.processo_id`/`pje_documento_id` (índice único), `claude_code_tasks.skill`/`processo_id`/`status`.
- Spec: `docs/superpowers/specs/2026-07-02-sentenca-reenqueue-guard-design.md`.
- Worktree: `/Users/rodrigorochameire/Projetos/Defender-sg` (branch `fix/sentenca-reenqueue-guard`).

---

### Task 1: `sentenca_ja_processada` + wire (ambas as cópias) + teste

**Files:**
- Modify: `.claude/skills/varredura-triagem/scripts/varredura_triagem.py` → espelhar em `.claude/skills-cowork/...`
- Test: `.claude/skills/varredura-triagem/scripts/test_sentenca_guard.py` (novo)

**Interfaces:**
- Produces: `sentenca_ja_processada(sb, processo_id, doc_id) -> bool`.

- [ ] **Step 1: Teste que falha** — `test_sentenca_guard.py` (padrão standalone das suítes da varredura; carrega via exec sem rodar main):

```python
#!/usr/bin/env python3
"""sentenca_ja_processada. Standalone."""
import sys
from pathlib import Path
SCRIPT = Path(__file__).parent / "varredura_triagem.py"
ns = {"__file__": str(SCRIPT), "__name__": "_t"}
src = SCRIPT.read_text()
src_no_main = "\n".join(l for l in src.splitlines()
    if not l.strip().startswith("main()") and l.strip() != 'if __name__ == "__main__":')
exec(compile(src_no_main, str(SCRIPT), "exec"), ns)
guard = ns["sentenca_ja_processada"]

def main():
    f = 0
    class SB:
        def __init__(self, sent=None, task=None, boom=False):
            self.sent, self.task, self.boom = sent or [], task or [], boom
        def _req(self, method, path):
            if self.boom:
                raise RuntimeError("net")
            if "/sentencas?" in path:
                return self.sent
            if "claude_code_tasks?" in path:
                return self.task
            return []
    # 1. sentença já existe → True
    if guard(SB(sent=[{"id": 1}]), 9, "doc-1") is not True:
        print("FAIL sentença existente → True"); f += 1
    # 2. sem sentença + task pendente → True
    if guard(SB(sent=[], task=[{"id": 2}]), 9, "doc-1") is not True:
        print("FAIL task pendente → True"); f += 1
    # 3. nenhum → False
    if guard(SB(sent=[], task=[]), 9, "doc-1") is not False:
        print("FAIL nenhum → False"); f += 1
    # 4. erro no _req → False (fail-open)
    if guard(SB(boom=True), 9, "doc-1") is not False:
        print("FAIL erro → False (fail-open)"); f += 1
    # 5. sem processo_id → não quebra (checa só o que dá) → False se nada
    if guard(SB(sent=[], task=[]), None, "doc-1") is not False:
        print("FAIL sem proc_id → False"); f += 1
    print("OK" if not f else f"{f} FALHAS")
    sys.exit(1 if f else 0)

if __name__ == "__main__":
    main()
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `python3 .claude/skills/varredura-triagem/scripts/test_sentenca_guard.py`
Expected: FAIL — `KeyError: 'sentenca_ja_processada'`.

- [ ] **Step 3: Implementar `sentenca_ja_processada`** — em `varredura_triagem.py`, logo após `build_sentenca_task` (~L155, antes do resto):

```python
def sentenca_ja_processada(sb, processo_id, doc_id) -> bool:
    """True se já há sentença processada (linha em `sentencas`) ou captura em curso
    (task analise-sentenca pending/processing) p/ este processo+doc.
    Fail-open: qualquer erro → False (deixa enfileirar; preserva o comportamento atual)."""
    try:
        if processo_id and doc_id:
            row = sb._req("GET",
                f"/rest/v1/sentencas?processo_id=eq.{processo_id}&pje_documento_id=eq.{doc_id}&select=id&limit=1")
            if row:
                return True
        if processo_id:
            pend = sb._req("GET",
                f"/rest/v1/claude_code_tasks?skill=eq.analise-sentenca&processo_id=eq.{processo_id}"
                f"&status=in.(pending,processing)&select=id&limit=1")
            if pend:
                return True
        return False
    except Exception:
        return False
```

- [ ] **Step 4: Rodar o teste e ver passar**

Run: `python3 .claude/skills/varredura-triagem/scripts/test_sentenca_guard.py`
Expected: PASS — `OK`.

- [ ] **Step 5: Wire no call-site** — em `apply_classification` (~L1500), acrescentar a condição:

```python
    if is_sentenca_ato(rule["ato"]) and _doc_id and not sentenca_ja_processada(sb, proc_id, str(_doc_id)):
        try:
            sb._req("POST", "/rest/v1/claude_code_tasks",
                    build_sentenca_task(demanda, rule, content, str(_doc_id)),
                    prefer="return=minimal")
            ...  # (bloco de log/except inalterado)
```
(Trocar SÓ a linha do `if`; o corpo try/except fica idêntico.)

- [ ] **Step 6: Espelhar em skills-cowork + confirmar idênticas**

```bash
cp .claude/skills/varredura-triagem/scripts/varredura_triagem.py .claude/skills-cowork/varredura-triagem/scripts/varredura_triagem.py
cp .claude/skills/varredura-triagem/scripts/test_sentenca_guard.py .claude/skills-cowork/varredura-triagem/scripts/test_sentenca_guard.py
diff .claude/skills/varredura-triagem/scripts/varredura_triagem.py .claude/skills-cowork/varredura-triagem/scripts/varredura_triagem.py && echo IDENTICAL
```

- [ ] **Step 7: ast + regressão (suítes existentes da varredura)**

Run: `python3 -c "import ast; ast.parse(open('.claude/skills/varredura-triagem/scripts/varredura_triagem.py').read()); print('ast ok')" && for t in test_sentenca_guard test_sentenca_hook test_classify_juri test_fase1_analise test_audit_write; do python3 .claude/skills/varredura-triagem/scripts/$t.py >/dev/null 2>&1 && echo "ok $t" || echo "FAIL $t"; done`
Expected: `ast ok` + todos green.

- [ ] **Step 8: Commit**

```bash
git add .claude/skills/varredura-triagem/scripts/ .claude/skills-cowork/varredura-triagem/scripts/
git commit -m "fix(varredura): guard de re-enqueue da sentença (pula se já processada/em curso) runtime+cowork"
```

---

### Task 2: Verificação final + memória

**Files:** verify only + memória.

- [ ] **Step 1: Cópias idênticas + suítes (ambas)**

Run: `diff .claude/skills/varredura-triagem/scripts/varredura_triagem.py .claude/skills-cowork/varredura-triagem/scripts/varredura_triagem.py && echo IDENTICAL; for base in .claude/skills .claude/skills-cowork; do for t in test_sentenca_guard test_sentenca_hook; do python3 $base/varredura-triagem/scripts/$t.py >/dev/null 2>&1 && echo "ok $base/$t" || echo "FAIL $base/$t"; done; done`
Expected: IDENTICAL + ok em ambas.

- [ ] **Step 2: Atualizar memória** — estender `project_c1_sentenca_landing.md`: follow-up do re-enqueue guard FEITO — `sentenca_ja_processada` (fail-open) pula o enqueue se há `sentencas` row (processo+doc) ou task analise-sentenca pending/processing; call-site guardado; ambas as cópias. Atualizar `MEMORY.md` se necessário.

- [ ] **Step 3: Registrar no ledger SDD.**

---

## Self-Review

**Spec coverage:** §3.1 `sentenca_ja_processada` → Task 1 Step 3 + teste Step 1; §3.2 call-site → Task 1 Step 5; §5 testes (existe/pendente/nenhum/erro/sem-proc) → Task 1 Step 1; §6 critérios: #1 teste, #2 Step 5, #3 fail-open teste 4, #4 Step 6-7 (cópias+ast), #5 (nada mais tocado).

**Placeholder scan:** sem TODOs; o único "…" é o corpo try/except inalterado (explícito: não mudar).

**Type/nome consistency:** `sentenca_ja_processada(sb, processo_id, doc_id)` idêntico entre def, teste e call-site. `proc_id`/`_doc_id` já em escopo no call-site.

**Cópia runtime:** editar em `.claude/skills/` e espelhar em `.claude/skills-cowork/` (Task 1 Step 6, Task 2 Step 1).
