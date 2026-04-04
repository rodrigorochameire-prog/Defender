"use client";

import { trpc } from "@/lib/trpc/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { ExternalLink, Newspaper, Link2, Clock, Activity, Globe, RefreshCw, CheckCircle, AlertTriangle, XCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export function RadarFontes() {
  const utils = trpc.useUtils();

  const { data: fontes, isLoading } = trpc.radar.fontesList.useQuery();
  const { data: stats } = trpc.radar.fontesStats.useQuery();

  const updateFonte = trpc.radar.updateFonte.useMutation({
    onSuccess: () => {
      utils.radar.fontesList.invalidate();
      toast.success("Fonte atualizada");
    },
    onError: (err) => toast.error("Erro: " + err.message),
  });

  const { data: health } = trpc.radar.enrichmentHealth.useQuery();
  const reprocessPending = trpc.radar.reprocessPending.useMutation({
    onSuccess: (data) => toast.success(data.message),
    onError: (err) => toast.error("Erro: " + err.message),
  });

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  const statsByFonte = Object.fromEntries(
    (stats ?? []).map((s) => [s.fonteNome, s])
  );

  const totalNoticias =
    stats?.reduce((sum, s) => sum + Number(s.totalNoticias), 0) ?? 0;
  const totalMatches =
    stats?.reduce((sum, s) => sum + Number(s.totalMatches), 0) ?? 0;
  const fontesAtivas = fontes?.filter((f) => f.ativo).length ?? 0;

  return (
    <div className="space-y-4">
      {/* Saúde do Enriquecimento */}
      {health && (
        <Card className="border-dashed">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Activity className="h-4 w-4 text-emerald-500" />
                Saúde do Enriquecimento IA
              </CardTitle>
              {Number(health.pending) > 0 && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs cursor-pointer"
                  onClick={() => reprocessPending.mutate({ limit: 50 })}
                  disabled={reprocessPending.isPending}
                >
                  <RefreshCw className={cn("h-3 w-3 mr-1.5", reprocessPending.isPending && "animate-spin")} />
                  Processar {Number(health.pending)} pendentes
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {[
                {
                  label: "Processadas",
                  value: Number(health.done),
                  total: Number(health.total),
                  color: "text-emerald-600",
                  bg: "bg-emerald-50 dark:bg-emerald-900/20",
                },
                {
                  label: "Pendentes",
                  value: Number(health.pending),
                  total: Number(health.total),
                  color: Number(health.pending) > 0 ? "text-amber-600" : "text-neutral-400",
                  bg: Number(health.pending) > 0 ? "bg-amber-50 dark:bg-amber-900/20" : "bg-neutral-50 dark:bg-neutral-800",
                },
                {
                  label: "Sem resumo",
                  value: Number(health.semResumo),
                  total: Number(health.done),
                  color: Number(health.semResumo) > 0 ? "text-orange-600" : "text-neutral-400",
                  bg: Number(health.semResumo) > 0 ? "bg-orange-50 dark:bg-orange-900/20" : "bg-neutral-50 dark:bg-neutral-800",
                },
                {
                  label: "Sem bairro",
                  value: Number(health.semBairro),
                  total: Number(health.done),
                  color: Number(health.semBairro) > 0 ? "text-orange-600" : "text-neutral-400",
                  bg: Number(health.semBairro) > 0 ? "bg-orange-50 dark:bg-orange-900/20" : "bg-neutral-50 dark:bg-neutral-800",
                },
                {
                  label: "Sem coords",
                  value: Number(health.semCoordenadas),
                  total: Number(health.done),
                  color: Number(health.semCoordenadas) > 0 ? "text-blue-600" : "text-neutral-400",
                  bg: Number(health.semCoordenadas) > 0 ? "bg-blue-50 dark:bg-blue-900/20" : "bg-neutral-50 dark:bg-neutral-800",
                },
              ].map((stat) => (
                <div key={stat.label} className={cn("rounded-lg p-2.5", stat.bg)}>
                  <div className={cn("text-xl font-semibold", stat.color)}>
                    {stat.value.toLocaleString("pt-BR")}
                  </div>
                  <div className="text-[10px] text-neutral-500 mt-0.5">{stat.label}</div>
                  {stat.total > 0 && stat.value > 0 && (
                    <div className="mt-1 h-1 rounded-full bg-neutral-200 dark:bg-neutral-700 overflow-hidden">
                      <div
                        className={cn("h-full rounded-full", stat.color === "text-emerald-600" ? "bg-emerald-500" : "bg-amber-500")}
                        style={{ width: `${Math.min(100, (stat.value / stat.total) * 100)}%` }}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-xs text-neutral-500 mb-1">
              <Globe className="h-3.5 w-3.5" />
              Fontes Ativas
            </div>
            <p className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100">
              {fontesAtivas}
              <span className="text-sm font-normal text-neutral-400">
                /{fontes?.length ?? 0}
              </span>
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-xs text-neutral-500 mb-1">
              <Newspaper className="h-3.5 w-3.5" />
              Notícias Coletadas
            </div>
            <p className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100">
              {totalNoticias.toLocaleString("pt-BR")}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-xs text-neutral-500 mb-1">
              <Link2 className="h-3.5 w-3.5" />
              Matches Gerados
            </div>
            <p className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100">
              {totalMatches.toLocaleString("pt-BR")}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Lista de fontes */}
      <div className="space-y-3">
        {fontes?.map((fonte) => {
          const s = statsByFonte[fonte.nome];
          const totalNot = s ? Number(s.totalNoticias) : 0;
          const totalMat = s ? Number(s.totalMatches) : 0;
          const ultimaNoticia = s?.ultimaNoticia;
          const taxaExtracao = s?.taxaExtracao ?? null;

          return (
            <Card key={fonte.id} className={cn(!fonte.ativo && "opacity-60")}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <Activity
                        className={cn(
                          "h-3.5 w-3.5 shrink-0",
                          fonte.ativo
                            ? "text-emerald-500"
                            : "text-neutral-300 dark:text-neutral-600"
                        )}
                      />
                      <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100 truncate">
                        {fonte.nome}
                      </span>
                      {fonte.confiabilidade === "local" && (
                        <Badge className="text-[10px] px-1.5 py-0 h-4 bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800">
                          Local
                        </Badge>
                      )}
                      {fonte.confiabilidade === "regional" && (
                        <Badge className="text-[10px] px-1.5 py-0 h-4 bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800">
                          Regional
                        </Badge>
                      )}
                      {fonte.confiabilidade === "estadual" && (
                        <Badge className="text-[10px] px-1.5 py-0 h-4 bg-neutral-100 text-neutral-600 border-neutral-200 dark:bg-neutral-800 dark:text-neutral-400 dark:border-neutral-700">
                          Estadual
                        </Badge>
                      )}
                      {!fonte.ativo && (
                        <Badge
                          variant="outline"
                          className="text-xs text-neutral-400 border-neutral-200 dark:border-neutral-700"
                        >
                          Pausada
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center gap-3 text-xs text-neutral-400 flex-wrap">
                      <a
                        href={fonte.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 hover:text-emerald-600 transition-colors"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <ExternalLink className="h-3 w-3" />
                        {new URL(fonte.url).hostname}
                      </a>
                      {ultimaNoticia && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDistanceToNow(new Date(ultimaNoticia), {
                            addSuffix: true,
                            locale: ptBR,
                          })}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 mt-2 text-xs">
                      <span className="text-neutral-600 dark:text-neutral-400">
                        <span className="font-medium text-neutral-800 dark:text-neutral-200">
                          {totalNot}
                        </span>{" "}
                        notícias
                      </span>
                      {totalMat > 0 && (
                        <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                          <Link2 className="h-3 w-3" />
                          <span className="font-medium">{totalMat}</span> matches
                        </span>
                      )}
                      {taxaExtracao != null && (
                        <span
                          className={cn(
                            "flex items-center gap-1 font-medium",
                            taxaExtracao >= 90
                              ? "text-emerald-600 dark:text-emerald-400"
                              : taxaExtracao >= 70
                              ? "text-amber-600 dark:text-amber-400"
                              : "text-red-600 dark:text-red-400"
                          )}
                          title={
                            taxaExtracao < 70
                              ? "Taxa de extração baixa — CSS selectors podem estar desatualizados"
                              : undefined
                          }
                        >
                          {taxaExtracao >= 90 ? (
                            <CheckCircle className="h-3 w-3" />
                          ) : taxaExtracao >= 70 ? (
                            <AlertTriangle className="h-3 w-3" />
                          ) : (
                            <XCircle className="h-3 w-3" />
                          )}
                          {taxaExtracao}% extração
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Toggle ativo */}
                  <Switch
                    checked={fonte.ativo ?? false}
                    onCheckedChange={(checked) => {
                      updateFonte.mutate({ id: fonte.id, ativo: checked });
                    }}
                    className="cursor-pointer shrink-0"
                    disabled={updateFonte.isPending}
                  />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
