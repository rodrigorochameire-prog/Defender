"use client";

import { useMemo } from "react";
import Link from "next/link";
import {
  Sparkles, Scale, ShieldAlert, AlertTriangle, GitCompare, ListChecks, ChevronRight,
} from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";
import { AnaliseButton } from "./analise-button";

/** Subconjunto de `casosAgrupados` (assistidos.getById) usado aqui. */
type CasoLite = {
  id: number;
  titulo: string;
  atribuicao: string | null;
  prioridade: string | null;
  processos: { id: number; isReferencia: boolean | null }[];
};

/** Extração defensiva do JSONB de análise (shape AnalysisBlocksData, parcial). */
type AnaliseJSON = {
  estrategia?: {
    tesePrincipal?: { tese?: string } | null;
    tesesSubsidiarias?: unknown[];
    nulidades?: { severidade?: string }[];
  };
  operacional?: { pontosCriticos?: unknown[]; orientacaoAoAssistido?: string };
  depoimentosComparados?: { convergencia?: boolean }[];
  alertasOperacionais?: { tipo?: string; texto?: string }[];
};

function Sinal({
  icon: Icon, valor, label, tone = "neutral",
}: {
  icon: typeof Scale;
  valor: number;
  label: string;
  tone?: "neutral" | "rose" | "amber";
}) {
  if (!valor) return null;
  const toneCls = {
    neutral: "text-neutral-500 dark:text-neutral-400",
    rose: "text-rose-600 dark:text-rose-400",
    amber: "text-amber-600 dark:text-amber-400",
  }[tone];
  return (
    <span className="inline-flex items-center gap-1 rounded bg-neutral-100 dark:bg-white/[0.06] px-1.5 py-0.5 text-[10px] font-medium">
      <Icon className={cn("h-3 w-3", toneCls)} />
      <span className="tabular-nums">{valor}</span>
      <span className="text-neutral-500 dark:text-neutral-400">{label}</span>
    </span>
  );
}

/** Síntese de UM caso analisado. Só renderiza algo se houver analysisData. */
function AnaliseCasoResumo({
  assistidoId, caso,
}: {
  assistidoId: number;
  caso: CasoLite;
}) {
  const { data } = trpc.analise.getAnaliseDoCaso.useQuery(
    { casoId: caso.id },
    { staleTime: 60_000 },
  );

  const resumo = useMemo(() => {
    const a = (data?.analysisData ?? null) as AnaliseJSON | null;
    if (!a) return null;
    const tese = a.estrategia?.tesePrincipal?.tese?.trim() || null;
    const subsid = a.estrategia?.tesesSubsidiarias?.length ?? 0;
    const nulidadesAltas = (a.estrategia?.nulidades ?? []).filter((n) => n?.severidade === "alta").length;
    const nulidades = a.estrategia?.nulidades?.length ?? 0;
    const contradicoes = (a.depoimentosComparados ?? []).filter((d) => d?.convergencia === false).length;
    const pontosCriticos = a.operacional?.pontosCriticos?.length ?? 0;
    return { tese, subsid, nulidades, nulidadesAltas, contradicoes, pontosCriticos };
  }, [data]);

  // Caso sem análise estruturada — não polui o bloco (botão fica no rodapé geral).
  if (!data || !data.analysisData) return null;
  if (!resumo) return null;

  const analisadoEm = data.analyzedAt
    ? new Date(data.analyzedAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }).replace(".", "")
    : null;

  return (
    <div className="rounded-lg border border-neutral-200/70 dark:border-white/[0.06] bg-neutral-50/50 dark:bg-white/[0.03] px-2.5 py-2">
      <div className="flex items-center gap-1.5">
        <Scale className="h-3 w-3 shrink-0 text-emerald-500" />
        <Link
          href={`/admin/assistidos/${assistidoId}/caso/${caso.id}`}
          className="min-w-0 flex-1 truncate text-[11.5px] font-semibold text-neutral-800 dark:text-neutral-100 hover:text-emerald-600 dark:hover:text-emerald-400"
        >
          {caso.titulo}
        </Link>
        {analisadoEm && <span className="shrink-0 text-[9.5px] tabular-nums text-neutral-400">{analisadoEm}</span>}
      </div>

      {resumo.tese && (
        <p className="mt-1 line-clamp-2 text-[11px] leading-snug text-neutral-600 dark:text-neutral-300">
          <span className="font-medium text-neutral-700 dark:text-neutral-200">Tese: </span>
          {resumo.tese}
        </p>
      )}

      <div className="mt-1.5 flex flex-wrap items-center gap-1">
        <Sinal icon={GitCompare} valor={resumo.contradicoes} label="contradições" tone="amber" />
        <Sinal icon={ShieldAlert} valor={resumo.nulidades} label="nulidades" tone={resumo.nulidadesAltas > 0 ? "rose" : "neutral"} />
        <Sinal icon={AlertTriangle} valor={resumo.pontosCriticos} label="pontos críticos" tone="rose" />
        <Sinal icon={ListChecks} valor={resumo.subsid} label="teses subsid." />
        <Link
          href={`/admin/assistidos/${assistidoId}/caso/${caso.id}`}
          className="ml-auto inline-flex items-center gap-0.5 text-[10px] text-emerald-600 dark:text-emerald-400 hover:underline"
        >
          ver análise <ChevronRight className="h-2.5 w-2.5" />
        </Link>
      </div>
    </div>
  );
}

/**
 * Bloco de cockpit: síntese das análises processuais (geradas via daemon).
 * Mostra os sinais-chave por caso analisado e oferece (re)análise. A análise
 * completa vive na página do caso.
 */
export function AnaliseResumoCockpit({
  assistidoId, casos,
}: {
  assistidoId: number;
  casos: CasoLite[];
}) {
  const utils = trpc.useUtils();

  // Caso "principal" para oferecer análise quando nada foi analisado ainda:
  // o de maior prioridade com processo de referência, senão o primeiro.
  const casoAlvo = useMemo(() => {
    if (casos.length === 0) return null;
    return [...casos].sort((a, b) => {
      const ra = a.processos.some((p) => p.isReferencia) ? 1 : 0;
      const rb = b.processos.some((p) => p.isReferencia) ? 1 : 0;
      return rb - ra;
    })[0];
  }, [casos]);

  return (
    <section className="rounded-xl bg-white dark:bg-neutral-900 ring-1 ring-neutral-200/80 dark:ring-neutral-800 shadow-sm">
      <div className="flex items-center justify-between gap-2 px-4 pt-3 pb-2">
        <h2 className="flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
          <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
          Análise
        </h2>
        {casoAlvo && (
          <AnaliseButton
            assistidoId={assistidoId}
            casoId={casoAlvo.id}
            atribuicao={casoAlvo.atribuicao ?? undefined}
            onComplete={() => {
              utils.analise.getAnaliseDoCaso.invalidate({ casoId: casoAlvo.id });
            }}
          />
        )}
      </div>

      <div className="px-4 pb-4">
        {casos.length === 0 ? (
          <p className="text-[12px] italic text-neutral-400">
            Agrupe os processos em casos para gerar análises.
          </p>
        ) : (
          <div className="space-y-1.5">
            {casos.map((c) => (
              <AnaliseCasoResumo key={c.id} assistidoId={assistidoId} caso={c} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
