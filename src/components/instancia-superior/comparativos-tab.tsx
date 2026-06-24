// ─── Comparativos Tab (camada estratégica — comparativo por recorte) ──────
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Building2, Users } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc/client";
import { ACCENT, DIMENSOES, type Dimensao } from "./ds";
import { Card, EmptyHint } from "./primitives";
import { taxaProvimento } from "./logic";

export function ComparativosTab() {
  const [dimensao, setDimensao] = useState<Dimensao>("comarca");
  const { data, isLoading } = trpc.instanciaSuperior.institucional.useQuery({ dimensao, limit: 30 });
  const maxTotal = data?.length ? Math.max(...data.map((d: any) => d.total)) : 1;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className="text-[11px] text-muted-foreground mr-1">Agrupar por:</span>
        {DIMENSOES.map(d => (
          <button key={d.key} onClick={() => setDimensao(d.key)} className={cn(
            "text-[11px] px-2.5 py-1 rounded-lg border transition-colors cursor-pointer",
            dimensao === d.key ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-medium"
              : "border-neutral-200 dark:border-neutral-700 text-muted-foreground hover:bg-neutral-50 dark:hover:bg-neutral-800"
          )}>{d.label}</button>
        ))}
      </div>

      <Card title={`Comparativo por ${DIMENSOES.find(d => d.key === dimensao)?.label.toLowerCase()}`} icon={Building2}>
        {isLoading ? (
          <div className="space-y-2">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-10 rounded" />)}</div>
        ) : !data?.length ? (
          <EmptyHint>Sem dados institucionais ainda.</EmptyHint>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-x-4 text-[9px] uppercase tracking-wider text-muted-foreground/60 font-semibold px-1">
              <span>{DIMENSOES.find(d => d.key === dimensao)?.label}</span>
              <span className="text-right w-12">Total</span>
              <span className="text-right w-14">Pend.</span>
              <span className="text-right w-14">Julg.</span>
              <span className="text-right w-16">Provim.</span>
            </div>
            {data.map((row: any) => {
              const taxa = taxaProvimento(row.providos, row.julgados);
              return (
                <div key={row.grupo} className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-x-4 items-center px-1">
                  <div className="min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[12px] text-foreground/85 truncate">{row.grupo}</span>
                      {row.defensores > 0 && (
                        <span className="text-[9px] text-muted-foreground flex items-center gap-0.5 ml-2 shrink-0">
                          <Users className="w-2.5 h-2.5" />{row.defensores}
                        </span>
                      )}
                    </div>
                    <div className="h-1.5 rounded-full bg-neutral-100 dark:bg-neutral-800 overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${(row.total / maxTotal) * 100}%`, backgroundColor: ACCENT }} />
                    </div>
                  </div>
                  <span className="text-[12px] tabular-nums text-right w-12 font-medium">{row.total}</span>
                  <span className="text-[12px] tabular-nums text-right w-14 text-amber-500">{row.pendentes}</span>
                  <span className="text-[12px] tabular-nums text-right w-14 text-muted-foreground">{row.julgados}</span>
                  <span className={cn("text-[12px] tabular-nums text-right w-16 font-semibold", taxa == null ? "text-muted-foreground/40" : taxa >= 50 ? "text-emerald-500" : "text-amber-500")}>
                    {taxa != null ? `${taxa}%` : "—"}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
