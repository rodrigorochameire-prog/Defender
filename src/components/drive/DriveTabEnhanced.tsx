"use client";

import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc/client";
import {
  FolderTree,
  Clock,
  BarChart3,
  Search,
  CheckCircle2,
  AlertCircle,
  Loader2,
  FileText,
  ExternalLink,
  RefreshCw,
  X,
  Music,
  Video,
  Brain,
  FileAudio,
  Calendar,
  Scale,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { SubpastaExplorer } from "@/components/hub/SubpastaExplorer";
import { TimelineDocumental } from "@/components/hub/TimelineDocumental";
import { ProcessoTimeline } from "@/components/processos/ProcessoTimeline";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TranscriptViewer, type AnalysisData } from "@/components/shared/transcript-viewer";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

type ViewMode = "tree" | "timeline" | "status" | "processo";

interface DriveFileData {
  id: number;
  name: string;
  mimeType: string | null;
  webViewLink: string | null;
  isFolder: boolean | null;
  parentFileId: number | null;
  driveFolderId: string | null;
  lastModifiedTime: string | Date | null;
  enrichmentStatus?: string | null;
  documentType?: string | null;
  categoria?: string | null;
  enrichmentData?: unknown;
}

interface DriveTabEnhancedProps {
  files: DriveFileData[];
  assistidoId?: number;
  processoId?: number;
}

const VIEW_MODES: { key: ViewMode; label: string; icon: React.ElementType }[] = [
  { key: "tree", label: "Arvore", icon: FolderTree },
  { key: "timeline", label: "Timeline", icon: Clock },
  { key: "status", label: "Status", icon: BarChart3 },
];

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  completed: { label: "Enriquecido", color: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-950", icon: CheckCircle2 },
  processing: { label: "Processando", color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-950", icon: Loader2 },
  failed: { label: "Falhou", color: "text-rose-600", bg: "bg-rose-50 dark:bg-rose-950", icon: AlertCircle },
  pending: { label: "Pendente", color: "text-zinc-500", bg: "bg-zinc-50 dark:bg-zinc-900", icon: Clock },
  skipped: { label: "Ignorado", color: "text-zinc-400", bg: "bg-zinc-50 dark:bg-zinc-900", icon: FileText },
  unsupported: { label: "Nao suportado", color: "text-zinc-400", bg: "bg-zinc-50 dark:bg-zinc-900", icon: FileText },
};

function StatusView({ files, assistidoId, processoId }: { files: DriveFileData[]; assistidoId?: number; processoId?: number }) {
  const [filterStatus, setFilterStatus] = useState<string | null>(null);

  const retryEnrichment = trpc.drive.retryEnrichment.useMutation({
    onSuccess: () => {
      toast.success("Re-enriquecimento agendado");
    },
    onError: (err) => toast.error(err.message),
  });

  const onlyFiles = files.filter((f) => !f.isFolder);

  // Group by status
  const grouped = useMemo(() => {
    const map: Record<string, DriveFileData[]> = {};
    for (const f of onlyFiles) {
      const status = f.enrichmentStatus || "pending";
      if (!map[status]) map[status] = [];
      map[status].push(f);
    }
    return map;
  }, [onlyFiles]);

  const statusOrder = ["completed", "processing", "pending", "failed", "skipped", "unsupported"];
  const displayStatuses = statusOrder.filter((s) => grouped[s]?.length);

  // Stats summary
  const total = onlyFiles.length;
  const completed = grouped["completed"]?.length || 0;

  const filteredFiles = filterStatus
    ? grouped[filterStatus] || []
    : onlyFiles;

  return (
    <div className="space-y-3">
      {/* Summary bar */}
      <div className="flex items-center gap-2 flex-wrap">
        {displayStatuses.map((status) => {
          const config = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
          const cnt = grouped[status]?.length || 0;
          const Icon = config.icon;
          const isActive = filterStatus === status;
          return (
            <button
              key={status}
              onClick={() => setFilterStatus(isActive ? null : status)}
              className={cn(
                "inline-flex items-center gap-1 text-[10px] px-2 py-1 rounded-full transition-colors font-medium",
                isActive
                  ? `${config.bg} ${config.color} ring-1 ring-current`
                  : `${config.bg} ${config.color} opacity-70 hover:opacity-100`,
              )}
            >
              <Icon className={cn("h-2.5 w-2.5", status === "processing" && "animate-spin")} />
              {cnt} {config.label}
            </button>
          );
        })}

        {filterStatus && (
          <button
            onClick={() => setFilterStatus(null)}
            className="text-[10px] text-zinc-400 hover:text-zinc-600 underline"
          >
            Limpar filtro
          </button>
        )}
      </div>

      {/* Progress */}
      {total > 0 && (
        <div className="h-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
          <div
            className="h-full bg-emerald-500 rounded-full transition-all"
            style={{ width: `${Math.round((completed / total) * 100)}%` }}
          />
        </div>
      )}

      {/* File list */}
      <div className="space-y-0.5 max-h-[400px] overflow-y-auto">
        {filteredFiles.length === 0 ? (
          <div className="text-center py-8 text-zinc-400">
            <FileText className="h-6 w-6 mx-auto mb-2 opacity-30" />
            <p className="text-[11px]">
              {filterStatus ? "Nenhum arquivo com este status" : "Nenhum arquivo"}
            </p>
          </div>
        ) : (
          filteredFiles.map((f) => {
            const status = f.enrichmentStatus || "pending";
            const config = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
            const Icon = config.icon;
            return (
              <div
                key={f.id}
                className="flex items-center gap-2 py-1.5 px-2 rounded hover:bg-zinc-50 dark:hover:bg-zinc-800 group"
              >
                <Icon
                  className={cn(
                    "h-3 w-3 shrink-0",
                    config.color,
                    status === "processing" && "animate-spin",
                  )}
                />
                <span
                  className="text-[11px] text-zinc-700 dark:text-zinc-300 truncate flex-1 cursor-pointer group-hover:text-emerald-600"
                  onClick={() => f.webViewLink && window.open(f.webViewLink, "_blank")}
                >
                  {f.name}
                </span>
                {f.documentType && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500 shrink-0">
                    {f.documentType}
                  </span>
                )}
                {f.categoria && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-violet-50 dark:bg-violet-950 text-violet-500 shrink-0">
                    {f.categoria}
                  </span>
                )}
                {status === "failed" && (
                  <button
                    onClick={() => retryEnrichment.mutate({ fileIds: [f.id] })}
                    className="text-[9px] text-rose-500 hover:text-rose-700 shrink-0"
                    title="Retentar enriquecimento"
                  >
                    <RefreshCw className="h-3 w-3" />
                  </button>
                )}
                {f.webViewLink && (
                  <ExternalLink className="h-3 w-3 text-zinc-300 group-hover:text-emerald-500 shrink-0 transition-colors" />
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

// ─── File Detail Sheet ───────────────────────────────────────────────

function FileDetailSheet({
  file,
  onClose,
}: {
  file: DriveFileData;
  onClose: () => void;
}) {
  const [transcriptOpen, setTranscriptOpen] = useState(false);

  const isAudio = file.mimeType?.startsWith("audio/");
  const isVideo = file.mimeType?.startsWith("video/");
  const isAudioVideo = isAudio || isVideo;

  // Extract transcript data from enrichmentData
  const enrichData = file.enrichmentData as Record<string, unknown> | null | undefined;
  const rawTranscriptPlain = enrichData?.transcript_plain as string | undefined;
  const rawTranscript = enrichData?.transcript as string | undefined;
  let transcript: string | undefined;
  if (rawTranscriptPlain && !rawTranscriptPlain.startsWith("{")) {
    transcript = rawTranscriptPlain;
  } else if (rawTranscript && !rawTranscript.startsWith("{")) {
    transcript = rawTranscript;
  } else if (rawTranscript) {
    try {
      const parsed = JSON.parse(rawTranscript);
      transcript = parsed.transcript_plain || parsed.transcript || rawTranscript;
    } catch {
      transcript = rawTranscript;
    }
  }
  const analysis = enrichData?.analysis as AnalysisData | undefined;
  const speakers = enrichData?.speakers as string[] | undefined;
  const duration = enrichData?.duration as number | undefined;
  const hasTranscript = !!transcript;

  const statusConfig: Record<string, { label: string; class: string }> = {
    completed: { label: "Enriquecido", class: "bg-emerald-100 text-emerald-700 border-emerald-200" },
    processing: { label: "Processando", class: "bg-blue-100 text-blue-700 border-blue-200" },
    failed: { label: "Falhou", class: "bg-rose-100 text-rose-700 border-rose-200" },
    pending: { label: "Pendente", class: "bg-zinc-100 text-zinc-600 border-zinc-200" },
    skipped: { label: "Ignorado", class: "bg-zinc-100 text-zinc-400 border-zinc-200" },
  };
  const status = file.enrichmentStatus ? (statusConfig[file.enrichmentStatus] ?? statusConfig.pending) : null;

  return (
    <>
      <Sheet open onOpenChange={(open) => !open && onClose()}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-md bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 p-0"
        >
          <SheetTitle className="sr-only">{file.name}</SheetTitle>
          <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-zinc-100 dark:border-zinc-800 shrink-0">
              <div className="h-9 w-9 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center shrink-0">
                {isAudio ? (
                  <Music className="h-4 w-4 text-cyan-500" />
                ) : isVideo ? (
                  <Video className="h-4 w-4 text-violet-500" />
                ) : (
                  <FileText className="h-4 w-4 text-zinc-400" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200 truncate">{file.name}</p>
                {file.documentType && (
                  <p className="text-[11px] text-zinc-500">{file.documentType}</p>
                )}
              </div>
              <button
                onClick={onClose}
                className="h-7 w-7 rounded-md flex items-center justify-center text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Status + Category badges */}
              <div className="flex flex-wrap gap-1.5">
                {status && (
                  <Badge variant="outline" className={cn("text-[10px] font-medium", status.class)}>
                    {status.label}
                  </Badge>
                )}
                {file.categoria && (
                  <Badge variant="outline" className="text-[10px] bg-violet-50 text-violet-600 border-violet-200">
                    {file.categoria}
                  </Badge>
                )}
                {hasTranscript && (
                  <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200 flex items-center gap-1">
                    <FileAudio className="h-2.5 w-2.5" />
                    Transcrito
                  </Badge>
                )}
                {analysis?.resumo_defesa && (
                  <Badge variant="outline" className="text-[10px] bg-violet-50 text-violet-700 border-violet-200 flex items-center gap-1">
                    <Brain className="h-2.5 w-2.5" />
                    Analisado
                  </Badge>
                )}
              </div>

              {/* Metadata */}
              <div className="space-y-2 rounded-lg border border-zinc-100 dark:border-zinc-800 p-3">
                {file.mimeType && (
                  <div className="flex justify-between text-[11px]">
                    <span className="text-zinc-400">Tipo</span>
                    <span className="text-zinc-600 dark:text-zinc-400 font-mono truncate ml-2">{file.mimeType}</span>
                  </div>
                )}
                {file.lastModifiedTime && (
                  <div className="flex justify-between text-[11px]">
                    <span className="text-zinc-400">Modificado</span>
                    <span className="text-zinc-600 dark:text-zinc-400 flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {format(file.lastModifiedTime instanceof Date ? file.lastModifiedTime : new Date(file.lastModifiedTime), "dd/MM/yyyy", { locale: ptBR })}
                    </span>
                  </div>
                )}
              </div>

              {/* Resumo IA */}
              {analysis?.resumo_defesa && (
                <div className="rounded-lg border border-violet-100 dark:border-violet-900 bg-violet-50/50 dark:bg-violet-950/20 p-3">
                  <p className="text-[10px] font-semibold text-violet-600 uppercase tracking-wide mb-1 flex items-center gap-1">
                    <Brain className="h-3 w-3" />
                    Resumo Defesa
                  </p>
                  <p className="text-[11px] text-zinc-700 dark:text-zinc-300 leading-relaxed line-clamp-4">
                    {analysis.resumo_defesa}
                  </p>
                </div>
              )}

              {/* Actions */}
              <div className="space-y-2">
                {hasTranscript && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full h-8 text-xs text-violet-600 border-violet-200 hover:bg-violet-50"
                    onClick={() => setTranscriptOpen(true)}
                  >
                    <FileAudio className="h-3.5 w-3.5 mr-1.5" />
                    Ver Transcrição
                  </Button>
                )}
                {file.webViewLink && (
                  <a href={file.webViewLink} target="_blank" rel="noopener noreferrer" className="block">
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full h-8 text-xs text-zinc-600 border-zinc-200 hover:bg-zinc-50"
                    >
                      <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                      Abrir no Drive
                    </Button>
                  </a>
                )}
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Transcript Viewer */}
      {transcriptOpen && hasTranscript && (
        <TranscriptViewer
          open={transcriptOpen}
          onOpenChange={setTranscriptOpen}
          transcript={transcript!}
          speakers={speakers}
          duration={duration}
          analysis={analysis ?? null}
          title={file.name}
        />
      )}
    </>
  );
}

export function DriveTabEnhanced({ files, assistidoId, processoId }: DriveTabEnhancedProps) {
  const [view, setView] = useState<ViewMode>("tree");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFile, setSelectedFile] = useState<DriveFileData | null>(null);

  // Filter files by search
  const filteredFiles = useMemo(() => {
    if (!searchQuery.trim()) return files;
    const q = searchQuery.toLowerCase();
    return files.filter(
      (f) =>
        f.name.toLowerCase().includes(q) ||
        f.documentType?.toLowerCase().includes(q) ||
        f.categoria?.toLowerCase().includes(q),
    );
  }, [files, searchQuery]);

  return (
    <div className="space-y-3">
      {/* View toggle + search */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* View mode buttons */}
        <div className="flex rounded-lg border border-zinc-200 dark:border-zinc-700 overflow-hidden">
          {VIEW_MODES.map((m) => {
            const Icon = m.icon;
            return (
              <button
                key={m.key}
                onClick={() => setView(m.key)}
                className={cn(
                  "flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-medium transition-colors",
                  view === m.key
                    ? "bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400"
                    : "text-zinc-500 hover:text-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800",
                )}
              >
                <Icon className="h-3 w-3" />
                {m.label}
              </button>
            );
          })}
          {processoId && (
            <button
              onClick={() => setView("processo")}
              className={cn(
                "flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-medium transition-colors",
                view === "processo"
                  ? "bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400"
                  : "text-zinc-500 hover:text-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800",
              )}
            >
              <Scale className="h-3 w-3" />
              Processo
            </button>
          )}
        </div>

        {/* Search bar */}
        <div className="flex-1 relative min-w-[140px]">
          <Search className="h-3 w-3 absolute left-2 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            placeholder="Buscar arquivos..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-[11px] pl-7 pr-2 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-emerald-400"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 text-[10px]"
            >
              Limpar
            </button>
          )}
        </div>

        {/* File count */}
        <span className="text-[10px] text-zinc-400 shrink-0">
          {filteredFiles.filter((f) => !f.isFolder).length} arquivo{filteredFiles.filter((f) => !f.isFolder).length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* View content */}
      {view === "tree" && (
        <SubpastaExplorer
          files={filteredFiles}
          onFileClick={(f) => setSelectedFile(f as DriveFileData)}
        />
      )}
      {view === "timeline" && <TimelineDocumental files={filteredFiles} />}
      {view === "status" && (
        <StatusView
          files={filteredFiles}
          assistidoId={assistidoId}
          processoId={processoId}
        />
      )}
      {view === "processo" && processoId && (
        <ProcessoTimeline processoId={processoId} compact />
      )}

      {/* File Detail Sheet */}
      {selectedFile && (
        <FileDetailSheet
          file={selectedFile}
          onClose={() => setSelectedFile(null)}
        />
      )}
    </div>
  );
}
