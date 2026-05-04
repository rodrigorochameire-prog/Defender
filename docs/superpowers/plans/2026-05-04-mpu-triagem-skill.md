# MPU — Plano 2: Triagem Defensiva (skill `varredura-triagem`) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Estender a skill `varredura-triagem` para classificar intimações de MPU sob a ótica defensiva do requerido (assistido), preencher os campos `fase_procedimento` e `motivo_ultima_intimacao` criados no Plano 1, e disponibilizar 10 heurísticas defensivas reutilizáveis. Pré-requisito do Plano 3 (import das 31 MPU pendentes).

**Architecture:** O script Python `scripts/varredura_triagem.py` ganha (1) helper `_is_mpu()` espelhando `src/lib/mpu.ts`; (2) função `_decide_by_titulo_mpu()` com lógica defensiva; (3) array `RULES_MPU` com os 10 padrões; (4) flag `is_mpu` em `classify()` que prioriza MPU rules antes das base rules; (5) `apply_classification()` estendido para escrever `fase_procedimento` e `motivo_ultima_intimacao` quando o rule trouxer esses campos. Skill canônica (Drive) é editada primeiro, depois sincronizada para `.claude/skills/` e `.claude/skills-cowork/` (regra `evolucao-skills`).

**Tech Stack:** Python 3 (sem framework de teste — usa script standalone que retorna exit 0/1, padrão atual da skill). Drizzle/Supabase para a parte do banco. Constantes shared via convenção (Python duplica strings de `src/lib/mpu-constants.ts` com comment de sync).

**Spec referenciado:** `docs/superpowers/specs/2026-05-04-mpu-reform-design.md` — seções 6 e 7. Plano 1 já entregou: helper `isMpu`, colunas em `processos_vvd`, atos defensivos em `ATO_PRIORITY`, constantes em `src/lib/mpu-constants.ts`.

---

## File Structure

| Tipo | Arquivo | Responsabilidade |
|---|---|---|
| Create | `Skills - harmonizacao/varredura-triagem/references/heuristicas-mpu.md` | Tabela canônica das 10 heurísticas MPU + exemplos de texto que casam |
| Create | `Skills - harmonizacao/varredura-triagem/scripts/test_classify_mpu.py` | Suíte standalone com 12+ casos sintéticos cobrindo cada heurística |
| Modify | `Skills - harmonizacao/varredura-triagem/scripts/varredura_triagem.py` | `_is_mpu()`, `_decide_by_titulo_mpu()`, `RULES_MPU`, `classify(is_mpu=)`, `apply_classification` estendido, `list_demandas` expandido |
| Modify | `Skills - harmonizacao/varredura-triagem/SKILL.md` | Nova seção "Triagem MPU (defesa do requerido)", "Bugs e contornos: sigilo polo passivo VVD", referência aos campos `fase_procedimento`/`motivo_ultima_intimacao` |
| Sync | `.claude/skills/varredura-triagem/**` | Cópia operacional sincronizada com canônica |
| Sync | `.claude/skills-cowork/varredura-triagem/**` | Cópia legado sincronizada com canônica |

**Caminho canônico (Drive):**
```
/Users/rodrigorochameire/Library/CloudStorage/GoogleDrive-rodrigorochameire@gmail.com/Meu Drive/1 - Defensoria 9ª DP/Skills - harmonizacao/varredura-triagem/
```

Daqui em diante o plano usa `<CANON>` como placeholder para esse caminho. Substituir nas tasks.

**Princípio (`evolucao-skills`):** TODA edição vai para `<CANON>` PRIMEIRO. Sync local é cópia.

---

## Task 1: Doc canônica das heurísticas MPU

**Files:**
- Create: `<CANON>/references/heuristicas-mpu.md`

- [ ] **Step 1: Criar o arquivo**

Criar `<CANON>/references/heuristicas-mpu.md` (substitua `<CANON>` pelo caminho real):

````markdown
# Heurísticas MPU — Triagem Defensiva (defesa do requerido)

> Premissa: o assistido é o REQUERIDO (a pessoa demandada a cumprir a MPU).
> Toda classificação opera sob essa ótica. Caso atípico (defesa da requerente)
> exige flag explícita — esta tabela não cobre.

Ordem importa: a primeira regra que casa vence. Regras mais específicas
ficam em cima. Padrões usam `re.IGNORECASE` e operam em texto **normalizado**
(sem acento, lowercase) — ver `normalize()` no script.

## Tabela canônica

| Pattern (texto normalizado) | Ato | Prioridade | Prazo (dias) | Registro | Fase | Motivo |
|---|---|---|---|---|---|---|
| `designada.{0,40}audiencia.{0,20}(justifica|aij)` | Defesa em audiência de justificação | URGENTE | 5 | diligencia | audiencia_designada | ciencia_audiencia |
| `(deferi|defiro).{0,40}medidas? protetiva` (em "Decisão") | Analisar viabilidade de agravo | NORMAL | 15 | diligencia | decisao_liminar | ciencia_decisao_mpu |
| `(prorrog|renov|manten|continui).{0,30}(medida|mpu|protetiva)` | Manifestar contra prorrogação de MPU | URGENTE | 5 | diligencia | manifestacao_pendente | manifestar_renovacao |
| `(pedido|requeri).{0,30}revogac` (pela requerente / MP) | Acompanhar pedido de revogação | BAIXA | — | anotacao | manifestacao_pendente | manifestar_revogacao |
| `(notic|comunic).{0,30}descumpriment` (Lei 11.340 art. 24-A) | Defesa criminal — descumprimento art. 24-A | URGENTE | 5 | diligencia | descumprimento_apurado | manifestar_descumprimento |
| `laudo.{0,20}psicossoci|estudo psicossoci` | Manifestar sobre laudo psicossocial | NORMAL | 10 | diligencia | manifestacao_pendente | manifestar_laudo |
| `(modul|redu).{0,40}(raio|distancia|medida)` | Manifestar sobre modulação de MPU | NORMAL | 10 | diligencia | manifestacao_pendente | manifestar_modulacao |
| `tornozeleira|monitoramento eletronico` | Contestar imposição de tornozeleira | URGENTE | 5 | diligencia | manifestacao_pendente | manifestar_modulacao |
| Vencimento próximo (proativo, sem texto — campo `data_vencimento_mpu`) | Pleitear não-renovação de MPU | BAIXA | até venc. | diligencia | expirada | intimacao_generica |
| TOMAR CIÊNCIA genérico (fallback) | Ciência | BAIXA | — | ciencia | manifestacao_pendente | intimacao_generica |

Os valores de **Fase** correspondem a `FASE_PROCEDIMENTO` em `src/lib/mpu-constants.ts`.
Os valores de **Motivo** correspondem a `MOTIVO_INTIMACAO` no mesmo arquivo.

## Exemplos reais de texto que dispara cada regra

### Defesa em audiência de justificação
> "...DESIGNO audiência de justificação para o dia 12/05/2026 às 14h, no
> Fórum desta Comarca, intimando-se as partes..."

### Analisar viabilidade de agravo (MPU deferida)
> "...DEFIRO as medidas protetivas requeridas, determinando ao requerido:
> (a) afastamento do lar; (b) proibição de aproximação..."

### Manifestar contra prorrogação
> "...intime-se o requerido para, no prazo de 5 dias, manifestar-se sobre
> o pedido de prorrogação das medidas protetivas formulado pela
> requerente..."

### Acompanhar pedido de revogação
> "...a requerente compareceu em juízo manifestando interesse na revogação
> das medidas protetivas, alegando reconciliação..."

### Defesa criminal — descumprimento art. 24-A
> "...notícia de descumprimento das medidas protetivas pelo requerido,
> conforme registro policial em apenso. Encaminhe-se ao MP para
> oferecimento de denúncia (art. 24-A da Lei 11.340/2006)..."

### Manifestar sobre laudo psicossocial
> "...juntado aos autos o laudo psicossocial elaborado pelo CRAM, abra-se
> vista ao requerido pelo prazo de 10 dias..."

### Manifestar sobre modulação
> "...requereu o requerido a modulação da medida protetiva, reduzindo o
> raio de afastamento de 200m para 100m..."

### Contestar imposição de tornozeleira
> "...em razão do reiterado descumprimento, decreto a aplicação de
> monitoramento eletrônico (tornozeleira) ao requerido..."

## Bugs conhecidos / casos limite

- **"medida protetiva" pode aparecer em decisão de processo que NÃO é MPU**
  (ex.: criminal comum citando uma MPU como antecedente). Por isso a
  detecção `is_mpu` precisa ser feita ANTES de aplicar `RULES_MPU` —
  baseada em `processos_vvd.tipo_processo`, `mpu_ativa` ou prefixo
  `MPUMP*` no número (ver `src/lib/mpu.ts`).

- **"audiência de justificação"** existe em outros contextos (execução penal).
  Por isso a regra MPU vem só quando `is_mpu=True`. Em RULES_BASE existe
  uma regra similar mas com ato genérico "Ciência designação de audiência".

- **Sigilo polo passivo VVD**: para ler partes/decisão de processos MPU é
  necessário usar o popup "Peticionar" → token `ca` → `listProcessoCompleto.seam`
  (ver `reference_pje_polo_passivo_scraping.md` na memória).
````

- [ ] **Step 2: Verificar contagem de regras**

Run:
```bash
grep -c "^|" "<CANON>/references/heuristicas-mpu.md"
```

Expected: `12` (1 cabeçalho + 1 separador + 10 linhas de regras).

- [ ] **Step 3: Não commitar ainda — segue para Task 2**

A canônica fica fora de git. Será sincronizada para o repo na Task 7.

---

## Task 2: Suite de testes synthetics (TDD red phase)

**Files:**
- Create: `<CANON>/scripts/test_classify_mpu.py`

Padrão de teste do projeto Python: script standalone que retorna exit 0 (todos passaram) ou exit 1 (algum falhou). Sem pytest.

- [ ] **Step 1: Criar o arquivo de teste**

Criar `<CANON>/scripts/test_classify_mpu.py`:

```python
#!/usr/bin/env python3
"""Suite de testes synthetics para classify(is_mpu=True).

Não usa framework — roda standalone:
    python3 test_classify_mpu.py
Sai com código 0 se todos passam, 1 se algum falha.

Cada caso é (id_curto, titulo, texto, ato_esperado, prioridade_esperada,
fase_esperada, motivo_esperado). Texto pode ser snippet curto realista.
"""
from __future__ import annotations
import sys
from pathlib import Path

# Importar módulo do script principal sem rodar main()
SCRIPT = Path(__file__).parent / "varredura_triagem.py"
ns: dict = {}
src = SCRIPT.read_text()
# Remover a chamada main() final para poder importar
src_no_main = "\n".join(
    l for l in src.splitlines()
    if not l.strip().startswith("main()")
       and not l.strip() == "if __name__ == \"__main__\":"
)
exec(src_no_main, ns)
classify = ns["classify"]

# (id, titulo, texto, ato, prioridade, fase, motivo)
CASES = [
    (
        "audiencia_justifica",
        "Decisão",
        "DESIGNO audiência de justificação para o dia 12/05/2026 às 14h",
        "Defesa em audiência de justificação",
        "URGENTE",
        "audiencia_designada",
        "ciencia_audiencia",
    ),
    (
        "mpu_deferida",
        "Decisão",
        "DEFIRO as medidas protetivas requeridas — afastamento do lar, proibição de aproximação",
        "Analisar viabilidade de agravo",
        "NORMAL",
        "decisao_liminar",
        "ciencia_decisao_mpu",
    ),
    (
        "prorrogacao",
        "Intimação",
        "intime-se o requerido para manifestar-se sobre o pedido de prorrogação das medidas protetivas formulado pela requerente",
        "Manifestar contra prorrogação de MPU",
        "URGENTE",
        "manifestacao_pendente",
        "manifestar_renovacao",
    ),
    (
        "revogacao_pela_requerente",
        "Petição",
        "a requerente manifestou interesse na revogação das medidas protetivas alegando reconciliação",
        "Acompanhar pedido de revogação",
        "BAIXA",
        "manifestacao_pendente",
        "manifestar_revogacao",
    ),
    (
        "descumprimento_24a",
        "Decisão",
        "notícia de descumprimento das medidas protetivas pelo requerido. Encaminhe-se ao MP (art. 24-A Lei 11.340)",
        "Defesa criminal — descumprimento art. 24-A",
        "URGENTE",
        "descumprimento_apurado",
        "manifestar_descumprimento",
    ),
    (
        "laudo_psicossocial",
        "Despacho",
        "juntado aos autos o laudo psicossocial elaborado pelo CRAM, abra-se vista ao requerido",
        "Manifestar sobre laudo psicossocial",
        "NORMAL",
        "manifestacao_pendente",
        "manifestar_laudo",
    ),
    (
        "modulacao",
        "Petição",
        "requereu o requerido a modulação da medida protetiva, reduzindo o raio de afastamento",
        "Manifestar sobre modulação de MPU",
        "NORMAL",
        "manifestacao_pendente",
        "manifestar_modulacao",
    ),
    (
        "tornozeleira",
        "Decisão",
        "em razão do reiterado descumprimento, decreto a aplicação de monitoramento eletrônico (tornozeleira)",
        "Contestar imposição de tornozeleira",
        "URGENTE",
        "manifestacao_pendente",
        "manifestar_modulacao",
    ),
    (
        "ciencia_generica",
        "Intimação",
        "TOMAR CIÊNCIA",
        "Ciência",
        "BAIXA",
        "manifestacao_pendente",
        "intimacao_generica",
    ),
    # Negativos — texto MPU porém is_mpu=False, não deve aplicar RULES_MPU
    # (testado separadamente, ver final)
]

# Casos negativos (is_mpu=False)
NEGATIVE_CASES = [
    (
        "criminal_comum_citando_mpu",
        "Sentença",
        "...denúncia oferecida por crime do art. 129, com antecedente de medida protetiva descumprida...",
        # Quando is_mpu=False, fallback é RULES_BASE → "Analisar sentença"
        "Analisar sentença",
    ),
]


def run() -> int:
    failed = 0
    for case in CASES:
        cid, titulo, texto, ato_esp, prio_esp, fase_esp, motivo_esp = case
        result = classify(texto, titulo=titulo, is_mpu=True)
        if result is None:
            print(f"  ✗ {cid}: classify retornou None")
            failed += 1
            continue
        ok = (result.get("ato") == ato_esp
              and result.get("prioridade") == prio_esp
              and result.get("fase") == fase_esp
              and result.get("motivo") == motivo_esp)
        if ok:
            print(f"  ✓ {cid}: {result['ato']} ({result['prioridade']}) [fase={fase_esp}|motivo={motivo_esp}]")
        else:
            print(f"  ✗ {cid}: esperado [{ato_esp}/{prio_esp}/{fase_esp}/{motivo_esp}], obtido [{result.get('ato')}/{result.get('prioridade')}/{result.get('fase')}/{result.get('motivo')}]")
            failed += 1

    for case in NEGATIVE_CASES:
        cid, titulo, texto, ato_esp = case
        result = classify(texto, titulo=titulo, is_mpu=False)
        if result is None:
            print(f"  ✗ {cid} (neg): classify retornou None — esperava {ato_esp}")
            failed += 1
            continue
        if result.get("ato") == ato_esp:
            print(f"  ✓ {cid} (neg): {result['ato']} (não acionou MPU)")
        else:
            print(f"  ✗ {cid} (neg): esperado {ato_esp}, obtido {result.get('ato')}")
            failed += 1

    total = len(CASES) + len(NEGATIVE_CASES)
    passed = total - failed
    print(f"\n{passed}/{total} testes passaram")
    return 0 if failed == 0 else 1


if __name__ == "__main__":
    sys.exit(run())
```

- [ ] **Step 2: Rodar e verificar que falha**

Run:
```bash
python3 "<CANON>/scripts/test_classify_mpu.py"
```

Expected: `TypeError: classify() got an unexpected keyword argument 'is_mpu'` (porque ainda não implementamos a flag). Ou todos os casos falham com "classify retornou None" pois `RULES_MPU` não existe.

Se passar tudo de cara, **algo está errado** — `is_mpu` não existe no script ainda.

- [ ] **Step 3: Não commitar ainda — segue para Task 3**

---

## Task 3: Implementar `RULES_MPU`, `_decide_by_titulo_mpu()` e flag `is_mpu`

**Files:**
- Modify: `<CANON>/scripts/varredura_triagem.py`

- [ ] **Step 1: Adicionar `RULES_MPU` (após `RULES_BASE`)**

Localizar a linha `RULES_BASE = [` (~linha 148) e o fechamento `]` correspondente (~linha 202). **Após** o `]` de fechamento de `RULES_BASE`, adicionar:

```python
# ───── Regras MPU (defensivas — assistido = requerido) ──────────────────────
# Tupla: (pattern, ato, prioridade, prazo_dias, registro_tipo, fase, motivo, side_effects, extras)
# Aplicadas SOMENTE quando is_mpu=True. Sob ótica defensiva do requerido.
# Ver: references/heuristicas-mpu.md
# Constantes em src/lib/mpu-constants.ts (FASE_PROCEDIMENTO, MOTIVO_INTIMACAO).
RULES_MPU = [
    # 1. Audiência de justificação
    (r"designada.{0,40}audiencia.{0,20}(justifica|aij)",
     "Defesa em audiência de justificação", "URGENTE", 5, "diligencia",
     "audiencia_designada", "ciencia_audiencia",
     ["agendar_audiencia"], {"tipo_audiencia": "JUSTIFICACAO"}),
    # 2. MPU deferida (decisão liminar)
    (r"(deferi|defiro).{0,40}medidas?\s+protetiva",
     "Analisar viabilidade de agravo", "NORMAL", 15, "diligencia",
     "decisao_liminar", "ciencia_decisao_mpu",
     [], {}),
    # 3. Prorrogação/renovação
    (r"(prorrog|renov|manten|continui).{0,30}(medida|mpu|protetiva)",
     "Manifestar contra prorrogação de MPU", "URGENTE", 5, "diligencia",
     "manifestacao_pendente", "manifestar_renovacao",
     [], {}),
    # 4. Pedido de revogação (favorável ao requerido)
    (r"(pedido|requeri|manifest).{0,30}revogac.{0,40}(medida|mpu|protetiva)",
     "Acompanhar pedido de revogação", "BAIXA", None, "anotacao",
     "manifestacao_pendente", "manifestar_revogacao",
     [], {"nota": "Pedido favorável — acompanhar"}),
    # 5. Descumprimento art. 24-A
    (r"(notic|comunic|registro).{0,30}descumpriment",
     "Defesa criminal — descumprimento art. 24-A", "URGENTE", 5, "diligencia",
     "descumprimento_apurado", "manifestar_descumprimento",
     [], {}),
    # 6. Laudo psicossocial
    (r"laudo.{0,20}psicossoci|estudo psicossoci",
     "Manifestar sobre laudo psicossocial", "NORMAL", 10, "diligencia",
     "manifestacao_pendente", "manifestar_laudo",
     [], {}),
    # 7. Modulação
    (r"(modul|redu|alterac).{0,40}(raio|distancia|medida\s+protetiva)",
     "Manifestar sobre modulação de MPU", "NORMAL", 10, "diligencia",
     "manifestacao_pendente", "manifestar_modulacao",
     [], {}),
    # 8. Tornozeleira / monitoramento
    (r"tornozeleira|monitoramento\s+eletronico",
     "Contestar imposição de tornozeleira", "URGENTE", 5, "diligencia",
     "manifestacao_pendente", "manifestar_modulacao",
     [], {}),
    # 9. Fallback genérico para MPU (TOMAR CIÊNCIA, intimação simples)
    (r"tomar ciencia|intimacao",
     "Ciência", "BAIXA", None, "ciencia",
     "manifestacao_pendente", "intimacao_generica",
     [], {}),
]
```

- [ ] **Step 2: Adicionar `_decide_by_titulo_mpu()` (após `_decide_by_titulo()`)**

Localizar a linha `def _decide_by_titulo(titulo: str, text: str) -> dict | None:` (~linha 205) e o `return None  # outros tipos: fallback texto` (~linha 259). **Após** essa linha de return, adicionar:

```python


def _decide_by_titulo_mpu(titulo: str, text: str) -> dict | None:
    """Variante MPU: prioriza tipo de doc + lógica defensiva.
    Ver references/heuristicas-mpu.md.
    """
    t = normalize(titulo)
    n = normalize(text)
    if "decis" in t or "sentenc" in t:
        # Audiência justificação — antes de outras regras
        if re.search(r"designada.{0,40}audiencia.{0,20}(justifica|aij)", n):
            return {"ato": "Defesa em audiência de justificação", "prioridade": "URGENTE",
                    "prazo_dias": 5, "registro_tipo": "diligencia",
                    "fase": "audiencia_designada", "motivo": "ciencia_audiencia",
                    "side_effects": ["agendar_audiencia"], "extras": {"tipo_audiencia": "JUSTIFICACAO"}}
        # Tornozeleira — tem peso de urgência
        if re.search(r"tornozeleira|monitoramento\s+eletronico", n):
            return {"ato": "Contestar imposição de tornozeleira", "prioridade": "URGENTE",
                    "prazo_dias": 5, "registro_tipo": "diligencia",
                    "fase": "manifestacao_pendente", "motivo": "manifestar_modulacao",
                    "side_effects": [], "extras": {}}
        # Descumprimento
        if re.search(r"(notic|comunic|registro).{0,30}descumpriment", n):
            return {"ato": "Defesa criminal — descumprimento art. 24-A", "prioridade": "URGENTE",
                    "prazo_dias": 5, "registro_tipo": "diligencia",
                    "fase": "descumprimento_apurado", "motivo": "manifestar_descumprimento",
                    "side_effects": [], "extras": {}}
        # MPU deferida
        if re.search(r"(deferi|defiro).{0,40}medidas?\s+protetiva", n):
            return {"ato": "Analisar viabilidade de agravo", "prioridade": "NORMAL",
                    "prazo_dias": 15, "registro_tipo": "diligencia",
                    "fase": "decisao_liminar", "motivo": "ciencia_decisao_mpu",
                    "side_effects": [], "extras": {}}
    if "intimac" in t or "tomar ciencia" in n:
        # Prorrogação — antes de fallback
        if re.search(r"(prorrog|renov|manten).{0,30}(medida|mpu|protetiva)", n):
            return {"ato": "Manifestar contra prorrogação de MPU", "prioridade": "URGENTE",
                    "prazo_dias": 5, "registro_tipo": "diligencia",
                    "fase": "manifestacao_pendente", "motivo": "manifestar_renovacao",
                    "side_effects": [], "extras": {}}
    return None  # fallback para RULES_MPU em classify()
```

- [ ] **Step 3: Modificar assinatura e corpo de `classify()`**

Localizar a definição atual (~linha 262):

```python
def classify(text: str, titulo: str | None = None) -> dict | None:
    """Classifica usando (a) título do doc na timeline + (b) regras textuais
    como fallback. Título é mais confiável quando disponível."""
    if titulo:
        r = _decide_by_titulo(titulo, text)
        if r:
            return r
    n = normalize(text)
    for pat, ato, prio, prazo, tipo, fx, ex in RULES_BASE:
```

Substituir por:

```python
def classify(text: str, titulo: str | None = None, is_mpu: bool = False) -> dict | None:
    """Classifica usando (a) título do doc + (b) regras textuais como fallback.
    
    Quando is_mpu=True, RULES_MPU vem antes de RULES_BASE — ótica defensiva
    do requerido. Ver references/heuristicas-mpu.md.
    """
    n = normalize(text)
    if is_mpu:
        if titulo:
            r = _decide_by_titulo_mpu(titulo, text)
            if r:
                return r
        for pat, ato, prio, prazo, tipo, fase, motivo, fx, ex in RULES_MPU:
            if re.search(pat, n):
                return {"ato": ato, "prioridade": prio, "prazo_dias": prazo,
                        "registro_tipo": tipo, "fase": fase, "motivo": motivo,
                        "side_effects": fx, "extras": ex}
        # se MPU mas nada matcheou, cai no RULES_BASE como último recurso
    if titulo:
        r = _decide_by_titulo(titulo, text)
        if r:
            return r
    for pat, ato, prio, prazo, tipo, fx, ex in RULES_BASE:
```

(O loop `for pat, ato, prio, prazo, tipo, fx, ex in RULES_BASE:` continua igual depois — só o cabeçalho de `classify` e o trecho ANTES do loop mudam.)

Verificar mantendo: o final da função (após o loop) continua retornando `{"ato": ato, "prioridade": prio, ...}` ou `None`. Esse formato sem `fase`/`motivo` é OK para RULES_BASE.

- [ ] **Step 4: Rodar testes — todos devem passar**

Run:
```bash
python3 "<CANON>/scripts/test_classify_mpu.py"
```

Expected: `10/10 testes passaram` (9 MPU + 1 negativo). Se algum falhar, ler a mensagem e ajustar a regex correspondente em `RULES_MPU` ou `_decide_by_titulo_mpu()`.

Casos comuns de falha:
- Regex não casa por causa de acento/case → texto entra no `normalize()`, então a regex deve operar em ASCII lowercase (já é a convenção)
- Ordem de regras MPU — a primeira que casa vence
- `_decide_by_titulo_mpu` sobrescreve `RULES_MPU` quando título é específico

- [ ] **Step 5: Não commitar ainda — segue para Task 4**

---

## Task 4: Detectar `is_mpu` no loop e passar para `classify()`

**Files:**
- Modify: `<CANON>/scripts/varredura_triagem.py`

- [ ] **Step 1: Expandir `list_demandas()` para trazer info de MPU**

Localizar (~linha 113-114):

```python
        params = [
            "select=id,ato,assistido_id,processo_id,enrichment_data,pje_documento_id,"
            "processos!inner(numero_autos,atribuicao,vara,classe_processual),"
            "assistidos!inner(nome)",
```

Substituir o select por (1 linha apenas — a 2ª string):

```python
            "select=id,ato,assistido_id,processo_id,enrichment_data,pje_documento_id,"
            "processos!inner(numero_autos,atribuicao,vara,classe_processual,processosVvd:processos_vvd(tipo_processo,mpu_ativa)),"
            "assistidos!inner(nome)",
```

(Mudança: o `processos!inner(...)` ganha um sub-select aninhado `processosVvd:processos_vvd(tipo_processo,mpu_ativa)` que faz join opcional com a tabela `processos_vvd`.)

- [ ] **Step 2: Adicionar helper `_is_mpu()` no script**

Logo após `def normalize(s: str) -> str:` (~linha 83), adicionar:

```python
def _is_mpu(demanda: dict) -> bool:
    """Espelho de src/lib/mpu.ts isMpu(). Detecta MPU por:
    - processos.processosVvd.tipo_processo == 'MPU'
    - processos.processosVvd.mpu_ativa is True
    - processos.numero_autos começando com 'MPUMP'
    Mantenha em sincronia com src/lib/mpu.ts.
    """
    proc = demanda.get("processos") or {}
    pvvd_list = proc.get("processosVvd") or []
    # Supabase retorna como list quando 1:n; pegar o primeiro
    pvvd = pvvd_list[0] if isinstance(pvvd_list, list) and pvvd_list else (pvvd_list or {})
    if pvvd.get("tipo_processo") == "MPU":
        return True
    if pvvd.get("mpu_ativa") is True:
        return True
    numero = proc.get("numero_autos") or ""
    if isinstance(numero, str) and numero.startswith("MPUMP"):
        return True
    return False
```

- [ ] **Step 3: Modificar a chamada `classify()` no `varredura()`**

Localizar (~linha 551):

```python
                rule = classify(content["text"], titulo=best_titulo)
```

Substituir por:

```python
                is_mpu_demanda = _is_mpu(d)
                rule = classify(content["text"], titulo=best_titulo, is_mpu=is_mpu_demanda)
```

- [ ] **Step 4: Sanity check — script ainda parseia**

Run:
```bash
python3 -c "exec(open('<CANON>/scripts/varredura_triagem.py').read().replace('main()', 'pass'))"
```

Expected: sai sem erro. Se aparecer `SyntaxError` ou `NameError`, voltar e corrigir.

(Substitua `<CANON>` pelo caminho real.)

- [ ] **Step 5: Não commitar ainda — segue para Task 5**

---

## Task 5: Estender `apply_classification()` para escrever `fase_procedimento` e `motivo_ultima_intimacao`

**Files:**
- Modify: `<CANON>/scripts/varredura_triagem.py`

- [ ] **Step 1: Localizar a função**

Localizar (~linha 470):

```python
def apply_classification(sb: Supabase, demanda: dict, rule: dict, content: str) -> None:
    fields: dict = {
        "ato": rule["ato"],
        "prioridade": rule["prioridade"],
        "revisao_pendente": False,
    }
    if rule["prazo_dias"] is not None:
        fields["prazo"] = (date.today() + timedelta(days=rule["prazo_dias"])).isoformat()
    sb.update_demanda(demanda["id"], fields)
```

- [ ] **Step 2: Estender com escrita em `processos_vvd`**

Substituir a função inteira por:

```python
def apply_classification(sb: Supabase, demanda: dict, rule: dict, content: str) -> None:
    # Atualiza demandas
    fields: dict = {
        "ato": rule["ato"],
        "prioridade": rule["prioridade"],
        "revisao_pendente": False,
    }
    if rule["prazo_dias"] is not None:
        fields["prazo"] = (date.today() + timedelta(days=rule["prazo_dias"])).isoformat()
    sb.update_demanda(demanda["id"], fields)

    # Atualiza processos_vvd quando rule MPU traz fase/motivo (Plano 1 da reforma)
    fase = rule.get("fase")
    motivo = rule.get("motivo")
    proc_id = demanda.get("processo_id")
    if (fase or motivo) and proc_id:
        pvvd_fields: dict = {}
        if fase:
            pvvd_fields["fase_procedimento"] = fase
        if motivo:
            pvvd_fields["motivo_ultima_intimacao"] = motivo
        try:
            sb._req("PATCH", f"/rest/v1/processos_vvd?processo_id=eq.{proc_id}", pvvd_fields)
        except Exception as e:
            log(f"  ⚠ falha ao atualizar processos_vvd (proc_id={proc_id}): {e}")
            # não interrompe — registro principal já foi salvo

    # Insere registro de timeline
    sb.insert_registro({
        "assistido_id": demanda["assistido_id"],
        "processo_id": demanda["processo_id"],
        "demanda_id": demanda["id"],
        "data_registro": datetime.now().isoformat(),
        "tipo": rule["registro_tipo"],
        "titulo": rule["ato"],
        "conteudo": (content[:1500] + ("..." if len(content) > 1500 else "")) or "(sem conteúdo lido)",
        "status": "realizado" if rule["registro_tipo"] == "ciencia" else "agendado",
        "autor_id": DEFENSOR_ID,
    })
```

- [ ] **Step 3: Sanity check**

Run:
```bash
python3 -c "
import sys
sys.path.insert(0, '<CANON>/scripts')
ns = {}
src = open('<CANON>/scripts/varredura_triagem.py').read()
exec('\n'.join(l for l in src.splitlines() if not l.strip().startswith('main()') and l.strip() != 'if __name__ == \"__main__\":'), ns)
print('apply_classification:', ns['apply_classification'].__doc__ or 'OK')
print('classify signature:', ns['classify'].__code__.co_varnames[:3])
"
```

Expected: `apply_classification: OK` (ou docstring) e `classify signature: ('text', 'titulo', 'is_mpu')`. Se aparecer erro, corrigir.

- [ ] **Step 4: Re-rodar testes da Task 2 — devem continuar passando**

Run:
```bash
python3 "<CANON>/scripts/test_classify_mpu.py"
```

Expected: `10/10 testes passaram`. (Esta task não muda classify; só apply_classification.)

- [ ] **Step 5: Não commitar ainda — segue para Task 6**

---

## Task 6: Atualizar `SKILL.md` (seção MPU + bugs/contornos)

**Files:**
- Modify: `<CANON>/SKILL.md`

- [ ] **Step 1: Adicionar seção "Triagem MPU (defesa do requerido)"**

Abrir `<CANON>/SKILL.md` e localizar a seção "## Heurísticas de classificação" ou similar (perto do meio do documento, onde fala dos atos).

Adicionar **uma nova seção** logo antes de "## Bugs conhecidos / contornos" (se houver) ou no final do documento se não houver:

````markdown
## Triagem MPU (defesa do requerido)

Quando a demanda é uma **MPU** (`processosVvd.tipoProcesso='MPU'`,
`mpu_ativa=true`, ou número começa com `MPUMP*`), a classificação muda
de ótica: o assistido é o REQUERIDO (a pessoa que foi demandada a cumprir
a medida). Os atos sugeridos são DEFENSIVOS:

| Padrão no documento | Ato | Prioridade |
|---|---|---|
| Audiência de justificação designada | Defesa em audiência de justificação | URGENTE 5d |
| MPU deferida (decisão liminar) | Analisar viabilidade de agravo | NORMAL 15d |
| Pedido de prorrogação/renovação | Manifestar contra prorrogação | URGENTE 5d |
| Pedido de revogação (pela requerente) | Acompanhar pedido | BAIXA |
| Notícia de descumprimento (24-A) | Defesa criminal | URGENTE 5d |
| Laudo psicossocial | Manifestar sobre laudo psicossocial | NORMAL 10d |
| Modulação de raio/medida | Manifestar sobre modulação | NORMAL 10d |
| Tornozeleira / monitoramento | Contestar imposição | URGENTE 5d |
| Tomar ciência genérico | Ciência | BAIXA |

Tabela completa com regex e exemplos: `references/heuristicas-mpu.md`.

A skill detecta MPU automaticamente via `_is_mpu(demanda)` (espelho de
`src/lib/mpu.ts`) e passa `is_mpu=True` para `classify()`. Cada match
preenche, além de `ato`/`prioridade`/`prazo`, os campos
`processos_vvd.fase_procedimento` e `processos_vvd.motivo_ultima_intimacao`
adicionados no Plano 1 da reforma MPU.

Constantes canônicas em `src/lib/mpu-constants.ts`:
- `FASE_PROCEDIMENTO`: representacao_inicial, decisao_liminar,
  audiencia_designada, audiencia_realizada, manifestacao_pendente,
  recurso, descumprimento_apurado, expirada, revogada
- `MOTIVO_INTIMACAO`: ciencia_decisao_mpu, ciencia_audiencia,
  manifestar_renovacao, manifestar_modulacao, manifestar_revogacao,
  manifestar_laudo, manifestar_descumprimento, ciencia_modulacao,
  intimacao_generica
````

- [ ] **Step 2: Adicionar/expandir "Bugs conhecidos / contornos"**

Localizar (ou criar) a seção `## Bugs conhecidos / contornos` no final do `SKILL.md`. Acrescentar:

````markdown
### Sigilo de polo passivo em processos VVD

Processos MPU/VVD têm sigilo de polo passivo no PJe. A leitura padrão da
timeline retorna apenas o nome da Defensoria, não o do requerido. Para
extrair as partes (requerido, requerente):

1. Localizar o popup **"Peticionar"** na página do processo
2. Capturar o token `ca` da URL/hidden input
3. Chamar `listProcessoCompleto.seam?ca=<token>` — retorna HTML com partes

Detalhes em `reference_pje_polo_passivo_scraping.md` da memória do projeto.

### Identificação do REQUERIDO entre as partes

Heurística (após resolver o sigilo):
1. Tipo de parte = `requerido` (se etiquetado pelo PJe)
2. Vinculado à DPE-BA como representante
3. Quando ambíguo, usar o primeiro match de CPF na lista de partes

Se nenhum candidato → `assistido_id` = placeholder
"⚠ A identificar — <cnj>" (padrão `project_assistido_placeholder`).

### Regras MPU sobrepõem RULES_BASE

`classify(is_mpu=True)` aplica `RULES_MPU` antes de `RULES_BASE`. Se
nenhuma regra MPU casar, cai em RULES_BASE como fallback (o ato terá
peso default e provavelmente não preencherá `fase`/`motivo`). Quando
aparecer ato vindo de RULES_BASE numa demanda MPU, é sinal de que falta
regra em `RULES_MPU` — adicionar via `references/heuristicas-mpu.md`.
````

- [ ] **Step 3: Atualizar histórico no final do SKILL.md**

Localizar a tabela "## Histórico" (no final). Adicionar uma linha:

```markdown
| 2026-05-04 | varredura-triagem | módulo MPU: classify(is_mpu=True), RULES_MPU (10 regras), _decide_by_titulo_mpu, fase_procedimento + motivo_ultima_intimacao escritos automaticamente |
```

- [ ] **Step 4: Revisar a estrutura do arquivo**

Run:
```bash
grep -c "^## " "<CANON>/SKILL.md"
```

Expected: ≥ 5 seções principais (`##`). Se menos, é sinal de que perdeu seção.

- [ ] **Step 5: Não commitar ainda — segue para Task 7**

---

## Task 7: Sincronizar canônica → cópias locais

**Files:**
- Sync from: `<CANON>/`
- Sync to: `/Users/rodrigorochameire/Projetos/Defender/.claude/skills/varredura-triagem/`
- Sync to: `/Users/rodrigorochameire/Projetos/Defender/.claude/skills-cowork/varredura-triagem/`

- [ ] **Step 1: Sincronizar `.claude/skills/`**

Run:
```bash
rsync -a --delete \
  "/Users/rodrigorochameire/Library/CloudStorage/GoogleDrive-rodrigorochameire@gmail.com/Meu Drive/1 - Defensoria 9ª DP/Skills - harmonizacao/varredura-triagem/" \
  "/Users/rodrigorochameire/Projetos/Defender/.claude/skills/varredura-triagem/"
```

(O trailing slash é importante. `--delete` remove arquivos no destino que não existem na origem — garante paridade.)

- [ ] **Step 2: Sincronizar `.claude/skills-cowork/`**

Run:
```bash
rsync -a --delete \
  "/Users/rodrigorochameire/Library/CloudStorage/GoogleDrive-rodrigorochameire@gmail.com/Meu Drive/1 - Defensoria 9ª DP/Skills - harmonizacao/varredura-triagem/" \
  "/Users/rodrigorochameire/Projetos/Defender/.claude/skills-cowork/varredura-triagem/"
```

- [ ] **Step 3: Verificar paridade**

Run:
```bash
diff -r \
  "/Users/rodrigorochameire/Library/CloudStorage/GoogleDrive-rodrigorochameire@gmail.com/Meu Drive/1 - Defensoria 9ª DP/Skills - harmonizacao/varredura-triagem/" \
  "/Users/rodrigorochameire/Projetos/Defender/.claude/skills/varredura-triagem/"
```

Expected: nenhuma saída (arquivos idênticos). Se aparecer diff, o rsync falhou — investigar antes de seguir.

Run também:
```bash
diff -r \
  "/Users/rodrigorochameire/Library/CloudStorage/GoogleDrive-rodrigorochameire@gmail.com/Meu Drive/1 - Defensoria 9ª DP/Skills - harmonizacao/varredura-triagem/" \
  "/Users/rodrigorochameire/Projetos/Defender/.claude/skills-cowork/varredura-triagem/"
```

Expected: idem.

- [ ] **Step 4: Re-rodar testes da Task 2 a partir da cópia local**

Run:
```bash
python3 "/Users/rodrigorochameire/Projetos/Defender/.claude/skills/varredura-triagem/scripts/test_classify_mpu.py"
```

Expected: `10/10 testes passaram`.

(Garante que a sincronização não quebrou nada. Se passou na canônica e quebrou aqui, é problema de path no rsync.)

- [ ] **Step 5: Não commitar ainda — segue para Task 8**

---

## Task 8: Commit + push + merge para main

**Files:**
- Commit only files inside `.claude/skills/varredura-triagem/` and `.claude/skills-cowork/varredura-triagem/`.

- [ ] **Step 1: Verificar git status**

Run:
```bash
git status .claude/skills/varredura-triagem/ .claude/skills-cowork/varredura-triagem/
```

Expected: arquivos modificados/adicionados em ambas as pastas:
- `SKILL.md` modificado
- `scripts/varredura_triagem.py` modificado
- `scripts/test_classify_mpu.py` novo
- `references/heuristicas-mpu.md` novo

Se houver outros arquivos não relacionados, **stash** ou **add seletivo**.

- [ ] **Step 2: Stage tudo da skill**

Run:
```bash
git add .claude/skills/varredura-triagem/ .claude/skills-cowork/varredura-triagem/
```

- [ ] **Step 3: Commit**

Run:
```bash
git commit -m "$(cat <<'EOF'
feat(varredura-triagem): módulo MPU defensivo — Plano 2

Skill ganha:
- _is_mpu() — espelho de src/lib/mpu.ts
- _decide_by_titulo_mpu() — lógica defensiva por título do doc
- RULES_MPU — 10 padrões cobrindo audiência justificação,
  prorrogação, revogação, descumprimento (24-A), laudo
  psicossocial, modulação, tornozeleira, fallback ciência
- classify(is_mpu=True) — RULES_MPU vem antes de RULES_BASE
- apply_classification() — escreve fase_procedimento e
  motivo_ultima_intimacao em processos_vvd (Plano 1)
- list_demandas() — sub-select processosVvd para detectar MPU
- references/heuristicas-mpu.md — tabela canônica + exemplos
- scripts/test_classify_mpu.py — 10 casos sintéticos (9 MPU + 1 negativo)
- SKILL.md — nova seção MPU + bugs (sigilo polo passivo VVD)

Validação local: 10/10 testes sintéticos passando.

Pré-requisito do Plano 3 (import das 31 MPU pendentes).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

- [ ] **Step 4: Push**

Verificar primeiro a branch atual:

```bash
git branch --show-current
```

Se for `main`, criar nova branch antes de pushar:

```bash
git checkout -b feat/mpu-triagem-skill
git push -u origin feat/mpu-triagem-skill
```

Se já estiver em uma feature branch, basta:

```bash
git push origin HEAD
```

- [ ] **Step 5: Merge fast-forward para main via worktree**

```bash
cd /Users/rodrigorochameire/Projetos/Defender/.worktrees/demanda-eventos
git fetch origin main
# Substituir <BRANCH> pela feature branch usada no Step 4
git merge --ff-only origin/<BRANCH>
git push origin main
```

Expected: fast-forward limpo, sem conflitos.

- [ ] **Step 6: Atualizar memória se aplicável**

Se a memória `feedback_evolucao_skills.md` ainda não menciona o módulo MPU, ela continua válida (a meta-regra é genérica). Não precisa alterar.

Se houver algum aprendizado novo durante a implementação (ex.: regex que dispara em contextos inesperados, sigilo VVD com novo workaround), criar/atualizar uma memória `reference_*.md` apropriada — mas é opcional.

---

## Self-Review checklist

- [x] Cada task tem código completo (sem placeholders)
- [x] Caminhos exatos com `<CANON>` substituível
- [x] TDD aplicado nas Tasks 2-3 (testes falham → implementa → passa)
- [x] Pipeline `evolucao-skills` respeitado (canônica primeiro, depois sync, depois commit)
- [x] Sub-plano isolado: depende só do Plano 1 (já entregue) e prepara Plano 3
- [x] Sem migration de banco neste plano (Plano 1 já entregou as colunas)
- [x] Commit message documenta o que mudou e por que
- [x] Spec coverage:
   - Heurísticas defensivas (10 padrões) ✓ Tasks 1-3
   - Flag is_mpu em classify() ✓ Task 3
   - _decide_by_titulo_mpu ✓ Task 3
   - Detecção automática de MPU ✓ Task 4
   - Escrita em fase_procedimento + motivo_ultima_intimacao ✓ Task 5
   - SKILL.md atualizado ✓ Task 6
   - Sync canônica → local ✓ Task 7
   - Persist (git + memória) ✓ Task 8

## Dependências dos próximos planos

- **Plano 3 (Import das 31 MPU)** consome `_is_mpu()` e o `classify(is_mpu=True)` desta skill ao processar cada expediente importado.
- **Plano 6 (Análise estruturada)** vai consumir os campos `fase_procedimento` e `motivo_ultima_intimacao` populados aqui para construir a ficha visual do processo (3 blocos).
