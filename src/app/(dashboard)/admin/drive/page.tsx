"use client";

import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  FolderOpen,
  File,
  FileText,
  ImageIcon,
  Film,
  Music,
  Archive,
  Search,
  LayoutGrid,
  List,
  ExternalLink,
  Download,
  Eye,
  Clock,
  RefreshCw,
  Plus,
  MoreHorizontal,
  ChevronRight,
  Home,
  Star,
  Trash2,
  FolderPlus,
  Upload,
  HardDrive,
  Settings,
  AlertCircle,
  Loader2,
  Link2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { trpc } from "@/lib/trpc/client";
import { toast } from "sonner";
import Link from "next/link";

// ==========================================
// HELPERS
// ==========================================

const FILE_ICONS: Record<string, React.ElementType> = {
  folder: FolderOpen,
  document: FileText,
  pdf: FileText,
  image: ImageIcon,
  video: Film,
  audio: Music,
  archive: Archive,
  default: File,
};

const FILE_COLORS: Record<string, string> = {
  folder: "text-emerald-500",
  document: "text-blue-500",
  pdf: "text-blue-600",
  image: "text-zinc-500",
  video: "text-zinc-500",
  audio: "text-zinc-500",
  archive: "text-zinc-500",
  default: "text-zinc-500",
};

function getFileType(mimeType: string): string {
  if (mimeType.includes("folder")) return "folder";
  if (mimeType.includes("pdf")) return "pdf";
  if (mimeType.includes("document") || mimeType.includes("word") || mimeType.includes("text")) return "document";
  if (mimeType.includes("image")) return "image";
  if (mimeType.includes("video")) return "video";
  if (mimeType.includes("audio")) return "audio";
  if (mimeType.includes("zip") || mimeType.includes("rar") || mimeType.includes("tar")) return "archive";
  return "default";
}

function formatFileSize(bytes?: number | null): string {
  if (!bytes) return "-";
  const units = ["B", "KB", "MB", "GB"];
  let size = bytes;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  return `${size.toFixed(1)} ${units[unitIndex]}`;
}

// ==========================================
// COMPONENTES
// ==========================================

function EmptyDriveState({ onConfigure }: { onConfigure: () => void }) {
  return (
    <div className="min-h-[60vh] flex items-center justify-center p-6">
      <Card className="max-w-md w-full p-8 text-center border-dashed">
        <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
          <HardDrive className="w-8 h-8 text-zinc-400" />
        </div>
        <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50 mb-2">
          Google Drive não configurado
        </h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6">
          Configure a integração com o Google Drive para armazenar e organizar os documentos da defensoria.
        </p>
        <div className="space-y-3">
          <Button onClick={onConfigure} className="w-full">
            <Settings className="w-4 h-4 mr-2" />
            Configurar Integração
          </Button>
          <p className="text-xs text-zinc-400">
            Você precisará de uma conta Google e credenciais de API
          </p>
        </div>
      </Card>
    </div>
  );
}

function FileCard({ 
  file, 
  viewMode, 
  onPreview, 
  onDelete 
}: { 
  file: any; 
  viewMode: "grid" | "list";
  onPreview: () => void;
  onDelete: () => void;
}) {
  const fileType = getFileType(file.mimeType);
  const Icon = FILE_ICONS[fileType] || FILE_ICONS.default;
  const colorClass = FILE_COLORS[fileType] || FILE_COLORS.default;

  if (viewMode === "list") {
    return (
      <div 
        className={cn(
          "flex items-center gap-4 px-4 py-3 transition-all cursor-pointer group",
          "hover:bg-zinc-50 dark:hover:bg-zinc-800/50 border-b border-zinc-100 dark:border-zinc-800 last:border-b-0"
        )}
        onClick={onPreview}
      >
        <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", 
          file.isFolder ? "bg-emerald-50 dark:bg-emerald-900/20" : "bg-zinc-50 dark:bg-zinc-800"
        )}>
          <Icon className={cn("w-5 h-5", colorClass)} />
        </div>
        
        <div className="flex-1 min-w-0">
          <p className="font-medium text-zinc-900 dark:text-zinc-100 truncate">{file.name}</p>
          <p className="text-xs text-zinc-500 truncate">
            {file.isFolder ? "Pasta" : formatFileSize(file.fileSize)}
            {file.lastModifiedTime && ` • ${formatDistanceToNow(new Date(file.lastModifiedTime), { addSuffix: true, locale: ptBR })}`}
          </p>
        </div>

        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          {file.webViewLink && (
            <a href={file.webViewLink} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <ExternalLink className="w-4 h-4" />
              </Button>
            </a>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onPreview}>
                <Eye className="w-4 h-4 mr-2" />
                Visualizar
              </DropdownMenuItem>
              {file.webContentLink && (
                <DropdownMenuItem asChild>
                  <a href={file.webContentLink} download>
                    <Download className="w-4 h-4 mr-2" />
                    Download
                  </a>
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onDelete} className="text-rose-600">
                <Trash2 className="w-4 h-4 mr-2" />
                Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    );
  }

  // Grid view
  return (
    <div 
      className={cn(
        "group cursor-pointer rounded-xl overflow-hidden transition-all",
        "bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800",
        "hover:shadow-lg hover:border-zinc-300 dark:hover:border-zinc-700"
      )}
      onClick={onPreview}
    >
      <div className="aspect-square bg-zinc-50 dark:bg-zinc-800/50 flex items-center justify-center relative">
        {file.thumbnailLink ? (
          <img src={file.thumbnailLink} alt={file.name} className="w-full h-full object-cover" />
        ) : (
          <Icon className={cn("w-12 h-12", colorClass)} />
        )}
      </div>
      <div className="p-3">
        <p className="font-medium text-sm text-zinc-900 dark:text-zinc-100 truncate">{file.name}</p>
        <p className="text-xs text-zinc-500 mt-1">
          {file.isFolder ? "Pasta" : formatFileSize(file.fileSize)}
        </p>
      </div>
    </div>
  );
}

// ==========================================
// PÁGINA PRINCIPAL
// ==========================================

export default function DrivePage() {
  const [viewMode, setViewMode] = useState<"grid" | "list">("list");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);

  // Verificar se o Drive está configurado
  const { data: configStatus, isLoading: isCheckingConfig } = trpc.drive.isConfigured.useQuery();
  
  // Estatísticas
  const { data: stats, isLoading: isLoadingStats } = trpc.drive.stats.useQuery(undefined, {
    enabled: configStatus?.configured === true,
  });

  // Pastas sincronizadas
  const { data: syncFolders, isLoading: isLoadingFolders, refetch: refetchFolders } = trpc.drive.syncFolders.useQuery(undefined, {
    enabled: configStatus?.configured === true,
  });

  // Arquivos da pasta selecionada
  const { data: filesData, isLoading: isLoadingFiles, refetch: refetchFiles } = trpc.drive.files.useQuery(
    { 
      folderId: selectedFolderId || (syncFolders?.[0]?.driveFolderId || ""),
      parentFileId: null,
      limit: 100,
    },
    {
      enabled: configStatus?.configured === true && (!!selectedFolderId || (syncFolders && syncFolders.length > 0)),
    }
  );

  // Sincronizar pasta
  const syncMutation = trpc.drive.syncFolder.useMutation({
    onSuccess: (result) => {
      toast.success(`Sincronizado: ${result.added} novos, ${result.updated} atualizados`);
      refetchFiles();
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao sincronizar");
    },
  });

  // Excluir arquivo
  const deleteMutation = trpc.drive.deleteFile.useMutation({
    onSuccess: () => {
      toast.success("Arquivo excluído");
      refetchFiles();
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao excluir");
    },
  });

  // Loading
  if (isCheckingConfig) {
    return (
      <div className="min-h-screen bg-zinc-100 dark:bg-[#0f0f11] p-6">
        <div className="max-w-[1600px] mx-auto space-y-6">
          <Skeleton className="h-16 w-full rounded-xl" />
          <Skeleton className="h-[400px] w-full rounded-xl" />
        </div>
      </div>
    );
  }

  // Drive não configurado
  if (!configStatus?.configured) {
    return (
      <div className="min-h-screen bg-zinc-100 dark:bg-[#0f0f11]">
        {/* Header */}
        <div className="px-4 md:px-6 py-4 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-zinc-900 dark:bg-white flex items-center justify-center shadow-lg">
              <FolderOpen className="w-5 h-5 text-white dark:text-zinc-900" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-50 tracking-tight">Drive</h1>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Gestão de documentos
              </p>
            </div>
          </div>
        </div>

        <EmptyDriveState onConfigure={() => toast.info("Configure as variáveis de ambiente do Google Drive")} />
      </div>
    );
  }

  const files = filesData?.files || [];
  const currentFolderId = selectedFolderId || syncFolders?.[0]?.driveFolderId;

  return (
    <div className="min-h-screen bg-zinc-100 dark:bg-[#0f0f11]">
      {/* Header Padrão Defender */}
      <div className="px-4 md:px-6 py-4 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-zinc-900 dark:bg-white flex items-center justify-center shadow-lg">
              <FolderOpen className="w-5 h-5 text-white dark:text-zinc-900" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-50 tracking-tight">Drive</h1>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                {stats?.totalFiles || 0} arquivos • {stats?.totalFolders || 0} pastas
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm"
              className="h-9 px-4 border-zinc-200 dark:border-zinc-700 rounded-xl"
              onClick={() => currentFolderId && syncMutation.mutate({ folderId: currentFolderId })}
              disabled={syncMutation.isPending || !currentFolderId}
            >
              {syncMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4 mr-2" />
              )}
              Sincronizar
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 md:p-6">
        <div className="flex gap-6">
          {/* Sidebar */}
          <div className="hidden lg:block w-72 flex-shrink-0">
            <Card className="overflow-hidden sticky top-4">
              <div className="px-4 py-3 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50">
                <h3 className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">
                  Pastas Sincronizadas
                </h3>
              </div>
              <div className="p-2">
                {isLoadingFolders ? (
                  <div className="space-y-2">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-10 w-full rounded-lg" />
                    ))}
                  </div>
                ) : syncFolders && syncFolders.length > 0 ? (
                  <div className="space-y-1">
                    {syncFolders.map((folder) => (
                      <button
                        key={folder.id}
                        onClick={() => setSelectedFolderId(folder.driveFolderId)}
                        className={cn(
                          "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all",
                          selectedFolderId === folder.driveFolderId || (!selectedFolderId && folder.id === syncFolders[0]?.id)
                            ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-300 font-medium"
                            : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                        )}
                      >
                        <FolderOpen className="w-4 h-4" />
                        <span className="flex-1 text-left truncate">{folder.name}</span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 text-center text-sm text-zinc-500">
                    <FolderOpen className="w-8 h-8 mx-auto mb-2 text-zinc-300" />
                    <p>Nenhuma pasta sincronizada</p>
                    <Link href="/admin/settings/dados">
                      <Button variant="link" size="sm" className="mt-2">
                        Configurar
                      </Button>
                    </Link>
                  </div>
                )}
              </div>
            </Card>
          </div>

          {/* Main content */}
          <div className="flex-1">
            {/* Toolbar */}
            <Card className="mb-4 p-3">
              <div className="flex items-center gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                  <Input
                    placeholder="Buscar arquivos..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 h-9 bg-zinc-50 dark:bg-zinc-800 border-0"
                  />
                </div>
                <div className="flex items-center border rounded-lg overflow-hidden">
                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn("h-8 w-8 p-0 rounded-none", viewMode === "list" && "bg-zinc-100 dark:bg-zinc-800")}
                    onClick={() => setViewMode("list")}
                  >
                    <List className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn("h-8 w-8 p-0 rounded-none", viewMode === "grid" && "bg-zinc-100 dark:bg-zinc-800")}
                    onClick={() => setViewMode("grid")}
                  >
                    <LayoutGrid className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </Card>

            {/* Files */}
            <Card>
              {isLoadingFiles ? (
                <div className="p-6 space-y-3">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Skeleton key={i} className="h-14 w-full rounded-lg" />
                  ))}
                </div>
              ) : files.length === 0 ? (
                <div className="p-12 text-center">
                  <FolderOpen className="w-12 h-12 mx-auto text-zinc-300 dark:text-zinc-600 mb-4" />
                  <h3 className="text-lg font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                    Pasta vazia
                  </h3>
                  <p className="text-sm text-zinc-500">
                    {currentFolderId ? "Esta pasta não contém arquivos" : "Selecione uma pasta sincronizada"}
                  </p>
                </div>
              ) : viewMode === "list" ? (
                <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {files
                    .filter(f => !searchTerm || f.name.toLowerCase().includes(searchTerm.toLowerCase()))
                    .map((file) => (
                      <FileCard
                        key={file.id}
                        file={file}
                        viewMode="list"
                        onPreview={() => file.webViewLink && window.open(file.webViewLink, "_blank")}
                        onDelete={() => deleteMutation.mutate({ fileId: file.driveFileId })}
                      />
                    ))}
                </div>
              ) : (
                <div className="p-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                  {files
                    .filter(f => !searchTerm || f.name.toLowerCase().includes(searchTerm.toLowerCase()))
                    .map((file) => (
                      <FileCard
                        key={file.id}
                        file={file}
                        viewMode="grid"
                        onPreview={() => file.webViewLink && window.open(file.webViewLink, "_blank")}
                        onDelete={() => deleteMutation.mutate({ fileId: file.driveFileId })}
                      />
                    ))}
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
