# WhatsApp Redesign — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Redesign completo da UI do WhatsApp no Ombuds para parecer com WhatsApp Desktop/Mobile — cores, bolhas com tail, ticks de leitura, preview de mensagem na lista, timestamps no padrão WhatsApp, indicador de digitando, player de áudio estilizado, e fundo texturizado.

**Architecture:** Refactor dos 3 componentes visuais principais (ConversationList, MessageBubble, ChatWindow) + página de chat. Manter toda a lógica de negócio/tRPC intacta, apenas alterar o visual. Cores do WhatsApp real substituem o esquema emerald/zinc atual. Adicionar CSS do pattern de fundo e animações.

**Tech Stack:** Next.js 15, React 19, Tailwind CSS, shadcn/ui, Lucide icons, date-fns

---

## Task 1: CSS Global — WhatsApp Theme Variables + Chat Background Pattern

**Files:**
- Modify: `src/app/globals.css`

**Step 1: Adicionar variáveis CSS do tema WhatsApp e pattern de fundo**

No final do arquivo `globals.css`, adicionar:

```css
/* ============================================================
   WhatsApp Theme
   ============================================================ */

:root {
  /* WhatsApp Colors - Light */
  --wa-bg-app: #efeae2;
  --wa-bg-chat: #efeae2;
  --wa-bg-sidebar: #ffffff;
  --wa-bg-header: #008069;
  --wa-bg-header-chat: #f0f2f5;
  --wa-bg-input: #f0f2f5;
  --wa-bg-outbound: #d9fdd3;
  --wa-bg-inbound: #ffffff;
  --wa-bg-system: #ffecd2;
  --wa-text-primary: #111b21;
  --wa-text-secondary: #667781;
  --wa-text-header: #ffffff;
  --wa-tick-read: #53bdeb;
  --wa-tick-default: #8696a0;
  --wa-unread-badge: #25d366;
  --wa-border: #e9edef;
  --wa-hover: #f5f6f6;
  --wa-selected: #f0f2f5;
  --wa-online: #25d366;
  --wa-typing: #25d366;
}

.dark {
  --wa-bg-app: #0b141a;
  --wa-bg-chat: #0b141a;
  --wa-bg-sidebar: #111b21;
  --wa-bg-header: #202c33;
  --wa-bg-header-chat: #202c33;
  --wa-bg-input: #202c33;
  --wa-bg-outbound: #005c4b;
  --wa-bg-inbound: #202c33;
  --wa-bg-system: #332a1f;
  --wa-text-primary: #e9edef;
  --wa-text-secondary: #8696a0;
  --wa-text-header: #e9edef;
  --wa-tick-read: #53bdeb;
  --wa-tick-default: #8696a0;
  --wa-unread-badge: #00a884;
  --wa-border: #2a3942;
  --wa-hover: #202c33;
  --wa-selected: #2a3942;
  --wa-online: #00a884;
  --wa-typing: #00a884;
}

/* Chat background pattern (WhatsApp doodle pattern) */
.wa-chat-bg {
  background-color: var(--wa-bg-chat);
  background-image: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='0.03'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");
}

.dark .wa-chat-bg {
  background-image: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.02'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");
}

/* Message bubble tails */
.wa-tail-outbound {
  position: relative;
}
.wa-tail-outbound::after {
  content: '';
  position: absolute;
  top: 0;
  right: -8px;
  width: 0;
  height: 0;
  border-left: 8px solid var(--wa-bg-outbound);
  border-top: 8px solid transparent;
}

.wa-tail-inbound {
  position: relative;
}
.wa-tail-inbound::after {
  content: '';
  position: absolute;
  top: 0;
  left: -8px;
  width: 0;
  height: 0;
  border-right: 8px solid var(--wa-bg-inbound);
  border-top: 8px solid transparent;
}

/* Audio waveform bars animation */
@keyframes wa-audio-bar {
  0%, 100% { height: 4px; }
  50% { height: 16px; }
}

.wa-audio-bar {
  width: 3px;
  border-radius: 1.5px;
  background: var(--wa-tick-default);
  animation: wa-audio-bar 1.2s ease-in-out infinite;
}

.wa-audio-bar:nth-child(2) { animation-delay: 0.1s; }
.wa-audio-bar:nth-child(3) { animation-delay: 0.2s; }
.wa-audio-bar:nth-child(4) { animation-delay: 0.3s; }
.wa-audio-bar:nth-child(5) { animation-delay: 0.4s; }
.wa-audio-bar:nth-child(6) { animation-delay: 0.5s; }
.wa-audio-bar:nth-child(7) { animation-delay: 0.6s; }

/* Typing dots animation */
@keyframes wa-typing-dot {
  0%, 60%, 100% { transform: translateY(0); }
  30% { transform: translateY(-4px); }
}

.wa-typing-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--wa-text-secondary);
  display: inline-block;
}

.wa-typing-dot:nth-child(1) { animation: wa-typing-dot 1.4s ease-in-out infinite; }
.wa-typing-dot:nth-child(2) { animation: wa-typing-dot 1.4s ease-in-out 0.2s infinite; }
.wa-typing-dot:nth-child(3) { animation: wa-typing-dot 1.4s ease-in-out 0.4s infinite; }
```

**Step 2: Commit**

```bash
git add src/app/globals.css
git commit -m "feat(whatsapp): add WhatsApp theme CSS variables, chat pattern background, and animations"
```

---

## Task 2: MessageBubble — Visual WhatsApp com tails, cores e ticks

**Files:**
- Modify: `src/components/whatsapp/MessageBubble.tsx`

**Step 1: Atualizar StatusIcon com cores WhatsApp**

Substituir a função `StatusIcon` (linhas 62-77):

```typescript
function StatusIcon({ status }: { status: string }) {
  switch (status) {
    case "pending":
      return <Clock className="h-3 w-3" style={{ color: 'var(--wa-tick-default)' }} />;
    case "sent":
      return <Check className="h-3 w-3" style={{ color: 'var(--wa-tick-default)' }} />;
    case "delivered":
      return <CheckCheck className="h-3 w-3" style={{ color: 'var(--wa-tick-default)' }} />;
    case "read":
      return <CheckCheck className="h-3 w-3" style={{ color: 'var(--wa-tick-read)' }} />;
    case "played":
      return <CheckCheck className="h-3 w-3" style={{ color: 'var(--wa-tick-read)' }} />;
    case "error":
      return <AlertCircle className="h-3 w-3 text-red-500" />;
    default:
      return null;
  }
}
```

**Step 2: Atualizar TimestampRow**

Substituir `TimestampRow` (linhas 122-140):

```typescript
function TimestampRow({
  time,
  isOutbound,
  status,
}: {
  time: string;
  isOutbound: boolean;
  status: string;
}) {
  return (
    <span className="inline-flex items-center gap-0.5 float-right ml-2 mt-1 translate-y-0.5">
      <span className="text-[11px] leading-none tabular-nums" style={{ color: 'var(--wa-text-secondary)' }}>
        {time}
      </span>
      {isOutbound && <StatusIcon status={status} />}
    </span>
  );
}
```

**Step 3: Atualizar o bubble principal**

Substituir o container do bubble (linhas 340-347) — a div com `rounded-2xl`:

```typescript
        {/* Message bubble */}
        <div
          className={cn(
            "rounded-lg px-2.5 py-1.5 shadow-sm max-w-full",
            isOutbound
              ? "wa-tail-outbound rounded-tr-none"
              : "wa-tail-inbound rounded-tl-none",
          )}
          style={{
            backgroundColor: isOutbound ? 'var(--wa-bg-outbound)' : 'var(--wa-bg-inbound)',
          }}
        >
```

**Step 4: Atualizar ReplyQuote para cores WhatsApp**

Substituir `ReplyQuote` (linhas 94-120):

```typescript
function ReplyQuote({
  quotedText,
  isOutbound,
  searchQuery,
  highlightMatch,
}: {
  quotedText: string;
  isOutbound: boolean;
  searchQuery?: string;
  highlightMatch?: (text: string, query: string) => React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "mb-1.5 px-2.5 py-1.5 rounded-md border-l-[3px] text-xs",
        isOutbound
          ? "bg-[#d1f4cc] dark:bg-[#025144] border-[#06cf9c]"
          : "bg-[#f0f0f0] dark:bg-[#1d282f] border-[#06cf9c]",
      )}
    >
      <p className="line-clamp-2 whitespace-pre-wrap" style={{ color: 'var(--wa-text-primary)' }}>
        {renderText(quotedText, searchQuery, highlightMatch)}
      </p>
    </div>
  );
}
```

**Step 5: Atualizar MediaAudio para player estilo WhatsApp**

Substituir `MediaAudio` (linhas 183-191):

```typescript
function MediaAudio({ url }: { url: string | null }) {
  return (
    <div className="flex items-center gap-3 py-1.5 px-1 min-w-[240px]">
      <button
        className="h-8 w-8 rounded-full flex items-center justify-center shrink-0"
        style={{ backgroundColor: 'var(--wa-unread-badge)' }}
        onClick={(e) => {
          e.stopPropagation();
          const audio = e.currentTarget.parentElement?.querySelector('audio');
          if (audio) {
            if (audio.paused) audio.play();
            else audio.pause();
          }
        }}
      >
        <Mic className="h-4 w-4 text-white" />
      </button>
      <div className="flex items-end gap-[2px] h-5 flex-1">
        {Array.from({ length: 28 }).map((_, i) => (
          <div
            key={i}
            className="wa-audio-bar"
            style={{
              height: `${Math.max(3, Math.random() * 16)}px`,
              animationDelay: `${i * 0.05}s`,
              animationPlayState: 'paused',
            }}
          />
        ))}
      </div>
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <audio src={url || undefined} className="hidden" />
    </div>
  );
}
```

**Step 6: Atualizar cores do texto**

Substituir as classes de texto nas mensagens. Onde aparece `text-zinc-900 dark:text-zinc-100` no conteúdo das mensagens (linhas 374, 382), trocar por:

```typescript
style={{ color: 'var(--wa-text-primary)' }}
```

E o fallbackTypeLabel (linha 390) de `text-zinc-500 dark:text-zinc-400` para:

```typescript
style={{ color: 'var(--wa-text-secondary)' }}
```

**Step 7: Atualizar o wrapper externo**

Substituir a margem `mb-1.5` do container externo (linha 271) por `mb-0.5` para ficar mais compacto como WhatsApp.

**Step 8: Commit**

```bash
cd /Users/rodrigorochameire/Projetos/Defender
git add src/components/whatsapp/MessageBubble.tsx
git commit -m "feat(whatsapp): redesign message bubbles with WhatsApp colors, tails, and styled audio player"
```

---

## Task 3: ConversationList — Redesign estilo WhatsApp

**Files:**
- Modify: `src/components/whatsapp/ConversationList.tsx`

**Step 1: Atualizar timestamp para formato WhatsApp**

Adicionar helper function após `getTagLabel` (linha 109):

```typescript
function formatWhatsAppTime(date: Date): string {
  const now = new Date();
  const msgDate = new Date(date);
  const diffDays = Math.floor((now.getTime() - msgDate.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return msgDate.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  }
  if (diffDays === 1) {
    return "Ontem";
  }
  if (diffDays < 7) {
    return msgDate.toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", "");
  }
  return msgDate.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" });
}
```

**Step 2: Atualizar a importação — adicionar Check**

No import de lucide-react, adicionar `Check` ao lado dos outros ícones.

**Step 3: Atualizar o item de conversa (linhas 557-735)**

Substituir o conteúdo do `div` do item de conversa:

```tsx
              <div
                key={contact.id}
                className={cn(
                  "group flex items-center gap-3 px-3 py-2 cursor-pointer transition-colors",
                  selectedContactId === contact.id
                    ? "bg-[var(--wa-selected)]"
                    : "hover:bg-[var(--wa-hover)]",
                )}
                style={{ borderBottom: '1px solid var(--wa-border)' }}
                onClick={() => onSelectContact(contact.id)}
              >
                {/* Avatar — maior, com dot de online */}
                <div className="relative shrink-0">
                  <Avatar className="h-[49px] w-[49px]">
                    <AvatarImage src={contact.profilePicUrl || undefined} />
                    <AvatarFallback
                      className="text-sm font-medium"
                      style={{ backgroundColor: 'var(--wa-bg-input)', color: 'var(--wa-text-secondary)' }}
                    >
                      {getContactInitials(contact)}
                    </AvatarFallback>
                  </Avatar>
                  {/* Amber ring for unanswered > 4h */}
                  {contact.lastMessageDirection === "inbound" &&
                    contact.lastMessageAt &&
                    (Date.now() - new Date(contact.lastMessageAt).getTime()) > 4 * 60 * 60 * 1000 && (
                    <div className="absolute -top-0.5 -right-0.5 h-3 w-3 rounded-full bg-amber-400 border-2 border-[var(--wa-bg-sidebar)]" />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  {/* Row 1: Name + Timestamp */}
                  <div className="flex justify-between items-baseline gap-2">
                    <div className="flex items-center gap-1.5 min-w-0 flex-1">
                      <span
                        className={cn(
                          "text-[15px] font-normal truncate",
                          isPhoneDisplayName(contact) && "font-mono text-sm"
                        )}
                        style={{ color: 'var(--wa-text-primary)' }}
                      >
                        {debouncedSearch
                          ? highlightText(getContactDisplayName(contact), debouncedSearch)
                          : getContactDisplayName(contact)}
                      </span>
                      {contact.isFavorite && (
                        <Star className="h-3 w-3 fill-amber-400 text-amber-400 shrink-0" />
                      )}
                    </div>
                    {contact.lastMessageAt && (
                      <span
                        className="text-xs shrink-0 whitespace-nowrap"
                        style={{ color: contact.unreadCount > 0 ? 'var(--wa-unread-badge)' : 'var(--wa-text-secondary)' }}
                      >
                        {formatWhatsAppTime(new Date(contact.lastMessageAt))}
                      </span>
                    )}
                  </div>

                  {/* Row 2: Message preview + Unread badge */}
                  <div className="flex justify-between items-center mt-0.5 gap-2">
                    <span
                      className="text-sm truncate flex items-center gap-1"
                      style={{ color: 'var(--wa-text-secondary)' }}
                    >
                      {contact.lastMessageContent ? (
                        <>
                          {/* Ticks for outbound */}
                          {contact.lastMessageDirection === "outbound" && (
                            <CheckCheck className="h-[18px] w-[18px] shrink-0" style={{ color: 'var(--wa-tick-read)' }} />
                          )}
                          {/* Media type icon */}
                          {contact.lastMessageType &&
                          contact.lastMessageType !== "text" &&
                          !contact.lastMessageContent.trim() ? (
                            <span className="flex items-center gap-1">
                              {renderMediaIcon(contact.lastMessageType)}
                              <span>{getMediaLabel(contact.lastMessageType)}</span>
                            </span>
                          ) : (
                            <span className="truncate">
                              {debouncedSearch
                                ? highlightText(contact.lastMessageContent, debouncedSearch)
                                : contact.lastMessageContent}
                            </span>
                          )}
                        </>
                      ) : contact.assistido ? (
                        <span className="flex items-center gap-1">
                          <UserPlus className="h-3 w-3 shrink-0" />
                          <span className="truncate">{contact.assistido.nome}</span>
                        </span>
                      ) : (
                        <span className="font-mono">
                          {formatPhone(contact.phone)}
                        </span>
                      )}
                    </span>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {/* Tags (max 1 compact) */}
                      {contact.tags && contact.tags.length > 0 && (
                        <span
                          className={cn(
                            "inline-flex items-center px-1 py-0 rounded text-[9px] leading-tight font-medium",
                            getTagColor(contact.tags[0]).bg,
                            getTagColor(contact.tags[0]).text
                          )}
                        >
                          {getTagLabel(contact.tags[0]).slice(0, 6)}
                        </span>
                      )}
                      {/* Unread badge */}
                      {contact.unreadCount > 0 && (
                        <span
                          className="h-5 min-w-5 px-1.5 flex items-center justify-center rounded-full text-white text-[11px] font-medium"
                          style={{ backgroundColor: 'var(--wa-unread-badge)' }}
                        >
                          {contact.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Context Menu — hover */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <MoreVertical className="h-3.5 w-3.5" style={{ color: 'var(--wa-text-secondary)' }} />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem onClick={() => handleToggleFavorite(contact)} className="text-xs">
                      <Star className={cn("mr-2 h-3.5 w-3.5", contact.isFavorite && "fill-amber-400 text-amber-400")} />
                      {contact.isFavorite ? "Remover dos favoritos" : "Adicionar aos favoritos"}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleToggleArchive(contact)} className="text-xs">
                      <Archive className="mr-2 h-3.5 w-3.5" />
                      {contact.isArchived ? "Desarquivar" : "Arquivar"}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-xs">
                      <UserPlus className="mr-2 h-3.5 w-3.5" />
                      Vincular assistido
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
```

**Step 4: Atualizar o fundo do sidebar (ScrollArea wrapper)**

Na ScrollArea (provavelmente perto da linha 535), alterar o background para usar a variável:

```tsx
<ScrollArea className="flex-1" style={{ backgroundColor: 'var(--wa-bg-sidebar)' }}>
```

**Step 5: Atualizar o input de busca**

Trocar as classes de cor do input de busca para:

```tsx
style={{ backgroundColor: 'var(--wa-bg-input)', color: 'var(--wa-text-primary)' }}
```

**Step 6: Commit**

```bash
cd /Users/rodrigorochameire/Projetos/Defender
git add src/components/whatsapp/ConversationList.tsx
git commit -m "feat(whatsapp): redesign conversation list with WhatsApp styling, timestamps, and larger avatars"
```

---

## Task 4: ChatWindow — Header e área de chat estilo WhatsApp

**Files:**
- Modify: `src/components/whatsapp/ChatWindow.tsx`

**Step 1: Atualizar o header do chat (linha 748)**

Substituir as classes do header:

```tsx
      <div
        className="flex items-center justify-between px-3 sm:px-4 py-2 h-[60px]"
        style={{
          backgroundColor: 'var(--wa-bg-header-chat)',
          borderBottom: '1px solid var(--wa-border)',
        }}
      >
```

**Step 2: Atualizar AvatarFallback do header (linha 763)**

```tsx
              <AvatarFallback
                className="text-xs font-medium"
                style={{ backgroundColor: 'var(--wa-unread-badge)', color: '#ffffff' }}
              >
```

**Step 3: Atualizar o container de mensagens**

Encontrar o `div` que envolve o scroll das mensagens (provavelmente tem `overflow-y-auto` e `flex-1`). Adicionar a classe do pattern:

```tsx
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto px-4 sm:px-12 lg:px-16 py-4 wa-chat-bg"
          onScroll={handleScroll}
        >
```

**Step 4: Atualizar os date headers (separadores de data)**

Encontrar o `formatDateHeader` rendering. Atualizar o badge de data para estilo WhatsApp:

```tsx
              <div className="flex justify-center my-3">
                <span
                  className="px-3 py-1 rounded-lg text-xs shadow-sm"
                  style={{
                    backgroundColor: 'var(--wa-bg-system)',
                    color: 'var(--wa-text-primary)',
                  }}
                >
                  {formatDateHeader(group.date)}
                </span>
              </div>
```

**Step 5: Atualizar a área de input**

Encontrar o `textarea`/`input` area no final do componente. Atualizar o container:

```tsx
      {/* Input area */}
      <div
        className="px-3 py-2.5"
        style={{
          backgroundColor: 'var(--wa-bg-input)',
          borderTop: '1px solid var(--wa-border)',
        }}
      >
```

E o textarea em si deve ter fundo branco/escuro arredondado:

```tsx
        <Textarea
          className="rounded-lg border-0 px-3 py-2 text-sm resize-none focus-visible:ring-0"
          style={{
            backgroundColor: 'var(--wa-bg-inbound)',
            color: 'var(--wa-text-primary)',
          }}
```

**Step 6: Atualizar o botão de enviar**

O botão de enviar deve ser circular com cor WhatsApp:

```tsx
          <button
            onClick={handleSend}
            disabled={!message.trim()}
            className="h-10 w-10 rounded-full flex items-center justify-center shrink-0 transition-colors disabled:opacity-40"
            style={{ backgroundColor: 'var(--wa-unread-badge)' }}
          >
            <SendHorizontal className="h-5 w-5 text-white" />
          </button>
```

**Step 7: Commit**

```bash
cd /Users/rodrigorochameire/Projetos/Defender
git add src/components/whatsapp/ChatWindow.tsx
git commit -m "feat(whatsapp): redesign chat window with WhatsApp header, background pattern, and input styling"
```

---

## Task 5: Página Principal — Header e layout estilo WhatsApp

**Files:**
- Modify: `src/app/(dashboard)/admin/whatsapp/chat/page.tsx`

**Step 1: Atualizar o header principal (linha 195-197)**

Substituir o header:

```tsx
      <div className={cn(
        "px-3 sm:px-4 py-2",
        selectedContactId && "hidden md:block"
      )}
      style={{
        backgroundColor: 'var(--wa-bg-header)',
        color: 'var(--wa-text-header)',
      }}
      >
```

**Step 2: Atualizar cores dos botões do header**

Os botões ghost do header (linhas 244-329) precisam de cor branca/clara em vez de zinc:

```tsx
className="h-8 w-8 text-white/80 hover:text-white hover:bg-white/10"
```

**Step 3: Atualizar os filter pills (linhas 344-368)**

Os filtros devem seguir o estilo WhatsApp (pills com fundo):

```tsx
            <div className="flex items-center gap-1 px-3 py-2" style={{ backgroundColor: 'var(--wa-bg-sidebar)' }}>
              {(["all", "unread", "favorites", "archived"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={cn(
                    "px-3 py-1 rounded-full text-xs font-medium transition-colors",
                    filter === f
                      ? "text-white"
                      : "hover:bg-[var(--wa-hover)]"
                  )}
                  style={filter === f ? { backgroundColor: 'var(--wa-unread-badge)' } : { color: 'var(--wa-text-secondary)' }}
                >
                  {{ all: "Todas", unread: "Não lidas", favorites: "Favoritas", archived: "Arquivadas" }[f]}
                </button>
              ))}
            </div>
```

**Step 4: Atualizar o sidebar container**

O container do sidebar (que envolve filters + conversation list) deve ter background do WhatsApp:

```tsx
          <div
            className={cn(
              "flex flex-col w-full md:w-[380px] lg:w-[420px] shrink-0",
              selectedContactId && "hidden md:flex"
            )}
            style={{
              backgroundColor: 'var(--wa-bg-sidebar)',
              borderRight: '1px solid var(--wa-border)',
            }}
          >
```

**Step 5: Atualizar o empty state do chat**

O `ChatEmptyState` que aparece quando nenhum contato está selecionado deve ter o fundo do chat:

```tsx
          <div className="flex-1 flex items-center justify-center wa-chat-bg">
            <ChatEmptyState />
          </div>
```

**Step 6: Commit**

```bash
cd /Users/rodrigorochameire/Projetos/Defender
git add src/app/\(dashboard\)/admin/whatsapp/chat/page.tsx
git commit -m "feat(whatsapp): redesign main page with WhatsApp green header, filter pills, and sidebar styling"
```

---

## Task 6: DisconnectBanner — Estilo WhatsApp

**Files:**
- Modify: `src/components/whatsapp/DisconnectBanner.tsx`

**Step 1: Atualizar o banner (98 linhas)**

Substituir as classes de cor do banner de vermelho para o amarelo/amber do WhatsApp (como o WhatsApp real faz):

Onde tem `bg-red-500/10 border-b border-red-500/30`, substituir por:

```tsx
className="flex items-center gap-2 px-4 py-2.5"
style={{
  backgroundColor: '#fdf3d2',
  borderBottom: '1px solid #e8d48b',
}}
```

E no dark mode, usar inline style condicionalmente ou manter as classes dark.

Atualizar o ícone e texto para amber em vez de red.

**Step 2: Commit**

```bash
cd /Users/rodrigorochameire/Projetos/Defender
git add src/components/whatsapp/DisconnectBanner.tsx
git commit -m "feat(whatsapp): update disconnect banner to WhatsApp amber style"
```

---

## Task 7: Ticks de leitura na ConversationList + status correto

**Files:**
- Modify: `src/components/whatsapp/ConversationList.tsx`

**Step 1: Refinar os ticks na preview**

Na preview de mensagem na lista de conversas (já alterada na Task 3), garantir que os ticks reflitam o status real da última mensagem. O campo `lastMessageDirection` já existe no Contact. Precisamos também do `lastMessageStatus`.

Adicionar ao interface Contact (linha 60-80):

```typescript
  lastMessageStatus?: string | null;
```

**Step 2: Atualizar o rendering dos ticks na preview**

Onde mostra `<CheckCheck>` para outbound, usar o status:

```tsx
{contact.lastMessageDirection === "outbound" && (
  contact.lastMessageStatus === "read" || contact.lastMessageStatus === "played" ? (
    <CheckCheck className="h-[16px] w-[16px] shrink-0" style={{ color: 'var(--wa-tick-read)' }} />
  ) : contact.lastMessageStatus === "delivered" ? (
    <CheckCheck className="h-[16px] w-[16px] shrink-0" style={{ color: 'var(--wa-tick-default)' }} />
  ) : contact.lastMessageStatus === "sent" ? (
    <Check className="h-[16px] w-[16px] shrink-0" style={{ color: 'var(--wa-tick-default)' }} />
  ) : (
    <Clock className="h-3 w-3 shrink-0" style={{ color: 'var(--wa-tick-default)' }} />
  )
)}
```

**Step 3: Adicionar lastMessageStatus ao schema de contatos**

Se o campo não existe na tabela, adicionar:

No arquivo `src/lib/db/schema/comunicacao.ts`, adicionar após `lastMessageType`:

```typescript
lastMessageStatus: varchar("last_message_status", { length: 20 }),
```

**Step 4: Atualizar a query listContacts no router**

Em `src/lib/trpc/routers/whatsapp-chat.ts`, na query `listContacts`, garantir que `lastMessageStatus` é retornado. Buscar o campo da tabela whatsappContacts.

**Step 5: Atualizar o webhook para salvar lastMessageStatus**

Em `src/app/api/webhooks/evolution/route.ts`, quando processar MESSAGES_UPSERT outbound, salvar o status na tabela de contatos.

**Step 6: Commit**

```bash
cd /Users/rodrigorochameire/Projetos/Defender
git add src/lib/db/schema/comunicacao.ts src/components/whatsapp/ConversationList.tsx src/lib/trpc/routers/whatsapp-chat.ts
git commit -m "feat(whatsapp): add message status ticks to conversation list preview"
```

---

## Task 8: Build e Verificação

**Step 1: Verificar build**

```bash
cd /Users/rodrigorochameire/Projetos/Defender
npm run build 2>&1 | tail -30
```

Esperado: sem erros de build.

**Step 2: Rodar dev e testar visualmente**

```bash
npm run dev
```

Verificar em `http://localhost:3000/admin/whatsapp/chat`:
- [ ] Header verde WhatsApp
- [ ] Sidebar com fundo branco e conversas com avatar maior
- [ ] Timestamps no formato "14:30", "Ontem", "seg"
- [ ] Preview de última mensagem com ticks
- [ ] Badge de não lidas em verde WhatsApp
- [ ] Bolhas de mensagem com cores WhatsApp e tails
- [ ] Fundo do chat com pattern sutil
- [ ] Date headers com fundo sistema (bege)
- [ ] Input area com fundo cinza claro
- [ ] Botão de enviar circular verde
- [ ] Player de áudio estilizado

**Step 3: Fix qualquer problema encontrado**

**Step 4: Commit final se necessário**

```bash
git add -A
git commit -m "fix(whatsapp): polish WhatsApp redesign visual issues"
```

---

## Task 9: Aplicar migração do banco (lastMessageStatus)

**Step 1: Push schema changes**

```bash
cd /Users/rodrigorochameire/Projetos/Defender
npm run db:push
```

Confirmar com `y` quando perguntado.

**Step 2: Verificar no Supabase Studio**

```bash
npm run db:studio
```

Confirmar que `whatsapp_contacts` tem a coluna `last_message_status`.

**Step 3: Commit**

Se o db:push gerar arquivos de migração, commitá-los.

---

## Notas de Implementação

### Abordagem de cores
Usamos CSS custom properties (`var(--wa-*)`) em vez de classes Tailwind puras para:
1. Facilitar a troca light/dark via `:root` e `.dark`
2. Manter consistência com as cores exatas do WhatsApp
3. Permitir future customização (ex: temas)

### O que NÃO mudar
- Toda a lógica de tRPC queries/mutations permanece intacta
- Os modals de ação (save to process, create note, etc.) mantêm o visual atual
- O ContextPanel e ContactDetailsPanel mantêm o visual atual
- A funcionalidade de busca, tags, filtros permanece intacta

### Prioridades visuais (se precisar cortar scope)
1. Cores das bolhas + tails (maior impacto visual)
2. Fundo do chat com pattern
3. Header verde
4. Timestamps no formato WhatsApp
5. Avatar maior na lista
6. Ticks de leitura
7. Player de áudio estilizado
