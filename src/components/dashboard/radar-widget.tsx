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
      <Card className="bg-white dark:bg-neutral-900 rounded-xl shadow-sm shadow-black/[0.04] border-2 border-[#414144] dark:border-neutral-500 overflow-hidden">
        <div className="p-5 space-y-3">
          <Skeleton className="h-5 w-32" />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
    <Card className="bg-white dark:bg-neutral-900 rounded-xl shadow-sm shadow-black/[0.04] border-2 border-[#414144] dark:border-neutral-500 overflow-hidden transition-all duration-200">
      <div className="px-5 py-4 bg-neutral-50/60 dark:bg-neutral-900/40 border-b border-neutral-200/60 dark:border-neutral-800/60 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-neutral-200 dark:border-neutral-700 flex items-center justify-center">
            <Radio className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <h3 className="font-serif text-[17px] font-semibold text-foreground tracking-tight leading-tight">
              Radar Criminal
            </h3>
            <p className="text-[11px] text-muted-foreground">Últimos 7 dias</p>
          </div>
        </div>
        <Link href="/admin/radar">
          <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground hover:text-emerald-600 cursor-pointer">
            Acessar <ArrowRight className="w-3 h-3 ml-1" />
          </Button>
        </Link>
      </div>

      <div className="p-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* KPI 1: Notícias */}
          <div className="text-center p-3 rounded-lg bg-neutral-50/50 dark:bg-neutral-800/20">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Newspaper className="h-3 w-3 text-neutral-400" />
            </div>
            <p className="text-lg font-semibold text-neutral-700 dark:text-foreground/80">
              {stats.total}
            </p>
            <p className="text-[9px] text-muted-foreground uppercase tracking-wide">
              Ocorrências
            </p>
          </div>

          {/* KPI 2: Matches DPE */}
          <div className={`text-center p-3 rounded-lg ${
            stats.totalMatches > 0
              ? "bg-rose-50/50 dark:bg-rose-900/10"
              : "bg-neutral-50/50 dark:bg-neutral-800/20"
          }`}>
            <div className="flex items-center justify-center gap-1 mb-1">
              <Link2 className="h-3 w-3 text-neutral-400" />
            </div>
            <p className={`text-lg font-semibold ${
              stats.totalMatches > 0
                ? "text-rose-600 dark:text-rose-400"
                : "text-neutral-400"
            }`}>
              {stats.totalMatches}
            </p>
            <p className="text-[9px] text-muted-foreground uppercase tracking-wide">
              Matches DPE
            </p>
          </div>

          {/* KPI 3: Homicídios */}
          <div className={`text-center p-3 rounded-lg ${
            homicidios > 0
              ? "bg-red-50/50 dark:bg-red-900/10"
              : "bg-neutral-50/50 dark:bg-neutral-800/20"
          }`}>
            <div className="flex items-center justify-center gap-1 mb-1">
              <MapPin className="h-3 w-3 text-neutral-400" />
            </div>
            <p className={`text-lg font-semibold ${
              homicidios > 0
                ? "text-red-600 dark:text-red-400"
                : "text-neutral-400"
            }`}>
              {homicidios}
            </p>
            <p className="text-[9px] text-muted-foreground uppercase tracking-wide">
              Homicídios
            </p>
          </div>
        </div>

        {/* Top bairros */}
        {bairros && bairros.length > 0 && (
          <div className="mt-3 pt-3 border-t border-neutral-200/60 dark:border-neutral-800/60">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1.5">Top Bairros</p>
            <div className="flex flex-wrap gap-1.5">
              {bairros.map((b) => (
                <span
                  key={b.bairro}
                  className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400"
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
