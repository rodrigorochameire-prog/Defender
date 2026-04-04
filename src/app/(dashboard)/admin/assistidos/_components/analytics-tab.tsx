"use client";

import React, { useMemo } from "react";
import { differenceInDays, parseISO, format } from "date-fns";
import { ATRIBUICAO_OPTIONS, SOLID_COLOR_MAP } from "@/lib/config/atribuicoes";
import { AssistidoUI } from "./assistido-types";
import { computeCompletude } from "./assistido-utils";
import { DonutChart } from "./donut-chart";
import { BarChartSimple } from "./bar-chart-simple";

export function AnalyticsTab({ assistidos }: { assistidos: AssistidoUI[] }) {
  const atribuicaoData = useMemo(() => {
    const counts: Record<string, number> = {};
    assistidos.forEach((a) => {
      const attrs = a.atribuicoes || a.areas || [];
      if (attrs.length === 0) {
        counts["Sem atribuicao"] = (counts["Sem atribuicao"] || 0) + 1;
      } else {
        attrs.forEach((attr) => {
          const normalizedAttr = attr.toUpperCase().replace(/_/g, " ");
          const option = ATRIBUICAO_OPTIONS.find(
            (o) =>
              o.value.toUpperCase() === normalizedAttr ||
              o.label.toUpperCase().includes(normalizedAttr) ||
              normalizedAttr.includes(o.value.toUpperCase())
          );
          const label = option?.shortLabel || attr;
          counts[label] = (counts[label] || 0) + 1;
        });
      }
    });
    return Object.entries(counts).map(([label, value]) => {
      const option = ATRIBUICAO_OPTIONS.find((o) => o.shortLabel === label);
      const color = option ? SOLID_COLOR_MAP[option.value] || "#71717a" : "#71717a";
      return { label, value, color };
    });
  }, [assistidos]);

  const statusData = useMemo(() => {
    const presos = assistidos.filter((a) =>
      ["CADEIA_PUBLICA", "PENITENCIARIA", "COP", "HOSPITAL_CUSTODIA"].includes(a.statusPrisional)
    ).length;
    const monitorados = assistidos.filter((a) =>
      ["MONITORADO", "DOMICILIAR"].includes(a.statusPrisional)
    ).length;
    const soltos = assistidos.filter((a) => a.statusPrisional === "SOLTO" || !a.statusPrisional).length;
    return [
      { label: "Presos", value: presos, color: "#f43f5e" },
      { label: "Monitorados", value: monitorados, color: "#f59e0b" },
      { label: "Soltos", value: soltos, color: "#10b981" },
    ];
  }, [assistidos]);

  const generalStats = useMemo(() => {
    const totalProcessos = assistidos.reduce((sum, a) => sum + (a.processosAtivos || 0), 0);
    const mediaProcessos = assistidos.length > 0 ? (totalProcessos / assistidos.length).toFixed(1) : "0";
    const comDrive = assistidos.filter((a) => a.driveFolderId).length;
    const pctDrive = assistidos.length > 0 ? Math.round((comDrive / assistidos.length) * 100) : 0;
    const comAudienciaProxima = assistidos.filter((a) => {
      if (!a.proximaAudiencia) return false;
      const dias = differenceInDays(parseISO(a.proximaAudiencia), new Date());
      return dias >= 0 && dias <= 30;
    }).length;
    const pctAudiencia = assistidos.length > 0 ? Math.round((comAudienciaProxima / assistidos.length) * 100) : 0;
    const completudeMedia = assistidos.length > 0
      ? Math.round(assistidos.reduce((sum, a) => sum + computeCompletude(a), 0) / assistidos.length)
      : 0;
    return { mediaProcessos, pctDrive, pctAudiencia, completudeMedia };
  }, [assistidos]);

  const monthlyData = useMemo(() => {
    const months: Record<string, number> = {};
    const now = new Date();
    // Last 6 months
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = format(d, "yyyy-MM");
      months[key] = 0;
    }
    assistidos.forEach((a) => {
      if (!a.createdAt) return;
      const key = a.createdAt.substring(0, 7); // yyyy-MM
      if (key in months) months[key]++;
    });
    return Object.entries(months).map(([key, value]) => ({
      label: format(parseISO(key + "-01"), "MMM"),
      value,
      color: "#10b981",
    }));
  }, [assistidos]);

  return (
    <div className="space-y-6 p-5">
      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Media processos/assistido", value: generalStats.mediaProcessos },
          { label: "Com Drive vinculado", value: `${generalStats.pctDrive}%` },
          { label: "Audiencia proxima (30d)", value: `${generalStats.pctAudiencia}%` },
          { label: "Completude media", value: `${generalStats.completudeMedia}%` },
        ].map((s) => (
          <div key={s.label} className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200/60 dark:border-neutral-700/60">
            <p className="text-2xl font-bold text-neutral-800 dark:text-neutral-100 tabular-nums">{s.value}</p>
            <p className="text-[10px] text-neutral-400 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Atribuicoes Donut */}
        <div className="p-4 rounded-xl border border-neutral-200/60 dark:border-neutral-700/60 bg-white dark:bg-neutral-900">
          <p className="text-xs font-semibold text-neutral-600 dark:text-neutral-300 mb-4">Distribuicao por Atribuicao</p>
          <DonutChart data={atribuicaoData} />
        </div>

        {/* Status Bar */}
        <div className="p-4 rounded-xl border border-neutral-200/60 dark:border-neutral-700/60 bg-white dark:bg-neutral-900">
          <p className="text-xs font-semibold text-neutral-600 dark:text-neutral-300 mb-4">Distribuicao por Status</p>
          <BarChartSimple data={statusData} />
        </div>
      </div>

      {/* Monthly Trend */}
      <div className="p-4 rounded-xl border border-neutral-200/60 dark:border-neutral-700/60 bg-white dark:bg-neutral-900">
        <p className="text-xs font-semibold text-neutral-600 dark:text-neutral-300 mb-4">Novos cadastros (ultimos 6 meses)</p>
        <BarChartSimple data={monthlyData} />
      </div>
    </div>
  );
}
