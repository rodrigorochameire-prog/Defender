"use client";

import { useState, useRef } from "react";
import { trpc } from "@/lib/trpc/client";
import {
  Music,
  Video,
  Loader2,
  Mic,
  Brain,
  FileText,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Play,
  Pause,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export interface MidiasTranscriptData {
  transcript: string;
  summary?: string;
  speakers?: unknown[];
}

interface MidiasHubProps {
  assistidoId: number;
  processingFiles?: Set<string>;
  onTranscribe?: (driveFileId: string) => void;
  onViewTranscript?: (driveFileId: string, data: MidiasTranscriptData) => void;
  onViewPlaud?: (file: { id: number; name: string; driveFileId: string | null; webViewLink: string | null }) => void;
}

export function MidiasHub({ assistidoId, processingFiles, onTranscribe, onViewTranscript, onViewPlaud }: MidiasHubProps) {
  const { data, isLoading } = trpc.drive.midiasByAssistido.useQuery(
    { assistidoId },
    { staleTime: 60_000 }
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin mr-2" />
        <span className="text-sm">Carregando midias...</span>
      </div>
    );
  }

  if (!data || (data.processos.length === 0 && data.ungrouped.length === 0)) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Music className="h-8 w-8 mx-auto mb-2 opacity-30" />
        <p className="text-sm">Nenhuma midia encontrada</p>
        <p className="text-xs mt-1">Audios e videos do Drive aparecerao aqui</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats bar */}
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <Music className="h-3 w-3" />
          {data.stats.total} arquivo{data.stats.total !== 1 ? "s" : ""}
        </span>
        <span className="flex items-center gap-1">
          <CheckCircle2 className="h-3 w-3 text-emerald-500" />
          {data.stats.transcribed} transcrito{data.stats.transcribed !== 1 ? "s" : ""}
        </span>
        <span className="flex items-center gap-1">
          <Brain className="h-3 w-3 text-violet-500" />
          {data.stats.analyzed} analisado{data.stats.analyzed !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Grouped by processo */}
      {data.processos.map((grupo) => (
        <ProcessoGroup
          key={grupo.processoId}
          processoId={grupo.processoId}
          numeroAutos={grupo.numeroAutos}
          files={grupo.files}
          processingFiles={processingFiles}
          onTranscribe={onTranscribe}
          onViewTranscript={onViewTranscript}
          onViewPlaud={onViewPlaud}
        />
      ))}

      {/* Ungrouped files */}
      {data.ungrouped.length > 0 && (
        <ProcessoGroup
          processoId={0}
          numeroAutos="Sem processo vinculado"
          files={data.ungrouped}
          processingFiles={processingFiles}
          onTranscribe={onTranscribe}
          onViewTranscript={onViewTranscript}
          onViewPlaud={onViewPlaud}
        />
      )}
    </div>
  );
}

// ==========================================
// PROCESSO GROUP
// ==========================================

interface MediaFileData {
  id: number;
  driveFileId: string | null;
  name: string;
  mimeType: string | null;
  documentType: string | null;
  webViewLink: string | null;
  webContentLink: string | null;
  enrichmentStatus: string | null;
  hasTranscript: boolean;
  hasAnalysis: boolean;
  transcript_plain?: string;
  summary?: string;
  speakers?: unknown[];
  analysisHighlights?: {
    pontosFavoraveis?: number;
    pontosDesfavoraveis?: number;
    contradicoes?: number;
  };
}

function ProcessoGroup({
  processoId,
  numeroAutos,
  files,
  processingFiles,
  onTranscribe,
  onViewTranscript,
  onViewPlaud,
}: {
  processoId: number;
  numeroAutos: string;
  files: MediaFileData[];
  processingFiles?: Set<string>;
  onTranscribe?: (driveFileId: string) => void;
  onViewTranscript?: (driveFileId: string, data: MidiasTranscriptData) => void;
  onViewPlaud?: (file: { id: number; name: string; driveFileId: string | null; webViewLink: string | null }) => void;
}) {
  const [expanded, setExpanded] = useState(true);

  return (
    <div className="border border-zinc-200 dark:border-border rounded-lg overflow-hidden">
      {/* Group header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-3 py-2 bg-zinc-50 dark:bg-muted/50 hover:bg-zinc-100 dark:hover:bg-muted transition-colors text-left"
      >
        {expanded ? (
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        )}
        <span className="text-xs font-medium text-foreground/80 truncate flex-1">
          {processoId > 0 ? `Processo ${numeroAutos}` : numeroAutos}
        </span>
        <span className="text-[10px] text-muted-foreground shrink-0">
          {files.length} midia{files.length !== 1 ? "s" : ""}
        </span>
      </button>

      {/* Files */}
      {expanded && (
        <div className="divide-y divide-zinc-100 dark:divide-border">
          {files.map((file) => (
            <MediaCard
              key={file.id}
              file={file}
              isExternallyProcessing={processingFiles?.has(file.driveFileId ?? String(file.id))}
              onTranscribe={onTranscribe}
              onViewTranscript={onViewTranscript}
              onViewPlaud={onViewPlaud}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ==========================================
// MEDIA CARD
// ==========================================

function MediaCard({
  file,
  isExternallyProcessing,
  onTranscribe,
  onViewTranscript,
  onViewPlaud,
}: {
  file: MediaFileData;
  isExternallyProcessing?: boolean;
  onTranscribe?: (driveFileId: string) => void;
  onViewTranscript?: (driveFileId: string, data: MidiasTranscriptData) => void;
  onViewPlaud?: (file: { id: number; name: string; driveFileId: string | null; webViewLink: string | null }) => void;
}) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [showTranscript, setShowTranscript] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const isAudio = file.mimeType?.startsWith("audio/");
  const isPlaud = file.documentType === "transcricao_plaud";
  const isProcessing = file.enrichmentStatus === "processing" || isExternallyProcessing;
  const isFailed = file.enrichmentStatus === "failed";
  const fileKey = file.driveFileId ?? String(file.id);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(() => {
        toast.error("Nao foi possivel reproduzir. Abra no Drive.");
      });
    }
    setIsPlaying(!isPlaying);
  };

  const highlights = file.analysisHighlights;

  // Plaud transcription card — simplified layout
  if (isPlaud) {
    return (
      <div className="px-3 py-2.5">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-full flex items-center justify-center shrink-0 bg-violet-50 dark:bg-violet-950">
            <FileText className="h-3.5 w-3.5 text-violet-500" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[12px] font-medium text-foreground/80 truncate">
              {file.name}
            </p>
            <div className="flex items-center gap-1 mt-0.5">
              <Badge variant="outline" className="text-[9px] h-4 text-violet-600 border-violet-200">plaud</Badge>
              {file.hasTranscript && (
                <Badge variant="outline" className="text-[9px] h-4 text-emerald-600 border-emerald-200">transcrito</Badge>
              )}
              {file.summary && (
                <span className="text-[10px] text-muted-foreground truncate ml-1">
                  {file.summary.slice(0, 60)}...
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {onViewPlaud && (
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-[10px] px-2"
                onClick={() => onViewPlaud({ id: file.id, name: file.name, driveFileId: file.driveFileId, webViewLink: file.webViewLink })}
              >
                <FileText className="h-3 w-3 mr-1" />
                Ver transcricao
              </Button>
            )}
            {file.webViewLink && (
              <a href={file.webViewLink} target="_blank" rel="noopener noreferrer">
                <Button size="sm" variant="ghost" className="h-7 w-7 p-0">
                  <ExternalLink className="h-3 w-3" />
                </Button>
              </a>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="px-3 py-2.5 space-y-2">
      {/* Top row: icon + name + badges + actions */}
      <div className="flex items-center gap-2.5">
        {/* Play button / icon */}
        {isAudio && file.webContentLink ? (
          <button
            onClick={togglePlay}
            className={cn(
              "h-8 w-8 rounded-full flex items-center justify-center shrink-0 transition-colors",
              isPlaying
                ? "bg-cyan-500 text-white"
                : "bg-cyan-50 dark:bg-cyan-950 text-cyan-600 hover:bg-cyan-100 dark:hover:bg-cyan-900"
            )}
          >
            {isPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5 ml-0.5" />}
          </button>
        ) : (
          <div className="h-8 w-8 rounded-full flex items-center justify-center shrink-0 bg-violet-50 dark:bg-violet-950">
            <Video className="h-3.5 w-3.5 text-violet-500" />
          </div>
        )}

        {/* File info */}
        <div className="flex-1 min-w-0">
          <p className="text-[12px] font-medium text-foreground/80 truncate">
            {file.name}
          </p>
          <div className="flex items-center gap-1 mt-0.5 flex-wrap">
            {isFailed && (
              <Badge variant="outline" className="text-[9px] h-4 text-red-600 border-red-200">falhou</Badge>
            )}
            {file.hasTranscript && !isProcessing && (
              <Badge variant="outline" className="text-[9px] h-4 text-emerald-600 border-emerald-200">transcrito</Badge>
            )}
            {file.hasAnalysis && (
              <Badge variant="outline" className="text-[9px] h-4 text-violet-600 border-violet-200">
                <Brain className="h-2 w-2 mr-0.5" />analisado
              </Badge>
            )}
            {isProcessing && (
              <Badge variant="outline" className="text-[9px] h-4 text-cyan-600 border-cyan-200">
                <Loader2 className="h-2 w-2 mr-0.5 animate-spin" />processando
              </Badge>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1.5 shrink-0">
          {file.hasTranscript && !isProcessing && (
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-[10px] px-2"
              onClick={() => {
                if (onViewTranscript && file.transcript_plain) {
                  onViewTranscript(fileKey, {
                    transcript: file.transcript_plain,
                    summary: file.summary,
                    speakers: file.speakers,
                  });
                } else {
                  setShowTranscript(!showTranscript);
                }
              }}
            >
              <FileText className="h-3 w-3 mr-1" />
              {showTranscript ? "Ocultar" : "Transcricao"}
            </Button>
          )}
          {onTranscribe && !isPlaud && (
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-[10px] px-2"
              onClick={() => onTranscribe(fileKey)}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
              ) : (
                <Mic className="h-3 w-3 mr-1" />
              )}
              {isProcessing ? "Transcrevendo..." : file.hasTranscript ? "Retranscrever" : "Transcrever"}
            </Button>
          )}
          {file.webViewLink && (
            <a href={file.webViewLink} target="_blank" rel="noopener noreferrer">
              <Button size="sm" variant="ghost" className="h-7 w-7 p-0">
                <ExternalLink className="h-3 w-3" />
              </Button>
            </a>
          )}
        </div>
      </div>

      {/* Hidden audio element */}
      {isAudio && file.webContentLink && (
        <audio
          ref={audioRef}
          src={file.webContentLink}
          onEnded={() => setIsPlaying(false)}
          onError={() => {
            setIsPlaying(false);
            toast.error("Erro ao carregar audio");
          }}
          preload="none"
        />
      )}

      {/* Analysis highlights */}
      {highlights && (highlights.pontosFavoraveis || highlights.pontosDesfavoraveis || highlights.contradicoes) && (
        <div className="flex items-center gap-2 text-[10px] pl-10">
          {highlights.pontosFavoraveis ? (
            <span className="flex items-center gap-0.5 text-emerald-600">
              <CheckCircle2 className="h-2.5 w-2.5" />
              {highlights.pontosFavoraveis} ponto{highlights.pontosFavoraveis !== 1 ? "s" : ""} favorav{highlights.pontosFavoraveis !== 1 ? "eis" : "el"}
            </span>
          ) : null}
          {highlights.contradicoes ? (
            <span className="flex items-center gap-0.5 text-amber-600">
              <AlertTriangle className="h-2.5 w-2.5" />
              {highlights.contradicoes} contradicao{highlights.contradicoes !== 1 ? "es" : ""}
            </span>
          ) : null}
        </div>
      )}

      {/* Inline transcript preview */}
      {showTranscript && file.transcript_plain && (
        <div className="pl-10 space-y-1.5">
          <p className="text-[11px] text-muted-foreground line-clamp-4 leading-relaxed">
            {file.transcript_plain.slice(0, 500)}
            {file.transcript_plain.length > 500 && "..."}
          </p>
          {file.summary && (
            <div className="bg-violet-50 dark:bg-violet-950/30 rounded px-2.5 py-1.5">
              <p className="text-[10px] font-medium text-violet-700 dark:text-violet-400 mb-0.5">
                Resumo IA
              </p>
              <p className="text-[11px] text-violet-600 dark:text-violet-300 leading-relaxed">
                {file.summary}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
