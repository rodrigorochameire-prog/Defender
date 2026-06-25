"use client";

import { useState } from "react";
import {
  CalendarClock,
  ExternalLink,
  FileText,
  FolderOpen,
  GitBranch,
  Link2,
  NotebookPen,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ds/empty-state";
import { cn } from "@/lib/utils";
import { formatProcesso } from "@/lib/format/apresentacao";
import { getAtribuicaoColors } from "@/lib/config/atribuicoes";
import { calcularPrazoBadge } from "@/components/demandas-premium/sheet/prazo-badge";
import { SheetModeTabs, type SheetModeTab } from "@/components/demandas-premium/sheet/SheetModeTabs";

/**
 * Dado de apresentação do ProcessoSheet — derivado de `trpc.processos.getById`
 * + `trpc.audiencias.proximaAgendada`. Mantido plano e serializável para que o
 * body seja PURO/controlado (testável sem Radix/tRPC), no mesmo espírito de
 * SheetModeTabs/RedesignarDialog. O wrapper (`processo-sheet.tsx`) mapeia a
 * query para este shape.
 */
export interface ProcessoSheetData {
  id: number;
  numeroAutos: string | null;
  area: string | null;
  atribuicao: string | null;
  fase: string | null;
  situacao: string | null;
  assunto: string | null;
  vara: string | null;
  assistidoNome: string | null;
  proximaAudiencia: { dataAudiencia: string | Date; tipo: string | null } | null;
  /** String dd/mm/aaaa do prazo mais próximo (alimenta o PrazoBadge). */
  proximoPrazoStr: string | null;
  registrosCount: number;
  documentosCount: number;
  partesCount: number;
  vinculadosCount: number;
}

interface Props {
  data: ProcessoSheetData;
  onVincularCaso: () => void;
  onAbrirPje: () => void;
  /** Conteúdo real das abas (renderizado pelo wrapper). Sem conteúdo → EmptyState. */
  slots?: Partial<Record<SecaoKey, React.ReactNode>>;
}

type SecaoKey = "registros" | "documentos" | "partes" | "vinculados";

const SECAO_META: Record<
  SecaoKey,
  { label: string; emptyTitle: string; emptyDesc: string; icon: typeof FileText }
> = {
  registros: {
    label: "Registros",
    emptyTitle: "Sem registros",
    emptyDesc: "Anotações, ciências e diligências do processo aparecerão aqui.",
    icon: NotebookPen,
  },
  documentos: {
    label: "Documentos",
    emptyTitle: "Sem documentos",
    emptyDesc: "Peças e autos vinculados ao processo aparecerão aqui.",
    icon: FolderOpen,
  },
  partes: {
    label: "Partes",
    emptyTitle: "Sem partes vinculadas",
    emptyDesc: "Assistidos e demais partes do processo aparecerão aqui.",
    icon: Users,
  },
  vinculados: {
    label: "Vinculados",
    emptyTitle: "Sem processos vinculados",
    emptyDesc: "Processos incidentais e correlatos do mesmo caso aparecerão aqui.",
    icon: GitBranch,
  },
};

const PRAZO_CHIP: Record<string, string> = {
  red: "bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400",
  amber: "bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400",
  green: "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400",
  gray: "bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400",
};

function fmtAudiencia(d: string | Date): string {
  const dt = new Date(typeof d === "string" && d.length === 10 ? `${d}T12:00:00` : d);
  if (Number.isNaN(dt.getTime())) return "—";
  return dt.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }).replace(".", "");
}

/**
 * Corpo do ProcessoSheet — PURO/controlado, espelha a estrutura do sheet-mestre
 * de Demandas/Agenda: header (número mascarado + assistido + área), faixa de
 * urgência (fase + próxima audiência + PrazoBadge) e abas (Registros/Documentos/
 * Partes/Vinculados). Cada aba sem dado cai no EmptyState canônico.
 */
export function ProcessoSheetBody({ data, onVincularCaso, onAbrirPje, slots }: Props) {
  const [active, setActive] = useState<SecaoKey>("registros");

  const numeroFmt = data.numeroAutos ? formatProcesso(data.numeroAutos) : "Sem número";
  const areaLabel = getAtribuicaoColors(data.atribuicao ?? data.area).label;
  const areaColor = getAtribuicaoColors(data.atribuicao ?? data.area).color;
  const prazoBadge = data.proximoPrazoStr ? calcularPrazoBadge(data.proximoPrazoStr) : null;

  const counts: Record<SecaoKey, number> = {
    registros: data.registrosCount,
    documentos: data.documentosCount,
    partes: data.partesCount,
    vinculados: data.vinculadosCount,
  };

  const tabs: SheetModeTab[] = (Object.keys(SECAO_META) as SecaoKey[]).map((k) => ({
    key: k,
    label: SECAO_META[k].label,
    count: counts[k],
  }));

  const activeMeta = SECAO_META[active];
  const activeSlot = slots?.[active];
  const hasData = counts[active] > 0 && activeSlot != null;

  return (
    <div className="flex h-full flex-col">
      {/* ── Header: número mascarado + assistido + área ── */}
      <div className="px-4 pt-1 pb-3 border-b border-neutral-200/60 dark:border-neutral-800/60">
        <div className="flex items-start gap-2">
          <span
            className="mt-1 h-2 w-2 shrink-0 rounded-full"
            style={{ backgroundColor: areaColor }}
            aria-hidden
          />
          <div className="min-w-0 flex-1">
            <h2
              className="font-mono text-[15px] font-semibold tabular-nums text-foreground truncate"
              title={data.numeroAutos ?? undefined}
            >
              {numeroFmt}
            </h2>
            <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-muted-foreground">
              {data.assistidoNome && (
                <span className="truncate font-medium text-foreground/80">{data.assistidoNome}</span>
              )}
              <span className="inline-flex items-center gap-1 font-medium" style={{ color: areaColor }}>
                {areaLabel}
              </span>
            </div>
            {data.assunto && (
              <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{data.assunto}</p>
            )}
          </div>
        </div>

        {/* ── Faixa/strip: fase + próxima audiência + urgência (PrazoBadge) ── */}
        <div className="mt-2.5 flex flex-wrap items-center gap-2 text-[11px]">
          {data.fase && (
            <span className="inline-flex items-center gap-1 rounded-md bg-neutral-100 px-1.5 py-0.5 font-medium text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
              {data.fase}
            </span>
          )}
          {data.proximaAudiencia && (
            <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
              <CalendarClock className="h-3 w-3" />
              {data.proximaAudiencia.tipo ?? "Audiência"} · {fmtAudiencia(data.proximaAudiencia.dataAudiencia)}
            </span>
          )}
          {prazoBadge && prazoBadge.cor !== "none" && (
            <span
              data-testid="processo-prazo-badge"
              className={cn(
                "inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-semibold tabular-nums",
                PRAZO_CHIP[prazoBadge.cor] ?? PRAZO_CHIP.gray,
              )}
            >
              {prazoBadge.texto}
            </span>
          )}
        </div>
      </div>

      {/* ── Abas/seções ── */}
      <SheetModeTabs modes={tabs} active={active} onChange={(k) => setActive(k as SecaoKey)} />

      <div className="flex-1 overflow-y-auto px-4 py-3">
        {hasData ? (
          activeSlot
        ) : (
          <EmptyState icon={activeMeta.icon} title={activeMeta.emptyTitle} description={activeMeta.emptyDesc} />
        )}
      </div>

      {/* ── Footer fixo: ações ── */}
      <div className="sticky bottom-0 flex items-center gap-2 border-t border-neutral-200/60 bg-white/95 px-4 py-3 backdrop-blur-md dark:border-neutral-800/60 dark:bg-neutral-900/95">
        <Button size="sm" variant="outline" className="flex-1 text-xs cursor-pointer" onClick={onVincularCaso}>
          <Link2 className="mr-1.5 h-3.5 w-3.5" />
          Vincular a caso
        </Button>
        <Button size="sm" variant="outline" className="flex-1 text-xs cursor-pointer" onClick={onAbrirPje}>
          <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
          Abrir no PJe
        </Button>
      </div>
    </div>
  );
}
