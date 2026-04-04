"use client";

import { FileUp, PenLine, FolderUp, Star, MoreHorizontal, Copy, Reply, Info } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface MessageActionBarProps {
  isFavorite: boolean;
  hasMedia: boolean;
  onSaveToProcess: () => void;
  onCreateNote: () => void;
  onSaveToDrive: () => void;
  onToggleFavorite: () => void;
  onCopy: () => void;
  onReply: () => void;
  onShowDetails: () => void;
}

// ---------------------------------------------------------------------------
// ActionButton — single icon button with tooltip
// ---------------------------------------------------------------------------

function ActionButton({
  label,
  onClick,
  children,
  className,
}: {
  label: string;
  onClick: (e: React.MouseEvent) => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onClick(e);
          }}
          className={cn(
            "flex items-center justify-center w-[30px] h-[30px] rounded-md",
            "bg-neutral-100 dark:bg-muted hover:bg-neutral-200 dark:hover:bg-muted/80 transition-colors duration-150",
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500",
            className,
          )}
          aria-label={label}
        >
          {children}
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" className="text-xs">
        {label}
      </TooltipContent>
    </Tooltip>
  );
}

// ---------------------------------------------------------------------------
// MessageActionBar
// ---------------------------------------------------------------------------

export function MessageActionBar({
  isFavorite,
  hasMedia,
  onSaveToProcess,
  onCreateNote,
  onSaveToDrive,
  onToggleFavorite,
  onCopy,
  onReply,
  onShowDetails,
}: MessageActionBarProps) {
  return (
    <TooltipProvider delayDuration={300}>
      <div
        className={cn(
          "absolute top-1 right-1 z-20",
          "flex items-center gap-0.5 p-1",
          "bg-white dark:bg-card border border-neutral-200 dark:border-border rounded-lg shadow-lg",
          "opacity-0 group-hover/msg:opacity-100 transition-opacity duration-150 pointer-events-none group-hover/msg:pointer-events-auto",
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Salvar no Processo */}
        <ActionButton label="Salvar no Processo" onClick={onSaveToProcess}>
          <FileUp className="w-[15px] h-[15px] text-emerald-500" />
        </ActionButton>

        {/* Criar Anotação */}
        <ActionButton label="Criar Anotação" onClick={onCreateNote}>
          <PenLine className="w-[15px] h-[15px] text-amber-500" />
        </ActionButton>

        {/* Salvar no Drive — only for media messages */}
        {hasMedia && (
          <ActionButton label="Salvar no Drive" onClick={onSaveToDrive}>
            <FolderUp className="w-[15px] h-[15px] text-indigo-500" />
          </ActionButton>
        )}

        {/* Favoritar */}
        <ActionButton label={isFavorite ? "Desfavoritar" : "Favoritar"} onClick={onToggleFavorite}>
          <Star
            className={cn(
              "w-[15px] h-[15px] transition-colors duration-150",
              isFavorite ? "text-amber-400 fill-amber-400" : "text-muted-foreground",
            )}
          />
        </ActionButton>

        {/* Divider */}
        <div className="w-px h-5 bg-neutral-300 dark:bg-border mx-0.5" />

        {/* More dropdown */}
        <DropdownMenu>
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  onClick={(e) => e.stopPropagation()}
                  className={cn(
                    "flex items-center justify-center w-[30px] h-[30px] rounded-md",
                    "bg-neutral-100 dark:bg-muted hover:bg-neutral-200 dark:hover:bg-muted/80 transition-colors duration-150",
                    "focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500",
                  )}
                  aria-label="Mais opções"
                >
                  <MoreHorizontal className="w-[15px] h-[15px] text-muted-foreground" />
                </button>
              </DropdownMenuTrigger>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">
              Mais opções
            </TooltipContent>
          </Tooltip>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                onCopy();
              }}
            >
              <Copy className="h-4 w-4 mr-2 text-muted-foreground" />
              Copiar texto
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                onReply();
              }}
            >
              <Reply className="h-4 w-4 mr-2 text-muted-foreground" />
              Responder citando
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                onShowDetails();
              }}
            >
              <Info className="h-4 w-4 mr-2 text-muted-foreground" />
              Detalhes
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </TooltipProvider>
  );
}
