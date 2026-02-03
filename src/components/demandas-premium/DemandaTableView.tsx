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
  MoreHorizontal,
  Calendar,
  Clock,
  MessageSquare,
  ExternalLink,
  AlertCircle,
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
  data: string; // Data de expedição/criação
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
    if (diffDays <= 7) return { texto: `${diffDays}d`, cor: "amber", dias: diffDays };
    if (diffDays <= 30) return { texto: `${diffDays}d`, cor: "yellow", dias: diffDays };
    return { texto: prazoStr, cor: "gray", dias: diffDays };
  } catch {
    return { texto: prazoStr, cor: "gray", dias: null };
  }
}

function formatarData(dataStr: string) {
  if (!dataStr) return "-";
  try {
    const [dia, mes] = dataStr.split("/");
    return `${dia}/${mes}`;
  } catch {
    return dataStr;
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
// DROPDOWN COMPONENT
// ============================================

function Dropdown({
  value,
  displayValue,
  options,
  onChange,
}: {
  value: string;
  displayValue: React.ReactNode;
  options: { value: string; label: string; color?: string; group?: string }[];
  onChange: (value: string) => void;
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

  const groupedOptions = options.reduce((acc, opt) => {
    const group = opt.group || "default";
    if (!acc[group]) acc[group] = [];
    acc[group].push(opt);
    return acc;
  }, {} as Record<string, typeof options>);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1 hover:bg-black/5 dark:hover:bg-white/5 rounded px-1.5 py-0.5 -mx-1.5 transition-colors group/btn"
      >
        {displayValue}
        <ChevronDown className="w-3 h-3 text-zinc-400 opacity-0 group-hover/btn:opacity-100 transition-opacity" />
      </button>

      {isOpen && (
        <div className="absolute left-0 top-full mt-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg shadow-xl z-50 min-w-[180px] max-h-64 overflow-y-auto py-1">
          {Object.entries(groupedOptions).map(([group, opts], gi) => (
            <div key={group}>
              {gi > 0 && <div className="my-1 border-t border-zinc-100 dark:border-zinc-800" />}
              {opts.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => { onChange(opt.value); setIsOpen(false); }}
                  className={`w-full px-3 py-1.5 text-left text-[12px] flex items-center gap-2 transition-colors ${
                    opt.value === value
                      ? "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300"
                      : "hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
                  }`}
                >
                  {opt.color && (
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: opt.color }} />
                  )}
                  <span className="flex-1">{opt.label}</span>
                  {opt.value === value && <Check className="w-3.5 h-3.5 text-emerald-500" />}
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
// EDITABLE TEXT
// ============================================

function EditableText({
  value,
  onSave,
  placeholder = "Adicionar...",
}: {
  value: string;
  onSave: (value: string) => void;
  placeholder?: string;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [temp, setTemp] = useState(value);
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isEditing && ref.current) {
      ref.current.focus();
    }
  }, [isEditing]);

  if (isEditing) {
    return (
      <textarea
        ref={ref}
        value={temp}
        onChange={(e) => setTemp(e.target.value)}
        onBlur={() => { onSave(temp); setIsEditing(false); }}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); onSave(temp); setIsEditing(false); }
          if (e.key === "Escape") { setTemp(value); setIsEditing(false); }
        }}
        className="w-full text-[11px] px-2 py-1 rounded border border-emerald-400 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-emerald-400/30 resize-none"
        rows={2}
      />
    );
  }

  return (
    <div
      onClick={() => { setTemp(value); setIsEditing(true); }}
      className="cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 rounded px-2 py-1 -mx-2 transition-colors"
    >
      {value ? (
        <span className="text-[11px] text-zinc-600 dark:text-zinc-400">{value}</span>
      ) : (
        <span className="text-[11px] text-zinc-400 italic">{placeholder}</span>
      )}
    </div>
  );
}

// ============================================
// ROW COMPONENT
// ============================================

function Row({
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
  const [showMenu, setShowMenu] = useState(false);
  const [copied, setCopied] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const prazoInfo = calcularPrazo(demanda.prazo);
  const statusConfig = getStatusConfig(demanda.status);
  const isUrgente = demanda.prioridade === "URGENTE" || demanda.prioridade === "REU_PRESO";
  const isPreso = demanda.estadoPrisional === "preso";
  const Icon = atribuicaoIcons[demanda.atribuicao];

  const statusOptions = Object.entries(DEMANDA_STATUS).map(([k, v]) => ({
    value: k, label: v.label, color: STATUS_GROUPS[v.group].color, group: v.group,
  }));

  const atoOptions = getAtosPorAtribuicao(demanda.atribuicao)
    .filter(a => a.value !== "Todos")
    .map(a => ({ value: a.value, label: a.label }));

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setShowMenu(false);
    };
    if (showMenu) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showMenu]);

  const copy = (text: string) => {
    copyToClipboard(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className={`group/row transition-all ${isUrgente ? "bg-rose-50/50 dark:bg-rose-950/20" : ""} ${isSelected ? "bg-emerald-50/60 dark:bg-emerald-950/20" : ""}`}>
      {/* Main Row */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-zinc-100 dark:border-zinc-800/50 hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30">

        {/* Select */}
        {isSelectMode && (
          <button
            onClick={() => onToggleSelect?.(demanda.id)}
            className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all flex-shrink-0 ${
              isSelected ? "border-emerald-500 bg-emerald-500" : "border-zinc-300 dark:border-zinc-600"
            }`}
          >
            {isSelected && <Check className="w-2.5 h-2.5 text-white" />}
          </button>
        )}

        {/* Status Bar */}
        <div className="w-1 h-12 rounded-full flex-shrink-0" style={{ backgroundColor: statusColor }} />

        {/* Avatar */}
        <div className="w-10 h-10 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-[13px] font-semibold text-zinc-600 dark:text-zinc-300 flex-shrink-0">
          {getInitials(demanda.assistido)}
        </div>

        {/* Main Content */}
        <div className="flex-1 min-w-0 grid grid-cols-12 gap-4 items-center">

          {/* Col 1: Assistido + Ato (4 cols) */}
          <div className="col-span-4 min-w-0">
            <div className="flex items-center gap-1.5 mb-0.5">
              {isUrgente && <Flame className="w-3.5 h-3.5 text-orange-500 flex-shrink-0" />}
              {isPreso && <Lock className="w-3.5 h-3.5 text-rose-500 flex-shrink-0" />}
              {demanda.assistidoId ? (
                <Link
                  href={`/admin/assistidos/${demanda.assistidoId}`}
                  className="text-[13px] font-semibold text-zinc-900 dark:text-zinc-100 hover:text-emerald-600 truncate"
                >
                  {demanda.assistido}
                </Link>
              ) : (
                <span className="text-[13px] font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                  {demanda.assistido}
                </span>
              )}
            </div>
            {onAtoChange ? (
              <Dropdown
                value={demanda.ato}
                displayValue={<span className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate">{demanda.ato || "Selecionar ato"}</span>}
                options={atoOptions}
                onChange={(v) => onAtoChange(demanda.id, v)}
              />
            ) : (
              <span className="text-[11px] text-zinc-500 truncate">{demanda.ato}</span>
            )}
          </div>

          {/* Col 2: Status (2 cols) */}
          <div className="col-span-2">
            <Dropdown
              value={demanda.status}
              displayValue={
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: statusColor }} />
                  <span className="text-[12px] text-zinc-700 dark:text-zinc-300 truncate">{statusConfig.label}</span>
                </div>
              }
              options={statusOptions}
              onChange={(v) => onStatusChange(demanda.id, v)}
            />
          </div>

          {/* Col 3: Datas - Expedição + Prazo (2 cols) */}
          <div className="col-span-2 text-center">
            <div className="text-[10px] text-zinc-400 dark:text-zinc-500 mb-0.5">
              Exp: {formatarData(demanda.data)}
            </div>
            <div className={`text-[12px] font-medium inline-flex items-center gap-1 ${
              prazoInfo.cor === "red" ? "text-rose-600 dark:text-rose-400" :
              prazoInfo.cor === "amber" ? "text-amber-600 dark:text-amber-400" :
              prazoInfo.cor === "yellow" ? "text-yellow-600" : "text-zinc-500"
            }`}>
              {prazoInfo.cor === "red" && <AlertCircle className="w-3 h-3" />}
              {prazoInfo.texto}
            </div>
          </div>

          {/* Col 4: Processo (3 cols) */}
          <div className="col-span-3">
            {demanda.processos.length > 0 ? (
              <div className="flex items-center gap-1">
                <span
                  className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400 truncate cursor-pointer hover:text-emerald-600 transition-colors"
                  onClick={() => copy(demanda.processos[0].numero)}
                  title={demanda.processos[0].numero}
                >
                  {demanda.processos[0].numero}
                </span>
                <button
                  onClick={() => copy(demanda.processos[0].numero)}
                  className="p-0.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 opacity-0 group-hover/row:opacity-100 transition-all"
                >
                  {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3 text-zinc-400" />}
                </button>
                {demanda.processoId && (
                  <Link
                    href={`/admin/processos/${demanda.processoId}`}
                    className="p-0.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 opacity-0 group-hover/row:opacity-100 transition-all"
                  >
                    <ExternalLink className="w-3 h-3 text-zinc-400 hover:text-emerald-500" />
                  </Link>
                )}
              </div>
            ) : (
              <span className="text-[11px] text-zinc-400">-</span>
            )}
          </div>

          {/* Col 5: Atribuição (1 col) */}
          <div className="col-span-1 hidden lg:flex items-center gap-1">
            {Icon && <Icon className="w-3.5 h-3.5 text-zinc-400" />}
            <span className="text-[10px] text-zinc-500 truncate" title={demanda.atribuicao}>
              {demanda.atribuicao.split(" ")[0]}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div ref={menuRef} className="relative flex-shrink-0">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-1.5 rounded-md text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>

          {showMenu && (
            <div className="absolute right-0 top-full mt-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg shadow-xl z-50 py-1 w-36">
              <button onClick={() => { onEdit(demanda); setShowMenu(false); }} className="w-full px-3 py-1.5 text-left text-[12px] flex items-center gap-2 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                <Edit className="w-3.5 h-3.5" /> Editar
              </button>
              {demanda.arquivado ? (
                <button onClick={() => { onUnarchive(demanda.id); setShowMenu(false); }} className="w-full px-3 py-1.5 text-left text-[12px] flex items-center gap-2 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                  <ArchiveRestore className="w-3.5 h-3.5" /> Restaurar
                </button>
              ) : (
                <button onClick={() => { onArchive(demanda.id); setShowMenu(false); }} className="w-full px-3 py-1.5 text-left text-[12px] flex items-center gap-2 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                  <Archive className="w-3.5 h-3.5" /> Arquivar
                </button>
              )}
              <div className="my-1 border-t border-zinc-100 dark:border-zinc-800" />
              <button onClick={() => { onDelete(demanda.id); setShowMenu(false); }} className="w-full px-3 py-1.5 text-left text-[12px] flex items-center gap-2 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-rose-600">
                <Trash2 className="w-3.5 h-3.5" /> Excluir
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Providências Row */}
      {(onProvidenciasChange || demanda.providencias) && (
        <div className="pl-[72px] pr-4 pb-2 border-b border-zinc-100 dark:border-zinc-800/50">
          <div className="flex items-start gap-2">
            <MessageSquare className="w-3 h-3 text-zinc-400 mt-1 flex-shrink-0" />
            {onProvidenciasChange ? (
              <EditableText
                value={demanda.providencias || ""}
                onSave={(v) => onProvidenciasChange(demanda.id, v)}
                placeholder="Adicionar providências..."
              />
            ) : (
              <span className="text-[11px] text-zinc-500 italic">{demanda.providencias}</span>
            )}
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
      <div className="flex items-center gap-3 px-4 py-2.5 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/80 dark:bg-zinc-800/50">
        {isSelectMode && <div className="w-4" />}
        <div className="w-1" />
        <div className="w-10" />
        <div className="flex-1 grid grid-cols-12 gap-4 text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
          <div className="col-span-4">Assistido / Ato</div>
          <div className="col-span-2">Status</div>
          <div className="col-span-2 text-center">Exp. / Prazo</div>
          <div className="col-span-3">Processo</div>
          <div className="col-span-1 hidden lg:block">Atrib.</div>
        </div>
        <div className="w-8" />
      </div>

      {/* Rows */}
      <div>
        {demandas.map((d) => {
          const cfg = getStatusConfig(d.status);
          const color = STATUS_GROUPS[cfg.group].color;
          return (
            <Row
              key={d.id}
              demanda={d}
              statusColor={color}
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
              isSelected={selectedIds?.has(d.id)}
              onToggleSelect={onToggleSelect}
            />
          );
        })}
      </div>

      {/* Empty */}
      {demandas.length === 0 && (
        <div className="py-16 text-center text-zinc-400">
          <p className="text-sm">Nenhuma demanda encontrada</p>
          <p className="text-xs mt-1">Ajuste os filtros ou crie uma nova demanda</p>
        </div>
      )}

      {/* Footer */}
      {demandas.length > 0 && (
        <div className="px-4 py-2 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/30 flex items-center justify-between">
          <span className="text-[11px] text-zinc-500">
            {demandas.length} demanda{demandas.length !== 1 && "s"}
            {selectedIds && selectedIds.size > 0 && (
              <span className="ml-2 text-emerald-600 font-medium">• {selectedIds.size} selecionada{selectedIds.size !== 1 && "s"}</span>
            )}
          </span>
        </div>
      )}
    </div>
  );
}

export default DemandaTableView;
