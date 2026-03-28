"use client";

import { use, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc/client";
import { ArrowLeft, Lock, User, Loader2, FileText, Plus, Sparkles, Pencil, Clock, Send, Scale, Calendar, FolderOpen, PanelRight, ChevronDown, Bot, Download, Zap } from "lucide-react";
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
import { ItemDetailSheet } from "./_components/item-detail-sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CoworkActionGroup } from "@/components/shared/cowork-action-button";

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
  const [tab, setTab] = useState<Tab>(() => {
    if (typeof window === "undefined") return "processos";
    return (localStorage.getItem(`assistido-tab-${id}`) as Tab) ?? "processos";
  });

  const handleSetTab = (t: Tab) => {
    setTab(t);
    localStorage.setItem(`assistido-tab-${id}`, t);
  };

  // Ficha sheet state
  const [fichaSheetOpen, setFichaSheetOpen] = useState(false);

  // Overview panel navigation states
  const [itemSheetOpen, setItemSheetOpen] = useState(false);
  const [itemSheetType, setItemSheetType] = useState<"processo" | "demanda" | null>(null);
  const [selectedProcessoId, setSelectedProcessoId] = useState<number | null>(null);
  const [selectedDemandaId, setSelectedDemandaId] = useState<number | null>(null);

  // AI Analysis state
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const utils = trpc.useUtils();

  // Cowork import
  const importarAnaliseCowork = trpc.briefing.importarAnaliseCowork.useMutation({
    onSuccess: (result) => {
      toast.success("Análise IA importada com sucesso", {
        description: result.campos_atualizados.length > 0
          ? `Campos: ${result.campos_atualizados.join(", ")}`
          : "analysisData atualizado",
      });
      void utils.intelligence.getForAssistido.invalidate({ assistidoId: Number(id) });
    },
    onError: (err) => {
      toast.error("Erro ao importar análise", { description: err.message });
    },
  });

  // Análise profunda (Sonnet)
  const [sonnetProcessoId, setSonnetProcessoId] = useState<number | null>(null);
  const analiseProfunda = trpc.briefing.analiseProfunda.useMutation({
    onSuccess: (result) => {
      toast.success("Análise profunda concluída", {
        description: result.tese,
      });
      setSonnetProcessoId(null);
      void utils.intelligence.getForAssistido.invalidate({ assistidoId: Number(id) });
    },
    onError: (err) => {
      toast.error("Erro na análise profunda", { description: err.message });
      setSonnetProcessoId(null);
    },
  });

  // Cowork Análise completa ($0 — worker local)
  const coworkAnalise = trpc.briefing.coworkAnalise.useMutation({
    onSuccess: (result) => {
      toast.success("Tarefa Cowork criada", {
        description: result.message,
        duration: 8000,
      });
    },
    onError: (err) => {
      toast.error("Erro ao criar tarefa Cowork", { description: err.message });
    },
  });

  // Cowork export
  const [exportingAudienciaId, setExportingAudienciaId] = useState<number | null>(null);
  const [exportingProcessoId, setExportingProcessoId] = useState<number | null>(null);
  const [importingProcessoId, setImportingProcessoId] = useState<number | null>(null);
  const [importingAudienciaId, setImportingAudienciaId] = useState<number | null>(null);
  const exportarParaCowork = trpc.briefing.exportarParaCowork.useMutation({
    onSuccess: (result) => {
      toast.success(`Briefing exportado para o Drive`, {
        description: result.fileName,
        action: result.fileUrl ? { label: "Abrir", onClick: () => window.open(result.fileUrl, "_blank") } : undefined,
      });
    },
    onError: (err) => {
      toast.error("Erro ao exportar briefing", { description: err.message });
    },
    onSettled: () => setExportingAudienciaId(null),
  });

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
  const exportarViaSigad = trpc.solar.exportarViaSigad.useMutation({
    onSuccess: (result) => {
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
  const sincronizarComSolar = trpc.solar.sincronizarComSolar.useMutation({
    onSuccess: (result) => {
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

  const tabs: { key: Tab; label: string; count?: number; urgency?: "red" | "amber" }[] = [
    { key: "processos", label: "Processos", count: data.processos.length },
    {
      key: "demandas",
      label: "Demandas",
      count: data.demandas.length,
      urgency: data.demandas.some(d =>
        d.status === "URGENTE" || (d.prazo && new Date(d.prazo) < new Date())
      ) ? "red" : data.demandas.some(d => d.status === "2_ATENDER") ? "amber" : undefined
    },
    { key: "audiencias", label: "Audiências", count: data.audiencias.length },
    { key: "drive", label: "Drive", count: data.driveFiles.length },
    { key: "midias", label: "Mídias", count: mediaFiles.length },
    { key: "oficios", label: "Ofícios", count: oficiosData?.total ?? 0 },
    { key: "inteligencia", label: "Inteligência" },
  ];

  const overflowTabs: { key: Tab; label: string }[] = [
    { key: "timeline", label: "Timeline" },
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
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 text-zinc-400 hover:text-violet-600 transition-colors"
                title="Exportar briefing para pasta do Drive (Cowork)"
                disabled={exportarParaCowork.isPending}
                onClick={() => exportarParaCowork.mutate({ assistidoId: Number(id), tipo: "assistido" })}
              >
                {exportarParaCowork.isPending
                  ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  : <Bot className="h-3.5 w-3.5" />}
              </Button>
              {data.driveFolderId && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 text-zinc-400 hover:text-emerald-600 transition-colors"
                  title="Importar análise IA gerada pelo Cowork (_analise_ia.json)"
                  disabled={importarAnaliseCowork.isPending}
                  onClick={() => importarAnaliseCowork.mutate({ assistidoId: Number(id) })}
                >
                  {importarAnaliseCowork.isPending
                    ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    : <Download className="h-3.5 w-3.5" />}
                </Button>
              )}
              {isPreso && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 animate-pulse">
                  <Lock className="h-3 w-3" />
                  Preso
                </span>
              )}
              {/* Cowork — Análise completa (gera + importa + Drive) */}
              {data.processos?.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 gap-1 px-2.5 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950 transition-colors text-[11px]"
                  title="Análise completa Cowork — gera relatório, extrai dados, importa tudo"
                  disabled={coworkAnalise.isPending}
                  onClick={() => {
                    const proc = data.processos[0];
                    coworkAnalise.mutate({ processoId: proc.id, assistidoId: Number(id) });
                  }}
                >
                  {coworkAnalise.isPending
                    ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    : <Sparkles className="h-3.5 w-3.5" />}
                  Cowork
                </Button>
              )}
              {/* Sonnet — só sob demanda */}
              {data.processos?.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 gap-1 px-2 text-zinc-400 hover:text-amber-600 transition-colors text-[11px]"
                  title="Análise profunda com Claude Sonnet (teses, quesitos, estratégia)"
                  disabled={analiseProfunda.isPending}
                  onClick={() => {
                    const proc = data.processos[0];
                    setSonnetProcessoId(proc.id);
                    analiseProfunda.mutate({ processoId: proc.id, assistidoId: Number(id) });
                  }}
                >
                  {analiseProfunda.isPending
                    ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    : <Zap className="h-3.5 w-3.5" />}
                  Sonnet
                </Button>
              )}
            </div>
            {/* Cowork AI action buttons */}
            <div className="mt-2">
              <CoworkActionGroup
                assistidoNome={data.nome}
                numeroAutos={data.processos?.[0]?.numeroAutos ?? ""}
                classeProcessual={(data.processos?.[0] as any)?.classeProcessual ?? ""}
                vara={data.processos?.[0]?.vara ?? ""}
                atribuicao={(data as any).atribuicaoPrimaria ?? ""}
                drivePath=""
                actions={["analise-autos", "gerar-peca", "feedback-estagiario"]}
                size="sm"
              />
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
        }}
        onDemandaClick={(demandaId) => {
          setSelectedDemandaId(demandaId);
          setSelectedProcessoId(null);
          setItemSheetType("demanda");
          setItemSheetOpen(true);
        }}
      />

      {/* Tabs */}
      <div className="flex gap-0 border-b border-zinc-100 dark:border-zinc-800 px-6 overflow-x-auto">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => handleSetTab(t.key)}
            className={cn(
              "px-3 py-2.5 text-[11px] font-medium border-b-2 transition-colors whitespace-nowrap shrink-0",
              tab === t.key
                ? "border-emerald-500 text-emerald-700 dark:text-emerald-400"
                : "border-transparent text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
            )}
          >
            {t.label}
            {t.count !== undefined && t.count > 0 && (
              <span className={cn(
                "ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full",
                t.urgency === "red"
                  ? "bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 animate-pulse"
                  : t.urgency === "amber"
                  ? "bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400"
                  : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500"
              )}>
                {t.count}
              </span>
            )}
          </button>
        ))}
        {/* Overflow: Timeline e Radar */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className={cn(
                "px-3 py-2.5 text-[11px] font-medium border-b-2 transition-colors flex items-center gap-1 shrink-0",
                overflowTabs.some(t => t.key === tab)
                  ? "border-emerald-500 text-emerald-700 dark:text-emerald-400"
                  : "border-transparent text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
              )}
            >
              + <ChevronDown className="h-3 w-3" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {overflowTabs.map(t => (
              <DropdownMenuItem key={t.key} onClick={() => handleSetTab(t.key)}>
                {t.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
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
                  onClick={() => {
                    setSelectedProcessoId(p.id);
                    setSelectedDemandaId(null);
                    setItemSheetType("processo");
                    setItemSheetOpen(true);
                  }}
                  className="group flex gap-3 border border-zinc-200 dark:border-zinc-700 rounded-lg p-3 hover:border-emerald-300 hover:bg-emerald-50/30 dark:hover:bg-emerald-900/10 cursor-pointer transition-all overflow-hidden"
                >
                  {/* Left accent */}
                  <div className={cn(
                    "w-0.5 rounded-full shrink-0 self-stretch",
                    p.papel === "REU" ? "bg-rose-400"
                      : p.papel === "CORREU" ? "bg-amber-400"
                      : p.papel === "VITIMA" ? "bg-blue-400"
                      : "bg-zinc-300 dark:bg-zinc-600"
                  )} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-mono text-zinc-700 dark:text-zinc-300 truncate">{p.numeroAutos ?? "Sem número"}</span>
                      <div className="flex items-center gap-1 shrink-0">
                        <span className={cn(
                          "text-[9px] px-1.5 py-0.5 rounded-full font-semibold",
                          p.papel === "REU" ? "bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400"
                            : p.papel === "CORREU" ? "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400"
                            : p.papel === "VITIMA" ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400"
                            : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
                        )}>
                          {p.papel?.toLowerCase() ?? "réu"}
                        </span>
                        <Button
                          variant="ghost" size="sm"
                          className="h-5 w-5 p-0 text-zinc-400 hover:text-violet-600 transition-colors"
                          title="Exportar briefing deste processo para Cowork"
                          disabled={exportingProcessoId === p.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            setExportingProcessoId(p.id);
                            exportarParaCowork.mutate(
                              { assistidoId: Number(id), processoId: p.id, tipo: "processo" },
                              { onSettled: () => setExportingProcessoId(null) }
                            );
                          }}
                        >
                          {exportingProcessoId === p.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Bot className="h-3 w-3" />}
                        </Button>
                        <Button
                          variant="ghost" size="sm"
                          className="h-5 w-5 p-0 text-zinc-400 hover:text-emerald-600 transition-colors"
                          title="Importar análise IA deste processo do Cowork"
                          disabled={importingProcessoId === p.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            setImportingProcessoId(p.id);
                            importarAnaliseCowork.mutate(
                              { assistidoId: Number(id), processoId: p.id },
                              { onSettled: () => setImportingProcessoId(null) }
                            );
                          }}
                        >
                          {importingProcessoId === p.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Download className="h-3 w-3" />}
                        </Button>
                        <Button
                          variant="ghost" size="sm"
                          className="h-5 w-5 p-0 text-zinc-400 hover:text-amber-500 transition-colors"
                          title="Análise profunda (Sonnet) — teses, quesitos, estratégia"
                          disabled={sonnetProcessoId === p.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSonnetProcessoId(p.id);
                            analiseProfunda.mutate(
                              { processoId: p.id, assistidoId: Number(id) },
                              { onSettled: () => setSonnetProcessoId(null) }
                            );
                          }}
                        >
                          {sonnetProcessoId === p.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Zap className="h-3 w-3" />}
                        </Button>
                      </div>
                    </div>
                    {p.assunto && <p className="text-[11px] font-medium text-zinc-600 dark:text-zinc-300 mt-0.5 truncate">{p.assunto}</p>}
                    {p.vara && <p className="text-[10px] text-zinc-400 mt-0.5 truncate">{p.vara}</p>}
                  </div>
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
              data.demandas.map((d) => {
                const isUrgente = d.status === "2_ATENDER";
                const isConcluido = d.status === "CONCLUIDO";
                const prazoVencido = d.prazo && new Date(d.prazo) < new Date();
                return (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => {
                      setSelectedDemandaId(d.id);
                      setSelectedProcessoId(null);
                      setItemSheetType("demanda");
                      setItemSheetOpen(true);
                    }}
                    className="w-full text-left"
                  >
                    <div className="flex gap-3 border border-zinc-100 dark:border-zinc-700 rounded-lg px-3 py-2.5 hover:border-emerald-300 hover:bg-emerald-50/30 dark:hover:bg-emerald-900/10 cursor-pointer transition-all overflow-hidden">
                      {/* Left accent */}
                      <div className={cn(
                        "w-0.5 rounded-full shrink-0 self-stretch",
                        isUrgente ? "bg-rose-400"
                          : prazoVencido ? "bg-rose-300"
                          : isConcluido ? "bg-emerald-400"
                          : "bg-zinc-200 dark:bg-zinc-600"
                      )} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-[11px] font-medium text-zinc-700 dark:text-zinc-300 truncate">{d.ato ?? d.tipoAto ?? "Demanda"}</p>
                          <span className={cn(
                            "text-[9px] px-1.5 py-0.5 rounded-full font-semibold shrink-0",
                            isUrgente ? "bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400"
                              : isConcluido ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400"
                              : d.status === "5_FILA" ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-500"
                              : "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400"
                          )}>
                            {d.status?.replace(/^\d+_/, "") ?? "—"}
                          </span>
                          {d.processoId && (
                            <Button
                              variant="ghost" size="sm"
                              className="h-5 w-5 p-0 text-zinc-400 hover:text-amber-500 transition-colors"
                              title="Análise profunda (Sonnet) — teses, quesitos, estratégia"
                              disabled={sonnetProcessoId === d.processoId}
                              onClick={(e) => {
                                e.stopPropagation();
                                setSonnetProcessoId(d.processoId!);
                                analiseProfunda.mutate(
                                  { processoId: d.processoId!, assistidoId: Number(id) },
                                  { onSettled: () => setSonnetProcessoId(null) }
                                );
                              }}
                            >
                              {sonnetProcessoId === d.processoId ? <Loader2 className="h-3 w-3 animate-spin" /> : <Zap className="h-3 w-3" />}
                            </Button>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          {d.prazo && (
                            <span className={cn(
                              "text-[9px] font-mono tabular-nums",
                              prazoVencido ? "text-rose-500 dark:text-rose-400" : "text-zinc-400"
                            )}>
                              {format(new Date(d.prazo), "dd/MM/yy", { locale: ptBR })}
                            </span>
                          )}
                          {d.defensorNome && (
                            <span className="text-[9px] text-zinc-400 truncate">{d.defensorNome}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        )}

        {tab === "drive" && (
          <DriveTabEnhanced
            files={data.driveFiles}
            assistidoId={Number(id)}
            driveFolderId={data.driveFolderId}
            atribuicaoPrimaria={data.atribuicaoPrimaria}
          />
        )}

        {tab === "audiencias" && (
          <div className="space-y-2">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Audiências</h2>
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
                <div key={a.id} className="border border-zinc-200 dark:border-zinc-700 rounded-lg p-3 hover:border-zinc-300 dark:hover:border-zinc-600 transition-colors">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-medium text-zinc-700 dark:text-zinc-300 flex-1 truncate">{a.tipo ?? "Audiência"}</span>
                    <span className={cn(
                      "text-[10px] px-1.5 py-0.5 rounded-full shrink-0",
                      a.dataAudiencia && new Date(a.dataAudiencia) < new Date()
                        ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-500"
                        : "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400"
                    )}>
                      {a.dataAudiencia && new Date(a.dataAudiencia) < new Date() ? "Realizada" : "Futura"}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 text-zinc-400 hover:text-violet-600 shrink-0 transition-colors"
                      title="Exportar briefing desta audiência para Cowork"
                      disabled={exportingAudienciaId === a.id}
                      onClick={() => {
                        setExportingAudienciaId(a.id);
                        exportarParaCowork.mutate({ assistidoId: Number(id), audienciaId: a.id, tipo: "audiencia" });
                      }}
                    >
                      {exportingAudienciaId === a.id
                        ? <Loader2 className="h-3 w-3 animate-spin" />
                        : <Bot className="h-3 w-3" />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 text-zinc-400 hover:text-emerald-600 shrink-0 transition-colors"
                      title="Importar análise IA desta audiência do Cowork"
                      disabled={importingAudienciaId === a.id}
                      onClick={() => {
                        setImportingAudienciaId(a.id);
                        importarAnaliseCowork.mutate(
                          { assistidoId: Number(id), audienciaId: a.id, processoId: a.processoId ?? undefined },
                          { onSettled: () => setImportingAudienciaId(null) }
                        );
                      }}
                    >
                      {importingAudienciaId === a.id
                        ? <Loader2 className="h-3 w-3 animate-spin" />
                        : <Download className="h-3 w-3" />}
                    </Button>
                    {a.processoId && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 text-zinc-400 hover:text-amber-500 shrink-0 transition-colors"
                        title="Análise profunda (Sonnet) — teses, quesitos, estratégia"
                        disabled={sonnetProcessoId === a.processoId}
                        onClick={() => {
                          setSonnetProcessoId(a.processoId!);
                          analiseProfunda.mutate(
                            { processoId: a.processoId!, assistidoId: Number(id) },
                            { onSettled: () => setSonnetProcessoId(null) }
                          );
                        }}
                      >
                        {sonnetProcessoId === a.processoId ? <Loader2 className="h-3 w-3 animate-spin" /> : <Zap className="h-3 w-3" />}
                      </Button>
                    )}
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

      {/* Item Detail Sheet — processos e demandas */}
      <ItemDetailSheet
        open={itemSheetOpen}
        onOpenChange={(open) => {
          setItemSheetOpen(open);
          if (!open) {
            setItemSheetType(null);
            setSelectedProcessoId(null);
            setSelectedDemandaId(null);
          }
        }}
        type={itemSheetType}
        processo={
          itemSheetType === "processo"
            ? data.processos.find((p) => p.id === selectedProcessoId) ?? null
            : null
        }
        demanda={
          itemSheetType === "demanda"
            ? data.demandas.find((d) => d.id === selectedDemandaId) ?? null
            : null
        }
        processoDemandas={
          itemSheetType === "processo" && selectedProcessoId != null
            ? data.demandas.filter((d) => d.processoId === selectedProcessoId)
            : []
        }
        processoAudiencias={
          itemSheetType === "processo" && selectedProcessoId != null
            ? data.audiencias.filter((a) => a.processoId === selectedProcessoId)
            : []
        }
      />

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
          updatedAt: data.updatedAt,
        }}
        onExportarSolar={() => exportarViaSigad.mutate({ assistidoId: Number(id) })}
        onSyncSolar={() => sincronizarComSolar.mutate({ assistidoId: Number(id) })}
        onAnalisarIA={async () => {
          setIsAnalyzing(true);
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
            await res.json();
            toast.success("Análise da pasta concluída");
            utils.assistidos.getById.invalidate({ id: Number(id) });
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
        analysisData={data.analysisData as Parameters<typeof AssistidoFichaSheet>[0]["analysisData"]}
        analysisStatus={data.analysisStatus}
      />
    </div>
  );
}
