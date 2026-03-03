"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Calendar,
  Clock,
  FileText,
  MoreVertical,
  Pencil,
  Trash2,
  Archive,
  Copy,
  CheckCircle,
  AlertCircle,
  Lock,
  User,
  Edit,
  ChevronRight,
  ChevronDown,
  ArchiveRestore,
  Flame,
  Search,
  MessageSquarePlus,
  Save,
  X,
  UserPlus,
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { getStatusConfig, STATUS_GROUPS, DEMANDA_STATUS } from "@/config/demanda-status";
import { AssistidoAvatar } from "@/components/demandas-premium/assistido-avatar";
import { CopyProcessButton } from "@/components/demandas-premium/CopyProcessButton";

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

interface DemandaCardProps {
  demanda: Demanda;
  borderColor: string;
  atribuicaoIcons: Record<string, React.ComponentType<{ className?: string }>>;
  atribuicaoColors: Record<string, string>;
  onStatusChange: (id: string, status: string) => void;
  onEdit: (demanda: Demanda) => void;
  onArchive: (id: string) => void;
  onUnarchive: (id: string) => void;
  onDelete: (id: string) => void;
  copyToClipboard: (text: string, message?: string) => void;
  onAtoChange?: (id: string, ato: string) => void; // Novo callback para mudança de ato
  atoOptions?: Array<{ value: string; label: string }>; // Lista de atos disponíveis
  onProvidenciasChange?: (id: string, providencias: string) => void; // Callback para mudança de providências
  onAtribuicaoChange?: (id: string, atribuicao: string) => void;
  onDelegate?: (demanda: Demanda) => void;
  isSelectMode?: boolean;
  isSelected?: boolean;
  onToggleSelect?: (id: string) => void;
}

const ATRIBUICAO_OPTIONS = [
  { value: "Tribunal do Júri", label: "Tribunal do Júri" },
  { value: "Grupo Especial do Júri", label: "Grupo Esp. Júri" },
  { value: "Violência Doméstica", label: "Violência Doméstica" },
  { value: "Execução Penal", label: "Execução Penal" },
  { value: "Substituição Criminal", label: "Substituição Criminal" },
  { value: "Curadoria Especial", label: "Curadoria Especial" },
];

const ATRIBUICAO_BORDER_COLORS: Record<string, string> = {
  "Tribunal do Júri": "#22c55e",
  "Grupo Especial do Júri": "#f97316",
  "Violência Doméstica": "#f59e0b",
  "Execução Penal": "#3b82f6",
  "Substituição Criminal": "#8b5cf6",
  "Curadoria Especial": "#71717a",
};

export function DemandaCard({
  demanda,
  borderColor,
  atribuicaoIcons,
  atribuicaoColors,
  onStatusChange,
  onEdit,
  onArchive,
  onUnarchive,
  onDelete,
  onAtoChange,
  atoOptions,
  onProvidenciasChange,
  onAtribuicaoChange,
  onDelegate,
  isSelectMode,
  isSelected,
  onToggleSelect,
}: DemandaCardProps) {
  const [showProvidencias, setShowProvidencias] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [showAtoDropdown, setShowAtoDropdown] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showAtribuicaoDropdown, setShowAtribuicaoDropdown] = useState(false);
  const [isEditingProvidencias, setIsEditingProvidencias] = useState(false);
  const [providenciasTemp, setProvidenciasTemp] = useState(demanda.providencias || "");
  const menuRef = useRef<HTMLDivElement>(null);

  const calcularPrazo = (prazoStr: string) => {
    if (!prazoStr) return { texto: "", cor: "gray" };
    
    try {
      const [dia, mes, ano] = prazoStr.split('/').map(Number);
      const prazo = new Date(2000 + ano, mes - 1, dia);
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);
      prazo.setHours(0, 0, 0, 0);
      
      const diffTime = prazo.getTime() - hoje.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays < 0) return { texto: "Vencido", cor: "red" };
      if (diffDays === 0) return { texto: "Hoje", cor: "red" };
      if (diffDays === 1) return { texto: "Amanhã", cor: "red" };
      if (diffDays <= 3) return { texto: `${diffDays} dias`, cor: "yellow" };
      if (diffDays <= 7) return { texto: `${diffDays} dias`, cor: "yellow" };
      return { texto: `${diffDays} dias`, cor: "gray" };
    } catch {
      return { texto: prazoStr, cor: "gray" };
    }
  };

  const prazoInfo = calcularPrazo(demanda.prazo);
  const AtribuicaoIcon = atribuicaoIcons[demanda.atribuicao];

  // Todos os status disponíveis organizados por grupo
  const allStatuses = Object.entries(DEMANDA_STATUS).map(([key, config]) => ({
    value: key,
    label: config.label,
    color: STATUS_GROUPS[config.group].color,
    group: config.group
  }));

  // Converter borderColor hex para rgba para efeitos suaves
  const hexToRgba = (hex: string, alpha: number) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  const handleStatusClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowStatusDropdown(!showStatusDropdown);
  };

  const handleStatusSelect = (newStatus: string) => {
    onStatusChange(demanda.id, newStatus);
    setShowStatusDropdown(false);
  };

  const handleAtoClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowAtoDropdown(!showAtoDropdown);
  };

  const handleAtoSelect = (newAto: string) => {
    if (onAtoChange) {
      onAtoChange(demanda.id, newAto);
    }
    setShowAtoDropdown(false);
  };

  const handleStartEditProvidencias = (e: React.MouseEvent) => {
    e.stopPropagation();
    setProvidenciasTemp(demanda.providencias || "");
    setIsEditingProvidencias(true);
    setShowProvidencias(true);
  };

  const handleSaveProvidencias = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onProvidenciasChange) {
      onProvidenciasChange(demanda.id, providenciasTemp);
    }
    setIsEditingProvidencias(false);
  };

  const handleCancelProvidencias = (e: React.MouseEvent) => {
    e.stopPropagation();
    setProvidenciasTemp(demanda.providencias || "");
    setIsEditingProvidencias(false);
  };

  // Fechar dropdowns ao clicar fora
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      setShowStatusDropdown(false);
      setShowAtoDropdown(false);
    };

    if (showStatusDropdown || showAtoDropdown) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showStatusDropdown, showAtoDropdown]);

  // Fechar menu de ações ao clicar fora
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };

    if (showMenu) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showMenu]);

  // Fechar dropdown de atribuição ao clicar fora
  useEffect(() => {
    const handleClickOutside = () => setShowAtribuicaoDropdown(false);
    if (showAtribuicaoDropdown) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showAtribuicaoDropdown]);

  return (
    <div
      className={`group relative transition-all duration-300 ease-out rounded-xl overflow-hidden ${
        showStatusDropdown || showAtoDropdown || showMenu || showAtribuicaoDropdown ? 'z-[999]' : 'z-0'
      }`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Linha indicadora lateral de atribuição — clicável para mudar */}
      <div className="absolute left-0 top-0 bottom-0 z-20">
        <button
          onClick={(e) => { e.stopPropagation(); setShowAtribuicaoDropdown(!showAtribuicaoDropdown); }}
          className="w-1.5 h-full rounded-l-lg transition-all duration-300 hover:w-3 cursor-pointer"
          style={{
            backgroundColor: borderColor,
            opacity: isHovered || showAtribuicaoDropdown ? 1 : 0.7
          }}
          title={`Atribuição: ${demanda.atribuicao}\nClique para alterar`}
        />
        {showAtribuicaoDropdown && (
          <div
            className="absolute left-3 top-2 w-48 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-xl z-50 overflow-hidden py-1"
            style={{ animation: 'fadeInDown 0.15s ease-out' }}
          >
            {ATRIBUICAO_OPTIONS.map((opt) => {
              const optColor = ATRIBUICAO_BORDER_COLORS[opt.value] || "#71717a";
              const isCurrentAtribuicao = opt.value === demanda.atribuicao;
              return (
                <button
                  key={opt.value}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onAtribuicaoChange) onAtribuicaoChange(demanda.id, opt.value);
                    setShowAtribuicaoDropdown(false);
                  }}
                  className={`w-full px-3 py-2 text-left text-[11px] flex items-center gap-2.5 transition-colors ${
                    isCurrentAtribuicao
                      ? 'bg-emerald-50 dark:bg-emerald-950/30 font-bold'
                      : 'hover:bg-zinc-50 dark:hover:bg-zinc-800'
                  }`}
                >
                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: optColor }} />
                  <span style={{ color: isCurrentAtribuicao ? optColor : undefined }} className={isCurrentAtribuicao ? '' : 'text-zinc-700 dark:text-zinc-300'}>{opt.label}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Checkbox de seleção */}
      {isSelectMode && (
        <button
          onClick={(e) => { e.stopPropagation(); onToggleSelect?.(demanda.id); }}
          className="absolute left-3 top-1/2 -translate-y-1/2 z-10 flex items-center justify-center w-5 h-5 rounded border transition-all duration-200"
          style={{
            borderColor: isSelected ? borderColor : undefined,
            backgroundColor: isSelected ? borderColor : undefined,
          }}
        >
          {isSelected && <CheckCircle className="w-3.5 h-3.5 text-white" />}
        </button>
      )}

      {/* Conteúdo do Card */}
      <div
        className={`relative bg-white dark:bg-zinc-900 p-4 md:p-3 rounded-r-xl border border-l-0 border-zinc-200/80 dark:border-zinc-800/80 transition-all duration-200 ${isSelectMode ? "ml-8" : "ml-2.5"}`}
        style={{
          boxShadow: isHovered
            ? '0 4px 16px rgba(0, 0, 0, 0.08), 0 1px 4px rgba(0, 0, 0, 0.04)'
            : '0 1px 3px rgba(0, 0, 0, 0.04), 0 0.5px 1px rgba(0, 0, 0, 0.02)',
          transform: isHovered ? 'translateX(2px)' : 'translateX(0)',
        }}
      >
        {/* Mobile Layout (< md) */}
        <div className="block md:hidden space-y-4">
          {/* Header: Nome + Status */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <div className="relative flex-shrink-0">
                <AssistidoAvatar name={demanda.assistido} photoUrl={demanda.avatar} />
                {demanda.prioridade === "URGENTE" && (
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-gradient-to-br from-orange-500 to-red-500 rounded-full flex items-center justify-center shadow-lg">
                    <Flame className="w-2.5 h-2.5 text-white" />
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  {demanda.assistidoId ? (
                    <Link href={`/admin/assistidos/${demanda.assistidoId}`}>
                      <h4 className="text-base font-bold text-zinc-900 dark:text-zinc-50 hover:text-primary transition-colors break-words">
                        {demanda.assistido}
                      </h4>
                    </Link>
                  ) : (
                    <h4 className="text-base font-bold text-zinc-900 dark:text-zinc-50 break-words">
                      {demanda.assistido}
                    </h4>
                  )}
                  {demanda.estadoPrisional === "preso" && (
                    <Lock className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0" />
                  )}
                </div>
                {/* Ato */}
                {onAtoChange && atoOptions && atoOptions.length > 0 ? (
                  <div className="relative inline-block">
                    <button
                      onClick={handleAtoClick}
                      className="text-sm font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wide hover:text-blue-600 dark:hover:text-blue-400 transition-colors flex items-center gap-1 group/ato"
                    >
                      {demanda.ato}
                      <Edit className="w-3 h-3 opacity-50 group-hover/ato:opacity-100 transition-opacity" />
                    </button>
                    {showAtoDropdown && (
                      <div 
                        className="fixed inset-x-4 bottom-20 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-2xl z-[999] overflow-hidden"
                        style={{
                          animation: 'fadeInUp 0.2s ease-out',
                          maxHeight: '50vh'
                        }}
                      >
                        <div className="max-h-[50vh] overflow-y-auto">
                          {atoOptions
                            .filter(ato => ato.value !== "Todos")
                            .map((ato) => {
                              const isCurrentAto = ato.value === demanda.ato;
                              return (
                                <button
                                  key={ato.value}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleAtoSelect(ato.value);
                                  }}
                                  className={`w-full px-4 py-3 text-left text-sm font-semibold flex items-center gap-3 transition-all ${
                                    isCurrentAto
                                      ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400'
                                      : 'hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
                                  }`}
                                >
                                  <span className="flex-1">{ato.label}</span>
                                  {isCurrentAto && (
                                    <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                                  )}
                                </button>
                              );
                            })}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-sm font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wide">
                    {demanda.ato}
                  </p>
                )}
              </div>
            </div>

            {/* Status Badge */}
            <button
              onClick={handleStatusClick}
              className="flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all hover:scale-105"
              style={{ 
                backgroundColor: hexToRgba(borderColor, 0.12),
                color: borderColor,
                border: `1px solid ${hexToRgba(borderColor, 0.3)}`,
              }}
            >
              {demanda.status}
              <ChevronDown className="w-3 h-3 opacity-60" />
            </button>
          </div>

          {/* Info Grid: Atribuição + Prazo */}
          <div className="grid grid-cols-2 gap-3">
            {/* Atribuição */}
            {AtribuicaoIcon && (
              <div className="flex items-center gap-2 p-2.5 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg">
                <AtribuicaoIcon className={`w-4 h-4 ${atribuicaoColors[demanda.atribuicao]} flex-shrink-0`} />
                <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300 truncate">
                  {demanda.atribuicao}
                </span>
              </div>
            )}
            
            {/* Prazo */}
            {prazoInfo.texto ? (
              <div className="flex items-center gap-2 p-2.5 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg">
                <Clock className={`w-4 h-4 flex-shrink-0 ${
                  prazoInfo.cor === "red"
                    ? "text-red-500 dark:text-red-400"
                    : prazoInfo.cor === "yellow"
                    ? "text-amber-500 dark:text-amber-400"
                    : "text-zinc-400 dark:text-zinc-500"
                }`} />
                <span className={`text-xs font-medium ${
                  prazoInfo.cor === "red"
                    ? "text-red-600 dark:text-red-400"
                    : prazoInfo.cor === "yellow"
                    ? "text-amber-600 dark:text-amber-400"
                    : "text-zinc-600 dark:text-zinc-400"
                }`}>
                  {prazoInfo.texto}
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2 p-2.5 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg">
                <Clock className="w-4 h-4 text-zinc-400 flex-shrink-0" />
                <span className="text-xs font-medium text-zinc-500">Sem prazo</span>
              </div>
            )}
          </div>

          {/* Processos */}
          <div className="space-y-2">
            {demanda.processos.map((proc, index) => (
              <div key={index} className="flex items-center gap-2 p-2.5 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg">
                <FileText className="w-4 h-4 text-zinc-500 dark:text-zinc-400 flex-shrink-0" />
                <span className="inline-flex items-center px-2 py-0.5 bg-zinc-200 dark:bg-zinc-700 rounded text-xs font-bold text-zinc-700 dark:text-zinc-300 flex-shrink-0">
                  {proc.tipo}
                </span>
                <p className="text-xs font-mono text-zinc-600 dark:text-zinc-400 truncate flex-1 min-w-0">
                  {proc.numero}
                </p>
                <CopyProcessButton processo={proc.numero} />
              </div>
            ))}
          </div>

          {/* Datas */}
          <div className="flex items-center gap-4 text-xs text-zinc-500 dark:text-zinc-400">
            <span className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" />
              <span className="font-medium">Exp:</span>
              <span className="font-semibold text-zinc-700 dark:text-zinc-300">{demanda.data}</span>
            </span>
            {demanda.prazo && (
              <>
                <span className="text-zinc-300 dark:text-zinc-600">•</span>
                <span className="flex items-center gap-1.5">
                  <span className="font-medium">Prazo:</span>
                  <span className="font-semibold text-zinc-700 dark:text-zinc-300">{demanda.prazo}</span>
                </span>
              </>
            )}
          </div>

          {/* Providências */}
          <div>
            <div className="flex items-center justify-between">
              <button
                onClick={() => setShowProvidencias(!showProvidencias)}
                className="flex items-center gap-2 text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors py-1"
              >
                {showProvidencias ? (
                  <ChevronDown className="w-4 h-4 flex-shrink-0" />
                ) : (
                  <ChevronRight className="w-4 h-4 flex-shrink-0" />
                )}
                {demanda.providencias ? "Providências" : "Adicionar providências"}
              </button>
              {onProvidenciasChange && !isEditingProvidencias && (
                <button
                  onClick={handleStartEditProvidencias}
                  className="p-1.5 rounded-md text-zinc-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors"
                  title="Editar providências"
                >
                  <MessageSquarePlus className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            
            {showProvidencias && (
              <div className="mt-2">
                {isEditingProvidencias ? (
                  <div className="space-y-2">
                    <Textarea
                      value={providenciasTemp}
                      onChange={(e) => setProvidenciasTemp(e.target.value)}
                      placeholder="Digite as providências..."
                      className="min-h-[80px] text-sm"
                      autoFocus
                    />
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleCancelProvidencias}
                        className="h-7 text-xs"
                      >
                        <X className="w-3 h-3 mr-1" />
                        Cancelar
                      </Button>
                      <Button
                        size="sm"
                        onClick={handleSaveProvidencias}
                        className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700"
                      >
                        <Save className="w-3 h-3 mr-1" />
                        Salvar
                      </Button>
                    </div>
                  </div>
                ) : demanda.providencias ? (
                  <div className="p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg">
                    <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed whitespace-pre-wrap">
                      {demanda.providencias}
                    </p>
                  </div>
                ) : (
                  <p className="text-xs text-zinc-400 italic p-2">
                    Nenhuma providência registrada
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-3 border-t border-zinc-100 dark:border-zinc-800">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onEdit(demanda)}
              className="h-8 flex-1 text-[11px] font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              <Edit className="w-3.5 h-3.5 mr-1.5" />
              Editar
            </Button>
            {demanda.arquivado ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onUnarchive(demanda.id)}
                className="h-8 flex-1 text-[11px] font-medium text-zinc-600 dark:text-zinc-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
              >
                <ArchiveRestore className="w-3.5 h-3.5 mr-1.5" />
                Restaurar
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onArchive(demanda.id)}
                className="h-8 flex-1 text-[11px] font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                <Archive className="w-3.5 h-3.5 mr-1.5" />
                Arquivar
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(demanda.id)}
              className="h-8 w-8 p-0 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>

          {/* Dropdown de status Mobile (compartilhado) */}
          {showStatusDropdown && (
            <div 
              className="fixed inset-x-4 bottom-4 bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl shadow-xl z-[999] overflow-hidden"
              style={{
                animation: 'fadeInUp 0.15s ease-out',
                maxHeight: '60vh'
              }}
            >
              <div className="px-4 py-3 border-b border-zinc-100 dark:border-zinc-800">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                    Alterar Status
                  </h4>
                  <button
                    onClick={() => setShowStatusDropdown(false)}
                    className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 p-1"
                  >
                    <ChevronDown className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="max-h-[50vh] overflow-y-auto py-1">
                {allStatuses.map((status, index) => {
                  const isCurrentStatus = status.value === demanda.status;
                  const prevStatus = index > 0 ? allStatuses[index - 1] : null;
                  const showDivider = prevStatus && prevStatus.group !== status.group;
                  
                  return (
                    <div key={status.value}>
                      {showDivider && (
                        <div className="my-1 border-t border-zinc-100 dark:border-zinc-800" />
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStatusSelect(status.value);
                        }}
                        className={`w-full px-4 py-2.5 text-left text-[11px] flex items-center gap-3 transition-colors ${
                          isCurrentStatus
                            ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100'
                            : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/50 text-zinc-600 dark:text-zinc-400'
                        }`}
                      >
                        <div 
                          className="w-2 h-2 rounded-full flex-shrink-0"
                          style={{ backgroundColor: status.color }}
                        />
                        <span className="flex-1 font-medium">{status.label}</span>
                        {isCurrentStatus && (
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Desktop Layout (>= md) - Compact 2-line layout */}
        <div className="hidden md:block space-y-1.5">
          {/* Line 1: Nome + Ato + Status + Prazo */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative flex-shrink-0">
              <AssistidoAvatar name={demanda.assistido} photoUrl={demanda.avatar} size="sm" />
              {demanda.prioridade === "URGENTE" && (
                <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-gradient-to-br from-orange-500 to-red-500 rounded-full flex items-center justify-center shadow-sm">
                  <Flame className="w-2 h-2 text-white" />
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 flex-1 min-w-0">
              {demanda.assistidoId ? (
                <Link href={`/admin/assistidos/${demanda.assistidoId}`} onClick={(e) => e.stopPropagation()}>
                  <span className="text-sm font-bold text-zinc-900 dark:text-zinc-50 hover:text-primary transition-colors truncate">
                    {demanda.assistido}
                  </span>
                </Link>
              ) : (
                <span className="text-sm font-bold text-zinc-900 dark:text-zinc-50 truncate">
                  {demanda.assistido}
                </span>
              )}
              {demanda.estadoPrisional === "preso" && (
                <Lock className="w-3.5 h-3.5 text-red-600 dark:text-red-400 flex-shrink-0" />
              )}
            </div>
            <span className="text-zinc-300 dark:text-zinc-600">·</span>
            {/* Ato inline */}
            {onAtoChange && atoOptions && atoOptions.length > 0 ? (
              <div className="relative flex-shrink-0">
                <button
                  onClick={handleAtoClick}
                  className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors flex items-center gap-1 group/ato"
                >
                  {demanda.ato}
                  <Edit className="w-2.5 h-2.5 opacity-0 group-hover/ato:opacity-100 transition-opacity" />
                </button>
                {showAtoDropdown && (
                  <div
                    className="absolute top-full left-0 mt-2 w-72 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-2xl z-50 overflow-hidden"
                    style={{ animation: 'fadeInDown 0.2s ease-out' }}
                  >
                    <div className="max-h-80 overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-300 dark:scrollbar-thumb-zinc-700">
                      {atoOptions
                        .filter(ato => ato.value !== "Todos")
                        .map((ato) => {
                          const isCurrentAto = ato.value === demanda.ato;
                          return (
                            <button
                              key={ato.value}
                              onClick={(e) => { e.stopPropagation(); handleAtoSelect(ato.value); }}
                              className={`w-full px-4 py-2.5 text-left text-xs font-semibold flex items-center gap-3 transition-all ${
                                isCurrentAto
                                  ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400'
                                  : 'hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
                              }`}
                            >
                              <span className="flex-1">{ato.label}</span>
                              {isCurrentAto && <CheckCircle className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />}
                            </button>
                          );
                        })}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide flex-shrink-0">
                {demanda.ato}
              </span>
            )}
            <div className="flex items-center gap-2 flex-shrink-0 ml-auto">
              {/* Prazo compact */}
              {prazoInfo.texto && (
                <span className={`inline-flex items-center gap-1 text-[11px] font-medium ${
                  prazoInfo.cor === "red"
                    ? "text-red-600 dark:text-red-400"
                    : prazoInfo.cor === "yellow"
                    ? "text-amber-600 dark:text-amber-400"
                    : "text-zinc-500 dark:text-zinc-400"
                }`}>
                  <Clock className="w-3 h-3" />
                  {prazoInfo.texto}
                </span>
              )}
              {/* Status badge */}
              <div className="relative">
                <button
                  onClick={handleStatusClick}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all hover:scale-105 cursor-pointer"
                  style={{
                    backgroundColor: hexToRgba(borderColor, 0.1),
                    color: borderColor,
                    border: `1px solid ${hexToRgba(borderColor, 0.25)}`,
                  }}
                  title="Clique para mudar o status"
                >
                  {demanda.status}
                  <ChevronDown className="w-3 h-3 opacity-60" />
                </button>
                {showStatusDropdown && (
                  <div
                    className="absolute top-full right-0 mt-2 w-44 bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-xl shadow-lg shadow-black/10 dark:shadow-black/30 z-50 overflow-hidden"
                    style={{ animation: 'fadeInDown 0.15s ease-out' }}
                  >
                    <div className="py-1 max-h-72 overflow-y-auto">
                      {allStatuses.map((status, idx) => {
                        const isCurrentStatus = status.value === demanda.status;
                        const prevS = idx > 0 ? allStatuses[idx - 1] : null;
                        const showDiv = prevS && prevS.group !== status.group;
                        return (
                          <div key={status.value}>
                            {showDiv && <div className="my-1 border-t border-zinc-100 dark:border-zinc-800" />}
                            <button
                              onClick={(e) => { e.stopPropagation(); handleStatusSelect(status.value); }}
                              className={`w-full px-3 py-2 text-left text-[11px] flex items-center gap-2.5 transition-colors ${
                                isCurrentStatus
                                  ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 font-bold'
                                  : 'hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
                              }`}
                            >
                              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: status.color }} />
                              <span className="flex-1">{status.label}</span>
                              {isCurrentStatus && <CheckCircle className="w-3 h-3 text-emerald-600" />}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
              {/* Actions */}
              <div className="relative" ref={menuRef}>
                <button
                  onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
                  className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                >
                  <MoreVertical className="w-4 h-4" />
                </button>
                {showMenu && (
                  <div
                    className="absolute top-full right-0 mt-1 w-40 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-xl z-50 overflow-hidden py-1"
                    style={{ animation: 'fadeInDown 0.15s ease-out' }}
                  >
                    {onDelegate && (
                      <button
                        onClick={(e) => { e.stopPropagation(); setShowMenu(false); onDelegate(demanda); }}
                        className="w-full px-3 py-2 text-left text-xs flex items-center gap-2 hover:bg-rose-50 dark:hover:bg-rose-950/20 text-rose-600 dark:text-rose-400 transition-colors"
                      >
                        <UserPlus className="w-3.5 h-3.5" />
                        Delegar
                      </button>
                    )}
                    <button
                      onClick={(e) => { e.stopPropagation(); setShowMenu(false); onEdit(demanda); }}
                      className="w-full px-3 py-2 text-left text-xs flex items-center gap-2 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 transition-colors"
                    >
                      <Edit className="w-3.5 h-3.5" />
                      Editar
                    </button>
                    {demanda.arquivado ? (
                      <button
                        onClick={(e) => { e.stopPropagation(); setShowMenu(false); onUnarchive(demanda.id); }}
                        className="w-full px-3 py-2 text-left text-xs flex items-center gap-2 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 transition-colors"
                      >
                        <ArchiveRestore className="w-3.5 h-3.5" />
                        Restaurar
                      </button>
                    ) : (
                      <button
                        onClick={(e) => { e.stopPropagation(); setShowMenu(false); onArchive(demanda.id); }}
                        className="w-full px-3 py-2 text-left text-xs flex items-center gap-2 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 transition-colors"
                      >
                        <Archive className="w-3.5 h-3.5" />
                        Arquivar
                      </button>
                    )}
                    <div className="my-1 border-t border-zinc-100 dark:border-zinc-800" />
                    <button
                      onClick={(e) => { e.stopPropagation(); setShowMenu(false); onDelete(demanda.id); }}
                      className="w-full px-3 py-2 text-left text-xs flex items-center gap-2 hover:bg-red-50 dark:hover:bg-red-950/30 text-red-600 dark:text-red-400 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Deletar
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Line 2: Processo + Atribuição + Datas + Providências toggle */}
          <div className="flex items-center gap-3 pl-10 text-xs min-w-0">
            {/* Atribuição icon + label */}
            {AtribuicaoIcon && (
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <AtribuicaoIcon className={`w-3.5 h-3.5 ${atribuicaoColors[demanda.atribuicao]}`} />
                <span className="text-zinc-500 dark:text-zinc-400 font-medium truncate max-w-[120px]">{demanda.atribuicao}</span>
              </div>
            )}
            <span className="text-zinc-300 dark:text-zinc-600">·</span>
            {/* Processo */}
            {demanda.processos.length > 0 && (
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="px-1.5 py-0.5 bg-zinc-100 dark:bg-zinc-800 rounded text-[10px] font-bold text-zinc-600 dark:text-zinc-400 flex-shrink-0">
                  {demanda.processos[0].tipo}
                </span>
                <span className="font-mono text-zinc-500 dark:text-zinc-400 truncate">
                  {demanda.processos[0].numero}
                </span>
                <CopyProcessButton processo={demanda.processos[0].numero} />
                {demanda.processos.length > 1 && (
                  <span className="text-[10px] text-zinc-400">+{demanda.processos.length - 1}</span>
                )}
              </div>
            )}
            <span className="text-zinc-300 dark:text-zinc-600">·</span>
            {/* Datas inline */}
            <span className="text-zinc-400 dark:text-zinc-500 flex-shrink-0">
              Exp: <span className="text-zinc-600 dark:text-zinc-300 font-medium">{demanda.data}</span>
            </span>
            {demanda.prazo && (
              <>
                <span className="text-zinc-300 dark:text-zinc-600">·</span>
                <span className="text-zinc-400 dark:text-zinc-500 flex-shrink-0">
                  Prazo: <span className="text-zinc-600 dark:text-zinc-300 font-medium">{demanda.prazo}</span>
                </span>
              </>
            )}
            {/* Providências toggle */}
            <div className="ml-auto flex-shrink-0">
              <button
                onClick={(e) => { e.stopPropagation(); setShowProvidencias(!showProvidencias); }}
                className="flex items-center gap-1 text-[10px] text-zinc-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
              >
                {showProvidencias ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                {demanda.providencias ? "Prov." : "+Prov."}
              </button>
            </div>
          </div>

          {/* Providências expandable */}
          {showProvidencias && (
            <div className="pl-10 mt-1">
              {isEditingProvidencias ? (
                <div className="space-y-2">
                  <Textarea
                    value={providenciasTemp}
                    onChange={(e) => setProvidenciasTemp(e.target.value)}
                    placeholder="Digite as providências..."
                    className="min-h-[60px] text-sm"
                    autoFocus
                  />
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" size="sm" onClick={handleCancelProvidencias} className="h-7 text-xs">
                      <X className="w-3 h-3 mr-1" /> Cancelar
                    </Button>
                    <Button size="sm" onClick={handleSaveProvidencias} className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700">
                      <Save className="w-3 h-3 mr-1" /> Salvar
                    </Button>
                  </div>
                </div>
              ) : demanda.providencias ? (
                <div className="flex items-start gap-2">
                  <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed whitespace-pre-wrap flex-1">{demanda.providencias}</p>
                  {onProvidenciasChange && (
                    <button onClick={handleStartEditProvidencias} className="p-1 rounded text-zinc-400 hover:text-emerald-600 transition-colors flex-shrink-0">
                      <MessageSquarePlus className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ) : (
                <button onClick={handleStartEditProvidencias} className="text-[10px] text-zinc-400 italic hover:text-emerald-500 transition-colors">
                  Adicionar providências...
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes shimmer {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }

        @keyframes expandDown {
          from { max-height: 0; }
          to { max-height: 500px; }
        }

        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes slideRight {
          from { left: -100%; }
          to { left: 0; }
        }

        @keyframes fadeInDown {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}