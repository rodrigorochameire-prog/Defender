"use client";

import {
  Shield, Target, Zap, Lightbulb, AlertTriangle, AlertCircle,
  CheckCircle2, Clock, Users, Scale, FileText,
} from "lucide-react";

interface AnaliseResumoProps {
  radarLiberdade: { status: string; detalhes: string; urgencia: string } | null;
  kpis: { totalPessoas?: number; totalAcusacoes?: number; totalDocumentosAnalisados?: number; totalEventos?: number; totalNulidades?: number } | null;
  resumo: string;
  crimePrincipal: string;
  estrategia: string;
  achados: string[];
  recomendacoes: string[];
  inconsistencias: string[];
  saneamento: { pendencias: string[]; status: string } | null;
}

export function AnaliseResumo({
  radarLiberdade, kpis, resumo, crimePrincipal,
  estrategia, achados, recomendacoes, inconsistencias, saneamento,
}: AnaliseResumoProps) {

  const hasContent = resumo || crimePrincipal || radarLiberdade || kpis || estrategia || achados.length > 0;

  if (!hasContent) {
    return (
      <div className="text-center py-16">
        <Target className="h-10 w-10 mx-auto text-zinc-200 dark:text-zinc-700 mb-3" />
        <p className="text-sm text-zinc-400">Nenhuma análise disponível</p>
        <p className="text-xs text-zinc-300 dark:text-zinc-600 mt-1">
          Use o botão "Analisar Autos" para gerar uma análise estratégica
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Radar Liberdade */}
      {radarLiberdade && (
        <div className={`rounded-xl p-5 border-l-4 ${
          radarLiberdade.urgencia === "ALTA" ? "border-l-red-500 bg-red-50/40 dark:bg-red-950/10" :
          radarLiberdade.urgencia === "MEDIA" ? "border-l-amber-500 bg-amber-50/40 dark:bg-amber-950/10" :
          "border-l-emerald-500 bg-emerald-50/40 dark:bg-emerald-950/10"
        }`}>
          <div className="flex items-center gap-2.5 mb-1.5">
            <Shield className="h-5 w-5 text-zinc-500" />
            <span className="text-base font-semibold">Radar de Liberdade</span>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded ${
              radarLiberdade.urgencia === "ALTA" ? "text-red-700 bg-red-100 dark:text-red-300 dark:bg-red-900/30" :
              radarLiberdade.urgencia === "MEDIA" ? "text-amber-700 bg-amber-100 dark:text-amber-300 dark:bg-amber-900/30" :
              "text-emerald-700 bg-emerald-100 dark:text-emerald-300 dark:bg-emerald-900/30"
            }`}>
              {radarLiberdade.status}
            </span>
          </div>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">{radarLiberdade.detalhes}</p>
        </div>
      )}

      {/* KPIs — grandes, limpos */}
      {kpis && (
        <div className="grid grid-cols-5 gap-4">
          {[
            { label: "Pessoas", value: kpis.totalPessoas, icon: Users },
            { label: "Acusações", value: kpis.totalAcusacoes, icon: Scale },
            { label: "Documentos", value: kpis.totalDocumentosAnalisados, icon: FileText },
            { label: "Eventos", value: kpis.totalEventos, icon: Clock },
            { label: "Nulidades", value: kpis.totalNulidades, icon: AlertTriangle },
          ].filter(k => k.value !== undefined && k.value > 0).map((kpi) => (
            <div key={kpi.label} className="rounded-xl bg-zinc-50 dark:bg-zinc-800/50 p-4 text-center">
              <kpi.icon className="h-4 w-4 mx-auto mb-2 text-zinc-400" />
              <p className="text-3xl font-bold tabular-nums text-zinc-800 dark:text-zinc-100">{kpi.value}</p>
              <p className="text-xs text-zinc-400 mt-0.5">{kpi.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Crime + Resumo */}
      {(crimePrincipal || resumo) && (
        <div className="space-y-2">
          {crimePrincipal && (
            <div className="flex items-center gap-2.5">
              <Target className="h-4 w-4 text-zinc-400" />
              <span className="text-base font-semibold">{crimePrincipal}</span>
            </div>
          )}
          {resumo && (
            <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed pl-6.5">{resumo}</p>
          )}
        </div>
      )}

      {/* Estratégia */}
      {estrategia && (
        <div className="rounded-xl border border-emerald-200/50 dark:border-emerald-800/30 bg-emerald-50/20 dark:bg-emerald-950/5 p-5">
          <div className="flex items-center gap-2.5 mb-2">
            <Zap className="h-4 w-4 text-emerald-500" />
            <span className="text-base font-semibold">Estratégia Defensiva</span>
          </div>
          <p className="text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed">{estrategia}</p>
        </div>
      )}

      {/* Achados · Recomendações · Inconsistências — 3 colunas, neutras */}
      {(achados.length > 0 || recomendacoes.length > 0 || inconsistencias.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {achados.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-3">Achados-Chave</p>
              <ul className="space-y-2">
                {achados.map((a, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm text-zinc-500 dark:text-zinc-400">
                    <Lightbulb className="h-4 w-4 text-zinc-300 dark:text-zinc-600 mt-0.5 shrink-0" />
                    <span className="leading-relaxed">{a}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {recomendacoes.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-3">Recomendações</p>
              <ul className="space-y-2">
                {recomendacoes.map((r, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm text-zinc-500 dark:text-zinc-400">
                    <CheckCircle2 className="h-4 w-4 text-zinc-300 dark:text-zinc-600 mt-0.5 shrink-0" />
                    <span className="leading-relaxed">{r}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {inconsistencias.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-3">Inconsistências</p>
              <ul className="space-y-2">
                {inconsistencias.map((inc, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm text-zinc-500 dark:text-zinc-400">
                    <AlertCircle className="h-4 w-4 text-zinc-300 dark:text-zinc-600 mt-0.5 shrink-0" />
                    <span className="leading-relaxed">{inc}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Saneamento */}
      {saneamento && saneamento.pendencias?.length > 0 && (
        <div className="rounded-xl border border-zinc-200/50 dark:border-zinc-700/30 p-5">
          <div className="flex items-center gap-2.5 mb-3">
            <Clock className="h-4 w-4 text-zinc-400" />
            <span className="text-base font-semibold">Pendências Processuais</span>
            <span className="text-xs text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded">
              {saneamento.status}
            </span>
          </div>
          <ul className="space-y-1.5">
            {saneamento.pendencias.map((p: string, i: number) => (
              <li key={i} className="text-sm text-zinc-500 dark:text-zinc-400 flex items-start gap-2">
                <span className="text-zinc-300 dark:text-zinc-600 mt-0.5">—</span>
                <span>{p}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
