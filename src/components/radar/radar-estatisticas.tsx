"use client";

import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
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
import { Radio, AlertTriangle, MapPin, Link2, Newspaper, CheckCircle2, Clock, TrendingUp, TrendingDown, User, Calendar } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { getCrimeLabel } from "./radar-filtros";
import { cn } from "@/lib/utils";

const PERIODOS = [
  { value: "7d", label: "7 dias" },
  { value: "30d", label: "30 dias" },
  { value: "90d", label: "90 dias" },
  { value: "1a", label: "1 ano" },
  { value: "total", label: "Total" },
] as const;

// Cores alinhadas com CRIME_TYPES em radar-filtros.tsx (fonte canônica)
const CRIME_CHART_COLORS: Record<string, string> = {
  homicidio:           "#16a34a", // green-600
  tentativa_homicidio: "#22c55e", // green-500
  feminicidio:         "#16a34a", // green-600
  trafico:             "#dc2626", // red-600
  roubo:               "#ea580c", // orange-600
  violencia_domestica: "#ca8a04", // yellow-600
  sexual:              "#9333ea", // purple-600
  lesao_corporal:      "#e11d48", // rose-600
  furto:               "#f97316", // orange-500
  porte_arma:          "#db2777", // pink-600
  estelionato:         "#c026d3", // fuchsia-600
  execucao_penal:      "#1d4ed8", // blue-700
  outros:              "#71717a", // zinc-500
};

function getCrimeBadgeColor(tipo: string): string {
  const map: Record<string, string> = {
    homicidio:           "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
    tentativa_homicidio: "bg-green-100 text-green-600 dark:bg-green-900/40 dark:text-green-400",
    feminicidio:         "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
    trafico:             "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
    roubo:               "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
    violencia_domestica: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300",
    sexual:              "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
    lesao_corporal:      "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300",
    furto:               "bg-orange-100 text-orange-600 dark:bg-orange-900/40 dark:text-orange-300",
    porte_arma:          "bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300",
    estelionato:         "bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-900/40 dark:text-fuchsia-300",
    execucao_penal:      "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  };
  return map[tipo] ?? "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400";
}

function renderDelta(atual: number, anterior: number) {
  if (anterior === 0) return null;
  const pct = Math.round(((atual - anterior) / anterior) * 100);
  const up = pct >= 0;
  return (
    <span className={cn("text-[10px] flex items-center gap-0.5 mt-0.5", up ? "text-emerald-500" : "text-red-400")}>
      {up ? <TrendingUp className="h-2.5 w-2.5" /> : <TrendingDown className="h-2.5 w-2.5" />}
      {Math.abs(pct)}% vs semana anterior
    </span>
  );
}

interface RadarEstatisticasProps {
  tipoCrime?: string
  bairro?: string
}

export function RadarEstatisticas({ tipoCrime, bairro }: RadarEstatisticasProps = {}) {
  const [periodo, setPeriodo] = useState<string>("30d");

  const { data: stats, isLoading: statsLoading } = trpc.radar.stats.useQuery({
    periodo: periodo as any,
    tipoCrime: tipoCrime || undefined,
    bairro: bairro || undefined,
  });
  const { data: deteccao } = trpc.radar.statsDeteccao.useQuery({
    periodo: periodo as any,
  });
  const { data: bairros } = trpc.radar.statsByBairro.useQuery({
    periodo: periodo as any,
    limit: 10,
    tipoCrime: tipoCrime || undefined,
  });
  const { data: byHora } = trpc.radar.statsByHora.useQuery({ periodo: periodo as any });
  const { data: byDiaSemana } = trpc.radar.statsByDiaSemana.useQuery({ periodo: periodo as any });
  const { data: alertas } = trpc.radar.alertasCriticos.useQuery();
  const { data: statsComp } = trpc.radar.statsComparativo.useQuery();

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

      {/* Banner de filtros ativos */}
      {(tipoCrime || bairro) && (
        <div className="flex items-center gap-2 rounded-md bg-blue-50 dark:bg-blue-950/30 px-3 py-2 text-xs text-blue-700 dark:text-blue-300">
          <span>Estatísticas filtradas por:</span>
          {tipoCrime && tipoCrime !== "todos" && (
            <span className="font-medium">{getCrimeLabel(tipoCrime)}</span>
          )}
          {tipoCrime && tipoCrime !== "todos" && bairro && (
            <span className="text-blue-400">·</span>
          )}
          {bairro && <span className="font-medium">{bairro}</span>}
        </div>
      )}

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
                {statsComp && renderDelta(statsComp.noticias.atual, statsComp.noticias.anterior)}
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
                {statsComp && renderDelta(statsComp.matches.atual, statsComp.matches.anterior)}
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

      {/* Alertas Críticos — matches ≥80% pendentes */}
      {alertas && alertas.length > 0 && (
        <Card className="border-amber-200 dark:border-amber-900/40">
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              <span className="text-sm font-medium">Alertas críticos</span>
              <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 text-xs border-0">
                {alertas.length}
              </Badge>
              <span className="text-xs text-zinc-400 ml-1">matches ≥80% pendentes de revisão</span>
            </div>
            <div className="space-y-1.5">
              {alertas.map((alerta) => (
                <div
                  key={alerta.id}
                  className="flex items-center gap-3 p-2.5 rounded-lg border border-amber-100 dark:border-amber-900/30 bg-amber-50/50 dark:bg-amber-950/20"
                >
                  {/* Score badge */}
                  <span className="text-sm font-mono font-bold text-amber-600 w-12 shrink-0">
                    {alerta.scoreConfianca}%
                  </span>
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{alerta.assistidoNome}</p>
                    <p className="text-[10px] text-zinc-500 truncate">{alerta.noticiaTitulo}</p>
                  </div>
                  {/* Crime badge */}
                  {alerta.noticiaTipoCrime && (
                    <Badge
                      className={cn(
                        "text-[10px] shrink-0 border-0",
                        getCrimeBadgeColor(alerta.noticiaTipoCrime)
                      )}
                    >
                      {getCrimeLabel(alerta.noticiaTipoCrime)}
                    </Badge>
                  )}
                  {/* Tempo */}
                  <span className="text-[10px] text-zinc-400 shrink-0">
                    {formatDistanceToNow(new Date(alerta.createdAt), {
                      locale: ptBR,
                      addSuffix: true,
                    })}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

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
              <CardTitle className="text-sm font-medium text-zinc-700 dark:text-zinc-300 flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Top Bairros
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 space-y-2.5">
              {(() => {
                const maxCount = bairros[0]?.count ?? 1;
                return bairros.map((b, i) => (
                  <div key={b.bairro} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5">
                        <span className="text-zinc-400 w-4 text-right">{i + 1}</span>
                        <span className="font-medium text-zinc-800 dark:text-zinc-200 truncate max-w-[140px]">
                          {b.bairro}
                        </span>
                        {b.tipoCrimeDominante && (
                          <Badge
                            variant="secondary"
                            className={cn("text-[9px] px-1 py-0 leading-tight border-0", getCrimeBadgeColor(b.tipoCrimeDominante))}
                          >
                            {getCrimeLabel(b.tipoCrimeDominante)}
                          </Badge>
                        )}
                      </div>
                      <span className="text-zinc-500 shrink-0 ml-2">{b.count}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${(b.count / maxCount) * 100}%`,
                          backgroundColor: CRIME_CHART_COLORS[b.tipoCrimeDominante || "outros"] || "#71717a",
                        }}
                      />
                    </div>
                  </div>
                ));
              })()}
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
