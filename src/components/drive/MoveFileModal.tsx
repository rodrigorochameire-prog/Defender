"use client";

/**
 * Modal para mover arquivos entre pastas do Google Drive.
 *
 * Exibe uma arvore de pastas navegavel (lazy-loaded) permitindo
 * ao usuario selecionar a pasta destino e executar o move via tRPC.
 */

import { useState, useMemo, useCallback, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Folder,
  FolderOpen,
  ChevronRight,
  ChevronDown,
  Loader2,
  Search,
} from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface MoveFileModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fileIds: number[];
  driveFileIds: string[];
  fileNames: string[];
  onSuccess?: () => void;
}

interface FolderTreeItemProps {
  folderId: string;
  name: string;
  depth: number;
  selectedId: string | null;
  onSelect: (folderId: string) => void;
  searchQuery: string;
  /** The sync-folder (root) driveFolderId this subtree belongs to */
  rootFolderId: string;
}

// ---------------------------------------------------------------------------
// FolderTreeItem (recursive, lazy-loaded)
// ---------------------------------------------------------------------------

function FolderTreeItem({
  folderId,
  name,
  depth,
  selectedId,
  onSelect,
  searchQuery,
  rootFolderId,
}: FolderTreeItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const isSelected = selectedId === folderId;

  // Fetch children only when expanded (lazy)
  const { data, isLoading } = trpc.drive.files.useQuery(
    {
      folderId: rootFolderId,
      parentDriveFileId: folderId,
      mimeType: "application/vnd.google-apps.folder",
      limit: 500,
    },
    {
      enabled: isExpanded,
      staleTime: 60_000,
    }
  );

  const subfolders = data?.files ?? [];

  // Filter subfolders by search query
  const filteredSubfolders = useMemo(() => {
    if (!searchQuery.trim()) return subfolders;
    const q = searchQuery.toLowerCase();
    return subfolders.filter((f) => f.name.toLowerCase().includes(q));
  }, [subfolders, searchQuery]);

  // Auto-expand when there is a search query (to reveal matching children)
  useEffect(() => {
    if (searchQuery.trim()) {
      setIsExpanded(true);
    }
  }, [searchQuery]);

  // Match check for this item
  const matchesSearch =
    !searchQuery.trim() || name.toLowerCase().includes(searchQuery.toLowerCase());

  // When searching, hide non-matching items that also have no matching children
  // (once loaded). Before children are loaded we show the item anyway.
  if (searchQuery.trim() && !matchesSearch && data && filteredSubfolders.length === 0) {
    return null;
  }

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsExpanded((prev) => !prev);
  };

  const handleSelect = () => {
    onSelect(folderId);
  };

  return (
    <div>
      {/* Row */}
      <div
        onClick={handleSelect}
        className={cn(
          "flex items-center gap-1.5 cursor-pointer rounded-md px-2 py-1.5 transition-colors text-sm",
          isSelected
            ? "ring-1 ring-emerald-500 bg-emerald-50 dark:bg-emerald-950/30 dark:ring-emerald-600 text-emerald-800 dark:text-emerald-300"
            : "hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
        )}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
      >
        {/* Chevron toggle */}
        <button
          type="button"
          onClick={handleToggle}
          className="shrink-0 p-0.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
        >
          {isExpanded ? (
            <ChevronDown className="h-3.5 w-3.5 text-zinc-500 dark:text-zinc-400" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5 text-zinc-500 dark:text-zinc-400" />
          )}
        </button>

        {/* Folder icon */}
        {isExpanded ? (
          <FolderOpen className="h-4 w-4 shrink-0 text-amber-500" />
        ) : (
          <Folder className="h-4 w-4 shrink-0 text-amber-500/70" />
        )}

        {/* Name */}
        <span className="truncate text-[13px]">{name}</span>
      </div>

      {/* Children (lazy) */}
      {isExpanded && (
        <div>
          {isLoading ? (
            <div
              className="flex items-center gap-2 py-1.5 text-zinc-400 text-xs"
              style={{ paddingLeft: `${(depth + 1) * 16 + 8}px` }}
            >
              <Loader2 className="h-3 w-3 animate-spin" />
              <span>Carregando...</span>
            </div>
          ) : filteredSubfolders.length === 0 && !searchQuery.trim() ? (
            <div
              className="py-1 text-zinc-400 dark:text-zinc-500 text-xs"
              style={{ paddingLeft: `${(depth + 1) * 16 + 8}px` }}
            >
              Sem subpastas
            </div>
          ) : (
            filteredSubfolders.map((sub) => (
              <FolderTreeItem
                key={sub.id}
                folderId={sub.driveFileId}
                name={sub.name}
                depth={depth + 1}
                selectedId={selectedId}
                onSelect={onSelect}
                searchQuery={searchQuery}
                rootFolderId={rootFolderId}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// MoveFileModal
// ---------------------------------------------------------------------------

export function MoveFileModal({
  open,
  onOpenChange,
  fileIds,
  driveFileIds,
  fileNames,
  onSuccess,
}: MoveFileModalProps) {
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isMoving, setIsMoving] = useState(false);

  const utils = trpc.useUtils();

  // Fetch root sync folders
  const { data: syncFolders, isLoading: isLoadingFolders } =
    trpc.drive.syncFolders.useQuery(undefined, {
      enabled: open,
      staleTime: 30_000,
    });

  const moveFileMutation = trpc.drive.moveFile.useMutation();

  // Reset state when modal closes
  const handleOpenChange = useCallback(
    (value: boolean) => {
      if (!value) {
        setSelectedFolderId(null);
        setSearchQuery("");
        setIsMoving(false);
      }
      onOpenChange(value);
    },
    [onOpenChange]
  );

  // Build display label for files
  const fileLabel = useMemo(() => {
    if (fileNames.length === 0) return "";
    if (fileNames.length === 1) return `"${fileNames[0]}"`;
    return `"${fileNames[0]}" e mais ${fileNames.length - 1}`;
  }, [fileNames]);

  // Filter root folders by search query
  const filteredRootFolders = useMemo(() => {
    if (!syncFolders) return [];
    if (!searchQuery.trim()) return syncFolders;
    const q = searchQuery.toLowerCase();
    // Show all roots when searching (children will be filtered recursively)
    return syncFolders.filter((f) => f.name.toLowerCase().includes(q) || true);
  }, [syncFolders, searchQuery]);

  // Handle move action
  const handleMove = async () => {
    if (!selectedFolderId || driveFileIds.length === 0) return;

    setIsMoving(true);
    let successCount = 0;
    let errorCount = 0;

    try {
      for (const driveFileId of driveFileIds) {
        try {
          const result = await moveFileMutation.mutateAsync({
            fileId: driveFileId,
            newParentId: selectedFolderId,
          });
          if (result.success) {
            successCount++;
          } else {
            errorCount++;
          }
        } catch {
          errorCount++;
        }
      }

      if (errorCount === 0) {
        toast.success(
          driveFileIds.length === 1
            ? "Arquivo movido com sucesso"
            : `${successCount} arquivo(s) movido(s) com sucesso`
        );
      } else if (successCount > 0) {
        toast.warning(
          `${successCount} movido(s), ${errorCount} com erro`
        );
      } else {
        toast.error("Erro ao mover arquivo(s)");
      }

      // Invalidate drive queries so UI refreshes
      await utils.drive.files.invalidate();
      await utils.drive.syncFolders.invalidate();

      onSuccess?.();
      handleOpenChange(false);
    } catch {
      toast.error("Erro inesperado ao mover arquivo(s)");
    } finally {
      setIsMoving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Mover arquivo(s)</DialogTitle>
          <DialogDescription className="truncate">
            {fileLabel}
          </DialogDescription>
        </DialogHeader>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar pasta..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={cn(
              "flex h-9 w-full rounded-md border border-input bg-background pl-9 pr-3 py-2 text-sm",
              "placeholder:text-muted-foreground/70",
              "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
              "transition-colors"
            )}
          />
        </div>

        {/* Folder tree */}
        <ScrollArea className="h-[400px] rounded-md border p-2">
          {isLoadingFolders ? (
            <div className="flex flex-col items-center justify-center h-full gap-2 text-zinc-400">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="text-sm">Carregando pastas...</span>
            </div>
          ) : !filteredRootFolders || filteredRootFolders.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-zinc-400">
              <Folder className="h-10 w-10 mb-2 opacity-40" />
              <span className="text-sm">Nenhuma pasta encontrada</span>
            </div>
          ) : (
            <div className="space-y-0.5">
              {filteredRootFolders.map((folder) => (
                <FolderTreeItem
                  key={folder.driveFolderId}
                  folderId={folder.driveFolderId}
                  name={folder.name}
                  depth={0}
                  selectedId={selectedFolderId}
                  onSelect={setSelectedFolderId}
                  searchQuery={searchQuery}
                  rootFolderId={folder.driveFolderId}
                />
              ))}
            </div>
          )}
        </ScrollArea>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isMoving}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleMove}
            disabled={!selectedFolderId || isMoving}
            className="gap-2"
          >
            {isMoving && <Loader2 className="h-4 w-4 animate-spin" />}
            Mover
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
