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
  CloudOff,
  CheckCircle2,
  Gavel,
  Shield,
  Lock,
  Scale,
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
    label: "Substituição Criminal",
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

function EmptyDriveState({ onConfigure }: { onConfigure: () => void }) {
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
          Configure a integração com o Google Drive para armazenar e organizar os documentos da defensoria de forma centralizada.
        </p>
        <div className="space-y-3">
          <Link href="/admin/settings/drive">
            <Button className="w-full bg-zinc-900 hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-100 dark:text-zinc-900">
              <Settings className="w-4 h-4 mr-2" />
              Configurar Integração
            </Button>
          </Link>
          <p className="text-xs text-zinc-400">
            Você precisará de credenciais OAuth do Google Cloud
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

  // Handler de click - navegar se for pasta, preview se for arquivo
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
          "w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0", 
          file.isFolder ? "bg-emerald-100 dark:bg-emerald-900/30" : "bg-zinc-100 dark:bg-zinc-800"
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
        "hover:shadow-lg hover:border-zinc-300 dark:hover:border-zinc-700",
        isFolder && "hover:border-emerald-300 dark:hover:border-emerald-700"
      )}
      onClick={handleClick}
    >
      <div className="aspect-square bg-zinc-50 dark:bg-zinc-800/50 flex items-center justify-center relative">
        {file.thumbnailLink ? (
          <img src={file.thumbnailLink} alt={file.name} className="w-full h-full object-cover" />
        ) : (
          <Icon className={cn("w-14 h-14", colorClass)} />
        )}
        
        {/* Overlay de ações no hover */}
        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
          {file.webViewLink && (
            <a href={file.webViewLink} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>
              <Button size="sm" variant="secondary" className="h-8 w-8 p-0">
                <ExternalLink className="w-4 h-4" />
              </Button>
            </a>
          )}
          <Button size="sm" variant="secondary" className="h-8 w-8 p-0" onClick={onPreview}>
            <Eye className="w-4 h-4" />
          </Button>
        </div>
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

// Interface para item do breadcrumb
interface BreadcrumbItem {
  id: string;
  name: string;
}

export default function DrivePage() {
  const [viewMode, setViewMode] = useState<"grid" | "list">("list");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);

  // Stack de navegação para breadcrumbs
  const [navigationStack, setNavigationStack] = useState<BreadcrumbItem[]>([]);

  // Atribuição selecionada (padrão: JURI)
  const [selectedAtribuicao, setSelectedAtribuicao] = useState<DriveAtribuicao>("JURI");

  // Obter a configuração da atribuição atual
  const currentAtribuicao = DRIVE_ATRIBUICOES.find(a => a.id === selectedAtribuicao) || DRIVE_ATRIBUICOES[0];

  // Usar o folderId da atribuição selecionada
  const atribuicaoFolderId = currentAtribuicao.folderId;

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

  // Arquivos da pasta selecionada (do banco de dados local, não do Drive API)
  const { data: filesData, isLoading: isLoadingFiles, refetch: refetchFiles } = trpc.drive.files.useQuery(
    {
      folderId: atribuicaoFolderId, // Sempre a pasta raiz da atribuição
      parentDriveFileId: selectedFolderId || undefined, // Se navegou para subpasta, filtrar pelo driveFileId do parent
      parentFileId: selectedFolderId ? undefined : null, // Se na raiz, mostrar só itens sem parent
      limit: 200,
    },
    {
      enabled: configStatus?.configured === true && !!atribuicaoFolderId,
    }
  );

  // Sincronizar pasta
  const syncMutation = trpc.drive.syncFolder.useMutation({
    onSuccess: (result) => {
      toast.success(`Sincronizado: ${result.filesAdded} novos, ${result.filesUpdated} atualizados`);
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
        <div className="p-4 md:p-6 space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-28 rounded-2xl" />
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
        {/* Header Padrão Defender */}
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

        <EmptyDriveState onConfigure={() => {}} />
      </div>
    );
  }

  const files = filesData?.files || [];
  const currentFolderId = selectedFolderId || atribuicaoFolderId;
  const currentFolder = syncFolders?.find(f => f.driveFolderId === currentFolderId);

  // Função para navegar para dentro de uma pasta
  const navigateToFolder = (folderId: string, folderName: string) => {
    setNavigationStack(prev => [...prev, { id: folderId, name: folderName }]);
    setSelectedFolderId(folderId);
  };

  // Função para navegar para um nível específico do breadcrumb
  const navigateToBreadcrumb = (index: number) => {
    if (index === -1) {
      // Voltar para a raiz da atribuição
      setNavigationStack([]);
      setSelectedFolderId(null);
    } else {
      // Navegar para um nível específico
      const newStack = navigationStack.slice(0, index + 1);
      setNavigationStack(newStack);
      setSelectedFolderId(newStack[newStack.length - 1]?.id || null);
    }
  };

  // Função para voltar um nível
  const navigateBack = () => {
    if (navigationStack.length === 0) return;
    const newStack = navigationStack.slice(0, -1);
    setNavigationStack(newStack);
    setSelectedFolderId(newStack.length > 0 ? newStack[newStack.length - 1].id : null);
  };

  return (
    <div className="min-h-screen bg-zinc-100 dark:bg-[#0f0f11]">
      {/* Header Padrão Defender */}
      <div className="px-4 md:px-6 py-4 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-zinc-900 dark:bg-white flex items-center justify-center shadow-lg">
              <FolderOpen className="w-5 h-5 text-white dark:text-zinc-900" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-50 tracking-tight">Drive</h1>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">Gestão de documentos • {stats?.totalFiles || 0} arquivos</p>
            </div>
          </div>
          
          <div className="flex items-center gap-1">
            <Link href="/admin/distribuicao">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 text-zinc-400 hover:text-amber-600"
                title="Distribuição"
              >
                <FolderPlus className="w-3.5 h-3.5" />
              </Button>
            </Link>
            <Link href="/admin/settings/drive">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 text-zinc-400 hover:text-emerald-600"
                title="Configurações"
              >
                <Settings className="w-3.5 h-3.5" />
              </Button>
            </Link>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 text-zinc-400 hover:text-emerald-600"
              onClick={() => currentFolderId && syncMutation.mutate({ folderId: currentFolderId })}
              disabled={syncMutation.isPending || !currentFolderId}
              title="Sincronizar"
            >
              {syncMutation.isPending ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <RefreshCw className="w-3.5 h-3.5" />
              )}
            </Button>
            <Link href="/admin/drive/upload">
              <Button
                size="sm"
                className="h-7 px-2.5 ml-1 bg-zinc-800 hover:bg-emerald-600 dark:bg-zinc-700 dark:hover:bg-emerald-600 text-white text-xs font-medium rounded-md transition-colors"
              >
                <Upload className="w-3.5 h-3.5 mr-1" />
                Upload
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 md:p-6 space-y-4">
        {/* Seletor de Atribuição */}
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4">
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
                    setSelectedFolderId(null); // Resetar pasta selecionada
                    setNavigationStack([]); // Resetar navegação
                  }}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                    isSelected
                      ? `${atrib.colors.bg} ${atrib.colors.text} ring-1 ${atrib.colors.ring}`
                      : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {atrib.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Breadcrumbs de Navegação */}
        {(navigationStack.length > 0 || selectedFolderId) && (
          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-3">
            <div className="flex items-center gap-1 text-sm overflow-x-auto">
              {/* Botão Home - Raiz da Atribuição */}
              <button
                onClick={() => navigateToBreadcrumb(-1)}
                className="flex items-center gap-1.5 px-2 py-1 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors text-zinc-600 dark:text-zinc-400"
              >
                <Home className="w-4 h-4" />
                <span className="font-medium">{currentAtribuicao.label}</span>
              </button>

              {/* Items do Breadcrumb */}
              {navigationStack.map((item, index) => (
                <div key={item.id} className="flex items-center">
                  <ChevronRight className="w-4 h-4 text-zinc-400 mx-1" />
                  <button
                    onClick={() => navigateToBreadcrumb(index)}
                    className={cn(
                      "px-2 py-1 rounded-md transition-colors max-w-[200px] truncate",
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

              {/* Botão Voltar (se não estiver na raiz) */}
              {navigationStack.length > 0 && (
                <button
                  onClick={navigateBack}
                  className="ml-auto flex items-center gap-1 px-2 py-1 rounded-md bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors text-zinc-600 dark:text-zinc-400 text-xs font-medium"
                >
                  <ChevronRight className="w-3.5 h-3.5 rotate-180" />
                  Voltar
                </button>
              )}
            </div>
          </div>
        )}

        {/* Stats Cards - Mobile-first */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="group relative p-5 sm:p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 hover:border-emerald-200/50 dark:hover:border-emerald-800/30 transition-all duration-300 cursor-pointer hover:shadow-lg hover:shadow-emerald-500/[0.03]">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-500/0 to-transparent group-hover:via-emerald-500/30 transition-all duration-300 rounded-t-xl" />
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0 space-y-1">
                <p className="text-xs sm:text-[10px] font-medium text-zinc-400 dark:text-zinc-500 truncate uppercase tracking-wide group-hover:text-emerald-600/70 transition-colors">Arquivos</p>
                <p className="text-2xl sm:text-xl font-semibold text-zinc-700 dark:text-zinc-300">{stats?.totalFiles || 0}</p>
                <p className="text-xs sm:text-[10px] text-zinc-400">no total</p>
              </div>
              <div className="w-11 h-11 sm:w-9 sm:h-9 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center border border-zinc-200 dark:border-zinc-700 group-hover:border-emerald-300/30 group-hover:bg-emerald-50 dark:group-hover:bg-emerald-900/20 transition-all">
                <File className="w-5 h-5 sm:w-4 sm:h-4 text-zinc-500 group-hover:text-emerald-600 transition-colors" />
              </div>
            </div>
          </div>

          <div className="group relative p-5 sm:p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 hover:border-emerald-200/50 dark:hover:border-emerald-800/30 transition-all duration-300 cursor-pointer hover:shadow-lg hover:shadow-emerald-500/[0.03]">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-500/0 to-transparent group-hover:via-emerald-500/30 transition-all duration-300 rounded-t-xl" />
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0 space-y-1">
                <p className="text-xs sm:text-[10px] font-medium text-zinc-400 dark:text-zinc-500 truncate uppercase tracking-wide group-hover:text-emerald-600/70 transition-colors">Pastas</p>
                <p className="text-2xl sm:text-xl font-semibold text-zinc-700 dark:text-zinc-300">{stats?.totalFolders || 0}</p>
                <p className="text-xs sm:text-[10px] text-zinc-400">organizadas</p>
              </div>
              <div className="w-11 h-11 sm:w-9 sm:h-9 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center border border-zinc-200 dark:border-zinc-700 group-hover:border-emerald-300/30 group-hover:bg-emerald-50 dark:group-hover:bg-emerald-900/20 transition-all">
                <FolderOpen className="w-5 h-5 sm:w-4 sm:h-4 text-zinc-500 group-hover:text-emerald-600 transition-colors" />
              </div>
            </div>
          </div>

          <div className="group relative p-5 sm:p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 hover:border-emerald-200/50 dark:hover:border-emerald-800/30 transition-all duration-300 cursor-pointer hover:shadow-lg hover:shadow-emerald-500/[0.03]">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-500/0 to-transparent group-hover:via-emerald-500/30 transition-all duration-300 rounded-t-xl" />
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0 space-y-1">
                <p className="text-xs sm:text-[10px] font-medium text-zinc-400 dark:text-zinc-500 truncate uppercase tracking-wide group-hover:text-emerald-600/70 transition-colors">Sincronizadas</p>
                <p className="text-2xl sm:text-xl font-semibold text-zinc-700 dark:text-zinc-300">{stats?.syncedFolders || 0}</p>
                <p className="text-xs sm:text-[10px] text-zinc-400">com Google Drive</p>
              </div>
              <div className="w-11 h-11 sm:w-9 sm:h-9 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center border border-zinc-200 dark:border-zinc-700 group-hover:border-emerald-300/30 group-hover:bg-emerald-50 dark:group-hover:bg-emerald-900/20 transition-all">
                <Link2 className="w-5 h-5 sm:w-4 sm:h-4 text-zinc-500 group-hover:text-emerald-600 transition-colors" />
              </div>
            </div>
          </div>

          <div className="group relative p-5 sm:p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 hover:border-emerald-200/50 dark:hover:border-emerald-800/30 transition-all duration-300 cursor-pointer hover:shadow-lg hover:shadow-emerald-500/[0.03]">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-500/0 to-transparent group-hover:via-emerald-500/30 transition-all duration-300 rounded-t-xl" />
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0 space-y-1">
                <p className="text-xs sm:text-[10px] font-medium text-zinc-400 dark:text-zinc-500 truncate uppercase tracking-wide group-hover:text-emerald-600/70 transition-colors">Pendentes</p>
                <p className="text-2xl sm:text-xl font-semibold text-zinc-700 dark:text-zinc-300">{stats?.pendingSync || 0}</p>
                <p className="text-xs sm:text-[10px] text-zinc-400">a sincronizar</p>
              </div>
              <div className="w-11 h-11 sm:w-9 sm:h-9 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center border border-zinc-200 dark:border-zinc-700 group-hover:border-emerald-300/30 group-hover:bg-emerald-50 dark:group-hover:bg-emerald-900/20 transition-all">
                <CheckCircle2 className="w-5 h-5 sm:w-4 sm:h-4 text-zinc-500 group-hover:text-emerald-600 transition-colors" />
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex gap-6">
          {/* Sidebar */}
          <div className="hidden lg:block w-72 flex-shrink-0">
            <Card className="overflow-hidden sticky top-4 rounded-xl">
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
                          "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all",
                          selectedFolderId === folder.driveFolderId || (!selectedFolderId && folder.id === syncFolders[0]?.id)
                            ? "bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-medium shadow-md"
                            : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                        )}
                      >
                        <FolderOpen className="w-4 h-4 flex-shrink-0" />
                        <span className="flex-1 text-left truncate">{folder.name}</span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="p-6 text-center text-sm text-zinc-500">
                    <FolderOpen className="w-10 h-10 mx-auto mb-3 text-zinc-300 dark:text-zinc-600" />
                    <p className="font-medium mb-1">Nenhuma pasta</p>
                    <p className="text-xs text-zinc-400">Configure pastas para sincronizar</p>
                    <Link href="/admin/settings/drive">
                      <Button variant="link" size="sm" className="mt-3">
                        Configurar
                      </Button>
                    </Link>
                  </div>
                )}
              </div>
            </Card>
          </div>

          {/* Main content */}
          <div className="flex-1 min-w-0">
            {/* Toolbar */}
            <Card className="mb-4 p-3 rounded-xl">
              <div className="flex items-center gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                  <Input
                    placeholder="Buscar arquivos..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 h-10 bg-zinc-50 dark:bg-zinc-800 border-0 rounded-xl"
                  />
                </div>
                <div className="flex items-center bg-zinc-100 dark:bg-zinc-800 p-1 rounded-lg">
                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn(
                      "h-8 w-8 p-0 rounded-md",
                      viewMode === "list" && "bg-white dark:bg-zinc-700 shadow-sm"
                    )}
                    onClick={() => setViewMode("list")}
                  >
                    <List className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn(
                      "h-8 w-8 p-0 rounded-md",
                      viewMode === "grid" && "bg-white dark:bg-zinc-700 shadow-sm"
                    )}
                    onClick={() => setViewMode("grid")}
                  >
                    <LayoutGrid className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </Card>

            {/* Files */}
            <Card className="rounded-xl overflow-hidden">
              {/* Header da listagem */}
              <div className="px-4 py-3 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 flex items-center justify-between">
                <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  {currentFolder?.name || "Arquivos"}
                </span>
                <span className="text-xs text-zinc-500">
                  {files.length} item{files.length !== 1 && 's'}
                </span>
              </div>

              {isLoadingFiles ? (
                <div className="p-6 space-y-3">
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
                    {currentFolderId ? "Esta pasta não contém arquivos sincronizados" : "Selecione uma pasta na barra lateral"}
                  </p>
                </div>
              ) : viewMode === "list" ? (
                <div>
                  {files
                    .filter(f => !searchTerm || f.name.toLowerCase().includes(searchTerm.toLowerCase()))
                    .map((file) => (
                      <FileCard
                        key={file.id || file.driveFileId}
                        file={{ ...file, id: file.driveFileId || file.id }}
                        viewMode="list"
                        onPreview={() => file.webViewLink && window.open(file.webViewLink, "_blank")}
                        onDelete={() => deleteMutation.mutate({ fileId: file.driveFileId || file.id })}
                        onNavigate={navigateToFolder}
                      />
                    ))}
                </div>
              ) : (
                <div className="p-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                  {files
                    .filter(f => !searchTerm || f.name.toLowerCase().includes(searchTerm.toLowerCase()))
                    .map((file) => (
                      <FileCard
                        key={file.id || file.driveFileId}
                        file={{ ...file, id: file.driveFileId || file.id }}
                        viewMode="grid"
                        onPreview={() => file.webViewLink && window.open(file.webViewLink, "_blank")}
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
    </div>
  );
}
