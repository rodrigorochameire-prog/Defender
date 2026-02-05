"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import {
  FileText,
  File,
  Image,
  FileSpreadsheet,
  Presentation,
  Video,
  Music,
  Archive,
  MoreVertical,
  ExternalLink,
  Download,
  Unlink,
  Trash2,
  RefreshCw,
  FolderOpen,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { FileUploadWithLink } from "./FileUploadWithLink";

interface FilesByProcessoProps {
  processoId: number;
  driveFolderId?: string;
  showUpload?: boolean;
  className?: string;
}

const getFileIcon = (mimeType: string | null) => {
  if (!mimeType) return File;

  if (mimeType.includes("pdf")) return FileText;
  if (mimeType.includes("image")) return Image;
  if (mimeType.includes("spreadsheet") || mimeType.includes("excel"))
    return FileSpreadsheet;
  if (mimeType.includes("presentation") || mimeType.includes("powerpoint"))
    return Presentation;
  if (mimeType.includes("video")) return Video;
  if (mimeType.includes("audio")) return Music;
  if (mimeType.includes("zip") || mimeType.includes("archive")) return Archive;
  if (
    mimeType.includes("document") ||
    mimeType.includes("word") ||
    mimeType.includes("text")
  )
    return FileText;

  return File;
};

const getMimeTypeColor = (mimeType: string | null) => {
  if (!mimeType) return "zinc";

  if (mimeType.includes("pdf")) return "red";
  if (mimeType.includes("image")) return "green";
  if (mimeType.includes("spreadsheet") || mimeType.includes("excel"))
    return "emerald";
  if (mimeType.includes("presentation") || mimeType.includes("powerpoint"))
    return "orange";
  if (mimeType.includes("video")) return "purple";
  if (mimeType.includes("audio")) return "pink";
  if (
    mimeType.includes("document") ||
    mimeType.includes("word") ||
    mimeType.includes("text")
  )
    return "blue";

  return "zinc";
};

const formatFileSize = (bytes: number | null) => {
  if (!bytes) return "-";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export function FilesByProcesso({
  processoId,
  driveFolderId,
  showUpload = true,
  className,
}: FilesByProcessoProps) {
  const [fileToUnlink, setFileToUnlink] = useState<number | null>(null);

  const utils = trpc.useUtils();

  const {
    data: files,
    isLoading,
    refetch,
  } = trpc.drive.filesByProcesso.useQuery({ processoId });

  const unlinkMutation = trpc.drive.unlinkFile.useMutation({
    onSuccess: () => {
      toast.success("Vinculação removida");
      utils.drive.filesByProcesso.invalidate({ processoId });
      setFileToUnlink(null);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleUnlink = (fileId: number) => {
    setFileToUnlink(fileId);
  };

  const confirmUnlink = () => {
    if (fileToUnlink) {
      unlinkMutation.mutate({ fileId: fileToUnlink });
    }
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-32" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className={className}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <FolderOpen className="h-5 w-5" />
                Arquivos do Processo
              </CardTitle>
              <CardDescription>
                {files?.length || 0} arquivo(s) vinculado(s)
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={() => refetch()}>
                <RefreshCw className="h-4 w-4" />
              </Button>
              {showUpload && driveFolderId && (
                <FileUploadWithLink
                  folderId={driveFolderId}
                  defaultProcessoId={processoId}
                  onUploadComplete={() => refetch()}
                />
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {files && files.length > 0 ? (
            <div className="space-y-2">
              {files.map((file) => {
                const FileIcon = getFileIcon(file.mimeType);
                const color = getMimeTypeColor(file.mimeType);

                return (
                  <div
                    key={file.id}
                    className="flex items-center gap-3 p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors"
                  >
                    <div
                      className={cn(
                        "w-10 h-10 rounded-lg flex items-center justify-center",
                        color === "red" && "bg-red-100 dark:bg-red-900/30",
                        color === "green" && "bg-green-100 dark:bg-green-900/30",
                        color === "emerald" && "bg-emerald-100 dark:bg-emerald-900/30",
                        color === "orange" && "bg-orange-100 dark:bg-orange-900/30",
                        color === "purple" && "bg-purple-100 dark:bg-purple-900/30",
                        color === "pink" && "bg-pink-100 dark:bg-pink-900/30",
                        color === "blue" && "bg-blue-100 dark:bg-blue-900/30",
                        color === "zinc" && "bg-zinc-100 dark:bg-zinc-800"
                      )}
                    >
                      <FileIcon
                        className={cn(
                          "w-5 h-5",
                          color === "red" && "text-red-600",
                          color === "green" && "text-green-600",
                          color === "emerald" && "text-emerald-600",
                          color === "orange" && "text-orange-600",
                          color === "purple" && "text-purple-600",
                          color === "pink" && "text-pink-600",
                          color === "blue" && "text-blue-600",
                          color === "zinc" && "text-zinc-500"
                        )}
                      />
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-zinc-900 dark:text-zinc-100 truncate">
                        {file.name}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-zinc-500">
                          {formatFileSize(file.fileSize)}
                        </span>
                        {file.lastModifiedTime && (
                          <>
                            <span className="text-zinc-300 dark:text-zinc-700">
                              •
                            </span>
                            <span className="text-xs text-zinc-500">
                              {formatDistanceToNow(
                                new Date(file.lastModifiedTime),
                                { addSuffix: true, locale: ptBR }
                              )}
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {file.webViewLink && (
                          <DropdownMenuItem asChild>
                            <a
                              href={file.webViewLink}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <ExternalLink className="mr-2 h-4 w-4" />
                              Abrir no Drive
                            </a>
                          </DropdownMenuItem>
                        )}
                        {file.webContentLink && (
                          <DropdownMenuItem asChild>
                            <a
                              href={file.webContentLink}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <Download className="mr-2 h-4 w-4" />
                              Baixar
                            </a>
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => handleUnlink(file.id)}
                          className="text-amber-600"
                        >
                          <Unlink className="mr-2 h-4 w-4" />
                          Remover vinculação
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8">
              <FolderOpen className="h-12 w-12 mx-auto text-zinc-300 dark:text-zinc-600 mb-3" />
              <p className="text-zinc-500 dark:text-zinc-400">
                Nenhum arquivo vinculado
              </p>
              {showUpload && driveFolderId && (
                <div className="mt-4">
                  <FileUploadWithLink
                    folderId={driveFolderId}
                    defaultProcessoId={processoId}
                    onUploadComplete={() => refetch()}
                  />
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog de confirmação de desvínculo */}
      <AlertDialog
        open={fileToUnlink !== null}
        onOpenChange={() => setFileToUnlink(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover vinculação?</AlertDialogTitle>
            <AlertDialogDescription>
              O arquivo não será excluído do Drive, apenas a vinculação com este
              processo será removida.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmUnlink}
              className="bg-amber-600 hover:bg-amber-700"
            >
              {unlinkMutation.isPending ? "Removendo..." : "Remover vinculação"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
