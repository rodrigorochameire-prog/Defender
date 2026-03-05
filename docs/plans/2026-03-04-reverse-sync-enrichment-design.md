# Design: Reverse Sync (Drive → Assistido) + Enrichment Dashboard

**Data**: 2026-03-04
**Status**: Aprovado

---

## Contexto

O sistema OMBUDS vincula 100% dos assistidos a pastas no Google Drive (346/346). Porém existem ~126 pastas órfãs no Drive (principalmente VVD e Júri) sem assistido correspondente — casos antigos, transferidos, ou criados manualmente por defensores/estagiários.

**Problema**: Não há mecanismo para detectar novas pastas no Drive e criar assistidos automaticamente, nem para orquestrar enrichment de documentos em batch.

**Decisões**:
- Detecção via webhook existente (changes.watch) — infra já implementada
- Criação automática com flag `pendente_revisao` quando houver possível duplicata
- Enrichment disponível per-assistido + dashboard global para batch
- Trigger automático de enrichment 5 min após criação de pasta (delay para aguardar uploads)

---

## Seção 1: Reverse Sync (Drive → Assistido)

**Trigger**: O webhook `syncIncremental` já detecta mudanças no Drive via `changes.list`. Hoje sincroniza arquivos mas ignora criação de pastas novas. A mudança é adicionar handler nesse fluxo.

**Fluxo**:
```
Google Drive: nova pasta criada em /VVD/
       ↓
changes.watch → POST /api/webhooks/drive
       ↓
Inngest: drive/incremental-sync
       ↓
syncIncremental() detecta: {
  file: { name: "João Silva", mimeType: "folder", parents: [VVD_FOLDER_ID] }
}
       ↓
Novo handler: handleNewAssistidoFolder()
  1. Identifica atribuição pelo parent folder ID
  2. Normaliza nome da pasta
  3. Busca assistido existente com nome similar (Levenshtein ≥ 0.85)
  4. Se match exato → apenas vincula driveFolderId (se ainda não vinculado)
  5. Se match parcial (0.60-0.84) → cria com status "pendente_revisao" + notifica admin
  6. Se sem match → cria assistido novo (nome + atribuição + driveFolderId)
  7. Em todos os casos: agenda enrichment dos documentos internos
```

**Dados criados no assistido**:
- `nome`: título da pasta (normalizado com `toTitleCase`)
- `atribuicaoPrimaria`: mapeada do folder parent
- `driveFolderId`: ID da pasta
- `status`: `"ativo"` (normal) ou `"pendente_revisao"` (quando há possível duplicata)
- `origemCadastro`: `"drive_sync"` (novo campo para rastreabilidade)

---

## Seção 2: Detecção de Duplicatas e Fluxo de Revisão

Quando um assistido é criado com `pendente_revisao`, o sistema:

1. **Grava o candidato duplicata** no campo `duplicataSugerida`: `{ assistidoId: 123, nome: "João da Silva", confidence: 0.78 }`
2. **Cria notificação** para admins: "Nova pasta 'João Silva' (VVD) pode ser duplicata de 'João da Silva' (ID 123). Revisar."
3. O admin pode:
   - **Confirmar como novo** → muda status para `"ativo"`, limpa `duplicataSugerida`
   - **Mergear com existente** → vincula pasta ao assistido existente, deleta registro duplicado
   - **Ignorar** → fica como pendente (aparece no dashboard)

**Onde aparece**:
- Badge no sidebar: "3 pendentes revisão" (similar ao badge de notificações)
- Card no dashboard global de enrichment
- Na página do assistido: banner amarelo "Este cadastro foi criado automaticamente e pode ser duplicata de [Nome]. Revisar."

**Schema**: Dois novos campos na tabela `assistidos`:
```
origemCadastro: varchar   -- 'manual' | 'drive_sync' | 'solar' | 'pje'
duplicataSugerida: jsonb  -- { assistidoId, nome, confidence } | null
```

---

## Seção 3: Enrichment Orchestration

### Per-assistido (aba Drive)

Botão "Processar Pasta Completa" que:
1. Lista todos os arquivos na pasta Drive do assistido
2. Para cada arquivo sem `enrichmentStatus` ou com `failed`:
   - Audio/vídeo → `transcribeAsync()` (Whisper/Gemini via Railway)
   - PDF/DOCX → `enrichDocument()` (extração + classificação)
   - Imagem → `ocr()` + `enrichDocument()`
3. Mostra progresso em tempo real (polling a cada 5s)
4. Ao final: dispara `consolidateCase()` para análise integrada

### Batch (dashboard global)

Mutation `enrichment.batchProcess`:
```typescript
Input: {
  scope: 'all_pending' | 'by_atribuicao' | 'by_ids'
  atribuicao?: string
  assistidoIds?: number[]
  onlyNew?: boolean  // só arquivos sem enrichment
}
```

Usa Inngest para enfileirar jobs:
- Máximo 5 processamentos simultâneos
- Retry automático (3 tentativas com backoff)
- Evento `enrichment/batch-complete` ao finalizar

### Trigger automático no reverse sync

Quando `handleNewAssistidoFolder()` cria assistido:
```typescript
inngest.send('enrichment/process-folder', {
  assistidoId,
  driveFolderId,
  delay: '5m'  // aguarda caso mais arquivos sejam adicionados
})
```

---

## Seção 4: Admin Dashboard de Enrichment

**Rota**: `/admin/settings/enrichment`

```
┌─────────────────────────────────────────────────────┐
│ ← Enrichment Dashboard                              │
├─────────────────────────────────────────────────────┤
│                                                     │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────┐│
│  │ 1.247    │ │ 891      │ │ 34       │ │ 12     ││
│  │ Arquivos │ │ Enriquec.│ │ Processnd│ │ Falhas ││
│  └──────────┘ └──────────┘ └──────────┘ └────────┘│
│                                                     │
│  ── Pendentes Revisão (3) ───────────────────────  │
│  ┌─────────────────────────────────────────────┐    │
│  │ ⚠ João Silva (VVD) — possível duplicata     │    │
│  │   de João da Silva (ID 123, 78%)            │    │
│  │   [Confirmar Novo] [Mergear] [Ver Ambos]    │    │
│  └─────────────────────────────────────────────┘    │
│                                                     │
│  ── Processamento em Batch ──────────────────────  │
│  ┌─────────────────────────────────────────────┐    │
│  │ Escopo: [Todos pendentes ▾]                 │    │
│  │ 322 arquivos sem enrichment                 │    │
│  │ [Processar Batch]  [Detectar Pastas Novas]  │    │
│  └─────────────────────────────────────────────┘    │
│                                                     │
│  ── Fila de Processamento ───────────────────────  │
│  ┌─────────────────────────────────────────────┐    │
│  │ ✓ Maria Santos / certidao.pdf     completo  │    │
│  │ ⟳ Pedro Souza / depoimento.mp3   45%       │    │
│  │ ○ Ana Lima / sentenca.pdf         na fila   │    │
│  │ ✗ José Reis / laudo.pdf           falhou    │    │
│  │                              [Retry Falhas] │    │
│  └─────────────────────────────────────────────┘    │
│                                                     │
│  ── Status por Atribuição ───────────────────────  │
│  │ Júri     [████████░░] 82% enriquecido       │    │
│  │ VVD      [██████░░░░] 61%                    │    │
│  │ EP       [███░░░░░░░] 28%                    │    │
│  └─────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────┘
```

**Quatro seções**:
1. **Stats cards** — totais globais de arquivos e status de enrichment
2. **Pendentes revisão** — assistidos criados por drive_sync com possível duplicata
3. **Batch processing** — selecionar escopo e disparar lote + "Detectar Pastas Novas"
4. **Fila** — status em tempo real dos jobs (polling via `enrichment.stats`)
5. **Breakdown** — taxa de enrichment por atribuição

---

## Seção 5: Arquivos a Modificar/Criar

| Arquivo | Mudança | Prioridade |
|---|---|---|
| **Backend** | | |
| `src/lib/services/google-drive.ts` | `handleNewAssistidoFolder()` no `syncIncremental()` | P1 |
| `src/lib/trpc/routers/drive.ts` | Mutation `drive.detectNewFolders` (reverse sync on-demand) | P1 |
| `src/lib/trpc/routers/enrichment.ts` | Mutation `enrichment.batchProcess` + query `enrichment.globalStats` | P1 |
| `src/lib/inngest/functions.ts` | Job `enrichment/process-folder` com concurrency limit | P1 |
| `src/lib/db/schema.ts` | Campos `origemCadastro`, `duplicataSugerida` | P1 |
| `supabase/migrations/` | Migration para novos campos | P1 |
| **Frontend** | | |
| `src/app/(dashboard)/admin/settings/enrichment/page.tsx` | Dashboard global (nova página) | P2 |
| `src/components/enrichment/` | `StatsCards`, `PendentesRevisao`, `BatchPanel`, `FilaProcessamento` | P2 |
| `src/components/drive/DriveStatusBar.tsx` | Botão "Processar Pasta Completa" | P2 |
| `src/components/layouts/admin-sidebar.tsx` | Link + badge pendentes | P3 |

**Ordem de implementação**:
1. Migration + schema (5 min)
2. `handleNewAssistidoFolder()` no syncIncremental (core logic)
3. `drive.detectNewFolders` (reverse sync on-demand para ~126 órfãs)
4. Inngest job de enrichment por pasta
5. Dashboard UI
6. Botão "Processar Pasta" na aba Drive do assistido
