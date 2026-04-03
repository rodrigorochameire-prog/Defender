# Feedback Colaborativo — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir que defensores colegas enviem feedbacks (bug, sugestão, dúvida) de qualquer página do OMBUDS, com triagem admin e exportação para Jira.

**Architecture:** Botão flutuante global (providers.tsx) → formulário popover → tRPC mutation → tabela `feedbacks` (PostgreSQL/Drizzle) → página admin com listagem/filtros → exportação Jira via API.

**Tech Stack:** Next.js 15, tRPC, Drizzle ORM, PostgreSQL (Supabase), Tailwind CSS, shadcn/ui, Lucide, sonner, Jira REST API.

**Spec:** `docs/superpowers/specs/2026-04-03-feedback-colaborativo-design.md`

---

## File Structure

| Action | Path | Responsibility |
|--------|------|---------------|
| Create | `src/lib/db/schema/feedback.ts` | Tabela + enums Drizzle |
| Modify | `src/lib/db/schema/enums.ts` | Adicionar enums de feedback |
| Modify | `src/lib/db/index.ts` | Exportar nova tabela |
| Create | `src/lib/trpc/routers/feedbacks.ts` | Router tRPC (create, list, updateStatus, exportToJira) |
| Modify | `src/lib/trpc/routers/index.ts` | Registrar feedbacksRouter |
| Create | `src/components/shared/feedback-fab.tsx` | Botão flutuante + formulário popover |
| Modify | `src/app/providers.tsx` | Montar FeedbackFAB global |
| Create | `src/app/(dashboard)/admin/feedbacks/page.tsx` | Página admin de triagem |
| Create | `src/lib/jira/create-ticket.ts` | Função de criação de ticket Jira |

---

## Task 1: Schema — Enums e Tabela `feedbacks`

**Files:**
- Modify: `src/lib/db/schema/enums.ts`
- Create: `src/lib/db/schema/feedback.ts`
- Modify: `src/lib/db/index.ts`

- [ ] **Step 1: Adicionar enums no arquivo de enums**

Em `src/lib/db/schema/enums.ts`, adicionar ao final:

```typescript
export const feedbackTipoEnum = pgEnum("feedback_tipo", [
  "bug",
  "sugestao",
  "duvida",
]);

export const feedbackStatusEnum = pgEnum("feedback_status", [
  "novo",
  "visto",
  "enviado_jira",
  "descartado",
]);
```

- [ ] **Step 2: Criar arquivo de schema `feedback.ts`**

Criar `src/lib/db/schema/feedback.ts`:

```typescript
import {
  pgTable,
  serial,
  text,
  varchar,
  timestamp,
  integer,
  jsonb,
  index,
} from "drizzle-orm/pg-core";
import { feedbackTipoEnum, feedbackStatusEnum } from "./enums";
import { users } from "./core";

export const feedbacks = pgTable("feedbacks", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id),
  tipo: feedbackTipoEnum("tipo").notNull(),
  mensagem: text("mensagem").notNull(),
  pagina: text("pagina"),
  contexto: jsonb("contexto").$type<{
    viewport?: string;
    userAgent?: string;
    consoleErrors?: string[];
  }>(),
  status: feedbackStatusEnum("status").notNull().default("novo"),
  jiraTicketId: varchar("jira_ticket_id", { length: 50 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("feedbacks_user_id_idx").on(table.userId),
  index("feedbacks_status_idx").on(table.status),
  index("feedbacks_created_at_idx").on(table.createdAt),
]);

export type Feedback = typeof feedbacks.$inferSelect;
export type InsertFeedback = typeof feedbacks.$inferInsert;
```

- [ ] **Step 3: Exportar tabela no barrel file**

Em `src/lib/db/index.ts`, adicionar a exportação:

```typescript
export { feedbacks } from "./schema/feedback";
```

- [ ] **Step 4: Aplicar migration no banco**

Run: `npx drizzle-kit push`

Ou, se interativo, rodar SQL direto:

```sql
CREATE TYPE feedback_tipo AS ENUM ('bug', 'sugestao', 'duvida');
CREATE TYPE feedback_status AS ENUM ('novo', 'visto', 'enviado_jira', 'descartado');

CREATE TABLE feedbacks (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  tipo feedback_tipo NOT NULL,
  mensagem TEXT NOT NULL,
  pagina TEXT,
  contexto JSONB,
  status feedback_status NOT NULL DEFAULT 'novo',
  jira_ticket_id VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX feedbacks_user_id_idx ON feedbacks(user_id);
CREATE INDEX feedbacks_status_idx ON feedbacks(status);
CREATE INDEX feedbacks_created_at_idx ON feedbacks(created_at);
```

- [ ] **Step 5: Commit**

```bash
git add src/lib/db/schema/enums.ts src/lib/db/schema/feedback.ts src/lib/db/index.ts
git commit -m "feat(feedback): add feedbacks table schema with tipo/status enums"
```

---

## Task 2: Router tRPC — CRUD de feedbacks

**Files:**
- Create: `src/lib/trpc/routers/feedbacks.ts`
- Modify: `src/lib/trpc/routers/index.ts`

- [ ] **Step 1: Criar router de feedbacks**

Criar `src/lib/trpc/routers/feedbacks.ts`:

```typescript
import { z } from "zod";
import { router, protectedProcedure } from "../init";
import { db } from "@/lib/db";
import { feedbacks } from "@/lib/db/schema/feedback";
import { users } from "@/lib/db/schema/core";
import { eq, desc, and, SQL } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

export const feedbacksRouter = router({
  create: protectedProcedure
    .input(
      z.object({
        tipo: z.enum(["bug", "sugestao", "duvida"]),
        mensagem: z.string().min(1).max(500),
        pagina: z.string().optional(),
        contexto: z
          .object({
            viewport: z.string().optional(),
            userAgent: z.string().optional(),
            consoleErrors: z.array(z.string()).optional(),
          })
          .optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const [feedback] = await db
        .insert(feedbacks)
        .values({
          userId: ctx.user.id,
          tipo: input.tipo,
          mensagem: input.mensagem,
          pagina: input.pagina,
          contexto: input.contexto as any,
        })
        .returning();

      return feedback;
    }),

  list: protectedProcedure
    .input(
      z
        .object({
          tipo: z.enum(["bug", "sugestao", "duvida"]).optional(),
          status: z
            .enum(["novo", "visto", "enviado_jira", "descartado"])
            .optional(),
        })
        .optional()
    )
    .query(async ({ input, ctx }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Apenas administradores podem listar feedbacks",
        });
      }

      const conditions: SQL[] = [];
      if (input?.tipo) conditions.push(eq(feedbacks.tipo, input.tipo));
      if (input?.status) conditions.push(eq(feedbacks.status, input.status));

      const result = await db
        .select({
          id: feedbacks.id,
          tipo: feedbacks.tipo,
          mensagem: feedbacks.mensagem,
          pagina: feedbacks.pagina,
          contexto: feedbacks.contexto,
          status: feedbacks.status,
          jiraTicketId: feedbacks.jiraTicketId,
          createdAt: feedbacks.createdAt,
          userName: users.nome,
        })
        .from(feedbacks)
        .leftJoin(users, eq(feedbacks.userId, users.id))
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(feedbacks.createdAt));

      return result;
    }),

  updateStatus: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        status: z.enum(["novo", "visto", "enviado_jira", "descartado"]),
        jiraTicketId: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Apenas administradores podem atualizar feedbacks",
        });
      }

      const [updated] = await db
        .update(feedbacks)
        .set({
          status: input.status,
          ...(input.jiraTicketId && { jiraTicketId: input.jiraTicketId }),
        })
        .where(eq(feedbacks.id, input.id))
        .returning();

      return updated;
    }),
});
```

- [ ] **Step 2: Registrar router no index**

Em `src/lib/trpc/routers/index.ts`, adicionar import e registro:

```typescript
import { feedbacksRouter } from "./feedbacks";

// No objeto appRouter, seção adequada:
feedbacks: feedbacksRouter,
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/trpc/routers/feedbacks.ts src/lib/trpc/routers/index.ts
git commit -m "feat(feedback): add feedbacks tRPC router with create/list/updateStatus"
```

---

## Task 3: FeedbackFAB — Botão flutuante + formulário

**Files:**
- Create: `src/components/shared/feedback-fab.tsx`
- Modify: `src/app/providers.tsx`

- [ ] **Step 1: Criar componente FeedbackFAB**

Criar `src/components/shared/feedback-fab.tsx`:

```tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { MessageSquarePlus, Bug, Lightbulb, HelpCircle, X, Send, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc/client";
import { toast } from "sonner";

const TIPOS = [
  { value: "bug" as const, label: "Bug", icon: Bug, color: "text-rose-500 border-rose-300 bg-rose-50 dark:bg-rose-950/30 dark:border-rose-800" },
  { value: "sugestao" as const, label: "Sugestão", icon: Lightbulb, color: "text-emerald-600 border-emerald-300 bg-emerald-50 dark:bg-emerald-950/30 dark:border-emerald-800" },
  { value: "duvida" as const, label: "Dúvida", icon: HelpCircle, color: "text-blue-500 border-blue-300 bg-blue-50 dark:bg-blue-950/30 dark:border-blue-800" },
] as const;

type FeedbackTipo = typeof TIPOS[number]["value"];

// Captura erros do console em memória
const consoleErrors: string[] = [];
if (typeof window !== "undefined") {
  window.addEventListener("error", (e) => {
    consoleErrors.push(`${e.message} (${e.filename}:${e.lineno})`);
    if (consoleErrors.length > 5) consoleErrors.shift();
  });
  window.addEventListener("unhandledrejection", (e) => {
    consoleErrors.push(`Unhandled: ${e.reason}`);
    if (consoleErrors.length > 5) consoleErrors.shift();
  });
}

export function FeedbackFAB() {
  const [isOpen, setIsOpen] = useState(false);
  const [tipo, setTipo] = useState<FeedbackTipo | null>(null);
  const [mensagem, setMensagem] = useState("");
  const pathname = usePathname();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const createMutation = trpc.feedbacks.create.useMutation({
    onSuccess: () => {
      toast.success("Feedback enviado, obrigado!");
      setIsOpen(false);
      setTipo(null);
      setMensagem("");
    },
    onError: (error) => {
      toast.error("Erro ao enviar feedback", { description: error.message });
    },
  });

  useEffect(() => {
    if (isOpen && textareaRef.current) {
      setTimeout(() => textareaRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Fechar com Escape
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    if (isOpen) window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [isOpen]);

  const handleSubmit = () => {
    if (!tipo || !mensagem.trim()) return;

    createMutation.mutate({
      tipo,
      mensagem: mensagem.trim(),
      pagina: pathname,
      contexto: {
        viewport: `${window.innerWidth}x${window.innerHeight}`,
        userAgent: navigator.userAgent,
        consoleErrors: consoleErrors.length > 0 ? [...consoleErrors] : undefined,
      },
    });
  };

  // Não mostrar na página de login
  if (pathname === "/login") return null;

  return (
    <>
      {/* FAB Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "fixed z-[52] flex items-center justify-center",
          "w-11 h-11 rounded-full shadow-lg",
          "bg-zinc-900 dark:bg-zinc-700 text-white",
          "hover:bg-emerald-600 dark:hover:bg-emerald-600",
          "transition-all duration-200 active:scale-95",
          "bottom-[8.5rem] right-4 sm:bottom-6 sm:right-[4.5rem]",
          isOpen && "bg-emerald-600 dark:bg-emerald-600 rotate-45"
        )}
        aria-label="Enviar feedback"
      >
        {isOpen ? <X className="w-5 h-5 -rotate-45" /> : <MessageSquarePlus className="w-5 h-5" />}
      </button>

      {/* Popover */}
      {isOpen && (
        <div
          className={cn(
            "fixed z-[52] w-80 sm:w-96",
            "bottom-[12rem] right-4 sm:bottom-[4.5rem] sm:right-[8rem]",
            "bg-white dark:bg-zinc-900 rounded-xl",
            "border border-zinc-200 dark:border-zinc-700",
            "shadow-2xl shadow-black/10 dark:shadow-black/30",
            "animate-in fade-in slide-in-from-bottom-2 duration-200",
          )}
        >
          {/* Header */}
          <div className="px-4 py-3 border-b border-zinc-100 dark:border-zinc-800">
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
              Enviar feedback
            </h3>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
              Sua opinião ajuda a melhorar o OMBUDS
            </p>
          </div>

          {/* Body */}
          <div className="p-4 space-y-3">
            {/* Tipo chips */}
            <div className="flex gap-2">
              {TIPOS.map((t) => {
                const Icon = t.icon;
                const isSelected = tipo === t.value;
                return (
                  <button
                    key={t.value}
                    onClick={() => setTipo(t.value)}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium",
                      "border transition-all duration-150",
                      isSelected
                        ? t.color
                        : "border-zinc-200 dark:border-zinc-700 text-zinc-500 dark:text-zinc-400 hover:border-zinc-300 dark:hover:border-zinc-600",
                    )}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {t.label}
                  </button>
                );
              })}
            </div>

            {/* Textarea */}
            <textarea
              ref={textareaRef}
              value={mensagem}
              onChange={(e) => setMensagem(e.target.value.slice(0, 500))}
              placeholder="Descreva o que aconteceu ou o que poderia melhorar..."
              rows={3}
              className={cn(
                "w-full resize-none rounded-lg border px-3 py-2 text-sm",
                "border-zinc-200 dark:border-zinc-700",
                "bg-zinc-50 dark:bg-zinc-800/50",
                "text-zinc-900 dark:text-zinc-100",
                "placeholder:text-zinc-400 dark:placeholder:text-zinc-500",
                "focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400",
                "transition-colors duration-150",
              )}
            />
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-zinc-400">
                {mensagem.length}/500
              </span>
              <button
                onClick={handleSubmit}
                disabled={!tipo || !mensagem.trim() || createMutation.isPending}
                className={cn(
                  "flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-medium",
                  "bg-emerald-600 text-white",
                  "hover:bg-emerald-700 active:scale-95",
                  "disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100",
                  "transition-all duration-150",
                )}
              >
                {createMutation.isPending ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Send className="w-3.5 h-3.5" />
                )}
                Enviar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
```

- [ ] **Step 2: Montar FeedbackFAB no providers.tsx**

Em `src/app/providers.tsx`, adicionar import e renderizar antes do `<Toaster />`:

```typescript
import { FeedbackFAB } from "@/components/shared/feedback-fab";

// Dentro do JSX, após </Suspense> e antes de <Toaster />:
<FeedbackFAB />
```

- [ ] **Step 3: Testar no browser**

1. Abrir qualquer página do dashboard
2. Verificar que o botão aparece no canto inferior direito
3. Clicar → popover abre
4. Selecionar tipo, escrever mensagem, enviar
5. Toast de sucesso aparece
6. Verificar no banco: `SELECT * FROM feedbacks ORDER BY created_at DESC LIMIT 1;`

- [ ] **Step 4: Commit**

```bash
git add src/components/shared/feedback-fab.tsx src/app/providers.tsx
git commit -m "feat(feedback): add FeedbackFAB floating button with popover form"
```

---

## Task 4: Página Admin — Triagem de feedbacks

**Files:**
- Create: `src/app/(dashboard)/admin/feedbacks/page.tsx`

- [ ] **Step 1: Criar página admin de feedbacks**

Criar `src/app/(dashboard)/admin/feedbacks/page.tsx`:

```tsx
"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import {
  Bug, Lightbulb, HelpCircle, MessageSquare,
  ExternalLink, Trash2, Eye, Loader2, Filter,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const TIPO_CONFIG = {
  bug: { label: "Bug", icon: Bug, badge: "danger" as const },
  sugestao: { label: "Sugestão", icon: Lightbulb, badge: "success" as const },
  duvida: { label: "Dúvida", icon: HelpCircle, badge: "info" as const },
};

const STATUS_CONFIG = {
  novo: { label: "Novo", className: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  visto: { label: "Visto", className: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400" },
  enviado_jira: { label: "No Jira", className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" },
  descartado: { label: "Descartado", className: "bg-zinc-100 text-zinc-400 dark:bg-zinc-800 dark:text-zinc-500 line-through" },
};

export default function FeedbacksPage() {
  const [filtroTipo, setFiltroTipo] = useState<string | undefined>();
  const [filtroStatus, setFiltroStatus] = useState<string | undefined>();

  const { data: feedbackList, isLoading, refetch } = trpc.feedbacks.list.useQuery({
    tipo: filtroTipo as any,
    status: filtroStatus as any,
  });

  const updateStatus = trpc.feedbacks.updateStatus.useMutation({
    onSuccess: () => {
      refetch();
      toast.success("Status atualizado");
    },
    onError: (e) => toast.error(e.message),
  });

  const novosCount = feedbackList?.filter((f) => f.status === "novo").length ?? 0;

  return (
    <div className="min-h-screen bg-zinc-100 dark:bg-[#0f0f11]">
      {/* Header Padrão Defender */}
      <div className="px-4 md:px-6 py-4 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-zinc-900 dark:bg-white flex items-center justify-center shadow-lg">
              <MessageSquare className="w-5 h-5 text-white dark:text-zinc-900" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">
                Feedbacks
              </h1>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                {novosCount > 0 ? `${novosCount} novo${novosCount > 1 ? "s" : ""}` : "Nenhum feedback novo"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="px-4 md:px-6 py-3 flex gap-2 flex-wrap border-b border-zinc-200 dark:border-zinc-800 bg-white/50 dark:bg-zinc-900/50">
        <button
          onClick={() => setFiltroTipo(undefined)}
          className={cn(
            "px-3 py-1 rounded-full text-xs font-medium border transition-colors",
            !filtroTipo
              ? "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 border-transparent"
              : "border-zinc-200 dark:border-zinc-700 text-zinc-500 hover:border-zinc-300"
          )}
        >
          Todos
        </button>
        {Object.entries(TIPO_CONFIG).map(([key, cfg]) => (
          <button
            key={key}
            onClick={() => setFiltroTipo(filtroTipo === key ? undefined : key)}
            className={cn(
              "px-3 py-1 rounded-full text-xs font-medium border transition-colors",
              filtroTipo === key
                ? "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 border-transparent"
                : "border-zinc-200 dark:border-zinc-700 text-zinc-500 hover:border-zinc-300"
            )}
          >
            {cfg.label}
          </button>
        ))}
        <div className="w-px bg-zinc-200 dark:bg-zinc-700 mx-1" />
        {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
          <button
            key={key}
            onClick={() => setFiltroStatus(filtroStatus === key ? undefined : key)}
            className={cn(
              "px-3 py-1 rounded-full text-xs font-medium border transition-colors",
              filtroStatus === key
                ? "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 border-transparent"
                : "border-zinc-200 dark:border-zinc-700 text-zinc-500 hover:border-zinc-300"
            )}
          >
            {cfg.label}
          </button>
        ))}
      </div>

      {/* Lista */}
      <div className="px-4 md:px-6 py-4 space-y-3">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-zinc-400" />
          </div>
        ) : feedbackList?.length === 0 ? (
          <div className="text-center py-12 text-zinc-400 text-sm">
            Nenhum feedback encontrado
          </div>
        ) : (
          feedbackList?.map((fb) => {
            const tipoCfg = TIPO_CONFIG[fb.tipo as keyof typeof TIPO_CONFIG];
            const statusCfg = STATUS_CONFIG[fb.status as keyof typeof STATUS_CONFIG];
            const TipoIcon = tipoCfg.icon;

            return (
              <div
                key={fb.id}
                className={cn(
                  "bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800",
                  "p-4 space-y-2 transition-colors",
                  fb.status === "descartado" && "opacity-50",
                )}
              >
                {/* Top row: tipo + status + data */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant={tipoCfg.badge} className="text-[10px]">
                      <TipoIcon className="w-3 h-3 mr-1" />
                      {tipoCfg.label}
                    </Badge>
                    <span className={cn("text-[10px] px-2 py-0.5 rounded-full font-medium", statusCfg.className)}>
                      {statusCfg.label}
                    </span>
                  </div>
                  <span className="text-[10px] text-zinc-400 tabular-nums">
                    {new Date(fb.createdAt).toLocaleDateString("pt-BR", {
                      day: "2-digit",
                      month: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>

                {/* Mensagem */}
                <p className="text-sm text-zinc-700 dark:text-zinc-300">
                  {fb.mensagem}
                </p>

                {/* Meta */}
                <div className="flex items-center justify-between text-[10px] text-zinc-400">
                  <span>{fb.userName ?? "Usuário"} · {fb.pagina ?? "—"}</span>
                  <div className="flex items-center gap-1">
                    {fb.status === "novo" && (
                      <Button
                        variant="ghost"
                        size="xs"
                        onClick={() => updateStatus.mutate({ id: fb.id, status: "visto" })}
                      >
                        <Eye className="w-3.5 h-3.5 mr-1" />
                        Visto
                      </Button>
                    )}
                    {fb.status !== "enviado_jira" && fb.status !== "descartado" && (
                      <Button
                        variant="ghost"
                        size="xs"
                        onClick={() => updateStatus.mutate({ id: fb.id, status: "descartado" })}
                      >
                        <Trash2 className="w-3.5 h-3.5 mr-1" />
                        Descartar
                      </Button>
                    )}
                    {fb.jiraTicketId && (
                      <a
                        href={`https://ombuds.atlassian.net/browse/${fb.jiraTicketId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-emerald-600 hover:underline flex items-center gap-0.5"
                      >
                        <ExternalLink className="w-3 h-3" />
                        {fb.jiraTicketId}
                      </a>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Testar no browser**

1. Acessar `/admin/feedbacks`
2. Verificar que lista feedbacks existentes
3. Testar filtros por tipo e status
4. Testar ações: marcar como visto, descartar

- [ ] **Step 3: Commit**

```bash
git add src/app/\(dashboard\)/admin/feedbacks/page.tsx
git commit -m "feat(feedback): add admin feedbacks page with filters and status actions"
```

---

## Task 5: Exportação para Jira

**Files:**
- Create: `src/lib/jira/create-ticket.ts`
- Modify: `src/lib/trpc/routers/feedbacks.ts`
- Modify: `src/app/(dashboard)/admin/feedbacks/page.tsx`

- [ ] **Step 1: Criar função de criação de ticket Jira**

Criar `src/lib/jira/create-ticket.ts`:

```typescript
const JIRA_BASE = "https://ombuds.atlassian.net";
const JIRA_PROJECT = "SCRUM";

const TIPO_TO_JIRA: Record<string, { issueType: string }> = {
  bug: { issueType: "Bug" },
  sugestao: { issueType: "Story" },
  duvida: { issueType: "Task" },
};

const PRIORIDADE_TO_JIRA: Record<string, string> = {
  baixa: "Low",
  media: "Medium",
  alta: "High",
};

interface CreateJiraTicketInput {
  tipo: string;
  mensagem: string;
  pagina?: string | null;
  contexto?: {
    viewport?: string;
    userAgent?: string;
    consoleErrors?: string[];
  } | null;
  userName?: string | null;
  createdAt: Date;
  prioridade: "baixa" | "media" | "alta";
}

export async function createJiraTicket(input: CreateJiraTicketInput) {
  const jiraEmail = process.env.JIRA_EMAIL;
  const jiraToken = process.env.JIRA_API_TOKEN;

  if (!jiraEmail || !jiraToken) {
    throw new Error("JIRA_EMAIL e JIRA_API_TOKEN devem estar configurados no .env");
  }

  const tipoConfig = TIPO_TO_JIRA[input.tipo] ?? { issueType: "Task" };
  const errorsText =
    input.contexto?.consoleErrors?.length
      ? input.contexto.consoleErrors.map((e) => `- ${e}`).join("\n")
      : "nenhum";

  const description = [
    `h2. Feedback de usuário`,
    `${input.mensagem}`,
    ``,
    `h2. Contexto técnico`,
    `- *Página:* ${input.pagina ?? "—"}`,
    `- *Viewport:* ${input.contexto?.viewport ?? "—"}`,
    `- *Navegador:* ${input.contexto?.userAgent ?? "—"}`,
    `- *Data:* ${input.createdAt.toLocaleString("pt-BR")}`,
    `- *Usuário:* ${input.userName ?? "—"}`,
    `- *Erros console:* ${errorsText}`,
    ``,
    `----`,
    `_Enviado via OMBUDS Feedback_`,
  ].join("\n");

  const body = {
    fields: {
      project: { key: JIRA_PROJECT },
      summary: `[feedback-${input.tipo}] ${input.mensagem.slice(0, 80)}`,
      description,
      issuetype: { name: tipoConfig.issueType },
      priority: { name: PRIORIDADE_TO_JIRA[input.prioridade] ?? "Medium" },
      labels: ["feedback-usuario"],
    },
  };

  const res = await fetch(`${JIRA_BASE}/rest/api/2/issue`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${jiraEmail}:${jiraToken}`).toString("base64")}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Jira API error (${res.status}): ${error}`);
  }

  const data = await res.json();
  return { key: data.key as string, id: data.id as string };
}
```

- [ ] **Step 2: Adicionar procedure `exportToJira` no router**

Em `src/lib/trpc/routers/feedbacks.ts`, adicionar:

```typescript
import { createJiraTicket } from "@/lib/jira/create-ticket";

// Dentro do router, adicionar:
exportToJira: protectedProcedure
  .input(
    z.object({
      id: z.number(),
      prioridade: z.enum(["baixa", "media", "alta"]),
    })
  )
  .mutation(async ({ input, ctx }) => {
    if (ctx.user.role !== "admin") {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Apenas administradores podem exportar para Jira",
      });
    }

    // Buscar feedback com nome do usuário
    const [fb] = await db
      .select({
        id: feedbacks.id,
        tipo: feedbacks.tipo,
        mensagem: feedbacks.mensagem,
        pagina: feedbacks.pagina,
        contexto: feedbacks.contexto,
        createdAt: feedbacks.createdAt,
        userName: users.nome,
      })
      .from(feedbacks)
      .leftJoin(users, eq(feedbacks.userId, users.id))
      .where(eq(feedbacks.id, input.id));

    if (!fb) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Feedback não encontrado" });
    }

    const ticket = await createJiraTicket({
      tipo: fb.tipo,
      mensagem: fb.mensagem,
      pagina: fb.pagina,
      contexto: fb.contexto as any,
      userName: fb.userName,
      createdAt: fb.createdAt,
      prioridade: input.prioridade,
    });

    // Atualizar status
    await db
      .update(feedbacks)
      .set({ status: "enviado_jira", jiraTicketId: ticket.key })
      .where(eq(feedbacks.id, input.id));

    return { ticketKey: ticket.key };
  }),
```

- [ ] **Step 3: Adicionar botão "Enviar pro Jira" na página admin**

Na página `admin/feedbacks/page.tsx`, adicionar dropdown de prioridade e botão de export para cada feedback com status `novo` ou `visto`. Usar um estado local `exportingId` para controlar qual feedback está sendo exportado e um dropdown simples para prioridade.

- [ ] **Step 4: Testar fluxo completo**

1. Enviar feedback pelo FAB
2. Acessar `/admin/feedbacks`
3. Clicar "Enviar pro Jira" → escolher prioridade → confirmar
4. Verificar que ticket foi criado no Jira (`ombuds.atlassian.net`)
5. Verificar que status mudou para `enviado_jira` com o ticket ID

- [ ] **Step 5: Commit**

```bash
git add src/lib/jira/create-ticket.ts src/lib/trpc/routers/feedbacks.ts src/app/\(dashboard\)/admin/feedbacks/page.tsx
git commit -m "feat(feedback): add Jira export with priority selection"
```

---

## Task 6: Sidebar link + polish final

**Files:**
- Modify: `src/components/layouts/admin-sidebar.tsx` (ou equivalente)

- [ ] **Step 1: Adicionar link na sidebar**

No componente de sidebar admin, adicionar item de menu para feedbacks (seção de admin/gestão):

```typescript
{ label: "Feedbacks", href: "/admin/feedbacks", icon: MessageSquare }
```

Com badge de contagem de feedbacks novos (opcional — pode ser adicionado depois).

- [ ] **Step 2: Teste end-to-end completo**

1. Logar como usuário normal → ver botão flutuante → enviar feedback
2. Logar como admin → sidebar mostra "Feedbacks" → página lista o feedback
3. Filtrar por tipo e status
4. Marcar como visto, descartar
5. Enviar pro Jira → verificar no board
6. Testar no mobile (popover se ajusta)
7. Testar dark mode

- [ ] **Step 3: Commit final**

```bash
git add -A
git commit -m "feat(feedback): add sidebar link and final polish"
```
