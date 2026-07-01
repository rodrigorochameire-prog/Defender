# Triagem — Paridade de anotações (Júri + EP + Criminal) e card nunca em branco — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fazer toda demanda de triagem (em especial Júri, com paridade EP/Criminal) chegar ao card com objeto/decidido/providência/prazo/recurso visíveis, e nenhum card em branco.

**Architecture:** A varredura (Python, `varredura_triagem.py`) classifica cada intimação (fase 1) e enfileira a IA (fase 2, `write_analise.py`). Adicionamos rule sets por atribuição, roteamos `fase`/`motivo` para `demandas.enrichment_data`, introduzimos um único "registro de análise" (contrato) escrito pela fase 1 e atualizado in-place pela fase 2, extraímos texto de PDFs via OCR para não pular a IA, e renderizamos campos rotulados no card do kanban e na tela de detalhe.

**Tech Stack:** Python 3.12 (stdlib + poppler `pdftotext` + `tesseract`), PostgREST (Supabase), Next.js 15 + tRPC + Drizzle, React + vitest/@testing-library.

## Global Constraints

- **Sem DDL / sem migração de schema.** Só chaves novas em jsonb (`demandas.enrichment_data`, `registros.enrichment_data`) e tipagem TS.
- **Invariante de ciência:** NUNCA navegar para `visualizarExpediente.seam` nem acionar "TOMAR CIÊNCIA". PDF só de dentro de `listProcessoCompletoAdvogado.seam` (autos completos).
- **A varredura nunca lança exceção não tratada:** leitura/OCR/escrita em `try/except`, falha vira estado "documento não lido — revisão manual".
- **Contrato do registro de análise:** `tipo='analise'`, `titulo='Resumo e providências'`, `enrichment_data` sempre contém a chave `objeto`; payload `{objeto, decidido, providencia, prazo, recurso, _status, _fonte}`, `_status ∈ {pendente, concluido, nao_lido}`, `_fonte ∈ {fase1, fase2}`. Escrita = select-then-update em nível de app (sem `ON CONFLICT`).
- **Texto das regras é NORMALIZADO** (sem acento, minúsculo) via `normalize()` antes do `re.search`.
- **Vocabulário `fase`/`motivo`** conforme spec §A1.1 (valores `snake_case` fechados).
- Skills têm cópias-espelho locais: ao final, sincronizar e atualizar memória (skill `evolucao-skills`).
- Spec de referência: `docs/superpowers/specs/2026-07-01-triagem-parity-anotacoes-design.md`.

---

### Task 1: Rotear `fase`/`motivo` para `demandas.enrichment_data` e restringir `processos_vvd` a VVD/MPU

**Files:**
- Modify: `.claude/skills-cowork/varredura-triagem/scripts/varredura_triagem.py` (novo método na classe `Supabase` após `update_demanda` ~:236; novo helper puro antes de `apply_classification` ~:1048; bloco fase/motivo em `apply_classification` :1068-1077)
- Test: `.claude/skills-cowork/varredura-triagem/scripts/test_fase_motivo_routing.py`

**Interfaces:**
- Produces: `fase_motivo_patch(rule: dict) -> dict` (retorna `{}` ou `{"fase_processual": str, "motivo": str}` com apenas as chaves presentes); `Supabase.merge_demanda_enrichment(demanda_id: int, patch: dict) -> None`.

- [ ] **Step 1: Escrever o teste que falha** — `test_fase_motivo_routing.py`:

```python
#!/usr/bin/env python3
"""Testa fase_motivo_patch: monta o patch de enrichment a partir da regra.
Roda standalone: python3 test_fase_motivo_routing.py (exit 0 = ok)."""
from __future__ import annotations
import sys
from pathlib import Path

SCRIPT = Path(__file__).parent / "varredura_triagem.py"
ns: dict = {"__file__": str(SCRIPT)}
src = SCRIPT.read_text()
src_no_main = "\n".join(
    l for l in src.splitlines()
    if not l.strip().startswith("main()") and l.strip() != 'if __name__ == "__main__":'
)
exec(src_no_main, ns)
fase_motivo_patch = ns["fase_motivo_patch"]

CASES = [
    ({"fase": "pronuncia", "motivo": "decisao_pronuncia"},
     {"fase_processual": "pronuncia", "motivo": "decisao_pronuncia"}),
    ({"fase": None, "motivo": "precatoria"}, {"motivo": "precatoria"}),
    ({"fase": "plenario", "motivo": None}, {"fase_processual": "plenario"}),
    ({"ato": "Ciência"}, {}),  # sem fase/motivo → patch vazio
]

def main():
    fails = 0
    for rule, expected in CASES:
        got = fase_motivo_patch(rule)
        if got != expected:
            print(f"FAIL {rule} -> {got} (esperado {expected})"); fails += 1
    print("OK" if not fails else f"{fails} FALHAS")
    sys.exit(1 if fails else 0)

if __name__ == "__main__":
    main()
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `python3 .claude/skills-cowork/varredura-triagem/scripts/test_fase_motivo_routing.py`
Expected: FAIL — `KeyError: 'fase_motivo_patch'` (helper ainda não existe).

- [ ] **Step 3: Implementar o helper puro** — inserir antes de `def apply_classification` (~:1048):

```python
def fase_motivo_patch(rule: dict) -> dict:
    """Monta o patch genérico de fase/motivo para demandas.enrichment_data.
    Vale para TODA atribuição (o destino processos_vvd é separado e gateado)."""
    patch: dict = {}
    if rule.get("fase"):
        patch["fase_processual"] = rule["fase"]
    if rule.get("motivo"):
        patch["motivo"] = rule["motivo"]
    return patch
```

- [ ] **Step 4: Adicionar o método `merge_demanda_enrichment`** — na classe `Supabase`, após `update_demanda` (~:236):

```python
    def merge_demanda_enrichment(self, demanda_id: int, patch: dict) -> None:
        """Faz merge (não overwrite) de chaves em demandas.enrichment_data.
        Lê o jsonb atual, mescla e regrava. No-op se patch vazio."""
        if not patch:
            return
        rows = self._req("GET", f"/rest/v1/demandas?id=eq.{demanda_id}&select=enrichment_data&limit=1")
        cur = (rows[0].get("enrichment_data") if isinstance(rows, list) and rows else None) or {}
        self._req("PATCH", f"/rest/v1/demandas?id=eq.{demanda_id}",
                  {"enrichment_data": {**cur, **patch}}, prefer="return=minimal")
```

- [ ] **Step 5: Reescrever o bloco fase/motivo em `apply_classification`** — substituir :1068-1077 por:

```python
    # ── fase/motivo GENÉRICO → demandas.enrichment_data (toda atribuição) ──────
    try:
        sb.merge_demanda_enrichment(demanda["id"], fase_motivo_patch(rule))
    except Exception as e:
        log(f"  ⚠ falha merge enrichment (demanda={demanda['id']}): {e}")
    # ── processos_vvd: fase/motivo — SÓ VVD/MPU (evita linha espúria) ──────────
    fase, motivo = rule.get("fase"), rule.get("motivo")
    if is_mpu and (fase or motivo) and proc_id:
        pvvd: dict = {}
        if fase: pvvd["fase_procedimento"] = fase
        if motivo: pvvd["motivo_ultima_intimacao"] = motivo
        try:
            sb.upsert_processo_vvd(proc_id, pvvd)
        except Exception as e:
            log(f"  ⚠ falha processos_vvd (proc_id={proc_id}): {e}")
```

(`is_mpu` já é computado em :1066 `is_mpu = _is_mpu(demanda)`.)

- [ ] **Step 6: Rodar o teste e ver passar**

Run: `python3 .claude/skills-cowork/varredura-triagem/scripts/test_fase_motivo_routing.py`
Expected: PASS — imprime `OK`.

- [ ] **Step 7: Regressão MPU** (garante que VVD continua)

Run: `python3 .claude/skills-cowork/varredura-triagem/scripts/test_classify_mpu.py`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add .claude/skills-cowork/varredura-triagem/scripts/varredura_triagem.py \
        .claude/skills-cowork/varredura-triagem/scripts/test_fase_motivo_routing.py
git commit -m "feat(varredura): roteia fase/motivo p/ demandas.enrichment_data e gateia processos_vvd a VVD/MPU"
```

---

### Task 2: `RULES_JURI` + ramo `is_juri` no classificador

**Files:**
- Modify: `.claude/skills-cowork/varredura-triagem/scripts/varredura_triagem.py` (nova lista `RULES_JURI` após `RULES_EP` ~:552; ramo em `_classify_core` antes do bloco de título ~:788)
- Test: `.claude/skills-cowork/varredura-triagem/scripts/test_classify_juri.py`

**Interfaces:**
- Consumes: `classify(text, titulo, is_mpu, atribuicao, movimentos)` (existente).
- Produces: dispatch Júri quando `"JURI" in atribuicao`, retornando dict com chaves `ato, prioridade, prazo_dias, registro_tipo, fase, motivo, side_effects, extras`. Vocabulário `fase`/`motivo` = spec §A1.1.

- [ ] **Step 1: Escrever o teste que falha** — `test_classify_juri.py`:

```python
#!/usr/bin/env python3
"""Suite synthetics para classify(atribuicao='JURI_CAMACARI'). Standalone."""
from __future__ import annotations
import sys
from pathlib import Path

SCRIPT = Path(__file__).parent / "varredura_triagem.py"
ns: dict = {"__file__": str(SCRIPT)}
src = SCRIPT.read_text()
src_no_main = "\n".join(
    l for l in src.splitlines()
    if not l.strip().startswith("main()") and l.strip() != 'if __name__ == "__main__":'
)
exec(src_no_main, ns)
classify = ns["classify"]

A = "JURI_CAMACARI"
# (id, titulo, texto, ato, prioridade, fase, motivo)
CASES = [
    ("pronuncia", "Sentença",
     "PRONUNCIO o réu nos termos do art. 413 do CPP para submetê-lo a julgamento",
     "Analisar pronúncia (RESE)", "URGENTE", "pronuncia", "decisao_pronuncia"),
    ("impronuncia", "Sentença",
     "julgo IMPRONUNCIADO o acusado, art. 414 do CPP",
     "Analisar impronúncia", "ALTA", "pronuncia", "decisao_impronuncia"),
    ("desclassificacao", "Decisão",
     "DESCLASSIFICO a conduta para lesão corporal, remetendo ao juízo comum",
     "Ciência de desclassificação", "NORMAL", "pronuncia", "decisao_desclassificacao"),
    ("plenario", "Decisão",
     "DESIGNO sessão de julgamento pelo Tribunal do Júri em plenário para 20/08/2026",
     "Ciência sessão de plenário", "ALTA", "plenario", "designacao_plenario"),
    ("d422", "Despacho",
     "Preclusa a pronúncia, art. 422 do CPP, apresentem rol de testemunhas para o plenário",
     "Diligências do 422", "ALTA", "preparacao_plenario", "diligencias_422"),
    ("alegacoes_sumario", "Despacho",
     "Encerrada a instrução da primeira fase, prazo de 5 dias para alegações finais do sumário",
     "Alegações finais (sumário)", "URGENTE", "sumario_culpa", "alegacoes_finais_sumario"),
    ("aij_1a", "Decisão",
     "DESIGNO audiência de instrução e julgamento (AIJ) para 10/09/2026",
     "Ciência designação de AIJ", "NORMAL", "sumario_culpa", "designacao_aij_1a_fase"),
    ("apelacao_plenario", "Sentença",
     "Condenado pelo Conselho de Sentença do Tribunal do Júri; intime-se a defesa",
     "Analisar apelação (art. 593 III)", "URGENTE", "pos_julgamento", "intimacao_sentenca_plenario"),
    ("precatoria", "Despacho",
     "Cumpra-se a carta precatória para oitiva de testemunha",
     "Cumprir precatória", "NORMAL", None, "precatoria"),
]

def main():
    fails = 0
    for cid, tit, txt, ato, prio, fase, motivo in CASES:
        r = classify(txt, titulo=tit, atribuicao=A)
        if r is None:
            print(f"FAIL [{cid}] sem match"); fails += 1; continue
        if r["ato"] != ato or r["prioridade"] != prio or r.get("fase") != fase or r.get("motivo") != motivo:
            print(f"FAIL [{cid}] -> ato={r['ato']!r} prio={r['prioridade']!r} "
                  f"fase={r.get('fase')!r} motivo={r.get('motivo')!r}"); fails += 1
    print("OK" if not fails else f"{fails} FALHAS")
    sys.exit(1 if fails else 0)

if __name__ == "__main__":
    main()
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `python3 .claude/skills-cowork/varredura-triagem/scripts/test_classify_juri.py`
Expected: FAIL (regras Júri caem no RULES_BASE → atos genéricos).

- [ ] **Step 3: Adicionar `RULES_JURI`** — após o fim de `RULES_EP` (~:552). Tupla de 9 (igual MPU): `(pattern, ato, prio, prazo, tipo, fase, motivo, fx, ex)`:

```python
# ───── Regras Júri (atribuicao contém "JURI") ────────────────────────────────
# Tupla de 9 (como MPU): (pattern, ato, prioridade, prazo_dias, registro_tipo,
# fase, motivo, side_effects, extras). Texto NORMALIZADO. Primeira que casa vence.
# Aplicadas ANTES de RULES_BASE quando is_juri; se nada casar → fallback RULES_BASE.
# Vocabulário fase/motivo: spec §A1.1. Impronúncia ANTES de pronúncia (substring).
RULES_JURI = [
    (r"impronunci",
     "Analisar impronúncia", "ALTA", None, "diligencia",
     "pronuncia", "decisao_impronuncia", [], {}),
    (r"desclassific",
     "Ciência de desclassificação", "NORMAL", None, "ciencia",
     "pronuncia", "decisao_desclassificacao", [], {}),
    (r"\bpronunci",
     "Analisar pronúncia (RESE)", "URGENTE", 5, "diligencia",
     "pronuncia", "decisao_pronuncia", [], {}),
    (r"sessao de julgamento.{0,30}(tribunal do juri|plenario)|design\w*.{0,20}plenario|sessao.{0,15}plenario",
     "Ciência sessão de plenário", "ALTA", None, "ciencia",
     "plenario", "designacao_plenario", ["agendar_audiencia"], {"tipo_audiencia": "JURI"}),
    (r"art\.?\s*422|(preclu|transitad).{0,40}pronuncia|diligencias.{0,20}(plenario|422)|rol.{0,20}testemunhas.{0,20}plenario|prepara\w*.{0,20}plenario",
     "Diligências do 422", "ALTA", 5, "diligencia",
     "preparacao_plenario", "diligencias_422", [], {}),
    (r"(alegacoes finais|memoriais).{0,40}(sumario|primeira fase|1a fase)|(primeira fase|sumario).{0,40}(alegacoes finais|memoriais)",
     "Alegações finais (sumário)", "URGENTE", 5, "diligencia",
     "sumario_culpa", "alegacoes_finais_sumario", [], {}),
    (r"(designo|designada|fica designada).{0,40}(audiencia|aij|instrucao)",
     "Ciência designação de AIJ", "NORMAL", None, "ciencia",
     "sumario_culpa", "designacao_aij_1a_fase", ["agendar_audiencia"], {"tipo_audiencia": "INSTRUCAO"}),
    (r"(conselho de sentenca|tribunal do juri).{0,60}conden|conden\w*.{0,40}(juri|plenario)|sentenca.{0,40}(plenario|conselho de sentenca)",
     "Analisar apelação (art. 593 III)", "URGENTE", 5, "diligencia",
     "pos_julgamento", "intimacao_sentenca_plenario", [], {}),
    (r"contrarraz",
     "Contrarrazões", "URGENTE", 8, "diligencia",
     "pos_julgamento", "contrarrazoes", [], {}),
    (r"\bapel",
     "Analisar apelação", "URGENTE", 5, "diligencia",
     "pos_julgamento", "apelacao", [], {}),
    (r"precatoria",
     "Cumprir precatória", "NORMAL", None, "diligencia",
     None, "precatoria", [], {}),
    (r"tomar ciencia|intimacao|\bciencia\b",
     "Ciência", "BAIXA", None, "ciencia",
     None, None, [], {}),
]
```

- [ ] **Step 4: Adicionar o ramo `is_juri` em `_classify_core`** — inserir logo após o bloco EP (após :787, antes de `titulo_rule = ...` :788):

```python
    if "JURI" in (atribuicao or ""):
        for pat, ato, prio, prazo, tipo, fase, motivo, fx, ex in RULES_JURI:
            if re.search(pat, n):
                return {"ato": ato, "prioridade": prio, "prazo_dias": prazo,
                        "registro_tipo": tipo, "fase": fase, "motivo": motivo,
                        "side_effects": fx, "extras": ex}
        # nenhuma regra Júri casou → fallback título + RULES_BASE
```

- [ ] **Step 5: Rodar o teste e ver passar**

Run: `python3 .claude/skills-cowork/varredura-triagem/scripts/test_classify_juri.py`
Expected: PASS — `OK`. (Se algum caso falhar, ajustar o pattern correspondente e reexecutar.)

- [ ] **Step 6: Regressão base + MPU**

Run: `python3 .claude/skills-cowork/varredura-triagem/scripts/test_classify_mpu.py && python3 .claude/skills-cowork/varredura-triagem/scripts/test_movimento_audiencia.py`
Expected: PASS em ambos.

- [ ] **Step 7: Commit**

```bash
git add .claude/skills-cowork/varredura-triagem/scripts/varredura_triagem.py \
        .claude/skills-cowork/varredura-triagem/scripts/test_classify_juri.py
git commit -m "feat(varredura): RULES_JURI (pronúncia/impronúncia/desclassificação/plenário/422/alegações/apelação) + ramo is_juri"
```

---

### Task 3: Paridade EP (fase/motivo) + `RULES_CRIMINAL` (autorada, inerte) + ramo `is_criminal`

**Files:**
- Modify: `.claude/skills-cowork/varredura-triagem/scripts/varredura_triagem.py` (reescrever `RULES_EP` :522-552 para 9-tuplas; atualizar unpack EP em `_classify_core` :781-786; nova `RULES_CRIMINAL`; ramo `is_criminal`)
- Test: `.claude/skills-cowork/varredura-triagem/scripts/test_classify_ep_criminal.py`

**Interfaces:**
- Produces: EP retorna dict com `fase`/`motivo` preenchidos; dispatch Criminal quando `"CRIMINAL" in atribuicao`.

- [ ] **Step 1: Escrever o teste que falha** — `test_classify_ep_criminal.py`:

```python
#!/usr/bin/env python3
"""classify() para EP (fase/motivo) e Criminal (autorada/inerte). Standalone."""
from __future__ import annotations
import sys
from pathlib import Path

SCRIPT = Path(__file__).parent / "varredura_triagem.py"
ns: dict = {"__file__": str(SCRIPT)}
src = SCRIPT.read_text()
src_no_main = "\n".join(
    l for l in src.splitlines()
    if not l.strip().startswith("main()") and l.strip() != 'if __name__ == "__main__":'
)
exec(src_no_main, ns)
classify = ns["classify"]

EP = "EXECUCAO_PENAL"
CR = "CRIMINAL_CAMACARI"
CASES = [
    (EP, "Decisão", "atestado de pena; requisitos para progressão de regime preenchidos",
     "Requerimento de progressão", "NORMAL", "execucao_definitiva", "progressao_regime"),
    (EP, "Decisão", "concedo livramento condicional ao apenado",
     "Livramento condicional", "NORMAL", "execucao_definitiva", "livramento_condicional"),
    (EP, "Decisão", "homologo a remição de pena pelos dias trabalhados",
     "Remição de pena", "NORMAL", "execucao_definitiva", "remicao"),
    (EP, "Decisão", "declaro extinta a punibilidade pelo cumprimento integral da pena",
     "Extinção da punibilidade", "ALTA", "execucao_definitiva", "extincao_punibilidade"),
    (CR, "Decisão", "cite-se o réu para apresentar resposta à acusação no prazo de 10 dias, art. 396",
     "Resposta à Acusação", "URGENTE", "resposta_acusacao", "citacao_resposta_acusacao"),
    (CR, "Despacho", "prazo de 5 dias para alegações finais por memoriais",
     "Alegações finais (memoriais)", "URGENTE", "alegacoes_finais", "alegacoes_finais_memoriais"),
]

def main():
    fails = 0
    for atrib, tit, txt, ato, prio, fase, motivo in CASES:
        r = classify(txt, titulo=tit, atribuicao=atrib)
        if r is None:
            print(f"FAIL [{atrib}/{ato}] sem match"); fails += 1; continue
        if r["ato"] != ato or r["prioridade"] != prio or r.get("fase") != fase or r.get("motivo") != motivo:
            print(f"FAIL [{atrib}/{ato}] -> {r['ato']!r}/{r['prioridade']!r}/"
                  f"{r.get('fase')!r}/{r.get('motivo')!r}"); fails += 1
    print("OK" if not fails else f"{fails} FALHAS")
    sys.exit(1 if fails else 0)

if __name__ == "__main__":
    main()
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `python3 .claude/skills-cowork/varredura-triagem/scripts/test_classify_ep_criminal.py`
Expected: FAIL (EP sem fase/motivo; Criminal cai no RULES_BASE).

- [ ] **Step 3: Reescrever `RULES_EP` para 9-tuplas** — substituir :522-552 inteiro por (mantém ordem/atos, adiciona `fase`/`motivo`):

```python
RULES_EP = [
    (r"extin(c|ç).{0,20}punibilidade|pena.{0,10}cumprida|prescri(c|ç)",
     "Extinção da punibilidade", "ALTA", 5, "diligencia",
     "execucao_definitiva", "extincao_punibilidade", [], {}),
    (r"reconvers",
     "Manifestação contra reconversão", "ALTA", 5, "diligencia",
     "execucao_definitiva", "incidente_falta_grave", [], {}),
    (r"regress.{0,20}regime|falta grave",
     "Manifestação contra regressão", "URGENTE", 5, "diligencia",
     "execucao_definitiva", "incidente_falta_grave", [], {}),
    (r"rescis.{0,20}anpp|descumpr.{0,20}anpp",
     "Impugnação à rescisão de ANPP", "URGENTE", 5, "diligencia",
     "execucao_provisoria", "incidente_falta_grave", [], {}),
    (r"sursis",
     "Alteração de condição do SURSIS", "NORMAL", 5, "diligencia",
     "execucao_definitiva", "progressao_regime", [], {}),
    (r"livramento condicional",
     "Livramento condicional", "NORMAL", 5, "diligencia",
     "execucao_definitiva", "livramento_condicional", [], {}),
    (r"remi(c|ç)",
     "Remição de pena", "NORMAL", 5, "diligencia",
     "execucao_definitiva", "remicao", [], {}),
    (r"progress.{0,20}regime|requisit.{0,20}progress|calculo.{0,15}pena|atestado.{0,15}pena",
     "Requerimento de progressão", "NORMAL", 5, "diligencia",
     "execucao_definitiva", "progressao_regime", [], {}),
    (r"sa(i|í)da tempor",
     "Saída temporária", "NORMAL", 5, "diligencia",
     "execucao_definitiva", "saida_temporaria", [], {}),
    (r"permiss.{0,15}sa(i|í)da",
     "Permissão de saída", "NORMAL", 5, "diligencia",
     "execucao_definitiva", "saida_temporaria", [], {}),
    (r"prisao domiciliar|domiciliar",
     "Prisão domiciliar", "URGENTE", 5, "diligencia",
     "execucao_definitiva", "progressao_regime", [], {}),
    (r"indulto|comuta(c|ç)",
     "Indulto", "ALTA", 5, "diligencia",
     "execucao_definitiva", "extincao_punibilidade", [], {}),
    (r"transfer.{0,20}(unidade|autos|presidio)",
     "Transferência de unidade", "NORMAL", 5, "diligencia",
     "execucao_definitiva", "unificacao_soma_penas", [], {}),
    (r"unifica(c|ç).{0,20}pena|soma.{0,10}pena",
     "Unificação/soma de penas", "NORMAL", 5, "diligencia",
     "execucao_definitiva", "unificacao_soma_penas", [], {}),
    (r"\bdecisao\b",
     "Analisar decisão", "NORMAL", None, "diligencia",
     "execucao_definitiva", "calculo_pena", [], {}),
]
```

- [ ] **Step 4: Atualizar o unpack EP em `_classify_core`** — substituir :781-786:

```python
    if "EXECUCAO_PENAL" in (atribuicao or ""):
        for pat, ato, prio, prazo, tipo, fase, motivo, fx, ex in RULES_EP:
            if re.search(pat, n):
                return {"ato": ato, "prioridade": prio, "prazo_dias": prazo,
                        "registro_tipo": tipo, "fase": fase, "motivo": motivo,
                        "side_effects": fx, "extras": ex}
        # nenhuma regra EP casou → fallback para título genérico + RULES_BASE
```

- [ ] **Step 5: Adicionar `RULES_CRIMINAL`** — após `RULES_JURI`:

```python
# ───── Regras Criminal comum (atribuicao contém "CRIMINAL") ──────────────────
# AUTORADA, PORÉM INERTE: ATRIB_UNIDADE não mapeia CRIMINAL_CAMACARI (embora o
# CLI aceite o token), então o scraping ainda não a alimenta. Fica pronta p/
# quando a unidade for adicionada. Tupla de 9 como Júri/MPU. Vocabulário §A1.1.
RULES_CRIMINAL = [
    (r"resposta a acusacao|arts?\.?\s*396",
     "Resposta à Acusação", "URGENTE", 10, "diligencia",
     "resposta_acusacao", "citacao_resposta_acusacao", [], {}),
    (r"(alegacoes finais|memoriais)",
     "Alegações finais (memoriais)", "URGENTE", 5, "diligencia",
     "alegacoes_finais", "alegacoes_finais_memoriais", [], {}),
    (r"(designo|designada|fica designada).{0,40}(audiencia|aij|instrucao)",
     "Ciência designação de AIJ", "NORMAL", None, "ciencia",
     "instrucao", "designacao_aij", ["agendar_audiencia"], {"tipo_audiencia": "INSTRUCAO"}),
    (r"\bsentenca\b",
     "Analisar sentença", "URGENTE", 5, "diligencia",
     "sentenca", "intimacao_sentenca", [], {}),
    (r"\bapel|recurso em sentido estrito|\brese\b",
     "Analisar recurso", "URGENTE", 5, "diligencia",
     "recurso", "prazo_recurso", [], {}),
    (r"tomar ciencia|intimacao|\bciencia\b",
     "Ciência", "BAIXA", None, "ciencia",
     None, None, [], {}),
]
```

- [ ] **Step 6: Adicionar o ramo `is_criminal`** — em `_classify_core`, logo após o ramo `is_juri` (Task 2 Step 4):

```python
    if "CRIMINAL" in (atribuicao or ""):
        for pat, ato, prio, prazo, tipo, fase, motivo, fx, ex in RULES_CRIMINAL:
            if re.search(pat, n):
                return {"ato": ato, "prioridade": prio, "prazo_dias": prazo,
                        "registro_tipo": tipo, "fase": fase, "motivo": motivo,
                        "side_effects": fx, "extras": ex}
        # nenhuma regra Criminal casou → fallback título + RULES_BASE
```

- [ ] **Step 7: Rodar o teste e ver passar**

Run: `python3 .claude/skills-cowork/varredura-triagem/scripts/test_classify_ep_criminal.py`
Expected: PASS — `OK`.

- [ ] **Step 8: Regressão total dos classificadores**

Run: `for t in test_classify_mpu test_classify_juri test_classify_ep_criminal test_movimento_audiencia; do python3 .claude/skills-cowork/varredura-triagem/scripts/$t.py || exit 1; done; echo ALL-OK`
Expected: `ALL-OK`.

- [ ] **Step 9: Commit**

```bash
git add .claude/skills-cowork/varredura-triagem/scripts/varredura_triagem.py \
        .claude/skills-cowork/varredura-triagem/scripts/test_classify_ep_criminal.py
git commit -m "feat(varredura): paridade EP (fase/motivo) + RULES_CRIMINAL inerte + ramo is_criminal"
```

---

### Task 4: Contrato do registro de análise na fase 1 (card nunca em branco)

**Files:**
- Modify: `.claude/skills-cowork/varredura-triagem/scripts/varredura_triagem.py` (novo método `Supabase.upsert_analise_registro`; novo helper `build_fase1_analise`; chamada em `apply_classification` após o registro base ~:1120)
- Test: `.claude/skills-cowork/varredura-triagem/scripts/test_fase1_analise.py`

**Interfaces:**
- Produces: `build_fase1_analise(rule: dict, content_ok: bool) -> dict` → `{objeto, decidido, providencia, prazo, recurso, _status, _fonte:"fase1"}`; `Supabase.upsert_analise_registro(demanda_id, base: dict, payload: dict) -> None` (select-then-update do registro `tipo='analise'`, `titulo='Resumo e providências'`).

- [ ] **Step 1: Escrever o teste que falha** — `test_fase1_analise.py`:

```python
#!/usr/bin/env python3
"""build_fase1_analise: payload determinístico do contrato de análise. Standalone."""
from __future__ import annotations
import sys
from pathlib import Path

SCRIPT = Path(__file__).parent / "varredura_triagem.py"
ns: dict = {"__file__": str(SCRIPT)}
src = SCRIPT.read_text()
src_no_main = "\n".join(
    l for l in src.splitlines()
    if not l.strip().startswith("main()") and l.strip() != 'if __name__ == "__main__":'
)
exec(src_no_main, ns)
build = ns["build_fase1_analise"]

def main():
    fails = 0
    rule = {"ato": "Analisar pronúncia (RESE)", "prazo_dias": 5}
    p = build(rule, content_ok=True)
    if p.get("_status") != "pendente" or p.get("_fonte") != "fase1":
        print(f"FAIL status/fonte -> {p}"); fails += 1
    if "objeto" not in p:  # marcador do contrato SEMPRE presente
        print(f"FAIL sem chave objeto -> {p}"); fails += 1
    if p.get("providencia") != "Analisar pronúncia (RESE)":
        print(f"FAIL providencia -> {p}"); fails += 1
    p2 = build(rule, content_ok=False)
    if p2.get("_status") != "nao_lido":
        print(f"FAIL nao_lido -> {p2}"); fails += 1
    if "objeto" not in p2:
        print(f"FAIL nao_lido sem objeto -> {p2}"); fails += 1
    print("OK" if not fails else f"{fails} FALHAS")
    sys.exit(1 if fails else 0)

if __name__ == "__main__":
    main()
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `python3 .claude/skills-cowork/varredura-triagem/scripts/test_fase1_analise.py`
Expected: FAIL — `KeyError: 'build_fase1_analise'`.

- [ ] **Step 3: Implementar `build_fase1_analise`** — antes de `apply_classification`:

```python
def build_fase1_analise(rule: dict, content_ok: bool) -> dict:
    """Payload determinístico do registro de análise (contrato spec §A2.2).
    A chave 'objeto' é SEMPRE incluída — é o marcador que a query do card usa."""
    ato = rule.get("ato") or ""
    prazo = ""
    if rule.get("prazo_dias") is not None:
        prazo = (date.today() + timedelta(days=rule["prazo_dias"])).isoformat()
    return {
        "objeto": ato,                 # refinado pela fase 2
        "decidido": "",
        "providencia": ato,
        "prazo": prazo,
        "recurso": "",
        "_status": "pendente" if content_ok else "nao_lido",
        "_fonte": "fase1",
    }
```

- [ ] **Step 4: Implementar `upsert_analise_registro`** — na classe `Supabase`, após `insert_registro_returning`:

```python
    def upsert_analise_registro(self, demanda_id: int, base: dict, payload: dict) -> None:
        """Cria/atualiza o ÚNICO registro de análise (tipo='analise',
        titulo='Resumo e providências'). Select-then-update (sem ON CONFLICT).
        `base` = campos comuns (assistido_id, processo_id, demanda_id, autor_id)."""
        from urllib.parse import quote
        titulo = "Resumo e providências"
        rows = self._req(
            "GET",
            f"/rest/v1/registros?demanda_id=eq.{demanda_id}"
            f"&titulo=eq.{quote(titulo)}&tipo=eq.analise&select=id&limit=1",
        )
        conteudo = _analise_conteudo(payload)
        if isinstance(rows, list) and rows:
            self._req("PATCH", f"/rest/v1/registros?id=eq.{rows[0]['id']}",
                      {"conteudo": conteudo, "enrichment_data": payload},
                      prefer="return=minimal")
        else:
            self._req("POST", "/rest/v1/registros", {
                **base, "tipo": "analise", "titulo": titulo,
                "data_registro": datetime.now().isoformat(),
                "status": "realizado", "conteudo": conteudo,
                "enrichment_data": payload,
            }, prefer="return=minimal")
```

E o helper de texto (junto de `build_fase1_analise`):

```python
def _analise_conteudo(payload: dict) -> str:
    """Texto puro rotulado para a timeline, a partir do payload de contrato."""
    linhas = []
    if payload.get("objeto"): linhas.append(f"Objeto: {payload['objeto']}")
    if payload.get("decidido"): linhas.append(f"O que foi decidido: {payload['decidido']}")
    if payload.get("providencia"): linhas.append(f"Providência/Prazo: {payload['providencia']}")
    if payload.get("recurso"): linhas.append(f"Cabe recurso?: {payload['recurso']}")
    if payload.get("_status") == "nao_lido":
        linhas.append("(documento não lido — revisão manual)")
    elif payload.get("_status") == "pendente":
        linhas.append("(análise IA pendente)")
    return "\n".join(linhas) or "(análise pendente)"
```

- [ ] **Step 5: Chamar na `apply_classification`** — logo antes de `return not skip_ai` (~:1130), e usando o `skip_ai` já computado para `content_ok`:

```python
    # ── Registro de análise (contrato §A2.2) — card nunca em branco ────────────
    try:
        content_ok = bool((content or "").strip()) and not _ato_administrativo(rule)
        sb.upsert_analise_registro(demanda["id"], {
            "assistido_id": assistido_id,
            "processo_id": proc_id,
            "demanda_id": demanda["id"],
            "autor_id": DEFENSOR_ID,
        }, build_fase1_analise(rule, content_ok))
    except Exception as e:
        log(f"  ⚠ falha registro de análise (demanda={demanda['id']}): {e}")

    return not skip_ai
```

- [ ] **Step 6: Rodar o teste e ver passar**

Run: `python3 .claude/skills-cowork/varredura-triagem/scripts/test_fase1_analise.py`
Expected: PASS — `OK`.

- [ ] **Step 7: Commit**

```bash
git add .claude/skills-cowork/varredura-triagem/scripts/varredura_triagem.py \
        .claude/skills-cowork/varredura-triagem/scripts/test_fase1_analise.py
git commit -m "feat(varredura): registro de análise (contrato) escrito na fase 1 — card nunca em branco"
```

---

### Task 5: Extração de texto de PDF via OCR (matar o skip silencioso)

**Files:**
- Modify: `.claude/skills-cowork/varredura-triagem/scripts/varredura_triagem.py` (novo helper `extract_pdf_text`; uso no ponto onde `content`/`texto` é montado antes de `classify`, ~:1555-1566 — quando `content["best_len"]==0`, tentar o PDF baixado dos autos completos)
- Test: `.claude/skills-cowork/varredura-triagem/scripts/test_extract_pdf_text.py` (+ fixture `tests/fixtures/sample_text.pdf`)

**Interfaces:**
- Produces: `extract_pdf_text(pdf_path: str) -> str` (pdftotext; se vazio, OCR via `pdftoppm` + `tesseract -l por`). Retorna string possivelmente vazia; NUNCA lança (erros → `""`).

- [ ] **Step 1: Criar a fixture PDF** (PDF de texto simples, para o caminho `pdftotext`):

Run:
```bash
mkdir -p .claude/skills-cowork/varredura-triagem/scripts/tests/fixtures
printf 'DESIGNO audiencia de instrucao e julgamento para 10/09/2026' \
  | /opt/homebrew/bin/enscript -q -B -p - 2>/dev/null \
  | /opt/homebrew/bin/ps2pdf - .claude/skills-cowork/varredura-triagem/scripts/tests/fixtures/sample_text.pdf \
  || python3 -c "from pathlib import Path; import subprocess,sys; \
open('/tmp/s.txt','w').write('DESIGNO audiencia de instrucao e julgamento para 10/09/2026'); \
subprocess.run(['/opt/homebrew/bin/pandoc','/tmp/s.txt','-o','.claude/skills-cowork/varredura-triagem/scripts/tests/fixtures/sample_text.pdf'])"
ls -la .claude/skills-cowork/varredura-triagem/scripts/tests/fixtures/sample_text.pdf
```
Expected: arquivo `sample_text.pdf` existe. (Se nenhuma ferramenta gerar o PDF, criar manualmente qualquer PDF com esse texto e salvar no caminho.)

- [ ] **Step 2: Escrever o teste que falha** — `test_extract_pdf_text.py`:

```python
#!/usr/bin/env python3
"""extract_pdf_text: pdftotext + fallback OCR. Standalone."""
from __future__ import annotations
import sys
from pathlib import Path

SCRIPT = Path(__file__).parent / "varredura_triagem.py"
ns: dict = {"__file__": str(SCRIPT)}
src = SCRIPT.read_text()
src_no_main = "\n".join(
    l for l in src.splitlines()
    if not l.strip().startswith("main()") and l.strip() != 'if __name__ == "__main__":'
)
exec(src_no_main, ns)
extract = ns["extract_pdf_text"]

def main():
    fails = 0
    pdf = Path(__file__).parent / "tests" / "fixtures" / "sample_text.pdf"
    txt = extract(str(pdf))
    if "instrucao e julgamento" not in txt.lower():
        print(f"FAIL texto não extraído -> {txt!r}"); fails += 1
    # arquivo inexistente NUNCA lança, retorna ""
    if extract("/nao/existe.pdf") != "":
        print("FAIL: inexistente deveria retornar ''"); fails += 1
    print("OK" if not fails else f"{fails} FALHAS")
    sys.exit(1 if fails else 0)

if __name__ == "__main__":
    main()
```

- [ ] **Step 3: Rodar e ver falhar**

Run: `python3 .claude/skills-cowork/varredura-triagem/scripts/test_extract_pdf_text.py`
Expected: FAIL — `KeyError: 'extract_pdf_text'`.

- [ ] **Step 4: Implementar `extract_pdf_text`** — junto dos helpers de leitura (após `read_doc_content`):

```python
def extract_pdf_text(pdf_path: str) -> str:
    """Extrai texto de um PDF. Tenta pdftotext (rápido, PDFs nativos); se vier
    vazio (PDF digitalizado), faz OCR: pdftoppm → PNG(s) → tesseract -l por.
    NUNCA lança — qualquer erro/ausência de binário retorna ''."""
    import subprocess, tempfile, os
    def _run(cmd, **kw):
        try:
            return subprocess.run(cmd, capture_output=True, timeout=120, **kw)
        except Exception:
            return None
    if not pdf_path or not os.path.exists(pdf_path):
        return ""
    r = _run(["pdftotext", "-layout", pdf_path, "-"])
    if r and r.returncode == 0:
        txt = (r.stdout or b"").decode("utf-8", "ignore").strip()
        if len(txt) >= 20:
            return txt
    # OCR fallback
    with tempfile.TemporaryDirectory() as td:
        base = os.path.join(td, "pg")
        if not _run(["pdftoppm", "-r", "200", "-png", pdf_path, base]):
            return ""
        out = []
        for png in sorted(Path(td).glob("pg*.png")):
            o = _run(["tesseract", str(png), "-", "-l", "por"])
            if o and o.returncode == 0:
                out.append((o.stdout or b"").decode("utf-8", "ignore"))
        return "\n".join(out).strip()
```

- [ ] **Step 5: Rodar o teste e ver passar**

Run: `python3 .claude/skills-cowork/varredura-triagem/scripts/test_extract_pdf_text.py`
Expected: PASS — `OK`.

- [ ] **Step 6: Ligar no fluxo de leitura** — em `varredura()`, onde `texto` é montado antes de `classify` (~:1555-1566). Localizar a linha que define `texto` a partir de `content` e inserir ANTES do `classify`:

```python
                # PDF-fallback: se a leitura por frame veio vazia (doc só-PDF),
                # baixa o PDF de DENTRO dos autos completos (não efetiva ciência)
                # e extrai por pdftotext/OCR. baixar_pdf_autos usa a mesma trava
                # anti-ciência de read_doc_content (só listProcessoCompletoAdvogado.seam).
                if not (texto or "").strip():
                    try:
                        pdf_path = await baixar_pdf_autos(ctx, d.get("autos_url") or "")
                        if pdf_path:
                            ocr = extract_pdf_text(pdf_path)
                            if ocr:
                                texto = ocr
                                log(f"  ⤷ texto via PDF/OCR ({len(ocr)}b)")
                    except Exception as e:
                        log(f"  ⚠ falha PDF/OCR: {str(e)[:120]}")
```

E adicionar o downloader browser `baixar_pdf_autos` (após `read_doc_content`), reusando a trava anti-ciência:

```python
async def baixar_pdf_autos(ctx: BrowserContext, autos_url: str) -> str | None:
    """Baixa o PDF do documento a partir da visão de AUTOS COMPLETOS
    (listProcessoCompletoAdvogado.seam). NUNCA usa visualizarExpediente.seam /
    TOMAR CIÊNCIA. Retorna caminho do PDF salvo em /tmp ou None."""
    full = f"https://pje.tjba.jus.br{autos_url}" if autos_url.startswith("/") else autos_url
    low = (full or "").lower()
    if "visualizarexpediente.seam" in low or "tomarciencia" in low \
       or "listprocessocompletoadvogado.seam" not in low:
        log("  ⚠ PDF: link não é o de autos completos — recusado (anti-ciência)")
        return None
    page = await ctx.new_page()
    try:
        async with page.expect_download(timeout=60000) as dl_info:
            await page.goto(full, wait_until="domcontentloaded", timeout=60000)
        dl = await dl_info.value
        import tempfile, os
        dest = os.path.join(tempfile.gettempdir(), f"autos_{abs(hash(full)) % 10**8}.pdf")
        await dl.save_as(dest)
        return dest
    except Exception as e:
        log(f"  ⚠ PDF download falhou: {str(e)[:120]}")
        return None
    finally:
        await page.close()
```

> Nota de implementação: confirmar o nome real do campo do link nos autos no dict `d`/`content` (candidatos: `autos_url`, `content['autos_url']`). Ajustar `d.get("autos_url")` para a fonte correta observada em `read_doc_content`/`varredura` sem violar a trava anti-ciência. Se os autos não dispararem `download` e sim abrirem um viewer, trocar `expect_download` por captura do PDF via request do iframe — mantendo a URL `listProcessoCompletoAdvogado.seam`.

- [ ] **Step 7: Verificação de fumaça (sem browser)** — garante que a suíte Python inteira ainda importa e passa:

Run: `for t in test_fase_motivo_routing test_classify_mpu test_classify_juri test_classify_ep_criminal test_fase1_analise test_extract_pdf_text test_movimento_audiencia; do python3 .claude/skills-cowork/varredura-triagem/scripts/$t.py || exit 1; done; echo ALL-OK`
Expected: `ALL-OK`.

- [ ] **Step 8: Commit**

```bash
git add .claude/skills-cowork/varredura-triagem/scripts/varredura_triagem.py \
        .claude/skills-cowork/varredura-triagem/scripts/test_extract_pdf_text.py \
        .claude/skills-cowork/varredura-triagem/scripts/tests/fixtures/sample_text.pdf
git commit -m "feat(varredura): extrai texto de PDF (pdftotext+OCR) via autos completos — sem skip silencioso"
```

---

### Task 6: Fase 2 — JSON estruturado no `enrichment_data` + select-then-update

**Files:**
- Modify: `.claude/skills-cowork/analise-intimacao/scripts/write_analise.py` (novo helper `build_fase2_enrichment`; novo `get_registro_id`; substituir o bloco :194-206 por select-then-update)
- Test: `.claude/skills-cowork/analise-intimacao/scripts/test_build_fase2_enrichment.py`

**Interfaces:**
- Consumes: dict `r` da IA com `resumo_objeto, o_que_decidido, o_que_fazer, cabe_recurso, recurso_cabivel, fundamento_recurso`.
- Produces: `build_fase2_enrichment(r: dict) -> dict` → `{objeto, decidido, providencia, prazo, recurso, _status:"concluido", _fonte:"fase2"}` (chave `objeto` SEMPRE presente).

- [ ] **Step 1: Escrever o teste que falha** — `test_build_fase2_enrichment.py`:

```python
#!/usr/bin/env python3
"""build_fase2_enrichment: contrato JSON da fase 2. Standalone."""
from __future__ import annotations
import sys
from pathlib import Path

SCRIPT = Path(__file__).parent / "write_analise.py"
ns: dict = {"__file__": str(SCRIPT)}
src = SCRIPT.read_text()
src_no_main = "\n".join(
    l for l in src.splitlines()
    if not l.strip().startswith("main()") and l.strip() != 'if __name__ == "__main__":'
)
exec(src_no_main, ns)
build = ns["build_fase2_enrichment"]

def main():
    fails = 0
    r = {"resumo_objeto": "Pronúncia do réu", "o_que_decidido": "Pronunciado art. 413",
         "o_que_fazer": "Analisar RESE em 5 dias", "cabe_recurso": "sim",
         "recurso_cabivel": "RESE", "fundamento_recurso": "art. 581 IV"}
    p = build(r)
    assert_pairs = [
        (p.get("objeto"), "Pronúncia do réu"),
        (p.get("decidido"), "Pronunciado art. 413"),
        (p.get("providencia"), "Analisar RESE em 5 dias"),
        (p.get("_status"), "concluido"),
        (p.get("_fonte"), "fase2"),
    ]
    for got, exp in assert_pairs:
        if got != exp:
            print(f"FAIL {got!r} != {exp!r}"); fails += 1
    if "objeto" not in p:
        print("FAIL: chave objeto ausente"); fails += 1
    if "rese" not in (p.get("recurso") or "").lower():
        print(f"FAIL recurso -> {p.get('recurso')!r}"); fails += 1
    print("OK" if not fails else f"{fails} FALHAS")
    sys.exit(1 if fails else 0)

if __name__ == "__main__":
    main()
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `python3 .claude/skills-cowork/analise-intimacao/scripts/test_build_fase2_enrichment.py`
Expected: FAIL — `KeyError: 'build_fase2_enrichment'`.

- [ ] **Step 3: Implementar `build_fase2_enrichment`** — em `write_analise.py`, após `_strip_label` (~:130):

```python
def build_fase2_enrichment(r: dict) -> dict:
    """Contrato JSON (spec §A2.2) da fase 2, a partir do payload da IA.
    'objeto' SEMPRE presente (marcador da query do card)."""
    cr = (r.get("cabe_recurso") or "").lower()
    recurso = ""
    if cr in ("sim", "talvez"):
        rec = r.get("recurso_cabivel") or "recurso"
        fund = f" — {r['fundamento_recurso'].strip()}" if r.get("fundamento_recurso") else ""
        recurso = f"{cr} · {rec}{fund}"
    elif cr == "nao":
        recurso = "não"
    return {
        "objeto": _strip_label(r.get("resumo_objeto") or "", "objeto"),
        "decidido": _strip_label(r.get("o_que_decidido") or "", "o que foi decidido"),
        "providencia": _strip_label(r.get("o_que_fazer") or "", "providência/prazo",
                                    "providencia/prazo", "providência", "providencia"),
        "prazo": "",
        "recurso": recurso,
        "_status": "concluido",
        "_fonte": "fase2",
    }
```

- [ ] **Step 4: Adicionar `get_registro_id`** — junto de `registro_exists` (~:84):

```python
def get_registro_id(demanda_id, titulo):
    """id do registro de análise com este título (ou None)."""
    from urllib.parse import quote
    rows = req("GET", f"/rest/v1/registros?demanda_id=eq.{demanda_id}"
                      f"&titulo=eq.{quote(titulo)}&tipo=eq.analise&select=id&limit=1")
    return rows[0]["id"] if isinstance(rows, list) and rows else None
```

- [ ] **Step 5: Substituir o bloco de gravação :194-206 por select-then-update**:

```python
        titulo = "Resumo e providências"
        if corpo:
            enr = build_fase2_enrichment(r)
            rid = get_registro_id(demanda_id, titulo)
            if rid:  # registro da fase 1 (ou re-run) → ATUALIZA in-place
                req("PATCH", f"/rest/v1/registros?id=eq.{rid}",
                    {"conteudo": "\n".join(corpo), "enrichment_data": enr},
                    prefer="return=minimal")
            else:
                insert_registro({**base, "tipo": "analise", "titulo": titulo,
                                 "conteudo": "\n".join(corpo), "enrichment_data": enr})
            n_anota += 1
            if ato_ajuste:
                try:
                    update_demanda_ato(demanda_id, ato_ajuste[1])
                    n_ato += 1
                except Exception as e:
                    print(f"  ⚠ falha ao ajustar ato demanda {demanda_id}: {e}", file=sys.stderr)
```

> Os outros dois registros (`"Relato da suposta vítima"`, `"Termos da pronúncia"`) permanecem com `insert-if-not-exists` como hoje (:207-219) e NÃO recebem a chave `objeto`.

- [ ] **Step 6: Rodar o teste e ver passar**

Run: `python3 .claude/skills-cowork/analise-intimacao/scripts/test_build_fase2_enrichment.py`
Expected: PASS — `OK`.

- [ ] **Step 7: Commit**

```bash
git add .claude/skills-cowork/analise-intimacao/scripts/write_analise.py \
        .claude/skills-cowork/analise-intimacao/scripts/test_build_fase2_enrichment.py
git commit -m "feat(analise-intimacao): JSON de contrato no enrichment_data + update-in-place do registro de análise"
```

---

### Task 7: Query do card — discriminador `objeto` + `analiseData`

**Files:**
- Create: `src/lib/trpc/routers/_analise-resumo-sql.ts` (builder isolado do fragmento SQL, testável)
- Modify: `src/lib/trpc/routers/demandas.ts` (:151-155 — usar o builder; adicionar `analiseData`)
- Test: `src/lib/trpc/routers/_analise-resumo-sql.test.ts`

**Interfaces:**
- Produces: `analiseResumoSql(registros, demandas)` e `analiseDataSql(registros, demandas)` (retornam `SQL` do Drizzle). Usam `jsonb_exists(enrichment_data,'objeto')` com fallback ao título exato.

- [ ] **Step 1: Escrever o teste que falha** — `_analise-resumo-sql.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { registros, demandas } from "@/lib/db/schema";
import { analiseResumoSql, analiseDataSql } from "./_analise-resumo-sql";

// Serializa o SQL do Drizzle p/ inspecionar o fragmento gerado.
function sqlText(fragment: any): string {
  return JSON.stringify(fragment);
}

describe("analise resumo sql", () => {
  it("usa jsonb_exists('objeto') como discriminador", () => {
    const s = sqlText(analiseResumoSql(registros, demandas));
    expect(s).toContain("jsonb_exists");
    expect(s).toContain("objeto");
  });
  it("mantém fallback pelo título exato", () => {
    const s = sqlText(analiseResumoSql(registros, demandas));
    expect(s).toContain("Resumo e providências");
  });
  it("analiseData retorna o enrichment_data do registro discriminado", () => {
    const s = sqlText(analiseDataSql(registros, demandas));
    expect(s).toContain("enrichment_data");
    expect(s).toContain("jsonb_exists");
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npm test -- src/lib/trpc/routers/_analise-resumo-sql.test.ts`
Expected: FAIL — módulo `_analise-resumo-sql` não existe.

- [ ] **Step 3: Criar o builder** — `src/lib/trpc/routers/_analise-resumo-sql.ts`:

```ts
import { sql, type SQL } from "drizzle-orm";

/**
 * Prévia (450 chars) do resumo de análise para o card. Discrimina pelo marcador
 * do contrato `enrichment_data ? 'objeto'` (evita pegar "Termos da pronúncia" /
 * anotação manual). Fallback: título exato "Resumo e providências" (registros
 * antigos). Ver spec §A2.2/§A4.
 */
export function analiseResumoSql(registros: any, demandas: any): SQL<string | null> {
  return sql<string | null>`COALESCE(
    (SELECT left(${registros.conteudo}, 450) FROM ${registros}
       WHERE ${registros.demandaId} = ${demandas.id}
         AND ${registros.tipo} = 'analise'
         AND jsonb_exists(${registros.enrichmentData}, 'objeto')
       ORDER BY ${registros.id} DESC LIMIT 1),
    (SELECT left(${registros.conteudo}, 450) FROM ${registros}
       WHERE ${registros.demandaId} = ${demandas.id}
         AND ${registros.titulo} = ${'Resumo e providências'}
       ORDER BY ${registros.id} DESC LIMIT 1)
  )`;
}

/** enrichment_data (JSON de contrato) do registro discriminado, p/ campos rotulados. */
export function analiseDataSql(registros: any, demandas: any): SQL<unknown> {
  return sql`(SELECT ${registros.enrichmentData} FROM ${registros}
       WHERE ${registros.demandaId} = ${demandas.id}
         AND ${registros.tipo} = 'analise'
         AND jsonb_exists(${registros.enrichmentData}, 'objeto')
       ORDER BY ${registros.id} DESC LIMIT 1)`;
}
```

- [ ] **Step 4: Usar no `demandas.ts`** — importar no topo e substituir a linha :155 e acrescentar `analiseData` após ela:

```ts
// topo do arquivo, junto aos imports de routers
import { analiseResumoSql, analiseDataSql } from "./_analise-resumo-sql";

// dentro do objeto select (:153-155):
          analiseResumo: analiseResumoSql(registros, demandas),
          analiseData: analiseDataSql(registros, demandas),
```

- [ ] **Step 5: Rodar o teste e ver passar**

Run: `npm test -- src/lib/trpc/routers/_analise-resumo-sql.test.ts`
Expected: PASS.

- [ ] **Step 6: Typecheck**

Run: `npm run build 2>&1 | tail -20` (ou `npx tsc --noEmit` se disponível)
Expected: sem erros de tipo em `demandas.ts` / `_analise-resumo-sql.ts`.

- [ ] **Step 7: Commit**

```bash
git add src/lib/trpc/routers/_analise-resumo-sql.ts \
        src/lib/trpc/routers/_analise-resumo-sql.test.ts \
        src/lib/trpc/routers/demandas.ts
git commit -m "feat(demandas): query do resumo com discriminador jsonb objeto + analiseData"
```

---

### Task 8: Renderização — campos rotulados + badges (kanban card e tela de detalhe)

**Files:**
- Create: `src/components/demandas-premium/AnaliseResumo.tsx` (componentes de apresentação isolados)
- Modify: `src/components/demandas-premium/kanban-premium.tsx` (:507, :984 — trocar o render cru de `analiseResumo` pelos componentes, passando `analiseData`)
- Modify: `src/app/(dashboard)/admin/demandas/[id]/page.tsx` (integrar campos rotulados na seção IA `IA_TITULOS`/filtro :40/:147/:157)
- Test: `src/components/demandas-premium/AnaliseResumo.test.tsx`

**Interfaces:**
- Consumes: `analiseData` (JSON `{objeto,decidido,providencia,prazo,recurso,_status,_fonte}` | null) e `analiseResumo` (string | null) da query (Task 7).
- Produces: `<AnaliseStatusBadge status={...}/>` e `<AnaliseResumoFields data={...} resumo={...} expanded?/>`.

- [ ] **Step 1: Escrever o teste que falha** — `AnaliseResumo.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { AnaliseStatusBadge, AnaliseResumoFields } from "./AnaliseResumo";

describe("AnaliseResumo", () => {
  it("badge 'IA pendente' quando _status=pendente", () => {
    render(<AnaliseStatusBadge status="pendente" />);
    expect(screen.getByText(/pendente/i)).toBeInTheDocument();
  });
  it("badge 'documento não lido' quando _status=nao_lido", () => {
    render(<AnaliseStatusBadge status="nao_lido" />);
    expect(screen.getByText(/não lido/i)).toBeInTheDocument();
  });
  it("sem badge quando concluido", () => {
    const { container } = render(<AnaliseStatusBadge status="concluido" />);
    expect(container).toBeEmptyDOMElement();
  });
  it("renderiza campos rotulados a partir do JSON", () => {
    render(<AnaliseResumoFields expanded data={{ objeto: "Pronúncia", decidido: "Pronunciado",
      providencia: "Analisar RESE", prazo: "", recurso: "sim · RESE", _status: "concluido", _fonte: "fase2" }} resumo={null} />);
    expect(screen.getByText("Pronúncia")).toBeInTheDocument();
    expect(screen.getByText(/Analisar RESE/)).toBeInTheDocument();
    expect(screen.getByText(/Cabe recurso/i)).toBeInTheDocument();
  });
  it("degrada para o texto resumo quando não há JSON", () => {
    render(<AnaliseResumoFields data={null} resumo={"Objeto: algo\nProvidência/Prazo: fazer"} />);
    expect(screen.getByText(/Objeto: algo/)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npm test -- src/components/demandas-premium/AnaliseResumo.test.tsx`
Expected: FAIL — módulo não existe.

- [ ] **Step 3: Implementar os componentes** — `src/components/demandas-premium/AnaliseResumo.tsx`:

```tsx
"use client";

export type AnaliseStatus = "pendente" | "concluido" | "nao_lido";
export interface AnaliseData {
  objeto?: string; decidido?: string; providencia?: string;
  prazo?: string; recurso?: string; _status?: AnaliseStatus; _fonte?: string;
}

export function AnaliseStatusBadge({ status }: { status?: AnaliseStatus }) {
  if (status === "pendente")
    return <span className="text-[10px] rounded px-1.5 py-0.5 bg-amber-100 text-amber-700">análise IA pendente</span>;
  if (status === "nao_lido")
    return <span className="text-[10px] rounded px-1.5 py-0.5 bg-rose-100 text-rose-700">documento não lido — revisão manual</span>;
  return null;
}

function Field({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <p className="text-xs leading-snug"><span className="font-medium text-zinc-500">{label}: </span>{value}</p>
  );
}

/** Campos rotulados a partir do JSON de contrato; degrada para `resumo` (texto). */
export function AnaliseResumoFields(
  { data, resumo, expanded = false }: { data: AnaliseData | null; resumo: string | null; expanded?: boolean },
) {
  if (!data) {
    return resumo ? <p className="text-xs whitespace-pre-line text-zinc-600">{resumo}</p> : null;
  }
  const oneLiner = [data.objeto, data.providencia].filter(Boolean).join(" → ")
    + (data.prazo ? ` · ${data.prazo}` : "");
  if (!expanded) {
    return (
      <div className="flex items-center gap-1.5">
        <AnaliseStatusBadge status={data._status} />
        <p className="text-xs truncate text-zinc-600">{oneLiner}</p>
      </div>
    );
  }
  return (
    <div className="space-y-0.5">
      <AnaliseStatusBadge status={data._status} />
      <Field label="Objeto" value={data.objeto} />
      <Field label="O que foi decidido" value={data.decidido} />
      <Field label="Providência" value={data.providencia} />
      <Field label="Prazo" value={data.prazo} />
      <Field label="Cabe recurso?" value={data.recurso} />
    </div>
  );
}
```

- [ ] **Step 4: Rodar o teste e ver passar**

Run: `npm test -- src/components/demandas-premium/AnaliseResumo.test.tsx`
Expected: PASS.

- [ ] **Step 5: Integrar no kanban** — em `kanban-premium.tsx`, nos pontos :507 e :984 onde `analiseResumo` é exibido, substituir o texto cru por:

```tsx
<AnaliseResumoFields data={(demanda as any).analiseData ?? null} resumo={demanda.analiseResumo ?? null} />
```

E importar no topo: `import { AnaliseResumoFields } from "./AnaliseResumo";`

- [ ] **Step 6: Integrar na tela de detalhe** — em `src/app/(dashboard)/admin/demandas/[id]/page.tsx`, na seção que itera registros filtrando `r.tipo === 'analise' || IA_TITULOS.has(titulo)` (:147/:157): quando o registro tiver `enrichment_data?.objeto`, renderizar `<AnaliseResumoFields expanded data={r.enrichmentData} resumo={r.conteudo} />`; senão manter o render atual do `conteudo`. Importar `AnaliseResumoFields` de `@/components/demandas-premium/AnaliseResumo`.

- [ ] **Step 7: Typecheck + suíte TS**

Run: `npm test -- src/components/demandas-premium/AnaliseResumo.test.tsx && npm run build 2>&1 | tail -20`
Expected: testes PASS; build sem erros de tipo nas telas alteradas.

- [ ] **Step 8: Commit**

```bash
git add src/components/demandas-premium/AnaliseResumo.tsx \
        src/components/demandas-premium/AnaliseResumo.test.tsx \
        src/components/demandas-premium/kanban-premium.tsx \
        "src/app/(dashboard)/admin/demandas/[id]/page.tsx"
git commit -m "feat(demandas-ui): campos rotulados (Objeto/Decidido/Providência/Prazo/Recurso) + badges IA no card e detalhe"
```

---

### Task 9: Alinhar doc de heurísticas, sincronizar espelhos e memória

**Files:**
- Modify: `.claude/skills-cowork/varredura-triagem/references/heuristicas-classificacao.md` (adicionar blocos Júri/EP/Criminal implementados + vocabulário §A1.1)
- Modify: `.claude/skills-cowork/varredura-triagem/SKILL.md` (nota sobre PDF/OCR e contrato de análise)
- Modify: `src/lib/db/schema/core.ts` (adicionar chave `motivo` ao tipo do `enrichment_data`, junto de `fase_processual`)

**Interfaces:** documentação/tipagem; sem novos símbolos executáveis.

- [ ] **Step 1: Adicionar a chave `motivo` ao tipo** — em `core.ts`, no objeto de tipo do `enrichmentData` (onde já há `fase_processual`), acrescentar:

```ts
    motivo?: string;
```

- [ ] **Step 2: Typecheck**

Run: `npm run build 2>&1 | tail -20`
Expected: sem novos erros.

- [ ] **Step 3: Atualizar `heuristicas-classificacao.md`** — substituir o bloco Júri "documentado, não implementado" por uma tabela do que agora está no código (ver `RULES_JURI`), e adicionar as tabelas EP e Criminal com os pares `ato → fase/motivo` do vocabulário §A1.1. Adicionar seção "Leitura PDF/OCR" descrevendo `extract_pdf_text` + a trava anti-ciência (só autos completos).

- [ ] **Step 4: Sincronizar cópias-espelho das skills** — seguir a skill `evolucao-skills` para propagar `varredura_triagem.py`, `write_analise.py`, os testes novos e os `references` para as cópias canônicas locais (harmonização). Rodar a suíte Python inteira no destino sincronizado:

Run: `for t in test_fase_motivo_routing test_classify_mpu test_classify_juri test_classify_ep_criminal test_fase1_analise test_extract_pdf_text; do python3 .claude/skills-cowork/varredura-triagem/scripts/$t.py || exit 1; done; echo ALL-OK`
Expected: `ALL-OK`.

- [ ] **Step 5: Atualizar a memória** — anexar/atualizar a nota do pipeline (`memory/gotcha_leitura_profunda_so_triagem.md` ou nota nova de projeto) registrando: RULES_JURI/EP/Criminal, contrato do registro de análise, PDF/OCR anti-ciência, discriminador `jsonb objeto`. Atualizar `memory/MEMORY.md` com o ponteiro (uma linha). Converter datas relativas em absolutas.

- [ ] **Step 6: Commit**

```bash
git add .claude/skills-cowork/varredura-triagem/references/heuristicas-classificacao.md \
        .claude/skills-cowork/varredura-triagem/SKILL.md \
        src/lib/db/schema/core.ts
git commit -m "docs+schema: alinha heurísticas Júri/EP/Criminal, PDF/OCR e tipa enrichment_data.motivo"
```

---

## Self-Review

**Spec coverage:**
- A1 (rule sets) → Tasks 2, 3. A1.1 (vocabulário) → Tasks 2, 3 (valores nos testes) + Task 9 (doc).
- A2 (PDF/OCR anti-ciência) → Task 5. A2.1 (vocabulário) → Tasks 2/3. A2.2 (contrato) → Tasks 4 (fase 1) + 6 (fase 2).
- A3 (card nunca em branco) → Task 4 (`_status` pendente/nao_lido) + Task 8 (badges).
- A4 (exibição estruturada + query) → Task 7 (query/discriminador/analiseData) + Task 8 (render).
- A5 (testes/segurança) → suítes por task; try/except em Tasks 1/4/5.
- §5 (fase/motivo → enrichment_data, gate VVD, chave `motivo` no tipo) → Task 1 + Task 9 Step 1.

**Placeholder scan:** nenhum "TBD/etc." — a única incerteza declarada é o nome do campo do link dos autos no Task 5 Step 6 (marcado como nota de verificação, com fallback), inerente ao browser lane.

**Type/nome consistency:** `build_fase1_analise`/`build_fase2_enrichment` produzem o mesmo shape do contrato (`objeto/decidido/providencia/prazo/recurso/_status/_fonte`); `upsert_analise_registro` (fase 1) e o PATCH da fase 2 escrevem no mesmo par (`tipo='analise'`, `titulo='Resumo e providências'`); a query (`analiseResumoSql`/`analiseDataSql`) discrimina exatamente por `jsonb_exists(...,'objeto')`, chave garantida por ambos os builders; `AnaliseData` (TS) espelha o shape do payload Python.
