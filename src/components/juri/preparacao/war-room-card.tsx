"use client";

import { forwardRef } from "react";
import {
  User,
  UserX,
  MessageSquareWarning,
  ShieldCheck,
  Landmark,
  FileText,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ============================================
// TYPES
// ============================================

export type CardType =
  | "reu"
  | "vitima"
  | "testemunha_acusacao"
  | "testemunha_defesa"
  | "fato"
  | "prova"
  | "contradicao";

export interface WarRoomCardProps {
  id: string;
  type: CardType;
  title: string;
  subtitle?: string;
  detail?: string;
  isHighlighted?: boolean;
  isContradiction?: boolean;
  onClick?: () => void;
}

// ============================================
// CONSTANTS
// ============================================

const TYPE_CONFIG: Record<
  CardType,
  {
    icon: React.ReactNode;
    label: string;
    borderColor: string;
    bgColor: string;
    darkBorderColor: string;
    darkBgColor: string;
    iconColor: string;
  }
> = {
  reu: {
    icon: <User className="w-4 h-4" />,
    label: "Reu",
    borderColor: "border-blue-300",
    bgColor: "bg-blue-50",
    darkBorderColor: "dark:border-blue-700",
    darkBgColor: "dark:bg-blue-950/30",
    iconColor: "text-blue-600 dark:text-blue-400",
  },
  vitima: {
    icon: <UserX className="w-4 h-4" />,
    label: "Vitima",
    borderColor: "border-purple-300",
    bgColor: "bg-purple-50",
    darkBorderColor: "dark:border-purple-700",
    darkBgColor: "dark:bg-purple-950/30",
    iconColor: "text-purple-600 dark:text-purple-400",
  },
  testemunha_acusacao: {
    icon: <MessageSquareWarning className="w-4 h-4" />,
    label: "Test. Acusacao",
    borderColor: "border-red-300",
    bgColor: "bg-red-50",
    darkBorderColor: "dark:border-red-700",
    darkBgColor: "dark:bg-red-950/30",
    iconColor: "text-red-600 dark:text-red-400",
  },
  testemunha_defesa: {
    icon: <ShieldCheck className="w-4 h-4" />,
    label: "Test. Defesa",
    borderColor: "border-emerald-300",
    bgColor: "bg-emerald-50",
    darkBorderColor: "dark:border-emerald-700",
    darkBgColor: "dark:bg-emerald-950/30",
    iconColor: "text-emerald-600 dark:text-emerald-400",
  },
  fato: {
    icon: <Landmark className="w-4 h-4" />,
    label: "Fato",
    borderColor: "border-stone-300",
    bgColor: "bg-stone-50",
    darkBorderColor: "dark:border-zinc-700",
    darkBgColor: "dark:bg-zinc-800/50",
    iconColor: "text-stone-600 dark:text-zinc-400",
  },
  prova: {
    icon: <FileText className="w-4 h-4" />,
    label: "Prova",
    borderColor: "border-amber-300",
    bgColor: "bg-amber-50",
    darkBorderColor: "dark:border-amber-700",
    darkBgColor: "dark:bg-amber-950/30",
    iconColor: "text-amber-600 dark:text-amber-400",
  },
  contradicao: {
    icon: <AlertTriangle className="w-4 h-4" />,
    label: "Contradicao",
    borderColor: "border-red-400",
    bgColor: "bg-red-50",
    darkBorderColor: "dark:border-red-600",
    darkBgColor: "dark:bg-red-950/40",
    iconColor: "text-red-600 dark:text-red-400",
  },
};

// ============================================
// COMPONENT
// ============================================

export const WarRoomCard = forwardRef<HTMLDivElement, WarRoomCardProps>(
  function WarRoomCard(
    { id, type, title, subtitle, detail, isHighlighted, isContradiction, onClick },
    ref
  ) {
    const config = TYPE_CONFIG[type];
    const isContradicao = type === "contradicao" || isContradiction;

    return (
      <div
        ref={ref}
        data-card-id={id}
        data-card-type={type}
        onClick={onClick}
        className={cn(
          "p-3 rounded-lg border-2 transition-all duration-200 cursor-pointer",
          "hover:shadow-md hover:-translate-y-0.5",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          config.borderColor,
          config.bgColor,
          config.darkBorderColor,
          config.darkBgColor,
          isHighlighted && "ring-2 ring-emerald-500 dark:ring-emerald-400 shadow-md",
          isContradicao && "animate-pulse border-dashed"
        )}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onClick?.();
          }
        }}
      >
        {/* Header row: Icon + Type label */}
        <div className="flex items-center gap-1.5 mb-1.5">
          <span className={config.iconColor}>{config.icon}</span>
          <span
            className={cn(
              "text-[10px] uppercase tracking-wider font-semibold",
              config.iconColor
            )}
          >
            {config.label}
          </span>
        </div>

        {/* Title */}
        <p className="text-sm font-semibold text-stone-800 dark:text-zinc-200 leading-tight">
          {title}
        </p>

        {/* Subtitle */}
        {subtitle && (
          <p className="text-xs text-stone-500 dark:text-zinc-500 mt-0.5">
            {subtitle}
          </p>
        )}

        {/* Detail (truncated) */}
        {detail && (
          <p className="text-xs text-stone-400 dark:text-zinc-600 mt-1 line-clamp-2 leading-relaxed">
            {detail}
          </p>
        )}
      </div>
    );
  }
);
