"use client";

import { useState, useMemo, lazy, Suspense } from "react";
import { cn } from "@/lib/utils";
import { HEADER_STYLE } from "@/lib/config/design-tokens";
import { CollapsiblePageHeader } from "@/components/layouts/collapsible-page-header";
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
      <CollapsiblePageHeader
        title="Tribunal do Júri"
        icon={Gavel}
        bottomRow={
          <div className="flex items-center justify-between">
            {/* Tabs */}
            <div className="inline-flex items-center gap-1 p-1 rounded-full bg-[#3e3e44]">
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
                        ? "px-3 py-1.5 bg-[#525258] text-white shadow-sm"
                        : "px-2.5 py-1.5 text-white/50"
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
              <div className="inline-flex items-center gap-1 p-1 rounded-full bg-[#3e3e44]">
                <button onClick={() => setAno(ano - 1)} className="p-1.5 rounded-full hover:bg-[#525258] transition-colors">
                  <ChevronLeft className="w-3.5 h-3.5 text-white/50" />
                </button>
                <span className="px-3 text-sm font-semibold tabular-nums text-white/90">{ano}</span>
                <button onClick={() => setAno(ano + 1)} className="p-1.5 rounded-full hover:bg-[#525258] transition-colors">
                  <ChevronRight className="w-3.5 h-3.5 text-white/50" />
                </button>
              </div>
            )}
          </div>
        }
      >
        <div className="flex items-center gap-2">
          {/* Stats inline */}
          <div className="hidden md:flex items-center gap-1 p-1 rounded-xl bg-[#4a4a52]">
            <StatChip icon={Calendar} value={stats.agendadas} label="Agendadas" />
            <StatChip icon={CheckCircle2} value={stats.realizadas} label="Realizadas" color="emerald" />
            {stats.pendentesCount > 0 && (
              <StatChip icon={ClipboardList} value={stats.pendentesCount} label="Pendentes" color="amber" />
            )}
            <div className="w-px h-5 bg-white/10 mx-0.5" />
            <div className={cn(
              "flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold",
              stats.proximaDias !== null && stats.proximaDias <= 3
                ? "text-rose-400 bg-rose-950/30"
                : stats.proximaDias !== null && stats.proximaDias <= 7
                  ? "text-emerald-400 bg-emerald-950/30"
                  : "text-white/50"
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
              "bg-[#4a4a52] text-white/90 hover:bg-[#525258]"
            )}
          >
            <Zap className="w-3.5 h-3.5" />
            Cockpit
          </Link>
        </div>
      </CollapsiblePageHeader>

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
      color === "emerald" ? "text-emerald-400/70"
        : color === "amber" ? "text-amber-400/70"
        : "text-white/60"
    )}>
      <Icon className={cn(
        "w-3 h-3",
        color === "emerald" ? "text-emerald-400/80"
          : color === "amber" ? "text-amber-400/80"
          : "text-white/50"
      )} />
      <span className="tabular-nums">{value}</span>
      <span className="text-[9px] font-medium text-white/40 hidden lg:inline">{label}</span>
    </div>
  );
}
