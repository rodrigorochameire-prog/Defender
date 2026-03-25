# WhatsApp Command Center Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the OMBUDS WhatsApp chat from an isolated messenger into a juridical operations center with context sidebar, message actions, real-time updates, and OMBUDS/Drive data flow.

**Architecture:** 3-column layout (conversations | chat | context panel). Backend endpoints fetch cross-domain data (processos, audiências, prazos, Drive). Message hover bar enables single-click save to processo/anotação/Drive via junction table `whatsapp_message_actions`. Polling-based real-time updates (5s chat, 15s contacts).

**Tech Stack:** Next.js 15, tRPC, Drizzle ORM, PostgreSQL (Supabase), Tailwind CSS, shadcn/ui, Lucide React, `vaul` (mobile drawer)

**Spec:** `docs/superpowers/specs/2026-03-23-whatsapp-command-center-design.md`

---

## File Structure

### New files
| File | Responsibility |
|------|---------------|
| `src/lib/db/schema/comunicacao.ts` | Add `whatsappMessageActions` table + `isFavorite` column |
| `src/components/whatsapp/ContextPanel.tsx` | Main context sidebar with tab navigation |
| `src/components/whatsapp/ContextPanelProcesso.tsx` | Processo tab: cards for processo, audiência, prazo, movimentação |
| `src/components/whatsapp/ContextPanelDrive.tsx` | Drive tab: file list, upload actions |
| `src/components/whatsapp/ContextPanelMidia.tsx` | Mídia tab: gallery grid, batch save |
| `src/components/whatsapp/MessageActionBar.tsx` | Hover bar with 5 action icons |
| `src/components/whatsapp/MessageActionModals.tsx` | Modals: SaveToProcess, CreateNote, SaveToDrive |
| `src/components/whatsapp/DisconnectBanner.tsx` | Fixed banner when connection lost > 30s |

### Modified files
| File | Changes |
|------|---------|
| `src/lib/trpc/routers/whatsapp-chat.ts` | Add 6 new endpoints: `getContactContext`, `getContactTimeline`, `getQuickContext`, `saveMessageToProcess`, `createNoteFromMessage`, `toggleFavorite` + extend `saveMediaToDrive` |
| `src/components/whatsapp/MessageBubble.tsx` | Add hover state, render `MessageActionBar`, pass action callbacks |
| `src/components/whatsapp/ChatWindow.tsx` | Add polling (refetchInterval), order toggle, search-in-chat, integrate `MessageActionModals` and `DisconnectBanner` |
| `src/components/whatsapp/ConversationList.tsx` | Add unread badges, search debounce, highlight matches |
| `src/components/whatsapp/ConnectionStatus.tsx` | Add auto-reconnect timer, emit status changes |
| `src/components/whatsapp/SlashCommandMenu.tsx` | Expand to 6 commands with fuzzy filter and ↑↓ navigation |
| `src/components/whatsapp/ScrollToBottom.tsx` | Add "N new messages" floating button |
| `src/app/(dashboard)/admin/whatsapp/chat/page.tsx` | Refactor to 3-column layout with `ContextPanel` |

---

## Task 1: Schema — `is_favorite` column + `whatsapp_message_actions` table

**Files:**
- Modify: `src/lib/db/schema/comunicacao.ts`

This task adds the DB foundation. All subsequent tasks depend on this.

- [ ] **Step 1: Add `isFavorite` column to `whatsappChatMessages` in schema**

In `src/lib/db/schema/comunicacao.ts`, add after the `importedAt` column (line ~305):

```typescript
  // Favoritos e ações
  isFavorite: boolean("is_favorite").default(false),
```

- [ ] **Step 2: Add `whatsappMessageActions` table to schema**

In `src/lib/db/schema/comunicacao.ts`, add after the `whatsappChatMessages` table definition (before the relations section):

```typescript
// ==========================================
// AÇÕES SOBRE MENSAGENS WHATSAPP
// ==========================================

export const whatsappMessageActions = pgTable("whatsapp_message_actions", {
  id: serial("id").primaryKey(),
  messageId: integer("message_id")
    .notNull()
    .references(() => whatsappChatMessages.id, { onDelete: "cascade" }),
  actionType: varchar("action_type", { length: 20 }).notNull(), // 'save_to_process' | 'create_note' | 'save_to_drive'
  targetType: varchar("target_type", { length: 20 }).notNull(), // 'anotacao' | 'documento' | 'drive_file'
  targetId: integer("target_id"),
  processoId: integer("processo_id").references(() => processos.id, { onDelete: "set null" }),
  observacao: text("observacao"),
  createdById: integer("created_by_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("whatsapp_message_actions_message_idx").on(table.messageId),
  index("whatsapp_message_actions_processo_idx").on(table.processoId),
]);

export type WhatsappMessageAction = typeof whatsappMessageActions.$inferSelect;
export type InsertWhatsappMessageAction = typeof whatsappMessageActions.$inferInsert;
```

- [ ] **Step 3: Add relation for `whatsappMessageActions`**

In the relations section of the same file, add:

```typescript
export const whatsappMessageActionsRelations = relations(whatsappMessageActions, ({ one }) => ({
  message: one(whatsappChatMessages, { fields: [whatsappMessageActions.messageId], references: [whatsappChatMessages.id] }),
  processo: one(processos, { fields: [whatsappMessageActions.processoId], references: [processos.id] }),
  createdBy: one(users, { fields: [whatsappMessageActions.createdById], references: [users.id] }),
}));
```

- [ ] **Step 4: Export from schema index**

In `src/lib/db/schema/index.ts`, verify `whatsappMessageActions` is exported (it should be via the `comunicacao` barrel export).

- [ ] **Step 5: Apply migration to database**

Run directly via node (avoids interactive `db:push` prompts):

```bash
node -e "
const { Client } = require('pg');
async function run() {
  const client = new Client({ connectionString: process.env.DATABASE_URL || 'postgresql://postgres.hxfvlaeqhkmelvyzgfqp:[REDACTED]%40%40@aws-1-sa-east-1.pooler.supabase.com:6543/postgres' });
  await client.connect();
  await client.query('ALTER TABLE whatsapp_chat_messages ADD COLUMN IF NOT EXISTS is_favorite boolean DEFAULT false');
  await client.query(\`CREATE TABLE IF NOT EXISTS whatsapp_message_actions (
    id serial PRIMARY KEY,
    message_id integer NOT NULL REFERENCES whatsapp_chat_messages(id) ON DELETE CASCADE,
    action_type varchar(20) NOT NULL,
    target_type varchar(20) NOT NULL,
    target_id integer,
    processo_id integer REFERENCES processos(id) ON DELETE SET NULL,
    observacao text,
    created_by_id integer REFERENCES users(id),
    created_at timestamp DEFAULT now() NOT NULL
  )\`);
  await client.query('CREATE INDEX IF NOT EXISTS whatsapp_chat_messages_is_favorite_idx ON whatsapp_chat_messages(is_favorite) WHERE is_favorite = true');
  await client.query('CREATE INDEX IF NOT EXISTS whatsapp_chat_messages_contact_created_idx ON whatsapp_chat_messages(contact_id, created_at)');
  await client.query('CREATE INDEX IF NOT EXISTS whatsapp_message_actions_message_idx ON whatsapp_message_actions(message_id)');
  await client.query('CREATE INDEX IF NOT EXISTS whatsapp_message_actions_processo_idx ON whatsapp_message_actions(processo_id) WHERE processo_id IS NOT NULL');
  console.log('All migrations applied');
  await client.end();
}
run().catch(console.error);
"
```

Expected: `All migrations applied`

- [ ] **Step 6: Verify build**

```bash
npm run build 2>&1 | tail -5
```

Expected: Build succeeds (no type errors from schema changes).

- [ ] **Step 7: Commit**

```bash
git add src/lib/db/schema/comunicacao.ts
git commit -m "feat(whatsapp): add is_favorite column and whatsapp_message_actions table

Schema foundation for WhatsApp Command Center:
- is_favorite boolean on whatsapp_chat_messages
- whatsapp_message_actions junction table for save-to-process/note/drive
- Composite index on (contact_id, created_at)"
```

---

## Task 2: Backend — New tRPC endpoints

**Files:**
- Modify: `src/lib/trpc/routers/whatsapp-chat.ts`

**Depends on:** Task 1

This adds 6 new endpoints and extends 1 existing. Each endpoint is a standalone `protectedProcedure`.

- [ ] **Step 1: Add imports at top of router**

At top of `src/lib/trpc/routers/whatsapp-chat.ts`, add to the existing imports from `@/lib/db/schema`:

```typescript
import {
  // ... existing imports ...
  whatsappMessageActions,
  audiencias,
  calculosPrazos,
  movimentacoes,
} from "@/lib/db/schema";
```

Also add `gte` to the drizzle-orm imports:

```typescript
import { eq, and, desc, like, ilike, sql, or, lt, ne, inArray, asc, gte } from "drizzle-orm";
```

- [ ] **Step 2: Add `getContactContext` endpoint**

Add at end of the router (before the closing `})`):

```typescript
  /**
   * getContactContext — lightweight context for selected contact
   */
  getContactContext: protectedProcedure
    .input(z.object({
      contactId: z.number(),
      configId: z.number(),
    }))
    .query(async ({ input }) => {
      const contact = await db.query.whatsappContacts.findFirst({
        where: eq(whatsappContacts.id, input.contactId),
      });
      if (!contact?.assistidoId) {
        return { assistido: null, processoAtivo: null };
      }

      const assistido = await db.query.assistidos.findFirst({
        where: eq(assistidos.id, contact.assistidoId),
        columns: { id: true, nome: true, cpf: true },
      });

      // Get active processo via junction
      const ap = await db
        .select({
          processoId: assistidosProcessos.processoId,
          numero: processos.numero,
          orgaoJulgador: processos.orgaoJulgador,
          tiposPenais: processos.tiposPenais,
          status: processos.status,
        })
        .from(assistidosProcessos)
        .innerJoin(processos, eq(processos.id, assistidosProcessos.processoId))
        .where(
          and(
            eq(assistidosProcessos.assistidoId, contact.assistidoId),
            eq(processos.status, "ATIVO"),
          )
        )
        .limit(1);

      const processoAtivo = ap[0]
        ? {
            id: ap[0].processoId,
            numero: ap[0].numero,
            vara: ap[0].orgaoJulgador,
            crime: ap[0].tiposPenais,
          }
        : null;

      return { assistido, processoAtivo };
    }),
```

- [ ] **Step 3: Add `getContactTimeline` endpoint**

```typescript
  /**
   * getContactTimeline — audiência, prazo, movimentação for context panel
   */
  getContactTimeline: protectedProcedure
    .input(z.object({ assistidoId: z.number() }))
    .query(async ({ input }) => {
      const now = new Date();

      // Próxima audiência
      const proxAudiencia = await db
        .select({
          id: audiencias.id,
          data: audiencias.data,
          tipo: audiencias.tipo,
          processoId: audiencias.processoId,
        })
        .from(audiencias)
        .innerJoin(assistidosProcessos, eq(assistidosProcessos.processoId, audiencias.processoId))
        .where(
          and(
            eq(assistidosProcessos.assistidoId, input.assistidoId),
            gte(audiencias.data, now),
          )
        )
        .orderBy(asc(audiencias.data))
        .limit(1);

      const proximaAudiencia = proxAudiencia[0]
        ? {
            id: proxAudiencia[0].id,
            data: proxAudiencia[0].data,
            tipo: proxAudiencia[0].tipo,
            diasRestantes: Math.ceil(
              (new Date(proxAudiencia[0].data).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
            ),
          }
        : null;

      // Prazo aberto
      const proxPrazo = await db
        .select({
          id: calculosPrazos.id,
          tipo: calculosPrazos.tipo,
          vencimento: calculosPrazos.dataFinal,
          processoId: calculosPrazos.processoId,
        })
        .from(calculosPrazos)
        .innerJoin(assistidosProcessos, eq(assistidosProcessos.processoId, calculosPrazos.processoId))
        .where(
          and(
            eq(assistidosProcessos.assistidoId, input.assistidoId),
            gte(calculosPrazos.dataFinal, now),
          )
        )
        .orderBy(asc(calculosPrazos.dataFinal))
        .limit(1);

      const prazoAberto = proxPrazo[0]
        ? {
            id: proxPrazo[0].id,
            tipo: proxPrazo[0].tipo,
            vencimento: proxPrazo[0].vencimento,
            diasRestantes: Math.ceil(
              (new Date(proxPrazo[0].vencimento!).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
            ),
          }
        : null;

      // Última movimentação
      const ultMov = await db
        .select({
          id: movimentacoes.id,
          tipo: movimentacoes.tipo,
          data: movimentacoes.data,
          fonte: movimentacoes.fonte,
        })
        .from(movimentacoes)
        .innerJoin(assistidosProcessos, eq(assistidosProcessos.processoId, movimentacoes.processoId))
        .where(eq(assistidosProcessos.assistidoId, input.assistidoId))
        .orderBy(desc(movimentacoes.data))
        .limit(1);

      const ultimaMovimentacao = ultMov[0] || null;

      return { proximaAudiencia, prazoAberto, ultimaMovimentacao };
    }),
```

- [ ] **Step 4: Add `saveMessageToProcess` mutation**

```typescript
  /**
   * saveMessageToProcess — saves a message as documento or anotação on a processo
   */
  saveMessageToProcess: protectedProcedure
    .input(z.object({
      messageId: z.number(),
      processoId: z.number(),
      tipo: z.enum(["documento", "anotacao", "evidencia"]),
      observacao: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const message = await db.query.whatsappChatMessages.findFirst({
        where: eq(whatsappChatMessages.id, input.messageId),
      });
      if (!message) throw new TRPCError({ code: "NOT_FOUND" });

      const msgText = message.content || "(mídia sem texto)";
      let targetId: number;
      let targetType: string;

      if (input.tipo === "anotacao") {
        const [nota] = await db.insert(anotacoes).values({
          processoId: input.processoId,
          conteudo: input.observacao ? `${msgText}\n\n---\n${input.observacao}` : msgText,
          tipo: "whatsapp",
          metadata: { waMessageId: message.waMessageId, direction: message.direction },
        }).returning({ id: anotacoes.id });
        targetId = nota.id;
        targetType = "anotacao";
      } else {
        // documento or evidencia
        const { documentos } = await import("@/lib/db/schema");
        const titulo = msgText.slice(0, 100);
        const categoria = input.tipo === "evidencia" ? "evidencia_whatsapp" : "whatsapp";
        const [doc] = await db.insert(documentos).values({
          processoId: input.processoId,
          titulo,
          categoria,
          conteudo: msgText,
          observacoes: input.observacao,
        }).returning({ id: documentos.id });
        targetId = doc.id;
        targetType = "documento";
      }

      // Record action in junction table
      await db.insert(whatsappMessageActions).values({
        messageId: input.messageId,
        actionType: "save_to_process",
        targetType,
        targetId,
        processoId: input.processoId,
        observacao: input.observacao,
        createdById: ctx.userId,
      });

      return { targetId, targetType };
    }),
```

- [ ] **Step 5: Add `createNoteFromMessage` mutation**

```typescript
  /**
   * createNoteFromMessage — creates an anotação from a chat message
   */
  createNoteFromMessage: protectedProcedure
    .input(z.object({
      messageId: z.number(),
      processoId: z.number().optional(),
      assistidoId: z.number().optional(),
      texto: z.string().min(1),
    }))
    .mutation(async ({ ctx, input }) => {
      const [nota] = await db.insert(anotacoes).values({
        processoId: input.processoId,
        assistidoId: input.assistidoId,
        conteudo: input.texto,
        tipo: "whatsapp",
      }).returning({ id: anotacoes.id });

      await db.insert(whatsappMessageActions).values({
        messageId: input.messageId,
        actionType: "create_note",
        targetType: "anotacao",
        targetId: nota.id,
        processoId: input.processoId,
        createdById: ctx.userId,
      });

      return { noteId: nota.id };
    }),
```

- [ ] **Step 6: Add `toggleFavorite` mutation**

```typescript
  /**
   * toggleFavorite — toggle is_favorite on a message
   */
  toggleFavorite: protectedProcedure
    .input(z.object({ messageId: z.number() }))
    .mutation(async ({ input }) => {
      const msg = await db.query.whatsappChatMessages.findFirst({
        where: eq(whatsappChatMessages.id, input.messageId),
        columns: { id: true, isFavorite: true },
      });
      if (!msg) throw new TRPCError({ code: "NOT_FOUND" });

      const newVal = !msg.isFavorite;
      await db
        .update(whatsappChatMessages)
        .set({ isFavorite: newVal })
        .where(eq(whatsappChatMessages.id, input.messageId));

      return { isFavorite: newVal };
    }),
```

- [ ] **Step 7: Add `getQuickContext` endpoint for slash commands**

```typescript
  /**
   * getQuickContext — quick lookup for slash commands
   */
  getQuickContext: protectedProcedure
    .input(z.object({
      contactId: z.number(),
      tipo: z.enum(["prazos", "audiencias", "drive"]),
    }))
    .query(async ({ input }) => {
      const contact = await db.query.whatsappContacts.findFirst({
        where: eq(whatsappContacts.id, input.contactId),
      });
      if (!contact?.assistidoId) return { items: [] };

      if (input.tipo === "prazos") {
        const prazos = await db
          .select({ id: calculosPrazos.id, tipo: calculosPrazos.tipo, vencimento: calculosPrazos.dataFinal })
          .from(calculosPrazos)
          .innerJoin(assistidosProcessos, eq(assistidosProcessos.processoId, calculosPrazos.processoId))
          .where(and(
            eq(assistidosProcessos.assistidoId, contact.assistidoId),
            gte(calculosPrazos.dataFinal, new Date()),
          ))
          .orderBy(asc(calculosPrazos.dataFinal))
          .limit(5);
        return { items: prazos };
      }

      if (input.tipo === "audiencias") {
        const auds = await db
          .select({ id: audiencias.id, data: audiencias.data, tipo: audiencias.tipo })
          .from(audiencias)
          .innerJoin(assistidosProcessos, eq(assistidosProcessos.processoId, audiencias.processoId))
          .where(and(
            eq(assistidosProcessos.assistidoId, contact.assistidoId),
            gte(audiencias.data, new Date()),
          ))
          .orderBy(asc(audiencias.data))
          .limit(5);
        return { items: auds };
      }

      if (input.tipo === "drive") {
        const files = await db
          .select({ id: driveFiles.id, fileName: driveFiles.fileName, mimeType: driveFiles.mimeType, updatedAt: driveFiles.updatedAt })
          .from(driveFiles)
          .where(eq(driveFiles.assistidoId, contact.assistidoId))
          .orderBy(desc(driveFiles.updatedAt))
          .limit(5);
        return { items: files };
      }

      return { items: [] };
    }),
```

- [ ] **Step 8: Verify build**

```bash
npm run build 2>&1 | tail -5
```

Expected: Build succeeds. Note: some column references (like `audiencias.data`, `calculosPrazos.dataFinal`, `movimentacoes.tipo`) may need adjustment based on exact schema column names. If build fails, read the actual schema files for the correct column names:
- `src/lib/db/schema/agenda.ts` for `audiencias`
- `src/lib/db/schema/prazos.ts` for `calculosPrazos`
- `src/lib/db/schema/core.ts` for `movimentacoes`

Fix column references as needed.

- [ ] **Step 9: Commit**

```bash
git add src/lib/trpc/routers/whatsapp-chat.ts
git commit -m "feat(whatsapp): add 6 new tRPC endpoints for command center

- getContactContext: lightweight assistido + processo lookup
- getContactTimeline: audiência + prazo + movimentação
- saveMessageToProcess: save msg as documento/anotação on processo
- createNoteFromMessage: create anotação from chat message
- toggleFavorite: toggle is_favorite on message
- getQuickContext: slash command context (prazos/audiencias/drive)"
```

---

## Task 3: Frontend — Message Action Bar + Modals

**Files:**
- Create: `src/components/whatsapp/MessageActionBar.tsx`
- Create: `src/components/whatsapp/MessageActionModals.tsx`
- Modify: `src/components/whatsapp/MessageBubble.tsx`

**Depends on:** Task 2

- [ ] **Step 1: Create `MessageActionBar.tsx`**

Create `src/components/whatsapp/MessageActionBar.tsx`:

```typescript
"use client";

import { FileUp, PenLine, FolderUp, Star, MoreHorizontal, Copy, MessageSquareReply, Info } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface MessageActionBarProps {
  isFavorite: boolean;
  hasMedia: boolean;
  onSaveToProcess: () => void;
  onCreateNote: () => void;
  onSaveToDrive: () => void;
  onToggleFavorite: () => void;
  onCopy: () => void;
  onReply: () => void;
  onShowDetails: () => void;
}

function ActionButton({
  icon: Icon,
  label,
  onClick,
  className,
}: {
  icon: React.ElementType;
  label: string;
  onClick: () => void;
  className?: string;
}) {
  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={onClick}
            className={cn(
              "flex h-[30px] w-[30px] items-center justify-center rounded-md",
              "bg-zinc-700 hover:bg-zinc-600 transition-colors cursor-pointer",
              className
            )}
          >
            <Icon className="h-[15px] w-[15px]" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs">{label}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export function MessageActionBar(props: MessageActionBarProps) {
  return (
    <div className="absolute -top-3 right-2 flex gap-0.5 rounded-lg bg-zinc-800 border border-zinc-700 p-1 shadow-lg z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
      <ActionButton icon={FileUp} label="Salvar no Processo" onClick={props.onSaveToProcess} className="text-emerald-500" />
      <ActionButton icon={PenLine} label="Criar Anotação" onClick={props.onCreateNote} className="text-amber-500" />
      {props.hasMedia && (
        <ActionButton icon={FolderUp} label="Salvar no Drive" onClick={props.onSaveToDrive} className="text-indigo-500" />
      )}
      <ActionButton
        icon={Star}
        label={props.isFavorite ? "Remover favorito" : "Favoritar"}
        onClick={props.onToggleFavorite}
        className={props.isFavorite ? "text-amber-400" : "text-zinc-400"}
      />
      <div className="mx-0.5 w-px self-stretch bg-zinc-600" />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex h-[30px] w-[30px] items-center justify-center rounded-md bg-zinc-700 hover:bg-zinc-600 transition-colors cursor-pointer text-zinc-400">
            <MoreHorizontal className="h-[15px] w-[15px]" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          <DropdownMenuItem onClick={props.onCopy}><Copy className="mr-2 h-4 w-4" />Copiar texto</DropdownMenuItem>
          <DropdownMenuItem onClick={props.onReply}><MessageSquareReply className="mr-2 h-4 w-4" />Responder citando</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={props.onShowDetails}><Info className="mr-2 h-4 w-4" />Detalhes</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
```

- [ ] **Step 2: Create `MessageActionModals.tsx`**

Create `src/components/whatsapp/MessageActionModals.tsx` with three modals:
- `SaveToProcessModal`: Select processo (dropdown), tipo (radio: Documento/Anotação/Evidência), observação (textarea)
- `CreateNoteModal`: Textarea (pre-filled with message text), optional processo select
- `SaveToDriveModal`: Shows filename, pasta (pre-selected), rename input

Each modal uses shadcn `Dialog` + form. Calls the tRPC mutations from Task 2. Shows toast on success.

This file is large (~300 lines). The implementer should follow the pattern of the existing `SelectionActionModals.tsx` (953 lines) — same Dialog/form patterns. Key differences:
- Input props: `{ messageId, messageText, assistidoId, processoId, hasMedia, mediaFilename }`
- Each modal is a separate exported component
- Use `trpc.whatsappChat.saveMessageToProcess.useMutation()`, etc.

- [ ] **Step 3: Modify `MessageBubble.tsx` to add hover state and action bar**

In `src/components/whatsapp/MessageBubble.tsx`:

1. Add `group` class to the root wrapper div
2. Import and render `MessageActionBar` inside the message wrapper
3. Add new props to `MessageBubbleProps`:

```typescript
export interface MessageBubbleProps {
  // ... existing props ...
  isFavorite?: boolean;
  onSaveToProcess?: (msg: MessageBubbleMessage) => void;
  onCreateNote?: (msg: MessageBubbleMessage) => void;
  onSaveToDrive?: (msg: MessageBubbleMessage) => void;
  onToggleFavorite?: (msg: MessageBubbleMessage) => void;
}
```

4. Wrap the existing message content in a `relative group` div
5. Conditionally render `<MessageActionBar>` inside it (only when not in selection mode)

- [ ] **Step 4: Verify build**

```bash
npm run build 2>&1 | tail -5
```

- [ ] **Step 5: Commit**

```bash
git add src/components/whatsapp/MessageActionBar.tsx src/components/whatsapp/MessageActionModals.tsx src/components/whatsapp/MessageBubble.tsx
git commit -m "feat(whatsapp): add message hover action bar and action modals

- MessageActionBar: hover bar with FileUp, PenLine, FolderUp, Star, More
- MessageActionModals: SaveToProcess, CreateNote, SaveToDrive dialogs
- MessageBubble: group hover state, renders action bar"
```

---

## Task 4: Frontend — Context Panel (Sidebar)

**Files:**
- Create: `src/components/whatsapp/ContextPanel.tsx`
- Create: `src/components/whatsapp/ContextPanelProcesso.tsx`
- Create: `src/components/whatsapp/ContextPanelDrive.tsx`
- Create: `src/components/whatsapp/ContextPanelMidia.tsx`
- Modify: `src/app/(dashboard)/admin/whatsapp/chat/page.tsx`

**Depends on:** Task 2

- [ ] **Step 1: Create `ContextPanelProcesso.tsx`**

Renders cards for: Processo Ativo (emerald border-left), Próxima Audiência (amber), Prazo Aberto (red when < 7 days), Última Movimentação (indigo). Uses `trpc.whatsappChat.getContactTimeline.useQuery()`. Quick action buttons: Anexar, Anotar, Abrir (link to `/admin/processos/[id]`).

Empty state: "Nenhum processo ativo" with link to criar processo.

- [ ] **Step 2: Create `ContextPanelDrive.tsx`**

Lists files from `trpc.drive.listFiles.useQuery({ assistidoId })` (or adapt existing endpoint). Shows filename, type icon, size, date. Upload button. Empty state: "Nenhum arquivo".

- [ ] **Step 3: Create `ContextPanelMidia.tsx`**

Queries messages with media type from current conversation. Grid layout for images (thumbnails), list for docs/audio. Checkbox selection for batch save. "Salvar no Drive" button for selected items.

- [ ] **Step 4: Create `ContextPanel.tsx`**

Tab container using Tailwind tabs (not shadcn Tabs — to match existing chat patterns). Tabs: Processo | Drive | Mídia. Renders the sub-components. Props: `{ contactId, configId, assistidoId, onClose }`.

Empty state when no assistido linked: "Contato não vinculado. [Vincular a assistido]" with link.

- [ ] **Step 5: Modify chat page for 3-column layout**

In `src/app/(dashboard)/admin/whatsapp/chat/page.tsx`:

1. Replace the existing 2-column layout with a 3-column flex layout
2. Add state: `const [showContextPanel, setShowContextPanel] = useState(true)`
3. Persist in localStorage: `whatsapp_context_panel_open`
4. Render `ContextPanel` in the third column when a contact is selected and has assistido
5. Add PanelRight toggle button in the chat header

Layout structure:
```tsx
<div className="flex h-full">
  <div className="w-[240px] border-r border-zinc-800 flex-shrink-0">
    <ConversationList ... />
  </div>
  <div className="flex-1 min-w-0">
    <ChatWindow ... />
  </div>
  {showContextPanel && selectedContactId && (
    <div className="w-[280px] border-l border-zinc-800 flex-shrink-0">
      <ContextPanel ... />
    </div>
  )}
</div>
```

- [ ] **Step 6: Verify build**

```bash
npm run build 2>&1 | tail -5
```

- [ ] **Step 7: Commit**

```bash
git add src/components/whatsapp/ContextPanel*.tsx src/app/\(dashboard\)/admin/whatsapp/chat/page.tsx
git commit -m "feat(whatsapp): add context panel sidebar with Processo/Drive/Mídia tabs

- 3-column layout: conversations | chat | context panel
- Processo tab: cards for active case, audiência, prazo, movimentação
- Drive tab: file list from assistido's Drive folder
- Mídia tab: gallery of conversation media with batch save
- Toggle via PanelRight button, persisted in localStorage"
```

---

## Task 5: Frontend — Real-time polling + connection stability

**Files:**
- Modify: `src/components/whatsapp/ChatWindow.tsx`
- Modify: `src/components/whatsapp/ConversationList.tsx`
- Modify: `src/components/whatsapp/ConnectionStatus.tsx`
- Modify: `src/components/whatsapp/ScrollToBottom.tsx`
- Create: `src/components/whatsapp/DisconnectBanner.tsx`

**Depends on:** Task 3

- [ ] **Step 1: Add polling to ChatWindow**

In `ChatWindow.tsx`, add `refetchInterval: 5000` to the `listMessages` query. Only when chat is active (contactId exists).

- [ ] **Step 2: Add polling to ConversationList**

In `ConversationList.tsx`, add `refetchInterval: 15000` to the `listContacts` query. Add unread badge (green circle with count) using the existing `unreadCount` field.

- [ ] **Step 3: Create `DisconnectBanner.tsx`**

Fixed yellow/red banner at top of chat when connection lost > 30s. Button "Reconectar" calls `trpc.whatsappChat.restartInstance`. Auto-hides when connection restores.

- [ ] **Step 4: Enhance `ScrollToBottom.tsx`**

Add "↓ N novas mensagens" floating button when user has scrolled up and new messages arrive. Show count of new messages since last scroll-to-bottom.

- [ ] **Step 5: Add message order toggle**

In `ChatWindow.tsx`, add state `messageOrder: 'newest' | 'oldest'` (from localStorage). Toggle button in header (ArrowUpDown icon). Client-side array reversal — do NOT change the tRPC query.

- [ ] **Step 6: Verify build + test polling**

```bash
npm run build 2>&1 | tail -5
```

Start dev server and verify polling works (network tab shows requests every 5s/15s).

- [ ] **Step 7: Commit**

```bash
git add src/components/whatsapp/ChatWindow.tsx src/components/whatsapp/ConversationList.tsx src/components/whatsapp/ConnectionStatus.tsx src/components/whatsapp/ScrollToBottom.tsx src/components/whatsapp/DisconnectBanner.tsx
git commit -m "feat(whatsapp): add real-time polling, disconnect banner, order toggle

- Chat messages poll every 5s, contacts every 15s
- Unread badges on conversation list
- DisconnectBanner with reconnect button after 30s
- ScrollToBottom shows new message count
- Message order toggle (newest/oldest first, client-side)"
```

---

## Task 6: Frontend — Slash Commands expansion

**Files:**
- Modify: `src/components/whatsapp/SlashCommandMenu.tsx`
- Modify: `src/components/whatsapp/ChatWindow.tsx`

**Depends on:** Task 2

- [ ] **Step 1: Expand `SlashCommandMenu.tsx`**

Replace the current 111-line implementation with expanded version:

1. Define command registry:
```typescript
const COMMANDS = [
  { name: "nota", description: "Criar anotação no processo", icon: PenLine, requiresAssistido: true },
  { name: "prazo", description: "Ver prazos abertos", icon: Clock, requiresAssistido: true },
  { name: "audiencia", description: "Próxima audiência", icon: Calendar, requiresAssistido: true },
  { name: "processo", description: "Abrir processo", icon: Scale, requiresAssistido: true },
  { name: "drive", description: "Últimos arquivos do Drive", icon: FolderOpen, requiresAssistido: true },
  { name: "modelo", description: "Enviar template", icon: FileText, requiresAssistido: false },
];
```

2. Fuzzy filter: match command name and description against typed text after `/`
3. Keyboard navigation: ↑↓ to select, Enter to execute, Esc to cancel
4. Selected item preview (description + icon)
5. Execute handler dispatches to appropriate action (open modal, call tRPC, navigate)

- [ ] **Step 2: Wire commands into ChatWindow**

In `ChatWindow.tsx`, handle command execution:
- `/nota [text]`: call `createNoteFromMessage` mutation with text
- `/prazo`: call `getQuickContext({ tipo: 'prazos' })`, display as inline toast/card
- `/audiencia`: call `getQuickContext({ tipo: 'audiencias' })`, display inline
- `/processo`: `window.open('/admin/processos/' + processoId)`
- `/drive`: call `getQuickContext({ tipo: 'drive' })`, display inline
- `/modelo`: open existing template picker

- [ ] **Step 3: Verify build**

```bash
npm run build 2>&1 | tail -5
```

- [ ] **Step 4: Commit**

```bash
git add src/components/whatsapp/SlashCommandMenu.tsx src/components/whatsapp/ChatWindow.tsx
git commit -m "feat(whatsapp): expand slash commands to 6 commands with fuzzy search

- /nota, /prazo, /audiencia, /processo, /drive, /modelo
- Fuzzy filter on name + description
- Keyboard navigation (↑↓ Enter Esc)
- Context-aware: shows warning if contact not linked to assistido"
```

---

## Task 7: Frontend — Search improvements

**Files:**
- Modify: `src/components/whatsapp/ChatWindow.tsx`
- Modify: `src/components/whatsapp/ConversationList.tsx`

**Depends on:** Task 5

- [ ] **Step 1: Add search-in-chat to ChatWindow**

In `ChatWindow.tsx`:
1. Add `searchOpen` state + Search icon button in header
2. When open, show inline input below header
3. Call existing `searchMessages` endpoint with debounce 300ms
4. Highlight matches in message list using `<mark>` tags
5. Show "N de M resultados" counter
6. ↑↓ to navigate between matches, scroll to each

- [ ] **Step 2: Enhance ConversationList search**

In `ConversationList.tsx`:
1. Add debounced search input at top (300ms)
2. Client-side filter on: pushName, phone, lastMessage
3. Highlight matching text in results

- [ ] **Step 3: Verify build**

```bash
npm run build 2>&1 | tail -5
```

- [ ] **Step 4: Commit**

```bash
git add src/components/whatsapp/ChatWindow.tsx src/components/whatsapp/ConversationList.tsx
git commit -m "feat(whatsapp): add in-chat search and conversation search improvements

- Search within chat: highlights matches, ↑↓ navigation, counter
- Conversation list: debounced filter on name/phone/lastMessage"
```

---

## Task 8: Deploy + verify

**Depends on:** All previous tasks

- [ ] **Step 1: Full build check**

```bash
npm run build
```

Expected: Exit code 0, no type errors.

- [ ] **Step 2: Deploy to production**

```bash
vercel --prod 2>&1 | tail -3
```

Expected: `Aliased: https://ombuds.vercel.app`

- [ ] **Step 3: Verify in production**

Open `https://ombuds.vercel.app/admin/whatsapp/chat` and check:
- 3-column layout renders
- Context panel shows for linked contacts
- Message hover bar appears
- Slash command menu opens with `/`

- [ ] **Step 4: Final commit (if any fixes)**

```bash
git add -A && git commit -m "fix: post-deploy adjustments for WhatsApp Command Center"
```
