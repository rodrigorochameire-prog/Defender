"use client";

import { User } from "lucide-react";

interface AssistidoAvatarProps {
  nome?: string;
  name?: string; // Compatibilidade com DemandaCard do repositório
  photoUrl?: string;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  showHoverEffect?: boolean;
  statusColor?: string; // Nova prop para cor do status
  isCardHovered?: boolean; // Nova prop para detectar hover do card pai
}

// Função para extrair iniciais
function getInitials(name: string | undefined | null): string {
  if (!name) return '?';
  const words = name.trim().split(' ').filter(word => word.length > 0);
  if (words.length === 0) return '?';
  if (words.length === 1) return words[0].substring(0, 2).toUpperCase();
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}

export function AssistidoAvatar({ 
  nome,
  name,
  photoUrl,
  size = "md", 
  className = "",
  showHoverEffect = true,
  statusColor = "#10b981", // Verde padrão
  isCardHovered = false,
}: AssistidoAvatarProps) {
  // Suporta tanto 'nome' quanto 'name' para compatibilidade
  const displayName = nome || name || "";
  const sizeClasses = {
    sm: "w-10 h-10",
    md: "w-14 h-14",
    lg: "w-20 h-20",
    xl: "w-24 h-24",
  };

  const iconSizes = {
    sm: "w-3 h-3",
    md: "w-5 h-5",
    lg: "w-8 h-8",
    xl: "w-10 h-10",
  };

  const initials = getInitials(displayName);

  return (
    <div
      className={`
        ${sizeClasses[size]}
        rounded-xl
        overflow-hidden
        flex items-center justify-center
        border-2
        relative
        bg-zinc-100 dark:bg-zinc-800
        transition-all duration-500 ease-out
        ${showHoverEffect ? "hover:shadow-xl hover:scale-110 hover:-translate-y-1" : ""}
        ${className}
      `}
      style={{
        borderColor: isCardHovered ? statusColor : '#a1a1aa',
      }}
      title={nome}
    >
      {/* Ícone User */}
      <User 
        className={`${iconSizes[size]} text-zinc-500 dark:text-zinc-400 transition-all duration-500`}
        strokeWidth={2}
        style={{
          color: isCardHovered ? statusColor : undefined,
        }}
      />
    </div>
  );
}