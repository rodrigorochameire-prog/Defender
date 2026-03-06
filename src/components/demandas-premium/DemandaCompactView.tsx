// @ts-nocheck
"use client";

import React, { useState, useRef, useCallback, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  Lock,
  Flame,
  Copy,
  Check,
  CheckCircle2,
  MoreHorizontal,
  Edit,
  Archive,
  ArchiveRestore,
  Trash2,
  ExternalLink,
  AlertCircle,
  Scale,
  GripVertical,
  Eye,
  ChevronRight,
  ChevronDown,
} from "lucide-react";
import { getStatusConfig, STATUS_GROUPS, DEMANDA_STATUS } from "@/config/demanda-status";
import { getAtosPorAtribuicao } from "@/config/atos-por-atribuicao";
import { InlineDropdown } from "@/components/shared/inline-dropdown";
import { EditableTextInline } from "@/components/shared/editable-text-inline";
import { InlineDatePicker } from "@/components/shared/inline-date-picker";
import { InlineAutocomplete } from "@/components/shared/inline-autocomplete";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from "@/components/ui/tooltip";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ColumnResizeHandle } from "./ColumnResizeHandle";
import { ColumnFilterRow } from "./ColumnFilterRow";

// ============================================
// TIPOS
// ============================================

interface Processo {
  tipo: string;
  numero: string;
}

interface Demanda {
  id: string;
  assistido: string;
  assistidoId?: number | null;
  processoId?: number | null;
  status: string;
  substatus?: string;
  prazo: string;
  data: string;
  dataInclusao?: string;
  processos: Processo[];
  ato: string;
  providencias: string;
  atribuicao: string;
  estadoPrisional?: string;
  prioridade?: string;
  arquivado?: boolean;
  // Rastreamento de importação
  importBatchId?: string | null;
  ordemOriginal?: number | null;
}

interface DemandaCompactViewProps {
  demandas: Demanda[];
  atribuicaoIcons: Record<string, React.ComponentType<{ className?: string }>>;
  atribuicaoColors: Record<string, string>;
  onStatusChange: (id: string, status: string) => void;
  onAtoChange: (id: string, ato: string) => void;
  onProvidenciasChange: (id: string, providencias: string) => void;
  onPrazoChange: (id: string, prazo: string) => void;
  onAtribuicaoChange: (id: string, atribuicao: string) => void;
  onAssistidoChange: (id: string, nome: string) => void;
  onProcessoChange: (id: string, numero: string) => void;
  // Vinculação a cadastros existentes (autocomplete)
  onAssistidoLink?: (id: string, assistidoId: number, nome: string) => void;
  onProcessoLink?: (id: string, processoId: number, numero: string) => void;
  searchAssistidosFn?: (query: string) => { id: number; label: string; sublabel?: string }[];
  searchProcessosFn?: (query: string) => { id: number; label: string; sublabel?: string }[];
  onAssistidoQueryChange?: (query: string) => void;
  onProcessoQueryChange?: (query: string) => void;
  isLoadingAssistidoSearch?: boolean;
  isLoadingProcessoSearch?: boolean;
  onEdit: (demanda: Demanda) => void;
  onArchive: (id: string) => void;
  onUnarchive: (id: string) => void;
  onDelete: (id: string) => void;
  copyToClipboard: (text: string, message?: string) => void;
  isSelectMode?: boolean;
  selectedIds?: Set<string>;
  onToggleSelect?: (id: string, event?: { shiftKey?: boolean; ctrlKey?: boolean; metaKey?: boolean }) => void;
  // Filtro rápido de atribuição
  selectedAtribuicao?: string | null;
  onAtribuicaoFilter?: (value: string | null) => void;
  // Ordenação multi-coluna
  sortStack?: SortCriterion[];
  onColumnSort?: (columnId: string) => void;
  // Drag and drop
  onReorder?: (activeId: string, overId: string) => void;
  // Column resize
  columnWidths?: Record<string, number>;
  onColumnResize?: (columnId: string, width: number) => void;
  // Per-column filters
  columnFilters?: Record<string, string>;
  onColumnFilterChange?: (columnId: string, value: string) => void;
  showColumnFilters?: boolean;
  // Quick-preview
  onPreview?: (id: string) => void;
  previewDemandaId?: string | null;
  // Agrupamento visual
  groupBy?: "status" | "atribuicao" | null;
  collapsedGroups?: Set<string>;
  onToggleGroupCollapse?: (group: string) => void;
}

// ============================================
// COLUMN ORDER CONFIGURATION
// Reordene este array para mudar a ordem das colunas na planilha
// ============================================

interface ColumnDef {
  id: string;
  header: string;
  width?: string;
  align?: "left" | "right";
  editable: boolean;
  colIndex: number;
}

interface SortCriterion {
  column: string;
  direction: "asc" | "desc";
}

const COLUMN_ORDER: ColumnDef[] = [
  { id: "index",        header: "#",            width: "w-8",              editable: false, colIndex: 0 },
  { id: "status",       header: "Status",       width: "w-[10%]",         editable: true,  colIndex: 6 },
  { id: "assistido",    header: "Assistido",    width: "w-[24%]",         editable: true,  colIndex: 1 },
  { id: "processo",     header: "Processo",     width: "w-[22%]",         editable: true,  colIndex: 2 },
  { id: "ato",          header: "Ato",          width: "w-[14%]",         editable: true,  colIndex: 4 },
  { id: "prazo",        header: "Prazo",        width: "w-[8%]",          editable: true,  colIndex: 5 },
  { id: "providencias", header: "Prov.",        width: "w-[12%]",         editable: true,  colIndex: 8 },
  { id: "acoes",        header: "",             width: "w-10",             align: "right",  editable: false, colIndex: 9 },
];

// Derivar colunas editáveis automaticamente da ordem do array
const EDITABLE_COLS = COLUMN_ORDER.filter((c) => c.editable).map((c) => c.colIndex);

// ============================================
// CONSTANTS
// ============================================

const ATRIBUICAO_BORDER_COLORS: Record<string, string> = {
  "Tribunal do Júri": "#22c55e",
  "Grupo Especial do Júri": "#f97316",
  "Violência Doméstica": "#f59e0b",
  "Execução Penal": "#3b82f6",
  "Substituição Criminal": "#8b5cf6",
  "Curadoria Especial": "#71717a",
};

const ATRIBUICAO_OPTIONS = [
  { value: "Tribunal do Júri", label: "Tribunal do Júri" },
  { value: "Grupo Especial do Júri", label: "Grupo Esp. Júri" },
  { value: "Violência Doméstica", label: "Violência Doméstica" },
  { value: "Execução Penal", label: "Execução Penal" },
  { value: "Substituição Criminal", label: "Substituição Criminal" },
  { value: "Curadoria Especial", label: "Curadoria Especial" },
];

// ============================================
// HELPERS
// ============================================

function calcularPrazo(prazoStr: string) {
  if (!prazoStr) return { texto: "", cor: "none", dias: null };
  try {
    const [dia, mes, ano] = prazoStr.split("/").map(Number);
    const fullYear = ano < 100 ? 2000 + ano : ano;
    const prazo = new Date(fullYear, mes - 1, dia);
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    prazo.setHours(0, 0, 0, 0);
    const diffTime = prazo.getTime() - hoje.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return { texto: `${Math.abs(diffDays)}d atrás`, cor: "red", dias: diffDays };
    if (diffDays === 0) return { texto: "Hoje", cor: "red", dias: 0 };
    if (diffDays === 1) return { texto: "Amanhã", cor: "amber", dias: 1 };
    if (diffDays <= 7) return { texto: `${diffDays}d`, cor: "amber", dias: diffDays };
    if (diffDays <= 30) return { texto: `${diffDays}d`, cor: "yellow", dias: diffDays };
    return { texto: prazoStr, cor: "gray", dias: diffDays };
  } catch {
    return { texto: prazoStr, cor: "gray", dias: null };
  }
}

function getRowTSV(demanda: Demanda): string {
  return [
    demanda.substatus || demanda.status,
    demanda.assistido,
    demanda.processos?.[0]?.numero || "-",
    demanda.ato,
    demanda.prazo || "-",
    demanda.providencias || "-",
  ].join("\t");
}

// ============================================
// COMPACT ROW (Memoized)
// ============================================

const CompactRow = React.memo(function CompactRow({
  demanda,
  index,
  atribuicaoIcons,
  onStatusChange,
  onAtoChange,
  onProvidenciasChange,
  onPrazoChange,
  onAtribuicaoChange,
  onAssistidoChange,
  onProcessoChange,
  onAssistidoLink,
  onProcessoLink,
  searchAssistidosFn,
  searchProcessosFn,
  onAssistidoQueryChange,
  onProcessoQueryChange,
  isLoadingAssistidoSearch,
  isLoadingProcessoSearch,
  onEdit,
  onArchive,
  onUnarchive,
  onDelete,
  copyToClipboard,
  isSelectMode,
  isSelected,
  onToggleSelect,
  focusedCell,
  onCellFocus,
  cellRefs,
  onReorder,
  columnWidths,
  onPreview,
  previewDemandaId,
}: {
  demanda: Demanda;
  index: number;
  atribuicaoIcons: Record<string, React.ComponentType<{ className?: string }>>;
  onStatusChange: (id: string, status: string) => void;
  onAtoChange: (id: string, ato: string) => void;
  onProvidenciasChange: (id: string, providencias: string) => void;
  onPrazoChange: (id: string, prazo: string) => void;
  onAtribuicaoChange: (id: string, atribuicao: string) => void;
  onAssistidoChange: (id: string, nome: string) => void;
  onProcessoChange: (id: string, numero: string) => void;
  onAssistidoLink?: (id: string, assistidoId: number, nome: string) => void;
  onProcessoLink?: (id: string, processoId: number, numero: string) => void;
  searchAssistidosFn?: (query: string) => { id: number; label: string; sublabel?: string }[];
  searchProcessosFn?: (query: string) => { id: number; label: string; sublabel?: string }[];
  onAssistidoQueryChange?: (query: string) => void;
  onProcessoQueryChange?: (query: string) => void;
  isLoadingAssistidoSearch?: boolean;
  isLoadingProcessoSearch?: boolean;
  onEdit: (demanda: Demanda) => void;
  onArchive: (id: string) => void;
  onUnarchive: (id: string) => void;
  onDelete: (id: string) => void;
  copyToClipboard: (text: string, message?: string) => void;
  isSelectMode?: boolean;
  isSelected?: boolean;
  onToggleSelect?: (id: string, event?: { shiftKey?: boolean; ctrlKey?: boolean; metaKey?: boolean }) => void;
  focusedCell: { row: number; col: number } | null;
  onCellFocus: (row: number, col: number) => void;
  cellRefs: React.MutableRefObject<Map<string, HTMLTableCellElement>>;
  onReorder?: (activeId: string, overId: string) => void;
  columnWidths?: Record<string, number>;
  onPreview?: (id: string) => void;
  previewDemandaId?: string | null;
}) {
  const [showMenu, setShowMenu] = useState(false);
  const [copiedCell, setCopiedCell] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: demanda.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    position: isDragging ? "relative" as const : undefined,
    zIndex: isDragging ? 50 : undefined,
  };

  const statusConfig = getStatusConfig(demanda.status);
  const statusColor = STATUS_GROUPS[statusConfig.group]?.color || "#A1A1AA";
  const atribuicaoColor = ATRIBUICAO_BORDER_COLORS[demanda.atribuicao] || "#71717a";
  const AtribuicaoIcon = atribuicaoIcons[demanda.atribuicao] || Scale;
  const prazoInfo = calcularPrazo(demanda.prazo);
  const isUrgente = demanda.prioridade === "URGENTE" || demanda.prioridade === "REU_PRESO";
  const isPreso = demanda.estadoPrisional === "preso";

  const statusOptions = Object.entries(DEMANDA_STATUS).map(([k, v]) => ({
    value: k,
    label: v.label,
    color: STATUS_GROUPS[v.group].color,
    group: v.group,
  }));

  const atoOptions = getAtosPorAtribuicao(demanda.atribuicao)
    .filter((a) => a.value !== "Todos")
    .map((a) => ({ value: a.value, label: a.label }));

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setShowMenu(false);
    };
    if (showMenu) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showMenu]);

  const copyCell = useCallback((text: string, label: string) => {
    copyToClipboard(text, `${label} copiado!`);
    setCopiedCell(label);
    setTimeout(() => setCopiedCell(null), 1500);
  }, [copyToClipboard]);

  const isPreviewActive = previewDemandaId === demanda.id;
  const rowBg = isUrgente || isPreso
    ? "bg-rose-50/40 dark:bg-rose-950/20"
    : "";

  const registerRef = useCallback((col: number) => (el: HTMLTableCellElement | null) => {
    const key = `${index}-${col}`;
    if (el) {
      cellRefs.current.set(key, el);
    } else {
      cellRefs.current.delete(key);
    }
  }, [index, cellRefs]);

  const isFocused = (col: number) => focusedCell?.row === index && focusedCell?.col === col;

  // ---- Cell Renderers (keyed by column id) ----

  const cellRenderers: Record<string, () => React.ReactNode> = {
    // # (número) — left border on <tr> handles atribuição color
    index: () => (
      <span>{index + 1}</span>
    ),

    // Assistido - autocomplete de vinculacao + editavel inline + Copy + Link
    assistido: () => (
      <div className="flex items-center gap-1 min-w-0">
        {isUrgente && <Flame className="w-3 h-3 text-orange-500 flex-shrink-0" />}
        {isPreso && <Lock className="w-3 h-3 text-rose-500 flex-shrink-0" />}
        <div className="truncate group-hover/row:whitespace-normal group-hover/row:break-words flex-1 min-w-0 transition-all">
          {searchAssistidosFn && onAssistidoLink ? (
            <InlineAutocomplete
              value={demanda.assistido}
              valueId={demanda.assistidoId}
              onSelect={(id, label) => onAssistidoLink(demanda.id, id, label)}
              onTextChange={(text) => onAssistidoChange(demanda.id, text)}
              placeholder="Buscar assistido..."
              searchFn={searchAssistidosFn}
              onQueryChange={onAssistidoQueryChange}
              isLoading={isLoadingAssistidoSearch}
              icon="user"
              className="cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 rounded px-1 py-0.5 -mx-1 transition-colors flex items-center gap-1 group/edit"
            />
          ) : (
            <EditableTextInline
              value={demanda.assistido}
              onSave={(v) => onAssistidoChange(demanda.id, v)}
              className="cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 rounded px-1 py-0.5 -mx-1 transition-colors flex items-center gap-1 group/edit"
            />
          )}
        </div>
      </div>
    ),

    // Processo - autocomplete de vinculacao + editavel inline + Copy + Link
    processo: () => (
      <div className="flex items-center gap-1 min-w-0">
        <div className="truncate group-hover/row:whitespace-normal group-hover/row:break-words flex-1 min-w-0 transition-all">
          {searchProcessosFn && onProcessoLink ? (
            <InlineAutocomplete
              value={demanda.processos?.[0]?.numero || ""}
              valueId={demanda.processoId}
              onSelect={(id, label) => onProcessoLink(demanda.id, id, label)}
              onTextChange={(text) => onProcessoChange(demanda.id, text)}
              placeholder="Buscar processo..."
              searchFn={searchProcessosFn}
              onQueryChange={onProcessoQueryChange}
              isLoading={isLoadingProcessoSearch}
              icon="briefcase"
              className="cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 rounded px-1 py-0.5 -mx-1 transition-colors flex items-center gap-1 group/edit font-mono text-[10px]"
            />
          ) : (
            <EditableTextInline
              value={demanda.processos?.[0]?.numero || ""}
              onSave={(v) => onProcessoChange(demanda.id, v)}
              placeholder="Sem processo"
              className="cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 rounded px-1 py-0.5 -mx-1 transition-colors flex items-center gap-1 group/edit"
              inputClassName="w-full text-[10px] font-mono px-1.5 py-0.5 rounded border border-emerald-400 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 focus:outline-none focus:ring-1 focus:ring-emerald-400/50"
            />
          )}
        </div>
        {demanda.processos?.[0]?.numero && (
          <button
            onClick={(e) => { e.stopPropagation(); copyCell(demanda.processos[0].numero, "Processo"); }}
            className="opacity-0 group-hover/cell:opacity-100 transition-opacity flex-shrink-0 p-0.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700"
            title="Copiar numero"
          >
            {copiedCell === "Processo" ? (
              <Check className="w-3 h-3 text-emerald-500" />
            ) : (
              <Copy className="w-3 h-3 text-zinc-400" />
            )}
          </button>
        )}
        {demanda.processoId && (
          <Link
            href={`/admin/processos/${demanda.processoId}`}
            className="opacity-0 group-hover/cell:opacity-100 transition-opacity flex-shrink-0"
            title="Abrir processo"
          >
            <ExternalLink className="w-3 h-3 text-zinc-400 hover:text-emerald-500" />
          </Link>
        )}
      </div>
    ),

    // Ato
    ato: () => (
      <InlineDropdown
        value={demanda.ato}
        compact
        displayValue={
          <span className="text-[11px] text-zinc-700 dark:text-zinc-300 truncate max-w-[130px] block">
            {demanda.ato || "Selecionar"}
          </span>
        }
        options={atoOptions}
        onChange={(v) => onAtoChange(demanda.id, v)}
      />
    ),

    // Prazo — badge style, empty = show nothing
    prazo: () => {
      const hasPrazo = demanda.prazo && prazoInfo.cor !== "none";
      const badgeColors: Record<string, string> = {
        red: "bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400",
        amber: "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400",
        yellow: "bg-yellow-50 text-yellow-700 dark:bg-yellow-950/20 dark:text-yellow-400",
        gray: "text-zinc-400 dark:text-zinc-500",
      };
      return (
        <div className="flex items-center gap-1">
          <InlineDatePicker
            value={demanda.prazo}
            onChange={(isoDate) => onPrazoChange(demanda.id, isoDate)}
            placeholder=""
          />
          {hasPrazo && prazoInfo.cor !== "gray" && (
            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full whitespace-nowrap ${badgeColors[prazoInfo.cor] || ""} ${prazoInfo.cor === "red" ? "animate-pulse" : ""}`}>
              {prazoInfo.texto}
            </span>
          )}
        </div>
      );
    },

    // Status — simplified: ● dot + text, no pill background
    status: () => (
      <InlineDropdown
        value={demanda.status}
        compact
        displayValue={
          <div
            className="inline-flex items-center gap-1.5 text-[10px] font-medium"
            style={{ color: statusColor }}
          >
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: statusColor }} />
            <span className="truncate max-w-[80px]">{statusConfig.label}</span>
          </div>
        }
        options={statusOptions}
        onChange={(v) => onStatusChange(demanda.id, v)}
      />
    ),

    // Atribuição
    atribuicao: () => (
      <InlineDropdown
        value={demanda.atribuicao}
        compact
        displayValue={
          <div
            className="inline-flex items-center gap-1 text-[10px] font-medium"
            style={{ color: atribuicaoColor }}
          >
            <AtribuicaoIcon className="w-3 h-3" />
            <span className="truncate max-w-[90px]">{demanda.atribuicao}</span>
          </div>
        }
        options={ATRIBUICAO_OPTIONS}
        onChange={(v) => onAtribuicaoChange(demanda.id, v)}
      />
    ),

    // Providências — hide placeholder text, show clean state
    providencias: () => {
      const text = demanda.providencias || "";
      const isPlaceholder = /^\(ajustar|^\(peticionar/i.test(text.trim());
      const hasText = text.trim().length > 0 && !isPlaceholder;
      return (
        <div className="group/prov flex items-center gap-1 min-w-0">
          {hasText ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  className="flex items-center gap-1 min-w-0 text-left hover:bg-black/5 dark:hover:bg-white/5 rounded px-1 py-0.5 -mx-1 transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    const td = e.currentTarget.closest('td');
                    if (td) td.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
                  }}
                >
                  <span className="text-[10px] text-zinc-500 dark:text-zinc-400 truncate">{text.length > 20 ? text.substring(0, 20) + "…" : text}</span>
                </button>
              </TooltipTrigger>
              <TooltipContent side="left" className="max-w-[300px]">
                <p className="text-xs whitespace-pre-wrap">{text}</p>
                <p className="text-[10px] text-zinc-400 mt-1">Duplo-clique para editar</p>
              </TooltipContent>
            </Tooltip>
          ) : (
            <EditableTextInline
              value={isPlaceholder ? "" : ""}
              onSave={(v) => onProvidenciasChange(demanda.id, v)}
              placeholder=""
              className="text-[10px] text-zinc-400"
            />
          )}
        </div>
      );
    },

    // Ações — hover quick actions: ✓ Resolver + Copy + ⋮ Menu
    acoes: () => (
      <div className="flex items-center gap-0.5 opacity-0 group-hover/row:opacity-100 transition-opacity">
        {/* Quick Resolve */}
        {demanda.status !== "resolvido" && demanda.status !== "protocolado" && demanda.status !== "ciencia" && demanda.status !== "sem_atuacao" && (
          <button
            onClick={() => onStatusChange(demanda.id, "resolvido")}
            className="p-1 rounded hover:bg-emerald-100 dark:hover:bg-emerald-950/30 transition-colors"
            title="Resolver"
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
          </button>
        )}

        {/* Copy row */}
        <button
          onClick={() => { copyToClipboard(getRowTSV(demanda), "Linha copiada!"); setCopiedCell("row"); setTimeout(() => setCopiedCell(null), 1500); }}
          className="p-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
          title="Copiar linha"
        >
          {copiedCell === "row" ? (
            <Check className="w-3 h-3 text-emerald-500" />
          ) : (
            <Copy className="w-3 h-3 text-zinc-400" />
          )}
        </button>

        {/* Eye - Ver detalhes */}
        {onPreview && (
          <button
            onClick={(e) => { e.stopPropagation(); onPreview(demanda.id); }}
            className="p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors cursor-pointer"
            title="Ver detalhes"
          >
            <Eye className="w-3.5 h-3.5" />
          </button>
        )}

        {/* Menu */}
        <div ref={menuRef} className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
          >
            <MoreHorizontal className="w-3 h-3 text-zinc-400" />
          </button>

          {showMenu && (
            <div className="absolute right-0 top-full mt-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg shadow-xl z-50 py-1 w-36">
              <button
                onClick={() => { onEdit(demanda); setShowMenu(false); }}
                className="w-full px-3 py-1.5 text-left text-[12px] flex items-center gap-2 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
              >
                <Edit className="w-3.5 h-3.5" /> Editar
              </button>
              {demanda.arquivado ? (
                <button
                  onClick={() => { onUnarchive(demanda.id); setShowMenu(false); }}
                  className="w-full px-3 py-1.5 text-left text-[12px] flex items-center gap-2 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
                >
                  <ArchiveRestore className="w-3.5 h-3.5" /> Restaurar
                </button>
              ) : (
                <button
                  onClick={() => { onArchive(demanda.id); setShowMenu(false); }}
                  className="w-full px-3 py-1.5 text-left text-[12px] flex items-center gap-2 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
                >
                  <Archive className="w-3.5 h-3.5" /> Arquivar
                </button>
              )}
              <div className="my-1 border-t border-zinc-100 dark:border-zinc-800" />
              <button
                onClick={() => { onDelete(demanda.id); setShowMenu(false); }}
                className="w-full px-3 py-1.5 text-left text-[12px] flex items-center gap-2 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-rose-600"
              >
                <Trash2 className="w-3.5 h-3.5" /> Excluir
              </button>
            </div>
          )}
        </div>
      </div>
    ),
  };

  // Atribuição dropdown state for left border click
  const [showAtribDropdown, setShowAtribDropdown] = useState(false);
  const atribDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showAtribDropdown) return;
    const handler = (e: MouseEvent) => {
      if (atribDropdownRef.current && !atribDropdownRef.current.contains(e.target as Node)) setShowAtribDropdown(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showAtribDropdown]);

  return (
    <tr
      ref={setNodeRef}
      style={{
        ...style,
        borderLeft: `3px solid ${atribuicaoColor}`,
        ...(isSelected ? { backgroundColor: `${atribuicaoColor}12` } : {}),
        ...(isPreviewActive ? { backgroundColor: "rgba(16, 185, 129, 0.06)" } : {}),
      }}
      {...attributes}
      onClick={(e) => {
        // Ctrl/Cmd+Click = toggle selection
        if ((e.ctrlKey || e.metaKey) && onToggleSelect) {
          e.preventDefault();
          onToggleSelect(demanda.id, { shiftKey: e.shiftKey, ctrlKey: e.ctrlKey, metaKey: e.metaKey });
          return;
        }
        // Normal click = open preview Sheet (if not clicking an interactive element)
        const target = e.target as HTMLElement;
        const isInteractive = target.closest("button, a, input, select, textarea, [data-edit-trigger], [role='combobox'], [role='listbox']");
        if (!isInteractive && onPreview) {
          onPreview(demanda.id);
        }
      }}
      className={`group/row border-b border-zinc-100/50 dark:border-zinc-800/50 transition-colors duration-100 cursor-pointer ${rowBg} ${isPreviewActive ? "ring-1 ring-emerald-200/50 dark:ring-emerald-800/40" : ""} ${index % 2 === 1 && !isPreviewActive ? "bg-zinc-50/40 dark:bg-zinc-800/20" : !isPreviewActive ? "bg-white dark:bg-zinc-900" : ""} ${isDragging ? "shadow-lg bg-white dark:bg-zinc-900 ring-1 ring-emerald-400/30" : ""} ${!isSelected && !isPreviewActive ? "hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30" : ""}`}
    >
      {/* Drag handle */}
      {onReorder && (
        <td className="px-1 py-2 w-6 cursor-grab active:cursor-grabbing" {...listeners}>
          <GripVertical className="w-3.5 h-3.5 text-zinc-300 dark:text-zinc-600 opacity-0 group-hover/row:opacity-100 transition-opacity" />
        </td>
      )}
      {/* Checkbox */}
      {isSelectMode && (
        <td className="px-1 py-1 w-8">
          <button
            onClick={(e) => onToggleSelect?.(demanda.id, { shiftKey: e.shiftKey, ctrlKey: e.ctrlKey, metaKey: e.metaKey })}
            className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all ${
              !isSelected ? "border-zinc-300 dark:border-zinc-600 hover:border-zinc-400" : ""
            }`}
            style={isSelected ? { borderColor: atribuicaoColor, backgroundColor: atribuicaoColor } : undefined}
          >
            {isSelected && <Check className="w-2.5 h-2.5 text-white" />}
          </button>
        </td>
      )}

      {/* Render columns from COLUMN_ORDER */}
      {COLUMN_ORDER.map((col) => {
        const renderer = cellRenderers[col.id];
        if (!renderer) return null;

        // Special styling per column type
        const isIndexCol = col.id === "index";
        const isAcoesCol = col.id === "acoes";

        if (isIndexCol) {
          return (
            <td key={col.id} className="px-3 py-3 text-zinc-400 font-mono text-[10px] relative w-8 cursor-pointer hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors" onClick={() => setShowAtribDropdown(!showAtribDropdown)} title={`Atribuição: ${demanda.atribuicao}\nClique para alterar`}>
              {renderer()}
              {showAtribDropdown && (
                <div ref={atribDropdownRef} className="absolute left-0 top-full mt-1 z-50 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg shadow-xl py-1 min-w-[140px]">
                  {ATRIBUICAO_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={(e) => { e.stopPropagation(); onAtribuicaoChange(demanda.id, opt.value); setShowAtribDropdown(false); }}
                      className={`w-full px-3 py-1.5 text-left text-[11px] flex items-center gap-2 transition-colors ${
                        demanda.atribuicao === opt.value
                          ? "bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 font-semibold"
                          : "text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                      }`}
                    >
                      {demanda.atribuicao === opt.value && <span className="text-emerald-500">✓</span>}
                      <span>{opt.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </td>
          );
        }

        if (isAcoesCol) {
          return (
            <td key={col.id} className="px-2 py-3 w-[70px]">
              {renderer()}
            </td>
          );
        }

        // All editable cells (including assistido/processo now)
        if (col.editable) {
          return (
            <td
              key={col.id}
              ref={registerRef(col.colIndex)}
              tabIndex={0}
              style={{
                ...(columnWidths?.[col.id] ? { width: columnWidths[col.id] } : {}),
                ...(isFocused(col.colIndex)
                  ? { boxShadow: `inset 0 0 0 2px ${atribuicaoColor}99`, backgroundColor: `${atribuicaoColor}08` }
                  : {}),
              }}
              className={`px-2 py-3 group/cell transition-all duration-100 ${columnWidths?.[col.id] ? "" : col.width || ""} ${
                !isFocused(col.colIndex) ? "hover:bg-zinc-50/60 dark:hover:bg-zinc-800/30" : ""
              } ${col.id === "providencias" ? "hidden md:table-cell" : ""}`}
              onClick={() => onCellFocus(index, col.colIndex)}
              onFocus={() => onCellFocus(index, col.colIndex)}
            >
              {renderer()}
            </td>
          );
        }

        // Fallback (non-editable)
        return (
          <td key={col.id} className={`px-2 py-1 ${col.width || ""}`}>
            {renderer()}
          </td>
        );
      })}
    </tr>
  );
});

// ============================================
// MAIN COMPONENT
// ============================================

export function DemandaCompactView({
  demandas,
  atribuicaoIcons,
  atribuicaoColors,
  onStatusChange,
  onAtoChange,
  onProvidenciasChange,
  onPrazoChange,
  onAtribuicaoChange,
  onAssistidoChange,
  onProcessoChange,
  onAssistidoLink,
  onProcessoLink,
  searchAssistidosFn,
  searchProcessosFn,
  onAssistidoQueryChange,
  onProcessoQueryChange,
  isLoadingAssistidoSearch,
  isLoadingProcessoSearch,
  onEdit,
  onArchive,
  onUnarchive,
  onDelete,
  copyToClipboard,
  isSelectMode,
  selectedIds,
  onToggleSelect,
  selectedAtribuicao,
  onAtribuicaoFilter,
  sortStack,
  onColumnSort,
  onReorder,
  columnWidths,
  onColumnResize,
  columnFilters,
  onColumnFilterChange,
  showColumnFilters,
  onPreview,
  previewDemandaId,
  groupBy,
  collapsedGroups,
  onToggleGroupCollapse,
}: DemandaCompactViewProps) {
  const [focusedCell, setFocusedCell] = useState<{ row: number; col: number } | null>(null);
  const [isScrolled, setIsScrolled] = useState(false);
  const cellRefs = useRef<Map<string, HTMLTableCellElement>>(new Map());
  const tableRef = useRef<HTMLTableElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Scroll shadow on header
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const handler = () => setIsScrolled(container.scrollTop > 0);
    container.addEventListener("scroll", handler, { passive: true });
    return () => container.removeEventListener("scroll", handler);
  }, []);

  // Group boundaries: compute which index starts a new group
  const groupBoundaries = useMemo(() => {
    if (!groupBy) return null;
    const boundaries: { index: number; key: string; label: string; color: string; count: number }[] = [];
    let lastKey = "";
    for (let i = 0; i < demandas.length; i++) {
      const d = demandas[i];
      const key = groupBy === "status" ? d.status : d.atribuicao;
      if (key !== lastKey) {
        const count = demandas.filter(dd => (groupBy === "status" ? dd.status : dd.atribuicao) === key).length;
        let label = key;
        let color = "#71717a";
        if (groupBy === "status") {
          const cfg = getStatusConfig(key);
          label = cfg.label;
          color = STATUS_GROUPS[cfg.group]?.color || "#71717a";
        } else {
          color = ATRIBUICAO_BORDER_COLORS[key] || "#71717a";
        }
        boundaries.push({ index: i, key, label, color, count });
        lastKey = key;
      }
    }
    return boundaries;
  }, [demandas, groupBy]);

  // Mobile: atribuicao picker state
  const [atribuicaoPickerOpenId, setAtribuicaoPickerOpenId] = useState<string | null>(null);
  const [mobileMenuOpenId, setMobileMenuOpenId] = useState<string | null>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const atribuicaoPickerRef = useRef<HTMLDivElement>(null);

  // Click-outside handler for mobile atribuicao picker
  useEffect(() => {
    if (!atribuicaoPickerOpenId) return;
    const handler = (e: MouseEvent) => {
      if (atribuicaoPickerRef.current && !atribuicaoPickerRef.current.contains(e.target as Node)) {
        setAtribuicaoPickerOpenId(null);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [atribuicaoPickerOpenId]);

  // Click-outside handler for mobile menu
  useEffect(() => {
    if (!mobileMenuOpenId) return;
    const handler = (e: MouseEvent) => {
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(e.target as Node)) {
        setMobileMenuOpenId(null);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [mobileMenuOpenId]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id && onReorder) {
      onReorder(String(active.id), String(over.id));
    }
  }, [onReorder]);

  const handleCellFocus = useCallback((row: number, col: number) => {
    setFocusedCell({ row, col });
  }, []);

  // Focus cell imperatively
  const focusCellAt = useCallback((row: number, col: number) => {
    // Find nearest editable column
    let targetCol = col;
    if (!EDITABLE_COLS.includes(targetCol)) {
      targetCol = EDITABLE_COLS[0];
    }

    // Clamp row
    const maxRow = demandas.length - 1;
    const clampedRow = Math.max(0, Math.min(row, maxRow));

    const key = `${clampedRow}-${targetCol}`;
    const cell = cellRefs.current.get(key);
    if (cell) {
      cell.focus();
      setFocusedCell({ row: clampedRow, col: targetCol });
    }
  }, [demandas.length]);

  // Keyboard navigation at table level
  const handleTableKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!focusedCell) return;

    const { row, col } = focusedCell;
    const currentColIdx = EDITABLE_COLS.indexOf(col);

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        focusCellAt(row + 1, col);
        break;
      case "ArrowUp":
        e.preventDefault();
        focusCellAt(row - 1, col);
        break;
      case "ArrowRight":
        e.preventDefault();
        if (currentColIdx < EDITABLE_COLS.length - 1) {
          focusCellAt(row, EDITABLE_COLS[currentColIdx + 1]);
        }
        break;
      case "ArrowLeft":
        e.preventDefault();
        if (currentColIdx > 0) {
          focusCellAt(row, EDITABLE_COLS[currentColIdx - 1]);
        }
        break;
      case "Tab":
        e.preventDefault();
        if (e.shiftKey) {
          // Previous cell
          if (currentColIdx > 0) {
            focusCellAt(row, EDITABLE_COLS[currentColIdx - 1]);
          } else if (row > 0) {
            focusCellAt(row - 1, EDITABLE_COLS[EDITABLE_COLS.length - 1]);
          }
        } else {
          // Next cell
          if (currentColIdx < EDITABLE_COLS.length - 1) {
            focusCellAt(row, EDITABLE_COLS[currentColIdx + 1]);
          } else if (row < demandas.length - 1) {
            focusCellAt(row + 1, EDITABLE_COLS[0]);
          }
        }
        break;
      case "Enter": {
        e.preventDefault();
        // Activate inline editing via data-edit-trigger attribute
        const cellKey = `${row}-${col}`;
        const cell = cellRefs.current.get(cellKey);
        if (cell) {
          const trigger = cell.querySelector("[data-edit-trigger]") as HTMLElement;
          if (trigger) {
            trigger.click();
          }
        }
        break;
      }
      case "Escape": {
        e.preventDefault();
        setFocusedCell(null);
        if (document.activeElement instanceof HTMLElement) {
          document.activeElement.blur();
        }
        break;
      }
      case " ":
        // Space toggles checkbox in select mode (Shift+Space for range)
        if (isSelectMode && focusedCell) {
          e.preventDefault();
          const demanda = demandas[focusedCell.row];
          if (demanda) onToggleSelect?.(demanda.id, { shiftKey: e.shiftKey });
        }
        break;
      case "c":
        // Ctrl+C / Cmd+C copies focused cell value
        if (e.metaKey || e.ctrlKey) {
          if (focusedCell) {
            const demanda = demandas[focusedCell.row];
            if (demanda) {
              const cellValues: Record<number, string> = {
                1: demanda.assistido,
                2: demanda.processos?.[0]?.numero || "-",
                4: demanda.ato,
                5: demanda.prazo || "-",
                6: demanda.substatus || demanda.status,
                8: demanda.providencias || "-",
              };
              const val = cellValues[focusedCell.col];
              if (val) {
                e.preventDefault();
                copyToClipboard(val, "Copiado!");
              }
            }
          }
        }
        break;
      case "v":
        // Ctrl+V / Cmd+V pastes into focused editable cell
        if ((e.metaKey || e.ctrlKey) && focusedCell) {
          e.preventDefault();
          navigator.clipboard.readText().then(text => {
            const demanda = demandas[focusedCell.row];
            if (!demanda || !text) return;
            const trimmed = text.trim();
            switch (focusedCell.col) {
              case 1: onAssistidoChange(demanda.id, trimmed); break;
              case 2: onProcessoChange(demanda.id, trimmed); break;
              case 4: onAtoChange(demanda.id, trimmed); break;
              case 5: onPrazoChange(demanda.id, trimmed); break;
              case 6: onStatusChange(demanda.id, trimmed); break;
              case 8: onProvidenciasChange(demanda.id, trimmed); break;
            }
            copyToClipboard("", "Colado!");
          }).catch(() => {});
        }
        break;
    }
  }, [focusedCell, focusCellAt, demandas, isSelectMode, onToggleSelect, copyToClipboard]);

  // Batch copy
  const handleCopySelected = useCallback(() => {
    if (!selectedIds || selectedIds.size === 0) return;
    const header = "Assistido\tProcesso\tAto\tPrazo\tStatus\tProvidências";
    const rows = demandas
      .filter((d) => selectedIds.has(d.id))
      .map((d) => getRowTSV(d))
      .join("\n");
    copyToClipboard(`${header}\n${rows}`, `${selectedIds.size} linhas copiadas!`);
  }, [demandas, selectedIds, copyToClipboard]);

  return (
    <TooltipProvider delayDuration={300}>
      <div className="bg-white dark:bg-zinc-900 border-t border-zinc-200/80 dark:border-zinc-800/80 overflow-hidden">
        {/* Header: keyboard hint (atribuição tabs moved to parent toolbar) */}
        <div className="px-4 py-1.5 bg-zinc-50/50 dark:bg-zinc-800/40 border-b border-zinc-100 dark:border-zinc-800/80 flex items-center justify-end">
          <span className="text-[9px] text-zinc-400 dark:text-zinc-600 whitespace-nowrap flex-shrink-0 hidden lg:inline tracking-wide">
            Click = detalhes &middot; Dbl-click = edita &middot; &uarr;&darr;&larr;&rarr; navega &middot; Ctrl+C/V = copia/cola &middot; Ctrl+Click = seleciona
          </span>
        </div>

        {/* Desktop: Table */}
        <div ref={scrollContainerRef} className="hidden md:block overflow-x-auto overflow-y-auto max-h-[calc(100vh-220px)]">
          {demandas.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-sm text-zinc-500 font-medium">Nenhuma demanda encontrada</p>
              <p className="text-xs text-zinc-400 mt-1">Ajuste os filtros ou crie uma nova demanda</p>
            </div>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={demandas.map(d => d.id)} strategy={verticalListSortingStrategy}>
            <table
              ref={tableRef}
              className="w-full text-[11px] border-collapse table-fixed"
              onKeyDown={handleTableKeyDown}
            >
              <thead className={`sticky top-0 z-10 transition-shadow duration-200 ${isScrolled ? "shadow-[0_2px_8px_rgba(0,0,0,0.06)] dark:shadow-[0_2px_8px_rgba(0,0,0,0.3)]" : ""}`}>
                <tr className="bg-zinc-50 dark:bg-zinc-800/80 border-b border-zinc-200/80 dark:border-zinc-800/80">
                  {onReorder && <th className="w-6 px-1" />}
                  {isSelectMode && <th className="w-8 px-1" />}
                  {COLUMN_ORDER.map((col) => {
                    const sortable = col.id !== "index" && col.id !== "acoes" && col.id !== "providencias";
                    const sortInfo = sortStack?.find(s => s.column === col.id);
                    const sortPosition = sortInfo ? (sortStack?.indexOf(sortInfo) ?? -1) + 1 : 0;
                    const canResize = onColumnResize && col.id !== "index" && col.id !== "acoes";

                    return (
                      <th
                        key={col.id}
                        onClick={sortable && onColumnSort ? () => onColumnSort(col.id) : undefined}
                        style={columnWidths?.[col.id] ? { width: columnWidths[col.id], position: "relative" } : undefined}
                        className={`px-3 py-2.5 text-${col.align || "left"} text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider ${columnWidths?.[col.id] ? "" : col.width || ""} ${
                          sortable && onColumnSort ? "cursor-pointer hover:text-zinc-700 dark:hover:text-zinc-300 hover:bg-zinc-100/80 dark:hover:bg-zinc-700/40 select-none transition-all" : ""
                        } ${sortInfo ? "text-emerald-600 dark:text-emerald-400" : ""} ${canResize ? "relative" : ""} ${col.id === "providencias" ? "hidden md:table-cell" : ""}`}
                      >
                        <div className="flex items-center gap-1.5">
                          <span>{col.header}</span>
                          {sortInfo && (
                            <span className="inline-flex items-center gap-0.5">
                              <span className="text-[9px] text-emerald-500">
                                {sortInfo.direction === "asc" ? "↑" : "↓"}
                              </span>
                              {(sortStack?.length ?? 0) > 1 && (
                                <span className="text-[8px] text-emerald-400/70 font-mono">{sortPosition}</span>
                              )}
                            </span>
                          )}
                        </div>
                        {canResize && (
                          <ColumnResizeHandle
                            columnId={col.id}
                            currentWidth={columnWidths?.[col.id] ?? 100}
                            onResize={onColumnResize}
                          />
                        )}
                      </th>
                    );
                  })}
                </tr>
                {showColumnFilters && onColumnFilterChange && columnFilters && (
                  <ColumnFilterRow
                    columns={COLUMN_ORDER}
                    filters={columnFilters}
                    onFilterChange={onColumnFilterChange}
                    hasReorder={!!onReorder}
                    hasSelectMode={!!isSelectMode}
                    columnWidths={columnWidths}
                  />
                )}
              </thead>
              <tbody>
                {demandas.map((demanda, index) => {
                  // Group header for desktop
                  const totalCols = COLUMN_ORDER.length + (onReorder ? 1 : 0) + (isSelectMode ? 1 : 0);
                  const groupHeader = groupBoundaries?.find(b => b.index === index);
                  const currentGroupKey = groupBy ? (groupBy === "status" ? demanda.status : demanda.atribuicao) : null;
                  const isCollapsed = currentGroupKey ? collapsedGroups?.has(currentGroupKey) : false;

                  // Skip rendering row if group is collapsed
                  if (isCollapsed && !groupHeader) return null;

                  // Import batch separator for desktop
                  const prevDemandaDesktop = index > 0 ? demandas[index - 1] : null;
                  const showDesktopBatchSep = !groupBy && demanda.importBatchId && demanda.importBatchId !== prevDemandaDesktop?.importBatchId;
                  const desktopImportDate = demanda.dataInclusao
                    ? new Date(demanda.dataInclusao).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" })
                    : "";
                  const desktopBatchCount = demanda.importBatchId ? demandas.filter(d => d.importBatchId === demanda.importBatchId).length : 0;

                  return (
                  <React.Fragment key={demanda.id}>
                  {/* Group header row */}
                  {groupHeader && (
                    <tr
                      className="bg-zinc-50/80 dark:bg-zinc-800/40 cursor-pointer hover:bg-zinc-100/80 dark:hover:bg-zinc-800/60 transition-colors"
                      onClick={() => onToggleGroupCollapse?.(groupHeader.key)}
                    >
                      <td colSpan={totalCols} className="px-3 py-2">
                        <div className="flex items-center gap-2">
                          {isCollapsed
                            ? <ChevronRight className="w-3.5 h-3.5 text-zinc-400" />
                            : <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
                          }
                          <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: groupHeader.color }} />
                          <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                            {groupHeader.label}
                          </span>
                          <span className="text-[10px] text-zinc-400 dark:text-zinc-500">
                            ({groupHeader.count})
                          </span>
                          <div className="flex-1 h-px bg-zinc-200/40 dark:bg-zinc-700/40" />
                        </div>
                      </td>
                    </tr>
                  )}
                  {/* Skip rows if collapsed */}
                  {isCollapsed ? null : (
                  <>
                  {showDesktopBatchSep && (
                    <tr className="bg-zinc-100/60 dark:bg-zinc-800/30">
                      <td colSpan={totalCols} className="px-3 py-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                            Importado {desktopImportDate}
                          </span>
                          <span className="text-[9px] text-zinc-400 dark:text-zinc-500">
                            ({desktopBatchCount} {desktopBatchCount === 1 ? "item" : "itens"})
                          </span>
                          <div className="flex-1 h-px bg-zinc-200/40 dark:bg-zinc-700/40" />
                        </div>
                      </td>
                    </tr>
                  )}
                  <CompactRow
                    demanda={demanda}
                    index={index}
                    atribuicaoIcons={atribuicaoIcons}
                    onStatusChange={onStatusChange}
                    onAtoChange={onAtoChange}
                    onProvidenciasChange={onProvidenciasChange}
                    onPrazoChange={onPrazoChange}
                    onAtribuicaoChange={onAtribuicaoChange}
                    onAssistidoChange={onAssistidoChange}
                    onProcessoChange={onProcessoChange}
                    onAssistidoLink={onAssistidoLink}
                    onProcessoLink={onProcessoLink}
                    searchAssistidosFn={searchAssistidosFn}
                    searchProcessosFn={searchProcessosFn}
                    onAssistidoQueryChange={onAssistidoQueryChange}
                    onProcessoQueryChange={onProcessoQueryChange}
                    isLoadingAssistidoSearch={isLoadingAssistidoSearch}
                    isLoadingProcessoSearch={isLoadingProcessoSearch}
                    onEdit={onEdit}
                    onArchive={onArchive}
                    onUnarchive={onUnarchive}
                    onDelete={onDelete}
                    copyToClipboard={copyToClipboard}
                    isSelectMode={isSelectMode}
                    isSelected={selectedIds?.has(demanda.id)}
                    onToggleSelect={onToggleSelect}
                    focusedCell={focusedCell}
                    onCellFocus={handleCellFocus}
                    cellRefs={cellRefs}
                    onReorder={onReorder}
                    columnWidths={columnWidths}
                    onPreview={onPreview}
                    previewDemandaId={previewDemandaId}
                  />
                  </>
                  )}
                  </React.Fragment>
                  );
                })}
              </tbody>
            </table>
            </SortableContext>
            </DndContext>
          )}
        </div>

        {/* Mobile: Ultra-compact rows (2 lines per demanda) */}
        <div className="md:hidden">
          {demandas.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-sm text-zinc-500 font-medium">Nenhuma demanda encontrada</p>
              <p className="text-xs text-zinc-400 mt-1">Ajuste os filtros ou crie uma nova demanda</p>
            </div>
          ) : (
            <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {demandas.map((demanda, idx) => {
                const statusConfig = getStatusConfig(demanda.status);
                const statusColor = STATUS_GROUPS[statusConfig.group]?.color || "#A1A1AA";
                const atribuicaoColor = ATRIBUICAO_BORDER_COLORS[demanda.atribuicao] || "#71717a";
                const prazoInfo = calcularPrazo(demanda.prazo);
                const isPreso = demanda.estadoPrisional === "preso";
                const isUrgente = demanda.prioridade === "URGENTE" || demanda.prioridade === "REU_PRESO";
                const atoOptions = getAtosPorAtribuicao(demanda.atribuicao)
                  .filter((a) => a.value !== "Todos")
                  .map((a) => ({ value: a.value, label: a.label }));
                const statusOptions = Object.entries(DEMANDA_STATUS).map(([k, v]) => ({
                  value: k, label: v.label, color: STATUS_GROUPS[v.group].color, group: v.group,
                }));

                // Group header for mobile
                const mobileGroupHeader = groupBoundaries?.find(b => b.index === idx);
                const mobileGroupKey = groupBy ? (groupBy === "status" ? demanda.status : demanda.atribuicao) : null;
                const mobileIsCollapsed = mobileGroupKey ? collapsedGroups?.has(mobileGroupKey) : false;

                // Skip rendering card if group is collapsed
                if (mobileIsCollapsed && !mobileGroupHeader) return null;

                // Import batch separator: show header when batch changes
                const prevDemanda = idx > 0 ? demandas[idx - 1] : null;
                const currentBatch = demanda.importBatchId;
                const prevBatch = prevDemanda?.importBatchId;
                const showBatchSeparator = !groupBy && currentBatch && currentBatch !== prevBatch;
                // Format import date from dataInclusao (createdAt)
                const importDateStr = demanda.dataInclusao
                  ? new Date(demanda.dataInclusao).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" })
                  : "";
                // Count items in this batch
                const batchCount = currentBatch ? demandas.filter(d => d.importBatchId === currentBatch).length : 0;

                return (
                  <React.Fragment key={demanda.id}>
                  {/* Mobile group header */}
                  {mobileGroupHeader && (
                    <div
                      className="flex items-center gap-2 px-3 py-2 bg-zinc-50/80 dark:bg-zinc-800/40 border-b border-zinc-200/50 dark:border-zinc-700/50 cursor-pointer"
                      onClick={() => onToggleGroupCollapse?.(mobileGroupHeader.key)}
                    >
                      {mobileIsCollapsed
                        ? <ChevronRight className="w-3.5 h-3.5 text-zinc-400" />
                        : <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
                      }
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: mobileGroupHeader.color }} />
                      <span className="text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">
                        {mobileGroupHeader.label}
                      </span>
                      <span className="text-[10px] text-zinc-400 dark:text-zinc-500">
                        ({mobileGroupHeader.count})
                      </span>
                      <div className="flex-1 h-px bg-zinc-200/50 dark:bg-zinc-700/50" />
                    </div>
                  )}
                  {mobileIsCollapsed ? null : (
                  <>
                  {showBatchSeparator && (
                    <div className="flex items-center gap-2 px-3 py-1 bg-zinc-100/80 dark:bg-zinc-800/40 border-b border-zinc-200/50 dark:border-zinc-700/50">
                      <span className="text-[9px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                        Importado {importDateStr}
                      </span>
                      <span className="text-[9px] text-zinc-400 dark:text-zinc-500">
                        ({batchCount} {batchCount === 1 ? "item" : "itens"})
                      </span>
                      <div className="flex-1 h-px bg-zinc-200/50 dark:bg-zinc-700/50" />
                    </div>
                  )}
                  <div
                    key={demanda.id}
                    style={{
                      borderLeft: `3px solid ${atribuicaoColor}`,
                      ...(selectedIds?.has(demanda.id) ? { backgroundColor: `${atribuicaoColor}12` } : {}),
                      ...(previewDemandaId === demanda.id ? { backgroundColor: "rgba(16, 185, 129, 0.06)" } : {}),
                    }}
                    className={`relative transition-colors cursor-pointer ${
                      previewDemandaId === demanda.id ? "ring-1 ring-emerald-200/50 dark:ring-emerald-800/40" : ""
                    } ${
                      !selectedIds?.has(demanda.id) && previewDemandaId !== demanda.id
                        ? isUrgente || isPreso
                          ? "bg-rose-50/40 dark:bg-rose-950/10"
                          : idx % 2 === 1 ? "bg-zinc-50/30 dark:bg-zinc-800/10" : ""
                        : ""
                    }`}
                    onClick={(e) => {
                      // Click on left edge (first 12px) opens atribuição picker
                      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                      if (e.clientX - rect.left < 12) {
                        setAtribuicaoPickerOpenId(atribuicaoPickerOpenId === demanda.id ? null : demanda.id);
                        return;
                      }
                      // Normal tap opens preview Sheet
                      const target = e.target as HTMLElement;
                      const isInteractive = target.closest("button, a, input, select, textarea, [data-edit-trigger], [role='combobox'], [role='listbox']");
                      if (!isInteractive && onPreview) {
                        onPreview(demanda.id);
                      }
                    }}
                  >
                    <div className="pl-2 pr-2 py-1.5">
                      {/* Line 1: #, status, assistido, prazo, menu */}
                      <div className="flex items-center gap-1 min-w-0">
                        {/* Select checkbox */}
                        {isSelectMode && (
                          <button
                            onClick={() => onToggleSelect?.(demanda.id)}
                            className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                              !selectedIds?.has(demanda.id) ? "border-zinc-300 dark:border-zinc-600" : ""
                            }`}
                            style={selectedIds?.has(demanda.id) ? { borderColor: atribuicaoColor, backgroundColor: atribuicaoColor } : undefined}
                          >
                            {selectedIds?.has(demanda.id) && <Check className="w-2.5 h-2.5 text-white" />}
                          </button>
                        )}
                        {/* Index */}
                        <span className="text-[10px] text-zinc-400 font-mono w-4 flex-shrink-0 text-right" title={demanda.ordemOriginal != null ? `Ordem PJe: ${demanda.ordemOriginal + 1}` : undefined}>
                          {idx + 1}
                        </span>
                        {/* Preso / Urgente icons */}
                        {isPreso && <Lock className="w-3 h-3 text-rose-500 flex-shrink-0" />}
                        {isUrgente && !isPreso && <Flame className="w-3 h-3 text-orange-500 flex-shrink-0" />}
                        {/* Status pill (right after atribuição bar + index) */}
                        <div className="flex-shrink-0">
                          <InlineDropdown
                            value={demanda.status}
                            compact
                            displayValue={
                              <div
                                className="inline-flex items-center gap-1 text-[9px] font-medium leading-none"
                                style={{ color: statusColor }}
                              >
                                <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: statusColor }} />
                                <span className="truncate max-w-[60px]">{statusConfig.label}</span>
                              </div>
                            }
                            options={statusOptions}
                            onChange={(v) => onStatusChange(demanda.id, v)}
                          />
                        </div>
                        {/* Assistido name */}
                        <div className="flex-1 min-w-0 truncate">
                          {searchAssistidosFn && onAssistidoLink ? (
                            <InlineAutocomplete
                              value={demanda.assistido}
                              valueId={demanda.assistidoId}
                              onSelect={(id, label) => onAssistidoLink(demanda.id, id, label)}
                              onTextChange={(text) => onAssistidoChange(demanda.id, text)}
                              placeholder="Assistido..."
                              searchFn={searchAssistidosFn}
                              onQueryChange={onAssistidoQueryChange}
                              isLoading={isLoadingAssistidoSearch}
                              icon="user"
                              className="cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 rounded px-0.5 transition-colors truncate flex items-center gap-1 group/edit min-w-0 text-[12px] font-semibold text-zinc-800 dark:text-zinc-200"
                            />
                          ) : (
                            <EditableTextInline
                              value={demanda.assistido}
                              onSave={(v) => onAssistidoChange(demanda.id, v)}
                              className="cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 rounded px-0.5 transition-colors truncate flex items-center gap-1 group/edit min-w-0 text-[12px] font-semibold text-zinc-800 dark:text-zinc-200"
                            />
                          )}
                        </div>
                        {/* Prazo — badge style, empty = show nothing */}
                        <div className="flex-shrink-0 flex items-center gap-1">
                          <InlineDatePicker
                            value={demanda.prazo}
                            onChange={(isoDate) => onPrazoChange(demanda.id, isoDate)}
                            placeholder=""
                          />
                          {demanda.prazo && prazoInfo.cor !== "none" && prazoInfo.cor !== "gray" && (
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full whitespace-nowrap ${
                              prazoInfo.cor === "red" ? "bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 animate-pulse" :
                              prazoInfo.cor === "amber" ? "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400" :
                              "bg-yellow-50 text-yellow-700 dark:bg-yellow-950/20 dark:text-yellow-400"
                            }`}>
                              {prazoInfo.texto}
                            </span>
                          )}
                        </div>
                        {/* Actions menu (three dots) */}
                        <div className="relative flex-shrink-0">
                          <button
                            onClick={() => setMobileMenuOpenId(mobileMenuOpenId === demanda.id ? null : demanda.id)}
                            className="p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400"
                          >
                            <MoreHorizontal className="w-3.5 h-3.5" />
                          </button>
                          {mobileMenuOpenId === demanda.id && (
                            <div
                              ref={mobileMenuRef}
                              className="absolute right-0 top-full mt-1 z-50 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg shadow-lg py-1 min-w-[140px]"
                            >
                              {onPreview && (
                                <button
                                  onClick={() => { onPreview(demanda.id); setMobileMenuOpenId(null); }}
                                  className="w-full flex items-center gap-2 px-3 py-1.5 text-[11px] text-emerald-600 dark:text-emerald-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 font-medium"
                                >
                                  <Eye className="w-3 h-3" /> Ver detalhes
                                </button>
                              )}
                              <button
                                onClick={() => { copyToClipboard(getRowTSV(demanda), "Linha copiada!"); setMobileMenuOpenId(null); }}
                                className="w-full flex items-center gap-2 px-3 py-1.5 text-[11px] text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                              >
                                <Copy className="w-3 h-3" /> Copiar linha
                              </button>
                              {demanda.assistidoId && (
                                <Link
                                  href={`/admin/assistidos/${demanda.assistidoId}`}
                                  className="w-full flex items-center gap-2 px-3 py-2 text-[11px] text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                                  onClick={() => setMobileMenuOpenId(null)}
                                >
                                  <ExternalLink className="w-3 h-3" />
                                  <span>Abrir ficha</span>
                                </Link>
                              )}
                              {demanda.processoId && (
                                <Link
                                  href={`/admin/processos/${demanda.processoId}`}
                                  className="w-full flex items-center gap-2 px-3 py-2 text-[11px] text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                                  onClick={() => setMobileMenuOpenId(null)}
                                >
                                  <ExternalLink className="w-3 h-3" />
                                  <span>Abrir processo</span>
                                </Link>
                              )}
                              <button
                                onClick={() => { onEdit(demanda); setMobileMenuOpenId(null); }}
                                className="w-full flex items-center gap-2 px-3 py-1.5 text-[11px] text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                              >
                                <Edit className="w-3 h-3" /> Editar completo
                              </button>
                              <button
                                onClick={() => { demanda.arquivado ? onUnarchive(demanda.id) : onArchive(demanda.id); setMobileMenuOpenId(null); }}
                                className="w-full flex items-center gap-2 px-3 py-1.5 text-[11px] text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                              >
                                {demanda.arquivado ? <ArchiveRestore className="w-3 h-3" /> : <Archive className="w-3 h-3" />}
                                {demanda.arquivado ? "Restaurar" : "Arquivar"}
                              </button>
                              <button
                                onClick={() => { onDelete(demanda.id); setMobileMenuOpenId(null); }}
                                className="w-full flex items-center gap-2 px-3 py-1.5 text-[11px] text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20"
                              >
                                <Trash2 className="w-3 h-3" /> Excluir
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Line 2: processo, ato, providencias */}
                      <div className="flex items-center gap-1 min-w-0 pl-5 mt-0.5">
                        {/* Processo (mono) */}
                        <div className="min-w-0 max-w-[45%]">
                          {searchProcessosFn && onProcessoLink ? (
                            <InlineAutocomplete
                              value={demanda.processos?.[0]?.numero || ""}
                              valueId={demanda.processoId}
                              onSelect={(id, label) => onProcessoLink(demanda.id, id, label)}
                              onTextChange={(text) => onProcessoChange(demanda.id, text)}
                              placeholder="Processo..."
                              searchFn={searchProcessosFn}
                              onQueryChange={onProcessoQueryChange}
                              isLoading={isLoadingProcessoSearch}
                              icon="briefcase"
                              className="cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 rounded px-0.5 transition-colors truncate flex items-center gap-1 group/edit min-w-0 font-mono text-[10px] text-zinc-500 dark:text-zinc-400"
                            />
                          ) : (
                            <EditableTextInline
                              value={demanda.processos?.[0]?.numero || ""}
                              onSave={(v) => onProcessoChange(demanda.id, v)}
                              placeholder="Sem processo"
                              className="cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 rounded px-0.5 transition-colors truncate flex items-center gap-1 group/edit min-w-0 font-mono text-[10px] text-zinc-500 dark:text-zinc-400"
                              inputClassName="w-full text-[10px] font-mono px-1 py-0.5 rounded border border-emerald-400 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 focus:outline-none focus:ring-1 focus:ring-emerald-400/50"
                            />
                          )}
                        </div>
                        {/* Separator */}
                        <span className="text-[10px] text-zinc-300 dark:text-zinc-600 flex-shrink-0">&middot;</span>
                        {/* Ato (dropdown) */}
                        <div className="min-w-0 flex-shrink truncate">
                          <InlineDropdown
                            value={demanda.ato}
                            compact
                            displayValue={
                              <span className="text-[10px] text-zinc-600 dark:text-zinc-400 truncate block">
                                {demanda.ato || "Ato..."}
                              </span>
                            }
                            options={atoOptions}
                            onChange={(v) => onAtoChange(demanda.id, v)}
                          />
                        </div>
                        {/* Providencias (hide placeholders) */}
                        {(() => {
                          const provText = demanda.providencias || "";
                          const isPlaceholder = /^\(ajustar|^\(peticionar/i.test(provText.trim());
                          const showProv = provText.trim().length > 0 && !isPlaceholder;
                          return showProv ? (
                            <>
                              <span className="text-[10px] text-zinc-300 dark:text-zinc-600 flex-shrink-0">&middot;</span>
                              <div className="min-w-0 flex-1 truncate">
                                <EditableTextInline
                                  value={provText}
                                  onSave={(v) => onProvidenciasChange(demanda.id, v)}
                                  placeholder=""
                                  className="cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 rounded px-0.5 transition-colors truncate flex items-center gap-1 group/edit min-w-0 text-[10px] italic text-zinc-400 dark:text-zinc-500"
                                />
                              </div>
                            </>
                          ) : null;
                        })()}
                      </div>
                    </div>
                  </div>
                  </>
                  )}
                  </React.Fragment>
                );
              })}
            </div>
          )}

          {/* Atribuicao picker popover (fixed bottom) */}
          {atribuicaoPickerOpenId && (
            <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={() => setAtribuicaoPickerOpenId(null)}>
              {/* Backdrop */}
              <div className="absolute inset-0 bg-black/20" />
              {/* Picker */}
              <div
                ref={atribuicaoPickerRef}
                className="relative w-full max-w-md bg-white dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-700 rounded-t-xl shadow-2xl pb-safe"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between px-4 pt-3 pb-2 border-b border-zinc-100 dark:border-zinc-800">
                  <span className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Atribuicao</span>
                  <button
                    onClick={() => setAtribuicaoPickerOpenId(null)}
                    className="text-[11px] text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 px-2 py-0.5"
                  >
                    Fechar
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-1.5 p-3">
                  {ATRIBUICAO_OPTIONS.map((opt) => {
                    const color = ATRIBUICAO_BORDER_COLORS[opt.value] || "#71717a";
                    const isActive = demandas.find((d) => d.id === atribuicaoPickerOpenId)?.atribuicao === opt.value;
                    return (
                      <button
                        key={opt.value}
                        onClick={() => {
                          onAtribuicaoChange(atribuicaoPickerOpenId, opt.value);
                          setAtribuicaoPickerOpenId(null);
                        }}
                        className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-left transition-all ${
                          isActive
                            ? "ring-2 ring-offset-1 dark:ring-offset-zinc-900"
                            : "hover:bg-zinc-50 dark:hover:bg-zinc-800"
                        }`}
                        style={isActive ? { ["--tw-ring-color" as string]: color, backgroundColor: `${color}10` } : {}}
                      >
                        <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                        <span className={`text-[11px] truncate ${isActive ? "font-semibold" : "font-medium text-zinc-600 dark:text-zinc-300"}`}>
                          {opt.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {demandas.length > 0 && (
          <div className="px-4 py-2 border-t border-zinc-200 dark:border-zinc-700 bg-zinc-50/80 dark:bg-zinc-800/50 flex items-center justify-between">
            <span className="text-[10px] text-zinc-400 dark:text-zinc-500">
              {demandas.length} demanda{demandas.length !== 1 && "s"}
              {selectedIds && selectedIds.size > 0 && (
                <span className="ml-2 text-emerald-600 dark:text-emerald-400 font-medium">
                  &middot; {selectedIds.size} selecionada{selectedIds.size !== 1 && "s"}
                </span>
              )}
            </span>
            {selectedIds && selectedIds.size > 0 && (
              <button
                onClick={handleCopySelected}
                className="text-[10px] text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300 flex items-center gap-1 transition-colors font-medium"
              >
                <Copy className="w-3 h-3" />
                Copiar {selectedIds.size} selecionada{selectedIds.size !== 1 && "s"}
              </button>
            )}
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}

export default DemandaCompactView;
