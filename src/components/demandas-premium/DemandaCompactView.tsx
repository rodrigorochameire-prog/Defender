// @ts-nocheck
"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import Link from "next/link";
import {
  Lock,
  Flame,
  Copy,
  Check,
  MoreHorizontal,
  Edit,
  Archive,
  ArchiveRestore,
  Trash2,
  ExternalLink,
  AlertCircle,
  Scale,
  GripVertical,
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
  processos: Processo[];
  ato: string;
  providencias: string;
  atribuicao: string;
  estadoPrisional?: string;
  prioridade?: string;
  arquivado?: boolean;
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
  isLoadingAssistidoSearch?: boolean;
  isLoadingProcessoSearch?: boolean;
  onEdit: (demanda: Demanda) => void;
  onArchive: (id: string) => void;
  onUnarchive: (id: string) => void;
  onDelete: (id: string) => void;
  copyToClipboard: (text: string, message?: string) => void;
  isSelectMode?: boolean;
  selectedIds?: Set<string>;
  onToggleSelect?: (id: string) => void;
  // Filtro rápido de atribuição
  selectedAtribuicao?: string | null;
  onAtribuicaoFilter?: (value: string | null) => void;
  // Ordenação multi-coluna
  sortStack?: SortCriterion[];
  onColumnSort?: (columnId: string) => void;
  // Drag and drop
  onReorder?: (activeId: string, overId: string) => void;
}

// ============================================
// COLUMN ORDER CONFIGURATION
// Reordene este array para mudar a ordem das colunas na planilha
// ============================================

interface ColumnDef {
  id: string;
  header: string;
  width?: string;
  minWidth?: string;
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
  { id: "assistido",    header: "Assistido",    minWidth: "min-w-[140px]", editable: true,  colIndex: 1 },
  { id: "processo",     header: "Processo",     minWidth: "min-w-[160px]", editable: true,  colIndex: 2 },
  { id: "ato",          header: "Ato",          minWidth: "min-w-[120px]", editable: true,  colIndex: 4 },
  { id: "prazo",        header: "Prazo",        width: "w-[100px]",        editable: true,  colIndex: 5 },
  { id: "status",       header: "Status",       width: "w-[100px]",        editable: true,  colIndex: 6 },
  { id: "providencias", header: "Providências", minWidth: "min-w-[140px]", editable: true,  colIndex: 8 },
  { id: "acoes",        header: "Ações",        width: "w-[60px]",         align: "right",  editable: false, colIndex: 9 },
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
  if (!prazoStr) return { texto: "-", cor: "none", dias: null };
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
    demanda.assistido,
    demanda.processos?.[0]?.numero || "-",
    demanda.ato,
    demanda.prazo || "-",
    demanda.substatus || demanda.status,
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
  isLoadingAssistidoSearch?: boolean;
  isLoadingProcessoSearch?: boolean;
  onEdit: (demanda: Demanda) => void;
  onArchive: (id: string) => void;
  onUnarchive: (id: string) => void;
  onDelete: (id: string) => void;
  copyToClipboard: (text: string, message?: string) => void;
  isSelectMode?: boolean;
  isSelected?: boolean;
  onToggleSelect?: (id: string) => void;
  focusedCell: { row: number; col: number } | null;
  onCellFocus: (row: number, col: number) => void;
  cellRefs: React.MutableRefObject<Map<string, HTMLTableCellElement>>;
  onReorder?: (activeId: string, overId: string) => void;
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

  const rowBg = isSelected
    ? "bg-emerald-50/70 dark:bg-emerald-950/30"
    : isUrgente || isPreso
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
    // # com barra de cor
    index: () => (
      <>
        <span
          className="absolute left-0 inset-y-0 w-0.5"
          style={{ backgroundColor: atribuicaoColor }}
        />
        {index + 1}
      </>
    ),

    // Assistido - autocomplete de vinculacao + editavel inline + Copy + Link
    assistido: () => (
      <div className="flex items-center gap-1 min-w-0">
        {isUrgente && <Flame className="w-3 h-3 text-orange-500 flex-shrink-0" />}
        {isPreso && <Lock className="w-3 h-3 text-rose-500 flex-shrink-0" />}
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="truncate flex-1 min-w-0">
              {searchAssistidosFn && onAssistidoLink ? (
                <InlineAutocomplete
                  value={demanda.assistido}
                  valueId={demanda.assistidoId}
                  onSelect={(id, label) => onAssistidoLink(demanda.id, id, label)}
                  onTextChange={(text) => onAssistidoChange(demanda.id, text)}
                  placeholder="Buscar assistido..."
                  searchFn={searchAssistidosFn}
                  isLoading={isLoadingAssistidoSearch}
                  icon="user"
                  activateOnDoubleClick
                  className="cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 rounded px-1 py-0.5 -mx-1 transition-colors truncate flex items-center gap-1 group/edit"
                />
              ) : (
                <EditableTextInline
                  value={demanda.assistido}
                  onSave={(v) => onAssistidoChange(demanda.id, v)}
                  activateOnDoubleClick
                  className="cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 rounded px-1 py-0.5 -mx-1 transition-colors truncate flex items-center gap-1 group/edit"
                />
              )}
            </div>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-[300px]">
            <p className="text-xs font-medium">{demanda.assistido}</p>
            <p className="text-[10px] text-zinc-400 mt-0.5">Clique para selecionar, duplo-clique para vincular assistido</p>
          </TooltipContent>
        </Tooltip>
        <button
          onClick={(e) => { e.stopPropagation(); copyCell(demanda.assistido, "Nome"); }}
          className="opacity-0 group-hover/cell:opacity-100 transition-opacity flex-shrink-0 p-0.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700"
          title="Copiar nome"
        >
          {copiedCell === "Nome" ? (
            <Check className="w-3 h-3 text-emerald-500" />
          ) : (
            <Copy className="w-3 h-3 text-zinc-400" />
          )}
        </button>
        {demanda.assistidoId && (
          <Link
            href={`/admin/assistidos/${demanda.assistidoId}`}
            className="opacity-0 group-hover/cell:opacity-100 transition-opacity flex-shrink-0"
            title="Abrir ficha"
          >
            <ExternalLink className="w-3 h-3 text-zinc-400 hover:text-emerald-500" />
          </Link>
        )}
      </div>
    ),

    // Processo - autocomplete de vinculacao + editavel inline + Copy + Link
    processo: () => (
      <div className="flex items-center gap-1 min-w-0">
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="truncate flex-1 min-w-0">
              {searchProcessosFn && onProcessoLink ? (
                <InlineAutocomplete
                  value={demanda.processos?.[0]?.numero || ""}
                  valueId={demanda.processoId}
                  onSelect={(id, label) => onProcessoLink(demanda.id, id, label)}
                  onTextChange={(text) => onProcessoChange(demanda.id, text)}
                  placeholder="Buscar processo..."
                  searchFn={searchProcessosFn}
                  isLoading={isLoadingProcessoSearch}
                  icon="briefcase"
                  activateOnDoubleClick
                  className="cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 rounded px-1 py-0.5 -mx-1 transition-colors truncate flex items-center gap-1 group/edit font-mono text-[10px]"
                />
              ) : (
                <EditableTextInline
                  value={demanda.processos?.[0]?.numero || ""}
                  onSave={(v) => onProcessoChange(demanda.id, v)}
                  placeholder="Sem processo"
                  activateOnDoubleClick
                  className="cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 rounded px-1 py-0.5 -mx-1 transition-colors truncate flex items-center gap-1 group/edit"
                  inputClassName="w-full text-[10px] font-mono px-1.5 py-0.5 rounded border border-emerald-400 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 focus:outline-none focus:ring-1 focus:ring-emerald-400/50"
                />
              )}
            </div>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-[350px]">
            <p className="text-xs font-mono">{demanda.processos?.[0]?.numero || "-"}</p>
            {demanda.processos?.[0]?.tipo && (
              <p className="text-[10px] text-zinc-400 mt-0.5">{demanda.processos[0].tipo}</p>
            )}
            <p className="text-[10px] text-zinc-400">Clique para selecionar, duplo-clique para vincular processo</p>
          </TooltipContent>
        </Tooltip>
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
        activateOnDoubleClick
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

    // Prazo
    prazo: () => (
      <div className="flex items-center">
        <InlineDatePicker
          value={demanda.prazo}
          onChange={(isoDate) => onPrazoChange(demanda.id, isoDate)}
          activateOnDoubleClick
        />
        {prazoInfo.cor === "red" && <AlertCircle className="w-3 h-3 text-rose-500 flex-shrink-0 ml-0.5" />}
      </div>
    ),

    // Status
    status: () => (
      <InlineDropdown
        value={demanda.status}
        activateOnDoubleClick
        compact
        displayValue={
          <div
            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold"
            style={{
              backgroundColor: `${statusColor}20`,
              color: statusColor,
            }}
          >
            <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: statusColor }} />
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
        activateOnDoubleClick
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

    // Providências
    providencias: () => (
      <EditableTextInline
        value={demanda.providencias || ""}
        onSave={(v) => onProvidenciasChange(demanda.id, v)}
        placeholder="+ providências"
        activateOnDoubleClick
      />
    ),

    // Ações
    acoes: () => (
      <div className="flex items-center gap-0.5 opacity-0 group-hover/row:opacity-100 transition-opacity">
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

  return (
    <tr
      ref={setNodeRef}
      style={style}
      {...attributes}
      className={`group/row border-b border-zinc-100 dark:border-zinc-800/60 hover:bg-emerald-50/30 dark:hover:bg-emerald-950/10 transition-colors ${rowBg} ${index % 2 === 1 ? "bg-zinc-50/40 dark:bg-zinc-800/15" : ""} ${isDragging ? "shadow-lg bg-white dark:bg-zinc-900 ring-1 ring-emerald-400/30" : ""}`}
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
            onClick={() => onToggleSelect?.(demanda.id)}
            className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all ${
              isSelected ? "border-emerald-500 bg-emerald-500" : "border-zinc-300 dark:border-zinc-600 hover:border-zinc-400"
            }`}
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
            <td key={col.id} className="px-3 py-2 text-zinc-400 font-mono text-[10px] relative w-8">
              {renderer()}
            </td>
          );
        }

        if (isAcoesCol) {
          return (
            <td key={col.id} className="px-2 py-2 w-[70px]">
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
              className={`px-3 py-2 group/cell ${col.width || ""} ${col.minWidth || ""} ${
                isFocused(col.colIndex)
                  ? "ring-1 ring-inset ring-emerald-400/40 bg-emerald-50/20 dark:bg-emerald-950/15"
                  : ""
              }`}
              onClick={() => onCellFocus(index, col.colIndex)}
              onFocus={() => onCellFocus(index, col.colIndex)}
            >
              {renderer()}
            </td>
          );
        }

        // Fallback
        return (
          <td key={col.id} className={`px-3 py-2 ${col.width || ""} ${col.minWidth || ""}`}>
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
}: DemandaCompactViewProps) {
  const [focusedCell, setFocusedCell] = useState<{ row: number; col: number } | null>(null);
  const cellRefs = useRef<Map<string, HTMLTableCellElement>>(new Map());
  const tableRef = useRef<HTMLTableElement>(null);

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
        // Trigger double-click on the focused cell to activate editing
        const cellKey = `${row}-${col}`;
        const cell = cellRefs.current.get(cellKey);
        if (cell) {
          const btn = cell.querySelector("button") || cell.querySelector("[role='button']") || cell.querySelector("div[class*='cursor']");
          if (btn) {
            const dblClick = new MouseEvent("dblclick", { bubbles: true });
            btn.dispatchEvent(dblClick);
          }
        }
        break;
      }
      case " ":
        // Space toggles checkbox in select mode
        if (isSelectMode && focusedCell) {
          e.preventDefault();
          const demanda = demandas[focusedCell.row];
          if (demanda) onToggleSelect?.(demanda.id);
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
      <div className="bg-white dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800 overflow-hidden">
        {/* Header: filter chips + hint */}
        <div className="px-4 py-2 bg-zinc-50/50 dark:bg-zinc-800/40 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0 overflow-x-auto scrollbar-none flex-nowrap">
            {/* Quick atribuição filter chips */}
            {onAtribuicaoFilter && (
              <>
                {ATRIBUICAO_OPTIONS.map((opt) => {
                  const isActive = selectedAtribuicao === opt.value;
                  const color = ATRIBUICAO_BORDER_COLORS[opt.value] || "#71717a";
                  return (
                    <button
                      key={opt.value}
                      onClick={() => onAtribuicaoFilter(isActive ? null : opt.value)}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-medium transition-all whitespace-nowrap ${
                        isActive
                          ? "text-white shadow-sm ring-1 ring-black/10"
                          : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                      }`}
                      style={isActive ? { backgroundColor: color } : undefined}
                      title={opt.value}
                    >
                      <span
                        className={`w-2 h-2 rounded-full flex-shrink-0 ${!isActive ? "ring-1 ring-inset ring-black/10" : ""}`}
                        style={{ backgroundColor: isActive ? "rgba(255,255,255,0.9)" : color }}
                      />
                      {opt.label}
                    </button>
                  );
                })}
              </>
            )}
          </div>
          <span className="text-[9px] text-zinc-400 dark:text-zinc-600 whitespace-nowrap flex-shrink-0 hidden lg:inline tracking-wide">
            Click = seleciona &middot; Enter/2x = edita &middot; &uarr;&darr;&larr;&rarr; navega &middot; Ctrl+C = copia
          </span>
        </div>

        {/* Desktop: Table */}
        <div className="hidden md:block overflow-x-auto">
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
              className="w-full text-[11px] border-collapse min-w-[800px]"
              onKeyDown={handleTableKeyDown}
            >
              <thead className="sticky top-0 z-10">
                <tr className="bg-zinc-50 dark:bg-zinc-800/80 border-b border-zinc-200 dark:border-zinc-700">
                  {onReorder && <th className="w-6 px-1" />}
                  {isSelectMode && <th className="w-8 px-1" />}
                  {COLUMN_ORDER.map((col) => {
                    const sortable = col.id !== "index" && col.id !== "acoes" && col.id !== "providencias";
                    const sortInfo = sortStack?.find(s => s.column === col.id);
                    const sortPosition = sortInfo ? (sortStack?.indexOf(sortInfo) ?? -1) + 1 : 0;

                    return (
                      <th
                        key={col.id}
                        onClick={sortable && onColumnSort ? () => onColumnSort(col.id) : undefined}
                        className={`px-3 py-2.5 text-${col.align || "left"} text-[9px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider ${col.width || ""} ${col.minWidth || ""} ${
                          sortable && onColumnSort ? "cursor-pointer hover:text-zinc-700 dark:hover:text-zinc-300 hover:bg-zinc-100/80 dark:hover:bg-zinc-700/40 select-none transition-all" : ""
                        } ${sortInfo ? "text-emerald-600 dark:text-emerald-400" : ""}`}
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
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {demandas.map((demanda, index) => (
                  <CompactRow
                    key={demanda.id}
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
                  />
                ))}
              </tbody>
            </table>
            </SortableContext>
            </DndContext>
          )}
        </div>

        {/* Mobile: Cards */}
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
                const AtribuicaoIcon = atribuicaoIcons[demanda.atribuicao] || Scale;
                const prazoInfo = calcularPrazo(demanda.prazo);
                const isPreso = demanda.estadoPrisional === "preso";
                const isUrgente = demanda.prioridade === "URGENTE" || demanda.prioridade === "REU_PRESO";
                const atoOptions = getAtosPorAtribuicao(demanda.atribuicao)
                  .filter((a) => a.value !== "Todos")
                  .map((a) => ({ value: a.value, label: a.label }));
                const statusOptions = Object.entries(DEMANDA_STATUS).map(([k, v]) => ({
                  value: k, label: v.label, color: STATUS_GROUPS[v.group].color, group: v.group,
                }));

                return (
                  <div
                    key={demanda.id}
                    className={`relative transition-colors ${
                      isUrgente || isPreso
                        ? "bg-rose-50/40 dark:bg-rose-950/10"
                        : idx % 2 === 1 ? "bg-zinc-50/30 dark:bg-zinc-800/10" : ""
                    }`}
                  >
                    {/* Color bar left */}
                    <div className="absolute left-0 inset-y-0 w-1" style={{ backgroundColor: atribuicaoColor }} />

                    <div className="pl-4 pr-3 py-3 space-y-2.5">
                      {/* Header: Assistido + Processo */}
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="text-[10px] text-zinc-400 font-mono w-5 flex-shrink-0 text-right">{idx + 1}</span>
                          {isPreso && <Lock className="w-3 h-3 text-rose-500 flex-shrink-0" />}
                          {isUrgente && <Flame className="w-3 h-3 text-orange-500 flex-shrink-0" />}
                          {searchAssistidosFn && onAssistidoLink ? (
                            <InlineAutocomplete
                              value={demanda.assistido}
                              valueId={demanda.assistidoId}
                              onSelect={(id, label) => onAssistidoLink(demanda.id, id, label)}
                              onTextChange={(text) => onAssistidoChange(demanda.id, text)}
                              placeholder="Buscar assistido..."
                              searchFn={searchAssistidosFn}
                              isLoading={isLoadingAssistidoSearch}
                              icon="user"
                              className="cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 rounded px-1 py-0.5 transition-colors truncate flex items-center gap-1 group/edit flex-1 min-w-0 text-[12px] font-semibold text-zinc-800 dark:text-zinc-200"
                            />
                          ) : (
                            <EditableTextInline
                              value={demanda.assistido}
                              onSave={(v) => onAssistidoChange(demanda.id, v)}
                              className="cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 rounded px-1 py-0.5 transition-colors truncate flex items-center gap-1 group/edit flex-1 min-w-0 text-[12px] font-semibold text-zinc-800 dark:text-zinc-200"
                            />
                          )}
                          <button
                            onClick={() => copyToClipboard(demanda.assistido, "Nome copiado!")}
                            className="p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 flex-shrink-0"
                          >
                            <Copy className="w-3 h-3 text-zinc-300 dark:text-zinc-600" />
                          </button>
                          {demanda.assistidoId && (
                            <Link href={`/admin/assistidos/${demanda.assistidoId}`} className="flex-shrink-0">
                              <ExternalLink className="w-3 h-3 text-zinc-300 dark:text-zinc-600 hover:text-emerald-500" />
                            </Link>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 min-w-0 pl-[26px]">
                          {searchProcessosFn && onProcessoLink ? (
                            <InlineAutocomplete
                              value={demanda.processos?.[0]?.numero || ""}
                              valueId={demanda.processoId}
                              onSelect={(id, label) => onProcessoLink(demanda.id, id, label)}
                              onTextChange={(text) => onProcessoChange(demanda.id, text)}
                              placeholder="Buscar processo..."
                              searchFn={searchProcessosFn}
                              isLoading={isLoadingProcessoSearch}
                              icon="briefcase"
                              className="cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 rounded px-1 py-0.5 transition-colors truncate flex items-center gap-1 group/edit flex-1 min-w-0 font-mono text-[10px] text-zinc-500 dark:text-zinc-400"
                            />
                          ) : (
                            <EditableTextInline
                              value={demanda.processos?.[0]?.numero || ""}
                              onSave={(v) => onProcessoChange(demanda.id, v)}
                              placeholder="Sem processo"
                              className="cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 rounded px-1 py-0.5 transition-colors truncate flex items-center gap-1 group/edit flex-1 min-w-0 font-mono text-[10px] text-zinc-500 dark:text-zinc-400"
                              inputClassName="w-full text-[10px] font-mono px-1.5 py-0.5 rounded border border-emerald-400 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 focus:outline-none focus:ring-1 focus:ring-emerald-400/50"
                            />
                          )}
                          {demanda.processos?.[0]?.numero && (
                            <button
                              onClick={() => copyToClipboard(demanda.processos[0].numero, "Processo copiado!")}
                              className="p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 flex-shrink-0"
                            >
                              <Copy className="w-3 h-3 text-zinc-300 dark:text-zinc-600" />
                            </button>
                          )}
                          {demanda.processoId && (
                            <Link href={`/admin/processos/${demanda.processoId}`} className="flex-shrink-0">
                              <ExternalLink className="w-3 h-3 text-zinc-300 dark:text-zinc-600 hover:text-emerald-500" />
                            </Link>
                          )}
                        </div>
                      </div>

                      {/* Fields in 2-column grid */}
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 pl-[26px]">
                        {/* Ato */}
                        <div className="flex items-center gap-2 col-span-2">
                          <span className="text-[8px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase w-10 flex-shrink-0">Ato</span>
                          <div className="flex-1 min-w-0">
                            <InlineDropdown
                              value={demanda.ato}
                              compact
                              displayValue={
                                <span className="text-[11px] text-zinc-700 dark:text-zinc-300 truncate block">
                                  {demanda.ato || "Selecionar"}
                                </span>
                              }
                              options={atoOptions}
                              onChange={(v) => onAtoChange(demanda.id, v)}
                            />
                          </div>
                        </div>

                        {/* Prazo */}
                        <div className="flex items-center gap-2">
                          <span className="text-[8px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase w-10 flex-shrink-0">Prazo</span>
                          <div className="flex-1 min-w-0 flex items-center">
                            <InlineDatePicker
                              value={demanda.prazo}
                              onChange={(isoDate) => onPrazoChange(demanda.id, isoDate)}
                            />
                            {prazoInfo.cor === "red" && <AlertCircle className="w-3 h-3 text-rose-500 ml-1" />}
                          </div>
                        </div>

                        {/* Status */}
                        <div className="flex items-center gap-2">
                          <span className="text-[8px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase w-10 flex-shrink-0">Status</span>
                          <div className="flex-1 min-w-0">
                            <InlineDropdown
                              value={demanda.status}
                              compact
                              displayValue={
                                <div
                                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold"
                                  style={{ backgroundColor: `${statusColor}15`, color: statusColor }}
                                >
                                  <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: statusColor }} />
                                  <span className="truncate">{statusConfig.label}</span>
                                </div>
                              }
                              options={statusOptions}
                              onChange={(v) => onStatusChange(demanda.id, v)}
                            />
                          </div>
                        </div>

                        {/* Atribuição */}
                        <div className="flex items-center gap-2 col-span-2">
                          <span className="text-[8px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase w-10 flex-shrink-0">Atrib.</span>
                          <div className="flex-1 min-w-0">
                            <InlineDropdown
                              value={demanda.atribuicao}
                              compact
                              displayValue={
                                <div className="inline-flex items-center gap-1 text-[10px] font-medium" style={{ color: atribuicaoColor }}>
                                  <AtribuicaoIcon className="w-3 h-3" />
                                  <span className="truncate">{demanda.atribuicao}</span>
                                </div>
                              }
                              options={ATRIBUICAO_OPTIONS}
                              onChange={(v) => onAtribuicaoChange(demanda.id, v)}
                            />
                          </div>
                        </div>

                        {/* Providências */}
                        <div className="flex items-center gap-2 col-span-2">
                          <span className="text-[8px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase w-10 flex-shrink-0">Prov.</span>
                          <div className="flex-1 min-w-0">
                            <EditableTextInline
                              value={demanda.providencias || ""}
                              onSave={(v) => onProvidenciasChange(demanda.id, v)}
                              placeholder="+ providências"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Footer actions */}
                      <div className="flex items-center justify-end gap-0.5 pt-1.5 pl-[26px]">
                        <button
                          onClick={() => copyToClipboard(getRowTSV(demanda), "Linha copiada!")}
                          className="p-1.5 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-300 dark:text-zinc-600 hover:text-zinc-500"
                          title="Copiar linha"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onEdit(demanda)}
                          className="p-1.5 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-300 dark:text-zinc-600 hover:text-zinc-500"
                          title="Editar completo"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => demanda.arquivado ? onUnarchive(demanda.id) : onArchive(demanda.id)}
                          className="p-1.5 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-300 dark:text-zinc-600 hover:text-zinc-500"
                          title={demanda.arquivado ? "Restaurar" : "Arquivar"}
                        >
                          {demanda.arquivado ? <ArchiveRestore className="w-3.5 h-3.5" /> : <Archive className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
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
