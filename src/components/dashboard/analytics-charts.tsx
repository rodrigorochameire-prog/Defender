"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, TrendingUp, PieChart, Target } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart as RechartsPie,
  Pie,
  Cell,
  Legend,
  Area,
  AreaChart,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
} from "recharts";

// Paleta de cores jurídica premium
const COLORS = {
  primary: "hsl(158, 64%, 38%)",
  secondary: "hsl(215, 28%, 32%)",
  success: "hsl(142, 72%, 42%)",
  warning: "hsl(45, 93%, 47%)",
  error: "hsl(0, 72%, 51%)",
  muted: "hsl(220, 14%, 65%)",
};

const CHART_COLORS = [
  "hsl(158, 64%, 38%)", // Emerald primary
  "hsl(215, 28%, 32%)", // Navy
  "hsl(158, 50%, 55%)", // Emerald light
  "hsl(200, 70%, 55%)", // Blue
  "hsl(215, 20%, 55%)", // Slate
  "hsl(25, 85%, 50%)",  // Orange
];

interface ChartData {
  areas?: { name: string; value: number }[];
  status?: { name: string; value: number }[];
  timeline?: { date: string; demandas: number; protocolados: number }[];
  funilPrazos?: { name: string; value: number; fill: string }[];
}

interface AnalyticsChartsProps {
  chartData: ChartData;
}

export function AnalyticsCharts({ chartData }: AnalyticsChartsProps) {
  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Gráfico de Distribuição por Área */}
        <Card className="section-card">
          <CardHeader className="section-card-header">
            <div className="section-card-title">
              <BarChart3 className="h-5 w-5" />
              <div>
                <CardTitle className="text-base">Demandas por Área</CardTitle>
                <CardDescription className="mt-0.5">Distribuição por setor</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="section-card-content">
            {chartData.areas && chartData.areas.length > 0 ? (
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData.areas} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 14%, 90%)" />
                    <XAxis type="number" stroke="hsl(215, 16%, 50%)" fontSize={12} />
                    <YAxis 
                      type="category" 
                      dataKey="name" 
                      width={100} 
                      stroke="hsl(215, 16%, 50%)" 
                      fontSize={12}
                      tickFormatter={(value) => value.length > 12 ? value.slice(0, 12) + '...' : value}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'white', 
                        border: '1px solid hsl(220, 14%, 90%)',
                        borderRadius: '12px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                      }} 
                    />
                    <Bar dataKey="value" fill={COLORS.primary} radius={[0, 8, 8, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                Nenhum dado disponível
              </div>
            )}
          </CardContent>
        </Card>

        {/* Gráfico de Status */}
        <Card className="section-card">
          <CardHeader className="section-card-header">
            <div className="section-card-title">
              <PieChart className="h-5 w-5" />
              <div>
                <CardTitle className="text-base">Status das Demandas</CardTitle>
                <CardDescription className="mt-0.5">Distribuição por status</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="section-card-content">
            {chartData.status && chartData.status.length > 0 ? (
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPie>
                    <Pie
                      data={chartData.status}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={2}
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                      labelLine={false}
                    >
                      {chartData.status.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'white', 
                        border: '1px solid hsl(220, 14%, 90%)',
                        borderRadius: '12px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                      }} 
                    />
                  </RechartsPie>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                Nenhum dado disponível
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Gráfico de Timeline */}
      <Card className="section-card">
        <CardHeader className="section-card-header">
          <div className="section-card-title">
            <TrendingUp className="h-5 w-5" />
            <div>
              <CardTitle className="text-base">Atividade nos Últimos 7 Dias</CardTitle>
              <CardDescription className="mt-0.5">Demandas recebidas e protocoladas</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="section-card-content">
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData.timeline || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 14%, 90%)" />
                <XAxis dataKey="date" stroke="hsl(215, 16%, 50%)" fontSize={12} />
                <YAxis stroke="hsl(215, 16%, 50%)" fontSize={12} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'white', 
                    border: '1px solid hsl(220, 14%, 90%)',
                    borderRadius: '12px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                  }} 
                />
                <Legend />
                <Area 
                  type="monotone" 
                  dataKey="demandas" 
                  name="Demandas"
                  stroke={COLORS.primary} 
                  fill={COLORS.primary} 
                  fillOpacity={0.3}
                />
                <Area 
                  type="monotone" 
                  dataKey="protocolados" 
                  name="Protocolados"
                  stroke={COLORS.secondary} 
                  fill={COLORS.secondary} 
                  fillOpacity={0.3}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Funil de Prazos */}
      {chartData.funilPrazos && chartData.funilPrazos.length > 0 && (
        <Card className="section-card">
          <CardHeader className="section-card-header">
            <div className="section-card-title">
              <Target className="h-5 w-5" />
              <div>
                <CardTitle className="text-base">Funil de Prazos</CardTitle>
                <CardDescription className="mt-0.5">Status do fluxo de trabalho</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="section-card-content">
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartData.funilPrazos}
                  layout="vertical"
                  margin={{ left: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 14%, 90%)" horizontal={false} />
                  <XAxis type="number" stroke="hsl(215, 16%, 50%)" fontSize={12} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={100}
                    stroke="hsl(215, 16%, 50%)"
                    fontSize={12}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "white",
                      border: "1px solid hsl(220, 14%, 90%)",
                      borderRadius: "12px",
                      boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                    }}
                  />
                  <Bar dataKey="value" radius={[0, 8, 8, 0]}>
                    {chartData.funilPrazos.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/**
 * RadarCargaChart - Gráfico de Radar para distribuição de carga
 */
interface RadarCargaProps {
  data: { area: string; value: number }[];
}

export function RadarCargaChart({ data }: RadarCargaProps) {
  return (
    <div className="h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={data}>
          <PolarGrid stroke="hsl(220, 14%, 88%)" />
          <PolarAngleAxis
            dataKey="area"
            tick={{ fill: "hsl(215, 16%, 47%)", fontSize: 12 }}
          />
          <PolarRadiusAxis
            angle={30}
            domain={[0, "auto"]}
            tick={{ fill: "hsl(215, 16%, 47%)", fontSize: 10 }}
          />
          <Radar
            name="Demandas"
            dataKey="value"
            stroke={COLORS.primary}
            fill={COLORS.primary}
            fillOpacity={0.3}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "white",
              border: "1px solid hsl(220, 14%, 90%)",
              borderRadius: "12px",
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
            }}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}

/**
 * ProgressBarChart - Barras de progresso estilizadas
 */
interface ProgressBarProps {
  label: string;
  value: number;
  maxValue?: number;
  color?: "primary" | "success" | "warning" | "error";
}

export function ProgressBar({ label, value, maxValue = 100, color = "primary" }: ProgressBarProps) {
  const percentage = Math.min((value / maxValue) * 100, 100);
  
  const colorClasses = {
    primary: "bg-emerald-600",
    success: "bg-green-600",
    warning: "bg-amber-500",
    error: "bg-red-600",
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{label}</span>
        <span className="font-semibold">{value}%</span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div 
          className={`h-full rounded-full transition-all duration-500 ${colorClasses[color]}`} 
          style={{ width: `${percentage}%` }} 
        />
      </div>
    </div>
  );
}
