"use client";

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { useDriveContext } from "./DriveContext";
import {
  getFileIcon,
  getFileTypeLabel,
  formatFileSize,
  getEnrichmentBadge,
} from "./drive-constants";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@/components/ui/collapsible";
import {
  Sheet,
  SheetContent,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  X,
  Download,
  ExternalLink,
  Pencil,
  Star,
  ChevronDown,
  ChevronRight,
  Search,
  Loader2,
  Sparkles,
  User,
  Phone,
  MapPin,
  Calendar,
  AlertCircle,
  Link2,
  Brain,
  Scale,
  FileText,
  Check,
  RotateCcw,
  BookOpen,
  Bookmark,
  FileDown,
  Mic,
  FileAudio,
  Columns,
  Maximize2,
  ScanLine,
  FilePen,
  Volume2,
  MonitorPlay,
} from "lucide-react";
import { PdfViewerModal, getSectionConfig, type DocumentSection } from "./PdfViewerModal";
import { MarkdownViewerModal } from "./MarkdownViewerModal";
import { DocumentCompareModal } from "./DocumentCompareModal";
import { ExpandedPreviewModal } from "./ExpandedPreviewModal";
import { format, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { useProcessingQueue } from "@/contexts/processing-queue";
import { showProgressToast, completeProgressToast, failProgressToast } from "@/components/ui/progress-toast";
import Link from "next/link";

// ─── Types ──────────────────────────────────────────────────────────

interface DriveFile {
  id: number;
  driveFileId: string;
  name: string;
  mimeType: string | null;
  fileSize: number | null;
  size?: number | null;
  isFolder: boolean;
  webViewLink: string | null;
  webContentLink?: string | null;
  thumbnailLink: string | null;
  enrichmentStatus: string | null;
  enrichmentError?: string | null;
  categoria?: string | null;
  documentType?: string | null;
  assistidoId: number | null;
  processoId: number | null;
  createdAt: Date;
  updatedAt?: Date | null;
  lastModifiedTime?: Date | null;
  driveFolderId: string;
  parentFileId?: number | null;
  enrichmentData?: {
    sub_type?: string;
    confidence?: number;
    transcript?: string;
    transcript_plain?: string;
    speakers?: string[];
    duration?: number;
    diarization_applied?: boolean;
    [key: string]: unknown;
  } | null;
}

// ─── Helpers ────────────────────────────────────────────────────────

function formatDate(d: Date | string | null | undefined): string {
  if (!d) return "-";
  try {
    return format(new Date(d), "dd/MM/yyyy HH:mm", { locale: ptBR });
  } catch {
    return "-";
  }
}

function maskCpf(cpf: string | null | undefined): string {
  if (!cpf) return "-";
  if (cpf.length < 11) return cpf;
  // Show first 3 and last 2: 123.***.***-45
  return `${cpf.slice(0, 3)}.***.***-${cpf.slice(-2)}`;
}

function getFavorites(): Set<number> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem("drive-favorites");
    return new Set(raw ? JSON.parse(raw) : []);
  } catch {
    return new Set();
  }
}

function toggleFavorite(fileId: number): boolean {
  const favs = getFavorites();
  if (favs.has(fileId)) {
    favs.delete(fileId);
  } else {
    favs.add(fileId);
  }
  localStorage.setItem("drive-favorites", JSON.stringify([...favs]));
  return favs.has(fileId);
}

function getPrazoBadgeClass(prazoFatal: string | Date | null): string {
  if (!prazoFatal) return "bg-zinc-500/10 text-zinc-400 border-zinc-500/30";
  const days = differenceInDays(new Date(prazoFatal), new Date());
  if (days < 0) return "bg-red-500/10 text-red-400 border-red-500/30";
  if (days <= 3) return "bg-rose-500/10 text-rose-400 border-rose-500/30";
  if (days <= 7) return "bg-amber-500/10 text-amber-400 border-amber-500/30";
  return "bg-zinc-500/10 text-zinc-400 border-zinc-500/30";
}

// ─── Section Header ─────────────────────────────────────────────────

function SectionHeader({
  title,
  icon: Icon,
  isOpen,
  onToggle,
  badge,
}: {
  title: string;
  icon: React.ElementType;
  isOpen: boolean;
  onToggle: () => void;
  badge?: string;
}) {
  return (
    <button
      onClick={onToggle}
      className="flex items-center gap-2 w-full px-4 py-2.5 text-left hover:bg-zinc-100 dark:hover:bg-zinc-800/50 transition-colors duration-150"
    >
      <Icon className="h-3.5 w-3.5 text-zinc-400 dark:text-zinc-500 shrink-0" />
      <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider flex-1">
        {title}
      </span>
      {badge && (
        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          {badge}
        </span>
      )}
      {isOpen ? (
        <ChevronDown className="h-3 w-3 text-zinc-400 dark:text-zinc-600 shrink-0" />
      ) : (
        <ChevronRight className="h-3 w-3 text-zinc-400 dark:text-zinc-600 shrink-0" />
      )}
    </button>
  );
}

// ─── Media Player ───────────────────────────────────────────────────

function MediaPlayer({ file }: { file: DriveFile }) {
  const [hasError, setHasError] = useState(false);
  const mimeType = file.mimeType || "";
  const isAudio = mimeType.startsWith("audio/");
  const fileSize = file.fileSize ?? 0;

  // Proxy URL para streaming com auth (suporta Range headers)
  const proxyUrl = `/api/drive/proxy?fileId=${file.driveFileId}&stream=1`;

  if (isAudio) {
    return (
      <div className="bg-zinc-100 dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-4 flex flex-col items-center gap-3">
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-cyan-500/20 to-cyan-600/20 flex items-center justify-center">
          <Volume2 className="w-8 h-8 text-cyan-400" />
        </div>
        <p className="text-xs text-zinc-400 font-medium truncate max-w-full">
          {file.name}
        </p>
        <audio
          controls
          className="w-full max-w-full"
          preload="metadata"
          onError={() => setHasError(true)}
        >
          <source src={proxyUrl} type={mimeType} />
          {/* Fallback para webContentLink */}
          {file.webContentLink && (
            <source src={file.webContentLink} />
          )}
        </audio>
        {hasError && file.webViewLink && (
          <div className="w-full text-center">
            <p className="text-xs text-zinc-500 mb-2">Player nativo indisponivel.</p>
            <a href={file.webViewLink} target="_blank" rel="noopener noreferrer">
              <Button variant="ghost" size="sm" className="text-xs text-emerald-400 hover:text-emerald-300">
                <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                Ouvir no Drive
              </Button>
            </a>
          </div>
        )}
      </div>
    );
  }

  // Vídeo
  return (
    <div className="bg-zinc-100 dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 overflow-hidden">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-zinc-200 dark:border-zinc-800">
        <p className="text-xs text-zinc-400 truncate max-w-[200px]">{file.name}</p>
      </div>

      {/* Player nativo HTML5 via proxy */}
      {!hasError && (
        <div className="aspect-video">
          <video
            controls
            className="w-full h-full bg-black"
            preload="metadata"
            onError={() => setHasError(true)}
          >
            <source src={proxyUrl} type={mimeType} />
            Seu navegador nao suporta reproducao de video.
          </video>
        </div>
      )}

      {/* Fallback: abrir no Drive */}
      {hasError && (
        <div className="aspect-video flex flex-col items-center justify-center gap-2">
          <MonitorPlay className="w-12 h-12 text-zinc-600" />
          <p className="text-xs text-zinc-500">Player indisponivel</p>
          {file.webViewLink && (
            <a href={file.webViewLink} target="_blank" rel="noopener noreferrer">
              <Button variant="ghost" size="sm" className="text-xs text-emerald-400 hover:text-emerald-300">
                <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                Assistir no Drive
              </Button>
            </a>
          )}
        </div>
      )}

      {/* Info de tamanho */}
      {fileSize > 0 && (
        <div className="px-3 py-1 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
          <span className="text-[10px] text-zinc-500">
            {formatFileSize(fileSize)}
          </span>
        </div>
      )}
    </div>
  );
}

// ─── Preview Section ────────────────────────────────────────────────

function FilePreview({ file }: { file: DriveFile }) {
  const mimeType = file.mimeType || "";
  const isPdf = mimeType.includes("pdf");
  const isImage = mimeType.startsWith("image/");
  const isAudio = mimeType.startsWith("audio/");
  const isVideo = mimeType.startsWith("video/");
  const isGoogleDoc =
    mimeType.includes("google-apps.document") ||
    mimeType.includes("google-apps.spreadsheet");

  if (isPdf && file.driveFileId) {
    return (
      <div className="h-[500px] bg-zinc-100 dark:bg-zinc-900 rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-800">
        <iframe
          src={`/api/drive/proxy?fileId=${file.driveFileId}`}
          className="w-full h-full border-0"
          title={file.name}
        />
      </div>
    );
  }

  if (isImage) {
    const imgSrc = file.thumbnailLink
      ? file.thumbnailLink.replace("=s220", "=s800")
      : file.webViewLink;
    if (imgSrc) {
      return (
        <div className="aspect-video bg-zinc-100 dark:bg-zinc-900 rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-800 flex items-center justify-center">
          <a
            href={file.webViewLink || "#"}
            target="_blank"
            rel="noopener noreferrer"
          >
            <img
              src={imgSrc}
              alt={file.name}
              className="max-w-full max-h-full object-contain cursor-pointer hover:opacity-90 transition-opacity"
            />
          </a>
        </div>
      );
    }
  }

  // Áudio e Vídeo: usar MediaPlayer com fallback
  if (isAudio || isVideo) {
    return <MediaPlayer file={file} />;
  }

  if (isGoogleDoc && file.webViewLink) {
    const docIcon = mimeType.includes("spreadsheet") ? "Planilha" : "Documento";
    return (
      <div className="bg-zinc-100 dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-8 flex flex-col items-center gap-3">
        {file.thumbnailLink ? (
          <img
            src={file.thumbnailLink.replace("=s220", "=s600")}
            alt={file.name}
            className="max-w-full max-h-[300px] object-contain rounded border border-zinc-200 dark:border-zinc-700"
          />
        ) : (
          <FileText className="w-16 h-16 text-zinc-400 dark:text-zinc-600" />
        )}
        <p className="text-xs text-zinc-400 dark:text-zinc-500">{docIcon} Google — abrir no Drive para visualizar</p>
        <a href={file.webViewLink} target="_blank" rel="noopener noreferrer">
          <Button variant="ghost" size="sm" className="text-xs text-emerald-400 hover:text-emerald-300">
            <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
            Abrir no Drive
          </Button>
        </a>
      </div>
    );
  }

  // Fallback: large file icon + open in Drive
  const FileIcon = getFileIcon(file.mimeType);
  return (
    <div className="bg-zinc-100 dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-8 flex flex-col items-center gap-3">
      <FileIcon className="w-16 h-16 text-zinc-400 dark:text-zinc-600" />
      <p className="text-xs text-zinc-400 dark:text-zinc-500">Preview nao disponivel</p>
      {file.webViewLink && (
        <a
          href={file.webViewLink}
          target="_blank"
          rel="noopener noreferrer"
        >
          <Button
            variant="ghost"
            size="sm"
            className="text-xs text-emerald-400 hover:text-emerald-300"
          >
            <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
            Abrir no Drive
          </Button>
        </a>
      )}
    </div>
  );
}

// ─── Action Buttons Row ─────────────────────────────────────────────

function ActionRow({
  file,
  isFavorited,
  onToggleFavorite,
  onStartRename,
  onTranscribe,
  isTranscribing,
}: {
  file: DriveFile;
  isFavorited: boolean;
  onToggleFavorite: () => void;
  onStartRename: () => void;
  onTranscribe?: () => void;
  isTranscribing?: boolean;
}) {
  const isAudioVideo =
    file.mimeType?.startsWith("audio/") ||
    file.mimeType?.startsWith("video/");

  return (
    <div className="flex items-center gap-1">
      {/* Download / Open */}
      {file.webContentLink && (
        <a href={file.webContentLink} target="_blank" rel="noopener noreferrer">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
            title="Download"
          >
            <Download className="h-4 w-4" />
          </Button>
        </a>
      )}

      {/* Open in Drive */}
      {file.webViewLink && (
        <a
          href={file.webViewLink}
          target="_blank"
          rel="noopener noreferrer"
        >
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
            title="Abrir no Drive"
          >
            <ExternalLink className="h-4 w-4" />
          </Button>
        </a>
      )}

      {/* Transcribe (audio/video only) */}
      {isAudioVideo && onTranscribe && (
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "h-8 w-8",
            file.enrichmentStatus === "completed"
              ? "text-emerald-500 hover:text-emerald-400"
              : "text-cyan-500 hover:text-cyan-400"
          )}
          title={
            file.enrichmentStatus === "completed"
              ? "Transcrição concluída"
              : file.enrichmentStatus === "processing"
                ? "Transcrevendo..."
                : "Transcrever com Whisper"
          }
          onClick={onTranscribe}
          disabled={isTranscribing || file.enrichmentStatus === "processing"}
        >
          {isTranscribing || file.enrichmentStatus === "processing" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Mic className="h-4 w-4" />
          )}
        </Button>
      )}

      {/* Rename */}
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
        title="Renomear"
        onClick={onStartRename}
      >
        <Pencil className="h-4 w-4" />
      </Button>

      {/* Favorite */}
      <Button
        variant="ghost"
        size="icon"
        className={cn(
          "h-8 w-8",
          isFavorited
            ? "text-amber-400 hover:text-amber-300"
            : "text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
        )}
        title={isFavorited ? "Remover dos favoritos" : "Favoritar"}
        onClick={onToggleFavorite}
      >
        <Star
          className={cn("h-4 w-4", isFavorited && "fill-amber-400")}
        />
      </Button>
    </div>
  );
}

// ─── Inline Rename ──────────────────────────────────────────────────

function InlineRename({
  file,
  onCancel,
  onRenamed,
}: {
  file: DriveFile;
  onCancel: () => void;
  onRenamed: () => void;
}) {
  const [newName, setNewName] = useState(file.name);
  const inputRef = useRef<HTMLInputElement>(null);
  const utils = trpc.useUtils();

  const renameMutation = trpc.drive.renameFile.useMutation({
    onSuccess: () => {
      toast.success("Arquivo renomeado");
      utils.drive.files.invalidate();
      onRenamed();
    },
    onError: (err) => {
      toast.error(err.message || "Erro ao renomear");
    },
  });

  useEffect(() => {
    inputRef.current?.select();
  }, []);

  const handleSubmit = () => {
    const trimmed = newName.trim();
    if (!trimmed || trimmed === file.name) {
      onCancel();
      return;
    }
    renameMutation.mutate({ fileId: file.driveFileId, newName: trimmed });
  };

  return (
    <div className="flex items-center gap-1.5">
      <Input
        ref={inputRef}
        value={newName}
        onChange={(e) => setNewName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") handleSubmit();
          if (e.key === "Escape") onCancel();
        }}
        className="h-7 text-sm bg-zinc-100 dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-200 flex-1"
        disabled={renameMutation.isPending}
      />
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 text-emerald-400 hover:text-emerald-300"
        onClick={handleSubmit}
        disabled={renameMutation.isPending}
      >
        {renameMutation.isPending ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Check className="h-3.5 w-3.5" />
        )}
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 text-zinc-400 hover:text-zinc-700 dark:text-zinc-500 dark:hover:text-zinc-300"
        onClick={onCancel}
        disabled={renameMutation.isPending}
      >
        <X className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

// ─── Metadata Section ───────────────────────────────────────────────

function MetadataSection({ file }: { file: DriveFile }) {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <div>
          <SectionHeader
            title="Metadados"
            icon={FileText}
            isOpen={isOpen}
            onToggle={() => setIsOpen(!isOpen)}
          />
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="px-4 pb-3 space-y-2">
          <MetaRow label="Tipo" value={getFileTypeLabel(file.mimeType)} />
          <MetaRow
            label="Tamanho"
            value={formatFileSize(file.fileSize ?? file.size ?? null)}
          />
          <MetaRow label="Criado" value={formatDate(file.createdAt)} />
          <MetaRow
            label="Modificado"
            value={formatDate(file.lastModifiedTime || file.updatedAt)}
          />
          <MetaRow
            label="Drive ID"
            value={
              <span
                className="font-mono text-[10px] text-zinc-400 dark:text-zinc-600 truncate block max-w-[180px]"
                title={file.driveFileId}
              >
                {file.driveFileId}
              </span>
            }
          />
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

function MetaRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-2">
      <span className="text-[11px] text-zinc-400 dark:text-zinc-500 shrink-0">{label}</span>
      <span className="text-[11px] text-zinc-700 dark:text-zinc-300 text-right">{value}</span>
    </div>
  );
}

// ─── Enrichment Section ─────────────────────────────────────────────

function EnrichmentSection({ file }: { file: DriveFile }) {
  const [isOpen, setIsOpen] = useState(true);
  const utils = trpc.useUtils();
  const isPdf = file.mimeType?.includes("pdf");

  const { data: ocrStatus } = trpc.documentSections.getOcrStatus.useQuery(
    { driveFileId: file.id },
    { enabled: !!file.id && !!isPdf }
  );

  const retryMutation = trpc.drive.retryEnrichment.useMutation({
    onSuccess: () => {
      toast.success("Re-processamento iniciado");
      utils.drive.files.invalidate();
    },
    onError: (err) => {
      toast.error(err.message || "Erro ao re-processar");
    },
  });

  const badge = getEnrichmentBadge(file.enrichmentStatus);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <div>
          <SectionHeader
            title="Enrichment"
            icon={Sparkles}
            isOpen={isOpen}
            onToggle={() => setIsOpen(!isOpen)}
            badge={badge.label || undefined}
          />
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="px-4 pb-3 space-y-3">
          {/* Status badge + OCR indicator */}
          {(badge.label || ocrStatus?.ocrApplied) && (
            <div className="flex items-center gap-2">
              {badge.label && (
                <span
                  className={cn(
                    "text-[11px] px-2 py-0.5 rounded-full border",
                    badge.class
                  )}
                >
                  {badge.label}
                </span>
              )}
              {ocrStatus?.ocrApplied && (
                <Badge className="text-[9px] bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400 border-amber-300 dark:border-amber-700">
                  <ScanLine className="w-3 h-3 mr-1" />
                  OCR
                </Badge>
              )}
            </div>
          )}

          {/* Document type and categoria */}
          {file.documentType && (
            <MetaRow label="Tipo Detectado" value={file.documentType} />
          )}
          {file.categoria && (
            <MetaRow label="Categoria" value={file.categoria} />
          )}

          {/* Error message */}
          {file.enrichmentError && (
            <div className="bg-red-500/5 border border-red-500/20 rounded-lg p-2">
              <p className="text-[10px] text-red-400 break-words">
                {file.enrichmentError}
              </p>
            </div>
          )}

          {/* Retry button */}
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2.5 text-xs text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 border border-emerald-500/20 rounded-lg w-full"
            onClick={() => retryMutation.mutate({ fileIds: [file.id] })}
            disabled={
              retryMutation.isPending ||
              file.enrichmentStatus === "processing"
            }
          >
            {retryMutation.isPending ? (
              <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
            ) : (
              <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
            )}
            Re-processar
          </Button>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

// ─── Suggested Actions Section (Enrichment Bridge) ──────────────────

function SuggestedActionsSection({ file }: { file: DriveFile }) {
  const [isOpen, setIsOpen] = useState(false);
  const utils = trpc.useUtils();

  const { data: actionData } = trpc.enrichment.suggestActionsFromEnrichment.useQuery(
    { driveFileId: file.id },
    { enabled: !!file.id && (file.enrichmentStatus === "completed" || file.enrichmentStatus === "classified") }
  );

  const applyMutation = trpc.enrichment.applyEnrichmentActions.useMutation({
    onSuccess: (data) => {
      const created = data.results.filter(r => r.success).length;
      if (created > 0) {
        toast.success(`${created} ação(ões) aplicada(s)`);
        utils.drive.files.invalidate();
      }
    },
    onError: (err) => {
      toast.error(err.message || "Erro ao aplicar ações");
    },
  });

  const suggestions = actionData?.suggestions || [];
  if (suggestions.length === 0) return null;

  const urgencyColors: Record<string, string> = {
    alta: "bg-red-500/10 text-red-500 border-red-500/20",
    media: "bg-amber-500/10 text-amber-600 border-amber-500/20",
    baixa: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <div>
          <SectionHeader
            title="Ações Sugeridas"
            icon={Scale}
            isOpen={isOpen}
            onToggle={() => setIsOpen(!isOpen)}
            badge={`${suggestions.length}`}
          />
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="px-4 pb-3 space-y-2">
          {suggestions.map((s, i) => (
            <div
              key={i}
              className="bg-zinc-50 dark:bg-zinc-800/50 rounded-lg p-2.5 border border-zinc-200 dark:border-zinc-700 space-y-1.5"
            >
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-medium text-zinc-800 dark:text-zinc-200 flex-1">
                  {s.title}
                </span>
                {s.urgencia && (
                  <span className={cn("text-[9px] px-1.5 py-0.5 rounded-full border font-medium", urgencyColors[s.urgencia] || urgencyColors.baixa)}>
                    {s.urgencia}
                  </span>
                )}
              </div>
              <p className="text-[10px] text-zinc-500 dark:text-zinc-400 leading-relaxed">
                {s.description}
              </p>
              <div className="flex items-center gap-1.5 pt-0.5">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-[10px] text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 border border-emerald-500/20 rounded"
                  onClick={() => applyMutation.mutate({
                    driveFileId: file.id,
                    actions: [{
                      type: s.type,
                      demandaTipo: s.demandaTipo,
                      processoId: actionData?.processoId ?? undefined,
                      assistidoId: actionData?.assistidoId ?? undefined,
                    }],
                  })}
                  disabled={applyMutation.isPending}
                >
                  {applyMutation.isPending ? (
                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                  ) : (
                    <Check className="h-3 w-3 mr-1" />
                  )}
                  Aplicar
                </Button>
                <span className="text-[9px] text-zinc-400">
                  {Math.round(s.confidence * 100)}% confiança
                </span>
              </div>
            </div>
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

// ─── Link Suggestions Section (Auto-link from Enrichment) ───────────

function LinkSuggestionsSection({ file }: { file: DriveFile }) {
  const [isOpen, setIsOpen] = useState(false);
  const utils = trpc.useUtils();

  const { data: suggestions } = trpc.drive.suggestLinksFromEnrichment.useQuery(
    { fileIds: [file.id] },
    { enabled: !!file.id && !file.processoId && (file.enrichmentStatus === "completed" || file.enrichmentStatus === "classified") }
  );

  const applyMutation = trpc.drive.applyLinkSuggestions.useMutation({
    onSuccess: (data) => {
      if (data.linked > 0) {
        toast.success(`Arquivo vinculado com sucesso`);
        utils.drive.files.invalidate();
      }
    },
    onError: (err) => {
      toast.error(err.message || "Erro ao vincular");
    },
  });

  if (!suggestions || suggestions.length === 0) return null;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <div>
          <SectionHeader
            title="Vinculação Sugerida"
            icon={Link2}
            isOpen={isOpen}
            onToggle={() => setIsOpen(!isOpen)}
            badge="Auto"
          />
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="px-4 pb-3 space-y-2">
          {suggestions.map((s) => (
            <div
              key={s.fileId}
              className="bg-emerald-500/5 dark:bg-emerald-500/10 border border-emerald-500/20 dark:border-emerald-500/10 rounded-lg p-2.5 space-y-1.5"
            >
              {s.suggestedProcessoNumero && (
                <div className="flex items-center gap-1.5">
                  <Scale className="h-3 w-3 text-blue-400" />
                  <span className="text-[11px] font-mono text-blue-600 dark:text-blue-400">
                    {s.suggestedProcessoNumero}
                  </span>
                </div>
              )}
              {s.suggestedAssistidoNome && (
                <div className="flex items-center gap-1.5">
                  <User className="h-3 w-3 text-blue-400" />
                  <span className="text-[11px] text-zinc-600 dark:text-zinc-400">
                    {s.suggestedAssistidoNome}
                  </span>
                </div>
              )}
              <p className="text-[10px] text-zinc-400">{s.reason}</p>
              <div className="flex items-center gap-1.5 pt-0.5">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-[10px] text-blue-600 dark:text-blue-400 hover:bg-blue-500/10 border border-blue-500/20 rounded"
                  onClick={() => applyMutation.mutate({
                    suggestions: [{
                      fileId: s.fileId,
                      processoId: s.suggestedProcessoId,
                      assistidoId: s.suggestedAssistidoId,
                    }],
                  })}
                  disabled={applyMutation.isPending}
                >
                  {applyMutation.isPending ? (
                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                  ) : (
                    <Check className="h-3 w-3 mr-1" />
                  )}
                  Vincular
                </Button>
                <span className="text-[9px] text-zinc-400">
                  {Math.round(s.confidence * 100)}% confiança
                </span>
              </div>
            </div>
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

// ─── Transcription Section (Audio/Video) ───────────────────────────

function TranscriptionSection({
  file,
  onTranscribe,
  isTranscribing,
}: {
  file: DriveFile;
  onTranscribe: () => void;
  isTranscribing: boolean;
}) {
  const [isOpen, setIsOpen] = useState(true);
  const [showFull, setShowFull] = useState(false);

  const isAudioVideo =
    file.mimeType?.startsWith("audio/") ||
    file.mimeType?.startsWith("video/");

  if (!isAudioVideo) return null;

  // Read transcription from enrichmentData (saved by Inngest function)
  const enrichData = file.enrichmentData;
  const transcriptPlain = enrichData?.transcript_plain as string | undefined;
  const transcriptFull = enrichData?.transcript as string | undefined;
  const speakers = enrichData?.speakers as string[] | undefined;
  const duration = enrichData?.duration as number | undefined;

  const hasTranscription = !!transcriptPlain;
  const isProcessing = file.enrichmentStatus === "processing" || isTranscribing;

  const statusLabel =
    file.enrichmentStatus === "completed" && hasTranscription
      ? "Concluída"
      : isProcessing
        ? "Transcrevendo..."
        : file.enrichmentStatus === "failed"
          ? "Falhou"
          : "Pendente";
  const statusClass =
    file.enrichmentStatus === "completed" && hasTranscription
      ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
      : isProcessing
        ? "bg-cyan-500/10 text-cyan-500 border-cyan-500/20"
        : file.enrichmentStatus === "failed"
          ? "bg-red-500/10 text-red-400 border-red-500/20"
          : "bg-zinc-500/10 text-zinc-400 border-zinc-500/20";

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <div>
          <SectionHeader
            title="TRANSCRIÇÃO"
            icon={FileAudio}
            isOpen={isOpen}
            onToggle={() => setIsOpen(!isOpen)}
            badge={statusLabel}
          />
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="px-4 pb-3 space-y-3">
          {/* Status badge */}
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "text-[11px] px-2 py-0.5 rounded-full border",
                statusClass
              )}
            >
              {isProcessing && <Loader2 className="h-3 w-3 mr-1 animate-spin inline" />}
              {statusLabel}
            </span>
            {speakers && speakers.length > 0 && (
              <span className="text-[10px] text-zinc-500">
                {speakers.length} speaker{speakers.length > 1 ? "s" : ""}
              </span>
            )}
            {duration ? (
              <span className="text-[10px] text-zinc-500">
                {Math.floor(duration / 60)}min {Math.floor(duration % 60)}s
              </span>
            ) : null}
          </div>

          {/* Processing message with progress bar */}
          {isProcessing && !hasTranscription && (() => {
            const progress = enrichData?.progress as { step?: string; percent?: number; detail?: string } | undefined;
            const pct = progress?.percent ?? 15;
            const detail = progress?.detail ?? "Processando...";
            return (
              <div className="bg-zinc-500/5 dark:bg-zinc-500/10 border border-zinc-200 dark:border-zinc-700/50 rounded-lg p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 rounded-full bg-zinc-200 dark:bg-zinc-800 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-violet-500 transition-all duration-1000 ease-out"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-[10px] font-mono text-zinc-500 tabular-nums w-8 text-right shrink-0">
                    {pct}%
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Loader2 className="h-3 w-3 animate-spin text-cyan-400 shrink-0" />
                  <span className="text-[11px] text-cyan-400/80">{detail}</span>
                </div>
              </div>
            );
          })()}

          {/* Error message */}
          {file.enrichmentStatus === "failed" && file.enrichmentError && (
            <div className="text-xs text-red-400/80 bg-red-500/5 border border-red-500/10 rounded-lg p-2.5">
              {file.enrichmentError}
            </div>
          )}

          {/* Transcription text (truncated) */}
          {hasTranscription && (
            <div className="space-y-2">
              <div
                className={cn(
                  "text-xs text-zinc-600 dark:text-zinc-400 whitespace-pre-wrap font-mono leading-relaxed bg-zinc-50 dark:bg-zinc-900 rounded-lg p-3 border border-zinc-200 dark:border-zinc-800",
                  !showFull && "max-h-[200px] overflow-hidden relative"
                )}
              >
                {showFull
                  ? (transcriptFull || transcriptPlain)
                  : transcriptPlain.slice(0, 500) +
                    (transcriptPlain.length > 500 ? "..." : "")}
                {!showFull && transcriptPlain.length > 500 && (
                  <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-zinc-50 dark:from-zinc-900 to-transparent" />
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2.5 text-xs text-cyan-500 hover:text-cyan-400 hover:bg-cyan-500/10 w-full"
                onClick={() => setShowFull(!showFull)}
              >
                {showFull ? "Mostrar menos" : "Ver transcrição completa"}
              </Button>
            </div>
          )}

          {/* Transcribe button */}
          {!hasTranscription && !isProcessing && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2.5 text-xs text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10 border border-cyan-500/20 rounded-lg w-full"
              onClick={onTranscribe}
              disabled={isTranscribing}
            >
              <Mic className="h-3.5 w-3.5 mr-1.5" />
              Transcrever com Whisper
            </Button>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

// ─── Juridical Context Section ──────────────────────────────────────

function JuridicalContextSection({ file }: { file: DriveFile }) {
  const [isOpen, setIsOpen] = useState(true);

  // Find the parent folder name by extracting from breadcrumb or querying
  // We use the file's driveFolderId to find the folder name
  // For simplicity, we query the assistido based on the folder name
  // The folder's name is usually available in the breadcrumb path
  const ctx = useDriveContext();

  // Get current folder name from breadcrumbs (the innermost folder is most likely the assistido)
  const folderName = useMemo(() => {
    if (ctx.breadcrumbPath.length > 0) {
      // Use the last subfolder (deepest in the path), which usually matches the assistido
      // Skip the root atribuicao folder
      const path = ctx.breadcrumbPath;
      return path.length > 1 ? path[path.length - 1].name : path[0].name;
    }
    return null;
  }, [ctx.breadcrumbPath]);

  const { data: assistido, isLoading } =
    trpc.drive.getAssistidoByFolderName.useQuery(
      { folderName: folderName! },
      { enabled: !!folderName }
    );

  const statusColors: Record<string, string> = {
    SOLTO: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
    CADEIA_PUBLICA: "bg-rose-500/10 text-rose-400 border-rose-500/30",
    PENITENCIARIA: "bg-rose-500/10 text-rose-400 border-rose-500/30",
    DOMICILIAR: "bg-amber-500/10 text-amber-400 border-amber-500/30",
    MONITORADO: "bg-sky-500/10 text-sky-400 border-sky-500/30",
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <div>
          <SectionHeader
            title="Contexto Juridico"
            icon={Scale}
            isOpen={isOpen}
            onToggle={() => setIsOpen(!isOpen)}
          />
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="px-4 pb-3 space-y-3">
          {isLoading && (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full bg-zinc-200 dark:bg-zinc-800" />
              <Skeleton className="h-6 w-3/4 bg-zinc-200 dark:bg-zinc-800" />
            </div>
          )}

          {!isLoading && !assistido && (
            <div className="text-center py-3">
              <User className="w-8 h-8 mx-auto text-zinc-300 dark:text-zinc-700 mb-2" />
              <p className="text-[11px] text-zinc-400 dark:text-zinc-500">
                Nenhum assistido vinculado
              </p>
              {folderName && (
                <p className="text-[10px] text-zinc-400 dark:text-zinc-600 mt-1">
                  Pasta: {folderName}
                </p>
              )}
            </div>
          )}

          {!isLoading && assistido && (
            <>
              {/* Assistido info */}
              <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-lg p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center shrink-0">
                    {assistido.photoUrl ? (
                      <img
                        src={assistido.photoUrl}
                        alt=""
                        className="h-8 w-8 rounded-full object-cover"
                      />
                    ) : (
                      <User className="h-4 w-4 text-zinc-500 dark:text-zinc-400" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-zinc-900 dark:text-zinc-200 truncate">
                      {assistido.nome}
                    </p>
                    <p className="text-[10px] text-zinc-400 dark:text-zinc-500 font-mono">
                      {maskCpf(assistido.cpf)}
                    </p>
                  </div>
                </div>

                {/* Status prisional */}
                {assistido.statusPrisional && (
                  <Badge
                    className={cn(
                      "text-[10px]",
                      statusColors[assistido.statusPrisional] ||
                        "bg-zinc-200/50 dark:bg-zinc-700/50 text-zinc-500 dark:text-zinc-400"
                    )}
                  >
                    {assistido.statusPrisional.replace(/_/g, " ")}
                  </Badge>
                )}

                {/* Contact */}
                {assistido.telefone && (
                  <div className="flex items-center gap-1.5">
                    <Phone className="h-3 w-3 text-zinc-400 dark:text-zinc-500" />
                    <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
                      {assistido.telefone}
                    </span>
                  </div>
                )}
                {assistido.localPrisao && (
                  <div className="flex items-center gap-1.5">
                    <MapPin className="h-3 w-3 text-rose-500" />
                    <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
                      {assistido.localPrisao}
                    </span>
                  </div>
                )}
              </div>

              {/* Processos */}
              {assistido.processos && assistido.processos.length > 0 && (
                <div>
                  <p className="text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-1.5">
                    Processos ({assistido.processos.length})
                  </p>
                  <div className="space-y-1">
                    {assistido.processos.map((proc: any) => (
                      <Link
                        key={proc.id}
                        href={`/admin/processos/${proc.id}`}
                      >
                        <div className="bg-zinc-100 dark:bg-zinc-800/50 rounded-md px-2.5 py-1.5 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors cursor-pointer">
                          <p className="text-[11px] font-mono text-zinc-700 dark:text-zinc-300 truncate">
                            {proc.numero}
                          </p>
                          <p className="text-[10px] text-zinc-400 dark:text-zinc-500 truncate">
                            {proc.vara || proc.tipoAcao || proc.status}
                          </p>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Demandas pendentes */}
              {assistido.demandas && assistido.demandas.length > 0 && (
                <div>
                  <p className="text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3 text-amber-500" />
                    Demandas Pendentes
                  </p>
                  <div className="space-y-1">
                    {assistido.demandas.map((dem: any) => (
                      <div
                        key={dem.id}
                        className={cn(
                          "rounded-md px-2.5 py-1.5 border-l-2",
                          dem.prioridade === "URGENTE" ||
                            dem.prioridade === "REU_PRESO"
                            ? "border-rose-500 bg-rose-500/5"
                            : "border-amber-500 bg-amber-500/5"
                        )}
                      >
                        <p className="text-[11px] text-zinc-700 dark:text-zinc-300 truncate">
                          {dem.ato}
                        </p>
                        {dem.prazoFatal && (
                          <div className="flex items-center gap-1 mt-0.5">
                            <Calendar className="h-2.5 w-2.5 text-zinc-400 dark:text-zinc-500" />
                            <span
                              className={cn(
                                "text-[10px] px-1 py-px rounded border",
                                getPrazoBadgeClass(dem.prazoFatal)
                              )}
                            >
                              {format(new Date(dem.prazoFatal), "dd/MM/yyyy")}
                            </span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Link to assistido profile */}
              <Link href={`/admin/assistidos/${assistido.id}`}>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200 w-full"
                >
                  Ver perfil completo
                </Button>
              </Link>
            </>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

// ─── IA Insights Section (Placeholder) ──────────────────────────────

function IAInsightsSection({ file }: { file: DriveFile }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <div>
          <SectionHeader
            title="IA Insights"
            icon={Brain}
            isOpen={isOpen}
            onToggle={() => setIsOpen(!isOpen)}
          />
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="px-4 pb-3 space-y-3">
          {/* Dados Extraidos */}
          <div>
            <p className="text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-1.5">
              Dados Extraidos
            </p>
            {file.documentType || file.categoria ? (
              <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-lg p-2 space-y-1">
                {file.documentType && (
                  <MetaRow label="Tipo Doc" value={file.documentType} />
                )}
                {file.categoria && (
                  <MetaRow label="Categoria" value={file.categoria} />
                )}
              </div>
            ) : (
              <p className="text-[11px] text-zinc-400 dark:text-zinc-600">
                Nenhum dado extraido
              </p>
            )}
          </div>

          {/* Jurisprudencia Relacionada */}
          <div>
            <p className="text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-1.5">
              Jurisprudencia Relacionada
            </p>
            <p className="text-[11px] text-zinc-400 dark:text-zinc-600">
              Analise nao disponivel
            </p>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs text-zinc-400 dark:text-zinc-600 w-full mt-1 cursor-not-allowed"
              disabled
            >
              <Search className="h-3 w-3 mr-1.5" />
              Analisar
            </Button>
          </div>

          {/* Analise do Caso */}
          <div>
            <p className="text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-1.5">
              Analise do Caso
            </p>
            <p className="text-[11px] text-zinc-400 dark:text-zinc-600">
              Agente IA nao configurado
            </p>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs text-zinc-400 dark:text-zinc-600 w-full mt-1 cursor-not-allowed"
              disabled
            >
              <Brain className="h-3 w-3 mr-1.5" />
              Solicitar Analise
            </Button>
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

// ─── Link Actions Section ───────────────────────────────────────────

function LinkActionsSection({ file }: { file: DriveFile }) {
  const [isOpen, setIsOpen] = useState(false);
  const [processoSearch, setProcessoSearch] = useState("");
  const [assistidoSearch, setAssistidoSearch] = useState("");
  const utils = trpc.useUtils();

  const { data: processoResults } = trpc.drive.searchProcessosForLink.useQuery(
    { search: processoSearch },
    { enabled: processoSearch.length >= 2 }
  );

  const { data: assistidoResults } =
    trpc.drive.searchAssistidosForLink.useQuery(
      { search: assistidoSearch },
      { enabled: assistidoSearch.length >= 2 }
    );

  const linkMutation = trpc.drive.linkFileToEntity.useMutation({
    onSuccess: () => {
      toast.success("Arquivo vinculado com sucesso");
      utils.drive.files.invalidate();
      setProcessoSearch("");
      setAssistidoSearch("");
    },
    onError: (err) => {
      toast.error(err.message || "Erro ao vincular");
    },
  });

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <div>
          <SectionHeader
            title="Vincular"
            icon={Link2}
            isOpen={isOpen}
            onToggle={() => setIsOpen(!isOpen)}
          />
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="px-4 pb-3 space-y-3">
          {/* Current links */}
          {(file.processoId || file.assistidoId) && (
            <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-lg p-2">
              <p className="text-[10px] text-emerald-400 font-medium">
                Vinculado a:
              </p>
              {file.processoId && (
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                  Processo #{file.processoId}
                </p>
              )}
              {file.assistidoId && (
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                  Assistido #{file.assistidoId}
                </p>
              )}
            </div>
          )}

          {/* Vincular a Processo */}
          <div>
            <p className="text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-1.5">
              Vincular a Processo
            </p>
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-zinc-400 dark:text-zinc-600" />
              <Input
                value={processoSearch}
                onChange={(e) => setProcessoSearch(e.target.value)}
                placeholder="Buscar por numero ou nome..."
                className="h-7 text-xs pl-7 bg-zinc-100 dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-300 placeholder:text-zinc-400 dark:placeholder:text-zinc-600"
              />
            </div>
            {processoResults && processoResults.length > 0 && (
              <div className="mt-1 max-h-32 overflow-y-auto space-y-0.5">
                {processoResults.map((proc: any) => (
                  <button
                    key={proc.id}
                    onClick={() =>
                      linkMutation.mutate({
                        fileId: file.id,
                        processoId: proc.id,
                      })
                    }
                    className="w-full text-left px-2 py-1.5 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                    disabled={linkMutation.isPending}
                  >
                    <p className="text-[11px] font-mono text-zinc-700 dark:text-zinc-300 truncate">
                      {proc.numero}
                    </p>
                    {proc.assistidoNome && (
                      <p className="text-[10px] text-zinc-400 dark:text-zinc-500 truncate">
                        {proc.assistidoNome}
                      </p>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Vincular a Assistido */}
          <div>
            <p className="text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-1.5">
              Vincular a Assistido
            </p>
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-zinc-400 dark:text-zinc-600" />
              <Input
                value={assistidoSearch}
                onChange={(e) => setAssistidoSearch(e.target.value)}
                placeholder="Buscar por nome ou CPF..."
                className="h-7 text-xs pl-7 bg-zinc-100 dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-300 placeholder:text-zinc-400 dark:placeholder:text-zinc-600"
              />
            </div>
            {assistidoResults && assistidoResults.length > 0 && (
              <div className="mt-1 max-h-32 overflow-y-auto space-y-0.5">
                {assistidoResults.map((ass: any) => (
                  <button
                    key={ass.id}
                    onClick={() =>
                      linkMutation.mutate({
                        fileId: file.id,
                        assistidoId: ass.id,
                      })
                    }
                    className="w-full text-left px-2 py-1.5 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                    disabled={linkMutation.isPending}
                  >
                    <p className="text-[11px] text-zinc-700 dark:text-zinc-300 truncate">
                      {ass.nome}
                    </p>
                    {ass.cpf && (
                      <p className="text-[10px] text-zinc-400 dark:text-zinc-500 font-mono">
                        {maskCpf(ass.cpf)}
                      </p>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

// ─── Detail Panel Content ───────────────────────────────────────────

// ─── Types for Report ───────────────────────────────────────────────

type ReportSection = {
  tipo: string;
  titulo: string;
  paginaInicio: number;
  paginaFim: number;
  resumo?: string | null;
  confianca?: number;
  metadata?: {
    partesmencionadas?: string[];
    datasExtraidas?: string[];
    artigosLei?: string[];
    juiz?: string;
    promotor?: string;
  } | null;
};

// ─── Peças Processuais Section ──────────────────────────────────────

function PecasProcessuaisSection({
  file,
  onOpenViewer,
}: {
  file: DriveFile;
  onOpenViewer: () => void;
}) {
  const [isOpen, setIsOpen] = useState(true);
  const [isBookmarking, setIsBookmarking] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const isPdf = file.mimeType?.includes("pdf");

  // Only query sections for PDFs
  const { data: summary, isLoading } = trpc.documentSections.getSummary.useQuery(
    { driveFileId: file.id },
    { enabled: !!isPdf }
  );

  const triggerBookmarks = trpc.documentSections.triggerBookmarks.useMutation({
    onSuccess: () => {
      toast.success("Bookmarks sendo inseridos no PDF. O arquivo será atualizado no Drive em instantes.");
      setIsBookmarking(false);
    },
    onError: (err) => {
      toast.error(`Erro ao inserir bookmarks: ${err.message}`);
      setIsBookmarking(false);
    },
  });

  const { data: reportData } = trpc.documentSections.getReportData.useQuery(
    { driveFileId: file.id },
    { enabled: !!isPdf && isExporting }
  );

  // Generate and download report when data is ready
  useEffect(() => {
    if (!isExporting || !reportData || reportData.sections.length === 0) return;

    (async () => {
      try {
        const { generateSectionReport } = await import("@/lib/services/pdf-report-generator");
        const pdfBytes = generateSectionReport({
          fileName: reportData.fileName,
          totalPages: reportData.sections.reduce(
            (max, s) => Math.max(max, s.paginaFim),
            0
          ),
          sections: reportData.sections.map((s) => ({
            tipo: s.tipo,
            titulo: s.titulo,
            paginaInicio: s.paginaInicio,
            paginaFim: s.paginaFim,
            resumo: s.resumo,
            confianca: s.confianca ?? 0,
            metadata: s.metadata as ReportSection["metadata"],
          })),
        });

        const blob = new Blob([pdfBytes as BlobPart], { type: "application/pdf" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `relatorio-pecas-${file.name.replace(/\.pdf$/i, "")}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success("Relatório exportado com sucesso!");
      } catch (err) {
        toast.error("Erro ao gerar relatório");
        console.error(err);
      } finally {
        setIsExporting(false);
      }
    })();
  }, [reportData, isExporting, file.name]);

  if (!isPdf) return null;

  const hasSections = summary && summary.length > 0;

  const handleBookmark = () => {
    setIsBookmarking(true);
    triggerBookmarks.mutate({ driveFileId: file.id });
  };

  const handleExport = () => {
    setIsExporting(true);
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <div>
          <SectionHeader
            title="Peças Processuais"
            icon={BookOpen}
            isOpen={isOpen}
            onToggle={() => setIsOpen(!isOpen)}
            badge={hasSections ? `${summary.reduce((acc: number, s: any) => acc + s.count, 0)}` : undefined}
          />
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="px-4 pb-3 space-y-2">
          {isLoading ? (
            <div className="flex items-center gap-2 py-2">
              <Loader2 className="w-3 h-3 animate-spin text-zinc-400" />
              <span className="text-[11px] text-zinc-400">Carregando...</span>
            </div>
          ) : hasSections ? (
            <>
              {/* Section type badges */}
              <div className="flex flex-wrap gap-1">
                {summary.map((s: any) => {
                  const config = getSectionConfig(s.tipo);
                  const SIcon = config.icon;
                  return (
                    <Badge
                      key={s.tipo}
                      variant="outline"
                      className={cn("text-[9px] px-1.5 py-0 h-5", config.bgColor)}
                    >
                      <SIcon className="w-2.5 h-2.5 mr-0.5" />
                      {s.count} {config.label}
                    </Badge>
                  );
                })}
              </div>

              {/* Action buttons */}
              <div className="space-y-1.5">
                {/* Open viewer button */}
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full h-8 text-xs text-emerald-600 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/5 hover:border-emerald-500/50"
                  onClick={onOpenViewer}
                >
                  <BookOpen className="h-3.5 w-3.5 mr-1.5" />
                  Abrir Visualizador de Peças
                </Button>

                {/* Bookmark + Export row */}
                <div className="flex gap-1.5">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 h-7 text-[10px] text-zinc-500 dark:text-zinc-400 border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                    onClick={handleBookmark}
                    disabled={isBookmarking}
                  >
                    {isBookmarking ? (
                      <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                    ) : (
                      <Bookmark className="h-3 w-3 mr-1" />
                    )}
                    Bookmarkar PDF
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 h-7 text-[10px] text-zinc-500 dark:text-zinc-400 border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                    onClick={handleExport}
                    disabled={isExporting}
                  >
                    {isExporting ? (
                      <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                    ) : (
                      <FileDown className="h-3 w-3 mr-1" />
                    )}
                    Exportar Relatório
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <>
              <p className="text-[11px] text-zinc-400 dark:text-zinc-500">
                {file.enrichmentStatus === "processing"
                  ? "Pipeline de IA processando..."
                  : file.enrichmentStatus === "completed"
                    ? "Nenhuma peça identificada"
                    : "PDF não processado pela IA"}
              </p>
              {file.enrichmentStatus === "processing" && (
                <div className="flex items-center gap-1.5">
                  <Loader2 className="w-3 h-3 animate-spin text-amber-500" />
                  <span className="text-[10px] text-amber-500">Extraindo peças...</span>
                </div>
              )}
            </>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

// ─── Detail Panel Content ───────────────────────────────────────────

function DetailPanelContent({ file }: { file: DriveFile }) {
  const ctx = useDriveContext();
  const utils = trpc.useUtils();
  const { addJob, completeJob, failJob } = useProcessingQueue();
  const [isFavorited, setIsFavorited] = useState(() =>
    getFavorites().has(file.id)
  );
  const [isRenaming, setIsRenaming] = useState(false);
  const [showPdfViewer, setShowPdfViewer] = useState(false);
  const [showMarkdownViewer, setShowMarkdownViewer] = useState(false);

  // Query sibling files from same folder for file navigation in PDF viewer
  // Pre-fetch when detail opens so files list is ready when viewer opens
  const { data: siblingData } = trpc.drive.files.useQuery(
    {
      folderId: file.driveFolderId,
      limit: 200,
    },
    { enabled: !!file.driveFolderId }
  );

  const siblingPdfFiles = useMemo(() => {
    if (!siblingData?.files) return [];
    return siblingData.files
      .filter((f: any) => f.mimeType?.includes("pdf") && f.driveFileId)
      .map((f: any) => ({
        id: f.id as number,
        name: f.name as string,
        pdfUrl: `/api/drive/proxy?fileId=${f.driveFileId}`,
      }));
  }, [siblingData]);
  const [showCompare, setShowCompare] = useState(false);
  const [showExpandedPreview, setShowExpandedPreview] = useState(false);
  // Polling: auto-refetch when file is processing (transcription/enrichment)
  const isProcessing = file.enrichmentStatus === "processing";
  useEffect(() => {
    if (!isProcessing) return;
    const interval = setInterval(() => {
      utils.drive.files.invalidate();
    }, 5000); // Poll every 5 seconds
    return () => clearInterval(interval);
  }, [isProcessing, utils.drive.files]);

  const handleToggleFavorite = useCallback(() => {
    const newState = toggleFavorite(file.id);
    setIsFavorited(newState);
  }, [file.id]);

  const isPdf = file.mimeType?.includes("pdf");
  const isEditableDoc =
    file.mimeType?.includes("document") ||
    file.mimeType?.includes("wordprocessing") ||
    file.mimeType?.includes("msword") ||
    file.mimeType?.includes("opendocument.text") ||
    file.mimeType?.includes("rtf") ||
    file.name.endsWith(".docx") ||
    file.name.endsWith(".doc") ||
    file.name.endsWith(".odt");
  const isAudioVideo =
    file.mimeType?.startsWith("audio/") ||
    file.mimeType?.startsWith("video/");
  const isMarkdown =
    file.mimeType === "text/markdown" || file.name?.endsWith(".md");
  // Build PDF URL for viewer — use server-side proxy to avoid CORS
  const pdfUrl = `/api/drive/proxy?fileId=${file.driveFileId}`;

  // Transcription mutation — fires Inngest event (async, returns immediately)
  const transcribeJobId = `transcribe-${file.driveFileId}`;
  const transcribeMutation = trpc.drive.transcreverDrive.useMutation({
    onMutate: () => {
      addJob({ id: transcribeJobId, type: "transcription", label: file.name, status: "running", progress: -1, detail: "Enviando para processamento..." });
      showProgressToast({ id: transcribeJobId, type: "transcription", label: file.name, progress: -1, detail: "Enviando para processamento..." });
    },
    onSuccess: (data) => {
      // Mutation returns immediately — transcription runs in background via Inngest
      completeJob(transcribeJobId, data.message || "Transcrição iniciada em background");
      completeProgressToast(transcribeJobId, `${file.name} — Processando em background`);
      utils.drive.files.invalidate();
    },
    onError: (err) => {
      failJob(transcribeJobId, err.message);
      failProgressToast(transcribeJobId, err.message);
      utils.drive.files.invalidate();
    },
  });

  const handleTranscribe = useCallback(() => {
    transcribeMutation.mutate({
      driveFileId: file.driveFileId,
      processoId: file.processoId ?? undefined,
      assistidoId: file.assistidoId ?? undefined,
      diarize: true,
      language: "pt",
    });
  }, [file.driveFileId, file.processoId, file.assistidoId, transcribeMutation]);

  return (
    <div className="flex flex-col h-full">
      {/* ─── Header ─── */}
      <div className="flex items-center gap-2 h-12 px-4 border-b border-zinc-200 dark:border-zinc-800 shrink-0">
        <div className="flex-1 min-w-0">
          {isRenaming ? (
            <InlineRename
              file={file}
              onCancel={() => setIsRenaming(false)}
              onRenamed={() => setIsRenaming(false)}
            />
          ) : (
            <p
              className="text-sm font-medium text-zinc-900 dark:text-zinc-200 truncate"
              title={file.name}
            >
              {file.name}
            </p>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-zinc-400 hover:text-zinc-700 dark:text-zinc-500 dark:hover:text-zinc-300 shrink-0"
          onClick={() => ctx.closeDetailPanel()}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* ─── Scrollable Content ─── */}
      <div className="flex-1 overflow-y-auto">
        {/* Preview */}
        <div className="p-4">
          <FilePreview file={file} />
          {/* Open in viewer button for PDFs */}
          {isPdf && pdfUrl && (
            <div className="flex flex-col gap-1.5 mt-2">
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 h-8 text-xs text-emerald-600 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/5"
                  onClick={() => setShowPdfViewer(true)}
                >
                  <BookOpen className="h-3.5 w-3.5 mr-1.5" />
                  Visualizador
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 h-8 text-xs text-zinc-600 dark:text-zinc-400 border-zinc-300 dark:border-zinc-600 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                  onClick={() => setShowExpandedPreview(true)}
                >
                  <Maximize2 className="h-3.5 w-3.5 mr-1.5" />
                  Expandir
                </Button>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="w-full h-8 text-xs text-violet-600 dark:text-violet-400 border-violet-500/30 hover:bg-violet-500/5"
                onClick={() => setShowCompare(true)}
              >
                <Columns className="h-3.5 w-3.5 mr-1.5" />
                Comparar Documentos
              </Button>
            </div>
          )}
          {/* Google Docs edit button for .docx/.doc/.odt files */}
          {isEditableDoc && file.webViewLink && (
            <div className="mt-2">
              <a
                href={file.webViewLink}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full h-8 text-xs text-emerald-600 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/5"
                >
                  <FilePen className="h-3.5 w-3.5 mr-1.5" />
                  Editar no Google Docs
                </Button>
              </a>
            </div>
          )}
          {/* Markdown viewer button */}
          {isMarkdown && (
            <div className="mt-2">
              <Button
                variant="outline"
                size="sm"
                className="w-full h-8 text-xs text-emerald-600 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/5"
                onClick={() => setShowMarkdownViewer(true)}
              >
                <FileText className="h-3.5 w-3.5 mr-1.5" />
                Visualizar
              </Button>
            </div>
          )}
        </div>

        {/* Actions Row */}
        <div className="px-4 pb-3 flex items-center justify-center border-b border-zinc-200/50 dark:border-zinc-800/50">
          <ActionRow
            file={file}
            isFavorited={isFavorited}
            onToggleFavorite={handleToggleFavorite}
            onStartRename={() => setIsRenaming(true)}
            onTranscribe={isAudioVideo ? handleTranscribe : undefined}
            isTranscribing={transcribeMutation.isPending}
          />
        </div>

        {/* Collapsible Sections */}
        <div className="divide-y divide-zinc-200/50 dark:divide-zinc-800/50">
          {isPdf && (
            <PecasProcessuaisSection
              file={file}
              onOpenViewer={() => setShowPdfViewer(true)}
            />
          )}
          <MetadataSection file={file} />
          {isAudioVideo && (
            <TranscriptionSection
              file={file}
              onTranscribe={handleTranscribe}
              isTranscribing={transcribeMutation.isPending}
            />
          )}
          <EnrichmentSection file={file} />
          <SuggestedActionsSection file={file} />
          <LinkSuggestionsSection file={file} />
          <JuridicalContextSection file={file} />
          <IAInsightsSection file={file} />
          <LinkActionsSection file={file} />
        </div>
      </div>

      {/* Expanded Preview Modal */}
      {isPdf && file.webViewLink && (
        <ExpandedPreviewModal
          isOpen={showExpandedPreview}
          onClose={() => setShowExpandedPreview(false)}
          fileName={file.name}
          webViewLink={file.webViewLink}
          driveFileId={file.driveFileId}
          mimeType={file.mimeType}
          fileSize={file.size ? `${(file.size / 1024).toFixed(0)} KB` : null}
          enrichmentStatus={file.enrichmentStatus}
        />
      )}

      {/* Document Compare Modal */}
      {isPdf && (
        <DocumentCompareModal
          isOpen={showCompare}
          onClose={() => setShowCompare(false)}
          initialFileA={{
            id: file.id,
            name: file.name,
            webViewLink: file.webViewLink || "",
            driveFolderId: file.driveFolderId,
            driveFileId: file.driveFileId,
          }}
          currentFolderId={file.driveFolderId}
          assistidoId={file.assistidoId || undefined}
        />
      )}

      {/* PDF Viewer Modal */}
      {isPdf && pdfUrl && (
        <PdfViewerModal
          isOpen={showPdfViewer}
          onClose={() => setShowPdfViewer(false)}
          fileId={file.id}
          fileName={file.name}
          pdfUrl={pdfUrl}
          siblingFiles={siblingPdfFiles}
          onFileChange={(newFileId) => {
            ctx.openDetailPanel(newFileId);
          }}
        />
      )}

      {/* Markdown Viewer Modal */}
      {isMarkdown && (
        <MarkdownViewerModal
          isOpen={showMarkdownViewer}
          onClose={() => setShowMarkdownViewer(false)}
          fileName={file.name}
          fileId={file.driveFileId}
          enrichmentData={file.enrichmentData as any}
          webViewLink={file.webViewLink || undefined}
          assistidoId={file.assistidoId ?? undefined}
          fileDbId={file.id}
        />
      )}
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────

export function DriveDetailPanel() {
  const ctx = useDriveContext();

  // Determine active folder for the file query (mirror DriveContentArea logic)
  const activeFolderId = ctx.selectedFolderId || null;
  const rootFolderId = ctx.rootSyncFolderId || activeFolderId;
  const isInSubfolder =
    ctx.breadcrumbPath.length > 1 &&
    activeFolderId !== rootFolderId;

  // Fetch files to find the selected file
  // (tRPC deduplicates identical queries, so this shares cache with DriveContentArea)
  const { data } = trpc.drive.files.useQuery(
    {
      folderId: rootFolderId!,
      ...(isInSubfolder
        ? { parentDriveFileId: activeFolderId! }
        : { parentFileId: null }),
    },
    { enabled: !!rootFolderId && ctx.detailPanelFileId !== null }
  );

  // Find the file by detailPanelFileId
  const file = useMemo(() => {
    if (!data?.files || ctx.detailPanelFileId === null) return null;
    return data.files.find((f: any) => f.id === ctx.detailPanelFileId) || null;
  }, [data?.files, ctx.detailPanelFileId]);

  const isOpen = ctx.detailPanelFileId !== null;

  // Desktop: inline panel. Mobile: Sheet overlay.
  // We render both and use CSS to show/hide based on breakpoint.
  if (!isOpen) return null;

  // Loading state when file not yet found
  if (!file) {
    return (
      <Sheet open={isOpen} onOpenChange={(open) => { if (!open) ctx.closeDetailPanel(); }}>
        <SheetContent
          side="right"
          className="w-full sm:w-[480px] md:w-[560px] bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 p-0"
        >
          <SheetTitle className="sr-only">Detalhes do arquivo</SheetTitle>
          <div className="p-4 space-y-3">
            <Skeleton className="aspect-video w-full bg-zinc-200 dark:bg-zinc-800 rounded-lg" />
            <Skeleton className="h-8 w-full bg-zinc-200 dark:bg-zinc-800" />
            <Skeleton className="h-20 w-full bg-zinc-200 dark:bg-zinc-800" />
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Sheet open={isOpen} onOpenChange={(open) => { if (!open) ctx.closeDetailPanel(); }}>
      <SheetContent
        side="right"
        className="w-full sm:w-[480px] md:w-[560px] bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 p-0"
      >
        <SheetTitle className="sr-only">{file.name}</SheetTitle>
        <DetailPanelContent file={file as any} />
      </SheetContent>
    </Sheet>
  );
}
