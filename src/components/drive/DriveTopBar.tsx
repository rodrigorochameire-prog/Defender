"use client";

import { useState, useCallback, useMemo } from "react";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc/client";
import { useDriveContext } from "./DriveContext";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from "@/components/ui/tooltip";
import {
  RefreshCw,
  Upload,
  LayoutGrid,
  List,
  FilePlus2,
  FileText,
  Scale,
  Shield,
  MessageSquare,
  Send,
  Gavel,
  Mail,
  FolderOpen,
  FolderPlus,
  Loader2,
  ExternalLink,
  Activity,
} from "lucide-react";
import { toast } from "sonner";
import { useProcessingQueue } from "@/contexts/processing-queue";
import { ProcessingQueuePanel } from "./ProcessingQueuePanel";
import { showProgressToast, completeProgressToast, failProgressToast } from "@/components/ui/progress-toast";

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
        <span className={cn("h-2 w-2 rounded-full shrink-0 cursor-default", config.dotClass)} />
      </TooltipTrigger>
      <TooltipContent side="bottom">
        <div className="space-y-1">
          <p className="font-medium">{config.label}</p>
          <p className="text-zinc-400 text-[10px]">{timeSinceSync}</p>
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

// ─── Category Config ────────────────────────────────────────────────

const CATEGORY_CONFIG: Record<string, { label: string; icon: React.ElementType }> = {
  peticao: { label: "Peticoes", icon: FileText },
  hc: { label: "Habeas Corpus", icon: Shield },
  alegacoes: { label: "Alegacoes Finais", icon: Scale },
  resposta: { label: "Resposta a Acusacao", icon: MessageSquare },
  recurso: { label: "Recursos", icon: Send },
  oficio: { label: "Oficios", icon: Mail },
  outros: { label: "Outros", icon: FolderOpen },
};

// ─── New Document Button ────────────────────────────────────────────

function NewDocumentButton() {
  const ctx = useDriveContext();
  const [open, setOpen] = useState(false);

  const targetFolderId = ctx.selectedFolderId || ctx.rootSyncFolderId;

  const { data: templates, isLoading } = trpc.templates.list.useQuery(
    undefined,
    { enabled: open, staleTime: 60_000 }
  );

  const generateMutation = trpc.templates.generateFromTemplate.useMutation({
    onSuccess: (result) => {
      setOpen(false);
      toast.success(`Documento "${result.fileName}" criado!`, {
        action: {
          label: "Abrir",
          onClick: () => window.open(result.webViewLink, "_blank"),
        },
      });
    },
    onError: (err) => {
      toast.error(`Erro ao criar documento: ${err.message}`);
    },
  });

  // Group templates by category
  const grouped = useMemo(() => {
    if (!templates) return {};
    const map: Record<string, typeof templates> = {};
    for (const t of templates) {
      const cat = t.category || "outros";
      if (!map[cat]) map[cat] = [];
      map[cat].push(t);
    }
    return map;
  }, [templates]);

  const categoryOrder = ["peticao", "hc", "alegacoes", "resposta", "recurso", "oficio", "outros"];
  const sortedCategories = categoryOrder.filter((c) => grouped[c]?.length);

  const handleSelect = (templateId: number, templateName: string) => {
    if (!targetFolderId) {
      toast.error("Navegue ate uma pasta antes de criar um documento");
      return;
    }
    generateMutation.mutate({
      templateId,
      targetFolderId,
      fileName: templateName,
    });
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-zinc-500 hover:text-emerald-600 dark:text-zinc-400 dark:hover:text-emerald-400"
              disabled={!targetFolderId}
            >
              <FilePlus2 className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          {targetFolderId ? "Novo documento a partir de template" : "Navegue ate uma pasta para criar documentos"}
        </TooltipContent>
      </Tooltip>
      <PopoverContent
        align="end"
        className="w-72 p-0 max-h-[400px] overflow-y-auto"
      >
        <div className="px-3 py-2 border-b border-zinc-100 dark:border-zinc-800">
          <p className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
            Novo Documento
          </p>
          <p className="text-[10px] text-zinc-400 mt-0.5">
            Escolha um template para criar na pasta atual
          </p>
        </div>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-4 w-4 animate-spin text-zinc-400" />
          </div>
        ) : sortedCategories.length === 0 ? (
          <div className="py-6 text-center">
            <FileText className="h-6 w-6 mx-auto mb-2 text-zinc-300" />
            <p className="text-xs text-zinc-400">
              Nenhum template cadastrado
            </p>
            <p className="text-[10px] text-zinc-400 mt-1">
              Cadastre templates na area de administracao
            </p>
          </div>
        ) : (
          <div className="py-1">
            {sortedCategories.map((cat) => {
              const config = CATEGORY_CONFIG[cat] || CATEGORY_CONFIG.outros;
              const Icon = config.icon;
              const items = grouped[cat] || [];
              return (
                <div key={cat}>
                  <div className="flex items-center gap-1.5 px-3 py-1.5 mt-1">
                    <Icon className="h-3 w-3 text-zinc-400" />
                    <span className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                      {config.label}
                    </span>
                  </div>
                  {items.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => handleSelect(t.id, t.name)}
                      disabled={generateMutation.isPending}
                      className={cn(
                        "w-full flex items-center gap-2 px-3 py-1.5 text-left transition-colors",
                        "hover:bg-emerald-50 dark:hover:bg-emerald-950/30",
                        "disabled:opacity-50 disabled:cursor-not-allowed"
                      )}
                    >
                      <FileText className="h-3.5 w-3.5 text-emerald-600/60 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-zinc-700 dark:text-zinc-300 truncate">
                          {t.name}
                        </p>
                        {t.description && (
                          <p className="text-[10px] text-zinc-400 truncate">
                            {t.description}
                          </p>
                        )}
                      </div>
                      {generateMutation.isPending && generateMutation.variables?.templateId === t.id ? (
                        <Loader2 className="h-3 w-3 animate-spin text-emerald-500 shrink-0" />
                      ) : (
                        <ExternalLink className="h-3 w-3 text-zinc-300 shrink-0" />
                      )}
                    </button>
                  ))}
                </div>
              );
            })}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

// ─── New Folder Button ──────────────────────────────────────────────

function NewFolderButton() {
  const ctx = useDriveContext();
  const utils = trpc.useUtils();
  const targetFolderId = ctx.selectedFolderId || ctx.rootSyncFolderId;

  const createFolder = trpc.drive.createFolder.useMutation({
    onSuccess: (result) => {
      toast.success(`Pasta "${result.name}" criada`);
      utils.drive.files.invalidate();
    },
    onError: (err) => {
      toast.error(`Erro ao criar pasta: ${err.message}`);
    },
  });

  const handleCreateFolder = () => {
    if (!targetFolderId) {
      toast.error("Navegue ate uma pasta antes de criar subpastas");
      return;
    }
    const name = window.prompt("Nome da nova pasta:");
    if (!name?.trim()) return;

    createFolder.mutate({
      name: name.trim(),
      parentFolderId: targetFolderId,
    });
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-zinc-500 hover:text-emerald-600 dark:text-zinc-400 dark:hover:text-emerald-400"
          onClick={handleCreateFolder}
          disabled={!targetFolderId || createFolder.isPending}
        >
          {createFolder.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <FolderPlus className="h-4 w-4" />
          )}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom">
        {targetFolderId ? "Criar nova pasta" : "Navegue ate uma pasta para criar subpastas"}
      </TooltipContent>
    </Tooltip>
  );
}

// ─── Main TopBar ────────────────────────────────────────────────────

export function DriveTopBar() {
  const ctx = useDriveContext();

  const syncAll = trpc.drive.syncAll.useMutation();
  const utils = trpc.useUtils();
  const { addJob, completeJob, failJob, activeCount } = useProcessingQueue();

  const handleSyncAll = useCallback(() => {
    const syncJobId = "sync-drive-topbar";
    addJob({ id: syncJobId, type: "sync", label: "Google Drive", status: "running", progress: -1, detail: "Sincronizando pastas..." });
    showProgressToast({ id: syncJobId, type: "sync", label: "Google Drive", progress: -1, detail: "Sincronizando pastas..." });

    syncAll.mutate(undefined, {
      onSuccess: () => {
        completeJob(syncJobId, "Pastas sincronizadas");
        completeProgressToast(syncJobId, "Drive sincronizado com sucesso");
        utils.drive.syncFolders.invalidate();
        utils.drive.stats.invalidate();
        utils.drive.healthStatus.invalidate();
      },
      onError: (err) => {
        failJob(syncJobId, err.message);
        failProgressToast(syncJobId, err.message);
      },
    });
  }, [syncAll, utils, addJob, completeJob, failJob]);

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex items-center gap-1.5 sm:gap-2 h-10 px-3 sm:px-4 border-b border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-900 shrink-0">
        {/* ─── Spacer for mobile hamburger area ─── */}
        <div className="w-8 lg:hidden" />

        {/* ─── Health + Actions ─── */}
        <div className="flex items-center gap-1.5 sm:gap-2 ml-auto">
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

          {/* New Folder */}
          <span className="hidden sm:inline-flex">
            <NewFolderButton />
          </span>

          {/* Upload Placeholder */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="hidden sm:inline-flex h-8 w-8 text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
                onClick={() => {
                  // TODO: implement upload
                }}
              >
                <Upload className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Upload de arquivo</TooltipContent>
          </Tooltip>

          {/* New Document from Template */}
          <span className="hidden sm:inline-flex">
            <NewDocumentButton />
          </span>

          {/* Processing Queue */}
          <ProcessingQueuePanel>
            <button
              className={cn(
                "h-8 w-8 inline-flex items-center justify-center gap-1 rounded-md transition-colors",
                activeCount > 0
                  ? "bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400"
                  : "text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              )}
              title="Fila de processamento"
            >
              <Activity className={cn("h-3.5 w-3.5", activeCount > 0 && "animate-pulse")} />
              {activeCount > 0 && (
                <span className="text-[10px] font-medium">{activeCount}</span>
              )}
            </button>
          </ProcessingQueuePanel>

          {/* ─── Separator ─── */}
          <div className="h-5 w-px bg-zinc-200 dark:bg-zinc-700 mx-0.5 hidden sm:block" />

          {/* ─── View Mode Toggle ─── */}
          <div className="hidden sm:flex items-center rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800">
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
