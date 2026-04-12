# MCP Defender-Brasil — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a lean MCP server (2 tools) + 2 Claude Code skills that give the Defensoria Pública access to dados judiciais, demográficos e de violência sem alucinação.

**Architecture:** FastMCP Python server with httpx clients for DataJud (CNJ), IBGE, Atlas da Violência, and BrasilAPI. Skills use WebSearch for jurisprudência textual.

**Tech Stack:** Python 3.12, FastMCP >=3.0, httpx, uv

---

## File Structure

```
mcp-defender-brasil/
├── pyproject.toml              # Project config + dependencies
├── server.py                   # FastMCP server, registers 2 tools
├── clients/
│   ├── __init__.py
│   ├── datajud.py              # Elasticsearch POST to DataJud/CNJ
│   ├── atlas.py                # GET Atlas da Violência IPEA
│   ├── ibge.py                 # GET IBGE agregados + municípios
│   └── brasilapi.py            # GET BrasilAPI CEP
├── formatters/
│   ├── __init__.py
│   ├── datajud.py              # Process hits → readable text
│   └── localidade.py           # Demo + violence data → readable text
└── tests/
    ├── __init__.py
    ├── test_datajud_client.py
    ├── test_localidade_clients.py
    ├── test_datajud_formatter.py
    ├── test_localidade_formatter.py
    └── test_server.py

Defender/.claude/commands/
├── jurisprudencia.md           # Skill: WebSearch-based jurisprudence
└── contexto-local.md           # Skill: orchestrates dados_localidade tool
```

---

### Task 1: Project scaffold + pyproject.toml

**Files:**
- Create: `mcp-defender-brasil/pyproject.toml`
- Create: `mcp-defender-brasil/clients/__init__.py`
- Create: `mcp-defender-brasil/formatters/__init__.py`
- Create: `mcp-defender-brasil/tests/__init__.py`

- [ ] **Step 1: Create project directory**

```bash
mkdir -p /Users/rodrigorochameire/Projetos/Defender/mcp-defender-brasil/{clients,formatters,tests}
```

- [ ] **Step 2: Write pyproject.toml**

```toml
[project]
name = "mcp-defender-brasil"
version = "0.1.0"
description = "MCP server for Brazilian public legal and demographic data"
requires-python = ">=3.12"
dependencies = [
    "fastmcp>=3.0",
    "httpx>=0.27",
]

[project.optional-dependencies]
dev = [
    "pytest>=8.0",
    "pytest-asyncio>=0.24",
    "respx>=0.22",
]

[build-system]
requires = ["hatchling"]
build-backend = "hatchling.build"
```

- [ ] **Step 3: Create empty __init__.py files**

Create empty `__init__.py` in `clients/`, `formatters/`, `tests/`.

- [ ] **Step 4: Initialize uv environment**

```bash
cd /Users/rodrigorochameire/Projetos/Defender/mcp-defender-brasil && uv sync --dev
```

Expected: Dependencies installed, `.venv/` created.

- [ ] **Step 5: Commit**

```bash
git add mcp-defender-brasil/
git commit -m "feat: scaffold mcp-defender-brasil project"
```

---

### Task 2: DataJud client (Elasticsearch)

**Files:**
- Create: `mcp-defender-brasil/clients/datajud.py`
- Test: `mcp-defender-brasil/tests/test_datajud_client.py`

- [ ] **Step 1: Write the failing test**

```python
# tests/test_datajud_client.py
import pytest
import httpx
import respx
from clients.datajud import buscar_processos

MOCK_RESPONSE = {
    "hits": {
        "total": {"value": 1},
        "hits": [
            {
                "_source": {
                    "numeroProcesso": "00123456720238130001",
                    "classe": {"codigo": 1116, "nome": "Agravo em Recurso Especial"},
                    "tribunal": "STJ",
                    "grau": "SUP",
                    "dataAjuizamento": "2023-06-15T00:00:00.000Z",
                    "assuntos": [{"codigo": 3421, "nome": "Homicídio qualificado"}],
                    "orgaoJulgador": {"codigo": 10, "nome": "5ª Turma"},
                    "movimentos": [
                        {
                            "codigo": 22,
                            "nome": "Julgado",
                            "dataHora": "2024-01-20T14:30:00.000Z",
                        }
                    ],
                }
            }
        ],
    }
}


@pytest.mark.asyncio
async def test_buscar_processos_by_assunto():
    with respx.mock:
        respx.post(
            "https://api-publica.datajud.cnj.jus.br/api_publica_stj/_search"
        ).mock(return_value=httpx.Response(200, json=MOCK_RESPONSE))

        results = await buscar_processos(
            query="homicídio qualificado", tribunal="stj", campo="assuntos", limite=5
        )

    assert len(results) == 1
    assert results[0]["numero"] == "00123456720238130001"
    assert results[0]["classe"] == "Agravo em Recurso Especial"
    assert results[0]["tribunal"] == "STJ"
    assert results[0]["assuntos"] == ["Homicídio qualificado"]
    assert results[0]["orgao"] == "5ª Turma"
    assert results[0]["ultima_movimentacao"]["nome"] == "Julgado"


@pytest.mark.asyncio
async def test_buscar_processos_empty():
    with respx.mock:
        respx.post(
            "https://api-publica.datajud.cnj.jus.br/api_publica_stj/_search"
        ).mock(
            return_value=httpx.Response(
                200, json={"hits": {"total": {"value": 0}, "hits": []}}
            )
        )

        results = await buscar_processos(query="xyz inexistente", tribunal="stj")

    assert results == []


@pytest.mark.asyncio
async def test_buscar_processos_by_numero():
    with respx.mock:
        respx.post(
            "https://api-publica.datajud.cnj.jus.br/api_publica_stj/_search"
        ).mock(return_value=httpx.Response(200, json=MOCK_RESPONSE))

        results = await buscar_processos(
            query="0012345-67.2023.8.13.0001", tribunal="stj", campo="numero"
        )

    assert len(results) == 1
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd /Users/rodrigorochameire/Projetos/Defender/mcp-defender-brasil && uv run pytest tests/test_datajud_client.py -v
```

Expected: FAIL — `ModuleNotFoundError: No module named 'clients.datajud'`

- [ ] **Step 3: Write datajud client**

```python
# clients/datajud.py
import httpx

BASE_URL = "https://api-publica.datajud.cnj.jus.br"
API_KEY = "cDZHYzlZa0JadVREZDJCendQbXY6SkJlTzNjLV9TRENyQk1RdnFKZGRQdw=="
HEADERS = {
    "Content-Type": "application/json",
    "Authorization": f"APIKey {API_KEY}",
}


def _build_query(query: str, campo: str, limite: int) -> dict:
    if campo == "numero":
        cleaned = query.replace("-", "").replace(".", "")
        return {
            "size": limite,
            "query": {"match": {"numeroProcesso": cleaned}},
        }
    if campo == "classe":
        return {
            "size": limite,
            "query": {"match": {"classe.nome": query}},
        }
    if campo == "texto_livre":
        return {
            "size": limite,
            "query": {
                "multi_match": {
                    "query": query,
                    "fields": ["assuntos.nome", "classe.nome", "orgaoJulgador.nome"],
                }
            },
        }
    # default: assuntos
    return {
        "size": limite,
        "query": {"match": {"assuntos.nome": query}},
    }


def _parse_hit(hit: dict) -> dict:
    src = hit.get("_source", {})
    movimentos = src.get("movimentos", [])
    ultima = movimentos[0] if movimentos else None
    return {
        "numero": src.get("numeroProcesso", ""),
        "classe": src.get("classe", {}).get("nome", ""),
        "tribunal": src.get("tribunal", ""),
        "grau": src.get("grau", ""),
        "data_ajuizamento": src.get("dataAjuizamento", ""),
        "assuntos": [a.get("nome", "") for a in src.get("assuntos", [])],
        "orgao": src.get("orgaoJulgador", {}).get("nome", ""),
        "ultima_movimentacao": (
            {"nome": ultima.get("nome", ""), "data": ultima.get("dataHora", "")}
            if ultima
            else None
        ),
    }


async def buscar_processos(
    query: str,
    tribunal: str = "stj",
    campo: str = "assuntos",
    limite: int = 5,
) -> list[dict]:
    url = f"{BASE_URL}/api_publica_{tribunal}/_search"
    body = _build_query(query, campo, limite)
    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.post(url, json=body, headers=HEADERS)
        resp.raise_for_status()
    data = resp.json()
    hits = data.get("hits", {}).get("hits", [])
    return [_parse_hit(h) for h in hits]
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd /Users/rodrigorochameire/Projetos/Defender/mcp-defender-brasil && uv run pytest tests/test_datajud_client.py -v
```

Expected: 3 tests PASS

- [ ] **Step 5: Commit**

```bash
git add mcp-defender-brasil/clients/datajud.py mcp-defender-brasil/tests/test_datajud_client.py
git commit -m "feat: add DataJud/CNJ client with Elasticsearch queries"
```

---

### Task 3: IBGE + Atlas Violência + BrasilAPI clients

**Files:**
- Create: `mcp-defender-brasil/clients/ibge.py`
- Create: `mcp-defender-brasil/clients/atlas.py`
- Create: `mcp-defender-brasil/clients/brasilapi.py`
- Test: `mcp-defender-brasil/tests/test_localidade_clients.py`

- [ ] **Step 1: Write the failing tests**

```python
# tests/test_localidade_clients.py
import pytest
import httpx
import respx
from clients.ibge import buscar_municipio, buscar_populacao
from clients.atlas import buscar_violencia
from clients.brasilapi import buscar_cep

MOCK_MUNICIPIO = {
    "id": 2905701,
    "nome": "Camaçari",
    "microrregiao": {
        "id": 29021,
        "nome": "Salvador",
        "mesorregiao": {
            "id": 2905,
            "nome": "Metropolitana de Salvador",
            "UF": {
                "id": 29,
                "sigla": "BA",
                "nome": "Bahia",
                "regiao": {"id": 2, "sigla": "NE", "nome": "Nordeste"},
            },
        },
    },
}

MOCK_POPULACAO = [
    {
        "id": "9324",
        "variavel": "População residente estimada",
        "unidade": "Pessoas",
        "resultados": [
            {
                "classificacoes": [],
                "series": [
                    {
                        "localidade": {"id": "2905701", "nome": "Camaçari (BA)"},
                        "serie": {"2025": "321636"},
                    }
                ],
            }
        ],
    }
]

MOCK_VIOLENCIA = [
    {"cod": "2905701", "sigla": "Camaçari", "valor": "250", "periodo": "2023-01-15"},
    {"cod": "2905701", "sigla": "Camaçari", "valor": "255", "periodo": "2022-01-15"},
]

MOCK_CEP = {
    "cep": "01001000",
    "state": "SP",
    "city": "São Paulo",
    "neighborhood": "Sé",
    "street": "Praça da Sé",
    "service": "open-cep",
}


@pytest.mark.asyncio
async def test_buscar_municipio():
    with respx.mock:
        respx.get(
            "https://servicodados.ibge.gov.br/api/v1/localidades/municipios/2905701"
        ).mock(return_value=httpx.Response(200, json=MOCK_MUNICIPIO))

        result = await buscar_municipio("2905701")

    assert result["nome"] == "Camaçari"
    assert result["uf"] == "BA"
    assert result["mesorregiao"] == "Metropolitana de Salvador"
    assert result["regiao"] == "Nordeste"


@pytest.mark.asyncio
async def test_buscar_populacao():
    with respx.mock:
        respx.get(
            url__regex=r"servicodados\.ibge\.gov\.br/api/v3/agregados/6579/.*"
        ).mock(return_value=httpx.Response(200, json=MOCK_POPULACAO))

        result = await buscar_populacao("2905701")

    assert result["populacao"] == 321636
    assert result["ano"] == "2025"


@pytest.mark.asyncio
async def test_buscar_violencia():
    with respx.mock:
        respx.get(
            url__regex=r"ipea\.gov\.br/atlasviolencia/api/v1/valores-series-por-regioes/.*"
        ).mock(return_value=httpx.Response(200, json=MOCK_VIOLENCIA))

        result = await buscar_violencia("2905701")

    assert len(result) == 2
    assert result[0]["valor"] == 250
    assert result[0]["ano"] == 2023


@pytest.mark.asyncio
async def test_buscar_cep():
    with respx.mock:
        respx.get("https://brasilapi.com.br/api/cep/v1/01001000").mock(
            return_value=httpx.Response(200, json=MOCK_CEP)
        )

        result = await buscar_cep("01001-000")

    assert result["cidade"] == "São Paulo"
    assert result["uf"] == "SP"
    assert result["logradouro"] == "Praça da Sé"
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd /Users/rodrigorochameire/Projetos/Defender/mcp-defender-brasil && uv run pytest tests/test_localidade_clients.py -v
```

Expected: FAIL — modules not found

- [ ] **Step 3: Write IBGE client**

```python
# clients/ibge.py
import httpx

BASE_URL = "https://servicodados.ibge.gov.br/api"


async def buscar_municipio(cod_ibge: str) -> dict:
    url = f"{BASE_URL}/v1/localidades/municipios/{cod_ibge}"
    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.get(url)
        resp.raise_for_status()
    data = resp.json()
    meso = data.get("microrregiao", {}).get("mesorregiao", {})
    uf_data = meso.get("UF", {})
    return {
        "nome": data.get("nome", ""),
        "cod_ibge": str(data.get("id", "")),
        "uf": uf_data.get("sigla", ""),
        "uf_nome": uf_data.get("nome", ""),
        "mesorregiao": meso.get("nome", ""),
        "regiao": uf_data.get("regiao", {}).get("nome", ""),
    }


async def buscar_populacao(cod_ibge: str) -> dict:
    url = (
        f"{BASE_URL}/v3/agregados/6579/periodos/-1/variaveis/9324"
        f"?localidades=N6%5B{cod_ibge}%5D"
    )
    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.get(url)
        resp.raise_for_status()
    data = resp.json()
    series = data[0]["resultados"][0]["series"][0]["serie"]
    ano = max(series.keys())
    return {
        "populacao": int(series[ano]),
        "ano": ano,
    }
```

- [ ] **Step 4: Write Atlas Violência client**

```python
# clients/atlas.py
import httpx

BASE_URL = "https://www.ipea.gov.br/atlasviolencia/api/v1"

# Series pré-mapeadas (descobertas via /temas + /series/{tema_id})
SERIES = {
    "homicidios": 328,       # Homicídios (absoluto)
    "taxa_homicidios": 20,   # Taxa de homicídios por 100 mil
}


async def buscar_violencia(
    cod_ibge: str, serie: str = "homicidios"
) -> list[dict]:
    serie_id = SERIES.get(serie, SERIES["homicidios"])
    url = f"{BASE_URL}/valores-series-por-regioes/{serie_id}/4/{cod_ibge}"
    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.get(url)
        resp.raise_for_status()
    data = resp.json()
    return [
        {
            "ano": int(item["periodo"][:4]),
            "valor": int(float(item["valor"])),
            "municipio": item.get("sigla", ""),
        }
        for item in data
        if item.get("valor")
    ]
```

- [ ] **Step 5: Write BrasilAPI client**

```python
# clients/brasilapi.py
import httpx

BASE_URL = "https://brasilapi.com.br/api"


async def buscar_cep(cep: str) -> dict:
    cleaned = cep.replace("-", "").replace(".", "").strip()
    url = f"{BASE_URL}/cep/v1/{cleaned}"
    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.get(url)
        resp.raise_for_status()
    data = resp.json()
    return {
        "cep": data.get("cep", ""),
        "logradouro": data.get("street", ""),
        "bairro": data.get("neighborhood", ""),
        "cidade": data.get("city", ""),
        "uf": data.get("state", ""),
    }
```

- [ ] **Step 6: Run tests to verify they pass**

```bash
cd /Users/rodrigorochameire/Projetos/Defender/mcp-defender-brasil && uv run pytest tests/test_localidade_clients.py -v
```

Expected: 4 tests PASS

- [ ] **Step 7: Commit**

```bash
git add mcp-defender-brasil/clients/ mcp-defender-brasil/tests/test_localidade_clients.py
git commit -m "feat: add IBGE, Atlas Violência and BrasilAPI clients"
```

---

### Task 4: Formatters (text output)

**Files:**
- Create: `mcp-defender-brasil/formatters/datajud.py`
- Create: `mcp-defender-brasil/formatters/localidade.py`
- Test: `mcp-defender-brasil/tests/test_datajud_formatter.py`
- Test: `mcp-defender-brasil/tests/test_localidade_formatter.py`

- [ ] **Step 1: Write failing test for datajud formatter**

```python
# tests/test_datajud_formatter.py
from formatters.datajud import formatar_processos


def test_formatar_processos():
    processos = [
        {
            "numero": "00123456720238130001",
            "classe": "Agravo em Recurso Especial",
            "tribunal": "STJ",
            "grau": "SUP",
            "data_ajuizamento": "2023-06-15T00:00:00.000Z",
            "assuntos": ["Homicídio qualificado"],
            "orgao": "5ª Turma",
            "ultima_movimentacao": {"nome": "Julgado", "data": "2024-01-20T14:30:00.000Z"},
        }
    ]
    text = formatar_processos(processos, query="homicídio", tribunal="stj")
    assert "DataJud" in text
    assert "Agravo em Recurso Especial" in text
    assert "5ª Turma" in text
    assert "Homicídio qualificado" in text
    assert "Julgado" in text


def test_formatar_processos_vazio():
    text = formatar_processos([], query="xyz", tribunal="stj")
    assert "Nenhum processo encontrado" in text
```

- [ ] **Step 2: Write failing test for localidade formatter**

```python
# tests/test_localidade_formatter.py
from formatters.localidade import formatar_localidade


def test_formatar_com_demografia_e_violencia():
    municipio = {"nome": "Camaçari", "cod_ibge": "2905701", "uf": "BA", "uf_nome": "Bahia", "mesorregiao": "Metropolitana de Salvador", "regiao": "Nordeste"}
    populacao = {"populacao": 321636, "ano": "2025"}
    violencia = [
        {"ano": 2023, "valor": 250, "municipio": "Camaçari"},
        {"ano": 2022, "valor": 255, "municipio": "Camaçari"},
    ]
    text = formatar_localidade(municipio=municipio, populacao=populacao, violencia=violencia)
    assert "Camaçari/BA" in text
    assert "321.636" in text or "321636" in text
    assert "2023" in text
    assert "250" in text
    assert "IBGE" in text
    assert "Atlas da Violência" in text


def test_formatar_so_endereco():
    endereco = {"cep": "01001000", "logradouro": "Praça da Sé", "bairro": "Sé", "cidade": "São Paulo", "uf": "SP"}
    text = formatar_localidade(endereco=endereco)
    assert "Praça da Sé" in text
    assert "São Paulo/SP" in text
```

- [ ] **Step 3: Run tests to verify they fail**

```bash
cd /Users/rodrigorochameire/Projetos/Defender/mcp-defender-brasil && uv run pytest tests/test_datajud_formatter.py tests/test_localidade_formatter.py -v
```

Expected: FAIL — modules not found

- [ ] **Step 4: Write datajud formatter**

```python
# formatters/datajud.py


def formatar_processos(processos: list[dict], query: str, tribunal: str) -> str:
    if not processos:
        return f'## DataJud: "{query}" ({tribunal.upper()})\n\nNenhum processo encontrado para esta consulta.'

    lines = [f'## DataJud: "{query}" ({tribunal.upper()}, {len(processos)} resultado{"s" if len(processos) != 1 else ""})\n']

    for i, p in enumerate(processos, 1):
        data_aj = p["data_ajuizamento"][:10] if p["data_ajuizamento"] else "—"
        assuntos = ", ".join(p["assuntos"]) if p["assuntos"] else "—"
        mov = p.get("ultima_movimentacao")
        mov_text = f'{mov["nome"]} ({mov["data"][:10]})' if mov else "—"

        lines.append(f"{i}. {p['numero']} — {p['classe']}")
        lines.append(f"   Tribunal: {p['tribunal']} | Grau: {p['grau']} | Ajuizamento: {data_aj}")
        lines.append(f"   Assuntos: {assuntos}")
        lines.append(f"   Órgão: {p['orgao']}")
        lines.append(f"   Última movimentação: {mov_text}")
        lines.append("")

    return "\n".join(lines)
```

- [ ] **Step 5: Write localidade formatter**

```python
# formatters/localidade.py


def _formatar_numero(n: int) -> str:
    return f"{n:,}".replace(",", ".")


def formatar_localidade(
    municipio: dict | None = None,
    populacao: dict | None = None,
    violencia: list[dict] | None = None,
    endereco: dict | None = None,
) -> str:
    lines = []

    if endereco and not municipio:
        lines.append(f"## {endereco['cidade']}/{endereco['uf']}\n")
        lines.append("### Endereço")
        lines.append(f"- CEP: {endereco['cep']}")
        if endereco.get("logradouro"):
            lines.append(f"- Logradouro: {endereco['logradouro']}")
        if endereco.get("bairro"):
            lines.append(f"- Bairro: {endereco['bairro']}")
        return "\n".join(lines)

    if municipio:
        lines.append(f"## {municipio['nome']}/{municipio['uf']} (IBGE: {municipio['cod_ibge']})\n")

    if populacao:
        lines.append("### Demografia")
        lines.append(f"- População: {_formatar_numero(populacao['populacao'])} hab. (IBGE {populacao['ano']})")
        if municipio:
            lines.append(f"- Região: {municipio.get('regiao', '—')} / {municipio.get('mesorregiao', '—')}")
            lines.append(f"- UF: {municipio.get('uf_nome', '—')} ({municipio.get('uf', '—')})")
        lines.append("")

    if violencia:
        lines.append("### Violência (Atlas da Violência / IPEA)")
        sorted_v = sorted(violencia, key=lambda x: x["ano"], reverse=True)
        for v in sorted_v[:5]:
            lines.append(f"- Homicídios ({v['ano']}): {v['valor']}")
        lines.append("")
        lines.append("Fonte: Atlas da Violência (IPEA/FBSP).")

    return "\n".join(lines)
```

- [ ] **Step 6: Run tests to verify they pass**

```bash
cd /Users/rodrigorochameire/Projetos/Defender/mcp-defender-brasil && uv run pytest tests/test_datajud_formatter.py tests/test_localidade_formatter.py -v
```

Expected: 4 tests PASS

- [ ] **Step 7: Commit**

```bash
git add mcp-defender-brasil/formatters/ mcp-defender-brasil/tests/test_datajud_formatter.py mcp-defender-brasil/tests/test_localidade_formatter.py
git commit -m "feat: add text formatters for datajud and localidade"
```

---

### Task 5: FastMCP server (2 tools)

**Files:**
- Create: `mcp-defender-brasil/server.py`
- Test: `mcp-defender-brasil/tests/test_server.py`

- [ ] **Step 1: Write failing test**

```python
# tests/test_server.py
import pytest
from fastmcp import Client
from server import mcp


@pytest.mark.asyncio
async def test_server_has_two_tools():
    async with Client(mcp) as client:
        tools = await client.list_tools()
    tool_names = [t.name for t in tools]
    assert "consultar_datajud" in tool_names
    assert "dados_localidade" in tool_names
    assert len(tool_names) == 2
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd /Users/rodrigorochameire/Projetos/Defender/mcp-defender-brasil && uv run pytest tests/test_server.py -v
```

Expected: FAIL — `No module named 'server'`

- [ ] **Step 3: Write server.py**

```python
# server.py
from fastmcp import FastMCP
from clients.datajud import buscar_processos
from clients.ibge import buscar_municipio, buscar_populacao
from clients.atlas import buscar_violencia
from clients.brasilapi import buscar_cep
from formatters.datajud import formatar_processos
from formatters.localidade import formatar_localidade

mcp = FastMCP(
    "defender-brasil",
    instructions="Dados judiciais e demográficos brasileiros para a Defensoria Pública.",
)


@mcp.tool()
async def consultar_datajud(
    query: str,
    tribunal: str = "stj",
    campo: str = "assuntos",
    limite: int = 5,
) -> str:
    """Busca processos judiciais em qualquer tribunal brasileiro via DataJud/CNJ.
    Retorna metadados, classe, assuntos, movimentações e órgão julgador.
    Tribunais: stj, tjba, trf1..trf6, tj{uf}, trt1..trt24."""
    processos = await buscar_processos(query, tribunal, campo, limite)
    return formatar_processos(processos, query, tribunal)


@mcp.tool()
async def dados_localidade(
    consulta: str,
    incluir: list[str] | None = None,
) -> str:
    """Dados demográficos, violência e endereço de localidades brasileiras.
    Consulta: código IBGE (7 dígitos), UF (2 letras) ou CEP (8 dígitos).
    Incluir: demografia, violencia, endereco. Fontes: IBGE, Atlas da Violência, BrasilAPI."""
    if incluir is None:
        incluir = ["demografia"]

    cleaned = consulta.strip().replace("-", "").replace(".", "")
    municipio_data = None
    pop_data = None
    viol_data = None
    end_data = None

    if len(cleaned) == 8 and cleaned.isdigit():
        # CEP
        end_data = await buscar_cep(cleaned)
        return formatar_localidade(endereco=end_data)

    if len(cleaned) == 7 and cleaned.isdigit():
        cod = cleaned
    elif len(cleaned) == 2 and cleaned.isalpha():
        # UF — retorna info básica
        return f"## {cleaned.upper()}\n\nConsulta por UF: use código IBGE do município para dados completos."
    else:
        return f"Formato não reconhecido: '{consulta}'. Use código IBGE (7 dígitos), CEP (8 dígitos) ou UF (2 letras)."

    if "demografia" in incluir:
        municipio_data = await buscar_municipio(cod)
        pop_data = await buscar_populacao(cod)

    if "violencia" in incluir:
        viol_data = await buscar_violencia(cod)

    return formatar_localidade(
        municipio=municipio_data,
        populacao=pop_data,
        violencia=viol_data,
    )


if __name__ == "__main__":
    mcp.run()
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd /Users/rodrigorochameire/Projetos/Defender/mcp-defender-brasil && uv run pytest tests/test_server.py -v
```

Expected: PASS — 2 tools registered

- [ ] **Step 5: Commit**

```bash
git add mcp-defender-brasil/server.py mcp-defender-brasil/tests/test_server.py
git commit -m "feat: FastMCP server with consultar_datajud and dados_localidade tools"
```

---

### Task 6: Register MCP in Defender project

**Files:**
- Modify: `Defender/.claude/mcp.json`

- [ ] **Step 1: Add defender-brasil to mcp.json**

Add to the existing `mcpServers` object in `/Users/rodrigorochameire/Projetos/Defender/.claude/mcp.json`:

```json
"defender-brasil": {
  "command": "uv",
  "args": ["run", "--directory", "/Users/rodrigorochameire/Projetos/Defender/mcp-defender-brasil", "server.py"]
}
```

- [ ] **Step 2: Commit**

```bash
git add .claude/mcp.json
git commit -m "feat: register mcp-defender-brasil in project MCP config"
```

---

### Task 7: Smoke test with real APIs

**Files:** None (manual verification)

- [ ] **Step 1: Test DataJud real call**

```bash
cd /Users/rodrigorochameire/Projetos/Defender/mcp-defender-brasil && uv run python -c "
import asyncio
from clients.datajud import buscar_processos
from formatters.datajud import formatar_processos

async def main():
    results = await buscar_processos('homicídio qualificado', tribunal='stj', limite=3)
    print(formatar_processos(results, 'homicídio qualificado', 'stj'))

asyncio.run(main())
"
```

Expected: Real STJ process data printed

- [ ] **Step 2: Test IBGE + Atlas real call**

```bash
cd /Users/rodrigorochameire/Projetos/Defender/mcp-defender-brasil && uv run python -c "
import asyncio
from clients.ibge import buscar_municipio, buscar_populacao
from clients.atlas import buscar_violencia
from formatters.localidade import formatar_localidade

async def main():
    mun = await buscar_municipio('2905701')
    pop = await buscar_populacao('2905701')
    viol = await buscar_violencia('2905701')
    print(formatar_localidade(municipio=mun, populacao=pop, violencia=viol))

asyncio.run(main())
"
```

Expected: Camaçari demographics + violence data printed

- [ ] **Step 3: Test MCP server starts**

```bash
cd /Users/rodrigorochameire/Projetos/Defender/mcp-defender-brasil && timeout 5 uv run server.py 2>&1 || true
```

Expected: Server starts without errors (will timeout after 5s waiting for stdio, that's ok)

---

### Task 8: Skill `/jurisprudencia`

**Files:**
- Create: `Defender/.claude/commands/jurisprudencia.md`

- [ ] **Step 1: Write the skill**

```markdown
# /jurisprudencia — Pesquisa de Jurisprudência

Busca jurisprudência real nos tribunais superiores brasileiros usando WebSearch.
Retorna ementas verificáveis com links diretos para as decisões.

## Uso

/jurisprudencia <tema>

Exemplos:
- /jurisprudencia legítima defesa putativa
- /jurisprudencia tráfico privilegiado art 33 §4
- /jurisprudencia feminicídio tentado desclassificação

## Instruções

Ao receber o tema "$ARGUMENTS":

1. Faça 3 buscas web em paralelo:
   - WebSearch: "site:stf.jus.br jurisprudencia $ARGUMENTS"
   - WebSearch: "site:stj.jus.br jurisprudencia $ARGUMENTS"
   - WebSearch: "súmula $ARGUMENTS STF OR STJ"

2. Para os top 3 resultados relevantes de cada tribunal, extraia:
   - Número do processo (HC, REsp, AgRg, ARE, etc.)
   - Relator
   - Órgão julgador (Turma/Plenário)
   - Data do julgamento
   - Ementa (resumida se muito longa)
   - Link direto

3. Formate a saída assim:

```
## Jurisprudência: "{tema}"

### STF ({N} resultados)
1. {TIPO} {NUMERO}/{UF} — Rel. Min. {NOME} — {ÓRGÃO} — j. {DATA}
   EMENTA: {texto}
   Fonte: {link}

### STJ ({N} resultados)
1. {TIPO} {NUMERO}/{UF} — Rel. Min. {NOME} — {TURMA} — j. {DATA}
   EMENTA: {texto}
   Fonte: {link}

### Súmulas aplicáveis
- Súmula {N}/{TRIBUNAL}: "{enunciado}"
```

4. Se não encontrar resultados para um tribunal, diga honestamente:
   "Nenhum resultado encontrado no {tribunal} para este tema."

5. NUNCA invente jurisprudência. Se não encontrou, não cite.

6. Complemente com `consultar_datajud` se o usuário pedir processos específicos
   (movimentações, classe processual, assuntos).
```

- [ ] **Step 2: Commit**

```bash
git add .claude/commands/jurisprudencia.md
git commit -m "feat: add /jurisprudencia skill using WebSearch"
```

---

### Task 9: Skill `/contexto-local`

**Files:**
- Create: `Defender/.claude/commands/contexto-local.md`

- [ ] **Step 1: Write the skill**

```markdown
# /contexto-local — Contexto Socioeconômico de Município

Gera parágrafo contextual com dados demográficos e de violência de um município,
pronto para inserir em dossiês e peças da Defensoria.

## Uso

/contexto-local <município>

Exemplos:
- /contexto-local camaçari
- /contexto-local lauro de freitas
- /contexto-local salvador

## Mapeamento de municípios (códigos IBGE)

Use esta tabela para os municípios mais frequentes da 7ª Regional:

| Município | Código IBGE |
|-----------|-------------|
| Camaçari | 2905701 |
| Lauro de Freitas | 2919207 |
| Salvador | 2927408 |
| Dias d'Ávila | 2910057 |
| Simões Filho | 2930709 |
| Candeias | 2906501 |
| Mata de São João | 2921005 |
| Pojuca | 2925204 |
| Catu | 2907905 |
| Alagoinhas | 2900702 |

Para outros municípios, busque o código em:
https://servicodados.ibge.gov.br/api/v1/localidades/municipios?orderBy=nome

## Instruções

Ao receber o município "$ARGUMENTS":

1. Identifique o código IBGE na tabela acima. Se não estiver na tabela,
   use WebSearch para encontrar: "código IBGE {município}"

2. Chame a tool `dados_localidade` com:
   - consulta: "{código IBGE}"
   - incluir: ["demografia", "violencia"]

3. Com os dados retornados, gere um PARÁGRAFO NARRATIVO contextual:

   "{Município}/{UF}, com população de {X} habitantes (IBGE {ano}),
   localizado na {mesorregião}, registrou {N} homicídios em {ano mais recente}
   (Atlas da Violência/IPEA). [Se disponível: compare com anos anteriores para
   mostrar tendência — aumento/redução]. O contexto socioeconômico da região
   [complementar se relevante para a tese]."

4. Após o parágrafo, inclua os dados brutos em lista para referência.

5. Este parágrafo é para uso em dossiês e peças — mantenha tom técnico e objetivo.
```

- [ ] **Step 2: Commit**

```bash
git add .claude/commands/contexto-local.md
git commit -m "feat: add /contexto-local skill for demographic context"
```

---

### Task 10: End-to-end validation

- [ ] **Step 1: Run full test suite**

```bash
cd /Users/rodrigorochameire/Projetos/Defender/mcp-defender-brasil && uv run pytest tests/ -v
```

Expected: All tests pass (9+ tests)

- [ ] **Step 2: Verify MCP tool listing is lean**

Restart Claude Code in the Defender project directory. Run:
```
/jurisprudencia tráfico privilegiado
```

Verify: skill executes, WebSearch brings real results with links.

- [ ] **Step 3: Verify dados_localidade tool works**

Ask Claude: "Quais os dados demográficos e de violência de Camaçari?"

Verify: Claude automatically calls `dados_localidade` tool and returns formatted data.

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "feat: mcp-defender-brasil complete — 2 tools + 2 skills"
```
