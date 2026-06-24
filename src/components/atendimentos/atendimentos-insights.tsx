"use client";

// Painel de insights da página de Atendimentos — dados que já existem,
// servidos por registros.atendimentosInsights. Recolhível (economiza espaço).
// Métricas: produtividade/tempo médio, por área + taxa de retorno,
// evolução mensal (tendência) e conversão em demandas.

import { useState } from "react";
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
} from "recharts";
import {
  ArrowRight,
  CalendarCheck,
  Clock,
  RotateCw,
  TrendingUp,
} from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { AREA_CONFIG } from "./config";
import { areaHex } from "./area-color";

const PERIODOS = [
  { value: 30, label: "30d" },
  { value: 90, label: "90d" },
  { value: 365, label: "12m" },
];

export function AtendimentosInsights() {
  const [dias, setDias] = useState(90);
  const { data, isLoading } = trpc.registros.atendimentosInsights.useQuery({ dias, meses: 6 });

  return (
    <div className="rounded-xl border border-neutral-200/70 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-neutral-100 dark:border-neutral-800">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold text-foreground/90">Insights</h2>
          <span className="text-[11px] text-muted-foreground">· últimos {dias === 365 ? "12 meses" : `${dias} dias`}</span>
        </div>
        <div className="flex items-center rounded-lg bg-neutral-100 dark:bg-neutral-800 p-0.5">
          {PERIODOS.map((p) => (
            <button
              key={p.value}
              onClick={() => setDias(p.value)}
              className={cn(
                "h-6 px-2.5 rounded-md text-[11px] font-medium transition-colors cursor-pointer",
                dias === p.value
                  ? "bg-white dark:bg-neutral-700 text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {isLoading || !data ? (
        <div className="p-4 grid grid-cols-1 lg:grid-cols-3 gap-3">
          <Skeleton className="h-24 rounded-lg" />
          <Skeleton className="h-24 rounded-lg" />
          <Skeleton className="h-24 rounded-lg" />
        </div>
      ) : (
        <div className="p-4 space-y-4">
          {/* Tiles de produtividade ------------------------------------ */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
            <Tile
              icon={CalendarCheck}
              value={data.produtividade.realizados}
              label="Realizados"
              hint={`${data.produtividade.agendados} agendados`}
            />
            <Tile
              icon={CalendarCheck}
              value={`${data.produtividade.comparecimentoPct}%`}
              label="Comparecimento"
              hint={`${data.produtividade.cancelados} cancelados`}
              accent={data.produtividade.comparecimentoPct >= 80 ? "emerald" : data.produtividade.comparecimentoPct >= 60 ? "amber" : "rose"}
            />
            <Tile
              icon={Clock}
              value={data.produtividade.duracaoMediaMin > 0 ? `${data.produtividade.duracaoMediaMin}min` : "—"}
              label="Duração média"
              hint="por atendimento"
            />
            <Tile
              icon={ArrowRight}
              value={`${data.conversao.pct}%`}
              label="Viraram demanda"
              hint={`${data.conversao.comDemanda} de ${data.conversao.total}`}
              accent="violet"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr_1.2fr] gap-4">
            {/* Por área ------------------------------------------------ */}
            <Bloco titulo="Por área">
              {data.porArea.filter((a) => a.area).length === 0 ? (
                <Vazio />
              ) : (
                <div className="space-y-2">
                  {data.porArea
                    .filter((a) => a.area)
                    .slice(0, 6)
                    .map((a) => {
                      const meta = a.area ? AREA_CONFIG[a.area] : null;
                      const max = Math.max(...data.porArea.map((x) => x.total), 1);
                      return (
                        <div key={a.area}>
                          <div className="flex items-center justify-between text-[11px] mb-0.5">
                            <span className="font-medium text-foreground/80">{meta?.label ?? a.area}</span>
                            <span className="tabular-nums text-muted-foreground">
                              {a.total}
                              {a.retorno > 0 && <span className="ml-1 text-[10px]">· {a.retorno} ret.</span>}
                            </span>
                          </div>
                          <div className="h-2 rounded-full bg-neutral-100 dark:bg-neutral-800 overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all"
                              style={{ width: `${(a.total / max) * 100}%`, backgroundColor: areaHex(a.area) }}
                            />
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </Bloco>

            {/* Taxa de retorno ---------------------------------------- */}
            <Bloco titulo="Inicial vs retorno">
              <div className="flex flex-col items-center justify-center h-full gap-2 py-1">
                <div className="relative inline-flex items-center justify-center">
                  <RotateCw className="w-4 h-4 text-cyan-500 absolute" />
                  <div className="text-3xl font-semibold tabular-nums text-foreground/90 mt-8">
                    {data.retorno.taxa}%
                  </div>
                </div>
                <p className="text-[11px] text-muted-foreground -mt-1">de retorno</p>
                <div className="flex items-center gap-3 text-[11px] mt-1">
                  <span className="inline-flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-violet-400" /> {data.retorno.inicial} inicial
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-cyan-400" /> {data.retorno.retorno} retorno
                  </span>
                </div>
              </div>
            </Bloco>

            {/* Evolução mensal ---------------------------------------- */}
            <Bloco titulo="Evolução mensal">
              {data.evolucao.length === 0 ? (
                <Vazio />
              ) : (
                <ResponsiveContainer width="100%" height={120}>
                  <BarChart data={data.evolucao.map((e) => ({ ...e, mesLabel: formatMes(e.mes) }))}>
                    <XAxis
                      dataKey="mesLabel"
                      tickLine={false}
                      axisLine={false}
                      tick={{ fontSize: 10, fill: "currentColor" }}
                      className="text-muted-foreground"
                    />
                    <Tooltip
                      cursor={{ fill: "rgba(16,185,129,0.06)" }}
                      contentStyle={{
                        fontSize: 11,
                        borderRadius: 8,
                        border: "1px solid rgba(0,0,0,0.08)",
                        padding: "4px 8px",
                      }}
                      formatter={((v: number, n: string) => [v, n === "total" ? "Total" : "Realizados"]) as never}
                      labelFormatter={(l) => `Mês ${l}`}
                    />
                    <Bar dataKey="total" radius={[3, 3, 0, 0]} fill="#a3a3a3" maxBarSize={28} />
                    <Bar dataKey="realizados" radius={[3, 3, 0, 0]} fill="#10b981" maxBarSize={28} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </Bloco>
          </div>
        </div>
      )}
    </div>
  );
}

function Tile({
  icon: Icon,
  value,
  label,
  hint,
  accent = "neutral",
}: {
  icon: React.ElementType;
  value: string | number;
  label: string;
  hint?: string;
  accent?: "neutral" | "emerald" | "amber" | "rose" | "violet";
}) {
  const accentText: Record<string, string> = {
    neutral: "text-foreground/90",
    emerald: "text-emerald-600 dark:text-emerald-400",
    amber: "text-amber-600 dark:text-amber-400",
    rose: "text-rose-600 dark:text-rose-400",
    violet: "text-violet-600 dark:text-violet-400",
  };
  return (
    <div className="rounded-lg border border-neutral-200/70 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-800/30 px-3 py-2.5">
      <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
        <Icon className="w-3.5 h-3.5" />
        <span className="text-[10px] uppercase tracking-wide font-medium">{label}</span>
      </div>
      <div className={cn("text-xl font-semibold tabular-nums leading-none", accentText[accent])}>{value}</div>
      {hint && <p className="text-[10px] text-muted-foreground mt-1">{hint}</p>}
    </div>
  );
}

function Bloco({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-neutral-200/70 dark:border-neutral-800 p-3">
      <h3 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-2.5">{titulo}</h3>
      {children}
    </div>
  );
}

function Vazio() {
  return <p className="text-[11px] text-muted-foreground py-6 text-center">Sem dados no período.</p>;
}

function formatMes(mes: string): string {
  const [, m] = mes.split("-");
  const nomes = ["", "jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
  return nomes[Number(m)] ?? mes;
}
