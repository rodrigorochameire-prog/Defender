"use client";

import { use, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc/client";
import { ArrowLeft, Lock, User, Mic, Music, Video, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { SubpastaExplorer } from "@/components/hub/SubpastaExplorer";
import { TimelineDocumental } from "@/components/hub/TimelineDocumental";
import { TranscriptViewer } from "@/components/shared/transcript-viewer";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const PRESOS = ["CADEIA_PUBLICA", "PENITENCIARIA", "COP", "HOSPITAL_CUSTODIA"] as const;

type Tab = "processos" | "demandas" | "drive" | "audiencias" | "midias";

interface TranscriptionData {
  transcript: string;
  summary?: string;
}

export default function AssistidoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("processos");

  // Transcription state
  const [transcriptions, setTranscriptions] = useState<Map<string, TranscriptionData>>(new Map());
  const [transcribing, setTranscribing] = useState<Set<string>>(new Set());
  const [transcriptViewerFile, setTranscriptViewerFile] = useState<string | null>(null);
  const [isSummarizing, setIsSummarizing] = useState(false);

  const { data, isLoading, error } = trpc.assistidos.getById.useQuery(
    { id: Number(id) },
    { staleTime: 60_000 }
  );

  // Filter media files (audio/* or video/*)
  const mediaFiles = useMemo(
    () =>
      data?.driveFiles?.filter(
        (f) =>
          f.mimeType?.startsWith("audio/") || f.mimeType?.startsWith("video/")
      ) ?? [],
    [data?.driveFiles]
  );

  const handleTranscribe = async (driveFileId: string) => {
    setTranscribing((prev) => new Set(prev).add(driveFileId));
    try {
      const res = await fetch("/api/ai/transcribe-drive-file", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ driveFileId }),
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(err?.error ?? "Falha na transcrição.");
      }
      const json = (await res.json()) as { transcript?: string };
      const transcript = json.transcript ?? "";
      setTranscriptions((prev) => {
        const next = new Map(prev);
        next.set(driveFileId, { transcript });
        return next;
      });
      setTranscriptViewerFile(driveFileId);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro ao transcrever.";
      toast.error(message);
    } finally {
      setTranscribing((prev) => {
        const next = new Set(prev);
        next.delete(driveFileId);
        return next;
      });
    }
  };

  const handleSummarize = async (driveFileId: string, assistidoNome?: string) => {
    const transcriptionData = transcriptions.get(driveFileId);
    if (!transcriptionData) return;
    setIsSummarizing(true);
    try {
      const res = await fetch("/api/ai/summarize-transcript", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transcript: transcriptionData.transcript,
          assistidoNome,
        }),
      });
      if (!res.ok) throw new Error("Falha ao gerar resumo");
      const json = (await res.json()) as { summary?: string };
      setTranscriptions((prev) => {
        const next = new Map(prev);
        const existing = next.get(driveFileId);
        if (existing) {
          next.set(driveFileId, { ...existing, summary: json.summary ?? "" });
        }
        return next;
      });
    } catch {
      toast.error("Não foi possível gerar o resumo.");
    } finally {
      setIsSummarizing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-4 animate-pulse">
        <div className="h-6 bg-zinc-200 rounded w-48" />
        <div className="h-4 bg-zinc-100 rounded w-32" />
        <div className="h-32 bg-zinc-100 rounded" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6 text-center text-zinc-500">
        <p className="text-sm">Assistido não encontrado.</p>
        <button onClick={() => router.back()} className="mt-2 text-xs text-emerald-600 hover:underline">
          Voltar
        </button>
      </div>
    );
  }

  const isPreso = data.statusPrisional
    ? (PRESOS as readonly string[]).includes(data.statusPrisional)
    : false;

  const statusLabel: Record<string, string> = {
    SOLTO: "solto",
    CADEIA_PUBLICA: "cadeia pública",
    PENITENCIARIA: "penitenciária",
    COP: "COP",
    HOSPITAL_CUSTODIA: "hospital de custódia",
    DOMICILIAR: "domiciliar",
    MONITORADO: "monitorado",
  };

  const tabs: { key: Tab; label: string; count?: number }[] = [
    { key: "processos", label: "Processos", count: data.processos.length },
    { key: "demandas", label: "Demandas", count: data.demandas.length },
    { key: "drive", label: "Drive", count: data.driveFiles.length },
    { key: "audiencias", label: "Audiências", count: data.audiencias.length },
    { key: "midias", label: "Mídias", count: mediaFiles.length },
  ];

  // Get current transcript viewer data
  const currentViewerData = transcriptViewerFile
    ? transcriptions.get(transcriptViewerFile)
    : null;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 pt-5 pb-4 border-b border-zinc-100 dark:border-zinc-800">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-600 mb-3 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Voltar
        </button>
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
            <User className="h-5 w-5 text-emerald-600" />
          </div>
          <div>
            <h1 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              {data.nome}
              {isPreso && (
                <Lock className="h-3.5 w-3.5 text-rose-500" />
              )}
            </h1>
            <div className="flex items-center gap-2 mt-0.5">
              {data.cpf && (
                <span className="text-[11px] text-zinc-400 font-mono">{data.cpf}</span>
              )}
              {data.statusPrisional && (
                <span className={cn(
                  "text-[10px] px-1.5 py-0.5 rounded-full font-medium",
                  isPreso
                    ? "bg-rose-100 text-rose-700"
                    : "bg-zinc-100 text-zinc-600"
                )}>
                  {statusLabel[data.statusPrisional] ?? data.statusPrisional.toLowerCase()}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-0 border-b border-zinc-100 dark:border-zinc-800 px-6">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              "px-3 py-2.5 text-[11px] font-medium border-b-2 transition-colors",
              tab === t.key
                ? "border-emerald-500 text-emerald-700 dark:text-emerald-400"
                : "border-transparent text-zinc-500 hover:text-zinc-700"
            )}
          >
            {t.label}
            {t.count !== undefined && t.count > 0 && (
              <span className="ml-1.5 text-[10px] bg-zinc-100 dark:bg-zinc-800 text-zinc-500 px-1.5 py-0.5 rounded-full">
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {tab === "processos" && (
          <div className="space-y-2">
            {data.processos.length === 0 ? (
              <p className="text-sm text-zinc-400 text-center py-8">Nenhum processo vinculado</p>
            ) : (
              data.processos.map((p) => (
                <div
                  key={p.id}
                  onClick={() => router.push(`/admin/processos/${p.id}`)}
                  className="border border-zinc-200 dark:border-zinc-700 rounded-lg p-3 hover:border-emerald-300 hover:bg-emerald-50/30 dark:hover:bg-emerald-900/10 cursor-pointer transition-all"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono text-zinc-600">{p.numeroAutos ?? "Sem número"}</span>
                    <span className={cn(
                      "text-[10px] px-1.5 py-0.5 rounded-full font-medium",
                      p.papel === "REU" ? "bg-rose-100 text-rose-700"
                        : p.papel === "CORREU" ? "bg-amber-100 text-amber-700"
                        : p.papel === "VITIMA" ? "bg-blue-100 text-blue-700"
                        : "bg-zinc-100 text-zinc-600"
                    )}>
                      {p.papel?.toLowerCase() ?? "réu"}
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-500 mt-1">{p.vara ?? ""}</p>
                  {p.assunto && <p className="text-[11px] text-zinc-400 mt-0.5 truncate">{p.assunto}</p>}
                </div>
              ))
            )}
          </div>
        )}

        {tab === "demandas" && (
          <div className="space-y-1.5">
            {data.demandas.length === 0 ? (
              <p className="text-sm text-zinc-400 text-center py-8">Nenhuma demanda vinculada</p>
            ) : (
              data.demandas.map((d) => (
                <div key={d.id} className="flex items-center gap-2 border border-zinc-100 rounded px-3 py-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] text-zinc-700 dark:text-zinc-300 truncate">{d.ato ?? d.tipoAto ?? "Demanda"}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      {d.defensorNome && (
                        <span className="text-[9px] px-1.5 py-0.5 bg-zinc-100 text-zinc-600 rounded-full">
                          {d.defensorNome}
                        </span>
                      )}
                      {d.prazo && (
                        <span className="text-[9px] text-zinc-400">
                          {format(new Date(d.prazo), "dd/MM/yy", { locale: ptBR })}
                        </span>
                      )}
                    </div>
                  </div>
                  <span className={cn(
                    "text-[9px] px-1.5 py-0.5 rounded-full font-medium shrink-0",
                    d.status === "5_FILA" ? "bg-zinc-100 text-zinc-500"
                      : d.status === "3_CONCLUIDO" ? "bg-emerald-100 text-emerald-700"
                      : "bg-amber-100 text-amber-700"
                  )}>
                    {d.status?.replace(/^\d+_/, "") ?? "—"}
                  </span>
                </div>
              ))
            )}
          </div>
        )}

        {tab === "drive" && (
          <div className="space-y-6">
            <div>
              <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wide mb-2">
                Arquivos
              </p>
              <SubpastaExplorer files={data.driveFiles} />
            </div>
            <div>
              <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wide mb-2">
                Timeline documental
              </p>
              <TimelineDocumental files={data.driveFiles} />
            </div>
          </div>
        )}

        {tab === "audiencias" && (
          <div className="space-y-2">
            {data.audiencias.length === 0 ? (
              <p className="text-sm text-zinc-400 text-center py-8">Nenhuma audiência registrada</p>
            ) : (
              data.audiencias.map((a) => (
                <div key={a.id} className="border border-zinc-200 rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-medium text-zinc-700">{a.tipo ?? "Audiência"}</span>
                    <span className={cn(
                      "text-[10px] px-1.5 py-0.5 rounded-full",
                      a.dataAudiencia && new Date(a.dataAudiencia) < new Date()
                        ? "bg-zinc-100 text-zinc-500"
                        : "bg-emerald-100 text-emerald-700"
                    )}>
                      {a.dataAudiencia && new Date(a.dataAudiencia) < new Date() ? "Realizada" : "Futura"}
                    </span>
                  </div>
                  {a.dataAudiencia && (
                    <p className="text-[11px] text-zinc-400 mt-0.5">
                      {format(new Date(a.dataAudiencia), "dd/MM/yyyy 'às' HH'h'mm", { locale: ptBR })}
                    </p>
                  )}
                  {a.local && <p className="text-[11px] text-zinc-400">{a.local}</p>}
                </div>
              ))
            )}
          </div>
        )}

        {tab === "midias" && (
          <div className="space-y-2">
            {mediaFiles.length === 0 ? (
              <div className="text-center py-12">
                <Music className="h-8 w-8 mx-auto mb-2 text-zinc-300" />
                <p className="text-sm text-zinc-400">Nenhum arquivo de mídia encontrado</p>
                <p className="text-[11px] text-zinc-300 mt-1">Arquivos de áudio e vídeo do Drive aparecerão aqui</p>
              </div>
            ) : (
              mediaFiles.map((f) => {
                const isAudio = f.mimeType?.startsWith("audio/");
                const isTranscribed = transcriptions.has(f.id);
                const isCurrentlyTranscribing = transcribing.has(f.id);
                const transcriptionData = transcriptions.get(f.id);

                return (
                  <div
                    key={f.id}
                    className="border border-zinc-200 dark:border-zinc-700 rounded-lg p-3"
                  >
                    <div className="flex items-center gap-3">
                      {isAudio ? (
                        <Music className="h-5 w-5 text-cyan-500 shrink-0" />
                      ) : (
                        <Video className="h-5 w-5 text-violet-500 shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] font-medium text-zinc-700 dark:text-zinc-300 truncate">
                          {f.name}
                        </p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          {!isAudio && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">
                              vídeo
                            </span>
                          )}
                          <span className="text-[10px] text-zinc-400">
                            {f.mimeType}
                          </span>
                        </div>
                        {isCurrentlyTranscribing && (
                          <div className="mt-1.5 h-1 rounded-full bg-zinc-100 overflow-hidden">
                            <div className="h-full bg-cyan-400 animate-pulse rounded-full w-2/3" />
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {isTranscribed && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 text-[11px] text-violet-600 hover:text-violet-700 px-2"
                            onClick={() => setTranscriptViewerFile(f.id)}
                          >
                            Ver transcrição
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-[11px] px-2 gap-1.5"
                          onClick={() => handleTranscribe(f.id)}
                          disabled={isCurrentlyTranscribing}
                        >
                          {isCurrentlyTranscribing ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Mic className="h-3 w-3 text-cyan-500" />
                          )}
                          {isCurrentlyTranscribing
                            ? "Transcrevendo..."
                            : isTranscribed
                            ? "Retranscrever"
                            : "Transcrever"}
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* Transcript Viewer Dialog */}
      {transcriptViewerFile && currentViewerData && (
        <TranscriptViewer
          open={!!transcriptViewerFile}
          onOpenChange={(open) => {
            if (!open) setTranscriptViewerFile(null);
          }}
          transcript={currentViewerData.transcript}
          summary={currentViewerData.summary}
          assistidoNome={data.nome}
          onSummarize={() => handleSummarize(transcriptViewerFile, data.nome)}
          isSummarizing={isSummarizing}
        />
      )}
    </div>
  );
}
