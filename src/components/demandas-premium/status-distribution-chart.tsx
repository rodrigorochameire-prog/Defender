"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { getStatusConfig, STATUS_GROUPS } from "@/config/demanda-status";

interface StatusDistributionChartProps {
  demandas: any[];
}

export function StatusDistributionChart({ demandas }: StatusDistributionChartProps) {
  const data = Object.entries(
    demandas.reduce((acc: Record<string, number>, d) => {
      const config = getStatusConfig(d.status);
      const group = STATUS_GROUPS[config.group];
      acc[group.label] = (acc[group.label] || 0) + 1;
      return acc;
    }, {})
  )
    .map(([name, value]) => {
      const groupKey = Object.keys(STATUS_GROUPS).find(
        (key) => STATUS_GROUPS[key as keyof typeof STATUS_GROUPS].label === name
      );
      const color = groupKey ? STATUS_GROUPS[groupKey as keyof typeof STATUS_GROUPS].color : "#9CA3AF";
      return { name, value, color };
    })
    .sort((a, b) => b.value - a.value);

  if (data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-zinc-500 dark:text-zinc-400">
        Nenhuma demanda para exibir
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          outerRadius={100}
          label={({ name, percent }) => `${name}: ${((percent || 0) * 100).toFixed(0)}%`}
          labelLine={false}
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}
