"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  AlertCircle,
} from "lucide-react";

interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  modifiedTime?: string;
  webViewLink?: string;
  iconLink?: string;
}

interface GoogleDriveViewerProps {
  folderId?: string;
  folderLink?: string;
  processoNumero?: string;
  assistidoNome?: string;
  onCreateFolder?: () => void;
  className?: string;
}

function getFileIcon(mimeType: string) {
  if (mimeType.includes("folder")) return FolderOpen;
  if (mimeType.includes("pdf")) return FileText;
  if (mimeType.includes("image")) return Image;
  if (mimeType.includes("document") || mimeType.includes("text")) return FileText;
  return File;
}

function formatFileSize(bytes?: string) {
  if (!bytes) return "";
  const size = parseInt(bytes);
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(dateString?: string) {
  if (!dateString) return "";
  return new Date(dateString).toLocaleDateString("pt-BR", {
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
  className = "",
}: GoogleDriveViewerProps) {
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  // Simulated files for demo (replace with actual API call)
  const mockFiles: DriveFile[] = [
    {
      id: "1",
      name: "Denúncia.pdf",
      mimeType: "application/pdf",
      size: "245760",
      modifiedTime: "2024-01-10T14:30:00Z",
      webViewLink: "#",
    },
    {
      id: "2",
      name: "Resposta à Acusação.pdf",
      mimeType: "application/pdf",
      size: "512000",
      modifiedTime: "2024-01-12T10:15:00Z",
      webViewLink: "#",
    },
    {
      id: "3",
      name: "Procuração.pdf",
      mimeType: "application/pdf",
      size: "128000",
      modifiedTime: "2024-01-08T09:00:00Z",
      webViewLink: "#",
    },
    {
      id: "4",
      name: "Documentos Pessoais",
      mimeType: "application/vnd.google-apps.folder",
      modifiedTime: "2024-01-05T16:45:00Z",
      webViewLink: "#",
    },
  ];

  useEffect(() => {
    if (folderId) {
      loadFiles();
    }
  }, [folderId]);

  async function loadFiles() {
    setLoading(true);
    setError(null);
    try {
      // TODO: Replace with actual Google Drive API call
      // const response = await fetch(`/api/integrations/google-drive/files?folderId=${folderId}`);
      // const data = await response.json();
      // setFiles(data.files);
      
      // Simulated delay for demo
      await new Promise((resolve) => setTimeout(resolve, 500));
      setFiles(mockFiles);
      setIsConnected(true);
    } catch (err) {
      setError("Erro ao carregar arquivos do Google Drive");
      setIsConnected(false);
    } finally {
      setLoading(false);
    }
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
            Este processo ainda não possui uma pasta no Google Drive vinculada.
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
                {processoNumero && `Processo ${processoNumero}`}
                {assistidoNome && !processoNumero && assistidoNome}
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
              onClick={loadFiles}
              disabled={loading}
              className="h-8 w-8"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
            {folderLink && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => window.open(folderLink, "_blank")}
                className="h-8 w-8"
              >
                <ExternalLink className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive mb-4">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 rounded-lg bg-muted animate-pulse" />
            ))}
          </div>
        ) : files.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p className="text-sm">Nenhum arquivo encontrado</p>
          </div>
        ) : (
          <ScrollArea className="h-[280px]">
            <div className="space-y-1">
              {files.map((file) => {
                const Icon = getFileIcon(file.mimeType);
                const isFolder = file.mimeType.includes("folder");

                return (
                  <div
                    key={file.id}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent/50 cursor-pointer transition-colors group"
                    onClick={() => file.webViewLink && window.open(file.webViewLink, "_blank")}
                  >
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                      isFolder ? "bg-amber-100 dark:bg-amber-900/30" : "bg-muted"
                    }`}>
                      <Icon className={`h-4 w-4 ${
                        isFolder ? "text-amber-600" : "text-muted-foreground"
                      }`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{file.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(file.modifiedTime)}
                        {file.size && ` • ${formatFileSize(file.size)}`}
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
