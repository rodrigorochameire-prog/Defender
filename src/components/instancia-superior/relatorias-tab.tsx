// ─── Relatorias Tab (lente analítica sobre o universo de recursos) ────────
import { cn } from "@/lib/utils";
import { Scale, Users, Gavel, TrendingUp } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc/client";
import { Card, EmptyHint } from "./primitives";
import { taxaProvimento, relatoriasResumo, type EscopoModo } from "./logic";

export function RelatoriasTab({ escopo, onOpen }: { escopo: { modo: EscopoModo }; onOpen: (id: number) => void }) {
  const { data, isLoading } = trpc.instanciaSuperior.relatoriasRanking.useQuery({ escopo, limit: 40 });
  const resumo = relatoriasResumo(data as any[] | undefined);

  return (
    <div className="space-y-3">
      {/* Contexto — Relatorias é uma lente, não um objeto concorrente de Recursos */}
      <p className="text-[12px] text-muted-foreground/80 leading-relaxed px-0.5">
        Relatorias é uma <span className="text-foreground/80 font-medium">lente</span> sobre os mesmos recursos:
        lê a carteira pelo desembargador relator para apoiar memoriais, sustentações e leitura de padrões decisórios.
      </p>

      {/* Síntese da lente */}
      {!isLoading && (data?.length ?? 0) > 0 && (
        <div className="grid grid-cols-3 gap-2">
          <ResumoCell icon={Users} label="Relatores" value={resumo.relatores} />
          <ResumoCell icon={Gavel} label="Recursos com relator" value={resumo.recursos} />
          <ResumoCell icon={TrendingUp} label="Provimento médio" value={resumo.provimentoMedio != null ? `${resumo.provimentoMedio}%` : "—"} tone={resumo.provimentoMedio != null ? "text-emerald-500" : undefined} />
        </div>
      )}

      <Card title="Ranking de relatoria" icon={Scale} action={
        <span className="text-[10px] text-muted-foreground">taxa de provimento por relator</span>
      }>
        {isLoading ? (
          <div className="space-y-2">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12 rounded" />)}</div>
        ) : !data?.length ? (
          <EmptyHint>
            Ainda sem relatores vinculados. Conforme você define o relator de cada recurso (em Editar),
            esta lente passa a mostrar carga por desembargador, taxa de provimento e padrões de relatoria —
            insumo direto para memoriais e sustentação oral.
          </EmptyHint>
        ) : (
          <div className="space-y-1">
            <div className="grid grid-cols-[1fr_auto_auto_auto] gap-x-4 text-[9px] uppercase tracking-wider text-muted-foreground/60 font-semibold px-2 pb-1">
              <span>Desembargador</span>
              <span className="text-right w-12">Recursos</span>
              <span className="text-right w-12">Julg.</span>
              <span className="text-right w-20">Provimento</span>
            </div>
            {data.map((d: any) => {
              const taxa = taxaProvimento(d.providos, d.julgados);
              return (
                <button key={d.id} onClick={() => onOpen(d.id)}
                  className="w-full grid grid-cols-[1fr_auto_auto_auto] gap-x-4 items-center px-2 py-2 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800/40 transition-colors cursor-pointer text-left">
                  <div className="min-w-0">
                    <span className="text-[13px] text-foreground/90 truncate block">{d.nome}</span>
                    {d.camara && <span className="text-[10px] text-muted-foreground">{d.camara}</span>}
                  </div>
                  <span className="text-[13px] tabular-nums text-right w-12 font-medium">{d.total}</span>
                  <span className="text-[12px] tabular-nums text-right w-12 text-muted-foreground">{d.julgados}</span>
                  <div className="w-20 flex items-center justify-end gap-2">
                    {taxa != null ? (
                      <>
                        <div className="w-8 h-1.5 rounded-full bg-neutral-100 dark:bg-neutral-800 overflow-hidden">
                          <div className={cn("h-full rounded-full", taxa >= 50 ? "bg-emerald-500" : "bg-amber-500")} style={{ width: `${taxa}%` }} />
                        </div>
                        <span className={cn("text-[12px] tabular-nums font-semibold w-8 text-right", taxa >= 50 ? "text-emerald-500" : "text-amber-500")}>{taxa}%</span>
                      </>
                    ) : <span className="text-[12px] text-muted-foreground/40 w-full text-right">—</span>}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}

function ResumoCell({ icon: Icon, label, value, tone }: { icon: React.ElementType; label: string; value: string | number; tone?: string }) {
  return (
    <div className="bg-white dark:bg-[#1c1c1f] rounded-xl border border-neutral-200/70 dark:border-white/[0.05] px-3 py-2 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
      <span className="flex items-center gap-1 text-[8.5px] uppercase tracking-widest font-semibold text-muted-foreground mb-0.5">
        <Icon className="w-2.5 h-2.5" /> {label}
      </span>
      <span className={cn("text-lg font-bold tabular-nums tracking-tight leading-none", tone ?? "text-foreground")}>{value}</span>
    </div>
  );
}
