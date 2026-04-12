# MCP Defender-Brasil — Design Spec (v2 — revisado após testes de API)

**Data:** 2026-04-03
**Status:** Aprovado
**Abordagem:** Híbrida — MCP mínimo (2 tools) + Skills Claude Code

---

## Problema

O Claude Code alucina jurisprudência e dados estatísticos quando gera dossiês e peças para a Defensoria. Não existe acesso estruturado a APIs públicas brasileiras no workflow atual.

## Descoberta crítica (testes reais)

As APIs de jurisprudência do STF e STJ estão protegidas por WAF — retornam 202 vazio (STF) e 403 (STJ) para requisições HTTP diretas. O pacote mcp-brasil falha silenciosamente nos mesmos endpoints. **O DataJud (CNJ) funciona** via Elasticsearch e cobre todos os tribunais, mas retorna metadados de processos, não ementas.

## Solução

- **MCP (2 tools):** `consultar_datajud` + `dados_localidade` — APIs 100% funcionais
- **Skill `/jurisprudencia`:** usa WebSearch para buscar ementas reais com links verificáveis
- **Skill `/contexto-local`:** orquestra a tool `dados_localidade`

---

## Arquitetura

```
┌──────────────────────────────────────────┐
│           Claude Code Session            │
│                                          │
│  Skill /jurisprudencia                   │
│  └─ WebSearch "site:stf.jus.br {tema}"   │
│  └─ WebFetch nos links encontrados       │
│  └─ Formata citações com links reais     │
│                                          │
│  Skill /contexto-local                   │
│  └─ Tool dados_localidade (MCP)          │
│  └─ Gera parágrafo narrativo             │
│                                          │
│  MCP Defender-Brasil (2 tools)           │
│  ┌────────────────┐ ┌────────────────┐   │
│  │ consultar      │ │ dados          │   │
│  │ _datajud       │ │ _localidade    │   │
│  └──────┬─────────┘ └──┬─────────────┘   │
└─────────┼──────────────┼─────────────────┘
          │              │
     ┌────┴─────┐  ┌────┴────────┐
     │ DataJud  │  │ IBGE        │
     │ (CNJ)    │  │ Atlas Viol. │
     │ STJ,TJBA │  │ BrasilAPI   │
     │ TRFs,TJs │  │             │
     └──────────┘  └─────────────┘
```

---

## Camada MCP — 2 Tools

### Tool 1: `consultar_datajud`

**Descrição curta:**
> Busca processos judiciais em qualquer tribunal brasileiro via DataJud/CNJ. Retorna metadados, classe, assuntos, movimentações e órgão julgador.

**Parâmetros:**

| Param | Tipo | Obrigatório | Default | Descrição |
|-------|------|-------------|---------|-----------|
| `query` | string | sim | — | Termo de busca (ex: "homicídio qualificado", "tráfico privilegiado") |
| `tribunal` | string | não | `"stj"` | Código do tribunal: `stj`, `tjba`, `trf1`..`trf6`, `tj{uf}`, `trt1`..`trt24` |
| `campo` | enum | não | `"assuntos"` | Campo de busca: `"assuntos"`, `"classe"`, `"numero"`, `"texto_livre"` |
| `limite` | int | não | `5` | Máximo de resultados (1-20) |

**API:**
- `POST https://api-publica.datajud.cnj.jus.br/api_publica_{tribunal}/_search`
- Header: `Authorization: APIKey cDZHYzlZa0JadVREZDJCendQbXY6SkJlTzNjLV9TRENyQk1RdnFKZGRQdw==`
- Body: Elasticsearch query (match no campo selecionado)
- Rate limit: 30 req/60s

**Formato de saída:**

```
## DataJud: "homicídio qualificado" (STJ, 5 resultados)

1. AREsp 2.456.789 — Agravo em Recurso Especial
   Tribunal: STJ | Grau: SUP | Ajuizamento: 2024-03-15
   Assuntos: Homicídio qualificado (Art 121, §2º, CP)
   Órgão: 5ª Turma
   Última movimentação: Julgado (2025-01-20)

2. REsp 1.234.567 — Recurso Especial
   ...
```

### Tool 2: `dados_localidade`

**Descrição curta:**
> Dados demográficos, indicadores de violência e endereço de localidades brasileiras. Fontes: IBGE, Atlas da Violência (IPEA), BrasilAPI.

**Parâmetros:**

| Param | Tipo | Obrigatório | Default | Descrição |
|-------|------|-------------|---------|-----------|
| `consulta` | string | sim | — | Código IBGE do município (7 dígitos), sigla UF (2 letras), ou CEP (8 dígitos) |
| `incluir` | list[enum] | não | `["demografia"]` | Categorias: `"demografia"`, `"violencia"`, `"endereco"` |

**APIs (todas sem auth):**

- **IBGE população:** `GET https://servicodados.ibge.gov.br/api/v3/agregados/6579/periodos/-1/variaveis/9324?localidades=N6%5B{cod}%5D`
- **IBGE município:** `GET https://servicodados.ibge.gov.br/api/v1/localidades/municipios/{cod}`
- **Atlas Violência temas:** `GET https://www.ipea.gov.br/atlasviolencia/api/v1/valores-series-por-regioes/{serie_id}/4/{cod_ibge}`
  - Serie 328 = homicídios absolutos, serie 20 = taxa de homicídios
- **BrasilAPI CEP:** `GET https://brasilapi.com.br/api/cep/v1/{cep}`

**Formato de saída:**

```
## Camaçari/BA (IBGE: 2905701)

### Demografia
- População: 321.636 hab. (IBGE 2025)
- Região: Nordeste / Metropolitana de Salvador
- Mesorregião: Metropolitana de Salvador
- UF: Bahia (BA)

### Violência (Atlas da Violência / IPEA)
- Homicídios (2023): 250
- Série histórica: 2019=280, 2020=245, 2021=260, 2022=255, 2023=250

Fonte: Atlas da Violência (IPEA/FBSP).
```

---

## Camada Skills — Fase 1

### Skill: `/jurisprudencia <tema>`

**Localização:** `.claude/commands/jurisprudencia.md`

**Estratégia:** WebSearch + WebFetch (não depende de API bloqueada)

**Comportamento:**
1. Faz `WebSearch` com queries:
   - `"site:stf.jus.br jurisprudencia {tema}"`
   - `"site:stj.jus.br jurisprudencia {tema}"`
   - `"súmula {tema} STF STJ"`
2. Para os top 3-5 resultados de cada tribunal, faz `WebFetch` para extrair ementa
3. Formata bloco pronto para colar em peça processual
4. Inclui link verificável para cada decisão
5. Se não encontra resultados, diz honestamente

**Saída:**
```
## Jurisprudência: "tráfico privilegiado"

### STF
1. HC 118.533/MS — Rel. Min. Cármen Lúcia — Plenário — j. 23/06/2016
   EMENTA: É inconstitucional a vedação de substituição da pena...
   Fonte: https://jurisprudencia.stf.jus.br/pages/search/...

### STJ
1. AgRg no AREsp 2.345.678/SP — Rel. Min. Ribeiro Dantas — 5ª Turma
   EMENTA: O reconhecimento do tráfico privilegiado...
   Fonte: https://scon.stj.jus.br/...

### Súmulas
- Súmula 512/STJ: A aplicação da causa de diminuição de pena prevista no §4º...
```

### Skill: `/contexto-local <municipio>`

**Localização:** `.claude/commands/contexto-local.md`

**Comportamento:**
1. Mapeia nome do município → código IBGE (tabela interna com os principais ou busca IBGE)
2. Chama tool `dados_localidade` com `incluir=["demografia", "violencia"]`
3. Gera parágrafo narrativo contextual, pronto para inserir em dossiê

---

## Skills — Fase 2 (futuro)

| Skill | Fonte | Uso |
|-------|-------|-----|
| `/rede-saude <municipio>` | OpenDataSUS via curl | CAPS, UBS, leitos psiquiátricos |
| `/diario-oficial <termo>` | Querido Diário API via curl | Publicações (EP, indulto) |

---

## Estrutura de arquivos

```
mcp-defender-brasil/
├── server.py              # FastMCP, registra 2 tools
├── clients/
│   ├── datajud.py         # POST Elasticsearch DataJud/CNJ (~60 LOC)
│   ├── atlas.py           # GET Atlas Violência IPEA (~40 LOC)
│   ├── ibge.py            # GET IBGE agregados + municípios (~50 LOC)
│   └── brasilapi.py       # GET BrasilAPI CEP (~30 LOC)
├── formatters/
│   ├── datajud.py         # Formata processos → texto legível
│   └── localidade.py      # Formata demografia + violência → texto
├── pyproject.toml          # fastmcp>=3.0, httpx
└── README.md
```

**Total estimado: ~350 LOC.**

---

## Registro MCP

Adicionar ao `.claude/mcp.json` do Defender:

```json
"defender-brasil": {
  "command": "uv",
  "args": ["run", "--directory", "/Users/rodrigorochameire/Projetos/Defender/mcp-defender-brasil", "server.py"]
}
```

---

## Dependências

- `fastmcp>=3.0`
- `httpx`
- Python 3.12

---

## O que NÃO está no escopo

- API direta STF/STJ (bloqueadas por WAF)
- Tribunais estaduais via scraping (complexo demais pra fase 1)
- Portal da Transparência (requer API key)
- Câmara/Senado, TSE, ANVISA, BNDES, BACEN
- Integração no enrichment-engine (pode ser feita depois)

---

## Critérios de sucesso

1. Tool `consultar_datajud` retorna processos reais do STJ e TJBA
2. Tool `dados_localidade` retorna demografia e violência de Camaçari
3. Skill `/jurisprudencia` traz ementas reais com links verificáveis via WebSearch
4. Skill `/contexto-local` gera parágrafo narrativo pronto para dossiê
5. Custo de contexto MCP <= 500 tokens
6. Zero API keys obrigatórias (DataJud usa key pública do CNJ)
