"use client";

/**
 * Modal de Seleção de Arquivos para Extração
 *
 * Permite ao usuário selecionar quais arquivos do Drive
 * serão processados para extração de dados.
 */

import { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  FileText,
  Image,
  Music,
  Video,
  Search,
  CheckSquare,
  Square,
  FileQuestion,
} from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

export interface FileSelectionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entityType: "assistido" | "processo" | "caso";
  entityId: number;
  driveFolderId?: string;
  onSelect: (fileIds: number[]) => void;
}

// Ícone baseado no tipo de arquivo
function getFileIcon(fileName: string, mimeType?: string | null) {
  const ext = fileName.toLowerCase().slice(fileName.lastIndexOf("."));

  if ([".pdf", ".doc", ".docx", ".txt", ".md", ".rtf", ".odt"].includes(ext)) {
    return <FileText className="h-5 w-5 text-red-500" />;
  }
  if ([".jpg", ".jpeg", ".png", ".gif", ".bmp", ".tiff", ".webp"].includes(ext)) {
    return <Image className="h-5 w-5 text-blue-500" />;
  }
  if ([".mp3", ".wav", ".ogg", ".flac", ".m4a", ".aac"].includes(ext)) {
    return <Music className="h-5 w-5 text-purple-500" />;
  }
  if ([".mp4", ".mkv", ".avi", ".mov", ".webm"].includes(ext)) {
    return <Video className="h-5 w-5 text-orange-500" />;
  }

  return <FileQuestion className="h-5 w-5 text-zinc-400" />;
}

// Tipo de conteúdo para badge
function getContentTypeBadge(fileName: string) {
  const ext = fileName.toLowerCase().slice(fileName.lastIndexOf("."));

  if ([".pdf", ".doc", ".docx", ".txt", ".md", ".rtf", ".odt"].includes(ext)) {
    return (
      <Badge variant="outline" className="text-xs">
        Documento
      </Badge>
    );
  }
  if ([".jpg", ".jpeg", ".png", ".gif", ".bmp", ".tiff", ".webp"].includes(ext)) {
    return (
      <Badge variant="outline" className="text-xs text-blue-600">
        Imagem
      </Badge>
    );
  }
  if ([".mp3", ".wav", ".ogg", ".flac", ".m4a", ".aac"].includes(ext)) {
    return (
      <Badge variant="outline" className="text-xs text-purple-600">
        Áudio
      </Badge>
    );
  }
  if ([".mp4", ".mkv", ".avi", ".mov", ".webm"].includes(ext)) {
    return (
      <Badge variant="outline" className="text-xs text-orange-600">
        Vídeo
      </Badge>
    );
  }

  return null;
}

// Formatar tamanho do arquivo
function formatFileSize(bytes?: number | null): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function FileSelectionModal({
  open,
  onOpenChange,
  entityType,
  entityId,
  driveFolderId,
  onSelect,
}: FileSelectionModalProps) {
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");

  // Buscar arquivos disponíveis
  const { data: files, isLoading } = trpc.smartExtract.getFilesForEntity.useQuery(
    {
      entityType,
      entityId,
      driveFolderId,
    },
    {
      enabled: open,
    }
  );

  // Filtrar arquivos pela busca
  const filteredFiles = useMemo(() => {
    if (!files) return [];
    if (!searchQuery.trim()) return files;

    const query = searchQuery.toLowerCase();
    return files.filter((f) => f.name.toLowerCase().includes(query));
  }, [files, searchQuery]);

  // Toggle seleção de arquivo
  const toggleFile = (id: number) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  // Selecionar todos / Limpar seleção
  const toggleAll = () => {
    if (selectedIds.size === filteredFiles.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredFiles.map((f) => f.id)));
    }
  };

  // Confirmar seleção
  const handleConfirm = () => {
    onSelect(Array.from(selectedIds));
  };

  // Resetar ao fechar
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setSelectedIds(new Set());
      setSearchQuery("");
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Selecionar Arquivos para Extração</DialogTitle>
          <DialogDescription>
            Escolha os arquivos que deseja processar para extrair dados
            automaticamente.
          </DialogDescription>
        </DialogHeader>

        {/* Barra de busca */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar arquivos..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Lista de arquivos */}
        <ScrollArea className="h-[400px] rounded-md border p-2">
          {isLoading ? (
            // Loading skeleton
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 p-2">
                  <Skeleton className="h-5 w-5" />
                  <Skeleton className="h-5 w-5" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/4" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredFiles.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center text-muted-foreground">
              <FileQuestion className="mb-2 h-12 w-12 opacity-50" />
              <p>Nenhum arquivo encontrado</p>
              {searchQuery && (
                <p className="text-sm">Tente outra busca</p>
              )}
            </div>
          ) : (
            <div className="space-y-1">
              {/* Header com toggle all */}
              <div
                className="flex cursor-pointer items-center gap-3 rounded-md p-2 hover:bg-muted"
                onClick={toggleAll}
              >
                {selectedIds.size === filteredFiles.length ? (
                  <CheckSquare className="h-5 w-5 text-emerald-600" />
                ) : (
                  <Square className="h-5 w-5 text-muted-foreground" />
                )}
                <span className="text-sm font-medium">
                  {selectedIds.size === filteredFiles.length
                    ? "Limpar seleção"
                    : "Selecionar todos"}
                </span>
                <Badge variant="secondary" className="ml-auto">
                  {filteredFiles.length} arquivo(s)
                </Badge>
              </div>

              <div className="my-2 border-t" />

              {/* Lista de arquivos */}
              {filteredFiles.map((file) => (
                <div
                  key={file.id}
                  className={cn(
                    "flex cursor-pointer items-center gap-3 rounded-md p-2 transition-colors hover:bg-muted",
                    selectedIds.has(file.id) && "bg-emerald-50 hover:bg-emerald-100"
                  )}
                  onClick={() => toggleFile(file.id)}
                >
                  <Checkbox
                    checked={selectedIds.has(file.id)}
                    onCheckedChange={() => toggleFile(file.id)}
                    onClick={(e) => e.stopPropagation()}
                  />
                  {getFileIcon(file.name, file.mimeType)}
                  <div className="flex-1 overflow-hidden">
                    <p className="truncate text-sm font-medium">{file.name}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      {file.fileSize && (
                        <span>{formatFileSize(file.fileSize)}</span>
                      )}
                      {file.lastModifiedTime && (
                        <span>
                          {formatDistanceToNow(new Date(file.lastModifiedTime), {
                            addSuffix: true,
                            locale: ptBR,
                          })}
                        </span>
                      )}
                    </div>
                  </div>
                  {getContentTypeBadge(file.name)}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        <DialogFooter className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {selectedIds.size} arquivo(s) selecionado(s)
          </p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => handleOpenChange(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={selectedIds.size === 0}
              className="gap-2"
            >
              Prosseguir
              {selectedIds.size > 0 && (
                <Badge variant="secondary">{selectedIds.size}</Badge>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
