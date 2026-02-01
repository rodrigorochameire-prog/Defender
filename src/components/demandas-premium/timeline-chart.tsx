"use client";

import { Card } from "@/components/ui/card";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { TrendingUp } from "lucide-react";
import { useMemo } from "react";

interface TimelineChartProps {
  demandas: any[];
}

export function TimelineChart({ demandas }: TimelineChartProps) {
  const timelineData = useMemo(() => {
    // Gerar dados dos últimos 7 dias
    const data = [];
    const hoje = new Date();
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(hoje);
      date.setDate(date.getDate() - i);
      const dateStr = date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
      
      // Simular contagem de demandas abertas e concluídas por dia
      const abertas = Math.floor(Math.random() * 15) + 5;
      const concluidas = Math.floor(Math.random() * 12) + 3;
      
      data.push({
        dia: dateStr,
        abertas,
        concluidas,
      });
    }
    
    return data;
  }, [demandas]);

  const totalAbertas = timelineData.reduce((sum, d) => sum + d.abertas, 0);
  const totalConcluidas = timelineData.reduce((sum, d) => sum + d.concluidas, 0);

  return (
    <Card className="border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xl overflow-hidden">
      {/* Header */}
      <div className="px-6 py-5 border-b border-zinc-100 dark:border-zinc-800 bg-gradient-to-r from-blue-50/50 via-purple-50/30 to-white dark:from-blue-950/20 dark:via-purple-950/10 dark:to-zinc-900">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-500 shadow-lg shadow-blue-500/30">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-50">
                Evolução Temporal
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Últimos 7 dias - Demandas abertas vs concluídas
              </p>
            </div>
          </div>
          <div className="flex gap-6">
            <div className="text-center px-5 py-3 rounded-xl bg-gradient-to-br from-emerald-50 to-emerald-100/30 dark:from-emerald-950/30 dark:to-emerald-900/10 border-2 border-emerald-200 dark:border-emerald-800 shadow-sm">
              <p className="text-xs font-bold text-emerald-700 dark:text-emerald-400 mb-1 uppercase tracking-wide">Total Abertas</p>
              <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                {totalAbertas}
              </p>
            </div>
            <div className="text-center px-5 py-3 rounded-xl bg-gradient-to-br from-blue-50 to-blue-100/30 dark:from-blue-950/30 dark:to-blue-900/10 border-2 border-blue-200 dark:border-blue-800 shadow-sm">
              <p className="text-xs font-bold text-blue-700 dark:text-blue-400 mb-1 uppercase tracking-wide">Total Concluídas</p>
              <p className="text-2xl font-black text-blue-600 dark:text-blue-400">
                {totalConcluidas}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="p-6 bg-gradient-to-b from-white to-zinc-50/30 dark:from-zinc-900 dark:to-zinc-900/50">
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={timelineData}>
            <defs>
              <linearGradient id="colorAbertas" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10B981" stopOpacity={0.5} />
                <stop offset="95%" stopColor="#10B981" stopOpacity={0.05} />
              </linearGradient>
              <linearGradient id="colorConcluidas" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.5} />
                <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.05} />
              </linearGradient>
              <filter id="shadow">
                <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.3"/>
              </filter>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:stroke-zinc-700" opacity={0.3} vertical={false} />
            <XAxis
              dataKey="dia"
              stroke="#9ca3af"
              tick={{ fill: "#52525b", fontSize: 12, fontWeight: 600 }}
              tickLine={false}
              axisLine={{ stroke: "#d4d4d8", strokeWidth: 2 }}
            />
            <YAxis
              stroke="#9ca3af"
              tick={{ fill: "#71717a", fontSize: 12, fontWeight: 600 }}
              tickLine={false}
              axisLine={{ stroke: "#d4d4d8", strokeWidth: 2 }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "rgba(255, 255, 255, 0.98)",
                border: "2px solid #e5e7eb",
                borderRadius: "16px",
                boxShadow: "0 20px 40px rgba(0, 0, 0, 0.15)",
                padding: "16px",
              }}
              labelStyle={{
                fontWeight: "800",
                color: "#18181b",
                marginBottom: "8px",
                fontSize: "14px",
              }}
              itemStyle={{
                fontWeight: "700",
                fontSize: "13px",
              }}
            />
            <Legend
              wrapperStyle={{
                paddingTop: "28px",
                fontSize: "13px",
                fontWeight: "700",
              }}
              iconType="circle"
              iconSize={14}
            />
            <Area
              type="monotone"
              dataKey="abertas"
              stroke="#10B981"
              strokeWidth={4}
              fill="url(#colorAbertas)"
              name="Abertas"
              filter="url(#shadow)"
              dot={{ r: 5, fill: "#10B981", strokeWidth: 3, stroke: "#fff" }}
              activeDot={{ r: 7, fill: "#10B981", strokeWidth: 3, stroke: "#fff" }}
            />
            <Area
              type="monotone"
              dataKey="concluidas"
              stroke="#3B82F6"
              strokeWidth={4}
              fill="url(#colorConcluidas)"
              name="Concluídas"
              filter="url(#shadow)"
              dot={{ r: 5, fill: "#3B82F6", strokeWidth: 3, stroke: "#fff" }}
              activeDot={{ r: 7, fill: "#3B82F6", strokeWidth: 3, stroke: "#fff" }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}