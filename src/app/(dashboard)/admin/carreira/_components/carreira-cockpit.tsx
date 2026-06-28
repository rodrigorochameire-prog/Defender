// src/app/(dashboard)/admin/carreira/_components/carreira-cockpit.tsx
"use client";

import Link from "next/link";
import { CalendarClock, Briefcase, FileText, Plane, FolderOpen } from "lucide-react";
import { CollapsiblePageHeader } from "@/components/layouts/collapsible-page-header";
import { StatusChip, EmptyState } from "@/components/ds";
import { trpc } from "@/lib/trpc/client";
import { CARD_STYLE, TYPO } from "@/lib/config/design-tokens";
import { cn } from "@/lib/utils";

const CLUSTER_LABEL: Record<string, string> = {
  ausencias: "Ausências & designações",
  contraprestacao: "Contraprestação & compensação",
  progressao: "Progressão na carreira",
  administrativo: "Administrativo",
};

function Kpi({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string | number }) {
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/[0.08]">
      <Icon className="w-4 h-4 text-white/70" />
      <div className="leading-tight">
        <div className="text-sm font-semibold text-white">{value}</div>
        <div className="text-[11px] text-white/60">{label}</div>
      </div>
    </div>
  );
}

export function CarreiraCockpit() {
  const { data, isLoading } = trpc.carreira.meuPanorama.useQuery();

  const kpis = data?.kpis;
  const stats = (
    <div className="flex flex-wrap items-center gap-2">
      <Kpi icon={CalendarClock} label="Próximo prazo" value={kpis?.proximoPrazo?.prazo ?? "—"} />
      <Kpi icon={Briefcase} label="Substituições ativas" value={kpis?.substituicoesAtivas ?? 0} />
      <Kpi icon={FileText} label="Pedidos pendentes" value={kpis?.pedidosPendentes ?? 0} />
      <Kpi icon={Plane} label="Férias agendadas" value={kpis?.feriasAgendadas ?? 0} />
    </div>
  );

  return (
    <CollapsiblePageHeader title="Carreira — meu dia a dia" icon={Briefcase}>
      {stats}
      <div className="p-4 space-y-4">
        {/* Agora & Próximos */}
        <section className={cn(CARD_STYLE.base)}>
          <h2 className={cn(TYPO.h3, "mb-3")}>Agora & próximos</h2>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Carregando…</p>
          ) : !data || data.agoraProximos.length === 0 ? (
            <EmptyState
              icon={CalendarClock}
              title="Nada ativo ou agendado nos próximos 90 dias"
            />
          ) : (
            <ul className="divide-y divide-neutral-100">
              {data.agoraProximos.map((e) => (
                <li key={e.id} className="flex items-center justify-between py-2">
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">{e.titulo}</div>
                    <div className="text-[11px] text-muted-foreground">
                      {CLUSTER_LABEL[e.cluster] ?? e.cluster} · {e.prazo ? `prazo ${e.prazo}` : e.dataEvento}
                    </div>
                  </div>
                  <StatusChip status={e.status} />
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Cluster cards */}
        <section className="grid gap-4 md:grid-cols-2">
          {(["ausencias", "contraprestacao", "progressao", "administrativo"] as const).map((c) => {
            const summary = data?.clusters[c];
            return (
              <div key={c} className={cn(CARD_STYLE.base)}>
                <div className="flex items-center justify-between mb-2">
                  <h3 className={TYPO.h3}>{CLUSTER_LABEL[c]}</h3>
                  <span className="text-[11px] text-muted-foreground">
                    {summary?.total ?? 0} · {summary?.emCurso ?? 0} em curso · {summary?.pendentes ?? 0} pendentes
                  </span>
                </div>
                {!summary || summary.itens.length === 0 ? (
                  <EmptyState icon={FolderOpen} title="Sem registros" size="sm" />
                ) : (
                  <ul className="space-y-1">
                    {summary.itens.slice(0, 5).map((it) => (
                      <li key={it.id} className="flex items-center justify-between text-sm">
                        <span className="truncate">{it.titulo}</span>
                        <StatusChip status={it.status} />
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </section>

        {/* Trajetória link-out (full timeline lives in the dedicated page; promoted component wired in Task 6) */}
        <section className={cn(CARD_STYLE.base)}>
          <div className="flex items-center justify-between">
            <h2 className={TYPO.h3}>Trajetória</h2>
            <Link href="/admin/carreira/vida-funcional" className="text-sm text-emerald-600 hover:underline">
              Ver linha do tempo completa →
            </Link>
          </div>
        </section>
      </div>
    </CollapsiblePageHeader>
  );
}
