# Design: Criação de Processo via PDF com IA no Fluxo Plaud

**Data:** 2026-02-28
**Status:** Aprovado (brainstorming concluído)

---

## Problema

Ao aprovar uma gravação Plaud, frequentemente o assistido e/ou o processo não existem no sistema. Hoje o modal só permite selecionar processos existentes. Falta:
- Criação de assistido com atribuição correta (para pasta Drive)
- Criação de processo a partir de PDF com extração inteligente
- Complementação de dados cadastrais do assistido via IA
- Extração profunda on-demand em múltiplos locais do sistema

## Decisões de Design

| Decisão | Escolha |
|---------|---------|
| Cenário | Assistido E processo podem ser novos |
| Fonte do PDF | Upload manual (PJe automático em fase futura) |
| Extração básica | Dados do processo + cadastro do assistido |
| Extração profunda | On-demand, disponível em múltiplos locais |
| Fluxo UX | Criar assistido primeiro (manual), PDF complementa depois |
| Atribuição | Manual obrigatório + IA sugere correção |
| Engine IA | Gemini (já integrado, multimodal nativo) |

---

## Fluxo Principal (Modal Plaud)

```
1. Gravação Plaud chega (pending_review)
2. Defensor abre o modal de aprovação
3. Busca assistido → NÃO encontra
4. Clica "Criar assistido" → preenche nome + seleciona atribuição (chips)
   → Assistido criado no banco + pasta Drive criada na atribuição correta
5. Seleciona o assistido recém-criado
6. Em "Processo", escolhe tab "Criar via PDF"
7. Sobe o PDF do processo (drag-and-drop ou click)
8. IA extrai: número de autos, vara, partes, tipo penal, CPF/RG/endereço
9. Preview editável aparece com dados extraídos
10. Se atribuição sugerida difere da manual → aviso para atualizar
11. Defensor revisa, ajusta se necessário, confirma
12. Sistema cria processo + atualiza assistido + pasta Drive + sobe PDF + áudio
13. Botão "Aprovar e Vincular" finaliza tudo
```

---

## Arquitetura Técnica

### Novo endpoint: `processos.extractFromPdf`

```typescript
// Input
{
  file: string;           // base64 do PDF
  assistidoId?: number;   // para complementar dados
  deep?: boolean;         // extração profunda on-demand
}

// Output básico
{
  processo: {
    numeroAutos: string;
    vara: string;
    comarca: string;
    tipoPenal: string;
    dataDistribuicao?: string;
    parteAutora?: string;
    atribuicaoSugerida?: string;  // JURI_CAMACARI, VVD, etc.
  },
  assistido: {
    cpf?: string;
    rg?: string;
    endereco?: string;
    filiacao?: string;
    dataNascimento?: string;
    naturalidade?: string;
  },
  confianca: number;  // 0-1
}

// Output profundo (deep: true)
{
  ...outputBasico,
  analise: {
    resumoFatos: string;
    tipificacao: string[];
    movimentacoes: Array<{ data: string; tipo: string; descricao: string }>;
    datasChave: Array<{ data: string; evento: string }>;
    fundamentosJuridicos?: string;
    testemunhas?: string[];
    pontosAtencao?: string[];
  }
}
```

### Engine: Gemini 2.0 Flash
- Já integrado (`extractKeyPointsWithAI` em plaud-api.ts)
- Multimodal nativo (lê PDFs diretamente)
- Prompt estruturado com JSON schema de saída

### Armazenamento
- Extração profunda: `processos.analiseIA` (JSONB, sem migration — usa rawPayload pattern)
- Mantém histórico de versões (timestamp de cada análise)

---

## UI do Modal — Mudanças

### A. Botão "Criar Assistido" na busca

Quando busca não encontra resultados:
```
┌─ Busca ────────────────────────────┐
│ 🔍 "João da Silva"                 │
│ Nenhum assistido encontrado.       │
│                                    │
│ [+ Criar "João da Silva"]          │
│   Nome: [João da Silva       ]     │
│   Atribuição: ● Júri ○ VVD ○ EP   │
│               ○ Sub.Crim ○ Sub.Cív │
│               ○ Grupo Júri         │
│          [Criar Assistido]         │
└────────────────────────────────────┘
```

### B. Área de processo com tabs

```
┌─ Processo ─────────────────────────┐
│ [Existente] [Criar via PDF]        │
│                                    │
│ Se "Criar via PDF":                │
│ ┌──────────────────────────────┐   │
│ │  📄 Arraste o PDF aqui       │   │
│ │  ou clique para selecionar   │   │
│ └──────────────────────────────┘   │
│                                    │
│ Após upload + IA:                  │
│ ┌─ Dados Extraídos ───────────┐   │
│ │ Nº: [0001234-56.2024... ✏️]  │   │
│ │ Vara: [2ª Vara Júri    ✏️]  │   │
│ │ Tipo: [Homicídio Qual. ✏️]  │   │
│ │ 💡 Atrib. sugerida: Júri ✓  │   │
│ │                              │   │
│ │ Dados do Assistido:          │   │
│ │ CPF: [012.345.678-90   ✏️]  │   │
│ │ RG:  [12.345.678       ✏️]  │   │
│ │ End: [Rua X, 123       ✏️]  │   │
│ │                              │   │
│ │ [🧠 Extrair mais detalhes]  │   │
│ └──────────────────────────────┘   │
└────────────────────────────────────┘
```

### C. States do upload
- **Idle:** Dropzone visível
- **Uploading:** Spinner + "Enviando PDF..."
- **Analyzing:** Spinner + "IA analisando processo..." (2-5s)
- **Ready:** Preview editável dos dados
- **Error:** Mensagem + "Tentar novamente"

---

## Extração Profunda On-Demand — Locais Estratégicos

| Local | Trigger | O que faz | Diferencial |
|-------|---------|-----------|-------------|
| **Modal Plaud** | "🧠 Extrair mais detalhes" | Análise completa do PDF subido | Context imediato pré-aprovação |
| **Drive Hub** | Menu contextual em PDF | Analisa qualquer PDF salvo | Organização de documentos existentes |
| **Página do Processo** | Seção "Análise IA" | Análise completa + timeline | Preparação para audiência/petição |
| **Audiências Hub** | "Preparar audiência" | Pontos relevantes para audiência | Revisão rápida pré-audiência |
| **Página do Assistido** | "🧠 Analisar pasta com IA" | **Processa TODOS os PDFs** da pasta Drive | Visão 360° consolidada |

### Processamento Multi-Documento (Página do Assistido)

Diferencial: processa múltiplos PDFs de uma vez, consolidando:
- Timeline unificada de todos os processos
- Dados cadastrais mais completos (cruzando fontes)
- Resumo geral do assistido (visão 360°)
- Alertas de inconsistências entre documentos

```typescript
// Endpoint: assistidos.analyzeAllDocuments
{
  input: { assistidoId: number },
  output: {
    documentosAnalisados: number;
    dadosConsolidados: { /* cadastro mais completo */ };
    timelineUnificada: Array<{ data, evento, fonte }>;
    resumoGeral: string;
    alertas: string[];
  }
}
```

---

## Hierarquia Drive Resultante

```
📁 JURI/                         ← atribuição (selecionada manualmente)
  📁 João da Silva/              ← assistido (criado no modal)
    📁 0001234-56.2024.8.05.0133/ ← processo (criado via PDF)
      📄 processo.pdf             ← PDF original enviado
      📁 01 - Documentos Pessoais
      📁 02 - Peças Protocoladas
      📁 03 - Decisões e Sentenças
      📁 04 - Audiências
      📁 05 - Outros
    🎵 plaud_2024-02-28.m4a      ← gravação aprovada
```

---

## Arquivos a Modificar

| Arquivo | Mudança |
|---------|---------|
| `src/components/atendimentos/plaud-approval-modal.tsx` | UI: criar assistido, tabs processo, upload PDF, preview |
| `src/lib/trpc/routers/processos.ts` | Novo endpoint `extractFromPdf` |
| `src/lib/trpc/routers/assistidos.ts` | Novo endpoint `analyzeAllDocuments`, inline create |
| `src/lib/trpc/routers/atendimentos.ts` | Ajustar `approveRecording` para novo fluxo |
| `src/lib/plaud-api.ts` | Ajustar `processApprovedRecording` para PDF do processo |
| `src/lib/services/google-drive.ts` | Upload do PDF na pasta do processo |
| `src/lib/ai/pdf-extraction.ts` | **Novo**: Gemini PDF extraction (básico + profundo) |
| `src/app/(dashboard)/admin/assistidos/[id]/page.tsx` | Botão "Analisar pasta com IA" |
| `src/components/casos/audiencias-hub.tsx` | Botão "Preparar audiência" |

---

## Fases de Implementação

### Fase 1 — Core (esta sessão)
1. `pdf-extraction.ts` — Engine Gemini para extração básica
2. `processos.extractFromPdf` — Endpoint tRPC
3. Modal Plaud — Criar assistido inline + upload PDF + preview
4. Fluxo completo: criar assistido → PDF → processo → aprovação

### Fase 2 — Extração Profunda
5. Flag `deep: true` no endpoint
6. Botões "Extrair mais detalhes" em: Modal, Drive Hub, Processo
7. `processos.analiseIA` — armazenamento JSONB

### Fase 3 — Multi-Documento
8. `assistidos.analyzeAllDocuments` — processamento em lote
9. UI na página do assistido — visão 360°

### Fase 4 — PJe Automático (futuro)
10. Integração PJe para busca automática de PDFs por número de processo
