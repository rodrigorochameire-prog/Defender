"use client";

import { use, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc/client";
import { ArrowLeft, Lock, User, Loader2, FileText, Plus, Sparkles, Pencil, Clock, Send, Scale, Calendar, FolderOpen, PanelRight } from "lucide-react";
import { getAtribuicaoColors } from "@/lib/config/atribuicoes";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { TranscriptViewer, type AnalysisData } from "@/components/shared/transcript-viewer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import Link from "next/link";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { IntelligenceTab } from "@/components/intelligence/IntelligenceTab";
import { DriveStatusBar } from "@/components/drive/DriveStatusBar";
import { DriveTabEnhanced } from "@/components/drive/DriveTabEnhanced";
import { MarkdownViewerModal } from "@/components/drive/MarkdownViewerModal";
import { useRealtimeFileStatus } from "@/hooks/use-realtime-file-status";
import { MidiasHub } from "@/components/midias/MidiasHub";
import { TimelineVivaAssistido } from "@/components/processos/TimelineViva";
import { RadarAssistidoCard } from "@/components/radar/radar-assistido-card";
import { AssistidoOverviewPanel } from "./_components/overview-panel";
import { AssistidoFichaSheet } from "./_components/ficha-sheet";

const PRESOS = ["CADEIA_PUBLICA", "PENITENCIARIA", "COP", "HOSPITAL_CUSTODIA"] as const;

type Tab = "processos" | "demandas" | "drive" | "audiencias" | "midias" | "timeline" | "oficios" | "inteligencia" | "radar";

interface TranscriptionData {
  transcript: string;
  summary?: string;
  speakers?: string[];
  duration?: number;
  analysis?: AnalysisData | null;
}

export default function AssistidoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("processos");

  // Ficha sheet state
  const [fichaSheetOpen, setFichaSheetOpen] = useState(false);

  // Overview panel navigation states
  const [itemSheetOpen, setItemSheetOpen] = useState(false);
  const [itemSheetType, setItemSheetType] = useState<"processo" | "demanda" | null>(null);
  const [selectedProcessoId, setSelectedProcessoId] = useState<number | null>(null);
  const [selectedDemandaId, setSelectedDemandaId] = useState<number | null>(null);

  // AI Analysis state
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);

  // Transcription state
  const [transcriptions, setTranscriptions] = useState<Map<string, TranscriptionData>>(new Map());
  const [transcribing, setTranscribing] = useState<Set<string>>(new Set());
  const [transcriptViewerFile, setTranscriptViewerFile] = useState<string | null>(null);

  // Markdown viewer state (for Plaud transcriptions)
  const [markdownViewerFile, setMarkdownViewerFile] = useState<{
    id: number;
    name: string;
    driveFileId: string | null;
    webViewLink: string | null;
  } | null>(null);

  // Solar / SIGAD state
  const [sigadResult, setSigadResult] = useState<{
    success: boolean;
    ja_existia_solar?: boolean;
    verificacao_processo?: boolean | null;
    sigad_processo?: string | null;
    dados_para_enriquecer?: {
      nomeMae?: string | null;
      dataNascimento?: string | null;
      naturalidade?: string | null;
      telefone?: string | null;
    } | null;
    solar_url?: string | null;
    nome_sigad?: string | null;
    message?: string | null;
    error?: string | null;
  } | null>(null);
  const exportarViaSigad = trpc.solar.exportarViaSigad.useMutation({
    onSuccess: (result) => {
      setSigadResult(result);
      if (result.success) {
        const camposEnriquecidos = result.message?.includes("Campos enriquecidos:")
          ? result.message.split("Campos enriquecidos:")[1]?.trim()
          : null;
        toast.success(
          result.ja_existia_solar
            ? "Assistido já está cadastrado no Solar"
            : camposEnriquecidos
            ? `Exportado ao Solar. Campos preenchidos: ${camposEnriquecidos}`
            : "Assistido exportado ao Solar com sucesso",
        );
      } else if (result.error === "processo_nao_corresponde") {
        toast.warning(`Processo no SIGAD não corresponde: ${result.sigad_processo ?? "desconhecido"}`);
      } else {
        toast.error(result.message ?? result.error ?? "Erro ao exportar ao Solar");
      }
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  // Sync OMBUDS -> Solar (escreve fases processuais)
  const [syncSolarResult, setSyncSolarResult] = useState<{
    success: boolean;
    fases_criadas: number;
    fases_skipped: number;
    fases_falhadas: number;
    total: number;
    erros: string[];
  } | null>(null);
  const sincronizarComSolar = trpc.solar.sincronizarComSolar.useMutation({
    onSuccess: (result) => {
      setSyncSolarResult(result);
      if (result.fases_criadas > 0) {
        toast.success(
          `${result.fases_criadas} fase(s) processual(is) criada(s) no Solar`,
        );
      } else if (result.total === 0) {
        toast.info("Nenhuma anotação pendente para sincronizar");
      } else if (result.fases_falhadas > 0) {
        const discoveryNeeded = result.erros?.some((e) => e.includes("Discovery"));
        toast.warning(
          discoveryNeeded
            ? "Discovery dos formulários do Solar necessária (conecte Chrome MCP)"
            : `${result.fases_falhadas} fase(s) falharam. Verifique os erros.`,
        );
      }
    },
    onError: (err) => {
      toast.error(`Erro ao sincronizar: ${err.message}`);
    },
  });

  // Track files sent to background transcription
  const [processingFiles, setProcessingFiles] = useState<Set<string>>(new Set());

  const { data, isLoading, error } = trpc.assistidos.getById.useQuery(
    { id: Number(id) },
    { staleTime: 60_000 },
  );

  const utils = trpc.useUtils();

  // Supabase Realtime: listen for enrichment_status changes instead of heavy polling
  const handleRealtimeStatusChange = useCallback(
    (update: { id: number; drive_file_id: string; enrichment_status: string; name: string }) => {
      if (update.enrichment_status === "completed") {
        toast.success(`Transcrição de "${update.name}" concluída!`);
        setProcessingFiles((prev) => {
          const next = new Set(prev);
          next.delete(update.drive_file_id);
          return next;
        });
        // Invalidate enrichment data, midias hub, and assistido for status badges
        utils.drive.getFilesEnrichmentData.invalidate();
        utils.drive.midiasByAssistido.invalidate({ assistidoId: Number(id) });
        utils.assistidos.getById.invalidate({ id: Number(id) });
      } else if (update.enrichment_status === "failed") {
        toast.error(`Transcrição de "${update.name}" falhou`);
        setProcessingFiles((prev) => {
          const next = new Set(prev);
          next.delete(update.drive_file_id);
          return next;
        });
        utils.drive.midiasByAssistido.invalidate({ assistidoId: Number(id) });
        utils.assistidos.getById.invalidate({ id: Number(id) });
      }
    },
    [id, utils],
  );

  useRealtimeFileStatus(
    data ? Number(id) : undefined,
    handleRealtimeStatusChange,
    processingFiles.size > 0,
  );

  // Ofícios do assistido
  const { data: oficiosData } = trpc.oficios.list.useQuery(
    { assistidoId: Number(id), limit: 50 },
    { enabled: !!id }
  );

  // Filter media files (audio/*, video/*, or Plaud transcriptions)
  const mediaFiles = useMemo(
    () =>
      data?.driveFiles?.filter(
        (f) =>
          f.mimeType?.startsWith("audio/") ||
          f.mimeType?.startsWith("video/") ||
          f.documentType === "transcricao_plaud"
      ) ?? [],
    [data?.driveFiles]
  );

  // Note: enrichmentData for midias now handled by MidiasHub component

  // Sync processingFiles with actual status from server (fallback for Realtime)
  useEffect(() => {
    if (processingFiles.size === 0 || !data?.driveFiles) return;
    const stillProcessing = new Set<string>();
    for (const fileKey of processingFiles) {
      const file = data.driveFiles.find(
        (f) => (f.driveFileId ?? String(f.id)) === fileKey
      );
      if (file && file.enrichmentStatus === "processing") {
        stillProcessing.add(fileKey);
      }
    }
    if (stillProcessing.size !== processingFiles.size) {
      setProcessingFiles(stillProcessing);
    }
  }, [data?.driveFiles, processingFiles]);

  const transcribeMutation = trpc.drive.transcreverDrive.useMutation({
    onSuccess: (result) => {
      toast.success(result.message ?? "Transcrição iniciada em background!");
    },
    onError: (err) => {
      toast.error(`Erro ao transcrever: ${err.message}`);
    },
  });

  const handleTranscribe = async (driveFileId: string) => {
    setTranscribing((prev) => new Set(prev).add(driveFileId));
    try {
      await transcribeMutation.mutateAsync({
        driveFileId,
        assistidoId: Number(id),
        diarize: true,
        language: "pt",
      });
      // Mutation returns 202 — transcription runs in background on Railway.
      // Supabase Realtime will notify when it completes.
      setProcessingFiles((prev) => new Set(prev).add(driveFileId));
    } catch {
      // Error handled by onError callback above
    } finally {
      setTranscribing((prev) => {
        const next = new Set(prev);
        next.delete(driveFileId);
        return next;
      });
    }
  };


  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-32 w-full" />
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
    { key: "timeline", label: "Timeline" },
    { key: "oficios", label: "Ofícios", count: oficiosData?.total ?? 0 },
    { key: "inteligencia", label: "Inteligência" },
    { key: "radar", label: "Radar" },
  ];

  // Get current transcript viewer data
  const currentViewerData = transcriptViewerFile
    ? transcriptions.get(transcriptViewerFile)
    : null;

  return (
    <div className="flex flex-col h-full">
      {/* Header Premium */}
      <div className="px-6 pt-4 pb-4 border-b border-zinc-100 dark:border-zinc-800">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-[10px] text-zinc-400 hover:text-zinc-600 mb-3 transition-colors uppercase tracking-wide font-medium"
        >
          <ArrowLeft className="h-3 w-3" /> Voltar
        </button>
        <div className="flex items-center gap-4">
          {/* Avatar grande com iniciais */}
          {(() => {
            const colors = getAtribuicaoColors((data as any).atribuicaoPrimaria);
            const initials = data.nome.split(" ").filter(Boolean).slice(0, 2).map(w => w[0]).join("").toUpperCase();
            return (
              <div
                className={cn(
                  "h-14 w-14 rounded-2xl flex items-center justify-center shrink-0 shadow-md text-white font-bold text-lg",
                  colors.bgSolid || "bg-emerald-500"
                )}
              >
                {initials || <User className="h-6 w-6" />}
              </div>
            );
          })()}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 truncate">
                {data.nome}
              </h1>
              <Link href={`/admin/assistidos/${data.id}/editar`}>
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-zinc-400 hover:text-emerald-600">
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
              </Link>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 text-zinc-400 hover:text-emerald-600"
                onClick={() => setFichaSheetOpen(true)}
              >
                <PanelRight className="h-3.5 w-3.5" />
              </Button>
              {isPreso && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 animate-pulse">
                  <Lock className="h-3 w-3" />
                  Preso
                </span>
              )}
            </div>
            <div className="flex items-center gap-2.5 mt-1">
              {data.cpf && (
                <span className="text-[11px] text-zinc-400 font-mono tabular-nums">{data.cpf}</span>
              )}
              {data.statusPrisional && !isPreso && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400">
                  {statusLabel[data.statusPrisional] ?? data.statusPrisional.toLowerCase()}
                </span>
              )}
              {(data as any).atribuicaoPrimaria && (
                <span className={cn(
                  "text-[10px] px-1.5 py-0.5 rounded-md font-medium",
                  getAtribuicaoColors((data as any).atribuicaoPrimaria).bg,
                  getAtribuicaoColors((data as any).atribuicaoPrimaria).text
                )}>
                  {(data as any).atribuicaoPrimaria}
                </span>
              )}
            </div>
          </div>
          {/* Mini KPIs inline — desktop only */}
          <div className="hidden lg:flex items-center gap-3 shrink-0">
            <div className="flex items-center gap-1.5 text-xs text-zinc-500">
              <Scale className="w-3.5 h-3.5 text-zinc-400" />
              <span className="font-bold text-zinc-700 dark:text-zinc-300">{data.processos.length}</span>
              <span className="text-zinc-400">proc.</span>
            </div>
            <span className="text-zinc-200 dark:text-zinc-700">|</span>
            <div className="flex items-center gap-1.5 text-xs text-zinc-500">
              <FileText className="w-3.5 h-3.5 text-zinc-400" />
              <span className="font-bold text-zinc-700 dark:text-zinc-300">{data.demandas.length}</span>
              <span className="text-zinc-400">dem.</span>
            </div>
            <span className="text-zinc-200 dark:text-zinc-700">|</span>
            <div className="flex items-center gap-1.5 text-xs text-zinc-500">
              <Calendar className="w-3.5 h-3.5 text-zinc-400" />
              <span className="font-bold text-zinc-700 dark:text-zinc-300">{data.audiencias.length}</span>
              <span className="text-zinc-400">aud.</span>
            </div>
            <span className="text-zinc-200 dark:text-zinc-700">|</span>
            <div className="flex items-center gap-1.5 text-xs text-zinc-500">
              <FolderOpen className="w-3.5 h-3.5 text-zinc-400" />
              <span className="font-bold text-zinc-700 dark:text-zinc-300">{data.driveFiles.length}</span>
              <span className="text-zinc-400">arq.</span>
            </div>
          </div>
        </div>
        {/* Mini KPIs — mobile/tablet compact row */}
        <div className="flex lg:hidden items-center gap-3 mt-3 px-1">
          <div className="flex items-center gap-1 text-xs text-zinc-500 dark:text-zinc-400">
            <Scale className="w-3 h-3" />
            <span className="font-bold text-zinc-700 dark:text-zinc-300">{data.processos.length}</span>
            <span>proc.</span>
          </div>
          <span className="text-zinc-300 dark:text-zinc-600">·</span>
          <div className="flex items-center gap-1 text-xs text-zinc-500 dark:text-zinc-400">
            <FileText className="w-3 h-3" />
            <span className="font-bold text-zinc-700 dark:text-zinc-300">{data.demandas.length}</span>
            <span>dem.</span>
          </div>
          <span className="text-zinc-300 dark:text-zinc-600">·</span>
          <div className="flex items-center gap-1 text-xs text-zinc-500 dark:text-zinc-400">
            <Calendar className="w-3 h-3" />
            <span className="font-bold text-zinc-700 dark:text-zinc-300">{data.audiencias.length}</span>
            <span>aud.</span>
          </div>
          <span className="text-zinc-300 dark:text-zinc-600">·</span>
          <div className="flex items-center gap-1 text-xs text-zinc-500 dark:text-zinc-400">
            <FolderOpen className="w-3 h-3" />
            <span className="font-bold text-zinc-700 dark:text-zinc-300">{data.driveFiles.length}</span>
            <span>arq.</span>
          </div>
        </div>
      </div>

      {/* Drive Status Bar */}
      <DriveStatusBar assistidoId={Number(id)} />

      {/* Overview Panel */}
      <AssistidoOverviewPanel
        data={data}
        onProcessoClick={(processoId) => {
          setSelectedProcessoId(processoId);
          setSelectedDemandaId(null);
          setItemSheetType("processo");
          setItemSheetOpen(true);
          router.push(`/admin/processos/${processoId}`);
        }}
        onDemandaClick={(demandaId) => {
          setSelectedDemandaId(demandaId);
          setSelectedProcessoId(null);
          setItemSheetType("demanda");
          setItemSheetOpen(true);
          router.push(`/admin/demandas/${demandaId}`);
        }}
      />

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
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Processos</h2>
              <Link href={`/admin/processos/novo?assistidoId=${data.id}`}>
                <Button variant="ghost" size="sm" className="h-7 gap-1 text-[11px] text-zinc-500 hover:text-emerald-600">
                  <Plus className="h-3.5 w-3.5" />
                  Novo Processo
                </Button>
              </Link>
            </div>
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
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Demandas</h2>
              <Link href={`/admin/demandas/nova?assistidoId=${data.id}`}>
                <Button variant="ghost" size="sm" className="h-7 gap-1 text-[11px] text-zinc-500 hover:text-emerald-600">
                  <Plus className="h-3.5 w-3.5" />
                  Nova Demanda
                </Button>
              </Link>
            </div>
            {data.demandas.length === 0 ? (
              <p className="text-sm text-zinc-400 text-center py-8">Nenhuma demanda vinculada</p>
            ) : (
              data.demandas.map((d) => (
                <Link key={d.id} href={`/admin/demandas/${d.id}`} className="block">
                  <div className="flex items-center gap-2 border border-zinc-100 dark:border-zinc-700 rounded px-3 py-2 hover:border-emerald-300 hover:bg-emerald-50/30 dark:hover:bg-emerald-900/10 cursor-pointer transition-all">
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
                        : d.status === "CONCLUIDO" ? "bg-emerald-100 text-emerald-700"
                        : "bg-amber-100 text-amber-700"
                    )}>
                      {d.status?.replace(/^\d+_/, "") ?? "—"}
                    </span>
                  </div>
                </Link>
              ))
            )}
          </div>
        )}

        {tab === "drive" && (
          <DriveTabEnhanced
            files={data.driveFiles}
            assistidoId={Number(id)}
          />
        )}

        {tab === "audiencias" && (
          <div className="space-y-2">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Audiencias</h2>
              <Link href={`/admin/agenda?assistidoId=${data.id}`}>
                <Button variant="ghost" size="sm" className="h-7 gap-1 text-[11px] text-zinc-500 hover:text-emerald-600">
                  <Plus className="h-3.5 w-3.5" />
                  Agendar
                </Button>
              </Link>
            </div>
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
          <MidiasHub
            assistidoId={Number(id)}
            processingFiles={processingFiles}
            onTranscribe={handleTranscribe}
            onViewTranscript={(fileKey, data) => {
              setTranscriptions((prev) => {
                const next = new Map(prev);
                next.set(fileKey, {
                  transcript: data.transcript,
                  summary: data.summary,
                  speakers: data.speakers as string[] | undefined,
                });
                return next;
              });
              setTranscriptViewerFile(fileKey);
            }}
            onViewPlaud={(file) => setMarkdownViewerFile(file)}
          />
        )}

        {tab === "timeline" && (
          <TimelineVivaAssistido assistidoId={Number(id)} />
        )}

        {tab === "oficios" && (
          <div className="space-y-3">
            {/* Header */}
            <div className="flex items-center justify-between">
              <p className="text-xs text-zinc-500">
                {oficiosData?.total ?? 0} oficio(s) vinculado(s)
              </p>
              <Button
                size="sm"
                className="h-7 text-xs bg-emerald-600 hover:bg-emerald-500 text-white"
                onClick={() => router.push(`/admin/oficios/novo?assistidoId=${id}`)}
              >
                <Plus className="w-3 h-3 mr-1" />
                Novo Oficio
              </Button>
            </div>

            {/* Lista */}
            {!oficiosData?.items?.length ? (
              <div className="text-center py-12">
                <FileText className="w-8 h-8 mx-auto text-zinc-600 mb-2" />
                <p className="text-sm text-zinc-500">Nenhum oficio vinculado</p>
                <p className="text-xs text-zinc-600 mt-1">
                  Crie um novo oficio para este assistido
                </p>
              </div>
            ) : (
              oficiosData.items.map((oficio) => {
                const meta = (oficio.metadata as Record<string, string> | null) || {};
                const statusKey = meta.status || "rascunho";
                const statusLabel = statusKey === "rascunho" ? "Rascunho" :
                  statusKey === "revisao" ? "Em Revisao" :
                  statusKey === "enviado" ? "Enviado" :
                  statusKey === "arquivado" ? "Arquivado" : statusKey;
                const statusColor = statusKey === "rascunho" ? "text-yellow-400 border-yellow-500/20" :
                  statusKey === "revisao" ? "text-blue-400 border-blue-500/20" :
                  statusKey === "enviado" ? "text-emerald-400 border-emerald-500/20" :
                  "text-zinc-400 border-zinc-500/20";

                return (
                  <Link
                    key={oficio.id}
                    href={`/admin/oficios/${oficio.id}`}
                    className="block p-3 rounded-lg border border-zinc-700/30 bg-zinc-800/30
                      hover:bg-zinc-800/60 hover:border-emerald-500/20 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className={`text-[9px] ${statusColor}`}>
                            {statusLabel}
                          </Badge>
                          {meta.tipoOficio && (
                            <Badge variant="outline" className="text-[9px] text-zinc-400 border-zinc-600">
                              {meta.tipoOficio}
                            </Badge>
                          )}
                          {oficio.geradoPorIA && (
                            <Sparkles className="w-3 h-3 text-violet-400" />
                          )}
                        </div>
                        <h4 className="text-sm font-medium text-zinc-200 truncate">
                          {oficio.titulo}
                        </h4>
                        <div className="flex items-center gap-3 mt-1 text-[10px] text-zinc-600">
                          {oficio.processoNumero && (
                            <span className="font-mono">{oficio.processoNumero}</span>
                          )}
                          {meta.destinatario && (
                            <span><Send className="w-2.5 h-2.5 inline mr-0.5" />{meta.destinatario}</span>
                          )}
                          <span>
                            <Clock className="w-2.5 h-2.5 inline mr-0.5" />
                            {new Date(oficio.updatedAt).toLocaleDateString("pt-BR")}
                          </span>
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })
            )}
          </div>
        )}
        {tab === "inteligencia" && (
          <div className="space-y-4">
            <IntelligenceTab
              assistidoId={Number(id)}
              casoId={data.casoId}
            />
          </div>
        )}
        {tab === "radar" && (
          <div className="space-y-4">
            <RadarAssistidoCard assistidoId={Number(id)} />
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
          speakers={currentViewerData.speakers}
          duration={currentViewerData.duration}
          analysis={currentViewerData.analysis}
          assistidoNome={data.nome}
        />
      )}

      {/* Markdown Viewer for Plaud transcriptions */}
      {markdownViewerFile && (
        <MarkdownViewerModal
          isOpen={!!markdownViewerFile}
          onClose={() => setMarkdownViewerFile(null)}
          fileName={markdownViewerFile.name}
          fileId={markdownViewerFile.driveFileId || undefined}
          fileDbId={markdownViewerFile.id}
          webViewLink={markdownViewerFile.webViewLink || undefined}
          assistidoId={Number(id)}
        />
      )}

      {/* Ficha Sheet lateral */}
      <AssistidoFichaSheet
        open={fichaSheetOpen}
        onOpenChange={setFichaSheetOpen}
        assistido={{
          id: data.id,
          nome: data.nome,
          cpf: data.cpf,
          rg: data.rg,
          dataNascimento: data.dataNascimento,
          nomeMae: data.nomeMae,
          nomePai: data.nomePai,
          naturalidade: data.naturalidade,
          endereco: data.endereco,
          telefone: data.telefone,
          telefoneContato: data.telefoneContato,
          nomeContato: data.nomeContato,
          parentescoContato: data.parentescoContato,
          driveFolderId: data.driveFolderId,
          processos: data.processos.map((p) => ({ id: p.id, numeroAutos: p.numeroAutos })),
        }}
        onExportarSolar={() => exportarViaSigad.mutate({ assistidoId: Number(id) })}
        onSyncSolar={() => sincronizarComSolar.mutate({ assistidoId: Number(id) })}
        onAnalisarIA={async () => {
          setIsAnalyzing(true);
          setAnalysisResult(null);
          try {
            const res = await fetch("/api/ai/analyze-folder", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ assistidoId: Number(id) }),
            });
            if (!res.ok) {
              const err = (await res.json().catch(() => ({}))) as { error?: string };
              throw new Error(err?.error ?? "Falha na análise");
            }
            const json = (await res.json()) as { summary?: string };
            setAnalysisResult(json.summary ?? "Análise concluída sem resumo.");
            toast.success("Análise da pasta concluída");
          } catch (err) {
            const message = err instanceof Error ? err.message : "Erro ao analisar pasta";
            toast.error(message);
          } finally {
            setIsAnalyzing(false);
          }
        }}
        isExportandoSolar={exportarViaSigad.isPending}
        isSyncSolar={sincronizarComSolar.isPending}
        isAnalisando={isAnalyzing}
      />
    </div>
  );
}
