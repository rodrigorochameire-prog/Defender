"use client";

import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc/client";
import { useDriveContext } from "./DriveContext";
import { getAtribuicaoByKey } from "./drive-constants";
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
  AlignJustify,
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
  Search,
  X,
  ChevronLeft,
  ChevronRight,
  Plus,
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

  const statusConfig = {
    healthy: { dotClass: "bg-emerald-500", label: "Sync OK" },
    degraded: { dotClass: "bg-amber-500", label: "Sync degradado" },
    critical: { dotClass: "bg-red-500", label: "Sync critico" },
  };

  const config = statusConfig[health.status] || statusConfig.healthy;

  let timeSinceSync = "";
  if (health.lastSyncAgo !== null) {
    const minutes = Math.floor(health.lastSyncAgo / 60_000);
    if (minutes < 1) timeSinceSync = "< 1 min";
    else if (minutes < 60) timeSinceSync = `${minutes} min`;
    else timeSinceSync = `${Math.floor(minutes / 60)}h`;
  } else if (syncFolders && syncFolders.length > 0) {
    const mostRecent = syncFolders
      .filter((f: { lastSyncAt: Date | null }) => f.lastSyncAt)
      .sort((a: { lastSyncAt: Date | null }, b: { lastSyncAt: Date | null }) =>
        new Date(b.lastSyncAt!).getTime() - new Date(a.lastSyncAt!).getTime()
      )[0];
    if (mostRecent?.lastSyncAt) {
      const minutes = Math.floor((Date.now() - new Date(mostRecent.lastSyncAt).getTime()) / 60_000);
      if (minutes < 1) timeSinceSync = "< 1 min";
      else if (minutes < 60) timeSinceSync = `${minutes} min`;
      else timeSinceSync = `${Math.floor(minutes / 60)}h`;
    }
  }
  if (!timeSinceSync) timeSinceSync = "nunca";

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className={cn("h-2 w-2 rounded-full shrink-0 cursor-default", config.dotClass)} />
      </TooltipTrigger>
      <TooltipContent side="bottom">
        <div className="space-y-0.5">
          <p className="font-medium text-xs">{config.label}</p>
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
    generateMutation.mutate({ templateId, targetFolderId, fileName: templateName });
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-zinc-400 hover:text-emerald-600 dark:hover:text-emerald-400"
              disabled={!targetFolderId}
            >
              <FilePlus2 className="h-3.5 w-3.5" />
            </Button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          {targetFolderId ? "Novo documento" : "Navegue ate uma pasta"}
        </TooltipContent>
      </Tooltip>
      <PopoverContent align="end" className="w-72 p-0 max-h-[400px] overflow-y-auto">
        <div className="px-3 py-2 border-b border-zinc-100 dark:border-zinc-800">
          <p className="text-xs font-medium text-zinc-700 dark:text-zinc-300">Novo Documento</p>
          <p className="text-[10px] text-zinc-400 mt-0.5">Template para a pasta atual</p>
        </div>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-4 w-4 animate-spin text-zinc-400" />
          </div>
        ) : sortedCategories.length === 0 ? (
          <div className="py-6 text-center">
            <FileText className="h-6 w-6 mx-auto mb-2 text-zinc-300" />
            <p className="text-xs text-zinc-400">Nenhum template cadastrado</p>
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
                        <p className="text-xs text-zinc-700 dark:text-zinc-300 truncate">{t.name}</p>
                        {t.description && (
                          <p className="text-[10px] text-zinc-400 truncate">{t.description}</p>
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
    createFolder.mutate({ name: name.trim(), parentFolderId: targetFolderId });
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-zinc-400 hover:text-emerald-600 dark:hover:text-emerald-400"
          onClick={handleCreateFolder}
          disabled={!targetFolderId || createFolder.isPending}
        >
          {createFolder.isPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <FolderPlus className="h-3.5 w-3.5" />
          )}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom">
        {targetFolderId ? "Nova pasta" : "Navegue ate uma pasta"}
      </TooltipContent>
    </Tooltip>
  );
}

// ─── Inline Breadcrumbs ─────────────────────────────────────────────

function InlineBreadcrumbs({ fileCount }: { fileCount?: number }) {
  const ctx = useDriveContext();
  const atribuicao = ctx.selectedAtribuicao
    ? getAtribuicaoByKey(ctx.selectedAtribuicao)
    : null;

  if (ctx.breadcrumbPath.length === 0 && !ctx.selectedAtribuicao) {
    return null;
  }

  return (
    <div className="flex items-center gap-1 min-w-0 overflow-hidden">
      {/* Back button */}
      {ctx.breadcrumbPath.length > 0 && (
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 mr-0.5 text-zinc-400 hover:text-zinc-700 dark:text-zinc-500 dark:hover:text-zinc-300 shrink-0"
          onClick={() => ctx.navigateBack()}
        >
          <ChevronLeft className="h-3.5 w-3.5" />
        </Button>
      )}

      {/* Atribuicao root */}
      {atribuicao && (
        <>
          <button
            onClick={() => ctx.setSelectedAtribuicao(ctx.selectedAtribuicao)}
            className={cn(
              "flex items-center gap-1 text-xs font-medium transition-colors shrink-0",
              ctx.breadcrumbPath.length === 0
                ? "text-zinc-800 dark:text-zinc-200 cursor-default"
                : "text-zinc-400 hover:text-zinc-700 dark:text-zinc-500 dark:hover:text-zinc-300 cursor-pointer"
            )}
          >
            <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", atribuicao.dotClass)} />
            <span>{atribuicao.label}</span>
          </button>
          {ctx.breadcrumbPath.length > 0 && (
            <ChevronRight className="h-3 w-3 text-zinc-300 dark:text-zinc-600 shrink-0" />
          )}
        </>
      )}

      {/* Path segments */}
      {ctx.breadcrumbPath.map((segment, index) => {
        const isLast = index === ctx.breadcrumbPath.length - 1;
        const isDeep = ctx.breadcrumbPath.length > 3 && index < ctx.breadcrumbPath.length - 2 && index > 0;
        if (isDeep) return null;
        // Show ellipsis when path is deep and this is the first hidden segment's position
        const showEllipsis = ctx.breadcrumbPath.length > 3 && index === 1 && !isLast;
        if (showEllipsis) {
          return (
            <div key={segment.id} className="flex items-center gap-0.5 shrink-0">
              <span className="text-xs text-zinc-400 dark:text-zinc-600 px-0.5">...</span>
              <ChevronRight className="h-3 w-3 text-zinc-300 dark:text-zinc-600 shrink-0" />
            </div>
          );
        }
        return (
          <div
            key={segment.id}
            className="flex items-center gap-0.5 shrink-0 min-w-0 animate-in fade-in duration-200"
          >
            <button
              onClick={() => { if (!isLast) ctx.navigateToBreadcrumb(index); }}
              className={cn(
                "text-xs transition-colors duration-150 max-w-[160px] truncate",
                isLast
                  ? "text-zinc-800 dark:text-zinc-200 font-medium cursor-default"
                  : "text-zinc-400 hover:text-zinc-700 dark:text-zinc-500 dark:hover:text-zinc-300 cursor-pointer"
              )}
            >
              {segment.name}
            </button>
            {!isLast && (
              <ChevronRight className="h-3 w-3 text-zinc-300 dark:text-zinc-600 shrink-0" />
            )}
          </div>
        );
      })}

      {/* File count */}
      {fileCount != null && fileCount > 0 && (
        <span className="text-[10px] text-zinc-400 dark:text-zinc-500 tabular-nums ml-1.5 shrink-0">
          {fileCount} arquivo{fileCount !== 1 ? "s" : ""}
        </span>
      )}
    </div>
  );
}

// ─── Expandable Search ──────────────────────────────────────────────

function ExpandableSearch() {
  const ctx = useDriveContext();
  const [expanded, setExpanded] = useState(false);
  const [localSearch, setLocalSearch] = useState(ctx.searchQuery);
  const inputRef = useRef<HTMLInputElement>(null);
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
    if (ctx.searchQuery) setExpanded(true);
  }, [ctx.searchQuery]);

  useEffect(() => {
    return () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); };
  }, []);

  useEffect(() => {
    if (expanded) inputRef.current?.focus();
  }, [expanded]);

  const handleClose = () => {
    setLocalSearch("");
    ctx.setSearchQuery("");
    setExpanded(false);
  };

  if (!expanded) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300"
            onClick={() => setExpanded(true)}
          >
            <Search className="h-3.5 w-3.5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">Buscar (Ctrl+K)</TooltipContent>
      </Tooltip>
    );
  }

  return (
    <div className="relative flex items-center">
      <Search className="absolute left-2 h-3 w-3 text-zinc-400 pointer-events-none" />
      <input
        ref={inputRef}
        type="text"
        value={localSearch}
        onChange={(e) => handleChange(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Escape") handleClose(); }}
        placeholder="Buscar..."
        className={cn(
          "h-7 w-40 pl-7 pr-7 rounded-md text-xs",
          "bg-zinc-100 dark:bg-zinc-800/60 border border-zinc-200/80 dark:border-zinc-700/40",
          "text-zinc-700 dark:text-zinc-200 placeholder:text-zinc-400 dark:placeholder:text-zinc-500",
          "focus:outline-none focus:ring-1 focus:ring-emerald-500/30 focus:border-emerald-500/30",
          "transition-all duration-200"
        )}
      />
      <button
        onClick={handleClose}
        className="absolute right-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}

// ─── Add Menu (unified create actions) ───────────────────────────────

function AddMenu() {
  const ctx = useDriveContext();
  const utils = trpc.useUtils();
  const [open, setOpen] = useState(false);
  const targetFolderId = ctx.selectedFolderId || ctx.rootSyncFolderId;

  const createFolder = trpc.drive.createFolder.useMutation({
    onSuccess: (result) => {
      toast.success(`Pasta "${result.name}" criada`);
      utils.drive.files.invalidate();
    },
    onError: (err) => toast.error(`Erro ao criar pasta: ${err.message}`),
  });

  const { data: templates } = trpc.templates.list.useQuery(undefined, {
    enabled: open,
    staleTime: 60_000,
  });

  const generateMutation = trpc.templates.generateFromTemplate.useMutation({
    onSuccess: (result) => {
      setOpen(false);
      toast.success(`Documento "${result.fileName}" criado!`, {
        action: { label: "Abrir", onClick: () => window.open(result.webViewLink, "_blank") },
      });
    },
    onError: (err) => toast.error(`Erro ao criar documento: ${err.message}`),
  });

  const handleNewFolder = () => {
    setOpen(false);
    if (!targetFolderId) {
      toast.error("Navegue ate uma pasta antes de criar subpastas");
      return;
    }
    const name = window.prompt("Nome da nova pasta:");
    if (!name?.trim()) return;
    createFolder.mutate({ name: name.trim(), parentFolderId: targetFolderId });
  };

  const handleUpload = () => {
    setOpen(false);
    // TODO: trigger upload flow
  };

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

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-zinc-400 hover:text-emerald-600 dark:hover:text-emerald-400"
            >
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent side="bottom">Adicionar</TooltipContent>
      </Tooltip>
      <PopoverContent align="end" className="w-56 p-0 max-h-[420px] overflow-y-auto">
        {/* Quick actions */}
        <div className="p-1 border-b border-zinc-100 dark:border-zinc-800">
          <button
            onClick={handleNewFolder}
            disabled={!targetFolderId || createFolder.isPending}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-left transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <FolderPlus className="h-3.5 w-3.5 text-zinc-500" />
            <span className="text-xs text-zinc-700 dark:text-zinc-300">Nova pasta</span>
          </button>
          <button
            onClick={handleUpload}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-left transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            <Upload className="h-3.5 w-3.5 text-zinc-500" />
            <span className="text-xs text-zinc-700 dark:text-zinc-300">Upload</span>
          </button>
        </div>

        {/* Templates */}
        {sortedCategories.length > 0 ? (
          <div className="py-1">
            <div className="px-2.5 py-1">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">Templates</span>
            </div>
            {sortedCategories.map((cat) => {
              const config = CATEGORY_CONFIG[cat] || CATEGORY_CONFIG.outros;
              const CatIcon = config.icon;
              const items = grouped[cat] || [];
              return items.map((t) => (
                <button
                  key={t.id}
                  onClick={() => {
                    if (!targetFolderId) { toast.error("Navegue ate uma pasta"); return; }
                    generateMutation.mutate({ templateId: t.id, targetFolderId, fileName: t.name });
                  }}
                  disabled={generateMutation.isPending}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 text-left transition-colors hover:bg-emerald-50 dark:hover:bg-emerald-950/30 disabled:opacity-50"
                >
                  <CatIcon className="h-3 w-3 text-emerald-600/60 shrink-0" />
                  <span className="text-xs text-zinc-700 dark:text-zinc-300 truncate flex-1">{t.name}</span>
                  {generateMutation.isPending && generateMutation.variables?.templateId === t.id && (
                    <Loader2 className="h-3 w-3 animate-spin text-emerald-500 shrink-0" />
                  )}
                </button>
              ));
            })}
          </div>
        ) : templates && templates.length === 0 ? (
          <div className="py-4 text-center">
            <p className="text-[10px] text-zinc-400">Nenhum template</p>
          </div>
        ) : null}
      </PopoverContent>
    </Popover>
  );
}

// ─── View Mode Cycle Button ──────────────────────────────────────────

const VIEW_MODES = ["list", "grid", "compact"] as const;
const VIEW_MODE_CONFIG: Record<string, { icon: React.ElementType; label: string }> = {
  list: { icon: List, label: "Lista" },
  grid: { icon: LayoutGrid, label: "Grade" },
  compact: { icon: AlignJustify, label: "Compacto" },
};

function ViewModeCycleButton() {
  const ctx = useDriveContext();
  const current = VIEW_MODE_CONFIG[ctx.viewMode] || VIEW_MODE_CONFIG.list;
  const Icon = current.icon;

  const handleCycle = () => {
    const idx = VIEW_MODES.indexOf(ctx.viewMode as typeof VIEW_MODES[number]);
    const next = VIEW_MODES[(idx + 1) % VIEW_MODES.length];
    ctx.setViewMode(next);
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300"
          onClick={handleCycle}
        >
          <Icon className="h-3.5 w-3.5" />
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom">{current.label}</TooltipContent>
    </Tooltip>
  );
}

// ─── Main TopBar ────────────────────────────────────────────────────

export function DriveTopBar({ fileCount }: { fileCount?: number }) {
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
      <div className="flex items-center gap-1.5 h-10 px-4 border-b border-zinc-200/50 dark:border-zinc-800/50 shrink-0">
        {/* Mobile hamburger spacer */}
        <div className="w-8 lg:hidden" />

        {/* Breadcrumbs (inline) */}
        <div className="flex-1 min-w-0 overflow-hidden">
          <InlineBreadcrumbs fileCount={fileCount} />
        </div>

        {/* Actions */}
        <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">
          {/* Search */}
          <ExpandableSearch />

          {/* Sync Health */}
          <SyncHealthDot />

          {/* Sync All */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300"
                onClick={handleSyncAll}
                disabled={syncAll.isPending}
              >
                <RefreshCw className={cn("h-3.5 w-3.5", syncAll.isPending && "animate-spin")} />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              {syncAll.isPending ? "Sincronizando..." : "Sincronizar"}
            </TooltipContent>
          </Tooltip>

          {/* Add Menu (New Folder + Upload + New Document) */}
          <AddMenu />

          {/* Processing Queue */}
          <ProcessingQueuePanel>
            <button
              className={cn(
                "h-7 w-7 inline-flex items-center justify-center gap-0.5 rounded-md transition-colors",
                activeCount > 0
                  ? "bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400"
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

          {/* Separator */}
          <div className="h-4 w-px bg-zinc-200/80 dark:bg-zinc-700/50 mx-0.5" />

          {/* View Mode Cycle Button */}
          <ViewModeCycleButton />
        </div>
      </div>
    </TooltipProvider>
  );
}
