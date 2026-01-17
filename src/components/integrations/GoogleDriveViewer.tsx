"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import {
  FolderOpen,
  FileText,
  Image,
  File,
  Download,
  ExternalLink,
  RefreshCw,
  Plus,
  ChevronRight,
  ChevronLeft,
  AlertCircle,
  Upload,
  Search,
  Trash2,
  MoreVertical,
  FileSpreadsheet,
  FileImage,
  FileVideo,
  FileAudio,
  Presentation,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { trpc } from "@/lib/trpc/client";

interface DriveFile {
  id: number;
  driveFileId: string;
  name: string;
  mimeType: string | null;
  fileSize: number | null;
  webViewLink: string | null;
  webContentLink: string | null;
  thumbnailLink: string | null;
  iconLink: string | null;
  isFolder: boolean | null;
  lastModifiedTime: Date | null;
  syncStatus: string | null;
}

interface GoogleDriveViewerProps {
  folderId?: string;
  folderLink?: string;
  processoNumero?: string;
  assistidoNome?: string;
  onCreateFolder?: () => void;
  onFileSelect?: (file: DriveFile) => void;
  showUpload?: boolean;
  showSearch?: boolean;
  className?: string;
  height?: string;
}

function getFileIcon(mimeType: string | null) {
  if (!mimeType) return File;
  if (mimeType.includes("folder")) return FolderOpen;
  if (mimeType.includes("pdf")) return FileText;
  if (mimeType.includes("image")) return FileImage;
  if (mimeType.includes("video")) return FileVideo;
  if (mimeType.includes("audio")) return FileAudio;
  if (mimeType.includes("spreadsheet") || mimeType.includes("excel")) return FileSpreadsheet;
  if (mimeType.includes("presentation") || mimeType.includes("powerpoint")) return Presentation;
  if (mimeType.includes("document") || mimeType.includes("text") || mimeType.includes("word")) return FileText;
  return File;
}

function getFileIconColor(mimeType: string | null) {
  if (!mimeType) return "text-muted-foreground";
  if (mimeType.includes("folder")) return "text-amber-600";
  if (mimeType.includes("pdf")) return "text-red-600";
  if (mimeType.includes("image")) return "text-pink-600";
  if (mimeType.includes("video")) return "text-purple-600";
  if (mimeType.includes("audio")) return "text-indigo-600";
  if (mimeType.includes("spreadsheet") || mimeType.includes("excel")) return "text-green-600";
  if (mimeType.includes("presentation")) return "text-orange-600";
  if (mimeType.includes("document") || mimeType.includes("word")) return "text-blue-600";
  return "text-muted-foreground";
}

function formatFileSize(bytes: number | null) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

function formatDate(date: Date | null | string) {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function GoogleDriveViewer({
  folderId,
  folderLink,
  processoNumero,
  assistidoNome,
  onCreateFolder,
  onFileSelect,
  showUpload = true,
  showSearch = true,
  className = "",
  height = "400px",
}: GoogleDriveViewerProps) {
  const [search, setSearch] = useState("");
  const [navigationStack, setNavigationStack] = useState<{ id: string; name: string }[]>([]);
  const currentFolderId = navigationStack.length > 0 
    ? navigationStack[navigationStack.length - 1].id 
    : folderId;

  // Queries
  const { data: configData } = trpc.drive.isConfigured.useQuery();
  const { 
    data: filesData, 
    isLoading, 
    error,
    refetch 
  } = trpc.drive.files.useQuery(
    { 
      folderId: currentFolderId || "",
      search: search || undefined,
    },
    { 
      enabled: !!currentFolderId,
      refetchInterval: 60000, // Atualiza a cada minuto
    }
  );

  // Mutations
  const syncMutation = trpc.drive.syncFolder.useMutation({
    onSuccess: () => {
      refetch();
    },
  });

  const deleteMutation = trpc.drive.deleteFile.useMutation({
    onSuccess: () => {
      refetch();
    },
  });

  const uploadMutation = trpc.drive.uploadFile.useMutation({
    onSuccess: () => {
      refetch();
    },
  });

  const handleSync = () => {
    if (currentFolderId) {
      syncMutation.mutate({ folderId: currentFolderId });
    }
  };

  const handleNavigateToFolder = (file: DriveFile) => {
    if (file.isFolder) {
      setNavigationStack([...navigationStack, { id: file.driveFileId, name: file.name }]);
    }
  };

  const handleNavigateBack = () => {
    if (navigationStack.length > 0) {
      setNavigationStack(navigationStack.slice(0, -1));
    }
  };

  const handleFileClick = (file: DriveFile) => {
    if (file.isFolder) {
      handleNavigateToFolder(file);
    } else if (onFileSelect) {
      onFileSelect(file);
    } else if (file.webViewLink) {
      window.open(file.webViewLink, "_blank");
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentFolderId) return;

    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;
      await uploadMutation.mutateAsync({
        folderId: currentFolderId,
        fileName: file.name,
        mimeType: file.type,
        fileBase64: base64,
      });
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleDelete = async (file: DriveFile) => {
    if (confirm(`Tem certeza que deseja excluir "${file.name}"?`)) {
      await deleteMutation.mutateAsync({ fileId: file.driveFileId });
    }
  };

  // Se não tiver folderId e não tiver folderLink
  if (!folderId && !folderLink && !configData?.configured) {
    return (
      <Card className={`border-dashed ${className}`}>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
            <FolderOpen className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold mb-2">Google Drive não configurado</h3>
          <p className="text-sm text-muted-foreground mb-4 max-w-sm">
            Configure as credenciais do Google Drive nas variáveis de ambiente para habilitar a sincronização.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!folderId && !folderLink) {
    return (
      <Card className={`border-dashed ${className}`}>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
            <FolderOpen className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold mb-2">Pasta não vinculada</h3>
          <p className="text-sm text-muted-foreground mb-4 max-w-sm">
            Este item ainda não possui uma pasta no Google Drive vinculada.
          </p>
          {onCreateFolder && (
            <Button onClick={onCreateFolder} className="gap-2">
              <Plus className="h-4 w-4" />
              Criar Pasta no Drive
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  const files = filesData?.files || [];
  const isConnected = configData?.configured && !error;

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <FolderOpen className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <CardTitle className="text-base">Google Drive</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                {navigationStack.length > 0 
                  ? navigationStack[navigationStack.length - 1].name
                  : processoNumero 
                    ? `Processo ${processoNumero}` 
                    : assistidoNome || "Pasta sincronizada"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={isConnected ? "default" : "secondary"} className="text-xs">
              {isConnected ? "Conectado" : "Desconectado"}
            </Badge>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleSync}
              disabled={isLoading || syncMutation.isPending}
              className="h-8 w-8"
              title="Sincronizar"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading || syncMutation.isPending ? "animate-spin" : ""}`} />
            </Button>
            {folderLink && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => window.open(folderLink, "_blank")}
                className="h-8 w-8"
                title="Abrir no Drive"
              >
                <ExternalLink className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Navegação e busca */}
        <div className="flex items-center gap-2 mt-3">
          {navigationStack.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleNavigateBack}
              className="gap-1"
            >
              <ChevronLeft className="h-4 w-4" />
              Voltar
            </Button>
          )}
          
          {showSearch && (
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar arquivos..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9"
              />
            </div>
          )}

          {showUpload && (
            <label>
              <Button variant="outline" size="sm" className="gap-1" asChild>
                <span>
                  <Upload className="h-4 w-4" />
                  Upload
                </span>
              </Button>
              <input
                type="file"
                className="hidden"
                onChange={handleUpload}
                disabled={uploadMutation.isPending}
              />
            </label>
          )}
        </div>
      </CardHeader>

      <CardContent>
        {error && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive mb-4">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm">Erro ao carregar arquivos do Google Drive</span>
          </div>
        )}

        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-14 rounded-lg bg-muted animate-pulse" />
            ))}
          </div>
        ) : files.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <FolderOpen className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm font-medium">Nenhum arquivo encontrado</p>
            <p className="text-xs mt-1">
              {search ? "Tente buscar por outro termo" : "Faça upload de um arquivo para começar"}
            </p>
          </div>
        ) : (
          <ScrollArea style={{ height }}>
            <div className="space-y-1 pr-4">
              {files.map((file) => {
                const Icon = getFileIcon(file.mimeType);
                const iconColor = getFileIconColor(file.mimeType);
                const isFolder = file.isFolder;

                return (
                  <div
                    key={file.id}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent/50 cursor-pointer transition-colors group"
                    onClick={() => handleFileClick(file)}
                  >
                    {/* Ícone */}
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      isFolder ? "bg-amber-100 dark:bg-amber-900/30" : "bg-muted"
                    }`}>
                      <Icon className={`h-5 w-5 ${iconColor}`} />
                    </div>

                    {/* Informações */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{file.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(file.lastModifiedTime)}
                        {file.fileSize && !isFolder && ` • ${formatFileSize(file.fileSize)}`}
                      </p>
                    </div>

                    {/* Status de sincronização */}
                    {file.syncStatus && file.syncStatus !== "synced" && (
                      <Badge variant="outline" className="text-xs">
                        {file.syncStatus === "pending_upload" && "Enviando..."}
                        {file.syncStatus === "pending_download" && "Baixando..."}
                        {file.syncStatus === "conflict" && "Conflito"}
                        {file.syncStatus === "error" && "Erro"}
                      </Badge>
                    )}

                    {/* Ações */}
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {!isFolder && file.webContentLink && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={(e) => {
                            e.stopPropagation();
                            window.open(file.webContentLink!, "_blank");
                          }}
                          title="Baixar"
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      )}

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {file.webViewLink && (
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                window.open(file.webViewLink!, "_blank");
                              }}
                            >
                              <ExternalLink className="h-4 w-4 mr-2" />
                              Abrir no Drive
                            </DropdownMenuItem>
                          )}
                          {!isFolder && file.webContentLink && (
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                window.open(file.webContentLink!, "_blank");
                              }}
                            >
                              <Download className="h-4 w-4 mr-2" />
                              Baixar arquivo
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(file);
                            }}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>

                      {isFolder && (
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}

        {/* Rodapé com total */}
        {filesData && filesData.total > 0 && (
          <div className="mt-3 pt-3 border-t text-xs text-muted-foreground">
            {filesData.total} {filesData.total === 1 ? "item" : "itens"}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default GoogleDriveViewer;
