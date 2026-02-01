"use client";

import { useState, useMemo, useCallback, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
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
  ChevronDown,
  ChevronUp,
  Home,
  Star,
  Trash2,
  FolderPlus,
  Upload,
  Filter,
  XCircle,
  ArrowUpDown,
  HardDrive,
  Users,
  Scale,
  Folder,
  Copy,
  Share2,
  Edit,
  FileUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useAssignment } from "@/contexts/assignment-context";
import { StatsCard, StatsGrid } from "@/components/shared/stats-card";

// ==========================================
// TIPOS
// ==========================================

interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: number;
  modifiedTime: Date;
  createdAt: Date;
  webViewLink?: string;
  webContentLink?: string;
  thumbnailLink?: string;
  iconLink?: string;
  isFolder: boolean;
  parentId?: string;
  starred?: boolean;
  path?: string;
  // Relacionamentos
  processoId?: number;
  processoNumero?: string;
  assistidoId?: number;
  assistidoNome?: string;
}

interface Breadcrumb {
  id: string;
  name: string;
}

// ==========================================
// CONSTANTES E HELPERS
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
  folder: "text-amber-500",
  document: "text-blue-500",
  pdf: "text-rose-500",
  image: "text-emerald-500",
  video: "text-violet-500",
  audio: "text-pink-500",
  archive: "text-orange-500",
  default: "text-zinc-500",
};

const FILE_BG_COLORS: Record<string, string> = {
  folder: "bg-amber-50 dark:bg-amber-900/20",
  document: "bg-blue-50 dark:bg-blue-900/20",
  pdf: "bg-rose-50 dark:bg-rose-900/20",
  image: "bg-emerald-50 dark:bg-emerald-900/20",
  video: "bg-violet-50 dark:bg-violet-900/20",
  audio: "bg-pink-50 dark:bg-pink-900/20",
  archive: "bg-orange-50 dark:bg-orange-900/20",
  default: "bg-zinc-50 dark:bg-zinc-900/20",
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

function formatFileSize(bytes?: number): string {
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
// DADOS MOCK - Estrutura de pastas
// ==========================================

const MOCK_FILES: DriveFile[] = [
  // Pastas principais
  {
    id: "folder-assistidos",
    name: "Assistidos",
    mimeType: "application/vnd.google-apps.folder",
    modifiedTime: new Date("2026-01-30"),
    createdAt: new Date("2025-06-01"),
    isFolder: true,
  },
  {
    id: "folder-processos",
    name: "Processos",
    mimeType: "application/vnd.google-apps.folder",
    modifiedTime: new Date("2026-01-29"),
    createdAt: new Date("2025-06-01"),
    isFolder: true,
  },
  {
    id: "folder-pautas",
    name: "Pautas de Audiência",
    mimeType: "application/vnd.google-apps.folder",
    modifiedTime: new Date("2026-01-28"),
    createdAt: new Date("2025-06-01"),
    isFolder: true,
  },
  {
    id: "folder-peticoes",
    name: "Petições Protocoladas",
    mimeType: "application/vnd.google-apps.folder",
    modifiedTime: new Date("2026-01-27"),
    createdAt: new Date("2025-06-01"),
    isFolder: true,
  },
  {
    id: "folder-jurisprudencia",
    name: "Jurisprudência",
    mimeType: "application/vnd.google-apps.folder",
    modifiedTime: new Date("2026-01-25"),
    createdAt: new Date("2025-06-01"),
    isFolder: true,
  },
  {
    id: "folder-modelos",
    name: "Modelos e Templates",
    mimeType: "application/vnd.google-apps.folder",
    modifiedTime: new Date("2026-01-20"),
    createdAt: new Date("2025-06-01"),
    isFolder: true,
  },
  // Arquivos recentes
  {
    id: "f1",
    name: "Resposta à Acusação - José Carlos.pdf",
    mimeType: "application/pdf",
    size: 245678,
    modifiedTime: new Date("2026-01-30T10:30:00"),
    createdAt: new Date("2026-01-30T10:30:00"),
    isFolder: false,
    starred: true,
    processoId: 1,
    processoNumero: "8002341-90.2025.8.05.0039",
    assistidoId: 1,
    assistidoNome: "José Carlos Santos",
    parentId: "folder-processos",
  },
  {
    id: "f2",
    name: "Alegações Finais - Pedro Lima.docx",
    mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    size: 156789,
    modifiedTime: new Date("2026-01-29T15:45:00"),
    createdAt: new Date("2026-01-29T15:45:00"),
    isFolder: false,
    processoId: 2,
    processoNumero: "8002342-75.2025.8.05.0039",
    assistidoId: 2,
    assistidoNome: "Pedro Oliveira Lima",
    parentId: "folder-processos",
  },
  {
    id: "f3",
    name: "Pauta Semana 05-2026.pdf",
    mimeType: "application/pdf",
    size: 89456,
    modifiedTime: new Date("2026-01-28T08:00:00"),
    createdAt: new Date("2026-01-28T08:00:00"),
    isFolder: false,
    starred: true,
    parentId: "folder-pautas",
  },
  {
    id: "f4",
    name: "RG - Maria Silva.jpg",
    mimeType: "image/jpeg",
    size: 2345678,
    modifiedTime: new Date("2026-01-27T14:20:00"),
    createdAt: new Date("2026-01-27T14:20:00"),
    isFolder: false,
    assistidoId: 3,
    assistidoNome: "Maria Aparecida Silva",
    parentId: "folder-assistidos",
  },
  {
    id: "f5",
    name: "Habeas Corpus - Fernando.pdf",
    mimeType: "application/pdf",
    size: 178934,
    modifiedTime: new Date("2026-01-26T09:15:00"),
    createdAt: new Date("2026-01-26T09:15:00"),
    isFolder: false,
    processoId: 7,
    processoNumero: "8000800-20.2024.8.05.0039",
    assistidoId: 7,
    assistidoNome: "Fernando Costa",
    parentId: "folder-peticoes",
  },
  {
    id: "f6",
    name: "Gravação Audiência 10-01.mp4",
    mimeType: "video/mp4",
    size: 156789012,
    modifiedTime: new Date("2026-01-25T16:00:00"),
    createdAt: new Date("2026-01-25T16:00:00"),
    isFolder: false,
    parentId: "folder-pautas",
  },
  {
    id: "f7",
    name: "Jurisprudência STJ - Tráfico.zip",
    mimeType: "application/zip",
    size: 45678901,
    modifiedTime: new Date("2026-01-24T11:30:00"),
    createdAt: new Date("2026-01-24T11:30:00"),
    isFolder: false,
    parentId: "folder-jurisprudencia",
  },
  {
    id: "f8",
    name: "Modelo Alegações Finais Júri.docx",
    mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    size: 67890,
    modifiedTime: new Date("2026-01-23T10:00:00"),
    createdAt: new Date("2026-01-23T10:00:00"),
    isFolder: false,
    starred: true,
    parentId: "folder-modelos",
  },
];

// ==========================================
// COMPONENTES
// ==========================================

function FileCard({ 
  file, 
  viewMode,
  onPreview,
  onNavigate,
}: { 
  file: DriveFile;
  viewMode: "grid" | "list";
  onPreview: (file: DriveFile) => void;
  onNavigate: (folderId: string) => void;
}) {
  const [copied, setCopied] = useState(false);
  const fileType = getFileType(file.mimeType);
  const Icon = FILE_ICONS[fileType] || FILE_ICONS.default;
  const colorClass = FILE_COLORS[fileType] || FILE_COLORS.default;
  const bgClass = FILE_BG_COLORS[fileType] || FILE_BG_COLORS.default;

  const handleClick = () => {
    if (file.isFolder) {
      onNavigate(file.id);
    } else {
      onPreview(file);
    }
  };

  if (viewMode === "list") {
    return (
      <div 
        className="flex items-center gap-4 p-3 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors cursor-pointer group border-b border-zinc-100 dark:border-zinc-800 last:border-0"
        onClick={handleClick}
      >
        <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", bgClass)}>
          <Icon className={cn("w-5 h-5", colorClass)} />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate group-hover:text-emerald-600 transition-colors">
              {file.name}
            </h4>
            {file.starred && (
              <Star className="w-3 h-3 text-amber-500 fill-amber-500 flex-shrink-0" />
            )}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            {file.assistidoNome && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                {file.assistidoNome}
              </Badge>
            )}
            {file.processoNumero && (
              <span className="text-[10px] font-mono text-zinc-400 truncate">
                {file.processoNumero}
              </span>
            )}
          </div>
        </div>

        <div className="text-right text-xs text-zinc-500 flex-shrink-0 hidden md:block">
          <p>{formatFileSize(file.size)}</p>
          <p>{formatDistanceToNow(file.modifiedTime, { locale: ptBR, addSuffix: true })}</p>
        </div>

        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          {!file.isFolder && (
            <>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-zinc-400 hover:text-zinc-600">
                    <Download className="w-3.5 h-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-[10px]">Download</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-zinc-400 hover:text-zinc-600">
                    <Share2 className="w-3.5 h-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-[10px]">Compartilhar</TooltipContent>
              </Tooltip>
            </>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-zinc-400 hover:text-zinc-600">
                <MoreHorizontal className="w-3.5 h-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem>
                <Eye className="w-4 h-4 mr-2" />
                Visualizar
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Download className="w-4 h-4 mr-2" />
                Download
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Copy className="w-4 h-4 mr-2" />
                Copiar link
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <Edit className="w-4 h-4 mr-2" />
                Renomear
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Star className="w-4 h-4 mr-2" />
                {file.starred ? "Remover favorito" : "Adicionar favorito"}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-rose-600">
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
    <Card 
      className="group cursor-pointer hover:shadow-lg hover:border-zinc-300 dark:hover:border-zinc-600 transition-all overflow-hidden"
      onClick={handleClick}
    >
      {/* Preview Area */}
      <div className={cn(
        "h-28 flex items-center justify-center relative",
        bgClass
      )}>
        {file.thumbnailLink && !file.isFolder ? (
          <Image
            src={file.thumbnailLink}
            alt={file.name}
            fill
            sizes="(max-width: 768px) 100vw, 320px"
            className="object-cover"
            unoptimized
          />
        ) : (
          <Icon className={cn("w-10 h-10", colorClass)} />
        )}
        
        {/* Hover Overlay */}
        {!file.isFolder && (
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button size="sm" variant="secondary" className="h-8 w-8 p-0" onClick={(e) => { e.stopPropagation(); onPreview(file); }}>
                  <Eye className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Visualizar</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button size="sm" variant="secondary" className="h-8 w-8 p-0" onClick={(e) => e.stopPropagation()}>
                  <Download className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Download</TooltipContent>
            </Tooltip>
          </div>
        )}

        {/* Star Badge */}
        {file.starred && (
          <div className="absolute top-2 right-2">
            <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3">
        <h4 className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate mb-1 group-hover:text-emerald-600 transition-colors">
          {file.name}
        </h4>
        <div className="flex items-center justify-between text-[10px] text-zinc-500">
          <span>{file.isFolder ? "Pasta" : formatFileSize(file.size)}</span>
          <span>{formatDistanceToNow(file.modifiedTime, { locale: ptBR, addSuffix: true })}</span>
        </div>
        
        {/* Assistido Badge */}
        {file.assistidoNome && (
          <Badge variant="secondary" className="mt-2 text-[10px] truncate max-w-full px-1.5 py-0">
            {file.assistidoNome}
          </Badge>
        )}
      </div>
    </Card>
  );
}

function PreviewDialog({ 
  file, 
  open, 
  onClose 
}: { 
  file: DriveFile | null; 
  open: boolean; 
  onClose: () => void;
}) {
  if (!file) return null;

  const fileType = getFileType(file.mimeType);
  const Icon = FILE_ICONS[fileType] || FILE_ICONS.default;
  const colorClass = FILE_COLORS[fileType] || FILE_COLORS.default;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <Icon className={cn("w-5 h-5", colorClass)} />
            <span className="truncate">{file.name}</span>
          </DialogTitle>
          <DialogDescription>
            {formatFileSize(file.size)} • Modificado {formatDistanceToNow(file.modifiedTime, { locale: ptBR, addSuffix: true })}
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex-1 min-h-[400px] bg-zinc-100 dark:bg-zinc-900 rounded-lg flex items-center justify-center">
          {file.thumbnailLink ? (
            <Image
              src={file.thumbnailLink}
              alt={file.name}
              width={960}
              height={540}
              sizes="(max-width: 1024px) 100vw, 960px"
              className="max-w-full max-h-full object-contain"
              unoptimized
            />
          ) : (
            <div className="text-center">
              <Icon className={cn("w-16 h-16 mx-auto mb-4", colorClass)} />
              <p className="text-zinc-500 mb-4">Preview não disponível para este tipo de arquivo</p>
              <Button variant="outline">
                <ExternalLink className="w-4 h-4 mr-2" />
                Abrir externamente
              </Button>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between pt-4 border-t">
          <div className="flex items-center gap-3">
            {file.assistidoNome && (
              <Link href={`/admin/assistidos/${file.assistidoId}`}>
                <Badge variant="outline" className="hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer">
                  <Users className="w-3 h-3 mr-1" />
                  {file.assistidoNome}
                </Badge>
              </Link>
            )}
            {file.processoNumero && (
              <Link href={`/admin/processos/${file.processoId}`}>
                <Badge variant="outline" className="hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer font-mono text-[10px]">
                  <Scale className="w-3 h-3 mr-1" />
                  {file.processoNumero}
                </Badge>
              </Link>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Download
            </Button>
            <Button size="sm">
              <ExternalLink className="w-4 h-4 mr-2" />
              Abrir
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function UploadDialog({ 
  open, 
  onClose,
  currentFolder,
}: { 
  open: boolean; 
  onClose: () => void;
  currentFolder: string | null;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      // Handle file upload
      console.log("Files dropped:", e.dataTransfer.files);
    }
  }, []);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5 text-emerald-600" />
            Upload de Arquivos
          </DialogTitle>
          <DialogDescription>
            Arraste arquivos ou clique para selecionar
          </DialogDescription>
        </DialogHeader>
        
        <div 
          className={cn(
            "border-2 border-dashed rounded-lg p-8 text-center transition-colors",
            dragActive 
              ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20" 
              : "border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600"
          )}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <input 
            ref={fileInputRef}
            type="file" 
            multiple 
            className="hidden" 
            onChange={(e) => {
              if (e.target.files) {
                console.log("Files selected:", e.target.files);
              }
            }}
          />
          <FileUp className={cn(
            "w-12 h-12 mx-auto mb-4",
            dragActive ? "text-emerald-500" : "text-zinc-400"
          )} />
          <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-2">
            Arraste arquivos aqui ou clique para selecionar
          </p>
          <p className="text-xs text-zinc-400">
            PDF, DOC, DOCX, JPG, PNG, MP4 • Máx. 50MB
          </p>
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button className="bg-emerald-600 hover:bg-emerald-700">
            <Upload className="w-4 h-4 mr-2" />
            Fazer Upload
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function NewFolderDialog({ 
  open, 
  onClose,
  currentFolder,
}: { 
  open: boolean; 
  onClose: () => void;
  currentFolder: string | null;
}) {
  const [folderName, setFolderName] = useState("");

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderPlus className="w-5 h-5 text-amber-500" />
            Nova Pasta
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <Input 
            placeholder="Nome da pasta" 
            value={folderName}
            onChange={(e) => setFolderName(e.target.value)}
            autoFocus
          />
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button 
            className="bg-emerald-600 hover:bg-emerald-700"
            disabled={!folderName.trim()}
          >
            <FolderPlus className="w-4 h-4 mr-2" />
            Criar Pasta
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ==========================================
// PÁGINA PRINCIPAL
// ==========================================

export default function DrivePage() {
  const { config } = useAssignment();
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"name" | "date" | "size">("date");
  const [previewFile, setPreviewFile] = useState<DriveFile | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [newFolderOpen, setNewFolderOpen] = useState(false);
  const [currentFolder, setCurrentFolder] = useState<string | null>(null);
  const [breadcrumbs, setBreadcrumbs] = useState<Breadcrumb[]>([{ id: "root", name: "Meu Drive" }]);

  // Navegação
  const navigateToFolder = useCallback((folderId: string) => {
    const folder = MOCK_FILES.find(f => f.id === folderId);
    if (folder) {
      setCurrentFolder(folderId);
      setBreadcrumbs(prev => [...prev, { id: folderId, name: folder.name }]);
    }
  }, []);

  const navigateToBreadcrumb = useCallback((index: number) => {
    if (index === 0) {
      setCurrentFolder(null);
      setBreadcrumbs([{ id: "root", name: "Meu Drive" }]);
    } else {
      const crumb = breadcrumbs[index];
      setCurrentFolder(crumb.id);
      setBreadcrumbs(prev => prev.slice(0, index + 1));
    }
  }, [breadcrumbs]);

  // Filtrar arquivos
  const filteredFiles = useMemo(() => {
    let result = MOCK_FILES.filter((file) => {
      // Mostrar apenas itens da pasta atual
      if (currentFolder === null) {
        // Root: mostrar apenas pastas principais e arquivos sem parentId
        return !file.parentId;
      } else {
        // Dentro de pasta: mostrar apenas filhos
        return file.parentId === currentFolder;
      }
    });

    // Busca
    if (searchTerm) {
      result = MOCK_FILES.filter(file =>
        file.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        file.assistidoNome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        file.processoNumero?.includes(searchTerm)
      );
    }

    // Filtro por tipo
    if (filterType !== "all") {
      if (filterType === "starred") {
        result = result.filter(f => f.starred);
      } else if (filterType === "folder") {
        result = result.filter(f => f.isFolder);
      } else {
        result = result.filter(f => getFileType(f.mimeType) === filterType);
      }
    }

    // Ordenação
    result.sort((a, b) => {
      // Pastas primeiro
      if (a.isFolder && !b.isFolder) return -1;
      if (!a.isFolder && b.isFolder) return 1;

      switch (sortBy) {
        case "name":
          return a.name.localeCompare(b.name);
        case "size":
          return (b.size || 0) - (a.size || 0);
        case "date":
        default:
          return new Date(b.modifiedTime).getTime() - new Date(a.modifiedTime).getTime();
      }
    });

    return result;
  }, [currentFolder, searchTerm, filterType, sortBy]);

  const handlePreview = (file: DriveFile) => {
    setPreviewFile(file);
    setPreviewOpen(true);
  };

  // Stats
  const stats = useMemo(() => ({
    total: MOCK_FILES.filter(f => !f.isFolder).length,
    folders: MOCK_FILES.filter(f => f.isFolder).length,
    starred: MOCK_FILES.filter(f => f.starred).length,
    totalSize: MOCK_FILES.reduce((acc, f) => acc + (f.size || 0), 0),
  }), []);

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-zinc-100 dark:bg-[#0f0f11]">
        {/* Sub-header */}
        <div className="px-4 md:px-6 py-3 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
                <HardDrive className="w-4 h-4 text-white" />
              </div>
              <div>
                <h1 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Drive</h1>
                <p className="text-[10px] text-zinc-500">{stats.total} arquivos • {formatFileSize(stats.totalSize)}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm"
                className="h-8 px-3 text-xs"
                onClick={() => setNewFolderOpen(true)}
              >
                <FolderPlus className="w-3.5 h-3.5 mr-1.5" />
                Nova Pasta
              </Button>
              <Button 
                size="sm"
                className="h-8 px-3 text-xs bg-emerald-600 hover:bg-emerald-700"
                onClick={() => setUploadOpen(true)}
              >
                <Upload className="w-3.5 h-3.5 mr-1.5" />
                Upload
              </Button>
            </div>
          </div>
        </div>

        {/* Conteúdo Principal */}
        <div className="p-4 md:p-6 space-y-6">
          {/* Stats Cards */}
          <StatsGrid columns={4}>
            <StatsCard
              title="Arquivos"
              value={stats.total}
              icon={File}
              trend={{ value: formatFileSize(stats.totalSize), label: "total" }}
            />
            <StatsCard
              title="Pastas"
              value={stats.folders}
              icon={Folder}
            />
            <StatsCard
              title="Favoritos"
              value={stats.starred}
              icon={Star}
              iconColor="text-amber-500"
            />
            <StatsCard
              title="Recentes"
              value={MOCK_FILES.filter(f => !f.isFolder && new Date(f.modifiedTime) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)).length}
              icon={Clock}
              description="últimos 7 dias"
            />
          </StatsGrid>

          {/* Breadcrumbs + Filtros */}
          <Card className="overflow-hidden">
            <div className="px-4 py-3 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">
              <div className="flex items-center justify-between flex-wrap gap-3">
                {/* Breadcrumbs */}
                <div className="flex items-center gap-1 text-sm">
                  {breadcrumbs.map((crumb, index) => (
                    <div key={crumb.id} className="flex items-center">
                      {index > 0 && <ChevronRight className="w-4 h-4 text-zinc-400 mx-1" />}
                      <button 
                        className={cn(
                          "px-2 py-1 rounded-md transition-colors",
                          index === breadcrumbs.length - 1 
                            ? "text-zinc-900 dark:text-zinc-100 font-medium" 
                            : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                        )}
                        onClick={() => navigateToBreadcrumb(index)}
                      >
                        {index === 0 && <Home className="w-4 h-4 inline mr-1" />}
                        {crumb.name}
                      </button>
                    </div>
                  ))}
                </div>

                {/* Controles */}
                <div className="flex items-center gap-2">
                  {/* Search */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                    <Input
                      placeholder="Buscar arquivos..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-9 w-48 h-8 text-sm"
                    />
                    {searchTerm && (
                      <button 
                        className="absolute right-3 top-1/2 -translate-y-1/2"
                        onClick={() => setSearchTerm("")}
                      >
                        <XCircle className="w-4 h-4 text-zinc-400 hover:text-zinc-600" />
                      </button>
                    )}
                  </div>

                  {/* Filter */}
                  <Select value={filterType} onValueChange={setFilterType}>
                    <SelectTrigger className="w-32 h-8 text-xs">
                      <Filter className="w-3.5 h-3.5 mr-1.5" />
                      <SelectValue placeholder="Filtrar" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="starred">Favoritos</SelectItem>
                      <SelectItem value="folder">Pastas</SelectItem>
                      <SelectItem value="pdf">PDFs</SelectItem>
                      <SelectItem value="document">Documentos</SelectItem>
                      <SelectItem value="image">Imagens</SelectItem>
                      <SelectItem value="video">Vídeos</SelectItem>
                    </SelectContent>
                  </Select>

                  {/* Sort */}
                  <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
                    <SelectTrigger className="w-28 h-8 text-xs">
                      <ArrowUpDown className="w-3.5 h-3.5 mr-1.5" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="date">Data</SelectItem>
                      <SelectItem value="name">Nome</SelectItem>
                      <SelectItem value="size">Tamanho</SelectItem>
                    </SelectContent>
                  </Select>

                  {/* View Toggle */}
                  <div className="flex items-center gap-0.5 bg-zinc-100 dark:bg-zinc-800 rounded-md p-0.5">
                    <Button
                      variant="ghost"
                      size="sm"
                      className={cn("h-7 w-7 p-0", viewMode === "grid" && "bg-white dark:bg-zinc-700 shadow-sm")}
                      onClick={() => setViewMode("grid")}
                    >
                      <LayoutGrid className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className={cn("h-7 w-7 p-0", viewMode === "list" && "bg-white dark:bg-zinc-700 shadow-sm")}
                      onClick={() => setViewMode("list")}
                    >
                      <List className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Files Content */}
            <div className="p-4">
              {filteredFiles.length === 0 ? (
                <div className="text-center py-12">
                  <FolderOpen className="w-12 h-12 mx-auto text-zinc-300 dark:text-zinc-600 mb-4" />
                  <h3 className="text-lg font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                    {searchTerm ? "Nenhum arquivo encontrado" : "Pasta vazia"}
                  </h3>
                  <p className="text-sm text-zinc-500 mb-4">
                    {searchTerm ? "Tente ajustar os filtros de busca." : "Faça upload de arquivos ou crie uma nova pasta."}
                  </p>
                  <div className="flex items-center justify-center gap-2">
                    <Button variant="outline" onClick={() => setNewFolderOpen(true)}>
                      <FolderPlus className="w-4 h-4 mr-2" />
                      Nova Pasta
                    </Button>
                    <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => setUploadOpen(true)}>
                      <Upload className="w-4 h-4 mr-2" />
                      Upload
                    </Button>
                  </div>
                </div>
              ) : viewMode === "grid" ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                  {filteredFiles.map((file) => (
                    <FileCard 
                      key={file.id} 
                      file={file} 
                      viewMode="grid"
                      onPreview={handlePreview}
                      onNavigate={navigateToFolder}
                    />
                  ))}
                </div>
              ) : (
                <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {filteredFiles.map((file) => (
                    <FileCard 
                      key={file.id} 
                      file={file} 
                      viewMode="list"
                      onPreview={handlePreview}
                      onNavigate={navigateToFolder}
                    />
                  ))}
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Dialogs */}
        <PreviewDialog 
          file={previewFile} 
          open={previewOpen} 
          onClose={() => setPreviewOpen(false)} 
        />
        <UploadDialog
          open={uploadOpen}
          onClose={() => setUploadOpen(false)}
          currentFolder={currentFolder}
        />
        <NewFolderDialog
          open={newFolderOpen}
          onClose={() => setNewFolderOpen(false)}
          currentFolder={currentFolder}
        />
      </div>
    </TooltipProvider>
  );
}
