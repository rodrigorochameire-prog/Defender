"use client";

import { use, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc/client";
import { ArrowLeft, User, ClipboardList, Plus, Sparkles, Pencil, Clock, Send, Calendar, HardDrive, ContactRound, ChevronDown, Brain, MoreHorizontal, FileText, FolderOpen, AlertCircle, Scale, History, NotebookPen } from "lucide-react";
import { getAtribuicaoColors } from "@/lib/config/atribuicoes";
import { HEADER_STYLE, LIST_ITEM } from "@/lib/config/design-tokens";
import { CollapsiblePageHeader } from "@/components/layouts/collapsible-page-header";
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
// DriveStatusBar absorbed into header card
import { DriveTabEnhanced } from "@/components/drive/DriveTabEnhanced";
import { IndexedFilesSection } from "@/components/drive/IndexedFilesSection";
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
import { CasoBar } from "@/components/processo/caso-bar";
import { AtendimentosTab } from "@/components/atendimentos/atendimentos-tab";
import { ProcessoTab } from "@/components/processo/ProcessoTab";
import { AssistidoHistoricoView } from "@/components/assistido/assistido-historico-view";
import { RegistrosTimeline } from "@/components/registros/registros-timeline";
import { NovoRegistroButton } from "@/components/registros/novo-registro-button";
// CaseFilter absorbed into header card

const PRESOS = ["CADEIA_PUBLICA", "PENITENCIARIA", "COP", "HOSPITAL_CUSTODIA"] as const;

type Tab = "demandas" | "drive" | "audiencias" | "atendimentos" | "midias" | "timeline" | "oficios" | "analise" | "investigacao" | "radar" | "processo" | "historico" | "registros";

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
    if (typeof window === "undefined") return "demandas";
    return (localStorage.getItem(`assistido-tab-${id}`) as Tab) ?? "demandas";
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
  // Case selection managed inline in header

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

  // Próxima audiência + demanda crítica (para chips no header)
  const nowDate = new Date();
  const proximaAudiencia = [...data.audiencias]
    .filter(a => a.dataAudiencia && new Date(a.dataAudiencia) > nowDate)
    .sort((a, b) => new Date(a.dataAudiencia!).getTime() - new Date(b.dataAudiencia!).getTime())[0] ?? null;

  const DEMANDA_EXCLUDED = new Set(["7_PROTOCOLADO", "CONCLUIDO", "ARQUIVADO", "7_CIENCIA", "7_SEM_ATUACAO"]);
  const DEMANDA_PRIORIDADE: Record<string, number> = {
    URGENTE: 1, "2_ATENDER": 2, "4_MONITORAR": 3, "5_TRIAGEM": 4,
  };
  const demandaCritica = [...data.demandas]
    .filter(d => d.status && !DEMANDA_EXCLUDED.has(d.status))
    .sort((a, b) => (DEMANDA_PRIORIDADE[a.status ?? ""] ?? 99) - (DEMANDA_PRIORIDADE[b.status ?? ""] ?? 99))[0] ?? null;

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
    { key: "processo", label: "Processo", icon: Scale },
    { key: "atendimentos", label: "Atendimentos", icon: ContactRound },
    { key: "registros", label: "Registros", icon: NotebookPen },
    { key: "historico", label: "Histórico", icon: History },
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
      <CollapsiblePageHeader
        title={data.nome}
        icon={User}
        bottomRow={
          <div className="space-y-2">
            {/* Row 2: CPF + Telefone + WhatsApp — with labels */}
            <div className="flex items-center gap-3 text-[11px] flex-wrap">
              {/* CPF */}
              {data.cpf && (
                <div className="flex items-center gap-1.5">
                  <span className="text-white/30 text-[9px] uppercase tracking-wider">CPF</span>
                  <span className="text-white/80 font-mono tracking-wide">{data.cpf}</span>
                </div>
              )}
              {data.cpf && (data.telefone || data.telefoneContato) && (
                <span className="w-[1.5px] h-3.5 bg-white/15 rounded-full" />
              )}
              {data.telefone && (
                <div className="flex items-center gap-1.5">
                  <span className="text-white/30 text-[9px] uppercase tracking-wider">Tel</span>
                  <a
                    href={`https://wa.me/55${data.telefone.replace(/\D/g, "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-white/70 hover:text-white transition-colors"
                    title="Abrir WhatsApp"
                  >
                    <svg className="w-3 h-3 text-emerald-400" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                    {data.telefone}
                  </a>
                </div>
              )}
              {data.telefoneContato && (data.telefone || data.cpf) && (
                <span className="w-[1.5px] h-3.5 bg-white/15 rounded-full" />
              )}
              {data.telefoneContato && (
                <div className="flex items-center gap-1.5">
                  <span className="text-white/30 text-[9px] uppercase tracking-wider">
                    {data.parentescoContato || "Contato"}
                  </span>
                  <a
                    href={`https://wa.me/55${data.telefoneContato.replace(/\D/g, "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-white/60 hover:text-white transition-colors"
                    title={`WhatsApp ${data.nomeContato || "Contato"}`}
                  >
                    <svg className="w-3 h-3 text-white/40" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                    {data.nomeContato ? `${data.nomeContato}` : data.telefoneContato}
                  </a>
                </div>
              )}
            </div>

            {/* Case grouping — one bar per caso */}
            {(data as any).casosAgrupados?.length > 0 ? (
              (data as any).casosAgrupados.map((caso: any) => (
                <CasoBar
                  key={caso.id}
                  casoTitulo={caso.titulo}
                  currentProcessoId={-1}
                  processos={caso.processos.map((p: any) => ({
                    id: p.id,
                    numeroAutos: p.numeroAutos,
                    tipoProcesso: p.tipoProcesso,
                    isReferencia: p.isReferencia,
                    processoOrigemId: p.processoOrigemId,
                    ativo: p.isDoProprio ? p.ativo : null,
                  }))}
                  stats={{
                    demandas: data.demandas.length,
                    audiencias: data.audiencias.length,
                    arquivos: data.driveFiles.length,
                  }}
                  showCreateButton
                />
              ))
            ) : (
              <div className="space-y-1.5">
                {(() => {
                  const procs = data.processos as { id: number; numeroAutos?: string | null; tipoProcesso?: string | null; isReferencia?: boolean | null; casoId?: number | null }[];
                  const refs = procs.filter(p => p.isReferencia);
                  const associated = procs.filter(p => !p.isReferencia);
                  const main = refs.length > 0 ? refs : procs;
                  const extras = refs.length > 0 ? associated : [];

                  return main.map((proc) => {
                    const relatedCount = extras.filter(e => e.casoId && e.casoId === proc.casoId).length
                      || (refs.length === 0 ? 0 : extras.length);
                    return (
                      <div key={proc.id} className="flex items-center gap-3 flex-wrap">
                        <Link
                          href={`/admin/processos/${proc.id}`}
                          className="flex items-center gap-2 hover:text-white transition-colors"
                        >
                          <ClipboardList className="w-3.5 h-3.5 text-white/40" />
                          <span className="text-[12px] font-mono text-white/80 tracking-wide">
                            {proc.numeroAutos || "Sem número"}
                          </span>
                        </Link>
                        {proc.tipoProcesso && (
                          <>
                            <span className="w-px h-3.5 bg-white/15" />
                            <span className="text-[10px] uppercase tracking-wider text-white/30 font-medium">
                              {proc.tipoProcesso.replace(/_/g, " ")}
                            </span>
                          </>
                        )}
                        {relatedCount > 0 && (
                          <>
                            <span className="w-px h-3.5 bg-white/15" />
                            <span className="text-[10px] text-white/30">
                              +{relatedCount} {relatedCount === 1 ? "processo associado" : "processos associados"}
                            </span>
                          </>
                        )}
                        <span className="w-px h-3.5 bg-white/15" />
                        <div className="flex items-center gap-3 text-[11px] text-white/30">
                          <span><span className="font-semibold text-white/50">{data.demandas.length}</span> dem</span>
                          <span><span className="font-semibold text-white/50">{data.audiencias.length}</span> aud</span>
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            )}

            {/* Chips sutis: próxima audiência + demanda crítica */}
            {(proximaAudiencia || demandaCritica) && (
              <div className="flex items-center gap-2 flex-wrap pt-0.5">
                {proximaAudiencia && (
                  <div className="inline-flex items-center gap-1.5 bg-white/[0.04] border border-white/10 rounded-md px-2 py-1 text-[11px]">
                    <Calendar className="w-3 h-3 text-white/40" />
                    <span className="text-white/40 uppercase tracking-wider text-[9px] font-semibold">Próx. aud</span>
                    <span className="text-white/80 font-medium">
                      {format(new Date(proximaAudiencia.dataAudiencia!), "dd MMM", { locale: ptBR })}
                    </span>
                    {proximaAudiencia.tipo && (
                      <span className="text-white/40">· {proximaAudiencia.tipo}</span>
                    )}
                  </div>
                )}
                {demandaCritica && (
                  <button
                    onClick={() => {
                      setSelectedDemandaId(demandaCritica.id);
                      setSelectedProcessoId(null);
                      setItemSheetType("demanda");
                      setItemSheetOpen(true);
                    }}
                    className="inline-flex items-center gap-1.5 bg-white/[0.04] border border-white/10 hover:bg-white/[0.08] hover:border-white/20 rounded-md px-2 py-1 text-[11px] transition-colors cursor-pointer"
                  >
                    <AlertCircle className="w-3 h-3 text-white/40" />
                    <span className="text-white/40 uppercase tracking-wider text-[9px] font-semibold">Demanda</span>
                    <span className="text-white/80 font-medium">{demandaCritica.ato}</span>
                    <span className="text-white/30">→</span>
                  </button>
                )}
              </div>
            )}
          </div>
        }
      >
        {/* Row 1: Back + Avatar + Name + Actions */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="text-white/30 hover:text-white/70 transition-colors shrink-0"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>

          {/* Avatar — cor baseada na atribuição: única = cor da atribuição, múltiplas = preto */}
          {(() => {
            const initials = data.nome.split(" ").filter(Boolean).slice(0, 2).map(w => w[0]).join("").toUpperCase();
            // Check if assistido has processos with multiple distinct atribuições
            const atribuicoes = new Set(data.processos.map(() => (data as any).atribuicaoPrimaria).filter(Boolean));
            const hasMultiple = atribuicoes.size > 1 || data.processos.length > 1;
            const avatarBg = "bg-neutral-100 text-neutral-800";
            return (
              <div className="relative shrink-0">
                <div
                  onClick={() => setFichaSheetOpen(true)}
                  className={cn(
                    "h-12 w-12 rounded-xl flex items-center justify-center font-bold text-base cursor-pointer hover:scale-105 transition-transform",
                    avatarBg
                  )}
                >
                  {initials || <User className="h-5 w-5" />}
                </div>
                {isPreso && (
                  <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-red-500 border-2 border-[#292930]" />
                )}
              </div>
            );
          })()}

          {/* Name + Badge + Status */}
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-semibold text-white truncate">
              {data.nome}
            </h1>
            <div className="flex items-center gap-2 flex-wrap mt-1">
              <Link href={`/admin/assistidos/${data.id}/editar`}>
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-white/30 hover:text-white/80">
                  <Pencil className="h-3 w-3" />
                </Button>
              </Link>
              <span className="w-px h-4 bg-white/15" />
              {(data as any).atribuicaoPrimaria && (
                <span className="text-[10px] px-2 py-0.5 rounded-[5px] font-medium bg-emerald-600 text-white">
                  {getAtribuicaoColors((data as any).atribuicaoPrimaria).shortLabel || getAtribuicaoColors((data as any).atribuicaoPrimaria).label || (data as any).atribuicaoPrimaria}
                </span>
              )}
              {data.statusPrisional && !isPreso && (
                <span className="text-[10px] text-white/50">
                  {statusLabel[data.statusPrisional] ?? data.statusPrisional.toLowerCase()}
                </span>
              )}
            </div>
          </div>

          {/* Actions — right aligned */}
          <div className="flex items-center gap-2 shrink-0">
            <AnaliseButton
              assistidoId={Number(id)}
              processoId={data.processos?.[0]?.id}
              atribuicao={(data as any).atribuicaoPrimaria}
            />
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-white/80 border-white/20 bg-white/10 hover:bg-white/15 hover:text-white rounded-lg"
              onClick={() => setPromptorioOpen(true)}
            >
              <span className="hidden sm:inline">Promptório</span>
              <ChevronDown className="w-3 h-3" />
            </Button>
          </div>
        </div>

      </CollapsiblePageHeader>

      {/* Content container — unified card for tabs + content */}
      <div className="mx-4 lg:mx-6 mt-2 bg-white dark:bg-neutral-900/50 rounded-xl border border-neutral-200/60 dark:border-neutral-800/40 overflow-hidden flex-1 flex flex-col min-h-0">

      {/* ── Tabs (underline emerald) ── */}
      <div className="flex items-center gap-1 px-5 border-b border-zinc-200 dark:border-zinc-800 overflow-x-auto">
        {tabs.map((t) => {
          const TabIcon = t.icon;
          const isActive = tab === t.key;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => handleSetTab(t.key)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap shrink-0 -mb-px",
                isActive
                  ? "text-zinc-900 dark:text-zinc-100 border-emerald-500"
                  : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 border-transparent"
              )}
            >
              <TabIcon className="h-3.5 w-3.5" />
              {t.label}
              {t.count !== undefined && t.count > 0 && (
                <span className={cn(
                  "text-[10px] min-w-[18px] text-center px-1.5 py-0.5 rounded-md font-medium",
                  t.urgency === "red"
                    ? "bg-rose-100 dark:bg-rose-500/20 text-rose-600 dark:text-rose-300"
                    : t.urgency === "amber"
                    ? "bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-300"
                    : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400"
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
                "px-2 py-2.5 text-sm font-medium border-b-2 transition-colors flex items-center gap-1 shrink-0 -mb-px",
                overflowTabs.some(t => t.key === tab)
                  ? "text-zinc-900 dark:text-zinc-100 border-emerald-500"
                  : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 border-transparent"
              )}
            >
              <MoreHorizontal className="h-3.5 w-3.5" />
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
      <div className="flex-1 overflow-y-auto px-4 py-3">
        {tab === "demandas" && (
          <div className="space-y-1.5">
            <div className="flex justify-end mb-2">
              <Link href={`/admin/demandas/nova?assistidoId=${data.id}`}>
                <Button variant="ghost" size="sm" className="h-7 gap-1 text-[11px] text-muted-foreground hover:text-foreground">
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
                    <div className={cn(LIST_ITEM.container, "overflow-hidden")}>
                      <div className="flex items-center gap-1.5">
                        <ClipboardList className={LIST_ITEM.icon} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <p className={cn(LIST_ITEM.title, "truncate")}>{d.ato ?? d.tipoAto ?? "Demanda"}</p>
                            <span className={cn(
                              "text-[9px] px-1.5 py-0.5 rounded-full font-semibold shrink-0",
                              prazoVencido ? "bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400"
                                : isUrgente ? "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400"
                                : isConcluido || d.status === "7_PROTOCOLADO" ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400"
                                : d.status === "4_MONITORAR" ? "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400"
                                : d.status === "5_TRIAGEM" ? "bg-muted text-muted-foreground"
                                : "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400"
                            )}>
                              {d.status?.replace(/^\d+_/, "") ?? "—"}
                            </span>
                          </div>
                          <div className={cn("flex items-center gap-1 mt-0.5 pl-[19px]", LIST_ITEM.meta)}>
                            {d.prazo && (
                              <span className={cn(
                                "font-mono tabular-nums",
                                prazoVencido ? "text-rose-500 dark:text-rose-400" : ""
                              )}>
                                {format(new Date(d.prazo), "dd/MM/yy", { locale: ptBR })}
                              </span>
                            )}
                            {d.prazo && d.defensorNome && <span>·</span>}
                            {d.defensorNome && (
                              <span className="truncate">{d.defensorNome}</span>
                            )}
                          </div>
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
          <div className="space-y-6">
            <DriveTabEnhanced
              files={data.driveFiles}
              assistidoId={Number(id)}
              driveFolderId={data.driveFolderId}
              atribuicaoPrimaria={data.atribuicaoPrimaria}
            />
            <IndexedFilesSection assistidoId={Number(id)} />
          </div>
        )}

        {tab === "processo" && (
          <div className="flex-1 min-h-0 overflow-hidden">
            <ProcessoTab
              assistidoId={Number(id)}
              processos={data.processos.map((p) => ({
                id: p.id,
                numeroAutos: p.numeroAutos,
                tipoProcesso: p.tipoProcesso,
                isReferencia: p.isReferencia,
              }))}
            />
          </div>
        )}

        {tab === "audiencias" && (
          <div className="space-y-2">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Audiências</h2>
              <Link href={`/admin/agenda?assistidoId=${data.id}`}>
                <Button variant="ghost" size="sm" className="h-7 gap-1 text-[11px] text-muted-foreground hover:text-foreground">
                  <Plus className="h-3.5 w-3.5" />
                  Agendar
                </Button>
              </Link>
            </div>
            {data.audiencias.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Nenhuma audiência registrada</p>
            ) : (
              data.audiencias.map((a) => {
                const isPast = a.dataAudiencia && new Date(a.dataAudiencia) < new Date();
                const statusLabel = (a as any).status === "adiada" ? "Adiada" : isPast ? "Realizada" : "Agendada";
                const statusColor = (a as any).status === "adiada"
                  ? "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400"
                  : isPast
                  ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400"
                  : "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400";
                return (
                  <div key={a.id} className={LIST_ITEM.container}>
                    <div className="flex items-center gap-1.5">
                      <Calendar className={LIST_ITEM.icon} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className={cn(LIST_ITEM.title, "truncate")}>{a.tipo ?? "Audiência"}</span>
                          <span className={cn("text-[9px] px-1.5 py-0.5 rounded-full font-semibold shrink-0", statusColor)}>
                            {statusLabel}
                          </span>
                        </div>
                        <div className={cn("flex items-center gap-1 mt-0.5 pl-[19px]", LIST_ITEM.meta)}>
                          {a.dataAudiencia && (
                            <span className="font-mono tabular-nums">
                              {format(new Date(a.dataAudiencia), "dd/MM/yyyy 'às' HH'h'mm", { locale: ptBR })}
                            </span>
                          )}
                          {a.dataAudiencia && a.local && <span>·</span>}
                          {a.local && <span className="truncate">{a.local}</span>}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {tab === "atendimentos" && (
          <AtendimentosTab
            assistidoId={Number(id)}
            processoIdAtivo={data.processos?.[0]?.id}
            assistidoNome={data.nome}
            processos={data.processos.map(p => ({ id: p.id, numeroAutos: p.numeroAutos ?? "" }))}
          />
        )}

        {tab === "historico" && (
          <AssistidoHistoricoView assistidoId={Number(id)} />
        )}

        {tab === "registros" && (
          <div className="space-y-3">
            <NovoRegistroButton
              assistidoId={Number(id)}
              tipoDefault="atendimento"
            />
            <RegistrosTimeline
              assistidoId={Number(id)}
              emptyHint="Sem registros para este assistido."
            />
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
                className="h-7 text-xs bg-neutral-800 hover:bg-neutral-700 text-white"
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
                    className={cn("block", LIST_ITEM.container)}
                  >
                    <div className="flex items-center gap-1.5">
                      <FileText className={LIST_ITEM.icon} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className={cn(LIST_ITEM.title, "truncate")}>{oficio.titulo}</span>
                            {oficio.geradoPorIA && (
                              <Sparkles className="w-3 h-3 text-violet-400 shrink-0" />
                            )}
                          </div>
                          <Badge variant="outline" className={cn("text-[9px] shrink-0", statusColor)}>
                            {statusLabel}
                          </Badge>
                        </div>
                        <div className={cn("flex items-center gap-1 mt-0.5 pl-[19px] flex-wrap", LIST_ITEM.meta)}>
                          {oficio.processoNumero && (
                            <span className="font-mono">{oficio.processoNumero}</span>
                          )}
                          {oficio.processoNumero && meta.tipoOficio && <span>·</span>}
                          {meta.tipoOficio && (
                            <span>{meta.tipoOficio}</span>
                          )}
                          {(oficio.processoNumero || meta.tipoOficio) && <span>·</span>}
                          <span>{new Date(oficio.updatedAt).toLocaleDateString("pt-BR")}</span>
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
            />
          </div>
        )}
        {tab === "radar" && (
          <div className="space-y-4">
            <RadarAssistidoCard assistidoId={Number(id)} />
          </div>
        )}
      </div>

      </div>{/* end content container */}

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
