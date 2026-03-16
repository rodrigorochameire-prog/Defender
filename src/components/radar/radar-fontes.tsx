"use client";

import { trpc } from "@/lib/trpc/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { ExternalLink, Newspaper, Link2, Clock, Activity, Globe } from "lucide-react";
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
      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-xs text-zinc-500 mb-1">
              <Globe className="h-3.5 w-3.5" />
              Fontes Ativas
            </div>
            <p className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
              {fontesAtivas}
              <span className="text-sm font-normal text-zinc-400">
                /{fontes?.length ?? 0}
              </span>
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-xs text-zinc-500 mb-1">
              <Newspaper className="h-3.5 w-3.5" />
              Notícias Coletadas
            </div>
            <p className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
              {totalNoticias.toLocaleString("pt-BR")}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-xs text-zinc-500 mb-1">
              <Link2 className="h-3.5 w-3.5" />
              Matches Gerados
            </div>
            <p className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
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

          return (
            <Card key={fonte.id} className={cn(!fonte.ativo && "opacity-60")}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Activity
                        className={cn(
                          "h-3.5 w-3.5 shrink-0",
                          fonte.ativo
                            ? "text-emerald-500"
                            : "text-zinc-300 dark:text-zinc-600"
                        )}
                      />
                      <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">
                        {fonte.nome}
                      </span>
                      {!fonte.ativo && (
                        <Badge
                          variant="outline"
                          className="text-xs text-zinc-400 border-zinc-200 dark:border-zinc-700"
                        >
                          Pausada
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center gap-3 text-xs text-zinc-400 flex-wrap">
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
                      <span className="text-zinc-600 dark:text-zinc-400">
                        <span className="font-medium text-zinc-800 dark:text-zinc-200">
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
