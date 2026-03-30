"use client";

import { useEffect, useRef } from "react";
import { PenLine, Copy, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

// ==========================================
// HIGHLIGHT POPOVER - Toolbar de selecao
// ==========================================

interface HighlightPopoverProps {
  artigoId: string;
  leiId: string;
  selectedText: string;
  position: { x: number; y: number };
  onHighlight: (cor: string) => void;
  onNote: () => void;
  onCopyRef: () => void;
  onClose: () => void;
}

const CORES = [
  { id: "yellow", bg: "bg-yellow-200", ring: "ring-yellow-400", hex: "#fef08a" },
  { id: "green", bg: "bg-green-200", ring: "ring-green-400", hex: "#bbf7d0" },
  { id: "blue", bg: "bg-blue-200", ring: "ring-blue-400", hex: "#bfdbfe" },
  { id: "red", bg: "bg-red-200", ring: "ring-red-400", hex: "#fecaca" },
] as const;

export function HighlightPopover({
  selectedText,
  position,
  onHighlight,
  onNote,
  onCopyRef,
  onClose,
}: HighlightPopoverProps) {
  const popoverRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onClose();
      }
    }

    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [onClose]);

  if (!selectedText) return null;

  return (
    <div
      ref={popoverRef}
      className={cn(
        "fixed z-50 flex items-center gap-1 rounded-lg border px-2 py-1.5 shadow-lg",
        "bg-white border-zinc-200",
        "dark:bg-muted dark:border-border",
        "animate-in fade-in-0 zoom-in-95"
      )}
      style={{
        left: position.x,
        top: position.y,
        transform: "translate(-50%, -100%) translateY(-8px)",
      }}
    >
      {/* Color buttons */}
      {CORES.map((cor) => (
        <button
          key={cor.id}
          className={cn(
            "h-6 w-6 rounded-full border border-zinc-300 dark:border-border transition-transform",
            "hover:scale-110 hover:ring-2",
            cor.bg,
            cor.ring
          )}
          onClick={() => onHighlight(cor.id)}
          title={`Destacar em ${cor.id}`}
          aria-label={`Destacar em ${cor.id}`}
        />
      ))}

      {/* Divider */}
      <div className="mx-1 h-5 w-px bg-zinc-200 dark:bg-border" />

      {/* Anotar */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={onNote}
          >
            <PenLine className="h-3.5 w-3.5 text-zinc-600 dark:text-foreground/80" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Anotar</TooltipContent>
      </Tooltip>

      {/* Copiar ref */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={onCopyRef}
          >
            <Copy className="h-3.5 w-3.5 text-zinc-600 dark:text-foreground/80" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Copiar referencia</TooltipContent>
      </Tooltip>

      {/* Fechar */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={onClose}
          >
            <X className="h-3.5 w-3.5 text-muted-foreground" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Fechar</TooltipContent>
      </Tooltip>
    </div>
  );
}
