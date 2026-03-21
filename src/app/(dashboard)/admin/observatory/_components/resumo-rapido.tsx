"use client";

import { trpc } from "@/lib/trpc/client";
import { MetricCard } from "./metric-card";
import { Users, FileText, Scale, UserPlus, Brain, Activity } from "lucide-react";

export function ResumoRapido() {
  const { data, isLoading } = trpc.observatory.getResumoRapido.useQuery();

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-lg bg-zinc-100 dark:bg-zinc-800" />
        ))}
      </div>
    );
  }

  if (!data) return null;

  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          Últimos 30 dias
        </h2>
        <span className="text-xs text-zinc-400">vs. 30 dias anteriores</span>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <MetricCard label="Atendimentos" value={data.atendimentos.total} variacao={data.atendimentos.variacao} icon={<Users className="h-4 w-4 text-zinc-400" />} />
        <MetricCard label="Demandas" value={data.demandas.total} variacao={data.demandas.variacao} icon={<FileText className="h-4 w-4 text-zinc-400" />} />
        <MetricCard label="Processos" value={data.processos.total} variacao={data.processos.variacao} icon={<Scale className="h-4 w-4 text-zinc-400" />} />
        <MetricCard label="Assistidos novos" value={data.assistidosNovos.total} variacao={data.assistidosNovos.variacao} icon={<UserPlus className="h-4 w-4 text-zinc-400" />} />
        <MetricCard label="Análises IA" value={data.analisesIa.total} variacao={data.analisesIa.variacao} icon={<Brain className="h-4 w-4 text-zinc-400" />} />
        <MetricCard label="Defensores ativos" value={data.defensoresAtivos.total} variacao={null} icon={<Activity className="h-4 w-4 text-zinc-400" />} />
      </div>
    </section>
  );
}
