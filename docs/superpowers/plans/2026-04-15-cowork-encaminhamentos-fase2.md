# Cowork Encaminhamentos — Fase 2 (UI) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Construir UI nova do Cowork — aba "Encaminhamentos" (inbox + detalhe), modal de criação, badges nos cards do Kanban, entry points em demanda/processo/assistido. Consumir o backend da Fase 1 já mergeado em main.

**Architecture:** Seguir Padrão Defender v5 (header escuro HSL 240 2%, cards brancos, mini-card list pattern, ícones Lucide, zero emoji). Reaproveitar `CollapsiblePageHeader` existente na página `/admin/cowork`. Componentes novos em `src/components/cowork/encaminhamentos/`. Modal global via portal. Badges nos cards do Kanban com cores **indigo/sky/violet/stone/rose** (não conflitam com atribuição emerald/amber/sky/zinc).

**Tech Stack:** Next.js App Router, React Server Components, tRPC client, Tailwind CSS, Radix UI (dropdowns/modals), Lucide icons, MediaRecorder API (áudio).

**Spec:** `docs/superpowers/specs/2026-04-15-cowork-encaminhamentos-design.md`
**Fase 1 (merged):** PR #34 — backend tRPC `encaminhamentos` com 11 endpoints prontos para consumo.

**Mockups de referência:** `.superpowers/brainstorm/71186-1776282140/content/inbox-cowork-v2.html` + `modal-create.html`

---

## File Structure

**Criar:**
- `src/components/cowork/encaminhamentos/EncaminhamentosInbox.tsx` — grid 380/1fr, list + detail
- `src/components/cowork/encaminhamentos/EncaminhamentoListItem.tsx` — mini-card list item
- `src/components/cowork/encaminhamentos/EncaminhamentoDetalhe.tsx` — pane direito com header, about, mensagem, anexos, ações, thread
- `src/components/cowork/encaminhamentos/NovoEncaminhamentoModal.tsx` — modal de criação
- `src/components/cowork/encaminhamentos/TipoEncaminhamentoSelector.tsx` — 5 pills horizontais
- `src/components/cowork/encaminhamentos/DestinatarioPicker.tsx` — combobox multi-select com avatares
- `src/components/cowork/encaminhamentos/AnexoButton.tsx` — MediaRecorder audio + Drive picker
- `src/components/cowork/encaminhamentos/NotificacaoToggles.tsx` — 3 toggles (OMBUDS/WhatsApp/Email)
- `src/components/cowork/encaminhamentos/EncaminhamentoBadge.tsx` — badge pequeno pra cards de kanban
- `src/components/cowork/encaminhamentos/tipo-colors.ts` — mapa de cores e ícones por tipo
- `src/app/(dashboard)/admin/pareceres/redirect.tsx` — redirect helper para novo URL

**Modificar:**
- `src/app/(dashboard)/admin/cowork/page.tsx` — adicionar aba "Encaminhamentos" ao CollapsiblePageHeader e renderizar inbox quando ativa
- `src/components/demandas-premium/kanban-card.tsx` (ou equivalente) — adicionar menu "Encaminhar" e badges de encaminhamento ativo
- `src/app/(dashboard)/admin/processos/[id]/page.tsx` — botão "Cowork" no header com contexto pré-preenchido
- `src/app/(dashboard)/admin/assistidos/[id]/page.tsx` — mesmo botão
- `src/app/(dashboard)/admin/pareceres/page.tsx` — redirect para `/admin/cowork?tab=encaminhamentos&tipo=parecer`

---

### Task 1: Primitivas de tipo — cores/ícones e Badge

**Files:**
- Create: `src/components/cowork/encaminhamentos/tipo-colors.ts`
- Create: `src/components/cowork/encaminhamentos/EncaminhamentoBadge.tsx`

- [ ] **Step 1: Criar tipo-colors.ts**

```ts
import { ArrowRightLeft, Forward, Eye, StickyNote, HelpCircle, type LucideIcon } from "lucide-react";

export type EncaminhamentoTipo = "transferir" | "encaminhar" | "acompanhar" | "anotar" | "parecer";

export interface TipoMeta {
  label: string;
  Icon: LucideIcon;
  colorBar: string;       // tailwind bg-xxx pra barra lateral (3-4px)
  chipBg: string;         // tailwind bg-xxx pra chip
  chipText: string;       // tailwind text-xxx pra chip
  hint: string;           // texto curto no selector
}

export const TIPO_META: Record<EncaminhamentoTipo, TipoMeta> = {
  transferir: {
    label: "Transferir",
    Icon: ArrowRightLeft,
    colorBar: "bg-indigo-600",
    chipBg: "bg-indigo-50 dark:bg-indigo-950/40",
    chipText: "text-indigo-700 dark:text-indigo-300",
    hint: "Passa a titularidade",
  },
  encaminhar: {
    label: "Encaminhar",
    Icon: Forward,
    colorBar: "bg-sky-600",
    chipBg: "bg-sky-50 dark:bg-sky-950/40",
    chipText: "text-sky-700 dark:text-sky-300",
    hint: "Só pra ciência",
  },
  acompanhar: {
    label: "Acompanhar",
    Icon: Eye,
    colorBar: "bg-violet-600",
    chipBg: "bg-violet-50 dark:bg-violet-950/40",
    chipText: "text-violet-700 dark:text-violet-300",
    hint: "Me inclui como observador",
  },
  anotar: {
    label: "Anotar",
    Icon: StickyNote,
    colorBar: "bg-stone-500",
    chipBg: "bg-stone-50 dark:bg-stone-900/40",
    chipText: "text-stone-700 dark:text-stone-300",
    hint: "Post-it na demanda",
  },
  parecer: {
    label: "Parecer",
    Icon: HelpCircle,
    colorBar: "bg-rose-600",
    chipBg: "bg-rose-50 dark:bg-rose-950/40",
    chipText: "text-rose-700 dark:text-rose-300",
    hint: "Pergunta ao colega",
  },
};
```

- [ ] **Step 2: Criar Badge component**

```tsx
import { cn } from "@/lib/utils";
import { TIPO_META, type EncaminhamentoTipo } from "./tipo-colors";

export function EncaminhamentoBadge({
  tipo,
  size = "sm",
  withLabel = true,
}: {
  tipo: EncaminhamentoTipo;
  size?: "xs" | "sm";
  withLabel?: boolean;
}) {
  const m = TIPO_META[tipo];
  const { Icon } = m;
  const sizeClasses = size === "xs"
    ? "text-[9px] px-1.5 py-0.5 gap-1"
    : "text-[10px] px-2 py-0.5 gap-1";
  return (
    <span className={cn(
      "inline-flex items-center rounded-md font-semibold uppercase tracking-wide",
      sizeClasses,
      m.chipBg,
      m.chipText,
    )}>
      <Icon className="w-3 h-3" />
      {withLabel && m.label}
    </span>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/cowork/encaminhamentos/tipo-colors.ts src/components/cowork/encaminhamentos/EncaminhamentoBadge.tsx
git commit -m "feat(cowork-ui): tipo meta + EncaminhamentoBadge component"
```

---

### Task 2: ListItem + Inbox (sem integração de dados ainda)

**Files:**
- Create: `src/components/cowork/encaminhamentos/EncaminhamentoListItem.tsx`
- Create: `src/components/cowork/encaminhamentos/EncaminhamentosInbox.tsx`

- [ ] **Step 1: ListItem (mini-card list pattern Padrão Defender v5)**

```tsx
"use client";

import { cn } from "@/lib/utils";
import { TIPO_META, type EncaminhamentoTipo } from "./tipo-colors";
import { EncaminhamentoBadge } from "./EncaminhamentoBadge";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

export interface EncaminhamentoListItemData {
  id: number;
  tipo: EncaminhamentoTipo;
  remetenteName: string;
  titulo: string | null;
  mensagemPreview: string;
  createdAt: Date | string;
  status: string;
  urgencia: "normal" | "urgente";
  unread: boolean;
}

export function EncaminhamentoListItem({
  item,
  selected,
  onClick,
}: {
  item: EncaminhamentoListItemData;
  selected?: boolean;
  onClick?: () => void;
}) {
  const m = TIPO_META[item.tipo];
  const isPendente = item.status === "pendente";
  const aguardaAceite = isPendente && (item.tipo === "transferir" || item.tipo === "acompanhar");
  const created = new Date(item.createdAt);
  const relative = formatDistanceToNow(created, { locale: ptBR, addSuffix: false });

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full flex items-stretch rounded-lg overflow-hidden transition-all duration-150 cursor-pointer text-left",
        "border",
        selected
          ? "bg-white dark:bg-neutral-900 border-indigo-300/60 dark:border-indigo-600/40 shadow-sm"
          : "bg-neutral-50/50 dark:bg-neutral-800/20 border-transparent hover:bg-white dark:hover:bg-neutral-800/40 hover:border-neutral-200/80 dark:hover:border-neutral-700/60",
      )}
    >
      <div className={cn("w-1 shrink-0", m.colorBar)} />
      <div className="flex-1 min-w-0 px-3 py-2.5">
        <div className="flex items-center gap-2 mb-1">
          <EncaminhamentoBadge tipo={item.tipo} size="xs" withLabel />
          <span className="text-[11px] text-muted-foreground truncate">
            de <span className="font-semibold text-foreground/80">{item.remetenteName}</span>
          </span>
        </div>
        <p className="text-[13px] font-semibold text-foreground truncate">
          {item.titulo || item.mensagemPreview.slice(0, 60)}
        </p>
        <p className="text-[11px] text-muted-foreground truncate mt-0.5">
          {item.mensagemPreview}
        </p>
      </div>
      <div className="flex flex-col items-end justify-between py-2.5 pr-3 gap-1 shrink-0">
        <span className="text-[10px] text-muted-foreground tabular-nums">{relative}</span>
        {aguardaAceite ? (
          <span className="text-[9px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
            Aguarda aceite
          </span>
        ) : item.unread ? (
          <span className="w-2 h-2 rounded-full bg-indigo-500" />
        ) : null}
      </div>
    </button>
  );
}
```

- [ ] **Step 2: Inbox container (list 380px + detail 1fr)**

```tsx
"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { EncaminhamentoListItem, type EncaminhamentoListItemData } from "./EncaminhamentoListItem";
import { EncaminhamentoDetalhe } from "./EncaminhamentoDetalhe";
import { cn } from "@/lib/utils";

type Filtro = "recebidos" | "enviados" | "arquivados";

export function EncaminhamentosInbox() {
  const [filtro, setFiltro] = useState<Filtro>("recebidos");
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const { data, isLoading } = trpc.encaminhamentos.listar.useQuery({ filtro });

  const items: EncaminhamentoListItemData[] = (data?.items ?? []).map((r: any) => ({
    id: r.id,
    tipo: r.tipo,
    remetenteName: r.remetenteName ?? "Colega",
    titulo: r.titulo,
    mensagemPreview: (r.mensagem ?? "").slice(0, 160),
    createdAt: r.createdAt,
    status: r.status,
    urgencia: r.urgencia,
    unread: r.status === "pendente",
  }));

  return (
    <div className="grid grid-cols-1 md:grid-cols-[380px_1fr] gap-3 min-h-[560px]">
      <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200/60 dark:border-neutral-800/60 shadow-sm shadow-black/[0.04] overflow-hidden flex flex-col">
        <div className="p-3 border-b border-neutral-200/40 dark:border-neutral-800/40">
          <div className="inline-flex items-center p-0.5 bg-neutral-100 dark:bg-neutral-800 rounded-lg text-[11px]">
            {(["recebidos", "enviados", "arquivados"] as const).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFiltro(f)}
                className={cn(
                  "px-2.5 py-1 rounded-md font-medium cursor-pointer transition-all",
                  filtro === f
                    ? "bg-white dark:bg-neutral-900 text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {f === "recebidos" ? "Recebidos" : f === "enviados" ? "Enviados" : "Arquivados"}
              </button>
            ))}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
          {isLoading && <div className="p-4 text-sm text-muted-foreground">Carregando…</div>}
          {!isLoading && items.length === 0 && (
            <div className="p-6 text-center text-sm text-muted-foreground">
              Nada por aqui ainda.
            </div>
          )}
          {items.map((it) => (
            <EncaminhamentoListItem
              key={it.id}
              item={it}
              selected={selectedId === it.id}
              onClick={() => setSelectedId(it.id)}
            />
          ))}
        </div>
      </div>

      <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200/60 dark:border-neutral-800/60 shadow-sm shadow-black/[0.04] overflow-hidden">
        {selectedId ? (
          <EncaminhamentoDetalhe id={selectedId} />
        ) : (
          <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
            Selecione um encaminhamento
          </div>
        )}
      </div>
    </div>
  );
}
```

**NOTA:** `remetenteName` não existe no retorno cru do `listar`. Precisará ser adicionado ao endpoint via JOIN com users, ou Inbox faz query adicional. Decisão: adicionar `LEFT JOIN users AS remetente` no endpoint `listar` do router (Task 5 abaixo). Por ora, o componente tolera undefined com fallback.

- [ ] **Step 3: Commit**

```bash
git add src/components/cowork/encaminhamentos/
git commit -m "feat(cowork-ui): ListItem + Inbox skeleton (fetches via trpc.listar)"
```

---

### Task 3: Endpoint `listar` retorna também nome do remetente

**Files:**
- Modify: `src/lib/trpc/routers/encaminhamentos.ts`

- [ ] **Step 1: JOIN com users no listar**

Atualizar o select do endpoint `listar` para incluir `remetenteName`:

```ts
import { users } from "@/lib/db/schema/core";
// ...
const rows = await db
  .select({
    id: encaminhamentos.id,
    tipo: encaminhamentos.tipo,
    titulo: encaminhamentos.titulo,
    mensagem: encaminhamentos.mensagem,
    status: encaminhamentos.status,
    urgencia: encaminhamentos.urgencia,
    createdAt: encaminhamentos.createdAt,
    demandaId: encaminhamentos.demandaId,
    processoId: encaminhamentos.processoId,
    assistidoId: encaminhamentos.assistidoId,
    remetenteId: encaminhamentos.remetenteId,
    remetenteName: users.name,
  })
  .from(encaminhamentos)
  .leftJoin(users, eq(users.id, encaminhamentos.remetenteId))
  .where(whereClause)
  .orderBy(desc(encaminhamentos.createdAt))
  .limit(input.limit);
```

- [ ] **Step 2: Rodar testes existentes (devem continuar passando)**

```bash
cd /Users/rodrigorochameire/Projetos/Defender && npx vitest run __tests__/trpc/encaminhamentos.test.ts 2>&1 | tail -5
```
Expected: 4/4 PASS.

- [ ] **Step 3: Commit**

```bash
git add src/lib/trpc/routers/encaminhamentos.ts
git commit -m "feat(cowork): include remetenteName in listar response"
```

---

### Task 4: Detalhe do encaminhamento

**Files:**
- Create: `src/components/cowork/encaminhamentos/EncaminhamentoDetalhe.tsx`

- [ ] **Step 1: Componente de detalhe com ações por tipo**

```tsx
"use client";

import { trpc } from "@/lib/trpc/client";
import { TIPO_META, type EncaminhamentoTipo } from "./tipo-colors";
import { EncaminhamentoBadge } from "./EncaminhamentoBadge";
import { Button } from "@/components/ui/button";
import { Check, Reply, Pin, Archive, X, Scale } from "lucide-react";

export function EncaminhamentoDetalhe({ id }: { id: number }) {
  const { data, isLoading } = trpc.encaminhamentos.obter.useQuery({ id });
  const utils = trpc.useUtils();

  const marcarCiente = trpc.encaminhamentos.marcarCiente.useMutation({
    onSuccess: () => utils.encaminhamentos.invalidate(),
  });
  const aceitar = trpc.encaminhamentos.aceitar.useMutation({
    onSuccess: () => utils.encaminhamentos.invalidate(),
  });
  const recusar = trpc.encaminhamentos.recusar.useMutation({
    onSuccess: () => utils.encaminhamentos.invalidate(),
  });
  const arquivar = trpc.encaminhamentos.arquivar.useMutation({
    onSuccess: () => utils.encaminhamentos.invalidate(),
  });

  if (isLoading || !data) {
    return <div className="p-8 text-sm text-muted-foreground">Carregando…</div>;
  }

  const enc = data.encaminhamento;
  const tipo = enc.tipo as EncaminhamentoTipo;
  const m = TIPO_META[tipo];

  const handleRecusar = () => {
    const motivo = window.prompt("Motivo da recusa:");
    if (motivo && motivo.trim().length > 0) {
      recusar.mutate({ id, motivo });
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className={`p-5 border-l-4 ${m.colorBar.replace("bg-", "border-l-")}`}>
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-[15px] font-semibold text-foreground">{enc.titulo || "Sem título"}</h2>
              <EncaminhamentoBadge tipo={tipo} withLabel size="sm" />
              {enc.urgencia === "urgente" && (
                <span className="text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300">
                  Urgente
                </span>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1 tabular-nums">
              Status: {enc.status}
            </p>
          </div>
        </div>
      </div>

      {(enc.demandaId || enc.processoId || enc.assistidoId) && (
        <div className="mx-5 mt-3 p-3 rounded-lg bg-neutral-50/60 dark:bg-neutral-800/40 border border-neutral-200/40 dark:border-neutral-700/40 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-neutral-900 text-white flex items-center justify-center">
            <Scale className="w-4 h-4" />
          </div>
          <div className="flex-1 text-[12px]">
            {enc.demandaId && <div>Demanda #{enc.demandaId}</div>}
            {enc.processoId && <div className="text-muted-foreground">Processo #{enc.processoId}</div>}
          </div>
        </div>
      )}

      <div className="px-5 py-4 flex-1 min-h-0 overflow-y-auto">
        <p className="text-[13px] leading-relaxed text-foreground/80 whitespace-pre-wrap">
          {enc.mensagem}
        </p>
      </div>

      <div className="px-5 py-3 border-t border-neutral-200/40 dark:border-neutral-800/40 flex items-center gap-2 flex-wrap">
        {(tipo === "transferir" || tipo === "acompanhar") && enc.status === "pendente" && (
          <>
            <Button size="sm" onClick={() => aceitar.mutate({ id })}>
              <Check className="w-3.5 h-3.5 mr-1" /> Aceitar
            </Button>
            <Button size="sm" variant="outline" onClick={handleRecusar}>
              <X className="w-3.5 h-3.5 mr-1" /> Recusar
            </Button>
          </>
        )}
        {(tipo === "anotar" || tipo === "encaminhar") && enc.status === "pendente" && (
          <Button size="sm" onClick={() => marcarCiente.mutate({ id })}>
            <Check className="w-3.5 h-3.5 mr-1" /> Marcar como ciente
          </Button>
        )}
        <Button size="sm" variant="outline">
          <Reply className="w-3.5 h-3.5 mr-1" /> Responder
        </Button>
        <Button size="sm" variant="outline">
          <Pin className="w-3.5 h-3.5 mr-1" /> Fixar
        </Button>
        <Button size="sm" variant="outline" className="ml-auto" onClick={() => arquivar.mutate({ id })}>
          <Archive className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
}
```

**NOTA:** "Responder" vai ficar inline em Task 7 (thread). Botão existe mas no-op nesta task.

- [ ] **Step 2: Commit**

```bash
git add src/components/cowork/encaminhamentos/EncaminhamentoDetalhe.tsx
git commit -m "feat(cowork-ui): EncaminhamentoDetalhe with type-specific actions"
```

---

### Task 5: Modal de criação — Novo Encaminhamento

**Files:**
- Create: `src/components/cowork/encaminhamentos/NovoEncaminhamentoModal.tsx`
- Create: `src/components/cowork/encaminhamentos/TipoEncaminhamentoSelector.tsx`
- Create: `src/components/cowork/encaminhamentos/DestinatarioPicker.tsx`
- Create: `src/components/cowork/encaminhamentos/NotificacaoToggles.tsx`

- [ ] **Step 1: TipoEncaminhamentoSelector — 5 pills em row**

```tsx
"use client";

import { cn } from "@/lib/utils";
import { TIPO_META, type EncaminhamentoTipo } from "./tipo-colors";

export function TipoEncaminhamentoSelector({
  value,
  onChange,
}: {
  value: EncaminhamentoTipo;
  onChange: (v: EncaminhamentoTipo) => void;
}) {
  return (
    <div className="grid grid-cols-5 gap-1.5">
      {(Object.keys(TIPO_META) as EncaminhamentoTipo[]).map((t) => {
        const m = TIPO_META[t];
        const { Icon } = m;
        const selected = value === t;
        return (
          <button
            key={t}
            type="button"
            onClick={() => onChange(t)}
            className={cn(
              "p-2.5 rounded-lg border-[1.5px] transition-all cursor-pointer flex flex-col items-center gap-1",
              selected
                ? cn(m.chipBg, m.chipText, "border-current")
                : "border-transparent bg-neutral-50 dark:bg-neutral-800/40 text-muted-foreground hover:bg-neutral-100 dark:hover:bg-neutral-800/60",
            )}
          >
            <div className={cn(
              "w-7 h-7 rounded-lg flex items-center justify-center",
              selected ? m.colorBar + " text-white" : "bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700",
            )}>
              <Icon className="w-3.5 h-3.5" />
            </div>
            <span className="text-[11px] font-semibold">{m.label}</span>
            <span className="text-[9px] text-center leading-tight opacity-70">{m.hint}</span>
          </button>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: DestinatarioPicker — multi-chip com busca**

```tsx
"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { X } from "lucide-react";

export interface Colega { id: number; name: string; }

export function DestinatarioPicker({
  value,
  onChange,
  maxCount = Infinity,
}: {
  value: Colega[];
  onChange: (colegas: Colega[]) => void;
  maxCount?: number;
}) {
  const [query, setQuery] = useState("");
  const { data } = trpc.users.colegasDoWorkspace.useQuery(undefined, { staleTime: 60_000 });
  const todos = (data ?? []) as Colega[];
  const selectedIds = new Set(value.map((c) => c.id));
  const suggestions = todos
    .filter((c) => !selectedIds.has(c.id))
    .filter((c) => c.name.toLowerCase().includes(query.toLowerCase()))
    .slice(0, 8);

  const add = (c: Colega) => {
    if (value.length >= maxCount) return;
    onChange([...value, c]);
    setQuery("");
  };
  const remove = (id: number) => onChange(value.filter((c) => c.id !== id));

  return (
    <div className="relative">
      <div className="flex flex-wrap gap-1.5 p-1.5 border border-neutral-200 dark:border-neutral-700 rounded-lg min-h-10 bg-white dark:bg-neutral-900">
        {value.map((c) => (
          <span key={c.id} className="inline-flex items-center gap-1.5 pl-1.5 pr-2 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 text-[12px] font-medium">
            <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-[9px] font-bold flex items-center justify-center">
              {c.name.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase()}
            </span>
            {c.name}
            <button onClick={() => remove(c.id)} className="cursor-pointer opacity-60 hover:opacity-100">
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={value.length === 0 ? "Adicionar colega…" : ""}
          className="flex-1 min-w-[140px] text-[13px] bg-transparent outline-none px-2 py-1"
        />
      </div>
      {query.length > 0 && suggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto">
          {suggestions.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => add(c)}
              className="w-full text-left px-3 py-2 text-[13px] hover:bg-neutral-50 dark:hover:bg-neutral-800 cursor-pointer"
            >
              {c.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
```

**NOTA:** Endpoint `users.colegasDoWorkspace` provavelmente não existe. Verificar `src/lib/trpc/routers/users.ts` e, se faltar, adicionar (procedure que retorna `{ id, name }[]` do mesmo workspace do ctx.user). Fazer como sub-task em Task 5.

- [ ] **Step 3: NotificacaoToggles**

```tsx
"use client";

import { Bell, Mail } from "lucide-react";

export interface NotificacaoState {
  ombuds: boolean;
  whatsapp: boolean;
  email: boolean;
}

export function NotificacaoToggles({
  value,
  onChange,
}: {
  value: NotificacaoState;
  onChange: (v: NotificacaoState) => void;
}) {
  const Toggle = ({
    active,
    onToggle,
    icon,
    label,
  }: {
    active: boolean;
    onToggle: () => void;
    icon: React.ReactNode;
    label: string;
  }) => (
    <button
      type="button"
      onClick={onToggle}
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-[12px] font-medium cursor-pointer transition-all ${
        active
          ? "bg-neutral-900 text-white border-neutral-900"
          : "bg-white dark:bg-neutral-900 text-muted-foreground border-neutral-200 dark:border-neutral-700"
      }`}
    >
      <span className={`w-7 h-4 rounded-full relative transition-all ${active ? "bg-emerald-500" : "bg-neutral-300"}`}>
        <span className={`absolute top-0.5 ${active ? "left-3.5" : "left-0.5"} w-3 h-3 rounded-full bg-white shadow transition-all`} />
      </span>
      {icon}
      {label}
    </button>
  );

  return (
    <div className="p-3 rounded-lg bg-neutral-50/60 dark:bg-neutral-800/40 border border-neutral-200/40 dark:border-neutral-700/40">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
        <Bell className="w-3 h-3" /> Notificar por
      </div>
      <div className="flex gap-2 flex-wrap">
        <Toggle
          active={value.ombuds}
          onToggle={() => onChange({ ...value, ombuds: !value.ombuds })}
          icon={<Bell className="w-3 h-3" />}
          label="OMBUDS"
        />
        <Toggle
          active={value.whatsapp}
          onToggle={() => onChange({ ...value, whatsapp: !value.whatsapp })}
          icon={<span className="text-[10px] font-bold">W</span>}
          label="WhatsApp"
        />
        <Toggle
          active={value.email}
          onToggle={() => onChange({ ...value, email: !value.email })}
          icon={<Mail className="w-3 h-3" />}
          label="Email"
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 4: NovoEncaminhamentoModal integrado**

```tsx
"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Send, Lock } from "lucide-react";
import { TipoEncaminhamentoSelector } from "./TipoEncaminhamentoSelector";
import { DestinatarioPicker, type Colega } from "./DestinatarioPicker";
import { NotificacaoToggles, type NotificacaoState } from "./NotificacaoToggles";
import { TIPO_META, type EncaminhamentoTipo } from "./tipo-colors";
import { Scale } from "lucide-react";

export interface ContextoPreSelecionado {
  demandaId?: number;
  processoId?: number;
  assistidoId?: number;
  display?: string; // "Francisco Lima... · Processo 8004897..."
}

const SINGLE_DEST_TIPOS = new Set<EncaminhamentoTipo>(["transferir", "acompanhar", "parecer"]);

const NOTIF_DEFAULTS: Record<EncaminhamentoTipo, NotificacaoState> = {
  transferir: { ombuds: true, whatsapp: true, email: false },
  parecer: { ombuds: true, whatsapp: true, email: false },
  encaminhar: { ombuds: true, whatsapp: false, email: false },
  acompanhar: { ombuds: true, whatsapp: false, email: false },
  anotar: { ombuds: true, whatsapp: false, email: false },
};

export function NovoEncaminhamentoModal({
  open,
  onOpenChange,
  contexto,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  contexto?: ContextoPreSelecionado;
}) {
  const [tipo, setTipo] = useState<EncaminhamentoTipo>("anotar");
  const [destinatarios, setDestinatarios] = useState<Colega[]>([]);
  const [mensagem, setMensagem] = useState("");
  const [titulo, setTitulo] = useState("");
  const [notif, setNotif] = useState<NotificacaoState>(NOTIF_DEFAULTS.anotar);

  const utils = trpc.useUtils();
  const criar = trpc.encaminhamentos.criar.useMutation({
    onSuccess: () => {
      utils.encaminhamentos.invalidate();
      onOpenChange(false);
      setMensagem("");
      setTitulo("");
      setDestinatarios([]);
    },
  });

  const handleTipoChange = (t: EncaminhamentoTipo) => {
    setTipo(t);
    setNotif(NOTIF_DEFAULTS[t]);
    if (SINGLE_DEST_TIPOS.has(t) && destinatarios.length > 1) {
      setDestinatarios(destinatarios.slice(0, 1));
    }
  };

  const submit = () => {
    criar.mutate({
      tipo,
      titulo: titulo || undefined,
      mensagem,
      destinatarioIds: destinatarios.map((d) => d.id),
      demandaId: contexto?.demandaId,
      processoId: contexto?.processoId,
      assistidoId: contexto?.assistidoId,
      notificarOmbuds: notif.ombuds,
      notificarWhatsapp: notif.whatsapp,
      notificarEmail: notif.email,
    });
  };

  const maxDest = SINGLE_DEST_TIPOS.has(tipo) ? 1 : Infinity;
  const canSubmit = mensagem.trim().length > 0 && destinatarios.length > 0 && !criar.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0 gap-0">
        <DialogHeader className="px-6 py-4 border-b border-neutral-200/40 dark:border-neutral-800/40">
          <DialogTitle className="text-[15px] font-semibold">Novo encaminhamento</DialogTitle>
          <p className="text-[11px] text-muted-foreground mt-0.5">Compartilhe uma demanda ou ideia com um colega</p>
        </DialogHeader>

        <div className="px-6 py-5 space-y-5 max-h-[70vh] overflow-y-auto">
          <Section label="Tipo">
            <TipoEncaminhamentoSelector value={tipo} onChange={handleTipoChange} />
          </Section>

          {contexto && (
            <Section label="Sobre">
              <div className="flex items-center gap-3 p-2.5 rounded-lg bg-neutral-50/60 dark:bg-neutral-800/40 border border-neutral-200/40 dark:border-neutral-700/40">
                <div className="w-8 h-8 rounded-lg bg-neutral-900 text-white flex items-center justify-center">
                  <Scale className="w-4 h-4" />
                </div>
                <div className="flex-1 text-[12px]">{contexto.display ?? "Contexto pré-selecionado"}</div>
              </div>
            </Section>
          )}

          <Section label="Para">
            <DestinatarioPicker value={destinatarios} onChange={setDestinatarios} maxCount={maxDest} />
            <p className="text-[11px] text-muted-foreground flex items-center gap-1.5 mt-1.5">
              <Lock className="w-3 h-3" /> Só quem está em "Para" consegue ver o conteúdo
            </p>
          </Section>

          <Section label="Título (opcional)">
            <input
              type="text"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Resumo curto"
              className="w-full text-[13px] px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 outline-none focus:border-indigo-400"
            />
          </Section>

          <Section label="Mensagem">
            <textarea
              value={mensagem}
              onChange={(e) => setMensagem(e.target.value)}
              placeholder="Escreva o contexto…"
              rows={4}
              className="w-full text-[13px] px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 outline-none focus:border-indigo-400 resize-y"
            />
          </Section>

          <NotificacaoToggles value={notif} onChange={setNotif} />
        </div>

        <div className="px-6 py-3 border-t border-neutral-200/40 dark:border-neutral-800/40 flex items-center gap-2 bg-neutral-50/60 dark:bg-neutral-900/60">
          <p className="text-[11px] text-muted-foreground flex items-center gap-1 flex-1">
            <Lock className="w-3 h-3" /> Tudo fica registrado no histórico da demanda
          </p>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={submit} disabled={!canSubmit} className="bg-emerald-600 hover:bg-emerald-700 text-white">
            <Send className="w-3.5 h-3.5 mr-1" /> Enviar encaminhamento
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">{label}</div>
      {children}
    </div>
  );
}
```

- [ ] **Step 5: Verificar `trpc.users.colegasDoWorkspace` existe**

```bash
grep -n "colegasDoWorkspace\|colegas" /Users/rodrigorochameire/Projetos/Defender/src/lib/trpc/routers/users.ts | head
```

Se não existe, adicionar em `users.ts`:

```ts
colegasDoWorkspace: protectedProcedure.query(async ({ ctx }) => {
  const wsId = ctx.user.workspaceId;
  if (!wsId) return [];
  const rows = await db
    .select({ id: users.id, name: users.name })
    .from(users)
    .where(and(eq(users.workspaceId, wsId), ne(users.id, ctx.user.id)))
    .orderBy(users.name);
  return rows;
}),
```

- [ ] **Step 6: Commit**

```bash
git add src/components/cowork/encaminhamentos/ src/lib/trpc/routers/users.ts
git commit -m "feat(cowork-ui): NovoEncaminhamentoModal + selector/picker/toggles"
```

---

### Task 6: Integrar aba "Encaminhamentos" na página Cowork

**Files:**
- Modify: `src/app/(dashboard)/admin/cowork/page.tsx`

- [ ] **Step 1: Ler a página atual**

```bash
head -80 /Users/rodrigorochameire/Projetos/Defender/src/app/\(dashboard\)/admin/cowork/page.tsx
```

- [ ] **Step 2: Adicionar tab "Encaminhamentos" no CollapsiblePageHeader**

Adicionar `encaminhamentos` como primeira opção do estado `activeTab` e renderizar `<EncaminhamentosInbox />` quando ativa. Adicionar botão "+ Novo" no header que abre `<NovoEncaminhamentoModal>`.

**Exemplo minimalista do que deve virar:**

```tsx
const [activeTab, setActiveTab] = useState<"encaminhamentos" | "pareceres" | "mural" | "coberturas">("encaminhamentos");
const [modalOpen, setModalOpen] = useState(false);

// ... CollapsiblePageHeader:
bottomRow={
  <div className="flex items-center gap-2.5">
    <Pill active={activeTab === "encaminhamentos"} onClick={() => setActiveTab("encaminhamentos")}>
      Encaminhamentos <ContadorBadge />
    </Pill>
    {/* ... demais pills */}
  </div>
}

// ... body:
{activeTab === "encaminhamentos" && <EncaminhamentosInbox />}
{activeTab === "pareceres" && <PareceresLegacyView />}
{/* ... */}

<NovoEncaminhamentoModal open={modalOpen} onOpenChange={setModalOpen} />
```

- [ ] **Step 3: Smoke test no browser**

```bash
cd /Users/rodrigorochameire/Projetos/Defender && npm run dev
# abrir http://localhost:3000/admin/cowork
# verificar: aba Encaminhamentos visível, inbox vazia render, botão + abre modal
```

- [ ] **Step 4: Commit**

```bash
git add "src/app/(dashboard)/admin/cowork/page.tsx"
git commit -m "feat(cowork-ui): add Encaminhamentos tab to Cowork page"
```

---

### Task 7: Thread de respostas no detalhe

**Files:**
- Modify: `src/components/cowork/encaminhamentos/EncaminhamentoDetalhe.tsx`

- [ ] **Step 1: Adicionar área de respostas ao detalhe**

Abaixo do botão "Responder", adicionar:

```tsx
const [replyOpen, setReplyOpen] = useState(false);
const [replyText, setReplyText] = useState("");
const responder = trpc.encaminhamentos.responder.useMutation({
  onSuccess: () => {
    utils.encaminhamentos.obter.invalidate({ id });
    setReplyOpen(false);
    setReplyText("");
  },
});

// ... antes do </div> final:
<div className="mx-5 mb-5 pt-3 border-t border-dashed border-neutral-200/40 dark:border-neutral-800/40">
  <div className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
    Thread · {data.respostas.length} {data.respostas.length === 1 ? "resposta" : "respostas"}
  </div>
  <div className="space-y-2">
    {data.respostas.map((r: any) => (
      <div key={r.id} className="p-2.5 rounded-lg bg-neutral-50/60 dark:bg-neutral-800/40 text-[12px]">
        <div className="text-[10px] text-muted-foreground mb-1">{new Date(r.createdAt).toLocaleString("pt-BR")}</div>
        <div className="whitespace-pre-wrap">{r.mensagem}</div>
      </div>
    ))}
  </div>
  {replyOpen ? (
    <div className="mt-2 space-y-2">
      <textarea
        value={replyText}
        onChange={(e) => setReplyText(e.target.value)}
        rows={3}
        className="w-full text-[12px] px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 outline-none focus:border-indigo-400 resize-y"
      />
      <div className="flex gap-2">
        <Button size="sm" onClick={() => responder.mutate({ id, mensagem: replyText })} disabled={!replyText.trim()}>
          Enviar
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setReplyOpen(false)}>Cancelar</Button>
      </div>
    </div>
  ) : (
    <button
      type="button"
      onClick={() => setReplyOpen(true)}
      className="mt-2 text-[12px] text-indigo-600 hover:text-indigo-700 cursor-pointer"
    >
      + Responder
    </button>
  )}
</div>
```

- [ ] **Step 2: Commit**

```bash
git add src/components/cowork/encaminhamentos/EncaminhamentoDetalhe.tsx
git commit -m "feat(cowork-ui): reply thread in detalhe"
```

---

### Task 8: Entry point no card do Kanban de demandas

**Files:**
- Modify: componente de card do Kanban de demandas (confirmar path via `grep`)

- [ ] **Step 1: Localizar o card**

```bash
grep -rn "defensor\|Menu\b" /Users/rodrigorochameire/Projetos/Defender/src/components/demandas-premium/ | grep -i "card\|item" | head -10
```

- [ ] **Step 2: Adicionar item "Encaminhar" ao menu (dropdown de 3 pontos)**

```tsx
<DropdownMenuItem onClick={() => openEncaminharModal({ demandaId, processoId, assistidoId, display: `${assistidoNome} · ${ato}` })}>
  <Forward className="w-3.5 h-3.5 mr-2" /> Encaminhar
</DropdownMenuItem>
```

Via context ou prop — depende da estrutura atual. Decidir ao ver.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat(cowork-ui): add Encaminhar menu to kanban card"
```

---

### Task 9: Redirect de `/admin/pareceres`

**Files:**
- Modify: `src/app/(dashboard)/admin/pareceres/page.tsx`

- [ ] **Step 1: Substituir o conteúdo por redirect**

```tsx
import { redirect } from "next/navigation";

export default function PareceresRedirectPage() {
  redirect("/admin/cowork?tab=encaminhamentos&tipo=parecer");
}
```

- [ ] **Step 2: Commit**

```bash
git add "src/app/(dashboard)/admin/pareceres/page.tsx"
git commit -m "feat(cowork-ui): redirect pareceres to cowork/encaminhamentos"
```

---

### Task 10: Verificação final + PR

- [ ] **Step 1: Rodar testes**

```bash
cd /Users/rodrigorochameire/Projetos/Defender && npm test 2>&1 | tail -10
```

- [ ] **Step 2: Rodar build**

```bash
cd /Users/rodrigorochameire/Projetos/Defender && npm run build 2>&1 | tail -20
```

- [ ] **Step 3: Type check**

```bash
cd /Users/rodrigorochameire/Projetos/Defender && npx tsc --noEmit 2>&1 | grep "error TS" | grep -v "FilesByProcesso\|audiencias.ts:724\|concluidoEm\|nomeAssistido\|drive\.ts\|instancia-superior\|defensor-scope.test" | head
```

Expected: nenhum erro novo.

- [ ] **Step 4: Smoke test manual no browser**

Ações a verificar:
- [ ] Cowork → aba Encaminhamentos render sem erro
- [ ] Botão "+ Novo" abre modal
- [ ] Selecionar "Transferir" → tipo fica só com 1 destinatário
- [ ] Selecionar "Anotar" → permite múltiplos destinatários
- [ ] Criar encaminhamento → modal fecha, inbox atualiza
- [ ] Selecionar item na lista → detalhe render
- [ ] Ações "Aceitar", "Ciente", "Responder", "Arquivar" respondem
- [ ] No card do Kanban: menu "Encaminhar" abre modal com contexto preenchido
- [ ] `/admin/pareceres` redireciona

- [ ] **Step 5: Criar PR**

```bash
git push origin feat/cowork-encaminhamentos-ui
gh pr create --title "feat(cowork-ui): Encaminhamentos — Fase 2 (UI)" --body "..."
```

---

## Self-Review

Spec coverage (contra spec 2026-04-15):
- ✅ Aba "Encaminhamentos" na página Cowork — Task 6
- ✅ Inbox com filtros Recebidos/Enviados/Arquivados — Task 2
- ✅ Detalhe com ações por tipo — Task 4
- ✅ Thread de respostas — Task 7
- ✅ Modal de criação com 5 tipos + destinatário multi + contexto + notificação — Task 5
- ✅ Entry point no card do Kanban — Task 8
- ✅ Redirect `/admin/pareceres` → `/admin/cowork` — Task 9
- ⚠️ **NÃO implementado nesta fase**: anexos (áudio + Drive picker), badges de "acompanhando" na view kanban do observador, entry points em `/processos/[id]` e `/assistidos/[id]` (ficam como Fase 3 se necessário ou tasks avulsas).
- ⚠️ Drop de `pareceres` não está nesta fase — fica para 60 dias após deploy, tarefa de manutenção.

Placeholder scan: nenhum TBD/TODO/fillme. Cada task tem código concreto ou comando claro.

Type consistency: `EncaminhamentoTipo`, `Colega`, `NotificacaoState`, `ContextoPreSelecionado` nomeados consistentemente através das tasks.
