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
  /** Sobrescreve o rótulo (ex.: substatus "2 - Elaborar" na tabela, p/ fidelidade). */
  label?: string;
  /** Mostra o ícone do status à esquerda do rótulo. */
  showIcon?: boolean;
  /** Mostra o chevron (indica editável). Default: true quando interativo. */
  showChevron?: boolean;
  /** Trunca o rótulo — para linhas densas de lista/tabela. */
  truncate?: boolean;
  size?: "sm" | "md";
  className?: string;
  title?: string;
  /** Marca o trigger p/ o posicionamento/outside-click programático da view. */
  "data-status-trigger"?: boolean;
}

/**
 * Chip de status de demanda — fonte ÚNICA do padrão (card, lista e tabela).
 * Cor semântica vem de getStatusConfig (config central). Variante interativa
 * (<button>, com ref encaminhado p/ ancorar dropdowns) ou estática (<span>).
 */
export const StatusChip = React.forwardRef<HTMLButtonElement, StatusChipProps>(function StatusChip(
  {
    status,
    onClick,
    label,
    showIcon = false,
    showChevron,
    truncate = false,
    size = "md",
    className,
    title,
    "data-status-trigger": dataStatusTrigger,
  },
  ref,
) {
  const conf = getStatusConfig(status);
  const Icon = conf.icon;
  const interactive = typeof onClick === "function";
  const chevron = showChevron ?? interactive;
  const text = label ?? conf.label;
  const sizeCls = size === "sm" ? "px-2 py-1 text-[10px]" : "px-3 py-1.5 text-[11px]";

  const base = cn(
    "inline-flex items-center gap-1.5 rounded-lg font-semibold transition-all",
    truncate && "min-w-0",
    sizeCls,
    interactive && "hover:scale-105 cursor-pointer",
    className,
  );

  const content = (
    <>
      {showIcon && Icon && <Icon className="w-3 h-3 flex-shrink-0" />}
      <span className={cn(truncate && "truncate max-w-[120px]")}>{text}</span>
      {chevron && <ChevronDown className="w-3 h-3 opacity-60 flex-shrink-0" />}
    </>
  );

  if (interactive) {
    return (
      <button
        ref={ref}
        type="button"
        onClick={onClick}
        className={base}
        style={statusChipStyle(conf.color)}
        aria-label={`Status: ${text}`}
        title={title}
        data-status-trigger={dataStatusTrigger}
      >
        {content}
      </button>
    );
  }

  return (
    <span className={base} style={statusChipStyle(conf.color)} title={title}>
      {content}
    </span>
  );
});
