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
  CheckCircle2,
} from "lucide-react";
import {
  KANBAN_COLUMNS,
  SUB_GROUPS,
  STATUS_GROUPS,
  GROUP_TO_COLUMN,
  DEMANDA_STATUS,
  STATUS_OPTIONS_BY_COLUMN,
  getStatusConfig,
  type KanbanColumn,
  type EmAndamentoSubGroup,
  type StatusGroup,
} from "@/config/demanda-status";
import { createPortal } from "react-dom";

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

// ==========================================
// STATUS CHANGE POPOVER
// ==========================================

function StatusChangePopover({
  currentStatus,
  currentGroup,
  anchorRect,
  onSelect,
  onClose,
}: {
  currentStatus: string;
  currentGroup: StatusGroup;
  anchorRect: DOMRect;
  onSelect: (newStatus: string) => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  // Close on click-outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  // Close on escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  // Position: appear below the badge, aligned right
  const top = anchorRect.bottom + 4;
  const right = window.innerWidth - anchorRect.right;

  // Group options by StatusGroup
  const grouped = useMemo(() => {
    const groups: { group: StatusGroup; label: string; color: string; options: { value: string; label: string }[] }[] = [];
    const groupOrder: StatusGroup[] = ["triagem", "preparacao", "diligencias", "saida", "concluida"];

    for (const g of groupOrder) {
      const cfg = STATUS_GROUPS[g];
      const opts = Object.entries(DEMANDA_STATUS)
        .filter(([, v]) => v.group === g)
        .map(([key, v]) => ({ value: key, label: v.label }));
      if (opts.length > 0) {
        groups.push({ group: g, label: cfg.label, color: cfg.color, options: opts });
      }
    }
    return groups;
  }, []);

  return createPortal(
    <div
      ref={ref}
      className="fixed z-[9999] w-52 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-700 shadow-xl shadow-black/10 dark:shadow-black/40 overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150"
      style={{ top, right }}
    >
      {/* Header */}
      <div className="px-3 py-2 border-b border-zinc-100 dark:border-zinc-800">
        <p className="text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
          Alterar status
        </p>
      </div>

      {/* Options */}
      <div className="max-h-[320px] overflow-y-auto py-1 scrollbar-thin scrollbar-thumb-zinc-200 dark:scrollbar-thumb-zinc-700">
        {grouped.map((g, gi) => (
          <div key={g.group}>
            {gi > 0 && (
              <div className="mx-3 my-1 border-t border-zinc-100 dark:border-zinc-800" />
            )}
            {/* Group label */}
            <div className="flex items-center gap-1.5 px-3 py-1.5">
              <div
                className="w-1.5 h-1.5 rounded-full shrink-0"
                style={{ backgroundColor: g.color }}
              />
              <span className="text-[9px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
                {g.label}
              </span>
            </div>
            {/* Status items */}
            {g.options.map((opt) => {
              const isActive = opt.value === currentStatus;
              const Icon = DEMANDA_STATUS[opt.value]?.icon;
              return (
                <button
                  key={opt.value}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelect(opt.value);
                  }}
                  className={`
                    w-full px-3 py-1.5 flex items-center gap-2 text-left
                    transition-colors duration-100
                    ${isActive
                      ? "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400"
                      : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800/60"
                    }
                  `}
                >
                  {Icon && (
                    <span style={{ color: isActive ? undefined : g.color }}>
                      <Icon className="w-3 h-3 shrink-0" />
                    </span>
                  )}
                  <span className="text-[11px] font-medium flex-1 truncate">
                    {opt.label}
                  </span>
                  {isActive && (
                    <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>,
    document.body
  );
}

// ==========================================
// CARD COMPONENT
// ==========================================

function KanbanCard({
  demanda,
  group,
  onCardClick,
  onStatusChange,
  copyToClipboard,
}: {
  demanda: KanbanDemanda;
  group: StatusGroup;
  onCardClick: (id: string | number) => void;
  onStatusChange?: (demandaId: string, newStatus: string) => void;
  copyToClipboard: (text: string) => void;
}) {
  const statusCfg = getStatusConfig(demanda.substatus || demanda.status);
  const processo = demanda.processos?.[0]?.numero || "";
  const isUrgente = demanda.prioridade === "URGENTE" || demanda.prioridade === "REU_PRESO";
  const isPreso = demanda.estadoPrisional === "preso" || demanda.reuPreso;
  const groupColor = STATUS_GROUPS[group]?.color || "#A1A1AA";

  // Status popover state
  const [showStatusPopover, setShowStatusPopover] = useState(false);
  const badgeRef = useRef<HTMLButtonElement>(null);
  const [badgeRect, setBadgeRect] = useState<DOMRect | null>(null);

  const handleBadgeClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onStatusChange) return;
    const rect = badgeRef.current?.getBoundingClientRect();
    if (rect) {
      setBadgeRect(rect);
      setShowStatusPopover(true);
    }
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

  // Initials
  const initials = demanda.assistido
    ?.split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("") || "?";

  const currentStatusKey = (demanda.substatus || demanda.status || "fila").toLowerCase().replace(/\s+/g, "_");

  return (
    <div
      onClick={() => onCardClick(demanda.id)}
      className="
        relative group/kcard cursor-pointer
        rounded-lg bg-white dark:bg-zinc-900
        border border-zinc-200/80 dark:border-zinc-800/80
        hover:shadow-md hover:shadow-zinc-200/50 dark:hover:shadow-black/20
        hover:border-emerald-300/50 dark:hover:border-emerald-700/40
        hover:-translate-y-[1px]
        transition-all duration-200
        overflow-hidden
      "
    >
      {/* Left bar — group color */}
      <div
        className="absolute left-0 top-0 bottom-0 w-[3px] rounded-l-lg"
        style={{ backgroundColor: groupColor }}
      />

      <div className="pl-3.5 pr-2.5 py-2.5">
        {/* Row 1: Avatar + Nome + Flags */}
        <div className="flex items-center gap-2 mb-1">
          <div
            className="w-6 h-6 rounded-md flex items-center justify-center text-[9px] font-bold shrink-0"
            style={{
              backgroundColor: `${groupColor}18`,
              color: groupColor,
            }}
          >
            {initials}
          </div>
          <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 truncate flex-1 leading-tight">
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
        <p className="text-[10px] text-zinc-500 dark:text-zinc-400 truncate mb-1 pl-8">
          {demanda.ato}
        </p>

        {/* Row 3: Processo */}
        {processo && (
          <div className="flex items-center gap-1 mb-1 pl-8">
            <span
              className="text-[10px] font-mono tabular-nums text-zinc-400 dark:text-zinc-500 truncate hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                copyToClipboard(processo);
              }}
              title="Copiar"
            >
              {processo}
            </span>
            <Copy className="w-2.5 h-2.5 text-zinc-300 dark:text-zinc-600 opacity-0 group-hover/kcard:opacity-100 transition-opacity shrink-0" />
          </div>
        )}

        {/* Row 4: Prazo + Status badge (clickable) */}
        <div className="flex items-center gap-1.5 pl-8">
          {demanda.prazo && (
            <span
              className={`text-[10px] font-mono tabular-nums ${
                prazoDiff !== null && prazoDiff < 0
                  ? "text-rose-500 font-bold"
                  : prazoDiff !== null && prazoDiff <= 3
                    ? "text-amber-500 font-semibold"
                    : "text-zinc-400"
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
              ml-auto flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded-md font-semibold whitespace-nowrap
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
            {statusCfg?.label || demanda.status}
            {onStatusChange && (
              <ChevronDown className="w-2.5 h-2.5 opacity-0 group-hover/kcard:opacity-70 transition-opacity" />
            )}
          </button>

          {/* Popover */}
          {showStatusPopover && badgeRect && (
            <StatusChangePopover
              currentStatus={currentStatusKey}
              currentGroup={group}
              anchorRect={badgeRect}
              onSelect={handleStatusSelect}
              onClose={() => setShowStatusPopover(false)}
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
        flex items-center gap-2 px-3 py-2 rounded-lg
        bg-white dark:bg-zinc-900
        border border-zinc-200/80 dark:border-zinc-800/80
        ${onToggleExpand ? "cursor-pointer hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors" : ""}
      `}
      style={{ borderBottomColor: `${color}40`, borderBottomWidth: 2 }}
      onClick={onToggleExpand}
    >
      <div
        className="w-2 h-2 rounded-full shrink-0"
        style={{ backgroundColor: color }}
      />
      <span style={{ color }}><Icon className="w-3.5 h-3.5 shrink-0" /></span>
      <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200 tracking-tight">
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
          ? <ChevronLeft className="w-3.5 h-3.5 text-zinc-400 ml-0.5" />
          : <ChevronRight className="w-3.5 h-3.5 text-zinc-400 ml-0.5" />
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
      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80"
      style={{ borderBottomColor: `${color}40`, borderBottomWidth: 2 }}
    >
      <div
        className="w-1.5 h-1.5 rounded-full shrink-0"
        style={{ backgroundColor: color }}
      />
      <span style={{ color }}><Icon className="w-3 h-3 shrink-0" /></span>
      <span className="text-[10px] font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider truncate">
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
}: {
  subGroupDemandas: Record<EmAndamentoSubGroup, KanbanDemanda[]>;
  onCardClick: (id: string | number) => void;
  onStatusChange?: (demandaId: string, newStatus: string) => void;
  copyToClipboard: (text: string) => void;
}) {
  // Only show non-empty sub-groups
  const visibleSubGroups = (["preparacao", "diligencias", "saida"] as EmAndamentoSubGroup[])
    .filter((sg) => (subGroupDemandas[sg]?.length || 0) > 0);

  if (visibleSubGroups.length === 0) {
    return (
      <div className="flex items-center justify-center h-20 text-[10px] text-zinc-400 dark:text-zinc-600">
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
            <div className="space-y-2 flex-1">
              {items.slice(0, 30).map((d) => (
                <KanbanCard
                  key={d.id}
                  demanda={d}
                  group={sg}
                  onCardClick={onCardClick}
                  onStatusChange={onStatusChange}
                  copyToClipboard={copyToClipboard}
                />
              ))}
              {items.length > 30 && (
                <p className="text-[10px] text-center text-zinc-400 py-2">
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
                ? "bg-white dark:bg-zinc-900 shadow-sm border border-zinc-200/80 dark:border-zinc-800/80"
                : "text-zinc-500 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
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
                ? "bg-white dark:bg-zinc-900 shadow-sm border border-zinc-200/80 dark:border-zinc-800/80"
                : "text-zinc-400 dark:text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
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
}: {
  items: KanbanDemanda[];
  group: StatusGroup;
  onCardClick: (id: string | number) => void;
  onStatusChange?: (demandaId: string, newStatus: string) => void;
  copyToClipboard: (text: string) => void;
}) {
  if (items.length === 0) {
    return (
      <div className="flex items-center justify-center h-24 text-[10px] text-zinc-400 dark:text-zinc-600">
        Nenhuma demanda
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {items.slice(0, 50).map((d) => (
        <KanbanCard
          key={d.id}
          demanda={d}
          group={group}
          onCardClick={onCardClick}
          onStatusChange={onStatusChange}
          copyToClipboard={copyToClipboard}
        />
      ))}
      {items.length > 50 && (
        <p className="text-[10px] text-center text-zinc-400 py-2">
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
      const statusKey = (d.substatus || d.status || "fila").toLowerCase().replace(/\s+/g, "_");
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
        />

        {/* Archived count (mobile) */}
        {!showArchived && columnDemandas.arquivado.length > 0 && (
          <div className="flex items-center justify-center gap-2 py-2 text-[10px] text-zinc-400 dark:text-zinc-600">
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
          className="grid gap-4 transition-all duration-500 ease-out overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-zinc-200 dark:scrollbar-thumb-zinc-700"
          style={{
            gridTemplateColumns: gridTemplate,
            minWidth: emAndamentoExpanded ? `${Math.max(600, nonEmptySubGroupCount * 240 + 400)}px` : undefined,
            alignItems: "start",
          }}
        >
          {visibleColumns.map((col) => {
            const items = columnDemandas[col];

            if (col === "em_andamento") {
              return (
                <div key={col} className="flex flex-col min-w-0">
                  {/* Em Andamento header */}
                  <div className="mb-2">
                    <div
                      className="
                        flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer
                        bg-white dark:bg-zinc-900
                        border border-zinc-200/80 dark:border-zinc-800/80
                        hover:border-zinc-300 dark:hover:border-zinc-700
                        transition-colors duration-200
                      "
                      style={{ borderBottomColor: `${STATUS_GROUPS.preparacao.color}30`, borderBottomWidth: 2 }}
                      onClick={() => setEmAndamentoExpanded((p) => !p)}
                    >
                      <Activity className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400 shrink-0" />
                      <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200 tracking-tight">
                        Em Andamento
                      </span>
                      {/* Sub-group mini counts (collapsed only) */}
                      {!emAndamentoExpanded && (
                        <div className="flex items-center gap-1 ml-1">
                          {(["preparacao", "diligencias", "saida"] as EmAndamentoSubGroup[]).map((sg) => {
                            const count = subGroupDemandas[sg].length;
                            if (count === 0) return null;
                            return (
                              <span
                                key={sg}
                                className="text-[8px] font-mono font-bold px-1 py-0.5 rounded"
                                style={{
                                  backgroundColor: `${SUB_GROUPS[sg].color}15`,
                                  color: SUB_GROUPS[sg].color,
                                }}
                                title={SUB_GROUPS[sg].label}
                              >
                                {count}
                              </span>
                            );
                          })}
                        </div>
                      )}
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
                        ? <ChevronLeft className="w-3.5 h-3.5 text-zinc-400 ml-0.5" />
                        : <ChevronRight className="w-3.5 h-3.5 text-zinc-400 ml-0.5" />
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
                    />
                  ) : (
                    <div className="space-y-2 flex-1">
                      {items.slice(0, 30).map((d) => {
                        const statusKey = (d.substatus || d.status || "fila").toLowerCase().replace(/\s+/g, "_");
                        const sCfg = getStatusConfig(statusKey);
                        return (
                          <KanbanCard
                            key={d.id}
                            demanda={d}
                            group={sCfg.group as StatusGroup}
                            onCardClick={onCardClick}
                            onStatusChange={onStatusChange}
                            copyToClipboard={copyToClipboard}
                          />
                        );
                      })}
                      {items.length > 30 && (
                        <p className="text-[10px] text-center text-zinc-400 py-2">
                          +{items.length - 30} mais
                        </p>
                      )}
                      {items.length === 0 && (
                        <div className="flex items-center justify-center h-20 text-[10px] text-zinc-400 dark:text-zinc-600">
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
            return (
              <div key={col} className="flex flex-col min-w-0">
                <div className="mb-2">
                  <ColumnHeader group={groupKey} count={items.length} />
                </div>
                <div className="space-y-2 flex-1">
                  {items.slice(0, 30).map((d) => (
                    <KanbanCard
                      key={d.id}
                      demanda={d}
                      group={groupKey}
                      onCardClick={onCardClick}
                      onStatusChange={onStatusChange}
                      copyToClipboard={copyToClipboard}
                    />
                  ))}
                  {items.length > 30 && (
                    <p className="text-[10px] text-center text-zinc-400 py-2">
                      +{items.length - 30} mais
                    </p>
                  )}
                  {items.length === 0 && (
                    <div className="flex items-center justify-center h-20 text-[10px] text-zinc-400 dark:text-zinc-600">
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
          <div className="flex items-center justify-center gap-2 py-2 text-[10px] text-zinc-400 dark:text-zinc-600">
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
