"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getAvatarGradient } from "@/lib/config/atribuicoes";
import { cn, getInitials } from "@/lib/utils";

export interface AssistidoAvatarProps {
  nome: string;
  /** Alias for nome (backward compat with DemandaCard) */
  name?: string;
  photoUrl?: string | null;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  atribuicao?: string | null;
  statusPrisional?: string | null;
  showStatusDot?: boolean;
  className?: string;
  onClick?: () => void;
}

const SIZE_CLASSES = {
  xs: "h-6 w-6",
  sm: "h-8 w-8",
  md: "h-10 w-10",
  lg: "h-12 w-12",
  xl: "h-16 w-16",
} as const;

const TEXT_CLASSES = {
  xs: "text-[10px]",
  sm: "text-[10px]",
  md: "text-xs",
  lg: "text-sm",
  xl: "text-lg",
} as const;

const DOT_CLASSES = {
  xs: "w-2 h-2 -bottom-0 -right-0 border",
  sm: "w-2.5 h-2.5 -bottom-0.5 -right-0.5 border-[1.5px]",
  md: "w-3 h-3 -bottom-0.5 -right-0.5 border-2",
  lg: "w-3.5 h-3.5 -bottom-0.5 -right-0.5 border-2",
  xl: "w-4 h-4 -bottom-1 -right-1 border-2",
} as const;

function getStatusDotColor(statusPrisional: string | null | undefined) {
  if (!statusPrisional) return null;
  const s = statusPrisional.toUpperCase();
  if (s === "SOLTO") return null;
  if (s === "MONITORADO" || s === "DOMICILIAR") return "bg-amber-500";
  // All prison statuses: CADEIA_PUBLICA, PENITENCIARIA, COP, HOSPITAL_CUSTODIA
  return "bg-rose-500";
}

export function AssistidoAvatar({
  nome,
  name,
  photoUrl,
  size = "md",
  atribuicao,
  statusPrisional,
  showStatusDot = false,
  className,
  onClick,
}: AssistidoAvatarProps) {
  const displayName = nome || name || "";
  const initials = displayName ? getInitials(displayName) : "?";
  const gradient = getAvatarGradient(atribuicao);
  const dotColor = showStatusDot ? getStatusDotColor(statusPrisional) : null;

  return (
    <div className={cn("relative inline-flex flex-shrink-0", className)}>
      <Avatar
        className={cn(
          SIZE_CLASSES[size],
          "shadow-sm transition-all duration-200",
          onClick && "cursor-pointer hover:scale-105 hover:shadow-md",
        )}
        onClick={onClick}
      >
        {photoUrl && (
          <AvatarImage
            src={photoUrl}
            alt={displayName}
            className="object-cover"
          />
        )}
        <AvatarFallback
          className={cn(
            "bg-gradient-to-br font-semibold",
            gradient.from,
            gradient.to,
            gradient.text,
            gradient.darkFrom,
            gradient.darkTo,
            gradient.darkText,
            TEXT_CLASSES[size],
          )}
        >
          {initials}
        </AvatarFallback>
      </Avatar>

      {dotColor && (
        <span
          className={cn(
            "absolute rounded-full border-white dark:border-zinc-900",
            DOT_CLASSES[size],
            dotColor,
          )}
        />
      )}
    </div>
  );
}
