"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertTriangle, AlertCircle, Brain, CheckCircle2, Clock, FileText,
  Lightbulb, Scale, Shield, Target, Users, Zap,
} from "lucide-react";

interface AnalysisData {
  resumo?: string;
  crimePrincipal?: string;
  estrategia?: string;
  pontosCriticos?: string[];
  achadosChave?: string[];
  recomendacoes?: string[];
  inconsistencias?: string[];
  teses?: string[];
  nulidades?: Array<{
    tipo: string;
    descricao: string;
    severidade: "alta" | "media" | "baixa";
    fundamentacao?: string;
  }>;
  radarLiberdade?: {
    status: string;
    detalhes: string;
    urgencia: string;
  };
  saneamento?: {
    pendencias: string[];
    status: string;
  };
  kpis?: {
    totalPessoas?: number;
    totalAcusacoes?: number;
    totalDocumentosAnalisados?: number;
    totalEventos?: number;
    totalNulidades?: number;
  };
  versaoModelo?: string;
}

interface AnalysisPanelProps {
  data: AnalysisData;
  analysisStatus?: string | null;
  analyzedAt?: string | null;
}

export function AnalysisPanel({ data, analysisStatus, analyzedAt }: AnalysisPanelProps) {
  if (!data) return null;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-violet-500" />
          <h3 className="font-semibold text-sm">Análise Estratégica</h3>
        </div>
        <div className="flex items-center gap-2">
          {(() => {
            const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
              queued: { label: "Na fila...", className: "bg-amber-100 text-amber-700" },
              running: { label: "Analisando...", className: "bg-blue-100 text-blue-700 animate-pulse" },
              completed: { label: "Concluída", className: "bg-emerald-100 text-emerald-700" },
              failed: { label: "Erro", className: "bg-red-100 text-red-700" },
            };
            const config = analysisStatus ? STATUS_CONFIG[analysisStatus] : null;
            if (!config) return null;
            return (
              <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${config.className}`}>
                {config.label}
              </span>
            );
          })()}
          {data.versaoModelo && (
            <span className="text-[10px] text-muted-foreground font-mono">{data.versaoModelo}</span>
          )}
        </div>
      </div>

      {/* Radar Liberdade — urgência */}
      {data.radarLiberdade && (
        <Card className={`border-l-4 ${
          data.radarLiberdade.urgencia === "ALTA" ? "border-l-red-500 bg-red-50/50 dark:bg-red-950/10" :
          data.radarLiberdade.urgencia === "MEDIA" ? "border-l-amber-500 bg-amber-50/50 dark:bg-amber-950/10" :
          "border-l-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/10"
        }`}>
          <CardContent className="py-3 px-4">
            <div className="flex items-center gap-2 mb-1">
              <Shield className="h-4 w-4" />
              <span className="font-medium text-sm">Radar Liberdade</span>
              <Badge variant={
                data.radarLiberdade.urgencia === "ALTA" ? "danger" :
                data.radarLiberdade.urgencia === "MEDIA" ? "default" : "outline"
              } className="text-[10px]">
                {data.radarLiberdade.status}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">{data.radarLiberdade.detalhes}</p>
          </CardContent>
        </Card>
      )}

      {/* KPIs */}
      {data.kpis && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
          {[
            { label: "Pessoas", value: data.kpis.totalPessoas, icon: Users },
            { label: "Acusações", value: data.kpis.totalAcusacoes, icon: Scale },
            { label: "Docs", value: data.kpis.totalDocumentosAnalisados, icon: FileText },
            { label: "Eventos", value: data.kpis.totalEventos, icon: Clock },
            { label: "Nulidades", value: data.kpis.totalNulidades, icon: AlertTriangle },
          ].filter(k => k.value !== undefined && k.value > 0).map((kpi) => (
            <div key={kpi.label} className="bg-zinc-50 dark:bg-card rounded-lg p-2.5 text-center">
              <kpi.icon className="h-3.5 w-3.5 mx-auto mb-1 text-muted-foreground" />
              <p className="text-lg font-semibold tabular-nums">{kpi.value}</p>
              <p className="text-[10px] text-muted-foreground">{kpi.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Resumo + Crime */}
      {(data.resumo || data.crimePrincipal) && (
        <Card>
          <CardContent className="py-3 px-4 space-y-2">
            {data.crimePrincipal && (
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-red-500" />
                <span className="font-medium text-sm">Crime: {data.crimePrincipal}</span>
              </div>
            )}
            {data.resumo && (
              <p className="text-sm text-muted-foreground leading-relaxed">{data.resumo}</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Estratégia */}
      {data.estrategia && (
        <Card className="border-emerald-200 dark:border-emerald-800">
          <CardContent className="py-3 px-4">
            <div className="flex items-center gap-2 mb-1.5">
              <Zap className="h-4 w-4 text-emerald-500" />
              <span className="font-medium text-sm">Estratégia</span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">{data.estrategia}</p>
          </CardContent>
        </Card>
      )}

      {/* Teses */}
      {data.teses && data.teses.length > 0 && (
        <Card>
          <CardHeader className="py-2.5 px-4">
            <CardTitle className="text-sm flex items-center gap-2">
              <Scale className="h-4 w-4 text-blue-500" /> Teses Defensivas
            </CardTitle>
          </CardHeader>
          <CardContent className="py-0 px-4 pb-3">
            <ul className="space-y-1.5">
              {data.teses.map((tese, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <span className="text-blue-500 font-medium shrink-0">{i + 1}.</span>
                  <span className="text-muted-foreground">{tese}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Nulidades */}
      {data.nulidades && data.nulidades.length > 0 && (
        <Card className="border-amber-200 dark:border-amber-800">
          <CardHeader className="py-2.5 px-4">
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" /> Nulidades / Ilegalidades
            </CardTitle>
          </CardHeader>
          <CardContent className="py-0 px-4 pb-3">
            <ul className="space-y-2">
              {data.nulidades.map((n, i) => (
                <li key={i} className="text-sm">
                  <div className="flex items-center gap-2 mb-0.5">
                    <Badge variant={
                      n.severidade === "alta" ? "danger" :
                      n.severidade === "media" ? "default" : "outline"
                    } className="text-[10px]">
                      {n.severidade}
                    </Badge>
                    <span className="font-medium">{n.tipo}</span>
                  </div>
                  <p className="text-muted-foreground text-xs">{n.descricao}</p>
                  {n.fundamentacao && (
                    <p className="text-[11px] text-muted-foreground italic mt-0.5">{n.fundamentacao}</p>
                  )}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Pontos Críticos */}
      {data.pontosCriticos && data.pontosCriticos.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Pontos Críticos</p>
          <ul className="space-y-1">
            {data.pontosCriticos.map((p, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                <AlertCircle className="h-3.5 w-3.5 text-red-500 mt-0.5 shrink-0" />
                {p}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Achados + Recomendações + Inconsistências */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {data.achadosChave && data.achadosChave.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Achados-Chave</p>
            <ul className="space-y-1">
              {data.achadosChave.map((a, i) => (
                <li key={i} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                  <Lightbulb className="h-3 w-3 text-blue-500 mt-0.5 shrink-0" />
                  {a}
                </li>
              ))}
            </ul>
          </div>
        )}

        {data.recomendacoes && data.recomendacoes.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Recomendações</p>
            <ul className="space-y-1">
              {data.recomendacoes.map((r, i) => (
                <li key={i} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                  <CheckCircle2 className="h-3 w-3 text-emerald-500 mt-0.5 shrink-0" />
                  {r}
                </li>
              ))}
            </ul>
          </div>
        )}

        {data.inconsistencias && data.inconsistencias.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Inconsistências</p>
            <ul className="space-y-1">
              {data.inconsistencias.map((inc, i) => (
                <li key={i} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                  <AlertTriangle className="h-3 w-3 text-amber-500 mt-0.5 shrink-0" />
                  {inc}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Saneamento */}
      {data.saneamento && data.saneamento.pendencias && data.saneamento.pendencias.length > 0 && (
        <Card className="border-orange-200 dark:border-orange-800">
          <CardContent className="py-3 px-4">
            <div className="flex items-center gap-2 mb-1.5">
              <Clock className="h-4 w-4 text-orange-500" />
              <span className="font-medium text-sm">Pendências Processuais</span>
              <Badge variant="outline" className="text-[10px]">{data.saneamento.status}</Badge>
            </div>
            <ul className="space-y-1">
              {data.saneamento.pendencias.map((p, i) => (
                <li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                  <span className="text-orange-500">•</span> {p}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
