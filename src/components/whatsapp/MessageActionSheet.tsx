"use client";

import { FileUp, PenLine, FolderUp, Star, Copy, Reply, Info } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface MessageActionSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
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
// Row — full-width touch target
// ---------------------------------------------------------------------------

function ActionRow({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-3 w-full px-2 py-3 rounded-lg text-sm text-foreground hover:bg-muted active:bg-muted transition-colors"
    >
      <span className="shrink-0">{icon}</span>
      <span>{label}</span>
    </button>
  );
}

// ---------------------------------------------------------------------------
// MessageActionSheet — mobile equivalent of the hover MessageActionBar
// ---------------------------------------------------------------------------

export function MessageActionSheet({
  open,
  onOpenChange,
  isFavorite,
  hasMedia,
  onSaveToProcess,
  onCreateNote,
  onSaveToDrive,
  onToggleFavorite,
  onCopy,
  onReply,
  onShowDetails,
}: MessageActionSheetProps) {
  // Run an action, then dismiss the sheet.
  const run = (fn: () => void) => () => {
    fn();
    onOpenChange(false);
  };

  const iconClass = "h-4 w-4 text-muted-foreground";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl pb-6">
        <SheetHeader className="text-left">
          <SheetTitle className="text-sm font-medium text-muted-foreground">
            Ações da mensagem
          </SheetTitle>
        </SheetHeader>
        <div className="mt-2 flex flex-col">
          <ActionRow
            icon={<FileUp className={iconClass} />}
            label="Salvar no Processo"
            onClick={run(onSaveToProcess)}
          />
          <ActionRow
            icon={<PenLine className={iconClass} />}
            label="Criar Anotação"
            onClick={run(onCreateNote)}
          />
          {hasMedia && (
            <ActionRow
              icon={<FolderUp className={iconClass} />}
              label="Salvar no Drive"
              onClick={run(onSaveToDrive)}
            />
          )}
          <ActionRow
            icon={
              <Star
                className={cn(
                  "h-4 w-4",
                  isFavorite ? "text-amber-400 fill-amber-400" : "text-muted-foreground",
                )}
              />
            }
            label={isFavorite ? "Desfavoritar" : "Favoritar"}
            onClick={run(onToggleFavorite)}
          />
          <ActionRow
            icon={<Copy className={iconClass} />}
            label="Copiar texto"
            onClick={run(onCopy)}
          />
          <ActionRow
            icon={<Reply className={iconClass} />}
            label="Responder citando"
            onClick={run(onReply)}
          />
          <ActionRow
            icon={<Info className={iconClass} />}
            label="Detalhes"
            onClick={run(onShowDetails)}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}
