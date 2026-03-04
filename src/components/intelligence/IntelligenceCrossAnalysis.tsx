"use client";

import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";
import {
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  RefreshCw,
  Loader2,
  Shield,
  Clock,
  Users,
  ClipboardList,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { ContradictionMatrix } from "./ContradictionMatrix";

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

interface IntelligenceCrossAnalysisProps {
  assistidoId: number;
}

// ─────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────

function TeseSection({ tese }: { tese: Record<string, unknown> }) {
  const tesePrincipal = (tese.tesePrincipal ?? tese.tese_principal ?? "") as string;
  const tesesSubsidiarias = (tese.tesesSubsidiarias ?? tese.teses_subsidiarias ?? []) as string[];
  const pontosFortes = (tese.pontosFortes ?? tese.pontos_fortes ?? []) as Array<{
    ponto: string;
    fontes?: number[];
    relevancia?: string;
  }>;
  const pontosFracos = (tese.pontosFracos ?? tese.pontos_fracos ?? []) as Array<{
    ponto: string;
    fontes?: number[];
    relevancia?: string;
  }>;

  if (!tesePrincipal && pontosFortes.length === 0 && pontosFracos.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      {/* Tese Principal */}
      {tesePrincipal && (
        <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800">
          <div className="flex items-center gap-1.5 mb-1.5">
            <Shield className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">
              Tese Principal
            </span>
          </div>
          <p className="text-sm text-emerald-900 dark:text-emerald-100">
            {tesePrincipal}
          </p>
        </div>
      )}

      {/* Teses Subsidiárias */}
      {tesesSubsidiarias.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
            Teses Subsidiárias
          </p>
          {tesesSubsidiarias.map((t, i) => (
            <div key={i} className="flex items-start gap-2 text-sm text-zinc-700 dark:text-zinc-300">
              <span className="text-zinc-400 shrink-0">{i + 1}.</span>
              <span>{t}</span>
            </div>
          ))}
        </div>
      )}

      {/* Pontos Fortes vs Fracos */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {pontosFortes.length > 0 && (
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
              <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                Pontos Fortes ({pontosFortes.length})
              </span>
            </div>
            {pontosFortes.map((p, i) => (
              <div
                key={i}
                className="text-xs text-zinc-700 dark:text-zinc-300 pl-5 py-1 border-l-2 border-emerald-200 dark:border-emerald-800"
              >
                {p.ponto}
                {p.relevancia && (
                  <span className={cn(
                    "ml-1 text-[10px] px-1 py-0.5 rounded",
                    p.relevancia === "alta" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300" :
                    p.relevancia === "media" ? "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400" :
                    "bg-zinc-50 text-zinc-500 dark:bg-zinc-900 dark:text-zinc-500",
                  )}>
                    {p.relevancia}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}

        {pontosFracos.length > 0 && (
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5 text-red-500" />
              <span className="text-xs font-semibold text-red-700 dark:text-red-300">
                Pontos Fracos ({pontosFracos.length})
              </span>
            </div>
            {pontosFracos.map((p, i) => (
              <div
                key={i}
                className="text-xs text-zinc-700 dark:text-zinc-300 pl-5 py-1 border-l-2 border-red-200 dark:border-red-800"
              >
                {p.ponto}
                {p.relevancia && (
                  <span className={cn(
                    "ml-1 text-[10px] px-1 py-0.5 rounded",
                    p.relevancia === "alta" ? "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300" :
                    p.relevancia === "media" ? "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400" :
                    "bg-zinc-50 text-zinc-500 dark:bg-zinc-900 dark:text-zinc-500",
                  )}>
                    {p.relevancia}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function TimelineSection({ items }: { items: Array<Record<string, unknown>> }) {
  if (items.length === 0) return null;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5 mb-2">
        <Clock className="h-4 w-4 text-blue-500" />
        <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
          Timeline dos Fatos ({items.length})
        </span>
      </div>
      <div className="space-y-0">
        {items.map((item, i) => {
          const dataRef = (item.dataRef ?? item.data_ref ?? "") as string;
          const fato = (item.fato ?? "") as string;
          const importancia = (item.importancia ?? "media") as string;
          const fontes = (item.fontes ?? []) as Array<Record<string, unknown>>;

          return (
            <div key={i} className="flex gap-3 group">
              {/* Timeline line */}
              <div className="flex flex-col items-center">
                <div className={cn(
                  "w-2 h-2 rounded-full mt-1.5 shrink-0",
                  importancia === "alta" ? "bg-red-500" :
                  importancia === "media" ? "bg-blue-500" :
                  "bg-zinc-400",
                )} />
                {i < items.length - 1 && (
                  <div className="w-px flex-1 bg-zinc-200 dark:bg-zinc-700" />
                )}
              </div>
              {/* Content */}
              <div className="pb-3 min-w-0">
                {dataRef && (
                  <span className="text-[10px] font-mono text-zinc-500 dark:text-zinc-400">
                    {dataRef}
                  </span>
                )}
                <p className="text-xs text-zinc-800 dark:text-zinc-200">
                  {fato}
                </p>
                {fontes.length > 0 && (
                  <span className="text-[10px] text-zinc-400">
                    {fontes.length} fonte{fontes.length !== 1 ? "s" : ""}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AtoresSection({ items }: { items: Array<Record<string, unknown>> }) {
  if (items.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5 mb-2">
        <Users className="h-4 w-4 text-violet-500" />
        <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
          Mapa de Atores ({items.length})
        </span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {items.map((actor, i) => {
          const nome = (actor.nome ?? "") as string;
          const papel = (actor.papel ?? "outro") as string;
          const mencionadoPor = (actor.mencionadoPor ?? actor.mencionado_por ?? []) as Array<Record<string, unknown>>;
          const relacoes = (actor.relacoes ?? []) as Array<Record<string, unknown>>;

          return (
            <div
              key={i}
              className="p-2 rounded-md border border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900"
            >
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                  {nome}
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-violet-100 text-violet-700 dark:bg-violet-900 dark:text-violet-300">
                  {papel}
                </span>
              </div>
              {mencionadoPor.length > 0 && (
                <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                  Citado por {mencionadoPor.length} depoente{mencionadoPor.length !== 1 ? "s" : ""}
                </p>
              )}
              {relacoes.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {relacoes.map((r, j) => (
                    <span key={j} className="text-[10px] px-1 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-500">
                      {(r.tipo as string) ?? "?"} → {(r.com as string) ?? "?"}
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ProvidenciasSection({ items }: { items: string[] }) {
  if (items.length === 0) return null;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5 mb-2">
        <ClipboardList className="h-4 w-4 text-amber-500" />
        <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
          Providências Agregadas ({items.length})
        </span>
      </div>
      <ol className="space-y-1 list-decimal list-inside">
        {items.map((p, i) => (
          <li key={i} className="text-xs text-zinc-700 dark:text-zinc-300">
            {p}
          </li>
        ))}
      </ol>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────

export function IntelligenceCrossAnalysis({ assistidoId }: IntelligenceCrossAnalysisProps) {
  const crossQuery = trpc.intelligence.getCrossAnalysis.useQuery(
    { assistidoId },
    { refetchOnWindowFocus: false },
  );

  const regenerateMutation = trpc.intelligence.regenerateCrossAnalysis.useMutation({
    onSuccess: (result) => {
      if (result.success) {
        toast.success(`Análise cruzada de ${result.analysisCount} depoimentos iniciada`);
        // Poll for results after a delay
        setTimeout(() => crossQuery.refetch(), 10_000);
        setTimeout(() => crossQuery.refetch(), 30_000);
        setTimeout(() => crossQuery.refetch(), 60_000);
      } else {
        toast.error(result.error || "Falha ao iniciar análise cruzada");
      }
    },
    onError: (err) => {
      toast.error(`Erro: ${err.message}`);
    },
  });

  const handleRegenerate = () => {
    regenerateMutation.mutate({ assistidoId });
  };

  // Loading
  if (crossQuery.isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-zinc-400" />
      </div>
    );
  }

  // No cross-analysis yet
  if (!crossQuery.data?.found || !crossQuery.data?.data) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-3">
        <Sparkles className="h-8 w-8 text-zinc-300 dark:text-zinc-600" />
        <div className="text-center">
          <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Análise cruzada não disponível
          </p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 max-w-xs">
            A análise cruzada compara depoimentos entre si para encontrar contradições, corroborações e lacunas.
            É gerada automaticamente quando 2+ depoimentos são analisados.
          </p>
        </div>
        <button
          onClick={handleRegenerate}
          disabled={regenerateMutation.isPending}
          className={cn(
            "flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg transition-colors",
            "bg-emerald-600 text-white hover:bg-emerald-700",
            "disabled:opacity-50 disabled:cursor-not-allowed",
          )}
        >
          {regenerateMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4" />
          )}
          Gerar Análise Cruzada
        </button>
      </div>
    );
  }

  const data = crossQuery.data.data;

  return (
    <div className="space-y-6">
      {/* Header with refresh button */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            {data.analysisCount} depoimentos comparados
            {data.updatedAt && (
              <> · Atualizado em {new Date(data.updatedAt).toLocaleDateString("pt-BR")}</>
            )}
          </p>
        </div>
        <button
          onClick={handleRegenerate}
          disabled={regenerateMutation.isPending}
          className="flex items-center gap-1 text-xs text-zinc-500 hover:text-emerald-600 transition-colors disabled:opacity-50"
        >
          {regenerateMutation.isPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <RefreshCw className="h-3.5 w-3.5" />
          )}
          Re-gerar
        </button>
      </div>

      {/* Tese Consolidada */}
      <TeseSection tese={data.teseConsolidada as Record<string, unknown>} />

      {/* Contradiction Matrix */}
      <div>
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50 mb-3">
          Matriz de Cruzamento
        </h3>
        <ContradictionMatrix
          items={(data.contradictionMatrix as Array<{
            fato: string;
            depoimentos: Array<{
              sourceFileId: number;
              depoente: string;
              afirmacao: string;
              timestampRef?: string;
            }>;
            tipo: "contradicao" | "corroboracao" | "lacuna";
            analise: string;
          }>) ?? []}
        />
      </div>

      {/* Timeline */}
      <TimelineSection items={(data.timelineFatos as Array<Record<string, unknown>>) ?? []} />

      {/* Mapa de Atores */}
      <AtoresSection items={(data.mapaAtores as Array<Record<string, unknown>>) ?? []} />

      {/* Providências */}
      <ProvidenciasSection items={(data.providenciasAgregadas as string[]) ?? []} />
    </div>
  );
}
