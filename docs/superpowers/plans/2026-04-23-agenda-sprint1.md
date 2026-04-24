# Agenda Sprint 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tornar a agenda do OMBUDS encaixada na tela, padronizada entre views, com prazos opt-in, criar evento rápido (inline + atalhos) e Google Calendar export confiável (1 calendário por atribuição).

**Architecture:** Componente único `EventChip` (density compact|expanded) compartilhado por Week/Month/7d. Query unificada no router `calendar.list` retornando lista discriminada `{ kind: "audiencia" | "evento" | "prazo" }` com filtro por toggles persistidos em localStorage. Google Calendar Fase 1 = export only via service `lib/integrations/google-calendar.ts`, com retry assíncrono em `sync_queue`.

**Tech Stack:** Next.js 15 (App Router), tRPC, Drizzle ORM, PostgreSQL, Tailwind CSS, shadcn/ui, Vitest (node env), Inngest (cron).

**Spec:** `docs/superpowers/specs/2026-04-23-agenda-sprint1-design.md`

---

## File Structure

### Novos

| Arquivo | Responsabilidade |
|---|---|
| `src/lib/agenda/event-style.ts` | Mapa central tipo → cor/ícone/label |
| `src/lib/agenda/event-indicators.ts` | Lógica das bolinhas (urgência/advogado/registro) |
| `src/lib/agenda/quick-add-parser.ts` | Extrai tipo/hora/CNJ/título de texto livre |
| `src/lib/integrations/google-calendar.ts` | Service OAuth + upsert/delete eventos |
| `src/lib/integrations/google-calendar-queue.ts` | Enfileira sync após mutações |
| `src/components/agenda/event-chip.tsx` | Componente único (density compact|expanded) |
| `src/components/agenda/upcoming-7-view.tsx` | View "Próximos 7 dias" |
| `src/components/agenda/tipo-toggle-chips.tsx` | Toggles audiência/prazo/atend/reuniao/outros |
| `src/components/agenda/quick-add-inline.tsx` | Input flutuante in-place |
| `src/components/agenda/google-calendar-status-chip.tsx` | Indicador visual conectado/falha/etc |
| `src/components/shared/processo-combo.tsx` | Autocomplete searchable de processo |
| `src/components/shared/keyboard-shortcuts-dialog.tsx` | Modal `?` listando atalhos |
| `src/hooks/use-agenda-preferences.ts` | Persiste tipos visíveis em localStorage |
| `src/hooks/use-agenda-shortcuts.ts` | Registra atalhos com cleanup |
| `drizzle/migrations/XXXX_sync_queue.sql` | Tabela `sync_queue` |
| `src/lib/db/schema/sync.ts` | Schema Drizzle de `sync_queue` |
| `src/lib/inngest/functions/sync-google-calendar-retry.ts` | Cron horário de retry |

### Modificados

| Arquivo | O que muda |
|---|---|
| `src/app/(dashboard)/admin/agenda/page.tsx` | Header colapsado, toggles, atalhos, quick-add, status Google |
| `src/components/agenda/calendar-month-view.tsx` | Usar EventChip; remover renderização inline própria |
| `src/components/agenda/calendar-week-view.tsx` | Usar EventChip; remover popover de 320px |
| `src/components/agenda/evento-create-modal.tsx` | Substituir input texto livre por ProcessoCombo |
| `src/lib/trpc/routers/calendar.ts` | Endpoint `list` aceita `tiposVisiveis`; retorna lista discriminada |
| `src/lib/trpc/routers/eventos.ts` | Hooks pós-mutate enfileiram sync Google |
| `src/lib/db/schema/agenda.ts` | (opcional) campo `googleCalendarId` se faltante |

---

## Convenções

**Testes:** Vitest com env `node`. Padrão `__tests__/<area>/<arquivo>.test.ts`. Componentes React **não têm unit tests** (sem `@testing-library/react` instalado) — verificação via smoke test no dev server.

**Commits:** Conventional Commits — `feat:`, `fix:`, `refactor:`, `chore:`, `test:`. Sempre referencie a Sprint: `feat(agenda): EventChip component [sprint-1]`.

**Smoke test base:**
```bash
cd /Users/rodrigorochameire/Projetos/Defender
npm run dev
# Abrir http://localhost:3000/admin/agenda
```

---

## Phase 1 — EventChip foundation (Seção 2 do spec)

### Task 1: Criar `event-style.ts` — mapa central de cores/ícones

**Files:**
- Create: `src/lib/agenda/event-style.ts`

- [ ] **Step 1: Criar o arquivo com as constantes**

```typescript
// src/lib/agenda/event-style.ts
export type EventKind = "audiencia" | "evento" | "prazo" | "atendimento" | "reuniao" | "outro";

export type EventStyle = {
  /** Token de cor base (Tailwind palette name) */
  color: "amber" | "rose" | "blue" | "violet" | "neutral";
  /** Ícone unicode (compatível com qualquer fonte) */
  icon: string;
  /** Label legível em pt-BR */
  label: string;
};

export const EVENT_STYLE: Record<EventKind, EventStyle> = {
  audiencia:   { color: "amber",   icon: "⚖", label: "Audiência" },
  prazo:       { color: "rose",    icon: "⏱", label: "Prazo" },
  atendimento: { color: "blue",    icon: "👥", label: "Atendimento" },
  reuniao:     { color: "violet",  icon: "📅", label: "Reunião" },
  evento:      { color: "neutral", icon: "•",  label: "Evento" },
  outro:       { color: "neutral", icon: "•",  label: "Outro" },
};

/** Classes Tailwind por cor base — derivadas do `color` para uso em chips */
export const EVENT_COLOR_CLASSES: Record<EventStyle["color"], {
  bg: string;
  border: string;
  text: string;
  textSecondary: string;
}> = {
  amber:   { bg: "bg-amber-50",   border: "border-amber-500",   text: "text-amber-900",   textSecondary: "text-amber-700" },
  rose:    { bg: "bg-rose-50",    border: "border-rose-500",    text: "text-rose-900",    textSecondary: "text-rose-700" },
  blue:    { bg: "bg-blue-50",    border: "border-blue-500",    text: "text-blue-900",    textSecondary: "text-blue-700" },
  violet:  { bg: "bg-violet-50",  border: "border-violet-500",  text: "text-violet-900",  textSecondary: "text-violet-700" },
  neutral: { bg: "bg-neutral-50", border: "border-neutral-500", text: "text-neutral-900", textSecondary: "text-neutral-700" },
};
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/agenda/event-style.ts
git commit -m "feat(agenda): central event style map [sprint-1]"
```

---

### Task 2: Criar `event-indicators.ts` — bolinhas (urgência, advogado, registro)

**Files:**
- Create: `src/lib/agenda/event-indicators.ts`
- Test: `__tests__/agenda/event-indicators.test.ts`

- [ ] **Step 1: Escrever testes failing**

```typescript
// __tests__/agenda/event-indicators.test.ts
import { describe, it, expect } from "vitest";
import { computeIndicators, type IndicatorInput } from "@/lib/agenda/event-indicators";

describe("computeIndicators", () => {
  it("retorna urgencia quando flag urgente=true", () => {
    const input: IndicatorInput = { kind: "audiencia", urgente: true };
    expect(computeIndicators(input)).toEqual([
      { id: "urgente", color: "rose", label: "Urgente" },
    ]);
  });

  it("retorna advogado quando temAdvogadoConstituido=true", () => {
    const input: IndicatorInput = { kind: "audiencia", temAdvogadoConstituido: true };
    expect(computeIndicators(input)).toEqual([
      { id: "advogado", color: "amber", label: "Advogado constituído" },
    ]);
  });

  it("retorna registro quando registroFeito=true", () => {
    const input: IndicatorInput = { kind: "audiencia", registroFeito: true };
    expect(computeIndicators(input)).toEqual([
      { id: "registro", color: "emerald", label: "Registro feito" },
    ]);
  });

  it("retorna múltiplos quando aplicáveis", () => {
    const input: IndicatorInput = { kind: "audiencia", urgente: true, registroFeito: true };
    const out = computeIndicators(input);
    expect(out.map(i => i.id)).toEqual(["urgente", "registro"]);
  });

  it("retorna vazio para evento sem flags", () => {
    expect(computeIndicators({ kind: "evento" })).toEqual([]);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

```bash
npx vitest run __tests__/agenda/event-indicators.test.ts
```
Expected: FAIL — "Cannot find module '@/lib/agenda/event-indicators'"

- [ ] **Step 3: Implementar mínimo pra passar**

```typescript
// src/lib/agenda/event-indicators.ts
import type { EventKind } from "./event-style";

export type IndicatorInput = {
  kind: EventKind;
  urgente?: boolean;
  temAdvogadoConstituido?: boolean;
  registroFeito?: boolean;
};

export type Indicator = {
  id: "urgente" | "advogado" | "registro";
  color: "rose" | "amber" | "emerald";
  label: string;
};

export function computeIndicators(input: IndicatorInput): Indicator[] {
  const out: Indicator[] = [];
  if (input.urgente)               out.push({ id: "urgente",  color: "rose",    label: "Urgente" });
  if (input.temAdvogadoConstituido) out.push({ id: "advogado", color: "amber",   label: "Advogado constituído" });
  if (input.registroFeito)         out.push({ id: "registro", color: "emerald", label: "Registro feito" });
  return out;
}
```

- [ ] **Step 4: Rodar e ver passar**

```bash
npx vitest run __tests__/agenda/event-indicators.test.ts
```
Expected: PASS — 5 testes verdes

- [ ] **Step 5: Commit**

```bash
git add src/lib/agenda/event-indicators.ts __tests__/agenda/event-indicators.test.ts
git commit -m "feat(agenda): indicator dots logic [sprint-1]"
```

---

### Task 3: Criar tipo `AgendaItem` (discriminated union)

**Files:**
- Create: `src/lib/agenda/types.ts`

- [ ] **Step 1: Criar o arquivo de tipos**

```typescript
// src/lib/agenda/types.ts
import type { EventKind } from "./event-style";

export type AgendaItemBase = {
  id: number;
  dataHora: Date;
  titulo: string;
  /** Atribuição derivada (Júri/VVD/EP/Criminal) */
  atribuicao?: "JURI" | "VVD" | "EP" | "CRIMINAL" | null;
  processoId?: number | null;
  processoNumero?: string | null;
  assistidoNome?: string | null;
  local?: string | null;
};

export type AgendaItemAudiencia = AgendaItemBase & {
  kind: "audiencia";
  vara?: string | null;
  sala?: string | null;
  registroFeito: boolean;
  temAdvogadoConstituido: boolean;
  urgente: boolean;
  googleCalendarEventId?: string | null;
};

export type AgendaItemEvento = AgendaItemBase & {
  kind: "evento";
  tipoEvento: "atendimento" | "reuniao" | "outro";
  googleCalendarEventId?: string | null;
};

export type AgendaItemPrazo = AgendaItemBase & {
  kind: "prazo";
  /** Data de vencimento (== dataHora) */
  dataTermoFinal: Date;
  tipoPrazoCodigo: string;
  demandaId: number;
  /** Dias até vencer (negativo = vencido) */
  diasAteVencer: number;
};

export type AgendaItem = AgendaItemAudiencia | AgendaItemEvento | AgendaItemPrazo;

/** Type guard helper */
export const isPrazo = (i: AgendaItem): i is AgendaItemPrazo => i.kind === "prazo";
export const isAudiencia = (i: AgendaItem): i is AgendaItemAudiencia => i.kind === "audiencia";
export const isEvento = (i: AgendaItem): i is AgendaItemEvento => i.kind === "evento";

/** Mapeia AgendaItem para EventKind (pra usar com EVENT_STYLE) */
export function getEventKind(item: AgendaItem): EventKind {
  if (item.kind === "audiencia") return "audiencia";
  if (item.kind === "prazo") return "prazo";
  return item.tipoEvento;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/agenda/types.ts
git commit -m "feat(agenda): AgendaItem discriminated union [sprint-1]"
```

---

### Task 4: Criar componente `EventChip` (density compact|expanded)

**Files:**
- Create: `src/components/agenda/event-chip.tsx`

- [ ] **Step 1: Criar o componente**

```tsx
// src/components/agenda/event-chip.tsx
"use client";

import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { EVENT_STYLE, EVENT_COLOR_CLASSES } from "@/lib/agenda/event-style";
import { computeIndicators } from "@/lib/agenda/event-indicators";
import { getEventKind, isAudiencia, isPrazo, type AgendaItem } from "@/lib/agenda/types";

type EventChipProps = {
  item: AgendaItem;
  density: "compact" | "expanded";
  onClick?: () => void;
  className?: string;
};

export function EventChip({ item, density, onClick, className }: EventChipProps) {
  const kind = getEventKind(item);
  const style = EVENT_STYLE[kind];
  const colors = EVENT_COLOR_CLASSES[style.color];
  const indicators = computeIndicators({
    kind,
    urgente: isAudiencia(item) ? item.urgente : isPrazo(item) && item.diasAteVencer <= 1,
    temAdvogadoConstituido: isAudiencia(item) ? item.temAdvogadoConstituido : false,
    registroFeito: isAudiencia(item) ? item.registroFeito : false,
  });

  const horaLabel = format(item.dataHora, "HH:mm");
  const isUrgentePrazo = isPrazo(item) && item.diasAteVencer <= 1;
  const urgenciaBadge = isPrazo(item)
    ? item.diasAteVencer <= 0 ? "HOJE"
    : item.diasAteVencer === 1 ? "AMANHÃ"
    : `${item.diasAteVencer}D`
    : null;

  if (density === "compact") {
    return (
      <button
        onClick={onClick}
        type="button"
        className={cn(
          colors.bg, "border-l-[3px]", colors.border,
          "px-1.5 py-0.5 rounded-sm text-[10px] flex gap-1 items-center w-full text-left",
          "hover:opacity-90 transition-opacity cursor-pointer",
          className,
        )}
      >
        <span className={cn("font-semibold", colors.text)}>{horaLabel}</span>
        <span className={cn("flex-1 truncate", colors.textSecondary)}>
          {style.icon} {item.titulo}
        </span>
        {indicators.map(ind => (
          <span
            key={ind.id}
            className={cn("w-[5px] h-[5px] rounded-full shrink-0", `bg-${ind.color}-500`)}
            title={ind.label}
          />
        ))}
      </button>
    );
  }

  // expanded
  return (
    <button
      onClick={onClick}
      type="button"
      className={cn(
        colors.bg, "border-l-[3px]", colors.border,
        "px-3 py-2 rounded-md text-xs flex gap-3 items-start w-full text-left",
        "hover:opacity-90 transition-opacity cursor-pointer",
        className,
      )}
    >
      <span className={cn("font-semibold min-w-[44px]", colors.text)}>{horaLabel}</span>
      <div className="flex-1 min-w-0">
        <div className={cn("font-semibold flex items-center gap-2", colors.text)}>
          <span>{style.icon} {item.titulo}</span>
          {urgenciaBadge && (
            <span className={cn(
              "text-[9px] px-1.5 py-[1px] rounded-full font-semibold",
              isUrgentePrazo ? "bg-rose-500 text-white" : "bg-amber-500 text-white",
            )}>{urgenciaBadge}</span>
          )}
        </div>
        {(item.processoNumero || item.assistidoNome || item.local) && (
          <div className={cn("text-[11px] mt-0.5", colors.textSecondary)}>
            {[item.assistidoNome, item.processoNumero, item.local && `📍 ${item.local}`]
              .filter(Boolean).join(" · ")}
          </div>
        )}
      </div>
      <div className="flex gap-1 shrink-0">
        {indicators.map(ind => (
          <span
            key={ind.id}
            className={cn("w-1.5 h-1.5 rounded-full mt-1", `bg-${ind.color}-500`)}
            title={ind.label}
          />
        ))}
      </div>
    </button>
  );
}
```

- [ ] **Step 2: Verificar typecheck**

```bash
cd /Users/rodrigorochameire/Projetos/Defender
npx tsc --noEmit
```
Expected: 0 erros relacionados a `event-chip.tsx`. Se houver erro de classe Tailwind dinâmica `bg-${color}-500`, adicionar à safelist do `tailwind.config.ts` (próximo step).

- [ ] **Step 3: Adicionar safelist ao Tailwind para classes dinâmicas**

Editar `tailwind.config.ts` adicionando ao topo do `theme.extend` (ou no nível raiz):

```typescript
safelist: [
  "bg-rose-500", "bg-amber-500", "bg-emerald-500",
  // já existem como literais em EVENT_COLOR_CLASSES, mas garantir:
  "bg-amber-50", "bg-rose-50", "bg-blue-50", "bg-violet-50", "bg-neutral-50",
  "border-amber-500", "border-rose-500", "border-blue-500", "border-violet-500", "border-neutral-500",
  "text-amber-900", "text-rose-900", "text-blue-900", "text-violet-900", "text-neutral-900",
  "text-amber-700", "text-rose-700", "text-blue-700", "text-violet-700", "text-neutral-700",
],
```

- [ ] **Step 4: Commit**

```bash
git add src/components/agenda/event-chip.tsx tailwind.config.ts
git commit -m "feat(agenda): EventChip component (compact + expanded density) [sprint-1]"
```

---

### Task 5: Refatorar `calendar-month-view.tsx` para usar EventChip

**Files:**
- Modify: `src/components/agenda/calendar-month-view.tsx`

- [ ] **Step 1: Localizar bloco de renderização inline do evento**

Procurar o bloco que renderiza eventos dentro do dia (próximo da linha 242, onde aparece `bg-neutral-50/60 hover:bg-neutral-100/80`).

- [ ] **Step 2: Substituir por `<EventChip density="compact" />`**

Adicionar import no topo do arquivo:

```typescript
import { EventChip } from "@/components/agenda/event-chip";
import type { AgendaItem } from "@/lib/agenda/types";
```

Substituir o bloco de renderização por:

```tsx
<EventChip
  item={evento as AgendaItem}
  density="compact"
  onClick={() => onEventoClick(evento)}
/>
```

(O cast pra `AgendaItem` é temporário até Task 13 transformar a query.)

- [ ] **Step 3: Smoke test no dev server**

```bash
npm run dev
# Abrir http://localhost:3000/admin/agenda
# Trocar para view "Mês"
# Verificar:
# - Eventos aparecem com cor por tipo
# - Bolinhas de indicador (urgência) presentes
# - Click abre EventDetailSheet (não popover)
```

- [ ] **Step 4: Commit**

```bash
git add src/components/agenda/calendar-month-view.tsx
git commit -m "refactor(agenda): month view uses EventChip [sprint-1]"
```

---

### Task 6: Refatorar `calendar-week-view.tsx` para usar EventChip + remover popover

**Files:**
- Modify: `src/components/agenda/calendar-week-view.tsx`

- [ ] **Step 1: Identificar bloco do popover (~linha 207)**

Localizar o bloco `Popover` que renderiza o card de 320px ao clicar em evento. Anotar handler atual.

- [ ] **Step 2: Substituir Popover + card inline por EventChip**

Adicionar imports:

```typescript
import { EventChip } from "@/components/agenda/event-chip";
import type { AgendaItem } from "@/lib/agenda/types";
```

Remover bloco `<Popover>...</Popover>` e substituir o trigger por:

```tsx
<EventChip
  item={evento as AgendaItem}
  density="expanded"
  onClick={() => onEventoClick(evento)}
/>
```

`onEventoClick` deve abrir `EventDetailSheet` (mesmo handler que Month usa).

- [ ] **Step 3: Smoke test**

```bash
# Trocar para view "Semana" no http://localhost:3000/admin/agenda
# Verificar:
# - Cards de evento mantêm visual amber/blue/etc (mas via EventChip)
# - Click abre EventDetailSheet lateral, não popover
# - Indicadores aparecem
```

- [ ] **Step 4: Commit**

```bash
git add src/components/agenda/calendar-week-view.tsx
git commit -m "refactor(agenda): week view uses EventChip + drop popover [sprint-1]"
```

---

## Phase 2 — Layout compacto (Seção 1 do spec)

### Task 7: Refatorar header da `agenda/page.tsx` — remover KPIs cards

**Files:**
- Modify: `src/app/(dashboard)/admin/agenda/page.tsx`

- [ ] **Step 1: Localizar bloco `<KPIGrid>`**

Procurar pelo uso de `KPICardPremium` e `KPIGrid` (linha ~44 imports + uso na renderização).

- [ ] **Step 2: Remover cards de KPI da renderização principal e adicionar chips inline no header**

Substituir o `<KPIGrid>...</KPIGrid>` por nada (deletar). No bloco do header (que já existe em `CollapsiblePageHeader` ou inline), adicionar:

```tsx
<div className="flex gap-2 text-xs ml-3">
  {kpis.totalSemana   > 0 && <span className="opacity-85">📅 {kpis.totalSemana}</span>}
  {kpis.audiencias    > 0 && <span className="text-amber-400">⚖ {kpis.audiencias}</span>}
  {kpis.atendimentos  > 0 && <span className="opacity-85">👥 {kpis.atendimentos}</span>}
  {kpis.prazos        > 0 && <span className="text-rose-400">⏱ {kpis.prazos}</span>}
</div>
```

- [ ] **Step 3: Smoke test**

```bash
# Recarregar http://localhost:3000/admin/agenda
# Verificar:
# - Cards grandes de KPI sumiram
# - Chips KPI aparecem no header
# - Calendário ocupa mais vertical
```

- [ ] **Step 4: Commit**

```bash
git add src/app/\(dashboard\)/admin/agenda/page.tsx
git commit -m "refactor(agenda): KPIs viram chips no header [sprint-1]"
```

---

### Task 8: Mover filtros secundários para popover acionado por "⚙ Filtros"

**Files:**
- Modify: `src/app/(dashboard)/admin/agenda/page.tsx`

- [ ] **Step 1: Localizar bloco de `<AgendaFilters>` na renderização**

Procurar pelo componente `AgendaFilters`. Ele provavelmente renderiza Tipo/Defensor/Status diretamente na barra.

- [ ] **Step 2: Envolver em `Popover` shadcn**

```tsx
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Settings as SettingsIcon } from "lucide-react";

// No header, à direita das pills:
<Popover>
  <PopoverTrigger asChild>
    <button className="text-xs text-white/85 hover:text-white px-2 py-1 rounded inline-flex items-center gap-1">
      <SettingsIcon className="w-3.5 h-3.5" />
      Filtros
      {hasActiveSecondaryFilters && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />}
    </button>
  </PopoverTrigger>
  <PopoverContent className="w-72 p-3">
    <AgendaFilters {...filterProps} />
  </PopoverContent>
</Popover>
```

`hasActiveSecondaryFilters` é boolean derivado dos filtros não-default ativos.

- [ ] **Step 3: Smoke test**

```bash
# Verificar no http://localhost:3000/admin/agenda:
# - Botão "Filtros" no header funciona
# - Popover abre com filtros internos
# - Indicador (bolinha verde) aparece quando há filtro ativo
```

- [ ] **Step 4: Commit**

```bash
git add src/app/\(dashboard\)/admin/agenda/page.tsx
git commit -m "refactor(agenda): filtros secundários em popover [sprint-1]"
```

---

## Phase 3 — View "Próximos 7 dias" (Seção 3 do spec)

### Task 9: Adicionar `"7d"` ao tipo `viewMode`

**Files:**
- Modify: `src/app/(dashboard)/admin/agenda/page.tsx`
- Modify: `src/components/shared/view-mode-dropdown.tsx`

- [ ] **Step 1: Atualizar tipo no `view-mode-dropdown`**

Adicionar `"7d"` ao tipo `ViewModeOption` se for union; senão garantir que o componente aceita string genérica e passar a opção via prop.

- [ ] **Step 2: Atualizar `viewMode` state na página**

Em `agenda/page.tsx` linha 558 (atual `useState<"calendar" | "week" | "list">`), adicionar `"7d"`:

```tsx
const [viewMode, setViewMode] = useState<"7d" | "calendar" | "week" | "list">("7d");
```

- [ ] **Step 3: Adicionar opção "7d" ao seletor visível**

Onde o `ViewModeDropdown` é renderizado, garantir que `7d` está na lista:

```tsx
<ViewModeDropdown
  value={viewMode}
  onChange={(v) => setViewMode(v as typeof viewMode)}
  options={[
    { value: "7d",       label: "Próximos 7 dias" },
    { value: "week",     label: "Semana" },
    { value: "calendar", label: "Mês" },
    { value: "list",     label: "Lista" },
  ]}
/>
```

- [ ] **Step 4: Commit**

```bash
git add src/app/\(dashboard\)/admin/agenda/page.tsx src/components/shared/view-mode-dropdown.tsx
git commit -m "feat(agenda): adicionar opção viewMode 7d [sprint-1]"
```

---

### Task 10: Criar componente `Upcoming7View`

**Files:**
- Create: `src/components/agenda/upcoming-7-view.tsx`

- [ ] **Step 1: Criar o componente**

```tsx
// src/components/agenda/upcoming-7-view.tsx
"use client";

import { useMemo } from "react";
import { format, isToday, isTomorrow, isWeekend, startOfDay, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { EventChip } from "@/components/agenda/event-chip";
import type { AgendaItem } from "@/lib/agenda/types";
import { cn } from "@/lib/utils";

type Upcoming7ViewProps = {
  items: AgendaItem[];
  onEventoClick: (item: AgendaItem) => void;
  baseDate?: Date;
};

type DayBucket = {
  date: Date;
  items: AgendaItem[];
};

export function Upcoming7View({ items, onEventoClick, baseDate = new Date() }: Upcoming7ViewProps) {
  const buckets = useMemo<DayBucket[]>(() => {
    const start = startOfDay(baseDate);
    const days: DayBucket[] = [];
    for (let i = 0; i < 7; i++) {
      const d = addDays(start, i);
      days.push({ date: d, items: items.filter(it => isSameDay(it.dataHora, d)) });
    }
    return days;
  }, [items, baseDate]);

  // Agrupa fim-de-semana vazio em uma linha
  const groupedBuckets = useMemo(() => {
    const grouped: Array<DayBucket | { type: "weekend-empty"; dates: Date[] }> = [];
    let weekendBuffer: Date[] = [];
    for (const b of buckets) {
      if (isWeekend(b.date) && b.items.length === 0) {
        weekendBuffer.push(b.date);
        continue;
      }
      if (weekendBuffer.length > 0) {
        grouped.push({ type: "weekend-empty", dates: weekendBuffer });
        weekendBuffer = [];
      }
      grouped.push(b);
    }
    if (weekendBuffer.length > 0) grouped.push({ type: "weekend-empty", dates: weekendBuffer });
    return grouped;
  }, [buckets]);

  if (items.length === 0 && buckets.every(b => b.items.length === 0)) {
    return (
      <div className="text-center text-sm text-neutral-500 py-12">
        Nenhum compromisso nos próximos 7 dias.
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-6">
      {groupedBuckets.map((g, idx) => {
        if ("type" in g) {
          return (
            <div key={`weekend-${idx}`} className="flex items-center gap-2 py-1 border-b border-neutral-100">
              <span className="text-xs text-neutral-500 font-semibold uppercase">
                Fim de semana · {g.dates.map(d => format(d, "dd/MM", { locale: ptBR })).join("-")}
              </span>
              <span className="text-xs text-neutral-400 ml-auto">livre</span>
            </div>
          );
        }
        return <DaySection key={g.date.toISOString()} bucket={g} onEventoClick={onEventoClick} />;
      })}
    </div>
  );
}

function DaySection({ bucket, onEventoClick }: { bucket: DayBucket; onEventoClick: (it: AgendaItem) => void }) {
  const today = isToday(bucket.date);
  const tomorrow = isTomorrow(bucket.date);
  const dayLabel = today ? "HOJE" : tomorrow ? "AMANHÃ" : format(bucket.date, "EEE, dd/MMM", { locale: ptBR }).toUpperCase();
  const dateLabel = format(bucket.date, "EEEE, dd 'de' MMMM", { locale: ptBR });
  const counts = countByKind(bucket.items);

  return (
    <div>
      <div className="flex items-center gap-2 mb-2 pb-1 border-b border-neutral-200">
        <span className={cn(
          "px-2.5 py-0.5 rounded text-[11px] font-semibold",
          today ? "bg-emerald-500 text-white" : "bg-neutral-200 text-neutral-700",
        )}>{dayLabel}</span>
        {!today && !tomorrow ? null : (
          <span className="text-[13px] text-neutral-700 font-semibold">{dateLabel}</span>
        )}
        <span className="text-[11px] text-neutral-500 ml-auto">
          {bucket.items.length === 0 ? "livre" : counts.join(" · ")}
        </span>
      </div>
      {bucket.items.length === 0 ? (
        <p className="text-[11px] text-neutral-400 italic px-3 py-1.5">Nenhum evento agendado.</p>
      ) : (
        <div className="space-y-1.5">
          {bucket.items.map(item => (
            <EventChip key={`${item.kind}-${item.id}`} item={item} density="expanded" onClick={() => onEventoClick(item)} />
          ))}
        </div>
      )}
    </div>
  );
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate();
}

function countByKind(items: AgendaItem[]): string[] {
  const c: Record<string, number> = {};
  for (const it of items) c[it.kind] = (c[it.kind] ?? 0) + 1;
  const parts: string[] = [];
  if (c["audiencia"]) parts.push(`${c["audiencia"]} audiência${c["audiencia"] > 1 ? "s" : ""}`);
  if (c["evento"])    parts.push(`${c["evento"]} evento${c["evento"] > 1 ? "s" : ""}`);
  if (c["prazo"])     parts.push(`${c["prazo"]} prazo${c["prazo"] > 1 ? "s" : ""}`);
  return parts;
}
```

- [ ] **Step 2: Renderizar na agenda quando `viewMode === "7d"`**

Em `agenda/page.tsx`, no bloco onde `viewMode === "calendar" ? <CalendarMonthView /> : ...`, adicionar:

```tsx
{viewMode === "7d" ? (
  <Upcoming7View items={items} onEventoClick={handleEventoClick} />
) : viewMode === "calendar" ? (
  <CalendarMonthView ... />
) : ...}
```

- [ ] **Step 3: Smoke test**

```bash
# http://localhost:3000/admin/agenda
# Selecionar "Próximos 7 dias"
# Verificar:
# - "HOJE" destacado em verde
# - "AMANHÃ" presente
# - Datas nominais nos próximos
# - Fim de semana vazio colapsa
```

- [ ] **Step 4: Commit**

```bash
git add src/components/agenda/upcoming-7-view.tsx src/app/\(dashboard\)/admin/agenda/page.tsx
git commit -m "feat(agenda): view Próximos 7 dias [sprint-1]"
```

---

### Task 11: View "7d" como default + lembrar última escolha em localStorage

**Files:**
- Modify: `src/app/(dashboard)/admin/agenda/page.tsx`

- [ ] **Step 1: Substituir useState fixo por hook `useLocalStorageView`**

Adicionar utilitário inline ou criar `src/hooks/use-persistent-state.ts`. Para simplificar, inline:

```tsx
function useViewModePersisted() {
  const [viewMode, setViewModeState] = useState<"7d" | "week" | "calendar" | "list">("7d");

  // Hidrata do localStorage no mount (evita SSR mismatch)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = localStorage.getItem("agenda:viewMode");
    if (saved === "7d" || saved === "week" || saved === "calendar" || saved === "list") {
      setViewModeState(saved);
    }
  }, []);

  const setViewMode = (v: typeof viewMode) => {
    setViewModeState(v);
    if (typeof window !== "undefined") {
      localStorage.setItem("agenda:viewMode", v);
    }
  };

  return [viewMode, setViewMode] as const;
}
```

- [ ] **Step 2: Substituir o `useState` original pela chamada `useViewModePersisted()`**

```tsx
const [viewMode, setViewMode] = useViewModePersisted();
```

- [ ] **Step 3: Smoke test**

```bash
# http://localhost:3000/admin/agenda
# Trocar para "Mês"
# Recarregar página → deve abrir em "Mês" (não em "7d")
# Limpar localStorage → recarregar → abre em "7d"
```

- [ ] **Step 4: Commit**

```bash
git add src/app/\(dashboard\)/admin/agenda/page.tsx
git commit -m "feat(agenda): viewMode persistido em localStorage, default 7d [sprint-1]"
```

---

## Phase 4 — Toggles + Prazos opt-in (Seção 4 do spec)

### Task 12: Criar hook `useAgendaPreferences`

**Files:**
- Create: `src/hooks/use-agenda-preferences.ts`

- [ ] **Step 1: Criar o hook**

```typescript
// src/hooks/use-agenda-preferences.ts
"use client";

import { useEffect, useState, useCallback } from "react";

export type TipoVisivel = "audiencias" | "prazos" | "atendimentos" | "reunioes" | "outros";

export type TiposVisiveis = Record<TipoVisivel, boolean>;

const DEFAULTS: TiposVisiveis = {
  audiencias:   true,  // sempre on (cadeado na UI)
  prazos:       false,
  atendimentos: false,
  reunioes:     false,
  outros:       false,
};

const STORAGE_KEY = "agenda:tipos-visiveis";

export function useAgendaPreferences() {
  const [tiposVisiveis, setTiposVisiveis] = useState<TiposVisiveis>(DEFAULTS);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<TiposVisiveis>;
        // Audiências SEMPRE true (regra do design)
        setTiposVisiveis({ ...DEFAULTS, ...parsed, audiencias: true });
      }
    } catch {
      // localStorage corrompido — ignora, usa defaults
    }
    setHydrated(true);
  }, []);

  const toggleTipo = useCallback((tipo: TipoVisivel) => {
    if (tipo === "audiencias") return; // não permite desligar
    setTiposVisiveis(prev => {
      const next = { ...prev, [tipo]: !prev[tipo] };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  }, []);

  return { tiposVisiveis, toggleTipo, hydrated };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/hooks/use-agenda-preferences.ts
git commit -m "feat(agenda): hook useAgendaPreferences (toggles persistidos) [sprint-1]"
```

---

### Task 13: Criar componente `TipoToggleChips`

**Files:**
- Create: `src/components/agenda/tipo-toggle-chips.tsx`

- [ ] **Step 1: Criar o componente**

```tsx
// src/components/agenda/tipo-toggle-chips.tsx
"use client";

import { cn } from "@/lib/utils";
import { Lock } from "lucide-react";
import type { TipoVisivel, TiposVisiveis } from "@/hooks/use-agenda-preferences";

type ChipDef = {
  key: TipoVisivel;
  label: string;
  icon: string;
  /** Cor base (deve existir no Tailwind) */
  color: "amber" | "rose" | "blue" | "violet" | "neutral";
};

const CHIPS: ChipDef[] = [
  { key: "audiencias",   label: "Audiências",   icon: "⚖", color: "amber" },
  { key: "prazos",       label: "Prazos",       icon: "⏱", color: "rose" },
  { key: "atendimentos", label: "Atendimentos", icon: "👥", color: "blue" },
  { key: "reunioes",     label: "Reuniões",     icon: "📅", color: "violet" },
  { key: "outros",       label: "Outros",       icon: "⋯", color: "neutral" },
];

const ON_CLASSES: Record<ChipDef["color"], string> = {
  amber:   "bg-amber-100 border-amber-500 text-amber-900",
  rose:    "bg-rose-100 border-rose-500 text-rose-900",
  blue:    "bg-blue-100 border-blue-500 text-blue-900",
  violet:  "bg-violet-100 border-violet-500 text-violet-900",
  neutral: "bg-neutral-100 border-neutral-500 text-neutral-900",
};

const OFF_CLASSES = "bg-white border-neutral-300 text-neutral-500 hover:border-neutral-400";

export function TipoToggleChips({
  tiposVisiveis,
  onToggle,
}: {
  tiposVisiveis: TiposVisiveis;
  onToggle: (tipo: TipoVisivel) => void;
}) {
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      <span className="text-[10px] text-neutral-500 uppercase font-semibold tracking-wide min-w-[70px]">
        Mostrar:
      </span>
      {CHIPS.map(chip => {
        const isOn = tiposVisiveis[chip.key];
        const isLocked = chip.key === "audiencias";
        return (
          <button
            key={chip.key}
            type="button"
            onClick={() => onToggle(chip.key)}
            disabled={isLocked}
            className={cn(
              "px-2.5 py-1 rounded-full border text-[11px] font-semibold transition-colors inline-flex items-center gap-1",
              isOn ? ON_CLASSES[chip.color] : OFF_CLASSES,
              isLocked && "cursor-default",
            )}
            title={isLocked ? "Audiências sempre aparecem" : undefined}
          >
            <span>{chip.icon} {chip.label}</span>
            {isLocked && <Lock className="w-2.5 h-2.5 opacity-50" />}
            {isOn && !isLocked && <span className="w-1.5 h-1.5 rounded-full bg-current" />}
          </button>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/agenda/tipo-toggle-chips.tsx
git commit -m "feat(agenda): TipoToggleChips component [sprint-1]"
```

---

### Task 14: Modificar `calendar.list` no router para aceitar `tiposVisiveis` e retornar lista discriminada

**Files:**
- Modify: `src/lib/trpc/routers/calendar.ts`

- [ ] **Step 1: Localizar endpoint `list` (~linha 98)**

Abrir o arquivo e localizar a definição de `list: protectedProcedure.input(...).query(...)`.

- [ ] **Step 2: Adicionar input `tiposVisiveis` ao schema do endpoint**

```typescript
import { z } from "zod";

const tiposVisiveisSchema = z.object({
  audiencias:   z.boolean().default(true),
  prazos:       z.boolean().default(false),
  atendimentos: z.boolean().default(false),
  reunioes:     z.boolean().default(false),
  outros:       z.boolean().default(false),
}).default({
  audiencias: true, prazos: false, atendimentos: false, reunioes: false, outros: false
});

// No endpoint list:
list: protectedProcedure
  .input(z.object({
    dataInicio: z.date(),
    dataFim:    z.date(),
    tiposVisiveis: tiposVisiveisSchema,
    // ... outros params existentes (atribuicao, etc.)
  }))
  .query(async ({ input, ctx }) => {
    // ... ver Step 3
  });
```

- [ ] **Step 3: Substituir corpo do endpoint por `Promise.all` condicional**

```typescript
import { and, eq, gte, lte, ne, inArray } from "drizzle-orm";
import { audiencias, calendarEvents } from "@/lib/db/schema/agenda";
import { calculosPrazos } from "@/lib/db/schema/prazos";
import { demandas } from "@/lib/db/schema/demandas";

const { dataInicio, dataFim, tiposVisiveis } = input;
const userId = ctx.user!.id;

const tiposEventoVisiveis: string[] = [];
if (tiposVisiveis.atendimentos) tiposEventoVisiveis.push("atendimento");
if (tiposVisiveis.reunioes)     tiposEventoVisiveis.push("reuniao");
if (tiposVisiveis.outros)       tiposEventoVisiveis.push("outro");

const [audiList, eventList, prazoList] = await Promise.all([
  // Audiências sempre
  db.select().from(audiencias).where(and(
    eq(audiencias.defensorId, userId),
    gte(audiencias.dataHora, dataInicio),
    lte(audiencias.dataHora, dataFim),
  )),
  // Eventos só se algum tipo está ligado
  tiposEventoVisiveis.length > 0
    ? db.select().from(calendarEvents).where(and(
        eq(calendarEvents.userId, userId),
        gte(calendarEvents.dataHora, dataInicio),
        lte(calendarEvents.dataHora, dataFim),
        inArray(calendarEvents.tipoEvento, tiposEventoVisiveis),
      ))
    : Promise.resolve([] as Array<typeof calendarEvents.$inferSelect>),
  // Prazos só se ligado
  tiposVisiveis.prazos
    ? db.select({
        prazo: calculosPrazos,
        demanda: demandas,
      })
      .from(calculosPrazos)
      .innerJoin(demandas, eq(calculosPrazos.demandaId, demandas.id))
      .where(and(
        eq(demandas.defensorId, userId),
        gte(calculosPrazos.dataTermoFinal, dataInicio),
        lte(calculosPrazos.dataTermoFinal, dataFim),
        ne(demandas.status, "concluida"),
      ))
    : Promise.resolve([]),
]);

const today = new Date();
today.setHours(0, 0, 0, 0);

const items = [
  ...audiList.map(a => ({
    kind: "audiencia" as const,
    id: a.id,
    dataHora: a.dataHora,
    titulo: a.titulo ?? "Audiência",
    atribuicao: a.atribuicao ?? null,
    processoId: a.processoId,
    processoNumero: a.processoNumero ?? null,
    assistidoNome: a.assistidoNome ?? null,
    local: a.local ?? null,
    vara: a.vara ?? null,
    sala: a.sala ?? null,
    registroFeito: a.registroFeito ?? false,
    temAdvogadoConstituido: a.temAdvogadoConstituido ?? false,
    urgente: a.urgente ?? false,
    googleCalendarEventId: a.googleCalendarEventId ?? null,
  })),
  ...eventList.map(e => ({
    kind: "evento" as const,
    id: e.id,
    dataHora: e.dataHora,
    titulo: e.titulo,
    atribuicao: e.atribuicao ?? null,
    processoId: e.processoId,
    processoNumero: e.processoNumero ?? null,
    assistidoNome: null,
    local: e.local ?? null,
    tipoEvento: e.tipoEvento as "atendimento" | "reuniao" | "outro",
    googleCalendarEventId: e.googleCalendarEventId ?? null,
  })),
  ...prazoList.map(({ prazo, demanda }) => {
    const diffMs = prazo.dataTermoFinal.getTime() - today.getTime();
    const diasAteVencer = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    return {
      kind: "prazo" as const,
      id: prazo.id,
      dataHora: prazo.dataTermoFinal,
      titulo: prazo.tipoPrazoCodigo,
      atribuicao: demanda.atribuicao ?? null,
      processoId: demanda.processoId,
      processoNumero: demanda.processoNumero ?? null,
      assistidoNome: demanda.assistidoNome ?? null,
      local: null,
      dataTermoFinal: prazo.dataTermoFinal,
      tipoPrazoCodigo: prazo.tipoPrazoCodigo,
      demandaId: prazo.demandaId!,
      diasAteVencer,
    };
  }),
];

return items;
```

> **Nota:** Os nomes dos campos (ex: `defensorId`, `processoNumero`, `atribuicao`) podem variar — ajustar conforme schema real. Se algum campo não existir, retornar `null`.

- [ ] **Step 4: Verificar typecheck**

```bash
npx tsc --noEmit 2>&1 | grep "calendar.ts"
```
Expected: 0 erros. Se houver erro de campo inexistente, ajustar `select()` para incluir só campos reais.

- [ ] **Step 5: Smoke test no browser**

```bash
# http://localhost:3000/admin/agenda
# Verificar que audiências ainda aparecem
# Console do browser: tRPC query agenda.list deve incluir tiposVisiveis no payload
```

- [ ] **Step 6: Commit**

```bash
git add src/lib/trpc/routers/calendar.ts
git commit -m "feat(calendar): query unificada com tiposVisiveis [sprint-1]"
```

---

### Task 15: Wirar `TipoToggleChips` na agenda + passar `tiposVisiveis` na query

**Files:**
- Modify: `src/app/(dashboard)/admin/agenda/page.tsx`

- [ ] **Step 1: Importar e usar o hook + componente**

```tsx
import { useAgendaPreferences } from "@/hooks/use-agenda-preferences";
import { TipoToggleChips } from "@/components/agenda/tipo-toggle-chips";

// Dentro do componente:
const { tiposVisiveis, toggleTipo, hydrated } = useAgendaPreferences();
```

- [ ] **Step 2: Renderizar `<TipoToggleChips>` abaixo das pills de atribuição**

```tsx
<div className="bg-neutral-50 border border-neutral-200 border-t-0 px-4 py-2">
  <TipoToggleChips tiposVisiveis={tiposVisiveis} onToggle={toggleTipo} />
</div>
```

- [ ] **Step 3: Passar `tiposVisiveis` para a query tRPC**

Localizar `trpc.calendar.list.useQuery({...})` e adicionar:

```tsx
const { data: items = [] } = trpc.calendar.list.useQuery(
  { dataInicio, dataFim, tiposVisiveis },
  { enabled: hydrated }, // só faz a query depois de hidratar localStorage
);
```

- [ ] **Step 4: Smoke test**

```bash
# http://localhost:3000/admin/agenda
# Audiências aparecem (sempre)
# Clicar "⏱ Prazos" → prazos aparecem
# Clicar de novo → somem
# Recarregar → escolha persistida
```

- [ ] **Step 5: Commit**

```bash
git add src/app/\(dashboard\)/admin/agenda/page.tsx
git commit -m "feat(agenda): toggles de tipo wirados na query [sprint-1]"
```

---

### Task 16: Action inline `✍ Peça` para prazos no `EventChip`

**Files:**
- Modify: `src/components/agenda/event-chip.tsx`

- [ ] **Step 1: Adicionar prop `onAction` e renderizar quando expanded + prazo**

Adicionar tipo:

```tsx
type EventChipAction = "dossie" | "autos" | "peca" | "marcar-feito";

type EventChipProps = {
  item: AgendaItem;
  density: "compact" | "expanded";
  onClick?: () => void;
  onAction?: (action: EventChipAction) => void;
  className?: string;
};
```

No bloco `expanded`, adicionar antes do fechamento do `<button>` externo (NÃO dentro do button — usar wrapper div para não aninhar buttons):

Refatorar wrapper externo para `div` clicável (com `role="button"` e `onKeyDown`):

```tsx
return (
  <div
    role="button"
    tabIndex={0}
    onClick={onClick}
    onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onClick?.(); }}
    className={cn(
      colors.bg, "border-l-[3px]", colors.border,
      "px-3 py-2 rounded-md text-xs flex gap-3 items-start w-full text-left",
      "hover:opacity-90 transition-opacity cursor-pointer",
      className,
    )}
  >
    {/* ... conteúdo existente ... */}
    {density === "expanded" && onAction && (
      <div className="flex gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
        {isAudiencia(item) && (
          <>
            <ActionButton onClick={() => onAction("dossie")} colors={colors} label="📄 Dossiê" />
            <ActionButton onClick={() => onAction("autos")} colors={colors} label="📥 Autos" />
          </>
        )}
        {isPrazo(item) && (
          <>
            <ActionButton onClick={() => onAction("peca")} colors={colors} label="✍ Peça" />
            <ActionButton onClick={() => onAction("marcar-feito")} colors={colors} label="✓" />
          </>
        )}
      </div>
    )}
  </div>
);

function ActionButton({ onClick, colors, label }: { onClick: () => void; colors: typeof EVENT_COLOR_CLASSES.amber; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "bg-white border text-[10px] px-2 py-1 rounded hover:opacity-80",
        colors.border, colors.text,
      )}
    >{label}</button>
  );
}
```

- [ ] **Step 2: Wirar `onAction` na agenda**

Em `agenda/page.tsx`, criar handler:

```tsx
import { useRouter } from "next/navigation";
const router = useRouter();

const handleAction = (item: AgendaItem, action: "dossie" | "autos" | "peca" | "marcar-feito") => {
  if (action === "dossie" && item.processoId)  router.push(`/admin/processos/${item.processoId}?tab=analise`);
  if (action === "autos"  && item.processoId)  router.push(`/admin/processos/${item.processoId}?tab=autos`);
  if (action === "peca"   && isPrazo(item))    router.push(`/admin/pecas/nova?prazo=${item.id}&tipo=${item.tipoPrazoCodigo}`);
  if (action === "marcar-feito" && isPrazo(item)) {
    // chamar mutation prazos.marcarConcluido
    marcarPrazoMutation.mutate({ id: item.id });
  }
};
```

Passar para Upcoming7View → EventChip:

```tsx
<EventChip
  item={item}
  density="expanded"
  onClick={() => handleEventoClick(item)}
  onAction={(act) => handleAction(item, act)}
/>
```

- [ ] **Step 3: Smoke test**

```bash
# Ligar toggle de Prazos
# Clicar "✍ Peça" → deve navegar pra editor de peça
# Clicar "📄 Dossiê" numa audiência → navegar pro processo aba análise
```

- [ ] **Step 4: Commit**

```bash
git add src/components/agenda/event-chip.tsx src/app/\(dashboard\)/admin/agenda/page.tsx
git commit -m "feat(agenda): ações inline no EventChip (Dossiê/Autos/Peça/Marcar) [sprint-1]"
```

---

## Phase 5 — Quick-add + Atalhos (Seção 5 do spec)

### Task 17: Criar `quick-add-parser.ts` com TDD

**Files:**
- Create: `src/lib/agenda/quick-add-parser.ts`
- Test: `__tests__/agenda/quick-add-parser.test.ts`

- [ ] **Step 1: Escrever testes falhando**

```typescript
// __tests__/agenda/quick-add-parser.test.ts
import { describe, it, expect } from "vitest";
import { parseQuickAdd } from "@/lib/agenda/quick-add-parser";

describe("parseQuickAdd", () => {
  it("extrai hora HHh", () => {
    const r = parseQuickAdd("Reunião 14h equipe");
    expect(r.hora).toBe("14:00");
  });

  it("extrai hora HH:MM", () => {
    const r = parseQuickAdd("Audiência 09:30 Maria");
    expect(r.hora).toBe("09:30");
  });

  it("extrai hora 'às Hh'", () => {
    const r = parseQuickAdd("Atendimento às 16h João");
    expect(r.hora).toBe("16:00");
  });

  it("extrai tipo audiencia", () => {
    expect(parseQuickAdd("Audiência 14h Maria").tipo).toBe("audiencia");
  });

  it("extrai tipo atendimento", () => {
    expect(parseQuickAdd("Atendimento 16h João").tipo).toBe("atendimento");
  });

  it("extrai tipo reuniao", () => {
    expect(parseQuickAdd("Reunião 14h equipe").tipo).toBe("reuniao");
  });

  it("default tipo outro quando não identifica", () => {
    expect(parseQuickAdd("Lembrete 10h algo").tipo).toBe("outro");
  });

  it("extrai número CNJ completo", () => {
    const r = parseQuickAdd("Audiência 14h Maria 0001234-56.2024.8.05.0001");
    expect(r.processoNumeroCnj).toBe("0001234-56.2024.8.05.0001");
  });

  it("extrai número CNJ curto (sem segmentos finais)", () => {
    const r = parseQuickAdd("Audiência 14h Maria 0001234-56.2024");
    expect(r.processoNumeroCnj).toBe("0001234-56.2024");
  });

  it("título é o resto sem hora/tipo/CNJ", () => {
    const r = parseQuickAdd("Audiência 14h Maria Santos 0001234-56.2024");
    expect(r.titulo).toBe("Maria Santos");
  });

  it("tudo vazio retorna campos vazios mas tipo outro", () => {
    expect(parseQuickAdd("")).toEqual({ tipo: "outro", hora: null, processoNumeroCnj: null, titulo: "" });
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

```bash
npx vitest run __tests__/agenda/quick-add-parser.test.ts
```
Expected: FAIL — módulo não existe

- [ ] **Step 3: Implementar**

```typescript
// src/lib/agenda/quick-add-parser.ts
export type QuickAddParsed = {
  tipo: "audiencia" | "atendimento" | "reuniao" | "outro";
  hora: string | null;            // "HH:MM"
  processoNumeroCnj: string | null;
  titulo: string;
};

const TIPO_PATTERNS: Array<[RegExp, QuickAddParsed["tipo"]]> = [
  [/\b(audi[êe]ncia|aud\.?)\b/i,        "audiencia"],
  [/\b(atendimento|atend\.?)\b/i,       "atendimento"],
  [/\b(reuni[ãa]o)\b/i,                 "reuniao"],
];

const HORA_RE = /(?:\bàs?\s+)?\b([01]?\d|2[0-3])(?:h(?!\w)|:([0-5]\d))(?:([0-5]\d))?\b/i;
const CNJ_RE  = /\b(\d{7}-\d{2}\.\d{4}(?:\.\d\.\d{2}\.\d{4})?)\b/;

export function parseQuickAdd(input: string): QuickAddParsed {
  let titulo = input.trim();

  // Tipo
  let tipo: QuickAddParsed["tipo"] = "outro";
  for (const [re, t] of TIPO_PATTERNS) {
    if (re.test(titulo)) {
      tipo = t;
      titulo = titulo.replace(re, "").trim();
      break;
    }
  }

  // Hora
  let hora: string | null = null;
  const horaMatch = titulo.match(HORA_RE);
  if (horaMatch) {
    const hh = horaMatch[1].padStart(2, "0");
    const mm = (horaMatch[2] ?? horaMatch[3] ?? "00").padStart(2, "0");
    hora = `${hh}:${mm}`;
    titulo = titulo.replace(horaMatch[0], "").trim();
  }

  // CNJ
  let processoNumeroCnj: string | null = null;
  const cnjMatch = titulo.match(CNJ_RE);
  if (cnjMatch) {
    processoNumeroCnj = cnjMatch[1];
    titulo = titulo.replace(cnjMatch[0], "").trim();
  }

  // Limpa título
  titulo = titulo.replace(/\s{2,}/g, " ").trim();

  return { tipo, hora, processoNumeroCnj, titulo };
}
```

- [ ] **Step 4: Rodar e ver passar**

```bash
npx vitest run __tests__/agenda/quick-add-parser.test.ts
```
Expected: PASS — 11 testes verdes

- [ ] **Step 5: Commit**

```bash
git add src/lib/agenda/quick-add-parser.ts __tests__/agenda/quick-add-parser.test.ts
git commit -m "feat(agenda): quick-add parser (tipo/hora/CNJ) [sprint-1]"
```

---

### Task 18: Criar `ProcessoCombo` (autocomplete searchable)

**Files:**
- Create: `src/components/shared/processo-combo.tsx`

- [ ] **Step 1: Criar o componente usando shadcn `Command`**

```tsx
// src/components/shared/processo-combo.tsx
"use client";

import { useState, useEffect } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { trpc } from "@/lib/trpc/client";
import { useDebounce } from "@/hooks/use-debounce"; // se não existir, criar trivial

export type ProcessoOption = {
  id: number;
  numero: string;
  assistidoNome: string;
  atribuicao: string | null;
};

type ProcessoComboProps = {
  value?: ProcessoOption | null;
  onChange: (p: ProcessoOption | null) => void;
  placeholder?: string;
};

export function ProcessoCombo({ value, onChange, placeholder = "Buscar processo..." }: ProcessoComboProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 200);

  const { data: options = [], isLoading } = trpc.processos.search.useQuery(
    { q: debouncedSearch, limit: 10 },
    { enabled: debouncedSearch.length >= 2 },
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" aria-expanded={open} className="w-full justify-between">
          {value ? (
            <span className="truncate">
              <span className="font-semibold">{value.assistidoNome}</span>
              <span className="text-neutral-500 ml-2 text-xs">{value.numero}</span>
            </span>
          ) : (
            <span className="text-neutral-500">{placeholder}</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Digite nome do assistido ou número..."
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            {isLoading && <div className="p-2 text-xs text-neutral-500">Buscando...</div>}
            {!isLoading && debouncedSearch.length < 2 && (
              <div className="p-2 text-xs text-neutral-500">Digite ao menos 2 caracteres.</div>
            )}
            {!isLoading && debouncedSearch.length >= 2 && options.length === 0 && (
              <CommandEmpty>Nenhum processo encontrado.</CommandEmpty>
            )}
            <CommandGroup>
              {options.map(opt => (
                <CommandItem
                  key={opt.id}
                  value={String(opt.id)}
                  onSelect={() => { onChange(opt); setOpen(false); }}
                >
                  <Check className={cn("mr-2 h-4 w-4", value?.id === opt.id ? "opacity-100" : "opacity-0")} />
                  <div className="flex flex-col">
                    <span className="font-semibold text-sm">{opt.assistidoNome}</span>
                    <span className="text-xs text-neutral-500">{opt.numero} · {opt.atribuicao ?? "—"}</span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
```

- [ ] **Step 2: Garantir que `processos.search` existe no router**

```bash
grep -n "search:\s*protectedProcedure" /Users/rodrigorochameire/Projetos/Defender/src/lib/trpc/routers/processos.ts
```
Se não existir, criar (próximo step). Se existir, pular Step 3.

- [ ] **Step 3: (se necessário) Criar endpoint `processos.search`**

Em `src/lib/trpc/routers/processos.ts`:

```typescript
search: protectedProcedure
  .input(z.object({ q: z.string().min(1), limit: z.number().default(10) }))
  .query(async ({ input, ctx }) => {
    const q = `%${input.q}%`;
    return await db.select({
      id: processos.id,
      numero: processos.numero,
      assistidoNome: assistidos.nome,
      atribuicao: processos.atribuicao,
    })
    .from(processos)
    .leftJoin(assistidos, eq(processos.assistidoId, assistidos.id))
    .where(or(
      ilike(processos.numero, q),
      ilike(assistidos.nome, q),
    ))
    .limit(input.limit);
  }),
```

- [ ] **Step 4: Criar hook `use-debounce` se não existir**

```typescript
// src/hooks/use-debounce.ts
"use client";
import { useEffect, useState } from "react";

export function useDebounce<T>(value: T, ms: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return debounced;
}
```

- [ ] **Step 5: Commit**

```bash
git add src/components/shared/processo-combo.tsx src/hooks/use-debounce.ts src/lib/trpc/routers/processos.ts
git commit -m "feat(shared): ProcessoCombo autocomplete + processos.search [sprint-1]"
```

---

### Task 19: Substituir input texto livre em `evento-create-modal.tsx` por `ProcessoCombo`

**Files:**
- Modify: `src/components/agenda/evento-create-modal.tsx`

- [ ] **Step 1: Localizar campo processo (linha ~386)**

Encontrar o `<Input ... value={formData.processo} ...>` e capturar o estado relacionado.

- [ ] **Step 2: Substituir por `<ProcessoCombo>`**

```tsx
import { ProcessoCombo, type ProcessoOption } from "@/components/shared/processo-combo";

// No state:
const [processo, setProcesso] = useState<ProcessoOption | null>(null);

// No JSX (substituir o Input antigo):
<div className="space-y-2">
  <Label>Processo</Label>
  <ProcessoCombo value={processo} onChange={setProcesso} />
</div>

// No submit:
const payload = {
  ...formData,
  processoId: processo?.id ?? null,
  processoNumero: processo?.numero ?? null,
};
```

- [ ] **Step 3: Smoke test**

```bash
# http://localhost:3000/admin/agenda
# Clicar "+ Novo"
# Campo "Processo" deve mostrar autocomplete searchable
# Digitar nome de assistido → resultados aparecem
```

- [ ] **Step 4: Commit**

```bash
git add src/components/agenda/evento-create-modal.tsx
git commit -m "feat(agenda): processo via ProcessoCombo no modal [sprint-1]"
```

---

### Task 20: Criar `QuickAddInline` component

**Files:**
- Create: `src/components/agenda/quick-add-inline.tsx`

- [ ] **Step 1: Criar o componente**

```tsx
// src/components/agenda/quick-add-inline.tsx
"use client";

import { useState, useRef, useEffect } from "react";
import { parseQuickAdd } from "@/lib/agenda/quick-add-parser";
import { trpc } from "@/lib/trpc/client";
import { toast } from "sonner";

type QuickAddInlineProps = {
  /** Data base (dia clicado) */
  date: Date;
  onCreated: () => void;
  onCancel: () => void;
  onOpenFullModal: (parsed: ReturnType<typeof parseQuickAdd>, date: Date) => void;
};

export function QuickAddInline({ date, onCreated, onCancel, onOpenFullModal }: QuickAddInlineProps) {
  const [text, setText] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const utils = trpc.useUtils();

  const parsed = parseQuickAdd(text);

  const createEventoMutation = trpc.eventos.create.useMutation({
    onSuccess: () => {
      toast.success("Evento criado!");
      utils.calendar.list.invalidate();
      onCreated();
    },
    onError: (err) => toast.error("Erro ao criar", { description: err.message }),
  });

  useEffect(() => { inputRef.current?.focus(); }, []);

  const handleSubmit = () => {
    if (!text.trim()) return;
    const dataHora = new Date(date);
    if (parsed.hora) {
      const [hh, mm] = parsed.hora.split(":").map(Number);
      dataHora.setHours(hh, mm, 0, 0);
    }
    createEventoMutation.mutate({
      titulo: parsed.titulo || text,
      tipoEvento: parsed.tipo === "audiencia" ? "outro" : parsed.tipo, // audiência via outro fluxo (modal completo)
      dataHora,
      processoNumeroCnj: parsed.processoNumeroCnj ?? undefined,
    });
  };

  return (
    <div className="border-2 border-emerald-500 rounded-md p-2 bg-emerald-50">
      <input
        ref={inputRef}
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") { e.preventDefault(); handleSubmit(); }
          if (e.key === "Escape") { e.preventDefault(); onCancel(); }
        }}
        placeholder="Audiência 14h Maria Santos 0001234-56.2024"
        className="w-full bg-transparent border-0 outline-none text-xs px-2 py-1"
      />
      {text.trim() && (
        <div className="mt-2 bg-white border border-neutral-200 rounded text-[10px]">
          <div className="px-2 py-1 bg-neutral-100 text-neutral-700 flex gap-2">
            <span>{parsed.tipo}</span>
            {parsed.hora && <span>{parsed.hora}</span>}
            {parsed.processoNumeroCnj && <span>{parsed.processoNumeroCnj}</span>}
            <span className="ml-auto text-neutral-500">parsed</span>
          </div>
          <div className="px-2 py-1 text-neutral-700 truncate">{parsed.titulo || "(sem título)"}</div>
        </div>
      )}
      <div className="mt-2 flex gap-2 text-[10px]">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!text.trim() || createEventoMutation.isPending}
          className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white px-2 py-1 rounded"
        >↵ Criar</button>
        <button
          type="button"
          onClick={() => onOpenFullModal(parsed, date)}
          className="bg-white border border-neutral-300 text-neutral-700 px-2 py-1 rounded"
        >⋯ Modal completo</button>
        <span className="ml-auto text-neutral-400">Esc cancela</span>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Smoke test (depois de Task 21 que wira na agenda)**

Pular smoke aqui — testar na próxima task.

- [ ] **Step 3: Commit**

```bash
git add src/components/agenda/quick-add-inline.tsx
git commit -m "feat(agenda): QuickAddInline component [sprint-1]"
```

---

### Task 21: Wirar `QuickAddInline` no `Upcoming7View` (clique em dia)

**Files:**
- Modify: `src/components/agenda/upcoming-7-view.tsx`

- [ ] **Step 1: Adicionar slot vazio + state de "qual dia está com quick-add aberto"**

Em `Upcoming7View`, adicionar:

```tsx
import { QuickAddInline } from "@/components/agenda/quick-add-inline";

const [quickAddDate, setQuickAddDate] = useState<Date | null>(null);
```

No `DaySection`, depois da lista de items:

```tsx
{quickAddDate && isSameDay(quickAddDate, bucket.date) ? (
  <QuickAddInline
    date={bucket.date}
    onCreated={() => setQuickAddDate(null)}
    onCancel={() => setQuickAddDate(null)}
    onOpenFullModal={(parsed, date) => {
      setQuickAddDate(null);
      onOpenFullModal(parsed, date);
    }}
  />
) : (
  <button
    type="button"
    onClick={() => setQuickAddDate(bucket.date)}
    className="border border-dashed border-neutral-300 rounded p-2 text-[11px] text-neutral-400 text-center w-full hover:border-neutral-400 hover:bg-neutral-50"
  >+ adicionar evento</button>
)}
```

Adicionar prop `onOpenFullModal` ao componente.

- [ ] **Step 2: Wirar `onOpenFullModal` na agenda**

Em `agenda/page.tsx`:

```tsx
const [evtModalInitial, setEvtModalInitial] = useState<{ parsed?: any; date?: Date } | null>(null);

// Passar pra Upcoming7View:
onOpenFullModal={(parsed, date) => setEvtModalInitial({ parsed, date })}

// Renderizar EventoCreateModal aceitando initial:
<EventoCreateModal initial={evtModalInitial} ... />
```

(Aceitar `initial` na assinatura do modal — pequena modificação no modal pra hidratar campos do `initial`.)

- [ ] **Step 3: Smoke test**

```bash
# http://localhost:3000/admin/agenda
# View "7d"
# Clicar "+ adicionar evento" abaixo do dia
# Digitar "Reunião 14h equipe" → preview parsed correto
# Enter → evento criado, lista atualizada
```

- [ ] **Step 4: Commit**

```bash
git add src/components/agenda/upcoming-7-view.tsx src/app/\(dashboard\)/admin/agenda/page.tsx src/components/agenda/evento-create-modal.tsx
git commit -m "feat(agenda): quick-add inline na view 7d [sprint-1]"
```

---

### Task 22: Criar hook `useAgendaShortcuts`

**Files:**
- Create: `src/hooks/use-agenda-shortcuts.ts`

- [ ] **Step 1: Criar o hook**

```typescript
// src/hooks/use-agenda-shortcuts.ts
"use client";

import { useEffect } from "react";

export type AgendaShortcutHandlers = {
  onToday?: () => void;
  onNext?: () => void;
  onPrev?: () => void;
  onView7d?: () => void;
  onViewWeek?: () => void;
  onViewMonth?: () => void;
  onViewList?: () => void;
  onNew?: () => void;
  onSearch?: () => void;
  onShowShortcuts?: () => void;
};

const isTypingTarget = (e: KeyboardEvent): boolean => {
  const t = e.target as HTMLElement | null;
  if (!t) return false;
  if (t.isContentEditable) return true;
  const tag = t.tagName?.toLowerCase();
  return tag === "input" || tag === "textarea" || tag === "select";
};

const isModifierPressed = (e: KeyboardEvent): boolean =>
  e.ctrlKey || e.metaKey || e.altKey;

export function useAgendaShortcuts(handlers: AgendaShortcutHandlers) {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (isTypingTarget(e)) return;
      if (isModifierPressed(e)) return;

      switch (e.key) {
        case "t": case "T":         handlers.onToday?.(); break;
        case "j": case "J": case "ArrowRight": handlers.onNext?.(); break;
        case "k": case "K": case "ArrowLeft":  handlers.onPrev?.(); break;
        case "1":                   handlers.onView7d?.(); break;
        case "2":                   handlers.onViewWeek?.(); break;
        case "3":                   handlers.onViewMonth?.(); break;
        case "4":                   handlers.onViewList?.(); break;
        case "n": case "N":         handlers.onNew?.(); break;
        case "/":                   e.preventDefault(); handlers.onSearch?.(); break;
        case "?":                   handlers.onShowShortcuts?.(); break;
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handlers]);
}
```

- [ ] **Step 2: Commit**

```bash
git add src/hooks/use-agenda-shortcuts.ts
git commit -m "feat(agenda): hook useAgendaShortcuts [sprint-1]"
```

---

### Task 23: Criar `KeyboardShortcutsDialog` (modal acionado por `?`)

**Files:**
- Create: `src/components/shared/keyboard-shortcuts-dialog.tsx`

- [ ] **Step 1: Criar o componente**

```tsx
// src/components/shared/keyboard-shortcuts-dialog.tsx
"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type ShortcutGroup = { title: string; items: Array<{ keys: string[]; label: string }> };

type Props = { open: boolean; onOpenChange: (v: boolean) => void; groups: ShortcutGroup[] };

export function KeyboardShortcutsDialog({ open, onOpenChange, groups }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Atalhos de teclado</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4 text-sm">
          {groups.map(g => (
            <div key={g.title}>
              <div className="text-[10px] uppercase font-semibold text-neutral-500 mb-2">{g.title}</div>
              {g.items.map((item, i) => (
                <div key={i} className="flex items-center justify-between py-1 border-b border-neutral-100 last:border-0">
                  <span>{item.label}</span>
                  <span className="flex gap-1">
                    {item.keys.map(k => (
                      <kbd key={k} className="bg-neutral-100 px-1.5 py-0.5 rounded font-mono text-xs border border-neutral-200">{k}</kbd>
                    ))}
                  </span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export const AGENDA_SHORTCUTS: ShortcutGroup[] = [
  {
    title: "Navegação",
    items: [
      { keys: ["T"],          label: "Voltar pra hoje" },
      { keys: ["J", "→"],     label: "Próximo período" },
      { keys: ["K", "←"],     label: "Período anterior" },
      { keys: ["1"],          label: "View 7d" },
      { keys: ["2"],          label: "View Semana" },
      { keys: ["3"],          label: "View Mês" },
      { keys: ["4"],          label: "View Lista" },
    ],
  },
  {
    title: "Ações",
    items: [
      { keys: ["N"],          label: "Novo evento" },
      { keys: ["/"],          label: "Buscar" },
      { keys: ["?"],          label: "Mostrar atalhos" },
      { keys: ["Esc"],        label: "Fechar" },
    ],
  },
];
```

- [ ] **Step 2: Commit**

```bash
git add src/components/shared/keyboard-shortcuts-dialog.tsx
git commit -m "feat(shared): KeyboardShortcutsDialog [sprint-1]"
```

---

### Task 24: Wirar atalhos na `agenda/page.tsx`

**Files:**
- Modify: `src/app/(dashboard)/admin/agenda/page.tsx`

- [ ] **Step 1: Conectar hook + state do dialog**

```tsx
import { useAgendaShortcuts } from "@/hooks/use-agenda-shortcuts";
import { KeyboardShortcutsDialog, AGENDA_SHORTCUTS } from "@/components/shared/keyboard-shortcuts-dialog";

const [showShortcuts, setShowShortcuts] = useState(false);
const [showSearch, setShowSearch] = useState(false);
const [showCreate, setShowCreate] = useState(false);

useAgendaShortcuts({
  onToday:          () => setCurrentDate(new Date()),
  onNext:           () => navigateNext(),
  onPrev:           () => navigatePrev(),
  onView7d:         () => setViewMode("7d"),
  onViewWeek:       () => setViewMode("week"),
  onViewMonth:      () => setViewMode("calendar"),
  onViewList:       () => setViewMode("list"),
  onNew:            () => setShowCreate(true),
  onSearch:         () => setShowSearch(true),
  onShowShortcuts:  () => setShowShortcuts(true),
});

// Renderizar dialog:
<KeyboardShortcutsDialog open={showShortcuts} onOpenChange={setShowShortcuts} groups={AGENDA_SHORTCUTS} />
```

`navigateNext`/`navigatePrev` já existem (handlers de seta que avançam mês/semana/dia conforme view).

- [ ] **Step 2: Smoke test**

```bash
# http://localhost:3000/admin/agenda
# Pressionar T → vai pra hoje
# Pressionar 1, 2, 3, 4 → muda view
# Pressionar N → abre modal de novo evento
# Pressionar ? → abre dialog de atalhos
# Pressionar Esc → fecha
# Focar em input e pressionar T → NADA acontece (não rouba digitação)
```

- [ ] **Step 3: Commit**

```bash
git add src/app/\(dashboard\)/admin/agenda/page.tsx
git commit -m "feat(agenda): wirar atalhos de teclado [sprint-1]"
```

---

## Phase 6 — Google Calendar Fase 1 (Seção 6 do spec)

### Task 25: Migration `sync_queue`

**Files:**
- Create: `src/lib/db/schema/sync.ts`
- Create: `drizzle/migrations/XXXX_sync_queue.sql` (gerado pelo drizzle-kit)

- [ ] **Step 1: Criar schema Drizzle**

```typescript
// src/lib/db/schema/sync.ts
import { pgTable, serial, integer, varchar, text, timestamp, jsonb, index } from "drizzle-orm/pg-core";
import { users } from "./core";

export const syncQueue = pgTable("sync_queue", {
  id:           serial("id").primaryKey(),
  userId:       integer("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  operation:    varchar("operation", { length: 20 }).notNull(),       // 'upsert' | 'delete'
  entityType:   varchar("entity_type", { length: 20 }).notNull(),     // 'audiencia' | 'evento'
  entityId:     integer("entity_id").notNull(),
  payload:      jsonb("payload").$type<Record<string, unknown>>(),
  attempts:     integer("attempts").default(0).notNull(),
  lastError:    text("last_error"),
  nextRetryAt:  timestamp("next_retry_at").defaultNow().notNull(),
  status:       varchar("status", { length: 20 }).default("pending").notNull(), // pending | success | failed
  createdAt:    timestamp("created_at").defaultNow().notNull(),
  updatedAt:    timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("sync_queue_status_idx").on(table.status),
  index("sync_queue_next_retry_at_idx").on(table.nextRetryAt),
  index("sync_queue_user_id_idx").on(table.userId),
]);

export type SyncQueueEntry = typeof syncQueue.$inferSelect;
export type InsertSyncQueueEntry = typeof syncQueue.$inferInsert;
```

- [ ] **Step 2: Adicionar export ao index do schema**

Em `src/lib/db/schema/index.ts`, adicionar:

```typescript
export * from "./sync";
```

- [ ] **Step 3: Gerar migration**

```bash
cd /Users/rodrigorochameire/Projetos/Defender
npm run db:generate
```
Expected: arquivo `drizzle/migrations/XXXX_<auto-name>.sql` criado contendo `CREATE TABLE sync_queue`.

- [ ] **Step 4: Aplicar no banco (DEV)**

```bash
npm run db:push
```

- [ ] **Step 5: Commit**

```bash
git add src/lib/db/schema/sync.ts src/lib/db/schema/index.ts drizzle/migrations/
git commit -m "feat(db): tabela sync_queue para retry de integrações [sprint-1]"
```

---

### Task 26: Adicionar scope `calendar.events` ao OAuth Google

**Files:**
- Modify: `src/lib/integrations/google-oauth.ts` (ou onde scopes são definidos)

- [ ] **Step 1: Localizar config OAuth atual**

```bash
grep -rn "scope.*google\|googleapis.com/auth" /Users/rodrigorochameire/Projetos/Defender/src/lib/integrations 2>/dev/null
```

- [ ] **Step 2: Adicionar scope `https://www.googleapis.com/auth/calendar.events`**

No array de scopes, adicionar:

```typescript
const GOOGLE_SCOPES = [
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/drive.file",     // já existe
  "https://www.googleapis.com/auth/spreadsheets",   // já existe
  "https://www.googleapis.com/auth/calendar.events", // NOVO
];
```

> Usuários existentes precisarão **re-autorizar** (banner "Reconectar Google" será adicionado em Task 31).

- [ ] **Step 3: Commit**

```bash
git add src/lib/integrations/google-oauth.ts  # ou caminho real
git commit -m "feat(google): adicionar scope calendar.events [sprint-1]"
```

---

### Task 27: Criar service `GoogleCalendarService` com TDD do parser de payload

**Files:**
- Create: `src/lib/integrations/google-calendar.ts`
- Create: `__tests__/integrations/google-calendar-payload.test.ts`

- [ ] **Step 1: Escrever testes do payload builder**

```typescript
// __tests__/integrations/google-calendar-payload.test.ts
import { describe, it, expect } from "vitest";
import { buildGoogleEventPayload } from "@/lib/integrations/google-calendar";

describe("buildGoogleEventPayload", () => {
  it("monta payload básico com summary e start", () => {
    const out = buildGoogleEventPayload({
      titulo: "Audiência de Instrução",
      dataHora: new Date("2026-04-25T14:00:00-03:00"),
      duracaoMinutos: 60,
      local: "Fórum Camaçari sala 3",
      processoNumero: "0001234-56.2024.8.05.0001",
      assistidoNome: "João Silva",
    });
    expect(out.summary).toBe("⚖ Audiência de Instrução · João Silva");
    expect(out.location).toBe("Fórum Camaçari sala 3");
    expect(out.description).toContain("0001234-56.2024.8.05.0001");
    expect(out.start.dateTime).toBe("2026-04-25T14:00:00.000-03:00");
    expect(out.end.dateTime).toBe("2026-04-25T15:00:00.000-03:00");
  });

  it("usa duração default 60min se não fornecida", () => {
    const out = buildGoogleEventPayload({
      titulo: "X", dataHora: new Date("2026-04-25T10:00:00-03:00"),
    });
    expect(out.end.dateTime).toBe("2026-04-25T11:00:00.000-03:00");
  });

  it("omite location se não fornecido", () => {
    const out = buildGoogleEventPayload({
      titulo: "X", dataHora: new Date("2026-04-25T10:00:00-03:00"),
    });
    expect(out.location).toBeUndefined();
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

```bash
npx vitest run __tests__/integrations/google-calendar-payload.test.ts
```
Expected: FAIL — módulo não existe

- [ ] **Step 3: Implementar service mínimo (só payload builder)**

```typescript
// src/lib/integrations/google-calendar.ts

export type GoogleEventPayloadInput = {
  titulo: string;
  dataHora: Date;
  duracaoMinutos?: number;
  local?: string;
  processoNumero?: string;
  assistidoNome?: string;
  kind?: "audiencia" | "evento";
};

const ICONS = { audiencia: "⚖", evento: "📅" };

function formatDateTimeWithTz(d: Date, tz = "-03:00"): string {
  // ISO sem o Z, com offset manual
  const iso = d.toISOString().slice(0, -1); // remove "Z"
  return `${iso}${tz}`;
}

export function buildGoogleEventPayload(input: GoogleEventPayloadInput) {
  const icon = ICONS[input.kind ?? "evento"];
  const summary = input.assistidoNome
    ? `${icon} ${input.titulo} · ${input.assistidoNome}`
    : `${icon} ${input.titulo}`;

  const duracao = input.duracaoMinutos ?? 60;
  const end = new Date(input.dataHora.getTime() + duracao * 60 * 1000);

  const description = [
    input.processoNumero && `Processo: ${input.processoNumero}`,
    "Sincronizado pelo OMBUDS",
  ].filter(Boolean).join("\n");

  return {
    summary,
    description,
    location: input.local,
    start: { dateTime: formatDateTimeWithTz(input.dataHora) },
    end:   { dateTime: formatDateTimeWithTz(end) },
  };
}
```

- [ ] **Step 4: Rodar e ver passar**

```bash
npx vitest run __tests__/integrations/google-calendar-payload.test.ts
```
Expected: PASS — 3 verdes

- [ ] **Step 5: Commit**

```bash
git add src/lib/integrations/google-calendar.ts __tests__/integrations/google-calendar-payload.test.ts
git commit -m "feat(google-calendar): payload builder com testes [sprint-1]"
```

---

### Task 28: Implementar `GoogleCalendarService` (ensureCalendar/upsert/delete)

**Files:**
- Modify: `src/lib/integrations/google-calendar.ts`

- [ ] **Step 1: Adicionar service ao mesmo arquivo**

```typescript
// src/lib/integrations/google-calendar.ts (adicionar abaixo do builder)
import { google, calendar_v3 } from "googleapis";
import { db } from "@/lib/db";
import { userGoogleTokens, users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export type Atribuicao = "JURI" | "VVD" | "EP" | "CRIMINAL";

const ATRIBUICAO_COLOR: Record<Atribuicao, string> = {
  JURI:     "10",  // emerald
  VVD:      "5",   // amber
  EP:       "9",   // blue
  CRIMINAL: "8",   // graphite
};

export class GoogleCalendarService {
  private calendar: calendar_v3.Calendar;

  private constructor(calendar: calendar_v3.Calendar) {
    this.calendar = calendar;
  }

  static async forUser(userId: number): Promise<GoogleCalendarService> {
    const token = await db.query.userGoogleTokens.findFirst({
      where: eq(userGoogleTokens.userId, userId),
    });
    if (!token) throw new Error("Usuário não conectou Google");

    const oauth2 = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID!,
      process.env.GOOGLE_CLIENT_SECRET!,
    );
    oauth2.setCredentials({
      access_token: token.accessToken,
      refresh_token: token.refreshToken,
      expiry_date: token.expiresAt?.getTime(),
    });
    return new GoogleCalendarService(google.calendar({ version: "v3", auth: oauth2 }));
  }

  /** Garante calendário "OMBUDS — <Atribuição>" e retorna o ID */
  async ensureCalendar(atribuicao: Atribuicao): Promise<string> {
    const summary = `OMBUDS — ${atribuicao}`;
    const list = await this.calendar.calendarList.list({});
    const existing = list.data.items?.find(c => c.summary === summary);
    if (existing?.id) return existing.id;

    const created = await this.calendar.calendars.insert({
      requestBody: { summary, timeZone: "America/Bahia" },
    });
    if (!created.data.id) throw new Error("Falha ao criar calendário");

    // Aplica cor
    await this.calendar.calendarList.patch({
      calendarId: created.data.id,
      requestBody: { colorId: ATRIBUICAO_COLOR[atribuicao] },
    });

    return created.data.id;
  }

  /** Cria ou atualiza evento. Se googleEventId existir, faz update; senão insert. */
  async upsertEvent(args: {
    googleCalendarId: string;
    googleEventId?: string | null;
    payload: ReturnType<typeof buildGoogleEventPayload>;
  }): Promise<string> {
    if (args.googleEventId) {
      const r = await this.calendar.events.update({
        calendarId: args.googleCalendarId,
        eventId: args.googleEventId,
        requestBody: args.payload,
      });
      return r.data.id!;
    }
    const r = await this.calendar.events.insert({
      calendarId: args.googleCalendarId,
      requestBody: args.payload,
    });
    return r.data.id!;
  }

  async deleteEvent(googleCalendarId: string, googleEventId: string): Promise<void> {
    await this.calendar.events.delete({
      calendarId: googleCalendarId,
      eventId: googleEventId,
    });
  }
}
```

- [ ] **Step 2: Verificar se `googleapis` está instalado**

```bash
grep '"googleapis"' /Users/rodrigorochameire/Projetos/Defender/package.json
```
Se não estiver: `npm install googleapis`. Provavelmente já está (Drive/Sheets usam).

- [ ] **Step 3: Verificar typecheck**

```bash
npx tsc --noEmit 2>&1 | grep "google-calendar.ts"
```
Expected: 0 erros.

- [ ] **Step 4: Commit**

```bash
git add src/lib/integrations/google-calendar.ts package.json package-lock.json
git commit -m "feat(google-calendar): GoogleCalendarService (ensureCalendar/upsert/delete) [sprint-1]"
```

---

### Task 29: Criar `google-calendar-queue.ts` — enfileirador

**Files:**
- Create: `src/lib/integrations/google-calendar-queue.ts`

- [ ] **Step 1: Criar enfileirador**

```typescript
// src/lib/integrations/google-calendar-queue.ts
import { db } from "@/lib/db";
import { syncQueue } from "@/lib/db/schema/sync";

export async function enqueueGoogleCalendarSync(args: {
  userId: number;
  operation: "upsert" | "delete";
  entityType: "audiencia" | "evento";
  entityId: number;
  payload?: Record<string, unknown>;
}) {
  await db.insert(syncQueue).values({
    userId: args.userId,
    operation: args.operation,
    entityType: args.entityType,
    entityId: args.entityId,
    payload: args.payload ?? null,
  });
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/integrations/google-calendar-queue.ts
git commit -m "feat(google-calendar): enfileirador de sync [sprint-1]"
```

---

### Task 30: Hooks pós-mutate em `eventos.create/update/delete` e `audiencias.*`

**Files:**
- Modify: `src/lib/trpc/routers/eventos.ts`
- Modify: routers de audiências (procurar)

- [ ] **Step 1: Localizar mutations atuais**

```bash
grep -n "create:\|update:\|delete:" /Users/rodrigorochameire/Projetos/Defender/src/lib/trpc/routers/eventos.ts | head -10
```

- [ ] **Step 2: Adicionar enfileiramento após cada commit local**

Em cada mutation (create/update/delete), depois do `db.insert/update/delete` retornar OK, chamar:

```typescript
import { enqueueGoogleCalendarSync } from "@/lib/integrations/google-calendar-queue";

// create:
const inserted = await db.insert(calendarEvents).values(input).returning();
await enqueueGoogleCalendarSync({
  userId: ctx.user!.id,
  operation: "upsert",
  entityType: "evento",
  entityId: inserted[0].id,
});
return inserted[0];

// update: idem com operation: "upsert"
// delete: operation: "delete", payload: { googleCalendarEventId, googleCalendarId }
```

Para `delete`, **buscar antes** o `googleCalendarEventId` e `googleCalendarId` (precisamos dele pra apagar mesmo após o registro local sumir).

- [ ] **Step 3: Repetir para audiências**

Localizar router de audiências (provavelmente `audiencias.ts`) e fazer o mesmo.

- [ ] **Step 4: Smoke test**

```bash
# Criar uma audiência via UI
# SELECT * FROM sync_queue WHERE status='pending' ORDER BY id DESC LIMIT 5;
# → Deve haver 1 row recém-criada
```

- [ ] **Step 5: Commit**

```bash
git add src/lib/trpc/routers/eventos.ts src/lib/trpc/routers/audiencias.ts
git commit -m "feat(google-calendar): enfileirar sync após mutations [sprint-1]"
```

---

### Task 31: Cron de retry no Inngest

**Files:**
- Create: `src/lib/inngest/functions/sync-google-calendar-retry.ts`
- Modify: `src/lib/inngest/index.ts` (registrar a função)

- [ ] **Step 1: Criar função Inngest**

```typescript
// src/lib/inngest/functions/sync-google-calendar-retry.ts
import { inngest } from "../client";
import { db } from "@/lib/db";
import { syncQueue } from "@/lib/db/schema/sync";
import { audiencias, calendarEvents } from "@/lib/db/schema/agenda";
import { GoogleCalendarService, buildGoogleEventPayload } from "@/lib/integrations/google-calendar";
import { and, eq, lte, lt, sql } from "drizzle-orm";

export const syncGoogleCalendarRetry = inngest.createFunction(
  { id: "sync-google-calendar-retry" },
  { cron: "*/15 * * * *" }, // a cada 15 min
  async ({ step }) => {
    const pending = await step.run("fetch-pending", async () => {
      return await db.select().from(syncQueue).where(and(
        eq(syncQueue.status, "pending"),
        lt(syncQueue.attempts, 5),
        lte(syncQueue.nextRetryAt, new Date()),
      )).limit(50);
    });

    for (const entry of pending) {
      await step.run(`process-${entry.id}`, async () => {
        try {
          const svc = await GoogleCalendarService.forUser(entry.userId);

          if (entry.operation === "upsert") {
            // Buscar entidade
            const item = entry.entityType === "audiencia"
              ? await db.query.audiencias.findFirst({ where: eq(audiencias.id, entry.entityId) })
              : await db.query.calendarEvents.findFirst({ where: eq(calendarEvents.id, entry.entityId) });

            if (!item) {
              await db.update(syncQueue).set({ status: "failed", lastError: "Entity not found" }).where(eq(syncQueue.id, entry.id));
              return;
            }

            const calendarId = await svc.ensureCalendar((item.atribuicao ?? "CRIMINAL") as any);
            const payload = buildGoogleEventPayload({
              titulo: item.titulo ?? (entry.entityType === "audiencia" ? "Audiência" : "Evento"),
              dataHora: item.dataHora,
              local: (item as any).local ?? undefined,
              processoNumero: (item as any).processoNumero ?? undefined,
              kind: entry.entityType === "audiencia" ? "audiencia" : "evento",
            });

            const newGoogleId = await svc.upsertEvent({
              googleCalendarId: calendarId,
              googleEventId: (item as any).googleCalendarEventId ?? null,
              payload,
            });

            // Persistir IDs no item
            const tbl = entry.entityType === "audiencia" ? audiencias : calendarEvents;
            await db.update(tbl).set({
              googleCalendarEventId: newGoogleId,
            } as any).where(eq(tbl.id, entry.entityId));
          } else if (entry.operation === "delete") {
            const payload = entry.payload as { googleCalendarId: string; googleEventId: string };
            await svc.deleteEvent(payload.googleCalendarId, payload.googleEventId);
          }

          await db.update(syncQueue).set({ status: "success" }).where(eq(syncQueue.id, entry.id));
        } catch (err) {
          const attempts = entry.attempts + 1;
          const backoffMin = Math.pow(2, attempts);
          const nextRetryAt = new Date(Date.now() + backoffMin * 60 * 1000);
          await db.update(syncQueue).set({
            attempts,
            lastError: String(err),
            nextRetryAt,
            status: attempts >= 5 ? "failed" : "pending",
          }).where(eq(syncQueue.id, entry.id));
        }
      });
    }
  },
);
```

- [ ] **Step 2: Registrar a função no Inngest**

Em `src/lib/inngest/index.ts` (ou onde funções são exportadas), adicionar:

```typescript
import { syncGoogleCalendarRetry } from "./functions/sync-google-calendar-retry";

export const functions = [
  // ... existentes
  syncGoogleCalendarRetry,
];
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/inngest/functions/sync-google-calendar-retry.ts src/lib/inngest/index.ts
git commit -m "feat(google-calendar): cron de retry com backoff exponencial [sprint-1]"
```

---

### Task 32: Status chip "Google Calendar" no header da agenda

**Files:**
- Create: `src/components/agenda/google-calendar-status-chip.tsx`
- Modify: `src/app/(dashboard)/admin/agenda/page.tsx`

- [ ] **Step 1: Criar endpoint tRPC `googleCalendar.getStatus`**

Em `src/lib/trpc/routers/settings.ts` (ou criar novo `googleCalendar.ts`):

```typescript
getStatus: protectedProcedure.query(async ({ ctx }) => {
  const userId = ctx.user!.id;
  const token = await db.query.userGoogleTokens.findFirst({ where: eq(userGoogleTokens.userId, userId) });
  const pending = await db.select({ count: sql<number>`count(*)` })
    .from(syncQueue)
    .where(and(eq(syncQueue.userId, userId), eq(syncQueue.status, "pending")));
  const failed = await db.select({ count: sql<number>`count(*)` })
    .from(syncQueue)
    .where(and(eq(syncQueue.userId, userId), eq(syncQueue.status, "failed")));
  const lastSync = await db.select({ at: syncQueue.updatedAt })
    .from(syncQueue)
    .where(and(eq(syncQueue.userId, userId), eq(syncQueue.status, "success")))
    .orderBy(desc(syncQueue.updatedAt))
    .limit(1);

  return {
    connected: !!token,
    tokenExpired: token ? (token.expiresAt && token.expiresAt < new Date()) : false,
    pendingCount: Number(pending[0]?.count ?? 0),
    failedCount:  Number(failed[0]?.count ?? 0),
    lastSyncAt:   lastSync[0]?.at ?? null,
  };
}),
```

- [ ] **Step 2: Criar componente do chip**

```tsx
// src/components/agenda/google-calendar-status-chip.tsx
"use client";

import { trpc } from "@/lib/trpc/client";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

export function GoogleCalendarStatusChip() {
  const { data } = trpc.googleCalendar.getStatus.useQuery(undefined, { refetchInterval: 60_000 });
  if (!data) return null;

  if (!data.connected) {
    return (
      <a href="/admin/integracoes/google" className="text-[11px] text-neutral-500 hover:text-neutral-700">
        Conectar Google Calendar
      </a>
    );
  }
  if (data.tokenExpired || data.failedCount > 0) {
    return (
      <a href="/admin/integracoes/google" className="text-[11px] text-rose-600 hover:text-rose-800 inline-flex items-center gap-1">
        <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
        Sync com falha · reconectar
      </a>
    );
  }
  if (data.pendingCount > 0) {
    return (
      <span className="text-[11px] text-amber-600 inline-flex items-center gap-1">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
        Sincronizando {data.pendingCount}...
      </span>
    );
  }
  return (
    <span className="text-[11px] text-emerald-600 inline-flex items-center gap-1">
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
      Google sync ok{data.lastSyncAt && ` · ${formatDistanceToNow(data.lastSyncAt, { locale: ptBR })} atrás`}
    </span>
  );
}
```

- [ ] **Step 3: Renderizar no header da agenda**

Em `agenda/page.tsx`, no header:

```tsx
import { GoogleCalendarStatusChip } from "@/components/agenda/google-calendar-status-chip";
// ...
<GoogleCalendarStatusChip />
```

- [ ] **Step 4: Smoke test**

```bash
# http://localhost:3000/admin/agenda
# Chip aparece no header com estado correto
# Criar audiência → chip vai pra "Sincronizando 1..."
# Após 15min (cron) → vira "Google sync ok"
```

- [ ] **Step 5: Commit**

```bash
git add src/components/agenda/google-calendar-status-chip.tsx src/lib/trpc/routers/settings.ts src/app/\(dashboard\)/admin/agenda/page.tsx
git commit -m "feat(agenda): status chip do Google Calendar no header [sprint-1]"
```

---

### Task 33: Notificação WhatsApp ao falhar sync por token expirado

**Files:**
- Modify: `src/lib/inngest/functions/sync-google-calendar-retry.ts`

- [ ] **Step 1: Detectar erro de token e disparar notificação uma vez**

Adicionar lógica no `catch` do retry:

```typescript
import { sendWhatsAppNotification } from "@/lib/integrations/whatsapp"; // adaptar import real

// dentro do catch:
const isAuthError = String(err).includes("invalid_grant") || String(err).includes("401");
if (isAuthError && entry.attempts === 0) {
  // Só na primeira falha de auth (evita spam)
  const user = await db.query.users.findFirst({ where: eq(users.id, entry.userId) });
  if (user?.phone) {
    await sendWhatsAppNotification({
      to: user.phone,
      message: `OMBUDS: token do Google Calendar expirou. Reconecte em ombuds.vercel.app/admin/integracoes/google`,
    });
  }
}
```

- [ ] **Step 2: Smoke test**

Difícil de simular sem expirar token real. Verificar **manualmente** o código está correto.

- [ ] **Step 3: Commit**

```bash
git add src/lib/inngest/functions/sync-google-calendar-retry.ts
git commit -m "feat(google-calendar): notificar WhatsApp quando token expirar [sprint-1]"
```

---

## Verificação final

### Task 34: Rodar suíte completa de testes + typecheck + smoke test E2E manual

- [ ] **Step 1: Testes unitários**

```bash
cd /Users/rodrigorochameire/Projetos/Defender
npm test
```
Expected: TODOS verdes (incluindo os novos)

- [ ] **Step 2: Typecheck**

```bash
npx tsc --noEmit
```
Expected: 0 erros

- [ ] **Step 3: Lint**

```bash
npm run lint
```
Expected: 0 erros (warnings ok)

- [ ] **Step 4: Smoke test E2E manual**

```bash
npm run dev
# http://localhost:3000/admin/agenda
```

Checklist:
- [ ] View padrão é "Próximos 7 dias"
- [ ] Header compacto, calendário ocupa toda a vertical disponível
- [ ] Pills de atribuição clicam e filtram
- [ ] Toggle "Prazos" liga/desliga e prazos aparecem com cor por urgência
- [ ] Audiências sempre presentes (cadeado no toggle)
- [ ] Click em qualquer evento abre EventDetailSheet
- [ ] Mês e Semana mostram mesmo evento com mesma cor/ícone
- [ ] Click em "+ adicionar evento" abre quick-add inline
- [ ] Atalho `T` volta pra hoje, `1`-`4` muda view, `N` abre modal, `?` abre dialog
- [ ] Modal de criar evento tem ProcessoCombo (autocomplete)
- [ ] Status chip do Google aparece no header
- [ ] Criar audiência → entrada em `sync_queue` com status `pending`

- [ ] **Step 5: Commit final do sprint**

```bash
git commit --allow-empty -m "chore(agenda): sprint 1 concluído [sprint-1]"
```

---

## Resumo

**Total:** 34 tasks em 6 fases.
**Tempo estimado:** 1 sprint focado (~5 dias úteis).
**Cobertura de testes:** parsers e service builders 100%; componentes React via smoke test manual.
**Reversibilidade:** todos os commits são pequenos e atômicos; reverter qualquer um não quebra os anteriores.
