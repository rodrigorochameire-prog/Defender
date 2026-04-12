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
  X,
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
import { GLASS } from "@/lib/config/design-tokens";

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
  JURI_CAMACARI: "#059669",
  GRUPO_JURI: "#10b981",
  VVD_CAMACARI: "#f59e0b",
  EXECUCAO_PENAL: "#0284c7",
  SUBSTITUICAO: "#52525b",
  SUBSTITUICAO_CIVEL: "#71717a",
  SEM_PROCESSO: "#a1a1aa",
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
  vencido: "#dc2626",
  urgente: "#ea580c",
  proximo: "#d97706",
  medio: "#0284c7",
  longo: "#6b7280",
};

// ---------------------------------------------------------------------------
// Contador animado
// ---------------------------------------------------------------------------

function AnimatedNumber({ value, duration = 1.0 }: { value: number; duration?: number }) {
  const count = useMotionValue(0);
  const rounded = useTransform(count, (latest) => Math.round(latest).toLocaleString("pt-BR"));

  useEffect(() => {
    const controls = animate(count, value, { duration, ease: [0.22, 1, 0.36, 1] });
    return controls.stop;
  }, [value, count, duration]);

  return <motion.span>{rounded}</motion.span>;
}

// ---------------------------------------------------------------------------
// StatCard compacto — Padrão Defender v5 (glass)
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
  const tones = {
    neutral: { accent: "text-foreground", iconBg: "bg-foreground", iconColor: "text-background" },
    warning: { accent: "text-amber-600 dark:text-amber-500", iconBg: "bg-amber-500", iconColor: "text-white" },
    danger: { accent: "text-red-600 dark:text-red-500", iconBg: "bg-red-600", iconColor: "text-white" },
    success: { accent: "text-emerald-600 dark:text-emerald-500", iconBg: "bg-emerald-600", iconColor: "text-white" },
  }[tone];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay, ease: [0.22, 1, 0.36, 1] }}
      className={cn(GLASS.card, "p-4")}
    >
      <div className="flex items-start justify-between mb-3">
        <span className="text-[9px] uppercase tracking-wider font-semibold text-muted-foreground">{label}</span>
        <div className={cn("w-7 h-7 rounded-md flex items-center justify-center", tones.iconBg)}>
          <Icon className={cn("w-3.5 h-3.5", tones.iconColor)} />
        </div>
      </div>
      <div className={cn("font-sans text-3xl font-semibold tracking-tight tabular-nums", tones.accent)}>
        <AnimatedNumber value={value} />
      </div>
      {sublabel && <div className="text-[11px] text-muted-foreground mt-1">{sublabel}</div>}
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// ChartCard — wrapper uniforme
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
      className={cn(GLASS.card, "p-5", className)}
    >
      <div className="flex items-center gap-2.5 mb-4">
        <div className="w-7 h-7 rounded-md bg-foreground flex items-center justify-center">
          <Icon className="w-3.5 h-3.5 text-background" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-[13px] font-bold uppercase tracking-wide text-foreground">{title}</h3>
          {subtitle && <p className="text-[11px] text-muted-foreground mt-0.5">{subtitle}</p>}
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

  // Backlog agrupado
  const backlogChartData = useMemo(() => {
    const byAtrib = new Map<string, Record<string, number | string>>();
    for (const row of backlog) {
      const key = row.atribuicao;
      if (!byAtrib.has(key)) {
        byAtrib.set(key, { atribuicao: ATRIB_LABEL[key] ?? key });
      }
      const entry = byAtrib.get(key)!;
      const statusLabel = STATUS_LABEL[row.status] ?? row.status;
      entry[statusLabel] = ((entry[statusLabel] as number | undefined) ?? 0) + row.total;
    }
    return Array.from(byAtrib.values());
  }, [backlog]);

  const statusKeys = useMemo(() => {
    const set = new Set<string>();
    for (const row of backlog) {
      set.add(STATUS_LABEL[row.status] ?? row.status);
    }
    return Array.from(set);
  }, [backlog]);

  const statusColors = ["#18181b", "#3f3f46", "#52525b", "#71717a", "#a1a1aa", "#d4d4d8", "#e4e4e7"];

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

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className="overflow-hidden"
    >
      <div className="space-y-3 pb-1">
        {/* Toolbar compacta — título, escopo, filtro de comarca, refresh, close */}
        <div className={cn(GLASS.card, "px-4 py-3 flex items-center justify-between gap-3 flex-wrap")}>
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-md bg-foreground flex items-center justify-center shrink-0">
              <BarChart3 className="w-3.5 h-3.5 text-background" />
            </div>
            <div className="min-w-0">
              <h2 className="text-[13px] font-bold uppercase tracking-wide text-foreground">KPIs Operacionais</h2>
              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mt-0.5">
                <span className="truncate">{defensorLabel}</span>
                <span className="w-[3px] h-[3px] rounded-full bg-muted-foreground/50" />
                <span className="truncate">{comarcaLabel}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <div className="flex items-center gap-1.5 bg-muted rounded-md px-2 py-1">
              <Filter className="w-3 h-3 text-muted-foreground" />
              <select
                className="bg-transparent text-[11px] outline-none cursor-pointer text-foreground"
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
              className="h-7 w-7 rounded-md border border-border hover:bg-muted transition-colors flex items-center justify-center disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className={cn("w-3 h-3", isRefreshing && "animate-spin")} />
            </button>

            {onClose && (
              <button
                onClick={onClose}
                title="Fechar"
                className="h-7 w-7 rounded-md border border-border hover:bg-muted transition-colors flex items-center justify-center cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
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
            delay={0.05}
          />
          <StatCard
            label="Urgentes"
            value={summary?.urgentes ?? 0}
            icon={Clock}
            tone={(summary?.urgentes ?? 0) > 0 ? "warning" : "neutral"}
            sublabel="≤ 3 dias"
            delay={0.1}
          />
          <StatCard
            label="Concluídas no mês"
            value={summary?.concluidasMes ?? 0}
            icon={CheckCircle2}
            tone="success"
            sublabel={`${summary?.concluidas ?? 0} no histórico`}
            delay={0.15}
          />
        </div>

        {/* Alerta de réu preso urgente */}
        <AnimatePresence>
          {presos.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.3 }}
              className="rounded-lg border border-red-500/30 bg-red-50/80 dark:bg-red-950/20 overflow-hidden"
            >
              <div className="px-4 py-2.5 border-b border-red-500/20 flex items-center gap-2">
                <Flame className="w-3.5 h-3.5 text-red-600 dark:text-red-500" />
                <h3 className="text-[12px] font-bold uppercase tracking-wide text-red-700 dark:text-red-400">
                  Réu Preso — Prazo ≤ 5 dias
                </h3>
                <span className="ml-auto text-[10px] uppercase tracking-wider text-red-600/70 font-semibold">
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
                          p.diasAtePrazo < 0 ? "text-red-700" : "text-red-600",
                        )}
                      >
                        {p.diasAtePrazo < 0 ? `${p.diasAtePrazo}d` : `+${p.diasAtePrazo}d`}
                      </span>
                      <Lock className="w-3 h-3 text-red-600/60 shrink-0" />
                      <span className="font-medium text-foreground truncate flex-1 min-w-0">
                        {p.assistidoNome ?? "(sem assistido)"}
                      </span>
                      <span className="text-muted-foreground truncate max-w-[180px] shrink">{p.ato}</span>
                      <span
                        className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase tracking-wider text-white shrink-0"
                        style={{ backgroundColor: ATRIB_COLOR[p.atribuicao] ?? "#71717a" }}
                      >
                        {ATRIB_LABEL[p.atribuicao] ?? p.atribuicao}
                      </span>
                      <ArrowRight className="w-3 h-3 text-red-600/40 group-hover:text-red-600 transition-colors shrink-0" />
                    </Link>
                  </motion.li>
                ))}
              </ul>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {/* Backlog */}
          <ChartCard title="Backlog por atribuição" subtitle="Barras empilhadas por status" icon={BarChart3} delay={0.2}>
            {backlogChartData.length === 0 ? (
              <EmptyState text="Sem demandas no escopo selecionado" />
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={backlogChartData} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.1} vertical={false} />
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
          <ChartCard title="Distribuição de prazos" subtitle="Por urgência" icon={Clock} delay={0.25}>
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
                      transition={{ delay: 0.25 + i * 0.05 }}
                    >
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="font-medium text-foreground/80">{b.label}</span>
                        <span className="font-mono tabular-nums text-muted-foreground">
                          {b.value} <span className="text-muted-foreground/60">({pct.toFixed(0)}%)</span>
                        </span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <motion.div
                          className="h-full rounded-full"
                          style={{ backgroundColor: b.color }}
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ duration: 0.8, delay: 0.35 + i * 0.05, ease: [0.22, 1, 0.36, 1] }}
                        />
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </ChartCard>

          {/* Throughput */}
          <ChartCard title="Throughput semanal" subtitle="12 semanas — criadas vs concluídas" icon={TrendingUp} delay={0.3}>
            {throughputChartData.length === 0 ? (
              <EmptyState text="Sem histórico no escopo selecionado" />
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={throughputChartData} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.1} vertical={false} />
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
          <ChartCard title="Top 10 atos" subtitle="Ranking por frequência" icon={Gavel} delay={0.35}>
            {topAtosChartData.length === 0 ? (
              <EmptyState text="Sem atos no escopo selecionado" />
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={topAtosChartData} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.1} horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11, fill: "currentColor", opacity: 0.6 }} axisLine={false} tickLine={false} />
                  <YAxis
                    type="category"
                    dataKey="ato"
                    tick={{ fontSize: 11, fill: "currentColor", opacity: 0.7 }}
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
                  <Bar dataKey="total" radius={[0, 6, 6, 0]} animationDuration={900}>
                    {topAtosChartData.map((_, idx) => (
                      <Cell key={idx} fill={`hsl(0, 0%, ${20 + idx * 3}%)`} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>
        </div>

        {/* Carga por defensor */}
        {cargaChartData.length > 1 && (
          <ChartCard
            title="Carga por defensor"
            subtitle="Demandas ativas por profissional"
            icon={Users2}
            delay={0.4}
          >
            <ResponsiveContainer width="100%" height={Math.max(180, cargaChartData.length * 38)}>
              <BarChart data={cargaChartData} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.1} horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: "currentColor", opacity: 0.6 }} axisLine={false} tickLine={false} />
                <YAxis
                  type="category"
                  dataKey="defensorNome"
                  tick={{ fontSize: 11, fill: "currentColor", opacity: 0.7 }}
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
        )}
      </div>
    </motion.div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="h-[200px] flex items-center justify-center text-xs text-muted-foreground">{text}</div>
  );
}
