// ─── Faixa B — KPIs principais (banda persistente do cabeçalho) ───────────
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { kpiRowData } from "./logic";

type Cell = { label: string; value: string | number; tone: string; group: "tribunal" | "status" | "total" };

function cellsFrom(stats: any): Cell[] {
  const k = kpiRowData(stats);
  return [
    { label: "Recursos", value: k.total, tone: "text-foreground", group: "total" },
    { label: "TJBA", value: k.tjba, tone: "text-foreground/80", group: "tribunal" },
    { label: "STJ", value: k.stj, tone: "text-foreground/80", group: "tribunal" },
    { label: "STF", value: k.stf, tone: "text-foreground/80", group: "tribunal" },
    { label: "Pendentes", value: k.pendentes, tone: k.pendentes > 0 ? "text-amber-500" : "text-foreground/40", group: "status" },
    { label: "Em pauta", value: k.emPauta, tone: k.emPauta > 0 ? "text-orange-500" : "text-foreground/40", group: "status" },
    { label: "Julgados", value: k.julgados, tone: "text-foreground", group: "status" },
    { label: "Provimento", value: k.provimento != null ? `${k.provimento}%` : "—", tone: k.provimento != null ? "text-emerald-500" : "text-foreground/40", group: "status" },
  ];
}

export function SuperiorKpiRow({ stats, loading }: { stats: any; loading?: boolean }) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
        {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-[52px] rounded-xl" />)}
      </div>
    );
  }
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
      {cellsFrom(stats).map((c) => (
        <div
          key={c.label}
          className="bg-white dark:bg-[#1c1c1f] rounded-xl border border-neutral-200/70 dark:border-white/[0.05] px-3 py-2 shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
        >
          <span className={cn(
            "block text-[8.5px] uppercase tracking-widest font-semibold mb-0.5",
            c.group === "tribunal" ? "text-muted-foreground/70 font-mono tracking-wider" : "text-muted-foreground",
          )}>
            {c.label}
          </span>
          <span className={cn("text-lg font-bold tabular-nums tracking-tight leading-none", c.tone)}>{c.value}</span>
        </div>
      ))}
    </div>
  );
}
