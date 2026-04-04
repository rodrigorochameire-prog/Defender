"use client";

import { trpc } from "@/lib/trpc/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, MapPin, Shield, BarChart3, AlertTriangle, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import type { RadarScope } from "./radar-scope-selector";

// Cores por município
const SCOPE_COLORS: Record<RadarScope, string> = {
  camacari: "bg-emerald-500",
  rms: "bg-blue-500",
  salvador: "bg-purple-500",
};

const SCOPE_LABELS: Record<RadarScope, string> = {
  camacari: "Camaçari",
  rms: "RMS",
  salvador: "Salvador",
};

// Cores alinhadas com CRIME_TYPES em radar-filtros.tsx (fonte canônica)
const CRIME_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  homicidio:          { label: "Homicídio",       color: "text-green-700 dark:text-green-400",  bg: "bg-green-600" },
  tentativa_homicidio:{ label: "Tent. Homicídio", color: "text-green-600 dark:text-green-400",  bg: "bg-green-500" },
  feminicidio:        { label: "Feminicídio",     color: "text-green-700 dark:text-green-400",  bg: "bg-green-600" },
  trafico:            { label: "Tráfico",         color: "text-red-600 dark:text-red-400",      bg: "bg-red-600" },
  roubo:              { label: "Roubo",           color: "text-orange-700 dark:text-orange-400",bg: "bg-orange-600" },
  violencia_domestica:{ label: "Viol. Dom.",      color: "text-yellow-700 dark:text-yellow-400",bg: "bg-yellow-500" },
  sexual:             { label: "Crime Sexual",    color: "text-purple-600 dark:text-purple-400",bg: "bg-purple-600" },
  lesao_corporal:     { label: "Lesão Corporal",  color: "text-rose-700 dark:text-rose-400",    bg: "bg-rose-600" },
  furto:              { label: "Furto",           color: "text-orange-600 dark:text-orange-300",bg: "bg-orange-500" },
  porte_arma:         { label: "Porte Arma",      color: "text-pink-600 dark:text-pink-400",    bg: "bg-pink-600" },
  estelionato:        { label: "Estelionato",     color: "text-fuchsia-700 dark:text-fuchsia-400",bg: "bg-fuchsia-600" },
  execucao_penal:     { label: "Exec. Penal",     color: "text-blue-700 dark:text-blue-400",    bg: "bg-blue-700" },
  outros:             { label: "Outros",          color: "text-neutral-600 dark:text-neutral-400",    bg: "bg-neutral-400" },
};

interface Props {
  scope: RadarScope;
  dias?: number;
  onSelectTipoCrime?: (tipo: string) => void;
}

export function RadarIntelligencePanel({ scope, dias = 30, onSelectTipoCrime }: Props) {
  const { data, isLoading } = trpc.radar.statsByMunicipio.useQuery({ dias });

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-24 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  const allStats = data?.stats ?? [];
  const topBairros = data?.topBairros ?? {};
  const currentStats = allStats.find((s) => s.municipio === scope);
  const currentBairros = topBairros[scope] ?? [];

  // Dados comparativos
  const allScopes: RadarScope[] = ["camacari", "rms", "salvador"];
  const maxTotal = Math.max(...allStats.map((s) => s.total), 1);

  // Ranking de crimes do escopo atual
  const crimeRanking = currentStats
    ? [
        { tipo: "homicidio", count: currentStats.homicidios },
        { tipo: "trafico", count: currentStats.trafico },
        { tipo: "roubo", count: currentStats.roubos },
        { tipo: "sexual", count: currentStats.sexual },
        { tipo: "violencia_domestica", count: currentStats.vd },
      ]
        .filter((c) => c.count > 0)
        .sort((a, b) => b.count - a.count)
    : [];

  const totalCrimes = crimeRanking.reduce((s, c) => s + c.count, 0);

  return (
    <div className="space-y-4">
      {/* === TOP BAIRROS === */}
      <div className="rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-neutral-100 dark:border-neutral-800">
          <MapPin className="h-3.5 w-3.5 text-neutral-400" />
          <span className="text-xs font-semibold text-neutral-600 dark:text-neutral-400 uppercase tracking-wide">
            Top Bairros — {SCOPE_LABELS[scope]}
          </span>
        </div>

        <div className="p-3 space-y-1.5">
          {currentBairros.length === 0 ? (
            <p className="text-xs text-neutral-400 text-center py-3">
              Aguardando dados geocodificados
            </p>
          ) : (
            currentBairros.map((b, i) => {
              const maxCount = currentBairros[0]?.total ?? 1;
              const pct = Math.round((b.total / maxCount) * 100);
              return (
                <div key={b.bairro} className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-neutral-400 w-3 text-right">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-xs font-medium text-neutral-700 dark:text-neutral-300 truncate">
                        {b.bairro}
                      </span>
                      <span className="text-[10px] font-semibold text-neutral-500 ml-2">{b.total}</span>
                    </div>
                    <div className="h-1 rounded-full bg-neutral-100 dark:bg-neutral-800 overflow-hidden">
                      <div
                        className={cn("h-full rounded-full transition-all duration-500", SCOPE_COLORS[scope])}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* === RANKING DE CRIMES === */}
      <div className="rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-neutral-100 dark:border-neutral-800">
          <Shield className="h-3.5 w-3.5 text-neutral-400" />
          <span className="text-xs font-semibold text-neutral-600 dark:text-neutral-400 uppercase tracking-wide">
            Crime Ranking
          </span>
          <span className="ml-auto text-[10px] text-neutral-400">{dias}d</span>
        </div>

        <div className="p-3 space-y-2">
          {crimeRanking.length === 0 ? (
            <p className="text-xs text-neutral-400 text-center py-3">Sem dados ainda</p>
          ) : (
            crimeRanking.map((c) => {
              const config = CRIME_CONFIG[c.tipo] ?? CRIME_CONFIG.outros;
              const pct = totalCrimes > 0 ? Math.round((c.count / totalCrimes) * 100) : 0;
              const isClickable = !!onSelectTipoCrime;
              return (
                <div
                  key={c.tipo}
                  className={cn(
                    "flex items-center gap-2 rounded-md px-1.5 py-0.5 -mx-1.5 transition-colors",
                    isClickable && "cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-800/60"
                  )}
                  onClick={isClickable ? () => onSelectTipoCrime(c.tipo) : undefined}
                  title={isClickable ? `Filtrar por ${config.label}` : undefined}
                >
                  <div className={cn("w-2 h-2 rounded-full flex-shrink-0", config.bg)} />
                  <span className={cn("text-xs font-medium flex-1", config.color)}>{config.label}</span>
                  <div className="w-16 h-1.5 rounded-full bg-neutral-100 dark:bg-neutral-800 overflow-hidden">
                    <div
                      className={cn("h-full rounded-full", config.bg)}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-[10px] font-semibold text-neutral-500 w-8 text-right">
                    {pct}%
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* === COMPARATIVO === */}
      <div className="rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-neutral-100 dark:border-neutral-800">
          <BarChart3 className="h-3.5 w-3.5 text-neutral-400" />
          <span className="text-xs font-semibold text-neutral-600 dark:text-neutral-400 uppercase tracking-wide">
            Comparativo {dias}d
          </span>
        </div>

        <div className="p-3 space-y-2">
          {allScopes.map((s) => {
            const stat = allStats.find((r) => r.municipio === s);
            const total = stat?.total ?? 0;
            const pct = Math.round((total / maxTotal) * 100);
            const isCurrentScope = s === scope;

            return (
              <div key={s} className="flex items-center gap-2">
                <span
                  className={cn(
                    "text-xs w-20 flex-shrink-0",
                    isCurrentScope
                      ? "font-semibold text-neutral-800 dark:text-neutral-100"
                      : "text-neutral-500 dark:text-neutral-400"
                  )}
                >
                  {SCOPE_LABELS[s]}
                </span>
                <div className="flex-1 h-2 rounded-full bg-neutral-100 dark:bg-neutral-800 overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-700",
                      isCurrentScope ? SCOPE_COLORS[s] : "bg-neutral-300 dark:bg-neutral-600"
                    )}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span
                  className={cn(
                    "text-[11px] font-semibold w-6 text-right",
                    isCurrentScope ? "text-neutral-800 dark:text-neutral-200" : "text-neutral-400"
                  )}
                >
                  {total}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* === ALERTAS DE TENDÊNCIA === */}
      {currentStats && currentStats.homicidios > 3 && (
        <div className="rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/20 p-3 flex gap-2">
          <AlertTriangle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-semibold text-red-700 dark:text-red-400">
              Alta incidência de homicídios
            </p>
            <p className="text-[11px] text-red-600 dark:text-red-500 mt-0.5">
              {currentStats.homicidios} casos em {dias} dias em {SCOPE_LABELS[scope]}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
