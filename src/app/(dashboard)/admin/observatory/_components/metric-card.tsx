"use client";

import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface MetricCardProps {
  label: string;
  value: number;
  variacao: number | null;
  icon?: React.ReactNode;
}

export function MetricCard({ label, value, variacao, icon }: MetricCardProps) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-center justify-between">
        <span className="text-sm text-zinc-500 dark:text-zinc-400">{label}</span>
        {icon}
      </div>
      <div className="mt-2 flex items-end gap-2">
        <span className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">
          {value.toLocaleString("pt-BR")}
        </span>
        {variacao !== null && (
          <span className={`mb-1 flex items-center gap-0.5 text-xs font-medium ${
            variacao > 0 ? "text-emerald-600" : variacao < 0 ? "text-red-500" : "text-zinc-400"
          }`}>
            {variacao > 0 ? <TrendingUp className="h-3 w-3" /> :
             variacao < 0 ? <TrendingDown className="h-3 w-3" /> :
             <Minus className="h-3 w-3" />}
            {Math.abs(variacao)}%
          </span>
        )}
      </div>
    </div>
  );
}
