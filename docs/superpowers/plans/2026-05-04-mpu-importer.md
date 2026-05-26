# MPU Importer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Importar automaticamente expedientes MPU pendentes do PJe TJBA para o OMBUDS, fechando o gap das 31 MPU que estão no painel mas nunca chegaram ao DB.

**Architecture:** Novo script Python standalone (`scripts/pje_mpu_import.py`) que reaproveita login HTTP do scraper Júri, navega para painel VVD, resolve sigilo de polo passivo via 1ª via privilegiada (sessão de representante) com fallback ao token `ca`, identifica o REQUERIDO via cascata, e POSTa para o endpoint `/api/cron/pje-import` (com novo campo `textoVvd`). Endpoint sofre 2 mudanças cirúrgicas: aceitar `textoVvd` e fazer upsert em `processos_vvd` com `tipo_processo='MPU'` para os processos importados.

**Tech Stack:** Python 3 (`requests`, `re`, sem deps externas além das já no projeto), TypeScript (Next.js route handler), Drizzle ORM, PostgreSQL. Testes Python standalone (sem framework, exit 0/1).

**Spec aprovado:** `docs/superpowers/specs/2026-05-04-mpu-importer-design.md` (commit `b57802d2`)

---

## File Structure

| Arquivo | Status | Responsabilidade |
|---|---|---|
| `scripts/pje_mpu_import.py` | **Novo** | Script principal — orquestra scraping + identify + format + POST |
| `scripts/test_pje_mpu_import.py` | **Novo** | Testes sintéticos com fixtures HTML inline |
| `scripts/pje_intimacoes_scraper.py` | Importado por (sem mudança) | Reusa `login_requests()` |
| `src/app/api/cron/pje-import/route.ts` | **Modificado** | Aceitar `textoVvd` + upsert MPU em `processos_vvd` |
| `src/lib/services/pje-import.ts` | Sem mudança | `importarDemandas` já aceita atribuição como string |
| `src/lib/pje-parser.ts` | Sem mudança | `parsePJeIntimacoesCompleto` já reconhece prefixo `MPUMPCrim` |

---

## Task 1: Test infrastructure + `parse_expedientes_list`

**Files:**
- Create: `scripts/test_pje_mpu_import.py`
- Create: `scripts/pje_mpu_import.py`

- [ ] **Step 1: Criar arquivo de testes com primeiro teste falhando**

`scripts/test_pje_mpu_import.py`:

```python
#!/usr/bin/env python3
"""Testes sintéticos do importador MPU. Exit 0 se OK, 1 se falhou."""
from __future__ import annotations
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from pje_mpu_import import (
    parse_expedientes_list,
    resolve_polo_passivo,
    identify_requerido,
    format_for_endpoint,
)


# ───── Fixture: HTML do painel VVD com 1 expediente MPU ─────
FIXTURE_PAINEL_VVD = """
<table id="formAbaExpediente:tabelaExpedientes">
  <tr class="rich-table-row">
    <td>
      <a onclick="openProcesso('1234567')" href="#">MPUMPCrim 8001234-12.2026.8.05.0039</a>
      <div>Maria Silva X João Pereira</div>
      <div>/Vara de Violência Doméstica de Camaçari</div>
      <div>Defensoria Pública</div>
      <div>Designação de audiência</div>
      <span>Expedição eletrônica (28/04/2026 10:23)</span>
      <span>Prazo: 5 dias</span>
    </td>
  </tr>
</table>
"""


def test_parse_expedientes_list():
    expedientes = parse_expedientes_list(FIXTURE_PAINEL_VVD)
    assert len(expedientes) == 1, f"esperado 1 expediente, veio {len(expedientes)}"
    e = expedientes[0]
    assert e["numero_cnj"] == "8001234-12.2026.8.05.0039", f"numero_cnj errado: {e}"
    assert e["processo_pje_id"] == "1234567", f"processo_pje_id errado: {e}"
    assert e["data_expedicao"] == "28/04/2026 10:23", f"data errada: {e}"
    assert e["tipo_documento"] == "Designação de audiência", f"tipo errado: {e}"
    assert e["prazo"] == "5 dias", f"prazo errado: {e}"
    print("  ✓ test_parse_expedientes_list")


TESTS = [test_parse_expedientes_list]


def main():
    failures = 0
    for t in TESTS:
        try:
            t()
        except AssertionError as e:
            print(f"  ✗ {t.__name__}: {e}")
            failures += 1
        except Exception as e:
            print(f"  ✗ {t.__name__}: ERRO {type(e).__name__}: {e}")
            failures += 1
    total = len(TESTS)
    if failures:
        print(f"\n{failures}/{total} testes falharam")
        sys.exit(1)
    print(f"\n{total}/{total} testes passaram")
    sys.exit(0)


if __name__ == "__main__":
    main()
```

- [ ] **Step 2: Criar stub do script principal (vai falhar import)**

`scripts/pje_mpu_import.py`:

```python
#!/usr/bin/env python3
"""
PJe → OMBUDS: importa expedientes MPU pendentes do painel VVD.

Reusa login_requests do scraper Júri. Resolve sigilo de polo passivo
via 1ª via privilegiada (sessão de representante), fallback ao token
`ca` quando 1ª via não retornar partes.

Uso:
  python3 scripts/pje_mpu_import.py                         # roda nos 31 pendentes
  python3 scripts/pje_mpu_import.py --dry-run               # imprime, não posta
  python3 scripts/pje_mpu_import.py --processo-pje-id=XXX   # filtra para 1 processo
"""
from __future__ import annotations
import argparse, datetime, html as htmlmod, json, os, re, sys, time
from pathlib import Path
from typing import Any
import requests
import urllib3
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)


# ───── Stubs (preenchidos nas próximas tasks) ──────────────────────────────

def parse_expedientes_list(html: str) -> list[dict]:
    raise NotImplementedError


def resolve_polo_passivo(session: requests.Session, processo_pje_id: str) -> dict:
    raise NotImplementedError


def identify_requerido(partes: list[dict]) -> str | None:
    raise NotImplementedError


def format_for_endpoint(expediente: dict, requerido: str | None) -> str:
    raise NotImplementedError


def main():
    raise NotImplementedError


if __name__ == "__main__":
    main()
```

- [ ] **Step 3: Rodar teste — deve falhar (NotImplementedError)**

```bash
python3 scripts/test_pje_mpu_import.py
```

Esperado: `1/1 testes falharam` com `ERRO NotImplementedError`.

- [ ] **Step 4: Implementar `parse_expedientes_list`**

Substituir o stub no `scripts/pje_mpu_import.py`:

```python
def parse_expedientes_list(html: str) -> list[dict]:
    """Extrai expedientes do HTML do painel VVD.

    Cada expediente: numero_cnj, processo_pje_id, data_expedicao,
    tipo_documento, prazo. Linhas <tr class="rich-table-row">.
    """
    expedientes: list[dict] = []

    # Cada linha de expediente é um <tr class="rich-table-row">
    for row in re.finditer(
        r'<tr[^>]*class="[^"]*rich-table-row[^"]*"[^>]*>(.*?)</tr>',
        html, re.DOTALL,
    ):
        block = row.group(1)

        # processo_pje_id vem do onclick="openProcesso('1234567')"
        pje_id_m = re.search(r"openProcesso\('(\d+)'\)", block)
        # numero CNJ
        cnj_m = re.search(r"\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}", block)
        # data de expedição
        exp_m = re.search(
            r"Expedi[çc][aã]o\s+eletr[oô]nica\s*\((\d{2}/\d{2}/\d{4}(?:\s+\d{2}:\d{2})?)\)",
            block,
        )
        # prazo
        prazo_m = re.search(r"Prazo:\s*(\d+\s*dias?)", block, re.IGNORECASE)
        # tipo documento — primeiro <div> que NÃO é partes/vara/destinatário
        tipo_m = None
        for div in re.finditer(r"<div>([^<]+)</div>", block):
            txt = div.group(1).strip()
            if (txt
                and " X " not in txt
                and not txt.startswith("/")
                and "Defensoria" not in txt
                and not re.match(r"\d{7}-", txt)):
                tipo_m = txt
                break

        if not (pje_id_m and cnj_m):
            continue

        expedientes.append({
            "numero_cnj": cnj_m.group(0),
            "processo_pje_id": pje_id_m.group(1),
            "data_expedicao": exp_m.group(1).strip() if exp_m else "",
            "tipo_documento": tipo_m or "",
            "prazo": prazo_m.group(1).strip() if prazo_m else "",
        })

    return expedientes
```

- [ ] **Step 5: Rodar teste — deve passar**

```bash
python3 scripts/test_pje_mpu_import.py
```

Esperado: `1/1 testes passaram`.

- [ ] **Step 6: NÃO commitar — segue para Task 2 (próxima função, mesmo arquivo)**

---

## Task 2: `resolve_polo_passivo` — 1ª via via `listView.seam`

**Files:**
- Modify: `scripts/pje_mpu_import.py` (substituir stub)
- Modify: `scripts/test_pje_mpu_import.py` (adicionar teste e fixture)

- [ ] **Step 1: Adicionar fixture e teste falhando**

Inserir no `scripts/test_pje_mpu_import.py`, ANTES da linha `TESTS = [...]`:

```python
# ───── Fixture: HTML do detalhe do processo COM partes visíveis (1ª via) ─────
FIXTURE_DETALHE_COM_PARTES = """
<div id="processo-detalhe">
  <table id="partes">
    <tr><td>Polo Ativo</td></tr>
    <tr><td>REQUERENTE</td><td>Maria Silva</td><td>CPF: 111.222.333-44</td></tr>
    <tr><td>Polo Passivo</td></tr>
    <tr><td>REQUERIDO</td><td>João Pereira</td><td>CPF: 555.666.777-88</td></tr>
    <tr><td>Outros</td></tr>
    <tr><td>REPRESENTANTE</td><td>DEFENSORIA PÚBLICA DA BAHIA</td><td>OAB: DPE/BA</td></tr>
  </table>
</div>
"""


class _StubSession:
    """Mock de requests.Session que retorna fixtures conforme URL."""
    def __init__(self, responses: dict[str, str]):
        self.responses = responses
        self.calls: list[str] = []

    def get(self, url: str, **kwargs):
        self.calls.append(url)
        for pattern, body in self.responses.items():
            if pattern in url:
                r = requests.Response()
                r.status_code = 200
                r._content = body.encode("utf-8")
                return r
        raise RuntimeError(f"URL não esperada: {url}")


def test_resolve_polo_passivo_via_listview():
    session = _StubSession({"listView.seam": FIXTURE_DETALHE_COM_PARTES})
    result = resolve_polo_passivo(session, "1234567")
    partes = result["partes"]
    assert len(partes) == 3, f"esperado 3 partes, veio {len(partes)}"

    requerente = next((p for p in partes if "Maria" in p["nome"]), None)
    requerido = next((p for p in partes if "João" in p["nome"]), None)
    dpe = next((p for p in partes if "DEFENSORIA" in p["nome"].upper()), None)

    assert requerente and requerente["tipo"].lower() == "requerente"
    assert requerido and requerido["tipo"].lower() == "requerido"
    assert requerido["cpf"] == "555.666.777-88", f"cpf errado: {requerido}"
    assert dpe and dpe["tipo"].lower() == "representante"
    assert "ca" not in [c.split("?")[0] for c in session.calls], "fallback `ca` não devia rodar"
    print("  ✓ test_resolve_polo_passivo_via_listview")
```

E adicionar `import requests` no topo do arquivo de testes (logo após `from pathlib import Path`).

E adicionar `test_resolve_polo_passivo_via_listview` ao `TESTS = [...]`.

- [ ] **Step 2: Rodar testes — novo teste deve falhar (NotImplementedError)**

```bash
python3 scripts/test_pje_mpu_import.py
```

Esperado: `1/2 testes falharam` (test_parse continua passando, novo teste falha).

- [ ] **Step 3: Implementar 1ª via no script**

Substituir o stub `resolve_polo_passivo` em `scripts/pje_mpu_import.py`:

```python
PJE_BASE = "https://pje.tjba.jus.br/pje"
LISTVIEW_URL = f"{PJE_BASE}/Processo/ConsultaProcesso/Detalhe/listView.seam"


def _parse_partes_from_html(html: str) -> list[dict]:
    """Extrai partes da seção 'partes' do HTML do processo.

    Cada linha (`<tr>`) com tipo + nome + (CPF/OAB opcional).
    Tipos reconhecidos: REQUERENTE, REQUERIDO, REPRESENTANTE, AUTOR, RÉU, etc.
    """
    partes: list[dict] = []
    TIPO_RE = re.compile(
        r"^\s*(REQUERENTE|REQUERIDO|REPRESENTANTE|AUTOR|R[ÉE]U|V[ÍI]TIMA|TESTEMUNHA)\s*$",
        re.IGNORECASE,
    )

    # Procurar bloco de partes (id="partes" ou heurística mais ampla)
    bloco_m = re.search(r'<table[^>]*id="partes"[^>]*>(.*?)</table>', html, re.DOTALL)
    if not bloco_m:
        # Fallback: procurar por qualquer tabela contendo REQUERIDO ou REQUERENTE
        bloco_m = re.search(r"<table[^>]*>([^<]*?(?:REQUERIDO|REQUERENTE).*?)</table>", html, re.DOTALL)
    if not bloco_m:
        return partes

    for row in re.finditer(r"<tr[^>]*>(.*?)</tr>", bloco_m.group(1), re.DOTALL):
        cells = re.findall(r"<td[^>]*>([^<]*)</td>", row.group(1))
        if not cells or len(cells) < 2:
            continue

        tipo_cell = cells[0].strip()
        if not TIPO_RE.match(tipo_cell):
            continue

        nome = htmlmod.unescape(cells[1].strip())
        if not nome:
            continue

        parte = {"tipo": tipo_cell.lower(), "nome": nome}
        # CPF / OAB no terceiro campo (se houver)
        if len(cells) >= 3:
            extra = cells[2].strip()
            cpf_m = re.search(r"CPF:\s*([\d.\-]+)", extra)
            oab_m = re.search(r"OAB:\s*([A-Z/]+\s*\d*)", extra)
            if cpf_m:
                parte["cpf"] = cpf_m.group(1)
            if oab_m:
                parte["oab"] = oab_m.group(1).strip()

        partes.append(parte)

    return partes


def resolve_polo_passivo(session: requests.Session, processo_pje_id: str) -> dict:
    """1ª via privilegiada (sessão de representante já vê partes).

    Fallback `ca` em Task 3 se 1ª via não retornar partes.
    """
    # 1ª via: GET listView.seam?id=<id>
    r = session.get(f"{LISTVIEW_URL}?id={processo_pje_id}", timeout=30, verify=False)
    if r.status_code == 200:
        partes = _parse_partes_from_html(r.text)
        if partes:
            return {"partes": partes, "via": "listView"}

    # Sem partes na 1ª via — fallback será adicionado em Task 3
    return {"partes": [], "via": "listView_empty"}
```

- [ ] **Step 4: Rodar testes — todos passam**

```bash
python3 scripts/test_pje_mpu_import.py
```

Esperado: `2/2 testes passaram`.

- [ ] **Step 5: NÃO commitar — segue para Task 3**

---

## Task 3: `resolve_polo_passivo` — fallback via token `ca`

**Files:**
- Modify: `scripts/pje_mpu_import.py`
- Modify: `scripts/test_pje_mpu_import.py`

- [ ] **Step 1: Adicionar fixtures e teste de fallback**

Inserir no `scripts/test_pje_mpu_import.py` antes do `class _StubSession`:

```python
# ───── Fixture: HTML do detalhe SEM partes na 1ª via (mas com popup Peticionar) ─────
FIXTURE_DETALHE_SEM_PARTES = """
<div id="processo-detalhe">
  <p>Sigilo total — partes não exibidas.</p>
  <a id="botaoPeticionar" data-ca="abc123def456abc123def456abc123de" onclick="abrirPopupPeticionar()">Peticionar</a>
</div>
"""

# ───── Fixture: HTML do listProcessoCompleto.seam (fallback) ─────
FIXTURE_LISTPROCESSOCOMPLETO = """
<div>
  <table id="partes">
    <tr><td>REQUERENTE</td><td>Ana Costa</td><td>CPF: 999.888.777-66</td></tr>
    <tr><td>REQUERIDO</td><td>Pedro Souza</td><td>CPF: 222.333.444-55</td></tr>
  </table>
</div>
"""
```

E adicionar o teste antes da definição `TESTS = [...]`:

```python
def test_resolve_polo_passivo_fallback_ca():
    session = _StubSession({
        "listView.seam": FIXTURE_DETALHE_SEM_PARTES,
        "listProcessoCompleto.seam": FIXTURE_LISTPROCESSOCOMPLETO,
    })
    result = resolve_polo_passivo(session, "9999999")
    partes = result["partes"]
    assert len(partes) == 2, f"esperado 2 partes do fallback, veio {len(partes)}"
    assert result["via"] == "ca_fallback", f"via errada: {result.get('via')}"

    requerido = next((p for p in partes if "Pedro" in p["nome"]), None)
    assert requerido and requerido["tipo"] == "requerido"
    assert requerido["cpf"] == "222.333.444-55"
    print("  ✓ test_resolve_polo_passivo_fallback_ca")
```

E adicionar `test_resolve_polo_passivo_fallback_ca` ao `TESTS`.

- [ ] **Step 2: Rodar testes — novo deve falhar**

```bash
python3 scripts/test_pje_mpu_import.py
```

Esperado: `1/3 testes falharam` (parse e listView passam, fallback falha).

- [ ] **Step 3: Implementar fallback no script**

Adicionar em `scripts/pje_mpu_import.py`, ANTES de `def resolve_polo_passivo`:

```python
LISTPROCESSOCOMPLETO_URL = f"{PJE_BASE}/Processo/ConsultaDocumento/listProcessoCompleto.seam"


def _extract_ca_token(html: str) -> str | None:
    """Extrai token `ca` (32 hex chars) do popup Peticionar.

    Tenta 3 estratégias em ordem:
      1. data-ca="..." em qualquer atributo HTML
      2. ?ca=... em URL embutida
      3. var ca = "..." em JS inline
    """
    for pattern in (
        r'data-ca=["\']([a-f0-9]{32})["\']',
        r'[?&]ca=([a-f0-9]{32})',
        r'var\s+ca\s*=\s*["\']([a-f0-9]{32})["\']',
    ):
        m = re.search(pattern, html, re.IGNORECASE)
        if m:
            return m.group(1)
    return None
```

E SUBSTITUIR a função `resolve_polo_passivo` inteira pela versão com fallback:

```python
def resolve_polo_passivo(session: requests.Session, processo_pje_id: str) -> dict:
    """1ª via privilegiada → fallback via token `ca`."""
    # 1ª via: GET listView.seam?id=<id>
    r = session.get(f"{LISTVIEW_URL}?id={processo_pje_id}", timeout=30, verify=False)
    if r.status_code != 200:
        return {"partes": [], "via": "listView_error"}

    partes = _parse_partes_from_html(r.text)
    if partes:
        return {"partes": partes, "via": "listView"}

    # 2ª via (fallback): extrair `ca` do popup → listProcessoCompleto.seam
    ca = _extract_ca_token(r.text)
    if not ca:
        return {"partes": [], "via": "ca_not_found"}

    r2 = session.get(f"{LISTPROCESSOCOMPLETO_URL}?ca={ca}", timeout=30, verify=False)
    if r2.status_code != 200:
        return {"partes": [], "via": "ca_http_error"}

    partes2 = _parse_partes_from_html(r2.text)
    if partes2:
        return {"partes": partes2, "via": "ca_fallback"}

    return {"partes": [], "via": "ca_empty"}
```

- [ ] **Step 4: Rodar testes — todos passam**

```bash
python3 scripts/test_pje_mpu_import.py
```

Esperado: `3/3 testes passaram`.

- [ ] **Step 5: NÃO commitar — segue para Task 4**

---

## Task 4: `identify_requerido` (cascata Q2/B)

**Files:**
- Modify: `scripts/pje_mpu_import.py`
- Modify: `scripts/test_pje_mpu_import.py`

- [ ] **Step 1: Adicionar 3 testes da cascata**

Inserir no `scripts/test_pje_mpu_import.py` antes de `TESTS = [...]`:

```python
def test_identify_requerido_caso_simples():
    partes = [
        {"tipo": "requerente", "nome": "Maria Silva", "cpf": "111.111.111-11"},
        {"tipo": "requerido", "nome": "João Pereira", "cpf": "222.222.222-22"},
        {"tipo": "representante", "nome": "Defensoria Pública", "oab": "DPE/BA"},
    ]
    assert identify_requerido(partes) == "João Pereira"
    print("  ✓ test_identify_requerido_caso_simples")


def test_identify_requerido_dois_requeridos():
    partes = [
        {"tipo": "requerido", "nome": "João Pereira"},
        {"tipo": "requerido", "nome": "Pedro Silva"},
    ]
    assert identify_requerido(partes) == "João Pereira e Pedro Silva"
    print("  ✓ test_identify_requerido_dois_requeridos")


def test_identify_requerido_sem_tipo_explicito():
    """Sem REQUERIDO rotulado, cascata cai pra CPF (regra 2)."""
    partes = [
        {"tipo": "parte", "nome": "Maria Silva", "cpf": "111.111.111-11"},
        {"tipo": "representante", "nome": "Defensoria Pública", "oab": "DPE/BA"},
    ]
    # Regra 2: primeira parte com CPF que NÃO é DPE → Maria
    assert identify_requerido(partes) == "Maria Silva"
    print("  ✓ test_identify_requerido_sem_tipo_explicito")


def test_identify_requerido_so_dpe():
    """Só DPE-BA → cascata esgota → None (placeholder)."""
    partes = [
        {"tipo": "representante", "nome": "Defensoria Pública", "oab": "DPE/BA"},
    ]
    assert identify_requerido(partes) is None
    print("  ✓ test_identify_requerido_so_dpe")
```

E adicionar os 4 testes ao `TESTS = [...]`.

- [ ] **Step 2: Rodar — 4 testes novos falham**

```bash
python3 scripts/test_pje_mpu_import.py
```

Esperado: `4/7 testes falharam`.

- [ ] **Step 3: Implementar `identify_requerido` + helper**

Substituir o stub em `scripts/pje_mpu_import.py`:

```python
def _normalize(s: str) -> str:
    import unicodedata
    return unicodedata.normalize("NFD", s).encode("ascii", "ignore").decode().lower()


def _is_dpe(parte: dict) -> bool:
    """DPE-BA: nome contém 'defensoria', tipo='representante', ou OAB='DPE/BA'."""
    nome = _normalize(parte.get("nome", ""))
    tipo = _normalize(parte.get("tipo", ""))
    oab = _normalize(parte.get("oab", ""))
    return "defensoria" in nome or tipo == "representante" or "dpe" in oab


def identify_requerido(partes: list[dict]) -> str | None:
    """Cascata: tipo > CPF > não-DPE > None (placeholder)."""
    # Regra 1: tipo explícito "requerido"
    requeridos = [p for p in partes if _normalize(p.get("tipo", "")) == "requerido"]
    if len(requeridos) == 1:
        return requeridos[0]["nome"]
    if len(requeridos) > 1:
        return " e ".join(p["nome"] for p in requeridos)

    # Regra 2: primeira parte com CPF que NÃO é DPE
    for p in partes:
        if p.get("cpf") and not _is_dpe(p):
            return p["nome"]

    # Regra 3: primeira parte que NÃO é DPE
    for p in partes:
        if not _is_dpe(p):
            return p["nome"]

    return None
```

- [ ] **Step 4: Rodar — todos passam**

```bash
python3 scripts/test_pje_mpu_import.py
```

Esperado: `7/7 testes passaram`.

- [ ] **Step 5: NÃO commitar — segue para Task 5**

---

## Task 5: `format_for_endpoint` (alinha com `parsePJeIntimacoesCompleto`)

**Files:**
- Modify: `scripts/pje_mpu_import.py`
- Modify: `scripts/test_pje_mpu_import.py`

**Contexto:** O parser do endpoint (`src/lib/pje-parser.ts:295-319`) reconhece este formato de bloco:
```
<NOME ASSISTIDO EM MAIÚSCULAS>          (linha 1, opcional — usado se não houver "X")
<Tipo Documento> (id?)                   (linha 2 — ex: "Designação de audiência")
<Prefixo> <CNJ> <crime opcional>         (linha 3 — ex: "MPUMPCrim 8001234-... Maus Tratos")
<Requerente> X <Requerido>               (linha 4 — REQUERIDO é o assistido)
/Vara <nome>                             (linha 5)
Expedição eletrônica (DD/MM/AAAA HH:MM)  (linha 6)
Prazo: N dias                            (linha 7)
```

Blocos separados por linha em branco (`\n\n`).

- [ ] **Step 1: Adicionar 2 testes**

Inserir no `scripts/test_pje_mpu_import.py`:

```python
def test_format_for_endpoint_com_nome():
    expediente = {
        "numero_cnj": "8001234-12.2026.8.05.0039",
        "processo_pje_id": "1234567",
        "data_expedicao": "28/04/2026 10:23",
        "tipo_documento": "Designação de audiência",
        "prazo": "5 dias",
    }
    bloco = format_for_endpoint(expediente, "João Pereira")
    # Confere todos os elementos esperados
    assert "Designação de audiência" in bloco
    assert "MPUMPCrim 8001234-12.2026.8.05.0039" in bloco
    assert "X João Pereira" in bloco
    assert "/Vara de Violência Doméstica" in bloco
    assert "Expedição eletrônica (28/04/2026 10:23)" in bloco
    assert "Prazo: 5 dias" in bloco
    print("  ✓ test_format_for_endpoint_com_nome")


def test_format_for_endpoint_placeholder():
    expediente = {
        "numero_cnj": "8009999-99.2026.8.05.0039",
        "processo_pje_id": "9999999",
        "data_expedicao": "29/04/2026",
        "tipo_documento": "Decisão",
        "prazo": "",
    }
    bloco = format_for_endpoint(expediente, None)
    assert "⚠ A identificar — 8009999-99.2026.8.05.0039" in bloco
    print("  ✓ test_format_for_endpoint_placeholder")
```

E adicionar ao `TESTS`.

- [ ] **Step 2: Rodar — 2 falham**

```bash
python3 scripts/test_pje_mpu_import.py
```

Esperado: `2/9 testes falharam`.

- [ ] **Step 3: Implementar `format_for_endpoint`**

Substituir o stub em `scripts/pje_mpu_import.py`:

```python
PLACEHOLDER_NOME = "⚠ A identificar — {cnj}"
VARA_FIXA = "/Vara de Violência Doméstica de Camaçari"
REQUERENTE_PLACEHOLDER = "REQUERENTE"  # nome anonimizado (sigilo)


def format_for_endpoint(expediente: dict, requerido: str | None) -> str:
    """Bloco de texto no formato consumido por parsePJeIntimacoesCompleto.

    Exemplo de saída:
      Designação de audiência
      MPUMPCrim 8001234-12.2026.8.05.0039
      REQUERENTE X João Pereira
      /Vara de Violência Doméstica de Camaçari
      Expedição eletrônica (28/04/2026 10:23)
      Prazo: 5 dias
    """
    cnj = expediente["numero_cnj"]
    nome_assistido = requerido or PLACEHOLDER_NOME.format(cnj=cnj)

    # Linha 3: prefixo MPUMPCrim para o parser detectar tipoProcesso='MPUMPCrim'
    # e classificar como Medida Protetiva (regex em pje-parser.ts:311)
    linha_processo = f"MPUMPCrim {cnj}"

    linhas: list[str] = []
    if expediente.get("tipo_documento"):
        linhas.append(expediente["tipo_documento"])
    linhas.append(linha_processo)
    linhas.append(f"{REQUERENTE_PLACEHOLDER} X {nome_assistido}")
    linhas.append(VARA_FIXA)
    if expediente.get("data_expedicao"):
        linhas.append(f"Expedição eletrônica ({expediente['data_expedicao']})")
    if expediente.get("prazo"):
        linhas.append(f"Prazo: {expediente['prazo']}")

    return "\n".join(linhas)
```

- [ ] **Step 4: Rodar — todos passam**

```bash
python3 scripts/test_pje_mpu_import.py
```

Esperado: `9/9 testes passaram`.

- [ ] **Step 5: NÃO commitar — segue para Task 6**

---

## Task 6: `navigate_to_vvd_panel` + `main()` orquestração

**Files:**
- Modify: `scripts/pje_mpu_import.py`

**Nota:** `navigate_to_vvd_panel` depende de regex contra HTML real do PJe. Os IDs do JSF/RichFaces (ex: `formAbaExpediente:listaAgrSitExp:1:j_id161`) podem ter sofrido mudanças. Esta função NÃO é testável com fixture sintética sem comprometer fidelidade. Validação real fica em **Task 9** (manual com 1 processo).

- [ ] **Step 1: Adicionar import do scraper Júri (reuso de login)**

Adicionar no topo de `scripts/pje_mpu_import.py`, depois dos imports padrão:

```python
# Reuso: login_requests do scraper Júri (mesmo .env.local, mesma sessão)
sys.path.insert(0, str(Path(__file__).parent))
from pje_intimacoes_scraper import login_requests  # noqa: E402
```

- [ ] **Step 2: Adicionar helpers `log` e `load_env`**

Adicionar em `scripts/pje_mpu_import.py`, ANTES de `parse_expedientes_list`:

```python
def log(msg: str) -> None:
    print(f"[{datetime.datetime.now().strftime('%H:%M:%S')}] {msg}", flush=True)


def load_env() -> dict[str, str]:
    """Carrega .env.local de Projetos/Defender."""
    env_path = Path.home() / "Projetos/Defender/.env.local"
    env: dict[str, str] = dict(os.environ)
    if env_path.exists():
        for line in env_path.read_text().splitlines():
            if "=" in line and not line.strip().startswith("#"):
                k, v = line.split("=", 1)
                env[k.strip()] = v.strip().strip('"').strip("'")
    return env
```

- [ ] **Step 3: Implementar `navigate_to_vvd_panel`**

Adicionar em `scripts/pje_mpu_import.py`, depois de `parse_expedientes_list`:

```python
PJE_PANEL = f"{PJE_BASE}/Painel/painel_usuario/advogado.seam"

PJE_AJAX_HDR = {
    "Content-Type": "application/x-www-form-urlencoded",
    "X-Requested-With": "XMLHttpRequest",
    "Referer": PJE_PANEL,
    "Accept": "application/xml,text/xml",
}


def navigate_to_vvd_panel(session: requests.Session) -> str:
    """Navega EXPEDIENTES → Apenas pendentes → CAMAÇARI → Vara VVD.

    Retorna HTML da listagem de expedientes pendentes (consumido por
    parse_expedientes_list).

    Espelha navigate_to_vara_expedientes do scraper Júri, trocando a
    regex de busca para 'Vara de Violência Doméstica'.
    """
    log("Abrindo painel PJe...")
    r0 = session.get(PJE_PANEL, timeout=30, verify=False)
    html = r0.text

    # Procurar ID da agrupação CAMAÇARI no HTML
    # (espelha _find_camacari_id do scraper Júri)
    cam_m = re.search(
        r'<a[^>]*onclick="[^"]*\'([\w:]+)\'[^"]*"[^>]*>\s*<span[^>]*class="nomeTarefa"[^>]*>\s*CAMA[ÇC]ARI\s*</span>',
        html, re.IGNORECASE,
    )
    if not cam_m:
        raise RuntimeError("ID de CAMAÇARI não encontrado no painel — layout PJe mudou?")
    log(f"CAMAÇARI id={cam_m.group(1)}")

    # Expandir CAMAÇARI via AJAX
    expand_data = {
        "AJAXREQUEST": "_viewRoot",
        cam_m.group(1): cam_m.group(1),
        "javax.faces.ViewState": _extract_viewstate(html),
    }
    r1 = session.post(PJE_PANEL, data=expand_data, headers=PJE_AJAX_HDR, timeout=30, verify=False)

    # Procurar ID da Vara de Violência Doméstica no HTML expandido
    vvd_m = re.search(
        r'<a[^>]*onclick="[^"]*\'([\w:]+)\'[^"]*"[^>]*>\s*<span[^>]*class="nomeTarefa"[^>]*>[^<]*VIOL[ÊE]NCIA\s+DOM[ÉE]STICA[^<]*</span>',
        r1.text, re.IGNORECASE,
    )
    if not vvd_m:
        raise RuntimeError("Vara de Violência Doméstica não encontrada — verificar nome exato no painel PJe")
    log(f"VVD id={vvd_m.group(1)}")

    # Expandir Vara VVD para listar expedientes
    expand_vvd = {
        "AJAXREQUEST": "_viewRoot",
        vvd_m.group(1): vvd_m.group(1),
        "javax.faces.ViewState": _extract_viewstate(r1.text),
    }
    r2 = session.post(PJE_PANEL, data=expand_vvd, headers=PJE_AJAX_HDR, timeout=30, verify=False)
    return r2.text


def _extract_viewstate(html: str) -> str:
    m = re.search(r'name="javax\.faces\.ViewState"[^>]+value="([^"]+)"', html)
    return m.group(1) if m else ""
```

- [ ] **Step 4: Implementar `post_to_ombuds`**

Adicionar em `scripts/pje_mpu_import.py`:

```python
OMBUDS_URL = "https://ombuds.vercel.app/api/cron/pje-import"


def post_to_ombuds(blocos_texto: list[str], cron_secret: str, defensor_id: int) -> dict:
    """POST único com texto VVD concatenado em blocos separados por \\n\\n."""
    texto_vvd = "\n\n".join(blocos_texto)
    payload = json.dumps({
        "textoVvd": texto_vvd,
        "defensorId": defensor_id,
    }).encode()

    import urllib.request
    req = urllib.request.Request(
        OMBUDS_URL,
        data=payload,
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {cron_secret}",
        },
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=120) as r:
        return json.loads(r.read().decode())
```

- [ ] **Step 5: Implementar `main()`**

Substituir o stub `main` em `scripts/pje_mpu_import.py`:

```python
def main() -> None:
    parser = argparse.ArgumentParser(description="Importa MPU do PJe → OMBUDS.")
    parser.add_argument("--dry-run", action="store_true",
                        help="Imprime blocos no stdout, NÃO faz POST")
    parser.add_argument("--processo-pje-id", default=None,
                        help="Filtra para 1 processo só (validação manual)")
    args = parser.parse_args()

    env = load_env()
    if not env.get("PJE_CPF") or not env.get("PJE_SENHA"):
        sys.exit("ERRO: PJE_CPF/PJE_SENHA ausentes no .env.local")

    if not args.dry_run and not env.get("CRON_SECRET"):
        sys.exit("ERRO: CRON_SECRET ausente no .env.local (necessário para POST)")

    defensor_id = int(env.get("CRON_DEFENSOR_ID", "1"))

    # 1. Login
    log("Login no PJe...")
    session = login_requests()  # importado do scraper Júri

    # 2. Navegar até painel VVD
    log("Navegando para Vara de Violência Doméstica...")
    html_painel = navigate_to_vvd_panel(session)

    # 3. Parsear expedientes
    expedientes = parse_expedientes_list(html_painel)
    log(f"Encontrados {len(expedientes)} expedientes pendentes")
    if args.processo_pje_id:
        expedientes = [e for e in expedientes if e["processo_pje_id"] == args.processo_pje_id]
        log(f"Filtrado para processo_pje_id={args.processo_pje_id} → {len(expedientes)} restantes")
    if not expedientes:
        log("Nada a importar.")
        sys.exit(0)

    # 4. Para cada expediente: resolver sigilo + identificar + formatar
    blocos: list[str] = []
    placeholders = 0
    falhas = 0
    via_counts: dict[str, int] = {}

    for i, e in enumerate(expedientes, 1):
        log(f"[{i}/{len(expedientes)}] {e['numero_cnj']} (pjeId={e['processo_pje_id']})")
        try:
            r = resolve_polo_passivo(session, e["processo_pje_id"])
            via_counts[r["via"]] = via_counts.get(r["via"], 0) + 1
            requerido = identify_requerido(r["partes"])
            if requerido is None:
                placeholders += 1
                log(f"  ⚠ placeholder (via={r['via']})")
            else:
                log(f"  REQUERIDO={requerido} (via={r['via']})")
            bloco = format_for_endpoint(e, requerido)
            blocos.append(bloco)
        except Exception as exc:
            falhas += 1
            log(f"  ✗ {type(exc).__name__}: {exc}")
            continue
        time.sleep(0.3)  # gentil com PJe

    # 5. POST (ou dry-run)
    if args.dry_run:
        print("\n" + "=" * 60)
        print("DRY-RUN — nenhum POST será feito")
        print("=" * 60)
        for b in blocos:
            print(b)
            print()
        print(f"Total: {len(blocos)} blocos | placeholders: {placeholders} | falhas: {falhas} | vias: {via_counts}")
        sys.exit(0)

    log(f"POST {len(blocos)} blocos ao OMBUDS...")
    result = post_to_ombuds(blocos, env["CRON_SECRET"], defensor_id)

    # 6. Relatório
    vvd = result.get("vvd", {})
    print("\n" + "=" * 60)
    print(f"RELATÓRIO MPU IMPORT — {datetime.datetime.now().strftime('%Y-%m-%d %H:%M')}")
    print("=" * 60)
    print(f"Expedientes processados: {len(expedientes)}")
    print(f"Blocos enviados:         {len(blocos)}")
    print(f"  - importados:          {vvd.get('imported', '?')}")
    print(f"  - atualizados:         {vvd.get('updated', '?')}")
    print(f"  - duplicatas (skip):   {vvd.get('skipped', '?')}")
    print(f"Placeholders (REQUERIDO não identificado): {placeholders}")
    print(f"Falhas durante scraping:                   {falhas}")
    print(f"Vias usadas (sigilo): {via_counts}")
    print("=" * 60)
```

- [ ] **Step 6: Sanity check — script ainda parseia e testes passam**

```bash
python3 -c "import ast; ast.parse(open('scripts/pje_mpu_import.py').read()); print('OK')"
python3 scripts/test_pje_mpu_import.py
```

Esperado: `OK` + `9/9 testes passaram`.

- [ ] **Step 7: NÃO commitar — segue para Task 7**

---

## Task 7: Endpoint — aceitar `textoVvd`

**Files:**
- Modify: `src/app/api/cron/pje-import/route.ts:89-129`

- [ ] **Step 1: Adicionar `textoVvd` ao tipo do body**

Localizar (linha ~89):

```typescript
  let body: { textoJuri?: string; textoExecucoes?: string; defensorId?: number };
```

Substituir por:

```typescript
  let body: { textoJuri?: string; textoExecucoes?: string; textoVvd?: string; defensorId?: number };
```

- [ ] **Step 2: Adicionar processamento paralelo de `textoVvd`**

Localizar (linhas ~105-113):

```typescript
  // 4. Processar cada texto em paralelo
  const [resultadoJuri, resultadoExecucoes] = await Promise.all([
    body.textoJuri
      ? processarTexto(body.textoJuri, "Tribunal do Júri", defensorId)
      : Promise.resolve({ imported: 0, updated: 0, skipped: 0, errors: [] }),
    body.textoExecucoes
      ? processarTexto(body.textoExecucoes, "Execução Penal", defensorId)
      : Promise.resolve({ imported: 0, updated: 0, skipped: 0, errors: [] }),
  ]);
```

Substituir por:

```typescript
  // 4. Processar cada texto em paralelo
  const [resultadoJuri, resultadoExecucoes, resultadoVvd] = await Promise.all([
    body.textoJuri
      ? processarTexto(body.textoJuri, "Tribunal do Júri", defensorId)
      : Promise.resolve({ imported: 0, updated: 0, skipped: 0, errors: [] }),
    body.textoExecucoes
      ? processarTexto(body.textoExecucoes, "Execução Penal", defensorId)
      : Promise.resolve({ imported: 0, updated: 0, skipped: 0, errors: [] }),
    body.textoVvd
      ? processarTexto(body.textoVvd, "VVD_CAMACARI", defensorId)
      : Promise.resolve({ imported: 0, updated: 0, skipped: 0, errors: [] }),
  ]);
```

- [ ] **Step 3: Atualizar log e response**

Localizar (linhas ~115-128):

```typescript
  const totalNovas = resultadoJuri.imported + resultadoExecucoes.imported;

  console.log(
    `[pje-import] Júri: +${resultadoJuri.imported} skip=${resultadoJuri.skipped} | ` +
    `Exec: +${resultadoExecucoes.imported} skip=${resultadoExecucoes.skipped} | ` +
    `Total novas: ${totalNovas}`,
  );

  return NextResponse.json({
    ok: true,
    juri: resultadoJuri,
    execucoes: resultadoExecucoes,
    totalNovas,
  });
```

Substituir por:

```typescript
  const totalNovas = resultadoJuri.imported + resultadoExecucoes.imported + resultadoVvd.imported;

  console.log(
    `[pje-import] Júri: +${resultadoJuri.imported} skip=${resultadoJuri.skipped} | ` +
    `Exec: +${resultadoExecucoes.imported} skip=${resultadoExecucoes.skipped} | ` +
    `VVD: +${resultadoVvd.imported} skip=${resultadoVvd.skipped} | ` +
    `Total novas: ${totalNovas}`,
  );

  return NextResponse.json({
    ok: true,
    juri: resultadoJuri,
    execucoes: resultadoExecucoes,
    vvd: resultadoVvd,
    totalNovas,
  });
```

- [ ] **Step 4: Type check**

```bash
pnpm tsc --noEmit 2>&1 | head -20
```

Esperado: nenhum erro relacionado a `route.ts`. Se aparecer erro de tipo `ImportRow.atribuicao` (string), confirmar que `ATRIBUICAO_TO_ENUM["VVD_CAMACARI"]` existe (já confirmado no spec — `pje-import.ts:111`).

- [ ] **Step 5: NÃO commitar — segue para Task 8**

---

## Task 8: Endpoint — upsert MPU em `processos_vvd` pós-import

**Files:**
- Modify: `src/app/api/cron/pje-import/route.ts`
- Read first: `src/lib/db/schema/vvd.ts` (para confirmar shape de `processosVvd`)

**Contexto:** Quando o `processarTexto(textoVvd, "VVD_CAMACARI")` cria/atualiza processos, eles vão para `processos` com `atribuicao='VVD_CAMACARI'`, mas **não escrevem em `processos_vvd`**. Precisamos detectar quais são MPU (numero `MPUMP*` ou `tipoProcesso='MPUMPCrim'`) e fazer upsert.

- [ ] **Step 1: Localizar como o batch é rastreado**

Ler `src/lib/services/pje-import.ts` linhas 163-220 para entender como `importarDemandas` retorna IDs/numeros de processos criados.

Se `ImportResult` não trouxer numeros, não há como filtrar por batch. Estratégia alternativa (mais simples e idempotente): após o import VVD, rodar um update SQL global que sincroniza qualquer processo VVD com numero `MPUMP*` que ainda não tenha entrada em `processos_vvd`.

- [ ] **Step 2: Adicionar helper `syncMpuProcessosVvd` no route.ts**

Inserir em `src/app/api/cron/pje-import/route.ts`, ANTES de `export async function POST`:

```typescript
import { db } from "@/lib/db";
import { processos } from "@/lib/db/schema/core";
import { processosVvd } from "@/lib/db/schema/vvd";
import { and, eq, isNull, like, sql } from "drizzle-orm";

/**
 * Após o import VVD, garante que todo processo MPU (numero MPUMP* ou
 * classe contendo "Medida Protetiva") tenha entrada em processos_vvd
 * com tipo_processo='MPU' e mpu_ativa=true.
 *
 * Idempotente: só insere quando não existe; não sobrescreve dados manuais.
 */
async function syncMpuProcessosVvd(): Promise<{ created: number }> {
  // Processos VVD com numero MPUMP* sem entrada em processos_vvd
  const processosMpu = await db
    .select({ id: processos.id, numero: processos.numeroAutos })
    .from(processos)
    .leftJoin(processosVvd, eq(processosVvd.processoId, processos.id))
    .where(
      and(
        eq(processos.atribuicao, "VVD_CAMACARI"),
        like(processos.numeroAutos, "MPUMP%"),
        isNull(processosVvd.id),
      ),
    );

  if (processosMpu.length === 0) {
    return { created: 0 };
  }

  await db.insert(processosVvd).values(
    processosMpu.map((p) => ({
      processoId: p.id,
      tipoProcesso: "MPU",
      mpuAtiva: true,
    })),
  );

  return { created: processosMpu.length };
}
```

**Nota:** se o nome real da coluna for diferente (ex: `mpu_ativa` vs `mpuAtiva`), ajustar para o que estiver em `src/lib/db/schema/vvd.ts`. Plano 1 da reforma MPU (`a4e44db4`) já criou as colunas — confirmar nomes exatos abrindo o schema.

- [ ] **Step 3: Chamar o helper depois do `Promise.all` quando houver `textoVvd`**

Localizar o trecho modificado em Task 7 Step 3 (depois do `const totalNovas = ...`):

```typescript
  const totalNovas = resultadoJuri.imported + resultadoExecucoes.imported + resultadoVvd.imported;
```

Adicionar logo abaixo:

```typescript
  // Sync MPU em processos_vvd (apenas se VVD foi importado)
  let mpuSync = { created: 0 };
  if (body.textoVvd) {
    mpuSync = await syncMpuProcessosVvd();
    console.log(`[pje-import] MPU sync: +${mpuSync.created} entradas em processos_vvd`);
  }
```

E adicionar `mpuSync` ao response JSON:

```typescript
  return NextResponse.json({
    ok: true,
    juri: resultadoJuri,
    execucoes: resultadoExecucoes,
    vvd: resultadoVvd,
    mpuSync,
    totalNovas,
  });
```

- [ ] **Step 4: Type check + lint**

```bash
pnpm tsc --noEmit 2>&1 | head -20
```

Esperado: nenhum erro novo. Se houver erro nos imports do schema, ajustar paths para os exports reais (verificar com `grep "export.*processosVvd" src/lib/db/schema/vvd.ts`).

- [ ] **Step 5: NÃO commitar — segue para Task 9 (validação manual)**

---

## Task 9: Validação manual end-to-end (1 processo)

**Files:** nenhum (apenas execução)

**Pré-requisito:** o servidor OMBUDS de produção precisa estar com o código modificado (Tasks 7-8) deployado. Como o endpoint `/api/cron/pje-import` aponta para `https://ombuds.vercel.app`, fazer deploy preview ANTES desta task. Alternativa: subir `pnpm dev` localmente e mudar `OMBUDS_URL` em `pje_mpu_import.py` para `http://localhost:3000` durante o dry-run.

- [ ] **Step 1: Subir servidor local**

```bash
pnpm dev
```

Esperar `Ready on http://localhost:3000`.

- [ ] **Step 2: Editar `OMBUDS_URL` no script para apontar local**

Em `scripts/pje_mpu_import.py`, MUDAR temporariamente:

```python
OMBUDS_URL = "https://ombuds.vercel.app/api/cron/pje-import"
```

Para:

```python
OMBUDS_URL = "http://localhost:3000/api/cron/pje-import"
```

- [ ] **Step 3: Dry-run cobrindo TODOS os pendentes (sem POST)**

```bash
python3 scripts/pje_mpu_import.py --dry-run 2>&1 | tee /tmp/mpu-dry-run.log
```

Esperado:
- Login OK
- "Encontrados N expedientes pendentes" — N entre 25 e 35 (esperamos 31)
- Para cada expediente: linha com REQUERIDO=<nome> ou ⚠ placeholder
- Resumo final com `via_counts` mostrando majoritariamente `listView` (1ª via)
- Os blocos de texto formatados aparecem no stdout

**Validação visual obrigatória:**
- Os nomes dos REQUERIDOS fazem sentido (não são "Defensoria Pública" nem "Maria Silva" se Maria é a REQUERENTE)?
- Há blocos com formato bem estruturado (todas as 6-7 linhas presentes)?

Se algo bate estranho, voltar à Task correspondente (parse, identify, format) e iterar com fixture mais realista.

- [ ] **Step 4: Pegar 1 processo do log e rodar real (ainda local)**

Escolher 1 `processo_pje_id` do log do Step 3 cujo REQUERIDO foi identificado corretamente.

```bash
python3 scripts/pje_mpu_import.py --processo-pje-id=<ID_ESCOLHIDO>
```

Esperado:
- Mesma linha do dry-run (nome do REQUERIDO)
- "POST 1 blocos ao OMBUDS..."
- Relatório final com `vvd: { imported: 1 }` e `mpuSync: { created: 1 }`

- [ ] **Step 5: Verificar no DB**

```bash
SB_URL=$(grep '^NEXT_PUBLIC_SUPABASE_URL=' .env.local | cut -d= -f2- | tr -d '"')
SB_KEY=$(grep '^SUPABASE_SERVICE_ROLE_KEY=' .env.local | cut -d= -f2- | tr -d '"')
curl -s "${SB_URL}/rest/v1/demandas?select=id,ato,status,processos!inner(numero_autos,atribuicao,processosVvd:processos_vvd(tipo_processo,mpu_ativa)),assistidos!inner(nome)&order=created_at.desc&limit=3" \
  -H "apikey: $SB_KEY" -H "Authorization: Bearer $SB_KEY" \
  | python3 -m json.tool
```

Esperado, no topo da lista:
- demanda nova com `status: "5_TRIAGEM"`
- `processos.atribuicao: "VVD_CAMACARI"`
- `processos.processosVvd[0].tipo_processo: "MPU"`, `mpu_ativa: true`
- `assistidos.nome` = nome do REQUERIDO (NÃO "Defensoria Pública")

Se algo falhar, INVESTIGAR antes de seguir. Possíveis causas:
- `parsePJeIntimacoesCompleto` não reconheceu o bloco → ver `tipoProcessoCrime` regex
- `syncMpuProcessosVvd` query com nome de coluna errado
- `atribuicao` não foi mapeada → verificar `ATRIBUICAO_TO_ENUM`

- [ ] **Step 6: REVERTER `OMBUDS_URL` para produção**

Em `scripts/pje_mpu_import.py`, voltar para:

```python
OMBUDS_URL = "https://ombuds.vercel.app/api/cron/pje-import"
```

- [ ] **Step 7: NÃO commitar — segue para Task 10**

---

## Task 10: Run nos 30 restantes + commit + merge

**Files:** nenhum (apenas execução + commits)

- [ ] **Step 1: Confirmar que tudo está limpo**

```bash
git status
```

Esperado: arquivos modificados/novos das Tasks 1-8:
- novos: `scripts/pje_mpu_import.py`, `scripts/test_pje_mpu_import.py`
- modificados: `src/app/api/cron/pje-import/route.ts`

Sem outros arquivos. Se houver, stash.

- [ ] **Step 2: Rodar testes finais**

```bash
python3 scripts/test_pje_mpu_import.py
```

Esperado: `9/9 testes passaram`.

- [ ] **Step 3: Criar branch e commit**

```bash
git checkout -b feat/mpu-importer
git add scripts/pje_mpu_import.py scripts/test_pje_mpu_import.py src/app/api/cron/pje-import/route.ts
git commit -m "$(cat <<'EOF'
feat(mpu): importador automático de MPU PJe → OMBUDS

Fecha o gap das ~31 MPU pendentes no painel PJe que nunca chegavam ao
DB. Novo script standalone Python + 2 alterações cirúrgicas no endpoint
/api/cron/pje-import.

scripts/pje_mpu_import.py:
- parse_expedientes_list: extrai expedientes do painel VVD
- resolve_polo_passivo: 1ª via privilegiada (listView.seam) + fallback `ca`
- identify_requerido: cascata (tipo > CPF > não-DPE > placeholder)
- format_for_endpoint: bloco compatível com parsePJeIntimacoesCompleto
- main(): --dry-run e --processo-pje-id flags para validação manual

scripts/test_pje_mpu_import.py:
- 9 testes sintéticos (parse, sigilo, identify cascata, format)

src/app/api/cron/pje-import/route.ts:
- aceita textoVvd no payload; chama processarTexto com VVD_CAMACARI
- syncMpuProcessosVvd: insere em processos_vvd para todo MPU sem entrada

Spec: docs/superpowers/specs/2026-05-04-mpu-importer-design.md

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

- [ ] **Step 4: Deploy preview no Vercel ANTES de rodar nos 30 restantes**

Push da branch:

```bash
git push origin feat/mpu-importer
```

Aguardar Vercel preview deploy (~2 min). Pegar URL do preview (algo como `https://defender-git-feat-mpu-importer-rodrigo.vercel.app`).

- [ ] **Step 5: Editar `OMBUDS_URL` para preview, rodar nos 30 restantes**

Editar `scripts/pje_mpu_import.py` temporariamente:

```python
OMBUDS_URL = "https://defender-git-feat-mpu-importer-rodrigo.vercel.app/api/cron/pje-import"
```

(ajuste o subdomínio para o real do preview)

```bash
python3 scripts/pje_mpu_import.py 2>&1 | tee /tmp/mpu-run.log
```

Esperado:
- Login OK
- "Encontrados ~30 expedientes pendentes" (menos 1 que já entrou no Step 4 da Task 9)
- Cada expediente processado
- POST com 30 blocos
- Relatório: imported ≈ 30, mpuSync created ≈ 30, placeholders ≤ 6 (≤20%)

- [ ] **Step 6: Verificar no DB final**

```bash
SB_URL=$(grep '^NEXT_PUBLIC_SUPABASE_URL=' .env.local | cut -d= -f2- | tr -d '"')
SB_KEY=$(grep '^SUPABASE_SERVICE_ROLE_KEY=' .env.local | cut -d= -f2- | tr -d '"')
curl -s "${SB_URL}/rest/v1/processos_vvd?select=processo_id,tipo_processo,mpu_ativa,processos:processos_vvd_processo_id_fkey(numero_autos,atribuicao)&tipo_processo=eq.MPU&limit=100" \
  -H "apikey: $SB_KEY" -H "Authorization: Bearer $SB_KEY" \
  | python3 -c "import json, sys; d = json.load(sys.stdin); print(f'{len(d)} processos MPU em processos_vvd')"
```

Esperado: número total ≥ 31.

- [ ] **Step 7: REVERTER `OMBUDS_URL` para produção e commit ajuste**

```bash
git diff scripts/pje_mpu_import.py
```

Se ainda tem `OMBUDS_URL` apontando para preview, editar de volta:

```python
OMBUDS_URL = "https://ombuds.vercel.app/api/cron/pje-import"
```

```bash
git add scripts/pje_mpu_import.py
git commit -m "chore: revert OMBUDS_URL para produção após validação preview"
```

- [ ] **Step 8: Push + merge para main**

Antes de merge, **confirmar com o usuário**:
- Mostrar relatório do Step 5 (imported / placeholders / falhas)
- Mostrar verificação do DB (Step 6)
- Pedir aprovação explícita para merge

Após aprovação:

```bash
git push origin feat/mpu-importer
git push origin feat/mpu-importer:main
```

(Fast-forward direto se a branch tem só estes commits acima de `main`. Se houver divergência, abrir como PR.)

- [ ] **Step 9: Atualizar memória do projeto**

Salvar memory `project_mpu_importer_done.md` com: data de execução, número final de MPU importados, taxa de placeholders, observações sobre layout PJe que vão ajudar na próxima manutenção.

---

## Self-Review (run after writing the plan)

**1. Spec coverage:**
- ✅ Resolver sigilo no mesmo import → Task 2 (1ª via) + Task 3 (fallback)
- ✅ Cascata REQUERIDO → Task 4
- ✅ One-shot agora → Task 9 (1 processo) + Task 10 (30 restantes)
- ✅ Script standalone novo → Tasks 1-6
- ✅ Endpoint aceita textoVvd → Task 7
- ✅ Upsert MPU em processos_vvd → Task 8
- ✅ listView 1ª via, ca fallback → Task 2 + Task 3
- ✅ format_for_endpoint compatível com parser → Task 5 (com regex linha 311 do parser referenciada)
- ✅ Tolerância per-process → Task 6 main() (try/except por expediente)
- ✅ Testes sintéticos 8/8 (na verdade 9 com test_identify_requerido_so_dpe) → Tasks 1-5
- ✅ Validação manual obrigatória → Task 9
- ✅ Critérios de pronto (≥80%) → Task 10 Step 5

**2. Placeholder scan:** ✅ todos os steps têm código completo ou comandos exatos.

**3. Type consistency:**
- `parse_expedientes_list` retorna dict com chaves `numero_cnj, processo_pje_id, data_expedicao, tipo_documento, prazo` — usado consistentemente em Tasks 1, 5, 6.
- `resolve_polo_passivo` retorna `{partes: list[dict], via: str}` — Tasks 2, 3, 6.
- `identify_requerido(partes) -> str | None` — Tasks 4, 6.
- `format_for_endpoint(expediente, requerido) -> str` — Tasks 5, 6.

Tudo consistente.
