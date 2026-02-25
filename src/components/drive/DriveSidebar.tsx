"use client";

import { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc/client";
import { useDriveContext } from "./DriveContext";
import {
  DRIVE_ATRIBUICOES,
  SPECIAL_FOLDERS,
} from "./drive-constants";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from "@/components/ui/tooltip";
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Clock,
  Star,
  Menu,
  FolderOpen,
  Loader2,
} from "lucide-react";

// --- Types ---

interface RecentItem {
  id: string;
  name: string;
  atribuicao: string;
  visitedAt: number;
}

interface FavoriteItem {
  id: string;
  name: string;
  atribuicao: string;
}

// --- Local Storage ---

const RECENTS_KEY = "drive-recent-folders";
const FAVORITES_KEY = "drive-favorite-folders";

function getRecents(): RecentItem[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(RECENTS_KEY) || "[]");
  } catch {
    return [];
  }
}

function getFavorites(): FavoriteItem[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(FAVORITES_KEY) || "[]");
  } catch {
    return [];
  }
}

// --- Subfolder List ---

function AtribuicaoSubfolders({
  folderId,
  atribuicaoKey,
  activeBorderClass,
  dotClass,
}: {
  folderId: string;
  atribuicaoKey: string;
  activeBorderClass: string;
  dotClass: string;
}) {
  const ctx = useDriveContext();

  const { data, isLoading } = trpc.drive.files.useQuery(
    {
      folderId,
      parentFileId: null,
      mimeType: "application/vnd.google-apps.folder",
      limit: 100,
    },
    { staleTime: 60_000 }
  );

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-2 px-3 text-zinc-500">
        <Loader2 className="h-3 w-3 animate-spin" />
        <span className="text-xs">Carregando...</span>
      </div>
    );
  }

  const subfolders = data?.files ?? [];

  if (subfolders.length === 0) {
    return (
      <div className="py-2 px-3 text-zinc-600 text-xs">
        Nenhuma subpasta encontrada
      </div>
    );
  }

  const recents = getRecents();
  const recentIds = new Set(recents.map((r) => r.id));

  return (
    <div className="ml-2 border-l border-zinc-700/30">
      {subfolders.map((folder) => {
        const isActive =
          ctx.selectedFolderId === folder.driveFileId;
        const isRecent = recentIds.has(folder.driveFileId);

        return (
          <button
            key={folder.id}
            onClick={() => {
              ctx.navigateToFolder(folder.driveFileId, folder.name);
              const updated = [
                {
                  id: folder.driveFileId,
                  name: folder.name,
                  atribuicao: atribuicaoKey,
                  visitedAt: Date.now(),
                },
                ...getRecents().filter((r) => r.id !== folder.driveFileId),
              ].slice(0, 10);
              localStorage.setItem(RECENTS_KEY, JSON.stringify(updated));
            }}
            className={cn(
              "flex items-center gap-2 w-full text-left px-3 py-1.5 text-sm transition-colors duration-150",
              "hover:bg-zinc-700/40 hover:text-zinc-200",
              isActive
                ? cn("bg-zinc-800/80 text-zinc-100 -ml-px", activeBorderClass)
                : "text-zinc-500 ml-px"
            )}
          >
            <FolderOpen className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate text-xs">{folder.name}</span>
            {isRecent && (
              <span
                className={cn("h-1.5 w-1.5 rounded-full shrink-0 ml-auto", dotClass)}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}

// --- Sidebar Content ---

function SidebarContent({ collapsed }: { collapsed: boolean }) {
  const ctx = useDriveContext();
  const [expandedAtribuicoes, setExpandedAtribuicoes] = useState<Set<string>>(
    new Set()
  );
  const [recents, setRecents] = useState<RecentItem[]>([]);
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);

  const { data: syncFolders } = trpc.drive.syncFolders.useQuery(undefined, {
    staleTime: 30_000,
  });

  const { data: stats } = trpc.drive.stats.useQuery(undefined, {
    staleTime: 30_000,
  });

  useEffect(() => {
    setRecents(getRecents());
    setFavorites(getFavorites());
  }, []);

  const toggleExpand = useCallback((key: string) => {
    setExpandedAtribuicoes((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const isSynced = useCallback(
    (folderId: string): boolean => {
      if (!syncFolders) return false;
      return syncFolders.some(
        (sf: { driveFolderId: string; isActive: boolean }) =>
          sf.driveFolderId === folderId && sf.isActive
      );
    },
    [syncFolders]
  );

  if (collapsed) return null;

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex flex-col h-full overflow-y-auto overflow-x-hidden py-2">
        {/* --- ATRIBUICOES --- */}
        <div className="px-3 mb-1">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
            Atribuicoes
          </span>
        </div>
        <div className="space-y-0.5">
          {DRIVE_ATRIBUICOES.map((attr) => {
            const isActive = ctx.selectedAtribuicao === attr.key;
            const isExpanded = expandedAtribuicoes.has(attr.key);
            const Icon = attr.icon;
            const synced = isSynced(attr.folderId);

            return (
              <div key={attr.key}>
                <div className="flex items-center">
                  <button
                    onClick={() => {
                      ctx.setSelectedAtribuicao(attr.key);
                    }}
                    className={cn(
                      "flex items-center gap-2.5 flex-1 text-left px-3 py-2 text-sm transition-all duration-200",
                      "hover:bg-zinc-700/40",
                      isActive
                        ? cn("bg-zinc-800/80 text-zinc-100 pl-[10px]", attr.activeBorderClass)
                        : "text-zinc-400 hover:text-zinc-200"
                    )}
                  >
                    <span className={cn("h-2 w-2 rounded-full shrink-0", attr.dotClass)} />
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className="truncate font-medium">{attr.label}</span>
                    {!synced && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="h-1.5 w-1.5 rounded-full bg-zinc-600 shrink-0" />
                        </TooltipTrigger>
                        <TooltipContent side="right" className="bg-[#1f1f23] border-zinc-700/50 text-zinc-200">
                          Pasta nao sincronizada
                        </TooltipContent>
                      </Tooltip>
                    )}
                  </button>
                  <button
                    onClick={() => toggleExpand(attr.key)}
                    className={cn(
                      "p-1.5 mr-1 rounded transition-colors duration-150",
                      "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-700/40"
                    )}
                  >
                    <ChevronDown
                      className={cn(
                        "h-3.5 w-3.5 transition-transform duration-200",
                        isExpanded && "rotate-180"
                      )}
                    />
                  </button>
                </div>

                {isExpanded && (
                  <AtribuicaoSubfolders
                    folderId={attr.folderId}
                    atribuicaoKey={attr.key}
                    activeBorderClass={attr.activeBorderClass}
                    dotClass={attr.dotClass}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* --- Divider --- */}
        <div className="mx-3 my-3 border-t border-zinc-700/30" />

        {/* --- ESPECIAIS --- */}
        <div className="px-3 mb-1">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
            Especiais
          </span>
        </div>
        <div className="space-y-0.5">
          {SPECIAL_FOLDERS.map((sf) => {
            const Icon = sf.icon;
            const isActive = ctx.selectedFolderId === sf.folderId;

            return (
              <button
                key={sf.key}
                onClick={() => {
                  ctx.setSelectedAtribuicao(null);
                  ctx.navigateToFolder(sf.folderId, sf.label);
                }}
                className={cn(
                  "flex items-center gap-2.5 w-full text-left px-3 py-2 text-sm transition-all duration-200",
                  "hover:bg-zinc-700/40",
                  isActive
                    ? "bg-zinc-800/80 text-zinc-100 border-l-2 border-zinc-400"
                    : "text-zinc-400 hover:text-zinc-200"
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="truncate">{sf.label}</span>
                {sf.key === "DISTRIBUICAO" && (
                  <Badge
                    variant="outline"
                    className="ml-auto text-[10px] px-1.5 py-0 h-4 bg-violet-500/10 border-violet-500/30 text-violet-400"
                  >
                    Novo
                  </Badge>
                )}
              </button>
            );
          })}
        </div>

        {/* --- Divider --- */}
        <div className="mx-3 my-3 border-t border-zinc-700/30" />

        {/* --- ACESSO RAPIDO --- */}
        <div className="px-3 mb-1">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
            Acesso Rapido
          </span>
        </div>
        <div className="space-y-0.5">
          {/* Recentes */}
          <div>
            <div className="flex items-center gap-2 px-3 py-1.5 text-zinc-500">
              <Clock className="h-3.5 w-3.5" />
              <span className="text-xs font-medium">Recentes</span>
            </div>
            {recents.length === 0 ? (
              <div className="px-3 py-1 text-zinc-600 text-xs">
                Nenhum acesso recente
              </div>
            ) : (
              <div className="ml-2 border-l border-zinc-700/30">
                {recents.slice(0, 5).map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      ctx.navigateToFolder(item.id, item.name);
                    }}
                    className={cn(
                      "flex items-center gap-2 w-full text-left px-3 py-1 text-xs transition-colors duration-150",
                      "text-zinc-500 hover:text-zinc-200 hover:bg-zinc-700/40"
                    )}
                  >
                    <FolderOpen className="h-3 w-3 shrink-0" />
                    <span className="truncate">{item.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Favoritos */}
          <div>
            <div className="flex items-center gap-2 px-3 py-1.5 text-zinc-500">
              <Star className="h-3.5 w-3.5" />
              <span className="text-xs font-medium">Favoritos</span>
            </div>
            {favorites.length === 0 ? (
              <div className="px-3 py-1 text-zinc-600 text-xs">
                Nenhum favorito salvo
              </div>
            ) : (
              <div className="ml-2 border-l border-zinc-700/30">
                {favorites.slice(0, 5).map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      ctx.navigateToFolder(item.id, item.name);
                    }}
                    className={cn(
                      "flex items-center gap-2 w-full text-left px-3 py-1 text-xs transition-colors duration-150",
                      "text-zinc-500 hover:text-zinc-200 hover:bg-zinc-700/40"
                    )}
                  >
                    <Star className="h-3 w-3 shrink-0 text-amber-500" />
                    <span className="truncate">{item.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* --- Footer stats --- */}
        {stats && (
          <div className="mt-auto px-3 py-2 border-t border-zinc-700/30">
            <div className="flex items-center justify-between text-[10px] text-zinc-600">
              <span>{stats.totalFiles} arquivos</span>
              <span>{stats.syncedFolders} pastas</span>
            </div>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}

// --- Main Sidebar Export ---

export function DriveSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* --- Desktop Sidebar (always dark, organic) --- */}
      <aside
        className={cn(
          "hidden md:flex flex-col border-r border-zinc-700/30 bg-gradient-to-b from-[#1f1f23] via-[#1a1a1e] to-[#1f1f23] transition-all duration-300 shrink-0",
          collapsed ? "w-0 overflow-hidden" : "w-60"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between h-10 px-2 border-b border-zinc-700/30">
          {!collapsed && (
            <span className="text-xs font-semibold text-zinc-400 px-1">
              Drive
            </span>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-700/40"
            onClick={() => setCollapsed(!collapsed)}
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </Button>
        </div>

        <SidebarContent collapsed={collapsed} />
      </aside>

      {/* Collapsed expand button (desktop) */}
      {collapsed && (
        <Button
          variant="ghost"
          size="icon"
          className="hidden md:flex h-8 w-8 absolute left-1 top-16 z-10 text-zinc-500 hover:text-zinc-300 bg-[#1f1f23] border border-zinc-700/30 rounded-md hover:bg-zinc-700/40"
          onClick={() => setCollapsed(false)}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      )}

      {/* --- Mobile Sheet --- */}
      <div className="md:hidden">
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 text-zinc-500 hover:text-zinc-200"
            >
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent
            side="left"
            className="w-72 p-0 bg-[#1f1f23] border-zinc-700/30"
          >
            <SheetTitle className="sr-only">Menu de navegacao do Drive</SheetTitle>
            <div className="h-10 flex items-center px-3 border-b border-zinc-700/30">
              <span className="text-xs font-semibold text-zinc-400">
                Drive
              </span>
            </div>
            <SidebarContent collapsed={false} />
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
}
