// ─── Desembargador Sheet (perfil de relator) ──────────────────────────────
import { cn } from "@/lib/utils";
import { Scale, X, TrendingUp } from "lucide-react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { trpc } from "@/lib/trpc/client";
import { RESULTADO_CONFIG } from "./ds";

export function DesembargadorSheet({ desembId, onClose }: { desembId: number | null; onClose: () => void }) {
  const { data: p, isLoading } = trpc.instanciaSuperior.perfilDesembargador.useQuery({ id: desembId! }, { enabled: desembId != null });

  return (
    <Sheet open={desembId != null} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-lg p-0 overflow-y-auto">
        {isLoading || !p ? (
          <div className="p-6 space-y-4"><Skeleton className="h-8 w-2/3 rounded" /><Skeleton className="h-24 rounded" /></div>
        ) : (
          <div className="flex flex-col">
            <div className="bg-[#414144] dark:bg-neutral-900 px-6 py-5 text-white">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-white/10 flex items-center justify-center">
                    <Scale className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-[16px] font-semibold leading-tight">{p.nome}</h2>
                    <p className="text-[11px] text-white/60 mt-0.5">{p.camara ?? "—"}{p.area ? ` · ${p.area}` : ""}</p>
                  </div>
                </div>
                <button onClick={onClose} className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center cursor-pointer transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-5">
              <div className="grid grid-cols-2 gap-2.5">
                <div className="bg-neutral-50 dark:bg-white/[0.03] rounded-xl px-3.5 py-2.5">
                  <span className="text-[9px] uppercase tracking-widest font-semibold text-muted-foreground block">Como relator</span>
                  <span className="text-xl font-bold tabular-nums">{p.totalComoRelator}</span>
                </div>
                <div className="bg-neutral-50 dark:bg-white/[0.03] rounded-xl px-3.5 py-2.5">
                  <span className="text-[9px] uppercase tracking-widest font-semibold text-muted-foreground flex items-center gap-1"><TrendingUp className="w-2.5 h-2.5" />Provimento</span>
                  <span className={cn("text-xl font-bold tabular-nums", p.taxaProvimento != null ? "text-emerald-500" : "text-muted-foreground/40")}>
                    {p.taxaProvimento != null ? `${p.taxaProvimento}%` : "—"}
                  </span>
                </div>
              </div>

              {p.resultados?.length > 0 && (
                <div>
                  <span className="text-[10px] uppercase tracking-widest font-semibold text-neutral-400 block mb-2">Resultados</span>
                  <div className="space-y-1.5">
                    {p.resultados.map((r: any) => {
                      const cfg = RESULTADO_CONFIG[r.resultado] ?? RESULTADO_CONFIG.PENDENTE;
                      const max = Math.max(...p.resultados.map((x: any) => Number(x.total)));
                      return (
                        <div key={r.resultado}>
                          <div className="flex items-center justify-between text-[11px] mb-0.5">
                            <span className={cn("font-medium", cfg.color)}>{cfg.label}</span>
                            <span className="text-muted-foreground tabular-nums">{r.total}</span>
                          </div>
                          <div className="h-1.5 rounded-full bg-neutral-100 dark:bg-neutral-800 overflow-hidden">
                            <div className={cn("h-full rounded-full", cfg.color.replace("text-", "bg-"))} style={{ width: `${(Number(r.total) / max) * 100}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {p.ultimosAcordaos?.length > 0 && (
                <div>
                  <span className="text-[10px] uppercase tracking-widest font-semibold text-neutral-400 block mb-2">Últimos acórdãos</span>
                  <div className="space-y-2">
                    {p.ultimosAcordaos.map((a: any, i: number) => (
                      <div key={i} className="rounded-lg border border-neutral-200/60 dark:border-neutral-800/40 p-2.5">
                        <div className="flex items-center justify-between mb-1">
                          {a.resultado && <span className={cn("text-[10px] font-semibold", (RESULTADO_CONFIG[a.resultado] ?? RESULTADO_CONFIG.PENDENTE).color)}>{(RESULTADO_CONFIG[a.resultado] ?? RESULTADO_CONFIG.PENDENTE).label}</span>}
                          {a.dataJulgamento && <span className="text-[10px] text-muted-foreground font-mono tabular-nums">{format(new Date(a.dataJulgamento), "dd/MM/yy")}</span>}
                        </div>
                        {a.ementa && <p className="text-[11px] text-foreground/70 leading-snug line-clamp-3">{a.ementa}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
