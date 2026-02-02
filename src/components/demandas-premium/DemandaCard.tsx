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
  isSelectMode?: boolean;
  isSelected?: boolean;
  onToggleSelect?: (id: string) => void;
}

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
  isSelectMode,
  isSelected,
  onToggleSelect,
}: DemandaCardProps) {
  const [showProvidencias, setShowProvidencias] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [showAtoDropdown, setShowAtoDropdown] = useState(false);
  const [isEditingProvidencias, setIsEditingProvidencias] = useState(false);
  const [providenciasTemp, setProvidenciasTemp] = useState(demanda.providencias || "");

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

  return (
    <div
      className={`group relative transition-all duration-300 ease-out rounded-xl overflow-hidden ${
        showStatusDropdown || showAtoDropdown ? 'z-[999]' : 'z-0'
      }`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Linha indicadora lateral de status */}
      <div 
        className="absolute left-0 top-0 bottom-0 w-1 transition-all duration-300"
        style={{ 
          backgroundColor: borderColor,
          opacity: isHovered ? 1 : 0.6
        }}
      />

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
        className={`relative bg-white dark:bg-zinc-900 p-4 md:p-5 lg:p-6 rounded-r-xl border border-l-0 border-zinc-200/60 dark:border-zinc-800/60 transition-all duration-300 ${isSelectMode ? "ml-8" : "ml-1"}`}
        style={{
          boxShadow: isHovered 
            ? '0 4px 12px rgba(0, 0, 0, 0.08)' 
            : '0 1px 3px rgba(0, 0, 0, 0.04)',
          transform: isHovered ? 'translateX(2px)' : 'translateX(0)',
        }}
      >
        {/* Mobile/Tablet Layout (< lg) */}
        <div className="block lg:hidden space-y-4">
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

        {/* Desktop Layout (>= lg) - Grid de 3 colunas */}
        <div className="hidden lg:block">
          <div className="grid grid-cols-[minmax(280px,420px)_minmax(200px,400px)_auto] gap-4 xl:gap-6 items-start">
            {/* Coluna 1: Nome e Ato */}
            <div className="flex items-start gap-4 pr-6 border-r border-zinc-200/60 dark:border-zinc-700/60">
              <div className="relative">
                <AssistidoAvatar name={demanda.assistido} photoUrl={demanda.avatar} />
                {/* Indicador de prioridade no avatar */}
                {demanda.prioridade === "URGENTE" && (
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-gradient-to-br from-orange-500 to-red-500 rounded-full flex items-center justify-center shadow-lg">
                    <Flame className="w-2.5 h-2.5 text-white" />
                  </div>
                )}
              </div>
              <div className="space-y-1.5 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  {demanda.assistidoId ? (
                    <Link href={`/admin/assistidos/${demanda.assistidoId}`} onClick={(e) => e.stopPropagation()}>
                      <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-50 hover:text-primary transition-colors">
                        {demanda.assistido}
                      </h4>
                    </Link>
                  ) : (
                    <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-50 group-hover:text-zinc-950 dark:group-hover:text-white transition-colors">
                      {demanda.assistido}
                    </h4>
                  )}
                  {demanda.estadoPrisional === "preso" && (
                    <div className="relative">
                      <Lock className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />
                      <div className="absolute inset-0 bg-red-500 blur-md opacity-30 animate-pulse" />
                    </div>
                  )}
                </div>
                {/* Ato editável inline - Desktop */}
                {onAtoChange && atoOptions && atoOptions.length > 0 ? (
                  <div className="relative inline-block">
                    <button
                      onClick={handleAtoClick}
                      className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wide line-clamp-1 hover:text-blue-600 dark:hover:text-blue-400 transition-colors flex items-center gap-1 group/ato"
                      style={{
                        color: isHovered ? borderColor : undefined
                      }}
                    >
                      {demanda.ato}
                      <Edit className="w-2.5 h-2.5 opacity-0 group-hover/ato:opacity-100 transition-opacity" />
                    </button>
                    {showAtoDropdown && (
                      <div 
                        className="absolute top-full left-0 mt-2 w-72 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-2xl z-50 overflow-hidden"
                        style={{
                          animation: 'fadeInDown 0.2s ease-out'
                        }}
                      >
                        <div className="max-h-80 overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-300 dark:scrollbar-thumb-zinc-700">
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
                                  className={`w-full px-4 py-2.5 text-left text-xs font-semibold flex items-center gap-3 transition-all ${
                                    isCurrentAto
                                      ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400'
                                      : 'hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
                                  }`}
                                >
                                  <span className="flex-1">{ato.label}</span>
                                  {isCurrentAto && (
                                    <CheckCircle className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                                  )}
                                </button>
                              );
                            })}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wide">
                    {demanda.ato}
                  </p>
                )}
              </div>
            </div>

            {/* Coluna 2: Atribuição, Processo e Prazos */}
            <div className="space-y-2.5 pl-2">
              {/* Atribuição */}
              {AtribuicaoIcon && (
                <div className="flex items-center gap-2 group/atribuicao">
                  <div className="relative">
                    <AtribuicaoIcon className={`w-3.5 h-3.5 ${atribuicaoColors[demanda.atribuicao]} transition-transform group-hover/atribuicao:scale-110`} />
                  </div>
                  <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                    {demanda.atribuicao}
                  </span>
                </div>
              )}

              {/* Processos */}
              <div className="space-y-1.5">
                {demanda.processos.map((proc, index) => (
                  <div key={index} className="flex items-center gap-2.5 group/processo">
                    <FileText className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500 flex-shrink-0 transition-colors group-hover/processo:text-zinc-600 dark:group-hover/processo:text-zinc-300" />
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-gradient-to-br from-zinc-50 to-zinc-100 dark:from-zinc-800 dark:to-zinc-800/50 rounded-md text-xs font-medium text-zinc-700 dark:text-zinc-300 border border-zinc-200/50 dark:border-zinc-700/50">
                      {proc.tipo}
                    </span>
                    <p className="text-xs font-mono text-zinc-600 dark:text-zinc-400 truncate">
                      {proc.numero}
                    </p>
                    <CopyProcessButton processo={proc.numero} />
                  </div>
                ))}
              </div>

              {/* Prazo */}
              {prazoInfo.texto && (
                <div className="flex items-center gap-3 text-[10px] font-medium text-zinc-500 dark:text-zinc-400 flex-wrap">
                  {/* Datas lado a lado */}
                  <span className="flex items-center gap-1">
                    <span className="font-semibold text-zinc-600 dark:text-zinc-300">Expedição:</span>
                    {demanda.data}
                  </span>
                  <span className="text-zinc-300 dark:text-zinc-600">•</span>
                  <span className="flex items-center gap-1">
                    <span className="font-semibold text-zinc-600 dark:text-zinc-300">Prazo:</span>
                    {demanda.prazo}
                  </span>
                  
                  {/* Tag de dias restantes inline */}
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium ${
                      prazoInfo.cor === "red"
                        ? "text-red-600 dark:text-red-400"
                        : prazoInfo.cor === "yellow"
                        ? "text-amber-600 dark:text-amber-400"
                        : "text-zinc-500 dark:text-zinc-400"
                    }`}
                  >
                    <Clock className="w-2.5 h-2.5" />
                    {prazoInfo.texto}
                  </span>
                </div>
              )}
            </div>

            {/* Coluna 3: Status e Actions */}
            <div className="flex flex-col items-end gap-3">
              {/* Status Badge clicável com dropdown */}
              <div className="relative">
                <button
                  onClick={handleStatusClick}
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all hover:scale-105 cursor-pointer"
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

                {/* Dropdown de status */}
                {showStatusDropdown && (
                  <div 
                    className="absolute top-full right-0 mt-2 w-44 bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-xl shadow-lg shadow-black/10 dark:shadow-black/30 z-50 overflow-hidden"
                    style={{
                      animation: 'fadeInDown 0.15s ease-out'
                    }}
                  >
                    <div className="py-1 max-h-72 overflow-y-auto">
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
                              className={`w-full px-3 py-2 text-left text-[11px] flex items-center gap-2.5 transition-colors ${
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
                                <CheckCircle className="w-3 h-3 text-emerald-500" />
                              )}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Action buttons */}
              <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-all duration-300 transform group-hover:translate-y-0 translate-y-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onEdit(demanda)}
                  className="h-8 w-8 p-0 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:scale-110 transition-all"
                  title="Editar"
                >
                  <Edit className="w-3.5 h-3.5 text-zinc-600 dark:text-zinc-400" />
                </Button>
                {demanda.arquivado ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onUnarchive(demanda.id)}
                    className="h-8 w-8 p-0 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-950/30 hover:scale-110 transition-all"
                    title="Desarquivar"
                  >
                    <ArchiveRestore className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  </Button>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onArchive(demanda.id)}
                    className="h-8 w-8 p-0 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:scale-110 transition-all"
                    title="Arquivar"
                  >
                    <Archive className="w-3.5 h-3.5 text-zinc-600 dark:text-zinc-400" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onDelete(demanda.id)}
                  className="h-8 w-8 p-0 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 hover:scale-110 transition-all"
                  title="Deletar"
                >
                  <Trash2 className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />
                </Button>
              </div>
            </div>
          </div>

          {/* Providências Desktop - Seção Expansível (Fora do Grid - Largura Total) */}
          <div className="mt-3.5 pt-3.5 border-t border-zinc-200/50 dark:border-zinc-800/50">
            <div className="flex items-center justify-between">
              <button
                onClick={() => setShowProvidencias(!showProvidencias)}
                className="flex items-start gap-2 text-xs hover:text-zinc-900 dark:hover:text-zinc-100 transition-all text-left group/providencias"
              >
                <div className="transition-all duration-300 group-hover/providencias:scale-110 group-hover/providencias:rotate-3 mt-0.5 flex-shrink-0">
                  {showProvidencias ? (
                    <ChevronDown className="w-3.5 h-3.5 text-zinc-700 dark:text-zinc-300" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5 text-zinc-700 dark:text-zinc-300" />
                  )}
                </div>
                <span className="relative font-semibold text-zinc-700 dark:text-zinc-300 flex-shrink-0">
                  {demanda.providencias ? "Providências:" : "Adicionar providências"}
                  <span className="absolute -bottom-0.5 left-0 w-0 h-0.5 bg-gradient-to-r from-zinc-400 to-transparent group-hover/providencias:w-full transition-all duration-300" />
                </span>
                {/* Texto inline quando recolhido */}
                {!showProvidencias && demanda.providencias && (
                  <span className="text-zinc-600 dark:text-zinc-400 leading-relaxed transition-all duration-300 line-clamp-1 flex-1 max-w-[600px]">
                    {demanda.providencias}
                  </span>
                )}
              </button>
              {onProvidenciasChange && !isEditingProvidencias && (
                <button
                  onClick={handleStartEditProvidencias}
                  className="p-1.5 rounded-md text-zinc-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors opacity-0 group-hover:opacity-100"
                  title="Editar providências"
                >
                  <MessageSquarePlus className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            
            {/* Conteúdo expandido */}
            {showProvidencias && (
              <div 
                className="mt-2 pl-6 transition-all duration-300"
                style={{ animation: 'fadeInDown 0.3s ease-out' }}
              >
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
                  <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed whitespace-pre-wrap">
                    {demanda.providencias}
                  </p>
                ) : (
                  <p className="text-xs text-zinc-400 italic">
                    Nenhuma providência registrada
                  </p>
                )}
              </div>
            )}
          </div>
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