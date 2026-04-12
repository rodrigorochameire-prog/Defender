"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, useMotionValue, useTransform, animate, AnimatePresence } from "motion/react";
import {
  BarChart3,
  TrendingUp,
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

// Cores funcionais conforme Padrão Defender v3 — única cor permitida por atribuição
const ATRIB_COLOR: Record<string, string> = {
  JURI_CAMACARI: "#059669", // emerald-600
  GRUPO_JURI: "#10b981", // emerald-500
  VVD_CAMACARI: "#f59e0b", // amber-500
  EXECUCAO_PENAL: "#0284c7", // sky-600
  SUBSTITUICAO: "#52525b", // zinc-600
  SUBSTITUICAO_CIVEL: "#71717a", // zinc-500
  SEM_PROCESSO: "#a1a1aa", // zinc-400
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
  vencido: "#dc2626", // red-600
  urgente: "#ea580c", // orange-600
  proximo: "#d97706", // amber-600
  medio: "#0284c7", // sky-600
  longo: "#6b7280", // gray-500
};

// ---------------------------------------------------------------------------
// Componente: contador animado (framer-motion)
// ---------------------------------------------------------------------------

function AnimatedNumber({ value, duration = 1.1 }: { value: number; duration?: number }) {
  const count = useMotionValue(0);
  const rounded = useTransform(count, (latest) => Math.round(latest).toLocaleString("pt-BR"));

  useEffect(() => {
    const controls = animate(count, value, { duration, ease: [0.22, 1, 0.36, 1] });
    return controls.stop;
  }, [value, count, duration]);

  return <motion.span>{rounded}</motion.span>;
}

// ---------------------------------------------------------------------------
// Componente: card de estatística grande
// ---------------------------------------------------------------------------

interface StatCardProps {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  tone?: "neutral" | "warning" | "danger" | "success";
  sublabel?: string;
  delay?: number;
}

function StatCard({ label, value, icon: Icon, tone = "neutral", sublabel, delay = 0 }: StatCardProps) {
  const toneStyles = {
    neutral: {
      accent: "text-zinc-900 dark:text-zinc-100",
      iconBg: "bg-zinc-800 dark:bg-zinc-700",
      iconColor: "text-white",
      ring: "",
    },
    warning: {
      accent: "text-amber-600 dark:text-amber-500",
      iconBg: "bg-amber-500",
      iconColor: "text-white",
      ring: "ring-1 ring-amber-500/20",
    },
    danger: {
      accent: "text-red-600 dark:text-red-500",
      iconBg: "bg-red-600",
      iconColor: "text-white",
      ring: "ring-1 ring-red-500/20",
    },
    success: {
      accent: "text-emerald-600 dark:text-emerald-500",
      iconBg: "bg-emerald-600",
      iconColor: "text-white",
      ring: "",
    },
  }[tone];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        "bg-zinc-100/60 dark:bg-white/[0.04] border border-zinc-200/80 dark:border-white/[0.06]",
        "rounded-xl p-4 hover:bg-zinc-100 dark:hover:bg-white/[0.07] transition-all duration-200",
        toneStyles.ring,
      )}
    >
      <div className="flex items-start justify-between mb-3">
        <span className="text-[9px] uppercase tracking-wider font-semibold text-zinc-500 dark:text-zinc-400">
          {label}
        </span>
        <div className={cn("w-7 h-7 rounded-md flex items-center justify-center", toneStyles.iconBg)}>
          <Icon className={cn("w-3.5 h-3.5", toneStyles.iconColor)} />
        </div>
      </div>
      <div className={cn("font-serif text-3xl font-semibold tracking-tight tabular-nums", toneStyles.accent)}>
        <AnimatedNumber value={value} />
      </div>
      {sublabel && <div className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1">{sublabel}</div>}
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Componente: chart card (wrapper glass uniforme)
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
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        "bg-zinc-100/60 dark:bg-white/[0.04] border border-zinc-200/80 dark:border-white/[0.06]",
        "rounded-xl p-5",
        className,
      )}
    >
      <div className="flex items-center gap-2.5 mb-4">
        <div className="w-7 h-7 rounded-md bg-zinc-800 dark:bg-zinc-700 flex items-center justify-center">
          <Icon className="w-3.5 h-3.5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-[13px] font-bold uppercase tracking-wide text-zinc-900 dark:text-zinc-100">
            {title}
          </h3>
          {subtitle && <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {children}
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Header charcoal
// ---------------------------------------------------------------------------

function KpisHeader({
  defensorLabel,
  comarcaLabel,
  onRefresh,
  isRefreshing,
  comarcas,
  comarcaId,
  onComarcaChange,
}: {
  defensorLabel: string;
  comarcaLabel: string;
  onRefresh: () => void;
  isRefreshing: boolean;
  comarcas: { id: number; nome: string }[];
  comarcaId: number | null;
  onComarcaChange: (id: number | null) => void;
}) {
  return (
    <div className="mx-4 lg:mx-6 mt-3 px-5 pt-4 pb-3 rounded-xl bg-gradient-to-br from-[#222228] to-[#18181b] shadow-lg shadow-black/10 ring-1 ring-white/[0.04]">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-start gap-4">
          <div className="h-12 w-12 rounded-xl bg-white text-zinc-900 font-bold flex items-center justify-center">
            <BarChart3 className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-serif text-lg font-semibold text-white tracking-tight">KPIs Operacionais</h1>
            <p className="text-white/50 text-xs mt-0.5">
              Visão consolidada de demandas, prazos e carga por defensor
            </p>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-white/30 text-[9px] uppercase tracking-wider font-semibold">Escopo</span>
              <span className="text-white/90 text-xs font-medium">{defensorLabel}</span>
              <span className="w-[1.5px] h-3 bg-white/20" />
              <span className="text-white/70 text-xs">{comarcaLabel}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Seletor de comarca */}
          <div className="bg-white/[0.08] hover:bg-white/[0.12] transition-colors rounded-lg px-3 py-1.5 flex items-center gap-2">
            <Filter className="w-3 h-3 text-white/50" />
            <select
              className="bg-transparent text-white/90 text-xs outline-none cursor-pointer"
              value={comarcaId ?? ""}
              onChange={(e) => onComarcaChange(e.target.value ? Number(e.target.value) : null)}
            >
              <option value="" className="text-zinc-900">
                Todas as comarcas
              </option>
              {comarcas.map((c) => (
                <option key={c.id} value={c.id} className="text-zinc-900">
                  {c.nome}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="text-white/80 border border-white/20 bg-white/10 hover:bg-white/20 rounded-lg px-3 py-1.5 text-xs font-medium flex items-center gap-2 transition-colors disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={cn("w-3 h-3", isRefreshing && "animate-spin")} />
            Atualizar
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Página principal
// ---------------------------------------------------------------------------

export default function KpisPage() {
  const { selectedDefensorId, selectedDefensor } = useDefensor();
  const [comarcaId, setComarcaId] = useState<number | null>(null);

  // Escopo base
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
  const comarcasQ = trpc.comarcas.listRMS.useQuery();

  const utils = trpc.useUtils();
  const isRefreshing =
    summaryQ.isFetching || throughputQ.isFetching || backlogQ.isFetching || prazosQ.isFetching;

  const handleRefresh = async () => {
    await Promise.all([
      utils.kpis.summary.invalidate(),
      utils.kpis.throughput.invalidate(),
      utils.kpis.backlog.invalidate(),
      utils.kpis.prazos.invalidate(),
      utils.kpis.topAtos.invalidate(),
      utils.kpis.cargaDefensor.invalidate(),
      utils.kpis.presosUrgentes.invalidate(),
    ]);
  };

  const summary = summaryQ.data;
  const throughput = throughputQ.data ?? [];
  const backlog = backlogQ.data ?? [];
  const prazos = prazosQ.data;
  const topAtos = topAtosQ.data ?? [];
  const carga = cargaQ.data ?? [];
  const presos = presosQ.data ?? [];
  const comarcas = comarcasQ.data ?? [];

  const defensorLabel = selectedDefensor?.name ?? "Visão Geral";
  const comarcaLabel = comarcaId
    ? comarcas.find((c) => c.id === comarcaId)?.nome ?? "—"
    : "Todas as comarcas";

  // Backlog agrupado para o gráfico stacked (por atribuição)
  const backlogChartData = useMemo(() => {
    const byAtrib = new Map<string, Record<string, number | string>>();
    for (const row of backlog) {
      const key = row.atribuicao;
      if (!byAtrib.has(key)) {
        byAtrib.set(key, { atribuicao: ATRIB_LABEL[key] ?? key });
      }
      const entry = byAtrib.get(key)!;
      const statusLabel = STATUS_LABEL[row.status] ?? row.status;
      entry[statusLabel] = (entry[statusLabel] as number | undefined ?? 0) + row.total;
    }
    return Array.from(byAtrib.values());
  }, [backlog]);

  // Lista única de status para as chaves do stacked
  const statusKeys = useMemo(() => {
    const set = new Set<string>();
    for (const row of backlog) {
      set.add(STATUS_LABEL[row.status] ?? row.status);
    }
    return Array.from(set);
  }, [backlog]);

  // Paleta de cinzas pro stacked de status (cor só no topbar de atribuição)
  const statusColors = ["#18181b", "#3f3f46", "#52525b", "#71717a", "#a1a1aa", "#d4d4d8", "#e4e4e7"];

  // Throughput formatado
  const throughputChartData = useMemo(
    () =>
      throughput.map((r) => ({
        ...r,
        semanaLabel: new Date(r.semana).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
      })),
    [throughput],
  );

  // Top atos já vem ordenado
  const topAtosChartData = useMemo(
    () =>
      topAtos.map((r) => ({
        ato: r.ato.length > 40 ? r.ato.slice(0, 37) + "…" : r.ato,
        total: r.total,
        ativas: r.ativas,
      })),
    [topAtos],
  );

  // Agrupa carga por defensor (soma atribuições)
  const cargaChartData = useMemo(() => {
    const byDef = new Map<number, { defensorNome: string; ativas: number; concluidas: number; total: number }>();
    for (const row of carga) {
      if (!byDef.has(row.defensorId)) {
        byDef.set(row.defensorId, {
          defensorNome: row.defensorNome,
          ativas: 0,
          concluidas: 0,
          total: 0,
        });
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

  return (
    <div className="pb-8">
      <KpisHeader
        defensorLabel={defensorLabel}
        comarcaLabel={comarcaLabel}
        onRefresh={handleRefresh}
        isRefreshing={isRefreshing}
        comarcas={comarcas}
        comarcaId={comarcaId}
        onComarcaChange={setComarcaId}
      />

      {/* Summary cards row */}
      <div className="px-4 lg:px-6 mt-5 grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          label="Ativas"
          value={summary?.ativas ?? 0}
          icon={TrendingUp}
          tone="neutral"
          sublabel={`${summary?.total ?? 0} no total`}
          delay={0}
        />
        <StatCard
          label="Vencidas"
          value={summary?.vencidas ?? 0}
          icon={AlertTriangle}
          tone={(summary?.vencidas ?? 0) > 0 ? "danger" : "neutral"}
          sublabel="prazo expirado"
          delay={0.06}
        />
        <StatCard
          label="Urgentes"
          value={summary?.urgentes ?? 0}
          icon={Clock}
          tone={(summary?.urgentes ?? 0) > 0 ? "warning" : "neutral"}
          sublabel="≤ 3 dias"
          delay={0.12}
        />
        <StatCard
          label="Concluídas no mês"
          value={summary?.concluidasMes ?? 0}
          icon={CheckCircle2}
          tone="success"
          sublabel={`${summary?.concluidas ?? 0} no histórico`}
          delay={0.18}
        />
      </div>

      {/* Alerta de réu preso urgente */}
      <AnimatePresence>
        {presos.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.35 }}
            className="mx-4 lg:mx-6 mt-4 rounded-xl border border-red-500/30 bg-red-50/80 dark:bg-red-950/20 overflow-hidden"
          >
            <div className="px-5 py-3 border-b border-red-500/20 flex items-center gap-2">
              <Flame className="w-4 h-4 text-red-600 dark:text-red-500" />
              <h3 className="text-[13px] font-bold uppercase tracking-wide text-red-700 dark:text-red-400">
                Réu Preso — Prazo ≤ 5 dias
              </h3>
              <span className="ml-auto text-[10px] uppercase tracking-wider text-red-600/70 font-semibold">
                {presos.length} {presos.length === 1 ? "caso" : "casos"}
              </span>
            </div>
            <ul className="divide-y divide-red-500/15">
              {presos.slice(0, 8).map((p, i) => (
                <motion.li
                  key={p.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
                >
                  <Link
                    href={p.assistidoId ? `/admin/assistidos/${p.assistidoId}` : `/admin/demandas`}
                    className="px-5 py-2.5 flex items-center gap-3 text-xs hover:bg-red-500/10 transition-colors group"
                  >
                    <span
                      className={cn(
                        "font-mono text-[11px] font-bold w-10 text-center tabular-nums",
                        p.diasAtePrazo < 0 ? "text-red-700" : "text-red-600",
                      )}
                    >
                      {p.diasAtePrazo < 0 ? `${p.diasAtePrazo}d` : `+${p.diasAtePrazo}d`}
                    </span>
                    <Lock className="w-3 h-3 text-red-600/60" />
                    <span className="font-medium text-zinc-900 dark:text-zinc-100 truncate flex-1">
                      {p.assistidoNome ?? "(sem assistido)"}
                    </span>
                    <span className="text-zinc-500 dark:text-zinc-400 truncate max-w-[200px]">{p.ato}</span>
                    <span
                      className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase tracking-wider text-white"
                      style={{ backgroundColor: ATRIB_COLOR[p.atribuicao] ?? "#71717a" }}
                    >
                      {ATRIB_LABEL[p.atribuicao] ?? p.atribuicao}
                    </span>
                    <ArrowRight className="w-3 h-3 text-red-600/40 group-hover:text-red-600 transition-colors" />
                  </Link>
                </motion.li>
              ))}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main grid */}
      <div className="px-4 lg:px-6 mt-4 grid grid-cols-1 lg:grid-cols-2 gap-3">
        {/* Backlog */}
        <ChartCard title="Backlog por atribuição" subtitle="Barras empilhadas por status" icon={BarChart3} delay={0.24}>
          {backlogChartData.length === 0 ? (
            <EmptyState text="Sem demandas no escopo selecionado" />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={backlogChartData} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" opacity={0.4} vertical={false} />
                <XAxis dataKey="atribuicao" tick={{ fontSize: 11, fill: "#71717a" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#71717a" }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    background: "#18181b",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: 8,
                    fontSize: 12,
                    color: "#fff",
                  }}
                  cursor={{ fill: "rgba(0,0,0,0.04)" }}
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
        <ChartCard title="Distribuição de prazos" subtitle="Por urgência" icon={Clock} delay={0.3}>
          {prazosTotal === 0 ? (
            <EmptyState text="Nenhuma demanda ativa com prazo definido" />
          ) : (
            <div className="space-y-3 pt-2">
              {prazosBuckets.map((b, i) => {
                const pct = prazosTotal > 0 ? (b.value / prazosTotal) * 100 : 0;
                return (
                  <motion.div
                    key={b.key}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 + i * 0.05 }}
                  >
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-medium text-zinc-700 dark:text-zinc-300">{b.label}</span>
                      <span className="font-mono tabular-nums text-zinc-500">
                        {b.value} <span className="text-zinc-400">({pct.toFixed(0)}%)</span>
                      </span>
                    </div>
                    <div className="h-2 bg-zinc-200/60 dark:bg-zinc-800/60 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full rounded-full"
                        style={{ backgroundColor: b.color }}
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.9, delay: 0.4 + i * 0.05, ease: [0.22, 1, 0.36, 1] }}
                      />
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </ChartCard>

        {/* Throughput */}
        <ChartCard title="Throughput semanal" subtitle="Últimas 12 semanas — criadas vs concluídas" icon={TrendingUp} delay={0.36}>
          {throughputChartData.length === 0 ? (
            <EmptyState text="Sem histórico no escopo selecionado" />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={throughputChartData} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" opacity={0.4} vertical={false} />
                <XAxis
                  dataKey="semanaLabel"
                  tick={{ fontSize: 11, fill: "#71717a" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis tick={{ fontSize: 11, fill: "#71717a" }} axisLine={false} tickLine={false} />
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
                  stroke="#059669"
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: "#059669" }}
                  activeDot={{ r: 5 }}
                  animationDuration={900}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        {/* Top atos */}
        <ChartCard title="Top 10 atos" subtitle="Ranking por frequência" icon={Gavel} delay={0.42}>
          {topAtosChartData.length === 0 ? (
            <EmptyState text="Sem atos no escopo selecionado" />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={topAtosChartData} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" opacity={0.4} horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: "#71717a" }} axisLine={false} tickLine={false} />
                <YAxis
                  type="category"
                  dataKey="ato"
                  tick={{ fontSize: 11, fill: "#52525b" }}
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
                  cursor={{ fill: "rgba(0,0,0,0.04)" }}
                />
                <Bar dataKey="total" fill="#18181b" radius={[0, 6, 6, 0]} animationDuration={900}>
                  {topAtosChartData.map((_, idx) => (
                    <Cell key={idx} fill={`hsl(0, 0%, ${18 + idx * 3}%)`} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      {/* Carga por defensor — full width, só se houver mais de 1 */}
      {cargaChartData.length > 1 && (
        <div className="px-4 lg:px-6 mt-3">
          <ChartCard
            title="Carga por defensor"
            subtitle="Demandas ativas por profissional"
            icon={Users2}
            delay={0.48}
          >
            <ResponsiveContainer width="100%" height={Math.max(200, cargaChartData.length * 40)}>
              <BarChart data={cargaChartData} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" opacity={0.4} horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: "#71717a" }} axisLine={false} tickLine={false} />
                <YAxis
                  type="category"
                  dataKey="defensorNome"
                  tick={{ fontSize: 11, fill: "#52525b" }}
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
                  cursor={{ fill: "rgba(0,0,0,0.04)" }}
                />
                <Bar dataKey="ativas" fill="#18181b" radius={[0, 6, 6, 0]} animationDuration={900} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
      )}

      {/* Loading state overlay (primeira carga) */}
      {summaryQ.isLoading && (
        <div className="fixed inset-0 flex items-center justify-center bg-background/20 backdrop-blur-[2px] z-30 pointer-events-none">
          <div className="bg-white dark:bg-zinc-900 rounded-full px-4 py-2 shadow-lg flex items-center gap-2 text-xs">
            <RefreshCw className="w-3 h-3 animate-spin" />
            Carregando KPIs...
          </div>
        </div>
      )}
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="h-[220px] flex items-center justify-center text-xs text-zinc-400 dark:text-zinc-500">
      {text}
    </div>
  );
}
