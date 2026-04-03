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
import { LIST_ITEM, GLASS } from "@/lib/config/design-tokens";
import { File } from "lucide-react";

type ViewMode = "tree" | "timeline" | "status" | "processo";

const TYPE_FILTERS = [
  { key: "all", label: "Todos" },
  { key: "autos", label: "Autos" },
  { key: "laudo", label: "Laudos" },
  { key: "certidao", label: "Certidões" },
  { key: "audio", label: "Áudios" },
  { key: "video", label: "Vídeos" },
] as const;

function getFileIcon(file: DriveFileData) {
  if (file.isFolder) return FolderOpen;
  if (file.mimeType?.startsWith("audio/")) return Music;
  if (file.mimeType?.startsWith("video/")) return Video;
  if (file.documentType?.toLowerCase().includes("auto") || file.categoria?.toLowerCase().includes("auto")) return Scale;
  if (file.mimeType?.includes("pdf") || file.mimeType?.includes("document")) return FileText;
  return File;
}

function matchesTypeFilter(file: DriveFileData, typeFilter: string): boolean {
  if (typeFilter === "all") return true;
  if (typeFilter === "audio") return !!file.mimeType?.startsWith("audio/");
  if (typeFilter === "video") return !!file.mimeType?.startsWith("video/");
  const searchKey = typeFilter.toLowerCase();
  return (
    !!file.documentType?.toLowerCase().includes(searchKey) ||
    !!file.categoria?.toLowerCase().includes(searchKey)
  );
}

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
      <div className="space-y-1 max-h-[400px] overflow-y-auto">
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
            const FileIcon = getFileIcon(f);
            return (
              <div
                key={f.id}
                className={cn(
                  GLASS.cardHover,
                  "flex items-center gap-2 px-3 py-2 group",
                )}
              >
                <FileIcon className="w-[13px] h-[13px] text-zinc-500 dark:text-zinc-400 shrink-0" />
                <span
                  className="text-[11px] text-zinc-700 dark:text-zinc-300 truncate flex-1 cursor-pointer"
                  onClick={() => f.webViewLink && window.open(f.webViewLink, "_blank")}
                >
                  {f.name}
                </span>
                <config.icon
                  className={cn(
                    "h-2.5 w-2.5 shrink-0",
                    config.color,
                    status === "processing" && "animate-spin",
                  )}
                />
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
                  <ExternalLink className="h-3 w-3 text-zinc-300 group-hover:text-zinc-500 shrink-0 transition-colors" />
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

function PreviewContent({ file, onOpenDetail }: { file: DriveFileData; onOpenDetail: (f: DriveFileData) => void }) {
  const enrichData = file.enrichmentData as Record<string, unknown> | null | undefined;
  const enrichText = (() => {
    if (!enrichData) return null;
    if (typeof file.enrichmentData === "string") return file.enrichmentData;
    if (typeof enrichData?.resumo === "string") return enrichData.resumo as string;
    return JSON.stringify(file.enrichmentData, null, 2);
  })();

  return (
    <div className="space-y-3 mt-4">
      <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
        {file.mimeType && <span>{file.mimeType}</span>}
        {file.lastModifiedTime && (
          <span>· {format(
            file.lastModifiedTime instanceof Date
              ? file.lastModifiedTime
              : new Date(file.lastModifiedTime),
            "dd/MM/yy",
            { locale: ptBR },
          )}</span>
        )}
        {file.enrichmentStatus && (
          <span>· {STATUS_CONFIG[file.enrichmentStatus]?.label ?? file.enrichmentStatus}</span>
        )}
      </div>
      {enrichText && (
        <div className={cn(GLASS.card, "p-3")}>
          <p className="text-[9px] uppercase tracking-wider font-semibold text-zinc-500 mb-2">Conteudo Extraido</p>
          <div className="text-xs text-foreground/80 whitespace-pre-wrap max-h-[60vh] overflow-y-auto leading-relaxed">
            {enrichText}
          </div>
        </div>
      )}
      <div className="flex gap-2">
        {file.webViewLink && (
          <a href={file.webViewLink} target="_blank" rel="noopener noreferrer">
            <Button variant="outline" size="sm" className="gap-1.5 text-xs">
              <ExternalLink className="w-3 h-3" />
              Abrir no Drive
            </Button>
          </a>
        )}
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 text-xs"
          onClick={() => onOpenDetail(file)}
        >
          <FileText className="w-3 h-3" />
          Ver Detalhes
        </Button>
      </div>
    </div>
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
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [previewFile, setPreviewFile] = useState<DriveFileData | null>(null);

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

  // Filter files by search and type
  const filteredFiles = useMemo(() => {
    let result = files;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (f) =>
          f.name.toLowerCase().includes(q) ||
          f.documentType?.toLowerCase().includes(q) ||
          f.categoria?.toLowerCase().includes(q),
      );
    }
    if (typeFilter !== "all") {
      result = result.filter((f) => f.isFolder || matchesTypeFilter(f, typeFilter));
    }
    return result;
  }, [files, searchQuery, typeFilter]);

  return (
    <div className="space-y-3">
      {/* Fluxo de vinculação quando sem pasta vinculada */}
      {showLinkFlow && (
        <div className={cn(GLASS.card, "p-4 mb-4")}>
          {loadingSuggestion ? (
            <div className="flex items-center gap-2 text-sm text-zinc-500">
              <Loader2 className="w-4 h-4 animate-spin" />
              Procurando pasta correspondente…
            </div>
          ) : suggestion ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-zinc-700">
                <FolderOpen className="w-4 h-4 text-zinc-600 dark:text-zinc-400" />
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
                    ? "bg-zinc-800 dark:bg-white text-white dark:text-zinc-900"
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
                  ? "bg-zinc-800 dark:bg-white text-white dark:text-zinc-900"
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
            className="w-full text-[11px] pl-7 pr-2 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:focus:ring-zinc-500"
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

      {/* Type filter pills */}
      <div className="flex items-center gap-1 flex-wrap">
        {TYPE_FILTERS.map((tf) => (
          <button
            key={tf.key}
            onClick={() => setTypeFilter(tf.key)}
            className={cn(
              "text-[10px] px-2 py-0.5 rounded-full font-medium transition-colors",
              typeFilter === tf.key
                ? "bg-zinc-800 dark:bg-white text-white dark:text-zinc-900"
                : "bg-zinc-100/60 dark:bg-white/[0.04] text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 border border-zinc-200/80 dark:border-white/[0.06]",
            )}
          >
            {tf.label}
          </button>
        ))}
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
                  className="text-xs text-zinc-600 dark:text-zinc-400 hover:underline flex items-center gap-1"
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

      {/* Quick Preview Sheet */}
      <Sheet open={!!previewFile} onOpenChange={(open) => !open && setPreviewFile(null)}>
        <SheetContent className="w-[400px] sm:w-[540px]">
          <SheetTitle className="text-sm font-semibold truncate">{previewFile?.name}</SheetTitle>
          {previewFile != null && (
            <PreviewContent
              file={previewFile}
              onOpenDetail={(f) => { setSelectedFile(f); setPreviewFile(null); }}
            />
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
