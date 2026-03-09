"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  FolderOpen,
  Mic,
  FileText,
  FileImage,
  FileVideo,
  FileAudio,
  File,
  ExternalLink,
  Clock,
  ChevronDown,
  ChevronRight,
  HardDrive,
  Volume2,
  AlertCircle,
  Loader2,
  Copy,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AudioRecorderButton } from "@/components/shared/audio-recorder";
import { VoiceMemosButton } from "@/components/shared/voice-memos-button";

// ==========================================
// TYPES
// ==========================================

interface TabMidiaProps {
  assistidoId?: number;
  processoId?: number;
  assistidoNome?: string;
}

// ==========================================
// HELPERS
// ==========================================

function getMimeIcon(mimeType: string) {
  if (mimeType?.includes("pdf")) return FileText;
  if (mimeType?.includes("image")) return FileImage;
  if (mimeType?.includes("video")) return FileVideo;
  if (mimeType?.includes("audio")) return FileAudio;
  return File;
}

function formatFileSize(bytes?: number | null) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDuration(seconds?: number | null) {
  if (!seconds) return "";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function formatDate(dateStr?: string | null) {
  if (!dateStr) return "";
  try {
    return new Date(dateStr).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

const statusLabels: Record<string, { label: string; color: string }> = {
  completed: { label: "Transcrito", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" },
  transcribing: { label: "Transcrevendo", color: "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400" },
  pending_review: { label: "Pendente", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
  received: { label: "Recebido", color: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400" },
  failed: { label: "Erro", color: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400" },
};

// ==========================================
// SECTION HEADER
// ==========================================

function SectionHeader({
  icon: Icon,
  title,
  count,
  isOpen,
  onToggle,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  count: number;
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      className="w-full flex items-center gap-2 py-2 px-3 rounded-lg bg-zinc-50 dark:bg-zinc-900/50 hover:bg-zinc-100 dark:hover:bg-zinc-800/50 transition-colors cursor-pointer"
    >
      {isOpen ? (
        <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
      ) : (
        <ChevronRight className="w-3.5 h-3.5 text-zinc-400" />
      )}
      <Icon className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />
      <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 flex-1 text-left">
        {title}
      </span>
      <Badge className="bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300 text-[10px] px-1.5 py-0">
        {count}
      </Badge>
    </button>
  );
}

// ==========================================
// DRIVE FILE CARD
// ==========================================

function DriveFileCard({ file }: { file: any }) {
  const IconComp = getMimeIcon(file.mimeType || "");
  const enrichment = file.enrichmentData as Record<string, any> | null;
  const hasEnrichment = file.enrichmentStatus === "completed" && enrichment;

  return (
    <div className="flex items-start gap-3 p-2.5 rounded-lg border border-zinc-200/80 dark:border-zinc-800/80 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors group">
      <div className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center flex-shrink-0">
        <IconComp className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-xs font-medium text-zinc-800 dark:text-zinc-200 truncate flex-1">
            {file.name}
          </p>
          {file.driveFileId && (
            <a
              href={`https://drive.google.com/file/d/${file.driveFileId}/view`}
              target="_blank"
              rel="noopener noreferrer"
              className="opacity-0 group-hover:opacity-100 transition-opacity"
              title="Abrir no Drive"
            >
              <ExternalLink className="w-3 h-3 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300" />
            </a>
          )}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          {file.mimeType && (
            <span className="text-[10px] text-zinc-400 dark:text-zinc-500">
              {file.mimeType.split("/").pop()?.toUpperCase()}
            </span>
          )}
          {file.fileSize && (
            <span className="text-[10px] text-zinc-400 dark:text-zinc-500">
              {formatFileSize(file.fileSize)}
            </span>
          )}
          {file.createdAt && (
            <span className="text-[10px] text-zinc-400 dark:text-zinc-500">
              {formatDate(file.createdAt)}
            </span>
          )}
        </div>
        {hasEnrichment && enrichment?.summary && (
          <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-1 line-clamp-2">
            {enrichment.summary}
          </p>
        )}
      </div>
    </div>
  );
}

// ==========================================
// RECORDING CARD
// ==========================================

function RecordingCard({ recording }: { recording: any }) {
  const [showTranscript, setShowTranscript] = useState(false);
  const status = statusLabels[recording.status] || statusLabels.received;

  return (
    <div className="rounded-lg border border-zinc-200/80 dark:border-zinc-800/80 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors overflow-hidden">
      <div className="flex items-start gap-3 p-2.5">
        <div className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center flex-shrink-0">
          <Volume2 className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-xs font-medium text-zinc-800 dark:text-zinc-200 truncate flex-1">
              {recording.title || "Gravacao sem titulo"}
            </p>
            <Badge className={cn("text-[10px] px-1.5 py-0", status.color)}>
              {status.label}
            </Badge>
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            {recording.duration && (
              <span className="flex items-center gap-0.5 text-[10px] text-zinc-400 dark:text-zinc-500">
                <Clock className="w-2.5 h-2.5" />
                {formatDuration(recording.duration)}
              </span>
            )}
            {recording.recordedAt && (
              <span className="text-[10px] text-zinc-400 dark:text-zinc-500">
                {formatDate(recording.recordedAt)}
              </span>
            )}
            {recording.fileSize && (
              <span className="text-[10px] text-zinc-400 dark:text-zinc-500">
                {formatFileSize(recording.fileSize)}
              </span>
            )}
          </div>
          {recording.summary && (
            <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-1 line-clamp-2">
              {recording.summary}
            </p>
          )}
          {recording.transcription && (
            <button
              onClick={() => setShowTranscript(!showTranscript)}
              className="text-[10px] text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 mt-1 flex items-center gap-1 cursor-pointer"
            >
              {showTranscript ? (
                <ChevronDown className="w-2.5 h-2.5" />
              ) : (
                <ChevronRight className="w-2.5 h-2.5" />
              )}
              Transcricao
            </button>
          )}
        </div>
      </div>
      {showTranscript && recording.transcription && (
        <div className="px-3 pb-2.5 pt-0">
          <div className="bg-zinc-50 dark:bg-zinc-900/50 rounded-md p-2 text-[10px] text-zinc-600 dark:text-zinc-400 max-h-40 overflow-y-auto font-mono leading-relaxed whitespace-pre-wrap">
            {recording.transcription}
          </div>
        </div>
      )}
    </div>
  );
}

// ==========================================
// EMPTY STATE
// ==========================================

function EmptyState({ icon: Icon, message }: { icon: React.ComponentType<{ className?: string }>; message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-6 text-center">
      <Icon className="w-8 h-8 text-zinc-300 dark:text-zinc-600 mb-2" />
      <p className="text-xs text-zinc-400 dark:text-zinc-500">{message}</p>
    </div>
  );
}

// ==========================================
// MAIN COMPONENT
// ==========================================

export function TabMidia({ assistidoId, processoId, assistidoNome }: TabMidiaProps) {
  const [driveOpen, setDriveOpen] = useState(true);
  const [recordingsOpen, setRecordingsOpen] = useState(true);
  const [transcriptionResult, setTranscriptionResult] = useState<string | null>(null);

  // Fetch drive files
  const { data: filesByAssistido, isLoading: loadingAssistidoFiles } = trpc.drive.filesByAssistido.useQuery(
    { assistidoId: assistidoId! },
    { enabled: !!assistidoId }
  );
  const { data: filesByProcesso, isLoading: loadingProcessoFiles } = trpc.drive.filesByProcesso.useQuery(
    { processoId: processoId! },
    { enabled: !!processoId }
  );

  // Fetch plaud recordings
  const { data: recordings, isLoading: loadingRecordings } = trpc.atendimentos.recordingsByAssistido.useQuery(
    { assistidoId: assistidoId! },
    { enabled: !!assistidoId }
  );

  // Merge & deduplicate drive files (files may appear in both assistido and processo queries)
  const driveFiles = (() => {
    const filesMap = new Map<number, any>();
    if (filesByAssistido) {
      for (const f of filesByAssistido as any[]) {
        filesMap.set(f.id, f);
      }
    }
    if (filesByProcesso) {
      for (const f of filesByProcesso as any[]) {
        filesMap.set(f.id, f);
      }
    }
    return Array.from(filesMap.values()).sort((a, b) => {
      const da = new Date(b.createdAt || 0).getTime();
      const db = new Date(a.createdAt || 0).getTime();
      return da - db;
    });
  })();

  const recordingsList = (recordings as any[] | undefined) || [];

  const isLoading = loadingAssistidoFiles || loadingProcessoFiles || loadingRecordings;

  const handleTranscriptReady = (transcript: string) => {
    setTranscriptionResult(transcript);
  };

  // No assistido or processo linked
  if (!assistidoId && !processoId) {
    return (
      <div className="max-w-3xl mx-auto">
        <EmptyState
          icon={AlertCircle}
          message="Vincule um assistido ou processo a este evento para visualizar documentos e gravacoes."
        />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-3">
      {/* Header info */}
      {assistidoNome && (
        <p className="text-[10px] uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
          Documentos e gravacoes de {assistidoNome}
        </p>
      )}

      {/* ====================================== */}
      {/* Audio Recording / Transcription Section */}
      {/* ====================================== */}
      <div>
        <div className="w-full flex items-center gap-2 py-2 px-3 rounded-lg bg-zinc-50 dark:bg-zinc-900/50">
          <Mic className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />
          <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 flex-1 text-left">
            Gravar / Transcrever
          </span>
        </div>

        <div className="mt-2 space-y-3">
          {/* Action buttons */}
          <div className="flex items-center gap-2">
            <AudioRecorderButton
              onTranscriptReady={handleTranscriptReady}
              className="flex-1"
            />
            <VoiceMemosButton
              onTranscriptReady={handleTranscriptReady}
              assistidoId={assistidoId}
              processoId={processoId}
              className="flex-1"
            />
          </div>

          {/* Transcription preview */}
          {transcriptionResult && (
            <div className="rounded-lg border border-zinc-200/80 dark:border-zinc-800/80 overflow-hidden">
              <div className="flex items-center justify-between px-3 py-1.5 border-b border-zinc-200/80 dark:border-zinc-800/80">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  Transcricao
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-[10px] text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200 cursor-pointer"
                  onClick={() => {
                    navigator.clipboard.writeText(transcriptionResult);
                    toast.success("Texto copiado!");
                  }}
                >
                  <Copy className="w-3 h-3 mr-1" />
                  Copiar
                </Button>
              </div>
              <div className="bg-zinc-50 dark:bg-zinc-900/50 p-3 text-xs text-zinc-600 dark:text-zinc-400 max-h-48 overflow-y-auto leading-relaxed whitespace-pre-wrap">
                {transcriptionResult}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-5 h-5 text-zinc-400 animate-spin" />
        </div>
      )}

      {!isLoading && (
        <>
          {/* Drive Files Section */}
          <div>
            <SectionHeader
              icon={HardDrive}
              title="Google Drive"
              count={driveFiles.length}
              isOpen={driveOpen}
              onToggle={() => setDriveOpen(!driveOpen)}
            />
            {driveOpen && (
              <div className="mt-2 space-y-1.5">
                {driveFiles.length === 0 ? (
                  <EmptyState
                    icon={FolderOpen}
                    message="Nenhum documento vinculado no Drive."
                  />
                ) : (
                  driveFiles.map((file) => (
                    <DriveFileCard key={file.id} file={file} />
                  ))
                )}
              </div>
            )}
          </div>

          {/* Recordings Section */}
          <div>
            <SectionHeader
              icon={Mic}
              title="Gravacoes"
              count={recordingsList.length}
              isOpen={recordingsOpen}
              onToggle={() => setRecordingsOpen(!recordingsOpen)}
            />
            {recordingsOpen && (
              <div className="mt-2 space-y-1.5">
                {recordingsList.length === 0 ? (
                  <EmptyState
                    icon={Volume2}
                    message="Nenhuma gravacao encontrada para este assistido."
                  />
                ) : (
                  recordingsList.map((rec: any) => (
                    <RecordingCard key={rec.id} recording={rec} />
                  ))
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
