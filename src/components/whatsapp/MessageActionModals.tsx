"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FileUp, PenLine, FolderUp, Loader2, FileText } from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { toast } from "sonner";

// ---------------------------------------------------------------------------
// SaveToProcessModal
// ---------------------------------------------------------------------------

interface SaveToProcessModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  messageId: number;
  messageText: string | null;
  assistidoId: number | null;
  processoId: number | null;
}

export function SaveToProcessModal({
  open,
  onOpenChange,
  messageId,
  messageText,
  processoId,
}: SaveToProcessModalProps) {
  const [tipo, setTipo] = useState<"documento" | "anotacao" | "evidencia">("anotacao");
  const [observacao, setObservacao] = useState("");

  const mutation = trpc.whatsappChat.saveMessageToProcess.useMutation({
    onSuccess: () => {
      toast.success("Salvo no processo");
      setObservacao("");
      setTipo("anotacao");
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error(`Erro ao salvar: ${error.message}`);
    },
  });

  const handleSubmit = () => {
    if (!processoId) {
      toast.error("Nenhum processo vinculado a este contato");
      return;
    }
    mutation.mutate({
      messageId,
      processoId,
      tipo,
      observacao: observacao.trim() || undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileUp className="h-5 w-5 text-emerald-600" />
            Salvar no Processo
          </DialogTitle>
          <DialogDescription>
            Salvar esta mensagem como documento ou anotação no processo vinculado.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Message preview */}
          {messageText && (
            <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 p-3">
              <p className="text-xs text-neutral-600 dark:text-neutral-400 line-clamp-3 whitespace-pre-wrap">
                {messageText}
              </p>
            </div>
          )}

          {/* Tipo */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Tipo</Label>
            <div className="flex gap-3">
              {(["anotacao", "documento", "evidencia"] as const).map((t) => (
                <label
                  key={t}
                  className="flex items-center gap-1.5 cursor-pointer text-sm text-neutral-700 dark:text-neutral-300"
                >
                  <input
                    type="radio"
                    name="tipo"
                    value={t}
                    checked={tipo === t}
                    onChange={() => setTipo(t)}
                    className="accent-emerald-500"
                  />
                  {t === "anotacao" ? "Anotação" : t === "documento" ? "Documento" : "Evidência"}
                </label>
              ))}
            </div>
          </div>

          {/* Observação */}
          <div className="space-y-1.5">
            <Label htmlFor="observacao" className="text-sm font-medium">
              Observação <span className="text-neutral-400 font-normal">(opcional)</span>
            </Label>
            <Textarea
              id="observacao"
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              placeholder="Adicione uma observação..."
              rows={3}
              className="resize-none text-sm"
            />
          </div>

          {!processoId && (
            <p className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 rounded-md px-3 py-2">
              Nenhum processo vinculado a este contato.
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={mutation.isPending || !processoId}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            {mutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Salvando...
              </>
            ) : (
              <>
                <FileUp className="h-4 w-4 mr-2" />
                Salvar
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// CreateNoteModal
// ---------------------------------------------------------------------------

interface CreateNoteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  messageId: number;
  messageText: string | null;
  assistidoId: number | null;
  processoId: number | null;
}

export function CreateNoteModal({
  open,
  onOpenChange,
  messageId,
  messageText,
  assistidoId,
  processoId,
}: CreateNoteModalProps) {
  const [texto, setTexto] = useState(messageText ?? "");

  // Reset text when modal opens with new message
  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen) {
      setTexto(messageText ?? "");
    }
    onOpenChange(isOpen);
  };

  const mutation = trpc.whatsappChat.createNoteFromMessage.useMutation({
    onSuccess: () => {
      toast.success("Anotação criada");
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error(`Erro ao criar anotação: ${error.message}`);
    },
  });

  const handleSubmit = () => {
    if (!texto.trim()) {
      toast.error("O texto da anotação não pode estar vazio");
      return;
    }
    mutation.mutate({
      messageId,
      texto: texto.trim(),
      assistidoId: assistidoId ?? undefined,
      processoId: processoId ?? undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PenLine className="h-5 w-5 text-amber-500" />
            Criar Anotação
          </DialogTitle>
          <DialogDescription>
            Criar uma anotação a partir desta mensagem.
            {processoId && " Será vinculada ao processo."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="texto-anotacao" className="text-sm font-medium">
              Texto da anotação
            </Label>
            <Textarea
              id="texto-anotacao"
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              placeholder="Conteúdo da anotação..."
              rows={5}
              className="resize-none text-sm"
            />
          </div>

          {!processoId && !assistidoId && (
            <p className="text-xs text-neutral-500 dark:text-neutral-400 bg-neutral-100 dark:bg-neutral-900 rounded-md px-3 py-2">
              A anotação será salva sem vínculo a processo ou assistido.
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={mutation.isPending || !texto.trim()}
            className="bg-amber-500 hover:bg-amber-600 text-white"
          >
            {mutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Criando...
              </>
            ) : (
              <>
                <PenLine className="h-4 w-4 mr-2" />
                Criar Anotação
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// SaveToDriveModal
// ---------------------------------------------------------------------------

interface SaveToDriveModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contactId: number;
  messageIds: number[];
  mediaFilename: string | null;
}

export function SaveToDriveModal({
  open,
  onOpenChange,
  contactId,
  messageIds,
  mediaFilename,
}: SaveToDriveModalProps) {
  const [rename, setRename] = useState(mediaFilename ?? "");

  const mutation = trpc.whatsappChat.saveMediaToDrive.useMutation({
    onSuccess: (data) => {
      toast.success("Salvo no Drive", {
        description: data.files?.map((f: { name: string }) => f.name).join(", "),
      });
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error(`Erro ao salvar no Drive: ${error.message}`);
    },
  });

  const handleSubmit = () => {
    mutation.mutate({
      contactId,
      messageIds,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderUp className="h-5 w-5 text-indigo-500" />
            Salvar no Drive
          </DialogTitle>
          <DialogDescription>
            Salvar o arquivo de mídia desta mensagem no Google Drive do assistido.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* File info */}
          <div className="flex items-center gap-3 p-3 rounded-lg bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
            <div className="h-10 w-10 rounded-lg bg-neutral-200 dark:bg-neutral-700 flex items-center justify-center shrink-0">
              <FileText className="h-5 w-5 text-neutral-500 dark:text-neutral-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate text-neutral-900 dark:text-neutral-100">
                {mediaFilename || "arquivo de mídia"}
              </p>
              <p className="text-xs text-neutral-400">
                {messageIds.length} arquivo{messageIds.length !== 1 ? "s" : ""}
              </p>
            </div>
          </div>

          {/* Rename */}
          <div className="space-y-1.5">
            <Label htmlFor="rename" className="text-sm font-medium">
              Nome do arquivo <span className="text-neutral-400 font-normal">(opcional)</span>
            </Label>
            <Input
              id="rename"
              value={rename}
              onChange={(e) => setRename(e.target.value)}
              placeholder={mediaFilename ?? "nome-do-arquivo"}
              className="text-sm"
            />
          </div>

          <p className="text-xs text-neutral-500 dark:text-neutral-400 bg-neutral-100 dark:bg-neutral-900 rounded-md px-3 py-2">
            Destino: pasta do assistido / 05 - Outros
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={mutation.isPending}
            className="bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            {mutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Salvando...
              </>
            ) : (
              <>
                <FolderUp className="h-4 w-4 mr-2" />
                Salvar no Drive
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
