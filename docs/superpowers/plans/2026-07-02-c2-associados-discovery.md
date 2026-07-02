# C2.2a — Descoberta de associados (do texto dos autos) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A análise da Fase 2c passa a saber dos processos associados/conexos — extraídos do TEXTO dos autos principais já baixados (método validado; o menu "Associados (N)" do PJe é comprovadamente inútil) e injetados no dossiê.

**Architecture:** Tudo no worker `.claude/skills/analise-profunda-demanda/scripts/analise_profunda_autos.py`. Funções PURAS (`extract_cnjs`, `associados_from_text`, `format_dossie(..., associados)`), uma cola de I/O `extrair_associados_autos(pdf_path, cnj)` (usa `vt.extract_pdf_text`, nunca levanta), e o wire no `main_async` (ramo PJe, após `baixar_pdf_autos`). Sem browser, sem migração, sem daemon/skill.

**Tech Stack:** Python 3.12 (worker), pdftotext via `vt.extract_pdf_text`, testes standalone.

## Global Constraints

- **Fonte = texto do PDF dos autos** (não o menu do PJe). `vt.extract_pdf_text(pdf_path)` (varredura_triagem.py:1214, nunca levanta) → `associados_from_text`.
- **Sem browser**: usa `pdf_path` (arquivo /tmp) que sobrevive ao fechamento do bloco async.
- `CNJ_RE = re.compile(r"\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}")`, `MAX_ASSOCIADOS = 30`.
- **`associados_from_text` exclui o CNJ principal** (normalizando só dígitos via `_cnj_digits`).
- **`extrair_associados_autos` NUNCA levanta** (try/except → `[]`).
- **`format_dossie` e `build_dossie_assistido` ganham `associados=None` (default)** — os testes existentes chamam posicionalmente sem o param, então o default preserva o comportamento (C2.2 intacto quando `associados` é None/vazio).
- **Wire só no ramo PJe**: `associados = []` inicializado cedo (após `fonte=`, ~L357) p/ o ramo SEEU não dar NameError; sobrescrito no ramo `else` (PJe) após `baixar_pdf_autos` (~L399); passado a `build_dossie_assistido` (~L411).
- Seção no dossiê: `### Processos associados/conexos (citados nos autos)`.
- Caveat aceito: a lista pode ter falsos positivos (só informa a análise, não baixa nada) — sem classificação/DV nesta fatia.
- Testes existentes (`test_gather_dossie`, `test_analise_profunda_helpers`, `test_worker_structure`) verdes; `ast.parse` ok.
- Worker: `.claude/skills/analise-profunda-demanda/scripts/analise_profunda_autos.py`. `vt` = `import varredura_triagem as vt` (L207).
- Spec: `docs/superpowers/specs/2026-07-02-c2-associados-discovery-design.md`.
- Worktree: `/Users/rodrigorochameire/Projetos/Defender-c2c` (branch `feat/c2-associados-discovery`).

---

### Task 1: Funções puras — extract_cnjs, associados_from_text, format_dossie/build_dossie ganham `associados`

**Files:**
- Modify: `.claude/skills/analise-profunda-demanda/scripts/analise_profunda_autos.py`
- Test: `.claude/skills/analise-profunda-demanda/scripts/test_gather_dossie.py` (estender)

**Interfaces:**
- Produces: `extract_cnjs(text) -> list[str]`; `associados_from_text(text, cnj_principal="") -> list[str]`; `format_dossie(sections, registros, analises, associados=None) -> str`; `build_dossie_assistido(sb, assistido_id, associados=None) -> str`.

- [ ] **Step 1: Teste que falha** — estender `test_gather_dossie.py`, adicionar antes do `print("OK"...)` do `main()`:

```python
    # === C2.2a: associados ===
    extract_cnjs = ns["extract_cnjs"]
    associados_from_text = ns["associados_from_text"]
    # 11. extract_cnjs: dedup, sort, cap, vazio
    txt = "ref 8000001-11.2026.8.05.0039 e 8000001-11.2026.8.05.0039 e 8000002-22.2026.8.05.0039"
    cn = extract_cnjs(txt)
    if cn != ["8000001-11.2026.8.05.0039", "8000002-22.2026.8.05.0039"]:
        print(f"FAIL extract_cnjs: {cn}"); f += 1
    if extract_cnjs("") != [] or extract_cnjs(None) != []:
        print("FAIL extract_cnjs vazio/None"); f += 1
    if len(extract_cnjs(" ".join(f"800{i:04d}-11.2026.8.05.0039" for i in range(50)))) != 30:
        print("FAIL extract_cnjs cap 30"); f += 1
    # 12. associados_from_text: exclui o principal (apesar da máscara)
    principal = "8000001-11.2026.8.05.0039"
    t2 = f"Processo referência: {principal}. Associado 8000002-22.2026.8.05.0039 e 8000003-33.2026.8.05.0039"
    a = associados_from_text(t2, principal)
    if a != ["8000002-22.2026.8.05.0039", "8000003-33.2026.8.05.0039"]:
        print(f"FAIL associados_from_text excluir principal: {a}"); f += 1
    if associados_from_text(f"só o principal {principal}", principal) != []:
        print("FAIL associados_from_text só principal → []"); f += 1
    # 13. format_dossie com associados → seção; sem → nada
    d = format_dossie([], [], [], associados=["8000002-22.2026.8.05.0039"])
    if "Processos associados/conexos" not in d or "8000002-22.2026.8.05.0039" not in d:
        print("FAIL format_dossie seção associados"); f += 1
    if "Processos associados" in format_dossie([], [], [], associados=None):
        print("FAIL format_dossie None → sem seção"); f += 1
    if "Processos associados" in format_dossie([], [], []):
        print("FAIL format_dossie default → sem seção"); f += 1
    # 14. só associados (sem outras seções) ainda produz dossiê não-vazio
    if format_dossie([], [], [], associados=["8000002-22.2026.8.05.0039"]) == "":
        print("FAIL só associados deveria render"); f += 1
    # 15. build_dossie_assistido repassa associados (FakeSB vazio + associados)
    build_dossie = ns["build_dossie_assistido"]
    class EmptySB:
        def _req(self, *a, **k): return []
    d2 = build_dossie(EmptySB(), 7, associados=["8000002-22.2026.8.05.0039"])
    if "Processos associados/conexos" not in d2:
        print("FAIL build_dossie não repassou associados"); f += 1
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `python3 .claude/skills/analise-profunda-demanda/scripts/test_gather_dossie.py`
Expected: FAIL — `KeyError: 'extract_cnjs'`.

- [ ] **Step 3: Implementar as puras** — em `analise_profunda_autos.py`, junto das constantes do dossiê (perto de `MAX_DOSSIE_CHARS`):

```python
import re  # se ainda não importado no topo do arquivo (checar; varredura importa re)

CNJ_RE = re.compile(r"\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}")
MAX_ASSOCIADOS = 30


def extract_cnjs(text: str) -> list:
    """CNJs distintos, ordenados, capados. Nunca levanta."""
    return sorted(set(CNJ_RE.findall(text or "")))[:MAX_ASSOCIADOS]


def _cnj_digits(s: str) -> str:
    return re.sub(r"\D", "", s or "")


def associados_from_text(text: str, cnj_principal: str = "") -> list:
    """CNJs citados no texto dos autos, EXCETO o processo principal."""
    main = _cnj_digits(cnj_principal)
    return [c for c in extract_cnjs(text) if _cnj_digits(c) != main]
```
(Confirmar que `re` está importado no worker; se não, adicionar `import re` no topo.)

- [ ] **Step 4: Adicionar `associados` a `format_dossie`** — nova seção, renderizada antes do bound total (dentro de `format_dossie`, junto às outras seções, e assinatura ganha `associados=None`):

```python
def format_dossie(sections: list, registros: list, analises: list, associados: list = None) -> str:
    ...
    # (após a seção "Análises anteriores", antes do `if not parts:`)
    if associados:
        assoc_lines = [f"- {c}" for c in associados[:MAX_ASSOCIADOS]]
        parts.append("### Processos associados/conexos (citados nos autos)\n" + "\n".join(assoc_lines))
    ...
```

- [ ] **Step 5: Adicionar `associados` a `build_dossie_assistido`** — assinatura + repasse:

```python
def build_dossie_assistido(sb, assistido_id, associados: list = None) -> str:
    try:
        if not assistido_id and not associados:
            return ""
        sections, registros, analises = ([], [], [])
        if assistido_id:
            sections, registros, analises = fetch_dossie_data(sb, assistido_id)
        return format_dossie(sections, registros, analises, associados=associados)
    except Exception:
        return ""
```
(Preserva o try/except → `""`. Agora um assistido_id vazio mas com associados ainda renderiza a seção; e o BoomSB/erro segue engolido.)

- [ ] **Step 6: Rodar o teste e ver passar**

Run: `python3 .claude/skills/analise-profunda-demanda/scripts/test_gather_dossie.py`
Expected: PASS — `OK`.

- [ ] **Step 7: Teste existente ainda verde**

Run: `python3 .claude/skills/analise-profunda-demanda/scripts/test_analise_profunda_helpers.py`
Expected: PASS (não mexe em `build_analise_autos_task`; `format_dossie`/`build_dossie` mantêm compat posicional).

- [ ] **Step 8: Commit**

```bash
git add .claude/skills/analise-profunda-demanda/scripts/analise_profunda_autos.py .claude/skills/analise-profunda-demanda/scripts/test_gather_dossie.py
git commit -m "feat(fase2c): extract_cnjs + associados_from_text + seção de associados no dossiê (puros)"
```

---

### Task 2: `extrair_associados_autos` (pdftotext) + wire no worker

**Files:**
- Modify: `.claude/skills/analise-profunda-demanda/scripts/analise_profunda_autos.py`
- Test: `.claude/skills/analise-profunda-demanda/scripts/test_gather_dossie.py` (estender)

**Interfaces:**
- Consumes: `associados_from_text` (Task 1), `vt.extract_pdf_text`.
- Produces: `extrair_associados_autos(pdf_path, cnj_principal="") -> list[str]`.

- [ ] **Step 1: Teste que falha** — adicionar em `test_gather_dossie.py` (antes do `print("OK")`):

```python
    # 16. extrair_associados_autos: monkeypatch vt.extract_pdf_text
    extrair = ns["extrair_associados_autos"]
    vt_mod = ns["vt"]
    principal2 = "8000010-11.2026.8.05.0039"
    _orig = vt_mod.extract_pdf_text
    try:
        vt_mod.extract_pdf_text = lambda p: f"Processo referência: {principal2}. Assoc 8000011-22.2026.8.05.0039"
        r = extrair("/tmp/qualquer.pdf", principal2)
        if r != ["8000011-22.2026.8.05.0039"]:
            print(f"FAIL extrair_associados_autos: {r}"); f += 1
        # levanta → [] (engolido)
        def _boom(p): raise RuntimeError("x")
        vt_mod.extract_pdf_text = _boom
        if extrair("/tmp/qualquer.pdf", principal2) != []:
            print("FAIL extrair deveria engolir erro"); f += 1
        # pdf_path vazio → []
        if extrair("", principal2) != []:
            print("FAIL extrair pdf_path vazio → []"); f += 1
    finally:
        vt_mod.extract_pdf_text = _orig
```
(O teste acessa `ns["vt"]` — o worker faz `import varredura_triagem as vt`, então `vt` está no namespace do `exec`.)

- [ ] **Step 2: Rodar e ver falhar**

Run: `python3 .claude/skills/analise-profunda-demanda/scripts/test_gather_dossie.py`
Expected: FAIL — `KeyError: 'extrair_associados_autos'`.

- [ ] **Step 3: Implementar `extrair_associados_autos`** — após `associados_from_text`:

```python
def extrair_associados_autos(pdf_path, cnj_principal: str = "") -> list:
    """Extrai CNJs de associados do TEXTO dos autos (pdftotext). Nunca levanta."""
    try:
        if not pdf_path:
            return []
        texto = vt.extract_pdf_text(pdf_path)
        return associados_from_text(texto or "", cnj_principal)
    except Exception:
        return []
```

- [ ] **Step 4: Rodar o teste e ver passar**

Run: `python3 .claude/skills/analise-profunda-demanda/scripts/test_gather_dossie.py`
Expected: PASS — `OK`.

- [ ] **Step 5: Wire no `main_async`** — três edições cirúrgicas:

**(a)** Após `fonte = sa.escolhe_fonte_autos(atribuicao)` (~L357), inicializar o default:
```python
        fonte = sa.escolhe_fonte_autos(atribuicao)
        associados = []
```

**(b)** No ramo PJe (`else:` ~L373), logo após `pdf_path = await vt.baixar_pdf_autos(ctx, autos_url)` (~L399):
```python
                pdf_path = await vt.baixar_pdf_autos(ctx, autos_url)
                ...
                associados = extrair_associados_autos(pdf_path, cnj)
```
(Colocar imediatamente após o `pdf_path` estar definido, dentro do `else`, mesmo nível de indentação das linhas vizinhas do ramo. Se houver checagem `if not pdf_path: return ...` logo após o download, colocar `associados = ...` DEPOIS dela.)

**(c)** Na chamada `dossie = build_dossie_assistido(sb, row["assistido_id"])` (~L411), passar `associados`:
```python
        dossie = build_dossie_assistido(sb, row["assistido_id"], associados=associados)
```

- [ ] **Step 6: ast + testes**

Run: `python3 -c "import ast; ast.parse(open('.claude/skills/analise-profunda-demanda/scripts/analise_profunda_autos.py').read()); print('ast ok')" && python3 .claude/skills/analise-profunda-demanda/scripts/test_gather_dossie.py && python3 .claude/skills/analise-profunda-demanda/scripts/test_analise_profunda_helpers.py && python3 .claude/skills/analise-profunda-demanda/scripts/test_worker_structure.py`
Expected: `ast ok` + os 3 testes PASS.

- [ ] **Step 7: Commit**

```bash
git add .claude/skills/analise-profunda-demanda/scripts/
git commit -m "feat(fase2c): extrair_associados_autos (pdftotext) + wire no worker (ramo PJe, associados no dossiê)"
```

---

### Task 3: Memória + verificação final

**Files:** verify only + memória.

- [ ] **Step 1: Todos os testes + ast**

Run: `for t in test_gather_dossie test_analise_profunda_helpers test_worker_structure; do python3 .claude/skills/analise-profunda-demanda/scripts/$t.py >/dev/null 2>&1 && echo "ok $t" || echo "FAIL $t"; done; python3 -c "import ast; ast.parse(open('.claude/skills/analise-profunda-demanda/scripts/analise_profunda_autos.py').read()); print('ast ok')"`
Expected: ok em todos + ast ok.

- [ ] **Step 2: Atualizar memória** — estender `project_c2_produzir_peca.md`: C2.2a (associados) — worker extrai CNJs de associados do TEXTO dos autos (`vt.extract_pdf_text` → `associados_from_text`, exclui principal), injeta seção "Processos associados/conexos" no dossiê; menu "Associados (N)" descartado (auditoria: vem 0). Puros testáveis; extração inspection+deferida (pdftotext). Sem browser/migração. DEFERIDO: 2b download real + classificação/DV. Atualizar `MEMORY.md`.

- [ ] **Step 3: Registrar no ledger SDD** que C2.2a está pronto.

---

## Self-Review

**Spec coverage:** §4.1 extract_cnjs → Task 1 Step 3; §4.2 associados_from_text → Task 1 Step 3; §4.3 format_dossie associados → Task 1 Step 4; §4.4 extrair_associados_autos → Task 2 Step 3; §4.5 build_dossie associados → Task 1 Step 5; §4.6 wire (associados=[] default + extract + pass) → Task 2 Step 5; §7 testes → Task 1+2 testes; §8 critérios: #1 Task1 testes 11-12, #2 Task1 testes 13, #3 Task2 teste 16, #4 Task1 teste 15, #5 Task2 Step 5, #6 Task2 Step 6.

**Placeholder scan:** sem TODOs; condicionais (confirmar `import re`; colocar `associados=` após checagem de pdf_path) têm instrução explícita.

**Type/nome consistency:** `extract_cnjs`/`associados_from_text`/`extrair_associados_autos`/`format_dossie(...,associados)`/`build_dossie_assistido(...,associados)` idênticos entre defs, testes e wire. `MAX_ASSOCIADOS`/`CNJ_RE` nomeados conforme Global Constraints.

**Nota:** sem browser/migração/daemon. Risco real: a extração de CNJ é validada por teste (texto→CNJs); a fidelidade do pdftotext em autos reais + a taxa de falsos positivos ficam para verificação viva (deferida). O `build_dossie_assistido` agora renderiza mesmo sem assistido_id se houver associados — confirmar que isso não quebra nada (o call-site sempre passa assistido_id real).
