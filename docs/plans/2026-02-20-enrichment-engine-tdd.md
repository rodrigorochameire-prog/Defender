# TDD - Enrichment Engine: Sistema Nervoso Defensivo

| Campo | Valor |
|-------|-------|
| Tech Lead | @rodrigorochameire |
| Time | Rodrigo + Claude Agents |
| Status | Rascunho |
| Criado | 2026-02-20 |
| Atualizado | 2026-02-20 |

---

## Contexto

O OMBUDS/Defender atualmente opera como um sistema de gestao onde cada funcionalidade (PJe Parser, Drive, atendimentos, audiencias) funciona de forma isolada. Os dados entram no sistema e sao armazenados, mas nao sao processados em profundidade para extrair inteligencia.

O modelo de dados ja possui tabelas sofisticadas para inteligencia (caseFacts, casePersonas, depoimentosAnalise, tesesDefensivas, factEvidence com score de confianca e deteccao de contradicoes), porem elas dependem de preenchimento manual. O desafio e criar uma **camada neural** que conecte automaticamente toda informacao que entra no sistema, transformando dados brutos em inteligencia defensiva estruturada.

A Defensoria Publica de Camacari lida com multiplas areas (Juri, Violencia Domestica, Execucao Penal, Substituicao Criminal) e cada uma tem variaveis proprias. O sistema precisa especializar-se progressivamente em cada area, identificando padroes e nutrindo as paginas de assistidos, processos e casos com informacoes extraidas automaticamente.

**Dominio**: Transversal (Assistidos, Processos, Casos, Demandas, Investigacao)

**Stakeholders**: Defensores (Dr. Rodrigo, Dra. Juliane), Assistidos (indireto)

---

## Definicao do Problema

### Problemas que Estamos Resolvendo

- **Problema 1**: Informacoes importadas (PJe, pautas, documentos) ficam como dados brutos sem enriquecimento automatico
  - Impacto: Defensor precisa manualmente identificar crime, qualificadoras, fase processual, correus, vitima em cada importacao

- **Problema 2**: Documentos no Drive (sentencas, laudos, certidoes) sao arquivos mortos — nao alimentam o sistema
  - Impacto: PDFs de sentencas, laudos periciais e decisoes contem informacoes criticas que nunca sao estruturadas

- **Problema 3**: Transcricoes de atendimentos geram texto bruto sem extracao de pontos-chave, fatos ou contradicoes
  - Impacto: Informacoes valiosas obtidas em atendimento se perdem na massa de texto

- **Problema 4**: Nao ha cruzamento automatico entre fontes de dados
  - Impacto: Um novo documento no Drive nao atualiza o perfil do assistido, o caso nem as teses defensivas

### Por Que Agora?

- O modelo de dados ja suporta inteligencia (caseFacts, casePersonas, factEvidence) — falta o pipeline
- Gemini Flash e Docling estao maduros o suficiente para parsing preciso de documentos juridicos
- Railway ja esta configurado com Python — infraestrutura pronta
- Acumulo de dados brutos cresce diariamente sem processamento

### Impacto de NAO Resolver

- **Defensores**: Continuam gastando tempo em trabalho manual de triagem e classificacao
- **Assistidos**: Defesa menos informada, sem cruzamento de dados entre fontes
- **Sistema**: OMBUDS permanece como gestao de prazos, nao como ferramenta de inteligencia defensiva

---

## Escopo

### Dentro do Escopo (V1)

- Servico Python (FastAPI) no Railway com Docling embutido
- Endpoint `/enrich/document` — parsing de PDFs/DOCX do Drive via Docling + extracao semantica via Gemini
- Endpoint `/enrich/pje-text` — extracao profunda de variaveis de intimacoes PJe
- Endpoint `/enrich/transcript` — extracao de pontos-chave, fatos e providencias de transcricoes
- Endpoint `/enrich/audiencia` — parsing de pautas de audiencia
- Endpoint `/enrich/whatsapp` — deteccao de urgencia e extracao de informacoes
- Gravacao automatica no Supabase (assistidos, processos, caseFacts, casePersonas, anotacoes)
- Autenticacao via API Key entre Vercel e Railway
- Integracao com webhooks existentes (Drive, n8n, Plaud)

### Fora do Escopo (V1)

- OSINT automatico / varredura de noticias (V2)
- Investigacao defensiva digital (V2)
- Banco de dados jornalistico de Camacari (V2)
- Treinamento/fine-tuning de modelos (V3)
- Interface de configuracao de prompts pelo usuario (V3)
- Processamento de video (V2)

### Consideracoes Futuras (V2+)

- **V2 - OSINT & Jornalismo**: Crawler de noticias de Camacari, banco de dados de delitos, cruzamento com casos
- **V2 - Investigacao Defensiva**: OSINT automatizado (Jusbrasil, Escavador, redes sociais), timeline reconstruction
- **V3 - Motor de Aprendizado**: Sistema que melhora prompts com base em feedback do defensor, fine-tuning por area

---

## Solucao Tecnica

### Visao Geral da Arquitetura

Servico Python (FastAPI) hospedado no Railway, com Docling para parsing de documentos e Gemini Flash para extracao semantica. O Next.js (Vercel) dispara chamadas REST quando novos dados entram no sistema. O servico processa e grava diretamente no Supabase.

**Componentes Principais**:

- **FastAPI App**: Roteamento, autenticacao, orquestracao
- **Docling Service**: Parsing de PDFs, DOCX, imagens → Markdown estruturado
- **Gemini Service**: Prompts especializados por tipo de dado → JSON estruturado
- **Supabase Service**: Gravacao dos enriquecimentos nas tabelas corretas
- **Prompts Library**: Prompts otimizados por area (Juri, VD, EP) e tipo de documento

### Diagrama de Arquitetura

```
┌──────────────────────────┐
│     Next.js (Vercel)     │
│                          │
│  Drive Webhook ──────────┼─── POST /enrich/document ──┐
│  PJe Import ─────────────┼─── POST /enrich/pje-text ──┤
│  Transcricao ────────────┼─── POST /enrich/transcript ─┤
│  Pauta Audiencia ────────┼─── POST /enrich/audiencia ──┤
│  WhatsApp ───────────────┼─── POST /enrich/whatsapp ───┤
│                          │                             │
└──────────────────────────┘                             │
                                                         ▼
                              ┌───────────────────────────────────────┐
                              │    Enrichment Engine (Railway/Python)  │
                              │                                       │
                              │   ┌─────────┐     ┌───────────────┐  │
                              │   │ Docling  │     │ Gemini Flash  │  │
                              │   │ PDF→MD   │────→│ MD→JSON       │  │
                              │   │ OCR      │     │ Prompts por   │  │
                              │   │ Tables   │     │ tipo/area     │  │
                              │   └─────────┘     └───────┬───────┘  │
                              │                           │          │
                              │                    ┌──────▼───────┐  │
                              │                    │   Supabase   │  │
                              │                    │   REST API   │  │
                              │                    └──────────────┘  │
                              └───────────────────────────────────────┘
                                                         │
                                                         ▼
                              ┌───────────────────────────────────────┐
                              │     Supabase PostgreSQL               │
                              │                                       │
                              │  assistidos ◄── processos ◄── casos   │
                              │       │             │           │     │
                              │  anotacoes    demandas    caseFacts   │
                              │  documentos   audiencias  casePersonas│
                              │  diligencias  moviment.   factEvidence│
                              └───────────────────────────────────────┘
```

### Fluxo de Dados por Tipo

#### Fluxo 1: Documento do Drive (PDF/DOCX)

1. Drive Webhook detecta novo arquivo na pasta do assistido
2. Next.js chama `POST /enrich/document` com `{fileUrl, mimeType, assistidoId, processoId}`
3. Engine baixa arquivo via URL signed
4. **Docling** converte para Markdown (layout, tabelas, OCR se necessario)
5. **Gemini Flash** recebe Markdown + prompt especializado por tipo detectado:
   - Sentenca → extrai: tipo penal, pena, regime, fundamentacao, juiz, data, resultado
   - Laudo pericial → extrai: tipo pericia, conclusao, perito, data
   - Certidao → extrai: antecedentes, processos, varas
   - Decisao → extrai: deferimento/indeferimento, fundamentacao, recurso cabivel
   - Minuta/Peticao → extrai: argumentos, jurisprudencia citada, pedidos
6. Engine grava no Supabase: atualiza `documentos` com classificacao + cria `caseFacts` + `anotacoes`

#### Fluxo 2: Intimacao PJe (texto)

1. Defensor importa intimacoes via PJe Import Modal
2. Next.js chama `POST /enrich/pje-text` com `{rawText, defensorId}`
3. **Gemini Flash** com prompt juridico extrai:
   - Dados processuais: numero, vara, comarca, atribuicao
   - Partes: reu (intimado), correus, vitima, MP
   - Crime: tipo penal, artigos, qualificadoras, causas de aumento
   - Fase: inquerito, denuncia, instrucao, sentenca, recurso
   - Prazo: tipo (ciencia, peticionar, audiencia), data limite
   - Classificacao por area: Juri, VD, EP, Criminal, Civel
4. Engine grava: cria/atualiza `demandas`, `processos`, `assistidos` (se novo), `casePersonas`

#### Fluxo 3: Transcricao de Atendimento

1. Transcricao finalizada (Plaud, mic, ou Drive)
2. Next.js chama `POST /enrich/transcript` com `{transcript, assistidoId, processoId}`
3. **Gemini Flash** com prompt de atendimento extrai:
   - Pontos-chave do relato
   - Nomes mencionados (testemunhas, correus, vitima, familiares)
   - Fatos narrados (com marcacao: controverso/incontroverso)
   - Contradicoes com versoes anteriores (se houver contexto)
   - Providencias sugeridas
   - Indicadores de urgencia
4. Engine grava: cria `anotacoes`, `caseFacts`, `casePersonas` (novos nomes), atualiza `atendimentos`

#### Fluxo 4: Pauta de Audiencia

1. Defensor importa pauta via Agenda PJe Modal
2. Next.js chama `POST /enrich/audiencia` com `{pautaText, defensorId}`
3. **Gemini Flash** extrai:
   - Tipo de audiencia (instrucao, JAM, juri, admonicao, justificacao)
   - Partes, juiz, promotor
   - Processo vinculado (busca por numero)
   - Data, hora, sala
4. Engine grava: cria/atualiza `audiencias`, vincula a `processos` existente

#### Fluxo 5: Mensagem WhatsApp

1. Evolution API recebe mensagem
2. Next.js chama `POST /enrich/whatsapp` com `{message, contactId, assistidoId}`
3. **Gemini Flash** com prompt rapido:
   - Detecta urgencia (preso, prazo, audiencia amanha)
   - Identifica assunto (pedido de informacao, relato de fato, documentacao)
   - Extrai informacoes relevantes
4. Engine grava: cria `anotacoes` com flag de urgencia, notifica defensor se critico

### APIs & Endpoints

| Endpoint | Metodo | Descricao | Auth |
|----------|--------|-----------|------|
| `POST /enrich/document` | POST | Parsing + enriquecimento de documento | API Key |
| `POST /enrich/pje-text` | POST | Extracao profunda de intimacao PJe | API Key |
| `POST /enrich/transcript` | POST | Extracao de pontos-chave de transcricao | API Key |
| `POST /enrich/audiencia` | POST | Parsing de pauta de audiencia | API Key |
| `POST /enrich/whatsapp` | POST | Deteccao de urgencia em mensagem | API Key |
| `GET /health` | GET | Status do servico + versao Docling | Publico |

#### Schemas de Input/Output

```python
# POST /enrich/document
class DocumentInput(BaseModel):
    file_url: str              # URL signed do arquivo
    mime_type: str             # application/pdf, application/vnd.openxmlformats...
    assistido_id: int | None   # Pode ser None se nao vinculado
    processo_id: int | None
    caso_id: int | None
    defensor_id: str

class DocumentOutput(BaseModel):
    document_type: str         # sentenca, decisao, laudo, certidao, peticao, outro
    extracted_data: dict       # JSON estruturado por tipo
    entities_created: list     # IDs de entidades criadas/atualizadas
    confidence: float          # 0-1 score de confianca da extracao

# POST /enrich/pje-text
class PjeInput(BaseModel):
    raw_text: str              # Texto colado do PJe
    defensor_id: str

class PjeOutput(BaseModel):
    intimacoes: list[dict]     # Lista de intimacoes extraidas
    processos_atualizados: list[int]
    demandas_criadas: list[int]
    assistidos_identificados: list[dict]  # {nome, id_existente?, novo?}

# POST /enrich/transcript
class TranscriptInput(BaseModel):
    transcript: str
    assistido_id: int
    processo_id: int | None
    caso_id: int | None
    context: str | None        # Contexto adicional (atendimento anterior, etc)

class TranscriptOutput(BaseModel):
    key_points: list[str]
    facts: list[dict]          # {descricao, tipo: controverso|incontroverso, confidence}
    persons_mentioned: list[dict]  # {nome, papel: testemunha|correu|vitima|familiar}
    contradictions: list[str]  # Se houver contexto anterior
    suggested_actions: list[str]
    urgency_level: str         # low, medium, high, critical
```

### Estrutura do Projeto Python

```
enrichment-engine/
├── Dockerfile
├── requirements.txt
├── railway.json                # Config Railway
├── main.py                     # FastAPI app + lifespan
├── config.py                   # Settings (Pydantic BaseSettings)
├── auth.py                     # Middleware API Key
│
├── routers/
│   ├── __init__.py
│   ├── document.py             # POST /enrich/document
│   ├── pje.py                  # POST /enrich/pje-text
│   ├── transcript.py           # POST /enrich/transcript
│   ├── audiencia.py            # POST /enrich/audiencia
│   ├── whatsapp.py             # POST /enrich/whatsapp
│   └── health.py               # GET /health
│
├── services/
│   ├── __init__.py
│   ├── docling_service.py      # Docling: download + parse → Markdown
│   ├── gemini_service.py       # Gemini Flash: prompt → JSON estruturado
│   ├── supabase_service.py     # Supabase: CRUD nas tabelas de enriquecimento
│   └── enrichment_orchestrator.py  # Orquestra: Docling → Gemini → Supabase
│
├── prompts/
│   ├── __init__.py
│   ├── base.py                 # Prompt base com instrucoes gerais
│   ├── document_sentenca.py    # Prompt para sentencas
│   ├── document_decisao.py     # Prompt para decisoes
│   ├── document_laudo.py       # Prompt para laudos periciais
│   ├── document_certidao.py    # Prompt para certidoes
│   ├── document_classifier.py  # Prompt para classificar tipo de documento
│   ├── pje_extraction.py       # Prompt para intimacoes PJe
│   ├── transcript_analysis.py  # Prompt para transcricoes
│   ├── audiencia_parsing.py    # Prompt para pautas
│   └── whatsapp_triage.py      # Prompt para mensagens WhatsApp
│
├── models/
│   ├── __init__.py
│   └── schemas.py              # Pydantic models (Input/Output)
│
└── tests/
    ├── __init__.py
    ├── test_document.py
    ├── test_pje.py
    ├── test_transcript.py
    └── conftest.py             # Fixtures (mock Gemini, mock Supabase)
```

### Dockerfile

```dockerfile
FROM python:3.12-slim

WORKDIR /app

# Dependencias do sistema para Docling (OCR, PDF)
RUN apt-get update && apt-get install -y \
    libgl1-mesa-glx \
    libglib2.0-0 \
    poppler-utils \
    tesseract-ocr \
    tesseract-ocr-por \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "${PORT:-8000}"]
```

### requirements.txt

```
fastapi>=0.115.0
uvicorn[standard]>=0.30.0
pydantic>=2.0
pydantic-settings>=2.0
docling>=2.70.0
google-generativeai>=0.8.0
supabase>=2.0.0
httpx>=0.27.0
python-multipart>=0.0.9
```

### Mudancas no Banco de Dados

**Nenhuma nova tabela necessaria para V1.** O modelo de dados existente ja suporta tudo:

- `caseFacts` — fatos extraidos de documentos e transcricoes
- `casePersonas` — pessoas identificadas em relatos
- `factEvidence` — vinculo entre fatos e documentos com score de confianca
- `anotacoes` — log de informacoes extraidas
- `documentos` — classificacao de tipo de documento
- `diligencias` — sugestoes automaticas de investigacao

**Alteracoes em tabelas existentes (V1)**:

| Tabela | Coluna | Tipo | Descricao |
|--------|--------|------|-----------|
| `documentos` | `enrichmentStatus` | varchar | `pending`, `processing`, `enriched`, `failed` |
| `documentos` | `enrichmentData` | jsonb | JSON com dados extraidos pelo Gemini |
| `documentos` | `enrichedAt` | timestamp | Quando foi processado |
| `atendimentos` | `enrichmentStatus` | varchar | Status de processamento |
| `atendimentos` | `enrichmentData` | jsonb | Pontos-chave, fatos, providencias |
| `demandas` | `enrichmentData` | jsonb | Variaveis extraidas do PJe (crime, qualificadoras, fase) |

**Estrategia de Migracao**: Colunas nullable — sem impacto em dados existentes. Gerar via `npm run db:generate`.

---

## Riscos

| Risco | Impacto | Probabilidade | Mitigacao |
|-------|---------|---------------|-----------|
| Gemini alucina dados juridicos (inventa artigos, nomes) | Alto | Media | Prompt com instrucao explicita "nao inventar", campo `confidence`, revisao humana |
| Docling falha em PDFs escaneados de baixa qualidade | Medio | Media | Fallback para Gemini multimodal direto, flag para revisao manual |
| Latencia alta (Docling + Gemini > 30s) | Medio | Alta | Processamento assincrono (fila), resposta imediata com status "processing" |
| API Key vaza | Alto | Baixa | Key em env var Railway, rotacao trimestral, rate limiting |
| Custo Gemini escala com volume | Medio | Media | Cache de resultados identicos, limite diario, monitorar tokens consumidos |
| Railway fica fora do ar | Medio | Baixa | Fila de retry no Next.js, dados nao se perdem (ficam como "pending") |
| Dados sensiveis em transito | Alto | Baixa | HTTPS obrigatorio, API Key, nao logar conteudo de documentos |

---

## Plano de Implementacao

| Fase | Tarefa | Descricao | Estimativa | Status |
|------|--------|-----------|------------|--------|
| **Fase 1 - Infra** | Projeto Python | Criar estrutura FastAPI + Dockerfile | 0.5d | Pendente |
| | Deploy Railway | Configurar servico no Railway | 0.5d | Pendente |
| | Auth | Middleware API Key | 0.5d | Pendente |
| | Health check | Endpoint /health com status Docling | 0.5d | Pendente |
| **Fase 2 - Docling** | Docling Service | Wrapper para parsing de documentos | 1d | Pendente |
| | Classificador | Prompt para classificar tipo de documento | 0.5d | Pendente |
| | Testes | Testar com PDFs reais do OMBUDS | 1d | Pendente |
| **Fase 3 - Gemini** | Gemini Service | Wrapper + retry + rate limiting | 0.5d | Pendente |
| | Prompts PJe | Prompt especializado para intimacoes | 1d | Pendente |
| | Prompts Documentos | Prompts por tipo (sentenca, laudo, decisao) | 1.5d | Pendente |
| | Prompts Transcricao | Prompt para atendimentos | 0.5d | Pendente |
| | Prompts Audiencia | Prompt para pautas | 0.5d | Pendente |
| **Fase 4 - Supabase** | Supabase Service | Client para gravar enriquecimentos | 1d | Pendente |
| | Migracao DB | Adicionar colunas enrichmentStatus/Data | 0.5d | Pendente |
| **Fase 5 - Endpoints** | /enrich/document | Fluxo completo Docling → Gemini → Supabase | 1d | Pendente |
| | /enrich/pje-text | Fluxo PJe → Gemini → Supabase | 1d | Pendente |
| | /enrich/transcript | Fluxo transcricao → Gemini → Supabase | 0.5d | Pendente |
| | /enrich/audiencia | Fluxo pauta → Gemini → Supabase | 0.5d | Pendente |
| | /enrich/whatsapp | Fluxo WhatsApp → Gemini → Supabase | 0.5d | Pendente |
| **Fase 6 - Integracao** | Next.js hooks | Chamar Engine nos webhooks existentes | 1d | Pendente |
| | PJe Import | Integrar no modal de importacao | 0.5d | Pendente |
| | Drive Webhook | Integrar no webhook de Drive | 0.5d | Pendente |
| **Fase 7 - Testes** | Testes unitarios | Mock Gemini + Mock Supabase | 1d | Pendente |
| | Testes integracao | Fluxo completo com dados reais | 1d | Pendente |
| **Fase 8 - Deploy** | Staging | Deploy no Railway (ambiente staging) | 0.5d | Pendente |
| | Producao | Rollout gradual | 0.5d | Pendente |

**Estimativa Total**: ~17 dias

---

## Consideracoes de Seguranca

### Autenticacao & Autorizacao

- **Vercel → Railway**: API Key no header `X-API-Key`, validada em middleware
- **Railway → Supabase**: `SUPABASE_SERVICE_ROLE_KEY` (service role, bypassa RLS)
- **Nenhum endpoint publico** exceto `/health`
- Rate limiting: 100 req/min por API Key

### Protecao de Dados

**Dados em Transito**:
- HTTPS obrigatorio em todas as conexoes (Railway → Supabase, Vercel → Railway)
- Gemini API via HTTPS (Google Cloud)
- Nunca transmitir dados via URL params (sempre body POST)

**Dados em Repouso**:
- PostgreSQL criptografado (Supabase)
- Nenhum dado persiste no Railway (processamento stateless)
- Logs nao contem conteudo de documentos (apenas metadados: tipo, tamanho, status)

**Dados Sensveis (PII)**:
- CPF, nomes de assistidos: transitam apenas no corpo da requisicao (HTTPS)
- Gemini recebe texto extraido, nao o PDF original
- Nenhum cache de dados sensveis no Railway

### Boas Praticas

- Validacao de input com Pydantic (strict mode)
- Timeout de 60s em chamadas Gemini (evita requests pendurados)
- Circuit breaker em Docling (fallback para Gemini multimodal)
- Rotacao de API Key a cada 90 dias
- Monitoramento de uso de tokens Gemini

---

## Estrategia de Testes

| Tipo | Escopo | Cobertura | Abordagem |
|------|--------|-----------|-----------|
| Unitarios | Prompts, parsers, schemas | > 80% | pytest + mock Gemini |
| Integracao | Endpoints completos | Paths criticos | TestClient FastAPI |
| E2E | Vercel → Railway → Supabase | Happy path | Dados reais anonimizados |

### Cenarios de Teste Prioritarios

**Documentos**:
- PDF de sentenca condenatoria → extrai pena, regime, crime correto
- PDF escaneado (baixa qualidade) → fallback Gemini multimodal
- DOCX de peticao → extrai argumentos e jurisprudencia
- Arquivo corrompido → retorna erro gracioso

**PJe**:
- Intimacao de Juri → detecta atribuicao JURI, extrai correus
- Intimacao VVD com MPU → detecta VVD, extrai medidas
- Intimacao EP com calculo → detecta EP, extrai beneficio
- Texto malformado → extrai o maximo possivel com flag de confianca baixa

**Transcricoes**:
- Relato com nomes de testemunhas → cria casePersonas
- Relato contradizendo versao anterior → flag de contradicao
- Relato com urgencia (preso, audiencia amanha) → flag high/critical

---

## Monitoramento

### Metricas

| Metrica | Tipo | Alerta |
|---------|------|--------|
| `enrichment.latency` | Latencia por endpoint | p95 > 30s por 5min |
| `enrichment.errors` | Taxa de erro | > 5% por 5min |
| `enrichment.documents_processed` | Counter | - |
| `enrichment.gemini_tokens` | Tokens consumidos | > 1M/dia |
| `enrichment.docling_failures` | Falhas Docling | > 3 consecutivas |
| `enrichment.confidence_avg` | Score medio de confianca | < 0.6 por 1h |

### Logs Estruturados

```json
{
  "level": "info",
  "timestamp": "2026-02-20T14:30:00Z",
  "endpoint": "/enrich/document",
  "document_type": "sentenca",
  "mime_type": "application/pdf",
  "file_size_kb": 245,
  "docling_time_ms": 3200,
  "gemini_time_ms": 1800,
  "total_time_ms": 5200,
  "confidence": 0.92,
  "entities_created": 3,
  "assistido_id": 42,
  "processo_id": 156
}
```

**NUNCA logar**: conteudo de documento, nomes de assistidos, CPF, texto de transcricao.

---

## Plano de Rollback

### Triggers de Rollback

| Trigger | Acao |
|---------|------|
| Taxa de erro > 10% por 5min | Rollback imediato no Railway |
| Gemini retornando dados incorretos sistematicamente | Desabilitar endpoint afetado |
| Dados gravados incorretamente no Supabase | Rollback + script de correcao |
| Custo Gemini excede orcamento diario | Rate limiting automatico |

### Passos de Rollback

1. **Rollback Imediato** (< 2 min):
   - Reverter deploy no Railway (botao de rollback)
   - Next.js continua funcionando sem enriquecimento (graceful degradation)

2. **Rollback de Banco** (se dados corrompidos):
   - Colunas `enrichmentStatus/Data` sao aditivas — dados anteriores intactos
   - Script: `UPDATE documentos SET enrichmentStatus = 'pending', enrichmentData = NULL WHERE enrichedAt > 'TIMESTAMP'`

3. **Graceful Degradation**:
   - Se Railway fora do ar: Next.js marca itens como "pending" e processa quando voltar
   - Se Gemini fora do ar: Docling ainda processa, enriquecimento semantico fica pendente
   - Se Docling falha: Fallback para Gemini multimodal (menor precisao em tabelas)

---

## Glossario

| Termo | Definicao |
|-------|-----------|
| **Enrichment** | Processo de extrair informacoes estruturadas de dados brutos |
| **Docling** | Biblioteca open-source IBM para parsing de documentos (PDF, DOCX, imagens) |
| **Gemini Flash** | Modelo de IA Google para extracao semantica rapida e barata |
| **Pipeline** | Sequencia: ingestao → parsing → extracao → gravacao |
| **Confidence Score** | 0-1 indicando confianca na extracao (> 0.8 = confiavel) |
| **Graceful Degradation** | Sistema continua funcionando sem enriquecimento quando Engine esta fora |
| **OSINT** | Open Source Intelligence — investigacao com fontes publicas |
| **caseFacts** | Tabela existente para fatos do caso (controversos/incontroversos) |
| **casePersonas** | Tabela existente para pessoas vinculadas ao caso |
| **factEvidence** | Tabela existente para vinculo entre fatos e provas com score |

---

## Checklist de Validacao

### Secoes Obrigatorias

- [x] Cabecalho com Tech Lead e Time
- [x] Contexto com 2+ paragrafos
- [x] Pelo menos 2 problemas identificados (4 identificados)
- [x] Escopo claro (dentro/fora) com 3+ itens cada
- [x] Diagrama de arquitetura
- [x] Pelo menos 3 riscos com mitigacao (7 identificados)
- [x] Plano de implementacao com fases (8 fases)

### Secoes Criticas (OMBUDS)

- [x] Seguranca: autenticacao definida (API Key + Service Role)
- [x] Seguranca: protecao de PII documentada
- [x] Testes: pelo menos 2 tipos definidos (unitarios + integracao + E2E)
- [x] Monitoramento: metricas definidas (6 metricas)
- [x] Rollback: triggers e passos documentados

### Validacao Tecnica

- [x] Nenhuma nova tabela necessaria (usa modelo existente)
- [x] Dockerfile com dependencias do sistema para Docling
- [x] Schemas Pydantic para todos os endpoints
- [x] Prompts especializados por area/tipo planejados
- [x] Graceful degradation documentado
