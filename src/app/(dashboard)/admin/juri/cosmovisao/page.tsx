"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  Gavel,
  ShieldCheck,
  Lock,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  Lightbulb,
  Users,
  UserCheck,
  Scale,
  Timer,
  FileText,
  MapPin,
  BarChart3,
  Eye,
  Globe,
  ChevronRight,
} from "lucide-react";
import { CollapsiblePageHeader } from "@/components/layouts/collapsible-page-header";

// ============================================
// TYPES
// ============================================

type Periodo = "ano" | "semestre" | "trimestre" | "mes" | "tudo" | "custom";

// ============================================
// HELPERS
// ============================================

function getPeriodoDates(periodo: Periodo, customInicio?: string, customFim?: string) {
  if (periodo === "custom" && customInicio && customFim) {
    return { inicio: customInicio, fim: customFim };
  }

  const agora = new Date();
  const fim = agora.toISOString().split("T")[0];

  switch (periodo) {
    case "mes": {
      const d = new Date(agora);
      d.setMonth(d.getMonth() - 1);
      return { inicio: d.toISOString().split("T")[0], fim };
    }
    case "trimestre": {
      const d = new Date(agora);
      d.setMonth(d.getMonth() - 3);
      return { inicio: d.toISOString().split("T")[0], fim };
    }
    case "semestre": {
      const d = new Date(agora);
      d.setMonth(d.getMonth() - 6);
      return { inicio: d.toISOString().split("T")[0], fim };
    }
    case "ano": {
      const d = new Date(agora);
      d.setFullYear(d.getFullYear() - 1);
      return { inicio: d.toISOString().split("T")[0], fim };
    }
    case "tudo":
    default:
      return { inicio: undefined, fim: undefined };
  }
}

function formatTipoPenal(tipo: string) {
  const map: Record<string, string> = {
    homicidio_simples: "Homicidio Simples",
    homicidio_qualificado: "Homicidio Qualificado",
    homicidio_privilegiado: "Homicidio Privilegiado",
    homicidio_privilegiado_qualificado: "Homicidio Priv./Qualif.",
    homicidio_tentado: "Homicidio Tentado",
    feminicidio: "Feminicidio",
    nao_informado: "Nao informado",
  };
  return map[tipo] || tipo.replace(/_/g, " ");
}

function formatMes(mes: string) {
  const [year, month] = mes.split("-");
  const meses = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
  return `${meses[parseInt(month, 10) - 1]} ${year.slice(2)}`;
}

function calcDelta(atual: number, anterior: number): { value: number; positive: boolean } {
  if (anterior === 0) return { value: atual > 0 ? 100 : 0, positive: atual > 0 };
  const delta = ((atual - anterior) / anterior) * 100;
  return { value: Math.abs(Math.round(delta)), positive: delta >= 0 };
}

function getTendenciaBadge(tendencia: string) {
  switch (tendencia) {
    case "absolutorio":
      return { label: "Absolutorio", className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400" };
    case "condenatorio":
      return { label: "Condenatorio", className: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-400" };
    case "neutro":
      return { label: "Neutro", className: "bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-400" };
    default:
      return { label: "Desconhecido", className: "bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-500" };
  }
}

// ============================================
// DATA TYPES (matching tRPC return types)
// ============================================

type TimelineMonth = {
  mes: string;
  total: number;
  absolvicoes: number;
  condenacoes: number;
  desclassificacoes: number;
  nulidades: number;
};

type TipoPenalRow = {
  tipoPenal: string;
  total: number;
  absolvicoes: number;
  condenacoes: number;
  desclassificacoes: number;
  taxaAbsolvicao: number;
};

type TeseRow = {
  tese: string;
  total: number;
  absolvicoes: number;
  condenacoes: number;
  taxaAbsolvicao: number;
};

type DuracaoRow = {
  faixa: string;
  total: number;
  absolvicoes: number;
  condenacoes: number;
  taxaAbsolvicao: number;
};

type PerfilRow = {
  categoria?: string;
  local?: string;
  total: number;
  absolvicoes: number;
  condenacoes: number;
  taxaAbsolvicao: number;
};

type JuradoRow = {
  id: number;
  nome: string;
  totalSessoes: number;
  votosCondenacao: number;
  votosAbsolvicao: number;
  votosDesclassificacao: number;
  perfilTendencia: string;
};

type AtorRow = {
  nome: string;
  total: number;
  absolvicoes: number;
  condenacoes: number;
  taxaAbsolvicao: number;
};

// ============================================
// COMPONENTS
// ============================================

function KPICard({
  label,
  value,
  previousValue,
  icon: Icon,
  color = "zinc",
  invertDelta = false,
}: {
  label: string;
  value: number | string;
  previousValue?: number | string;
  icon: React.ElementType;
  color?: "zinc" | "emerald" | "rose" | "violet";
  invertDelta?: boolean;
}) {
  const numValue = typeof value === "string" ? parseFloat(value) : value;
  const numPrev = typeof previousValue === "string" ? parseFloat(previousValue || "0") : (previousValue ?? 0);
  const delta = calcDelta(numValue, numPrev);
  // For absolvicoes, positive delta is good. For condenacoes, negative delta is good.
  const isGood = invertDelta ? !delta.positive : delta.positive;

  const colorMap = {
    zinc: "bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400",
    emerald: "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400",
    rose: "bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400",
    violet: "bg-violet-100 dark:bg-violet-900/40 text-violet-600 dark:text-violet-400",
  };

  return (
    <div className="p-4 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800">
      <div className="flex items-center justify-between mb-3">
        <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center", colorMap[color])}>
          <Icon className="w-4.5 h-4.5" />
        </div>
        {numPrev > 0 && delta.value > 0 && (
          <div className={cn(
            "flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-md",
            isGood
              ? "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 dark:text-emerald-400"
              : "text-rose-600 bg-rose-50 dark:bg-rose-950/30 dark:text-rose-400"
          )}>
            {delta.positive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
            {delta.value}%
          </div>
        )}
      </div>
      <p className="text-2xl font-bold text-neutral-900 dark:text-neutral-50 tabular-nums">{value}</p>
      <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5">{label}</p>
    </div>
  );
}

function MiniBarRow({
  label,
  taxa,
  total,
}: {
  label: string;
  taxa: number;
  total: number;
}) {
  return (
    <div className="flex items-center gap-2 py-1.5">
      <span className="text-xs w-28 truncate text-neutral-700 dark:text-neutral-300" title={label}>{label}</span>
      <div className="flex-1 h-2 bg-neutral-100 dark:bg-neutral-700 rounded-full overflow-hidden">
        <div
          className="h-full bg-emerald-500 rounded-full transition-all duration-500"
          style={{ width: `${Math.max(taxa, 2)}%` }}
        />
      </div>
      <span className="text-xs font-mono w-12 text-right text-neutral-600 dark:text-neutral-400">{taxa}%</span>
      <span className="text-[10px] text-neutral-400 w-8 text-right">n={total}</span>
    </div>
  );
}

function SectionCard({ title, icon: Icon, children, className }: {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("rounded-xl bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 p-4", className)}>
      <div className="flex items-center gap-2 mb-4">
        <Icon className="w-4 h-4 text-neutral-500 dark:text-neutral-400" />
        <h3 className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-16 h-16 rounded-2xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center mb-4">
        <BarChart3 className="w-8 h-8 text-neutral-400" />
      </div>
      <h2 className="text-lg font-semibold text-neutral-800 dark:text-neutral-200 mb-1">
        Ainda sem dados de sessoes
      </h2>
      <p className="text-sm text-neutral-500 dark:text-neutral-400 max-w-md mb-6">
        Registre o resultado das sessoes de juri para ver estatisticas,
        padroes e insights automaticos aqui.
      </p>
      <Link href="/admin/juri">
        <Button variant="outline" size="sm" className="text-xs">
          <Gavel className="w-3.5 h-3.5 mr-1.5" />
          Ir para Sessoes
        </Button>
      </Link>
    </div>
  );
}

// ============================================
// MAIN PAGE
// ============================================

export default function CosmovisaoPage() {
  const [periodo, setPeriodo] = useState<Periodo>("ano");
  const [customInicio, setCustomInicio] = useState("");
  const [customFim, setCustomFim] = useState("");
  const [atoresTab, setAtoresTab] = useState<"jurados" | "juizes" | "promotores">("jurados");

  // Compute filter dates
  const filtros = useMemo(() => {
    const dates = getPeriodoDates(periodo, customInicio, customFim);
    return {
      periodoInicio: dates.inicio,
      periodoFim: dates.fim,
    };
  }, [periodo, customInicio, customFim]);

  // tRPC queries
  const { data: panorama, isLoading: loadingPanorama } = trpc.juriAnalytics.panorama.useQuery(filtros);
  const { data: timeline, isLoading: loadingTimeline } = trpc.juriAnalytics.timeline.useQuery(filtros);
  const { data: tipoPenal, isLoading: loadingTipo } = trpc.juriAnalytics.porTipoPenal.useQuery(filtros);
  const { data: teses, isLoading: loadingTeses } = trpc.juriAnalytics.porTese.useQuery(filtros);
  const { data: duracao, isLoading: loadingDuracao } = trpc.juriAnalytics.porDuracao.useQuery(filtros);
  const { data: perfil, isLoading: loadingPerfil } = trpc.juriAnalytics.porPerfil.useQuery(filtros);
  const { data: atores, isLoading: loadingAtores } = trpc.juriAnalytics.atores.useQuery(filtros);
  const { data: insights, isLoading: loadingInsights } = trpc.juriAnalytics.insightsCruzados.useQuery(filtros);

  const taxaAbs = panorama && panorama.total > 0
    ? Math.round((panorama.absolvicoes / panorama.total) * 100)
    : 0;
  const taxaAbsAnterior = panorama?.periodoAnterior && panorama.periodoAnterior.total > 0
    ? Math.round((panorama.periodoAnterior.absolvicoes / panorama.periodoAnterior.total) * 100)
    : 0;

  const isEmpty = panorama && panorama.total === 0;

  return (
    <div className="min-h-screen bg-neutral-100 dark:bg-[#0f0f11]">
      <CollapsiblePageHeader title="Cosmovisão do Júri" icon={Globe}>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Link href="/admin/juri">
              <button className="h-8 px-3 rounded-xl bg-white/[0.08] text-white/80 ring-1 ring-white/[0.05] hover:bg-white/[0.14] hover:text-white transition-all duration-150 cursor-pointer flex items-center gap-1.5 text-[11px] font-semibold shrink-0">
                <ArrowLeft className="w-3.5 h-3.5" />
              </button>
            </Link>
            <div className="w-9 h-9 rounded-xl bg-[#525252] flex items-center justify-center shrink-0">
              <Globe className="w-4 h-4 text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="text-white text-[15px] font-semibold tracking-tight leading-tight">Cosmovisão do Júri</h1>
              <p className="text-[10px] text-white/55 hidden sm:block">Analytics completo do Tribunal do Júri</p>
            </div>
          </div>

          {/* Period filter — inline in header */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-0.5 p-0.5 rounded-xl bg-white/[0.08] border border-white/[0.06]">
              {([
                { key: "mes", label: "Mês" },
                { key: "trimestre", label: "Trim." },
                { key: "semestre", label: "Sem." },
                { key: "ano", label: "Ano" },
                { key: "tudo", label: "Tudo" },
              ] as const).map(opt => (
                <button
                  key={opt.key}
                  onClick={() => setPeriodo(opt.key)}
                  className={cn(
                    "px-2.5 py-1 rounded-lg text-[10px] font-medium transition-all",
                    periodo === opt.key
                      ? "bg-white/[0.15] text-white shadow-sm"
                      : "text-white/55 hover:text-white/80"
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {periodo === "custom" && (
              <div className="flex items-center gap-1.5">
                <Input type="date" value={customInicio} onChange={(e) => setCustomInicio(e.target.value)} className="w-32 h-7 text-[10px] bg-white/[0.08] border-white/[0.1] text-white" />
                <span className="text-[10px] text-white/55">—</span>
                <Input type="date" value={customFim} onChange={(e) => setCustomFim(e.target.value)} className="w-32 h-7 text-[10px] bg-white/[0.08] border-white/[0.1] text-white" />
              </div>
            )}
          </div>
        </div>
      </CollapsiblePageHeader>

      <div className="px-5 md:px-8 py-3 md:py-4 space-y-4">

        {/* Loading State */}
        {loadingPanorama && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
          </div>
        )}

        {/* Empty State */}
        {!loadingPanorama && isEmpty && <EmptyState />}

        {/* ========== CONTENT (only when data exists) ========== */}
        {!loadingPanorama && !isEmpty && panorama && (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <KPICard
                label="Total de Sessoes"
                value={panorama.total}
                previousValue={panorama.periodoAnterior.total}
                icon={Gavel}
                color="zinc"
              />
              <KPICard
                label="Absolvicoes"
                value={panorama.absolvicoes}
                previousValue={panorama.periodoAnterior.absolvicoes}
                icon={ShieldCheck}
                color="emerald"
              />
              <KPICard
                label="Condenacoes"
                value={panorama.condenacoes}
                previousValue={panorama.periodoAnterior.condenacoes}
                icon={Lock}
                color="rose"
                invertDelta
              />
              <KPICard
                label="Taxa Absolvicao"
                value={`${taxaAbs}%`}
                previousValue={`${taxaAbsAnterior}`}
                icon={TrendingUp}
                color="violet"
              />
            </div>

            {/* Timeline Chart */}
            {loadingTimeline ? (
              <Skeleton className="h-56 rounded-xl" />
            ) : timeline && timeline.length > 0 ? (
              <SectionCard title="Evolucao Mensal" icon={BarChart3}>
                <div className="flex items-end gap-1.5 overflow-x-auto pb-2 scrollbar-none">
                  {timeline.map((month: TimelineMonth) => {
                    const max = Math.max(...timeline.map((m: TimelineMonth) => m.total), 1);
                    const barHeight = 160; // px
                    const totalH = (month.total / max) * barHeight;
                    const absPercent = month.total > 0 ? (month.absolvicoes / month.total) * 100 : 0;
                    const condPercent = month.total > 0 ? (month.condenacoes / month.total) * 100 : 0;
                    const descPercent = month.total > 0
                      ? ((month.desclassificacoes + month.nulidades) / month.total) * 100
                      : 0;

                    return (
                      <div key={month.mes} className="flex flex-col items-center gap-1 min-w-[2.5rem]">
                        <span className="text-[10px] font-mono text-neutral-500 dark:text-neutral-400 mb-1">
                          {month.total}
                        </span>
                        <div
                          className="flex flex-col-reverse w-10 rounded-lg overflow-hidden bg-neutral-100 dark:bg-neutral-800"
                          style={{ height: `${barHeight}px` }}
                        >
                          <div
                            className="bg-emerald-500 transition-all duration-500"
                            style={{ height: `${(absPercent / 100) * totalH}px` }}
                            title={`Absolvicoes: ${month.absolvicoes}`}
                          />
                          <div
                            className="bg-rose-500 transition-all duration-500"
                            style={{ height: `${(condPercent / 100) * totalH}px` }}
                            title={`Condenacoes: ${month.condenacoes}`}
                          />
                          <div
                            className="bg-amber-500 transition-all duration-500"
                            style={{ height: `${(descPercent / 100) * totalH}px` }}
                            title={`Desclassificacoes/Nulidades: ${month.desclassificacoes + month.nulidades}`}
                          />
                        </div>
                        <span className="text-[10px] text-neutral-500 dark:text-neutral-400">{formatMes(month.mes)}</span>
                      </div>
                    );
                  })}
                </div>
                {/* Legend */}
                <div className="flex items-center gap-4 mt-3 pt-3 border-t border-neutral-100 dark:border-neutral-800">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-sm bg-emerald-500" />
                    <span className="text-[10px] text-neutral-500">Absolvicao</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-sm bg-rose-500" />
                    <span className="text-[10px] text-neutral-500">Condenacao</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-sm bg-amber-500" />
                    <span className="text-[10px] text-neutral-500">Desc./Nulidade</span>
                  </div>
                </div>
              </SectionCard>
            ) : null}

            {/* 2x2 Grid: Tipo Penal | Tese | Duracao | Perfil */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Tipo Penal */}
              <SectionCard title="Por Tipo Penal" icon={Scale}>
                {loadingTipo ? (
                  <div className="space-y-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-6" />)}</div>
                ) : tipoPenal && tipoPenal.length > 0 ? (
                  <div className="space-y-0.5">
                    {tipoPenal.map((tp: TipoPenalRow) => (
                      <MiniBarRow
                        key={tp.tipoPenal}
                        label={formatTipoPenal(tp.tipoPenal)}
                        taxa={tp.taxaAbsolvicao}
                        total={tp.total}
                      />
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-neutral-400 py-4 text-center">Sem dados de tipo penal</p>
                )}
              </SectionCard>

              {/* Tese */}
              <SectionCard title="Por Tese Defensiva" icon={FileText}>
                {loadingTeses ? (
                  <div className="space-y-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-6" />)}</div>
                ) : teses && teses.length > 0 ? (
                  <div className="space-y-0.5">
                    {teses.map((t: TeseRow) => (
                      <MiniBarRow
                        key={t.tese}
                        label={t.tese}
                        taxa={t.taxaAbsolvicao}
                        total={t.total}
                      />
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-neutral-400 py-4 text-center">Sem dados de tese</p>
                )}
              </SectionCard>

              {/* Duracao */}
              <SectionCard title="Por Duracao" icon={Timer}>
                {loadingDuracao ? (
                  <div className="space-y-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-6" />)}</div>
                ) : duracao && duracao.length > 0 ? (
                  <div className="space-y-0.5">
                    {duracao.filter((d: DuracaoRow) => d.faixa !== "Nao informado").map((d: DuracaoRow) => (
                      <MiniBarRow
                        key={d.faixa}
                        label={d.faixa}
                        taxa={d.taxaAbsolvicao}
                        total={d.total}
                      />
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-neutral-400 py-4 text-center">Sem dados de duracao</p>
                )}
              </SectionCard>

              {/* Perfil */}
              <SectionCard title="Perfil do Reu" icon={UserCheck}>
                {loadingPerfil ? (
                  <div className="space-y-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-6" />)}</div>
                ) : perfil ? (
                  <div className="space-y-4">
                    {/* Primariedade */}
                    <div>
                      <p className="text-[10px] text-neutral-400 uppercase tracking-wider mb-2">Primariedade</p>
                      <div className="space-y-0.5">
                        {perfil.porPrimariedade.map((p: PerfilRow) => (
                          <MiniBarRow
                            key={p.categoria || "unknown"}
                            label={p.categoria || "N/A"}
                            taxa={p.taxaAbsolvicao}
                            total={p.total}
                          />
                        ))}
                      </div>
                    </div>
                    {/* Local do fato */}
                    {perfil.porLocalFato.length > 0 && (
                      <div>
                        <p className="text-[10px] text-neutral-400 uppercase tracking-wider mb-2">Local do Fato</p>
                        <div className="space-y-0.5">
                          {perfil.porLocalFato.slice(0, 5).map((l: PerfilRow) => (
                            <MiniBarRow
                              key={l.local || "unknown"}
                              label={l.local || "N/A"}
                              taxa={l.taxaAbsolvicao}
                              total={l.total}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-neutral-400 py-4 text-center">Sem dados de perfil</p>
                )}
              </SectionCard>
            </div>

            {/* Actors Section */}
            <SectionCard title="Atores do Juri" icon={Users}>
              {/* Tabs */}
              <div className="flex items-center gap-1 p-0.5 bg-neutral-100 dark:bg-neutral-800 rounded-lg w-fit mb-4 -mt-1">
                {(["jurados", "juizes", "promotores"] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setAtoresTab(tab)}
                    className={cn(
                      "px-3 py-1.5 rounded-md text-xs font-medium transition-all",
                      atoresTab === tab
                        ? "bg-white dark:bg-neutral-700 shadow-sm text-neutral-800 dark:text-neutral-200"
                        : "text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
                    )}
                  >
                    {tab === "jurados" ? "Jurados" : tab === "juizes" ? "Juizes" : "Promotores"}
                  </button>
                ))}
              </div>

              {loadingAtores ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
                </div>
              ) : atores ? (
                <>
                  {/* Jurados */}
                  {atoresTab === "jurados" && (
                    atores.jurados.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {atores.jurados.map((jurado: JuradoRow) => {
                          const totalVotos = jurado.votosCondenacao + jurado.votosAbsolvicao + jurado.votosDesclassificacao;
                          const pctAbs = totalVotos > 0 ? Math.round((jurado.votosAbsolvicao / totalVotos) * 100) : 0;
                          const pctCond = totalVotos > 0 ? Math.round((jurado.votosCondenacao / totalVotos) * 100) : 0;
                          const badge = getTendenciaBadge(jurado.perfilTendencia);

                          return (
                            <Link key={jurado.id} href={`/admin/juri/jurados/${jurado.id}`}>
                              <div className="p-3 rounded-xl border border-neutral-100 dark:border-neutral-800 hover:border-neutral-200 dark:hover:border-neutral-700 transition-all group cursor-pointer">
                                <div className="flex items-center justify-between mb-2">
                                  <p className="text-sm font-medium text-neutral-800 dark:text-neutral-200 truncate">{jurado.nome}</p>
                                  <ChevronRight className="w-3.5 h-3.5 text-neutral-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                                </div>
                                <div className="flex items-center gap-2 mb-2">
                                  <Badge className={cn("text-[10px] border-0", badge.className)}>
                                    {badge.label}
                                  </Badge>
                                  <span className="text-[10px] text-neutral-400">{jurado.totalSessoes} sessoes</span>
                                </div>
                                {/* Voting bar */}
                                {totalVotos > 0 && (
                                  <div className="flex items-center gap-2">
                                    <div className="flex-1 h-2 bg-neutral-100 dark:bg-neutral-700 rounded-full overflow-hidden flex">
                                      <div
                                        className="h-full bg-emerald-500"
                                        style={{ width: `${pctAbs}%` }}
                                        title={`Absolvicao: ${pctAbs}%`}
                                      />
                                      <div
                                        className="h-full bg-rose-500"
                                        style={{ width: `${pctCond}%` }}
                                        title={`Condenacao: ${pctCond}%`}
                                      />
                                    </div>
                                    <span className="text-[10px] font-mono text-neutral-400">
                                      {pctAbs}/{pctCond}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </Link>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-xs text-neutral-400 text-center py-4">Nenhum jurado cadastrado</p>
                    )
                  )}

                  {/* Juizes */}
                  {atoresTab === "juizes" && (
                    atores.juizes.length > 0 ? (
                      <div className="space-y-1">
                        {atores.juizes.map((juiz: AtorRow) => (
                          <div key={juiz.nome} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors">
                            <div className="w-8 h-8 rounded-lg bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center">
                              <Scale className="w-4 h-4 text-neutral-500" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-neutral-800 dark:text-neutral-200 truncate">{juiz.nome}</p>
                              <p className="text-[10px] text-neutral-400">{juiz.total} sessoes presididas</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="w-16 h-2 bg-neutral-100 dark:bg-neutral-700 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-emerald-500 rounded-full"
                                  style={{ width: `${juiz.taxaAbsolvicao}%` }}
                                />
                              </div>
                              <span className="text-xs font-mono text-neutral-500 w-10 text-right">{juiz.taxaAbsolvicao}%</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-neutral-400 text-center py-4">Nenhum juiz registrado</p>
                    )
                  )}

                  {/* Promotores */}
                  {atoresTab === "promotores" && (
                    atores.promotores.length > 0 ? (
                      <div className="space-y-1">
                        {atores.promotores.map((promotor: AtorRow) => (
                          <div key={promotor.nome} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors">
                            <div className="w-8 h-8 rounded-lg bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center">
                              <Gavel className="w-4 h-4 text-neutral-500" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-neutral-800 dark:text-neutral-200 truncate">{promotor.nome}</p>
                              <p className="text-[10px] text-neutral-400">{promotor.total} sessoes</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="w-16 h-2 bg-neutral-100 dark:bg-neutral-700 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-emerald-500 rounded-full"
                                  style={{ width: `${promotor.taxaAbsolvicao}%` }}
                                />
                              </div>
                              <span className="text-xs font-mono text-neutral-500 w-10 text-right">{promotor.taxaAbsolvicao}%</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-neutral-400 text-center py-4">Nenhum promotor registrado</p>
                    )
                  )}
                </>
              ) : null}
            </SectionCard>

            {/* Insights Section */}
            {loadingInsights ? (
              <div className="space-y-3">
                {[1, 2].map((i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
              </div>
            ) : insights && insights.length > 0 ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Lightbulb className="w-4 h-4 text-violet-500" />
                  <h3 className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">Insights Automaticos</h3>
                </div>
                {insights.map((insight, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-xl bg-gradient-to-r from-violet-50 to-transparent dark:from-violet-950/20 dark:to-transparent border border-violet-200 dark:border-violet-800/40"
                  >
                    <div className="flex items-start gap-3">
                      <Lightbulb className="w-5 h-5 text-violet-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-neutral-800 dark:text-neutral-200">{insight.insight}</p>
                        <p className="text-[10px] text-neutral-500 mt-1">
                          Confianca: {Math.round(insight.confianca)}% &middot; n={insight.n} sessoes
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
