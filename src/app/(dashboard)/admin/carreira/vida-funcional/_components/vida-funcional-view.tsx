"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Briefcase, Milestone, CalendarClock, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { CollapsiblePageHeader } from "@/components/layouts/collapsible-page-header";
import { trpc } from "@/lib/trpc/client";
import { dominiosByCluster } from "@/lib/vida-funcional/dominios";
import { isMarco, type VfTipo } from "@/lib/vida-funcional/tipo-cluster";
import { computeRadar } from "@/lib/vida-funcional/radar";
import { COLORS } from "@/lib/config/design-tokens";
import { vfIcon } from "./icon-map";
import { TrajetoriaTimeline } from "./trajetoria-timeline";

type Tab = "visao" | "timeline" | "produtividade";

const CLUSTERS: { key: "ausencias" | "contraprestacao" | "administrativo"; label: string }[] = [
  { key: "ausencias", label: "Ausências & designações" },
  { key: "contraprestacao", label: "Contraprestação & compensação" },
  { key: "administrativo", label: "Administrativo" },
];

export function VidaFuncionalView() {
  const [tab, setTab] = useState<Tab>("visao");
  const { data: eventos = [], isLoading } = trpc.vidaFuncional.listEventos.useQuery({});

  const countByTipo = useMemo(() => {
    const m: Record<string, number> = {};
    for (const e of eventos) m[e.tipo] = (m[e.tipo] ?? 0) + 1;
    return m;
  }, [eventos]);

  const radar = useMemo(() => computeRadar(eventos, new Date()), [eventos]);

  const marcosCount = eventos.filter((e) => isMarco(e.tipo as VfTipo)).length;

  const tabs: { key: Tab; label: string; icon: LucideIcon }[] = [
    { key: "visao", label: "Visão geral", icon: Briefcase },
    { key: "timeline", label: "Linha do Tempo", icon: Milestone },
    { key: "produtividade", label: "Produtividade", icon: CalendarClock },
  ];

  const bottomRow = (
    <div className="flex items-center gap-0.5">
      {tabs.map((t) => (
        <button
          key={t.key}
          onClick={() => setTab(t.key)}
          className={cn(
            "flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all duration-150 cursor-pointer",
            tab === t.key ? "bg-white/90 text-neutral-800 shadow-sm" : "text-white/60 hover:text-white hover:bg-white/[0.06]",
          )}
        >
          <t.icon className="w-3 h-3" />
          {t.label}
        </button>
      ))}
    </div>
  );

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-background">
      <CollapsiblePageHeader title="Vida Funcional" icon={Briefcase} seamless bottomRow={bottomRow}>
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="w-9 h-9 rounded-xl bg-[#525252] flex items-center justify-center shrink-0">
            <Briefcase className="w-4 h-4 text-white" />
          </div>
          <div className="min-w-0">
            <h1 className="text-white text-[15px] font-semibold">Vida Funcional</h1>
            <p className="text-[10px] text-white/55 hidden sm:block">
              {isLoading ? "carregando…" : `${eventos.length} evento(s) · ${marcosCount} marco(s)`}
            </p>
          </div>
        </div>
      </CollapsiblePageHeader>

      <div className="px-5 md:px-8 py-4 space-y-6">
        {tab === "visao" && (
          <>
            {/* Radar */}
            <section>
              <p className="text-[12px] font-semibold uppercase tracking-wide text-neutral-500 mb-2">
                Radar {radar.length > 0 && <span className="text-neutral-400">· {radar.length}</span>}
              </p>
              {radar.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum alerta. Em dia.</p>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {radar.map((a) => {
                    const c = a.severidade === "critico" ? COLORS.danger : a.severidade === "atencao" ? COLORS.warning : COLORS.info;
                    const inner = (
                      <div className={cn("p-3 rounded-xl border h-full", c.border, c.bg)}>
                        <p className={cn("text-[11px] font-mono", c.text)}>{a.prazo ?? a.motivo}</p>
                        <p className="text-sm font-medium truncate">{a.titulo}</p>
                        <p className="text-[11px] text-muted-foreground truncate">{a.motivo}</p>
                      </div>
                    );
                    return a.dominioKey ? (
                      <Link key={a.eventoId} href={`/admin/carreira/vida-funcional/${a.dominioKey}`} className="cursor-pointer">
                        {inner}
                      </Link>
                    ) : (
                      <div key={a.eventoId}>{inner}</div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* Trajetória (card → aba timeline) */}
            <section>
              <p className="text-[12px] font-semibold uppercase tracking-wide text-neutral-500 mb-2">Progressão</p>
              <button
                onClick={() => setTab("timeline")}
                className="w-full text-left p-4 rounded-xl border border-neutral-200 dark:border-neutral-700/30 bg-white dark:bg-neutral-900/50 hover:border-emerald-500/30 transition-colors cursor-pointer flex items-center gap-3"
              >
                <Milestone className="w-5 h-5 text-emerald-500" />
                <div>
                  <p className="font-medium">Trajetória</p>
                  <p className="text-xs text-muted-foreground">{marcosCount} marco(s) — ver linha do tempo da carreira</p>
                </div>
              </button>
            </section>

            {/* Bento por cluster */}
            {CLUSTERS.map((c) => (
              <section key={c.key}>
                <p className="text-[12px] font-semibold uppercase tracking-wide text-neutral-500 mb-2">{c.label}</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {dominiosByCluster(c.key).map((d) => {
                    const Icon = vfIcon(d.icon);
                    const count = d.tipos.reduce((s, t) => s + (countByTipo[t] ?? 0), 0);
                    return (
                      <Link
                        key={d.key}
                        href={`/admin/carreira/vida-funcional/${d.key}`}
                        className="p-3 rounded-xl border border-neutral-200 dark:border-neutral-700/30 bg-white dark:bg-neutral-900/50 hover:border-emerald-500/30 transition-colors cursor-pointer"
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <Icon className="w-4 h-4 text-neutral-500" />
                          <span className="text-xs text-neutral-500 truncate">{d.label}</span>
                        </div>
                        <p className="text-lg font-semibold tabular-nums">{count}</p>
                      </Link>
                    );
                  })}
                </div>
              </section>
            ))}
          </>
        )}

        {tab === "timeline" && <TrajetoriaTimeline eventos={eventos} isLoading={isLoading} />}

        {tab === "produtividade" && (
          <div className="p-6 rounded-xl border border-dashed border-neutral-300 dark:border-neutral-700 text-center">
            <p className="text-sm text-muted-foreground">Produtividade chega no próximo estágio (dashboard + relatório).</p>
          </div>
        )}
      </div>
    </div>
  );
}
