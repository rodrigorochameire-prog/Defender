"use client";

import { trpc } from "@/lib/trpc/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import { Radio, ArrowRight, Newspaper, Link2, MapPin } from "lucide-react";

export function RadarWidget() {
  const { data: stats, isLoading } = trpc.radar.stats.useQuery(
    { periodo: "7d" },
  );

  const { data: bairros } = trpc.radar.statsByBairro.useQuery(
    { periodo: "7d", limit: 3 },
  );

  if (isLoading) {
    return (
      <Card className="relative bg-white dark:bg-card border border-zinc-200/80 dark:border-border rounded-xl overflow-hidden">
        <div className="h-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500" />
        <div className="p-5 space-y-3">
          <Skeleton className="h-5 w-32" />
          <div className="grid grid-cols-3 gap-3">
            <Skeleton className="h-16 rounded-lg" />
            <Skeleton className="h-16 rounded-lg" />
            <Skeleton className="h-16 rounded-lg" />
          </div>
        </div>
      </Card>
    );
  }

  // Não mostrar se não há dados
  if (!stats || stats.total === 0) return null;

  const homicidios = stats.porTipo.find((t) => t.tipo === "homicidio")?.count ?? 0;

  return (
    <Card className="group/card relative bg-white dark:bg-card border border-zinc-200/80 dark:border-border rounded-xl overflow-hidden hover:border-emerald-200 dark:hover:border-emerald-800/50 transition-all duration-300">
      {/* Accent bar */}
      <div className="h-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500" />

      <div className="px-5 py-3 border-b border-zinc-100 dark:border-border flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
            <Radio className="w-4 h-4 text-emerald-600 dark:text-emerald-400 animate-pulse" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-zinc-800 dark:text-foreground tracking-tight">
              Radar Criminal
            </h3>
            <p className="text-[10px] text-zinc-400 dark:text-muted-foreground">Últimos 7 dias</p>
          </div>
        </div>
        <Link href="/admin/radar">
          <Button variant="ghost" size="sm" className="h-7 text-xs text-zinc-400 hover:text-emerald-600 cursor-pointer">
            Acessar <ArrowRight className="w-3 h-3 ml-1" />
          </Button>
        </Link>
      </div>

      <div className="p-4">
        <div className="grid grid-cols-3 gap-3">
          {/* KPI 1: Notícias */}
          <div className="text-center p-3 rounded-lg bg-zinc-50/80 dark:bg-muted/50">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Newspaper className="h-3 w-3 text-zinc-400" />
            </div>
            <p className="text-lg font-bold text-zinc-700 dark:text-foreground/80">
              {stats.total}
            </p>
            <p className="text-[9px] text-zinc-500 dark:text-muted-foreground uppercase tracking-wide">
              Ocorrências
            </p>
          </div>

          {/* KPI 2: Matches DPE */}
          <div className={`text-center p-3 rounded-lg ${
            stats.totalMatches > 0
              ? "bg-rose-50/80 dark:bg-rose-900/10"
              : "bg-zinc-50/80 dark:bg-muted/50"
          }`}>
            <div className="flex items-center justify-center gap-1 mb-1">
              <Link2 className="h-3 w-3 text-zinc-400" />
            </div>
            <p className={`text-lg font-bold ${
              stats.totalMatches > 0
                ? "text-rose-600 dark:text-rose-400"
                : "text-zinc-400"
            }`}>
              {stats.totalMatches}
            </p>
            <p className="text-[9px] text-zinc-500 dark:text-muted-foreground uppercase tracking-wide">
              Matches DPE
            </p>
          </div>

          {/* KPI 3: Homicídios */}
          <div className={`text-center p-3 rounded-lg ${
            homicidios > 0
              ? "bg-red-50/80 dark:bg-red-900/10"
              : "bg-zinc-50/80 dark:bg-muted/50"
          }`}>
            <div className="flex items-center justify-center gap-1 mb-1">
              <MapPin className="h-3 w-3 text-zinc-400" />
            </div>
            <p className={`text-lg font-bold ${
              homicidios > 0
                ? "text-red-600 dark:text-red-400"
                : "text-zinc-400"
            }`}>
              {homicidios}
            </p>
            <p className="text-[9px] text-zinc-500 dark:text-muted-foreground uppercase tracking-wide">
              Homicídios
            </p>
          </div>
        </div>

        {/* Top bairros */}
        {bairros && bairros.length > 0 && (
          <div className="mt-3 pt-3 border-t border-zinc-100 dark:border-border">
            <p className="text-[10px] text-zinc-400 uppercase tracking-wide mb-1.5">Top Bairros</p>
            <div className="flex flex-wrap gap-1.5">
              {bairros.map((b) => (
                <span
                  key={b.bairro}
                  className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-muted text-zinc-600 dark:text-muted-foreground"
                >
                  {b.bairro}
                  <span className="font-semibold">{b.count}</span>
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
