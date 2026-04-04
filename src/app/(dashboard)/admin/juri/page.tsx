"use client";

import { useState, useMemo, lazy, Suspense } from "react";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc/client";
import {
  Gavel, Calendar, CheckCircle2, Clock, AlertTriangle, Zap, Eye,
  Users, ChevronLeft, ChevronRight, ClipboardList, Loader2,
} from "lucide-react";
import Link from "next/link";

// Lazy-load tab components
const PautaTab = lazy(() => import("@/components/juri/PautaTab"));
const JuradosTab = lazy(() => import("@/components/juri/JuradosTab").then(m => ({ default: m.JuradosTab })));

type Tab = "pauta" | "jurados";

const TABS: { key: Tab; label: string; icon: typeof Gavel }[] = [
  { key: "pauta", label: "Pauta", icon: Calendar },
  { key: "jurados", label: "Jurados", icon: Users },
];

function TabSpinner() {
  return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
    </div>
  );
}

export default function JuriPage() {
  const [activeTab, setActiveTab] = useState<Tab>("pauta");
  const [ano, setAno] = useState(new Date().getFullYear());

  // Stats queries
  const { data: proximasSessoes } = trpc.juri.proximas.useQuery({ dias: 30 });
  const { data: pendentes } = trpc.avaliacaoJuri.registroPendentes.useQuery();
  const { data: statsData } = trpc.juri.stats.useQuery();

  const stats = useMemo(() => {
    const agendadas = statsData?.agendadas ?? 0;
    const realizadas = statsData?.realizadas ?? 0;

    let proximaDias: number | null = null;
    if (proximasSessoes && proximasSessoes.length > 0) {
      const next = new Date(proximasSessoes[0].dataSessao);
      const now = new Date(); now.setHours(0, 0, 0, 0);
      proximaDias = Math.ceil((next.getTime() - now.getTime()) / 86400000);
    }

    return { agendadas, realizadas, proximaDias, pendentesCount: pendentes?.length ?? 0 };
  }, [statsData, proximasSessoes, pendentes]);

  return (
    <div className="w-full min-h-screen bg-background">
      {/* Header */}
      <div className="px-4 sm:px-6 md:px-8 py-4 bg-card border-b border-border space-y-3">
        {/* Row 1: Title + Stats + Cockpit button */}
        <div className="flex items-center gap-4">
          {/* Title */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-10 h-10 rounded-xl bg-neutral-800 dark:bg-neutral-200 flex items-center justify-center">
              <Gavel className="w-5 h-5 text-white dark:text-foreground" />
            </div>
            <div>
              <h1 className="font-serif text-xl font-semibold text-foreground tracking-tight">
                Tribunal do Júri
              </h1>
              <p className="text-[11px] text-muted-foreground -mt-0.5">
                Gestão de sessões e julgamentos
              </p>
            </div>
          </div>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Stats inline */}
          <div className="hidden md:flex items-center gap-1 p-1 rounded-xl bg-muted/50 border border-border">
            <StatChip icon={Calendar} value={stats.agendadas} label="Agendadas" />
            <StatChip icon={CheckCircle2} value={stats.realizadas} label="Realizadas" color="emerald" />
            {stats.pendentesCount > 0 && (
              <StatChip icon={ClipboardList} value={stats.pendentesCount} label="Pendentes" color="amber" />
            )}
            <div className="w-px h-5 bg-border mx-0.5" />
            <div className={cn(
              "flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold",
              stats.proximaDias !== null && stats.proximaDias <= 3
                ? "text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/20"
                : stats.proximaDias !== null && stats.proximaDias <= 7
                  ? "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/20"
                  : "text-muted-foreground"
            )}>
              <Zap className="w-3 h-3" />
              <span className="tabular-nums">
                {stats.proximaDias === null ? "—"
                  : stats.proximaDias === 0 ? "Hoje"
                  : stats.proximaDias === 1 ? "Amanhã"
                  : `${stats.proximaDias}d`}
              </span>
            </div>
          </div>

          {/* Cockpit button */}
          <Link
            href="/admin/juri/cockpit"
            className={cn(
              "flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all shrink-0",
              "bg-neutral-500 dark:bg-neutral-300 text-white dark:text-neutral-900",
              "hover:bg-neutral-400 dark:hover:bg-neutral-200 shadow-sm"
            )}
          >
            <Zap className="w-3.5 h-3.5" />
            Cockpit
          </Link>
        </div>

        {/* Row 2: Tabs + contextual controls */}
        <div className="flex items-center justify-between">
          {/* Tabs */}
          <div className="inline-flex items-center gap-1 p-1 rounded-full bg-muted border border-border">
            {TABS.map((tab) => {
              const isActive = activeTab === tab.key;
              const Icon = tab.icon;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={cn(
                    "flex items-center gap-1.5 rounded-full text-[13px] font-semibold whitespace-nowrap transition-all duration-200 cursor-pointer",
                    isActive
                      ? "px-3 py-1.5 bg-neutral-700 dark:bg-neutral-300 text-white dark:text-neutral-900 shadow-sm"
                      : "px-2.5 py-1.5 text-muted-foreground"
                  )}
                >
                  <Icon className="w-[15px] h-[15px]" />
                  {isActive && <span>{tab.label}</span>}
                </button>
              );
            })}
          </div>

          {/* Year selector (Pauta tab) */}
          {activeTab === "pauta" && (
            <div className="inline-flex items-center gap-1 p-1 rounded-full bg-muted border border-border">
              <button onClick={() => setAno(ano - 1)} className="p-1.5 rounded-full hover:bg-muted transition-colors">
                <ChevronLeft className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
              <span className="px-3 text-sm font-semibold tabular-nums text-foreground">{ano}</span>
              <button onClick={() => setAno(ano + 1)} className="p-1.5 rounded-full hover:bg-muted transition-colors">
                <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Tab content */}
      <div className="px-4 sm:px-6 md:px-8 pt-4">
        <Suspense fallback={<TabSpinner />}>
          {activeTab === "pauta" && <PautaTab ano={ano} />}
          {activeTab === "jurados" && <JuradosTab />}
        </Suspense>
      </div>
    </div>
  );
}

// ==========================================
// STAT CHIP - Compact inline stat
// ==========================================

function StatChip({ icon: Icon, value, label, color }: {
  icon: typeof Calendar;
  value: number;
  label: string;
  color?: "emerald" | "amber";
}) {
  return (
    <div className={cn(
      "flex items-center gap-1.5 px-2 py-1 rounded-lg text-[11px] font-medium transition-colors",
      color === "emerald" ? "text-emerald-600/60 dark:text-emerald-400/50"
        : color === "amber" ? "text-amber-600/60 dark:text-amber-400/50"
        : "text-muted-foreground"
    )}>
      <Icon className={cn(
        "w-3 h-3",
        color === "emerald" ? "text-emerald-700 dark:text-emerald-400/60"
          : color === "amber" ? "text-amber-600 dark:text-amber-400/60"
          : "text-muted-foreground"
      )} />
      <span className="tabular-nums">{value}</span>
      <span className="text-[9px] font-medium text-muted-foreground hidden lg:inline">{label}</span>
    </div>
  );
}
