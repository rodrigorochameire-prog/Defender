# Design: Classificador PDF v2 + Timeline Processual

> **Data**: 2026-03-03
> **Tickets**: SCRUM-16 (PDF Classifier v2) + SCRUM-21 (Timeline processual)
> **Status**: Aprovado

---

## Contexto

O classificador de PDFs processuais deve harmonizar com a sistematização processual.
Com o classificador, é possível alimentar a timeline, os dados estruturados e
outras funcionalidades de processos (e de assistidos consequentemente).

Os dois tickets são tratados como um design unificado pois o output do classificador
é o input direto da timeline.

---

## Seção 1 — Arquitetura do Pipeline

### Modelo de IA: Claude Sonnet 4

Escolhido por superior raciocínio jurídico em português, especialmente para:
- Identificar contradições entre depoimentos
- Extrair teses defensivas implícitas
- Classificar relevância para a defesa criminal

### Pipeline Híbrido

```
┌─────────────────────────────────────────────┐
│            TypeScript (Next.js)              │
│  • On-demand: classificar 1 PDF ao abrir    │
│  • Claude Sonnet 4 via @anthropic-ai/sdk    │
│  • Grava em driveDocumentSections            │
└─────────────────────────────────────────────┘
              ↕ mesma tabela
┌─────────────────────────────────────────────┐
│         Python (enrichment-engine)           │
│  • Batch: reclassificar pasta inteira        │
│  • POST /api/classify-batch                  │
│  • Claude Sonnet 4 (anthropic SDK Python)    │
│  • Fallback: Gemini Flash se rate limit      │
└─────────────────────────────────────────────┘
```

### Fluxo On-Demand (TypeScript)

```
Usuario abre PDF → pdf-classifier.ts detecta 0 sections
  → Extrai texto por chunks de paginas
  → Envia cada chunk para Claude Sonnet 4
  → Recebe ClassifiedSection[] com:
      tipo, titulo, resumo, relevancia,
      pessoas[], eventos[], teses[], contradicoes[]
  → Grava em driveDocumentSections
  → UI atualiza timeline automaticamente
```

### Fluxo Batch (Python)

```
Cron ou trigger manual → enrichment-engine
  → Lista driveFiles sem sections (enrichmentStatus != 'completed')
  → Para cada arquivo:
      → Baixa texto do storage
      → Classifica com Claude Sonnet 4
      → Grava sections no Supabase
      → Atualiza enrichmentStatus = 'completed'
```

---

## Seção 2 — Modelo de Dados

### Tabelas existentes (sem alteração estrutural)

```sql
-- Já existe: driveFiles
-- Campos relevantes: id, processoId, assistidoId, enrichmentStatus, enrichmentData

-- Já existe: driveDocumentSections
-- Campos relevantes: id, driveFileId, tipo, titulo, paginaInicio, paginaFim,
--                     resumo, confianca, reviewStatus, fichaData (jsonb), metadata (jsonb)
```

### Query da Timeline

```sql
SELECT
  ds.id, ds.tipo, ds.titulo, ds.resumo,
  ds.paginaInicio, ds.paginaFim,
  ds.confianca, ds.fichaData, ds.metadata,
  df.nome AS arquivo_nome,
  df.id AS arquivo_id
FROM drive_document_sections ds
JOIN drive_files df ON ds.drive_file_id = df.id
WHERE df.processo_id = :processoId
ORDER BY
  -- Ordenar por data do evento (extraída na fichaData) ou pagina
  COALESCE(
    (ds.ficha_data->>'dataEvento')::date,
    (ds.metadata->>'eventDate')::date,
    '1900-01-01'::date
  ) ASC,
  ds.pagina_inicio ASC;
```

### Taxonomy v2 — 27 Tipos (fonte de verdade)

| Relevância | Tipos |
|------------|-------|
| **Crítico** (vermelho) | denuncia, sentenca, depoimento_vitima, depoimento_testemunha, depoimento_investigado |
| **Alto** (laranja) | decisao, pronuncia, laudo_pericial, laudo_necroscopico, laudo_local, ata_audiencia, interrogatorio, alegacoes_mp, alegacoes_defesa, resposta_acusacao, recurso, habeas_corpus |
| **Médio** (azul) | boletim_ocorrencia, portaria_ip, relatorio_policial, auto_prisao, termo_inquerito, certidao_relevante, diligencias_422, alegacoes |
| **Baixo** (cinza) | documento_identidade, outros |
| **Oculto** | burocracia |

### Grupos Semânticos (10)

| Grupo | Tipos | Cor |
|-------|-------|-----|
| depoimentos | depoimento_vitima, depoimento_testemunha, depoimento_investigado, interrogatorio | blue |
| laudos | laudo_pericial, laudo_necroscopico, laudo_local | purple |
| decisoes | sentenca, decisao, pronuncia | red |
| defesa | alegacoes_defesa, resposta_acusacao, recurso, habeas_corpus | emerald |
| mp | denuncia, alegacoes_mp | amber |
| investigacao | boletim_ocorrencia, portaria_ip, relatorio_policial, auto_prisao | orange |
| audiencia | ata_audiencia | indigo |
| inquerito | termo_inquerito, certidao_relevante, diligencias_422 | slate |
| generico | alegacoes, outros | zinc |
| identidade | documento_identidade | gray |

### Metadados Estruturados por Seção

```typescript
interface ClassifiedSection {
  tipo: string;           // Um dos 27 SECTION_TIPOS
  titulo: string;         // Ex: "Depoimento de Maria Silva"
  resumo: string;         // 2-3 frases com o essencial
  relevancia: "critico" | "alto" | "medio" | "baixo" | "oculto";
  paginaInicio: number;
  paginaFim: number;
  confianca: number;      // 0-100

  // Dados estruturados
  pessoas: PessoaExtraida[];     // nome, papel, observacoes
  eventos: EventoCronologia[];   // data, descricao, local
  teses: TeseDefensiva[];        // tipo, descricao, fundamento
  contradicoes: string[];        // contradições identificadas
  pontosCriticos: string[];      // pontos-chave para defesa
}
```

---

## Seção 3 — UI da Timeline

### Componente `ProcessoTimeline`

```
┌──────────────────────────────────────────────────────────┐
│  TIMELINE DO PROCESSO                                     │
│  ┌─────────────────────────────────────────────────────┐ │
│  │ Filtros: [Crítico ✓] [Alto ✓] [Médio] [Baixo]      │ │
│  │ Tipo:    [Todos ▼]   Busca: [____________🔍]        │ │
│  └─────────────────────────────────────────────────────┘ │
│                                                           │
│  ● 15/03/2025                                            │
│  │                                                       │
│  │  ┌── 🔴 DENÚNCIA ──────────────────────────────────┐ │
│  │  │ MP oferece denúncia contra João por art. 155 CP  │ │
│  │  │ 👤 João Silva (réu) · Maria Santos (vítima)     │ │
│  │  │ 📄 Processo_001.pdf · pp. 1-5                    │ │
│  │  │ 💡 Tese: ausência de dolo                        │ │
│  │  └──────────────────────────────────────────────────┘ │
│  │                                                       │
│  │  ┌── 🟡 BOLETIM DE OCORRÊNCIA ─────────────────────┐ │
│  │  │ Registro da ocorrência na delegacia              │ │
│  │  │ 👤 Maria Santos (declarante)                     │ │
│  │  │ 📄 Processo_001.pdf · pp. 6-8                    │ │
│  │  └──────────────────────────────────────────────────┘ │
│  │                                                       │
│  ● 20/03/2025                                            │
│  │                                                       │
│  │  ┌── 🔵 DEPOIMENTO VÍTIMA ─────────────────────────┐ │
│  │  │ Maria relata os fatos...                          │ │
│  │  │ ⚠ Contradição com BO: horário diverge            │ │
│  │  │ 📄 Audiencia_01.pdf · pp. 12-15                  │ │
│  │  └──────────────────────────────────────────────────┘ │
│  │                                                       │
│  │  ┌── 🔵 DEPOIMENTO TESTEMUNHA ─────────────────────┐ │
│  │  │ Pedro confirma álibi do réu                      │ │
│  │  │ 💡 Tese: álibi corroborado                      │ │
│  │  │ 📄 Audiencia_01.pdf · pp. 16-20                  │ │
│  │  └──────────────────────────────────────────────────┘ │
│                                                           │
│  ● 10/04/2025                                            │
│  │                                                       │
│  │  ┌── 🟣 LAUDO PERICIAL ────────────────────────────┐ │
│  │  │ Laudo técnico de local...                        │ │
│  │  │ ⚠ Contradição com denúncia: dinâmica diverge    │ │
│  │  │ 📄 Laudos.pdf · pp. 1-8                          │ │
│  │  └──────────────────────────────────────────────────┘ │
│                                                           │
│  ──────────────────────────────────────────────────────── │
│  📊 Resumo: 12 seções · 3 contradições · 2 teses         │
│  └── [Ver Contradições] [Ver Teses] [Exportar]           │
└──────────────────────────────────────────────────────────┘
```

### Cores por Grupo Semântico

| Cor | Grupo | Indicador |
|-----|-------|-----------|
| 🔴 Vermelho | decisoes, mp | Borda esquerda vermelha |
| 🔵 Azul | depoimentos | Borda esquerda azul |
| 🟣 Roxo | laudos | Borda esquerda roxa |
| 🟢 Emerald | defesa | Borda esquerda emerald |
| 🟡 Laranja | investigacao | Borda esquerda laranja |
| ⚪ Slate | inquerito, audiencia | Borda esquerda slate |

### Destaques Especiais

- **⚠ Contradição**: Badge amarelo no card quando `contradicoes.length > 0`
- **💡 Tese**: Badge emerald no card quando `teses.length > 0`
- **Confiança < 70%**: Borda tracejada indicando revisão necessária

### Interações

- Clicar no card → abre PDF na página correspondente
- Clicar em pessoa → filtra timeline por essa pessoa
- Clicar em "Ver Contradições" → filtra só cards com contradições
- Clicar em "Ver Teses" → filtra só cards com teses defensivas

---

## Seção 4 — Plano de Implementação por Fases

### Fase 1 — Migrar Classificador para Claude Sonnet 4 (2-3 dias)

| Item | Detalhe |
|------|---------|
| **Arquivo** | `src/lib/services/pdf-classifier.ts` |
| **O que muda** | Trocar chamada Gemini → Claude Sonnet 4 via `@anthropic-ai/sdk` |
| **Prompt** | Adaptar prompt para formato Claude (system + user message), mantendo taxonomy v2 |
| **Output** | Mesmo `ClassifiedSection` com tipo, titulo, resumo, relevancia, pessoas, eventos, teses, contradicoes |
| **Fallback** | Se Claude falhar (rate limit, timeout), tentar Gemini Flash como backup |
| **Teste** | Reclassificar 3-5 PDFs reais e comparar qualidade vs Gemini |

### Fase 2 — Sincronizar Taxonomy Python ↔ TypeScript (1 dia)

| Item | Detalhe |
|------|---------|
| **Arquivo** | `enrichment-engine/models/schemas.py` + `prompts/document_classifier.py` |
| **O que muda** | Python adota os 27 tipos do TS como fonte de verdade |
| **Mapeamento** | Criar `SECTION_TIPOS` e `TIPO_RELEVANCIA` espelhados no Python |
| **Batch endpoint** | `POST /api/classify-batch` recebe lista de `driveFileId`, classifica em lote com Claude Sonnet 4 |

### Fase 3 — Enriquecer `driveDocumentSections` (1-2 dias)

| Item | Detalhe |
|------|---------|
| **Schema** | Adicionar campos se necessário: `eventDate` (date), `semanticGroup` (text), `pessoasJson` (jsonb) |
| **tRPC** | Novo router `documentSections` com queries: `byProcessoId`, `byDriveFileId`, `timelineByProcessoId` |
| **Query timeline** | JOIN `driveDocumentSections` → `driveFiles` → filtrar por `processoId`, ordenar por `eventDate` |

### Fase 4 — Componente ProcessoTimeline (2-3 dias)

| Item | Detalhe |
|------|---------|
| **Componente** | `src/components/processos/ProcessoTimeline.tsx` |
| **Props** | `processoId: string` |
| **Dados** | Chama `trpc.documentSections.timelineByProcessoId` |
| **Cards** | Cor por grupo semântico, ícone por tipo, badge de relevância |
| **Filtros** | Toggle por relevância (crítico→baixo), busca textual, filtro por tipo |
| **Alertas** | Cards com ⚠ Contradição ou 💡 Tese em destaque |
| **Empty state** | "Nenhum documento classificado. Classifique PDFs no Drive para alimentar a timeline." |

### Fase 5 — Integração nas Páginas (1 dia)

| Item | Detalhe |
|------|---------|
| **Processo page** | Nova tab "Timeline" em `/admin/processos/[id]` usando `ProcessoTimeline` |
| **Drive folder** | Quando pasta tem `processoId`, mostrar mini-timeline abaixo da lista de arquivos |
| **Ação de classificar** | Botão "Classificar" no menu de ações do arquivo no Drive → chama classificador on-demand |

### Ordem de Execução

```
Fase 1 (Classificador Claude) → Fase 2 (Sync Python)
         ↓
Fase 3 (Schema + tRPC) → Fase 4 (UI Timeline) → Fase 5 (Integração)
```

**Total estimado: 7-10 dias de desenvolvimento.**

---

## Decisões de Design

| Decisão | Escolha | Alternativas descartadas |
|---------|---------|--------------------------|
| Modelo de IA | Claude Sonnet 4 | Gemini Flash (inferior em raciocínio jurídico PT-BR) |
| Pipeline | Híbrido (TS on-demand + Python batch) | Só TS (sem batch), Só Python (latência alta) |
| UX Timeline | Vertical cronológica | Tabela, Kanban por tipo |
| Localização | Tab em Processo + Inside Drive folder | Só processo, Só Drive |
| Fallback | Gemini Flash | Sem fallback, retry only |
