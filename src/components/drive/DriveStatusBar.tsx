"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import {
  FolderOpen,
  FolderPlus,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  RefreshCw,
  FileText,
  CheckCircle2,
  AlertCircle,
  Clock,
  Loader2,
  HardDrive,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useProcessingQueue } from "@/contexts/processing-queue";
import { ProcessingQueuePanel } from "./ProcessingQueuePanel";
import { Activity } from "lucide-react";

function getSyncHealth(lastSyncAt: string | null | undefined): {
  color: string;
  label: string;
  status: 'healthy' | 'warning' | 'offline';
} {
  if (!lastSyncAt) return { color: '#ef4444', label: 'Nunca sincronizado', status: 'offline' };
  const minutesAgo = Math.round((Date.now() - new Date(lastSyncAt).getTime()) / 60000);
  if (minutesAgo < 10) return { color: '#22c55e', label: `Sync ${minutesAgo}min`, status: 'healthy' };
  if (minutesAgo < 60) return { color: '#f59e0b', label: `Sync ${minutesAgo}min`, status: 'warning' };
  const hoursAgo = Math.round(minutesAgo / 60);
  return { color: '#ef4444', label: `Sync ${hoursAgo}h atrás`, status: 'offline' };
}

interface DriveStatusBarProps {
  assistidoId?: number;
  processoId?: number;
}

export function DriveStatusBar({ assistidoId, processoId }: DriveStatusBarProps) {
  const [expanded, setExpanded] = useState(false);
  const { activeCount } = useProcessingQueue();

  const isAssistido = !!assistidoId;

  const statusQuery = isAssistido
    ? trpc.drive.getDriveStatusForAssistido.useQuery(
        { assistidoId: assistidoId! },
        { staleTime: 30_000 },
      )
    : trpc.drive.getDriveStatusForProcesso.useQuery(
        { processoId: processoId! },
        { staleTime: 30_000 },
      );

  const createFolder = trpc.drive.createFolderForAssistido.useMutation({
    onSuccess: () => {
      toast.success("Pasta criada no Drive");
      statusQuery.refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const createProcessoFolder = trpc.drive.createFolderForProcesso.useMutation({
    onSuccess: () => {
      toast.success("Subpasta do processo criada");
      statusQuery.refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const fullSync = trpc.drive.fullSyncAssistido.useMutation({
    onSuccess: (data) => {
      statusQuery.refetch();
      if (data.errors.length > 0) {
        toast.warning(`Sync parcial: ${data.steps.join(", ")}`, { description: data.errors[0] });
      } else {
        const parts = [];
        if (data.folderLinked) parts.push("pasta vinculada");
        if (data.folderCreated) parts.push("pasta criada");
        if (data.syncResult) parts.push(`${data.syncResult.filesAdded} arquivos`);
        if (data.filesLinkedToAssistido > 0) parts.push(`${data.filesLinkedToAssistido} vinculados`);
        if (data.processosLinked > 0) parts.push(`${data.processosLinked} processos`);
        toast.success(parts.length > 0 ? `Sync: ${parts.join(", ")}` : "Sync concluído");
      }
    },
    onError: (err) => toast.error(err.message),
  });

  if (statusQuery.isLoading) {
    return (
      <div className="px-6 py-2 border-b border-neutral-100 dark:border-neutral-800">
        <div className="flex items-center gap-2 text-[11px] text-neutral-400">
          <Loader2 className="h-3 w-3 animate-spin" />
          <span>Carregando Drive...</span>
        </div>
      </div>
    );
  }

  const data = statusQuery.data;
  if (!data) return null;

  // Pasta não vinculada
  if (!data.linked) {
    return (
      <div className="px-6 py-2.5 border-b border-neutral-100 dark:border-neutral-800">
        <div className="flex items-center gap-3">
          <HardDrive className="h-4 w-4 text-neutral-300 shrink-0" />
          <span className="text-[11px] text-neutral-400">Drive: sem pasta vinculada</span>
          {isAssistido && (
            <>
              <button
                onClick={() => fullSync.mutate({ assistidoId: assistidoId!, createMissing: false })}
                disabled={fullSync.isPending}
                className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors disabled:opacity-50"
              >
                {fullSync.isPending ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <RefreshCw className="h-3 w-3" />
                )}
                Buscar no Drive
              </button>
              <button
                onClick={() => fullSync.mutate({ assistidoId: assistidoId!, createMissing: true })}
                disabled={fullSync.isPending}
                className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded border border-neutral-200 dark:border-neutral-700 text-neutral-500 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors disabled:opacity-50"
              >
                <FolderPlus className="h-3 w-3" />
                Criar pasta
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  // Pasta vinculada — barra colapsável
  const totalDocs = data.totalDocs;
  const enrichedDocs = data.enrichedDocs;
  const failedDocs = data.failedDocs;
  const processingDocs = data.processingDocs;

  return (
    <div className="border-b border-neutral-100 dark:border-neutral-800">
      {/* Collapsed bar */}
      <div
        className="px-6 py-2 flex items-center gap-3 cursor-pointer hover:bg-neutral-50/50 dark:hover:bg-neutral-900/50 transition-colors"
        onClick={() => setExpanded((e) => !e)}
      >
        <HardDrive className="h-4 w-4 text-emerald-500 shrink-0" />

        {/* Status summary */}
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="text-[11px] text-neutral-600 dark:text-neutral-400">
            Drive
          </span>

          {/* File counts */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-500 font-medium">
              {totalDocs} arquivo{totalDocs !== 1 ? "s" : ""}
            </span>

            {enrichedDocs > 0 && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950 text-emerald-600 font-medium flex items-center gap-0.5">
                <CheckCircle2 className="h-2.5 w-2.5" />
                {enrichedDocs}
              </span>
            )}

            {processingDocs > 0 && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950 text-blue-600 font-medium flex items-center gap-0.5">
                <Clock className="h-2.5 w-2.5" />
                {processingDocs}
              </span>
            )}

            {failedDocs > 0 && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-rose-50 dark:bg-rose-950 text-rose-600 font-medium flex items-center gap-0.5">
                <AlertCircle className="h-2.5 w-2.5" />
                {failedDocs}
              </span>
            )}

            {"newSinceAnalysis" in data && (data as { newSinceAnalysis: number }).newSinceAnalysis > 0 && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950 text-amber-600 font-medium">
                +{(data as { newSinceAnalysis: number }).newSinceAnalysis} novo{(data as { newSinceAnalysis: number }).newSinceAnalysis !== 1 ? "s" : ""}
              </span>
            )}

            {data.lastSyncAt !== undefined && (() => {
              const health = getSyncHealth(data.lastSyncAt ? String(data.lastSyncAt) : null);
              return (
                <span className="inline-flex items-center gap-1 ml-2" title={health.label}>
                  <span
                    className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${health.status === 'healthy' ? 'animate-pulse' : ''}`}
                    style={{ backgroundColor: health.color }}
                  />
                  <span className="text-[9px] text-neutral-400">{health.status === 'healthy' ? '' : health.label}</span>
                </span>
              );
            })()}
          </div>
        </div>

        {/* Processing Queue button */}
        <ProcessingQueuePanel>
          <button
            className={cn(
              "text-[10px] px-1.5 py-0.5 rounded-full flex items-center gap-0.5 transition-colors",
              activeCount > 0
                ? "bg-blue-50 dark:bg-blue-950 text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900"
                : "text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
            )}
            onClick={(e) => e.stopPropagation()}
            title="Fila de processamento"
          >
            <Activity className={cn("h-3 w-3", activeCount > 0 && "animate-pulse")} />
            {activeCount > 0 && <span className="font-medium">{activeCount}</span>}
          </button>
        </ProcessingQueuePanel>

        {/* Sync button (assistido only) */}
        {isAssistido && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              fullSync.mutate({ assistidoId: assistidoId!, createMissing: false });
            }}
            disabled={fullSync.isPending}
            className="text-[10px] text-neutral-400 hover:text-emerald-500 transition-colors flex items-center gap-0.5 disabled:opacity-50"
            title="Sincronizar Drive"
          >
            {fullSync.isPending ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <RefreshCw className="h-3 w-3" />
            )}
          </button>
        )}

        {/* Open in Drive link */}
        {data.folderUrl && (
          <a
            href={data.folderUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[10px] text-neutral-400 hover:text-emerald-500 transition-colors flex items-center gap-0.5"
            onClick={(e) => e.stopPropagation()}
          >
            <ExternalLink className="h-3 w-3" />
          </a>
        )}

        {/* Expand toggle */}
        {expanded ? (
          <ChevronDown className="h-3.5 w-3.5 text-neutral-400 shrink-0" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 text-neutral-400 shrink-0" />
        )}
      </div>

      {/* Expanded details */}
      {expanded && (
        <div className="px-6 pb-3 space-y-2">
          {/* Enrichment progress bar */}
          {totalDocs > 0 && (
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[10px] text-neutral-400">
                <span>Enriquecimento</span>
                <span>{enrichedDocs}/{totalDocs}</span>
              </div>
              <div className="h-1.5 rounded-full bg-neutral-100 dark:bg-neutral-800 overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all"
                  style={{ width: `${Math.round((enrichedDocs / totalDocs) * 100)}%` }}
                />
              </div>
            </div>
          )}

          {/* Recent files */}
          {data.recentFiles && data.recentFiles.length > 0 && (
            <div className="space-y-0.5">
              <p className="text-[10px] text-neutral-400 font-medium">Recentes</p>
              {data.recentFiles.map((f: { id: number; name: string; webViewLink: string | null; enrichmentStatus: string | null; documentType: string | null }) => (
                <div
                  key={f.id}
                  className="flex items-center gap-1.5 text-[11px] group cursor-pointer"
                  onClick={() => f.webViewLink && window.open(f.webViewLink, "_blank")}
                >
                  <FileText className="h-3 w-3 text-neutral-400 shrink-0" />
                  <span className="truncate text-neutral-600 dark:text-neutral-400 flex-1 group-hover:text-emerald-600">
                    {f.name}
                  </span>
                  {f.enrichmentStatus === "completed" && (
                    <CheckCircle2 className="h-2.5 w-2.5 text-emerald-500 shrink-0" />
                  )}
                  {f.enrichmentStatus === "failed" && (
                    <AlertCircle className="h-2.5 w-2.5 text-rose-500 shrink-0" />
                  )}
                  {f.documentType && (
                    <span className="text-[9px] text-neutral-400 shrink-0">{f.documentType}</span>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Processos with folder (only for assistido) */}
          {"processosWithFolder" in data && (data as { processosWithFolder: { id: number; numeroAutos: string | null; docCount: number }[] }).processosWithFolder.length > 0 && (
            <div className="space-y-0.5">
              <p className="text-[10px] text-neutral-400 font-medium">Processos com pasta</p>
              {(data as { processosWithFolder: { id: number; numeroAutos: string | null; docCount: number }[] }).processosWithFolder.map((p) => (
                <div key={p.id} className="flex items-center gap-1.5 text-[11px]">
                  <FolderOpen className="h-3 w-3 text-amber-400 shrink-0" />
                  <span className="font-mono text-neutral-600 dark:text-neutral-400">
                    {p.numeroAutos ?? "Sem número"}
                  </span>
                  <span className="text-[9px] text-neutral-400">
                    {p.docCount} doc{p.docCount !== 1 ? "s" : ""}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Subfolders (only for processo) */}
          {"subfolders" in data && (data as { subfolders: { name: string; count: number }[] }).subfolders.length > 0 && (
            <div className="space-y-0.5">
              <p className="text-[10px] text-neutral-400 font-medium">Subpastas</p>
              {(data as { subfolders: { name: string; count: number }[] }).subfolders.map((sf, i) => (
                <div key={i} className="flex items-center gap-1.5 text-[11px]">
                  <FolderOpen className="h-3 w-3 text-amber-400 shrink-0" />
                  <span className="text-neutral-600 dark:text-neutral-400">{sf.name}</span>
                  <span className="text-[9px] text-neutral-400">{sf.count} doc{sf.count !== 1 ? "s" : ""}</span>
                </div>
              ))}
            </div>
          )}

          {/* Last sync */}
          {data.lastSyncAt && (
            <p className="text-[10px] text-neutral-400 flex items-center gap-1">
              <RefreshCw className="h-2.5 w-2.5" />
              Último sync: {new Date(data.lastSyncAt).toLocaleString("pt-BR", {
                day: "2-digit",
                month: "2-digit",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
