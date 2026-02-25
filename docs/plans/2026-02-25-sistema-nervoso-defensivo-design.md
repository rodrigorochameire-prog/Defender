# Sistema Nervoso Defensivo — Design Document

**Data**: 2026-02-25
**Status**: Draft
**Inspiracao**: DefendaMe (defendame.app) + Capacidades existentes OMBUDS

---

## 1. Visao Geral

### O Problema

OMBUDS possui todas as pecas individuais de um sistema avancado de analise juridica:
- Enrichment Engine (Docling + Gemini Flash) com 11 prompts especializados
- 5 routers de enriquecimento (documento, PJe, transcript, audiencia, WhatsApp)
- Tabelas `case_facts` e `case_personas` no banco
- Palacio da Mente (Excalidraw) para diagramas de investigacao
- Pesquisa semantica via pgvector
- BriefingSection com 6 abas (Estrategia, Testemunhas, Laudos, etc.)

**Porem**, esses recursos operam isoladamente. Nao existe um **orquestrador** que:
1. Agregue os enrichments de todos os documentos de um assistido/processo
2. Consolide em dados estruturados (pessoas, fatos, cronologia, teses)
3. Apresente uma visao unificada na pagina do assistido/processo

### A Solucao

**Tab "Inteligencia"** nas paginas de Assistido e Processo que consolida automaticamente
todos os dados enriquecidos em uma visao estruturada inspirada no DefendaMe, usando a
infraestrutura que ja existe.

### Metafora: Sistema Nervoso Defensivo

```
INPUTS (terminacoes nervosas)          PROCESSAMENTO (medula/tronco)       REPRESENTACAO (cortex)
================================       ============================        ========================
Drive files (PDF, DOCX, imagens)  -->  Docling OCR + Classificacao   -->  Tab "Inteligencia"
PJe intimacoes (copy-paste)       -->  Gemini Flash extraction       -->    - Visao Geral (KPIs)
Solar movimentacoes               -->  Consolidacao cross-document   -->    - Pessoas
WhatsApp mensagens                -->  Dedup + Merge entities        -->    - Fatos & Cronologia
Transcricoes de atendimento       -->  Gemini Pro sintese            -->    - Provas & Documentos
Audiencias (pautas)               -->  case_facts + case_personas    -->    - Defesa (teses/nulidades)
                                                                     -->    - Diagrama (Excalidraw)
```

---

## 2. Arquitetura

### 2.1 Fluxo de Dados

```
                    ┌─────────────────┐
                    │  Drive Webhook   │──── novo arquivo detectado
                    │  PJe Import      │──── intimacoes importadas
                    │  Solar Sync      │──── movimentacoes sincronizadas
                    │  WhatsApp Hook   │──── mensagem recebida
                    │  Transcricao     │──── atendimento transcrito
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │  ENRICH (existe) │  Per-document enrichment
                    │  enrichDocument  │  → enrichmentData JSON on `documentos`
                    │  enrichTranscript│  → enrichmentData JSON on `atendimentos`
                    │  enrichPjeText   │  → enrichmentData JSON on `demandas`
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │  CONSOLIDATE     │  ★ NOVO - Inngest function
                    │  (novo)          │
                    │  Agrega enriched │  → case_facts (fatos, eventos, teses)
                    │  data de todos   │  → case_personas (pessoas extraidas)
                    │  documentos      │  → assistidos.analysisData (resumo)
                    │                  │  → processos.analysisData (resumo)
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │  UI: Tab         │  React component
                    │  "Inteligencia"  │  Renderiza case_facts +
                    │                  │  case_personas + analysisData
                    └─────────────────┘
```

### 2.2 Modelo Hibrido (Automatico + Manual)

| Trigger | Acao | Escopo |
|---------|------|--------|
| Drive webhook (novo arquivo) | Enrich documento automaticamente | Per-document |
| Solar sync (nova movimentacao) | Enrich movimentacao automaticamente | Per-movimentacao |
| Transcricao completa | Enrich transcript automaticamente | Per-atendimento |
| **Botao "Gerar Analise"** | **Consolidar TODOS enrichments** | **Per-assistido/processo** |
| **Botao "Reanalisar"** | **Re-consolidar com novos dados** | **Per-assistido/processo** |

A consolidacao (passo pesado que usa Gemini Pro) so roda quando o usuario pede.
O enriquecimento individual (Gemini Flash, rapido) roda automaticamente.

---

## 3. Schema Changes

### 3.1 Novas colunas em `assistidos`

```sql
ALTER TABLE assistidos ADD COLUMN analysis_status VARCHAR(20) DEFAULT NULL;
  -- NULL | 'pending' | 'processing' | 'completed' | 'failed'
ALTER TABLE assistidos ADD COLUMN analysis_data JSONB DEFAULT NULL;
ALTER TABLE assistidos ADD COLUMN analyzed_at TIMESTAMP DEFAULT NULL;
ALTER TABLE assistidos ADD COLUMN analysis_version INTEGER DEFAULT 0;
```

**Tipo `analysis_data`** (JSONB):
```typescript
interface AssistidoAnalysisData {
  // Resumo geral
  resumo: string;                    // max 500 chars
  achadosChave: string[];            // max 10 items
  recomendacoes: string[];           // max 5 items
  inconsistencias: string[];         // contradições entre documentos

  // KPIs
  kpis: {
    totalPessoas: number;
    totalAcusacoes: number;
    totalDocumentosAnalisados: number;
    totalEventos: number;
    totalNulidades: number;
    totalRelacoes: number;
  };

  // Metadata
  documentosProcessados: number;     // quantos docs foram incluidos
  documentosTotal: number;           // total na pasta Drive
  ultimoDocumentoProcessado?: string; // nome do ultimo doc
  versaoModelo: string;              // "gemini-1.5-pro" / "gemini-2.0-flash"
}
```

### 3.2 Novas colunas em `processos`

```sql
ALTER TABLE processos ADD COLUMN analysis_status VARCHAR(20) DEFAULT NULL;
ALTER TABLE processos ADD COLUMN analysis_data JSONB DEFAULT NULL;
ALTER TABLE processos ADD COLUMN analyzed_at TIMESTAMP DEFAULT NULL;
ALTER TABLE processos ADD COLUMN analysis_version INTEGER DEFAULT 0;
```

**Tipo `analysis_data`** (JSONB) - similar ao assistido, mas focado no processo:
```typescript
interface ProcessoAnalysisData {
  resumo: string;
  achadosChave: string[];
  recomendacoes: string[];
  inconsistencias: string[];
  tesesToes: string[];              // teses defensivas identificadas
  nulidades: Array<{
    tipo: string;                   // "busca_sem_mandado" | "cadeia_custodia" | etc.
    descricao: string;
    severidade: "alta" | "media" | "baixa";
    fundamentacao: string;
    documentoRef?: string;          // documento que fundamenta
  }>;
  kpis: {
    totalPessoas: number;
    totalAcusacoes: number;
    totalDocumentosAnalisados: number;
    totalEventos: number;
    totalNulidades: number;
    totalRelacoes: number;
  };
  documentosProcessados: number;
  documentosTotal: number;
  versaoModelo: string;
}
```

### 3.3 Uso expandido de tabelas existentes

**`case_facts`** — ja existe, usar para:
- `tipo = 'evento'`: Cronologia (data, descricao, fonte)
- `tipo = 'controverso'`: Fatos controversos
- `tipo = 'incontroverso'`: Fatos incontroversos
- `tipo = 'tese'`: Teses defensivas
- `tipo = 'nulidade'`: Nulidades identificadas
- `tipo = 'prova'`: Provas relevantes

Adicionar colunas:
```sql
ALTER TABLE case_facts ADD COLUMN processo_id INTEGER REFERENCES processos(id) ON DELETE CASCADE;
ALTER TABLE case_facts ADD COLUMN assistido_id INTEGER REFERENCES assistidos(id) ON DELETE CASCADE;
ALTER TABLE case_facts ADD COLUMN data_fato DATE;
ALTER TABLE case_facts ADD COLUMN fonte VARCHAR(50); -- 'documento' | 'transcricao' | 'solar' | 'pje' | 'manual'
ALTER TABLE case_facts ADD COLUMN fonte_id INTEGER;   -- ID do documento/atendimento/demanda de origem
ALTER TABLE case_facts ADD COLUMN severidade VARCHAR(10); -- 'alta' | 'media' | 'baixa'
ALTER TABLE case_facts ADD COLUMN confidence REAL;
CREATE INDEX case_facts_processo_id_idx ON case_facts(processo_id);
CREATE INDEX case_facts_assistido_id_idx ON case_facts(assistido_id);
CREATE INDEX case_facts_data_fato_idx ON case_facts(data_fato);
```

**`case_personas`** — ja existe, usar para:
- Pessoas extraidas de todos documentos
- Dedup por nome normalizado (fuzzy match)

Adicionar colunas:
```sql
ALTER TABLE case_personas ADD COLUMN processo_id INTEGER REFERENCES processos(id) ON DELETE CASCADE;
ALTER TABLE case_personas ADD COLUMN fonte VARCHAR(50);
ALTER TABLE case_personas ADD COLUMN fonte_id INTEGER;
ALTER TABLE case_personas ADD COLUMN confidence REAL;
CREATE INDEX case_personas_processo_id_idx ON case_personas(processo_id);
```

---

## 4. Backend: tRPC Router `intelligence`

### 4.1 Novo router: `src/lib/trpc/routers/intelligence.ts`

```typescript
// Procedures:

// 1. Gerar/regenerar analise completa para um assistido
generateForAssistido: protectedProcedure
  .input(z.object({ assistidoId: z.number() }))
  .mutation(async ({ ctx, input }) => { ... })

// 2. Gerar/regenerar analise completa para um processo
generateForProcesso: protectedProcedure
  .input(z.object({ processoId: z.number() }))
  .mutation(async ({ ctx, input }) => { ... })

// 3. Obter analise existente de um assistido
getForAssistido: protectedProcedure
  .input(z.object({ assistidoId: z.number() }))
  .query(async ({ ctx, input }) => { ... })
  // Retorna: analysisData + case_facts + case_personas + status

// 4. Obter analise existente de um processo
getForProcesso: protectedProcedure
  .input(z.object({ processoId: z.number() }))
  .query(async ({ ctx, input }) => { ... })

// 5. Status de enrichment pendente (quantos docs nao consolidados)
getPendingEnrichments: protectedProcedure
  .input(z.object({ assistidoId: z.number().optional(), processoId: z.number().optional() }))
  .query(async ({ ctx, input }) => { ... })
  // Retorna: { enrichedDocs, totalDocs, lastConsolidation, pendingCount }
```

### 4.2 Pipeline de Consolidacao

```typescript
async function consolidateForAssistido(assistidoId: number) {
  // 1. Buscar todos documentos enriched do assistido
  const docs = await db.select().from(documentos)
    .where(and(
      eq(documentos.assistidoId, assistidoId),
      eq(documentos.enrichmentStatus, 'enriched')
    ));

  // 2. Buscar todos atendimentos enriched
  const atendimentos = await db.select().from(atendimentos)
    .where(and(
      eq(atendimentos.assistidoId, assistidoId),
      eq(atendimentos.enrichmentStatus, 'enriched')
    ));

  // 3. Buscar demandas com enrichmentData
  const demandas = await db.select().from(demandas)
    .where(and(
      eq(demandas.assistidoId, assistidoId),
      isNotNull(demandas.enrichmentData)
    ));

  // 4. Agregar: extrair pessoas, fatos, eventos de cada enrichmentData
  const aggregated = aggregateEnrichments(docs, atendimentos, demandas);

  // 5. Dedup personas (fuzzy match por nome)
  const personas = deduplicatePersonas(aggregated.persons);

  // 6. Upsert em case_personas
  await upsertCasePersonas(assistidoId, personas);

  // 7. Upsert em case_facts (eventos, fatos, teses, nulidades)
  await upsertCaseFacts(assistidoId, aggregated.facts);

  // 8. Sintetizar com Gemini Pro (resumo, achados-chave, recomendacoes)
  const synthesis = await synthesizeWithGeminiPro({
    personas,
    facts: aggregated.facts,
    documentSummaries: docs.map(d => d.enrichmentData),
    transcriptSummaries: atendimentos.map(a => a.enrichmentData),
  });

  // 9. Salvar em assistidos.analysisData
  await db.update(assistidos)
    .set({
      analysisStatus: 'completed',
      analysisData: { ...synthesis, kpis: computeKPIs(personas, aggregated), ... },
      analyzedAt: new Date(),
      analysisVersion: sql`analysis_version + 1`,
    })
    .where(eq(assistidos.id, assistidoId));
}
```

### 4.3 Prompt de Sintese (novo)

Novo prompt para o Gemini Pro que recebe TODOS os enrichments agregados e gera:
- Resumo do caso (max 500 chars)
- Achados-chave (max 10)
- Recomendacoes estrategicas (max 5)
- Inconsistencias/contradicoes entre documentos
- Teses defensivas consolidadas
- Nulidades identificadas com severidade

```python
# enrichment-engine/prompts/case_synthesis.py
CASE_SYNTHESIS_PROMPT = """
Voce e um defensor publico experiente analisando um caso criminal.
Recebera dados extraidos de multiplos documentos de um mesmo caso.

TAREFAS:
1. Sintetize os dados em um resumo conciso do caso
2. Identifique os achados-chave mais relevantes para a defesa
3. Liste recomendacoes estrategicas prioritarias
4. Identifique inconsistencias ou contradicoes entre os documentos
5. Consolide todas as teses defensivas possiveis
6. Liste nulidades processuais com severidade (alta/media/baixa)

REGRAS:
- Priorize informacoes uteis para a DEFESA (nao para a acusacao)
- Nao invente dados - so use o que esta nos documentos
- Indique confianca quando houver ambiguidade
- Referencie documentos fonte quando possivel
"""
```

### 4.4 Novo endpoint no Enrichment Engine

```python
# enrichment-engine/routers/consolidation_router.py
@router.post("/consolidate/case")
async def consolidate_case(request: CaseConsolidationRequest):
    """
    Recebe todos os enrichments de um caso e gera sintese consolidada.
    Input: { enrichments: EnrichedDocument[], transcripts: EnrichedTranscript[], context: {} }
    Output: { resumo, achados_chave, recomendacoes, inconsistencias, teses, nulidades, kpis }
    """
```

---

## 5. Frontend: Tab "Inteligencia"

### 5.1 Componente principal

**`src/components/intelligence/IntelligenceTab.tsx`**

Props:
```typescript
interface IntelligenceTabProps {
  assistidoId?: number;
  processoId?: number;
  // Um dos dois deve ser fornecido
}
```

### 5.2 Estados do Tab

**Estado 1: Sem analise (virgin)**
```
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│                    🧠                                        │
│                                                              │
│            Nenhuma analise gerada                             │
│                                                              │
│   Clique para analisar os documentos e gerar                 │
│   dados estruturados sobre este caso.                        │
│                                                              │
│   📄 12 arquivos na pasta · 8 enriquecidos · 4 pendentes    │
│                                                              │
│              [ ▶ Gerar Analise do Caso ]                     │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

**Estado 2: Processando**
```
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│   ⏳ Analisando caso...                                      │
│   ████████████░░░░░░░░░░░░░░░░░░░░  40%                    │
│                                                              │
│   Etapa: Consolidando fatos de 12 documentos                │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

**Estado 3: Analise completa**
```
┌─ KPIs ───────────────────────────────────────────────────────┐
│  👤 8 Pessoas  │  ⚖️ 3 Acusacoes  │  📄 15 Docs Analisados  │
│  📅 5 Eventos  │  ⚠️ 2 Nulidades  │  🔗 12 Relacoes          │
└──────────────────────────────────────────────────────────────┘

[Visao Geral] [Pessoas] [Fatos] [Cronologia] [Defesa] [Diagrama]

┌─ Visao Geral ────────────────────────────────────────────────┐
│  Resumo do Caso                                              │
│  ───────────────                                             │
│  Caso de trafico de drogas envolvendo 3 correus...           │
│                                                              │
│  Achados-Chave                                               │
│  • Busca domiciliar sem mandado judicial (nulidade)         │
│  • Contradicao entre depoimentos dos PMs sobre local       │
│  • Laudo toxico inconclusivo (0.8g, uso pessoal?)          │
│                                                              │
│  Recomendacoes                                               │
│  1. Requerer nulidade da busca - jurisprudencia favoravel   │
│  2. Arrolar PM2 como testemunha contraditoria               │
│  3. Juntar laudo complementar sobre quantidade              │
│                                                              │
│  Ultima analise: 25/02/2026 14:30 · v3                      │
│  12/12 documentos processados ✓                              │
│                                                              │
│  [ 🔄 Reanalisar ] [ 3 novos docs nao consolidados ]        │
└──────────────────────────────────────────────────────────────┘
```

### 5.3 Sub-tabs

| Tab | Fonte | Componente |
|-----|-------|------------|
| **Visao Geral** | `analysisData` do assistido/processo | `IntelligenceOverview.tsx` |
| **Pessoas** | `case_personas` filtrado | `IntelligencePersonas.tsx` |
| **Fatos** | `case_facts` com tipo `controverso/incontroverso` | `IntelligenceFacts.tsx` |
| **Cronologia** | `case_facts` com tipo `evento`, ordenado por `data_fato` | `IntelligenceTimeline.tsx` |
| **Defesa** | `case_facts` com tipo `tese/nulidade` + `analysisData.teses` | `IntelligenceDefense.tsx` |
| **Diagrama** | Integrar com Palacio da Mente existente | `IntelligenceDiagram.tsx` |

### 5.4 Componentes reutilizados

- `BriefingSection` sub-components (Testemunhas, Laudos, Antecedentes) → mover para shared
- `StatusDot` do solar-logs → usar para status de pessoas
- `TimelineDocumental` do Drive → adaptar para cronologia de fatos
- Palacio da Mente → embedding direto no tab Diagrama

---

## 6. Indicadores Visuais

### 6.1 Badge no Tab

Quando existem documentos enriquecidos que nao foram consolidados:
```tsx
<TabsTrigger value="inteligencia" className="relative">
  🧠 Inteligencia
  {pendingCount > 0 && (
    <span className="absolute -top-1 -right-1 bg-amber-500 text-white text-[9px]
                     rounded-full w-4 h-4 flex items-center justify-center">
      {pendingCount}
    </span>
  )}
</TabsTrigger>
```

### 6.2 Status no Header

Indicador sutil no header da pagina do assistido/processo:
```
João da Silva                    🧠 Analise v3 · 25/02 14:30
CPF: 123.456.789-00             [3 novos docs]
```

---

## 7. Integracao com Demandas

O plan existente (mossy-soaring-swan.md) inclui Task 1-3 para melhorar o mobile compact
view e o PJe parser. O Sistema Nervoso Defensivo complementa essas tasks mas nao depende
delas. A integracao futura seria:

- **Demandas importadas via PJe** → `enrichPjeText` → `enrichmentData` na demanda
- **Consolidacao** le `enrichmentData` das demandas para enriquecer o caso
- **Tab Inteligencia** mostra dados extraidos das intimacoes como eventos na cronologia

---

## 8. Sequencia de Implementacao

### Fase 1: Schema + Backend (2-3 dias)

| # | Task | Estimativa |
|---|------|------------|
| 1.1 | Migration: novas colunas em `assistidos` e `processos` | 1h |
| 1.2 | Migration: novas colunas em `case_facts` e `case_personas` | 1h |
| 1.3 | Prompt `case_synthesis.py` no enrichment-engine | 2h |
| 1.4 | Endpoint `/consolidate/case` no enrichment-engine | 3h |
| 1.5 | tRPC router `intelligence` (5 procedures) | 4h |
| 1.6 | Funcao de agregacao `aggregateEnrichments()` | 3h |
| 1.7 | Funcao de dedup `deduplicatePersonas()` | 2h |

### Fase 2: Frontend — Tab Inteligencia (3-4 dias)

| # | Task | Estimativa |
|---|------|------------|
| 2.1 | `IntelligenceTab.tsx` — container principal + 3 estados | 3h |
| 2.2 | `IntelligenceOverview.tsx` — KPIs + resumo + achados-chave | 3h |
| 2.3 | `IntelligencePersonas.tsx` — lista de pessoas extraidas | 2h |
| 2.4 | `IntelligenceFacts.tsx` — fatos controversos/incontroversos | 2h |
| 2.5 | `IntelligenceTimeline.tsx` — cronologia visual | 3h |
| 2.6 | `IntelligenceDefense.tsx` — teses + nulidades | 3h |
| 2.7 | Integrar tab nas paginas assistido + processo | 1h |
| 2.8 | Badge de notificacao (docs pendentes) | 1h |

### Fase 3: Diagrama + Polish (2 dias)

| # | Task | Estimativa |
|---|------|------------|
| 3.1 | `IntelligenceDiagram.tsx` — integrar Palacio da Mente | 3h |
| 3.2 | Auto-gerar diagrama de relacionamentos a partir de case_personas | 3h |
| 3.3 | Loading states, error handling, responsivo | 2h |
| 3.4 | Testes manuais com dados reais | 2h |

### Fase 4: Automacao (1-2 dias)

| # | Task | Estimativa |
|---|------|------------|
| 4.1 | Inngest function para enrich automatico pos-Drive webhook | 2h |
| 4.2 | Indicador "novos docs nao consolidados" em tempo real | 2h |
| 4.3 | Botao "Reanalisar" com diff do que mudou | 2h |

**Total estimado: 8-11 dias de desenvolvimento**

---

## 9. Arquivos a Criar/Modificar

### Novos

| Arquivo | Descricao |
|---------|-----------|
| `src/lib/trpc/routers/intelligence.ts` | Router tRPC para consolidacao |
| `src/components/intelligence/IntelligenceTab.tsx` | Container principal |
| `src/components/intelligence/IntelligenceOverview.tsx` | Visao geral + KPIs |
| `src/components/intelligence/IntelligencePersonas.tsx` | Pessoas extraidas |
| `src/components/intelligence/IntelligenceFacts.tsx` | Fatos do caso |
| `src/components/intelligence/IntelligenceTimeline.tsx` | Cronologia visual |
| `src/components/intelligence/IntelligenceDefense.tsx` | Teses + Nulidades |
| `src/components/intelligence/IntelligenceDiagram.tsx` | Diagrama (Excalidraw) |
| `enrichment-engine/prompts/case_synthesis.py` | Prompt de sintese |
| `enrichment-engine/routers/consolidation_router.py` | Endpoint de consolidacao |
| `drizzle/migrations/XXXX_add_analysis_columns.sql` | Migration |

### Modificados

| Arquivo | Mudanca |
|---------|---------|
| `src/lib/db/schema.ts` | Novas colunas em assistidos, processos, case_facts, case_personas |
| `src/app/(dashboard)/admin/assistidos/[id]/page.tsx` | Adicionar tab "Inteligencia" |
| `src/app/(dashboard)/admin/processos/[id]/page.tsx` | Adicionar tab "Inteligencia" |
| `src/lib/trpc/root.ts` | Registrar router `intelligence` |
| `enrichment-engine/main.py` | Montar consolidation_router |
| `src/lib/services/enrichment-client.ts` | Adicionar `consolidateCase()` |
| `src/lib/inngest/functions.ts` | (Fase 4) Adicionar auto-enrich function |

---

## 10. Riscos e Mitigacoes

| Risco | Mitigacao |
|-------|-----------|
| Gemini Pro lento para sintese de muitos docs | Limitar a 30 docs por consolidacao; paginar se necessario |
| Custo de API para re-analises frequentes | Cache agressivo; so re-analisar se houve novos enrichments |
| Dedup de personas falha (nomes com variacao) | Fuzzy match com Levenshtein + normalizacao; merge manual na UI |
| case_facts duplicados entre consolidacoes | Upsert com chave composta (assistido_id + fonte + fonte_id + titulo) |
| Enrichment Engine offline | Graceful degradation — mostrar dados ja consolidados; retry button |

---

## 11. Metricas de Sucesso

- **Cobertura**: > 80% dos documentos enriquecidos geram dados em case_facts/case_personas
- **Precisao**: > 90% dos achados-chave sao relevantes para a defesa (avaliacao manual)
- **UX**: Tab Inteligencia carrega em < 2s para casos com ate 50 documentos
- **Adocao**: > 50% dos defensores usam "Gerar Analise" em pelo menos 1 caso na primeira semana
