"use client";

import { trpc } from "@/lib/trpc/client";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, Legend
} from "recharts";

const COLORS = ["#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#84cc16", "#f97316"];

interface VolumeTrabalhoProps {
  inicio?: string;
  fim?: string;
}

export function VolumeTrabalho({ inicio, fim }: VolumeTrabalhoProps) {
  const { data, isLoading } = trpc.observatory.getVolume.useQuery(
    inicio && fim ? { inicio, fim } : undefined
  );

  if (isLoading) {
    return <div className="h-64 animate-pulse rounded-lg bg-neutral-100 dark:bg-neutral-800" />;
  }
  if (!data) return null;

  return (
    <section>
      <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
        Volume de Trabalho
      </h2>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Distribuição por comarca */}
        <div className="rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
          <p className="mb-3 text-xs font-medium uppercase text-neutral-500">Atendimentos por comarca</p>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={data.porComarca} layout="vertical">
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="comarca" tick={{ fontSize: 11 }} width={80} />
              <Tooltip />
              <Bar dataKey="total" fill="#10b981" radius={[0, 3, 3, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Tendência mensal */}
        <div className="rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
          <p className="mb-3 text-xs font-medium uppercase text-neutral-500">Tendência (6 meses)</p>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={data.tendencia}>
              <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Line type="monotone" dataKey="total" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Por tipo */}
        <div className="rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
          <p className="mb-3 text-xs font-medium uppercase text-neutral-500">Tipos de demanda</p>
          {data.porTipo.length === 0 ? (
            <p className="text-xs text-neutral-400">Sem dados no período.</p>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie
                  data={data.porTipo}
                  dataKey="total"
                  nameKey="tipo"
                  cx="50%"
                  cy="50%"
                  outerRadius={70}
                  label={({ percent }: { percent?: number }) =>
                    (percent ?? 0) > 0.05 ? `${((percent ?? 0) * 100).toFixed(0)}%` : ""
                  }
                >
                  {data.porTipo.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </section>
  );
}
