"use client";

import React, { useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  MessageCircle,
  AlertCircle,
  Calendar,
  Phone,
  Bookmark,
  BookmarkCheck,
  Copy,
  CheckCircle2,
  HardDrive,
  Link2Off,
  Zap,
} from "lucide-react";
import { format, differenceInDays, parseISO } from "date-fns";
import { AssistidoAvatar } from "@/components/shared/assistido-avatar";
import {
  SOLID_COLOR_MAP,
  normalizeAreaToFilter,
} from "@/lib/config/atribuicoes";
import type { AssistidoUI } from "./assistido-types";
import { statusConfig } from "./assistido-config";
import { getPrazoInfo, calcularTempoPreso } from "./assistido-utils";

export interface AssistidoTableViewProps {
  assistidos: AssistidoUI[];
  pinnedIds: Set<number>;
  onPhotoClick: (a: AssistidoUI) => void;
  onTogglePin: (id: number) => void;
  sortBy: string;
  onSortChange: (col: string) => void;
  onPreview?: (a: AssistidoUI) => void;
  /** Assistido atualmente exibido no painel de preview — realça a linha. */
  selectedId?: number | null;
  /** Filtro de atribuição ativo (normalizado) — quando setado, pinta a barra na cor do filtro. */
  atribuicaoFilter?: string;
  /** Modo seleção em lote (exportar Solar) — exibe checkboxes. */
  batchSelectMode?: boolean;
  batchSelectedIds?: Set<number>;
  onToggleBatchSelect?: (id: number, hasCpf: boolean) => void;
}

export function AssistidoTableView({
  assistidos,
  pinnedIds,
  onPhotoClick,
  onTogglePin,
  onPreview,
  selectedId,
  atribuicaoFilter,
  batchSelectMode,
  batchSelectedIds,
  onToggleBatchSelect,
}: AssistidoTableViewProps) {
  const [copiedId, setCopiedId] = useState<number | null>(null);

  const handleCopyProcesso = (id: number, processo: string) => {
    navigator.clipboard.writeText(processo);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filterActive = !!atribuicaoFilter && atribuicaoFilter !== "all";

  return (
    <div className="space-y-2">
      {assistidos.map((assistido, index) => {
        const isPreso = ["CADEIA_PUBLICA", "PENITENCIARIA", "COP", "HOSPITAL_CUSTODIA"].includes(assistido.statusPrisional);
        const isMonitorado = ["MONITORADO", "DOMICILIAR"].includes(assistido.statusPrisional);
        const prazoInfo = getPrazoInfo(assistido.proximoPrazo);
        const prazoVencido = prazoInfo && prazoInfo.text === "Vencido";
        const tempoPreso = calcularTempoPreso(assistido.dataPrisao ?? null);
        const statusCfg = statusConfig[assistido.statusPrisional];
        const isPinned = pinnedIds.has(assistido.id);
        const isSelected = selectedId != null && selectedId === assistido.id;

        const diasAteAudiencia = assistido.proximaAudiencia
          ? differenceInDays(parseISO(assistido.proximaAudiencia), new Date())
          : null;
        const audienciaHoje = diasAteAudiencia === 0;
        const audienciaAmanha = diasAteAudiencia === 1;

        const atribuicoesUnicas = assistido.atribuicoes || assistido.areas || [];

        // Identidade unificada: barra E avatar usam a mesma chave de atribuição —
        // o filtro ativo (lista uniforme) ou a primária estável (não a do processo mais recente).
        const variaKeys = Array.from(
          new Set(atribuicoesUnicas.map((x) => normalizeAreaToFilter(x)).filter((k) => k !== "all")),
        );
        const primaryKey = normalizeAreaToFilter(assistido.atribuicaoPrimaria) !== "all"
          ? normalizeAreaToFilter(assistido.atribuicaoPrimaria)
          : (variaKeys[0] ?? null);
        const displayKey = filterActive ? atribuicaoFilter! : (primaryKey ?? undefined);
        const barColor = displayKey ? (SOLID_COLOR_MAP[displayKey] || "#a1a1aa") : "#a1a1aa";

        const telefone = assistido.telefone || assistido.telefoneContato;
        const telDigits = telefone ? telefone.replace(/\D/g, "") : null;

        return (
          <div
            key={assistido.id}
            id={`assistido-row-${assistido.id}`}
            className={cn(
              "group relative rounded-xl border transition-all duration-150 cursor-pointer",
              "animate-in fade-in duration-200 fill-mode-both",
              "hover:shadow-md hover:border-neutral-300 dark:hover:border-neutral-600",
              isPinned
                ? "border-amber-300/60 dark:border-amber-700/40 bg-amber-50/20 dark:bg-amber-950/5"
                : "border-neutral-200/80 dark:border-neutral-800/80 bg-white dark:bg-neutral-900",
              isSelected && "ring-2 ring-emerald-400/40 dark:ring-emerald-500/30 border-emerald-300 dark:border-emerald-700 shadow-md",
            )}
            style={{ animationDelay: `${Math.min(index * 20, 400)}ms` }}
            onClick={() => onPreview?.(assistido)}
          >
            {/* Color accent bar — atribuição do filtro (ou primária) */}
            <div
              className="absolute left-0 top-3 bottom-3 w-[3px] rounded-full"
              style={{ backgroundColor: barColor }}
            />

            {/* Main row content */}
            <div className="flex items-center gap-4 px-5 pl-6 py-3">
              {/* Checkbox de seleção em lote (Solar) */}
              {batchSelectMode && (
                <button
                  onClick={(e) => { e.stopPropagation(); onToggleBatchSelect?.(assistido.id, !!assistido.cpf); }}
                  disabled={!assistido.cpf}
                  title={!assistido.cpf ? "Sem CPF — não exportável ao Solar" : undefined}
                  className={cn(
                    "w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors",
                    !assistido.cpf
                      ? "border-neutral-200 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-800 cursor-not-allowed opacity-40"
                      : batchSelectedIds?.has(assistido.id)
                        ? "border-amber-500 bg-amber-500"
                        : "border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-900 hover:border-amber-400",
                  )}
                >
                  {batchSelectedIds?.has(assistido.id) && <CheckCircle2 className="w-3 h-3 text-white" />}
                </button>
              )}
              {/* === LEFT: Avatar + Name + Badges === */}
              <div className="flex items-center gap-3 w-[300px] shrink-0 min-w-0">
                <span onClick={(e) => e.stopPropagation()} className="shrink-0">
                  <AssistidoAvatar
                    nome={assistido.nome}
                    photoUrl={assistido.photoUrl}
                    size="sm"
                    atribuicao={displayKey}
                    statusPrisional={assistido.statusPrisional}
                    showStatusDot
                    onClick={() => onPhotoClick(assistido)}
                  />
                </span>
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/admin/assistidos/${assistido.id}`}
                    className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 truncate block hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors max-w-[220px]"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {assistido.nome}
                  </Link>
                  <div className="flex items-center gap-1.5 mt-1">
                    {/* Status badge — neutral for Solto */}
                    <span className={cn(
                      "inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium",
                      isPreso && "bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400",
                      isMonitorado && "bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400",
                      !isPreso && !isMonitorado && "bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400",
                    )}>
                      <div className={cn(
                        "w-1.5 h-1.5 rounded-full",
                        isPreso && "bg-rose-500",
                        isMonitorado && "bg-amber-500",
                        !isPreso && !isMonitorado && "bg-neutral-400 dark:bg-neutral-500",
                      )} />
                      {statusCfg?.label || "Solto"}
                    </span>
                    {/* Tempo preso inline */}
                    {isPreso && tempoPreso && (
                      <span className="text-[10px] font-mono tabular-nums text-rose-400">
                        {tempoPreso}
                      </span>
                    )}
                    {/* Pontos multi-vara — só quando atua em mais de uma atribuição */}
                    {variaKeys.length > 1 && (
                      <span className="flex items-center gap-0.5 ml-0.5">
                        {variaKeys.slice(0, 4).map((k) => (
                          <Tooltip key={k}>
                            <TooltipTrigger asChild>
                              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: SOLID_COLOR_MAP[k] || "#a1a1aa" }} />
                            </TooltipTrigger>
                            <TooltipContent side="top" className="text-[10px]">{k}</TooltipContent>
                          </Tooltip>
                        ))}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* === CENTER: Crime + Processo + Phone === */}
              <div className="flex-1 min-w-0 flex items-center gap-6">
                <div className="min-w-0 space-y-0.5">
                  {assistido.crimePrincipal ? (
                    <p className="text-xs text-neutral-600 dark:text-neutral-400 truncate max-w-[200px]">
                      {assistido.crimePrincipal}
                    </p>
                  ) : null}
                  {assistido.numeroProcesso ? (
                    <div
                      className="flex items-center gap-1 cursor-pointer group/copy"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCopyProcesso(assistido.id, assistido.numeroProcesso!);
                      }}
                    >
                      <span className="font-mono tabular-nums text-[10px] text-neutral-400 dark:text-neutral-500 truncate max-w-[180px]">
                        {assistido.numeroProcesso}
                      </span>
                      {copiedId === assistido.id ? (
                        <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />
                      ) : (
                        <Copy className="w-3 h-3 text-neutral-300 dark:text-neutral-600 group-hover/copy:text-neutral-400 transition-colors shrink-0" />
                      )}
                    </div>
                  ) : null}
                </div>
                {telefone && (
                  <a
                    href={`tel:${telDigits}`}
                    onClick={(e) => e.stopPropagation()}
                    className="flex items-center gap-1 text-[10px] text-neutral-400 hover:text-emerald-600 transition-colors shrink-0"
                  >
                    <Phone className="w-3 h-3" />
                    {telefone}
                  </a>
                )}
              </div>

              {/* === RIGHT: Audiência + WhatsApp + Drive + Pin === */}
              <div className="flex items-center gap-3 shrink-0">
                {/* Audiência/Prazo — clicável (fast-lane) */}
                {assistido.proximaAudiencia ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Link
                        href={`/admin/assistidos/${assistido.id}/audiencias`}
                        onClick={(e) => e.stopPropagation()}
                        className={cn(
                          "inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium whitespace-nowrap transition-all hover:brightness-95",
                          audienciaHoje && "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400",
                          audienciaAmanha && "bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400",
                          !audienciaHoje && !audienciaAmanha && diasAteAudiencia !== null && diasAteAudiencia <= 7 && "bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400",
                          !audienciaHoje && !audienciaAmanha && diasAteAudiencia !== null && diasAteAudiencia > 7 && "text-neutral-400 dark:text-neutral-500",
                        )}
                      >
                        {(audienciaHoje || audienciaAmanha || (diasAteAudiencia !== null && diasAteAudiencia <= 5))
                          ? <Zap className="w-3 h-3 shrink-0 fill-current" />
                          : <Calendar className="w-3 h-3 shrink-0" />
                        }
                        {audienciaHoje ? "HOJE" : audienciaAmanha ? "Amanhã" : `${diasAteAudiencia}d`}
                        <span className="opacity-60">{format(parseISO(assistido.proximaAudiencia), "dd/MM")}</span>
                      </Link>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="text-[10px]">
                      {assistido.tipoProximaAudiencia || "Audiência"} · {format(parseISO(assistido.proximaAudiencia), "dd/MM HH:mm")}
                    </TooltipContent>
                  </Tooltip>
                ) : prazoInfo ? (
                  <div className={cn(
                    "inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium whitespace-nowrap",
                    prazoVencido && "bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400",
                    !prazoVencido && prazoInfo.urgent && "bg-amber-50 dark:bg-amber-900/20 text-amber-600",
                    !prazoVencido && !prazoInfo.urgent && "text-neutral-400",
                  )}>
                    {prazoVencido ? <AlertCircle className="w-3 h-3 shrink-0" /> : prazoInfo.urgent ? <Zap className="w-3 h-3 shrink-0 fill-current" /> : null}
                    {prazoInfo.text}
                  </div>
                ) : null}

                {/* WhatsApp — abre conversa integrada no OMBUDS */}
                {telDigits && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Link
                        href={`/admin/whatsapp?phone=${telDigits}`}
                        onClick={(e) => e.stopPropagation()}
                        className="h-7 w-7 inline-flex items-center justify-center rounded-md text-neutral-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-all"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                      </Link>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="text-[10px]">Conversa no OMBUDS</TooltipContent>
                  </Tooltip>
                )}

                {/* Drive */}
                <div onClick={(e) => e.stopPropagation()}>
                  {assistido.driveFolderId ? (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <a
                          href={`https://drive.google.com/drive/folders/${assistido.driveFolderId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 transition-colors"
                        >
                          <HardDrive className="w-3.5 h-3.5" />
                          {(assistido.driveFilesCount ?? 0) > 0 && (
                            <span className="text-[10px] font-medium tabular-nums">{assistido.driveFilesCount}</span>
                          )}
                        </a>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="text-[10px]">
                        Abrir Drive{(assistido.driveFilesCount ?? 0) > 0 ? ` (${assistido.driveFilesCount} arq.)` : ""}
                      </TooltipContent>
                    </Tooltip>
                  ) : (
                    <Link2Off className="w-3.5 h-3.5 text-neutral-300 dark:text-neutral-600" />
                  )}
                </div>

                {/* Pin */}
                <button
                  className={cn(
                    "h-7 w-7 inline-flex items-center justify-center rounded-md transition-all shrink-0",
                    isPinned
                      ? "text-amber-500"
                      : "text-neutral-300 dark:text-neutral-600 opacity-0 group-hover:opacity-100 hover:text-amber-500",
                  )}
                  onClick={(e) => { e.stopPropagation(); onTogglePin(assistido.id); }}
                >
                  {isPinned ? <BookmarkCheck className="h-3.5 w-3.5" /> : <Bookmark className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
