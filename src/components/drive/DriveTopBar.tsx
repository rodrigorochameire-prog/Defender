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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  MoreVertical,
} from "lucide-react";
import { toast } from "sonner";
import { useProcessingQueue } from "@/contexts/processing-queue";
import { ProcessingQueuePanel } from "./ProcessingQueuePanel";
import { FileUploadWithLink } from "./FileUploadWithLink";
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
      <span className="h-2 w-2 rounded-full bg-neutral-300 dark:bg-neutral-600 animate-pulse" />
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
          <p className="text-neutral-400 text-[10px]">{timeSinceSync}</p>
          {health.issues.length > 0 && (
            <ul className="text-neutral-400 text-[10px] space-y-0.5">
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
              className="h-7 w-7 text-neutral-400 hover:text-emerald-600 dark:hover:text-emerald-400"
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
        <div className="px-3 py-2 border-b border-neutral-100 dark:border-neutral-800">
          <p className="text-xs font-medium text-neutral-700 dark:text-neutral-300">Novo Documento</p>
          <p className="text-[10px] text-neutral-400 mt-0.5">Template para a pasta atual</p>
        </div>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-4 w-4 animate-spin text-neutral-400" />
          </div>
        ) : sortedCategories.length === 0 ? (
          <div className="py-6 text-center">
            <FileText className="h-6 w-6 mx-auto mb-2 text-neutral-300" />
            <p className="text-xs text-neutral-400">Nenhum template cadastrado</p>
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
                    <Icon className="h-3 w-3 text-neutral-400" />
                    <span className="text-[10px] font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
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
                        <p className="text-xs text-neutral-700 dark:text-neutral-300 truncate">{t.name}</p>
                        {t.description && (
                          <p className="text-[10px] text-neutral-400 truncate">{t.description}</p>
                        )}
                      </div>
                      {generateMutation.isPending && generateMutation.variables?.templateId === t.id ? (
                        <Loader2 className="h-3 w-3 animate-spin text-emerald-500 shrink-0" />
                      ) : (
                        <ExternalLink className="h-3 w-3 text-neutral-300 shrink-0" />
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
          className="h-7 w-7 text-neutral-400 hover:text-emerald-600 dark:hover:text-emerald-400"
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
    <div className="flex items-center gap-1.5 min-w-0 overflow-hidden">
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
              "flex items-center gap-1 text-[11px] transition-colors shrink-0",
              ctx.breadcrumbPath.length === 0
                ? "text-zinc-700 dark:text-zinc-300 font-semibold cursor-default"
                : "text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 cursor-pointer"
            )}
          >
            <span>{atribuicao.label}</span>
          </button>
          {ctx.breadcrumbPath.length > 0 && (
            <ChevronRight className="h-3 w-3 text-zinc-300 dark:text-zinc-700 shrink-0" />
          )}
        </>
      )}

      {/* Path segments */}
      {ctx.breadcrumbPath.map((segment, index) => {
        const isLast = index === ctx.breadcrumbPath.length - 1;
        const isDeep = ctx.breadcrumbPath.length > 3 && index < ctx.breadcrumbPath.length - 2 && index > 0;
        if (isDeep) return null;
        const showEllipsis = ctx.breadcrumbPath.length > 3 && index === 1 && !isLast;
        if (showEllipsis) {
          return (
            <div key={segment.id} className="flex items-center gap-0.5 shrink-0">
              <span className="text-[11px] text-zinc-400 dark:text-zinc-600 px-0.5">...</span>
              <ChevronRight className="h-3 w-3 text-zinc-300 dark:text-zinc-700 shrink-0" />
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
                "text-[11px] transition-colors duration-150 max-w-[160px] truncate",
                isLast
                  ? "font-semibold text-zinc-700 dark:text-zinc-300 cursor-default"
                  : "text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 cursor-pointer"
              )}
            >
              {segment.name}
            </button>
            {!isLast && (
              <ChevronRight className="h-3 w-3 text-zinc-300 dark:text-zinc-700 shrink-0" />
            )}
          </div>
        );
      })}

      {/* File count */}
      {fileCount != null && fileCount > 0 && (
        <span className="text-[10px] text-zinc-400 font-mono ml-1.5 shrink-0">
          · {fileCount} arquivo{fileCount !== 1 ? "s" : ""}
        </span>
      )}
    </div>
  );
}

// ─── Expandable Search ──────────────────────────────────────────────

function ExpandableSearch({ dark = false }: { dark?: boolean } = {}) {
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
          <button
            onClick={() => setExpanded(true)}
            className={cn(
              "w-7 h-7 rounded-lg flex items-center justify-center transition-all duration-150 cursor-pointer",
              dark
                ? "bg-white/[0.08] text-white/70 ring-1 ring-white/[0.05] hover:bg-white/[0.14] hover:text-white"
                : "text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300",
            )}
          >
            <Search className="h-3.5 w-3.5" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom">Buscar (Ctrl+K)</TooltipContent>
      </Tooltip>
    );
  }

  return (
    <div className="relative flex items-center">
      <Search
        className={cn(
          "absolute left-2.5 h-3.5 w-3.5 pointer-events-none",
          dark ? "text-white/40" : "text-zinc-400",
        )}
      />
      <input
        ref={inputRef}
        type="text"
        value={localSearch}
        onChange={(e) => handleChange(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Escape") handleClose(); }}
        placeholder="Buscar arquivos, assistidos, processos..."
        className={cn(
          "h-8 w-56 pl-8 pr-7 rounded-lg text-xs transition-all duration-200 focus:outline-none",
          dark
            ? "bg-black/[0.15] ring-1 ring-white/[0.08] border-0 text-white/90 placeholder:text-white/35 focus:ring-emerald-500/40"
            : "bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 placeholder:text-zinc-400 focus:ring-1 focus:ring-emerald-500/30 focus:border-emerald-500/30",
        )}
      />
      <button
        onClick={handleClose}
        className={cn(
          "absolute right-2",
          dark
            ? "text-white/60 hover:text-white"
            : "text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300",
        )}
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
              className="h-7 w-7 text-neutral-400 hover:text-emerald-600 dark:hover:text-emerald-400"
            >
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent side="bottom">Adicionar</TooltipContent>
      </Tooltip>
      <PopoverContent align="end" className="w-56 p-0 max-h-[420px] overflow-y-auto">
        {/* Quick actions */}
        <div className="p-1 border-b border-neutral-100 dark:border-neutral-800">
          <button
            onClick={handleNewFolder}
            disabled={!targetFolderId || createFolder.isPending}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-left transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <FolderPlus className="h-3.5 w-3.5 text-neutral-500" />
            <span className="text-xs text-neutral-700 dark:text-neutral-300">Nova pasta</span>
          </button>
          <button
            onClick={handleUpload}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-left transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-800"
          >
            <Upload className="h-3.5 w-3.5 text-neutral-500" />
            <span className="text-xs text-neutral-700 dark:text-neutral-300">Upload</span>
          </button>
        </div>

        {/* Templates */}
        {sortedCategories.length > 0 ? (
          <div className="py-1">
            <div className="px-2.5 py-1">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400">Templates</span>
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
                  <span className="text-xs text-neutral-700 dark:text-neutral-300 truncate flex-1">{t.name}</span>
                  {generateMutation.isPending && generateMutation.variables?.templateId === t.id && (
                    <Loader2 className="h-3 w-3 animate-spin text-emerald-500 shrink-0" />
                  )}
                </button>
              ));
            })}
          </div>
        ) : templates && templates.length === 0 ? (
          <div className="py-4 text-center">
            <p className="text-[10px] text-neutral-400">Nenhum template</p>
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
          className="h-7 w-7 text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-300"
          onClick={handleCycle}
        >
          <Icon className="h-3.5 w-3.5" />
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom">{current.label}</TooltipContent>
    </Tooltip>
  );
}

// ─── Overflow Menu ─────────────────────────────────────────────────

function OverflowMenu({
  onSyncAll,
  isSyncing,
  activeCount,
  dark = false,
}: {
  onSyncAll: () => void;
  isSyncing: boolean;
  activeCount: number;
  dark?: boolean;
}) {
  const ctx = useDriveContext();
  const targetFolderId = ctx.selectedFolderId || ctx.rootSyncFolderId;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          title="Mais opções"
          className={cn(
            "flex items-center justify-center transition-all duration-150 cursor-pointer shrink-0",
            dark
              ? "w-8 h-8 rounded-xl bg-white/[0.08] text-white/70 ring-1 ring-white/[0.05] hover:bg-white/[0.14] hover:text-white"
              : "h-8 w-8 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-500 dark:text-zinc-400",
          )}
        >
          <MoreVertical className="w-4 h-4" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuItem
          className="text-xs gap-2 cursor-pointer"
          onClick={onSyncAll}
          disabled={isSyncing}
        >
          <RefreshCw className={cn("h-3.5 w-3.5", isSyncing && "animate-spin")} />
          {isSyncing ? "Sincronizando..." : "Sincronizar Tudo"}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {/* Templates (NewDocumentButton inline) */}
        <NewDocumentMenuItem />
        <DropdownMenuSeparator />
        {/* Processing Queue trigger */}
        <ProcessingQueuePanel>
          <button className="relative flex cursor-pointer select-none items-center gap-2 rounded-sm px-2 py-1.5 text-xs outline-none transition-colors hover:bg-accent focus:bg-accent focus:text-accent-foreground w-full text-left">
            <Activity className={cn("h-3.5 w-3.5", activeCount > 0 && "animate-pulse")} />
            Fila de Processamento
            {activeCount > 0 && (
              <span className="ml-auto text-[10px] font-mono text-emerald-600 dark:text-emerald-400">
                {activeCount}
              </span>
            )}
          </button>
        </ProcessingQueuePanel>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// Inline version of NewDocumentButton for the overflow menu
function NewDocumentMenuItem() {
  const ctx = useDriveContext();
  const [open, setOpen] = useState(false);
  const targetFolderId = ctx.selectedFolderId || ctx.rootSyncFolderId;

  const { data: templates } = trpc.templates.list.useQuery(undefined, {
    enabled: open,
    staleTime: 60_000,
  });

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
    onError: (err) => toast.error(`Erro ao criar documento: ${err.message}`),
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

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className="relative flex cursor-pointer select-none items-center gap-2 rounded-sm px-2 py-1.5 text-xs outline-none transition-colors hover:bg-accent focus:bg-accent focus:text-accent-foreground w-full text-left disabled:opacity-40"
          disabled={!targetFolderId}
        >
          <FilePlus2 className="h-3.5 w-3.5" />
          Templates
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" side="left" className="w-64 p-0 max-h-[360px] overflow-y-auto">
        <div className="px-3 py-2 border-b border-zinc-100 dark:border-zinc-800">
          <p className="text-xs font-medium text-zinc-700 dark:text-zinc-300">Novo Documento</p>
        </div>
        {sortedCategories.length === 0 ? (
          <div className="py-4 text-center">
            <p className="text-[10px] text-zinc-400">Nenhum template</p>
          </div>
        ) : (
          <div className="py-1">
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
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 text-left transition-colors hover:bg-emerald-50 dark:hover:bg-emerald-950/30 disabled:opacity-50 text-xs"
                >
                  <CatIcon className="h-3 w-3 text-emerald-600/60 shrink-0" />
                  <span className="text-zinc-700 dark:text-zinc-300 truncate flex-1">{t.name}</span>
                  {generateMutation.isPending && generateMutation.variables?.templateId === t.id && (
                    <Loader2 className="h-3 w-3 animate-spin text-emerald-500 shrink-0" />
                  )}
                </button>
              ));
            })}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

// ─── View Mode Toggle (list/grid) ──────────────────────────────────

function ViewModeToggle({ dark = false }: { dark?: boolean } = {}) {
  const ctx = useDriveContext();

  if (dark) {
    return (
      <div className="inline-flex items-center bg-black/[0.15] rounded-md p-[2px] ring-1 ring-white/[0.05]">
        {[
          { mode: "list" as const, label: "Lista", Icon: List },
          { mode: "grid" as const, label: "Grade", Icon: LayoutGrid },
        ].map(({ mode, label, Icon }) => (
          <button
            key={mode}
            onClick={() => ctx.setViewMode(mode)}
            className={cn(
              "inline-flex items-center justify-center w-6 h-6 rounded-[4px] transition-all cursor-pointer",
              ctx.viewMode === mode
                ? "bg-white/[0.14] text-white"
                : "text-white/40 hover:text-white/70",
            )}
            title={label}
          >
            <Icon className="w-3 h-3" />
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="flex rounded-md border border-zinc-200 dark:border-zinc-800 overflow-hidden">
      <button
        onClick={() => ctx.setViewMode("list")}
        className={cn(
          "px-1.5 py-1 transition-colors",
          ctx.viewMode === "list"
            ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
            : "text-zinc-400 dark:text-zinc-600 hover:text-zinc-600 dark:hover:text-zinc-400"
        )}
        title="Lista"
      >
        <List className="w-3 h-3" />
      </button>
      <button
        onClick={() => ctx.setViewMode("grid")}
        className={cn(
          "px-1.5 py-1 transition-colors",
          ctx.viewMode === "grid"
            ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
            : "text-zinc-400 dark:text-zinc-600 hover:text-zinc-600 dark:hover:text-zinc-400"
        )}
        title="Grade"
      >
        <LayoutGrid className="w-3 h-3" />
      </button>
    </div>
  );
}

// ─── Main TopBar ────────────────────────────────────────────────────

export type DriveTopBarVariant = "standalone" | "row1" | "row2";

export function DriveTopBar({
  fileCount,
  variant = "standalone",
}: {
  fileCount?: number;
  variant?: DriveTopBarVariant;
}) {
  const ctx = useDriveContext();

  const syncAll = trpc.drive.syncAll.useMutation();
  const utils = trpc.useUtils();
  const { addJob, completeJob, failJob, activeCount } = useProcessingQueue();

  // Stats query for Row 2
  const { data: stats } = trpc.drive.stats.useQuery(undefined, { staleTime: 30_000 });
  const { data: syncFolders } = trpc.drive.syncFolders.useQuery(undefined, { staleTime: 30_000 });

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

  const targetFolderId = ctx.selectedFolderId || ctx.rootSyncFolderId;

  const createFolder = trpc.drive.createFolder.useMutation({
    onSuccess: (result) => {
      toast.success(`Pasta "${result.name}" criada`);
      utils.drive.files.invalidate();
    },
    onError: (err) => toast.error(`Erro ao criar pasta: ${err.message}`),
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

  // Format total size
  const totalSizeStr = useMemo(() => {
    if (!stats) return "";
    // stats doesn't include totalSize; show file count + folder count
    return "";
  }, [stats]);

  // ─── EMBEDDED VARIANTS (inside CollapsiblePageHeader) ───────────────
  // Row 1: icon + title + subtitle + actions (Upload, Nova Pasta, Overflow)
  // Row 2: sync status + stats + search + view toggle
  //
  // Both instances share query state via React Query dedup, so rendering
  // DriveTopBar twice (once per row) has no extra network cost.
  if (variant === "row1") {
    return (
      <TooltipProvider delayDuration={300}>
        <div className="flex items-center justify-between gap-3">
          {/* Left: icon + title + subtitle */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-[#525252] flex items-center justify-center shrink-0">
              <FolderOpen className="w-4 h-4 text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="text-white text-[15px] font-semibold tracking-tight leading-tight">
                Drive
              </h1>
              <p className="text-[10px] text-white/55 truncate">7ª Regional · Camaçari</p>
            </div>
          </div>

          {/* Right: Upload + Nova Pasta + Overflow */}
          <div className="flex items-center gap-1.5 shrink-0">
            <FileUploadButton folderId={targetFolderId} dark />

            <button
              onClick={handleCreateFolder}
              disabled={!targetFolderId || createFolder.isPending}
              title="Nova pasta"
              className="h-8 px-3 rounded-xl bg-emerald-500 text-white shadow-sm hover:bg-emerald-600 transition-all duration-150 cursor-pointer flex items-center gap-1.5 text-[11px] font-semibold shrink-0 disabled:opacity-50"
            >
              {createFolder.isPending ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Plus className="w-3.5 h-3.5" />
              )}
              Nova Pasta
            </button>

            <OverflowMenu
              onSyncAll={handleSyncAll}
              isSyncing={syncAll.isPending}
              activeCount={activeCount}
              dark
            />
          </div>
        </div>
      </TooltipProvider>
    );
  }

  if (variant === "row2") {
    return (
      <TooltipProvider delayDuration={300}>
        <div className="flex items-center gap-3 w-full min-w-0">
          {/* Left: sync dot + stats — pode encolher, com scroll horizontal se não couber */}
          <div className="flex items-center gap-2.5 min-w-0 flex-1 overflow-x-auto scrollbar-none">
            <div className="flex items-center gap-1.5 shrink-0">
              <SyncHealthDot />
              <span className="text-[10px] uppercase tracking-wider text-white/55 font-semibold">
                Sincronizado
              </span>
            </div>

            {stats && (
              <>
                <span className="w-px h-3 bg-white/[0.10] shrink-0" />
                <div className="flex items-center gap-2 text-[10px] text-white/50 shrink-0">
                  <span>
                    <strong className="text-white/85 font-mono tabular-nums">{stats.totalFiles}</strong>{" "}
                    arquivos
                  </span>
                  <span>·</span>
                  <span>
                    <strong className="text-white/85 font-mono tabular-nums">
                      {stats.syncedFolders}
                    </strong>{" "}
                    pastas
                  </span>
                  {syncFolders && (
                    <>
                      <span>·</span>
                      <span>
                        <strong className="text-white/85 font-mono tabular-nums">
                          {syncFolders.length}
                        </strong>{" "}
                        atribuições
                      </span>
                    </>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Right: search + view toggle — sempre alinhados à direita, nunca quebram */}
          <div className="flex items-center gap-1.5 shrink-0">
            <ExpandableSearch dark />
            <div className="w-px h-4 bg-white/[0.10]" />
            <ViewModeToggle dark />
          </div>
        </div>
      </TooltipProvider>
    );
  }

  // ─── STANDALONE (backward compat) ───────────────────────────────────
  return (
    <TooltipProvider delayDuration={300}>
      <header className="shrink-0 bg-white dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800/80">
        {/* Row 1: Title + Search + Actions (h-14) */}
        <div className="h-14 px-4 flex items-center gap-3">
          {/* Drive icon + title */}
          <div className="flex items-center gap-2.5 shrink-0">
            <div className="w-8 h-8 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
              <FolderOpen className="w-4.5 h-4.5 text-zinc-500 dark:text-zinc-400" />
            </div>
            <div>
              <h1 className="font-serif text-[15px] font-semibold text-zinc-800 dark:text-zinc-100 leading-none">Drive</h1>
              <p className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-0.5">7a Regional &middot; Camacari</p>
            </div>
          </div>

          {/* Search (centered, max-w-sm) */}
          <div className="flex-1 max-w-sm mx-4">
            <ExpandableSearch />
          </div>

          {/* Actions: Upload, Nova Pasta, Menu overflow */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Upload button */}
            <FileUploadButton folderId={targetFolderId} />

            {/* Nova Pasta */}
            <button
              onClick={handleCreateFolder}
              disabled={!targetFolderId || createFolder.isPending}
              className="h-8 px-3 text-xs font-medium bg-emerald-600 hover:bg-emerald-500 rounded-lg text-white flex items-center gap-1.5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {createFolder.isPending ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Plus className="w-3.5 h-3.5" />
              )}
              Nova Pasta
            </button>

            {/* Overflow menu */}
            <OverflowMenu
              onSyncAll={handleSyncAll}
              isSyncing={syncAll.isPending}
              activeCount={activeCount}
            />
          </div>
        </div>

        {/* Row 2: Stats inline (h-8) */}
        <div className="h-8 px-4 flex items-center gap-4 border-t border-zinc-100 dark:border-zinc-800/50">
          {/* Sync dot + label */}
          <div className="flex items-center gap-1.5">
            <SyncHealthDot />
            <span className="text-[10px] text-zinc-400 dark:text-zinc-500">Sincronizado</span>
          </div>

          {/* Stats */}
          {stats && (
            <div className="flex items-center gap-3 text-[10px] text-zinc-400 dark:text-zinc-500">
              <span>
                <strong className="text-zinc-600 dark:text-zinc-300 font-mono">{stats.totalFiles}</strong> arquivos
              </span>
              <span>&middot;</span>
              <span>
                <strong className="text-zinc-600 dark:text-zinc-300 font-mono">{stats.syncedFolders}</strong> pastas
              </span>
              {syncFolders && (
                <>
                  <span>&middot;</span>
                  <span>
                    <strong className="text-zinc-600 dark:text-zinc-300 font-mono">{syncFolders.length}</strong> atribuicoes
                  </span>
                </>
              )}
            </div>
          )}

          {/* View mode toggle (ml-auto) */}
          <div className="ml-auto">
            <ViewModeToggle />
          </div>
        </div>
      </header>
    </TooltipProvider>
  );
}

// ─── File Upload Button ─────────────────────────────────────────────
// Wrapper that triggers the FileUploadWithLink dialog from the top bar

function FileUploadButton({
  folderId,
  dark = false,
}: {
  folderId: string | null;
  dark?: boolean;
}) {
  const baseClass = dark
    ? "h-8 px-3 text-[11px] font-semibold rounded-xl flex items-center gap-1.5 transition-all duration-150 cursor-pointer shrink-0"
    : "h-8 px-3 text-xs font-medium rounded-lg flex items-center gap-1.5 transition-colors";

  if (!folderId) {
    return (
      <button
        disabled
        className={cn(
          baseClass,
          dark
            ? "bg-white/[0.05] text-white/30 ring-1 ring-white/[0.05] cursor-not-allowed"
            : "bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-400 opacity-50 cursor-not-allowed",
        )}
      >
        <Upload className="w-3.5 h-3.5" />
        Upload
      </button>
    );
  }

  return (
    <FileUploadWithLink
      folderId={folderId}
      trigger={
        <button
          className={cn(
            baseClass,
            dark
              ? "bg-white/[0.08] text-white/80 ring-1 ring-white/[0.05] hover:bg-white/[0.14] hover:text-white"
              : "bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300",
          )}
        >
          <Upload className="w-3.5 h-3.5" />
          Upload
        </button>
      }
    />
  );
}
