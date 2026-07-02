// src/app/(dashboard)/admin/carreira/_components/cobertura-rollup-view.tsx
"use client";

import { Users, Briefcase, AlertTriangle, FileSignature, Shield, CheckCircle, BarChart2 } from "lucide-react";
import { GlassHeaderShell } from "@/components/layouts/header/glass-header-shell";
import { StatusChip, EmptyState } from "@/components/ds";
import { trpc } from "@/lib/trpc/client";
import { CARD_STYLE, TYPO, COLORS } from "@/lib/config/design-tokens";
import { cn } from "@/lib/utils";
import { carreiraStatusInfo } from "@/lib/carreira/status-visual";
import { KpiChip, CarreiraListSkeleton } from "@/components/carreira";

export function CoberturaRollupView() {
  const { data, isLoading } = trpc.carreira.coberturaRollup.useQuery();
  const k = data?.kpis;

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-background">
      <GlassHeaderShell
        title="Carreira — cobertura da regional"
        icon={Users}
        stats={
          <div className="flex flex-wrap items-center gap-2">
            <KpiChip icon={Users} label="Afastados hoje" value={k?.afastadosHoje ?? 0} />
            <KpiChip icon={Briefcase} label="Substituições abertas" value={k?.substituicoesAbertas ?? 0} />
            <KpiChip icon={AlertTriangle} label="Sem cobertura" value={k?.semCobertura ?? 0} />
            <KpiChip icon={FileSignature} label="A oficiar / a pagar" value={`${k?.gratificacoesAOficiar ?? 0} / ${k?.gratificacoesAPagar ?? 0}`} />
          </div>
        }
      />

      <div className="p-4 space-y-4">
        {/* Cobertura */}
        <section className={CARD_STYLE.base}>
          <h2 className={cn(TYPO.h3, "mb-3")}>Cobertura ativa</h2>
          {isLoading ? (
            <CarreiraListSkeleton rows={3} />
          ) : !data || data.cobertura.length === 0 ? (
            <EmptyState icon={Shield} title="Nenhuma cobertura ativa" description="Nenhum defensor com substituição em curso no momento." size="sm" />
          ) : (
            <ul className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {data.cobertura.map((c) => (
                <li key={c.afastamentoId} className="flex items-center justify-between py-2 text-sm">
                  <div className="min-w-0">
                    <div className="font-medium truncate">{c.defensorAfastado} → {c.defensorSubstituto}</div>
                    <div className="text-[11px] text-muted-foreground">{c.periodo}</div>
                  </div>
                  {c.statusGratificacao ? <StatusChip info={carreiraStatusInfo(c.statusGratificacao)} /> : <span className={cn("text-[11px]", COLORS.warning.text)}>sem gratificação</span>}
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Pendências */}
        <section className={CARD_STYLE.base}>
          <h2 className={cn(TYPO.h3, "mb-3")}>Pendências operacionais</h2>
          {isLoading ? (
            <CarreiraListSkeleton rows={3} />
          ) : !data || data.pendencias.length === 0 ? (
            <EmptyState icon={CheckCircle} title="Sem pendências" description="Todas as substituições estão com documentação em dia." size="sm" />
          ) : (
            <ul className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {data.pendencias.map((p) => (
                <li key={p.substituicaoId} className="flex items-center justify-between py-2 text-sm">
                  <div className="min-w-0">
                    <div className="font-medium truncate">{p.defensorSubstituto} · {p.unidadeSubstituida}</div>
                    <div className="text-[11px] text-muted-foreground">falta: {p.faltando.length ? p.faltando.join(", ") : "—"}</div>
                  </div>
                  <StatusChip info={carreiraStatusInfo(p.status)} />
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Por defensor */}
        <section className={CARD_STYLE.base}>
          <h2 className={cn(TYPO.h3, "mb-3")}>Por defensor</h2>
          {isLoading ? (
            <CarreiraListSkeleton rows={3} />
          ) : !data || data.porDefensor.length === 0 ? (
            <EmptyState icon={BarChart2} title="Sem dados" description="Nenhum defensor com substituição registrada." size="sm" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[11px] text-muted-foreground">
                    <th scope="col" className="py-1">Defensor</th>
                    <th scope="col" className="py-1">Subst. abertas</th>
                    <th scope="col" className="py-1">Afastado</th>
                  </tr>
                </thead>
                <tbody>
                  {data.porDefensor.map((d) => (
                    <tr key={d.defensorId} className="border-t border-neutral-100 dark:border-neutral-800">
                      <td className="py-1">{d.nome}</td>
                      <td className="py-1">{d.substituicoesAbertas}</td>
                      <td className="py-1">{d.afastamentoAtivo ? "sim" : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
