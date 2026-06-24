"use client";

import React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { getStatusConfig } from "@/config/demanda-status";
import { statusChipStyle } from "./ds";

interface StatusChipProps {
  status: string | null | undefined;
  /** Quando passado, vira <button> (abre seletor de status). Recebe o evento (opcional). */
  onClick?: (e: React.MouseEvent) => void;
  /** Mostra o ícone do status à esquerda do rótulo. */
  showIcon?: boolean;
  /** Mostra o chevron (indica editável). Default: true quando interativo. */
  showChevron?: boolean;
  size?: "sm" | "md";
  className?: string;
}

/**
 * Chip de status de demanda — fonte única do padrão antes inline em
 * DemandaCard/Table/Compact. Cor semântica vem de getStatusConfig (config central).
 */
export function StatusChip({
  status,
  onClick,
  showIcon = false,
  showChevron,
  size = "md",
  className,
}: StatusChipProps) {
  const conf = getStatusConfig(status);
  const Icon = conf.icon;
  const interactive = typeof onClick === "function";
  const chevron = showChevron ?? interactive;
  const sizeCls = size === "sm" ? "px-2 py-1 text-[10px]" : "px-3 py-1.5 text-[11px]";

  const base = cn(
    "inline-flex items-center gap-1.5 rounded-lg font-semibold transition-all",
    sizeCls,
    interactive && "hover:scale-105 cursor-pointer",
    className,
  );

  const content = (
    <>
      {showIcon && Icon && <Icon className="w-3 h-3" />}
      <span>{conf.label}</span>
      {chevron && <ChevronDown className="w-3 h-3 opacity-60" />}
    </>
  );

  if (interactive) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={base}
        style={statusChipStyle(conf.color)}
        aria-label={`Status: ${conf.label}`}
      >
        {content}
      </button>
    );
  }

  return (
    <span className={base} style={statusChipStyle(conf.color)}>
      {content}
    </span>
  );
}
