"use client";

import { use, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc/client";
import { ArrowLeft, Lock, User, Mic, Music, Video, Loader2, Sun, ExternalLink, CheckCircle2, AlertCircle, Brain, FileText, Plus, Sparkles, Pencil, Clock, Send, Scale, Calendar, FolderOpen, ChevronDown } from "lucide-react";
import { getAtribuicaoColors } from "@/lib/config/atribuicoes";
import { cn } from "@/lib/utils";
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

const PRESOS = ["CADEIA_PUBLICA", "PENITENCIARIA", "COP", "HOSPITAL_CUSTODIA"] as const;

type Tab = "processos" | "demandas" | "drive" | "audiencias" | "midias" | "oficios" | "inteligencia";

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

  // AI Analysis state
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);

  // Transcription state
  const [transcriptions, setTranscriptions] = useState<Map<string, TranscriptionData>>(new Map());
  const [transcribing, setTranscribing] = useState<Set<string>>(new Set());
  const [transcriptViewerFile, setTranscriptViewerFile] = useState<string | null>(null);

  // Markdown viewer state (for Plaud transcriptions)
  const [markdownViewerFile, setMarkdownViewerFile] = useState<{
    name: string;
    driveFileId: string | null;
    enrichmentData: unknown;
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

  // Track files sent to background transcription — drives polling
  const [pollingFiles, setPollingFiles] = useState<Set<string>>(new Set());

  const { data, isLoading, error } = trpc.assistidos.getById.useQuery(
    { id: Number(id) },
    {
      staleTime: pollingFiles.size > 0 ? 5_000 : 60_000,
      refetchInterval: pollingFiles.size > 0 ? 5_000 : false,
    }
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

  // Stop polling when background transcription finishes (status != "processing")
  useEffect(() => {
    if (pollingFiles.size === 0 || !data?.driveFiles) return;
    const stillProcessing = new Set<string>();
    for (const fileKey of pollingFiles) {
      const file = data.driveFiles.find(
        (f) => (f.driveFileId ?? String(f.id)) === fileKey
      );
      if (file && file.enrichmentStatus === "processing") {
        stillProcessing.add(fileKey);
      } else if (file && file.enrichmentStatus === "completed") {
        toast.success(`Transcrição de "${file.name}" concluída!`);
      }
    }
    if (stillProcessing.size !== pollingFiles.size) {
      setPollingFiles(stillProcessing);
    }
  }, [data?.driveFiles, pollingFiles]);

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
      // Start polling to detect when it completes.
      setPollingFiles((prev) => new Set(prev).add(driveFileId));
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
    { key: "oficios", label: "Ofícios", count: oficiosData?.total ?? 0 },
    { key: "inteligencia", label: "Inteligência" },
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
              {isPreso && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 animate-pulse">
                  <Lock className="h-3 w-3" />
                  Preso
                </span>
              )}
            </div>
            <div className="flex items-center gap-2.5 mt-1">
              {data.cpf && (
                <span className="text-[11px] text-zinc-400 font-mono">{data.cpf}</span>
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

      {/* Solar / SIGAD Actions */}
      {data.cpf && (
        <div className="px-6 py-2.5 border-b border-zinc-100 dark:border-zinc-800 flex flex-col gap-2">
          <div className="flex items-center gap-3 flex-wrap">
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-[11px] gap-1.5 border-amber-200 text-amber-700 hover:bg-amber-50"
              disabled={exportarViaSigad.isPending}
              onClick={() => exportarViaSigad.mutate({ assistidoId: Number(id) })}
            >
              {exportarViaSigad.isPending ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Sun className="h-3 w-3" />
              )}
              {exportarViaSigad.isPending ? "Exportando ao Solar..." : "Exportar ao Solar via SIGAD"}
            </Button>

            <Button
              size="sm"
              variant="outline"
              className="h-7 text-[11px] gap-1.5 border-blue-200 text-blue-700 hover:bg-blue-50"
              disabled={sincronizarComSolar.isPending}
              onClick={() => sincronizarComSolar.mutate({ assistidoId: Number(id) })}
            >
              {sincronizarComSolar.isPending ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Sun className="h-3 w-3" />
              )}
              {sincronizarComSolar.isPending ? "Sincronizando..." : "Sync Fases ao Solar"}
            </Button>

            {data.driveFolderId && (
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-[11px] gap-1.5 border-purple-200 text-purple-600 hover:bg-purple-50"
                disabled={isAnalyzing}
                onClick={async () => {
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
              >
                {isAnalyzing ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Brain className="h-3 w-3" />
                )}
                {isAnalyzing ? "Analisando..." : "Analisar pasta com IA"}
              </Button>
            )}

            {sigadResult && (
              <div className="flex items-center gap-1.5 text-[11px]">
                {sigadResult.success ? (
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                ) : sigadResult.error === "processo_nao_corresponde" ? (
                  <AlertCircle className="h-3.5 w-3.5 text-amber-500" />
                ) : (
                  <AlertCircle className="h-3.5 w-3.5 text-rose-500" />
                )}
                <span
                  className={
                    sigadResult.success
                      ? "text-emerald-700"
                      : sigadResult.error === "processo_nao_corresponde"
                      ? "text-amber-700"
                      : "text-rose-600"
                  }
                >
                  {sigadResult.ja_existia_solar
                    ? "Já cadastrado no Solar"
                    : sigadResult.success
                    ? "Exportado ao Solar"
                    : sigadResult.error === "cpf_ausente"
                    ? "Sem CPF no SIGAD"
                    : sigadResult.error === "nao_encontrado"
                    ? "Não encontrado no SIGAD"
                    : sigadResult.error === "processo_nao_corresponde"
                    ? `Processo SIGAD não corresponde: ${sigadResult.sigad_processo ?? "desconhecido"}`
                    : "Erro ao exportar"}
                </span>
                {sigadResult.solar_url && (
                  <a
                    href={sigadResult.solar_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-0.5 text-amber-600 hover:underline ml-1"
                  >
                    Ver no Solar <ExternalLink className="h-2.5 w-2.5" />
                  </a>
                )}
              </div>
            )}
          </div>

          {/* Resultado do Sync Solar */}
          {syncSolarResult && (
            <div className={cn(
              "flex items-center gap-1.5 text-[11px] rounded px-2 py-1 w-fit",
              syncSolarResult.fases_criadas > 0
                ? "text-blue-700 bg-blue-50 dark:bg-blue-950"
                : syncSolarResult.fases_falhadas > 0
                ? "text-amber-700 bg-amber-50 dark:bg-amber-950"
                : "text-zinc-600 bg-zinc-50 dark:bg-zinc-800",
            )}>
              {syncSolarResult.fases_criadas > 0 ? (
                <CheckCircle2 className="h-3 w-3 text-blue-500 flex-shrink-0" />
              ) : syncSolarResult.fases_falhadas > 0 ? (
                <AlertCircle className="h-3 w-3 text-amber-500 flex-shrink-0" />
              ) : (
                <CheckCircle2 className="h-3 w-3 text-zinc-400 flex-shrink-0" />
              )}
              <span>
                {syncSolarResult.total === 0
                  ? "Nenhuma anotação pendente de sync"
                  : `Solar: ${syncSolarResult.fases_criadas} criadas, ${syncSolarResult.fases_skipped} já existiam, ${syncSolarResult.fases_falhadas} falharam`}
              </span>
            </div>
          )}

          {/* Badge de campos enriquecidos */}
          {sigadResult?.success && sigadResult.message?.includes("Campos enriquecidos:") && (
            <div className="flex items-center gap-1.5 text-[11px] text-emerald-700 bg-emerald-50 dark:bg-emerald-950 rounded px-2 py-1 w-fit">
              <CheckCircle2 className="h-3 w-3 text-emerald-500 flex-shrink-0" />
              <span>
                {sigadResult.message.replace(/^.*?Campos enriquecidos:/, "Dados atualizados do SIGAD:")}
              </span>
            </div>
          )}

          {/* Aviso de processo não correspondente */}
          {sigadResult?.error === "processo_nao_corresponde" && sigadResult.sigad_processo && (
            <div className="flex items-start gap-1.5 text-[11px] text-amber-700 bg-amber-50 dark:bg-amber-950 rounded px-2 py-1 w-fit max-w-sm">
              <AlertCircle className="h-3 w-3 text-amber-500 flex-shrink-0 mt-0.5" />
              <span>
                O assistido foi encontrado no SIGAD, mas o processo vinculado ({sigadResult.sigad_processo}) não
                corresponde a nenhum processo cadastrado no OMBUDS. Verifique se o número de autos está correto.
              </span>
            </div>
          )}

          {/* Resultado da Análise IA */}
          {analysisResult && (
            <div className="flex items-start gap-1.5 text-[11px] text-purple-700 bg-purple-50 dark:bg-purple-950 rounded px-2 py-1.5 w-fit max-w-lg">
              <Brain className="h-3 w-3 text-purple-500 flex-shrink-0 mt-0.5" />
              <span className="whitespace-pre-wrap">{analysisResult}</span>
            </div>
          )}
        </div>
      )}

      {/* Drive Status Bar */}
      <DriveStatusBar assistidoId={Number(id)} />

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
          <div className="space-y-2">
            {mediaFiles.length === 0 ? (
              <div className="text-center py-12">
                <Music className="h-8 w-8 mx-auto mb-2 text-zinc-300" />
                <p className="text-sm text-zinc-400">Nenhum arquivo de mídia encontrado</p>
                <p className="text-[11px] text-zinc-300 mt-1">Arquivos de áudio e vídeo do Drive aparecerão aqui</p>
              </div>
            ) : (
              mediaFiles.map((f) => {
                // Plaud transcription card
                if (f.documentType === "transcricao_plaud") {
                  return (
                    <div
                      key={f.id}
                      className="flex items-center gap-3 p-3 rounded-lg border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
                    >
                      <div className="w-10 h-10 rounded-lg bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center shrink-0">
                        <FileText className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{f.name}</p>
                        {(f.enrichmentData as any)?.summary && (
                          <p className="text-xs text-zinc-500 line-clamp-1 mt-0.5">
                            {((f.enrichmentData as any).summary as string).slice(0, 100)}...
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Badge variant="secondary" className="bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300 text-[10px]">plaud</Badge>
                        {f.enrichmentStatus === "completed" && (
                          <Badge variant="secondary" className="text-[10px]">transcrito</Badge>
                        )}
                        <Button variant="outline" size="sm" onClick={() => setMarkdownViewerFile(f)} className="gap-1.5">
                          <FileText className="w-3.5 h-3.5" />
                          Ver transcricao
                        </Button>
                      </div>
                    </div>
                  );
                }

                // Audio/video card
                const isAudio = f.mimeType?.startsWith("audio/");
                // Check both local state AND enrichmentData from DB
                // transcript may be plain text or JSON string — extract plain text
                const rawTranscript = (f.enrichmentData as Record<string, unknown> | null)?.transcript as string | undefined;
                const rawTranscriptPlain = (f.enrichmentData as Record<string, unknown> | null)?.transcript_plain as string | undefined;
                let enrichmentTranscript: string | undefined;
                if (rawTranscriptPlain && !rawTranscriptPlain.startsWith("{")) {
                  enrichmentTranscript = rawTranscriptPlain;
                } else if (rawTranscript && !rawTranscript.startsWith("{")) {
                  enrichmentTranscript = rawTranscript;
                } else if (rawTranscript) {
                  // transcript is a JSON string — try to extract plain text
                  try {
                    const parsed = JSON.parse(rawTranscript);
                    enrichmentTranscript = parsed.transcript_plain || parsed.transcript || rawTranscript;
                  } catch {
                    enrichmentTranscript = rawTranscript;
                  }
                }
                const hasEnrichmentTranscript = !!enrichmentTranscript;
                const fileKey = f.driveFileId ?? String(f.id); // Use Drive ID as key, fallback to DB id
                const isTranscribed = transcriptions.has(fileKey) || hasEnrichmentTranscript;
                const isProcessing = f.enrichmentStatus === "processing";
                const isFailed = f.enrichmentStatus === "failed";
                const isCurrentlyTranscribing = transcribing.has(fileKey) || isProcessing;

                // Merge local transcription with enrichment data
                const enrichData = f.enrichmentData as Record<string, unknown> | null;

                // Progress data from backend
                const progress = (enrichData?.progress as { step?: string; percent?: number; detail?: string } | null);
                const progressPercent = isProcessing ? (progress?.percent ?? 15) : 0;
                const progressDetail = progress?.detail ?? "Processando...";
                if (hasEnrichmentTranscript && !transcriptions.has(fileKey)) {
                  // Populate local state from DB (lazy)
                  transcriptions.set(fileKey, {
                    transcript: enrichmentTranscript,
                    speakers: (enrichData?.speakers as string[]) ?? undefined,
                    duration: (enrichData?.duration as number) ?? undefined,
                    analysis: (enrichData?.analysis as AnalysisData) ?? undefined,
                  });
                }
                const transcriptionData = transcriptions.get(fileKey);
                const hasAnalysis = !!(transcriptionData?.analysis?.resumo_defesa);

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
                          {isFailed && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 font-medium">
                              falhou
                            </span>
                          )}
                          {isTranscribed && !isProcessing && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 font-medium">
                              transcrito
                            </span>
                          )}
                          {hasAnalysis && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400 font-medium flex items-center gap-0.5">
                              <Brain className="h-2.5 w-2.5" />
                              analisado
                            </span>
                          )}
                        </div>
                        {/* Progress bar with steps */}
                        {isCurrentlyTranscribing && (
                          <div className="mt-2 space-y-1">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                                <div
                                  className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-violet-500 transition-all duration-1000 ease-out"
                                  style={{ width: `${progressPercent}%` }}
                                />
                              </div>
                              <span className="text-[9px] font-mono text-zinc-400 tabular-nums w-7 text-right shrink-0">
                                {progressPercent}%
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Loader2 className="h-2.5 w-2.5 animate-spin text-cyan-500" />
                              <span className="text-[10px] text-zinc-500 dark:text-zinc-400 truncate">
                                {progressDetail}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {isTranscribed && !isProcessing && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 text-[11px] text-violet-600 hover:text-violet-700 px-2"
                            onClick={() => setTranscriptViewerFile(fileKey)}
                          >
                            Ver transcrição
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-[11px] px-2 gap-1.5"
                          onClick={() => handleTranscribe(fileKey)}
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
          enrichmentData={markdownViewerFile.enrichmentData as any}
          webViewLink={markdownViewerFile.webViewLink || undefined}
        />
      )}
    </div>
  );
}
