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
  FolderOpen,
  Link2,
} from "lucide-react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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
  driveFileId?: string | null;
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
  driveFolderId?: string | null;
  atribuicaoPrimaria?: string | null;
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

const FILE_ICON_MAP: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
  "audio/": { icon: Music, color: "text-cyan-500", bg: "bg-cyan-50 dark:bg-cyan-950/30" },
  "video/": { icon: Video, color: "text-violet-500", bg: "bg-violet-50 dark:bg-violet-950/30" },
  "application/pdf": { icon: FileText, color: "text-rose-500", bg: "bg-rose-50 dark:bg-rose-950/30" },
  "text/markdown": { icon: FileText, color: "text-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-950/30" },
  "image/": { icon: FileText, color: "text-amber-500", bg: "bg-amber-50 dark:bg-amber-950/30" },
};

function getFileIcon(mimeType: string | null) {
  if (!mimeType) return { icon: FileText, color: "text-zinc-400", bg: "bg-zinc-100 dark:bg-zinc-800" };
  for (const [prefix, config] of Object.entries(FILE_ICON_MAP)) {
    if (mimeType.startsWith(prefix)) return config;
  }
  return { icon: FileText, color: "text-zinc-400", bg: "bg-zinc-100 dark:bg-zinc-800" };
}

function formatFileType(mimeType: string | null): string {
  if (!mimeType) return "Arquivo";
  const map: Record<string, string> = {
    "application/pdf": "PDF",
    "text/markdown": "Markdown",
    "video/mp4": "Vídeo MP4",
    "audio/mpeg": "Áudio MP3",
    "audio/ogg": "Áudio OGG",
    "audio/wav": "Áudio WAV",
    "image/jpeg": "Imagem JPEG",
    "image/png": "Imagem PNG",
    "application/vnd.google-apps.document": "Google Docs",
    "application/vnd.google-apps.spreadsheet": "Google Sheets",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "Word",
  };
  return map[mimeType] || mimeType.split("/").pop()?.toUpperCase() || "Arquivo";
}

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

  const statusConfig: Record<string, { label: string; dot: string }> = {
    completed: { label: "Enriquecido", dot: "bg-emerald-500" },
    processing: { label: "Processando", dot: "bg-blue-500 animate-pulse" },
    failed: { label: "Falhou", dot: "bg-rose-500" },
    pending: { label: "Pendente", dot: "bg-zinc-300" },
    skipped: { label: "Ignorado", dot: "bg-zinc-300" },
  };
  const status = file.enrichmentStatus ? (statusConfig[file.enrichmentStatus] ?? statusConfig.pending) : null;
  const fileIcon = getFileIcon(file.mimeType);
  const FileIcon = fileIcon.icon;

  return (
    <>
      <Sheet open onOpenChange={(open) => !open && onClose()}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-[420px] bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 p-0"
        >
          <SheetTitle className="sr-only">{file.name}</SheetTitle>
          <div className="flex flex-col h-full">

            {/* ── Header ── */}
            <div className="px-5 pt-5 pb-4 border-b border-zinc-100 dark:border-zinc-800/60 shrink-0">
              <div className="flex items-start gap-3.5">
                <div className={cn("h-11 w-11 rounded-xl flex items-center justify-center shrink-0", fileIcon.bg)}>
                  <FileIcon className={cn("h-5 w-5", fileIcon.color)} />
                </div>
                <div className="flex-1 min-w-0 pt-0.5">
                  <p className="text-[13px] font-semibold text-zinc-900 dark:text-zinc-100 leading-tight break-words">
                    {file.name}
                  </p>
                  <p className="text-[11px] text-zinc-400 mt-1">
                    {formatFileType(file.mimeType)}
                    {file.lastModifiedTime && (
                      <> · {format(
                        file.lastModifiedTime instanceof Date ? file.lastModifiedTime : new Date(file.lastModifiedTime),
                        "dd MMM yyyy",
                        { locale: ptBR }
                      )}</>
                    )}
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="h-7 w-7 rounded-lg flex items-center justify-center text-zinc-300 hover:text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors mt-0.5"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* Status row */}
              {(status || file.categoria || file.documentType) && (
                <div className="flex items-center gap-2 mt-3 flex-wrap">
                  {status && (
                    <span className="inline-flex items-center gap-1.5 text-[10px] text-zinc-500">
                      <span className={cn("h-1.5 w-1.5 rounded-full", status.dot)} />
                      {status.label}
                    </span>
                  )}
                  {file.documentType && (
                    <Badge variant="secondary" className="text-[10px] h-5 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 font-normal">
                      {file.documentType}
                    </Badge>
                  )}
                  {file.categoria && (
                    <Badge variant="secondary" className="text-[10px] h-5 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 font-normal">
                      {file.categoria}
                    </Badge>
                  )}
                </div>
              )}
            </div>

            {/* ── Content ── */}
            <div className="flex-1 overflow-y-auto">

              {/* Actions — primary */}
              <div className="px-5 py-3 flex gap-2 border-b border-zinc-100 dark:border-zinc-800/60">
                {file.webViewLink && (
                  <a href={file.webViewLink} target="_blank" rel="noopener noreferrer" className="flex-1">
                    <Button
                      size="sm"
                      className="w-full h-8 text-[11px] font-medium bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200"
                    >
                      <ExternalLink className="h-3 w-3 mr-1.5" />
                      Abrir no Drive
                    </Button>
                  </a>
                )}
                {hasTranscript && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 h-8 text-[11px] font-medium border-zinc-200 dark:border-zinc-700"
                    onClick={() => setTranscriptOpen(true)}
                  >
                    <FileAudio className="h-3 w-3 mr-1.5" />
                    Transcrição
                  </Button>
                )}
              </div>

              {/* AI Analysis — Resumo Defesa */}
              {analysis?.resumo_defesa && (
                <div className="px-5 py-4 border-b border-zinc-100 dark:border-zinc-800/60">
                  <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Brain className="h-3 w-3" />
                    Análise IA
                  </p>
                  <p className="text-[12px] text-zinc-700 dark:text-zinc-300 leading-relaxed">
                    {analysis.resumo_defesa}
                  </p>
                </div>
              )}

              {/* Capabilities badges */}
              {(hasTranscript || analysis?.resumo_defesa || (isAudio || isVideo)) && (
                <div className="px-5 py-3 border-b border-zinc-100 dark:border-zinc-800/60">
                  <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                    Enriquecimento
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {hasTranscript && (
                      <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400">
                        <FileAudio className="h-2.5 w-2.5" />
                        Transcrito
                      </span>
                    )}
                    {analysis?.resumo_defesa && (
                      <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-violet-50 dark:bg-violet-950/30 text-violet-600 dark:text-violet-400">
                        <Brain className="h-2.5 w-2.5" />
                        Analisado
                      </span>
                    )}
                    {duration && (
                      <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500">
                        <Clock className="h-2.5 w-2.5" />
                        {Math.floor(duration / 60)}min {Math.floor(duration % 60)}s
                      </span>
                    )}
                    {speakers && speakers.length > 0 && (
                      <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500">
                        {speakers.length} falante{speakers.length > 1 ? "s" : ""}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Metadata — clean key-value */}
              <div className="px-5 py-4">
                <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider mb-3">
                  Detalhes
                </p>
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-zinc-400">Formato</span>
                    <span className="text-[11px] text-zinc-600 dark:text-zinc-300 font-medium">{formatFileType(file.mimeType)}</span>
                  </div>
                  {file.lastModifiedTime && (
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-zinc-400">Modificado</span>
                      <span className="text-[11px] text-zinc-600 dark:text-zinc-300 font-medium">
                        {format(
                          file.lastModifiedTime instanceof Date ? file.lastModifiedTime : new Date(file.lastModifiedTime),
                          "dd 'de' MMMM 'de' yyyy",
                          { locale: ptBR }
                        )}
                      </span>
                    </div>
                  )}
                  {file.mimeType && (
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-zinc-400">MIME</span>
                      <span className="text-[11px] text-zinc-500 font-mono">{file.mimeType}</span>
                    </div>
                  )}
                </div>
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

export function DriveTabEnhanced({
  files,
  assistidoId,
  processoId,
  driveFolderId,
  atribuicaoPrimaria,
}: DriveTabEnhancedProps) {
  const [view, setView] = useState<ViewMode>("tree");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFile, setSelectedFile] = useState<DriveFileData | null>(null);

  // --- Fluxo de vinculação de pasta ---
  const [pickerOpen, setPickerOpen] = useState(false);
  const showLinkFlow = assistidoId != null && !driveFolderId;

  const { data: suggestion, isLoading: loadingSuggestion } =
    trpc.drive.getSuggestedFolderForAssistido.useQuery(
      { assistidoId: assistidoId! },
      { enabled: showLinkFlow }
    );

  const { data: unlinkedFolders } =
    trpc.drive.listUnlinkedFoldersByAtribuicao.useQuery(
      { atribuicaoPrimaria: atribuicaoPrimaria ?? null },
      { enabled: pickerOpen && assistidoId != null }
    );

  const utils = trpc.useUtils();
  const linkFolder = trpc.assistidos.linkDriveFolder.useMutation({
    onSuccess: () => {
      toast.success("Pasta vinculada com sucesso.");
      setPickerOpen(false);
      utils.assistidos.getById.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const processFolder = trpc.enrichment.batchProcess.useMutation({
    onSuccess: (data) => {
      toast.success(`${data.queued} arquivos enfileirados para processamento`);
    },
    onError: (err) => toast.error(err.message),
  });

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
      {/* Fluxo de vinculação quando sem pasta vinculada */}
      {showLinkFlow && (
        <div className="p-4 border rounded-lg bg-zinc-50 mb-4">
          {loadingSuggestion ? (
            <div className="flex items-center gap-2 text-sm text-zinc-500">
              <Loader2 className="w-4 h-4 animate-spin" />
              Procurando pasta correspondente…
            </div>
          ) : suggestion ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-zinc-700">
                <FolderOpen className="w-4 h-4 text-emerald-600" />
                Pasta sugerida encontrada
              </div>
              <p className="text-sm text-zinc-600">
                &ldquo;{suggestion.name}&rdquo; &middot; {suggestion.fileCount} arquivo(s)
              </p>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  disabled={linkFolder.isPending}
                  onClick={() =>
                    linkFolder.mutate({
                      assistidoId: assistidoId!,
                      driveFileId: suggestion.driveFileId,
                    })
                  }
                >
                  {linkFolder.isPending ? (
                    <Loader2 className="w-3 h-3 animate-spin mr-1" />
                  ) : (
                    <Link2 className="w-3 h-3 mr-1" />
                  )}
                  Confirmar vínculo
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setPickerOpen(true)}
                >
                  Escolher outra
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-sm text-zinc-500">Nenhuma pasta Drive vinculada.</p>
              <Button size="sm" variant="outline" onClick={() => setPickerOpen(true)}>
                <FolderOpen className="w-3 h-3 mr-1" />
                Vincular pasta manualmente
              </Button>
            </div>
          )}

          {/* Picker de pastas */}
          <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
            <PopoverTrigger asChild>
              <span />
            </PopoverTrigger>
            <PopoverContent className="w-72 p-0" align="start">
              <Command>
                <CommandInput placeholder="Buscar pasta…" />
                <CommandList>
                  <CommandEmpty>Nenhuma pasta disponível.</CommandEmpty>
                  <CommandGroup>
                    {(unlinkedFolders ?? []).map((folder) => (
                      <CommandItem
                        key={folder.driveFileId}
                        value={folder.name ?? ""}
                        onSelect={() =>
                          linkFolder.mutate({
                            assistidoId: assistidoId!,
                            driveFileId: folder.driveFileId,
                          })
                        }
                      >
                        <FolderOpen className="w-3 h-3 mr-2 text-zinc-400" />
                        {folder.name}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>
      )}

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

        {/* Processar Pasta Completa */}
        {assistidoId && (
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-[10px] gap-1 shrink-0"
            disabled={processFolder.isPending}
            onClick={() => processFolder.mutate({
              scope: "by_ids",
              assistidoIds: [assistidoId],
              onlyNew: true,
            })}
          >
            {processFolder.isPending ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Brain className="h-3 w-3" />
            )}
            Processar Pasta
          </Button>
        )}
      </div>

      {/* Link para o Drive quando vinculado */}
      {driveFolderId && (
        <div className="flex items-center justify-between mb-2 pb-2 border-b">
          <span className="text-xs text-zinc-500">Pasta vinculada</span>
          <div className="flex gap-2">
            {(() => {
              const rootFolder = files.find(
                (f) => f.isFolder && f.driveFileId === driveFolderId
              );
              return rootFolder?.webViewLink ? (
                <a
                  href={rootFolder.webViewLink}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-emerald-600 hover:underline flex items-center gap-1"
                >
                  Abrir no Drive <ExternalLink className="w-3 h-3" />
                </a>
              ) : null;
            })()}
            {assistidoId && (
              <button
                className="text-xs text-zinc-400 hover:text-zinc-600"
                onClick={() => setPickerOpen(true)}
              >
                Alterar pasta
              </button>
            )}
          </div>
        </div>
      )}

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
