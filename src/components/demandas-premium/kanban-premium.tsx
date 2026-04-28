"use client";

import React, { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import {
  getAtoRelevanceRank,
  getAtoCategory,
  ATO_CATEGORIES,
  type AtoCategory,
} from "@/lib/utils/ato-rank";
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
  CloudOff,
} from "lucide-react";
import {
  KANBAN_COLUMNS,
  SUB_GROUPS,
  SUB_GROUP_SECTIONS,
  STATUS_GROUPS,
  GROUP_TO_COLUMN,
  getStatusConfig,
  type KanbanColumn,
  type EmAndamentoSubGroup,
  type StatusGroup,
} from "@/config/demanda-status";
import { StatusPipelineSelector } from "./StatusPipelineSelector";
import { ATRIBUICAO_COLORS } from "./AtribuicaoPills";
import { EventLine, type EventoLine } from "@/components/demanda-eventos/event-line";
import { trpc } from "@/lib/trpc/client";

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
  providenciaResumo?: string | null;
  lastEvento?: EventoLine | null;
  pendenteEvento?: EventoLine | null;
  data?: string | null;
  updatedAt?: string | null;
  syncedAt?: string | null;
  [key: string]: unknown;
}

interface KanbanPremiumProps {
  demandas: KanbanDemanda[];
  onCardClick: (id: string | number) => void;
  /**
   * Opens the dedicated events drawer (timeline of user-facing events:
   * atendimento / diligência / observação). When provided, the inline
   * "Ver todos →" button on the card preview will trigger this instead of
   * opening the QuickPreview side-sheet (legacy fallback).
   */
  onOpenEventsDrawer?: (demandaId: number) => void;
  onStatusChange?: (demandaId: string, newStatus: string) => void;
  copyToClipboard: (text: string) => void;
  selectedAtribuicoes?: string[];
  showArchived?: boolean;
}

// StatusChangePopover replaced by StatusPipelineSelector

// ==========================================
// AGRUPAMENTO POR CATEGORIA DE ATO
// ==========================================

/**
 * Renderiza uma lista de demandas agrupada por categoria de ato (urgentes →
 * recursos → liberdade → ... → ciências → outros), com headers minúsculos
 * entre os grupos. Quando há apenas 1 categoria na lista, os headers são
 * omitidos (degrade gracioso). Categorias menos críticas (Ciências, Outros)
 * começam colapsadas.
 *
 * Espera que `items` já venha ordenado pelo sort global do Kanban — esse
 * componente apenas insere os divisores visuais.
 */
function GroupedByAtoList({
  items,
  renderCard,
  storageKey,
  enabled = true,
}: {
  items: KanbanDemanda[];
  renderCard: (d: KanbanDemanda) => React.ReactNode;
  /** Chave única para persistir colapso por coluna em localStorage */
  storageKey: string;
  enabled?: boolean;
}) {
  // Agrupa por categoria preservando a ordem de chegada (já vem ordenada)
  const groups = useMemo(() => {
    const map = new Map<AtoCategory, KanbanDemanda[]>();
    for (const d of items) {
      const cat = getAtoCategory(d.ato);
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(d);
    }
    // Ordena as categorias pela order do meta
    return Array.from(map.entries()).sort(
      ([a], [b]) => ATO_CATEGORIES[a].order - ATO_CATEGORIES[b].order,
    );
  }, [items]);

  const [collapsed, setCollapsed] = useState<Set<AtoCategory>>(() => {
    if (typeof window === "undefined") {
      return new Set(
        Object.values(ATO_CATEGORIES)
          .filter((m) => m.collapsedByDefault)
          .map((m) => m.key),
      );
    }
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) return new Set(JSON.parse(raw) as AtoCategory[]);
    } catch {
      // ignore
    }
    return new Set(
      Object.values(ATO_CATEGORIES)
        .filter((m) => m.collapsedByDefault)
        .map((m) => m.key),
    );
  });

  const toggle = useCallback(
    (cat: AtoCategory) => {
      setCollapsed((prev) => {
        const next = new Set(prev);
        if (next.has(cat)) next.delete(cat);
        else next.add(cat);
        try {
          localStorage.setItem(storageKey, JSON.stringify(Array.from(next)));
        } catch {
          // ignore
        }
        return next;
      });
    },
    [storageKey],
  );

  // Se desabilitado ou só 1 categoria, render flat (sem headers)
  if (!enabled || groups.length <= 1) {
    return <>{items.map(renderCard)}</>;
  }

  return (
    <>
      {groups.map(([cat, list]) => {
        const meta = ATO_CATEGORIES[cat];
        const isCollapsed = collapsed.has(cat);
        return (
          <div key={cat} className="space-y-2">
            <button
              type="button"
              onClick={() => toggle(cat)}
              className="
                w-full flex items-center gap-1.5 pt-1 pb-0.5 cursor-pointer
                text-neutral-500 dark:text-neutral-400
                hover:text-neutral-700 dark:hover:text-neutral-200
                transition-colors duration-150 group/grouphdr
              "
            >
              <ChevronDown
                className={cn(
                  "w-2.5 h-2.5 shrink-0 transition-transform duration-200",
                  isCollapsed && "-rotate-90",
                )}
              />
              <span className="text-[9px] font-bold uppercase tracking-wider">
                {meta.label}
              </span>
              <span
                className="ml-auto text-[9px] font-mono tabular-nums opacity-70"
                aria-label={`${list.length} demandas`}
              >
                {list.length}
              </span>
            </button>
            {!isCollapsed && (
              <div className="space-y-2">
                {list.map(renderCard)}
              </div>
            )}
          </div>
        );
      })}
    </>
  );
}

// ==========================================
// CARD COMPONENT
// ==========================================

function KanbanCard({
  demanda,
  group,
  onCardClick,
  onOpenEventsDrawer,
  onStatusChange,
  copyToClipboard,
  isDragging: isBeingDragged,
  onDragStart,
  onDragEnd,
  showAtribBadge = false,
}: {
  demanda: KanbanDemanda;
  group: StatusGroup;
  onCardClick: (id: string | number) => void;
  onOpenEventsDrawer?: (demandaId: number) => void;
  onStatusChange?: (demandaId: string, newStatus: string) => void;
  copyToClipboard: (text: string) => void;
  isDragging?: boolean;
  onDragStart?: (id: string) => void;
  onDragEnd?: () => void;
  showAtribBadge?: boolean;
}) {
  const rawStatus = demanda.substatus || demanda.status || "triagem";
  const statusCfg = getStatusConfig(rawStatus);
  // Strip numeric prefix (e.g. "2 - Elaborar" → "Elaborar") — numeração é só pra planilha
  const statusDisplay = statusCfg?.label || rawStatus.replace(/^\d+\s*-\s*/, "");
  const processo = demanda.processos?.[0]?.numero || "";
  const isUrgente = demanda.prioridade === "URGENTE" || demanda.prioridade === "REU_PRESO";
  const isPreso = demanda.estadoPrisional === "preso" || demanda.reuPreso;
  const groupColor = STATUS_GROUPS[group]?.color || "#A1A1AA";

  // Status popover state
  const [showStatusPopover, setShowStatusPopover] = useState(false);
  const badgeRef = useRef<HTMLButtonElement>(null);

  // Inline expand state (timeline preview)
  const [expanded, setExpanded] = useState(false);
  const { data: timelineData } = trpc.demandaEventos.list.useQuery(
    { demandaId: Number(demanda.id), limit: 4 },
    { enabled: expanded, staleTime: 10_000 },
  );

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

  const currentStatusKey = (demanda.substatus || demanda.status || "triagem").toLowerCase().replace(/\s+/g, "_");

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
        rounded-xl bg-white dark:bg-neutral-900
        border-[1.5px]
        shadow-sm shadow-black/[0.04]
        hover:shadow-md hover:shadow-black/[0.08] dark:hover:shadow-black/20
        hover:-translate-y-0.5
        transition-all duration-200
        overflow-hidden
        ${isBeingDragged ? "opacity-50 scale-[0.98] shadow-lg" : ""}
        ${prazoDiff !== null && prazoDiff < 0 ? "ring-1 ring-rose-300/40 dark:ring-rose-500/20" : ""}
        ${prazoDiff !== null && prazoDiff >= 0 && prazoDiff <= 3 ? "ring-1 ring-amber-300/30 dark:ring-amber-500/15" : ""}
      `}
      style={{ borderColor: `${groupColor}60` }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = `${groupColor}aa`; e.currentTarget.style.boxShadow = `0 2px 12px ${groupColor}18, 0 0 0 1px ${groupColor}12`; }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = `${groupColor}60`; e.currentTarget.style.boxShadow = ''; }}
    >
      <div className="px-3 py-2.5">
        {/* Row 1: Nome + Flags */}
        <div className="flex items-start gap-1.5 mb-0.5">
          <p className="text-[12px] font-semibold text-neutral-900 dark:text-neutral-100 flex-1 leading-tight line-clamp-2">
            {demanda.assistido}
          </p>
          {isPreso && (
            <Lock className="w-2.5 h-2.5 text-amber-500 shrink-0" />
          )}
          {isUrgente && (
            <Flame className="w-2.5 h-2.5 text-rose-500 shrink-0" />
          )}
          {showAtribBadge && demanda.atribuicao && (() => {
            const atribColor = ATRIBUICAO_COLORS[demanda.atribuicao as string] || "#71717a";
            return (
              <span
                className="text-[7px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full border shrink-0"
                style={{
                  color: atribColor,
                  borderColor: `${atribColor}33`,
                  backgroundColor: `${atribColor}12`,
                }}
              >
                {demanda.atribuicao}
              </span>
            );
          })()}
        </div>

        {/* Row 2: Ato + Data (inline, data só quebra se não couber) */}
        <div className="flex items-baseline gap-1.5 mb-0.5 flex-wrap">
          <span className="text-[10px] text-neutral-500 dark:text-neutral-400 truncate">
            {demanda.ato}
          </span>
          {(() => {
            // Indicador de não-sincronização: updatedAt mais novo que
            // syncedAt por mais de 5min = algo ficou fora do ciclo.
            // Se syncedAt nunca foi preenchido, não dá pra afirmar divergência;
            // tratamos como "sistema não sabe" e não mostramos o badge.
            if (!demanda.updatedAt || !demanda.syncedAt) return null;
            const upd = new Date(demanda.updatedAt).getTime();
            const syn = new Date(demanda.syncedAt).getTime();
            if (upd - syn <= 5 * 60 * 1000) return null;
            const minutos = Math.max(1, Math.floor((Date.now() - upd) / 60000));
            return (
              <span
                className="shrink-0 ml-auto inline-flex items-center gap-0.5 text-[8px] text-amber-500/80"
                title={`Não sincronizado há ${minutos}min (última edição ${new Date(demanda.updatedAt).toLocaleString("pt-BR")})`}
              >
                <CloudOff className="w-2.5 h-2.5" />
              </span>
            );
          })()}
          {demanda.data && (
            <span className="text-[8px] font-mono tabular-nums text-neutral-300 dark:text-neutral-600 shrink-0 ml-auto">
              {demanda.data}
            </span>
          )}
        </div>

        {/* Row 3: Processo — hover na cor funcional do status */}
        {processo && (
          <div className="flex items-center gap-1 mb-1">
            <span
              className="text-[10px] font-mono tabular-nums text-neutral-400 dark:text-neutral-500 truncate transition-colors cursor-pointer"
              style={{ ["--hover-color" as string]: groupColor }}
              onMouseEnter={(e) => { (e.target as HTMLElement).style.color = groupColor; }}
              onMouseLeave={(e) => { (e.target as HTMLElement).style.color = ""; }}
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
              border transition-all duration-150
              ${onStatusChange
                ? "hover:ring-1 cursor-pointer"
                : "cursor-default"
              }
            `}
            style={{
              backgroundColor: `${groupColor}14`,
              borderColor: `${groupColor}40`,
              color: groupColor,
              filter: "saturate(1.1)",
              // @ts-ignore -- ring color via inline
              "--tw-ring-color": `${groupColor}60`,
            } as React.CSSProperties}
            title={onStatusChange ? "Alterar status" : undefined}
          >
            {(() => {
              const statusKey = (demanda.substatus || demanda.status || "triagem").toLowerCase().replace(/\s+/g, "_");
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

        {/* Pendência — só se houver diligência pendente */}
        {demanda.pendenteEvento && (
          <div className="mt-1.5 pt-1.5 border-t border-neutral-200/40 dark:border-neutral-700/40">
            <EventLine evento={demanda.pendenteEvento} variant="pendente" />
          </div>
        )}
        {/* Última atividade — sempre presente; placeholder se não há eventos */}
        <div
          className={`mt-1.5 ${
            demanda.pendenteEvento
              ? ""
              : "pt-1.5 border-t border-neutral-200/40 dark:border-neutral-700/40"
          }`}
        >
          <div className="flex items-center gap-1.5">
            <div className="flex-1 min-w-0">
              {demanda.lastEvento ? (
                <EventLine evento={demanda.lastEvento} />
              ) : (
                <span className="text-[10px] text-neutral-400 dark:text-neutral-500 italic">
                  <span className="opacity-50 mr-1">+</span>registrar atividade
                </span>
              )}
            </div>
            {demanda.lastEvento && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setExpanded((v) => !v);
                }}
                aria-label={expanded ? "Colapsar" : "Expandir"}
                className="shrink-0 p-0.5 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition"
              >
                <ChevronDown
                  className={`size-3 transition-transform duration-150 ${expanded ? "rotate-180" : ""}`}
                />
              </button>
            )}
          </div>
          {expanded && (
            <div className="mt-2 pt-2 border-t border-neutral-200/40 dark:border-neutral-700/40 space-y-1">
              {timelineData?.items ? (
                <>
                  {/* Pula o primeiro item porque já é o "lastEvento" mostrado acima */}
                  {timelineData.items.slice(1, 4).map(({ evento }) => (
                    <EventLine
                      key={evento.id}
                      evento={{
                        id: evento.id,
                        tipo: evento.tipo,
                        subtipo: evento.subtipo,
                        status: evento.status as EventoLine["status"],
                        resumo: evento.resumo,
                        prazo: evento.prazo,
                        createdAt: evento.createdAt,
                      }}
                    />
                  ))}
                  {timelineData.items.length <= 1 && (
                    <span className="text-[10px] text-neutral-400 italic">
                      Sem eventos anteriores.
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onOpenEventsDrawer) {
                        onOpenEventsDrawer(Number(demanda.id));
                      } else {
                        // Legacy fallback — open QuickPreview if drawer not wired
                        onCardClick(demanda.id);
                      }
                    }}
                    className="text-[10px] text-emerald-600 hover:underline mt-1"
                  >
                    Ver todos →
                  </button>
                </>
              ) : (
                <span className="text-[10px] text-neutral-400 italic">Carregando…</span>
              )}
            </div>
          )}
        </div>
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
        flex items-center gap-2 px-3.5 py-2.5 rounded-xl min-h-[44px]
        bg-white dark:bg-neutral-900
        border border-neutral-200/60 dark:border-neutral-800/60
        shadow-sm shadow-black/[0.03]
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
      className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/80 dark:bg-neutral-900/80 border border-neutral-200/60 dark:border-neutral-800/60"
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
  onOpenEventsDrawer,
  onStatusChange,
  copyToClipboard,
  draggedDemandaId,
  onDragStart,
  onDragEnd,
}: {
  subGroupDemandas: Record<EmAndamentoSubGroup, KanbanDemanda[]>;
  onCardClick: (id: string | number) => void;
  onOpenEventsDrawer?: (demandaId: number) => void;
  onStatusChange?: (demandaId: string, newStatus: string) => void;
  copyToClipboard: (text: string) => void;
  draggedDemandaId?: string | null;
  onDragStart?: (id: string) => void;
  onDragEnd?: () => void;
}) {
  // Only show non-empty sub-groups
  const visibleSubGroups = (["preparacao", "diligencias", "acompanhar", "saida"] as EmAndamentoSubGroup[])
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

        const sections = SUB_GROUP_SECTIONS[sg];
        const renderCard = (d: KanbanDemanda) => (
          <KanbanCard
            key={d.id}
            demanda={d}
            group={sg}
            onCardClick={onCardClick}
            onOpenEventsDrawer={onOpenEventsDrawer}
            onStatusChange={onStatusChange}
            copyToClipboard={copyToClipboard}
            isDragging={draggedDemandaId === String(d.id)}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
          />
        );

        return (
          <div key={sg} className="flex flex-col min-w-0">
            <div className="mb-2">
              <SubGroupHeader group={sg} count={items.length} />
            </div>
            <div className="space-y-2.5 flex-1">
              {sections ? (
                // Render with visual sections
                sections.map((section) => {
                  const sectionItems = items.filter((d) => {
                    const key = (d.substatus || d.status || "").replace(/^\d+\s*-\s*/, "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "_");
                    return section.statuses.includes(key);
                  });
                  if (sectionItems.length === 0) return null;
                  const SectionIcon = section.icon;
                  return (
                    <div key={section.label}>
                      <div className="flex items-center gap-1.5 px-2 py-1 mb-1.5">
                        <SectionIcon className="w-3 h-3 text-neutral-400" />
                        <span className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider">{section.label}</span>
                        <span className="text-[9px] font-mono text-neutral-300 ml-auto">{sectionItems.length}</span>
                      </div>
                      <div className="space-y-2 mb-3">
                        {sectionItems.map(renderCard)}
                      </div>
                    </div>
                  );
                })
              ) : (
                // Render flat agrupado por categoria de ato (Diligências, Acompanhar, Saída)
                <GroupedByAtoList
                  items={items.slice(0, 30)}
                  renderCard={renderCard}
                  storageKey={`kanban:atogroup:subgroup:${sg}`}
                />
              )}
              {!sections && items.length > 30 && (
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
  onOpenEventsDrawer,
  onStatusChange,
  copyToClipboard,
  draggedDemandaId,
  onDragStart,
  onDragEnd,
}: {
  items: KanbanDemanda[];
  group: StatusGroup;
  onCardClick: (id: string | number) => void;
  onOpenEventsDrawer?: (demandaId: number) => void;
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
          onOpenEventsDrawer={onOpenEventsDrawer}
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
  onOpenEventsDrawer,
  onStatusChange,
  copyToClipboard,
  selectedAtribuicoes = [],
  showArchived = false,
}: KanbanPremiumProps) {
  const [emAndamentoExpanded, setEmAndamentoExpanded] = useState(true);

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
      acompanhar: [],
    };

    for (const d of demandas) {
      const rawKey = (d.substatus || d.status || "triagem");
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
        else if (group === "acompanhar") subs.acompanhar.push(d);
        else subs.preparacao.push(d);
      }
    }

    // Sort: relevância do ato ASC → ato (alfa) → dataExpedicao ASC NULLS LAST.
    // Agrupa demandas do mesmo tipo dentro da coluna e mostra as intimações
    // mais antigas no topo (devem ser resolvidas primeiro).
    const sortByAtoAndExpedicao = (a: KanbanDemanda, b: KanbanDemanda) => {
      const ra = getAtoRelevanceRank(a.ato);
      const rb = getAtoRelevanceRank(b.ato);
      if (ra !== rb) return ra - rb;

      const aAto = (a.ato ?? "").toLowerCase();
      const bAto = (b.ato ?? "").toLowerCase();
      if (aAto !== bAto) return aAto.localeCompare(bAto, "pt-BR");

      const ax = (a.dataExpedicaoRaw as string | null | undefined) ?? null;
      const bx = (b.dataExpedicaoRaw as string | null | undefined) ?? null;
      if (ax === bx) return 0;
      if (!ax) return 1;
      if (!bx) return -1;
      return ax.localeCompare(bx);
    };
    for (const key of Object.keys(cols) as KanbanColumn[]) cols[key].sort(sortByAtoAndExpedicao);
    for (const key of Object.keys(subs)) (subs as any)[key].sort(sortByAtoAndExpedicao);

    return {
      columnDemandas: cols,
      subGroupDemandas: subs,
      totalEmAndamento: cols.em_andamento.length,
    };
  }, [demandas, showArchived]);

  // Count non-empty sub-groups for grid sizing
  const nonEmptySubGroupCount = useMemo(() => {
    return (["preparacao", "diligencias", "acompanhar", "saida"] as EmAndamentoSubGroup[])
      .filter((sg) => (subGroupDemandas[sg]?.length || 0) > 0).length;
  }, [subGroupDemandas]);

  // Viewport check — esconde Concluída quando expandido em telas < lg
  const [isNarrowViewport, setIsNarrowViewport] = useState(false);
  useEffect(() => {
    const check = () => setIsNarrowViewport(window.innerWidth < 1024);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Visible columns — Concluída esconde quando Em Andamento expandido em tela estreita
  const visibleColumns = useMemo(() => {
    const cols: KanbanColumn[] = [];
    if (columnDemandas.triagem.length > 0) cols.push("triagem");
    cols.push("em_andamento");
    const hideConcluida = emAndamentoExpanded && isNarrowViewport;
    if (columnDemandas.concluida.length > 0 && !hideConcluida) cols.push("concluida");
    if (showArchived && columnDemandas.arquivado.length > 0) cols.push("arquivado");
    return cols;
  }, [columnDemandas, showArchived, emAndamentoExpanded, isNarrowViewport]);

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
    return (["preparacao", "diligencias", "acompanhar", "saida"] as EmAndamentoSubGroup[])
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
    acompanhar: subGroupDemandas.acompanhar.length,
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
          onOpenEventsDrawer={onOpenEventsDrawer}
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
      <div className="hidden sm:block overflow-x-auto scrollbar-thin scrollbar-thumb-neutral-200 dark:scrollbar-thumb-neutral-700">
        {/* Kanban Grid */}
        <div
          className="grid gap-3 transition-all duration-500 ease-out pb-2"
          style={{
            gridTemplateColumns: gridTemplate,
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
                      onOpenEventsDrawer={onOpenEventsDrawer}
                      onStatusChange={onStatusChange}
                      copyToClipboard={copyToClipboard}
                      draggedDemandaId={draggedDemandaId}
                      onDragStart={setDraggedDemandaId}
                      onDragEnd={() => { setDraggedDemandaId(null); setDragOverColumn(null); }}
                    />
                  ) : (
                    <div className="space-y-2.5 flex-1">
                      <GroupedByAtoList
                        items={items.slice(0, 30)}
                        storageKey="kanban:atogroup:em_andamento_collapsed"
                        renderCard={(d) => {
                          const rawKey2 = (d.substatus || d.status || "triagem");
                          const statusKey = rawKey2.replace(/^\d+\s*-\s*/, "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "_");
                          const sCfg = getStatusConfig(statusKey);
                          return (
                            <KanbanCard
                              key={d.id}
                              demanda={d}
                              group={sCfg.group as StatusGroup}
                              onCardClick={onCardClick}
                              onOpenEventsDrawer={onOpenEventsDrawer}
                              onStatusChange={onStatusChange}
                              copyToClipboard={copyToClipboard}
                              isDragging={draggedDemandaId === String(d.id)}
                              onDragStart={setDraggedDemandaId}
                              onDragEnd={() => { setDraggedDemandaId(null); setDragOverColumn(null); }}
                            />
                          );
                        }}
                      />
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
              triagem: "triagem",
              concluida: "protocolado",
              arquivado: "arquivado",
            };
            const isRegularDropTarget = dragOverColumn === col && draggedDemandaId !== null;
            return (
              <div
                key={col}
                className={cn(
                  "flex flex-col min-w-0 rounded-xl transition-all duration-200",
                  isRegularDropTarget && "bg-emerald-50/50 dark:bg-emerald-950/20 ring-2 ring-dashed ring-emerald-400 ring-offset-1",
                  col === "concluida" && ""
                )}
                onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; setDragOverColumn(col); }}
                onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOverColumn(null); }}
                onDrop={(e) => {
                  e.preventDefault();
                  const id = e.dataTransfer.getData("demandaId");
                  if (id && onStatusChange) onStatusChange(id, colDropStatus[col] || "triagem");
                  setDragOverColumn(null);
                }}
              >
                <div className="mb-2">
                  <ColumnHeader group={groupKey} count={items.length} />
                </div>
                <div className="space-y-2.5 flex-1">
                  <GroupedByAtoList
                    items={items.slice(0, 30)}
                    storageKey={`kanban:atogroup:col:${col}`}
                    renderCard={(d) => (
                      <KanbanCard
                        key={d.id}
                        demanda={d}
                        group={groupKey}
                        onCardClick={onCardClick}
                        onOpenEventsDrawer={onOpenEventsDrawer}
                        onStatusChange={onStatusChange}
                        copyToClipboard={copyToClipboard}
                        isDragging={draggedDemandaId === String(d.id)}
                        onDragStart={setDraggedDemandaId}
                        onDragEnd={() => { setDraggedDemandaId(null); setDragOverColumn(null); }}
                      />
                    )}
                  />
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
