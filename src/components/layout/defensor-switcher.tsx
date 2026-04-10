"use client";

import { useEffect } from "react";
import { cn } from "@/lib/utils";
import { getInitials } from "@/lib/utils";
import { useDefensor } from "@/contexts/defensor-context";
import { trpc } from "@/lib/trpc/client";
import { Eye, ChevronRight, Users } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";

export function DefensorSwitcher({ collapsed = false }: { collapsed?: boolean }) {
  const {
    selectedDefensorId,
    selectedDefensor,
    defensores,
    setSelectedDefensorId,
    setDefensores,
    includeAll,
    setIncludeAll,
    isLoading: contextLoading,
  } = useDefensor();

  const { data, isLoading: queryLoading } = trpc.users.workspaceDefensores.useQuery();

  // Sincronizar defensores do tRPC com o contexto
  useEffect(() => {
    if (data) {
      setDefensores(data);
    }
  }, [data, setDefensores]);

  const isLoading = contextLoading || queryLoading;

  if (isLoading || defensores.length === 0) {
    if (collapsed) return null;
    return (
      <div className="px-3 py-2">
        <div className="h-10 bg-muted rounded-lg animate-pulse" />
      </div>
    );
  }

  const displayName = selectedDefensor
    ? selectedDefensor.name.split(" ").slice(0, 2).join(" ")
    : "Visao Geral";

  const displayInitial = selectedDefensor
    ? getInitials(selectedDefensor.name).charAt(0)
    : null;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className={cn(
            "w-full flex items-center gap-2 rounded-lg transition-all",
            "hover:bg-sidebar-accent/50 cursor-pointer",
            collapsed ? "justify-center p-2" : "px-3 py-2"
          )}
        >
          {selectedDefensor ? (
            <span className="flex-shrink-0 w-7 h-7 rounded-md bg-zinc-800 text-white dark:bg-zinc-200 dark:text-zinc-900 flex items-center justify-center text-xs font-semibold">
              {displayInitial}
            </span>
          ) : (
            <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
              <Eye className="h-4 w-4 text-muted-foreground" />
            </div>
          )}
          {!collapsed && (
            <div className="flex-1 text-left min-w-0">
              <p className="text-sm font-medium truncate">{displayName}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Defensor</p>
            </div>
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent
        side="right"
        align="start"
        className="w-64 p-0"
        sideOffset={8}
      >
        {/* Header: DEFENSOR */}
        <div className="px-4 py-3 border-b">
          <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-wider">
            <Eye className="h-3 w-3" />
            Defensor
          </div>
        </div>

        {/* Lista de defensores */}
        <div className="py-1.5 max-h-[280px] overflow-y-auto">
          {defensores.map((defensor) => {
            const isActive = selectedDefensorId === defensor.id;
            const initial = getInitials(defensor.name).charAt(0);
            const shortName = defensor.name.split(" ").slice(0, 2).join(" ");

            return (
              <button
                key={defensor.id}
                onClick={() => setSelectedDefensorId(defensor.id)}
                className={cn(
                  "w-full flex items-center gap-2.5 px-3 py-1.5 text-left transition-all cursor-pointer",
                  isActive
                    ? "bg-zinc-100 dark:bg-white/[0.06] font-medium"
                    : "hover:bg-zinc-50 dark:hover:bg-white/[0.04] text-muted-foreground"
                )}
              >
                <span className={cn(
                  "flex-shrink-0 w-6 h-6 rounded-md flex items-center justify-center text-[11px] font-semibold",
                  isActive
                    ? "bg-zinc-800 text-white dark:bg-zinc-200 dark:text-zinc-900"
                    : "bg-zinc-200/80 text-zinc-500 dark:bg-zinc-700 dark:text-zinc-400"
                )}>
                  {initial}
                </span>
                <span className="text-sm truncate">
                  {shortName}
                </span>
              </button>
            );
          })}
        </div>

        {/* Visao Geral */}
        <div className="px-3 pb-3">
          <button
            onClick={() => setSelectedDefensorId(null)}
            className={cn(
              "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all",
              selectedDefensorId === null
                ? "bg-primary/10 text-primary font-medium"
                : "hover:bg-muted text-muted-foreground"
            )}
          >
            <Eye className="h-4 w-4" />
            Visao Geral
          </button>
        </div>

        {/* MODO ADMIN */}
        <div className="border-t px-4 py-3">
          <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">
            <Users className="h-3 w-3" />
            Modo Admin
            <ChevronRight className="h-3 w-3 ml-auto" />
          </div>
          <label className="flex items-center justify-between cursor-pointer">
            <span className="text-xs text-muted-foreground">Incluir todos os registros</span>
            <Switch
              checked={includeAll}
              onCheckedChange={setIncludeAll}
            />
          </label>
        </div>
      </PopoverContent>
    </Popover>
  );
}
