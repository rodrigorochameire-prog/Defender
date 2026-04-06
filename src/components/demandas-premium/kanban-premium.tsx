"use client";

import React, { useState, useMemo, useCallback, useRef, useEffect } from "react";
import {
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  Lock,
  Copy,
  Clock,
  Flame,
  Archive,
  Activity,
  ListTodo,
  User,
  AlertTriangle,
  FileEdit,
  Search,
  FileCheck,
  Upload,
  Eye,
  CheckCircle2,
} from "lucide-react";
import {
  KANBAN_COLUMNS,
  SUB_GROUPS,
  STATUS_GROUPS,
  GROUP_TO_COLUMN,
  getStatusConfig,
  type KanbanColumn,
  type EmAndamentoSubGroup,
  type StatusGroup,
} from "@/config/demanda-status";
import { StatusPipelineSelector } from "./StatusPipelineSelector";

// ==========================================
// STATUS ICON MAPPING (fallback when statusCfg.icon unavailable)
// ==========================================

const STATUS_ICONS: Record<string, React.ElementType> = {
  fila: ListTodo,
  atender: User,
  urgente: AlertTriangle,
  elaborar: FileEdit,
  elaborando: FileEdit,
  analisar: Search,
  revisar: FileCheck,
  revisando: FileCheck,
  protocolar: Upload,
  monitorar: Eye,
  protocolado: CheckCircle2,
  ciencia: Eye,
  resolvido: CheckCircle2,
};

// ==========================================
// TYPES
// ==========================================

interface KanbanDemanda {
  id: string | number;
  assistido: string;
  ato: string;
  status: string;
  substatus?: string | null;
  prioridade?: string | null;
  prazo?: string | null;
  estadoPrisional?: string | null;
  atribuicao?: string | null;
  processos?: Array<{ numero?: string }>;
  delegadoPara?: string | null;
  reuPreso?: boolean;
  [key: string]: unknown;
}

interface KanbanPremiumProps {
  demandas: KanbanDemanda[];
  onCardClick: (id: string | number) => void;
  onStatusChange?: (demandaId: string, newStatus: string) => void;
  copyToClipboard: (text: string) => void;
  selectedAtribuicoes?: string[];
  showArchived?: boolean;
}

// StatusChangePopover replaced by StatusPipelineSelector

// ==========================================
// CARD COMPONENT
// ==========================================

function KanbanCard({
  demanda,
  group,
  onCardClick,
  onStatusChange,
  copyToClipboard,
  isDragging: isBeingDragged,
  onDragStart,
  onDragEnd,
}: {
  demanda: KanbanDemanda;
  group: StatusGroup;
  onCardClick: (id: string | number) => void;
  onStatusChange?: (demandaId: string, newStatus: string) => void;
  copyToClipboard: (text: string) => void;
  isDragging?: boolean;
  onDragStart?: (id: string) => void;
  onDragEnd?: () => void;
}) {
  const rawStatus = demanda.substatus || demanda.status || "fila";
  const statusCfg = getStatusConfig(rawStatus);
  // Show original substatus label (e.g. "2 - Elaborar") for planilha fidelity
  const statusDisplay = rawStatus.match(/^\d+\s*-\s*/) ? rawStatus : statusCfg?.label || rawStatus;
  const processo = demanda.processos?.[0]?.numero || "";
  const isUrgente = demanda.prioridade === "URGENTE" || demanda.prioridade === "REU_PRESO";
  const isPreso = demanda.estadoPrisional === "preso" || demanda.reuPreso;
  const groupColor = STATUS_GROUPS[group]?.color || "#A1A1AA";

  // Status popover state
  const [showStatusPopover, setShowStatusPopover] = useState(false);
  const badgeRef = useRef<HTMLButtonElement>(null);

  const handleBadgeClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onStatusChange) return;
    setShowStatusPopover(true);
  }, [onStatusChange]);

  const handleStatusSelect = useCallback((newStatus: string) => {
    if (onStatusChange) {
      onStatusChange(String(demanda.id), newStatus);
    }
    setShowStatusPopover(false);
  }, [onStatusChange, demanda.id]);

  // Prazo diff
  let prazoDiff: number | null = null;
  let prazoText = demanda.prazo || "";
  if (demanda.prazo) {
    try {
      const parts = demanda.prazo.split("/").map(Number);
      if (parts.length === 3) {
        const [dd, mm, yy] = parts;
        const year = yy < 100 ? 2000 + yy : yy;
        const prazoDate = new Date(year, mm - 1, dd);
        prazoDiff = Math.ceil((prazoDate.getTime() - Date.now()) / 86400000);
      }
    } catch {
      // ignore
    }
  }

  const currentStatusKey = (demanda.substatus || demanda.status || "fila").toLowerCase().replace(/\s+/g, "_");

  return (
    <div
      draggable
      onClick={() => !isBeingDragged && onCardClick(demanda.id)}
      onDragStart={(e) => {
        e.dataTransfer.setData("demandaId", String(demanda.id));
        e.dataTransfer.effectAllowed = "move";
        onDragStart?.(String(demanda.id));
      }}
      onDragEnd={() => onDragEnd?.()}
      className={`
        relative group/kcard cursor-grab active:cursor-grabbing
        rounded-lg bg-white dark:bg-neutral-900
        border border-neutral-200/80 dark:border-neutral-800/80
        hover:shadow-md hover:shadow-neutral-200/50 dark:hover:shadow-black/20
        hover:border-emerald-300/50 dark:hover:border-emerald-700/40
        hover:-translate-y-[1px]
        transition-all duration-200
        overflow-hidden
        ${isBeingDragged ? "opacity-50 scale-[0.98] shadow-lg" : ""}
        ${prazoDiff !== null && prazoDiff < 0 ? "ring-1 ring-rose-300/40 dark:ring-rose-500/20 bg-rose-50/30 dark:bg-rose-950/10" : ""}
        ${prazoDiff !== null && prazoDiff >= 0 && prazoDiff <= 3 ? "ring-1 ring-amber-300/30 dark:ring-amber-500/15" : ""}
      `}
    >
      {/* Left bar — group color */}
      <div
        className="absolute left-0 top-0 bottom-0 w-1 rounded-l-lg"
        style={{ backgroundColor: groupColor }}
      />

      <div className="pl-4 pr-3 py-3">
        {/* Row 1: Nome + Flags */}
        <div className="flex items-center gap-2 mb-1">
          <p className="text-[13px] font-semibold text-neutral-900 dark:text-neutral-100 truncate flex-1 leading-tight">
            {demanda.assistido}
          </p>
          {isPreso && (
            <span className="flex items-center text-[8px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 px-1 py-0.5 rounded shrink-0">
              <Lock className="w-2.5 h-2.5" />
            </span>
          )}
          {isUrgente && (
            <span className="flex items-center text-[8px] font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/30 px-1 py-0.5 rounded shrink-0">
              <Flame className="w-2.5 h-2.5" />
            </span>
          )}
        </div>

        {/* Row 2: Ato */}
        <p className="text-[11px] text-neutral-500 dark:text-neutral-400 truncate mb-1">
          {demanda.ato}
        </p>

        {/* Row 3: Processo */}
        {processo && (
          <div className="flex items-center gap-1 mb-1">
            <span
              className="text-[11px] font-mono tabular-nums text-neutral-400 dark:text-neutral-500 truncate hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                copyToClipboard(processo);
              }}
              title="Copiar"
            >
              {processo}
            </span>
            <Copy className="w-2.5 h-2.5 text-neutral-300 dark:text-neutral-600 opacity-0 group-hover/kcard:opacity-100 transition-opacity shrink-0" />
          </div>
        )}

        {/* Row 4: Prazo + Status badge (clickable) */}
        <div className="flex items-center gap-1.5">
          {demanda.prazo && (
            <span
              className={`text-[11px] font-mono tabular-nums ${
                prazoDiff !== null && prazoDiff < 0
                  ? "text-rose-500 font-bold"
                  : prazoDiff !== null && prazoDiff <= 3
                    ? "text-amber-500 font-semibold"
                    : "text-neutral-400"
              }`}
            >
              {prazoDiff !== null && prazoDiff < 0 ? (
                <span className="flex items-center gap-0.5">
                  <Clock className="w-2.5 h-2.5" />
                  {Math.abs(prazoDiff)}d
                </span>
              ) : prazoDiff !== null && prazoDiff === 0 ? (
                <span className="flex items-center gap-0.5">
                  <Clock className="w-2.5 h-2.5" />
                  Hoje
                </span>
              ) : prazoDiff !== null && prazoDiff <= 7 ? (
                <span>{prazoDiff}d</span>
              ) : (
                prazoText
              )}
            </span>
          )}

          {/* Status badge — clickable for status change */}
          <button
            ref={badgeRef}
            onClick={handleBadgeClick}
            className={`
              ml-auto flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-md font-semibold whitespace-nowrap
              transition-all duration-150
              ${onStatusChange
                ? "hover:ring-1 hover:ring-emerald-300/60 dark:hover:ring-emerald-700/40 cursor-pointer"
                : "cursor-default"
              }
            `}
            style={{
              backgroundColor: `${groupColor}20`,
              color: groupColor,
            }}
            title={onStatusChange ? "Alterar status" : undefined}
          >
            {(() => {
              const statusKey = (demanda.substatus || demanda.status || "fila").toLowerCase().replace(/\s+/g, "_");
              const StatusIcon = statusCfg?.icon || STATUS_ICONS[statusKey] || ListTodo;
              return <StatusIcon className="w-3 h-3 shrink-0" />;
            })()}
            {statusDisplay}
            {onStatusChange && (
              <ChevronDown className="w-2.5 h-2.5 opacity-0 group-hover/kcard:opacity-70 transition-opacity" />
            )}
          </button>

          {/* Pipeline Selector */}
          {showStatusPopover && (
            <StatusPipelineSelector
              currentStatus={currentStatusKey}
              onSelect={handleStatusSelect}
              onClose={() => setShowStatusPopover(false)}
              variant="dropdown"
              anchorRef={badgeRef}
            />
          )}
        </div>

        {/* Delegation info */}
        {demanda.delegadoPara && (
          <div className="flex items-center gap-1 mt-1.5 pl-8">
            <span className="text-[9px] text-violet-500 dark:text-violet-400 font-medium truncate">
              → {demanda.delegadoPara}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// ==========================================
// COLUMN HEADER — Clean Linear-style
// ==========================================

function ColumnHeader({
  group,
  count,
  onToggleExpand,
  isExpanded,
}: {
  group: StatusGroup;
  count: number;
  onToggleExpand?: () => void;
  isExpanded?: boolean;
}) {
  const config = STATUS_GROUPS[group];
  if (!config) return null;
  const Icon = config.icon;
  const color = config.color;

  return (
    <div
      className={`
        flex items-center gap-2 px-3.5 py-2.5 rounded-lg min-h-[48px]
        bg-white dark:bg-neutral-900
        border border-neutral-200/80 dark:border-neutral-800/80
        ${onToggleExpand ? "cursor-pointer hover:border-neutral-300 dark:hover:border-neutral-700 transition-colors" : ""}
      `}
      style={{ borderBottomColor: `${color}40`, borderBottomWidth: 2 }}
      onClick={onToggleExpand}
    >
      <div
        className="w-2 h-2 rounded-full shrink-0"
        style={{ backgroundColor: color }}
      />
      <span style={{ color }}><Icon className="w-3.5 h-3.5 shrink-0" /></span>
      <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200 tracking-tight whitespace-nowrap">
        {config.label}
      </span>
      <span
        className="ml-auto text-[10px] font-mono font-bold tabular-nums px-1.5 py-0.5 rounded-md"
        style={{
          backgroundColor: `${color}15`,
          color,
        }}
      >
        {count}
      </span>
      {onToggleExpand && (
        isExpanded
          ? <ChevronLeft className="w-3.5 h-3.5 text-neutral-400 ml-0.5" />
          : <ChevronRight className="w-3.5 h-3.5 text-neutral-400 ml-0.5" />
      )}
    </div>
  );
}

// ==========================================
// SUB-GROUP COLUMN HEADER — Minimal
// ==========================================

function SubGroupHeader({
  group,
  count,
}: {
  group: EmAndamentoSubGroup;
  count: number;
}) {
  const config = SUB_GROUPS[group];
  if (!config) return null;
  const Icon = config.icon;
  const color = config.color;

  return (
    <div
      className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800/80"
      style={{ borderBottomColor: `${color}40`, borderBottomWidth: 2 }}
    >
      <div
        className="w-1.5 h-1.5 rounded-full shrink-0"
        style={{ backgroundColor: color }}
      />
      <span style={{ color }}><Icon className="w-3 h-3 shrink-0" /></span>
      <span className="text-[11px] font-bold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider truncate">
        {config.label}
      </span>
      <span
        className="ml-auto text-[9px] font-mono font-bold tabular-nums px-1 py-0.5 rounded"
        style={{
          backgroundColor: `${color}15`,
          color,
        }}
      >
        {count}
      </span>
    </div>
  );
}

// ==========================================
// EM ANDAMENTO EXPANDED — only non-empty
// ==========================================

function EmAndamentoExpanded({
  subGroupDemandas,
  onCardClick,
  onStatusChange,
  copyToClipboard,
  draggedDemandaId,
  onDragStart,
  onDragEnd,
}: {
  subGroupDemandas: Record<EmAndamentoSubGroup, KanbanDemanda[]>;
  onCardClick: (id: string | number) => void;
  onStatusChange?: (demandaId: string, newStatus: string) => void;
  copyToClipboard: (text: string) => void;
  draggedDemandaId?: string | null;
  onDragStart?: (id: string) => void;
  onDragEnd?: () => void;
}) {
  // Only show non-empty sub-groups
  const visibleSubGroups = (["preparacao", "diligencias", "saida"] as EmAndamentoSubGroup[])
    .filter((sg) => (subGroupDemandas[sg]?.length || 0) > 0);

  if (visibleSubGroups.length === 0) {
    return (
      <div className="flex items-center justify-center h-20 text-[10px] text-neutral-400 dark:text-neutral-600">
        Nenhuma demanda em andamento
      </div>
    );
  }

  return (
    <div
      className="grid gap-3"
      style={{
        gridTemplateColumns: `repeat(${visibleSubGroups.length}, 1fr)`,
      }}
    >
      {visibleSubGroups.map((sg) => {
        const items = subGroupDemandas[sg] || [];

        return (
          <div key={sg} className="flex flex-col min-w-0">
            <div className="mb-2">
              <SubGroupHeader group={sg} count={items.length} />
            </div>
            <div className="space-y-2.5 flex-1">
              {items.slice(0, 30).map((d) => (
                <KanbanCard
                  key={d.id}
                  demanda={d}
                  group={sg}
                  onCardClick={onCardClick}
                  onStatusChange={onStatusChange}
                  copyToClipboard={copyToClipboard}
                  isDragging={draggedDemandaId === String(d.id)}
                  onDragStart={onDragStart}
                  onDragEnd={onDragEnd}
                />
              ))}
              {items.length > 30 && (
                <p className="text-[10px] text-center text-neutral-400 py-2">
                  +{items.length - 30} mais
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ==========================================
// MAIN KANBAN PREMIUM
// ==========================================

// ==========================================
// MOBILE COLUMN TABS
// ==========================================

/** Tab bar labels by column */
const COLUMN_LABELS: Record<KanbanColumn, string> = {
  triagem: "Triagem",
  em_andamento: "Andamento",
  concluida: "Concluída",
  arquivado: "Arquivo",
};

function MobileColumnTabs({
  visibleColumns,
  activeColumn,
  onSelect,
  columnCounts,
}: {
  visibleColumns: KanbanColumn[];
  activeColumn: KanbanColumn;
  onSelect: (col: KanbanColumn) => void;
  columnCounts: Record<KanbanColumn, number>;
}) {
  return (
    <div className="flex items-center gap-1 overflow-x-auto scrollbar-none pb-1">
      {visibleColumns.map((col) => {
        const isActive = col === activeColumn;
        const color =
          col === "em_andamento"
            ? STATUS_GROUPS.preparacao.color
            : col === "triagem"
              ? STATUS_GROUPS.triagem.color
              : col === "concluida"
                ? STATUS_GROUPS.concluida.color
                : "#71717a";
        const count = columnCounts[col];

        return (
          <button
            key={col}
            onClick={() => onSelect(col)}
            className={`
              flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold whitespace-nowrap
              transition-all duration-200 cursor-pointer
              ${isActive
                ? "bg-white dark:bg-neutral-900 shadow-sm border border-neutral-200/80 dark:border-neutral-800/80"
                : "text-neutral-500 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800/50"
              }
            `}
            style={
              isActive
                ? { borderBottomColor: `${color}60`, borderBottomWidth: 2, color }
                : undefined
            }
          >
            {COLUMN_LABELS[col]}
            <span
              className="text-[9px] font-mono font-bold tabular-nums px-1 py-0.5 rounded"
              style={
                isActive
                  ? { backgroundColor: `${color}15`, color }
                  : { color: "inherit", opacity: 0.6 }
              }
            >
              {count}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function MobileSubGroupTabs({
  visibleSubGroups,
  activeSubGroup,
  onSelect,
  subGroupCounts,
}: {
  visibleSubGroups: EmAndamentoSubGroup[];
  activeSubGroup: EmAndamentoSubGroup;
  onSelect: (sg: EmAndamentoSubGroup) => void;
  subGroupCounts: Record<EmAndamentoSubGroup, number>;
}) {
  return (
    <div className="flex items-center gap-1 overflow-x-auto scrollbar-none">
      {visibleSubGroups.map((sg) => {
        const isActive = sg === activeSubGroup;
        const config = SUB_GROUPS[sg];
        const color = config.color;
        const Icon = config.icon;
        const count = subGroupCounts[sg];

        return (
          <button
            key={sg}
            onClick={() => onSelect(sg)}
            className={`
              flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider
              whitespace-nowrap transition-all duration-200 cursor-pointer
              ${isActive
                ? "bg-white dark:bg-neutral-900 shadow-sm border border-neutral-200/80 dark:border-neutral-800/80"
                : "text-neutral-400 dark:text-neutral-500 hover:bg-neutral-50 dark:hover:bg-neutral-800/50"
              }
            `}
            style={
              isActive
                ? { borderBottomColor: `${color}50`, borderBottomWidth: 2, color }
                : undefined
            }
          >
            <span style={{ color: isActive ? color : undefined }}>
              <Icon className="w-3 h-3 shrink-0" />
            </span>
            {config.label}
            <span
              className="text-[9px] font-mono font-bold tabular-nums px-1 py-0.5 rounded"
              style={
                isActive
                  ? { backgroundColor: `${color}15`, color }
                  : { color: "inherit", opacity: 0.5 }
              }
            >
              {count}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function MobileCardList({
  items,
  group,
  onCardClick,
  onStatusChange,
  copyToClipboard,
  draggedDemandaId,
  onDragStart,
  onDragEnd,
}: {
  items: KanbanDemanda[];
  group: StatusGroup;
  onCardClick: (id: string | number) => void;
  onStatusChange?: (demandaId: string, newStatus: string) => void;
  copyToClipboard: (text: string) => void;
  draggedDemandaId?: string | null;
  onDragStart?: (id: string) => void;
  onDragEnd?: () => void;
}) {
  if (items.length === 0) {
    return (
      <div className="flex items-center justify-center h-24 text-[10px] text-neutral-400 dark:text-neutral-600">
        Nenhuma demanda
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      {items.slice(0, 50).map((d) => (
        <KanbanCard
          key={d.id}
          demanda={d}
          group={group}
          onCardClick={onCardClick}
          onStatusChange={onStatusChange}
          copyToClipboard={copyToClipboard}
          isDragging={draggedDemandaId === String(d.id)}
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
        />
      ))}
      {items.length > 50 && (
        <p className="text-[10px] text-center text-neutral-400 py-2">
          +{items.length - 50} mais
        </p>
      )}
    </div>
  );
}

// ==========================================
// MAIN KANBAN PREMIUM
// ==========================================

export function KanbanPremium({
  demandas,
  onCardClick,
  onStatusChange,
  copyToClipboard,
  selectedAtribuicoes = [],
  showArchived = false,
}: KanbanPremiumProps) {
  const [emAndamentoExpanded, setEmAndamentoExpanded] = useState(false);

  // Drag state for column highlight
  const [draggedDemandaId, setDraggedDemandaId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);

  // Mobile states
  const [mobileActiveColumn, setMobileActiveColumn] = useState<KanbanColumn>("em_andamento");
  const [mobileActiveSubGroup, setMobileActiveSubGroup] = useState<EmAndamentoSubGroup>("preparacao");

  // Group demandas by kanban column & sub-group
  const {
    columnDemandas,
    subGroupDemandas,
    totalEmAndamento,
  } = useMemo(() => {
    const cols: Record<KanbanColumn, KanbanDemanda[]> = {
      triagem: [],
      em_andamento: [],
      concluida: [],
      arquivado: [],
    };
    const subs: Record<EmAndamentoSubGroup, KanbanDemanda[]> = {
      preparacao: [],
      diligencias: [],
      saida: [],
    };

    for (const d of demandas) {
      const rawKey = (d.substatus || d.status || "fila");
      const statusKey = rawKey.replace(/^\d+\s*-\s*/, "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "_");
      const statusCfg = getStatusConfig(statusKey);
      const group: StatusGroup = statusCfg.group;
      const column = GROUP_TO_COLUMN[group];

      if (column === "arquivado" && !showArchived) continue;

      cols[column].push(d);

      if (column === "em_andamento") {
        if (group === "preparacao") subs.preparacao.push(d);
        else if (group === "diligencias") subs.diligencias.push(d);
        else if (group === "saida") subs.saida.push(d);
        else subs.preparacao.push(d);
      }
    }

    return {
      columnDemandas: cols,
      subGroupDemandas: subs,
      totalEmAndamento: cols.em_andamento.length,
    };
  }, [demandas, showArchived]);

  // Count non-empty sub-groups for grid sizing
  const nonEmptySubGroupCount = useMemo(() => {
    return (["preparacao", "diligencias", "saida"] as EmAndamentoSubGroup[])
      .filter((sg) => (subGroupDemandas[sg]?.length || 0) > 0).length;
  }, [subGroupDemandas]);

  // Visible columns
  const visibleColumns = useMemo(() => {
    const cols: KanbanColumn[] = [];
    if (columnDemandas.triagem.length > 0) cols.push("triagem");
    cols.push("em_andamento");
    if (columnDemandas.concluida.length > 0) cols.push("concluida");
    if (showArchived && columnDemandas.arquivado.length > 0) cols.push("arquivado");
    return cols;
  }, [columnDemandas, showArchived]);

  // CSS Grid — balanced proportions
  const gridTemplate = useMemo(() => {
    return visibleColumns.map((col) => {
      if (col === "em_andamento") {
        // Expanded: proportional to non-empty sub-group count
        const expandedFr = Math.max(nonEmptySubGroupCount, 1);
        return emAndamentoExpanded ? `${expandedFr}fr` : "1fr";
      }
      return "1fr";
    }).join(" ");
  }, [visibleColumns, emAndamentoExpanded, nonEmptySubGroupCount]);

  // Mobile: non-empty sub-groups
  const mobileVisibleSubGroups = useMemo(() => {
    return (["preparacao", "diligencias", "saida"] as EmAndamentoSubGroup[])
      .filter((sg) => (subGroupDemandas[sg]?.length || 0) > 0);
  }, [subGroupDemandas]);

  // Mobile: column counts
  const columnCounts = useMemo(() => ({
    triagem: columnDemandas.triagem.length,
    em_andamento: totalEmAndamento,
    concluida: columnDemandas.concluida.length,
    arquivado: columnDemandas.arquivado.length,
  }), [columnDemandas, totalEmAndamento]);

  // Mobile: sub-group counts
  const subGroupCounts = useMemo(() => ({
    preparacao: subGroupDemandas.preparacao.length,
    diligencias: subGroupDemandas.diligencias.length,
    saida: subGroupDemandas.saida.length,
  }), [subGroupDemandas]);

  // Ensure mobileActiveSubGroup is valid when sub-groups change
  useEffect(() => {
    if (
      mobileActiveColumn === "em_andamento" &&
      mobileVisibleSubGroups.length > 0 &&
      !mobileVisibleSubGroups.includes(mobileActiveSubGroup)
    ) {
      setMobileActiveSubGroup(mobileVisibleSubGroups[0]);
    }
  }, [mobileActiveColumn, mobileVisibleSubGroups, mobileActiveSubGroup]);

  // Mobile: get cards for current active column/sub-group
  const mobileCards = useMemo(() => {
    if (mobileActiveColumn === "em_andamento") {
      return subGroupDemandas[mobileActiveSubGroup] || [];
    }
    return columnDemandas[mobileActiveColumn] || [];
  }, [mobileActiveColumn, mobileActiveSubGroup, columnDemandas, subGroupDemandas]);

  // Mobile: resolve group key for card coloring
  const mobileGroupKey: StatusGroup = useMemo(() => {
    if (mobileActiveColumn === "em_andamento") return mobileActiveSubGroup;
    return mobileActiveColumn as StatusGroup;
  }, [mobileActiveColumn, mobileActiveSubGroup]);

  return (
    <div className="space-y-2">
      {/* ===================== MOBILE LAYOUT ===================== */}
      <div className="block sm:hidden space-y-3">
        {/* Column tabs */}
        <MobileColumnTabs
          visibleColumns={visibleColumns}
          activeColumn={mobileActiveColumn}
          onSelect={setMobileActiveColumn}
          columnCounts={columnCounts}
        />

        {/* Sub-group tabs (Em Andamento only) */}
        {mobileActiveColumn === "em_andamento" && mobileVisibleSubGroups.length > 1 && (
          <MobileSubGroupTabs
            visibleSubGroups={mobileVisibleSubGroups}
            activeSubGroup={mobileActiveSubGroup}
            onSelect={setMobileActiveSubGroup}
            subGroupCounts={subGroupCounts}
          />
        )}

        {/* Cards */}
        <MobileCardList
          items={mobileCards}
          group={mobileGroupKey}
          onCardClick={onCardClick}
          onStatusChange={onStatusChange}
          copyToClipboard={copyToClipboard}
          draggedDemandaId={draggedDemandaId}
          onDragStart={setDraggedDemandaId}
          onDragEnd={() => { setDraggedDemandaId(null); setDragOverColumn(null); }}
        />

        {/* Archived count (mobile) */}
        {!showArchived && columnDemandas.arquivado.length > 0 && (
          <div className="flex items-center justify-center gap-2 py-2 text-[10px] text-neutral-400 dark:text-neutral-600">
            <Archive className="w-3 h-3" />
            <span>
              {columnDemandas.arquivado.length} arquivada{columnDemandas.arquivado.length !== 1 ? "s" : ""}
            </span>
          </div>
        )}
      </div>

      {/* ===================== DESKTOP LAYOUT ===================== */}
      <div className="hidden sm:block">
        {/* Kanban Grid */}
        <div
          className="grid gap-4 transition-all duration-500 ease-out overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-neutral-200 dark:scrollbar-thumb-neutral-700"
          style={{
            gridTemplateColumns: gridTemplate,
            minWidth: emAndamentoExpanded ? `${Math.max(600, nonEmptySubGroupCount * 240 + 400)}px` : undefined,
            alignItems: "start",
          }}
        >
          {visibleColumns.map((col) => {
            const items = columnDemandas[col];
            const isDropTarget = dragOverColumn === col && draggedDemandaId !== null;

            if (col === "em_andamento") {
              return (
                <div
                  key={col}
                  className={`flex flex-col min-w-0 rounded-xl transition-all duration-200 ${isDropTarget ? "bg-emerald-50/50 dark:bg-emerald-950/20 ring-2 ring-dashed ring-emerald-400 ring-offset-1" : ""}`}
                  onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; setDragOverColumn(col); }}
                  onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOverColumn(null); }}
                  onDrop={(e) => {
                    e.preventDefault();
                    const id = e.dataTransfer.getData("demandaId");
                    if (id && onStatusChange) onStatusChange(id, "elaborar");
                    setDragOverColumn(null);
                  }}
                >
                  {/* Em Andamento header */}
                  <div className="mb-2">
                    <div
                      className="
                        flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer min-h-[44px]
                        bg-white dark:bg-neutral-900
                        border border-neutral-200/80 dark:border-neutral-800/80
                        hover:border-neutral-300 dark:hover:border-neutral-700
                        transition-colors duration-200
                      "
                      style={{ borderBottomColor: `${STATUS_GROUPS.preparacao.color}30`, borderBottomWidth: 2 }}
                      onClick={() => setEmAndamentoExpanded((p) => !p)}
                    >
                      <Activity className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400 shrink-0" />
                      <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200 tracking-tight whitespace-nowrap">
                        Em Andamento
                      </span>
                      {/* Spacer for layout */}
                      <span
                        className="ml-auto text-[10px] font-mono font-bold tabular-nums px-1.5 py-0.5 rounded-md"
                        style={{
                          backgroundColor: `${STATUS_GROUPS.preparacao.color}15`,
                          color: STATUS_GROUPS.preparacao.color,
                        }}
                      >
                        {totalEmAndamento}
                      </span>
                      {emAndamentoExpanded
                        ? <ChevronLeft className="w-3.5 h-3.5 text-neutral-400 ml-0.5" />
                        : <ChevronRight className="w-3.5 h-3.5 text-neutral-400 ml-0.5" />
                      }
                    </div>
                  </div>

                  {/* Content: expanded or collapsed */}
                  {emAndamentoExpanded ? (
                    <EmAndamentoExpanded
                      subGroupDemandas={subGroupDemandas}
                      onCardClick={onCardClick}
                      onStatusChange={onStatusChange}
                      copyToClipboard={copyToClipboard}
                      draggedDemandaId={draggedDemandaId}
                      onDragStart={setDraggedDemandaId}
                      onDragEnd={() => { setDraggedDemandaId(null); setDragOverColumn(null); }}
                    />
                  ) : (
                    <div className="space-y-2.5 flex-1">
                      {items.slice(0, 30).map((d) => {
                        const rawKey2 = (d.substatus || d.status || "fila");
                        const statusKey = rawKey2.replace(/^\d+\s*-\s*/, "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "_");
                        const sCfg = getStatusConfig(statusKey);
                        return (
                          <KanbanCard
                            key={d.id}
                            demanda={d}
                            group={sCfg.group as StatusGroup}
                            onCardClick={onCardClick}
                            onStatusChange={onStatusChange}
                            copyToClipboard={copyToClipboard}
                            isDragging={draggedDemandaId === String(d.id)}
                            onDragStart={setDraggedDemandaId}
                            onDragEnd={() => { setDraggedDemandaId(null); setDragOverColumn(null); }}
                          />
                        );
                      })}
                      {items.length > 30 && (
                        <p className="text-[10px] text-center text-neutral-400 py-2">
                          +{items.length - 30} mais
                        </p>
                      )}
                      {items.length === 0 && (
                        <div className="flex items-center justify-center py-8 text-neutral-300 dark:text-neutral-600 text-xs">
                          Nenhuma demanda
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            }

            // Regular columns
            const groupKey = col as StatusGroup;
            // Map column to a representative status for onStatusChange drop
            const colDropStatus: Record<string, string> = {
              triagem: "fila",
              concluida: "protocolado",
              arquivado: "arquivado",
            };
            const isRegularDropTarget = dragOverColumn === col && draggedDemandaId !== null;
            return (
              <div
                key={col}
                className={`flex flex-col min-w-0 rounded-xl transition-all duration-200 ${isRegularDropTarget ? "bg-emerald-50/50 dark:bg-emerald-950/20 ring-2 ring-dashed ring-emerald-400 ring-offset-1" : ""}`}
                onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; setDragOverColumn(col); }}
                onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOverColumn(null); }}
                onDrop={(e) => {
                  e.preventDefault();
                  const id = e.dataTransfer.getData("demandaId");
                  if (id && onStatusChange) onStatusChange(id, colDropStatus[col] || "fila");
                  setDragOverColumn(null);
                }}
              >
                <div className="mb-2">
                  <ColumnHeader group={groupKey} count={items.length} />
                </div>
                <div className="space-y-2.5 flex-1">
                  {items.slice(0, 30).map((d) => (
                    <KanbanCard
                      key={d.id}
                      demanda={d}
                      group={groupKey}
                      onCardClick={onCardClick}
                      onStatusChange={onStatusChange}
                      copyToClipboard={copyToClipboard}
                      isDragging={draggedDemandaId === String(d.id)}
                      onDragStart={setDraggedDemandaId}
                      onDragEnd={() => { setDraggedDemandaId(null); setDragOverColumn(null); }}
                    />
                  ))}
                  {items.length > 30 && (
                    <p className="text-[10px] text-center text-neutral-400 py-2">
                      +{items.length - 30} mais
                    </p>
                  )}
                  {items.length === 0 && (
                    <div className="flex items-center justify-center h-20 text-[10px] text-neutral-400 dark:text-neutral-600">
                      Nenhuma demanda
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Archived count (desktop) */}
        {!showArchived && columnDemandas.arquivado.length > 0 && (
          <div className="flex items-center justify-center gap-2 py-2 text-[10px] text-neutral-400 dark:text-neutral-600">
            <Archive className="w-3 h-3" />
            <span>
              {columnDemandas.arquivado.length} demanda{columnDemandas.arquivado.length !== 1 ? "s" : ""} arquivada{columnDemandas.arquivado.length !== 1 ? "s" : ""}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
