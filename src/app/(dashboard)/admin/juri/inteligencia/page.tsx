"use client";

import Link from "next/link";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Brain,
  TrendingUp,
  TrendingDown,
  Users,
  Gavel,
  Scale,
  BarChart3,
  ThumbsUp,
  ThumbsDown,
  Minus,
  Target,
  Calendar,
  Trophy,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";

function StatCard({ label, value, icon: Icon, color, subLabel }: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  color: string;
  subLabel?: string;
}) {
  return (
    <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-muted-foreground uppercase tracking-wider">{label}</span>
        <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", color)}>
          <Icon className="w-4 h-4 text-white" />
        </div>
      </div>
      <div className="text-2xl font-bold">{value}</div>
      {subLabel && <div className="text-xs text-muted-foreground mt-0.5">{subLabel}</div>}
    </div>
  );
}

function ScoreBar({ value, max = 10 }: { value: number | null; max?: number }) {
  if (value === null) return <span className="text-xs text-muted-foreground">—</span>;
  const pct = (value / max) * 100;
  const color = value <= 3 ? "bg-rose-500" : value <= 6 ? "bg-amber-500" : "bg-emerald-500";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
        <div className={cn("h-full rounded-full", color)} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-bold w-5 text-right">{value}</span>
    </div>
  );
}

export default function InteligenciaCruzadaPage() {
  const { data, isLoading, error } = trpc.avaliacaoJuri.analytics.useQuery();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <AlertTriangle className="w-12 h-12 text-amber-500" />
        <h2 className="text-lg font-semibold">Erro ao carregar analytics</h2>
        <Link href="/admin/juri"><Button variant="outline">Voltar</Button></Link>
      </div>
    );
  }

  const { resumo, impacto, argumentosTop, juradosMaisPrevistos, timeline } = data;

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
      {/* Header */}
      <div className="sticky top-0 z-20 px-4 md:px-6 py-3 bg-white/95 dark:bg-neutral-900/95 backdrop-blur-sm border-b border-neutral-200/80 dark:border-neutral-800/80">
        <div className="flex items-center justify-between max-w-6xl mx-auto">
          <div className="flex items-center gap-2.5">
            <Link href="/admin/juri">
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-neutral-400 hover:text-emerald-600">
                <ArrowLeft className="w-3.5 h-3.5" />
              </Button>
            </Link>
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg">
              <Brain className="w-4 h-4 text-white" />
            </div>
            <div>
              <span className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Inteligência do Júri</span>
              <span className="text-xs text-neutral-400 ml-2">Padrões cruzados</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-4 md:p-6 space-y-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard
            label="Sessões Realizadas"
            value={resumo.totalSessoes}
            icon={Calendar}
            color="bg-neutral-700"
          />
          <StatCard
            label="Taxa de Absolvição"
            value={`${resumo.taxaAbsolvicao}%`}
            icon={ThumbsUp}
            color="bg-emerald-500"
            subLabel={`${resumo.absolvicoes} de ${resumo.totalSessoes}`}
          />
          <StatCard
            label="Condenações"
            value={resumo.condenacoes}
            icon={ThumbsDown}
            color="bg-rose-500"
          />
          <StatCard
            label="Jurados com Histórico"
            value={resumo.juradosComHistorico}
            icon={Users}
            color="bg-blue-500"
            subLabel={`de ${resumo.totalJurados} cadastrados`}
          />
        </div>

        {/* Impacto Comparativo */}
        <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-5">
          <h3 className="text-sm font-semibold flex items-center gap-2 mb-4">
            <BarChart3 className="w-4 h-4 text-violet-500" />
            Impacto Médio — Acusação vs Defesa
          </h3>
          {impacto.mediaAcusacao && impacto.mediaDefesa ? (
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Gavel className="w-4 h-4 text-rose-500" />
                  <span className="text-sm font-medium">Acusação (MP)</span>
                </div>
                <div className="text-3xl font-bold text-rose-600">{impacto.mediaAcusacao}/10</div>
                <div className="h-3 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-rose-500 rounded-full" style={{ width: `${(impacto.mediaAcusacao / 10) * 100}%` }} />
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Scale className="w-4 h-4 text-emerald-500" />
                  <span className="text-sm font-medium">Defesa</span>
                </div>
                <div className="text-3xl font-bold text-emerald-600">{impacto.mediaDefesa}/10</div>
                <div className="h-3 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${(impacto.mediaDefesa / 10) * 100}%` }} />
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Dados insuficientes. Complete mais avaliações para ver comparativos.</p>
          )}
        </div>

        {/* Argumentos Mais Eficazes */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Argumentos MP */}
          <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-5">
            <h3 className="text-sm font-semibold flex items-center gap-2 mb-4">
              <Gavel className="w-4 h-4 text-rose-500" />
              Argumentos Mais Eficazes — MP
            </h3>
            {argumentosTop.mp.length > 0 ? (
              <div className="space-y-3">
                {argumentosTop.mp.map((arg, i) => (
                  <div key={arg.id} className="flex items-start gap-3 pb-2 border-b border-neutral-100 dark:border-neutral-800 last:border-0">
                    <div className="w-6 h-6 rounded-full bg-rose-100 dark:bg-rose-950 flex items-center justify-center shrink-0">
                      <span className="text-xs font-bold text-rose-600">{i + 1}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate">{arg.descricaoArgumento || "—"}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <ScoreBar value={arg.nivelPersuasao} />
                        {arg.resultado && (
                          <Badge variant="outline" className="text-[10px] shrink-0">
                            {arg.resultado === "condenacao" ? "Condenou" : arg.resultado === "absolvicao" ? "Absolveu" : arg.resultado}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Nenhum argumento registrado ainda.</p>
            )}
          </div>

          {/* Top Argumentos Defesa */}
          <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-5">
            <h3 className="text-sm font-semibold flex items-center gap-2 mb-4">
              <Scale className="w-4 h-4 text-emerald-500" />
              Argumentos Mais Eficazes — Defesa
            </h3>
            {argumentosTop.defesa.length > 0 ? (
              <div className="space-y-3">
                {argumentosTop.defesa.map((arg, i) => (
                  <div key={arg.id} className="flex items-start gap-3 pb-2 border-b border-neutral-100 dark:border-neutral-800 last:border-0">
                    <div className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center shrink-0">
                      <span className="text-xs font-bold text-emerald-600">{i + 1}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate">{arg.descricaoArgumento || "—"}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <ScoreBar value={arg.nivelPersuasao} />
                        {arg.resultado && (
                          <Badge variant="outline" className="text-[10px] shrink-0">
                            {arg.resultado === "condenacao" ? "Condenou" : arg.resultado === "absolvicao" ? "Absolveu" : arg.resultado}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Nenhum argumento registrado ainda.</p>
            )}
          </div>
        </div>

        {/* Jurados Mais Previsíveis */}
        <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-5">
          <h3 className="text-sm font-semibold flex items-center gap-2 mb-4">
            <Target className="w-4 h-4 text-blue-500" />
            Jurados com Padrão Identificado
            <Badge variant="secondary" className="text-[10px] ml-auto">{juradosMaisPrevistos.length} jurados</Badge>
          </h3>
          {juradosMaisPrevistos.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {juradosMaisPrevistos.map((j) => (
                <Link key={j.id} href={`/admin/juri/jurados/${j.id}`} className="block">
                  <div className="rounded-lg border border-neutral-100 dark:border-neutral-800 p-3 hover:border-emerald-200 dark:hover:border-emerald-800 transition-colors cursor-pointer">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium truncate">{j.nome}</span>
                      <Badge className={cn(
                        "text-[10px]",
                        j.tendenciaDominante === "absolutorio" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400" :
                        j.tendenciaDominante === "condenatorio" ? "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-400" :
                        "bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-400"
                      )}>
                        {j.tendenciaDominante === "absolutorio" ? "Absolutório" :
                         j.tendenciaDominante === "condenatorio" ? "Condenatório" : "Neutro"}
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground mb-2">{j.profissao || "—"}</div>
                    <div className="flex items-center gap-4 text-xs">
                      <span className="text-emerald-600 font-medium">{j.taxaAbsolvicao}% abs.</span>
                      <span className="text-rose-600 font-medium">{j.taxaCondenacao}% cond.</span>
                      <span className="text-muted-foreground ml-auto">{j.totalSessoes} sessões</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Nenhum jurado com 2+ sessões ainda. Os padrões serão exibidos após acumular dados.</p>
          )}
        </div>

        {/* Timeline de Resultados */}
        <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-5">
          <h3 className="text-sm font-semibold flex items-center gap-2 mb-4">
            <Trophy className="w-4 h-4 text-amber-500" />
            Últimos Resultados
          </h3>
          {timeline.length > 0 ? (
            <div className="space-y-2">
              {timeline.map((s) => (
                <div key={s.id} className="flex items-center gap-3 py-2 border-b border-neutral-100 dark:border-neutral-800 last:border-0">
                  <div className={cn(
                    "w-2 h-2 rounded-full shrink-0",
                    s.resultado === "absolvicao" ? "bg-emerald-500" :
                    s.resultado === "condenacao" ? "bg-rose-500" :
                    "bg-amber-500"
                  )} />
                  <span className="text-xs text-muted-foreground w-20 shrink-0">
                    {new Date(s.data).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
                  </span>
                  <span className="text-sm flex-1 truncate">{s.assistido || "—"}</span>
                  <Badge variant="outline" className={cn(
                    "text-[10px]",
                    s.resultado === "absolvicao" ? "text-emerald-600 border-emerald-200" :
                    s.resultado === "condenacao" ? "text-rose-600 border-rose-200" :
                    "text-amber-600 border-amber-200"
                  )}>
                    {s.resultado === "absolvicao" ? "Absolvido" :
                     s.resultado === "condenacao" ? "Condenado" :
                     s.resultado === "desclassificacao" ? "Desclassificado" :
                     s.resultado || "—"}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Nenhuma sessão realizada ainda.</p>
          )}
        </div>
      </div>
    </div>
  );
}
