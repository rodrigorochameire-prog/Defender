// ─── KPI strip ────────────────────────────────────────────────────────────
import { cn } from "@/lib/utils";
import { Layers, Clock, CalendarClock, Gavel, CheckCircle2 } from "lucide-react";

export function KpiStrip({ stats }: { stats: any }) {
  const items = [
    { label: "Recursos", value: stats?.total ?? 0, icon: Layers, tone: "text-foreground" },
    { label: "Pendentes", value: stats?.pendentes ?? 0, icon: Clock, tone: "text-amber-500" },
    { label: "Em pauta", value: stats?.emPauta ?? 0, icon: CalendarClock, tone: "text-orange-500" },
    { label: "Julgados", value: stats?.julgados ?? 0, icon: Gavel, tone: "text-foreground" },
    { label: "Provimento", value: stats?.taxaProvimento != null ? `${stats.taxaProvimento}%` : "—", icon: CheckCircle2, tone: "text-emerald-500" },
  ];
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
      {items.map(it => (
        <div key={it.label} className="bg-white dark:bg-[#1c1c1f] rounded-xl border border-neutral-200/70 dark:border-white/[0.05] px-3.5 py-2.5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
          <div className="flex items-center gap-1 mb-1">
            <it.icon className="w-3 h-3 text-muted-foreground/60" />
            <span className="text-[9px] uppercase tracking-widest font-semibold text-muted-foreground">{it.label}</span>
          </div>
          <span className={cn("text-xl font-bold tabular-nums tracking-tight", it.tone)}>{it.value}</span>
        </div>
      ))}
    </div>
  );
}
