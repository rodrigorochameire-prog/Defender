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
  /** Forma: squircle (quadrado de vértices arredondados — padrão OMBUDS) ou circle. */
  shape?: "squircle" | "circle";
  atribuicao?: string | null;
  statusPrisional?: string | null;
  showStatusDot?: boolean;
  className?: string;
  onClick?: () => void;
}

// Maps compartilhados — fonte única de dimensão/raio/dot para todos os avatares
// do OMBUDS (assistido/réu e pessoas: testemunha, vítima, etc.).
export const AVATAR_SIZE_CLASSES = {
  xs: "h-6 w-6",
  sm: "h-8 w-8",
  md: "h-11 w-11",
  lg: "h-14 w-14",
  xl: "h-20 w-20",
} as const;

export const AVATAR_TEXT_CLASSES = {
  xs: "text-[10px]",
  sm: "text-[11px]",
  md: "text-sm",
  lg: "text-base",
  xl: "text-xl",
} as const;

// Raio escala com o tamanho — squircle suave sem virar "caixa".
export const AVATAR_RADIUS_CLASSES = {
  xs: "rounded-lg",
  sm: "rounded-lg",
  md: "rounded-xl",
  lg: "rounded-2xl",
  xl: "rounded-2xl",
} as const;

export const AVATAR_DOT_CLASSES = {
  xs: "w-2 h-2 -bottom-0.5 -right-0.5 border",
  sm: "w-2.5 h-2.5 -bottom-0.5 -right-0.5 border-[1.5px]",
  md: "w-3 h-3 -bottom-0.5 -right-0.5 border-2",
  lg: "w-3.5 h-3.5 -bottom-1 -right-1 border-2",
  xl: "w-4 h-4 -bottom-1 -right-1 border-2",
} as const;

export type AvatarSize = keyof typeof AVATAR_SIZE_CLASSES;

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
  shape = "squircle",
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
  const radius = shape === "circle" ? "rounded-full" : AVATAR_RADIUS_CLASSES[size];

  return (
    <div className={cn("relative inline-flex flex-shrink-0", className)}>
      <Avatar
        className={cn(
          AVATAR_SIZE_CLASSES[size],
          radius,
          // Anel de atribuição no contêiner — moldura sutil que vale p/ foto E iniciais.
          "shadow-sm transition-all duration-200 ring-[1.5px] ring-inset",
          gradient.ring,
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
            radius,
            "bg-gradient-to-br font-semibold",
            gradient.from,
            gradient.to,
            gradient.text,
            gradient.darkFrom,
            gradient.darkTo,
            gradient.darkText,
            AVATAR_TEXT_CLASSES[size],
          )}
        >
          {initials}
        </AvatarFallback>
      </Avatar>

      {dotColor && (
        <span
          className={cn(
            "absolute rounded-full border-white dark:border-neutral-900",
            AVATAR_DOT_CLASSES[size],
            dotColor,
          )}
        />
      )}
    </div>
  );
}
