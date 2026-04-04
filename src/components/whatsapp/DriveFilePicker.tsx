"use client";

import { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Folder,
  FileText,
  Image,
  Music,
  Video,
  ChevronRight,
  ArrowLeft,
  Loader2,
  FileQuestion,
  Send,
} from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DriveFilePickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contactId: number;
  configId: number;
  /** Drive folder ID of the assistido (if linked) */
  assistidoDriveFolderId?: string | null;
  assistidoName?: string | null;
  onSuccess: () => void;
}

interface DriveItem {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  modifiedTime?: string;
  webViewLink?: string;
  webContentLink?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const FOLDER_MIME = "application/vnd.google-apps.folder";

function getFileIcon(mimeType: string, name: string) {
  if (mimeType === FOLDER_MIME) {
    return <Folder className="h-5 w-5 text-amber-500" />;
  }
  if (mimeType.startsWith("image/")) {
    return <Image className="h-5 w-5 text-blue-500" />;
  }
  if (mimeType.startsWith("audio/")) {
    return <Music className="h-5 w-5 text-purple-500" />;
  }
  if (mimeType.startsWith("video/")) {
    return <Video className="h-5 w-5 text-pink-500" />;
  }
  if (
    mimeType === "application/pdf" ||
    mimeType.includes("document") ||
    mimeType.includes("text") ||
    name.match(/\.(pdf|doc|docx|txt|rtf|odt)$/i)
  ) {
    return <FileText className="h-5 w-5 text-red-500" />;
  }
  return <FileQuestion className="h-5 w-5 text-muted-foreground" />;
}

function getMediaType(mimeType: string): "image" | "audio" | "video" | "document" {
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("audio/")) return "audio";
  if (mimeType.startsWith("video/")) return "video";
  return "document";
}

function formatFileSize(bytes?: string): string {
  if (!bytes) return "";
  const b = parseInt(bytes, 10);
  if (isNaN(b)) return "";
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(0)} KB`;
  return `${(b / (1024 * 1024)).toFixed(1)} MB`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function DriveFilePicker({
  open,
  onOpenChange,
  contactId,
  configId,
  assistidoDriveFolderId,
  assistidoName,
  onSuccess,
}: DriveFilePickerProps) {
  // Navigation state: stack of { id, name } for breadcrumb
  const [folderStack, setFolderStack] = useState<
    { id: string; name: string }[]
  >([]);
  const [sending, setSending] = useState(false);

  // Current folder ID
  const currentFolderId = folderStack.length > 0
    ? folderStack[folderStack.length - 1].id
    : assistidoDriveFolderId || null;

  // Query files in current folder
  const { data, isLoading } = trpc.drive.filesFromDrive.useQuery(
    { folderId: currentFolderId!, pageSize: 50 },
    { enabled: open && !!currentFolderId }
  );

  // Separate folders and files, sort folders first
  const { folders, files } = useMemo(() => {
    if (!data?.files) return { folders: [], files: [] };
    const f: DriveItem[] = [];
    const d: DriveItem[] = [];
    for (const item of data.files as DriveItem[]) {
      if (item.mimeType === FOLDER_MIME) {
        f.push(item);
      } else {
        d.push(item);
      }
    }
    return { folders: f, files: d };
  }, [data?.files]);

  const navigateInto = (folder: DriveItem) => {
    setFolderStack((prev) => [...prev, { id: folder.id, name: folder.name }]);
  };

  const navigateBack = () => {
    setFolderStack((prev) => prev.slice(0, -1));
  };

  const handleSendFile = async (file: DriveItem) => {
    // 16MB check
    if (file.size && parseInt(file.size, 10) > 16 * 1024 * 1024) {
      toast.error("Arquivo muito grande", {
        description: "O limite é 16MB para envio via WhatsApp.",
      });
      return;
    }

    setSending(true);
    const toastId = toast.loading(`Enviando ${file.name}...`);

    try {
      const mediaType = getMediaType(file.mimeType);

      // Use the send-media API but with driveFileId instead of file upload
      const response = await fetch("/api/whatsapp/send-media", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contactId,
          configId,
          driveFileId: file.id,
          fileName: file.name,
          mimeType: file.mimeType,
          type: mediaType,
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: "Erro desconhecido" }));
        throw new Error(error.error || `HTTP ${response.status}`);
      }

      toast.success(`${file.name} enviado!`, { id: toastId });
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      toast.error(
        `Erro ao enviar: ${error instanceof Error ? error.message : "Erro desconhecido"}`,
        { id: toastId }
      );
    } finally {
      setSending(false);
    }
  };

  const handleClose = () => {
    setFolderStack([]);
    onOpenChange(false);
  };

  // Breadcrumb labels
  const breadcrumbs = [
    { name: assistidoName || "Drive", id: assistidoDriveFolderId || "" },
    ...folderStack,
  ];

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-lg max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Folder className="h-5 w-5 text-amber-500" />
            Enviar do Drive
          </DialogTitle>
          <DialogDescription>
            Selecione um arquivo para enviar no WhatsApp.
          </DialogDescription>
        </DialogHeader>

        {/* Breadcrumb navigation */}
        {folderStack.length > 0 && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground overflow-x-auto">
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-1.5 text-xs"
              onClick={() => setFolderStack([])}
            >
              <ArrowLeft className="h-3.5 w-3.5 mr-1" />
              {breadcrumbs[0].name}
            </Button>
            {folderStack.map((f, i) => (
              <span key={f.id} className="flex items-center gap-1">
                <ChevronRight className="h-3 w-3 text-muted-foreground" />
                <button
                  className={cn(
                    "hover:underline",
                    i === folderStack.length - 1
                      ? "font-medium text-neutral-700 dark:text-foreground/80"
                      : "text-neutral-500"
                  )}
                  onClick={() => setFolderStack((prev) => prev.slice(0, i + 1))}
                >
                  {f.name}
                </button>
              </span>
            ))}
          </div>
        )}

        {/* Content */}
        <ScrollArea className="flex-1 min-h-0 max-h-[50vh]">
          {!currentFolderId ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Folder className="h-10 w-10 text-neutral-300 mb-3" />
              <p className="text-sm text-muted-foreground">
                Contato não vinculado a um assistido com pasta no Drive.
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Vincule o contato a um assistido para acessar arquivos.
              </p>
            </div>
          ) : isLoading ? (
            <div className="space-y-2 p-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full rounded-lg" />
              ))}
            </div>
          ) : folders.length === 0 && files.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FileQuestion className="h-10 w-10 text-neutral-300 mb-3" />
              <p className="text-sm text-neutral-500">Pasta vazia</p>
            </div>
          ) : (
            <div className="space-y-1 p-1">
              {/* Back button when inside subfolders */}
              {folderStack.length > 0 && (
                <button
                  className="flex items-center gap-3 w-full p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-muted transition-colors text-left"
                  onClick={navigateBack}
                >
                  <ArrowLeft className="h-5 w-5 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">..</span>
                </button>
              )}

              {/* Folders */}
              {folders.map((folder) => (
                <button
                  key={folder.id}
                  className="flex items-center gap-3 w-full p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-muted transition-colors text-left"
                  onClick={() => navigateInto(folder)}
                  disabled={sending}
                >
                  {getFileIcon(folder.mimeType, folder.name)}
                  <span className="flex-1 text-sm font-medium truncate text-neutral-900 dark:text-foreground">
                    {folder.name}
                  </span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </button>
              ))}

              {/* Files */}
              {files.map((file) => (
                <div
                  key={file.id}
                  className="flex items-center gap-3 w-full p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-muted transition-colors group"
                >
                  {getFileIcon(file.mimeType, file.name)}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate text-neutral-900 dark:text-foreground">
                      {file.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(file.size)}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 opacity-0 group-hover:opacity-100 transition-opacity text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950"
                    onClick={() => handleSendFile(file)}
                    disabled={sending}
                  >
                    {sending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <Send className="h-3.5 w-3.5 mr-1" />
                        Enviar
                      </>
                    )}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Size warning */}
        <p className="text-xs text-muted-foreground px-1">
          Limite: 16MB por arquivo via WhatsApp
        </p>
      </DialogContent>
    </Dialog>
  );
}
