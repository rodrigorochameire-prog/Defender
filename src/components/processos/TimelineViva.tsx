"use client";

import { useState, useRef } from "react";
import { trpc } from "@/lib/trpc/client";
import {
  FileText,
  Loader2,
  ExternalLink,
  Play,
  Pause,
  ChevronDown,
  ChevronRight,
  Gavel,
  Users,
  Shield,
  BookMarked,
  ShieldCheck,
  Microscope,
  CalendarDays,
  Music,
  Video,
  HelpCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import type { LucideIcon } from "lucide-react";

// ============================================================
// Config
// ============================================================

const TIPO_CONFIG: Record<string, { icon: LucideIcon; color: string; bg: string; label: string }> = {
  denuncia: { icon: BookMarked, color: "text-red-500", bg: "bg-red-500", label: "Denuncia" },
  sentenca: { icon: Gavel, color: "text-amber-500", bg: "bg-amber-500", label: "Sentenca" },
  decisao: { icon: Gavel, color: "text-orange-500", bg: "bg-orange-500", label: "Decisao" },
  despacho: { icon: FileText, color: "text-blue-400", bg: "bg-blue-400", label: "Despacho" },
  depoimento: { icon: Users, color: "text-blue-500", bg: "bg-blue-500", label: "Depoimento" },
  laudo: { icon: Microscope, color: "text-purple-500", bg: "bg-purple-500", label: "Laudo" },
  pericia: { icon: Microscope, color: "text-purple-400", bg: "bg-purple-400", label: "Pericia" },
  defesa: { icon: ShieldCheck, color: "text-emerald-500", bg: "bg-emerald-500", label: "Defesa" },
  investigacao: { icon: Shield, color: "text-orange-400", bg: "bg-orange-400", label: "Investigacao" },
  audiencia: { icon: CalendarDays, color: "text-indigo-500", bg: "bg-indigo-500", label: "Audiencia" },
  midia: { icon: Music, color: "text-cyan-500", bg: "bg-cyan-500", label: "Midia" },
  documento: { icon: FileText, color: "text-neutral-600 dark:text-neutral-400", bg: "bg-neutral-400", label: "Documento" },
};

const DEFAULT_CONFIG = { icon: HelpCircle, color: "text-neutral-600 dark:text-neutral-400", bg: "bg-neutral-400", label: "Outro" };

function getConfig(tipo: string) {
  return TIPO_CONFIG[tipo.toLowerCase()] || DEFAULT_CONFIG;
}

function formatTimelineDate(isoDate: string | null): string {
  if (!isoDate) return "Sem data";
  try {
    const d = new Date(isoDate);
    return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return "Sem data";
  }
}

// ============================================================
// Main: TimelineViva for a single processo
// ============================================================

interface TimelineVivaProps {
  processoId: number;
  compact?: boolean;
}

export function TimelineViva({ processoId, compact = false }: TimelineVivaProps) {
  const { data, isLoading } = trpc.drive.timelineByProcesso.useQuery(
    { processoId },
    { staleTime: 60_000 }
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin mr-2" />
        <span className="text-sm">Carregando timeline...</span>
      </div>
    );
  }

  if (!data || data.events.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <FileText className="h-8 w-8 mx-auto mb-2 opacity-30" />
        <p className="text-sm">Nenhum evento na timeline</p>
        <p className="text-xs mt-1">Documentos classificados pelo enrichment aparecerao aqui</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Stats */}
      {!compact && (
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span>{data.stats.total} documento{data.stats.total !== 1 ? "s" : ""}</span>
          <span>{data.stats.enriched} enriquecido{data.stats.enriched !== 1 ? "s" : ""}</span>
          {data.stats.media > 0 && (
            <span>{data.stats.media} midia{data.stats.media !== 1 ? "s" : ""}</span>
          )}
        </div>
      )}

      {/* Timeline */}
      <div className="relative">
        <div className="absolute left-[5px] top-0 bottom-0 w-[2px] bg-muted" />
        <div className="space-y-2">
          {data.events.map((event) => (
            <TimelineEventCard key={event.id} event={event} compact={compact} />
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Consolidated: TimelineViva for an assistido (all processos)
// ============================================================

interface TimelineVivaAssistidoProps {
  assistidoId: number;
}

export function TimelineVivaAssistido({ assistidoId }: TimelineVivaAssistidoProps) {
  const { data, isLoading } = trpc.drive.timelineByAssistido.useQuery(
    { assistidoId },
    { staleTime: 60_000 }
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin mr-2" />
        <span className="text-sm">Carregando timeline...</span>
      </div>
    );
  }

  if (!data || data.processos.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <FileText className="h-8 w-8 mx-auto mb-2 opacity-30" />
        <p className="text-sm">Nenhum evento na timeline</p>
        <p className="text-xs mt-1">Documentos classificados pelo enrichment aparecerao aqui</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span>{data.stats.totalEvents} evento{data.stats.totalEvents !== 1 ? "s" : ""}</span>
        <span>em {data.stats.totalProcessos} processo{data.stats.totalProcessos !== 1 ? "s" : ""}</span>
      </div>

      {/* Groups by processo */}
      {data.processos.map((grupo) => (
        <ProcessoTimelineGroup
          key={grupo.processoId}
          processoId={grupo.processoId}
          numeroAutos={grupo.numeroAutos}
          events={grupo.events}
        />
      ))}
    </div>
  );
}

// ============================================================
// Processo group (collapsible)
// ============================================================

interface TimelineEvent {
  id: string;
  tipo: string;
  titulo: string;
  data: string | null;
  resumo: string | null;
  fileId: number;
  fileName: string;
  webViewLink: string | null;
  webContentLink: string | null;
  mimeType: string | null;
  isMedia: boolean;
  enrichmentStatus: string | null;
}

function ProcessoTimelineGroup({
  processoId,
  numeroAutos,
  events,
}: {
  processoId: number;
  numeroAutos: string;
  events: TimelineEvent[];
}) {
  const [expanded, setExpanded] = useState(true);

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-3 py-2 bg-muted/50 hover:bg-muted transition-colors text-left"
      >
        {expanded ? (
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        )}
        <span className="text-xs font-medium text-foreground/80 truncate flex-1">
          Processo {numeroAutos}
        </span>
        <span className="text-[10px] text-muted-foreground shrink-0">
          {events.length} evento{events.length !== 1 ? "s" : ""}
        </span>
      </button>

      {expanded && (
        <div className="p-3">
          <div className="relative">
            <div className="absolute left-[5px] top-0 bottom-0 w-[2px] bg-muted" />
            <div className="space-y-2">
              {events.map((event) => (
                <TimelineEventCard key={event.id} event={event} compact={false} />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// Timeline Event Card
// ============================================================

function TimelineEventCard({
  event,
  compact = false,
}: {
  event: TimelineEvent;
  compact?: boolean;
}) {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const config = getConfig(event.tipo);
  const Icon = config.icon;
  const isAudio = event.mimeType?.startsWith("audio/");

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(() => {
        toast.error("Nao foi possivel reproduzir.");
      });
    }
    setIsPlaying(!isPlaying);
  };

  return (
    <div className="relative flex items-start gap-3 pl-0">
      {/* Dot on timeline */}
      <div
        className={cn(
          "relative z-10 mt-2 w-3 h-3 rounded-full shrink-0 ring-2 ring-background",
          config.bg,
        )}
      />

      {/* Card */}
      <div className="flex-1 min-w-0 rounded-lg border border-border bg-card p-2.5 hover:bg-muted/50 transition-colors">
        <div className="flex items-start gap-2">
          {/* Media play button or icon */}
          {event.isMedia && isAudio && event.webContentLink ? (
            <button
              onClick={togglePlay}
              className={cn(
                "h-7 w-7 rounded-full flex items-center justify-center shrink-0 transition-colors mt-0.5",
                isPlaying
                  ? "bg-cyan-500 text-white"
                  : "bg-cyan-50 dark:bg-cyan-950 text-cyan-600 hover:bg-cyan-100"
              )}
            >
              {isPlaying ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3 ml-0.5" />}
            </button>
          ) : event.isMedia ? (
            <div className="h-7 w-7 rounded-full flex items-center justify-center shrink-0 bg-violet-50 dark:bg-violet-950 mt-0.5">
              <Video className="h-3 w-3 text-violet-500" />
            </div>
          ) : (
            <Icon className={cn("h-4 w-4 mt-0.5 shrink-0", config.color)} />
          )}

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[12px] font-medium text-foreground/80 truncate">
                {event.titulo}
              </span>
              <Badge variant="outline" className={cn("text-[9px] h-4", config.color)}>
                {config.label}
              </Badge>
            </div>

            {!compact && event.resumo && (
              <p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5 leading-relaxed">
                {event.resumo}
              </p>
            )}

            <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-1">
              <span>{formatTimelineDate(event.data)}</span>
              {event.webViewLink && (
                <a
                  href={event.webViewLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-0.5 hover:text-foreground transition-colors"
                >
                  <ExternalLink className="h-2.5 w-2.5" />
                  Drive
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Hidden audio */}
        {event.isMedia && isAudio && event.webContentLink && (
          <audio
            ref={audioRef}
            src={event.webContentLink}
            onEnded={() => setIsPlaying(false)}
            onError={() => {
              setIsPlaying(false);
              toast.error("Erro ao carregar audio");
            }}
            preload="none"
          />
        )}
      </div>
    </div>
  );
}
