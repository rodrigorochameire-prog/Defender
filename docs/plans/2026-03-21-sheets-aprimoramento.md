# Sheets Aprimoramento — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Padronizar tamanho dos sheets em 560px, aprimorar conteúdo de Demandas/Assistidos/Drive e criar novo EventDetailSheet com duplo-clique no calendário.

**Architecture:** Mudanças aditivas — nenhuma funcionalidade existente é removida. Largura padronizada via Tailwind. Novas seções acrescentadas no fim de cada sheet. EventDetailSheet é componente novo totalmente independente.

**Tech Stack:** Next.js 15, tRPC, shadcn/ui Sheet, Tailwind CSS, date-fns

**Regra de Ouro:** SOMENTE adicionar e ampliar. NUNCA remover seções, botões ou campos existentes.

---

## Task 1: Padronizar larguras dos sheets

**Escopo:** Só CSS — sem mudança de lógica. Padrão: `w-full sm:w-[480px] md:w-[560px]`

**Files:**
- Modify: `src/components/demandas-premium/DemandaQuickPreview.tsx:566`
- Modify: `src/app/(dashboard)/admin/assistidos/_components/assistido-quick-preview.tsx:243`
- Modify: `src/components/agenda/day-events-sheet.tsx:189`

**Step 1: Atualizar DemandaQuickPreview**

Localizar linha 566:
```
className="w-[calc(100vw-3rem)] sm:w-[420px] md:w-[460px] max-w-full p-0 ...
```
Substituir apenas os tokens de largura:
```
className="w-full sm:w-[480px] md:w-[560px] max-w-full p-0 ...
```
(manter todo o resto da className intacto)

**Step 2: Atualizar AssistidoQuickPreview**

Localizar linha 243:
```
className="w-[calc(100vw-2rem)] sm:w-[480px] md:w-[540px] p-0 ...
```
Substituir:
```
className="w-full sm:w-[480px] md:w-[560px] p-0 ...
```

**Step 3: Atualizar DayEventsSheet**

Localizar linha 189:
```
className="w-full sm:w-[420px] p-0 ...
```
Substituir:
```
className="w-full sm:w-[480px] md:w-[560px] p-0 ...
```

**Step 4: Commit**
```bash
git add src/components/demandas-premium/DemandaQuickPreview.tsx \
        src/app/(dashboard)/admin/assistidos/_components/assistido-quick-preview.tsx \
        src/components/agenda/day-events-sheet.tsx
git commit -m "style(sheets): padronizar largura em w-full sm:480px md:560px"
```

---

## Task 2: Drive — converter painel inline em sheet em todos os viewports

**Goal:** O `DriveDetailPanel` hoje é painel inline no desktop (`hidden lg:flex w-80`) e Sheet no mobile (`lg:hidden`). Converter para Sheet em TODOS os viewports. Conteúdo (`DetailPanelContent`) permanece 100% idêntico.

**Files:**
- Modify: `src/components/drive/DriveDetailPanel.tsx` (linhas ~2115–2194)

**Step 1: Ler o bloco exato de retorno do componente**

Ler linhas 2115–2194 de `DriveDetailPanel.tsx` para confirmar a estrutura atual.

**Step 2: Substituir o bloco de loading state (sem file)**

Localizar (loading state, ~linha 2121–2162):
```tsx
<>
  {/* Desktop panel */}
  <div className="hidden lg:flex w-80 border-l ...">
    ...skeleton...
  </div>

  {/* Mobile sheet */}
  <Sheet open={isOpen} onOpenChange={...}>
    <SheetContent
      side="right"
      className="w-full sm:max-w-sm bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 p-0"
    >
      ...skeleton...
    </SheetContent>
  </Sheet>
</>
```

Substituir por (Sheet único para todos os viewports):
```tsx
<Sheet open={isOpen} onOpenChange={(open) => { if (!open) ctx.closeDetailPanel(); }}>
  <SheetContent
    side="right"
    className="w-full sm:w-[480px] md:w-[560px] bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 p-0"
  >
    <SheetTitle className="sr-only">Detalhes do arquivo</SheetTitle>
    <div className="p-4 space-y-3">
      <Skeleton className="aspect-video w-full bg-zinc-200 dark:bg-zinc-800 rounded-lg" />
      <Skeleton className="h-8 w-full bg-zinc-200 dark:bg-zinc-800" />
      <Skeleton className="h-20 w-full bg-zinc-200 dark:bg-zinc-800" />
    </div>
  </SheetContent>
</Sheet>
```

**Step 3: Substituir o bloco com file carregado (~linha 2166–2193)**

Localizar:
```tsx
<>
  {/* Desktop: inline panel (hidden on mobile) */}
  <div className="hidden lg:flex w-80 border-l border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex-col shrink-0 transition-all duration-300">
    <DetailPanelContent file={file as any} />
  </div>

  {/* Mobile: Sheet overlay (hidden on desktop) */}
  <div className="lg:hidden">
    <Sheet open={isOpen} onOpenChange={(open) => { if (!open) ctx.closeDetailPanel(); }}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-sm bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 p-0"
      >
        <SheetTitle className="sr-only">{file.name}</SheetTitle>
        <DetailPanelContent file={file as any} />
      </SheetContent>
    </Sheet>
  </div>
</>
```

Substituir por:
```tsx
<Sheet open={isOpen} onOpenChange={(open) => { if (!open) ctx.closeDetailPanel(); }}>
  <SheetContent
    side="right"
    className="w-full sm:w-[480px] md:w-[560px] bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 p-0"
  >
    <SheetTitle className="sr-only">{file.name}</SheetTitle>
    <DetailPanelContent file={file as any} />
  </SheetContent>
</Sheet>
```

**Step 4: Verificar imports** — `Sheet`, `SheetContent`, `SheetTitle` já importados (linha 23–26).

**Step 5: Commit**
```bash
git add src/components/drive/DriveDetailPanel.tsx
git commit -m "feat(drive): converter painel inline para sheet em todos os viewports"
```

---

## Task 3: Demandas — adicionar seção Próxima Audiência

**Goal:** Adicionar seção "PRÓXIMA AUDIÊNCIA" no DemandaQuickPreview, após a seção DOCUMENTOS existente. A demanda já tem `processoId` — usar `trpc.audiencias.list` com `apenasProximas: true` e filtrar client-side.

**Files:**
- Modify: `src/components/demandas-premium/DemandaQuickPreview.tsx`

**Step 1: Ler a estrutura da seção DOCUMENTOS**

Grep por "DOCUMENTOS" ou "documentos" no arquivo para encontrar o fim da seção atual e onde inserir.

**Step 2: Adicionar query de audiências**

Dentro do componente `DemandaQuickPreviewPanel` (ou onde estão as outras queries trpc), adicionar:

```tsx
// Buscar próxima audiência do processo
const processoId = demanda?.processoId ?? demanda?.processos?.[0]?.id;
const { data: audienciasData } = trpc.audiencias.list.useQuery(
  { apenasProximas: true },
  { enabled: !!processoId }
);
const proximaAudiencia = audienciasData?.find(
  (a) => a.processo?.id === processoId || a.processoId === processoId
);
```

**Step 3: Adicionar seção após DOCUMENTOS**

Logo após o fechamento da seção DOCUMENTOS, adicionar:

```tsx
{/* ── Próxima Audiência ── */}
{proximaAudiencia && (
  <div className="border-t border-zinc-100 dark:border-zinc-800 px-4 py-3">
    <p className="text-[10px] text-zinc-400 uppercase tracking-wider font-medium flex items-center gap-1.5 mb-2">
      <Calendar className="w-3 h-3" />
      Próxima Audiência
    </p>
    <div className="flex items-start gap-2">
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-zinc-800 dark:text-zinc-200">
          {format(new Date(proximaAudiencia.dataHora), "EEE dd/MM · HH:mm", { locale: ptBR })}
        </p>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
          {proximaAudiencia.tipo}
          {proximaAudiencia.local ? ` · ${proximaAudiencia.local}` : ""}
        </p>
      </div>
    </div>
  </div>
)}
```

**Step 4: Garantir imports**

Verificar se `Calendar` já está importado (linha 25 — sim). Verificar `format` e `ptBR` — adicionar se necessário:
```tsx
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
```

**Step 5: Commit**
```bash
git add src/components/demandas-premium/DemandaQuickPreview.tsx
git commit -m "feat(demandas): adicionar seção próxima audiência no quick preview"
```

---

## Task 4: Assistidos — adicionar seções Últimas Demandas + Drive

**Goal:** Adicionar duas seções colapsáveis antes de OBSERVAÇÕES: "ÚLTIMAS DEMANDAS" (top 3, com prazo colorido) e "DRIVE" (link + status IA). Usar dados já disponíveis no componente + nova query de demandas.

**Files:**
- Modify: `src/app/(dashboard)/admin/assistidos/_components/assistido-quick-preview.tsx`

**Step 1: Ler estrutura atual do componente**

Ler de linha 400 até o fim para entender onde estão as seções e onde inserir.

**Step 2: Adicionar query de demandas**

Identificar onde estão as outras queries no componente. Adicionar:

```tsx
// Buscar últimas 3 demandas abertas do assistido
const { data: ultimasDemandas } = trpc.demandas.list.useQuery(
  { assistidoId: assistido?.id, limit: 3 },
  { enabled: !!assistido?.id }
);
```

> **Atenção:** Verificar o nome exato do router de demandas e seus parâmetros antes de implementar. Grep por `demandas.list` ou `demandas.listByAssistido` no codebase.

**Step 3: Adicionar seção Últimas Demandas**

Antes do `CollapsibleSection` de OBSERVAÇÕES:

```tsx
{/* ── Últimas Demandas ── */}
{ultimasDemandas && ultimasDemandas.length > 0 && (
  <CollapsibleSection title="Últimas Demandas" icon={Scale} defaultOpen={true}>
    <div className="space-y-1.5">
      {ultimasDemandas.map((d) => {
        const prazoInfo = getPrazoInfo(d.prazo);
        return (
          <div key={d.id} className="flex items-center gap-2 py-1">
            <span className={cn(
              "w-1.5 h-1.5 rounded-full flex-shrink-0",
              d.status === "resolvido" ? "bg-emerald-400" : "bg-amber-400"
            )} />
            <span className="text-xs text-zinc-700 dark:text-zinc-300 truncate flex-1">
              {d.ato || d.assistido}
            </span>
            {prazoInfo && (
              <span className={cn("text-[10px] font-medium flex-shrink-0", prazoInfo.color)}>
                {prazoInfo.label}
              </span>
            )}
          </div>
        );
      })}
      <Link
        href={`/admin/demandas?assistido=${assistido?.id}`}
        className="text-[10px] text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 flex items-center gap-1 mt-1"
      >
        Ver todas <ExternalLink className="w-2.5 h-2.5" />
      </Link>
    </div>
  </CollapsibleSection>
)}
```

**Step 4: Adicionar seção Drive**

Logo após a seção de Últimas Demandas:

```tsx
{/* ── Drive ── */}
<CollapsibleSection title="Drive" icon={HardDrive} defaultOpen={false}>
  {assistido?.driveFolderId ? (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-xs text-zinc-600 dark:text-zinc-400">
          {assistido.driveFilesCount ?? 0} arquivo{(assistido.driveFilesCount ?? 0) !== 1 ? "s" : ""}
        </span>
        <Link
          href={`/admin/drive?assistido=${assistido.id}`}
          className="text-[10px] text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 flex items-center gap-1"
        >
          Abrir pasta <ExternalLink className="w-2.5 h-2.5" />
        </Link>
      </div>
    </div>
  ) : (
    <p className="text-xs text-zinc-400 dark:text-zinc-500">
      Pasta não vinculada
    </p>
  )}
</CollapsibleSection>
```

**Step 5: Verificar imports** — `Scale`, `HardDrive`, `ExternalLink`, `Link` já devem estar importados. Verificar e adicionar se necessário.

**Step 6: Commit**
```bash
git add src/app/(dashboard)/admin/assistidos/_components/assistido-quick-preview.tsx
git commit -m "feat(assistidos): adicionar seções últimas demandas e drive no quick preview"
```

---

## Task 5: EventDetailSheet — novo componente + duplo clique

**Goal:** Criar `EventDetailSheet` (560px) que abre ao duplo-clicar em evento no calendário ou via botão "Ver mais" no popover. Mostra: assistido, processo, depoentes, observações, histórico, registro.

**Files:**
- Create: `src/components/agenda/event-detail-sheet.tsx`
- Modify: `src/components/agenda/calendar-month-view.tsx`
- Modify: `src/app/(dashboard)/admin/agenda/page.tsx`

### Step 1: Criar EventDetailSheet

```tsx
// src/components/agenda/event-detail-sheet.tsx
"use client";

import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { trpc } from "@/lib/trpc/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  User, FileText, MapPin, Clock, StickyNote,
  History, CheckCircle2, X, ExternalLink, Copy, Check,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface EventDetailSheetProps {
  evento: any | null;
  open: boolean;
  onClose: () => void;
  onEdit?: (evento: any) => void;
}

export function EventDetailSheet({ evento, open, onClose, onEdit }: EventDetailSheetProps) {
  const [copied, setCopied] = useState(false);

  // Buscar registro da audiência (contém depoentes)
  const { data: registro } = trpc.audiencias.buscarRegistro.useQuery(
    { audienciaId: evento?.id },
    { enabled: !!evento?.id && open }
  );

  // Buscar histórico de audiências do processo
  const { data: historico } = trpc.audiencias.buscarHistoricoRegistros.useQuery(
    { processoId: evento?.processoId },
    { enabled: !!evento?.processoId && open }
  );

  // Mutation para marcar como realizada
  const utils = trpc.useUtils();
  const updateStatus = trpc.audiencias.update.useMutation({
    onSuccess: () => {
      utils.audiencias.list.invalidate();
      toast.success("Status atualizado");
    },
  });

  const depoentes = (registro as any)?.depoentes ?? [];
  const historicoRecente = (historico ?? []).slice(0, 3);

  const copyProcesso = (num: string) => {
    navigator.clipboard.writeText(num);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  if (!evento) return null;

  const dataHora = evento.data
    ? new Date(`${evento.data}T${evento.horarioInicio ?? "00:00"}`)
    : null;

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent
        side="right"
        className="w-full sm:w-[480px] md:w-[560px] p-0 flex flex-col gap-0 border-l border-zinc-200 dark:border-zinc-800 [&>button:first-of-type]:hidden"
      >
        <SheetTitle className="sr-only">Detalhes do evento</SheetTitle>

        {/* ── Header ── */}
        <div className="flex items-start justify-between gap-2 px-4 py-3 border-b border-zinc-100 dark:border-zinc-800">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-100 truncate">
              {evento.titulo}
            </p>
            {dataHora && (
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                {format(dataHora, "EEEE, dd 'de' MMMM · HH:mm", { locale: ptBR })}
                {evento.horarioFim ? ` — ${evento.horarioFim}` : ""}
              </p>
            )}
            {evento.local && (
              <p className="text-xs text-zinc-400 dark:text-zinc-500 flex items-center gap-1 mt-0.5">
                <MapPin className="w-3 h-3" />
                {evento.local}
              </p>
            )}
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            {onEdit && (
              <button
                onClick={() => onEdit(evento)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              >
                <FileText className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* ── Scrollable body ── */}
        <div className="flex-1 overflow-y-auto">

          {/* Assistido + Processo */}
          <div className="px-4 py-3 border-b border-zinc-100 dark:border-zinc-800 space-y-2">
            {evento.assistido && (
              <div className="flex items-center gap-2">
                <User className="w-3.5 h-3.5 text-zinc-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] text-zinc-400 uppercase tracking-wider">Assistido</p>
                  <div className="flex items-center gap-1">
                    <p className="text-xs font-medium text-zinc-800 dark:text-zinc-200 truncate">
                      {evento.assistido}
                    </p>
                    {evento.assistidoId && (
                      <Link href={`/admin/assistidos/${evento.assistidoId}`}>
                        <ExternalLink className="w-3 h-3 text-zinc-400 hover:text-emerald-600 flex-shrink-0" />
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            )}
            {evento.processo && (
              <div className="flex items-center gap-2">
                <FileText className="w-3.5 h-3.5 text-zinc-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] text-zinc-400 uppercase tracking-wider">Processo</p>
                  <div className="flex items-center gap-1">
                    <p className="text-xs font-mono text-zinc-700 dark:text-zinc-300 truncate">
                      {evento.processo}
                    </p>
                    <button onClick={() => copyProcesso(evento.processo)}>
                      {copied
                        ? <Check className="w-3 h-3 text-emerald-500" />
                        : <Copy className="w-3 h-3 text-zinc-400 hover:text-zinc-600" />
                      }
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Depoentes */}
          {depoentes.length > 0 && (
            <div className="px-4 py-3 border-b border-zinc-100 dark:border-zinc-800">
              <p className="text-[10px] text-zinc-400 uppercase tracking-wider font-medium flex items-center gap-1.5 mb-2">
                <Users className="w-3 h-3" />
                Depoentes
              </p>
              <div className="space-y-1">
                {depoentes.map((d: any, i: number) => (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    <span className="w-1.5 h-1.5 rounded-full bg-zinc-300 dark:bg-zinc-600 flex-shrink-0" />
                    <span className="text-zinc-700 dark:text-zinc-300 font-medium">{d.nome}</span>
                    {d.tipo && (
                      <span className="text-zinc-400 dark:text-zinc-500">— {d.tipo}</span>
                    )}
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-zinc-400 mt-2 italic">
                · via análise do processo (Drive)
              </p>
            </div>
          )}

          {/* Observações */}
          <div className="px-4 py-3 border-b border-zinc-100 dark:border-zinc-800">
            <p className="text-[10px] text-zinc-400 uppercase tracking-wider font-medium flex items-center gap-1.5 mb-2">
              <StickyNote className="w-3 h-3" />
              Observações
            </p>
            {evento.descricao ? (
              <p className="text-xs text-zinc-600 dark:text-zinc-400 whitespace-pre-wrap">
                {evento.descricao}
              </p>
            ) : (
              <p className="text-xs text-zinc-400 dark:text-zinc-600 italic">Sem observações</p>
            )}
          </div>

          {/* Histórico */}
          {historicoRecente.length > 0 && (
            <div className="px-4 py-3 border-b border-zinc-100 dark:border-zinc-800">
              <p className="text-[10px] text-zinc-400 uppercase tracking-wider font-medium flex items-center gap-1.5 mb-2">
                <History className="w-3 h-3" />
                Histórico do Processo
              </p>
              <div className="space-y-2">
                {historicoRecente.map((h: any, i: number) => (
                  <div key={i} className="flex gap-2 text-xs">
                    <span className="text-zinc-400 flex-shrink-0 tabular-nums">
                      {h.dataAudiencia
                        ? format(new Date(h.dataAudiencia), "dd/MM")
                        : "—"}
                    </span>
                    <span className="text-zinc-600 dark:text-zinc-400 truncate">
                      {h.resultado ?? h.status ?? "Sem registro"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Registro */}
          <div className="px-4 py-3">
            <p className="text-[10px] text-zinc-400 uppercase tracking-wider font-medium flex items-center gap-1.5 mb-2">
              <CheckCircle2 className="w-3 h-3" />
              Registro
            </p>
            {evento.status === "realizada" ? (
              <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Realizada
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-xs text-zinc-500 dark:text-zinc-400">Pendente</span>
                {evento.id && (
                  <Link
                    href={`/admin/audiencias/${evento.id}/registro`}
                    className="text-xs text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 flex items-center gap-1"
                  >
                    Registrar <ExternalLink className="w-3 h-3" />
                  </Link>
                )}
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
```

### Step 2: Adicionar estado e handler de duplo-clique em calendar-month-view.tsx

**2a.** Adicionar prop `onEventDoubleClick` na interface do componente:
```tsx
// Na interface Props (~linha 57):
onEventDoubleClick?: (evento: any) => void;
```

**2b.** Passar para `EventoCompacto`:
```tsx
// Na renderização de EventoCompacto, adicionar:
onEventDoubleClick={onEventDoubleClick}
```

**2c.** Adicionar na interface de `EventoCompacto` (~linha 203):
```tsx
onEventDoubleClick?: (evento: any) => void;
```

**2d.** Adicionar `onDoubleClick` no `<button>` do `PopoverTrigger` (~linha 243):
```tsx
<button
  onClick={(e) => e.stopPropagation()}
  onDoubleClick={(e) => { e.stopPropagation(); onEventDoubleClick?.(evento); }}
  className={...}
>
```

**2e.** Adicionar botão "Ver mais" no popover, após o botão "Registrar" existente:
```tsx
// No PopoverContent, no rodapé onde está o botão Registrar/Ver Registro:
<button
  onClick={() => { onEventDoubleClick?.(evento); }}
  className="flex-1 text-xs text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200 py-2 transition-colors border-t border-zinc-100 dark:border-zinc-800"
>
  Ver mais detalhes ↗
</button>
```

### Step 3: Integrar na agenda page

**3a.** Em `src/app/(dashboard)/admin/agenda/page.tsx`, adicionar estado:
```tsx
const [eventDetailId, setEventDetailId] = useState<string | null>(null);
const [eventDetail, setEventDetail] = useState<any>(null);

const handleEventDoubleClick = (evento: any) => {
  setEventDetail(evento);
  setEventDetailId(evento.id);
};
```

**3b.** Importar e renderizar o componente:
```tsx
import { EventDetailSheet } from "@/components/agenda/event-detail-sheet";

// No JSX, ao lado do CalendarMonthView:
<EventDetailSheet
  evento={eventDetail}
  open={!!eventDetailId}
  onClose={() => { setEventDetailId(null); setEventDetail(null); }}
  onEdit={(ev) => { /* abrir modal de edição existente */ }}
/>
```

**3c.** Passar `onEventDoubleClick` para `CalendarMonthView`:
```tsx
<CalendarMonthView
  ...props existentes...
  onEventDoubleClick={handleEventDoubleClick}
/>
```

### Step 4: Commit
```bash
git add src/components/agenda/event-detail-sheet.tsx \
        src/components/agenda/calendar-month-view.tsx \
        src/app/(dashboard)/admin/agenda/page.tsx
git commit -m "feat(agenda): EventDetailSheet com duplo clique e botão ver mais no popover"
```

---

## Verificação Final

Após cada task, verificar visualmente:
1. Sheet abre no tamanho correto (560px no desktop)
2. Todas as seções/botões existentes continuam funcionando
3. Novas seções aparecem corretamente
4. Duplo-clique abre EventDetailSheet (não fecha popover nem abre página)
5. Popover continua funcionando normalmente com clique simples

## Ordem de Execução

1. Task 1 (larguras) — mais segura, validar primeiro
2. Task 2 (Drive sheet) — testar que conteúdo permanece idêntico
3. Task 3 (Demandas audiência) — testar com demanda que tem processoId
4. Task 4 (Assistidos) — verificar query de demandas
5. Task 5 (EventDetailSheet) — mais complexa, fazer por último
