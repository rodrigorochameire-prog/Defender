"use client";

import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  BookmarkPlus,
  FolderUp,
  Sparkles,
  Loader2,
  FileText,
  Image,
  Mic,
  Video,
  Check,
} from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { toast } from "sonner";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Message {
  id: number;
  waMessageId: string | null;
  direction: string;
  type: string;
  content: string | null;
  mediaUrl: string | null;
  mediaMimeType: string | null;
  mediaFilename: string | null;
  status: string;
  createdAt: Date;
}

interface SelectionActionModalsProps {
  contactId: number;
  selectedMessageIds: number[];
  selectedMessages: Message[];
  contactName: string;
  assistidoName: string | null;
  showSaveCase: boolean;
  showSaveDrive: boolean;
  showSummary: boolean;
  onCloseSaveCase: () => void;
  onCloseSaveDrive: () => void;
  onCloseSummary: () => void;
  onSuccess: () => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatMessagePreview(msg: Message, contactName: string): string {
  const date = new Date(msg.createdAt);
  const dateStr = format(date, "dd/MM/yyyy HH:mm", { locale: ptBR });
  const sender = msg.direction === "outbound" ? "Defensor" : contactName;
  let content = msg.content || "";
  if (msg.type === "image") content = content ? `[Imagem] ${content}` : "[Imagem]";
  if (msg.type === "document")
    content = content
      ? `[Documento: ${msg.mediaFilename || "arquivo"}] ${content}`
      : `[Documento: ${msg.mediaFilename || "arquivo"}]`;
  if (msg.type === "audio") content = "[Áudio]";
  if (msg.type === "video") content = "[Vídeo]";
  return `[${dateStr}] ${sender}:\n${content}`;
}

function getMediaIcon(type: string) {
  switch (type) {
    case "image":
      return <Image className="h-4 w-4 text-blue-500" />;
    case "document":
      return <FileText className="h-4 w-4 text-orange-500" />;
    case "audio":
      return <Mic className="h-4 w-4 text-purple-500" />;
    case "video":
      return <Video className="h-4 w-4 text-pink-500" />;
    default:
      return <FileText className="h-4 w-4 text-zinc-400" />;
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function SelectionActionModals({
  contactId,
  selectedMessageIds,
  selectedMessages,
  contactName,
  assistidoName,
  showSaveCase,
  showSaveDrive,
  showSummary,
  onCloseSaveCase,
  onCloseSaveDrive,
  onCloseSummary,
  onSuccess,
}: SelectionActionModalsProps) {
  // -- Save to Case state
  const [importante, setImportante] = useState(false);

  // -- Summary state
  const [summaryText, setSummaryText] = useState("");
  const [summaryStructured, setSummaryStructured] = useState<{
    fatos: string[];
    pedidos: string[];
    providencias: string[];
  } | null>(null);
  const [summaryGenerated, setSummaryGenerated] = useState(false);
  const [summaryEdited, setSummaryEdited] = useState(false);

  // -- Mutations
  const saveToCaseMutation = trpc.whatsappChat.saveToCase.useMutation({
    onSuccess: (data) => {
      toast.success(`Recorte salvo no caso de ${assistidoName}`, {
        description: `${selectedMessages.length} mensagens salvas como anotação`,
      });
      setImportante(false);
      onCloseSaveCase();
      onSuccess();
    },
    onError: (error) => {
      toast.error(`Erro ao salvar: ${error.message}`);
    },
  });

  const saveMediaToDriveMutation = trpc.whatsappChat.saveMediaToDrive.useMutation({
    onSuccess: (data) => {
      toast.success(`${data.savedCount} arquivo${data.savedCount !== 1 ? "s" : ""} salvo${data.savedCount !== 1 ? "s" : ""} no Drive`, {
        description: data.files.map((f) => f.name).join(", "),
      });
      onCloseSaveDrive();
      onSuccess();
    },
    onError: (error) => {
      toast.error(`Erro ao salvar no Drive: ${error.message}`);
    },
  });

  const generateSummaryMutation = trpc.whatsappChat.generateSummary.useMutation({
    onSuccess: (data) => {
      setSummaryText(data.summary);
      setSummaryStructured(data.structured);
      setSummaryGenerated(true);
    },
    onError: (error) => {
      toast.error(`Erro ao gerar resumo: ${error.message}`);
    },
  });

  const saveSummaryMutation = trpc.whatsappChat.saveSummary.useMutation({
    onSuccess: () => {
      toast.success(`Resumo salvo no caso de ${assistidoName}`);
      resetSummaryState();
      onCloseSummary();
      onSuccess();
    },
    onError: (error) => {
      toast.error(`Erro ao salvar resumo: ${error.message}`);
    },
  });

  const resetSummaryState = () => {
    setSummaryText("");
    setSummaryStructured(null);
    setSummaryGenerated(false);
    setSummaryEdited(false);
  };

  // Preview content for save case modal
  const previewContent = selectedMessages
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    .map((m) => formatMessagePreview(m, contactName))
    .join("\n\n");

  // Media messages for Drive modal
  const mediaMessages = selectedMessages.filter(
    (m) => m.type !== "text" && m.mediaUrl
  );

  return (
    <>
      {/* ================================================================ */}
      {/* MODAL: Salvar no Caso                                           */}
      {/* ================================================================ */}
      <Dialog open={showSaveCase} onOpenChange={(open) => !open && onCloseSaveCase()}>
        <DialogContent className="max-w-lg max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BookmarkPlus className="h-5 w-5 text-emerald-600" />
              Salvar no Caso
            </DialogTitle>
            <DialogDescription>
              {selectedMessages.length} mensagem{selectedMessages.length !== 1 ? "s" : ""} de{" "}
              <strong>{contactName}</strong> serão salvas como anotação no caso de{" "}
              <strong>{assistidoName}</strong>.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 p-3">
            <pre className="text-xs whitespace-pre-wrap text-zinc-700 dark:text-zinc-300 font-mono leading-relaxed">
              {previewContent}
            </pre>
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="importante"
              checked={importante}
              onCheckedChange={(checked) => setImportante(checked === true)}
            />
            <label htmlFor="importante" className="text-sm text-zinc-600 dark:text-zinc-400 cursor-pointer">
              Marcar como importante
            </label>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={onCloseSaveCase}>
              Cancelar
            </Button>
            <Button
              onClick={() =>
                saveToCaseMutation.mutate({
                  contactId,
                  messageIds: selectedMessageIds,
                  importante,
                })
              }
              disabled={saveToCaseMutation.isPending}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {saveToCaseMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <BookmarkPlus className="h-4 w-4 mr-2" />
              )}
              Salvar Anotação
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ================================================================ */}
      {/* MODAL: Salvar no Drive                                          */}
      {/* ================================================================ */}
      <Dialog open={showSaveDrive} onOpenChange={(open) => !open && onCloseSaveDrive()}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FolderUp className="h-5 w-5 text-blue-600" />
              Salvar no Drive
            </DialogTitle>
            <DialogDescription>
              {mediaMessages.length} arquivo{mediaMessages.length !== 1 ? "s" : ""} de mídia
              serão salvos na pasta do assistido <strong>{assistidoName}</strong>.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            {mediaMessages.map((msg) => (
              <div
                key={msg.id}
                className="flex items-center gap-3 p-2 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800"
              >
                {getMediaIcon(msg.type)}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate text-zinc-900 dark:text-zinc-100">
                    {msg.mediaFilename || `${msg.type}_${format(new Date(msg.createdAt), "HHmm")}`}
                  </p>
                  <p className="text-xs text-zinc-500">
                    {msg.mediaMimeType} · {format(new Date(msg.createdAt), "dd/MM HH:mm")}
                  </p>
                </div>
                <Badge variant="secondary" className="text-[10px]">
                  {msg.type}
                </Badge>
              </div>
            ))}
          </div>

          <p className="text-xs text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-900 rounded-md px-3 py-2">
            Destino: <strong>{assistidoName}</strong> / 05 - Outros
          </p>

          <DialogFooter>
            <Button variant="outline" onClick={onCloseSaveDrive}>
              Cancelar
            </Button>
            <Button
              onClick={() =>
                saveMediaToDriveMutation.mutate({
                  contactId,
                  messageIds: selectedMessageIds,
                })
              }
              disabled={saveMediaToDriveMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {saveMediaToDriveMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Salvando...
                </>
              ) : (
                <>
                  <FolderUp className="h-4 w-4 mr-2" />
                  Salvar {mediaMessages.length} arquivo{mediaMessages.length !== 1 ? "s" : ""}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ================================================================ */}
      {/* MODAL: Resumo IA                                                */}
      {/* ================================================================ */}
      <Dialog
        open={showSummary}
        onOpenChange={(open) => {
          if (!open) {
            resetSummaryState();
            onCloseSummary();
          }
        }}
      >
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-purple-600" />
              Resumo com IA
            </DialogTitle>
            <DialogDescription>
              {summaryGenerated
                ? "Revise e edite o resumo antes de salvar como anotação."
                : `Gerando resumo de ${selectedMessages.length} mensagens...`}
            </DialogDescription>
          </DialogHeader>

          {!summaryGenerated ? (
            // Loading state — auto-trigger generation
            <div className="flex-1 flex flex-col items-center justify-center gap-4 py-12">
              {generateSummaryMutation.isPending ? (
                <>
                  <Loader2 className="h-10 w-10 animate-spin text-purple-500" />
                  <p className="text-sm text-zinc-500">Analisando mensagens com IA...</p>
                </>
              ) : (
                <Button
                  onClick={() =>
                    generateSummaryMutation.mutate({
                      contactId,
                      messageIds: selectedMessageIds,
                    })
                  }
                  className="bg-purple-600 hover:bg-purple-700 text-white"
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                  Gerar Resumo
                </Button>
              )}
            </div>
          ) : (
            // Summary display
            <div className="flex-1 overflow-y-auto space-y-4">
              {/* Structured sections */}
              {summaryStructured && (
                <div className="grid gap-3">
                  {summaryStructured.fatos.length > 0 && (
                    <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-3">
                      <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">
                        Fatos Relatados
                      </h4>
                      <ul className="space-y-1">
                        {summaryStructured.fatos.map((f, i) => (
                          <li key={i} className="text-sm text-zinc-700 dark:text-zinc-300 flex items-start gap-2">
                            <span className="text-emerald-500 mt-0.5">•</span>
                            {f}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {summaryStructured.pedidos.length > 0 && (
                    <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-3">
                      <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">
                        Pedidos / Demandas
                      </h4>
                      <ul className="space-y-1">
                        {summaryStructured.pedidos.map((p, i) => (
                          <li key={i} className="text-sm text-zinc-700 dark:text-zinc-300 flex items-start gap-2">
                            <span className="text-blue-500 mt-0.5">•</span>
                            {p}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {summaryStructured.providencias.length > 0 && (
                    <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-3">
                      <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">
                        Providências Necessárias
                      </h4>
                      <ul className="space-y-1">
                        {summaryStructured.providencias.map((p, i) => (
                          <li key={i} className="text-sm text-zinc-700 dark:text-zinc-300 flex items-start gap-2">
                            <span className="text-orange-500 mt-0.5">•</span>
                            {p}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {/* Editable summary */}
              <div>
                <label className="text-xs font-medium text-zinc-500 mb-1 block">
                  Resumo (editável)
                </label>
                <Textarea
                  value={summaryText}
                  onChange={(e) => {
                    setSummaryText(e.target.value);
                    setSummaryEdited(true);
                  }}
                  className="min-h-[120px] text-sm"
                  placeholder="Resumo gerado pela IA..."
                />
              </div>
            </div>
          )}

          {summaryGenerated && (
            <DialogFooter>
              <Button variant="outline" onClick={() => { resetSummaryState(); onCloseSummary(); }}>
                Cancelar
              </Button>
              <Button
                onClick={() =>
                  saveSummaryMutation.mutate({
                    contactId,
                    messageIds: selectedMessageIds,
                    summary: summaryText,
                    editedByUser: summaryEdited,
                  })
                }
                disabled={saveSummaryMutation.isPending || !summaryText.trim()}
                className="bg-purple-600 hover:bg-purple-700 text-white"
              >
                {saveSummaryMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Check className="h-4 w-4 mr-2" />
                )}
                Salvar como Anotação
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
