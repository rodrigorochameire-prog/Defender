"use client";

import { Sparkles, Clock, AlertTriangle, Scale, Target, FileText } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

/**
 * Dados estruturados da análise de um processo (subset de AnaliseCowork).
 * Tipo local e desacoplado do schema do banco — este é um primitivo
 * presentacional ("use client"), não deve importar módulos server-only.
 */
export interface AnaliseProcessoData {
  resumoFato?: string | null;
  teseDefesa?: string | null;
  estrategiaAtual?: string | null;
  crimePrincipal?: string | null;
  pontosCriticos?: string[] | null;
  fonteArquivo?: string | null;
  importadoEm?: Date | string | null;
}

export interface AnaliseProcessoCardProps {
  /** Análise estruturada (analises_cowork). Fonte primária. */
  analise?: AnaliseProcessoData | null;
  /** Fallback bruto (processos.analysisData) quando não há análise estruturada. */
  analysisData?: Record<string, unknown> | null;
  /** Data da análise de fallback (processos.analyzedAt). */
  analyzedAt?: Date | string | null;
  isLoading?: boolean;
  className?: string;
}

function hasStructured(a?: AnaliseProcessoData | null): a is AnaliseProcessoData {
  return !!a && !!(a.resumoFato || a.teseDefesa || a.estrategiaAtual || (a.pontosCriticos?.length));
}

function fmtData(d?: Date | string | null): string | null {
  if (!d) return null;
  const date = typeof d === "string" ? new Date(d) : d;
  if (Number.isNaN(date.getTime())) return null;
  return format(date, "dd MMM yyyy", { locale: ptBR });
}

/** Cabeçalho compartilhado pelos estados com conteúdo. */
function CardHeader({ rotulo, badge, data }: { rotulo: string; badge?: string | null; data?: string | null }) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-9 h-9 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 flex items-center justify-center shrink-0">
        <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
            {rotulo}
          </h3>
          {data && (
            <span className="text-[10px] text-neutral-400 dark:text-neutral-500 flex items-center gap-1 shrink-0">
              <Clock className="w-2.5 h-2.5" />
              {data}
            </span>
          )}
        </div>
        {badge && (
          <span className="inline-flex items-center mt-1 rounded-md bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 px-2 py-0.5 text-[11px] font-medium text-rose-700 dark:text-rose-300">
            {badge}
          </span>
        )}
      </div>
    </div>
  );
}

/** Bloco de texto rotulado (resumo do fato / tese / estratégia). */
function Bloco({ icon, titulo, texto }: { icon: React.ReactNode; titulo: string; texto?: string | null }) {
  if (!texto) return null;
  return (
    <div>
      <h4 className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-1 flex items-center gap-1.5">
        {icon}
        {titulo}
      </h4>
      <p className="text-sm text-neutral-700 dark:text-neutral-300 leading-relaxed">{texto}</p>
    </div>
  );
}

/**
 * AnaliseProcessoCard — painel de análise IA do cockpit do processo.
 *
 * Três estados:
 *  1. `analise` estruturada (analises_cowork) → resumo do fato, tese, estratégia, pontos críticos.
 *  2. fallback `analysisData` (processos.analysisData) → resumo/achados, quando não há estruturada.
 *  3. vazio → convite a importar a análise (via daemon/Cowork).
 */
export function AnaliseProcessoCard({
  analise,
  analysisData,
  analyzedAt,
  isLoading,
  className,
}: AnaliseProcessoCardProps) {
  if (isLoading) {
    return <Skeleton className={cn("h-40 w-full rounded-lg", className)} />;
  }

  // ── Estado 1: análise estruturada (analises_cowork) ──────────────────────
  if (hasStructured(analise)) {
    const pontos = analise.pontosCriticos ?? [];
    return (
      <div
        className={cn(
          "rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4 space-y-4",
          className,
        )}
      >
        <CardHeader rotulo="Análise" badge={analise.crimePrincipal} data={fmtData(analise.importadoEm)} />

        <Bloco
          icon={<FileText className="w-3 h-3 text-neutral-400" />}
          titulo="Resumo do fato"
          texto={analise.resumoFato}
        />
        <Bloco
          icon={<Scale className="w-3 h-3 text-emerald-500" />}
          titulo="Tese de defesa"
          texto={analise.teseDefesa}
        />
        <Bloco
          icon={<Target className="w-3 h-3 text-blue-500" />}
          titulo="Estratégia atual"
          texto={analise.estrategiaAtual}
        />

        {pontos.length > 0 && (
          <div>
            <h4 className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-2 flex items-center gap-1.5">
              <AlertTriangle className="w-3 h-3 text-rose-500" />
              Pontos críticos
            </h4>
            <ul className="space-y-1">
              {pontos.map((p, i) => (
                <li
                  key={i}
                  className="text-sm text-rose-700 dark:text-rose-300 bg-rose-50/50 dark:bg-rose-950/20 px-2 py-1 rounded-md border border-rose-100 dark:border-rose-900/40"
                >
                  {p}
                </li>
              ))}
            </ul>
          </div>
        )}

        {analise.fonteArquivo && (
          <p className="text-[10px] text-neutral-400 dark:text-neutral-500 font-mono truncate pt-1 border-t border-neutral-100 dark:border-neutral-800">
            {analise.fonteArquivo}
          </p>
        )}
      </div>
    );
  }

  // ── Estado 2: fallback bruto (processos.analysisData) ────────────────────
  const resumo = analysisData?.resumo as string | undefined;
  const achados = (analysisData?.achadosChave as string[] | undefined) ?? [];
  if (resumo || achados.length > 0) {
    return (
      <div
        className={cn(
          "rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4 space-y-4",
          className,
        )}
      >
        <CardHeader rotulo="Análise" data={fmtData(analyzedAt)} />
        {resumo && <p className="text-sm text-neutral-700 dark:text-neutral-300 leading-relaxed">{resumo}</p>}
        {achados.length > 0 && (
          <ul className="space-y-1">
            {achados.map((a, i) => (
              <li key={i} className="text-sm text-neutral-700 dark:text-neutral-300 flex gap-2">
                <span className="text-amber-500 shrink-0">•</span>
                <span>{a}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  // ── Estado 3: vazio ──────────────────────────────────────────────────────
  return (
    <div
      className={cn(
        "rounded-lg border border-dashed border-neutral-300 dark:border-neutral-700 bg-neutral-50/60 dark:bg-white/[0.02] p-4",
        className,
      )}
    >
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 flex items-center justify-center shrink-0">
          <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Sem análise importada</h3>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
            A análise estratégica deste processo aparecerá aqui assim que for gerada pelo Cowork.
          </p>
        </div>
      </div>
    </div>
  );
}
