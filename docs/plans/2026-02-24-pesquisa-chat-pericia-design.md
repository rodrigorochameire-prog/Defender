# Design: Pesquisa Semântica + Chat RAG + Perícia Digital

> Aprovado em 2026-02-24
> Inspirado na análise do DefendaMe (defendame.app)
> Rollout: Incremental (Fase 1 → 2 → 3)

---

## Fase 1: Pesquisa Semântica Universal (pgvector)

### Objetivo
Busca semântica em TODAS as entidades do OMBUDS: documentos, anotações, movimentações, case_facts e julgados.

### Pré-requisitos
- `CREATE EXTENSION vector` no Supabase
- `pip install pgvector` no Enrichment Engine
- Modelo de embeddings: `text-embedding-004` (Gemini, 768 dimensões)

### Nova tabela: `embeddings`

```sql
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE embeddings (
  id SERIAL PRIMARY KEY,
  entity_type TEXT NOT NULL, -- 'documento', 'anotacao', 'movimentacao', 'case_fact', 'julgado'
  entity_id INTEGER NOT NULL,
  assistido_id INTEGER REFERENCES assistidos(id),
  processo_id INTEGER REFERENCES processos(id),
  chunk_index INTEGER DEFAULT 0,
  content_text TEXT NOT NULL,
  embedding vector(768) NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_embeddings_hnsw ON embeddings
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

CREATE INDEX idx_embeddings_entity ON embeddings (entity_type, entity_id);
CREATE INDEX idx_embeddings_assistido ON embeddings (assistido_id) WHERE assistido_id IS NOT NULL;
CREATE INDEX idx_embeddings_processo ON embeddings (processo_id) WHERE processo_id IS NOT NULL;
```

### Alteração na tabela `documentos`

```sql
ALTER TABLE documentos ADD COLUMN conteudo_completo TEXT;
```

Persiste o markdown completo gerado pelo Docling (hoje descartado após extração).

### Fluxo de indexação

1. **Documentos**: Docling → markdown → salvar em `conteudo_completo` → split em chunks ~500 tokens → embedding por chunk → insert `embeddings`
2. **Anotações**: conteudo direto → embedding → insert (sem chunking, textos curtos)
3. **Movimentações**: descricao → embedding → insert
4. **Case Facts**: titulo + descricao → embedding → insert
5. **Julgados**: migrar de jsonb `embedding` para pgvector nativo + backfill

### Novo serviço: `embedding_service.py`

```python
class EmbeddingService:
    async def generate_embedding(text: str) -> list[float]
    async def index_document(doc_id: int, markdown: str, assistido_id: int, processo_id: int)
    async def index_anotacao(anotacao_id: int, conteudo: str, assistido_id: int, processo_id: int)
    async def index_movimentacao(mov_id: int, descricao: str, processo_id: int)
    async def index_case_fact(fact_id: int, titulo: str, descricao: str, assistido_id: int)
    async def search(query: str, filters: dict, limit: int = 20) -> list[SearchResult]
```

### Novo endpoint

```
POST /search/semantic
  body: { query: string, filters: { assistido_id?, processo_id?, entity_types?: string[] }, limit: int }
  returns: [{ entity_type, entity_id, content_text, score, metadata }]
```

### Chunking strategy

- Documentos longos: split por parágrafos, max ~500 tokens por chunk
- Overlap de 50 tokens entre chunks (para não perder contexto nas bordas)
- Cada chunk indexado com chunk_index incrementando

### UI: Página de Busca Global

Refatorar o stub existente em `/admin/busca`:
- Campo de busca com autocomplete
- Resultados rankeados por relevância (score pgvector)
- Filtros: por assistido, processo, tipo de entidade, período
- Preview do chunk com highlight do match
- Link direto para o documento/anotação original

### Estimativa: 5-6 dias

---

## Fase 2: Chat RAG Global com Filtro

### Objetivo
Chat com IA que busca no índice semântico da Fase 1 e responde com contexto do caso. Acessível de qualquer tela via página dedicada `/admin/chat`.

### Dependência
- Fase 1 (pgvector + endpoint de busca semântica)

### Fluxo RAG

```
Usuário digita pergunta
    │
    ▼
1. Gerar embedding da pergunta (text-embedding-004)
    │
    ▼
2. Busca semântica (pgvector) com filtros opcionais
   ├── assistido_id (se selecionado)
   ├── processo_id (se selecionado)
   └── top 10 chunks mais relevantes
    │
    ▼
3. Montar prompt RAG
   ├── System: "Assistente jurídico do OMBUDS para Defensoria Pública..."
   ├── Context: 10 chunks com metadata (tipo, título, data, assistido)
   ├── Chat history: últimas N mensagens da sessão
   └── User: pergunta atual
    │
    ▼
4. Gemini 2.5 Flash → resposta com citações
   ├── Cita fontes: "[Documento: Sentença 123]", "[Anotação: Audiência 15/01]"
   └── Links clicáveis para originais
```

### Novas tabelas

```sql
CREATE TABLE chat_sessions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  titulo TEXT,
  assistido_id INTEGER REFERENCES assistidos(id),
  processo_id INTEGER REFERENCES processos(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE chat_messages (
  id SERIAL PRIMARY KEY,
  session_id INTEGER NOT NULL REFERENCES chat_sessions(id),
  role TEXT NOT NULL, -- 'user', 'assistant'
  content TEXT NOT NULL,
  sources JSONB DEFAULT '[]', -- [{ entity_type, entity_id, content_preview, score }]
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### Novo endpoint RAG

```
POST /chat/rag
  body: {
    message: string,
    session_id?: int,
    filters: { assistido_id?, processo_id? },
    history: [{ role, content }]  // últimas N mensagens
  }
  returns: {
    response: string,
    sources: [{ entity_type, entity_id, content_text, score, metadata }],
    session_id: int
  }
```

### Quick Actions

Cards no chat vazio para ações frequentes:
- "Resumir caso do assistido X" → busca tudo daquele assistido
- "Prazos pendentes" → busca demandas com prazo próximo
- "O que há de novo?" → busca movimentações/intimações recentes (últimos 7 dias)
- "Contradições nos depoimentos" → busca anotações + docs comparando versões

### UI: `/admin/chat`

- Página no sidebar (ícone MessageCircle)
- Lista de sessões anteriores (sidebar esquerdo do chat)
- Filtro por assistido/processo (dropdown no topo)
- Mensagens com formatação Markdown
- Fontes clicáveis com preview em tooltip
- Streaming da resposta (SSE ou polling)

### Estimativa: 5-7 dias

---

## Fase 3: Perícia Digital (UFDR + ERBs)

### Objetivo
Analisar relatórios forenses de celulares (UFDR/Cellebrite) e dados de localização por antenas (ERBs) para apoiar teses defensivas.

### Dependência
- Fase 1 (embeddings para mensagens extraídas)

### UFDR Parser

**Formato de entrada:** ZIP contendo XML (report.xml) + HTMLs + attachments

**Entidades extraídas:**
- Contatos (nome, telefone, app de origem)
- Mensagens (SMS, WhatsApp, Telegram — remetente, data, conteúdo)
- Chamadas (número, duração, tipo in/out/missed)
- Localização GPS (lat, lon, timestamp, precisão)
- Timeline de apps (app, hora de uso, duração)
- Arquivos de mídia (fotos com EXIF geodata)

**Pipeline:**
```
Upload ZIP → Extrair → Identificar formato (UFDR Reader/PA/Logical/Physical)
    │
    ├── Parse XML/HTML → Extrair entidades normalizadas
    ├── Gerar embeddings dos textos (mensagens, notas)
    └── Gemini análise:
        ├── Timeline narrativa
        ├── Contradições com versão da acusação
        ├── Contatos relevantes (frequência, últimas comunicações)
        └── Localização vs ERBs (cross-reference)
```

### ERB Parser

**Formato de entrada:** CSV/Excel com colunas variáveis por operadora

**Colunas esperadas (normalização):**
`IMEI | Data/Hora | ERB_ID | Latitude | Longitude | Azimute | Tipo (voz/dados)`

**Pipeline:**
```
Upload CSV/Excel → Parse → Normalizar colunas
    │
    ├── Geocoding: ERB_ID → coordenadas
    ├── Timeline de localização
    │   ├── Mapa de calor (frequência por local)
    │   ├── Rota provável (sequência de ERBs)
    │   └── Presença em local X no horário Y
    ├── Cross-reference com UFDR (se disponível)
    └── Gemini análise:
        ├── Álibi: "Réu estava a Xkm do local às Y horas"
        ├── Contradições com depoimentos
        └── Limitações técnicas (raio de cobertura)
```

### Modelo de dados

```sql
CREATE TABLE forense_pericias (
  id SERIAL PRIMARY KEY,
  assistido_id INTEGER REFERENCES assistidos(id),
  processo_id INTEGER REFERENCES processos(id),
  tipo TEXT NOT NULL, -- 'ufdr', 'erb'
  nome TEXT NOT NULL,
  status TEXT DEFAULT 'pending', -- pending/processing/completed/failed
  arquivo_original_url TEXT,
  resultado JSONB, -- resumo da análise Gemini
  total_entidades INTEGER DEFAULT 0,
  created_by_id INTEGER NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE forense_entidades (
  id SERIAL PRIMARY KEY,
  pericia_id INTEGER NOT NULL REFERENCES forense_pericias(id),
  tipo TEXT NOT NULL, -- 'contato', 'mensagem', 'chamada', 'localizacao', 'midia', 'app_usage'
  data_hora TIMESTAMPTZ,
  conteudo TEXT,
  metadata JSONB DEFAULT '{}',
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  embedding vector(768)
);

CREATE INDEX idx_forense_entidades_pericia ON forense_entidades(pericia_id);
CREATE INDEX idx_forense_entidades_tipo ON forense_entidades(tipo);
CREATE INDEX idx_forense_entidades_geo ON forense_entidades(latitude, longitude)
  WHERE latitude IS NOT NULL;
CREATE INDEX idx_forense_entidades_embedding ON forense_entidades
  USING hnsw (embedding vector_cosine_ops)
  WHERE embedding IS NOT NULL;

CREATE TABLE forense_erb_pontos (
  id SERIAL PRIMARY KEY,
  pericia_id INTEGER NOT NULL REFERENCES forense_pericias(id),
  imei TEXT,
  data_hora TIMESTAMPTZ NOT NULL,
  erb_id TEXT,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  azimute INTEGER,
  tipo_conexao TEXT, -- 'voz', 'dados'
  metadata JSONB DEFAULT '{}'
);

CREATE INDEX idx_erb_pontos_pericia ON forense_erb_pontos(pericia_id);
CREATE INDEX idx_erb_pontos_tempo ON forense_erb_pontos(data_hora);

CREATE TABLE forense_locais_interesse (
  id SERIAL PRIMARY KEY,
  pericia_id INTEGER NOT NULL REFERENCES forense_pericias(id),
  nome TEXT NOT NULL, -- "Local do crime", "Residência do réu"
  tipo TEXT NOT NULL, -- 'crime', 'residencia', 'alibi', 'trabalho', 'outro'
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  raio_metros INTEGER DEFAULT 200,
  cor TEXT DEFAULT '#ef4444' -- cor no mapa
);
```

### Mapa Interativo (Leaflet + React-Leaflet)

**Dependências:** `react-leaflet`, `leaflet`, `@types/leaflet`

**Componente: `ForenseMap`**

Layers:
1. **ERBs**: Marcadores com círculo de raio estimado (~300m urbano, ~2km rural), cor gradiente temporal
2. **GPS (UFDR)**: Pontos exatos conectados por trilha, fotos geotagged com ícone de câmera
3. **Locais de interesse**: Pins coloridos marcados pelo defensor (crime=vermelho, residência=azul, álibi=verde)

Controles:
- Slider de tempo (replay da timeline hora a hora)
- Toggle layers (ERB/GPS/locais)
- Filtro por período (data/hora início-fim)
- Exportar como imagem PNG (para petição)
- Medida de distância (entre 2 pontos)

### Timeline integrada

Painel lateral ao mapa com eventos cronológicos:
```
[19:00] 📱 WhatsApp msg para "Maria" — "to chegando"
[19:15] 📍 ERB: Torre Av. Brasil (lat -12.97, lon -38.51)
[19:22] 📞 Chamada recebida de "João" (2min38s)
[19:30] 📍 GPS: foto IMG_2034.jpg (lat -12.98, lon -38.52)
[19:45] 📍 ERB: Torre Rua da Paz (lat -13.01, lon -38.50)
[20:00] ⚠️ HORÁRIO DO FATO (marcado pelo defensor)
[20:10] 📍 ERB: Torre Av. Brasil — 3.2km do local do crime
```

Cada item clicável → centraliza mapa naquele ponto.

### Endpoints

```
POST /forense/ufdr/upload     — Upload ZIP, retorna job_id
POST /forense/erb/upload      — Upload CSV/Excel, retorna job_id
GET  /forense/pericias        — Lista perícias do usuário
GET  /forense/pericias/{id}   — Detalhes + entidades + resultado
GET  /forense/pericias/{id}/timeline — Timeline ordenada cronologicamente
GET  /forense/pericias/{id}/mapa     — Dados para renderizar mapa (GeoJSON)
POST /forense/pericias/{id}/locais   — Adicionar local de interesse
POST /forense/pericias/{id}/analise  — Disparar análise Gemini
```

### UI: `/admin/forense`

- Sidebar: novo item "Perícia Digital" (ícone Fingerprint ou Shield)
- Lista de perícias por assistido
- Upload drag-and-drop (UFDR ZIP / ERB CSV)
- Dashboard de resultados:
  - Aba "Timeline" — eventos cronológicos
  - Aba "Mapa" — Leaflet interativo
  - Aba "Mensagens" — busca em mensagens extraídas
  - Aba "Contatos" — rede de contatos
  - Aba "Análise IA" — resumo Gemini com contradições

### Estimativa: 12-15 dias

---

## Resumo de Implementação

| Fase | Feature | Estimativa | Entregáveis |
|------|---------|------------|-------------|
| 1 | Pesquisa Semântica | 5-6 dias | pgvector, tabela embeddings, indexação, endpoint busca, UI busca global |
| 2 | Chat RAG Global | 5-7 dias | Página /admin/chat, endpoint RAG, quick actions, histórico |
| 3 | Perícia Digital | 12-15 dias | UFDR parser, ERB parser, mapa Leaflet, timeline, análise Gemini |
| **Total** | | **22-28 dias** | |

## Diferencial vs DefendaMe

| Feature | OMBUDS | DefendaMe |
|---------|--------|-----------|
| Gestão completa do assistido | ✅ | ❌ |
| Integração Solar/PJe/SIGAD | ✅ | ❌ |
| Chat RAG com contexto do processo inteiro | ✅ | ⚠️ (só docs) |
| Mapa ERBs interativo com timeline | ✅ | ❌ |
| Cross-reference UFDR × ERB automático | ✅ | ❌ |
| Busca semântica em TUDO | ✅ | ⚠️ (só docs) |
| Gratuito para defensores | ✅ | ❌ (R$997/UFDR) |
