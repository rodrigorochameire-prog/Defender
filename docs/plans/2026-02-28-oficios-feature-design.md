# Feature: Sistema de Ofícios — Design Document

> Data: 2026-02-28
> Status: Draft → Aguardando Aprovação

---

## 1. Visão Geral

### Problema
O defensor gasta tempo significativo confeccionando ofícios manualmente, buscando modelos em pastas do Drive, preenchendo dados repetitivos (nome, CPF, processo, vara) e adaptando linguagem para cada tipo de ofício. Não há padronização nem aprendizado dos ofícios já feitos.

### Solução
Sistema inteligente de geração de ofícios que:
1. **Analisa ofícios existentes** no Drive (`1LidSgAPdzrRPl0ohPJ7kKlDWY_quMr-7`) para identificar padrões e gerar templates automaticamente
2. **Preenche dados automaticamente** a partir do assistido/processo/demanda selecionado
3. **Gera minutas com IA** usando contexto processual (Gemini 3.1 Pro para redação, Claude Sonnet para revisão)
4. **Exporta para Google Docs / PDF** no Drive do assistido
5. **Aprende e melhora** com cada ofício gerado (feedback loop)

### Pontos de Acesso (3 entradas)
| Ponto | Localização | Uso |
|-------|-------------|-----|
| **Hub Central** | `/admin/oficios` | Gestão completa, templates, análise, histórico |
| **Atalho no Assistido** | Tab "Documentos" em `/admin/assistidos/[id]` | Gerar ofício rápido para este assistido |
| **Sugestão em Demandas** | Card lateral em `/admin/demandas/[id]` | "Ofício sugerido" baseado no tipo de ato/providência |

---

## 2. Arquitetura de IA (Multi-Modelo)

### Stack de Modelos

| Modelo | Uso | Justificativa |
|--------|-----|---------------|
| **Gemini 3 Flash** | Extração/classificação de ofícios existentes (alto volume) | Barato, rápido, contexto grande |
| **Gemini 3.1 Pro** | Análises processuais, relatórios, minutas de petições/ofícios | Raciocínio superior, 1M tokens |
| **Claude Sonnet 4.6** | Revisão de coerência, tom, adequação jurídica | Estado da arte em análise textual |
| **Claude Opus 4.6** | Inteligência sobre dados estruturados (assisting Agno) | High reasoning, **USO RESTRITO** |

### ⚠️ Restrições do Opus 4.6
- **Apenas** para funções superiores de inteligência de dados **estruturados**
- **NÃO** usar para processar PDFs longos ou contextos grandes
- Janela de contexto **pequena** — dados devem chegar já depurados
- Custo alto por token — reservar para decisões que exijam raciocínio profundo
- Exemplo OK: "Dado este JSON de 15 ofícios classificados, qual padrão ótimo de argumentação para requisitórios?"
- Exemplo NÃO: "Leia este PDF de 200 páginas e extraia os pontos-chave"

### Frameworks de Orquestração

| Framework | Camada | Função |
|-----------|--------|--------|
| **Agno** (ex-Phidata) | Python (enrichment-engine) | Orquestração de agentes, memória, guardrails, tool calling |
| **LangChain** | Python (enrichment-engine) | Prompt chains estruturados, document loaders, summarization |

### Pipeline de Processamento

```
┌─────────────────────────────────────────────────────┐
│                     ANÁLISE                          │
│                                                      │
│  Drive Files ──→ Docling (extração) ──→ Markdown    │
│       │                                    │         │
│       │              Gemini 3 Flash        │         │
│       │         (classificação rápida)     │         │
│       │              ↓                     │         │
│       │     Tipo + Destinatário +          │         │
│       │     Variáveis + Estrutura          │         │
│       │              ↓                     │         │
│       │      Agno (orquestração)           │         │
│       │         ↓           ↓              │         │
│       │   LangChain     Opus 4.6           │         │
│       │   (patterns)   (insight            │         │
│       │                estruturado)        │         │
│       │              ↓                     │         │
│       │     Templates gerados              │         │
│       └──────────────────────────────┘     │         │
│                                                      │
└──────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│                    GERAÇÃO                           │
│                                                      │
│  Template + Dados Assistido/Processo                 │
│       │                                              │
│       ├──→ Auto-fill (variáveis padrão)              │
│       │                                              │
│       ├──→ Gemini 3.1 Pro (minutar corpo)            │
│       │    "Dado o contexto processual X,             │
│       │     redija um ofício de Y para Z"            │
│       │                                              │
│       ├──→ Claude Sonnet 4.6 (revisão)               │
│       │    "Revise coerência, tom formal,             │
│       │     adequação jurídica"                       │
│       │                                              │
│       └──→ Editor inline → Google Docs / PDF         │
│                                                      │
└──────────────────────────────────────────────────────┘
```

---

## 3. Modelo de Dados

### 3a. Tabelas Existentes (já no schema)

**`documentoModelos`** — Templates de ofícios
- `id`, `titulo`, `descricao`, `categoria`, `conteudo` ({{VARIAVEIS}})
- `tipoPeca`, `area`, `variaveis` (JSON), `formatacao` (JSON)
- `tags`, `isPublic`, `isAtivo`, `totalUsos`

**`documentosGerados`** — Ofícios gerados
- `modeloId`, `processoId`, `assistidoId`, `demandaId`, `casoId`
- `titulo`, `conteudoFinal`, `valoresVariaveis` (JSON)
- `geradoPorIA`, `promptIA`
- `googleDocId`, `googleDocUrl`, `driveFileId`

### 3b. Extensões Necessárias (via JSONB, sem migration)

Novos campos em **`documentoModelos.formatacao`** (JSONB):
```typescript
formatacao: {
  // Existente
  fonte?: string;
  tamanhoFonte?: number;
  margens?: { top, bottom, left, right };
  espacamento?: number;
  cabecalho?: string;
  rodape?: string;
  // NOVO
  tipoOficio?: string;       // "requisitorio", "comunicacao", "encaminhamento", etc
  destinatarioPadrao?: string; // "juiz", "delegacia", "ipa", "conselho_tutelar"
  urgencia?: "normal" | "urgente" | "urgentissimo";
}
```

Novos campos em **`documentosGerados`** (via rawPayload JSONB ou novo campo):
```typescript
// Adicionar campo metadata JSONB à tabela
metadata: {
  tipoOficio: string;
  destinatario: string;
  urgencia: string;
  iaModelo: string;          // "gemini-3.1-pro", "claude-sonnet-4.6"
  iaRevisao?: {
    modelo: string;
    score: number;           // 0-100
    sugestoes: string[];
  };
  driveSourceId?: string;    // ID do ofício original analisado (se gerado por análise)
  versao: number;            // versionamento do documento
}
```

### 3c. Nova Tabela: `oficio_analises` (tracking de análises do Drive)

```sql
CREATE TABLE oficio_analises (
  id SERIAL PRIMARY KEY,
  drive_file_id TEXT NOT NULL,
  drive_file_name TEXT NOT NULL,
  drive_folder_id TEXT,

  -- Resultado da análise
  tipo_oficio VARCHAR(100),          -- classificação automática
  destinatario_tipo VARCHAR(100),    -- tipo de destinatário
  assunto TEXT,                      -- assunto extraído
  estrutura JSONB,                   -- { saudacao, corpo, fechamento, assinatura }
  variaveis_identificadas JSONB,     -- variáveis detectadas no texto
  qualidade_score INTEGER,           -- 0-100 (qualidade do ofício)

  -- Controle
  modelo_gerado_id INTEGER REFERENCES documento_modelos(id),
  status VARCHAR(20) DEFAULT 'pendente', -- pendente, processando, concluido, erro
  erro TEXT,

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_oficio_analises_drive ON oficio_analises(drive_file_id);
CREATE INDEX idx_oficio_analises_tipo ON oficio_analises(tipo_oficio);
CREATE INDEX idx_oficio_analises_status ON oficio_analises(status);
```

---

## 4. Tipos de Ofícios Identificados

Baseado na análise dos ofícios existentes no Drive:

| # | Tipo | Destinatário | Frequência | Complexidade |
|---|------|-------------|------------|-------------|
| 1 | **Requisitório** | Juiz/Vara | Alta | Média |
| 2 | **Comunicação/Informação** | Órgão público | Alta | Baixa |
| 3 | **Encaminhamento** | Instituição | Média | Baixa |
| 4 | **Solicitação de Providências** | Delegacia, IPA, IML | Média | Média |
| 5 | **Intimação/Notificação** | Assistido/Parte | Média | Baixa |
| 6 | **Pedido de Informação** | Hospital, escola, etc | Média | Baixa |
| 7 | **Manifestação** | Tribunal | Baixa | Alta |
| 8 | **Representação** | OAB, CNJ, Corregedoria | Baixa | Alta |
| 9 | **Parecer Técnico** | Interno | Baixa | Alta |
| 10 | **Convite/Convocação** | Testemunha, perito | Média | Baixa |
| 11 | **Resposta a Ofício** | Quem enviou | Variável | Variável |
| 12 | **Certidão** | Interno | Baixa | Baixa |

---

## 5. UI/UX Design

### 5a. Hub Central (`/admin/oficios`)

```
┌──────────────────────────────────────────────────────────────┐
│  📄 Ofícios                                    [+ Novo Ofício]│
│                                                               │
│  ┌─────────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────┐ │
│  │ 📊 Total    │ │ 📝 Rascunho│ │ ✅ Enviados│ │🤖 Templates  │ │
│  │    47       │ │     3     │ │    38    │ │     12       │ │
│  └─────────────┘ └──────────┘ └──────────┘ └──────────────┘ │
│                                                               │
│  ┌─ Tabs ──────────────────────────────────────────────────┐ │
│  │ [Meus Ofícios]  [Templates]  [Análise Drive]           │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                               │
│  ═══ Tab: Meus Ofícios ═══                                   │
│                                                               │
│  🔍 Buscar...    Filtro: [Tipo ▾] [Status ▾] [Período ▾]    │
│                                                               │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ 🟢 Ofício Requisitório - Vara Criminal Camaçari         │ │
│  │    João Silva · Proc. 0001234-56.2025 · 27/02/2026     │ │
│  │    Status: Enviado  │  Tipo: Requisitório               │ │
│  │    [Abrir] [Duplicar] [Google Doc ↗]                    │ │
│  ├─────────────────────────────────────────────────────────┤ │
│  │ 🟡 Comunicação ao IPA - Solicitação de Relatório        │ │
│  │    Maria Santos · Proc. 0005678-90.2025 · 26/02/2026   │ │
│  │    Status: Rascunho  │  Tipo: Solicitação               │ │
│  │    [Editar] [Revisar com IA] [Exportar]                 │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                               │
│  ═══ Tab: Templates ═══                                       │
│                                                               │
│  Grid de cards com templates por tipo:                        │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐               │
│  │ Requisitório│ │ Comunicação│ │ Encaminham. │               │
│  │  8 usos    │ │  12 usos   │ │   5 usos   │               │
│  │ [Usar]     │ │ [Usar]     │ │ [Usar]     │               │
│  └────────────┘ └────────────┘ └────────────┘               │
│                                                               │
│  ═══ Tab: Análise Drive ═══                                   │
│                                                               │
│  📁 Pasta: Ofícios (1LidSg...)                               │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ 📊 Análise: 47 ofícios encontrados                      │ │
│  │    ├── 2025: 28 arquivos                                │ │
│  │    ├── 2024: 15 arquivos                                │ │
│  │    └── Modelos e outros: 4 arquivos                     │ │
│  │                                                          │ │
│  │ [🤖 Analisar meus ofícios]  [↻ Re-analisar]             │ │
│  │                                                          │ │
│  │ Última análise: nunca                                    │ │
│  │                                                          │ │
│  │ Quando analisado:                                        │ │
│  │ • Classifica cada ofício por tipo                        │ │
│  │ • Identifica padrões de linguagem                        │ │
│  │ • Extrai variáveis recorrentes                           │ │
│  │ • Sugere templates baseados nos padrões                  │ │
│  │ • Score de qualidade por ofício                          │ │
│  └─────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
```

### 5b. Atalho no Assistido (nova seção na tab existente)

Na página `/admin/assistidos/[id]` — dentro da tab "drive" ou como **nova tab "Documentos"**:

```
┌─ Tab: Documentos ──────────────────────────────────────────┐
│                                                             │
│  [+ Novo Ofício]  [+ Nova Petição]  [+ Documento Livre]    │
│                                                             │
│  ── Ofícios Recentes ──                                     │
│  ┌───────────────────────────────────────────────────────┐ │
│  │ Requisitório - Vara Criminal   27/02  ✅ Enviado       │ │
│  │ Comunicação ao IPA             25/02  📝 Rascunho      │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                             │
│  ── Sugestões IA ──                                         │
│  ┌───────────────────────────────────────────────────────┐ │
│  │ 💡 Baseado nas demandas pendentes:                     │ │
│  │ • "Ofício requisitório para juntada de laudo" (Dem #42)│ │
│  │ • "Comunicação ao IPA sobre visita" (Dem #38)          │ │
│  │   [Gerar] [Gerar] 			                              │ │
│  └───────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### 5c. Sugestão em Demandas

Na página `/admin/demandas/[id]` — card lateral:

```
┌─ Ofício Sugerido ──────────┐
│                              │
│  📄 Tipo: Requisitório       │
│  📋 Ato: Resposta à Acusação│
│                              │
│  Template recomendado:       │
│  "Ofício Requisitório -      │
│   Juntada de Documentos"     │
│                              │
│  [Gerar Ofício →]            │
│                              │
│  Baseado em:                 │
│  • Tipo do ato               │
│  • Providência descrita      │
│  • Ofícios similares (IA)    │
└──────────────────────────────┘
```

### 5d. Editor Inline de Ofício

Modal/página de edição do ofício:

```
┌──────────────────────────────────────────────────────────────┐
│  ← Voltar   Ofício Requisitório                  [Salvar]    │
│                                                    [Exportar]│
│                                                               │
│  ┌── Metadados ──────────────────────────────────────────┐   │
│  │ Tipo: [Requisitório ▾]  Urgência: [Normal ▾]          │   │
│  │ Destinatário: Juiz da 1ª Vara Criminal de Camaçari    │   │
│  │ Assistido: João Silva (CPF: 123.456.789-00)           │   │
│  │ Processo: 0001234-56.2025.8.05.0132                   │   │
│  └────────────────────────────────────────────────────────┘   │
│                                                               │
│  ┌── Editor ─────────────────────────────────────────────┐   │
│  │ [B] [I] [U] │ [H1][H2] │ [📋 Colar] │ [🤖 IA]      │   │
│  │                                                        │   │
│  │  DEFENSORIA PÚBLICA DO ESTADO DA BAHIA                 │   │
│  │  Núcleo Criminal de Camaçari                           │   │
│  │                                                        │   │
│  │  OFÍCIO Nº ___/2026                                    │   │
│  │                                                        │   │
│  │  Camaçari, 28 de fevereiro de 2026.                    │   │
│  │                                                        │   │
│  │  Ao Excelentíssimo Senhor Juiz de Direito              │   │
│  │  da 1ª Vara Criminal de Camaçari                       │   │
│  │                                                        │   │
│  │  Ref.: Processo nº 0001234-56.2025.8.05.0132           │   │
│  │  Assistido: JOÃO SILVA                                 │   │
│  │                                                        │   │
│  │  [corpo do ofício...]                                  │   │
│  │                                                        │   │
│  └────────────────────────────────────────────────────────┘   │
│                                                               │
│  ┌── Ações IA ───────────────────────────────────────────┐   │
│  │ [🤖 Gerar corpo com IA]  [📝 Revisar]  [✨ Melhorar]  │   │
│  │                                                        │   │
│  │ Revisão Claude Sonnet:                                 │   │
│  │ ┌─────────────────────────────────────────────────┐   │   │
│  │ │ ✅ Tom formal adequado                           │   │   │
│  │ │ ⚠️ Sugestão: especificar artigo de lei no §3    │   │   │
│  │ │ ✅ Dados do assistido corretos                   │   │   │
│  │ │ Score: 87/100                                    │   │   │
│  │ └─────────────────────────────────────────────────┘   │   │
│  └────────────────────────────────────────────────────────┘   │
│                                                               │
│  ┌── Exportar ───────────────────────────────────────────┐   │
│  │ [📄 Google Docs]  [📑 PDF no Drive]  [🖨 Imprimir]    │   │
│  └────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────┘
```

---

## 6. API Design

### 6a. Novos Endpoints tRPC (`src/lib/trpc/routers/oficios.ts`)

```typescript
// oficios.ts — Router dedicado
export const oficiosRouter = createTRPCRouter({

  // === CRUD ===
  list: protectedProcedure
    .input(z.object({
      tipo?: z.string(),
      status?: z.enum(["rascunho", "revisao", "enviado", "arquivado"]),
      assistidoId?: z.number(),
      processoId?: z.number(),
      demandaId?: z.number(),
      search?: z.string(),
      limit: z.number().default(20),
      offset: z.number().default(0),
    }))
    .query(/* lista ofícios gerados com filtros */),

  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(/* retorna ofício com modelo, assistido, processo */),

  create: protectedProcedure
    .input(z.object({
      modeloId?: z.number(),        // se baseado em template
      assistidoId?: z.number(),
      processoId?: z.number(),
      demandaId?: z.number(),
      titulo: z.string(),
      conteudoFinal: z.string(),
      tipoOficio: z.string(),
      destinatario: z.string(),
      urgencia: z.enum(["normal", "urgente", "urgentissimo"]).default("normal"),
      metadata?: z.record(z.any()),
    }))
    .mutation(/* cria documentoGerado + metadata */),

  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      conteudoFinal?: z.string(),
      titulo?: z.string(),
      metadata?: z.record(z.any()),
    }))
    .mutation(/* atualiza ofício */),

  // === IA ===
  gerarComIA: protectedProcedure
    .input(z.object({
      modeloId: z.number(),
      assistidoId: z.number(),
      processoId?: z.number(),
      demandaId?: z.number(),
      contextoAdicional?: z.string(),   // instrução livre do defensor
    }))
    .mutation(/*
      1. autoPreencherVariaveis
      2. Gemini 3.1 Pro → gerar corpo
      3. Retorna rascunho para editor
    */),

  revisarComIA: protectedProcedure
    .input(z.object({
      id: z.number(),                   // ofício existente
      conteudo: z.string(),             // conteúdo atual
    }))
    .mutation(/*
      Claude Sonnet 4.6 → revisar coerência, tom, adequação
      Retorna { score, sugestoes[], conteudoRevisado? }
    */),

  melhorarComIA: protectedProcedure
    .input(z.object({
      conteudo: z.string(),
      instrucao: z.string(),           // "mais formal", "adicionar jurisprudência", etc
    }))
    .mutation(/* Gemini 3.1 Pro → reescrever conforme instrução */),

  // === ANÁLISE DRIVE ===
  analisarDrive: protectedProcedure
    .mutation(/*
      1. Listar arquivos da pasta de ofícios
      2. Para cada: Docling → extract markdown
      3. Gemini Flash → classificar tipo + variáveis
      4. Agno → orquestrar análise de padrões
      5. Gerar/atualizar templates em documentoModelos
      6. Salvar em oficio_analises
    */),

  statusAnalise: protectedProcedure
    .query(/* retorna status da última análise + stats */),

  analises: protectedProcedure
    .input(z.object({ tipo?: z.string(), limit?: z.number() }))
    .query(/* lista análises com filtros */),

  // === SUGESTÕES ===
  sugerirParaDemanda: protectedProcedure
    .input(z.object({ demandaId: z.number() }))
    .query(/*
      Analisa ato + providência da demanda
      Retorna template + tipo sugerido
    */),

  sugerirParaAssistido: protectedProcedure
    .input(z.object({ assistidoId: z.number() }))
    .query(/*
      Analisa demandas pendentes do assistido
      Retorna lista de ofícios sugeridos
    */),

  // === EXPORTAÇÃO ===
  exportarGoogleDocs: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(/* cria Google Doc no Drive do assistido */),

  exportarPDF: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(/* gera PDF e salva no Drive */),

  // === STATS ===
  stats: protectedProcedure
    .query(/* total, por tipo, por mês, templates mais usados */),
});
```

### 6b. Novos Endpoints Python (enrichment-engine)

```python
# POST /api/oficios/analisar-batch
# Recebe lista de drive_file_ids, extrai e classifica cada um
{
  "drive_file_ids": ["id1", "id2", ...],
  "analise_profunda": false  # true = usa Opus 4.6 para insights
}

# POST /api/oficios/gerar-minuta
# Gemini 3.1 Pro gera corpo do ofício
{
  "tipo_oficio": "requisitorio",
  "template_base": "...",        # conteúdo do template
  "dados_assistido": {...},
  "dados_processo": {...},
  "contexto_adicional": "...",
  "instrucoes": "..."
}

# POST /api/oficios/revisar
# Claude Sonnet 4.6 revisa o ofício
{
  "conteudo": "...",
  "tipo_oficio": "requisitorio",
  "destinatario": "juiz"
}

# POST /api/oficios/extrair-padroes
# Agno + Opus 4.6 (dados estruturados) identifica padrões
{
  "analises": [...],              # resultados já classificados
  "gerar_templates": true
}
```

---

## 7. Fluxo de Análise (Botão "Analisar meus ofícios")

### Etapas

```
1. LISTAR
   Drive API → listar todos os .docx/.pdf em 1LidSg...
   Recursivo: 2019/, 2020/, ..., 2025/, Modelos/

2. EXTRAIR (Docling — batch)
   Para cada arquivo:
   - Download via Drive API
   - Docling → markdown + metadata
   - Salvar em oficio_analises (status: processando)

3. CLASSIFICAR (Gemini 3 Flash — alto volume)
   Para cada markdown:
   - Tipo de ofício (requisitório, comunicação, etc)
   - Destinatário (juiz, delegacia, IPA, etc)
   - Assunto
   - Variáveis detectadas
   - Score de qualidade (0-100)
   - Atualizar oficio_analises (status: concluido)

4. IDENTIFICAR PADRÕES (Agno + LangChain)
   Agrupar por tipo → para cada grupo:
   - Estrutura comum (saudação, corpo, fechamento)
   - Linguagem recorrente
   - Variáveis padrão

5. INSIGHTS ESTRATÉGICOS (Opus 4.6 — dados estruturados)
   Input: JSON resumido dos padrões identificados
   Output:
   - Templates otimizados sugeridos
   - Recomendações de melhoria
   - Inconsistências entre ofícios do mesmo tipo

6. GERAR TEMPLATES (LangChain)
   Para cada tipo com 3+ exemplos:
   - Criar documentoModelo com {{VARIAVEIS}}
   - Marcar como "gerado_por_ia"
   - Vincular a oficio_analises.modelo_gerado_id

7. APRESENTAR RESULTADOS
   UI exibe:
   - Quantos ofícios analisados
   - Classificação por tipo (gráfico)
   - Templates gerados/sugeridos
   - Score médio de qualidade
   - Recomendações
```

### UX do Progresso

```
[🤖 Analisar meus ofícios]
       ↓ (click)
┌─────────────────────────────────────┐
│  Analisando ofícios...              │
│                                      │
│  ████████░░░░░░░░░░░░  42%          │
│                                      │
│  📥 Extraindo: oficio-req-2025.docx  │
│  ✅ Classificados: 18/43             │
│  ⏳ Identificando padrões...         │
│                                      │
│  [Cancelar]                          │
└─────────────────────────────────────┘
       ↓ (concluído)
┌─────────────────────────────────────┐
│  ✅ Análise concluída!               │
│                                      │
│  43 ofícios analisados              │
│  12 tipos identificados             │
│  8 templates gerados                │
│  Score médio: 78/100                │
│                                      │
│  [Ver Resultados]  [Ver Templates]   │
└─────────────────────────────────────┘
```

---

## 8. Compartilhamento da Pasta de Ofícios

A pasta do Drive (`1LidSgAPdzrRPl0ohPJ7kKlDWY_quMr-7`) precisa ser compartilhada com a Service Account `ombuds-drive@vvd-automation.iam.gserviceaccount.com` para que o backend acesse programaticamente.

---

## 9. Dependências a Instalar

### Python (enrichment-engine/requirements.txt)

```
# === AI (atualizado) ===
google-genai>=1.12.0         # Gemini 3.x
anthropic>=0.49.0             # Claude API
langchain-google-genai>=4.0.0 # LangChain + Gemini
langchain-core>=0.3.30
langchain-anthropic>=0.3.10  # LangChain + Claude
agno>=1.5.0                  # Agent orchestration
```

### Node.js (gemini.ts upgrade)

Atualizar `src/lib/services/gemini.ts`:
```typescript
// DE:
export const GEMINI_MODELS = {
  PRO: "gemini-1.5-pro",        // RETIRED!
  FLASH: "gemini-1.5-flash",    // RETIRED!
};

// PARA:
export const GEMINI_MODELS = {
  PRO: "gemini-3.1-pro",         // Reasoning-first, 1M context
  FLASH: "gemini-3-flash",       // Fast, cheap, high volume
  FLASH_LITE: "gemini-3-flash-lite", // Ultra-cheap classification
} as const;
```

### Env Vars (Vercel + .env.local)

```
ANTHROPIC_API_KEY=sk-ant-api03-IIcD6wV-...  # Claude Sonnet + Opus
# GOOGLE_API_KEY já existe para Gemini
```

---

## 10. Arquivos a Criar/Modificar

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `src/app/(dashboard)/admin/oficios/page.tsx` | **CRIAR** | Hub central de ofícios |
| `src/app/(dashboard)/admin/oficios/[id]/page.tsx` | **CRIAR** | Editor de ofício individual |
| `src/components/oficios/oficio-hub.tsx` | **CRIAR** | Componente hub (tabs, stats, lista) |
| `src/components/oficios/oficio-editor.tsx` | **CRIAR** | Editor inline WYSIWYG |
| `src/components/oficios/oficio-card.tsx` | **CRIAR** | Card de ofício na lista |
| `src/components/oficios/template-selector.tsx` | **CRIAR** | Modal de seleção de template |
| `src/components/oficios/variable-form.tsx` | **CRIAR** | Form dinâmico de variáveis |
| `src/components/oficios/ia-review-panel.tsx` | **CRIAR** | Painel de revisão IA |
| `src/components/oficios/drive-analysis.tsx` | **CRIAR** | Tab de análise do Drive |
| `src/components/oficios/oficio-suggestion.tsx` | **CRIAR** | Card de sugestão (demanda/assistido) |
| `src/lib/trpc/routers/oficios.ts` | **CRIAR** | Router tRPC dedicado |
| `src/lib/services/gemini.ts` | **MODIFICAR** | Upgrade modelos 1.5→3.x |
| `src/lib/services/anthropic.ts` | **CRIAR** | Client Claude (Sonnet + Opus) |
| `src/app/(dashboard)/admin/assistidos/[id]/page.tsx` | **MODIFICAR** | Adicionar tab "Documentos" |
| `src/app/(dashboard)/admin/demandas/[id]/page.tsx` | **MODIFICAR** | Adicionar card "Ofício Sugerido" |
| `enrichment-engine/services/oficios_service.py` | **CRIAR** | Serviço de análise/geração |
| `enrichment-engine/services/anthropic_service.py` | **CRIAR** | Client Anthropic Python |
| `enrichment-engine/agents/oficio_agent.py` | **CRIAR** | Agno agent para orquestração |
| `enrichment-engine/requirements.txt` | **MODIFICAR** | Adicionar dependências |
| `src/lib/db/schema.ts` | **MODIFICAR** | Adicionar tabela oficio_analises |

---

## 11. Fases de Implementação

### Fase 1 — Fundação (prioridade)
1. Compartilhar pasta de ofícios com SA
2. Upgrade Gemini 1.5→3.x em `gemini.ts`
3. Criar `anthropic.ts` (client Claude)
4. Atualizar `requirements.txt` (Agno, LangChain, Anthropic)
5. Criar tabela `oficio_analises` (migration)
6. Criar router `oficios.ts` (CRUD básico)

### Fase 2 — Hub + Editor
7. Criar página `/admin/oficios`
8. Componente hub (tabs, filtros, lista)
9. Template selector + variable form
10. Editor inline (baseado em textarea com formatação)
11. Exportar Google Docs + PDF

### Fase 3 — IA
12. Endpoint Python `analisar-batch` (Docling + Gemini Flash)
13. Endpoint Python `gerar-minuta` (Gemini 3.1 Pro)
14. Endpoint Python `revisar` (Claude Sonnet 4.6)
15. Agno agent para orquestração de análise
16. Botão "Analisar meus ofícios" funcional

### Fase 4 — Integração
17. Tab "Documentos" no assistido
18. Card "Ofício Sugerido" na demanda
19. Sugestões inteligentes baseadas em demandas pendentes
20. Opus 4.6 para insights em dados estruturados

---

## 12. Verificação

- [ ] Build (`npm run build`) sem erros
- [ ] Hub `/admin/oficios` carrega com tabs e filtros
- [ ] Criar ofício a partir de template → preenche variáveis automaticamente
- [ ] Gerar com IA → Gemini 3.1 Pro retorna corpo adequado
- [ ] Revisar com IA → Claude Sonnet retorna score + sugestões
- [ ] Exportar Google Docs → cria doc no Drive do assistido
- [ ] Exportar PDF → salva no Drive
- [ ] "Analisar meus ofícios" → processa batch do Drive
- [ ] Tab Documentos no assistido → mostra ofícios + sugestões
- [ ] Card sugestão na demanda → recomenda ofício baseado no ato
- [ ] Mobile (375px) → editor responsivo, cards empilhados
- [ ] Deploy Vercel → tudo funcional em produção
