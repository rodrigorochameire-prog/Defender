"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sparkles,
  Loader2,
  Clock,
  ChevronDown,
  ChevronUp,
  FileText,
  Users,
  CalendarCheck,
  AlertTriangle,
  Lightbulb,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface CaseSummaryCardProps {
  assistidoId: number;
}

/**
 * Sumário consolidado do caso — lê analysisData do assistido.
 * Mostra: status, resumo, KPIs, achados-chave, recomendações, inconsistências.
 * Oferece botão para gerar/regenerar a análise.
 */
export function CaseSummaryCard({ assistidoId }: CaseSummaryCardProps) {
  const [expanded, setExpanded] = useState(false);
  const utils = trpc.useUtils();

  const { data, isLoading } = trpc.intelligence.getForAssistido.useQuery({ assistidoId });
  const generateMutation = trpc.processo.quickSummary.useMutation({
    onSuccess: () => utils.intelligence.getForAssistido.invalidate({ assistidoId }),
  });

  if (isLoading) {
    return <Skeleton className="h-24 w-full rounded-lg" />;
  }

  const analysis = data?.analysis;
  const status = analysis?.status;
  const analysisData = (analysis?.data as Record<string, unknown>) ?? {};
  const resumo = analysisData.resumo as string | undefined;
  const achadosChave = (analysisData.achadosChave as string[]) ?? [];
  const recomendacoes = (analysisData.recomendacoes as string[]) ?? [];
  const inconsistencias = (analysisData.inconsistencias as string[]) ?? [];
  const kpis = analysisData.kpis as Record<string, number> | undefined;
  const analyzedAt = analysis?.analyzedAt;

  const isProcessing = status === "processing" || status === "queued" || generateMutation.isPending;
  const hasSummary = !!resumo;

  // Estado: nunca analisado
  if (!hasSummary && !isProcessing) {
    return (
      <div className="rounded-lg border border-dashed border-neutral-300 dark:border-neutral-700 bg-neutral-50/60 dark:bg-white/[0.02] p-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 flex items-center justify-center shrink-0">
            <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
              Sumário do caso
            </h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
              Gere uma análise consolidada com resumo, achados-chave, cronologia e teses defensivas
            </p>
          </div>
          <Button
            size="sm"
            onClick={() => generateMutation.mutate({ assistidoId })}
            disabled={generateMutation.isPending}
            className="bg-emerald-600 hover:bg-emerald-700 text-white shrink-0"
          >
            {generateMutation.isPending ? (
              <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
            ) : (
              <Sparkles className="w-3.5 h-3.5 mr-1.5" />
            )}
            Gerar análise
          </Button>
        </div>
      </div>
    );
  }

  // Estado: em processamento
  if (isProcessing) {
    return (
      <div className="rounded-lg border border-blue-200 dark:border-blue-800/50 bg-blue-50/50 dark:bg-blue-950/20 p-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center shrink-0">
            <Loader2 className="w-4 h-4 text-blue-600 dark:text-blue-400 animate-spin" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-100">
              Análise em andamento
            </h3>
            <p className="text-xs text-blue-700 dark:text-blue-300 mt-0.5">
              Consolidando documentos e gerando insights... pode levar alguns minutos
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Estado: com análise
  return (
    <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
      {/* Header — sempre visível */}
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 flex items-center justify-center shrink-0">
            <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                Sumário do caso
              </h3>
              {analyzedAt && (
                <span className="text-[10px] text-neutral-400 dark:text-neutral-500 flex items-center gap-1">
                  <Clock className="w-2.5 h-2.5" />
                  {format(new Date(analyzedAt), "dd MMM yyyy", { locale: ptBR })}
                </span>
              )}
            </div>
            <p className={cn(
              "text-sm text-neutral-700 dark:text-neutral-300 leading-relaxed mt-1",
              !expanded && "line-clamp-3",
            )}>
              {resumo}
            </p>
          </div>
        </div>

        {/* KPIs inline */}
        {kpis && (
          <div className="flex items-center gap-4 mt-3 pt-3 border-t border-neutral-100 dark:border-neutral-800 text-xs">
            {kpis.totalPessoas > 0 && (
              <div className="flex items-center gap-1.5 text-neutral-600 dark:text-neutral-400">
                <Users className="w-3 h-3" />
                <span className="font-semibold text-neutral-900 dark:text-neutral-100">{kpis.totalPessoas}</span>
                <span>pessoas</span>
              </div>
            )}
            {kpis.totalEventos > 0 && (
              <div className="flex items-center gap-1.5 text-neutral-600 dark:text-neutral-400">
                <CalendarCheck className="w-3 h-3" />
                <span className="font-semibold text-neutral-900 dark:text-neutral-100">{kpis.totalEventos}</span>
                <span>eventos</span>
              </div>
            )}
            {kpis.totalNulidades > 0 && (
              <div className="flex items-center gap-1.5 text-neutral-600 dark:text-neutral-400">
                <AlertTriangle className="w-3 h-3" />
                <span className="font-semibold text-neutral-900 dark:text-neutral-100">{kpis.totalNulidades}</span>
                <span>nulidades</span>
              </div>
            )}
            {kpis.totalDocumentosAnalisados > 0 && (
              <div className="flex items-center gap-1.5 text-neutral-600 dark:text-neutral-400">
                <FileText className="w-3 h-3" />
                <span className="font-semibold text-neutral-900 dark:text-neutral-100">{kpis.totalDocumentosAnalisados}</span>
                <span>documentos</span>
              </div>
            )}
            <div className="flex-1" />
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-xs text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-200 flex items-center gap-1"
            >
              {expanded ? (
                <>Recolher <ChevronUp className="w-3 h-3" /></>
              ) : (
                <>Ver detalhes <ChevronDown className="w-3 h-3" /></>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Detalhes expandidos */}
      {expanded && (
        <div className="px-4 pb-4 space-y-4 border-t border-neutral-100 dark:border-neutral-800 pt-4">
          {achadosChave.length > 0 && (
            <div>
              <h4 className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-2 flex items-center gap-1.5">
                <Lightbulb className="w-3 h-3 text-amber-500" />
                Achados-chave
              </h4>
              <ul className="space-y-1">
                {achadosChave.map((a, i) => (
                  <li key={i} className="text-sm text-neutral-700 dark:text-neutral-300 flex gap-2">
                    <span className="text-amber-500 shrink-0">•</span>
                    <span>{a}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {recomendacoes.length > 0 && (
            <div>
              <h4 className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-2 flex items-center gap-1.5">
                <Sparkles className="w-3 h-3 text-emerald-500" />
                Recomendações
              </h4>
              <ul className="space-y-1">
                {recomendacoes.map((r, i) => (
                  <li key={i} className="text-sm text-neutral-700 dark:text-neutral-300 flex gap-2">
                    <span className="text-emerald-500 shrink-0">→</span>
                    <span>{r}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {inconsistencias.length > 0 && (
            <div>
              <h4 className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-2 flex items-center gap-1.5">
                <AlertTriangle className="w-3 h-3 text-rose-500" />
                Inconsistências
              </h4>
              <ul className="space-y-1">
                {inconsistencias.map((inc, i) => (
                  <li key={i} className="text-sm text-rose-700 dark:text-rose-300 bg-rose-50/50 dark:bg-rose-950/20 px-2 py-1 rounded-md border border-rose-100 dark:border-rose-900/40">
                    {inc}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex items-center justify-end pt-2 border-t border-neutral-100 dark:border-neutral-800">
            <Button
              size="sm"
              variant="outline"
              onClick={() => generateMutation.mutate({ assistidoId })}
              disabled={generateMutation.isPending}
              className="text-xs"
            >
              {generateMutation.isPending ? (
                <Loader2 className="w-3 h-3 mr-1.5 animate-spin" />
              ) : (
                <RefreshCw className="w-3 h-3 mr-1.5" />
              )}
              Reanalisar
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
