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
  CheckCircle,
  ChevronDown,
  Save,
  X,
  MoreHorizontal,
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
  if (!prazoStr) return { texto: "", cor: "none", vencido: false };

  try {
    const [dia, mes, ano] = prazoStr.split("/").map(Number);
    const prazo = new Date(2000 + ano, mes - 1, dia);
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    prazo.setHours(0, 0, 0, 0);

    const diffTime = prazo.getTime() - hoje.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return { texto: "Vencido", cor: "red", vencido: true };
    if (diffDays === 0) return { texto: "Hoje", cor: "red", vencido: false };
    if (diffDays === 1) return { texto: "Amanhã", cor: "amber", vencido: false };
    if (diffDays <= 3) return { texto: `${diffDays}d`, cor: "amber", vencido: false };
    if (diffDays <= 7) return { texto: `${diffDays}d`, cor: "yellow", vencido: false };
    return { texto: prazoStr, cor: "gray", vencido: false };
  } catch {
    return { texto: prazoStr, cor: "gray", vencido: false };
  }
}

// Gera iniciais do assistido para o avatar
function getInitials(name: string): string {
  const parts = name.split(" ").filter(p => p.length > 2);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
}

// ============================================
// STATUS DOT COMPONENT (estilo assistidos)
// ============================================

function StatusDot({ color, label }: { color: string; label?: string }) {
  return (
    <div className="flex items-center gap-2">
      <span
        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
        style={{ backgroundColor: color }}
      />
      {label && (
        <span className="text-[13px] text-zinc-600 dark:text-zinc-400">
          {label}
        </span>
      )}
    </div>
  );
}

// ============================================
// AVATAR COMPONENT
// ============================================

function Avatar({
  initials,
  borderColor,
}: {
  initials: string;
  borderColor: string;
}) {
  return (
    <div
      className="w-10 h-10 rounded-full flex items-center justify-center text-[13px] font-semibold text-zinc-600 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 flex-shrink-0"
      style={{ borderLeft: `3px solid ${borderColor}` }}
    >
      {initials}
    </div>
  );
}

// ============================================
// INLINE DROPDOWN COMPONENT
// ============================================

function InlineDropdown({
  value,
  options,
  onChange,
  renderValue,
}: {
  value: string;
  options: { value: string; label: string; color?: string }[];
  onChange: (value: string) => void;
  renderValue?: (option: { value: string; label: string; color?: string }) => React.ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const currentOption = options.find(o => o.value === value);

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

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded px-1.5 py-0.5 transition-colors text-left"
      >
        {renderValue && currentOption ? (
          renderValue(currentOption)
        ) : (
          <span className="text-[13px] text-zinc-700 dark:text-zinc-300">
            {currentOption?.label || value}
          </span>
        )}
        <ChevronDown className="w-3 h-3 text-zinc-400" />
      </button>

      {isOpen && (
        <div className="absolute left-0 top-full mt-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg shadow-xl z-50 min-w-[180px] max-h-64 overflow-y-auto py-1">
          {options.map((option) => (
            <button
              key={option.value}
              onClick={() => {
                onChange(option.value);
                setIsOpen(false);
              }}
              className={`w-full px-3 py-2 text-left text-[13px] flex items-center gap-2 transition-colors ${
                option.value === value
                  ? "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400"
                  : "hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
              }`}
            >
              {option.color && (
                <span
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: option.color }}
                />
              )}
              <span className="flex-1">{option.label}</span>
              {option.value === value && (
                <Check className="w-3.5 h-3.5 text-emerald-500" />
              )}
            </button>
          ))}
        </div>
      )}
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
  const [isEditingProv, setIsEditingProv] = useState(false);
  const [provTemp, setProvTemp] = useState(demanda.providencias || "");
  const [showActions, setShowActions] = useState(false);
  const [copied, setCopied] = useState(false);
  const actionsRef = useRef<HTMLDivElement>(null);

  const prazoInfo = calcularPrazo(demanda.prazo);
  const statusConfig = getStatusConfig(demanda.status);
  const isUrgente = demanda.prioridade === "URGENTE" || demanda.prioridade === "REU_PRESO";
  const isPreso = demanda.estadoPrisional === "preso";
  const AtribuicaoIcon = atribuicaoIcons[demanda.atribuicao];

  // Status options
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

  // Close actions on click outside
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

  const handleSaveProv = () => {
    onProvidenciasChange?.(demanda.id, provTemp);
    setIsEditingProv(false);
  };

  return (
    <div
      className={`group border-b border-zinc-100 dark:border-zinc-800 hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30 transition-colors ${
        isUrgente ? "bg-rose-50/30 dark:bg-rose-950/10" : ""
      }`}
    >
      <div className="flex items-center px-4 py-3 gap-4">
        {/* Checkbox de seleção */}
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

        {/* Avatar com borda colorida */}
        <Avatar initials={getInitials(demanda.assistido)} borderColor={statusColor} />

        {/* Conteúdo principal - nome e ato */}
        <div className="flex-1 min-w-[180px]">
          <div className="flex items-center gap-2">
            {isUrgente && <Flame className="w-3.5 h-3.5 text-orange-500 flex-shrink-0" />}
            {isPreso && <Lock className="w-3.5 h-3.5 text-rose-500 flex-shrink-0" />}

            {demanda.assistidoId ? (
              <Link
                href={`/admin/assistidos/${demanda.assistidoId}`}
                className="text-[14px] font-semibold text-zinc-900 dark:text-zinc-100 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors truncate"
              >
                {demanda.assistido}
              </Link>
            ) : (
              <span className="text-[14px] font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                {demanda.assistido}
              </span>
            )}
          </div>

          {/* Ato - clicável para editar */}
          {onAtoChange ? (
            <InlineDropdown
              value={demanda.ato}
              options={atoOptions}
              onChange={(value) => onAtoChange(demanda.id, value)}
              renderValue={(opt) => (
                <span className="text-[12px] text-zinc-500 dark:text-zinc-400">
                  {opt.label}
                </span>
              )}
            />
          ) : (
            <span className="text-[12px] text-zinc-500 dark:text-zinc-400">
              {demanda.ato}
            </span>
          )}
        </div>

        {/* Status com dot */}
        <div className="w-[130px] flex-shrink-0">
          <InlineDropdown
            value={demanda.status}
            options={statusOptions}
            onChange={(value) => onStatusChange(demanda.id, value)}
            renderValue={(opt) => <StatusDot color={opt.color!} label={opt.label} />}
          />
        </div>

        {/* Prazo */}
        <div className="w-[90px] flex-shrink-0 text-center">
          {prazoInfo.cor === "none" ? (
            <span className="text-[12px] text-zinc-400">-</span>
          ) : (
            <span
              className={`text-[12px] font-medium ${
                prazoInfo.cor === "red"
                  ? "text-rose-600 dark:text-rose-400"
                  : prazoInfo.cor === "amber"
                    ? "text-amber-600 dark:text-amber-400"
                    : prazoInfo.cor === "yellow"
                      ? "text-yellow-600 dark:text-yellow-500"
                      : "text-zinc-500 dark:text-zinc-400"
              }`}
            >
              {prazoInfo.texto}
            </span>
          )}
        </div>

        {/* Processo com copy */}
        <div className="w-[200px] flex-shrink-0">
          {demanda.processos.length > 0 ? (
            <div className="flex items-center gap-1.5">
              <span
                className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400 truncate cursor-pointer hover:text-zinc-700 dark:hover:text-zinc-300"
                title={demanda.processos[0].numero}
              >
                {demanda.processos[0].numero}
              </span>
              <button
                onClick={() => handleCopy(demanda.processos[0].numero)}
                className="p-0.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors opacity-0 group-hover:opacity-100 flex-shrink-0"
              >
                {copied ? (
                  <Check className="w-3 h-3 text-emerald-500" />
                ) : (
                  <Copy className="w-3 h-3 text-zinc-400" />
                )}
              </button>
            </div>
          ) : (
            <span className="text-[11px] text-zinc-400">-</span>
          )}
        </div>

        {/* Atribuição com ícone */}
        <div className="w-[130px] flex-shrink-0 hidden xl:block">
          <div className="flex items-center gap-1.5">
            {AtribuicaoIcon && (
              <AtribuicaoIcon className="w-3.5 h-3.5 text-zinc-400 flex-shrink-0" />
            )}
            <span className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate" title={demanda.atribuicao}>
              {demanda.atribuicao}
            </span>
          </div>
        </div>

        {/* Ações */}
        <div className="w-[36px] flex-shrink-0 relative" ref={actionsRef}>
          <button
            onClick={() => setShowActions(!showActions)}
            className="p-1.5 rounded-md text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors opacity-0 group-hover:opacity-100"
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
                className="w-full px-3 py-2 text-left text-[13px] flex items-center gap-2 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
              >
                <Edit className="w-3.5 h-3.5" />
                Editar
              </button>
              {demanda.arquivado ? (
                <button
                  onClick={() => {
                    onUnarchive(demanda.id);
                    setShowActions(false);
                  }}
                  className="w-full px-3 py-2 text-left text-[13px] flex items-center gap-2 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
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
                  className="w-full px-3 py-2 text-left text-[13px] flex items-center gap-2 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
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
                className="w-full px-3 py-2 text-left text-[13px] flex items-center gap-2 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-rose-600 dark:text-rose-400"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Excluir
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Providências - linha expandida quando editando */}
      {isEditingProv && (
        <div className="px-4 pb-3 pt-0">
          <div className="flex items-start gap-2 ml-14">
            <textarea
              value={provTemp}
              onChange={(e) => setProvTemp(e.target.value)}
              className="flex-1 text-[12px] px-2 py-1.5 rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 resize-none"
              rows={2}
              placeholder="Adicionar providências..."
              autoFocus
            />
            <button
              onClick={handleSaveProv}
              className="p-1.5 rounded bg-emerald-500 text-white hover:bg-emerald-600 transition-colors"
            >
              <Save className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setIsEditingProv(false)}
              className="p-1.5 rounded bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-300 dark:hover:bg-zinc-600 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Providências - mostrar se tem e não está editando */}
      {!isEditingProv && demanda.providencias && (
        <div className="px-4 pb-2 pt-0">
          <div
            className="ml-14 text-[11px] text-zinc-500 dark:text-zinc-400 italic cursor-pointer hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors truncate max-w-[600px]"
            onClick={() => {
              setProvTemp(demanda.providencias);
              setIsEditingProv(true);
            }}
            title={demanda.providencias}
          >
            📝 {demanda.providencias}
          </div>
        </div>
      )}
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
    <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
      {/* Header */}
      <div className="flex items-center px-4 py-2.5 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/30 text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
        {isSelectMode && <div className="w-5 mr-4" />}
        <div className="w-10 mr-4" /> {/* Avatar space */}
        <div className="flex-1 min-w-[180px]">Assistido / Ato</div>
        <div className="w-[130px] flex-shrink-0">Status</div>
        <div className="w-[90px] flex-shrink-0 text-center">Prazo</div>
        <div className="w-[200px] flex-shrink-0">Processo</div>
        <div className="w-[130px] flex-shrink-0 hidden xl:block">Atribuição</div>
        <div className="w-[36px] flex-shrink-0" />
      </div>

      {/* Rows */}
      <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
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
        <div className="flex flex-col items-center justify-center py-12 text-zinc-400">
          <span className="text-[14px]">Nenhuma demanda encontrada</span>
        </div>
      )}
    </div>
  );
}

export default DemandaTableView;
