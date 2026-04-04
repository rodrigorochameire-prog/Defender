"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
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
  HardDrive,
  Search,
  X,
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

// --- Color helpers (simplified: only dot color is semantic) ---

function getAttrLeftBarColor(color: string) {
  switch (color) {
    case "emerald": return "bg-emerald-500";
    case "rose": return "bg-rose-500";
    case "amber": return "bg-amber-500";
    case "sky": return "bg-sky-500";
    case "orange": return "bg-orange-500";
    default: return "bg-emerald-500";
  }
}

function getAttrConnectorGradient(color: string) {
  switch (color) {
    case "emerald": return "from-emerald-500/30 to-transparent";
    case "rose": return "from-rose-500/30 to-transparent";
    case "amber": return "from-amber-500/30 to-transparent";
    case "sky": return "from-sky-500/30 to-transparent";
    case "orange": return "from-orange-500/30 to-transparent";
    default: return "from-neutral-500/30 to-transparent";
  }
}

// --- Subfolder List ---

function AtribuicaoSubfolders({
  folderId,
  atribuicaoKey,
  color,
  onCount,
}: {
  folderId: string;
  atribuicaoKey: string;
  color: string;
  onCount?: (count: number) => void;
}) {
  const ctx = useDriveContext();
  const [searchQuery, setSearchQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const onCountRef = useRef(onCount);
  onCountRef.current = onCount;

  const { data, isLoading } = trpc.drive.files.useQuery(
    {
      folderId,
      parentFileId: null,
      mimeType: "application/vnd.google-apps.folder",
      limit: 1000,
    },
    { staleTime: 60_000 }
  );

  const subfolders = data?.files ?? [];

  useEffect(() => {
    if (onCountRef.current && !isLoading) onCountRef.current(subfolders.length);
  }, [subfolders.length, isLoading]);

  const filteredFolders = useMemo(() => {
    if (!searchQuery.trim()) return subfolders;
    const q = searchQuery.toLowerCase().trim();
    return subfolders.filter((f) => f.name.toLowerCase().includes(q));
  }, [subfolders, searchQuery]);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-1.5 pl-7 text-neutral-500">
        <Loader2 className="h-3 w-3 animate-spin" />
        <span className="text-xs">Carregando...</span>
      </div>
    );
  }

  if (subfolders.length === 0) {
    return (
      <div className="py-1.5 pl-7 text-neutral-600 text-xs">
        Nenhuma subpasta
      </div>
    );
  }

  const recents = getRecents();
  const recentIds = new Set(recents.map((r) => r.id));
  const showSearch = subfolders.length > 5;

  return (
    <div className="overflow-hidden transition-all duration-200">
      {showSearch && (
        <div className="relative mx-2 mb-0.5">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-neutral-500" />
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filtrar..."
            className="w-full h-6 pl-6 pr-6 text-[10px] bg-neutral-100 dark:bg-neutral-800/60 border border-neutral-200/60 dark:border-neutral-700/40 rounded-md text-neutral-700 dark:text-neutral-300 placeholder:text-neutral-400 dark:placeholder:text-neutral-600 focus:outline-none focus:border-neutral-300 dark:focus:border-neutral-600/60 transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => { setSearchQuery(""); searchInputRef.current?.focus(); }}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300"
            >
              <X className="h-2.5 w-2.5" />
            </button>
          )}
        </div>
      )}

      <div className="relative pl-3 space-y-px max-h-[260px] overflow-y-auto scrollbar-thin scrollbar-thumb-neutral-700/50 scrollbar-track-transparent">
        <div className={cn(
          "absolute left-[18px] top-0.5 bottom-0.5 w-px bg-gradient-to-b",
          getAttrConnectorGradient(color)
        )} />

        {filteredFolders.length === 0 ? (
          <div className="py-1.5 pl-4 text-neutral-600 text-[10px]">
            Nenhum resultado
          </div>
        ) : (
          filteredFolders.map((folder) => {
            const isActive = ctx.selectedFolderId === folder.driveFileId;
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
                  "flex items-center gap-1.5 w-full text-left px-2 py-1 transition-all duration-200 rounded-md group/subitem relative cursor-pointer",
                  isActive
                    ? "bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 font-medium"
                    : "text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-700/40"
                )}
              >
                <div className={cn(
                  "absolute left-[-10px] w-1.5 h-px transition-all duration-200",
                  isActive ? "bg-neutral-400 dark:bg-neutral-500" : "bg-neutral-200 dark:bg-neutral-700/50"
                )} />
                <FolderOpen className={cn(
                  "h-3 w-3 shrink-0 transition-all duration-200",
                  isActive ? "text-neutral-700 dark:text-neutral-300" : "text-neutral-400 dark:text-neutral-500 group-hover/subitem:text-neutral-700 dark:group-hover/subitem:text-neutral-300"
                )} />
                <span className="truncate text-xs">{folder.name}</span>
              </button>
            );
          })
        )}
      </div>

      {searchQuery && filteredFolders.length > 0 && (
        <div className="px-6 py-0.5 text-[9px] text-neutral-600 tabular-nums">
          {filteredFolders.length}/{subfolders.length}
        </div>
      )}
    </div>
  );
}

// --- Sidebar Content ---

function SidebarContent({ collapsed }: { collapsed: boolean }) {
  const ctx = useDriveContext();
  const [expandedAtribuicoes, setExpandedAtribuicoes] = useState<Set<string>>(new Set());
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());
  const [recents, setRecents] = useState<RecentItem[]>([]);
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [subfolderCounts, setSubfolderCounts] = useState<Record<string, number>>({});

  const { data: syncFolders } = trpc.drive.syncFolders.useQuery(undefined, { staleTime: 30_000 });
  const { data: stats } = trpc.drive.stats.useQuery(undefined, { staleTime: 30_000 });

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

  const toggleSection = useCallback((section: string) => {
    setCollapsedSections((prev) => {
      const next = new Set(prev);
      if (next.has(section)) next.delete(section);
      else next.add(section);
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
    <div className="flex flex-col h-full overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-neutral-300 dark:scrollbar-thumb-neutral-700/50 scrollbar-track-transparent">
      <div className="px-2 pb-4 pt-2">
        {/* --- ATRIBUICOES --- */}
        <button
          onClick={() => toggleSection("atribuicoes")}
          className="w-full text-[10px] font-medium text-neutral-400 uppercase tracking-wider px-2 pb-1.5 flex items-center gap-1 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors cursor-pointer"
        >
          <HardDrive className="h-2.5 w-2.5" />
          Atribuicoes
          <ChevronDown className={cn(
            "h-2.5 w-2.5 ml-auto transition-transform duration-200",
            collapsedSections.has("atribuicoes") && "-rotate-90"
          )} />
        </button>
        <div className={cn(
          "space-y-px overflow-hidden transition-all duration-300 ease-in-out",
          collapsedSections.has("atribuicoes") ? "max-h-0 opacity-0" : "max-h-[2000px] opacity-100"
        )}>
          {DRIVE_ATRIBUICOES.map((attr) => {
            const isActive = ctx.selectedAtribuicao === attr.key;
            const isExpanded = expandedAtribuicoes.has(attr.key);
            const Icon = attr.icon;
            const synced = isSynced(attr.folderId);

            return (
              <div key={attr.key} className="space-y-px">
                <div className="flex items-center">
                  <button
                    onClick={() => {
                      ctx.setSelectedAtribuicao(attr.key);
                      if (!isExpanded) toggleExpand(attr.key);
                    }}
                    className={cn(
                      "w-full h-7 transition-all duration-200 rounded-md flex items-center px-2 group/item relative cursor-pointer",
                      isActive
                        ? "bg-neutral-100 dark:bg-neutral-800/80 text-neutral-900 dark:text-neutral-100 font-semibold"
                        : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-100/80 dark:hover:bg-neutral-800/40"
                    )}
                  >
                    {isActive && (
                      <div className={cn("absolute left-0 top-0.5 bottom-0.5 w-[3px] rounded-full", getAttrLeftBarColor(attr.color))} />
                    )}
                    <Icon className={cn(
                      "h-3 w-3 mr-1.5 transition-all duration-200 shrink-0",
                      isActive ? "text-neutral-700 dark:text-neutral-300" : "text-neutral-400 dark:text-neutral-500 group-hover/item:text-neutral-600 dark:group-hover/item:text-neutral-300"
                    )} strokeWidth={isActive ? 2.2 : 1.8} />
                    <span className="text-xs font-medium truncate">{attr.label}</span>
                    {!synced && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="h-1 w-1 rounded-full bg-neutral-600 shrink-0 ml-1" />
                        </TooltipTrigger>
                        <TooltipContent side="right" className="text-[10px]">
                          Nao sincronizada
                        </TooltipContent>
                      </Tooltip>
                    )}
                    {subfolderCounts[attr.key] != null && subfolderCounts[attr.key] > 0 && (
                      <span className="text-[9px] tabular-nums text-neutral-400 ml-auto mr-0.5 bg-neutral-200/60 dark:bg-neutral-700/40 rounded-full px-1 py-px">
                        {subfolderCounts[attr.key]}
                      </span>
                    )}
                    <ChevronDown
                      className={cn(
                        "h-3 w-3 ml-auto transition-transform duration-200 shrink-0",
                        isExpanded && "rotate-180"
                      )}
                      onClick={(e) => { e.stopPropagation(); toggleExpand(attr.key); }}
                    />
                  </button>
                </div>

                <div className={cn(
                  "overflow-hidden transition-all duration-300 ease-in-out",
                  isExpanded ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"
                )}>
                  {isExpanded && (
                    <AtribuicaoSubfolders
                      folderId={attr.folderId}
                      atribuicaoKey={attr.key}
                      color={attr.color}
                      onCount={(count) => setSubfolderCounts((prev) => ({ ...prev, [attr.key]: count }))}
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Divider */}
        <div className="my-2 mx-2 h-px bg-neutral-200/50 dark:bg-neutral-800/40" />

        {/* --- ESPECIAIS --- */}
        <button
          onClick={() => toggleSection("especiais")}
          className="w-full text-[10px] font-medium text-neutral-400 uppercase tracking-wider px-2 pb-1.5 flex items-center gap-1 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors cursor-pointer"
        >
          Especiais
          <ChevronDown className={cn(
            "h-2.5 w-2.5 ml-auto transition-transform duration-200",
            collapsedSections.has("especiais") && "-rotate-90"
          )} />
        </button>
        <div className={cn(
          "space-y-px overflow-hidden transition-all duration-300 ease-in-out",
          collapsedSections.has("especiais") ? "max-h-0 opacity-0" : "max-h-[1000px] opacity-100"
        )}>
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
                  "w-full h-7 transition-all duration-200 rounded-md flex items-center px-2 group/item relative",
                  isActive
                    ? "bg-neutral-100 dark:bg-neutral-800/80 text-neutral-900 dark:text-neutral-100 font-semibold"
                    : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-100/80 dark:hover:bg-neutral-800/40"
                )}
              >
                {isActive && (
                  <div className="absolute left-0 top-0.5 bottom-0.5 w-[3px] rounded-full bg-emerald-500" />
                )}
                <Icon className={cn(
                  "h-3 w-3 mr-1.5 transition-all duration-200 shrink-0",
                  isActive ? "text-neutral-700 dark:text-neutral-300" : "text-neutral-400 dark:text-neutral-500 group-hover/item:text-neutral-600 dark:group-hover/item:text-neutral-300"
                )} strokeWidth={isActive ? 2.2 : 1.8} />
                <span className="text-xs font-medium truncate">{sf.label}</span>
                {sf.key === "DISTRIBUICAO" && (
                  <Badge
                    variant="outline"
                    className="ml-auto text-[9px] px-1 py-0 h-3.5 bg-violet-500/10 border-violet-500/30 text-violet-400"
                  >
                    Novo
                  </Badge>
                )}
              </button>
            );
          })}
        </div>

        {/* Divider */}
        <div className="my-2 mx-2 h-px bg-neutral-200/50 dark:bg-neutral-800/40" />

        {/* --- ACESSO RAPIDO --- */}
        <button
          onClick={() => toggleSection("acesso-rapido")}
          className="w-full text-[10px] font-medium text-neutral-400 uppercase tracking-wider px-2 pb-1.5 flex items-center gap-1 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors cursor-pointer"
        >
          <Clock className="h-2.5 w-2.5" />
          Recentes
          <ChevronDown className={cn(
            "h-2.5 w-2.5 ml-auto transition-transform duration-200",
            collapsedSections.has("acesso-rapido") && "-rotate-90"
          )} />
        </button>
        <div className={cn(
          "space-y-0.5 overflow-hidden transition-all duration-300 ease-in-out",
          collapsedSections.has("acesso-rapido") ? "max-h-0 opacity-0" : "max-h-[1000px] opacity-100"
        )}>
          {recents.length === 0 ? (
            <div className="px-2 py-2 text-center">
              <FolderOpen className="h-4 w-4 text-neutral-300 dark:text-neutral-600 mx-auto mb-1" />
              <p className="text-[10px] text-neutral-400 dark:text-neutral-500">
                Navegue em uma pasta
              </p>
            </div>
          ) : (
            <div className="relative pl-3 space-y-px">
              <div className="absolute left-[18px] top-0.5 bottom-0.5 w-px bg-gradient-to-b from-neutral-400/30 to-transparent" />
              {recents.slice(0, 5).map((item) => (
                <button
                  key={item.id}
                  onClick={() => ctx.navigateToFolder(item.id, item.name)}
                  className="flex items-center gap-1.5 w-full text-left px-2 py-1 transition-all duration-200 rounded-md group/subitem relative text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-700/40"
                >
                  <div className="absolute left-[-10px] w-1.5 h-px bg-neutral-200 dark:bg-neutral-700/50" />
                  <FolderOpen className="h-3 w-3 shrink-0 text-neutral-400 dark:text-neutral-500 group-hover/subitem:text-neutral-700 dark:group-hover/subitem:text-neutral-300" />
                  <span className="truncate text-xs">{item.name}</span>
                </button>
              ))}
            </div>
          )}

          {favorites.length > 0 && (
            <>
              <p className="text-[10px] font-medium text-neutral-400 uppercase tracking-wider px-4 pt-1.5 pb-0.5 flex items-center gap-1">
                <Star className="h-2.5 w-2.5 text-amber-500/60" />
                Favoritos
              </p>
              <div className="relative pl-3 space-y-px">
                <div className="absolute left-[18px] top-0.5 bottom-0.5 w-px bg-gradient-to-b from-amber-500/30 to-transparent" />
                {favorites.slice(0, 5).map((item) => (
                  <button
                    key={item.id}
                    onClick={() => ctx.navigateToFolder(item.id, item.name)}
                    className="flex items-center gap-1.5 w-full text-left px-2 py-1 transition-all duration-200 rounded-md group/subitem relative text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-700/40"
                  >
                    <div className="absolute left-[-10px] w-1.5 h-px bg-neutral-200 dark:bg-neutral-700/50" />
                    <Star className="h-3 w-3 shrink-0 text-amber-500/60 group-hover/subitem:text-amber-400" />
                    <span className="truncate text-xs">{item.name}</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Footer — inline stats */}
      {stats && (
        <div className="mt-auto px-3 py-2 border-t border-neutral-200/40 dark:border-neutral-800/30">
          <div className="flex items-center justify-between text-[9px] text-neutral-400 tabular-nums">
            <span>{stats.totalFiles} arquivos</span>
            <span className="text-neutral-300 dark:text-neutral-600">·</span>
            <span>{stats.syncedFolders} pastas</span>
          </div>
        </div>
      )}
    </div>
  );
}

// --- Sync Health Dot ---

function SidebarSyncDot() {
  const { data: health, isLoading } = trpc.drive.healthStatus.useQuery(
    undefined,
    { staleTime: 30_000, refetchInterval: 60_000 }
  );

  if (isLoading || !health) {
    return <span className="h-1.5 w-1.5 rounded-full bg-neutral-600 animate-pulse" />;
  }

  const dotClass = health.status === "healthy"
    ? "bg-emerald-500"
    : health.status === "degraded"
    ? "bg-amber-500"
    : "bg-red-500";

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className={cn("h-1.5 w-1.5 rounded-full shrink-0 cursor-default", dotClass)} />
      </TooltipTrigger>
      <TooltipContent side="right" className="text-[10px]">
        {health.status === "healthy" ? "Sync OK" : health.status === "degraded" ? "Degradado" : "Critico"}
      </TooltipContent>
    </Tooltip>
  );
}

// --- Sidebar Search ---

function SidebarSearch() {
  const ctx = useDriveContext();
  const [localSearch, setLocalSearch] = useState(ctx.searchQuery);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleChange = useCallback(
    (value: string) => {
      setLocalSearch(value);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => ctx.setSearchQuery(value), 300);
    },
    [ctx]
  );

  useEffect(() => {
    setLocalSearch(ctx.searchQuery);
  }, [ctx.searchQuery]);

  useEffect(() => {
    return () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); };
  }, []);

  return (
    <div className="px-2 py-1.5 border-b border-neutral-100/80 dark:border-neutral-800/30">
      <div className="relative">
        <input
          type="text"
          value={localSearch}
          onChange={(e) => handleChange(e.target.value)}
          placeholder="Buscar..."
          className={cn(
            "peer w-full h-6 pl-6 pr-6 rounded-md text-xs",
            "bg-neutral-100 dark:bg-neutral-800/60 border border-neutral-200/60 dark:border-neutral-700/40",
            "text-neutral-700 dark:text-neutral-200 placeholder:text-neutral-400 dark:placeholder:text-neutral-500",
            "focus:outline-none focus:ring-1 focus:ring-emerald-500/30 focus:border-emerald-500/30",
            "transition-colors duration-200"
          )}
        />
        <Search className="absolute left-1.5 top-1/2 -translate-y-1/2 h-3 w-3 text-neutral-400 dark:text-neutral-500 pointer-events-none" />
        {localSearch && (
          <button
            onClick={() => { setLocalSearch(""); ctx.setSearchQuery(""); }}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 text-neutral-400 dark:text-neutral-500 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors"
          >
            <X className="h-2.5 w-2.5" />
          </button>
        )}
      </div>
    </div>
  );
}

// --- Main Sidebar ---

export function DriveSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* Desktop Sidebar */}
      <TooltipProvider delayDuration={300}>
      <aside
        className={cn(
          "hidden lg:flex flex-col shrink-0 transition-all duration-200",
          "border-r border-neutral-200/40 dark:border-neutral-800/30",
          "bg-neutral-50/40 dark:bg-neutral-900/30",
          collapsed ? "w-0 overflow-hidden" : "w-52"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between h-8 px-2 border-b border-neutral-200/40 dark:border-neutral-800/30 shrink-0">
          {!collapsed && (
            <div className="flex items-center gap-1">
              <HardDrive className="h-3 w-3 text-emerald-500 dark:text-emerald-400" />
              <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 tracking-tight">
                Drive
              </span>
              <SidebarSyncDot />
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5 text-neutral-400 dark:text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 hover:bg-neutral-200/50 dark:hover:bg-white/5 rounded"
            onClick={() => setCollapsed(!collapsed)}
          >
            {collapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
          </Button>
        </div>

        {!collapsed && <SidebarSearch />}
        <SidebarContent collapsed={collapsed} />
      </aside>
      </TooltipProvider>

      {/* Collapsed expand button */}
      {collapsed && (
        <Button
          variant="ghost"
          size="icon"
          className="hidden lg:flex h-5 w-5 absolute left-1 top-1.5 z-10 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 bg-neutral-100/90 dark:bg-neutral-800/90 border border-neutral-200/40 dark:border-neutral-700/30 rounded hover:bg-neutral-200/80 dark:hover:bg-neutral-700/60 shadow-sm"
          onClick={() => setCollapsed(false)}
        >
          <ChevronRight className="h-3 w-3" />
        </Button>
      )}

      {/* Mobile Sheet */}
      <div className="lg:hidden absolute left-2 top-1 z-20">
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-neutral-400 hover:text-neutral-700 dark:text-neutral-500 dark:hover:text-neutral-200 hover:bg-neutral-200/50 dark:hover:bg-neutral-700/50 rounded-md"
            >
              <Menu className="h-3.5 w-3.5" />
            </Button>
          </SheetTrigger>
          <SheetContent
            side="left"
            className={cn(
              "w-64 p-0 border-neutral-200 dark:border-neutral-700/20",
              "bg-white/90 dark:bg-gradient-to-b dark:from-[#1f1f23] dark:via-[#1a1a1e] dark:to-[#1f1f23]",
              "backdrop-blur-2xl"
            )}
          >
            <SheetTitle className="sr-only">Drive</SheetTitle>
            <div className="h-9 flex items-center justify-between px-2 border-b border-neutral-200 dark:border-neutral-700/20 shrink-0">
              <div className="flex items-center gap-1.5">
                <HardDrive className="h-3.5 w-3.5 text-emerald-500 dark:text-emerald-400" />
                <span className="text-xs font-semibold text-neutral-600 dark:text-neutral-300">Drive</span>
                <SidebarSyncDot />
              </div>
            </div>
            <SidebarSearch />
            <SidebarContent collapsed={false} />
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
}
