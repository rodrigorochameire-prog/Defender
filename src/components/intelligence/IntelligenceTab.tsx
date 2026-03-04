"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";
import {
  Brain,
  Loader2,
  RefreshCw,
  Users,
  FileText,
  Calendar,
  Shield,
  Network,
  Sparkles,
  AlertCircle,
  BarChart3,
} from "lucide-react";
import { toast } from "sonner";
import { IntelligenceOverview } from "./IntelligenceOverview";
import { IntelligencePersonas } from "./IntelligencePersonas";
import { IntelligenceFacts } from "./IntelligenceFacts";
import { IntelligenceTimeline } from "./IntelligenceTimeline";
import { IntelligenceDefense } from "./IntelligenceDefense";
import { IntelligenceDiagram } from "./IntelligenceDiagram";
import { IntelligenceCrossAnalysis } from "./IntelligenceCrossAnalysis";

// ─────────────────────────────────────────────────────────────
// KPI Card
// ─────────────────────────────────────────────────────────────

interface KpiCardProps {
  label: string;
  value: number;
  icon: React.ElementType;
  color: string;
}

function KpiCard({ label, value, icon: Icon, color }: KpiCardProps) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800">
      <Icon className={cn("h-4 w-4 shrink-0", color)} />
      <div className="min-w-0">
        <p className="text-lg font-bold tabular-nums text-zinc-900 dark:text-zinc-50 leading-none">
          {value}
        </p>
        <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-0.5">
          {label}
        </p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Sub-tab type
// ─────────────────────────────────────────────────────────────

type SubTab =
  | "overview"
  | "personas"
  | "facts"
  | "cross"
  | "timeline"
  | "defense"
  | "diagram";

const SUB_TABS: { key: SubTab; label: string; icon: React.ElementType }[] = [
  { key: "overview", label: "Visao Geral", icon: BarChart3 },
  { key: "personas", label: "Pessoas", icon: Users },
  { key: "facts", label: "Fatos", icon: FileText },
  { key: "cross", label: "Cruzamento", icon: AlertCircle },
  { key: "timeline", label: "Cronologia", icon: Calendar },
  { key: "defense", label: "Defesa", icon: Shield },
  { key: "diagram", label: "Diagrama", icon: Network },
];

// ─────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────

interface IntelligenceTabProps {
  assistidoId?: number;
  processoId?: number;
  casoId?: number | null;
}

export function IntelligenceTab({
  assistidoId,
  processoId,
  casoId,
}: IntelligenceTabProps) {
  const [subTab, setSubTab] = useState<SubTab>("overview");

  // Queries
  const isAssistido = !!assistidoId;

  const analysisQuery = isAssistido
    ? trpc.intelligence.getForAssistido.useQuery(
        { assistidoId: assistidoId! },
        { staleTime: 30_000 },
      )
    : trpc.intelligence.getForProcesso.useQuery(
        { processoId: processoId! },
        { staleTime: 30_000 },
      );

  const pendingQuery = trpc.intelligence.getPendingEnrichments.useQuery(
    isAssistido ? { assistidoId } : { processoId },
    { staleTime: 30_000 },
  );

  // Mutations
  const generateAssistido =
    trpc.intelligence.generateForAssistido.useMutation({
      onSuccess: (result) => {
        if (result.success) {
          toast.success(
            `Analise concluida: ${result.totalPersonas} pessoas, ${result.totalFacts} fatos`,
          );
          analysisQuery.refetch();
          pendingQuery.refetch();
        } else {
          toast.error(result.error || "Erro na analise");
        }
      },
      onError: (err) => toast.error(err.message),
    });

  const generateProcesso =
    trpc.intelligence.generateForProcesso.useMutation({
      onSuccess: (result) => {
        if (result.success) {
          toast.success(
            `Analise concluida: ${result.totalPersonas} pessoas, ${result.totalFacts} fatos`,
          );
          analysisQuery.refetch();
          pendingQuery.refetch();
        } else {
          toast.error(result.error || "Erro na analise");
        }
      },
      onError: (err) => toast.error(err.message),
    });

  const isGenerating =
    generateAssistido.isPending || generateProcesso.isPending;

  function handleGenerate() {
    if (isAssistido) {
      generateAssistido.mutate({ assistidoId: assistidoId! });
    } else {
      generateProcesso.mutate({ processoId: processoId! });
    }
  }

  // Loading state
  if (analysisQuery.isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 text-zinc-400 animate-spin" />
      </div>
    );
  }

  const data = analysisQuery.data;
  const analysis = data?.analysis;
  const hasAnalysis =
    analysis?.status === "completed" && analysis?.data;
  const isProcessing = analysis?.status === "processing" || isGenerating;
  const isFailed = analysis?.status === "failed";
  const facts = data?.facts || [];
  const personas = data?.personas || [];
  const pending = pendingQuery.data;

  // ── State 2: Processing ──────────────────────────────────
  if (isProcessing) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
        <div className="relative mb-4">
          <Brain className="h-12 w-12 text-emerald-500" />
          <Loader2 className="h-5 w-5 text-emerald-500 animate-spin absolute -bottom-1 -right-1" />
        </div>
        <h3 className="text-lg font-semibold text-zinc-800 dark:text-zinc-200 mb-1">
          Analisando caso...
        </h3>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-sm">
          Consolidando dados de{" "}
          {pending?.enrichedDocs || 0} documentos enriquecidos.
          Isso pode levar de 30s a 2min.
        </p>
        <div className="mt-4 w-48 h-1.5 rounded-full bg-zinc-200 dark:bg-zinc-700 overflow-hidden">
          <div className="h-full bg-emerald-500 rounded-full animate-[indeterminate_1.5s_ease-in-out_infinite] w-1/3" />
        </div>
      </div>
    );
  }

  // ── State 1: Virgin / Failed ─────────────────────────────
  if (!hasAnalysis) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
        <Brain className="h-12 w-12 text-zinc-300 dark:text-zinc-600 mb-4" />
        <h3 className="text-lg font-semibold text-zinc-800 dark:text-zinc-200 mb-1">
          {isFailed ? "Analise falhou" : "Nenhuma analise gerada"}
        </h3>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-sm mb-2">
          {isFailed
            ? "Ocorreu um erro ao gerar a analise. Tente novamente."
            : "Clique para analisar os documentos e gerar dados estruturados sobre este caso."}
        </p>

        {pending && (
          <p className="text-xs text-zinc-400 dark:text-zinc-500 mb-4">
            {pending.totalDocs} arquivo{pending.totalDocs !== 1 ? "s" : ""} na
            pasta
            {pending.enrichedDocs > 0 && (
              <span>
                {" "}
                &middot;{" "}
                <span className="text-emerald-500">
                  {pending.enrichedDocs} enriquecido
                  {pending.enrichedDocs !== 1 ? "s" : ""}
                </span>
              </span>
            )}
          </p>
        )}

        {isFailed && (
          <div className="flex items-center gap-1.5 text-xs text-rose-500 mb-4">
            <AlertCircle className="h-3.5 w-3.5" />
            <span>Erro na ultima analise</span>
          </div>
        )}

        <button
          onClick={handleGenerate}
          disabled={isGenerating}
          className={cn(
            "inline-flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm transition-colors",
            "bg-emerald-600 text-white hover:bg-emerald-700",
            "disabled:opacity-50 disabled:cursor-not-allowed",
          )}
        >
          {isGenerating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4" />
          )}
          {isFailed ? "Tentar Novamente" : "Gerar Analise do Caso"}
        </button>
      </div>
    );
  }

  // ── State 3: Analysis Complete ────────────────────────────
  const analysisData = analysis.data as {
    resumo?: string;
    achadosChave?: string[];
    recomendacoes?: string[];
    inconsistencias?: string[];
    kpis?: {
      totalPessoas: number;
      totalAcusacoes: number;
      totalDocumentosAnalisados: number;
      totalEventos: number;
      totalNulidades: number;
      totalRelacoes: number;
    };
    documentosProcessados?: number;
    documentosTotal?: number;
  };

  const kpis = analysisData.kpis;

  // Filter facts by type for each sub-tab
  const eventFacts = facts.filter((f) => f.tipo === "evento");
  const defenseFacts = facts.filter(
    (f) => f.tipo === "tese" || f.tipo === "nulidade",
  );
  const teses = facts.filter((f) => f.tipo === "tese");
  const nulidades = facts.filter((f) => f.tipo === "nulidade");

  return (
    <div className="space-y-4">
      {/* KPIs Bar */}
      {kpis && (
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          <KpiCard
            label="Pessoas"
            value={kpis.totalPessoas}
            icon={Users}
            color="text-blue-500"
          />
          <KpiCard
            label="Acusacoes"
            value={kpis.totalAcusacoes}
            icon={FileText}
            color="text-violet-500"
          />
          <KpiCard
            label="Docs Analisados"
            value={kpis.totalDocumentosAnalisados}
            icon={FileText}
            color="text-emerald-500"
          />
          <KpiCard
            label="Eventos"
            value={kpis.totalEventos}
            icon={Calendar}
            color="text-cyan-500"
          />
          <KpiCard
            label="Nulidades"
            value={kpis.totalNulidades}
            icon={AlertCircle}
            color="text-rose-500"
          />
          <KpiCard
            label="Relacoes"
            value={kpis.totalRelacoes}
            icon={Network}
            color="text-amber-500"
          />
        </div>
      )}

      {/* Sub-tabs */}
      <div className="flex gap-0 border-b border-zinc-100 dark:border-zinc-800 overflow-x-auto">
        {SUB_TABS.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.key}
              onClick={() => setSubTab(t.key)}
              className={cn(
                "flex items-center gap-1 px-3 py-2 text-[11px] font-medium border-b-2 transition-colors whitespace-nowrap",
                subTab === t.key
                  ? "border-emerald-500 text-emerald-700 dark:text-emerald-400"
                  : "border-transparent text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300",
              )}
            >
              <Icon className="h-3 w-3" />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Sub-tab content */}
      <div className="min-h-[200px]">
        {subTab === "overview" && (
          <IntelligenceOverview data={analysisData} />
        )}
        {subTab === "personas" && (
          <IntelligencePersonas personas={personas} />
        )}
        {subTab === "facts" && (
          <IntelligenceFacts
            facts={facts}
            filterTypes={[
              "acusacao",
              "controverso",
              "incontroverso",
              "prova",
            ]}
          />
        )}
        {subTab === "cross" && assistidoId && (
          <IntelligenceCrossAnalysis assistidoId={assistidoId} />
        )}
        {subTab === "timeline" && (
          <IntelligenceTimeline events={eventFacts} />
        )}
        {subTab === "defense" && (
          <IntelligenceDefense teses={teses} nulidades={nulidades} />
        )}
        {subTab === "diagram" && (
          <IntelligenceDiagram
            assistidoId={assistidoId}
            processoId={processoId}
            casoId={casoId}
          />
        )}
      </div>

      {/* Footer: meta info + reanalisar */}
      <div className="flex items-center justify-between pt-2 border-t border-zinc-100 dark:border-zinc-800">
        <div className="flex items-center gap-3 text-[10px] text-zinc-400 dark:text-zinc-500">
          <span>
            v{analysis.version || 1} &middot;{" "}
            {analysis.analyzedAt
              ? new Date(analysis.analyzedAt).toLocaleString("pt-BR", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "2-digit",
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "---"}
          </span>
          <span>
            {analysisData.documentosProcessados || 0}/
            {analysisData.documentosTotal || 0} docs
          </span>
          {pending && pending.pendingCount > 0 && (
            <span className="text-amber-500 font-medium">
              {pending.pendingCount} novo
              {pending.pendingCount !== 1 ? "s" : ""} nao consolidado
              {pending.pendingCount !== 1 ? "s" : ""}
            </span>
          )}
        </div>

        <button
          onClick={handleGenerate}
          disabled={isGenerating}
          className={cn(
            "inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] font-medium transition-colors",
            "text-zinc-600 hover:text-zinc-800 bg-zinc-100 hover:bg-zinc-200",
            "dark:text-zinc-400 dark:hover:text-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700",
            "disabled:opacity-50 disabled:cursor-not-allowed",
          )}
        >
          {isGenerating ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <RefreshCw className="h-3 w-3" />
          )}
          Reanalisar
        </button>
      </div>
    </div>
  );
}
