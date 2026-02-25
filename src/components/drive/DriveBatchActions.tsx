"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { useDriveContext } from "./DriveContext";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Sparkles, Trash2, X, Loader2 } from "lucide-react";
import { toast } from "sonner";

// ─── Main Component ─────────────────────────────────────────────────

export function DriveBatchActions() {
  const ctx = useDriveContext();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const retryEnrichment = trpc.drive.retryEnrichment.useMutation({
    onSuccess: () => {
      toast.success("Extracao iniciada para os arquivos selecionados");
      ctx.clearSelection();
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao iniciar extracao");
    },
  });

  const deleteFile = trpc.drive.deleteFile.useMutation({
    onError: (error) => {
      toast.error(error.message || "Erro ao excluir arquivo");
    },
  });

  const selectedCount = ctx.selectedFileIds.size;

  if (selectedCount === 0) return null;

  const handleExtract = () => {
    retryEnrichment.mutate({
      fileIds: Array.from(ctx.selectedFileIds),
    });
  };

  const handleDelete = async () => {
    // Note: deleteFile expects driveFileId (string), but we have DB ids (number)
    // For batch delete, we would need to map ids. For now, we close the dialog
    // and show a toast, as the mutation input type is { fileId: string }.
    // In practice, the parent component or a batch-delete endpoint would handle this.
    toast.info("Exclusao em lote sera implementada em breve");
    setShowDeleteDialog(false);
    ctx.clearSelection();
  };

  return (
    <>
      {/* Floating Action Bar */}
      <div
        className={cn(
          "fixed bottom-4 left-1/2 -translate-x-1/2 z-40",
          "bg-zinc-900 border border-zinc-700 rounded-full shadow-2xl",
          "px-4 py-2 flex items-center gap-3",
          "animate-in slide-in-from-bottom-4 fade-in duration-200"
        )}
      >
        {/* Selection count */}
        <span className="text-sm font-medium text-zinc-200 whitespace-nowrap">
          {selectedCount} selecionado{selectedCount !== 1 ? "s" : ""}
        </span>

        {/* Separator */}
        <div className="h-5 w-px bg-zinc-700" />

        {/* Extract with AI */}
        <Button
          variant="ghost"
          size="sm"
          className="h-8 px-3 text-xs text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 rounded-full"
          onClick={handleExtract}
          disabled={retryEnrichment.isPending}
        >
          {retryEnrichment.isPending ? (
            <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
          ) : (
            <Sparkles className="h-3.5 w-3.5 mr-1.5" />
          )}
          Extrair com IA
        </Button>

        {/* Delete */}
        <Button
          variant="ghost"
          size="sm"
          className="h-8 px-3 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-full"
          onClick={() => setShowDeleteDialog(true)}
        >
          <Trash2 className="h-3.5 w-3.5 mr-1.5" />
          Excluir
        </Button>

        {/* Clear selection */}
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-zinc-500 hover:text-zinc-300 rounded-full"
          onClick={() => ctx.clearSelection()}
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="bg-zinc-900 border-zinc-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-zinc-100">
              Confirmar exclusao
            </AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400">
              Tem certeza que deseja excluir{" "}
              <span className="font-medium text-zinc-200">
                {selectedCount} arquivo{selectedCount !== 1 ? "s" : ""}
              </span>
              ? Esta acao nao pode ser desfeita e os arquivos serao removidos
              permanentemente do Google Drive.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-zinc-700 text-zinc-300 hover:bg-zinc-800">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Excluir {selectedCount} arquivo{selectedCount !== 1 ? "s" : ""}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
