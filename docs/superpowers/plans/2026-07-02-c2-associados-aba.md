# C2.2a-v2 — Descoberta robusta de processos relacionados (aba + texto) — Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`).

**Goal:** A Fase 2c passa a descobrir processos relacionados pela ABA "Associados" do PJe (fonte formal, classificada por tipo) + o texto dos autos (suplemento), unidos e classificados no dossiê.

**Architecture:** Tudo em `.claude/skills/analise-profunda-demanda/scripts/analise_profunda_autos.py`. Núcleo PURO (parser do painel, DV, classificação, merge, seção do dossiê) testado com **fixtures reais capturados ao vivo**. Leitor da aba SÍNCRONO (reusa a lógica validada do `diag_associados2.py`), chamado do worker async via `asyncio.to_thread`. Guardado, sem migração/daemon.

**Tech Stack:** Python 3.12, patchright (sync p/ o leitor), pdftotext (2a já usa), testes standalone.

## Global Constraints

- **Núcleo puro** (`parse_associados_panel`, `cnj_dv_ok`, `classificar_relacionado`, `merge_relacionados`, seção `relacionados` do `format_dossie`) — sem I/O, testado com os fixtures `.claude/skills/analise-profunda-demanda/scripts/fixtures/painel_{francisco,edimilson}.txt`.
- **Parser por BLOCOS** (não char-lookback): `classe` = palavra antes do CNJ na MESMA linha (`""` se o CNJ inicia a linha → sigiloso); dedup por dígitos por seção; `tipo` = accordion.
- **`read_associados_aba(cnj)` SÍNCRONO** (própria conexão CDP; reusa `pd.get_ca` + a lógica de `diag_associados2.py`); nunca lança → `[]`. Chamado via `await asyncio.to_thread(read_associados_aba, cnj)`.
- **`associados` (2a) INTOCADO** (param + 5 testes verdes); adiciona `relacionados` param; worker passa `relacionados` (não `associados`).
- **Wire** dentro do ramo PJe (`else`), reusa `associados = extrair_associados_autos(...)`; `relacionados = []` inicializado cedo (cobre SEEU); nunca quebra a Fase 2c.
- Sem migração/daemon/skill. Só uma cópia do worker.
- Spec: `docs/superpowers/specs/2026-07-02-c2-associados-aba-design.md`. Worktree: `/Users/rodrigorochameire/Projetos/Defender-ab` (branch `feat/c2-associados-aba`).

---

### Task 1: Núcleo puro (parser + DV + classificação + merge + seção do dossiê) — TDD com fixtures reais

**Files:**
- Modify: `.claude/skills/analise-profunda-demanda/scripts/analise_profunda_autos.py`
- Test: `.claude/skills/analise-profunda-demanda/scripts/test_associados_aba.py` (novo)

**Interfaces:**
- Produces: `parse_associados_panel(panel_text, cnj_principal="") -> list[dict]`; `cnj_dv_ok(cnj) -> bool`; `classificar_relacionado(item) -> dict`; `merge_relacionados(aba, texto_cnjs, cnj_principal="") -> list[dict]`; `format_dossie(..., relacionados=None)`.

- [ ] **Step 1: Teste que falha** — `test_associados_aba.py` (carrega o worker via exec, usa os fixtures):

```python
#!/usr/bin/env python3
import sys, json
from pathlib import Path
D = Path(__file__).parent
SCRIPT = D / "analise_profunda_autos.py"
ns = {"__file__": str(SCRIPT), "__name__": "_t"}
exec(compile(SCRIPT.read_text(), str(SCRIPT), "exec"), ns)
parse = ns["parse_associados_panel"]; dv = ns["cnj_dv_ok"]
classif = ns["classificar_relacionado"]; merge = ns["merge_relacionados"]
format_dossie = ns["format_dossie"]
FRANCISCO = (D / "fixtures" / "painel_francisco.txt").read_text()
EDIMILSON = (D / "fixtures" / "painel_edimilson.txt").read_text()

def main():
    f = 0
    # 1. Francisco: 3 relacionados, todos Dependência
    fr = parse(FRANCISCO, "8004897-26.2025.8.05.0039")
    if len(fr) != 3: print(f"FAIL francisco n={len(fr)}"); f += 1
    by = {x["cnj"]: x for x in fr}
    a = by.get("8003770-53.2025.8.05.0039")
    if not a or a["classe"] != "AuPrFl" or a["tipo"] != "Dependência" or a["assunto"] != "Feminicídio":
        print(f"FAIL AuPrFl: {a}"); f += 1
    sig = by.get("8004193-13.2025.8.05.0039")
    if not sig or sig["classe"] != "" or not sig["sigilo"]:
        print(f"FAIL sigiloso (classe deve ser '' e sigilo True): {sig}"); f += 1
    rel = by.get("8004943-15.2025.8.05.0039")
    if not rel or rel["classe"] != "RelPri":
        print(f"FAIL RelPri: {rel}"); f += 1
    # 2. Edimilson: dedup Dependência (IP 1×), Prevenção APri comarca 0001, Desmembramento Juri
    ed = parse(EDIMILSON, "8017921-24.2025.8.05.0039")
    edby = {x["cnj"]: x for x in ed}
    dep = [x for x in ed if x["cnj"] == "0500594-24.2020.8.05.0039"]
    if len(dep) != 1 or dep[0]["classe"] != "IP":
        print(f"FAIL dedup/IP: {dep}"); f += 1
    prev = edby.get("8116550-16.2026.8.05.0001")
    if not prev or prev["tipo"] != "Prevenção" or prev["classe"] != "APri" or prev["comarca"] != "0001":
        print(f"FAIL Prevenção APri 0001: {prev}"); f += 1
    des = edby.get("8013686-77.2026.8.05.0039")
    if not des or des["tipo"] != "Desmembramento" or des["classe"] != "Juri":
        print(f"FAIL Desmembramento Juri: {des}"); f += 1
    # 3. painel vazio → []
    if parse("Vinculação Direta\nProcessos\nAssociação\n0 resultados encontrados", "") != []:
        print("FAIL vazio → []"); f += 1
    # 4. DV
    if not dv("8004943-15.2025.8.05.0039"): print("FAIL dv válido"); f += 1
    if dv("8004943-16.2025.8.05.0039"): print("FAIL dv inválido deveria ser False"); f += 1
    # 5. classificar: 1º grau não-sigiloso DV-ok → baixavel; sigiloso → não; .2.00. → outra corte
    c1 = classif({"cnj": "8004943-15.2025.8.05.0039", "sigilo": False})
    if c1["grau"] != "1º grau" or not c1["baixavel"]: print(f"FAIL classif 1grau: {c1}"); f += 1
    c2 = classif({"cnj": "8004193-13.2025.8.05.0039", "sigilo": True})
    if c2["baixavel"]: print(f"FAIL sigiloso não baixavel: {c2}"); f += 1
    c3 = classif({"cnj": "0000811-91.2023.2.00.0805", "sigilo": False})
    if c3["grau"] != "outra corte": print(f"FAIL grau outra corte: {c3}"); f += 1
    # 6. merge: aba + texto com overlap dedup; item só-texto vira fonte 'texto'/'citado'
    m = merge(fr, ["8004943-15.2025.8.05.0039", "0000811-91.2023.2.00.0805"], "8004897-26.2025.8.05.0039")
    digs = [x["cnj"] for x in m]
    if digs.count("8004943-15.2025.8.05.0039") != 1: print("FAIL merge dedup"); f += 1
    cit = [x for x in m if x["cnj"] == "0000811-91.2023.2.00.0805"]
    if not cit or cit[0]["fonte"] != "texto" or cit[0]["tipo"] != "citado":
        print(f"FAIL merge citado: {cit}"); f += 1
    # 7. format_dossie relacionados
    d = format_dossie([], [], [], relacionados=merge(fr, [], "8004897-26.2025.8.05.0039"))
    if "Processos relacionados" not in d or "8003770-53.2025.8.05.0039" not in d or "🔒" not in d:
        print("FAIL format relacionados"); f += 1
    if "Processos relacionados" in format_dossie([], [], [], relacionados=None):
        print("FAIL relacionados None → sem seção"); f += 1
    print("OK" if not f else f"{f} FALHAS")
    sys.exit(1 if f else 0)

if __name__ == "__main__":
    main()
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `python3 .claude/skills/analise-profunda-demanda/scripts/test_associados_aba.py`
Expected: FAIL — `KeyError: 'parse_associados_panel'`.

- [ ] **Step 3: Implementar o núcleo puro** — em `analise_profunda_autos.py`, junto das constantes/funções de associados (perto de `extract_cnjs`):

```python
_SECOES_ASSOC = ["Dependência", "Prevenção", "Desmembramento", "Vinculação Direta"]


def cnj_dv_ok(cnj) -> bool:
    d = re.sub(r"\D", "", cnj or "")
    if len(d) != 20:
        return False
    return f"{98 - ((int(d[:7] + d[9:])) * 100 % 97):02d}" == d[7:9]


def parse_associados_panel(panel_text: str, cnj_principal: str = "") -> list:
    """Painel 'Associados' (4 accordions) → [{cnj,tipo,classe,assunto,sigilo,comarca}]. Puro."""
    principal = re.sub(r"\D", "", cnj_principal or "")
    txt = panel_text or ""
    out = []
    for i, sec in enumerate(_SECOES_ASSOC):
        a = txt.find(sec)
        if a < 0:
            continue
        b = len(txt)
        for other in _SECOES_ASSOC[i + 1:]:
            j = txt.find(other, a + len(sec))
            if j >= 0:
                b = min(b, j)
        seg = txt[a:b]
        seen = set()
        for m in CNJ_RE.finditer(seg):
            cnj = m.group(0)
            dig = re.sub(r"\D", "", cnj)
            if dig == principal or dig in seen:
                continue
            seen.add(dig)
            ls = seg.rfind("\n", 0, m.start()) + 1
            le = seg.find("\n", m.end())
            le = le if le >= 0 else len(seg)
            linha = seg[ls:le]
            before = linha[:m.start() - ls].strip()
            classe = before.split()[-1] if before else ""
            after = linha[m.end() - ls:]
            am = re.search(r"-\s*(.+)", after)
            assunto = am.group(1).strip() if am else ""
            bloco = seg[m.start():m.start() + 250]
            out.append({
                "cnj": cnj, "tipo": sec, "classe": classe, "assunto": assunto,
                "sigilo": "sigilos" in bloco.lower(), "comarca": dig[16:20],
            })
    return out


def classificar_relacionado(item: dict) -> dict:
    it = dict(item)
    d = re.sub(r"\D", "", it.get("cnj", ""))
    it["dv_ok"] = cnj_dv_ok(it.get("cnj", ""))
    if len(d) == 20 and d[16:20] == "0000":
        grau = "2ª inst"
    elif len(d) == 20 and d[13:16] == "805":
        grau = "1º grau"
    else:
        grau = "outra corte"
    it["grau"] = grau
    it["baixavel"] = bool(it["dv_ok"] and not it.get("sigilo") and grau == "1º grau")
    return it


def merge_relacionados(aba: list, texto_cnjs: list, cnj_principal: str = "") -> list:
    """União classificada: aba (primário) + CNJs do texto que faltam (fonte 'texto'/'citado')."""
    principal = re.sub(r"\D", "", cnj_principal or "")
    by = {}
    for it in (aba or []):
        d = re.sub(r"\D", "", it.get("cnj", ""))
        if d and d != principal and d not in by:
            x = dict(it); x["fonte"] = "aba"
            by[d] = classificar_relacionado(x)
    for c in (texto_cnjs or []):
        d = re.sub(r"\D", "", c)
        if d and d != principal and d not in by:
            x = {"cnj": c, "tipo": "citado", "classe": "", "assunto": "",
                 "sigilo": False, "comarca": d[16:20], "fonte": "texto"}
            by[d] = classificar_relacionado(x)
    return sorted(by.values(), key=lambda x: (x["fonte"] != "aba", not x.get("baixavel"), x["cnj"]))
```

- [ ] **Step 4: Adicionar a seção `relacionados` ao `format_dossie`** — assinatura ganha `relacionados: list = None`; renderiza (após a seção de `associados`, antes do bound):

```python
    if relacionados:
        rl = []
        for r in relacionados[:MAX_ASSOCIADOS]:
            cl = r.get("classe") or ""
            label = f"{r.get('tipo','')}/{cl}" if cl else r.get("tipo", "")
            ass = f" — {r['assunto']}" if r.get("assunto") else ""
            extra = " 🔒 sigiloso" if r.get("sigilo") else ""
            rl.append(f"- [{label}] {r['cnj']}{ass} ({r.get('grau','')}){extra}")
        parts.append("### Processos relacionados (associados na aba + citados nos autos)\n" + "\n".join(rl))
```
(Manter `associados` param/seção do 2a como está.)

- [ ] **Step 5: `build_dossie_assistido` ganha `relacionados`** — assinatura + repasse:

```python
def build_dossie_assistido(sb, assistido_id, associados: list = None, relacionados: list = None) -> str:
    try:
        if not assistido_id and not associados and not relacionados:
            return ""
        sections, registros, analises = ([], [], [])
        if assistido_id:
            sections, registros, analises = fetch_dossie_data(sb, assistido_id)
        return format_dossie(sections, registros, analises, associados=associados, relacionados=relacionados)
    except Exception:
        return ""
```

- [ ] **Step 6: Rodar o teste novo + o existente**

Run: `python3 .claude/skills/analise-profunda-demanda/scripts/test_associados_aba.py && python3 .claude/skills/analise-profunda-demanda/scripts/test_gather_dossie.py`
Expected: ambos `OK` (o `test_gather_dossie` com `associados=` segue verde).

- [ ] **Step 7: Commit**

```bash
git add .claude/skills/analise-profunda-demanda/scripts/analise_profunda_autos.py .claude/skills/analise-profunda-demanda/scripts/test_associados_aba.py
git commit -m "feat(fase2c): núcleo puro de associados-aba (parse painel + DV + classificação + merge + seção relacionados)"
```

---

### Task 2: Leitor da aba (sync) + wire no worker

**Files:**
- Modify: `.claude/skills/analise-profunda-demanda/scripts/analise_profunda_autos.py`

**Interfaces:**
- Consumes: `parse_associados_panel`, `merge_relacionados` (Task 1), `pd.get_ca` (`scripts/pje-cdp/preparar_download.py`).
- Produces: `read_associados_aba(cnj) -> list[dict]`.

- [ ] **Step 1: Implementar `read_associados_aba` (sync — porta validada do `diag_associados2.py`)** — no topo do worker (imports): garantir `import asyncio` (já existe, L16); adicionar próximo às funções de associados:

```python
_DETALHE = "https://pje.tjba.jus.br/pje/Processo/ConsultaProcesso/Detalhe/listProcessoCompleto.seam"
_ACCORDIONS = ["Dependência", "Prevenção", "Desmembramento", "Vinculação"]


def read_associados_aba(cnj: str) -> list:
    """Lê a aba 'Associados' (4 accordions) do PJe. SÍNCRONO (própria conexão CDP).
    Nunca lança → []. Chamar do worker async via asyncio.to_thread."""
    try:
        import sys as _sys
        from pathlib import Path as _P
        _sys.path.insert(0, str(_P(__file__).resolve().parents[3] / "scripts" / "pje-cdp"))
        from patchright.sync_api import sync_playwright
        import preparar_download as _pd
        import time as _t
        with sync_playwright() as pw:
            browser = pw.chromium.connect_over_cdp("http://127.0.0.1:9222")
            ctx = browser.contexts[0]
            page = next((p for p in ctx.pages if "pje.tjba.jus.br" in (p.url or "")), None)
            if page is None:
                return []
            page.on("dialog", lambda d: d.accept())
            idp, ca = _pd.get_ca(ctx, page, cnj)
            if not idp:
                return []
            pg = ctx.new_page()
            pg.on("dialog", lambda d: d.accept())
            try:
                pg.goto(f"{_DETALHE}?id={idp}&ca={ca}", wait_until="domcontentloaded", timeout=60000)
                _t.sleep(6)
                pg.evaluate(
                    """() => { const a=[...document.querySelectorAll('a')]
                        .find(e=>/Associados\\s*\\(\\d+\\)/.test((e.innerText||'').replace(/\\s+/g,' ')));
                        if(a) a.click(); }""")
                _t.sleep(4)
                for lab in _ACCORDIONS:
                    pg.evaluate(
                        """(lab)=>{const h=[...document.querySelectorAll('.rich-stglpanel-header,[id*="toggleProcessosAssociados"][id$="_header"]')]
                            .find(e=>(e.textContent||'').includes(lab)); if(h) h.click();}""", lab)
                    _t.sleep(1.6)
                _t.sleep(2)
                full = pg.evaluate("() => document.body.innerText")
            finally:
                pg.close()
        i0 = full.find("Número do processo")
        trecho = full[i0:i0 + 5000] if i0 >= 0 else full[:5000]
        return parse_associados_panel(trecho, cnj)
    except Exception:
        return []
```
(Ajustar o `parents[3]` se o caminho até `scripts/pje-cdp/` diferir — o worker está em `.claude/skills/analise-profunda-demanda/scripts/`, então a raiz do repo é `parents[3]`; conferir com um print no impl se preciso.)

- [ ] **Step 2: Wire no `main_async`** — 3 edições:

**(a)** perto de `fonte = sa.escolhe_fonte_autos(atribuicao)` (junto do `associados = []` do 2a), adicionar o default:
```python
        relacionados = []
```
**(b)** no ramo PJe (`else`), logo após `associados = extrair_associados_autos(pdf_path, cnj)`:
```python
                try:
                    aba = await asyncio.to_thread(read_associados_aba, cnj)
                except Exception:
                    aba = []
                relacionados = merge_relacionados(aba, associados, cnj)
```
**(c)** na chamada `dossie = build_dossie_assistido(sb, row["assistido_id"], associados=associados)`, trocar por:
```python
        dossie = build_dossie_assistido(sb, row["assistido_id"], relacionados=relacionados)
```
(Deixa de passar `associados`; passa `relacionados`.)

- [ ] **Step 3: ast + testes**

Run: `python3 -c "import ast; ast.parse(open('.claude/skills/analise-profunda-demanda/scripts/analise_profunda_autos.py').read()); print('ast ok')" && python3 .claude/skills/analise-profunda-demanda/scripts/test_associados_aba.py && python3 .claude/skills/analise-profunda-demanda/scripts/test_gather_dossie.py && python3 .claude/skills/analise-profunda-demanda/scripts/test_analise_profunda_helpers.py && python3 .claude/skills/analise-profunda-demanda/scripts/test_worker_structure.py`
Expected: `ast ok` + todos os testes `OK`.

- [ ] **Step 4: Commit**

```bash
git add .claude/skills/analise-profunda-demanda/scripts/
git commit -m "feat(fase2c): read_associados_aba (sync, aba PJe 4 accordions) + wire via asyncio.to_thread (relacionados no dossiê)"
```

---

### Task 3: Verificação final + memória

- [ ] **Step 1: Todos os testes + ast**

Run: `for t in test_associados_aba test_gather_dossie test_analise_profunda_helpers test_worker_structure; do python3 .claude/skills/analise-profunda-demanda/scripts/$t.py >/dev/null 2>&1 && echo "ok $t" || echo "FAIL $t"; done; python3 -c "import ast; ast.parse(open('.claude/skills/analise-profunda-demanda/scripts/analise_profunda_autos.py').read()); print('ast ok')"`
Expected: ok em todos + ast ok.

- [ ] **Step 2: Confirmar só Python** — `git diff --name-only $(git merge-base origin/main HEAD) HEAD | grep -vE "docs/superpowers|\.superpowers"` → só arquivos `.claude/skills/analise-profunda-demanda/scripts/` (worker + testes + fixtures + diag). Sem TS → sem build Vercel.

- [ ] **Step 3: Atualizar memória** — estender `project_c2_produzir_peca.md`: C2.2a-v2 — leitura da ABA "Associados" do PJe (4 accordions Dependência/Prevenção/Desmembramento/Vinculação via RichFaces navbar:linkAbaAssociados + rich-stglpanel-header) como fonte PRIMÁRIA formal (classe/assunto/tipo/sigilo/comarca), unida ao texto (2a) e classificada (DV + grau + baixavel) no dossiê; leitor sync via asyncio.to_thread; validado ao vivo (aba populada em ações penais recentes; meu "13/13=0" anterior era bug do scraper). DEFERIDO: 2b download; verificação viva da integração no worker. Atualizar `MEMORY.md`.

- [ ] **Step 4: Ledger SDD.**

---

## Self-Review

**Spec coverage:** §4.1 parse → Task 1 Step 3 + testes 1-3; §4.2 DV → Step 3 + teste 4; §4.3 classificar → Step 3 + teste 5; §4.4 merge → Step 3 + teste 6; §4.6 format relacionados → Step 4 + teste 7; §4.5 read_associados_aba (sync) → Task 2 Step 1; §4.7 wire (to_thread, reusa texto, guarda SEEU) → Task 2 Step 2; §7 critérios: #1-4 Task1 testes, #3 Task2 Step1, #5 Task2 Step2, #6 Task2 Step3 (associados 2a verde).

**Placeholder scan:** sem TODOs; o único "ajustar se preciso" (parents[3] do path) tem instrução de conferência.

**Type/nome consistency:** `parse_associados_panel`/`cnj_dv_ok`/`classificar_relacionado`/`merge_relacionados`/`read_associados_aba` idênticos entre def, testes e wire. `format_dossie(...,associados,relacionados)` e `build_dossie_assistido(...,associados,relacionados)` consistentes. Fixtures no path referenciado.

**Nota:** núcleo puro 100% testado com dados reais; o leitor da aba é browser (lógica live-validated isolada; integração no worker = verificação viva deferida). Só Python → sem build/deploy.
