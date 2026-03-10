# WhatsApp Defender — Fase 2: Integração com o Caso

**Data:** 2026-03-10
**Status:** Aprovado
**Pré-requisito:** Fase 1 concluída (commit d847adc)

## Escopo

3 ações no modo seleção + envio de arquivos:

1. **Modo Seleção de Mensagens** — checkboxes + barra flutuante
2. **Salvar no Caso** — recorte de mensagens → anotação no assistido
3. **Salvar no Drive** — mídias selecionadas → pasta do assistido no Google Drive
4. **Resumo IA** — mensagens selecionadas → resumo estruturado via enrichment engine
5. **Envio de Arquivos** — botão de anexo (Do Drive / Do computador)

---

## 1. Modo Seleção de Mensagens

**Ativação:** Botão "Selecionar" (CheckSquare icon) no header do ChatWindow.

**Comportamento:**
- State `isSelectionMode: boolean` controla a UI
- Checkboxes circulares à esquerda de cada mensagem
- Click na mensagem ou checkbox seleciona/deseleciona
- State `selectedMessageIds: Set<string>` guarda IDs
- **Barra flutuante** fixa no topo (substitui header):
  - `✕ [N] selecionadas`
  - 3 botões: `Salvar no Caso` | `Salvar no Drive` | `Resumo IA`
  - "Salvar no Drive" só ativo quando há mídia na seleção
  - "Salvar no Caso" e "Resumo IA" requerem contato vinculado a assistido

**Saída:** Click no ✕, ESC, ou após ação com sucesso.

---

## 2. Salvar no Caso

**Schema:** Adicionar campo `metadata` (JSONB, nullable) à tabela `anotacoes` existente.

**Novos tipos de anotação:**
- `whatsapp_recorte` — recorte de mensagens
- `whatsapp_resumo_ia` — resumo gerado por IA

**Metadata para `whatsapp_recorte`:**
```json
{
  "contactId": 123,
  "contactName": "Maria Silva",
  "contactPhone": "5571999...",
  "contactRelation": "familiar",
  "contactRelationDetail": "Mãe do assistido",
  "messageCount": 5,
  "messageIds": ["msg1", "msg2"],
  "dateRange": { "from": "2026-03-10T14:02:00", "to": "2026-03-10T14:07:00" },
  "hasMedia": true
}
```

**Formato do conteúdo:**
```
[10/03/2026 14:02] Maria (familiar - Mãe do assistido):
Boa tarde, preciso de ajuda

[10/03/2026 14:03] Defensor:
Pode me contar o que aconteceu?
```

**Fluxo:**
1. Seleciona mensagens → clica "Salvar no Caso"
2. Contato não vinculado → toast "Vincule a um assistido primeiro"
3. Vinculado → modal preview do recorte
4. Confirma → `anotacoes.insert()`
5. Toast sucesso com link "Ver anotação"

**tRPC:** `whatsappChat.saveToCase({ contactId, messageIds[] })`

---

## 3. Salvar no Drive

**Fluxo:**
1. Seleciona mensagens com mídia → "Salvar no Drive"
2. Filtra mensagens `type != 'text'`
3. Sem mídia → toast "Nenhuma mídia selecionada"
4. Sem assistido → toast "Vincule a um assistido primeiro"
5. Modal: lista mídias + destino `[Assistido]/[Processo]/05 - Outros`
6. Sem pasta → cria via `createOrFindAssistidoFolder`
7. Progresso N/total
8. Toast "3 arquivos salvos no Drive"

**Backend (`whatsappChat.saveMediaToDrive`):**
1. Busca mensagens, filtra mídia
2. Resolve pasta do assistido (cria se necessário)
3. Para cada mídia:
   - Baixa via `mediaUrl` (fallback: Evolution `/chat/getBase64FromMediaMessage`)
   - Renomeia: `WhatsApp_YYYY-MM-DD_HH-mm_[tipo].[ext]`
   - Upload via `uploadFileBuffer`
   - Registra em `driveFiles` com link ao assistido
4. Retorna lista de arquivos

---

## 4. Resumo IA

**Fluxo:**
1. Seleciona mensagens → "Resumo IA"
2. Sem assistido → toast "Vincule primeiro"
3. Modal spinner "Gerando resumo..."
4. Retorna resumo estruturado editável:
   - Fatos relatados (bullets)
   - Pedidos/demandas (bullets)
   - Providências necessárias (bullets)
5. "Salvar como anotação" → `anotacoes` tipo `whatsapp_resumo_ia`

**Backend (`whatsappChat.generateSummary`):**
1. Formata mensagens com timestamps e direção
2. Monta contexto (assistido, interlocutor, processo)
3. Chama enrichment engine `POST /api/summarize-chat`
4. Retorna resumo estruturado

**Enrichment engine:** Novo endpoint `/api/summarize-chat` (FastAPI + Claude Sonnet).

**Metadata para `whatsapp_resumo_ia`:**
```json
{
  "contactId": 123,
  "contactName": "Maria Silva",
  "contactRelation": "familiar",
  "messageCount": 12,
  "dateRange": { "from": "...", "to": "..." },
  "model": "claude-sonnet-4-6",
  "editedByUser": true
}
```

---

## 5. Envio de Arquivos

**UI:** Botão Paperclip à esquerda do input. Dropdown:
- **Do Drive** (FolderOpen) → file picker
- **Do computador** (Upload) → file input nativo

### Do Drive:
1. Modal com navegação de pastas (versão simplificada do DriveContentArea)
2. Contato vinculado → abre na pasta do assistido
3. Seleciona → baixa via `downloadFileContent(fileId)`
4. Detecta tipo → envia via Evolution API
5. Cria registro em `whatsappChatMessages`

### Do computador:
1. File input aceita `image/*,application/pdf,audio/*,video/*,.doc,.docx`
2. Upload para servidor → envia via Evolution API
3. Cria registro em `whatsappChatMessages`

**Limite:** 16MB (Evolution API).

**Componentes novos:**
- `AttachmentMenu.tsx` — dropdown com opções
- `DriveFilePicker.tsx` — file picker simplificado do Drive

---

## Mudanças no Schema

### Alteração: tabela `anotacoes`
- Adicionar `metadata` (JSONB, nullable)

### Sem novas tabelas

---

## Ordem de Implementação

### Step 1 — Schema + Backend base
- Migration: adicionar `metadata` JSONB à `anotacoes`
- Mutation `saveToCase`
- Mutation `saveMediaToDrive`

### Step 2 — Modo Seleção UI
- State management no ChatWindow
- Checkboxes nas mensagens
- Barra flutuante com 3 ações

### Step 3 — Salvar no Caso (UI + integração)
- Modal de preview do recorte
- Integração com mutation
- Toast + link

### Step 4 — Salvar no Drive (UI + integração)
- Modal de confirmação com lista de mídias
- Progresso de upload
- Integração com mutation

### Step 5 — Resumo IA
- Endpoint no enrichment engine
- Mutation `generateSummary`
- Modal editável + salvar

### Step 6 — Envio de Arquivos
- AttachmentMenu.tsx
- DriveFilePicker.tsx (simplificado)
- Upload do computador
- Integração com Evolution API send

### Step 7 — Extrair Dados (Fase 3, disabled)
- Botão "Extrair Dados" disabled na barra com tooltip "Em breve"
