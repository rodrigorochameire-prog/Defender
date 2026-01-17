"use client";

import { cn } from "@/lib/utils";
import {
  CheckCircle2,
  Clock,
  AlertCircle,
  XCircle,
  Circle,
  Zap,
  Lock,
  FileText,
  Gavel,
  Scale,
  AlertTriangle,
} from "lucide-react";

type StatusType = 
  | "atender" 
  | "fila" 
  | "monitorar" 
  | "protocolado"
  | "fatal"
  | "urgente"
  | "andamento"
  | "arquivado"
  | "concluido"
  | "pendente"
  | "preso"
  | "solto"
  | "success"
  | "warning"
  | "error"
  | "info";

interface StatusBadgeProps {
  status: StatusType | string;
  label?: string;
  size?: "sm" | "md" | "lg";
  showIcon?: boolean;
  pulse?: boolean;
  className?: string;
}

// Configuração visual para cada status
const statusConfig: Record<string, {
  icon: React.ElementType;
  label: string;
  colors: string;
  iconColor: string;
  pulseColor?: string;
}> = {
  // Status de Demanda (Kanban)
  atender: {
    icon: AlertTriangle,
    label: "Atender",
    colors: "bg-red-50 text-red-700 border-red-100 dark:bg-red-950/30 dark:text-red-400 dark:border-red-900/50",
    iconColor: "text-red-500 dark:text-red-400",
    pulseColor: "bg-red-400",
  },
  fila: {
    icon: Clock,
    label: "Fila",
    colors: "bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900/50",
    iconColor: "text-amber-500 dark:text-amber-400",
  },
  monitorar: {
    icon: Scale,
    label: "Monitorar",
    colors: "bg-blue-50 text-blue-700 border-blue-100 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-900/50",
    iconColor: "text-blue-500 dark:text-blue-400",
  },
  protocolado: {
    icon: CheckCircle2,
    label: "Protocolado",
    colors: "bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900/50",
    iconColor: "text-emerald-500 dark:text-emerald-400",
  },

  // Status de Prazo
  fatal: {
    icon: AlertCircle,
    label: "Fatal",
    colors: "bg-red-50 text-red-700 border-red-100 dark:bg-red-950/30 dark:text-red-400 dark:border-red-900/50",
    iconColor: "text-red-500 dark:text-red-400",
    pulseColor: "bg-red-400",
  },
  urgente: {
    icon: Zap,
    label: "Urgente",
    colors: "bg-orange-50 text-orange-700 border-orange-100 dark:bg-orange-950/30 dark:text-orange-400 dark:border-orange-900/50",
    iconColor: "text-orange-500 dark:text-orange-400",
  },
  andamento: {
    icon: Clock,
    label: "Em Andamento",
    colors: "bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900/50",
    iconColor: "text-emerald-500 dark:text-emerald-400",
  },
  arquivado: {
    icon: FileText,
    label: "Arquivado",
    colors: "bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-800/50 dark:text-slate-400 dark:border-slate-700",
    iconColor: "text-slate-400 dark:text-slate-500",
  },
  concluido: {
    icon: CheckCircle2,
    label: "Concluído",
    colors: "bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900/50",
    iconColor: "text-emerald-500 dark:text-emerald-400",
  },
  pendente: {
    icon: Clock,
    label: "Pendente",
    colors: "bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900/50",
    iconColor: "text-amber-500 dark:text-amber-400",
    pulseColor: "bg-amber-400",
  },

  // Status de Assistido
  preso: {
    icon: Lock,
    label: "Preso",
    colors: "bg-red-50 text-red-700 border-red-100 dark:bg-red-950/30 dark:text-red-400 dark:border-red-900/50",
    iconColor: "text-red-500 dark:text-red-400",
    pulseColor: "bg-red-400",
  },
  solto: {
    icon: Circle,
    label: "Solto",
    colors: "bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900/50",
    iconColor: "text-emerald-500 dark:text-emerald-400",
  },

  // Status Genéricos
  success: {
    icon: CheckCircle2,
    label: "Sucesso",
    colors: "bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900/50",
    iconColor: "text-emerald-500 dark:text-emerald-400",
  },
  warning: {
    icon: AlertCircle,
    label: "Atenção",
    colors: "bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900/50",
    iconColor: "text-amber-500 dark:text-amber-400",
  },
  error: {
    icon: XCircle,
    label: "Erro",
    colors: "bg-red-50 text-red-700 border-red-100 dark:bg-red-950/30 dark:text-red-400 dark:border-red-900/50",
    iconColor: "text-red-500 dark:text-red-400",
  },
  info: {
    icon: AlertCircle,
    label: "Info",
    colors: "bg-blue-50 text-blue-700 border-blue-100 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-900/50",
    iconColor: "text-blue-500 dark:text-blue-400",
  },
};

// Fallback para status desconhecidos
const defaultConfig = {
  icon: Circle,
  label: "Desconhecido",
  colors: "bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-800/50 dark:text-slate-400 dark:border-slate-700",
  iconColor: "text-slate-400",
};

const sizeClasses = {
  sm: "text-[10px] px-2 py-0.5 gap-1",
  md: "text-xs px-3 py-1 gap-1.5",
  lg: "text-sm px-4 py-1.5 gap-2",
};

const iconSizeClasses = {
  sm: "h-3 w-3",
  md: "h-3.5 w-3.5",
  lg: "h-4 w-4",
};

/**
 * StatusBadge Premium
 * 
 * Badge estilizada para exibir status jurídicos com ícone e cores consistentes.
 * Suporta animação de pulse para status urgentes.
 */
export function StatusBadge({
  status,
  label,
  size = "md",
  showIcon = true,
  pulse = false,
  className,
}: StatusBadgeProps) {
  const config = statusConfig[status] || defaultConfig;
  const Icon = config.icon;
  const displayLabel = label || config.label;
  const shouldPulse = pulse || (status === "fatal" || status === "preso" || status === "atender");

  return (
    <div
      className={cn(
        // Base
        "inline-flex items-center justify-center font-semibold rounded-full border",
        // Transição suave
        "transition-all duration-300",
        // Sombra sutil
        "shadow-[0_1px_2px_rgba(0,0,0,0.04)]",
        // Hover
        "hover:shadow-[0_2px_4px_rgba(0,0,0,0.06)]",
        // Cores do status
        config.colors,
        // Tamanho
        sizeClasses[size],
        className
      )}
    >
      {showIcon && (
        <span className="relative flex items-center justify-center">
          <Icon className={cn(iconSizeClasses[size], config.iconColor)} />
          {/* Pulse animation para status urgentes */}
          {shouldPulse && config.pulseColor && (
            <span className={cn(
              "absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping",
              config.pulseColor
            )} />
          )}
        </span>
      )}
      <span>{displayLabel}</span>
    </div>
  );
}

/**
 * PrazoBadge
 * 
 * Badge especial para indicar prazos processuais.
 * Verde = Em dia, Amarelo = Próximo, Vermelho = Atrasado
 */
interface PrazoBadgeProps {
  daysRemaining: number;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const prazoColorConfig = {
  ok: {
    colors: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800",
    dotColor: "bg-emerald-500",
    label: "Em dia",
  },
  proximo: {
    colors: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800",
    dotColor: "bg-amber-500",
    label: "Próximo",
  },
  atrasado: {
    colors: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-800",
    dotColor: "bg-red-500",
    label: "Atrasado",
  },
  hoje: {
    colors: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-800",
    dotColor: "bg-red-500",
    label: "HOJE",
  },
};

export function PrazoBadge({
  daysRemaining,
  size = "md",
  className,
}: PrazoBadgeProps) {
  let statusKey: keyof typeof prazoColorConfig;
  let displayText: string;

  if (daysRemaining < 0) {
    statusKey = "atrasado";
    displayText = `${Math.abs(daysRemaining)} dias atrasado`;
  } else if (daysRemaining === 0) {
    statusKey = "hoje";
    displayText = "HOJE";
  } else if (daysRemaining <= 3) {
    statusKey = "proximo";
    displayText = `${daysRemaining} dia${daysRemaining > 1 ? 's' : ''}`;
  } else {
    statusKey = "ok";
    displayText = `${daysRemaining} dias`;
  }

  const config = prazoColorConfig[statusKey];

  return (
    <div
      className={cn(
        "inline-flex items-center font-semibold rounded-full border",
        "transition-all duration-300",
        "shadow-[0_1px_2px_rgba(0,0,0,0.04)]",
        config.colors,
        sizeClasses[size],
        className
      )}
    >
      {/* Bolinha colorida */}
      <span className="relative flex h-2 w-2">
        <span className={cn(
          "absolute inline-flex h-full w-full rounded-full opacity-75",
          statusKey !== "ok" && "animate-ping",
          config.dotColor
        )} />
        <span className={cn("relative inline-flex rounded-full h-2 w-2", config.dotColor)} />
      </span>
      
      <span>{displayText}</span>
    </div>
  );
}

/**
 * AreaBadge
 * 
 * Badge para áreas de atuação (Júri, EP, VD, Substituição)
 */
interface AreaBadgeProps {
  area: "juri" | "ep" | "vd" | "substituicao" | string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const areaConfig: Record<string, { label: string; colors: string; icon: React.ElementType }> = {
  juri: {
    label: "Júri",
    colors: "bg-purple-50 text-purple-700 border-purple-100 dark:bg-purple-950/30 dark:text-purple-400",
    icon: Gavel,
  },
  ep: {
    label: "EP",
    colors: "bg-blue-50 text-blue-700 border-blue-100 dark:bg-blue-950/30 dark:text-blue-400",
    icon: Lock,
  },
  vd: {
    label: "VD",
    colors: "bg-teal-50 text-teal-700 border-teal-100 dark:bg-teal-950/30 dark:text-teal-400",
    icon: Scale,
  },
  substituicao: {
    label: "Substituição",
    colors: "bg-slate-50 text-slate-700 border-slate-100 dark:bg-slate-800/50 dark:text-slate-400",
    icon: FileText,
  },
};

export function AreaBadge({
  area,
  size = "md",
  className,
}: AreaBadgeProps) {
  const config = areaConfig[area.toLowerCase()] || {
    label: area,
    colors: "bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-800/50 dark:text-slate-400",
    icon: FileText,
  };

  const Icon = config.icon;

  return (
    <div
      className={cn(
        "inline-flex items-center font-semibold rounded-full border",
        "transition-all duration-300",
        "shadow-[0_1px_2px_rgba(0,0,0,0.04)]",
        config.colors,
        sizeClasses[size],
        className
      )}
    >
      <Icon className={iconSizeClasses[size]} />
      <span>{config.label}</span>
    </div>
  );
}
