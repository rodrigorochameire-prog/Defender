// ─── SuperiorFunnel — ciclo dos recursos, clicável → filtra a carteira ────
import { cn } from "@/lib/utils";
import { STATUS_CONFIG } from "./ds";
import { funnelSegments } from "./logic";
import { EmptyHint } from "./primitives";

export function SuperiorFunnel({
  porStatus, total, activeStatus, onPick,
}: {
  porStatus?: { status: string; total: number }[];
  total: number;
  activeStatus?: string;
  onPick?: (status: string) => void;
}) {
  if (!porStatus?.length || total === 0) {
    return <EmptyHint>Sem recursos no escopo atual. O ciclo (Interposto → Transitado) aparece aqui conforme os recursos avançam.</EmptyHint>;
  }
  const segs = funnelSegments(porStatus, total);

  return (
    <div className="space-y-3">
      {/* Barra empilhada — segmentos clicáveis */}
      <div className="flex h-2.5 rounded-full overflow-hidden bg-neutral-100 dark:bg-neutral-800">
        {segs.filter(s => s.count > 0).map(s => {
          const cfg = STATUS_CONFIG[s.status];
          const active = activeStatus === s.status;
          return (
            <button
              key={s.status}
              type="button"
              onClick={() => onPick?.(s.status)}
              title={`${cfg.label}: ${s.count} (${s.pct}%) — filtrar carteira`}
              style={{ width: `${(s.count / total) * 100}%` }}
              className={cn(
                "h-full transition-all cursor-pointer hover:brightness-110",
                cfg.dot,
                active && "ring-2 ring-inset ring-foreground/40",
              )}
            />
          );
        })}
      </div>

      {/* Legenda — cada estágio é um filtro */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-1">
        {segs.map(s => {
          const cfg = STATUS_CONFIG[s.status];
          const active = activeStatus === s.status;
          const clickable = s.count > 0;
          return (
            <button
              key={s.status}
              type="button"
              disabled={!clickable}
              onClick={() => clickable && onPick?.(s.status)}
              className={cn(
                "group flex items-center justify-between text-[11px] rounded-md px-1.5 py-1 -mx-1.5 transition-colors text-left",
                clickable ? "cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-800/50" : "cursor-default opacity-50",
                active && "bg-emerald-50 dark:bg-emerald-500/10",
              )}
            >
              <span className={cn("flex items-center gap-1.5", active ? "text-emerald-600 dark:text-emerald-400 font-medium" : "text-muted-foreground")}>
                <span className={cn("w-1.5 h-1.5 rounded-full", cfg.dot)} />
                {cfg.label}
              </span>
              <span className={cn("tabular-nums font-medium", active ? "text-emerald-600 dark:text-emerald-400" : "text-foreground/80")}>{s.count}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
