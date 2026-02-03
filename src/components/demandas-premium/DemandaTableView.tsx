// @ts-nocheck
"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import {
  Lock,
  Flame,
  Edit,
  Archive,
  ArchiveRestore,
  Trash2,
  Copy,
  Check,
  ChevronDown,
  Save,
  X,
  MoreHorizontal,
  Calendar,
  MessageSquare,
  ExternalLink,
} from "lucide-react";
import { getStatusConfig, STATUS_GROUPS, DEMANDA_STATUS } from "@/config/demanda-status";
import { getAtosPorAtribuicao } from "@/config/atos-por-atribuicao";

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
  avatar?: string;
  status: string;
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

interface DemandaTableViewProps {
  demandas: Demanda[];
  atribuicaoIcons: Record<string, React.ComponentType<{ className?: string }>>;
  atribuicaoColors: Record<string, string>;
  onStatusChange: (id: string, status: string) => void;
  onEdit: (demanda: Demanda) => void;
  onArchive: (id: string) => void;
  onUnarchive: (id: string) => void;
  onDelete: (id: string) => void;
  copyToClipboard: (text: string, message?: string) => void;
  onAtoChange?: (id: string, ato: string) => void;
  onProvidenciasChange?: (id: string, providencias: string) => void;
  isSelectMode?: boolean;
  selectedIds?: Set<string>;
  onToggleSelect?: (id: string) => void;
}

// ============================================
// HELPERS
// ============================================

function calcularPrazo(prazoStr: string) {
  if (!prazoStr) return { texto: "-", cor: "none", dias: null };

  try {
    const [dia, mes, ano] = prazoStr.split("/").map(Number);
    const prazo = new Date(2000 + ano, mes - 1, dia);
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    prazo.setHours(0, 0, 0, 0);

    const diffTime = prazo.getTime() - hoje.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return { texto: `${Math.abs(diffDays)}d atrás`, cor: "red", dias: diffDays };
    if (diffDays === 0) return { texto: "Hoje", cor: "red", dias: 0 };
    if (diffDays === 1) return { texto: "Amanhã", cor: "amber", dias: 1 };
    if (diffDays <= 7) return { texto: `${diffDays} dias`, cor: "amber", dias: diffDays };
    if (diffDays <= 30) return { texto: `${diffDays} dias`, cor: "yellow", dias: diffDays };
    return { texto: prazoStr, cor: "gray", dias: diffDays };
  } catch {
    return { texto: prazoStr, cor: "gray", dias: null };
  }
}

function getInitials(name: string): string {
  if (!name) return "??";
  const parts = name.split(" ").filter(p => p.length > 2);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
}

// ============================================
// STATUS DOT COMPONENT
// ============================================

function StatusDot({ color, size = "normal" }: { color: string; size?: "small" | "normal" }) {
  const sizeClass = size === "small" ? "w-2 h-2" : "w-2.5 h-2.5";
  return (
    <span
      className={`${sizeClass} rounded-full flex-shrink-0 inline-block`}
      style={{ backgroundColor: color }}
    />
  );
}

// ============================================
// EDITABLE CELL COMPONENT
// ============================================

function EditableDropdown({
  value,
  displayValue,
  options,
  onChange,
  width = "auto",
  align = "left",
}: {
  value: string;
  displayValue: React.ReactNode;
  options: { value: string; label: string; color?: string; group?: string }[];
  onChange: (value: string) => void;
  width?: string;
  align?: "left" | "right";
}) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  // Agrupar opções por grupo se existir
  const groupedOptions = options.reduce((acc, opt) => {
    const group = opt.group || "default";
    if (!acc[group]) acc[group] = [];
    acc[group].push(opt);
    return acc;
  }, {} as Record<string, typeof options>);

  return (
    <div ref={ref} className="relative" style={{ width }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md px-2 py-1 transition-colors w-full text-left group/edit"
      >
        {displayValue}
        <ChevronDown className="w-3 h-3 text-zinc-400 opacity-0 group-hover/edit:opacity-100 transition-opacity flex-shrink-0" />
      </button>

      {isOpen && (
        <div
          className={`absolute ${align === "right" ? "right-0" : "left-0"} top-full mt-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg shadow-xl z-50 min-w-[200px] max-h-72 overflow-y-auto py-1`}
        >
          {Object.entries(groupedOptions).map(([group, opts], groupIndex) => (
            <div key={group}>
              {groupIndex > 0 && (
                <div className="my-1 border-t border-zinc-100 dark:border-zinc-800" />
              )}
              {opts.map((option) => (
                <button
                  key={option.value}
                  onClick={() => {
                    onChange(option.value);
                    setIsOpen(false);
                  }}
                  className={`w-full px-3 py-1.5 text-left text-[12px] flex items-center gap-2 transition-colors ${
                    option.value === value
                      ? "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400"
                      : "hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
                  }`}
                >
                  {option.color && <StatusDot color={option.color} size="small" />}
                  <span className="flex-1 truncate">{option.label}</span>
                  {option.value === value && <Check className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />}
                </button>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================
// EDITABLE TEXT COMPONENT
// ============================================

function EditableText({
  value,
  onSave,
  placeholder = "Clique para editar...",
  multiline = false,
}: {
  value: string;
  onSave: (value: string) => void;
  placeholder?: string;
  multiline?: boolean;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [tempValue, setTempValue] = useState(value);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleSave = () => {
    onSave(tempValue);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setTempValue(value);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSave();
    }
    if (e.key === "Escape") {
      handleCancel();
    }
  };

  if (isEditing) {
    return (
      <div className="flex items-center gap-1">
        {multiline ? (
          <textarea
            ref={inputRef as React.RefObject<HTMLTextAreaElement>}
            value={tempValue}
            onChange={(e) => setTempValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleSave}
            className="flex-1 text-[12px] px-2 py-1 rounded border border-emerald-300 dark:border-emerald-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 resize-none"
            rows={2}
          />
        ) : (
          <input
            ref={inputRef as React.RefObject<HTMLInputElement>}
            type="text"
            value={tempValue}
            onChange={(e) => setTempValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleSave}
            className="flex-1 text-[12px] px-2 py-1 rounded border border-emerald-300 dark:border-emerald-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
          />
        )}
      </div>
    );
  }

  return (
    <div
      onClick={() => {
        setTempValue(value);
        setIsEditing(true);
      }}
      className="cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded px-2 py-1 transition-colors group/text"
    >
      {value ? (
        <span className="text-[12px] text-zinc-600 dark:text-zinc-400">{value}</span>
      ) : (
        <span className="text-[12px] text-zinc-400 dark:text-zinc-500 italic">{placeholder}</span>
      )}
      <Edit className="w-3 h-3 text-zinc-400 inline-block ml-1 opacity-0 group-hover/text:opacity-100 transition-opacity" />
    </div>
  );
}

// ============================================
// TABLE ROW COMPONENT
// ============================================

function DemandaRow({
  demanda,
  statusColor,
  atribuicaoIcons,
  onStatusChange,
  onEdit,
  onArchive,
  onUnarchive,
  onDelete,
  copyToClipboard,
  onAtoChange,
  onProvidenciasChange,
  isSelectMode,
  isSelected,
  onToggleSelect,
}: {
  demanda: Demanda;
  statusColor: string;
  atribuicaoIcons: Record<string, React.ComponentType<{ className?: string }>>;
  onStatusChange: (id: string, status: string) => void;
  onEdit: (demanda: Demanda) => void;
  onArchive: (id: string) => void;
  onUnarchive: (id: string) => void;
  onDelete: (id: string) => void;
  copyToClipboard: (text: string, message?: string) => void;
  onAtoChange?: (id: string, ato: string) => void;
  onProvidenciasChange?: (id: string, providencias: string) => void;
  isSelectMode?: boolean;
  isSelected?: boolean;
  onToggleSelect?: (id: string) => void;
}) {
  const [showActions, setShowActions] = useState(false);
  const [copied, setCopied] = useState(false);
  const actionsRef = useRef<HTMLDivElement>(null);

  const prazoInfo = calcularPrazo(demanda.prazo);
  const statusConfig = getStatusConfig(demanda.status);
  const isUrgente = demanda.prioridade === "URGENTE" || demanda.prioridade === "REU_PRESO";
  const isPreso = demanda.estadoPrisional === "preso";
  const AtribuicaoIcon = atribuicaoIcons[demanda.atribuicao];

  // Status options com grupos
  const statusOptions = Object.entries(DEMANDA_STATUS).map(([key, config]) => ({
    value: key,
    label: config.label,
    color: STATUS_GROUPS[config.group].color,
    group: config.group,
  }));

  // Ato options
  const atoOptions = getAtosPorAtribuicao(demanda.atribuicao)
    .filter(a => a.value !== "Todos")
    .map(a => ({ value: a.value, label: a.label }));

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (actionsRef.current && !actionsRef.current.contains(e.target as Node)) {
        setShowActions(false);
      }
    };
    if (showActions) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showActions]);

  const handleCopy = (text: string) => {
    copyToClipboard(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div
      className={`group border-b border-zinc-100 dark:border-zinc-800 hover:bg-emerald-50/30 dark:hover:bg-emerald-950/10 transition-colors ${
        isUrgente ? "bg-rose-50/40 dark:bg-rose-950/20" : ""
      } ${isSelected ? "bg-emerald-50/50 dark:bg-emerald-950/20" : ""}`}
    >
      {/* Linha principal */}
      <div className="flex items-center px-3 py-2.5 gap-2">
        {/* Checkbox */}
        {isSelectMode && (
          <button
            onClick={() => onToggleSelect?.(demanda.id)}
            className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all flex-shrink-0 ${
              isSelected
                ? "border-emerald-500 bg-emerald-500"
                : "border-zinc-300 dark:border-zinc-600 hover:border-emerald-400"
            }`}
          >
            {isSelected && <Check className="w-3 h-3 text-white" />}
          </button>
        )}

        {/* Indicador de status (barra lateral) */}
        <div
          className="w-1 h-10 rounded-full flex-shrink-0"
          style={{ backgroundColor: statusColor }}
        />

        {/* Avatar */}
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center text-[12px] font-semibold text-zinc-600 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 flex-shrink-0"
        >
          {getInitials(demanda.assistido)}
        </div>

        {/* Nome do Assistido */}
        <div className="w-[180px] flex-shrink-0 min-w-0">
          <div className="flex items-center gap-1.5">
            {isUrgente && <Flame className="w-3 h-3 text-orange-500 flex-shrink-0" />}
            {isPreso && <Lock className="w-3 h-3 text-rose-500 flex-shrink-0" />}
            {demanda.assistidoId ? (
              <Link
                href={`/admin/assistidos/${demanda.assistidoId}`}
                className="text-[13px] font-semibold text-zinc-900 dark:text-zinc-100 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors truncate"
                title={demanda.assistido}
              >
                {demanda.assistido}
              </Link>
            ) : (
              <span className="text-[13px] font-semibold text-zinc-900 dark:text-zinc-100 truncate" title={demanda.assistido}>
                {demanda.assistido}
              </span>
            )}
          </div>
        </div>

        {/* Ato (editável) */}
        <div className="w-[160px] flex-shrink-0">
          {onAtoChange ? (
            <EditableDropdown
              value={demanda.ato}
              displayValue={
                <span className="text-[12px] text-zinc-600 dark:text-zinc-400 truncate">
                  {demanda.ato || "Selecionar ato..."}
                </span>
              }
              options={atoOptions}
              onChange={(value) => onAtoChange(demanda.id, value)}
            />
          ) : (
            <span className="text-[12px] text-zinc-500 dark:text-zinc-400 truncate px-2">
              {demanda.ato}
            </span>
          )}
        </div>

        {/* Status (editável) */}
        <div className="w-[140px] flex-shrink-0">
          <EditableDropdown
            value={demanda.status}
            displayValue={
              <div className="flex items-center gap-2">
                <StatusDot color={statusColor} />
                <span className="text-[12px] text-zinc-700 dark:text-zinc-300 truncate">
                  {statusConfig.label}
                </span>
              </div>
            }
            options={statusOptions}
            onChange={(value) => onStatusChange(demanda.id, value)}
          />
        </div>

        {/* Prazo */}
        <div className="w-[90px] flex-shrink-0 text-center">
          <span
            className={`text-[12px] font-medium inline-flex items-center gap-1 ${
              prazoInfo.cor === "red"
                ? "text-rose-600 dark:text-rose-400"
                : prazoInfo.cor === "amber"
                  ? "text-amber-600 dark:text-amber-400"
                  : prazoInfo.cor === "yellow"
                    ? "text-yellow-600 dark:text-yellow-500"
                    : "text-zinc-500 dark:text-zinc-400"
            }`}
            title={demanda.prazo}
          >
            {prazoInfo.cor !== "none" && prazoInfo.cor !== "gray" && (
              <Calendar className="w-3 h-3" />
            )}
            {prazoInfo.texto}
          </span>
        </div>

        {/* Processo */}
        <div className="w-[220px] flex-shrink-0">
          {demanda.processos.length > 0 ? (
            <div className="flex items-center gap-1">
              <span
                className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400 truncate cursor-pointer hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
                title={demanda.processos[0].numero}
                onClick={() => handleCopy(demanda.processos[0].numero)}
              >
                {demanda.processos[0].numero}
              </span>
              <button
                onClick={() => handleCopy(demanda.processos[0].numero)}
                className="p-0.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors opacity-0 group-hover:opacity-100 flex-shrink-0"
                title="Copiar número"
              >
                {copied ? (
                  <Check className="w-3 h-3 text-emerald-500" />
                ) : (
                  <Copy className="w-3 h-3 text-zinc-400" />
                )}
              </button>
              {demanda.processoId && (
                <Link
                  href={`/admin/processos/${demanda.processoId}`}
                  className="p-0.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors opacity-0 group-hover:opacity-100 flex-shrink-0"
                  title="Ver processo"
                >
                  <ExternalLink className="w-3 h-3 text-zinc-400 hover:text-emerald-500" />
                </Link>
              )}
            </div>
          ) : (
            <span className="text-[11px] text-zinc-400 px-2">-</span>
          )}
        </div>

        {/* Atribuição */}
        <div className="w-[120px] flex-shrink-0 hidden xl:flex items-center gap-1.5">
          {AtribuicaoIcon && (
            <AtribuicaoIcon className="w-3.5 h-3.5 text-zinc-400 flex-shrink-0" />
          )}
          <span className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate" title={demanda.atribuicao}>
            {demanda.atribuicao}
          </span>
        </div>

        {/* Ações */}
        <div className="w-[32px] flex-shrink-0 relative" ref={actionsRef}>
          <button
            onClick={() => setShowActions(!showActions)}
            className="p-1 rounded-md text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>

          {showActions && (
            <div className="absolute right-0 top-full mt-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg shadow-xl z-50 py-1 min-w-[140px]">
              <button
                onClick={() => {
                  onEdit(demanda);
                  setShowActions(false);
                }}
                className="w-full px-3 py-2 text-left text-[12px] flex items-center gap-2 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
              >
                <Edit className="w-3.5 h-3.5" />
                Editar completo
              </button>
              {demanda.arquivado ? (
                <button
                  onClick={() => {
                    onUnarchive(demanda.id);
                    setShowActions(false);
                  }}
                  className="w-full px-3 py-2 text-left text-[12px] flex items-center gap-2 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
                >
                  <ArchiveRestore className="w-3.5 h-3.5" />
                  Restaurar
                </button>
              ) : (
                <button
                  onClick={() => {
                    onArchive(demanda.id);
                    setShowActions(false);
                  }}
                  className="w-full px-3 py-2 text-left text-[12px] flex items-center gap-2 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
                >
                  <Archive className="w-3.5 h-3.5" />
                  Arquivar
                </button>
              )}
              <div className="my-1 border-t border-zinc-100 dark:border-zinc-800" />
              <button
                onClick={() => {
                  onDelete(demanda.id);
                  setShowActions(false);
                }}
                className="w-full px-3 py-2 text-left text-[12px] flex items-center gap-2 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-rose-600 dark:text-rose-400"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Excluir
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Linha de providências (editável) */}
      <div className="px-3 pb-2 pl-[52px]">
        {onProvidenciasChange ? (
          <div className="flex items-start gap-2">
            <MessageSquare className="w-3 h-3 text-zinc-400 mt-1.5 flex-shrink-0" />
            <EditableText
              value={demanda.providencias || ""}
              onSave={(value) => onProvidenciasChange(demanda.id, value)}
              placeholder="Adicionar providências..."
              multiline
            />
          </div>
        ) : demanda.providencias ? (
          <div className="flex items-start gap-2">
            <MessageSquare className="w-3 h-3 text-zinc-400 mt-0.5 flex-shrink-0" />
            <span className="text-[11px] text-zinc-500 dark:text-zinc-400 italic">
              {demanda.providencias}
            </span>
          </div>
        ) : null}
      </div>
    </div>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================

export function DemandaTableView({
  demandas,
  atribuicaoIcons,
  atribuicaoColors,
  onStatusChange,
  onEdit,
  onArchive,
  onUnarchive,
  onDelete,
  copyToClipboard,
  onAtoChange,
  onProvidenciasChange,
  isSelectMode,
  selectedIds,
  onToggleSelect,
}: DemandaTableViewProps) {
  return (
    <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm">
      {/* Header */}
      <div className="flex items-center px-3 py-2 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
        {isSelectMode && <div className="w-5 mr-2" />}
        <div className="w-1 mr-2" /> {/* Status bar */}
        <div className="w-9 mr-2" /> {/* Avatar */}
        <div className="w-[180px] flex-shrink-0">Assistido</div>
        <div className="w-[160px] flex-shrink-0">Ato</div>
        <div className="w-[140px] flex-shrink-0">Status</div>
        <div className="w-[90px] flex-shrink-0 text-center">Prazo</div>
        <div className="w-[220px] flex-shrink-0">Processo</div>
        <div className="w-[120px] flex-shrink-0 hidden xl:block">Atribuição</div>
        <div className="w-[32px] flex-shrink-0" />
      </div>

      {/* Rows */}
      <div>
        {demandas.map((demanda) => {
          const statusConfig = getStatusConfig(demanda.status);
          const statusColor = STATUS_GROUPS[statusConfig.group].color;

          return (
            <DemandaRow
              key={demanda.id}
              demanda={demanda}
              statusColor={statusColor}
              atribuicaoIcons={atribuicaoIcons}
              onStatusChange={onStatusChange}
              onEdit={onEdit}
              onArchive={onArchive}
              onUnarchive={onUnarchive}
              onDelete={onDelete}
              copyToClipboard={copyToClipboard}
              onAtoChange={onAtoChange}
              onProvidenciasChange={onProvidenciasChange}
              isSelectMode={isSelectMode}
              isSelected={selectedIds?.has(demanda.id)}
              onToggleSelect={onToggleSelect}
            />
          );
        })}
      </div>

      {/* Empty state */}
      {demandas.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-zinc-400">
          <span className="text-[14px]">Nenhuma demanda encontrada</span>
          <span className="text-[12px] mt-1">Tente ajustar os filtros</span>
        </div>
      )}

      {/* Footer com contagem */}
      {demandas.length > 0 && (
        <div className="px-4 py-2 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/30">
          <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
            {demandas.length} demanda{demandas.length !== 1 ? "s" : ""}
            {selectedIds && selectedIds.size > 0 && (
              <span className="ml-2 text-emerald-600 dark:text-emerald-400">
                • {selectedIds.size} selecionada{selectedIds.size !== 1 ? "s" : ""}
              </span>
            )}
          </span>
        </div>
      )}
    </div>
  );
}

export default DemandaTableView;
