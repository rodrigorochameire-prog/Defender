"use client";

import { useState, useMemo, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
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
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
  Gavel,
  Shield,
  Lock,
  Scale,
  Upload,
  Settings,
  FolderPlus,
  Sparkles,
  User,
  Phone,
  MapPin,
  Calendar,
  AlertCircle,
  Tag,
  Clock,
  BarChart3,
  Filter,
  ChevronDown,
  X,
  FileType,
  HardDrive,
  TrendingUp,
  Briefcase,
  History,
  Mic,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow, differenceInDays, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { trpc } from "@/lib/trpc/client";
import { toast } from "sonner";
import Link from "next/link";
import { TranscriptViewer } from "@/components/shared/transcript-viewer";

// ==========================================
// CONSTANTES E TIPOS
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

const DOCUMENT_TAGS = [
  { id: "peticao", label: "Petição", color: "bg-blue-500" },
  { id: "laudo", label: "Laudo", color: "bg-purple-500" },
  { id: "decisao", label: "Decisão", color: "bg-amber-500" },
  { id: "intimacao", label: "Intimação", color: "bg-rose-500" },
  { id: "audio", label: "Áudio", color: "bg-cyan-500" },
  { id: "prova", label: "Prova", color: "bg-emerald-500" },
  { id: "relatorio", label: "Relatório", color: "bg-indigo-500" },
  { id: "certidao", label: "Certidão", color: "bg-orange-500" },
];

type DriveAtribuicao = "JURI" | "VVD" | "EP" | "SUBSTITUICAO";

const DRIVE_ATRIBUICOES: {
  id: DriveAtribuicao;
  label: string;
  icon: React.ElementType;
  folderId: string;
  colors: { bg: string; text: string; ring: string; };
}[] = [
  {
    id: "JURI",
    label: "Júri",
    icon: Gavel,
    folderId: "1_S-2qdqO0n1npNcs0PnoagBM4ZtwKhk-",
    colors: { bg: "bg-emerald-500/20", text: "text-emerald-400", ring: "ring-emerald-500/30" },
  },
  {
    id: "VVD",
    label: "Violência Doméstica",
    icon: Shield,
    folderId: "1fN2GiGlNzc61g01ZeBMg9ZBy1hexx0ti",
    colors: { bg: "bg-yellow-500/20", text: "text-yellow-400", ring: "ring-yellow-500/30" },
  },
  {
    id: "EP",
    label: "Execução Penal",
    icon: Lock,
    folderId: "1-mbwgP3-ygVVjoN9RPTbHwnaicnBAv0q",
    colors: { bg: "bg-blue-500/20", text: "text-blue-400", ring: "ring-blue-500/30" },
  },
  {
    id: "SUBSTITUICAO",
    label: "Substituição",
    icon: Scale,
    folderId: "1eNDT0j-5KQkzYXbqK6IBa9sIMT3QFWVU",
    colors: { bg: "bg-purple-500/20", text: "text-purple-400", ring: "ring-purple-500/30" },
  },
];

// ==========================================
// HELPERS
// ==========================================

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

function getFileTags(description: string | null): string[] {
  if (!description) return [];
  try {
    const parsed = JSON.parse(description);
    return parsed.tags || [];
  } catch {
    return [];
  }
}

function autoDetectTags(fileName: string): string[] {
  const tags: string[] = [];
  const lowerName = fileName.toLowerCase();

  if (lowerName.includes("peticao") || lowerName.includes("petição") || lowerName.includes("alegacoes") || lowerName.includes("alegações")) {
    tags.push("peticao");
  }
  if (lowerName.includes("laudo") || lowerName.includes("pericia") || lowerName.includes("perícia") || lowerName.includes("exame")) {
    tags.push("laudo");
  }
  if (lowerName.includes("decisao") || lowerName.includes("decisão") || lowerName.includes("sentenca") || lowerName.includes("sentença") || lowerName.includes("despacho")) {
    tags.push("decisao");
  }
  if (lowerName.includes("intimacao") || lowerName.includes("intimação") || lowerName.includes("notificacao") || lowerName.includes("notificação")) {
    tags.push("intimacao");
  }
  if (lowerName.includes("audio") || lowerName.includes("áudio") || lowerName.includes("gravacao") || lowerName.includes("gravação") || lowerName.includes(".mp3") || lowerName.includes(".wav")) {
    tags.push("audio");
  }
  if (lowerName.includes("relatorio") || lowerName.includes("relatório")) {
    tags.push("relatorio");
  }
  if (lowerName.includes("certidao") || lowerName.includes("certidão")) {
    tags.push("certidao");
  }

  return tags;
}

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
          Configure a integração com o Google Drive para organizar documentos.
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

// Sidebar do Assistido
function AssistidoSidebar({
  folderName,
  onClose,
}: {
  folderName: string;
  onClose: () => void;
}) {
  const { data: assistido, isLoading } = trpc.drive.getAssistidoByFolderName.useQuery(
    { folderName },
    { enabled: !!folderName }
  );

  if (isLoading) {
    return (
      <div className="w-80 border-l border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 space-y-4">
        <Skeleton className="h-20 w-full rounded-xl" />
        <Skeleton className="h-32 w-full rounded-xl" />
        <Skeleton className="h-24 w-full rounded-xl" />
      </div>
    );
  }

  if (!assistido) {
    return (
      <div className="w-80 border-l border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Assistido</h3>
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>
        <div className="text-center py-8">
          <User className="w-12 h-12 mx-auto text-zinc-300 dark:text-zinc-600 mb-3" />
          <p className="text-sm text-zinc-500">Nenhum assistido vinculado</p>
          <p className="text-xs text-zinc-400 mt-1">Pasta: {folderName}</p>
          <Link href="/admin/assistidos/novo">
            <Button variant="outline" size="sm" className="mt-4">
              Cadastrar Assistido
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const statusColors: Record<string, string> = {
    SOLTO: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
    CADEIA_PUBLICA: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400",
    PENITENCIARIA: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400",
    DOMICILIAR: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    MONITORADO: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  };

  return (
    <div className="w-80 border-l border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-y-auto">
      {/* Header */}
      <div className="p-4 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/30">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Assistido</h3>
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={onClose}>
            <X className="w-3.5 h-3.5" />
          </Button>
        </div>

        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center overflow-hidden">
            {assistido.photoUrl ? (
              <img src={assistido.photoUrl} alt={assistido.nome} className="w-full h-full object-cover" />
            ) : (
              <User className="w-6 h-6 text-zinc-400" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-zinc-900 dark:text-zinc-100 truncate">{assistido.nome}</h4>
            {assistido.cpf && (
              <p className="text-xs text-zinc-500 font-mono">{assistido.cpf}</p>
            )}
          </div>
        </div>

        {assistido.statusPrisional && (
          <Badge className={cn("mt-3", statusColors[assistido.statusPrisional] || "bg-zinc-100 text-zinc-700")}>
            {assistido.statusPrisional.replace(/_/g, ' ')}
          </Badge>
        )}
      </div>

      {/* Contato */}
      <div className="p-4 border-b border-zinc-100 dark:border-zinc-800">
        <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">Contato</h4>
        <div className="space-y-2">
          {assistido.telefone && (
            <div className="flex items-center gap-2 text-sm">
              <Phone className="w-4 h-4 text-zinc-400" />
              <span className="text-zinc-700 dark:text-zinc-300">{assistido.telefone}</span>
            </div>
          )}
          {assistido.telefoneContato && (
            <div className="flex items-center gap-2 text-sm">
              <Phone className="w-4 h-4 text-emerald-500" />
              <div>
                <span className="text-zinc-700 dark:text-zinc-300">{assistido.telefoneContato}</span>
                {assistido.nomeContato && (
                  <span className="text-xs text-zinc-500 ml-1">({assistido.nomeContato})</span>
                )}
              </div>
            </div>
          )}
          {assistido.localPrisao && (
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="w-4 h-4 text-rose-500" />
              <span className="text-zinc-700 dark:text-zinc-300">{assistido.localPrisao}</span>
            </div>
          )}
        </div>
      </div>

      {/* Processos */}
      {assistido.processos && assistido.processos.length > 0 && (
        <div className="p-4 border-b border-zinc-100 dark:border-zinc-800">
          <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">
            Processos ({assistido.processos.length})
          </h4>
          <div className="space-y-2">
            {assistido.processos.map((processo: any) => (
              <Link key={processo.id} href={`/admin/processos/${processo.id}`}>
                <div className="p-2 rounded-lg bg-zinc-50 dark:bg-zinc-800/50 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer">
                  <p className="text-xs font-mono text-zinc-700 dark:text-zinc-300 truncate">{processo.numero}</p>
                  <p className="text-[10px] text-zinc-500 truncate">{processo.vara || processo.tipoAcao}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Demandas Pendentes */}
      {assistido.demandas && assistido.demandas.length > 0 && (
        <div className="p-4">
          <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3 flex items-center gap-2">
            <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
            Demandas Pendentes
          </h4>
          <div className="space-y-2">
            {assistido.demandas.map((demanda: any) => (
              <div
                key={demanda.id}
                className={cn(
                  "p-2 rounded-lg border-l-2",
                  demanda.prioridade === "URGENTE" || demanda.prioridade === "REU_PRESO"
                    ? "border-rose-500 bg-rose-50/50 dark:bg-rose-900/10"
                    : "border-amber-500 bg-amber-50/50 dark:bg-amber-900/10"
                )}
              >
                <p className="text-xs font-medium text-zinc-700 dark:text-zinc-300 truncate">{demanda.ato}</p>
                {demanda.prazoFatal && (
                  <p className="text-[10px] text-zinc-500 flex items-center gap-1 mt-1">
                    <Calendar className="w-3 h-3" />
                    {format(new Date(demanda.prazoFatal), "dd/MM/yyyy", { locale: ptBR })}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Ações */}
      <div className="p-4 border-t border-zinc-100 dark:border-zinc-800">
        <Link href={`/admin/assistidos/${assistido.id}`}>
          <Button variant="outline" size="sm" className="w-full">
            Ver Perfil Completo
          </Button>
        </Link>
      </div>
    </div>
  );
}

// Modal de Preview
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
      <DialogContent className="max-w-5xl max-h-[90vh] p-0 overflow-hidden">
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
                <DialogTitle className="text-base font-semibold truncate pr-4">{file.name}</DialogTitle>
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

        <div className="flex-1 overflow-auto bg-zinc-50 dark:bg-zinc-950 min-h-[400px] max-h-[75vh]">
          {isPdf && file.webViewLink && (
            <iframe
              src={`${file.webViewLink.replace('/view', '/preview')}`}
              className="w-full h-[75vh] border-0"
              title={file.name}
            />
          )}

          {isImage && file.thumbnailLink && (
            <div className="flex items-center justify-center p-8 h-full">
              <img
                src={file.thumbnailLink.replace('=s220', '=s1200')}
                alt={file.name}
                className="max-w-full max-h-[65vh] object-contain rounded-lg shadow-lg"
              />
            </div>
          )}

          {isAudio && (
            <div className="flex flex-col items-center justify-center p-12 h-full">
              <div className="w-32 h-32 rounded-full bg-gradient-to-br from-cyan-500 to-cyan-600 flex items-center justify-center mb-8 shadow-lg">
                <Music className="w-16 h-16 text-white" />
              </div>
              {file.webContentLink ? (
                <audio controls className="w-full max-w-md">
                  <source src={file.webContentLink} />
                </audio>
              ) : file.webViewLink ? (
                <a href={file.webViewLink} target="_blank" rel="noopener noreferrer">
                  <Button>
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Ouvir no Google Drive
                  </Button>
                </a>
              ) : null}
            </div>
          )}

          {isVideo && (
            <div className="flex items-center justify-center p-4 h-full">
              {file.webContentLink ? (
                <video controls className="max-w-full max-h-[65vh] rounded-lg shadow-lg">
                  <source src={file.webContentLink} />
                </video>
              ) : file.webViewLink ? (
                <a href={file.webViewLink} target="_blank" rel="noopener noreferrer">
                  <Button>
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Assistir no Google Drive
                  </Button>
                </a>
              ) : null}
            </div>
          )}

          {!isPdf && !isImage && !isAudio && !isVideo && (
            <div className="flex flex-col items-center justify-center p-12 h-full text-center">
              <File className="w-20 h-20 text-zinc-300 dark:text-zinc-600 mb-4" />
              <p className="text-zinc-600 dark:text-zinc-400 mb-4">Preview não disponível</p>
              {file.webViewLink && (
                <a href={file.webViewLink} target="_blank" rel="noopener noreferrer">
                  <Button><ExternalLink className="w-4 h-4 mr-2" />Abrir no Drive</Button>
                </a>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// File Card Component
function FileCard({
  file,
  viewMode,
  onPreview,
  onNavigate,
  onTagUpdate,
  onTranscribe,
}: {
  file: any;
  viewMode: "grid" | "list";
  onPreview: () => void;
  onNavigate?: (folderId: string, folderName: string) => void;
  onTagUpdate?: (tags: string[]) => void;
  onTranscribe?: () => void;
}) {
  const fileType = getFileType(file.mimeType);
  const Icon = FILE_ICONS[fileType] || FILE_ICONS.default;
  const colorClass = FILE_COLORS[fileType] || FILE_COLORS.default;
  const isFolder = fileType === "folder";
  const isNew = isNewFile(file.lastModifiedTime || file.createdAt);
  const tags = getFileTags(file.description);
  const autoTags = autoDetectTags(file.name);
  const displayTags = tags.length > 0 ? tags : autoTags;

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
          "flex items-center gap-3 px-4 py-3 transition-all cursor-pointer group",
          "hover:bg-zinc-50 dark:hover:bg-zinc-800/50",
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
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-medium text-zinc-900 dark:text-zinc-100 truncate max-w-[250px]">{file.name}</p>
            {isNew && (
              <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 text-[10px] px-1.5 py-0">
                <Sparkles className="w-3 h-3 mr-0.5" />NOVO
              </Badge>
            )}
            {displayTags.slice(0, 2).map(tagId => {
              const tag = DOCUMENT_TAGS.find(t => t.id === tagId);
              return tag ? (
                <Badge key={tagId} className={cn("text-[10px] px-1.5 py-0 text-white", tag.color)}>
                  {tag.label}
                </Badge>
              ) : null;
            })}
          </div>
          <p className="text-xs text-zinc-500 truncate mt-0.5">
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
          {(isAudio || isVideo) && onTranscribe && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-cyan-500 hover:text-cyan-600"
              title="Transcrever áudio"
              onClick={(e) => { e.stopPropagation(); onTranscribe(); }}
            >
              <Mic className="w-4 h-4" />
            </Button>
          )}
          {file.webViewLink && (
            <a href={file.webViewLink} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <ExternalLink className="w-4 h-4" />
              </Button>
            </a>
          )}
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
        {file.thumbnailLink && !isFolder ? (
          <img src={file.thumbnailLink} alt={file.name} className="w-full h-full object-cover" />
        ) : (
          <Icon className={cn("w-12 h-12", colorClass)} />
        )}

        {isNew && (
          <Badge className="absolute top-2 right-2 bg-emerald-500 text-white text-[10px] px-1.5 py-0">NOVO</Badge>
        )}

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
        <div className="flex items-center gap-1 mt-1.5 flex-wrap">
          <span className="text-xs text-zinc-500">{isFolder ? "Pasta" : formatFileSize(file.fileSize)}</span>
          {displayTags.slice(0, 1).map(tagId => {
            const tag = DOCUMENT_TAGS.find(t => t.id === tagId);
            return tag ? (
              <Badge key={tagId} className={cn("text-[9px] px-1 py-0 text-white", tag.color)}>{tag.label}</Badge>
            ) : null;
          })}
        </div>
      </div>
    </div>
  );
}

// Dashboard de Métricas
function MetricsDashboard({ stats }: { stats: any }) {
  if (!stats) return null;

  const categories = [
    { key: "pdf", label: "PDFs", icon: FileText, color: "text-rose-500", bg: "bg-rose-100 dark:bg-rose-900/30" },
    { key: "document", label: "Documentos", icon: FileType, color: "text-blue-500", bg: "bg-blue-100 dark:bg-blue-900/30" },
    { key: "image", label: "Imagens", icon: ImageIcon, color: "text-violet-500", bg: "bg-violet-100 dark:bg-violet-900/30" },
    { key: "audio", label: "Áudios", icon: Music, color: "text-cyan-500", bg: "bg-cyan-100 dark:bg-cyan-900/30" },
    { key: "video", label: "Vídeos", icon: Film, color: "text-amber-500", bg: "bg-amber-100 dark:bg-amber-900/30" },
  ];

  const totalCategorized = Object.values(stats.byCategory || {}).reduce((a: number, b: any) => a + (b || 0), 0) as number;

  return (
    <div className="space-y-4">
      {/* Cards principais */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-medium text-zinc-400 uppercase">Total</p>
              <p className="text-2xl font-bold text-zinc-700 dark:text-zinc-300">{stats.totalFiles}</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
              <File className="w-5 h-5 text-zinc-500" />
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-medium text-zinc-400 uppercase">Novos (7d)</p>
              <p className="text-2xl font-bold text-emerald-600">{stats.newFiles}</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-emerald-500" />
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-medium text-zinc-400 uppercase">Tamanho</p>
              <p className="text-2xl font-bold text-zinc-700 dark:text-zinc-300">{formatFileSize(stats.totalSize)}</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
              <HardDrive className="w-5 h-5 text-zinc-500" />
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-medium text-zinc-400 uppercase">Crescimento</p>
              <p className="text-2xl font-bold text-blue-600">+{Math.round((stats.newFiles / (stats.totalFiles || 1)) * 100)}%</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-blue-500" />
            </div>
          </div>
        </Card>
      </div>

      {/* Distribuição por tipo */}
      <Card className="p-4">
        <h4 className="text-xs font-semibold text-zinc-500 uppercase mb-4">Arquivos por Tipo</h4>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {categories.map(cat => {
            const count = stats.byCategory?.[cat.key] || 0;
            const percentage = totalCategorized > 0 ? Math.round((count / totalCategorized) * 100) : 0;
            const Icon = cat.icon;

            return (
              <div key={cat.key} className="text-center">
                <div className={cn("w-12 h-12 mx-auto rounded-xl flex items-center justify-center mb-2", cat.bg)}>
                  <Icon className={cn("w-6 h-6", cat.color)} />
                </div>
                <p className="text-lg font-semibold text-zinc-700 dark:text-zinc-300">{count}</p>
                <p className="text-[10px] text-zinc-500">{cat.label}</p>
                <div className="mt-1 h-1 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                  <div className={cn("h-full rounded-full", cat.bg.replace('100', '500').replace('/30', ''))} style={{ width: `${percentage}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </Card>
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
  const [activeTab, setActiveTab] = useState<"files" | "timeline" | "metrics">("files");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [showAssistidoSidebar, setShowAssistidoSidebar] = useState(false);

  // Preview state
  const [previewFile, setPreviewFile] = useState<any>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // Transcription state
  const [transcriptionDialog, setTranscriptionDialog] = useState<{
    fileId: string;
    fileName: string;
    transcript: string | null;
    summary: string | null;
    isTranscribing: boolean;
  } | null>(null);
  const [isSummarizingDrive, setIsSummarizingDrive] = useState(false);

  const handleTranscribeDriveFile = async (fileId: string, fileName: string) => {
    setTranscriptionDialog({
      fileId,
      fileName,
      transcript: null,
      summary: null,
      isTranscribing: true,
    });
    try {
      const res = await fetch("/api/ai/transcribe-drive-file", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ driveFileId: fileId }),
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(err?.error ?? "Falha na transcrição.");
      }
      const json = (await res.json()) as { transcript?: string };
      setTranscriptionDialog((prev) =>
        prev ? { ...prev, transcript: json.transcript ?? "", isTranscribing: false } : null
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro ao transcrever.";
      toast.error(message);
      setTranscriptionDialog((prev) =>
        prev ? { ...prev, isTranscribing: false } : null
      );
    }
  };

  const handleSummarizeDrive = async () => {
    if (!transcriptionDialog?.transcript) return;
    setIsSummarizingDrive(true);
    try {
      const res = await fetch("/api/ai/summarize-transcript", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript: transcriptionDialog.transcript }),
      });
      if (!res.ok) throw new Error("Falha ao gerar resumo");
      const json = (await res.json()) as { summary?: string };
      setTranscriptionDialog((prev) =>
        prev ? { ...prev, summary: json.summary ?? "" } : null
      );
    } catch {
      toast.error("Não foi possível gerar o resumo.");
    } finally {
      setIsSummarizingDrive(false);
    }
  };

  const currentAtribuicao = DRIVE_ATRIBUICOES.find(a => a.id === selectedAtribuicao) || DRIVE_ATRIBUICOES[0];
  const atribuicaoFolderId = currentAtribuicao.folderId;

  // Queries
  const { data: configStatus, isLoading: isCheckingConfig } = trpc.drive.isConfigured.useQuery();

  const { data: stats } = trpc.drive.stats.useQuery(undefined, {
    enabled: configStatus?.configured === true,
  });

  const { data: detailedStats } = trpc.drive.statsDetailed.useQuery(
    { folderId: atribuicaoFolderId },
    { enabled: configStatus?.configured === true && activeTab === "metrics" }
  );

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

  const { data: timelineData } = trpc.drive.timeline.useQuery(
    { folderId: atribuicaoFolderId },
    { enabled: configStatus?.configured === true && activeTab === "timeline" }
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

  // Mostrar sidebar ao navegar para pasta de assistido
  useEffect(() => {
    if (navigationStack.length > 0) {
      setShowAssistidoSidebar(true);
    }
  }, [navigationStack]);

  // Loading state
  if (isCheckingConfig) {
    return (
      <div className="min-h-screen bg-zinc-100 dark:bg-[#0f0f11]">
        <div className="px-4 md:px-6 py-4 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
          <Skeleton className="h-12 w-48" />
        </div>
        <div className="p-4 md:p-6 space-y-4">
          <Skeleton className="h-20 w-full rounded-xl" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
          </div>
          <Skeleton className="h-[400px] w-full rounded-xl" />
        </div>
      </div>
    );
  }

  if (!configStatus?.configured) {
    return (
      <div className="min-h-screen bg-zinc-100 dark:bg-[#0f0f11]">
        <div className="px-4 md:px-6 py-4 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-zinc-900 dark:bg-white flex items-center justify-center">
              <FolderOpen className="w-5 h-5 text-white dark:text-zinc-900" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">Drive</h1>
              <p className="text-xs text-zinc-500">Gestão de documentos</p>
            </div>
          </div>
        </div>
        <EmptyDriveState />
      </div>
    );
  }

  const files = filesData?.files || [];
  const currentFolderId = selectedFolderId || atribuicaoFolderId;
  const newFilesCount = files.filter(f => isNewFile(f.lastModifiedTime || f.createdAt)).length;

  // Filtrar por tags
  const filteredFiles = selectedTags.length > 0
    ? files.filter(f => {
        const fileTags = getFileTags(f.description);
        const autoTags = autoDetectTags(f.name);
        const allTags = [...fileTags, ...autoTags];
        return selectedTags.some(t => allTags.includes(t));
      })
    : files;

  // Filtrar por busca
  const displayFiles = filteredFiles.filter(f =>
    !searchTerm || f.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Navegação
  const navigateToFolder = (folderId: string, folderName: string) => {
    setNavigationStack(prev => [...prev, { id: folderId, name: folderName }]);
    setSelectedFolderId(folderId);
  };

  const navigateToBreadcrumb = (index: number) => {
    if (index === -1) {
      setNavigationStack([]);
      setSelectedFolderId(null);
      setShowAssistidoSidebar(false);
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
    if (newStack.length === 0) setShowAssistidoSidebar(false);
  };

  const currentFolderName = navigationStack.length > 0 ? navigationStack[navigationStack.length - 1].name : "";

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
              <p className="text-xs text-zinc-500 truncate">Gestão de documentos • {stats?.totalFiles || 0} arquivos</p>
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
              disabled={syncMutation.isPending}
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
      <div className="flex">
        <div className="flex-1 p-4 md:p-6 space-y-4 min-w-0 max-w-full overflow-hidden">
          {/* Seletor de Atribuição */}
          <Card className="p-4">
            <p className="text-xs font-medium text-zinc-500 mb-3 uppercase tracking-wider">Selecione a Atribuição</p>
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
                      setShowAssistidoSidebar(false);
                    }}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all",
                      isSelected
                        ? `${atrib.colors.bg} ${atrib.colors.text} ring-1 ${atrib.colors.ring}`
                        : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-700"
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

          {/* Tabs: Arquivos | Timeline | Métricas */}
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
            <TabsList className="grid w-full grid-cols-3 max-w-md">
              <TabsTrigger value="files" className="text-xs">
                <FolderOpen className="w-4 h-4 mr-1.5" />Arquivos
              </TabsTrigger>
              <TabsTrigger value="timeline" className="text-xs">
                <History className="w-4 h-4 mr-1.5" />Timeline
              </TabsTrigger>
              <TabsTrigger value="metrics" className="text-xs">
                <BarChart3 className="w-4 h-4 mr-1.5" />Métricas
              </TabsTrigger>
            </TabsList>

            {/* Tab: Arquivos */}
            <TabsContent value="files" className="mt-4 space-y-4">
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
                        className="ml-auto flex items-center gap-1 px-2 py-1 rounded-md bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-400 text-xs font-medium flex-shrink-0"
                      >
                        <ChevronRight className="w-3.5 h-3.5 rotate-180" />Voltar
                      </button>
                    )}
                  </div>
                </Card>
              )}

              {/* Toolbar com Filtros */}
              <Card className="p-3">
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                    <Input
                      placeholder="Buscar arquivos..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-9 h-10 bg-zinc-50 dark:bg-zinc-800 border-0"
                    />
                  </div>

                  {/* Filtro de Tags */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" className="h-10">
                        <Tag className="w-4 h-4 mr-2" />
                        Tags
                        {selectedTags.length > 0 && (
                          <Badge className="ml-2 h-5 px-1.5 bg-emerald-500 text-white">{selectedTags.length}</Badge>
                        )}
                        <ChevronDown className="w-4 h-4 ml-2" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      {DOCUMENT_TAGS.map(tag => (
                        <DropdownMenuCheckboxItem
                          key={tag.id}
                          checked={selectedTags.includes(tag.id)}
                          onCheckedChange={(checked) => {
                            setSelectedTags(prev =>
                              checked ? [...prev, tag.id] : prev.filter(t => t !== tag.id)
                            );
                          }}
                        >
                          <Badge className={cn("mr-2 text-[10px] text-white", tag.color)}>{tag.label}</Badge>
                        </DropdownMenuCheckboxItem>
                      ))}
                      {selectedTags.length > 0 && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => setSelectedTags([])}>
                            <X className="w-4 h-4 mr-2" />Limpar filtros
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>

                  {/* Toggle View */}
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

              {/* File List */}
              <Card className="overflow-hidden">
                <div className="px-4 py-3 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 flex items-center justify-between">
                  <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    {navigationStack.length > 0 ? navigationStack[navigationStack.length - 1].name : currentAtribuicao.label}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-zinc-500">{displayFiles.length} item{displayFiles.length !== 1 && 's'}</span>
                    {newFilesCount > 0 && (
                      <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 text-[10px]">
                        {newFilesCount} novo{newFilesCount !== 1 && 's'}
                      </Badge>
                    )}
                  </div>
                </div>

                {isLoadingFiles ? (
                  <div className="p-4 space-y-3">
                    {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-14 w-full rounded-lg" />)}
                  </div>
                ) : displayFiles.length === 0 ? (
                  <div className="p-12 text-center">
                    <FolderOpen className="w-16 h-16 mx-auto text-zinc-300 dark:text-zinc-600 mb-4" />
                    <h3 className="text-lg font-semibold text-zinc-700 dark:text-zinc-300 mb-2">Pasta vazia</h3>
                    <p className="text-sm text-zinc-500">Nenhum arquivo encontrado</p>
                  </div>
                ) : viewMode === "list" ? (
                  <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                    {displayFiles.map((file) => {
                      const fileId = file.driveFileId || file.id;
                      const fileMime = file.mimeType ?? "";
                      const isMedia = fileMime.startsWith("audio/") || fileMime.startsWith("video/");
                      return (
                        <FileCard
                          key={fileId}
                          file={{ ...file, id: fileId }}
                          viewMode="list"
                          onPreview={() => { setPreviewFile({ ...file, id: fileId }); setIsPreviewOpen(true); }}
                          onNavigate={navigateToFolder}
                          onTranscribe={isMedia ? () => handleTranscribeDriveFile(fileId, file.name) : undefined}
                        />
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3">
                    {displayFiles.map((file) => {
                      const fileId = file.driveFileId || file.id;
                      const fileMime = file.mimeType ?? "";
                      const isMedia = fileMime.startsWith("audio/") || fileMime.startsWith("video/");
                      return (
                        <FileCard
                          key={fileId}
                          file={{ ...file, id: fileId }}
                          viewMode="grid"
                          onPreview={() => { setPreviewFile({ ...file, id: fileId }); setIsPreviewOpen(true); }}
                          onNavigate={navigateToFolder}
                          onTranscribe={isMedia ? () => handleTranscribeDriveFile(fileId, file.name) : undefined}
                        />
                      );
                    })}
                  </div>
                )}
              </Card>
            </TabsContent>

            {/* Tab: Timeline */}
            <TabsContent value="timeline" className="mt-4">
              <Card className="p-4">
                <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-4 flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Timeline de Documentos
                </h3>

                {!timelineData ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 w-full" />)}
                  </div>
                ) : Object.keys(timelineData.grouped || {}).length === 0 ? (
                  <div className="text-center py-8">
                    <History className="w-12 h-12 mx-auto text-zinc-300 dark:text-zinc-600 mb-3" />
                    <p className="text-sm text-zinc-500">Nenhum documento encontrado</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {Object.entries(timelineData.grouped).map(([period, files]: [string, any[]]) => (
                      <div key={period}>
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-3 h-3 rounded-full bg-emerald-500" />
                          <h4 className="text-sm font-medium text-zinc-600 dark:text-zinc-400 capitalize">{period}</h4>
                          <span className="text-xs text-zinc-400">({files.length} arquivo{files.length !== 1 && 's'})</span>
                        </div>
                        <div className="ml-6 border-l-2 border-zinc-200 dark:border-zinc-700 pl-4 space-y-2">
                          {files.slice(0, 5).map((file: any) => {
                            const fileType = getFileType(file.mimeType);
                            const Icon = FILE_ICONS[fileType] || FILE_ICONS.default;
                            const colorClass = FILE_COLORS[fileType] || FILE_COLORS.default;

                            return (
                              <div
                                key={file.id}
                                className="flex items-center gap-3 p-2 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800/50 cursor-pointer"
                                onClick={() => { setPreviewFile(file); setIsPreviewOpen(true); }}
                              >
                                <Icon className={cn("w-4 h-4 flex-shrink-0", colorClass)} />
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm text-zinc-700 dark:text-zinc-300 truncate">{file.name}</p>
                                  <p className="text-xs text-zinc-500">
                                    {file.lastModifiedTime && format(new Date(file.lastModifiedTime), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                                  </p>
                                </div>
                              </div>
                            );
                          })}
                          {files.length > 5 && (
                            <p className="text-xs text-zinc-400 py-2">+ {files.length - 5} mais arquivos...</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </TabsContent>

            {/* Tab: Métricas */}
            <TabsContent value="metrics" className="mt-4">
              {detailedStats ? (
                <MetricsDashboard stats={detailedStats} />
              ) : (
                <div className="space-y-4">
                  <Skeleton className="h-24 w-full" />
                  <Skeleton className="h-48 w-full" />
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>

        {/* Sidebar do Assistido */}
        {showAssistidoSidebar && currentFolderName && (
          <AssistidoSidebar
            folderName={currentFolderName}
            onClose={() => setShowAssistidoSidebar(false)}
          />
        )}
      </div>

      {/* Preview Modal */}
      <PreviewModal
        file={previewFile}
        isOpen={isPreviewOpen}
        onClose={() => { setIsPreviewOpen(false); setPreviewFile(null); }}
      />

      {/* Transcription Dialog */}
      {transcriptionDialog && (
        <TranscriptViewer
          open={!!transcriptionDialog}
          onOpenChange={(open) => {
            if (!open) setTranscriptionDialog(null);
          }}
          transcript={transcriptionDialog.isTranscribing ? "" : (transcriptionDialog.transcript ?? "")}
          summary={transcriptionDialog.summary}
          title={
            transcriptionDialog.isTranscribing
              ? "Transcrevendo..."
              : `Transcrição — ${transcriptionDialog.fileName}`
          }
          onSummarize={handleSummarizeDrive}
          isSummarizing={isSummarizingDrive || transcriptionDialog.isTranscribing}
        />
      )}
    </div>
  );
}
