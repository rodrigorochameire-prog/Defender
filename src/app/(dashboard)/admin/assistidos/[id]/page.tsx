"use client";

import { use, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc/client";
import { ArrowLeft, User, ClipboardList, Plus, Sparkles, Pencil, Clock, Send, Gavel, Calendar, HardDrive, ContactRound, ChevronDown, Brain, MoreHorizontal, FileText } from "lucide-react";
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
import { AnaliseButton } from "./_components/analise-button";
import { PromptorioModal } from "./_components/promptorio-modal";
import { AnaliseTab } from "./_components/analise-tab";
import { CaseFilter } from "./_components/case-filter";

const PRESOS = ["CADEIA_PUBLICA", "PENITENCIARIA", "COP", "HOSPITAL_CUSTODIA"] as const;

type Tab = "processos" | "demandas" | "drive" | "audiencias" | "midias" | "timeline" | "oficios" | "analise" | "investigacao" | "radar";

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

  // Promptório modal state
  const [promptorioOpen, setPromptorioOpen] = useState(false);

  // Case filter state
  const [selectedCaseId, setSelectedCaseId] = useState<number | null>(null);

  const utils = trpc.useUtils();



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
      <div className="p-6 text-center text-muted-foreground">
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

  const tabs: { key: Tab; label: string; icon: React.ElementType; count?: number; urgency?: "red" | "amber" }[] = [
    { key: "processos", label: "Processos", icon: Gavel, count: data.processos.length },
    { key: "analise", label: "Análise", icon: Sparkles },
    {
      key: "demandas",
      label: "Demandas",
      icon: ClipboardList,
      count: data.demandas.length,
      urgency: data.demandas.some(d =>
        d.status === "URGENTE" || (d.prazo && new Date(d.prazo) < new Date())
      ) ? "red" : data.demandas.some(d => d.status === "2_ATENDER") ? "amber" : undefined
    },
    { key: "audiencias", label: "Audiências", icon: Calendar, count: data.audiencias.length },
    { key: "drive", label: "Drive", icon: HardDrive, count: data.driveFiles.length },
    { key: "midias", label: "Mídias", icon: Clock, count: mediaFiles.length },
    { key: "oficios", label: "Ofícios", icon: Send, count: oficiosData?.total ?? 0 },
    { key: "investigacao", label: "Investigação", icon: Brain },
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
      {/* ── Header: Identity (compact) ── */}
      <div className="mx-4 lg:mx-6 mt-4 px-5 pt-5 pb-4 rounded-xl bg-white dark:bg-zinc-900 shadow-md dark:shadow-zinc-950/50 ring-1 ring-zinc-100 dark:ring-zinc-800/50">
        {/* Row 1: Back + Avatar + Name + Actions */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>

          {/* Avatar */}
          {(() => {
            const colors = getAtribuicaoColors((data as any).atribuicaoPrimaria);
            const initials = data.nome.split(" ").filter(Boolean).slice(0, 2).map(w => w[0]).join("").toUpperCase();
            return (
              <div className="relative shrink-0">
                <div
                  onClick={() => setFichaSheetOpen(true)}
                  className={cn(
                    "h-12 w-12 rounded-xl flex items-center justify-center text-white font-bold text-base cursor-pointer hover:scale-105 transition-transform",
                    colors.bgSolid || "bg-emerald-500"
                  )}
                >
                  {initials || <User className="h-5 w-5" />}
                </div>
                {isPreso && (
                  <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-red-500 border-2 border-white dark:border-zinc-900" />
                )}
              </div>
            );
          })()}

          {/* Name + Meta — style C+A: name+chip same line, meta below, with breathing room */}
          <div className="flex-1 min-w-0">
            {/* Line 1: Name + badge + status + edit */}
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="font-serif text-lg font-semibold tracking-tight text-foreground truncate">
                {data.nome}
              </h1>
              <Link href={`/admin/assistidos/${data.id}/editar`}>
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-muted-foreground/30 hover:text-emerald-600">
                  <Pencil className="h-3 w-3" />
                </Button>
              </Link>
              <span className="w-px h-4 bg-zinc-200/70 dark:bg-zinc-700/70" />
              {(data as any).atribuicaoPrimaria && (
                <span className={cn(
                  "text-[11px] px-2 py-0.5 rounded-md font-medium",
                  getAtribuicaoColors((data as any).atribuicaoPrimaria).bg,
                  getAtribuicaoColors((data as any).atribuicaoPrimaria).text
                )}>
                  {getAtribuicaoColors((data as any).atribuicaoPrimaria).shortLabel || getAtribuicaoColors((data as any).atribuicaoPrimaria).label || (data as any).atribuicaoPrimaria}
                </span>
              )}
              {data.statusPrisional && !isPreso && (
                <span className="text-[11px] px-1.5 py-0.5 rounded-md font-medium bg-muted text-muted-foreground">
                  {statusLabel[data.statusPrisional] ?? data.statusPrisional.toLowerCase()}
                </span>
              )}
            </div>

            {/* Line 2: CPF + WhatsApp contacts */}
            <div className="flex items-center gap-2 mt-1 text-xs">
              {data.cpf && (
                <span className="text-muted-foreground font-mono tabular-nums">{data.cpf}</span>
              )}
              {data.telefone && (
                <>
                  <span className="w-px h-3 bg-zinc-200 dark:bg-zinc-700" />
                  <a
                    href={`https://wa.me/55${data.telefone.replace(/\D/g, "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-muted-foreground hover:text-emerald-600 transition-colors"
                  >
                    <svg className="w-3 h-3 text-emerald-500" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                    {data.telefone}
                  </a>
                </>
              )}
              {data.telefoneContato && (
                <>
                  <span className="w-px h-3 bg-zinc-200 dark:bg-zinc-700" />
                  <a
                    href={`https://wa.me/55${data.telefoneContato.replace(/\D/g, "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-muted-foreground hover:text-emerald-600 transition-colors"
                  >
                    <svg className="w-3 h-3 text-zinc-400" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                    {data.nomeContato ? `${data.nomeContato}${data.parentescoContato ? ` (${data.parentescoContato})` : ""}` : data.telefoneContato}
                  </a>
                </>
              )}
            </div>
          </div>

          {/* Actions — right aligned */}
          <div className="flex items-center gap-2 shrink-0">
            <AnaliseButton
              assistidoId={Number(id)}
              processoId={data.processos?.[0]?.id}
            />
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-zinc-500 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-200 rounded-xl"
              onClick={() => setPromptorioOpen(true)}
            >
              Promptório
              <ChevronDown className="w-3 h-3" />
            </Button>
          </div>
        </div>

      </div>

      {/* Context Bar: Case Filter + Stats + Drive hint */}
      <div className="flex items-center gap-3 px-6 lg:px-8 py-2.5 border-b border-border/40 bg-zinc-50/50 dark:bg-zinc-900/50 overflow-x-auto">
        {/* Stats — compact inline */}
        <div className="flex items-center gap-4 text-xs text-muted-foreground shrink-0">
          <span><span className="font-semibold text-foreground">{data.processos.length}</span> proc</span>
          <span><span className="font-semibold text-foreground">{data.demandas.length}</span> dem</span>
          <span><span className="font-semibold text-foreground">{data.audiencias.length}</span> aud</span>
          <span><span className="font-semibold text-foreground">{data.driveFiles.length}</span> arq</span>
        </div>
      </div>

      {/* Case Filter — processo referência */}
      {data.processos.length > 0 && (
        <CaseFilter
          cases={data.processos.map((p, i) => {
            const attrLabel = getAtribuicaoColors((data as any).atribuicaoPrimaria).label || (data as any).atribuicaoPrimaria || "Criminal";
            const shortLabel = getAtribuicaoColors((data as any).atribuicaoPrimaria).shortLabel;
            return {
              id: p.id,
              foco: p.assunto || attrLabel,
              processoReferencia: {
                id: p.id,
                numeroAutos: p.numeroAutos,
                classeProcessual: p.assunto || undefined,
                atribuicao: shortLabel || attrLabel,
              },
              associadosCount: 0,
              color: i === 0 ? "emerald" : i === 1 ? "amber" : "rose",
            };
          })}
          selectedCaseId={selectedCaseId}
          onSelectCase={setSelectedCaseId}
        />
      )}

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

      {/* ── Tabs ── */}
      <div className="flex items-center gap-1 border-b border-border px-6 lg:px-8 overflow-x-auto">
        {tabs.map((t) => {
          const TabIcon = t.icon;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => handleSetTab(t.key)}
              className={cn(
                "flex items-center gap-2 px-4 py-3.5 text-sm font-medium border-b-2 transition-all whitespace-nowrap shrink-0",
                tab === t.key
                  ? "border-zinc-900 dark:border-zinc-100 text-foreground font-medium"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              <TabIcon className="h-4 w-4" />
              {t.label}
              {t.count !== undefined && t.count > 0 && (
                <span className={cn(
                  "text-[10px] min-w-[22px] text-center px-1.5 py-0.5 rounded-full font-medium",
                  t.urgency === "red"
                    ? "bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400"
                    : t.urgency === "amber"
                    ? "bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400"
                    : tab === t.key
                    ? "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900"
                    : "bg-muted text-muted-foreground"
                )}>
                  {t.count}
                </span>
              )}
            </button>
          );
        })}
        {/* Overflow: Timeline e Radar */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className={cn(
                "px-3 py-3.5 text-sm font-medium border-b-2 transition-all flex items-center gap-1 shrink-0",
                overflowTabs.some(t => t.key === tab)
                  ? "border-zinc-900 dark:border-zinc-100 text-foreground font-medium"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              <MoreHorizontal className="h-4 w-4" />
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
      <div className="flex-1 overflow-y-auto px-6 lg:px-8 py-6">
        {tab === "processos" && (
          <div className="space-y-2">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Processos</h2>
              <Link href={`/admin/processos/novo?assistidoId=${data.id}`}>
                <Button variant="ghost" size="sm" className="h-7 gap-1 text-[11px] text-muted-foreground hover:text-emerald-600">
                  <Plus className="h-3.5 w-3.5" />
                  Novo Processo
                </Button>
              </Link>
            </div>
            {data.processos.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Nenhum processo vinculado</p>
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
                  className="group flex gap-3 border border-border rounded-lg p-3 hover:border-emerald-300 hover:bg-emerald-50/30 dark:hover:bg-emerald-900/10 cursor-pointer transition-all overflow-hidden"
                >
                  {/* Left accent */}
                  <div className={cn(
                    "w-0.5 rounded-full shrink-0 self-stretch",
                    p.papel === "REU" ? "bg-rose-400"
                      : p.papel === "CORREU" ? "bg-amber-400"
                      : p.papel === "VITIMA" ? "bg-blue-400"
                      : "bg-muted-foreground/30"
                  )} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-mono text-foreground/80 truncate">{p.numeroAutos ?? "Sem número"}</span>
                      <span className={cn(
                        "text-[9px] px-1.5 py-0.5 rounded-full font-semibold shrink-0",
                        p.papel === "REU" ? "bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400"
                          : p.papel === "CORREU" ? "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400"
                          : p.papel === "VITIMA" ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400"
                          : "bg-muted text-muted-foreground"
                      )}>
                        {p.papel?.toLowerCase() ?? "réu"}
                      </span>
                    </div>
                    {p.assunto && <p className="text-[11px] font-medium text-foreground/80 mt-0.5 truncate">{p.assunto}</p>}
                    {p.vara && <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{p.vara}</p>}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {tab === "demandas" && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Demandas</h2>
              <Link href={`/admin/demandas/nova?assistidoId=${data.id}`}>
                <Button variant="ghost" size="sm" className="h-7 gap-1 text-[11px] text-muted-foreground hover:text-emerald-600">
                  <Plus className="h-3.5 w-3.5" />
                  Nova Demanda
                </Button>
              </Link>
            </div>
            {data.demandas.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Nenhuma demanda vinculada</p>
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
                    <div className="flex gap-3 border border-border rounded-lg px-3 py-2.5 hover:border-emerald-300 hover:bg-emerald-50/30 dark:hover:bg-emerald-900/10 cursor-pointer transition-all overflow-hidden">
                      {/* Left accent */}
                      <div className={cn(
                        "w-0.5 rounded-full shrink-0 self-stretch",
                        isUrgente ? "bg-rose-400"
                          : prazoVencido ? "bg-rose-300"
                          : isConcluido ? "bg-emerald-400"
                          : "bg-muted-foreground/30"
                      )} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-[11px] font-medium text-foreground/80 truncate">{d.ato ?? d.tipoAto ?? "Demanda"}</p>
                          <span className={cn(
                            "text-[9px] px-1.5 py-0.5 rounded-full font-semibold shrink-0",
                            isUrgente ? "bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400"
                              : isConcluido ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400"
                              : d.status === "5_FILA" ? "bg-muted text-muted-foreground"
                              : "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400"
                          )}>
                            {d.status?.replace(/^\d+_/, "") ?? "—"}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          {d.prazo && (
                            <span className={cn(
                              "text-[9px] font-mono tabular-nums",
                              prazoVencido ? "text-rose-500 dark:text-rose-400" : "text-muted-foreground"
                            )}>
                              {format(new Date(d.prazo), "dd/MM/yy", { locale: ptBR })}
                            </span>
                          )}
                          {d.defensorNome && (
                            <span className="text-[9px] text-muted-foreground truncate">{d.defensorNome}</span>
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
              <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Audiências</h2>
              <Link href={`/admin/agenda?assistidoId=${data.id}`}>
                <Button variant="ghost" size="sm" className="h-7 gap-1 text-[11px] text-muted-foreground hover:text-emerald-600">
                  <Plus className="h-3.5 w-3.5" />
                  Agendar
                </Button>
              </Link>
            </div>
            {data.audiencias.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Nenhuma audiência registrada</p>
            ) : (
              data.audiencias.map((a) => (
                <div key={a.id} className="border border-border rounded-lg p-3 hover:border-muted-foreground/30 transition-colors">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-medium text-foreground/80 flex-1 truncate">{a.tipo ?? "Audiência"}</span>
                    <span className={cn(
                      "text-[10px] px-1.5 py-0.5 rounded-full shrink-0",
                      a.dataAudiencia && new Date(a.dataAudiencia) < new Date()
                        ? "bg-muted text-muted-foreground"
                        : "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400"
                    )}>
                      {a.dataAudiencia && new Date(a.dataAudiencia) < new Date() ? "Realizada" : "Futura"}
                    </span>
                  </div>
                  {a.dataAudiencia && (
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {format(new Date(a.dataAudiencia), "dd/MM/yyyy 'às' HH'h'mm", { locale: ptBR })}
                    </p>
                  )}
                  {a.local && <p className="text-[11px] text-muted-foreground">{a.local}</p>}
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
              <p className="text-xs text-muted-foreground">
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
                <FileText className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">Nenhum oficio vinculado</p>
                <p className="text-xs text-muted-foreground/50 mt-1">
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
                  "text-muted-foreground border-border";

                return (
                  <Link
                    key={oficio.id}
                    href={`/admin/oficios/${oficio.id}`}
                    className="block p-3 rounded-lg border border-border bg-muted/50
                      hover:bg-muted hover:border-emerald-500/20 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className={`text-[9px] ${statusColor}`}>
                            {statusLabel}
                          </Badge>
                          {meta.tipoOficio && (
                            <Badge variant="outline" className="text-[9px] text-muted-foreground border-border">
                              {meta.tipoOficio}
                            </Badge>
                          )}
                          {oficio.geradoPorIA && (
                            <Sparkles className="w-3 h-3 text-violet-400" />
                          )}
                        </div>
                        <h4 className="text-sm font-medium text-foreground truncate">
                          {oficio.titulo}
                        </h4>
                        <div className="flex items-center gap-3 mt-1 text-[10px] text-muted-foreground/50">
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
        {tab === "analise" && (
          <AnaliseTab assistidoId={Number(id)} />
        )}
        {tab === "investigacao" && (
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

      {/* Promptório Modal */}
      <PromptorioModal
        open={promptorioOpen}
        onOpenChange={setPromptorioOpen}
        assistidoNome={data.nome}
        processoNumero={data.processos?.[0]?.numeroAutos ?? undefined}
        classeProcessual={(data.processos?.[0] as any)?.classeProcessual ?? undefined}
        vara={data.processos?.[0]?.vara ?? undefined}
        atribuicao={(data as any).atribuicaoPrimaria ?? undefined}
        comarca={(data.processos?.[0] as any)?.comarca ?? undefined}
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
