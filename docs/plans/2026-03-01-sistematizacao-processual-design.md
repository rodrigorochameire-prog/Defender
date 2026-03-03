# Sistematizacao Processual — Design Aprovado

> Data: 2026-03-01
> Status: Design aprovado, implementacao em andamento

## Visao Geral

Transformar o visualizador PDF em uma **Mesa de Revisao** onde o defensor revisa, aprova e refina analises de IA sobre pecas processuais. Cada secao classificada (sentenca, denuncia, depoimento, laudo, etc.) recebe uma "ficha" com extracao estruturada por tipo, aprovacao HITL (Human-in-the-Loop), e analise comparativa entre pecas.

**Principio central**: IA prepara, humano decide. O defensor nunca e bypass — ele aprova, rejeita ou corrige cada analise.

---

## Secao 1 — Mesa de Revisao (5a Tab "Caso")

### Conceito

Nova tab **"Caso"** no sidebar do viewer (alem de Secoes, Arquivos, Anotacoes, Marcadores).

### Funcionalidade

Ao abrir um PDF que ja foi processado pelo pipeline:

1. **Lista de secoes classificadas** — cada item mostra:
   - Icone por tipo (Gavel=sentenca, FileText=denuncia, Mic=depoimento, FlaskConical=laudo)
   - Titulo gerado pela IA
   - Range de paginas
   - Barra de confianca (verde >80%, amarelo 50-80%, vermelho <50%)
   - Status: `pending` | `approved` | `rejected` | `needs_review`

2. **Acoes por secao**:
   - **Aprovar** (CheckCircle verde) — aceita a classificacao e extracao
   - **Rejeitar** (XCircle vermelho) — marca como incorreto, nao entra na sistematizacao
   - **Editar** (Pencil) — corrigir tipo, titulo, paginas, resumo
   - **Ver Ficha** (FileSearch) — abre a ficha completa tipo-especifica

3. **Barra de progresso** no topo: "12/18 secoes revisadas"

4. **Botao "Consolidar Caso"** — so ativa quando >50% das secoes estao aprovadas.

### Navegacao

- Click em secao → scrollar PDF para a pagina correspondente
- Ao scrollar PDF → destacar secao ativa no sidebar

---

## Secao 2 — Fichas Tipo-Especificas

### Estrutura por Tipo

Cada tipo de peca processual tem uma ficha diferente com campos relevantes:

#### FichaDepoimento
- Depoente (nome, qualificacao)
- Tipo: inquérito | juizo | vitima | testemunha | informante
- Fatos narrados (array)
- Contradicoes com outros depoimentos (analise cruzada)
- Credibilidade (score 0-100 + justificativa)
- Trechos-chave (com pagina)

#### FichaSentenca
- Juiz
- Crime(s) tipificado(s) + artigos
- Veredicto (condenado | absolvido | parcial)
- Pena aplicada (tipo, regime, quantum)
- Fundamentacao principal
- Atenuantes/agravantes reconhecidos
- Nulidades identificaveis

#### FichaLaudo
- Tipo (pericial, necroscopico, toxicologico, local)
- Perito responsavel
- Conclusoes (array)
- Metodologia
- Pontos questionaveis para defesa

#### FichaDenuncia
- Crime(s) imputado(s) + artigos
- Fatos narrados pela acusacao
- Provas mencionadas
- Corréus
- Pontos fracos identificaveis

#### FichaDecisao
- Tipo (interlocutória, pronúncia, impronúncia)
- Fundamentacao
- Dispositivo (decisão tomada)
- Impacto na defesa

### Geracao

- **Trigger**: Ao aprovar secao, ficha e gerada via LangChain structured output
- **Modelo**: Gemini 2.5 Flash para fichas simples, Claude Sonnet para analise comparativa
- **Output**: Pydantic model → JSON → armazenado em `metadata` JSONB da secao

---

## Secao 3 — Painel "Caso" no Viewer

### Layout

```
┌─────────────────────────────────────────────┐
│ [Caso: 0001234-56.2024 - Fulano]  [🔗]     │
│                                              │
│ Progresso: ████████░░░░ 12/18 (67%)         │
│                                              │
│ ┌─ Secoes ───────────────────────────────┐  │
│ │ ✅ Denuncia (pg 1-8)          [Ficha]  │  │
│ │ ✅ Depoimento A (pg 9-15)     [Ficha]  │  │
│ │ ⏳ Depoimento B (pg 16-22)    [Ficha]  │  │
│ │ ❌ Laudo (pg 23-30)    rejeitado       │  │
│ │ ⏳ Sentenca (pg 31-45)        [Ficha]  │  │
│ └────────────────────────────────────────┘  │
│                                              │
│ [Extrair Aprovados ao Drive]                 │
│ [Consolidar Caso]                            │
└─────────────────────────────────────────────┘
```

### Fluxo de Aprovacao

1. Defensor abre PDF → tab "Caso" mostra secoes com status `pending`
2. Clica em secao → PDF scrolla para pagina, overlay destaca regiao
3. Clica Aprovar/Rejeitar/Editar
4. Ao aprovar → ficha e gerada em background (se nao existe)
5. "Extrair Aprovados" → cria PDFs individuais no Drive para cada secao aprovada
6. "Consolidar" → analise comparativa cruzando todas as fichas aprovadas

### Extracoes ao Drive

- Cada secao aprovada pode ser extraida como PDF separado
- Nomenclatura: `[Tipo] - [Titulo] - pg[X-Y].pdf`
- Salvo na mesma pasta do arquivo original no Drive
- Vinculado ao mesmo assistido/processo

---

## Secao 4 — Pagina de Sistematizacao

### Rota: `/admin/processos/[id]/sistematizacao`

Pagina dedicada fora do viewer para visao consolidada:

### Layout

```
┌─────────────────────────────────────────────────────┐
│ Sistematizacao: Processo 0001234-56.2024             │
│ Assistido: Fulano de Tal                             │
│                                                      │
│ [Cronologia] [Por Tipo] [Contradicoes] [Teses]      │
│                                                      │
│ ─── Cronologia ──────────────────────────────────── │
│ 📅 12/03/2024  Inquerito policial instaurado        │
│ 📅 15/03/2024  Depoimento A — inquérito             │
│ 📅 20/03/2024  Laudo pericial                       │
│ 📅 01/06/2024  Denuncia oferecida                   │
│ 📅 15/08/2024  Audiencia — depoimento B             │
│ 📅 10/11/2024  Sentenca                             │
│                                                      │
│ ─── Contradicoes ────────────────────────────────── │
│ ⚠️ Depoimento A vs B: hora do fato diverge          │
│    A: "por volta das 22h" vs B: "madrugada, 2h"    │
│    [Ver Depoimento A] [Ver Depoimento B]            │
│                                                      │
│ ─── Teses Sugeridas ────────────────────────────── │
│ 💡 Insuficiencia probatória (confianca: 85%)        │
│    Baseada em: contradicao de testemunhas +          │
│    ausencia de prova material                        │
│ 💡 Nulidade — ausencia de defesa tecnica (72%)      │
└─────────────────────────────────────────────────────┘
```

### Tabs

1. **Cronologia** — Timeline de eventos extraidos das fichas, ordenados por data
2. **Por Tipo** — Agrupamento: Depoimentos, Laudos, Decisoes, etc. com fichas resumidas
3. **Contradicoes** — Analise cruzada automatica entre depoimentos e pecas
4. **Teses** — Teses de defesa sugeridas pela IA com grau de confianca e fontes

### Integracao

- Acessivel da pagina do processo (botao "Sistematizacao")
- Tambem acessivel do viewer (link no tab "Caso")
- Cada item e clicavel → abre viewer na pagina correspondente

---

## Secao 5 — Arquitetura Tecnica

### Pipeline Completo (Docling + LangChain + Agno)

```
PDF Upload
    │
    ▼
[Docling] ─── Layout parsing, tabelas, OCR, bounding boxes
    │          Substituir pdfjs-dist no pipeline de extracao
    │
    ▼
[LangChain Structured Output] ─── Classificacao + Ficha por tipo
    │   with_structured_output(FichaDepoimento)
    │   Provider: Gemini Flash (fichas) / Claude Sonnet (analise)
    │
    ▼
[pgvector RAG] ─── DoclingLoader → HybridChunker → embeddings
    │               Busca semantica para analise cruzada
    │
    ▼
[Agno Workflows] ─── Orquestracao com HITL
    │   Agent Classificador → Agent Extrator → Agent Analisador
    │   checkpoint() → espera aprovacao do defensor
    │
    ▼
[Inngest] ─── Trigger e scheduling (mantido como entry point)
    │
    ▼
[Supabase] ─── driveDocumentSections (fichas em metadata JSONB)
               case_facts, case_personas (consolidacao)
```

### Mudancas por Camada

#### enrichment-engine (Python/FastAPI)
- **Docling**: Ja existe — expandir para retornar bounding boxes, extrair tabelas
- **LangChain**: Instalar `langchain-google-genai`, `langchain-anthropic`
  - Substituir chamadas diretas ao Gemini/Claude por chains com `with_structured_output()`
  - Pydantic models para cada tipo de ficha
  - `DoclingLoader` para chunking RAG-ready
- **Agno**: Instalar `agno`
  - `ClassificadorAgent` — classifica tipo da secao
  - `ExtratorAgent` — gera ficha tipo-especifica
  - `AnalisadorAgent` — analise comparativa cruzada
  - `SistematizacaoWorkflow` — orquestra os 3 agents
  - `checkpoint()` antes de consolidacao final → HITL

#### src/lib (Next.js/TypeScript)
- **Schema**: Adicionar campo `reviewStatus` em `driveDocumentSections`
- **tRPC**: Novos procedures para approval flow
- **Components**: CasoPanel, FichaViewer, SistematizacaoPage

### Sem Migration de Banco

- `metadata` JSONB ja comporta fichas (sem schema rigido)
- `reviewStatus` → novo campo VARCHAR(20) (unica migration necessaria)
- `case_facts` e `case_personas` ja existem

---

## Ordem de Implementacao

### Phase A — Schema + Approval Flow (frontend)
1. Migration: adicionar `reviewStatus` em driveDocumentSections
2. tRPC: procedures de approve/reject/updateSection
3. CasoPanel no viewer (5a tab)

### Phase B — Fichas Tipo-Especificas (backend)
1. Pydantic models para cada tipo
2. LangChain structured output chains
3. Endpoints no enrichment-engine

### Phase C — Extracao e Drive Sync
1. extractSectionToPdf melhorado (ja existe base)
2. Batch extraction para secoes aprovadas
3. Nomenclatura e vinculacao automatica

### Phase D — Agno Workflows
1. SistematizacaoWorkflow com 3 agents
2. HITL checkpoints
3. Integracao com Inngest triggers

### Phase E — Pagina de Sistematizacao
1. Rota /admin/processos/[id]/sistematizacao
2. 4 tabs: Cronologia, Por Tipo, Contradicoes, Teses
3. Navegacao bidirecional viewer↔pagina

### Phase F — Analise Comparativa (RAG)
1. DoclingLoader + HybridChunker
2. pgvector indexacao por secao
3. Queries de contradicao e corroboracao

---

## Verificacao

1. Abrir PDF processado → tab "Caso" mostra secoes com status
2. Aprovar secao → ficha gerada em background
3. Clicar "Ver Ficha" → modal com campos tipo-especificos
4. "Extrair Aprovados" → PDFs individuais criados no Drive
5. "Consolidar" → analise cruzada com contradicoes e teses
6. Pagina /sistematizacao → 4 tabs funcionais
7. Navegar de sistematizacao → viewer na pagina correta
8. `npm run build` sem erros
