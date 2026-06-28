// src/app/(dashboard)/admin/carreira/_components/cobertura-rollup-view.tsx
"use client";

import { Users, Briefcase, AlertTriangle, FileSignature, Shield, CheckCircle, BarChart2 } from "lucide-react";
import { CollapsiblePageHeader } from "@/components/layouts/collapsible-page-header";
import { StatusChip, EmptyState } from "@/components/ds";
import { trpc } from "@/lib/trpc/client";
import { CARD_STYLE, TYPO, COLORS } from "@/lib/config/design-tokens";
import { cn } from "@/lib/utils";

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

export function CoberturaRollupView() {
  const { data, isLoading } = trpc.carreira.coberturaRollup.useQuery();
  const k = data?.kpis;

  const stats = (
    <div className="flex flex-wrap items-center gap-2">
      <Kpi icon={Users} label="Afastados hoje" value={k?.afastadosHoje ?? 0} />
      <Kpi icon={Briefcase} label="Substituições abertas" value={k?.substituicoesAbertas ?? 0} />
      <Kpi icon={AlertTriangle} label="Sem cobertura" value={k?.semCobertura ?? 0} />
      <Kpi icon={FileSignature} label="A oficiar / a pagar" value={`${k?.gratificacoesAOficiar ?? 0} / ${k?.gratificacoesAPagar ?? 0}`} />
    </div>
  );

  return (
    <CollapsiblePageHeader title="Carreira — cobertura da regional" icon={Users}>
      {stats}
      <div className="p-4 space-y-4">
        {/* Cobertura */}
        <section className={CARD_STYLE.base}>
          <h2 className={cn(TYPO.h3, "mb-3")}>Cobertura ativa</h2>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Carregando…</p>
          ) : !data || data.cobertura.length === 0 ? (
            <EmptyState icon={Shield} title="Nenhuma cobertura ativa" size="sm" />
          ) : (
            <ul className="divide-y divide-neutral-100">
              {data.cobertura.map((c) => (
                <li key={c.afastamentoId} className="flex items-center justify-between py-2 text-sm">
                  <div className="min-w-0">
                    <div className="font-medium truncate">{c.defensorAfastado} → {c.defensorSubstituto}</div>
                    <div className="text-[11px] text-muted-foreground">{c.periodo}</div>
                  </div>
                  {c.statusGratificacao ? <StatusChip status={c.statusGratificacao} /> : <span className={cn("text-[11px]", COLORS.warning.text)}>sem gratificação</span>}
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Pendências */}
        <section className={CARD_STYLE.base}>
          <h2 className={cn(TYPO.h3, "mb-3")}>Pendências operacionais</h2>
          {!data || data.pendencias.length === 0 ? (
            <EmptyState icon={CheckCircle} title="Sem pendências" size="sm" />
          ) : (
            <ul className="divide-y divide-neutral-100">
              {data.pendencias.map((p) => (
                <li key={p.substituicaoId} className="flex items-center justify-between py-2 text-sm">
                  <div className="min-w-0">
                    <div className="font-medium truncate">{p.defensorSubstituto} · {p.unidadeSubstituida}</div>
                    <div className="text-[11px] text-muted-foreground">falta: {p.faltando.length ? p.faltando.join(", ") : "—"}</div>
                  </div>
                  <StatusChip status={p.status} />
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Por defensor */}
        <section className={CARD_STYLE.base}>
          <h2 className={cn(TYPO.h3, "mb-3")}>Por defensor</h2>
          {!data || data.porDefensor.length === 0 ? (
            <EmptyState icon={BarChart2} title="Sem dados" size="sm" />
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] text-muted-foreground">
                  <th className="py-1">Defensor</th>
                  <th className="py-1">Subst. abertas</th>
                  <th className="py-1">Afastado</th>
                </tr>
              </thead>
              <tbody>
                {data.porDefensor.map((d) => (
                  <tr key={d.defensorId} className="border-t border-neutral-100">
                    <td className="py-1">{d.nome}</td>
                    <td className="py-1">{d.substituicoesAbertas}</td>
                    <td className="py-1">{d.afastamentoAtivo ? "sim" : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>
    </CollapsiblePageHeader>
  );
}
