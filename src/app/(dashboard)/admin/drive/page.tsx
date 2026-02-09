"use client";

import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
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
  RefreshCw,
  MoreHorizontal,
  ChevronRight,
  Home,
  Loader2,
  Link2,
  CloudOff,
  CheckCircle2,
  Gavel,
  Shield,
  Lock,
  Scale,
  Upload,
  Settings,
  FolderPlus,
  X,
  Play,
  Pause,
  Volume2,
  Calendar,
  User,
  FileType,
  Clock,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow, differenceInDays } from "date-fns";
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
  pdf: "text-rose-500",
  image: "text-violet-500",
  video: "text-amber-500",
  audio: "text-cyan-500",
  archive: "text-zinc-500",
  default: "text-zinc-400",
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

function isNewFile(date: Date | string | null): boolean {
  if (!date) return false;
  const fileDate = typeof date === 'string' ? new Date(date) : date;
  return differenceInDays(new Date(), fileDate) <= 7;
}

// ==========================================
// ATRIBUIÇÕES DO DRIVE
// ==========================================

type DriveAtribuicao = "JURI" | "VVD" | "EP" | "SUBSTITUICAO";

const DRIVE_ATRIBUICOES: {
  id: DriveAtribuicao;
  label: string;
  icon: React.ElementType;
  folderId: string;
  colors: {
    bg: string;
    text: string;
    ring: string;
    bgHover: string;
  };
}[] = [
  {
    id: "JURI",
    label: "Júri",
    icon: Gavel,
    folderId: "1_S-2qdqO0n1npNcs0PnoagBM4ZtwKhk-",
    colors: {
      bg: "bg-emerald-500/20",
      text: "text-emerald-400",
      ring: "ring-emerald-500/30",
      bgHover: "hover:bg-emerald-700/30",
    },
  },
  {
    id: "VVD",
    label: "Violência Doméstica",
    icon: Shield,
    folderId: "1fN2GiGlNzc61g01ZeBMg9ZBy1hexx0ti",
    colors: {
      bg: "bg-yellow-500/20",
      text: "text-yellow-400",
      ring: "ring-yellow-500/30",
      bgHover: "hover:bg-yellow-700/30",
    },
  },
  {
    id: "EP",
    label: "Execução Penal",
    icon: Lock,
    folderId: "1-mbwgP3-ygVVjoN9RPTbHwnaicnBAv0q",
    colors: {
      bg: "bg-blue-500/20",
      text: "text-blue-400",
      ring: "ring-blue-500/30",
      bgHover: "hover:bg-blue-700/30",
    },
  },
  {
    id: "SUBSTITUICAO",
    label: "Substituição",
    icon: Scale,
    folderId: "1eNDT0j-5KQkzYXbqK6IBa9sIMT3QFWVU",
    colors: {
      bg: "bg-purple-500/20",
      text: "text-purple-400",
      ring: "ring-purple-500/30",
      bgHover: "hover:bg-purple-700/30",
    },
  },
];

// ==========================================
// COMPONENTES
// ==========================================

function EmptyDriveState() {
  return (
    <div className="min-h-[50vh] flex items-center justify-center p-6">
      <Card className="max-w-md w-full p-8 text-center border-dashed border-2 bg-zinc-50/50 dark:bg-zinc-900/50">
        <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
          <CloudOff className="w-10 h-10 text-zinc-400" />
        </div>
        <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50 mb-2">
          Google Drive não configurado
        </h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6 leading-relaxed">
          Configure a integração com o Google Drive para armazenar e organizar os documentos da defensoria.
        </p>
        <Link href="/admin/settings/drive">
          <Button className="w-full bg-zinc-900 hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-100 dark:text-zinc-900">
            <Settings className="w-4 h-4 mr-2" />
            Configurar Integração
          </Button>
        </Link>
      </Card>
    </div>
  );
}

// Preview Modal Component
function PreviewModal({
  file,
  isOpen,
  onClose,
}: {
  file: any;
  isOpen: boolean;
  onClose: () => void;
}) {
  const fileType = getFileType(file?.mimeType || '');
  const isImage = fileType === 'image';
  const isPdf = fileType === 'pdf';
  const isAudio = fileType === 'audio';
  const isVideo = fileType === 'video';

  if (!file) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0 overflow-hidden">
        <DialogHeader className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <div className={cn(
                "w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0",
                isPdf ? "bg-rose-100 dark:bg-rose-900/30" :
                isImage ? "bg-violet-100 dark:bg-violet-900/30" :
                isAudio ? "bg-cyan-100 dark:bg-cyan-900/30" :
                "bg-zinc-100 dark:bg-zinc-800"
              )}>
                {isPdf && <FileText className="w-5 h-5 text-rose-500" />}
                {isImage && <ImageIcon className="w-5 h-5 text-violet-500" />}
                {isAudio && <Music className="w-5 h-5 text-cyan-500" />}
                {isVideo && <Film className="w-5 h-5 text-amber-500" />}
                {!isPdf && !isImage && !isAudio && !isVideo && <File className="w-5 h-5 text-zinc-500" />}
              </div>
              <div className="min-w-0">
                <DialogTitle className="text-base font-semibold truncate pr-4">
                  {file.name}
                </DialogTitle>
                <DialogDescription className="text-xs text-zinc-500">
                  {formatFileSize(file.fileSize)} • {file.lastModifiedTime && formatDistanceToNow(new Date(file.lastModifiedTime), { addSuffix: true, locale: ptBR })}
                </DialogDescription>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {file.webViewLink && (
                <a href={file.webViewLink} target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" size="sm">
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Abrir no Drive
                  </Button>
                </a>
              )}
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-auto bg-zinc-50 dark:bg-zinc-950 min-h-[400px] max-h-[70vh]">
          {isPdf && file.webViewLink && (
            <iframe
              src={`${file.webViewLink.replace('/view', '/preview')}`}
              className="w-full h-[70vh] border-0"
              title={file.name}
            />
          )}

          {isImage && file.thumbnailLink && (
            <div className="flex items-center justify-center p-8 h-full">
              <img
                src={file.thumbnailLink.replace('=s220', '=s1000')}
                alt={file.name}
                className="max-w-full max-h-[60vh] object-contain rounded-lg shadow-lg"
              />
            </div>
          )}

          {isAudio && file.webContentLink && (
            <div className="flex flex-col items-center justify-center p-12 h-full">
              <div className="w-32 h-32 rounded-full bg-gradient-to-br from-cyan-500 to-cyan-600 flex items-center justify-center mb-8 shadow-lg">
                <Music className="w-16 h-16 text-white" />
              </div>
              <audio controls className="w-full max-w-md">
                <source src={file.webContentLink} />
                Seu navegador não suporta o elemento de áudio.
              </audio>
            </div>
          )}

          {isVideo && file.webContentLink && (
            <div className="flex items-center justify-center p-4 h-full">
              <video controls className="max-w-full max-h-[60vh] rounded-lg shadow-lg">
                <source src={file.webContentLink} />
                Seu navegador não suporta o elemento de vídeo.
              </video>
            </div>
          )}

          {!isPdf && !isImage && !isAudio && !isVideo && (
            <div className="flex flex-col items-center justify-center p-12 h-full text-center">
              <File className="w-20 h-20 text-zinc-300 dark:text-zinc-600 mb-4" />
              <p className="text-zinc-600 dark:text-zinc-400 mb-4">
                Preview não disponível para este tipo de arquivo
              </p>
              {file.webViewLink && (
                <a href={file.webViewLink} target="_blank" rel="noopener noreferrer">
                  <Button>
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Abrir no Google Drive
                  </Button>
                </a>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function FileCard({
  file,
  viewMode,
  onPreview,
  onDelete,
  onNavigate,
}: {
  file: any;
  viewMode: "grid" | "list";
  onPreview: () => void;
  onDelete: () => void;
  onNavigate?: (folderId: string, folderName: string) => void;
}) {
  const fileType = getFileType(file.mimeType);
  const Icon = FILE_ICONS[fileType] || FILE_ICONS.default;
  const colorClass = FILE_COLORS[fileType] || FILE_COLORS.default;
  const isFolder = fileType === "folder";
  const isNew = isNewFile(file.lastModifiedTime || file.createdAt);

  const handleClick = () => {
    if (isFolder && onNavigate) {
      onNavigate(file.id, file.name);
    } else {
      onPreview();
    }
  };

  if (viewMode === "list") {
    return (
      <div
        className={cn(
          "flex items-center gap-4 px-4 py-3 transition-all cursor-pointer group",
          "hover:bg-zinc-50 dark:hover:bg-zinc-800/50 border-b border-zinc-100 dark:border-zinc-800 last:border-b-0",
          isFolder && "hover:bg-emerald-50/50 dark:hover:bg-emerald-900/10"
        )}
        onClick={handleClick}
      >
        <div className={cn(
          "w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0",
          isFolder ? "bg-emerald-100 dark:bg-emerald-900/30" : "bg-zinc-100 dark:bg-zinc-800"
        )}>
          <Icon className={cn("w-5 h-5", colorClass)} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-medium text-zinc-900 dark:text-zinc-100 truncate">{file.name}</p>
            {isNew && (
              <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 text-[10px] px-1.5 py-0 font-medium">
                <Sparkles className="w-3 h-3 mr-0.5" />
                NOVO
              </Badge>
            )}
          </div>
          <p className="text-xs text-zinc-500 truncate">
            {isFolder ? "Pasta" : formatFileSize(file.fileSize)}
            {file.lastModifiedTime && ` • ${formatDistanceToNow(new Date(file.lastModifiedTime), { addSuffix: true, locale: ptBR })}`}
          </p>
        </div>

        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {!isFolder && (
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={(e) => { e.stopPropagation(); onPreview(); }}>
              <Eye className="w-4 h-4" />
            </Button>
          )}
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
        "hover:shadow-lg hover:border-zinc-300 dark:hover:border-zinc-700",
        isFolder && "hover:border-emerald-300 dark:hover:border-emerald-700"
      )}
      onClick={handleClick}
    >
      <div className="aspect-square bg-zinc-50 dark:bg-zinc-800/50 flex items-center justify-center relative">
        {file.thumbnailLink ? (
          <img src={file.thumbnailLink} alt={file.name} className="w-full h-full object-cover" />
        ) : (
          <Icon className={cn("w-12 h-12", colorClass)} />
        )}

        {isNew && (
          <div className="absolute top-2 right-2">
            <Badge variant="secondary" className="bg-emerald-500 text-white text-[10px] px-1.5 py-0">
              NOVO
            </Badge>
          </div>
        )}

        {/* Overlay de ações */}
        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
          {!isFolder && (
            <Button size="sm" variant="secondary" className="h-8 w-8 p-0" onClick={(e) => { e.stopPropagation(); onPreview(); }}>
              <Eye className="w-4 h-4" />
            </Button>
          )}
          {file.webViewLink && (
            <a href={file.webViewLink} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>
              <Button size="sm" variant="secondary" className="h-8 w-8 p-0">
                <ExternalLink className="w-4 h-4" />
              </Button>
            </a>
          )}
        </div>
      </div>
      <div className="p-3">
        <p className="font-medium text-sm text-zinc-900 dark:text-zinc-100 truncate">{file.name}</p>
        <p className="text-xs text-zinc-500 mt-1">
          {isFolder ? "Pasta" : formatFileSize(file.fileSize)}
        </p>
      </div>
    </div>
  );
}

// ==========================================
// PÁGINA PRINCIPAL
// ==========================================

interface BreadcrumbItem {
  id: string;
  name: string;
}

export default function DrivePage() {
  const [viewMode, setViewMode] = useState<"grid" | "list">("list");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [navigationStack, setNavigationStack] = useState<BreadcrumbItem[]>([]);
  const [selectedAtribuicao, setSelectedAtribuicao] = useState<DriveAtribuicao>("JURI");

  // Preview state
  const [previewFile, setPreviewFile] = useState<any>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const currentAtribuicao = DRIVE_ATRIBUICOES.find(a => a.id === selectedAtribuicao) || DRIVE_ATRIBUICOES[0];
  const atribuicaoFolderId = currentAtribuicao.folderId;

  // Queries
  const { data: configStatus, isLoading: isCheckingConfig } = trpc.drive.isConfigured.useQuery();

  const { data: stats, isLoading: isLoadingStats } = trpc.drive.stats.useQuery(undefined, {
    enabled: configStatus?.configured === true,
  });

  const { data: syncFolders, isLoading: isLoadingFolders } = trpc.drive.syncFolders.useQuery(undefined, {
    enabled: configStatus?.configured === true,
  });

  const { data: filesData, isLoading: isLoadingFiles, refetch: refetchFiles } = trpc.drive.files.useQuery(
    {
      folderId: atribuicaoFolderId,
      parentDriveFileId: selectedFolderId || undefined,
      parentFileId: selectedFolderId ? undefined : null,
      limit: 200,
    },
    {
      enabled: configStatus?.configured === true && !!atribuicaoFolderId,
    }
  );

  // Mutations
  const syncMutation = trpc.drive.syncFolder.useMutation({
    onSuccess: (result) => {
      toast.success(`Sincronizado: ${result.filesAdded || 0} novos, ${result.filesUpdated || 0} atualizados`);
      refetchFiles();
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao sincronizar");
    },
  });

  const deleteMutation = trpc.drive.deleteFile.useMutation({
    onSuccess: () => {
      toast.success("Arquivo excluído");
      refetchFiles();
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao excluir");
    },
  });

  // Loading state
  if (isCheckingConfig) {
    return (
      <div className="min-h-screen bg-zinc-100 dark:bg-[#0f0f11]">
        <div className="px-4 md:px-6 py-4 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center gap-3">
            <Skeleton className="w-11 h-11 rounded-xl" />
            <div>
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-4 w-48 mt-1" />
            </div>
          </div>
        </div>
        <div className="p-4 md:p-6 space-y-4">
          <Skeleton className="h-20 w-full rounded-xl" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-24 rounded-xl" />
            ))}
          </div>
          <Skeleton className="h-[400px] w-full rounded-xl" />
        </div>
      </div>
    );
  }

  // Drive não configurado
  if (!configStatus?.configured) {
    return (
      <div className="min-h-screen bg-zinc-100 dark:bg-[#0f0f11]">
        <div className="px-4 md:px-6 py-4 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-zinc-900 dark:bg-white flex items-center justify-center shadow-lg">
              <FolderOpen className="w-5 h-5 text-white dark:text-zinc-900" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-50 tracking-tight">Drive</h1>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">Gestão de documentos</p>
            </div>
          </div>
        </div>
        <EmptyDriveState />
      </div>
    );
  }

  const files = filesData?.files || [];
  const currentFolderId = selectedFolderId || atribuicaoFolderId;
  const currentFolder = syncFolders?.find(f => f.driveFolderId === currentFolderId);

  // Contagem de arquivos novos
  const newFilesCount = files.filter(f => isNewFile(f.lastModifiedTime || f.createdAt)).length;

  // Navegação
  const navigateToFolder = (folderId: string, folderName: string) => {
    setNavigationStack(prev => [...prev, { id: folderId, name: folderName }]);
    setSelectedFolderId(folderId);
  };

  const navigateToBreadcrumb = (index: number) => {
    if (index === -1) {
      setNavigationStack([]);
      setSelectedFolderId(null);
    } else {
      const newStack = navigationStack.slice(0, index + 1);
      setNavigationStack(newStack);
      setSelectedFolderId(newStack[newStack.length - 1]?.id || null);
    }
  };

  const navigateBack = () => {
    if (navigationStack.length === 0) return;
    const newStack = navigationStack.slice(0, -1);
    setNavigationStack(newStack);
    setSelectedFolderId(newStack.length > 0 ? newStack[newStack.length - 1].id : null);
  };

  // Preview handlers
  const openPreview = (file: any) => {
    setPreviewFile(file);
    setIsPreviewOpen(true);
  };

  const closePreview = () => {
    setIsPreviewOpen(false);
    setPreviewFile(null);
  };

  return (
    <div className="min-h-screen bg-zinc-100 dark:bg-[#0f0f11]">
      {/* Header */}
      <div className="px-4 md:px-6 py-4 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-xl bg-zinc-900 dark:bg-white flex items-center justify-center shadow-lg flex-shrink-0">
              <FolderOpen className="w-5 h-5 text-white dark:text-zinc-900" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-50 tracking-tight">Drive</h1>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
                Gestão de documentos • {stats?.totalFiles || 0} arquivos
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 flex-shrink-0">
            <Link href="/admin/distribuicao">
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-zinc-400 hover:text-amber-600" title="Distribuição">
                <FolderPlus className="w-4 h-4" />
              </Button>
            </Link>
            <Link href="/admin/settings/drive">
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-zinc-400 hover:text-emerald-600" title="Configurações">
                <Settings className="w-4 h-4" />
              </Button>
            </Link>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-zinc-400 hover:text-emerald-600"
              onClick={() => currentFolderId && syncMutation.mutate({ folderId: currentFolderId })}
              disabled={syncMutation.isPending || !currentFolderId}
              title="Sincronizar"
            >
              {syncMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            </Button>
            <Link href="/admin/drive/upload">
              <Button size="sm" className="h-8 px-3 ml-1 bg-zinc-800 hover:bg-emerald-600 dark:bg-zinc-700 dark:hover:bg-emerald-600 text-white text-xs font-medium">
                <Upload className="w-4 h-4 mr-1.5" />
                <span className="hidden sm:inline">Upload</span>
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 md:p-6 space-y-4 max-w-full overflow-hidden">
        {/* Seletor de Atribuição */}
        <Card className="p-4">
          <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-3 uppercase tracking-wider">
            Selecione a Atribuição
          </p>
          <div className="flex flex-wrap gap-2">
            {DRIVE_ATRIBUICOES.map((atrib) => {
              const Icon = atrib.icon;
              const isSelected = selectedAtribuicao === atrib.id;
              return (
                <button
                  key={atrib.id}
                  onClick={() => {
                    setSelectedAtribuicao(atrib.id);
                    setSelectedFolderId(null);
                    setNavigationStack([]);
                  }}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                    isSelected
                      ? `${atrib.colors.bg} ${atrib.colors.text} ring-1 ${atrib.colors.ring}`
                      : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                  )}
                >
                  <Icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{atrib.label}</span>
                  <span className="sm:hidden">{atrib.id}</span>
                </button>
              );
            })}
          </div>
        </Card>

        {/* Breadcrumbs */}
        {(navigationStack.length > 0 || selectedFolderId) && (
          <Card className="p-3">
            <div className="flex items-center gap-1 text-sm overflow-x-auto scrollbar-hide">
              <button
                onClick={() => navigateToBreadcrumb(-1)}
                className="flex items-center gap-1.5 px-2 py-1 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors text-zinc-600 dark:text-zinc-400 flex-shrink-0"
              >
                <Home className="w-4 h-4" />
                <span className="font-medium">{currentAtribuicao.label}</span>
              </button>

              {navigationStack.map((item, index) => (
                <div key={item.id} className="flex items-center flex-shrink-0">
                  <ChevronRight className="w-4 h-4 text-zinc-400 mx-1" />
                  <button
                    onClick={() => navigateToBreadcrumb(index)}
                    className={cn(
                      "px-2 py-1 rounded-md transition-colors max-w-[150px] truncate",
                      index === navigationStack.length - 1
                        ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-medium"
                        : "hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
                    )}
                    title={item.name}
                  >
                    {item.name}
                  </button>
                </div>
              ))}

              {navigationStack.length > 0 && (
                <button
                  onClick={navigateBack}
                  className="ml-auto flex items-center gap-1 px-2 py-1 rounded-md bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors text-zinc-600 dark:text-zinc-400 text-xs font-medium flex-shrink-0"
                >
                  <ChevronRight className="w-3.5 h-3.5 rotate-180" />
                  Voltar
                </button>
              )}
            </div>
          </Card>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Card className="p-4 group hover:border-emerald-200/50 dark:hover:border-emerald-800/30 transition-all cursor-pointer">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[10px] font-medium text-zinc-400 uppercase tracking-wide">Arquivos</p>
                <p className="text-2xl font-semibold text-zinc-700 dark:text-zinc-300 mt-1">{stats?.totalFiles || 0}</p>
                <p className="text-[10px] text-zinc-400 mt-0.5">no total</p>
              </div>
              <div className="w-9 h-9 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center flex-shrink-0">
                <File className="w-4 h-4 text-zinc-500 group-hover:text-emerald-600 transition-colors" />
              </div>
            </div>
          </Card>

          <Card className="p-4 group hover:border-emerald-200/50 dark:hover:border-emerald-800/30 transition-all cursor-pointer">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[10px] font-medium text-zinc-400 uppercase tracking-wide">Pastas</p>
                <p className="text-2xl font-semibold text-zinc-700 dark:text-zinc-300 mt-1">{stats?.totalFolders || 0}</p>
                <p className="text-[10px] text-zinc-400 mt-0.5">organizadas</p>
              </div>
              <div className="w-9 h-9 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center flex-shrink-0">
                <FolderOpen className="w-4 h-4 text-zinc-500 group-hover:text-emerald-600 transition-colors" />
              </div>
            </div>
          </Card>

          <Card className="p-4 group hover:border-emerald-200/50 dark:hover:border-emerald-800/30 transition-all cursor-pointer">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[10px] font-medium text-zinc-400 uppercase tracking-wide">Sincronizadas</p>
                <p className="text-2xl font-semibold text-zinc-700 dark:text-zinc-300 mt-1">{stats?.syncedFolders || 0}</p>
                <p className="text-[10px] text-zinc-400 mt-0.5">com Drive</p>
              </div>
              <div className="w-9 h-9 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center flex-shrink-0">
                <Link2 className="w-4 h-4 text-zinc-500 group-hover:text-emerald-600 transition-colors" />
              </div>
            </div>
          </Card>

          <Card className="p-4 group hover:border-emerald-200/50 dark:hover:border-emerald-800/30 transition-all cursor-pointer">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[10px] font-medium text-zinc-400 uppercase tracking-wide">Novos</p>
                <p className="text-2xl font-semibold text-emerald-600 mt-1">{newFilesCount}</p>
                <p className="text-[10px] text-zinc-400 mt-0.5">últimos 7 dias</p>
              </div>
              <div className="w-9 h-9 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-4 h-4 text-emerald-600" />
              </div>
            </div>
          </Card>
        </div>

        {/* Main Content */}
        <div className="flex gap-4 lg:gap-6">
          {/* Sidebar - Hidden on mobile */}
          <div className="hidden lg:block w-64 flex-shrink-0">
            <Card className="sticky top-4 overflow-hidden">
              <div className="px-4 py-3 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/30">
                <h3 className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">
                  Pastas Sincronizadas
                </h3>
              </div>
              <div className="p-2 max-h-[300px] overflow-y-auto">
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
                        onClick={() => {
                          setSelectedFolderId(folder.driveFolderId);
                          setNavigationStack([]);
                        }}
                        className={cn(
                          "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all",
                          currentFolderId === folder.driveFolderId
                            ? "bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-medium"
                            : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                        )}
                      >
                        <FolderOpen className="w-4 h-4 flex-shrink-0" />
                        <span className="truncate">{folder.name}</span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 text-center text-sm text-zinc-500">
                    <FolderOpen className="w-8 h-8 mx-auto mb-2 text-zinc-300 dark:text-zinc-600" />
                    <p className="text-xs">Nenhuma pasta sincronizada</p>
                  </div>
                )}
              </div>
            </Card>
          </div>

          {/* File List */}
          <div className="flex-1 min-w-0">
            {/* Toolbar */}
            <Card className="mb-4 p-3">
              <div className="flex items-center gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                  <Input
                    placeholder="Buscar arquivos..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 h-10 bg-zinc-50 dark:bg-zinc-800 border-0"
                  />
                </div>
                <div className="flex items-center bg-zinc-100 dark:bg-zinc-800 p-1 rounded-lg flex-shrink-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn("h-8 w-8 p-0 rounded-md", viewMode === "list" && "bg-white dark:bg-zinc-700 shadow-sm")}
                    onClick={() => setViewMode("list")}
                  >
                    <List className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn("h-8 w-8 p-0 rounded-md", viewMode === "grid" && "bg-white dark:bg-zinc-700 shadow-sm")}
                    onClick={() => setViewMode("grid")}
                  >
                    <LayoutGrid className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </Card>

            {/* Files */}
            <Card className="overflow-hidden">
              <div className="px-4 py-3 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 flex items-center justify-between">
                <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  {navigationStack.length > 0 ? navigationStack[navigationStack.length - 1].name : currentAtribuicao.label}
                </span>
                <span className="text-xs text-zinc-500">
                  {files.length} item{files.length !== 1 && 's'}
                  {newFilesCount > 0 && (
                    <Badge variant="secondary" className="ml-2 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 text-[10px]">
                      {newFilesCount} novo{newFilesCount !== 1 && 's'}
                    </Badge>
                  )}
                </span>
              </div>

              {isLoadingFiles ? (
                <div className="p-4 space-y-3">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Skeleton key={i} className="h-14 w-full rounded-lg" />
                  ))}
                </div>
              ) : files.length === 0 ? (
                <div className="p-12 text-center">
                  <FolderOpen className="w-16 h-16 mx-auto text-zinc-300 dark:text-zinc-600 mb-4" />
                  <h3 className="text-lg font-semibold text-zinc-700 dark:text-zinc-300 mb-2">
                    Pasta vazia
                  </h3>
                  <p className="text-sm text-zinc-500 max-w-sm mx-auto">
                    Esta pasta não contém arquivos sincronizados
                  </p>
                </div>
              ) : viewMode === "list" ? (
                <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {files
                    .filter(f => !searchTerm || f.name.toLowerCase().includes(searchTerm.toLowerCase()))
                    .map((file) => (
                      <FileCard
                        key={file.id || file.driveFileId}
                        file={{ ...file, id: file.driveFileId || file.id }}
                        viewMode="list"
                        onPreview={() => openPreview({ ...file, id: file.driveFileId || file.id })}
                        onDelete={() => deleteMutation.mutate({ fileId: file.driveFileId || file.id })}
                        onNavigate={navigateToFolder}
                      />
                    ))}
                </div>
              ) : (
                <div className="p-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3">
                  {files
                    .filter(f => !searchTerm || f.name.toLowerCase().includes(searchTerm.toLowerCase()))
                    .map((file) => (
                      <FileCard
                        key={file.id || file.driveFileId}
                        file={{ ...file, id: file.driveFileId || file.id }}
                        viewMode="grid"
                        onPreview={() => openPreview({ ...file, id: file.driveFileId || file.id })}
                        onDelete={() => deleteMutation.mutate({ fileId: file.driveFileId || file.id })}
                        onNavigate={navigateToFolder}
                      />
                    ))}
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>

      {/* Preview Modal */}
      <PreviewModal
        file={previewFile}
        isOpen={isPreviewOpen}
        onClose={closePreview}
      />
    </div>
  );
}
