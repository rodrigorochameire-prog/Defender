// src/app/(dashboard)/admin/carreira/_components/carreira-cockpit.tsx
"use client";

import { CalendarClock, Briefcase, FileText, Plane, FolderOpen } from "lucide-react";
import { GlassHeaderShell } from "@/components/layouts/header/glass-header-shell";
import { StatusChip, EmptyState } from "@/components/ds";
import { trpc } from "@/lib/trpc/client";
import { CARD_STYLE, TYPO } from "@/lib/config/design-tokens";
import { TrajetoriaTimeline } from "@/components/carreira/trajetoria-timeline";
import { cn } from "@/lib/utils";
import { carreiraStatusInfo } from "@/lib/carreira/status-visual";
import { KpiChip, CarreiraCard, CarreiraListSkeleton } from "@/components/carreira";

const CLUSTER_LABEL: Record<string, string> = {
  ausencias: "Ausências & designações",
  contraprestacao: "Contraprestação & compensação",
  progressao: "Progressão na carreira",
  administrativo: "Administrativo",
};

export function CarreiraCockpit() {
  const { data, isLoading } = trpc.carreira.meuPanorama.useQuery();

  const kpis = data?.kpis;

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-background">
      <GlassHeaderShell
        title="Carreira — meu dia a dia"
        icon={Briefcase}
        stats={
          <div className="flex flex-wrap items-center gap-2">
            <KpiChip icon={CalendarClock} label="Próximo prazo" value={kpis?.proximoPrazo?.prazo ?? "—"} />
            <KpiChip icon={Briefcase} label="Substituições ativas" value={kpis?.substituicoesAtivas ?? 0} />
            <KpiChip icon={FileText} label="Pedidos pendentes" value={kpis?.pedidosPendentes ?? 0} />
            <KpiChip icon={Plane} label="Férias agendadas" value={kpis?.feriasAgendadas ?? 0} />
          </div>
        }
      />

      <div className="p-4 space-y-4">
        {/* Agora & Próximos */}
        <section className={cn(CARD_STYLE.base)}>
          <h2 className={cn(TYPO.h3, "mb-3")}>Agora & próximos</h2>
          {isLoading ? (
            <CarreiraListSkeleton rows={3} />
          ) : !data || data.agoraProximos.length === 0 ? (
            <EmptyState
              icon={CalendarClock}
              title="Nada ativo ou agendado nos próximos 90 dias"
              description="Registre ausências, férias ou designações para ver os próximos eventos."
            />
          ) : (
            <ul className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {data.agoraProximos.map((e) => (
                <li key={e.id} className="flex items-center justify-between py-2">
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">{e.titulo}</div>
                    <div className="text-[11px] text-muted-foreground">
                      {CLUSTER_LABEL[e.cluster] ?? e.cluster} · {e.prazo ? `prazo ${e.prazo}` : e.dataEvento}
                    </div>
                  </div>
                  <StatusChip info={carreiraStatusInfo(e.status)} />
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
              <CarreiraCard key={c} accent={c}>
                <div className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className={TYPO.h3}>{CLUSTER_LABEL[c]}</h3>
                    <span className="text-[11px] text-muted-foreground">
                      {summary?.total ?? 0} · {summary?.emCurso ?? 0} em curso · {summary?.pendentes ?? 0} pendentes
                    </span>
                  </div>
                  {isLoading && !data ? (
                    <CarreiraListSkeleton rows={3} />
                  ) : !summary || summary.itens.length === 0 ? (
                    <EmptyState icon={FolderOpen} title="Sem registros" size="sm" description="Nenhum item neste cluster." />
                  ) : (
                    <ul className="space-y-1">
                      {summary.itens.slice(0, 5).map((it) => (
                        <li key={it.id} className="flex items-center justify-between text-sm">
                          <span className="truncate">{it.titulo}</span>
                          <StatusChip info={carreiraStatusInfo(it.status)} />
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </CarreiraCard>
            );
          })}
        </section>

        {/* Trajetória — reutiliza o timeline promovido a compartilhado */}
        <section className={cn(CARD_STYLE.base, "p-4")}>
          <h2 className={cn(TYPO.h3, "mb-3")}>Trajetória</h2>
          <TrajetoriaTimeline
            eventos={
              data
                ? [
                    ...data.clusters.ausencias.itens,
                    ...data.clusters.contraprestacao.itens,
                    ...data.clusters.progressao.itens,
                    ...data.clusters.administrativo.itens,
                  ].map((it) => ({
                    id: it.id,
                    tipo: it.tipo,
                    titulo: it.titulo,
                    dataEvento: it.dataEvento,
                    driveFolderId: null,
                  }))
                : []
            }
            isLoading={isLoading}
          />
        </section>
      </div>
    </div>
  );
}
