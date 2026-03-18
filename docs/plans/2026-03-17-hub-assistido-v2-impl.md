# Hub Assistido v2 — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Transformar a página `/admin/assistidos/[id]` em um hub completo com overview panel, sheet lateral de ficha, sheet de detalhe inline por item, e tabs reorganizadas com badges de urgência.

**Architecture:** Três novos componentes principais adicionados à página existente: `AssistidoOverviewPanel`, `AssistidoFichaSheet` (sheet lateral), e `ItemDetailSheet` (sheet de detalhe inline). Nenhuma mudança no backend — tudo usa dados já disponíveis em `trpc.assistidos.getById`. A reorganização das tabs é puramente frontend.

**Tech Stack:** Next.js 15, tRPC, shadcn/ui Sheet, Tailwind CSS, date-fns, Lucide icons. Padrão Defender (zinc + emerald).

---

## Task 1: AssistidoOverviewPanel — 4 cards de visão geral

**Files:**
- Create: `src/app/(dashboard)/admin/assistidos/[id]/_components/overview-panel.tsx`
- Modify: `src/app/(dashboard)/admin/assistidos/[id]/page.tsx`

**Contexto:**
O componente recebe o `data` do `getById` já disponível na página. Os 4 cards são:
1. Próxima Audiência (próxima data futura em `data.audiencias`)
2. Demanda Crítica (prioridade: status 1_URGENTE > 2_VENCER > 3_PROXIMO)
3. Dados Rápidos (telefone clicável, CPF copiável, tempo preso)
4. Processos Ativos (lista inline, cada linha chama `onProcessoClick`)

**Step 1: Criar o componente**

```tsx
// src/app/(dashboard)/admin/assistidos/[id]/_components/overview-panel.tsx
"use client";

import { useState } from "react";
import { Calendar, AlertCircle, User, Scale, Phone, Copy, Check, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { format, differenceInDays, differenceInMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import Link from "next/link";

interface OverviewPanelProps {
  data: {
    id: number;
    nome: string;
    cpf?: string | null;
    telefone?: string | null;
    telefoneContato?: string | null;
    nomeContato?: string | null;
    parentescoContato?: string | null;
    statusPrisional?: string | null;
    unidadePrisional?: string | null;
    dataPrisao?: string | null;
    processos: Array<{
      id: number;
      numeroAutos?: string | null;
      vara?: string | null;
      assunto?: string | null;
      area?: string | null;
      fase?: string | null;
    }>;
    audiencias: Array<{
      id: number;
      dataAudiencia?: string | null;
      tipo?: string | null;
      local?: string | null;
      sala?: string | null;
    }>;
    demandas: Array<{
      id: number;
      ato?: string | null;
      tipoAto?: string | null;
      prazo?: string | null;
      status?: string | null;
    }>;
  };
  onProcessoClick: (processoId: number) => void;
  onDemandaClick: (demandaId: number) => void;
}

const PRESOS = ["CADEIA_PUBLICA", "PENITENCIARIA", "COP", "HOSPITAL_CUSTODIA"];

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
      className="ml-1 text-zinc-400 hover:text-emerald-600 transition-colors"
    >
      {copied ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
    </button>
  );
}

export function AssistidoOverviewPanel({ data, onProcessoClick, onDemandaClick }: OverviewPanelProps) {
  const [collapsed, setCollapsed] = useState(false);

  // Próxima audiência futura
  const proximaAudiencia = data.audiencias
    .filter(a => a.dataAudiencia && new Date(a.dataAudiencia) > new Date())
    .sort((a, b) => new Date(a.dataAudiencia!).getTime() - new Date(b.dataAudiencia!).getTime())[0];

  // Demanda mais crítica
  const PRIORIDADE: Record<string, number> = {
    "1_URGENTE": 1, "2_VENCER": 2, "3_PROXIMO": 3,
    "5_FILA": 4, "4_REVISAO": 5, "6_REVISAO_FINAL": 6
  };
  const demandaCritica = data.demandas
    .filter(d => d.status && !["7_CONCLUIDO", "8_ARQUIVADO"].includes(d.status))
    .sort((a, b) => (PRIORIDADE[a.status ?? ""] ?? 99) - (PRIORIDADE[b.status ?? ""] ?? 99))[0];

  const isPreso = data.statusPrisional ? PRESOS.includes(data.statusPrisional) : false;

  const tempoPreso = isPreso && data.dataPrisao
    ? (() => {
        const meses = differenceInMonths(new Date(), new Date(data.dataPrisao));
        return meses >= 1 ? `${meses} meses preso` : `${differenceInDays(new Date(), new Date(data.dataPrisao))} dias preso`;
      })()
    : null;

  const isUrgente = demandaCritica?.status === "1_URGENTE" ||
    (demandaCritica?.prazo && new Date(demandaCritica.prazo) < new Date());

  if (collapsed) {
    return (
      <div className="px-6 py-2 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
        <span className="text-[10px] text-zinc-400 uppercase tracking-wide font-medium">Visão Geral</span>
        <button onClick={() => setCollapsed(false)} className="text-[10px] text-zinc-400 hover:text-zinc-600">
          expandir ↓
        </button>
      </div>
    );
  }

  return (
    <div className="px-6 py-3 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] text-zinc-400 uppercase tracking-wide font-medium">Visão Geral</span>
        <button onClick={() => setCollapsed(true)} className="text-[10px] text-zinc-400 hover:text-zinc-600">
          recolher ↑
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
        {/* Card 1: Próxima Audiência */}
        <div className={cn(
          "rounded-lg border p-3 text-[11px]",
          proximaAudiencia
            ? "border-emerald-200 bg-emerald-50/50 dark:border-emerald-800 dark:bg-emerald-900/10"
            : "border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-900/10"
        )}>
          <div className="flex items-center gap-1.5 mb-1.5">
            <Calendar className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
            <span className="font-medium text-zinc-600 dark:text-zinc-400">Próxima Audiência</span>
          </div>
          {proximaAudiencia ? (
            <>
              <p className="font-semibold text-zinc-800 dark:text-zinc-200">
                {format(new Date(proximaAudiencia.dataAudiencia!), "dd/MMM · HH'h'mm", { locale: ptBR })}
              </p>
              <p className="text-zinc-500 mt-0.5">
                {[proximaAudiencia.tipo, proximaAudiencia.local, proximaAudiencia.sala && `Sala ${proximaAudiencia.sala}`]
                  .filter(Boolean).join(" · ")}
              </p>
            </>
          ) : (
            <>
              <p className="text-amber-700 dark:text-amber-400 font-medium">Sem audiência agendada</p>
              <Link href={`/admin/agenda?assistidoId=${data.id}`} className="mt-1 flex items-center gap-1 text-amber-600 hover:underline">
                <Plus className="h-3 w-3" /> Agendar
              </Link>
            </>
          )}
        </div>

        {/* Card 2: Demanda Crítica */}
        <div className={cn(
          "rounded-lg border p-3 text-[11px]",
          isUrgente
            ? "border-rose-200 bg-rose-50/50 dark:border-rose-800 dark:bg-rose-900/10"
            : demandaCritica
            ? "border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-900/10"
            : "border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-800/30"
        )}>
          <div className="flex items-center gap-1.5 mb-1.5">
            <AlertCircle className={cn("h-3.5 w-3.5", isUrgente ? "text-rose-500" : "text-amber-500")} />
            <span className="font-medium text-zinc-600 dark:text-zinc-400">Demanda Crítica</span>
          </div>
          {demandaCritica ? (
            <>
              <p className={cn("font-semibold", isUrgente ? "text-rose-700 dark:text-rose-400" : "text-zinc-800 dark:text-zinc-200")}>
                {demandaCritica.ato ?? demandaCritica.tipoAto ?? "Demanda"}
              </p>
              {demandaCritica.prazo && (
                <p className="text-zinc-500 mt-0.5">
                  vence {format(new Date(demandaCritica.prazo), "dd/MMM", { locale: ptBR })}
                </p>
              )}
              <button
                onClick={() => onDemandaClick(demandaCritica.id)}
                className="mt-1 text-emerald-600 hover:underline"
              >
                ver demanda →
              </button>
            </>
          ) : (
            <p className="text-zinc-400">Nenhuma demanda urgente</p>
          )}
        </div>

        {/* Card 3: Dados Rápidos */}
        <div className="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/30 p-3 text-[11px]">
          <div className="flex items-center gap-1.5 mb-1.5">
            <User className="h-3.5 w-3.5 text-zinc-400" />
            <span className="font-medium text-zinc-600 dark:text-zinc-400">Dados Rápidos</span>
          </div>
          <div className="space-y-1">
            {data.telefone && (
              <div className="flex items-center gap-1">
                <Phone className="h-3 w-3 text-zinc-400" />
                <a href={`tel:${data.telefone}`} className="text-zinc-700 dark:text-zinc-300 hover:text-emerald-600">
                  {data.telefone}
                </a>
                <CopyButton text={data.telefone} />
              </div>
            )}
            {data.cpf && (
              <div className="flex items-center gap-1 font-mono">
                <span className="text-zinc-500">CPF</span>
                <span className="text-zinc-700 dark:text-zinc-300">{data.cpf}</span>
                <CopyButton text={data.cpf} />
              </div>
            )}
            {tempoPreso && (
              <p className="text-rose-600 dark:text-rose-400 font-medium">{tempoPreso}</p>
            )}
            {isPreso && data.unidadePrisional && (
              <p className="text-zinc-400 truncate">{data.unidadePrisional}</p>
            )}
          </div>
        </div>
      </div>

      {/* Processos Ativos — row full width */}
      {data.processos.length > 0 && (
        <div className="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/30 p-2.5">
          <div className="flex items-center gap-1.5 mb-1.5">
            <Scale className="h-3.5 w-3.5 text-zinc-400" />
            <span className="text-[10px] font-medium text-zinc-500 uppercase tracking-wide">Processos Ativos</span>
          </div>
          <div className="space-y-1">
            {data.processos.slice(0, 3).map(p => (
              <button
                key={p.id}
                onClick={() => onProcessoClick(p.id)}
                className="w-full text-left flex items-center gap-2 text-[11px] hover:bg-zinc-50 dark:hover:bg-zinc-700/50 rounded px-1.5 py-1 transition-colors group"
              >
                <span className="font-mono text-zinc-600 dark:text-zinc-400 shrink-0">{p.numeroAutos ?? "Sem nº"}</span>
                <span className="text-zinc-400">·</span>
                {p.area && <span className="text-zinc-500">{p.area}</span>}
                {p.fase && <span className="text-zinc-400">· {p.fase}</span>}
                {p.vara && <span className="text-zinc-400 truncate">· {p.vara}</span>}
                <span className="ml-auto text-zinc-300 group-hover:text-emerald-500">→</span>
              </button>
            ))}
            {data.processos.length > 3 && (
              <p className="text-[10px] text-zinc-400 px-1.5">+{data.processos.length - 3} processo(s)</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
```

**Step 2: Adicionar o componente na página**

Em `src/app/(dashboard)/admin/assistidos/[id]/page.tsx`, após o bloco `{/* Drive Status Bar */}` e antes das `{/* Tabs */}`, inserir:

```tsx
{/* Overview Panel */}
<AssistidoOverviewPanel
  data={data}
  onProcessoClick={(processoId) => {
    setSelectedProcessoId(processoId);
    setItemSheetOpen(true);
    setItemSheetType("processo");
  }}
  onDemandaClick={(demandaId) => {
    setSelectedDemandaId(demandaId);
    setItemSheetOpen(true);
    setItemSheetType("demanda");
  }}
/>
```

E adicionar os imports e estados necessários no topo da página:
```tsx
import { AssistidoOverviewPanel } from "./_components/overview-panel";
// estados
const [itemSheetOpen, setItemSheetOpen] = useState(false);
const [itemSheetType, setItemSheetType] = useState<"processo" | "demanda" | null>(null);
const [selectedProcessoId, setSelectedProcessoId] = useState<number | null>(null);
const [selectedDemandaId, setSelectedDemandaId] = useState<number | null>(null);
```

**Step 3: Commit**
```bash
git add src/app/\(dashboard\)/admin/assistidos/\[id\]/_components/overview-panel.tsx
git add src/app/\(dashboard\)/admin/assistidos/\[id\]/page.tsx
git commit -m "feat(assistidos): add overview panel with próxima audiência, demanda crítica, dados rápidos e processos"
```

---

## Task 2: AssistidoFichaSheet — Sheet lateral com ficha completa + ações + corréus

**Files:**
- Create: `src/app/(dashboard)/admin/assistidos/[id]/_components/ficha-sheet.tsx`
- Modify: `src/app/(dashboard)/admin/assistidos/[id]/page.tsx`

**Contexto:**
Usa o componente `Sheet` do shadcn/ui. Abre ao clicar no botão `[⊞]` no header. Agrupa: ficha pessoal, contato, ações (Solar/IA), corréus (detectados via `data.processos` → assistidos com mesmo processo).

**Step 1: Criar o componente**

```tsx
// src/app/(dashboard)/admin/assistidos/[id]/_components/ficha-sheet.tsx
"use client";

import { Copy, Check, Phone, ExternalLink, Sun, Brain, FolderOpen, Pencil, Users } from "lucide-react";
import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { format, differenceInYears } from "date-fns";
import { ptBR } from "date-fns/locale";
import Link from "next/link";

function CopyField({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-zinc-100 dark:border-zinc-800 last:border-0">
      <span className="text-[10px] text-zinc-400 uppercase tracking-wide w-20 shrink-0">{label}</span>
      <div className="flex items-center gap-1.5 flex-1 min-w-0">
        <span className="text-[11px] text-zinc-700 dark:text-zinc-300 truncate font-mono">{value}</span>
        <button
          onClick={() => { navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
          className="shrink-0 text-zinc-400 hover:text-emerald-600 transition-colors"
        >
          {copied ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
        </button>
      </div>
    </div>
  );
}

interface FichaSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assistido: {
    id: number;
    nome: string;
    cpf?: string | null;
    rg?: string | null;
    dataNascimento?: string | null;
    nomeMae?: string | null;
    nomePai?: string | null;
    naturalidade?: string | null;
    nacionalidade?: string | null;
    endereco?: string | null;
    telefone?: string | null;
    telefoneContato?: string | null;
    nomeContato?: string | null;
    parentescoContato?: string | null;
    driveFolderId?: string | null;
    processos: Array<{ id: number; numeroAutos?: string | null }>;
  };
  onExportarSolar: () => void;
  onSyncSolar: () => void;
  onAnalisarIA: () => void;
  isExportandoSolar: boolean;
  isSyncSolar: boolean;
  isAnalisando: boolean;
}

export function AssistidoFichaSheet({
  open, onOpenChange, assistido,
  onExportarSolar, onSyncSolar, onAnalisarIA,
  isExportandoSolar, isSyncSolar, isAnalisando
}: FichaSheetProps) {
  const idade = assistido.dataNascimento
    ? differenceInYears(new Date(), new Date(assistido.dataNascimento))
    : null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-80 sm:w-96 overflow-y-auto p-0">
        <SheetHeader className="px-4 pt-4 pb-3 border-b border-zinc-100 dark:border-zinc-800">
          <SheetTitle className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
            Ficha do Assistido
          </SheetTitle>
        </SheetHeader>

        <div className="px-4 py-3 space-y-4">
          {/* Ficha pessoal */}
          <div>
            <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wide mb-2">Identificação</p>
            {assistido.cpf && <CopyField label="CPF" value={assistido.cpf} />}
            {assistido.rg && <CopyField label="RG" value={assistido.rg} />}
            {assistido.dataNascimento && (
              <div className="flex items-center justify-between py-1.5 border-b border-zinc-100 dark:border-zinc-800">
                <span className="text-[10px] text-zinc-400 uppercase tracking-wide w-20 shrink-0">Nasc.</span>
                <span className="text-[11px] text-zinc-700 dark:text-zinc-300">
                  {format(new Date(assistido.dataNascimento), "dd/MM/yyyy", { locale: ptBR })}
                  {idade !== null && <span className="text-zinc-400 ml-1">({idade} anos)</span>}
                </span>
              </div>
            )}
            {assistido.nomeMae && (
              <div className="flex items-center justify-between py-1.5 border-b border-zinc-100 dark:border-zinc-800">
                <span className="text-[10px] text-zinc-400 uppercase tracking-wide w-20 shrink-0">Mãe</span>
                <span className="text-[11px] text-zinc-700 dark:text-zinc-300 truncate">{assistido.nomeMae}</span>
              </div>
            )}
            {assistido.naturalidade && (
              <div className="flex items-center justify-between py-1.5">
                <span className="text-[10px] text-zinc-400 uppercase tracking-wide w-20 shrink-0">Natural</span>
                <span className="text-[11px] text-zinc-700 dark:text-zinc-300 truncate">{assistido.naturalidade}</span>
              </div>
            )}
          </div>

          {/* Contato */}
          {(assistido.telefone || assistido.telefoneContato) && (
            <div>
              <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wide mb-2">Contato</p>
              {assistido.telefone && (
                <div className="flex items-center gap-2 py-1.5 border-b border-zinc-100 dark:border-zinc-800">
                  <Phone className="h-3 w-3 text-zinc-400 shrink-0" />
                  <a href={`tel:${assistido.telefone}`} className="text-[11px] text-zinc-700 dark:text-zinc-300 hover:text-emerald-600">
                    {assistido.telefone}
                  </a>
                  <a
                    href={`https://wa.me/55${assistido.telefone.replace(/\D/g, "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-auto text-[10px] text-emerald-600 hover:underline flex items-center gap-0.5"
                  >
                    WhatsApp <ExternalLink className="h-2.5 w-2.5" />
                  </a>
                </div>
              )}
              {assistido.telefoneContato && (
                <div className="py-1.5 text-[11px]">
                  <span className="text-zinc-400">{assistido.nomeContato}</span>
                  {assistido.parentescoContato && <span className="text-zinc-400 ml-1">({assistido.parentescoContato})</span>}
                  <span className="text-zinc-600 ml-1">{assistido.telefoneContato}</span>
                </div>
              )}
            </div>
          )}

          {/* Endereço */}
          {assistido.endereco && (
            <div>
              <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wide mb-1">Endereço</p>
              <p className="text-[11px] text-zinc-600 dark:text-zinc-400">{assistido.endereco}</p>
            </div>
          )}

          {/* Ações */}
          <div>
            <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wide mb-2">Ações</p>
            <div className="grid grid-cols-2 gap-2">
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-[11px] gap-1.5 border-amber-200 text-amber-700 hover:bg-amber-50"
                disabled={isExportandoSolar}
                onClick={onExportarSolar}
              >
                <Sun className="h-3 w-3" />
                {isExportandoSolar ? "Exportando..." : "Solar via SIGAD"}
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-[11px] gap-1.5 border-blue-200 text-blue-700 hover:bg-blue-50"
                disabled={isSyncSolar}
                onClick={onSyncSolar}
              >
                <Sun className="h-3 w-3" />
                {isSyncSolar ? "Sincronizando..." : "Sync Fases Solar"}
              </Button>
              {assistido.driveFolderId && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 text-[11px] gap-1.5 border-purple-200 text-purple-700 hover:bg-purple-50"
                  disabled={isAnalisando}
                  onClick={onAnalisarIA}
                >
                  <Brain className="h-3 w-3" />
                  {isAnalisando ? "Analisando..." : "Analisar com IA"}
                </Button>
              )}
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-[11px] gap-1.5"
                onClick={() => window.open(`https://drive.google.com/drive/folders/${assistido.driveFolderId}`, "_blank")}
                disabled={!assistido.driveFolderId}
              >
                <FolderOpen className="h-3 w-3" />
                Drive
              </Button>
            </div>
          </div>

          {/* Corréus */}
          {assistido.processos.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                <Users className="h-3 w-3" /> Corréus (mesmo processo)
              </p>
              <p className="text-[11px] text-zinc-500 italic">
                Ver na aba Processos — assistidos compartilhando os mesmos autos aparecem vinculados.
              </p>
            </div>
          )}

          {/* Editar */}
          <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800">
            <Link href={`/admin/assistidos/${assistido.id}/editar`} className="w-full">
              <Button variant="outline" size="sm" className="w-full h-8 text-[11px] gap-1.5">
                <Pencil className="h-3 w-3" />
                Editar ficha completa
              </Button>
            </Link>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
```

**Step 2: Integrar na página**

Adicionar import e botão `[⊞]` no header da página. No bloco de botões do header (após o botão de editar), adicionar:

```tsx
import { AssistidoFichaSheet } from "./_components/ficha-sheet";
import { PanelRight } from "lucide-react";

// estado
const [fichaSheetOpen, setFichaSheetOpen] = useState(false);

// no header, após o botão de pencil/editar:
<Button
  variant="ghost"
  size="sm"
  className="h-7 w-7 p-0 text-zinc-400 hover:text-emerald-600"
  onClick={() => setFichaSheetOpen(true)}
>
  <PanelRight className="h-3.5 w-3.5" />
</Button>

// antes do </div> final da página:
<AssistidoFichaSheet
  open={fichaSheetOpen}
  onOpenChange={setFichaSheetOpen}
  assistido={data}
  onExportarSolar={() => exportarViaSigad.mutate({ assistidoId: Number(id) })}
  onSyncSolar={() => sincronizarComSolar.mutate({ assistidoId: Number(id) })}
  onAnalisarIA={async () => {
    setIsAnalyzing(true);
    try {
      const res = await fetch("/api/ai/analyze-folder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assistidoId: Number(id) }),
      });
      const json = await res.json() as { summary?: string };
      setAnalysisResult(json.summary ?? "Análise concluída.");
      toast.success("Análise da pasta concluída");
    } catch { toast.error("Erro ao analisar pasta"); }
    finally { setIsAnalyzing(false); }
  }}
  isExportandoSolar={exportarViaSigad.isPending}
  isSyncSolar={sincronizarComSolar.isPending}
  isAnalisando={isAnalyzing}
/>
```

**Step 3: Remover bloco Solar/IA do header principal**

Remover o bloco completo `{/* Solar / SIGAD Actions */}` (linhas 418-589) da página — agora está no sheet.

**Step 4: Commit**
```bash
git add src/app/\(dashboard\)/admin/assistidos/\[id\]/_components/ficha-sheet.tsx
git add src/app/\(dashboard\)/admin/assistidos/\[id\]/page.tsx
git commit -m "feat(assistidos): add ficha sheet lateral com dados pessoais, contato, ações e mover Solar/IA para sheet"
```

---

## Task 3: ItemDetailSheet — Sheet de detalhe inline para processos e demandas

**Files:**
- Create: `src/app/(dashboard)/admin/assistidos/[id]/_components/item-detail-sheet.tsx`
- Modify: `src/app/(dashboard)/admin/assistidos/[id]/page.tsx`

**Contexto:**
Ao clicar em um processo ou demanda (no overview panel ou nas tabs), abre um sheet lateral com detalhes do item sem navegar para outra página. Inclui botão "Abrir completo →" para navegação se necessário.

**Step 1: Criar o componente**

```tsx
// src/app/(dashboard)/admin/assistidos/[id]/_components/item-detail-sheet.tsx
"use client";

import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ExternalLink, AlertCircle, Calendar, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import Link from "next/link";

type ItemType = "processo" | "demanda";

interface ProcessoItem {
  id: number;
  numeroAutos?: string | null;
  vara?: string | null;
  assunto?: string | null;
  area?: string | null;
  fase?: string | null;
  parteContraria?: string | null;
  demandas?: Array<{ id: number; ato?: string | null; tipoAto?: string | null; prazo?: string | null; status?: string | null }>;
  audiencias?: Array<{ id: number; dataAudiencia?: string | null; tipo?: string | null; local?: string | null }>;
}

interface DemandaItem {
  id: number;
  ato?: string | null;
  tipoAto?: string | null;
  prazo?: string | null;
  status?: string | null;
  defensorNome?: string | null;
}

interface ItemDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: ItemType | null;
  processo?: ProcessoItem | null;
  demanda?: DemandaItem | null;
}

export function ItemDetailSheet({ open, onOpenChange, type, processo, demanda }: ItemDetailSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-80 sm:w-96 overflow-y-auto p-0">
        {type === "processo" && processo && (
          <>
            <SheetHeader className="px-4 pt-4 pb-3 border-b border-zinc-100 dark:border-zinc-800">
              <SheetTitle className="text-sm font-mono text-zinc-700 dark:text-zinc-300">
                {processo.numeroAutos ?? "Sem número"}
              </SheetTitle>
            </SheetHeader>
            <div className="px-4 py-3 space-y-3 text-[11px]">
              <div className="space-y-1">
                {processo.area && (
                  <div className="flex gap-2">
                    <span className="text-zinc-400 w-16 shrink-0">Área</span>
                    <span className="text-zinc-700 dark:text-zinc-300">{processo.area}</span>
                  </div>
                )}
                {processo.fase && (
                  <div className="flex gap-2">
                    <span className="text-zinc-400 w-16 shrink-0">Fase</span>
                    <span className="text-zinc-700 dark:text-zinc-300">{processo.fase}</span>
                  </div>
                )}
                {processo.vara && (
                  <div className="flex gap-2">
                    <span className="text-zinc-400 w-16 shrink-0">Vara</span>
                    <span className="text-zinc-700 dark:text-zinc-300">{processo.vara}</span>
                  </div>
                )}
                {processo.assunto && (
                  <div className="flex gap-2">
                    <span className="text-zinc-400 w-16 shrink-0">Assunto</span>
                    <span className="text-zinc-700 dark:text-zinc-300">{processo.assunto}</span>
                  </div>
                )}
                {processo.parteContraria && (
                  <div className="flex gap-2">
                    <span className="text-zinc-400 w-16 shrink-0">Parte</span>
                    <span className="text-zinc-700 dark:text-zinc-300">{processo.parteContraria}</span>
                  </div>
                )}
              </div>

              {processo.demandas && processo.demandas.length > 0 && (
                <div>
                  <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wide mb-1.5 flex items-center gap-1">
                    <FileText className="h-3 w-3" /> Demandas
                  </p>
                  {processo.demandas.map(d => (
                    <div key={d.id} className="flex items-center justify-between py-1 border-b border-zinc-100 dark:border-zinc-800 last:border-0">
                      <span className="text-zinc-700 dark:text-zinc-300 truncate flex-1">{d.ato ?? d.tipoAto ?? "Demanda"}</span>
                      {d.prazo && (
                        <span className={cn(
                          "ml-2 shrink-0",
                          new Date(d.prazo) < new Date() ? "text-rose-500" : "text-zinc-400"
                        )}>
                          {format(new Date(d.prazo), "dd/MMM", { locale: ptBR })}
                          {new Date(d.prazo) < new Date() && <AlertCircle className="inline h-3 w-3 ml-1" />}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {processo.audiencias && processo.audiencias.length > 0 && (
                <div>
                  <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wide mb-1.5 flex items-center gap-1">
                    <Calendar className="h-3 w-3" /> Audiências
                  </p>
                  {processo.audiencias.map(a => (
                    <div key={a.id} className="py-1 border-b border-zinc-100 dark:border-zinc-800 last:border-0">
                      {a.dataAudiencia && (
                        <span className="text-zinc-700 dark:text-zinc-300">
                          {format(new Date(a.dataAudiencia), "dd/MMM HH'h'mm", { locale: ptBR })}
                        </span>
                      )}
                      {a.tipo && <span className="text-zinc-400 ml-2">{a.tipo}</span>}
                    </div>
                  ))}
                </div>
              )}

              <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800">
                <Link href={`/admin/processos/${processo.id}`}>
                  <Button variant="outline" size="sm" className="w-full h-8 text-[11px] gap-1.5">
                    Abrir processo completo
                    <ExternalLink className="h-3 w-3" />
                  </Button>
                </Link>
              </div>
            </div>
          </>
        )}

        {type === "demanda" && demanda && (
          <>
            <SheetHeader className="px-4 pt-4 pb-3 border-b border-zinc-100 dark:border-zinc-800">
              <SheetTitle className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                {demanda.ato ?? demanda.tipoAto ?? "Demanda"}
              </SheetTitle>
            </SheetHeader>
            <div className="px-4 py-3 space-y-3 text-[11px]">
              {demanda.status && (
                <div className="flex gap-2">
                  <span className="text-zinc-400 w-16 shrink-0">Status</span>
                  <span className="text-zinc-700 dark:text-zinc-300">{demanda.status.replace(/^\d+_/, "")}</span>
                </div>
              )}
              {demanda.prazo && (
                <div className="flex gap-2">
                  <span className="text-zinc-400 w-16 shrink-0">Prazo</span>
                  <span className={cn(
                    new Date(demanda.prazo) < new Date() ? "text-rose-600 font-semibold" : "text-zinc-700 dark:text-zinc-300"
                  )}>
                    {format(new Date(demanda.prazo), "dd/MM/yyyy", { locale: ptBR })}
                    {new Date(demanda.prazo) < new Date() && " (vencido)"}
                  </span>
                </div>
              )}
              {demanda.defensorNome && (
                <div className="flex gap-2">
                  <span className="text-zinc-400 w-16 shrink-0">Defensor</span>
                  <span className="text-zinc-700 dark:text-zinc-300">{demanda.defensorNome}</span>
                </div>
              )}
              <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800">
                <Link href={`/admin/demandas/${demanda.id}`}>
                  <Button variant="outline" size="sm" className="w-full h-8 text-[11px] gap-1.5">
                    Abrir demanda completa
                    <ExternalLink className="h-3 w-3" />
                  </Button>
                </Link>
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
```

**Step 2: Integrar na página**

```tsx
import { ItemDetailSheet } from "./_components/item-detail-sheet";

// no JSX, antes do </div> final:
<ItemDetailSheet
  open={itemSheetOpen}
  onOpenChange={setItemSheetOpen}
  type={itemSheetType}
  processo={itemSheetType === "processo" ? data.processos.find(p => p.id === selectedProcessoId) ?? null : null}
  demanda={itemSheetType === "demanda" ? data.demandas.find(d => d.id === selectedDemandaId) ?? null : null}
/>
```

Nas tabs, tornar os itens de processos e demandas clicáveis via sheet (em vez de navegação):
- Na tab "processos": `onClick` abre o `ItemDetailSheet` com tipo "processo"
- Na tab "demandas": `onClick` abre o `ItemDetailSheet` com tipo "demanda"

**Step 3: Commit**
```bash
git add src/app/\(dashboard\)/admin/assistidos/\[id\]/_components/item-detail-sheet.tsx
git add src/app/\(dashboard\)/admin/assistidos/\[id\]/page.tsx
git commit -m "feat(assistidos): add item detail sheet inline para processos e demandas"
```

---

## Task 4: Tabs — Reorganizar ordem e badges de urgência

**Files:**
- Modify: `src/app/(dashboard)/admin/assistidos/[id]/page.tsx`

**Step 1: Reorganizar tabs**

Substituir o array `tabs` atual por:

```tsx
// Tabs principais (por frequência de uso)
const tabs: { key: Tab; label: string; count?: number; urgency?: "red" | "amber" }[] = [
  { key: "processos", label: "Processos", count: data.processos.length },
  {
    key: "demandas",
    label: "Demandas",
    count: data.demandas.length,
    urgency: data.demandas.some(d =>
      d.status === "1_URGENTE" || (d.prazo && new Date(d.prazo) < new Date())
    ) ? "red" : data.demandas.some(d => d.status === "2_VENCER") ? "amber" : undefined
  },
  { key: "audiencias", label: "Audiências", count: data.audiencias.length },
  { key: "drive", label: "Drive", count: data.driveFiles.length },
  { key: "midias", label: "Mídias", count: mediaFiles.length },
  { key: "oficios", label: "Ofícios", count: oficiosData?.total ?? 0 },
  { key: "inteligencia", label: "Inteligência" },
];

// Tabs overflow
const overflowTabs: { key: Tab; label: string }[] = [
  { key: "timeline", label: "Timeline" },
  { key: "radar", label: "Radar" },
];
```

**Step 2: Atualizar o render das tabs com badge de urgência e menu overflow**

```tsx
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ChevronDown } from "lucide-react"; // já importado

// substituir o bloco de tabs:
<div className="flex gap-0 border-b border-zinc-100 dark:border-zinc-800 px-6 overflow-x-auto">
  {tabs.map((t) => (
    <button
      key={t.key}
      onClick={() => setTab(t.key)}
      className={cn(
        "px-3 py-2.5 text-[11px] font-medium border-b-2 transition-colors whitespace-nowrap shrink-0",
        tab === t.key
          ? "border-emerald-500 text-emerald-700 dark:text-emerald-400"
          : "border-transparent text-zinc-500 hover:text-zinc-700"
      )}
    >
      {t.label}
      {t.count !== undefined && t.count > 0 && (
        <span className={cn(
          "ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full",
          t.urgency === "red"
            ? "bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 animate-pulse"
            : t.urgency === "amber"
            ? "bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400"
            : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500"
        )}>
          {t.count}
        </span>
      )}
    </button>
  ))}
  {/* Overflow menu */}
  <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <button className={cn(
        "px-3 py-2.5 text-[11px] font-medium border-b-2 transition-colors flex items-center gap-1 shrink-0",
        overflowTabs.some(t => t.key === tab)
          ? "border-emerald-500 text-emerald-700 dark:text-emerald-400"
          : "border-transparent text-zinc-500 hover:text-zinc-700"
      )}>
        + <ChevronDown className="h-3 w-3" />
      </button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end">
      {overflowTabs.map(t => (
        <DropdownMenuItem key={t.key} onClick={() => setTab(t.key)}>
          {t.label}
        </DropdownMenuItem>
      ))}
    </DropdownMenuContent>
  </DropdownMenu>
</div>
```

**Step 3: Persistir tab ativa em localStorage**

```tsx
// substituir useState inicial:
const [tab, setTab] = useState<Tab>(() => {
  if (typeof window === "undefined") return "processos";
  return (localStorage.getItem(`assistido-tab-${id}`) as Tab) ?? "processos";
});

// substituir setTab chamadas por:
const handleSetTab = (t: Tab) => {
  setTab(t);
  localStorage.setItem(`assistido-tab-${id}`, t);
};
// e usar handleSetTab em vez de setTab nos onClick das tabs
```

**Step 4: Commit**
```bash
git add src/app/\(dashboard\)/admin/assistidos/\[id\]/page.tsx
git commit -m "feat(assistidos): reorganizar tabs por frequência, badges urgência, overflow menu, persistência localStorage"
```

---

## Task 5: Tabs de Processos e Demandas — Ativar click para ItemDetailSheet

**Files:**
- Modify: `src/app/(dashboard)/admin/assistidos/[id]/page.tsx`

**Step 1: Tab Processos — usar sheet em vez de router.push**

Substituir o bloco `onClick={() => router.push(...)}` na tab processos:

```tsx
// antes:
onClick={() => router.push(`/admin/processos/${p.id}`)}

// depois:
onClick={() => {
  setSelectedProcessoId(p.id);
  setItemSheetType("processo");
  setItemSheetOpen(true);
}}
```

**Step 2: Tab Demandas — usar sheet em vez de Link**

Substituir o `<Link href={...}>` por um `<button>` com onClick:

```tsx
// antes: <Link key={d.id} href={`/admin/demandas/${d.id}`} ...>
// depois:
<button
  key={d.id}
  onClick={() => {
    setSelectedDemandaId(d.id);
    setItemSheetType("demanda");
    setItemSheetOpen(true);
  }}
  className="w-full text-left block ..."
>
```

**Step 3: Commit**
```bash
git add src/app/\(dashboard\)/admin/assistidos/\[id\]/page.tsx
git commit -m "feat(assistidos): abrir processos e demandas em sheet inline"
```

---

## Resumo Final

| Task | Componente | Impacto |
|------|-----------|---------|
| 1 | OverviewPanel | Visão geral sempre visível — audiência, demanda, dados, processos |
| 2 | FichaSheet | Ficha completa + ações Solar/IA movidas para sheet lateral |
| 3 | ItemDetailSheet | Detalhes sem navegar — mantém contexto do assistido |
| 4 | Tabs | Ordem lógica + urgência visual + overflow + persistência |
| 5 | Tabs click | Processos e demandas abrem sheet em vez de navegar |
