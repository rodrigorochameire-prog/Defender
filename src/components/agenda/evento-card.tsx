"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  FileText,
  Gavel,
  Home,
  Lock,
  Folder,
  RefreshCw,
  Shield,
  Scale,
  MoreHorizontal,
  Edit,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Copy,
  ExternalLink,
  Eye,
  ClipboardCheck,
  User,
} from "lucide-react";
import { format, differenceInDays, isToday, isTomorrow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { SOLID_COLOR_MAP } from "@/lib/config/atribuicoes";

interface EventoCardProps {
  evento: any;
  onEdit?: (evento: any) => void;
  onDelete?: (id: string) => void;
  onStatusChange?: (id: string, newStatus: string) => void;
  onClick?: (evento: any) => void;
  variant?: "default" | "compact";
}

// Cores por atribuição (usando config central)
const getAtribuicaoColor = (atribuicao: string): string => {
  const key = atribuicao?.toLowerCase() || "";
  if (key.includes("júri") || key.includes("juri")) return SOLID_COLOR_MAP.JURI || "#22c55e";
  if (key.includes("violência") || key.includes("domestica")) return SOLID_COLOR_MAP.VVD || "#eab308";
  if (key.includes("execução") || key.includes("execucao")) return SOLID_COLOR_MAP.EXECUCAO || "#3b82f6";
  if (key.includes("substituição") && key.includes("crim")) return SOLID_COLOR_MAP.CRIMINAL || "#ef4444";
  if (key.includes("substituição") || key.includes("civel")) return SOLID_COLOR_MAP.SUBSTITUICAO_CIVEL || "#f97316";
  return "#71717a";
};

// Status configs
const statusConfig: Record<string, { 
  label: string; 
  bg: string;
  text: string;
  icon: any;
}> = {
  confirmado: {
    label: "Confirmado",
    bg: "bg-emerald-50 dark:bg-emerald-900/20",
    text: "text-emerald-600 dark:text-emerald-400",
    icon: CheckCircle2,
  },
  pendente: {
    label: "Pendente",
    bg: "bg-amber-50 dark:bg-amber-900/20",
    text: "text-amber-600 dark:text-amber-400",
    icon: Clock,
  },
  cancelado: {
    label: "Cancelado",
    bg: "bg-rose-50 dark:bg-rose-900/20",
    text: "text-rose-600 dark:text-rose-400",
    icon: null,
  },
  concluido: {
    label: "Concluído",
    bg: "bg-zinc-100 dark:bg-zinc-800",
    text: "text-zinc-500 dark:text-zinc-400",
    icon: CheckCircle2,
  },
  realizado: {
    label: "Realizado",
    bg: "bg-emerald-50 dark:bg-emerald-900/20",
    text: "text-emerald-600 dark:text-emerald-400",
    icon: CheckCircle2,
  },
};

// Ícones por atribuição
const atribuicaoIcons: Record<string, any> = {
  "Tribunal do Júri": Gavel,
  "Grupo Especial do Júri": Gavel,
  "Violência Doméstica": Home,
  "Execução Penal": Lock,
  "Criminal Geral": Folder,
  "Substituição": RefreshCw,
  "Curadoria Especial": Shield,
};

export function EventoCard({ 
  evento, 
  onEdit, 
  onDelete, 
  onStatusChange, 
  onClick,
  variant = "default"
}: EventoCardProps) {
  const [copied, setCopied] = useState(false);
  
  const atribuicaoColor = getAtribuicaoColor(evento.atribuicao);
  const AtribuicaoIcon = atribuicaoIcons[evento.atribuicao] || Scale;
  const status = statusConfig[evento.status] || statusConfig.pendente;
  const hasRegistro = evento.registroAudienciaId || evento.temRegistro || evento.registro;

  // Calcular urgência
  const eventDate = new Date(evento.data);
  const diasAte = differenceInDays(eventDate, new Date());
  const isHoje = isToday(eventDate);
  const isAmanha = isTomorrow(eventDate);
  const isUrgente = evento.prioridade === "urgente" || diasAte <= 1;

  const formatData = (dataStr: string) => {
    try {
      const date = new Date(dataStr);
      if (isToday(date)) return "Hoje";
      if (isTomorrow(date)) return "Amanhã";
      return format(date, "dd MMM", { locale: ptBR });
    } catch {
      return dataStr;
    }
  };

  const handleCopyProcesso = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (evento.processo) {
      navigator.clipboard.writeText(evento.processo);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (variant === "compact") {
    return (
      <div
        onClick={() => onClick?.(evento)}
        className={cn(
          "group relative p-2 bg-white dark:bg-zinc-900 rounded-lg",
          "border-l-[3px] border border-zinc-100 dark:border-zinc-800",
          "hover:border-zinc-200 dark:hover:border-zinc-700 hover:shadow-sm",
          "transition-all duration-200 cursor-pointer"
        )}
        style={{ borderLeftColor: atribuicaoColor }}
      >
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">{evento.horarioInicio}</span>
          <span className="text-xs text-zinc-600 dark:text-zinc-400 truncate flex-1">{evento.titulo}</span>
          {hasRegistro && <CheckCircle2 className="w-3 h-3 text-emerald-500 flex-shrink-0" />}
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={() => onClick?.(evento)}
      className={cn(
        "group relative bg-white dark:bg-zinc-900",
        "border-l-[3px] transition-all duration-200 cursor-pointer",
        "hover:bg-zinc-50/80 dark:hover:bg-zinc-800/50"
      )}
      style={{ borderLeftColor: atribuicaoColor }}
    >
      {/* Quick Actions no hover */}
      <div className={cn(
        "absolute top-2 right-2 flex items-center gap-1 z-10",
        "opacity-0 group-hover:opacity-100 transition-all duration-200"
      )}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button 
              variant="secondary" 
              size="icon" 
              className="h-6 w-6 bg-white/90 dark:bg-zinc-800/90 backdrop-blur-sm shadow-sm"
              onClick={(e) => { e.stopPropagation(); onClick?.(evento); }}
            >
              <Eye className="w-3 h-3 text-zinc-600" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Ver detalhes</TooltipContent>
        </Tooltip>
        {onEdit && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="secondary" 
                size="icon" 
                className="h-6 w-6 bg-white/90 dark:bg-zinc-800/90 backdrop-blur-sm shadow-sm"
                onClick={(e) => { e.stopPropagation(); onEdit(evento); }}
              >
                <Edit className="w-3 h-3 text-blue-600" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Editar</TooltipContent>
          </Tooltip>
        )}
      </div>

      <div className="p-3 flex gap-3">
        {/* Coluna Esquerda - Data/Hora */}
        <div className="flex-shrink-0 w-14 text-center pt-0.5">
          <p className={cn(
            "text-[10px] font-semibold uppercase tracking-wide",
            isHoje ? "text-rose-600 dark:text-rose-400" :
            isAmanha ? "text-amber-600 dark:text-amber-400" :
            "text-zinc-400"
          )}>
            {formatData(evento.data)}
          </p>
          {evento.horarioInicio && (
            <p className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
              {evento.horarioInicio}
            </p>
          )}
          {/* Indicador de dias */}
          {diasAte > 1 && diasAte <= 7 && (
            <p className="text-[10px] text-zinc-400 mt-0.5">{diasAte}d</p>
          )}
        </div>

        {/* Conteúdo Principal */}
        <div className="flex-1 min-w-0 space-y-1.5">
          {/* Linha 1: Título + Indicadores */}
          <div className="flex items-start gap-2 pr-16">
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 line-clamp-1 flex-1">
              {evento.titulo}
            </h3>
            
            <div className="flex items-center gap-1 flex-shrink-0">
              {isUrgente && (
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
              )}
              {hasRegistro && (
                <Tooltip>
                  <TooltipTrigger>
                    <ClipboardCheck className="w-3.5 h-3.5 text-emerald-500" />
                  </TooltipTrigger>
                  <TooltipContent>Registro realizado</TooltipContent>
                </Tooltip>
              )}
            </div>
          </div>

          {/* Linha 2: Assistido + Local */}
          <div className="flex items-center gap-3 text-xs">
            {evento.assistido && (
              <div className="flex items-center gap-1.5 min-w-0">
                <div 
                  className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-semibold text-white flex-shrink-0"
                  style={{ backgroundColor: atribuicaoColor }}
                >
                  {evento.assistido.substring(0, 2).toUpperCase()}
                </div>
                <span className="font-medium text-zinc-700 dark:text-zinc-300 truncate">
                  {evento.assistido}
                </span>
              </div>
            )}
            {evento.local && (
              <div className="flex items-center gap-1 text-zinc-500 min-w-0">
                <MapPin className="w-3 h-3 flex-shrink-0" />
                <span className="truncate">{evento.local}</span>
              </div>
            )}
          </div>

          {/* Linha 3: Processo (se houver) */}
          {evento.processo && (
            <div 
              className="inline-flex items-center gap-1.5 group/copy cursor-pointer"
              onClick={handleCopyProcesso}
            >
              <span className="font-mono text-[10px] text-zinc-500 hover:text-emerald-600 transition-colors">
                {evento.processo}
              </span>
              {copied ? (
                <CheckCircle2 className="w-3 h-3 text-emerald-500" />
              ) : (
                <Copy className="w-3 h-3 text-zinc-300 group-hover/copy:text-zinc-500 transition-colors" />
              )}
            </div>
          )}

          {/* Linha 4: Status + Atribuição */}
          <div className="flex items-center gap-2 pt-0.5">
            <span className={cn(
              "inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium",
              status.bg, status.text
            )}>
              {status.icon && <status.icon className="w-2.5 h-2.5" />}
              {status.label}
            </span>
            
            <span 
              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium"
              style={{ backgroundColor: `${atribuicaoColor}15`, color: atribuicaoColor }}
            >
              <AtribuicaoIcon className="w-2.5 h-2.5" />
              {evento.atribuicao?.split(' ').slice(0, 2).join(' ') || "Geral"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
