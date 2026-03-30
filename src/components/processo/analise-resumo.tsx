"use client";

import {
  Shield, Target, Zap, Lightbulb, AlertTriangle, AlertCircle,
  CheckCircle2, Clock, Users, Scale, FileText,
} from "lucide-react";

interface Alerta {
  tipo: string;
  texto: string;
}

interface AnaliseResumoProps {
  radarLiberdade: { status: string; detalhes: string; urgencia: string } | null;
  kpis: { totalPessoas?: number; totalAcusacoes?: number; totalDocumentosAnalisados?: number; totalEventos?: number; totalNulidades?: number } | null;
  resumo: string;
  crimePrincipal: string;
  estrategia: string;
  achados: string[];
  recomendacoes: string[];
  alertas?: Alerta[];
  checklistTatico?: string[];
  inconsistencias: string[];
  saneamento: { pendencias: string[]; status: string } | null;
}

export function AnaliseResumo({
  radarLiberdade, kpis, resumo, crimePrincipal,
  estrategia, achados, recomendacoes, inconsistencias, saneamento,
  alertas, checklistTatico,
}: AnaliseResumoProps) {

  const hasContent = resumo || crimePrincipal || radarLiberdade || kpis || estrategia || achados.length > 0;

  if (!hasContent) {
    return (
      <div className="text-center py-16">
        <Target className="h-10 w-10 mx-auto text-zinc-200 dark:text-zinc-700 mb-3" />
        <p className="text-sm text-zinc-400">Nenhuma análise disponível</p>
        <p className="text-xs text-zinc-300 dark:text-zinc-600 mt-1">
          Use o botão Analisar Autos para gerar uma análise estratégica
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* ── 1. Painel de Controle (KPIs) ── */}
      {kpis && (
        <div>
          <SectionLabel icon={Users} label="Painel de Controle" />
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mt-3">
            {[
              { label: "Pessoas", value: kpis.totalPessoas, icon: Users },
              { label: "Acusações", value: kpis.totalAcusacoes, icon: Scale },
              { label: "Documentos", value: kpis.totalDocumentosAnalisados, icon: FileText },
              { label: "Eventos", value: kpis.totalEventos, icon: Clock },
              { label: "Nulidades", value: kpis.totalNulidades, icon: AlertTriangle },
            ].filter(k => k.value !== undefined && k.value > 0).map((kpi) => (
              <div key={kpi.label} className="rounded-lg bg-zinc-50 dark:bg-zinc-800/40 p-3 text-center">
                <p className="text-2xl font-bold tabular-nums text-zinc-800 dark:text-zinc-100">{kpi.value}</p>
                <p className="text-[11px] text-zinc-400 mt-0.5">{kpi.label}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── 2. Radar de Liberdade ── */}
      {radarLiberdade && (
        <div className={`rounded-lg p-4 border-l-4 ${
          radarLiberdade.urgencia === "ALTA" ? "border-l-red-500 bg-red-50/30 dark:bg-red-950/10" :
          radarLiberdade.urgencia === "MEDIA" ? "border-l-amber-500 bg-amber-50/30 dark:bg-amber-950/10" :
          "border-l-emerald-500 bg-emerald-50/30 dark:bg-emerald-950/10"
        }`}>
          <div className="flex items-center gap-2 mb-1">
            <Shield className="h-4 w-4 text-zinc-500" />
            <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-200">Radar de Liberdade</span>
            <span className={`text-[11px] font-semibold px-2 py-0.5 rounded ${
              radarLiberdade.urgencia === "ALTA" ? "text-red-700 bg-red-100 dark:text-red-300 dark:bg-red-900/30" :
              radarLiberdade.urgencia === "MEDIA" ? "text-amber-700 bg-amber-100 dark:text-amber-300 dark:bg-amber-900/30" :
              "text-emerald-700 bg-emerald-100 dark:text-emerald-300 dark:bg-emerald-900/30"
            }`}>
              {radarLiberdade.status}
            </span>
          </div>
          <p className="text-[13px] text-zinc-500 dark:text-zinc-400 leading-relaxed">{radarLiberdade.detalhes}</p>
        </div>
      )}

      {/* ── 3. Alertas Operacionais ── */}
      {alertas && alertas.length > 0 && (
        <div className="space-y-1.5">
          {alertas.map((a, i) => {
            const styles: Record<string, { bg: string; icon: typeof AlertTriangle }> = {
              risco: { bg: "bg-red-50/50 dark:bg-red-950/10 border-red-200/50 dark:border-red-800/30 text-red-800 dark:text-red-200", icon: AlertTriangle },
              atencao: { bg: "bg-amber-50/50 dark:bg-amber-950/10 border-amber-200/50 dark:border-amber-800/30 text-amber-800 dark:text-amber-200", icon: AlertCircle },
              info: { bg: "bg-blue-50/50 dark:bg-blue-950/10 border-blue-200/50 dark:border-blue-800/30 text-blue-800 dark:text-blue-200", icon: Lightbulb },
              positivo: { bg: "bg-emerald-50/50 dark:bg-emerald-950/10 border-emerald-200/50 dark:border-emerald-800/30 text-emerald-800 dark:text-emerald-200", icon: CheckCircle2 },
            };
            const s = styles[a.tipo] ?? styles.info;
            const Icon = s.icon;
            return (
              <div key={i} className={`flex items-start gap-2.5 rounded-lg border px-3.5 py-2.5 ${s.bg}`}>
                <Icon className="h-4 w-4 mt-0.5 shrink-0 opacity-70" />
                <p className="text-[13px] leading-relaxed">{a.texto}</p>
              </div>
            );
          })}
        </div>
      )}

      {/* ── 4. Resumo Executivo ── */}
      {(crimePrincipal || resumo) && (
        <div>
          <SectionLabel icon={Target} label="Resumo Executivo" />
          <div className="mt-2 space-y-2">
            {crimePrincipal && (
              <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">{crimePrincipal}</p>
            )}
            {resumo && (
              <p className="text-[13px] text-zinc-500 dark:text-zinc-400 leading-relaxed">{resumo}</p>
            )}
          </div>
        </div>
      )}

      {/* ── 5. Estratégia Defensiva ── */}
      {estrategia && (
        <div>
          <SectionLabel icon={Zap} label="Estratégia Defensiva" />
          <div className="mt-2 rounded-lg border border-zinc-200/60 dark:border-zinc-700/40 bg-zinc-50/30 dark:bg-zinc-800/20 p-4">
            <p className="text-[13px] text-zinc-600 dark:text-zinc-300 leading-relaxed">{estrategia}</p>
          </div>
        </div>
      )}

      {/* ── 6. Achados · Recomendações · Inconsistências ── */}
      {(achados.length > 0 || recomendacoes.length > 0 || inconsistencias.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <CompactList label="Achados-Chave" items={achados} icon={Lightbulb} />
          <CompactList label="Recomendações" items={recomendacoes} icon={CheckCircle2} />
          <CompactList label="Inconsistências" items={inconsistencias} icon={AlertCircle} />
        </div>
      )}

      {/* ── 7. Saneamento ── */}
      {saneamento && saneamento.pendencias?.length > 0 && (
        <div>
          <SectionLabel icon={Clock} label="Pendências Processuais" badge={saneamento.status} />
          <ul className="mt-2 space-y-1">
            {saneamento.pendencias.map((p: string, i: number) => (
              <li key={i} className="text-[13px] text-zinc-500 dark:text-zinc-400 flex items-start gap-2">
                <span className="text-zinc-300 dark:text-zinc-600 mt-0.5">—</span>
                <span>{p}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ── 8. Checklist Tático 48h ── */}
      {checklistTatico && checklistTatico.length > 0 && (
        <div>
          <SectionLabel icon={CheckCircle2} label="Plano de Ação — 48h" />
          <div className="mt-2 space-y-1.5">
            {checklistTatico.map((item, i) => (
              <div key={i} className="flex items-start gap-2.5 text-[13px] text-zinc-600 dark:text-zinc-300">
                <div className="h-4 w-4 mt-0.5 shrink-0 rounded border border-zinc-300 dark:border-zinc-600" />
                <span className="leading-relaxed">{item}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function SectionLabel({ icon: Icon, label, badge }: { icon: any; label: string; badge?: string }) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="h-4 w-4 text-zinc-400" />
      <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">{label}</span>
      {badge && (
        <span className="text-[10px] text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded">
          {badge}
        </span>
      )}
    </div>
  );
}

function CompactList({ label, items, icon: Icon }: { label: string; items: string[]; icon: any }) {
  if (items.length === 0) return null;
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2">{label}</p>
      <ul className="space-y-1.5">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-2 text-[13px] text-zinc-500 dark:text-zinc-400">
            <Icon className="h-3.5 w-3.5 text-zinc-300 dark:text-zinc-600 mt-0.5 shrink-0" />
            <span className="leading-relaxed">{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
