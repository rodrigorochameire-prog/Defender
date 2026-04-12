"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, useMotionValue, useTransform, animate, AnimatePresence } from "motion/react";
import {
  BarChart3,
  Download,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  Users2,
  Clock,
  Gavel,
  Filter,
  RefreshCw,
  Lock,
  ArrowRight,
  Flame,
  X,
  Calendar,
  Zap,
  Timer,
  PauseCircle,
  Target,
  Activity,
  CalendarClock,
  PlusCircle,
} from "lucide-react";
import {
  Bar,
  BarChart,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
  Cell,
} from "recharts";
import Link from "next/link";
import { trpc } from "@/lib/trpc/client";
import { useDefensor } from "@/contexts/defensor-context";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Design tokens LOCAIS — harmônicos com page header (mesma família neutral)
// mas leves: superfícies claras, valores em charcoal como acento tipográfico.
// ---------------------------------------------------------------------------

const KPI = {
  // Card principal — branco airy (light) / zinc muito escuro (dark)
  card: "rounded-xl bg-white/95 dark:bg-[#1c1c1f] border border-neutral-200/70 dark:border-white/[0.05] shadow-[0_1px_0_0_rgba(15,23,42,0.02),0_1px_2px_0_rgba(15,23,42,0.03)]",
  // Compact strip (HOJE) — levemente mais escuro pra rhythm sutil
  cardCompact:
    "rounded-xl bg-neutral-50/80 dark:bg-[#17171a] border border-neutral-200/70 dark:border-white/[0.04]",
  // Hover bem sutil
  hover: "hover:bg-white dark:hover:bg-[#1f1f22] transition-colors duration-200",
  // Ícone container — subtle neutral
  iconWrap:
    "w-7 h-7 rounded-lg bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center",
  iconColor: "text-neutral-700 dark:text-neutral-300",
  // Tipografia
  label: "text-[9px] uppercase tracking-wider font-semibold text-neutral-500 dark:text-neutral-400",
  labelSm:
    "text-[8px] uppercase tracking-wider font-semibold text-neutral-400 dark:text-neutral-500",
  // Valores em charcoal (#414144 light / white dark) — ponte visual com o header
  value:
    "font-sans font-semibold tracking-tight tabular-nums text-[#414144] dark:text-neutral-100",
  valueSub: "text-[10px] text-neutral-500 dark:text-neutral-500 mt-0.5",
  divider: "w-[1px] h-3.5 bg-neutral-200 dark:bg-white/[0.08]",
} as const;

// ---------------------------------------------------------------------------
// Labels e cores
// ---------------------------------------------------------------------------

const ATRIB_LABEL: Record<string, string> = {
  JURI_CAMACARI: "Júri",
  VVD_CAMACARI: "VVD",
  EXECUCAO_PENAL: "Exec. Penal",
  SUBSTITUICAO: "Substituição",
  SUBSTITUICAO_CIVEL: "Subst. Cível",
  GRUPO_JURI: "Grupo Júri",
  SEM_PROCESSO: "Sem processo",
};

const ATRIB_COLOR: Record<string, string> = {
  JURI_CAMACARI: "#10b981",
  GRUPO_JURI: "#059669",
  VVD_CAMACARI: "#f59e0b",
  EXECUCAO_PENAL: "#0ea5e9",
  SUBSTITUICAO: "#a1a1aa",
  SUBSTITUICAO_CIVEL: "#71717a",
  SEM_PROCESSO: "#52525b",
};

const STATUS_LABEL: Record<string, string> = {
  "2_ATENDER": "Atender",
  "4_MONITORAR": "Monitorar",
  "5_TRIAGEM": "Triagem",
  "7_CIENCIA": "Ciência",
  "7_PROTOCOLADO": "Protocolado",
  URGENTE: "Urgente",
  CONCLUIDO: "Concluído",
};

const PRAZO_COLORS = {
  vencido: "#ef4444",
  urgente: "#f97316",
  proximo: "#eab308",
  medio: "#3b82f6",
  longo: "#a1a1aa",
};

const AGING_COLORS = {
  a_0_7: "#22c55e",
  b_7_15: "#eab308",
  c_15_30: "#f97316",
  d_30_60: "#ef4444",
  e_60_plus: "#991b1b",
};

const AGING_LABELS = {
  a_0_7: "0–7d",
  b_7_15: "7–15d",
  c_15_30: "15–30d",
  d_30_60: "30–60d",
  e_60_plus: "60d+",
};

// ---------------------------------------------------------------------------
// Contador animado
// ---------------------------------------------------------------------------

function AnimatedNumber({
  value,
  duration = 1.0,
  suffix = "",
  decimals = 0,
}: {
  value: number;
  duration?: number;
  suffix?: string;
  decimals?: number;
}) {
  const count = useMotionValue(0);
  const rounded = useTransform(count, (latest) => {
    const num = decimals > 0 ? latest.toFixed(decimals) : Math.round(latest).toLocaleString("pt-BR");
    return `${num}${suffix}`;
  });

  useEffect(() => {
    const controls = animate(count, value, { duration, ease: [0.22, 1, 0.36, 1] });
    return controls.stop;
  }, [value, count, duration]);

  return <motion.span>{rounded}</motion.span>;
}

// ---------------------------------------------------------------------------
// Badge delta (tendência com cor)
// ---------------------------------------------------------------------------

function DeltaBadge({
  delta,
  goodWhenPositive = true,
}: {
  delta: number;
  goodWhenPositive?: boolean;
}) {
  if (delta === 0) {
    return (
      <span className="inline-flex items-center gap-0.5 text-[9px] font-semibold text-neutral-400 dark:text-neutral-500 tabular-nums">
        —
      </span>
    );
  }

  const isPositive = delta > 0;
  const isGood = goodWhenPositive ? isPositive : !isPositive;
  const colorClass = isGood
    ? "text-emerald-600 dark:text-emerald-500"
    : "text-red-600 dark:text-red-500";
  const Icon = isPositive ? TrendingUp : TrendingDown;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 text-[9px] font-semibold tabular-nums",
        colorClass,
      )}
    >
      <Icon className="w-2.5 h-2.5" />
      {isPositive ? "+" : ""}
      {delta}
    </span>
  );
}

// ---------------------------------------------------------------------------
// MainStatCard (4 grandes no topo)
// ---------------------------------------------------------------------------

function MainStatCard({
  label,
  value,
  icon: Icon,
  accent,
  sublabel,
  delta,
  deltaGoodPositive,
  delay = 0,
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  accent?: "danger" | "warning" | "success" | "neutral";
  sublabel?: string;
  delta?: number;
  deltaGoodPositive?: boolean;
  delay?: number;
}) {
  const accentColor =
    accent === "danger"
      ? "text-red-600 dark:text-red-500"
      : accent === "warning"
        ? "text-amber-600 dark:text-amber-500"
        : accent === "success"
          ? "text-emerald-600 dark:text-emerald-500"
          : "";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay, ease: [0.22, 1, 0.36, 1] }}
      className={cn(KPI.card, "p-4", KPI.hover)}
    >
      <div className="flex items-center justify-between mb-3">
        <span className={KPI.label}>{label}</span>
        <Icon className="w-3.5 h-3.5 text-neutral-400 dark:text-neutral-500" />
      </div>
      <div className={cn(KPI.value, "text-3xl", accentColor)}>
        <AnimatedNumber value={value} />
      </div>
      <div className="flex items-center justify-between mt-1">
        {sublabel && <span className={KPI.valueSub}>{sublabel}</span>}
        {delta !== undefined && <DeltaBadge delta={delta} goodWhenPositive={deltaGoodPositive} />}
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// TickerCell — item da HOJE strip
// ---------------------------------------------------------------------------

function TickerCell({
  label,
  value,
  icon: Icon,
  accent,
}: {
  label: string;
  value: number | string;
  icon: React.ComponentType<{ className?: string }>;
  accent?: "danger" | "warning" | "success";
}) {
  const colorClass =
    accent === "danger"
      ? "text-red-600 dark:text-red-500"
      : accent === "warning"
        ? "text-amber-600 dark:text-amber-500"
        : accent === "success"
          ? "text-emerald-600 dark:text-emerald-500"
          : "";

  return (
    <div className="flex items-center gap-2 min-w-0">
      <Icon
        className={cn(
          "w-3 h-3 shrink-0",
          accent ? colorClass : "text-neutral-400 dark:text-neutral-500",
        )}
      />
      <div className="flex items-baseline gap-1.5 min-w-0">
        <span className={cn(KPI.value, "text-sm", colorClass)}>
          {typeof value === "number" ? <AnimatedNumber value={value} /> : value}
        </span>
        <span className={KPI.labelSm}>{label}</span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ChartCard (cards com gráficos)
// ---------------------------------------------------------------------------

function ChartCard({
  title,
  subtitle,
  icon: Icon,
  children,
  delay = 0,
  className,
}: {
  title: string;
  subtitle?: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: [0.22, 1, 0.36, 1] }}
      className={cn(KPI.card, "p-5", className)}
    >
      <div className="flex items-center gap-2.5 mb-4">
        <div className={KPI.iconWrap}>
          <Icon className={cn("w-3.5 h-3.5", KPI.iconColor)} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-[13px] font-semibold uppercase tracking-wide text-neutral-900 dark:text-neutral-100">
            {title}
          </h3>
          {subtitle && (
            <p className="text-[10px] text-neutral-500 dark:text-neutral-400 mt-0.5">{subtitle}</p>
          )}
        </div>
      </div>
      {children}
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Seção principal
// ---------------------------------------------------------------------------

export function KpisSection({ onClose }: { onClose?: () => void }) {
  const { selectedDefensorId, selectedDefensor } = useDefensor();
  const [comarcaId, setComarcaId] = useState<number | null>(null);
  const [showRelatorioDetail, setShowRelatorioDetail] = useState(false);

  const scope = useMemo(
    () => ({
      defensorId: selectedDefensorId ?? undefined,
      comarcaId: comarcaId ?? undefined,
    }),
    [selectedDefensorId, comarcaId],
  );

  // Queries
  const summaryQ = trpc.kpis.summary.useQuery(scope);
  const throughputQ = trpc.kpis.throughput.useQuery(scope);
  const backlogQ = trpc.kpis.backlog.useQuery(scope);
  const prazosQ = trpc.kpis.prazos.useQuery(scope);
  const topAtosQ = trpc.kpis.topAtos.useQuery({ ...scope, limit: 10 });
  const cargaQ = trpc.kpis.cargaDefensor.useQuery(scope);
  const presosQ = trpc.kpis.presosUrgentes.useQuery(scope);
  const agingQ = trpc.kpis.backlogAging.useQuery(scope);
  const audienciasProxQ = trpc.kpis.audienciasProximas.useQuery(scope);
  const semAtendQ = trpc.kpis.semAtendimento.useQuery(scope);
  const relatorioScope = {
    defensorId: selectedDefensorId ?? undefined,
    ano: new Date().getFullYear(),
    semestre: (new Date().getMonth() < 6 ? "1" : "2") as "1" | "2",
  };
  const relatorioQ = trpc.kpis.relatorioResumo.useQuery(relatorioScope);
  const relatorioDetalhadoQ = trpc.kpis.relatorioDetalhado.useQuery(relatorioScope, {
    enabled: showRelatorioDetail,
  });
  const comarcasQ = trpc.comarcas.listRMS.useQuery();

  const utils = trpc.useUtils();
  const isRefreshing =
    summaryQ.isFetching ||
    throughputQ.isFetching ||
    backlogQ.isFetching ||
    prazosQ.isFetching ||
    agingQ.isFetching;

  const handleRefresh = async () => {
    await Promise.all([
      utils.kpis.summary.invalidate(),
      utils.kpis.throughput.invalidate(),
      utils.kpis.backlog.invalidate(),
      utils.kpis.prazos.invalidate(),
      utils.kpis.topAtos.invalidate(),
      utils.kpis.cargaDefensor.invalidate(),
      utils.kpis.presosUrgentes.invalidate(),
      utils.kpis.backlogAging.invalidate(),
      utils.kpis.audienciasProximas.invalidate(),
      utils.kpis.semAtendimento.invalidate(),
      utils.kpis.relatorioResumo.invalidate(),
    ]);
  };

  const summary = summaryQ.data;
  const throughput = throughputQ.data ?? [];
  const backlog = backlogQ.data ?? [];
  const prazos = prazosQ.data;
  const topAtos = topAtosQ.data ?? [];
  const carga = cargaQ.data ?? [];
  const presos = presosQ.data ?? [];
  const aging = agingQ.data;
  const audienciasProx = audienciasProxQ.data ?? [];
  const semAtend = semAtendQ.data;
  const relatorio = relatorioQ.data ?? [];
  const comarcas = comarcasQ.data ?? [];

  const defensorLabel = selectedDefensor?.name ?? "Visão Geral";
  const comarcaLabel = comarcaId
    ? comarcas.find((c) => c.id === comarcaId)?.nome ?? "—"
    : "Todas as comarcas";

  // -- Transforms -----------------------------------------------------------
  const backlogChartData = useMemo(() => {
    const byAtrib = new Map<string, Record<string, number | string>>();
    for (const row of backlog) {
      const key = row.atribuicao;
      if (!byAtrib.has(key)) byAtrib.set(key, { atribuicao: ATRIB_LABEL[key] ?? key });
      const entry = byAtrib.get(key)!;
      const statusLabel = STATUS_LABEL[row.status] ?? row.status;
      entry[statusLabel] = ((entry[statusLabel] as number | undefined) ?? 0) + row.total;
    }
    return Array.from(byAtrib.values());
  }, [backlog]);

  const statusKeys = useMemo(() => {
    const set = new Set<string>();
    for (const row of backlog) set.add(STATUS_LABEL[row.status] ?? row.status);
    return Array.from(set);
  }, [backlog]);

  const statusColors = ["#18181b", "#27272a", "#3f3f46", "#52525b", "#71717a", "#a1a1aa", "#d4d4d8"];

  const throughputChartData = useMemo(
    () =>
      throughput.map((r) => ({
        ...r,
        semanaLabel: new Date(r.semana).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
      })),
    [throughput],
  );

  const topAtosChartData = useMemo(
    () =>
      topAtos.map((r) => ({
        ato: r.ato.length > 40 ? r.ato.slice(0, 37) + "…" : r.ato,
        total: r.total,
        ativas: r.ativas,
      })),
    [topAtos],
  );

  const cargaChartData = useMemo(() => {
    const byDef = new Map<number, { defensorNome: string; ativas: number; concluidas: number; total: number }>();
    for (const row of carga) {
      if (!byDef.has(row.defensorId)) {
        byDef.set(row.defensorId, { defensorNome: row.defensorNome, ativas: 0, concluidas: 0, total: 0 });
      }
      const entry = byDef.get(row.defensorId)!;
      entry.ativas += row.ativas;
      entry.concluidas += row.concluidas;
      entry.total += row.total;
    }
    return Array.from(byDef.values()).sort((a, b) => b.ativas - a.ativas);
  }, [carga]);

  const prazosBuckets = [
    { key: "vencido", label: "Vencidas", value: prazos?.vencido ?? 0, color: PRAZO_COLORS.vencido },
    { key: "urgente", label: "≤ 3 dias", value: prazos?.urgente ?? 0, color: PRAZO_COLORS.urgente },
    { key: "proximo", label: "≤ 7 dias", value: prazos?.proximo ?? 0, color: PRAZO_COLORS.proximo },
    { key: "medio", label: "≤ 30 dias", value: prazos?.medio ?? 0, color: PRAZO_COLORS.medio },
    { key: "longo", label: "> 30 dias", value: prazos?.longo ?? 0, color: PRAZO_COLORS.longo },
  ];
  const prazosTotal = prazosBuckets.reduce((acc, b) => acc + b.value, 0);

  // Backlog aging chart (horizontal bar segmentado)
  const agingBuckets = [
    { key: "a_0_7", label: AGING_LABELS.a_0_7, value: aging?.a_0_7 ?? 0, color: AGING_COLORS.a_0_7 },
    { key: "b_7_15", label: AGING_LABELS.b_7_15, value: aging?.b_7_15 ?? 0, color: AGING_COLORS.b_7_15 },
    { key: "c_15_30", label: AGING_LABELS.c_15_30, value: aging?.c_15_30 ?? 0, color: AGING_COLORS.c_15_30 },
    { key: "d_30_60", label: AGING_LABELS.d_30_60, value: aging?.d_30_60 ?? 0, color: AGING_COLORS.d_30_60 },
    { key: "e_60_plus", label: AGING_LABELS.e_60_plus, value: aging?.e_60_plus ?? 0, color: AGING_COLORS.e_60_plus },
  ];
  const agingTotal = agingBuckets.reduce((acc, b) => acc + b.value, 0);

  // Relatório semestral — 6 colunas (meses) com barras por seção
  const MESES_LABEL = ["", "JAN", "FEV", "MAR", "ABR", "MAI", "JUN", "JUL", "AGO", "SET", "OUT", "NOV", "DEZ"];
  const semestreAtual = new Date().getMonth() < 6 ? 1 : 2;
  const mesesRange = semestreAtual === 1 ? [1, 2, 3, 4, 5, 6] : [7, 8, 9, 10, 11, 12];

  const relatorioByMes = useMemo(() => {
    const map = new Map<number, { judicial: number; extrajudicial: number }>();
    for (const m of mesesRange) map.set(m, { judicial: 0, extrajudicial: 0 });
    for (const r of relatorio) {
      const entry = map.get(r.mes);
      if (!entry) continue;
      if (r.secao.includes("JUDICIAIS")) entry.judicial += r.total;
      else entry.extrajudicial += r.total;
    }
    return mesesRange.map((m) => ({
      mes: m,
      label: MESES_LABEL[m] ?? `M${m}`,
      judicial: map.get(m)?.judicial ?? 0,
      extrajudicial: map.get(m)?.extrajudicial ?? 0,
      total: (map.get(m)?.judicial ?? 0) + (map.get(m)?.extrajudicial ?? 0),
    }));
  }, [relatorio, mesesRange]);

  const relatorioTotal = relatorioByMes.reduce((acc, m) => acc + m.total, 0);
  const relatorioJudicial = relatorioByMes.reduce((acc, m) => acc + m.judicial, 0);
  const relatorioExtrajudicial = relatorioByMes.reduce((acc, m) => acc + m.extrajudicial, 0);

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className="overflow-hidden"
    >
      <div className="space-y-3 pb-1">
        {/* ============================================================ */}
        {/* Toolbar — título, escopo, filtro, refresh, close             */}
        {/* ============================================================ */}
        <div
          className={cn(
            KPI.card,
            "px-4 py-3 flex items-center justify-between gap-3 flex-wrap",
          )}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className={cn(KPI.iconWrap, "shrink-0")}>
              <BarChart3 className={cn("w-3.5 h-3.5", KPI.iconColor)} />
            </div>
            <div className="min-w-0">
              <h2 className="text-[13px] font-semibold uppercase tracking-wide text-neutral-900 dark:text-neutral-100">
                KPIs Operacionais
              </h2>
              <div className="flex items-center gap-1.5 text-[10px] text-neutral-500 dark:text-neutral-400 mt-0.5">
                <span className="truncate">{defensorLabel}</span>
                <span className="w-[3px] h-[3px] rounded-full bg-neutral-300 dark:bg-neutral-600" />
                <span className="truncate">{comarcaLabel}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <div className="flex items-center gap-1.5 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200/70 dark:hover:bg-neutral-700/50 transition-colors rounded-lg px-2.5 py-1.5 border border-neutral-200/60 dark:border-neutral-800/60">
              <Filter className="w-3 h-3 text-neutral-500 dark:text-neutral-400" />
              <select
                className="bg-transparent text-[11px] outline-none cursor-pointer text-neutral-700 dark:text-neutral-200"
                value={comarcaId ?? ""}
                onChange={(e) => setComarcaId(e.target.value ? Number(e.target.value) : null)}
              >
                <option value="">Todas as comarcas</option>
                {comarcas.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              title="Atualizar"
              className="h-7 w-7 rounded-lg border border-neutral-200/60 dark:border-neutral-800/60 hover:bg-neutral-100 dark:hover:bg-neutral-800/50 transition-colors flex items-center justify-center disabled:opacity-50 cursor-pointer text-neutral-600 dark:text-neutral-300"
            >
              <RefreshCw className={cn("w-3 h-3", isRefreshing && "animate-spin")} />
            </button>

            {onClose && (
              <button
                onClick={onClose}
                title="Fechar"
                className="h-7 w-7 rounded-lg border border-neutral-200/60 dark:border-neutral-800/60 hover:bg-neutral-100 dark:hover:bg-neutral-800/50 transition-colors flex items-center justify-center cursor-pointer text-neutral-600 dark:text-neutral-300"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* ============================================================ */}
        {/* HOJE — ticker compacto (altura única)                        */}
        {/* ============================================================ */}
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.02 }}
          className={cn(
            KPI.cardCompact,
            "px-4 py-2.5 flex items-center gap-5 flex-wrap",
          )}
        >
          <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground pr-2 border-r border-neutral-200/60 dark:border-neutral-800/60">
            <CalendarClock className="w-3 h-3" />
            Hoje
          </span>
          <TickerCell
            label="vencem hoje"
            value={summary?.vencemHoje ?? 0}
            icon={AlertTriangle}
            accent={(summary?.vencemHoje ?? 0) > 0 ? "danger" : undefined}
          />
          <TickerCell
            label="criadas hoje"
            value={summary?.criadasHoje ?? 0}
            icon={PlusCircle}
          />
          <TickerCell
            label="réu preso ativas"
            value={summary?.reuPresoAtivas ?? 0}
            icon={Lock}
            accent={(summary?.reuPresoAtivas ?? 0) > 0 ? "warning" : undefined}
          />
          <TickerCell
            label="encalhadas"
            value={summary?.encalhadas ?? 0}
            icon={PauseCircle}
            accent={(summary?.encalhadas ?? 0) > 0 ? "warning" : undefined}
          />
        </motion.div>

        {/* ============================================================ */}
        {/* ESTADO — 4 cards grandes                                      */}
        {/* ============================================================ */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <MainStatCard
            label="Ativas"
            value={summary?.ativas ?? 0}
            icon={Activity}
            sublabel={`${summary?.total ?? 0} no total`}
            delay={0}
          />
          <MainStatCard
            label="Vencidas"
            value={summary?.vencidas ?? 0}
            icon={AlertTriangle}
            accent={(summary?.vencidas ?? 0) > 0 ? "danger" : "neutral"}
            sublabel="prazo expirado"
            delay={0.05}
          />
          <MainStatCard
            label="Urgentes"
            value={summary?.urgentes ?? 0}
            icon={Clock}
            accent={(summary?.urgentes ?? 0) > 0 ? "warning" : "neutral"}
            sublabel="≤ 3 dias"
            delay={0.1}
          />
          <MainStatCard
            label="Concluídas no mês"
            value={summary?.concluidasMes ?? 0}
            icon={CheckCircle2}
            accent="success"
            sublabel={`${summary?.concluidas ?? 0} no histórico`}
            delay={0.15}
          />
        </div>

        {/* ============================================================ */}
        {/* PERFORMANCE — 3 cards (SLA, velocidade, tempo médio)          */}
        {/* ============================================================ */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.2 }}
            className={cn(KPI.card, "p-4")}
          >
            <div className="flex items-center justify-between mb-3">
              <span className={KPI.label}>SLA — dentro do prazo</span>
              <Target className="w-3.5 h-3.5 text-neutral-400 dark:text-neutral-500" />
            </div>
            {summary?.slaHitRate === null || summary?.slaSample === 0 ? (
              <div className={cn(KPI.value, "text-3xl text-neutral-300 dark:text-neutral-600")}>—</div>
            ) : (
              <div
                className={cn(
                  KPI.value,
                  "text-3xl",
                  (summary?.slaHitRate ?? 0) >= 80
                    ? "text-emerald-600 dark:text-emerald-500"
                    : (summary?.slaHitRate ?? 0) >= 50
                      ? "text-amber-600 dark:text-amber-500"
                      : "text-red-600 dark:text-red-500",
                )}
              >
                <AnimatedNumber value={summary?.slaHitRate ?? 0} suffix="%" decimals={0} />
              </div>
            )}
            <div className={KPI.valueSub}>
              {summary?.slaSample === 0
                ? "sem amostra com prazo + data_conclusao"
                : `${summary?.slaSample ?? 0} conclu. com prazo`}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.25 }}
            className={cn(KPI.card, "p-4")}
          >
            <div className="flex items-center justify-between mb-3">
              <span className={KPI.label}>Velocidade 7d</span>
              <Zap className="w-3.5 h-3.5 text-neutral-400 dark:text-neutral-500" />
            </div>
            <div className={cn(KPI.value, "text-3xl")}>
              <AnimatedNumber value={summary?.concluidas7d ?? 0} />
            </div>
            <div className="flex items-center justify-between mt-1">
              <span className={KPI.valueSub}>{summary?.concluidas7dAnterior ?? 0} na semana anterior</span>
              <DeltaBadge delta={summary?.velocidadeDelta ?? 0} goodWhenPositive />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.3 }}
            className={cn(KPI.card, "p-4")}
          >
            <div className="flex items-center justify-between mb-3">
              <span className={KPI.label}>Tempo médio — entrada → conclusão</span>
              <Timer className="w-3.5 h-3.5 text-neutral-400 dark:text-neutral-500" />
            </div>
            {(summary?.tempoMedioRespostaDias ?? 0) === 0 ? (
              <div className={cn(KPI.value, "text-3xl text-neutral-300 dark:text-neutral-600")}>—</div>
            ) : (
              <div className={cn(KPI.value, "text-3xl")}>
                <AnimatedNumber
                  value={summary?.tempoMedioRespostaDias ?? 0}
                  decimals={1}
                  suffix=" d"
                />
              </div>
            )}
            <div className={KPI.valueSub}>média por demanda concluída</div>
          </motion.div>
        </div>

        {/* ============================================================ */}
        {/* SAÚDE DO BACKLOG — barra segmentada horizontal                */}
        {/* ============================================================ */}
        {agingTotal > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.35 }}
            className={cn(KPI.card, "p-5")}
          >
            <div className="flex items-center gap-2.5 mb-4">
              <div className={KPI.iconWrap}>
                <Activity className={cn("w-3.5 h-3.5", KPI.iconColor)} />
              </div>
              <div>
                <h3 className="text-[13px] font-semibold uppercase tracking-wide text-neutral-900 dark:text-neutral-100">
                  Saúde do backlog
                </h3>
                <p className="text-[10px] text-neutral-500 dark:text-neutral-400 mt-0.5">
                  Idade das demandas ativas — quanto mais à direita, mais crônico
                </p>
              </div>
              <span className="ml-auto text-[10px] text-neutral-500 dark:text-neutral-400 tabular-nums">
                {agingTotal} ativas
              </span>
            </div>

            <div className="flex items-center h-8 w-full rounded-lg overflow-hidden ring-1 ring-neutral-200/60 dark:ring-neutral-800/60">
              {agingBuckets.map((b, i) => {
                const pct = (b.value / agingTotal) * 100;
                if (pct === 0) return null;
                return (
                  <motion.div
                    key={b.key}
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.8, delay: 0.4 + i * 0.06, ease: [0.22, 1, 0.36, 1] }}
                    className="h-full flex items-center justify-center text-[10px] font-semibold text-white"
                    style={{ backgroundColor: b.color }}
                    title={`${b.label}: ${b.value} (${pct.toFixed(0)}%)`}
                  >
                    {pct >= 6 ? b.value : ""}
                  </motion.div>
                );
              })}
            </div>

            <div className="flex items-center justify-between mt-3 flex-wrap gap-2">
              {agingBuckets.map((b) => (
                <div key={b.key} className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-sm" style={{ backgroundColor: b.color }} />
                  <span className="text-[10px] text-neutral-600 dark:text-neutral-300 font-medium">
                    {b.label}
                  </span>
                  <span className="text-[10px] text-neutral-400 dark:text-neutral-500 tabular-nums">
                    {b.value}
                    {agingTotal > 0 ? ` (${((b.value / agingTotal) * 100).toFixed(0)}%)` : ""}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* ============================================================ */}
        {/* Alerta réu preso urgente                                      */}
        {/* ============================================================ */}
        <AnimatePresence>
          {presos.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.3 }}
              className="rounded-xl border border-red-500/30 bg-red-50/80 dark:bg-red-950/20 overflow-hidden"
            >
              <div className="px-4 py-2.5 border-b border-red-500/20 flex items-center gap-2">
                <Flame className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />
                <h3 className="text-[11px] font-semibold uppercase tracking-wide text-red-700 dark:text-red-300">
                  Réu Preso — Prazo ≤ 5 dias
                </h3>
                <span className="ml-auto text-[9px] uppercase tracking-wider text-red-600/70 dark:text-red-400/70 font-semibold">
                  {presos.length} {presos.length === 1 ? "caso" : "casos"}
                </span>
              </div>
              <ul className="divide-y divide-red-500/15 max-h-[280px] overflow-y-auto">
                {presos.map((p, i) => (
                  <motion.li
                    key={p.id}
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.03 }}
                  >
                    <Link
                      href={p.assistidoId ? `/admin/assistidos/${p.assistidoId}` : `/admin/demandas`}
                      className="px-4 py-2 flex items-center gap-3 text-xs hover:bg-red-500/10 transition-colors group"
                    >
                      <span
                        className={cn(
                          "font-mono text-[11px] font-bold w-10 text-center tabular-nums shrink-0",
                          p.diasAtePrazo < 0
                            ? "text-red-700 dark:text-red-300"
                            : "text-red-600 dark:text-red-400",
                        )}
                      >
                        {p.diasAtePrazo < 0 ? `${p.diasAtePrazo}d` : `+${p.diasAtePrazo}d`}
                      </span>
                      <Lock className="w-3 h-3 text-red-600/60 dark:text-red-400/70 shrink-0" />
                      <span className="font-medium text-neutral-900 dark:text-white/90 truncate flex-1 min-w-0">
                        {p.assistidoNome ?? "(sem assistido)"}
                      </span>
                      <span className="text-neutral-500 dark:text-white/50 truncate max-w-[180px] shrink">
                        {p.ato}
                      </span>
                      <span
                        className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase tracking-wider text-white shrink-0"
                        style={{ backgroundColor: ATRIB_COLOR[p.atribuicao] ?? "#52525b" }}
                      >
                        {ATRIB_LABEL[p.atribuicao] ?? p.atribuicao}
                      </span>
                      <ArrowRight className="w-3 h-3 text-red-600/40 dark:text-red-400/40 group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors shrink-0" />
                    </Link>
                  </motion.li>
                ))}
              </ul>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ============================================================ */}
        {/* Charts grid                                                   */}
        {/* ============================================================ */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {/* Backlog */}
          <ChartCard title="Backlog por atribuição" subtitle="Barras empilhadas por status" icon={BarChart3} delay={0.4}>
            {backlogChartData.length === 0 ? (
              <EmptyState text="Sem demandas no escopo selecionado" />
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={backlogChartData} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.12} vertical={false} />
                  <XAxis dataKey="atribuicao" tick={{ fontSize: 11, fill: "currentColor", opacity: 0.6 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "currentColor", opacity: 0.6 }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      background: "#18181b",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: 8,
                      fontSize: 12,
                      color: "#fff",
                    }}
                    cursor={{ fill: "rgba(255,255,255,0.04)" }}
                  />
                  {statusKeys.map((key, idx) => (
                    <Bar
                      key={key}
                      dataKey={key}
                      stackId="a"
                      fill={statusColors[idx % statusColors.length]}
                      radius={idx === statusKeys.length - 1 ? [6, 6, 0, 0] : 0}
                      animationDuration={800}
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>

          {/* Prazos */}
          <ChartCard title="Distribuição de prazos" subtitle="Por urgência" icon={Clock} delay={0.45}>
            {prazosTotal === 0 ? (
              <EmptyState text="Nenhuma demanda ativa com prazo definido" />
            ) : (
              <div className="space-y-3 pt-1">
                {prazosBuckets.map((b, i) => {
                  const pct = prazosTotal > 0 ? (b.value / prazosTotal) * 100 : 0;
                  return (
                    <motion.div
                      key={b.key}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.45 + i * 0.05 }}
                    >
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="font-medium text-neutral-700 dark:text-neutral-300">
                          {b.label}
                        </span>
                        <span className="font-mono tabular-nums text-neutral-500 dark:text-neutral-400">
                          {b.value}{" "}
                          <span className="text-neutral-400 dark:text-neutral-500">
                            ({pct.toFixed(0)}%)
                          </span>
                        </span>
                      </div>
                      <div className="h-2 bg-neutral-100 dark:bg-white/[0.06] rounded-full overflow-hidden">
                        <motion.div
                          className="h-full rounded-full"
                          style={{ backgroundColor: b.color }}
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ duration: 0.8, delay: 0.55 + i * 0.05, ease: [0.22, 1, 0.36, 1] }}
                        />
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </ChartCard>

          {/* Throughput */}
          <ChartCard title="Throughput semanal" subtitle="12 semanas — criadas vs concluídas" icon={TrendingUp} delay={0.5}>
            {throughputChartData.length === 0 ? (
              <EmptyState text="Sem histórico no escopo selecionado" />
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={throughputChartData} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.12} vertical={false} />
                  <XAxis dataKey="semanaLabel" tick={{ fontSize: 11, fill: "currentColor", opacity: 0.6 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "currentColor", opacity: 0.6 }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      background: "#18181b",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: 8,
                      fontSize: 12,
                      color: "#fff",
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="criadas"
                    name="Criadas"
                    stroke="#18181b"
                    strokeWidth={2.5}
                    dot={{ r: 3, fill: "#18181b" }}
                    activeDot={{ r: 5 }}
                    animationDuration={900}
                  />
                  <Line
                    type="monotone"
                    dataKey="concluidas"
                    name="Concluídas"
                    stroke="#10b981"
                    strokeWidth={2.5}
                    dot={{ r: 3, fill: "#10b981" }}
                    activeDot={{ r: 5 }}
                    animationDuration={900}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </ChartCard>

          {/* Top atos */}
          <ChartCard title="Top 10 atos" subtitle="Ranking por frequência" icon={Gavel} delay={0.55}>
            {topAtosChartData.length === 0 ? (
              <EmptyState text="Sem atos no escopo selecionado" />
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={topAtosChartData} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.12} horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11, fill: "currentColor", opacity: 0.6 }} axisLine={false} tickLine={false} />
                  <YAxis
                    type="category"
                    dataKey="ato"
                    tick={{ fontSize: 11, fill: "currentColor", opacity: 0.75 }}
                    axisLine={false}
                    tickLine={false}
                    width={170}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "#18181b",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: 8,
                      fontSize: 12,
                      color: "#fff",
                    }}
                    cursor={{ fill: "rgba(255,255,255,0.04)" }}
                  />
                  <Bar dataKey="total" radius={[0, 6, 6, 0]} animationDuration={900}>
                    {topAtosChartData.map((_, idx) => (
                      <Cell key={idx} fill={`hsl(0, 0%, ${22 + idx * 4}%)`} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>
        </div>

        {/* Audiências próximas + Sem atendimento */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {/* Audiências próximas 7 dias */}
          <ChartCard
            title="Audiências próximas"
            subtitle={`${audienciasProx.length} nos próximos 7 dias`}
            icon={Clock}
            delay={0.55}
          >
            {audienciasProx.length === 0 ? (
              <EmptyState text="Nenhuma audiência nos próximos 7 dias" />
            ) : (
              <ul className="divide-y divide-neutral-100 dark:divide-neutral-800/40 max-h-[240px] overflow-y-auto scrollbar-none -mx-1">
                {audienciasProx.slice(0, 8).map((a) => (
                  <li key={a.id} className="px-1 py-2 flex items-center gap-3 text-xs">
                    <span
                      className={cn(
                        "font-mono text-[11px] font-bold w-8 text-center tabular-nums shrink-0",
                        a.diasRestantes === 0
                          ? "text-red-600 dark:text-red-500"
                          : a.diasRestantes <= 1
                            ? "text-amber-600 dark:text-amber-500"
                            : "text-neutral-500",
                      )}
                    >
                      {a.diasRestantes === 0 ? "HOJE" : `+${a.diasRestantes}d`}
                    </span>
                    <div className="flex-1 min-w-0">
                      <span className="font-medium text-neutral-800 dark:text-neutral-200 truncate block">
                        {a.assistidoNome ?? a.titulo ?? a.tipo}
                      </span>
                      <span className="text-[10px] text-neutral-500 dark:text-neutral-400 truncate block">
                        {a.tipo} {a.local ? `· ${a.local}` : ""}
                      </span>
                    </div>
                    <span className="text-[10px] text-neutral-400 dark:text-neutral-500 font-mono tabular-nums shrink-0">
                      {new Date(a.data).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </ChartCard>

          {/* Assistidos sem atendimento > 30 dias */}
          <ChartCard
            title="Sem atendimento recente"
            subtitle={`${semAtend?.total ?? 0} assistidos > 30 dias sem registro`}
            icon={AlertTriangle}
            delay={0.6}
          >
            {!semAtend || semAtend.total === 0 ? (
              <EmptyState text="Todos os assistidos com atendimento recente" />
            ) : (
              <ul className="divide-y divide-neutral-100 dark:divide-neutral-800/40 max-h-[240px] overflow-y-auto scrollbar-none -mx-1">
                {semAtend.topAssistidos.map((a) => (
                  <li key={a.id} className="px-1 py-2 flex items-center gap-3 text-xs">
                    <span
                      className={cn(
                        "font-mono text-[11px] font-bold w-12 text-center tabular-nums shrink-0",
                        a.diasSemAtendimento === null
                          ? "text-red-600 dark:text-red-500"
                          : a.diasSemAtendimento > 60
                            ? "text-red-600 dark:text-red-500"
                            : "text-amber-600 dark:text-amber-500",
                      )}
                    >
                      {a.diasSemAtendimento === null ? "NUNCA" : `${a.diasSemAtendimento}d`}
                    </span>
                    <div className="flex-1 min-w-0">
                      <span className="font-medium text-neutral-800 dark:text-neutral-200 truncate block">
                        {a.nome}
                      </span>
                      {a.statusPrisional && (
                        <span className="text-[10px] text-neutral-500 dark:text-neutral-400">
                          {a.statusPrisional}
                        </span>
                      )}
                    </div>
                  </li>
                ))}
                {semAtend.total > 10 && (
                  <li className="px-1 py-2 text-center text-[10px] text-neutral-400">
                    + {semAtend.total - 10} outros assistidos
                  </li>
                )}
              </ul>
            )}
          </ChartCard>
        </div>

        {/* Carga por defensor */}
        {cargaChartData.length > 1 && (
          <ChartCard
            title="Carga por defensor"
            subtitle="Demandas ativas por profissional"
            icon={Users2}
            delay={0.6}
          >
            <ResponsiveContainer width="100%" height={Math.max(180, cargaChartData.length * 38)}>
              <BarChart data={cargaChartData} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.12} horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: "currentColor", opacity: 0.6 }} axisLine={false} tickLine={false} />
                <YAxis
                  type="category"
                  dataKey="defensorNome"
                  tick={{ fontSize: 11, fill: "currentColor", opacity: 0.75 }}
                  axisLine={false}
                  tickLine={false}
                  width={170}
                />
                <Tooltip
                  contentStyle={{
                    background: "#18181b",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: 8,
                    fontSize: 12,
                    color: "#fff",
                  }}
                  cursor={{ fill: "rgba(255,255,255,0.04)" }}
                />
                <Bar dataKey="ativas" fill="#18181b" radius={[0, 6, 6, 0]} animationDuration={900} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        )}

        {/* Relatório Semestral — Corregedoria DPE-BA */}
        {relatorioTotal > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.65 }}
            className={cn(KPI.card, "p-5")}
          >
            <div className="flex items-center gap-2.5 mb-4">
              <div className={KPI.iconWrap}>
                <BarChart3 className={cn("w-3.5 h-3.5", KPI.iconColor)} />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-[12px] font-bold uppercase tracking-wide text-neutral-900 dark:text-neutral-100">
                  Relatório Semestral {semestreAtual === 1 ? "2026.1" : "2026.2"}
                </h3>
                <p className="text-[10px] text-neutral-500 dark:text-neutral-400 mt-0.5">
                  Atividades por mês — Corregedoria DPE-BA
                </p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <div className="text-right">
                  <div className={cn(KPI.value, "text-2xl")}>
                    <AnimatedNumber value={relatorioTotal} />
                  </div>
                  <div className="text-[9px] text-neutral-500 dark:text-neutral-400 uppercase tracking-wider font-semibold mt-0.5">
                    atividades
                  </div>
                </div>
              </div>
            </div>

            {/* Grid meses */}
            <div className="grid grid-cols-6 gap-2 mb-4">
              {relatorioByMes.map((m, i) => {
                const maxTotal = Math.max(...relatorioByMes.map((x) => x.total), 1);
                const pctJud = maxTotal > 0 ? (m.judicial / maxTotal) * 100 : 0;
                const pctExt = maxTotal > 0 ? (m.extrajudicial / maxTotal) * 100 : 0;
                const mesAtual = new Date().getMonth() + 1;
                const isAtual = m.mes === mesAtual;
                return (
                  <motion.div
                    key={m.mes}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.7 + i * 0.04 }}
                    className={cn(
                      "flex flex-col items-center gap-1.5 py-2.5 px-1 rounded-lg transition-colors",
                      isAtual
                        ? "bg-emerald-50/80 dark:bg-emerald-950/20 ring-1 ring-emerald-500/30"
                        : "hover:bg-neutral-50 dark:hover:bg-white/[0.02]",
                    )}
                  >
                    <span
                      className={cn(
                        "text-[9px] font-bold uppercase tracking-wider",
                        isAtual ? "text-emerald-600 dark:text-emerald-400" : "text-neutral-400 dark:text-neutral-500",
                      )}
                    >
                      {m.label}
                    </span>
                    {/* Stacked mini bar */}
                    <div className="w-full h-20 flex flex-col-reverse items-center justify-start gap-0.5 px-1">
                      <motion.div
                        className="w-full rounded-t-sm bg-neutral-800 dark:bg-neutral-200"
                        initial={{ height: 0 }}
                        animate={{ height: `${pctJud}%` }}
                        transition={{ duration: 0.6, delay: 0.8 + i * 0.04 }}
                        style={{ minHeight: pctJud > 0 ? 2 : 0 }}
                      />
                      <motion.div
                        className="w-full rounded-t-sm bg-amber-500"
                        initial={{ height: 0 }}
                        animate={{ height: `${pctExt}%` }}
                        transition={{ duration: 0.6, delay: 0.85 + i * 0.04 }}
                        style={{ minHeight: pctExt > 0 ? 2 : 0 }}
                      />
                    </div>
                    <span
                      className={cn(
                        "text-[11px] font-semibold tabular-nums",
                        isAtual ? "text-emerald-700 dark:text-emerald-400" : KPI.value,
                      )}
                    >
                      {m.total}
                    </span>
                  </motion.div>
                );
              })}
            </div>

            {/* Legenda + breakdown */}
            <div className="flex items-center gap-4 text-[10px]">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-neutral-800 dark:bg-neutral-200" />
                <span className="text-neutral-600 dark:text-neutral-300 font-medium">
                  Judiciais
                </span>
                <span className="text-neutral-400 dark:text-neutral-500 tabular-nums font-mono">
                  {relatorioJudicial}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-amber-500" />
                <span className="text-neutral-600 dark:text-neutral-300 font-medium">
                  Extrajudiciais
                </span>
                <span className="text-neutral-400 dark:text-neutral-500 tabular-nums font-mono">
                  {relatorioExtrajudicial}
                </span>
              </div>
              {/* Exportar CSV + Drill-down */}
              <div className="flex items-center gap-2 ml-auto">
                <button
                  onClick={() => {
                    // Force load if not already
                    if (!showRelatorioDetail) setShowRelatorioDetail(true);
                    // Wait for data then export
                    const doExport = () => {
                      const detail = relatorioDetalhadoQ.data;
                      if (!detail?.length) return;
                      // Build CSV: Seção, Categoria, JAN, FEV, MAR, ABR, MAI, JUN, Total
                      const header = ["Seção", "Categoria", ...mesesRange.map((m) => MESES_LABEL[m]), "Total"];
                      const catMap = new Map<string, { secao: string; meses: Map<number, number> }>();
                      for (const r of detail) {
                        const key = `${r.secao}||${r.categoria}`;
                        if (!catMap.has(key)) catMap.set(key, { secao: r.secao, meses: new Map() });
                        const entry = catMap.get(key)!;
                        entry.meses.set(r.mes, (entry.meses.get(r.mes) ?? 0) + r.total);
                      }
                      const rows = Array.from(catMap.entries()).map(([key, val]) => {
                        const cat = key.split("||")[1];
                        const vals = mesesRange.map((m) => val.meses.get(m) ?? 0);
                        const total = vals.reduce((a, b) => a + b, 0);
                        return [val.secao, cat, ...vals.map(String), String(total)];
                      });
                      const csv = [header, ...rows].map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
                      const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = `relatorio-semestral-${relatorioScope.ano}-${relatorioScope.semestre}.csv`;
                      a.click();
                      URL.revokeObjectURL(url);
                    };
                    // If data already loaded, export immediately
                    if (relatorioDetalhadoQ.data?.length) {
                      doExport();
                    } else {
                      // Wait for query to resolve
                      const interval = setInterval(() => {
                        if (relatorioDetalhadoQ.data?.length) {
                          clearInterval(interval);
                          doExport();
                        }
                      }, 200);
                      setTimeout(() => clearInterval(interval), 5000);
                    }
                  }}
                  className="text-[10px] font-semibold text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200 transition-colors cursor-pointer flex items-center gap-1"
                >
                  <Download className="w-3 h-3" />
                  Exportar CSV
                </button>
              <button
                onClick={() => setShowRelatorioDetail(!showRelatorioDetail)}
                className="text-[10px] font-semibold text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200 transition-colors cursor-pointer flex items-center gap-1"
              >
                {showRelatorioDetail ? "Ocultar detalhamento" : "Ver detalhamento"}
                <svg
                  className={cn("w-3 h-3 transition-transform", showRelatorioDetail && "rotate-180")}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              </div>
            </div>

            {/* Drill-down — tabela estilo formulário Corregedoria */}
            <AnimatePresence>
              {showRelatorioDetail && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                  className="overflow-hidden"
                >
                  <div className="mt-4 border-t border-neutral-200/70 dark:border-neutral-700/30 pt-4">
                    {relatorioDetalhadoQ.isLoading ? (
                      <div className="flex items-center gap-2 text-xs text-neutral-400 py-6 justify-center">
                        <RefreshCw className="w-3 h-3 animate-spin" />
                        Carregando detalhamento...
                      </div>
                    ) : (
                      <RelatorioDetailTable
                        data={relatorioDetalhadoQ.data ?? []}
                        mesesRange={mesesRange}
                        mesesLabel={MESES_LABEL}
                      />
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Tabela de detalhamento do relatório semestral
// ---------------------------------------------------------------------------

function RelatorioDetailTable({
  data,
  mesesRange,
  mesesLabel,
}: {
  data: { secao: string; categoria: string; mes: number; total: number }[];
  mesesRange: number[];
  mesesLabel: string[];
}) {
  // Agrupar por seção → categoria → meses
  const secoes = useMemo(() => {
    const map = new Map<string, Map<string, Map<number, number>>>();
    for (const r of data) {
      if (!map.has(r.secao)) map.set(r.secao, new Map());
      const catMap = map.get(r.secao)!;
      if (!catMap.has(r.categoria)) catMap.set(r.categoria, new Map());
      const mesMap = catMap.get(r.categoria)!;
      mesMap.set(r.mes, (mesMap.get(r.mes) ?? 0) + r.total);
    }

    return Array.from(map.entries()).map(([secao, catMap]) => ({
      secao,
      categorias: Array.from(catMap.entries())
        .map(([cat, mesMap]) => {
          const totals = mesesRange.map((m) => mesMap.get(m) ?? 0);
          const total = totals.reduce((a, b) => a + b, 0);
          return { categoria: cat, totals, total };
        })
        .sort((a, b) => b.total - a.total),
    }));
  }, [data, mesesRange]);

  if (secoes.length === 0) {
    return (
      <div className="text-center text-xs text-neutral-400 py-4">
        Sem dados para o período selecionado
      </div>
    );
  }

  return (
    <div className="space-y-4 max-h-[500px] overflow-y-auto scrollbar-none">
      {secoes.map((secao) => (
        <div key={secao.secao}>
          {/* Seção header */}
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[9px] font-bold uppercase tracking-[0.12em] text-neutral-500 dark:text-neutral-400">
              {secao.secao}
            </span>
            <span className="flex-1 h-px bg-neutral-200/60 dark:bg-neutral-700/40" />
            <span className="text-[9px] font-mono tabular-nums text-neutral-400">
              {secao.categorias.reduce((a, c) => a + c.total, 0)}
            </span>
          </div>

          {/* Table */}
          <div className="rounded-lg border border-neutral-200/60 dark:border-neutral-700/30 overflow-hidden">
            {/* Header row */}
            <div className="grid grid-cols-[1fr_repeat(6,48px)_56px] gap-0 bg-neutral-50 dark:bg-neutral-800/30 border-b border-neutral-200/60 dark:border-neutral-700/30 px-3 py-1.5">
              <span className="text-[9px] font-semibold uppercase tracking-wider text-neutral-400">
                Atividade
              </span>
              {mesesRange.map((m) => (
                <span
                  key={m}
                  className="text-[9px] font-semibold uppercase tracking-wider text-neutral-400 text-center"
                >
                  {mesesLabel[m]}
                </span>
              ))}
              <span className="text-[9px] font-semibold uppercase tracking-wider text-neutral-400 text-right">
                Total
              </span>
            </div>

            {/* Data rows */}
            {secao.categorias.map((cat, idx) => (
              <div
                key={cat.categoria}
                className={cn(
                  "grid grid-cols-[1fr_repeat(6,48px)_56px] gap-0 px-3 py-1.5 text-[11px]",
                  idx % 2 === 0
                    ? "bg-white dark:bg-transparent"
                    : "bg-neutral-50/50 dark:bg-neutral-800/10",
                )}
              >
                <span className="text-neutral-700 dark:text-neutral-300 truncate pr-2 leading-tight">
                  {cat.categoria}
                </span>
                {cat.totals.map((val, mi) => (
                  <span
                    key={mi}
                    className={cn(
                      "text-center tabular-nums font-mono",
                      val > 0
                        ? "text-neutral-800 dark:text-neutral-200 font-medium"
                        : "text-neutral-300 dark:text-neutral-600",
                    )}
                  >
                    {val || "—"}
                  </span>
                ))}
                <span className="text-right tabular-nums font-mono font-semibold text-neutral-900 dark:text-neutral-100">
                  {cat.total}
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="h-[200px] flex items-center justify-center text-xs text-neutral-400 dark:text-neutral-500">{text}</div>
  );
}
