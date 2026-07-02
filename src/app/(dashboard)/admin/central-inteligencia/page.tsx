"use client";

import { useMemo } from "react";
import type { inferRouterOutputs } from "@trpc/server";
import { trpc } from "@/lib/trpc/client";
import type { AppRouter } from "@/lib/trpc/routers";
import { GlassHeaderShell } from "@/components/layouts/header/glass-header-shell";
import { KPICardPremium, KPIGrid } from "@/components/shared/kpi-card-premium";
import { AlertCard } from "@/components/central-inteligencia/alert-card";
import { VvdFlagCard, type VvdFlagItem } from "@/components/central-inteligencia/vvd-flag-card";
import {
  ordenarAlertas,
  type AlertaUnificado,
} from "@/components/central-inteligencia/ordenar";
import { Radar, AlarmClock, Gavel, History, ShieldAlert, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

type RouterOutputs = inferRouterOutputs<AppRouter>;
type ExecucaoAlerta = RouterOutputs["execucao"]["listComAlertas"][number];
type PrazoUrgente = RouterOutputs["demandas"]["prazosUrgentes"][number];
type CronologiaFlag = RouterOutputs["cronologia"]["listComFlagsAlertas"][number];

const PROCESSO_HREF = (id: number | null | undefined) =>
  id != null ? `/admin/processos/${id}` : null;

// ==========================================
// Normalizadores — cada fonte vira AlertaUnificado[]
// ==========================================

function fromExecucao(rows: ExecucaoAlerta[]): AlertaUnificado[] {
  const out: AlertaUnificado[] = [];
  for (const r of rows) {
    const href = PROCESSO_HREF(r.processoId);
    if (r.prescricao) {
      out.push({
        id: `exec-presc-${r.id}`,
        severidade: r.prescricao.nivel,
        tipo: "Execução",
        titulo: r.prescricao.motivo,
        rotulo: "Prescrição",
        assistidoNome: r.assistidoNome,
        processoNumero: r.processoNumero,
        href,
      });
    }
    for (const b of r.beneficios) {
      out.push({
        id: `exec-benef-${r.id}-${b.tipo}`,
        severidade: b.nivel,
        tipo: "Execução",
        titulo: b.motivo,
        rotulo: b.nivel === "emerald" ? "Benefício possível" : "Risco de execução",
        assistidoNome: r.assistidoNome,
        processoNumero: r.processoNumero,
        href,
      });
    }
  }
  return out;
}

function fromPrazos(rows: PrazoUrgente[]): AlertaUnificado[] {
  return rows.map((r) => ({
    id: `prazo-${r.id}`,
    severidade: (r.reuPreso || r.prioridade === "URGENTE" ? "red" : "amber") as AlertaUnificado["severidade"],
    tipo: "Prazo" as const,
    titulo: r.ato,
    rotulo: r.prazo ? `Prazo ${formatarData(r.prazo)}` : "Prazo urgente",
    assistidoNome: r.assistido?.nome ?? null,
    processoNumero: r.processo?.numeroAutos ?? null,
    href: PROCESSO_HREF(r.processo?.id),
  }));
}

function fromCronologia(rows: CronologiaFlag[]): AlertaUnificado[] {
  const out: AlertaUnificado[] = [];
  for (const r of rows) {
    const href = PROCESSO_HREF(r.processoId);
    const base = {
      tipo: "Cronologia" as const,
      assistidoNome: r.assistidoNome,
      processoNumero: r.processoNumero,
      href,
    };
    if (r.excessoPrazo) {
      out.push({
        ...base,
        id: `cron-excesso-${r.processoId}`,
        severidade: r.excessoPrazo.nivel,
        titulo: r.excessoPrazo.motivo,
        rotulo: "Excesso de prazo",
      });
    }
    if (r.tempoFatoDenuncia) {
      out.push({
        ...base,
        id: `cron-tfd-${r.processoId}`,
        severidade: r.tempoFatoDenuncia.nivel,
        titulo: r.tempoFatoDenuncia.motivo,
        rotulo: "Tempo fato→denúncia",
      });
    }
    if (r.flagranteSemCustodia) {
      out.push({
        ...base,
        id: `cron-flag-${r.processoId}`,
        severidade: "red",
        titulo: `Flagrante sem audiência de custódia há ${r.flagranteSemCustodia.diasDesdeFlagrante} dias`,
        rotulo: "Flagrante sem custódia",
      });
    }
  }
  return out;
}

function formatarData(iso: string): string {
  // iso: "YYYY-MM-DD" — exibe dd/MM sem depender de timezone.
  const [, m, d] = iso.split("-");
  return m && d ? `${d}/${m}` : iso;
}

// ==========================================
// Skeleton de seção
// ==========================================

function FeedSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-2.5" aria-hidden>
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="h-[88px] animate-pulse rounded-xl border border-neutral-200/80 bg-neutral-100 dark:border-neutral-800/80 dark:bg-neutral-900"
        />
      ))}
    </div>
  );
}

function SectionHeading({
  icon: Icon,
  title,
  count,
}: {
  icon: typeof Radar;
  title: string;
  count: number;
}) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="h-4 w-4 text-neutral-400 dark:text-neutral-500" />
      <h2 className="text-sm font-semibold text-neutral-700 dark:text-neutral-200">
        {title}
      </h2>
      <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] font-medium tabular-nums text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
        {count}
      </span>
    </div>
  );
}

export default function CentralInteligenciaPage() {
  const execQuery = trpc.execucao.listComAlertas.useQuery({ apenasComAlerta: true });
  const prazosQuery = trpc.demandas.prazosUrgentes.useQuery({ dias: 7 });
  const cronologiaQuery = trpc.cronologia.listComFlagsAlertas.useQuery();
  const vvdQuery = trpc.vvd.listFlagUsoInstrumental.useQuery();

  const execAlertas = useMemo(
    () => ordenarAlertas(fromExecucao(execQuery.data ?? [])),
    [execQuery.data],
  );
  const prazoAlertas = useMemo(
    () => ordenarAlertas(fromPrazos(prazosQuery.data ?? [])),
    [prazosQuery.data],
  );
  const cronologiaAlertas = useMemo(
    () => ordenarAlertas(fromCronologia(cronologiaQuery.data ?? [])),
    [cronologiaQuery.data],
  );
  const vvdItems: VvdFlagItem[] = useMemo(
    () =>
      (vvdQuery.data ?? []).map((v) => ({
        processoId: v.processoId,
        processoNumero: v.processoNumero,
        requeridoNome: v.requeridoNome,
        fatores: v.flag.fatores,
      })),
    [vvdQuery.data],
  );

  const totalAlertasGerais =
    execAlertas.length + prazoAlertas.length + cronologiaAlertas.length;
  const tudoVazio = totalAlertasGerais === 0 && vvdItems.length === 0;
  const tudoCarregado =
    !execQuery.isLoading &&
    !prazosQuery.isLoading &&
    !cronologiaQuery.isLoading &&
    !vvdQuery.isLoading;

  return (
    <div className="flex flex-col">
      <GlassHeaderShell
        title="Central de Inteligência"
        icon={Radar}
        stats={
          <span className="text-[11px] text-white/55 leading-none hidden sm:inline">
            O que precisa de atenção
          </span>
        }
      />

      <div className="mx-auto w-full max-w-6xl space-y-6 px-3 py-5 sm:px-4 lg:px-5">
        {/* KPI ROW */}
        <KPIGrid columns={4}>
          <KPICardPremium
            title="Prazos urgentes"
            value={prazosQuery.isLoading ? "—" : prazosQuery.data?.length ?? 0}
            subtitle="próximos 7 dias"
            icon={AlarmClock}
            gradient="blue"
            href="/admin/demandas"
          />
          <KPICardPremium
            title="Execuções com alerta"
            value={execQuery.isLoading ? "—" : execAlertas.length}
            subtitle="prescrição / benefícios"
            icon={Gavel}
            gradient="rose"
          />
          <KPICardPremium
            title="Flags de cronologia"
            value={cronologiaQuery.isLoading ? "—" : cronologiaAlertas.length}
            subtitle="prazo / custódia"
            icon={History}
            gradient="amber"
          />
          <KPICardPremium
            title="Alertas VVD"
            value={vvdQuery.isLoading ? "—" : vvdItems.length}
            subtitle="análise de MPU"
            icon={ShieldAlert}
            gradient="amber"
          />
        </KPIGrid>

        {/* EMPTY STATE GLOBAL */}
        {tudoCarregado && tudoVazio ? (
          <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-neutral-200/80 bg-white py-16 text-center shadow-sm dark:border-neutral-800/80 dark:bg-neutral-900">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10">
              <CheckCircle2 className="h-6 w-6 text-emerald-500" />
            </div>
            <p className="text-sm font-medium text-neutral-700 dark:text-neutral-200">
              Nenhum alerta no momento — tudo sob controle.
            </p>
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-2">
            <FeedSection
              icon={AlarmClock}
              title="Prazos urgentes"
              isLoading={prazosQuery.isLoading}
              alertas={prazoAlertas}
            />
            <FeedSection
              icon={Gavel}
              title="Execução penal"
              isLoading={execQuery.isLoading}
              alertas={execAlertas}
            />
            <FeedSection
              icon={History}
              title="Cronologia"
              isLoading={cronologiaQuery.isLoading}
              alertas={cronologiaAlertas}
            />

            {/* VVD — copy dedicada e não-acusatória */}
            <section className="space-y-3">
              <SectionHeading
                icon={ShieldAlert}
                title="Análise de MPU (VVD)"
                count={vvdItems.length}
              />
              {vvdQuery.isLoading ? (
                <FeedSkeleton rows={2} />
              ) : vvdItems.length === 0 ? (
                <EmptySection />
              ) : (
                <div className="space-y-2.5">
                  {vvdItems.map((item) => (
                    <VvdFlagCard key={item.processoId} item={item} />
                  ))}
                </div>
              )}
            </section>
          </div>
        )}
      </div>
    </div>
  );
}

function FeedSection({
  icon,
  title,
  isLoading,
  alertas,
}: {
  icon: typeof Radar;
  title: string;
  isLoading: boolean;
  alertas: AlertaUnificado[];
}) {
  return (
    <section className={cn("space-y-3")}>
      <SectionHeading icon={icon} title={title} count={alertas.length} />
      {isLoading ? (
        <FeedSkeleton />
      ) : alertas.length === 0 ? (
        <EmptySection />
      ) : (
        <div className="space-y-2.5">
          {alertas.map((a) => (
            <AlertCard key={a.id} alerta={a} />
          ))}
        </div>
      )}
    </section>
  );
}

function EmptySection() {
  return (
    <div className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-neutral-200 bg-neutral-50/50 py-8 text-center dark:border-neutral-800 dark:bg-neutral-900/40">
      <CheckCircle2 className="h-4 w-4 text-emerald-500/70" />
      <p className="text-xs text-neutral-400 dark:text-neutral-500">
        Nenhum alerta nesta categoria.
      </p>
    </div>
  );
}
