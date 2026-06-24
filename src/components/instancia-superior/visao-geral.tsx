// ─── Visão Geral (camada estratégica — overview) ──────────────────────────
import { cn } from "@/lib/utils";
import { Layers, CalendarClock, Gavel, CheckCircle2, ChevronRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { trpc } from "@/lib/trpc/client";
import { ACCENT, RESULTADO_CONFIG, TIPO_SHORT } from "./ds";
import { Card, EmptyHint } from "./primitives";
import { SuperiorFunnel } from "./superior-funnel";
import { taxaProvimento, type EscopoModo } from "./logic";

export function VisaoGeral({
  escopo, stats, statsLoading, onOpenRecurso, onPickStatus, activeStatus,
}: {
  escopo: { modo: EscopoModo };
  stats: any;
  statsLoading: boolean;
  onOpenRecurso: (id: number) => void;
  onPickStatus?: (status: string) => void;
  activeStatus?: string;
}) {
  const { data: mapa, isLoading: mapaLoading } = trpc.instanciaSuperior.mapaPorAssunto.useQuery({ escopo, limit: 12 });
  const { data: agenda, isLoading: agendaLoading } = trpc.instanciaSuperior.agendaPauta.useQuery({ escopo, limit: 12 });

  if (statsLoading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-44 rounded-xl" />)}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <Card title="Mapa por assunto" icon={Layers}>
          {mapaLoading ? (
            <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-6 rounded" />)}</div>
          ) : !mapa?.length ? (
            <EmptyHint>Sem tipos penais classificados ainda. Aparecem aqui conforme você adiciona crimes/temas aos recursos.</EmptyHint>
          ) : (
            <div className="space-y-2">
              {mapa.map((m: any) => {
                const taxa = taxaProvimento(m.providos, m.julgados);
                const max = Math.max(...mapa.map((x: any) => x.total));
                return (
                  <div key={m.assunto}>
                    <div className="flex items-center justify-between text-[11px] mb-0.5">
                      <span className="text-foreground/85 truncate max-w-[60%]">{m.assunto}</span>
                      <span className="text-muted-foreground tabular-nums flex items-center gap-2">
                        <span>{m.total}</span>
                        {taxa != null && <span className={cn(taxa >= 50 ? "text-emerald-500" : "text-amber-500")}>{taxa}%</span>}
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-neutral-100 dark:bg-neutral-800 overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${(m.total / max) * 100}%`, backgroundColor: ACCENT }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        <Card title="Agenda de julgamentos" icon={CalendarClock}>
          {agendaLoading ? (
            <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-9 rounded" />)}</div>
          ) : !agenda?.length ? (
            <EmptyHint>Nenhum recurso com data de pauta futura. Defina a data de pauta para acompanhar aqui.</EmptyHint>
          ) : (
            <div className="space-y-1">
              {agenda.map((a: any) => (
                <button key={a.id} onClick={() => onOpenRecurso(a.id)}
                  className="w-full flex items-center gap-3 px-2 py-1.5 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800/40 transition-colors cursor-pointer text-left">
                  <span className="text-[10px] font-bold text-orange-500 tabular-nums w-10 text-center shrink-0">
                    {a.dataPauta ? format(new Date(a.dataPauta), "dd/MM") : "—"}
                  </span>
                  <span className="text-[10px] font-mono font-bold text-neutral-400 w-9">{TIPO_SHORT[a.tipo] ?? a.tipo}</span>
                  <span className="text-[12px] text-foreground/85 truncate flex-1">{a.assistidoNome ?? "—"}</span>
                  {a.camara && <span className="text-[10px] text-muted-foreground truncate max-w-[100px]">{a.camara}</span>}
                  <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/40 shrink-0" />
                </button>
              ))}
            </div>
          )}
        </Card>

        <Card title="Ciclo dos recursos" icon={Gavel} action={
          <span className="text-[10px] text-muted-foreground/70">clique para filtrar</span>
        }>
          <SuperiorFunnel
            porStatus={stats?.porStatus}
            total={stats?.total ?? 0}
            activeStatus={activeStatus}
            onPick={onPickStatus}
          />
        </Card>

        <Card title="Resultados dos julgados" icon={CheckCircle2}>
          {!stats?.porResultado?.length ? (
            <EmptyHint>Nenhum recurso julgado ainda.</EmptyHint>
          ) : (
            <div className="space-y-2">
              {stats.porResultado.map((r: any) => {
                const cfg = RESULTADO_CONFIG[r.resultado] ?? RESULTADO_CONFIG.PENDENTE;
                const maxR = Math.max(...stats.porResultado.map((x: any) => Number(x.total)));
                return (
                  <div key={r.resultado}>
                    <div className="flex items-center justify-between text-[11px] mb-0.5">
                      <span className={cn("font-medium", cfg.color)}>{cfg.label}</span>
                      <span className="text-muted-foreground tabular-nums">{r.total}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-neutral-100 dark:bg-neutral-800 overflow-hidden">
                      <div className={cn("h-full rounded-full", cfg.color.replace("text-", "bg-"))} style={{ width: `${(Number(r.total) / maxR) * 100}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
