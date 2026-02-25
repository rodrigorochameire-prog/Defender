"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc/client";
import { useDriveContext } from "./DriveContext";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from "@/components/ui/tooltip";
import {
  Search,
  RefreshCw,
  Upload,
  LayoutGrid,
  List,
  X,
} from "lucide-react";

// ─── Sync Health Indicator ──────────────────────────────────────────

function SyncHealthDot() {
  const { data: health, isLoading } = trpc.drive.healthStatus.useQuery(
    undefined,
    { staleTime: 30_000, refetchInterval: 60_000 }
  );

  const { data: syncFolders } = trpc.drive.syncFolders.useQuery(undefined, {
    staleTime: 30_000,
  });

  if (isLoading || !health) {
    return (
      <span className="h-2 w-2 rounded-full bg-zinc-300 dark:bg-zinc-600 animate-pulse" />
    );
  }

  // Determine color based on health status
  const statusConfig = {
    healthy: {
      dotClass: "bg-emerald-500",
      label: "Sincronizacao saudavel",
    },
    degraded: {
      dotClass: "bg-amber-500",
      label: "Sincronizacao degradada",
    },
    critical: {
      dotClass: "bg-red-500",
      label: "Sincronizacao critica",
    },
  };

  const config = statusConfig[health.status] || statusConfig.healthy;

  // Calculate time since last sync
  let timeSinceSync = "";
  if (health.lastSyncAgo !== null) {
    const minutes = Math.floor(health.lastSyncAgo / 60_000);
    if (minutes < 1) {
      timeSinceSync = "ha menos de 1 min";
    } else if (minutes < 60) {
      timeSinceSync = `ha ${minutes} min`;
    } else {
      const hours = Math.floor(minutes / 60);
      timeSinceSync = `ha ${hours}h`;
    }
  } else {
    // Fallback: use the most recent lastSyncAt from syncFolders
    if (syncFolders && syncFolders.length > 0) {
      const mostRecent = syncFolders
        .filter((f: { lastSyncAt: Date | null }) => f.lastSyncAt)
        .sort((a: { lastSyncAt: Date | null }, b: { lastSyncAt: Date | null }) =>
          new Date(b.lastSyncAt!).getTime() - new Date(a.lastSyncAt!).getTime()
        )[0];
      if (mostRecent?.lastSyncAt) {
        const diff = Date.now() - new Date(mostRecent.lastSyncAt).getTime();
        const minutes = Math.floor(diff / 60_000);
        if (minutes < 1) timeSinceSync = "ha menos de 1 min";
        else if (minutes < 60) timeSinceSync = `ha ${minutes} min`;
        else {
          const hours = Math.floor(minutes / 60);
          timeSinceSync = `ha ${hours}h`;
        }
      }
    }
    if (!timeSinceSync) {
      timeSinceSync = "nunca sincronizado";
    }
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="flex items-center gap-1.5 cursor-default">
          <span className={cn("h-2 w-2 rounded-full shrink-0", config.dotClass)} />
          <span className="text-[11px] text-zinc-500 dark:text-zinc-400 hidden sm:inline">
            {timeSinceSync}
          </span>
        </div>
      </TooltipTrigger>
      <TooltipContent side="bottom">
        <div className="space-y-1">
          <p className="font-medium">{config.label}</p>
          {health.issues.length > 0 && (
            <ul className="text-zinc-400 text-[10px] space-y-0.5">
              {health.issues.slice(0, 3).map((issue: string, i: number) => (
                <li key={i}>- {issue}</li>
              ))}
            </ul>
          )}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

// ─── Main TopBar ────────────────────────────────────────────────────

export function DriveTopBar() {
  const ctx = useDriveContext();
  const [localSearch, setLocalSearch] = useState(ctx.searchQuery);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const syncAll = trpc.drive.syncAll.useMutation();
  const utils = trpc.useUtils();

  // Debounce search
  const handleSearchChange = useCallback(
    (value: string) => {
      setLocalSearch(value);
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
      searchTimeoutRef.current = setTimeout(() => {
        ctx.setSearchQuery(value);
      }, 300);
    },
    [ctx]
  );

  // Sync local search state when context changes externally (e.g., navigation reset)
  useEffect(() => {
    setLocalSearch(ctx.searchQuery);
  }, [ctx.searchQuery]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  const handleSyncAll = useCallback(() => {
    syncAll.mutate(undefined, {
      onSuccess: () => {
        utils.drive.syncFolders.invalidate();
        utils.drive.stats.invalidate();
        utils.drive.healthStatus.invalidate();
      },
    });
  }, [syncAll, utils]);

  const clearSearch = useCallback(() => {
    setLocalSearch("");
    ctx.setSearchQuery("");
  }, [ctx]);

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex items-center gap-3 h-14 px-4 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shrink-0">
        {/* ─── Search ─── */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400 dark:text-zinc-500 pointer-events-none" />
          <input
            type="text"
            value={localSearch}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Buscar na pasta atual..."
            className={cn(
              "w-full h-9 pl-9 pr-8 rounded-lg text-sm",
              "bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700",
              "text-zinc-900 dark:text-zinc-200 placeholder:text-zinc-400 dark:placeholder:text-zinc-500",
              "focus:outline-none focus:ring-1 focus:ring-emerald-500/30 focus:border-emerald-500/30",
              "transition-colors duration-200"
            )}
          />
          {localSearch && (
            <button
              onClick={clearSearch}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300 transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* ─── Center-Right: Health + Actions ─── */}
        <div className="flex items-center gap-2 ml-auto">
          {/* Sync Health Indicator */}
          <SyncHealthDot />

          {/* Sync All Button */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
                onClick={handleSyncAll}
                disabled={syncAll.isPending}
              >
                <RefreshCw
                  className={cn(
                    "h-4 w-4",
                    syncAll.isPending && "animate-spin"
                  )}
                />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              {syncAll.isPending
                ? "Sincronizando..."
                : "Sincronizar todas as pastas"}
            </TooltipContent>
          </Tooltip>

          {/* Upload Placeholder */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
                onClick={() => {
                  console.log("[Drive] Upload button clicked — not yet implemented");
                }}
              >
                <Upload className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Upload de arquivo</TooltipContent>
          </Tooltip>

          {/* ─── Separator ─── */}
          <div className="h-5 w-px bg-zinc-200 dark:bg-zinc-700 mx-0.5" />

          {/* ─── View Mode Toggle ─── */}
          <div className="flex items-center rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800">
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => ctx.setViewMode("grid")}
                  className={cn(
                    "p-1.5 rounded-l-lg transition-colors duration-150",
                    ctx.viewMode === "grid"
                      ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-200 shadow-sm"
                      : "text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300"
                  )}
                >
                  <LayoutGrid className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Visualizacao em grade</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => ctx.setViewMode("list")}
                  className={cn(
                    "p-1.5 rounded-r-lg transition-colors duration-150",
                    ctx.viewMode === "list"
                      ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-200 shadow-sm"
                      : "text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300"
                  )}
                >
                  <List className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Visualizacao em lista</TooltipContent>
            </Tooltip>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
