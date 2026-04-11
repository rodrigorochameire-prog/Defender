# TDD — Analytics & ML Foundation para OMBUDS

| Campo | Valor |
|-------|-------|
| Tech Lead | @rodrigorochameire |
| Time | Rodrigo + Claude Agents |
| Status | Rascunho |
| Criado | 2026-04-11 |
| Atualizado | 2026-04-11 |

---

## Contexto

O OMBUDS hoje é forte como **sistema de registro**: demandas, processos, assistidos, agenda, drive, atendimentos — tudo estruturado e acessível. A próxima camada natural é o **sistema de leitura**: transformar esses dados em sinais operacionais, previsões e automação inteligente.

Esse TDD propõe uma fundação de analytics + ML em fases, aproveitando três fatos do stack atual:

1. **Supabase Postgres** já concentra 90% dos dados estruturados — e suporta `pgvector` nativamente, o que permite busca semântica sem precisar de Pinecone/Qdrant.
2. **Enrichment-engine** (Python worker no Railway) já é o lugar canônico onde roda código Python conectado ao banco — dá pra estender sem criar nova infra.
3. **Drive é organizado hierarquicamente** pelos defensores (`Processos - {Atribuição}/{Assistido}/{Processo}/`). Essa organização é a **fonte de verdade** do vínculo arquivo↔assistido↔processo para arquivos já triados. ML só entra quando o arquivo está fora dessa hierarquia.

Esse último ponto é a chave deste TDD: o trabalho de linkagem é **determinístico sempre que possível**, e só cai para inferência probabilística no caso marginal do "inbox" de arquivos soltos.

**Domínio**: Transversal (Demandas, Processos, Assistidos, Drive, Análise)

**Stakeholders**: Dr. Rodrigo, Dra. Juliane, equipe de estagiários (consumem KPIs e sugestões), futuros 25 usuários do plano de escalonamento.

---

## Definição do Problema

### Problemas que estamos resolvendo

- **P1 — Dados sem visão agregada**: o defensor vê demandas individuais, mas não sabe responder em 2 segundos "qual meu backlog por atribuição?", "quantas estouraram prazo esse mês?", "qual meu throughput?".
  - *Impacto*: gestão reativa em vez de proativa; sobrecarga só é descoberta quando o estrago já está feito.

- **P2 — Priorização manual e subjetiva**: nenhum sinal de risco automatizado. O defensor decide "o que atacar primeiro" olhando a lista no olho.
  - *Impacto*: demandas de alto risco (prazo curto + ato complexo + réu preso) competem visualmente com demandas triviais.

- **P3 — Drive desconectado**: arquivos organizados nas pastas já estão lá, mas o OMBUDS não os "enxerga" — nenhum índice, nenhuma listagem no perfil do assistido, nenhuma busca por conteúdo.
  - *Impacto*: defensor abre OMBUDS **e** abre Drive em outra aba. Fluxo fragmentado.

- **P4 — PDFs soltos no inbox**: quando chega um lote de PDFs (resposta de ofício, autos, laudos) fora da hierarquia `/assistido/processo/`, triar manualmente para a pasta certa consome tempo significativo.
  - *Impacto*: backlog de organização + risco de deixar um documento importante invisível.

- **P5 — Autos longos**: autos com 200-1000 páginas são praticamente ilegíveis sob pressão de prazo. Sumário executivo estruturado (partes, fatos, teses, provas, decisões) economizaria horas por caso.
  - *Impacto*: preparação insuficiente; decisões tomadas sobre amostra incompleta.

### Não-objetivos desta fase

- Não é um rewrite do enrichment-engine — é extensão.
- Não vai treinar modelos do zero. Usa pré-treinados, fine-tune só quando houver dados de validação suficientes (>6 meses).
- Não substitui revisão humana em decisões jurídicas — sugere, ranqueia, destaca.
- Não migra nada do stack Next.js/tRPC/Drizzle. Adiciona endpoints, não substitui.

---

## Estado Atual

### Dados e Infra que já existem

| Componente | Estado | Notas |
|---|---|---|
| Supabase Postgres | ✅ produção | 249 demandas, ~800 processos, schema estável |
| Drizzle schema | ✅ | `demandas`, `processos`, `assistidos`, `audiencias`, `analise_ia` (jsonb) |
| Enrichment-engine | ✅ Railway | Python 3.11, já conecta no pg, já baixa de PJe |
| Drive integration | ✅ | `drive_folder_id` por user e por assistido; hierarquia consistente |
| Google Drive API auth | ✅ | Service account + OAuth per-user |
| Kreuzberg MCP | ✅ local | OCR/extração de PDF disponível no Mac Mini |
| Análise via Claude | ✅ | Pipeline `batch_juri_cowork.py` já roda sumários via Sonnet |

### O que falta

- Nenhuma view materializada, nenhum cache de métricas. Toda agregação é ad-hoc via tRPC.
- `pgvector` não ativado — precisa `CREATE EXTENSION` e validar disponibilidade no plano.
- Nenhum índice de arquivos do Drive no banco. O Drive é uma "caixa preta" pra app.
- Nenhum modelo preditivo, nenhuma tabela de features.
- Embeddings nunca foram calculados sobre os textos que o sistema tem.

---

## Decisão de Arquitetura

### Princípios

1. **SQL antes de Python**. Se dá pra resolver com view materializada, não abre worker Python.
2. **Determinístico antes de probabilístico**. Path do Drive > regex > embedding > manual. Nessa ordem.
3. **Extender enrichment-engine, não criar nova infra**. Mesmo repo, mesmo Railway, novos endpoints.
4. **Pré-treinado antes de fine-tune**. HuggingFace tem modelos PT-BR jurídicos suficientes pra MVP.
5. **Pg como single source of truth**. Todo resultado de ML volta pro pg (predição, embedding, sumário) — o front nunca fala direto com o worker.

### Camadas

```
┌─────────────────────────────────────────────────────────┐
│ Next.js (OMBUDS)                                         │
│  - tRPC routers: kpis, driveFiles, analytics            │
│  - Lê de views SQL + tabelas de resultado                │
└───────────────────────┬─────────────────────────────────┘
                        │ SQL
                        ▼
┌─────────────────────────────────────────────────────────┐
│ Supabase Postgres                                        │
│  - Views materializadas (KPIs)                           │
│  - Tabelas de resultado (drive_file_index,               │
│    demanda_risk_scores, processo_summaries)              │
│  - Embeddings (pgvector)                                 │
└───────────────▲────────────────────▲────────────────────┘
                │                    │
                │ escreve resultados  │
                │                    │
┌───────────────┴────┐  ┌────────────┴──────────────────┐
│ SQL Cron           │  │ enrichment-engine (expandido)  │
│  - REFRESH MVIEW   │  │  - FastAPI endpoints           │
│  - pg_cron         │  │  - LightGBM (risco prazo)      │
│                    │  │  - HF transformers (sumário)   │
│                    │  │  - sentence-transformers       │
│                    │  │    (embeddings)                │
│                    │  │  - Drive indexer (walk tree)   │
└────────────────────┘  └────────────────────────────────┘
```

### Estratégia dual para vinculação Drive ↔ Assistido/Processo

Essa é a parte mais importante do TDD porque define onde ML **não** é necessário.

#### Estratégia A — "Estrutura é o vínculo" (determinístico, 90% dos casos)

Pasta no Drive já segue o padrão:

```
Meu Drive/1 - Defensoria 9ª DP/
  Processos - Júri/
    CARLOS SILVA SANTOS/
      0012345-67.2024.8.05.0039/
        denuncia.pdf
        alegacoes_finais.pdf
```

Um job Python walks a árvore, e para cada arquivo:

1. Lê o **path completo**.
2. Extrai `atribuição`, `nome do assistido`, `número do processo` por posição hierárquica.
3. Match `nome` + `número` contra tabelas `assistidos` / `processos`.
4. Insere/atualiza linha em `drive_file_index` com:
   - `link_strategy = 'path'`
   - `link_confidence = 1.0`
   - `assistido_id`, `processo_id` preenchidos

**Resultado**: 90%+ dos arquivos indexados sem um único modelo de ML, sem ambiguidade, auditável, reproduzível. Custo computacional: ~segundos para milhares de arquivos.

#### Estratégia B — "Inbox" (inferência, ~10% dos casos)

Pasta `Inbox/` ou qualquer arquivo fora da hierarquia canônica. Pipeline:

1. **Extração de texto** (kreuzberg / unpdf — tooling já existe).
2. **Regex determinísticas** — CPF, número de processo (padrão CNJ), OAB, CPF de defensor:
   ```
   \d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}    → processo
   \d{3}\.\d{3}\.\d{3}-\d{2}               → CPF
   ```
   Se match → `link_strategy = 'regex'`, confidence 0.95, vínculo direto.
3. **NER jurídica** com `pierreguillou/ner-bert-base-cased-pt-lenerbr` — extrai entidades "PESSOA", "JURISPRUDENCIA", "LOCAL", "TEMPO", "ORGANIZACAO". Nomes de PESSOA viram candidatos.
4. **Embeddings semânticos** com `sentence-transformers/paraphrase-multilingual-mpnet-base-v2` (768 dims). Compara contra embeddings de:
   - Denúncias indexadas (conteúdo factual)
   - Nomes e apelidos de assistidos
   - Sumários de processos existentes
5. **Top-K ranking** → se top-1 > 0.85 de similaridade cosine E nome bateu na NER → sugere link automático (`link_strategy = 'embedding'`, confidence = score). Abaixo disso → fica em `drive_link_suggestions` para revisão manual com top-3 candidatos.

**Resultado**: ~70-80% dos arquivos de inbox classificados automaticamente, o resto vai pra fila de revisão com sugestões ranqueadas. Defensor aprova com 1 clique.

A separação clara Estratégia A/B significa que **você não paga o custo computacional da Estratégia B para 90% dos arquivos**. Isso é o insight que destrava a arquitetura.

---

## Modelo de Dados

### Novas tabelas

```sql
-- Habilitar pgvector (uma vez)
CREATE EXTENSION IF NOT EXISTS vector;

-- Índice de arquivos do Drive (fonte canônica do vínculo)
CREATE TABLE drive_file_index (
  id BIGSERIAL PRIMARY KEY,
  drive_file_id TEXT UNIQUE NOT NULL,        -- ID do arquivo no Google Drive
  drive_path TEXT NOT NULL,                   -- path completo do Drive
  file_name TEXT NOT NULL,
  mime_type TEXT,
  size_bytes BIGINT,
  modified_time TIMESTAMPTZ,

  -- Vínculo (preenchido por uma das estratégias)
  assistido_id INT REFERENCES assistidos(id) ON DELETE SET NULL,
  processo_id INT REFERENCES processos(id) ON DELETE SET NULL,
  link_strategy TEXT NOT NULL CHECK (
    link_strategy IN ('path','regex','embedding','manual','pending')
  ),
  link_confidence REAL,

  -- Metadados
  indexed_at TIMESTAMPTZ DEFAULT now(),
  last_seen_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_dfi_assistido ON drive_file_index(assistido_id)
  WHERE deleted_at IS NULL;
CREATE INDEX idx_dfi_processo ON drive_file_index(processo_id)
  WHERE deleted_at IS NULL;
CREATE INDEX idx_dfi_strategy ON drive_file_index(link_strategy);

-- Sugestões pendentes da Estratégia B (inbox)
CREATE TABLE drive_link_suggestions (
  id BIGSERIAL PRIMARY KEY,
  drive_file_id TEXT NOT NULL REFERENCES drive_file_index(drive_file_id)
    ON DELETE CASCADE,
  suggested_assistido_id INT REFERENCES assistidos(id),
  suggested_processo_id INT REFERENCES processos(id),
  score REAL NOT NULL,                        -- similaridade cosine
  evidence JSONB,                             -- { ner_hits, regex_hits, ... }
  rank INT NOT NULL,                          -- 1..3
  created_at TIMESTAMPTZ DEFAULT now(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by INT REFERENCES users(id),
  decision TEXT CHECK (decision IN ('accepted','rejected'))
);

-- Scores de risco de prazo (preenchido pelo modelo LightGBM)
CREATE TABLE demanda_risk_scores (
  demanda_id INT PRIMARY KEY REFERENCES demandas(id) ON DELETE CASCADE,
  risk_score REAL NOT NULL,                   -- 0..1, prob de estourar prazo
  risk_factors JSONB,                         -- {"prazo_dias": 2, "carga": "alta", ...}
  computed_at TIMESTAMPTZ DEFAULT now(),
  model_version TEXT NOT NULL
);

-- Sumários estruturados de processos (HuggingFace + Claude)
CREATE TABLE processo_summaries (
  processo_id INT PRIMARY KEY REFERENCES processos(id) ON DELETE CASCADE,
  partes JSONB,                               -- {acusacao, defesa, vitima, correus}
  fatos TEXT,
  tese_acusatoria TEXT,
  provas_produzidas JSONB,
  decisoes JSONB,                             -- cronologia de decisões
  pontos_de_atencao JSONB,
  confidence_level TEXT,                      -- 'draft' | 'refined'
  generated_by TEXT,                          -- 'hf-ptt5' | 'claude-sonnet' | 'hybrid'
  generated_at TIMESTAMPTZ DEFAULT now(),
  source_file_ids TEXT[]                      -- quais drive_file_ids alimentaram
);

-- Embeddings (opcional: tabela separada, ou colunas vector() nas existentes)
ALTER TABLE processos ADD COLUMN embedding vector(768);
CREATE INDEX idx_proc_embedding ON processos
  USING hnsw (embedding vector_cosine_ops);

ALTER TABLE drive_file_index ADD COLUMN embedding vector(768);
CREATE INDEX idx_dfi_embedding ON drive_file_index
  USING hnsw (embedding vector_cosine_ops);
```

### Views materializadas (Fase 1)

```sql
-- Backlog por defensor/atribuição/status
CREATE MATERIALIZED VIEW mv_kpi_backlog AS
SELECT
  d.defensor_id,
  p.atribuicao,
  d.status,
  COUNT(*) AS total,
  COUNT(*) FILTER (WHERE d.prazo < now() + INTERVAL '3 days') AS urgentes
FROM demandas d
LEFT JOIN processos p ON p.id = d.processo_id
WHERE d.deleted_at IS NULL
GROUP BY d.defensor_id, p.atribuicao, d.status;

-- Throughput semanal
CREATE MATERIALIZED VIEW mv_kpi_throughput AS
SELECT
  d.defensor_id,
  p.atribuicao,
  date_trunc('week', d.created_at) AS semana,
  COUNT(*) FILTER (WHERE d.status = 'CONCLUIDO') AS concluidas,
  COUNT(*) AS criadas
FROM demandas d
LEFT JOIN processos p ON p.id = d.processo_id
WHERE d.deleted_at IS NULL
  AND d.created_at > now() - INTERVAL '6 months'
GROUP BY d.defensor_id, p.atribuicao, date_trunc('week', d.created_at);

-- Refresh periódico (pg_cron)
SELECT cron.schedule('refresh-kpis', '*/15 * * * *', $$
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_kpi_backlog;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_kpi_throughput;
$$);
```

---

## Fases de Entrega

### Fase 0 — Notebook exploratório (1-2 dias)

**Entrega**: `notebooks/01-kpis-operacionais.ipynb`

**Objetivo**: validar que as métricas propostas fazem sentido antes de gravar em view. Zero produção.

**Conteúdo**:
- Conexão read-only ao Supabase via `DATABASE_URL`
- 5 gráficos base: throughput, backlog, distribuição de prazos, top atos, tempo até 1ª peça
- Conclusão: decidir quais viram view materializada

**Rodando**: Jupyter Lab local no Mac Mini, `.venv` Python 3.11, `pip install pandas sqlalchemy psycopg2-binary plotly`.

**Critério de sucesso**: os 5 gráficos fazem sentido operacional para você e Dra. Juliane numa sessão de review.

---

### Fase 1 — SQL Views + tRPC KPIs (3 dias)

**Entrega**:
- Migration Drizzle criando views materializadas
- `pg_cron` job de refresh 15min
- tRPC router `src/lib/trpc/routers/kpis.ts`
- Seção "Visão Geral" no dashboard admin consumindo os KPIs

**Risco baixo**: tudo em SQL, nenhum modelo de ML, nenhuma dependência externa.

**Critério de sucesso**: dashboard carrega backlog+throughput em <500ms; refresh automático verificado.

---

### Fase 2 — Drive File Index (Estratégia A — path-based) (3 dias)

**Entrega**:
- Migration criando `drive_file_index`
- Job Python no `enrichment-engine` que walks a árvore do Drive de cada defensor
- Indexação incremental (usa `modifiedTime` do Drive API)
- tRPC `assistidos.driveFiles` e `processos.driveFiles`
- Nova aba "Arquivos" na página de assistido/processo mostrando arquivos indexados com link direto

**Scheduling**: job roda 1× a cada 6h por defensor + hook quando defensor clica "sincronizar Drive".

**Critério de sucesso**: 90%+ dos arquivos do Drive do Dr. Rodrigo aparecem vinculados corretamente nos perfis de assistidos; operação de reindexação total leva <5 min.

---

### Fase 3 — Analytics Engine (LightGBM de risco de prazo) (5 dias)

**Entrega**:
- Novo endpoint `POST /analytics/demanda-risk` no enrichment-engine
- Feature engineering: tipo ato, dias até prazo, carga do defensor, histórico do defensor com ato similar, complexidade textual (len + n palavras jurídicas), réu preso, atribuição
- Modelo LightGBM treinado localmente com histórico existente (cross-validation 5-fold)
- Tabela `demanda_risk_scores` populada por cron job
- UI: indicador visual de risco no card de demanda (verde/amarelo/vermelho) + filtro "alto risco"

**Treino**: offline, versionado via `mlflow` ou apenas `model.joblib` + metadata em tabela.

**Critério de sucesso**: precision >70% na classe "estourou prazo"; defensor confirma que o top-10 "alto risco" faz sentido.

---

### Fase 4 — Drive Inbox (Estratégia B — ML linkage) (5 dias)

**Entrega**:
- Pasta `Inbox/` monitorada por watcher (ou scan periódico)
- Pipeline Python: extract → regex → NER → embeddings → rank
- Modelos carregados: `pierreguillou/ner-bert-base-cased-pt-lenerbr`, `sentence-transformers/paraphrase-multilingual-mpnet-base-v2`
- `drive_link_suggestions` populada com top-3 por arquivo
- Página "Inbox" no OMBUDS mostrando cada arquivo com 3 botões de aceitar + 1 de rejeitar + editar manualmente

**Modelos**: rodam no próprio enrichment-engine (CPU é suficiente pra esse volume — dezenas/centenas de docs por dia).

**Critério de sucesso**: 70%+ de aceitação das sugestões top-1 em um mês de uso real.

---

### Fase 5 — Summarização de Autos (HuggingFace + Claude híbrido) (7 dias)

**Entrega**:
- Pipeline de sumário em `enrichment-engine`:
  1. Seleciona autos do processo (via `drive_file_index`)
  2. Extrai texto
  3. **Chunk jurídico**: usa regex + headings pra cortar em peças canônicas (denúncia, interrogatório, alegações finais, sentenças, decisões interlocutórias)
  4. **Sumário draft** por chunk com `recogna-nlp/ptt5-base-summ` (HF local, CPU)
  5. **Refinamento estruturado** com Claude Sonnet: transforma sumários em JSON conforme schema `processo_summaries`
- Invalidação: quando novo arquivo é indexado no `drive_file_index` com tipo "auto", re-enfileira sumário
- UI: nova sub-aba "Sumário Estruturado" na página de processo com JSON renderizado bonito

**Custo**: HF local = zero marginal. Claude refinement = ~$0.05-0.15 por processo pequeno/médio.

**Critério de sucesso**: sumário fica pronto em <2min por processo; defensor diz que economiza >30min de leitura por caso.

---

## Tradeoffs e Alternativas Consideradas

| Decisão | Alternativa | Por que não |
|---|---|---|
| Extender enrichment-engine | Criar `analytics-engine` separado | Duplicaria infra, deploy, monitoring. Mesmo stack Python, mesmo banco, zero benefício em separar. |
| pgvector no próprio Postgres | Pinecone / Qdrant | Custo, rede externa, mais uma credencial. pgvector é suficiente pra 10-100k vetores. |
| SQL views antes de Python | Python direto pra tudo | Views rodam em 5ms, Python roundtrip custa 50-200ms + complexidade. YAGNI. |
| HF pré-treinado | Fine-tune T5 em dados próprios | Não temos volume/labels pra treinar bem. Pré-treinado entrega 80% do valor com 0% do custo. Fine-tune vira Fase 6+ depois de 6 meses de feedback. |
| LightGBM | Redes neurais tabulares | Tabular com <10k linhas = gradient boosting é estado-da-arte. Mais rápido, interpretable, menos hiperparâmetro. |
| Estratégia A dupla (path + regex) | Ir direto pra embeddings em tudo | Embeddings em 10k arquivos = overhead enorme pra resolver algo que path resolve com 100% de certeza. Determinístico primeiro. |

---

## Riscos e Mitigações

| Risco | Probabilidade | Impacto | Mitigação |
|---|---|---|---|
| pgvector não disponível no plano Supabase atual | Baixa | Alto | Validar na Fase 0. Fallback: FAISS em arquivo persistido no Railway. |
| Modelos HF PT-BR jurídicos insuficientes | Média | Médio | Pipeline híbrido já prevê Claude como refinamento. HF vira draft. |
| Drive API rate limits em walk completo | Média | Médio | Indexação incremental (só arquivos `modifiedTime > last_indexed`); backoff exponencial; cache por defensor. |
| LightGBM com poucos dados históricos (<500 labels) | Alta | Médio | Fase 3 começa com baseline heurístico (regras manuais) e evolui para ML quando houver >500 casos rotulados. |
| Custo Claude Sonnet escalando | Baixa | Médio | Cache de sumário por hash do conteúdo; só regenera se arquivos mudam. |
| Drive paths não-padronizados em alguns defensores | Média | Baixo | Fase 2 tem fallback: arquivo sem path canônico cai automaticamente em `strategy=pending`, vira candidato pra Estratégia B. |

---

## Métricas de Sucesso Globais

- **Fase 1**: dashboard carregando em <500ms, KPIs visíveis e acionáveis.
- **Fase 2**: >90% dos arquivos do Drive indexados corretamente via path.
- **Fase 3**: top-10 de risco é aprovado como "faz sentido" pelo defensor em review semanal.
- **Fase 4**: >70% de sugestões top-1 aceitas no inbox.
- **Fase 5**: sumário estruturado pronto em <2min; economia de >30min de leitura por caso relatada em uso real.
- **Global**: zero quebra de funcionalidade existente; todas as fases são adicionais.

---

## Dependências

- `pgvector` extension habilitada no Supabase — **bloqueante para Fases 4 e 5**.
- `pg_cron` disponível — necessário pra refresh de mviews. Já disponível no Supabase.
- `enrichment-engine` aceitando novos endpoints — precisa deploy, mas infra já existe.
- Python 3.11 + `lightgbm`, `sentence-transformers`, `transformers`, `spacy`, `pandas`, `sqlalchemy`, `fastapi`, `uvicorn`.
- Modelos HF: `pierreguillou/ner-bert-base-cased-pt-lenerbr`, `sentence-transformers/paraphrase-multilingual-mpnet-base-v2`, `recogna-nlp/ptt5-base-summ`.

---

## Primeiro Passo Concreto

**Hoje, sem deploy nenhum**: criar `notebooks/01-kpis-operacionais.ipynb` no repo do Defender. Roda no Mac Mini via Jupyter, conecta no Supabase, gera os 5 KPIs base. Isso destrava a Fase 1 porque valida quais métricas viram view.

Dali, sequência natural:
1. Fase 0 → Fase 1 (KPIs em produção)
2. Fase 2 (Drive index por path) — ganho imediato de UX
3. Fase 4 depende de Fase 2 estar pronta
4. Fase 3 e 5 em paralelo com Fase 2/4

---

## Referências cruzadas

- `docs/plans/2026-02-20-enrichment-engine-tdd.md` — arquitetura base que será estendida
- `docs/plans/2025-02-09-organizacao-drive-hierarquica.md` — convenção de pastas que a Estratégia A assume
- `project_analysis_pipeline_v2` (memory) — schema de análise_ia já populado, integra com Fase 5
- `project_pje_download_challenge` (memory) — pipeline de download de autos alimenta Fase 5
