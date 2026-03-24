# WhatsApp Command Center — Design Spec

> Redesign completo do módulo WhatsApp do OMBUDS para transformar o chat em centro de operações jurídicas.

**Data**: 2026-03-23
**Status**: Aprovado
**Abordagem**: Híbrido — Context Sidebar + Command Bar + Message Actions

---

## 1. Visão Geral

O chat WhatsApp atual funciona como mensageiro isolado. Não há conexão com processos, Drive, anotações ou prazos. O defensor precisa copiar dados manualmente e alternar entre múltiplas abas.

O redesign transforma o chat em um **centro de operações** com 6 capacidades:

| # | Capacidade | Prioridade |
|---|-----------|-----------|
| 1 | Painel Contextual (sidebar direita) | P0 |
| 2 | Ações rápidas nas mensagens (hover bar) | P0 |
| 3 | Slash commands no input | P1 |
| 4 | Tempo real e estabilidade | P1 |
| 5 | Ordenação e busca | P1 |
| 6 | Fluxo mensagem → OMBUDS/Drive | P0 |

---

## 2. Arquitetura de Layout

Layout 3 colunas (desktop):

```
┌──────────────┬────────────────────────┬───────────────────┐
│ Conversas    │     Chat Central       │  Painel Contexto  │
│ (240px)      │     (flex-1)           │  (280px)          │
│              │                        │                   │
│ [Busca]      │  Header: nome+vínculo  │  [Processo|Drive|  │
│ Contato ●🔴  │  Mensagens scrolláveis │   Mídia]          │
│ Contato      │  Input + /commands     │                   │
│ Contato      │                        │  Cards contextuais│
└──────────────┴────────────────────────┴───────────────────┘
```

**Mobile (< 768px)**: layout single-column. Painel contextual vira bottom sheet via botão no header.

### Arquivos envolvidos

| Arquivo atual | Linhas | Ação |
|--------------|--------|------|
| `src/app/(dashboard)/admin/whatsapp/chat/page.tsx` | 481 | Refatorar layout 3 colunas |
| `src/components/whatsapp/ChatWindow.tsx` | 1068 | Quebrar em sub-componentes |
| `src/components/whatsapp/ConversationList.tsx` | 712 | Adicionar busca global, badges |
| `src/components/whatsapp/MessageBubble.tsx` | 350 | Adicionar hover actions |
| `src/components/whatsapp/ContactDetailsPanel.tsx` | 606 | Evoluir para ContextPanel com abas |
| `src/components/whatsapp/ConnectionStatus.tsx` | 304 | Adicionar reconexão automática |
| `src/components/whatsapp/SlashCommandMenu.tsx` | 111 | Expandir comandos |
| `src/lib/trpc/routers/whatsapp-chat.ts` | 2368 | Novos endpoints |

---

## 3. Seção: Painel Contextual (Sidebar Direita)

### 3.1 Comportamento

- Aparece automaticamente quando o contato selecionado está vinculado a um assistido
- Toggle via botão `PanelRight` no header do chat
- Persiste estado aberto/fechado em `localStorage`
- Mobile: bottom sheet com drag handle

### 3.2 Abas

**Aba Processo** (default quando vinculado):
- Card "Processo Ativo": número, vara, crime (dados de `processos` via `assistidos_processos`)
- Card "Próxima Audiência": data, tipo, contagem regressiva (border-left amber)
- Card "Prazo Aberto": vencimento, tipo (border-left red quando < 7 dias)
- Card "Última Movimentação": tipo, data, fonte (PJe/manual)
- Botões de ação rápida: Anexar ao processo, Anotar, Abrir processo

**Aba Drive**:
- Lista dos últimos 10 arquivos do assistido no Drive OMBUDS (`drive_files` filtrado por `assistidoId`)
- Botão "Enviar arquivo do chat para cá" (drag & drop futuro)
- Upload direto para pasta do assistido
- Preview de arquivo inline (PDF, imagem)

**Aba Mídia**:
- Galeria de todos arquivos da conversa (fotos, docs, áudios)
- Filtro por tipo: Imagem | Documento | Áudio | Todos
- Ação em lote: "Salvar tudo no Drive"
- Thumb grid para imagens, lista para docs/áudios

### 3.3 Novo componente

```
src/components/whatsapp/ContextPanel.tsx (novo)
├── ContextPanelProcesso.tsx
├── ContextPanelDrive.tsx
└── ContextPanelMidia.tsx
```

### 3.4 Dados necessários (tRPC)

```typescript
// Novo endpoint
whatsappChat.getContactContext
  Input: { contactId: number }
  Output: {
    assistido: { id, nome, cpf } | null
    processoAtivo: { id, numero, vara, crime } | null
    proximaAudiencia: { id, data, tipo, diasRestantes } | null
    prazoAberto: { id, tipo, vencimento, diasRestantes } | null
    ultimaMovimentacao: { tipo, data, fonte } | null
    driveFiles: { id, nome, tipo, tamanho, updatedAt }[]
    midiaChat: { type, count }[]
  }
```

---

## 4. Seção: Ações Rápidas nas Mensagens

### 4.1 Hover Bar

Barra flutuante que aparece no canto superior direito da mensagem ao hover (desktop) ou long-press (mobile).

**Ações primárias** (ícones sempre visíveis):

| Ícone Lucide | Ação | Cor | Comportamento |
|-------------|------|-----|---------------|
| `FileUp` | Salvar no Processo | emerald-500 | Modal: seleciona processo, tipo (doc/anotação/evidência), observação |
| `PenLine` | Criar Anotação | amber-500 | Modal: texto pré-preenchido, vincula a processo/assistido |
| `FolderUp` | Salvar no Drive | indigo-500 | Modal: pasta pré-selecionada (assistido), opção renomear |
| `Star` | Favoritar | zinc-400 → amber-400 | Toggle inline, sem modal |
| `MoreHorizontal` | Mais | zinc-400 | Dropdown |

**Dropdown "Mais ações"**:
- `Copy` — Copiar texto
- `Forward` — Encaminhar (futuro)
- `MessageSquareReply` — Responder citando
- `Info` — Detalhes da mensagem (timestamp, status, waMessageId)

### 4.2 Estilo

```css
/* Hover bar */
opacity: 0 → 1, transition: 150ms ease
background: zinc-800, border: zinc-700
border-radius: 8px, padding: 4px
box-shadow: 0 4px 12px rgba(0,0,0,0.4)

/* Ícones: 30x30 touch target, 15x15 svg */
```

### 4.3 Implementação

Modificar `MessageBubble.tsx`:
- Adicionar `onSaveToProcess`, `onCreateNote`, `onSaveToDrive`, `onFavorite` callbacks
- Estado hover via `useState` + `onMouseEnter`/`onMouseLeave`
- Render condicional da barra

Novos modais em `MessageActionModals.tsx`:
- `SaveToProcessModal` — select processo, tipo, observação
- `CreateNoteModal` — textarea pré-preenchida, select processo
- `SaveToDriveModal` — file browser com pasta pré-selecionada

### 4.4 Endpoints tRPC

```typescript
// Salvar mensagem como documento/anotação no processo
whatsappChat.saveMessageToProcess
  Input: { messageId: number, processoId: number, tipo: 'documento' | 'anotacao' | 'evidencia', observacao?: string }

// Criar anotação a partir de mensagem
whatsappChat.createNoteFromMessage
  Input: { messageId: number, processoId?: number, assistidoId?: number, texto: string }

// Salvar arquivo do chat no Drive
whatsappChat.saveMediaToDrive
  Input: { messageId: number, assistidoId: number, pasta?: string, nomeArquivo?: string }
```

---

## 5. Seção: Slash Commands

### 5.1 Comandos disponíveis

| Comando | Ação | Output |
|---------|------|--------|
| `/nota [texto]` | Cria anotação no processo ativo do assistido | Toast confirmação + link |
| `/prazo` | Lista prazos abertos do assistido vinculado | Inline card no chat (client-only) |
| `/audiencia` | Mostra próxima audiência | Inline card no chat |
| `/processo` | Abre o processo em nova aba | `window.open()` |
| `/drive` | Lista 5 últimos arquivos do Drive do assistido | Inline cards |
| `/modelo [nome]` | Envia template de mensagem pré-configurado | Preenche input |

### 5.2 Implementação

Expandir `SlashCommandMenu.tsx` (atualmente 111 linhas):
- Filtro fuzzy enquanto digita (match por nome e descrição)
- Navegação por ↑↓ + Enter
- Esc para cancelar
- Preview do comando selecionado (description)

### 5.3 Endpoint

```typescript
// Já existem endpoints para templates.
// Novos para contexto:
whatsappChat.getQuickContext
  Input: { contactId: number, tipo: 'prazos' | 'audiencias' | 'drive' }
  Output: depende do tipo
```

---

## 6. Seção: Tempo Real e Estabilidade

### 6.1 Polling automático

```typescript
// Chat ativo: poll a cada 5s
trpc.whatsappChat.listMessages.useQuery(
  { contactId, configId, limit: 50 },
  { refetchInterval: 5000, enabled: !!contactId }
);

// Lista de conversas: poll a cada 15s
trpc.whatsappChat.listContacts.useQuery(
  { configId },
  { refetchInterval: 15000 }
);
```

### 6.2 Badge de não lidas

No `ConversationList.tsx`:
- Cada contato mostra badge verde com contagem de não lidas (campo `unreadCount` já existe)
- Atualiza via polling
- Total de não lidas no header da página

### 6.3 Status de conexão

No header do chat, indicador visual:

| Estado | Cor | Ícone Lucide | Texto |
|--------|-----|-------------|-------|
| Conectado | emerald-500 | `Wifi` | "Conectado" |
| Reconectando | amber-500 | `WifiOff` (pulse) | "Reconectando..." |
| Desconectado | red-500 | `WifiOff` | "Desconectado" |

### 6.4 Banner de desconexão

Quando status = desconectado por > 30s:
- Banner fixo no topo do chat: "Conexão perdida. [Reconectar]"
- Botão chama `whatsappChat.restartInstance`
- Banner some automaticamente quando reconecta

### 6.5 Auto-scroll e notificação de novas mensagens

- Novas mensagens: auto-scroll para o final (se já estava no final)
- Se o user scrollou para cima: botão flutuante "↓ N novas mensagens"
- Componente `ScrollToBottom.tsx` já existe (35 linhas) — expandir

### 6.6 Notificação sonora (opt-in)

- `user_settings.whatsapp_notification_sound` (boolean, default false)
- Usa `new Audio('/sounds/notification.mp3')` no polling quando detecta mensagem nova
- Browser Notification API como fallback quando aba não está focada

---

## 7. Seção: Ordenação e Busca

### 7.1 Ordenação de mensagens

Toggle no header do chat:
- "Mais recentes primeiro" (default — DESC) ← **nova opção**
- "Mais antigas primeiro" (ASC — comportamento atual)
- Armazenado em `localStorage: whatsapp_msg_order`

**Endpoint**: adicionar parâmetro `orderBy: 'asc' | 'desc'` em `whatsappChat.listMessages`

### 7.2 Busca global (lista de conversas)

No `ConversationList.tsx`:
- Campo de busca no topo (já existe parcialmente)
- Filtra por: nome do contato, telefone, texto da última mensagem
- Debounce 300ms
- Highlight do match

### 7.3 Busca dentro do chat

No header do `ChatWindow.tsx`:
- Botão `Search` abre input inline
- Backend: `whatsappChat.searchMessages({ contactId, query, configId })`
- Frontend: destaca matches com `<mark>`, navega com ↑↓
- Contador: "3 de 15 resultados"

### 7.4 Filtro por data

- Botão `Calendar` no header → date picker
- Ao selecionar data, scroll para primeira mensagem daquele dia
- Endpoint: `whatsappChat.listMessages` com parâmetro `fromDate`

### 7.5 Filtro por tipo de conteúdo

Chips no header do chat (ou na aba Mídia do painel):
- Todos | Texto | Mídia | Documentos | Áudio
- Filtro client-side para performance (mensagens já carregadas)
- Para busca exaustiva: parâmetro `type` no endpoint

---

## 8. Seção: Fluxo Mensagem → OMBUDS/Drive

Este é o fluxo completo que conecta as seções anteriores:

### 8.1 Salvar mensagem no processo

```
Hover msg → FileUp → Modal "Salvar no Processo"
├── Processo: [dropdown com processos do assistido, ativo pré-selecionado]
├── Tipo: [Documento | Anotação | Evidência]
├── Observação: [textarea opcional]
└── [Cancelar] [Salvar]

→ Backend: cria registro em `anotacoes` ou `documentos` vinculado ao processo
→ Toast: "Salvo no processo 0500123-45.2025"
```

### 8.2 Criar anotação

```
Hover msg → PenLine → Modal "Criar Anotação"
├── Texto: [textarea, pré-preenchido com conteúdo da msg]
├── Processo: [dropdown, opcional]
├── Assistido: [pré-selecionado]
└── [Cancelar] [Criar]

→ Backend: insere em `anotacoes`
→ Toast: "Anotação criada"
```

### 8.3 Salvar arquivo no Drive

```
Hover msg (com arquivo) → FolderUp → Modal "Salvar no Drive"
├── Arquivo: comprovante_residencia.pdf (245 KB)
├── Pasta: [Assistidos / Maria Silva / Documentos] (pré-selecionado)
├── Renomear: [input editável]
└── [Cancelar] [Salvar]

→ Backend: download do mediaUrl → upload para Drive OMBUDS
→ Toast: "Salvo no Drive" com link direto
```

### 8.4 Ação em lote (aba Mídia)

```
Painel → Aba Mídia → Selecionar múltiplos → "Salvar no Drive"
├── N arquivos selecionados
├── Pasta destino: [browser]
└── [Cancelar] [Salvar Todos]

→ Backend: batch upload
→ Progresso: N/M arquivos salvos
→ Toast: "5 arquivos salvos no Drive"
```

---

## 9. Schema Changes

### 9.1 Novas colunas

```sql
-- Marcar mensagens favoritas
ALTER TABLE whatsapp_chat_messages ADD COLUMN is_favorite boolean DEFAULT false;

-- Marcar mensagens salvas no processo
ALTER TABLE whatsapp_chat_messages ADD COLUMN saved_to_process_id integer REFERENCES processos(id);
ALTER TABLE whatsapp_chat_messages ADD COLUMN saved_to_drive boolean DEFAULT false;
```

### 9.2 Novos índices

```sql
CREATE INDEX whatsapp_chat_messages_is_favorite_idx ON whatsapp_chat_messages(is_favorite) WHERE is_favorite = true;
CREATE INDEX whatsapp_chat_messages_saved_process_idx ON whatsapp_chat_messages(saved_to_process_id) WHERE saved_to_process_id IS NOT NULL;
```

---

## 10. Design System (Padrão Defender)

Todas as novas interfaces seguem:

- **Cores**: zinc-900/800 backgrounds, emerald-500 ações primárias, amber-500 avisos, red-500 urgência, indigo-500 Drive
- **Ícones**: Lucide React (nunca emoji)
- **Tipografia**: `font-mono` para números de processo
- **Loading**: `animate-pulse` skeletons
- **Interação**: `cursor-pointer` em clicáveis, hover transitions 150-300ms
- **Contraste**: WCAG AA (4.5:1 mínimo)
- **Focus states**: visíveis para navegação por teclado
- **Responsivo**: 375px, 768px, 1024px, 1440px
- **`prefers-reduced-motion`**: respeitado em todas as animações

---

## 11. Fora de Escopo (YAGNI)

- Chamadas de voz/vídeo pelo OMBUDS
- Chatbot automático / respostas automáticas com IA
- Integração com outros mensageiros (Telegram, SMS)
- Edição de mensagens já enviadas
- Reações em mensagens (emoji reactions)
- Grupos do WhatsApp (apenas conversas individuais)
- Criptografia end-to-end adicional (já garantida pelo WhatsApp)

---

## 12. Dependências

- Evolution API v2.3.7 funcionando no Railway
- Número migrado do celular para Evolution API (OTP por ligação)
- Drive OMBUDS configurado (`drive_files`, `drive_sync_folders`)
- Contatos vinculados a assistidos (`whatsapp_contacts.assistidoId`)
