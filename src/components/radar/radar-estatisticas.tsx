"use client";

import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line,
} from "recharts";
import { Radio, AlertTriangle, MapPin, Link2, Newspaper, CheckCircle2, Clock, TrendingUp, User, Calendar } from "lucide-react";
import { getCrimeLabel } from "./radar-filtros";
import { cn } from "@/lib/utils";

const PERIODOS = [
  { value: "7d", label: "7 dias" },
  { value: "30d", label: "30 dias" },
  { value: "90d", label: "90 dias" },
  { value: "1a", label: "1 ano" },
  { value: "total", label: "Total" },
] as const;

const CRIME_CHART_COLORS: Record<string, string> = {
  homicidio: "#ef4444",
  tentativa_homicidio: "#f97316",
  trafico: "#a855f7",
  roubo: "#3b82f6",
  furto: "#eab308",
  violencia_domestica: "#ec4899",
  sexual: "#d946ef",
  lesao_corporal: "#f59e0b",
  porte_arma: "#64748b",
  estelionato: "#14b8a6",
  outros: "#71717a",
};

export function RadarEstatisticas() {
  const [periodo, setPeriodo] = useState<string>("30d");

  const { data: stats, isLoading: statsLoading } = trpc.radar.stats.useQuery({ periodo: periodo as any });
  const { data: deteccao } = trpc.radar.statsDeteccao.useQuery({
    periodo: periodo as any,
  });
  const { data: bairros, isLoading: bairrosLoading } = trpc.radar.statsByBairro.useQuery({
    periodo: periodo as any,
    limit: 10,
  });
  const { data: byHora } = trpc.radar.statsByHora.useQuery({ periodo: periodo as any });
  const { data: byDiaSemana } = trpc.radar.statsByDiaSemana.useQuery({ periodo: periodo as any });

  // Prepare donut chart data
  const donutData = useMemo(() => {
    if (!stats?.porTipo) return [];
    return stats.porTipo.map((item) => ({
      name: getCrimeLabel(item.tipo),
      value: item.count,
      color: CRIME_CHART_COLORS[item.tipo] || CRIME_CHART_COLORS.outros,
    }));
  }, [stats?.porTipo]);

  // Prepare bar chart data (por mês, empilhado por tipo)
  const barData = useMemo(() => {
    if (!stats?.porMes) return [];
    const byMonth: Record<string, Record<string, number>> = {};
    stats.porMes.forEach((item) => {
      if (!byMonth[item.mes]) byMonth[item.mes] = {};
      byMonth[item.mes][item.tipo] = item.count;
    });
    return Object.entries(byMonth)
      .map(([mes, tipos]) => ({ mes, ...tipos }))
      .sort((a, b) => a.mes.localeCompare(b.mes));
  }, [stats?.porMes]);

  // All crime types present in data
  const crimeTypes = useMemo(() => {
    if (!stats?.porTipo) return [];
    return stats.porTipo.map((item) => item.tipo);
  }, [stats?.porTipo]);

  if (statsLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-3 gap-4">
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Seletor de período */}
      <div className="flex items-center gap-1.5">
        {PERIODOS.map((p) => (
          <Button
            key={p.value}
            variant={periodo === p.value ? "default" : "outline"}
            size="sm"
            onClick={() => setPeriodo(p.value)}
            className="cursor-pointer text-xs h-7"
          >
            {p.label}
          </Button>
        ))}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-100 dark:bg-zinc-800">
                <Newspaper className="h-5 w-5 text-zinc-600 dark:text-zinc-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                  {stats?.total || 0}
                </p>
                <p className="text-xs text-zinc-500">Ocorrências</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-100 dark:bg-red-900/30">
                <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                  {stats?.porTipo?.find((t) => t.tipo === "homicidio")?.count || 0}
                </p>
                <p className="text-xs text-zinc-500">Homicídios</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
                <Link2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                  {stats?.totalMatches || 0}
                </p>
                <p className="text-xs text-zinc-500">Matches DPE</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* KPIs Operacionais */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Taxa de confirmação */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
                <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                  {deteccao?.taxaConfirmacao ?? 0}%
                </p>
                <p className="text-xs text-zinc-500">Taxa de Confirmação</p>
                <p className="text-[10px] text-zinc-400">
                  {deteccao?.confirmados ?? 0} de {deteccao?.totalMatches ?? 0} matches
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tempo médio de detecção */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <Clock className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                  {deteccao?.tempoMedioHoras
                    ? deteccao.tempoMedioHoras < 24
                      ? `${deteccao.tempoMedioHoras}h`
                      : `${Math.round(deteccao.tempoMedioHoras / 24)}d`
                    : "—"}
                </p>
                <p className="text-xs text-zinc-500">Tempo Médio de Detecção</p>
                <p className="text-[10px] text-zinc-400">entre fato e identificação</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Matches pendentes */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-yellow-100 dark:bg-yellow-900/30">
                <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                  {deteccao?.matchesPorStatus?.find(m => m.status === "possivel")?.count ?? 0}
                </p>
                <p className="text-xs text-zinc-500">Matches Pendentes</p>
                <p className="text-[10px] text-zinc-400">aguardando revisão</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gráfico de barras empilhadas (por mês) */}
      {barData.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Ocorrências por Mês</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={barData}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                {crimeTypes.map((tipo) => (
                  <Bar
                    key={tipo}
                    dataKey={tipo}
                    stackId="crimes"
                    fill={CRIME_CHART_COLORS[tipo] || CRIME_CHART_COLORS.outros}
                    name={getCrimeLabel(tipo)}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Dois gráficos lado a lado */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Donut chart */}
        {donutData.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Distribuição por Crime</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={donutData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    dataKey="value"
                    label={({ name, percent }: any) =>
                      `${name} ${((percent ?? 0) * 100).toFixed(0)}%`
                    }
                    labelLine={false}
                  >
                    {donutData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Top bairros */}
        {bairros && bairros.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Top 10 Bairros
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={bairros} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis
                    type="category"
                    dataKey="bairro"
                    tick={{ fontSize: 11 }}
                    width={120}
                  />
                  <Tooltip />
                  <Bar dataKey="count" fill="#10b981" name="Ocorrências" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Tendência semanal + Top defensores */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Tendência semanal */}
        {deteccao?.tendencia && deteccao.tendencia.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Tendência de Matches (8 semanas)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={deteccao.tendencia}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis
                    dataKey="semana"
                    tick={{ fontSize: 10 }}
                    tickFormatter={(v) => v.slice(5)}
                  />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip
                    labelFormatter={(v) => `Semana de ${v}`}
                    formatter={(val: any) => [`${val} matches`, ""]}
                  />
                  <Line
                    type="monotone"
                    dataKey="count"
                    stroke="#10b981"
                    strokeWidth={2}
                    dot={{ fill: "#10b981", r: 3 }}
                    name="Matches"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Top defensores */}
        {deteccao?.topDefensores && deteccao.topDefensores.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <User className="h-4 w-4" />
                Top Defensores (matches confirmados)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {deteccao.topDefensores.map((d, i) => {
                  const max = deteccao.topDefensores[0]?.count || 1;
                  const pct = Math.round((d.count / max) * 100);
                  return (
                    <div key={i} className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300 truncate max-w-[70%]">
                          {d.nome}
                        </span>
                        <span className="text-xs text-zinc-500">{d.count}</span>
                      </div>
                      <div className="h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 rounded-full transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Análise Temporal */}
      {(byHora || byDiaSemana) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Hora do dia */}
          {byHora && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-zinc-700 dark:text-zinc-300 flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Ocorrências por Hora
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={byHora} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 9, fill: "#a1a1aa" }}
                      interval={3}
                      tickLine={false}
                    />
                    <YAxis tick={{ fontSize: 10, fill: "#a1a1aa" }} tickLine={false} axisLine={false} />
                    <Tooltip
                      contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e4e4e7" }}
                      formatter={(value) => [value, "ocorrências"]}
                    />
                    <Bar dataKey="total" fill="#10b981" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Dia da semana */}
          {byDiaSemana && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-zinc-700 dark:text-zinc-300 flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Ocorrências por Dia da Semana
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={byDiaSemana} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 11, fill: "#a1a1aa" }}
                      tickLine={false}
                    />
                    <YAxis tick={{ fontSize: 10, fill: "#a1a1aa" }} tickLine={false} axisLine={false} />
                    <Tooltip
                      contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e4e4e7" }}
                      formatter={(value) => [value, "ocorrências"]}
                    />
                    <Bar dataKey="total" fill="#6366f1" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Estado vazio */}
      {(!stats || stats.total === 0) && (
        <div className="text-center py-12">
          <Radio className="h-8 w-8 text-zinc-300 mx-auto mb-3" />
          <p className="text-sm text-zinc-500">
            Estatísticas serão exibidas após a coleta de notícias.
          </p>
        </div>
      )}
    </div>
  );
}
