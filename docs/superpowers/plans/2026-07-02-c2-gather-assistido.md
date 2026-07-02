# C2.2 — Gather Drive/atendimentos na análise — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A análise da Fase 2c passa a receber um "dossiê do assistido" (resumos de Drive + atendimentos + análises anteriores) injetado no prompt, em vez de analisar os autos sem contexto.

**Architecture:** Tudo no worker `.claude/skills/analise-profunda-demanda/scripts/analise_profunda_autos.py`. Uma função PURA `format_dossie` (linhas do banco → markdown capado), uma camada de I/O `fetch_dossie_data`/`build_dossie_assistido` (GETs PostgREST via `sb._req`, engolida por try/except), e o wire no `build_analise_autos_task` (que ganha um param `dossie: str=""` e continua pura). O daemon já anexa o `prompt` verbatim — zero mudança no daemon/skill.

**Tech Stack:** Python 3.12 (worker browser-lane), PostgREST (Supabase service-role), testes standalone (padrão das suítes do repo).

## Global Constraints

- **Só resumos, capados** — nunca `content_text`/`texto_extraido` inteiro. Constantes: `MAX_DOSSIE_CHARS=18000`, `SECTION_TEXT_CAP=2000`, `ATEND_TEXT_CAP=1500`, `MAX_REGISTROS=40`, `MAX_POR_TIPO=3`, `MAX_SECTIONS=30`, `MAX_KEY_POINTS=5`.
- **`build_analise_autos_task` continua PURA:** ganha `dossie: str=""` (NÃO recebe `sb`). O teste existente `test_analise_profunda_helpers.py:28` chama sem `dossie` e **deve continuar passando**.
- **`instrucao_adicional` INTOCADO:** `json.dumps({"demandaId": demanda_id, "fonte": "fase2c"})` (chaves-máquina; parseadas em outros pontos).
- **Dossiê vai no `prompt`** (markdown legível), não no instrucao_adicional.
- **`build_dossie_assistido` nunca levanta:** try/except → `""` (a Fase 2c nunca quebra por causa do dossiê).
- **Preferência de campo:** Drive seção `resumo` → `texto_extraido[:2000]`; atendimento `dossie_atendimento.resumo` → `transcricao_resumo` → `conteudo[:1500]`.
- **GETs com `select=` explícito** (não puxar colunas pesadas).
- Sem migração; sem mudança no daemon/skill; só uma cópia do worker (sem espelho cowork).
- Worker: `.claude/skills/analise-profunda-demanda/scripts/analise_profunda_autos.py`. `sb._req("GET", "/rest/v1/<tabela>?<query>")` retorna lista de dicts. `build_analise_autos_task` em :35-47; call-site em `main_async` :264-267.
- Spec: `docs/superpowers/specs/2026-07-02-c2-gather-assistido-design.md`.
- Worktree: `/Users/rodrigorochameire/Projetos/Defender-c2b` (branch `feat/c2-gather-assistido`).

---

### Task 1: `format_dossie` (puro) + `build_analise_autos_task` ganha `dossie`

**Files:**
- Modify: `.claude/skills/analise-profunda-demanda/scripts/analise_profunda_autos.py` (add `format_dossie` + constants; add `dossie` param to `build_analise_autos_task`)
- Test: `.claude/skills/analise-profunda-demanda/scripts/test_gather_dossie.py` (novo)

**Interfaces:**
- Produces: `format_dossie(sections: list[dict], registros: list[dict], analises: list[dict]) -> str`; `build_analise_autos_task(row, demanda_id, created_by, dossie: str="") -> dict`.

- [ ] **Step 1: Teste que falha** — `test_gather_dossie.py`:

```python
#!/usr/bin/env python3
"""format_dossie + build_analise_autos_task(dossie). Standalone."""
import sys, json
from pathlib import Path
SCRIPT = Path(__file__).parent / "analise_profunda_autos.py"
src = SCRIPT.read_text()
# carrega só as defs (sem rodar main)
ns = {"__name__": "_t"}
exec(compile(src, str(SCRIPT), "exec"), ns)
format_dossie = ns["format_dossie"]
build_task = ns["build_analise_autos_task"]

def main():
    f = 0
    # 1. vazio → ""
    if format_dossie([], [], []) != "":
        print("FAIL vazio deveria ser ''"); f += 1
    # 2. render das 3 seções
    secs = [{"titulo": "Denúncia", "tipo": "peca", "resumo": "MP imputa furto."}]
    regs = [{"data_registro": "2026-06-01T10:00", "tipo": "atendimento", "subtipo": "SOLAR",
             "dossie_atendimento": {"resumo": ["assistido nega autoria"]},
             "enrichment_data": {"key_points": ["álibi", "sem antecedentes"]}}]
    ans = [{"origem": "processo", "resumo": "Tese: insuficiência probatória."}]
    d = format_dossie(secs, regs, ans)
    for needle in ["Dossiê do assistido", "Denúncia", "MP imputa furto",
                   "assistido nega autoria", "pontos-chave", "álibi",
                   "Análises anteriores", "insuficiência probatória"]:
        if needle not in d:
            print(f"FAIL dossiê sem {needle!r}"); f += 1
    # 3. cap ≤3 por tipo
    many = [{"data_registro": f"2026-06-0{i}", "tipo": "atendimento",
             "conteudo": f"consulta {i}"} for i in range(1, 9)]
    d3 = format_dossie([], many, [])
    if d3.count("consulta ") > 3:
        print(f"FAIL cap por tipo: {d3.count('consulta ')} > 3"); f += 1
    # 4. preferência de campo: resumo (dossie) antes de transcricao_resumo/conteudo
    pref = [{"tipo": "atendimento", "dossie_atendimento": {"resumo": "R-DOSSIE"},
             "transcricao_resumo": "R-TRANSC", "conteudo": "R-CONT"}]
    dp = format_dossie([], pref, [])
    if "R-DOSSIE" not in dp or "R-TRANSC" in dp or "R-CONT" in dp:
        print("FAIL preferência de campo"); f += 1
    # 5. bound total: dossiê gigante truncado
    big = [{"titulo": f"doc{i}", "resumo": "x" * 3000} for i in range(50)]
    db = format_dossie(big, [], [])
    if len(db) > 18000 + 50 or "[…dossiê truncado]" not in db:
        print(f"FAIL bound: len={len(db)}"); f += 1
    # 6. seção sem resumo usa texto_extraido[:2000] truncado
    ts = [{"titulo": "T", "texto_extraido": "y" * 5000}]
    dt = format_dossie(ts, [], [])
    if ("y" * 2000) not in dt or ("y" * 2001) in dt:
        print("FAIL texto_extraido cap 2000"); f += 1
    # 7. build_analise_autos_task: com dossiê no prompt, instrucao_adicional intacto
    t = build_task({"assistido_id": 7, "processo_id": 9}, 5, 13, dossie="## Dossiê\nX")
    if "## Dossiê" not in t["prompt"]:
        print("FAIL dossiê não entrou no prompt"); f += 1
    if json.loads(t["instrucao_adicional"]) != {"demandaId": 5, "fonte": "fase2c"}:
        print("FAIL instrucao_adicional alterado"); f += 1
    # 8. sem dossiê (default) → prompt = título puro (compat com teste existente)
    t0 = build_task({"assistido_id": 7, "processo_id": 9}, 5, 13)
    if "Dossiê" in t0["prompt"] or "demanda 5" not in t0["prompt"]:
        print("FAIL default deveria ser título puro"); f += 1
    print("OK" if not f else f"{f} FALHAS")
    sys.exit(1 if f else 0)

if __name__ == "__main__":
    main()
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `python3 .claude/skills/analise-profunda-demanda/scripts/test_gather_dossie.py`
Expected: FAIL — `KeyError: 'format_dossie'`.

- [ ] **Step 3: Implementar `format_dossie` + constantes** — em `analise_profunda_autos.py`, após os imports/top (antes de `build_analise_autos_task`):

```python
MAX_DOSSIE_CHARS = 18000
SECTION_TEXT_CAP = 2000
ATEND_TEXT_CAP = 1500
MAX_REGISTROS = 40
MAX_POR_TIPO = 3
MAX_SECTIONS = 30
MAX_KEY_POINTS = 5


def _cap(s, n):
    s = (s or "")
    if not isinstance(s, str):
        s = str(s)
    s = s.strip()
    return s[:n] if len(s) > n else s


def format_dossie(sections: list, registros: list, analises: list) -> str:
    """Monta um bloco markdown COMPACTO (só resumos, capados) com o contexto
    do assistido além dos autos. Retorna '' se não houver nada. Função pura."""
    parts = []

    # Drive (resumos de peças)
    drive_lines = []
    for sec in (sections or [])[:MAX_SECTIONS]:
        titulo = sec.get("titulo") or sec.get("tipo") or "documento"
        resumo = _cap(sec.get("resumo"), SECTION_TEXT_CAP)
        if not resumo:
            resumo = _cap(sec.get("texto_extraido"), SECTION_TEXT_CAP)
        if resumo:
            drive_lines.append(f"- **{titulo}**: {resumo}")
    if drive_lines:
        parts.append("### Documentos no Drive (resumos)\n" + "\n".join(drive_lines))

    # Atendimentos (≤MAX_POR_TIPO por tipo, ≤MAX_REGISTROS total)
    atend_lines = []
    per_tipo = {}
    total = 0
    for r in (registros or []):
        if total >= MAX_REGISTROS:
            break
        tipo = r.get("tipo") or "registro"
        if per_tipo.get(tipo, 0) >= MAX_POR_TIPO:
            continue
        dossie_at = r.get("dossie_atendimento") or {}
        resumo = ""
        if isinstance(dossie_at, dict):
            rs = dossie_at.get("resumo")
            if isinstance(rs, list):
                rs = " ".join(str(x) for x in rs)
            resumo = _cap(rs, ATEND_TEXT_CAP)
        if not resumo:
            resumo = _cap(r.get("transcricao_resumo"), ATEND_TEXT_CAP)
        if not resumo:
            resumo = _cap(r.get("conteudo"), ATEND_TEXT_CAP)
        if not resumo:
            continue
        data = _cap(r.get("data_registro"), 10)
        subtipo = r.get("subtipo") or ""
        tag = f"{tipo}/{subtipo}" if subtipo else tipo
        line = f"- {data} [{tag}]: {resumo}"
        enr = r.get("enrichment_data") or {}
        kp = enr.get("key_points") if isinstance(enr, dict) else None
        if isinstance(kp, list) and kp:
            line += "\n  - pontos-chave: " + "; ".join(str(x) for x in kp[:MAX_KEY_POINTS])
        atend_lines.append(line)
        per_tipo[tipo] = per_tipo.get(tipo, 0) + 1
        total += 1
    if atend_lines:
        parts.append("### Atendimentos (o que o assistido relatou)\n" + "\n".join(atend_lines))

    # Análises anteriores (já normalizadas em {origem, resumo})
    an_lines = []
    for a in (analises or []):
        resumo = _cap(a.get("resumo"), SECTION_TEXT_CAP)
        if resumo:
            an_lines.append(f"- ({a.get('origem', 'análise')}) {resumo}")
    if an_lines:
        parts.append("### Análises anteriores\n" + "\n".join(an_lines))

    if not parts:
        return ""
    body = "## Dossiê do assistido (contexto além dos autos)\n\n" + "\n\n".join(parts)
    if len(body) > MAX_DOSSIE_CHARS:
        body = body[:MAX_DOSSIE_CHARS] + "\n\n[…dossiê truncado]"
    return body
```

- [ ] **Step 4: Adicionar `dossie` a `build_analise_autos_task`** — trocar a assinatura e o prompt (linhas 35-47):

```python
def build_analise_autos_task(row: dict, demanda_id: int, created_by: int, dossie: str = "") -> dict:
    """Values da task lane=ai `analise-autos` (mesmo caminho do coworkAnalise),
    com demandaId embutido p/ o fechamento de estado ser derivável na leitura.
    `dossie` (opcional) = contexto do assistido, concatenado ao prompt."""
    prompt = f"Análise profunda dos autos — demanda {demanda_id}"
    if dossie:
        prompt += "\n\n" + dossie
    return {
        "assistido_id": row["assistido_id"],
        "processo_id": row["processo_id"],
        "skill": "analise-autos",
        "lane": "ai",
        "prompt": prompt,
        "instrucao_adicional": json.dumps({"demandaId": demanda_id, "fonte": "fase2c"}),
        "status": "pending",
        "created_by": created_by,
    }
```

- [ ] **Step 5: Rodar o teste novo e ver passar**

Run: `python3 .claude/skills/analise-profunda-demanda/scripts/test_gather_dossie.py`
Expected: PASS — `OK`.

- [ ] **Step 6: Confirmar que o teste existente ainda passa**

Run: `python3 .claude/skills/analise-profunda-demanda/scripts/test_analise_profunda_helpers.py`
Expected: PASS (chama `build_analise_autos_task` sem `dossie`; default `""` mantém o comportamento).

- [ ] **Step 7: Commit**

```bash
git add .claude/skills/analise-profunda-demanda/scripts/analise_profunda_autos.py .claude/skills/analise-profunda-demanda/scripts/test_gather_dossie.py
git commit -m "feat(fase2c): format_dossie (puro, capado) + build_analise_autos_task ganha param dossie"
```

---

### Task 2: `fetch_dossie_data` + `build_dossie_assistido` + wire no call-site

**Files:**
- Modify: `.claude/skills/analise-profunda-demanda/scripts/analise_profunda_autos.py` (add `fetch_dossie_data`, `build_dossie_assistido`; wire no `main_async`)
- Test: `.claude/skills/analise-profunda-demanda/scripts/test_gather_dossie.py` (estender: `build_dossie_assistido` engole erro)

**Interfaces:**
- Consumes: `format_dossie` (Task 1), `sb._req("GET", path)`.
- Produces: `fetch_dossie_data(sb, assistido_id) -> tuple[list, list, list]`; `build_dossie_assistido(sb, assistido_id) -> str`.

- [ ] **Step 1: Teste que falha (estender test_gather_dossie.py)** — adicionar antes do `print("OK"...)`:

```python
    # 9. build_dossie_assistido engole erro → "" (sb que levanta)
    build_dossie = ns["build_dossie_assistido"]
    class BoomSB:
        def _req(self, *a, **k):
            raise RuntimeError("boom")
    if build_dossie(BoomSB(), 7) != "":
        print("FAIL build_dossie_assistido deveria engolir erro e retornar ''"); f += 1
    # 10. build_dossie_assistido monta a partir de um sb fake que devolve dados
    class FakeSB:
        def _req(self, method, path):
            if "drive_document_sections" in path:
                return [{"titulo": "Laudo", "resumo": "sem vestígios"}]
            if "registros" in path and "tipo=eq.analise" in path:
                return [{"enrichment_data": {"resumo": "tese anterior"}, "data_registro": "2026-05-01"}]
            if path.startswith("/rest/v1/registros"):
                return [{"tipo": "atendimento", "conteudo": "relato do assistido"}]
            if "assistidos?" in path:
                return [{"analysis_data": {"resumo": "análise assistido"}}]
            if "processos?" in path:
                return [{"analysis_data": {"resumo": "análise processo"}}]
            return []
    d = build_dossie(FakeSB(), 7)
    for needle in ["Laudo", "sem vestígios", "relato do assistido", "análise"]:
        if needle not in d:
            print(f"FAIL build_dossie sem {needle!r}"); f += 1
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `python3 .claude/skills/analise-profunda-demanda/scripts/test_gather_dossie.py`
Expected: FAIL — `KeyError: 'build_dossie_assistido'`.

- [ ] **Step 3: Implementar `fetch_dossie_data` + `build_dossie_assistido`** — após `format_dossie`:

```python
def _norm_analises(assistido_rows, processo_rows, registro_rows) -> list:
    """Normaliza análises anteriores em [{origem, resumo}]."""
    out = []
    for r in (assistido_rows or []):
        ad = r.get("analysis_data") or {}
        if isinstance(ad, dict) and ad.get("resumo"):
            out.append({"origem": "assistido", "resumo": ad["resumo"]})
    for r in (processo_rows or []):
        ad = r.get("analysis_data") or {}
        if isinstance(ad, dict) and ad.get("resumo"):
            out.append({"origem": "processo", "resumo": ad["resumo"]})
    for r in (registro_rows or []):
        en = r.get("enrichment_data") or {}
        if isinstance(en, dict):
            res = en.get("resumo") or en.get("objeto")
            if res:
                out.append({"origem": "análise anterior", "resumo": res})
    return out


def fetch_dossie_data(sb, assistido_id: int):
    """GETs PostgREST (select= explícito). Retorna (sections, registros, analises)."""
    aid = int(assistido_id)
    sections = sb._req(
        "GET",
        f"/rest/v1/drive_document_sections?select=tipo,titulo,resumo,texto_extraido,review_status,drive_files!inner(assistido_id)"
        f"&drive_files.assistido_id=eq.{aid}&review_status=neq.rejected&order=updated_at.desc&limit=30",
    ) or []
    registros = sb._req(
        "GET",
        f"/rest/v1/registros?select=data_registro,tipo,subtipo,conteudo,dossie_atendimento,transcricao_resumo,enrichment_data"
        f"&assistido_id=eq.{aid}&order=data_registro.desc&limit=60",
    ) or []
    a_rows = sb._req("GET", f"/rest/v1/assistidos?select=analysis_data&id=eq.{aid}") or []
    p_rows = sb._req("GET", f"/rest/v1/processos?select=analysis_data&assistido_id=eq.{aid}") or []
    an_rows = sb._req(
        "GET",
        f"/rest/v1/registros?select=enrichment_data,data_registro&assistido_id=eq.{aid}&tipo=eq.analise&order=data_registro.desc&limit=10",
    ) or []
    analises = _norm_analises(a_rows, p_rows, an_rows)
    return sections, registros, analises


def build_dossie_assistido(sb, assistido_id) -> str:
    """fetch + format. NUNCA levanta — retorna '' em qualquer erro (a Fase 2c
    nunca quebra por causa do dossiê)."""
    try:
        if not assistido_id:
            return ""
        sections, registros, analises = fetch_dossie_data(sb, assistido_id)
        return format_dossie(sections, registros, analises)
    except Exception as e:
        try:
            log(f"  ⚠ dossiê do assistido falhou (assistido={assistido_id}): {e}")
        except Exception:
            pass
        return ""
```
(Se `log` não existir no escopo, remover o bloco de log — o try/except externo já garante o `""`.)

- [ ] **Step 4: Wire no call-site** — em `main_async` (linhas ~264-267), montar o dossiê e passar:

```python
        dossie = build_dossie_assistido(sb, row["assistido_id"])
        task = build_analise_autos_task(
            {"assistido_id": row["assistido_id"], "processo_id": row["processo_id"]},
            demanda_id, created_by, dossie=dossie,
        )
```
(Manter os demais args exatamente como estavam; só adicionar `dossie=dossie` e a linha do `build_dossie_assistido` imediatamente antes.)

- [ ] **Step 5: Rodar o teste e ver passar**

Run: `python3 .claude/skills/analise-profunda-demanda/scripts/test_gather_dossie.py`
Expected: PASS — `OK`.

- [ ] **Step 6: Sintaxe do worker (ast) + teste existente**

Run: `python3 -c "import ast; ast.parse(open('.claude/skills/analise-profunda-demanda/scripts/analise_profunda_autos.py').read()); print('ast ok')" && python3 .claude/skills/analise-profunda-demanda/scripts/test_analise_profunda_helpers.py`
Expected: `ast ok` + o teste existente PASS.

- [ ] **Step 7: Commit**

```bash
git add .claude/skills/analise-profunda-demanda/scripts/
git commit -m "feat(fase2c): fetch_dossie_data + build_dossie_assistido (I/O engolido) + wire no worker"
```

---

### Task 3: Memória + verificação final

**Files:** verify only + memória.

- [ ] **Step 1: Ambos os testes verdes + ast**

Run: `for t in test_gather_dossie test_analise_profunda_helpers; do python3 .claude/skills/analise-profunda-demanda/scripts/$t.py >/dev/null 2>&1 && echo "ok $t" || echo "FAIL $t"; done; python3 -c "import ast; ast.parse(open('.claude/skills/analise-profunda-demanda/scripts/analise_profunda_autos.py').read()); print('ast ok')"`
Expected: ok em ambos + ast ok.

- [ ] **Step 2: Atualizar memória** — estender `project_c2_produzir_peca.md`: C2.2 (gather) — worker monta dossiê do assistido (Drive sections + registros + análises anteriores, só resumos capados via format_dossie puro) e injeta no `prompt` da task analise-autos; build_analise_autos_task ganha param `dossie` (pura); build_dossie_assistido engole erro. Sem migração/daemon/skill. Branch `feat/c2-gather-assistido`. DEFERIDO: embeddings rank-select, enriquecer coworkAnalise, verificação viva. Atualizar `MEMORY.md`.

- [ ] **Step 3: Registrar no ledger SDD** que C2.2 está pronto.

---

## Self-Review

**Spec coverage:** §4.1 format_dossie → Task 1 (Step 3 + testes Step 1); §4.4 build_analise_autos_task pura c/ dossie → Task 1 Step 4 + testes 7/8; §4.2 fetch_dossie_data (select= explícito) → Task 2 Step 3; §4.3 build_dossie_assistido try/except → Task 2 Step 3 + teste 9; wire call-site → Task 2 Step 4; §7 testes (vazio/render/caps/bound/preferência/erro) → Task 1+2 testes; §8 critérios: #1 Task1, #2 Task1 testes 7/8, #3 Task2 teste 9, #4 caps nas constantes+testes 3/5/6, #5 ast + sem migração/daemon (nada disso é tocado).

**Placeholder scan:** sem TODOs; o único condicional (remover bloco `log` se não existir) tem instrução explícita.

**Type/nome consistency:** `format_dossie(sections, registros, analises)` e `build_analise_autos_task(row, demanda_id, created_by, dossie="")` idênticos entre Task 1 (def), testes e Task 2 (uso). `build_dossie_assistido(sb, assistido_id)`/`fetch_dossie_data(sb, assistido_id)` consistentes Task 2 ↔ call-site. Constantes nomeadas conforme Global Constraints.

**Nota:** sem migração, sem daemon/skill, sem espelho cowork. O risco real é o formato dos GETs PostgREST (join-embed `drive_files!inner`) — o teste usa `FakeSB`, então a validação VIVA do fetch fica deferida (precisa de um assistido real com dados); os caps/format/erro-swallowing são cobertos por teste.
