# Fase 2a — Inteligência da Triagem Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fazer a triagem de Execução Penal (SEEU) ganhar o mesmo resumo "contexto + o que fazer" que Júri/VVD (PJe) já têm, e emitir um sinal (`peca_sugerida` / `requer_analise_profunda`) para o pipeline profundo (2c).

**Architecture:** Um módulo leitor SEEU novo (`seeu_expediente.py`) é chamado por dentro do worker `varredura_triagem.py` quando a demanda é `EXECUCAO_PENAL` — abre `visualizacaoProcesso` no SEEU (CDP), lê o teor do documento-alvo + o painel de pena, e converge para o mesmo `classify → registros → enqueue analise-intimacao` que o caminho PJe usa. O `analise-intimacao` (lane=ai) é estendido para produzir o sinal do 2c e um resumo EP-aware.

**Tech Stack:** Python 3.12 + Patchright/Playwright (CDP), pytest; Supabase REST (via a classe `Supabase` do worker); a skill AI `analise-intimacao` (markdown-driven, daemon Max).

## Global Constraints

- **Read-only sobre o SEEU:** o leitor só navega + lê DOM. NUNCA "Juntar", assinar, peticionar.
- **Sem colunas novas no banco:** resumo em `registros.conteudo`; sinal em `registros.enrichment_data` (`peca_sugerida`, `requer_analise_profunda`).
- **Regra determinística do sinal:** `requer_analise_profunda == (peca_sugerida is not None)`. Mera ciência ⇒ `peca_sugerida=null`, `requer_analise_profunda=false`.
- **Disparo do 2c é MANUAL** — o 2a só grava o sinal; nada dispara automaticamente.
- **Não alterar o caminho PJe** (Júri/VVD) além de rotear por atribuição.
- **`peca_sugerida` é um enum fechado:** `memoriais | resposta_acusacao | apelacao | rese | manifestacao_ep | contrarrazoes | null`.
- **Idempotência:** re-rodar não duplica registros (`registro_exists` por título já existe).
- **CDP:** o browser tem PJe (`:9222`) e SEEU logados; o leitor SEEU acha a aba `"seeu" in url`. Login manual (Keycloak) — nunca automatizado.
- Rodar `pytest` verde antes de cada commit; para os passos que tocam a skill AI, validar o JSON schema à mão (a skill é markdown, não tem teste unitário).

---

### Task 1: Estender `analise-intimacao` — sinal do 2c + EP-aware

**Files:**
- Modify: `.claude/skills-cowork/analise-intimacao/scripts/write_analise.py` (bloco `corpo`/`insert_registro`, ~linhas 175–198)
- Modify: `.claude/skills-cowork/analise-intimacao/SKILL.md` (schema do resultado + instruções EP)
- Create: `.claude/skills-cowork/analise-intimacao/scripts/test_write_analise.py`

**Interfaces:**
- Consumes: o JSON array de resultados que a skill AI passa por stdin (já existente).
- Produces: registros `tipo="analise"` que agora carregam `enrichment_data.peca_sugerida` e `enrichment_data.requer_analise_profunda`; e uma linha "Cabe peça: {peca}" no `conteudo` quando houver. Consumido pela UI (card de análise) e pelo 2c.

- [ ] **Step 1: Escrever o teste que falha**

Criar `.claude/skills-cowork/analise-intimacao/scripts/test_write_analise.py`:

```python
import importlib.util, os
spec = importlib.util.spec_from_file_location(
    "write_analise",
    os.path.join(os.path.dirname(__file__), "write_analise.py"),
)
wa = importlib.util.module_from_spec(spec)
spec.loader.exec_module(wa)


def test_build_corpo_inclui_peca_quando_sugerida():
    r = {"resumo_objeto": "Despacho determina manifestação sobre cálculo",
         "o_que_fazer": "Manifestar sobre o cálculo em 5 dias",
         "peca_sugerida": "manifestacao_ep"}
    corpo = wa.build_corpo(r)
    assert any(l.startswith("Objeto:") for l in corpo)
    assert any(l.startswith("Cabe peça: manifestacao_ep") for l in corpo)


def test_build_corpo_sem_peca_quando_ciencia():
    r = {"resumo_objeto": "Ciência de juntada", "peca_sugerida": None}
    corpo = wa.build_corpo(r)
    assert not any(l.startswith("Cabe peça") for l in corpo)


def test_enrichment_sinal_deriva_de_peca():
    assert wa.sinal_2c({"peca_sugerida": "apelacao"}) == {
        "peca_sugerida": "apelacao", "requer_analise_profunda": True}
    assert wa.sinal_2c({"peca_sugerida": None}) == {
        "peca_sugerida": None, "requer_analise_profunda": False}
    assert wa.sinal_2c({}) == {"peca_sugerida": None, "requer_analise_profunda": False}
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `cd .claude/skills-cowork/analise-intimacao/scripts && python3 -m pytest test_write_analise.py -v`
Expected: FAIL — `build_corpo` / `sinal_2c` não existem.

- [ ] **Step 3: Refatorar `write_analise.py` extraindo `build_corpo` + `sinal_2c` e persistindo o sinal**

Extrair a construção do corpo (hoje inline em ~179–193) para uma função pura `build_corpo(r)` e adicionar a linha "Cabe peça"; adicionar `sinal_2c(r)`; passar `enrichment_data` no insert. Substituir o bloco inline por:

```python
def sinal_2c(r: dict) -> dict:
    """Sinal determinístico p/ o pipeline profundo (2c). requer_analise_profunda
    é verdadeiro sse, e só se, houver peça sugerida."""
    peca = r.get("peca_sugerida") or None
    return {"peca_sugerida": peca, "requer_analise_profunda": peca is not None}


def build_corpo(r: dict) -> list[str]:
    """Monta as linhas 'Label: valor' da anotação de resumo (texto puro)."""
    corpo = []
    if r.get("resumo_objeto"):
        corpo.append(f"Objeto: {_strip_label(r['resumo_objeto'], 'objeto')}")
    if r.get("o_que_decidido"):
        corpo.append(f"O que foi decidido: {_strip_label(r['o_que_decidido'], 'o que foi decidido')}")
    if r.get("o_que_fazer"):
        corpo.append(f"Providência/Prazo: {_strip_label(r['o_que_fazer'], 'providência/prazo', 'providencia/prazo', 'providência', 'providencia')}")
    cr = (r.get("cabe_recurso") or "").lower()
    if cr in ("sim", "talvez"):
        rec = r.get("recurso_cabivel") or "recurso"
        fund = f" — {r['fundamento_recurso'].strip()}" if r.get("fundamento_recurso") else ""
        corpo.append(f"Cabe recurso? (análise preliminar — revisar): {cr} · {rec}{fund}")
    elif cr == "nao":
        corpo.append("Cabe recurso? (análise preliminar — revisar): não")
    peca = r.get("peca_sugerida") or None
    if peca:
        corpo.append(f"Cabe peça: {peca} (revisar — aciona análise profunda)")
    return corpo
```

Depois, no `main()`, trocar o bloco inline por:

```python
        corpo = build_corpo(r)
        if r.get("ato_ajuste_label"):  # (mantém o comportamento atual do ato_ajuste)
            pass
        if ato_ajuste:
            corpo.append(f"Ato ajustado: {ato_ajuste[0]} → {ato_ajuste[1]}")
        titulo = "Resumo e providências"
        if corpo and not registro_exists(demanda_id, titulo):
            insert_registro({**base, "tipo": "analise", "titulo": titulo,
                             "conteudo": "\n".join(corpo),
                             "enrichment_data": sinal_2c(r)})
            n_anota += 1
            if ato_ajuste:
                try:
                    update_demanda_ato(demanda_id, ato_ajuste[1])
                    n_ato += 1
                except Exception as e:
                    print(f"  ⚠ falha ao ajustar ato demanda {demanda_id}: {e}", file=sys.stderr)
```

> Preserve o resto do `main()` (MPU relato, pronúncia, marca `enrichment_status=done`) intacto. `ato_ajuste` continua vindo da lógica existente acima do bloco.

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `cd .claude/skills-cowork/analise-intimacao/scripts && python3 -m pytest test_write_analise.py -v`
Expected: PASS (3 testes).

- [ ] **Step 5: Atualizar o SKILL.md (schema + EP-aware)**

Em `.claude/skills-cowork/analise-intimacao/SKILL.md`, adicionar ao "Schema do resultado (por item)" os dois campos:

```json
  "peca_sugerida": "memoriais|resposta_acusacao|apelacao|rese|manifestacao_ep|contrarrazoes|null",
  "requer_analise_profunda": "IGNORE — derivado pelo write (peca_sugerida != null)"
```

E acrescentar uma seção de instrução: para EP (`atribuicao_label` de Execução Penal), o `resumo_objeto`/`o_que_fazer` devem falar a língua da execução (progressão de regime, livramento condicional, remição, indulto/comutação, falta grave — Súmulas 534/535 STJ, detração, prescrição da PPL), usando o `pena_context` que vier no `raw_text`. `peca_sugerida="manifestacao_ep"` quando o expediente pede manifestação substantiva; `null` para mero despacho/ciência.

- [ ] **Step 6: Commit**

```bash
git add .claude/skills-cowork/analise-intimacao/
git commit -m "feat(analise-intimacao): sinal 2c (peca_sugerida/requer_analise_profunda) + EP-aware"
```

---

### Task 2: Módulo leitor de expediente do SEEU

**Files:**
- Create: `.claude/skills/varredura-triagem/scripts/seeu_expediente.py`
- Create: `.claude/skills/varredura-triagem/scripts/test_seeu_expediente.py`

**Interfaces:**
- Consumes: um `BrowserContext` (patchright) com uma aba SEEU logada; o CNJ do processo.
- Produces:
  - `parse_movimento_alvo(texto_pagina) -> {tipo, data} | None` (puro)
  - `parse_pena_context(texto_pagina) -> dict` (puro) — `{inicio, termino, livramento_condicional, ...}`
  - `async read_seeu_expediente(ctx, cnj) -> dict` — devolve `{text, top_titulo, pena_context, panel_text}` no MESMO formato que `read_doc_content` do caminho PJe, para o `varredura()` (Task 3) convergir sem ramo especial no classify.

- [ ] **Step 1: Escrever os testes puros que falham**

Criar `.claude/skills/varredura-triagem/scripts/test_seeu_expediente.py` (fixtures são strings REAIS capturadas ao vivo):

```python
import importlib.util, os
spec = importlib.util.spec_from_file_location(
    "seeu_expediente",
    os.path.join(os.path.dirname(__file__), "seeu_expediente.py"))
se = importlib.util.module_from_spec(spec); spec.loader.exec_module(se)

_ALVO = "Juntar MANIFESTAÇÃO referente ao movimento - PROFERIDO DESPACHO DE MERO EXPEDIENTE ( 29 de maio de 2026 às 16:01 )"
_PENA = "Início: 10/10/2024 Término: 28/07/2032 Livramento Condicional: 24/12/2025 REALCES Realçar"


def test_parse_movimento_alvo():
    r = se.parse_movimento_alvo(_ALVO)
    assert r["tipo"] == "PROFERIDO DESPACHO DE MERO EXPEDIENTE"
    assert r["data"] == "29/05/2026"


def test_parse_movimento_alvo_ausente():
    assert se.parse_movimento_alvo("nenhum movimento aqui") is None


def test_parse_pena_context():
    p = se.parse_pena_context(_PENA)
    assert p["inicio"] == "10/10/2024"
    assert p["termino"] == "28/07/2032"
    assert p["livramento_condicional"] == "24/12/2025"
```

> Nota: `data` é normalizada para DD/MM/YYYY. "29 de maio de 2026" → "29/05/2026" (mapa de meses PT).

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `cd .claude/skills/varredura-triagem/scripts && python3 -m pytest test_seeu_expediente.py -v`
Expected: FAIL — módulo não existe.

- [ ] **Step 3: Implementar os parsers puros + esqueleto do reader**

Criar `.claude/skills/varredura-triagem/scripts/seeu_expediente.py`:

```python
"""Leitor de expediente do SEEU (Execução Penal) para a varredura de triagem.
READ-ONLY: navega visualizacaoProcesso e lê DOM. Nunca escreve no SEEU."""
from __future__ import annotations
import re

SEEU_BASE = "https://seeu.pje.jus.br/seeu"

_MESES = {"janeiro":"01","fevereiro":"02","março":"03","marco":"03","abril":"04",
          "maio":"05","junho":"06","julho":"07","agosto":"08","setembro":"09",
          "outubro":"10","novembro":"11","dezembro":"12"}


def _data_extenso_to_iso(s: str) -> str | None:
    m = re.search(r"(\d{1,2})\s+de\s+([a-zçã]+)\s+de\s+(\d{4})", s, re.IGNORECASE)
    if not m:
        return None
    dia, mes, ano = m.group(1).zfill(2), _MESES.get(m.group(2).lower()), m.group(3)
    return f"{dia}/{mes}/{ano}" if mes else None


def parse_movimento_alvo(texto: str) -> dict | None:
    """Extrai o movimento que a intimação referencia:
    'Juntar {ATO} referente ao movimento - {TIPO} ( {data por extenso} )'."""
    m = re.search(r"referente ao movimento\s*-\s*(.+?)\s*\(([^)]*\d{4}[^)]*)\)", texto, re.IGNORECASE)
    if not m:
        return None
    tipo = re.sub(r"\s+", " ", m.group(1)).strip()
    return {"tipo": tipo, "data": _data_extenso_to_iso(m.group(2))}


def parse_pena_context(texto: str) -> dict:
    """Datas do painel de pena, quando presentes."""
    def g(label):
        m = re.search(label + r"\s*:?\s*(\d{2}/\d{2}/\d{4})", texto, re.IGNORECASE)
        return m.group(1) if m else None
    return {
        "inicio": g("Início"),
        "termino": g("Término"),
        "livramento_condicional": g("Livramento Condicional"),
    }


async def read_seeu_expediente(ctx, cnj: str) -> dict:
    """Abre o processo no SEEU e lê o documento-alvo da intimação. Devolve o mesmo
    formato que read_doc_content (PJe): {text, top_titulo, pena_context, panel_text}.
    Fallback (§7 do spec): se o teor não abrir, usa tipo do movimento + pena como text."""
    page = next((pg for pg in ctx.pages if "seeu" in (pg.url or "")), None)
    if page is None:
        raise RuntimeError("Abra o SEEU logado — nenhuma aba do SEEU no browser CDP")
    # abre a busca por CNJ → visualizacaoProcesso (mecanismo de teor finalizado no Step 4)
    proc_text = await _abrir_processo_por_cnj(page, cnj)
    alvo = parse_movimento_alvo(proc_text)
    pena = parse_pena_context(proc_text)
    teor = await _ler_teor_do_movimento(page, alvo) if alvo else None
    top_titulo = alvo["tipo"] if alvo else None
    text = teor or _fallback_text(alvo, pena)
    return {"text": text, "top_titulo": top_titulo, "pena_context": pena,
            "panel_text": proc_text}


def _fallback_text(alvo: dict | None, pena: dict) -> str:
    partes = []
    if alvo:
        partes.append(f"Movimento intimado: {alvo['tipo']} ({alvo.get('data') or ''})")
    peninfo = ", ".join(f"{k}={v}" for k, v in pena.items() if v)
    if peninfo:
        partes.append(f"Execução: {peninfo}")
    return "\n".join(partes) or "(sem teor legível)"
```

Os helpers async `_abrir_processo_por_cnj` e `_ler_teor_do_movimento` ficam com corpo mínimo levantando `NotImplementedError` neste passo (o Step 4 os finaliza via probe ao vivo). Os testes puros (Step 1) não os tocam.

- [ ] **Step 4: Finalizar o teor via probe ao vivo (então implementar)**

Com o SEEU logado no browser CDP, rodar um probe para fechar dois pontos: (a) como abrir o processo por CNJ (Busca Execução Penal → visualizacaoProcesso) e capturar `document.body.innerText`; (b) como abrir o teor do movimento-alvo (clicar a linha/Seq na timeline "Movimentações" e ler o texto do documento). Script de probe (não commitado):

```python
# probe: attach CDP :9333/:9222, abrir um CNJ de EP, achar o movimento-alvo,
# clicar e dumpar o teor. Ajustar os seletores e então preencher
# _abrir_processo_por_cnj e _ler_teor_do_movimento com o mecanismo confirmado.
```

Implementar `_abrir_processo_por_cnj(page, cnj) -> str` (navega e devolve o innerText do processo) e `_ler_teor_do_movimento(page, alvo) -> str | None` (abre o documento do movimento e devolve o texto, ou `None` → cai no fallback). Manter READ-ONLY.

- [ ] **Step 5: Confirmar testes puros verdes + import limpo**

Run: `cd .claude/skills/varredura-triagem/scripts && python3 -m pytest test_seeu_expediente.py -v` → 3/3 PASS.
Run: `python3 -c "import ast; ast.parse(open('.claude/skills/varredura-triagem/scripts/seeu_expediente.py').read())"`.

- [ ] **Step 6: Commit**

```bash
git add .claude/skills/varredura-triagem/scripts/seeu_expediente.py .claude/skills/varredura-triagem/scripts/test_seeu_expediente.py
git commit -m "feat(varredura): leitor de expediente SEEU (parsers puros + reader read-only)"
```

---

### Task 3: Rotear EP→SEEU na varredura

**Files:**
- Modify: `.claude/skills/varredura-triagem/scripts/varredura_triagem.py` (loop de `varredura()`, ~1512–1541; import do módulo)

**Interfaces:**
- Consumes: `read_seeu_expediente(ctx, cnj)` (Task 2); a estrutura `{text, top_titulo, pena_context, panel_text}`.
- Produces: para demandas `EXECUCAO_PENAL`, o mesmo `classify → apply_classification → enqueue analise-intimacao` roda com o conteúdo lido do SEEU; o `raw_text` (que o `analise-intimacao` consome) inclui o `pena_context`.

- [ ] **Step 1: Importar o módulo e pular a navegação PJe para rodadas EP**

No topo de `varredura_triagem.py` (perto dos outros imports locais), adicionar:

```python
from seeu_expediente import read_seeu_expediente  # leitor EP/SEEU (Task 2)
```

No bloco de navegação de painel (~1512), NÃO navegar o painel PJe quando a atribuição-alvo é EP (EP não está no PJe):

```python
        if modo in ("cdp", "direct") and atrib_alvo and atrib_alvo != "EXECUCAO_PENAL":
            if atrib_alvo:
                try:
                    await page.goto(PANEL_URL, wait_until="domcontentloaded", timeout=30000)
                    await asyncio.sleep(2)
                    if await navigate_to_unidade(page, atrib_alvo):
                        uni = ATRIB_UNIDADE.get(atrib_alvo)
                        log(f"painel navegado → {uni[0]} ▸ {uni[1]}" if uni else "painel navegado")
                except Exception as e:
                    log(f"  ⚠ navegação falhou ({str(e)[:90]}) — docs podem cair em manual-review")
```

- [ ] **Step 2: Rotear a leitura por atribuição dentro do loop**

No loop `for i, d in enumerate(demandas)`, substituir o trecho que hoje faz `find_in_panel` + `read_doc_content` (linhas ~1534–1554) por um roteamento: EP usa o leitor SEEU; o resto segue o caminho PJe. O restante (classify/apply/enqueue) fica idêntico:

```python
                atrib_demanda = (d.get("processos") or {}).get("atribuicao") or atrib_alvo
                if atrib_demanda == "EXECUCAO_PENAL":
                    cnj = (d.get("processos") or {}).get("numero_autos") or ""
                    if not cnj or cnj == "?":
                        log("  ⚠ demanda EP sem CNJ — manual-review")
                        create_manual_review(sb, d); stats["not_found"] += 1; continue
                    try:
                        content = await read_seeu_expediente(ctx, cnj)
                    except Exception as e:
                        log(f"  ⚠ SEEU: {str(e)[:90]} — manual-review")
                        create_manual_review(sb, d); stats["not_found"] += 1; continue
                    # raw_text p/ o analise-intimacao inclui o contexto de pena
                    pena = content.get("pena_context") or {}
                    peninfo = ", ".join(f"{k}={v}" for k, v in pena.items() if v)
                    texto = _clean_decisao_text(content["text"])
                    if peninfo:
                        texto = f"[Execução: {peninfo}]\n{texto}"
                    best_titulo = content.get("top_titulo")
                    movimentos = []  # EP não usa a timeline de audiências do PJe
                else:
                    autos_url = await find_in_panel(page, doc_id, numero)
                    if not autos_url:
                        log("  ⚠ não encontrado no painel — fallback manual-review")
                        create_manual_review(sb, d); stats["not_found"] += 1; continue
                    content = await read_doc_content(ctx, autos_url)
                    best_titulo = content.get("top_titulo")
                    if not best_titulo and content.get("best_id"):
                        for it in content.get("timeline", []):
                            if it.get("id") == content["best_id"]:
                                best_titulo = it.get("titulo"); break
                    texto = _clean_decisao_text(content["text"])
                    movimentos = extrair_movimentos_audiencia(content.get("panel_text", ""))
                    if movimentos:
                        log(f"  ⤷ {len(movimentos)} movimento(s) de audiência na timeline")

                is_mpu_demanda = _is_mpu(d)
                rule = classify(texto, titulo=best_titulo, is_mpu=is_mpu_demanda,
                                atribuicao=atrib_demanda, movimentos=movimentos)
```

> Mantém o resto do loop (o bloco `if not rule …`, `apply_classification`, `pending_ai_ids.append`, counts) exatamente como está. `doc_id`/`numero` continuam calculados antes (usados só no ramo PJe).

- [ ] **Step 3: Teste ao vivo (aceitação — controller)**

Com PJe **e** SEEU logados no browser CDP, e demandas de EP em triagem (importadas na Fase 1):

```bash
python3 .claude/skills/varredura-triagem/scripts/varredura_triagem.py \
  --modo cdp --atribuicao EXECUCAO_PENAL --limit 5
```

Expected: para cada demanda EP, abre o processo no SEEU, lê o movimento-alvo, classifica (RULES_EP), grava registro base + enfileira `analise-intimacao`. Nenhuma escrita no SEEU. Depois o daemon Max roda o `analise-intimacao` e o card de análise mostra o resumo + "Cabe peça" (quando houver).

- [ ] **Step 4: Confirmar que o caminho PJe não regrediu**

Run: `cd .claude/skills/varredura-triagem/scripts && python3 -m pytest -q` (os testes existentes do varredura, ex. `_self_test_build_by_ids`, continuam verdes) + `python3 -c "import ast; ast.parse(open('varredura_triagem.py').read())"`.

- [ ] **Step 5: Commit**

```bash
git add .claude/skills/varredura-triagem/scripts/varredura_triagem.py
git commit -m "feat(varredura): roteia EP→leitor SEEU (Júri/VVD seguem PJe)"
```

---

## Self-Review (cobertura do spec)

- Leitor SEEU (spec §4) → Task 2 (parsers + reader) + Task 3 Step 3 (teor finalizado no probe). ✓
- Roteamento por atribuição (spec §3) → Task 3. ✓
- `analise-intimacao` estendido: `peca_sugerida`/`requer_analise_profunda` + EP-aware (spec §5) → Task 1. ✓
- Sinal determinístico `requer == (peca != null)` (spec §5) → Task 1 `sinal_2c` + teste. ✓
- Sem colunas novas; sinal em `enrichment_data` (spec §6) → Task 1 Step 3. ✓
- Read-only; sem disparo automático (spec §2) → Global Constraints + Task 2/3. ✓
- Risco do teor (spec §7) → Task 2 Step 4 (probe) + fallback `_fallback_text`. ✓
- Fora de escopo: 2b (autos SEEU) e 2c (pipeline profundo) — não neste plano. ✓
