"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
} from "@/components/ui/dialog";
import {
  FolderOpen,
  File,
  FileText,
  ImageIcon,
  Film,
  Music,
  Archive,
  Search,
  Grid3X3,
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
  Filter,
  SortAsc,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useAssignment } from "@/contexts/assignment-context";

// ==========================================
// TIPOS
// ==========================================

interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: number;
  modifiedTime: Date;
  webViewLink?: string;
  webContentLink?: string;
  thumbnailLink?: string;
  iconLink?: string;
  isFolder: boolean;
  parentId?: string;
  starred?: boolean;
  // Relacionamentos
  processoId?: number;
  processoNumero?: string;
  assistidoId?: number;
  assistidoNome?: string;
}

interface DriveFolder {
  id: string;
  name: string;
  filesCount: number;
  color?: string;
}

// ==========================================
// CONSTANTES
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
// DADOS MOCK
// ==========================================

const MOCK_FOLDERS: DriveFolder[] = [
  { id: "1", name: "Processos Ativos", filesCount: 45, color: "emerald" },
  { id: "2", name: "Pautas de Audiência", filesCount: 12, color: "blue" },
  { id: "3", name: "Petições Protocoladas", filesCount: 89, color: "violet" },
  { id: "4", name: "Documentos Pessoais", filesCount: 23, color: "amber" },
  { id: "5", name: "Jurisprudência", filesCount: 156, color: "rose" },
];

const MOCK_FILES: DriveFile[] = [
  {
    id: "f1",
    name: "Resposta à Acusação - José Carlos.pdf",
    mimeType: "application/pdf",
    size: 245678,
    modifiedTime: new Date("2026-01-15T10:30:00"),
    isFolder: false,
    starred: true,
    processoId: 1,
    processoNumero: "8002341-90.2025.8.05.0039",
    assistidoId: 1,
    assistidoNome: "José Carlos Santos",
  },
  {
    id: "f2",
    name: "Alegações Finais - Pedro Lima.docx",
    mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    size: 156789,
    modifiedTime: new Date("2026-01-14T15:45:00"),
    isFolder: false,
    processoId: 2,
    processoNumero: "8002342-75.2025.8.05.0039",
    assistidoId: 2,
    assistidoNome: "Pedro Oliveira Lima",
  },
  {
    id: "f3",
    name: "Pauta Semana 03-2026.pdf",
    mimeType: "application/pdf",
    size: 89456,
    modifiedTime: new Date("2026-01-13T08:00:00"),
    isFolder: false,
    starred: true,
  },
  {
    id: "f4",
    name: "RG - Maria Silva.jpg",
    mimeType: "image/jpeg",
    size: 2345678,
    modifiedTime: new Date("2026-01-12T14:20:00"),
    isFolder: false,
    assistidoId: 3,
    assistidoNome: "Maria Aparecida Silva",
  },
  {
    id: "f5",
    name: "Habeas Corpus - Fernando.pdf",
    mimeType: "application/pdf",
    size: 178934,
    modifiedTime: new Date("2026-01-11T09:15:00"),
    isFolder: false,
    processoId: 7,
    processoNumero: "8000800-20.2024.8.05.0039",
    assistidoId: 7,
    assistidoNome: "Fernando Costa",
  },
  {
    id: "f6",
    name: "Gravação Audiência 10-01.mp4",
    mimeType: "video/mp4",
    size: 156789012,
    modifiedTime: new Date("2026-01-10T16:00:00"),
    isFolder: false,
  },
  {
    id: "f7",
    name: "Jurisprudência STJ - Tráfico.zip",
    mimeType: "application/zip",
    size: 45678901,
    modifiedTime: new Date("2026-01-09T11:30:00"),
    isFolder: false,
  },
  {
    id: "f8",
    name: "Modelo Alegações Finais Júri.docx",
    mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    size: 67890,
    modifiedTime: new Date("2026-01-08T10:00:00"),
    isFolder: false,
    starred: true,
  },
];

// ==========================================
// COMPONENTES
// ==========================================

function FolderCard({ folder }: { folder: DriveFolder }) {
  const colorMap: Record<string, string> = {
    emerald: "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400",
    blue: "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400",
    violet: "bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400",
    amber: "bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400",
    rose: "bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400",
  };

  return (
    <Card className="p-4 cursor-pointer hover:shadow-lg hover:border-zinc-300 dark:hover:border-zinc-600 transition-all group">
      <div className="flex items-center gap-3 mb-3">
        <div className={cn("p-2 rounded-lg", colorMap[folder.color || "blue"])}>
          <FolderOpen className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-zinc-900 dark:text-zinc-100 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
            {folder.name}
          </h3>
          <p className="text-xs text-zinc-500">
            {folder.filesCount} arquivos
          </p>
        </div>
        <ChevronRight className="w-4 h-4 text-zinc-300 group-hover:text-zinc-500 transition-colors" />
      </div>
    </Card>
  );
}

function FileGridItem({ 
  file, 
  onPreview 
}: { 
  file: DriveFile; 
  onPreview: (file: DriveFile) => void;
}) {
  const fileType = getFileType(file.mimeType);
  const Icon = FILE_ICONS[fileType] || FILE_ICONS.default;
  const colorClass = FILE_COLORS[fileType] || FILE_COLORS.default;

  return (
    <Card className="group cursor-pointer hover:shadow-lg hover:border-zinc-300 dark:hover:border-zinc-600 transition-all overflow-hidden">
      {/* Preview Area */}
      <div 
        className="h-32 bg-zinc-50 dark:bg-zinc-900 flex items-center justify-center relative"
        onClick={() => onPreview(file)}
      >
        {file.thumbnailLink ? (
          <Image
            src={file.thumbnailLink}
            alt={file.name}
            fill
            sizes="(max-width: 768px) 100vw, 320px"
            className="object-cover"
            unoptimized
          />
        ) : (
          <Icon className={cn("w-12 h-12", colorClass)} />
        )}
        
        {/* Hover Overlay */}
        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button size="sm" variant="secondary" className="h-8 w-8 p-0">
                <Eye className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Visualizar</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button size="sm" variant="secondary" className="h-8 w-8 p-0">
                <Download className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Download</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button size="sm" variant="secondary" className="h-8 w-8 p-0">
                <ExternalLink className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Abrir no Drive</TooltipContent>
          </Tooltip>
        </div>

        {/* Star Badge */}
        {file.starred && (
          <div className="absolute top-2 right-2">
            <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3">
        <h4 className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate mb-1">
          {file.name}
        </h4>
        <div className="flex items-center justify-between text-xs text-zinc-500">
          <span>{formatFileSize(file.size)}</span>
          <span>{format(file.modifiedTime, "dd/MM/yy", { locale: ptBR })}</span>
        </div>
        
        {/* Processo/Assistido Badge */}
        {file.assistidoNome && (
          <Badge variant="secondary" className="mt-2 text-xs truncate max-w-full">
            {file.assistidoNome}
          </Badge>
        )}
      </div>
    </Card>
  );
}

function FileListItem({ 
  file, 
  onPreview 
}: { 
  file: DriveFile; 
  onPreview: (file: DriveFile) => void;
}) {
  const fileType = getFileType(file.mimeType);
  const Icon = FILE_ICONS[fileType] || FILE_ICONS.default;
  const colorClass = FILE_COLORS[fileType] || FILE_COLORS.default;

  return (
    <div 
      className="flex items-center gap-4 p-3 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors cursor-pointer group"
      onClick={() => onPreview(file)}
    >
      <Icon className={cn("w-8 h-8 flex-shrink-0", colorClass)} />
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h4 className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">
            {file.name}
          </h4>
          {file.starred && (
            <Star className="w-3 h-3 text-amber-500 fill-amber-500 flex-shrink-0" />
          )}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          {file.assistidoNome && (
            <Badge variant="secondary" className="text-xs">
              {file.assistidoNome}
            </Badge>
          )}
          {file.processoNumero && (
            <span className="text-xs font-mono text-zinc-400 truncate">
              {file.processoNumero}
            </span>
          )}
        </div>
      </div>

      <div className="text-right text-xs text-zinc-500 flex-shrink-0">
        <p>{formatFileSize(file.size)}</p>
        <p>{format(file.modifiedTime, "dd/MM/yy HH:mm", { locale: ptBR })}</p>
      </div>

      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
          <Eye className="w-4 h-4" />
        </Button>
        <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
          <Download className="w-4 h-4" />
        </Button>
        <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
          <MoreHorizontal className="w-4 h-4" />
        </Button>
      </div>
    </div>
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
            {file.name}
          </DialogTitle>
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
              <p className="text-zinc-500">Preview não disponível</p>
              <Button className="mt-4" variant="outline">
                <ExternalLink className="w-4 h-4 mr-2" />
                Abrir no Google Drive
              </Button>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between pt-4 border-t">
          <div className="text-sm text-zinc-500">
            <span>{formatFileSize(file.size)}</span>
            <span className="mx-2">•</span>
            <span>Modificado em {format(file.modifiedTime, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Download
            </Button>
            <Button>
              <ExternalLink className="w-4 h-4 mr-2" />
              Abrir no Drive
            </Button>
          </div>
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
  const [previewFile, setPreviewFile] = useState<DriveFile | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  const filteredFiles = useMemo(() => {
    return MOCK_FILES.filter((file) => {
      const matchesSearch = 
        !searchTerm ||
        file.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        file.assistidoNome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        file.processoNumero?.includes(searchTerm);

      const matchesType = 
        filterType === "all" ||
        (filterType === "starred" && file.starred) ||
        getFileType(file.mimeType) === filterType;

      return matchesSearch && matchesType;
    });
  }, [searchTerm, filterType]);

  const handlePreview = (file: DriveFile) => {
    setPreviewFile(file);
    setPreviewOpen(true);
  };

  // Stats
  const stats = {
    total: MOCK_FILES.length,
    starred: MOCK_FILES.filter(f => f.starred).length,
    totalSize: MOCK_FILES.reduce((acc, f) => acc + (f.size || 0), 0),
  };

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-zinc-100 dark:bg-[#0f0f11]">
        {/* Sub-header unificado */}
        <div className="px-4 md:px-6 py-3 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-md bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center border border-zinc-200 dark:border-zinc-700">
                <FolderOpen className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500" />
              </div>
              <span className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
                {stats.total} arquivos • {formatFileSize(stats.totalSize)}
              </span>
            </div>
            
            <div className="flex items-center gap-0.5">
              <Button 
                variant="ghost" 
                size="sm"
                className="h-7 w-7 p-0 text-zinc-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                title="Sincronizar"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </Button>
              <Button 
                size="sm"
                className="h-7 px-2.5 ml-1.5 bg-zinc-800 hover:bg-emerald-600 dark:bg-zinc-700 dark:hover:bg-emerald-600 text-white text-xs font-medium rounded-md transition-colors"
              >
                <Upload className="w-3.5 h-3.5 mr-1" />
                Upload
              </Button>
            </div>
          </div>
        </div>

        {/* Conteúdo Principal */}
        <div className="p-4 md:p-6 space-y-4 md:space-y-6">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm">
            <Button variant="ghost" size="sm" className="h-7 px-2 text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300">
              <Home className="w-4 h-4" />
            </Button>
            <ChevronRight className="w-4 h-4 text-zinc-400" />
            <Button variant="ghost" size="sm" className="h-7 px-2 text-zinc-500">
              Meu Drive
            </Button>
          </div>

        {/* Quick Access Folders */}
        <div>
          <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-3">
            Pastas
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {MOCK_FOLDERS.map((folder) => (
              <FolderCard key={folder.id} folder={folder} />
            ))}
          </div>
        </div>

        {/* Files Section */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
              Arquivos Recentes
            </h2>
            
            <div className="flex items-center gap-3">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                <Input
                  placeholder="Buscar arquivos..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-64"
                />
              </div>

              {/* Filter */}
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-[140px]">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Filtrar" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="starred">Favoritos</SelectItem>
                  <SelectItem value="pdf">PDFs</SelectItem>
                  <SelectItem value="document">Documentos</SelectItem>
                  <SelectItem value="image">Imagens</SelectItem>
                  <SelectItem value="video">Vídeos</SelectItem>
                </SelectContent>
              </Select>

              {/* View Toggle */}
              <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800 rounded-lg p-1">
                <Button
                  variant={viewMode === "grid" ? "default" : "ghost"}
                  size="sm"
                  className={cn("h-7 w-7 p-0", viewMode === "grid" && "bg-white dark:bg-zinc-700")}
                  onClick={() => setViewMode("grid")}
                >
                  <Grid3X3 className="w-4 h-4" />
                </Button>
                <Button
                  variant={viewMode === "list" ? "default" : "ghost"}
                  size="sm"
                  className={cn("h-7 w-7 p-0", viewMode === "list" && "bg-white dark:bg-zinc-700")}
                  onClick={() => setViewMode("list")}
                >
                  <List className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Files Grid/List */}
          {viewMode === "grid" ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {filteredFiles.map((file) => (
                <FileGridItem 
                  key={file.id} 
                  file={file} 
                  onPreview={handlePreview}
                />
              ))}
            </div>
          ) : (
            <Card className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {filteredFiles.map((file) => (
                <FileListItem 
                  key={file.id} 
                  file={file} 
                  onPreview={handlePreview}
                />
              ))}
            </Card>
          )}

          {/* Empty State */}
          {filteredFiles.length === 0 && (
            <div className="text-center py-12">
              <FolderOpen className="w-12 h-12 mx-auto text-zinc-300 dark:text-zinc-600 mb-4" />
              <h3 className="text-lg font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                Nenhum arquivo encontrado
              </h3>
              <p className="text-sm text-zinc-500">
                Tente ajustar os filtros ou faça upload de novos arquivos.
              </p>
            </div>
          )}
        </div>

        {/* Preview Dialog */}
        <PreviewDialog 
          file={previewFile} 
          open={previewOpen} 
          onClose={() => setPreviewOpen(false)} 
        />
        </div>
      </div>
    </TooltipProvider>
  );
}
