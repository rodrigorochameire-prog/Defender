# Inteligência Jurídica v2 — Cross-Analysis Design

**Data**: 2026-03-03
**Status**: Approved (brainstorming concluído)

## Decisões do Brainstorming

| # | Pergunta | Decisão |
|---|----------|---------|
| 1 | Direção | Caminho B — Inteligência jurídica |
| 2 | UX destino | Ambos: Tab Inteligência consolidada + sidebar enriquecida por transcrição |
| 3 | Trigger cross-analysis | Ambos: auto ao completar 2ª+ análise + botão re-gerar manual |
| 4 | Componentes visuais | Completo: matriz contradições, timeline, mapa atores, tese consolidada, providências |
| 5 | Storage | Nova tabela `assistido_intelligence` |

## O que já existe

- **IntelligenceTab** com 6 sub-tabs (overview, personas, facts, timeline, defense, diagram)
- **intelligence.ts router** com `generateForAssistido`, `getForAssistido`, `getPendingEnrichments`
- **enrichmentClient.consolidateCase()** para análise sintética
- **assistidos.analysisData** JSONB + status tracking
- **MarkdownViewerModal** com sidebar mostrando pontos favoráveis/desfavoráveis/contradições por depoimento
- **Sonnet analysis** por transcrição individual (depoente, entidades, percepção, highlights, etc.)

## Gap Analysis — O que FALTA

### 1. Cross-Depoimento Analysis (NOVO)
A consolidação atual (`consolidateCase`) recebe todos os docs enriquecidos e gera um resumo sintético. Mas **não compara depoimentos individuais entre si** para encontrar:
- Contradições **entre** depoentes (A disse X, B disse Y sobre o mesmo fato)
- Corroborações cruzadas (A confirma o que B disse)
- Lacunas (fato mencionado por A mas não abordado por B)

### 2. Auto-Trigger (NOVO)
Quando uma nova análise Sonnet completa, nada acontece automaticamente. O defensor precisa ir na Tab Inteligência e clicar "Gerar Análise" manualmente.

### 3. Matriz de Contradições UI (NOVO)
O componente `IntelligenceFacts` mostra fatos, mas não tem uma **matriz visual** comparando o que cada depoente disse sobre o mesmo fato.

### 4. Sidebar Cross-References (MELHORIA)
O `MarkdownViewerModal` mostra análise de UM depoimento isolado. Não referencia o que OUTROS depoentes disseram sobre os mesmos fatos.

---

## Arquitetura

### Nova Tabela: `cross_analyses`

```sql
CREATE TABLE cross_analyses (
  id SERIAL PRIMARY KEY,
  assistido_id INTEGER NOT NULL REFERENCES assistidos(id),

  -- Contradições cruzadas entre depoimentos
  contradiction_matrix JSONB NOT NULL DEFAULT '[]',
  -- [{ fato, depoimentos: [{source_file_id, depoente, afirmacao, timestamp_ref}], tipo: "contradicao"|"corroboracao"|"lacuna", analise }]

  -- Tese consolidada
  tese_consolidada JSONB NOT NULL DEFAULT '{}',
  -- { pontos_fortes: [{ponto, fontes: [file_ids], relevancia}], pontos_fracos: [...], tese_principal, teses_subsidiarias }

  -- Timeline unificada dos fatos
  timeline_fatos JSONB NOT NULL DEFAULT '[]',
  -- [{ data_ref, fato, fontes: [{file_id, depoente, timestamp_ref}], importancia }]

  -- Mapa de atores
  mapa_atores JSONB NOT NULL DEFAULT '[]',
  -- [{ nome, papel, mencionado_por: [{file_id, depoente, contexto}], relacoes: [{com, tipo}] }]

  -- Providências agregadas (dedup de todas as análises individuais)
  providencias_agregadas JSONB NOT NULL DEFAULT '[]',

  -- Metadata
  source_file_ids INTEGER[] NOT NULL DEFAULT '{}', -- IDs dos drive_files analisados
  analysis_count INTEGER NOT NULL DEFAULT 0,
  model_version VARCHAR(50),

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX cross_analyses_assistido_idx ON cross_analyses(assistido_id);
```

### Enrichment Engine: Novo Endpoint

```
POST /api/cross-analyze
{
  "assistido_id": 123,
  "analyses": [
    {
      "file_id": 45,
      "file_name": "transcricao_fulano.md",
      "depoente": "DELEGADO",
      "analysis": { /* full Sonnet analysis JSON */ }
    },
    ...
  ]
}
```

**Retorna:**
```json
{
  "contradiction_matrix": [...],
  "tese_consolidada": {...},
  "timeline_fatos": [...],
  "mapa_atores": [...],
  "providencias_agregadas": [...]
}
```

**Prompt Claude Sonnet**: Recebe as N análises individuais e gera comparação cruzada. Foco em:
- Identificar fatos mencionados em múltiplos depoimentos
- Para cada fato, comparar versões e classificar como contradição/corroboração/lacuna
- Consolidar tese de defesa a partir dos pontos favoráveis/desfavoráveis de todos
- Montar timeline unificada com referências cruzadas
- Mapear atores e suas relações conforme emergem dos depoimentos

### Auto-Trigger Flow

```
Sonnet analysis completes (analysis.py line 76)
  ↓
Check: quantas análises individuais existem para este assistido?
  ↓
Se count >= 2:
  ↓
  Fire POST /api/cross-analyze com todas as análises do assistido
  ↓
  Salvar resultado em cross_analyses
  ↓
  Invalidar cache da Tab Inteligência (via updated_at)
```

**Implementação**: No `_process_analysis_background` (analysis.py), após salvar a análise individual, verificar contagem e disparar cross-analysis se >= 2.

### tRPC Router: Novas Procedures

```typescript
// intelligence.ts (additions)

getCrossAnalysis: protectedProcedure
  .input(z.object({ assistidoId: z.number() }))
  .query(/* retorna cross_analyses mais recente */)

regenerateCrossAnalysis: protectedProcedure
  .input(z.object({ assistidoId: z.number() }))
  .mutation(/* força re-geração da cross-analysis */)
```

### UI Components

#### A. ContradictionMatrix (NOVO)
- Tabela/grid comparando depoentes por fato
- Cada célula mostra o que aquele depoente disse sobre aquele fato
- Cores: verde (corroboração), vermelho (contradição), cinza (lacuna/não mencionou)
- Click expande para ver detalhes + timestamps

#### B. CrossAnalysisBanner (NOVO - sidebar MarkdownViewerModal)
- Quando existe cross-analysis, mostrar seção "Cruzamento com outros depoimentos"
- Lista fatos onde este depoente contradiz/corrobora outros
- Link para abrir os outros depoimentos relevantes

#### C. IntelligenceTab v2 (MELHORIA)
- Sub-tab "Cruzamento" entre "Fatos" e "Cronologia"
- Mostra ContradictionMatrix + tese consolidada v2
- Badge "N contradições encontradas" / "N corroborações"
- Botão "Re-gerar análise cruzada" (manual trigger)

---

## Implementation Steps

### Step 1: Schema + Migration
- Criar tabela `cross_analyses` no Drizzle schema
- `npm run db:generate && npm run db:push`

### Step 2: Enrichment Engine Endpoint
- Novo router `enrichment-engine/routers/cross_analysis.py`
- Novo service `enrichment-engine/services/cross_analysis_service.py`
- Prompt Sonnet otimizado para comparação cruzada
- Registrar no `main.py`

### Step 3: Auto-Trigger
- Em `analysis.py._process_analysis_background`, após salvar análise:
  - Contar análises do assistido
  - Se >= 2, chamar `/api/cross-analyze`

### Step 4: tRPC Procedures
- `getCrossAnalysis` query
- `regenerateCrossAnalysis` mutation
- Integrar com `enrichmentClient` (novo método `crossAnalyze`)

### Step 5: ContradictionMatrix Component
- Grid/tabela interativa
- Expand para detalhes
- Cores semânticas (contradição/corroboração/lacuna)

### Step 6: IntelligenceTab — Sub-tab "Cruzamento"
- Integrar ContradictionMatrix
- Tese consolidada v2
- Providências agregadas
- Badge com contagem

### Step 7: MarkdownViewerModal — CrossAnalysisBanner
- Seção na sidebar mostrando cruzamentos deste depoimento
- Links para outros depoimentos relevantes

### Step 8: Validate + Deploy
