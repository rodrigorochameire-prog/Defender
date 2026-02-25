# Design: Integração Profunda Drive ↔ Assistidos/Processos

> Data: 2026-02-25
> Status: Aprovado
> Escopo: Ciclo fechado — da pasta no Drive até a análise inteligente, com zero fricção

---

## Visão Geral

O sistema atual tem 3 lacunas críticas que tornam a integração Drive frágil:

1. **Lacuna de criação** — Pastas não são criadas automaticamente ao cadastrar assistido/processo
2. **Lacuna de pipeline** — Arquivo novo no Drive não dispara sync/enrichment automaticamente
3. **Lacuna de visibilidade** — Nas páginas de trabalho não há indicação do status da pasta/docs

A solução é um ciclo fechado em 5 camadas:

```
CAMADA 1: Lifecycle Events (CRUD de assistido/processo)
    ↓ auto-cria/move pastas no Drive
CAMADA 2: Webhook Pipeline (arquivo novo no Drive)
    ↓ sync → auto-link → enrich
CAMADA 3: Intelligence Bridge (enrichment → consolidação)
    ↓ badge "X docs novos" → consolidação com 1 clique
CAMADA 4: UI - Header Colapsável (ações rápidas na página)
    ↓ abrir pasta, upload, status sync, últimos arquivos
CAMADA 5: UI - Aba Drive Aprimorada (explorer completo)
    ↓ status de enrichment por arquivo, 3 visualizações, bulk actions
```

---

## Camada 1: Lifecycle Events (CRUD → Drive)

### 1.1 Criar Assistido → Auto-criar Pasta

**Gatilho:** `assistidos.create` mutation quando `atribuicaoPrimaria` presente.

```
1. Assistido inserido no banco (com atribuicaoPrimaria = "JURI_CAMACARI")
2. Pós-insert hook:
   a. Mapeia atribuição → Drive folder ID (JURI → "1_S-2qdqO0n1...")
   b. Normaliza nome para title case
   c. Chama createOrFindAssistidoFolder(atribuicao, nome)
      → Se existe: usa a existente (idempotente)
      → Se não existe: cria via Drive API
   d. Atualiza assistidos.driveFolderId = newFolderId
   e. Registra no driveSyncFolders se não registrada
   f. Dispara sync inicial (Inngest: drive/sync.folder)
```

**Edge cases:**
- Sem atribuição: não cria pasta. Quando atribuição for definida (update), cria nesse momento
- Nome duplicado no Drive: usa pasta existente. Se 2+ homônimas, usa primeira e loga warning
- Atribuição sem pasta raiz configurada: loga erro, não bloqueia cadastro. Aviso na UI
- Drive desconfigurado: ignora. driveFolderId = null
- Erro na API do Drive: retry via Inngest (3x, backoff exponencial)

### 1.2 Criar Processo → Auto-criar Subpasta

**Gatilho:** `processos.create` mutation quando assistido tem `driveFolderId`.

```
1. Processo inserido no banco
2. Se assistido.driveFolderId existe:
   a. Monta nome: "AP 0001234-56.2025.8.05.0039" (prefixo por tipo)
   b. createOrFindProcessoFolder(assistidoFolderId, nomeProcesso)
   c. Cria 5 subpastas padrão (01-Docs, 02-Peças, 03-Decisões, 04-Audiências, 05-Outros)
   d. Atualiza processos.driveFolderId = newFolderId
   e. Sync inicial
3. Se assistido NÃO tem driveFolderId:
   a. Tenta criar pasta do assistido primeiro (cascata)
   b. Se atribuição não definida → marca "pendente"
```

**Edge cases:**
- Processo sem assistido vinculado: não cria pasta. Quando vincular, verifica e cria
- Múltiplos assistidos no processo: usa primeiro assistido (réu principal)
- Processo já tem driveFolderId: idempotente

### 1.3 Alterar Atribuição → Mover Pasta

**Gatilho:** `assistidos.update` quando `atribuicaoPrimaria` muda.

```
1. Detecta mudança: old.atribuicao ≠ new.atribuicao
2. Se driveFolderId existe:
   a. Identifica pasta destino: nova atribuição → novo parentId
   b. API: drive.files.update(addParents=novoPai, removeParents=antigoPai)
   c. Arquivos internos permanecem intactos (Drive move recursivo)
   d. Loga ação: "moved from VVD to JURI"
3. Se driveFolderId NÃO existe:
   a. Cria pasta na nova atribuição
```

**Edge cases:**
- Pasta raiz de destino não existe: loga erro, não move. Aviso na UI
- Permissão negada: retry + alerta admin
- Assistido com processos em atribuições diferentes: move apenas pasta do assistido

### 1.4 Deletar/Arquivar Assistido

Não deleta pasta do Drive. Apenas desvincula (driveFolderId = null). Pasta permanece como arquivo histórico.

---

## Camada 2: Webhook Pipeline (Arquivo Novo → Sync → Link → Enrich)

### 2.1 Detecção via Webhook

**Expansão do handler existente** (`/api/webhooks/drive/route.ts`):

```
1. Google Drive POST → /api/webhooks/drive
2. Handler identifica pasta:
   a. Consulta driveWebhooks por channelId
   b. Mapeia folderId → tipo (DISTRIBUICAO | ATRIBUICAO | ASSISTIDO)
3. Se ATRIBUICAO ou subfolder:
   a. Enfileira Inngest: "drive/sync.folder" { folderId, triggerSource: "webhook" }
   b. Responde 200 OK imediatamente (<10s)
4. Se DISTRIBUICAO: mantém lógica existente
```

**Registro de webhooks expandido:**
```
registerAllAtribuicoes() → registra webhooks no Google Drive para cada pasta:
  POST googleapis.com/drive/v3/files/{folderId}/watch
  channelId único por pasta
  Expiration: 7 dias (renovação via Inngest cron)
```

### 2.2 Sync Incremental (Changes API)

**Melhoria sobre full scan:**

```
1. driveSyncFolders.syncToken armazena pageToken do Google Changes API
2. drive.changes.list(pageToken=lastToken) → APENAS mudanças desde último sync
3. Para cada change:
   - Novo: INSERT no driveFiles
   - Modificado: UPDATE checksum/modTime
   - Deletado: DELETE do driveFiles
4. Atualiza syncToken
5. FALLBACK: Se syncToken expirou (>7 dias), full scan + novo syncToken
```

Resultado: <1s para sync incremental vs. 30-60s para full scan.

### 2.3 Auto-Link por Hierarquia de Pasta

**Link por posição na árvore (não só por regex):**

```
JURI/                              → atribuição detectada
  └── João da Silva/               → assistido (match por driveFolderId)
       └── AP 0001234.../          → processo (match por driveFolderId)
            └── 02 - Peças/        → categoria detectada
                 └── petição.pdf   → auto-link: processoId + assistidoId + categoria
```

**Algoritmo:**
```
Para cada arquivo novo:
  1. Sobe na hierarquia (parentFileId → parent → ...)
  2. Em cada nível:
     - Match por driveFolderId (assistido ou processo)
     - Match por regex CNJ (processo)
  3. Atribui: assistidoId, processoId, categoria
  4. Confidence: HIGH (driveFolderId), MEDIUM (nome/regex), LOW (proximidade)
```

### 2.3.1 Tratamento de Homônimos

```
Quando auto-link por nome encontra 2+ assistidos:
1. NÃO vincula (confidence = "ambiguous")
2. Marca driveFiles.linkStatus = "homonym_pending"
3. Busca desambiguadores:
   - CPF do assistido (se presente no arquivo via enrichment)
   - Nome da mãe (se presente)
   - Número de processo na pasta
4. Se CPF bate: vincula (HIGH)
5. Se nome da mãe bate: vincula (MEDIUM)
6. Se nenhum desambiguador:
   → Notificação para defensor
   → Badge "X pastas com homônimos para conferir"
   → Modal mostra assistidos lado a lado (CPF, mãe, processos)
```

Integra com `homonymia-modal.tsx` existente.

### 2.4 Enrichment Automático Pós-Link

```
1. Auto-link concluído → arquivo tem { processoId, assistidoId }
2. Verifica tipo enriquecível:
   - SIM: PDF, DOCX, Google Doc, imagens (JPG/PNG)
   - NÃO: Pastas, planilhas, vídeos
3. Enfileira Inngest: "intelligence/enrich.document"
   { driveFileId, assistidoId, processoId, fileUrl, mimeType, triggerSource: "auto-sync" }
4. Enrichment Engine:
   a. Download via Drive API
   b. OCR se escaneado (Docling)
   c. Extração com Gemini Flash
   d. Salva resultado
5. Marca driveFiles.enrichmentStatus = "completed"
6. Incrementa contador pending consolidation
```

**Controles:**
- Max 3 enrichments simultâneos (Inngest concurrency)
- Prioridade: assistidos com prazo próximo primeiro
- Retry: 3x com backoff (1min, 5min, 15min)
- Timeout: 5min por arquivo
- Arquivo >50MB: skip com log
- Formato não suportado: `enrichmentStatus = "unsupported"`
- Duplicado (mesmo MD5): skip, linka ao resultado existente

### 2.5 Schema Adicional

```sql
ALTER TABLE drive_files ADD COLUMN enrichment_status varchar(20) DEFAULT 'pending';
-- Valores: pending, processing, completed, failed, unsupported, skipped
ALTER TABLE drive_files ADD COLUMN enrichment_error text;
ALTER TABLE drive_files ADD COLUMN enriched_at timestamp;
ALTER TABLE drive_files ADD COLUMN categoria varchar(50);
-- Valores: documentos_pessoais, pecas_protocoladas, decisoes_sentencas, audiencias, outros
```

---

## Camada 3: Intelligence Bridge (Enrichment → Consolidação)

### 3.1 Contador de Docs Pendentes

```
getPendingEnrichments({ assistidoId | processoId })
  → driveFiles WHERE:
    - assistidoId = X
    - enrichmentStatus = 'completed'
    - enrichedAt > assistidos.analyzedAt
  → Retorna: { totalDocs, enrichedDocs, pendingCount, lastEnrichedAt }
```

**Visibilidade:**
- Badge na aba Inteligência: "5 novos"
- Badge no header colapsável: "23 docs · 5 novos"
- Banner: "5 documentos analisados desde última consolidação. Clique Reanalisar."

### 3.2 Consolidação Incremental

```
generateForAssistido({ assistidoId }):
  Se analysisVersion > 0:
    a. Busca apenas docs com enrichedAt > analyzedAt
    b. Envia para consolidation engine com:
       - resumo_anterior
       - novos_documentos
       - instrução: "Atualize incorporando novos documentos"
    c. Engine retorna delta (merge com análise anterior)
    d. Incrementa analysisVersion

  Se analysisVersion = 0:
    a. Processa todos os docs (comportamento atual)
    b. analysisVersion = 1
```

Resultado: 2min → ~20s para análises incrementais.

### 3.3 Auto-Consolidação (Inngest)

```
Se analysisVersion > 0 (já analisado)
  E pendingCount >= 3 (3+ docs novos)
  → Inngest: "intelligence/consolidate" { mode: "incremental" }
  → Auto-consolida em background
  → Notifica: "Análise atualizada com 3 novos docs"
```

Threshold configurável (default: 3 docs).

### 3.4 Status Badge System

| Estado | Badge | Cor |
|--------|-------|-----|
| Sem pasta | "Sem pasta" | zinc-400 |
| Pasta vazia | "0 docs" | zinc-400 |
| Docs pendentes | "12 docs" | zinc-600 |
| Enriquecendo | "3/12 analisando" | amber-500 |
| Pronto p/ consolidar | "5 novos" | emerald-500 |
| Consolidado | "Atualizado" | emerald-600 |
| Erro | "2 erros" | rose-500 |

---

## Camada 4: UI — Header Colapsável (DriveStatusBar)

### 4.1 Estado Colapsado (1 linha, ~40px)

```
┌──────────────────────────────────────────────────────────────────┐
│ 📂 JURI · 23 docs · Último sync 2min   [🔄 Sync] [📤 Upload] [▼] │
└──────────────────────────────────────────────────────────────────┘
```

Elementos:
- Ícone pasta: cor da atribuição. Clicável → abre Drive
- Atribuição: label curta (JURI, VVD, EP, SUBST). 10px uppercase
- Contagem: "23 docs" (não-pastas)
- Badge novos: "🧠 5 novos" emerald (se houver)
- Último sync: "2min", "Ontem", "Nunca". Amber se >24h
- Botão Sync: loading spinner durante sync
- Botão Upload: file picker nativo → upload para pasta
- Botão Expandir: chevron toggle

**Se sem pasta vinculada:**
```
┌──────────────────────────────────────────────────────────────────┐
│ 📁 Nenhuma pasta vinculada   [🔗 Vincular] [➕ Criar Pasta]      │
└──────────────────────────────────────────────────────────────────┘
```

### 4.2 Estado Expandido (~200px panel)

```
┌──────────────────────────────────────────────────────────────────┐
│ 📂 JURI · 23 docs · Último sync 2min   [🔄] [📤] [▲]           │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Últimos arquivos adicionados:                                  │
│  📄 Petição Inicial.pdf           Hoje 14:32  🔗                │
│  📄 Laudo Pericial INSS.pdf       Ontem 09:15  🔗               │
│  📄 Decisão Interlocutória.docx   22/02 16:00  🔗               │
│                                                                  │
│  Status: 📊 23 total · ✅ 18 analisados · ⏳ 3 · ⚠️ 2          │
│                                                                  │
│  Processos com pasta:                                           │
│  AP 0001234-56.2025 · 8 docs  📂                               │
│  EP 0009876-43.2024 · 15 docs 📂                               │
└──────────────────────────────────────────────────────────────────┘
```

### 4.3 Variante Processo

**Colapsado:**
```
┌──────────────────────────────────────────────────────────────────┐
│ 📂 AP 0001234-56 · 8 docs · 3 novos   [🔄] [📤] [▼]            │
└──────────────────────────────────────────────────────────────────┘
```

**Expandido:** mostra subpastas com contagem:
```
├── 01 - Documentos Pessoais     3 docs
├── 02 - Peças Protocoladas      2 docs
├── 03 - Decisões e Sentenças    1 doc
├── 04 - Audiências              0 docs
└── 05 - Outros                  2 docs
```

### 4.4 Upload via Drag & Drop

Header expandido suporta drag & drop:
- Drop zone visual: "Soltar para enviar"
- Se processo com subpastas: mini modal para escolher destino
- Checkbox "Analisar automaticamente" (default: on)
- Barra de progresso + feedback de sucesso

### 4.5 Mobile (<768px)

```
┌────────────────────────────────┐
│ 📂 JURI · 23 docs             │
│ 🧠 5 novos · Sync 2min       │
│ [🔄] [📤] [🔗 Drive] [▼]    │
└────────────────────────────────┘
```

2 linhas, botões compactados (só ícones).

---

## Camada 5: Aba Drive Aprimorada

### 5.1 Layout Geral

```
┌──────────────────────────────────────────────────────────────┐
│  [🌲 Árvore]  [📅 Timeline]  [📊 Por Status]   🔍 Buscar   │
├──────────────────────────────────────────────────────────────┤
│  (conteúdo da visualização selecionada)                     │
├──────────────────────────────────────────────────────────────┤
│  [📤 Upload] [🔄 Sincronizar] [📥 Download Selecionados]    │
└──────────────────────────────────────────────────────────────┘
```

### 5.2 Árvore (SubpastaExplorer melhorado)

Por arquivo, adiciona:
- Ícone enrichment: ✅ completed, ⏳ processing, ❌ failed, ⚪ pending, 🚫 unsupported
- Tooltip com detalhes (tipo doc, confidence, erro)
- Mini-preview on hover (card flutuante)

Ações por arquivo (menu ⋮):
- Abrir no Drive, Re-analisar, Vincular/desvincular, Mover, Download

Ações por pasta:
- Abrir no Drive, Upload, Sincronizar, Criar subpasta

### 5.3 Timeline (Aprimorada)

```
── Fevereiro 2026 (5 docs) ──────────────────
  25/02  📄 Petição.pdf      ✅ Petição     AP 0001234
  24/02  📄 Laudo.pdf        ✅ Laudo       AP 0001234
```

Novo: tipo documento, processo vinculado, filtros por tipo e processo.

### 5.4 Por Status (Nova visualização)

```
⏳ Processando (2)
  └── Laudo.pdf · Iniciado há 30s
❌ Com Erro (1)
  └── Foto.jpg · "Timeout" · [🔄 Retry]
⚪ Na Fila (3)
✅ Analisados (18) (colapsado)
🚫 Não Suportados (2)
```

Ações bulk: retry todos, analisar pendentes, consolidar agora.

### 5.5 Busca Integrada

Busca em: nome do arquivo, conteúdo extraído, tipo de documento, entidades extraídas.
Resultado: lista unificada com highlight e contexto.

### 5.6 Upload Modal

```
┌──────────────────────────────────────┐
│  📤 Upload de Documentos             │
│  Destino: [02 - Peças Protocoladas ▾]│
│  [Drag & drop ou clique]            │
│  ☑️ Analisar automaticamente         │
│  [Cancelar]          [📤 Enviar]     │
└──────────────────────────────────────┘
```

---

## Schema Changes (Migração)

```sql
-- Novos campos em drive_files
ALTER TABLE drive_files ADD COLUMN enrichment_status varchar(20) DEFAULT 'pending';
ALTER TABLE drive_files ADD COLUMN enrichment_error text;
ALTER TABLE drive_files ADD COLUMN enriched_at timestamp;
ALTER TABLE drive_files ADD COLUMN categoria varchar(50);

-- Índices
CREATE INDEX drive_files_enrichment_status_idx ON drive_files (enrichment_status);
CREATE INDEX drive_files_enriched_at_idx ON drive_files (enriched_at);
```

---

## Arquivos a Criar/Modificar

### Novos Arquivos

| Arquivo | Camada | Descrição |
|---------|--------|-----------|
| `src/components/drive/DriveStatusBar.tsx` | 4 | Header colapsável |
| `src/components/drive/DriveStatusBarExpanded.tsx` | 4 | Painel expandido |
| `src/components/drive/DriveTabEnhanced.tsx` | 5 | Container da aba Drive com 3 views |
| `src/components/drive/DriveTreeView.tsx` | 5 | Árvore aprimorada com enrichment status |
| `src/components/drive/DriveTimelineView.tsx` | 5 | Timeline com tipo doc e filtros |
| `src/components/drive/DriveStatusView.tsx` | 5 | Agrupamento por status de enrichment |
| `src/components/drive/DriveSearchBar.tsx` | 5 | Busca integrada |
| `src/components/drive/DriveUploadModal.tsx` | 5 | Modal de upload com destino e auto-enrich |
| `src/components/drive/FolderLinkModal.tsx` | 4 | Modal para vincular pasta existente |
| `src/lib/inngest/functions/drive-lifecycle.ts` | 1 | Funções Inngest para lifecycle |
| `src/lib/inngest/functions/drive-webhook-renewal.ts` | 2 | Cron de renovação de webhooks |

### Arquivos Modificados

| Arquivo | Camada | Mudança |
|---------|--------|---------|
| `src/lib/db/schema.ts` | 2 | +4 colunas em driveFiles |
| `src/lib/trpc/routers/assistidos.ts` | 1 | Hook pós-create/update para Drive |
| `src/lib/trpc/routers/processos.ts` | 1 | Hook pós-create para Drive |
| `src/lib/trpc/routers/drive.ts` | 1,2 | Novos endpoints (createFolderForAssistido, etc.) |
| `src/lib/trpc/routers/intelligence.ts` | 3 | Consolidação incremental |
| `src/lib/services/google-drive.ts` | 1,2 | Sync incremental, move folder, auto-link hierárquico |
| `src/lib/services/enrichment-client.ts` | 2 | Trigger auto-enrichment |
| `src/lib/inngest/client.ts` | 1,2 | Novos eventos (drive/create.folder, drive/move.folder) |
| `src/lib/inngest/functions.ts` | 2 | Expandir webhook handler |
| `src/app/api/webhooks/drive/route.ts` | 2 | Expandir para todas as atribuições |
| `src/app/(dashboard)/admin/assistidos/[id]/page.tsx` | 4,5 | Integrar DriveStatusBar + DriveTabEnhanced |
| `src/app/(dashboard)/admin/processos/[id]/page.tsx` | 4,5 | Integrar DriveStatusBar + DriveTabEnhanced |
| `src/components/intelligence/IntelligenceTab.tsx` | 3 | Badge pendingCount atualizado |

---

## Sequência de Implementação

### Fase A: Schema + Backend (Camada 1 + 2)

1. **A1**: Migration — adicionar 4 colunas em driveFiles
2. **A2**: google-drive.ts — sync incremental (Changes API), moveFolder(), auto-link hierárquico
3. **A3**: drive.ts router — novos endpoints (createFolderForAssistido, moveFolderOnAtribuicaoChange, etc.)
4. **A4**: assistidos.ts router — hook pós-create/update para auto-criar/mover pasta
5. **A5**: processos.ts router — hook pós-create para auto-criar subpasta
6. **A6**: webhook handler — expandir para todas atribuições
7. **A7**: Inngest functions — lifecycle events + auto-enrichment trigger + webhook renewal cron
8. **A8**: intelligence.ts — consolidação incremental com delta

### Fase B: UI Components (Camada 4 + 5)

9. **B1**: DriveStatusBar.tsx — header colapsável/expandido
10. **B2**: FolderLinkModal.tsx — modal vincular pasta
11. **B3**: DriveUploadModal.tsx — modal upload com destino
12. **B4**: DriveTreeView.tsx — árvore com enrichment status
13. **B5**: DriveTimelineView.tsx — timeline com tipo doc e filtros
14. **B6**: DriveStatusView.tsx — agrupamento por status
15. **B7**: DriveSearchBar.tsx — busca integrada
16. **B8**: DriveTabEnhanced.tsx — container com 3 views + toolbar

### Fase C: Integração nas Páginas

17. **C1**: assistidos/[id]/page.tsx — integrar DriveStatusBar + DriveTabEnhanced
18. **C2**: processos/[id]/page.tsx — integrar DriveStatusBar + DriveTabEnhanced
19. **C3**: IntelligenceTab.tsx — badge pendingCount atualizado

### Fase D: Refinamento

20. **D1**: Homônimos — integrar com homonymia-modal existente
21. **D2**: Mobile responsiveness — DriveStatusBar mobile
22. **D3**: Drag & drop upload no header expandido
23. **D4**: Testes E2E — fluxo completo de lifecycle

---

## Verificação

1. **Criar assistido com atribuição** → pasta criada automaticamente no Drive
2. **Criar processo** → subpasta criada com 5 subpastas padrão
3. **Mudar atribuição** → pasta movida no Drive
4. **Adicionar arquivo no Drive** → webhook → sync → auto-link → enrich
5. **Header colapsável** → mostra status, docs, último sync
6. **Header expandido** → últimos arquivos, status enrichment, processos
7. **Aba Drive** → 3 visualizações funcionais com busca e filtros
8. **Upload** → modal com destino + auto-enrich
9. **Aba Inteligência** → badge "X novos" atualizado + consolidação incremental
10. **Homônimos** → detecção + modal de resolução com CPF/nome da mãe
11. **Mobile** → DriveStatusBar compacto, responsivo
