// src/components/processo/analise-resumo.tsx
"use client";

import { Badge } from "@/components/ui/badge";
import {
  Shield, Target, Zap, Lightbulb, AlertTriangle, AlertCircle,
  CheckCircle2, Clock, Users, Scale, FileText,
} from "lucide-react";
import { TYPO, CARD_STYLE, urgencyColor } from "@/lib/config/design-tokens";

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
  return (
    <div className="space-y-6">
      {/* Radar Liberdade */}
      {radarLiberdade && (
        <div className={`${CARD_STYLE.highlight} border-l-${
          radarLiberdade.urgencia === "ALTA" ? "red" :
          radarLiberdade.urgencia === "MEDIA" ? "amber" : "emerald"
        }-500 ${urgencyColor(radarLiberdade.urgencia).bg}`}>
          <div className="flex items-center gap-2 mb-1">
            <Shield className="h-4 w-4" />
            <span className={TYPO.h3}>Radar Liberdade</span>
            <Badge variant={radarLiberdade.urgencia === "ALTA" ? "danger" : "default"} className="text-xs">
              {radarLiberdade.status}
            </Badge>
          </div>
          <p className={TYPO.body + " text-muted-foreground"}>{radarLiberdade.detalhes}</p>
        </div>
      )}

      {/* KPIs */}
      {kpis && (
        <div className="grid grid-cols-5 gap-3">
          {[
            { label: "Pessoas", value: kpis.totalPessoas, icon: Users },
            { label: "Acusações", value: kpis.totalAcusacoes, icon: Scale },
            { label: "Documentos", value: kpis.totalDocumentosAnalisados, icon: FileText },
            { label: "Eventos", value: kpis.totalEventos, icon: Clock },
            { label: "Nulidades", value: kpis.totalNulidades, icon: AlertTriangle },
          ].filter(k => k.value !== undefined && k.value > 0).map((kpi) => (
            <div key={kpi.label} className={`${CARD_STYLE.base} text-center py-3`}>
              <kpi.icon className="h-4 w-4 mx-auto mb-1.5 text-muted-foreground" />
              <p className="text-2xl font-bold tabular-nums">{kpi.value}</p>
              <p className={TYPO.small + " text-muted-foreground"}>{kpi.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Crime + Resumo */}
      {(crimePrincipal || resumo) && (
        <div className={CARD_STYLE.base + " space-y-2"}>
          {crimePrincipal && (
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-red-500" />
              <span className={TYPO.h3}>{crimePrincipal}</span>
            </div>
          )}
          {resumo && <p className={TYPO.body + " text-muted-foreground"}>{resumo}</p>}
        </div>
      )}

      {/* Estratégia */}
      {estrategia && (
        <div className={`${CARD_STYLE.base} border-emerald-200 dark:border-emerald-800 space-y-1`}>
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-emerald-500" />
            <span className={TYPO.h3}>Estratégia</span>
          </div>
          <p className={TYPO.body + " text-muted-foreground"}>{estrategia}</p>
        </div>
      )}

      {/* Achados · Recomendações · Inconsistências */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {achados.length > 0 && (
          <div>
            <p className={TYPO.label + " mb-2"}>Achados-Chave</p>
            <ul className="space-y-1.5">
              {achados.map((a, i) => (
                <li key={i} className={`flex items-start gap-2 ${TYPO.body} text-muted-foreground`}>
                  <Lightbulb className="h-3.5 w-3.5 text-blue-500 mt-0.5 shrink-0" />
                  {a}
                </li>
              ))}
            </ul>
          </div>
        )}
        {recomendacoes.length > 0 && (
          <div>
            <p className={TYPO.label + " mb-2"}>Recomendações</p>
            <ul className="space-y-1.5">
              {recomendacoes.map((r, i) => (
                <li key={i} className={`flex items-start gap-2 ${TYPO.body} text-muted-foreground`}>
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 mt-0.5 shrink-0" />
                  {r}
                </li>
              ))}
            </ul>
          </div>
        )}
        {inconsistencias.length > 0 && (
          <div>
            <p className={TYPO.label + " mb-2"}>Inconsistências</p>
            <ul className="space-y-1.5">
              {inconsistencias.map((inc, i) => (
                <li key={i} className={`flex items-start gap-2 ${TYPO.body} text-muted-foreground`}>
                  <AlertCircle className="h-3.5 w-3.5 text-amber-500 mt-0.5 shrink-0" />
                  {inc}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Saneamento */}
      {saneamento && saneamento.pendencias?.length > 0 && (
        <div className={`${CARD_STYLE.base} border-orange-200 dark:border-orange-800`}>
          <div className="flex items-center gap-2 mb-2">
            <Clock className="h-4 w-4 text-orange-500" />
            <span className={TYPO.h3}>Pendências Processuais</span>
            <Badge variant="default" className="text-xs">{saneamento.status}</Badge>
          </div>
          <ul className="space-y-1">
            {saneamento.pendencias.map((p: string, i: number) => (
              <li key={i} className={`${TYPO.body} text-muted-foreground flex items-start gap-2`}>
                <span className="text-orange-500">•</span> {p}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
