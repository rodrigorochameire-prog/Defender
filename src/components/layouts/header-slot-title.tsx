"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface HeaderSlotTitleProps {
  /** Lucide icon component (rendered inside accent badge) */
  icon: LucideIcon;
  /** Page title */
  title: string;
  /** Optional accent color (hex) for icon background — falls back to subtle white */
  accentHex?: string | null;
  /** Stats / counts to render after the title (numeric chips, badges, etc.) */
  stats?: ReactNode;
  /** Hide the leading vertical divider (default: shown to separate from breadcrumbs) */
  hideDivider?: boolean;
}

/**
 * Portala título + ícone + stats da página dentro da utility bar global
 * (#header-slot, em HeaderUtilityRow). Pareado com `seamless` no
 * CollapsiblePageHeader, elimina a row 1 do page header e funde título
 * com a topbar.
 *
 * O #header-slot só existe depois que CollapsiblePageHeader monta — por
 * isso esperamos 1 rAF antes de localizar o elemento.
 */
export function HeaderSlotTitle({
  icon: Icon,
  title,
  accentHex,
  stats,
  hideDivider,
}: HeaderSlotTitleProps) {
  const [slotEl, setSlotEl] = useState<HTMLElement | null>(null);

  useEffect(() => {
    const id = requestAnimationFrame(() => {
      setSlotEl(document.getElementById("header-slot"));
    });
    return () => cancelAnimationFrame(id);
  }, []);

  if (!slotEl) return null;

  return createPortal(
    <div className="flex items-center gap-2 pl-3 min-w-0">
      {!hideDivider && (
        <div className="h-4 w-px bg-white/[0.10] shrink-0" aria-hidden />
      )}
      <div
        className={cn(
          "w-5 h-5 rounded flex items-center justify-center transition-colors duration-300 shrink-0",
        )}
        style={
          accentHex
            ? {
                backgroundColor: `${accentHex}26`,
                boxShadow: `inset 0 0 0 1px ${accentHex}40`,
              }
            : { backgroundColor: "rgba(255,255,255,0.08)" }
        }
      >
        <Icon className="w-3 h-3" style={{ color: accentHex ?? "#ffffff" }} />
      </div>
      <h1 className="text-white text-[12px] font-semibold tracking-tight whitespace-nowrap">
        {title}
      </h1>
      {stats && (
        <div className="flex items-center gap-2 text-[10.5px] tabular-nums whitespace-nowrap shrink-0">
          {stats}
        </div>
      )}
    </div>,
    slotEl,
  );
}
