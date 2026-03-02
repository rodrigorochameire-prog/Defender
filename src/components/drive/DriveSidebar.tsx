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

// --- Atribuicao color helpers (for sub-item connector gradient) ---

function getAttrConnectorGradient(color: string) {
  switch (color) {
    case "emerald": return "from-emerald-500/30 via-zinc-700/40 to-transparent";
    case "rose": return "from-rose-500/30 via-zinc-700/40 to-transparent";
    case "amber": return "from-amber-500/30 via-zinc-700/40 to-transparent";
    case "sky": return "from-sky-500/30 via-zinc-700/40 to-transparent";
    case "orange": return "from-orange-500/30 via-zinc-700/40 to-transparent";
    default: return "from-zinc-500/30 via-zinc-700/40 to-transparent";
  }
}

function getAttrActiveBg(color: string) {
  switch (color) {
    case "emerald": return "bg-emerald-600/15 text-emerald-400";
    case "rose": return "bg-rose-600/15 text-rose-400";
    case "amber": return "bg-amber-600/15 text-amber-400";
    case "sky": return "bg-sky-600/15 text-sky-400";
    case "orange": return "bg-orange-600/15 text-orange-400";
    default: return "bg-zinc-700/60 text-zinc-100";
  }
}

function getAttrActiveIconBg(color: string) {
  switch (color) {
    case "emerald": return "bg-emerald-500/20";
    case "rose": return "bg-rose-500/20";
    case "amber": return "bg-amber-500/20";
    case "sky": return "bg-sky-500/20";
    case "orange": return "bg-orange-500/20";
    default: return "bg-white/20";
  }
}

function getAttrSubItemActive(color: string) {
  switch (color) {
    case "emerald": return "bg-emerald-500/15 text-emerald-400 font-medium";
    case "rose": return "bg-rose-500/15 text-rose-400 font-medium";
    case "amber": return "bg-amber-500/15 text-amber-400 font-medium";
    case "sky": return "bg-sky-500/15 text-sky-400 font-medium";
    case "orange": return "bg-orange-500/15 text-orange-400 font-medium";
    default: return "bg-zinc-700/40 text-zinc-200 font-medium";
  }
}

function getAttrSubItemConnector(color: string) {
  switch (color) {
    case "emerald": return "bg-emerald-500/50";
    case "rose": return "bg-rose-500/50";
    case "amber": return "bg-amber-500/50";
    case "sky": return "bg-sky-500/50";
    case "orange": return "bg-orange-500/50";
    default: return "bg-zinc-700/50";
  }
}

function getAttrActiveDot(color: string) {
  switch (color) {
    case "emerald": return "bg-emerald-400";
    case "rose": return "bg-rose-400";
    case "amber": return "bg-amber-400";
    case "sky": return "bg-sky-400";
    case "orange": return "bg-orange-400";
    default: return "bg-zinc-400";
  }
}

// --- Subfolder List (matches main sidebar sub-item pattern) ---

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

  // Report count to parent (using ref to avoid infinite loop)
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
      <div className="flex items-center gap-2 py-2 pl-8 text-zinc-500">
        <Loader2 className="h-3 w-3 animate-spin" />
        <span className="text-[12px]">Carregando...</span>
      </div>
    );
  }

  if (subfolders.length === 0) {
    return (
      <div className="py-2 pl-8 text-zinc-600 text-[12px]">
        Nenhuma subpasta
      </div>
    );
  }

  const recents = getRecents();
  const recentIds = new Set(recents.map((r) => r.id));
  const showSearch = subfolders.length > 5;

  return (
    <div className="overflow-hidden transition-all duration-300 ease-in-out opacity-100">
      {/* Inline search (shows when 6+ subfolders) */}
      {showSearch && (
        <div className="relative mx-3 mb-1">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-zinc-500" />
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filtrar assistidos..."
            className="w-full h-7 pl-7 pr-7 text-[11px] bg-zinc-800/60 border border-zinc-700/40 rounded-lg text-zinc-300 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600/60 focus:bg-zinc-800/80 transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => { setSearchQuery(""); searchInputRef.current?.focus(); }}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      )}

      {/* Scrollable list */}
      <div className="relative pl-4 space-y-0.5 max-h-[280px] overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-700/50 scrollbar-track-transparent">
        {/* Vertical connector line */}
        <div className={cn(
          "absolute left-[22px] top-1 bottom-1 w-px bg-gradient-to-b",
          getAttrConnectorGradient(color)
        )} />

        {filteredFolders.length === 0 ? (
          <div className="py-2 pl-4 text-zinc-600 text-[11px]">
            Nenhum resultado para &ldquo;{searchQuery}&rdquo;
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
                  "flex items-center gap-2 w-full text-left px-3 py-1.5 transition-all duration-300 rounded-lg group/subitem relative",
                  isActive
                    ? getAttrSubItemActive(color)
                    : "text-zinc-500 hover:text-zinc-200 hover:bg-zinc-700/40"
                )}
              >
                {/* Horizontal connection indicator */}
                <div className={cn(
                  "absolute left-[-12px] w-2 h-px transition-all duration-200",
                  isActive ? getAttrSubItemConnector(color) : "bg-zinc-700/50"
                )} />
                <FolderOpen className={cn(
                  "h-3.5 w-3.5 shrink-0 transition-all duration-300",
                  isActive ? "" : "text-zinc-500 group-hover/subitem:text-zinc-300"
                )} />
                <span className="truncate text-[12px]">{folder.name}</span>
                {isRecent && !isActive && (
                  <span className={cn(
                    "h-1.5 w-1.5 rounded-full shrink-0 ml-auto",
                    getAttrActiveDot(color)
                  )} />
                )}
                {isActive && (
                  <div className={cn(
                    "absolute right-2 w-1 h-1 rounded-full",
                    getAttrActiveDot(color)
                  )} />
                )}
              </button>
            );
          })
        )}
      </div>

      {/* Result count when filtering */}
      {searchQuery && filteredFolders.length > 0 && (
        <div className="px-7 py-0.5 text-[10px] text-zinc-600">
          {filteredFolders.length} de {subfolders.length}
        </div>
      )}
    </div>
  );
}

// --- Gradient Divider (matches main sidebar) ---

function NavDivider() {
  return <div className="my-3 mx-3 h-px bg-gradient-to-r from-zinc-700/60 via-zinc-700/30 to-transparent" />;
}

// --- Sidebar Content ---

function SidebarContent({ collapsed }: { collapsed: boolean }) {
  const ctx = useDriveContext();
  const [expandedAtribuicoes, setExpandedAtribuicoes] = useState<Set<string>>(
    new Set()
  );
  const [recents, setRecents] = useState<RecentItem[]>([]);
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [subfolderCounts, setSubfolderCounts] = useState<Record<string, number>>({});

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
      <div className="flex flex-col h-full overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-zinc-700/50 scrollbar-track-transparent">
        <div className="px-3 pb-5 pt-2">
          {/* --- ATRIBUICOES --- */}
          <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider px-2 pb-2 flex items-center gap-1.5">
            <HardDrive className="h-3 w-3" />
            Atribuicoes
          </p>
          <div className="space-y-0.5">
            {DRIVE_ATRIBUICOES.map((attr) => {
              const isActive = ctx.selectedAtribuicao === attr.key;
              const isExpanded = expandedAtribuicoes.has(attr.key);
              const Icon = attr.icon;
              const synced = isSynced(attr.folderId);

              return (
                <div key={attr.key} className="space-y-0.5">
                  {/* Main atribuicao button (matches collapsible group pattern) */}
                  <div className="flex items-center">
                    <button
                      onClick={() => {
                        ctx.setSelectedAtribuicao(attr.key);
                        if (!isExpanded) toggleExpand(attr.key);
                      }}
                      className={cn(
                        "w-full h-10 transition-all duration-300 rounded-xl flex items-center px-3 group/item",
                        isActive
                          ? getAttrActiveBg(attr.color)
                          : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-700/60"
                      )}
                    >
                      <div className={cn(
                        "h-7 w-7 rounded-lg flex items-center justify-center mr-2 transition-all duration-300",
                        isActive
                          ? getAttrActiveIconBg(attr.color)
                          : "bg-zinc-700/50 group-hover/item:bg-zinc-600/60"
                      )}>
                        <Icon className={cn(
                          "h-4 w-4 transition-all duration-300",
                          isActive ? "" : "text-zinc-400 group-hover/item:text-zinc-200"
                        )} strokeWidth={isActive ? 2.5 : 2} />
                      </div>
                      <span className="text-[13px] font-medium truncate">{attr.label}</span>
                      {!synced && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="h-1.5 w-1.5 rounded-full bg-zinc-600 shrink-0 ml-1" />
                          </TooltipTrigger>
                          <TooltipContent side="right" className="bg-[#1f1f23] border-zinc-700/50 text-zinc-200 shadow-xl shadow-black/30">
                            Pasta nao sincronizada
                          </TooltipContent>
                        </Tooltip>
                      )}
                      {subfolderCounts[attr.key] != null && subfolderCounts[attr.key] > 0 && (
                        <span className="text-[10px] tabular-nums text-zinc-500 ml-auto mr-1">
                          {subfolderCounts[attr.key]}
                        </span>
                      )}
                      <ChevronDown
                        className={cn(
                          "h-4 w-4 ml-auto transition-transform duration-300 shrink-0",
                          isExpanded && "rotate-180"
                        )}
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleExpand(attr.key);
                        }}
                      />
                    </button>
                  </div>

                  {/* Sub-folders (animated, with connector line) */}
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

          <NavDivider />

          {/* --- ESPECIAIS --- */}
          <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider px-2 pb-2">
            Especiais
          </p>
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
                    "w-full h-10 transition-all duration-300 rounded-xl flex items-center px-3 group/item relative overflow-hidden",
                    isActive
                      ? "bg-white/95 text-zinc-900 shadow-lg shadow-white/10 font-semibold"
                      : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-700/60"
                  )}
                >
                  <div className={cn(
                    "h-7 w-7 rounded-lg flex items-center justify-center mr-2 transition-all duration-300",
                    isActive
                      ? "bg-zinc-900/10"
                      : "bg-zinc-700/50 group-hover/item:bg-zinc-600/60"
                  )}>
                    <Icon className={cn(
                      "h-4 w-4 transition-all duration-300",
                      isActive ? "text-zinc-900" : "text-zinc-400 group-hover/item:text-zinc-200"
                    )} strokeWidth={isActive ? 2.5 : 2} />
                  </div>
                  <span className="text-[13px] font-medium truncate">{sf.label}</span>
                  {sf.key === "DISTRIBUICAO" && (
                    <Badge
                      variant="outline"
                      className="ml-auto text-[10px] px-1.5 py-0 h-4 bg-violet-500/10 border-violet-500/30 text-violet-400"
                    >
                      Novo
                    </Badge>
                  )}
                  {isActive && !sf.key.includes("DISTRIBUICAO") && (
                    <div className="absolute right-3 w-1.5 h-1.5 rounded-full bg-zinc-900/40" />
                  )}
                </button>
              );
            })}
          </div>

          <NavDivider />

          {/* --- ACESSO RAPIDO --- */}
          <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider px-2 pb-2 flex items-center gap-1.5">
            <Clock className="h-3 w-3" />
            Acesso Rapido
          </p>
          <div className="space-y-1">
            {/* Recentes */}
            {recents.length === 0 ? (
              <div className="px-5 py-1 text-zinc-600 text-[12px]">
                Nenhum acesso recente
              </div>
            ) : (
              <div className="relative pl-4 space-y-0.5">
                <div className="absolute left-[22px] top-1 bottom-1 w-px bg-gradient-to-b from-zinc-500/30 via-zinc-700/40 to-transparent" />
                {recents.slice(0, 5).map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      ctx.navigateToFolder(item.id, item.name);
                    }}
                    className={cn(
                      "flex items-center gap-2 w-full text-left px-3 py-1.5 transition-all duration-300 rounded-lg group/subitem relative",
                      "text-zinc-500 hover:text-zinc-200 hover:bg-zinc-700/40"
                    )}
                  >
                    <div className="absolute left-[-12px] w-2 h-px bg-zinc-700/50" />
                    <FolderOpen className="h-3.5 w-3.5 shrink-0 text-zinc-500 group-hover/subitem:text-zinc-300" />
                    <span className="truncate text-[12px]">{item.name}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Favoritos */}
            {favorites.length > 0 && (
              <>
                <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-wider px-5 pt-2 pb-1 flex items-center gap-1.5">
                  <Star className="h-3 w-3 text-amber-500/60" />
                  Favoritos
                </p>
                <div className="relative pl-4 space-y-0.5">
                  <div className="absolute left-[22px] top-1 bottom-1 w-px bg-gradient-to-b from-amber-500/30 via-zinc-700/40 to-transparent" />
                  {favorites.slice(0, 5).map((item) => (
                    <button
                      key={item.id}
                      onClick={() => {
                        ctx.navigateToFolder(item.id, item.name);
                      }}
                      className={cn(
                        "flex items-center gap-2 w-full text-left px-3 py-1.5 transition-all duration-300 rounded-lg group/subitem relative",
                        "text-zinc-500 hover:text-zinc-200 hover:bg-zinc-700/40"
                      )}
                    >
                      <div className="absolute left-[-12px] w-2 h-px bg-zinc-700/50" />
                      <Star className="h-3.5 w-3.5 shrink-0 text-amber-500/60 group-hover/subitem:text-amber-400" />
                      <span className="truncate text-[12px]">{item.name}</span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* --- Footer (matches main sidebar footer gradient) --- */}
        {stats && (
          <div className={cn(
            "mt-auto px-4 py-3 border-t border-zinc-700/30",
            "bg-gradient-to-t from-[#1a1a1e] via-[#1f1f23] to-transparent"
          )}>
            <div className="flex items-center justify-between text-[10px] text-zinc-500">
              <span className="tabular-nums">{stats.totalFiles} arquivos</span>
              <span className="tabular-nums">{stats.syncedFolders} pastas</span>
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
      {/* --- Desktop Sidebar (matches main sidebar DNA) --- */}
      <aside
        className={cn(
          "hidden md:flex flex-col shrink-0 transition-all duration-300",
          "border-r border-zinc-700/30",
          "bg-gradient-to-b from-[#1f1f23] via-[#1a1a1e] to-[#1f1f23]",
          "shadow-2xl shadow-black/50",
          collapsed ? "w-0 overflow-hidden" : "w-60"
        )}
      >
        {/* Header (matches main sidebar header gradient) */}
        <div className={cn(
          "flex items-center justify-between h-12 px-3 border-b border-zinc-700/30",
          "bg-gradient-to-br from-[#252529] via-[#1f1f23] to-[#252529]"
        )}>
          {!collapsed && (
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded-md bg-zinc-700/50 flex items-center justify-center">
                <HardDrive className="h-3.5 w-3.5 text-zinc-400" />
              </div>
              <span className="text-[13px] font-semibold text-zinc-300">
                Drive
              </span>
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-700/60 rounded-lg"
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
          className="hidden md:flex h-8 w-8 absolute left-1 top-16 z-10 text-zinc-500 hover:text-zinc-300 bg-[#1f1f23] border border-zinc-700/30 rounded-xl hover:bg-zinc-700/60 shadow-lg shadow-black/20"
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
            className={cn(
              "w-72 p-0 border-zinc-700/30",
              "bg-gradient-to-b from-[#1f1f23] via-[#1a1a1e] to-[#1f1f23]"
            )}
          >
            <SheetTitle className="sr-only">Menu de navegacao do Drive</SheetTitle>
            <div className={cn(
              "h-12 flex items-center px-4 border-b border-zinc-700/30",
              "bg-gradient-to-br from-[#252529] via-[#1f1f23] to-[#252529]"
            )}>
              <div className="flex items-center gap-2">
                <div className="h-6 w-6 rounded-md bg-zinc-700/50 flex items-center justify-center">
                  <HardDrive className="h-3.5 w-3.5 text-zinc-400" />
                </div>
                <span className="text-[13px] font-semibold text-zinc-300">
                  Drive
                </span>
              </div>
            </div>
            <SidebarContent collapsed={false} />
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
}
